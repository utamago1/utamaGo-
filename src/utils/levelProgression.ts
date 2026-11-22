import type { JlptLevel } from '../data/utamagoContent';

export type RankStageId = 'EGG' | 'HATCH' | 'CHICK' | 'GROW' | 'FLY';
export type LearnerGender = 'cowok' | 'cewek';

export const JLPT_LEVELS_ASC: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const RANK_ILLUSTRATIONS_BY_GENDER: Record<
  LearnerGender,
  Record<RankStageId, string>
> = {
  cowok: {
    EGG: '/src/assets/images/stage_egg_n5_1795072569641.jpg',
    HATCH: '/src/assets/images/stage_hatch_n4_1795072570966.jpg',
    CHICK: '/src/assets/images/stage_chick_n3_1795072571171.jpg',
    GROW: '/src/assets/images/stage_grow_n2_1795072570529.jpg',
    FLY: '/src/assets/images/stage_fly_n1_1795072570015.jpg',
  },
  cewek: {
    EGG: '/src/assets/images/stage_egg_cewek_1795270161974.jpg',
    HATCH: '/src/assets/images/stage_hatch_cewek_1795270162328.jpg',
    CHICK: '/src/assets/images/stage_chick_cewek_1795270162240.jpg',
    GROW: '/src/assets/images/stage_grow_cewek_1795270163692.jpg',
    FLY: '/src/assets/images/stage_fly_cewek_1795270163227.jpg',
  },
};

export function getRankIllustrationPath(
  stage: RankStageId,
  gender: LearnerGender = 'cowok',
): string {
  return RANK_ILLUSTRATIONS_BY_GENDER[gender][stage];
}

export function getStageIdForJlptLevel(level: JlptLevel): RankStageId {
  switch (level) {
    case 'N5':
      return 'EGG';
    case 'N4':
      return 'HATCH';
    case 'N3':
      return 'CHICK';
    case 'N2':
      return 'GROW';
    case 'N1':
      return 'FLY';
  }
}

export function getJlptLevelRank(level: JlptLevel): number {
  const idx = JLPT_LEVELS_ASC.indexOf(level);
  return idx === -1 ? 0 : idx;
}

export function isJlptLevelUnlocked(
  targetLevel: JlptLevel,
  unlockedUpToLevel: JlptLevel,
): boolean {
  return getJlptLevelRank(targetLevel) <= getJlptLevelRank(unlockedUpToLevel);
}

export interface RankInfo {
  stage: RankStageId;
  jlptLabel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  title: string;
  illustrationPath: string;
  minLevel: number;
}

export interface LevelProgressInfo {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  xpForNextLevel: number;
  progressPercent: number;
  rank: RankInfo;
}

export interface CompletedLevelRecord {
  stars: 1 | 2 | 3;
  bestAccuracy: number;
  xpEarned: number;
}

export interface ChallengeEvaluation {
  correctCount: number;
  totalQuestions: number;
  accuracy: number;
  passed: boolean;
  stars: 0 | 1 | 2 | 3;
  xpAwarded: number;
}

export const RANKS: RankInfo[] = [
  {
    stage: 'EGG',
    jlptLabel: 'N5',
    title: 'Tamago · Fondasi',
    illustrationPath: RANK_ILLUSTRATIONS_BY_GENDER.cowok.EGG,
    minLevel: 1,
  },
  {
    stage: 'HATCH',
    jlptLabel: 'N4',
    title: 'Hatch · Menetas',
    illustrationPath: RANK_ILLUSTRATIONS_BY_GENDER.cowok.HATCH,
    minLevel: 3,
  },
  {
    stage: 'CHICK',
    jlptLabel: 'N3',
    title: 'Hiyoko · Berkembang',
    illustrationPath: RANK_ILLUSTRATIONS_BY_GENDER.cowok.CHICK,
    minLevel: 5,
  },
  {
    stage: 'GROW',
    jlptLabel: 'N2',
    title: 'Grow · Tangguh N2',
    illustrationPath: RANK_ILLUSTRATIONS_BY_GENDER.cowok.GROW,
    minLevel: 8,
  },
  {
    stage: 'FLY',
    jlptLabel: 'N1',
    title: 'Fly · Master N1',
    illustrationPath: RANK_ILLUSTRATIONS_BY_GENDER.cowok.FLY,
    minLevel: 11,
  },
];

// Cumulative XP thresholds per level:
// Lv1: 0, Lv2: 100, Lv3: 220, Lv4: 360, Lv5: 520, Lv6: 700...
export function getXpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let lv = 1; lv < level; lv++) {
    total += 80 + lv * 20;
  }
  return total;
}

export function getRankForLevel(
  level: number,
  gender: LearnerGender = 'cowok',
): RankInfo {
  let matched = RANKS[0];
  for (const rank of RANKS) {
    if (level >= rank.minLevel) {
      matched = rank;
    }
  }
  return {
    ...matched,
    illustrationPath: getRankIllustrationPath(matched.stage, gender),
  };
}

export function getLevelProgress(
  rawXp: number,
  gender: LearnerGender = 'cowok',
): LevelProgressInfo {
  const totalXp = Math.max(0, Math.floor(rawXp));
  let level = 1;
  while (totalXp >= getXpThresholdForLevel(level + 1)) {
    level += 1;
  }

  const currentFloor = getXpThresholdForLevel(level);
  const nextFloor = getXpThresholdForLevel(level + 1);
  const xpForNextLevel = nextFloor - currentFloor;
  const currentLevelXp = totalXp - currentFloor;
  const progressPercent =
    xpForNextLevel > 0
      ? Math.min(100, Math.round((currentLevelXp / xpForNextLevel) * 100))
      : 100;

  return {
    level,
    totalXp,
    currentLevelXp,
    xpForNextLevel,
    progressPercent,
    rank: getRankForLevel(level, gender),
  };
}

export function evaluateChallengeResult(params: {
  correctCount: number;
  totalQuestions: number;
  heartsRemaining: number;
  baseXpReward: number;
  previousBestStars?: number;
}): ChallengeEvaluation {
  const {
    correctCount,
    totalQuestions,
    heartsRemaining,
    baseXpReward,
    previousBestStars = 0,
  } = params;

  const safeTotal = Math.max(1, totalQuestions);
  const accuracy = Math.round((correctCount / safeTotal) * 100);
  const passed = heartsRemaining > 0 && accuracy >= 60;

  let stars: 0 | 1 | 2 | 3 = 0;
  if (passed) {
    if (accuracy >= 90 && heartsRemaining === 3) {
      stars = 3;
    } else if (accuracy >= 80) {
      stars = 2;
    } else {
      stars = 1;
    }
  }

  let xpAwarded = 0;
  if (passed) {
    if (previousBestStars === 0) {
      xpAwarded = baseXpReward + (stars === 3 ? 20 : stars === 2 ? 10 : 0);
    } else if (stars > previousBestStars) {
      xpAwarded = (stars - previousBestStars) * 15;
    } else {
      // Practice replay still gives a small motivation bonus
      xpAwarded = 15;
    }
  }

  return {
    correctCount,
    totalQuestions: safeTotal,
    accuracy,
    passed,
    stars,
    xpAwarded,
  };
}

export function isStageUnlocked(
  stageIndex: number,
  allStageIds: string[],
  completedLevels: Record<string, CompletedLevelRecord>,
): boolean {
  if (stageIndex <= 0) return true;
  const previousId = allStageIds[stageIndex - 1];
  if (!previousId) return false;
  return Boolean(completedLevels[previousId]);
}

export function getTotalStarsEarned(
  completedLevels: Record<string, CompletedLevelRecord>,
): number {
  return Object.values(completedLevels).reduce(
    (sum, item) => sum + item.stars,
    0,
  );
}
