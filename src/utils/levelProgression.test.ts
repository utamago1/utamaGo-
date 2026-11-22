import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateChallengeResult,
  getLevelProgress,
  getRankIllustrationPath,
  getStageIdForJlptLevel,
  getTotalStarsEarned,
  getXpThresholdForLevel,
  isStageUnlocked,
  RANK_ILLUSTRATIONS_BY_GENDER,
  type RankStageId,
} from './levelProgression';

test('getLevelProgress calculates level thresholds and Tamago rank correctly', () => {
  const lv1 = getLevelProgress(0);
  assert.equal(lv1.level, 1);
  assert.equal(lv1.rank.stage, 'EGG');
  assert.equal(lv1.currentLevelXp, 0);
  assert.equal(lv1.xpForNextLevel, 100);

  const lv2 = getLevelProgress(getXpThresholdForLevel(2));
  assert.equal(lv2.level, 2);
  assert.equal(lv2.rank.stage, 'EGG');

  const lv3 = getLevelProgress(getXpThresholdForLevel(3));
  assert.equal(lv3.level, 3);
  assert.equal(lv3.rank.stage, 'HATCH');

  const lv8 = getLevelProgress(getXpThresholdForLevel(8));
  assert.equal(lv8.level, 8);
  assert.equal(lv8.rank.stage, 'GROW');
});

test('getRankIllustrationPath switches chicken mascot by gender and all asset files exist', () => {
  const stages: RankStageId[] = ['EGG', 'HATCH', 'CHICK', 'GROW', 'FLY'];
  for (const stage of stages) {
    const cowokPath = getRankIllustrationPath(stage, 'cowok');
    const cewekPath = getRankIllustrationPath(stage, 'cewek');
    assert.notEqual(cowokPath, cewekPath);
    assert.equal(
      fs.existsSync(path.resolve(process.cwd(), cowokPath.replace(/^\//, ''))),
      true,
      `Missing cowok image for ${stage}: ${cowokPath}`,
    );
    assert.equal(
      fs.existsSync(path.resolve(process.cwd(), cewekPath.replace(/^\//, ''))),
      true,
      `Missing cewek image for ${stage}: ${cewekPath}`,
    );
  }

  assert.equal(getStageIdForJlptLevel('N2'), 'GROW');
  const cewekLv3 = getLevelProgress(getXpThresholdForLevel(3), 'cewek');
  assert.equal(
    cewekLv3.rank.illustrationPath,
    RANK_ILLUSTRATIONS_BY_GENDER.cewek.HATCH,
  );
});

test('evaluateChallengeResult computes pass/fail, stars, and XP rewards', () => {
  const perfect = evaluateChallengeResult({
    correctCount: 5,
    totalQuestions: 5,
    heartsRemaining: 3,
    baseXpReward: 60,
    previousBestStars: 0,
  });
  assert.equal(perfect.passed, true);
  assert.equal(perfect.stars, 3);
  assert.equal(perfect.xpAwarded, 80);

  const twoStars = evaluateChallengeResult({
    correctCount: 4,
    totalQuestions: 5,
    heartsRemaining: 2,
    baseXpReward: 60,
    previousBestStars: 0,
  });
  assert.equal(twoStars.passed, true);
  assert.equal(twoStars.stars, 2);
  assert.equal(twoStars.xpAwarded, 70);

  const failedNoHearts = evaluateChallengeResult({
    correctCount: 3,
    totalQuestions: 5,
    heartsRemaining: 0,
    baseXpReward: 60,
  });
  assert.equal(failedNoHearts.passed, false);
  assert.equal(failedNoHearts.stars, 0);
  assert.equal(failedNoHearts.xpAwarded, 0);
});

test('isStageUnlocked and getTotalStarsEarned track progression sequentially', () => {
  const stageIds = ['stage-1', 'stage-2', 'stage-3'];
  const empty = {};
  assert.equal(isStageUnlocked(0, stageIds, empty), true);
  assert.equal(isStageUnlocked(1, stageIds, empty), false);

  const afterStage1 = {
    'stage-1': { stars: 2 as const, bestAccuracy: 80, xpEarned: 70 },
  };
  assert.equal(isStageUnlocked(1, stageIds, afterStage1), true);
  assert.equal(isStageUnlocked(2, stageIds, afterStage1), false);
  assert.equal(getTotalStarsEarned(afterStage1), 2);
});

