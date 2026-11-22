import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALL_ANKI_DECK_IDS,
  applyAnkiCardReview,
  buildDeckStudyQueue,
  computeDeckStatistics,
  createEmptyAnkiEngineState,
  createOrResumeDeckSession,
  ensureDailyNewCardOrder,
  getDefaultDeckSettings,
  getEffectiveDeckSettings,
  getOrResetDeckDailyProgress,
  sanitizeDeckSettings,
  selectCardsForDeck,
  type AnkiDeckDailyProgress,
  type StoredAnkiEngineState,
} from './ankiEngine.ts';
import type { AnkiCard, AnkiDeckId } from './ankiParser.ts';
import {
  computeIsMastered,
  resolveCardState,
  scheduleAnkiCard,
  suspendAnkiCard,
  unsuspendAnkiCard,
  type AnkiSrsMap,
} from './ankiSrs.ts';
import {
  getAppStateStorageKey,
  loadUnifiedAppState,
  saveUnifiedAppState,
} from './storage.ts';
import { getLocalDateKey, shiftDateKey } from './studyAnalytics.ts';

function makeSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function makeVocabDeck(
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1',
  count: number,
): AnkiCard[] {
  const words = [
    'かばん',
    'みず',
    'ねこ',
    'いぬ',
    'やま',
    'かわ',
    'そら',
    'ほし',
    'あめ',
    'かぜ',
    'はな',
    'き',
    'みち',
    'えき',
    'でんしゃ',
    'くるま',
    'ほん',
    'ぺん',
    'つくえ',
    'いす',
  ];
  return Array.from({ length: count }, (_, idx) => ({
    id: `jlpt-${level.toLowerCase()}-${idx + 1}`,
    index: idx,
    deckId: level,
    category: 'kosakata',
    jlptLevel: level,
    cardKind: 'vocab',
    word: `${words[idx % words.length]}${idx + 1}`,
    furigana: `${words[idx % words.length]}${idx + 1}`,
    partOfSpeech: 'Kata benda',
    categoryGroup: 'Kata benda',
    readingTerm: `${words[idx % words.length]}${idx + 1}`,
    meaning: `Arti ${level} #${idx + 1}`,
    examples: [{ jp: `例文${idx + 1}です。`, id: `Contoh ${idx + 1}.` }],
    tag: `JLPT_${level}`,
  }));
}

function makeBunpouDeck(
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1',
  count: number,
): AnkiCard[] {
  const deckId = `${level}_BUNPOU` as AnkiDeckId;
  return Array.from({ length: count }, (_, idx) => ({
    id: `bunpou-${level.toLowerCase()}-${idx + 1}`,
    index: idx,
    deckId,
    category: 'bunpou',
    jlptLevel: level,
    cardKind: 'bunpou',
    code: `${level}-${idx + 1}`,
    word: `〜パターン${idx + 1}`,
    furigana: `〜パターン${idx + 1}`,
    partOfSpeech: `Pola Bunpou ${level}`,
    categoryGroup: 'Kata keterangan & Lainnya',
    readingTerm: `〜パターン${idx + 1}`,
    meaning: `Arti pola ${level} #${idx + 1}`,
    formula: `V辞書形 + パターン${idx + 1}`,
    lessonNumber: (idx % 5) + 1,
    examples: [{ jp: `文法例文${idx + 1}。`, id: `Contoh bunpou ${idx + 1}.` }],
    tag: `BUNPOU_${level}`,
  }));
}

// TEST 1 — Kosakata N5 Daily Limit (10/day default, NOT all cards)
test('TEST 1: Kosakata N5 Tempo shows 10 new cards by default, never all cards', () => {
  const n5Cards = makeVocabDeck('N5', 100);
  const srsMap: AnkiSrsMap = {};
  const settings = getDefaultDeckSettings('N5');
  assert.equal(settings.dailyNewLimit, 10);
  assert.equal(settings.maxReviewsPerDay, 200);

  const nowMs = new Date(2026, 4, 10, 9, 0, 0).getTime();
  const queue = buildDeckStudyQueue(
    'N5',
    n5Cards,
    srsMap,
    settings,
    undefined,
    nowMs,
    makeSeededRng(42),
  );
  const stats = computeDeckStatistics(
    'N5',
    n5Cards,
    srsMap,
    settings,
    undefined,
    nowMs,
  );

  assert.equal(queue.availableNewCards.length, 10);
  assert.equal(queue.queueCards.length, 10);
  assert.equal(stats.dueTodayCount, 10);
  assert.equal(stats.totalCards, 100);
});

// TEST 2 — Bunpou N5 Daily Limit (5/day default, completely independent from Kosakata N5)
test('TEST 2: Bunpou N5 Tempo shows 5 new cards independently from Kosakata N5', () => {
  const kosakataN5 = makeVocabDeck('N5', 50);
  const bunpouN5 = makeBunpouDeck('N5', 30);
  const srsMap: AnkiSrsMap = {};
  const engine = createEmptyAnkiEngineState();
  const nowMs = new Date(2026, 4, 10, 10, 0, 0).getTime();

  const kSettings = getEffectiveDeckSettings(engine, 'N5');
  const bSettings = getEffectiveDeckSettings(engine, 'N5_BUNPOU');
  assert.equal(kSettings.dailyNewLimit, 10);
  assert.equal(bSettings.dailyNewLimit, 5);

  // Consume all 10 new cards in Kosakata N5
  let kDaily: AnkiDeckDailyProgress | undefined;
  for (let i = 0; i < 10; i++) {
    const res = applyAnkiCardReview({
      deckId: 'N5',
      card: kosakataN5[i],
      rating: 'easy',
      prevCardState: srsMap[kosakataN5[i].id],
      settings: kSettings,
      daily: kDaily,
      session: null,
      nowMs,
    });
    srsMap[kosakataN5[i].id] = res.nextCardState;
    kDaily = res.nextDaily;
  }

  const kStats = computeDeckStatistics(
    'N5',
    kosakataN5,
    srsMap,
    kSettings,
    kDaily,
    nowMs,
  );
  const bStats = computeDeckStatistics(
    'N5_BUNPOU',
    bunpouN5,
    srsMap,
    bSettings,
    engine.deckDaily.N5_BUNPOU,
    nowMs,
  );

  assert.equal(kStats.availableNewCount, 0);
  assert.equal(bStats.availableNewCount, 5);
  assert.equal(bStats.dueTodayCount, 5);
});

// TEST 3 — Deck Isolation (zero cross-category or cross-level leakage at data layer)
test('TEST 3: Data-layer validator strictly isolates all 10 decks without leakage', () => {
  const mixedPool: AnkiCard[] = [
    ...makeVocabDeck('N5', 15),
    ...makeVocabDeck('N4', 15),
    ...makeVocabDeck('N3', 15),
    ...makeBunpouDeck('N5', 10),
    ...makeBunpouDeck('N3', 10),
  ];

  const onlyKosakataN5 = selectCardsForDeck('N5', mixedPool);
  assert.equal(onlyKosakataN5.length, 15);
  assert.ok(
    onlyKosakataN5.every(
      (c) => c.deckId === 'N5' && c.category === 'kosakata' && c.jlptLevel === 'N5',
    ),
  );

  const onlyKosakataN4 = selectCardsForDeck('N4', mixedPool);
  assert.equal(onlyKosakataN4.length, 15);
  assert.ok(
    onlyKosakataN4.every(
      (c) => c.deckId === 'N4' && c.category === 'kosakata' && c.jlptLevel === 'N4',
    ),
  );

  const onlyBunpouN5 = selectCardsForDeck('N5_BUNPOU', mixedPool);
  assert.equal(onlyBunpouN5.length, 10);
  assert.ok(
    onlyBunpouN5.every(
      (c) => c.deckId === 'N5_BUNPOU' && c.category === 'bunpou' && c.jlptLevel === 'N5',
    ),
  );

  // Even if mixedPool is passed directly to buildDeckStudyQueue, zero foreign cards leak in
  const q = buildDeckStudyQueue(
    'N3_BUNPOU',
    mixedPool,
    {},
    getDefaultDeckSettings('N3_BUNPOU'),
    undefined,
    Date.now(),
    makeSeededRng(7),
  );
  assert.equal(q.queueCards.length, 5);
  assert.ok(
    q.queueCards.every(
      (c) => c.deckId === 'N3_BUNPOU' && c.category === 'bunpou' && c.jlptLevel === 'N3',
    ),
  );
});

// TEST 4 — Randomization (Fisher-Yates, stable within day, refreshed next day)
test('TEST 4: New cards are randomized via Fisher-Yates, stable same day, refreshed next day', () => {
  const n5Cards = makeVocabDeck('N5', 40);
  const sequentialIds = n5Cards.slice(0, 10).map((c) => c.id);

  const day1 = '2026-05-10';
  const day2 = '2026-05-11';

  const dailyDay1 = ensureDailyNewCardOrder(
    'N5',
    n5Cards,
    {},
    undefined,
    day1,
    makeSeededRng(12345),
  );

  // Randomized order differs from naive sequential 1..10
  assert.notDeepEqual(dailyDay1.dailyNewOrderIds.slice(0, 10), sequentialIds);

  // Re-calling on the same day preserves exact order (does NOT reshuffle on re-render/refresh)
  const dailyDay1Again = ensureDailyNewCardOrder(
    'N5',
    n5Cards,
    {},
    dailyDay1,
    day1,
    makeSeededRng(99999),
  );
  assert.deepEqual(
    dailyDay1Again.dailyNewOrderIds.slice(0, 10),
    dailyDay1.dailyNewOrderIds.slice(0, 10),
  );

  // Next day generates a fresh randomized order
  const dailyDay2 = ensureDailyNewCardOrder(
    'N5',
    n5Cards,
    {},
    dailyDay1,
    day2,
    makeSeededRng(54321),
  );
  assert.equal(dailyDay2.dailyNewOrderDateKey, day2);
  assert.notDeepEqual(
    dailyDay2.dailyNewOrderIds.slice(0, 10),
    dailyDay1.dailyNewOrderIds.slice(0, 10),
  );
});

// TEST 5 — Rating "Lagi" (Learning/Relearning step wait + dueAt reappear)
test('TEST 5: Rating "again" schedules learning/relearning step, waits until dueAt, then reappears', () => {
  const n5Cards = makeVocabDeck('N5', 15);
  const settings = getDefaultDeckSettings('N5'); // learning [1, 10], relearning [10]
  const srsMap: AnkiSrsMap = {};
  const t0 = new Date(2026, 4, 10, 9, 0, 0).getTime();

  // Rate New card #0 as "again" -> enters Learning step 0 (1 minute)
  const resNewAgain = applyAnkiCardReview({
    deckId: 'N5',
    card: n5Cards[0],
    rating: 'again',
    prevCardState: undefined,
    settings,
    daily: undefined,
    session: null,
    nowMs: t0,
  });
  srsMap[n5Cards[0].id] = resNewAgain.nextCardState;
  assert.equal(resNewAgain.nextCardState.state, 'learning');
  assert.equal(resNewAgain.nextCardState.dueAt, t0 + 60_000);

  // Immediately after (t0 + 10s), card is waiting and NOT shown early in queue
  const qTooEarly = buildDeckStudyQueue(
    'N5',
    n5Cards,
    srsMap,
    settings,
    resNewAgain.nextDaily,
    t0 + 10_000,
    makeSeededRng(1),
  );
  assert.ok(!qTooEarly.queueCards.some((c) => c.id === n5Cards[0].id));
  assert.ok(qTooEarly.waitingLearningCards.some((c) => c.id === n5Cards[0].id));

  // Once 1 minute elapses (t0 + 61s), card reappears at head of Tempo queue
  const qMatured = buildDeckStudyQueue(
    'N5',
    n5Cards,
    srsMap,
    settings,
    resNewAgain.nextDaily,
    t0 + 61_000,
    makeSeededRng(1),
  );
  assert.equal(qMatured.queueCards[0]?.id, n5Cards[0].id);
  assert.equal(qMatured.dueLearningCards.length, 1);

  // Test Review card lapsed with "again" -> Relearning step 0 (10 minutes)
  const graduatedCard = scheduleAnkiCard(undefined, 'easy', {
    cardId: n5Cards[1].id,
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    nowMs: t0,
  });
  assert.equal(graduatedCard.state, 'review');

  const lapsed = scheduleAnkiCard(graduatedCard, 'again', {
    cardId: n5Cards[1].id,
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    config: settings,
    nowMs: t0 + 5 * 86_400_000,
  });
  assert.equal(lapsed.state, 'relearning');
  assert.equal(lapsed.lapses, 1);
  assert.equal(lapsed.dueAt, t0 + 5 * 86_400_000 + 10 * 60_000);
});

// TEST 6 — Rating "Bagus" & "Mudah" (Learning graduation & SM-2 interval growth)
test('TEST 6: Rating "good" graduates through learning steps and "easy" graduates immediately with future dueDate', () => {
  const settings = getDefaultDeckSettings('N5'); // learning [1, 10]
  const t0 = new Date(2026, 4, 10, 9, 0, 0).getTime();
  const todayKey = getLocalDateKey(new Date(t0));

  // New -> Good (step 0 -> step 1: 10 minutes)
  const step1 = scheduleAnkiCard(undefined, 'good', {
    cardId: 'c-good',
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    config: settings,
    nowMs: t0,
    todayKey,
  });
  assert.equal(step1.state, 'learning');
  assert.equal(step1.learningStepIndex, 1);
  assert.equal(step1.dueAt, t0 + 10 * 60_000);

  // Learning step 1 -> Good -> graduates to Review (interval >= 1 day, future dueDate)
  const graduated = scheduleAnkiCard(step1, 'good', {
    cardId: 'c-good',
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    config: settings,
    nowMs: t0 + 10 * 60_000,
    todayKey,
  });
  assert.equal(graduated.state, 'review');
  assert.ok(graduated.intervalDays >= 1);
  assert.ok(graduated.dueDate > todayKey);

  // New -> Easy -> graduates directly to Review with >= 4 days interval
  const easyGrad = scheduleAnkiCard(undefined, 'easy', {
    cardId: 'c-easy',
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    config: settings,
    nowMs: t0,
    todayKey,
  });
  assert.equal(easyGrad.state, 'review');
  assert.ok(easyGrad.intervalDays >= 4);
  assert.equal(easyGrad.dueDate, shiftDateKey(todayKey, easyGrad.intervalDays));
});

// TEST 7 — Local 00:00 Daily Reset (resets quota cleanly, never doubles skipped days, keeps overdue reviews)
test('TEST 7: Local midnight reset refreshes daily quota without doubling or deleting overdue reviews', () => {
  const n5Cards = makeVocabDeck('N5', 40);
  const settings = getDefaultDeckSettings('N5');
  const srsMap: AnkiSrsMap = {};

  const day1Ms = new Date(2026, 4, 10, 23, 50, 0).getTime();
  const day1Key = getLocalDateKey(new Date(day1Ms));

  // Complete all 10 new cards on Day 1
  let daily: AnkiDeckDailyProgress | undefined;
  for (let i = 0; i < 10; i++) {
    const r = applyAnkiCardReview({
      deckId: 'N5',
      card: n5Cards[i],
      rating: 'easy',
      prevCardState: srsMap[n5Cards[i].id],
      settings,
      daily,
      session: null,
      nowMs: day1Ms,
    });
    srsMap[n5Cards[i].id] = r.nextCardState;
    daily = r.nextDaily;
  }

  // Remaining new quota on Day 1 is 0
  const qEndOfDay1 = buildDeckStudyQueue(
    'N5',
    n5Cards,
    srsMap,
    settings,
    daily,
    day1Ms,
    makeSeededRng(3),
  );
  assert.equal(qEndOfDay1.remainingNewQuota, 0);
  assert.equal(qEndOfDay1.availableNewCards.length, 0);

  // Skip 3 full days (user returns on Day 4 at 00:01 local time)
  const day4Ms = new Date(2026, 4, 13, 0, 1, 0).getTime();
  const day4Key = getLocalDateKey(new Date(day4Ms));
  assert.notEqual(day4Key, day1Key);

  const resetDaily = getOrResetDeckDailyProgress(daily, day4Key);
  assert.equal(resetDaily.dateKey, day4Key);
  assert.equal(resetDaily.newCardIdsToday.length, 0);

  // Quota is strictly 10 again (NEVER doubled to 30!)
  const qDay4 = buildDeckStudyQueue(
    'N5',
    n5Cards,
    srsMap,
    settings,
    daily,
    day4Ms,
    makeSeededRng(4),
  );
  assert.equal(qDay4.remainingNewQuota, 10);
  assert.equal(qDay4.availableNewCards.length, 10);

  // Verify existing review dueDates were NOT altered
  for (let i = 0; i < 10; i++) {
    assert.equal(srsMap[n5Cards[i].id].dueDate, shiftDateKey(day1Key, 4));
  }
});

// TEST 8 — Missed-Day Backlog (caps at maxReviewsPerDay, oldest overdue first, optional quota extension)
test('TEST 8: Missed-day backlog caps reviews at 200/day, prioritizes oldest due first, supports optional +20 extension', () => {
  const n5Cards = makeVocabDeck('N5', 240);
  const settings = getDefaultDeckSettings('N5'); // maxReviewsPerDay: 200
  const todayMs = new Date(2026, 4, 20, 9, 0, 0).getTime();
  const todayKey = getLocalDateKey(new Date(todayMs));
  const srsMap: AnkiSrsMap = {};

  // Make 225 cards overdue across different past dates (oldest 10 days ago)
  for (let i = 0; i < 225; i++) {
    const daysAgo = (i % 10) + 1;
    const dueDate = shiftDateKey(todayKey, -daysAgo);
    srsMap[n5Cards[i].id] = {
      cardId: n5Cards[i].id,
      deckId: 'N5',
      category: 'kosakata',
      jlptLevel: 'N5',
      state: 'review',
      easeFactor: 2.5,
      intervalDays: 6,
      repetitions: 2,
      lapses: 0,
      learningStepIndex: 0,
      dueDate,
      dueAt: todayMs - daysAgo * 86_400_000,
      lastReviewedAt: new Date(todayMs - (daysAgo + 6) * 86_400_000).toISOString(),
      isMastered: false,
      reviewHistory: [],
    };
  }

  const q = buildDeckStudyQueue(
    'N5',
    n5Cards,
    srsMap,
    settings,
    undefined,
    todayMs,
    makeSeededRng(8),
  );

  // Strictly capped at 200 reviews today + 25 in backlog
  assert.equal(q.dueReviewCards.length, 200);
  assert.equal(q.overdueCount, 225);
  assert.equal(q.reviewBacklogCount, 25);

  // First card in review queue must be from the oldest overdue date (-10 days)
  const oldestDueDate = shiftDateKey(todayKey, -10);
  assert.equal(srsMap[q.dueReviewCards[0].id].dueDate, oldestDueDate);

  // User optionally extends today's review cap by +20
  const extendedDaily: AnkiDeckDailyProgress = {
    ...getOrResetDeckDailyProgress(undefined, todayKey),
    extraReviewQuotaToday: 20,
  };
  const qExtended = buildDeckStudyQueue(
    'N5',
    n5Cards,
    srsMap,
    settings,
    extendedDaily,
    todayMs,
    makeSeededRng(8),
  );
  assert.equal(qExtended.dueReviewCards.length, 220);
  assert.equal(qExtended.reviewBacklogCount, 5);
});

// TEST 9 — Interrupted Session Resume & Zero Duplicate Reviews
test('TEST 9: Interrupted session persists progress and resumes at exact next card without duplicates', () => {
  const n5Cards = makeVocabDeck('N5', 30);
  const settings = getDefaultDeckSettings('N5');
  const srsMap: AnkiSrsMap = {};
  const t0 = new Date(2026, 4, 10, 14, 0, 0).getTime();

  const started = createOrResumeDeckSession({
    deckId: 'N5',
    scope: 'due',
    filteredDeckCards: n5Cards,
    allDeckCards: n5Cards,
    srsMap,
    settings,
    daily: undefined,
    existingSession: null,
    nowMs: t0,
    rng: makeSeededRng(99),
  });

  assert.equal(started.resumed, false);
  assert.equal(started.session.queueCardIds.length, 10);

  let currentSession = started.session;
  let currentDaily = started.daily;
  const ratedIds: string[] = [];

  // Rate 3 cards then interrupt (close modal / refresh browser)
  for (let i = 0; i < 3; i++) {
    const cardId = currentSession.queueCardIds[currentSession.currentIndex];
    const card = n5Cards.find((c) => c.id === cardId)!;
    const res = applyAnkiCardReview({
      deckId: 'N5',
      card,
      rating: 'easy',
      prevCardState: srsMap[card.id],
      settings,
      daily: currentDaily,
      session: currentSession,
      nowMs: t0 + i * 5_000,
    });
    srsMap[card.id] = res.nextCardState;
    currentDaily = res.nextDaily;
    assert.ok(res.nextSession !== null);
    currentSession = res.nextSession;
    ratedIds.push(card.id);
  }

  assert.equal(currentSession.currentIndex, 3);
  assert.equal(currentSession.completedCardIds.length, 3);

  // Resume session after simulated browser refresh
  const resumed = createOrResumeDeckSession({
    deckId: 'N5',
    scope: 'due',
    filteredDeckCards: n5Cards,
    allDeckCards: n5Cards,
    srsMap,
    settings,
    daily: currentDaily,
    existingSession: currentSession,
    nowMs: t0 + 30_000,
    rng: makeSeededRng(777),
  });

  assert.equal(resumed.resumed, true);
  assert.equal(resumed.session.currentIndex, 3);
  assert.equal(resumed.session.completedCardIds.length, 3);
  // Active card on resume is NOT one of the 3 already-rated cards
  const nextCardId = resumed.session.queueCardIds[resumed.session.currentIndex];
  assert.ok(!ratedIds.includes(nextCardId));
});

// TEST 10 — Mode "Semua" Read-Only Safety
test('TEST 10: Opening Mode "Semua" never mutates SRS schedules or due dates', () => {
  const n5Cards = makeVocabDeck('N5', 25);
  const settings = getDefaultDeckSettings('N5');
  const t0 = new Date(2026, 4, 10, 15, 0, 0).getTime();

  const existingRecord = scheduleAnkiCard(undefined, 'easy', {
    cardId: n5Cards[0].id,
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    nowMs: t0,
  });
  const srsMap: AnkiSrsMap = { [n5Cards[0].id]: { ...existingRecord } };
  const snapshotBefore = JSON.stringify(srsMap);

  const allSession = createOrResumeDeckSession({
    deckId: 'N5',
    scope: 'all',
    filteredDeckCards: n5Cards,
    allDeckCards: n5Cards,
    srsMap,
    settings,
    daily: undefined,
    existingSession: null,
    nowMs: t0,
  });

  assert.equal(allSession.session.queueCardIds.length, 25);
  assert.equal(JSON.stringify(srsMap), snapshotBefore);
});

// TEST 11 — Per-Deck Settings Isolation
test('TEST 11: Changing settings on one deck never alters any other deck', () => {
  const engine: StoredAnkiEngineState = createEmptyAnkiEngineState();
  engine.deckSettings.N5 = sanitizeDeckSettings('N5', {
    dailyNewLimit: 25,
    maxReviewsPerDay: 120,
    targetRetention: 95,
    learningStepsMinutes: [2, 15],
  });

  const n5Settings = getEffectiveDeckSettings(engine, 'N5');
  assert.equal(n5Settings.dailyNewLimit, 25);
  assert.equal(n5Settings.maxReviewsPerDay, 120);
  assert.equal(n5Settings.targetRetention, 95);
  assert.deepEqual(n5Settings.learningStepsMinutes, [2, 15]);

  // All other 9 decks retain their independent defaults
  for (const id of ALL_ANKI_DECK_IDS) {
    if (id === 'N5') continue;
    const other = getEffectiveDeckSettings(engine, id);
    const expectedNew = id.endsWith('_BUNPOU') ? 5 : 10;
    assert.equal(other.dailyNewLimit, expectedNew);
    assert.equal(other.maxReviewsPerDay, 200);
    assert.equal(other.targetRetention, 90);
    assert.deepEqual(other.learningStepsMinutes, [1, 10]);
  }
});

// TEST 12 — Statistics Invariant, Mastered Criteria, Suspend/Unsuspend, and Multi-User Storage Isolation
test('TEST 12: Statistics invariant holds across all 5 states + Mastered + Suspend + Multi-user isolation', () => {
  const n5Cards = makeVocabDeck('N5', 20);
  const settings = getDefaultDeckSettings('N5');
  const srsMap: AnkiSrsMap = {};
  const t0 = new Date(2026, 4, 10, 9, 0, 0).getTime();

  // Card 0: Learning
  srsMap[n5Cards[0].id] = scheduleAnkiCard(undefined, 'again', {
    cardId: n5Cards[0].id,
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    config: settings,
    nowMs: t0,
  });

  // Card 1: Review (not yet Mastered)
  srsMap[n5Cards[1].id] = scheduleAnkiCard(undefined, 'easy', {
    cardId: n5Cards[1].id,
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    config: settings,
    nowMs: t0,
  });

  // Card 2: Mastered (Review + repetitions >= 3 + intervalDays >= 21 + easeFactor >= 2.0)
  let c2 = scheduleAnkiCard(undefined, 'easy', {
    cardId: n5Cards[2].id,
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    config: settings,
    nowMs: t0,
  });
  c2 = scheduleAnkiCard(c2, 'easy', {
    cardId: n5Cards[2].id,
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    config: settings,
    nowMs: t0 + 5 * 86_400_000,
  });
  c2 = scheduleAnkiCard(c2, 'easy', {
    cardId: n5Cards[2].id,
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    config: settings,
    nowMs: t0 + 20 * 86_400_000,
  });
  assert.equal(c2.state, 'review');
  assert.ok(c2.repetitions >= 3);
  assert.ok(c2.intervalDays >= 21);
  assert.ok(c2.easeFactor >= 2.0);
  assert.equal(c2.isMastered, true);
  assert.equal(
    computeIsMastered({
      state: resolveCardState(c2),
      repetitions: c2.repetitions,
      intervalDays: c2.intervalDays,
      easeFactor: c2.easeFactor,
    }),
    true,
  );
  srsMap[n5Cards[2].id] = c2;

  // Card 3: Relearning (lapsed from Mastered -> no longer Mastered!)
  const c3Lapsed = scheduleAnkiCard(c2, 'again', {
    cardId: n5Cards[3].id,
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    config: settings,
    nowMs: t0 + 25 * 86_400_000,
  });
  assert.equal(c3Lapsed.state, 'relearning');
  assert.equal(c3Lapsed.isMastered, false);
  srsMap[n5Cards[3].id] = c3Lapsed;

  // Card 4: Suspended
  srsMap[n5Cards[4].id] = suspendAnkiCard(
    undefined,
    {
      cardId: n5Cards[4].id,
      deckId: 'N5',
      category: 'kosakata',
      jlptLevel: 'N5',
    },
    t0,
  );

  const stats = computeDeckStatistics(
    'N5',
    n5Cards,
    srsMap,
    settings,
    undefined,
    t0,
  );

  // Strict invariant: New + Learning + Review + Relearning + Suspended === Total Cards
  assert.equal(
    stats.newCount +
      stats.learningCount +
      stats.reviewCount +
      stats.relearningCount +
      stats.suspendedCount,
    stats.totalCards,
  );
  assert.equal(stats.newCount, 15);
  assert.equal(stats.learningCount, 1);
  assert.equal(stats.reviewCount, 2);
  assert.equal(stats.relearningCount, 1);
  assert.equal(stats.suspendedCount, 1);
  assert.equal(stats.masteredCount, 1);
  // Learned never counts New or Suspended
  assert.equal(stats.learnedCount, 4);

  // Unsuspending an un-reviewed card restores it cleanly back to 'new' (undefined SRS entry)
  const restored = unsuspendAnkiCard(srsMap[n5Cards[4].id], t0);
  assert.equal(resolveCardState(restored), 'new');

  // Multi-user storage key isolation (User A vs User B)
  assert.notEqual(
    getAppStateStorageKey('user_alpha_1'),
    getAppStateStorageKey('user_beta_2'),
  );

  const mem = new Map<string, string>();
  const mockWindow = {
    localStorage: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
    },
  };
  const prevWindow = globalThis.window;
  (globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;
  try {
    const stateA = loadUnifiedAppState('user_alpha_1');
    stateA.ankiSrs['card-a'] = c2;
    stateA.ankiEngine.deckSettings.N5 = sanitizeDeckSettings('N5', {
      dailyNewLimit: 33,
    });
    saveUnifiedAppState(stateA, 'user_alpha_1');

    const stateB = loadUnifiedAppState('user_beta_2');
    assert.equal(stateB.ankiSrs['card-a'], undefined);
    assert.equal(stateB.ankiEngine.deckSettings.N5, undefined);

    const reloadedA = loadUnifiedAppState('user_alpha_1');
    assert.equal(reloadedA.ankiSrs['card-a']?.isMastered, true);
    assert.equal(reloadedA.ankiEngine.deckSettings.N5?.dailyNewLimit, 33);
  } finally {
    (globalThis as unknown as { window: unknown }).window = prevWindow;
  }
});
