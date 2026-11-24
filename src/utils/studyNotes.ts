/**
 * Persistent local storage for personal bookmarks and study notes
 * across Bunpou patterns and Vocabulary Dictionary entries.
 */

export type StudyNoteScope = 'bunpou' | 'vocab';

export interface StudyNoteEntry {
  bookmarked: boolean;
  note: string;
  updatedAt: number;
}

export type StudyNotesStore = Record<string, StudyNoteEntry>;

export const STUDY_NOTES_STORAGE_KEY = 'utamago_study_notes_v1';
export const STUDY_NOTE_MAX_LENGTH = 500;

const EMPTY_ENTRY: StudyNoteEntry = {
  bookmarked: false,
  note: '',
  updatedAt: 0,
};

let cachedStore: StudyNotesStore | null = null;
const storeListeners = new Set<(store: StudyNotesStore) => void>();

export function makeStudyNoteKey(scope: StudyNoteScope, itemId: string): string {
  return `${scope}:${itemId.trim()}`;
}

export function normalizeStudyNoteText(rawText: string): string {
  return rawText.trim().slice(0, STUDY_NOTE_MAX_LENGTH);
}

export function sanitizeStudyNotesStore(raw: unknown): StudyNotesStore {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const out: StudyNotesStore = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key.startsWith('bunpou:') && !key.startsWith('vocab:')) continue;
    if (!value || typeof value !== 'object') continue;
    const candidate = value as Partial<StudyNoteEntry>;
    const bookmarked = Boolean(candidate.bookmarked);
    const note =
      typeof candidate.note === 'string'
        ? normalizeStudyNoteText(candidate.note)
        : '';
    if (!bookmarked && !note) continue;

    out[key] = {
      bookmarked,
      note,
      updatedAt:
        typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt)
          ? candidate.updatedAt
          : 0,
    };
  }
  return out;
}

export function loadStudyNotes(): StudyNotesStore {
  if (cachedStore) return cachedStore;
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STUDY_NOTES_STORAGE_KEY);
    if (!raw) {
      cachedStore = {};
      return cachedStore;
    }
    cachedStore = sanitizeStudyNotesStore(JSON.parse(raw));
    return cachedStore;
  } catch {
    cachedStore = {};
    return cachedStore;
  }
}

function commitStudyNotes(next: StudyNotesStore): StudyNotesStore {
  cachedStore = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STUDY_NOTES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }
  storeListeners.forEach((listener) => listener(next));
  return next;
}

export function subscribeStudyNotes(
  listener: (store: StudyNotesStore) => void,
): () => void {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

export function getStudyNoteEntry(
  store: StudyNotesStore,
  scope: StudyNoteScope,
  itemId: string,
): StudyNoteEntry {
  return store[makeStudyNoteKey(scope, itemId)] ?? EMPTY_ENTRY;
}

export function isStudyItemSaved(
  store: StudyNotesStore,
  scope: StudyNoteScope,
  itemId: string,
): boolean {
  const entry = getStudyNoteEntry(store, scope, itemId);
  return entry.bookmarked || entry.note.length > 0;
}

export function toggleStudyBookmark(
  scope: StudyNoteScope,
  itemId: string,
  now = Date.now(),
): StudyNotesStore {
  const current = loadStudyNotes();
  const key = makeStudyNoteKey(scope, itemId);
  const existing = current[key] ?? EMPTY_ENTRY;
  const nextBookmarked = !existing.bookmarked;

  const nextStore: StudyNotesStore = { ...current };
  if (!nextBookmarked && !existing.note) {
    delete nextStore[key];
  } else {
    nextStore[key] = {
      bookmarked: nextBookmarked,
      note: existing.note,
      updatedAt: now,
    };
  }
  return commitStudyNotes(nextStore);
}

export function saveStudyNoteText(
  scope: StudyNoteScope,
  itemId: string,
  rawText: string,
  now = Date.now(),
): StudyNotesStore {
  const current = loadStudyNotes();
  const key = makeStudyNoteKey(scope, itemId);
  const existing = current[key] ?? EMPTY_ENTRY;
  const note = normalizeStudyNoteText(rawText);

  const nextStore: StudyNotesStore = { ...current };
  if (!note && !existing.bookmarked) {
    delete nextStore[key];
  } else {
    nextStore[key] = {
      bookmarked: existing.bookmarked,
      note,
      updatedAt: now,
    };
  }
  return commitStudyNotes(nextStore);
}

export function countSavedStudyItems(
  store: StudyNotesStore,
  scope: StudyNoteScope,
  allowedItemIds?: readonly string[],
): number {
  if (allowedItemIds) {
    let count = 0;
    for (const id of allowedItemIds) {
      if (isStudyItemSaved(store, scope, id)) {
        count += 1;
      }
    }
    return count;
  }

  const prefix = `${scope}:`;
  let count = 0;
  for (const [key, entry] of Object.entries(store)) {
    if (key.startsWith(prefix) && (entry.bookmarked || entry.note.length > 0)) {
      count += 1;
    }
  }
  return count;
}

export function extractSavedItemIdSet(
  store: StudyNotesStore,
  scope: StudyNoteScope,
): Set<string> {
  const prefix = `${scope}:`;
  const result = new Set<string>();
  for (const [key, entry] of Object.entries(store)) {
    if (key.startsWith(prefix) && (entry.bookmarked || entry.note.length > 0)) {
      result.add(key.slice(prefix.length));
    }
  }
  return result;
}

export function extractNotesMapById(
  store: StudyNotesStore,
  scope: StudyNoteScope,
): Record<string, string> {
  const prefix = `${scope}:`;
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(store)) {
    if (key.startsWith(prefix) && entry.note.length > 0) {
      result[key.slice(prefix.length)] = entry.note;
    }
  }
  return result;
}

export function getStudyNoteScopeForCardKind(
  cardKind?: 'vocab' | 'bunpou',
): StudyNoteScope {
  return cardKind === 'bunpou' ? 'bunpou' : 'vocab';
}

export function filterSavedItemsById<T extends { id: string }>(
  items: readonly T[],
  store: StudyNotesStore,
  scope: StudyNoteScope,
): T[] {
  return items.filter((item) => isStudyItemSaved(store, scope, item.id));
}

export function resetStudyNotesMemoryCache(): void {
  cachedStore = null;
}
