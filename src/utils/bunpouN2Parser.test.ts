import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  ankiCardToBunpouItem,
  bunpouItemToAnkiCard,
  filterBunpouN2Items,
  getBunpouGroupsForLevel,
  INITIAL_BUNPOU_N1_SEED,
  INITIAL_BUNPOU_N2_SEED,
  INITIAL_BUNPOU_N3_SEED,
  INITIAL_BUNPOU_N4_SEED,
  INITIAL_BUNPOU_N5_SEED,
  parseBunpouN1Deck,
  parseBunpouN2Deck,
  parseBunpouN3Deck,
  parseBunpouN4Deck,
  parseBunpouN5Deck,
} from './bunpouN2Parser';

test('parseBunpouN5Deck parses all 72 entries across 12 chapters and 3 groups', () => {
  const txtPath = path.resolve(
    process.cwd(),
    'public/assets/aistudio/Bunpou_N5_Try_0fefe20b.txt',
  );
  const raw = fs.readFileSync(txtPath, 'utf8');
  const items = parseBunpouN5Deck(raw);

  assert.equal(items.length, 72);

  const lessons = new Set(items.map((item) => item.lessonNumber));
  assert.equal(lessons.size, 12);

  const groups = new Set(items.map((item) => item.groupId));
  assert.deepEqual([...groups].sort(), ['BAB1_4', 'BAB5_8', 'BAB9']);
  assert.equal(getBunpouGroupsForLevel('N5', items.length).length, 4);

  for (const item of items) {
    assert.equal(item.level, 'N5');
    assert.ok(item.id.startsWith('n5-bunpou-'));
    assert.ok(item.pattern.length > 0, `Pattern missing on N5 ${item.code}`);
    assert.ok(item.meaning.length > 0, `Arti missing on N5 ${item.code}`);
    assert.ok(item.examples.length >= 2, `Contoh < 2 on N5 ${item.code}`);
    for (const ex of item.examples) {
      assert.ok(ex.jp.length > 0, `JP example empty on N5 ${item.code}`);
      assert.ok(ex.id.length > 0, `ID translation empty on N5 ${item.code}`);
    }
  }

  const singleNumItem = items.find((i) => i.code === '1');
  assert.ok(singleNumItem);
  assert.equal(singleNumItem.lessonNumber, 2);

  const lastItem = items[items.length - 1];
  assert.equal(lastItem.code, 'P9-4-1');
  assert.equal(lastItem.lessonNumber, 12);
  assert.ok(!lastItem.note.includes('Catatan penyusun'));

  const card = bunpouItemToAnkiCard(items[0]);
  assert.equal(card.deckId, 'N5_BUNPOU');
  assert.equal(card.tag, 'jlpt-n5-bab-1');
  const restored = ankiCardToBunpouItem(card);
  assert.equal(restored.level, 'N5');
  assert.equal(restored.code, items[0].code);
  assert.equal(restored.pattern, items[0].pattern);
});

test('parseBunpouN4Deck parses all 99 entries across 40 lessons and 2 groups', () => {
  const txtPath = path.resolve(
    process.cwd(),
    'public/assets/aistudio/Bunpou_N4_Shinkanzenmaster_a448db92.txt',
  );
  const raw = fs.readFileSync(txtPath, 'utf8');
  const items = parseBunpouN4Deck(raw);

  assert.equal(items.length, 99);

  const lessons = new Set(items.map((item) => item.lessonNumber));
  assert.equal(lessons.size, 40);

  const groups = new Set(items.map((item) => item.groupId));
  assert.deepEqual([...groups].sort(), ['B1', 'B2']);
  assert.equal(getBunpouGroupsForLevel('N4', items.length).length, 3);

  for (const item of items) {
    assert.equal(item.level, 'N4');
    assert.ok(item.id.startsWith('n4-bunpou-'));
    assert.ok(item.pattern.length > 0, `Pattern missing on N4 ${item.code}`);
    assert.ok(item.meaning.length > 0, `Arti missing on N4 ${item.code}`);
    assert.ok(
      item.lessonFullTitle.startsWith(`Bab ${item.lessonNumber} · `),
      `N4 ${item.code} should use uniform Bab N format: ${item.lessonFullTitle}`,
    );
    assert.ok(
      !item.lessonFullTitle.includes('課'),
      `N4 ${item.code} should not use 課: ${item.lessonFullTitle}`,
    );
    assert.ok(
      /[A-Za-z]{3,}/.test(item.lessonTitleId ?? ''),
      `N4 Bab ${item.lessonNumber} missing Indonesian title: ${item.lessonTitleId}`,
    );
    assert.ok(item.examples.length >= 2, `Contoh < 2 on N4 ${item.code}`);
    for (const ex of item.examples) {
      assert.ok(ex.jp.length > 0, `JP example empty on N4 ${item.code}`);
      assert.ok(ex.id.length > 0, `ID translation empty on N4 ${item.code}`);
    }
  }

  const part2First = items.find((i) => i.code === 'P2-1-1');
  assert.ok(part2First);
  assert.equal(part2First.groupId, 'B2');
  assert.equal(part2First.lessonNumber, 26);
  assert.ok(part2First.lessonFullTitle.startsWith('Bab 26 · Partikel で dan に'));

  const card = bunpouItemToAnkiCard(part2First);
  assert.equal(card.deckId, 'N4_BUNPOU');
  assert.equal(card.tag, 'jlpt-n4-bab-26');
  const restored = ankiCardToBunpouItem(card);
  assert.equal(restored.level, 'N4');
  assert.equal(restored.code, part2First.code);
  assert.equal(restored.pattern, part2First.pattern);
});

test('parseBunpouN2Deck parses all 141 entries across 26 lessons and 3 groups', () => {
  const txtPath = path.resolve(
    process.cwd(),
    'public/assets/aistudio/JLPT_N2_Bunpou_Indonesia.txt',
  );
  const raw = fs.readFileSync(txtPath, 'utf8');
  const items = parseBunpouN2Deck(raw);

  assert.equal(items.length, 141);

  const lessons = new Set(items.map((item) => item.lessonNumber));
  assert.equal(lessons.size, 26);

  const groups = new Set(items.map((item) => item.groupId));
  assert.deepEqual([...groups].sort(), ['I', 'II', 'III']);

  for (const item of items) {
    assert.equal(item.level, 'N2');
    assert.ok(item.pattern.length > 0, `Pattern missing on ${item.code}`);
    assert.ok(item.meaning.length > 0, `Arti missing on ${item.code}`);
    assert.ok(item.formula.length > 0, `Rumus missing on ${item.code}`);
    assert.ok(item.examples.length >= 1, `Contoh missing on ${item.code}`);
    for (const ex of item.examples) {
      assert.ok(ex.jp.length > 0, `JP example empty on ${item.code}`);
      assert.ok(ex.id.length > 0, `ID translation empty on ${item.code}`);
    }
  }

  const crossRefItem = items.find((i) => i.code === '2-6');
  assert.ok(crossRefItem);
  assert.equal(crossRefItem.pattern, '~つつ');
  assert.equal(crossRefItem.romaji, 'tsutsu');
  assert.ok(crossRefItem.crossReference.includes('14'));

  const multiLineRomajiItem = items.find((i) => i.code === '10-3');
  assert.ok(multiLineRomajiItem);
  assert.equal(
    multiLineRomajiItem.pattern,
    '~にしても~にしても・~にしろ~にしろ・~にせよ~にせよ',
  );
  assert.ok(multiLineRomajiItem.romaji.includes('ni shite mo'));
});

test('parseBunpouN3Deck parses all 144 entries across 28 sections and 4 groups', () => {
  const txtPath = path.resolve(
    process.cwd(),
    'public/assets/aistudio/Bunpou_N3_ShinKanzenMaster_c3c47d26.txt',
  );
  const raw = fs.readFileSync(txtPath, 'utf8');
  const items = parseBunpouN3Deck(raw);

  assert.equal(items.length, 144);

  const lessons = new Set(items.map((item) => item.lessonNumber));
  assert.equal(lessons.size, 28);

  const groups = new Set(items.map((item) => item.groupId));
  assert.deepEqual([...groups].sort(), ['B1', 'B2', 'B3', 'RINGKASAN']);
  assert.equal(getBunpouGroupsForLevel('N3', items.length).length, 5);

  for (const item of items) {
    assert.equal(item.level, 'N3');
    assert.ok(item.id.startsWith('n3-bunpou-'));
    assert.ok(item.pattern.length > 0, `Pattern missing on N3 ${item.code}`);
    assert.ok(item.meaning.length > 0, `Arti missing on N3 ${item.code}`);
    assert.ok(item.examples.length >= 1, `Contoh missing on N3 ${item.code}`);
  }

  const card = bunpouItemToAnkiCard(items[0]);
  assert.equal(card.tag, 'jlpt-n3-bab-1');
  const restored = ankiCardToBunpouItem(card);
  assert.equal(restored.level, 'N3');
  assert.equal(restored.code, items[0].code);
  assert.equal(restored.pattern, items[0].pattern);
});

test('parseBunpouN1Deck parses all 97 entries across 20 lessons and 3 groups', () => {
  const txtPath = path.resolve(
    process.cwd(),
    'public/assets/aistudio/Bunpou_N1_pelajaran1-20_c990e95d.txt',
  );
  const raw = fs.readFileSync(txtPath, 'utf8');
  const items = parseBunpouN1Deck(raw);

  assert.equal(items.length, 97);

  const lessons = new Set(items.map((item) => item.lessonNumber));
  assert.equal(lessons.size, 20);

  const groups = new Set(items.map((item) => item.groupId));
  assert.deepEqual([...groups].sort(), ['I', 'II', 'III']);
  assert.equal(getBunpouGroupsForLevel('N1', items.length).length, 4);

  for (const item of items) {
    assert.equal(item.level, 'N1');
    assert.ok(item.id.startsWith('n1-bunpou-'));
    assert.ok(item.pattern.length > 0, `Pattern missing on N1 ${item.code}`);
    assert.ok(item.meaning.length > 0, `Arti missing on N1 ${item.code}`);
    assert.ok(item.formula.length > 0, `Rumus missing on N1 ${item.code}`);
    assert.ok(
      item.lessonFullTitle.startsWith(`Bab ${item.lessonNumber} · `) &&
        !item.lessonFullTitle.includes('課'),
      `N1 ${item.code} should use uniform Bab N format: ${item.lessonFullTitle}`,
    );
    assert.ok(item.examples.length >= 1, `Contoh missing on N1 ${item.code}`);
  }

  const card = bunpouItemToAnkiCard(items[0]);
  assert.equal(card.tag, 'jlpt-n1-bab-1');
  const restored = ankiCardToBunpouItem(card);
  assert.equal(restored.level, 'N1');
  assert.equal(restored.code, items[0].code);
  assert.equal(restored.pattern, items[0].pattern);
});

test('bunpouItemToAnkiCard round-trips cleanly through ankiCardToBunpouItem', () => {
  const seedItems = parseBunpouN2Deck(INITIAL_BUNPOU_N2_SEED);
  assert.equal(seedItems.length, 3);
  assert.equal(parseBunpouN5Deck(INITIAL_BUNPOU_N5_SEED).length, 3);
  assert.equal(parseBunpouN4Deck(INITIAL_BUNPOU_N4_SEED).length, 3);
  assert.equal(parseBunpouN3Deck(INITIAL_BUNPOU_N3_SEED).length, 3);
  assert.equal(parseBunpouN1Deck(INITIAL_BUNPOU_N1_SEED).length, 3);

  const card = bunpouItemToAnkiCard(seedItems[0]);
  assert.equal(card.cardKind, 'bunpou');
  assert.equal(card.code, '1-1');
  assert.equal(card.word, '~際(に)');
  assert.equal(card.romaji, 'sai (ni)');
  assert.ok(card.formula?.includes('際(に)'));

  const restored = ankiCardToBunpouItem(card);
  assert.equal(restored.code, seedItems[0].code);
  assert.equal(restored.pattern, seedItems[0].pattern);
  assert.equal(restored.meaning, seedItems[0].meaning);
  assert.equal(restored.formula, seedItems[0].formula);
  assert.equal(restored.examples.length, seedItems[0].examples.length);
});

test('filterBunpouN2Items filters by group, lesson, and search query', () => {
  const items = parseBunpouN2Deck(INITIAL_BUNPOU_N2_SEED);
  const byQuery = filterBunpouN2Items(items, 'tindakan');
  assert.ok(byQuery.length >= 1);

  const byLesson = filterBunpouN2Items(items, '', 'I', 1);
  assert.equal(byLesson.length, 3);

  const byOtherGroup = filterBunpouN2Items(items, '', 'III', 'all');
  assert.equal(byOtherGroup.length, 0);
});
