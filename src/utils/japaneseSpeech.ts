/**
 * Lightweight Japanese Web Speech API (TTS) helper for pronouncing vocabulary,
 * bunpou patterns, and example sentences cleanly on mobile & desktop browsers.
 */

export function isJapaneseSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  if (!isJapaneseSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang.toLowerCase() === 'ja-jp' && v.localService) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('ja')) ??
    null
  );
}

export function stopJapaneseSpeech(): void {
  if (!isJapaneseSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore speech synthesis cancel errors
  }
}

export function speakJapanese(
  rawText: string,
  options?: {
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
  },
): boolean {
  if (!isJapaneseSpeechSupported()) return false;
  const cleaned = rawText
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/[~〜・／/]/g, ' ')
    .trim();
  if (!cleaned) return false;

  try {
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(cleaned);
    utterance.lang = 'ja-JP';
    utterance.rate = options?.rate ?? 0.95;
    utterance.pitch = 1;

    const jpVoice = pickJapaneseVoice();
    if (jpVoice) {
      utterance.voice = jpVoice;
    }

    if (options?.onStart) {
      utterance.onstart = options.onStart;
    }
    if (options?.onEnd) {
      utterance.onend = options.onEnd;
      utterance.onerror = options.onEnd;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    options?.onEnd?.();
    return false;
  }
}
