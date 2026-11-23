import assert from 'node:assert/strict';
import test from 'node:test';
import type { AnkiCard } from './ankiParser';
import {
  buildWritingPracticeDeck,
  extractKanjiCharacters,
  extractKanjiPracticeItems,
  HIRAGANA_PRACTICE_ITEMS,
  KATAKANA_PRACTICE_ITEMS,
} from './writingPractice';

const SAMPLE_CARDS: AnkiCard[] = [
  {
    id: 'c1',
    index: 1,
    deckId: 'N5',
    jlptLevel: 'N5',
    word: '日本語',
    furigana: 'にほんご',
    readingTerm: 'にほんご',
    romaji: 'nihongo',
    meaning: 'bahasa Jepang',
    partOfSpeech: 'Kata Benda',
    categoryGroup: 'Kata benda',
    tag: 'n5',
    examples: [],
  },
  {
    id: 'c2',
    index: 2,
    deckId: 'N5',
    jlptLevel: 'N5',
    word: '毎日',
    furigana: 'まいにち',
    readingTerm: 'まいにち',
    romaji: 'mainichi',
    meaning: 'setiap hari',
    partOfSpeech: 'Kata Benda',
    categoryGroup: 'Kata benda',
    tag: 'n5',
    examples: [],
  },
  {
    id: 'c3',
    index: 3,
    deckId: 'N2',
    jlptLevel: 'N2',
    word: '経験',
    furigana: 'けいけん',
    readingTerm: 'けいけん',
    romaji: 'keiken',
    meaning: 'pengalaman',
    partOfSpeech: 'Kata Benda',
    categoryGroup: 'Kata benda',
    tag: 'n2',
    examples: [],
  },
  {
    id: 'b1',
    index: 4,
    deckId: 'N2_BUNPOU',
    jlptLevel: 'N2',
    cardKind: 'bunpou',
    word: '〜に違いない',
    furigana: 'にちがいない',
    readingTerm: 'にちがいない',
    romaji: 'ni chigainai',
    meaning: 'pasti',
    partOfSpeech: 'Bunpou',
    categoryGroup: 'Kata benda',
    tag: 'n2-bunpou',
    examples: [],
  },
];

test('Hiragana and Katakana practice decks contain all 46 basic characters', () => {
  assert.equal(HIRAGANA_PRACTICE_ITEMS.length, 46);
  assert.equal(KATAKANA_PRACTICE_ITEMS.length, 46);
  assert.equal(HIRAGANA_PRACTICE_ITEMS[0].character, 'あ');
  assert.equal(KATAKANA_PRACTICE_ITEMS[0].character, 'ア');
});

test('extractKanjiCharacters extracts unique Kanji and ignores kana/latin', () => {
  assert.deepEqual(extractKanjiCharacters('毎日日本語を食べる (ABC)'), [
    '毎',
    '日',
    '本',
    '語',
    '食',
  ]);
  assert.deepEqual(extractKanjiCharacters('ひらがな・カタカナ'), []);
});

test('extractKanjiPracticeItems deduplicates kanji, skips bunpou cards, and filters by level/difficulty', () => {
  const n5Items = extractKanjiPracticeItems(SAMPLE_CARDS, { level: 'N5' });
  // 日本語 (日,本,語) + 毎日 (毎,日 -> 日 already seen) = 4 unique N5 Kanji
  assert.deepEqual(
    n5Items.map((i) => i.character),
    ['日', '本', '語', '毎'],
  );

  const difficultSet = new Set(['c3']);
  const difficultOnly = extractKanjiPracticeItems(SAMPLE_CARDS, {
    onlyDifficult: true,
    difficultCardIds: difficultSet,
  });
  assert.deepEqual(
    difficultOnly.map((i) => i.character),
    ['経', '験'],
  );
  assert.equal(difficultOnly[0].isDifficult, true);
});

test('buildWritingPracticeDeck prioritizes seedText kanji and falls back to mode decks', () => {
  const seeded = buildWritingPracticeDeck({
    mode: 'kanji',
    level: 'N5',
    cards: SAMPLE_CARDS,
    seedText: '経験する',
  });
  assert.deepEqual(
    seeded.map((i) => i.character),
    ['経', '験'],
  );
  assert.equal(seeded[0].exampleWord, '経験');

  const hira = buildWritingPracticeDeck({
    mode: 'hiragana',
    level: 'N5',
    cards: SAMPLE_CARDS,
  });
  assert.equal(hira.length, 46);
});
