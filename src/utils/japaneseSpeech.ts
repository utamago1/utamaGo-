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
    .replace(/^[A-ZＡ-Ｚ]\s*[:：]\s*/g, '')
    .replace(/\s+[A-ZＡ-Ｚ]\s*[:：]\s*/g, ' ')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/【[^】]*】/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/[~〜・／/…⋯+⇔→←]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PURE_KANA_PATTERN = /^[\u3040-\u30ff0-9０-９ー・、,\s]+$/;
const HAS_KANA_PATTERN = /[\u3040-\u30ff]/;
const HAS_KANJI_PATTERN = /[\u4e00-\u9faf]/;
const HAS_LATIN_PATTERN = /[A-Za-z]/;

const NON_JAPANESE_ROMAJI_WORDS = new Set([
  'kata',
  'bentuk',
  'kalimat',
  'bahasa',
  'negatif',
  'positif',
  'series',
  'dasar',
  'salam',
  'angka',
  'tujuan',
  'urutan',
  'lokasi',
  'sarana',
  'pengganti',
  'penegasan',
  'keberadaan',
  'menerangkan',
  'ungkapan',
  'lampau',
  'tanya',
  'tunjuk',
  'benda',
  'kerja',
  'sifat',
  'atau',
  'dan',
  'dengan',
  'untuk',
  'yang',
  'dari',
  'dalam',
  'pada',
  'makna',
  'formal',
  'kasual',
  'sopan',
  'hormat',
  'merendah',
  'alat',
  'persetujuan',
  'tindakan',
  'pergi',
  'datang',
  'pulang',
  'bantu',
  'bilangan',
]);

const ROMAJI_TO_HIRAGANA_TABLE: Readonly<Record<string, string>> = {
  // 4-char / special combos
  ltsu: 'っ',
  xtsu: 'っ',
  // 3-char Hepburn & Kunrei
  kya: 'きゃ',
  kyu: 'きゅ',
  kyo: 'きょ',
  gya: 'ぎゃ',
  gyu: 'ぎゅ',
  gyo: 'ぎょ',
  sha: 'しゃ',
  shi: 'し',
  shu: 'しゅ',
  sho: 'しょ',
  sya: 'しゃ',
  syu: 'しゅ',
  syo: 'しょ',
  zya: 'じゃ',
  zyu: 'じゅ',
  zyo: 'じょ',
  jya: 'じゃ',
  jyu: 'じゅ',
  jyo: 'じょ',
  cha: 'ちゃ',
  chi: 'ち',
  chu: 'ちゅ',
  cho: 'ちょ',
  tya: 'ちゃ',
  tyu: 'ちゅ',
  tyo: 'ちょ',
  cya: 'ちゃ',
  cyu: 'ちゅ',
  cyo: 'ちょ',
  tsu: 'つ',
  dya: 'ぢゃ',
  dyu: 'ぢゅ',
  dyo: 'ぢょ',
  nya: 'にゃ',
  nyu: 'にゅ',
  nyo: 'にょ',
  hya: 'ひゃ',
  hyu: 'ひゅ',
  hyo: 'ひょ',
  bya: 'びゃ',
  byu: 'びゅ',
  byo: 'びょ',
  pya: 'ぴゃ',
  pyu: 'ぴゅ',
  pyo: 'ぴょ',
  mya: 'みゃ',
  myu: 'みゅ',
  myo: 'みょ',
  rya: 'りゃ',
  ryu: 'りゅ',
  ryo: 'りょ',
  // 2-char Hepburn & Kunrei
  ka: 'か',
  ki: 'き',
  ku: 'く',
  ke: 'け',
  ko: 'こ',
  ga: 'が',
  gi: 'ぎ',
  gu: 'ぐ',
  ge: 'げ',
  go: 'ご',
  sa: 'さ',
  si: 'し',
  su: 'す',
  se: 'せ',
  so: 'そ',
  za: 'ざ',
  zi: 'じ',
  ji: 'じ',
  zu: 'ず',
  ze: 'ぜ',
  zo: 'ぞ',
  ja: 'じゃ',
  ju: 'じゅ',
  jo: 'じょ',
  ta: 'た',
  ti: 'ち',
  tu: 'つ',
  te: 'て',
  to: 'と',
  da: 'だ',
  di: 'ぢ',
  du: 'づ',
  de: 'で',
  do: 'ど',
  na: 'な',
  ni: 'に',
  nu: 'ぬ',
  ne: 'ね',
  no: 'の',
  ha: 'は',
  hi: 'ひ',
  fu: 'ふ',
  hu: 'ふ',
  he: 'へ',
  ho: 'ほ',
  ba: 'ば',
  bi: 'び',
  bu: 'ぶ',
  be: 'べ',
  bo: 'ぼ',
  pa: 'ぱ',
  pi: 'ぴ',
  pu: 'ぷ',
  pe: 'ぺ',
  po: 'ぽ',
  ma: 'ま',
  mi: 'み',
  mu: 'む',
  me: 'め',
  mo: 'も',
  ya: 'や',
  yu: 'ゆ',
  yo: 'よ',
  ra: 'ら',
  ri: 'り',
  ru: 'る',
  re: 'れ',
  ro: 'ろ',
  wa: 'わ',
  wi: 'ゐ',
  we: 'ゑ',
  wo: 'を',
  fa: 'ふぁ',
  fi: 'ふぃ',
  fe: 'ふぇ',
  fo: 'ふぉ',
  va: 'ゔぁ',
  vi: 'ゔぃ',
  vu: 'ゔ',
  ve: 'ゔぇ',
  vo: 'ゔぉ',
  // 1-char vowels
  a: 'あ',
  i: 'い',
  u: 'う',
  e: 'え',
  o: 'お',
};

const DOUBLE_CONSONANT_LETTERS = new Set([
  'k',
  's',
  't',
  'p',
  'g',
  'z',
  'd',
  'b',
  'h',
  'f',
  'r',
  'j',
  'w',
  'c',
]);

function convertSingleRomajiSegmentToHiragana(segment: string): string | null {
  const trimmed = segment.trim();
  if (!trimmed) return null;
  if (
    HAS_KANA_PATTERN.test(trimmed) ||
    HAS_KANJI_PATTERN.test(trimmed) ||
    /[0-9+:=[\]{}<>]/.test(trimmed)
  ) {
    return null;
  }

  // Strip optional parens (keeping content like "(ni)" -> "ni"), ellipses, tildes
  const cleaned = trimmed
    .replace(/\(([A-Za-z'\s]+)\)/g, '$1')
    .replace(/[~〜….,!?'"`]/g, ' ')
    .replace(/ā/gi, 'aa')
    .replace(/ī/gi, 'ii')
    .replace(/ū/gi, 'uu')
    .replace(/ē/gi, 'ee')
    .replace(/ō/gi, 'ou')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || /[^A-Za-z\s-]/.test(cleaned)) {
    return null;
  }

  // Reject grammar formula placeholders like "V-te" or "ko-series"
  if (/(?:^|\s)[A-Z]-|\bseries\b/i.test(cleaned)) {
    return null;
  }

  const normalized = cleaned.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const words = normalized.toLowerCase().split(' ').filter(Boolean);
  if (words.length === 0) return null;

  // Reject Indonesian/English description text
  if (words.some((w) => NON_JAPANESE_ROMAJI_WORDS.has(w))) {
    return null;
  }

  let result = '';
  for (const word of words) {
    // Preserve authentic Japanese particle orthography so ja-JP TTS gets natural pitch cues
    if (word === 'wa') {
      result += 'は';
      continue;
    }
    if (word === 'o') {
      result += 'を';
      continue;
    }

    let i = 0;
    while (i < word.length) {
      const rest = word.slice(i);

      // Handle "tch" -> "っち" (e.g., "matcha", "kotchi")
      if (rest.startsWith('tch')) {
        result += 'っ';
        i += 1;
        continue;
      }

      // Handle double consonant sokuon (kk, ss, tt, pp, etc.)
      if (
        rest.length >= 2 &&
        rest[0] === rest[1] &&
        DOUBLE_CONSONANT_LETTERS.has(rest[0])
      ) {
        result += 'っ';
        i += 1;
        continue;
      }

      // Handle "m" before p/b/m (traditional Hepburn like "shimpai", "gambaru")
      if (
        rest[0] === 'm' &&
        rest.length >= 2 &&
        (rest[1] === 'p' || rest[1] === 'b' || rest[1] === 'm')
      ) {
        result += 'ん';
        i += 1;
        continue;
      }

      // Try longest kana match (4 -> 3 -> 2 -> 1)
      let matched = false;
      for (const len of [4, 3, 2, 1]) {
        if (rest.length >= len) {
          const chunk = rest.slice(0, len);
          const kana = ROMAJI_TO_HIRAGANA_TABLE[chunk];
          if (kana) {
            result += kana;
            i += len;
            matched = true;
            break;
          }
        }
      }
      if (matched) continue;

      // Handle syllabic "n" at end of word or before consonant (except y/vowels)
      if (rest[0] === 'n') {
        const nextChar = rest[1];
        if (!nextChar || !'aiueoy'.includes(nextChar)) {
          result += 'ん';
          i += 1;
          continue;
        }
      }

      // Unknown / non-Japanese sequence -> abort conversion
      return null;
    }
  }

  return result || null;
}

/**
 * Strictly converts Japanese romaji (e.g. "sai (ni)", "ue (de)", "ni atatte / ni atari")
 * into pure Hiragana so native device ja-JP TTS never misreads isolated kanji.
 * Returns null if the input is Indonesian/English notes rather than pure Japanese romaji.
 */
export function romajiToHiragana(rawRomaji: string | null | undefined): string | null {
  if (!rawRomaji || !rawRomaji.trim()) return null;

  // For entries like "sonkeigo = bahasa hormat", isolate the Japanese term before "="
  const beforeEquals = rawRomaji.split('=')[0]?.trim() || '';
  if (!beforeEquals) return null;

  // If the romaji field itself is an Indonesian grammar gloss (e.g. "~no / pengganti kata benda",
  // "~desu / ~masu / negatif"), reject it so we read the full Japanese pattern instead.
  const allLowerWords = beforeEquals
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  if (
    HAS_KANA_PATTERN.test(beforeEquals) ||
    HAS_KANJI_PATTERN.test(beforeEquals) ||
    allLowerWords.some((w) => NON_JAPANESE_ROMAJI_WORDS.has(w))
  ) {
    return null;
  }

  // Strip trailing numbers/glosses like "ukemi 1" or "kenjougo 1"
  const variants = beforeEquals
    .split(/[／/]/)
    .map((part) => part.replace(/\s*-\s*.*$/, '').replace(/\s+\d+$/, '').trim())
    .filter(Boolean);

  if (variants.length === 0) return null;

  const converted: string[] = [];
  for (const variant of variants) {
    const kana = convertSingleRomajiSegmentToHiragana(variant);
    if (kana) {
      converted.push(kana);
    }
  }

  if (converted.length === 0) return null;

  // If the first variant is ultra-short (e.g. "ya" in "ya / ya ina ya"),
  // prefer the more distinctive second variant ("やいなや") when available.
  if (converted.length > 1 && converted[0].length <= 2 && converted[1].length > converted[0].length) {
    return converted[1];
  }
  return converted[0];
}

function cleanBunpouPatternFallback(rawPattern: string): string {
  let text = rawPattern
    .replace(/\[[^\]]*\]/g, '')
    .replace(/【[^】]*】/g, '')
    // Unwrap short optional Hiragana particles like "(に)" -> "に", "(ら)" -> "ら", "(せら)" -> "せら"
    .replace(/\(([\u3040-\u309f]{1,4})\)/g, '$1')
    .replace(/（([\u3040-\u309f]{1,4})）/g, '$1');

  // Iteratively strip any remaining (including nested) parenthetical notes like ((ra)remasu) or (現在肯定形...)
  for (let pass = 0; pass < 4; pass += 1) {
    const next = text
      .replace(/\([^()]*\)/g, '')
      .replace(/（[^（）]*）/g, '');
    if (next === text) break;
    text = next;
  }

  text = text.replace(/\s*—\s*.*$/, '').trim();

  // Take the first alternative when separated by "/" or "／"
  const firstAlt = text.split(/[／/]/)[0]?.trim() || text;
  return firstAlt
    .replace(/[~〜…⋯+⇔→←]/g, ' ')
    .replace(/[「」『』()（）]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves the cleanest, unambiguous Japanese speech string for a Bunpou pattern.
 * Prefers exact Hiragana derived from romaji so native TTS reads 〜際(に) as さいに
 * instead of きわ, 〜上(で) as うえで instead of じょうで, and 〜最中だ as さいちゅうだ.
 */
export function resolveBunpouSpeechText(item: {
  pattern?: string | null;
  romaji?: string | null;
}): string {
  const kanaFromRomaji = romajiToHiragana(item.romaji);
  if (kanaFromRomaji) {
    return kanaFromRomaji;
  }
  const fallback = cleanBunpouPatternFallback(item.pattern || '');
  return fallback || cleanJapaneseSpeechText(item.pattern || '');
}

function extractPureKanaReading(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed || HAS_KANJI_PATTERN.test(trimmed) || HAS_LATIN_PATTERN.test(trimmed)) {
    return null;
  }
  if (!HAS_KANA_PATTERN.test(trimmed)) return null;
  // Take first clean reading if multiple readings are separated by ・ / 、
  const first = trimmed.split(/[・／/,、]/)[0]?.trim() || trimmed;
  return PURE_KANA_PATTERN.test(first) ? first : null;
}

function extractKanaFromReadingTerm(readingTerm: string | null | undefined): string | null {
  if (!readingTerm) return null;
  const match = readingTerm.match(/[（(]([^）)]+)[）)]/);
  if (!match) return null;
  return extractPureKanaReading(match[1]);
}

export interface SpeechCardInput {
  word?: string | null;
  furigana?: string | null;
  readingTerm?: string | null;
  romaji?: string | null;
  cardKind?: 'vocab' | 'bunpou' | string;
}

/**
 * Resolves the exact Japanese text to pass to native Web Speech for an Anki card.
 * - Vocab cards: strongly prefer pure kana furigana (e.g. 夢 -> ゆめ, 一日 -> ついたち/いちにち)
 *   so native device TTS never misreads isolated kanji with on'yomi (e.g. 夢 -> む).
 * - Bunpou cards: convert clean romaji to pure Hiragana (e.g. 〜際(に) -> さいに)
 *   or cleanly preserve optional particles without stripping them.
 */
export function resolveAnkiCardSpeechText(
  card: SpeechCardInput | null | undefined,
): string {
  if (!card) return '';
  if (card.cardKind === 'bunpou') {
    return resolveBunpouSpeechText({
      pattern: card.word || card.readingTerm || '',
      romaji: card.romaji,
    });
  }

  const kana =
    extractPureKanaReading(card.furigana) ??
    extractKanaFromReadingTerm(card.readingTerm);
  if (kana) {
    return kana;
  }

  return (card.word || card.readingTerm || '').trim();
}

/**
 * Resolves exact Japanese speech text for Writing Studio items, preferring
 * the kana reading of the example word over bare kanji.
 */
export function resolveWritingItemSpeechText(item: {
  character: string;
  reading?: string | null;
  exampleWord?: string | null;
  exampleReading?: string | null;
}): string {
  if (item.exampleWord) {
    const exampleKana = extractPureKanaReading(item.exampleReading);
    if (exampleKana) return exampleKana;
    return item.exampleWord;
  }
  const charKana = extractPureKanaReading(item.reading);
  if (charKana) return charKana;
  return item.character;
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
  const effectiveStyle = options?.voiceStyle ?? 'auto';
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
