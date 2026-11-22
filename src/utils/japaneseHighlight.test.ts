import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parseAnkiTxtDeck } from './ankiParser';
import { parseBunpouN2Deck } from './bunpouN2Parser';
import { highlightJapaneseSentence } from './japaneseHighlight';

test('highlightJapaneseSentence highlights Kosakata words including conjugated verbs & adjectives', () => {
  const seg1 = highlightJapaneseSentence('このかばんは軽いです。', {
    target: 'かばん',
    readingTerm: 'かばん',
    kind: 'vocab',
  });
  assert.equal(seg1.some((s) => s.highlighted && s.text === 'かばん'), true);

  const seg2 = highlightJapaneseSentence('弟は部屋にいます。', {
    target: 'いる',
    readingTerm: 'いる',
    kind: 'vocab',
  });
  assert.equal(seg2.some((s) => s.highlighted && s.text.startsWith('いま')), true);

  const seg3 = highlightJapaneseSentence('友達にはがきを書きました。', {
    target: '書く',
    readingTerm: '書く(かく)',
    kind: 'vocab',
  });
  assert.equal(seg3.some((s) => s.highlighted && s.text === '書きました'), true);

  const seg4 = highlightJapaneseSentence('この花はきれいです。', {
    target: 'きれい',
    readingTerm: 'きれい',
    kind: 'vocab',
  });
  assert.equal(seg4.some((s) => s.highlighted && s.text === 'きれい'), true);
});

test('highlightJapaneseSentence highlights Bunpou patterns with optional parens, voicing, and variants', () => {
  const seg1 = highlightJapaneseSentence(
    '空港に到着した際に、パスポートを提示してください。',
    { target: '~際(に)', kind: 'bunpou' },
  );
  assert.equal(seg1.some((s) => s.highlighted && s.text === '際に'), true);

  const seg2 = highlightJapaneseSentence(
    '留学するにあたって、ビザの手続きを済ませておかなければならない。',
    { target: '~に際して・~にあたって', kind: 'bunpou' },
  );
  assert.equal(seg2.some((s) => s.highlighted && s.text === 'にあたって'), true);

  const seg3 = highlightJapaneseSentence(
    '薬を飲んだとたんに、眠くなってしまった。',
    { target: '~たとたん(に)', kind: 'bunpou' },
  );
  assert.equal(seg3.some((s) => s.highlighted && s.text.includes('とたんに')), true);
});

test('highlightJapaneseSentence achieves high coverage across real N5 Vocab and N2 Bunpou datasets', () => {
  const n5Raw = fs.readFileSync(
    path.resolve(process.cwd(), 'public/assets/aistudio/JLPT_N5_Indonesia_7e38cf1d.txt'),
    'utf8',
  );
  const n5Cards = parseAnkiTxtDeck(n5Raw);
  let n5Total = 0;
  let n5Matched = 0;
  for (const card of n5Cards) {
    for (const ex of card.examples) {
      n5Total++;
      const segs = highlightJapaneseSentence(ex.jp, {
        target: card.word,
        readingTerm: card.readingTerm,
        kind: 'vocab',
      });
      if (segs.some((s) => s.highlighted)) n5Matched++;
    }
  }
  const n5Rate = n5Matched / Math.max(1, n5Total);
  assert.ok(
    n5Rate >= 0.9,
    `Expected >=90% N5 vocab example highlight coverage, got ${(n5Rate * 100).toFixed(1)}% (${n5Matched}/${n5Total})`,
  );

  const bunpouRaw = fs.readFileSync(
    path.resolve(process.cwd(), 'public/assets/aistudio/JLPT_N2_Bunpou_Indonesia.txt'),
    'utf8',
  );
  const bunpouItems = parseBunpouN2Deck(bunpouRaw);
  let bpTotal = 0;
  let bpMatched = 0;
  for (const item of bunpouItems) {
    for (const ex of item.examples) {
      bpTotal++;
      const segs = highlightJapaneseSentence(ex.jp, {
        target: item.pattern,
        kind: 'bunpou',
      });
      if (segs.some((s) => s.highlighted)) bpMatched++;
    }
  }
  const bpRate = bpMatched / Math.max(1, bpTotal);
  assert.ok(
    bpRate >= 0.85,
    `Expected >=85% N2 bunpou example highlight coverage, got ${(bpRate * 100).toFixed(1)}% (${bpMatched}/${bpTotal})`,
  );
});
