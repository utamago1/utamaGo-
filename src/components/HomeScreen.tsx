import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ClipboardCheck,
  Flame,
  PenTool,
  Play,
  RotateCcw,
  Search,
  Trophy,
  Volume2,
} from 'lucide-react';
import {
  CHALLENGE_STAGES,
  type ChallengeStage,
} from '../data/challengeLevels';
import type { JlptLevel } from '../data/utamagoContent';
import { useLanguage } from '../i18n/LanguageContext';
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
  resolveAnkiCardSpeechText,
  speakJapanese,
} from '../utils/japaneseSpeech';
import type { ComputedTryOutReport } from '../utils/jlptReport';
import type {
  ArcadeRecords,
  CompletedLevelRecord,
  LearnerGender,
  LevelProgressInfo,
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
import type { JlptExamSessionPreference } from '../utils/jlptCountdown';
import type { AppTab } from './AppShellNav';
import { ChallengeArenaView } from './ChallengeArenaView';
import { HomeGreetingCard } from './HomeGreetingCard';
import { JlptCountdownCard } from './JlptCountdownCard';
import { WeaknessDetectorCard } from './WeaknessDetectorCard';

interface HomeScreenProps {
  levelProgress: LevelProgressInfo;
  completedLevels: Record<string, CompletedLevelRecord>;
  arcadeRecords?: ArcadeRecords;
  studiedAnkiCount: number;
  dueAnkiCount: number;
  totalAnkiDeckCount: number;
  completedPacketCount: number;
  latestReport: ComputedTryOutReport | null;
  activityLog: StudyActivityLog;
  targetLevel: JlptLevel;
  unlockedLevel: JlptLevel;
  arenaUnlockedLevel?: JlptLevel;
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
  onStartBlitz?: (level: JlptLevel) => void;
  onStartSurvival?: (level: JlptLevel) => void;
  jlptExamSession?: JlptExamSessionPreference;
  onChangeJlptExamSession?: (next: JlptExamSessionPreference) => void;
  onStartStage: (stage: ChallengeStage) => void;
  onNavigate: (tab: Exclude<AppTab, 'home'>) => void;
}

export function HomeScreen({
  levelProgress,
  completedLevels,
  arcadeRecords,
  dueAnkiCount,
  completedPacketCount,
  latestReport,
  activityLog,
  targetLevel,
  unlockedLevel,
  arenaUnlockedLevel,
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
  onStartBlitz,
  onStartSurvival,
  jlptExamSession = 'auto',
  onChangeJlptExamSession,
  onStartStage,
  onNavigate,
}: HomeScreenProps) {
  const { lang, t } = useLanguage();
  const [showDifficultView, setShowDifficultView] = useState(false);
  const speechSupported = useMemo(() => isJapaneseSpeechSupported(), []);

  const completedStagesCount = useMemo(
    () => CHALLENGE_STAGES.filter((s) => Boolean(completedLevels[s.id])).length,
    [completedLevels],
  );

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

  if (showChallengesView) {
    return (
      <ChallengeArenaView
        completedLevels={completedLevels}
        arcadeRecords={arcadeRecords}
        unlockedLevel={unlockedLevel}
        arenaUnlockedLevel={arenaUnlockedLevel}
        dailyDrillDoneToday={dailyDrillDoneToday}
        onClose={onCloseChallenges}
        onStartStage={onStartStage}
        onStartDailyDrill={onStartDailyDrill}
        onStartBlitz={onStartBlitz}
        onStartSurvival={onStartSurvival}
      />
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
              <span>{t('Kembali', 'Back')}</span>
            </button>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-on-surface">
                {t('Kata Sulit', 'Difficult Words')}
              </h2>
              <p className="text-[13px] text-on-surface-variant">
                <span className="font-mono tabular-nums">
                  {difficultCards.length}
                </span>{' '}
                {t('kartu perlu perhatian ekstra', 'cards need extra review')}
              </p>
            </div>
          </div>
        </div>

        {difficultCards.length === 0 ? (
          <section
            aria-label={t('Daftar Kata Sulit Kosong', 'Empty Difficult Words List')}
            className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 text-center"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container text-primary">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-3 font-display text-base font-bold text-on-surface">
              {t('Belum ada kata sulit', 'No difficult words yet')}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-on-surface-variant">
              {t(
                'Kartu yang kamu tandai "Ulangi" saat latihan Anki atau kamu tandai di Kamus akan otomatis terkumpul di sini untuk sesi drill khusus.',
                'Cards marked "Again" during Anki review or bookmarked in the Dictionary are automatically collected here for focused drill sessions.',
              )}
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
                {t('Mulai Latihan Anki', 'Start Anki Practice')}
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
                <span>{t('Cari & Tandai di Kamus', 'Search & Bookmark in Dictionary')}</span>
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
                {t(
                  `Mulai Drill Kata Sulit (${Math.min(difficultCards.length, 15)} kartu)`,
                  `Start Difficult Words Drill (${Math.min(difficultCards.length, 15)} cards)`,
                )}
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
                        <span className="text-[13px] text-on-surface-variant">
                          {card.furigana}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-on-surface-variant break-words">
                      {card.meaning}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      <span className="font-mono font-semibold text-primary">
                        {card.jlptLevel ?? 'JLPT'}
                      </span>{' '}
                      · {t('diulang', 'repeated')}{' '}
                      <span className="font-mono tabular-nums">{lapses}x</span>
                    </p>
                  </div>

                  {speechSupported && (
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        speakJapanese(resolveAnkiCardSpeechText(card));
                      }}
                      aria-label={t(
                        `Dengarkan pelafalan ${card.word}`,
                        `Listen to pronunciation of ${card.word}`,
                      )}
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
              {t('Buka Deck Anki Reguler', 'Open Regular Anki Decks')}
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
      <section aria-label={t('Aksi Utama Hari Ini', "Today's Main Action")} className="w-full min-w-0">
        {dailyGoal.isTargetReached ? (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
            <h3 className="font-display text-base font-extrabold text-on-surface">
              {t('Target hari ini tercapai 🎉', 'Daily goal reached 🎉')}
            </h3>
            <p className="mt-1 text-[13px] leading-snug text-[#4b4b53] dark:text-[#b4b4c0]">
              {t('Kamu sudah menyelesaikan', 'You completed')}{' '}
              <span className="font-mono font-semibold tabular-nums text-on-surface">
                {dailyGoal.doneCards}
              </span>{' '}
              {t('kartu hari ini. Mau tambah latihan?', 'cards today. Want bonus review?')}
            </p>
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onNavigate('anki');
              }}
              className="m3-tactile mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-outline bg-surface-container px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-high"
            >
              {t('Lanjut bonus', 'Continue bonus')}
            </button>
          </div>
        ) : dueAnkiCount === 0 ? (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
            <h3 className="font-display text-base font-extrabold text-on-surface">
              {t('Tidak ada kartu hari ini', 'No due cards today')}
            </h3>
            <p className="mt-1 text-[13px] leading-snug text-[#4b4b53] dark:text-[#b4b4c0]">
              {t(
                'Jadwal ulang Anki sudah kosong. Lanjut baca materi agar hafalan makin kuat.',
                'Your Anki review queue is clear. Keep studying grammar notes to reinforce memory.',
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onNavigate('learn');
              }}
              className="m3-tactile mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-outline bg-surface-container px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-high"
            >
              {t('Buka Materi Belajar', 'Open Study Notes')}
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
              {t('Mulai Anki', 'Start Anki')} ·{' '}
              <span className="font-mono tabular-nums">{dueAnkiCount}</span>{' '}
              {t('kartu', 'cards')}
            </span>
          </button>
        )}
      </section>

      {/* 4. Baris Target Harian (satuan kartu) + Streak 7 Hari (Sen-Min) */}
      <section
        aria-label={t('Target Harian dan Streak Minggu Ini', 'Daily Goal and Weekly Streak')}
        className="w-full min-w-0 space-y-3.5 rounded-2xl border border-outline-variant bg-surface-container-low p-4"
      >
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold text-on-surface">
              {t('Target harian', 'Daily goal')}
            </span>
            <span className="shrink-0 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
              <span className="font-mono font-bold tabular-nums text-primary">
                {dailyGoal.doneCards}/{dailyGoal.goalCards}
              </span>{' '}
              {t('kartu', 'cards')}
            </span>
          </div>

          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high"
            role="progressbar"
            aria-valuenow={dailyGoal.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('Progres target kartu harian', 'Daily card goal progress')}
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
              <span>{t('Streak minggu ini', 'Weekly streak')}</span>
            </span>
            <span className="shrink-0 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
              <span className="font-mono font-bold tabular-nums text-on-surface">
                {streakDays}
              </span>{' '}
              {t('hari', 'days')}
            </span>
          </div>

          <div
            className="mt-3 grid grid-cols-7 gap-1"
            role="list"
            aria-label={t('Aktivitas belajar Senin sampai Minggu', 'Study activity Monday to Sunday')}
          >
            {weekDots.map((dot, dotIndex) => {
              const enDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              const displayDay =
                lang === 'en' ? (enDays[dotIndex] ?? dot.label) : dot.label;
              return (
              <div
                key={dot.dateKey}
                role="listitem"
                aria-label={`${displayDay}: ${dot.active ? t('Aktif belajar', 'Active') : t('Belum belajar', 'Not yet')}`}
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
                  {displayDay}
                </span>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4b. Kartu Hitung Mundur Jadwal Ujian JLPT */}
      <JlptCountdownCard
        targetLevel={targetLevel}
        dailyMinutes={dailyMinutes}
        sessionPreference={jlptExamSession}
        onChangeSessionPreference={(next) => onChangeJlptExamSession?.(next)}
      />

      {/* 5. Kartu "Lanjutkan belajar" + Akses Cepat Kamus Kosakata */}
      <section aria-label={t('Lanjutkan Belajar dan Kamus', 'Continue Learning and Dictionary')} className="w-full min-w-0 space-y-3">
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
              {continueLearning.isResume
                ? t('Lanjutkan belajar', 'Continue learning')
                : t(
                    continueLearning.eyebrow,
                    `${unlockedLevel} Recommendation`,
                  )}
            </p>
            <p className="mt-0.5 font-display text-[15px] font-bold leading-snug text-on-surface break-words">
              {continueLearning.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-on-surface-variant break-words">
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
                {t('Kamus Kosakata N5–N1', 'Vocabulary Dictionary N5–N1')}
              </p>
              <p className="truncate text-xs text-on-surface-variant">
                {t(
                  'Cari cepat Kanji, Kana, Romaji, atau arti',
                  'Search Kanji, Kana, Romaji, or meaning',
                )}
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
                  {t('Studio Tulis Kanji & Kana', 'Kanji & Kana Writing Studio')}
                </p>
                <p className="truncate text-xs text-on-surface-variant">
                  {t(
                    'Latih goresan + baca On/Kun & urutan coretan',
                    "Practice strokes + On/Kun readings & stroke order",
                  )}
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
      <section aria-label={t('Menu Belajar', 'Study Menu')} className="w-full min-w-0">
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
                {t('Arena Tantangan', 'Challenge Arena')}
              </p>
              <p className="mt-1 text-[13px] leading-snug text-[#4b4b53] dark:text-[#b4b4c0] break-words">
                <span className="font-mono tabular-nums">
                  {completedStagesCount}/{CHALLENGE_STAGES.length}
                </span>{' '}
                {t('stage · Blitz, Survival & Boss', 'stages · Blitz, Survival & Boss')}
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
                {t('Materi Belajar', 'Study Notes')}
              </p>
              <p className="mt-1 text-[13px] leading-snug text-[#4b4b53] dark:text-[#b4b4c0] break-words">
                {t('Bunpou & panduan JLPT', 'Grammar & JLPT guide')}
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
                    {t('Skor terakhir', 'Latest score')}{' '}
                    <span className="font-mono tabular-nums">
                      {latestReport.average}%
                    </span>
                  </>
                ) : completedPacketCount > 0 ? (
                  <>
                    <span className="font-mono tabular-nums">
                      {completedPacketCount}/3
                    </span>{' '}
                    {t('bagian selesai', 'parts done')}
                  </>
                ) : (
                  t('Simulasi N3, N2 & N1', 'N3, N2 & N1 mock exams')
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
                {t('Kata Sulit', 'Difficult Words')}
              </p>
              <p className="mt-1 text-[13px] leading-snug text-[#4b4b53] dark:text-[#b4b4c0] break-words">
                {difficultCards.length > 0 ? (
                  <>
                    <span className="font-mono tabular-nums">
                      {difficultCards.length}
                    </span>{' '}
                    {t('perlu diulang', 'to review')}
                  </>
                ) : (
                  t('Belum ada kata sulit', 'No difficult words yet')
                )}
              </p>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
