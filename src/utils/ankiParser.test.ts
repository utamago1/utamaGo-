import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyAnkiRating,
  categorizePartOfSpeech,
  filterAnkiCards,
  INITIAL_ANKI_N5_SEED,
  parseAnkiTxtDeck,
  splitReadingForRuby,
} from './ankiParser';

test('parseAnkiTxtDeck parses front, back, furigana, examples, and tags accurately', () => {
  const cards = parseAnkiTxtDeck(INITIAL_ANKI_N5_SEED);
  assert.equal(cards.length, 5);

  const first = cards[0];
  assert.equal(first.word, 'かばん');
  assert.equal(first.partOfSpeech, 'Kata benda');
  assert.equal(first.categoryGroup, 'Kata benda');
  assert.equal(first.readingTerm, 'かばん');
  assert.equal(first.furigana, null);
  assert.equal(first.meaning, 'Tas (tas jinjing, tas kerja, koper kecil)');
  assert.equal(first.examples.length, 2);
  assert.equal(first.examples[0].jp, 'このかばんは軽いです。');
  assert.equal(first.examples[0].id, 'Tas ini ringan.');
  assert.equal(first.examples[1].jp, 'かばんの中に本が入っています。');
  assert.equal(first.examples[1].id, 'Di dalam tas ada buku.');
  assert.equal(first.tag, 'jlpt-n5');
});

test('parseAnkiTxtDeck parses the full attached JLPT N5 file (654 cards) without errors', () => {
  const filePath = path.resolve(
    process.cwd(),
    'public/assets/aistudio/JLPT_N5_Indonesia_7e38cf1d.txt',
  );
  const raw = fs.readFileSync(filePath, 'utf8');
  const cards = parseAnkiTxtDeck(raw);

  assert.equal(cards.length, 654);
  for (const card of cards) {
    assert.ok(card.word.length > 0);
    assert.ok(card.meaning.length > 0);
    assert.equal(card.examples.length, 2);
  }

  const katakanaCard = cards.find((c) => c.word === 'コーヒー');
  assert.ok(katakanaCard);
  assert.equal(katakanaCard.furigana, null);
  assert.equal(katakanaCard.meaning, 'Kopi');
});

test('parseAnkiTxtDeck parses the full attached JLPT N4 file without errors', () => {
  const filePath = path.resolve(
    process.cwd(),
    'public/assets/aistudio/JLPT_N4_Indonesia.txt',
  );
  const raw = fs.readFileSync(filePath, 'utf8');
  const cards = parseAnkiTxtDeck(raw);

  assert.ok(cards.length >= 250);
  for (const card of cards) {
    assert.ok(card.word.length > 0);
    assert.ok(card.meaning.length > 0);
    assert.equal(card.examples.length, 2);
    assert.equal(card.tag, 'jlpt-n4');
    assert.ok(card.id.startsWith('jlpt-n4-'));
  }
});

test('parseAnkiTxtDeck parses the full JLPT N3, N2, and N1 files without errors', () => {
  const decks = [
    { file: 'JLPT_N3_Indonesia.txt', tag: 'jlpt-n3', expectedCount: 1641 },
    { file: 'JLPT_N2_Indonesia.txt', tag: 'jlpt-n2', expectedCount: 1685 },
    { file: 'JLPT_N1_Indonesia.txt', tag: 'jlpt-n1', expectedCount: 2866 },
  ];

  for (const deck of decks) {
    const filePath = path.resolve(
      process.cwd(),
      'public/assets/aistudio',
      deck.file,
    );
    const raw = fs.readFileSync(filePath, 'utf8');
    const cards = parseAnkiTxtDeck(raw);

    assert.equal(cards.length, deck.expectedCount, deck.file);
    for (const card of cards) {
      assert.ok(card.word.length > 0, `${deck.file}: empty word`);
      assert.ok(card.meaning.length > 0, `${deck.file}: empty meaning`);
      assert.equal(card.examples.length, 2, `${deck.file}: ${card.word}`);
      assert.equal(card.tag, deck.tag, `${deck.file}: wrong tag`);
      assert.ok(card.id.startsWith(`${deck.tag}-`), `${deck.file}: wrong id`);
    }
  }
});

test('filterAnkiCards filters by category and search query', () => {
  const cards = parseAnkiTxtDeck(INITIAL_ANKI_N5_SEED);

  const verbs = filterAnkiCards(cards, '', 'Kata kerja');
  assert.equal(verbs.length, 1);
  assert.equal(verbs[0].word, 'いる');

  const searchTas = filterAnkiCards(cards, 'ringan', 'Semua');
  assert.equal(searchTas.length, 1);
  assert.equal(searchTas[0].word, 'かばん');

  assert.equal(categorizePartOfSpeech('Kata sifat-na / Kata benda'), 'Kata sifat');
  assert.equal(categorizePartOfSpeech('Ungkapan'), 'Kata keterangan & Lainnya');
});

test('applyAnkiRating re-queues card on again and advances on easy/good', () => {
  const queue = [0, 1, 2, 3, 4];

  const afterEasy = applyAnkiRating(queue, 0, 'easy');
  assert.deepEqual(afterEasy.nextQueue, [0, 1, 2, 3, 4]);
  assert.equal(afterEasy.nextPos, 1);

  const afterAgain = applyAnkiRating(queue, 0, 'again');
  assert.equal(afterAgain.nextQueue.length, 6);
  assert.equal(afterAgain.nextQueue[4], 0);
  assert.equal(afterAgain.nextPos, 1);
});

test('splitReadingForRuby places furigana directly over kanji stem and leaves okurigana outside', () => {
  assert.deepEqual(splitReadingForRuby('鞄(かばん)'), [
    { base: '鞄', ruby: 'かばん' },
  ]);

  assert.deepEqual(splitReadingForRuby('上げる(あげる)'), [
    { base: '上', ruby: 'あ' },
    { base: 'げる' },
  ]);

  assert.deepEqual(splitReadingForRuby('お茶(おちゃ)'), [
    { base: 'お' },
    { base: '茶', ruby: 'ちゃ' },
  ]);

  assert.deepEqual(splitReadingForRuby('茶わん(ちゃわん)'), [
    { base: '茶', ruby: 'ちゃ' },
    { base: 'わん' },
  ]);

  assert.deepEqual(splitReadingForRuby('かばん'), [
    { base: 'かばん' },
  ]);
});
