import type {
  FormProgressPageRef,
  TryOutPacketPartId,
} from './tryOutPacket';

export const JLPT_N2_SECTION_MAX = 60;
export const JLPT_N2_SECTION_PASS_MIN = 19;
export const JLPT_N2_TOTAL_MAX = 180;
export const JLPT_N2_TOTAL_PASS_MIN = 90;

export interface JlptN2MondaiBreakdown {
  pageId: string;
  mondaiNumber: number;
  title: string;
  shortTitle: string;
  weightLabel: string;
  minWeight: number;
  maxWeight: number;
  correctCount: number;
  totalQuestions: number;
  earnedRawPoints: number;
  maxRawPoints: number;
}

export interface JlptN2PartScore {
  partId: TryOutPacketPartId;
  partLabel: string;
  japaneseLabel: string;
  scaledScore: number;
  maxScaledScore: number;
  passingCutoff: number;
  passedCutoff: boolean;
  earnedRawPoints: number;
  maxRawPoints: number;
  correctCount: number;
  totalQuestions: number;
  accuracyPercent: number;
  mondaiBreakdown: JlptN2MondaiBreakdown[];
}

export type JlptN2PassStatus =
  | 'passed'
  | 'failed-cutoff'
  | 'failed-total'
  | 'in-progress';

export interface JlptN2PacketPartSummary extends JlptN2PartScore {
  isSubmitted: boolean;
}

export interface JlptN2PacketScore {
  totalScaledScore: number;
  maxTotalScore: number;
  passingTotal: number;
  passingSectionCutoff: number;
  submittedPartCount: number;
  isComplete: boolean;
  status: JlptN2PassStatus;
  isPassed: boolean;
  failedCutoffs: TryOutPacketPartId[];
  statusLabel: string;
  statusDetail: string;
  parts: Record<TryOutPacketPartId, JlptN2PacketPartSummary>;
}

const PART_META: Record<
  TryOutPacketPartId,
  { label: string; japaneseLabel: string }
> = {
  'moji-bunpou': {
    label: 'Moji-Goi & Bunpou',
    japaneseLabel: '言語知識',
  },
  dokkai: {
    label: 'Dokkai',
    japaneseLabel: '読解',
  },
  choukai: {
    label: 'Choukai',
    japaneseLabel: '聴解',
  },
};

function normalizeFullWidthDigits(text: string): string {
  return text.replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
}

/**
 * Extracts the JLPT N2 Mondai number from a page title or id, with positional fallback.
 * - moji-bunpou: Mondai 1..9
 * - dokkai: Mondai 10..14
 * - choukai: Mondai 1..5
 */
export function extractJlptN2MondaiNumber(
  page: Pick<FormProgressPageRef, 'id' | 'title'>,
  partId: TryOutPacketPartId,
  gradablePageIndex: number,
): number {
  const normalizedTitle = normalizeFullWidthDigits(page.title ?? '');
  const titleMatch = normalizedTitle.match(/(?:問題|问题|mondai)\s*(\d+)/i);
  if (titleMatch) {
    return Number(titleMatch[1]);
  }

  const idMatch = page.id.match(/(?:page|mondai|m)[-_]?(\d+)$/i);
  if (idMatch) {
    const parsed = Number(idMatch[1]);
    if (partId === 'dokkai' && parsed >= 1 && parsed <= 5) {
      return parsed + 9;
    }
    if (parsed > 0) {
      return parsed;
    }
  }

  if (partId === 'dokkai') {
    return 10 + gradablePageIndex;
  }
  return 1 + gradablePageIndex;
}

/**
 * Returns the raw point weight of a single JLPT N2 question based on the
 * official JLPT N2 estimation rubric (JLPT N2 估分方法), dynamically adapting
 * Mondai 11's 2pt/3pt split to whatever question count the packet actually has.
 *
 * Weights:
 * - 言語知識 (moji-bunpou): M1..M5 = 1, M6 = 2, M7..M9 = 1
 * - 読解 (dokkai): M10 = 2, M11 = first ~2/3 are 2pt & last ~1/3 are 3pt
 *   (exact 6×2pt + 3×3pt when 9 questions), M12 = 3, M13 = 4, M14 = 4
 * - 聴解 (choukai): M1 = 2, M2 = 2, M3 = 2, M4 = 1, M5 = 3
 */
export function getJlptN2QuestionWeight(
  partId: TryOutPacketPartId,
  mondaiNumber: number,
  questionIndexInMondai: number,
  totalQuestionsInMondai: number,
): number {
  if (partId === 'moji-bunpou') {
    if (mondaiNumber === 6) return 2;
    return 1;
  }

  if (partId === 'dokkai') {
    if (mondaiNumber === 10) return 2;
    if (mondaiNumber === 11) {
      // Reference N2 Dokkai Mondai 11 has 9 questions: 6×2pt (first 2 passages) + 3×3pt (last passage).
      // For any packet with a different question count, allocate the last ~1/3 to 3pt.
      const highWeightCount =
        totalQuestionsInMondai >= 3 ? Math.round(totalQuestionsInMondai / 3) : 0;
      const splitIndex = Math.max(0, totalQuestionsInMondai - highWeightCount);
      return questionIndexInMondai >= splitIndex ? 3 : 2;
    }
    if (mondaiNumber === 12) return 3;
    if (mondaiNumber === 13 || mondaiNumber === 14) return 4;
    return 2;
  }

  // choukai
  if (mondaiNumber === 1 || mondaiNumber === 2 || mondaiNumber === 3) return 2;
  if (mondaiNumber === 4) return 1;
  if (mondaiNumber === 5) return 3;
  return 2;
}

/**
 * Evaluates a single JLPT N2 section (`moji-bunpou`, `dokkai`, or `choukai`)
 * with per-Mondai point weights and dynamic normalization onto the 0–60 scale
 * based on the actual total raw points present in `pages`.
 */
export function evaluateJlptN2PartScore(
  partId: TryOutPacketPartId,
  pages: FormProgressPageRef[],
  values: Record<string, string>,
): JlptN2PartScore {
  const meta = PART_META[partId];
  const mondaiBreakdown: JlptN2MondaiBreakdown[] = [];

  let earnedRawPoints = 0;
  let maxRawPoints = 0;
  let correctCount = 0;
  let totalQuestions = 0;
  let gradablePageIndex = 0;

  for (const page of pages) {
    const gradableChoices = page.items.filter(
      (item) => item.kind === 'choice' && Boolean(item.correctAnswer),
    );
    if (gradableChoices.length === 0) continue;

    const mondaiNumber = extractJlptN2MondaiNumber(
      page,
      partId,
      gradablePageIndex,
    );
    gradablePageIndex += 1;

    let mondaiEarned = 0;
    let mondaiMax = 0;
    let mondaiCorrect = 0;
    let minWeight = Number.POSITIVE_INFINITY;
    let maxWeight = 0;

    gradableChoices.forEach((item, idx) => {
      const weight = getJlptN2QuestionWeight(
        partId,
        mondaiNumber,
        idx,
        gradableChoices.length,
      );
      if (weight < minWeight) minWeight = weight;
      if (weight > maxWeight) maxWeight = weight;

      mondaiMax += weight;
      maxRawPoints += weight;
      totalQuestions += 1;

      const selected = (values[item.id] ?? '').trim();
      if (selected && selected === item.correctAnswer) {
        mondaiEarned += weight;
        earnedRawPoints += weight;
        mondaiCorrect += 1;
        correctCount += 1;
      }
    });

    const resolvedMin = Number.isFinite(minWeight) ? minWeight : 1;
    const resolvedMax = maxWeight > 0 ? maxWeight : resolvedMin;
    const weightLabel =
      resolvedMin === resolvedMax
        ? `${resolvedMin} poin`
        : `${resolvedMin}–${resolvedMax} poin`;

    mondaiBreakdown.push({
      pageId: page.id,
      mondaiNumber,
      title: page.title || `問題${mondaiNumber}`,
      shortTitle: `問題${mondaiNumber}`,
      weightLabel,
      minWeight: resolvedMin,
      maxWeight: resolvedMax,
      correctCount: mondaiCorrect,
      totalQuestions: gradableChoices.length,
      earnedRawPoints: mondaiEarned,
      maxRawPoints: mondaiMax,
    });
  }

  const scaledScore =
    maxRawPoints > 0
      ? Math.min(
          JLPT_N2_SECTION_MAX,
          Math.max(
            0,
            Math.round((earnedRawPoints / maxRawPoints) * JLPT_N2_SECTION_MAX),
          ),
        )
      : 0;

  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return {
    partId,
    partLabel: meta.label,
    japaneseLabel: meta.japaneseLabel,
    scaledScore,
    maxScaledScore: JLPT_N2_SECTION_MAX,
    passingCutoff: JLPT_N2_SECTION_PASS_MIN,
    passedCutoff: scaledScore >= JLPT_N2_SECTION_PASS_MIN,
    earnedRawPoints,
    maxRawPoints,
    correctCount,
    totalQuestions,
    accuracyPercent,
    mondaiBreakdown,
  };
}

/**
 * Evaluates a full JLPT N2 packet across all 3 sections (`moji-bunpou`, `dokkai`, `choukai`),
 * computing the 0–180 scaled total and checking both pass thresholds:
 * - Total >= 90 / 180
 * - Every section >= 19 / 60
 */
export function evaluateJlptN2PacketScore(params: {
  forms: Record<TryOutPacketPartId, FormProgressPageRef[]>;
  answersByPart: Partial<Record<TryOutPacketPartId, Record<string, string>>>;
  submittedIds: TryOutPacketPartId[];
}): JlptN2PacketScore {
  const { forms, answersByPart, submittedIds } = params;
  const partIds: TryOutPacketPartId[] = ['moji-bunpou', 'dokkai', 'choukai'];

  const parts = {} as Record<TryOutPacketPartId, JlptN2PacketPartSummary>;
  let totalScaledScore = 0;
  let submittedPartCount = 0;
  const failedCutoffs: TryOutPacketPartId[] = [];

  for (const partId of partIds) {
    const isSubmitted = submittedIds.includes(partId);
    const partScore = evaluateJlptN2PartScore(
      partId,
      forms[partId] ?? [],
      answersByPart[partId] ?? {},
    );
    parts[partId] = {
      ...partScore,
      isSubmitted,
    };

    if (isSubmitted) {
      submittedPartCount += 1;
      totalScaledScore += partScore.scaledScore;
      if (!partScore.passedCutoff) {
        failedCutoffs.push(partId);
      }
    }
  }

  const isComplete = submittedPartCount === partIds.length;
  let status: JlptN2PassStatus;
  let statusLabel: string;
  let statusDetail: string;

  if (!isComplete) {
    status = 'in-progress';
    statusLabel =
      submittedPartCount === 0
        ? 'Belum Ada Bagian Dikumpulkan'
        : `Progres Sementara (${submittedPartCount}/3 Bagian)`;
    statusDetail =
      submittedPartCount === 0
        ? 'Kumpulkan ketiga bagian (Moji-Bunpou, Dokkai, Choukai) untuk menghitung estimasi skor total N2 (/180) dan status kelulusan.'
        : `Skor sementara ${totalScaledScore}/180 dari ${submittedPartCount} bagian. Selesaikan ${3 - submittedPartCount} bagian tersisa untuk penentuan lulus N2.`;
  } else if (failedCutoffs.length > 0) {
    status = 'failed-cutoff';
    const failedNames = failedCutoffs
      .map((id) => `${PART_META[id].label} (${parts[id].scaledScore}/60)`)
      .join(', ');
    statusLabel = 'Belum Lulus · Di Bawah Ambang Bagian';
    statusDetail = `Meskipun total skor ${totalScaledScore}/180, bagian ${failedNames} belum mencapai batas minimum ${JLPT_N2_SECTION_PASS_MIN}/60.`;
  } else if (totalScaledScore < JLPT_N2_TOTAL_PASS_MIN) {
    status = 'failed-total';
    statusLabel = 'Belum Lulus · Total di Bawah 90';
    statusDetail = `Semua bagian sudah memenuhi ambang ≥ ${JLPT_N2_SECTION_PASS_MIN}/60, tetapi total skor ${totalScaledScore}/180 masih kurang ${JLPT_N2_TOTAL_PASS_MIN - totalScaledScore} poin dari batas lulus ${JLPT_N2_TOTAL_PASS_MIN}/180.`;
  } else {
    status = 'passed';
    statusLabel = 'Lulus Estimasi JLPT N2';
    statusDetail = `Total skor ${totalScaledScore}/180 (≥ ${JLPT_N2_TOTAL_PASS_MIN}) dan seluruh 3 bagian memenuhi ambang minimum ≥ ${JLPT_N2_SECTION_PASS_MIN}/60.`;
  }

  return {
    totalScaledScore,
    maxTotalScore: JLPT_N2_TOTAL_MAX,
    passingTotal: JLPT_N2_TOTAL_PASS_MIN,
    passingSectionCutoff: JLPT_N2_SECTION_PASS_MIN,
    submittedPartCount,
    isComplete,
    status,
    isPassed: status === 'passed',
    failedCutoffs,
    statusLabel,
    statusDetail,
    parts,
  };
}
