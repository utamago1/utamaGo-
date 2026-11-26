import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { JlptLevel } from '../data/utamagoContent';
import {
  normalizeEmail,
  normalizeUsername,
  sanitizeDisplayName,
  validateEmail,
  validatePassword,
  validateUsername,
} from '../utils/accountValidation';
import type { LearnerGender } from '../utils/levelProgression';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from './firebaseClient';

export interface UserProgressSummary {
  xp: number;
  learnerLevel: number;
  streakDays: number;
  ankiReviewedTotal: number;
  ankiMasteredTotal: number;
  tryOutCompletedCount: number;
  challengeClearedCount: number;
  lastActiveDate: string;
}

export interface AuthenticatedUserProfile {
  uid: string;
  username: string;
  email: string;
  name: string;
  gender: LearnerGender;
  selfAssessedLevel: JlptLevel;
  targetLevel: JlptLevel;
  dailyMinutes: number;
  onboardingCompleted: boolean;
  progressSummary?: UserProgressSummary;
}

const VALID_JLPT_LEVELS: readonly JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

let isRegistering = false;

function normalizeJlpt(raw: unknown): JlptLevel {
  return typeof raw === 'string' && VALID_JLPT_LEVELS.includes(raw as JlptLevel)
    ? (raw as JlptLevel)
    : 'N5';
}

function normalizeGender(raw: unknown): LearnerGender {
  return raw === 'cewek' ? 'cewek' : 'cowok';
}

function mapSnapshotToProfile(
  user: User,
  data: Record<string, unknown>,
): AuthenticatedUserProfile {
  const email = normalizeEmail(
    typeof data.email === 'string' ? data.email : user.email ?? '',
  );
  const fallbackUsername = email.split('@')[0]?.replace(/[^a-z0-9_.]/g, '_') || 'pelajar';
  const username =
    typeof data.username === 'string' && data.username.trim().length >= 3
      ? normalizeUsername(data.username)
      : fallbackUsername.slice(0, 24);

  return {
    uid: user.uid,
    username,
    email,
    name: sanitizeDisplayName(typeof data.name === 'string' ? data.name : ''),
    gender: normalizeGender(data.gender),
    selfAssessedLevel: normalizeJlpt(data.selfAssessedLevel),
    targetLevel: normalizeJlpt(data.targetLevel),
    dailyMinutes:
      typeof data.dailyMinutes === 'number' &&
      data.dailyMinutes >= 5 &&
      data.dailyMinutes <= 240
        ? Math.round(data.dailyMinutes)
        : 20,
    onboardingCompleted: Boolean(data.onboardingCompleted),
  };
}

export function formatAccountAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  if (code === 'auth/operation-not-allowed') {
    return 'Metode masuk Username/Email & Password belum diaktifkan di Firebase Console (Authentication → Sign-in method → aktifkan Email/Password).';
  }
  if (
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential'
  ) {
    return 'Username, email, atau password salah. Periksa kembali atau klik Lupa password.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Email ini sudah terdaftar. Silakan masuk atau gunakan menu Lupa password.';
  }
  if (code === 'auth/weak-password') {
    return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
  }
  if (code === 'auth/invalid-email') {
    return 'Format email tidak valid.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Koneksi internet bermasalah. Periksa jaringanmu lalu coba lagi.';
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    if (error.message.includes('"operationType"')) {
      return 'Terjadi kendala izin penyimpanan data akun. Silakan coba lagi atau hubungi pengajar.';
    }
    return error.message;
  }
  return 'Terjadi kendala saat memproses akun. Silakan coba lagi.';
}

async function fetchOrCreateUserProfile(
  user: User,
  fallbackUsername?: string,
): Promise<AuthenticatedUserProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (snap.exists()) {
    return mapSnapshotToProfile(user, snap.data());
  }

  const canonicalEmail = normalizeEmail(user.email ?? '');
  const rawCandidate = (
    fallbackUsername ||
    canonicalEmail.split('@')[0] ||
    'pelajar'
  )
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '_');
  const paddedUsername =
    rawCandidate.length >= 3
      ? rawCandidate.slice(0, 24)
      : `${rawCandidate}_user`.slice(0, 24);

  const initialPayload = {
    uid: user.uid,
    username: paddedUsername,
    email: canonicalEmail,
    name: sanitizeDisplayName(user.displayName ?? ''),
    gender: 'cowok' as LearnerGender,
    selfAssessedLevel: 'N5' as JlptLevel,
    targetLevel: 'N5' as JlptLevel,
    dailyMinutes: 20,
    onboardingCompleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(userRef, initialPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  return {
    uid: user.uid,
    username: paddedUsername,
    email: canonicalEmail,
    name: initialPayload.name,
    gender: 'cowok',
    selfAssessedLevel: 'N5',
    targetLevel: 'N5',
    dailyMinutes: 20,
    onboardingCompleted: false,
  };
}

export function initAccountAuth(
  onAuthenticated: (profile: AuthenticatedUserProfile) => void,
  onSignedOut: () => void,
): () => void {
  void testFirestoreConnection();

  return onAuthStateChanged(auth, (user: User | null) => {
    if (!user) {
      onSignedOut();
      return;
    }
    if (isRegistering) {
      return;
    }
    void fetchOrCreateUserProfile(user)
      .then((profile) => {
        onAuthenticated(profile);
      })
      .catch(() => {
        onSignedOut();
      });
  });
}

export async function loginWithUsernameOrEmail(
  identifier: string,
  password: string,
): Promise<AuthenticatedUserProfile> {
  const trimmed = identifier.trim();
  if (!trimmed) {
    throw new Error('Masukkan username atau email terlebih dahulu.');
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.error);
  }

  let resolvedEmail = '';
  let resolvedUsername: string | undefined;

  if (trimmed.includes('@')) {
    const emailCheck = validateEmail(trimmed);
    if (!emailCheck.valid) {
      throw new Error(emailCheck.error);
    }
    resolvedEmail = emailCheck.normalized;
  } else {
    const usernameCheck = validateUsername(trimmed);
    if (!usernameCheck.valid) {
      throw new Error(usernameCheck.error);
    }
    resolvedUsername = usernameCheck.normalized;
    const lookupPath = `usernames/${resolvedUsername}`;
    let lookupSnap;
    try {
      lookupSnap = await getDoc(doc(db, 'usernames', resolvedUsername));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, lookupPath);
    }
    if (!lookupSnap.exists()) {
      throw new Error(
        'Username tidak ditemukan. Periksa kembali ejaan atau buat akun baru.',
      );
    }
    const lookupEmail = lookupSnap.data()?.email;
    if (typeof lookupEmail !== 'string' || !lookupEmail.includes('@')) {
      throw new Error('Data akun untuk username ini tidak valid.');
    }
    resolvedEmail = normalizeEmail(lookupEmail);
  }

  const credential = await signInWithEmailAndPassword(
    auth,
    resolvedEmail,
    password,
  );
  return fetchOrCreateUserProfile(credential.user, resolvedUsername);
}

export async function registerWithUsernameEmailPassword(input: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthenticatedUserProfile> {
  const usernameCheck = validateUsername(input.username);
  if (!usernameCheck.valid) {
    throw new Error(usernameCheck.error);
  }
  const emailCheck = validateEmail(input.email);
  if (!emailCheck.valid) {
    throw new Error(emailCheck.error);
  }
  const passwordCheck = validatePassword(input.password);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.error);
  }

  const usernameLower = usernameCheck.normalized;
  const emailLower = emailCheck.normalized;
  const lookupPath = `usernames/${usernameLower}`;

  let existingUsername;
  try {
    existingUsername = await getDoc(doc(db, 'usernames', usernameLower));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, lookupPath);
  }
  if (existingUsername.exists()) {
    throw new Error('Username sudah dipakai. Silakan pilih username lain.');
  }

  isRegistering = true;
  let createdUser: User | null = null;

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      emailLower,
      input.password,
    );
    createdUser = credential.user;
    const canonicalEmail = normalizeEmail(createdUser.email ?? emailLower);

    const batch = writeBatch(db);
    batch.set(doc(db, 'usernames', usernameLower), {
      uid: createdUser.uid,
      email: canonicalEmail,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', createdUser.uid), {
      uid: createdUser.uid,
      username: usernameLower,
      email: canonicalEmail,
      name: '',
      gender: 'cowok' as LearnerGender,
      selfAssessedLevel: 'N5' as JlptLevel,
      targetLevel: 'N5' as JlptLevel,
      dailyMinutes: 20,
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      await createdUser.delete().catch(() => {});
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `users/${createdUser.uid}`,
      );
    }

    return {
      uid: createdUser.uid,
      username: usernameLower,
      email: canonicalEmail,
      name: '',
      gender: 'cowok',
      selfAssessedLevel: 'N5',
      targetLevel: 'N5',
      dailyMinutes: 20,
      onboardingCompleted: false,
    };
  } finally {
    isRegistering = false;
  }
}

export async function requestPasswordResetByEmail(email: string): Promise<string> {
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    throw new Error(emailCheck.error);
  }
  await sendPasswordResetEmail(auth, emailCheck.normalized);
  return emailCheck.normalized;
}

function clampNonNegativeInt(val: unknown, min: number, max: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.round(val)));
}

function sanitizeProgressSummary(
  input: UserProgressSummary,
): UserProgressSummary {
  const rawDate =
    typeof input.lastActiveDate === 'string' ? input.lastActiveDate.trim() : '';
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : '';
  return {
    xp: clampNonNegativeInt(input.xp, 0, 10_000_000),
    learnerLevel: clampNonNegativeInt(input.learnerLevel, 1, 999),
    streakDays: clampNonNegativeInt(input.streakDays, 0, 10_000),
    ankiReviewedTotal: clampNonNegativeInt(input.ankiReviewedTotal, 0, 1_000_000),
    ankiMasteredTotal: clampNonNegativeInt(input.ankiMasteredTotal, 0, 100_000),
    tryOutCompletedCount: clampNonNegativeInt(input.tryOutCompletedCount, 0, 500),
    challengeClearedCount: clampNonNegativeInt(input.challengeClearedCount, 0, 500),
    lastActiveDate: validDate,
  };
}

export async function syncUserProfileToFirestore(
  uid: string,
  patch: Partial<
    Pick<
      AuthenticatedUserProfile,
      | 'name'
      | 'gender'
      | 'selfAssessedLevel'
      | 'targetLevel'
      | 'dailyMinutes'
      | 'onboardingCompleted'
      | 'progressSummary'
    >
  >,
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return;
  }
  const userPath = `users/${uid}`;
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof patch.name === 'string') {
    payload.name = sanitizeDisplayName(patch.name);
  }
  if (patch.gender === 'cowok' || patch.gender === 'cewek') {
    payload.gender = patch.gender;
  }
  if (
    patch.selfAssessedLevel &&
    VALID_JLPT_LEVELS.includes(patch.selfAssessedLevel)
  ) {
    payload.selfAssessedLevel = patch.selfAssessedLevel;
  }
  if (patch.targetLevel && VALID_JLPT_LEVELS.includes(patch.targetLevel)) {
    payload.targetLevel = patch.targetLevel;
  }
  if (typeof patch.dailyMinutes === 'number') {
    payload.dailyMinutes = Math.max(5, Math.min(240, Math.round(patch.dailyMinutes)));
  }
  if (typeof patch.onboardingCompleted === 'boolean') {
    payload.onboardingCompleted = patch.onboardingCompleted;
  }
  if (patch.progressSummary) {
    payload.progressSummary = sanitizeProgressSummary(patch.progressSummary);
  }

  try {
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function logoutAccount(): Promise<void> {
  await auth.signOut();
}
