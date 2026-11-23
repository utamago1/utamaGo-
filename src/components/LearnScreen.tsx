import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  Headphones,
  Layers,
  Search,
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
  onAwardPracticeXp?: (xp: number, category: 'learn' | 'challenge') => void;
  onOpenDictionary?: () => void;
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
      'Modul pembelajaran kosakata terstruktur per bab & tema sedang disiapkan. Sambil menunggu, kamu bisa langsung mencari kosakata di Kamus N5–N1 atau menghafal ribuan kartu di tab Anki.',
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
  onAwardPracticeXp,
  onOpenDictionary,
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
        className="mx-auto w-full max-w-2xl rounded-2xl border border-outline-variant bg-surface-container-low p-5 text-center sm:p-6"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-surface-container text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-warning">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Segera Hadir</span>
        </p>

        <h3 className="mt-2 font-display text-lg font-extrabold text-on-surface sm:text-xl">
          {info.title}
        </h3>

        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[#4b4b53] sm:text-sm">
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

          {categoryId === 'kosakata' && onOpenDictionary ? (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onOpenDictionary();
              }}
              className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-outline bg-surface px-5 py-2.5 text-[13px] font-bold text-on-surface hover:bg-surface-container sm:w-auto"
            >
              <Search className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Buka Kamus Kosakata</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                setSubTab('bunpou');
              }}
              className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-outline bg-surface px-5 py-2.5 text-[13px] font-bold text-on-surface hover:bg-surface-container sm:w-auto"
            >
              <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Buka Materi Bunpou</span>
            </button>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Unified consistent header across all 4 Materi tabs */}
      <header className="w-full min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
              {subTab === 'bunpou' ? 'Materi Bunpou' : 'Materi Belajar JLPT'}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#4b4b53] sm:text-sm">
              {subTab === 'bunpou'
                ? 'Pelajari pola tata bahasa Jepang, komparasi pola mirip, dan uji pemahaman.'
                : `Panduan & ringkasan JLPT · Akses Level ${unlockedLevel}`}
            </p>
          </div>

          {onOpenDictionary && (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onOpenDictionary();
              }}
              className="m3-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2 text-xs font-bold text-on-surface hover:border-outline hover:bg-surface-container"
            >
              <Search className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Kamus N5–N1</span>
            </button>
          )}
        </div>

        {/* Consistent 4-tab underline navigation (keeps 3 Segera Hadir tabs intact) */}
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
                className={`-mb-px inline-flex min-h-[44px] min-w-0 flex-col items-center justify-center whitespace-nowrap border-b-2 px-1 py-2 text-[13px] transition-colors sm:flex-row sm:gap-1.5 sm:px-0.5 sm:text-sm ${
                  active
                    ? 'border-primary font-semibold text-primary'
                    : 'border-transparent font-medium text-[#4b4b53] hover:text-on-surface'
                }`}
              >
                <span className="truncate">{tab.label}</span>
                {tab.comingSoon && (
                  <span className="text-[10px] font-medium text-on-surface-variant sm:text-[11px]">
                    <span className="hidden sm:inline">· </span>Segera
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

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
          onAwardPracticeXp={onAwardPracticeXp}
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
