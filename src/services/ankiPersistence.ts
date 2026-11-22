import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ANKI_DECK_META,
  createEmptyAnkiEngineState,
  createEmptyDeckDailyProgress,
  getDefaultDeckSettings,
  isValidAnkiDeckId,
  sanitizeDeckSettings,
  type AnkiDeckDailyProgress,
  type AnkiDeckSettings,
  type AnkiStudySession,
  type StoredAnkiEngineState,
} from '../utils/ankiEngine';
import type { AnkiDeckId } from '../utils/ankiParser';
import {
  computeIsMastered,
  resolveCardState,
  type AnkiReviewLogEntry,
  type AnkiSrsCardState,
  type AnkiSrsMap,
} from '../utils/ankiSrs';
import { getLocalDateKey } from '../utils/studyAnalytics';
import { auth, db, handleFirestoreError, OperationType } from './firebaseClient';

function isValidAuthenticatedUid(userId: string | undefined | null): userId is string {
  if (!userId || userId === 'utamago-preview') return false;
  return Boolean(auth.currentUser && auth.currentUser.uid === userId);
}

/**
 * Deterministic ASCII-only Firestore document ID for any Anki cardId (including Japanese kanji/kana).
 * Matches `isValidId` (`^[a-zA-Z0-9_-]+$`, <= 128 chars).
 */
export function toAnkiCardDocId(deckId: AnkiDeckId, cardId: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < cardId.length; i++) {
    const ch = cardId.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${deckId}__${hex1}${hex2}`;
}

function serializeDeckDoc(
  userId: string,
  deckId: AnkiDeckId,
  settings: AnkiDeckSettings,
  daily: AnkiDeckDailyProgress,
  activeSession: AnkiStudySession | null,
) {
  const meta = ANKI_DECK_META[deckId];
  const cleanSettings = sanitizeDeckSettings(deckId, settings);
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(daily.dateKey)
    ? daily.dateKey
    : getLocalDateKey();

  const serializedSession =
    activeSession &&
    activeSession.deckId === deckId &&
    /^\d{4}-\d{2}-\d{2}$/.test(activeSession.dateKey)
      ? (() => {
          const cappedQueue = activeSession.queueCardIds.slice(0, 500);
          const cappedIdx = Math.max(
            0,
            Math.min(
              Math.max(0, cappedQueue.length - 1),
              Math.floor(activeSession.currentIndex),
            ),
          );
          return {
            sessionId: activeSession.sessionId.slice(0, 120),
            deckId,
            scope: activeSession.scope,
            dateKey: activeSession.dateKey,
            queueCardIds: cappedQueue,
            currentIndex: cappedIdx,
            completedCardIds: activeSession.completedCardIds.slice(0, 500),
            startedAt: activeSession.startedAt.slice(0, 40),
            updatedAt: activeSession.updatedAt.slice(0, 40),
          };
        })()
      : null;

  return {
    userId,
    deckId,
    category: meta.category,
    jlptLevel: meta.jlptLevel,
    settings: cleanSettings,
    daily: {
      dateKey,
      newCardIdsToday: daily.newCardIdsToday.slice(0, 250),
      reviewedCardIdsToday: daily.reviewedCardIdsToday.slice(0, 2000),
      reviewCompletionsToday: Math.max(
        0,
        Math.min(5000, Math.round(daily.reviewCompletionsToday || 0)),
      ),
      extraReviewQuotaToday: Math.max(
        0,
        Math.min(1000, Math.round(daily.extraReviewQuotaToday || 0)),
      ),
      dailyNewOrderDateKey: (daily.dailyNewOrderDateKey || '').slice(0, 10),
      // Persist up to 300 IDs in Firestore (dailyNewLimit max is 200) to keep doc compact
      dailyNewOrderIds: daily.dailyNewOrderIds.slice(0, 300),
    },
    activeSession: serializedSession,
    updatedAt: serverTimestamp(),
  };
}

function serializeCardDoc(
  userId: string,
  deckId: AnkiDeckId,
  cardState: AnkiSrsCardState,
) {
  const meta = ANKI_DECK_META[deckId];
  const state = resolveCardState(cardState);
  const clampedEase = Math.max(1.3, Math.min(4.0, Number(cardState.easeFactor) || 2.5));
  const clampedInterval = Math.max(
    0,
    Math.min(36500, Math.round(Number(cardState.intervalDays) || 0)),
  );
  const clampedReps = Math.max(
    0,
    Math.min(10000, Math.round(Number(cardState.repetitions) || 0)),
  );
  const clampedLapses = Math.max(
    0,
    Math.min(10000, Math.round(Number(cardState.lapses) || 0)),
  );
  const clampedStep = Math.max(
    0,
    Math.min(10, Math.round(Number(cardState.learningStepIndex) || 0)),
  );
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(cardState.dueDate)
    ? cardState.dueDate
    : getLocalDateKey();
  const dueAt = Math.max(
    0,
    Math.min(9999999999999, Math.round(Number(cardState.dueAt) || 0)),
  );
  const history = Array.isArray(cardState.reviewHistory)
    ? cardState.reviewHistory.slice(-50)
    : [];
  const prevSuspend = cardState.previousStateBeforeSuspend ?? '';
  const lastRating = history[history.length - 1]?.rating ?? 'good';

  return {
    userId,
    cardId: (cardState.cardId || '').slice(0, 200),
    deckId,
    category: meta.category,
    jlptLevel: meta.jlptLevel,
    state,
    previousStateBeforeSuspend: prevSuspend,
    easeFactor: Number(clampedEase.toFixed(2)),
    intervalDays: clampedInterval,
    repetitions: clampedReps,
    lapses: clampedLapses,
    learningStepIndex: clampedStep,
    dueDate,
    dueAt,
    lastReviewedAt: (cardState.lastReviewedAt || '').slice(0, 40),
    lastRating,
    isMastered: computeIsMastered({
      state,
      repetitions: clampedReps,
      intervalDays: clampedInterval,
      easeFactor: clampedEase,
    }),
    reviewHistory: history,
    updatedAt: serverTimestamp(),
  };
}

export interface RemoteAnkiSnapshot {
  srsMap: AnkiSrsMap;
  engine: StoredAnkiEngineState;
}

/**
 * Loads all persisted Anki deck states and card progress for the signed-in user from Firestore.
 * Uses `where('userId', '==', userId)` so Firestore list rules validate cleanly.
 */
export async function loadUserAnkiFromFirestore(
  userId: string,
): Promise<RemoteAnkiSnapshot | null> {
  if (!isValidAuthenticatedUid(userId)) return null;

  const decksPath = `users/${userId}/ankiDecks`;
  const cardsPath = `users/${userId}/ankiCards`;

  let decksSnap;
  try {
    decksSnap = await getDocs(
      query(collection(db, decksPath), where('userId', '==', userId)),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, decksPath);
  }

  let cardsSnap;
  try {
    cardsSnap = await getDocs(
      query(collection(db, cardsPath), where('userId', '==', userId)),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, cardsPath);
  }

  const engine = createEmptyAnkiEngineState();
    decksSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const deckId = data.deckId;
      if (!isValidAnkiDeckId(deckId)) return;

      if (data.settings && typeof data.settings === 'object') {
        engine.deckSettings[deckId] = sanitizeDeckSettings(deckId, data.settings);
      }
      if (data.daily && typeof data.daily === 'object') {
        engine.deckDaily[deckId] = {
          dateKey:
            typeof data.daily.dateKey === 'string'
              ? data.daily.dateKey
              : getLocalDateKey(),
          newCardIdsToday: Array.isArray(data.daily.newCardIdsToday)
            ? data.daily.newCardIdsToday
            : [],
          reviewedCardIdsToday: Array.isArray(data.daily.reviewedCardIdsToday)
            ? data.daily.reviewedCardIdsToday
            : [],
          reviewCompletionsToday: Number(data.daily.reviewCompletionsToday) || 0,
          extraReviewQuotaToday: Number(data.daily.extraReviewQuotaToday) || 0,
          dailyNewOrderDateKey:
            typeof data.daily.dailyNewOrderDateKey === 'string'
              ? data.daily.dailyNewOrderDateKey
              : '',
          dailyNewOrderIds: Array.isArray(data.daily.dailyNewOrderIds)
            ? data.daily.dailyNewOrderIds
            : [],
        };
      }
      if (data.activeSession && typeof data.activeSession === 'object') {
        engine.deckSessions[deckId] = data.activeSession as AnkiStudySession;
      } else {
        engine.deckSessions[deckId] = null;
      }
    });

    const srsMap: AnkiSrsMap = {};
    cardsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (typeof data.cardId !== 'string' || !data.cardId) return;
      const deckId = isValidAnkiDeckId(data.deckId) ? data.deckId : undefined;
      const parsedState =
        data.state === 'new' ||
        data.state === 'learning' ||
        data.state === 'review' ||
        data.state === 'relearning' ||
        data.state === 'suspended'
          ? data.state
          : 'new';
      srsMap[data.cardId] = {
        cardId: data.cardId,
        userId: typeof data.userId === 'string' ? data.userId : userId,
        deckId,
        category: data.category === 'bunpou' ? 'bunpou' : 'kosakata',
        jlptLevel: data.jlptLevel,
        state: parsedState,
        previousStateBeforeSuspend:
          data.previousStateBeforeSuspend === 'new' ||
          data.previousStateBeforeSuspend === 'learning' ||
          data.previousStateBeforeSuspend === 'review' ||
          data.previousStateBeforeSuspend === 'relearning'
            ? data.previousStateBeforeSuspend
            : undefined,
        easeFactor: Number(data.easeFactor) || 2.5,
        intervalDays: Number(data.intervalDays) || 0,
        repetitions: Number(data.repetitions) || 0,
        lapses: Number(data.lapses) || 0,
        learningStepIndex: Number(data.learningStepIndex) || 0,
        dueDate:
          typeof data.dueDate === 'string' ? data.dueDate : getLocalDateKey(),
        dueAt: Number(data.dueAt) || 0,
        lastReviewedAt:
          typeof data.lastReviewedAt === 'string' ? data.lastReviewedAt : '',
        isMastered: Boolean(data.isMastered),
        reviewHistory: Array.isArray(data.reviewHistory)
          ? (data.reviewHistory as AnkiReviewLogEntry[])
          : [],
      };
    });

    return { srsMap, engine };
}

/**
 * Merges remote Firestore Anki snapshot with local state without losing progress.
 * Newer `lastReviewedAt` wins for individual cards; newer `updatedAt` / today's dateKey wins for decks.
 */
export function mergeAnkiSnapshots(
  localSrs: AnkiSrsMap,
  localEngine: StoredAnkiEngineState,
  remote: RemoteAnkiSnapshot,
): { srsMap: AnkiSrsMap; engine: StoredAnkiEngineState } {
  const mergedSrs: AnkiSrsMap = { ...localSrs };
  for (const [cardId, remoteCard] of Object.entries(remote.srsMap)) {
    const localCard = mergedSrs[cardId];
    if (!localCard) {
      mergedSrs[cardId] = remoteCard;
      continue;
    }
    const localTs = Date.parse(localCard.lastReviewedAt || '') || 0;
    const remoteTs = Date.parse(remoteCard.lastReviewedAt || '') || 0;
    if (remoteTs >= localTs) {
      mergedSrs[cardId] = remoteCard;
    }
  }

  const mergedEngine: StoredAnkiEngineState = {
    deckSettings: {
      ...localEngine.deckSettings,
      ...remote.engine.deckSettings,
    },
    deckDaily: { ...localEngine.deckDaily },
    deckSessions: { ...localEngine.deckSessions },
  };

  for (const [deckKey, remoteDaily] of Object.entries(remote.engine.deckDaily)) {
    if (!isValidAnkiDeckId(deckKey) || !remoteDaily) continue;
    const localDaily = mergedEngine.deckDaily[deckKey];
    if (!localDaily || remoteDaily.dateKey > localDaily.dateKey) {
      mergedEngine.deckDaily[deckKey] = remoteDaily;
    } else if (remoteDaily.dateKey === localDaily.dateKey) {
      const mergedNewIds = Array.from(
        new Set([...localDaily.newCardIdsToday, ...remoteDaily.newCardIdsToday]),
      );
      const mergedReviewedIds = Array.from(
        new Set([
          ...localDaily.reviewedCardIdsToday,
          ...remoteDaily.reviewedCardIdsToday,
        ]),
      );
      mergedEngine.deckDaily[deckKey] = {
        ...localDaily,
        newCardIdsToday: mergedNewIds,
        reviewedCardIdsToday: mergedReviewedIds,
        reviewCompletionsToday: Math.max(
          localDaily.reviewCompletionsToday,
          remoteDaily.reviewCompletionsToday,
        ),
        extraReviewQuotaToday: Math.max(
          localDaily.extraReviewQuotaToday,
          remoteDaily.extraReviewQuotaToday,
        ),
        dailyNewOrderDateKey:
          localDaily.dailyNewOrderIds.length > 0
            ? localDaily.dailyNewOrderDateKey
            : remoteDaily.dailyNewOrderDateKey,
        dailyNewOrderIds:
          localDaily.dailyNewOrderIds.length > 0
            ? localDaily.dailyNewOrderIds
            : remoteDaily.dailyNewOrderIds,
      };
    }
  }

  for (const [deckKey, remoteSession] of Object.entries(
    remote.engine.deckSessions,
  )) {
    if (!isValidAnkiDeckId(deckKey)) continue;
    const localSession = mergedEngine.deckSessions[deckKey];
    if (!localSession && remoteSession) {
      mergedEngine.deckSessions[deckKey] = remoteSession;
    } else if (localSession && remoteSession) {
      const localTs = Date.parse(localSession.updatedAt || '') || 0;
      const remoteTs = Date.parse(remoteSession.updatedAt || '') || 0;
      if (remoteTs > localTs) {
        mergedEngine.deckSessions[deckKey] = remoteSession;
      }
    }
  }

  return { srsMap: mergedSrs, engine: mergedEngine };
}

/**
 * Atomically persists a card review + its parent deck state (settings, daily progress, session)
 * to Firestore using `writeBatch`.
 */
export async function saveAnkiReviewToFirestore(params: {
  userId: string;
  deckId: AnkiDeckId;
  cardState: AnkiSrsCardState;
  settings: AnkiDeckSettings;
  daily: AnkiDeckDailyProgress;
  activeSession: AnkiStudySession | null;
}): Promise<void> {
  if (!isValidAuthenticatedUid(params.userId)) return;

  const cardId = params.cardState.cardId;
  if (!cardId) return;

  const cardDocId = toAnkiCardDocId(params.deckId, cardId);
  const deckPath = `users/${params.userId}/ankiDecks/${params.deckId}`;
  const cardPath = `users/${params.userId}/ankiCards/${cardDocId}`;

  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, cardPath),
      serializeCardDoc(params.userId, params.deckId, params.cardState),
    );
    batch.set(
      doc(db, deckPath),
      serializeDeckDoc(
        params.userId,
        params.deckId,
        params.settings,
        params.daily,
        params.activeSession,
      ),
    );
    await batch.commit();
  } catch (error) {
    console.warn('Sinkronisasi review Anki ke Firestore tertunda:', error);
  }
}

/**
 * Persists a single deck's settings, daily quota, or interrupted session state to Firestore.
 */
export async function saveAnkiDeckStateToFirestore(params: {
  userId: string;
  deckId: AnkiDeckId;
  settings?: AnkiDeckSettings;
  daily?: AnkiDeckDailyProgress;
  activeSession: AnkiStudySession | null;
}): Promise<void> {
  if (!isValidAuthenticatedUid(params.userId)) return;

  const deckPath = `users/${params.userId}/ankiDecks/${params.deckId}`;
  try {
    await setDoc(
      doc(db, deckPath),
      serializeDeckDoc(
        params.userId,
        params.deckId,
        params.settings ?? getDefaultDeckSettings(params.deckId),
        params.daily ?? createEmptyDeckDailyProgress(),
        params.activeSession,
      ),
    );
  } catch (error) {
    console.warn('Sinkronisasi deck Anki ke Firestore tertunda:', error);
  }
}

/**
 * Removes a single card progress doc from Firestore (e.g. unsuspending an un-reviewed New card).
 */
export async function deleteAnkiCardFromFirestore(
  userId: string,
  deckId: AnkiDeckId,
  cardId: string,
): Promise<void> {
  if (!isValidAuthenticatedUid(userId) || !cardId) return;
  try {
    const cardDocId = toAnkiCardDocId(deckId, cardId);
    await deleteDoc(doc(db, `users/${userId}/ankiCards/${cardDocId}`));
  } catch (error) {
    console.warn('Penghapusan dokumen kartu Anki di Firestore tertunda:', error);
  }
}

/**
 * Deletes ONLY cards belonging to `deckId` in Firestore and resets that deck's daily/session state.
 * Never touches any other deck.
 */
export async function resetDeckProgressInFirestore(params: {
  userId: string;
  deckId: AnkiDeckId;
  cardIds: readonly string[];
  settings: AnkiDeckSettings;
}): Promise<void> {
  if (!isValidAuthenticatedUid(params.userId)) return;

  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < params.cardIds.length; i += CHUNK_SIZE) {
      const slice = params.cardIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const cardId of slice) {
        const cardDocId = toAnkiCardDocId(params.deckId, cardId);
        batch.delete(
          doc(db, `users/${params.userId}/ankiCards/${cardDocId}`),
        );
      }
      await batch.commit();
    }

    await saveAnkiDeckStateToFirestore({
      userId: params.userId,
      deckId: params.deckId,
      settings: params.settings,
      daily: createEmptyDeckDailyProgress(),
      activeSession: null,
    });
  } catch (error) {
    console.warn('Reset deck Anki di Firestore tertunda:', error);
  }
}
