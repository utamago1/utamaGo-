import type {
  FormProgressPageRef,
  TryOutPacketPartId,
} from './tryOutPacket';
import type {
  JlptN2MondaiBreakdown,
  JlptN2PacketPartSummary,
  JlptN2PacketScore,
  JlptN2PartScore,
  JlptN2PassStatus,
} from './jlptN2Scoring';

export const JLPT_N1_SECTION_MAX = 60;
export const JLPT_N1_SECTION_PASS_MIN = 19;
export const JLPT_N1_TOTAL_MAX = 180;
export const JLPT_N1_TOTAL_PASS_MIN = 100;

export const JLPT_N1_OFFICIAL_TIMING = {
  langAndReadingMinutes: 110,
  choukaiMinutes: 55,
  totalMinutes: 165,
} as const;

export type JlptN1MondaiBreakdown = JlptN2MondaiBreakdown;
export type JlptN1PartScore = JlptN2PartScore;
export type JlptN1PacketPartSummary = JlptN2PacketPartSummary;
export type JlptN1PacketScore = JlptN2PacketScore;
export type JlptN1PassStatus = JlptN2PassStatus;

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
 * Extracts the JLPT N1 Mondai number from a page title or id, with positional fallback:
 * - moji-bunpou: Mondai 1..7
 * - dokkai: Mondai 8..13
 * - choukai: Mondai 1..5
 */
export function extractJlptN1MondaiNumber(
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
    if (partId === 'dokkai' && parsed >= 1 && parsed <= 6) {
      return parsed + 7;
    }
    if (parsed > 0) {
      return parsed;
    }
  }

  if (partId === 'dokkai') {
    return 8 + gradablePageIndex;
  }
  return 1 + gradablePageIndex;
}

/**
 * Official JLPT N1 per-Mondai point weights (JLPT N1 估分方法):
 *
 * - 言語知識 (moji-bunpou, ref 56 pts -> ÷ 56 × 60):
 *     問題1 (6q) = 1 pt
 *     問題2 (7q) = 1 pt
 *     問題3 (6q) = 1 pt
 *     問題4 (6q) = 2 pts
 *     問題5 (10q) = 1 pt
 *     問題6 (5q) = 1 pt
 *     問題7 (5q) = 2 pts
 *
 * - 読解 (dokkai, ref 58 pts -> ÷ 58 × 60):
 *     問題8 (4q) = 2 pts
 *     問題9 (9q) = 2 pts
 *     問題10 (4q) = 3 pts
 *     問題11 (2q) = 2 pts
 *     問題12 (4q) = 3 pts
 *     問題13 (2q) = 2 pts
 *
 * - 聴解 (choukai, ref 56 pts -> ÷ 56 × 60):
 *     問題1 (5q) = 2 pts
 *     問題2 (6q) = 2 pts
 *     問題3 (5q) = 2 pts
 *     問題4 (12q) = 1 pt
 *     問題5 (4q) = 3 pts
 */
export function getJlptN1QuestionWeight(
  partId: TryOutPacketPartId,
  mondaiNumber: number,
): number {
  if (partId === 'moji-bunpou') {
    if (mondaiNumber === 4 || mondaiNumber === 7) return 2;
    return 1;
  }

  if (partId === 'dokkai') {
    if (mondaiNumber === 10 || mondaiNumber === 12) return 3;
    return 2;
  }

  // choukai
  if (mondaiNumber === 4) return 1;
  if (mondaiNumber === 5) return 3;
  return 2;
}

/**
 * Evaluates a single JLPT N1 section (`moji-bunpou`, `dokkai`, or `choukai`)
 * with official per-Mondai weights, scaling raw earned points onto 0–60
 * dynamically based on the packet's actual max raw points (ref: 56 / 58 / 56).
 */
export function evaluateJlptN1PartScore(
  partId: TryOutPacketPartId,
  pages: readonly FormProgressPageRef[],
  values: Record<string, string>,
): JlptN1PartScore {
  const meta = PART_META[partId];
  const mondaiBreakdown: JlptN1MondaiBreakdown[] = [];

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

    const mondaiNumber = extractJlptN1MondaiNumber(
      page,
      partId,
      gradablePageIndex,
    );
    gradablePageIndex += 1;

    const weight = getJlptN1QuestionWeight(partId, mondaiNumber);
    let mondaiCorrect = 0;

    for (const item of gradableChoices) {
      const selected = (values[item.id] ?? '').trim();
      if (selected && selected === item.correctAnswer) {
        mondaiCorrect += 1;
      }
    }

    const mondaiEarned = mondaiCorrect * weight;
    const mondaiMax = gradableChoices.length * weight;

    earnedRawPoints += mondaiEarned;
    maxRawPoints += mondaiMax;
    correctCount += mondaiCorrect;
    totalQuestions += gradableChoices.length;

    mondaiBreakdown.push({
      pageId: page.id,
      mondaiNumber,
      title: page.title || `問題${mondaiNumber}`,
      shortTitle: `問題${mondaiNumber}`,
      weightLabel: `×${weight} poin`,
      minWeight: weight,
      maxWeight: weight,
      correctCount: mondaiCorrect,
      totalQuestions: gradableChoices.length,
      earnedRawPoints: mondaiEarned,
      maxRawPoints: mondaiMax,
    });
  }

  const scaledScore =
    maxRawPoints > 0
      ? Math.min(
          JLPT_N1_SECTION_MAX,
          Math.max(
            0,
            Math.round((earnedRawPoints / maxRawPoints) * JLPT_N1_SECTION_MAX),
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
    maxScaledScore: JLPT_N1_SECTION_MAX,
    passingCutoff: JLPT_N1_SECTION_PASS_MIN,
    passedCutoff: scaledScore >= JLPT_N1_SECTION_PASS_MIN,
    earnedRawPoints,
    maxRawPoints,
    correctCount,
    totalQuestions,
    accuracyPercent,
    mondaiBreakdown,
  };
}

/**
 * Evaluates a full JLPT N1 packet across all 3 sections (`moji-bunpou`, `dokkai`, `choukai`):
 * - Total passing score: ≥ 100 / 180
 * - Every section passing cutoff: ≥ 19 / 60
 */
export function evaluateJlptN1PacketScore(params: {
  forms: Record<TryOutPacketPartId, readonly FormProgressPageRef[]>;
  answersByPart: Partial<Record<TryOutPacketPartId, Record<string, string>>>;
  submittedIds: readonly TryOutPacketPartId[];
}): JlptN1PacketScore {
  const { forms, answersByPart, submittedIds } = params;
  const partIds: TryOutPacketPartId[] = ['moji-bunpou', 'dokkai', 'choukai'];

  const parts = {} as Record<TryOutPacketPartId, JlptN1PacketPartSummary>;
  let totalScaledScore = 0;
  let submittedPartCount = 0;
  const failedCutoffs: TryOutPacketPartId[] = [];

  for (const partId of partIds) {
    const isSubmitted = submittedIds.includes(partId);
    const partScore = evaluateJlptN1PartScore(
      partId,
      forms[partId] ?? [],
      answersByPart[partId] ?? {},
    );
    parts[partId] = {
      ...partScore,
      isSubmitted,
      passedCutoff: isSubmitted && partScore.passedCutoff,
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
  let status: JlptN1PassStatus;
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
        ? 'Kumpulkan ketiga bagian (Moji-Bunpou, Dokkai, Choukai) untuk menghitung estimasi skor total N1 (/180) dan status kelulusan (≥ 100).'
        : `Skor sementara ${totalScaledScore}/180 dari ${submittedPartCount} bagian. Selesaikan ${3 - submittedPartCount} bagian tersisa untuk penentuan lulus N1.`;
  } else if (failedCutoffs.length > 0) {
    status = 'failed-cutoff';
    const failedNames = failedCutoffs
      .map((id) => `${PART_META[id].label} (${parts[id].scaledScore}/60)`)
      .join(', ');
    statusLabel = 'Belum Lulus · Di Bawah Ambang Bagian';
    statusDetail = `Meskipun total skor ${totalScaledScore}/180, bagian ${failedNames} belum mencapai batas minimum ${JLPT_N1_SECTION_PASS_MIN}/60.`;
  } else if (totalScaledScore < JLPT_N1_TOTAL_PASS_MIN) {
    status = 'failed-total';
    statusLabel = `Belum Lulus · Total di Bawah ${JLPT_N1_TOTAL_PASS_MIN}`;
    statusDetail = `Semua bagian sudah memenuhi ambang ≥ ${JLPT_N1_SECTION_PASS_MIN}/60, tetapi total skor ${totalScaledScore}/180 masih kurang ${JLPT_N1_TOTAL_PASS_MIN - totalScaledScore} poin dari batas lulus ${JLPT_N1_TOTAL_PASS_MIN}/180.`;
  } else {
    status = 'passed';
    statusLabel = 'Lulus Estimasi JLPT N1';
    statusDetail = `Total skor ${totalScaledScore}/180 (≥ ${JLPT_N1_TOTAL_PASS_MIN}) dan seluruh 3 bagian memenuhi ambang minimum ≥ ${JLPT_N1_SECTION_PASS_MIN}/60.`;
  }

  return {
    totalScaledScore,
    maxTotalScore: JLPT_N1_TOTAL_MAX,
    passingTotal: JLPT_N1_TOTAL_PASS_MIN,
    passingSectionCutoff: JLPT_N1_SECTION_PASS_MIN,
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
