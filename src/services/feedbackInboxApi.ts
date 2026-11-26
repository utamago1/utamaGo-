import { doc, getDoc } from 'firebase/firestore';
import type { JlptLevel } from '../data/utamagoContent';
import {
  checkIsBetaFeedbackAdmin,
  deleteBetaFeedback,
  loadAllBetaFeedbackForAdmin,
  submitBetaFeedback,
  updateBetaFeedbackStatus,
  type BetaFeedbackCategory,
  type BetaFeedbackRecord,
  type BetaFeedbackScreen,
  type BetaFeedbackStatus,
} from './betaFeedback';
import { auth, db } from './firebaseClient';

export const FIREBASE_ADMIN_TOKEN = '__firebase_admin__';

export interface FeedbackInboxItem {
  id: string;
  username: string;
  accountEmail: string;
  category: BetaFeedbackCategory;
  screen: BetaFeedbackScreen;
  jlptLevel: JlptLevel;
  title: string;
  description: string;
  status: BetaFeedbackStatus;
  adminNote: string;
  screenshotInfo: string;
  screenshotDataUrl: string;
  createdAtMs: number;
  updatedAtMs: number;
  source?: 'firestore' | 'server';
}

export interface FeedbackInboxSummary {
  total: number;
  open: number;
  reviewed: number;
  resolved: number;
}

export interface AdminInboxStatus {
  mode: 'env' | 'claimed' | 'unclaimed';
  configured: boolean;
  authenticated: boolean;
  serverAvailable: boolean;
}

export class FeedbackInboxApiError extends Error {
  status: number;
  needsSetup?: boolean;

  constructor(message: string, status: number, needsSetup?: boolean) {
    super(message);
    this.name = 'FeedbackInboxApiError';
    this.status = status;
    this.needsSetup = needsSetup;
  }
}

async function parseJsonSafe(
  res: Response,
): Promise<{ okJson: boolean; data: Record<string, unknown> }> {
  const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return { okJson: false, data: {} };
  }
  try {
    const parsed = (await res.json()) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { okJson: true, data: parsed as Record<string, unknown> };
    }
  } catch {
    // Ignore invalid JSON bodies
  }
  return { okJson: false, data: {} };
}

function mapFirestoreRecordToInboxItem(
  record: BetaFeedbackRecord,
): FeedbackInboxItem {
  return {
    id: record.id,
    username: record.username,
    accountEmail: '',
    category: record.category,
    screen: record.screen,
    jlptLevel: record.jlptLevel,
    title: record.title,
    description: record.description,
    status: record.status,
    adminNote: record.adminNote,
    screenshotInfo: record.screenshotDataUrl ? 'Lampiran gambar' : '',
    screenshotDataUrl: record.screenshotDataUrl,
    createdAtMs: record.createdAtMs,
    updatedAtMs: record.updatedAtMs,
    source: 'firestore',
  };
}

function computeInboxSummary(
  items: FeedbackInboxItem[],
): FeedbackInboxSummary {
  return {
    total: items.length,
    open: items.filter((item) => item.status === 'open').length,
    reviewed: items.filter((item) => item.status === 'reviewed').length,
    resolved: items.filter((item) => item.status === 'resolved').length,
  };
}

export async function submitFeedbackToInbox(payload: {
  category: BetaFeedbackCategory;
  screen: BetaFeedbackScreen;
  jlptLevel: JlptLevel;
  username: string;
  accountEmail?: string;
  title: string;
  description: string;
  screenshotInfo?: string;
  screenshotDataUrl?: string;
}): Promise<{ id: string; createdAtMs: number }> {
  let firestoreResult: { id: string; createdAtMs: number } | null = null;
  let firestoreError: unknown = null;

  // Primary: persist directly to shared Firebase Firestore so reports work on Vercel & AI Studio
  if (auth.currentUser) {
    try {
      const saved = await submitBetaFeedback({
        username: payload.username,
        input: {
          category: payload.category,
          screen: payload.screen,
          jlptLevel: payload.jlptLevel,
          title: payload.title,
          description: payload.description,
          screenshotDataUrl: payload.screenshotDataUrl,
        },
      });
      firestoreResult = { id: saved.id, createdAtMs: saved.createdAtMs };
    } catch (err) {
      firestoreError = err;
    }
  }

  // Secondary / mirror: also send to Express backend when available (non-blocking if Firestore succeeded)
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const { okJson, data } = await parseJsonSafe(res);
    if (res.ok && okJson) {
      return (
        firestoreResult ?? {
          id: typeof data.id === 'string' ? data.id : '',
          createdAtMs:
            typeof data.createdAtMs === 'number'
              ? data.createdAtMs
              : Date.now(),
        }
      );
    }

    if (!firestoreResult) {
      if (res.status === 404 || !okJson) {
        if (firestoreError instanceof Error) {
          throw new FeedbackInboxApiError(
            'Gagal menyimpan laporan ke database. Pastikan kamu sudah masuk akun dan terhubung internet.',
            500,
          );
        }
        throw new FeedbackInboxApiError(
          'Silakan masuk akun terlebih dahulu untuk mengirim laporan.',
          401,
        );
      }
      const msg =
        typeof data.error === 'string' && data.error.trim()
          ? data.error
          : 'Gagal mengirim laporan. Coba lagi beberapa saat.';
      throw new FeedbackInboxApiError(msg, res.status);
    }
  } catch (err) {
    if (firestoreResult) {
      return firestoreResult;
    }
    if (err instanceof FeedbackInboxApiError) {
      throw err;
    }
    throw new FeedbackInboxApiError(
      'Gagal mengirim laporan. Periksa koneksi internet lalu coba lagi.',
      500,
    );
  }

  return firestoreResult!;
}

export async function fetchAdminInboxStatus(
  token?: string | null,
): Promise<AdminInboxStatus> {
  if (token === FIREBASE_ADMIN_TOKEN) {
    const isAdmin = await checkIsBetaFeedbackAdmin();
    return {
      mode: 'env',
      configured: true,
      authenticated: isAdmin,
      serverAvailable: false,
    };
  }

  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch('/api/admin/status', {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    const { okJson, data } = await parseJsonSafe(res);
    if (!res.ok || !okJson) {
      return {
        mode: 'unclaimed',
        configured: false,
        authenticated: false,
        serverAvailable: false,
      };
    }

    const mode =
      data.mode === 'env' ||
      data.mode === 'claimed' ||
      data.mode === 'unclaimed'
        ? data.mode
        : 'unclaimed';

    return {
      mode,
      configured: Boolean(data.configured),
      authenticated: Boolean(data.authenticated),
      serverAvailable: true,
    };
  } catch {
    return {
      mode: 'unclaimed',
      configured: false,
      authenticated: false,
      serverAvailable: false,
    };
  }
}

export async function setupAdminInboxPassword(
  password: string,
  confirmPassword: string,
): Promise<{ token: string; expiresAtMs: number }> {
  const res = await fetch('/api/admin/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, confirmPassword }),
  });
  const { okJson, data } = await parseJsonSafe(res);
  if (!res.ok || !okJson) {
    if (res.status === 404 || !okJson) {
      throw new FeedbackInboxApiError(
        'Server password admin tidak tersedia di hosting statis. Masuk dengan akun admin Google/Firebase.',
        404,
      );
    }
    throw new FeedbackInboxApiError(
      typeof data.error === 'string'
        ? data.error
        : 'Gagal menyimpan password admin.',
      res.status,
    );
  }
  if (typeof data.token !== 'string' || !data.token) {
    throw new FeedbackInboxApiError('Sesi admin tidak valid.', 500);
  }
  return {
    token: data.token,
    expiresAtMs:
      typeof data.expiresAtMs === 'number'
        ? data.expiresAtMs
        : Date.now() + 12 * 60 * 60 * 1000,
  };
}

export async function loginAdminInbox(
  password: string,
): Promise<{ token: string; expiresAtMs: number }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const { okJson, data } = await parseJsonSafe(res);
  if (!res.ok || !okJson) {
    if (res.status === 404 || !okJson) {
      throw new FeedbackInboxApiError(
        'Server password admin tidak aktif di hosting ini. Gunakan tombol masuk akun admin Firebase.',
        404,
      );
    }
    throw new FeedbackInboxApiError(
      typeof data.error === 'string' ? data.error : 'Password admin salah.',
      res.status,
      Boolean(data.needsSetup),
    );
  }
  if (typeof data.token !== 'string' || !data.token) {
    throw new FeedbackInboxApiError('Sesi admin tidak valid.', 500);
  }
  return {
    token: data.token,
    expiresAtMs:
      typeof data.expiresAtMs === 'number'
        ? data.expiresAtMs
        : Date.now() + 12 * 60 * 60 * 1000,
  };
}

export async function logoutAdminInbox(token: string | null): Promise<void> {
  if (!token || token === FIREBASE_ADMIN_TOKEN) return;
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Best-effort revocation; local memory state is always cleared
  }
}

export async function fetchAdminFeedbackMessages(token: string): Promise<{
  items: FeedbackInboxItem[];
  summary: FeedbackInboxSummary;
}> {
  if (token === FIREBASE_ADMIN_TOKEN) {
    const isAdmin = await checkIsBetaFeedbackAdmin();
    if (!isAdmin) {
      throw new FeedbackInboxApiError(
        'Sesi admin Firebase tidak valid atau email belum terverifikasi.',
        401,
      );
    }
    const records = await loadAllBetaFeedbackForAdmin();
    const items = records.map(mapFirestoreRecordToInboxItem);
    return {
      items,
      summary: computeInboxSummary(items),
    };
  }

  const res = await fetch('/api/admin/feedback', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const { okJson, data } = await parseJsonSafe(res);
  if (!res.ok || !okJson) {
    throw new FeedbackInboxApiError(
      typeof data.error === 'string'
        ? data.error
        : 'Gagal memuat pesan pelaporan.',
      res.status,
    );
  }

  const serverItems: FeedbackInboxItem[] = Array.isArray(data.items)
    ? (data.items as FeedbackInboxItem[]).map((item) => ({
        ...item,
        source: 'server',
      }))
    : [];

  // Also merge Firestore reports if the signed-in user is also a verified Firebase admin
  let mergedItems = serverItems;
  try {
    if (await checkIsBetaFeedbackAdmin()) {
      const firestoreRecords = await loadAllBetaFeedbackForAdmin();
      const byKey = new Map<string, FeedbackInboxItem>();
      for (const rec of firestoreRecords) {
        const mapped = mapFirestoreRecordToInboxItem(rec);
        byKey.set(`${mapped.username}|${mapped.title}|${mapped.description}`, mapped);
      }
      for (const item of serverItems) {
        const dedupeKey = `${item.username}|${item.title}|${item.description}`;
        if (!byKey.has(dedupeKey)) {
          byKey.set(dedupeKey, item);
        }
      }
      mergedItems = Array.from(byKey.values()).sort(
        (a, b) => b.createdAtMs - a.createdAtMs,
      );
    }
  } catch {
    // Keep server items if Firestore read is unavailable
  }

  return {
    items: mergedItems,
    summary: computeInboxSummary(mergedItems),
  };
}

export async function updateAdminFeedbackMessage(
  token: string,
  id: string,
  patch: { status?: BetaFeedbackStatus; adminNote?: string },
  currentItem?: FeedbackInboxItem,
): Promise<FeedbackInboxItem> {
  const useFirestore =
    token === FIREBASE_ADMIN_TOKEN || currentItem?.source === 'firestore';

  if (useFirestore) {
    let baseStatus = currentItem?.status;
    let baseNote = currentItem?.adminNote;
    if (!baseStatus || baseNote === undefined) {
      const snap = await getDoc(doc(db, 'betaFeedback', id));
      const snapData = snap.data() as Record<string, unknown> | undefined;
      baseStatus =
        (snapData?.status as BetaFeedbackStatus | undefined) ?? 'open';
      baseNote =
        typeof snapData?.adminNote === 'string' ? snapData.adminNote : '';
    }
    const nextStatus = patch.status ?? baseStatus;
    const nextNote =
      patch.adminNote !== undefined ? patch.adminNote : baseNote;

    await updateBetaFeedbackStatus({
      feedbackId: id,
      status: nextStatus,
      adminNote: nextNote,
    });

    return {
      ...(currentItem ?? {
        id,
        username: 'pelajar',
        accountEmail: '',
        category: 'other',
        screen: 'other',
        jlptLevel: 'N5',
        title: '',
        description: '',
        screenshotInfo: '',
        screenshotDataUrl: '',
        createdAtMs: Date.now(),
      }),
      status: nextStatus,
      adminNote: nextNote.trim().slice(0, 300),
      updatedAtMs: Date.now(),
      source: 'firestore',
    };
  }

  const res = await fetch(`/api/admin/feedback/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });
  const { okJson, data } = await parseJsonSafe(res);
  if (!res.ok || !okJson) {
    throw new FeedbackInboxApiError(
      typeof data.error === 'string'
        ? data.error
        : 'Gagal memperbarui status laporan.',
      res.status,
    );
  }
  return { ...(data.item as FeedbackInboxItem), source: 'server' };
}

export async function deleteAdminFeedbackMessage(
  token: string,
  id: string,
  currentItem?: FeedbackInboxItem,
): Promise<void> {
  const useFirestore =
    token === FIREBASE_ADMIN_TOKEN || currentItem?.source === 'firestore';

  if (useFirestore) {
    await deleteBetaFeedback(id);
    return;
  }

  const res = await fetch(`/api/admin/feedback/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const { okJson, data } = await parseJsonSafe(res);
  if (!res.ok || !okJson) {
    throw new FeedbackInboxApiError(
      typeof data.error === 'string' ? data.error : 'Gagal menghapus laporan.',
      res.status,
    );
  }
}
