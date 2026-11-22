import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  computeDaysSinceLastStudy,
  getMoodPreviewVariants,
  isNightHour,
  MASCOT_ANGRY_VARIANTS,
  MASCOT_GLOOMY_VARIANTS,
  MASCOT_MAX_LINE_LENGTH,
  MASCOT_MOOD_ORDER,
  MASCOT_SICK_VARIANTS,
  MASCOT_SOOTHE_VARIANTS,
  MASCOT_WAVE_VARIANTS,
  pickNextMascotLine,
  resolveMascotDialogState,
  resolveTransparentMascotSrc,
} from './mascotDialog';
import { RANK_ILLUSTRATIONS_BY_GENDER } from './levelProgression';

test('resolveMascotDialogState handles all conditions including sick and gloomy moods', () => {
  const newUser = resolveMascotDialogState({
    hasAnyHistory: false,
    dailyDoneCards: 0,
    isTargetReached: false,
    dueAnkiCount: 20,
    streakDays: 0,
    hour: 10,
  });
  assert.equal(newUser.condition, 'new_user');
  assert.equal(newUser.mood, 'neutral');
  assert.ok(newUser.variants.length >= 3);

  const night = resolveMascotDialogState({
    hasAnyHistory: true,
    dailyDoneCards: 5,
    isTargetReached: false,
    dueAnkiCount: 15,
    streakDays: 4,
    hour: 22,
  });
  assert.equal(night.condition, 'night');
  assert.equal(night.mood, 'sleepy');
  assert.ok(night.variants.length >= 3);

  const reached = resolveMascotDialogState({
    hasAnyHistory: true,
    dailyDoneCards: 10,
    isTargetReached: true,
    dueAnkiCount: 0,
    streakDays: 2,
    hour: 14,
  });
  assert.equal(reached.condition, 'target_reached');
  assert.equal(reached.mood, 'happy');
  assert.ok(reached.variants.includes('Hebat, target hari ini beres!'));

  const highStreak = resolveMascotDialogState({
    hasAnyHistory: true,
    dailyDoneCards: 0,
    isTargetReached: false,
    dueAnkiCount: 12,
    streakDays: 5,
    hour: 11,
  });
  assert.equal(highStreak.condition, 'high_streak');
  assert.equal(highStreak.mood, 'happy');
  assert.ok(highStreak.variants.includes('Streak 5 hari, jangan putus ya!'));

  const sick = resolveMascotDialogState({
    hasAnyHistory: true,
    dailyDoneCards: 0,
    isTargetReached: false,
    dueAnkiCount: 15,
    streakDays: 0,
    hour: 10,
    daysSinceLastStudy: 4,
  });
  assert.equal(sick.condition, 'sick_inactive');
  assert.equal(sick.mood, 'sick');

  const gloomy = resolveMascotDialogState({
    hasAnyHistory: true,
    dailyDoneCards: 0,
    isTargetReached: false,
    dueAnkiCount: 15,
    streakDays: 0,
    hour: 10,
    daysSinceLastStudy: 1,
  });
  assert.equal(gloomy.condition, 'gloomy_missed');
  assert.equal(gloomy.mood, 'gloomy');

  const notStudied = resolveMascotDialogState({
    hasAnyHistory: true,
    dailyDoneCards: 0,
    isTargetReached: false,
    dueAnkiCount: 18,
    streakDays: 1,
    hour: 9,
  });
  assert.equal(notStudied.condition, 'not_studied');
  assert.equal(notStudied.mood, 'neutral');
  assert.ok(notStudied.variants.includes('Ayo, 18 kartu menunggu!'));
});

test('computeDaysSinceLastStudy accurately counts days since last active session', () => {
  assert.equal(computeDaysSinceLastStudy({}, '2026-11-22'), null);
  assert.equal(
    computeDaysSinceLastStudy(
      {
        '2026-11-18': { anki: 5, challenge: 0, learn: 0, tryout: 0, total: 5 },
      },
      '2026-11-22',
    ),
    4,
  );
  assert.equal(
    computeDaysSinceLastStudy(
      {
        '2026-11-22': { anki: 2, challenge: 0, learn: 0, tryout: 0, total: 2 },
      },
      '2026-11-22',
    ),
    0,
  );
});

test('all mascot dialog and expressive mood variants stay within 60 characters and never duplicate target card title', () => {
  const scenarios = [
    { hasAnyHistory: false, dailyDoneCards: 0, isTargetReached: false, dueAnkiCount: 50, streakDays: 0, hour: 10 },
    { hasAnyHistory: true, dailyDoneCards: 0, isTargetReached: false, dueAnkiCount: 50, streakDays: 1, hour: 21 },
    { hasAnyHistory: true, dailyDoneCards: 10, isTargetReached: true, dueAnkiCount: 0, streakDays: 1, hour: 13 },
    { hasAnyHistory: true, dailyDoneCards: 2, isTargetReached: false, dueAnkiCount: 25, streakDays: 99, hour: 13 },
    { hasAnyHistory: true, dailyDoneCards: 0, isTargetReached: false, dueAnkiCount: 999, streakDays: 0, hour: 13, daysSinceLastStudy: 5 },
    { hasAnyHistory: true, dailyDoneCards: 0, isTargetReached: false, dueAnkiCount: 0, streakDays: 0, hour: 13, daysSinceLastStudy: 2 },
  ];

  const allLineGroups: Array<readonly string[]> = [
    ...scenarios.map((sc) => resolveMascotDialogState(sc).variants),
    MASCOT_ANGRY_VARIANTS,
    MASCOT_WAVE_VARIANTS,
    MASCOT_SOOTHE_VARIANTS,
    MASCOT_SICK_VARIANTS,
    MASCOT_GLOOMY_VARIANTS,
    ...MASCOT_MOOD_ORDER.map((mood) => getMoodPreviewVariants(mood, 12, 4)),
  ];

  for (const group of allLineGroups) {
    assert.ok(group.length >= 3);
    for (const line of group) {
      assert.ok(
        line.length <= MASCOT_MAX_LINE_LENGTH,
        `Line exceeds 60 chars (${line.length}): "${line}"`,
      );
      assert.ok(
        !line.toLowerCase().includes('target hari ini tercapai'),
        `Line duplicates card below: "${line}"`,
      );
    }
  }
});

test('pickNextMascotLine never repeats the immediately previous line', () => {
  const variants = ['Satu', 'Dua', 'Tiga', 'Empat'];
  for (const prev of variants) {
    for (let step = 0; step < 20; step += 1) {
      const next = pickNextMascotLine(variants, prev, () => step / 20);
      assert.notEqual(next, prev);
      assert.ok(variants.includes(next));
    }
  }
});

test('isNightHour covers 21:00 through 03:59 accurately', () => {
  assert.equal(isNightHour(20), false);
  assert.equal(isNightHour(21), true);
  assert.equal(isNightHour(23), true);
  assert.equal(isNightHour(0), true);
  assert.equal(isNightHour(3), true);
  assert.equal(isNightHour(4), false);
});

test('all 10 transparent PNG mascot assets resolve and exist on disk', () => {
  for (const gender of ['cowok', 'cewek'] as const) {
    for (const srcPath of Object.values(RANK_ILLUSTRATIONS_BY_GENDER[gender])) {
      const resolved = resolveTransparentMascotSrc(srcPath);
      assert.ok(resolved.startsWith('/assets/mascots/'), `Expected transparent PNG for ${srcPath}`);
      const diskPath = path.join(process.cwd(), 'public', resolved);
      assert.ok(fs.existsSync(diskPath), `Missing mascot PNG at ${diskPath}`);
    }
  }

  assert.equal(
    resolveTransparentMascotSrc('/src/assets/images/stage_egg_n5_1795072569641.jpg', '/custom/mascot.png'),
    '/custom/mascot.png',
  );
});
