import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
} from 'react';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  ExternalLink,
  FileWarning,
  ImagePlus,
  Lightbulb,
  Loader2,
  Mail,
  MessageSquarePlus,
  Send,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import type { JlptLevel } from '../data/utamagoContent';
import { useLanguage } from '../i18n/LanguageContext';
import {
  FEEDBACK_DESC_MAX,
  FEEDBACK_DESC_MIN,
  FEEDBACK_TITLE_MAX,
  FEEDBACK_TITLE_MIN,
  validateBetaFeedbackInput,
  type BetaFeedbackCategory,
  type BetaFeedbackScreen,
} from '../services/betaFeedback';
import { vibrateTap } from '../utils/haptics';
import {
  compressFeedbackScreenshot,
  type CompressedScreenshot,
} from '../utils/screenshotCompress';

const DEFAULT_RECIPIENT_EMAIL = 'kantorhp65@gmail.com';
const DEFAULT_EMAIL_SUBJECT = '[UtamaGo!] Pelaporan Bug dan Saran';

interface BetaFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
  username: string;
  accountEmail?: string;
  jlptLevel: JlptLevel;
  defaultScreen?: BetaFeedbackScreen;
}

interface MailtoFallbackState {
  recipient: string;
  subject: string;
  mailtoHref: string;
  hasScreenshot: boolean;
  reason?: string;
}

export function BetaFeedbackModal({
  open,
  onClose,
  username,
  accountEmail,
  jlptLevel,
  defaultScreen = 'profile',
}: BetaFeedbackModalProps) {
  const { lang, t } = useLanguage();

  const [category, setCategory] = useState<BetaFeedbackCategory>('bug');
  const [screen, setScreen] = useState<BetaFeedbackScreen>(defaultScreen);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<CompressedScreenshot | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [compressingScreenshot, setCompressingScreenshot] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sentRecipient, setSentRecipient] = useState<string | null>(null);
  const [mailtoFallback, setMailtoFallback] = useState<MailtoFallbackState | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categoryOptions: ReadonlyArray<{
    id: BetaFeedbackCategory;
    label: string;
    icon: typeof Bug;
  }> = [
    { id: 'bug', label: t('Bug / Error', 'Bug / Error'), icon: Bug },
    { id: 'typo', label: t('Typo / Materi', 'Typo / Material'), icon: FileWarning },
    { id: 'suggestion', label: t('Saran Fitur', 'Feature Idea'), icon: Lightbulb },
    { id: 'other', label: t('Lainnya', 'Other'), icon: MessageSquarePlus },
  ];

  const screenOptions: ReadonlyArray<{ id: BetaFeedbackScreen; label: string }> = [
    { id: 'home', label: t('Beranda', 'Home') },
    { id: 'anki', label: t('Anki Kosakata', 'Anki Vocab') },
    { id: 'learn', label: t('Materi & Bunpou', 'Learn & Grammar') },
    { id: 'challenge', label: t('Arena Tantangan', 'Challenge Arena') },
    { id: 'tryout', label: t('Try Out JLPT', 'JLPT Try Out') },
    { id: 'profile', label: t('Profil & Pengaturan', 'Profile & Settings') },
    { id: 'other', label: t('Lainnya', 'Other') },
  ];

  useEffect(() => {
    if (!open) return;
    setScreen(defaultScreen);
    setSubmitError(null);
    setSentRecipient(null);
    setMailtoFallback(null);
    setScreenshotError(null);
    setPreviewImageSrc(null);
  }, [open, defaultScreen]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (previewImageSrc) {
          setPreviewImageSrc(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, previewImageSrc]);

  if (!open) return null;

  const handleSelectScreenshotFile = async (file: File | null | undefined) => {
    if (!file) return;
    setScreenshotError(null);
    setCompressingScreenshot(true);
    try {
      const compressed = await compressFeedbackScreenshot(file);
      setScreenshot(compressed);
    } catch (err) {
      setScreenshotError(
        err instanceof Error
          ? err.message
          : t('Gagal memproses screenshot.', 'Failed to process screenshot.'),
      );
    } finally {
      setCompressingScreenshot(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDropFile = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      void handleSelectScreenshotFile(file);
    }
  };

  const handlePasteImage = (e: ReactClipboardEvent<HTMLFormElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          void handleSelectScreenshotFile(file);
          return;
        }
      }
    }
  };

  const buildMailtoHref = (
    recipient: string,
    subject: string,
    cleanTitle: string,
    cleanDesc: string,
  ): string => {
    const categoryLabel =
      categoryOptions.find((c) => c.id === category)?.label ?? category;
    const screenLabel =
      screenOptions.find((s) => s.id === screen)?.label ?? screen;
    const bodyLines = [
      `Kategori: ${categoryLabel}`,
      `Halaman: ${screenLabel}`,
      `Target JLPT: ${jlptLevel}`,
      `Pengguna: ${username}`,
      ...(accountEmail ? [`Email Akun: ${accountEmail}`] : []),
      '',
      `Judul: ${cleanTitle}`,
      '',
      `Detail:`,
      cleanDesc,
      ...(screenshot
        ? [
            '',
            '(Catatan: silakan lampirkan screenshot secara manual di email ini jika diperlukan.)',
          ]
        : []),
    ];
    return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setScreenshot(null);
    setScreenshotError(null);
    setSubmitError(null);
    setSentRecipient(null);
    setMailtoFallback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSentRecipient(null);
    setMailtoFallback(null);

    const validation = validateBetaFeedbackInput({
      category,
      screen,
      title,
      description,
      jlptLevel,
      screenshotDataUrl: screenshot?.dataUrl,
    });
    if (!validation.ok) {
      setSubmitError(validation.error);
      return;
    }

    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    setSubmitting(true);

    try {
      const res = await fetch('/api/feedback/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          screen,
          title: cleanTitle,
          description: cleanDesc,
          jlptLevel,
          username,
          accountEmail: accountEmail ?? '',
          screenshotDataUrl: screenshot?.dataUrl ?? '',
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        emailConfigured?: boolean;
        recipient?: string;
        fallbackEmail?: string;
        subject?: string;
        error?: string;
      };

      if (res.ok && payload.ok) {
        setSentRecipient(payload.recipient || DEFAULT_RECIPIENT_EMAIL);
        setTitle('');
        setDescription('');
        setScreenshot(null);
        setScreenshotError(null);
        return;
      }

      if (payload.emailConfigured === false) {
        const recipient = payload.fallbackEmail || DEFAULT_RECIPIENT_EMAIL;
        const subject = payload.subject || DEFAULT_EMAIL_SUBJECT;
        setMailtoFallback({
          recipient,
          subject,
          mailtoHref: buildMailtoHref(recipient, subject, cleanTitle, cleanDesc),
          hasScreenshot: Boolean(screenshot),
        });
        return;
      }

      if (payload.fallbackEmail) {
        const recipient = payload.fallbackEmail;
        const subject = payload.subject || DEFAULT_EMAIL_SUBJECT;
        setMailtoFallback({
          recipient,
          subject,
          mailtoHref: buildMailtoHref(recipient, subject, cleanTitle, cleanDesc),
          hasScreenshot: Boolean(screenshot),
          reason: payload.error,
        });
        return;
      }

      setSubmitError(
        payload.error ||
          t(
            'Gagal mengirim laporan. Periksa koneksi internetmu lalu coba lagi.',
            'Failed to send report. Check your internet connection and try again.',
          ),
      );
    } catch {
      const recipient = DEFAULT_RECIPIENT_EMAIL;
      const subject = DEFAULT_EMAIL_SUBJECT;
      setMailtoFallback({
        recipient,
        subject,
        mailtoHref: buildMailtoHref(recipient, subject, cleanTitle, cleanDesc),
        hasScreenshot: Boolean(screenshot),
        reason: t(
          'Server email sedang tidak terjangkau. Kamu tetap bisa mengirim lewat aplikasi email.',
          'Email server is currently unreachable. You can still send via your email app.',
        ),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="beta-feedback-title"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-outline-variant bg-surface shadow-2xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
                <Mail className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2
                  id="beta-feedback-title"
                  className="font-display text-base font-extrabold text-on-surface sm:text-lg"
                >
                  {t('Lapor Bug & Saran', 'Report Bug & Feedback')}
                </h2>
                <p className="truncate text-[11px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
                  {t(
                    `Terkirim langsung ke ${DEFAULT_RECIPIENT_EMAIL}`,
                    `Sent directly to ${DEFAULT_RECIPIENT_EMAIL}`,
                  )}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            aria-label={t('Tutup form laporan', 'Close feedback form')}
            className="m3-tactile inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {sentRecipient ? (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-lg font-extrabold text-on-surface">
                  {t('Laporan Berhasil Dikirim!', 'Report Sent Successfully!')}
                </h3>
                <p className="mx-auto max-w-sm text-xs leading-relaxed text-[#52525b] dark:text-[#a1a1aa]">
                  {t(
                    `Terima kasih sudah membantu menyempurnakan UtamaGo!. Laporanmu telah diteruskan ke ${sentRecipient} dengan subjek "${DEFAULT_EMAIL_SUBJECT}".`,
                    `Thank you for helping improve UtamaGo!. Your report has been emailed to ${sentRecipient} with subject "${DEFAULT_EMAIL_SUBJECT}".`,
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    resetForm();
                  }}
                  className="m3-tactile inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container"
                >
                  {t('Kirim Laporan Lain', 'Send Another Report')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    onClose();
                  }}
                  className="m3-tactile inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-hover"
                >
                  {t('Selesai', 'Done')}
                </button>
              </div>
            </div>
          ) : mailtoFallback ? (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl border border-amber-300/70 bg-amber-50/90 p-4 dark:border-amber-700/60 dark:bg-amber-950/35">
                <div className="flex items-start gap-2.5">
                  <Mail
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
                    aria-hidden="true"
                  />
                  <div className="space-y-1 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
                    <p className="font-bold">
                      {t(
                        'Kirim langsung lewat aplikasi emailmu',
                        'Send directly via your email app',
                      )}
                    </p>
                    <p>
                      {mailtoFallback.reason ||
                        t(
                          `Pengiriman email otomatis belum diaktifkan di server. Klik tombol di bawah untuk membuka email siap kirim ke ${mailtoFallback.recipient} dengan subjek "${mailtoFallback.subject}".`,
                          `Automatic server email delivery is not configured yet. Tap below to open a pre-filled email to ${mailtoFallback.recipient} with subject "${mailtoFallback.subject}".`,
                        )}
                    </p>
                    {mailtoFallback.hasScreenshot && (
                      <p className="font-medium text-amber-900 dark:text-amber-200">
                        {t(
                          'Jangan lupa lampirkan screenshot yang sudah kamu siapkan di aplikasi email.',
                          'Remember to attach your screenshot inside your email app.',
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <a
                  href={mailtoFallback.mailtoHref}
                  onClick={() => vibrateTap()}
                  className="m3-tactile inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-xs hover:bg-primary-hover"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span>{t('Buka Aplikasi Email', 'Open Email App')}</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setMailtoFallback(null);
                  }}
                  className="m3-tactile inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container"
                >
                  {t('Kembali ke Form', 'Back to Form')}
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => void handleSubmit(e)}
              onPaste={handlePasteImage}
              className="space-y-4"
            >
              {/* Category selector */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-on-surface">
                  {t('Kategori', 'Category')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categoryOptions.map((opt) => {
                    const Icon = opt.icon;
                    const active = category === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          vibrateTap();
                          setCategory(opt.id);
                        }}
                        className={`m3-tactile flex min-h-[44px] items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                          active
                            ? 'border-primary bg-primary-container text-primary'
                            : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Screen selector */}
              <div>
                <label
                  htmlFor="feedback-screen-select"
                  className="mb-1.5 block text-xs font-bold text-on-surface"
                >
                  {t('Halaman Terkait', 'Related Screen')}
                </label>
                <select
                  id="feedback-screen-select"
                  value={screen}
                  onChange={(e) =>
                    setScreen(e.target.value as BetaFeedbackScreen)
                  }
                  className="min-h-[44px] w-full rounded-2xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-sm font-medium text-on-surface outline-none focus:border-primary"
                >
                  {screenOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="feedback-title-input"
                    className="text-xs font-bold text-on-surface"
                  >
                    {t('Judul Singkat', 'Short Title')}
                  </label>
                  <span className="text-[11px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
                    {title.trim().length}/{FEEDBACK_TITLE_MAX}
                  </span>
                </div>
                <input
                  id="feedback-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={FEEDBACK_TITLE_MAX}
                  placeholder={t(
                    'Contoh: Audio Choukai N3 tidak bunyi saat ditekan',
                    'Example: JLPT N3 listening audio does not play',
                  )}
                  className="min-h-[44px] w-full rounded-2xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/65 outline-none focus:border-primary"
                />
                {title.trim().length > 0 &&
                  title.trim().length < FEEDBACK_TITLE_MIN && (
                    <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                      {t(
                        `Minimal ${FEEDBACK_TITLE_MIN} karakter.`,
                        `Minimum ${FEEDBACK_TITLE_MIN} characters.`,
                      )}
                    </p>
                  )}
              </div>

              {/* Description */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="feedback-desc-input"
                    className="text-xs font-bold text-on-surface"
                  >
                    {t('Detail Bug atau Saran', 'Bug Details or Suggestion')}
                  </label>
                  <span className="text-[11px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
                    {description.trim().length}/{FEEDBACK_DESC_MAX}
                  </span>
                </div>
                <textarea
                  id="feedback-desc-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={FEEDBACK_DESC_MAX}
                  rows={4}
                  placeholder={t(
                    'Ceritakan langkah yang dilakukan, apa yang terjadi, atau saran fitur yang kamu inginkan...',
                    'Describe what happened, steps to reproduce, or the feature you would like to see...',
                  )}
                  className="w-full resize-none rounded-2xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-sm leading-relaxed text-on-surface placeholder:text-on-surface-variant/65 outline-none focus:border-primary"
                />
                {description.trim().length > 0 &&
                  description.trim().length < FEEDBACK_DESC_MIN && (
                    <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                      {t(
                        `Minimal ${FEEDBACK_DESC_MIN} karakter.`,
                        `Minimum ${FEEDBACK_DESC_MIN} characters.`,
                      )}
                    </p>
                  )}
              </div>

              {/* Auto-compressed Screenshot uploader */}
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-on-surface">
                    {t('Screenshot (Opsional)', 'Screenshot (Optional)')}
                  </span>
                  <span className="text-[11px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
                    {t(
                      'Otomatis dikompres ringan (< 135 KB)',
                      'Auto-compressed lightweight (< 135 KB)',
                    )}
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    void handleSelectScreenshotFile(file);
                  }}
                />

                {screenshot ? (
                  <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
                    <div className="relative flex max-h-48 items-center justify-center bg-zinc-950/5 p-2 dark:bg-zinc-950/40">
                      <img
                        src={screenshot.dataUrl}
                        alt={t('Pratinjau screenshot laporan', 'Report screenshot preview')}
                        className="max-h-44 rounded-xl object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewImageSrc(screenshot.dataUrl)}
                        aria-label={t('Perbesar screenshot', 'Zoom screenshot')}
                        className="m3-tactile absolute right-3 bottom-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950/75 text-white hover:bg-zinc-900"
                      >
                        <ZoomIn className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant px-3 py-2">
                      <div className="min-w-0 text-[11px] font-medium text-[#52525b] dark:text-[#a1a1aa]">
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">
                          {t('Terkompresi', 'Compressed')} · {screenshot.sizeKb} KB
                        </span>{' '}
                        ({screenshot.width}×{screenshot.height})
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            vibrateTap();
                            fileInputRef.current?.click();
                          }}
                          className="m3-tactile inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-outline-variant bg-surface px-2.5 py-1 text-[11px] font-bold text-on-surface hover:bg-surface-container"
                        >
                          <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t('Ganti', 'Replace')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            vibrateTap();
                            setScreenshot(null);
                            setScreenshotError(null);
                          }}
                          className="m3-tactile inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t('Hapus', 'Remove')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!compressingScreenshot) {
                        vibrateTap();
                        fileInputRef.current?.click();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.key === 'Enter' || e.key === ' ') &&
                        !compressingScreenshot
                      ) {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={handleDropFile}
                    className={`m3-tactile flex min-h-[92px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-4 text-center transition-colors ${
                      isDraggingFile
                        ? 'border-primary bg-primary-container/50'
                        : 'border-outline-variant bg-surface-container-low hover:border-primary/50 hover:bg-surface-container'
                    }`}
                  >
                    {compressingScreenshot ? (
                      <>
                        <Loader2
                          className="h-5 w-5 animate-spin text-primary"
                          aria-hidden="true"
                        />
                        <p className="text-xs font-bold text-on-surface">
                          {t(
                            'Mengompres screenshot agar super ringan...',
                            'Compressing screenshot for fast upload...',
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <ImagePlus
                          className="h-5 w-5 text-primary"
                          aria-hidden="true"
                        />
                        <p className="text-xs font-bold text-on-surface">
                          {t(
                            'Ketuk untuk unggah, seret gambar, atau Ctrl+V',
                            'Tap to upload, drag image, or paste (Ctrl+V)',
                          )}
                        </p>
                        <p className="text-[11px] text-[#52525b] dark:text-[#a1a1aa]">
                          {t(
                            'PNG, JPG, atau WebP · langsung dikompres otomatis',
                            'PNG, JPG, or WebP · automatically compressed',
                          )}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {screenshotError && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{screenshotError}</span>
                  </p>
                )}
              </div>

              {submitError && (
                <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit Footer */}
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-snug text-[#52525b] dark:text-[#a1a1aa]">
                  {lang === 'en'
                    ? `Subject: ${DEFAULT_EMAIL_SUBJECT}`
                    : `Subjek email: ${DEFAULT_EMAIL_SUBJECT}`}
                </p>
                <button
                  type="submit"
                  disabled={submitting || compressingScreenshot}
                  className="m3-tactile inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary shadow-xs hover:bg-primary-hover disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>{t('Mengirim...', 'Sending...')}</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      <span>{t('Kirim ke Email Tim', 'Send to Team Email')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Lightbox preview */}
      {previewImageSrc && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/85 p-4 backdrop-blur-xs"
          onClick={() => setPreviewImageSrc(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImageSrc(null)}
            aria-label={t('Tutup pratinjau', 'Close preview')}
            className="absolute top-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <img
            src={previewImageSrc}
            alt={t('Pratinjau penuh screenshot', 'Full screenshot preview')}
            className="max-h-[88vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
