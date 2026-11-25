import { useState } from 'react';
import { ArrowLeft, ExternalLink, Instagram, Lock } from 'lucide-react';
import { BRAND_ASSETS } from '../data/utamagoContent';
import { useLanguage } from '../i18n/LanguageContext';
import { vibrateTap } from '../utils/haptics';
import {
  TEACHER_INSTAGRAM_HANDLE,
  TEACHER_INSTAGRAM_URL,
} from '../utils/jlptReport';

const FOUNDER_MOTTO = 'Muda berkelana, Tua bercerita「若旅、老語」';
const PARTNER_MOTTO = '';

interface ProfileAboutViewProps {
  onBack: () => void;
}

export function ProfileAboutView({ onBack }: ProfileAboutViewProps) {
  const { t } = useLanguage();
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className="space-y-6">
      {/* Sub-page navigation header */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            vibrateTap();
            onBack();
          }}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('Kembali ke Profil', 'Back to Profile')}</span>
        </button>

        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
            {t('Tentang UtamaGo!', 'About UtamaGo!')}
          </h2>
          <p className="mt-1 text-[13px] text-on-surface-variant">
            {t(
              'Informasi aplikasi dan tim pengajar di balik UtamaGo!.',
              'App overview and the teaching team behind UtamaGo!.',
            )}
          </p>
        </div>
      </div>

      {/* App Overview */}
      <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant bg-[#f6f5f0] p-2 dark:border-white/15 dark:bg-[#eae7df]">
            {!logoFailed ? (
              <img
                src={BRAND_ASSETS.logoPath}
                alt="Logo resmi UtamaGo!"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                draggable={false}
                onError={() => setLogoFailed(true)}
                className="h-full w-full object-contain mix-blend-multiply"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-sm font-extrabold text-zinc-900">
                Utama<span className="text-red-600">Go!</span>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-bold text-on-surface">
                Utama<span className="text-primary">Go!</span>
              </h3>
              <span className="rounded-md border border-primary/35 bg-primary-container/60 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase text-on-primary-container">
                Beta Tester
              </span>
            </div>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              {t(
                'UtamaGo! adalah ruang belajar JLPT N5–N1 gratis yang menyatukan flashcard Anki, materi Bunpou, latihan menulis Kanji, Arena Tantangan, hingga paket Try Out lengkap dengan audio dan pembahasan.',
                'UtamaGo! is a free JLPT N5–N1 study companion uniting Anki flashcards, Bunpou grammar, Kanji writing practice, Challenge Arena, and verified Try Out exams with audio and explanations.',
              )}
            </p>
            <p className="rounded-xl border border-outline-variant bg-surface px-3.5 py-2.5 text-xs leading-relaxed text-on-surface-variant">
              {t(
                'Filosofi nama: UtamaGo! memadukan nama pendiri (Utama) dengan kata Jepang "Tamago" (telur) — simbol titik awal perjalanan belajarmu.',
                'Name philosophy: UtamaGo! blends the founder\'s name (Utama) with the Japanese word "Tamago" (egg) — symbolizing the starting point of your study journey.',
              )}
            </p>
            <p className="font-display text-sm font-semibold text-primary">
              {t(
                'Belajar Cerdas. Latih Rutin. Lulus JLPT.',
                'Study Smart. Practice Daily. Pass JLPT.',
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Founder & Partner Profiles */}
      <section
        aria-label={t('Profil Pendiri & Pengajar', 'Founder & Teacher Profiles')}
        className="space-y-3"
      >
        <h3 className="font-display text-base font-bold text-on-surface">
          {t('Pendiri & Pengajar', 'Founder & Teachers')}
        </h3>

        <div className="grid grid-cols-1 divide-y divide-outline-variant rounded-2xl border border-outline-variant bg-surface-container-low md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-24 shrink-0 items-end justify-center overflow-hidden rounded-2xl border border-outline-variant/80 bg-[#f6f5f0] p-1 shadow-2xs ring-1 ring-black/5 dark:border-white/15 dark:bg-[#e8e5dd] dark:ring-white/10 sm:h-28 sm:w-28">
                <img
                  src="/assets/founders/founder-ryan.gif?v=2"
                  alt="Animasi pendiri UtamaGo!, Ryan Alief Utama"
                  width={112}
                  height={112}
                  decoding="async"
                  draggable={false}
                  className="h-full w-full select-none object-contain object-bottom mix-blend-multiply"
                />
              </div>
              <div className="min-w-0">
                <h4 className="font-display text-base font-bold text-on-surface">
                  Ryan Alief Utama
                </h4>
                <p className="mt-0.5 text-xs font-semibold text-primary">
                  {t(
                    'Pendiri UtamaGo! & Pengajar Bahasa Jepang',
                    'Founder of UtamaGo! & Japanese Teacher',
                  )}
                </p>
                {FOUNDER_MOTTO && (
                  <p className="mt-1.5 text-xs italic leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0]">
                    {FOUNDER_MOTTO}
                  </p>
                )}
              </div>
            </div>
            <ul className="space-y-1.5 text-sm leading-relaxed text-on-surface-variant">
              <li>
                ·{' '}
                {t(
                  'Lulusan Pendidikan Bahasa Jepang, Universitas Negeri Surabaya',
                  'B.Ed. in Japanese Language Education, State University of Surabaya',
                )}
              </li>
              <li>
                · {t('Pemegang sertifikasi JLPT N1', 'JLPT N1 certified')}
              </li>
              <li>
                ·{' '}
                {t(
                  'Bekerja sebagai penerjemah di perusahaan Jepang',
                  'Works as a translator at a Japanese company',
                )}
              </li>
            </ul>
            <a
              href={TEACHER_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => vibrateTap()}
              className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-3.5 py-2 text-xs font-bold text-on-surface transition-colors hover:border-primary/40 hover:text-primary sm:w-auto"
            >
              <Instagram className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Instagram · {TEACHER_INSTAGRAM_HANDLE}</span>
              <ExternalLink
                className="h-3.5 w-3.5 text-on-surface-variant"
                aria-hidden="true"
              />
            </a>
          </div>

          {/* Partner profile locked during Beta Tester */}
          <div
            aria-label={t(
              'Profil Partner Terkunci selama Beta Tester',
              'Partner Profile Locked during Beta Testing',
            )}
            className="flex flex-col justify-between space-y-4 bg-surface-container/35 p-4 sm:p-6"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-dashed border-outline bg-surface-container text-on-surface-variant sm:h-28 sm:w-28">
                  <Lock className="h-8 w-8" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-display text-base font-bold text-on-surface">
                    {t('Partner Utama', 'Lead Partner')}
                  </h4>
                  <p className="mt-0.5 text-xs font-semibold text-on-surface-variant">
                    {t('Terkunci · Beta Tester', 'Locked · Beta Tester')}
                  </p>
                  {PARTNER_MOTTO && (
                    <p className="mt-1.5 text-xs italic leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0]">
                      {PARTNER_MOTTO}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                {t(
                  'Profil partner dan pengajar ini dikunci sementara selama masa Beta Tester dan akan dibuka saat rilis resmi UtamaGo!.',
                  'This partner and teacher profile is temporarily locked during Beta Testing and will open on the official UtamaGo! release.',
                )}
              </p>
            </div>

            <div className="inline-flex min-h-[44px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container px-3.5 py-2 text-xs font-bold text-on-surface-variant sm:w-auto">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {t('Terkunci Selama Masa Beta', 'Locked During Beta')}
              </span>
            </div>
          </div>
        </div>
      </section>

      <p className="text-xs text-on-surface-variant">
        {t(
          '*UtamaGo! bukan penyelenggara resmi JLPT. © 2026 UtamaGo!',
          '*UtamaGo! is not an official JLPT organizer. © 2026 UtamaGo!',
        )}
      </p>
    </div>
  );
}
