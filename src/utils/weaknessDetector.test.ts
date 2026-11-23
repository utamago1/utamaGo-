import assert from 'node:assert/strict';
import test from 'node:test';
import { getTryOutPacketForms } from '../data/tryOutN2AllPackets';
import type { AnkiCard } from './ankiParser';
import type { AnkiSrsMap } from './ankiSrs';
import type { BunpouN2Item } from './bunpouN2Parser';
import type { StoredTryOutPacketState } from './storage';
import { analyzeJlptWeaknesses } from './weaknessDetector';

const SAMPLE_VOCAB: AnkiCard[] = [
  {
    id: 'v1',
    deckId: 'N2',
    jlptLevel: 'N2',
    word: '影響',
    furigana: 'えいきょう',
    romaji: 'eikyou',
    meaning: 'pengaruh',
    partOfSpeech: 'Kata Benda',
    categoryGroup: 'Kata benda',
    examples: [],
  },
  {
    id: 'v2',
    deckId: 'N2',
    jlptLevel: 'N2',
    word: '解決',
    furigana: 'かいけつ',
    romaji: 'kaiketsu',
    meaning: 'penyelesaian',
    partOfSpeech: 'Kata Benda',
    categoryGroup: 'Kata benda',
    examples: [],
  },
];

const SAMPLE_BUNPOU: BunpouN2Item[] = [
  {
    id: 'bp-1',
    level: 'N2',
    index: 1,
    code: '1.1',
    pattern: '〜わけだ',
    romaji: 'wake da',
    crossReference: '',
    lessonNumber: 1,
    lessonTitle: 'Bab 1',
    lessonFullTitle: 'Bab 1 · Penjelasan',
    groupId: 'G1',
    groupTitle: 'Penjelasan',
    meaning: 'pantas saja',
    register: 'Netral',
    formula: 'Bentuk biasa + わけだ',
    note: 'Menyatakan kesimpulan wajar.',
    examples: [],
  },
  {
    id: 'bp-2',
    level: 'N2',
    index: 2,
    code: '1.2',
    pattern: '〜わけではない',
    romaji: 'wake dewa nai',
    crossReference: '',
    lessonNumber: 1,
    lessonTitle: 'Bab 1',
    lessonFullTitle: 'Bab 1 · Penjelasan',
    groupId: 'G1',
    groupTitle: 'Penjelasan',
    meaning: 'bukan berarti',
    register: 'Netral',
    formula: 'Bentuk biasa + わけではない',
    note: 'Menyangkal sebagian.',
    examples: [],
  },
];

function makePacketState(
  submittedIds: ('moji-bunpou' | 'dokkai' | 'choukai')[],
  answersByPart: Partial<
    Record<'moji-bunpou' | 'dokkai' | 'choukai', Record<string, string>>
  >,
): StoredTryOutPacketState {
  return {
    packetProgress: {
      completedIds: [...submittedIds],
      submittedIds: [...submittedIds],
      answersByPart: {
        'moji-bunpou': answersByPart['moji-bunpou'] ?? {},
        dokkai: answersByPart.dokkai ?? {},
        choukai: answersByPart.choukai ?? {},
      },
    },
    tryoutTimers: { 'moji-bunpou': 0, dokkai: 0, choukai: 0 },
    tryoutFlaggedIds: { 'moji-bunpou': [], dokkai: [], choukai: [] },
    choukaiAudio: { currentTime: 0, playbackRate: 1 },
  };
}

test('analyzeJlptWeaknesses gives starter recommendations for brand-new users', () => {
  const report = analyzeJlptWeaknesses({
    unlockedLevel: 'N5',
    unlockedAnkiCards: SAMPLE_VOCAB,
    ankiSrs: {},
    againIds: [],
    packetsProgress: {},
    bunpouByLevel: { N5: SAMPLE_BUNPOU },
    reviewedLessonIds: [],
  });

  assert.equal(report.hasEnoughData, false);
  assert.ok(report.insights.length >= 2);
  assert.equal(report.insights[0].action.type, 'anki');
});

test('analyzeJlptWeaknesses flags difficult vocab, difficult kanji, and bunpou gap', () => {
  const nowIso = new Date().toISOString();
  const srs: AnkiSrsMap = {
    v1: {
      state: 'relearning',
      repetitions: 1,
      intervalDays: 0,
      easeFactor: 1.7,
      lapses: 3,
      dueAt: nowIso,
      lastReviewedAt: nowIso,
      lastRating: 'again',
    },
    v2: {
      state: 'relearning',
      repetitions: 1,
      intervalDays: 0,
      easeFactor: 1.8,
      lapses: 2,
      dueAt: nowIso,
      lastReviewedAt: nowIso,
      lastRating: 'again',
    },
  };

  const report = analyzeJlptWeaknesses({
    unlockedLevel: 'N2',
    unlockedAnkiCards: SAMPLE_VOCAB,
    ankiSrs: srs,
    againIds: ['v1', 'v2'],
    packetsProgress: {},
    bunpouByLevel: { N2: SAMPLE_BUNPOU },
    reviewedLessonIds: [],
  });

  assert.equal(report.hasEnoughData, true);
  assert.equal(report.difficultWordCount, 2);
  assert.equal(report.difficultKanjiCount, 4); // 影,響,解,決
  assert.equal(report.bunpouRemainingCount, 2);
  assert.ok(report.insights.some((i) => i.action.type === 'difficult-drill'));
  assert.ok(
    report.insights.some(
      (i) => i.action.type === 'writing-studio' && i.action.mode === 'difficult-kanji',
    ),
  );
  assert.ok(report.insights.some((i) => i.action.type === 'bunpou'));
});

test('analyzeJlptWeaknesses detects JLPT N2 section below 19/60 cutoff and weakest Mondai', () => {
  const forms = getTryOutPacketForms('n2-2');
  const mojiPages = forms['moji-bunpou'];
  assert.ok(mojiPages && mojiPages.length > 0);

  // Answer every question intentionally wrong so scaled score is 0/60 (< 19 cutoff)
  const wrongAnswers: Record<string, string> = {};
  for (const page of mojiPages) {
    for (const field of page.fields) {
      wrongAnswers[field.id] = field.answerKey === '1' ? '2' : '1';
    }
  }

  const packetState = makePacketState(['moji-bunpou'], {
    'moji-bunpou': wrongAnswers,
  });

  const report = analyzeJlptWeaknesses({
    unlockedLevel: 'N2',
    unlockedAnkiCards: SAMPLE_VOCAB,
    ankiSrs: {},
    againIds: [],
    packetsProgress: { 'n2-2': packetState },
    bunpouByLevel: { N2: SAMPLE_BUNPOU },
    reviewedLessonIds: ['bp-1', 'bp-2'],
  });

  assert.equal(report.hasEnoughData, true);
  assert.ok(report.weakestMondaiLabel !== null);
  const cutoffInsight = report.insights.find((i) => i.category === 'tryout');
  assert.ok(cutoffInsight);
  assert.equal(cutoffInsight.severity, 'high');
  assert.equal(cutoffInsight.action.type, 'tryout-packet');
  if (cutoffInsight.action.type === 'tryout-packet') {
    assert.equal(cutoffInsight.action.packetId, 'n2-2');
    assert.equal(cutoffInsight.action.partId, 'moji-bunpou');
  }
});
