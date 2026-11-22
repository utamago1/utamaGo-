import { useEffect, useState } from 'react';
import { ArrowRight, Heart, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { BRAND_ASSETS } from '../data/utamagoContent';
import { vibrateTap } from '../utils/haptics';

interface SplashWelcomeScreenProps {
  deckReadyCount?: number;
  onEnter: () => void;
}

export function SplashWelcomeScreen({
  deckReadyCount,
  onEnter,
}: SplashWelcomeScreenProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [progress, setProgress] = useState(32);

  useEffect(() => {
    const t1 = window.setTimeout(() => setProgress(76), 160);
    const t2 = window.setTimeout(() => setProgress(100), 520);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-x-clip overflow-y-auto bg-surface px-5 py-8 text-on-surface pt-safe pb-safe pl-safe pr-safe">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary-container/35 to-transparent"
      />

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 flex w-full max-w-md flex-col items-center rounded-3xl border border-outline-variant bg-surface-container-low p-6 text-center shadow-lg sm:p-8"
      >
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant bg-white p-2 shadow-xs sm:h-24 sm:w-24">
          {!logoFailed ? (
            <img
              src={BRAND_ASSETS.logoPath}
              alt="Logo UtamaGo!"
              referrerPolicy="no-referrer"
              draggable={false}
              onError={() => setLogoFailed(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="font-display text-xl font-extrabold text-zinc-900">
              Utama<span className="text-red-600">Go!</span>
            </span>
          )}
        </div>

        <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
          Utama<span className="text-primary">Go!</span>
        </h1>
        <p className="mt-1 text-xs font-semibold tracking-wide text-on-surface-variant sm:text-sm">
          Belajar JLPT N5–N1 · Anki, Bunpou N5–N1 &amp; 6 Paket Try Out N2 Terverifikasi
        </p>

        <blockquote className="mt-6 w-full rounded-2xl border border-outline-variant bg-surface-container px-4 py-4">
          <p className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-wider text-primary">
            <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>Dedikasi</span>
          </p>
          <p className="mt-1.5 font-display text-base font-bold leading-relaxed text-on-surface sm:text-lg">
            Untuk Istriku Annisa,
            <br />
            Hidup dan matiku
          </p>
        </blockquote>

        <div className="mt-6 w-full space-y-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {progress < 100
                ? 'Menyiapkan materi & deck offline...'
                : deckReadyCount
                  ? `${deckReadyCount} materi & kartu siap dipelajari`
                  : 'Aplikasi siap digunakan'}
            </span>
            <span className="font-mono font-bold tabular-nums text-on-surface">
              {progress}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Kesiapan aplikasi UtamaGo!"
            className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            vibrateTap();
            onEnter();
          }}
          className="m3-tactile mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-extrabold text-on-primary shadow-sm hover:bg-primary-hover"
        >
          <span>Masuk ke UtamaGo!</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>

        <p className="mt-3 text-[11px] text-on-surface-variant">
          Progres belajar, jadwal ulang kartu Anki, dan Try Out tersimpan lokal di perangkatmu.
        </p>
      </motion.div>
    </div>
  );
}
