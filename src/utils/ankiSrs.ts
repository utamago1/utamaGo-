import type {
  AnkiCard,
  AnkiDeckCategory,
  AnkiDeckId,
  AnkiDeckLevel,
  AnkiRating,
} from './ankiParser';
import { getLocalDateKey, shiftDateKey } from './studyAnalytics';

/**
 * Primary lifecycle state for every Anki card (Part 7).
 * Mastered is tracked separately via `isMastered` so mastered cards keep
 * receiving long-term scheduled reviews and never stop repeating.
 */
export type AnkiCardState =
  | 'new'
  | 'learning'
  | 'review'
  | 'relearning'
  | 'suspended';

export interface AnkiReviewLogEntry {
  reviewedAt: string; // ISO timestamp
  rating: AnkiRating;
  quality: 1 | 3 | 4 | 5; // Mapped SM-2 quality score (0-5 scale)
  prevState: AnkiCardState;
  nextState: AnkiCardState;
  intervalDays: number;
  easeFactor: number;
}

/**
 * Persistent per-card SM-2 SRS record (Part 6, 7 & 15).
 * Backward-compatible with legacy records that only stored
 * repetitions/intervalDays/easeFactor/dueDate/lastReviewedAt/lapses.
 */
export interface AnkiSrsCardState {
  cardId?: string;
  userId?: string;
  deckId?: AnkiDeckId;
  category?: AnkiDeckCategory;
  jlptLevel?: AnkiDeckLevel;
  state?: AnkiCardState;
  previousStateBeforeSuspend?: Exclude<AnkiCardState, 'suspended'>;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string; // YYYY-MM-DD local calendar date
  dueAt?: number; // Epoch ms (minute-accurate for learning/relearning steps)
  lastReviewedAt: string; // ISO timestamp
  lapses: number;
  learningStepIndex?: number;
  isMastered?: boolean;
  reviewHistory?: AnkiReviewLogEntry[];
}

export type AnkiSrsMap = Record<string, AnkiSrsCardState>;

export interface AnkiSchedulingConfig {
  targetRetention: number; // Default 90 (range 75..97)
  learningStepsMinutes: number[]; // Default [1, 10]
  relearningStepsMinutes: number[]; // Default [10]
}

export const DEFAULT_ANKI_SCHEDULING_CONFIG: AnkiSchedulingConfig = {
  targetRetention: 90,
  learningStepsMinutes: [1, 10],
  relearningStepsMinutes: [10],
};

export const ANKI_RATING_XP: Record<AnkiRating, number> = {
  again: 2,
  hard: 5,
  good: 8,
  easy: 10,
};

/**
 * Documented 4-button mapping to classic SM-2 quality scores (0-5 scale) (Part 6):
 *
 * UtamaGo! uses an Anki-adapted SM-2 scheduler (NOT raw classic SM-2):
 * - Again -> q = 1 (forgotten; enters Learning/Relearning steps instead of a 1-day jump,
 *            resets repetitions to 0, increments lapses on Review cards, lowers EF by 0.20, clears Mastered).
 * - Hard  -> q = 3 (recalled with effort; in Learning/Relearning repeats/interpolates step;
 *            in Review uses 1.2x previous interval strictly shorter than Good, lowers EF by 0.15).
 * - Good  -> q = 4 (recalled well; advances Learning/Relearning steps -> graduates to Review 1d -> 6d -> interval * EF * retentionFactor).
 * - Easy  -> q = 5 (effortless recall; graduates immediately to 4d from New/Learning/Relearning,
 *            or applies 1.3x Easy bonus in Review and raises EF by +0.15).
 *
 * Modifications from textbook 1987 SM-2:
 * 1. Dedicated intra-day Learning Steps (default 1m, 10m) & Relearning Steps (default 10m)
 *    separated from multi-day Review intervals.
 * 2. Hard/Easy buttons mapped to 4 ergonomic choices instead of a 0..5 numeric scale.
 * 3. Target Retention scaling around a 90% baseline (multiplier = ln(R) / ln(0.90), clamped 0.5x..2.0x).
 */
export const SM2_RATING_QUALITY_MAP: Record<AnkiRating, 1 | 3 | 4 | 5> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
export const MAX_EASE_FACTOR = 3.5;
export const MAX_REVIEW_HISTORY_PER_CARD = 50;

export const MASTERED_MIN_REPETITIONS = 3;
export const MASTERED_MIN_INTERVAL_DAYS = 21;
export const MASTERED_MIN_EASE_FACTOR = 2.0;

/**
 * Computes interval multiplier from Target Retention (baseline 90% => 1.00).
 * Higher target retention shortens intervals; lower target retention lengthens them.
 */
export function getRetentionIntervalMultiplier(targetRetention: number): number {
  const clamped = Math.max(75, Math.min(97, Number(targetRetention) || 90));
  const raw = Math.log(clamped / 100) / Math.log(0.9);
  return Math.max(0.5, Math.min(2.0, Number(raw.toFixed(3))));
}

export function normalizeStepsMinutes(
  steps: readonly number[] | undefined,
  fallback: readonly number[],
): number[] {
  if (!Array.isArray(steps) || steps.length === 0) {
    return [...fallback];
  }
  const cleaned = steps
    .map((n) => Math.round(Number(n)))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 1440);
  return cleaned.length > 0 ? cleaned.slice(0, 6) : [...fallback];
}

export function resolveCardState(
  record: AnkiSrsCardState | undefined,
): AnkiCardState {
  if (!record) return 'new';
  if (
    record.state === 'new' ||
    record.state === 'learning' ||
    record.state === 'review' ||
    record.state === 'relearning' ||
    record.state === 'suspended'
  ) {
    return record.state;
  }
  // Legacy migration inference
  if (record.intervalDays <= 0) {
    return record.lapses > 0 ? 'relearning' : 'learning';
  }
  return 'review';
}

export function computeIsMastered(record: {
  state: AnkiCardState;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
}): boolean {
  return (
    record.state === 'review' &&
    record.repetitions >= MASTERED_MIN_REPETITIONS &&
    record.intervalDays >= MASTERED_MIN_INTERVAL_DAYS &&
    record.easeFactor >= MASTERED_MIN_EASE_FACTOR
  );
}

function getLocalStartOfDayMs(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return Date.now();
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export interface ScheduleCardContext {
  cardId: string;
  userId?: string;
  deckId?: AnkiDeckId;
  category?: AnkiDeckCategory;
  jlptLevel?: AnkiDeckLevel;
  config?: Partial<AnkiSchedulingConfig>;
  nowMs?: number;
  todayKey?: string;
}

/**
 * Full Anki SM-2 state-machine scheduler with separated Learning/Relearning
 * steps, Review intervals, Target Retention modifier, Mastered indicator, and
 * capped Review History.
 */
export function scheduleAnkiCard(
  prev: AnkiSrsCardState | undefined,
  rating: AnkiRating,
  ctx: ScheduleCardContext,
): AnkiSrsCardState {
  const nowMs = ctx.nowMs ?? Date.now();
  const nowDate = new Date(nowMs);
  const nowIso = nowDate.toISOString();
  const todayKey = ctx.todayKey ?? getLocalDateKey(nowDate);

  const learningSteps = normalizeStepsMinutes(
    ctx.config?.learningStepsMinutes,
    DEFAULT_ANKI_SCHEDULING_CONFIG.learningStepsMinutes,
  );
  const relearningSteps = normalizeStepsMinutes(
    ctx.config?.relearningStepsMinutes,
    DEFAULT_ANKI_SCHEDULING_CONFIG.relearningStepsMinutes,
  );
  const retentionMult = getRetentionIntervalMultiplier(
    ctx.config?.targetRetention ?? DEFAULT_ANKI_SCHEDULING_CONFIG.targetRetention,
  );

  const prevState = resolveCardState(prev);
  const effectivePrevState: Exclude<AnkiCardState, 'suspended'> =
    prevState === 'suspended'
      ? (prev?.previousStateBeforeSuspend ?? 'new')
      : prevState;

  const prevRep = prev?.repetitions ?? 0;
  const prevInterval = prev?.intervalDays ?? 0;
  const prevEase = prev?.easeFactor ?? DEFAULT_EASE_FACTOR;
  const prevLapses = prev?.lapses ?? 0;
  const prevStepIdx = Math.max(0, prev?.learningStepIndex ?? 0);

  let nextState: AnkiCardState = effectivePrevState;
  let repetitions = prevRep;
  let intervalDays = prevInterval;
  let easeFactor = prevEase;
  let lapses = prevLapses;
  let learningStepIndex = prevStepIdx;
  let dueDate = todayKey;
  let dueAt = nowMs;

  const scaleDays = (days: number, minDays = 1): number =>
    Math.max(minDays, Math.round(days * retentionMult));

  if (effectivePrevState === 'new' || effectivePrevState === 'learning') {
    const activeStepIdx = effectivePrevState === 'new' ? 0 : prevStepIdx;

    switch (rating) {
      case 'again': {
        nextState = 'learning';
        learningStepIndex = 0;
        repetitions = 0;
        intervalDays = 0;
        easeFactor = Math.max(
          MIN_EASE_FACTOR,
          Number((prevEase - 0.2).toFixed(2)),
        );
        const mins = learningSteps[0];
        dueAt = nowMs + mins * 60_000;
        dueDate = getLocalDateKey(new Date(dueAt));
        break;
      }
      case 'hard': {
        nextState = 'learning';
        learningStepIndex = Math.min(activeStepIdx, learningSteps.length - 1);
        intervalDays = 0;
        easeFactor = Math.max(
          MIN_EASE_FACTOR,
          Number((prevEase - 0.15).toFixed(2)),
        );
        let hardMins = learningSteps[learningStepIndex];
        if (learningStepIndex === 0 && learningSteps.length >= 2) {
          hardMins = Math.max(
            learningSteps[0],
            Math.round((learningSteps[0] + learningSteps[1]) / 2),
          );
        }
        dueAt = nowMs + hardMins * 60_000;
        dueDate = getLocalDateKey(new Date(dueAt));
        break;
      }
      case 'good': {
        const nextStep = activeStepIdx + 1;
        if (nextStep < learningSteps.length) {
          nextState = 'learning';
          learningStepIndex = nextStep;
          intervalDays = 0;
          const mins = learningSteps[nextStep];
          dueAt = nowMs + mins * 60_000;
          dueDate = getLocalDateKey(new Date(dueAt));
        } else {
          // Graduate from Learning -> Review
          nextState = 'review';
          learningStepIndex = 0;
          repetitions = Math.max(1, prevRep + 1);
          intervalDays = scaleDays(1, 1);
          dueDate = shiftDateKey(todayKey, intervalDays);
          dueAt = getLocalStartOfDayMs(dueDate);
        }
        break;
      }
      case 'easy': {
        // Immediate graduation with Easy bonus
        nextState = 'review';
        learningStepIndex = 0;
        repetitions = Math.max(1, prevRep + 1);
        intervalDays = scaleDays(4, 2);
        easeFactor = Math.min(
          MAX_EASE_FACTOR,
          Number((prevEase + 0.15).toFixed(2)),
        );
        dueDate = shiftDateKey(todayKey, intervalDays);
        dueAt = getLocalStartOfDayMs(dueDate);
        break;
      }
    }
  } else if (effectivePrevState === 'relearning') {
    const activeStepIdx = Math.min(prevStepIdx, relearningSteps.length - 1);

    switch (rating) {
      case 'again': {
        nextState = 'relearning';
        learningStepIndex = 0;
        repetitions = 0;
        intervalDays = 0;
        easeFactor = Math.max(
          MIN_EASE_FACTOR,
          Number((prevEase - 0.2).toFixed(2)),
        );
        const mins = relearningSteps[0];
        dueAt = nowMs + mins * 60_000;
        dueDate = getLocalDateKey(new Date(dueAt));
        break;
      }
      case 'hard': {
        nextState = 'relearning';
        learningStepIndex = activeStepIdx;
        intervalDays = 0;
        easeFactor = Math.max(
          MIN_EASE_FACTOR,
          Number((prevEase - 0.15).toFixed(2)),
        );
        const mins = Math.max(1, Math.round(relearningSteps[activeStepIdx] * 1.2));
        dueAt = nowMs + mins * 60_000;
        dueDate = getLocalDateKey(new Date(dueAt));
        break;
      }
      case 'good': {
        const nextStep = activeStepIdx + 1;
        if (nextStep < relearningSteps.length) {
          nextState = 'relearning';
          learningStepIndex = nextStep;
          intervalDays = 0;
          const mins = relearningSteps[nextStep];
          dueAt = nowMs + mins * 60_000;
          dueDate = getLocalDateKey(new Date(dueAt));
        } else {
          // Graduate from Relearning back to Review
          nextState = 'review';
          learningStepIndex = 0;
          repetitions = 1;
          intervalDays = scaleDays(1, 1);
          dueDate = shiftDateKey(todayKey, intervalDays);
          dueAt = getLocalStartOfDayMs(dueDate);
        }
        break;
      }
      case 'easy': {
        nextState = 'review';
        learningStepIndex = 0;
        repetitions = 1;
        intervalDays = scaleDays(4, 2);
        easeFactor = Math.min(
          MAX_EASE_FACTOR,
          Number((prevEase + 0.15).toFixed(2)),
        );
        dueDate = shiftDateKey(todayKey, intervalDays);
        dueAt = getLocalStartOfDayMs(dueDate);
        break;
      }
    }
  } else {
    // Review state
    const baseInterval = Math.max(1, prevInterval);
    const computeGoodDays = (): number => {
      if (prevRep <= 0) return scaleDays(1, 1);
      if (prevRep === 1) return scaleDays(6, 2);
      return Math.max(
        baseInterval + 1,
        scaleDays(baseInterval * prevEase, baseInterval + 1),
      );
    };

    switch (rating) {
      case 'again': {
        // Forgotten in Review -> enters Relearning
        nextState = 'relearning';
        learningStepIndex = 0;
        repetitions = 0;
        intervalDays = 0;
        lapses = prevLapses + 1;
        easeFactor = Math.max(
          MIN_EASE_FACTOR,
          Number((prevEase - 0.2).toFixed(2)),
        );
        const mins = relearningSteps[0];
        dueAt = nowMs + mins * 60_000;
        dueDate = getLocalDateKey(new Date(dueAt));
        break;
      }
      case 'hard': {
        const goodDays = computeGoodDays();
        nextState = 'review';
        learningStepIndex = 0;
        repetitions = Math.max(1, prevRep + 1);
        const rawHard = scaleDays(baseInterval * 1.2, 1);
        // Guarantee Hard is strictly shorter than Good when Good > 1
        intervalDays = goodDays > 1 ? Math.min(rawHard, goodDays - 1) : 1;
        easeFactor = Math.max(
          MIN_EASE_FACTOR,
          Number((prevEase - 0.15).toFixed(2)),
        );
        dueDate = shiftDateKey(todayKey, intervalDays);
        dueAt = getLocalStartOfDayMs(dueDate);
        break;
      }
      case 'good': {
        nextState = 'review';
        learningStepIndex = 0;
        repetitions = prevRep + 1;
        intervalDays = computeGoodDays();
        dueDate = shiftDateKey(todayKey, intervalDays);
        dueAt = getLocalStartOfDayMs(dueDate);
        break;
      }
      case 'easy': {
        const goodDays = computeGoodDays();
        nextState = 'review';
        learningStepIndex = 0;
        repetitions = prevRep + 1;
        const rawEasy =
          prevRep <= 0
            ? scaleDays(4, 2)
            : prevRep === 1
              ? scaleDays(8, goodDays + 1)
              : scaleDays(baseInterval * prevEase * 1.3, goodDays + 1);
        intervalDays = Math.max(goodDays + 1, rawEasy);
        easeFactor = Math.min(
          MAX_EASE_FACTOR,
          Number((prevEase + 0.15).toFixed(2)),
        );
        dueDate = shiftDateKey(todayKey, intervalDays);
        dueAt = getLocalStartOfDayMs(dueDate);
        break;
      }
    }
  }

  const isMastered = computeIsMastered({
    state: nextState,
    repetitions,
    intervalDays,
    easeFactor,
  });

  const logEntry: AnkiReviewLogEntry = {
    reviewedAt: nowIso,
    rating,
    quality: SM2_RATING_QUALITY_MAP[rating],
    prevState,
    nextState,
    intervalDays,
    easeFactor,
  };

  const prevHistory = Array.isArray(prev?.reviewHistory)
    ? prev.reviewHistory
    : [];
  const reviewHistory = [...prevHistory, logEntry].slice(
    -MAX_REVIEW_HISTORY_PER_CARD,
  );

  return {
    cardId: ctx.cardId,
    userId: ctx.userId ?? prev?.userId,
    deckId: ctx.deckId ?? prev?.deckId,
    category: ctx.category ?? prev?.category,
    jlptLevel: ctx.jlptLevel ?? prev?.jlptLevel,
    state: nextState,
    repetitions,
    intervalDays,
    easeFactor,
    dueDate,
    dueAt,
    lastReviewedAt: nowIso,
    lapses,
    learningStepIndex,
    isMastered,
    reviewHistory,
  };
}

export function suspendAnkiCard(
  prev: AnkiSrsCardState | undefined,
  ctx: Pick<ScheduleCardContext, 'cardId' | 'userId' | 'deckId' | 'category' | 'jlptLevel'>,
  nowMs: number = Date.now(),
): AnkiSrsCardState {
  const prevState = resolveCardState(prev);
  const nowDate = new Date(nowMs);
  const todayKey = getLocalDateKey(nowDate);
  const priorActive: Exclude<AnkiCardState, 'suspended'> =
    prevState === 'suspended'
      ? (prev?.previousStateBeforeSuspend ?? 'new')
      : prevState;

  return {
    cardId: ctx.cardId,
    userId: ctx.userId ?? prev?.userId,
    deckId: ctx.deckId ?? prev?.deckId,
    category: ctx.category ?? prev?.category,
    jlptLevel: ctx.jlptLevel ?? prev?.jlptLevel,
    state: 'suspended',
    previousStateBeforeSuspend: priorActive,
    repetitions: prev?.repetitions ?? 0,
    intervalDays: prev?.intervalDays ?? 0,
    easeFactor: prev?.easeFactor ?? DEFAULT_EASE_FACTOR,
    dueDate: prev?.dueDate ?? todayKey,
    dueAt: prev?.dueAt ?? nowMs,
    lastReviewedAt: prev?.lastReviewedAt ?? nowDate.toISOString(),
    lapses: prev?.lapses ?? 0,
    learningStepIndex: prev?.learningStepIndex ?? 0,
    isMastered: false,
    reviewHistory: prev?.reviewHistory ?? [],
  };
}

export function unsuspendAnkiCard(
  prev: AnkiSrsCardState | undefined,
  nowMs: number = Date.now(),
): AnkiSrsCardState | undefined {
  if (!prev) return undefined;
  const restoredState = prev.previousStateBeforeSuspend ?? (prev.intervalDays > 0 ? 'review' : 'new');
  if (restoredState === 'new' && (prev.reviewHistory?.length ?? 0) === 0) {
    return undefined;
  }
  return {
    ...prev,
    state: restoredState,
    previousStateBeforeSuspend: undefined,
    dueAt: prev.dueAt ?? nowMs,
    isMastered: computeIsMastered({
      state: restoredState,
      repetitions: prev.repetitions,
      intervalDays: prev.intervalDays,
      easeFactor: prev.easeFactor,
    }),
  };
}

/**
 * Legacy-compatible day-level SM-2 helper (kept for existing tests & backup compatibility).
 */
export function scheduleSm2Card(
  prev: AnkiSrsCardState | undefined,
  rating: AnkiRating,
  todayKey: string = getLocalDateKey(),
  nowIso: string = new Date().toISOString(),
): AnkiSrsCardState {
  const prevRep = prev?.repetitions ?? 0;
  const prevInterval = prev?.intervalDays ?? 0;
  const prevEase = prev?.easeFactor ?? DEFAULT_EASE_FACTOR;
  const prevLapses = prev?.lapses ?? 0;

  let repetitions = prevRep;
  let intervalDays = prevInterval;
  let easeFactor = prevEase;
  let lapses = prevLapses;

  switch (rating) {
    case 'again': {
      repetitions = 0;
      intervalDays = 0;
      easeFactor = Math.max(MIN_EASE_FACTOR, Number((prevEase - 0.2).toFixed(2)));
      lapses = prevLapses + 1;
      break;
    }
    case 'hard': {
      repetitions = Math.max(1, prevRep);
      intervalDays =
        prevRep === 0 ? 1 : Math.max(1, Math.round(prevInterval * 1.2));
      easeFactor = Math.max(MIN_EASE_FACTOR, Number((prevEase - 0.15).toFixed(2)));
      break;
    }
    case 'good': {
      if (prevRep === 0) {
        intervalDays = 1;
      } else if (prevRep === 1) {
        intervalDays = 6;
      } else {
        intervalDays = Math.max(1, Math.round(prevInterval * prevEase));
      }
      repetitions = prevRep + 1;
      break;
    }
    case 'easy': {
      if (prevRep === 0) {
        intervalDays = 4;
      } else if (prevRep === 1) {
        intervalDays = 8;
      } else {
        intervalDays = Math.max(1, Math.round(prevInterval * prevEase * 1.3));
      }
      repetitions = prevRep + 1;
      easeFactor = Number((prevEase + 0.15).toFixed(2));
      break;
    }
  }

  const dueDate =
    intervalDays === 0 ? todayKey : shiftDateKey(todayKey, intervalDays);
  const nextState: AnkiCardState =
    intervalDays === 0 ? 'relearning' : 'review';

  return {
    ...prev,
    state: nextState,
    repetitions,
    intervalDays,
    easeFactor,
    dueDate,
    dueAt: intervalDays === 0 ? Date.now() + 10 * 60_000 : getLocalStartOfDayMs(dueDate),
    lastReviewedAt: nowIso,
    lapses,
    isMastered: computeIsMastered({
      state: nextState,
      repetitions,
      intervalDays,
      easeFactor,
    }),
  };
}

export function formatIntervalLabel(intervalDays: number): string {
  if (intervalDays <= 0) return '< 10 mnt';
  if (intervalDays === 1) return '1 hari';
  if (intervalDays < 30) return `${intervalDays} hari`;
  const months = Math.round(intervalDays / 30);
  if (months < 12) return `${months} bln`;
  const years = (intervalDays / 365).toFixed(1).replace(/\.0$/, '');
  return `${years} thn`;
}

export function formatScheduledStepLabel(
  scheduled: AnkiSrsCardState,
  nowMs: number,
): string {
  if (
    (scheduled.state === 'learning' || scheduled.state === 'relearning') &&
    typeof scheduled.dueAt === 'number'
  ) {
    const mins = Math.max(1, Math.round((scheduled.dueAt - nowMs) / 60_000));
    if (mins < 60) return `${mins} mnt`;
    const hours = Math.round(mins / 60);
    return `${hours} jam`;
  }
  return formatIntervalLabel(scheduled.intervalDays);
}

export function previewAnkiIntervalLabels(
  prev: AnkiSrsCardState | undefined,
  config?: Partial<AnkiSchedulingConfig>,
  nowMs: number = Date.now(),
): Record<AnkiRating, string> {
  const baseCtx: ScheduleCardContext = {
    cardId: prev?.cardId ?? 'preview',
    config,
    nowMs,
  };
  return {
    again: formatScheduledStepLabel(scheduleAnkiCard(prev, 'again', baseCtx), nowMs),
    hard: formatScheduledStepLabel(scheduleAnkiCard(prev, 'hard', baseCtx), nowMs),
    good: formatScheduledStepLabel(scheduleAnkiCard(prev, 'good', baseCtx), nowMs),
    easy: formatScheduledStepLabel(scheduleAnkiCard(prev, 'easy', baseCtx), nowMs),
  };
}

export function previewSm2IntervalLabels(
  prev: AnkiSrsCardState | undefined,
  todayKey: string = getLocalDateKey(),
): Record<AnkiRating, string> {
  return {
    again: formatIntervalLabel(scheduleSm2Card(prev, 'again', todayKey).intervalDays),
    hard: formatIntervalLabel(scheduleSm2Card(prev, 'hard', todayKey).intervalDays),
    good: formatIntervalLabel(scheduleSm2Card(prev, 'good', todayKey).intervalDays),
    easy: formatIntervalLabel(scheduleSm2Card(prev, 'easy', todayKey).intervalDays),
  };
}

export function isCardDueToday(
  cardId: string,
  srsMap: AnkiSrsMap,
  againIds: readonly string[],
  todayKey: string = getLocalDateKey(),
  nowMs: number = Date.now(),
): boolean {
  const state = srsMap[cardId];
  if (state) {
    const resolved = resolveCardState(state);
    if (resolved === 'suspended') return false;
    if (resolved === 'learning' || resolved === 'relearning') {
      if (typeof state.dueAt === 'number') {
        return state.dueAt <= nowMs;
      }
      return state.dueDate <= todayKey;
    }
    if (resolved === 'review') {
      return state.dueDate <= todayKey;
    }
    return false;
  }
  if (againIds.includes(cardId)) return true;
  return false;
}

export interface DueAnkiSummary {
  dueCards: AnkiCard[];
  newCards: AnkiCard[];
  scheduledLaterCount: number;
  dueCount: number;
}

export function classifyAnkiDeckBySchedule(
  cards: readonly AnkiCard[],
  srsMap: AnkiSrsMap,
  againIds: readonly string[],
  studiedIds: readonly string[],
  todayKey: string = getLocalDateKey(),
  nowMs: number = Date.now(),
): DueAnkiSummary {
  const dueCards: AnkiCard[] = [];
  const newCards: AnkiCard[] = [];
  let scheduledLaterCount = 0;

  const againSet = new Set(againIds);
  const studiedSet = new Set(studiedIds);

  for (const card of cards) {
    const state = srsMap[card.id];
    if (state) {
      const resolved = resolveCardState(state);
      if (resolved === 'suspended') {
        scheduledLaterCount += 1;
      } else if (resolved === 'learning' || resolved === 'relearning') {
        if (typeof state.dueAt === 'number' ? state.dueAt <= nowMs : state.dueDate <= todayKey) {
          dueCards.push(card);
        } else {
          scheduledLaterCount += 1;
        }
      } else if (resolved === 'review') {
        if (state.dueDate <= todayKey) {
          dueCards.push(card);
        } else {
          scheduledLaterCount += 1;
        }
      } else {
        newCards.push(card);
      }
    } else if (againSet.has(card.id)) {
      dueCards.push(card);
    } else if (studiedSet.has(card.id)) {
      scheduledLaterCount += 1;
    } else {
      newCards.push(card);
    }
  }

  return {
    dueCards,
    newCards,
    scheduledLaterCount,
    dueCount: dueCards.length,
  };
}

/**
 * Safely migrates legacy SRS entries & studiedIds/againIds without losing or resetting user progress.
 */
export function hydrateSrsMapFromLegacy(
  existingSrs: AnkiSrsMap,
  studiedIds: readonly string[],
  againIds: readonly string[],
  todayKey: string = getLocalDateKey(),
  userId?: string,
): AnkiSrsMap {
  const next: AnkiSrsMap = {};
  const againSet = new Set(againIds);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  for (const [id, raw] of Object.entries(existingSrs)) {
    if (!raw || typeof raw !== 'object') continue;
    const resolvedState = resolveCardState(raw);
    const dueDate =
      typeof raw.dueDate === 'string' && raw.dueDate.length >= 10
        ? raw.dueDate
        : todayKey;
    const intervalDays = Math.max(0, Number(raw.intervalDays) || 0);
    const repetitions = Math.max(0, Number(raw.repetitions) || 0);
    const easeFactor = Math.max(
      MIN_EASE_FACTOR,
      Math.min(MAX_EASE_FACTOR, Number(raw.easeFactor) || DEFAULT_EASE_FACTOR),
    );
    const dueAt =
      typeof raw.dueAt === 'number' && Number.isFinite(raw.dueAt)
        ? raw.dueAt
        : resolvedState === 'review'
          ? getLocalStartOfDayMs(dueDate)
          : nowMs;

    next[id] = {
      ...raw,
      cardId: raw.cardId ?? id,
      userId: raw.userId ?? userId,
      state: resolvedState,
      repetitions,
      intervalDays,
      easeFactor,
      dueDate,
      dueAt,
      lastReviewedAt:
        typeof raw.lastReviewedAt === 'string' ? raw.lastReviewedAt : nowIso,
      lapses: Math.max(0, Number(raw.lapses) || 0),
      learningStepIndex: Math.max(0, Number(raw.learningStepIndex) || 0),
      isMastered:
        typeof raw.isMastered === 'boolean'
          ? raw.isMastered
          : computeIsMastered({
              state: resolvedState,
              repetitions,
              intervalDays,
              easeFactor,
            }),
      reviewHistory: Array.isArray(raw.reviewHistory)
        ? raw.reviewHistory.slice(-MAX_REVIEW_HISTORY_PER_CARD)
        : [],
    };
  }

  for (const id of studiedIds) {
    if (next[id]) continue;
    const isAgain = againSet.has(id);
    const dueDate = isAgain ? todayKey : shiftDateKey(todayKey, 1);
    const state: AnkiCardState = isAgain ? 'relearning' : 'review';
    next[id] = {
      cardId: id,
      userId,
      state,
      repetitions: isAgain ? 0 : 1,
      intervalDays: isAgain ? 0 : 1,
      easeFactor: DEFAULT_EASE_FACTOR,
      dueDate,
      dueAt: isAgain ? nowMs : getLocalStartOfDayMs(dueDate),
      lastReviewedAt: nowIso,
      lapses: isAgain ? 1 : 0,
      learningStepIndex: 0,
      isMastered: false,
      reviewHistory: [],
    };
  }

  for (const id of againIds) {
    if (!next[id]) {
      next[id] = {
        cardId: id,
        userId,
        state: 'relearning',
        repetitions: 0,
        intervalDays: 0,
        easeFactor: DEFAULT_EASE_FACTOR,
        dueDate: todayKey,
        dueAt: nowMs,
        lastReviewedAt: nowIso,
        lapses: 1,
        learningStepIndex: 0,
        isMastered: false,
        reviewHistory: [],
      };
    }
  }

  return next;
}
