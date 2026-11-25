import assert from 'node:assert/strict';
import test from 'node:test';
import { getTryOutPacketForms } from '../data/tryOutN2AllPackets';
import { lookupKanjiReadings } from '../data/kanjiReadings';
import { getTryOutPacketParts } from './tryOutPacket';
import {
  JLPT_N3_OFFICIAL_TIMING,
  JLPT_N3_SECTION_MAX,
  JLPT_N3_SECTION_PASS_MIN,
  JLPT_N3_TOTAL_MAX,
  JLPT_N3_TOTAL_PASS_MIN,
  evaluateJlptN3PacketScore,
  evaluateJlptN3PartScore,
  evaluateJlptN3SessionBunpouSupplement,
} from './jlptN3Scoring';
import type { FormProgressPageRef } from './tryOutPacket';

function buildAnswersForFraction(
  pages: readonly FormProgressPageRef[],
  fraction: number,
): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const page of pages) {
    const gradableItems = page.items.filter(
      (item) => item.kind === 'choice' && Boolean(item.correctAnswer),
    );
    const targetCorrect = Math.round(gradableItems.length * fraction);
    gradableItems.forEach((item, idx) => {
      if (idx < targetCorrect && item.correctAnswer) {
        answers[item.id] = item.correctAnswer;
      } else {
        answers[item.id] = item.correctAnswer === '1' ? '2' : '1';
      }
    });
  }
  return answers;
}

test('JLPT N3 official timing and 3 exam sessions match 30m Moji-Goi, 70m Bunpou & Dokkai, 40m Choukai (140m total)', () => {
  assert.equal(JLPT_N3_OFFICIAL_TIMING.mojiGoiMinutes, 30);
  assert.equal(JLPT_N3_OFFICIAL_TIMING.bunpouDokkaiMinutes, 70);
  assert.equal(JLPT_N3_OFFICIAL_TIMING.choukaiMinutes, 40);
  assert.equal(JLPT_N3_OFFICIAL_TIMING.totalMinutes, 140);

  const parts = getTryOutPacketParts('n3-1');
  assert.equal(parts.length, 3);
  assert.equal(parts[0].recommendedMinutes, 30);
  assert.equal(parts[0].questionCount, 35);
  assert.match(parts[0].title, /Moji-Goi/i);

  assert.equal(parts[1].recommendedMinutes, 70);
  assert.equal(parts[1].questionCount, 39);
  assert.match(parts[1].title, /Bunpou & Dokkai/i);

  assert.equal(parts[2].recommendedMinutes, 40);
  assert.equal(parts[2].questionCount, 28);
  assert.match(parts[2].title, /Choukai/i);
});

test('all 5 verified JLPT N3 packets split into 35 Moji-Goi, 39 Bunpou+Dokkai, and 27-28 Choukai with exact official raw totals (58 / 60 / 56)', () => {
  const specs = [
    { id: 'n3-1', choukaiQ: 28, choukaiRaw: 56 },
    { id: 'n3-2', choukaiQ: 27, choukaiRaw: 54 },
    { id: 'n3-3', choukaiQ: 27, choukaiRaw: 54 },
    { id: 'n3-4', choukaiQ: 28, choukaiRaw: 56 },
    { id: 'n3-5', choukaiQ: 28, choukaiRaw: 56 },
  ];

  for (const spec of specs) {
    const forms = getTryOutPacketForms(spec.id);
    const mojiQ = forms['moji-bunpou'].reduce(
      (sum, pg) => sum + pg.items.filter((i) => i.kind === 'choice').length,
      0,
    );
    const bunpouDokkaiQ = forms.dokkai.reduce(
      (sum, pg) => sum + pg.items.filter((i) => i.kind === 'choice').length,
      0,
    );
    const choukaiQ = forms.choukai.reduce(
      (sum, pg) => sum + pg.items.filter((i) => i.kind === 'choice').length,
      0,
    );
    assert.equal(mojiQ, 35, `${spec.id} Moji-Goi question count`);
    assert.equal(bunpouDokkaiQ, 39, `${spec.id} Bunpou+Dokkai question count`);
    assert.equal(choukaiQ, spec.choukaiQ, `${spec.id} Choukai question count`);

    const perfect = evaluateJlptN3PacketScore({
      forms,
      answersByPart: {
        'moji-bunpou': buildAnswersForFraction(forms['moji-bunpou'], 1),
        dokkai: buildAnswersForFraction(forms.dokkai, 1),
        choukai: buildAnswersForFraction(forms.choukai, 1),
      },
      submittedIds: ['moji-bunpou', 'dokkai', 'choukai'],
    });

    // Exact official JLPT N3 raw point totals from table: 58 / 60 / 56 (54 on 27q)
    assert.equal(perfect.parts['moji-bunpou'].maxRawPoints, 58);
    assert.equal(perfect.parts['moji-bunpou'].totalQuestions, 58);
    assert.equal(perfect.parts.dokkai.maxRawPoints, 60);
    assert.equal(perfect.parts.dokkai.totalQuestions, 16);
    assert.equal(perfect.parts.choukai.maxRawPoints, spec.choukaiRaw);
    assert.equal(perfect.parts.choukai.totalQuestions, spec.choukaiQ);

    assert.equal(perfect.parts['moji-bunpou'].scaledScore, JLPT_N3_SECTION_MAX);
    assert.equal(perfect.parts.dokkai.scaledScore, JLPT_N3_SECTION_MAX);
    assert.equal(perfect.parts.choukai.scaledScore, JLPT_N3_SECTION_MAX);
    assert.equal(perfect.totalScaledScore, JLPT_N3_TOTAL_MAX);
    assert.equal(perfect.status, 'passed');
    assert.equal(perfect.isPassed, true);
  }
});

test('JLPT N3 scoring enforces 95/180 pass total, 19/60 per section, and combines Moji-Goi + Bunpou across Session 1 & 2', () => {
  assert.equal(JLPT_N3_TOTAL_MAX, 180);
  assert.equal(JLPT_N3_TOTAL_PASS_MIN, 95);
  assert.equal(JLPT_N3_SECTION_MAX, 60);
  assert.equal(JLPT_N3_SECTION_PASS_MIN, 19);

  const forms = getTryOutPacketForms('n3-1');

  // Submitting only Session 1 (Moji-Goi) waits for Bunpou in Session 2 before finalizing Language Knowledge score
  const onlyMoji = evaluateJlptN3PacketScore({
    forms,
    answersByPart: {
      'moji-bunpou': buildAnswersForFraction(forms['moji-bunpou'], 1),
      dokkai: {},
      choukai: {},
    },
    submittedIds: ['moji-bunpou'],
  });
  assert.equal(onlyMoji.parts['moji-bunpou'].isSubmitted, false);
  assert.equal(onlyMoji.parts['moji-bunpou'].earnedRawPoints, 35);
  assert.equal(onlyMoji.status, 'in-progress');

  // Total >= 95 but Choukai < 19 => failed-cutoff
  const failedCutoff = evaluateJlptN3PacketScore({
    forms,
    answersByPart: {
      'moji-bunpou': buildAnswersForFraction(forms['moji-bunpou'], 0.9),
      dokkai: buildAnswersForFraction(forms.dokkai, 0.9),
      choukai: buildAnswersForFraction(forms.choukai, 0.1),
    },
    submittedIds: ['moji-bunpou', 'dokkai', 'choukai'],
  });
  assert.ok(failedCutoff.totalScaledScore >= 95);
  assert.ok(failedCutoff.parts.choukai.scaledScore < 19);
  assert.equal(failedCutoff.status, 'failed-cutoff');
  assert.equal(failedCutoff.isPassed, false);
  assert.deepEqual(failedCutoff.failedCutoffs, ['choukai']);

  // Every section >= 19 but total < 95 => failed-total
  const failedTotal = evaluateJlptN3PacketScore({
    forms,
    answersByPart: {
      'moji-bunpou': buildAnswersForFraction(forms['moji-bunpou'], 0.45),
      dokkai: buildAnswersForFraction(forms.dokkai, 0.45),
      choukai: buildAnswersForFraction(forms.choukai, 0.45),
    },
    submittedIds: ['moji-bunpou', 'dokkai', 'choukai'],
  });
  assert.ok(failedTotal.parts['moji-bunpou'].scaledScore >= 19);
  assert.ok(failedTotal.parts.dokkai.scaledScore >= 19);
  assert.ok(failedTotal.parts.choukai.scaledScore >= 19);
  assert.ok(failedTotal.totalScaledScore < 95);
  assert.equal(failedTotal.status, 'failed-total');
  assert.equal(failedTotal.isPassed, false);

  // Session 2 runner helpers cleanly separate Dokkai (/60) and Bunpou (/23)
  const session2Answers = buildAnswersForFraction(forms.dokkai, 1);
  const dokkaiOnly = evaluateJlptN3PartScore('dokkai', forms.dokkai, session2Answers);
  const bunpouSupplement = evaluateJlptN3SessionBunpouSupplement(
    forms.dokkai,
    session2Answers,
  );
  assert.equal(dokkaiOnly.maxRawPoints, 60);
  assert.equal(dokkaiOnly.scaledScore, 60);
  assert.ok(bunpouSupplement);
  assert.equal(bunpouSupplement.maxRawPoints, 23);
  assert.equal(bunpouSupplement.earnedRawPoints, 23);
});

test('lookupKanjiReadings provides Katakana On\'yomi and Hiragana Kun\'yomi for JLPT kanji', () => {
  const sun = lookupKanjiReadings('日');
  assert.ok(sun.onyomi.some((r) => r.includes('ニチ')));
  assert.ok(sun.kunyomi.some((r) => r.includes('ひ')));

  const study = lookupKanjiReadings('学');
  assert.ok(study.onyomi.some((r) => r.includes('ガク')));
  assert.ok(study.kunyomi.some((r) => r.includes('まな')));

  const eat = lookupKanjiReadings('食');
  assert.ok(eat.onyomi.some((r) => r.includes('ショク')));
  assert.ok(eat.kunyomi.some((r) => r.includes('た')));
});
