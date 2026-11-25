import type {
  FormProgressPageRef,
  TryOutFormValues,
  TryOutPacketPartId,
} from './tryOutPacket';
import type {
  JlptN2MondaiBreakdown,
  JlptN2PacketPartSummary,
  JlptN2PacketScore,
  JlptN2PartScore,
} from './jlptN2Scoring';

export const JLPT_N3_TOTAL_MAX = 180;
export const JLPT_N3_TOTAL_PASS_MIN = 95;
export const JLPT_N3_SECTION_MAX = 60;
export const JLPT_N3_SECTION_PASS_MIN = 19;

export const JLPT_N3_OFFICIAL_TIMING = {
  mojiGoiMinutes: 30,
  bunpouDokkaiMinutes: 70,
  choukaiMinutes: 40,
  totalMinutes: 140,
} as const;

export type JlptN3MondaiBreakdown = JlptN2MondaiBreakdown;
export type JlptN3PartScore = JlptN2PartScore;
export type JlptN3PacketPartSummary = JlptN2PacketPartSummary;
export type JlptN3PacketScore = JlptN2PacketScore;

interface MondaiWeightRule {
  weight: number;
  label: string;
}

const N3_SCORING_SECTION_LABELS: Record<
  TryOutPacketPartId,
  { partLabel: string; japaneseLabel: string }
> = {
  'moji-bunpou': {
    partLabel: 'Moji-Goi + Bunpou',
    japaneseLabel: '言語知識',
  },
  dokkai: {
    partLabel: 'Dokkai',
    japaneseLabel: '読解',
  },
  choukai: {
    partLabel: 'Choukai',
    japaneseLabel: '聴解',
  },
};

export function isN3BunpouPage(page: FormProgressPageRef): boolean {
  return /-mb-page-[678]$/.test(page.id) || /文法|bunpou/i.test(page.title);
}

/**
 * Official JLPT N3 Mondai weights (JLPT估分方法):
 * - 言語知識 (Moji-Goi 問題1–5 = 35q × 1 pt + Bunpou 問題1–3 = 23q × 1 pt) => 58 pts -> ÷ 58 × 60
 * - 読解 (Dokkai 問題4 = 4q × 3 pts, 問題5 = 6q × 4 pts, 問題6 = 4q × 4 pts, 問題7 = 2q × 4 pts) => 60 pts -> ÷ 60 × 60
 * - 聴解 (Choukai 問題1–5 = 6+6+3+4+9 = 28q × 2 pts) => 56 pts -> ÷ 56 × 60
 */
function resolveN3MondaiWeightRule(
  section: 'moji-bunpou' | 'dokkai' | 'choukai',
  page: FormProgressPageRef,
  gradableIndex: number,
): MondaiWeightRule {
  const title = page.title ?? '';

  if (section === 'moji-bunpou') {
    // Every Moji-Goi (問題1–5) & Bunpou (問題1–3) question carries 1 pt (total 35 + 23 = 58 pts)
    return { weight: 1, label: '×1 poin' };
  }

  if (section === 'dokkai') {
    // Dokkai 問題4 (短文 4q ×3 = 12), 問題5 (中文 6q ×4 = 24), 問題6 (長文 4q ×4 = 16), 問題7 (情報検索 2q ×4 = 8) = 60 pts
    if (/問題\s*4|短文|pendek/i.test(title) || /-dk-page-4$/.test(page.id)) {
      return { weight: 3, label: '×3 poin' };
    }
    if (gradableIndex === 0 && !/問題\s*[567]/.test(title)) {
      return { weight: 3, label: '×3 poin' };
    }
    return { weight: 4, label: '×4 poin' };
  }

  // Choukai 問題1–5: every question carries 2 pts (total 28 × 2 = 56 pts, or 27 × 2 = 54 pts)
  return { weight: 2, label: '×2 poin' };
}

function extractMondaiNumber(title: string, fallbackIndex: number): number {
  const match = /(?:問題|Mondai)\s*(\d+)/i.exec(title);
  if (match) {
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallbackIndex + 1;
}

function buildShortTitle(title: string, mondaiNumber: number): string {
  const cleaned = title.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 36) return cleaned;
  return `Mondai ${mondaiNumber} · ${cleaned.slice(0, 26)}…`;
}

function scoreN3PageEntries(
  section: 'moji-bunpou' | 'dokkai' | 'choukai',
  entries: ReadonlyArray<{
    page: FormProgressPageRef;
    values: TryOutFormValues;
  }>,
  overrideLabels?: { partLabel: string; japaneseLabel: string },
): JlptN3PartScore {
  const labels = overrideLabels ?? N3_SCORING_SECTION_LABELS[section];
  const mondaiBreakdown: JlptN3MondaiBreakdown[] = [];

  let totalQuestions = 0;
  let correctCount = 0;
  let earnedRawPoints = 0;
  let maxRawPoints = 0;
  let gradablePageIdx = 0;

  for (const { page, values } of entries) {
    const gradableChoices = page.items.filter(
      (item) => item.kind === 'choice' && Boolean(item.correctAnswer),
    );
    if (gradableChoices.length === 0) continue;

    const rule = resolveN3MondaiWeightRule(section, page, gradablePageIdx);
    const mondaiNumber = extractMondaiNumber(page.title, gradablePageIdx);
    gradablePageIdx += 1;

    let pageCorrect = 0;
    for (const item of gradableChoices) {
      const chosen = (values[item.id] ?? '').trim();
      if (chosen && chosen === item.correctAnswer) {
        pageCorrect += 1;
      }
    }

    const pageEarned = pageCorrect * rule.weight;
    const pageMax = gradableChoices.length * rule.weight;

    totalQuestions += gradableChoices.length;
    correctCount += pageCorrect;
    earnedRawPoints += pageEarned;
    maxRawPoints += pageMax;

    mondaiBreakdown.push({
      pageId: page.id,
      mondaiNumber,
      title: page.title,
      shortTitle: buildShortTitle(page.title, mondaiNumber),
      weightLabel: rule.label,
      minWeight: rule.weight,
      maxWeight: rule.weight,
      correctCount: pageCorrect,
      totalQuestions: gradableChoices.length,
      earnedRawPoints: pageEarned,
      maxRawPoints: pageMax,
    });
  }

  const scaledScore =
    maxRawPoints > 0
      ? Math.min(
          JLPT_N3_SECTION_MAX,
          Math.max(
            0,
            Math.round((earnedRawPoints / maxRawPoints) * JLPT_N3_SECTION_MAX),
          ),
        )
      : 0;

  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return {
    partId: section,
    partLabel: labels.partLabel,
    japaneseLabel: labels.japaneseLabel,
    scaledScore,
    maxScaledScore: JLPT_N3_SECTION_MAX,
    passingCutoff: JLPT_N3_SECTION_PASS_MIN,
    passedCutoff: scaledScore >= JLPT_N3_SECTION_PASS_MIN,
    earnedRawPoints,
    maxRawPoints,
    correctCount,
    totalQuestions,
    accuracyPercent,
    mondaiBreakdown,
  };
}

/**
 * Evaluates a single JLPT N3 exam session for the in-runner result view:
 * - 'moji-bunpou' (Session 1: Moji-Goi · 30 min): scores Moji-Goi Mondai 1–5 (35 × 1 pt)
 * - 'dokkai' (Session 2: Bunpou & Dokkai · 70 min): scores Dokkai Mondai 4–7 (60 pts -> /60)
 *   for the official Dokkai score, while Bunpou Mondai 1–3 can be inspected via
 *   `evaluateJlptN3SessionBunpouSupplement`.
 * - 'choukai' (Session 3: Choukai · 40 min): scores Choukai Mondai 1–5 (28 × 2 = 56 pts -> /60)
 */
export function evaluateJlptN3PartScore(
  partId: TryOutPacketPartId,
  pages: readonly FormProgressPageRef[],
  values: TryOutFormValues,
): JlptN3PartScore {
  if (partId === 'moji-bunpou') {
    const hasBunpou = pages.some((pg) => isN3BunpouPage(pg));
    return scoreN3PageEntries(
      'moji-bunpou',
      pages.map((page) => ({ page, values })),
      hasBunpou
        ? N3_SCORING_SECTION_LABELS['moji-bunpou']
        : { partLabel: 'Moji-Goi', japaneseLabel: '文字・語彙' },
    );
  }

  if (partId === 'dokkai') {
    const dokkaiOnlyPages = pages.filter((pg) => !isN3BunpouPage(pg));
    return scoreN3PageEntries(
      'dokkai',
      dokkaiOnlyPages.map((page) => ({ page, values })),
      N3_SCORING_SECTION_LABELS.dokkai,
    );
  }

  return scoreN3PageEntries(
    'choukai',
    pages.map((page) => ({ page, values })),
    N3_SCORING_SECTION_LABELS.choukai,
  );
}

/**
 * Extracts the Bunpou (文法 問題1–3 · 23 × 1 pt) breakdown embedded inside Session 2 (Bunpou & Dokkai),
 * so TryOutFormRunner can display both the Dokkai official score (/60) and the Bunpou raw points (/23).
 */
export function evaluateJlptN3SessionBunpouSupplement(
  pages: readonly FormProgressPageRef[],
  values: TryOutFormValues,
): JlptN3PartScore | null {
  const bunpouPages = pages.filter((pg) => isN3BunpouPage(pg));
  if (bunpouPages.length === 0) return null;
  return scoreN3PageEntries(
    'moji-bunpou',
    bunpouPages.map((page) => ({ page, values })),
    { partLabel: 'Bunpou (Bagian 言語知識)', japaneseLabel: '文法' },
  );
}

/**
 * Computes the official 3-section JLPT N3 score (0–180):
 *   1. 言語知識 (Moji-Goi 35 pts + Bunpou 23 pts = 58 pts -> ÷ 58 × 60, pass ≥ 19)
 *      Note: Moji-Goi is taken in Session 1 (30m) and Bunpou is taken in Session 2 (70m).
 *   2. 読解 (Dokkai M4 ×3 + M5–M7 ×4 = 60 pts -> ÷ 60 × 60, pass ≥ 19)
 *   3. 聴解 (Choukai M1–M5 ×2 = 56 pts -> ÷ 56 × 60, pass ≥ 19)
 * Overall pass: Total ≥ 95/180 AND every section ≥ 19/60.
 */
export function evaluateJlptN3PacketScore(params: {
  forms: Record<TryOutPacketPartId, readonly FormProgressPageRef[]>;
  answersByPart: Record<TryOutPacketPartId, TryOutFormValues>;
  submittedIds: readonly TryOutPacketPartId[];
}): JlptN3PacketScore {
  const session1Pages = params.forms['moji-bunpou'] ?? [];
  const session2Pages = params.forms.dokkai ?? [];
  const session3Pages = params.forms.choukai ?? [];

  const session1Values = params.answersByPart['moji-bunpou'] ?? {};
  const session2Values = params.answersByPart.dokkai ?? {};
  const session3Values = params.answersByPart.choukai ?? {};

  const session1Submitted = params.submittedIds.includes('moji-bunpou');
  const session2Submitted = params.submittedIds.includes('dokkai');
  const session3Submitted = params.submittedIds.includes('choukai');

  const bunpouPagesInSession2 = session2Pages.filter((pg) => isN3BunpouPage(pg));
  const dokkaiPagesInSession2 = session2Pages.filter((pg) => !isN3BunpouPage(pg));

  // Section 1 (言語知識): Moji-Goi (Session 1) + Bunpou (Session 2)
  const langKnowledgeEntries = [
    ...session1Pages.map((page) => ({ page, values: session1Values })),
    ...bunpouPagesInSession2.map((page) => ({ page, values: session2Values })),
  ];
  const langKnowledgeSubmitted =
    bunpouPagesInSession2.length > 0
      ? session1Submitted && session2Submitted
      : session1Submitted;
  const langKnowledgeScore = scoreN3PageEntries(
    'moji-bunpou',
    langKnowledgeEntries,
    N3_SCORING_SECTION_LABELS['moji-bunpou'],
  );

  // Section 2 (読解): Dokkai pages from Session 2
  const dokkaiScore = scoreN3PageEntries(
    'dokkai',
    dokkaiPagesInSession2.map((page) => ({ page, values: session2Values })),
    N3_SCORING_SECTION_LABELS.dokkai,
  );

  // Section 3 (聴解): Choukai pages from Session 3
  const choukaiScore = scoreN3PageEntries(
    'choukai',
    session3Pages.map((page) => ({ page, values: session3Values })),
    N3_SCORING_SECTION_LABELS.choukai,
  );

  const parts: Record<TryOutPacketPartId, JlptN3PacketPartSummary> = {
    'moji-bunpou': {
      ...langKnowledgeScore,
      isSubmitted: langKnowledgeSubmitted,
      passedCutoff: langKnowledgeSubmitted && langKnowledgeScore.passedCutoff,
    },
    dokkai: {
      ...dokkaiScore,
      isSubmitted: session2Submitted,
      passedCutoff: session2Submitted && dokkaiScore.passedCutoff,
    },
    choukai: {
      ...choukaiScore,
      isSubmitted: session3Submitted,
      passedCutoff: session3Submitted && choukaiScore.passedCutoff,
    },
  };

  const partOrder: TryOutPacketPartId[] = ['moji-bunpou', 'dokkai', 'choukai'];
  let submittedScoringSections = 0;
  let totalScaledScore = 0;

  for (const id of partOrder) {
    if (parts[id].isSubmitted) {
      submittedScoringSections += 1;
      totalScaledScore += parts[id].scaledScore;
    }
  }

  const submittedSessionCount = [
    session1Submitted,
    session2Submitted,
    session3Submitted,
  ].filter(Boolean).length;
  const isComplete = submittedScoringSections === 3;
  const failedCutoffs = partOrder.filter(
    (id) => parts[id].isSubmitted && !parts[id].passedCutoff,
  );
  const failedCutoffLabels = failedCutoffs.map((id) => parts[id].partLabel);

  const passedTotal = isComplete && totalScaledScore >= JLPT_N3_TOTAL_PASS_MIN;
  const passedAllCutoffs = isComplete && failedCutoffs.length === 0;

  if (!isComplete) {
    const remainingSessions = 3 - submittedSessionCount;
    return {
      totalScaledScore,
      maxTotalScore: JLPT_N3_TOTAL_MAX,
      passingTotal: JLPT_N3_TOTAL_PASS_MIN,
      passingSectionCutoff: JLPT_N3_SECTION_PASS_MIN,
      submittedPartCount: submittedScoringSections,
      isComplete: false,
      status: 'in-progress',
      isPassed: false,
      failedCutoffs,
      statusLabel:
        submittedSessionCount === 0
          ? 'Belum Ada Sesi Terkumpul'
          : submittedScoringSections === 0
            ? `Sesi 1 Terkumpul (${submittedSessionCount}/3 Sesi)`
            : `Sementara ${totalScaledScore}/180 (${submittedScoringSections}/3 Skor Bagian)`,
      statusDetail:
        submittedSessionCount === 0
          ? 'Kerjakan 3 sesi resmi JLPT N3: Moji-Goi (30 mnt), Bunpou & Dokkai (70 mnt), dan Choukai (40 mnt) untuk menghitung skor 0–180 (Lulus ≥ 95).'
          : !langKnowledgeSubmitted && (session1Submitted || session2Submitted)
            ? `Selesaikan ${remainingSessions} sesi tersisa — nilai 言語知識 (Moji-Goi + Bunpou · ÷58×60) dihitung otomatis setelah Moji-Goi dan Bunpou & Dokkai keduanya dikumpulkan.`
            : `Selesaikan ${remainingSessions} sesi tersisa untuk menentukan kelulusan JLPT N3 (total ≥ 95/180 dan tiap bagian ≥ 19/60).`,
      parts,
    };
  }

  if (passedTotal && passedAllCutoffs) {
    return {
      totalScaledScore,
      maxTotalScore: JLPT_N3_TOTAL_MAX,
      passingTotal: JLPT_N3_TOTAL_PASS_MIN,
      passingSectionCutoff: JLPT_N3_SECTION_PASS_MIN,
      submittedPartCount: 3,
      isComplete: true,
      status: 'passed',
      isPassed: true,
      failedCutoffs: [],
      statusLabel: `Estimasi Lulus JLPT N3 (${totalScaledScore}/180)`,
      statusDetail:
        'Total skor memenuhi ambang kelulusan ≥ 95/180 dan seluruh 3 bagian penilaian (言語知識, 読解, 聴解) memenuhi ambang minimum ≥ 19/60.',
      parts,
    };
  }

  if (passedTotal && !passedAllCutoffs) {
    return {
      totalScaledScore,
      maxTotalScore: JLPT_N3_TOTAL_MAX,
      passingTotal: JLPT_N3_TOTAL_PASS_MIN,
      passingSectionCutoff: JLPT_N3_SECTION_PASS_MIN,
      submittedPartCount: 3,
      isComplete: true,
      status: 'failed-cutoff',
      isPassed: false,
      failedCutoffs,
      statusLabel: `Belum Lulus — Nilai Bagian < 19 (${totalScaledScore}/180)`,
      statusDetail: `Total skor sudah ≥ 95, namun bagian ${failedCutoffLabels.join(' & ')} masih di bawah ambang minimum 19/60.`,
      parts,
    };
  }

  const gap = JLPT_N3_TOTAL_PASS_MIN - totalScaledScore;
  return {
    totalScaledScore,
    maxTotalScore: JLPT_N3_TOTAL_MAX,
    passingTotal: JLPT_N3_TOTAL_PASS_MIN,
    passingSectionCutoff: JLPT_N3_SECTION_PASS_MIN,
    submittedPartCount: 3,
    isComplete: true,
    status: 'failed-total',
    isPassed: false,
    failedCutoffs,
    statusLabel: `Belum Lulus JLPT N3 (${totalScaledScore}/180)`,
    statusDetail:
      failedCutoffLabels.length > 0
        ? `Butuh +${gap} poin lagi untuk mencapai 95/180, serta tingkatkan ${failedCutoffLabels.join(' & ')} agar ≥ 19/60.`
        : `Seluruh bagian sudah ≥ 19/60, butuh +${gap} poin lagi untuk mencapai batas lulus 95/180.`,
    parts,
  };
}
