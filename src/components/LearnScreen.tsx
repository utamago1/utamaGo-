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
import { useLanguage } from '../i18n/LanguageContext';
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
  labelId: string;
  labelEn: string;
  comingSoon: boolean;
}> = [
  { id: 'kosakata', labelId: 'Kosakata', labelEn: 'Vocab', comingSoon: true },
  { id: 'bunpou', labelId: 'Bunpou', labelEn: 'Grammar', comingSoon: false },
  { id: 'dokkai', labelId: 'Dokkai', labelEn: 'Reading', comingSoon: true },
  { id: 'choukai', labelId: 'Choukai', labelEn: 'Listening', comingSoon: true },
];

const COMING_SOON_CATEGORIES: Record<
  Exclude<LearnCategory, 'bunpou'>,
  {
    titleId: string;
    titleEn: string;
    descriptionId: string;
    descriptionEn: string;
    ctaLabelId: string;
    ctaLabelEn: string;
    ctaTarget: 'anki' | 'tryout';
    icon: typeof BookOpen;
  }
> = {
  kosakata: {
    titleId: 'Materi Kosakata — Segera Hadir',
    titleEn: 'Vocabulary Lessons — Coming Soon',
    descriptionId:
      'Modul pembelajaran kosakata terstruktur per bab & tema sedang disiapkan. Sambil menunggu, kamu bisa langsung mencari kosakata di Kamus N5–N1 atau menghafal ribuan kartu di tab Anki.',
    descriptionEn:
      'Structured vocabulary lessons organized by chapter and theme are on the way. In the meantime, browse the N5–N1 Dictionary or memorize thousands of flashcards in the Anki tab.',
    ctaLabelId: 'Latih Kosakata di Tab Anki',
    ctaLabelEn: 'Practice Vocab in Anki Tab',
    ctaTarget: 'anki',
    icon: Layers,
  },
  dokkai: {
    titleId: 'Materi Dokkai — Segera Hadir',
    titleEn: 'Reading (Dokkai) Lessons — Coming Soon',
    descriptionId:
      'Panduan bedah wacana bacaan (Tanbun, Chuubun, Choubun, & pencarian informasi) sedang disusun. Sementara ini kamu sudah bisa langsung berlatih soal bacaan teks penuh JLPT N3, N2 & N1 di tab Tryout.',
    descriptionEn:
      'Step-by-step reading passage breakdowns (short, medium, long passages & info retrieval) are being prepared. For now, practice full JLPT N3, N2 & N1 reading sets in the Tryout tab.',
    ctaLabelId: 'Latihan Dokkai di Tab Tryout',
    ctaLabelEn: 'Practice Reading in Tryout Tab',
    ctaTarget: 'tryout',
    icon: FileText,
  },
  choukai: {
    titleId: 'Materi Choukai — Segera Hadir',
    titleEn: 'Listening (Choukai) Lessons — Coming Soon',
    descriptionId:
      'Materi pembahasan strategi menyimak Mondai 1–5 beserta transkrip sedang disiapkan. Untuk latihan menyimak sekarang, buka tab Tryout yang sudah dilengkapi audio resmi & transkrip Choukai JLPT N3, N2 & N1.',
    descriptionEn:
      'Listening strategy guides for Mondai 1–5 with scripts are on the way. To practice listening right now, open the Tryout tab with full JLPT N3, N2 & N1 audio and transcripts.',
    ctaLabelId: 'Latihan Audio Choukai di Tab Tryout',
    ctaLabelEn: 'Practice Listening Audio in Tryout Tab',
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
  const { t } = useLanguage();
  // Default to Bunpou since Kosakata, Dokkai, and Choukai are marked "Segera hadir"
  const [subTab, setSubTab] = useState<LearnCategory>('bunpou');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const renderComingSoonSection = (
    categoryId: Exclude<LearnCategory, 'bunpou'>,
  ) => {
    const info = COMING_SOON_CATEGORIES[categoryId];
    const Icon = info.icon;
    const title = t(info.titleId, info.titleEn);
    const description = t(info.descriptionId, info.descriptionEn);
    const ctaLabel = t(info.ctaLabelId, info.ctaLabelEn);
    return (
      <section
        aria-label={title}
        className="mx-auto w-full max-w-2xl rounded-2xl border border-outline-variant bg-surface-container-low p-5 text-center sm:p-6"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-surface-container text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-warning">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('Segera Hadir', 'Coming Soon')}</span>
        </p>

        <h3 className="mt-2 font-display text-lg font-extrabold text-on-surface sm:text-xl">
          {title}
        </h3>

        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-on-surface-variant sm:text-sm">
          {description}
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
            <span>{ctaLabel}</span>
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
              <span>{t('Buka Kamus Kosakata', 'Open Vocab Dictionary')}</span>
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
              <span>{t('Buka Materi Bunpou', 'Open Grammar Lessons')}</span>
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
              {subTab === 'bunpou'
                ? t('Materi Bunpou', 'Grammar Lessons')
                : t('Materi Belajar JLPT', 'JLPT Study Materials')}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-on-surface-variant sm:text-sm">
              {subTab === 'bunpou'
                ? t(
                    'Pelajari pola tata bahasa Jepang, komparasi pola mirip, dan uji pemahaman.',
                    'Learn Japanese grammar patterns, compare similar forms, and test your understanding.',
                  )
                : t(
                    `Panduan & ringkasan JLPT · Akses Level ${unlockedLevel}`,
                    `JLPT guides & summaries · Level ${unlockedLevel} Access`,
                  )}
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
              <span>{t('Kamus N5–N1', 'N5–N1 Dictionary')}</span>
            </button>
          )}
        </div>

        {/* Consistent 4-tab underline navigation (keeps 3 Segera Hadir tabs intact) */}
        <nav
          role="tablist"
          aria-label={t('Kategori Materi', 'Study Categories')}
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
                    : 'border-transparent font-medium text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="truncate">{t(tab.labelId, tab.labelEn)}</span>
                {tab.comingSoon && (
                  <span className="text-[10px] font-medium text-on-surface-variant sm:text-[11px]">
                    <span className="hidden sm:inline">· </span>
                    {t('Segera', 'Soon')}
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
