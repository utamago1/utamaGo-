import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock,
  FileWarning,
  ImagePlus,
  Inbox,
  Lightbulb,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { JlptLevel } from '../data/utamagoContent';
import {
  checkIsBetaFeedbackAdmin,
  FEEDBACK_ADMIN_NOTE_MAX,
  FEEDBACK_DESC_MAX,
  FEEDBACK_DESC_MIN,
  FEEDBACK_TITLE_MAX,
  FEEDBACK_TITLE_MIN,
  loadAllBetaFeedbackForAdmin,
  loadMyBetaFeedback,
  submitBetaFeedback,
  updateBetaFeedbackStatus,
  validateBetaFeedbackInput,
  type BetaFeedbackCategory,
  type BetaFeedbackRecord,
  type BetaFeedbackScreen,
  type BetaFeedbackStatus,
} from '../services/betaFeedback';
import { vibrateError, vibrateSuccess, vibrateTap } from '../utils/haptics';
import {
  compressFeedbackScreenshot,
  type CompressedScreenshot,
} from '../utils/screenshotCompress';

interface BetaFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  jlptLevel: JlptLevel;
  defaultScreen?: BetaFeedbackScreen;
}

type ModalTab = 'submit' | 'mine' | 'admin';

const CATEGORY_OPTIONS: ReadonlyArray<{
  id: BetaFeedbackCategory;
  label: string;
  icon: typeof Bug;
}> = [
  { id: 'bug', label: 'Bug / Error', icon: Bug },
  { id: 'typo', label: 'Typo Materi', icon: FileWarning },
  { id: 'suggestion', label: 'Saran Fitur', icon: Lightbulb },
  { id: 'other', label: 'Lainnya', icon: MessageSquarePlus },
];

const SCREEN_OPTIONS: ReadonlyArray<{
  id: BetaFeedbackScreen;
  label: string;
}> = [
  { id: 'home', label: 'Beranda' },
  { id: 'anki', label: 'Anki' },
  { id: 'learn', label: 'Materi Bunpou' },
  { id: 'challenge', label: 'Arena Tantangan' },
  { id: 'tryout', label: 'Try Out' },
  { id: 'profile', label: 'Profil / Pengaturan' },
  { id: 'other', label: 'Lainnya' },
];

const CATEGORY_LABELS: Record<BetaFeedbackCategory, string> = {
  bug: 'Bug / Error',
  typo: 'Typo Materi',
  suggestion: 'Saran Fitur',
  other: 'Lainnya',
};

const SCREEN_LABELS: Record<BetaFeedbackScreen, string> = {
  home: 'Beranda',
  anki: 'Anki',
  learn: 'Materi Bunpou',
  challenge: 'Arena Tantangan',
  tryout: 'Try Out',
  profile: 'Profil / Pengaturan',
  other: 'Lainnya',
};

const STATUS_META: Record<
  BetaFeedbackStatus,
  { label: string; className: string }
> = {
  open: {
    label: 'Diterima',
    className: 'text-primary',
  },
  reviewed: {
    label: 'Ditinjau',
    className: 'text-warning',
  },
  resolved: {
    label: 'Selesai',
    className: 'text-success',
  },
};

function formatDateTimeId(ms: number): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return '';
  }
}

export function BetaFeedbackModal({
  open,
  onClose,
  userId,
  username,
  jlptLevel,
  defaultScreen = 'home',
}: BetaFeedbackModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('submit');
  const [category, setCategory] = useState<BetaFeedbackCategory>('bug');
  const [screen, setScreen] = useState<BetaFeedbackScreen>(defaultScreen);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<CompressedScreenshot | null>(
    null,
  );
  const [compressingScreenshot, setCompressingScreenshot] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [lightboxImageSrc, setLightboxImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [myReports, setMyReports] = useState<BetaFeedbackRecord[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [mineError, setMineError] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminReports, setAdminReports] = useState<BetaFeedbackRecord[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminFilter, setAdminFilter] = useState<'all' | BetaFeedbackStatus>(
    'all',
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adminNotesDraft, setAdminNotesDraft] = useState<
    Record<string, string>
  >({});

  const fetchMyReports = useCallback(async () => {
    if (!userId || userId === 'utamago-preview') return;
    setLoadingMine(true);
    setMineError(null);
    try {
      const list = await loadMyBetaFeedback(userId);
      setMyReports(list);
    } catch {
      setMineError(
        'Gagal memuat riwayat laporan. Periksa koneksi internetmu lalu coba lagi.',
      );
    } finally {
      setLoadingMine(false);
    }
  }, [userId]);

  const fetchAdminReports = useCallback(async () => {
    setLoadingAdmin(true);
    setAdminError(null);
    try {
      const list = await loadAllBetaFeedbackForAdmin();
      setAdminReports(list);
      setAdminNotesDraft((prev) => {
        const next = { ...prev };
        for (const item of list) {
          if (next[item.id] === undefined) {
            next[item.id] = item.adminNote;
          }
        }
        return next;
      });
    } catch {
      setAdminError(
        'Tidak dapat memuat kotak masuk laporan Beta Tester saat ini.',
      );
    } finally {
      setLoadingAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setScreen(defaultScreen);
    setSubmitError(null);
    setSubmitSuccess(false);
    setScreenshotError(null);
    setLightboxImageSrc(null);
    let cancelled = false;
    void checkIsBetaFeedbackAdmin().then((adminOk) => {
      if (!cancelled) setIsAdmin(adminOk);
    });
    return () => {
      cancelled = true;
    };
  }, [open, defaultScreen]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (lightboxImageSrc) {
          setLightboxImageSrc(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, lightboxImageSrc, onClose]);

  useEffect(() => {
    if (!open) return;
    if (activeTab === 'mine') {
      void fetchMyReports();
    } else if (activeTab === 'admin' && isAdmin) {
      void fetchAdminReports();
    }
  }, [open, activeTab, isAdmin, fetchMyReports, fetchAdminReports]);

  if (!open) return null;

  const handleScreenshotFile = async (file: File) => {
    setScreenshotError(null);
    setSubmitError(null);
    setCompressingScreenshot(true);
    try {
      const compressed = await compressFeedbackScreenshot(file);
      setScreenshot(compressed);
      vibrateSuccess();
    } catch (err) {
      vibrateError();
      setScreenshotError(
        err instanceof Error
          ? err.message
          : 'Gagal memproses screenshot. Coba pilih gambar lain.',
      );
    } finally {
      setCompressingScreenshot(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleScreenshotFile(file);
  };

  const handleFormPaste = (e: ClipboardEvent<HTMLFormElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          vibrateTap();
          void handleScreenshotFile(file);
          return;
        }
      }
    }
  };

  const handleDropZoneDragOver = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDropZoneDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDropZoneDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    vibrateTap();
    void handleScreenshotFile(file);
  };

  const handleRemoveScreenshot = () => {
    vibrateTap();
    setScreenshot(null);
    setScreenshotError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (compressingScreenshot) return;
    vibrateTap();
    setSubmitError(null);
    setSubmitSuccess(false);

    const validation = validateBetaFeedbackInput({
      category,
      screen,
      title,
      description,
      jlptLevel,
      screenshotDataUrl: screenshot?.dataUrl ?? '',
    });
    if (!validation.ok) {
      vibrateError();
      setSubmitError(validation.error);
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitBetaFeedback({
        username,
        input: validation.sanitized,
      });
      vibrateSuccess();
      setSubmitSuccess(true);
      setTitle('');
      setDescription('');
      setScreenshot(null);
      setScreenshotError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setMyReports((prev) => [created, ...prev]);
    } catch (err) {
      vibrateError();
      setSubmitError(
        err instanceof Error &&
          !err.message.startsWith('{') &&
          err.message.length < 180
          ? err.message
          : 'Gagal mengirim laporan ke server. Pastikan koneksi internet aktif lalu coba lagi.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminUpdate = async (
    item: BetaFeedbackRecord,
    nextStatus: BetaFeedbackStatus,
  ) => {
    vibrateTap();
    setSavingId(item.id);
    const nextNote = (adminNotesDraft[item.id] ?? item.adminNote).slice(
      0,
      FEEDBACK_ADMIN_NOTE_MAX,
    );
    try {
      await updateBetaFeedbackStatus({
        feedbackId: item.id,
        status: nextStatus,
        adminNote: nextNote,
      });
      vibrateSuccess();
      setAdminReports((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                status: nextStatus,
                adminNote: nextNote,
                updatedAtMs: Date.now(),
              }
            : row,
        ),
      );
    } catch {
      vibrateError();
      setAdminError('Gagal menyimpan perubahan status laporan.');
    } finally {
      setSavingId(null);
    }
  };

  const filteredAdminReports =
    adminFilter === 'all'
      ? adminReports
      : adminReports.filter((r) => r.status === adminFilter);

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center bg-zinc-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="beta-feedback-title"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-outline-variant bg-surface shadow-2xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-wide text-primary">
              UtamaGo! · Beta Tester
            </p>
            <h2
              id="beta-feedback-title"
              className="font-display text-lg font-extrabold text-on-surface"
            >
              Lapor Bug &amp; Masukan Beta
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            aria-label="Tutup form laporan"
            className="m3-tactile inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation tabs */}
        <div
          role="tablist"
          aria-label="Menu laporan beta"
          className="flex items-center gap-1 border-b border-outline-variant bg-surface-container-low px-5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'submit'}
            onClick={() => {
              vibrateTap();
              setActiveTab('submit');
            }}
            className={`-mb-px inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-bold transition-colors ${
              activeTab === 'submit'
                ? 'border-primary text-primary'
                : 'border-transparent text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
            }`}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Kirim Laporan</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'mine'}
            onClick={() => {
              vibrateTap();
              setActiveTab('mine');
            }}
            className={`-mb-px inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-bold transition-colors ${
              activeTab === 'mine'
                ? 'border-primary text-primary'
                : 'border-transparent text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
            }`}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Riwayat Saya</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'admin'}
              onClick={() => {
                vibrateTap();
                setActiveTab('admin');
              }}
              className={`-mb-px inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-bold transition-colors ${
                activeTab === 'admin'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Kotak Masuk Admin</span>
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'submit' && (
            <form
              onSubmit={(e) => void handleSubmit(e)}
              onPaste={handleFormPaste}
              className="space-y-4"
            >
              <p className="text-[13px] leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0]">
                Menemukan error, salah ketik pada soal/Bunpou, atau punya ide
                fitur? Laporanmu langsung masuk ke database pengembang UtamaGo!.
              </p>

              {submitSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded-2xl border border-success/35 bg-success-container p-3.5 text-xs leading-relaxed text-on-success-container"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">Laporan berhasil dikirim!</p>
                    <p className="mt-0.5">
                      Terima kasih sudah membantu menyempurnakan UtamaGo!. Kamu
                      bisa memantau statusnya di tab{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('mine')}
                        className="font-bold underline"
                      >
                        Riwayat Saya
                      </button>
                      .
                    </p>
                  </div>
                </div>
              )}

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-primary/35 bg-primary-container/50 p-3.5 text-xs leading-relaxed text-on-primary-container"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Category selector */}
              <div className="space-y-1.5">
                <span className="block text-xs font-bold text-on-surface">
                  Kategori Laporan
                </span>
                <div
                  role="radiogroup"
                  aria-label="Kategori laporan beta"
                  className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  {CATEGORY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = category === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          vibrateTap();
                          setCategory(opt.id);
                          setSubmitError(null);
                        }}
                        className={`m3-tactile flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                          active
                            ? 'border-primary bg-primary-container/45 text-on-surface'
                            : 'border-outline-variant bg-surface-container-low text-[#4b4b53] hover:border-outline hover:text-on-surface dark:text-[#b4b4c0]'
                        }`}
                      >
                        <Icon
                          className={`h-3.5 w-3.5 shrink-0 ${
                            active ? 'text-primary' : ''
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Screen / Area selector */}
              <div className="space-y-1.5">
                <label
                  htmlFor="beta-feedback-screen"
                  className="block text-xs font-bold text-on-surface"
                >
                  Halaman / Fitur Terkait
                </label>
                <select
                  id="beta-feedback-screen"
                  value={screen}
                  onChange={(e) =>
                    setScreen(e.target.value as BetaFeedbackScreen)
                  }
                  className="min-h-[44px] w-full rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2 text-sm font-medium text-on-surface focus:border-primary focus:outline-none"
                >
                  {SCREEN_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Short title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="beta-feedback-title-input"
                    className="text-xs font-bold text-on-surface"
                  >
                    Judul Singkat
                  </label>
                  <span className="font-mono text-[11px] tabular-nums text-[#4b4b53] dark:text-[#b4b4c0]">
                    {title.trim().length}/{FEEDBACK_TITLE_MAX}
                  </span>
                </div>
                <input
                  id="beta-feedback-title-input"
                  type="text"
                  value={title}
                  maxLength={FEEDBACK_TITLE_MAX}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (submitError) setSubmitError(null);
                  }}
                  placeholder="Contoh: Audio soal N3 tidak berbunyi saat diklik"
                  className="min-h-[46px] w-full rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2 text-sm font-medium text-on-surface placeholder:text-[#6b6b76] focus:border-primary focus:outline-none dark:placeholder:text-[#8b8b98]"
                />
                <p className="text-[11px] text-[#4b4b53] dark:text-[#b4b4c0]">
                  Minimal {FEEDBACK_TITLE_MIN} karakter.
                </p>
              </div>

              {/* Detailed description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="beta-feedback-desc-input"
                    className="text-xs font-bold text-on-surface"
                  >
                    Detail Laporan / Saran
                  </label>
                  <span className="font-mono text-[11px] tabular-nums text-[#4b4b53] dark:text-[#b4b4c0]">
                    {description.trim().length}/{FEEDBACK_DESC_MAX}
                  </span>
                </div>
                <textarea
                  id="beta-feedback-desc-input"
                  rows={4}
                  value={description}
                  maxLength={FEEDBACK_DESC_MAX}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (submitError) setSubmitError(null);
                  }}
                  placeholder="Ceritakan langkah terjadinya bug, pola Bunpou yang typo, atau fitur yang kamu harapkan..."
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-sm leading-relaxed text-on-surface placeholder:text-[#6b6b76] focus:border-primary focus:outline-none dark:placeholder:text-[#8b8b98]"
                />
                <p className="text-[11px] text-[#4b4b53] dark:text-[#b4b4c0]">
                  Minimal {FEEDBACK_DESC_MIN} karakter · Akun pelapor:{' '}
                  <span className="font-mono text-on-surface">@{username}</span>{' '}
                  · Level <span className="font-mono">{jlptLevel}</span>
                </p>
              </div>

              {/* Optional Screenshot Attachment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="beta-feedback-screenshot-input"
                    className="text-xs font-bold text-on-surface"
                  >
                    Lampiran Screenshot
                  </label>
                  <span className="text-[11px] text-[#4b4b53] dark:text-[#b4b4c0]">
                    Opsional · PNG/JPG/WebP
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  id="beta-feedback-screenshot-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {compressingScreenshot ? (
                  <div className="flex min-h-[76px] items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-4 text-xs font-semibold text-[#4b4b53] dark:text-[#b4b4c0]">
                    <Loader2
                      className="h-4 w-4 animate-spin text-primary"
                      aria-hidden="true"
                    />
                    <span>Mengompres screenshot agar ringan...</span>
                  </div>
                ) : screenshot ? (
                  <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        setLightboxImageSrc(screenshot.dataUrl);
                      }}
                      className="group relative block w-full bg-surface focus:outline-none"
                      aria-label="Perbesar pratinjau screenshot"
                    >
                      <img
                        src={screenshot.dataUrl}
                        alt="Pratinjau screenshot laporan"
                        className="max-h-52 w-full object-contain"
                      />
                      <span className="pointer-events-none absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-lg bg-zinc-950/75 px-2 py-1 text-[11px] font-semibold text-white">
                        <ZoomIn className="h-3 w-3" aria-hidden="true" />
                        <span>Perbesar</span>
                      </span>
                    </button>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant px-3 py-2">
                      <span className="truncate font-mono text-[11px] tabular-nums text-[#4b4b53] dark:text-[#b4b4c0]">
                        {screenshot.width}×{screenshot.height} · ~
                        {screenshot.sizeKb} KB
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            vibrateTap();
                            fileInputRef.current?.click();
                          }}
                          className="m3-tactile inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-outline-variant bg-surface px-2.5 py-1 text-xs font-bold text-on-surface hover:bg-surface-container"
                        >
                          <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Ganti</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveScreenshot}
                          className="m3-tactile inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-primary/30 bg-primary-container/35 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary-container/60"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      fileInputRef.current?.click();
                    }}
                    onDragOver={handleDropZoneDragOver}
                    onDragLeave={handleDropZoneDragLeave}
                    onDrop={handleDropZoneDrop}
                    className={`m3-tactile flex min-h-[76px] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed px-4 py-3.5 text-center transition-colors ${
                      isDraggingFile
                        ? 'border-primary bg-primary-container/25'
                        : 'border-outline-variant bg-surface-container-low hover:border-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface">
                      <ImagePlus
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                      <span>Upload atau tempel (Ctrl+V) screenshot</span>
                    </span>
                    <span className="text-[11px] text-[#4b4b53] dark:text-[#b4b4c0]">
                      Pilih dari galeri atau seret gambar ke sini · otomatis
                      dikompres
                    </span>
                  </button>
                )}

                {screenshotError && (
                  <p
                    role="alert"
                    className="flex items-start gap-1.5 text-xs font-medium text-primary"
                  >
                    <AlertCircle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{screenshotError}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || compressingScreenshot}
                className="m3-tactile inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold text-on-primary shadow-xs hover:bg-primary-hover disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                <span>
                  {submitting ? 'Mengirim Laporan...' : 'Kirim Laporan Beta'}
                </span>
              </button>
            </form>
          )}

          {activeTab === 'mine' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
                  Daftar laporan yang pernah kamu kirim dari akun ini.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    void fetchMyReports();
                  }}
                  disabled={loadingMine}
                  className="m3-tactile inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loadingMine ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>Muat Ulang</span>
                </button>
              </div>

              {mineError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-primary/35 bg-primary-container/50 p-3.5 text-xs text-on-primary-container"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{mineError}</span>
                </div>
              )}

              {loadingMine && myReports.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs font-medium text-[#4b4b53] dark:text-[#b4b4c0]">
                  <Loader2
                    className="h-4 w-4 animate-spin text-primary"
                    aria-hidden="true"
                  />
                  <span>Memuat riwayat laporan...</span>
                </div>
              ) : myReports.length === 0 ? (
                <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center">
                  <Inbox
                    className="mx-auto h-7 w-7 text-[#4b4b53] dark:text-[#b4b4c0]"
                    aria-hidden="true"
                  />
                  <p className="mt-2 font-display text-sm font-bold text-on-surface">
                    Belum ada laporan terkirim
                  </p>
                  <p className="mt-1 text-xs text-[#4b4b53] dark:text-[#b4b4c0]">
                    Laporan bug atau saran yang kamu kirim akan tercatat rapi di
                    sini.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
                  {myReports.map((item) => {
                    const st = STATUS_META[item.status];
                    return (
                      <article key={item.id} className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-[#4b4b53] dark:text-[#b4b4c0]">
                            <strong className="font-semibold text-on-surface">
                              {CATEGORY_LABELS[item.category]}
                            </strong>{' '}
                            · {SCREEN_LABELS[item.screen]} ·{' '}
                            <span className="font-mono tabular-nums">
                              {formatDateTimeId(item.createdAtMs)}
                            </span>
                          </span>
                          <span className={`font-bold ${st.className}`}>
                            {st.label}
                          </span>
                        </div>
                        <h3 className="font-display text-sm font-bold text-on-surface">
                          {item.title}
                        </h3>
                        <p className="whitespace-pre-line text-xs leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0]">
                          {item.description}
                        </p>
                        {item.screenshotDataUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              vibrateTap();
                              setLightboxImageSrc(item.screenshotDataUrl);
                            }}
                            className="m3-tactile block w-full overflow-hidden rounded-xl border border-outline-variant bg-surface text-left hover:border-outline"
                            aria-label={`Lihat screenshot laporan ${item.title}`}
                          >
                            <img
                              src={item.screenshotDataUrl}
                              alt={`Screenshot ${item.title}`}
                              loading="lazy"
                              className="max-h-44 w-full object-contain"
                            />
                            <div className="flex items-center gap-1.5 border-t border-outline-variant px-3 py-1.5 text-[11px] font-semibold text-[#4b4b53] dark:text-[#b4b4c0]">
                              <ZoomIn
                                className="h-3.5 w-3.5 text-primary"
                                aria-hidden="true"
                              />
                              <span>Ketuk untuk perbesar screenshot</span>
                            </div>
                          </button>
                        )}
                        {item.adminNote && (
                          <div className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-xs text-on-surface">
                            <span className="font-bold text-primary">
                              Catatan Pengembang:{' '}
                            </span>
                            <span>{item.adminNote}</span>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  role="radiogroup"
                  aria-label="Filter status laporan"
                  className="inline-flex items-center gap-1 rounded-xl bg-surface-container p-1"
                >
                  {(
                    [
                      { id: 'all', label: 'Semua' },
                      { id: 'open', label: 'Diterima' },
                      { id: 'reviewed', label: 'Ditinjau' },
                      { id: 'resolved', label: 'Selesai' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={adminFilter === opt.id}
                      onClick={() => {
                        vibrateTap();
                        setAdminFilter(opt.id);
                      }}
                      className={`min-h-[36px] whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                        adminFilter === opt.id
                          ? 'bg-surface-container-low text-on-surface shadow-xs'
                          : 'text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    void fetchAdminReports();
                  }}
                  disabled={loadingAdmin}
                  className="m3-tactile inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loadingAdmin ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>Segarkan</span>
                </button>
              </div>

              {adminError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-primary/35 bg-primary-container/50 p-3.5 text-xs text-on-primary-container"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{adminError}</span>
                </div>
              )}

              {loadingAdmin && adminReports.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs font-medium text-[#4b4b53] dark:text-[#b4b4c0]">
                  <Loader2
                    className="h-4 w-4 animate-spin text-primary"
                    aria-hidden="true"
                  />
                  <span>Memuat kotak masuk beta...</span>
                </div>
              ) : filteredAdminReports.length === 0 ? (
                <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center text-xs text-[#4b4b53] dark:text-[#b4b4c0]">
                  Tidak ada laporan pada filter ini.
                </div>
              ) : (
                <div className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
                  {filteredAdminReports.map((item) => {
                    const isSaving = savingId === item.id;
                    return (
                      <article key={item.id} className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4b4b53] dark:text-[#b4b4c0]">
                          <span>
                            <strong className="font-mono text-on-surface">
                              @{item.username}
                            </strong>{' '}
                            · {CATEGORY_LABELS[item.category]} ·{' '}
                            {SCREEN_LABELS[item.screen]} ·{' '}
                            <span className="font-mono">{item.jlptLevel}</span>
                          </span>
                          <span className="font-mono tabular-nums">
                            {formatDateTimeId(item.createdAtMs)}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-display text-sm font-bold text-on-surface">
                            {item.title}
                          </h3>
                          <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0]">
                            {item.description}
                          </p>
                        </div>

                        {item.screenshotDataUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              vibrateTap();
                              setLightboxImageSrc(item.screenshotDataUrl);
                            }}
                            className="m3-tactile block w-full overflow-hidden rounded-xl border border-outline-variant bg-surface text-left hover:border-outline"
                            aria-label={`Lihat screenshot laporan dari @${item.username}`}
                          >
                            <img
                              src={item.screenshotDataUrl}
                              alt={`Screenshot laporan ${item.title}`}
                              loading="lazy"
                              className="max-h-48 w-full object-contain"
                            />
                            <div className="flex items-center gap-1.5 border-t border-outline-variant px-3 py-1.5 text-[11px] font-semibold text-[#4b4b53] dark:text-[#b4b4c0]">
                              <ZoomIn
                                className="h-3.5 w-3.5 text-primary"
                                aria-hidden="true"
                              />
                              <span>Ketuk untuk perbesar screenshot</span>
                            </div>
                          </button>
                        )}

                        <div className="space-y-2 border-t border-outline-variant pt-3">
                          <input
                            type="text"
                            value={adminNotesDraft[item.id] ?? item.adminNote}
                            maxLength={FEEDBACK_ADMIN_NOTE_MAX}
                            onChange={(e) =>
                              setAdminNotesDraft((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Tambahkan catatan balasan untuk beta tester (opsional)..."
                            className="min-h-[40px] w-full rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-xs text-on-surface placeholder:text-[#6b6b76] focus:border-primary focus:outline-none dark:placeholder:text-[#8b8b98]"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            {(
                              ['open', 'reviewed', 'resolved'] as const
                            ).map((st) => {
                              const active = item.status === st;
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() =>
                                    void handleAdminUpdate(item, st)
                                  }
                                  className={`m3-tactile min-h-[38px] rounded-xl border px-3 py-1 text-xs font-bold transition-colors disabled:opacity-60 ${
                                    active
                                      ? 'border-primary bg-primary text-on-primary'
                                      : 'border-outline-variant bg-surface text-on-surface hover:bg-surface-container'
                                  }`}
                                >
                                  {STATUS_META[st].label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {lightboxImageSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau screenshot penuh"
          className="fixed inset-0 z-[75] flex items-center justify-center bg-zinc-950/90 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              vibrateTap();
              setLightboxImageSrc(null);
            }
          }}
        >
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              setLightboxImageSrc(null);
            }}
            aria-label="Tutup pratinjau screenshot"
            className="m3-tactile fixed top-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/90 text-white ring-1 ring-white/20 hover:bg-zinc-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <img
            src={lightboxImageSrc}
            alt="Screenshot ukuran penuh"
            className="max-h-[86dvh] max-w-[94vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
