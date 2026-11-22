import type { JlptLevel } from '../data/utamagoContent';
import type { AnkiCard } from './ankiParser';
import { resolveCardState, type AnkiSrsMap } from './ankiSrs';
import type { BunpouN2Item } from './bunpouN2Parser';
import {
  getLocalDateKey,
  shiftDateKey,
  type StudyActivityLog,
} from './studyAnalytics';

export interface DailyCardGoalSummary {
  doneCards: number;
  goalCards: number;
  percent: number;
  remainingCards: number;
  isTargetReached: boolean;
}

export interface WeekStreakDot {
  dateKey: string;
  label: string;
  active: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface ContinueLearningSummary {
  isResume: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
}

export interface DifficultCardEntry {
  card: AnkiCard;
  lapses: number;
  easeFactor: number;
  isRelearning: boolean;
}

const MONDAY_FIRST_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const LEVEL_STARTER_RECOMMENDATIONS: Record<
  JlptLevel,
  { title: string; subtitle: string }
> = {
  N5: {
    title: 'Bunpou N5 · Partikel & Kalimat Dasar',
    subtitle: 'Mulai dari partikel inti は, が, を, に dan bentuk ます.',
  },
  N4: {
    title: 'Bunpou N4 · Potensial & Pengandaian',
    subtitle: 'Pelajari 〜たら, 〜ば, 〜なら dan bentuk pemberi-penerima.',
  },
  N3: {
    title: 'Bunpou N3 · Pola Waktu & Syarat',
    subtitle: 'Bangun kelancaran kalimat majemuk dan nuansa sehari-hari.',
  },
  N2: {
    title: 'Bunpou N2 · Pola Konteks & Sikap',
    subtitle: 'Pahami nuansa formal dan ekspresi penting ujian JLPT N2.',
  },
  N1: {
    title: 'Bunpou N1 · Ragam Formal & Retorika',
    subtitle: 'Kuasai pola tingkat lanjut untuk bacaan resmi JLPT N1.',
  },
};

export function getShortRankName(rankTitle: string): string {
  const firstSegment = rankTitle.split('·')[0]?.trim();
  return firstSegment || rankTitle;
}

export function getDailyCardGoalSummary(
  activityLog: StudyActivityLog,
  dailyMinutes: number,
  todayKey: string = getLocalDateKey(),
): DailyCardGoalSummary {
  const goalCards = Math.max(10, Math.round(dailyMinutes / 2));
  const doneCards = Math.max(0, activityLog.days[todayKey]?.anki ?? 0);
  const percent = Math.min(100, Math.round((doneCards / goalCards) * 100));
  const remainingCards = Math.max(0, goalCards - doneCards);
  return {
    doneCards,
    goalCards,
    percent,
    remainingCards,
    isTargetReached: doneCards >= goalCards,
  };
}

export function getCurrentWeekStreakDots(
  activityLog: StudyActivityLog,
  todayKey: string = getLocalDateKey(),
): WeekStreakDot[] {
  const [y, m, d] = todayKey.split('-').map(Number);
  const todayDate = new Date(y, (m || 1) - 1, d || 1);
  // JS getDay(): 0 = Sunday, 1 = Monday ... 6 = Saturday -> shift to Monday = 0
  const mondayOffset = (todayDate.getDay() + 6) % 7;
  const mondayKey = shiftDateKey(todayKey, -mondayOffset);

  return MONDAY_FIRST_LABELS.map((label, idx) => {
    const dateKey = shiftDateKey(mondayKey, idx);
    const total = activityLog.days[dateKey]?.total ?? 0;
    return {
      dateKey,
      label,
      active: total > 0,
      isToday: idx === mondayOffset,
      isFuture: idx > mondayOffset,
    };
  });
}

export function getMascotGreetingLine(params: {
  dailyDoneCards: number;
  remainingCards: number;
  isTargetReached: boolean;
  dueAnkiCount: number;
  streakDays: number;
}): string {
  const {
    dailyDoneCards,
    remainingCards,
    isTargetReached,
    dueAnkiCount,
    streakDays,
  } = params;

  if (isTargetReached) {
    if (streakDays >= 2) {
      return `Hebat, streak ${streakDays} hari terjaga!`;
    }
    return 'Target hari ini beres. Kerja bagus!';
  }

  if (dueAnkiCount <= 0) {
    return 'Kartu hari ini kosong. Yuk baca materi baru!';
  }

  if (dailyDoneCards > 0) {
    return `Tinggal ${remainingCards} kartu lagi untuk capai target!`;
  }

  if (streakDays >= 2) {
    return `Jaga streak ${streakDays} hari — ${dueAnkiCount} kartu menunggu!`;
  }

  return `Ayo, ${dueAnkiCount} kartu menunggu hari ini!`;
}

export function resolveContinueLearning(params: {
  reviewedLessonIds: string[];
  unlockedLevel: JlptLevel;
  bunpouN5Items?: BunpouN2Item[];
  bunpouN4Items?: BunpouN2Item[];
  bunpouN3Items: BunpouN2Item[];
  bunpouN2Items: BunpouN2Item[];
  bunpouN1Items: BunpouN2Item[];
}): ContinueLearningSummary {
  const {
    reviewedLessonIds,
    unlockedLevel,
    bunpouN5Items = [],
    bunpouN4Items = [],
    bunpouN3Items,
    bunpouN2Items,
    bunpouN1Items,
  } = params;

  const allItems = [
    ...bunpouN5Items,
    ...bunpouN4Items,
    ...bunpouN3Items,
    ...bunpouN2Items,
    ...bunpouN1Items,
  ];

  for (let i = reviewedLessonIds.length - 1; i >= 0; i -= 1) {
    const lessonId = reviewedLessonIds[i];
    const matchedItem = allItems.find((item) => item.id === lessonId);
    if (matchedItem) {
      return {
        isResume: true,
        eyebrow: 'Lanjutkan belajar',
        title: `Bunpou ${matchedItem.level} · ${matchedItem.pattern}`,
        subtitle: matchedItem.meaning || matchedItem.lessonFullTitle,
      };
    }

    if (lessonId === 'materi-bunpou-N5' || lessonId === 'materi-bunpou-N4') {
      const lvl = lessonId.endsWith('N4') ? 'N4' : 'N5';
      const guide = LEVEL_STARTER_RECOMMENDATIONS[lvl];
      return {
        isResume: true,
        eyebrow: 'Lanjutkan belajar',
        title: guide.title,
        subtitle: guide.subtitle,
      };
    }
  }

  // Pengguna baru tanpa riwayat: tampilkan rekomendasi materi pertama sesuai level
  const firstByLevel: Record<JlptLevel, BunpouN2Item | undefined> = {
    N5: bunpouN5Items[0],
    N4: bunpouN4Items[0],
    N3: bunpouN3Items[0],
    N2: bunpouN2Items[0],
    N1: bunpouN1Items[0],
  };

  const starterItem = firstByLevel[unlockedLevel];
  if (starterItem) {
    return {
      isResume: false,
      eyebrow: `Rekomendasi ${unlockedLevel}`,
      title: `Bunpou ${starterItem.level} · ${starterItem.pattern}`,
      subtitle: starterItem.meaning || starterItem.lessonFullTitle,
    };
  }

  const fallbackGuide = LEVEL_STARTER_RECOMMENDATIONS[unlockedLevel];
  return {
    isResume: false,
    eyebrow: `Rekomendasi ${unlockedLevel}`,
    title: fallbackGuide.title,
    subtitle: fallbackGuide.subtitle,
  };
}

export function getDifficultAnkiCards(
  unlockedAnkiCards: AnkiCard[],
  ankiSrs: AnkiSrsMap,
  againIds: string[],
): DifficultCardEntry[] {
  const againSet = new Set(againIds);
  const result: DifficultCardEntry[] = [];

  for (const card of unlockedAnkiCards) {
    const srs = ankiSrs[card.id];
    const state = resolveCardState(srs);
    if (state === 'suspended') continue;

    const lapses = srs?.lapses ?? 0;
    const isRelearning = state === 'relearning';
    const isAgain = againSet.has(card.id);

    if (isAgain || lapses > 0 || isRelearning) {
      result.push({
        card,
        lapses: Math.max(lapses, isAgain ? 1 : 0),
        easeFactor: srs?.easeFactor ?? 2.5,
        isRelearning,
      });
    }
  }

  result.sort((a, b) => {
    if (b.lapses !== a.lapses) return b.lapses - a.lapses;
    return a.easeFactor - b.easeFactor;
  });

  return result;
}
