import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ClipboardCheck,
  Flame,
  Lock,
  PenTool,
  Play,
  RotateCcw,
  Search,
  Shuffle,
  Star,
  Trophy,
  Volume2,
} from 'lucide-react';
import {
  CHALLENGE_STAGES,
  type ChallengeStage,
} from '../data/challengeLevels';
import type { JlptLevel } from '../data/utamagoContent';
import type { AnkiCard } from '../utils/ankiParser';
import type { AnkiSrsMap } from '../utils/ankiSrs';
import type { BunpouN2Item } from '../utils/bunpouN2Parser';
import { vibrateTap } from '../utils/haptics';
import {
  getCurrentWeekStreakDots,
  getDailyCardGoalSummary,
  getDifficultAnkiCards,
  getShortRankName,
  resolveContinueLearning,
} from '../utils/homeSummary';
import {
  isJapaneseSpeechSupported,
  speakJapanese,
} from '../utils/japaneseSpeech';
import type { ComputedTryOutReport } from '../utils/jlptReport';
import {
  getTotalStarsEarned,
  isJlptLevelUnlocked,
  isStageUnlocked,
  type CompletedLevelRecord,
  type LearnerGender,
  type LevelProgressInfo,
} from '../utils/levelProgression';
import {
  getDailyStreak,
  getLocalDateKey,
  type StudyActivityLog,
} from '../utils/studyAnalytics';
import type { EquivalentJlptEstimate } from '../utils/tryOutAnalytics';
import type {
  JlptWeaknessReport,
  WeaknessActionTarget,
} from '../utils/weaknessDetector';
import type { AppTab } from './AppShellNav';
import { HomeGreetingCard } from './HomeGreetingCard';
import { WeaknessDetectorCard } from './WeaknessDetectorCard';

interface HomeScreenProps {
  levelProgress: LevelProgressInfo;
  completedLevels: Record<string, CompletedLevelRecord>;
  studiedAnkiCount: number;
  dueAnkiCount: number;
  totalAnkiDeckCount: number;
  completedPacketCount: number;
  latestReport: ComputedTryOutReport | null;
  activityLog: StudyActivityLog;
  targetLevel: JlptLevel;
  unlockedLevel: JlptLevel;
  equivalentEstimate: EquivalentJlptEstimate;
  dailyMinutes: number;
  learnerName?: string;
  gender?: LearnerGender;
  isHomeLoading?: boolean;
  hasHomeError?: boolean;
  justCompletedSession?: boolean;
  unlockedAnkiCards?: AnkiCard[];
  ankiSrs?: AnkiSrsMap;
  againIds?: string[];
  bunpouN5Items?: BunpouN2Item[];
  bunpouN4Items?: BunpouN2Item[];
  bunpouN3Items?: BunpouN2Item[];
  bunpouN2Items?: BunpouN2Item[];
  bunpouN1Items?: BunpouN2Item[];
  showChallengesView: boolean;
  dailyDrillDoneToday?: boolean;
  weaknessReport?: JlptWeaknessReport;
  onExecuteWeaknessAction?: (action: WeaknessActionTarget) => void;
  onOpenWritingStudio?: () => void;
  onOpenChallenges: () => void;
  onCloseChallenges: () => void;
  onOpenTryOut: () => void;
  onOpenDictionary: () => void;
  onStartDifficultDrill: () => void;
  onStartDailyDrill: (count: 5 | 10, shuffleIndex: number) => void;
  onStartStage: (stage: ChallengeStage) => void;
  onNavigate: (tab: Exclude<AppTab, 'home'>) => void;
}

export function HomeScreen({
  levelProgress,
  completedLevels,
  dueAnkiCount,
  completedPacketCount,
  latestReport,
  activityLog,
  unlockedLevel,
  dailyMinutes,
  learnerName,
  gender = 'cowok',
  isHomeLoading = false,
  hasHomeError = false,
  justCompletedSession = false,
  unlockedAnkiCards = [],
  ankiSrs = {},
  againIds = [],
  bunpouN5Items = [],
  bunpouN4Items = [],
  bunpouN3Items = [],
  bunpouN2Items = [],
  bunpouN1Items = [],
  showChallengesView,
  dailyDrillDoneToday = false,
  weaknessReport,
  onExecuteWeaknessAction,
  onOpenWritingStudio,
  onOpenChallenges,
  onCloseChallenges,
  onOpenTryOut,
  onOpenDictionary,
  onStartDifficultDrill,
  onStartDailyDrill,
  onStartStage,
  onNavigate,
}: HomeScreenProps) {
  const [showDifficultView, setShowDifficultView] = useState(false);
  const [dailyDrillCount, setDailyDrillCount] = useState<5 | 10>(5);
  const [dailyShuffleIndex, setDailyShuffleIndex] = useState(0);
  const speechSupported = useMemo(() => isJapaneseSpeechSupported(), []);

  const stageIds = useMemo(() => CHALLENGE_STAGES.map((s) => s.id), []);
  const totalStars = getTotalStarsEarned(completedLevels);
  const maxStars = CHALLENGE_STAGES.length * 3;
  const completedStagesCount = Object.keys(completedLevels).length;

  const isChallengeStageOpen = (stage: ChallengeStage, idx: number) =>
    isStageUnlocked(idx, stageIds, completedLevels) &&
    isJlptLevelUnlocked(stage.jlptLevel, unlockedLevel);

  const nextStage =
    CHALLENGE_STAGES.find((s, idx) => {
      return isChallengeStageOpen(s, idx) && !completedLevels[s.id];
    }) ??
    [...CHALLENGE_STAGES]
      .reverse()
      .find((s, revIdx) =>
        isChallengeStageOpen(s, CHALLENGE_STAGES.length - 1 - revIdx),
      ) ??
    CHALLENGE_STAGES[0];

  const todayKey = getLocalDateKey();
  const dailyGoal = useMemo(
    () => getDailyCardGoalSummary(activityLog, dailyMinutes, todayKey),
    [activityLog, dailyMinutes, todayKey],
  );
  const streakDays = useMemo(
    () => getDailyStreak(activityLog, todayKey),
    [activityLog, todayKey],
  );
  const weekDots = useMemo(
    () => getCurrentWeekStreakDots(activityLog, todayKey),
    [activityLog, todayKey],
  );
  const shortRankName = getShortRankName(levelProgress.rank.title);

  const continueLearning = useMemo(
    () =>
      resolveContinueLearning({
        reviewedLessonIds: activityLog.reviewedLessonIds,
        unlockedLevel,
        bunpouN5Items,
        bunpouN4Items,
        bunpouN3Items,
        bunpouN2Items,
        bunpouN1Items,
      }),
    [
      activityLog.reviewedLessonIds,
      unlockedLevel,
      bunpouN5Items,
      bunpouN4Items,
      bunpouN3Items,
      bunpouN2Items,
      bunpouN1Items,
    ],
  );

  const difficultCards = useMemo(
    () => getDifficultAnkiCards(unlockedAnkiCards, ankiSrs, againIds),
    [unlockedAnkiCards, ankiSrs, againIds],
  );

  const chapters = useMemo(() => {
    const groups: Array<{
      chapter: string;
      stages: Array<{ stage: ChallengeStage; index: number }>;
    }> = [];
    CHALLENGE_STAGES.forEach((stage, index) => {
      const existing = groups.find((c) => c.chapter === stage.chapter);
      if (existing) {
        existing.stages.push({ stage, index });
      } else {
        groups.push({ chapter: stage.chapter, stages: [{ stage, index }] });
      }
    });
    return groups;
  }, []);

  if (showChallengesView) {
    return (
      <div className="mx-auto w-full max-w-[480px] space-y-5 px-4 lg:max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onCloseChallenges();
              }}
              className="m3-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline bg-surface-container-low px-3.5 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Kembali</span>
            </button>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-on-surface sm:text-xl">
                Tantangan Level JLPT
              </h2>
              <p className="text-[13px] text-[#4b4b53]">
                <span className="font-mono tabular-nums">
                  {completedStagesCount}/{CHALLENGE_STAGES.length}
                </span>{' '}
                stage ·{' '}
                <span className="font-mono tabular-nums">
                  {totalStars}/{maxStars}
                </span>{' '}
                bintang
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onStartStage(nextStage);
            }}
            className="m3-tactile inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary-hover"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>Mulai Level {nextStage.order}</span>
          </button>
        </div>

        {/* Daily Drill Adaptif Card */}
        <section
          aria-label="Daily Drill Hari Ini"
          className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-primary">
                Daily Drill Adaptif · Level {unlockedLevel}
                {dailyDrillDoneToday ? (
                  <span className="text-success"> · Selesai hari ini</span>
                ) : null}
              </p>
              <h3 className="mt-1 font-display text-base font-extrabold text-on-surface sm:text-lg">
                Latihan Campuran Hari Ini
              </h3>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#4b4b53]">
                Otomatis menggabungkan kata sulitmu, kosakata, dan pola bunpou
                sesuai level. Tanpa batas nyawa.
              </p>
            </div>

            <div
              role="group"
              aria-label="Pilih jumlah soal Daily Drill"
              className="inline-flex shrink-0 items-center rounded-xl border border-outline-variant bg-surface p-1"
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
                    className={`min-h-[36px] rounded-lg px-3 py-1 font-mono text-xs font-bold transition-colors ${
                      active
                        ? 'bg-primary text-on-primary'
                        : 'text-[#4b4b53] hover:text-on-surface'
                    }`}
                  >
                    {cnt} Soal
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onStartDailyDrill(dailyDrillCount, dailyShuffleIndex);
              }}
              className="m3-tactile inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-on-primary hover:bg-primary-hover"
            >
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>
                {dailyDrillDoneToday
                  ? `Latihan Lagi (${dailyDrillCount} Soal)`
                  : `Mulai Daily Drill (${dailyDrillCount} Soal)`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                vibrateTap();
                const nextShuffle = dailyShuffleIndex + 1;
                setDailyShuffleIndex(nextShuffle);
                onStartDailyDrill(dailyDrillCount, nextShuffle);
              }}
              className="m3-tactile inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-outline bg-surface px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container"
            >
              <Shuffle className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Acak Ulang</span>
            </button>
          </div>
        </section>

        <section aria-label="Daftar Level Tantangan" className="space-y-6">
          {chapters.map((group) => (
            <div key={group.chapter} className="space-y-2.5">
              <h3 className="font-display text-xs font-extrabold tracking-wider text-[#4b4b53]">
                {group.chapter}
              </h3>

              <div className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
                {group.stages.map(({ stage, index }) => {
                  const sequentialUnlocked = isStageUnlocked(
                    index,
                    stageIds,
                    completedLevels,
                  );
                  const levelUnlocked = isJlptLevelUnlocked(
                    stage.jlptLevel,
                    unlockedLevel,
                  );
                  const unlocked = sequentialUnlocked && levelUnlocked;
                  const record = completedLevels[stage.id];
                  const isNextFrontier = unlocked && !record;

                  const lockReason = !levelUnlocked
                    ? `Butuh level minimal ${stage.jlptLevel} (atur di Profil)`
                    : `Selesaikan Level ${stage.order - 1} dahulu`;

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
                          ? `Main Level ${stage.order}: ${stage.title}`
                          : `Level ${stage.order} terkunci: ${stage.title}`
                      }
                      className={`m3-tactile flex min-h-[76px] w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors ${
                        !unlocked
                          ? 'cursor-not-allowed bg-surface-container/40 opacity-65'
                          : isNextFrontier
                            ? 'bg-primary-container/20 hover:bg-primary-container/30'
                            : 'hover:bg-surface-container/60'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-extrabold ${
                            !unlocked
                              ? 'bg-surface-container-high text-on-surface-variant'
                              : record
                                ? 'bg-success text-white'
                                : isNextFrontier
                                  ? 'bg-primary text-on-primary'
                                  : 'bg-surface-container text-on-surface'
                          }`}
                        >
                          {!unlocked ? (
                            <Lock className="h-4 w-4" aria-hidden="true" />
                          ) : record ? (
                            <Check className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            stage.order
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold">
                            <span
                              className={
                                unlocked
                                  ? 'text-primary'
                                  : 'text-on-surface-variant'
                              }
                            >
                              Level {stage.order} · {stage.jlptLevel}
                            </span>
                            <span aria-hidden="true" className="text-outline">
                              ·
                            </span>
                            <span className="font-mono tabular-nums text-[#4b4b53] dark:text-[#b4b4c0]">
                              +{stage.xpReward} XP
                            </span>
                          </div>
                          <p className="mt-0.5 truncate font-display text-[15px] font-bold text-on-surface">
                            {stage.title}
                          </p>
                          <p className="mt-0.5 truncate text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
                            {unlocked ? stage.subtitle : lockReason}
                          </p>
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
                                  : 'text-outline'
                              }`}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                        {unlocked && (
                          <span
                            className={`whitespace-nowrap text-xs font-bold ${
                              isNextFrontier
                                ? 'text-primary'
                                : 'text-[#4b4b53] dark:text-[#b4b4c0]'
                            }`}
                          >
                            {record ? 'Ulangi' : 'Mulai'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>
    );
  }

  if (showDifficultView) {
    return (
      <div className="mx-auto w-full max-w-[480px] space-y-4 px-4">
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant pb-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                setShowDifficultView(false);
              }}
              className="m3-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline bg-surface-container-low px-3.5 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Kembali</span>
            </button>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-on-surface">
                Kata Sulit
              </h2>
              <p className="text-[13px] text-[#4b4b53]">
                <span className="font-mono tabular-nums">
                  {difficultCards.length}
                </span>{' '}
                kartu perlu perhatian ekstra
              </p>
            </div>
          </div>
        </div>

        {difficultCards.length === 0 ? (
          <section
            aria-label="Daftar Kata Sulit Kosong"
            className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 text-center"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container text-primary">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-3 font-display text-base font-bold text-on-surface">
              Belum ada kata sulit
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#4b4b53]">
              Kartu yang kamu tandai &ldquo;Ulangi&rdquo; saat latihan Anki atau
              kamu tandai di Kamus akan otomatis terkumpul di sini untuk sesi
              drill khusus.
            </p>
            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setShowDifficultView(false);
                  onNavigate('anki');
                }}
                className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover"
              >
                Mulai Latihan Anki
              </button>
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  onOpenDictionary();
                }}
                className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-outline bg-surface px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container"
              >
                <Search className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Cari &amp; Tandai di Kamus</span>
              </button>
            </div>
          </section>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onStartDifficultDrill();
              }}
              className="m3-tactile flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              <span>
                Mulai Drill Kata Sulit ({Math.min(difficultCards.length, 15)}{' '}
                kartu)
              </span>
            </button>

            <div className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
              {difficultCards.slice(0, 30).map(({ card, lapses }) => (
                <div
                  key={card.id}
                  className="flex items-start justify-between gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-display text-base font-bold text-on-surface break-words">
                        {card.word}
                      </span>
                      {card.furigana && card.furigana !== card.word && (
                        <span className="text-[13px] text-[#4b4b53]">
                          {card.furigana}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-[#4b4b53] break-words">
                      {card.meaning}
                    </p>
                    <p className="mt-1 text-xs text-[#4b4b53]">
                      <span className="font-mono font-semibold text-primary">
                        {card.jlptLevel ?? 'JLPT'}
                      </span>{' '}
                      · diulang{' '}
                      <span className="font-mono tabular-nums">{lapses}x</span>
                    </p>
                  </div>

                  {speechSupported && (
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        speakJapanese(card.word || card.furigana || '');
                      }}
                      aria-label={`Dengarkan pelafalan ${card.word}`}
                      className="m3-tactile inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary hover:opacity-90"
                    >
                      <Volume2 className="h-4.5 w-4.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                vibrateTap();
                setShowDifficultView(false);
                onNavigate('anki');
              }}
              className="m3-tactile flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-outline bg-surface-container-low px-5 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container"
            >
              Buka Deck Anki Reguler
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[480px] space-y-4 px-4">
      {/* 2. Kartu Sapaan Ringkas + Maskot Interaktif + Bubble Dialog + Progres XP */}
      <HomeGreetingCard
        levelProgress={levelProgress}
        shortRankName={shortRankName}
        learnerName={learnerName}
        gender={gender}
        activityLog={activityLog}
        dailyDoneCards={dailyGoal.doneCards}
        isTargetReached={dailyGoal.isTargetReached}
        dueAnkiCount={dueAnkiCount}
        streakDays={streakDays}
        isLoading={isHomeLoading}
        hasError={hasHomeError}
        justCompletedSession={justCompletedSession}
      />

      {/* 3. CTA Utama (satu-satunya tombol besar / kartu perayaan / 0 kartu) */}
      <section aria-label="Aksi Utama Hari Ini" className="w-full min-w-0">
        {dailyGoal.isTargetReached ? (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
            <h3 className="font-display text-base font-extrabold text-on-surface">
              Target hari ini tercapai 🎉
            </h3>
            <p className="mt-1 text-[13px] leading-snug text-[#4b4b53] dark:text-[#b4b4c0]">
              Kamu sudah menyelesaikan{' '}
              <span className="font-mono font-semibold tabular-nums text-on-surface">
                {dailyGoal.doneCards}
              </span>{' '}
              kartu hari ini. Mau tambah latihan?
            </p>
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onNavigate('anki');
              }}
              className="m3-tactile mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-outline bg-surface-container px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-high"
            >
              Lanjut bonus
            </button>
          </div>
        ) : dueAnkiCount === 0 ? (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
            <h3 className="font-display text-base font-extrabold text-on-surface">
              Tidak ada kartu hari ini
            </h3>
            <p className="mt-1 text-[13px] leading-snug text-[#4b4b53] dark:text-[#b4b4c0]">
              Jadwal ulang Anki sudah kosong. Lanjut baca materi agar hafalan
              makin kuat.
            </p>
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onNavigate('learn');
              }}
              className="m3-tactile mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-outline bg-surface-container px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-high"
            >
              Buka Materi Belajar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onNavigate('anki');
            }}
            className="m3-tactile flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-[15px] font-bold text-on-primary shadow-xs hover:bg-primary-hover"
          >
            <Play className="h-4 w-4 shrink-0 fill-current" aria-hidden="true" />
            <span className="truncate">
              Mulai Anki ·{' '}
              <span className="font-mono tabular-nums">{dueAnkiCount}</span>{' '}
              kartu
            </span>
          </button>
        )}
      </section>

      {/* 4. Baris Target Harian (satuan kartu) + Streak 7 Hari (Sen-Min) */}
      <section
        aria-label="Target Harian dan Streak Minggu Ini"
        className="w-full min-w-0 space-y-3.5 rounded-2xl border border-outline-variant bg-surface-container-low p-4"
      >
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold text-on-surface">
              Target harian
            </span>
            <span className="shrink-0 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
              <span className="font-mono font-bold tabular-nums text-primary">
                {dailyGoal.doneCards}/{dailyGoal.goalCards}
              </span>{' '}
              kartu
            </span>
          </div>

          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high"
            role="progressbar"
            aria-valuenow={dailyGoal.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progres target kartu harian"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${dailyGoal.percent}%` }}
            />
          </div>
        </div>

        <div className="border-t border-outline-variant pt-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-on-surface">
              <Flame
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span>Streak minggu ini</span>
            </span>
            <span className="shrink-0 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
              <span className="font-mono font-bold tabular-nums text-on-surface">
                {streakDays}
              </span>{' '}
              hari
            </span>
          </div>

          <div
            className="mt-3 grid grid-cols-7 gap-1"
            role="list"
            aria-label="Aktivitas belajar Senin sampai Minggu"
          >
            {weekDots.map((dot) => (
              <div
                key={dot.dateKey}
                role="listitem"
                aria-label={`${dot.label}: ${dot.active ? 'Aktif belajar' : 'Belum belajar'}`}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                    dot.active
                      ? 'bg-primary text-on-primary'
                      : dot.isToday
                        ? 'border-2 border-primary bg-primary-container/40'
                        : dot.isFuture
                          ? 'border border-outline-variant bg-transparent'
                          : 'bg-surface-container-high'
                  }`}
                >
                  {dot.active && (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>
                <span
                  className={`text-xs leading-none ${
                    dot.isToday
                      ? 'font-bold text-primary'
                      : dot.active
                        ? 'font-semibold text-on-surface'
                        : 'text-[#4b4b53] dark:text-[#b4b4c0]'
                  }`}
                >
                  {dot.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Kartu "Lanjutkan belajar" + Akses Cepat Kamus Kosakata */}
      <section aria-label="Lanjutkan Belajar dan Kamus" className="w-full min-w-0 space-y-3">
        <button
          type="button"
          onClick={() => {
            vibrateTap();
            onNavigate('learn');
          }}
          className="m3-tactile flex min-h-[72px] w-full min-w-0 items-center gap-3.5 rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary/50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-primary">
              {continueLearning.eyebrow}
            </p>
            <p className="mt-0.5 font-display text-[15px] font-bold leading-snug text-on-surface break-words">
              {continueLearning.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#4b4b53] break-words">
              {continueLearning.subtitle}
            </p>
          </div>
        </button>

        <div className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onOpenDictionary();
            }}
            className="m3-tactile flex min-h-[56px] w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container/60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
              <Search className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold text-on-surface">
                Kamus Kosakata N5–N1
              </p>
              <p className="truncate text-xs text-[#4b4b53]">
                Cari cepat Kanji, Kana, Romaji, atau arti
              </p>
            </div>
          </button>

          {onOpenWritingStudio && (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onOpenWritingStudio();
              }}
              className="m3-tactile flex min-h-[56px] w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container/60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
                <PenTool className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold text-on-surface">
                  Studio Tulis Kanji &amp; Kana
                </p>
                <p className="truncate text-xs text-[#4b4b53]">
                  Latih coretan jari/mouse + panduan kotak genkouyoushi
                </p>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* 5b. Detektor Kelemahan JLPT & Rekomendasi Latihan Otomatis */}
      {weaknessReport && onExecuteWeaknessAction && (
        <WeaknessDetectorCard
          report={weaknessReport}
          onExecuteAction={onExecuteWeaknessAction}
        />
      )}

      {/* 6. Grid 2x2: Tantangan Level, Materi Belajar, Try Out JLPT, Kata Sulit */}
      <section aria-label="Menu Belajar" className="w-full min-w-0">
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onOpenChallenges();
            }}
            className="m3-tactile flex min-h-[116px] w-full min-w-0 flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>

            <div className="mt-3 min-w-0">
              <p className="font-display text-[15px] font-bold leading-snug text-on-surface break-words">
                Tantangan Level
              </p>
              <p className="mt-1 text-[13px] leading-snug text-[#4b4b53] dark:text-[#b4b4c0] break-words">
                <span className="font-mono tabular-nums">
                  {completedStagesCount}/{CHALLENGE_STAGES.length}
                </span>{' '}
                stage selesai
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onNavigate('learn');
            }}
            className="m3-tactile flex min-h-[116px] w-full min-w-0 flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>

            <div className="mt-3 min-w-0">
              <p className="font-display text-[15px] font-bold leading-snug text-on-surface break-words">
                Materi Belajar
              </p>
              <p className="mt-1 text-[13px] leading-snug text-[#4b4b53] dark:text-[#b4b4c0] break-words">
                Bunpou &amp; panduan JLPT
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onOpenTryOut();
            }}
            className="m3-tactile flex min-h-[116px] w-full min-w-0 flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            </span>

            <div className="mt-3 min-w-0">
              <p className="font-display text-[15px] font-bold leading-snug text-on-surface break-words">
                Try Out JLPT
              </p>
              <p className="mt-1 text-[13px] leading-snug text-[#4b4b53] dark:text-[#b4b4c0] break-words">
                {latestReport ? (
                  <>
                    Skor terakhir{' '}
                    <span className="font-mono tabular-nums">
                      {latestReport.average}%
                    </span>
                  </>
                ) : completedPacketCount > 0 ? (
                  <>
                    <span className="font-mono tabular-nums">
                      {completedPacketCount}/3
                    </span>{' '}
                    bagian selesai
                  </>
                ) : (
                  'Simulasi N2 & N1'
                )}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              setShowDifficultView(true);
            }}
            className="m3-tactile flex min-h-[116px] w-full min-w-0 flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </span>

            <div className="mt-3 min-w-0">
              <p className="font-display text-[15px] font-bold leading-snug text-on-surface break-words">
                Kata Sulit
              </p>
              <p className="mt-1 text-[13px] leading-snug text-[#4b4b53] dark:text-[#b4b4c0] break-words">
                {difficultCards.length > 0 ? (
                  <>
                    <span className="font-mono tabular-nums">
                      {difficultCards.length}
                    </span>{' '}
                    perlu diulang
                  </>
                ) : (
                  'Belum ada kata sulit'
                )}
              </p>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
