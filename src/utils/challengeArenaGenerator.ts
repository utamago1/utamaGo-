import {
  SENTENCE_ORDER_BANK,
  templateToSentenceOrderQuestion,
} from '../data/challengeArenaData';
import {
  CHALLENGE_STAGES,
  type ChallengeQuestion,
  type ChallengeStage,
} from '../data/challengeLevels';
import type { JlptLevel } from '../data/utamagoContent';
import type { AnkiCard } from './ankiParser';
import type { BunpouN2Item } from './bunpouN2Parser';
import { resolveAnkiCardSpeechText } from './japaneseSpeech';
import { hashSeed } from './practiceGenerators';

function createRng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(items: readonly T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function isFullJapaneseLevel(level: JlptLevel): boolean {
  return level === 'N3' || level === 'N2' || level === 'N1';
}

function cleanMeaningShort(raw: string): string {
  const cleaned = raw
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const firstPart = cleaned.split(/[/;、。]/)[0]?.trim() || cleaned;
  if (firstPart.length <= 54) return firstPart;
  return `${firstPart.slice(0, 51).trim()}…`;
}

function hasKanji(text: string): boolean {
  return /[\u4e00-\u9faf]/.test(text);
}

function hasKanaOnly(text: string): boolean {
  return /^[\u3040-\u30ffー・\s]+$/.test(text.trim());
}

function getCardWord(card: AnkiCard): string {
  return (card.word || card.readingTerm || '').trim();
}

function getCardKana(card: AnkiCard): string {
  return (card.furigana || '').trim();
}

function buildVocabAudioQuestion(
  card: AnkiCard,
  pool: readonly AnkiCard[],
  level: JlptLevel,
  id: string,
  rng: () => number,
): ChallengeQuestion | null {
  const word = getCardWord(card);
  const kana = getCardKana(card);
  const speechText = word || kana;
  if (!speechText) return null;

  if (isFullJapaneseLevel(level)) {
    // Full-Japanese listening question: hear audio -> pick the exact Kanji written form
    if (!hasKanji(word) || !kana) return null;
    const distractorCandidates = shuffleWithRng(
      pool.filter((c) => {
        const cw = getCardWord(c);
        const ck = getCardKana(c);
        return (
          c.id !== card.id &&
          hasKanji(cw) &&
          cw !== word &&
          ck !== kana
        );
      }),
      rng,
    );
    const distractors: string[] = [];
    const seen = new Set<string>([word]);
    for (const cand of distractorCandidates) {
      const form = getCardWord(cand);
      if (!seen.has(form) && !/[a-z]/i.test(form)) {
        seen.add(form);
        distractors.push(form);
      }
      if (distractors.length === 3) break;
    }
    if (distractors.length < 3) return null;

    const options = shuffleWithRng([word, ...distractors], rng);
    return {
      id,
      kind: 'audio-choice',
      tag: `聴解クイズ ${level}`,
      prompt: '音声で流れた言葉の正しい漢字表記を選んでください。',
      audioText: resolveAnkiCardSpeechText(card),
      audioReveal: `${word} (${kana})`,
      options,
      correctIndex: options.indexOf(word),
      explanation: `${word}（${kana}）＝ ${cleanMeaningShort(card.meaning)}`,
    };
  }

  // N5–N4 listening question: hear Japanese word -> pick Indonesian meaning
  const correctMeaning = cleanMeaningShort(card.meaning);
  if (!correctMeaning || correctMeaning.length < 2) return null;
  const distractorCandidates = shuffleWithRng(
    pool.filter((c) => c.id !== card.id),
    rng,
  );
  const distractors: string[] = [];
  const seen = new Set<string>([correctMeaning.toLowerCase()]);
  for (const cand of distractorCandidates) {
    const meaning = cleanMeaningShort(cand.meaning);
    if (meaning.length >= 2 && !seen.has(meaning.toLowerCase())) {
      seen.add(meaning.toLowerCase());
      distractors.push(meaning);
    }
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;

  const options = shuffleWithRng([correctMeaning, ...distractors], rng);
  return {
    id,
    kind: 'audio-choice',
    tag: `Tebak Audio ${level}`,
    prompt: 'Dengarkan pelafalan Jepang berikut, lalu pilih arti yang tepat:',
    audioText: resolveAnkiCardSpeechText(card),
    audioReveal: word && kana && word !== kana ? `${word} (${kana})` : speechText,
    options,
    correctIndex: options.indexOf(correctMeaning),
    explanation: `${word || kana}${kana && word !== kana ? ` (${kana})` : ''} berarti "${card.meaning}".`,
  };
}

function buildVocabMcqQuestion(
  card: AnkiCard,
  pool: readonly AnkiCard[],
  level: JlptLevel,
  id: string,
  rng: () => number,
): ChallengeQuestion | null {
  const word = getCardWord(card);
  const kana = getCardKana(card);

  if (isFullJapaneseLevel(level)) {
    // N3–N1: Kanji -> Kana reading (100% Japanese)
    if (!hasKanji(word) || !kana || !hasKanaOnly(kana)) {
      return null;
    }
    const distractorCandidates = shuffleWithRng(
      pool.filter((c) => {
        const ck = getCardKana(c);
        return (
          c.id !== card.id &&
          ck !== kana &&
          hasKanaOnly(ck) &&
          Math.abs(ck.length - kana.length) <= 2
        );
      }),
      rng,
    );
    const distractors: string[] = [];
    const seen = new Set<string>([kana]);
    for (const cand of distractorCandidates) {
      const k = getCardKana(cand);
      if (!seen.has(k)) {
        seen.add(k);
        distractors.push(k);
      }
      if (distractors.length === 3) break;
    }
    if (distractors.length < 3) return null;

    const options = shuffleWithRng([kana, ...distractors], rng);
    return {
      id,
      kind: 'mcq',
      tag: `読み問題 ${level}`,
      prompt: `次の漢字の正しい読み方はどれですか。\n「${word}」`,
      options,
      correctIndex: options.indexOf(kana),
      explanation: `${word} dibaca ${kana} (${cleanMeaningShort(card.meaning)}).`,
    };
  }

  // N5–N4: Alternate between Kanji->Meaning and Kanji->Kana reading
  const useReading = rng() < 0.45 && hasKanji(word) && Boolean(kana) && hasKanaOnly(kana);
  if (useReading) {
    const distractorCandidates = shuffleWithRng(
      pool.filter((c) => {
        const ck = getCardKana(c);
        return c.id !== card.id && ck !== kana && hasKanaOnly(ck);
      }),
      rng,
    );
    const distractors: string[] = [];
    const seen = new Set<string>([kana]);
    for (const cand of distractorCandidates) {
      const k = getCardKana(cand);
      if (!seen.has(k)) {
        seen.add(k);
        distractors.push(k);
      }
      if (distractors.length === 3) break;
    }
    if (distractors.length === 3) {
      const options = shuffleWithRng([kana, ...distractors], rng);
      return {
        id,
        kind: 'mcq',
        tag: `Bacaan ${level}`,
        prompt: `Bagaimana cara baca yang tepat untuk 「${word}」?`,
        options,
        correctIndex: options.indexOf(kana),
        explanation: `${word} dibaca ${kana} yang berarti "${card.meaning}".`,
      };
    }
  }

  const correctMeaning = cleanMeaningShort(card.meaning);
  if (!correctMeaning || correctMeaning.length < 2) return null;
  const distractorCandidates = shuffleWithRng(
    pool.filter((c) => c.id !== card.id),
    rng,
  );
  const distractors: string[] = [];
  const seen = new Set<string>([correctMeaning.toLowerCase()]);
  for (const cand of distractorCandidates) {
    const meaning = cleanMeaningShort(cand.meaning);
    if (meaning.length >= 2 && !seen.has(meaning.toLowerCase())) {
      seen.add(meaning.toLowerCase());
      distractors.push(meaning);
    }
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;

  const options = shuffleWithRng([correctMeaning, ...distractors], rng);
  const head = word && kana && word !== kana ? `${word} (${kana})` : word || kana;
  return {
    id,
    kind: 'mcq',
    tag: `Kosakata ${level}`,
    prompt: `Pilih arti yang tepat untuk 「${head}」:`,
    options,
    correctIndex: options.indexOf(correctMeaning),
    explanation: `${head} berarti "${card.meaning}".`,
  };
}

function buildBunpouClozeOrMeaningQuestion(
  item: BunpouN2Item,
  pool: readonly BunpouN2Item[],
  level: JlptLevel,
  id: string,
  rng: () => number,
): ChallengeQuestion | null {
  const cleanPattern = item.pattern
    .replace(/^[～〜~]+/, '')
    .replace(/\([^)]*\)/g, '')
    .trim();
  if (!cleanPattern || cleanPattern.length < 2) return null;

  if (isFullJapaneseLevel(level)) {
    // Try example-sentence cloze in full Japanese
    const matchingExample = item.examples.find(
      (ex) => ex.jp && ex.jp.includes(cleanPattern),
    );
    if (!matchingExample) return null;

    const blanked = matchingExample.jp.replace(cleanPattern, '（　）');
    if (blanked === matchingExample.jp || /[a-z]{3,}/i.test(blanked)) {
      return null;
    }

    const distractors: string[] = [];
    const seen = new Set<string>([cleanPattern]);
    for (const cand of shuffleWithRng(pool, rng)) {
      if (cand.id === item.id) continue;
      const p = cand.pattern
        .replace(/^[～〜~]+/, '')
        .replace(/\([^)]*\)/g, '')
        .trim();
      if (p.length >= 2 && !seen.has(p) && !/[a-z]/i.test(p)) {
        seen.add(p);
        distractors.push(p);
      }
      if (distractors.length === 3) break;
    }
    if (distractors.length < 3) return null;

    const options = shuffleWithRng([cleanPattern, ...distractors], rng);
    return {
      id,
      kind: 'mcq',
      tag: `文法 ${level}`,
      prompt: `次の（　）に入る最も適切な表現はどれですか。\n「${blanked}」`,
      options,
      correctIndex: options.indexOf(cleanPattern),
      explanation: `${item.pattern} (${cleanMeaningShort(item.meaning)}) — ${matchingExample.jp}${matchingExample.id ? ` (${matchingExample.id})` : ''}`,
    };
  }

  // N5–N4: Pattern -> Indonesian meaning
  const correctMeaning = cleanMeaningShort(item.meaning);
  if (!correctMeaning || correctMeaning.length < 3) return null;
  const distractors: string[] = [];
  const seen = new Set<string>([correctMeaning.toLowerCase()]);
  for (const cand of shuffleWithRng(pool, rng)) {
    if (cand.id === item.id) continue;
    const m = cleanMeaningShort(cand.meaning);
    if (m.length >= 3 && !seen.has(m.toLowerCase())) {
      seen.add(m.toLowerCase());
      distractors.push(m);
    }
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;

  const options = shuffleWithRng([correctMeaning, ...distractors], rng);
  return {
    id,
    kind: 'mcq',
    tag: `Bunpou ${level}`,
    prompt: `Apa arti pola tata bahasa 「${item.pattern}」?`,
    options,
    correctIndex: options.indexOf(correctMeaning),
    explanation: `${item.pattern} berarti "${item.meaning}".`,
  };
}

export interface ArenaGeneratorInput {
  level: JlptLevel;
  ankiCards: readonly AnkiCard[];
  bunpouItems: readonly BunpouN2Item[];
  seedSalt: string;
  count: number;
  mode: 'blitz' | 'survival';
  wave?: number;
}

/**
 * Generates a balanced, replayable batch of multi-format questions
 * (MCQ + Tebak Audio Jepang + Susun Kalimat JLPT) for Blitz & Survival modes.
 */
export function generateArenaQuestionBatch(
  input: ArenaGeneratorInput,
): ChallengeQuestion[] {
  const { level, ankiCards, bunpouItems, seedSalt, count, mode, wave = 1 } = input;
  const rng = createRng(hashSeed(`${mode}-${level}-w${wave}-${seedSalt}`));

  const levelCards = ankiCards.filter(
    (c) => (c.jlptLevel ?? 'N5') === level,
  );
  const effectiveCards = levelCards.length >= 8 ? levelCards : ankiCards;

  const levelBunpou = bunpouItems.filter((b) => b.level === level);
  const effectiveBunpou = levelBunpou.length >= 6 ? levelBunpou : bunpouItems;

  const levelSentences = SENTENCE_ORDER_BANK.filter((s) => s.level === level);

  // Also borrow curated MCQ/audio/sentence items from campaign stages of the same level (deduplicated)
  const seenCuratedKey = new Set<string>();
  const curatedPool: ChallengeQuestion[] = [];
  for (const s of CHALLENGE_STAGES) {
    if (s.jlptLevel !== level || s.stageKind === 'blitz-mission') continue;
    for (const q of s.questions) {
      const dedupeKey = `${q.kind ?? 'mcq'}::${q.prompt}::${q.audioText ?? ''}::${q.orderedTokens?.join('|') ?? ''}`;
      if (seenCuratedKey.has(dedupeKey)) continue;
      seenCuratedKey.add(dedupeKey);
      curatedPool.push(q);
    }
  }

  const mcqBucket: ChallengeQuestion[] = [];
  const audioBucket: ChallengeQuestion[] = [];
  const sentenceBucket: ChallengeQuestion[] = [];

  // 1. Seed curated questions (respecting kind)
  for (const q of shuffleWithRng(curatedPool, rng)) {
    const clonedId = `${mode}-w${wave}-cur-${q.id}-${Math.floor(rng() * 9999)}`;
    if (q.kind === 'audio-choice') {
      audioBucket.push({ ...q, id: clonedId });
    } else if (q.kind === 'sentence-order') {
      sentenceBucket.push({ ...q, id: clonedId });
    } else {
      // Shuffle MCQ options cleanly so positions aren't memorized across replays
      const correctText = q.options[q.correctIndex];
      const shuffledOpts = shuffleWithRng(q.options, rng);
      mcqBucket.push({
        ...q,
        id: clonedId,
        options: shuffledOpts,
        correctIndex: shuffledOpts.indexOf(correctText),
      });
    }
  }

  // 2. Seed curated Sentence Order templates
  for (const tpl of shuffleWithRng(levelSentences, rng)) {
    sentenceBucket.push(
      templateToSentenceOrderQuestion(
        tpl,
        `${mode}-w${wave}-so-${tpl.id}-${Math.floor(rng() * 9999)}`,
      ),
    );
  }

  // 3. Dynamically generate Vocab MCQ & Audio questions from Anki cards
  const shuffledCards = shuffleWithRng(effectiveCards, rng);
  for (let i = 0; i < Math.min(shuffledCards.length, 48); i++) {
    const card = shuffledCards[i];
    if (i % 2 === 0) {
      const q = buildVocabMcqQuestion(
        card,
        effectiveCards,
        level,
        `${mode}-w${wave}-vmcq-${card.id}-${i}`,
        rng,
      );
      if (q) mcqBucket.push(q);
    } else {
      const aq = buildVocabAudioQuestion(
        card,
        effectiveCards,
        level,
        `${mode}-w${wave}-vaud-${card.id}-${i}`,
        rng,
      );
      if (aq) audioBucket.push(aq);
    }
  }

  // 4. Dynamically generate Bunpou questions
  const shuffledBunpou = shuffleWithRng(effectiveBunpou, rng);
  for (let i = 0; i < Math.min(shuffledBunpou.length, 24); i++) {
    const bq = buildBunpouClozeOrMeaningQuestion(
      shuffledBunpou[i],
      effectiveBunpou,
      level,
      `${mode}-w${wave}-bmcq-${shuffledBunpou[i].id}-${i}`,
      rng,
    );
    if (bq) mcqBucket.push(bq);
  }

  const mcqs = shuffleWithRng(mcqBucket, rng);
  const audios = shuffleWithRng(audioBucket, rng);
  const sentences = shuffleWithRng(sentenceBucket, rng);

  // Interleave formats smoothly for great pacing:
  // - Blitz: faster cadence (mostly MCQ + crisp Audio + occasional Susun Kalimat)
  // - Survival: balanced cadence that leans harder into Susun Kalimat & Audio on wave 2+
  const result: ChallengeQuestion[] = [];
  let mIdx = 0;
  let aIdx = 0;
  let sIdx = 0;

  const pattern: Array<'mcq' | 'audio' | 'sentence'> =
    mode === 'blitz'
      ? ['mcq', 'mcq', 'audio', 'mcq', 'sentence', 'mcq', 'audio']
      : wave >= 2
        ? ['mcq', 'audio', 'sentence', 'mcq', 'audio', 'sentence']
        : ['mcq', 'mcq', 'audio', 'sentence', 'mcq', 'audio'];

  for (let i = 0; i < count; i++) {
    const desired = pattern[i % pattern.length];
    let picked: ChallengeQuestion | undefined;

    if (desired === 'audio' && aIdx < audios.length) {
      picked = audios[aIdx++];
    } else if (desired === 'sentence' && sIdx < sentences.length) {
      picked = sentences[sIdx++];
    } else if (desired === 'mcq' && mIdx < mcqs.length) {
      picked = mcqs[mIdx++];
    }

    if (!picked) {
      if (mIdx < mcqs.length) picked = mcqs[mIdx++];
      else if (aIdx < audios.length) picked = audios[aIdx++];
      else if (sIdx < sentences.length) picked = sentences[sIdx++];
    }

    if (!picked) break;
    result.push(picked);
  }

  return result;
}

export function generateBlitzStage(params: {
  level: JlptLevel;
  ankiCards: readonly AnkiCard[];
  bunpouItems: readonly BunpouN2Item[];
  seedSalt: string;
}): ChallengeStage {
  const questions = generateArenaQuestionBatch({
    level: params.level,
    ankiCards: params.ankiCards,
    bunpouItems: params.bunpouItems,
    seedSalt: params.seedSalt,
    count: 42,
    mode: 'blitz',
    wave: 1,
  });

  return {
    id: `blitz-${params.level}-${params.seedSalt}`,
    order: 0,
    chapter: `Mode Blitz 60 Detik · ${params.level}`,
    jlptLevel: params.level,
    mode: 'blitz',
    timeLimitSeconds: 60,
    title: `Blitz Adu Cepat ${params.level}`,
    subtitle: 'Kejar skor & kombo tertinggi dalam 60 detik (+3 detik tiap 5 kombo)',
    xpReward: 90,
    questions,
  };
}

export function generateSurvivalStage(params: {
  level: JlptLevel;
  ankiCards: readonly AnkiCard[];
  bunpouItems: readonly BunpouN2Item[];
  seedSalt: string;
}): ChallengeStage {
  const questions = generateArenaQuestionBatch({
    level: params.level,
    ankiCards: params.ankiCards,
    bunpouItems: params.bunpouItems,
    seedSalt: params.seedSalt,
    count: 18,
    mode: 'survival',
    wave: 1,
  });

  return {
    id: `survival-${params.level}-${params.seedSalt}`,
    order: 0,
    chapter: `Mode Survival · ${params.level}`,
    jlptLevel: params.level,
    mode: 'survival',
    title: `Survival Tanpa Batas ${params.level}`,
    subtitle: '3 nyawa, soal tanpa akhir dengan kesulitan meningkat',
    xpReward: 100,
    questions,
  };
}
