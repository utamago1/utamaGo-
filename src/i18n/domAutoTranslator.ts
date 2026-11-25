import {
  lookupStaticEn,
  needsIndonesianTranslation,
} from './staticEnDict';

const CACHE_STORAGE_KEY = 'utamago_en_cache_v2';
const MAX_CACHE_ENTRIES = 4000;
const BATCH_DELAY_MS = 35;
const BATCH_MAX_ITEMS = 38;
const MAX_CONCURRENT_BATCHES = 2;
const TRANSLATED_ATTRS = ['placeholder', 'title', 'aria-label'] as const;
type TranslatedAttr = (typeof TRANSLATED_ATTRS)[number];

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'SVG',
  'PATH',
  'CODE',
  'PRE',
  'TEXTAREA',
  'INPUT',
  'META',
  'LINK',
  'HEAD',
]);

interface NodeRecord {
  original: string;
  translated: string;
}

const textNodeRecords = new WeakMap<Text, NodeRecord>();
const trackedTextNodes = new Set<Text>();

const attrRecords = new WeakMap<Element, Map<TranslatedAttr, NodeRecord>>();
const trackedAttrElements = new Set<Element>();

// Persistent in-memory + localStorage translation cache (trimmed source -> trimmed EN)
let cacheLoaded = false;
const translationCache = new Map<string, string>();
let cacheSaveTimer: ReturnType<typeof setTimeout> | null = null;

// Pending async translation queue
const pendingCallbacks = new Map<string, Set<(en: string) => void>>();
const failedKeys = new Set<string>();
const queuedKeys: string[] = [];
const queuedSet = new Set<string>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let activeBatches = 0;

let observer: MutationObserver | null = null;
let isRunning = false;
let isApplyingInternal = false;

function loadCacheOnce(): void {
  if (cacheLoaded || typeof window === 'undefined') return;
  cacheLoaded = true;
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string' && k.length > 0 && v.length > 0) {
        translationCache.set(k, v);
      }
    }
  } catch {
    // Ignore corrupt or blocked storage
  }
}

function scheduleCacheSave(): void {
  if (typeof window === 'undefined') return;
  if (cacheSaveTimer) return;
  cacheSaveTimer = setTimeout(() => {
    cacheSaveTimer = null;
    try {
      while (translationCache.size > MAX_CACHE_ENTRIES) {
        const oldest = translationCache.keys().next().value;
        if (oldest === undefined) break;
        translationCache.delete(oldest);
      }
      const obj: Record<string, string> = {};
      for (const [k, v] of translationCache.entries()) {
        obj[k] = v;
      }
      window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Ignore quota errors
    }
  }, 600);
}

function setCachedTranslation(trimmedSrc: string, trimmedEn: string): void {
  if (translationCache.has(trimmedSrc)) {
    translationCache.delete(trimmedSrc);
  }
  translationCache.set(trimmedSrc, trimmedEn);
  scheduleCacheSave();
}

function preserveEdgeWhitespace(raw: string, translatedTrimmed: string): string {
  const leading = raw.match(/^\s*/)?.[0] ?? '';
  const trailing = raw.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translatedTrimmed}${trailing}`;
}

function isInsideNoTranslate(el: Element | null): boolean {
  let cur: Element | null = el;
  while (cur) {
    if (
      cur.getAttribute('data-no-translate') === 'true' ||
      cur.getAttribute('translate') === 'no'
    ) {
      return true;
    }
    if (SKIP_TAGS.has(cur.tagName)) {
      return true;
    }
    cur = cur.parentElement;
  }
  return false;
}

function resolveImmediate(raw: string): string | null {
  const staticHit = lookupStaticEn(raw);
  if (staticHit !== null) return staticHit;

  const trimmed = raw.trim();
  const cached = translationCache.get(trimmed);
  if (cached !== undefined) {
    return preserveEdgeWhitespace(raw, cached);
  }
  return null;
}

function applyTextNodeTranslation(node: Text, original: string, translated: string): void {
  if (!isRunning || !node.isConnected) return;
  const current = node.nodeValue ?? '';
  const existing = textNodeRecords.get(node);
  // Only apply if React hasn't already changed the node to something else
  if (existing && existing.original !== original) return;
  if (!existing && current !== original) return;

  isApplyingInternal = true;
  try {
    textNodeRecords.set(node, { original, translated });
    trackedTextNodes.add(node);
    if (node.nodeValue !== translated) {
      node.nodeValue = translated;
    }
  } finally {
    isApplyingInternal = false;
  }
}

function applyAttrTranslation(
  el: Element,
  attr: TranslatedAttr,
  original: string,
  translated: string,
): void {
  if (!isRunning || !el.isConnected) return;
  const current = el.getAttribute(attr);
  let map = attrRecords.get(el);
  const existing = map?.get(attr);
  if (existing && existing.original !== original) return;
  if (!existing && current !== original) return;

  isApplyingInternal = true;
  try {
    if (!map) {
      map = new Map();
      attrRecords.set(el, map);
    }
    map.set(attr, { original, translated });
    trackedAttrElements.add(el);
    if (el.getAttribute(attr) !== translated) {
      el.setAttribute(attr, translated);
    }
  } finally {
    isApplyingInternal = false;
  }
}

function enqueueAsyncTranslation(trimmedSrc: string, onDone: (en: string) => void): void {
  if (failedKeys.has(trimmedSrc)) return;

  let set = pendingCallbacks.get(trimmedSrc);
  if (!set) {
    set = new Set();
    pendingCallbacks.set(trimmedSrc, set);
  }
  set.add(onDone);

  if (!queuedSet.has(trimmedSrc)) {
    queuedSet.add(trimmedSrc);
    queuedKeys.push(trimmedSrc);
  }

  scheduleBatchFlush();
}

function scheduleBatchFlush(): void {
  if (batchTimer || !isRunning) return;
  batchTimer = setTimeout(() => {
    batchTimer = null;
    void flushBatches();
  }, BATCH_DELAY_MS);
}

async function flushBatches(): Promise<void> {
  if (!isRunning) return;
  while (activeBatches < MAX_CONCURRENT_BATCHES && queuedKeys.length > 0) {
    const chunk = queuedKeys.splice(0, BATCH_MAX_ITEMS);
    for (const key of chunk) {
      queuedSet.delete(key);
    }
    if (chunk.length === 0) break;
    activeBatches += 1;
    void processBatchChunk(chunk).finally(() => {
      activeBatches -= 1;
      if (isRunning && queuedKeys.length > 0) {
        scheduleBatchFlush();
      }
    });
  }
}

async function processBatchChunk(texts: string[]): Promise<void> {
  try {
    const response = await fetch('/api/translate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, targetLang: 'en' }),
    });

    if (!response.ok) {
      // On 429/5xx, don't permanently blacklist unless 400
      if (response.status === 400 || response.status === 503) {
        for (const t of texts) {
          pendingCallbacks.delete(t);
        }
      } else {
        for (const t of texts) {
          pendingCallbacks.delete(t);
        }
      }
      return;
    }

    const data = (await response.json()) as { translations?: unknown };
    const translations = Array.isArray(data.translations)
      ? data.translations
      : null;

    if (!translations || translations.length !== texts.length) {
      for (const t of texts) {
        pendingCallbacks.delete(t);
      }
      return;
    }

    for (let i = 0; i < texts.length; i += 1) {
      const src = texts[i];
      const rawEn = translations[i];
      const en = typeof rawEn === 'string' && rawEn.trim() ? rawEn.trim() : src;
      setCachedTranslation(src, en);

      const cbs = pendingCallbacks.get(src);
      pendingCallbacks.delete(src);
      if (cbs && isRunning) {
        for (const cb of cbs) {
          cb(en);
        }
      }
    }
  } catch {
    for (const t of texts) {
      failedKeys.add(t);
      pendingCallbacks.delete(t);
    }
  }
}

function processTextNode(node: Text): void {
  if (!isRunning || !node.isConnected) return;
  const parent = node.parentElement;
  if (!parent || isInsideNoTranslate(parent)) return;

  const raw = node.nodeValue ?? '';
  if (!raw.trim()) return;

  const existing = textNodeRecords.get(node);
  if (existing && raw === existing.translated) {
    // Already displaying our translation
    return;
  }

  // Either brand-new node, or React updated its text content
  const original = raw;
  const immediate = resolveImmediate(original);
  if (immediate !== null) {
    applyTextNodeTranslation(node, original, immediate);
    return;
  }

  if (!needsIndonesianTranslation(original)) {
    // Reset stale tracking if React updated to non-Indonesian text
    if (existing) {
      textNodeRecords.delete(node);
      trackedTextNodes.delete(node);
    }
    return;
  }

  // Record original before async fill
  textNodeRecords.set(node, { original, translated: original });
  trackedTextNodes.add(node);

  const trimmed = original.trim();
  enqueueAsyncTranslation(trimmed, (enTrimmed) => {
    const formatted = preserveEdgeWhitespace(original, enTrimmed);
    applyTextNodeTranslation(node, original, formatted);
  });
}

function processElementAttributes(el: Element): void {
  if (!isRunning || !el.isConnected) return;
  if (
    el.getAttribute('data-no-translate') === 'true' ||
    el.getAttribute('translate') === 'no'
  ) {
    return;
  }
  if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'SVG') {
    return;
  }

  for (const attr of TRANSLATED_ATTRS) {
    const raw = el.getAttribute(attr);
    if (!raw || !raw.trim()) continue;

    const existing = attrRecords.get(el)?.get(attr);
    if (existing && raw === existing.translated) continue;

    const original = raw;
    const immediate = resolveImmediate(original);
    if (immediate !== null) {
      applyAttrTranslation(el, attr, original, immediate);
      continue;
    }

    if (!needsIndonesianTranslation(original)) continue;

    let map = attrRecords.get(el);
    if (!map) {
      map = new Map();
      attrRecords.set(el, map);
    }
    map.set(attr, { original, translated: original });
    trackedAttrElements.add(el);

    const trimmed = original.trim();
    enqueueAsyncTranslation(trimmed, (enTrimmed) => {
      const formatted = preserveEdgeWhitespace(original, enTrimmed);
      applyAttrTranslation(el, attr, original, formatted);
    });
  }
}

function walkSubtree(root: Node): void {
  if (!isRunning) return;
  if (root.nodeType === Node.TEXT_NODE) {
    processTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (
      el.getAttribute('data-no-translate') === 'true' ||
      el.getAttribute('translate') === 'no'
    ) {
      return;
    }
    processElementAttributes(el);
    if (SKIP_TAGS.has(el.tagName)) return;
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (
            el.getAttribute('data-no-translate') === 'true' ||
            el.getAttribute('translate') === 'no'
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'SVG') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      processTextNode(current as Text);
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      processElementAttributes(current as Element);
    }
    current = walker.nextNode();
  }
}

function pruneDisconnected(): void {
  for (const node of trackedTextNodes) {
    if (!node.isConnected) {
      trackedTextNodes.delete(node);
    }
  }
  for (const el of trackedAttrElements) {
    if (!el.isConnected) {
      trackedAttrElements.delete(el);
    }
  }
}

export function startDomAutoTranslator(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  loadCacheOnce();
  failedKeys.clear();

  if (isRunning) {
    const root = document.getElementById('root') ?? document.body;
    if (root) walkSubtree(root);
    return;
  }

  isRunning = true;
  const target = document.getElementById('root') ?? document.body;
  if (!target) return;

  walkSubtree(target);

  observer = new MutationObserver((mutations) => {
    if (!isRunning || isApplyingInternal) return;
    if (trackedTextNodes.size > 2500) {
      pruneDisconnected();
    }
    for (const m of mutations) {
      if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
        processTextNode(m.target as Text);
      } else if (m.type === 'attributes' && m.target.nodeType === Node.ELEMENT_NODE) {
        processElementAttributes(m.target as Element);
      } else if (m.type === 'childList') {
        for (let i = 0; i < m.addedNodes.length; i += 1) {
          walkSubtree(m.addedNodes[i]);
        }
      }
    }
  });

  observer.observe(target, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder', 'title', 'aria-label'],
  });
}

export function stopDomAutoTranslatorAndRestore(): void {
  isRunning = false;

  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  queuedKeys.length = 0;
  queuedSet.clear();
  pendingCallbacks.clear();

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (typeof document === 'undefined') return;

  isApplyingInternal = true;
  try {
    for (const node of trackedTextNodes) {
      const rec = textNodeRecords.get(node);
      if (rec && node.isConnected && node.nodeValue === rec.translated) {
        node.nodeValue = rec.original;
      }
      textNodeRecords.delete(node);
    }
    trackedTextNodes.clear();

    for (const el of trackedAttrElements) {
      const map = attrRecords.get(el);
      if (map && el.isConnected) {
        for (const [attr, rec] of map.entries()) {
          if (el.getAttribute(attr) === rec.translated) {
            el.setAttribute(attr, rec.original);
          }
        }
      }
      attrRecords.delete(el);
    }
    trackedAttrElements.clear();
  } finally {
    isApplyingInternal = false;
  }
}
