import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Bug,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Inbox,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { JlptLevel } from '../data/utamagoContent';
import { useLanguage } from '../i18n/LanguageContext';
import {
  loadAllRegisteredUsersForAdmin,
  loadUserAnkiDetailForAdmin,
  type AdminRegisteredUser,
  type AdminUserAnkiDetail,
} from '../services/adminUsersApi';
import { BOOTSTRAP_ADMIN_EMAIL } from '../services/betaFeedback';
import {
  FeedbackInboxApiError,
  fetchAdminFeedbackMessages,
  FIREBASE_ADMIN_TOKEN,
  type FeedbackInboxItem,
  type FeedbackInboxSummary,
} from '../services/feedbackInboxApi';
import { vibrateSuccess, vibrateTap } from '../utils/haptics';
import { AdminMessagesScreen } from './AdminMessagesScreen';

interface AdminDashboardScreenProps {
  adminToken: string;
  onLockAdmin: () => void;
  onSessionExpired: () => void;
  onSummaryChange?: (summary: FeedbackInboxSummary) => void;
}

type AdminDashboardTab = 'overview' | 'users' | 'feedback' | 'tools';
type UserSortOption = 'newest' | 'active' | 'xp' | 'mastered';
type OnboardingFilter = 'all' | 'completed' | 'pending';

const JLPT_LEVELS: readonly JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

function formatShortDate(ms: number, lang: 'id' | 'en'): string {
  if (!ms) return '—';
  try {
    return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleDateString();
  }
}

function formatDateTime(ms: number, lang: 'id' | 'en'): string {
  if (!ms) return '—';
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

function isWithinDays(ms: number, days: number): boolean {
  if (!ms) return false;
  return Date.now() - ms <= days * 24 * 60 * 60 * 1000;
}

function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AdminDashboardScreen({
  adminToken,
  onLockAdmin,
  onSessionExpired,
  onSummaryChange,
}: AdminDashboardScreenProps) {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminDashboardTab>('overview');
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Registered users & progress state
  const [users, setUsers] = useState<AdminRegisteredUser[]>([]);
  const [firebaseAdminVerified, setFirebaseAdminVerified] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Feedback summary & recent items for Overview + Export
  const [feedbackItems, setFeedbackItems] = useState<FeedbackInboxItem[]>([]);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackInboxSummary>({
    total: 0,
    open: 0,
    reviewed: 0,
    resolved: 0,
  });

  // Users tab filters
  const [userSearch, setUserSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | JlptLevel>('all');
  const [onboardingFilter, setOnboardingFilter] =
    useState<OnboardingFilter>('all');
  const [sortBy, setSortBy] = useState<UserSortOption>('newest');

  // Selected user detail drawer
  const [selectedUser, setSelectedUser] = useState<AdminRegisteredUser | null>(
    null,
  );
  const [ankiDetail, setAnkiDetail] = useState<AdminUserAnkiDetail | null>(null);
  const [ankiDetailLoading, setAnkiDetailLoading] = useState(false);
  const [ankiDetailError, setAnkiDetailError] = useState<string | null>(null);

  const [refreshingAll, setRefreshingAll] = useState(false);

  const loadDashboardData = useCallback(
    async (silent = false) => {
      if (silent) setRefreshingAll(true);
      else setUsersLoading(true);
      setUsersError(null);

      try {
        const [usersRes, feedbackRes] = await Promise.allSettled([
          loadAllRegisteredUsersForAdmin(),
          fetchAdminFeedbackMessages(adminToken),
        ]);

        if (usersRes.status === 'fulfilled') {
          setUsers(usersRes.value.users);
          setFirebaseAdminVerified(usersRes.value.firebaseAdminVerified);
        } else {
          setUsersError(
            usersRes.reason instanceof Error
              ? usersRes.reason.message
              : t(
                  'Gagal memuat data pengguna dari Firestore.',
                  'Failed to load user records from Firestore.',
                ),
          );
        }

        if (feedbackRes.status === 'fulfilled') {
          setFeedbackItems(feedbackRes.value.items);
          setFeedbackSummary(feedbackRes.value.summary);
          onSummaryChange?.(feedbackRes.value.summary);
        } else if (
          feedbackRes.reason instanceof FeedbackInboxApiError &&
          feedbackRes.reason.status === 401
        ) {
          onSessionExpired();
          return;
        }
      } finally {
        setUsersLoading(false);
        setRefreshingAll(false);
      }
    },
    [adminToken, onSessionExpired, onSummaryChange, t],
  );

  useEffect(() => {
    void loadDashboardData(false);
  }, [loadDashboardData]);

  // Load detailed Anki subcollection breakdown on demand when inspecting a user
  useEffect(() => {
    if (!selectedUser) {
      setAnkiDetail(null);
      setAnkiDetailError(null);
      return;
    }
    let cancelled = false;
    setAnkiDetailLoading(true);
    setAnkiDetailError(null);
    setAnkiDetail(null);

    void loadUserAnkiDetailForAdmin(selectedUser.uid)
      .then((detail) => {
        if (!cancelled) {
          setAnkiDetail(detail);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnkiDetailError(
            t(
              'Gagal memuat rincian deck Anki pengguna ini.',
              'Failed to load Anki deck breakdown for this user.',
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAnkiDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUser, t]);

  useEffect(() => {
    if (!selectedUser) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedUser(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedUser]);

  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const completedOnboarding = users.filter((u) => u.onboardingCompleted).length;
    const active7d = users.filter((u) => {
      if (u.progressSummary?.lastActiveDate) {
        const ts = Date.parse(`${u.progressSummary.lastActiveDate}T00:00:00`);
        if (Number.isFinite(ts) && isWithinDays(ts, 7)) return true;
      }
      return isWithinDays(u.updatedAtMs, 7);
    }).length;
    const totalXpAll = users.reduce(
      (sum, u) => sum + (u.progressSummary?.xp ?? 0),
      0,
    );
    const totalMasteredAll = users.reduce(
      (sum, u) => sum + (u.progressSummary?.ankiMasteredTotal ?? 0),
      0,
    );
    const totalTryOutAll = users.reduce(
      (sum, u) => sum + (u.progressSummary?.tryOutCompletedCount ?? 0),
      0,
    );
    const avgXp = totalUsers > 0 ? Math.round(totalXpAll / totalUsers) : 0;

    const byTargetLevel: Record<JlptLevel, number> = {
      N5: 0,
      N4: 0,
      N3: 0,
      N2: 0,
      N1: 0,
    };
    for (const u of users) {
      byTargetLevel[u.targetLevel] += 1;
    }

    return {
      totalUsers,
      completedOnboarding,
      active7d,
      activePct:
        totalUsers > 0 ? Math.round((active7d / totalUsers) * 100) : 0,
      avgXp,
      totalMasteredAll,
      totalTryOutAll,
      byTargetLevel,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const list = users.filter((u) => {
      if (levelFilter !== 'all' && u.targetLevel !== levelFilter) return false;
      if (onboardingFilter === 'completed' && !u.onboardingCompleted)
        return false;
      if (onboardingFilter === 'pending' && u.onboardingCompleted) return false;
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.targetLevel.toLowerCase().includes(q)
      );
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'xp') {
        return (b.progressSummary?.xp ?? 0) - (a.progressSummary?.xp ?? 0);
      }
      if (sortBy === 'mastered') {
        return (
          (b.progressSummary?.ankiMasteredTotal ?? 0) -
          (a.progressSummary?.ankiMasteredTotal ?? 0)
        );
      }
      if (sortBy === 'active') {
        return b.updatedAtMs - a.updatedAtMs;
      }
      return b.createdAtMs - a.createdAtMs;
    });
    return sorted;
  }, [users, userSearch, levelFilter, onboardingFilter, sortBy]);

  const handleExportUsersCsv = () => {
    vibrateTap();
    const headers = [
      'UID',
      'Username',
      'Nama',
      'Email',
      'Level Awal',
      'Target JLPT',
      'Target Menit/Hari',
      'Onboarding Selesai',
      'XP',
      'Level Pembelajar',
      'Streak (Hari)',
      'Anki Review',
      'Anki Dikuasai',
      'Try Out Selesai',
      'Tantangan Selesai',
      'Aktif Terakhir',
      'Tanggal Daftar',
    ];
    const rows = users.map((u) => [
      u.uid,
      u.username,
      u.name || '-',
      u.email,
      u.selfAssessedLevel,
      u.targetLevel,
      u.dailyMinutes,
      u.onboardingCompleted ? 'Ya' : 'Belum',
      u.progressSummary?.xp ?? 0,
      u.progressSummary?.learnerLevel ?? 1,
      u.progressSummary?.streakDays ?? 0,
      u.progressSummary?.ankiReviewedTotal ?? 0,
      u.progressSummary?.ankiMasteredTotal ?? 0,
      u.progressSummary?.tryOutCompletedCount ?? 0,
      u.progressSummary?.challengeClearedCount ?? 0,
      u.progressSummary?.lastActiveDate ||
        (u.updatedAtMs ? new Date(u.updatedAtMs).toISOString().slice(0, 10) : ''),
      u.createdAtMs ? new Date(u.createdAtMs).toISOString() : '',
    ]);

    const csvLines = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((r) => r.map(escapeCsvCell).join(',')),
    ];
    const dateStamp = new Date().toISOString().slice(0, 10);
    // UTF-8 BOM ensures clean Indonesian & Japanese rendering in Excel
    triggerFileDownload(
      `utamago-pengguna-${dateStamp}.csv`,
      `\uFEFF${csvLines.join('\r\n')}`,
      'text/csv;charset=utf-8',
    );
    vibrateSuccess();
  };

  const handleExportFullSnapshotJson = () => {
    vibrateTap();
    const dateStamp = new Date().toISOString().slice(0, 10);
    const payload = {
      exportedAt: new Date().toISOString(),
      metrics,
      feedbackSummary,
      users,
      feedback: feedbackItems,
    };
    triggerFileDownload(
      `utamago-admin-snapshot-${dateStamp}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    );
    vibrateSuccess();
  };

  const handleRefreshAll = () => {
    vibrateTap();
    setRefreshNonce((n) => n + 1);
    void loadDashboardData(true);
  };

  const navTabs: ReadonlyArray<{
    id: AdminDashboardTab;
    label: string;
    count?: number;
    icon: typeof BarChart3;
  }> = [
    {
      id: 'overview',
      label: t('Ringkasan', 'Overview'),
      icon: BarChart3,
    },
    {
      id: 'users',
      label: t('Pengguna & Progres', 'Users & Progress'),
      count: users.length,
      icon: Users,
    },
    {
      id: 'feedback',
      label: t('Bug & Laporan', 'Bugs & Reports'),
      count: feedbackSummary.open > 0 ? feedbackSummary.open : feedbackSummary.total,
      icon: Bug,
    },
    {
      id: 'tools',
      label: t('Ekspor & Akses', 'Export & Access'),
      icon: Download,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Unified Admin Header */}
      <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-on-surface">
                {t('Halaman Admin UtamaGo!', 'UtamaGo! Admin Console')}
              </h2>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                <span>{BOOTSTRAP_ADMIN_EMAIL}</span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span>
                  {adminToken === FIREBASE_ADMIN_TOKEN
                    ? t('Sesi Firebase Admin', 'Firebase Admin Session')
                    : t('Sesi Server Admin', 'Server Admin Session')}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={refreshingAll}
              className="m3-tactile inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshingAll ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{t('Segarkan', 'Refresh')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onLockAdmin();
              }}
              className="m3-tactile inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Kunci Admin', 'Lock Admin')}</span>
            </button>
          </div>
        </div>

        {/* Segmented Admin Navigation Tabs */}
        <nav
          aria-label={t('Navigasi halaman admin', 'Admin console tabs')}
          className="mt-4 flex items-center gap-1.5 overflow-x-auto rounded-xl border border-outline-variant bg-surface p-1"
        >
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  vibrateTap();
                  setActiveTab(tab.id);
                }}
                className={`m3-tactile inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                  active
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`ml-0.5 font-mono text-[11px] tabular-nums ${
                      active ? 'opacity-90' : 'text-on-surface-variant'
                    }`}
                  >
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </section>

      {/* Notice if server-token admin isn't signed into verified Firebase admin account */}
      {!firebaseAdminVerified && activeTab !== 'feedback' && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">
              {t(
                'Login Firebase Admin diperlukan untuk melihat daftar pendaftar',
                'Verified Firebase Admin login required to list registered users',
              )}
            </p>
            <p className="mt-0.5 opacity-90">
              {t(
                `Untuk keamanan data pengguna di Firestore, daftar pendaftar hanya bisa diakses saat Anda masuk akun ${BOOTSTRAP_ADMIN_EMAIL} yang sudah terverifikasi.`,
                `For user privacy in Firestore, registered learner lists require signing in with the verified ${BOOTSTRAP_ADMIN_EMAIL} account.`,
              )}
            </p>
          </div>
        </div>
      )}

      {usersError && activeTab !== 'feedback' && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{usersError}</span>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* 4-column KPI strip */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-outline-variant bg-surface p-4">
              <p className="text-xs font-semibold text-on-surface-variant">
                {t('Total Pendaftar', 'Registered Users')}
              </p>
              <p className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-on-surface">
                {usersLoading ? '…' : metrics.totalUsers}
              </p>
              <p className="mt-1 text-[11px] text-on-surface-variant tabular-nums">
                {metrics.completedOnboarding}{' '}
                {t('selesai onboarding', 'completed onboarding')}
              </p>
            </div>

            <div className="rounded-2xl border border-outline-variant bg-surface p-4">
              <p className="text-xs font-semibold text-on-surface-variant">
                {t('Aktif 7 Hari Terakhir', 'Active Last 7 Days')}
              </p>
              <p className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
                {usersLoading ? '…' : metrics.active7d}
              </p>
              <p className="mt-1 text-[11px] text-on-surface-variant tabular-nums">
                {metrics.activePct}% {t('dari total pendaftar', 'of all users')}
              </p>
            </div>

            <div className="rounded-2xl border border-outline-variant bg-surface p-4">
              <p className="text-xs font-semibold text-on-surface-variant">
                {t('Laporan Bug & Saran', 'Bugs & Reports')}
              </p>
              <p className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-primary">
                {feedbackSummary.total}
              </p>
              <p className="mt-1 text-[11px] text-on-surface-variant tabular-nums">
                {feedbackSummary.open} {t('baru', 'open')} ·{' '}
                {feedbackSummary.resolved} {t('selesai', 'resolved')}
              </p>
            </div>

            <div className="rounded-2xl border border-outline-variant bg-surface p-4">
              <p className="text-xs font-semibold text-on-surface-variant">
                {t('Total Kartu Dikuasai', 'Total Cards Mastered')}
              </p>
              <p className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-on-surface">
                {usersLoading ? '…' : metrics.totalMasteredAll}
              </p>
              <p className="mt-1 text-[11px] text-on-surface-variant tabular-nums">
                {t('Rata-rata', 'Avg')} {metrics.avgXp} XP ·{' '}
                {metrics.totalTryOutAll} {t('Try Out', 'Try Outs')}
              </p>
            </div>
          </div>

          {/* Target JLPT Distribution */}
          <section className="rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-extrabold text-on-surface">
                {t('Distribusi Target Level JLPT', 'Target JLPT Level Distribution')}
              </h3>
              <span className="font-mono text-xs text-on-surface-variant tabular-nums">
                {metrics.totalUsers} {t('pengguna', 'users')}
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {JLPT_LEVELS.map((lvl) => {
                const count = metrics.byTargetLevel[lvl];
                const pct =
                  metrics.totalUsers > 0
                    ? Math.round((count / metrics.totalUsers) * 100)
                    : 0;
                return (
                  <div key={lvl} className="flex items-center gap-3 text-xs">
                    <span className="w-8 font-mono font-bold text-on-surface">
                      {lvl}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-container">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-20 text-right font-mono text-[11px] text-on-surface-variant tabular-nums">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2-Column Recent Activity Split */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Recent Signups */}
            <section className="rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm font-extrabold text-on-surface">
                  {t('Pendaftar Terbaru', 'Latest Sign-ups')}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setActiveTab('users');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <span>{t('Lihat Semua', 'View All')}</span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              {usersLoading ? (
                <div className="flex items-center gap-2 py-8 text-xs text-on-surface-variant">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{t('Memuat pengguna...', 'Loading users...')}</span>
                </div>
              ) : users.length === 0 ? (
                <p className="py-8 text-xs text-on-surface-variant">
                  {t(
                    'Belum ada data pengguna terdaftar yang dimuat.',
                    'No registered user data loaded yet.',
                  )}
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-outline-variant">
                  {users.slice(0, 5).map((u) => (
                    <li key={u.uid}>
                      <button
                        type="button"
                        onClick={() => {
                          vibrateTap();
                          setSelectedUser(u);
                          setActiveTab('users');
                        }}
                        className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-surface-container-low"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-on-surface">
                            {u.name || `@${u.username}`}
                          </p>
                          <p className="truncate text-[11px] text-on-surface-variant">
                            @{u.username} · {u.selfAssessedLevel} → {u.targetLevel}
                          </p>
                        </div>
                        <div className="shrink-0 text-right font-mono text-[11px] tabular-nums">
                          <p className="font-bold text-on-surface">
                            {u.progressSummary?.xp ?? 0} XP
                          </p>
                          <p className="text-on-surface-variant">
                            {formatShortDate(u.createdAtMs, lang)}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recent Bug Reports */}
            <section className="rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm font-extrabold text-on-surface">
                  {t('Laporan Terbaru', 'Latest Reports')}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setActiveTab('feedback');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <span>{t('Buka Inbox', 'Open Inbox')}</span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              {feedbackItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-on-surface-variant">
                  <Inbox className="mb-1.5 h-5 w-5 opacity-60" aria-hidden="true" />
                  <span>
                    {t(
                      'Belum ada laporan bug atau saran masuk.',
                      'No bug reports or suggestions yet.',
                    )}
                  </span>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-outline-variant">
                  {feedbackItems.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          vibrateTap();
                          setActiveTab('feedback');
                        }}
                        className="flex w-full items-start justify-between gap-3 py-2.5 text-left transition-colors hover:bg-surface-container-low"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-on-surface">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-on-surface-variant">
                            @{item.username} · {item.category} · {item.status}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-on-surface-variant tabular-nums">
                          {formatShortDate(item.createdAtMs, lang)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: USERS & PROGRESS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <section className="rounded-2xl border border-outline-variant bg-surface p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t(
                    'Cari nama, @username, atau email...',
                    'Search name, @username, or email...',
                  )}
                  className="min-h-[42px] w-full rounded-xl border border-outline-variant bg-surface-container-low py-2 pr-3 pl-10 text-xs font-medium text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <select
                aria-label={t('Urutkan pengguna', 'Sort users')}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as UserSortOption)}
                className="min-h-[42px] rounded-xl border border-outline-variant bg-surface-container-low px-3 text-xs font-semibold text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="newest">
                  {t('Daftar Terbaru', 'Newest Sign-ups')}
                </option>
                <option value="active">
                  {t('Aktif Terakhir', 'Most Recently Active')}
                </option>
                <option value="xp">{t('XP Tertinggi', 'Highest XP')}</option>
                <option value="mastered">
                  {t('Anki Dikuasai Terbanyak', 'Most Cards Mastered')}
                </option>
              </select>

              {users.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportUsersCsv}
                  className="m3-tactile inline-flex min-h-[42px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t('Unduh CSV', 'Download CSV')}</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {(['all', ...JLPT_LEVELS] as const).map((lvl) => {
                  const active = levelFilter === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        setLevelFilter(lvl);
                      }}
                      className={`min-h-[34px] rounded-lg px-2.5 text-xs font-bold transition-colors ${
                        active
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {lvl === 'all' ? t('Semua Level', 'All Levels') : lvl}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'all', label: t('Semua', 'All') },
                    { id: 'completed', label: t('Onboarding Selesai', 'Onboarded') },
                    { id: 'pending', label: t('Belum Selesai', 'Pending') },
                  ] as const
                ).map((opt) => {
                  const active = onboardingFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        setOnboardingFilter(opt.id);
                      }}
                      className={`min-h-[34px] rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-surface-container text-on-surface ring-1 ring-outline'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Users Table / Responsive List */}
          {usersLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface py-12 text-xs text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              <span>
                {t(
                  'Memuat data pendaftar dan progres...',
                  'Loading registered learners & progress...',
                )}
              </span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-surface p-10 text-center">
              <Users
                className="mx-auto mb-2 h-6 w-6 text-on-surface-variant opacity-60"
                aria-hidden="true"
              />
              <p className="text-sm font-bold text-on-surface">
                {t(
                  'Tidak ada pengguna yang cocok',
                  'No matching users found',
                )}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {t(
                  'Ubah kata kunci pencarian atau filter level JLPT.',
                  'Try adjusting the search query or JLPT level filter.',
                )}
              </p>
            </div>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface">
              <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs text-on-surface-variant">
                <span className="font-semibold">
                  {t('Menampilkan', 'Showing')}{' '}
                  <strong className="font-mono tabular-nums text-on-surface">
                    {filteredUsers.length}
                  </strong>{' '}
                  {t('dari', 'of')}{' '}
                  <strong className="font-mono tabular-nums text-on-surface">
                    {users.length}
                  </strong>{' '}
                  {t('pendaftar', 'users')}
                </span>
                <span className="hidden sm:inline">
                  {t(
                    'Klik baris pengguna untuk detail deck Anki',
                    'Click any row to inspect Anki deck details',
                  )}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low/60 text-[11px] font-semibold text-on-surface-variant">
                      <th className="px-4 py-2.5">
                        {t('Pengguna', 'Learner')}
                      </th>
                      <th className="px-3 py-2.5">
                        {t('JLPT', 'JLPT')}
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        {t('XP / Level', 'XP / Lv')}
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        {t('Streak', 'Streak')}
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        {t('Anki (Hafal / Review)', 'Anki (Mastered / Rev)')}
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        {t('Try Out', 'Try Out')}
                      </th>
                      <th className="px-4 py-2.5 text-right">
                        {t('Daftar / Aktif', 'Joined / Active')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredUsers.map((u) => {
                      const ps = u.progressSummary;
                      return (
                        <tr
                          key={u.uid}
                          onClick={() => {
                            vibrateTap();
                            setSelectedUser(u);
                          }}
                          className="cursor-pointer transition-colors hover:bg-surface-container-low"
                        >
                          <td className="px-4 py-3">
                            <p className="font-bold text-on-surface">
                              {u.name || `@${u.username}`}
                            </p>
                            <p className="mt-0.5 text-[11px] text-on-surface-variant">
                              @{u.username} · {u.email}
                            </p>
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px] tabular-nums">
                            <p className="font-bold text-on-surface">
                              {u.selfAssessedLevel} → {u.targetLevel}
                            </p>
                            <p className="text-on-surface-variant">
                              {u.onboardingCompleted
                                ? `${u.dailyMinutes} mnt/hari`
                                : t('Belum onboarding', 'Pending setup')}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums">
                            <p className="font-bold text-on-surface">
                              {ps ? `${ps.xp} XP` : '—'}
                            </p>
                            <p className="text-[11px] text-on-surface-variant">
                              {ps ? `Lv.${ps.learnerLevel}` : t('Belum sinkron', 'Not synced')}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-on-surface">
                            {ps ? `${ps.streakDays} hr` : '—'}
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums">
                            <p className="font-bold text-emerald-700 dark:text-emerald-400">
                              {ps ? ps.ankiMasteredTotal : '—'}
                            </p>
                            <p className="text-[11px] text-on-surface-variant">
                              {ps ? `${ps.ankiReviewedTotal} rev` : t('Klik detail', 'Tap detail')}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-on-surface">
                            {ps ? ps.tryOutCompletedCount : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] tabular-nums">
                            <p className="text-on-surface">
                              {formatShortDate(u.createdAtMs, lang)}
                            </p>
                            <p className="text-on-surface-variant">
                              {ps?.lastActiveDate ||
                                formatShortDate(u.updatedAtMs, lang)}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* TAB 3: BUGS & FEEDBACK INBOX */}
      {activeTab === 'feedback' && (
        <AdminMessagesScreen
          key={refreshNonce}
          adminToken={adminToken}
          embedded
          onLockAdmin={onLockAdmin}
          onSessionExpired={onSessionExpired}
          onSummaryChange={(next) => {
            setFeedbackSummary(next);
            onSummaryChange?.(next);
          }}
        />
      )}

      {/* TAB 4: EXPORT & ACCESS INFO */}
      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="space-y-3 rounded-2xl border border-outline-variant bg-surface p-5">
            <h3 className="font-display text-sm font-extrabold text-on-surface">
              {t('Ekspor Data Admin', 'Export Admin Data')}
            </h3>
            <p className="text-xs leading-relaxed text-on-surface-variant">
              {t(
                'Unduh daftar seluruh pendaftar beserta progres belajarnya (format CSV untuk Excel/Sheets) atau snapshot lengkap dalam format JSON.',
                'Download all registered learners and progress metrics as CSV for Excel/Sheets, or export a full JSON snapshot.',
              )}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={users.length === 0}
                onClick={handleExportUsersCsv}
                className="m3-tactile inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-on-primary hover:bg-primary-hover disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                <span>
                  {t('Unduh CSV Pendaftar', 'Download Users CSV')} (
                  {users.length})
                </span>
              </button>
              <button
                type="button"
                onClick={handleExportFullSnapshotJson}
                className="m3-tactile inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>{t('Unduh JSON Lengkap', 'Download Full JSON')}</span>
              </button>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-outline-variant bg-surface p-5">
            <h3 className="font-display text-sm font-extrabold text-on-surface">
              {t('Status Akses & Keamanan', 'Access & Security Status')}
            </h3>
            <dl className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                <dt className="text-on-surface-variant">
                  {t('Akun Admin Resmi', 'Authorized Admin')}
                </dt>
                <dd className="font-mono font-semibold text-on-surface">
                  {BOOTSTRAP_ADMIN_EMAIL}
                </dd>
              </div>
              <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                <dt className="text-on-surface-variant">
                  {t('Akses Data Pengguna', 'Firestore User Access')}
                </dt>
                <dd
                  className={`font-semibold ${
                    firebaseAdminVerified
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {firebaseAdminVerified
                    ? t('Aktif & Terverifikasi', 'Active & Verified')
                    : t('Perlu Login Email Admin', 'Admin Email Login Needed')}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-on-surface-variant">
                  {t('Cara Membuka Halaman Ini', 'How to Open This Panel')}
                </dt>
                <dd className="font-medium text-on-surface">
                  {t('Ketuk logo UtamaGo! 3x', 'Tap UtamaGo! logo 3x')}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {/* User Progress Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-zinc-950/65 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedUser(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-user-detail-title"
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-outline-variant bg-surface shadow-2xl sm:rounded-3xl"
          >
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-5 py-4">
              <div className="min-w-0">
                <h3
                  id="admin-user-detail-title"
                  className="truncate font-display text-base font-extrabold text-on-surface"
                >
                  {selectedUser.name || `@${selectedUser.username}`}
                </h3>
                <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                  @{selectedUser.username} · {selectedUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                aria-label={t('Tutup detail pengguna', 'Close user details')}
                className="m3-tactile inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Profile & Progress Summary Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                  <p className="text-[11px] text-on-surface-variant">JLPT</p>
                  <p className="mt-0.5 font-mono text-sm font-extrabold tabular-nums text-on-surface">
                    {selectedUser.selfAssessedLevel} → {selectedUser.targetLevel}
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                  <p className="text-[11px] text-on-surface-variant">XP / Lv</p>
                  <p className="mt-0.5 font-mono text-sm font-extrabold tabular-nums text-primary">
                    {selectedUser.progressSummary?.xp ?? 0} · Lv.
                    {selectedUser.progressSummary?.learnerLevel ?? 1}
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                  <p className="text-[11px] text-on-surface-variant">Streak</p>
                  <p className="mt-0.5 font-mono text-sm font-extrabold tabular-nums text-on-surface">
                    {selectedUser.progressSummary?.streakDays ?? 0}{' '}
                    {t('hari', 'days')}
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                  <p className="text-[11px] text-on-surface-variant">
                    {t('Try Out', 'Try Out')}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-extrabold tabular-nums text-on-surface">
                    {selectedUser.progressSummary?.tryOutCompletedCount ?? 0}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-outline-variant bg-surface p-3.5 text-xs">
                <div>
                  <dt className="text-on-surface-variant">
                    {t('Tanggal Daftar', 'Registered')}
                  </dt>
                  <dd className="mt-0.5 font-mono font-semibold tabular-nums text-on-surface">
                    {formatDateTime(selectedUser.createdAtMs, lang)}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">
                    {t('Aktivitas Terakhir', 'Last Updated')}
                  </dt>
                  <dd className="mt-0.5 font-mono font-semibold tabular-nums text-on-surface">
                    {selectedUser.progressSummary?.lastActiveDate ||
                      formatDateTime(selectedUser.updatedAtMs, lang)}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">
                    {t('Target Harian', 'Daily Goal')}
                  </dt>
                  <dd className="mt-0.5 font-mono font-semibold tabular-nums text-on-surface">
                    {selectedUser.dailyMinutes} {t('menit/hari', 'min/day')}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">
                    {t('Tantangan Selesai', 'Challenges Cleared')}
                  </dt>
                  <dd className="mt-0.5 font-mono font-semibold tabular-nums text-on-surface">
                    {selectedUser.progressSummary?.challengeClearedCount ?? 0}
                  </dd>
                </div>
              </dl>

              {/* Live Firestore Anki Deck Breakdown */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="inline-flex items-center gap-1.5 text-xs font-extrabold text-on-surface">
                    <Layers
                      className="h-3.5 w-3.5 text-primary"
                      aria-hidden="true"
                    />
                    <span>
                      {t(
                        'Rincian Progres Deck Anki (Firestore)',
                        'Anki Deck Progress Breakdown (Firestore)',
                      )}
                    </span>
                  </h4>
                  {ankiDetail && (
                    <span className="font-mono text-[11px] text-on-surface-variant tabular-nums">
                      {ankiDetail.totalMasteredCards}/{ankiDetail.totalTrackedCards}{' '}
                      {t('hafal', 'mastered')}
                    </span>
                  )}
                </div>

                {ankiDetailLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-4 text-xs text-on-surface-variant">
                    <Loader2
                      className="h-4 w-4 animate-spin text-primary"
                      aria-hidden="true"
                    />
                    <span>
                      {t('Memuat rincian deck Anki...', 'Loading Anki decks...')}
                    </span>
                  </div>
                ) : ankiDetailError ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                    {ankiDetailError}
                  </p>
                ) : !ankiDetail || ankiDetail.decks.length === 0 ? (
                  <p className="rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-4 text-xs text-on-surface-variant">
                    {t(
                      'Pengguna ini belum memiliki riwayat belajar Anki yang tersimpan di Firestore.',
                      'No Anki deck history saved in Firestore for this learner yet.',
                    )}
                  </p>
                ) : (
                  <div className="divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface">
                    {ankiDetail.decks.map((deck) => (
                      <div
                        key={deck.deckId}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                      >
                        <div>
                          <p className="font-bold text-on-surface">
                            {deck.jlptLevel}{' '}
                            {deck.category === 'bunpou'
                              ? 'Bunpou'
                              : t('Kosakata', 'Vocab')}
                          </p>
                          <p className="text-[11px] text-on-surface-variant">
                            {deck.lastDateKey
                              ? `${t('Terakhir', 'Last')}: ${deck.lastDateKey}`
                              : deck.deckId}
                          </p>
                        </div>
                        <div className="text-right font-mono text-[11px] tabular-nums">
                          <p className="font-bold text-emerald-700 dark:text-emerald-400">
                            {deck.masteredCards} {t('hafal', 'mastered')} ·{' '}
                            {deck.trackedCards} {t('dipelajari', 'studied')}
                          </p>
                          <p className="text-on-surface-variant">
                            {deck.learningCards} {t('belajar', 'learning')} ·{' '}
                            {deck.lapsesTotal} {t('lupa', 'lapses')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
