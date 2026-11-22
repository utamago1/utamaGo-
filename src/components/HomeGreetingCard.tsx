import { useEffect, useMemo, useRef, useState } from 'react';
import { vibrateTap } from '../utils/haptics';
import type { LevelProgressInfo } from '../utils/levelProgression';
import {
  computeDaysSinceLastStudy,
  getMoodPreviewVariants,
  MASCOT_ANGRY_VARIANTS,
  MASCOT_MOOD_LABELS,
  MASCOT_MOOD_ORDER,
  MASCOT_SOOTHE_VARIANTS,
  MASCOT_WAVE_VARIANTS,
  pickNextMascotLine,
  resolveMascotDialogState,
  resolveTransparentMascotSrc,
  type MascotMood,
} from '../utils/mascotDialog';
import { getLocalDateKey, type StudyActivityLog } from '../utils/studyAnalytics';

export interface HomeGreetingCardProps {
  levelProgress: LevelProgressInfo;
  shortRankName: string;
  learnerName?: string;
  activityLog: StudyActivityLog;
  dailyDoneCards: number;
  isTargetReached: boolean;
  dueAnkiCount: number;
  streakDays: number;
  /** Optional custom high-resolution transparent mascot image URL */
  src?: string;
  /** Optional hour override (0-23) for testing time-of-day states */
  hourOverride?: number;
}

type MascotReaction = 'none' | 'wave' | 'spin' | 'angry';

const COOLDOWN_MS = 450;
const LONG_PRESS_MS = 500;
const WAVE_DURATION_MS = 820;
const SPIN_DURATION_MS = 680;
const ANGRY_DURATION_MS = 4200;
const RAPID_TAP_WINDOW_MS = 4500;
const RAPID_TAP_THRESHOLD = 4;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getMoodIdleClass(mood: MascotMood): string {
  switch (mood) {
    case 'happy':
      return 'utamago-mascot-happy';
    case 'sleepy':
      return 'utamago-mascot-sleepy';
    case 'gloomy':
      return 'utamago-mascot-gloomy';
    case 'sick':
      return 'utamago-mascot-sick';
    case 'angry':
      return 'utamago-mascot-angry';
    default:
      return 'utamago-mascot-idle';
  }
}

function getMoodBadgeTone(mood: MascotMood): string {
  switch (mood) {
    case 'happy':
      return 'text-success';
    case 'angry':
      return 'text-primary';
    case 'sick':
      return 'text-sky-600 dark:text-sky-400';
    case 'gloomy':
      return 'text-indigo-600 dark:text-indigo-400';
    case 'sleepy':
      return 'text-amber-600 dark:text-amber-400';
    default:
      return 'text-[#4b4b53] dark:text-[#b4b4c0]';
  }
}

function MascotExpressionOverlays({
  mood,
  reaction,
  reactionNonce,
}: {
  mood: MascotMood;
  reaction: MascotReaction;
  reactionNonce: number;
}) {
  const showWaveHand = reaction === 'wave';
  const showHearts = reaction === 'spin';
  const showAngry = reaction === 'angry' || mood === 'angry';
  const showSick = !showAngry && mood === 'sick';
  const showGloomy = !showAngry && mood === 'gloomy';
  const showSleepy = !showAngry && mood === 'sleepy';
  const showHappySparkles =
    !showAngry && !showSick && !showGloomy && !showSleepy && (mood === 'happy' || showWaveHand);

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-visible"
    >
      {/* Waving hand + motion arcs when tapped */}
      {showWaveHand && (
        <svg
          key={`wave-${reactionNonce}`}
          viewBox="0 0 40 40"
          className="utamago-mascot-wave-hand absolute top-6 -right-1.5 z-20 h-9 w-9 drop-shadow-xs"
        >
          {/* Motion arcs */}
          <path
            d="M27 7 C31 9, 33 13, 33 17"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M31 4 C35 7, 37 11, 37 15"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* Cute chibi waving wing/paw matching UtamaGo ink outline */}
          <path
            d="M9 30 C7 24, 9 15, 14 12 C16.5 10.5, 19.5 12, 19.5 15 C21 12.5, 24.5 13.5, 24 17 C26 16.5, 28 19.5, 25.5 23 C23 27, 17 32, 11 32 Z"
            fill="#fde047"
            stroke="#161618"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M14 23 C16 21, 18.5 21, 20 22.5"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Floating hearts when long-pressed / soothed */}
      {showHearts && (
        <span key={`hearts-${reactionNonce}`} className="absolute inset-0 z-20">
          <svg
            viewBox="0 0 24 24"
            className="utamago-mascot-heart absolute -top-1 right-2 h-5 w-5 text-rose-500"
            fill="currentColor"
          >
            <path d="M12 21s-6.7-4.35-9.2-8.2C.9 9.8 2.2 5.8 5.8 5c2.1-.5 4.2.5 5.2 2.2C12 5.5 14.1 4.5 16.2 5c3.6.8 4.9 4.8 3 7.8C18.7 16.65 12 21 12 21z" />
          </svg>
          <svg
            viewBox="0 0 24 24"
            style={{ animationDelay: '120ms' }}
            className="utamago-mascot-heart absolute top-2 left-1 h-3.5 w-3.5 text-amber-500"
            fill="currentColor"
          >
            <path d="M12 21s-6.7-4.35-9.2-8.2C.9 9.8 2.2 5.8 5.8 5c2.1-.5 4.2.5 5.2 2.2C12 5.5 14.1 4.5 16.2 5c3.6.8 4.9 4.8 3 7.8C18.7 16.65 12 21 12 21z" />
          </svg>
        </span>
      )}

      {/* Angry anime vein + rising steam puffs */}
      {showAngry && (
        <span className="absolute inset-0 z-20">
          <svg
            viewBox="0 0 28 28"
            className="utamago-mascot-angry-vein absolute top-0.5 right-0.5 h-6 w-6"
          >
            <path
              d="M6 12 C9.5 12, 12 9.5, 12 6 M22 12 C18.5 12, 16 9.5, 16 6 M6 16 C9.5 16, 12 18.5, 12 22 M22 16 C18.5 16, 16 18.5, 16 22"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
          <svg
            viewBox="0 0 20 20"
            className="utamago-mascot-steam absolute -top-1 left-2 h-4 w-4 text-rose-400"
            fill="currentColor"
          >
            <circle cx="8" cy="12" r="4" opacity="0.85" />
            <circle cx="13" cy="9" r="3.2" opacity="0.7" />
          </svg>
        </span>
      )}

      {/* Sick: cooling forehead patch + cold sweat drop */}
      {showSick && (
        <span className="absolute inset-0 z-20">
          {/* Forehead cooling gel patch */}
          <svg
            viewBox="0 0 36 18"
            className="absolute top-[22px] left-1/2 h-4 w-8 -translate-x-1/2 -rotate-6 drop-shadow-xs"
          >
            <rect
              x="2"
              y="2"
              width="32"
              height="14"
              rx="4"
              fill="#e0f2fe"
              stroke="#0284c7"
              strokeWidth="2"
            />
            <line
              x1="8"
              y1="6.5"
              x2="28"
              y2="6.5"
              stroke="#7dd3fc"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <line
              x1="10"
              y1="11"
              x2="24"
              y2="11"
              stroke="#7dd3fc"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          {/* Animated cold sweat drop */}
          <svg
            viewBox="0 0 16 22"
            className="utamago-mascot-sweat absolute top-5 right-2 h-4 w-3"
          >
            <path
              d="M8 2 C8 2, 14 10, 14 14.5 C14 17.8, 11.3 20, 8 20 C4.7 20, 2 17.8, 2 14.5 C2 10, 8 2, 8 2 Z"
              fill="#38bdf8"
              stroke="#0369a1"
              strokeWidth="1.6"
            />
          </svg>
        </span>
      )}

      {/* Gloomy / Sad: little raincloud + falling droplets + anime gloom lines */}
      {showGloomy && (
        <span className="absolute inset-0 z-20">
          <svg
            viewBox="0 0 36 24"
            className="absolute -top-1 left-1 h-6 w-9 drop-shadow-xs"
          >
            <path
              d="M9 19 H26 C29.5 19, 32 16.5, 32 13.5 C32 10.7, 29.8 8.5, 27 8.3 C26 4.7, 22.7 2.5, 19 2.5 C14.9 2.5, 11.6 5.4, 11 9.3 C7.8 9.6, 5.5 12, 5.5 14.8 C5.5 17.2, 7 19, 9 19 Z"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          <span className="utamago-mascot-rain absolute top-4 left-3.5 h-2 w-0.5 rounded-full bg-sky-500/80" />
          <span
            style={{ animationDelay: '450ms' }}
            className="utamago-mascot-rain absolute top-4 left-6 h-2 w-0.5 rounded-full bg-sky-500/80"
          />
          <svg
            viewBox="0 0 18 22"
            className="absolute top-3 right-1 h-5 w-4 opacity-75"
          >
            <line x1="4" y1="2" x2="4" y2="18" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="9" y1="4" x2="9" y2="20" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="14" y1="2" x2="14" y2="16" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      )}

      {/* Sleepy: floating zZ */}
      {showSleepy && (
        <span className="utamago-mascot-zzz absolute top-0.5 right-0.5 z-20 font-display text-xs font-extrabold tracking-tight text-primary/80">
          zZ
        </span>
      )}

      {/* Happy sparkles */}
      {showHappySparkles && (
        <span className="absolute inset-0 z-10">
          <svg
            viewBox="0 0 16 16"
            className="utamago-mascot-sparkle absolute top-1 left-1 h-3.5 w-3.5 text-amber-400"
            fill="currentColor"
          >
            <path d="M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z" />
          </svg>
          <svg
            viewBox="0 0 16 16"
            style={{ animationDelay: '700ms' }}
            className="utamago-mascot-sparkle absolute bottom-2 right-1 h-2.5 w-2.5 text-primary/70"
            fill="currentColor"
          >
            <path d="M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z" />
          </svg>
        </span>
      )}
    </span>
  );
}

export function HomeGreetingCard({
  levelProgress,
  shortRankName,
  learnerName,
  activityLog,
  dailyDoneCards,
  isTargetReached,
  dueAnkiCount,
  streakDays,
  src,
  hourOverride,
}: HomeGreetingCardProps) {
  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedFallback, setFailedFallback] = useState(false);
  const [reaction, setReaction] = useState<MascotReaction>('none');
  const [reactionNonce, setReactionNonce] = useState(0);
  const [previewMood, setPreviewMood] = useState<MascotMood | null>(null);

  const lastInteractionMsRef = useRef<number>(0);
  const recentTapTimestampsRef = useRef<number[]>([]);
  const longPressTimerRef = useRef<number | null>(null);
  const reactionResetTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef<boolean>(false);
  const suppressNextClickRef = useRef<boolean>(false);

  const primarySrc = useMemo(
    () => resolveTransparentMascotSrc(levelProgress.rank.illustrationPath, src),
    [levelProgress.rank.illustrationPath, src],
  );
  const fallbackSrc = levelProgress.rank.illustrationPath;
  const activeImgSrc = failedPrimary ? fallbackSrc : primarySrc;

  useEffect(() => {
    setFailedPrimary(false);
    setFailedFallback(false);
  }, [primarySrc, fallbackSrc]);

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

  const activeMood: MascotMood =
    reaction === 'angry' ? 'angry' : (previewMood ?? autoDialogState.mood);

  const activeVariants = useMemo(() => {
    if (previewMood) {
      return getMoodPreviewVariants(previewMood, dueAnkiCount, streakDays);
    }
    return autoDialogState.variants;
  }, [previewMood, autoDialogState.variants, dueAnkiCount, streakDays]);

  const [bubbleLine, setBubbleLine] = useState<string>(
    () => activeVariants[0] ?? '',
  );

  const variantsKey = activeVariants.join('\u0001');
  useEffect(() => {
    setBubbleLine((prev) =>
      activeVariants.includes(prev) ? prev : (activeVariants[0] ?? ''),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDialogState.condition, previewMood, variantsKey]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
      if (reactionResetTimerRef.current !== null) {
        window.clearTimeout(reactionResetTimerRef.current);
      }
    };
  }, []);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const triggerInteraction = (kind: 'wave' | 'spin') => {
    const now = Date.now();
    if (now - lastInteractionMsRef.current < COOLDOWN_MS) {
      return;
    }
    lastInteractionMsRef.current = now;

    // Long press soothes angry/gloomy/sick or plays happy spin
    if (kind === 'spin') {
      recentTapTimestampsRef.current = [];
      if (previewMood === 'angry' || previewMood === 'gloomy' || previewMood === 'sick') {
        setPreviewMood('happy');
      }
      const soothePool =
        reaction === 'angry' ||
        activeMood === 'angry' ||
        activeMood === 'gloomy' ||
        activeMood === 'sick'
          ? MASCOT_SOOTHE_VARIANTS
          : activeVariants;
      setBubbleLine((prev) => pickNextMascotLine(soothePool, prev));

      if (prefersReducedMotion()) {
        setReaction('none');
        return;
      }

      vibrateTap();
      if (reactionResetTimerRef.current !== null) {
        window.clearTimeout(reactionResetTimerRef.current);
      }
      setReaction('spin');
      setReactionNonce((n) => n + 1);
      reactionResetTimerRef.current = window.setTimeout(() => {
        setReaction('none');
        reactionResetTimerRef.current = null;
      }, SPIN_DURATION_MS);
      return;
    }

    // Track rapid taps -> playful angry reaction when poked repeatedly
    const recent = recentTapTimestampsRef.current.filter(
      (ts) => now - ts <= RAPID_TAP_WINDOW_MS,
    );
    recent.push(now);
    recentTapTimestampsRef.current = recent;

    if (recent.length >= RAPID_TAP_THRESHOLD) {
      recentTapTimestampsRef.current = [];
      setBubbleLine((prev) => pickNextMascotLine(MASCOT_ANGRY_VARIANTS, prev));

      if (prefersReducedMotion()) {
        setReaction('none');
        return;
      }

      vibrateTap();
      if (reactionResetTimerRef.current !== null) {
        window.clearTimeout(reactionResetTimerRef.current);
      }
      setReaction('angry');
      setReactionNonce((n) => n + 1);
      reactionResetTimerRef.current = window.setTimeout(() => {
        setReaction('none');
        reactionResetTimerRef.current = null;
      }, ANGRY_DURATION_MS);
      return;
    }

    // Standard tap -> wave hand + pick reactive line
    const tapPool =
      activeMood === 'angry'
        ? MASCOT_ANGRY_VARIANTS
        : activeMood === 'sick' || activeMood === 'gloomy' || activeMood === 'sleepy'
          ? activeVariants
          : [...activeVariants, ...MASCOT_WAVE_VARIANTS];

    setBubbleLine((prev) => pickNextMascotLine(tapPool, prev));

    if (prefersReducedMotion()) {
      setReaction('none');
      return;
    }

    vibrateTap();
    if (reactionResetTimerRef.current !== null) {
      window.clearTimeout(reactionResetTimerRef.current);
    }

    setReaction('wave');
    setReactionNonce((n) => n + 1);
    reactionResetTimerRef.current = window.setTimeout(() => {
      setReaction('none');
      reactionResetTimerRef.current = null;
    }, WAVE_DURATION_MS);
  };

  const handleCycleMoodPreview = () => {
    vibrateTap();
    if (reactionResetTimerRef.current !== null) {
      window.clearTimeout(reactionResetTimerRef.current);
      reactionResetTimerRef.current = null;
    }
    setReaction('none');
    recentTapTimestampsRef.current = [];

    if (previewMood === null) {
      const autoIdx = MASCOT_MOOD_ORDER.indexOf(autoDialogState.mood);
      const nextMood =
        MASCOT_MOOD_ORDER[(autoIdx + 1) % MASCOT_MOOD_ORDER.length];
      setPreviewMood(nextMood);
      return;
    }

    const currentIdx = MASCOT_MOOD_ORDER.indexOf(previewMood);
    const nextIdx = currentIdx + 1;
    if (nextIdx >= MASCOT_MOOD_ORDER.length) {
      setPreviewMood(null);
    } else {
      setPreviewMood(MASCOT_MOOD_ORDER[nextIdx]);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    clearLongPressTimer();
    longPressFiredRef.current = false;
    suppressNextClickRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      longPressFiredRef.current = true;
      suppressNextClickRef.current = true;
      triggerInteraction('spin');
    }, LONG_PRESS_MS);
  };

  const scheduleSuppressReset = () => {
    if (!suppressNextClickRef.current && !longPressFiredRef.current) return;
    window.setTimeout(() => {
      suppressNextClickRef.current = false;
      longPressFiredRef.current = false;
    }, 60);
  };

  const handlePointerUp = () => {
    clearLongPressTimer();
    scheduleSuppressReset();
  };

  const handlePointerCancelOrLeave = () => {
    clearLongPressTimer();
    scheduleSuppressReset();
  };

  const handleClick = () => {
    if (suppressNextClickRef.current || longPressFiredRef.current) {
      suppressNextClickRef.current = false;
      longPressFiredRef.current = false;
      return;
    }
    triggerInteraction('wave');
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const reactionClass =
    reaction === 'wave'
      ? 'utamago-mascot-wave'
      : reaction === 'spin'
        ? 'utamago-mascot-spin'
        : reaction === 'angry'
          ? 'utamago-mascot-angry'
          : getMoodIdleClass(activeMood);

  const moodLabel =
    reaction === 'wave' ? 'Melambai' : MASCOT_MOOD_LABELS[activeMood];

  return (
    <section
      aria-label="Sapaan dan Level Belajar"
      className="w-full min-w-0 rounded-2xl border border-outline-variant bg-surface-container-low p-4"
    >
      {/* Top row: 104px interactive borderless mascot on left + greeting, chip & speech bubble on right */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Maskot UtamaGo, ketuk untuk berinteraksi"
          data-mascot-mood={activeMood}
          data-mascot-condition={autoDialogState.condition}
          data-mascot-reaction={reaction}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancelOrLeave}
          onPointerLeave={handlePointerCancelOrLeave}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          className="relative flex h-[104px] w-[104px] shrink-0 cursor-pointer touch-manipulation select-none items-center justify-center rounded-2xl border-0 bg-transparent p-0 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <MascotExpressionOverlays
            mood={activeMood}
            reaction={reaction}
            reactionNonce={reactionNonce}
          />

          {!failedFallback ? (
            <img
              key={reaction === 'none' ? `idle-${activeMood}` : `${reaction}-${reactionNonce}`}
              src={activeImgSrc}
              alt=""
              aria-hidden="true"
              width={104}
              height={104}
              decoding="async"
              draggable={false}
              referrerPolicy="no-referrer"
              onError={() => {
                if (!failedPrimary && primarySrc !== fallbackSrc) {
                  setFailedPrimary(true);
                } else {
                  setFailedFallback(true);
                }
              }}
              className={`h-[104px] w-[104px] object-contain will-change-transform ${reactionClass}`}
            />
          ) : (
            <span
              aria-hidden="true"
              className={`flex h-20 w-20 items-center justify-center rounded-full bg-primary-container font-display text-sm font-extrabold text-on-primary-container ${reactionClass}`}
            >
              {shortRankName}
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[15px] font-bold leading-snug tracking-tight text-on-surface">
            {learnerName ? `Halo, ${learnerName}!` : 'Halo, Pelajar!'}
          </h2>

          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <span className="inline-flex max-w-full items-center truncate rounded-lg bg-primary-container px-2 py-0.5 text-[11px] font-bold leading-tight text-on-primary-container">
              Level{' '}
              <span className="mx-0.5 font-mono tabular-nums">
                {levelProgress.level}
              </span>{' '}
              · {shortRankName}
            </span>

            <button
              type="button"
              onClick={handleCycleMoodPreview}
              aria-label={`Ekspresi maskot: ${moodLabel}. Ketuk untuk ganti ekspresi`}
              title="Ketuk untuk ganti ekspresi maskot"
              className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors hover:bg-surface-container ${getMoodBadgeTone(activeMood)}`}
            >
              <span aria-hidden="true">·</span>
              <span>{moodLabel}</span>
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
              <p className="line-clamp-2 font-sans text-[14px] font-medium leading-snug text-on-surface break-words">
                {bubbleLine}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom full-width XP progress bar */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="text-[#4b4b53] dark:text-[#b4b4c0]">
            Menuju Level{' '}
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
          aria-label="Progres XP menuju level berikutnya"
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
