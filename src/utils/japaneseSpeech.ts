/**
 * Native Device Japanese Speech & Pronunciation engine:
 * - Uses the browser/OS built-in Web Speech API (`window.speechSynthesis`)
 *   synchronously inside user tap gestures for instant, zero-latency, offline-capable
 *   playback across Android Chrome, iOS Safari, and Desktop browsers.
 * - Keeps an active utterance reference and gentle keep-alive timer to avoid
 *   Chrome/Android garbage-collection and ~15s stall quirks on long example sentences.
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

let cachedPrefs: SpeechPreferences | null = null;
const prefListeners = new Set<(prefs: SpeechPreferences) => void>();

let activePlaybackToken = 0;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let speechKeepAliveTimer: number | null = null;

if (
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  typeof window.speechSynthesis.getVoices === 'function'
) {
  try {
    window.speechSynthesis.getVoices();
  } catch {
    // Ignore early voice list warm-up errors
  }
}

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
  return isDeviceSpeechSynthesisSupported();
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

/**
 * No-op retained for backward compatibility; voice-over uses native device
 * Web Speech synthesis directly with zero network calls.
 */
export function prefetchJapaneseSpeech(
  _rawText: string,
  _voiceStyle?: SpeechVoiceStyle,
): void {
  // Native device Web Speech plays synchronously without server prefetching
}

/**
 * No-op retained for backward compatibility; voice-over uses native device
 * Web Speech synthesis directly with zero network calls.
 */
export function prefetchJapaneseSpeechBatch(
  _rawTexts: readonly (string | null | undefined)[],
  _voiceStyle?: SpeechVoiceStyle,
): void {
  // Native device Web Speech plays synchronously without server prefetching
}

function clearSpeechKeepAlive(): void {
  if (speechKeepAliveTimer !== null && typeof window !== 'undefined') {
    window.clearInterval(speechKeepAliveTimer);
    speechKeepAliveTimer = null;
  }
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
    onLoadingChange?: (loading: boolean) => void;
  },
): boolean {
  if (!isDeviceSpeechSynthesisSupported()) {
    options.onLoadingChange?.(false);
    options.onEnd?.();
    return false;
  }

  try {
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) {
      synth.cancel();
    }

    const utterance = new window.SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'ja-JP';
    utterance.rate = options.rate;

    const voices = synth.getVoices();
    const { voice, pitch } = resolveJapaneseVoiceSelection(voices, {
      voiceStyle: options.voiceStyle,
      voiceURI: options.voiceURI,
    });
    utterance.pitch = pitch;
    if (voice) {
      utterance.voice = voice;
    }

    activeUtterance = utterance;

    let ended = false;
    const finishOnce = () => {
      if (ended) return;
      ended = true;
      clearSpeechKeepAlive();
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      if (activePlaybackToken === options.token) {
        options.onLoadingChange?.(false);
        options.onEnd?.();
      }
    };

    utterance.onstart = () => {
      if (activePlaybackToken === options.token) {
        options.onLoadingChange?.(false);
        options.onStart?.();
      }
    };
    utterance.onend = finishOnce;
    utterance.onerror = finishOnce;

    options.onLoadingChange?.(false);
    if (synth.paused && typeof synth.resume === 'function') {
      synth.resume();
    }
    synth.speak(utterance);

    // Prevent Chrome's ~15s speechSynthesis stall on longer Japanese example sentences
    clearSpeechKeepAlive();
    speechKeepAliveTimer = window.setInterval(() => {
      if (activePlaybackToken !== options.token || !synth.speaking) {
        clearSpeechKeepAlive();
        return;
      }
      if (synth.paused && typeof synth.resume === 'function') {
        synth.resume();
      }
    }, 8000);

    return true;
  } catch {
    clearSpeechKeepAlive();
    activeUtterance = null;
    options.onLoadingChange?.(false);
    options.onEnd?.();
    return false;
  }
}

export function stopJapaneseSpeech(): void {
  activePlaybackToken += 1;
  clearSpeechKeepAlive();
  activeUtterance = null;

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

  return speakViaDeviceWebSpeech(cleaned, {
    rate: effectiveRate,
    voiceStyle: effectiveStyle,
    voiceURI: effectiveVoiceURI,
    token,
    onStart: options?.onStart,
    onEnd: options?.onEnd,
    onLoadingChange: options?.onLoadingChange,
  });
}

/**
 * Runs a guided 3-stage shadowing cycle:
 * 1. Slow playback (0.75x or slower than current speed)
 * 2. Silent repeat countdown (2–5s depending on sentence length)
 * 3. Normal playback at user's preferred speed
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
