import {
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { JlptLevel } from '../data/utamagoContent';
import { normalizeUsername } from '../utils/accountValidation';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from './firebaseClient';

export type BetaFeedbackCategory = 'bug' | 'typo' | 'suggestion' | 'other';
export type BetaFeedbackScreen =
  | 'home'
  | 'anki'
  | 'learn'
  | 'challenge'
  | 'tryout'
  | 'profile'
  | 'other';
export type BetaFeedbackStatus = 'open' | 'reviewed' | 'resolved';

// Verbatim limits synchronized with firebase-blueprint.json & firestore.rules
export const FEEDBACK_TITLE_MIN = 5;
export const FEEDBACK_TITLE_MAX = 100;
export const FEEDBACK_DESC_MIN = 10;
export const FEEDBACK_DESC_MAX = 1000;
export const FEEDBACK_ADMIN_NOTE_MAX = 300;
export const FEEDBACK_SCREENSHOT_MAX_CHARS = 260_000;
export const FEEDBACK_APP_VERSION = 'beta-1';
export const BOOTSTRAP_ADMIN_EMAIL = 'utamaryan1@gmail.com';

const VALID_CATEGORIES: readonly BetaFeedbackCategory[] = [
  'bug',
  'typo',
  'suggestion',
  'other',
];
const VALID_SCREENS: readonly BetaFeedbackScreen[] = [
  'home',
  'anki',
  'learn',
  'challenge',
  'tryout',
  'profile',
  'other',
];
const VALID_STATUSES: readonly BetaFeedbackStatus[] = [
  'open',
  'reviewed',
  'resolved',
];
const VALID_JLPT: readonly JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export interface BetaFeedbackRecord {
  id: string;
  userId: string;
  username: string;
  category: BetaFeedbackCategory;
  screen: BetaFeedbackScreen;
  title: string;
  description: string;
  status: BetaFeedbackStatus;
  adminNote: string;
  jlptLevel: JlptLevel;
  appVersion: string;
  screenshotDataUrl: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface BetaFeedbackInput {
  category: BetaFeedbackCategory;
  screen: BetaFeedbackScreen;
  title: string;
  description: string;
  jlptLevel: JlptLevel;
  screenshotDataUrl?: string;
}

function isValidScreenshotDataUrl(value: string): boolean {
  if (!value) return true;
  if (value.length > FEEDBACK_SCREENSHOT_MAX_CHARS) return false;
  return (
    value.startsWith('data:image/jpeg;base64,') ||
    value.startsWith('data:image/png;base64,') ||
    value.startsWith('data:image/webp;base64,')
  );
}

function generateFeedbackId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `fb_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function sanitizeSafeUsername(raw: string): string {
  const normalized = normalizeUsername(raw || '');
  const cleaned = normalized.replace(/[^a-z0-9_.]/g, '_').slice(0, 24);
  if (cleaned.length >= 3) return cleaned;
  return 'pelajar_beta';
}

function toTimestampMs(raw: unknown): number {
  if (raw instanceof Timestamp) return raw.toMillis();
  if (
    raw &&
    typeof raw === 'object' &&
    'toMillis' in raw &&
    typeof (raw as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (raw as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function mapDocToFeedback(
  id: string,
  data: Record<string, unknown>,
): BetaFeedbackRecord {
  const category = VALID_CATEGORIES.includes(
    data.category as BetaFeedbackCategory,
  )
    ? (data.category as BetaFeedbackCategory)
    : 'other';
  const screen = VALID_SCREENS.includes(data.screen as BetaFeedbackScreen)
    ? (data.screen as BetaFeedbackScreen)
    : 'other';
  const status = VALID_STATUSES.includes(data.status as BetaFeedbackStatus)
    ? (data.status as BetaFeedbackStatus)
    : 'open';
  const jlptLevel = VALID_JLPT.includes(data.jlptLevel as JlptLevel)
    ? (data.jlptLevel as JlptLevel)
    : 'N5';

  return {
    id,
    userId: typeof data.userId === 'string' ? data.userId : '',
    username: typeof data.username === 'string' ? data.username : 'pelajar',
    category,
    screen,
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    status,
    adminNote: typeof data.adminNote === 'string' ? data.adminNote : '',
    jlptLevel,
    appVersion:
      typeof data.appVersion === 'string'
        ? data.appVersion
        : FEEDBACK_APP_VERSION,
    screenshotDataUrl:
      typeof data.screenshotDataUrl === 'string' &&
      isValidScreenshotDataUrl(data.screenshotDataUrl)
        ? data.screenshotDataUrl
        : '',
    createdAtMs: toTimestampMs(data.createdAt),
    updatedAtMs: toTimestampMs(data.updatedAt),
  };
}

export function validateBetaFeedbackInput(
  input: BetaFeedbackInput,
): { ok: true; sanitized: BetaFeedbackInput } | { ok: false; error: string } {
  const title = input.title.trim().replace(/\s+/g, ' ');
  const description = input.description.trim();

  if (!VALID_CATEGORIES.includes(input.category)) {
    return { ok: false, error: 'Pilih kategori laporan terlebih dahulu.' };
  }
  if (!VALID_SCREENS.includes(input.screen)) {
    return { ok: false, error: 'Pilih halaman terkait terlebih dahulu.' };
  }
  if (title.length < FEEDBACK_TITLE_MIN) {
    return {
      ok: false,
      error: `Judul laporan minimal ${FEEDBACK_TITLE_MIN} karakter.`,
    };
  }
  if (title.length > FEEDBACK_TITLE_MAX) {
    return {
      ok: false,
      error: `Judul laporan maksimal ${FEEDBACK_TITLE_MAX} karakter.`,
    };
  }
  if (description.length < FEEDBACK_DESC_MIN) {
    return {
      ok: false,
      error: `Jelaskan detail laporan minimal ${FEEDBACK_DESC_MIN} karakter agar mudah ditindaklanjuti.`,
    };
  }
  if (description.length > FEEDBACK_DESC_MAX) {
    return {
      ok: false,
      error: `Deskripsi maksimal ${FEEDBACK_DESC_MAX} karakter.`,
    };
  }

  const screenshotDataUrl =
    typeof input.screenshotDataUrl === 'string'
      ? input.screenshotDataUrl.trim()
      : '';
  if (!isValidScreenshotDataUrl(screenshotDataUrl)) {
    return {
      ok: false,
      error: 'Lampiran screenshot tidak valid atau ukurannya melebihi batas.',
    };
  }

  return {
    ok: true,
    sanitized: {
      category: input.category,
      screen: input.screen,
      title: title.slice(0, FEEDBACK_TITLE_MAX),
      description: description.slice(0, FEEDBACK_DESC_MAX),
      jlptLevel: VALID_JLPT.includes(input.jlptLevel) ? input.jlptLevel : 'N5',
      screenshotDataUrl,
    },
  };
}

export interface FirebaseAdminAuthState {
  signedIn: boolean;
  email: string;
  emailVerified: boolean;
  isBootstrapEmail: boolean;
  isAdmin: boolean;
}

export async function checkIsBetaFeedbackAdmin(): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  const emailLower = (currentUser.email ?? '').trim().toLowerCase();
  if (emailLower === BOOTSTRAP_ADMIN_EMAIL) {
    if (!currentUser.emailVerified) {
      // Refresh once in case user already clicked Gmail verification link
      try {
        await currentUser.reload();
        if (currentUser.emailVerified) {
          await currentUser.getIdToken(true);
        }
      } catch {
        // Ignore transient reload error
      }
    }
    if (currentUser.emailVerified) {
      return true;
    }
  }
  try {
    const snap = await getDoc(doc(db, 'admins', currentUser.uid));
    return snap.exists() && snap.data()?.role === 'admin';
  } catch {
    return false;
  }
}

export async function getFirebaseAdminAuthState(): Promise<FirebaseAdminAuthState> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      signedIn: false,
      email: '',
      emailVerified: false,
      isBootstrapEmail: false,
      isAdmin: false,
    };
  }
  const email = (currentUser.email ?? '').trim().toLowerCase();
  const isBootstrapEmail = email === BOOTSTRAP_ADMIN_EMAIL;
  const isAdmin = await checkIsBetaFeedbackAdmin();
  return {
    signedIn: true,
    email,
    emailVerified: Boolean(auth.currentUser?.emailVerified),
    isBootstrapEmail,
    isAdmin,
  };
}

export async function sendAdminVerificationEmail(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Silakan masuk akun terlebih dahulu.');
  }
  await sendEmailVerification(currentUser);
}

export async function reloadFirebaseAdminAuthState(): Promise<FirebaseAdminAuthState> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    await currentUser.reload();
    await currentUser.getIdToken(true);
  }
  return getFirebaseAdminAuthState();
}

export async function signInAdminWithGoogle(): Promise<FirebaseAdminAuthState> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    login_hint: BOOTSTRAP_ADMIN_EMAIL,
    prompt: 'select_account',
  });
  const credential = await signInWithPopup(auth, provider);
  await credential.user.getIdToken(true);
  const state = await getFirebaseAdminAuthState();
  if (!state.isAdmin) {
    throw new Error(
      `Akun Google yang dipilih (${state.email || 'tidak diketahui'}) bukan akun admin ${BOOTSTRAP_ADMIN_EMAIL}. Pilih akun ${BOOTSTRAP_ADMIN_EMAIL}.`,
    );
  }
  return state;
}

export async function signInAdminWithEmailPassword(
  password: string,
): Promise<FirebaseAdminAuthState> {
  const trimmed = password.trim();
  if (!trimmed) {
    throw new Error('Masukkan password akun admin terlebih dahulu.');
  }
  const credential = await signInWithEmailAndPassword(
    auth,
    BOOTSTRAP_ADMIN_EMAIL,
    trimmed,
  );
  await credential.user.reload().catch(() => {});
  await credential.user.getIdToken(true).catch(() => {});
  return getFirebaseAdminAuthState();
}

export async function submitBetaFeedback(params: {
  username: string;
  input: BetaFeedbackInput;
}): Promise<BetaFeedbackRecord> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Silakan masuk akun terlebih dahulu untuk mengirim laporan.');
  }

  const check = validateBetaFeedbackInput(params.input);
  if (!check.ok) {
    throw new Error(check.error);
  }

  const feedbackId = generateFeedbackId();
  const safeUsername = sanitizeSafeUsername(params.username);
  const path = `betaFeedback/${feedbackId}`;
  const docRef = doc(db, 'betaFeedback', feedbackId);

  const payload = {
    userId: currentUser.uid,
    username: safeUsername,
    category: check.sanitized.category,
    screen: check.sanitized.screen,
    title: check.sanitized.title,
    description: check.sanitized.description,
    status: 'open' as BetaFeedbackStatus,
    adminNote: '',
    jlptLevel: check.sanitized.jlptLevel,
    appVersion: FEEDBACK_APP_VERSION,
    screenshotDataUrl: check.sanitized.screenshotDataUrl ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  const nowMs = Date.now();
  return {
    id: feedbackId,
    userId: payload.userId,
    username: payload.username,
    category: payload.category,
    screen: payload.screen,
    title: payload.title,
    description: payload.description,
    status: payload.status,
    adminNote: payload.adminNote,
    jlptLevel: payload.jlptLevel,
    appVersion: payload.appVersion,
    screenshotDataUrl: payload.screenshotDataUrl,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };
}

export async function loadMyBetaFeedback(
  userId: string,
): Promise<BetaFeedbackRecord[]> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== userId) {
    return [];
  }

  const q = query(
    collection(db, 'betaFeedback'),
    where('userId', '==', userId),
    limit(50),
  );

  try {
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapDocToFeedback(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'betaFeedback');
  }
}

export async function loadAllBetaFeedbackForAdmin(): Promise<
  BetaFeedbackRecord[]
> {
  const q = query(collection(db, 'betaFeedback'), limit(100));
  try {
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapDocToFeedback(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'betaFeedback');
  }
}

export async function updateBetaFeedbackStatus(params: {
  feedbackId: string;
  status: BetaFeedbackStatus;
  adminNote: string;
}): Promise<void> {
  const safeNote = params.adminNote.trim().slice(0, FEEDBACK_ADMIN_NOTE_MAX);
  const path = `betaFeedback/${params.feedbackId}`;
  try {
    await updateDoc(doc(db, 'betaFeedback', params.feedbackId), {
      status: params.status,
      adminNote: safeNote,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteBetaFeedback(feedbackId: string): Promise<void> {
  const path = `betaFeedback/${feedbackId}`;
  try {
    await deleteDoc(doc(db, 'betaFeedback', feedbackId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
