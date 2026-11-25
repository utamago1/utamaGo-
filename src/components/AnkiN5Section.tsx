import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  History,
  Lock,
  PauseCircle,
  Play,
  PlayCircle,
  RotateCcw,
  RotateCw,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react';
import type { JlptLevel } from '../data/utamagoContent';
import {
  buildDeckStudyQueue,
  computeDeckStatistics,
  createOrResumeDeckSession,
  ensureDailyNewCardOrder,
  getDefaultDeckSettings,
  getEffectiveDeckSettings,
  getOrResetDeckDailyProgress,
  resolveAnkiDeckId,
  selectCardsForDeck,
  type AnkiDeckDailyProgress,
  type AnkiDeckSettings,
  type AnkiStudySession,
  type NewCardOrder,
  type ReviewCardOrder,
  type StoredAnkiEngineState,
} from '../utils/ankiEngine';
import {
  ANKI_CATEGORIES,
  filterAnkiCards,
  type AnkiCard,
  type AnkiCategoryGroup,
  type AnkiDeckCategory,
  type AnkiDeckId,
  type AnkiRating,
} from '../utils/ankiParser';
import {
  computeIsMastered,
  normalizeStepsMinutes,
  previewAnkiIntervalLabels,
  resolveCardState,
  type AnkiCardState,
  type AnkiSrsMap,
} from '../utils/ankiSrs';
import { formatBunpouFormulaInline } from '../utils/bunpouFormulaFormatter';
import {
  getBunpouGroupsForLevel,
  type BunpouDeckLevel,
  type BunpouN2GroupFilter,
} from '../utils/bunpouN2Parser';
import {
  vibrateError,
  vibrateMedium,
  vibrateSuccess,
  vibrateTap,
} from '../utils/haptics';
import {
  isJapaneseSpeechSupported,
  loadSpeechPreferences,
  prefetchJapaneseSpeechBatch,
  speakJapanese,
  stopJapaneseSpeech,
} from '../utils/japaneseSpeech';
import {
  isJlptLevelUnlocked,
  JLPT_LEVELS_ASC,
} from '../utils/levelProgression';
import { getLocalDateKey } from '../utils/studyAnalytics';
import {
  filterSavedItemsById,
  getStudyNoteEntry,
  getStudyNoteScopeForCardKind,
  loadStudyNotes,
  saveStudyNoteText,
  subscribeStudyNotes,
  toggleStudyBookmark,
  type StudyNotesStore,
} from '../utils/studyNotes';
import { extractKanjiCharacters } from '../utils/writingPractice';
import { BunpouFormula } from './BunpouFormula';
import { ConfirmDialog } from './ConfirmDialog';
import { BunpouExplanation } from './BunpouExplanation';
import { HighlightedJapaneseText } from './HighlightedJapaneseText';
import { RubyReading } from './RubyReading';
import { AnkiDeckSkeleton } from './SkeletonLoaders';
import { SpeechControlBar } from './SpeechControlBar';
import { StudyNotePanel } from './StudyNotePanel';

type AnkiMode = 'study' | 'browse' | 'options';
type StudyScope = 'due' | 'favorites' | 'all';

interface AnkiN5SectionProps {
  userId?: string;
  initialDeckId?: AnkiDeckId;
  deckOpenSignal?: number;
  closeModalSignal?: number;
  onStudyModalOpenChange?: (open: boolean) => void;
  unlockedLevel: JlptLevel;
  n5Cards: AnkiCard[];
  n4Cards: AnkiCard[];
  n3Cards: AnkiCard[];
  n2Cards: AnkiCard[];
  n1Cards: AnkiCard[];
  bunpouN5Cards: AnkiCard[];
  bunpouN4Cards: AnkiCard[];
  bunpouN3Cards: AnkiCard[];
  bunpouCards: AnkiCard[];
  bunpouN1Cards: AnkiCard[];
  deckStatus: 'loading' | 'ready' | 'fallback';
  ankiSrs: AnkiSrsMap;
  ankiEngine: StoredAnkiEngineState;
  onRateCard: (
    deckId: AnkiDeckId,
    card: AnkiCard,
    rating: AnkiRating,
    session: AnkiStudySession | null,
  ) => number;
  onUpdateDeckSettings: (
    deckId: AnkiDeckId,
    patch: Partial<AnkiDeckSettings>,
    applyGlobal?: boolean,
  ) => void;
  onResetDeckSettings: (deckId: AnkiDeckId) => void;
  onUpdateDeckDaily: (
    deckId: AnkiDeckId,
    daily: AnkiDeckDailyProgress,
  ) => void;
  onUpdateDeckSession: (
    deckId: AnkiDeckId,
    session: AnkiStudySession | null,
  ) => void;
  onExtendTodayReviewQuota: (deckId: AnkiDeckId, extraCount: number) => void;
  onToggleSuspendCard: (deckId: AnkiDeckId, card: AnkiCard) => void;
  onResetDeckProgress: (deckId: AnkiDeckId) => void;
  onOpenProfile?: () => void;
  onOpenWritingForWord?: (word: string) => void;
}

function isBunpouDeckId(id: AnkiDeckId): boolean {
  return id.endsWith('_BUNPOU');
}

function deckIdToLevel(id: AnkiDeckId): JlptLevel {
  return id.replace('_BUNPOU', '') as JlptLevel;
}

function formatCardStateLabel(state: AnkiCardState): string {
  switch (state) {
    case 'new':
      return 'Baru';
    case 'learning':
      return 'Belajar';
    case 'review':
      return 'Review';
    case 'relearning':
      return 'Ulang';
    case 'suspended':
      return 'Ditunda';
  }
}

function formatRatingLabel(rating: AnkiRating): string {
  switch (rating) {
    case 'again':
      return 'Lagi';
    case 'hard':
      return 'Sulit';
    case 'good':
      return 'Bagus';
    case 'easy':
      return 'Mudah';
  }
}

function parseStepsInput(input: string, fallback: number[]): number[] {
  const nums = input
    .split(/[\s,;]+/)
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return normalizeStepsMinutes(nums, fallback);
}

const SWIPE_THRESHOLD = 75;
const SWIPE_VELOCITY_THRESHOLD = 360;

export function AnkiN5Section({
  initialDeckId = 'N5',
  deckOpenSignal = 0,
  closeModalSignal = 0,
  onStudyModalOpenChange,
  unlockedLevel,
  n5Cards,
  n4Cards,
  n3Cards,
  n2Cards,
  n1Cards,
  bunpouN5Cards,
  bunpouN4Cards,
  bunpouN3Cards,
  bunpouCards,
  bunpouN1Cards,
  deckStatus,
  ankiSrs,
  ankiEngine,
  onRateCard,
  onUpdateDeckSettings,
  onResetDeckSettings,
  onUpdateDeckDaily,
  onUpdateDeckSession,
  onExtendTodayReviewQuota,
  onToggleSuspendCard,
  onResetDeckProgress,
  onOpenProfile,
  onOpenWritingForWord,
}: AnkiN5SectionProps) {
  const [deckCategory, setDeckCategory] = useState<AnkiDeckCategory>(() =>
    isBunpouDeckId(initialDeckId) ? 'bunpou' : 'kosakata',
  );
  const [selectedKosakataLevel, setSelectedKosakataLevel] = useState<JlptLevel>(
    () => {
      const lvl = deckIdToLevel(initialDeckId);
      return !isBunpouDeckId(initialDeckId) &&
        isJlptLevelUnlocked(lvl, unlockedLevel)
        ? lvl
        : 'N5';
    },
  );
  const [selectedBunpouLevel, setSelectedBunpouLevel] = useState<JlptLevel>(() => {
    if (isBunpouDeckId(initialDeckId)) {
      return deckIdToLevel(initialDeckId);
    }
    return unlockedLevel;
  });
  const [mode, setMode] = useState<AnkiMode>('study');
  const [studyScope, setStudyScope] = useState<StudyScope>('due');
  const [category, setCategory] = useState<AnkiCategoryGroup>('Semua');
  const [bunpouGroup, setBunpouGroup] =
    useState<BunpouN2GroupFilter>('Semua');
  const [bunpouLesson, setBunpouLesson] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [browseFavoritesOnly, setBrowseFavoritesOnly] = useState(false);
  const [studyNotes, setStudyNotes] = useState<StudyNotesStore>(() =>
    loadStudyNotes(),
  );
  const [visibleBrowseCount, setVisibleBrowseCount] = useState(20);
  const [expandedHistoryCardId, setExpandedHistoryCardId] = useState<
    string | null
  >(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmGlobalApplyOpen, setConfirmGlobalApplyOpen] = useState(false);
  const [studyModalOpen, setStudyModalOpen] = useState(false);
  const [browsePreviewSession, setBrowsePreviewSession] =
    useState<AnkiStudySession | null>(null);
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [xpNotice, setXpNotice] = useState<{
    key: number;
    amount: number;
  } | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    return subscribeStudyNotes(setStudyNotes);
  }, []);

  const canSpeakJapanese = isJapaneseSpeechSupported();

  const onStudyModalOpenChangeRef = useRef(onStudyModalOpenChange);
  onStudyModalOpenChangeRef.current = onStudyModalOpenChange;
  const studyModalOpenRef = useRef(studyModalOpen);
  studyModalOpenRef.current = studyModalOpen;

  const setPopupOpen = useCallback((open: boolean) => {
    if (!open) {
      stopJapaneseSpeech();
      setBrowsePreviewSession(null);
    }
    setStudyModalOpen(open);
    onStudyModalOpenChangeRef.current?.(open);
  }, []);

  const handledCloseSignalRef = useRef(closeModalSignal);

  useEffect(() => {
    if (closeModalSignal === handledCloseSignalRef.current) return;
    handledCloseSignalRef.current = closeModalSignal;
    if (studyModalOpenRef.current) {
      stopJapaneseSpeech();
      setStudyModalOpen(false);
      setBrowsePreviewSession(null);
    }
  }, [closeModalSignal]);

  useEffect(() => {
    return () => {
      if (studyModalOpenRef.current) {
        onStudyModalOpenChangeRef.current?.(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!studyModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopupOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [studyModalOpen, setPopupOpen]);

  useEffect(() => {
    if (deckOpenSignal > 0) {
      if (isBunpouDeckId(initialDeckId)) {
        setDeckCategory('bunpou');
        setSelectedBunpouLevel(deckIdToLevel(initialDeckId));
        setBunpouGroup('Semua');
        setBunpouLesson('all');
      } else {
        const lvl = deckIdToLevel(initialDeckId);
        setDeckCategory('kosakata');
        setSelectedKosakataLevel(
          isJlptLevelUnlocked(lvl, unlockedLevel) ? lvl : 'N5',
        );
      }
      setMode('study');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckOpenSignal]);

  const activeJlptLevel =
    deckCategory === 'kosakata' ? selectedKosakataLevel : selectedBunpouLevel;

  const deckId: AnkiDeckId = resolveAnkiDeckId(deckCategory, activeJlptLevel);
  const isBunpouDeck = deckCategory === 'bunpou';

  const isSelectedLevelUnlocked = isJlptLevelUnlocked(
    activeJlptLevel,
    unlockedLevel,
  );

  const activeBunpouLevel: BunpouDeckLevel = activeJlptLevel;

  const rawDeckCards = useMemo(() => {
    switch (deckId) {
      case 'N5':
        return n5Cards;
      case 'N4':
        return n4Cards;
      case 'N3':
        return n3Cards;
      case 'N2':
        return n2Cards;
      case 'N1':
        return n1Cards;
      case 'N5_BUNPOU':
        return bunpouN5Cards;
      case 'N4_BUNPOU':
        return bunpouN4Cards;
      case 'N3_BUNPOU':
        return bunpouN3Cards;
      case 'N2_BUNPOU':
        return bunpouCards;
      case 'N1_BUNPOU':
        return bunpouN1Cards;
      default:
        return [];
    }
  }, [
    deckId,
    n5Cards,
    n4Cards,
    n3Cards,
    n2Cards,
    n1Cards,
    bunpouN5Cards,
    bunpouN4Cards,
    bunpouN3Cards,
    bunpouCards,
    bunpouN1Cards,
  ]);

  // Strict data-layer isolation: only cards matching exact Category + JLPT Level
  const activeDeckCards = useMemo(
    () => selectCardsForDeck(deckId, rawDeckCards),
    [deckId, rawDeckCards],
  );

  const cardById = useMemo(() => {
    const map = new Map<string, AnkiCard>();
    for (const card of activeDeckCards) {
      map.set(card.id, card);
    }
    return map;
  }, [activeDeckCards]);

  const activeDeckLabel =
    deckCategory === 'bunpou'
      ? `Bunpou JLPT ${activeJlptLevel}`
      : `Kosakata JLPT ${activeJlptLevel}`;

  // Per-deck independent settings, daily progress, and persisted session
  const deckSettings = useMemo(
    () => getEffectiveDeckSettings(ankiEngine, deckId),
    [ankiEngine, deckId],
  );

  const todayKey = useMemo(() => getLocalDateKey(new Date(nowMs)), [nowMs]);

  const deckDaily = useMemo(
    () => getOrResetDeckDailyProgress(ankiEngine.deckDaily[deckId], todayKey),
    [ankiEngine.deckDaily, deckId, todayKey],
  );

  const persistedSession = ankiEngine.deckSessions[deckId] ?? null;

  // Local text drafts for learning/relearning step inputs (synced per deck)
  const [learningStepsText, setLearningStepsText] = useState(() =>
    deckSettings.learningStepsMinutes.join(', '),
  );
  const [relearningStepsText, setRelearningStepsText] = useState(() =>
    deckSettings.relearningStepsMinutes.join(', '),
  );

  useEffect(() => {
    setLearningStepsText(deckSettings.learningStepsMinutes.join(', '));
    setRelearningStepsText(deckSettings.relearningStepsMinutes.join(', '));
  }, [
    deckId,
    deckSettings.learningStepsMinutes,
    deckSettings.relearningStepsMinutes,
  ]);

  // Reset deck-local UI browse state when deck changes (never leaks filters across decks)
  useEffect(() => {
    setVisibleBrowseCount(20);
    setExpandedHistoryCardId(null);
    setBrowseFavoritesOnly(false);
    setIsFlipped(false);
    setBrowsePreviewSession(null);
    setSessionReviewedCount(0);
  }, [deckId]);

  // Persist stable Fisher-Yates daily New-card order once per deck per local day
  useEffect(() => {
    if (activeDeckCards.length === 0) return;
    if (
      deckDaily.dailyNewOrderDateKey === todayKey &&
      deckDaily.dailyNewOrderIds.length > 0
    ) {
      return;
    }
    const initialized = ensureDailyNewCardOrder(
      deckId,
      activeDeckCards,
      ankiSrs,
      ankiEngine.deckDaily[deckId],
      todayKey,
    );
    if (initialized.dailyNewOrderIds.length > 0) {
      onUpdateDeckDaily(deckId, initialized);
    }
  }, [
    activeDeckCards,
    ankiEngine.deckDaily,
    ankiSrs,
    deckDaily.dailyNewOrderDateKey,
    deckDaily.dailyNewOrderIds.length,
    deckId,
    onUpdateDeckDaily,
    todayKey,
  ]);

  const activeBunpouGroups = useMemo(
    () =>
      isBunpouDeck
        ? getBunpouGroupsForLevel(activeBunpouLevel, activeDeckCards.length)
        : [],
    [isBunpouDeck, activeBunpouLevel, activeDeckCards.length],
  );

  const bunpouLessons = useMemo(() => {
    if (!isBunpouDeck) return [];
    const map = new Map<number, string>();
    activeDeckCards.forEach((card) => {
      if (bunpouGroup !== 'Semua' && card.groupId !== bunpouGroup) {
        return;
      }
      if (card.lessonNumber && !map.has(card.lessonNumber)) {
        map.set(
          card.lessonNumber,
          card.lessonTitle ?? `${card.lessonNumber}課`,
        );
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([num, title]) => ({ num, title }));
  }, [isBunpouDeck, activeDeckCards, bunpouGroup]);

  const filterCardsForActiveDeck = useCallback(
    (
      cards: AnkiCard[],
      query: string,
      nextCat: AnkiCategoryGroup,
      nextGroup: BunpouN2GroupFilter,
      nextLesson: number | 'all',
    ): AnkiCard[] => {
      if (!isBunpouDeck) {
        return filterAnkiCards(cards, query, nextCat);
      }

      const baseFiltered = filterAnkiCards(cards, query, 'Semua');
      return baseFiltered.filter((card) => {
        if (nextGroup !== 'Semua' && card.groupId !== nextGroup) {
          return false;
        }
        if (nextLesson !== 'all' && card.lessonNumber !== nextLesson) {
          return false;
        }
        return true;
      });
    },
    [isBunpouDeck],
  );

  const filteredStudyCards = useMemo(
    () =>
      filterCardsForActiveDeck(
        activeDeckCards,
        '',
        category,
        bunpouGroup,
        bunpouLesson,
      ),
    [activeDeckCards, bunpouGroup, bunpouLesson, category, filterCardsForActiveDeck],
  );

  const deckNoteScope = getStudyNoteScopeForCardKind(
    isBunpouDeck ? 'bunpou' : 'vocab',
  );

  const favoriteStudyCards = useMemo(
    () => filterSavedItemsById(filteredStudyCards, studyNotes, deckNoteScope),
    [deckNoteScope, filteredStudyCards, studyNotes],
  );

  const deckFavoritesCount = useMemo(
    () => filterSavedItemsById(activeDeckCards, studyNotes, deckNoteScope).length,
    [activeDeckCards, deckNoteScope, studyNotes],
  );

  const filteredBrowseCards = useMemo(() => {
    const base = filterCardsForActiveDeck(
      activeDeckCards,
      mode === 'browse' ? searchQuery : '',
      category,
      bunpouGroup,
      bunpouLesson,
    );
    if (!browseFavoritesOnly) return base;
    return filterSavedItemsById(base, studyNotes, deckNoteScope);
  }, [
    activeDeckCards,
    browseFavoritesOnly,
    bunpouGroup,
    bunpouLesson,
    category,
    deckNoteScope,
    filterCardsForActiveDeck,
    mode,
    searchQuery,
    studyNotes,
  ]);

  // Full per-deck statistics (invariant: new + learning + review + relearning + suspended === totalCards)
  const deckStats = useMemo(
    () =>
      computeDeckStatistics(
        deckId,
        activeDeckCards,
        ankiSrs,
        deckSettings,
        deckDaily,
        nowMs,
      ),
    [activeDeckCards, ankiSrs, deckDaily, deckId, deckSettings, nowMs],
  );

  // Filtered queue preview for Tempo vs Semua
  const filteredQueueResult = useMemo(
    () =>
      buildDeckStudyQueue(
        deckId,
        filteredStudyCards,
        ankiSrs,
        deckSettings,
        deckDaily,
        nowMs,
      ),
    [ankiSrs, deckDaily, deckId, deckSettings, filteredStudyCards, nowMs],
  );

  // Auto-tick timer: wakes up when next Learning/Relearning card matures OR at local 00:00 midnight
  useEffect(() => {
    const now = Date.now();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 1, 0);
    let delayMs = Math.max(1_000, nextMidnight.getTime() - now);

    if (deckStats.nextLearningDueAt && deckStats.nextLearningDueAt > now) {
      delayMs = Math.min(delayMs, Math.max(1_000, deckStats.nextLearningDueAt - now + 350));
    }

    // Cap single setTimeout to 15 minutes to avoid browser timer drift
    const cappedDelay = Math.min(delayMs, 15 * 60 * 1000);
    const timer = window.setTimeout(() => {
      setNowMs(Date.now());
    }, cappedDelay);
    return () => window.clearTimeout(timer);
  }, [deckStats.nextLearningDueAt, nowMs]);

  // Check if active deck has an unfinished persisted session that can be resumed
  const resumableSessionInfo = useMemo(() => {
    if (
      studyScope === 'favorites' ||
      !deckSettings.resumeInterruptedSession ||
      !persistedSession ||
      persistedSession.deckId !== deckId ||
      persistedSession.scope !== studyScope ||
      persistedSession.dateKey !== todayKey
    ) {
      return null;
    }
    const completedSet = new Set(persistedSession.completedCardIds);
    const remainingIds = persistedSession.queueCardIds.filter(
      (id) => cardById.has(id) && !completedSet.has(id),
    );
    if (remainingIds.length === 0) return null;
    return {
      totalCount: persistedSession.queueCardIds.length,
      completedCount: persistedSession.completedCardIds.length,
      remainingCount: remainingIds.length,
    };
  }, [
    cardById,
    deckId,
    deckSettings.resumeInterruptedSession,
    persistedSession,
    studyScope,
    todayKey,
  ]);

  // Active modal session: either a non-destructive Browse preview OR the deck's persisted session
  const activeModalSession: AnkiStudySession | null =
    browsePreviewSession ?? persistedSession;

  const activeCard: AnkiCard | undefined = useMemo(() => {
    if (!activeModalSession || activeModalSession.queueCardIds.length === 0) {
      return undefined;
    }
    const idx = Math.max(
      0,
      Math.min(
        activeModalSession.currentIndex,
        activeModalSession.queueCardIds.length - 1,
      ),
    );
    const id = activeModalSession.queueCardIds[idx];
    return id ? cardById.get(id) : undefined;
  }, [activeModalSession, cardById]);

  // Close popup automatically when persisted session completes (becomes null)
  useEffect(() => {
    if (studyModalOpen && !activeModalSession) {
      setPopupOpen(false);
    }
  }, [activeModalSession, setPopupOpen, studyModalOpen]);

  // Proactively pre-warm TTS cache for the active Anki card (word + first example)
  // and the next card in queue so tapping Dengar is instantaneous
  useEffect(() => {
    if (!studyModalOpen || !activeCard || !canSpeakJapanese) return;
    const nextIdx = activeModalSession
      ? activeModalSession.currentIndex + 1
      : -1;
    const nextCardId =
      activeModalSession &&
      nextIdx >= 0 &&
      nextIdx < activeModalSession.queueCardIds.length
        ? activeModalSession.queueCardIds[nextIdx]
        : null;
    const nextCard = nextCardId ? cardById.get(nextCardId) : undefined;

    const timer = window.setTimeout(() => {
      prefetchJapaneseSpeechBatch([
        activeCard.word,
        activeCard.examples[0]?.jp,
        nextCard?.word,
      ]);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [
    activeCard,
    activeModalSession,
    canSpeakJapanese,
    cardById,
    studyModalOpen,
  ]);

  // Auto-play pronunciation when user enables autoPlayAnki preference
  useEffect(() => {
    if (!studyModalOpen || !activeCard || !canSpeakJapanese) return;
    const prefs = loadSpeechPreferences();
    if (!prefs.autoPlayAnki) return;
    const timer = window.setTimeout(() => {
      speakJapanese(activeCard.word);
    }, 180);
    return () => {
      window.clearTimeout(timer);
      stopJapaneseSpeech();
    };
  }, [activeCard?.id, activeCard?.word, canSpeakJapanese, studyModalOpen]);

  const dragX = useMotionValue(0);
  const cardRotate = useTransform(dragX, [-180, 0, 180], [-6, 0, 6]);
  const cardOpacity = useTransform(
    dragX,
    [-220, -85, 0, 85, 220],
    [0.72, 0.96, 1, 0.96, 0.72],
  );
  const rightHintOpacity = useTransform(dragX, [16, SWIPE_THRESHOLD], [0, 1]);
  const leftHintOpacity = useTransform(dragX, [-SWIPE_THRESHOLD, -16], [1, 0]);

  const intervalLabels = useMemo(
    () =>
      activeCard
        ? previewAnkiIntervalLabels(ankiSrs[activeCard.id], {
            targetRetention: deckSettings.targetRetention,
            learningStepsMinutes: deckSettings.learningStepsMinutes,
            relearningStepsMinutes: deckSettings.relearningStepsMinutes,
          })
        : { again: '1 mnt', hard: '1 mnt', good: '10 mnt', easy: '4 hari' },
    [activeCard, ankiSrs, deckSettings],
  );

  const readyCountForScope =
    studyScope === 'due'
      ? resumableSessionInfo
        ? resumableSessionInfo.remainingCount
        : filteredQueueResult.queueCards.length
      : studyScope === 'favorites'
        ? favoriteStudyCards.length
        : filteredStudyCards.length;

  const handleOpenFavoriteStudyPopup = (cardsOverride?: AnkiCard[]) => {
    vibrateTap();
    const targetCards = cardsOverride ?? favoriteStudyCards;
    if (targetCards.length === 0) return;

    const now = Date.now();
    setNowMs(now);
    setBrowsePreviewSession({
      sessionId: `favorites_${deckId}_${now}`,
      deckId,
      scope: 'all',
      dateKey: getLocalDateKey(new Date(now)),
      queueCardIds: targetCards.map((c) => c.id),
      currentIndex: 0,
      completedCardIds: [],
      startedAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    });
    setIsFlipped(false);
    dragX.set(0);
    setPopupOpen(true);
  };

  const handleOpenStudyPopup = (
    scopeOverride?: StudyScope,
    options?: { forceNew?: boolean },
  ) => {
    vibrateTap();
    const targetScope = scopeOverride ?? studyScope;
    if (scopeOverride && scopeOverride !== studyScope) {
      setStudyScope(scopeOverride);
    }

    if (targetScope === 'favorites') {
      handleOpenFavoriteStudyPopup();
      return;
    }

    const now = Date.now();
    setNowMs(now);

    const { session, daily } = createOrResumeDeckSession({
      deckId,
      scope: targetScope,
      filteredDeckCards: filteredStudyCards,
      allDeckCards: activeDeckCards,
      srsMap: ankiSrs,
      settings: deckSettings,
      daily: deckDaily,
      existingSession: persistedSession,
      nowMs: now,
      forceNew: options?.forceNew,
    });

    if (daily.dailyNewOrderIds.length > 0) {
      onUpdateDeckDaily(deckId, daily);
    }

    if (session.queueCardIds.length === 0) {
      return;
    }

    setBrowsePreviewSession(null);
    onUpdateDeckSession(deckId, session);
    setIsFlipped(false);
    dragX.set(0);
    setPopupOpen(true);
  };

  const handleSelectBrowseCard = (card: AnkiCard) => {
    vibrateTap();
    const now = Date.now();
    const queueIds = filteredBrowseCards.some((c) => c.id === card.id)
      ? filteredBrowseCards.map((c) => c.id)
      : activeDeckCards.map((c) => c.id);
    const startIdx = Math.max(0, queueIds.indexOf(card.id));

    // Open in non-destructive browse preview so any paused Tempo session is preserved
    setBrowsePreviewSession({
      sessionId: `browse_${deckId}_${now}`,
      deckId,
      scope: 'all',
      dateKey: getLocalDateKey(new Date(now)),
      queueCardIds: queueIds,
      currentIndex: startIdx,
      completedCardIds: [],
      startedAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    });
    setIsFlipped(false);
    dragX.set(0);
    setPopupOpen(true);
  };

  const handleRateCard = (rating: AnkiRating) => {
    if (!activeCard || !activeModalSession) return;

    if (rating === 'again') {
      vibrateError();
    } else if (rating === 'good' || rating === 'easy') {
      vibrateSuccess();
    } else {
      vibrateTap();
    }

    stopJapaneseSpeech();
    setIsFlipped(false);
    dragX.set(0);
    setNowMs(Date.now());

    if (browsePreviewSession) {
      const gainedXp = onRateCard(deckId, activeCard, rating, null);
      if (gainedXp > 0) {
        setXpNotice({ key: Date.now(), amount: gainedXp });
      }
      setSessionReviewedCount((prev) => prev + 1);
      const nextIdx = browsePreviewSession.currentIndex + 1;
      if (nextIdx >= browsePreviewSession.queueCardIds.length) {
        setPopupOpen(false);
      } else {
        setBrowsePreviewSession({
          ...browsePreviewSession,
          currentIndex: nextIdx,
          completedCardIds: [
            ...browsePreviewSession.completedCardIds,
            activeCard.id,
          ],
          updatedAt: new Date().toISOString(),
        });
      }
      return;
    }

    const gainedXp = onRateCard(deckId, activeCard, rating, activeModalSession);
    if (gainedXp > 0) {
      setXpNotice({ key: Date.now(), amount: gainedXp });
    }
    setSessionReviewedCount((prev) => prev + 1);
  };

  const handleStep = (delta: -1 | 1) => {
    if (!activeModalSession || activeModalSession.queueCardIds.length === 0) {
      return;
    }
    vibrateTap();
    stopJapaneseSpeech();
    setIsFlipped(false);
    dragX.set(0);

    const len = activeModalSession.queueCardIds.length;
    const nextIndex = (activeModalSession.currentIndex + delta + len) % len;
    const updatedSession: AnkiStudySession = {
      ...activeModalSession,
      currentIndex: nextIndex,
      updatedAt: new Date().toISOString(),
    };

    if (browsePreviewSession) {
      setBrowsePreviewSession(updatedSession);
    } else {
      onUpdateDeckSession(deckId, updatedSession);
    }
  };

  const handleConfirmResetDeck = () => {
    vibrateTap();
    onResetDeckProgress(deckId);
    setConfirmResetOpen(false);
    setBrowsePreviewSession(null);
    setIsFlipped(false);
    setXpNotice(null);
    setSessionReviewedCount(0);
  };

  const handleToggleNewCardOrder = () => {
    vibrateTap();
    const nextOrder: NewCardOrder =
      deckSettings.newCardOrder === 'random' ? 'sequential' : 'random';
    onUpdateDeckSettings(deckId, { newCardOrder: nextOrder }, false);
  };

  const visibleCards = filteredBrowseCards.slice(0, visibleBrowseCount);

  const activeFilterSummary = isBunpouDeck
    ? bunpouLesson !== 'all'
      ? (bunpouLessons.find((l) => l.num === bunpouLesson)?.title ??
        `Bab ${bunpouLesson}課`)
      : bunpouGroup !== 'Semua'
        ? (activeBunpouGroups.find((g) => g.id === bunpouGroup)?.shortLabel ??
          bunpouGroup)
        : null
    : category !== 'Semua'
      ? category
      : null;

  const waitingMinutes = useMemo(() => {
    if (!deckStats.nextLearningDueAt) return null;
    const diffMs = Math.max(0, deckStats.nextLearningDueAt - nowMs);
    return Math.max(1, Math.ceil(diffMs / 60_000));
  }, [deckStats.nextLearningDueAt, nowMs]);

  const activeCardRecord = activeCard ? ankiSrs[activeCard.id] : undefined;
  const activeCardState = resolveCardState(activeCardRecord);
  const activeCardMastered =
    activeCardRecord &&
    computeIsMastered({
      state: activeCardState,
      repetitions: activeCardRecord.repetitions,
      intervalDays: activeCardRecord.intervalDays,
      easeFactor: activeCardRecord.easeFactor,
    });

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Langkah 1 & 2: Pilih Kategori -> Pilih Level */}
      <header className="w-full min-w-0 space-y-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] font-bold tracking-wide text-primary">
              Flashcard Kosakata &amp; Tata Bahasa
            </p>
            <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-on-surface sm:text-2xl">
              Anki {deckCategory === 'kosakata' ? 'Kosakata' : 'Bunpou'}
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Pilih Kategori Deck Anki"
            className="grid w-full grid-cols-[repeat(2,minmax(0,1fr))] gap-2 rounded-2xl bg-surface-container p-1 sm:inline-flex sm:w-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={deckCategory === 'kosakata'}
              onClick={() => {
                vibrateTap();
                setDeckCategory('kosakata');
              }}
              className={`m3-tactile min-h-[44px] min-w-0 whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-bold transition-colors sm:min-w-[120px] ${
                deckCategory === 'kosakata'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
              }`}
            >
              1. Kosakata
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={deckCategory === 'bunpou'}
              onClick={() => {
                vibrateTap();
                setDeckCategory('bunpou');
              }}
              className={`m3-tactile min-h-[44px] min-w-0 whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-bold transition-colors sm:min-w-[120px] ${
                deckCategory === 'bunpou'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
              }`}
            >
              2. Bunpou
            </button>
          </div>
        </div>

        {/* Pilihan Level JLPT yang besar dan mudah disentuh di HP */}
        <div className="min-w-0 space-y-2">
          <p className="text-[13px] font-semibold text-[#4b4b53] dark:text-[#b4b4c0]">
            Pilih Level {deckCategory === 'kosakata' ? 'Kosakata' : 'Bunpou'}:
          </p>
          <div
            role="tablist"
            aria-label={`Pilih Level JLPT untuk ${deckCategory === 'kosakata' ? 'Kosakata' : 'Bunpou'}`}
            className="grid w-full grid-cols-[repeat(5,minmax(0,1fr))] gap-2"
          >
            {JLPT_LEVELS_ASC.map((lvl) => {
              const isSelected = activeJlptLevel === lvl;
              const levelAvailable = true;
              const levelUnlocked = isJlptLevelUnlocked(lvl, unlockedLevel);
              const cardCount =
                deckCategory === 'kosakata'
                  ? lvl === 'N5'
                    ? n5Cards.length
                    : lvl === 'N4'
                      ? n4Cards.length
                      : lvl === 'N3'
                        ? n3Cards.length
                        : lvl === 'N2'
                          ? n2Cards.length
                          : n1Cards.length
                  : lvl === 'N5'
                    ? bunpouN5Cards.length
                    : lvl === 'N4'
                      ? bunpouN4Cards.length
                      : lvl === 'N3'
                        ? bunpouN3Cards.length
                        : lvl === 'N2'
                          ? bunpouCards.length
                          : bunpouN1Cards.length;

              return (
                <button
                  key={lvl}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    vibrateTap();
                    if (deckCategory === 'kosakata') {
                      setSelectedKosakataLevel(lvl);
                    } else {
                      setSelectedBunpouLevel(lvl);
                      setBunpouGroup('Semua');
                      setBunpouLesson('all');
                    }
                  }}
                  className={`m3-tactile flex min-h-[54px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary text-on-primary shadow-xs'
                      : levelAvailable && levelUnlocked
                        ? 'border-outline-variant bg-surface-container-low text-on-surface hover:border-outline'
                        : 'border-outline-variant bg-surface-container/50 text-[#4b4b53] hover:border-outline dark:text-[#b4b4c0]'
                  }`}
                >
                  <span className="flex items-center gap-1 font-mono text-xs font-extrabold sm:text-sm">
                    {levelAvailable && !levelUnlocked && (
                      <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                    )}
                    <span>{lvl}</span>
                  </span>
                  <span
                    className={`truncate font-mono text-[11px] font-semibold tabular-nums ${
                      isSelected
                        ? 'text-on-primary/90'
                        : 'text-[#4b4b53] dark:text-[#b4b4c0]'
                    }`}
                  >
                    {cardCount !== null ? `${cardCount}` : 'Segera'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {!isSelectedLevelUnlocked ? (
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-center sm:p-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-primary">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-display text-lg font-extrabold text-on-surface sm:text-xl">
            Deck {activeDeckLabel} Terkunci
          </h3>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0] sm:text-sm">
            Level kamu saat ini masih{' '}
            <strong className="text-on-surface">JLPT {unlockedLevel}</strong>.
            Ubah ke minimal{' '}
            <strong className="text-on-surface">JLPT {activeJlptLevel}</strong>{' '}
            di Profil untuk membuka deck ini.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {onOpenProfile && (
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  onOpenProfile();
                }}
                className="m3-tactile inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover"
              >
                Atur ke {activeJlptLevel} di Profil
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                setDeckCategory('kosakata');
                setSelectedKosakataLevel('N5');
              }}
              className="m3-tactile inline-flex min-h-[44px] items-center justify-center rounded-xl border border-outline px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container"
            >
              Latih Kosakata N5
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full min-w-0 space-y-4">
          <div
            role="tablist"
            aria-label="Sub-menu Mode Anki"
            className="grid w-full grid-cols-[repeat(3,minmax(0,1fr))] border-b border-outline-variant"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'study'}
              onClick={() => {
                vibrateTap();
                setMode('study');
              }}
              className={`relative min-h-[44px] min-w-0 whitespace-nowrap px-1 pb-2.5 text-center text-[13px] sm:text-sm ${
                mode === 'study'
                  ? 'font-bold text-on-surface'
                  : 'font-medium text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
              }`}
            >
              <span>Mulai Belajar</span>
              {mode === 'study' && (
                <span
                  aria-hidden="true"
                  className="absolute right-2 bottom-0 left-2 h-0.5 bg-primary"
                />
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'browse'}
              onClick={() => {
                vibrateTap();
                setMode('browse');
              }}
              className={`relative min-h-[44px] min-w-0 whitespace-nowrap px-1 pb-2.5 text-center text-[13px] sm:text-sm ${
                mode === 'browse'
                  ? 'font-bold text-on-surface'
                  : 'font-medium text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
              }`}
            >
              <span>Daftar &amp; Cari</span>
              {mode === 'browse' && (
                <span
                  aria-hidden="true"
                  className="absolute right-2 bottom-0 left-2 h-0.5 bg-primary"
                />
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'options'}
              onClick={() => {
                vibrateTap();
                setMode('options');
              }}
              className={`relative min-h-[44px] min-w-0 whitespace-nowrap px-1 pb-2.5 text-center text-[13px] sm:text-sm ${
                mode === 'options'
                  ? 'font-bold text-on-surface'
                  : 'font-medium text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
              }`}
            >
              <span>Filter &amp; Opsi</span>
              {mode === 'options' && (
                <span
                  aria-hidden="true"
                  className="absolute right-2 bottom-0 left-2 h-0.5 bg-primary"
                />
              )}
            </button>
          </div>

          {mode === 'study' &&
            deckStatus === 'loading' &&
            activeDeckCards.length <= 20 && <AnkiDeckSkeleton />}

          {mode === 'study' && (
            <div className="mx-auto w-full max-w-2xl min-w-0 space-y-4">
              <section className="w-full min-w-0 rounded-2xl border border-outline-variant bg-surface-container-low p-4 shadow-xs sm:p-6">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-primary">
                      {activeDeckLabel} · Kuota Baru{' '}
                      <span className="font-mono tabular-nums">
                        {deckStats.newStudiedTodayCount}/
                        {deckSettings.dailyNewLimit}
                      </span>{' '}
                      hari ini
                    </p>
                    <h3 className="mt-1 font-display text-xl font-extrabold text-on-surface sm:text-2xl">
                      {readyCountForScope === 0 && studyScope === 'due'
                        ? deckStats.waitingLearningCount > 0
                          ? 'Menunggu Langkah Belajar'
                          : 'Target Hari Ini Selesai'
                        : `${readyCountForScope} Kartu Siap Dipelajari`}
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0] sm:text-sm">
                      {studyScope === 'due'
                        ? `Urutan prioritas: Ulang (${filteredQueueResult.dueRelearningCards.length}) · Belajar (${filteredQueueResult.dueLearningCards.length}) · Review (${filteredQueueResult.dueReviewCards.length}) · Baru (${filteredQueueResult.availableNewCards.length}).`
                        : 'Mode Semua menampilkan seluruh kartu di deck ini tanpa mengubah jadwal jatuh tempo sampai kamu memberi nilai.'}
                    </p>
                  </div>

                  {xpNotice && (
                    <span
                      key={xpNotice.key}
                      aria-live="polite"
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-warning-container px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-on-warning-container"
                    >
                      <Zap
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-500"
                        aria-hidden="true"
                      />
                      +{xpNotice.amount} XP
                    </span>
                  )}
                </div>

                {/* Progress bar ringkas (Progres Hafalan tidak menghitung kartu Baru) */}
                <div className="mt-4 space-y-2 border-t border-outline-variant pt-4">
                  <div className="flex items-center justify-between gap-2 text-[13px] font-semibold">
                    <span className="text-[#4b4b53] dark:text-[#b4b4c0]">
                      Progres Hafalan
                    </span>
                    <span className="font-mono font-bold tabular-nums text-primary">
                      {deckStats.learnedCount}/{deckStats.totalCards} kartu (
                      {deckStats.progressPercent}%)
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
                    role="progressbar"
                    aria-valuenow={deckStats.progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progres ${activeDeckLabel}`}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${deckStats.progressPercent}%` }}
                    />
                  </div>

                  {/* Ringkasan status 5 state + Mastered + metrik deck independen */}
                  <div className="grid w-full grid-cols-[repeat(3,minmax(0,1fr))] gap-2 pt-3 text-xs sm:grid-cols-[repeat(6,minmax(0,1fr))]">
                    <div className="min-w-0 rounded-xl bg-surface-container p-2.5">
                      <p className="truncate text-[#4b4b53] dark:text-[#b4b4c0]">
                        Baru
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-on-surface">
                        {deckStats.newCount}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-surface-container p-2.5">
                      <p className="truncate text-[#4b4b53] dark:text-[#b4b4c0]">
                        Belajar
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-on-surface">
                        {deckStats.learningCount}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-surface-container p-2.5">
                      <p className="truncate text-[#4b4b53] dark:text-[#b4b4c0]">
                        Review
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-on-surface">
                        {deckStats.reviewCount}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-surface-container p-2.5">
                      <p className="truncate text-[#4b4b53] dark:text-[#b4b4c0]">
                        Ulang
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-on-surface">
                        {deckStats.relearningCount}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-surface-container p-2.5">
                      <p className="truncate text-[#4b4b53] dark:text-[#b4b4c0]">
                        Mastered
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-primary">
                        {deckStats.masteredCount}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-surface-container p-2.5">
                      <p className="truncate text-[#4b4b53] dark:text-[#b4b4c0]">
                        Selesai
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-on-surface">
                        {deckStats.completedTodayCount}
                      </p>
                    </div>
                  </div>
                  {(deckStats.totalReviewCount > 0 ||
                    deckStats.suspendedCount > 0) && (
                    <p className="pt-1 text-xs text-[#4b4b53] dark:text-[#b4b4c0]">
                      Total review:{' '}
                      <span className="font-mono font-semibold tabular-nums">
                        {deckStats.totalReviewCount}
                      </span>{' '}
                      · Akurasi:{' '}
                      <span className="font-mono font-semibold tabular-nums">
                        {deckStats.accuracyPercent}%
                      </span>
                      {deckStats.suspendedCount > 0 ? (
                        <>
                          {' '}
                          · Ditunda:{' '}
                          <span className="font-mono font-semibold tabular-nums">
                            {deckStats.suspendedCount}
                          </span>
                        </>
                      ) : null}
                    </p>
                  )}
                </div>

                {/* Notifikasi kartu Learning/Relearning yang masih menunggu interval menit */}
                {deckStats.waitingLearningCount > 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container px-3.5 py-2.5 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
                    <Clock
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span>
                      <strong className="text-on-surface">
                        {deckStats.waitingLearningCount} kartu
                      </strong>{' '}
                      menunggu langkah belajar berikutnya (muncul otomatis dalam
                      ±{waitingMinutes ?? 1} mnt).
                    </span>
                  </div>
                )}

                {/* Notifikasi transparan untuk missed-day backlog (Part 11) */}
                {(deckStats.overdueCount > 0 ||
                  deckStats.reviewBacklogCount > 0) && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-outline-variant bg-warning-container/40 px-3.5 py-2.5 text-[13px] text-on-surface">
                    <span>
                      Ada{' '}
                      <strong className="font-mono tabular-nums">
                        {deckStats.overdueCount}
                      </strong>{' '}
                      kartu review tertunda
                      {deckStats.reviewBacklogCount > 0
                        ? ` (${deckStats.reviewBacklogCount} melebihi batas harian ${
                            deckSettings.maxReviewsPerDay +
                            deckDaily.extraReviewQuotaToday
                          }/hari).`
                        : '. Urutan dimulai dari yang paling lama jatuh tempo.'}
                    </span>
                    {deckStats.reviewBacklogCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          vibrateTap();
                          onExtendTodayReviewQuota(deckId, 20);
                        }}
                        className="m3-tactile min-h-[44px] rounded-xl border border-outline bg-surface px-3 py-1.5 font-mono text-xs font-bold text-primary hover:bg-surface-container"
                      >
                        +20 Review Hari Ini
                      </button>
                    )}
                  </div>
                )}

                {/* Antrean picker + Mulai Belajar Pop-up CTA */}
                <div className="mt-4 space-y-3">
                  <div
                    role="tablist"
                    aria-label="Pilih antrean belajar"
                    className="grid w-full grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5 rounded-2xl bg-surface-container p-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={studyScope === 'due'}
                      onClick={() => {
                        vibrateTap();
                        setStudyScope('due');
                      }}
                      className={`m3-tactile inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold sm:text-[13px] ${
                        studyScope === 'due'
                          ? 'bg-surface-container-low text-on-surface shadow-xs'
                          : 'text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
                      }`}
                    >
                      <CalendarClock
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        Tempo ({deckStats.dueTodayCount})
                      </span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={studyScope === 'favorites'}
                      onClick={() => {
                        vibrateTap();
                        setStudyScope('favorites');
                      }}
                      className={`m3-tactile inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold sm:text-[13px] ${
                        studyScope === 'favorites'
                          ? 'bg-surface-container-low text-warning shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <Bookmark
                        className={`h-3.5 w-3.5 shrink-0 ${
                          studyScope === 'favorites' || favoriteStudyCards.length > 0
                            ? 'fill-warning text-warning'
                            : ''
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        Favorit ({favoriteStudyCards.length})
                      </span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={studyScope === 'all'}
                      onClick={() => {
                        vibrateTap();
                        setStudyScope('all');
                      }}
                      className={`m3-tactile inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold sm:text-[13px] ${
                        studyScope === 'all'
                          ? 'bg-surface-container-low text-on-surface shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="truncate">
                        Semua ({deckStats.totalCards})
                      </span>
                    </button>
                  </div>

                  {studyScope === 'favorites' && favoriteStudyCards.length === 0 ? (
                    <div className="space-y-3 rounded-2xl border border-outline-variant bg-surface-container p-4">
                      <div className="flex items-start gap-2.5 text-sm">
                        <Bookmark
                          className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="font-bold text-on-surface">
                            Belum ada kartu Favorit di deck ini
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
                            Ketuk ikon Bookmark di pop-up kartu Anki, daftar
                            Cari Kartu, Kamus, atau Materi Bunpou untuk
                            mengumpulkan materi favoritmu di sini.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          vibrateTap();
                          setMode('browse');
                        }}
                        className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-outline bg-surface-container-low px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface"
                      >
                        <Search className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Cari &amp; Tandai Kartu Favorit</span>
                      </button>
                    </div>
                  ) : readyCountForScope === 0 && studyScope === 'due' ? (
                    <div className="space-y-3 rounded-2xl bg-success-container p-4 text-on-success-container">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <Sparkles
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          {deckStats.waitingLearningCount > 0
                            ? `Sesi aktif selesai — ${deckStats.waitingLearningCount} kartu belajar akan siap dalam ±${waitingMinutes ?? 1} mnt.`
                            : 'Semua kartu jatuh tempo & kuota harian deck ini selesai!'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenStudyPopup('all', { forceNew: true })}
                        className="m3-tactile inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
                      >
                        <Play
                          className="h-4 w-4 fill-current"
                          aria-hidden="true"
                        />
                        <span>Latih Semua Kartu (Pop-up)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleOpenStudyPopup()}
                        disabled={readyCountForScope === 0}
                        className="m3-tactile inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover disabled:opacity-50"
                      >
                        <Play
                          className="h-4 w-4 fill-current"
                          aria-hidden="true"
                        />
                        <span>
                          {studyScope === 'favorites'
                            ? `Belajar Favorit (${favoriteStudyCards.length})`
                            : resumableSessionInfo
                              ? `Lanjutkan Sesi (${resumableSessionInfo.remainingCount} tersisa)`
                              : `Mulai Pop-up Kartu (${readyCountForScope})`}
                        </span>
                      </button>
                      {resumableSessionInfo && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4b4b53] dark:text-[#b4b4c0]">
                          <span>
                            Sesi sebelumnya tersimpan (
                            <span className="font-mono tabular-nums">
                              {resumableSessionInfo.completedCount}/
                              {resumableSessionInfo.totalCount}
                            </span>{' '}
                            dinilai)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenStudyPopup(studyScope, { forceNew: true })
                            }
                            className="min-h-[44px] font-bold text-primary hover:underline"
                          >
                            Mulai Antrean Baru
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
                    <span className="min-w-0">
                      {activeFilterSummary
                        ? `Filter aktif: ${activeFilterSummary}`
                        : `Semua ${isBunpouDeck ? `Bab ${activeJlptLevel}` : 'kategori kata'}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        setMode('options');
                      }}
                      className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-2 font-bold text-primary hover:underline"
                    >
                      <SlidersHorizontal
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      <span>Ubah Filter</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {mode === 'browse' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <label htmlFor="anki-search-input" className="sr-only">
                      Cari di Deck {activeDeckLabel}
                    </label>
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
                      aria-hidden="true"
                    />
                    <input
                      id="anki-search-input"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setVisibleBrowseCount(20);
                      }}
                      placeholder={
                        isBunpouDeck
                          ? `Cari pola, rumus, atau arti Bunpou ${activeJlptLevel}...`
                          : `Cari kanji, kana, atau arti di Deck ${activeJlptLevel}...`
                      }
                      className="min-h-[48px] w-full rounded-xl border border-outline bg-surface-container-low py-2.5 pr-4 pl-10 text-base text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none sm:text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    aria-pressed={browseFavoritesOnly}
                    onClick={() => {
                      vibrateTap();
                      setBrowseFavoritesOnly((prev) => !prev);
                      setVisibleBrowseCount(20);
                    }}
                    className={`m3-tactile inline-flex min-h-[48px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                      browseFavoritesOnly
                        ? 'border-warning/60 bg-warning-container text-on-warning-container'
                        : 'border-outline bg-surface-container-low text-on-surface hover:border-primary/40'
                    }`}
                  >
                    <Bookmark
                      className={`h-4 w-4 shrink-0 ${
                        browseFavoritesOnly ? 'fill-warning text-warning' : ''
                      }`}
                      aria-hidden="true"
                    />
                    <span>Favorit</span>
                    <span className="font-mono tabular-nums">
                      ({deckFavoritesCount})
                    </span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                  <p className="font-mono text-xs tabular-nums text-on-surface-variant">
                    {filteredBrowseCards.length} kartu
                    {activeFilterSummary ? ` · ${activeFilterSummary}` : ''}
                  </p>
                  {browseFavoritesOnly && filteredBrowseCards.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenFavoriteStudyPopup(filteredBrowseCards)
                      }
                      className="m3-tactile inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-on-primary hover:bg-primary-hover"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>Latih Favorit ({filteredBrowseCards.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {filteredBrowseCards.length === 0 ? (
                <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-8 text-center">
                  <p className="text-sm font-semibold text-on-surface">
                    {browseFavoritesOnly && !searchQuery
                      ? `Belum ada kartu Favorit di Deck ${activeDeckLabel}.`
                      : `Tidak ada kartu yang cocok dengan pencarian “${searchQuery}”.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setBrowseFavoritesOnly(false);
                      setCategory('Semua');
                      setBunpouGroup('Semua');
                      setBunpouLesson('all');
                    }}
                    className="m3-tactile mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-outline px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container"
                  >
                    {browseFavoritesOnly && !searchQuery
                      ? 'Tampilkan Semua Kartu'
                      : 'Reset Pencarian'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
                    {visibleCards.map((card) => {
                      const rec = ankiSrs[card.id];
                      const st = resolveCardState(rec);
                      const cardNoteScope = getStudyNoteScopeForCardKind(
                        card.cardKind,
                      );
                      const cardNoteEntry = getStudyNoteEntry(
                        studyNotes,
                        cardNoteScope,
                        card.id,
                      );
                      const mastered =
                        rec &&
                        computeIsMastered({
                          state: st,
                          repetitions: rec.repetitions,
                          intervalDays: rec.intervalDays,
                          easeFactor: rec.easeFactor,
                        });
                      const historyList = rec?.reviewHistory ?? [];
                      const isExpanded = expandedHistoryCardId === card.id;

                      return (
                        <div
                          key={card.id}
                          className="px-4 py-4 hover:bg-surface-container/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => handleSelectBrowseCard(card)}
                              className="min-w-0 flex-1 text-left"
                            >
                              {card.cardKind === 'bunpou' ? (
                                <>
                                  <div className="flex flex-wrap items-baseline gap-2">
                                    {card.code && (
                                      <span className="font-mono text-xs font-bold text-primary">
                                        [{card.code}]
                                      </span>
                                    )}
                                    <span className="font-display text-base font-extrabold text-on-surface">
                                      {card.word}
                                    </span>
                                  </div>
                                  {card.formula && (
                                    <p className="mt-0.5 truncate text-[11px] font-medium text-on-surface-variant">
                                      {formatBunpouFormulaInline(card.formula)}
                                    </p>
                                  )}
                                  <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant sm:text-sm">
                                    {card.meaning}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <div className="flex flex-wrap items-baseline gap-2">
                                    <RubyReading
                                      readingTerm={card.readingTerm}
                                      className="font-display text-lg font-bold leading-[1.7] text-on-surface"
                                      rtClassName="font-sans text-primary"
                                    />
                                    {card.partOfSpeech && (
                                      <span className="text-xs text-on-surface-variant">
                                        {card.partOfSpeech}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-sm text-on-surface-variant">
                                    {card.meaning}
                                  </p>
                                </>
                              )}

                              {/* Card state, Mastered indicator & due info (read-only) */}
                              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-on-surface-variant">
                                <span
                                  className={`font-bold ${
                                    st === 'suspended'
                                      ? 'text-on-surface-variant/70'
                                      : st === 'review'
                                        ? 'text-primary'
                                        : 'text-on-surface'
                                  }`}
                                >
                                  Status: {formatCardStateLabel(st)}
                                </span>
                                {mastered && (
                                  <span className="font-bold text-primary">
                                    · Mastered
                                  </span>
                                )}
                                {rec && st !== 'new' && (
                                  <>
                                    <span>· Tempo: {rec.dueDate}</span>
                                    <span>
                                      · Review: {historyList.length || rec.repetitions}x
                                    </span>
                                  </>
                                )}
                              </div>
                              {cardNoteEntry.note.length > 0 && (
                                <p className="mt-1.5 truncate text-xs font-medium text-warning">
                                  Catatan: {cardNoteEntry.note}
                                </p>
                              )}
                            </button>

                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSelectBrowseCard(card)}
                                className="whitespace-nowrap font-mono text-xs font-semibold text-primary hover:underline"
                              >
                                Pop-up →
                              </button>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    vibrateTap();
                                    toggleStudyBookmark(cardNoteScope, card.id);
                                  }}
                                  aria-pressed={cardNoteEntry.bookmarked}
                                  aria-label={
                                    cardNoteEntry.bookmarked
                                      ? `Hapus ${card.word} dari Favorit`
                                      : `Simpan ${card.word} ke Favorit`
                                  }
                                  title={
                                    cardNoteEntry.bookmarked
                                      ? 'Hapus dari Favorit'
                                      : 'Simpan ke Favorit'
                                  }
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[10px] font-semibold transition-colors ${
                                    cardNoteEntry.bookmarked
                                      ? 'border-warning/60 bg-warning-container text-on-warning-container'
                                      : 'border-outline-variant bg-surface text-on-surface-variant hover:border-outline hover:text-on-surface'
                                  }`}
                                >
                                  <Bookmark
                                    className={`h-3 w-3 ${
                                      cardNoteEntry.bookmarked
                                        ? 'fill-warning text-warning'
                                        : ''
                                    }`}
                                    aria-hidden="true"
                                  />
                                  <span>Favorit</span>
                                </button>
                                {historyList.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      vibrateTap();
                                      setExpandedHistoryCardId(
                                        isExpanded ? null : card.id,
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface px-2 py-1 font-mono text-[10px] font-semibold text-on-surface-variant hover:text-on-surface"
                                    title="Lihat riwayat review"
                                  >
                                    <History className="h-3 w-3" aria-hidden="true" />
                                    {isExpanded ? (
                                      <ChevronUp className="h-3 w-3" aria-hidden="true" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" aria-hidden="true" />
                                    )}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    vibrateTap();
                                    onToggleSuspendCard(deckId, card);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface px-2 py-1 font-mono text-[10px] font-semibold text-on-surface-variant hover:border-outline hover:text-on-surface"
                                  title={
                                    st === 'suspended'
                                      ? 'Aktifkan kembali kartu ini'
                                      : 'Tunda (suspend) kartu ini'
                                  }
                                >
                                  {st === 'suspended' ? (
                                    <>
                                      <PlayCircle
                                        className="h-3 w-3 text-primary"
                                        aria-hidden="true"
                                      />
                                      <span>Aktifkan</span>
                                    </>
                                  ) : (
                                    <>
                                      <PauseCircle
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                      />
                                      <span>Tunda</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {isExpanded && historyList.length > 0 && (
                            <div className="mt-3 rounded-xl border border-outline-variant bg-surface p-3">
                              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                                Riwayat Review Terakhir ({historyList.length})
                              </p>
                              <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-on-surface-variant">
                                {historyList
                                  .slice(-5)
                                  .reverse()
                                  .map((entry, idx) => (
                                    <li
                                      key={`${entry.reviewedAt}-${idx}`}
                                      className="flex flex-wrap items-center justify-between gap-2"
                                    >
                                      <span>
                                        {entry.reviewedAt.slice(0, 16).replace('T', ' ')}
                                      </span>
                                      <span className="font-bold text-on-surface">
                                        {formatRatingLabel(entry.rating)} →{' '}
                                        {formatCardStateLabel(entry.nextState)} (
                                        {entry.intervalDays > 0
                                          ? `${entry.intervalDays} hari`
                                          : 'langkah mnt'}
                                        )
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {visibleCards.length < filteredBrowseCards.length && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          vibrateTap();
                          setVisibleBrowseCount((prev) => prev + 20);
                        }}
                        className="m3-tactile inline-flex min-h-[48px] items-center justify-center rounded-xl border border-outline bg-surface-container-low px-5 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container"
                      >
                        Tampilkan 20 Kartu Lagi (
                        {filteredBrowseCards.length - visibleCards.length}{' '}
                        tersisa)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {mode === 'options' && (
            <div className="mx-auto max-w-3xl space-y-8">
              {/* Filter Kategori / Bab */}
              <section className="space-y-5 border-b border-outline-variant pb-7">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-on-surface">
                    Antrean &amp; Filter {activeDeckLabel}
                  </h2>
                  <p className="mt-1 font-mono text-xs tabular-nums text-on-surface-variant">
                    Tempo hari ini: {deckStats.dueTodayCount} · Kartu baru:{' '}
                    {deckStats.newCount} · Dipelajari: {deckStats.learnedCount}/
                    {deckStats.totalCards} · Mastered: {deckStats.masteredCount}
                  </p>
                </div>

                {!isBunpouDeck ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-on-surface-variant">
                      Filter Jenis Kata
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ANKI_CATEGORIES.map((cat) => {
                        const isActive = category === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              vibrateTap();
                              setCategory(cat);
                              setVisibleBrowseCount(20);
                            }}
                            className={`m3-tactile min-h-[44px] shrink-0 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-semibold ${
                              isActive
                                ? 'border-primary bg-primary text-on-primary'
                                : 'border-outline-variant bg-surface-container-low text-on-surface hover:border-outline'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-on-surface-variant">
                      Filter Bab Bunpou {activeJlptLevel}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeBunpouGroups.map((group) => {
                        const isActive = bunpouGroup === group.id;
                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => {
                              vibrateTap();
                              setBunpouGroup(group.id);
                              setBunpouLesson('all');
                              setVisibleBrowseCount(20);
                            }}
                            className={`m3-tactile min-h-[44px] shrink-0 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-semibold ${
                              isActive
                                ? 'border-primary bg-primary text-on-primary'
                                : 'border-outline-variant bg-surface-container-low text-on-surface hover:border-outline'
                            }`}
                          >
                            {group.shortLabel}
                          </button>
                        );
                      })}
                    </div>

                    {bunpouLessons.length > 0 && (
                      <div>
                        <label
                          htmlFor="anki-bunpou-lesson-select"
                          className="sr-only"
                        >
                          Filter Bab Bunpou {activeJlptLevel}
                        </label>
                        <select
                          id="anki-bunpou-lesson-select"
                          value={bunpouLesson}
                          onChange={(e) => {
                            vibrateTap();
                            const val = e.target.value;
                            setBunpouLesson(val === 'all' ? 'all' : Number(val));
                            setVisibleBrowseCount(20);
                          }}
                          className="min-h-[44px] max-w-full rounded-xl border border-outline bg-surface-container-low px-3.5 py-2 text-xs font-semibold text-on-surface focus:border-primary focus:outline-none"
                        >
                          <option value="all">
                            Semua Bab &amp; Bagian ({bunpouLessons.length})
                          </option>
                          {bunpouLessons.map((lesson) => (
                            <option key={lesson.num} value={lesson.num}>
                              {lesson.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleToggleNewCardOrder}
                    aria-pressed={deckSettings.newCardOrder === 'random'}
                    className={`m3-tactile inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold ${
                      deckSettings.newCardOrder === 'random'
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {deckSettings.newCardOrder === 'random'
                        ? 'Kartu Baru: Acak (Fisher-Yates)'
                        : 'Kartu Baru: Berurutan'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      setConfirmResetOpen(true);
                    }}
                    className="m3-tactile inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-outline bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Reset Jadwal {activeDeckLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('study');
                      handleOpenStudyPopup();
                    }}
                    className="m3-tactile inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary hover:bg-primary-hover"
                  >
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Buka Pop-up Kartu</span>
                  </button>
                </div>
              </section>

              {/* Pengaturan Independen Per Deck (Part 3 & Part 12) */}
              <section className="space-y-5 border-b border-outline-variant pb-7">
                <div>
                  <p className="text-xs font-semibold text-primary">
                    Pengaturan Independen Deck
                  </p>
                  <h3 className="mt-0.5 font-display text-lg font-extrabold text-on-surface">
                    Kuota &amp; Penjadwalan {activeDeckLabel}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                    Perubahan di sini hanya berlaku untuk{' '}
                    <strong className="text-on-surface">{activeDeckLabel}</strong>{' '}
                    dan tidak memengaruhi 9 deck lainnya. Kuota reset otomatis
                    setiap pukul 00:00 waktu lokal.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* 1. Daily new cards limit */}
                  <label className="space-y-1.5 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5">
                    <span className="block text-xs font-bold text-on-surface">
                      Kartu Baru per Hari
                    </span>
                    <span className="block text-[11px] text-on-surface-variant">
                      Default: {getDefaultDeckSettings(deckId).dailyNewLimit}{' '}
                      kartu/hari
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={deckSettings.dailyNewLimit}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (Number.isFinite(val)) {
                          onUpdateDeckSettings(
                            deckId,
                            { dailyNewLimit: Math.max(0, Math.min(200, Math.round(val))) },
                            false,
                          );
                        }
                      }}
                      className="mt-1 min-h-[42px] w-full rounded-xl border border-outline bg-surface px-3 py-2 font-mono text-sm font-bold text-on-surface focus:border-primary focus:outline-none"
                    />
                  </label>

                  {/* 2. Maximum reviews per day */}
                  <label className="space-y-1.5 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5">
                    <span className="block text-xs font-bold text-on-surface">
                      Maksimal Review per Hari
                    </span>
                    <span className="block text-[11px] text-on-surface-variant">
                      Default: 200 review/hari
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={2000}
                      value={deckSettings.maxReviewsPerDay}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (Number.isFinite(val)) {
                          onUpdateDeckSettings(
                            deckId,
                            {
                              maxReviewsPerDay: Math.max(
                                0,
                                Math.min(2000, Math.round(val)),
                              ),
                            },
                            false,
                          );
                        }
                      }}
                      className="mt-1 min-h-[42px] w-full rounded-xl border border-outline bg-surface px-3 py-2 font-mono text-sm font-bold text-on-surface focus:border-primary focus:outline-none"
                    />
                  </label>

                  {/* 3. Target retention */}
                  <label className="space-y-1.5 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface">
                        Target Retensi
                      </span>
                      <span className="font-mono text-xs font-extrabold text-primary">
                        {deckSettings.targetRetention}%
                      </span>
                    </div>
                    <span className="block text-[11px] text-on-surface-variant">
                      Default: 90% (lebih tinggi = interval review lebih rapat)
                    </span>
                    <input
                      type="range"
                      min={75}
                      max={97}
                      step={1}
                      value={deckSettings.targetRetention}
                      onChange={(e) =>
                        onUpdateDeckSettings(
                          deckId,
                          { targetRetention: Number(e.target.value) },
                          false,
                        )
                      }
                      className="mt-2 w-full accent-primary"
                    />
                  </label>

                  {/* 4. Learning steps */}
                  <label className="space-y-1.5 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5">
                    <span className="block text-xs font-bold text-on-surface">
                      Langkah Learning (menit)
                    </span>
                    <span className="block text-[11px] text-on-surface-variant">
                      Pisahkan dengan koma · Default: 1, 10
                    </span>
                    <input
                      type="text"
                      value={learningStepsText}
                      onChange={(e) => setLearningStepsText(e.target.value)}
                      onBlur={() => {
                        const parsed = parseStepsInput(
                          learningStepsText,
                          deckSettings.learningStepsMinutes,
                        );
                        setLearningStepsText(parsed.join(', '));
                        onUpdateDeckSettings(
                          deckId,
                          { learningStepsMinutes: parsed },
                          false,
                        );
                      }}
                      className="mt-1 min-h-[42px] w-full rounded-xl border border-outline bg-surface px-3 py-2 font-mono text-sm font-bold text-on-surface focus:border-primary focus:outline-none"
                    />
                  </label>

                  {/* 5. Relearning steps */}
                  <label className="space-y-1.5 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5">
                    <span className="block text-xs font-bold text-on-surface">
                      Langkah Relearning (menit)
                    </span>
                    <span className="block text-[11px] text-on-surface-variant">
                      Saat lupa kartu Review · Default: 10
                    </span>
                    <input
                      type="text"
                      value={relearningStepsText}
                      onChange={(e) => setRelearningStepsText(e.target.value)}
                      onBlur={() => {
                        const parsed = parseStepsInput(
                          relearningStepsText,
                          deckSettings.relearningStepsMinutes,
                        );
                        setRelearningStepsText(parsed.join(', '));
                        onUpdateDeckSettings(
                          deckId,
                          { relearningStepsMinutes: parsed },
                          false,
                        );
                      }}
                      className="mt-1 min-h-[42px] w-full rounded-xl border border-outline bg-surface px-3 py-2 font-mono text-sm font-bold text-on-surface focus:border-primary focus:outline-none"
                    />
                  </label>

                  {/* 6. New card order */}
                  <label className="space-y-1.5 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5">
                    <span className="block text-xs font-bold text-on-surface">
                      Urutan Kartu Baru
                    </span>
                    <span className="block text-[11px] text-on-surface-variant">
                      Default: Acak (Fisher-Yates)
                    </span>
                    <select
                      value={deckSettings.newCardOrder}
                      onChange={(e) =>
                        onUpdateDeckSettings(
                          deckId,
                          { newCardOrder: e.target.value as NewCardOrder },
                          false,
                        )
                      }
                      className="mt-1 min-h-[42px] w-full rounded-xl border border-outline bg-surface px-3 py-2 text-xs font-semibold text-on-surface focus:border-primary focus:outline-none"
                    >
                      <option value="random">Acak (Fisher-Yates Harian)</option>
                      <option value="sequential">Berurutan Sesuai Daftar</option>
                    </select>
                  </label>

                  {/* 7. Review card order */}
                  <label className="space-y-1.5 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5">
                    <span className="block text-xs font-bold text-on-surface">
                      Urutan Kartu Review
                    </span>
                    <span className="block text-[11px] text-on-surface-variant">
                      Default: Paling lama jatuh tempo dulu
                    </span>
                    <select
                      value={deckSettings.reviewCardOrder}
                      onChange={(e) =>
                        onUpdateDeckSettings(
                          deckId,
                          { reviewCardOrder: e.target.value as ReviewCardOrder },
                          false,
                        )
                      }
                      className="mt-1 min-h-[42px] w-full rounded-xl border border-outline bg-surface px-3 py-2 text-xs font-semibold text-on-surface focus:border-primary focus:outline-none"
                    >
                      <option value="oldest_due">
                        Paling Lama Jatuh Tempo Dulu
                      </option>
                      <option value="random">Acak di Antara Kartu Tempo</option>
                    </select>
                  </label>

                  {/* 8. Resume interrupted session */}
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-low p-3.5">
                    <div>
                      <span className="block text-xs font-bold text-on-surface">
                        Lanjutkan Sesi Terputus
                      </span>
                      <span className="mt-0.5 block text-[11px] text-on-surface-variant">
                        Otomatis lanjut dari kartu terakhir saat popup ditutup
                        atau halaman dimuat ulang
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={deckSettings.resumeInterruptedSession}
                      onChange={(e) =>
                        onUpdateDeckSettings(
                          deckId,
                          { resumeInterruptedSession: e.target.checked },
                          false,
                        )
                      }
                      className="h-5 w-5 shrink-0 accent-primary"
                    />
                  </label>
                </div>

                {/* 9. Reset to default + Explicit Apply to All Decks */}
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      onResetDeckSettings(deckId);
                    }}
                    className="m3-tactile inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-outline bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Reset Pengaturan ke Default</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      setConfirmGlobalApplyOpen(true);
                    }}
                    className="m3-tactile inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-outline bg-surface-container-low px-4 py-2 text-xs font-semibold text-primary hover:bg-surface-container"
                  >
                    <span>Terapkan ke Semua Deck</span>
                  </button>
                </div>
              </section>

              {/* Panduan & Dokumentasi SM-2 termodifikasi */}
              <section className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-primary">
                    Panduan Jadwal Ulang Berkala (SM-2 Adaptif)
                  </p>
                  <h3 className="mt-1 font-display text-lg font-bold text-on-surface">
                    Cara Kerja Deck {activeDeckLabel}
                  </h3>
                </div>

                <ol className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
                  <li>
                    <strong className="text-on-surface">
                      1. 10 Deck Terpisah &amp; Kuota Independen:
                    </strong>{' '}
                    Kosakata (default 10 baru/hari) dan Bunpou (default 5
                    baru/hari) memiliki antrean, kuota harian, statistik, dan
                    pengaturan masing-masing untuk tiap level N5–N1.
                  </li>
                  <li>
                    <strong className="text-on-surface">
                      2. Penilaian 4 Tombol &amp; Langkah Belajar:
                    </strong>{' '}
                    Adaptasi SM-2 memetakan{' '}
                    <strong className="text-on-surface">
                      Lagi (q=1), Sulit (q=3), Bagus (q=4), Mudah (q=5)
                    </strong>{' '}
                    dengan langkah learning ({deckSettings.learningStepsMinutes.join(' → ')}{' '}
                    mnt) dan relearning (
                    {deckSettings.relearningStepsMinutes.join(' → ')} mnt), plus
                    geser kiri/kanan di kartu.
                  </li>
                  <li>
                    <strong className="text-on-surface">
                      3. Kriteria Mastered &amp; Penyimpanan Otomatis:
                    </strong>{' '}
                    Kartu ditandai <strong className="text-on-surface">Mastered</strong>{' '}
                    saat berstatus Review dengan repetisi ≥ 3, interval ≥ 21
                    hari, dan faktor kemudahan ≥ 2,0. Seluruh progres tersimpan
                    otomatis per akun.
                  </li>
                </ol>
              </section>
            </div>
          )}
        </div>
      )}

      {/* POP-UP MODAL FLASHCARD ANKI */}
      <AnimatePresence>
        {studyModalOpen && activeCard && activeModalSession && (
          <motion.div
            key="anki-popup-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={`Kartu Anki ${activeDeckLabel}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm pt-safe pb-safe sm:p-5"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                vibrateTap();
                setPopupOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-low shadow-2xl"
            >
              {/* Modal Header */}
              <div className="shrink-0 border-b border-outline-variant">
                <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-bold text-primary">
                      {activeCard.cardKind === 'bunpou'
                        ? `Bunpou ${activeJlptLevel}${activeCard.code ? ` · [${activeCard.code}]` : ''}`
                        : `Kosakata ${activeJlptLevel}${activeCard.partOfSpeech ? ` · ${activeCard.partOfSpeech}` : ''}`}
                    </p>
                    <p className="font-mono text-[11px] tabular-nums text-on-surface-variant">
                      Kartu {activeModalSession.currentIndex + 1} /{' '}
                      {activeModalSession.queueCardIds.length} ·{' '}
                      {formatCardStateLabel(activeCardState)}
                      {activeCardMastered ? ' ★' : ''}
                      {sessionReviewedCount > 0
                        ? ` · ${sessionReviewedCount} dinilai`
                        : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {xpNotice && (
                      <motion.span
                        key={xpNotice.key}
                        initial={{ opacity: 0, y: 6, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        aria-live="polite"
                        className="inline-flex items-center gap-1 rounded-lg bg-warning-container px-2 py-1 font-mono text-[11px] font-bold tabular-nums text-on-warning-container"
                      >
                        <Zap
                          className="h-3 w-3 fill-amber-400 text-amber-500"
                          aria-hidden="true"
                        />
                        +{xpNotice.amount}
                      </motion.span>
                    )}
                    {(() => {
                      const activeScope = getStudyNoteScopeForCardKind(
                        activeCard.cardKind,
                      );
                      const activeEntry = getStudyNoteEntry(
                        studyNotes,
                        activeScope,
                        activeCard.id,
                      );
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            vibrateTap();
                            toggleStudyBookmark(activeScope, activeCard.id);
                          }}
                          aria-pressed={activeEntry.bookmarked}
                          aria-label={
                            activeEntry.bookmarked
                              ? 'Hapus kartu dari Favorit'
                              : 'Simpan kartu ke Favorit'
                          }
                          title={
                            activeEntry.bookmarked
                              ? 'Hapus dari Favorit'
                              : 'Tandai Favorit'
                          }
                          className={`m3-tactile inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                            activeEntry.bookmarked
                              ? 'border-warning/60 bg-warning-container text-warning'
                              : 'border-outline-variant bg-surface text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          <Bookmark
                            className={`h-4 w-4 ${
                              activeEntry.bookmarked ? 'fill-warning' : ''
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        onToggleSuspendCard(deckId, activeCard);
                        setIsFlipped(false);
                      }}
                      aria-label={
                        activeCardState === 'suspended'
                          ? 'Aktifkan kartu'
                          : 'Tunda kartu'
                      }
                      title={
                        activeCardState === 'suspended'
                          ? 'Aktifkan kartu ini'
                          : 'Tunda (suspend) kartu ini'
                      }
                      className="m3-tactile inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-surface text-on-surface-variant hover:text-on-surface"
                    >
                      {activeCardState === 'suspended' ? (
                        <PlayCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                      ) : (
                        <PauseCircle className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        setPopupOpen(false);
                      }}
                      aria-label="Tutup pop-up kartu"
                      className="m3-tactile inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-surface text-on-surface hover:bg-surface-container"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {/* Thin live progress ribbon */}
                <div className="h-1 w-full bg-surface-container">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((activeModalSession.currentIndex + 1) /
                            Math.max(1, activeModalSession.queueCardIds.length)) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Scrollable Flashcard Body */}
              <div className="flex-1 overflow-x-hidden overflow-y-auto px-5 py-6 sm:px-7">
                <motion.div
                  key={`${activeCard.id}-${activeModalSession.currentIndex}`}
                  data-testid="anki-swipe-card"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    x: dragX,
                    rotate: cardRotate,
                    opacity: cardOpacity,
                    touchAction: 'pan-y',
                  }}
                  drag="x"
                  dragDirectionLock
                  dragSnapToOrigin
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.55}
                  onDragEnd={(_, info) => {
                    const swipedRight =
                      info.offset.x > SWIPE_THRESHOLD ||
                      (info.offset.x > 32 &&
                        info.velocity.x > SWIPE_VELOCITY_THRESHOLD);
                    const swipedLeft =
                      info.offset.x < -SWIPE_THRESHOLD ||
                      (info.offset.x < -32 &&
                        info.velocity.x < -SWIPE_VELOCITY_THRESHOLD);

                    if (swipedRight) {
                      handleRateCard('good');
                    } else if (swipedLeft) {
                      handleRateCard('again');
                    }
                  }}
                  className="relative cursor-grab select-none active:cursor-grabbing"
                >
                  <motion.span
                    style={{ opacity: leftHintOpacity }}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-0 z-10 rounded-lg bg-primary-container px-2.5 py-1 text-xs font-extrabold text-on-primary-container shadow-xs"
                  >
                    ← Lagi
                  </motion.span>
                  <motion.span
                    style={{ opacity: rightHintOpacity }}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 right-0 z-10 rounded-lg bg-success-container px-2.5 py-1 text-xs font-extrabold text-on-success-container shadow-xs"
                  >
                    Bagus →
                  </motion.span>

                  <div className="py-4 text-center">
                    <p
                      className={`font-display font-extrabold tracking-tight text-on-surface ${
                        activeCard.cardKind === 'bunpou'
                          ? 'text-2xl leading-snug sm:text-3xl'
                          : 'text-4xl sm:text-5xl'
                      }`}
                    >
                      {activeCard.word}
                    </p>
                    {(activeCard.cardKind === 'bunpou'
                      ? activeCard.romaji || activeCard.lessonTitle
                      : activeCard.partOfSpeech) && (
                      <p className="mt-2.5 text-xs font-medium text-on-surface-variant sm:text-sm">
                        {activeCard.cardKind === 'bunpou'
                          ? activeCard.romaji
                            ? `(${activeCard.romaji})`
                            : activeCard.lessonTitle
                          : activeCard.partOfSpeech}
                      </p>
                    )}

                    {(canSpeakJapanese ||
                      (onOpenWritingForWord &&
                        activeCard.cardKind !== 'bunpou' &&
                        extractKanjiCharacters(activeCard.word).length > 0)) && (
                      <div className="mt-3.5 flex justify-center">
                        <SpeechControlBar
                          text={activeCard.word}
                          align="center"
                          showQuickSettings={false}
                          showAutoPlayToggle={false}
                          onWriteKanji={
                            onOpenWritingForWord &&
                            activeCard.cardKind !== 'bunpou' &&
                            extractKanjiCharacters(activeCard.word).length > 0
                              ? () => {
                                  stopJapaneseSpeech();
                                  onOpenWritingForWord(activeCard.word);
                                }
                              : undefined
                          }
                          writeKanjiLabel="Tulis Kanji"
                        />
                      </div>
                    )}

                    {!isFlipped && (
                      <div className="mx-auto mt-5 max-w-sm space-y-2">
                        <p className="text-xs leading-relaxed text-on-surface-variant">
                          {activeCard.cardKind === 'bunpou'
                            ? 'Ingat arti, rumus sambungan, serta contoh kalimatnya sebelum membuka jawaban.'
                            : 'Ingat cara baca dan artinya, lalu ketuk "Lihat Jawaban" di bawah.'}
                        </p>
                        <p className="font-mono text-[11px] font-semibold text-on-surface-variant/85">
                          ← Geser kiri (Lagi) · Geser kanan (Bagus) →
                        </p>
                      </div>
                    )}
                  </div>

                  {isFlipped && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 space-y-4 border-t border-outline-variant pt-5"
                    >
                      {activeCard.cardKind === 'bunpou' ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            {activeCard.meaning && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                                  Arti
                                </p>
                                <p className="mt-0.5 text-base font-bold text-primary">
                                  {activeCard.meaning}
                                </p>
                              </div>
                            )}
                            {activeCard.register && (
                              <span className="font-mono text-xs font-semibold text-warning">
                                {activeCard.register}
                              </span>
                            )}
                          </div>

                          {activeCard.formula && (
                            <div className="border-t border-outline-variant pt-2.5">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                                Rumus Bunpou
                              </p>
                              <BunpouFormula
                                formula={activeCard.formula}
                                compact
                                className="mt-1.5"
                              />
                            </div>
                          )}

                          {activeCard.note && (
                            <div className="border-t border-outline-variant pt-2.5">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                                Catatan Pemakaian
                              </p>
                              <BunpouExplanation
                                text={activeCard.note}
                                className="mt-1.5 text-xs sm:text-sm"
                              />
                            </div>
                          )}

                          {activeCard.crossReference && (
                            <p className="text-xs font-medium text-primary">
                              Lihat juga: {activeCard.crossReference}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-center sm:text-left">
                          {activeCard.readingTerm && (
                            <p className="font-display text-2xl font-bold leading-[1.8] text-on-surface">
                              <RubyReading
                                readingTerm={activeCard.readingTerm}
                                rtClassName="font-sans text-primary"
                              />
                            </p>
                          )}
                          {activeCard.meaning && (
                            <p className="text-base font-bold text-primary">
                              {activeCard.meaning}
                            </p>
                          )}
                        </div>
                      )}

                      {activeCard.examples.length > 0 && (
                        <div className="space-y-2.5 border-t border-outline-variant pt-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                              Contoh Kalimat
                            </p>
                            <span className="text-[10px] font-semibold text-primary">
                              Sorotan ={' '}
                              {activeCard.cardKind === 'bunpou'
                                ? 'pola dibahas'
                                : 'kata dibahas'}
                            </span>
                          </div>
                          <ol className="space-y-2.5">
                            {activeCard.examples.map((ex, idx) => (
                              <li
                                key={`${ex.jp}-${idx}`}
                                className="rounded-xl bg-surface-container/75 p-3 text-xs leading-relaxed sm:text-sm"
                              >
                                <HighlightedJapaneseText
                                  sentence={ex.jp}
                                  target={activeCard.word}
                                  readingTerm={activeCard.readingTerm}
                                  kind={
                                    activeCard.cardKind === 'bunpou'
                                      ? 'bunpou'
                                      : 'vocab'
                                  }
                                  prefix={`${idx + 1}.`}
                                  showSpeakButton
                                  className="w-full font-medium text-on-surface"
                                />
                                {ex.id && (
                                  <p className="mt-1 pl-4 text-on-surface-variant">
                                    {ex.id}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      <div className="border-t border-outline-variant pt-3">
                        {(() => {
                          const activeScope = getStudyNoteScopeForCardKind(
                            activeCard.cardKind,
                          );
                          const activeEntry = getStudyNoteEntry(
                            studyNotes,
                            activeScope,
                            activeCard.id,
                          );
                          return (
                            <StudyNotePanel
                              itemId={activeCard.id}
                              entry={activeEntry}
                              compact
                              onToggleBookmark={() =>
                                toggleStudyBookmark(activeScope, activeCard.id)
                              }
                              onSaveNote={(noteText) =>
                                saveStudyNoteText(
                                  activeScope,
                                  activeCard.id,
                                  noteText,
                                )
                              }
                              placeholder="Tulis catatan pribadi atau trik mengingat kartu ini..."
                            />
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* Modal Footer: Thumb Controls Always Reachable */}
              <div className="shrink-0 space-y-2.5 border-t border-outline-variant bg-surface-container/60 p-3.5 sm:p-4">
                {!isFlipped ? (
                  <button
                    type="button"
                    onClick={() => {
                      vibrateMedium();
                      setIsFlipped(true);
                    }}
                    className="m3-tactile inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
                  >
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                    <span>Lihat Jawaban</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handleRateCard('again')}
                      className="m3-tactile flex min-h-[54px] flex-col items-center justify-center rounded-xl bg-primary-container px-1.5 py-2 text-on-primary-container hover:opacity-90"
                    >
                      <span className="text-xs font-bold">Lagi</span>
                      <span className="font-mono text-[10px] tabular-nums opacity-85">
                        {intervalLabels.again}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRateCard('hard')}
                      className="m3-tactile flex min-h-[54px] flex-col items-center justify-center rounded-xl bg-warning-container px-1.5 py-2 text-on-warning-container hover:opacity-90"
                    >
                      <span className="text-xs font-bold">Sulit</span>
                      <span className="font-mono text-[10px] tabular-nums opacity-85">
                        {intervalLabels.hard}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRateCard('good')}
                      className="m3-tactile flex min-h-[54px] flex-col items-center justify-center rounded-xl bg-success-container px-1.5 py-2 text-on-success-container hover:opacity-90"
                    >
                      <span className="text-xs font-bold">Bagus</span>
                      <span className="font-mono text-[10px] tabular-nums opacity-85">
                        {intervalLabels.good}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRateCard('easy')}
                      className="m3-tactile flex min-h-[54px] flex-col items-center justify-center rounded-xl bg-inverse-surface px-1.5 py-2 text-inverse-on-surface hover:opacity-90"
                    >
                      <span className="text-xs font-bold">Mudah</span>
                      <span className="font-mono text-[10px] tabular-nums opacity-85">
                        {intervalLabels.easy}
                      </span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleStep(-1)}
                    className="m3-tactile inline-flex min-h-[42px] items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Prev</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      vibrateMedium();
                      setIsFlipped((prev) => !prev);
                    }}
                    className="m3-tactile min-h-[42px] whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  >
                    {isFlipped ? 'Sembunyikan Jawaban' : 'Balik Kartu'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStep(1)}
                    className="m3-tactile inline-flex min-h-[42px] items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmResetOpen}
        title={`Reset Jadwal ${activeDeckLabel}?`}
        description={`Seluruh riwayat belajar, kuota harian, dan jadwal ulang khusus deck ${activeDeckLabel} akan dikembalikan ke awal. 9 deck lainnya tidak terpengaruh.`}
        confirmLabel="Ya, Reset Deck Ini"
        cancelLabel="Batal"
        onConfirm={handleConfirmResetDeck}
        onCancel={() => setConfirmResetOpen(false)}
      />

      <ConfirmDialog
        open={confirmGlobalApplyOpen}
        title="Terapkan Pengaturan ke Semua Deck?"
        description="Pengaturan kuota baru, batas review, target retensi, langkah learning/relearning, dan urutan kartu dari deck ini akan disalin ke seluruh 10 deck Anki."
        confirmLabel="Ya, Terapkan ke Semua"
        cancelLabel="Batal"
        onConfirm={() => {
          vibrateTap();
          onUpdateDeckSettings(deckId, deckSettings, true);
          setConfirmGlobalApplyOpen(false);
        }}
        onCancel={() => setConfirmGlobalApplyOpen(false)}
      />
    </div>
  );
}
