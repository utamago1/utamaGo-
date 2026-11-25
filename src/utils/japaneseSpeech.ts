/**
 * Hybrid Japanese Speech & Pronunciation engine:
 * - Primary: Server TTS (Gemini 3.8 Flash Lite TTS) for genuine Male (Charon)
 *   and Female (Kore) Japanese voices across all devices (including Android phones
 *   with only a single built-in TTS voice), backed by 2-layer browser Cache Storage
 *   + in-memory Blob/ArrayBuffer caching for instant offline replay.
 * - Mobile Autoplay Safe: Synchronously unlocks both a reusable HTMLAudioElement
 *   and Web Audio API AudioContext inside the user tap gesture before any async
 *   fetch, with automatic Web Audio decodeAudioData backup so async Male/Female
 *   server WAVs play reliably on Android Chrome & iOS Safari instead of falling
 *   back to the device's single female voice.
 * - Fallback: Device Web Speech API only when offline & uncached, when the server
 *   is unavailable, or when the user explicitly selects a multi-voice device voice.
 */

export type SpeechVoiceStyle = 'auto' | 'female' | 'male';

export interface SpeechPreferences {
  rate: number;
  voiceStyle: SpeechVoiceStyle;
  voiceURI: string;
  autoPlayAnki: boolean;
}

export interface JapaneseVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  detectedGender: 'female' | 'male' | 'unknown';
}

export type ShadowingStage = 'idle' | 'slow' | 'repeat' | 'normal';

export const SPEECH_PREFS_STORAGE_KEY = 'utamago_speech_prefs_v1';
export const TTS_BROWSER_CACHE_NAME = 'utamago-jp-tts-v2';

export const SPEECH_RATE_PRESETS = [0.6, 0.75, 0.9, 1.0, 1.15, 1.3] as const;

export const DEFAULT_SPEECH_PREFERENCES: SpeechPreferences = {
  rate: 1.0,
  voiceStyle: 'auto',
  voiceURI: '',
  autoPlayAnki: false,
};

const FEMALE_VOICE_PATTERNS = [
  'kyoko',
  'o-ren',
  'haruka',
  'ayumi',
  'sayaka',
  'nanami',
  'mayu',
  'shiori',
  'aoi',
  'mizuki',
  'female',
  'woman',
  '女',
  'jab',
  'jad',
];

const MALE_VOICE_PATTERNS = [
  'otoya',
  'hattori',
  'ichiro',
  'keita',
  'naoki',
  'daichi',
  'takumi',
  'kenji',
  'male',
  'man',
  '男',
  'jac',
  'jae',
];

const MEMORY_AUDIO_CACHE_MAX = 300;
const SERVER_TTS_TIMEOUT_MS = 15000;
const MAX_PREFETCH_CONCURRENCY = 2;
const DEFAULT_PCM_SAMPLE_RATE = 24000;
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

interface CachedAudioAsset {
  blobUrl: string;
  arrayBuffer: ArrayBuffer;
}

let cachedPrefs: SpeechPreferences | null = null;
const prefListeners = new Set<(prefs: SpeechPreferences) => void>();

let activePlaybackToken = 0;
let sharedAudioEl: HTMLAudioElement | null = null;
let sharedAudioUnlocked = false;
let sharedAudioCtx: AudioContext | null = null;
let activeBufferSource: AudioBufferSourceNode | null = null;
const activeScheduledSources = new Set<AudioBufferSourceNode>();
let activeAbortController: AbortController | null = null;
let serverTtsUnconfigured = false;
let serverTtsQuotaCooldownUntil = 0;

function isServerTtsInQuotaCooldown(): boolean {
  return Date.now() < serverTtsQuotaCooldownUntil;
}

function applyServerTtsQuotaCooldown(retryAfterSeconds?: number): void {
  const sec =
    typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)
      ? Math.max(10, Math.min(180, retryAfterSeconds))
      : 60;
  serverTtsQuotaCooldownUntil = Date.now() + sec * 1000;
}

const memoryAudioCache = new Map<string, CachedAudioAsset>();
const inflightTtsRequests = new Map<string, Promise<CachedAudioAsset | null>>();
const prefetchQueue: Array<{ text: string; style: SpeechVoiceStyle; cacheKey: string }> = [];
const prefetchQueuedKeys = new Set<string>();
let activePrefetchCount = 0;

export function clampSpeechRate(rate: number): number {
  if (!Number.isFinite(rate)) return DEFAULT_SPEECH_PREFERENCES.rate;
  return Math.round(Math.min(1.5, Math.max(0.5, rate)) * 100) / 100;
}

export function sanitizeSpeechPreferences(
  input: Partial<SpeechPreferences> | null | undefined,
): SpeechPreferences {
  const voiceStyle: SpeechVoiceStyle =
    input?.voiceStyle === 'female' ||
    input?.voiceStyle === 'male' ||
    input?.voiceStyle === 'auto'
      ? input.voiceStyle
      : DEFAULT_SPEECH_PREFERENCES.voiceStyle;

  return {
    rate:
      typeof input?.rate === 'number'
        ? clampSpeechRate(input.rate)
        : DEFAULT_SPEECH_PREFERENCES.rate,
    voiceStyle,
    voiceURI: typeof input?.voiceURI === 'string' ? input.voiceURI.trim() : '',
    autoPlayAnki: Boolean(input?.autoPlayAnki),
  };
}

export function loadSpeechPreferences(): SpeechPreferences {
  if (cachedPrefs) return cachedPrefs;
  if (typeof window === 'undefined') {
    return DEFAULT_SPEECH_PREFERENCES;
  }
  try {
    const raw = window.localStorage.getItem(SPEECH_PREFS_STORAGE_KEY);
    if (!raw) {
      cachedPrefs = DEFAULT_SPEECH_PREFERENCES;
      return cachedPrefs;
    }
    const parsed = JSON.parse(raw) as Partial<SpeechPreferences>;
    cachedPrefs = sanitizeSpeechPreferences(parsed);
    return cachedPrefs;
  } catch {
    cachedPrefs = DEFAULT_SPEECH_PREFERENCES;
    return cachedPrefs;
  }
}

export function saveSpeechPreferences(
  patch: Partial<SpeechPreferences>,
): SpeechPreferences {
  const current = loadSpeechPreferences();
  const next = sanitizeSpeechPreferences({ ...current, ...patch });
  cachedPrefs = next;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        SPEECH_PREFS_STORAGE_KEY,
        JSON.stringify(next),
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  prefListeners.forEach((listener) => listener(next));
  return next;
}

export function subscribeSpeechPreferences(
  listener: (prefs: SpeechPreferences) => void,
): () => void {
  prefListeners.add(listener);
  return () => {
    prefListeners.delete(listener);
  };
}

export function formatSpeechStyleLabel(style: SpeechVoiceStyle): string {
  if (style === 'female') return 'Cewek';
  if (style === 'male') return 'Cowok';
  return 'Otomatis';
}

export function formatSpeechRateLabel(rate: number): string {
  const clean = clampSpeechRate(rate);
  const hundredths = Math.round(clean * 100);
  return `${clean.toFixed(hundredths % 10 === 0 ? 1 : 2)}x`;
}

export function resolveServerTtsVoice(style: SpeechVoiceStyle): {
  voiceName: 'Kore' | 'Charon';
  normalizedStyle: 'female' | 'male';
} {
  if (style === 'male') {
    return { voiceName: 'Charon', normalizedStyle: 'male' };
  }
  return { voiceName: 'Kore', normalizedStyle: 'female' };
}

export function buildTtsCacheKey(text: string, style: SpeechVoiceStyle): string {
  const { normalizedStyle } = resolveServerTtsVoice(style);
  return `/_utamago-tts-cache/v2/${normalizedStyle}/${encodeURIComponent(text)}`;
}

export function detectJapaneseVoiceGender(
  voiceName: string,
): 'female' | 'male' | 'unknown' {
  const lower = voiceName.toLowerCase();
  if (MALE_VOICE_PATTERNS.some((p) => lower.includes(p))) {
    return 'male';
  }
  if (FEMALE_VOICE_PATTERNS.some((p) => lower.includes(p))) {
    return 'female';
  }
  return 'unknown';
}

export function isDeviceSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

export function isJapaneseSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof window.Audio === 'function' || isDeviceSpeechSynthesisSupported()
  );
}

export function listJapaneseVoices(): JapaneseVoiceOption[] {
  if (!isDeviceSpeechSynthesisSupported()) return [];
  const voices = window.speechSynthesis.getVoices();
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith('ja'))
    .map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      detectedGender: detectJapaneseVoiceGender(v.name),
    }))
    .sort((a, b) => {
      if (a.localService !== b.localService) return a.localService ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function resolveJapaneseVoiceSelection<
  TVoice extends {
    voiceURI: string;
    name: string;
    lang: string;
    localService?: boolean;
  },
>(
  voices: readonly TVoice[],
  prefs: Pick<SpeechPreferences, 'voiceStyle' | 'voiceURI'>,
): { voice: TVoice | null; pitch: number } {
  const jpVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ja'));

  if (prefs.voiceURI) {
    const exact = jpVoices.find((v) => v.voiceURI === prefs.voiceURI);
    if (exact) {
      const pitch =
        prefs.voiceStyle === 'male'
          ? 0.92
          : prefs.voiceStyle === 'female'
            ? 1.05
            : 1;
      return { voice: exact, pitch };
    }
  }

  if (prefs.voiceStyle === 'female' || prefs.voiceStyle === 'male') {
    const targetGender = prefs.voiceStyle;
    const matched =
      jpVoices.find(
        (v) =>
          v.localService && detectJapaneseVoiceGender(v.name) === targetGender,
      ) ??
      jpVoices.find((v) => detectJapaneseVoiceGender(v.name) === targetGender);

    if (matched) {
      return { voice: matched, pitch: 1 };
    }

    // Fallback: use best available Japanese voice with gentle pitch calibration
    const fallback =
      jpVoices.find((v) => v.lang.toLowerCase() === 'ja-jp' && v.localService) ??
      jpVoices[0] ??
      null;
    return {
      voice: fallback,
      pitch: targetGender === 'female' ? 1.12 : 0.84,
    };
  }

  const autoVoice =
    jpVoices.find((v) => v.lang.toLowerCase() === 'ja-jp' && v.localService) ??
    jpVoices[0] ??
    null;
  return { voice: autoVoice, pitch: 1 };
}

export function cleanJapaneseSpeechText(rawText: string): string {
  return rawText
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/[~〜・／/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getOrCreateSharedAudioEl(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof window.Audio !== 'function') {
    return null;
  }
  if (!sharedAudioEl) {
    sharedAudioEl = new window.Audio();
    sharedAudioEl.preload = 'auto';
  }
  return sharedAudioEl;
}

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxCtor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (typeof AudioCtxCtor !== 'function') return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtxCtor();
    } catch {
      return null;
    }
  }
  return sharedAudioCtx;
}

/**
 * Must be called synchronously inside the click/tap gesture before any await.
 * Unlocks both the reusable HTMLAudioElement and Web Audio AudioContext so
 * async server-generated male/female WAV audio is never blocked by Android
 * Chrome or iOS Safari autoplay policies.
 */
function unlockAudioPlaybackFromGesture(skipSilentHtmlPrime = false): void {
  const ctx = getOrCreateAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }

  if (skipSilentHtmlPrime || sharedAudioUnlocked) return;
  const audio = getOrCreateSharedAudioEl();
  if (!audio) return;

  try {
    audio.onplay = null;
    audio.onended = null;
    audio.onerror = null;
    audio.muted = true;
    audio.src = SILENT_WAV_DATA_URI;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      void playPromise
        .then(() => {
          sharedAudioUnlocked = true;
          if (audio.src === SILENT_WAV_DATA_URI) {
            audio.pause();
            audio.muted = false;
          }
        })
        .catch(() => {
          audio.muted = false;
        });
    } else {
      sharedAudioUnlocked = true;
      audio.muted = false;
    }
  } catch {
    audio.muted = false;
  }
}

function storeMemoryAudioAsset(
  cacheKey: string,
  arrayBuffer: ArrayBuffer,
  mimeType = 'audio/wav',
): CachedAudioAsset {
  const existing = memoryAudioCache.get(cacheKey);
  if (existing) {
    memoryAudioCache.delete(cacheKey);
    memoryAudioCache.set(cacheKey, existing);
    return existing;
  }

  const blob = new Blob([arrayBuffer], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  const asset: CachedAudioAsset = { blobUrl, arrayBuffer };
  memoryAudioCache.set(cacheKey, asset);

  if (memoryAudioCache.size > MEMORY_AUDIO_CACHE_MAX) {
    const oldestKey = memoryAudioCache.keys().next().value;
    if (oldestKey) {
      const oldest = memoryAudioCache.get(oldestKey);
      memoryAudioCache.delete(oldestKey);
      if (oldest?.blobUrl) {
        try {
          URL.revokeObjectURL(oldest.blobUrl);
        } catch {
          // Ignore revoke failures
        }
      }
    }
  }
  return asset;
}

async function readPersistentTtsCache(
  cacheKey: string,
): Promise<{ arrayBuffer: ArrayBuffer; mimeType: string } | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await window.caches.open(TTS_BROWSER_CACHE_NAME);
    const match = await cache.match(cacheKey);
    if (!match) return null;
    const arrayBuffer = await match.arrayBuffer();
    if (arrayBuffer.byteLength <= 44) return null;
    return {
      arrayBuffer,
      mimeType: match.headers.get('content-type') || 'audio/wav',
    };
  } catch {
    return null;
  }
}

async function writePersistentTtsCache(
  cacheKey: string,
  arrayBuffer: ArrayBuffer,
  mimeType = 'audio/wav',
): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await window.caches.open(TTS_BROWSER_CACHE_NAME);
    const response = new Response(arrayBuffer.slice(0), {
      status: 200,
      headers: { 'Content-Type': mimeType },
    });
    await cache.put(cacheKey, response);
  } catch {
    // Ignore Cache API quota or private-mode errors
  }
}

function buildWavArrayBufferFromPcm(
  pcmBytes: Uint8Array,
  sampleRate = DEFAULT_PCM_SAMPLE_RATE,
): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = new ArrayBuffer(44 + pcmBytes.byteLength);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.byteLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, pcmBytes.byteLength, true);

  new Uint8Array(buffer, 44).set(pcmBytes);
  return buffer;
}

function concatUint8Arrays(chunks: readonly Uint8Array[]): Uint8Array {
  let totalLen = 0;
  for (const c of chunks) totalLen += c.byteLength;
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

async function fetchServerTtsAsset(
  cleanedText: string,
  voiceStyle: SpeechVoiceStyle,
  externalSignal?: AbortSignal,
  maxAttempts = 2,
): Promise<CachedAudioAsset | null> {
  const cacheKey = buildTtsCacheKey(cleanedText, voiceStyle);

  // 1. Instant in-memory hit
  const memHit = memoryAudioCache.get(cacheKey);
  if (memHit) {
    memoryAudioCache.delete(cacheKey);
    memoryAudioCache.set(cacheKey, memHit);
    return memHit;
  }

  // 2. Persistent offline browser Cache Storage hit
  const diskHit = await readPersistentTtsCache(cacheKey);
  if (diskHit) {
    return storeMemoryAudioAsset(cacheKey, diskHit.arrayBuffer, diskHit.mimeType);
  }

  // 3. Offline or server quota cooldown check — fall back immediately (0ms)
  if (
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    isServerTtsInQuotaCooldown()
  ) {
    return null;
  }

  // 4. Deduplicate concurrent requests for the same phrase + voice style
  const existingInflight = inflightTtsRequests.get(cacheKey);
  if (existingInflight) {
    return existingInflight;
  }

  const requestPromise = (async (): Promise<CachedAudioAsset | null> => {
    const localController = new AbortController();
    const onExternalAbort = () => localController.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        localController.abort();
      } else {
        externalSignal.addEventListener('abort', onExternalAbort, {
          once: true,
        });
      }
    }

    const timeoutId =
      typeof window !== 'undefined'
        ? window.setTimeout(() => localController.abort(), SERVER_TTS_TIMEOUT_MS)
        : null;

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (localController.signal.aborted || isServerTtsInQuotaCooldown()) {
          return null;
        }

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanedText,
            voiceStyle,
          }),
          signal: localController.signal,
        });

        if (response.ok) {
          serverTtsUnconfigured = false;
          const contentType = response.headers.get('content-type') ?? '';
          if (!contentType.includes('audio/')) {
            if (attempt + 1 < maxAttempts) continue;
            return null;
          }

          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength <= 44) {
            if (attempt + 1 < maxAttempts) continue;
            return null;
          }

          const mimeType = contentType.split(';')[0].trim() || 'audio/wav';
          void writePersistentTtsCache(cacheKey, arrayBuffer, mimeType);
          return storeMemoryAudioAsset(cacheKey, arrayBuffer, mimeType);
        }

        if (response.status === 429) {
          try {
            const errBody = (await response.json()) as {
              code?: string;
              retryAfterSeconds?: number;
            };
            if (errBody?.code === 'QUOTA_EXCEEDED') {
              applyServerTtsQuotaCooldown(errBody.retryAfterSeconds);
            } else {
              applyServerTtsQuotaCooldown(30);
            }
          } catch {
            applyServerTtsQuotaCooldown(30);
          }
          return null;
        }

        if (response.status === 503) {
          try {
            const errBody = (await response.json()) as { error?: string };
            if (errBody?.error?.toLowerCase().includes('not configured')) {
              serverTtsUnconfigured = true;
              return null;
            }
          } catch {
            // Ignore non-JSON body
          }
        }

        if (attempt + 1 < maxAttempts && response.status >= 500) {
          await new Promise((resolve) => setTimeout(resolve, 260));
          continue;
        }
        return null;
      }
      return null;
    } catch {
      return null;
    } finally {
      if (timeoutId !== null && typeof window !== 'undefined') {
        window.clearTimeout(timeoutId);
      }
      externalSignal?.removeEventListener('abort', onExternalAbort);
      inflightTtsRequests.delete(cacheKey);
    }
  })();

  inflightTtsRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

function drainPrefetchQueue(): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (serverTtsUnconfigured) return;

  while (activePrefetchCount < MAX_PREFETCH_CONCURRENCY && prefetchQueue.length > 0) {
    const job = prefetchQueue.shift();
    if (!job) break;
    prefetchQueuedKeys.delete(job.cacheKey);

    if (memoryAudioCache.has(job.cacheKey) || inflightTtsRequests.has(job.cacheKey)) {
      continue;
    }

    activePrefetchCount += 1;
    void fetchServerTtsAsset(job.text, job.style, undefined, 1).finally(() => {
      activePrefetchCount = Math.max(0, activePrefetchCount - 1);
      drainPrefetchQueue();
    });
  }
}

/**
 * Quietly pre-warms the server TTS cache for a phrase (e.g. visible Anki card,
 * Bunpou pattern/example, or voice toggle) so clicking play hits memory in 0ms.
 */
export function prefetchJapaneseSpeech(
  rawText: string,
  voiceStyle?: SpeechVoiceStyle,
): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const cleaned = cleanJapaneseSpeechText(rawText);
  if (!cleaned) return;
  const style = voiceStyle ?? loadSpeechPreferences().voiceStyle;
  const cacheKey = buildTtsCacheKey(cleaned, style);

  if (
    memoryAudioCache.has(cacheKey) ||
    inflightTtsRequests.has(cacheKey) ||
    prefetchQueuedKeys.has(cacheKey)
  ) {
    return;
  }

  // Cap queue length so rapid navigation prioritizes the newest visible cards
  if (prefetchQueue.length >= 16) {
    const dropped = prefetchQueue.shift();
    if (dropped) prefetchQueuedKeys.delete(dropped.cacheKey);
  }

  prefetchQueuedKeys.add(cacheKey);
  prefetchQueue.push({ text: cleaned, style, cacheKey });
  drainPrefetchQueue();
}

/**
 * Pre-warms multiple Japanese words/sentences in priority order with bounded
 * concurrency so tapping "Dengar" on cards & examples feels instantaneous.
 */
export function prefetchJapaneseSpeechBatch(
  rawTexts: readonly (string | null | undefined)[],
  voiceStyle?: SpeechVoiceStyle,
): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  const style = voiceStyle ?? loadSpeechPreferences().voiceStyle;
  const seen = new Set<string>();
  for (const raw of rawTexts) {
    if (!raw) continue;
    const cleaned = cleanJapaneseSpeechText(raw);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    prefetchJapaneseSpeech(cleaned, style);
  }
}

/**
 * Streams raw 24kHz mono 16-bit LE PCM from `/api/tts/stream` and plays each
 * chunk gaplessly via Web Audio API as soon as byte 1 arrives (~250-450ms),
 * while simultaneously caching the assembled WAV into memory + Cache Storage.
 */
async function streamAndPlayServerTts(
  cleanedText: string,
  voiceStyle: SpeechVoiceStyle,
  rate: number,
  token: number,
  externalSignal: AbortSignal,
  callbacks: {
    onStart?: () => void;
    onEnd?: () => void;
    onLoadingChange?: (loading: boolean) => void;
  },
): Promise<'played' | 'aborted' | 'fallback'> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'fallback';
  }
  const ctx = getOrCreateAudioContext();
  if (!ctx) return 'fallback';

  const localController = new AbortController();
  const onExternalAbort = () => localController.abort();
  if (externalSignal.aborted) {
    return 'aborted';
  }
  externalSignal.addEventListener('abort', onExternalAbort, { once: true });

  const timeoutId =
    typeof window !== 'undefined'
      ? window.setTimeout(() => localController.abort(), SERVER_TTS_TIMEOUT_MS)
      : null;

  let startedPlayback = false;
  let endedFired = false;

  const fireEndOnce = () => {
    if (endedFired) return;
    endedFired = true;
    if (activePlaybackToken === token) {
      callbacks.onLoadingChange?.(false);
      callbacks.onEnd?.();
    }
  };

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (activePlaybackToken !== token || localController.signal.aborted) {
      return 'aborted';
    }

    const response = await fetch('/api/tts/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanedText,
        voiceStyle,
      }),
      signal: localController.signal,
    });

    if (!response.ok || !response.body) {
      if (response.status === 429) {
        try {
          const errBody = (await response.json()) as {
            code?: string;
            retryAfterSeconds?: number;
          };
          applyServerTtsQuotaCooldown(
            errBody?.code === 'QUOTA_EXCEEDED' ? errBody.retryAfterSeconds : 30,
          );
        } catch {
          applyServerTtsQuotaCooldown(30);
        }
        return 'fallback';
      }
      if (response.status === 503) {
        try {
          const errBody = (await response.json()) as { error?: string };
          if (errBody?.error?.toLowerCase().includes('not configured')) {
            serverTtsUnconfigured = true;
          }
        } catch {
          // Ignore non-JSON error
        }
      }
      return 'fallback';
    }

    serverTtsUnconfigured = false;
    const sampleRateHeader = Number(response.headers.get('x-tts-sample-rate'));
    const sampleRate =
      Number.isFinite(sampleRateHeader) && sampleRateHeader >= 8000
        ? sampleRateHeader
        : DEFAULT_PCM_SAMPLE_RATE;

    const reader = response.body.getReader();
    const collectedPcmChunks: Uint8Array[] = [];
    let isFirstChunk = true;
    let carryByte: number | null = null;
    let nextPlayTime = ctx.currentTime + 0.02;
    let streamDone = false;
    let pendingSources = 0;

    const schedulePcmBytes = (pcmSlice: Uint8Array) => {
      if (pcmSlice.byteLength < 2 || activePlaybackToken !== token) return;

      const sampleCount = Math.floor(pcmSlice.byteLength / 2);
      const audioBuffer = ctx.createBuffer(1, sampleCount, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(
        pcmSlice.buffer,
        pcmSlice.byteOffset,
        sampleCount * 2,
      );
      for (let i = 0; i < sampleCount; i += 1) {
        channelData[i] = dataView.getInt16(i * 2, true) / 32768;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = rate;
      source.connect(ctx.destination);

      const startAt = Math.max(ctx.currentTime + 0.012, nextPlayTime);
      nextPlayTime = startAt + audioBuffer.duration / rate;

      activeScheduledSources.add(source);
      pendingSources += 1;

      source.onended = () => {
        activeScheduledSources.delete(source);
        pendingSources = Math.max(0, pendingSources - 1);
        if (streamDone && pendingSources === 0) {
          fireEndOnce();
        }
      };

      source.start(startAt);

      if (!startedPlayback) {
        startedPlayback = true;
        if (activePlaybackToken === token) {
          callbacks.onLoadingChange?.(false);
          callbacks.onStart?.();
        }
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (activePlaybackToken !== token || localController.signal.aborted) {
        try {
          await reader.cancel();
        } catch {
          // Ignore reader cancel errors
        }
        return 'aborted';
      }
      if (!value || value.byteLength === 0) continue;

      let chunk = value;
      // Defensive check: strip 44-byte RIFF header if present on the very first chunk
      if (
        isFirstChunk &&
        chunk.byteLength >= 44 &&
        chunk[0] === 0x52 &&
        chunk[1] === 0x49 &&
        chunk[2] === 0x46 &&
        chunk[3] === 0x46
      ) {
        chunk = chunk.subarray(44);
      }
      isFirstChunk = false;

      if (chunk.byteLength === 0) continue;

      // Align 16-bit LE samples cleanly across arbitrary TCP chunk boundaries
      let aligned: Uint8Array;
      if (carryByte !== null) {
        aligned = new Uint8Array(1 + chunk.byteLength);
        aligned[0] = carryByte;
        aligned.set(chunk, 1);
        carryByte = null;
      } else {
        aligned = chunk;
      }

      if (aligned.byteLength % 2 === 1) {
        carryByte = aligned[aligned.byteLength - 1];
        aligned = aligned.subarray(0, aligned.byteLength - 1);
      }

      if (aligned.byteLength >= 2) {
        collectedPcmChunks.push(aligned.slice());
        schedulePcmBytes(aligned);
      }
    }

    streamDone = true;

    if (!startedPlayback) {
      return 'fallback';
    }

    // Cache full WAV into memory + persistent Cache Storage so replays are 0ms
    if (collectedPcmChunks.length > 0 && activePlaybackToken === token) {
      const fullPcm = concatUint8Arrays(collectedPcmChunks);
      if (fullPcm.byteLength >= 2) {
        const wavBuffer = buildWavArrayBufferFromPcm(fullPcm, sampleRate);
        const cacheKey = buildTtsCacheKey(cleanedText, voiceStyle);
        storeMemoryAudioAsset(cacheKey, wavBuffer, 'audio/wav');
        void writePersistentTtsCache(cacheKey, wavBuffer, 'audio/wav');
      }
    }

    if (pendingSources === 0) {
      fireEndOnce();
    }

    return 'played';
  } catch {
    if (activePlaybackToken !== token || localController.signal.aborted) {
      return 'aborted';
    }
    if (startedPlayback) {
      fireEndOnce();
      return 'played';
    }
    return 'fallback';
  } finally {
    if (timeoutId !== null && typeof window !== 'undefined') {
      window.clearTimeout(timeoutId);
    }
    externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

async function playAssetViaWebAudio(
  asset: CachedAudioAsset,
  rate: number,
  token: number,
  callbacks: { onStart?: () => void; onEnd?: () => void },
): Promise<boolean> {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (activePlaybackToken !== token) return true;

    const decoded = await ctx.decodeAudioData(asset.arrayBuffer.slice(0));
    if (activePlaybackToken !== token) return true;

    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.playbackRate.value = rate;
    source.connect(ctx.destination);
    activeBufferSource = source;

    source.onended = () => {
      if (activeBufferSource === source) {
        activeBufferSource = null;
      }
      if (activePlaybackToken === token) {
        callbacks.onEnd?.();
      }
    };

    source.start(0);
    if (activePlaybackToken === token) {
      callbacks.onStart?.();
    }
    return true;
  } catch {
    return false;
  }
}

async function playAssetViaHtmlAudio(
  asset: CachedAudioAsset,
  rate: number,
  token: number,
  callbacks: { onStart?: () => void; onEnd?: () => void },
): Promise<boolean> {
  const audio = getOrCreateSharedAudioEl();
  if (!audio) return false;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    let started = false;
    let ended = false;

    const cleanup = () => {
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
    };

    const finishOnce = () => {
      if (ended) return;
      ended = true;
      cleanup();
      if (activePlaybackToken === token) {
        callbacks.onEnd?.();
      }
    };

    try {
      cleanup();
      audio.pause();
      audio.muted = false;
      audio.volume = 1;
      audio.src = asset.blobUrl;
      audio.playbackRate = rate;
      if ('preservesPitch' in audio) {
        (audio as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch =
          true;
      }

      audio.onplay = () => {
        started = true;
        sharedAudioUnlocked = true;
        if (!settled) {
          settled = true;
          resolve(true);
        }
        if (activePlaybackToken === token) {
          callbacks.onStart?.();
        }
      };

      audio.onended = finishOnce;

      audio.onerror = () => {
        cleanup();
        if (!settled) {
          settled = true;
          resolve(false);
        } else if (!ended) {
          ended = true;
          if (activePlaybackToken === token) {
            callbacks.onEnd?.();
          }
        }
      };

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        void playPromise
          .then(() => {
            sharedAudioUnlocked = true;
            if (!settled) {
              settled = true;
              resolve(true);
            }
          })
          .catch(() => {
            if (!started) {
              cleanup();
              if (!settled) {
                settled = true;
                resolve(false);
              }
            }
          });
      }
    } catch {
      cleanup();
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }
  });
}

function speakViaDeviceWebSpeech(
  cleanedText: string,
  options: {
    rate: number;
    voiceStyle: SpeechVoiceStyle;
    voiceURI: string;
    token: number;
    onStart?: () => void;
    onEnd?: () => void;
  },
): boolean {
  if (!isDeviceSpeechSynthesisSupported()) {
    options.onEnd?.();
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'ja-JP';
    utterance.rate = options.rate;

    const voices = window.speechSynthesis.getVoices();
    const { voice, pitch } = resolveJapaneseVoiceSelection(voices, {
      voiceStyle: options.voiceStyle,
      voiceURI: options.voiceURI,
    });
    utterance.pitch = pitch;
    if (voice) {
      utterance.voice = voice;
    }

    let ended = false;
    const finishOnce = () => {
      if (ended) return;
      ended = true;
      if (activePlaybackToken === options.token) {
        options.onEnd?.();
      }
    };

    utterance.onstart = () => {
      if (activePlaybackToken === options.token) {
        options.onStart?.();
      }
    };
    utterance.onend = finishOnce;
    utterance.onerror = finishOnce;

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    options.onEnd?.();
    return false;
  }
}

export function stopJapaneseSpeech(): void {
  activePlaybackToken += 1;

  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {
      // Ignore abort errors
    }
    activeAbortController = null;
  }

  if (sharedAudioEl) {
    try {
      sharedAudioEl.onended = null;
      sharedAudioEl.onerror = null;
      sharedAudioEl.onplay = null;
      sharedAudioEl.pause();
      if (sharedAudioEl.readyState > 0) {
        sharedAudioEl.currentTime = 0;
      }
    } catch {
      // Ignore audio stop errors
    }
  }

  if (activeBufferSource) {
    try {
      activeBufferSource.onended = null;
      activeBufferSource.stop();
      activeBufferSource.disconnect();
    } catch {
      // Ignore Web Audio stop errors
    }
    activeBufferSource = null;
  }

  if (activeScheduledSources.size > 0) {
    activeScheduledSources.forEach((src) => {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        // Ignore scheduled source stop errors
      }
    });
    activeScheduledSources.clear();
  }

  if (isDeviceSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore speech synthesis cancel errors
    }
  }
}

export function speakJapanese(
  rawText: string,
  options?: {
    rate?: number;
    voiceStyle?: SpeechVoiceStyle;
    voiceURI?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onLoadingChange?: (loading: boolean) => void;
  },
): boolean {
  if (!isJapaneseSpeechSupported()) return false;
  const cleaned = cleanJapaneseSpeechText(rawText);
  if (!cleaned) return false;

  stopJapaneseSpeech();
  const token = activePlaybackToken;

  const prefs = loadSpeechPreferences();
  const effectiveRate =
    typeof options?.rate === 'number'
      ? clampSpeechRate(options.rate)
      : prefs.rate;
  const effectiveStyle = options?.voiceStyle ?? prefs.voiceStyle;
  const effectiveVoiceURI =
    options?.voiceURI !== undefined ? options.voiceURI : prefs.voiceURI;

  // Respect explicit device voice override only when device actually offers multiple Japanese voices
  const deviceVoices = listJapaneseVoices();
  const hasExplicitMultiVoiceChoice =
    Boolean(effectiveVoiceURI) &&
    deviceVoices.length > 1 &&
    deviceVoices.some((v) => v.voiceURI === effectiveVoiceURI);

  if (hasExplicitMultiVoiceChoice || typeof window.Audio !== 'function') {
    return speakViaDeviceWebSpeech(cleaned, {
      rate: effectiveRate,
      voiceStyle: effectiveStyle,
      voiceURI: effectiveVoiceURI,
      token,
      onStart: options?.onStart,
      onEnd: options?.onEnd,
    });
  }

  const cacheKey = buildTtsCacheKey(cleaned, effectiveStyle);
  const immediateAsset = memoryAudioCache.get(cacheKey);

  // Synchronously unlock audio pipelines inside the user tap gesture!
  unlockAudioPlaybackFromGesture(Boolean(immediateAsset));

  const controller = new AbortController();
  activeAbortController = controller;

  void (async () => {
    let asset: CachedAudioAsset | null = immediateAsset ?? null;

    // Check fast persistent browser Cache Storage (~2ms) before showing any loading state
    if (!asset) {
      const diskHit = await readPersistentTtsCache(cacheKey);
      if (activePlaybackToken !== token) return;
      if (diskHit) {
        asset = storeMemoryAudioAsset(cacheKey, diskHit.arrayBuffer, diskHit.mimeType);
      }
    }

    // If uncached and already being prefetched in flight, await that instead of duplicating
    if (!asset && inflightTtsRequests.has(cacheKey)) {
      options?.onLoadingChange?.(true);
      try {
        asset = await inflightTtsRequests.get(cacheKey)!;
      } finally {
        if (activePlaybackToken === token) {
          options?.onLoadingChange?.(false);
        }
      }
      if (activePlaybackToken !== token) return;
    }

    // Low-latency progressive PCM streaming for uncached phrases at normal speeds (0.85x–1.2x)
    const canStreamDirectly =
      !asset &&
      !serverTtsUnconfigured &&
      effectiveRate >= 0.85 &&
      effectiveRate <= 1.2 &&
      (typeof navigator === 'undefined' || navigator.onLine !== false);

    if (canStreamDirectly) {
      options?.onLoadingChange?.(true);
      const streamOutcome = await streamAndPlayServerTts(
        cleaned,
        effectiveStyle,
        effectiveRate,
        token,
        controller.signal,
        {
          onStart: options?.onStart,
          onEnd: options?.onEnd,
          onLoadingChange: options?.onLoadingChange,
        },
      );
      if (streamOutcome === 'played' || streamOutcome === 'aborted' || activePlaybackToken !== token) {
        return;
      }
    }

    // Unary /api/tts fetch (used for slow/fast pitch-preserved speeds or if stream failed)
    if (!asset) {
      options?.onLoadingChange?.(true);
      try {
        asset = await fetchServerTtsAsset(
          cleaned,
          effectiveStyle,
          controller.signal,
          2,
        );
      } finally {
        if (activePlaybackToken === token) {
          options?.onLoadingChange?.(false);
        }
      }
    }

    if (activePlaybackToken !== token) return;

    if (asset) {
      // Primary: gesture-unlocked HTMLAudioElement (preserves pitch across speeds)
      const htmlOk = await playAssetViaHtmlAudio(asset, effectiveRate, token, {
        onStart: options?.onStart,
        onEnd: options?.onEnd,
      });
      if (htmlOk || activePlaybackToken !== token) return;

      // Secondary: gesture-unlocked Web Audio API decodeAudioData playback of the exact same server WAV
      const webAudioOk = await playAssetViaWebAudio(asset, effectiveRate, token, {
        onStart: options?.onStart,
        onEnd: options?.onEnd,
      });
      if (webAudioOk || activePlaybackToken !== token) return;
    }

    // Strict voice-gender lock: never silently flip Cowok -> Cewek on a transient error while online
    if (activePlaybackToken !== token) return;
    const isOffline =
      typeof navigator !== 'undefined' && navigator.onLine === false;
    const hasMatchingGenderDeviceVoice =
      effectiveStyle === 'auto' ||
      deviceVoices.some(
        (v) => detectJapaneseVoiceGender(v.name) === effectiveStyle,
      );

    if (
      !isOffline &&
      !serverTtsUnconfigured &&
      !hasMatchingGenderDeviceVoice &&
      (effectiveStyle === 'male' || effectiveStyle === 'female')
    ) {
      options?.onEnd?.();
      return;
    }

    speakViaDeviceWebSpeech(cleaned, {
      rate: effectiveRate,
      voiceStyle: effectiveStyle,
      voiceURI: effectiveVoiceURI,
      token,
      onStart: options?.onStart,
      onEnd: options?.onEnd,
    });
  })();

  return true;
}

/**
 * Runs a guided 3-stage shadowing cycle:
 * 1. Slow playback (0.75x or slower than current speed)
 * 2. Silent repeat countdown (2–5s depending on sentence length)
 * 3. Normal playback at user's preferred speed (reuses cached WAV immediately!)
 * Returns a stop() function that cleanly aborts speech and timers.
 */
export function startShadowingSequence(
  rawText: string,
  callbacks: {
    onStageChange: (stage: ShadowingStage, repeatSecondsLeft?: number) => void;
    onComplete?: () => void;
  },
): { stop: () => void } {
  const cleaned = cleanJapaneseSpeechText(rawText);
  if (!isJapaneseSpeechSupported() || !cleaned) {
    callbacks.onStageChange('idle');
    callbacks.onComplete?.();
    return { stop: () => {} };
  }

  let cancelled = false;
  let intervalId: number | null = null;
  let timeoutId: number | null = null;

  const clearTimers = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const stop = () => {
    if (cancelled) return;
    cancelled = true;
    clearTimers();
    stopJapaneseSpeech();
    callbacks.onStageChange('idle');
  };

  const prefs = loadSpeechPreferences();
  const slowRate = clampSpeechRate(Math.min(0.75, prefs.rate * 0.8));
  const normalRate = prefs.rate;
  const repeatSeconds = Math.max(
    2,
    Math.min(5, Math.ceil(cleaned.length / 8) + 1),
  );

  callbacks.onStageChange('slow');
  const started = speakJapanese(cleaned, {
    rate: slowRate,
    onEnd: () => {
      if (cancelled) return;
      let remaining = repeatSeconds;
      callbacks.onStageChange('repeat', remaining);

      intervalId = window.setInterval(() => {
        if (cancelled) return;
        remaining -= 1;
        if (remaining > 0) {
          callbacks.onStageChange('repeat', remaining);
        } else {
          clearTimers();
          callbacks.onStageChange('normal');
          const normalOk = speakJapanese(cleaned, {
            rate: normalRate,
            onEnd: () => {
              if (cancelled) return;
              callbacks.onStageChange('idle');
              callbacks.onComplete?.();
            },
          });
          if (!normalOk && !cancelled) {
            callbacks.onStageChange('idle');
            callbacks.onComplete?.();
          }
        }
      }, 1000);
    },
  });

  if (!started) {
    cancelled = true;
    callbacks.onStageChange('idle');
    callbacks.onComplete?.();
  }

  return { stop };
}
