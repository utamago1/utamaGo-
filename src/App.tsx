/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AnimatePresence, motion } from 'motion/react';
import { AnkiN5Section } from './components/AnkiN5Section';
import {
  DesktopNavigationRail,
  MobileBottomNav,
  MobileTopAppBar,
  type AppTab,
} from './components/AppShellNav';
import { BetaFeedbackModal } from './components/BetaFeedbackModal';
import { BetaWelcomeModal } from './components/BetaWelcomeModal';
import { ChallengeRunnerModal } from './components/ChallengeRunnerModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DifficultDrillModal } from './components/DifficultDrillModal';
import { HomeScreen } from './components/HomeScreen';
import { LearnScreen } from './components/LearnScreen';
import { LoginScreen } from './components/LoginScreen';
import { OnboardingFlow } from './components/OnboardingFlow';
import { ProfileScreen } from './components/ProfileScreen';
import type { ReportTab } from './components/ReportAndSimSection';
import { SettingsModal } from './components/SettingsModal';
import { TryOutSectionSkeleton } from './components/SkeletonLoaders';
import { VocabDictionaryModal } from './components/VocabDictionaryModal';
import { WritingStudioModal } from './components/WritingStudioModal';
import {
  analyzeJlptWeaknesses,
  type WeaknessActionTarget,
} from './utils/weaknessDetector';
import type { WritingPracticeMode } from './utils/writingPractice';
import {
  CHALLENGE_STAGES,
  type ChallengeStage,
} from './data/challengeLevels';
import type { JlptLevel } from './data/utamagoContent';
import {
  generateArenaQuestionBatch,
  generateBlitzStage,
  generateSurvivalStage,
} from './utils/challengeArenaGenerator';
import { useTextScaleEffect } from './hooks/useTextScale';
import { useThemeMode } from './hooks/useThemeMode';
import {
  initAccountAuth,
  logoutAccount,
  syncUserProfileToFirestore,
  type AuthenticatedUserProfile,
} from './services/accountAuth';
import {
  deleteAnkiCardFromFirestore,
  loadUserAnkiFromFirestore,
  mergeAnkiSnapshots,
  resetDeckProgressInFirestore,
  saveAnkiDeckStateToFirestore,
  saveAnkiReviewToFirestore,
} from './services/ankiPersistence';
import { readCachedAnkiDeck, writeCachedAnkiDeck } from './utils/ankiCache';
import {
  ALL_ANKI_DECK_IDS,
  applyAnkiCardReview,
  computeDeckStatistics,
  createEmptyDeckDailyProgress,
  getDefaultDeckSettings,
  getEffectiveDeckSettings,
  getOrResetDeckDailyProgress,
  sanitizeDeckSettings,
  selectCardsForDeck,
  type AnkiDeckDailyProgress,
  type AnkiDeckSettings,
  type AnkiStudySession,
} from './utils/ankiEngine';
import {
  ANKI_N1_DECK_URL,
  ANKI_N2_DECK_URL,
  ANKI_N3_DECK_URL,
  ANKI_N4_DECK_URL,
  ANKI_N5_DECK_URL,
  INITIAL_ANKI_N1_SEED,
  INITIAL_ANKI_N2_SEED,
  INITIAL_ANKI_N3_SEED,
  INITIAL_ANKI_N4_SEED,
  INITIAL_ANKI_N5_SEED,
  parseAnkiTxtDeck,
  type AnkiCard,
  type AnkiDeckId,
  type AnkiRating,
} from './utils/ankiParser';
import {
  ANKI_RATING_XP,
  resolveCardState,
  suspendAnkiCard,
  unsuspendAnkiCard,
} from './utils/ankiSrs';
import {
  ankiCardToBunpouItem,
  BUNPOU_N1_TEXT_URL,
  BUNPOU_N2_TEXT_URL,
  BUNPOU_N3_TEXT_URL,
  BUNPOU_N4_TEXT_URL,
  BUNPOU_N5_TEXT_URL,
  bunpouItemToAnkiCard,
  INITIAL_BUNPOU_N1_SEED,
  INITIAL_BUNPOU_N2_SEED,
  INITIAL_BUNPOU_N3_SEED,
  INITIAL_BUNPOU_N4_SEED,
  INITIAL_BUNPOU_N5_SEED,
  parseBunpouN1Deck,
  parseBunpouN2Deck,
  parseBunpouN3Deck,
  parseBunpouN4Deck,
  parseBunpouN5Deck,
  type BunpouN2Item,
} from './utils/bunpouN2Parser';
import { attachGlobalHapticsListener } from './utils/haptics';
import { getDifficultAnkiCards } from './utils/homeSummary';
import type { ComputedTryOutReport } from './utils/jlptReport';
import {
  getLevelProgress,
  getTotalStarsEarned,
  isJlptLevelUnlocked,
  isStageUnlocked,
  JLPT_LEVELS_ASC,
  type ChallengeEvaluation,
  type CompletedLevelRecord,
  type LearnerGender,
} from './utils/levelProgression';
import { generateDailyDrillStage } from './utils/practiceGenerators';
import { estimateEquivalentJlptLevel } from './utils/tryOutAnalytics';
import {
  getNotificationAdapter,
  shouldFireReminderNow,
} from './utils/notifications';
import {
  clearAllAppStorage,
  createDefaultAppState,
  createDefaultPacketState,
  EMPTY_FLAGGED_BY_PART,
  EMPTY_TIMERS_BY_PART,
  getPacketState,
  isValidTab,
  loadUnifiedAppState,
  saveUnifiedAppState,
  type OnboardingSettings,
  type StoredTryOutPacketState,
  type TextScale,
  type UtamagoAppStateV2,
} from './utils/storage';
import {
  EMPTY_ACTIVITY_LOG,
  getLocalDateKey,
  recordStudyActivity,
} from './utils/studyAnalytics';
import {
  getTryOutPacketParts,
  toggleTryOutPartCompletion,
  TRYOUT_N2_PACKETS,
  type TryOutLevelOption,
  type TryOutPacketPartId,
} from './utils/tryOutPacket';

const LazyReportAndSimSection = lazy(() =>
  import('./components/ReportAndSimSection').then((m) => ({
    default: m.ReportAndSimSection,
  })),
);

const DECK_CACHE_VERSION = '2026-11-24-v8';
const AUDIO_KEEPALIVE_STORAGE_KEY = 'utamago_catbox_keepalive_at';
const AUDIO_KEEPALIVE_INTERVAL_MS = 25 * 24 * 60 * 60 * 1000;

function resolveInitialTab(storedLastTab: AppTab): AppTab {
  if (typeof window === 'undefined') return storedLastTab;
  const param = new URLSearchParams(window.location.search).get('tab');
  if (isValidTab(param)) return param;
  return storedLastTab;
}

function isAutostartMode(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

const PREVIEW_PROFILE: AuthenticatedUserProfile = {
  uid: 'utamago-preview',
  username: 'pelajar_jlpt',
  email: 'pelajar@utamago.app',
  name: 'Pelajar UtamaGo',
  gender: 'cowok',
  selfAssessedLevel: 'N2',
  targetLevel: 'N1',
  dailyMinutes: 30,
  onboardingCompleted: true,
};

export default function App() {
  const { themeMode, isDark, setThemeMode, toggleDarkLight } = useThemeMode();
  const autostartMode = useMemo(() => isAutostartMode(), []);

  const n5SeedCards = useMemo(() => parseAnkiTxtDeck(INITIAL_ANKI_N5_SEED), []);
  const n4SeedCards = useMemo(() => parseAnkiTxtDeck(INITIAL_ANKI_N4_SEED), []);
  const n3SeedCards = useMemo(() => parseAnkiTxtDeck(INITIAL_ANKI_N3_SEED), []);
  const n2SeedCards = useMemo(() => parseAnkiTxtDeck(INITIAL_ANKI_N2_SEED), []);
  const n1SeedCards = useMemo(() => parseAnkiTxtDeck(INITIAL_ANKI_N1_SEED), []);
  const bunpouN5SeedItems = useMemo(
    () => parseBunpouN5Deck(INITIAL_BUNPOU_N5_SEED),
    [],
  );
  const bunpouN4SeedItems = useMemo(
    () => parseBunpouN4Deck(INITIAL_BUNPOU_N4_SEED),
    [],
  );
  const bunpouN3SeedItems = useMemo(
    () => parseBunpouN3Deck(INITIAL_BUNPOU_N3_SEED),
    [],
  );
  const bunpouN2SeedItems = useMemo(
    () => parseBunpouN2Deck(INITIAL_BUNPOU_N2_SEED),
    [],
  );
  const bunpouN1SeedItems = useMemo(
    () => parseBunpouN1Deck(INITIAL_BUNPOU_N1_SEED),
    [],
  );

  const [n5Cards, setN5Cards] = useState<AnkiCard[]>(n5SeedCards);
  const [n4Cards, setN4Cards] = useState<AnkiCard[]>(n4SeedCards);
  const [n3Cards, setN3Cards] = useState<AnkiCard[]>(n3SeedCards);
  const [n2Cards, setN2Cards] = useState<AnkiCard[]>(n2SeedCards);
  const [n1Cards, setN1Cards] = useState<AnkiCard[]>(n1SeedCards);
  const [bunpouN5Items, setBunpouN5Items] =
    useState<BunpouN2Item[]>(bunpouN5SeedItems);
  const [bunpouN4Items, setBunpouN4Items] =
    useState<BunpouN2Item[]>(bunpouN4SeedItems);
  const [bunpouN3Items, setBunpouN3Items] =
    useState<BunpouN2Item[]>(bunpouN3SeedItems);
  const [bunpouN2Items, setBunpouN2Items] =
    useState<BunpouN2Item[]>(bunpouN2SeedItems);
  const [bunpouN1Items, setBunpouN1Items] =
    useState<BunpouN2Item[]>(bunpouN1SeedItems);
  const [deckStatus, setDeckStatus] = useState<'loading' | 'ready' | 'fallback'>(
    'loading',
  );
  const [justCompletedSession, setJustCompletedSession] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [betaWelcomeOpen, setBetaWelcomeOpen] = useState(false);
  const [authReady, setAuthReady] = useState(() => autostartMode);
  const [needsAuth, setNeedsAuth] = useState(() => !autostartMode);
  const [authProfile, setAuthProfile] =
    useState<AuthenticatedUserProfile | null>(() =>
      autostartMode ? PREVIEW_PROFILE : null,
    );

  const [appState, setAppState] = useState<UtamagoAppStateV2>(() => {
    const loaded = loadUnifiedAppState();
    return {
      ...loaded,
      lastTab: resolveInitialTab(loaded.lastTab),
      onboarding: autostartMode
        ? {
            ...loaded.onboarding,
            completed: true,
            name: loaded.onboarding.name || PREVIEW_PROFILE.name,
            selfAssessedLevel:
              loaded.onboarding.selfAssessedLevel === 'N5'
                ? 'N2'
                : loaded.onboarding.selfAssessedLevel,
          }
        : loaded.onboarding,
    };
  });

  useTextScaleEffect(appState.textScale);

  const activeTab = appState.lastTab;
  const [tabHistory, setTabHistory] = useState<AppTab[]>([appState.lastTab]);
  const [homeFocusView, setHomeFocusView] = useState<'challenges' | null>(null);
  const [activeReportTab, setActiveReportTab] =
    useState<ReportTab>('n2-official');
  const [selectedTryOutLevel, setSelectedTryOutLevel] =
    useState<TryOutLevelOption | null>(null);
  const [selectedPacketId, setSelectedPacketId] = useState<string>(
    () => TRYOUT_N2_PACKETS[0].id,
  );
  const [packetOpened, setPacketOpened] = useState(false);
  const [activeFormPartId, setActiveFormPartId] =
    useState<TryOutPacketPartId | null>(null);
  const [tryoutSheetOpen, setTryoutSheetOpen] = useState(false);
  const [closeTryoutSheetSignal, setCloseTryoutSheetSignal] = useState(0);
  const [ankiModalOpen, setAnkiModalOpen] = useState(false);
  const [closeAnkiModalSignal, setCloseAnkiModalSignal] = useState(0);
  const [activeChallengeStage, setActiveChallengeStage] =
    useState<ChallengeStage | null>(null);
  const [challengeRunNonce, setChallengeRunNonce] = useState(0);
  const [challengeHasProgress, setChallengeHasProgress] = useState(false);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [difficultDrillOpen, setDifficultDrillOpen] = useState(false);
  const [writingStudioState, setWritingStudioState] = useState<{
    open: boolean;
    mode: WritingPracticeMode;
    seedText?: string;
  }>({ open: false, mode: 'kanji' });
  const [activeDailyDrill, setActiveDailyDrill] = useState<{
    stage: ChallengeStage;
    count: 5 | 10;
    shuffleIndex: number;
  } | null>(null);
  const [dailyDrillDoneDate, setDailyDrillDoneDate] = useState<string | null>(
    () => {
      try {
        return window.localStorage.getItem('utamago_daily_drill_done_date');
      } catch {
        return null;
      }
    },
  );

  const [exitConfirm, setExitConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    secondaryLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onSecondary?: () => void;
  } | null>(null);

  const activeUserIdRef = useRef<string | null>(
    autostartMode ? PREVIEW_PROFILE.uid : null,
  );
  const loadedUserIdRef = useRef<string | null>(null);

  // Sync unified state to user-scoped localStorage cleanly
  useEffect(() => {
    saveUnifiedAppState(appState, activeUserIdRef.current);
  }, [appState]);

  // Show Beta Tester welcome popup once per login session
  useEffect(() => {
    if (
      autostartMode ||
      needsAuth ||
      !authProfile ||
      authProfile.uid === PREVIEW_PROFILE.uid ||
      !appState.onboarding.completed
    ) {
      return;
    }
    const sessionKey = `utamago_beta_welcome_seen_${authProfile.uid}`;
    try {
      if (window.sessionStorage.getItem(sessionKey) === '1') return;
      window.sessionStorage.setItem(sessionKey, '1');
    } catch {
      // ignore storage errors in restricted contexts
    }
    setBetaWelcomeOpen(true);
  }, [autostartMode, needsAuth, authProfile, appState.onboarding.completed]);

  // Global tactile haptic feedback on all interactive buttons, tabs, and controls
  useEffect(() => {
    return attachGlobalHapticsListener();
  }, []);

  // Silent monthly keep-alive trigger so Catbox.moe N2 Choukai MP3s receive
  // lightweight access at least once every 25 days even on scale-to-zero hosting.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUDIO_KEEPALIVE_STORAGE_KEY);
      const lastPing = raw ? Number.parseInt(raw, 10) : 0;
      const now = Date.now();
      if (!Number.isFinite(lastPing) || now - lastPing >= AUDIO_KEEPALIVE_INTERVAL_MS) {
        window.localStorage.setItem(AUDIO_KEEPALIVE_STORAGE_KEY, String(now));
        void fetch('/api/audio/keepalive', { method: 'POST' }).catch(() => {});
      }
    } catch {
      // Ignore storage/network restrictions silently
    }
  }, []);

  const applyAuthenticatedProfile = useCallback(
    (profile: AuthenticatedUserProfile) => {
      const previousUid = activeUserIdRef.current;
      activeUserIdRef.current = profile.uid;
      setAuthProfile(profile);
      setNeedsAuth(false);
      setAuthReady(true);

      const shouldReloadScopedState = previousUid !== profile.uid;
      const baseStateForUser = shouldReloadScopedState
        ? loadUnifiedAppState(profile.uid)
        : null;

      setAppState((prev) => {
        const source = baseStateForUser ?? prev;
        return {
          ...source,
          lastTab: shouldReloadScopedState
            ? resolveInitialTab(source.lastTab)
            : prev.lastTab,
          onboarding: profile.onboardingCompleted
            ? {
                completed: true,
                name: profile.name || source.onboarding.name,
                gender: profile.gender,
                targetLevel: profile.targetLevel,
                selfAssessedLevel: profile.selfAssessedLevel,
                dailyMinutes: profile.dailyMinutes,
              }
            : {
                ...source.onboarding,
                completed: false,
                name: profile.name,
                gender: profile.gender,
                targetLevel: profile.targetLevel,
                selfAssessedLevel: profile.selfAssessedLevel,
                dailyMinutes: profile.dailyMinutes,
              },
        };
      });

      // Hydrate per-user Anki decks & SRS cards from Firestore when signed in to a real account
      if (
        profile.uid !== 'utamago-preview' &&
        loadedUserIdRef.current !== profile.uid
      ) {
        loadedUserIdRef.current = profile.uid;
        void loadUserAnkiFromFirestore(profile.uid)
          .then((remote) => {
            if (!remote || activeUserIdRef.current !== profile.uid) return;
            setAppState((prev) => {
              const merged = mergeAnkiSnapshots(
                prev.ankiSrs,
                prev.ankiEngine,
                remote,
              );
              const studiedSet = new Set(prev.ankiProgress.studiedIds);
              const againSet = new Set(prev.ankiProgress.againIds);
              for (const [cardId, record] of Object.entries(merged.srsMap)) {
                const st = resolveCardState(record);
                if (st !== 'new' && st !== 'suspended') {
                  studiedSet.add(cardId);
                }
                if (st === 'learning' || st === 'relearning') {
                  againSet.add(cardId);
                } else {
                  againSet.delete(cardId);
                }
              }
              return {
                ...prev,
                ankiSrs: merged.srsMap,
                ankiEngine: merged.engine,
                ankiProgress: {
                  studiedIds: Array.from(studiedSet),
                  againIds: Array.from(againSet),
                },
              };
            });
          })
          .catch(() => {
            // Offline or Firestore unavailable: localStorage cache remains active
          });
      }
    },
    [],
  );

  // Listen to Firebase Auth state and hydrate user profile from Firestore
  useEffect(() => {
    return initAccountAuth(
      (profile) => {
        applyAuthenticatedProfile(profile);
      },
      () => {
        if (autostartMode) {
          activeUserIdRef.current = PREVIEW_PROFILE.uid;
          setAuthProfile((prev) => prev ?? PREVIEW_PROFILE);
          setNeedsAuth(false);
          setAuthReady(true);
          return;
        }
        activeUserIdRef.current = null;
        loadedUserIdRef.current = null;
        setAuthProfile(null);
        setNeedsAuth(true);
        setAuthReady(true);
      },
    );
  }, [applyAuthenticatedProfile, autostartMode]);

  // Prevent copying text, saving files, or opening context menu outside editable fields
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        target.isContentEditable
      );
    };

    const handleCopyOrCut = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const handleDragStart = (event: DragEvent) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 's' || key === 'u') {
        event.preventDefault();
        return;
      }
      if ((key === 'c' || key === 'x' || key === 'a') && !isEditableTarget(event.target)) {
        event.preventDefault();
      }
    };

    document.addEventListener('copy', handleCopyOrCut);
    document.addEventListener('cut', handleCopyOrCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('copy', handleCopyOrCut);
      document.removeEventListener('cut', handleCopyOrCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // IndexedDB cache first, then background fetch fallback (Vocab N5–N1 + Bunpou N5–N1)
  useEffect(() => {
    let cancelled = false;

    async function loadDecks() {
      const [
        cachedN5,
        cachedN4,
        cachedN3,
        cachedN2,
        cachedN1,
        cachedBunpouN5,
        cachedBunpouN4,
        cachedBunpouN3,
        cachedBunpouN2,
        cachedBunpouN1,
      ] = await Promise.all([
        readCachedAnkiDeck('N5', DECK_CACHE_VERSION),
        readCachedAnkiDeck('N4', DECK_CACHE_VERSION),
        readCachedAnkiDeck('N3', DECK_CACHE_VERSION),
        readCachedAnkiDeck('N2', DECK_CACHE_VERSION),
        readCachedAnkiDeck('N1', DECK_CACHE_VERSION),
        readCachedAnkiDeck('N5_BUNPOU', DECK_CACHE_VERSION),
        readCachedAnkiDeck('N4_BUNPOU', DECK_CACHE_VERSION),
        readCachedAnkiDeck('N3_BUNPOU', DECK_CACHE_VERSION),
        readCachedAnkiDeck('N2_BUNPOU', DECK_CACHE_VERSION),
        readCachedAnkiDeck('N1_BUNPOU', DECK_CACHE_VERSION),
      ]);

      if (!cancelled && cachedN5) setN5Cards(cachedN5);
      if (!cancelled && cachedN4) setN4Cards(cachedN4);
      if (!cancelled && cachedN3) setN3Cards(cachedN3);
      if (!cancelled && cachedN2) setN2Cards(cachedN2);
      if (!cancelled && cachedN1) setN1Cards(cachedN1);
      if (!cancelled && cachedBunpouN5 && cachedBunpouN5.length > 0) {
        setBunpouN5Items(cachedBunpouN5.map(ankiCardToBunpouItem));
      }
      if (!cancelled && cachedBunpouN4 && cachedBunpouN4.length > 0) {
        setBunpouN4Items(cachedBunpouN4.map(ankiCardToBunpouItem));
      }
      if (!cancelled && cachedBunpouN3 && cachedBunpouN3.length > 0) {
        setBunpouN3Items(cachedBunpouN3.map(ankiCardToBunpouItem));
      }
      if (!cancelled && cachedBunpouN2 && cachedBunpouN2.length > 0) {
        setBunpouN2Items(cachedBunpouN2.map(ankiCardToBunpouItem));
      }
      if (!cancelled && cachedBunpouN1 && cachedBunpouN1.length > 0) {
        setBunpouN1Items(cachedBunpouN1.map(ankiCardToBunpouItem));
      }

      if (
        !cancelled &&
        cachedN5 &&
        cachedN4 &&
        cachedN3 &&
        cachedN2 &&
        cachedN1 &&
        cachedBunpouN5 &&
        cachedBunpouN5.length > 0 &&
        cachedBunpouN4 &&
        cachedBunpouN4.length > 0 &&
        cachedBunpouN3 &&
        cachedBunpouN3.length > 0 &&
        cachedBunpouN2 &&
        cachedBunpouN2.length > 0 &&
        cachedBunpouN1 &&
        cachedBunpouN1.length > 0
      ) {
        setDeckStatus('ready');
        return;
      }

      try {
        const [
          n5Res,
          n4Res,
          n3Res,
          n2Res,
          n1Res,
          bunpouN5Res,
          bunpouN4Res,
          bunpouN3Res,
          bunpouN2Res,
          bunpouN1Res,
        ] = await Promise.all([
          cachedN5 ? Promise.resolve(null) : fetch(ANKI_N5_DECK_URL),
          cachedN4 ? Promise.resolve(null) : fetch(ANKI_N4_DECK_URL),
          cachedN3 ? Promise.resolve(null) : fetch(ANKI_N3_DECK_URL),
          cachedN2 ? Promise.resolve(null) : fetch(ANKI_N2_DECK_URL),
          cachedN1 ? Promise.resolve(null) : fetch(ANKI_N1_DECK_URL),
          cachedBunpouN5 ? Promise.resolve(null) : fetch(BUNPOU_N5_TEXT_URL),
          cachedBunpouN4 ? Promise.resolve(null) : fetch(BUNPOU_N4_TEXT_URL),
          cachedBunpouN3 ? Promise.resolve(null) : fetch(BUNPOU_N3_TEXT_URL),
          cachedBunpouN2 ? Promise.resolve(null) : fetch(BUNPOU_N2_TEXT_URL),
          cachedBunpouN1 ? Promise.resolve(null) : fetch(BUNPOU_N1_TEXT_URL),
        ]);

        let allOk = true;

        const vocabTasks: Array<{
          res: Response | null;
          id: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
          setter: (cards: AnkiCard[]) => void;
        }> = [
          { res: n5Res, id: 'N5', setter: setN5Cards },
          { res: n4Res, id: 'N4', setter: setN4Cards },
          { res: n3Res, id: 'N3', setter: setN3Cards },
          { res: n2Res, id: 'N2', setter: setN2Cards },
          { res: n1Res, id: 'N1', setter: setN1Cards },
        ];

        for (const task of vocabTasks) {
          if (!task.res) continue;
          if (task.res.ok) {
            const parsed = parseAnkiTxtDeck(await task.res.text());
            if (!cancelled && parsed.length > 0) {
              task.setter(parsed);
              void writeCachedAnkiDeck(task.id, DECK_CACHE_VERSION, parsed);
            }
          } else {
            allOk = false;
          }
        }

        const bunpouTasks: Array<{
          res: Response | null;
          id:
            | 'N5_BUNPOU'
            | 'N4_BUNPOU'
            | 'N3_BUNPOU'
            | 'N2_BUNPOU'
            | 'N1_BUNPOU';
          parse: (raw: string) => BunpouN2Item[];
          setter: (items: BunpouN2Item[]) => void;
        }> = [
          {
            res: bunpouN5Res,
            id: 'N5_BUNPOU',
            parse: parseBunpouN5Deck,
            setter: setBunpouN5Items,
          },
          {
            res: bunpouN4Res,
            id: 'N4_BUNPOU',
            parse: parseBunpouN4Deck,
            setter: setBunpouN4Items,
          },
          {
            res: bunpouN3Res,
            id: 'N3_BUNPOU',
            parse: parseBunpouN3Deck,
            setter: setBunpouN3Items,
          },
          {
            res: bunpouN2Res,
            id: 'N2_BUNPOU',
            parse: parseBunpouN2Deck,
            setter: setBunpouN2Items,
          },
          {
            res: bunpouN1Res,
            id: 'N1_BUNPOU',
            parse: parseBunpouN1Deck,
            setter: setBunpouN1Items,
          },
        ];

        for (const task of bunpouTasks) {
          if (!task.res) continue;
          if (task.res.ok) {
            const parsedItems = task.parse(await task.res.text());
            if (!cancelled && parsedItems.length > 0) {
              task.setter(parsedItems);
              void writeCachedAnkiDeck(
                task.id,
                DECK_CACHE_VERSION,
                parsedItems.map(bunpouItemToAnkiCard),
              );
            }
          } else {
            allOk = false;
          }
        }

        if (!cancelled) {
          setDeckStatus(allOk ? 'ready' : 'fallback');
        }
      } catch {
        if (!cancelled) {
          setDeckStatus(
            cachedN5 ||
              cachedN4 ||
              cachedN3 ||
              cachedN2 ||
              cachedN1 ||
              cachedBunpouN5 ||
              cachedBunpouN4 ||
              cachedBunpouN3 ||
              cachedBunpouN2 ||
              cachedBunpouN1
              ? 'ready'
              : 'fallback',
          );
        }
      }
    }

    void loadDecks();
    return () => {
      cancelled = true;
    };
  }, []);

  // Periodic local reminder check (Browser Notification API fallback for Capacitor)
  useEffect(() => {
    if (!appState.reminder.enabled) return;

    const checkReminder = async () => {
      const todayKey = getLocalDateKey();
      if (!shouldFireReminderNow(appState.reminder, new Date(), todayKey)) {
        return;
      }
      const adapter = getNotificationAdapter();
      const sent = await adapter.sendImmediateNotification(
        'Saatnya Belajar JLPT di UtamaGo!',
        `Target ${appState.onboarding.dailyMinutes} menit/hari (${appState.onboarding.targetLevel}). Ayo jaga streak belajarmu!`,
      );
      if (sent) {
        setAppState((prev) => ({
          ...prev,
          reminder: { ...prev.reminder, lastNotifiedDate: todayKey },
        }));
      }
    };

    void checkReminder();
    const interval = window.setInterval(() => {
      void checkReminder();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [appState.reminder, appState.onboarding]);

  const historyDepthRef = useRef(0);
  const suppressPopRef = useRef(0);
  const tryOutBaselineRef = useRef<{
    packetId: string;
    partId: TryOutPacketPartId;
    answers: Record<string, string>;
    flaggedIds: string[];
    elapsedSeconds: number;
    choukaiAudio: { currentTime: number; playbackRate: number };
  } | null>(null);
  const tryoutDiscardLockRef = useRef<{
    packetId: string;
    partId: TryOutPacketPartId;
  } | null>(null);

  const activePacketState = useMemo(
    () => getPacketState(appState, selectedPacketId),
    [appState, selectedPacketId],
  );
  const firstPacketState = useMemo(
    () => getPacketState(appState, 'n2-1'),
    [appState],
  );

  const updatePacketState = useCallback(
    (
      prev: UtamagoAppStateV2,
      packetId: string,
      updater: (slice: StoredTryOutPacketState) => StoredTryOutPacketState,
    ): UtamagoAppStateV2 => {
      const currentSlice = getPacketState(prev, packetId);
      const nextSlice = updater(currentSlice);
      const nextPackets = {
        ...prev.packetsProgress,
        [packetId]: nextSlice,
      };
      if (packetId === 'n2-1') {
        return {
          ...prev,
          packetProgress: nextSlice.packetProgress,
          tryoutTimers: nextSlice.tryoutTimers,
          tryoutFlaggedIds: nextSlice.tryoutFlaggedIds,
          choukaiAudio: nextSlice.choukaiAudio,
          packetsProgress: nextPackets,
        };
      }
      return {
        ...prev,
        packetsProgress: nextPackets,
      };
    },
    [],
  );

  const captureTryOutBaseline = useCallback(
    (
      packetId: string,
      partId: TryOutPacketPartId,
      slice: StoredTryOutPacketState,
    ) => {
      tryoutDiscardLockRef.current = null;
      tryOutBaselineRef.current = {
        packetId,
        partId,
        answers: { ...(slice.packetProgress.answersByPart[partId] ?? {}) },
        flaggedIds: [...(slice.tryoutFlaggedIds[partId] ?? [])],
        elapsedSeconds: slice.tryoutTimers[partId] ?? 0,
        choukaiAudio: { ...slice.choukaiAudio },
      };
    },
    [],
  );

  // Ref for Android Back button (Capacitor App + browser history/popstate)
  const navSnapshotRef = useRef({
    exitConfirm,
    settingsOpen,
    feedbackModalOpen,
    betaWelcomeOpen,
    tryoutSheetOpen,
    ankiModalOpen,
    activeChallengeStage,
    challengeHasProgress,
    activeTab,
    homeFocusView,
    selectedPacketId,
    activeFormPartId,
    packetOpened,
    selectedTryOutLevel,
    submittedParts: activePacketState.packetProgress.submittedIds,
    tabHistory,
  });
  navSnapshotRef.current = {
    exitConfirm,
    settingsOpen,
    feedbackModalOpen,
    betaWelcomeOpen,
    tryoutSheetOpen,
    ankiModalOpen,
    activeChallengeStage,
    challengeHasProgress,
    activeTab,
    homeFocusView,
    selectedPacketId,
    activeFormPartId,
    packetOpened,
    selectedTryOutLevel,
    submittedParts: activePacketState.packetProgress.submittedIds,
    tabHistory,
  };

  const pushNavHistory = useCallback((tag: string) => {
    if (Capacitor.isNativePlatform() || typeof window === 'undefined') return;
    window.history.pushState({ utamagoLayer: tag }, '');
    historyDepthRef.current += 1;
  }, []);

  const popHistoryOnUiClose = useCallback(() => {
    if (
      Capacitor.isNativePlatform() ||
      typeof window === 'undefined' ||
      historyDepthRef.current <= 0
    ) {
      return;
    }
    historyDepthRef.current = Math.max(0, historyDepthRef.current - 1);
    suppressPopRef.current += 1;
    window.history.back();
  }, []);

  const requestTryOutExit = useCallback(
    (
      afterExit: () => void,
      options?: { fromPopstate?: boolean },
    ): boolean => {
      const snap = navSnapshotRef.current;
      if (
        snap.activeTab !== 'tryout' ||
        !snap.activeFormPartId ||
        snap.submittedParts.includes(snap.activeFormPartId)
      ) {
        return false;
      }

      const targetPacketId = snap.selectedPacketId;
      const targetPartId = snap.activeFormPartId;

      if (options?.fromPopstate) {
        pushNavHistory('tryout-guard');
      }

      setExitConfirm({
        title: 'Keluar dari Try Out JLPT?',
        description:
          'Kamu sedang mengerjakan soal Try Out yang belum dikumpulkan. Apakah progres jawaban dan waktu pengerjaan ingin disimpan?',
        confirmLabel: 'Simpan & Keluar',
        secondaryLabel: 'Keluar Tanpa Simpan',
        cancelLabel: 'Lanjut Mengerjakan',
        onConfirm: () => {
          tryoutDiscardLockRef.current = null;
          tryOutBaselineRef.current = null;
          setExitConfirm(null);
          setActiveFormPartId(null);
          afterExit();
        },
        onSecondary: () => {
          tryoutDiscardLockRef.current = {
            packetId: targetPacketId,
            partId: targetPartId,
          };
          const baseline = tryOutBaselineRef.current;
          tryOutBaselineRef.current = null;

          if (
            baseline &&
            baseline.packetId === targetPacketId &&
            baseline.partId === targetPartId
          ) {
            setAppState((prev) =>
              updatePacketState(prev, targetPacketId, (slice) => ({
                ...slice,
                packetProgress: {
                  ...slice.packetProgress,
                  answersByPart: {
                    ...slice.packetProgress.answersByPart,
                    [targetPartId]: { ...baseline.answers },
                  },
                },
                tryoutFlaggedIds: {
                  ...slice.tryoutFlaggedIds,
                  [targetPartId]: [...baseline.flaggedIds],
                },
                tryoutTimers: {
                  ...slice.tryoutTimers,
                  [targetPartId]: baseline.elapsedSeconds,
                },
                choukaiAudio: { ...baseline.choukaiAudio },
              })),
            );
          }

          setExitConfirm(null);
          setActiveFormPartId(null);
          afterExit();
          window.setTimeout(() => {
            if (
              tryoutDiscardLockRef.current?.packetId === targetPacketId &&
              tryoutDiscardLockRef.current?.partId === targetPartId
            ) {
              tryoutDiscardLockRef.current = null;
            }
          }, 0);
        },
      });

      return true;
    },
    [pushNavHistory, updatePacketState],
  );

  const handleBackNavigation = useCallback(
    (source: 'popstate' | 'capacitor') => {
      const snap = navSnapshotRef.current;

      // 1. Close confirmation modal first if open
      if (snap.exitConfirm) {
        setExitConfirm(null);
        return;
      }

      // 1a. Close Beta Feedback modal if open
      if (snap.feedbackModalOpen) {
        setFeedbackModalOpen(false);
        return;
      }

      // 1a-2. Close Beta Welcome popup if open
      if (snap.betaWelcomeOpen) {
        setBetaWelcomeOpen(false);
        return;
      }

      // 1b. Close Settings modal if open
      if (snap.settingsOpen) {
        setSettingsOpen(false);
        return;
      }

      // 1b. Close Try Out fullscreen sheet viewer if open
      if (snap.tryoutSheetOpen) {
        setCloseTryoutSheetSignal((n) => n + 1);
        setTryoutSheetOpen(false);
        return;
      }

      // 1c. Close Anki pop-up flashcard modal if open
      if (snap.ankiModalOpen) {
        setCloseAnkiModalSignal((n) => n + 1);
        setAnkiModalOpen(false);
        return;
      }

      // 2. If inside active Challenge modal
      if (snap.activeChallengeStage) {
        if (snap.challengeHasProgress) {
          if (source === 'popstate') {
            pushNavHistory('challenge-guard');
          }
          setExitConfirm({
            title: 'Keluar dari Tantangan?',
            description:
              'Progres soal pada level ini belum disimpan sebelum selesai. Yakin ingin keluar?',
            confirmLabel: 'Ya, Keluar',
            onConfirm: () => {
              setExitConfirm(null);
              setChallengeHasProgress(false);
              setActiveChallengeStage(null);
              popHistoryOnUiClose();
            },
          });
        } else {
          setActiveChallengeStage(null);
        }
        return;
      }

      // 3. If inside Try Out Form sub-screen
      if (snap.activeTab === 'tryout' && snap.activeFormPartId) {
        if (
          requestTryOutExit(
            () => {
              if (source === 'popstate') {
                popHistoryOnUiClose();
              }
            },
            { fromPopstate: source === 'popstate' },
          )
        ) {
          return;
        }
        setActiveFormPartId(null);
        return;
      }

      // 4. Step back from Try Out packet parts list to packet catalog
      if (snap.activeTab === 'tryout' && snap.packetOpened) {
        setPacketOpened(false);
        return;
      }

      // 5. Step back from packet catalog to Try Out level selector
      if (snap.activeTab === 'tryout' && snap.selectedTryOutLevel) {
        setSelectedTryOutLevel(null);
        return;
      }

      // 6. Step back from Home focus view (Tantangan Level) to Beranda
      if (snap.activeTab === 'home' && snap.homeFocusView !== null) {
        setHomeFocusView(null);
        return;
      }

      // 7. Step back to previous tab if navigated across tabs
      if (snap.tabHistory.length > 1) {
        const nextHistory = snap.tabHistory.slice(0, -1);
        const prevTab = nextHistory[nextHistory.length - 1] ?? 'home';
        setTabHistory(nextHistory);
        setAppState((prev) => ({ ...prev, lastTab: prevTab }));
        return;
      }

      // 8. At root screen on Capacitor Android: exit app gracefully
      if (source === 'capacitor') {
        void CapApp.exitApp();
      }
    },
    [popHistoryOnUiClose, pushNavHistory, requestTryOutExit],
  );

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      let removed = false;
      const listenerPromise = CapApp.addListener('backButton', () => {
        handleBackNavigation('capacitor');
      });
      return () => {
        removed = true;
        void listenerPromise.then((handle) => {
          if (removed) void handle.remove();
        });
      };
    }

    if (typeof window === 'undefined') return;
    if (!window.history.state?.utamagoRoot) {
      window.history.replaceState({ utamagoRoot: true }, '');
    }

    const handlePopState = () => {
      if (suppressPopRef.current > 0) {
        suppressPopRef.current -= 1;
        return;
      }
      historyDepthRef.current = Math.max(0, historyDepthRef.current - 1);
      handleBackNavigation('popstate');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleBackNavigation]);

  const levelProgress = useMemo(
    () =>
      getLevelProgress(
        appState.gameProgress.totalXp,
        appState.onboarding.gender,
      ),
    [appState.gameProgress.totalXp, appState.onboarding.gender],
  );
  const bunpouN5AnkiCards = useMemo(
    () => bunpouN5Items.map(bunpouItemToAnkiCard),
    [bunpouN5Items],
  );
  const bunpouN4AnkiCards = useMemo(
    () => bunpouN4Items.map(bunpouItemToAnkiCard),
    [bunpouN4Items],
  );
  const bunpouN3AnkiCards = useMemo(
    () => bunpouN3Items.map(bunpouItemToAnkiCard),
    [bunpouN3Items],
  );
  const bunpouAnkiCards = useMemo(
    () => bunpouN2Items.map(bunpouItemToAnkiCard),
    [bunpouN2Items],
  );
  const bunpouN1AnkiCards = useMemo(
    () => bunpouN1Items.map(bunpouItemToAnkiCard),
    [bunpouN1Items],
  );

  const unlockedAnkiCards = useMemo(() => {
    const cards = [...n5Cards, ...bunpouN5AnkiCards];
    if (isJlptLevelUnlocked('N4', appState.onboarding.selfAssessedLevel)) {
      cards.push(...n4Cards, ...bunpouN4AnkiCards);
    }
    if (isJlptLevelUnlocked('N3', appState.onboarding.selfAssessedLevel)) {
      cards.push(...n3Cards, ...bunpouN3AnkiCards);
    }
    if (isJlptLevelUnlocked('N2', appState.onboarding.selfAssessedLevel)) {
      cards.push(...n2Cards, ...bunpouAnkiCards);
    }
    if (isJlptLevelUnlocked('N1', appState.onboarding.selfAssessedLevel)) {
      cards.push(...n1Cards, ...bunpouN1AnkiCards);
    }
    return cards;
  }, [
    n5Cards,
    n4Cards,
    n3Cards,
    n2Cards,
    n1Cards,
    bunpouN5AnkiCards,
    bunpouN4AnkiCards,
    bunpouN3AnkiCards,
    bunpouAnkiCards,
    bunpouN1AnkiCards,
    appState.onboarding.selfAssessedLevel,
  ]);

  const allVocabCards = useMemo(
    () => [...n5Cards, ...n4Cards, ...n3Cards, ...n2Cards, ...n1Cards],
    [n5Cards, n4Cards, n3Cards, n2Cards, n1Cards],
  );

  const allBunpouItems = useMemo(
    () => [
      ...bunpouN5Items,
      ...bunpouN4Items,
      ...bunpouN3Items,
      ...bunpouN2Items,
      ...bunpouN1Items,
    ],
    [bunpouN5Items, bunpouN4Items, bunpouN3Items, bunpouN2Items, bunpouN1Items],
  );

  const unlockedBunpouItems = useMemo(() => {
    const items: BunpouN2Item[] = [...bunpouN5Items];
    const unlocked = appState.onboarding.selfAssessedLevel;
    if (isJlptLevelUnlocked('N4', unlocked)) items.push(...bunpouN4Items);
    if (isJlptLevelUnlocked('N3', unlocked)) items.push(...bunpouN3Items);
    if (isJlptLevelUnlocked('N2', unlocked)) items.push(...bunpouN2Items);
    if (isJlptLevelUnlocked('N1', unlocked)) items.push(...bunpouN1Items);
    return items;
  }, [
    bunpouN5Items,
    bunpouN4Items,
    bunpouN3Items,
    bunpouN2Items,
    bunpouN1Items,
    appState.onboarding.selfAssessedLevel,
  ]);

  const difficultCards = useMemo(
    () =>
      getDifficultAnkiCards(
        unlockedAnkiCards,
        appState.ankiSrs,
        appState.ankiProgress.againIds,
      ),
    [unlockedAnkiCards, appState.ankiSrs, appState.ankiProgress.againIds],
  );

  const difficultCardIdSet = useMemo(
    () => new Set(difficultCards.map((entry) => entry.card.id)),
    [difficultCards],
  );

  const weaknessReport = useMemo(
    () =>
      analyzeJlptWeaknesses({
        unlockedLevel: appState.onboarding.selfAssessedLevel,
        unlockedAnkiCards,
        ankiSrs: appState.ankiSrs,
        againIds: appState.ankiProgress.againIds,
        packetsProgress: appState.packetsProgress,
        fallbackFirstPacket: firstPacketState,
        bunpouByLevel: {
          N5: bunpouN5Items,
          N4: bunpouN4Items,
          N3: bunpouN3Items,
          N2: bunpouN2Items,
          N1: bunpouN1Items,
        },
        reviewedLessonIds: appState.activityLog.reviewedLessonIds,
      }),
    [
      appState.onboarding.selfAssessedLevel,
      unlockedAnkiCards,
      appState.ankiSrs,
      appState.ankiProgress.againIds,
      appState.packetsProgress,
      firstPacketState,
      bunpouN5Items,
      bunpouN4Items,
      bunpouN3Items,
      bunpouN2Items,
      bunpouN1Items,
      appState.activityLog.reviewedLessonIds,
    ],
  );

  const allCampaignStageIds = useMemo(
    () => CHALLENGE_STAGES.map((s) => s.id),
    [],
  );

  // Merge legacy defeatedBosses into completedLevels so prior Boss wins seamlessly unlock the next chapter
  const mergedCompletedLevels = useMemo<Record<string, CompletedLevelRecord>>(() => {
    const base = { ...appState.gameProgress.completedLevels };
    const defeatedBosses = appState.gameProgress.arcadeRecords?.defeatedBosses ?? {};
    for (const [bossId, rec] of Object.entries(defeatedBosses)) {
      const existing = base[bossId];
      if (!existing || rec.stars > existing.stars) {
        base[bossId] = rec;
      }
    }
    return base;
  }, [
    appState.gameProgress.completedLevels,
    appState.gameProgress.arcadeRecords?.defeatedBosses,
  ]);

  // Highest JLPT tier unlocked either via defeating chapter Bosses OR via profile selfAssessedLevel
  const arenaUnlockedLevel = useMemo<JlptLevel>(() => {
    let highestIdx = JLPT_LEVELS_ASC.indexOf(
      appState.onboarding.selfAssessedLevel,
    );
    CHALLENGE_STAGES.forEach((stage, idx) => {
      if (isStageUnlocked(idx, allCampaignStageIds, mergedCompletedLevels)) {
        const lvIdx = JLPT_LEVELS_ASC.indexOf(stage.jlptLevel);
        if (lvIdx > highestIdx) highestIdx = lvIdx;
      }
    });
    return JLPT_LEVELS_ASC[Math.max(0, highestIdx)] ?? 'N5';
  }, [
    allCampaignStageIds,
    appState.onboarding.selfAssessedLevel,
    mergedCompletedLevels,
  ]);

  const totalStars = useMemo(
    () => getTotalStarsEarned(mergedCompletedLevels),
    [mergedCompletedLevels],
  );
  const completedCampaignStagesCount = useMemo(
    () =>
      CHALLENGE_STAGES.filter((s) => Boolean(mergedCompletedLevels[s.id])).length,
    [mergedCompletedLevels],
  );
  const maxStars = CHALLENGE_STAGES.length * 3;
  const totalAnkiDeckCount = unlockedAnkiCards.length;

  const deckCardsById = useMemo<Record<AnkiDeckId, AnkiCard[]>>(
    () => ({
      N5: selectCardsForDeck('N5', n5Cards),
      N4: selectCardsForDeck('N4', n4Cards),
      N3: selectCardsForDeck('N3', n3Cards),
      N2: selectCardsForDeck('N2', n2Cards),
      N1: selectCardsForDeck('N1', n1Cards),
      N5_BUNPOU: selectCardsForDeck('N5_BUNPOU', bunpouN5AnkiCards),
      N4_BUNPOU: selectCardsForDeck('N4_BUNPOU', bunpouN4AnkiCards),
      N3_BUNPOU: selectCardsForDeck('N3_BUNPOU', bunpouN3AnkiCards),
      N2_BUNPOU: selectCardsForDeck('N2_BUNPOU', bunpouAnkiCards),
      N1_BUNPOU: selectCardsForDeck('N1_BUNPOU', bunpouN1AnkiCards),
    }),
    [
      n5Cards,
      n4Cards,
      n3Cards,
      n2Cards,
      n1Cards,
      bunpouN5AnkiCards,
      bunpouN4AnkiCards,
      bunpouN3AnkiCards,
      bunpouAnkiCards,
      bunpouN1AnkiCards,
    ],
  );

  const dueAnkiCount = useMemo(() => {
    const unlockedLvl = appState.onboarding.selfAssessedLevel;
    let totalDue = 0;
    for (const id of ALL_ANKI_DECK_IDS) {
      const cards = deckCardsById[id];
      if (cards.length === 0) continue;
      const lvl = id.replace('_BUNPOU', '') as 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
      if (!isJlptLevelUnlocked(lvl, unlockedLvl)) continue;
      const settings = getEffectiveDeckSettings(appState.ankiEngine, id);
      const stats = computeDeckStatistics(
        id,
        cards,
        appState.ankiSrs,
        settings,
        appState.ankiEngine.deckDaily[id],
      );
      totalDue += stats.dueTodayCount;
    }
    return totalDue;
  }, [
    deckCardsById,
    appState.onboarding.selfAssessedLevel,
    appState.ankiSrs,
    appState.ankiEngine,
  ]);

  const learnedAnkiCount = useMemo(() => {
    let count = 0;
    for (const card of unlockedAnkiCards) {
      const st = resolveCardState(appState.ankiSrs[card.id]);
      if (st === 'learning' || st === 'review' || st === 'relearning') {
        count += 1;
      }
    }
    return count;
  }, [unlockedAnkiCards, appState.ankiSrs]);

  const equivalentEstimate = useMemo(
    () =>
      estimateEquivalentJlptLevel({
        packetsProgress: appState.packetsProgress,
        fallbackFirstPacket: firstPacketState,
        latestReport: appState.latestReport,
      }),
    [appState.latestReport, appState.packetsProgress, firstPacketState],
  );

  const handleSelectTab = useCallback(
    (tab: AppTab) => {
      if (tab === 'home' && homeFocusView !== null) {
        setHomeFocusView(null);
      }
      if (tab === activeTab) return;

      const navigateToTab = () => {
        pushNavHistory(`tab-${tab}`);
        setHomeFocusView(null);
        setTabHistory((prev) => [...prev.slice(-9), tab]);
        setAppState((prev) => ({ ...prev, lastTab: tab }));
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      };

      if (requestTryOutExit(navigateToTab)) {
        return;
      }

      navigateToTab();
    },
    [activeTab, homeFocusView, pushNavHistory, requestTryOutExit],
  );

  const handleOpenHomeFocus = useCallback(
    (view: 'challenges') => {
      pushNavHistory(`home-${view}`);
      setHomeFocusView(view);
      if (activeTab !== 'home') {
        setTabHistory((prev) => [...prev.slice(-9), 'home']);
        setAppState((prev) => ({ ...prev, lastTab: 'home' }));
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    },
    [activeTab, pushNavHistory],
  );

  const handleCloseHomeFocus = useCallback(() => {
    setHomeFocusView(null);
    popHistoryOnUiClose();
  }, [popHistoryOnUiClose]);

  const handleOpenTryOut = useCallback(() => {
    handleSelectTab('tryout');
  }, [handleSelectTab]);

  const handleOpenSettings = useCallback(() => {
    if (!settingsOpen) {
      pushNavHistory('settings');
      setSettingsOpen(true);
    }
  }, [pushNavHistory, settingsOpen]);

  const handleCloseSettings = useCallback(() => {
    if (settingsOpen) {
      setSettingsOpen(false);
      popHistoryOnUiClose();
    }
  }, [popHistoryOnUiClose, settingsOpen]);

  const handleLoginSuccess = useCallback(
    (profile: AuthenticatedUserProfile) => {
      applyAuthenticatedProfile(profile);
    },
    [applyAuthenticatedProfile],
  );

  const handleLogout = useCallback(() => {
    void logoutAccount();
    activeUserIdRef.current = null;
    loadedUserIdRef.current = null;
    setAuthProfile(null);
    setNeedsAuth(true);
    setSettingsOpen(false);
    setFeedbackModalOpen(false);
    setBetaWelcomeOpen(false);
    // Clear in-memory state immediately so the next account starts completely isolated
    setAppState(createDefaultAppState());
  }, []);

  const prepareCampaignStage = useCallback(
    (stage: ChallengeStage): ChallengeStage => {
      if (stage.stageKind === 'blitz-mission') {
        const dynamicQuestions = generateArenaQuestionBatch({
          level: stage.jlptLevel,
          ankiCards: allVocabCards,
          bunpouItems: allBunpouItems,
          seedSalt: `${stage.id}-${Date.now()}`,
          count: 42,
          mode: 'blitz',
          wave: 1,
        });
        return {
          ...stage,
          questions:
            dynamicQuestions.length >= 10 ? dynamicQuestions : stage.questions,
        };
      }
      return stage;
    },
    [allBunpouItems, allVocabCards],
  );

  const handleStartChallenge = useCallback(
    (stage: ChallengeStage) => {
      const stageIdx = CHALLENGE_STAGES.findIndex((s) => s.id === stage.id);
      if (
        stageIdx >= 0 &&
        !isStageUnlocked(stageIdx, allCampaignStageIds, mergedCompletedLevels)
      ) {
        return;
      }
      const prepared = prepareCampaignStage(stage);
      pushNavHistory(`challenge-${prepared.id}`);
      setChallengeHasProgress(false);
      setChallengeRunNonce((n) => n + 1);
      setActiveChallengeStage(prepared);
    },
    [
      allCampaignStageIds,
      mergedCompletedLevels,
      prepareCampaignStage,
      pushNavHistory,
    ],
  );

  const handleAttemptCloseChallenge = useCallback(() => {
    if (challengeHasProgress) {
      setExitConfirm({
        title: 'Keluar dari Tantangan?',
        description:
          'Progres soal pada level ini belum disimpan sebelum selesai. Yakin ingin keluar?',
        confirmLabel: 'Ya, Keluar',
        onConfirm: () => {
          setExitConfirm(null);
          setChallengeHasProgress(false);
          setActiveChallengeStage(null);
          popHistoryOnUiClose();
        },
      });
    } else {
      setActiveChallengeStage(null);
      popHistoryOnUiClose();
    }
  }, [challengeHasProgress, popHistoryOnUiClose]);

  const handleSelectedTryOutLevelChange = useCallback(
    (level: TryOutLevelOption | null) => {
      if (level && !selectedTryOutLevel) {
        pushNavHistory(`tryout-level-${level}`);
      } else if (!level && selectedTryOutLevel) {
        setPacketOpened(false);
        popHistoryOnUiClose();
      }
      setSelectedTryOutLevel(level);
    },
    [popHistoryOnUiClose, pushNavHistory, selectedTryOutLevel],
  );

  const handlePacketOpenedChange = useCallback(
    (open: boolean) => {
      if (open && !packetOpened) {
        pushNavHistory('tryout-packet');
      } else if (!open && packetOpened) {
        popHistoryOnUiClose();
      }
      setPacketOpened(open);
    },
    [packetOpened, popHistoryOnUiClose, pushNavHistory],
  );

  const handleReportTabChange = useCallback(
    (nextTab: ReportTab) => {
      if (
        requestTryOutExit(() => {
          setActiveReportTab(nextTab);
        })
      ) {
        return;
      }
      setActiveFormPartId(null);
      setActiveReportTab(nextTab);
    },
    [requestTryOutExit],
  );

  const handleActiveFormPartChange = useCallback(
    (partId: TryOutPacketPartId | null) => {
      if (partId) {
        captureTryOutBaseline(selectedPacketId, partId, activePacketState);
        if (!activeFormPartId) {
          pushNavHistory(`tryout-part-${partId}`);
        }
        setActiveFormPartId(partId);
        return;
      }

      if (
        requestTryOutExit(() => {
          popHistoryOnUiClose();
        })
      ) {
        return;
      }

      if (activeFormPartId) {
        popHistoryOnUiClose();
      }
      setActiveFormPartId(null);
    },
    [
      activeFormPartId,
      activePacketState,
      captureTryOutBaseline,
      popHistoryOnUiClose,
      pushNavHistory,
      requestTryOutExit,
      selectedPacketId,
    ],
  );

  const handleSheetViewerOpenChange = useCallback(
    (open: boolean) => {
      if (open && !tryoutSheetOpen) {
        pushNavHistory('tryout-sheet');
      } else if (!open && tryoutSheetOpen) {
        popHistoryOnUiClose();
      }
      setTryoutSheetOpen(open);
    },
    [popHistoryOnUiClose, pushNavHistory, tryoutSheetOpen],
  );

  const handleAnkiModalOpenChange = useCallback(
    (open: boolean) => {
      if (open && !ankiModalOpen) {
        pushNavHistory('anki-modal');
      } else if (!open && ankiModalOpen) {
        popHistoryOnUiClose();
      }
      setAnkiModalOpen(open);
    },
    [ankiModalOpen, popHistoryOnUiClose, pushNavHistory],
  );

  const handleCompleteOnboarding = useCallback(
    async (settings: {
      name: string;
      gender: LearnerGender;
      targetLevel: OnboardingSettings['targetLevel'];
      selfAssessedLevel: OnboardingSettings['selfAssessedLevel'];
      dailyMinutes: number;
      enableReminder: boolean;
    }) => {
      let reminderEnabled = false;
      if (settings.enableReminder) {
        const adapter = getNotificationAdapter();
        if (adapter.isSupported()) {
          const perm = await adapter.requestPermission();
          reminderEnabled = perm === 'granted';
        }
      }

      setAppState((prev) => {
        const nextReminder = {
          ...prev.reminder,
          enabled: reminderEnabled,
        };
        if (reminderEnabled) {
          void getNotificationAdapter().scheduleDailyReminder(nextReminder);
        }
        return {
          ...prev,
          onboarding: {
            completed: true,
            name: settings.name,
            gender: settings.gender,
            targetLevel: settings.targetLevel,
            selfAssessedLevel: settings.selfAssessedLevel,
            dailyMinutes: settings.dailyMinutes,
          },
          reminder: nextReminder,
        };
      });

      if (authProfile) {
        setAuthProfile((prev) =>
          prev
            ? {
                ...prev,
                name: settings.name,
                gender: settings.gender,
                targetLevel: settings.targetLevel,
                selfAssessedLevel: settings.selfAssessedLevel,
                dailyMinutes: settings.dailyMinutes,
                onboardingCompleted: true,
              }
            : prev,
        );
        if (authProfile.uid !== 'utamago-preview') {
          void syncUserProfileToFirestore(authProfile.uid, {
            name: settings.name,
            gender: settings.gender,
            targetLevel: settings.targetLevel,
            selfAssessedLevel: settings.selfAssessedLevel,
            dailyMinutes: settings.dailyMinutes,
            onboardingCompleted: true,
          }).catch(() => {});
        }
      }
    },
    [authProfile],
  );

  // Debounced sync when profile fields (name, gender, level) change after onboarding
  useEffect(() => {
    if (
      !authProfile ||
      authProfile.uid === 'utamago-preview' ||
      !appState.onboarding.completed
    ) {
      return;
    }
    const {
      name,
      gender,
      selfAssessedLevel,
      targetLevel,
      dailyMinutes,
      completed,
    } = appState.onboarding;
    if (
      authProfile.name === name &&
      authProfile.gender === gender &&
      authProfile.selfAssessedLevel === selfAssessedLevel &&
      authProfile.targetLevel === targetLevel &&
      authProfile.dailyMinutes === dailyMinutes &&
      authProfile.onboardingCompleted === completed
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void syncUserProfileToFirestore(authProfile.uid, {
        name,
        gender,
        selfAssessedLevel,
        targetLevel,
        dailyMinutes,
        onboardingCompleted: completed,
      })
        .then(() => {
          setAuthProfile((prev) =>
            prev
              ? {
                  ...prev,
                  name,
                  gender,
                  selfAssessedLevel,
                  targetLevel,
                  dailyMinutes,
                  onboardingCompleted: completed,
                }
              : prev,
          );
        })
        .catch(() => {});
    }, 500);

    return () => window.clearTimeout(timer);
  }, [authProfile, appState.onboarding]);

  const handleRateAnkiCard = useCallback(
    (
      deckId: AnkiDeckId,
      card: AnkiCard,
      rating: AnkiRating,
      session: AnkiStudySession | null,
    ): number => {
      const nowMs = Date.now();
      const uid = activeUserIdRef.current ?? undefined;
      const xpAwarded = ANKI_RATING_XP[rating];
      setJustCompletedSession(true);

      setAppState((prev) => {
        const settings = getEffectiveDeckSettings(prev.ankiEngine, deckId);
        const result = applyAnkiCardReview({
          deckId,
          card,
          rating,
          userId: uid,
          prevCardState: prev.ankiSrs[card.id],
          settings,
          daily: prev.ankiEngine.deckDaily[deckId],
          session: prev.ankiEngine.deckSessions[deckId] ?? session,
          nowMs,
        });

        const prevStudied = prev.ankiProgress.studiedIds;
        const nextStudied = prevStudied.includes(card.id)
          ? prevStudied
          : [...prevStudied, card.id];

        const nextAgain =
          result.nextCardState.state === 'learning' ||
          result.nextCardState.state === 'relearning'
            ? prev.ankiProgress.againIds.includes(card.id)
              ? prev.ankiProgress.againIds
              : [...prev.ankiProgress.againIds, card.id]
            : prev.ankiProgress.againIds.filter((id) => id !== card.id);

        if (uid && uid !== 'utamago-preview') {
          void saveAnkiReviewToFirestore({
            userId: uid,
            deckId,
            cardState: result.nextCardState,
            settings,
            daily: result.nextDaily,
            activeSession: result.nextSession,
          });
        }

        return {
          ...prev,
          ankiProgress: { studiedIds: nextStudied, againIds: nextAgain },
          ankiSrs: { ...prev.ankiSrs, [card.id]: result.nextCardState },
          ankiEngine: {
            ...prev.ankiEngine,
            deckDaily: {
              ...prev.ankiEngine.deckDaily,
              [deckId]: result.nextDaily,
            },
            deckSessions: {
              ...prev.ankiEngine.deckSessions,
              [deckId]: result.nextSession,
            },
          },
          gameProgress: {
            ...prev.gameProgress,
            totalXp: prev.gameProgress.totalXp + result.xpAwarded,
          },
          activityLog: recordStudyActivity(prev.activityLog, 'anki'),
        };
      });

      return xpAwarded;
    },
    [],
  );

  const handleUpdateDeckSettings = useCallback(
    (
      deckId: AnkiDeckId,
      patch: Partial<AnkiDeckSettings>,
      applyGlobal: boolean = false,
    ) => {
      const uid = activeUserIdRef.current;
      setAppState((prev) => {
        const nextDeckSettings = { ...prev.ankiEngine.deckSettings };
        const targetDecks: readonly AnkiDeckId[] = applyGlobal
          ? ALL_ANKI_DECK_IDS
          : [deckId];

        for (const id of targetDecks) {
          const current = getEffectiveDeckSettings(prev.ankiEngine, id);
          const merged = sanitizeDeckSettings(id, { ...current, ...patch });
          nextDeckSettings[id] = merged;

          if (uid && uid !== 'utamago-preview') {
            void saveAnkiDeckStateToFirestore({
              userId: uid,
              deckId: id,
              settings: merged,
              daily: getOrResetDeckDailyProgress(prev.ankiEngine.deckDaily[id]),
              activeSession: prev.ankiEngine.deckSessions[id] ?? null,
            });
          }
        }

        return {
          ...prev,
          ankiEngine: {
            ...prev.ankiEngine,
            deckSettings: nextDeckSettings,
          },
        };
      });
    },
    [],
  );

  const handleResetDeckSettings = useCallback((deckId: AnkiDeckId) => {
    const uid = activeUserIdRef.current;
    const defaults = getDefaultDeckSettings(deckId);
    setAppState((prev) => {
      if (uid && uid !== 'utamago-preview') {
        void saveAnkiDeckStateToFirestore({
          userId: uid,
          deckId,
          settings: defaults,
          daily: getOrResetDeckDailyProgress(prev.ankiEngine.deckDaily[deckId]),
          activeSession: prev.ankiEngine.deckSessions[deckId] ?? null,
        });
      }
      return {
        ...prev,
        ankiEngine: {
          ...prev.ankiEngine,
          deckSettings: {
            ...prev.ankiEngine.deckSettings,
            [deckId]: defaults,
          },
        },
      };
    });
  }, []);

  const handleUpdateDeckDaily = useCallback(
    (deckId: AnkiDeckId, daily: AnkiDeckDailyProgress) => {
      const uid = activeUserIdRef.current;
      setAppState((prev) => {
        const prevDaily = prev.ankiEngine.deckDaily[deckId];
        if (
          prevDaily &&
          prevDaily.dateKey === daily.dateKey &&
          prevDaily.dailyNewOrderDateKey === daily.dailyNewOrderDateKey &&
          prevDaily.dailyNewOrderIds.length === daily.dailyNewOrderIds.length &&
          prevDaily.extraReviewQuotaToday === daily.extraReviewQuotaToday &&
          prevDaily.newCardIdsToday.length === daily.newCardIdsToday.length &&
          prevDaily.reviewCompletionsToday === daily.reviewCompletionsToday
        ) {
          return prev;
        }
        if (uid && uid !== 'utamago-preview') {
          void saveAnkiDeckStateToFirestore({
            userId: uid,
            deckId,
            settings: getEffectiveDeckSettings(prev.ankiEngine, deckId),
            daily,
            activeSession: prev.ankiEngine.deckSessions[deckId] ?? null,
          });
        }
        return {
          ...prev,
          ankiEngine: {
            ...prev.ankiEngine,
            deckDaily: {
              ...prev.ankiEngine.deckDaily,
              [deckId]: daily,
            },
          },
        };
      });
    },
    [],
  );

  const handleUpdateDeckSession = useCallback(
    (deckId: AnkiDeckId, session: AnkiStudySession | null) => {
      const uid = activeUserIdRef.current;
      setAppState((prev) => {
        if (uid && uid !== 'utamago-preview') {
          void saveAnkiDeckStateToFirestore({
            userId: uid,
            deckId,
            settings: getEffectiveDeckSettings(prev.ankiEngine, deckId),
            daily: getOrResetDeckDailyProgress(prev.ankiEngine.deckDaily[deckId]),
            activeSession: session,
          });
        }
        return {
          ...prev,
          ankiEngine: {
            ...prev.ankiEngine,
            deckSessions: {
              ...prev.ankiEngine.deckSessions,
              [deckId]: session,
            },
          },
        };
      });
    },
    [],
  );

  const handleExtendTodayReviewQuota = useCallback(
    (deckId: AnkiDeckId, extraCount: number) => {
      const uid = activeUserIdRef.current;
      setAppState((prev) => {
        const currentDaily = getOrResetDeckDailyProgress(
          prev.ankiEngine.deckDaily[deckId],
        );
        const nextDaily: AnkiDeckDailyProgress = {
          ...currentDaily,
          extraReviewQuotaToday: Math.min(
            1000,
            currentDaily.extraReviewQuotaToday + Math.max(1, extraCount),
          ),
        };
        if (uid && uid !== 'utamago-preview') {
          void saveAnkiDeckStateToFirestore({
            userId: uid,
            deckId,
            settings: getEffectiveDeckSettings(prev.ankiEngine, deckId),
            daily: nextDaily,
            activeSession: prev.ankiEngine.deckSessions[deckId] ?? null,
          });
        }
        return {
          ...prev,
          ankiEngine: {
            ...prev.ankiEngine,
            deckDaily: {
              ...prev.ankiEngine.deckDaily,
              [deckId]: nextDaily,
            },
          },
        };
      });
    },
    [],
  );

  const handleToggleSuspendAnkiCard = useCallback(
    (deckId: AnkiDeckId, card: AnkiCard) => {
      const uid = activeUserIdRef.current;
      setAppState((prev) => {
        const existing = prev.ankiSrs[card.id];
        const currentState = resolveCardState(existing);
        const nextCardState =
          currentState === 'suspended'
            ? unsuspendAnkiCard(existing)
            : suspendAnkiCard(existing, {
                cardId: card.id,
                userId: uid ?? undefined,
                deckId,
                category:
                  card.category ??
                  (deckId.includes('BUNPOU') ? 'bunpou' : 'kosakata'),
                jlptLevel:
                  card.jlptLevel ??
                  (deckId.replace('_BUNPOU', '') as
                    | 'N5'
                    | 'N4'
                    | 'N3'
                    | 'N2'
                    | 'N1'),
              });

        // Remove newly suspended card from active session if present
        const currentSession = prev.ankiEngine.deckSessions[deckId] ?? null;
        let nextSession = currentSession;
        if (
          nextCardState?.state === 'suspended' &&
          currentSession &&
          currentSession.queueCardIds.includes(card.id)
        ) {
          const filteredQueue = currentSession.queueCardIds.filter(
            (id) => id !== card.id,
          );
          nextSession =
            filteredQueue.length > 0
              ? {
                  ...currentSession,
                  queueCardIds: filteredQueue,
                  currentIndex: Math.min(
                    currentSession.currentIndex,
                    filteredQueue.length - 1,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : null;
        }

        const settings = getEffectiveDeckSettings(prev.ankiEngine, deckId);
        const daily = getOrResetDeckDailyProgress(
          prev.ankiEngine.deckDaily[deckId],
        );

        const nextSrs = { ...prev.ankiSrs };
        if (nextCardState) {
          nextSrs[card.id] = nextCardState;
          if (uid && uid !== 'utamago-preview') {
            void saveAnkiReviewToFirestore({
              userId: uid,
              deckId,
              cardState: nextCardState,
              settings,
              daily,
              activeSession: nextSession,
            });
          }
        } else {
          delete nextSrs[card.id];
          if (uid && uid !== 'utamago-preview') {
            void deleteAnkiCardFromFirestore(uid, deckId, card.id);
          }
        }

        return {
          ...prev,
          ankiSrs: nextSrs,
          ankiEngine: {
            ...prev.ankiEngine,
            deckSessions: {
              ...prev.ankiEngine.deckSessions,
              [deckId]: nextSession,
            },
          },
        };
      });
    },
    [],
  );

  const handleResetDeckProgress = useCallback(
    (deckId: AnkiDeckId) => {
      const uid = activeUserIdRef.current;
      const deckCardIds = new Set(
        (deckCardsById[deckId] ?? []).map((card) => card.id),
      );
      setAppState((prev) => {
        const nextSrs = { ...prev.ankiSrs };
        const deletedIds: string[] = [];
        for (const [cardId, record] of Object.entries(nextSrs)) {
          if (deckCardIds.has(cardId) || record.deckId === deckId) {
            delete nextSrs[cardId];
            deletedIds.push(cardId);
          }
        }
        const nextStudied = prev.ankiProgress.studiedIds.filter(
          (id) => !deckCardIds.has(id),
        );
        const nextAgain = prev.ankiProgress.againIds.filter(
          (id) => !deckCardIds.has(id),
        );

        const settings = getEffectiveDeckSettings(prev.ankiEngine, deckId);
        if (uid && uid !== 'utamago-preview') {
          void resetDeckProgressInFirestore({
            userId: uid,
            deckId,
            cardIds: deletedIds,
            settings,
          });
        }

        return {
          ...prev,
          ankiProgress: { studiedIds: nextStudied, againIds: nextAgain },
          ankiSrs: nextSrs,
          ankiEngine: {
            ...prev.ankiEngine,
            deckDaily: {
              ...prev.ankiEngine.deckDaily,
              [deckId]: createEmptyDeckDailyProgress(),
            },
            deckSessions: {
              ...prev.ankiEngine.deckSessions,
              [deckId]: null,
            },
          },
        };
      });
    },
    [deckCardsById],
  );

  const handleMarkLessonReviewed = useCallback((lessonId: string) => {
    setAppState((prev) => {
      const alreadyReviewed =
        prev.activityLog.reviewedLessonIds.includes(lessonId);
      return {
        ...prev,
        gameProgress: {
          ...prev.gameProgress,
          totalXp: prev.gameProgress.totalXp + (alreadyReviewed ? 0 : 5),
        },
        activityLog: recordStudyActivity(prev.activityLog, 'learn', {
          reviewedLessonId: lessonId,
        }),
      };
    });
  }, []);

  const handleReportCompleted = useCallback((report: ComputedTryOutReport) => {
    const tryOutXp = 80 + Math.round(report.average * 0.4);
    setAppState((prev) => ({
      ...prev,
      latestReport: report,
      gameProgress: {
        ...prev.gameProgress,
        totalXp: prev.gameProgress.totalXp + tryOutXp,
      },
      activityLog: recordStudyActivity(prev.activityLog, 'tryout'),
    }));
  }, []);

  // Packet state updater is defined earlier alongside Try Out exit guard.

  const handleTogglePacketPart = useCallback(
    (partId: TryOutPacketPartId) => {
      const partMeta = getTryOutPacketParts(selectedPacketId).find(
        (p) => p.id === partId,
      );
      const xpReward = partMeta?.xpReward ?? 50;

      setAppState((prev) => {
        const currentSlice = getPacketState(prev, selectedPacketId);
        const { nextCompletedIds } = toggleTryOutPartCompletion(
          currentSlice.packetProgress.completedIds,
          partId,
          xpReward,
        );
        const isMarkingDone = nextCompletedIds.includes(partId);
        const shouldAwardXp =
          isMarkingDone &&
          !currentSlice.packetProgress.awardedIds.includes(partId);

        const nextState = updatePacketState(prev, selectedPacketId, (slice) => ({
          ...slice,
          packetProgress: {
            ...slice.packetProgress,
            completedIds: nextCompletedIds,
            awardedIds: shouldAwardXp
              ? [...slice.packetProgress.awardedIds, partId]
              : slice.packetProgress.awardedIds,
          },
        }));

        return {
          ...nextState,
          gameProgress: {
            ...nextState.gameProgress,
            totalXp:
              nextState.gameProgress.totalXp + (shouldAwardXp ? xpReward : 0),
          },
          activityLog: isMarkingDone
            ? recordStudyActivity(nextState.activityLog, 'tryout')
            : nextState.activityLog,
        };
      });
    },
    [selectedPacketId, updatePacketState],
  );

  const handleChangePartAnswer = useCallback(
    (partId: TryOutPacketPartId, fieldId: string, value: string) => {
      setAppState((prev) =>
        updatePacketState(prev, selectedPacketId, (slice) => ({
          ...slice,
          packetProgress: {
            ...slice.packetProgress,
            answersByPart: {
              ...slice.packetProgress.answersByPart,
              [partId]: {
                ...slice.packetProgress.answersByPart[partId],
                [fieldId]: value,
              },
            },
          },
        })),
      );
    },
    [selectedPacketId, updatePacketState],
  );

  const handleTogglePartFlag = useCallback(
    (partId: TryOutPacketPartId, itemId: string) => {
      setAppState((prev) =>
        updatePacketState(prev, selectedPacketId, (slice) => {
          const current = slice.tryoutFlaggedIds[partId] ?? [];
          const exists = current.includes(itemId);
          return {
            ...slice,
            tryoutFlaggedIds: {
              ...slice.tryoutFlaggedIds,
              [partId]: exists
                ? current.filter((id) => id !== itemId)
                : [...current, itemId],
            },
          };
        }),
      );
    },
    [selectedPacketId, updatePacketState],
  );

  const handlePartElapsedChange = useCallback(
    (partId: TryOutPacketPartId, seconds: number) => {
      if (
        tryoutDiscardLockRef.current?.packetId === selectedPacketId &&
        tryoutDiscardLockRef.current?.partId === partId
      ) {
        return;
      }
      setAppState((prev) => {
        const currentSlice = getPacketState(prev, selectedPacketId);
        if (currentSlice.tryoutTimers[partId] === seconds) {
          return prev;
        }
        return updatePacketState(prev, selectedPacketId, (slice) => ({
          ...slice,
          tryoutTimers: {
            ...slice.tryoutTimers,
            [partId]: seconds,
          },
        }));
      });
    },
    [selectedPacketId, updatePacketState],
  );

  const handleAudioStateChange = useCallback(
    (audioState: { currentTime: number; playbackRate: number }) => {
      if (tryoutDiscardLockRef.current?.packetId === selectedPacketId) {
        return;
      }
      setAppState((prev) =>
        updatePacketState(prev, selectedPacketId, (slice) => ({
          ...slice,
          choukaiAudio: audioState,
        })),
      );
    },
    [selectedPacketId, updatePacketState],
  );

  const handleSubmitPartForm = useCallback(
    (partId: TryOutPacketPartId) => {
      const partMeta = getTryOutPacketParts(selectedPacketId).find(
        (p) => p.id === partId,
      );
      const xpReward = partMeta?.xpReward ?? 50;

      setAppState((prev) => {
        const currentSlice = getPacketState(prev, selectedPacketId);
        const shouldAwardXp =
          !currentSlice.packetProgress.awardedIds.includes(partId);
        const nextState = updatePacketState(
          prev,
          selectedPacketId,
          (slice) => ({
            ...slice,
            packetProgress: {
              ...slice.packetProgress,
              completedIds: slice.packetProgress.completedIds.includes(partId)
                ? slice.packetProgress.completedIds
                : [...slice.packetProgress.completedIds, partId],
              submittedIds: slice.packetProgress.submittedIds.includes(partId)
                ? slice.packetProgress.submittedIds
                : [...slice.packetProgress.submittedIds, partId],
              awardedIds: shouldAwardXp
                ? [...slice.packetProgress.awardedIds, partId]
                : slice.packetProgress.awardedIds,
            },
          }),
        );

        return {
          ...nextState,
          gameProgress: {
            ...nextState.gameProgress,
            totalXp:
              nextState.gameProgress.totalXp + (shouldAwardXp ? xpReward : 0),
          },
          activityLog: recordStudyActivity(nextState.activityLog, 'tryout'),
        };
      });
    },
    [selectedPacketId, updatePacketState],
  );

  const handleReopenPartForm = useCallback(
    (partId: TryOutPacketPartId) => {
      captureTryOutBaseline(selectedPacketId, partId, activePacketState);
      setAppState((prev) =>
        updatePacketState(prev, selectedPacketId, (slice) => ({
          ...slice,
          packetProgress: {
            ...slice.packetProgress,
            submittedIds: slice.packetProgress.submittedIds.filter(
              (id) => id !== partId,
            ),
          },
        })),
      );
    },
    [activePacketState, captureTryOutBaseline, selectedPacketId, updatePacketState],
  );

  const handleResetPartForm = useCallback(
    (partId: TryOutPacketPartId) => {
      setAppState((prev) =>
        updatePacketState(prev, selectedPacketId, (slice) => ({
          ...slice,
          packetProgress: {
            ...slice.packetProgress,
            submittedIds: slice.packetProgress.submittedIds.filter(
              (id) => id !== partId,
            ),
            answersByPart: {
              ...slice.packetProgress.answersByPart,
              [partId]: {},
            },
          },
          tryoutTimers: {
            ...slice.tryoutTimers,
            [partId]: 0,
          },
          tryoutFlaggedIds: {
            ...slice.tryoutFlaggedIds,
            [partId]: [],
          },
        })),
      );
    },
    [selectedPacketId, updatePacketState],
  );

  const handleCompleteChallenge = useCallback(
    (stage: ChallengeStage, evaluation: ChallengeEvaluation) => {
      const mode = stage.mode ?? 'stage';
      const isCampaign = Boolean(stage.isCampaignStage);

      // 1. Free-play Blitz or Campaign Blitz Mission
      if (mode === 'blitz') {
        setJustCompletedSession(true);
        setAppState((prev) => {
          const prevArcade = prev.gameProgress.arcadeRecords ?? {
            blitzBestByLevel: {},
            survivalBestByLevel: {},
            defeatedBosses: {},
          };
          const prevBest = prevArcade.blitzBestByLevel[stage.jlptLevel];
          const nextScore = evaluation.score ?? 0;
          const nextCombo = evaluation.maxCombo ?? 0;
          const nextBest = {
            bestScore: Math.max(prevBest?.bestScore ?? 0, nextScore),
            bestCombo: Math.max(prevBest?.bestCombo ?? 0, nextCombo),
            bestCorrect: Math.max(
              prevBest?.bestCorrect ?? 0,
              evaluation.correctCount,
            ),
          };

          let nextCompletedLevels = prev.gameProgress.completedLevels;
          if (isCampaign && evaluation.passed && evaluation.stars > 0) {
            const earnedStars = evaluation.stars as 1 | 2 | 3;
            const existing = prev.gameProgress.completedLevels[stage.id];
            nextCompletedLevels = {
              ...prev.gameProgress.completedLevels,
              [stage.id]: {
                stars: existing
                  ? (Math.max(existing.stars, earnedStars) as 1 | 2 | 3)
                  : earnedStars,
                bestAccuracy: existing
                  ? Math.max(existing.bestAccuracy, evaluation.accuracy)
                  : evaluation.accuracy,
                xpEarned: (existing?.xpEarned ?? 0) + evaluation.xpAwarded,
              },
            };
          }

          return {
            ...prev,
            gameProgress: {
              ...prev.gameProgress,
              totalXp: prev.gameProgress.totalXp + evaluation.xpAwarded,
              completedLevels: nextCompletedLevels,
              arcadeRecords: {
                ...prevArcade,
                blitzBestByLevel: {
                  ...prevArcade.blitzBestByLevel,
                  [stage.jlptLevel]: nextBest,
                },
              },
            },
            activityLog: recordStudyActivity(prev.activityLog, 'challenge'),
          };
        });
        return;
      }

      // 2. Free-play Endless Survival
      if (mode === 'survival') {
        setJustCompletedSession(true);
        setAppState((prev) => {
          const prevArcade = prev.gameProgress.arcadeRecords ?? {
            blitzBestByLevel: {},
            survivalBestByLevel: {},
            defeatedBosses: {},
          };
          const prevBest = prevArcade.survivalBestByLevel[stage.jlptLevel];
          const nextScore = evaluation.score ?? 0;
          const nextCombo = evaluation.maxCombo ?? 0;
          const nextBest = {
            bestCleared: Math.max(
              prevBest?.bestCleared ?? 0,
              evaluation.correctCount,
            ),
            bestScore: Math.max(prevBest?.bestScore ?? 0, nextScore),
            bestCombo: Math.max(prevBest?.bestCombo ?? 0, nextCombo),
          };
          return {
            ...prev,
            gameProgress: {
              ...prev.gameProgress,
              totalXp: prev.gameProgress.totalXp + evaluation.xpAwarded,
              arcadeRecords: {
                ...prevArcade,
                survivalBestByLevel: {
                  ...prevArcade.survivalBestByLevel,
                  [stage.jlptLevel]: nextBest,
                },
              },
            },
            activityLog: recordStudyActivity(prev.activityLog, 'challenge'),
          };
        });
        return;
      }

      if (!evaluation.passed || evaluation.stars === 0) return;

      const earnedStars = evaluation.stars as 1 | 2 | 3;
      setJustCompletedSession(true);

      // 3. Chapter Boss Stage — saves to BOTH completedLevels (unlocks next chapter!) AND defeatedBosses
      if (mode === 'boss') {
        setAppState((prev) => {
          const prevArcade = prev.gameProgress.arcadeRecords ?? {
            blitzBestByLevel: {},
            survivalBestByLevel: {},
            defeatedBosses: {},
          };
          const existing =
            prev.gameProgress.completedLevels[stage.id] ??
            prevArcade.defeatedBosses[stage.id];
          const nextRecord: CompletedLevelRecord = {
            stars: existing
              ? (Math.max(existing.stars, earnedStars) as 1 | 2 | 3)
              : earnedStars,
            bestAccuracy: existing
              ? Math.max(existing.bestAccuracy, evaluation.accuracy)
              : evaluation.accuracy,
            xpEarned: (existing?.xpEarned ?? 0) + evaluation.xpAwarded,
          };
          return {
            ...prev,
            gameProgress: {
              ...prev.gameProgress,
              totalXp: prev.gameProgress.totalXp + evaluation.xpAwarded,
              completedLevels: {
                ...prev.gameProgress.completedLevels,
                [stage.id]: nextRecord,
              },
              arcadeRecords: {
                ...prevArcade,
                defeatedBosses: {
                  ...prevArcade.defeatedBosses,
                  [stage.id]: nextRecord,
                },
              },
            },
            activityLog: recordStudyActivity(prev.activityLog, 'challenge'),
          };
        });
        return;
      }

      // 4. Standard Campaign Stages (core, audio, sentence, survival-mission)
      setAppState((prev) => {
        const existing = prev.gameProgress.completedLevels[stage.id];
        const nextRecord: CompletedLevelRecord = {
          stars: existing
            ? (Math.max(existing.stars, earnedStars) as 1 | 2 | 3)
            : earnedStars,
          bestAccuracy: existing
            ? Math.max(existing.bestAccuracy, evaluation.accuracy)
            : evaluation.accuracy,
          xpEarned: (existing?.xpEarned ?? 0) + evaluation.xpAwarded,
        };

        return {
          ...prev,
          gameProgress: {
            ...prev.gameProgress,
            totalXp: prev.gameProgress.totalXp + evaluation.xpAwarded,
            completedLevels: {
              ...prev.gameProgress.completedLevels,
              [stage.id]: nextRecord,
            },
          },
          activityLog: recordStudyActivity(prev.activityLog, 'challenge'),
        };
      });
    },
    [],
  );

  const handleNextChallengeStage = useCallback(() => {
    if (!activeChallengeStage) return;
    const currentIdx = CHALLENGE_STAGES.findIndex(
      (s) => s.id === activeChallengeStage.id,
    );
    const candidate =
      currentIdx >= 0 ? CHALLENGE_STAGES[currentIdx + 1] ?? null : null;
    const nextStage = candidate ? prepareCampaignStage(candidate) : null;
    setChallengeHasProgress(false);
    setChallengeRunNonce((n) => n + 1);
    setActiveChallengeStage(nextStage);
  }, [activeChallengeStage, prepareCampaignStage]);

  const handleAwardPracticeXp = useCallback(
    (xp: number, category: 'learn' | 'challenge') => {
      if (xp <= 0) return;
      setJustCompletedSession(true);
      setAppState((prev) => ({
        ...prev,
        gameProgress: {
          ...prev.gameProgress,
          totalXp: prev.gameProgress.totalXp + xp,
        },
        activityLog: recordStudyActivity(prev.activityLog, category),
      }));
    },
    [],
  );

  const handleToggleDifficultCard = useCallback((cardId: string) => {
    setAppState((prev) => {
      const inAgain = prev.ankiProgress.againIds.includes(cardId);
      const srsRec = prev.ankiSrs[cardId];
      const hasSrsDifficult =
        Boolean(srsRec) &&
        (srsRec.state === 'relearning' || (srsRec.lapses ?? 0) >= 1);
      const currentlyDifficult = inAgain || hasSrsDifficult;

      if (currentlyDifficult) {
        const nextSrs = { ...prev.ankiSrs };
        if (srsRec && hasSrsDifficult) {
          nextSrs[cardId] = {
            ...srsRec,
            state: srsRec.state === 'relearning' ? 'review' : srsRec.state,
            lapses: 0,
          };
        }
        return {
          ...prev,
          ankiProgress: {
            ...prev.ankiProgress,
            againIds: prev.ankiProgress.againIds.filter((id) => id !== cardId),
          },
          ankiSrs: nextSrs,
        };
      }

      return {
        ...prev,
        ankiProgress: {
          ...prev.ankiProgress,
          againIds: [...prev.ankiProgress.againIds, cardId],
        },
      };
    });
  }, []);

  const handleMarkDifficultDrillRemembered = useCallback(
    (card: AnkiCard): number => {
      const deckId = (card.deckId ?? card.jlptLevel ?? 'N5') as AnkiDeckId;
      const xp = handleRateAnkiCard(deckId, card, 'good', null);
      // Clear card from difficult/leech queue immediately after user confirms mastery
      setAppState((prev) => {
        const srsRec = prev.ankiSrs[card.id];
        const nextSrs = srsRec
          ? {
              ...prev.ankiSrs,
              [card.id]: {
                ...srsRec,
                state:
                  srsRec.state === 'relearning' ? ('review' as const) : srsRec.state,
                lapses: 0,
              },
            }
          : prev.ankiSrs;
        return {
          ...prev,
          ankiProgress: {
            ...prev.ankiProgress,
            againIds: prev.ankiProgress.againIds.filter((id) => id !== card.id),
          },
          ankiSrs: nextSrs,
        };
      });
      return xp;
    },
    [handleRateAnkiCard],
  );

  const handleStartDailyDrill = useCallback(
    (count: 5 | 10, shuffleIndex: number) => {
      const todayKey = getLocalDateKey();
      const stage = generateDailyDrillStage({
        dateKey: todayKey,
        shuffleIndex,
        unlockedLevel: appState.onboarding.selfAssessedLevel,
        difficultCards,
        unlockedAnkiCards,
        unlockedBunpouItems,
        count,
      });
      if (!stage) return;
      setActiveDailyDrill({ stage, count, shuffleIndex });
    },
    [
      appState.onboarding.selfAssessedLevel,
      difficultCards,
      unlockedAnkiCards,
      unlockedBunpouItems,
    ],
  );

  const handleStartBlitz = useCallback(
    (level: JlptLevel) => {
      if (!isJlptLevelUnlocked(level, arenaUnlockedLevel)) {
        return;
      }
      const blitzStage = generateBlitzStage({
        level,
        ankiCards: allVocabCards,
        bunpouItems: allBunpouItems,
        seedSalt: `${Date.now()}`,
      });
      if (blitzStage.questions.length === 0) return;
      pushNavHistory(`challenge-${blitzStage.id}`);
      setChallengeHasProgress(false);
      setChallengeRunNonce((n) => n + 1);
      setActiveChallengeStage(blitzStage);
    },
    [allBunpouItems, allVocabCards, arenaUnlockedLevel, pushNavHistory],
  );

  const handleStartSurvival = useCallback(
    (level: JlptLevel) => {
      if (!isJlptLevelUnlocked(level, arenaUnlockedLevel)) {
        return;
      }
      const survivalStage = generateSurvivalStage({
        level,
        ankiCards: allVocabCards,
        bunpouItems: allBunpouItems,
        seedSalt: `${Date.now()}`,
      });
      if (survivalStage.questions.length === 0) return;
      pushNavHistory(`challenge-${survivalStage.id}`);
      setChallengeHasProgress(false);
      setChallengeRunNonce((n) => n + 1);
      setActiveChallengeStage(survivalStage);
    },
    [allBunpouItems, allVocabCards, arenaUnlockedLevel, pushNavHistory],
  );

  const handleCompleteDailyDrill = useCallback(
    (_stage: ChallengeStage, evaluation: ChallengeEvaluation) => {
      const todayKey = getLocalDateKey();
      setDailyDrillDoneDate(todayKey);
      try {
        window.localStorage.setItem('utamago_daily_drill_done_date', todayKey);
      } catch {
        // Ignore storage restrictions
      }
      handleAwardPracticeXp(evaluation.xpAwarded, 'challenge');
    },
    [handleAwardPracticeXp],
  );

  const handleResetAllProgress = useCallback(() => {
    clearAllAppStorage(activeUserIdRef.current);
    const initialFirst = createDefaultPacketState();
    setAppState((prev) => ({
      ...createDefaultAppState(),
      onboarding: { ...prev.onboarding, completed: true },
      textScale: prev.textScale,
      lastTab: prev.lastTab,
      ankiProgress: { studiedIds: [], againIds: [] },
      ankiSrs: {},
      gameProgress: { totalXp: 0, completedLevels: {} },
      packetProgress: initialFirst.packetProgress,
      tryoutTimers: { ...EMPTY_TIMERS_BY_PART },
      tryoutFlaggedIds: { ...EMPTY_FLAGGED_BY_PART },
      packetsProgress: { 'n2-1': initialFirst },
      latestReport: null,
      activityLog: EMPTY_ACTIVITY_LOG,
    }));
  }, []);

  const activeStageIndex = activeChallengeStage
    ? CHALLENGE_STAGES.findIndex((s) => s.id === activeChallengeStage.id)
    : -1;
  const hasNextStage = Boolean(
    activeChallengeStage?.isCampaignStage &&
      activeStageIndex >= 0 &&
      activeStageIndex + 1 < CHALLENGE_STAGES.length,
  );

  if (!authReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-on-surface pt-safe pb-safe">
        <p className="font-display text-sm font-bold text-on-surface-variant">
          Memeriksa sesi akun...
        </p>
      </div>
    );
  }

  if (needsAuth || !authProfile) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (!appState.onboarding.completed) {
    return (
      <OnboardingFlow
        initialName={appState.onboarding.name || authProfile.name || ''}
        initialGender={appState.onboarding.gender}
        initialTargetLevel={appState.onboarding.targetLevel}
        initialSelfAssessedLevel={appState.onboarding.selfAssessedLevel}
        initialDailyMinutes={appState.onboarding.dailyMinutes}
        onComplete={(settings) => void handleCompleteOnboarding(settings)}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-surface text-on-surface lg:flex">
      <DesktopNavigationRail
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        levelProgress={levelProgress}
        totalStars={totalStars}
        maxStars={maxStars}
        totalDeckCards={totalAnkiDeckCount}
        dueAnkiCount={dueAnkiCount}
        isDark={isDark}
        onToggleDarkLight={toggleDarkLight}
        onOpenSettings={handleOpenSettings}
      />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <MobileTopAppBar
          activeTab={activeTab}
          levelProgress={levelProgress}
          isDark={isDark}
          onToggleDarkLight={toggleDarkLight}
          onOpenSettings={handleOpenSettings}
        />

        <main
          className={
            activeTab === 'home'
              ? 'w-full min-w-0 flex-1 pt-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:py-6'
              : 'mx-auto w-full max-w-[480px] min-w-0 flex-1 px-4 pt-4 pb-[calc(3.5rem+1.5rem+env(safe-area-inset-bottom,0px))] lg:max-w-5xl lg:px-8 lg:py-6'
          }
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={
                activeTab === 'home' && homeFocusView
                  ? `home-${homeFocusView}`
                  : activeTab
              }
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="w-full min-w-0"
            >
              {activeTab === 'home' && (
                <HomeScreen
                  levelProgress={levelProgress}
                  completedLevels={mergedCompletedLevels}
                  arcadeRecords={appState.gameProgress.arcadeRecords}
                  studiedAnkiCount={learnedAnkiCount}
                  dueAnkiCount={dueAnkiCount}
                  totalAnkiDeckCount={totalAnkiDeckCount}
                  completedPacketCount={
                    appState.packetProgress.completedIds.length
                  }
                  latestReport={appState.latestReport}
                  activityLog={appState.activityLog}
                  targetLevel={appState.onboarding.targetLevel}
                  unlockedLevel={appState.onboarding.selfAssessedLevel}
                  arenaUnlockedLevel={arenaUnlockedLevel}
                  equivalentEstimate={equivalentEstimate}
                  dailyMinutes={appState.onboarding.dailyMinutes}
                  learnerName={appState.onboarding.name || authProfile.username}
                  gender={appState.onboarding.gender}
                  isHomeLoading={deckStatus === 'loading'}
                  hasHomeError={deckStatus === 'fallback'}
                  justCompletedSession={justCompletedSession}
                  unlockedAnkiCards={unlockedAnkiCards}
                  ankiSrs={appState.ankiSrs}
                  againIds={appState.ankiProgress.againIds}
                  bunpouN5Items={bunpouN5Items}
                  bunpouN4Items={bunpouN4Items}
                  bunpouN3Items={bunpouN3Items}
                  bunpouN2Items={bunpouN2Items}
                  bunpouN1Items={bunpouN1Items}
                  showChallengesView={homeFocusView === 'challenges'}
                  dailyDrillDoneToday={dailyDrillDoneDate === getLocalDateKey()}
                  weaknessReport={weaknessReport}
                  onExecuteWeaknessAction={(action: WeaknessActionTarget) => {
                    if (action.type === 'difficult-drill') {
                      setDifficultDrillOpen(true);
                      return;
                    }
                    if (action.type === 'writing-studio') {
                      setWritingStudioState({ open: true, mode: action.mode });
                      return;
                    }
                    if (action.type === 'bunpou') {
                      handleSelectTab('learn');
                      return;
                    }
                    if (action.type === 'anki') {
                      handleSelectTab('anki');
                      return;
                    }
                    if (action.type === 'tryout-packet') {
                      setSelectedPacketId(action.packetId);
                      setSelectedTryOutLevel('N2');
                      setPacketOpened(true);
                      setActiveFormPartId(action.partId ?? null);
                      setActiveReportTab('n2-official');
                      handleSelectTab('tryout');
                    }
                  }}
                  onOpenWritingStudio={() =>
                    setWritingStudioState({ open: true, mode: 'kanji' })
                  }
                  onOpenChallenges={() => handleOpenHomeFocus('challenges')}
                  onCloseChallenges={handleCloseHomeFocus}
                  onOpenTryOut={handleOpenTryOut}
                  onOpenDictionary={() => setDictionaryOpen(true)}
                  onStartDifficultDrill={() => setDifficultDrillOpen(true)}
                  onStartDailyDrill={handleStartDailyDrill}
                  onStartBlitz={handleStartBlitz}
                  onStartSurvival={handleStartSurvival}
                  jlptExamSession={appState.jlptExamSession}
                  onChangeJlptExamSession={(next) =>
                    setAppState((prev) => ({ ...prev, jlptExamSession: next }))
                  }
                  onStartStage={handleStartChallenge}
                  onNavigate={(tab) => handleSelectTab(tab)}
                />
              )}

              {activeTab === 'anki' && (
                <AnkiN5Section
                  userId={authProfile.uid}
                  n5Cards={n5Cards}
                  n4Cards={n4Cards}
                  n3Cards={n3Cards}
                  n2Cards={n2Cards}
                  n1Cards={n1Cards}
                  bunpouN5Cards={bunpouN5AnkiCards}
                  bunpouN4Cards={bunpouN4AnkiCards}
                  bunpouN3Cards={bunpouN3AnkiCards}
                  bunpouCards={bunpouAnkiCards}
                  bunpouN1Cards={bunpouN1AnkiCards}
                  closeModalSignal={closeAnkiModalSignal}
                  onStudyModalOpenChange={handleAnkiModalOpenChange}
                  initialDeckId={
                    isJlptLevelUnlocked(
                      appState.onboarding.targetLevel,
                      appState.onboarding.selfAssessedLevel,
                    )
                      ? appState.onboarding.targetLevel
                      : appState.onboarding.selfAssessedLevel
                  }
                  unlockedLevel={appState.onboarding.selfAssessedLevel}
                  deckStatus={deckStatus}
                  ankiSrs={appState.ankiSrs}
                  ankiEngine={appState.ankiEngine}
                  onRateCard={handleRateAnkiCard}
                  onUpdateDeckSettings={handleUpdateDeckSettings}
                  onResetDeckSettings={handleResetDeckSettings}
                  onUpdateDeckDaily={handleUpdateDeckDaily}
                  onUpdateDeckSession={handleUpdateDeckSession}
                  onExtendTodayReviewQuota={handleExtendTodayReviewQuota}
                  onToggleSuspendCard={handleToggleSuspendAnkiCard}
                  onResetDeckProgress={handleResetDeckProgress}
                  onOpenProfile={() => handleSelectTab('profile')}
                  onOpenWritingForWord={(word) =>
                    setWritingStudioState({
                      open: true,
                      mode: 'kanji',
                      seedText: word,
                    })
                  }
                />
              )}

              {activeTab === 'tryout' && (
                <Suspense fallback={<TryOutSectionSkeleton />}>
                  <LazyReportAndSimSection
                    activeTab={activeReportTab}
                    onTabChange={handleReportTabChange}
                    selectedLevel={selectedTryOutLevel}
                    onSelectedLevelChange={handleSelectedTryOutLevelChange}
                    selectedPacketId={selectedPacketId}
                    onSelectPacket={setSelectedPacketId}
                    packetOpened={packetOpened}
                    onPacketOpenedChange={handlePacketOpenedChange}
                    activeFormPartId={activeFormPartId}
                    onActiveFormPartChange={handleActiveFormPartChange}
                    completedFirstPacketParts={
                      firstPacketState.packetProgress.completedIds
                    }
                    packetsProgress={appState.packetsProgress}
                    completedPacketParts={
                      activePacketState.packetProgress.completedIds
                    }
                    formAnswersByPart={
                      activePacketState.packetProgress.answersByPart
                    }
                    submittedParts={
                      activePacketState.packetProgress.submittedIds
                    }
                    tryoutTimers={activePacketState.tryoutTimers}
                    tryoutFlaggedIds={activePacketState.tryoutFlaggedIds}
                    choukaiAudio={activePacketState.choukaiAudio}
                    closeSheetSignal={closeTryoutSheetSignal}
                    onSheetViewerOpenChange={handleSheetViewerOpenChange}
                    latestReport={appState.latestReport}
                    equivalentEstimate={equivalentEstimate}
                    fallbackFirstPacket={firstPacketState}
                    onChangePartAnswer={handleChangePartAnswer}
                    onTogglePartFlag={handleTogglePartFlag}
                    onPartElapsedChange={handlePartElapsedChange}
                    onAudioStateChange={handleAudioStateChange}
                    onSubmitPartForm={handleSubmitPartForm}
                    onReopenPartForm={handleReopenPartForm}
                    onResetPartForm={handleResetPartForm}
                    onTogglePacketPart={handleTogglePacketPart}
                    onReportCompleted={handleReportCompleted}
                    onNavigateAnki={() => handleSelectTab('anki')}
                    onNavigateLearn={() => handleSelectTab('learn')}
                  />
                </Suspense>
              )}

              {activeTab === 'learn' && (
                <LearnScreen
                  unlockedLevel={appState.onboarding.selfAssessedLevel}
                  bunpouN5Items={bunpouN5Items}
                  bunpouN4Items={bunpouN4Items}
                  bunpouN3Items={bunpouN3Items}
                  bunpouN2Items={bunpouN2Items}
                  bunpouN1Items={bunpouN1Items}
                  reviewedLessonIds={appState.activityLog.reviewedLessonIds}
                  onMarkLessonReviewed={handleMarkLessonReviewed}
                  onAwardPracticeXp={handleAwardPracticeXp}
                  onOpenDictionary={() => setDictionaryOpen(true)}
                  onNavigateProfile={() => handleSelectTab('profile')}
                  onOpenTryOut={handleOpenTryOut}
                  onNavigate={handleSelectTab}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileScreen
                  levelProgress={levelProgress}
                  totalStars={totalStars}
                  completedStagesCount={completedCampaignStagesCount}
                  studiedAnkiCount={learnedAnkiCount}
                  dueAnkiCount={dueAnkiCount}
                  totalAnkiDeckCount={totalAnkiDeckCount}
                  activityLog={appState.activityLog}
                  equivalentEstimate={equivalentEstimate}
                  onboarding={appState.onboarding}
                  account={{
                    username: authProfile.username,
                    email: authProfile.email,
                  }}
                  onUpdateOnboarding={(next) =>
                    setAppState((prev) => ({
                      ...prev,
                      onboarding: { ...prev.onboarding, ...next },
                    }))
                  }
                  onNavigateTryOut={handleOpenTryOut}
                  onOpenSettings={handleOpenSettings}
                  onOpenFeedback={() => setFeedbackModalOpen(true)}
                  onLogout={handleLogout}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileBottomNav
        activeTab={activeTab}
        dueAnkiCount={dueAnkiCount}
        onSelectTab={handleSelectTab}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={handleCloseSettings}
        themeMode={themeMode}
        textScale={appState.textScale}
        onboarding={appState.onboarding}
        reminder={appState.reminder}
        onChangeThemeMode={setThemeMode}
        onChangeTextScale={(scale: TextScale) =>
          setAppState((prev) => ({ ...prev, textScale: scale }))
        }
        onUpdateOnboarding={(next) =>
          setAppState((prev) => ({
            ...prev,
            onboarding: { ...prev.onboarding, ...next },
          }))
        }
        onUpdateReminder={(next) =>
          setAppState((prev) => ({ ...prev, reminder: next }))
        }
        onResetAllProgress={handleResetAllProgress}
        accountUsername={authProfile.username}
        accountEmail={authProfile.email}
        onOpenFeedback={() => setFeedbackModalOpen(true)}
        onLogout={handleLogout}
      />

      <BetaFeedbackModal
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        userId={authProfile.uid}
        username={authProfile.username}
        accountEmail={authProfile.email}
        jlptLevel={appState.onboarding.targetLevel}
        defaultScreen={
          activeTab === 'home' && homeFocusView === 'challenges'
            ? 'challenge'
            : activeTab
        }
      />

      <BetaWelcomeModal
        open={betaWelcomeOpen}
        displayName={appState.onboarding.name || authProfile.name}
        onDismiss={() => setBetaWelcomeOpen(false)}
        onOpenFeedback={() => {
          setBetaWelcomeOpen(false);
          setFeedbackModalOpen(true);
        }}
      />

      {activeChallengeStage && (
        <ChallengeRunnerModal
          key={`${activeChallengeStage.id}-${challengeRunNonce}`}
          stage={activeChallengeStage}
          mascotLevel={levelProgress.level}
          mascotGender={appState.onboarding.gender}
          previousBestStars={
            mergedCompletedLevels[activeChallengeStage.id]?.stars ?? 0
          }
          previousBestScore={
            activeChallengeStage.mode === 'blitz'
              ? appState.gameProgress.arcadeRecords?.blitzBestByLevel[
                  activeChallengeStage.jlptLevel
                ]?.bestScore ?? 0
              : activeChallengeStage.mode === 'survival'
                ? appState.gameProgress.arcadeRecords?.survivalBestByLevel[
                    activeChallengeStage.jlptLevel
                  ]?.bestScore ?? 0
                : 0
          }
          previousBestCleared={
            activeChallengeStage.mode === 'survival'
              ? appState.gameProgress.arcadeRecords?.survivalBestByLevel[
                  activeChallengeStage.jlptLevel
                ]?.bestCleared ?? 0
              : 0
          }
          hasNextStage={hasNextStage}
          onRequestMoreQuestions={
            activeChallengeStage.mode === 'survival' ||
            activeChallengeStage.mode === 'blitz'
              ? (wave) =>
                  generateArenaQuestionBatch({
                    level: activeChallengeStage.jlptLevel,
                    ankiCards: allVocabCards,
                    bunpouItems: allBunpouItems,
                    seedSalt: `${activeChallengeStage.id}-${Date.now()}`,
                    count: 16,
                    mode: activeChallengeStage.mode as 'blitz' | 'survival',
                    wave,
                  })
              : undefined
          }
          onShuffleNewSet={
            activeChallengeStage.stageKind === 'blitz-mission'
              ? () => {
                  const baseStage =
                    CHALLENGE_STAGES.find(
                      (s) => s.id === activeChallengeStage.id,
                    ) ?? activeChallengeStage;
                  setChallengeHasProgress(false);
                  setChallengeRunNonce((n) => n + 1);
                  setActiveChallengeStage(prepareCampaignStage(baseStage));
                }
              : activeChallengeStage.mode === 'blitz'
                ? () => handleStartBlitz(activeChallengeStage.jlptLevel)
                : activeChallengeStage.mode === 'survival'
                  ? () => handleStartSurvival(activeChallengeStage.jlptLevel)
                  : undefined
          }
          onComplete={handleCompleteChallenge}
          onProgressChange={setChallengeHasProgress}
          onNextStage={handleNextChallengeStage}
          onClose={handleAttemptCloseChallenge}
        />
      )}

      {activeDailyDrill && (
        <ChallengeRunnerModal
          key={activeDailyDrill.stage.id}
          stage={activeDailyDrill.stage}
          mascotLevel={levelProgress.level}
          mascotGender={appState.onboarding.gender}
          previousBestStars={0}
          hasNextStage={false}
          unlimitedHearts
          headerLabel={`Daily Drill · ${activeDailyDrill.stage.jlptLevel}`}
          closeButtonLabel="Kembali ke Arena Tantangan"
          onShuffleNewSet={() =>
            handleStartDailyDrill(
              activeDailyDrill.count,
              activeDailyDrill.shuffleIndex + 1,
            )
          }
          onComplete={handleCompleteDailyDrill}
          onNextStage={() => {}}
          onClose={() => setActiveDailyDrill(null)}
        />
      )}

      {difficultDrillOpen && (
        <DifficultDrillModal
          cards={difficultCards}
          onMarkRemembered={handleMarkDifficultDrillRemembered}
          onClose={() => setDifficultDrillOpen(false)}
        />
      )}

      <VocabDictionaryModal
        open={dictionaryOpen}
        cards={allVocabCards}
        ankiSrs={appState.ankiSrs}
        againIds={appState.ankiProgress.againIds}
        onToggleDifficultCard={handleToggleDifficultCard}
        onOpenWritingForWord={(word) => {
          setDictionaryOpen(false);
          setWritingStudioState({
            open: true,
            mode: 'kanji',
            seedText: word,
          });
        }}
        onClose={() => setDictionaryOpen(false)}
      />

      <WritingStudioModal
        open={writingStudioState.open}
        cards={allVocabCards}
        difficultCardIds={difficultCardIdSet}
        unlockedLevel={appState.onboarding.selfAssessedLevel}
        initialMode={writingStudioState.mode}
        initialSeedText={writingStudioState.seedText}
        onCompletePractice={(practicedCount) => {
          if (practicedCount >= 1) {
            handleAwardPracticeXp(Math.min(30, practicedCount * 5), 'learn');
          }
        }}
        onClose={() =>
          setWritingStudioState((prev) => ({
            ...prev,
            open: false,
            seedText: undefined,
          }))
        }
      />

      <ConfirmDialog
        open={exitConfirm !== null}
        title={exitConfirm?.title ?? ''}
        description={exitConfirm?.description ?? ''}
        confirmLabel={exitConfirm?.confirmLabel}
        secondaryLabel={exitConfirm?.secondaryLabel}
        cancelLabel={exitConfirm?.cancelLabel}
        onConfirm={() => exitConfirm?.onConfirm()}
        onSecondary={
          exitConfirm?.onSecondary
            ? () => exitConfirm.onSecondary?.()
            : undefined
        }
        onCancel={() => setExitConfirm(null)}
      />
    </div>
  );
}
