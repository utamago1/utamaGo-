import { useEffect } from 'react';
import { MessageSquarePlus, Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../i18n/LanguageContext';
import { vibrateTap } from '../utils/haptics';

interface BetaWelcomeModalProps {
  open: boolean;
  displayName?: string;
  onDismiss: () => void;
  onOpenFeedback: () => void;
}

export function BetaWelcomeModal({
  open,
  displayName,
  onDismiss,
  onOpenFeedback,
}: BetaWelcomeModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/60 p-3 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="beta-welcome-title"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-outline-variant bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-primary">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-bold tracking-wide text-primary uppercase">
                UtamaGo! · Beta Tester
              </p>
              <h2
                id="beta-welcome-title"
                className="font-display text-base font-extrabold text-on-surface sm:text-lg"
              >
                {displayName
                  ? t(`Selamat datang, ${displayName}!`, `Welcome, ${displayName}!`)
                  : t('Selamat datang di UtamaGo!', 'Welcome to UtamaGo!')}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onDismiss();
            }}
            aria-label={t('Tutup pemberitahuan beta', 'Close beta notice')}
            className="m3-tactile inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-sm leading-relaxed text-on-surface">
            {t(
              'Aplikasi ini masih dalam tahap Beta Tester. Terima kasih sudah ikut mencoba UtamaGo! untuk persiapan JLPT-mu.',
              'This app is currently in Beta Testing. Thank you for trying out UtamaGo! for your JLPT preparation.',
            )}
          </p>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-3.5 text-xs leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0]">
            {t(
              'Jika menemukan bug, salah ketik materi, atau ingin memberikan saran fitur, silakan buka tab Profil lalu pilih menu Lapor Bug & Saran.',
              'If you spot a bug, a material typo, or want to suggest a feature, open the Profile tab and choose Report Bug & Feedback.',
            )}
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onDismiss();
              }}
              className="m3-tactile inline-flex min-h-[46px] flex-1 items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-xs hover:bg-primary-hover"
            >
              {t('Mengerti, Mulai Belajar', 'Got It, Start Studying')}
            </button>
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onDismiss();
                onOpenFeedback();
              }}
              className="m3-tactile inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container"
            >
              <MessageSquarePlus
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <span>{t('Lapor Bug & Saran', 'Report Bug & Feedback')}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
