import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  PenTool,
  Play,
  ShieldAlert,
  Shuffle,
  SlidersHorizontal,
  Star,
  Swords,
  Timer,
  Volume2,
  X,
} from 'lucide-react';
import {
  CHALLENGE_STAGES,
  type ChallengeStage,
} from '../data/challengeLevels';
import type { JlptLevel } from '../data/utamagoContent';
import { useLanguage } from '../i18n/LanguageContext';
import { vibrateTap } from '../utils/haptics';
import {
  createEmptyArcadeRecords,
  getTotalStarsEarned,
  isJlptLevelUnlocked,
  isStageUnlocked,
  JLPT_LEVELS_ASC,
  type ArcadeRecords,
  type CompletedLevelRecord,
} from '../utils/levelProgression';

type LevelTab = JlptLevel | 'ALL';

interface ChallengeArenaViewProps {
  completedLevels: Record<string, CompletedLevelRecord>;
  arcadeRecords?: ArcadeRecords;
  unlockedLevel: JlptLevel;
  arenaUnlockedLevel?: JlptLevel;
  dailyDrillDoneToday?: boolean;
  onClose: () => void;
  onStartStage: (stage: ChallengeStage) => void;
  onStartDailyDrill: (count: 5 | 10, shuffleIndex: number) => void;
  onStartBlitz?: (level: JlptLevel) => void;
  onStartSurvival?: (level: JlptLevel) => void;
}

/**
 * Strip redundant "Stage X - " or "Level X - " prefix from stage titles
 * because the stage order number is already rendered in the left badge.
 */
function formatCleanStageTitle(title: string): string {
  return title.replace(/^(?:Stage|Level)\s*\d+\s*[-–—:]\s*/i, '').trim() || title;
}

export function ChallengeArenaView({
  completedLevels,
  arcadeRecords,
  unlockedLevel,
  arenaUnlockedLevel,
  dailyDrillDoneToday = false,
  onClose,
  onStartStage,
  onStartDailyDrill,
  onStartBlitz,
  onStartSurvival,
}: ChallengeArenaViewProps) {
  const { t } = useLanguage();
  const freePlayMaxLevel = arenaUnlockedLevel ?? unlockedLevel;
  const resolvedArcade = arcadeRecords ?? createEmptyArcadeRecords();
  const stageIds = useMemo(() => CHALLENGE_STAGES.map((s) => s.id), []);

  const totalStars = getTotalStarsEarned(completedLevels);
  const maxStars = CHALLENGE_STAGES.length * 3;
  const completedStagesCount = useMemo(
    () => CHALLENGE_STAGES.filter((s) => Boolean(completedLevels[s.id])).length,
    [completedLevels],
  );
  const defeatedBossCount = useMemo(
    () =>
      CHALLENGE_STAGES.filter(
        (s) =>
          s.stageKind === 'boss' &&
          Boolean(completedLevels[s.id] || resolvedArcade.defeatedBosses[s.id]),
      ).length,
    [completedLevels, resolvedArcade.defeatedBosses],
  );

  const nextStage = useMemo(() => {
    const frontier = CHALLENGE_STAGES.find(
      (s, idx) =>
        isStageUnlocked(idx, stageIds, completedLevels) && !completedLevels[s.id],
    );
    if (frontier) return frontier;
    const lastUnlocked = [...CHALLENGE_STAGES]
      .reverse()
      .find((_, revIdx) =>
        isStageUnlocked(
          CHALLENGE_STAGES.length - 1 - revIdx,
          stageIds,
          completedLevels,
        ),
      );
    return lastUnlocked ?? CHALLENGE_STAGES[0];
  }, [completedLevels, stageIds]);

  const chapters = useMemo(() => {
    const groups: Array<{
      level: JlptLevel;
      chapter: string;
      stages: Array<{ stage: ChallengeStage; index: number }>;
    }> = [];
    CHALLENGE_STAGES.forEach((stage, index) => {
      const existing = groups.find((c) => c.chapter === stage.chapter);
      if (existing) {
        existing.stages.push({ stage, index });
      } else {
        groups.push({
          level: stage.jlptLevel,
          chapter: stage.chapter,
          stages: [{ stage, index }],
        });
      }
    });
    return groups;
  }, []);

  // Default to the user's currently active JLPT level so stages are visible immediately above the fold
  const [selectedTab, setSelectedTab] = useState<LevelTab>(nextStage.jlptLevel);
  // In "Semua" (ALL) accordion mode, only the active chapter is expanded by default
  const [expandedChapters, setExpandedChapters] = useState<
    Record<string, boolean>
  >(() => ({
    [nextStage.chapter]: true,
  }));

  // Mixed practice (Latihan Campuran) Bottom Sheet / Modal state
  const [mixedSheetOpen, setMixedSheetOpen] = useState(false);
  const [dailyDrillCount, setDailyDrillCount] = useState<5 | 10>(5);
  const [dailyShuffleIndex, setDailyShuffleIndex] = useState(0);

  useEffect(() => {
    if (!mixedSheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMixedSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mixedSheetOpen]);

  // Free-play level stays synced with the selected tab when unlocked, else falls back to highest unlocked level
  const effectiveArcadeLevel: JlptLevel =
    selectedTab !== 'ALL' && isJlptLevelUnlocked(selectedTab, freePlayMaxLevel)
      ? selectedTab
      : isJlptLevelUnlocked(nextStage.jlptLevel, freePlayMaxLevel)
        ? nextStage.jlptLevel
        : freePlayMaxLevel;

  const blitzBest = resolvedArcade.blitzBestByLevel[effectiveArcadeLevel];
  const survivalBest = resolvedArcade.survivalBestByLevel[effectiveArcadeLevel];

  const visibleChapters = useMemo(() => {
    if (selectedTab === 'ALL') return chapters;
    return chapters.filter((g) => g.level === selectedTab);
  }, [chapters, selectedTab]);

  const toggleChapterAccordion = (chapterName: string) => {
    vibrateTap();
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterName]: !prev[chapterName],
    }));
  };

  return (
    <div className="mx-auto w-full max-w-[480px] space-y-4 px-4 pb-6 lg:max-w-3xl">
      {/* Top Bar + Single Primary CTA Hero */}
      <section className="space-y-3 border-b border-outline-variant pb-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            className="m3-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline bg-surface-container-low px-3.5 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{t('Kembali', 'Back')}</span>
          </button>

          <p className="text-right font-mono text-xs tabular-nums text-on-surface-variant">
            <strong className="text-on-surface">
              {completedStagesCount}/{CHALLENGE_STAGES.length}
            </strong>{' '}
            {t('stage', 'stages')} ·{' '}
            <strong className="text-on-surface">{defeatedBossCount}/5</strong>{' '}
            boss ·{' '}
            <strong className="text-on-surface">
              {totalStars}/{maxStars}
            </strong>{' '}
            ★
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-on-surface sm:text-2xl">
              {t('Arena Tantangan JLPT', 'JLPT Challenge Arena')}
            </h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {t(
                `Aktif: ${nextStage.jlptLevel} · Stage ${nextStage.order} (${formatCleanStageTitle(nextStage.title)})`,
                `Active: ${nextStage.jlptLevel} · Stage ${nextStage.order} (${formatCleanStageTitle(nextStage.title)})`,
              )}
            </p>
          </div>

          {/* ONLY Primary Red CTA on the entire Arena screen */}
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onStartStage(nextStage);
            }}
            className="m3-tactile inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary shadow-xs hover:bg-primary-hover sm:w-auto"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            <span>
              {completedStagesCount > 0
                ? t(
                    `Lanjutkan Stage ${nextStage.order}`,
                    `Continue Stage ${nextStage.order}`,
                  )
                : t(
                    `Mulai Stage ${nextStage.order}`,
                    `Start Stage ${nextStage.order}`,
                  )}
            </span>
          </button>
        </div>
      </section>

      {/* Slim Horizontal Carousel of 3 Practice Mode Cards (Secondary / Outline clickable cards, NO solid red buttons) */}
      <section aria-label={t('Mode Latihan Cepat', 'Quick Practice Modes')}>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {/* Card 1: Blitz 60 Detik */}
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onStartBlitz?.(effectiveArcadeLevel);
            }}
            className="m3-tactile group flex min-h-[96px] w-[76%] shrink-0 snap-start items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5 text-left transition-colors hover:border-primary/45 hover:bg-surface-container sm:w-auto"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-container text-warning">
                <Timer className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm font-extrabold text-on-surface">
                    {t('Blitz 60s', 'Blitz 60s')}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-primary">
                    {effectiveArcadeLevel}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-on-surface-variant">
                  {blitzBest
                    ? t(
                        `Rekor ${blitzBest.bestScore} poin · x${blitzBest.bestCombo}`,
                        `Best ${blitzBest.bestScore} pts · x${blitzBest.bestCombo}`,
                      )
                    : t('Kejar skor cepat & kombo', 'Fast score & combo rush')}
                </p>
              </div>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
              aria-hidden="true"
            />
          </button>

          {/* Card 2: Survival Tanpa Batas */}
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onStartSurvival?.(effectiveArcadeLevel);
            }}
            className="m3-tactile group flex min-h-[96px] w-[76%] shrink-0 snap-start items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5 text-left transition-colors hover:border-primary/45 hover:bg-surface-container sm:w-auto"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm font-extrabold text-on-surface">
                    {t('Survival', 'Survival')}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-primary">
                    {effectiveArcadeLevel}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-on-surface-variant">
                  {survivalBest
                    ? t(
                        `Rekor ${survivalBest.bestCleared} soal · ${survivalBest.bestScore} poin`,
                        `Best ${survivalBest.bestCleared} Qs · ${survivalBest.bestScore} pts`,
                      )
                    : t('3 nyawa · Soal tanpa batas', '3 lives · Endless waves')}
                </p>
              </div>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
              aria-hidden="true"
            />
          </button>

          {/* Card 3: Latihan Campuran (Simplified card -> opens Bottom Sheet / Modal) */}
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              setMixedSheetOpen(true);
            }}
            className="m3-tactile group flex min-h-[96px] w-[76%] shrink-0 snap-start items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5 text-left transition-colors hover:border-primary/45 hover:bg-surface-container sm:w-auto"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-on-surface">
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm font-extrabold text-on-surface">
                    {t('Latihan Campuran', 'Mixed Drill')}
                  </span>
                  {dailyDrillDoneToday && (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-success"
                      aria-label={t('Selesai hari ini', 'Done today')}
                    />
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-on-surface-variant">
                  {t(
                    'Kata sulit, kosakata & bunpou adaptif',
                    'Difficult words, vocab & grammar mix',
                  )}
                </p>
              </div>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
              aria-hidden="true"
            />
          </button>
        </div>
      </section>

      {/* Synced JLPT Level Filter Tabs (N5..N1 + Semua Accordion) */}
      <section aria-label={t('Jalur Stage JLPT', 'JLPT Stage Path')} className="space-y-3.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-sm font-extrabold text-on-surface sm:text-base">
              {t('Jalur Stage JLPT', 'JLPT Stage Path')}
            </h3>
            <p className="text-xs text-on-surface-variant">
              {selectedTab === 'ALL'
                ? t(
                    'Ketuk judul bab untuk membuka atau menutup daftar stage.',
                    'Tap any chapter header to expand or collapse its stages.',
                  )
                : t(
                    `Menampilkan Bab ${selectedTab} · Kalahkan Boss untuk membuka level berikutnya.`,
                    `Showing ${selectedTab} Chapter · Defeat the Boss to unlock the next level.`,
                  )}
            </p>
          </div>

          <div
            role="tablist"
            aria-label={t('Pilih Level Bab JLPT', 'Filter JLPT Chapter Level')}
            className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-low p-1"
          >
            {JLPT_LEVELS_ASC.map((lv) => {
              const active = selectedTab === lv;
              const lvStages = CHALLENGE_STAGES.filter((s) => s.jlptLevel === lv);
              const lvDone = lvStages.filter((s) =>
                Boolean(completedLevels[s.id]),
              ).length;
              return (
                <button
                  key={lv}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    vibrateTap();
                    setSelectedTab(lv);
                  }}
                  className={`inline-flex min-h-[38px] shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
                    active
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <span>{lv}</span>
                  {lvDone === lvStages.length && lvStages.length > 0 && (
                    <Check className="h-3 w-3" aria-hidden="true" />
                  )}
                </button>
              );
            })}
            <button
              type="button"
              role="tab"
              aria-selected={selectedTab === 'ALL'}
              onClick={() => {
                vibrateTap();
                setSelectedTab('ALL');
              }}
              className={`inline-flex min-h-[38px] shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                selectedTab === 'ALL'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              {t('Semua', 'All')}
            </button>
          </div>
        </div>

        {/* Chapters List (Filtered single chapter OR Accordion in "Semua" mode) */}
        <div className="space-y-3">
          {visibleChapters.map((group) => {
            const chapterIdx = chapters.findIndex(
              (c) => c.chapter === group.chapter,
            );
            const chapterClearedCount = group.stages.filter(({ stage }) =>
              Boolean(completedLevels[stage.id]),
            ).length;
            const totalInChapter = group.stages.length;
            const progressPct =
              totalInChapter > 0
                ? Math.round((chapterClearedCount / totalInChapter) * 100)
                : 0;
            const isChapterComplete =
              totalInChapter > 0 && chapterClearedCount === totalInChapter;
            const firstStageInChapter = group.stages[0];
            const chapterUnlocked = firstStageInChapter
              ? isStageUnlocked(
                  firstStageInChapter.index,
                  stageIds,
                  completedLevels,
                )
              : true;
            const prevChapterLevel =
              chapterIdx > 0 ? chapters[chapterIdx - 1]?.level : null;
            const containsActiveStage = group.stages.some(
              ({ stage }) => stage.id === nextStage.id,
            );

            const isAccordionMode = selectedTab === 'ALL';
            const isExpanded = isAccordionMode
              ? Boolean(expandedChapters[group.chapter])
              : true;

            return (
              <div
                key={group.chapter}
                className={`overflow-hidden rounded-2xl border bg-surface-container-low transition-colors ${
                  containsActiveStage
                    ? 'border-primary/35'
                    : 'border-outline-variant'
                }`}
              >
                {/* Chapter Header with Visual Progress Bar */}
                {isAccordionMode ? (
                  <button
                    type="button"
                    onClick={() => toggleChapterAccordion(group.chapter)}
                    aria-expanded={isExpanded}
                    className="flex min-h-[60px] w-full flex-col gap-2 px-4 py-3.5 text-left transition-colors hover:bg-surface-container/60"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`inline-flex h-6 items-center justify-center rounded-md px-2 font-mono text-[11px] font-extrabold ${
                            isChapterComplete
                              ? 'bg-success-container text-on-success-container'
                              : containsActiveStage
                                ? 'bg-primary-container text-on-primary-container'
                                : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {group.level}
                        </span>
                        <h4 className="truncate font-display text-sm font-extrabold text-on-surface">
                          {group.chapter}
                        </h4>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-xs font-semibold tabular-nums text-on-surface-variant">
                          {chapterUnlocked
                            ? `${chapterClearedCount}/${totalInChapter} ${t('selesai', 'done')}`
                            : t('Terkunci', 'Locked')}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-on-surface-variant transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    <div className="flex w-full items-center gap-2.5">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high"
                        role="progressbar"
                        aria-valuenow={progressPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${group.chapter}: ${chapterClearedCount}/${totalInChapter}`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isChapterComplete ? 'bg-success' : 'bg-primary'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-bold tabular-nums text-on-surface-variant">
                        {progressPct}%
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="space-y-2 border-b border-outline-variant px-4 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-display text-sm font-extrabold text-on-surface">
                        {group.chapter}
                      </h4>
                      <span className="font-mono text-xs font-semibold tabular-nums text-on-surface-variant">
                        {chapterUnlocked
                          ? `${chapterClearedCount}/${totalInChapter} ${t('selesai', 'done')}`
                          : t(
                              `Kalahkan Boss ${prevChapterLevel ?? 'sebelumnya'} untuk membuka`,
                              `Defeat ${prevChapterLevel ?? 'previous'} Boss to unlock`,
                            )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high"
                        role="progressbar"
                        aria-valuenow={progressPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${group.chapter}: ${chapterClearedCount}/${totalInChapter}`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isChapterComplete ? 'bg-success' : 'bg-primary'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-bold tabular-nums text-on-surface-variant">
                        {progressPct}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Stage Cards inside Chapter */}
                {isExpanded && (
                  <div
                    className={`space-y-2 p-3 ${
                      isAccordionMode ? 'border-t border-outline-variant' : ''
                    }`}
                  >
                    {group.stages.map(({ stage, index }) => {
                      const unlocked = isStageUnlocked(
                        index,
                        stageIds,
                        completedLevels,
                      );
                      const record = completedLevels[stage.id];
                      const isCompleted = Boolean(record);
                      const isActiveFrontier = unlocked && !isCompleted;
                      const isBossStage = stage.stageKind === 'boss';
                      const prevStage =
                        index > 0 ? CHALLENGE_STAGES[index - 1] : null;

                      const lockReason =
                        prevStage?.stageKind === 'boss'
                          ? t(
                              `Kalahkan Boss ${prevStage.jlptLevel} (Stage ${prevStage.order}) dahulu`,
                              `Defeat ${prevStage.jlptLevel} Boss (Stage ${prevStage.order}) first`,
                            )
                          : t(
                              `Selesaikan Stage ${stage.order - 1} dahulu`,
                              `Complete Stage ${stage.order - 1} first`,
                            );

                      const modeLabel =
                        stage.stageKind === 'audio'
                          ? t('Misi Audio', 'Audio Mission')
                          : stage.stageKind === 'sentence'
                            ? t('Susun Kalimat ★', 'Sentence Order ★')
                            : stage.stageKind === 'blitz-mission'
                              ? t(
                                  `Blitz 60s · Target ${stage.targetCorrect ?? 6}`,
                                  `Blitz 60s · Goal ${stage.targetCorrect ?? 6}`,
                                )
                              : stage.stageKind === 'survival-mission'
                                ? t('Survival · 8 Soal', 'Survival · 8 Qs')
                                : isBossStage
                                  ? `Boss · ${stage.bossMaxHp ?? stage.questions.length} HP`
                                  : t('Pilihan Ganda', 'Multiple Choice');

                      const cleanTitle = formatCleanStageTitle(stage.title);

                      // Distinct visual state per stage:
                      // 1. Selesai (soft green check)
                      // 2. Aktif / Sedang Dikerjakan (red accent highlight, firm border, subtle shadow)
                      // 3. Terkunci (muted gray, opacity-60)
                      const cardClasses = !unlocked
                        ? 'cursor-not-allowed border border-outline-variant/70 bg-surface-container/40 opacity-60'
                        : isActiveFrontier
                          ? 'border-2 border-primary bg-primary-container/20 shadow-sm hover:bg-primary-container/30'
                          : isCompleted
                            ? 'border border-success/30 bg-surface hover:bg-surface-container/70'
                            : 'border border-outline-variant bg-surface hover:bg-surface-container/70';

                      const badgeClasses = !unlocked
                        ? 'bg-surface-container-high text-on-surface-variant'
                        : isCompleted
                          ? 'bg-success-container text-success border border-success/35'
                          : 'bg-primary text-on-primary shadow-xs';

                      const renderBadgeContent = () => {
                        if (!unlocked) {
                          return <Lock className="h-4 w-4" aria-hidden="true" />;
                        }
                        if (isCompleted) {
                          return <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />;
                        }
                        if (isBossStage) {
                          return <Swords className="h-4 w-4" aria-hidden="true" />;
                        }
                        if (stage.stageKind === 'audio') {
                          return <Volume2 className="h-4 w-4" aria-hidden="true" />;
                        }
                        if (stage.stageKind === 'sentence') {
                          return <PenTool className="h-4 w-4" aria-hidden="true" />;
                        }
                        if (stage.stageKind === 'blitz-mission') {
                          return <Timer className="h-4 w-4" aria-hidden="true" />;
                        }
                        if (stage.stageKind === 'survival-mission') {
                          return (
                            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                          );
                        }
                        return stage.order;
                      };

                      return (
                        <button
                          key={stage.id}
                          type="button"
                          disabled={!unlocked}
                          onClick={() => {
                            if (!unlocked) return;
                            vibrateTap();
                            onStartStage(stage);
                          }}
                          aria-label={
                            unlocked
                              ? `Stage ${stage.order}: ${cleanTitle}`
                              : `Stage ${stage.order} ${t('terkunci', 'locked')}: ${cleanTitle}`
                          }
                          className={`m3-tactile flex min-h-[76px] w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${cardClasses}`}
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <span
                              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-extrabold ${badgeClasses}`}
                            >
                              {renderBadgeContent()}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-bold">
                                <span
                                  className={
                                    !unlocked
                                      ? 'text-on-surface-variant'
                                      : isCompleted
                                        ? 'text-success'
                                        : 'text-primary'
                                  }
                                >
                                  #{stage.order} · {modeLabel}
                                </span>
                                <span aria-hidden="true" className="text-outline">
                                  ·
                                </span>
                                <span className="font-mono tabular-nums text-on-surface-variant">
                                  +{stage.xpReward} XP
                                </span>
                                {isActiveFrontier && (
                                  <span className="font-bold text-primary">
                                    · {t('Aktif', 'Active')}
                                  </span>
                                )}
                              </div>

                              {/* line-clamp-2 prevents awkward 1-line ellipsis truncation */}
                              <p className="mt-0.5 line-clamp-2 font-display text-[15px] font-bold leading-snug text-on-surface">
                                {cleanTitle}
                              </p>

                              {!unlocked && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-on-surface-variant">
                                  {lockReason}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3].map((s) => (
                                <Star
                                  key={s}
                                  className={`h-3.5 w-3.5 ${
                                    record && s <= record.stars
                                      ? 'fill-amber-400 text-amber-500'
                                      : 'text-outline/60'
                                  }`}
                                  aria-hidden="true"
                                />
                              ))}
                            </div>
                            {unlocked && (
                              <span
                                className={`inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-bold ${
                                  isActiveFrontier
                                    ? 'text-primary'
                                    : isCompleted
                                      ? 'text-success'
                                      : 'text-on-surface-variant'
                                }`}
                              >
                                <span>
                                  {isBossStage
                                    ? isCompleted
                                      ? t('Ulang', 'Rematch')
                                      : t('Lawan', 'Fight')
                                    : isCompleted
                                      ? t('Ulangi', 'Replay')
                                      : t('Mulai', 'Start')}
                                </span>
                                <ChevronRight
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Sheet / Modal for Latihan Campuran (Mixed Drill) Detailed Settings */}
      {mixedSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mixed-drill-sheet-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMixedSheetOpen(false);
          }}
        >
          <div className="w-full max-w-md space-y-4 rounded-t-3xl border border-outline-variant bg-surface p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-primary">
                  {t('Daily Drill Adaptif', 'Adaptive Daily Drill')} ·{' '}
                  {unlockedLevel}
                  {dailyDrillDoneToday
                    ? t(' · Selesai hari ini', ' · Done today')
                    : ''}
                </p>
                <h3
                  id="mixed-drill-sheet-title"
                  className="mt-0.5 font-display text-lg font-extrabold text-on-surface"
                >
                  {t('Latihan Campuran Hari Ini', "Today's Mixed Practice")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setMixedSheetOpen(false);
                }}
                aria-label={t('Tutup', 'Close')}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-on-surface-variant">
              {t(
                'Otomatis menggabungkan kata sulitmu, kosakata, dan pola bunpou sesuai level. Tanpa batas nyawa.',
                'Automatically combines your difficult words, vocabulary, and grammar patterns for your level. Unlimited lives.',
              )}
            </p>

            <div className="space-y-2 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5">
              <p className="text-xs font-bold text-on-surface">
                {t('Jumlah Soal', 'Question Count')}
              </p>
              <div
                role="group"
                aria-label={t('Pilih jumlah soal', 'Choose question count')}
                className="grid grid-cols-2 gap-2"
              >
                {([5, 10] as const).map((cnt) => {
                  const active = dailyDrillCount === cnt;
                  return (
                    <button
                      key={cnt}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        vibrateTap();
                        setDailyDrillCount(cnt);
                      }}
                      className={`min-h-[44px] rounded-xl border font-mono text-xs font-bold transition-colors ${
                        active
                          ? 'border-primary bg-primary-container text-on-primary-container'
                          : 'border-outline-variant bg-surface text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {cnt} {t('Soal', 'Questions')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setMixedSheetOpen(false);
                  onStartDailyDrill(dailyDrillCount, dailyShuffleIndex);
                }}
                className="m3-tactile inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>
                  {dailyDrillDoneToday
                    ? t(
                        `Latihan Lagi (${dailyDrillCount} Soal)`,
                        `Practice Again (${dailyDrillCount} Qs)`,
                      )
                    : t(
                        `Mulai Latihan (${dailyDrillCount} Soal)`,
                        `Start Drill (${dailyDrillCount} Qs)`,
                      )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  const nextShuffle = dailyShuffleIndex + 1;
                  setDailyShuffleIndex(nextShuffle);
                  setMixedSheetOpen(false);
                  onStartDailyDrill(dailyDrillCount, nextShuffle);
                }}
                className="m3-tactile inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-outline bg-surface px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container"
              >
                <Shuffle className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{t('Acak Ulang', 'Shuffle')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
