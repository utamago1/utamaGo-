import type { TryOutPacketPartId } from '../utils/tryOutPacket';

export interface TryOutQuestionExplanation {
  focusTag: string;
  questionMeaning: string;
  whyChosenWrong: string;
  whyCorrectRight: string;
  distractorNotes: string;
  studyTip: string;
}

export interface TryOutExplanationRequest {
  levelLabel: string;
  examCode: string;
  partId: TryOutPacketPartId;
  itemId: string;
  questionNumber: number;
  mondaiTitle: string;
  mondaiInstruction?: string;
  prompt: string;
  options?: string[];
  chosen: string;
  chosenText?: string;
  correct: string;
  correctText?: string;
  passageContext?: string;
  transcript?: string;
}

const STORAGE_KEY = 'utamago_tryout_explanations_v1';
const MAX_LOCAL_CACHE_ENTRIES = 120;

interface CachedEntry {
  explanation: TryOutQuestionExplanation;
  savedAt: number;
}

const inFlightRequests = new Map<string, Promise<TryOutQuestionExplanation>>();

export function buildTryOutExplanationCacheKey(
  req: Pick<
    TryOutExplanationRequest,
    'levelLabel' | 'examCode' | 'partId' | 'itemId' | 'chosen' | 'correct'
  >,
): string {
  return [
    req.levelLabel.trim().toUpperCase(),
    req.examCode.trim(),
    req.partId,
    req.itemId,
    req.chosen.trim(),
    req.correct.trim(),
  ].join('|');
}

function readCacheStore(): Record<string, CachedEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, CachedEntry>;
  } catch {
    return {};
  }
}

function writeCacheStore(store: Record<string, CachedEntry>): void {
  if (typeof window === 'undefined') return;
  try {
    const entries = Object.entries(store);
    if (entries.length > MAX_LOCAL_CACHE_ENTRIES) {
      entries.sort((a, b) => (b[1]?.savedAt ?? 0) - (a[1]?.savedAt ?? 0));
      const trimmed: Record<string, CachedEntry> = {};
      for (const [k, v] of entries.slice(0, MAX_LOCAL_CACHE_ENTRIES)) {
        trimmed[k] = v;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore localStorage quota / private browsing errors
  }
}

export function getCachedTryOutExplanation(
  cacheKey: string,
): TryOutQuestionExplanation | null {
  const store = readCacheStore();
  const entry = store[cacheKey];
  if (!entry?.explanation?.whyChosenWrong || !entry?.explanation?.whyCorrectRight) {
    return null;
  }
  return entry.explanation;
}

function saveCachedTryOutExplanation(
  cacheKey: string,
  explanation: TryOutQuestionExplanation,
): void {
  const store = readCacheStore();
  store[cacheKey] = {
    explanation,
    savedAt: Date.now(),
  };
  writeCacheStore(store);
}

function parseExplanationPayload(raw: unknown): TryOutQuestionExplanation | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const focusTag =
    typeof obj.focusTag === 'string' && obj.focusTag.trim()
      ? obj.focusTag.trim()
      : 'Pembahasan JLPT';
  const questionMeaning =
    typeof obj.questionMeaning === 'string' ? obj.questionMeaning.trim() : '';
  const whyChosenWrong =
    typeof obj.whyChosenWrong === 'string' ? obj.whyChosenWrong.trim() : '';
  const whyCorrectRight =
    typeof obj.whyCorrectRight === 'string' ? obj.whyCorrectRight.trim() : '';
  const distractorNotes =
    typeof obj.distractorNotes === 'string' ? obj.distractorNotes.trim() : '';
  const studyTip =
    typeof obj.studyTip === 'string' ? obj.studyTip.trim() : '';

  if (!whyChosenWrong || !whyCorrectRight) return null;
  return {
    focusTag,
    questionMeaning,
    whyChosenWrong,
    whyCorrectRight,
    distractorNotes,
    studyTip,
  };
}

export async function fetchTryOutWrongExplanation(
  request: TryOutExplanationRequest,
): Promise<TryOutQuestionExplanation> {
  const cacheKey = buildTryOutExplanationCacheKey(request);
  const cached = getCachedTryOutExplanation(cacheKey);
  if (cached) {
    return cached;
  }

  const existing = inFlightRequests.get(cacheKey);
  if (existing) {
    return existing;
  }

  const task = (async (): Promise<TryOutQuestionExplanation> => {
    const response = await fetch('/api/tryout/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        levelLabel: request.levelLabel,
        examCode: request.examCode,
        partId: request.partId,
        questionNumber: request.questionNumber,
        mondaiTitle: request.mondaiTitle,
        mondaiInstruction: request.mondaiInstruction ?? '',
        prompt: request.prompt,
        options: request.options ?? [],
        chosen: request.chosen,
        chosenText: request.chosenText ?? '',
        correct: request.correct,
        correctText: request.correctText ?? '',
        passageContext: request.passageContext ?? '',
        transcript: request.transcript ?? '',
      }),
    });

    if (!response.ok) {
      let serverMsg = '';
      try {
        const errJson = (await response.json()) as { error?: unknown };
        if (typeof errJson.error === 'string') {
          serverMsg = errJson.error;
        }
      } catch {
        // Ignore non-JSON error body
      }
      if (response.status === 429) {
        throw new Error(
          serverMsg ||
            'Permintaan pembahasan terlalu cepat. Tunggu sebentar lalu coba lagi.',
        );
      }
      throw new Error(
        serverMsg ||
          'Gagal memuat pembahasan soal saat ini. Periksa koneksi lalu coba lagi.',
      );
    }

    const data = (await response.json()) as { explanation?: unknown };
    const parsed = parseExplanationPayload(data.explanation);
    if (!parsed) {
      throw new Error(
        'Format pembahasan tidak lengkap. Silakan coba muat ulang.',
      );
    }

    saveCachedTryOutExplanation(cacheKey, parsed);
    return parsed;
  })().finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, task);
  return task;
}
