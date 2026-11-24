import { useState } from 'react';
import { ArrowLeft, ExternalLink, Instagram, Lock } from 'lucide-react';
import { BRAND_ASSETS } from '../data/utamagoContent';
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
          <span>Kembali ke Profil</span>
        </button>

        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
            Tentang UtamaGo!
          </h2>
          <p className="mt-1 text-[13px] text-on-surface-variant">
            Informasi aplikasi dan tim pengajar di balik UtamaGo!.
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

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-bold text-on-surface">
                Utama<span className="text-primary">Go!</span>
              </h3>
              <span className="rounded-md border border-primary/35 bg-primary-container/60 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase text-on-primary-container">
                Beta Tester
              </span>
            </div>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Lahir dari pengalaman pribadi pendiri yang sempat kebingungan
              mencari strategi belajar JLPT, khususnya tingkat N2 dan N1, serta
              sulitnya menemukan akses simulasi ujian (Try Out) yang terpercaya.
            </p>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Untuk menjawab kebutuhan tersebut, UtamaGo! hadir agar persiapan
              JLPT lebih terstruktur dan mudah diikuti dari tingkat pemula
              hingga mahir. Aplikasi ini menggabungkan flashcard Anki Kosakata
              N5–N1 (7.413 kartu), materi &amp; kartu Bunpou N5–N1 (553 pola),
              Arena Tantangan 30 Stage N5–N1 (Mode Blitz, Survival, Susun
              Kalimat, Tebak Audio &amp; Boss Stage), Studio Latihan Menulis
              Kana/Kanji &amp; Kamus N5–N1, hingga 15 paket Try Out JLPT N3, N2
              &amp; N1 terverifikasi lengkap dengan kunci resmi, audio, dan
              transkrip Choukai secara gratis.
            </p>
            <p className="rounded-xl border border-outline-variant bg-surface px-3.5 py-2.5 text-xs leading-relaxed text-on-surface-variant">
              (Filosofi nama: UtamaGo! diambil dari nama pendiri, Utama, yang
              dipadukan hingga menyerupai kata bahasa Jepang &ldquo;Tamago&rdquo;
              (telur). Layaknya telur yang menjadi awal kehidupan, aplikasi ini
              diharapkan menjadi titik awal perjalanan belajarmu. Itulah alasan
              logo kami berbentuk telur!)
            </p>
            <p className="font-display text-sm font-semibold text-primary">
              Belajar Cerdas. Latih Rutin. Lulus JLPT.
            </p>
          </div>
        </div>
      </section>

      {/* Founder & Partner Profiles */}
      <section aria-label="Profil Pendiri & Pengajar" className="space-y-3">
        <h3 className="font-display text-base font-bold text-on-surface">
          Pendiri &amp; Pengajar
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
                  Pendiri UtamaGo! &amp; Pengajar Bahasa Jepang
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
                · Lulusan Pendidikan Bahasa Jepang, Universitas Negeri Surabaya
              </li>
              <li>· Pemegang sertifikasi JLPT N1</li>
              <li>· Bekerja sebagai penerjemah di perusahaan Jepang</li>
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
            aria-label="Profil Partner Terkunci selama Beta Tester"
            className="flex flex-col justify-between space-y-4 bg-surface-container/35 p-4 sm:p-6"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-dashed border-outline bg-surface-container text-on-surface-variant sm:h-28 sm:w-28">
                  <Lock className="h-8 w-8" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-display text-base font-bold text-on-surface">
                    Partner Utama
                  </h4>
                  <p className="mt-0.5 text-xs font-semibold text-on-surface-variant">
                    Terkunci · Beta Tester
                  </p>
                  {PARTNER_MOTTO && (
                    <p className="mt-1.5 text-xs italic leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0]">
                      {PARTNER_MOTTO}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Profil partner dan pengajar ini dikunci sementara selama masa
                Beta Tester dan akan dibuka saat rilis resmi UtamaGo!.
              </p>
            </div>

            <div className="inline-flex min-h-[44px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container px-3.5 py-2 text-xs font-bold text-on-surface-variant sm:w-auto">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Terkunci Selama Masa Beta</span>
            </div>
          </div>
        </div>
      </section>

      <p className="text-xs text-on-surface-variant">
        *UtamaGo! bukan penyelenggara resmi JLPT. © 2026 UtamaGo!
      </p>
    </div>
  );
}
