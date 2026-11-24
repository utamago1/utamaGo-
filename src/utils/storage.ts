import type { JlptLevel } from '../data/utamagoContent';
import {
  ALL_ANKI_DECK_IDS,
  createEmptyAnkiEngineState,
  isValidAnkiDeckId,
  sanitizeDeckSettings,
  type AnkiDeckDailyProgress,
  type AnkiDeckSettings,
  type AnkiStudySession,
  type StoredAnkiEngineState,
} from './ankiEngine';
import type { AnkiDeckId } from './ankiParser';
import type { AnkiSrsMap } from './ankiSrs';
import { hydrateSrsMapFromLegacy } from './ankiSrs';
import type { ComputedTryOutReport } from './jlptReport';
import {
  isValidJlptExamSession,
  type JlptExamSessionPreference,
} from './jlptCountdown';
import {
  createEmptyArcadeRecords,
  type ArcadeRecords,
  type BlitzBestRecord,
  type CompletedLevelRecord,
  type LearnerGender,
  type SurvivalBestRecord,
} from './levelProgression';
import type { DailyReminderConfig } from './notifications';
import {
  EMPTY_ACTIVITY_LOG,
  type DailyActivityEntry,
  type StudyActivityLog,
} from './studyAnalytics';
import type { TryOutFormValues, TryOutPacketPartId } from './tryOutPacket';

// Legacy-compatible storage keys (preserved so existing user progress is never lost)
export const ANKI_STORAGE_KEY = 'utamago_anki_n5_progress_v1';
export const TRYOUT_STORAGE_KEY = 'utamago_latest_tryout_v1';
export const TRYOUT_PACKET_STORAGE_KEY = 'utamago_n2_tryout1_progress_v1';
export const GAME_STORAGE_KEY = 'utamago_game_progress_v1';
export const ACTIVITY_LOG_STORAGE_KEY = 'utamago_activity_log_v1';
export const THEME_STORAGE_KEY = 'utamago_theme_mode_v1';
export const TEXT_SCALE_STORAGE_KEY = 'utamago_text_scale_v1';

// Centralized versioned storage key
export const STORAGE_SCHEMA_VERSION = 2;
export const APP_STATE_STORAGE_KEY = 'utamago_app_state_v2';

export function getAppStateStorageKey(userId?: string | null): string {
  const clean = typeof userId === 'string' ? userId.trim() : '';
  if (!clean || clean === 'utamago-preview') {
    return APP_STATE_STORAGE_KEY;
  }
  const safeId = clean.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96);
  return safeId ? `${APP_STATE_STORAGE_KEY}_${safeId}` : APP_STATE_STORAGE_KEY;
}

export type StoredAppTab = 'home' | 'anki' | 'learn' | 'tryout' | 'profile';
export type TextScale = 'normal' | 'large' | 'xlarge';

export interface StoredAnkiProgress {
  studiedIds: string[];
  againIds: string[];
}

export interface StoredGameProgress {
  totalXp: number;
  completedLevels: Record<string, CompletedLevelRecord>;
  arcadeRecords?: ArcadeRecords;
}

export interface StoredPacketProgress {
  completedIds: TryOutPacketPartId[];
  awardedIds: TryOutPacketPartId[];
  submittedIds: TryOutPacketPartId[];
  answersByPart: Record<TryOutPacketPartId, TryOutFormValues>;
}

export interface OnboardingSettings {
  completed: boolean;
  name: string;
  gender: LearnerGender;
  targetLevel: JlptLevel;
  selfAssessedLevel: JlptLevel;
  dailyMinutes: number;
}

export interface ChoukaiAudioState {
  currentTime: number;
  playbackRate: number;
}

export interface StoredTryOutPacketState {
  packetProgress: StoredPacketProgress;
  tryoutTimers: Record<TryOutPacketPartId, number>;
  tryoutFlaggedIds: Record<TryOutPacketPartId, string[]>;
  choukaiAudio: ChoukaiAudioState;
}

export interface UtamagoAppStateV2 {
  schemaVersion: 2;
  lastTab: StoredAppTab;
  textScale: TextScale;
  onboarding: OnboardingSettings;
  ankiProgress: StoredAnkiProgress;
  ankiSrs: AnkiSrsMap;
  ankiEngine: StoredAnkiEngineState;
  gameProgress: StoredGameProgress;
  packetProgress: StoredPacketProgress;
  tryoutTimers: Record<TryOutPacketPartId, number>;
  tryoutFlaggedIds: Record<TryOutPacketPartId, string[]>;
  packetsProgress: Record<string, StoredTryOutPacketState>;
  latestReport: ComputedTryOutReport | null;
  activityLog: StudyActivityLog;
  choukaiAudio: ChoukaiAudioState;
  reminder: DailyReminderConfig;
  jlptExamSession: JlptExamSessionPreference;
}

export const EMPTY_ANSWERS_BY_PART: Record<TryOutPacketPartId, TryOutFormValues> = {
  'moji-bunpou': {},
  dokkai: {},
  choukai: {},
};

export const EMPTY_TIMERS_BY_PART: Record<TryOutPacketPartId, number> = {
  'moji-bunpou': 0,
  dokkai: 0,
  choukai: 0,
};

export const EMPTY_FLAGGED_BY_PART: Record<TryOutPacketPartId, string[]> = {
  'moji-bunpou': [],
  dokkai: [],
  choukai: [],
};

export const DEFAULT_REMINDER_CONFIG: DailyReminderConfig = {
  enabled: false,
  hour: 19,
  minute: 0,
  lastNotifiedDate: null,
};

export function createDefaultPacketState(): StoredTryOutPacketState {
  return {
    packetProgress: {
      completedIds: [],
      awardedIds: [],
      submittedIds: [],
      answersByPart: { 'moji-bunpou': {}, dokkai: {}, choukai: {} },
    },
    tryoutTimers: { ...EMPTY_TIMERS_BY_PART },
    tryoutFlaggedIds: { 'moji-bunpou': [], dokkai: [], choukai: [] },
    choukaiAudio: { currentTime: 0, playbackRate: 1 },
  };
}

export function getPacketState(
  state: UtamagoAppStateV2,
  packetId: string,
): StoredTryOutPacketState {
  if (packetId === 'n2-1') {
    return (
      state.packetsProgress['n2-1'] ?? {
        packetProgress: state.packetProgress,
        tryoutTimers: state.tryoutTimers,
        tryoutFlaggedIds: state.tryoutFlaggedIds,
        choukaiAudio: state.choukaiAudio,
      }
    );
  }
  return state.packetsProgress[packetId] ?? createDefaultPacketState();
}

export function createDefaultAppState(): UtamagoAppStateV2 {
  const initialFirst = createDefaultPacketState();
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    lastTab: 'home',
    textScale: 'normal',
    onboarding: {
      completed: false,
      name: '',
      gender: 'cowok',
      targetLevel: 'N5',
      selfAssessedLevel: 'N5',
      dailyMinutes: 20,
    },
    ankiProgress: { studiedIds: [], againIds: [] },
    ankiSrs: {},
    ankiEngine: createEmptyAnkiEngineState(),
    gameProgress: { totalXp: 0, completedLevels: {} },
    packetProgress: initialFirst.packetProgress,
    tryoutTimers: { ...EMPTY_TIMERS_BY_PART },
    tryoutFlaggedIds: { 'moji-bunpou': [], dokkai: [], choukai: [] },
    packetsProgress: {
      'n2-1': initialFirst,
    },
    latestReport: null,
    activityLog: EMPTY_ACTIVITY_LOG,
    choukaiAudio: { currentTime: 0, playbackRate: 1 },
    reminder: { ...DEFAULT_REMINDER_CONFIG },
    jlptExamSession: 'auto',
  };
}

export function safeStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeStorageRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage access errors
  }
}

function sanitizeAnkiProgress(raw: unknown): StoredAnkiProgress {
  if (!raw || typeof raw !== 'object') return { studiedIds: [], againIds: [] };
  const parsed = raw as Partial<StoredAnkiProgress>;
  return {
    studiedIds: Array.isArray(parsed.studiedIds)
      ? parsed.studiedIds.filter((x): x is string => typeof x === 'string')
      : [],
    againIds: Array.isArray(parsed.againIds)
      ? parsed.againIds.filter((x): x is string => typeof x === 'string')
      : [],
  };
}

function sanitizeAnkiDailyProgress(raw: unknown): AnkiDeckDailyProgress | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<AnkiDeckDailyProgress>;
  if (typeof parsed.dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.dateKey)) {
    return null;
  }
  return {
    dateKey: parsed.dateKey,
    newCardIdsToday: Array.isArray(parsed.newCardIdsToday)
      ? [...new Set(parsed.newCardIdsToday.filter((x): x is string => typeof x === 'string'))]
      : [],
    reviewedCardIdsToday: Array.isArray(parsed.reviewedCardIdsToday)
      ? [...new Set(parsed.reviewedCardIdsToday.filter((x): x is string => typeof x === 'string'))]
      : [],
    reviewCompletionsToday: Math.max(
      0,
      Math.round(Number(parsed.reviewCompletionsToday) || 0),
    ),
    extraReviewQuotaToday: Math.max(
      0,
      Math.round(Number(parsed.extraReviewQuotaToday) || 0),
    ),
    dailyNewOrderDateKey:
      typeof parsed.dailyNewOrderDateKey === 'string'
        ? parsed.dailyNewOrderDateKey.slice(0, 10)
        : '',
    dailyNewOrderIds: Array.isArray(parsed.dailyNewOrderIds)
      ? parsed.dailyNewOrderIds.filter((x): x is string => typeof x === 'string')
      : [],
  };
}

function sanitizeAnkiSession(
  deckId: AnkiDeckId,
  raw: unknown,
): AnkiStudySession | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<AnkiStudySession>;
  if (
    typeof parsed.sessionId !== 'string' ||
    !parsed.sessionId ||
    parsed.deckId !== deckId ||
    (parsed.scope !== 'due' && parsed.scope !== 'all') ||
    typeof parsed.dateKey !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(parsed.dateKey) ||
    !Array.isArray(parsed.queueCardIds)
  ) {
    return null;
  }
  const queueCardIds = parsed.queueCardIds.filter(
    (x): x is string => typeof x === 'string',
  );
  const completedCardIds = Array.isArray(parsed.completedCardIds)
    ? parsed.completedCardIds.filter((x): x is string => typeof x === 'string')
    : [];
  const currentIndex =
    typeof parsed.currentIndex === 'number' && Number.isFinite(parsed.currentIndex)
      ? Math.max(0, Math.min(Math.max(0, queueCardIds.length - 1), Math.floor(parsed.currentIndex)))
      : 0;
  return {
    sessionId: parsed.sessionId.slice(0, 120),
    deckId,
    scope: parsed.scope,
    dateKey: parsed.dateKey,
    queueCardIds,
    currentIndex,
    completedCardIds,
    startedAt:
      typeof parsed.startedAt === 'string' ? parsed.startedAt.slice(0, 40) : '',
    updatedAt:
      typeof parsed.updatedAt === 'string' ? parsed.updatedAt.slice(0, 40) : '',
  };
}

export function sanitizeAnkiEngineState(raw: unknown): StoredAnkiEngineState {
  if (!raw || typeof raw !== 'object') return createEmptyAnkiEngineState();
  const parsed = raw as Partial<StoredAnkiEngineState>;
  const deckSettings: Partial<Record<AnkiDeckId, AnkiDeckSettings>> = {};
  const deckDaily: Partial<Record<AnkiDeckId, AnkiDeckDailyProgress>> = {};
  const deckSessions: Partial<Record<AnkiDeckId, AnkiStudySession | null>> = {};

  if (parsed.deckSettings && typeof parsed.deckSettings === 'object') {
    for (const [key, val] of Object.entries(parsed.deckSettings)) {
      if (isValidAnkiDeckId(key) && val && typeof val === 'object') {
        deckSettings[key] = sanitizeDeckSettings(key, val as Partial<AnkiDeckSettings>);
      }
    }
  }

  if (parsed.deckDaily && typeof parsed.deckDaily === 'object') {
    for (const [key, val] of Object.entries(parsed.deckDaily)) {
      if (isValidAnkiDeckId(key)) {
        const clean = sanitizeAnkiDailyProgress(val);
        if (clean) deckDaily[key] = clean;
      }
    }
  }

  if (parsed.deckSessions && typeof parsed.deckSessions === 'object') {
    for (const [key, val] of Object.entries(parsed.deckSessions)) {
      if (isValidAnkiDeckId(key)) {
        deckSessions[key] = sanitizeAnkiSession(key, val);
      }
    }
  }

  // Ensure no invalid keys leaked in
  for (const deckId of ALL_ANKI_DECK_IDS) {
    if (deckSessions[deckId] === undefined) {
      delete deckSessions[deckId];
    }
  }

  return {
    deckSettings,
    deckDaily,
    deckSessions,
  };
}

function sanitizePacketProgress(raw: unknown): StoredPacketProgress {
  if (!raw || typeof raw !== 'object') {
    return {
      completedIds: [],
      awardedIds: [],
      submittedIds: [],
      answersByPart: { 'moji-bunpou': {}, dokkai: {}, choukai: {} },
    };
  }
  const parsed = raw as Partial<StoredPacketProgress>;
  const rawAnswers = parsed.answersByPart;
  return {
    completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
    awardedIds: Array.isArray(parsed.awardedIds) ? parsed.awardedIds : [],
    submittedIds: Array.isArray(parsed.submittedIds) ? parsed.submittedIds : [],
    answersByPart: {
      'moji-bunpou':
        rawAnswers?.['moji-bunpou'] && typeof rawAnswers['moji-bunpou'] === 'object'
          ? rawAnswers['moji-bunpou']
          : {},
      dokkai:
        rawAnswers?.dokkai && typeof rawAnswers.dokkai === 'object'
          ? rawAnswers.dokkai
          : {},
      choukai:
        rawAnswers?.choukai && typeof rawAnswers.choukai === 'object'
          ? rawAnswers.choukai
          : {},
    },
  };
}

function sanitizeTimers(raw: unknown): Record<TryOutPacketPartId, number> {
  const parsed =
    raw && typeof raw === 'object'
      ? (raw as Partial<Record<TryOutPacketPartId, unknown>>)
      : undefined;
  return {
    'moji-bunpou': Math.max(0, Number(parsed?.['moji-bunpou']) || 0),
    dokkai: Math.max(0, Number(parsed?.dokkai) || 0),
    choukai: Math.max(0, Number(parsed?.choukai) || 0),
  };
}

function sanitizeFlaggedIds(raw: unknown): Record<TryOutPacketPartId, string[]> {
  const parsed =
    raw && typeof raw === 'object'
      ? (raw as Partial<Record<TryOutPacketPartId, unknown>>)
      : undefined;
  return {
    'moji-bunpou': Array.isArray(parsed?.['moji-bunpou'])
      ? parsed['moji-bunpou'].filter((x): x is string => typeof x === 'string')
      : [],
    dokkai: Array.isArray(parsed?.dokkai)
      ? parsed.dokkai.filter((x): x is string => typeof x === 'string')
      : [],
    choukai: Array.isArray(parsed?.choukai)
      ? parsed.choukai.filter((x): x is string => typeof x === 'string')
      : [],
  };
}

function sanitizeAudioState(raw: unknown): ChoukaiAudioState {
  const parsed =
    raw && typeof raw === 'object'
      ? (raw as Partial<ChoukaiAudioState>)
      : undefined;
  return {
    currentTime:
      typeof parsed?.currentTime === 'number' &&
      Number.isFinite(parsed.currentTime)
        ? Math.max(0, parsed.currentTime)
        : 0,
    playbackRate:
      typeof parsed?.playbackRate === 'number' &&
      parsed.playbackRate >= 0.5 &&
      parsed.playbackRate <= 2
        ? parsed.playbackRate
        : 1,
  };
}

export function sanitizePacketsProgressMap(
  raw: unknown,
  fallbackFirst?: StoredTryOutPacketState,
): Record<string, StoredTryOutPacketState> {
  const result: Record<string, StoredTryOutPacketState> = {};
  if (raw && typeof raw === 'object') {
    for (const [packetId, value] of Object.entries(
      raw as Record<string, unknown>,
    )) {
      if (!value || typeof value !== 'object') continue;
      const entry = value as Partial<StoredTryOutPacketState>;
      result[packetId] = {
        packetProgress: sanitizePacketProgress(entry.packetProgress),
        tryoutTimers: sanitizeTimers(entry.tryoutTimers),
        tryoutFlaggedIds: sanitizeFlaggedIds(entry.tryoutFlaggedIds),
        choukaiAudio: sanitizeAudioState(entry.choukaiAudio),
      };
    }
  }
  if (!result['n2-1'] && fallbackFirst) {
    result['n2-1'] = fallbackFirst;
  }
  return result;
}

function sanitizeArcadeRecords(raw: unknown): ArcadeRecords {
  const empty = createEmptyArcadeRecords();
  if (!raw || typeof raw !== 'object') return empty;
  const parsed = raw as Partial<ArcadeRecords>;

  const validLevels: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const blitzBestByLevel: Partial<Record<JlptLevel, BlitzBestRecord>> = {};
  if (parsed.blitzBestByLevel && typeof parsed.blitzBestByLevel === 'object') {
    for (const lv of validLevels) {
      const rec = parsed.blitzBestByLevel[lv];
      if (rec && typeof rec === 'object') {
        blitzBestByLevel[lv] = {
          bestScore: Math.max(0, Number(rec.bestScore) || 0),
          bestCombo: Math.max(0, Number(rec.bestCombo) || 0),
          bestCorrect: Math.max(0, Number(rec.bestCorrect) || 0),
        };
      }
    }
  }

  const survivalBestByLevel: Partial<Record<JlptLevel, SurvivalBestRecord>> = {};
  if (
    parsed.survivalBestByLevel &&
    typeof parsed.survivalBestByLevel === 'object'
  ) {
    for (const lv of validLevels) {
      const rec = parsed.survivalBestByLevel[lv];
      if (rec && typeof rec === 'object') {
        survivalBestByLevel[lv] = {
          bestCleared: Math.max(0, Number(rec.bestCleared) || 0),
          bestScore: Math.max(0, Number(rec.bestScore) || 0),
          bestCombo: Math.max(0, Number(rec.bestCombo) || 0),
        };
      }
    }
  }

  const defeatedBosses: Record<string, CompletedLevelRecord> = {};
  if (parsed.defeatedBosses && typeof parsed.defeatedBosses === 'object') {
    for (const [bossId, rec] of Object.entries(parsed.defeatedBosses)) {
      if (rec && typeof rec === 'object' && typeof rec.stars === 'number') {
        const clampedStars = Math.min(3, Math.max(1, Math.round(rec.stars))) as
          | 1
          | 2
          | 3;
        defeatedBosses[bossId] = {
          stars: clampedStars,
          bestAccuracy: Math.min(100, Math.max(0, Number(rec.bestAccuracy) || 0)),
          xpEarned: Math.max(0, Number(rec.xpEarned) || 0),
        };
      }
    }
  }

  return {
    blitzBestByLevel,
    survivalBestByLevel,
    defeatedBosses,
  };
}

function sanitizeGameProgress(raw: unknown): StoredGameProgress {
  if (!raw || typeof raw !== 'object') {
    return {
      totalXp: 0,
      completedLevels: {},
      arcadeRecords: createEmptyArcadeRecords(),
    };
  }
  const parsed = raw as Partial<StoredGameProgress>;
  return {
    totalXp:
      typeof parsed.totalXp === 'number' && Number.isFinite(parsed.totalXp)
        ? Math.max(0, parsed.totalXp)
        : 0,
    completedLevels:
      parsed.completedLevels && typeof parsed.completedLevels === 'object'
        ? parsed.completedLevels
        : {},
    arcadeRecords: sanitizeArcadeRecords(parsed.arcadeRecords),
  };
}

function sanitizeActivityLog(raw: unknown): StudyActivityLog {
  if (!raw || typeof raw !== 'object') return EMPTY_ACTIVITY_LOG;
  const parsed = raw as Partial<StudyActivityLog>;
  const sanitizedDays: Record<string, DailyActivityEntry> = {};
  if (parsed.days && typeof parsed.days === 'object') {
    for (const [k, v] of Object.entries(parsed.days)) {
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
  }
  return {
    days: sanitizedDays,
    reviewedLessonIds: Array.isArray(parsed.reviewedLessonIds)
      ? parsed.reviewedLessonIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

function sanitizeTryOutReport(raw: unknown): ComputedTryOutReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as ComputedTryOutReport;
  if (typeof parsed?.average === 'number' && Array.isArray(parsed?.rows)) {
    return parsed;
  }
  return null;
}

export function loadStoredAnkiProgress(): StoredAnkiProgress {
  const raw = safeStorageGet(ANKI_STORAGE_KEY);
  if (!raw) return { studiedIds: [], againIds: [] };
  try {
    return sanitizeAnkiProgress(JSON.parse(raw));
  } catch {
    return { studiedIds: [], againIds: [] };
  }
}

export function loadStoredTryOutReport(): ComputedTryOutReport | null {
  const raw = safeStorageGet(TRYOUT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return sanitizeTryOutReport(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadStoredPacketProgress(): StoredPacketProgress {
  const raw = safeStorageGet(TRYOUT_PACKET_STORAGE_KEY);
  if (!raw) return sanitizePacketProgress(null);
  try {
    return sanitizePacketProgress(JSON.parse(raw));
  } catch {
    return sanitizePacketProgress(null);
  }
}

export function loadStoredGameProgress(): StoredGameProgress {
  const raw = safeStorageGet(GAME_STORAGE_KEY);
  if (!raw) return { totalXp: 0, completedLevels: {} };
  try {
    return sanitizeGameProgress(JSON.parse(raw));
  } catch {
    return { totalXp: 0, completedLevels: {} };
  }
}

export function loadStoredActivityLog(): StudyActivityLog {
  const raw = safeStorageGet(ACTIVITY_LOG_STORAGE_KEY);
  if (!raw) return EMPTY_ACTIVITY_LOG;
  try {
    return sanitizeActivityLog(JSON.parse(raw));
  } catch {
    return EMPTY_ACTIVITY_LOG;
  }
}

export function isValidTab(val: unknown): val is StoredAppTab {
  return (
    val === 'home' ||
    val === 'anki' ||
    val === 'learn' ||
    val === 'tryout' ||
    val === 'profile'
  );
}

export function isValidTextScale(val: unknown): val is TextScale {
  return val === 'normal' || val === 'large' || val === 'xlarge';
}

export function isValidJlptLevel(val: unknown): val is JlptLevel {
  return (
    val === 'N5' || val === 'N4' || val === 'N3' || val === 'N2' || val === 'N1'
  );
}

export function migrateLegacyStorageToV2(): UtamagoAppStateV2 {
  const ankiProgress = loadStoredAnkiProgress();
  const gameProgress = loadStoredGameProgress();
  const packetProgress = loadStoredPacketProgress();
  const latestReport = loadStoredTryOutReport();
  const activityLog = loadStoredActivityLog();

  const hasLegacyProgress =
    ankiProgress.studiedIds.length > 0 ||
    ankiProgress.againIds.length > 0 ||
    gameProgress.totalXp > 0 ||
    Object.keys(gameProgress.completedLevels).length > 0 ||
    packetProgress.completedIds.length > 0 ||
    packetProgress.submittedIds.length > 0 ||
    Object.keys(packetProgress.answersByPart['moji-bunpou']).length > 0 ||
    Object.keys(packetProgress.answersByPart.dokkai).length > 0 ||
    Object.keys(packetProgress.answersByPart.choukai).length > 0 ||
    latestReport !== null ||
    Object.keys(activityLog.days).length > 0;

  const savedScale = safeStorageGet(TEXT_SCALE_STORAGE_KEY);
  const textScale: TextScale = isValidTextScale(savedScale)
    ? savedScale
    : 'normal';

  const ankiSrs = hydrateSrsMapFromLegacy(
    {},
    ankiProgress.studiedIds,
    ankiProgress.againIds,
  );

  const firstPacketState: StoredTryOutPacketState = {
    packetProgress,
    tryoutTimers: { ...EMPTY_TIMERS_BY_PART },
    tryoutFlaggedIds: { 'moji-bunpou': [], dokkai: [], choukai: [] },
    choukaiAudio: { currentTime: 0, playbackRate: 1 },
  };

  return {
    ...createDefaultAppState(),
    textScale,
    onboarding: {
      completed: hasLegacyProgress,
      name: '',
      gender: 'cowok',
      targetLevel: 'N5',
      selfAssessedLevel: 'N5',
      dailyMinutes: 20,
    },
    ankiProgress,
    ankiSrs,
    gameProgress,
    packetProgress,
    packetsProgress: {
      'n2-1': firstPacketState,
    },
    latestReport,
    activityLog,
  };
}

const LEGACY_CLAIMED_BY_KEY = 'utamago_legacy_claimed_by_v2';

export function loadUnifiedAppState(userId?: string | null): UtamagoAppStateV2 {
  const storageKey = getAppStateStorageKey(userId);
  let raw = safeStorageGet(storageKey);

  // If authenticated user has no user-scoped storage yet, claim un-scoped legacy local state
  // at most once per browser so User B never inherits User A's local data.
  if (!raw && storageKey !== APP_STATE_STORAGE_KEY && userId) {
    const claimedBy = safeStorageGet(LEGACY_CLAIMED_BY_KEY);
    const legacyUnified = safeStorageGet(APP_STATE_STORAGE_KEY);
    if (legacyUnified && (!claimedBy || claimedBy === userId)) {
      raw = legacyUnified;
      safeStorageSet(LEGACY_CLAIMED_BY_KEY, userId);
    }
  }

  if (!raw) {
    const migrated =
      storageKey === APP_STATE_STORAGE_KEY
        ? migrateLegacyStorageToV2()
        : createDefaultAppState();
    saveUnifiedAppState(migrated, userId);
    return migrated;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UtamagoAppStateV2>;
    if (!parsed || typeof parsed !== 'object') {
      return storageKey === APP_STATE_STORAGE_KEY
        ? migrateLegacyStorageToV2()
        : createDefaultAppState();
    }

    const defaults = createDefaultAppState();
    const ankiProgress = sanitizeAnkiProgress(parsed.ankiProgress);
    const rawSrs =
      parsed.ankiSrs && typeof parsed.ankiSrs === 'object'
        ? parsed.ankiSrs
        : {};
    const ankiSrs = hydrateSrsMapFromLegacy(
      rawSrs as AnkiSrsMap,
      ankiProgress.studiedIds,
      ankiProgress.againIds,
    );
    const ankiEngine = sanitizeAnkiEngineState(parsed.ankiEngine);

    const rawOnboarding = parsed.onboarding;
    const rawReminder = parsed.reminder;
    const sanitizedFirst: StoredTryOutPacketState = {
      packetProgress: sanitizePacketProgress(parsed.packetProgress),
      tryoutTimers: sanitizeTimers(parsed.tryoutTimers),
      tryoutFlaggedIds: sanitizeFlaggedIds(parsed.tryoutFlaggedIds),
      choukaiAudio: sanitizeAudioState(parsed.choukaiAudio),
    };
    const packetsProgress = sanitizePacketsProgressMap(
      parsed.packetsProgress,
      sanitizedFirst,
    );
    const effectiveFirst = packetsProgress['n2-1'] ?? sanitizedFirst;

    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      lastTab: isValidTab(parsed.lastTab) ? parsed.lastTab : 'home',
      textScale: isValidTextScale(parsed.textScale)
        ? parsed.textScale
        : defaults.textScale,
      onboarding: {
        completed: Boolean(rawOnboarding?.completed),
        name:
          typeof rawOnboarding?.name === 'string'
            ? rawOnboarding.name.trim()
            : '',
        gender: rawOnboarding?.gender === 'cewek' ? 'cewek' : 'cowok',
        targetLevel: isValidJlptLevel(rawOnboarding?.targetLevel)
          ? rawOnboarding.targetLevel
          : 'N5',
        selfAssessedLevel: isValidJlptLevel(rawOnboarding?.selfAssessedLevel)
          ? rawOnboarding.selfAssessedLevel
          : 'N5',
        dailyMinutes:
          typeof rawOnboarding?.dailyMinutes === 'number' &&
          rawOnboarding.dailyMinutes > 0
            ? rawOnboarding.dailyMinutes
            : 20,
      },
      ankiProgress,
      ankiSrs,
      ankiEngine,
      gameProgress: sanitizeGameProgress(parsed.gameProgress),
      packetProgress: effectiveFirst.packetProgress,
      tryoutTimers: effectiveFirst.tryoutTimers,
      tryoutFlaggedIds: effectiveFirst.tryoutFlaggedIds,
      packetsProgress,
      latestReport: sanitizeTryOutReport(parsed.latestReport),
      activityLog: sanitizeActivityLog(parsed.activityLog),
      choukaiAudio: effectiveFirst.choukaiAudio,
      reminder: {
        enabled: Boolean(rawReminder?.enabled),
        hour:
          typeof rawReminder?.hour === 'number' &&
          rawReminder.hour >= 0 &&
          rawReminder.hour <= 23
            ? Math.floor(rawReminder.hour)
            : 19,
        minute:
          typeof rawReminder?.minute === 'number' &&
          rawReminder.minute >= 0 &&
          rawReminder.minute <= 59
            ? Math.floor(rawReminder.minute)
            : 0,
        lastNotifiedDate:
          typeof rawReminder?.lastNotifiedDate === 'string'
            ? rawReminder.lastNotifiedDate
            : null,
      },
      jlptExamSession: isValidJlptExamSession(parsed.jlptExamSession)
        ? parsed.jlptExamSession
        : 'auto',
    };
  } catch {
    return storageKey === APP_STATE_STORAGE_KEY
      ? migrateLegacyStorageToV2()
      : createDefaultAppState();
  }
}

export function saveUnifiedAppState(
  state: UtamagoAppStateV2,
  userId?: string | null,
): boolean {
  const storageKey = getAppStateStorageKey(userId);
  const ok = safeStorageSet(storageKey, JSON.stringify(state));
  safeStorageSet(TEXT_SCALE_STORAGE_KEY, state.textScale);
  // Mirror key segments only for the default (non-user-scoped) slot so separate
  // authenticated accounts never bleed into each other via legacy keys.
  if (storageKey === APP_STATE_STORAGE_KEY) {
    safeStorageSet(ANKI_STORAGE_KEY, JSON.stringify(state.ankiProgress));
    safeStorageSet(GAME_STORAGE_KEY, JSON.stringify(state.gameProgress));
    safeStorageSet(TRYOUT_PACKET_STORAGE_KEY, JSON.stringify(state.packetProgress));
    safeStorageSet(ACTIVITY_LOG_STORAGE_KEY, JSON.stringify(state.activityLog));
    if (state.latestReport) {
      safeStorageSet(TRYOUT_STORAGE_KEY, JSON.stringify(state.latestReport));
    } else {
      safeStorageRemove(TRYOUT_STORAGE_KEY);
    }
  }
  return ok;
}

export function clearAllAppStorage(userId?: string | null): void {
  const storageKey = getAppStateStorageKey(userId);
  safeStorageRemove(storageKey);
  if (storageKey === APP_STATE_STORAGE_KEY) {
    safeStorageRemove(ANKI_STORAGE_KEY);
    safeStorageRemove(TRYOUT_STORAGE_KEY);
    safeStorageRemove(TRYOUT_PACKET_STORAGE_KEY);
    safeStorageRemove(GAME_STORAGE_KEY);
    safeStorageRemove(ACTIVITY_LOG_STORAGE_KEY);
  }
}
