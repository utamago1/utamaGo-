import type { AnkiCard, AnkiDeckId } from './ankiParser';

const DB_NAME = 'utamago_offline_cache_v1';
const DB_VERSION = 1;
const STORE_NAME = 'anki_decks';

interface CachedDeckRecord {
  key: string;
  version: string;
  cachedAt: string;
  cards: AnkiCard[];
}

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openCacheDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function readCachedAnkiDeck(
  level: AnkiDeckId,
  expectedVersion: string,
): Promise<AnkiCard[] | null> {
  const db = await openCacheDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(`deck-${level}`);
      req.onsuccess = () => {
        const record = req.result as CachedDeckRecord | undefined;
        db.close();
        if (
          record &&
          record.version === expectedVersion &&
          Array.isArray(record.cards) &&
          record.cards.length > 0
        ) {
          resolve(record.cards);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function writeCachedAnkiDeck(
  level: AnkiDeckId,
  version: string,
  cards: AnkiCard[],
): Promise<void> {
  const db = await openCacheDb();
  if (!db || cards.length === 0) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: CachedDeckRecord = {
        key: `deck-${level}`,
        version,
        cachedAt: new Date().toISOString(),
        cards,
      };
      store.put(record);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}
