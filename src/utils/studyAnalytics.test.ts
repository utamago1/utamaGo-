import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBackupPayload,
  EMPTY_ACTIVITY_LOG,
  getDailyStreak,
  getTodayActivityCount,
  getWeeklyActivitySummary,
  parseBackupPayload,
  recordStudyActivity,
  shiftDateKey,
} from './studyAnalytics';

test('recordStudyActivity increments counts per category and tracks reviewed lessons', () => {
  let log = recordStudyActivity(EMPTY_ACTIVITY_LOG, 'anki', {
    dateKey: '2026-04-10',
  });
  log = recordStudyActivity(log, 'learn', {
    dateKey: '2026-04-10',
    reviewedLessonId: 'struktur',
  });
  log = recordStudyActivity(log, 'learn', {
    dateKey: '2026-04-10',
    reviewedLessonId: 'struktur',
  });

  assert.equal(getTodayActivityCount(log, '2026-04-10'), 3);
  assert.equal(log.days['2026-04-10']?.anki, 1);
  assert.equal(log.days['2026-04-10']?.learn, 2);
  assert.deepEqual(log.reviewedLessonIds, ['struktur']);
});

test('getDailyStreak computes consecutive study days ending today or yesterday', () => {
  let log = EMPTY_ACTIVITY_LOG;
  assert.equal(getDailyStreak(log, '2026-04-10'), 0);

  log = recordStudyActivity(log, 'anki', { dateKey: '2026-04-08' });
  log = recordStudyActivity(log, 'challenge', { dateKey: '2026-04-09' });
  // Active streak from yesterday (today not logged yet)
  assert.equal(getDailyStreak(log, '2026-04-10'), 2);

  // Logged today extends streak to 3
  log = recordStudyActivity(log, 'tryout', { dateKey: '2026-04-10' });
  assert.equal(getDailyStreak(log, '2026-04-10'), 3);

  // Gap breaks streak
  assert.equal(getDailyStreak(log, '2026-04-12'), 0);
});

test('getWeeklyActivitySummary returns 7 ordered days ending at reference date', () => {
  const today = '2026-04-10';
  let log = recordStudyActivity(EMPTY_ACTIVITY_LOG, 'anki', {
    dateKey: shiftDateKey(today, -2),
    count: 4,
  });
  log = recordStudyActivity(log, 'tryout', {
    dateKey: today,
    count: 2,
  });

  const weekly = getWeeklyActivitySummary(log, today);
  assert.equal(weekly.length, 7);
  assert.equal(weekly[0]?.dateKey, '2026-04-04');
  assert.equal(weekly[4]?.total, 4);
  assert.equal(weekly[6]?.dateKey, today);
  assert.equal(weekly[6]?.total, 2);
  assert.equal(weekly[6]?.isToday, true);
});

test('createBackupPayload and parseBackupPayload roundtrip valid backups and reject invalid JSON', () => {
  const payload = createBackupPayload({
    ankiProgress: { studiedIds: ['n5-1'], againIds: [] },
    gameProgress: {
      totalXp: 150,
      completedLevels: {
        'stage-1': { stars: 3, bestAccuracy: 100, xpEarned: 80 },
      },
    },
    packetProgress: {
      completedIds: ['moji-bunpou'],
      awardedIds: ['moji-bunpou'],
      submittedIds: ['moji-bunpou'],
      answersByPart: {
        'moji-bunpou': { 'mb-name': 'Budi' },
        dokkai: {},
        choukai: {},
      },
    },
    latestReport: null,
    activityLog: recordStudyActivity(EMPTY_ACTIVITY_LOG, 'anki', {
      dateKey: '2026-04-10',
    }),
  });

  const parsed = parseBackupPayload(JSON.stringify(payload));
  assert.ok(parsed);
  assert.equal(parsed.gameProgress.totalXp, 150);
  assert.equal(parsed.packetProgress.answersByPart['moji-bunpou']?.['mb-name'], 'Budi');
  assert.equal(parsed.activityLog.days['2026-04-10']?.anki, 1);

  assert.equal(parseBackupPayload('{invalid json'), null);
  assert.equal(parseBackupPayload(JSON.stringify({ version: 99 })), null);
});
