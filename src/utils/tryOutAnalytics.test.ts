import assert from 'node:assert/strict';
import test from 'node:test';
import { getTryOutPacketForms } from '../data/tryOutN2AllPackets';
import { getJlptLevelRank, isJlptLevelUnlocked } from './levelProgression';
import { createDefaultPacketState } from './storage';
import {
  buildTryOutPacketChartSeries,
  estimateEquivalentJlptLevel,
} from './tryOutAnalytics';

test('isJlptLevelUnlocked unlocks self-assessed level and lower levels while locking higher levels', () => {
  assert.equal(getJlptLevelRank('N5'), 0);
  assert.equal(getJlptLevelRank('N1'), 4);

  // At N5, only N5 is unlocked
  assert.equal(isJlptLevelUnlocked('N5', 'N5'), true);
  assert.equal(isJlptLevelUnlocked('N4', 'N5'), false);
  assert.equal(isJlptLevelUnlocked('N3', 'N5'), false);
  assert.equal(isJlptLevelUnlocked('N2', 'N5'), false);
  assert.equal(isJlptLevelUnlocked('N1', 'N5'), false);

  // At N4, N5 and N4 are unlocked, N3+ locked
  assert.equal(isJlptLevelUnlocked('N5', 'N4'), true);
  assert.equal(isJlptLevelUnlocked('N4', 'N4'), true);
  assert.equal(isJlptLevelUnlocked('N3', 'N4'), false);
  assert.equal(isJlptLevelUnlocked('N2', 'N4'), false);
  assert.equal(isJlptLevelUnlocked('N1', 'N4'), false);

  // At N2, N5..N2 unlocked, N1 locked
  assert.equal(isJlptLevelUnlocked('N3', 'N2'), true);
  assert.equal(isJlptLevelUnlocked('N2', 'N2'), true);
  assert.equal(isJlptLevelUnlocked('N1', 'N2'), false);
});

test('buildTryOutPacketChartSeries and estimateEquivalentJlptLevel track scores across verified unlocked packets', () => {
  const emptyPacket = createDefaultPacketState();
  const noneEstimate = estimateEquivalentJlptLevel({
    packetsProgress: { 'n2-2': emptyPacket },
    fallbackFirstPacket: emptyPacket,
    latestReport: null,
  });
  assert.equal(noneEstimate.level, null);
  assert.equal(noneEstimate.source, 'none');

  const packetOne = createDefaultPacketState();
  const perfectDokkaiAnswers: Record<string, string> = {};
  const forms = getTryOutPacketForms('n2-2');
  for (const page of forms.dokkai) {
    for (const item of page.items) {
      if (item.kind === 'choice') {
        perfectDokkaiAnswers[item.id] = item.correctAnswer;
      }
    }
  }
  packetOne.packetProgress.submittedIds = ['dokkai'];
  packetOne.packetProgress.completedIds = ['dokkai'];
  packetOne.packetProgress.answersByPart.dokkai = perfectDokkaiAnswers;

  const series = buildTryOutPacketChartSeries({ 'n2-2': packetOne }, emptyPacket);
  assert.equal(series.length, 15);
  const n22Point = series.find((p) => p.packetId === 'n2-2');
  const n27Point = series.find((p) => p.packetId === 'n2-7');
  assert.ok(n22Point);
  assert.ok(n27Point);
  assert.equal(n22Point.examCode, '2010.07');
  assert.equal(n22Point.dokkaiScore, 100);
  assert.equal(n22Point.overallScore, 100);
  assert.equal(n27Point.examCode, '2012.12');
  assert.equal(n27Point.overallScore, null);
  assert.equal(series.filter((p) => p.level === 'N3').length, 5);
  assert.equal(series.filter((p) => p.level === 'N2').length, 6);
  assert.equal(series.filter((p) => p.level === 'N1').length, 4);

  const packetEstimate = estimateEquivalentJlptLevel({
    packetsProgress: { 'n2-2': packetOne },
    fallbackFirstPacket: emptyPacket,
    latestReport: null,
  });
  assert.equal(packetEstimate.level, 'N2');
  assert.equal(packetEstimate.source, 'tryout-packets');
  assert.equal(packetEstimate.averageScore, 100);
});
