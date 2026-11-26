import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bug,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileWarning,
  Inbox,
  Lightbulb,
  Loader2,
  Lock,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
  ZoomIn,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type {
  BetaFeedbackCategory,
  BetaFeedbackScreen,
  BetaFeedbackStatus,
} from '../services/betaFeedback';
import {
  deleteAdminFeedbackMessage,
  FeedbackInboxApiError,
  fetchAdminFeedbackMessages,
  updateAdminFeedbackMessage,
  type FeedbackInboxItem,
  type FeedbackInboxSummary,
} from '../services/feedbackInboxApi';
import { vibrateSuccess, vibrateTap } from '../utils/haptics';

interface AdminMessagesScreenProps {
  adminToken: string;
  onLockAdmin: () => void;
  onSessionExpired: () => void;
  onSummaryChange?: (summary: FeedbackInboxSummary) => void;
  embedded?: boolean;
}

type StatusFilter = 'all' | BetaFeedbackStatus;
type CategoryFilter = 'all' | BetaFeedbackCategory;

const SCREEN_LABELS_ID: Record<BetaFeedbackScreen, string> = {
  home: 'Beranda',
  anki: 'Anki Kosakata',
  learn: 'Materi & Bunpou',
  challenge: 'Arena Tantangan',
  tryout: 'Try Out JLPT',
  profile: 'Profil & Pengaturan',
  other: 'Lainnya',
};

const SCREEN_LABELS_EN: Record<BetaFeedbackScreen, string> = {
  home: 'Home',
  anki: 'Anki Vocab',
  learn: 'Learn & Grammar',
  challenge: 'Challenge Arena',
  tryout: 'JLPT Try Out',
  profile: 'Profile & Settings',
  other: 'Other',
};

function isSafeImageDataUrl(src: string): boolean {
  return (
    src.startsWith('data:image/jpeg;base64,') ||
    src.startsWith('data:image/png;base64,') ||
    src.startsWith('data:image/webp;base64,')
  );
}

function formatMessageTime(ms: number, lang: 'id' | 'en'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}

export function AdminMessagesScreen({
  adminToken,
  onLockAdmin,
  onSessionExpired,
  onSummaryChange,
  embedded = false,
}: AdminMessagesScreenProps) {
  const { lang, t } = useLanguage();
  const [items, setItems] = useState<FeedbackInboxItem[]>([]);
  const [summary, setSummary] = useState<FeedbackInboxSummary>({
    total: 0,
    open: 0,
    reviewed: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const loadMessages = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetchAdminFeedbackMessages(adminToken);
        setItems(res.items);
        setSummary(res.summary);
        onSummaryChange?.(res.summary);
        setNoteDrafts((prev) => {
          const next = { ...prev };
          for (const item of res.items) {
            if (next[item.id] === undefined) {
              next[item.id] = item.adminNote;
            }
          }
          return next;
        });
      } catch (err) {
        if (err instanceof FeedbackInboxApiError && err.status === 401) {
          onSessionExpired();
          return;
        }
        setErrorMessage(
          err instanceof Error
            ? err.message
            : t(
                'Gagal memuat daftar pesan laporan.',
                'Failed to load report messages.',
              ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminToken, onSessionExpired, onSummaryChange, t],
  );

  useEffect(() => {
    void loadMessages(false);
  }, [loadMessages]);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setLightboxSrc(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxSrc]);

  const recalculateSummary = useCallback(
    (nextItems: FeedbackInboxItem[]) => {
      const nextSummary: FeedbackInboxSummary = {
        total: nextItems.length,
        open: nextItems.filter((i) => i.status === 'open').length,
        reviewed: nextItems.filter((i) => i.status === 'reviewed').length,
        resolved: nextItems.filter((i) => i.status === 'resolved').length,
      };
      setSummary(nextSummary);
      onSummaryChange?.(nextSummary);
    },
    [onSummaryChange],
  );

  const handleUpdateItem = async (
    item: FeedbackInboxItem,
    patch: { status?: BetaFeedbackStatus; adminNote?: string },
  ) => {
    vibrateTap();
    setSavingId(item.id);
    setErrorMessage(null);
    try {
      const updated = await updateAdminFeedbackMessage(
        adminToken,
        item.id,
        patch,
        item,
      );
      vibrateSuccess();
      setItems((prev) => {
        const next = prev.map((entry) =>
          entry.id === updated.id ? updated : entry,
        );
        recalculateSummary(next);
        return next;
      });
      setNoteDrafts((prev) => ({ ...prev, [updated.id]: updated.adminNote }));
    } catch (err) {
      if (err instanceof FeedbackInboxApiError && err.status === 401) {
        onSessionExpired();
        return;
      }
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t('Gagal memperbarui laporan.', 'Failed to update report.'),
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteItem = async (id: string) => {
    vibrateTap();
    setDeletingId(id);
    setErrorMessage(null);
    const targetItem = items.find((entry) => entry.id === id);
    try {
      await deleteAdminFeedbackMessage(adminToken, id, targetItem);
      vibrateSuccess();
      setConfirmDeleteId(null);
      setItems((prev) => {
        const next = prev.filter((entry) => entry.id !== id);
        recalculateSummary(next);
        return next;
      });
    } catch (err) {
      if (err instanceof FeedbackInboxApiError && err.status === 401) {
        onSessionExpired();
        return;
      }
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t('Gagal menghapus laporan.', 'Failed to delete report.'),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportJson = () => {
    vibrateTap();
    const payload = {
      exportedAt: new Date().toISOString(),
      summary,
      items,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utamago-feedback-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        item.accountEmail.toLowerCase().includes(q) ||
        item.adminNote.toLowerCase().includes(q)
      );
    });
  }, [items, statusFilter, categoryFilter, searchQuery]);

  const categoryMeta = (cat: BetaFeedbackCategory) => {
    if (cat === 'bug') {
      return {
        label: t('Bug / Error', 'Bug / Error'),
        icon: Bug,
        badgeClass:
          'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300',
      };
    }
    if (cat === 'typo') {
      return {
        label: t('Typo / Materi', 'Typo / Material'),
        icon: FileWarning,
        badgeClass:
          'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300',
      };
    }
    if (cat === 'suggestion') {
      return {
        label: t('Saran Fitur', 'Feature Idea'),
        icon: Lightbulb,
        badgeClass:
          'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-300',
      };
    }
    return {
      label: t('Lainnya', 'Other'),
      icon: MessageSquarePlus,
      badgeClass:
        'border-outline-variant bg-surface-container text-on-surface-variant',
    };
  };

  const statusMeta = (status: BetaFeedbackStatus) => {
    if (status === 'open') {
      return {
        label: t('Baru', 'Open'),
        badgeClass:
          'border-primary/30 bg-primary-container text-on-primary-container',
      };
    }
    if (status === 'reviewed') {
      return {
        label: t('Ditinjau', 'Reviewed'),
        badgeClass:
          'border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200',
      };
    }
    return {
      label: t('Selesai', 'Resolved'),
      badgeClass:
        'border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200',
    };
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-5">
        {!embedded ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-primary">
                <Inbox className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-lg font-extrabold tracking-tight text-on-surface">
                  {t('Pesan Bug & Saran', 'Bug & Feedback Inbox')}
                </h2>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {t(
                    'Daftar laporan bug dan saran dari pengguna UtamaGo!. Tab ini tersembunyi dari pengguna biasa.',
                    'Incoming bug reports and suggestions from UtamaGo! users. This tab stays hidden from regular users.',
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="m3-tactile inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t('Ekspor JSON', 'Export JSON')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  void loadMessages(true);
                }}
                disabled={refreshing}
                className="m3-tactile inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{t('Muat Ulang', 'Refresh')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  onLockAdmin();
                }}
                className="m3-tactile inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Kunci Admin', 'Lock Admin')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-extrabold text-on-surface">
                {t('Laporan Bug & Saran Pengguna', 'User Bug Reports & Suggestions')}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {t(
                  'Tinjau laporan, perbarui status, dan tambahkan catatan tindak lanjut.',
                  'Review reports, update status, and record follow-up notes.',
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="m3-tactile inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t('Ekspor JSON', 'Export JSON')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  void loadMessages(true);
                }}
                disabled={refreshing}
                className="m3-tactile inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{t('Muat Ulang', 'Refresh')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Summary KPI strip */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            {
              key: 'all' as StatusFilter,
              label: t('Total', 'Total'),
              count: summary.total,
            },
            {
              key: 'open' as StatusFilter,
              label: t('Baru', 'Open'),
              count: summary.open,
            },
            {
              key: 'reviewed' as StatusFilter,
              label: t('Ditinjau', 'Reviewed'),
              count: summary.reviewed,
            },
            {
              key: 'resolved' as StatusFilter,
              label: t('Selesai', 'Resolved'),
              count: summary.resolved,
            },
          ].map((stat) => {
            const active = statusFilter === stat.key;
            return (
              <button
                key={stat.key}
                type="button"
                onClick={() => {
                  vibrateTap();
                  setStatusFilter(stat.key);
                }}
                className={`m3-tactile rounded-2xl border px-2.5 py-2.5 text-left transition-colors ${
                  active
                    ? 'border-primary bg-primary-container/60 text-on-surface'
                    : 'border-outline-variant bg-surface text-on-surface hover:bg-surface-container'
                }`}
              >
                <p className="font-mono text-lg leading-none font-extrabold tabular-nums">
                  {stat.count}
                </p>
                <p className="mt-1 truncate text-[11px] font-semibold text-on-surface-variant">
                  {stat.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Search & category filters */}
        <div className="mt-3 space-y-2.5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                'Cari judul, isi laporan, atau username...',
                'Search title, details, or username...',
              )}
              className="min-h-[42px] w-full rounded-2xl border border-outline-variant bg-surface py-2 pr-4 pl-10 text-xs font-medium text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'all', label: t('Semua Kategori', 'All Categories') },
                { id: 'bug', label: t('Bug / Error', 'Bug') },
                { id: 'typo', label: t('Typo / Materi', 'Typo') },
                { id: 'suggestion', label: t('Saran Fitur', 'Suggestion') },
                { id: 'other', label: t('Lainnya', 'Other') },
              ] as const
            ).map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setCategoryFilter(cat.id);
                  }}
                  className={`m3-tactile rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                    active
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant bg-surface text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Messages list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2.5 rounded-3xl border border-outline-variant bg-surface-container-low py-12 text-on-surface-variant">
          <Loader2
            className="h-6 w-6 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="text-xs font-medium">
            {t('Memuat pesan pelaporan...', 'Loading bug & feedback inbox...')}
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-12 text-center">
          <Inbox
            className="h-8 w-8 text-on-surface-variant/60"
            aria-hidden="true"
          />
          <h3 className="font-display text-sm font-bold text-on-surface">
            {items.length === 0
              ? t('Belum ada pesan laporan masuk', 'No reports yet')
              : t(
                  'Tidak ada laporan yang cocok dengan filter',
                  'No reports match this filter',
                )}
          </h3>
          <p className="max-w-xs text-xs text-on-surface-variant">
            {items.length === 0
              ? t(
                  'Setiap laporan bug atau saran yang dikirim pengguna dari menu Profil akan langsung muncul di sini.',
                  'Every bug report or suggestion submitted from Profile will appear right here.',
                )
              : t(
                  'Ubah kata kunci pencarian atau pilih filter status lain.',
                  'Try clearing your search or choosing another status filter.',
                )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const cat = categoryMeta(item.category);
            const CatIcon = cat.icon;
            const st = statusMeta(item.status);
            const screenLabel =
              lang === 'id'
                ? SCREEN_LABELS_ID[item.screen] ?? item.screen
                : SCREEN_LABELS_EN[item.screen] ?? item.screen;
            const safeScreenshot =
              item.screenshotDataUrl &&
              isSafeImageDataUrl(item.screenshotDataUrl)
                ? item.screenshotDataUrl
                : '';
            const draftNote = noteDrafts[item.id] ?? item.adminNote;
            const noteDirty = draftNote.trim() !== item.adminNote.trim();
            const isSaving = savingId === item.id;
            const isDeleting = deletingId === item.id;

            return (
              <article
                key={item.id}
                className="rounded-3xl border border-outline-variant bg-surface-container-low p-4 shadow-2xs"
              >
                {/* Top metadata row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${cat.badgeClass}`}
                    >
                      <CatIcon className="h-3 w-3" aria-hidden="true" />
                      {cat.label}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-bold ${st.badgeClass}`}
                    >
                      {st.label}
                    </span>
                    <span className="rounded-lg border border-outline-variant bg-surface px-2 py-0.5 font-mono text-[10px] font-bold text-on-surface-variant">
                      {item.jlptLevel}
                    </span>
                    <span className="rounded-lg border border-outline-variant bg-surface px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                      {screenLabel}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {formatMessageTime(item.createdAtMs, lang)}
                  </span>
                </div>

                {/* Content */}
                <div className="mt-3 space-y-1.5">
                  <h3 className="font-display text-sm font-extrabold text-on-surface sm:text-base">
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-on-surface/90 sm:text-sm">
                    {item.description}
                  </p>
                </div>

                {/* Reporter */}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-on-surface-variant">
                  <span className="inline-flex items-center gap-1 font-semibold text-on-surface">
                    <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    @{item.username || 'pelajar'}
                  </span>
                  {item.accountEmail && (
                    <span className="truncate">{item.accountEmail}</span>
                  )}
                </div>

                {/* Screenshot preview */}
                {safeScreenshot && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-outline-variant bg-surface">
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        setLightboxSrc(safeScreenshot);
                      }}
                      className="group relative flex w-full items-center justify-center bg-zinc-950/5 p-2 dark:bg-zinc-950/40"
                    >
                      <img
                        src={safeScreenshot}
                        alt={t(
                          `Screenshot laporan: ${item.title}`,
                          `Report screenshot: ${item.title}`,
                        )}
                        className="max-h-52 rounded-xl object-contain"
                      />
                      <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-zinc-950/75 px-2.5 py-1 text-[11px] font-bold text-white group-hover:bg-zinc-900">
                        <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t('Perbesar', 'Zoom')}</span>
                      </span>
                    </button>
                    {item.screenshotInfo && (
                      <div className="border-t border-outline-variant px-3 py-1.5 text-[11px] text-on-surface-variant">
                        Screenshot · {item.screenshotInfo}
                      </div>
                    )}
                  </div>
                )}

                {/* Admin controls */}
                <div className="mt-4 space-y-2.5 border-t border-outline-variant pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: 'open', label: t('Baru', 'Open'), icon: Clock },
                          {
                            id: 'reviewed',
                            label: t('Ditinjau', 'Reviewed'),
                            icon: Eye,
                          },
                          {
                            id: 'resolved',
                            label: t('Selesai', 'Resolved'),
                            icon: CheckCircle2,
                          },
                        ] as const
                      ).map((opt) => {
                        const Icon = opt.icon;
                        const active = item.status === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isSaving || active}
                            onClick={() =>
                              void handleUpdateItem(item, { status: opt.id })
                            }
                            className={`m3-tactile inline-flex min-h-[34px] items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-75 ${
                              active
                                ? 'border-primary bg-primary text-on-primary'
                                : 'border-outline-variant bg-surface text-on-surface hover:bg-surface-container'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-xl border border-outline-variant bg-surface px-2.5 py-1.5 text-[11px] font-bold text-on-surface"
                        >
                          {t('Batal', 'Cancel')}
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => void handleDeleteItem(item.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                        >
                          {isDeleting ? (
                            <Loader2
                              className="h-3.5 w-3.5 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          )}
                          <span>{t('Hapus', 'Delete')}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          vibrateTap();
                          setConfirmDeleteId(item.id);
                        }}
                        aria-label={t('Hapus laporan', 'Delete report')}
                        className="m3-tactile inline-flex min-h-[34px] items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t('Hapus', 'Delete')}</span>
                      </button>
                    )}
                  </div>

                  {/* Admin internal note */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={draftNote}
                      maxLength={300}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      placeholder={t(
                        'Catatan pribadi admin (opsional)...',
                        'Internal admin note (optional)...',
                      )}
                      className="min-h-[38px] flex-1 rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/65 focus:border-primary focus:outline-none"
                    />
                    {noteDirty && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          void handleUpdateItem(item, { adminNote: draftNote })
                        }
                        className="m3-tactile inline-flex min-h-[38px] shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-on-primary hover:bg-primary-hover disabled:opacity-60"
                      >
                        {isSaving ? (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>{t('Simpan', 'Save')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Fullscreen screenshot lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/85 p-4 backdrop-blur-xs"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            aria-label={t('Tutup pratinjau', 'Close preview')}
            className="absolute top-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <img
            src={lightboxSrc}
            alt={t('Pratinjau penuh screenshot', 'Full screenshot preview')}
            className="max-h-[88vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
