import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BRAND_ASSETS } from '../data/utamagoContent';
import { vibrateTap } from '../utils/haptics';

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
          <p className="mt-1 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
            Informasi aplikasi dan tim pengajar di balik UtamaGo!.
          </p>
        </div>
      </div>

      {/* App Overview */}
      <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant bg-white p-2">
            {!logoFailed ? (
              <img
                src={BRAND_ASSETS.logoPath}
                alt="Logo resmi UtamaGo!"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                draggable={false}
                onError={() => setLogoFailed(true)}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-sm font-extrabold text-zinc-900">
                Utama<span className="text-red-600">Go!</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-lg font-bold text-on-surface">
              Utama<span className="text-primary">Go!</span>
            </h3>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Lahir dari pengalaman pribadi pendiri yang sempat kebingungan
              mencari strategi belajar JLPT, khususnya tingkat N2 dan N1, serta
              sulitnya menemukan akses simulasi ujian (Try Out) yang terpercaya.
            </p>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Untuk menjawab kebutuhan tersebut, UtamaGo! hadir agar persiapan
              JLPT lebih terstruktur dan mudah diikuti dari tingkat pemula
              hingga mahir. Aplikasi ini menggabungkan flashcard Anki Kosakata
              N5-N1, materi &amp; kartu Bunpou N5-N1 (553 pola), tantangan
              bertahap, hingga 10 paket lebih Try Out JLPT terverifikasi lengkap
              dengan kunci resmi, audio, dan transkrip Choukai secara gratis.
            </p>
            <p className="rounded-xl border border-outline-variant bg-surface px-3.5 py-2.5 text-xs leading-relaxed text-on-surface-variant">
              (Filosofi nama: UtamaGo! diambil dari nama pendiri, Utama, yang
              dipadukan hingga menyerupai kata bahasa Jepang &ldquo;Tamago&rdquo;
              (telur). Layaknya telur yang menjadi awal kehidupan, aplikasi ini
              diharapkan menjadi titik awal perjalanan belajarmu. Itulah alasan
              logo kami berbentuk telur!)
            </p>
            <p className="font-display text-sm font-semibold text-primary">
              Belajar lebih terarah. Berlatih lebih konsisten. Siap menghadapi
              JLPT!
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
            <div className="flex items-center gap-3.5">
              <img
                src="/assets/founders/founder-ryan.gif"
                alt="Animasi pendiri UtamaGo!, Ryan Alief Utama"
                decoding="async"
                draggable={false}
                className="h-24 w-24 shrink-0 object-contain drop-shadow-xs select-none"
              />
              <div className="min-w-0">
                <h4 className="font-display text-base font-bold text-on-surface">
                  Ryan Alief Utama
                </h4>
                <p className="mt-0.5 text-xs font-semibold text-primary">
                  Pendiri UtamaGo! &amp; Pengajar Bahasa Jepang
                </p>
              </div>
            </div>
            <ul className="space-y-1.5 text-sm leading-relaxed text-on-surface-variant">
              <li>
                · Lulusan Pendidikan Bahasa Jepang, Universitas Negeri Surabaya
              </li>
              <li>· Pemegang sertifikasi JLPT N1</li>
              <li>· Bekerja sebagai penerjemah di perusahaan Jepang</li>
            </ul>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center gap-3.5">
              <img
                src="/assets/founders/founder-annisa.gif"
                alt="Animasi partner UtamaGo!, Annisa Maulidiyah Rohmawati"
                decoding="async"
                draggable={false}
                className="h-24 w-24 shrink-0 object-contain drop-shadow-xs select-none"
              />
              <div className="min-w-0">
                <h4 className="font-display text-base font-bold text-on-surface">
                  Annisa Maulidiyah Rohmawati
                </h4>
                <p className="mt-0.5 text-xs font-semibold text-primary">
                  Partner Utama &amp; Pengajar Bahasa Jepang
                </p>
              </div>
            </div>
            <ul className="space-y-1.5 text-sm leading-relaxed text-on-surface-variant">
              <li>
                · Lulusan Pendidikan Bahasa Jepang, Universitas Negeri Surabaya
              </li>
              <li>· Pemegang sertifikasi JLPT N2</li>
              <li>· Bekerja sebagai staf front office hotel di Jepang</li>
            </ul>
          </div>
        </div>
      </section>

      <p className="text-xs text-on-surface-variant">
        *UtamaGo! bukan penyelenggara resmi JLPT. © 2026 UtamaGo!
      </p>
    </div>
  );
}
