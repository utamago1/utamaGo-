import type { ChallengeQuestion, ChallengeStage } from '../data/challengeLevels';
import type { JlptLevel } from '../data/utamagoContent';
import type { AnkiCard } from './ankiParser';
import { resolveCardState, type AnkiSrsMap } from './ankiSrs';
import type {
  BunpouComparisonEntry,
  BunpouComparisonGroup,
} from './bunpouComparison';
import type { BunpouN2Item } from './bunpouN2Parser';
import type { DifficultCardEntry } from './homeSummary';
import { highlightJapaneseSentence } from './japaneseHighlight';

export type DictionaryLevelFilter = 'ALL' | JlptLevel;
export type DictionaryStatusFilter = 'ALL' | 'DIFFICULT' | 'LEARNED';
export type DictionaryCardStatus = 'new' | 'learning' | 'difficult' | 'mastered';

export interface DictionarySearchItem {
  card: AnkiCard;
  level: JlptLevel;
  status: DictionaryCardStatus;
  lapses: number;
  isDifficult: boolean;
}

// ============================================================================
// Deterministic PRNG Helpers (100% offline, instant, zero Math.random jitter)
// ============================================================================

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function normalizeQuery(text: string): string {
  return text.trim().toLowerCase();
}

function cleanBunpouLabel(pattern: string): string {
  return pattern.replace(/\s+/g, ' ').trim();
}

function firstMeaningClause(meaning: string): string {
  const clean = meaning.replace(/\s+/g, ' ').trim();
  if (clean.length <= 72) return clean;
  const split = clean.split(/[;。]/)[0]?.trim();
  if (split && split.length >= 8 && split.length <= 80) return split;
  return `${clean.slice(0, 69).trim()}…`;
}

// ============================================================================
// 1. Dictionary Search & Status Resolution (Kamus Kosakata N5–N1)
// ============================================================================

export function resolveDictionaryCardStatus(
  cardId: string,
  ankiSrs: AnkiSrsMap,
  againSet: ReadonlySet<string>,
): { status: DictionaryCardStatus; lapses: number; isDifficult: boolean } {
  const rec = ankiSrs[cardId];
  const state = resolveCardState(rec);
  const lapses = rec?.lapses ?? 0;
  const isDifficult =
    againSet.has(cardId) || state === 'relearning' || lapses >= 1;

  if (isDifficult) {
    return { status: 'difficult', lapses: Math.max(lapses, againSet.has(cardId) ? 1 : 0), isDifficult: true };
  }
  if (!rec || state === 'new') {
    return { status: 'new', lapses: 0, isDifficult: false };
  }
  if (state === 'review' && (rec.intervalDays >= 14 || rec.repetitions >= 3)) {
    return { status: 'mastered', lapses: 0, isDifficult: false };
  }
  return { status: 'learning', lapses: 0, isDifficult: false };
}

export function searchDictionaryCards(params: {
  cards: readonly AnkiCard[];
  query: string;
  level: DictionaryLevelFilter;
  status: DictionaryStatusFilter;
  ankiSrs: AnkiSrsMap;
  againIds: readonly string[];
}): DictionarySearchItem[] {
  const { cards, query, level, status, ankiSrs, againIds } = params;
  const q = normalizeQuery(query);
  const againSet = new Set(againIds);

  const exactMatches: DictionarySearchItem[] = [];
  const prefixMatches: DictionarySearchItem[] = [];
  const substringMatches: DictionarySearchItem[] = [];

  for (const card of cards) {
    const cardLevel = (card.jlptLevel ?? 'N5') as JlptLevel;
    if (level !== 'ALL' && cardLevel !== level) continue;

    const meta = resolveDictionaryCardStatus(card.id, ankiSrs, againSet);
    if (status === 'DIFFICULT' && !meta.isDifficult) continue;
    if (status === 'LEARNED' && meta.status === 'new') continue;

    const item: DictionarySearchItem = {
      card,
      level: cardLevel,
      status: meta.status,
      lapses: meta.lapses,
      isDifficult: meta.isDifficult,
    };

    if (!q) {
      substringMatches.push(item);
      continue;
    }

    const word = card.word.toLowerCase();
    const furigana = (card.furigana ?? '').toLowerCase();
    const readingTerm = card.readingTerm.toLowerCase();
    const romaji = (card.romaji ?? '').toLowerCase();
    const meaning = card.meaning.toLowerCase();

    if (word === q || furigana === q || romaji === q) {
      exactMatches.push(item);
      continue;
    }

    if (
      word.startsWith(q) ||
      furigana.startsWith(q) ||
      romaji.startsWith(q) ||
      meaning.startsWith(q)
    ) {
      prefixMatches.push(item);
      continue;
    }

    const matchesBody =
      word.includes(q) ||
      furigana.includes(q) ||
      readingTerm.includes(q) ||
      romaji.includes(q) ||
      meaning.includes(q) ||
      card.examples.some(
        (ex) =>
          ex.jp.toLowerCase().includes(q) || ex.id.toLowerCase().includes(q),
      );

    if (matchesBody) {
      substringMatches.push(item);
    }
  }

  return [...exactMatches, ...prefixMatches, ...substringMatches];
}

// ============================================================================
// 2. Bunpou Comparison Quiz Generator (Kuis Pembeda Pola Mirip)
// ============================================================================

export function blankBunpouInSentence(
  sentence: string,
  pattern: string,
): string | null {
  if (!sentence.trim() || !pattern.trim()) return null;
  const segments = highlightJapaneseSentence(sentence, {
    target: pattern,
    kind: 'bunpou',
  });
  const hasMatch = segments.some((seg) => seg.highlighted);
  if (!hasMatch) return null;

  let blanked = '';
  for (const seg of segments) {
    blanked += seg.highlighted ? '＿＿＿＿' : seg.text;
  }
  // Avoid turning almost the entire sentence into a blank
  const nonBlankChars = blanked.replace(/＿/g, '').trim();
  if (nonBlankChars.length < 4) return null;
  return blanked;
}

function buildBunpouQuizExplanation(
  target: BunpouComparisonEntry,
  distractors: BunpouComparisonEntry[],
): string {
  const lines: string[] = [
    `**Jawaban benar:** 「${cleanBunpouLabel(target.pattern)}」 (${target.level}) — ${firstMeaningClause(target.meaning)}.`,
  ];
  if (target.formula) {
    lines.push(`- **Rumus sambung:** 「${target.formula}」`);
  }
  const firstNuanceLine = target.nuance
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);
  if (firstNuanceLine) {
    lines.push(
      firstNuanceLine.startsWith('-')
        ? firstNuanceLine
        : `- **Nuansa:** ${firstNuanceLine}`,
    );
  }
  const topDistractor = distractors[0];
  if (topDistractor) {
    lines.push(
      `- **Bandingkan dengan** 「${cleanBunpouLabel(topDistractor.pattern)}」 (${topDistractor.level}): ${firstMeaningClause(topDistractor.meaning)}.`,
    );
  }
  return lines.join('\n');
}

function pickBunpouDistractors(
  target: BunpouComparisonEntry,
  topicEntries: readonly BunpouComparisonEntry[],
  allEntries: readonly BunpouComparisonEntry[],
  rng: () => number,
): BunpouComparisonEntry[] {
  const usedLabels = new Set<string>([cleanBunpouLabel(target.pattern)]);
  const chosen: BunpouComparisonEntry[] = [];

  const tryAdd = (pool: readonly BunpouComparisonEntry[]) => {
    for (const candidate of seededShuffle(pool, rng)) {
      if (chosen.length >= 3) return;
      if (candidate.id === target.id) continue;
      const label = cleanBunpouLabel(candidate.pattern);
      if (!label || usedLabels.has(label)) continue;
      usedLabels.add(label);
      chosen.push(candidate);
    }
  };

  // Tier 1: Direct similar patterns
  const similarSet = new Set(target.similarPatterns);
  if (similarSet.size > 0) {
    tryAdd(allEntries.filter((e) => similarSet.has(e.id)));
  }
  // Tier 2: Same sub-cluster (apples-to-apples nuance)
  tryAdd(
    topicEntries.filter(
      (e) => e.subClusterId === target.subClusterId && e.id !== target.id,
    ),
  );
  // Tier 3: Same topic
  tryAdd(topicEntries);
  // Tier 4: Global fallback if topic has < 4 entries
  tryAdd(allEntries.filter((e) => e.level === target.level));
  tryAdd(allEntries);

  return chosen;
}

export function generateBunpouComparisonQuiz(params: {
  group: BunpouComparisonGroup;
  allGroups: readonly BunpouComparisonGroup[];
  mode: 'topic' | 'mixed';
  count?: number;
  seed?: number;
}): ChallengeStage | null {
  const { group, allGroups, mode, count = 5, seed = 1 } = params;

  const allEntries: BunpouComparisonEntry[] = [];
  const seenIds = new Set<string>();
  for (const g of allGroups) {
    for (const e of g.entries) {
      if (!seenIds.has(e.id)) {
        seenIds.add(e.id);
        allEntries.push(e);
      }
    }
  }

  if (allEntries.length < 4) return null;

  const rng = createSeededRandom(
    hashSeed(`bunpou-quiz:${mode}:${group.id}:${seed}`),
  );

  // Build candidate targets
  let candidatePool: Array<{
    entry: BunpouComparisonEntry;
    topicGroup: BunpouComparisonGroup;
  }> = [];

  if (mode === 'topic') {
    candidatePool = group.entries.map((entry) => ({
      entry,
      topicGroup: group,
    }));
  } else {
    // Mixed: prefer semantic topics with >= 3 entries for sharp contrasts
    const semanticGroups = allGroups.filter(
      (g) => g.categoryType === 'semantic' && g.entries.length >= 2,
    );
    const sourceGroups = semanticGroups.length > 0 ? semanticGroups : allGroups;
    for (const g of seededShuffle(sourceGroups, rng)) {
      const pickedFromGroup = seededShuffle(g.entries, rng).slice(0, 2);
      for (const entry of pickedFromGroup) {
        candidatePool.push({ entry, topicGroup: g });
      }
    }
  }

  // Prefer entries with blankable example sentences first
  const withBlank: Array<{
    entry: BunpouComparisonEntry;
    topicGroup: BunpouComparisonGroup;
    blanked: string | null;
  }> = [];
  const withoutBlank: typeof withBlank = [];

  for (const item of seededShuffle(candidatePool, rng)) {
    const blanked = blankBunpouInSentence(
      item.entry.exampleJp,
      item.entry.pattern,
    );
    if (blanked) {
      withBlank.push({ ...item, blanked });
    } else {
      withoutBlank.push({ ...item, blanked: null });
    }
  }

  const orderedTargets = [...withBlank, ...withoutBlank];
  const questions: ChallengeQuestion[] = [];
  const usedTargetIds = new Set<string>();

  for (const item of orderedTargets) {
    if (questions.length >= count) break;
    if (usedTargetIds.has(item.entry.id)) continue;

    const distractors = pickBunpouDistractors(
      item.entry,
      item.topicGroup.entries,
      allEntries,
      rng,
    );
    if (distractors.length < 3) continue;

    usedTargetIds.add(item.entry.id);

    const rawOptions = [
      { label: cleanBunpouLabel(item.entry.pattern), isCorrect: true },
      ...distractors.map((d) => ({
        label: cleanBunpouLabel(d.pattern),
        isCorrect: false,
      })),
    ];
    const shuffledOptions = seededShuffle(rawOptions, rng);
    const correctIndex = shuffledOptions.findIndex((o) => o.isCorrect);

    const hasBlank = Boolean(item.blanked);
    const prompt = hasBlank
      ? `Lengkapi kalimat berikut dengan pola yang paling tepat:\n「${item.blanked}」`
      : `Pola bunpou mana yang paling tepat untuk menyatakan makna:\n"${firstMeaningClause(item.entry.meaning)}"?`;

    const passage = hasBlank
      ? item.entry.exampleId
        ? `Arti kalimat: ${item.entry.exampleId}`
        : undefined
      : item.entry.exampleId
        ? `Konteks terjemahan: ${item.entry.exampleId}`
        : undefined;

    questions.push({
      id: `bq-${mode}-${item.entry.id}-${seed}-${questions.length}`,
      tag: `${item.entry.level} · ${item.entry.subClusterLabel}`,
      prompt,
      passage,
      options: shuffledOptions.map((o) => o.label),
      correctIndex,
      explanation: buildBunpouQuizExplanation(item.entry, distractors),
    });
  }

  if (questions.length === 0) return null;

  return {
    id: `bunpou-quiz-${mode}-${group.id}-${seed}`,
    order: 0,
    chapter:
      mode === 'topic'
        ? `Kuis Pembeda · ${group.label}`
        : 'Kuis Pembeda · Campuran Lintas Topik',
    jlptLevel: group.level === 'ALL' ? 'N2' : group.level,
    title:
      mode === 'topic'
        ? `Uji Nuansa: ${group.label}`
        : 'Kuis Pembeda Bunpou Mirip',
    subtitle:
      mode === 'topic'
        ? 'Pilih pola yang paling akurat berdasarkan konteks & sub-nuansa'
        : 'Campuran pola mirip dari berbagai topik JLPT N5–N1',
    xpReward: 40 + questions.length * 8,
    questions,
  };
}

// ============================================================================
// 3. Adaptive Daily Drill Generator (Latihan Harian 5 / 10 Soal)
// ============================================================================

function formatVocabOption(card: AnkiCard): string {
  return firstMeaningClause(card.meaning);
}

function buildVocabDrillQuestion(
  target: AnkiCard,
  pool: readonly AnkiCard[],
  tag: string,
  qid: string,
  rng: () => number,
): ChallengeQuestion | null {
  const targetMeaning = formatVocabOption(target);
  if (!targetMeaning) return null;

  const sameLevel = pool.filter(
    (c) => c.id !== target.id && c.jlptLevel === target.jlptLevel,
  );
  const otherLevel = pool.filter(
    (c) => c.id !== target.id && c.jlptLevel !== target.jlptLevel,
  );

  const usedMeanings = new Set<string>([targetMeaning.toLowerCase()]);
  const distractors: string[] = [];

  for (const source of [sameLevel, otherLevel]) {
    for (const c of seededShuffle(source, rng)) {
      if (distractors.length >= 3) break;
      const m = formatVocabOption(c);
      if (!m || usedMeanings.has(m.toLowerCase())) continue;
      usedMeanings.add(m.toLowerCase());
      distractors.push(m);
    }
  }

  if (distractors.length < 3) return null;

  const shuffled = seededShuffle(
    [
      { text: targetMeaning, isCorrect: true },
      ...distractors.map((d) => ({ text: d, isCorrect: false })),
    ],
    rng,
  );
  const correctIndex = shuffled.findIndex((o) => o.isCorrect);

  const readingSuffix =
    target.furigana && target.furigana !== target.word
      ? ` (${target.furigana})`
      : '';
  const example = target.examples[0];

  return {
    id: qid,
    tag,
    prompt: `Apa arti dari 「${target.word}${readingSuffix}」?`,
    passage: example ? `Contoh: ${example.jp}` : undefined,
    options: shuffled.map((o) => o.text),
    correctIndex,
    explanation: `「${target.word}${readingSuffix}」 berarti ${target.meaning}.${
      example?.id ? ` (${example.id})` : ''
    }`,
  };
}

function buildBunpouDrillQuestion(
  target: BunpouN2Item,
  pool: readonly BunpouN2Item[],
  qid: string,
  rng: () => number,
): ChallengeQuestion | null {
  const targetLabel = cleanBunpouLabel(target.pattern);
  if (!targetLabel) return null;

  const usedLabels = new Set<string>([targetLabel]);
  const distractors: BunpouN2Item[] = [];

  const sameGroup = pool.filter(
    (b) => b.id !== target.id && b.groupId === target.groupId,
  );
  const sameLevel = pool.filter(
    (b) =>
      b.id !== target.id &&
      b.groupId !== target.groupId &&
      b.level === target.level,
  );
  const others = pool.filter(
    (b) => b.id !== target.id && b.level !== target.level,
  );

  for (const source of [sameGroup, sameLevel, others]) {
    for (const cand of seededShuffle(source, rng)) {
      if (distractors.length >= 3) break;
      const lbl = cleanBunpouLabel(cand.pattern);
      if (!lbl || usedLabels.has(lbl)) continue;
      usedLabels.add(lbl);
      distractors.push(cand);
    }
  }

  if (distractors.length < 3) return null;

  const shuffled = seededShuffle(
    [
      { text: targetLabel, isCorrect: true },
      ...distractors.map((d) => ({
        text: cleanBunpouLabel(d.pattern),
        isCorrect: false,
      })),
    ],
    rng,
  );
  const correctIndex = shuffled.findIndex((o) => o.isCorrect);

  const firstExample = target.examples[0];
  const blanked = firstExample
    ? blankBunpouInSentence(firstExample.jp, target.pattern)
    : null;

  const prompt = blanked
    ? `Pilih pola bunpou yang tepat untuk melengkapi:\n「${blanked}」`
    : `Pola bunpou mana yang bermakna "${firstMeaningClause(target.meaning)}"?`;

  const passage = firstExample?.id
    ? `Arti kalimat: ${firstExample.id}`
    : undefined;

  return {
    id: qid,
    tag: `Bunpou ${target.level}`,
    prompt,
    passage,
    options: shuffled.map((o) => o.text),
    correctIndex,
    explanation: `「${targetLabel}」 (${target.level}) berarti ${firstMeaningClause(target.meaning)}.${
      target.formula ? ` Rumus: ${target.formula}.` : ''
    }`,
  };
}

export function generateDailyDrillStage(params: {
  dateKey: string;
  shuffleIndex?: number;
  unlockedLevel: JlptLevel;
  difficultCards: readonly DifficultCardEntry[];
  unlockedAnkiCards: readonly AnkiCard[];
  unlockedBunpouItems: readonly BunpouN2Item[];
  count: 5 | 10;
}): ChallengeStage | null {
  const {
    dateKey,
    shuffleIndex = 0,
    unlockedLevel,
    difficultCards,
    unlockedAnkiCards,
    unlockedBunpouItems,
    count,
  } = params;

  const vocabPool = unlockedAnkiCards.filter(
    (c) => c.cardKind !== 'bunpou' && Boolean(c.meaning?.trim()),
  );
  const usablePool = vocabPool.length >= 4 ? vocabPool : unlockedAnkiCards;

  if (usablePool.length < 4 && unlockedBunpouItems.length < 4) {
    return null;
  }

  const rng = createSeededRandom(
    hashSeed(`daily-drill:${dateKey}:${unlockedLevel}:${count}:${shuffleIndex}`),
  );

  // Target ratio: ~40% difficult, ~35% unlocked vocab, ~25% unlocked bunpou
  const targetDifficult = Math.min(
    difficultCards.length,
    Math.round(count * 0.4),
  );
  const targetBunpou =
    unlockedBunpouItems.length >= 4 ? Math.max(1, Math.round(count * 0.25)) : 0;
  const targetVocab = Math.max(0, count - targetDifficult - targetBunpou);

  const questions: ChallengeQuestion[] = [];
  const usedCardIds = new Set<string>();
  const usedBunpouIds = new Set<string>();

  // 1. Difficult / Leech cards first
  for (const entry of seededShuffle(difficultCards, rng)) {
    if (questions.length >= targetDifficult) break;
    if (usedCardIds.has(entry.card.id)) continue;
    const q = buildVocabDrillQuestion(
      entry.card,
      usablePool,
      `Kata Sulit · ${entry.card.jlptLevel ?? unlockedLevel}`,
      `dd-diff-${dateKey}-${shuffleIndex}-${entry.card.id}`,
      rng,
    );
    if (q) {
      usedCardIds.add(entry.card.id);
      questions.push(q);
    }
  }

  // 2. Unlocked Bunpou context questions
  let bunpouAdded = 0;
  for (const item of seededShuffle(unlockedBunpouItems, rng)) {
    if (bunpouAdded >= targetBunpou || questions.length >= count) break;
    if (usedBunpouIds.has(item.id)) continue;
    const q = buildBunpouDrillQuestion(
      item,
      unlockedBunpouItems,
      `dd-bunpou-${dateKey}-${shuffleIndex}-${item.id}`,
      rng,
    );
    if (q) {
      usedBunpouIds.add(item.id);
      bunpouAdded += 1;
      questions.push(q);
    }
  }

  // 3. Fill remaining slots with unlocked vocabulary
  for (const card of seededShuffle(usablePool, rng)) {
    if (questions.length >= count) break;
    if (usedCardIds.has(card.id)) continue;
    const q = buildVocabDrillQuestion(
      card,
      usablePool,
      `Kosakata ${card.jlptLevel ?? unlockedLevel}`,
      `dd-vocab-${dateKey}-${shuffleIndex}-${card.id}`,
      rng,
    );
    if (q) {
      usedCardIds.add(card.id);
      questions.push(q);
    }
  }

  // 4. Fallback fill with Bunpou if vocab was short
  if (questions.length < count && unlockedBunpouItems.length >= 4) {
    for (const item of seededShuffle(unlockedBunpouItems, rng)) {
      if (questions.length >= count) break;
      if (usedBunpouIds.has(item.id)) continue;
      const q = buildBunpouDrillQuestion(
        item,
        unlockedBunpouItems,
        `dd-bunpou-extra-${dateKey}-${shuffleIndex}-${item.id}`,
        rng,
      );
      if (q) {
        usedBunpouIds.add(item.id);
        questions.push(q);
      }
    }
  }

  if (questions.length === 0) return null;

  // Interleave question order deterministically so difficult/vocab/bunpou feel varied
  const finalQuestions = seededShuffle(questions, rng);

  const difficultCount = finalQuestions.filter((q) =>
    q.tag.startsWith('Kata Sulit'),
  ).length;
  const bunpouCount = finalQuestions.filter((q) =>
    q.tag.startsWith('Bunpou'),
  ).length;
  const vocabCount = finalQuestions.length - difficultCount - bunpouCount;

  const mixParts: string[] = [];
  if (difficultCount > 0) mixParts.push(`${difficultCount} kata sulit`);
  if (vocabCount > 0) mixParts.push(`${vocabCount} kosakata`);
  if (bunpouCount > 0) mixParts.push(`${bunpouCount} bunpou`);

  return {
    id: `daily-drill-${dateKey}-${count}-${shuffleIndex}`,
    order: 0,
    chapter: `Daily Drill · ${dateKey}`,
    jlptLevel: unlockedLevel,
    title: `Daily Drill Adaptif (${finalQuestions.length} Soal)`,
    subtitle:
      mixParts.length > 0
        ? `Komposisi: ${mixParts.join(' · ')}`
        : `Latihan harian level ${unlockedLevel}`,
    xpReward: count === 10 ? 75 : 45,
    questions: finalQuestions,
  };
}
