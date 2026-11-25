import type { JlptLevel } from '../data/utamagoContent';
import type {
  BetaFeedbackCategory,
  BetaFeedbackScreen,
  BetaFeedbackStatus,
} from './betaFeedback';

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
): Promise<Record<string, unknown>> {
  try {
    const parsed = (await res.json()) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore non-JSON bodies
  }
  return {};
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
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const msg =
      typeof data.error === 'string' && data.error.trim()
        ? data.error
        : 'Gagal mengirim laporan. Coba lagi beberapa saat.';
    throw new FeedbackInboxApiError(msg, res.status);
  }

  return {
    id: typeof data.id === 'string' ? data.id : '',
    createdAtMs:
      typeof data.createdAtMs === 'number' ? data.createdAtMs : Date.now(),
  };
}

export async function fetchAdminInboxStatus(
  token?: string | null,
): Promise<AdminInboxStatus> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch('/api/admin/status', {
    method: 'GET',
    headers,
    cache: 'no-store',
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new FeedbackInboxApiError(
      typeof data.error === 'string'
        ? data.error
        : 'Gagal memeriksa status admin.',
      res.status,
    );
  }

  const mode =
    data.mode === 'env' || data.mode === 'claimed' || data.mode === 'unclaimed'
      ? data.mode
      : 'unclaimed';

  return {
    mode,
    configured: Boolean(data.configured),
    authenticated: Boolean(data.authenticated),
  };
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
  const data = await parseJsonSafe(res);
  if (!res.ok) {
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
  const data = await parseJsonSafe(res);
  if (!res.ok) {
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
  if (!token) return;
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
  const res = await fetch('/api/admin/feedback', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new FeedbackInboxApiError(
      typeof data.error === 'string'
        ? data.error
        : 'Gagal memuat pesan pelaporan.',
      res.status,
    );
  }

  const rawItems = Array.isArray(data.items)
    ? (data.items as FeedbackInboxItem[])
    : [];
  const rawSummary =
    data.summary && typeof data.summary === 'object'
      ? (data.summary as Partial<FeedbackInboxSummary>)
      : {};

  return {
    items: rawItems,
    summary: {
      total:
        typeof rawSummary.total === 'number'
          ? rawSummary.total
          : rawItems.length,
      open:
        typeof rawSummary.open === 'number'
          ? rawSummary.open
          : rawItems.filter((item) => item.status === 'open').length,
      reviewed:
        typeof rawSummary.reviewed === 'number'
          ? rawSummary.reviewed
          : rawItems.filter((item) => item.status === 'reviewed').length,
      resolved:
        typeof rawSummary.resolved === 'number'
          ? rawSummary.resolved
          : rawItems.filter((item) => item.status === 'resolved').length,
    },
  };
}

export async function updateAdminFeedbackMessage(
  token: string,
  id: string,
  patch: { status?: BetaFeedbackStatus; adminNote?: string },
): Promise<FeedbackInboxItem> {
  const res = await fetch(`/api/admin/feedback/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new FeedbackInboxApiError(
      typeof data.error === 'string'
        ? data.error
        : 'Gagal memperbarui status laporan.',
      res.status,
    );
  }
  return data.item as FeedbackInboxItem;
}

export async function deleteAdminFeedbackMessage(
  token: string,
  id: string,
): Promise<void> {
  const res = await fetch(`/api/admin/feedback/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new FeedbackInboxApiError(
      typeof data.error === 'string' ? data.error : 'Gagal menghapus laporan.',
      res.status,
    );
  }
}
