import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOSS_CHALLENGE_STAGES,
  SENTENCE_ORDER_BANK,
} from '../data/challengeArenaData';
import type { JlptLevel } from '../data/utamagoContent';
import type { AnkiCard } from './ankiParser';
import type { BunpouN2Item } from './bunpouN2Parser';
import {
  generateBlitzStage,
  generateSurvivalStage,
} from './challengeArenaGenerator';

function makeCard(
  id: string,
  level: JlptLevel,
  word: string,
  furigana: string,
  meaning: string,
  index: number,
): AnkiCard {
  return {
    id,
    index,
    word,
    partOfSpeech: 'Kata benda',
    categoryGroup: 'Kata benda',
    readingTerm: word,
    furigana,
    meaning,
    examples: [],
    tag: level,
    deckId: level,
    jlptLevel: level,
    category: 'kosakata',
    cardKind: 'vocab',
  };
}

const SAMPLE_CARDS: AnkiCard[] = [
  makeCard('c1', 'N5', '図書館', 'としょかん', 'perpustakaan', 1),
  makeCard('c2', 'N5', '新聞', 'しんぶん', 'koran', 2),
  makeCard('c3', 'N5', '電気', 'でんき', 'listrik', 3),
  makeCard('c4', 'N5', '時計', 'とけい', 'jam', 4),
  makeCard('c5', 'N5', '病院', 'びょういん', 'rumah sakit', 5),
  makeCard('c6', 'N5', '自転車', 'じてんしゃ', 'sepeda', 6),
  makeCard('c7', 'N5', '映画', 'えいが', 'film', 7),
  makeCard('c8', 'N5', '音楽', 'おんがく', 'musik', 8),
  makeCard('n3-1', 'N3', '変更', 'へんこう', 'perubahan', 9),
  makeCard('n3-2', 'N3', '確認', 'かくにん', 'konfirmasi', 10),
  makeCard('n3-3', 'N3', '準備', 'じゅんび', 'persiapan', 11),
  makeCard('n3-4', 'N3', '計画', 'けいかく', 'rencana', 12),
  makeCard('n3-5', 'N3', '経験', 'けいけん', 'pengalaman', 13),
  makeCard('n3-6', 'N3', '説明', 'せつめい', 'penjelasan', 14),
  makeCard('n3-7', 'N3', '参加', 'さんか', 'partisipasi', 15),
  makeCard('n3-8', 'N3', '解決', 'かいけつ', 'penyelesaian', 16),
];

function makeBunpou(
  id: string,
  index: number,
  pattern: string,
  meaning: string,
  formula: string,
  exampleJp: string,
  exampleId: string,
): BunpouN2Item {
  return {
    id,
    level: 'N5',
    index,
    code: `N5-${index}`,
    pattern,
    romaji: '',
    crossReference: '',
    lessonNumber: 1,
    lessonTitle: 'Bab 1',
    lessonFullTitle: 'Bab 1',
    groupId: 'BAB1_4',
    groupTitle: 'Bab 1–4',
    meaning,
    register: 'Netral',
    formula,
    note: 'Catatan bunpou',
    examples: [{ jp: exampleJp, id: exampleId }],
  };
}

const SAMPLE_BUNPOU: BunpouN2Item[] = [
  makeBunpou('b-n5-1', 1, '～てもいいです', 'boleh melakukan', 'V-て + もいいです', 'ここで写真を撮ってもいいです。', 'Boleh foto di sini.'),
  makeBunpou('b-n5-2', 2, '～てはいけません', 'tidak boleh melakukan', 'V-て + はいけません', 'ここで食べてはいけません。', 'Tidak boleh makan di sini.'),
  makeBunpou('b-n5-3', 3, '～ことができます', 'bisa melakukan', 'V-kamus + ことができます', '漢字を書くことができます。', 'Bisa menulis kanji.'),
  makeBunpou('b-n5-4', 4, '～たいです', 'ingin melakukan', 'V-ます + たいです', '日本へ行きたいです。', 'Ingin pergi ke Jepang.'),
];

test('BOSS_CHALLENGE_STAGES covers all 5 JLPT levels with 3 question formats and full Japanese on N3–N1', () => {
  const levels: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
  assert.equal(BOSS_CHALLENGE_STAGES.length, 5);

  for (const lv of levels) {
    const boss = BOSS_CHALLENGE_STAGES.find((b) => b.jlptLevel === lv);
    assert.ok(boss, `Missing Boss Stage for ${lv}`);
    assert.equal(boss.mode, 'boss');
    assert.equal(boss.questions.length, 8);

    const kinds = new Set(boss.questions.map((q) => q.kind ?? 'mcq'));
    assert.ok(kinds.has('mcq'), `${boss.id} should contain mcq`);
    assert.ok(kinds.has('sentence-order'), `${boss.id} should contain sentence-order`);
    assert.ok(kinds.has('audio-choice'), `${boss.id} should contain audio-choice`);

    for (const q of boss.questions) {
      if (q.kind === 'sentence-order') {
        assert.ok(
          Array.isArray(q.orderedTokens) && q.orderedTokens.length >= 4,
          `${q.id} must have >= 4 orderedTokens`,
        );
        if (lv === 'N3' || lv === 'N2' || lv === 'N1') {
          assert.equal(
            /[a-z]{3,}/i.test(q.prompt),
            false,
            `${q.id} (${lv}) prompt must be full Japanese`,
          );
          assert.equal(q.sentenceHint, undefined);
        }
      } else {
        assert.equal(q.options.length, 4, `${q.id} must have 4 options`);
        assert.equal(new Set(q.options).size, 4, `${q.id} options must be unique`);
        if (q.kind === 'audio-choice') {
          assert.ok(q.audioText && q.audioText.length > 0);
        }
        if (lv === 'N3' || lv === 'N2' || lv === 'N1') {
          assert.equal(
            /[a-z]{3,}/i.test(q.prompt),
            false,
            `${q.id} (${lv}) prompt must be full Japanese`,
          );
          for (const opt of q.options) {
            assert.equal(
              /[a-z]{3,}/i.test(opt),
              false,
              `${q.id} (${lv}) option must be full Japanese: ${opt}`,
            );
          }
        }
      }
    }
  }
});

test('SENTENCE_ORDER_BANK provides 6 curated verified templates per JLPT level', () => {
  const levels: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
  for (const lv of levels) {
    const items = SENTENCE_ORDER_BANK.filter((item) => item.level === lv);
    assert.equal(items.length, 6, `Expected 6 sentence-order templates for ${lv}`);
    for (const item of items) {
      assert.equal(item.orderedTokens.length, 4);
      assert.ok(item.starSlotIndex >= 0 && item.starSlotIndex < 4);
    }
  }
});

test('generateBlitzStage and generateSurvivalStage mix MCQ, Audio, and Sentence Order cleanly', () => {
  const blitzN5 = generateBlitzStage({
    level: 'N5',
    ankiCards: SAMPLE_CARDS,
    bunpouItems: SAMPLE_BUNPOU,
    seedSalt: 'unit-test-1',
  });
  assert.equal(blitzN5.mode, 'blitz');
  assert.equal(blitzN5.timeLimitSeconds, 60);
  assert.ok(blitzN5.questions.length >= 15);
  const blitzKinds = new Set(blitzN5.questions.map((q) => q.kind ?? 'mcq'));
  assert.ok(blitzKinds.has('mcq'));
  assert.ok(blitzKinds.has('audio-choice'));
  assert.ok(blitzKinds.has('sentence-order'));

  const survivalN3 = generateSurvivalStage({
    level: 'N3',
    ankiCards: SAMPLE_CARDS,
    bunpouItems: SAMPLE_BUNPOU,
    seedSalt: 'unit-test-2',
  });
  assert.equal(survivalN3.mode, 'survival');
  assert.ok(survivalN3.questions.length >= 12);
  // Every N3 survival question must be full Japanese in prompt & options
  for (const q of survivalN3.questions) {
    assert.equal(
      /[a-z]{3,}/i.test(q.prompt.replace(/JLPT/g, '')),
      false,
      `N3 Survival prompt leaked Latin text: ${q.prompt}`,
    );
    if (q.kind !== 'sentence-order') {
      for (const opt of q.options) {
        assert.equal(
          /[a-z]{3,}/i.test(opt),
          false,
          `N3 Survival option leaked Latin text: ${opt}`,
        );
      }
    }
  }
});
