import type {
  AnkiCard,
  AnkiDeckCategory,
  AnkiDeckId,
  AnkiDeckLevel,
  AnkiRating,
} from './ankiParser';
import {
  ANKI_RATING_XP,
  computeIsMastered,
  DEFAULT_ANKI_SCHEDULING_CONFIG,
  normalizeStepsMinutes,
  resolveCardState,
  scheduleAnkiCard,
  type AnkiCardState,
  type AnkiSrsCardState,
  type AnkiSrsMap,
} from './ankiSrs';
import { getLocalDateKey } from './studyAnalytics';

export interface AnkiDeckMeta {
  deckId: AnkiDeckId;
  category: AnkiDeckCategory;
  jlptLevel: AnkiDeckLevel;
  label: string;
}

/**
 * 10 Independent Decks (Part 2):
 * 5 Kosakata decks (N5..N1) + 5 Bunpou decks (N5..N1).
 */
export const ALL_ANKI_DECK_IDS: readonly AnkiDeckId[] = [
  'N5',
  'N4',
  'N3',
  'N2',
  'N1',
  'N5_BUNPOU',
  'N4_BUNPOU',
  'N3_BUNPOU',
  'N2_BUNPOU',
  'N1_BUNPOU',
] as const;

export const ANKI_DECK_META: Record<AnkiDeckId, AnkiDeckMeta> = {
  N5: { deckId: 'N5', category: 'kosakata', jlptLevel: 'N5', label: 'Kosakata JLPT N5' },
  N4: { deckId: 'N4', category: 'kosakata', jlptLevel: 'N4', label: 'Kosakata JLPT N4' },
  N3: { deckId: 'N3', category: 'kosakata', jlptLevel: 'N3', label: 'Kosakata JLPT N3' },
  N2: { deckId: 'N2', category: 'kosakata', jlptLevel: 'N2', label: 'Kosakata JLPT N2' },
  N1: { deckId: 'N1', category: 'kosakata', jlptLevel: 'N1', label: 'Kosakata JLPT N1' },
  N5_BUNPOU: { deckId: 'N5_BUNPOU', category: 'bunpou', jlptLevel: 'N5', label: 'Bunpou JLPT N5' },
  N4_BUNPOU: { deckId: 'N4_BUNPOU', category: 'bunpou', jlptLevel: 'N4', label: 'Bunpou JLPT N4' },
  N3_BUNPOU: { deckId: 'N3_BUNPOU', category: 'bunpou', jlptLevel: 'N3', label: 'Bunpou JLPT N3' },
  N2_BUNPOU: { deckId: 'N2_BUNPOU', category: 'bunpou', jlptLevel: 'N2', label: 'Bunpou JLPT N2' },
  N1_BUNPOU: { deckId: 'N1_BUNPOU', category: 'bunpou', jlptLevel: 'N1', label: 'Bunpou JLPT N1' },
};

export function resolveAnkiDeckId(
  category: AnkiDeckCategory,
  level: AnkiDeckLevel,
): AnkiDeckId {
  if (category === 'bunpou') {
    return `${level}_BUNPOU` as AnkiDeckId;
  }
  return level;
}

export function isValidAnkiDeckId(value: unknown): value is AnkiDeckId {
  return (
    typeof value === 'string' &&
    (ALL_ANKI_DECK_IDS as readonly string[]).includes(value)
  );
}

export type NewCardOrder = 'random' | 'sequential';
export type ReviewCardOrder = 'oldest_due' | 'random';

/**
 * Per-deck independent configuration (Part 3 & Part 12).
 */
export interface AnkiDeckSettings {
  dailyNewLimit: number; // Kosakata default 10, Bunpou default 5
  maxReviewsPerDay: number; // Default 200
  targetRetention: number; // Default 90 (%)
  learningStepsMinutes: number[]; // Default [1, 10]
  relearningStepsMinutes: number[]; // Default [10]
  newCardOrder: NewCardOrder; // Default 'random'
  reviewCardOrder: ReviewCardOrder; // Default 'oldest_due'
  resumeInterruptedSession: boolean; // Default true
}

/**
 * Per-deck daily quota & persisted daily new-card random order (Part 4 & Part 5).
 * Automatically resets when local calendar dateKey changes at 00:00 local time.
 */
export interface AnkiDeckDailyProgress {
  dateKey: string; // YYYY-MM-DD in user's local timezone
  newCardIdsToday: string[]; // Unique new cards introduced today (each consumes 1 daily new quota)
  reviewedCardIdsToday: string[]; // Review cards rated today
  reviewCompletionsToday: number; // Count of Review-state ratings today (capped against maxReviewsPerDay)
  extraReviewQuotaToday: number; // Optional user-requested temporary backlog extension for today only
  dailyNewOrderDateKey: string; // Local date when dailyNewOrderIds was generated
  dailyNewOrderIds: string[]; // Stable Fisher-Yates order of new card IDs for the day
}

/**
 * Persisted active study session per deck for seamless resume (Part 9 & Part 10).
 */
export interface AnkiStudySession {
  sessionId: string;
  deckId: AnkiDeckId;
  scope: 'due' | 'all';
  dateKey: string;
  queueCardIds: string[];
  currentIndex: number;
  completedCardIds: string[];
  startedAt: string;
  updatedAt: string;
}

export interface StoredAnkiEngineState {
  deckSettings: Partial<Record<AnkiDeckId, AnkiDeckSettings>>;
  deckDaily: Partial<Record<AnkiDeckId, AnkiDeckDailyProgress>>;
  deckSessions: Partial<Record<AnkiDeckId, AnkiStudySession | null>>;
}

export function createEmptyAnkiEngineState(): StoredAnkiEngineState {
  return {
    deckSettings: {},
    deckDaily: {},
    deckSessions: {},
  };
}

export function getDefaultDeckSettings(deckId: AnkiDeckId): AnkiDeckSettings {
  const meta = ANKI_DECK_META[deckId];
  return {
    dailyNewLimit: meta.category === 'bunpou' ? 5 : 10,
    maxReviewsPerDay: 200,
    targetRetention: DEFAULT_ANKI_SCHEDULING_CONFIG.targetRetention,
    learningStepsMinutes: [...DEFAULT_ANKI_SCHEDULING_CONFIG.learningStepsMinutes],
    relearningStepsMinutes: [...DEFAULT_ANKI_SCHEDULING_CONFIG.relearningStepsMinutes],
    newCardOrder: 'random',
    reviewCardOrder: 'oldest_due',
    resumeInterruptedSession: true,
  };
}

export function sanitizeDeckSettings(
  deckId: AnkiDeckId,
  raw?: Partial<AnkiDeckSettings> | null,
): AnkiDeckSettings {
  const defaults = getDefaultDeckSettings(deckId);
  if (!raw || typeof raw !== 'object') return defaults;

  const dailyNewLimit =
    typeof raw.dailyNewLimit === 'number' && Number.isFinite(raw.dailyNewLimit)
      ? Math.max(0, Math.min(200, Math.round(raw.dailyNewLimit)))
      : defaults.dailyNewLimit;

  const maxReviewsPerDay =
    typeof raw.maxReviewsPerDay === 'number' && Number.isFinite(raw.maxReviewsPerDay)
      ? Math.max(0, Math.min(2000, Math.round(raw.maxReviewsPerDay)))
      : defaults.maxReviewsPerDay;

  const targetRetention =
    typeof raw.targetRetention === 'number' && Number.isFinite(raw.targetRetention)
      ? Math.max(75, Math.min(97, Math.round(raw.targetRetention)))
      : defaults.targetRetention;

  return {
    dailyNewLimit,
    maxReviewsPerDay,
    targetRetention,
    learningStepsMinutes: normalizeStepsMinutes(
      raw.learningStepsMinutes,
      defaults.learningStepsMinutes,
    ),
    relearningStepsMinutes: normalizeStepsMinutes(
      raw.relearningStepsMinutes,
      defaults.relearningStepsMinutes,
    ),
    newCardOrder:
      raw.newCardOrder === 'sequential' ? 'sequential' : 'random',
    reviewCardOrder:
      raw.reviewCardOrder === 'random' ? 'random' : 'oldest_due',
    resumeInterruptedSession:
      typeof raw.resumeInterruptedSession === 'boolean'
        ? raw.resumeInterruptedSession
        : defaults.resumeInterruptedSession,
  };
}

export function getEffectiveDeckSettings(
  engine: StoredAnkiEngineState | undefined,
  deckId: AnkiDeckId,
): AnkiDeckSettings {
  return sanitizeDeckSettings(deckId, engine?.deckSettings?.[deckId]);
}

export function createEmptyDeckDailyProgress(
  todayKey: string = getLocalDateKey(),
): AnkiDeckDailyProgress {
  return {
    dateKey: todayKey,
    newCardIdsToday: [],
    reviewedCardIdsToday: [],
    reviewCompletionsToday: 0,
    extraReviewQuotaToday: 0,
    dailyNewOrderDateKey: '',
    dailyNewOrderIds: [],
  };
}

/**
 * Daily Reset at local 00:00 (Part 4 & Part 11):
 * - Resets only daily counters when local dateKey changes.
 * - Never doubles or accumulates missed new-card quotas.
 * - Never alters or deletes overdue review cards.
 */
export function getOrResetDeckDailyProgress(
  existing: AnkiDeckDailyProgress | undefined,
  todayKey: string = getLocalDateKey(),
): AnkiDeckDailyProgress {
  if (!existing || existing.dateKey !== todayKey) {
    return createEmptyDeckDailyProgress(todayKey);
  }
  return {
    dateKey: todayKey,
    newCardIdsToday: Array.isArray(existing.newCardIdsToday)
      ? [...new Set(existing.newCardIdsToday)]
      : [],
    reviewedCardIdsToday: Array.isArray(existing.reviewedCardIdsToday)
      ? [...new Set(existing.reviewedCardIdsToday)]
      : [],
    reviewCompletionsToday: Math.max(0, Math.round(Number(existing.reviewCompletionsToday) || 0)),
    extraReviewQuotaToday: Math.max(0, Math.round(Number(existing.extraReviewQuotaToday) || 0)),
    dailyNewOrderDateKey:
      typeof existing.dailyNewOrderDateKey === 'string'
        ? existing.dailyNewOrderDateKey
        : '',
    dailyNewOrderIds: Array.isArray(existing.dailyNewOrderIds)
      ? existing.dailyNewOrderIds
      : [],
  };
}

function inferCardCategory(card: AnkiCard): AnkiDeckCategory {
  if (card.category === 'kosakata' || card.category === 'bunpou') {
    return card.category;
  }
  if (card.cardKind === 'bunpou') return 'bunpou';
  return 'kosakata';
}

function inferCardLevel(card: AnkiCard): AnkiDeckLevel {
  if (card.jlptLevel) return card.jlptLevel;
  const src = `${card.deckId ?? ''} ${card.tag} ${card.id}`.toUpperCase();
  if (src.includes('N1')) return 'N1';
  if (src.includes('N2')) return 'N2';
  if (src.includes('N3')) return 'N3';
  if (src.includes('N4')) return 'N4';
  return 'N5';
}

function inferCardDeckId(card: AnkiCard): AnkiDeckId {
  if (card.deckId && isValidAnkiDeckId(card.deckId)) {
    return card.deckId;
  }
  return resolveAnkiDeckId(inferCardCategory(card), inferCardLevel(card));
}

/**
 * Data-layer deck isolation validator (Part 2):
 * Strictly guarantees a session/query for `deckId` ONLY receives cards belonging
 * to that exact combination of Category (Kosakata vs Bunpou) + JLPT Level (N5..N1),
 * deduplicated by Card ID.
 */
export function selectCardsForDeck(
  deckId: AnkiDeckId,
  cards: readonly AnkiCard[],
): AnkiCard[] {
  const meta = ANKI_DECK_META[deckId];
  const seen = new Set<string>();
  const result: AnkiCard[] = [];

  for (const card of cards) {
    if (!card || typeof card.id !== 'string' || seen.has(card.id)) {
      continue;
    }
    const cardCat = inferCardCategory(card);
    const cardLvl = inferCardLevel(card);
    const cardDeck = inferCardDeckId(card);

    if (
      cardDeck !== deckId ||
      cardCat !== meta.category ||
      cardLvl !== meta.jlptLevel
    ) {
      continue;
    }

    seen.add(card.id);
    result.push({
      ...card,
      deckId,
      category: meta.category,
      jlptLevel: meta.jlptLevel,
    });
  }

  return result;
}

/**
 * Unbiased Fisher-Yates shuffle (Part 5).
 * Accepts an injectable RNG for deterministic unit testing.
 */
export function fisherYatesShuffle<T>(
  items: readonly T[],
  rng: () => number = Math.random,
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Soft anti-similarity pass (Part 5):
 * Avoids placing two cards with identical lessonNumber (Bunpou) or identical
 * leading kanji/character + categoryGroup right next to each other when another
 * card is available later in the list.
 */
export function spreadSimilarAdjacentCards(cards: readonly AnkiCard[]): AnkiCard[] {
  if (cards.length <= 2) return [...cards];

  const remaining = [...cards];
  const ordered: AnkiCard[] = [remaining.shift()!];

  const isSimilar = (a: AnkiCard, b: AnkiCard): boolean => {
    if (a.category === 'bunpou' && b.category === 'bunpou') {
      if (a.lessonNumber && b.lessonNumber && a.lessonNumber === b.lessonNumber) {
        return true;
      }
    }
    const aFirst = a.word.replace(/^[~〜]/, '').slice(0, 1);
    const bFirst = b.word.replace(/^[~〜]/, '').slice(0, 1);
    if (aFirst && bFirst && aFirst === bFirst) {
      return true;
    }
    return false;
  };

  while (remaining.length > 0) {
    const prev = ordered[ordered.length - 1];
    const diffIdx = remaining.findIndex((cand) => !isSimilar(prev, cand));
    if (diffIdx >= 0) {
      ordered.push(remaining.splice(diffIdx, 1)[0]);
    } else {
      ordered.push(remaining.shift()!);
    }
  }

  return ordered;
}

/**
 * Ensures a stable Fisher-Yates order of New cards for `deckId` on `todayKey`.
 * - Never reshuffles on component re-renders or page refresh on the same day.
 * - Automatically generates a fresh random order on the next local day.
 */
export function ensureDailyNewCardOrder(
  deckId: AnkiDeckId,
  deckCards: readonly AnkiCard[],
  srsMap: AnkiSrsMap,
  existingDaily: AnkiDeckDailyProgress | undefined,
  todayKey: string = getLocalDateKey(),
  rng: () => number = Math.random,
): AnkiDeckDailyProgress {
  const daily = getOrResetDeckDailyProgress(existingDaily, todayKey);
  const isolated = selectCardsForDeck(deckId, deckCards);
  const newCards = isolated.filter((card) => resolveCardState(srsMap[card.id]) === 'new');
  const newCardMap = new Map(newCards.map((c) => [c.id, c]));

  if (
    daily.dailyNewOrderDateKey === todayKey &&
    daily.dailyNewOrderIds.length > 0
  ) {
    // Keep existing stable order, prune any cards no longer New, append any newly loaded cards shuffled
    const kept = daily.dailyNewOrderIds.filter((id) => newCardMap.has(id));
    const keptSet = new Set(kept);
    const extras = newCards.filter((c) => !keptSet.has(c.id));
    if (extras.length === 0) {
      return {
        ...daily,
        dailyNewOrderIds: kept,
      };
    }
    const shuffledExtras = spreadSimilarAdjacentCards(
      fisherYatesShuffle(extras, rng),
    ).map((c) => c.id);
    return {
      ...daily,
      dailyNewOrderIds: [...kept, ...shuffledExtras],
    };
  }

  const shuffled = spreadSimilarAdjacentCards(
    fisherYatesShuffle(newCards, rng),
  ).map((c) => c.id);

  return {
    ...daily,
    dailyNewOrderDateKey: todayKey,
    dailyNewOrderIds: shuffled,
  };
}

export interface DeckQueueResult {
  deckId: AnkiDeckId;
  todayKey: string;
  dueLearningCards: AnkiCard[];
  dueRelearningCards: AnkiCard[];
  dueReviewCards: AnkiCard[];
  availableNewCards: AnkiCard[];
  waitingLearningCards: AnkiCard[];
  nextLearningDueAt: number | null;
  queueCards: AnkiCard[]; // Ordered ready-now Tempo queue
  remainingNewQuota: number;
  remainingReviewQuota: number;
  totalDueReviewsUnbounded: number;
  overdueCount: number;
  reviewBacklogCount: number;
}

/**
 * Builds the strict priority-ordered Tempo queue for a single deck (Parts 2, 3, 5, 8, 11).
 * Priority:
 *  1. Due Learning & Relearning cards (dueAt <= nowMs), earliest dueAt first
 *  2. Due Review cards (dueDate <= todayKey), oldest dueDate first (or random if configured),
 *     capped by remaining daily review quota (maxReviewsPerDay + extraReviewQuotaToday - reviewCompletionsToday)
 *  3. Available New cards, ordered by persisted Fisher-Yates daily order (or sequential if configured),
 *     capped by remaining daily new quota (dailyNewLimit - newCardIdsToday.length)
 */
export function buildDeckStudyQueue(
  deckId: AnkiDeckId,
  rawCards: readonly AnkiCard[],
  srsMap: AnkiSrsMap,
  settings: AnkiDeckSettings,
  dailyInput: AnkiDeckDailyProgress | undefined,
  nowMs: number = Date.now(),
  rng: () => number = Math.random,
): DeckQueueResult {
  const todayKey = getLocalDateKey(new Date(nowMs));
  const deckCards = selectCardsForDeck(deckId, rawCards);
  const daily = ensureDailyNewCardOrder(
    deckId,
    deckCards,
    srsMap,
    dailyInput,
    todayKey,
    rng,
  );

  const dueLearning: Array<{ card: AnkiCard; dueAt: number }> = [];
  const dueRelearning: Array<{ card: AnkiCard; dueAt: number }> = [];
  const waitingLearning: Array<{ card: AnkiCard; dueAt: number }> = [];
  const allDueReviews: Array<{ card: AnkiCard; dueDate: string; dueAt: number }> = [];
  const newCardsById = new Map<string, AnkiCard>();

  let overdueCount = 0;

  for (const card of deckCards) {
    const record = srsMap[card.id];
    const state = resolveCardState(record);

    if (state === 'suspended') {
      continue;
    }

    if (state === 'new') {
      newCardsById.set(card.id, card);
      continue;
    }

    if (state === 'learning' || state === 'relearning') {
      const cardDueAt = record?.dueAt ?? 0;
      if (cardDueAt <= nowMs) {
        if (state === 'learning') {
          dueLearning.push({ card, dueAt: cardDueAt });
        } else {
          dueRelearning.push({ card, dueAt: cardDueAt });
        }
      } else {
        waitingLearning.push({ card, dueAt: cardDueAt });
      }
      continue;
    }

    if (state === 'review') {
      const dueDate = record?.dueDate ?? todayKey;
      if (dueDate <= todayKey) {
        if (dueDate < todayKey) {
          overdueCount += 1;
        }
        allDueReviews.push({
          card,
          dueDate,
          dueAt: record?.dueAt ?? 0,
        });
      }
    }
  }

  // Sort Learning & Relearning earliest dueAt first
  dueLearning.sort((a, b) => a.dueAt - b.dueAt);
  dueRelearning.sort((a, b) => a.dueAt - b.dueAt);
  waitingLearning.sort((a, b) => a.dueAt - b.dueAt);

  // Sort Review cards (Part 5 & Part 11): oldest due first; ties optionally randomized
  let sortedDueReviews: AnkiCard[];
  if (settings.reviewCardOrder === 'random') {
    sortedDueReviews = fisherYatesShuffle(
      allDueReviews.map((r) => r.card),
      rng,
    );
  } else {
    // Group by dueDate ascending so oldest overdue cards strictly come first;
    // randomize ties within the same dueDate bucket for variety
    const buckets = new Map<string, AnkiCard[]>();
    for (const entry of allDueReviews) {
      const list = buckets.get(entry.dueDate) ?? [];
      list.push(entry.card);
      buckets.set(entry.dueDate, list);
    }
    const orderedDates = Array.from(buckets.keys()).sort();
    sortedDueReviews = [];
    for (const dateKey of orderedDates) {
      const bucket = buckets.get(dateKey) ?? [];
      sortedDueReviews.push(...(bucket.length > 1 ? fisherYatesShuffle(bucket, rng) : bucket));
    }
  }

  const effectiveReviewCap = Math.max(
    0,
    settings.maxReviewsPerDay + daily.extraReviewQuotaToday,
  );
  const remainingReviewQuota = Math.max(
    0,
    effectiveReviewCap - daily.reviewCompletionsToday,
  );
  const cappedDueReviews = sortedDueReviews.slice(0, remainingReviewQuota);
  const reviewBacklogCount = Math.max(
    0,
    sortedDueReviews.length - cappedDueReviews.length,
  );

  // New cards quota (Part 3 & Part 4)
  const remainingNewQuota = Math.max(
    0,
    settings.dailyNewLimit - daily.newCardIdsToday.length,
  );

  let orderedNewPool: AnkiCard[];
  if (settings.newCardOrder === 'sequential') {
    orderedNewPool = deckCards.filter((c) => newCardsById.has(c.id));
  } else {
    orderedNewPool = [];
    for (const id of daily.dailyNewOrderIds) {
      const card = newCardsById.get(id);
      if (card) orderedNewPool.push(card);
    }
    // Include any new cards not yet in dailyNewOrderIds
    if (orderedNewPool.length < newCardsById.size) {
      const included = new Set(orderedNewPool.map((c) => c.id));
      for (const card of newCardsById.values()) {
        if (!included.has(card.id)) orderedNewPool.push(card);
      }
    }
  }

  const availableNewCards = orderedNewPool.slice(0, remainingNewQuota);

  const dueLearningCards = dueLearning.map((x) => x.card);
  const dueRelearningCards = dueRelearning.map((x) => x.card);
  const queueCards = [
    ...dueRelearningCards,
    ...dueLearningCards,
    ...cappedDueReviews,
    ...availableNewCards,
  ];

  return {
    deckId,
    todayKey,
    dueLearningCards,
    dueRelearningCards,
    dueReviewCards: cappedDueReviews,
    availableNewCards,
    waitingLearningCards: waitingLearning.map((x) => x.card),
    nextLearningDueAt: waitingLearning[0]?.dueAt ?? null,
    queueCards,
    remainingNewQuota,
    remainingReviewQuota,
    totalDueReviewsUnbounded: sortedDueReviews.length,
    overdueCount,
    reviewBacklogCount,
  };
}

export interface AnkiDeckStatistics {
  deckId: AnkiDeckId;
  totalCards: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  relearningCount: number;
  suspendedCount: number;
  masteredCount: number; // Additional mastery indicator (subset of reviewCount)
  learnedCount: number; // Non-New active cards (learning + review + relearning)
  progressPercent: number; // learnedCount / totalCards * 100
  dueLearningCount: number;
  dueRelearningCount: number;
  dueReviewCount: number; // Capped by daily review quota
  availableNewCount: number; // Capped by daily new quota
  dueTodayCount: number; // Total Tempo count available right now
  waitingLearningCount: number;
  nextLearningDueAt: number | null;
  overdueCount: number;
  reviewBacklogCount: number;
  completedTodayCount: number;
  newStudiedTodayCount: number;
  reviewsCompletedTodayCount: number;
  totalReviewCount: number;
  accuracyPercent: number; // 0..100 across recorded reviews in this deck
}

/**
 * Strict invariant-checked deck statistics (Part 14):
 * Guarantees `newCount + learningCount + reviewCount + relearningCount + suspendedCount === totalCards`.
 */
export function computeDeckStatistics(
  deckId: AnkiDeckId,
  rawCards: readonly AnkiCard[],
  srsMap: AnkiSrsMap,
  settings: AnkiDeckSettings,
  dailyInput: AnkiDeckDailyProgress | undefined,
  nowMs: number = Date.now(),
): AnkiDeckStatistics {
  const deckCards = selectCardsForDeck(deckId, rawCards);
  const todayKey = getLocalDateKey(new Date(nowMs));
  const daily = getOrResetDeckDailyProgress(dailyInput, todayKey);
  const queueResult = buildDeckStudyQueue(
    deckId,
    deckCards,
    srsMap,
    settings,
    daily,
    nowMs,
  );

  let newCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let relearningCount = 0;
  let suspendedCount = 0;
  let masteredCount = 0;
  let totalReviewCount = 0;
  let passedReviews = 0;

  for (const card of deckCards) {
    const record = srsMap[card.id];
    const state: AnkiCardState = resolveCardState(record);

    switch (state) {
      case 'new':
        newCount += 1;
        break;
      case 'learning':
        learningCount += 1;
        break;
      case 'review':
        reviewCount += 1;
        if (
          record &&
          (record.isMastered ??
            computeIsMastered({
              state,
              repetitions: record.repetitions,
              intervalDays: record.intervalDays,
              easeFactor: record.easeFactor,
            }))
        ) {
          masteredCount += 1;
        }
        break;
      case 'relearning':
        relearningCount += 1;
        break;
      case 'suspended':
        suspendedCount += 1;
        break;
    }

    if (record?.reviewHistory && record.reviewHistory.length > 0) {
      for (const entry of record.reviewHistory) {
        totalReviewCount += 1;
        if (entry.rating !== 'again') {
          passedReviews += 1;
        }
      }
    } else if (record && state !== 'new') {
      // Legacy fallback for cards migrated before reviewHistory existed
      const inferredTotal = Math.max(1, record.repetitions + record.lapses);
      const inferredPassed = Math.max(0, inferredTotal - record.lapses);
      totalReviewCount += inferredTotal;
      passedReviews += inferredPassed;
    }
  }

  const totalCards = deckCards.length;
  // Never count New cards as learned (Part 14)
  const learnedCount = learningCount + reviewCount + relearningCount;
  const progressPercent =
    totalCards > 0 ? Math.round((learnedCount / totalCards) * 100) : 0;
  const accuracyPercent =
    totalReviewCount > 0
      ? Math.round((passedReviews / totalReviewCount) * 100)
      : 0;

  return {
    deckId,
    totalCards,
    newCount,
    learningCount,
    reviewCount,
    relearningCount,
    suspendedCount,
    masteredCount,
    learnedCount,
    progressPercent,
    dueLearningCount: queueResult.dueLearningCards.length,
    dueRelearningCount: queueResult.dueRelearningCards.length,
    dueReviewCount: queueResult.dueReviewCards.length,
    availableNewCount: queueResult.availableNewCards.length,
    dueTodayCount: queueResult.queueCards.length,
    waitingLearningCount: queueResult.waitingLearningCards.length,
    nextLearningDueAt: queueResult.nextLearningDueAt,
    overdueCount: queueResult.overdueCount,
    reviewBacklogCount: queueResult.reviewBacklogCount,
    completedTodayCount:
      daily.newCardIdsToday.length + daily.reviewCompletionsToday,
    newStudiedTodayCount: daily.newCardIdsToday.length,
    reviewsCompletedTodayCount: daily.reviewCompletionsToday,
    totalReviewCount,
    accuracyPercent,
  };
}

function generateSessionId(deckId: AnkiDeckId, nowMs: number): string {
  return `sess_${deckId}_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates a fresh persisted study session OR resumes an interrupted session
 * if relevant for the same deck, scope, and local date (Part 9 & Part 10).
 */
export function createOrResumeDeckSession(params: {
  deckId: AnkiDeckId;
  scope: 'due' | 'all';
  filteredDeckCards: readonly AnkiCard[];
  allDeckCards: readonly AnkiCard[];
  srsMap: AnkiSrsMap;
  settings: AnkiDeckSettings;
  daily: AnkiDeckDailyProgress | undefined;
  existingSession: AnkiStudySession | null | undefined;
  nowMs?: number;
  forceNew?: boolean;
  startCardId?: string;
  rng?: () => number;
}): {
  session: AnkiStudySession;
  daily: AnkiDeckDailyProgress;
  resumed: boolean;
} {
  const nowMs = params.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const todayKey = getLocalDateKey(new Date(nowMs));
  const rng = params.rng ?? Math.random;

  const validFiltered = selectCardsForDeck(params.deckId, params.filteredDeckCards);
  const validAll = selectCardsForDeck(params.deckId, params.allDeckCards);
  const validIdSet = new Set(validFiltered.map((c) => c.id));

  const nextDaily = ensureDailyNewCardOrder(
    params.deckId,
    validAll,
    params.srsMap,
    params.daily,
    todayKey,
    rng,
  );

  // Resume interrupted session if allowed, matching deck/scope/date, and still has remaining cards
  if (
    !params.forceNew &&
    !params.startCardId &&
    params.settings.resumeInterruptedSession &&
    params.existingSession &&
    params.existingSession.deckId === params.deckId &&
    params.existingSession.scope === params.scope &&
    params.existingSession.dateKey === todayKey
  ) {
    const completedSet = new Set(params.existingSession.completedCardIds);
    const cleanedQueue = params.existingSession.queueCardIds.filter((id) =>
      validIdSet.has(id),
    );

    if (cleanedQueue.length > 0) {
      // Find first uncompleted card from currentIndex onward (prevents duplicate review!)
      let idx = Math.max(
        0,
        Math.min(params.existingSession.currentIndex, cleanedQueue.length - 1),
      );
      if (completedSet.has(cleanedQueue[idx])) {
        const nextUncompleted = cleanedQueue.findIndex(
          (id, i) => i >= idx && !completedSet.has(id),
        );
        if (nextUncompleted !== -1) {
          idx = nextUncompleted;
        } else {
          // Entire previous session already finished -> check if newly ready cards exist below
          idx = -1;
        }
      }

      if (idx !== -1) {
        // Also prepend any newly matured learning/relearning cards that became due since interruption
        if (params.scope === 'due') {
          const queueSet = new Set(cleanedQueue);
          const readyNow = buildDeckStudyQueue(
            params.deckId,
            validFiltered,
            params.srsMap,
            params.settings,
            nextDaily,
            nowMs,
            rng,
          );
          const newlyMatured = [
            ...readyNow.dueRelearningCards,
            ...readyNow.dueLearningCards,
          ]
            .map((c) => c.id)
            .filter((id) => !queueSet.has(id) || completedSet.has(id));

          if (newlyMatured.length > 0) {
            const uncompletedRest = cleanedQueue.filter(
              (id) => !completedSet.has(id) && !newlyMatured.includes(id),
            );
            const mergedQueue = [
              ...cleanedQueue.filter((id) => completedSet.has(id) && !newlyMatured.includes(id)),
              ...newlyMatured,
              ...uncompletedRest,
            ];
            const firstNewIdx = mergedQueue.indexOf(newlyMatured[0]);
            return {
              session: {
                ...params.existingSession,
                queueCardIds: mergedQueue,
                currentIndex: Math.max(0, firstNewIdx),
                completedCardIds: params.existingSession.completedCardIds.filter(
                  (id) => !newlyMatured.includes(id),
                ),
                updatedAt: nowIso,
              },
              daily: nextDaily,
              resumed: true,
            };
          }
        }

        return {
          session: {
            ...params.existingSession,
            queueCardIds: cleanedQueue,
            currentIndex: idx,
            updatedAt: nowIso,
          },
          daily: nextDaily,
          resumed: true,
        };
      }
    }
  }

  // Build fresh session
  let queueCardIds: string[];
  if (params.scope === 'due') {
    const built = buildDeckStudyQueue(
      params.deckId,
      validFiltered,
      params.srsMap,
      params.settings,
      nextDaily,
      nowMs,
      rng,
    );
    queueCardIds = built.queueCards.map((c) => c.id);
  } else {
    // 'all' scope shows all cards in the deck without mutating SRS schedule
    queueCardIds = validFiltered.map((c) => c.id);
  }

  let currentIndex = 0;
  if (params.startCardId) {
    const found = queueCardIds.indexOf(params.startCardId);
    if (found !== -1) {
      currentIndex = found;
    } else if (validAll.some((c) => c.id === params.startCardId)) {
      queueCardIds = validAll.map((c) => c.id);
      currentIndex = Math.max(0, queueCardIds.indexOf(params.startCardId));
    }
  }

  return {
    session: {
      sessionId: generateSessionId(params.deckId, nowMs),
      deckId: params.deckId,
      scope: params.scope,
      dateKey: todayKey,
      queueCardIds,
      currentIndex,
      completedCardIds: [],
      startedAt: nowIso,
      updatedAt: nowIso,
    },
    daily: nextDaily,
    resumed: false,
  };
}

export interface ApplyReviewResult {
  nextCardState: AnkiSrsCardState;
  nextDaily: AnkiDeckDailyProgress;
  nextSession: AnkiStudySession | null;
  xpAwarded: number;
  sessionCompleted: boolean;
}

/**
 * Atomic review transaction for a single card rating (Parts 4, 6, 7, 9, 10).
 * - Updates card SRS state with full learning/relearning/review transitions.
 * - Consumes daily new quota once per New card (never double-counted).
 * - Consumes daily review quota once per Review card completion.
 * - Advances session queue safely without duplicate ratings.
 */
export function applyAnkiCardReview(params: {
  deckId: AnkiDeckId;
  card: AnkiCard;
  rating: AnkiRating;
  userId?: string;
  prevCardState: AnkiSrsCardState | undefined;
  settings: AnkiDeckSettings;
  daily: AnkiDeckDailyProgress | undefined;
  session: AnkiStudySession | null;
  nowMs?: number;
}): ApplyReviewResult {
  const nowMs = params.nowMs ?? Date.now();
  const nowDate = new Date(nowMs);
  const nowIso = nowDate.toISOString();
  const todayKey = getLocalDateKey(nowDate);
  const meta = ANKI_DECK_META[params.deckId];

  const prevState = resolveCardState(params.prevCardState);
  const nextCardState = scheduleAnkiCard(params.prevCardState, params.rating, {
    cardId: params.card.id,
    userId: params.userId,
    deckId: params.deckId,
    category: meta.category,
    jlptLevel: meta.jlptLevel,
    config: {
      targetRetention: params.settings.targetRetention,
      learningStepsMinutes: params.settings.learningStepsMinutes,
      relearningStepsMinutes: params.settings.relearningStepsMinutes,
    },
    nowMs,
    todayKey,
  });

  // Update per-deck daily progress
  const baseDaily = getOrResetDeckDailyProgress(params.daily, todayKey);
  const nextNewIds = [...baseDaily.newCardIdsToday];
  const nextReviewedIds = [...baseDaily.reviewedCardIdsToday];
  let nextReviewCompletions = baseDaily.reviewCompletionsToday;

  if (prevState === 'new' && !nextNewIds.includes(params.card.id)) {
    nextNewIds.push(params.card.id);
  } else if (prevState === 'review') {
    nextReviewCompletions += 1;
    if (!nextReviewedIds.includes(params.card.id)) {
      nextReviewedIds.push(params.card.id);
    }
  }

  const nextDaily: AnkiDeckDailyProgress = {
    ...baseDaily,
    newCardIdsToday: nextNewIds,
    reviewedCardIdsToday: nextReviewedIds,
    reviewCompletionsToday: nextReviewCompletions,
    // Prune rated card from today's remaining dailyNewOrderIds if it was New
    dailyNewOrderIds:
      prevState === 'new'
        ? baseDaily.dailyNewOrderIds.filter((id) => id !== params.card.id)
        : baseDaily.dailyNewOrderIds,
  };

  // Advance session state without re-inserting learning/relearning cards before their step timer!
  let nextSession: AnkiStudySession | null = params.session;
  let sessionCompleted = false;

  if (params.session && params.session.deckId === params.deckId) {
    const completedSet = new Set(params.session.completedCardIds);
    completedSet.add(params.card.id);
    const completedCardIds = Array.from(completedSet);

    // Find next uncompleted card in the current session queue
    const queue = params.session.queueCardIds;
    let nextIdx = -1;
    for (let i = params.session.currentIndex + 1; i < queue.length; i++) {
      if (!completedSet.has(queue[i])) {
        nextIdx = i;
        break;
      }
    }
    if (nextIdx === -1) {
      for (let i = 0; i < params.session.currentIndex; i++) {
        if (!completedSet.has(queue[i])) {
          nextIdx = i;
          break;
        }
      }
    }

    if (nextIdx === -1) {
      sessionCompleted = true;
      nextSession = null;
    } else {
      nextSession = {
        ...params.session,
        currentIndex: nextIdx,
        completedCardIds,
        updatedAt: nowIso,
      };
    }
  }

  return {
    nextCardState,
    nextDaily,
    nextSession,
    xpAwarded: ANKI_RATING_XP[params.rating],
    sessionCompleted,
  };
}
