import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCurrentWeekStreakDots,
  getDailyCardGoalSummary,
  getDifficultAnkiCards,
  getMascotGreetingLine,
  getShortRankName,
  resolveContinueLearning,
} from './homeSummary';
import type { AnkiCard } from './ankiParser';
import type { BunpouN2Item } from './bunpouN2Parser';
import { EMPTY_ACTIVITY_LOG, type StudyActivityLog } from './studyAnalytics';

test('getShortRankName returns short rank label before separator', () => {
  assert.equal(getShortRankName('Tamago · Fondasi'), 'Tamago');
  assert.equal(getShortRankName('Hiyoko · Berkembang'), 'Hiyoko');
});

test('getDailyCardGoalSummary uses single card unit and detects reached state', () => {
  const notStarted = getDailyCardGoalSummary(EMPTY_ACTIVITY_LOG, 20, '2026-11-22');
  assert.equal(notStarted.goalCards, 10);
  assert.equal(notStarted.doneCards, 0);
  assert.equal(notStarted.percent, 0);
  assert.equal(notStarted.isTargetReached, false);

  const reachedLog: StudyActivityLog = {
    days: {
      '2026-11-22': { anki: 12, challenge: 0, tryout: 0, learn: 0, total: 12 },
    },
    reviewedLessonIds: [],
  };
  const reached = getDailyCardGoalSummary(reachedLog, 20, '2026-11-22');
  assert.equal(reached.doneCards, 12);
  assert.equal(reached.goalCards, 10);
  assert.equal(reached.percent, 100);
  assert.equal(reached.isTargetReached, true);
});

test('getCurrentWeekStreakDots produces Monday through Sunday with accurate today marker', () => {
  // 2026-11-18 is Wednesday
  const log: StudyActivityLog = {
    days: {
      '2026-11-16': { anki: 5, challenge: 0, tryout: 0, learn: 0, total: 5 }, // Mon
      '2026-11-18': { anki: 3, challenge: 0, tryout: 0, learn: 0, total: 3 }, // Wed
    },
    reviewedLessonIds: [],
  };
  const dots = getCurrentWeekStreakDots(log, '2026-11-18');
  assert.equal(dots.length, 7);
  assert.deepEqual(
    dots.map((d) => d.label),
    ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
  );
  assert.equal(dots[0].active, true);
  assert.equal(dots[1].active, false);
  assert.equal(dots[2].isToday, true);
  assert.equal(dots[2].active, true);
  assert.equal(dots[3].isFuture, true);
  assert.equal(dots[6].dateKey, '2026-11-22');
});

test('getMascotGreetingLine covers all required Home states', () => {
  assert.match(
    getMascotGreetingLine({
      dailyDoneCards: 0,
      remainingCards: 10,
      isTargetReached: false,
      dueAnkiCount: 59,
      streakDays: 0,
    }),
    /59 kartu/,
  );

  assert.match(
    getMascotGreetingLine({
      dailyDoneCards: 10,
      remainingCards: 0,
      isTargetReached: true,
      dueAnkiCount: 15,
      streakDays: 7,
    }),
    /streak 7 hari/,
  );

  assert.match(
    getMascotGreetingLine({
      dailyDoneCards: 0,
      remainingCards: 10,
      isTargetReached: false,
      dueAnkiCount: 0,
      streakDays: 0,
    }),
    /materi/i,
  );
});

test('resolveContinueLearning falls back to level recommendation for new user and resumes last opened lesson', () => {
  const sampleN2: BunpouN2Item = {
    id: 'bunpou-n2-1',
    level: 'N2',
    index: 1,
    code: 'N2-001',
    groupId: 'I',
    groupTitle: 'Menjelaskan Hal',
    lessonNumber: 1,
    lessonTitle: '1課',
    lessonFullTitle: '1課',
    pattern: '〜にわたって',
    romaji: '~ni watatte',
    crossReference: '',
    meaning: 'Sepanjang / meliputi rentang waktu atau area',
    register: 'Formal',
    formula: 'N + にわたって',
    note: '',
    examples: [],
  };

  const newUser = resolveContinueLearning({
    reviewedLessonIds: [],
    unlockedLevel: 'N5',
    bunpouN3Items: [],
    bunpouN2Items: [sampleN2],
    bunpouN1Items: [],
  });
  assert.equal(newUser.isResume, false);
  assert.match(newUser.title, /N5/);

  const returningUser = resolveContinueLearning({
    reviewedLessonIds: ['bunpou-n2-1'],
    unlockedLevel: 'N2',
    bunpouN3Items: [],
    bunpouN2Items: [sampleN2],
    bunpouN1Items: [],
  });
  assert.equal(returningUser.isResume, true);
  assert.match(returningUser.title, /〜にわたって/);
});

test('getDifficultAnkiCards collects and ranks lapsed/again cards without suspended ones', () => {
  const makeCard = (id: string): AnkiCard => ({
    id,
    index: Number(id),
    deckId: 'N5',
    category: 'kosakata',
    jlptLevel: 'N5',
    word: `語${id}`,
    readingTerm: `語${id}(ご${id})`,
    furigana: `ご${id}`,
    meaning: `arti ${id}`,
    partOfSpeech: 'Kata benda',
    categoryGroup: 'Kata benda',
    tag: 'N5',
    examples: [],
  });

  const cards = [makeCard('1'), makeCard('2'), makeCard('3')];
  const difficult = getDifficultAnkiCards(
    cards,
    {
      '2': {
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 1.9,
        dueDate: '2026-11-22',
        lastReviewedAt: '2026-11-21T00:00:00Z',
        lapses: 3,
        state: 'relearning',
      },
      '3': {
        repetitions: 0,
        intervalDays: 0,
        easeFactor: 2.5,
        dueDate: '2026-11-22',
        lastReviewedAt: '2026-11-21T00:00:00Z',
        lapses: 5,
        state: 'suspended',
      },
    },
    ['1'],
  );

  assert.equal(difficult.length, 2);
  assert.equal(difficult[0].card.id, '2');
  assert.equal(difficult[1].card.id, '1');
});
