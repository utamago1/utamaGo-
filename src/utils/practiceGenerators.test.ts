import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { CHALLENGE_STAGES } from '../data/challengeLevels';
import type { AnkiCard } from './ankiParser';
import type { AnkiSrsMap } from './ankiSrs';
import { buildCrossLevelBunpouComparisonGroups } from './bunpouComparison';
import {
  parseBunpouN1Deck,
  parseBunpouN2Deck,
  parseBunpouN3Deck,
  parseBunpouN4Deck,
  parseBunpouN5Deck,
} from './bunpouN2Parser';
import type { DifficultCardEntry } from './homeSummary';
import { isStageUnlocked } from './levelProgression';
import {
  blankBunpouInSentence,
  generateBunpouComparisonQuiz,
  generateDailyDrillStage,
  searchDictionaryCards,
} from './practiceGenerators';

function loadFullBunpouDecks() {
  return {
    n5Items: parseBunpouN5Deck(
      fs.readFileSync(
        'public/assets/aistudio/Bunpou_N5_Try_0fefe20b.txt',
        'utf8',
      ),
    ),
    n4Items: parseBunpouN4Deck(
      fs.readFileSync(
        'public/assets/aistudio/Bunpou_N4_Shinkanzenmaster_a448db92.txt',
        'utf8',
      ),
    ),
    n3Items: parseBunpouN3Deck(
      fs.readFileSync(
        'public/assets/aistudio/Bunpou_N3_ShinKanzenMaster_c3c47d26.txt',
        'utf8',
      ),
    ),
    n2Items: parseBunpouN2Deck(
      fs.readFileSync(
        'public/assets/aistudio/JLPT_N2_Bunpou_Indonesia.txt',
        'utf8',
      ),
    ),
    n1Items: parseBunpouN1Deck(
      fs.readFileSync(
        'public/assets/aistudio/Bunpou_N1_pelajaran1-20_c990e95d.txt',
        'utf8',
      ),
    ),
  };
}

const SAMPLE_CARDS: AnkiCard[] = [
  {
    id: 'n5-1',
    index: 1,
    word: '食べる',
    partOfSpeech: 'Kata kerja',
    categoryGroup: 'Kata kerja',
    readingTerm: '食べる(たべる)',
    furigana: 'たべる',
    romaji: 'taberu',
    meaning: 'makan',
    examples: [{ jp: '朝ごはんを食べる。', id: 'Makan sarapan.' }],
    tag: 'N5',
    jlptLevel: 'N5',
    cardKind: 'vocab',
  },
  {
    id: 'n5-2',
    index: 2,
    word: '飲む',
    partOfSpeech: 'Kata kerja',
    categoryGroup: 'Kata kerja',
    readingTerm: '飲む(のむ)',
    furigana: 'のむ',
    romaji: 'nomu',
    meaning: 'minum',
    examples: [{ jp: '水を飲む。', id: 'Minum air.' }],
    tag: 'N5',
    jlptLevel: 'N5',
    cardKind: 'vocab',
  },
  {
    id: 'n4-1',
    index: 3,
    word: '準備',
    partOfSpeech: 'Kata benda',
    categoryGroup: 'Kata benda',
    readingTerm: '準備(じゅんび)',
    furigana: 'じゅんび',
    romaji: 'junbi',
    meaning: 'persiapan',
    examples: [{ jp: '旅行の準備をする。', id: 'Melakukan persiapan wisata.' }],
    tag: 'N4',
    jlptLevel: 'N4',
    cardKind: 'vocab',
  },
  {
    id: 'n3-1',
    index: 4,
    word: '確認',
    partOfSpeech: 'Kata benda',
    categoryGroup: 'Kata benda',
    readingTerm: '確認(かくにん)',
    furigana: 'かくにん',
    romaji: 'kakunin',
    meaning: 'konfirmasi; pengecekan',
    examples: [{ jp: '内容を確認する。', id: 'Memeriksa isi.' }],
    tag: 'N3',
    jlptLevel: 'N3',
    cardKind: 'vocab',
  },
  {
    id: 'n2-1',
    index: 5,
    word: '把握',
    partOfSpeech: 'Kata benda',
    categoryGroup: 'Kata benda',
    readingTerm: '把握(はあく)',
    furigana: 'はあく',
    romaji: 'haaku',
    meaning: 'memahami kondisi secara menyeluruh',
    examples: [{ jp: '状況を把握する。', id: 'Memahami situasi.' }],
    tag: 'N2',
    jlptLevel: 'N2',
    cardKind: 'vocab',
  },
  {
    id: 'n1-1',
    index: 6,
    word: '妥協',
    partOfSpeech: 'Kata benda',
    categoryGroup: 'Kata benda',
    readingTerm: '妥協(だきょう)',
    furigana: 'だきょう',
    romaji: 'dakyou',
    meaning: 'kompromi',
    examples: [{ jp: '条件で妥協する。', id: 'Berkompromi soal syarat.' }],
    tag: 'N1',
    jlptLevel: 'N1',
    cardKind: 'vocab',
  },
];

test('CHALLENGE_STAGES covers 30 sequential stages (6 distinct modes × 5 JLPT chapters) with valid unique questions & Boss-to-next-chapter unlocking', () => {
  assert.equal(CHALLENGE_STAGES.length, 30);

  const expectedLevels = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
  const expectedKinds = [
    'core',
    'audio',
    'sentence',
    'blitz-mission',
    'survival-mission',
    'boss',
  ] as const;

  for (let ch = 0; ch < expectedLevels.length; ch++) {
    const lv = expectedLevels[ch];
    const chapterStages = CHALLENGE_STAGES.slice(ch * 6, ch * 6 + 6);
    assert.equal(chapterStages.length, 6, `${lv} chapter must have 6 stages`);
    assert.deepEqual(
      chapterStages.map((s) => s.stageKind),
      [...expectedKinds],
      `${lv} chapter must follow the 6-mode progression ladder`,
    );
    const chapterTitles = new Set(chapterStages.map((s) => s.chapter));
    assert.equal(
      chapterTitles.size,
      1,
      `${lv} chapter stages must share a single unified chapter title`,
    );
    for (const s of chapterStages) {
      assert.equal(s.jlptLevel, lv);
      assert.equal(s.isCampaignStage, true);
    }
  }

  const stageIds = new Set<string>();
  const questionIds = new Set<string>();

  CHALLENGE_STAGES.forEach((stage, idx) => {
    assert.equal(stage.order, idx + 1);
    assert.equal(
      stageIds.has(stage.id),
      false,
      `Duplicate stage id: ${stage.id}`,
    );
    stageIds.add(stage.id);
    assert.ok(stage.questions.length >= 5, `${stage.id} must have >= 5 questions`);

    if (stage.stageKind === 'blitz-mission') {
      assert.equal(stage.mode, 'blitz');
      assert.equal(stage.timeLimitSeconds, 60);
      assert.equal(stage.targetCorrect, 6);
    }
    if (stage.stageKind === 'survival-mission') {
      assert.equal(stage.questions.length, 8);
    }
    if (stage.stageKind === 'boss') {
      assert.equal(stage.mode, 'boss');
      assert.equal(stage.questions.length, 8);
    }

    for (const q of stage.questions) {
      assert.equal(
        questionIds.has(q.id),
        false,
        `Duplicate question id: ${q.id}`,
      );
      questionIds.add(q.id);
      assert.ok(q.explanation.trim().length >= 10);

      const qKind = q.kind ?? 'mcq';
      if (qKind === 'sentence-order') {
        assert.ok(
          Array.isArray(q.orderedTokens) && q.orderedTokens.length === 4,
          `${q.id} sentence-order must have 4 orderedTokens`,
        );
        assert.ok(
          typeof q.starSlotIndex === 'number' &&
            q.starSlotIndex >= 0 &&
            q.starSlotIndex < 4,
          `${q.id} must have valid starSlotIndex`,
        );
      } else {
        assert.equal(q.options.length, 4, `${q.id} must have 4 options`);
        assert.equal(
          new Set(q.options).size,
          4,
          `${q.id} must not have duplicate options`,
        );
        assert.ok(
          q.correctIndex >= 0 && q.correctIndex < 4,
          `${q.id} has invalid correctIndex ${q.correctIndex}`,
        );

        if (qKind === 'audio-choice') {
          assert.ok(
            q.audioText && q.audioText.trim().length > 0,
            `${q.id} audio-choice must include audioText`,
          );
        }

        // Guard against single-option formatting giveaways
        const parenCount = q.options.filter((opt) => /\([^)]+\)/.test(opt)).length;
        assert.ok(
          parenCount === 0 || parenCount === 4,
          `${q.id} has uneven parenthetical hints across options (${parenCount}/4)`,
        );
        const slashCount = q.options.filter((opt) => opt.includes('/')).length;
        assert.ok(
          slashCount === 0 || slashCount === 4,
          `${q.id} has uneven slash synonyms across options (${slashCount}/4)`,
        );
      }

      // N3–N1 challenge questions must be 100% full Japanese (no Indonesian prompts, options, or hints)
      if (
        stage.jlptLevel === 'N3' ||
        stage.jlptLevel === 'N2' ||
        stage.jlptLevel === 'N1'
      ) {
        assert.ok(
          /[\u3040-\u30ff\u4e00-\u9faf]/.test(q.prompt),
          `${q.id} (${stage.jlptLevel}) prompt must be written in Japanese`,
        );
        assert.equal(
          /[a-z]{3,}/i.test(q.prompt.replace(/JLPT/g, '')),
          false,
          `${q.id} (${stage.jlptLevel}) prompt must not contain Indonesian/Latin hints: ${q.prompt}`,
        );
        if (qKind === 'sentence-order') {
          assert.equal(q.sentenceHint, undefined);
          for (const tok of q.orderedTokens ?? []) {
            assert.equal(
              /[a-z]{3,}/i.test(tok),
              false,
              `${q.id} (${stage.jlptLevel}) token must be Japanese: ${tok}`,
            );
          }
        } else {
          for (const opt of q.options) {
            assert.ok(
              /[\u3040-\u30ff\u4e00-\u9faf]/.test(opt),
              `${q.id} (${stage.jlptLevel}) option must be in Japanese: ${opt}`,
            );
            assert.equal(
              /[a-z]{3,}/i.test(opt),
              false,
              `${q.id} (${stage.jlptLevel}) option must not contain Latin/Indonesian words: ${opt}`,
            );
          }
        }
      }
    }
  });

  // Boss-to-next-chapter unlocking & backward compatibility
  const allIds = CHALLENGE_STAGES.map((s) => s.id);
  const n4FirstIdx = allIds.indexOf('stage-3');
  assert.equal(n4FirstIdx, 6);
  assert.equal(isStageUnlocked(n4FirstIdx, allIds, {}), false);
  assert.equal(
    isStageUnlocked(n4FirstIdx, allIds, {
      'boss-n5': { stars: 2, bestAccuracy: 88, xpEarned: 150 },
    }),
    true,
    'Defeating Boss N5 must unlock Stage 1 of Bab 2 (N4)',
  );

  // Backward compatibility: legacy completed stage stays unlocked even if new stages sit before it
  const legacyCompleted = {
    'stage-1': { stars: 3 as const, bestAccuracy: 100, xpEarned: 80 },
    'stage-5': { stars: 2 as const, bestAccuracy: 80, xpEarned: 120 },
  };
  const stage5Idx = allIds.indexOf('stage-5');
  assert.equal(isStageUnlocked(stage5Idx, allIds, legacyCompleted), true);
});

test('searchDictionaryCards matches Kanji, Kana, Romaji, meaning, and filters by level & status', () => {
  const nowIso = new Date().toISOString();
  const srs: AnkiSrsMap = {
    'n5-1': {
      cardId: 'n5-1',
      deckId: 'N5',
      state: 'review',
      repetitions: 4,
      intervalDays: 20,
      easeFactor: 2.5,
      lapses: 0,
      dueAt: Date.now() + 86400000,
      dueDate: nowIso,
      lastReviewedAt: nowIso,
    },
    'n4-1': {
      cardId: 'n4-1',
      deckId: 'N4',
      state: 'relearning',
      repetitions: 1,
      intervalDays: 0,
      easeFactor: 2.3,
      lapses: 2,
      dueAt: Date.now(),
      dueDate: nowIso,
      lastReviewedAt: nowIso,
    },
  };

  // Search by furigana
  const byKana = searchDictionaryCards({
    cards: SAMPLE_CARDS,
    query: 'たべる',
    level: 'ALL',
    status: 'ALL',
    ankiSrs: srs,
    againIds: ['n3-1'],
  });
  assert.equal(byKana.length, 1);
  assert.equal(byKana[0].card.id, 'n5-1');
  assert.equal(byKana[0].status, 'mastered');

  // Search by romaji
  const byRomaji = searchDictionaryCards({
    cards: SAMPLE_CARDS,
    query: 'dakyou',
    level: 'ALL',
    status: 'ALL',
    ankiSrs: srs,
    againIds: [],
  });
  assert.equal(byRomaji.length, 1);
  assert.equal(byRomaji[0].card.id, 'n1-1');

  // Filter difficult (both lapses>=1 and againIds)
  const difficult = searchDictionaryCards({
    cards: SAMPLE_CARDS,
    query: '',
    level: 'ALL',
    status: 'DIFFICULT',
    ankiSrs: srs,
    againIds: ['n3-1'],
  });
  assert.deepEqual(
    difficult.map((d) => d.card.id).sort(),
    ['n3-1', 'n4-1'],
  );

  // Filter level N5
  const n5Only = searchDictionaryCards({
    cards: SAMPLE_CARDS,
    query: '',
    level: 'N5',
    status: 'ALL',
    ankiSrs: srs,
    againIds: [],
  });
  assert.equal(n5Only.length, 2);
});

test('generateBunpouComparisonQuiz creates valid 5-question topic & mixed contrast quizzes', () => {
  const decks = loadFullBunpouDecks();

  const groups = buildCrossLevelBunpouComparisonGroups(decks);
  assert.ok(groups.length > 0);

  const contrastTopic =
    groups.find((g) => g.entries.length >= 6 && g.categoryType === 'semantic') ??
    groups[0];

  const topicQuiz = generateBunpouComparisonQuiz({
    group: contrastTopic,
    allGroups: groups,
    mode: 'topic',
    count: 5,
    seed: 1,
  });
  assert.ok(topicQuiz);
  assert.equal(topicQuiz.questions.length, 5);
  for (const q of topicQuiz.questions) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
    assert.ok(q.explanation.includes('**Jawaban benar:**'));
  }

  const mixedQuiz = generateBunpouComparisonQuiz({
    group: contrastTopic,
    allGroups: groups,
    mode: 'mixed',
    count: 5,
    seed: 2,
  });
  assert.ok(mixedQuiz);
  assert.equal(mixedQuiz.questions.length, 5);

  // Blank helper check
  const blanked = blankBunpouInSentence(
    '毎日練習したにもかかわらず、負けてしまった。',
    '〜にもかかわらず',
  );
  assert.equal(blanked, '毎日練習した＿＿＿＿、負けてしまった。');
});

test('generateDailyDrillStage is date-deterministic, varies on shuffle, and prioritizes difficult cards', () => {
  const { n5Items } = loadFullBunpouDecks();

  const difficultEntries: DifficultCardEntry[] = [
    {
      card: SAMPLE_CARDS[0],
      lapses: 3,
      easeFactor: 1.9,
      isRelearning: true,
    },
    {
      card: SAMPLE_CARDS[1],
      lapses: 2,
      easeFactor: 2.1,
      isRelearning: true,
    },
  ];

  const drillA = generateDailyDrillStage({
    dateKey: '2026-11-23',
    shuffleIndex: 0,
    unlockedLevel: 'N3',
    difficultCards: difficultEntries,
    unlockedAnkiCards: SAMPLE_CARDS,
    unlockedBunpouItems: n5Items,
    count: 5,
  });

  const drillB = generateDailyDrillStage({
    dateKey: '2026-11-23',
    shuffleIndex: 0,
    unlockedLevel: 'N3',
    difficultCards: difficultEntries,
    unlockedAnkiCards: SAMPLE_CARDS,
    unlockedBunpouItems: n5Items,
    count: 5,
  });

  assert.ok(drillA);
  assert.ok(drillB);
  assert.equal(drillA.questions.length, 5);
  assert.deepEqual(
    drillA.questions.map((q) => q.prompt),
    drillB.questions.map((q) => q.prompt),
  );

  // Must include difficult cards
  assert.ok(
    drillA.questions.some((q) => q.tag.startsWith('Kata Sulit')),
    'Daily drill should prioritize difficult cards',
  );
  // Must include bunpou
  assert.ok(
    drillA.questions.some((q) => q.tag.startsWith('Bunpou')),
    'Daily drill should include bunpou questions',
  );

  // Valid options
  for (const q of drillA.questions) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
  }

  // Shuffle index changes order/selection
  const drillShuffled = generateDailyDrillStage({
    dateKey: '2026-11-23',
    shuffleIndex: 7,
    unlockedLevel: 'N3',
    difficultCards: difficultEntries,
    unlockedAnkiCards: SAMPLE_CARDS,
    unlockedBunpouItems: n5Items,
    count: 5,
  });
  assert.ok(drillShuffled);
  assert.notEqual(drillA.id, drillShuffled.id);
});
