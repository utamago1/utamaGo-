import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyAnkiDeckBySchedule,
  hydrateSrsMapFromLegacy,
  isCardDueToday,
  previewSm2IntervalLabels,
  scheduleSm2Card,
} from './ankiSrs';
import type { AnkiCard } from './ankiParser';

const MOCK_CARDS: AnkiCard[] = [
  {
    id: 'n5-1',
    index: 0,
    word: '水',
    furigana: 'みず',
    partOfSpeech: 'Kata benda',
    categoryGroup: 'Kata benda',
    readingTerm: '水(みず)',
    meaning: 'Air',
    examples: [],
    tag: 'jlpt-n5',
  },
  {
    id: 'n5-2',
    index: 1,
    word: '山',
    furigana: 'やま',
    partOfSpeech: 'Kata benda',
    categoryGroup: 'Kata benda',
    readingTerm: '山(やま)',
    meaning: 'Gunung',
    examples: [],
    tag: 'jlpt-n5',
  },
  {
    id: 'n5-3',
    index: 2,
    word: '川',
    furigana: 'かわ',
    partOfSpeech: 'Kata benda',
    categoryGroup: 'Kata benda',
    readingTerm: '川(かわ)',
    meaning: 'Sungai',
    examples: [],
    tag: 'jlpt-n5',
  },
];

test('scheduleSm2Card follows SM-2 intervals across again, hard, good, easy', () => {
  const today = '2026-11-19';
  const nowIso = '2026-11-19T08:00:00.000Z';

  const firstGood = scheduleSm2Card(undefined, 'good', today, nowIso);
  assert.equal(firstGood.repetitions, 1);
  assert.equal(firstGood.intervalDays, 1);
  assert.equal(firstGood.dueDate, '2026-11-20');

  const secondGood = scheduleSm2Card(firstGood, 'good', '2026-11-20', nowIso);
  assert.equal(secondGood.repetitions, 2);
  assert.equal(secondGood.intervalDays, 6);
  assert.equal(secondGood.dueDate, '2026-11-26');

  const thirdEasy = scheduleSm2Card(secondGood, 'easy', '2026-11-26', nowIso);
  assert.equal(thirdEasy.repetitions, 3);
  assert.ok(thirdEasy.intervalDays >= 18);
  assert.ok(thirdEasy.easeFactor > secondGood.easeFactor);

  const lapsed = scheduleSm2Card(thirdEasy, 'again', '2026-12-15', nowIso);
  assert.equal(lapsed.repetitions, 0);
  assert.equal(lapsed.intervalDays, 0);
  assert.equal(lapsed.dueDate, '2026-12-15');
  assert.equal(lapsed.lapses, 1);
});

test('previewSm2IntervalLabels formats readable Indonesian intervals', () => {
  const labels = previewSm2IntervalLabels(undefined, '2026-11-19');
  assert.equal(labels.again, '< 10 mnt');
  assert.equal(labels.hard, '1 hari');
  assert.equal(labels.good, '1 hari');
  assert.equal(labels.easy, '4 hari');
});

test('classifyAnkiDeckBySchedule and hydrateSrsMapFromLegacy preserve due & studied states', () => {
  const today = '2026-11-19';
  const srsMap = hydrateSrsMapFromLegacy({}, ['n5-1', 'n5-2'], ['n5-2'], today);

  assert.equal(isCardDueToday('n5-2', srsMap, ['n5-2'], today), true);
  assert.equal(isCardDueToday('n5-1', srsMap, ['n5-2'], today), false);

  const summary = classifyAnkiDeckBySchedule(
    MOCK_CARDS,
    srsMap,
    ['n5-2'],
    ['n5-1', 'n5-2'],
    today,
  );
  assert.equal(summary.dueCount, 1);
  assert.equal(summary.dueCards[0]?.id, 'n5-2');
  assert.equal(summary.scheduledLaterCount, 1);
  assert.equal(summary.newCards.length, 1);
  assert.equal(summary.newCards[0]?.id, 'n5-3');
});
