import assert from 'node:assert/strict';
import test from 'node:test';
import { getTryOutPacketForms } from '../data/tryOutN2AllPackets';
import {
  JLPT_N2_SECTION_MAX,
  JLPT_N2_SECTION_PASS_MIN,
  JLPT_N2_TOTAL_MAX,
  JLPT_N2_TOTAL_PASS_MIN,
  evaluateJlptN2PacketScore,
  evaluateJlptN2PartScore,
  getJlptN2QuestionWeight,
} from './jlptN2Scoring';
import type { FormProgressPageRef, TryOutPacketPartId } from './tryOutPacket';

function buildPerfectAnswers(
  pages: FormProgressPageRef[],
): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const page of pages) {
    for (const item of page.items) {
      if (item.kind === 'choice' && item.correctAnswer) {
        answers[item.id] = item.correctAnswer;
      }
    }
  }
  return answers;
}

test('getJlptN2QuestionWeight matches official JLPT N2 Mondai weights and adapts Mondai 11 dynamically', () => {
  // Moji-Goi & Bunpou: M1..M5 = 1, M6 = 2, M7..M9 = 1
  for (const m of [1, 2, 3, 4, 5, 7, 8, 9]) {
    assert.equal(getJlptN2QuestionWeight('moji-bunpou', m, 0, 5), 1);
  }
  assert.equal(getJlptN2QuestionWeight('moji-bunpou', 6, 0, 5), 2);

  // Dokkai: M10 = 2, M11 (9q -> first 6 = 2, last 3 = 3), M12 = 3, M13 = 4, M14 = 4
  assert.equal(getJlptN2QuestionWeight('dokkai', 10, 0, 5), 2);
  for (let i = 0; i < 6; i += 1) {
    assert.equal(getJlptN2QuestionWeight('dokkai', 11, i, 9), 2);
  }
  for (let i = 6; i < 9; i += 1) {
    assert.equal(getJlptN2QuestionWeight('dokkai', 11, i, 9), 3);
  }
  // Dynamic Mondai 11 with 6 questions -> first 4 = 2pt, last 2 = 3pt
  assert.equal(getJlptN2QuestionWeight('dokkai', 11, 3, 6), 2);
  assert.equal(getJlptN2QuestionWeight('dokkai', 11, 4, 6), 3);
  assert.equal(getJlptN2QuestionWeight('dokkai', 12, 0, 2), 3);
  assert.equal(getJlptN2QuestionWeight('dokkai', 13, 0, 3), 4);
  assert.equal(getJlptN2QuestionWeight('dokkai', 14, 0, 2), 4);

  // Choukai: M1..M3 = 2, M4 = 1, M5 = 3
  assert.equal(getJlptN2QuestionWeight('choukai', 1, 0, 5), 2);
  assert.equal(getJlptN2QuestionWeight('choukai', 2, 0, 6), 2);
  assert.equal(getJlptN2QuestionWeight('choukai', 3, 0, 5), 2);
  assert.equal(getJlptN2QuestionWeight('choukai', 4, 0, 12), 1);
  assert.equal(getJlptN2QuestionWeight('choukai', 5, 0, 4), 3);
});

test('all 6 verified N2 packets normalize dynamically to 60/60 per section and 180/180 total when perfect', () => {
  const packetIds = ['n2-2', 'n2-3', 'n2-4', 'n2-5', 'n2-6', 'n2-7'];

  for (const packetId of packetIds) {
    const forms = getTryOutPacketForms(packetId);
    const answersByPart: Record<TryOutPacketPartId, Record<string, string>> = {
      'moji-bunpou': buildPerfectAnswers(forms['moji-bunpou']),
      dokkai: buildPerfectAnswers(forms.dokkai),
      choukai: buildPerfectAnswers(forms.choukai),
    };

    const perfectPacket = evaluateJlptN2PacketScore({
      forms,
      answersByPart,
      submittedIds: ['moji-bunpou', 'dokkai', 'choukai'],
    });

    assert.equal(perfectPacket.parts['moji-bunpou'].maxRawPoints, 59);
    assert.equal(perfectPacket.parts.dokkai.maxRawPoints, 57);
    // Choukai adapts cleanly: 32q packets (n2-2, n2-3, n2-7) => 56 raw pts; 31q packets (n2-4, n2-5, n2-6) => 55 raw pts
    const expectedChoukaiMaxRaw = ['n2-4', 'n2-5', 'n2-6'].includes(packetId)
      ? 55
      : 56;
    assert.equal(
      perfectPacket.parts.choukai.maxRawPoints,
      expectedChoukaiMaxRaw,
      `${packetId} choukai maxRawPoints`,
    );

    assert.equal(perfectPacket.parts['moji-bunpou'].scaledScore, JLPT_N2_SECTION_MAX);
    assert.equal(perfectPacket.parts.dokkai.scaledScore, JLPT_N2_SECTION_MAX);
    assert.equal(perfectPacket.parts.choukai.scaledScore, JLPT_N2_SECTION_MAX);
    assert.equal(perfectPacket.totalScaledScore, JLPT_N2_TOTAL_MAX);
    assert.equal(perfectPacket.status, 'passed');
    assert.equal(perfectPacket.isPassed, true);

    // All wrong => 0/180
    const emptyPacket = evaluateJlptN2PacketScore({
      forms,
      answersByPart: { 'moji-bunpou': {}, dokkai: {}, choukai: {} },
      submittedIds: ['moji-bunpou', 'dokkai', 'choukai'],
    });
    assert.equal(emptyPacket.totalScaledScore, 0);
    assert.equal(emptyPacket.status, 'failed-cutoff');
    assert.equal(emptyPacket.failedCutoffs.length, 3);
  }
});

test('higher-weight Mondai questions produce proportionally higher N2 scaled scores', () => {
  const forms = getTryOutPacketForms('n2-2');

  // Dokkai: answering 2 questions right in M14 (4pt each = 8 raw) vs 2 questions right in M10 (2pt each = 4 raw)
  const m10Page = forms.dokkai.find((p) => p.title.includes('問題10'))!;
  const m14Page = forms.dokkai.find((p) => p.title.includes('問題14'))!;
  const m10TwoRight: Record<string, string> = {};
  const m14TwoRight: Record<string, string> = {};

  m10Page.items
    .filter((i) => i.kind === 'choice')
    .slice(0, 2)
    .forEach((i) => {
      m10TwoRight[i.id] = i.correctAnswer!;
    });
  m14Page.items
    .filter((i) => i.kind === 'choice')
    .slice(0, 2)
    .forEach((i) => {
      m14TwoRight[i.id] = i.correctAnswer!;
    });

  const m10Score = evaluateJlptN2PartScore('dokkai', forms.dokkai, m10TwoRight);
  const m14Score = evaluateJlptN2PartScore('dokkai', forms.dokkai, m14TwoRight);

  assert.equal(m10Score.earnedRawPoints, 4);
  assert.equal(m14Score.earnedRawPoints, 8);
  assert.ok(m14Score.scaledScore > m10Score.scaledScore);
});

test('enforces both JLPT N2 passing rules (>= 90/180 total AND >= 19/60 per section)', () => {
  const forms = getTryOutPacketForms('n2-2');

  // Case 1: High total (120/180) but Choukai is 0/60 (< 19) => failed-cutoff!
  const cutoffFail = evaluateJlptN2PacketScore({
    forms,
    answersByPart: {
      'moji-bunpou': buildPerfectAnswers(forms['moji-bunpou']),
      dokkai: buildPerfectAnswers(forms.dokkai),
      choukai: {},
    },
    submittedIds: ['moji-bunpou', 'dokkai', 'choukai'],
  });
  assert.equal(cutoffFail.totalScaledScore, 120);
  assert.equal(cutoffFail.status, 'failed-cutoff');
  assert.equal(cutoffFail.isPassed, false);
  assert.deepEqual(cutoffFail.failedCutoffs, ['choukai']);

  // Case 2: Every section >= 19/60, but total < 90/180 => failed-total!
  const pickFirstCorrect = (pages: FormProgressPageRef[], count: number) => {
    const out: Record<string, string> = {};
    let picked = 0;
    for (const page of pages) {
      for (const item of page.items) {
        if (item.kind === 'choice' && item.correctAnswer && picked < count) {
          out[item.id] = item.correctAnswer;
          picked += 1;
        }
      }
    }
    return out;
  };
  const totalFail = evaluateJlptN2PacketScore({
    forms,
    answersByPart: {
      // 25 raw out of 59 => 25/60 (>=19)
      'moji-bunpou': pickFirstCorrect(forms['moji-bunpou'], 25),
      // 11 first choices (5×2 + 6×2 = 22 raw out of 57 => 23/60 >=19)
      dokkai: pickFirstCorrect(forms.dokkai, 11),
      // 10 first choices (5×2 + 5×2 = 20 raw out of 56 => 21/60 >=19)
      choukai: pickFirstCorrect(forms.choukai, 10),
    },
    submittedIds: ['moji-bunpou', 'dokkai', 'choukai'],
  });
  assert.ok(totalFail.parts['moji-bunpou'].scaledScore >= JLPT_N2_SECTION_PASS_MIN);
  assert.ok(totalFail.parts.dokkai.scaledScore >= JLPT_N2_SECTION_PASS_MIN);
  assert.ok(totalFail.parts.choukai.scaledScore >= JLPT_N2_SECTION_PASS_MIN);
  assert.ok(totalFail.totalScaledScore < JLPT_N2_TOTAL_PASS_MIN);
  assert.equal(totalFail.status, 'failed-total');
  assert.equal(totalFail.isPassed, false);

  // Case 3: Only 2 parts submitted => in-progress
  const partial = evaluateJlptN2PacketScore({
    forms,
    answersByPart: {
      'moji-bunpou': buildPerfectAnswers(forms['moji-bunpou']),
      dokkai: buildPerfectAnswers(forms.dokkai),
    },
    submittedIds: ['moji-bunpou', 'dokkai'],
  });
  assert.equal(partial.status, 'in-progress');
  assert.equal(partial.submittedPartCount, 2);
  assert.equal(partial.isPassed, false);
});

test('dynamically adapts to synthetic N2 packets with non-standard question counts', () => {
  const customChoukai: FormProgressPageRef[] = [
    {
      id: 'custom-ch-1',
      title: '問題1 課題理解',
      items: [
        { id: 'q1', kind: 'choice', label: '1', correctAnswer: '1' },
        { id: 'q2', kind: 'choice', label: '2', correctAnswer: '2' },
        { id: 'q3', kind: 'choice', label: '3', correctAnswer: '3' },
      ],
    },
    {
      id: 'custom-ch-4',
      title: '問題4 即時応答',
      items: [
        { id: 'q4', kind: 'choice', label: '4', correctAnswer: '1' },
        { id: 'q5', kind: 'choice', label: '5', correctAnswer: '2' },
      ],
    },
    {
      id: 'custom-ch-5',
      title: '問題5 総合理解',
      items: [
        { id: 'q6', kind: 'choice', label: '6', correctAnswer: '4' },
        { id: 'q7', kind: 'choice', label: '7', correctAnswer: '3' },
      ],
    },
  ];

  // Max raw = 3×2 + 2×1 + 2×3 = 14
  const perfect = evaluateJlptN2PartScore('choukai', customChoukai, {
    q1: '1',
    q2: '2',
    q3: '3',
    q4: '1',
    q5: '2',
    q6: '4',
    q7: '3',
  });
  assert.equal(perfect.maxRawPoints, 14);
  assert.equal(perfect.earnedRawPoints, 14);
  assert.equal(perfect.scaledScore, 60);

  // Only M5 right (6 / 14 * 60 = 25.71 -> 26)
  const onlyM5 = evaluateJlptN2PartScore('choukai', customChoukai, {
    q6: '4',
    q7: '3',
  });
  assert.equal(onlyM5.earnedRawPoints, 6);
  assert.equal(onlyM5.scaledScore, 26);
  assert.equal(onlyM5.passedCutoff, true);
});
