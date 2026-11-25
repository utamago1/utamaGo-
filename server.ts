import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';

dotenv.config();

type TtsVoiceStyle = 'auto' | 'female' | 'male';

const TTS_MAX_TEXT_LENGTH = 260;
const TTS_CACHE_MAX_ENTRIES = 1500;
const TTS_RATE_LIMIT_WINDOW_MS = 60_000;
const TTS_RATE_LIMIT_MAX_REQUESTS = 240;
const TTS_SAMPLE_RATE = 24_000;

let geminiTtsClient: GoogleGenAI | null = null;
const ttsAudioCache = new Map<string, Buffer>();
const ttsRateLimitBuckets = new Map<string, number[]>();

function getGeminiTtsClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!geminiTtsClient) {
    geminiTtsClient = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return geminiTtsClient;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function checkTtsRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - TTS_RATE_LIMIT_WINDOW_MS;
  const recent = (ttsRateLimitBuckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= TTS_RATE_LIMIT_MAX_REQUESTS) {
    ttsRateLimitBuckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  ttsRateLimitBuckets.set(ip, recent);

  if (ttsRateLimitBuckets.size > 500) {
    for (const [key, timestamps] of ttsRateLimitBuckets.entries()) {
      const kept = timestamps.filter((t) => t > cutoff);
      if (kept.length === 0) ttsRateLimitBuckets.delete(key);
      else ttsRateLimitBuckets.set(key, kept);
    }
  }
  return true;
}

function setTtsCacheEntry(cacheKey: string, wavBuffer: Buffer): void {
  if (ttsAudioCache.has(cacheKey)) {
    ttsAudioCache.delete(cacheKey);
  }
  ttsAudioCache.set(cacheKey, wavBuffer);
  if (ttsAudioCache.size > TTS_CACHE_MAX_ENTRIES) {
    const oldestKey = ttsAudioCache.keys().next().value;
    if (oldestKey) ttsAudioCache.delete(oldestKey);
  }
}

function wrapPcm24kMonoToWav(pcmBuffer: Buffer): Buffer {
  const header = Buffer.alloc(44);
  const dataSize = pcmBuffer.length;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // Mono
  header.writeUInt32LE(TTS_SAMPLE_RATE, 24);
  header.writeUInt32LE(TTS_SAMPLE_RATE * 2, 28); // Byte rate
  header.writeUInt16LE(2, 32); // Block align
  header.writeUInt16LE(16, 34); // Bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

function resolveTtsVoiceConfig(rawStyle: unknown): {
  voiceStyle: TtsVoiceStyle;
  voiceName: 'Charon' | 'Kore';
  styleInstruction: string;
} {
  const voiceStyle: TtsVoiceStyle =
    rawStyle === 'male' || rawStyle === 'female' || rawStyle === 'auto'
      ? rawStyle
      : 'auto';
  const voiceName: 'Charon' | 'Kore' = voiceStyle === 'male' ? 'Charon' : 'Kore';
  const styleInstruction =
    voiceStyle === 'male'
      ? 'Deep, clear, natural adult male standard Tokyo Japanese native speaker for JLPT pronunciation'
      : 'Clear, natural adult female standard Tokyo Japanese native speaker for JLPT pronunciation';
  return { voiceStyle, voiceName, styleInstruction };
}

async function handleJapaneseTts(req: Request, res: Response): Promise<void> {
  const body = req.body as { text?: unknown; voiceStyle?: unknown } | undefined;
  const rawText = typeof body?.text === 'string' ? body.text.trim() : '';

  if (!rawText) {
    res.status(400).json({ error: 'Text is required.' });
    return;
  }
  if (rawText.length > TTS_MAX_TEXT_LENGTH) {
    res.status(400).json({ error: 'Text exceeds maximum length.' });
    return;
  }

  const { voiceName, styleInstruction } = resolveTtsVoiceConfig(body?.voiceStyle);
  const normalizedText = rawText.replace(/\s+/g, ' ').trim();
  const cacheKey = `${voiceName}:${normalizedText}`;

  const cached = ttsAudioCache.get(cacheKey);
  if (cached) {
    ttsAudioCache.delete(cacheKey);
    ttsAudioCache.set(cacheKey, cached);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.setHeader('X-TTS-Voice', voiceName);
    res.setHeader('X-TTS-Cache', 'HIT');
    res.status(200).send(cached);
    return;
  }

  const clientIp = getClientIp(req);
  if (!checkTtsRateLimit(clientIp)) {
    res.status(429).json({ error: 'Too many TTS requests. Please wait a moment.' });
    return;
  }

  const ai = getGeminiTtsClient();
  if (!ai) {
    res.status(503).json({ error: 'TTS service is not configured.' });
    return;
  }

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: normalizedText,
                speechMetadata: {
                  style: styleInstruction,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        if (attempt === 0) continue;
        res.status(502).json({ error: 'No audio returned by TTS service.' });
        return;
      }

      // Unary Gemini 3.8 TTS returns a complete RIFF WAV file (24kHz mono 16-bit).
      const wavBuffer = Buffer.from(base64Audio, 'base64');
      setTtsCacheEntry(cacheKey, wavBuffer);

      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.setHeader('X-TTS-Voice', voiceName);
      res.setHeader('X-TTS-Cache', 'MISS');
      res.status(200).send(wavBuffer);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 220));
      }
    }
  }

  console.error(
    '[TTS] Gemini TTS request failed:',
    lastErr instanceof Error ? lastErr.message : 'unknown error',
  );
  res.status(503).json({ error: 'TTS service temporarily unavailable.' });
}

/**
 * Low-latency streaming TTS endpoint using Gemini 3.8 Flash Lite TTS `generateContentStream`.
 * Streams raw headerless 24kHz mono 16-bit LE PCM chunks as soon as Gemini yields them so the
 * browser can start playback in ~250-450ms instead of waiting for the entire WAV clip, while
 * simultaneously populating the shared WAV cache for 0ms replays.
 */
async function handleJapaneseTtsStream(req: Request, res: Response): Promise<void> {
  const body = req.body as { text?: unknown; voiceStyle?: unknown } | undefined;
  const rawText = typeof body?.text === 'string' ? body.text.trim() : '';

  if (!rawText) {
    res.status(400).json({ error: 'Text is required.' });
    return;
  }
  if (rawText.length > TTS_MAX_TEXT_LENGTH) {
    res.status(400).json({ error: 'Text exceeds maximum length.' });
    return;
  }

  const { voiceName, styleInstruction } = resolveTtsVoiceConfig(body?.voiceStyle);
  const normalizedText = rawText.replace(/\s+/g, ' ').trim();
  const cacheKey = `${voiceName}:${normalizedText}`;

  const cached = ttsAudioCache.get(cacheKey);
  if (cached && cached.length > 44) {
    ttsAudioCache.delete(cacheKey);
    ttsAudioCache.set(cacheKey, cached);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-TTS-Sample-Rate', String(TTS_SAMPLE_RATE));
    res.setHeader('X-TTS-Voice', voiceName);
    res.setHeader('X-TTS-Cache', 'HIT');
    res.status(200).send(cached.subarray(44));
    return;
  }

  const clientIp = getClientIp(req);
  if (!checkTtsRateLimit(clientIp)) {
    res.status(429).json({ error: 'Too many TTS requests. Please wait a moment.' });
    return;
  }

  const ai = getGeminiTtsClient();
  if (!ai) {
    res.status(503).json({ error: 'TTS service is not configured.' });
    return;
  }

  let headersSent = false;
  let aborted = false;
  req.on('close', () => {
    aborted = true;
  });

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: normalizedText,
              speechMetadata: {
                style: styleInstruction,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const pcmChunks: Buffer[] = [];
    for await (const chunk of responseStream) {
      if (aborted) break;
      const b64 = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) continue;
      const pcmBuf = Buffer.from(b64, 'base64');
      if (pcmBuf.length === 0) continue;

      if (!headersSent) {
        headersSent = true;
        res.status(200);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-TTS-Sample-Rate', String(TTS_SAMPLE_RATE));
        res.setHeader('X-TTS-Voice', voiceName);
        res.setHeader('X-TTS-Cache', 'MISS');
        res.flushHeaders?.();
      }
      pcmChunks.push(pcmBuf);
      res.write(pcmBuf);
    }

    if (!headersSent) {
      res.status(502).json({ error: 'No audio stream returned by TTS service.' });
      return;
    }

    if (!aborted && pcmChunks.length > 0) {
      const fullPcm = Buffer.concat(pcmChunks);
      if (fullPcm.length > 0) {
        setTtsCacheEntry(cacheKey, wrapPcm24kMonoToWav(fullPcm));
      }
    }
    res.end();
  } catch (err) {
    console.error(
      '[TTS-Stream] Gemini streaming TTS failed:',
      err instanceof Error ? err.message : 'unknown error',
    );
    if (!headersSent) {
      res.status(503).json({ error: 'TTS streaming temporarily unavailable.' });
    } else {
      res.end();
    }
  }
}

interface TryOutExplanationResult {
  focusTag: string;
  questionMeaning: string;
  whyChosenWrong: string;
  whyCorrectRight: string;
  distractorNotes: string;
  studyTip: string;
}

const EXPLAIN_CACHE_MAX_ENTRIES = 500;
const EXPLAIN_RATE_LIMIT_WINDOW_MS = 60_000;
const EXPLAIN_RATE_LIMIT_MAX_REQUESTS = 45;
const ALLOWED_TRYOUT_PART_IDS = new Set(['moji-bunpou', 'dokkai', 'choukai']);

let geminiExplainClient: GoogleGenAI | null = null;
const explainCache = new Map<string, TryOutExplanationResult>();
const explainRateLimitBuckets = new Map<string, number[]>();

function getGeminiExplainClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!geminiExplainClient) {
    geminiExplainClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return geminiExplainClient;
}

function checkExplainRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - EXPLAIN_RATE_LIMIT_WINDOW_MS;
  const recent = (explainRateLimitBuckets.get(ip) ?? []).filter(
    (t) => t > cutoff,
  );
  if (recent.length >= EXPLAIN_RATE_LIMIT_MAX_REQUESTS) {
    explainRateLimitBuckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  explainRateLimitBuckets.set(ip, recent);

  if (explainRateLimitBuckets.size > 500) {
    for (const [key, timestamps] of explainRateLimitBuckets.entries()) {
      const kept = timestamps.filter((t) => t > cutoff);
      if (kept.length === 0) explainRateLimitBuckets.delete(key);
      else explainRateLimitBuckets.set(key, kept);
    }
  }
  return true;
}

function setExplainCacheEntry(
  cacheKey: string,
  value: TryOutExplanationResult,
): void {
  if (explainCache.has(cacheKey)) {
    explainCache.delete(cacheKey);
  }
  explainCache.set(cacheKey, value);
  if (explainCache.size > EXPLAIN_CACHE_MAX_ENTRIES) {
    const oldestKey = explainCache.keys().next().value;
    if (oldestKey) explainCache.delete(oldestKey);
  }
}

function cleanBoundedText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n/g, '\n').trim().slice(0, maxLen);
}

const TRYOUT_EXPLAIN_SYSTEM_INSTRUCTION = `Kamu adalah pengajar JLPT (Sensei) berbahasa Indonesia yang teliti, hangat, dan to-the-point untuk aplikasi belajar bahasa Jepang UtamaGo!.
Tugasmu adalah menjelaskan soal Try Out JLPT yang dijawab SALAH oleh peserta dalam bahasa Indonesia yang jelas, akurat, dan mudah dipahami.

Aturan wajib:
1. Jelaskan secara spesifik mengapa pilihan peserta (chosen) SALAH dan mengapa kunci jawaban resmi (correct) BENAR berdasarkan konteks soal Jepang yang diberikan.
2. Sesuaikan penjelasan dengan jenis Mondai:
   - Kanji / Cara Baca (問題1–2): sebutkan cara baca hiragana & arti kata target (yang ditandai [[...]]), lalu jelaskan kesalahan bacaan/kanji pada pilihan peserta (mis. salah dakuon/sokuon/vokal panjang/kanji mirip arti berbeda).
   - Pembentukan kata / Konteks / Sinonim / Penggunaan (問題3–6): jelaskan arti kata target, kolokasi, serta perbedaan nuansa antara pilihan peserta dan kunci benar.
   - Tata Bahasa Kalimat (問題7): jelaskan pola bunpou kunci benar, aturan sambungan (接続), dan alasan pola pilihan peserta tidak cocok secara struktur atau makna.
   - Susunan Kalimat Bintang ★ (問題8): WAJIB tuliskan urutan lengkap kalimat yang benar dari 4 potongan pilihan dan tandai posisi ★ secara jelas agar peserta paham kenapa posisi ★ jatuh pada jawaban kunci.
   - Tata Bahasa Wacana & Dokkai (問題9–14): rujuk langsung ide/kalimat bukti pada wacana (passageContext) yang membenarkan kunci dan menyanggah pilihan peserta.
   - Choukai (聴解): rujuk langsung kalimat/alur keputusan pembicara pada transkrip (transcript) dan jelaskan jebakan (distractor) yang membuat pilihan peserta salah (mis. berubah pikiran, bukan yang diminta pertanyaan, atau syarat tidak terpenuhi).
3. Tulis ringkas dan padat: tiap field maksimal 2–4 kalimat yang langsung ke inti, tanpa basa-basi pembuka, tanpa markdown bullet list berantakan, dan tetap sertakan kata Jepang penting + arti Indonesia.
4. Jangan pernah mengarang fakta di luar soal/wacana/transkrip. Jika soal Choukai hanya punya nomor opsi tanpa teks tercetak, rujuk langsung bunyi pilihan 1/2/3/4 di dalam transkrip.
5. Balas HANYA dalam JSON valid sesuai skema yang ditetapkan.`;

const TRYOUT_EXPLAIN_SYSTEM_INSTRUCTION_EN = `You are a thorough, friendly, and concise JLPT teacher (Sensei) for the Japanese learning app UtamaGo!.
Your task is to explain a JLPT Mock Exam question that the learner answered INCORRECTLY in clear, accurate, natural English.

Mandatory rules:
1. Explain specifically why the learner's choice (chosen) is WRONG and why the official answer key (correct) is RIGHT based on the Japanese question context.
2. Match the explanation to the Mondai type:
   - Kanji / Reading (問題1–2): give the hiragana reading & English meaning of the target word (marked [[...]]), then explain the reading/kanji mistake in the learner's choice (e.g., dakuon/sokuon/long vowel error or similar-looking kanji with a different meaning).
   - Word formation / Context / Synonyms / Usage (問題3–6): explain the target word meaning, collocation, and nuance difference between the learner's choice and the official answer.
   - Sentence Grammar (問題7): explain the correct bunpou pattern, connection rules (接続), and why the learner's choice fails grammatically or semantically.
   - Star Sentence Ordering ★ (問題8): MUST write out the complete correct sentence formed by the 4 pieces and clearly mark the ★ position so the learner sees why ★ lands on the official key.
   - Discourse Grammar & Reading / Dokkai (問題9–14): cite the exact supporting sentence/idea from passageContext proving the official key and refuting the learner's choice.
   - Listening / Choukai (聴解): cite the speaker's exact line/decision flow in transcript and explain the distractor trap that made the learner's choice wrong.
3. Keep each field concise (2–4 sentences), direct, no filler greetings, no messy markdown bullets, and keep key Japanese terms with English glosses.
4. Never invent facts outside the question/passage/transcript.
5. Reply ONLY with valid JSON matching the schema.`;

async function handleTryOutExplain(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Data soal tidak valid.' });
    return;
  }

  const lang = body.lang === 'en' ? 'en' : 'id';

  const levelLabel = cleanBoundedText(body.levelLabel, 24) || 'JLPT';
  const examCode = cleanBoundedText(body.examCode, 24);
  const partId = cleanBoundedText(body.partId, 24);
  const mondaiTitle = cleanBoundedText(body.mondaiTitle, 160);
  const mondaiInstruction = cleanBoundedText(body.mondaiInstruction, 500);
  const prompt = cleanBoundedText(body.prompt, 1500);
  const chosen = cleanBoundedText(body.chosen, 8);
  const chosenText = cleanBoundedText(body.chosenText, 400);
  const correct = cleanBoundedText(body.correct, 8);
  const correctText = cleanBoundedText(body.correctText, 400);
  const passageContext = cleanBoundedText(body.passageContext, 5000);
  const transcript = cleanBoundedText(body.transcript, 4500);
  const rawNum = Number(body.questionNumber);
  const questionNumber =
    Number.isFinite(rawNum) && rawNum >= 0 && rawNum <= 250
      ? Math.floor(rawNum)
      : 0;

  if (!ALLOWED_TRYOUT_PART_IDS.has(partId)) {
    res.status(400).json({ error: 'Bagian Try Out tidak valid.' });
    return;
  }
  if (!prompt || !chosen || !correct) {
    res.status(400).json({ error: 'Detail soal, jawabanmu, dan kunci wajib diisi.' });
    return;
  }

  const rawOptions = Array.isArray(body.options) ? body.options : [];
  const options = rawOptions
    .slice(0, 4)
    .map((opt) => cleanBoundedText(opt, 400))
    .filter(Boolean);

  const cacheFingerprint = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        v: 2,
        lang,
        levelLabel,
        partId,
        mondaiTitle,
        prompt,
        options,
        chosen,
        chosenText,
        correct,
        correctText,
        passageContext,
        transcript,
      }),
    )
    .digest('hex');

  const cached = explainCache.get(cacheFingerprint);
  if (cached) {
    explainCache.delete(cacheFingerprint);
    explainCache.set(cacheFingerprint, cached);
    res.setHeader('X-Explain-Cache', 'HIT');
    res.status(200).json({ explanation: cached });
    return;
  }

  const clientIp = getClientIp(req);
  if (!checkExplainRateLimit(clientIp)) {
    res.status(429).json({
      error:
        'Terlalu banyak permintaan pembahasan dalam waktu singkat. Tunggu sebentar lalu coba lagi.',
    });
    return;
  }

  const ai = getGeminiExplainClient();
  if (!ai) {
    res.status(503).json({
      error: 'Layanan pembahasan otomatis belum tersedia di server.',
    });
    return;
  }

  const structuredPayload = {
    level: levelLabel,
    examCode,
    part: partId,
    questionNumber,
    mondai: mondaiTitle,
    instruction: mondaiInstruction || undefined,
    prompt,
    allOptions:
      options.length > 0
        ? options.map((text, idx) => `${idx + 1}. ${text}`)
        : undefined,
    userChosenOption: chosenText ? `${chosen} (${chosenText})` : chosen,
    officialCorrectOption: correctText ? `${correct} (${correctText})` : correct,
    passageContext: passageContext || undefined,
    choukaiTranscript: transcript || undefined,
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents:
        lang === 'en'
          ? `Analyze this JLPT question and explain in clear English why the learner's chosen option is wrong and why the official key is correct.\n\n<question_data>\n${JSON.stringify(structuredPayload, null, 2)}\n</question_data>`
          : `Analisislah soal JLPT berikut dan jelaskan dalam bahasa Indonesia mengapa jawaban peserta salah serta mengapa kunci jawaban resmi benar.\n\n<question_data>\n${JSON.stringify(structuredPayload, null, 2)}\n</question_data>`,
      config: {
        systemInstruction:
          lang === 'en'
            ? TRYOUT_EXPLAIN_SYSTEM_INSTRUCTION_EN
            : TRYOUT_EXPLAIN_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            focusTag: {
              type: Type.STRING,
              description:
                'Label singkat topik/skill yang diuji (3-5 kata), mis. "Bacaan Kanji (On\'yomi)", "Pola Bunpou N2", "Susunan Kalimat ★", "Pemahaman Wacana", atau "Choukai — Poin Utama".',
            },
            questionMeaning: {
              type: Type.STRING,
              description:
                'Terjemahan natural atau ringkasan inti kalimat/pertanyaan soal dalam bahasa Indonesia (1-2 kalimat).',
            },
            whyChosenWrong: {
              type: Type.STRING,
              description:
                'Alasan spesifik mengapa pilihan peserta salah (jelaskan arti/bacaan/sambungan gramatika atau kontradiksi terhadap wacana/transkrip, 2-3 kalimat).',
            },
            whyCorrectRight: {
              type: Type.STRING,
              description:
                'Alasan spesifik mengapa kunci jawaban resmi benar, sertakan bukti kalimat/urutan ★ lengkap bila relevan (2-4 kalimat).',
            },
            distractorNotes: {
              type: Type.STRING,
              description:
                'Catatan singkat arti/kesalahan opsi pengecoh lain yang relevan (1-2 kalimat, atau string kosong jika tidak perlu).',
            },
            studyTip: {
              type: Type.STRING,
              description:
                'Satu tips belajar cepat dan praktis agar tidak terkecoh pada soal JLPT bertipe sama (1-2 kalimat).',
            },
          },
          required: [
            'focusTag',
            'questionMeaning',
            'whyChosenWrong',
            'whyCorrectRight',
            'distractorNotes',
            'studyTip',
          ],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({
        error: 'Server tidak menerima isi pembahasan. Coba muat ulang.',
      });
      return;
    }

    const parsed = JSON.parse(rawText) as Partial<TryOutExplanationResult>;
    const explanation: TryOutExplanationResult = {
      focusTag:
        cleanBoundedText(parsed.focusTag, 80) ||
        (lang === 'en' ? 'JLPT Explanation' : 'Pembahasan JLPT'),
      questionMeaning: cleanBoundedText(parsed.questionMeaning, 600),
      whyChosenWrong: cleanBoundedText(parsed.whyChosenWrong, 1000),
      whyCorrectRight: cleanBoundedText(parsed.whyCorrectRight, 1200),
      distractorNotes: cleanBoundedText(parsed.distractorNotes, 600),
      studyTip: cleanBoundedText(parsed.studyTip, 400),
    };

    if (!explanation.whyChosenWrong || !explanation.whyCorrectRight) {
      res.status(502).json({
        error:
          lang === 'en'
            ? 'Incomplete explanation result. Please try again.'
            : 'Hasil pembahasan tidak lengkap. Silakan coba lagi.',
      });
      return;
    }

    setExplainCacheEntry(cacheFingerprint, explanation);
    res.setHeader('X-Explain-Cache', 'MISS');
    res.status(200).json({ explanation });
  } catch (err) {
    console.error(
      '[TryOutExplain] Gemini explain request failed:',
      err instanceof Error ? err.message : 'unknown error',
    );
    res.status(503).json({
      error:
        lang === 'en'
          ? 'Automatic explanation service is busy or unavailable. Please try again shortly.'
          : 'Pembahasan otomatis sedang sibuk atau belum dapat dijangkau. Coba beberapa saat lagi.',
    });
  }
}

// =========================================================================
// Full-App Indonesian -> English Batch Translation API (with LRU Cache)
// =========================================================================
const TRANSLATE_CACHE_MAX_ENTRIES = 10_000;
const TRANSLATE_RATE_LIMIT_WINDOW_MS = 60_000;
const TRANSLATE_RATE_LIMIT_MAX_REQUESTS = 120;
const TRANSLATE_MAX_ITEMS = 50;
const TRANSLATE_MAX_ITEM_CHARS = 2_000;
const TRANSLATE_MAX_TOTAL_CHARS = 24_000;

const translateEnCache = new Map<string, string>();
const translateRateBuckets = new Map<string, number[]>();

function checkTranslateRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - TRANSLATE_RATE_LIMIT_WINDOW_MS;
  const recent = (translateRateBuckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= TRANSLATE_RATE_LIMIT_MAX_REQUESTS) {
    translateRateBuckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  translateRateBuckets.set(ip, recent);
  if (translateRateBuckets.size > 500) {
    for (const [k, ts] of translateRateBuckets.entries()) {
      const kept = ts.filter((t) => t > cutoff);
      if (kept.length === 0) translateRateBuckets.delete(k);
      else translateRateBuckets.set(k, kept);
    }
  }
  return true;
}

function setTranslateCacheEntry(src: string, en: string): void {
  if (translateEnCache.has(src)) {
    translateEnCache.delete(src);
  }
  translateEnCache.set(src, en);
  if (translateEnCache.size > TRANSLATE_CACHE_MAX_ENTRIES) {
    const oldest = translateEnCache.keys().next().value;
    if (oldest !== undefined) translateEnCache.delete(oldest);
  }
}

const TRANSLATE_BATCH_SYSTEM_INSTRUCTION = `You are a fast, precise Indonesian-to-English translator for the JLPT Japanese learning web app UtamaGo!.
You receive a JSON array of strings from UI labels, Anki vocabulary definitions, example sentence translations, Bunpou grammar notes, FAQ answers, or Challenge Arena prompts.

Strict rules:
1. Return a JSON object {"translations": [...]} with the EXACT SAME number of elements and in the EXACT SAME order as the input array.
2. Translate ALL Indonesian words and sentences into crisp, natural, concise English appropriate for a modern language-learning app.
3. NEVER translate Japanese text (Kanji, Hiragana, Katakana, Furigana, Japanese example sentences). Keep every Japanese character 100% verbatim!
4. Keep JLPT & app terms intact: UtamaGo!, JLPT, N5, N4, N3, N2, N1, Anki, Bunpou, Choukai, Dokkai, Moji, Goi, Mondai, Kanji, Hiragana, Katakana, Romaji, On'yomi, Kun'yomi, SRS, XP.
5. Keep proper names (Ryan, Annisa), @usernames, emails, URLs, numbers, emojis, and formatting intact.
6. If an entry contains BOTH Japanese and Indonesian (e.g. "かばん　Tas (tas jinjing)"), keep the Japanese part verbatim and translate only the Indonesian part ("かばん　Bag (handbag)").
7. If an entry is already clean English or contains no Indonesian words, return it unchanged.`;

async function handleTranslateBatch(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Invalid translation payload.' });
    return;
  }

  const rawTexts = body.texts;
  if (!Array.isArray(rawTexts) || rawTexts.length === 0) {
    res.status(400).json({ error: 'texts must be a non-empty array.' });
    return;
  }
  if (rawTexts.length > TRANSLATE_MAX_ITEMS) {
    res.status(400).json({ error: `Maximum ${TRANSLATE_MAX_ITEMS} items per batch.` });
    return;
  }

  const normalizedTexts: string[] = [];
  let totalChars = 0;
  for (const item of rawTexts) {
    if (typeof item !== 'string') {
      res.status(400).json({ error: 'Every item in texts must be a string.' });
      return;
    }
    const cleaned = item.trim().slice(0, TRANSLATE_MAX_ITEM_CHARS);
    totalChars += cleaned.length;
    if (totalChars > TRANSLATE_MAX_TOTAL_CHARS) {
      res.status(400).json({ error: 'Batch text size limit exceeded.' });
      return;
    }
    normalizedTexts.push(cleaned);
  }

  const results: Array<string | null> = normalizedTexts.map((src) => {
    if (!src) return '';
    const hit = translateEnCache.get(src);
    if (hit !== undefined) {
      translateEnCache.delete(src);
      translateEnCache.set(src, hit);
      return hit;
    }
    return null;
  });

  const missingIndices: number[] = [];
  const missingTexts: string[] = [];
  for (let i = 0; i < normalizedTexts.length; i += 1) {
    if (results[i] === null) {
      missingIndices.push(i);
      missingTexts.push(normalizedTexts[i]);
    }
  }

  if (missingTexts.length === 0) {
    res.setHeader('X-Translate-Cache', 'HIT');
    res.status(200).json({ translations: results });
    return;
  }

  const clientIp = getClientIp(req);
  if (!checkTranslateRateLimit(clientIp)) {
    res.status(429).json({ error: 'Translation rate limit exceeded. Please retry shortly.' });
    return;
  }

  const ai = getGeminiExplainClient();
  if (!ai) {
    res.status(503).json({ error: 'Translation service is not configured on the server.' });
    return;
  }

  const promptContent = `Translate each Indonesian string in this JSON array to English following all rules:\n${JSON.stringify(missingTexts)}`;
  const schemaConfig = {
    systemInstruction: TRANSLATE_BATCH_SYSTEM_INSTRUCTION,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        translations: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['translations'],
    },
  };

  let rawResponseText = '';
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptContent,
      config: {
        ...schemaConfig,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    rawResponseText = (response.text ?? '').trim();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'unknown error';
    const rawStatus =
      typeof err === 'object' && err !== null && 'status' in err
        ? Number((err as { status?: unknown }).status)
        : 0;
    console.error('[TranslateBatch] Gemini translation failed:', rawStatus, errMsg);

    const status =
      rawStatus === 400 || rawStatus === 403 || rawStatus === 404 || rawStatus === 429
        ? rawStatus
        : 503;
    const safeReason =
      status === 403 || errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED')
        ? 'API key permission denied or invalid. Check Settings > Secrets.'
        : status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')
          ? 'Translation quota temporarily exhausted. Please try again shortly.'
          : status === 404 || errMsg.includes('NOT_FOUND')
            ? 'Requested translation model was not found.'
            : 'Translation service temporarily unavailable.';
    res.status(status).json({ error: safeReason });
    return;
  }

  try {
    const parsed = JSON.parse(rawResponseText) as { translations?: unknown };
    const translatedList = Array.isArray(parsed.translations)
      ? parsed.translations
      : null;
    if (!translatedList || translatedList.length !== missingTexts.length) {
      res.status(502).json({ error: 'Incomplete batch translation response.' });
      return;
    }

    for (let j = 0; j < missingIndices.length; j += 1) {
      const idx = missingIndices[j];
      const src = missingTexts[j];
      const candidate = translatedList[j];
      const en =
        typeof candidate === 'string' && candidate.trim().length > 0
          ? candidate.trim().slice(0, TRANSLATE_MAX_ITEM_CHARS + 400)
          : src;
      results[idx] = en;
      setTranslateCacheEntry(src, en);
    }

    res.setHeader('X-Translate-Cache', 'MISS');
    res.status(200).json({ translations: results });
  } catch {
    res.status(502).json({ error: 'Invalid translation response format.' });
  }
}

interface DriveAudioAssetMeta {
  mimeType: string;
  fileName: string;
}

// Allowlisted official JLPT Choukai audio files hosted on Google Drive
const ALLOWED_DRIVE_AUDIO: Record<string, DriveAudioAssetMeta> = {
  // JLPT N2 (2010.07 - 2018.12)
  '1BijZlQrAGGx08Uuo0x49xLTQ63pzWE10': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2010_07_Choukai.mp3',
  },
  '1UEsUFDoJdGY8oX4eQfWqByaRb78Mm2ee': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2010_12_Choukai.mp3',
  },
  '17mCy0CaTGTS8s9mvfSFyJNfSP3doSPDP': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2011_07_Choukai.mp3',
  },
  '1kn8VnS_zvXdmpHWqww1YiU9bOFkdjc92': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2011_12_Choukai.mp3',
  },
  '1Le-Gd5r0g90jBXBVlVyF5m3BXwtQKDvC': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2012_07_Choukai.mp3',
  },
  '1BHvKVgeVPC-BNM_wuXiocYcmhZHFlK40': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2012_12_Choukai.mp3',
  },
  '1ao2afARgAExKJ-J9fMGqKvF3TFkPKw5H': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2013_07_Choukai.mp3',
  },
  '1Kv-yRdC2_4nU3n40gXtj8kLLa-5U6pOz': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2013_12_Choukai.mp3',
  },
  '1lL625WsBGMnjUeCO_B0sYPsx6VggRsZ_': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2014_07_Choukai.mp3',
  },
  '1qmLFyWy8ViferPZGmp0JpYH8NnLesgmR': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2014_12_Choukai.mp3',
  },
  '1yiA_Mq1TNapFgVB-myFrdXSNZWhUJUY_': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2015_07_Choukai.mp3',
  },
  '1bK2Xf2-6fFzO_9zdxWihJndiDbtWrLo2': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2015_12_Choukai.mp3',
  },
  '11iDebYEputE9JC_S7F9Tm_qSH6w14ky7': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2016_07_Choukai.mp3',
  },
  '1M9hANkTMe_HQDG2a0T6ebkHEE5D5dJgg': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2016_12_Choukai.mp3',
  },
  '1YjRhfuuUyx-Ri0zkZfPhoh51G7_Lhi7u': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2017_07_Choukai.mp3',
  },
  '14pIase7lYswPr4juFyJXOUZq6FwsHI-T': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2017_12_Choukai.mp3',
  },
  '1R1KCOqFFSw4nLfTQZAYzUSv7YiH6wIFH': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2018_07_Choukai.mp3',
  },
  '17qRZ8B8RXHo-tDhs9-O3vR3gYEs3Q4fH': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2018_12_Choukai.mp3',
  },
  // JLPT N1 (2010.07 - 2018.12)
  '1C-e2n7BKlxMzYCp1NqfkxAfmOiqiz3z-': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2010_07_Choukai.m4a',
  },
  '1SFmPy5MFYFLDqrhRcgYKSTvTpHbwZQej': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2010_12_Choukai.m4a',
  },
  '12MDcEEtE0DyglEBKRR2gvPR-wG_w_U1k': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2011_07_Choukai.m4a',
  },
  '14PARWoCCw9wZZSlPjaviuceE8QpdQNxz': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2011_12_Choukai.m4a',
  },
  '1IOFbCAWLZnLn7D-PtJNJuzWCISmwkbGT': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2012_07_Choukai.m4a',
  },
  '1rXWQg1jHfSrTffLcidq8mZh-dy40v2QS': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2012_12_Choukai.m4a',
  },
  '1pLHBXNmF_jcwTAbs1BSni-62O0Cts4Xg': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2013_07_Choukai.m4a',
  },
  '1X-P496yHiBixcAcqbXMnIVt9J2LWDqwJ': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2013_12_Choukai.m4a',
  },
  '1oa-KDlxobIVa5XCq-rgLcpPcdkquAWvi': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2014_07_Choukai.m4a',
  },
  '1Kp7cijguVaf-HuyGdZ539mY0OBTEBodI': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2014_12_Choukai.m4a',
  },
  '1jSFlXwkH8t2sTiTCCc2Oe9nKq3UXmwPU': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2015_07_Choukai.m4a',
  },
  '14gz-OC_aYPH6iPVAScoFNM8f-68HzBKB': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2015_12_Choukai.m4a',
  },
  '1TYo9GSUq5ONE98dYzrvaY13ljqGwbQCt': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2016_07_Choukai.m4a',
  },
  '1_W0yIUn0CLx6ppNJIhRLnp9CmwEIa4Tj': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2016_12_Choukai.m4a',
  },
  '1xAVxWamYNm0dLfreSYaYc5ggpWiQkKkI': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2017_07_Choukai.m4a',
  },
  '1UEjGjKW532lioJYH_s4v1O-DUu6pb5q1': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2017_12_Choukai.m4a',
  },
  '1j4qkXniIaurqjB6AiKV_Y89_NcEuiKYV': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2018_07_Choukai.m4a',
  },
  '19jDX4zRZCr1u4MVkM_eNJLrjekdQsKWB': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2018_12_Choukai.m4a',
  },
};

function buildDriveDownloadUrl(fileId: string): string {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
}

// Official JLPT N3, N2, and N1 Choukai audio tracks hosted on Catbox.moe (51 files total:
// 15 N3 MP3 + 18 N2 MP3 + 18 N1 M4A). Hardcoded allowlist prevents SSRF and guarantees all
// files receive monthly access so Catbox's 2-year inactivity expiration never removes any audio.
const CATBOX_CHOUKAI_AUDIO: ReadonlyArray<{
  level: 'N3' | 'N2' | 'N1';
  examCode: string;
  fileName: string;
  url: string;
}> = [
  // JLPT N3 (2010.07 - 2018.07, 15 files)
  { level: 'N3', examCode: '2010.07', fileName: '2010年7月N3.mp3', url: 'https://files.catbox.moe/hpkzbw.mp3' },
  { level: 'N3', examCode: '2011.07', fileName: '2011年7月N3.mp3', url: 'https://files.catbox.moe/d6lbqh.mp3' },
  { level: 'N3', examCode: '2011.12', fileName: '2011年12月N3.mp3', url: 'https://files.catbox.moe/zhstka.mp3' },
  { level: 'N3', examCode: '2012.07', fileName: '2012年7月N3.mp3', url: 'https://files.catbox.moe/2atz7d.mp3' },
  { level: 'N3', examCode: '2012.12', fileName: '2012年12月N3.mp3', url: 'https://files.catbox.moe/74mi06.mp3' },
  { level: 'N3', examCode: '2013.07', fileName: '2013年7月N3.mp3', url: 'https://files.catbox.moe/qwu6ii.mp3' },
  { level: 'N3', examCode: '2013.12', fileName: '2013年12月N3.mp3', url: 'https://files.catbox.moe/1uszlx.mp3' },
  { level: 'N3', examCode: '2014.07', fileName: '2014年7月N3.mp3', url: 'https://files.catbox.moe/olokg6.mp3' },
  { level: 'N3', examCode: '2014.12', fileName: '2014年12月N3.mp3', url: 'https://files.catbox.moe/c8ip5f.mp3' },
  { level: 'N3', examCode: '2015.12', fileName: '2015年12月N3.mp3', url: 'https://files.catbox.moe/hzcpma.mp3' },
  { level: 'N3', examCode: '2016.07', fileName: '2016年7月N3.mp3', url: 'https://files.catbox.moe/y21tzz.mp3' },
  { level: 'N3', examCode: '2016.12', fileName: '2016年12月N3.mp3', url: 'https://files.catbox.moe/79fueb.mp3' },
  { level: 'N3', examCode: '2017.07', fileName: '2017年7月N3.mp3', url: 'https://files.catbox.moe/05sss5.mp3' },
  { level: 'N3', examCode: '2017.12', fileName: '2017年12月N3.mp3', url: 'https://files.catbox.moe/xo65sa.mp3' },
  { level: 'N3', examCode: '2018.07', fileName: '2018年7月N3.mp3', url: 'https://files.catbox.moe/jgc3zf.mp3' },
  // JLPT N2 (2010.07 - 2018.12, 18 files)
  { level: 'N2', examCode: '2010.07', fileName: '2010年7月N2.mp3', url: 'https://files.catbox.moe/9xbz7l.mp3' },
  { level: 'N2', examCode: '2010.12', fileName: '2010年12月N2.mp3', url: 'https://files.catbox.moe/asvevt.mp3' },
  { level: 'N2', examCode: '2011.07', fileName: '2011年7月N2.mp3', url: 'https://files.catbox.moe/jenpw0.mp3' },
  { level: 'N2', examCode: '2011.12', fileName: '2011年12月N2.mp3', url: 'https://files.catbox.moe/3pnhbw.mp3' },
  { level: 'N2', examCode: '2012.07', fileName: '2012年7月N2.mp3', url: 'https://files.catbox.moe/mrwty8.mp3' },
  { level: 'N2', examCode: '2012.12', fileName: '2012年12月N2.mp3', url: 'https://files.catbox.moe/vo21e8.mp3' },
  { level: 'N2', examCode: '2013.07', fileName: '2013年7月N2.mp3', url: 'https://files.catbox.moe/ry6rwd.mp3' },
  { level: 'N2', examCode: '2013.12', fileName: '2013年12月N2.mp3', url: 'https://files.catbox.moe/8pmmgd.mp3' },
  { level: 'N2', examCode: '2014.07', fileName: '2014年7月N2.mp3', url: 'https://files.catbox.moe/xvu6e9.mp3' },
  { level: 'N2', examCode: '2014.12', fileName: '2014年12月N2.mp3', url: 'https://files.catbox.moe/esi007.mp3' },
  { level: 'N2', examCode: '2015.07', fileName: '2015年7月N2.mp3', url: 'https://files.catbox.moe/kmeji2.mp3' },
  { level: 'N2', examCode: '2015.12', fileName: '2015年12月N2.mp3', url: 'https://files.catbox.moe/aq12c6.mp3' },
  { level: 'N2', examCode: '2016.07', fileName: '2016年7月N2.mp3', url: 'https://files.catbox.moe/07shiy.mp3' },
  { level: 'N2', examCode: '2016.12', fileName: '2016年12月N2.mp3', url: 'https://files.catbox.moe/rkpxrk.mp3' },
  { level: 'N2', examCode: '2017.07', fileName: '2017年7月N2.mp3', url: 'https://files.catbox.moe/oh7lfi.mp3' },
  { level: 'N2', examCode: '2017.12', fileName: '2017年12月N2.mp3', url: 'https://files.catbox.moe/odph8a.mp3' },
  { level: 'N2', examCode: '2018.07', fileName: '2018年7月N2.mp3', url: 'https://files.catbox.moe/iw65xx.mp3' },
  { level: 'N2', examCode: '2018.12', fileName: '2018年12月N2.mp3', url: 'https://files.catbox.moe/n1uprt.mp3' },
  // JLPT N1 (2010.07 - 2018.12, 18 files on Catbox)
  { level: 'N1', examCode: '2010.07', fileName: '2010年07月N1.m4a', url: 'https://files.catbox.moe/kssn7r.m4a' },
  { level: 'N1', examCode: '2010.12', fileName: '2010年12月N1.m4a', url: 'https://files.catbox.moe/yha7n7.m4a' },
  { level: 'N1', examCode: '2011.07', fileName: '2011年07月N1.m4a', url: 'https://files.catbox.moe/z0wq68.m4a' },
  { level: 'N1', examCode: '2011.12', fileName: '2011年12月N1.m4a', url: 'https://files.catbox.moe/hqktxl.m4a' },
  { level: 'N1', examCode: '2012.07', fileName: '2012年07月N1.m4a', url: 'https://files.catbox.moe/i5r5im.m4a' },
  { level: 'N1', examCode: '2012.12', fileName: '2012年12月N1.m4a', url: 'https://files.catbox.moe/10cffh.m4a' },
  { level: 'N1', examCode: '2013.07', fileName: '2013年07月N1.m4a', url: 'https://files.catbox.moe/gugw3n.m4a' },
  { level: 'N1', examCode: '2013.12', fileName: '2013年12月N1.m4a', url: 'https://files.catbox.moe/fonv77.m4a' },
  { level: 'N1', examCode: '2014.07', fileName: '2014年07月N1.m4a', url: 'https://files.catbox.moe/qlpjp1.m4a' },
  { level: 'N1', examCode: '2014.12', fileName: '2014年12月N1.m4a', url: 'https://files.catbox.moe/u6j4mv.m4a' },
  { level: 'N1', examCode: '2015.07', fileName: '2015年07月N1.m4a', url: 'https://files.catbox.moe/v9m3tc.m4a' },
  { level: 'N1', examCode: '2015.12', fileName: '2015年12月N1.m4a', url: 'https://files.catbox.moe/8o3176.m4a' },
  { level: 'N1', examCode: '2016.07', fileName: '2016年07月N1.m4a', url: 'https://files.catbox.moe/xdqxf9.m4a' },
  { level: 'N1', examCode: '2016.12', fileName: '2016年12月N1.m4a', url: 'https://files.catbox.moe/eftt4e.m4a' },
  { level: 'N1', examCode: '2017.07', fileName: '2017年07月N1.m4a', url: 'https://files.catbox.moe/1vhrdb.m4a' },
  { level: 'N1', examCode: '2017.12', fileName: '2017年12月N1.m4a', url: 'https://files.catbox.moe/afjymx.m4a' },
  { level: 'N1', examCode: '2018.07', fileName: '2018年07月N1.m4a', url: 'https://files.catbox.moe/9vlon0.m4a' },
  { level: 'N1', examCode: '2018.12', fileName: '2018年12月N1.m4a', url: 'https://files.catbox.moe/n2mwx5.m4a' },
];

// Touch every Catbox audio once every 25 days (< 1 month) via lightweight 64-byte Range GET
// to register genuine download activity and prevent 2-year inactivity deletion.
const CATBOX_KEEPALIVE_INTERVAL_MS = 25 * 24 * 60 * 60 * 1000;
const CATBOX_KEEPALIVE_CHECK_MS = 24 * 60 * 60 * 1000;
const CATBOX_KEEPALIVE_STATE_PATH = path.join(
  os.tmpdir(),
  'utamago-catbox-keepalive.json',
);

interface CatboxKeepAliveState {
  lastRunAt: number;
  nextDueAt: number;
  totalFiles: number;
  touchedCount: number;
  failedCount: number;
}

let activeCatboxKeepAlive: Promise<CatboxKeepAliveState> | null = null;

function readCatboxKeepAliveState(): CatboxKeepAliveState {
  try {
    if (fs.existsSync(CATBOX_KEEPALIVE_STATE_PATH)) {
      const parsed = JSON.parse(
        fs.readFileSync(CATBOX_KEEPALIVE_STATE_PATH, 'utf8'),
      ) as Partial<CatboxKeepAliveState>;
      const lastRunAt =
        typeof parsed.lastRunAt === 'number' && Number.isFinite(parsed.lastRunAt)
          ? parsed.lastRunAt
          : 0;
      return {
        lastRunAt,
        nextDueAt:
          lastRunAt > 0 ? lastRunAt + CATBOX_KEEPALIVE_INTERVAL_MS : 0,
        totalFiles: CATBOX_CHOUKAI_AUDIO.length,
        touchedCount:
          typeof parsed.touchedCount === 'number' ? parsed.touchedCount : 0,
        failedCount:
          typeof parsed.failedCount === 'number' ? parsed.failedCount : 0,
      };
    }
  } catch {
    // Ignore corrupt state file and re-initialize
  }
  return {
    lastRunAt: 0,
    nextDueAt: 0,
    totalFiles: CATBOX_CHOUKAI_AUDIO.length,
    touchedCount: 0,
    failedCount: 0,
  };
}

function writeCatboxKeepAliveState(state: CatboxKeepAliveState): void {
  try {
    fs.writeFileSync(
      CATBOX_KEEPALIVE_STATE_PATH,
      JSON.stringify(state),
      'utf8',
    );
  } catch {
    // Ignore tmpfs write errors
  }
}

async function touchSingleCatboxAudio(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'audio/mpeg,audio/mp4,audio/*;q=0.9,*/*;q=0.8',
        Range: 'bytes=0-63',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok && res.status !== 206) {
      return false;
    }
    // Drain the 64-byte slice so the request completes cleanly on upstream nginx
    await res.arrayBuffer();
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function runCatboxKeepAliveIfDue(force = false): {
  triggered: boolean;
  state: CatboxKeepAliveState;
  promise: Promise<CatboxKeepAliveState>;
} {
  const current = readCatboxKeepAliveState();
  const now = Date.now();
  const isDue =
    current.lastRunAt === 0 ||
    now - current.lastRunAt >= CATBOX_KEEPALIVE_INTERVAL_MS;
  const allowForce = force && now - current.lastRunAt >= 60 * 1000;

  if (activeCatboxKeepAlive) {
    return { triggered: false, state: current, promise: activeCatboxKeepAlive };
  }

  if (!isDue && !allowForce) {
    return {
      triggered: false,
      state: current,
      promise: Promise.resolve(current),
    };
  }

  const job = (async (): Promise<CatboxKeepAliveState> => {
    let touchedCount = 0;
    let failedCount = 0;
    for (const item of CATBOX_CHOUKAI_AUDIO) {
      const ok = await touchSingleCatboxAudio(item.url);
      if (ok) touchedCount += 1;
      else failedCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    const completedAt = Date.now();
    const nextState: CatboxKeepAliveState = {
      lastRunAt: completedAt,
      nextDueAt: completedAt + CATBOX_KEEPALIVE_INTERVAL_MS,
      totalFiles: CATBOX_CHOUKAI_AUDIO.length,
      touchedCount,
      failedCount,
    };
    writeCatboxKeepAliveState(nextState);
    return nextState;
  })().finally(() => {
    activeCatboxKeepAlive = null;
  });

  activeCatboxKeepAlive = job;
  return { triggered: true, state: current, promise: job };
}

// Local disk cache for Google Drive fallback Choukai audio files (N1)
const AUDIO_CACHE_DIR = path.join(os.tmpdir(), 'utamago-audio-cache');
const AUDIO_CACHE_MAX_BYTES = 180 * 1024 * 1024; // Keep cache <= 180 MB (safe for Cloud Run tmpfs)
// Cap every HTTP 206 chunk to 1 MB so 40-48 MB Choukai MP3s stay far below Cloud Run's 32 MB cap
// and respond rapidly over mobile & reverse-proxy connections.
const MAX_RANGE_CHUNK_BYTES = 1024 * 1024;
const STATIC_AUDIO_LAST_MODIFIED = 'Mon, 01 Jan 2024 00:00:00 GMT';

interface ActiveAudioDownload {
  fileId: string;
  tmpPath: string;
  finalPath: string;
  totalBytes: number | null;
  downloadedBytes: number;
  promise: Promise<void>;
}

const activeAudioDownloads = new Map<string, ActiveAudioDownload>();
const audioCacheLastAccess = new Map<string, number>();
const resolvedDriveUrlCache = new Map<
  string,
  { url: string; expiresAt: number }
>();

function ensureAudioCacheDir() {
  try {
    fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
  } catch {
    // Ignore directory creation race
  }
}

function getAudioCachePath(fileId: string): string {
  const safeId = fileId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(AUDIO_CACHE_DIR, `${safeId}.audio`);
}

function recordAudioCacheAccess(filePath: string) {
  audioCacheLastAccess.set(filePath, Date.now());
}

function pruneAudioCacheIfNeeded(keepFilePath?: string) {
  try {
    ensureAudioCacheDir();
    const entries = fs
      .readdirSync(AUDIO_CACHE_DIR)
      .filter((name) => name.endsWith('.audio'))
      .map((name) => {
        const fullPath = path.join(AUDIO_CACHE_DIR, name);
        const stat = fs.statSync(fullPath);
        const lastUsed = audioCacheLastAccess.get(fullPath) ?? stat.mtimeMs;
        return { fullPath, size: stat.size, lastUsed };
      })
      .sort((a, b) => a.lastUsed - b.lastUsed);

    let totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    for (const entry of entries) {
      if (totalSize <= AUDIO_CACHE_MAX_BYTES) break;
      if (keepFilePath && entry.fullPath === keepFilePath) continue;
      try {
        fs.unlinkSync(entry.fullPath);
        audioCacheLastAccess.delete(entry.fullPath);
        totalSize -= entry.size;
      } catch {
        // Ignore eviction errors
      }
    }
  } catch {
    // Ignore cache pruning errors
  }
}

function ensureDriveAudioCached(
  fileId: string,
  meta: DriveAudioAssetMeta,
): ActiveAudioDownload | null {
  ensureAudioCacheDir();
  const finalPath = getAudioCachePath(fileId);
  if (fs.existsSync(finalPath)) {
    recordAudioCacheAccess(finalPath);
    return null;
  }

  const existing = activeAudioDownloads.get(fileId);
  if (existing) return existing;

  const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.tmp`;
  const task: ActiveAudioDownload = {
    fileId,
    tmpPath,
    finalPath,
    totalBytes: null,
    downloadedBytes: 0,
    promise: Promise.resolve(),
  };

  task.promise = (async () => {
    try {
      const upstream = await fetch(buildDriveDownloadUrl(fileId), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: `${meta.mimeType},audio/*,*/*;q=0.9`,
        },
        redirect: 'follow',
      });

      if (!upstream.ok || !upstream.body) {
        throw new Error(`Upstream status ${upstream.status}`);
      }
      const upstreamType = upstream.headers.get('content-type') ?? '';
      if (upstreamType.includes('text/html')) {
        throw new Error('Upstream returned HTML instead of audio');
      }

      if (upstream.url && upstream.url.startsWith('https://')) {
        resolvedDriveUrlCache.set(fileId, {
          url: upstream.url,
          expiresAt: Date.now() + 15 * 60 * 1000,
        });
      }

      const lenHeader = upstream.headers.get('content-length');
      const parsedLen = lenHeader ? Number.parseInt(lenHeader, 10) : Number.NaN;
      if (Number.isFinite(parsedLen) && parsedLen > 0) {
        task.totalBytes = parsedLen;
      }

      const writer = fs.createWriteStream(tmpPath);
      const reader = (
        upstream.body as unknown as WebReadableStream<Uint8Array>
      ).getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && value.byteLength > 0) {
            if (!writer.write(value)) {
              await new Promise<void>((resolve) => writer.once('drain', resolve));
            }
            task.downloadedBytes += value.byteLength;
          }
        }
      } finally {
        reader.releaseLock();
      }

      await new Promise<void>((resolve, reject) => {
        writer.end(() => resolve());
        writer.on('error', reject);
      });

      if (task.totalBytes !== null && task.downloadedBytes < task.totalBytes) {
        throw new Error('Incomplete audio download');
      }

      fs.renameSync(tmpPath, finalPath);
      pruneAudioCacheIfNeeded(finalPath);
    } catch {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
        // Ignore cleanup errors
      }
    } finally {
      activeAudioDownloads.delete(fileId);
    }
  })();

  activeAudioDownloads.set(fileId, task);
  return task;
}

// Synthesize an uncompressed 8-bit 8kHz mono RIFF WAV buffer on the fly per byte range
// so N2 packets without external Drive MP3s play smoothly with exact HTTP 206 seeking.
const WAV_SAMPLE_RATE = 8000;
const WAV_HEADER_BYTES = 44;

function parsePacketSeed(packetId: string): number {
  let hash = 0;
  for (let i = 0; i < packetId.length; i += 1) {
    hash = (hash * 31 + packetId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function parseSingleRange(
  rangeHeader: string | undefined,
  totalBytes: number,
): { start: number; end: number; isPartial: boolean } | null {
  if (!rangeHeader) {
    return { start: 0, end: totalBytes - 1, isPartial: false };
  }
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  let start = 0;
  let end = totalBytes - 1;

  if (rawStart === '' && rawEnd !== '') {
    const suffix = Number.parseInt(rawEnd, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, totalBytes - suffix);
  } else {
    start = Number.parseInt(rawStart, 10);
    if (!Number.isFinite(start) || start < 0 || start >= totalBytes) {
      return null;
    }
    if (rawEnd !== '') {
      const parsedEnd = Number.parseInt(rawEnd, 10);
      if (!Number.isFinite(parsedEnd) || parsedEnd < start) return null;
      end = Math.min(totalBytes - 1, parsedEnd);
    }
  }

  return { start, end, isPartial: true };
}

function createChoukaiWavHeader(dataLength: number): Buffer {
  const header = Buffer.alloc(WAV_HEADER_BYTES);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM format chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // Mono
  header.writeUInt32LE(WAV_SAMPLE_RATE, 24);
  header.writeUInt32LE(WAV_SAMPLE_RATE, 28); // Byte rate (8kHz * 1 channel * 1 byte)
  header.writeUInt16LE(1, 32); // Block align
  header.writeUInt16LE(8, 34); // Bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

const PENTATONIC_FREQS = [523.25, 587.33, 659.25, 783.99, 880.0];

function renderChoukaiWavSlice(
  packetId: string,
  startByte: number,
  endByte: number,
  durationSeconds: number,
): Buffer {
  const totalPcmBytes = durationSeconds * WAV_SAMPLE_RATE;
  const header = createChoukaiWavHeader(totalPcmBytes);
  const length = endByte - startByte + 1;
  const out = Buffer.allocUnsafe(length);
  const seed = parsePacketSeed(packetId);
  const cueIntervalSamples = 15 * WAV_SAMPLE_RATE;

  for (let offset = 0; offset < length; offset += 1) {
    const absByte = startByte + offset;
    if (absByte < WAV_HEADER_BYTES) {
      out[offset] = header[absByte];
      continue;
    }

    const sampleIdx = absByte - WAV_HEADER_BYTES;
    const blockIdx = Math.floor(sampleIdx / cueIntervalSamples);
    const sampleInBlock = sampleIdx % cueIntervalSamples;

    let amplitude = 0;
    // Gentle JLPT chime cue at the start of every 15-second question slot
    if (sampleInBlock < Math.floor(1.4 * WAV_SAMPLE_RATE)) {
      const t = sampleInBlock / WAV_SAMPLE_RATE;
      const noteIdx = (blockIdx + seed) % PENTATONIC_FREQS.length;
      const freq = sampleInBlock < 0.55 * WAV_SAMPLE_RATE
        ? PENTATONIC_FREQS[noteIdx]
        : PENTATONIC_FREQS[(noteIdx + 2) % PENTATONIC_FREQS.length];
      const localT =
        sampleInBlock < 0.55 * WAV_SAMPLE_RATE ? t : t - 0.55;
      const env =
        Math.min(1, localT / 0.03) * Math.exp(-localT * 4.2);
      amplitude =
        0.26 * env * Math.sin(2 * Math.PI * freq * localT) +
        0.07 * env * Math.sin(2 * Math.PI * freq * 2 * localT);
    }

    const pcmByte = Math.max(0, Math.min(255, Math.round(128 + amplitude * 96)));
    out[offset] = pcmByte;
  }

  return out;
}

function buildCappedUpstreamRangeHeader(
  rawRangeHeader: string | undefined,
): string {
  if (!rawRangeHeader || !rawRangeHeader.trim()) {
    return `bytes=0-${MAX_RANGE_CHUNK_BYTES - 1}`;
  }
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rawRangeHeader.trim());
  if (!match) {
    return `bytes=0-${MAX_RANGE_CHUNK_BYTES - 1}`;
  }
  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd !== '') {
    const suffix = Math.min(
      MAX_RANGE_CHUNK_BYTES,
      Math.max(1, Number.parseInt(rawEnd, 10) || MAX_RANGE_CHUNK_BYTES),
    );
    return `bytes=-${suffix}`;
  }
  const start = Math.max(0, Number.parseInt(rawStart, 10) || 0);
  const maxEnd = start + MAX_RANGE_CHUNK_BYTES - 1;
  if (rawEnd === '') {
    return `bytes=${start}-${maxEnd}`;
  }
  const requestedEnd = Number.parseInt(rawEnd, 10);
  const end =
    Number.isFinite(requestedEnd) && requestedEnd >= start
      ? Math.min(requestedEnd, maxEnd)
      : maxEnd;
  return `bytes=${start}-${end}`;
}

function sendLocalFileWithRanges(
  req: Request,
  res: Response,
  filePath: string,
  mimeType: string,
  fileName?: string,
  cacheControl = 'private, no-cache, no-transform',
  etag?: string,
) {
  const stat = fs.statSync(filePath);
  const total = stat.size;
  const parsed = parseSingleRange(req.headers.range, total);

  if (!parsed) {
    res.status(416).set('Content-Range', `bytes */${total}`).end();
    return;
  }

  // Per RFC 9110: ONLY return 206 when the client sent a Range header.
  // Cap open-ended Range chunks to 1 MB so 40-48 MB MP3s never exceed Cloud Run's 32 MB response limit.
  const start = parsed.start;
  const end =
    req.method !== 'HEAD' && parsed.isPartial
      ? Math.min(parsed.end, start + MAX_RANGE_CHUNK_BYTES - 1)
      : parsed.end;
  const isPartial = parsed.isPartial;
  const strongEtag = etag ?? `"utamago-${total}"`;

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Vary', 'Range');
  res.setHeader('ETag', strongEtag);
  res.setHeader('Last-Modified', STATIC_AUDIO_LAST_MODIFIED);
  res.setHeader(
    'Content-Disposition',
    fileName ? `inline; filename="${fileName}"` : 'inline',
  );
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', cacheControl);

  if (isPartial) {
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', String(end - start + 1));
  } else {
    res.status(200);
    res.setHeader('Content-Length', String(total));
  }

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = fs.createReadStream(filePath, { start, end });
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).end();
    } else if (!res.writableEnded) {
      res.end();
    }
  });
  stream.pipe(res);
}

async function handleDriveAudioProxy(req: Request, res: Response) {
  const rawId = req.params.fileId ?? '';
  const fileId = rawId.trim();
  const meta = ALLOWED_DRIVE_AUDIO[fileId];

  if (!meta) {
    res.status(404).json({ error: 'Audio track not found in catalog.' });
    return;
  }

  // 1. Fast path: serve directly from local disk cache (<5ms latency, immutable ETag & Last-Modified)
  const cachedPath = getAudioCachePath(fileId);
  if (fs.existsSync(cachedPath)) {
    recordAudioCacheAccess(cachedPath);
    const stat = fs.statSync(cachedPath);
    sendLocalFileWithRanges(
      req,
      res,
      cachedPath,
      meta.mimeType,
      meta.fileName,
      'private, no-cache, no-transform',
      `"utamago-${fileId}-${stat.size}"`,
    );
    return;
  }

  // 2. Kick off deduplicated background caching to disk immediately
  const downloadTask = ensureDriveAudioCached(fileId, meta);

  // 3. Partial-cache fast path: check ACTUAL flushed disk size (never buffered count!)
  // so we never hit EOF early or mismatch Content-Length.
  if (downloadTask && downloadTask.totalBytes !== null) {
    const total = downloadTask.totalBytes;
    const stableEtag = `"utamago-${fileId}-${total}"`;
    if (req.method === 'HEAD') {
      res.status(200);
      res.setHeader('Content-Type', meta.mimeType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Vary', 'Range');
      res.setHeader('ETag', stableEtag);
      res.setHeader('Last-Modified', STATIC_AUDIO_LAST_MODIFIED);
      res.setHeader('Content-Length', String(total));
      res.setHeader('Content-Disposition', `inline; filename="${meta.fileName}"`);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'private, no-cache, no-transform');
      res.end();
      return;
    }

    let diskSize = 0;
    let sourcePath: string | null = null;
    try {
      if (fs.existsSync(cachedPath)) {
        // Download just finished & renamed atomically!
        sendLocalFileWithRanges(
          req,
          res,
          cachedPath,
          meta.mimeType,
          meta.fileName,
          'private, no-cache, no-transform',
          stableEtag,
        );
        return;
      }
      if (fs.existsSync(downloadTask.tmpPath)) {
        diskSize = fs.statSync(downloadTask.tmpPath).size;
        sourcePath = downloadTask.tmpPath;
      }
    } catch {
      diskSize = 0;
      sourcePath = null;
    }

    const parsed = parseSingleRange(req.headers.range, total);
    const safeFlushedEnd = diskSize - 65536 - 1;
    if (
      sourcePath &&
      parsed &&
      parsed.isPartial &&
      safeFlushedEnd - parsed.start >= 131072
    ) {
      const serveEnd = Math.min(
        parsed.end,
        safeFlushedEnd,
        parsed.start + MAX_RANGE_CHUNK_BYTES - 1,
      );
      try {
        const fd = fs.openSync(sourcePath, 'r');
        const chunkLen = serveEnd - parsed.start + 1;
        res.status(206);
        res.setHeader('Content-Type', meta.mimeType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Vary', 'Range');
        res.setHeader('ETag', stableEtag);
        res.setHeader('Last-Modified', STATIC_AUDIO_LAST_MODIFIED);
        res.setHeader(
          'Content-Range',
          `bytes ${parsed.start}-${serveEnd}/${total}`,
        );
        res.setHeader('Content-Length', String(chunkLen));
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${meta.fileName}"`,
        );
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cache-Control', 'private, no-cache, no-transform');

        const stream = fs.createReadStream('', {
          fd,
          start: parsed.start,
          end: serveEnd,
          autoClose: true,
        });
        stream.on('error', () => {
          if (!res.writableEnded) res.end();
        });
        stream.pipe(res);
        return;
      } catch {
        // Fall through cleanly if tmpPath was renamed concurrently
        if (fs.existsSync(cachedPath)) {
          sendLocalFileWithRanges(
            req,
            res,
            cachedPath,
            meta.mimeType,
            meta.fileName,
            'private, no-cache, no-transform',
            stableEtag,
          );
          return;
        }
      }
    }
  }

  // 4. Cold-miss streaming pass-through (always capped at 2 MB per request for Cloud Run!)
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });

  try {
    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'audio/*,*/*;q=0.9',
      Range:
        req.method === 'HEAD'
          ? 'bytes=0-0'
          : buildCappedUpstreamRangeHeader(
              typeof req.headers.range === 'string'
                ? req.headers.range
                : undefined,
            ),
    };

    const cachedDirect = resolvedDriveUrlCache.get(fileId);
    const targetUrl =
      cachedDirect && cachedDirect.expiresAt > Date.now()
        ? cachedDirect.url
        : buildDriveDownloadUrl(fileId);

    let upstream = await fetch(targetUrl, {
      headers: upstreamHeaders,
      redirect: 'follow',
      signal: controller.signal,
    });

    if (
      !upstream.ok &&
      upstream.status !== 206 &&
      targetUrl !== buildDriveDownloadUrl(fileId)
    ) {
      resolvedDriveUrlCache.delete(fileId);
      upstream = await fetch(buildDriveDownloadUrl(fileId), {
        headers: upstreamHeaders,
        redirect: 'follow',
        signal: controller.signal,
      });
    }

    if (!upstream.ok && upstream.status !== 206) {
      res.status(502).json({
        error: `Upstream Google Drive returned status ${upstream.status}`,
      });
      return;
    }

    const upstreamType = upstream.headers.get('content-type') ?? '';
    if (upstreamType.includes('text/html')) {
      res.status(502).json({
        error: 'Upstream Google Drive returned HTML instead of audio binary.',
      });
      return;
    }

    if (upstream.url && upstream.url.startsWith('https://')) {
      resolvedDriveUrlCache.set(fileId, {
        url: upstream.url,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
    }

    const contentRange = upstream.headers.get('content-range');
    const totalMatch = contentRange?.match(/\/(\d+)$/);
    const totalLen =
      totalMatch?.[1] ?? upstream.headers.get('content-length') ?? '';
    const stableEtag = totalLen ? `"utamago-${fileId}-${totalLen}"` : undefined;

    if (req.method === 'HEAD') {
      res.status(200);
      res.setHeader('Content-Type', meta.mimeType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Vary', 'Range');
      if (stableEtag) {
        res.setHeader('ETag', stableEtag);
      }
      res.setHeader('Last-Modified', STATIC_AUDIO_LAST_MODIFIED);
      if (totalLen) {
        res.setHeader('Content-Length', totalLen);
      }
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${meta.fileName}"`,
      );
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'private, no-cache, no-transform');
      try {
        await upstream.body?.cancel();
      } catch {
        // Ignore cancel errors
      }
      res.end();
      return;
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', meta.mimeType);
    res.setHeader(
      'Accept-Ranges',
      upstream.headers.get('accept-ranges') ?? 'bytes',
    );
    res.setHeader('Vary', 'Range');
    if (stableEtag) {
      res.setHeader('ETag', stableEtag);
    }
    res.setHeader('Last-Modified', STATIC_AUDIO_LAST_MODIFIED);
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${meta.fileName}"`,
    );
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'private, no-cache, no-transform');

    if (!upstream.body) {
      res.end();
      return;
    }

    const nodeStream = Readable.fromWeb(
      upstream.body as unknown as WebReadableStream<Uint8Array>,
    );
    nodeStream.on('error', () => {
      if (!res.writableEnded) {
        res.end();
      }
    });
    nodeStream.pipe(res);
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      return;
    }
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Gagal menghubungi server streaming audio.',
      });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
}

const MPEG1_L3_BITRATES = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
];
const MPEG2_L3_BITRATES = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0,
];
const MPEG1_SAMPLE_RATES = [44100, 48000, 32000, 0];
const MPEG2_SAMPLE_RATES = [22050, 24000, 16000, 0];
const MPEG25_SAMPLE_RATES = [11025, 12000, 8000, 0];

function parseMp3FrameLength(buf: Buffer, offset: number): number | null {
  if (offset + 4 > buf.length) return null;
  if (buf[offset] !== 0xff || (buf[offset + 1] & 0xe0) !== 0xe0) return null;
  const versionBits = (buf[offset + 1] >> 3) & 0x03;
  const layerBits = (buf[offset + 1] >> 1) & 0x03;
  if (versionBits === 0x01 || layerBits !== 0x01) return null; // Layer III only
  const bitrateIdx = (buf[offset + 2] >> 4) & 0x0f;
  const sampleIdx = (buf[offset + 2] >> 2) & 0x03;
  const padding = (buf[offset + 2] >> 1) & 0x01;
  if (bitrateIdx === 0 || bitrateIdx === 15 || sampleIdx === 3) return null;

  const isMpeg1 = versionBits === 0x03;
  const bitrateKbps = isMpeg1
    ? MPEG1_L3_BITRATES[bitrateIdx]
    : MPEG2_L3_BITRATES[bitrateIdx];
  const sampleRate = isMpeg1
    ? MPEG1_SAMPLE_RATES[sampleIdx]
    : versionBits === 0x02
      ? MPEG2_SAMPLE_RATES[sampleIdx]
      : MPEG25_SAMPLE_RATES[sampleIdx];
  if (!bitrateKbps || !sampleRate) return null;

  const coeff = isMpeg1 ? 144 : 72;
  const frameLen = Math.floor((coeff * bitrateKbps * 1000) / sampleRate) + padding;
  return frameLen >= 24 && frameLen <= 4096 ? frameLen : null;
}

function alignMp3BufferToFrames(
  buf: Buffer,
  chunkStart: number,
  isAtEof: boolean,
): { slice: Buffer; sliceStartOffset: number; nextByteOffset: number } {
  if (buf.length < 32) {
    return { slice: buf, sliceStartOffset: 0, nextByteOffset: chunkStart + buf.length };
  }

  let firstFrame = 0;
  if (chunkStart > 0) {
    let found = -1;
    const scanLimit = Math.min(buf.length - 4, 8192);
    for (let i = 0; i <= scanLimit; i += 1) {
      const len = parseMp3FrameLength(buf, i);
      if (len && i + len + 4 <= buf.length && parseMp3FrameLength(buf, i + len)) {
        found = i;
        break;
      }
    }
    if (found >= 0) {
      firstFrame = found;
    }
  }

  if (isAtEof) {
    const out = buf.subarray(firstFrame);
    return {
      slice: out,
      sliceStartOffset: firstFrame,
      nextByteOffset: chunkStart + buf.length,
    };
  }

  // Walk backwards from near the end of the buffer to find the last valid frame boundary
  // so we never split an MP3 frame across MediaSource appendBuffer boundaries.
  let cutEnd = buf.length;
  const minCut = Math.max(firstFrame + 2048, buf.length - 8192);
  for (let i = buf.length - 4; i >= minCut; i -= 1) {
    const len = parseMp3FrameLength(buf, i);
    if (len && i + len <= buf.length) {
      cutEnd = i + len;
      break;
    }
  }

  const out = buf.subarray(firstFrame, cutEnd);
  return {
    slice: out,
    sliceStartOffset: firstFrame,
    nextByteOffset: chunkStart + cutEnd,
  };
}

async function readDriveAudioBytes(
  fileId: string,
  meta: DriveAudioAssetMeta,
  start: number,
  length: number,
  signal: AbortSignal,
): Promise<{
  eof: boolean;
  totalBytes: number;
  start: number;
  buffer: Buffer;
}> {
  const readFromPath = (
    filePath: string,
    total: number,
  ): { eof: boolean; totalBytes: number; start: number; buffer: Buffer } | null => {
    if (start >= total) {
      return { eof: true, totalBytes: total, start, buffer: Buffer.alloc(0) };
    }
    const readLen = Math.min(length, total - start);
    let fd: number | null = null;
    try {
      fd = fs.openSync(filePath, 'r');
      const out = Buffer.allocUnsafe(readLen);
      let filled = 0;
      while (filled < readLen) {
        const n = fs.readSync(fd, out, filled, readLen - filled, start + filled);
        if (n <= 0) break;
        filled += n;
      }
      return {
        eof: false,
        totalBytes: total,
        start,
        buffer: filled === readLen ? out : out.subarray(0, filled),
      };
    } catch {
      return null;
    } finally {
      if (fd !== null) {
        try {
          fs.closeSync(fd);
        } catch {
          // Ignore close errors
        }
      }
    }
  };

  // 1. Local disk cache (<2ms)
  const cachedPath = getAudioCachePath(fileId);
  if (fs.existsSync(cachedPath)) {
    try {
      recordAudioCacheAccess(cachedPath);
      const total = fs.statSync(cachedPath).size;
      const local = readFromPath(cachedPath, total);
      if (local) return local;
    } catch {
      // Fall through
    }
  }

  // 2. Warm background cache + check safely flushed partial .tmp
  const downloadTask = ensureDriveAudioCached(fileId, meta);
  if (downloadTask && downloadTask.totalBytes !== null) {
    const total = downloadTask.totalBytes;
    if (start >= total) {
      return { eof: true, totalBytes: total, start, buffer: Buffer.alloc(0) };
    }
    try {
      if (fs.existsSync(cachedPath)) {
        const local = readFromPath(cachedPath, total);
        if (local) return local;
      }
      if (fs.existsSync(downloadTask.tmpPath)) {
        const diskSize = fs.statSync(downloadTask.tmpPath).size;
        const safeFlushedEnd = diskSize - 65536 - 1;
        const targetEnd = Math.min(total - 1, start + length - 1);
        if (safeFlushedEnd >= targetEnd) {
          const local = readFromPath(downloadTask.tmpPath, total);
          if (local) return local;
        }
      }
    } catch {
      // Fall through to upstream
    }
  }

  // 3. Cold-miss single bounded range fetch from Google Drive
  const end = start + length - 1;
  const cachedDirect = resolvedDriveUrlCache.get(fileId);
  const targetUrl =
    cachedDirect && cachedDirect.expiresAt > Date.now()
      ? cachedDirect.url
      : buildDriveDownloadUrl(fileId);
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'audio/*,*/*;q=0.9',
    Range: `bytes=${start}-${end}`,
  };

  let upstream = await fetch(targetUrl, {
    headers,
    redirect: 'follow',
    signal,
  });
  if (
    !upstream.ok &&
    upstream.status !== 206 &&
    upstream.status !== 416 &&
    targetUrl !== buildDriveDownloadUrl(fileId)
  ) {
    resolvedDriveUrlCache.delete(fileId);
    upstream = await fetch(buildDriveDownloadUrl(fileId), {
      headers,
      redirect: 'follow',
      signal,
    });
  }

  if (upstream.status === 416) {
    const cr = upstream.headers.get('content-range') ?? '';
    const totalMatch = cr.match(/\/(\d+)$/);
    return {
      eof: true,
      totalBytes: totalMatch ? Number.parseInt(totalMatch[1], 10) : start,
      start,
      buffer: Buffer.alloc(0),
    };
  }

  if (!upstream.ok && upstream.status !== 206) {
    throw new Error(`Upstream status ${upstream.status}`);
  }
  const upstreamType = upstream.headers.get('content-type') ?? '';
  if (upstreamType.includes('text/html') || !upstream.body) {
    throw new Error('Upstream returned HTML instead of audio binary.');
  }

  if (upstream.url && upstream.url.startsWith('https://')) {
    resolvedDriveUrlCache.set(fileId, {
      url: upstream.url,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
  }

  const cr = upstream.headers.get('content-range') ?? '';
  const rangeMatch = /^bytes\s+(\d+)-(\d+)\/(\d+)$/i.exec(cr);
  const arrBuf = await upstream.arrayBuffer();
  const buf = Buffer.from(arrBuf);
  const totalBytes = rangeMatch
    ? Number.parseInt(rangeMatch[3], 10)
    : start + buf.length;
  return { eof: buf.length === 0, totalBytes, start, buffer: buf };
}

// Plain HTTP 200 JSON+base64 chunk endpoint: passes through any reverse proxy / WAF
// identically to /api/audio/prefetch and aligns MP3 chunks cleanly to frame boundaries.
async function handleDriveAudioJsonChunk(req: Request, res: Response) {
  const fileId = (req.params.fileId ?? '').trim();
  const meta = ALLOWED_DRIVE_AUDIO[fileId];
  if (!meta) {
    res.status(404).json({ error: 'Audio track not found in catalog.' });
    return;
  }

  const rawStart = Number.parseInt(String(req.query.start ?? '0'), 10);
  const rawLength = Number.parseInt(String(req.query.length ?? '262144'), 10);
  const alignMp3 =
    String(req.query.align ?? '0') === '1' && meta.mimeType === 'audio/mpeg';
  const start = Number.isFinite(rawStart) && rawStart >= 0 ? rawStart : 0;
  const length = Math.max(
    16384,
    Math.min(
      524288,
      Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 262144,
    ),
  );

  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const result = await readDriveAudioBytes(
      fileId,
      meta,
      start,
      length,
      controller.signal,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    if (result.eof || result.buffer.length === 0) {
      res.status(200).json({
        eof: true,
        totalBytes: result.totalBytes,
        start: result.start,
        nextStart: result.totalBytes,
        mimeType: meta.mimeType,
        data: '',
      });
      return;
    }

    const isAtEof = result.start + result.buffer.length >= result.totalBytes;
    const aligned = alignMp3
      ? alignMp3BufferToFrames(result.buffer, result.start, isAtEof)
      : {
          slice: result.buffer,
          sliceStartOffset: 0,
          nextByteOffset: result.start + result.buffer.length,
        };

    res.status(200).json({
      eof: false,
      totalBytes: result.totalBytes,
      start: result.start + aligned.sliceStartOffset,
      nextStart: aligned.nextByteOffset,
      byteLength: aligned.slice.length,
      mimeType: meta.mimeType,
      data: aligned.slice.toString('base64'),
    });
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return;
    if (!res.headersSent) {
      res.status(502).json({ error: 'Gagal mengambil potongan audio.' });
    }
  }
}

// Plain HTTP 200 OK binary chunk endpoint for MediaSource Extensions (MSE) streaming.
// Bypasses browser/proxy HTTP 206 Range quirks on Android Chrome & Cloud Run completely.
async function handleDriveAudioChunk(req: Request, res: Response) {
  const fileId = (req.params.fileId ?? '').trim();
  const meta = ALLOWED_DRIVE_AUDIO[fileId];
  if (!meta) {
    res.status(404).json({ error: 'Audio track not found in catalog.' });
    return;
  }

  const rawStart = Number.parseInt(String(req.query.start ?? '0'), 10);
  const rawLength = Number.parseInt(String(req.query.length ?? '524288'), 10);
  const start = Number.isFinite(rawStart) && rawStart >= 0 ? rawStart : 0;
  const length = Math.max(
    16384,
    Math.min(
      MAX_RANGE_CHUNK_BYTES,
      Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 524288,
    ),
  );

  const sendSliceFromPath = (filePath: string, total: number): boolean => {
    if (start >= total) {
      res.status(204);
      res.setHeader('X-Audio-Total-Bytes', String(total));
      res.setHeader('X-Audio-Mime-Type', meta.mimeType);
      res.setHeader('Cache-Control', 'private, no-store, no-transform');
      res.end();
      return true;
    }
    const end = Math.min(total - 1, start + length - 1);
    const chunkLen = end - start + 1;
    try {
      const fd = fs.openSync(filePath, 'r');
      res.status(200);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', String(chunkLen));
      res.setHeader('X-Audio-Total-Bytes', String(total));
      res.setHeader('X-Audio-Chunk-Start', String(start));
      res.setHeader('X-Audio-Chunk-End', String(end));
      res.setHeader('X-Audio-Mime-Type', meta.mimeType);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'private, no-store, no-transform');
      const stream = fs.createReadStream('', {
        fd,
        start,
        end,
        autoClose: true,
      });
      stream.on('error', () => {
        if (!res.writableEnded) res.end();
      });
      stream.pipe(res);
      return true;
    } catch {
      return false;
    }
  };

  // 1. Local disk cache (<5ms)
  const cachedPath = getAudioCachePath(fileId);
  if (fs.existsSync(cachedPath)) {
    try {
      recordAudioCacheAccess(cachedPath);
      const total = fs.statSync(cachedPath).size;
      if (sendSliceFromPath(cachedPath, total)) return;
    } catch {
      // Fall through
    }
  }

  // 2. Warm background cache + check flushed partial .tmp
  const downloadTask = ensureDriveAudioCached(fileId, meta);
  if (downloadTask && downloadTask.totalBytes !== null) {
    const total = downloadTask.totalBytes;
    if (start >= total) {
      res.status(204);
      res.setHeader('X-Audio-Total-Bytes', String(total));
      res.setHeader('X-Audio-Mime-Type', meta.mimeType);
      res.setHeader('Cache-Control', 'private, no-store, no-transform');
      res.end();
      return;
    }
    try {
      if (fs.existsSync(cachedPath)) {
        if (sendSliceFromPath(cachedPath, total)) return;
      }
      if (fs.existsSync(downloadTask.tmpPath)) {
        const diskSize = fs.statSync(downloadTask.tmpPath).size;
        const safeFlushedEnd = diskSize - 65536 - 1;
        const targetEnd = Math.min(total - 1, start + length - 1);
        if (safeFlushedEnd >= targetEnd) {
          if (sendSliceFromPath(downloadTask.tmpPath, total)) return;
        }
      }
    } catch {
      // Fall through to upstream
    }
  }

  // 3. Cold-miss fetch single <=1 MB range from Google Drive and return as HTTP 200
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const end = start + length - 1;
    const cachedDirect = resolvedDriveUrlCache.get(fileId);
    const targetUrl =
      cachedDirect && cachedDirect.expiresAt > Date.now()
        ? cachedDirect.url
        : buildDriveDownloadUrl(fileId);
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'audio/*,*/*;q=0.9',
      Range: `bytes=${start}-${end}`,
    };

    let upstream = await fetch(targetUrl, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });
    if (
      !upstream.ok &&
      upstream.status !== 206 &&
      upstream.status !== 416 &&
      targetUrl !== buildDriveDownloadUrl(fileId)
    ) {
      resolvedDriveUrlCache.delete(fileId);
      upstream = await fetch(buildDriveDownloadUrl(fileId), {
        headers,
        redirect: 'follow',
        signal: controller.signal,
      });
    }

    if (upstream.status === 416) {
      const cr = upstream.headers.get('content-range') ?? '';
      const totalMatch = cr.match(/\/(\d+)$/);
      res.status(204);
      if (totalMatch?.[1]) {
        res.setHeader('X-Audio-Total-Bytes', totalMatch[1]);
      }
      res.setHeader('X-Audio-Mime-Type', meta.mimeType);
      res.setHeader('Cache-Control', 'private, no-store, no-transform');
      res.end();
      return;
    }

    if (!upstream.ok && upstream.status !== 206) {
      res.status(502).json({ error: `Upstream status ${upstream.status}` });
      return;
    }
    const upstreamType = upstream.headers.get('content-type') ?? '';
    if (upstreamType.includes('text/html') || !upstream.body) {
      res.status(502).json({ error: 'Upstream did not return audio binary.' });
      return;
    }

    if (upstream.url && upstream.url.startsWith('https://')) {
      resolvedDriveUrlCache.set(fileId, {
        url: upstream.url,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
    }

    const cr = upstream.headers.get('content-range') ?? '';
    const rangeMatch = /^bytes\s+(\d+)-(\d+)\/(\d+)$/i.exec(cr);
    const cl = upstream.headers.get('content-length');
    const actualStart = rangeMatch ? rangeMatch[1] : String(start);
    const actualEnd = rangeMatch
      ? rangeMatch[2]
      : cl
        ? String(start + Number.parseInt(cl, 10) - 1)
        : String(end);
    const totalBytes = rangeMatch ? rangeMatch[3] : (cl ?? '');

    res.status(200);
    res.setHeader('Content-Type', 'application/octet-stream');
    if (cl) res.setHeader('Content-Length', cl);
    if (totalBytes) res.setHeader('X-Audio-Total-Bytes', totalBytes);
    res.setHeader('X-Audio-Chunk-Start', actualStart);
    res.setHeader('X-Audio-Chunk-End', actualEnd);
    res.setHeader('X-Audio-Mime-Type', meta.mimeType);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'private, no-store, no-transform');

    const nodeStream = Readable.fromWeb(
      upstream.body as unknown as WebReadableStream<Uint8Array>,
    );
    nodeStream.on('error', () => {
      if (!res.writableEnded) res.end();
    });
    nodeStream.pipe(res);
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return;
    if (!res.headersSent) {
      res.status(502).json({ error: 'Gagal mengambil potongan audio.' });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
}

function handleLocalOrPracticeChoukaiAudio(
  req: Request,
  res: Response,
  rawPacketId: string,
) {
  const packetId = rawPacketId.replace(/[^a-zA-Z0-9_-]/g, '') || 'n2-1';
  const aistudioDir = path.resolve(process.cwd(), 'public/assets/aistudio');

  // Serve real static MP3/M4A if present in public/assets/aistudio/
  const candidates = [
    path.join(aistudioDir, `${packetId}.mp3`),
    path.join(aistudioDir, `${packetId}.m4a`),
    ...(packetId === 'n2-1'
      ? [path.join(aistudioDir, '2016_12_N2_choukai.mp3')]
      : []),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const mimeType = candidate.endsWith('.m4a')
        ? 'audio/mp4'
        : 'audio/mpeg';
      sendLocalFileWithRanges(req, res, candidate, mimeType);
      return;
    }
  }

  // Otherwise serve valid HTTP 206 Range-capable WAV cue track (12 minutes structured pacing)
  const durationSeconds = 12 * 60;
  const totalBytes = WAV_HEADER_BYTES + durationSeconds * WAV_SAMPLE_RATE;
  const parsed = parseSingleRange(req.headers.range, totalBytes);

  if (!parsed) {
    res.status(416).set('Content-Range', `bytes */${totalBytes}`).end();
    return;
  }

  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="JLPT_${packetId}_Choukai.wav"`,
  );
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  if (parsed.isPartial) {
    res.status(206);
    res.setHeader(
      'Content-Range',
      `bytes ${parsed.start}-${parsed.end}/${totalBytes}`,
    );
    res.setHeader('Content-Length', String(parsed.end - parsed.start + 1));
  } else {
    res.status(200);
    res.setHeader('Content-Length', String(totalBytes));
  }

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const slice = renderChoukaiWavSlice(
    packetId,
    parsed.start,
    parsed.end,
    durationSeconds,
  );
  res.send(slice);
}

async function startServer() {
  const app = express();
  const port = Number.parseInt(process.env.PORT ?? '3000', 10) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/tts', express.json({ limit: '8kb' }), (req, res) => {
    void handleJapaneseTts(req, res);
  });
  app.post('/api/tts/stream', express.json({ limit: '8kb' }), (req, res) => {
    void handleJapaneseTtsStream(req, res);
  });

  app.post('/api/tryout/explain', express.json({ limit: '24kb' }), (req, res) => {
    void handleTryOutExplain(req, res);
  });

  app.post('/api/translate-batch', express.json({ limit: '96kb' }), (req, res) => {
    void handleTranslateBatch(req, res);
  });

  // =========================================================================
  // Hidden Admin Pesan Inbox & Bug/Suggestion Reporting API
  // =========================================================================
  type ServerFeedbackCategory = 'bug' | 'typo' | 'suggestion' | 'other';
  type ServerFeedbackScreen =
    | 'home'
    | 'anki'
    | 'learn'
    | 'challenge'
    | 'tryout'
    | 'profile'
    | 'other';
  type ServerFeedbackStatus = 'open' | 'reviewed' | 'resolved';
  type ServerJlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

  interface ServerFeedbackRecord {
    id: string;
    username: string;
    accountEmail: string;
    category: ServerFeedbackCategory;
    screen: ServerFeedbackScreen;
    jlptLevel: ServerJlptLevel;
    title: string;
    description: string;
    status: ServerFeedbackStatus;
    adminNote: string;
    screenshotInfo: string;
    screenshotDataUrl: string;
    createdAtMs: number;
    updatedAtMs: number;
  }

  interface StoredAdminCredential {
    algorithm: 'scrypt';
    saltHex: string;
    hashHex: string;
    createdAtMs: number;
  }

  const FEEDBACK_ALLOWED_CATEGORIES = new Set<ServerFeedbackCategory>([
    'bug',
    'typo',
    'suggestion',
    'other',
  ]);
  const FEEDBACK_ALLOWED_SCREENS = new Set<ServerFeedbackScreen>([
    'home',
    'anki',
    'learn',
    'challenge',
    'tryout',
    'profile',
    'other',
  ]);
  const FEEDBACK_ALLOWED_STATUSES = new Set<ServerFeedbackStatus>([
    'open',
    'reviewed',
    'resolved',
  ]);
  const FEEDBACK_ALLOWED_JLPT = new Set<ServerJlptLevel>([
    'N5',
    'N4',
    'N3',
    'N2',
    'N1',
  ]);
  const FEEDBACK_MAX_STORED_ITEMS = 500;
  const FEEDBACK_MAX_SCREENSHOT_CHARS = 260_000;
  const FEEDBACK_SUBMIT_WINDOW_MS = 15 * 60 * 1000;
  const FEEDBACK_SUBMIT_MAX_PER_IP = 15;
  const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
  const ADMIN_LOGIN_MAX_FAILURES = 10;
  const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
  const ADMIN_MAX_SESSIONS = 24;

  function resolveInboxDataDir(): string {
    const primaryDir = path.resolve(process.cwd(), '.utamago-data');
    try {
      fs.mkdirSync(primaryDir, { recursive: true });
      fs.accessSync(primaryDir, fs.constants.W_OK);
      return primaryDir;
    } catch {
      const fallbackDir = path.join(os.tmpdir(), 'utamago-inbox-data');
      fs.mkdirSync(fallbackDir, { recursive: true });
      return fallbackDir;
    }
  }

  const inboxDataDir = resolveInboxDataDir();
  const feedbackStorePath = path.join(inboxDataDir, 'feedback-inbox.json');
  const adminCredentialPath = path.join(inboxDataDir, 'admin-auth.json');

  function atomicWriteJson(filePath: string, data: unknown): void {
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.renameSync(tmpPath, filePath);
  }

  function loadFeedbackStore(): ServerFeedbackRecord[] {
    try {
      if (!fs.existsSync(feedbackStorePath)) return [];
      const raw = JSON.parse(fs.readFileSync(feedbackStorePath, 'utf8'));
      if (!Array.isArray(raw)) return [];
      return raw.filter(
        (item): item is ServerFeedbackRecord =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.title === 'string',
      );
    } catch {
      return [];
    }
  }

  let feedbackRecords: ServerFeedbackRecord[] = loadFeedbackStore();

  function saveFeedbackStore(): void {
    try {
      atomicWriteJson(feedbackStorePath, feedbackRecords);
    } catch (err) {
      console.error(
        '[FeedbackInbox] Failed to persist feedback store:',
        err instanceof Error ? err.message : 'unknown error',
      );
    }
  }

  function loadAdminCredential(): StoredAdminCredential | null {
    try {
      if (!fs.existsSync(adminCredentialPath)) return null;
      const raw = JSON.parse(
        fs.readFileSync(adminCredentialPath, 'utf8'),
      ) as Partial<StoredAdminCredential>;
      if (
        raw.algorithm === 'scrypt' &&
        typeof raw.saltHex === 'string' &&
        typeof raw.hashHex === 'string' &&
        raw.saltHex.length >= 16 &&
        raw.hashHex.length >= 64
      ) {
        return {
          algorithm: 'scrypt',
          saltHex: raw.saltHex,
          hashHex: raw.hashHex,
          createdAtMs:
            typeof raw.createdAtMs === 'number' ? raw.createdAtMs : Date.now(),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  let claimedAdminCredential: StoredAdminCredential | null =
    loadAdminCredential();

  const adminSessions = new Map<
    string,
    { createdAtMs: number; expiresAtMs: number }
  >();
  const adminLoginFailures = new Map<string, number[]>();
  const feedbackSubmitBuckets = new Map<string, number[]>();

  function getEnvAdminPasscode(): string {
    return (process.env.ADMIN_INBOX_PASSCODE ?? '').trim();
  }

  function getAdminAuthMode(): 'env' | 'claimed' | 'unclaimed' {
    if (getEnvAdminPasscode().length > 0) return 'env';
    if (claimedAdminCredential) return 'claimed';
    return 'unclaimed';
  }

  function hashPasscodeScrypt(password: string): StoredAdminCredential {
    const salt = crypto.randomBytes(16);
    const derived = crypto.scryptSync(password, salt, 64);
    return {
      algorithm: 'scrypt',
      saltHex: salt.toString('hex'),
      hashHex: derived.toString('hex'),
      createdAtMs: Date.now(),
    };
  }

  function verifyAdminPasscode(candidate: string): boolean {
    const envPasscode = getEnvAdminPasscode();
    if (envPasscode.length > 0) {
      const a = crypto.createHash('sha256').update(candidate, 'utf8').digest();
      const b = crypto
        .createHash('sha256')
        .update(envPasscode, 'utf8')
        .digest();
      return crypto.timingSafeEqual(a, b);
    }
    if (!claimedAdminCredential) return false;
    try {
      const salt = Buffer.from(claimedAdminCredential.saltHex, 'hex');
      const expected = Buffer.from(claimedAdminCredential.hashHex, 'hex');
      const actual = crypto.scryptSync(candidate, salt, expected.length);
      if (actual.length !== expected.length) return false;
      return crypto.timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  function issueAdminSession(): { token: string; expiresAtMs: number } {
    const now = Date.now();
    for (const [key, session] of adminSessions.entries()) {
      if (session.expiresAtMs <= now) adminSessions.delete(key);
    }
    while (adminSessions.size >= ADMIN_MAX_SESSIONS) {
      const oldest = adminSessions.keys().next().value;
      if (!oldest) break;
      adminSessions.delete(oldest);
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAtMs = now + ADMIN_SESSION_TTL_MS;
    adminSessions.set(token, { createdAtMs: now, expiresAtMs });
    return { token, expiresAtMs };
  }

  function extractBearerToken(req: Request): string | null {
    const raw = req.headers.authorization;
    if (typeof raw !== 'string') return null;
    const match = /^Bearer\s+([a-f0-9]{64})$/i.exec(raw.trim());
    return match ? match[1] : null;
  }

  function hasValidAdminSession(req: Request): boolean {
    const token = extractBearerToken(req);
    if (!token) return false;
    const session = adminSessions.get(token);
    if (!session) return false;
    if (session.expiresAtMs <= Date.now()) {
      adminSessions.delete(token);
      return false;
    }
    return true;
  }

  function checkRateBucket(
    map: Map<string, number[]>,
    key: string,
    windowMs: number,
    maxCount: number,
    recordAttempt: boolean,
  ): boolean {
    const now = Date.now();
    const cutoff = now - windowMs;
    const recent = (map.get(key) ?? []).filter((ts) => ts > cutoff);
    if (recent.length >= maxCount) {
      map.set(key, recent);
      return false;
    }
    if (recordAttempt) {
      recent.push(now);
      map.set(key, recent);
    } else if (recent.length > 0) {
      map.set(key, recent);
    } else {
      map.delete(key);
    }
    return true;
  }

  function isSafeScreenshotDataUrl(val: string): boolean {
    if (!val) return true;
    if (val.length > FEEDBACK_MAX_SCREENSHOT_CHARS) return false;
    return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(val);
  }

  app.post('/api/feedback', express.json({ limit: '380kb' }), (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const clientIp = getClientIp(req);
    if (
      !checkRateBucket(
        feedbackSubmitBuckets,
        clientIp,
        FEEDBACK_SUBMIT_WINDOW_MS,
        FEEDBACK_SUBMIT_MAX_PER_IP,
        true,
      )
    ) {
      res.status(429).json({
        error: 'Terlalu banyak laporan dikirim dalam waktu singkat. Coba lagi nanti.',
      });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Format laporan tidak valid.' });
      return;
    }

    const rawCategory =
      typeof body.category === 'string' ? body.category.trim() : '';
    const rawScreen = typeof body.screen === 'string' ? body.screen.trim() : '';
    const rawJlpt =
      typeof body.jlptLevel === 'string' ? body.jlptLevel.trim() : 'N5';
    const title = cleanBoundedText(body.title, 100).replace(/\s+/g, ' ');
    const description = cleanBoundedText(body.description, 1000);
    const username = cleanBoundedText(body.username, 60) || 'pelajar';
    const accountEmail = cleanBoundedText(body.accountEmail, 120);
    const screenshotInfo = cleanBoundedText(body.screenshotInfo, 80);
    const screenshotDataUrl =
      typeof body.screenshotDataUrl === 'string'
        ? body.screenshotDataUrl.trim()
        : '';

    if (!FEEDBACK_ALLOWED_CATEGORIES.has(rawCategory as ServerFeedbackCategory)) {
      res.status(400).json({ error: 'Kategori laporan tidak valid.' });
      return;
    }
    if (!FEEDBACK_ALLOWED_SCREENS.has(rawScreen as ServerFeedbackScreen)) {
      res.status(400).json({ error: 'Halaman terkait tidak valid.' });
      return;
    }
    if (title.length < 5) {
      res.status(400).json({ error: 'Judul laporan minimal 5 karakter.' });
      return;
    }
    if (description.length < 10) {
      res.status(400).json({ error: 'Detail laporan minimal 10 karakter.' });
      return;
    }
    if (!isSafeScreenshotDataUrl(screenshotDataUrl)) {
      res.status(400).json({
        error: 'Lampiran screenshot tidak valid atau melebihi batas ukuran.',
      });
      return;
    }

    const nowMs = Date.now();
    const record: ServerFeedbackRecord = {
      id: `fb_${nowMs}_${crypto.randomBytes(4).toString('hex')}`,
      username,
      accountEmail,
      category: rawCategory as ServerFeedbackCategory,
      screen: rawScreen as ServerFeedbackScreen,
      jlptLevel: FEEDBACK_ALLOWED_JLPT.has(rawJlpt as ServerJlptLevel)
        ? (rawJlpt as ServerJlptLevel)
        : 'N5',
      title,
      description,
      status: 'open',
      adminNote: '',
      screenshotInfo,
      screenshotDataUrl,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    };

    feedbackRecords = [record, ...feedbackRecords].slice(
      0,
      FEEDBACK_MAX_STORED_ITEMS,
    );
    saveFeedbackStore();

    res.status(201).json({ ok: true, id: record.id, createdAtMs: nowMs });
  });

  app.get('/api/admin/status', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const mode = getAdminAuthMode();
    res.status(200).json({
      mode,
      configured: mode !== 'unclaimed',
      authenticated: hasValidAdminSession(req),
    });
  });

  app.post('/api/admin/setup', express.json({ limit: '8kb' }), (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (getAdminAuthMode() !== 'unclaimed') {
      res.status(409).json({
        error:
          'Password admin sudah dikonfigurasi. Silakan masuk menggunakan password admin.',
      });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    const password =
      typeof body?.password === 'string' ? body.password.trim() : '';
    const confirmPassword =
      typeof body?.confirmPassword === 'string'
        ? body.confirmPassword.trim()
        : password;

    if (password.length < 4 || password.length > 128) {
      res.status(400).json({
        error: 'Password admin harus antara 4 hingga 128 karakter.',
      });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Konfirmasi password tidak cocok.' });
      return;
    }

    const credential = hashPasscodeScrypt(password);
    try {
      atomicWriteJson(adminCredentialPath, credential);
      claimedAdminCredential = credential;
    } catch (err) {
      console.error(
        '[AdminAuth] Failed to persist claimed admin credential hash:',
        err instanceof Error ? err.message : 'unknown error',
      );
      claimedAdminCredential = credential;
    }

    const session = issueAdminSession();
    res.status(201).json({
      ok: true,
      token: session.token,
      expiresAtMs: session.expiresAtMs,
    });
  });

  app.post('/api/admin/login', express.json({ limit: '8kb' }), (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const mode = getAdminAuthMode();
    if (mode === 'unclaimed') {
      res.status(409).json({
        error: 'Password admin belum diatur. Silakan buat password admin terlebih dahulu.',
        needsSetup: true,
      });
      return;
    }

    const clientIp = getClientIp(req);
    if (
      !checkRateBucket(
        adminLoginFailures,
        clientIp,
        ADMIN_LOGIN_WINDOW_MS,
        ADMIN_LOGIN_MAX_FAILURES,
        false,
      )
    ) {
      res.status(429).json({
        error: 'Terlalu banyak percobaan login admin. Tunggu beberapa menit lalu coba lagi.',
      });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    const password =
      typeof body?.password === 'string' ? body.password.trim() : '';

    if (!password || !verifyAdminPasscode(password)) {
      checkRateBucket(
        adminLoginFailures,
        clientIp,
        ADMIN_LOGIN_WINDOW_MS,
        ADMIN_LOGIN_MAX_FAILURES,
        true,
      );
      res.status(401).json({ error: 'Password admin salah.' });
      return;
    }

    adminLoginFailures.delete(clientIp);
    const session = issueAdminSession();
    res.status(200).json({
      ok: true,
      token: session.token,
      expiresAtMs: session.expiresAtMs,
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = extractBearerToken(req);
    if (token) {
      adminSessions.delete(token);
    }
    res.status(200).json({ ok: true });
  });

  app.get('/api/admin/feedback', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!hasValidAdminSession(req)) {
      res.status(401).json({ error: 'Sesi admin tidak valid atau telah berakhir.' });
      return;
    }
    const sorted = [...feedbackRecords].sort(
      (a, b) => b.createdAtMs - a.createdAtMs,
    );
    const summary = {
      total: sorted.length,
      open: sorted.filter((i) => i.status === 'open').length,
      reviewed: sorted.filter((i) => i.status === 'reviewed').length,
      resolved: sorted.filter((i) => i.status === 'resolved').length,
    };
    res.status(200).json({ items: sorted, summary });
  });

  app.patch(
    '/api/admin/feedback/:id',
    express.json({ limit: '16kb' }),
    (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      if (!hasValidAdminSession(req)) {
        res.status(401).json({ error: 'Sesi admin tidak valid atau telah berakhir.' });
        return;
      }

      const id = (req.params.id ?? '').trim();
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
        res.status(400).json({ error: 'ID laporan tidak valid.' });
        return;
      }

      const idx = feedbackRecords.findIndex((item) => item.id === id);
      if (idx < 0) {
        res.status(404).json({ error: 'Laporan tidak ditemukan.' });
        return;
      }

      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        res.status(400).json({ error: 'Data pembaruan tidak valid.' });
        return;
      }

      const current = feedbackRecords[idx];
      let nextStatus = current.status;
      if (body.status !== undefined) {
        if (
          typeof body.status !== 'string' ||
          !FEEDBACK_ALLOWED_STATUSES.has(body.status as ServerFeedbackStatus)
        ) {
          res.status(400).json({ error: 'Status laporan tidak valid.' });
          return;
        }
        nextStatus = body.status as ServerFeedbackStatus;
      }

      const nextNote =
        body.adminNote !== undefined
          ? cleanBoundedText(body.adminNote, 300)
          : current.adminNote;

      const updated: ServerFeedbackRecord = {
        ...current,
        status: nextStatus,
        adminNote: nextNote,
        updatedAtMs: Date.now(),
      };
      feedbackRecords[idx] = updated;
      saveFeedbackStore();

      res.status(200).json({ ok: true, item: updated });
    },
  );

  app.delete('/api/admin/feedback/:id', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!hasValidAdminSession(req)) {
      res.status(401).json({ error: 'Sesi admin tidak valid atau telah berakhir.' });
      return;
    }

    const id = (req.params.id ?? '').trim();
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
      res.status(400).json({ error: 'ID laporan tidak valid.' });
      return;
    }

    const before = feedbackRecords.length;
    feedbackRecords = feedbackRecords.filter((item) => item.id !== id);
    if (feedbackRecords.length === before) {
      res.status(404).json({ error: 'Laporan tidak ditemukan.' });
      return;
    }

    saveFeedbackStore();
    res.status(200).json({ ok: true });
  });

  // Monthly Catbox.moe keep-alive endpoint (touches all 18 N2 MP3s at least once every 25 days)
  const handleAudioKeepAlive = (req: Request, res: Response) => {
    const force = String(req.query.force ?? '') === '1';
    const { triggered, state } = runCatboxKeepAliveIfDue(force);
    res.setHeader('Cache-Control', 'no-store');
    res.status(triggered ? 202 : 200).json({
      ok: true,
      triggered,
      intervalDays: Math.round(CATBOX_KEEPALIVE_INTERVAL_MS / (24 * 60 * 60 * 1000)),
      ...state,
    });
  };
  app.get('/api/audio/keepalive', handleAudioKeepAlive);
  app.post('/api/audio/keepalive', handleAudioKeepAlive);

  app.get('/api/audio/prefetch/:fileId', (req, res) => {
    const fileId = (req.params.fileId ?? '').trim();
    const meta = ALLOWED_DRIVE_AUDIO[fileId];
    if (!meta) {
      res.status(404).json({ error: 'Audio track not found in catalog.' });
      return;
    }
    const finalPath = getAudioCachePath(fileId);
    if (fs.existsSync(finalPath)) {
      res.json({ status: 'cached', fileId });
      return;
    }
    const task = ensureDriveAudioCached(fileId, meta);
    res.status(202).json({
      status: 'downloading',
      fileId,
      downloadedBytes: task?.downloadedBytes ?? 0,
      totalBytes: task?.totalBytes ?? null,
    });
  });

  app.get('/api/audio/json-chunk/:fileId', (req, res) => {
    void handleDriveAudioJsonChunk(req, res);
  });

  app.get('/api/audio/chunk/:fileId', (req, res) => {
    void handleDriveAudioChunk(req, res);
  });

  app.get('/api/audio/drive/:fileId', (req, res) => {
    void handleDriveAudioProxy(req, res);
  });
  app.head('/api/audio/drive/:fileId', (req, res) => {
    void handleDriveAudioProxy(req, res);
  });

  app.get('/api/audio/choukai/:packetId', (req, res) => {
    handleLocalOrPracticeChoukaiAudio(req, res, req.params.packetId ?? 'n2-1');
  });
  app.head('/api/audio/choukai/:packetId', (req, res) => {
    handleLocalOrPracticeChoukaiAudio(req, res, req.params.packetId ?? 'n2-1');
  });

  // Protect raw curriculum .txt datasets from direct browser opening, cross-site scraping, and search indexing
  app.use('/assets/aistudio', (req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, noarchive, nosnippet');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.path.endsWith('.txt')) {
      const fetchDest = String(req.headers['sec-fetch-dest'] ?? '').toLowerCase();
      const fetchSite = String(req.headers['sec-fetch-site'] ?? '').toLowerCase();
      if (fetchDest === 'document' || fetchSite === 'cross-site') {
        res.status(403).type('text/plain').send('Forbidden');
        return;
      }
    }
    next();
  });

  // Guard legacy static path if offline MP3 was not bundled
  app.get('/assets/aistudio/2016_12_N2_choukai.mp3', (req, res, next) => {
    const filePath = path.resolve(
      process.cwd(),
      'public/assets/aistudio/2016_12_N2_choukai.mp3',
    );
    if (fs.existsSync(filePath)) {
      next();
      return;
    }
    handleLocalOrPracticeChoukaiAudio(req, res, 'n2-1');
  });

  // Serve 30-second vertical beta launch promo MP4 with byte-range streaming & optional 1-click download
  const servePromoVideo = (req: Request, res: Response) => {
    const prodPath = path.resolve(process.cwd(), 'dist/promo/utamago-beta-30s.mp4');
    const pubPath = path.resolve(process.cwd(), 'public/promo/utamago-beta-30s.mp4');
    const filePath = fs.existsSync(pubPath) ? pubPath : prodPath;
    if (!fs.existsSync(filePath)) {
      res.status(404).type('text/plain').send('Promo video not found.');
      return;
    }
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (String(req.query.download ?? '') === '1') {
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="UtamaGo-Promo-Beta-30s.mp4"',
      );
    }
    res.sendFile(filePath);
  };
  app.get('/promo/utamago-beta-30s.mp4', servePromoVideo);
  app.head('/promo/utamago-beta-30s.mp4', servePromoVideo);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`UtamaGo! server listening on http://0.0.0.0:${port}`);
    // Run monthly Catbox.moe keep-alive check on startup and once per day thereafter
    // so all 18 JLPT N2 Choukai MP3 files stay active (< 25 days between accesses).
    setTimeout(() => {
      runCatboxKeepAliveIfDue(false);
    }, 3000);
    setInterval(() => {
      runCatboxKeepAliveIfDue(false);
    }, CATBOX_KEEPALIVE_CHECK_MS).unref();
  });
}

void startServer();
