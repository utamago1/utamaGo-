import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { vibrateTap } from '../utils/haptics';
import type { LearnerGender, LevelProgressInfo } from '../utils/levelProgression';
import {
  MASCOT_ERROR_OR_EMPTY_LINES,
  MASCOT_EXPRESSION_LABELS,
  MASCOT_EXPRESSION_ORDER,
  MASCOT_LOADING_LINES,
  MASCOT_SLEEPY_IDLE_LINES,
  MASCOT_TAP_ENCOURAGEMENTS,
  MASCOT_WAKE_UP_LINES,
  type MascotExpression,
} from '../utils/mascotAssets';
import {
  computeDaysSinceLastStudy,
  getMoodPreviewVariants,
  pickNextMascotLine,
  resolveMascotDialogState,
} from '../utils/mascotDialog';
import { getLocalDateKey, type StudyActivityLog } from '../utils/studyAnalytics';
import { MascotAvatar } from './MascotAvatar';

export interface HomeGreetingCardProps {
  levelProgress: LevelProgressInfo;
  shortRankName: string;
  learnerName?: string;
  /** Preferensi gender karakter maskot (default: 'cowok') */
  gender?: LearnerGender;
  activityLog: StudyActivityLog;
  dailyDoneCards: number;
  isTargetReached: boolean;
  dueAnkiCount: number;
  streakDays: number;
  /** Sedang memuat data Beranda (ekspresi mikir_loading) */
  isLoading?: boolean;
  /** Terjadi error pengambilan data atau kartu gagal dimuat (ekspresi bingung_sedih) */
  hasError?: boolean;
  /** Pengguna baru menyelesaikan sesi Anki / tantangan level (ekspresi happy) */
  justCompletedSession?: boolean;
  /** Durasi inaktivitas sebelum maskot mengantuk (default 45 detik) */
  inactivitySleepMs?: number;
  /** Optional custom fallback image URL */
  src?: string;
  /** Optional hour override (0-23) for testing time-of-day dialog lines */
  hourOverride?: number;
}

const TAP_COOLDOWN_MS = 280;
const TAP_REACTION_DURATION_MS = 1800;
const WAKE_REACTION_DURATION_MS = 1600;
const DEFAULT_INACTIVITY_SLEEP_MS = 45_000;

const SESSION_COMPLETE_LINES: readonly string[] = [
  'Yatta! Sesi belajarmu selesai! Keren banget!',
  'Otsukaresama! Progres belajarmu makin mantap!',
  'Mantap! Satu langkah lebih dekat lulus JLPT!',
];

function getExpressionBadgeTone(expression: MascotExpression): string {
  switch (expression) {
    case 'happy':
      return 'text-success';
    case 'tap_kaget':
      return 'text-primary';
    case 'mikir_loading':
      return 'text-sky-700 dark:text-sky-400';
    case 'bingung_sedih':
      return 'text-indigo-700 dark:text-indigo-400';
    case 'ngantuk_tidur':
      return 'text-amber-700 dark:text-amber-400';
    default:
      return 'text-on-surface-variant';
  }
}

export function HomeGreetingCard({
  levelProgress,
  shortRankName,
  learnerName,
  gender = 'cowok',
  activityLog,
  dailyDoneCards,
  isTargetReached,
  dueAnkiCount,
  streakDays,
  isLoading = false,
  hasError = false,
  justCompletedSession = false,
  inactivitySleepMs = DEFAULT_INACTIVITY_SLEEP_MS,
  src,
  hourOverride,
}: HomeGreetingCardProps) {
  const { t } = useLanguage();
  const [tapReaction, setTapReaction] = useState<'tap_kaget' | 'happy' | null>(
    null,
  );
  const [isIdleAsleep, setIsIdleAsleep] = useState(false);
  const [previewExpression, setPreviewExpression] =
    useState<MascotExpression | null>(null);

  const lastTapMsRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);
  const reactionTimerRef = useRef<number | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  const isIdleAsleepRef = useRef<boolean>(false);

  useEffect(() => {
    isIdleAsleepRef.current = isIdleAsleep;
  }, [isIdleAsleep]);

  const hasAnyHistory = useMemo(() => {
    if (levelProgress.totalXp > 0) return true;
    if (activityLog.reviewedLessonIds.length > 0) return true;
    return Object.values(activityLog.days).some((entry) => entry.total > 0);
  }, [activityLog.days, activityLog.reviewedLessonIds.length, levelProgress.totalXp]);

  const todayKey = getLocalDateKey();
  const daysSinceLastStudy = useMemo(
    () => computeDaysSinceLastStudy(activityLog.days, todayKey),
    [activityLog.days, todayKey],
  );

  const currentHour = hourOverride ?? new Date().getHours();

  const autoDialogState = useMemo(
    () =>
      resolveMascotDialogState({
        hasAnyHistory,
        dailyDoneCards,
        isTargetReached,
        dueAnkiCount,
        streakDays,
        hour: currentHour,
        daysSinceLastStudy,
      }),
    [
      hasAnyHistory,
      dailyDoneCards,
      isTargetReached,
      dueAnkiCount,
      streakDays,
      currentHour,
      daysSinceLastStudy,
    ],
  );

  const isEmptyReviewError =
    hasError || (dueAnkiCount === 0 && !isTargetReached && !hasAnyHistory);

  // Determine automatic base expression when no tap reaction or manual preview is active
  const baseExpression: MascotExpression = useMemo(() => {
    if (isLoading) return 'mikir_loading';
    if (isEmptyReviewError) return 'bingung_sedih';
    if (isIdleAsleep) return 'ngantuk_tidur';
    if (isTargetReached || justCompletedSession || streakDays >= 3) {
      return 'happy';
    }
    if (autoDialogState.mood === 'gloomy' || autoDialogState.mood === 'sick') {
      return 'bingung_sedih';
    }
    return 'idle';
  }, [
    isLoading,
    isEmptyReviewError,
    isIdleAsleep,
    isTargetReached,
    justCompletedSession,
    streakDays,
    autoDialogState.mood,
  ]);

  const activeExpression: MascotExpression =
    previewExpression ?? tapReaction ?? baseExpression;

  const baseDialogVariants = useMemo<readonly string[]>(() => {
    if (previewExpression) {
      switch (previewExpression) {
        case 'happy':
          return getMoodPreviewVariants('happy', dueAnkiCount, streakDays);
        case 'tap_kaget':
          return MASCOT_TAP_ENCOURAGEMENTS;
        case 'mikir_loading':
          return MASCOT_LOADING_LINES;
        case 'bingung_sedih':
          return MASCOT_ERROR_OR_EMPTY_LINES;
        case 'ngantuk_tidur':
          return MASCOT_SLEEPY_IDLE_LINES;
        default:
          return autoDialogState.variants;
      }
    }
    if (isLoading) return MASCOT_LOADING_LINES;
    if (isEmptyReviewError) return MASCOT_ERROR_OR_EMPTY_LINES;
    if (isIdleAsleep) return MASCOT_SLEEPY_IDLE_LINES;
    if (justCompletedSession && !isTargetReached) return SESSION_COMPLETE_LINES;
    return autoDialogState.variants;
  }, [
    previewExpression,
    isLoading,
    isEmptyReviewError,
    isIdleAsleep,
    justCompletedSession,
    isTargetReached,
    dueAnkiCount,
    streakDays,
    autoDialogState.variants,
  ]);

  const [bubbleLine, setBubbleLine] = useState<string>(
    () => baseDialogVariants[0] ?? 'Halo! Aku teman belajarmu di sini.',
  );

  const variantsKey = baseDialogVariants.join('\u0001');
  useEffect(() => {
    if (tapReaction !== null) return;
    setBubbleLine((prev) =>
      baseDialogVariants.includes(prev)
        ? prev
        : (baseDialogVariants[0] ?? 'Halo! Aku teman belajarmu di sini.'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseExpression, previewExpression, variantsKey]);

  const clearReactionTimer = useCallback(() => {
    if (reactionTimerRef.current !== null) {
      window.clearTimeout(reactionTimerRef.current);
      reactionTimerRef.current = null;
    }
  }, []);

  const scheduleReaction = useCallback(
    (expr: 'tap_kaget' | 'happy', durationMs: number) => {
      clearReactionTimer();
      setTapReaction(expr);
      reactionTimerRef.current = window.setTimeout(() => {
        setTapReaction(null);
        reactionTimerRef.current = null;
      }, durationMs);
    },
    [clearReactionTimer],
  );

  const wakeUpFromSleep = useCallback(() => {
    setIsIdleAsleep(false);
    isIdleAsleepRef.current = false;
    setPreviewExpression(null);
    setBubbleLine((prev) => pickNextMascotLine(MASCOT_WAKE_UP_LINES, prev));
    scheduleReaction('tap_kaget', WAKE_REACTION_DURATION_MS);
  }, [scheduleReaction]);

  // Inactivity detector: falls asleep after 30–60s (default 45s), wakes immediately on touch/key
  useEffect(() => {
    if (typeof window === 'undefined' || inactivitySleepMs <= 0) return;

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = window.setTimeout(() => {
        setIsIdleAsleep(true);
        isIdleAsleepRef.current = true;
      }, inactivitySleepMs);
    };

    const handleUserActivity = () => {
      if (isIdleAsleepRef.current) {
        wakeUpFromSleep();
      }
      resetInactivityTimer();
    };

    const handlePassiveScroll = () => {
      if (!isIdleAsleepRef.current) {
        resetInactivityTimer();
      }
    };

    resetInactivityTimer();
    window.addEventListener('pointerdown', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handlePassiveScroll, { passive: true });

    return () => {
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handlePassiveScroll);
    };
  }, [inactivitySleepMs, wakeUpFromSleep]);

  useEffect(() => {
    return () => {
      clearReactionTimer();
    };
  }, [clearReactionTimer]);

  const handleMascotTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapMsRef.current < TAP_COOLDOWN_MS) return;
    lastTapMsRef.current = now;

    vibrateTap();

    if (isIdleAsleepRef.current || previewExpression === 'ngantuk_tidur') {
      wakeUpFromSleep();
      return;
    }

    if (previewExpression !== null) {
      setPreviewExpression(null);
    }

    tapCountRef.current += 1;
    // First tap always shows tap_kaget; subsequent taps alternate randomly with happy (~35%)
    const nextReaction: 'tap_kaget' | 'happy' =
      tapCountRef.current > 1 && Math.random() < 0.35 ? 'happy' : 'tap_kaget';

    setBubbleLine((prev) => pickNextMascotLine(MASCOT_TAP_ENCOURAGEMENTS, prev));
    scheduleReaction(nextReaction, TAP_REACTION_DURATION_MS);
  }, [previewExpression, scheduleReaction, wakeUpFromSleep]);

  const handleCycleExpressionPreview = () => {
    vibrateTap();
    clearReactionTimer();
    setTapReaction(null);
    setIsIdleAsleep(false);
    isIdleAsleepRef.current = false;

    if (previewExpression === null) {
      const currentIdx = MASCOT_EXPRESSION_ORDER.indexOf(baseExpression);
      const nextExpr =
        MASCOT_EXPRESSION_ORDER[
          (currentIdx + 1) % MASCOT_EXPRESSION_ORDER.length
        ];
      setPreviewExpression(nextExpr);
      return;
    }

    const currentIdx = MASCOT_EXPRESSION_ORDER.indexOf(previewExpression);
    const nextIdx = currentIdx + 1;
    if (nextIdx >= MASCOT_EXPRESSION_ORDER.length) {
      setPreviewExpression(null);
    } else {
      setPreviewExpression(MASCOT_EXPRESSION_ORDER[nextIdx]);
    }
  };

  const expressionLabelId = MASCOT_EXPRESSION_LABELS[activeExpression];
  const expressionLabelEn: Record<MascotExpression, string> = {
    idle: 'Chill',
    happy: 'Happy',
    tap_kaget: 'Surprised',
    mikir_loading: 'Thinking',
    bingung_sedih: 'Sad',
    ngantuk_tidur: 'Sleepy',
  };
  const expressionLabel = t(
    expressionLabelId,
    expressionLabelEn[activeExpression],
  );

  return (
    <section
      aria-label={t('Sapaan dan Level Belajar', 'Greeting and Study Level')}
      className="w-full min-w-0 rounded-2xl border border-outline-variant bg-surface-container-low p-4"
    >
      {/* Top row: prominent interactive animated GIF mascot on left + greeting, badge & speech bubble on right */}
      <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
        <MascotAvatar
          stage={levelProgress.rank.stage}
          gender={gender}
          expression={activeExpression}
          size={136}
          sizeClassName="h-[96px] w-[96px] shrink-0 sm:h-[136px] sm:w-[136px]"
          fallbackSrc={src ?? levelProgress.rank.illustrationPath}
          fallbackLabel={shortRankName}
          ariaLabel={t(
            'Maskot UtamaGo, ketuk untuk berinteraksi',
            'UtamaGo mascot, tap to interact',
          )}
          onTap={handleMascotTap}
          dataMood={activeExpression}
          dataCondition={autoDialogState.condition}
        />

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-base font-bold leading-snug tracking-tight text-on-surface sm:text-[17px]">
            {learnerName
              ? `${t('Halo', 'Hello')}, ${learnerName}!`
              : t('Halo, Pelajar!', 'Hello, Learner!')}
          </h2>

          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="inline-flex max-w-full items-center truncate rounded-lg bg-primary-container px-2 py-0.5 text-[11px] font-bold leading-tight text-on-primary-container">
              Level{' '}
              <span className="mx-0.5 font-mono tabular-nums">
                {levelProgress.level}
              </span>{' '}
              · {shortRankName}
            </span>

            <button
              type="button"
              onClick={handleCycleExpressionPreview}
              aria-label={t(
                `Ekspresi maskot: ${expressionLabel}. Ketuk untuk ganti ekspresi`,
                `Mascot mood: ${expressionLabel}. Tap to switch expression`,
              )}
              title={t(
                'Ketuk untuk ganti ekspresi maskot',
                'Tap to switch mascot expression',
              )}
              className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors hover:bg-surface-container ${getExpressionBadgeTone(activeExpression)}`}
            >
              <span aria-hidden="true">·</span>
              <span>{expressionLabel}</span>
            </button>
          </div>

          {/* Speech bubble with tail pointing left toward the mascot */}
          <div className="relative mt-2.5 ml-1.5 min-w-0">
            <div
              aria-live="polite"
              aria-atomic="true"
              className="relative rounded-xl border border-outline-variant bg-surface-container px-3 py-2"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-3.5 -left-[5.5px] z-10 h-2.5 w-2.5 rotate-45 border-b border-l border-outline-variant bg-surface-container"
              />
              <p className="font-sans text-[13.5px] font-medium leading-relaxed text-on-surface break-words sm:text-[14px]">
                {bubbleLine}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom full-width XP progress bar */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="text-on-surface-variant">
            {t('Menuju Level', 'To Level')}{' '}
            <span className="font-mono tabular-nums">
              {levelProgress.level + 1}
            </span>
          </span>
          <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-on-surface">
            {levelProgress.currentLevelXp}/{levelProgress.xpForNextLevel} XP
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high"
          role="progressbar"
          aria-valuenow={levelProgress.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t(
            'Progres XP menuju level berikutnya',
            'XP progress to next level',
          )}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${levelProgress.progressPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
