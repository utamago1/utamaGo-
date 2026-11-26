import {
  collection,
  getDocs,
  limit,
  query,
  Timestamp,
} from 'firebase/firestore';
import type { JlptLevel } from '../data/utamagoContent';
import type { LearnerGender } from '../utils/levelProgression';
import type { UserProgressSummary } from './accountAuth';
import { checkIsBetaFeedbackAdmin } from './betaFeedback';
import { db, handleFirestoreError, OperationType } from './firebaseClient';

export interface AdminRegisteredUser {
  uid: string;
  username: string;
  email: string;
  name: string;
  gender: LearnerGender;
  selfAssessedLevel: JlptLevel;
  targetLevel: JlptLevel;
  dailyMinutes: number;
  onboardingCompleted: boolean;
  progressSummary: UserProgressSummary | null;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface AdminUserDeckBreakdown {
  deckId: string;
  category: 'kosakata' | 'bunpou';
  jlptLevel: JlptLevel;
  lastDateKey: string;
  reviewedToday: number;
  newToday: number;
  trackedCards: number;
  masteredCards: number;
  reviewCards: number;
  learningCards: number;
  lapsesTotal: number;
}

export interface AdminUserAnkiDetail {
  uid: string;
  totalTrackedCards: number;
  totalMasteredCards: number;
  totalReviewCards: number;
  totalLearningCards: number;
  decks: AdminUserDeckBreakdown[];
}

const VALID_JLPT: readonly JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

function toMillis(raw: unknown): number {
  if (raw instanceof Timestamp) return raw.toMillis();
  if (
    raw &&
    typeof raw === 'object' &&
    'toMillis' in raw &&
    typeof (raw as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (raw as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function normalizeJlpt(raw: unknown): JlptLevel {
  return typeof raw === 'string' && VALID_JLPT.includes(raw as JlptLevel)
    ? (raw as JlptLevel)
    : 'N5';
}

function parseProgressSummary(raw: unknown): UserProgressSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.xp !== 'number' && typeof obj.learnerLevel !== 'number') {
    return null;
  }
  return {
    xp: typeof obj.xp === 'number' && Number.isFinite(obj.xp) ? obj.xp : 0,
    learnerLevel:
      typeof obj.learnerLevel === 'number' && Number.isFinite(obj.learnerLevel)
        ? Math.max(1, obj.learnerLevel)
        : 1,
    streakDays:
      typeof obj.streakDays === 'number' && Number.isFinite(obj.streakDays)
        ? Math.max(0, obj.streakDays)
        : 0,
    ankiReviewedTotal:
      typeof obj.ankiReviewedTotal === 'number' &&
      Number.isFinite(obj.ankiReviewedTotal)
        ? Math.max(0, obj.ankiReviewedTotal)
        : 0,
    ankiMasteredTotal:
      typeof obj.ankiMasteredTotal === 'number' &&
      Number.isFinite(obj.ankiMasteredTotal)
        ? Math.max(0, obj.ankiMasteredTotal)
        : 0,
    tryOutCompletedCount:
      typeof obj.tryOutCompletedCount === 'number' &&
      Number.isFinite(obj.tryOutCompletedCount)
        ? Math.max(0, obj.tryOutCompletedCount)
        : 0,
    challengeClearedCount:
      typeof obj.challengeClearedCount === 'number' &&
      Number.isFinite(obj.challengeClearedCount)
        ? Math.max(0, obj.challengeClearedCount)
        : 0,
    lastActiveDate:
      typeof obj.lastActiveDate === 'string' ? obj.lastActiveDate : '',
  };
}

export async function loadAllRegisteredUsersForAdmin(): Promise<{
  users: AdminRegisteredUser[];
  firebaseAdminVerified: boolean;
}> {
  const isAdmin = await checkIsBetaFeedbackAdmin();
  if (!isAdmin) {
    return { users: [], firebaseAdminVerified: false };
  }

  const q = query(collection(db, 'users'), limit(300));
  try {
    const snap = await getDocs(q);
    const users: AdminRegisteredUser[] = snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          uid: typeof data.uid === 'string' ? data.uid : d.id,
          username:
            typeof data.username === 'string' ? data.username : 'pelajar',
          email: typeof data.email === 'string' ? data.email : '',
          name: typeof data.name === 'string' ? data.name : '',
          gender: (data.gender === 'cewek' ? 'cewek' : 'cowok') as LearnerGender,
          selfAssessedLevel: normalizeJlpt(data.selfAssessedLevel),
          targetLevel: normalizeJlpt(data.targetLevel),
          dailyMinutes:
            typeof data.dailyMinutes === 'number' &&
            Number.isFinite(data.dailyMinutes)
              ? data.dailyMinutes
              : 20,
          onboardingCompleted: Boolean(data.onboardingCompleted),
          progressSummary: parseProgressSummary(data.progressSummary),
          createdAtMs: toMillis(data.createdAt),
          updatedAtMs: toMillis(data.updatedAt),
        };
      })
      .sort((a, b) => b.createdAtMs - a.createdAtMs);

    return { users, firebaseAdminVerified: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

export async function loadUserAnkiDetailForAdmin(
  uid: string,
): Promise<AdminUserAnkiDetail> {
  const decksPath = `users/${uid}/ankiDecks`;
  const cardsPath = `users/${uid}/ankiCards`;

  try {
    const [decksSnap, cardsSnap] = await Promise.all([
      getDocs(query(collection(db, 'users', uid, 'ankiDecks'), limit(20))),
      getDocs(query(collection(db, 'users', uid, 'ankiCards'), limit(600))),
    ]);

    const deckMap = new Map<string, AdminUserDeckBreakdown>();

    for (const d of decksSnap.docs) {
      const data = d.data() as Record<string, unknown>;
      const deckId = typeof data.deckId === 'string' ? data.deckId : d.id;
      const daily =
        data.daily && typeof data.daily === 'object'
          ? (data.daily as Record<string, unknown>)
          : {};
      const reviewedArr = Array.isArray(daily.reviewedCardIdsToday)
        ? daily.reviewedCardIdsToday
        : [];
      const newArr = Array.isArray(daily.newCardIdsToday)
        ? daily.newCardIdsToday
        : [];
      deckMap.set(deckId, {
        deckId,
        category: data.category === 'bunpou' ? 'bunpou' : 'kosakata',
        jlptLevel: normalizeJlpt(data.jlptLevel),
        lastDateKey:
          typeof daily.dateKey === 'string' ? daily.dateKey : '',
        reviewedToday: reviewedArr.length,
        newToday: newArr.length,
        trackedCards: 0,
        masteredCards: 0,
        reviewCards: 0,
        learningCards: 0,
        lapsesTotal: 0,
      });
    }

    let totalTrackedCards = 0;
    let totalMasteredCards = 0;
    let totalReviewCards = 0;
    let totalLearningCards = 0;

    for (const c of cardsSnap.docs) {
      const data = c.data() as Record<string, unknown>;
      const deckId = typeof data.deckId === 'string' ? data.deckId : 'N5';
      let bucket = deckMap.get(deckId);
      if (!bucket) {
        bucket = {
          deckId,
          category: data.category === 'bunpou' ? 'bunpou' : 'kosakata',
          jlptLevel: normalizeJlpt(data.jlptLevel),
          lastDateKey: '',
          reviewedToday: 0,
          newToday: 0,
          trackedCards: 0,
          masteredCards: 0,
          reviewCards: 0,
          learningCards: 0,
          lapsesTotal: 0,
        };
        deckMap.set(deckId, bucket);
      }

      bucket.trackedCards += 1;
      totalTrackedCards += 1;

      if (Boolean(data.isMastered)) {
        bucket.masteredCards += 1;
        totalMasteredCards += 1;
      }
      if (data.state === 'review') {
        bucket.reviewCards += 1;
        totalReviewCards += 1;
      } else if (data.state === 'learning' || data.state === 'relearning') {
        bucket.learningCards += 1;
        totalLearningCards += 1;
      }
      if (typeof data.lapses === 'number' && Number.isFinite(data.lapses)) {
        bucket.lapsesTotal += Math.max(0, data.lapses);
      }
    }

    const decks = Array.from(deckMap.values()).sort(
      (a, b) => b.trackedCards - a.trackedCards || a.deckId.localeCompare(b.deckId),
    );

    return {
      uid,
      totalTrackedCards,
      totalMasteredCards,
      totalReviewCards,
      totalLearningCards,
      decks,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `${decksPath} | ${cardsPath}`);
  }
}
