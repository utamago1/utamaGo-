/**
 * Authentic Japanese stroke-order (書き順 / kakijun) loader and parser.
 *
 * - All 46 Hiragana & 46 Katakana are bundled locally for instant offline access.
 * - Kanji (JLPT N5–N1) are fetched from KanjiVG (CC BY-SA 3.0) via jsDelivr CDN
 *   with raw GitHub fallback and cached in memory + localStorage for offline reuse.
 */

import {
  BUNDLED_KANA_STROKES,
  type CompactStrokeRecord,
} from '../data/kanaStrokeData';

export interface StrokeGuide {
  /** 1-based stroke order number */
  number: number;
  /** SVG path `d` string in 109x109 KanjiVG coordinate space */
  d: string;
  /** Exact starting X coordinate in 0..109 viewBox */
  startX: number;
  /** Exact starting Y coordinate in 0..109 viewBox */
  startY: number;
  /** Initial stroke direction angle in degrees (0 = right, 90 = down) */
  angleDeg: number;
  /** Recommended stroke-number badge X in 0..109 viewBox */
  labelX: number;
  /** Recommended stroke-number badge Y in 0..109 viewBox */
  labelY: number;
}

export interface CharacterStrokeData {
  character: string;
  strokeCount: number;
  strokes: StrokeGuide[];
  source: 'bundled' | 'kanjivg';
}

const STORAGE_CACHE_KEY = 'utamago_kanjivg_cache_v1';
const MAX_CACHED_KANJI = 180;

const memoryCache = new Map<string, CharacterStrokeData | null>();
const inflightRequests = new Map<string, Promise<CharacterStrokeData | null>>();

export function getKanjiVgHexCode(character: string): string | null {
  const trimmed = character.trim();
  if (!trimmed) return null;
  const codePoint = trimmed.codePointAt(0);
  if (codePoint === undefined) return null;
  return codePoint.toString(16).toLowerCase().padStart(5, '0');
}

/**
 * Extracts the starting point `(startX, startY)` and initial movement angle
 * (`angleDeg`) from an SVG path `d` command string (KanjiVG 109x109 viewBox).
 */
export function parsePathStartAndDirection(d: string): {
  startX: number;
  startY: number;
  angleDeg: number;
} {
  const moveMatch = d.match(
    /^\s*[Mm]\s*(-?\d*\.?\d+)[\s,]+(-?\d*\.?\d+)/,
  );
  if (!moveMatch) {
    return { startX: 54.5, startY: 54.5, angleDeg: 0 };
  }
  const startX = Number(moveMatch[1]);
  const startY = Number(moveMatch[2]);
  const rest = d.slice(moveMatch[0].length).trim();

  // Extract the first command after M and its numeric arguments
  const cmdMatch = rest.match(/^([cCsSqQlLhHvVtTaA])([^a-zA-Z]*)/);
  if (!cmdMatch) {
    return { startX, startY, angleDeg: 0 };
  }

  const cmd = cmdMatch[1];
  const nums = (cmdMatch[2].match(/-?\d*\.?\d+/g) ?? []).map(Number);

  let dx = 1;
  let dy = 0;

  if (cmd === 'c' && nums.length >= 6) {
    // Relative cubic Bezier: prefer first control vector if non-tiny, else endpoint
    dx = Math.hypot(nums[0], nums[1]) >= 1.5 ? nums[0] : nums[4];
    dy = Math.hypot(nums[0], nums[1]) >= 1.5 ? nums[1] : nums[5];
  } else if (cmd === 'C' && nums.length >= 6) {
    const c1dx = nums[0] - startX;
    const c1dy = nums[1] - startY;
    dx = Math.hypot(c1dx, c1dy) >= 1.5 ? c1dx : nums[4] - startX;
    dy = Math.hypot(c1dx, c1dy) >= 1.5 ? c1dy : nums[5] - startY;
  } else if ((cmd === 'q' || cmd === 's') && nums.length >= 4) {
    dx = Math.hypot(nums[0], nums[1]) >= 1.5 ? nums[0] : nums[2];
    dy = Math.hypot(nums[0], nums[1]) >= 1.5 ? nums[1] : nums[3];
  } else if ((cmd === 'Q' || cmd === 'S') && nums.length >= 4) {
    const c1dx = nums[0] - startX;
    const c1dy = nums[1] - startY;
    dx = Math.hypot(c1dx, c1dy) >= 1.5 ? c1dx : nums[2] - startX;
    dy = Math.hypot(c1dx, c1dy) >= 1.5 ? c1dy : nums[3] - startY;
  } else if (cmd === 'l' && nums.length >= 2) {
    dx = nums[0];
    dy = nums[1];
  } else if (cmd === 'L' && nums.length >= 2) {
    dx = nums[0] - startX;
    dy = nums[1] - startY;
  } else if (cmd === 'h' && nums.length >= 1) {
    dx = nums[0];
    dy = 0;
  } else if (cmd === 'H' && nums.length >= 1) {
    dx = nums[0] - startX;
    dy = 0;
  } else if (cmd === 'v' && nums.length >= 1) {
    dx = 0;
    dy = nums[0];
  } else if (cmd === 'V' && nums.length >= 1) {
    dx = 0;
    dy = nums[0] - startY;
  }

  const angleDeg =
    Math.hypot(dx, dy) > 0.01
      ? Math.round((Math.atan2(dy, dx) * 180) / Math.PI)
      : 0;

  return { startX, startY, angleDeg };
}

function hydrateCompactRecord(
  character: string,
  record: CompactStrokeRecord,
  source: 'bundled' | 'kanjivg',
): CharacterStrokeData {
  const strokes: StrokeGuide[] = record.p.map((d, idx) => {
    const { startX, startY, angleDeg } = parsePathStartAndDirection(d);
    const labelPair = record.n[idx];
    // KanjiVG text coordinates are baseline bottom-left; nudge slightly for centered badge
    const labelX = labelPair ? labelPair[0] + 2 : startX;
    const labelY = labelPair ? labelPair[1] - 2.5 : startY;
    return {
      number: idx + 1,
      d,
      startX,
      startY,
      angleDeg,
      labelX: Math.min(103, Math.max(6, labelX)),
      labelY: Math.min(103, Math.max(6, labelY)),
    };
  });

  return {
    character,
    strokeCount: strokes.length,
    strokes,
    source,
  };
}

export function parseKanjiVgSvg(
  character: string,
  svgText: string,
): CharacterStrokeData | null {
  const paths: string[] = [];
  const pathRegex = /<path[^>]*\bd="([^"]+)"[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(svgText)) !== null) {
    const d = match[1].trim();
    if (d) paths.push(d);
  }
  if (paths.length === 0) return null;

  const numbers: Array<[number, number]> = [];
  const numRegex =
    /<text[^>]*matrix\(1 0 0 1 ([\d.-]+) ([\d.-]+)\)[^>]*>(\d+)<\/text>/g;
  while ((match = numRegex.exec(svgText)) !== null) {
    numbers.push([Number(match[1]), Number(match[2])]);
  }

  return hydrateCompactRecord(
    character,
    { p: paths, n: numbers },
    'kanjivg',
  );
}

function readPersistentCache(): Record<string, CompactStrokeRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CompactStrokeRecord>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePersistentCacheEntry(
  character: string,
  data: CharacterStrokeData,
): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readPersistentCache();
    const compact: CompactStrokeRecord = {
      p: data.strokes.map((s) => s.d),
      n: data.strokes.map((s) => [
        Math.round((s.labelX - 2) * 10) / 10,
        Math.round((s.labelY + 2.5) * 10) / 10,
      ]),
    };
    current[character] = compact;

    // Trim oldest keys if cache exceeds limit
    const keys = Object.keys(current);
    if (keys.length > MAX_CACHED_KANJI) {
      const toRemove = keys.slice(0, keys.length - MAX_CACHED_KANJI);
      for (const k of toRemove) {
        delete current[k];
      }
    }

    window.localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Synchronously resolves bundled Kana or already-cached Kanji stroke data.
 */
export function getCachedStrokeData(
  character: string,
): CharacterStrokeData | null | undefined {
  const ch = character.trim().slice(0, 1);
  if (!ch) return null;

  if (memoryCache.has(ch)) {
    return memoryCache.get(ch);
  }

  const bundled = BUNDLED_KANA_STROKES[ch];
  if (bundled) {
    const hydrated = hydrateCompactRecord(ch, bundled, 'bundled');
    memoryCache.set(ch, hydrated);
    return hydrated;
  }

  const stored = readPersistentCache()[ch];
  if (stored && Array.isArray(stored.p) && stored.p.length > 0) {
    const hydrated = hydrateCompactRecord(ch, stored, 'kanjivg');
    memoryCache.set(ch, hydrated);
    return hydrated;
  }

  return undefined;
}

/**
 * Loads authentic KanjiVG stroke order for any Hiragana, Katakana, or JLPT Kanji.
 */
export async function loadCharacterStrokeData(
  character: string,
): Promise<CharacterStrokeData | null> {
  const ch = character.trim().slice(0, 1);
  if (!ch) return null;

  const cached = getCachedStrokeData(ch);
  if (cached !== undefined) return cached;

  const existingPromise = inflightRequests.get(ch);
  if (existingPromise) return existingPromise;

  const hex = getKanjiVgHexCode(ch);
  if (!hex) return null;

  const urls = [
    `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`,
    `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`,
  ];

  const promise = (async (): Promise<CharacterStrokeData | null> => {
    for (const url of urls) {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) continue;
        const svgText = await res.text();
        const parsed = parseKanjiVgSvg(ch, svgText);
        if (parsed) {
          memoryCache.set(ch, parsed);
          writePersistentCacheEntry(ch, parsed);
          return parsed;
        }
      } catch {
        // Try next mirror
      }
    }
    memoryCache.set(ch, null);
    return null;
  })();

  inflightRequests.set(ch, promise);
  try {
    return await promise;
  } finally {
    inflightRequests.delete(ch);
  }
}

export function prefetchCharacterStrokeData(character: string): void {
  const ch = character.trim().slice(0, 1);
  if (!ch) return;
  if (getCachedStrokeData(ch) !== undefined) return;
  void loadCharacterStrokeData(ch);
}
