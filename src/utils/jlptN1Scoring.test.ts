import assert from 'node:assert/strict';
import test from 'node:test';
import type { FormProgressPageRef } from './tryOutPacket';
import {
  evaluateJlptN1PacketScore,
  evaluateJlptN1PartScore,
  getJlptN1QuestionWeight,
  JLPT_N1_SECTION_PASS_MIN,
  JLPT_N1_TOTAL_PASS_MIN,
} from './jlptN1Scoring';

function makePage(
  id: string,
  title: string,
  count: number,
  prefix: string,
): FormProgressPageRef {
  return {
    id,
    title,
    items: Array.from({ length: count }, (_, idx) => ({
      id: `${prefix}-${idx + 1}`,
      kind: 'choice' as const,
      correctAnswer: '1',
    })),
  };
}

function buildReferenceN1Forms() {
  return {
    'moji-bunpou': [
      makePage('n1-mb-page-1', '問題1 · 漢字読み', 6, 'mb1'),
      makePage('n1-mb-page-2', '問題2 · 文脈規定', 7, 'mb2'),
      makePage('n1-mb-page-3', '問題3 · 言い換え類義', 6, 'mb3'),
      makePage('n1-mb-page-4', '問題4 · 用法', 6, 'mb4'),
      makePage('n1-mb-page-5', '問題5 · 文の文法1', 10, 'mb5'),
      makePage('n1-mb-page-6', '問題6 · 文の文法2 (★)', 5, 'mb6'),
      makePage('n1-mb-page-7', '問題7 · 文章の文法', 5, 'mb7'),
    ],
    dokkai: [
      makePage('n1-dk-page-8', '問題8 · 内容理解（短文）', 4, 'dk8'),
      makePage('n1-dk-page-9', '問題9 · 内容理解（中文）', 9, 'dk9'),
      makePage('n1-dk-page-10', '問題10 · 内容理解（長文）', 4, 'dk10'),
      makePage('n1-dk-page-11', '問題11 · 統合理解', 2, 'dk11'),
      makePage('n1-dk-page-12', '問題12 · 主張理解（長文）', 4, 'dk12'),
      makePage('n1-dk-page-13', '問題13 · 情報検索', 2, 'dk13'),
    ],
    choukai: [
      makePage('n1-ch-page-1', '問題1 課題理解', 5, 'ch1'),
      makePage('n1-ch-page-2', '問題2 要点理解', 6, 'ch2'),
      makePage('n1-ch-page-3', '問題3 概要理解', 5, 'ch3'),
      makePage('n1-ch-page-4', '問題4 即時応答', 12, 'ch4'),
      makePage('n1-ch-page-5', '問題5 総合理解', 4, 'ch5'),
    ],
  };
}

function answerAll(pages: FormProgressPageRef[], correctRatio = 1): Record<string, string> {
  const allIds = pages.flatMap((p) => p.items.map((i) => i.id));
  const correctLimit = Math.round(allIds.length * correctRatio);
  const values: Record<string, string> = {};
  allIds.forEach((id, idx) => {
    values[id] = idx < correctLimit ? '1' : '2';
  });
  return values;
}

test('JLPT N1 official per-Mondai weights match reference chart (56 / 58 / 56)', () => {
  // 言語知識: M1-3,5-6 = 1pt; M4,7 = 2pt -> 6+7+6+12+10+5+10 = 56
  assert.equal(getJlptN1QuestionWeight('moji-bunpou', 1), 1);
  assert.equal(getJlptN1QuestionWeight('moji-bunpou', 2), 1);
  assert.equal(getJlptN1QuestionWeight('moji-bunpou', 3), 1);
  assert.equal(getJlptN1QuestionWeight('moji-bunpou', 4), 2);
  assert.equal(getJlptN1QuestionWeight('moji-bunpou', 5), 1);
  assert.equal(getJlptN1QuestionWeight('moji-bunpou', 6), 1);
  assert.equal(getJlptN1QuestionWeight('moji-bunpou', 7), 2);

  // 読解: M8,9,11,13 = 2pt; M10,12 = 3pt -> 8+18+12+4+12+4 = 58
  assert.equal(getJlptN1QuestionWeight('dokkai', 8), 2);
  assert.equal(getJlptN1QuestionWeight('dokkai', 9), 2);
  assert.equal(getJlptN1QuestionWeight('dokkai', 10), 3);
  assert.equal(getJlptN1QuestionWeight('dokkai', 11), 2);
  assert.equal(getJlptN1QuestionWeight('dokkai', 12), 3);
  assert.equal(getJlptN1QuestionWeight('dokkai', 13), 2);

  // 聴解: M1-3 = 2pt; M4 = 1pt; M5 = 3pt -> 10+12+10+12+12 = 56
  assert.equal(getJlptN1QuestionWeight('choukai', 1), 2);
  assert.equal(getJlptN1QuestionWeight('choukai', 2), 2);
  assert.equal(getJlptN1QuestionWeight('choukai', 3), 2);
  assert.equal(getJlptN1QuestionWeight('choukai', 4), 1);
  assert.equal(getJlptN1QuestionWeight('choukai', 5), 3);

  const forms = buildReferenceN1Forms();
  const mb = evaluateJlptN1PartScore('moji-bunpou', forms['moji-bunpou'], answerAll(forms['moji-bunpou'], 1));
  const dk = evaluateJlptN1PartScore('dokkai', forms.dokkai, answerAll(forms.dokkai, 1));
  const ch = evaluateJlptN1PartScore('choukai', forms.choukai, answerAll(forms.choukai, 1));

  assert.equal(mb.maxRawPoints, 56);
  assert.equal(dk.maxRawPoints, 58);
  assert.equal(ch.maxRawPoints, 56);
  assert.equal(mb.scaledScore, 60);
  assert.equal(dk.scaledScore, 60);
  assert.equal(ch.scaledScore, 60);
});

test('JLPT N1 packet requires >= 100/180 total and >= 19/60 per section', () => {
  const forms = buildReferenceN1Forms();
  assert.equal(JLPT_N1_TOTAL_PASS_MIN, 100);
  assert.equal(JLPT_N1_SECTION_PASS_MIN, 19);

  // Passed: ~60% across all sections => ~108/180
  const passed = evaluateJlptN1PacketScore({
    forms,
    answersByPart: {
      'moji-bunpou': answerAll(forms['moji-bunpou'], 0.6),
      dokkai: answerAll(forms.dokkai, 0.6),
      choukai: answerAll(forms.choukai, 0.6),
    },
    submittedIds: ['moji-bunpou', 'dokkai', 'choukai'],
  });
  assert.equal(passed.isPassed, true);
  assert.equal(passed.status, 'passed');
  assert.ok(passed.totalScaledScore >= 100);

  // Failed total: ~52% => all >= 19/60, but total < 100 (N2 would pass >=90, N1 must fail!)
  const failedTotal = evaluateJlptN1PacketScore({
    forms,
    answersByPart: {
      'moji-bunpou': answerAll(forms['moji-bunpou'], 0.52),
      dokkai: answerAll(forms.dokkai, 0.52),
      choukai: answerAll(forms.choukai, 0.52),
    },
    submittedIds: ['moji-bunpou', 'dokkai', 'choukai'],
  });
  assert.equal(failedTotal.isPassed, false);
  assert.equal(failedTotal.status, 'failed-total');
  assert.ok(failedTotal.totalScaledScore >= 90 && failedTotal.totalScaledScore < 100);

  // Failed cutoff: 60 + 60 + 10 = 130/180 (>=100), but Choukai < 19
  const failedCutoff = evaluateJlptN1PacketScore({
    forms,
    answersByPart: {
      'moji-bunpou': answerAll(forms['moji-bunpou'], 1),
      dokkai: answerAll(forms.dokkai, 1),
      choukai: answerAll(forms.choukai, 0.15),
    },
    submittedIds: ['moji-bunpou', 'dokkai', 'choukai'],
  });
  assert.equal(failedCutoff.isPassed, false);
  assert.equal(failedCutoff.status, 'failed-cutoff');
  assert.deepEqual(failedCutoff.failedCutoffs, ['choukai']);
});
