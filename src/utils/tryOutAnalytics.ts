import { getTryOutPacketForms } from '../data/tryOutN2AllPackets';
import type { JlptLevel } from '../data/utamagoContent';
import {
  evaluateJlptN2PacketScore,
  evaluateJlptN2PartScore,
  type JlptN2PassStatus,
} from './jlptN2Scoring';
import type { ComputedTryOutReport } from './jlptReport';
import type { StoredTryOutPacketState } from './storage';
import {
  ALL_TRYOUT_PACKETS,
  evaluatePartFormProgress,
  evaluatePartScore,
  getTryOutPacketParts,
  type TryOutLevelOption,
  type TryOutPacketPartId,
} from './tryOutPacket';

export interface TryOutPacketChartPoint {
  packetId: string;
  level: TryOutLevelOption;
  order: string;
  number: number;
  shortLabel: string;
  title: string;
  examCode: string;
  yearLabel: string;
  mojiBunpouScore: number | null;
  dokkaiScore: number | null;
  choukaiScore: number | null;
  overallScore: number | null;
  n2MojiBunpouScaled: number | null;
  n2DokkaiScaled: number | null;
  n2ChoukaiScaled: number | null;
  n2TotalScaled: number | null;
  n2PassStatus: JlptN2PassStatus | null;
  submittedPartsCount: number;
  completedPartsCount: number;
  answeredChoices: number;
  totalChoices: number;
  hasAttempt: boolean;
}

export interface EquivalentJlptEstimate {
  level: JlptLevel | null;
  averageScore: number | null;
  source: 'tryout-packets' | 'mini-sim' | 'none';
  sourceLabel: string;
  summaryText: string;
  completedPacketsCount: number;
  submittedPartsTotal: number;
}

export function buildTryOutPacketChartSeries(
  packetsProgress: Record<string, StoredTryOutPacketState>,
  fallbackFirstPacket?: StoredTryOutPacketState,
  levelFilter?: TryOutLevelOption,
): TryOutPacketChartPoint[] {
  const unlockedCatalog = ALL_TRYOUT_PACKETS.filter(
    (p) => p.hasQuestions && p.isFullText,
  );
  const catalog = levelFilter
    ? unlockedCatalog.filter((p) => p.level === levelFilter)
    : unlockedCatalog;

  return catalog.map((packet) => {
    const state =
      packetsProgress[packet.id] ??
      (packet.id === 'n2-2' ? fallbackFirstPacket : undefined);
    const parts = getTryOutPacketParts(packet.id);
    const forms = getTryOutPacketForms(packet.id);

    const submittedIds = state?.packetProgress.submittedIds ?? [];
    const completedIds = state?.packetProgress.completedIds ?? [];
    const answersByPart = state?.packetProgress.answersByPart;

    const partScores: Record<TryOutPacketPartId, number | null> = {
      'moji-bunpou': null,
      dokkai: null,
      choukai: null,
    };
    const n2ScaledParts: Record<TryOutPacketPartId, number | null> = {
      'moji-bunpou': null,
      dokkai: null,
      choukai: null,
    };

    let answeredChoices = 0;
    let totalChoices = 0;
    let totalCorrectAttempted = 0;
    let totalGradableAttempted = 0;

    for (const part of parts) {
      const values = answersByPart?.[part.id] ?? {};
      const pages = forms[part.id];
      const progress = evaluatePartFormProgress(pages, values);
      answeredChoices += progress.answeredChoices;
      totalChoices += progress.totalChoices;

      const isSubmitted = submittedIds.includes(part.id);
      const isCompleted = completedIds.includes(part.id);
      if (isSubmitted || isCompleted || progress.answeredChoices > 0) {
        const score = evaluatePartScore(pages, values);
        partScores[part.id] = score.accuracyPercent;
        totalCorrectAttempted += score.correctCount;
        totalGradableAttempted += score.totalGradable;

        if (packet.level === 'N2') {
          n2ScaledParts[part.id] = evaluateJlptN2PartScore(
            part.id,
            pages,
            values,
          ).scaledScore;
        }
      }
    }

    const overallScore =
      totalGradableAttempted > 0
        ? Math.round((totalCorrectAttempted / totalGradableAttempted) * 100)
        : null;

    let n2TotalScaled: number | null = null;
    let n2PassStatus: JlptN2PassStatus | null = null;
    if (packet.level === 'N2') {
      const attemptedScaledValues = (
        ['moji-bunpou', 'dokkai', 'choukai'] as TryOutPacketPartId[]
      )
        .map((id) => n2ScaledParts[id])
        .filter((v): v is number => v !== null);

      if (attemptedScaledValues.length > 0) {
        n2TotalScaled = attemptedScaledValues.reduce((sum, v) => sum + v, 0);
        const packetEval = evaluateJlptN2PacketScore({
          forms,
          answersByPart: answersByPart ?? {},
          submittedIds:
            submittedIds.length > 0 ? submittedIds : completedIds,
        });
        n2PassStatus = packetEval.status;
      }
    }

    return {
      packetId: packet.id,
      level: packet.level,
      order: packet.order,
      number: packet.number,
      shortLabel: `${packet.level} P${packet.number}`,
      title: packet.title,
      examCode: packet.examCode,
      yearLabel: packet.yearLabel,
      mojiBunpouScore: partScores['moji-bunpou'],
      dokkaiScore: partScores.dokkai,
      choukaiScore: partScores.choukai,
      overallScore,
      n2MojiBunpouScaled: n2ScaledParts['moji-bunpou'],
      n2DokkaiScaled: n2ScaledParts.dokkai,
      n2ChoukaiScaled: n2ScaledParts.choukai,
      n2TotalScaled,
      n2PassStatus,
      submittedPartsCount: submittedIds.length,
      completedPartsCount: completedIds.length,
      answeredChoices,
      totalChoices,
      hasAttempt:
        submittedIds.length > 0 ||
        completedIds.length > 0 ||
        answeredChoices > 0,
    };
  });
}

export function mapN2ScoreToEquivalentLevel(
  scorePercent: number,
  hasFullPacket: boolean,
): JlptLevel {
  if (hasFullPacket && scorePercent >= 85) return 'N1';
  if (scorePercent >= 60) return 'N2';
  if (scorePercent >= 45) return 'N3';
  if (scorePercent >= 25) return 'N4';
  return 'N5';
}

export function mapN1ScoreToEquivalentLevel(scorePercent: number): JlptLevel {
  if (scorePercent >= 60) return 'N1';
  if (scorePercent >= 45) return 'N2';
  if (scorePercent >= 30) return 'N3';
  return 'N4';
}

export function mapN3ScoreToEquivalentLevel(scorePercent: number): JlptLevel {
  if (scorePercent >= 85) return 'N2';
  if (scorePercent >= 55) return 'N3';
  if (scorePercent >= 35) return 'N4';
  return 'N5';
}

export function estimateEquivalentJlptLevel(params: {
  packetsProgress: Record<string, StoredTryOutPacketState>;
  fallbackFirstPacket?: StoredTryOutPacketState;
  latestReport: ComputedTryOutReport | null;
}): EquivalentJlptEstimate {
  const { packetsProgress, fallbackFirstPacket, latestReport } = params;
  const series = buildTryOutPacketChartSeries(
    packetsProgress,
    fallbackFirstPacket,
  );

  const submittedPackets = series.filter(
    (p) =>
      (p.submittedPartsCount > 0 || p.completedPartsCount > 0) &&
      p.overallScore !== null,
  );

  if (submittedPackets.length > 0) {
    const avg = Math.round(
      submittedPackets.reduce((sum, p) => sum + (p.overallScore ?? 0), 0) /
        submittedPackets.length,
    );
    const submittedPartsTotal = submittedPackets.reduce(
      (sum, p) => sum + Math.max(p.submittedPartsCount, p.completedPartsCount),
      0,
    );

    const n1Submitted = submittedPackets.filter((p) => p.level === 'N1');
    const n2Submitted = submittedPackets.filter((p) => p.level === 'N2');
    const n1Best =
      n1Submitted.length > 0
        ? Math.max(...n1Submitted.map((p) => p.overallScore ?? 0))
        : null;

    const hasFullN2 = n2Submitted.some(
      (p) => p.submittedPartsCount >= 3 || p.completedPartsCount >= 3,
    );

    const level =
      n1Best !== null && n1Best >= 60
        ? mapN1ScoreToEquivalentLevel(n1Best)
        : n2Submitted.length > 0 || n1Submitted.length > 0
          ? mapN2ScoreToEquivalentLevel(avg, hasFullN2)
          : mapN3ScoreToEquivalentLevel(avg);

    return {
      level,
      averageScore: avg,
      source: 'tryout-packets',
      sourceLabel: `Try Out JLPT (${submittedPackets.length} paket · ${submittedPartsTotal} bagian)`,
      summaryText: `Rata-rata akurasi ${avg}% dari ${submittedPackets.length} paket Try Out yang dikumpulkan.`,
      completedPacketsCount: submittedPackets.length,
      submittedPartsTotal,
    };
  }

  if (latestReport) {
    const avg = Math.round(latestReport.average);
    const level: JlptLevel =
      avg >= 75 ? 'N2' : avg >= 50 ? 'N3' : avg >= 25 ? 'N4' : 'N5';
    return {
      level,
      averageScore: avg,
      source: 'mini-sim',
      sourceLabel: `Mini Simulasi N2 (${avg}%)`,
      summaryText: `Berdasarkan skor Mini Simulasi N2 (${latestReport.correctCount}/${latestReport.totalQuestions} benar).`,
      completedPacketsCount: 0,
      submittedPartsTotal: 0,
    };
  }

  return {
    level: null,
    averageScore: null,
    source: 'none',
    sourceLabel: 'Belum ada hasil Try Out',
    summaryText:
      'Kerjakan Try Out JLPT N3/N2/N1 atau Mini Simulasi untuk menghitung level JLPT setaramu.',
    completedPacketsCount: 0,
    submittedPartsTotal: 0,
  };
}
