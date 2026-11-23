import { getTryOutPacketForms } from '../data/tryOutN2AllPackets';
import type { JlptLevel } from '../data/utamagoContent';
import type { AnkiCard } from './ankiParser';
import type { AnkiSrsMap } from './ankiSrs';
import type { BunpouN2Item } from './bunpouN2Parser';
import { getDifficultAnkiCards } from './homeSummary';
import {
  evaluateJlptN2PartScore,
  JLPT_N2_SECTION_PASS_MIN,
} from './jlptN2Scoring';
import type { StoredTryOutPacketState } from './storage';
import {
  ALL_TRYOUT_PACKETS,
  type TryOutPacketPartId,
} from './tryOutPacket';
import { extractKanjiPracticeItems } from './writingPractice';

export type WeaknessCategory = 'vocab' | 'kanji' | 'bunpou' | 'tryout';
export type WeaknessSeverity = 'high' | 'medium' | 'ready';

export type WeaknessActionTarget =
  | { type: 'difficult-drill' }
  | { type: 'writing-studio'; mode: 'difficult-kanji' | 'kanji' | 'hiragana' }
  | { type: 'bunpou' }
  | { type: 'tryout-packet'; packetId: string; partId?: TryOutPacketPartId }
  | { type: 'anki' };

export interface WeaknessInsight {
  id: string;
  category: WeaknessCategory;
  severity: WeaknessSeverity;
  severityScore: number;
  title: string;
  metricLabel: string;
  reason: string;
  actionLabel: string;
  action: WeaknessActionTarget;
}

export interface JlptWeaknessReport {
  hasEnoughData: boolean;
  readinessLabel: string;
  readinessDetail: string;
  difficultWordCount: number;
  difficultKanjiCount: number;
  weakestMondaiLabel: string | null;
  bunpouRemainingCount: number;
  insights: WeaknessInsight[];
}

export function analyzeJlptWeaknesses(params: {
  unlockedLevel: JlptLevel;
  unlockedAnkiCards: readonly AnkiCard[];
  ankiSrs: AnkiSrsMap;
  againIds: readonly string[];
  packetsProgress: Record<string, StoredTryOutPacketState>;
  fallbackFirstPacket?: StoredTryOutPacketState;
  bunpouByLevel: Partial<Record<JlptLevel, readonly BunpouN2Item[]>>;
  reviewedLessonIds: readonly string[];
}): JlptWeaknessReport {
  const {
    unlockedLevel,
    unlockedAnkiCards,
    ankiSrs,
    againIds,
    packetsProgress,
    fallbackFirstPacket,
    bunpouByLevel,
    reviewedLessonIds,
  } = params;

  const insights: WeaknessInsight[] = [];

  // 1. Analyze Difficult Vocab (Anki lapses + low ease + againIds)
  const difficultCards = getDifficultAnkiCards(
    [...unlockedAnkiCards],
    ankiSrs,
    [...againIds],
  );
  const difficultCardIdSet = new Set(difficultCards.map((d) => d.card.id));

  if (difficultCards.length > 0) {
    const sampleWords = difficultCards
      .slice(0, 3)
      .map((d) => d.card.word)
      .join('、');
    const isHigh = difficultCards.length >= 6;
    insights.push({
      id: 'weak-vocab-drill',
      category: 'vocab',
      severity: isHigh ? 'high' : 'medium',
      severityScore: isHigh ? 92 : 70,
      title: 'Kosakata Rawan Lupa',
      metricLabel: `${difficultCards.length} kata sulit`,
      reason: `Sering terulang di Anki (${sampleWords}${difficultCards.length > 3 ? ', dll.' : ''}). Latih ulang fokus agar tidak mengendap di antrean lupa.`,
      actionLabel: 'Mulai Drill Kata Sulit',
      action: { type: 'difficult-drill' },
    });
  }

  // 2. Analyze Difficult Kanji Writing Practice Opportunity
  const difficultKanjis = extractKanjiPracticeItems(unlockedAnkiCards, {
    difficultCardIds: difficultCardIdSet,
    onlyDifficult: true,
    limit: 40,
  });

  if (difficultKanjis.length >= 2) {
    const sampleChars = difficultKanjis
      .slice(0, 4)
      .map((k) => k.character)
      .join(' · ');
    insights.push({
      id: 'weak-kanji-writing',
      category: 'kanji',
      severity: difficultKanjis.length >= 5 ? 'high' : 'medium',
      severityScore: difficultKanjis.length >= 5 ? 84 : 64,
      title: 'Penguatan Tulis Kanji Sulit',
      metricLabel: `${difficultKanjis.length} kanji`,
      reason: `Kanji dari kata yang sering lupa (${sampleChars}) paling cepat menempel saat dilatih tulis langsung di kanvas.`,
      actionLabel: 'Latih Tulis Kanji',
      action: { type: 'writing-studio', mode: 'difficult-kanji' },
    });
  }

  // 3. Analyze Try Out N2 Submitted Parts & Per-Mondai Weakest Spot
  const n2Packets = ALL_TRYOUT_PACKETS.filter(
    (p) => p.level === 'N2' && p.isFullText,
  );

  interface MondaiAgg {
    key: string;
    label: string;
    partId: TryOutPacketPartId;
    partLabel: string;
    packetId: string;
    earnedRaw: number;
    maxRaw: number;
    correct: number;
    total: number;
  }

  const mondaiMap = new Map<string, MondaiAgg>();
  let lowestCutoffPart: {
    packetId: string;
    packetTitle: string;
    partId: TryOutPacketPartId;
    partLabel: string;
    scaledScore: number;
  } | null = null;
  let submittedN2PartsCount = 0;

  for (const packet of n2Packets) {
    const state =
      packetsProgress[packet.id] ??
      (packet.id === 'n2-2' ? fallbackFirstPacket : undefined);
    const submittedIds = state?.packetProgress.submittedIds ?? [];
    if (submittedIds.length === 0) continue;

    const forms = getTryOutPacketForms(packet.id);
    for (const partId of submittedIds) {
      submittedN2PartsCount += 1;
      const evalPart = evaluateJlptN2PartScore(
        partId,
        forms[partId],
        state?.packetProgress.answersByPart[partId] ?? {},
      );

      if (
        !evalPart.passedCutoff &&
        (!lowestCutoffPart || evalPart.scaledScore < lowestCutoffPart.scaledScore)
      ) {
        lowestCutoffPart = {
          packetId: packet.id,
          packetTitle: packet.title,
          partId,
          partLabel: evalPart.partLabel,
          scaledScore: evalPart.scaledScore,
        };
      }

      for (const m of evalPart.mondaiBreakdown) {
        const key = `${partId}-m${m.mondaiNumber}`;
        const existing = mondaiMap.get(key);
        if (existing) {
          existing.earnedRaw += m.earnedRawPoints;
          existing.maxRaw += m.maxRawPoints;
          existing.correct += m.correctCount;
          existing.total += m.totalQuestions;
          existing.packetId = packet.id;
        } else {
          mondaiMap.set(key, {
            key,
            label: m.title,
            partId,
            partLabel: evalPart.partLabel,
            packetId: packet.id,
            earnedRaw: m.earnedRawPoints,
            maxRaw: m.maxRawPoints,
            correct: m.correctCount,
            total: m.totalQuestions,
          });
        }
      }
    }
  }

  let weakestMondaiLabel: string | null = null;

  if (lowestCutoffPart) {
    insights.push({
      id: `weak-tryout-cutoff-${lowestCutoffPart.partId}`,
      category: 'tryout',
      severity: 'high',
      severityScore: 98,
      title: `Ambang Bagian N2 Belum Aman (${lowestCutoffPart.partLabel})`,
      metricLabel: `Skor ${lowestCutoffPart.scaledScore}/60`,
      reason: `Masih di bawah batas lulus bagian ${JLPT_N2_SECTION_PASS_MIN}/60 pada ${lowestCutoffPart.packetTitle}. Fokus tinjau kesalahan bagian ini dulu.`,
      actionLabel: 'Tinjau Bagian Try Out',
      action: {
        type: 'tryout-packet',
        packetId: lowestCutoffPart.packetId,
        partId: lowestCutoffPart.partId,
      },
    });
  }

  if (mondaiMap.size > 0) {
    const sortedMondais = Array.from(mondaiMap.values())
      .filter((m) => m.maxRaw > 0)
      .map((m) => ({
        ...m,
        ratio: m.earnedRaw / m.maxRaw,
      }))
      .sort((a, b) => a.ratio - b.ratio);

    const weakest = sortedMondais[0];
    if (weakest && weakest.ratio < 0.75) {
      const pct = Math.round(weakest.ratio * 100);
      weakestMondaiLabel = `${weakest.label} (${pct}%)`;
      insights.push({
        id: `weak-tryout-mondai-${weakest.key}`,
        category: 'tryout',
        severity: pct < 50 ? 'high' : 'medium',
        severityScore: pct < 50 ? 90 : 74,
        title: `Mondai Terlemah: ${weakest.label}`,
        metricLabel: `${weakest.correct}/${weakest.total} benar (${pct}%)`,
        reason: `Akurasi poin berbobot terendah di bagian ${weakest.partLabel}. Ulangi tipe soal ini untuk dongkrak skor skala N2.`,
        actionLabel: 'Buka Try Out N2',
        action: {
          type: 'tryout-packet',
          packetId: weakest.packetId,
          partId: weakest.partId,
        },
      });
    }
  }

  // 4. Analyze Bunpou Coverage Gap at active unlockedLevel
  const reviewedSet = new Set(reviewedLessonIds);
  const activeBunpouItems = bunpouByLevel[unlockedLevel] ?? [];
  const remainingBunpou = activeBunpouItems.filter(
    (item) => !reviewedSet.has(item.id),
  );
  const studiedBunpouCount = activeBunpouItems.length - remainingBunpou.length;

  if (activeBunpouItems.length > 0 && remainingBunpou.length > 0) {
    const coveragePct = Math.round(
      (studiedBunpouCount / activeBunpouItems.length) * 100,
    );
    insights.push({
      id: `weak-bunpou-gap-${unlockedLevel}`,
      category: 'bunpou',
      severity: coveragePct < 25 ? 'medium' : 'ready',
      severityScore: coveragePct < 25 ? 60 : 42,
      title: `Cakupan Bunpou ${unlockedLevel}`,
      metricLabel: `${studiedBunpouCount}/${activeBunpouItems.length} pola (${coveragePct}%)`,
      reason: `Masih ada ${remainingBunpou.length} pola tata bahasa ${unlockedLevel} yang belum ditinjau. Padukan baca pola dengan Kuis Pembeda Bunpou.`,
      actionLabel: 'Pelajari & Kuis Bunpou',
      action: { type: 'bunpou' },
    });
  }

  // Sort by severityScore descending and keep top 3 actionable cards
  insights.sort((a, b) => b.severityScore - a.severityScore);
  const topInsights = insights.slice(0, 3);

  const studiedAnkiCount = Object.keys(ankiSrs).length;
  const hasEnoughData =
    difficultCards.length > 0 ||
    submittedN2PartsCount > 0 ||
    studiedAnkiCount >= 5 ||
    reviewedLessonIds.length >= 3;

  // Helpful starter suggestions when learner is brand new
  if (!hasEnoughData && topInsights.length < 2) {
    topInsights.unshift({
      id: 'starter-anki-baseline',
      category: 'vocab',
      severity: 'ready',
      severityScore: 50,
      title: 'Bangun Profil Kelemahanmu',
      metricLabel: `${studiedAnkiCount} kartu direview`,
      reason:
        'Selesaikan minimal 5 kartu Anki atau 1 bagian Try Out agar detektor otomatis memetakan kosakata & Mondai terlemahmu.',
      actionLabel: 'Mulai Sesi Anki',
      action: { type: 'anki' },
    });
    if (topInsights.length < 2) {
      topInsights.push({
        id: 'starter-writing-canvas',
        category: 'kanji',
        severity: 'ready',
        severityScore: 40,
        title: 'Latih Ingatan Otot Kanji & Kana',
        metricLabel: `Level ${unlockedLevel}`,
        reason:
          'Coba kanvas tulis interaktif dengan panduan tracing samar dan audio pelafalan untuk memperkuat hafalan bentuk aksara.',
        actionLabel: 'Buka Studio Tulis',
        action: {
          type: 'writing-studio',
          mode: unlockedLevel === 'N5' ? 'hiragana' : 'kanji',
        },
      });
    }
  }

  const highCount = topInsights.filter((i) => i.severity === 'high').length;
  const readinessLabel = !hasEnoughData
    ? 'Menunggu Data Latihan'
    : highCount > 0
      ? `${highCount} Area Prioritas Tinggi`
      : 'Progres Stabil & Terarah';
  const readinessDetail = !hasEnoughData
    ? 'Lakukan beberapa sesi Anki atau Try Out agar rekomendasi kelemahan makin tajam.'
    : highCount > 0
      ? 'Selesaikan rekomendasi prioritas di bawah untuk dampak kenaikan skor tercepat.'
      : 'Pertahankan ritme harian dan lanjutkan penguatan pola Bunpou serta latihan menulis.';

  return {
    hasEnoughData,
    readinessLabel,
    readinessDetail,
    difficultWordCount: difficultCards.length,
    difficultKanjiCount: difficultKanjis.length,
    weakestMondaiLabel,
    bunpouRemainingCount: remainingBunpou.length,
    insights: topInsights.slice(0, 3),
  };
}
