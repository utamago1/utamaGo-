import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  Headphones,
  Layers,
} from 'lucide-react';
import type { JlptLevel } from '../data/utamagoContent';
import type { BunpouN2Item } from '../utils/bunpouN2Parser';
import { vibrateTap } from '../utils/haptics';
import type { AppTab } from './AppShellNav';
import { BunpouSection } from './BunpouSection';

type LearnCategory = 'bunpou' | 'kosakata' | 'dokkai' | 'choukai';

interface LearnScreenProps {
  unlockedLevel: JlptLevel;
  bunpouN5Items: BunpouN2Item[];
  bunpouN4Items: BunpouN2Item[];
  bunpouN3Items: BunpouN2Item[];
  bunpouN2Items: BunpouN2Item[];
  bunpouN1Items: BunpouN2Item[];
  reviewedLessonIds?: string[];
  onMarkLessonReviewed?: (lessonId: string) => void;
  onNavigateProfile: () => void;
  onOpenTryOut: () => void;
  onNavigate?: (tab: AppTab) => void;
}

const LEARN_CATEGORIES: ReadonlyArray<{
  id: LearnCategory;
  label: string;
  comingSoon: boolean;
}> = [
  { id: 'kosakata', label: 'Kosakata', comingSoon: true },
  { id: 'bunpou', label: 'Bunpou', comingSoon: false },
  { id: 'dokkai', label: 'Dokkai', comingSoon: true },
  { id: 'choukai', label: 'Choukai', comingSoon: true },
];

const COMING_SOON_CATEGORIES: Record<
  Exclude<LearnCategory, 'bunpou'>,
  {
    title: string;
    description: string;
    ctaLabel: string;
    ctaTarget: 'anki' | 'tryout';
    icon: typeof BookOpen;
  }
> = {
  kosakata: {
    title: 'Materi Kosakata — Segera Hadir',
    description:
      'Modul pembelajaran kosakata terstruktur per bab & tema sedang disiapkan. Sambil menunggu, kamu bisa langsung menghafal ribuan kartu kosakata JLPT N5–N1 dengan jadwal ulang berkala dan gestur geser kiri/kanan di tab Anki.',
    ctaLabel: 'Latih Kosakata di Tab Anki',
    ctaTarget: 'anki',
    icon: Layers,
  },
  dokkai: {
    title: 'Materi Dokkai — Segera Hadir',
    description:
      'Panduan bedah wacana bacaan (Tanbun, Chuubun, Choubun, & pencarian informasi) sedang disusun. Sementara ini kamu sudah bisa langsung berlatih soal bacaan teks penuh JLPT N2 & N1 di tab Tryout.',
    ctaLabel: 'Latihan Dokkai di Tab Tryout',
    ctaTarget: 'tryout',
    icon: FileText,
  },
  choukai: {
    title: 'Materi Choukai — Segera Hadir',
    description:
      'Materi pembahasan strategi menyimak Mondai 1–5 beserta transkrip sedang disiapkan. Untuk latihan menyimak sekarang, buka tab Tryout yang sudah dilengkapi audio resmi JLPT N2 & arsip 18 audio N1.',
    ctaLabel: 'Latihan Audio Choukai di Tab Tryout',
    ctaTarget: 'tryout',
    icon: Headphones,
  },
};

export function LearnScreen({
  unlockedLevel,
  bunpouN5Items,
  bunpouN4Items,
  bunpouN3Items,
  bunpouN2Items,
  bunpouN1Items,
  reviewedLessonIds = [],
  onMarkLessonReviewed,
  onNavigateProfile,
  onOpenTryOut,
  onNavigate,
}: LearnScreenProps) {
  // Default to Bunpou since Kosakata, Dokkai, and Choukai are marked "Segera hadir"
  const [subTab, setSubTab] = useState<LearnCategory>('bunpou');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const renderComingSoonSection = (
    categoryId: Exclude<LearnCategory, 'bunpou'>,
  ) => {
    const info = COMING_SOON_CATEGORIES[categoryId];
    const Icon = info.icon;
    return (
      <section
        aria-label={info.title}
        className="mx-auto w-full max-w-2xl rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-center shadow-xs sm:p-6"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-surface-container text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-warning-container px-2.5 py-1 text-xs font-bold text-on-warning-container">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Segera Hadir</span>
        </p>

        <h3 className="mt-3 font-display text-lg font-extrabold text-on-surface sm:text-xl">
          {info.title}
        </h3>

        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0] sm:text-sm">
          {info.description}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              if (info.ctaTarget === 'anki' && onNavigate) {
                onNavigate('anki');
              } else {
                onOpenTryOut();
              }
            }}
            className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-bold text-on-primary hover:bg-primary-hover sm:w-auto"
          >
            <span>{info.ctaLabel}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              setSubTab('bunpou');
            }}
            className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-outline bg-surface-container px-5 py-2.5 text-[13px] font-bold text-on-surface hover:bg-surface-container-high sm:w-auto"
          >
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Buka Materi Bunpou</span>
          </button>
        </div>
      </section>
    );
  };

  const isBunpou = subTab === 'bunpou';

  return (
    <div className="w-full min-w-0 space-y-6">
      {isBunpou ? (
        <header className="w-full min-w-0 space-y-4">
          {/* B. Judul halaman — sederhana dan tidak terlalu besar */}
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
              Materi Bunpou
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0] sm:text-sm">
              Pelajari pola tata bahasa Jepang berdasarkan level JLPT.
            </p>
          </div>

          {/* C. Navigasi jenis materi — ringan, sederhana, tanpa dekorasi berlebih */}
          <nav
            role="tablist"
            aria-label="Kategori Materi"
            className="grid w-full grid-cols-[repeat(4,minmax(0,1fr))] border-b border-outline-variant sm:flex sm:items-center sm:gap-7"
          >
            {LEARN_CATEGORIES.map((tab) => {
              const active = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    vibrateTap();
                    setSubTab(tab.id);
                    setMobileDetailOpen(false);
                  }}
                  className={`-mb-px inline-flex min-h-[44px] min-w-0 items-center justify-center whitespace-nowrap border-b-2 px-1 py-2.5 text-[13px] transition-colors sm:px-0.5 sm:text-sm ${
                    active
                      ? 'border-primary font-semibold text-primary'
                      : 'border-transparent font-medium text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </header>
      ) : (
        <header className="w-full min-w-0 space-y-4">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#4b4b53] dark:text-[#b4b4c0]">
              Materi Belajar · Akses Level{' '}
              <span className="font-mono font-bold">{unlockedLevel}</span>
            </p>
            <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
              Ringkasan &amp; Panduan JLPT
            </h2>
          </div>

          {/* 4-column ergonomic mobile segmented category tabs with "Segera hadir" labels */}
          <div
            role="tablist"
            aria-label="Kategori Materi"
            className="grid w-full grid-cols-[repeat(4,minmax(0,1fr))] gap-1 rounded-2xl bg-surface-container p-1"
          >
            {LEARN_CATEGORIES.map((tab) => {
              const active = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    vibrateTap();
                    setSubTab(tab.id);
                    setMobileDetailOpen(false);
                  }}
                  className={`m3-tactile flex min-h-[52px] min-w-0 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-center transition-colors ${
                    active
                      ? 'bg-surface-container-low text-primary shadow-xs'
                      : 'text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
                  }`}
                >
                  <span className="w-full truncate text-xs font-bold sm:text-sm">
                    {tab.label}
                  </span>
                  <span
                    className={`mt-0.5 truncate text-[10px] font-semibold leading-none ${
                      tab.comingSoon
                        ? active
                          ? 'text-warning'
                          : 'text-[#4b4b53] dark:text-[#b4b4c0]'
                        : active
                          ? 'text-primary'
                          : 'text-success'
                    }`}
                  >
                    {tab.comingSoon ? 'Segera hadir' : 'Tersedia'}
                  </span>
                </button>
              );
            })}
          </div>
        </header>
      )}

      {/* 1. KOSAKATA — Segera Hadir */}
      {subTab === 'kosakata' && renderComingSoonSection('kosakata')}

      {/* 2. BUNPOU — Tersedia */}
      {subTab === 'bunpou' && (
        <BunpouSection
          unlockedLevel={unlockedLevel}
          bunpouN5Items={bunpouN5Items}
          bunpouN4Items={bunpouN4Items}
          bunpouN3Items={bunpouN3Items}
          bunpouN2Items={bunpouN2Items}
          bunpouN1Items={bunpouN1Items}
          reviewedLessonIds={reviewedLessonIds}
          onMarkLessonReviewed={onMarkLessonReviewed}
          onNavigateProfile={onNavigateProfile}
          mobileDetailOpen={mobileDetailOpen}
          onMobileDetailOpenChange={setMobileDetailOpen}
        />
      )}

      {/* 3. DOKKAI — Segera Hadir */}
      {subTab === 'dokkai' && renderComingSoonSection('dokkai')}

      {/* 4. CHOUKAI — Segera Hadir */}
      {subTab === 'choukai' && renderComingSoonSection('choukai')}
    </div>
  );
}

