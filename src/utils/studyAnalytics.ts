import type { JlptLevel } from '../data/utamagoContent';
import type { StoredAnkiEngineState } from './ankiEngine';
import type { AnkiSrsMap } from './ankiSrs';
import type { ComputedTryOutReport } from './jlptReport';
import type { CompletedLevelRecord } from './levelProgression';
import type { DailyReminderConfig } from './notifications';
import type { TryOutFormValues, TryOutPacketPartId } from './tryOutPacket';

export type StudyActivityCategory = 'anki' | 'challenge' | 'tryout' | 'learn';

export interface DailyActivityEntry {
  anki: number;
  challenge: number;
  tryout: number;
  learn: number;
  total: number;
}

export interface StudyActivityLog {
  days: Record<string, DailyActivityEntry>;
  reviewedLessonIds: string[];
}

export interface WeeklyActivityPoint {
  dateKey: string;
  shortLabel: string;
  total: number;
  isToday: boolean;
}

export interface UtamagoBackupDataV1 {
  version: 1;
  exportedAt: string;
  ankiProgress: {
    studiedIds: string[];
    againIds: string[];
  };
  gameProgress: {
    totalXp: number;
    completedLevels: Record<string, CompletedLevelRecord>;
  };
  packetProgress: {
    completedIds: TryOutPacketPartId[];
    awardedIds: TryOutPacketPartId[];
    submittedIds: TryOutPacketPartId[];
    answersByPart: Record<TryOutPacketPartId, TryOutFormValues>;
  };
  latestReport: ComputedTryOutReport | null;
  activityLog: StudyActivityLog;
}

export interface UtamagoBackupData {
  version: 1 | 2;
  exportedAt: string;
  ankiProgress: {
    studiedIds: string[];
    againIds: string[];
  };
  ankiSrs?: AnkiSrsMap;
  ankiEngine?: StoredAnkiEngineState;
  onboarding?: {
    completed: boolean;
    name?: string;
    gender?: 'cowok' | 'cewek';
    targetLevel: JlptLevel;
    selfAssessedLevel?: JlptLevel;
    dailyMinutes: number;
  };
  gameProgress: {
    totalXp: number;
    completedLevels: Record<string, CompletedLevelRecord>;
  };
  packetProgress: {
    completedIds: TryOutPacketPartId[];
    awardedIds: TryOutPacketPartId[];
    submittedIds: TryOutPacketPartId[];
    answersByPart: Record<TryOutPacketPartId, TryOutFormValues>;
  };
  tryoutTimers?: Record<TryOutPacketPartId, number>;
  tryoutFlaggedIds?: Record<TryOutPacketPartId, string[]>;
  latestReport: ComputedTryOutReport | null;
  activityLog: StudyActivityLog;
  choukaiAudio?: {
    currentTime: number;
    playbackRate: number;
  };
  packetsProgress?: Record<
    string,
    {
      packetProgress: {
        completedIds: TryOutPacketPartId[];
        awardedIds: TryOutPacketPartId[];
        submittedIds: TryOutPacketPartId[];
        answersByPart: Record<TryOutPacketPartId, TryOutFormValues>;
      };
      tryoutTimers: Record<TryOutPacketPartId, number>;
      tryoutFlaggedIds: Record<TryOutPacketPartId, string[]>;
      choukaiAudio: {
        currentTime: number;
        playbackRate: number;
      };
    }
  >;
  reminder?: DailyReminderConfig;
}

const MAX_LOG_DAYS = 90;
const SHORT_DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const EMPTY_ACTIVITY_LOG: StudyActivityLog = {
  days: {},
  reviewedLessonIds: [],
};

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  return getLocalDateKey(dt);
}

function emptyDayEntry(): DailyActivityEntry {
  return { anki: 0, challenge: 0, tryout: 0, learn: 0, total: 0 };
}

export function recordStudyActivity(
  log: StudyActivityLog,
  category: StudyActivityCategory,
  options?: {
    dateKey?: string;
    count?: number;
    reviewedLessonId?: string;
  },
): StudyActivityLog {
  const dateKey = options?.dateKey ?? getLocalDateKey();
  const increment = Math.max(1, Math.floor(options?.count ?? 1));
  const currentDay = log.days[dateKey] ?? emptyDayEntry();

  const updatedDay: DailyActivityEntry = {
    ...currentDay,
    [category]: currentDay[category] + increment,
    total: currentDay.total + increment,
  };

  const nextDays: Record<string, DailyActivityEntry> = {
    ...log.days,
    [dateKey]: updatedDay,
  };

  const sortedKeys = Object.keys(nextDays).sort();
  if (sortedKeys.length > MAX_LOG_DAYS) {
    const removeCount = sortedKeys.length - MAX_LOG_DAYS;
    for (let i = 0; i < removeCount; i++) {
      delete nextDays[sortedKeys[i]];
    }
  }

  const lessonId = options?.reviewedLessonId;
  const nextReviewedLessonIds =
    lessonId && !log.reviewedLessonIds.includes(lessonId)
      ? [...log.reviewedLessonIds, lessonId]
      : log.reviewedLessonIds;

  return {
    days: nextDays,
    reviewedLessonIds: nextReviewedLessonIds,
  };
}

export function getTodayActivityCount(
  log: StudyActivityLog,
  todayKey: string = getLocalDateKey(),
): number {
  return log.days[todayKey]?.total ?? 0;
}

export function getTotalActivityCount(log: StudyActivityLog): number {
  return Object.values(log.days).reduce((sum, day) => sum + day.total, 0);
}

export function getDailyStreak(
  log: StudyActivityLog,
  todayKey: string = getLocalDateKey(),
): number {
  const todayCount = log.days[todayKey]?.total ?? 0;
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const yesterdayCount = log.days[yesterdayKey]?.total ?? 0;

  if (todayCount === 0 && yesterdayCount === 0) {
    return 0;
  }

  let cursor = todayCount > 0 ? todayKey : yesterdayKey;
  let streak = 0;

  while ((log.days[cursor]?.total ?? 0) > 0) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
}

export function getWeeklyActivitySummary(
  log: StudyActivityLog,
  todayKey: string = getLocalDateKey(),
): WeeklyActivityPoint[] {
  const points: WeeklyActivityPoint[] = [];

  for (let offset = -6; offset <= 0; offset++) {
    const key = shiftDateKey(todayKey, offset);
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    const shortLabel = SHORT_DAY_LABELS[dt.getDay()] ?? '';
    points.push({
      dateKey: key,
      shortLabel,
      total: log.days[key]?.total ?? 0,
      isToday: offset === 0,
    });
  }

  return points;
}

export function createBackupPayload(
  data: Omit<UtamagoBackupData, 'version' | 'exportedAt'> & { version?: 1 | 2 },
): UtamagoBackupData {
  const { version, ...rest } = data;
  const targetVersion =
    version ??
    (rest.ankiSrs || rest.onboarding || rest.choukaiAudio || rest.reminder ? 2 : 1);
  return {
    version: targetVersion,
    exportedAt: new Date().toISOString(),
    ...rest,
  };
}

export function parseBackupPayload(rawJson: string): UtamagoBackupData | null {
  try {
    const parsed = JSON.parse(rawJson) as Partial<UtamagoBackupData>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (parsed.version !== 1 && parsed.version !== 2)
    ) {
      return null;
    }

    if (
      !parsed.ankiProgress ||
      !Array.isArray(parsed.ankiProgress.studiedIds) ||
      !Array.isArray(parsed.ankiProgress.againIds)
    ) {
      return null;
    }

    if (
      !parsed.gameProgress ||
      typeof parsed.gameProgress.totalXp !== 'number' ||
      !parsed.gameProgress.completedLevels ||
      typeof parsed.gameProgress.completedLevels !== 'object'
    ) {
      return null;
    }

    if (
      !parsed.packetProgress ||
      !Array.isArray(parsed.packetProgress.completedIds) ||
      !Array.isArray(parsed.packetProgress.awardedIds) ||
      !Array.isArray(parsed.packetProgress.submittedIds) ||
      !parsed.packetProgress.answersByPart ||
      typeof parsed.packetProgress.answersByPart !== 'object'
    ) {
      return null;
    }

    const rawAnswers = parsed.packetProgress.answersByPart;
    const rawDays =
      parsed.activityLog && typeof parsed.activityLog.days === 'object'
        ? parsed.activityLog.days
        : {};
    const sanitizedDays: Record<string, DailyActivityEntry> = {};
    for (const [k, v] of Object.entries(rawDays)) {
      if (v && typeof v === 'object' && typeof v.total === 'number') {
        sanitizedDays[k] = {
          anki: Number(v.anki) || 0,
          challenge: Number(v.challenge) || 0,
          tryout: Number(v.tryout) || 0,
          learn: Number(v.learn) || 0,
          total: Number(v.total) || 0,
        };
      }
    }

    return {
      version: parsed.version,
      exportedAt:
        typeof parsed.exportedAt === 'string'
          ? parsed.exportedAt
          : new Date().toISOString(),
      ankiProgress: {
        studiedIds: parsed.ankiProgress.studiedIds.filter(
          (id): id is string => typeof id === 'string',
        ),
        againIds: parsed.ankiProgress.againIds.filter(
          (id): id is string => typeof id === 'string',
        ),
      },
      ankiSrs:
        parsed.ankiSrs && typeof parsed.ankiSrs === 'object'
          ? parsed.ankiSrs
          : undefined,
      ankiEngine:
        parsed.ankiEngine && typeof parsed.ankiEngine === 'object'
          ? parsed.ankiEngine
          : undefined,
      onboarding:
        parsed.onboarding && typeof parsed.onboarding === 'object'
          ? {
              completed: Boolean(parsed.onboarding.completed),
              name:
                typeof parsed.onboarding.name === 'string'
                  ? parsed.onboarding.name
                  : undefined,
              gender:
                parsed.onboarding.gender === 'cewek'
                  ? 'cewek'
                  : parsed.onboarding.gender === 'cowok'
                    ? 'cowok'
                    : undefined,
              targetLevel: parsed.onboarding.targetLevel ?? 'N5',
              selfAssessedLevel:
                parsed.onboarding.selfAssessedLevel ?? 'N5',
              dailyMinutes:
                typeof parsed.onboarding.dailyMinutes === 'number' &&
                parsed.onboarding.dailyMinutes > 0
                  ? parsed.onboarding.dailyMinutes
                  : 20,
            }
          : undefined,
      gameProgress: {
        totalXp: Math.max(0, Math.floor(parsed.gameProgress.totalXp)),
        completedLevels: parsed.gameProgress.completedLevels,
      },
      packetProgress: {
        completedIds: parsed.packetProgress.completedIds,
        awardedIds: parsed.packetProgress.awardedIds,
        submittedIds: parsed.packetProgress.submittedIds,
        answersByPart: {
          'moji-bunpou': rawAnswers['moji-bunpou'] ?? {},
          dokkai: rawAnswers.dokkai ?? {},
          choukai: rawAnswers.choukai ?? {},
        },
      },
      tryoutTimers:
        parsed.tryoutTimers && typeof parsed.tryoutTimers === 'object'
          ? parsed.tryoutTimers
          : undefined,
      tryoutFlaggedIds:
        parsed.tryoutFlaggedIds && typeof parsed.tryoutFlaggedIds === 'object'
          ? parsed.tryoutFlaggedIds
          : undefined,
      latestReport:
        parsed.latestReport &&
        typeof parsed.latestReport.average === 'number' &&
        Array.isArray(parsed.latestReport.rows)
          ? parsed.latestReport
          : null,
      activityLog: {
        days: sanitizedDays,
        reviewedLessonIds: Array.isArray(parsed.activityLog?.reviewedLessonIds)
          ? parsed.activityLog.reviewedLessonIds.filter(
              (id): id is string => typeof id === 'string',
            )
          : [],
      },
      choukaiAudio:
        parsed.choukaiAudio && typeof parsed.choukaiAudio === 'object'
          ? parsed.choukaiAudio
          : undefined,
      packetsProgress:
        parsed.packetsProgress && typeof parsed.packetsProgress === 'object'
          ? parsed.packetsProgress
          : undefined,
      reminder:
        parsed.reminder && typeof parsed.reminder === 'object'
          ? parsed.reminder
          : undefined,
    };
  } catch {
    return null;
  }
}
