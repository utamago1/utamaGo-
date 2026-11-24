import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Headphones,
  Lock,
  Zap,
} from 'lucide-react';
import {
  getTryOutPacketChoukaiTranscript,
  getTryOutPacketForms,
} from '../data/tryOutN2AllPackets';
import { SAMPLE_N3_REPORT } from '../data/utamagoContent';
import { vibrateError, vibrateSuccess, vibrateTap } from '../utils/haptics';
import {
  evaluateJlptN2PacketScore,
  JLPT_N2_SECTION_MAX,
  JLPT_N2_SECTION_PASS_MIN,
  JLPT_N2_TOTAL_MAX,
  JLPT_N2_TOTAL_PASS_MIN,
} from '../utils/jlptN2Scoring';
import type { ComputedTryOutReport } from '../utils/jlptReport';
import type { StoredTryOutPacketState } from '../utils/storage';
import {
  ALL_TRYOUT_PACKETS,
  evaluatePartFormProgress,
  evaluatePartScore,
  getTryOutPacketById,
  getTryOutPacketParts,
  getTryOutPacketsByLevel,
  isTryOutPacketUnlocked,
  TRYOUT_N1_PACKETS,
  TRYOUT_N2_PACKETS,
  TRYOUT_N3_PACKETS,
  type TryOutFormValues,
  type TryOutLevelOption,
  type TryOutPacketPartId,
} from '../utils/tryOutPacket';
import {
  buildTryOutPacketChartSeries,
  type EquivalentJlptEstimate,
} from '../utils/tryOutAnalytics';
import { ChoukaiAudioPlayer } from './ChoukaiAudioPlayer';
import { ChoukaiTranscriptPanel } from './ChoukaiTranscriptPanel';
import { TryOutComparisonChart } from './TryOutComparisonChart';
import { TryOutFormRunner } from './TryOutFormRunner';

export type ReportTab = 'n2-official' | 'chart' | 'mini-sim' | 'sample';

interface ReportAndSimSectionProps {
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
  selectedLevel: TryOutLevelOption | null;
  onSelectedLevelChange: (level: TryOutLevelOption | null) => void;
  selectedPacketId: string;
  onSelectPacket: (packetId: string) => void;
  packetOpened: boolean;
  onPacketOpenedChange: (open: boolean) => void;
  activeFormPartId: TryOutPacketPartId | null;
  onActiveFormPartChange: (partId: TryOutPacketPartId | null) => void;
  completedFirstPacketParts: TryOutPacketPartId[];
  packetsProgress: Record<string, StoredTryOutPacketState>;
  completedPacketParts: TryOutPacketPartId[];
  formAnswersByPart: Record<TryOutPacketPartId, TryOutFormValues>;
  submittedParts: TryOutPacketPartId[];
  tryoutTimers: Record<TryOutPacketPartId, number>;
  tryoutFlaggedIds: Record<TryOutPacketPartId, string[]>;
  choukaiAudio: { currentTime: number; playbackRate: number };
  closeSheetSignal?: number;
  onSheetViewerOpenChange?: (open: boolean) => void;
  latestReport: ComputedTryOutReport | null;
  equivalentEstimate: EquivalentJlptEstimate;
  fallbackFirstPacket: StoredTryOutPacketState;
  onChangePartAnswer: (
    partId: TryOutPacketPartId,
    fieldId: string,
    value: string,
  ) => void;
  onTogglePartFlag: (partId: TryOutPacketPartId, itemId: string) => void;
  onPartElapsedChange: (partId: TryOutPacketPartId, seconds: number) => void;
  onAudioStateChange: (state: {
    currentTime: number;
    playbackRate: number;
  }) => void;
  onSubmitPartForm: (partId: TryOutPacketPartId) => void;
  onReopenPartForm: (partId: TryOutPacketPartId) => void;
  onResetPartForm: (partId: TryOutPacketPartId) => void;
  onTogglePacketPart: (partId: TryOutPacketPartId) => void;
  onReportCompleted: (report: ComputedTryOutReport) => void;
  onNavigateAnki: () => void;
  onNavigateLearn: () => void;
}

function getScoreBarTone(score: number): {
  barClass: string;
  label: string;
  textClass: string;
} {
  if (score >= 70) {
    return {
      barClass: 'bg-success',
      label: 'Kuat',
      textClass: 'text-success',
    };
  }
  if (score >= 55) {
    return {
      barClass: 'bg-warning',
      label: 'Cukup',
      textClass: 'text-warning',
    };
  }
  return {
    barClass: 'bg-primary',
    label: 'Prioritas Latihan',
    textClass: 'text-primary',
  };
}

export function ReportAndSimSection({
  activeTab,
  onTabChange,
  selectedLevel,
  onSelectedLevelChange,
  selectedPacketId,
  onSelectPacket,
  packetOpened,
  onPacketOpenedChange,
  activeFormPartId,
  onActiveFormPartChange,
  completedFirstPacketParts,
  packetsProgress,
  completedPacketParts,
  formAnswersByPart,
  submittedParts,
  tryoutTimers,
  tryoutFlaggedIds,
  choukaiAudio,
  closeSheetSignal,
  onSheetViewerOpenChange,
  equivalentEstimate,
  fallbackFirstPacket,
  onChangePartAnswer,
  onTogglePartFlag,
  onPartElapsedChange,
  onAudioStateChange,
  onSubmitPartForm,
  onReopenPartForm,
  onResetPartForm,
  onTogglePacketPart,
  onNavigateAnki,
  onNavigateLearn,
}: ReportAndSimSectionProps) {
  const [partCompletionWarning, setPartCompletionWarning] = useState<{
    partId: TryOutPacketPartId;
    message: string;
  } | null>(null);
  const [packetFeedback, setPacketFeedback] = useState<{
    packetId: string;
    tone: 'warning' | 'info';
    message: string;
  } | null>(null);

  const activePacket = useMemo(
    () => getTryOutPacketById(selectedPacketId),
    [selectedPacketId],
  );
  const isActivePacketUnlocked = isTryOutPacketUnlocked(
    activePacket.id,
    completedFirstPacketParts,
  );
  const activePacketParts = useMemo(
    () => getTryOutPacketParts(activePacket.id),
    [activePacket.id],
  );
  const activePacketForms = useMemo(
    () => getTryOutPacketForms(activePacket.id),
    [activePacket.id],
  );
  const activePacketChoukaiTranscript = useMemo(
    () => getTryOutPacketChoukaiTranscript(activePacket.id),
    [activePacket.id],
  );

  // Guard: never allow entering a locked packet from stale navigation state
  useEffect(() => {
    if (!isActivePacketUnlocked && (packetOpened || activeFormPartId)) {
      onActiveFormPartChange(null);
      onPacketOpenedChange(false);
    }
  }, [
    activeFormPartId,
    isActivePacketUnlocked,
    onActiveFormPartChange,
    onPacketOpenedChange,
    packetOpened,
  ]);

  // Warm server-side Choukai audio cache as soon as a verified packet is opened
  useEffect(() => {
    if (!packetOpened || !isActivePacketUnlocked) return;
    const match = activePacket.audioSrc.match(/\/api\/audio\/drive\/([^/?#]+)/);
    if (!match?.[1]) return;
    void fetch(`/api/audio/prefetch/${encodeURIComponent(match[1])}`, {
      method: 'GET',
      cache: 'no-store',
    }).catch(() => {});
  }, [activePacket.audioSrc, isActivePacketUnlocked, packetOpened]);

  const levelPackets = useMemo(
    () => (selectedLevel ? getTryOutPacketsByLevel(selectedLevel) : []),
    [selectedLevel],
  );

  const unlockedN3Count = useMemo(
    () =>
      TRYOUT_N3_PACKETS.filter((p) =>
        isTryOutPacketUnlocked(p.id, completedFirstPacketParts),
      ).length,
    [completedFirstPacketParts],
  );
  const unlockedN2Count = useMemo(
    () =>
      TRYOUT_N2_PACKETS.filter((p) =>
        isTryOutPacketUnlocked(p.id, completedFirstPacketParts),
      ).length,
    [completedFirstPacketParts],
  );
  const unlockedN1Count = useMemo(
    () =>
      TRYOUT_N1_PACKETS.filter((p) =>
        isTryOutPacketUnlocked(p.id, completedFirstPacketParts),
      ).length,
    [completedFirstPacketParts],
  );
  const unlockedTotalCount = unlockedN3Count + unlockedN2Count + unlockedN1Count;
  const lockedTotalCount = ALL_TRYOUT_PACKETS.length - unlockedTotalCount;
  const levelUnlockedCount = useMemo(
    () =>
      levelPackets.filter((p) =>
        isTryOutPacketUnlocked(p.id, completedFirstPacketParts),
      ).length,
    [completedFirstPacketParts, levelPackets],
  );

  const packetProgressPercent = Math.round(
    (completedPacketParts.length / activePacketParts.length) * 100,
  );

  const packetCatalogStatsMap = useMemo(() => {
    const entries = ALL_TRYOUT_PACKETS.map((packet) => {
      if (!packet.hasQuestions || !packet.isFullText) {
        return [
          packet.id,
          {
            id: packet.id,
            level: packet.level,
            answered: 0,
            total: packet.questionCount,
            completedCount: 0,
            totalParts: 3,
            isDone: false,
          },
        ] as const;
      }

      const stored = packetsProgress[packet.id];
      const parts = getTryOutPacketParts(packet.id);
      const forms = getTryOutPacketForms(packet.id);
      let answered = 0;
      let total = 0;
      const completedIds = stored?.packetProgress.completedIds ?? [];
      for (const p of parts) {
        const sum = evaluatePartFormProgress(
          forms[p.id],
          stored?.packetProgress.answersByPart[p.id] ?? {},
        );
        answered += sum.answeredChoices;
        total += sum.totalChoices;
      }
      return [
        packet.id,
        {
          id: packet.id,
          level: packet.level,
          answered,
          total,
          completedCount: completedIds.length,
          totalParts: parts.length,
          isDone: parts.every((p) => completedIds.includes(p.id)),
        },
      ] as const;
    });
    return Object.fromEntries(entries);
  }, [packetsProgress]);

  const completedPacketsTotalCount = Object.values(packetCatalogStatsMap).filter(
    (s) => s.isDone,
  ).length;
  const completedN3Count = TRYOUT_N3_PACKETS.filter(
    (p) => packetCatalogStatsMap[p.id]?.isDone,
  ).length;
  const completedN2Count = TRYOUT_N2_PACKETS.filter(
    (p) => packetCatalogStatsMap[p.id]?.isDone,
  ).length;
  const completedN1Count = TRYOUT_N1_PACKETS.filter(
    (p) => packetCatalogStatsMap[p.id]?.isDone,
  ).length;

  const chartSeries = useMemo(
    () => buildTryOutPacketChartSeries(packetsProgress, fallbackFirstPacket),
    [fallbackFirstPacket, packetsProgress],
  );

  const activeN2PacketScore = useMemo(() => {
    if (activePacket.level !== 'N2' || !activePacket.isFullText) return null;
    return evaluateJlptN2PacketScore({
      forms: activePacketForms,
      answersByPart: formAnswersByPart,
      submittedIds: submittedParts,
    });
  }, [
    activePacket.isFullText,
    activePacket.level,
    activePacketForms,
    formAnswersByPart,
    submittedParts,
  ]);

  const activeFormPart =
    isActivePacketUnlocked && activeFormPartId
      ? activePacketParts.find((p) => p.id === activeFormPartId) ?? null
      : null;

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="w-full min-w-0 space-y-4">
        <div className="flex min-w-0 flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="text-[13px] font-bold tracking-wide text-primary">
              Try Out JLPT ·{' '}
              <span className="font-mono tabular-nums">
                {unlockedTotalCount}
              </span>{' '}
              Paket Terverifikasi Terbuka ·{' '}
              <span className="font-mono tabular-nums">{lockedTotalCount}</span>{' '}
              Terkunci
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
              Try Out JLPT N3, N2 &amp; N1
            </h2>
          </div>

          <p className="text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
            <span className="font-mono font-semibold tabular-nums">
              {unlockedTotalCount}
            </span>{' '}
            paket terbuka ·{' '}
            <span className="font-mono font-semibold tabular-nums">
              {completedPacketsTotalCount}
            </span>{' '}
            selesai
            {equivalentEstimate.level
              ? ` · Setara JLPT ${equivalentEstimate.level}`
              : ''}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Sub-menu Try Out"
          className="no-scrollbar flex w-full min-w-0 gap-5 overflow-x-auto border-b border-outline-variant"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'n2-official'}
            onClick={() => {
              vibrateTap();
              onTabChange('n2-official');
            }}
            className={`relative min-h-[44px] shrink-0 whitespace-nowrap pb-2.5 text-sm ${
              activeTab === 'n2-official'
                ? 'font-bold text-on-surface'
                : 'font-medium text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
            }`}
          >
            <span>Paket Try Out</span>
            {activeTab === 'n2-official' && (
              <span
                aria-hidden="true"
                className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary"
              />
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'chart'}
            onClick={() => {
              vibrateTap();
              onTabChange('chart');
            }}
            className={`relative min-h-[44px] shrink-0 whitespace-nowrap pb-2.5 text-sm ${
              activeTab === 'chart'
                ? 'font-bold text-on-surface'
                : 'font-medium text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
            }`}
          >
            <span>Grafik &amp; Nilai</span>
            {activeTab === 'chart' && (
              <span
                aria-hidden="true"
                className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary"
              />
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'mini-sim'}
            onClick={() => {
              vibrateTap();
              onTabChange('mini-sim');
            }}
            className={`relative min-h-[44px] shrink-0 whitespace-nowrap pb-2.5 text-sm ${
              activeTab === 'mini-sim'
                ? 'font-bold text-on-surface'
                : 'font-medium text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
            }`}
          >
            <span>Mini Simulasi</span>
            {activeTab === 'mini-sim' && (
              <span
                aria-hidden="true"
                className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary"
              />
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sample'}
            onClick={() => {
              vibrateTap();
              onTabChange('sample');
            }}
            className={`relative min-h-[44px] shrink-0 whitespace-nowrap pb-2.5 text-sm ${
              activeTab === 'sample'
                ? 'font-bold text-on-surface'
                : 'font-medium text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]'
            }`}
          >
            <span>Contoh Laporan</span>
            {activeTab === 'sample' && (
              <span
                aria-hidden="true"
                className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary"
              />
            )}
          </button>
        </div>
      </header>

      {activeTab === 'chart' ? (
        <TryOutComparisonChart
          series={chartSeries}
          equivalentEstimate={equivalentEstimate}
          activePacketId={packetOpened ? selectedPacketId : undefined}
          onSelectPacket={(packetId) => {
            if (isTryOutPacketUnlocked(packetId, completedFirstPacketParts)) {
              const targetPacket = getTryOutPacketById(packetId);
              setPacketFeedback(null);
              onTabChange('n2-official');
              onSelectedLevelChange(targetPacket.level);
              onSelectPacket(packetId);
              onPacketOpenedChange(true);
            }
          }}
        />
      ) : activeTab === 'n2-official' ? (
        activeFormPart ? (
          <TryOutFormRunner
            key={`${activePacket.id}-${activeFormPart.id}`}
            packetTitle={activePacket.title}
            levelLabel={`JLPT ${activePacket.level}`}
            examCode={activePacket.examCode}
            part={activeFormPart}
            pages={activePacketForms[activeFormPart.id]}
            values={formAnswersByPart[activeFormPart.id] ?? {}}
            flaggedIds={tryoutFlaggedIds[activeFormPart.id] ?? []}
            initialElapsedSeconds={tryoutTimers[activeFormPart.id] ?? 0}
            isSubmitted={submittedParts.includes(activeFormPart.id)}
            choukaiAudio={choukaiAudio}
            choukaiTranscript={
              activeFormPart.id === 'choukai'
                ? activePacketChoukaiTranscript
                : undefined
            }
            closeSheetSignal={closeSheetSignal}
            onSheetViewerOpenChange={onSheetViewerOpenChange}
            onAudioStateChange={onAudioStateChange}
            onChangeValue={(fieldId, value) =>
              onChangePartAnswer(activeFormPart.id, fieldId, value)
            }
            onToggleFlag={(itemId) =>
              onTogglePartFlag(activeFormPart.id, itemId)
            }
            onElapsedChange={(secs) =>
              onPartElapsedChange(activeFormPart.id, secs)
            }
            onSubmitPart={() => onSubmitPartForm(activeFormPart.id)}
            onReopenPart={() => onReopenPartForm(activeFormPart.id)}
            onResetPartValues={() => onResetPartForm(activeFormPart.id)}
            onBack={() => onActiveFormPartChange(null)}
          />
        ) : packetOpened && isActivePacketUnlocked ? (
          <div className="space-y-6">
            <section className="space-y-4 border-b border-outline-variant pb-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setPartCompletionWarning(null);
                    onPacketOpenedChange(false);
                  }}
                  className="m3-tactile inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Daftar Paket {activePacket.level}</span>
                </button>

                <span className="font-mono text-xs font-bold text-primary">
                  {activePacket.examCode} · {activePacket.yearLabel}
                </span>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    JLPT {activePacket.level} · Paket {activePacket.order} ·
                    Soal Teks Penuh &amp; Audio
                  </p>
                  <h3 className="mt-1 font-display text-xl font-extrabold text-on-surface">
                    {activePacket.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant sm:text-sm">
                    {activePacket.description} Kumpulkan tiap bagian untuk
                    mencatat skor otomatis dan klaim +50 XP.
                  </p>
                </div>

                <div className="shrink-0 sm:min-w-[180px]">
                  <div className="flex items-center justify-between gap-4 text-xs font-bold">
                    <span className="text-on-surface-variant">Progres</span>
                    <span className="font-mono tabular-nums text-primary">
                      {completedPacketParts.length}/{activePacketParts.length}{' '}
                      Bagian
                    </span>
                  </div>
                  <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high"
                    role="progressbar"
                    aria-valuenow={packetProgressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progres ${activePacket.title}`}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${packetProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {activeN2PacketScore && (
              <section
                aria-label="Estimasi Skor JLPT N2 Paket Ini"
                className="space-y-4 rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-wide text-primary">
                      Estimasi Skor JLPT N2 · Bobot Resmi per Mondai
                    </p>
                    <h4 className="mt-1 font-display text-lg font-extrabold text-on-surface">
                      {activeN2PacketScore.statusLabel}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                      {activeN2PacketScore.statusDetail}
                    </p>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-[11px] font-semibold text-on-surface-variant">
                      Total Estimasi (Lulus ≥ {JLPT_N2_TOTAL_PASS_MIN})
                    </p>
                    <p
                      className={`font-mono text-2xl font-extrabold tabular-nums sm:text-3xl ${
                        activeN2PacketScore.status === 'passed'
                          ? 'text-success'
                          : activeN2PacketScore.status === 'in-progress'
                            ? 'text-on-surface'
                            : 'text-primary'
                      }`}
                    >
                      {activeN2PacketScore.submittedPartCount > 0
                        ? activeN2PacketScore.totalScaledScore
                        : '—'}
                      <span className="text-sm font-bold text-on-surface-variant">
                        /{JLPT_N2_TOTAL_MAX}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 border-t border-outline-variant pt-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-outline-variant">
                  {(['moji-bunpou', 'dokkai', 'choukai'] as const).map(
                    (partKey, idx) => {
                      const sec = activeN2PacketScore.parts[partKey];
                      return (
                        <div
                          key={partKey}
                          className={idx > 0 ? 'sm:pl-4' : 'sm:pr-4'}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-xs font-bold text-on-surface">
                              {sec.japaneseLabel} · {sec.partLabel}
                            </p>
                            <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
                              {sec.totalQuestions} soal
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-baseline justify-between gap-2">
                            <p className="font-mono text-xl font-extrabold tabular-nums text-on-surface">
                              {sec.isSubmitted ? sec.scaledScore : '—'}
                              <span className="text-xs font-semibold text-on-surface-variant">
                                /{JLPT_N2_SECTION_MAX}
                              </span>
                            </p>
                            {sec.isSubmitted ? (
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-bold ${
                                  sec.passedCutoff
                                    ? 'text-success'
                                    : 'text-warning'
                                }`}
                              >
                                {sec.passedCutoff ? (
                                  <>
                                    <CheckCircle2
                                      className="h-3.5 w-3.5 shrink-0"
                                      aria-hidden="true"
                                    />
                                    <span>≥ {JLPT_N2_SECTION_PASS_MIN}</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle
                                      className="h-3.5 w-3.5 shrink-0"
                                      aria-hidden="true"
                                    />
                                    <span>&lt; {JLPT_N2_SECTION_PASS_MIN}</span>
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-on-surface-variant">
                                Belum dikumpulkan
                              </span>
                            )}
                          </div>
                          <p className="mt-1 font-mono text-[11px] tabular-nums text-on-surface-variant">
                            {sec.isSubmitted
                              ? `Poin ${sec.earnedRawPoints}/${sec.maxRawPoints} · Benar ${sec.correctCount}/${sec.totalQuestions}`
                              : `Maks poin berbobot ${sec.maxRawPoints} → skala 60`}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>

                <p className="border-t border-outline-variant/70 pt-3 text-[11px] leading-relaxed text-on-surface-variant">
                  Syarat lulus JLPT N2: total minimal{' '}
                  <strong className="font-mono font-bold text-on-surface">
                    90/180
                  </strong>{' '}
                  dan setiap bagian minimal{' '}
                  <strong className="font-mono font-bold text-on-surface">
                    19/60
                  </strong>
                  . Skala nilai otomatis menyesuaikan jumlah soal aktual di tiap
                  paket.
                </p>
              </section>
            )}

            <div className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
              {activePacketParts.map((part) => {
                const isCompleted = completedPacketParts.includes(part.id);
                const isSubmittedPart = submittedParts.includes(part.id);
                const partValues = formAnswersByPart[part.id] ?? {};
                const partProgress = evaluatePartFormProgress(
                  activePacketForms[part.id],
                  partValues,
                );
                const partScore = isSubmittedPart
                  ? evaluatePartScore(activePacketForms[part.id], partValues)
                  : null;
                const n2PartSummary =
                  isSubmittedPart && activeN2PacketScore
                    ? activeN2PacketScore.parts[part.id]
                    : null;

                return (
                  <article key={part.id} className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-extrabold ${
                            isCompleted
                              ? 'bg-success text-white'
                              : 'bg-primary-container text-on-primary-container'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            part.order
                          )}
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 text-xs font-semibold">
                            <span className="text-primary">
                              BAGIAN {part.order}
                            </span>
                            <span aria-hidden="true" className="text-outline">
                              ·
                            </span>
                            <span className="font-mono text-on-surface-variant">
                              {part.recommendedMinutes} mnt
                            </span>
                            <span aria-hidden="true" className="text-outline">
                              ·
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono text-warning">
                              <Zap
                                className="h-3.5 w-3.5 fill-amber-400 text-amber-500"
                                aria-hidden="true"
                              />
                              +{part.xpReward} XP
                            </span>
                            <span aria-hidden="true" className="text-outline">
                              ·
                            </span>
                            <span className="font-mono tabular-nums text-on-surface-variant">
                              {partProgress.answeredChoices}/
                              {partProgress.totalChoices} terjawab
                            </span>
                            {partScore && (
                              <>
                                <span aria-hidden="true" className="text-outline">
                                  ·
                                </span>
                                {n2PartSummary ? (
                                  <span
                                    className={`font-mono font-extrabold tabular-nums ${
                                      n2PartSummary.passedCutoff
                                        ? 'text-success'
                                        : 'text-warning'
                                    }`}
                                  >
                                    Skor N2 {n2PartSummary.scaledScore}/60 (
                                    {partScore.accuracyPercent}%)
                                  </span>
                                ) : (
                                  <span className="font-mono font-extrabold tabular-nums text-success">
                                    Skor {partScore.accuracyPercent}%
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          <h4 className="mt-1 font-display text-base font-extrabold text-on-surface sm:text-lg">
                            {part.title}
                          </h4>
                          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant sm:text-sm">
                            {part.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            vibrateTap();
                            setPartCompletionWarning(null);
                            onActiveFormPartChange(part.id);
                          }}
                          className="m3-tactile inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary-hover sm:flex-none"
                        >
                          {part.audioSrc && (
                            <Headphones
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          )}
                          <span>
                            {isSubmittedPart
                              ? 'Lihat Jawaban'
                              : partProgress.answeredChoices > 0
                                ? 'Lanjutkan'
                                : 'Mulai Kerjakan'}
                          </span>
                          <ArrowRight
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!isCompleted && !partProgress.isReadyToSubmit) {
                              vibrateError();
                              setPartCompletionWarning({
                                partId: part.id,
                                message: `Semua ${partProgress.totalRequired} isian & soal pada ${part.title} wajib diisi terlebih dahulu (${partProgress.missingRequired.length} masih kosong).`,
                              });
                              return;
                            }
                            vibrateSuccess();
                            setPartCompletionWarning(null);
                            onTogglePacketPart(part.id);
                          }}
                          aria-pressed={isCompleted}
                          className={`m3-tactile inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-bold sm:flex-none ${
                            isCompleted
                              ? 'border-success/50 bg-success-container text-on-success-container hover:opacity-90'
                              : 'border-outline text-on-surface hover:bg-surface-container'
                          }`}
                        >
                          <CheckCircle2
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          <span>
                            {isCompleted ? 'Selesai' : 'Tandai Selesai'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {partCompletionWarning?.partId === part.id && (
                      <p
                        role="alert"
                        className="mt-3 rounded-xl bg-primary-container px-3.5 py-2.5 text-xs font-semibold text-on-primary-container"
                      >
                        {partCompletionWarning.message}
                      </p>
                    )}

                    {part.audioSrc && part.audioFileName && (
                      <div className="mt-4 space-y-3">
                        <ChoukaiAudioPlayer
                          key={part.audioSrc}
                          src={part.audioSrc}
                          fileName={part.audioFileName}
                          title={`Audio Choukai — ${activePacket.title}`}
                          album={`${activePacket.title} — Choukai`}
                          initialTime={choukaiAudio.currentTime}
                          initialPlaybackRate={choukaiAudio.playbackRate}
                          onAudioStateChange={onAudioStateChange}
                        />
                        {activePacketChoukaiTranscript.length > 0 &&
                          (isSubmittedPart ? (
                            <ChoukaiTranscriptPanel
                              packetTitle={activePacket.title}
                              sections={activePacketChoukaiTranscript}
                            />
                          ) : (
                            <p className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container px-3.5 py-2.5 text-xs text-on-surface-variant">
                              <Lock
                                className="h-3.5 w-3.5 shrink-0 text-on-surface-variant"
                                aria-hidden="true"
                              />
                              <span>
                                Transkrip Choukai (聴力原文) akan terbuka
                                otomatis pada halaman evaluasi setelah kamu
                                mengumpulkan jawaban Choukai.
                              </span>
                            </p>
                          ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        ) : selectedLevel ? (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-3 border-b border-outline-variant pb-5 sm:flex-row sm:items-end">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setPacketFeedback(null);
                    onSelectedLevelChange(null);
                  }}
                  className="m3-tactile mb-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Pilih Level Try Out</span>
                </button>
                <h3 className="font-display text-lg font-extrabold text-on-surface sm:text-xl">
                  Paket Try Out JLPT {selectedLevel} ({levelUnlockedCount}/
                  {levelPackets.length} Terbuka)
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant sm:text-sm">
                  {selectedLevel === 'N3'
                    ? '5 paket JLPT N3 (2010.07–2012.12) memakai soal asli terverifikasi lengkap kunci jawaban resmi, ilustrasi & audio Choukai, serta transkrip untuk pembelajaran. Paket lainnya sementara terkunci.'
                    : selectedLevel === 'N2'
                      ? '6 paket JLPT N2 (2010.07–2012.12) memakai soal asli terverifikasi lengkap dengan kunci jawaban resmi, audio, dan transkrip Choukai untuk pembelajaran. Paket lainnya sementara terkunci.'
                      : '4 paket JLPT N1 (2010.07–2011.12) telah terbuka dengan soal asli terverifikasi, kunci jawaban resmi, audio, dan transkrip Choukai. Paket lainnya sementara terkunci.'}
                </p>
              </div>
              <span
                className={`font-mono text-xs font-bold ${
                  levelUnlockedCount > 0
                    ? 'text-primary'
                    : 'text-on-surface-variant'
                }`}
              >
                {levelUnlockedCount > 0
                  ? `${levelUnlockedCount}/${levelPackets.length} Terbuka`
                  : `Terkunci · 0/${levelPackets.length}`}
              </span>
            </div>

            <div className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
              {levelPackets.map((packet) => {
                const isUnlocked = isTryOutPacketUnlocked(
                  packet.id,
                  completedFirstPacketParts,
                );
                const stats = packetCatalogStatsMap[packet.id];
                const isDone = Boolean(stats?.isDone);

                return (
                  <div key={packet.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isUnlocked) {
                          vibrateError();
                          setPacketFeedback({
                            packetId: packet.id,
                            tone: 'warning',
                            message: `${packet.title} sementara terkunci menunggu verifikasi soal & kunci resmi. Saat ini 15 paket terverifikasi (5 N3, 6 N2, dan 4 N1) sudah siap dikerjakan.`,
                          });
                          return;
                        }

                        vibrateTap();
                        setPacketFeedback(null);
                        onSelectPacket(packet.id);
                        onPacketOpenedChange(true);
                      }}
                      aria-disabled={!isUnlocked}
                      className={`m3-tactile group flex w-full min-w-0 flex-col gap-3 px-4 py-4 text-left transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
                        !isUnlocked
                          ? 'bg-surface-container/40 text-[#4b4b53] opacity-75 dark:text-[#b4b4c0]'
                          : 'hover:bg-surface-container/60'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-extrabold ${
                            !isUnlocked
                              ? 'bg-surface-container-high text-on-surface-variant'
                              : isDone
                                ? 'bg-success text-white'
                                : 'bg-primary-container text-on-primary-container transition-colors group-hover:bg-primary group-hover:text-on-primary'
                          }`}
                        >
                          {!isUnlocked ? (
                            <Lock className="h-4 w-4" aria-hidden="true" />
                          ) : isDone ? (
                            <Check className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            packet.order
                          )}
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold">
                            <span
                              className={
                                !isUnlocked
                                  ? 'text-on-surface-variant'
                                  : isDone
                                    ? 'text-success'
                                    : 'text-primary'
                              }
                            >
                              {!isUnlocked
                                ? 'Terkunci'
                                : isDone
                                  ? 'Selesai'
                                  : 'Terverifikasi'}
                            </span>
                            <span aria-hidden="true" className="text-outline">
                              ·
                            </span>
                            <span className="font-mono text-on-surface">
                              {packet.examCode} ({packet.yearLabel})
                            </span>
                            {isUnlocked && (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="text-outline"
                                >
                                  ·
                                </span>
                                <span className="inline-flex items-center gap-0.5 font-mono text-warning">
                                  <Zap
                                    className="h-3 w-3 fill-amber-400 text-amber-500"
                                    aria-hidden="true"
                                  />
                                  +{packet.xpReward} XP
                                </span>
                              </>
                            )}
                          </div>

                          <h4 className="mt-0.5 font-display text-base font-extrabold text-on-surface">
                            {packet.title}
                          </h4>

                          <p className="mt-1 font-mono text-xs tabular-nums text-on-surface-variant">
                            {isUnlocked
                              ? `${stats?.answered ?? 0}/${stats?.total ?? packet.questionCount} soal · ${stats?.completedCount ?? 0}/${stats?.totalParts ?? 3} bagian · Kunci Resmi & Transkrip Choukai`
                              : 'Sementara terkunci — menunggu verifikasi soal & kunci resmi'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 self-end whitespace-nowrap text-xs font-bold sm:self-center ${
                          !isUnlocked
                            ? 'text-on-surface-variant'
                            : 'text-primary'
                        }`}
                      >
                        {!isUnlocked ? (
                          <>
                            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Terkunci</span>
                          </>
                        ) : (
                          <>
                            <span>{isDone ? 'Ulas' : 'Buka'}</span>
                            <ChevronRight
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </>
                        )}
                      </span>
                    </button>

                    {packetFeedback?.packetId === packet.id && (
                      <p
                        role="status"
                        className="border-t border-outline-variant bg-warning-container px-5 py-3 text-xs font-semibold text-on-warning-container"
                      >
                        {packetFeedback.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="w-full min-w-0 space-y-3">
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                setPacketFeedback(null);
                onSelectedLevelChange('N3');
              }}
              className="m3-tactile group flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-on-primary">
                  N3
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-primary">
                    <span className="font-mono tabular-nums">
                      {unlockedN3Count}/{TRYOUT_N3_PACKETS.length}
                    </span>{' '}
                    Paket Terbuka ·{' '}
                    <span className="font-mono tabular-nums">
                      2010.07–2012.12
                    </span>{' '}
                    Terverifikasi
                  </p>
                  <h3 className="mt-1 font-display text-xl font-extrabold text-on-surface">
                    Try Out JLPT N3
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0] sm:text-sm">
                    5 paket soal asli terverifikasi (Juli 2010 – Desember 2012)
                    lengkap kunci jawaban resmi, gambar soal Choukai, audio, dan
                    transkrip untuk pembelajaran.
                  </p>
                  <p className="mt-2 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
                    <span className="font-mono font-semibold tabular-nums">
                      {completedN3Count}/{unlockedN3Count}
                    </span>{' '}
                    Paket Terbuka Selesai ·{' '}
                    <span className="font-mono tabular-nums">101–102</span>{' '}
                    soal/paket
                  </p>
                </div>
              </div>

              <span className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary group-hover:bg-primary-hover sm:w-auto sm:self-center">
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>Buka N3</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                vibrateTap();
                setPacketFeedback(null);
                onSelectedLevelChange('N2');
              }}
              className="m3-tactile group flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-on-primary">
                  N2
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-primary">
                    <span className="font-mono tabular-nums">
                      {unlockedN2Count}/{TRYOUT_N2_PACKETS.length}
                    </span>{' '}
                    Paket Terbuka ·{' '}
                    <span className="font-mono tabular-nums">
                      2010.07–2012.12
                    </span>{' '}
                    Terverifikasi
                  </p>
                  <h3 className="mt-1 font-display text-xl font-extrabold text-on-surface">
                    Try Out JLPT N2
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0] sm:text-sm">
                    6 paket soal asli terverifikasi (Juli 2010 – Desember 2012)
                    lengkap kunci jawaban resmi, audio, dan transkrip Choukai
                    untuk pembelajaran.
                  </p>
                  <p className="mt-2 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
                    <span className="font-mono font-semibold tabular-nums">
                      {completedN2Count}/{unlockedN2Count}
                    </span>{' '}
                    Paket Terbuka Selesai ·{' '}
                    <span className="font-mono tabular-nums">106–107</span>{' '}
                    soal/paket
                  </p>
                </div>
              </div>

              <span className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary group-hover:bg-primary-hover sm:w-auto sm:self-center">
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>Buka N2</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                vibrateTap();
                setPacketFeedback(null);
                onSelectedLevelChange('N1');
              }}
              className="m3-tactile group flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-on-primary">
                  N1
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-primary">
                    <span className="font-mono tabular-nums">
                      {unlockedN1Count}/{TRYOUT_N1_PACKETS.length}
                    </span>{' '}
                    Paket Terbuka ·{' '}
                    <span className="font-mono tabular-nums">
                      2010.07–2011.12
                    </span>{' '}
                    Terverifikasi
                  </p>
                  <h3 className="mt-1 font-display text-xl font-extrabold text-on-surface">
                    Try Out JLPT N1
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0] sm:text-sm">
                    4 paket soal asli terverifikasi (Juli 2010 – Desember 2011)
                    lengkap kunci jawaban resmi, audio, dan transkrip Choukai
                    untuk pembelajaran.
                  </p>
                  <p className="mt-2 text-[13px] text-[#4b4b53] dark:text-[#b4b4c0]">
                    <span className="font-mono font-semibold tabular-nums">
                      {completedN1Count}/{unlockedN1Count}
                    </span>{' '}
                    Paket Terbuka Selesai ·{' '}
                    <span className="font-mono tabular-nums">106–108</span>{' '}
                    soal/paket
                  </p>
                </div>
              </div>

              <span className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary group-hover:bg-primary-hover sm:w-auto sm:self-center">
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>Buka N1</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>

            <p className="pt-3 text-xs leading-relaxed text-[#4b4b53] dark:text-[#b4b4c0]">
              Level N5 dan N4 tersedia melalui kartu Anki dan Materi interaktif.
            </p>
          </div>
        )
      ) : activeTab === 'sample' ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-4 border-b border-outline-variant pb-5 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-lg font-bold text-on-surface sm:text-xl">
                {SAMPLE_N3_REPORT.title}
              </h3>
              <p className="mt-1 text-xs text-on-surface-variant sm:text-sm">
                Evaluasi 4 bagian inti · Moji-Goi, Bunpou, Dokkai, dan Choukai
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-medium text-on-surface-variant">
                Rata-rata
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums text-primary">
                {SAMPLE_N3_REPORT.average}%
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-6">
              <h4 className="font-display text-sm font-bold text-on-surface">
                Persentase Kemampuan per Bagian
              </h4>
              <div className="space-y-4">
                {SAMPLE_N3_REPORT.rows.map((row) => {
                  const tone = getScoreBarTone(row.score);
                  return (
                    <div key={row.section} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-display text-sm font-bold text-on-surface">
                          {row.section}
                        </span>
                        <div className="flex items-baseline gap-2.5">
                          <span
                            className={`text-xs font-semibold ${tone.textClass}`}
                          >
                            {tone.label}
                          </span>
                          <span className="font-mono text-sm font-bold tabular-nums text-on-surface">
                            {row.score}%
                          </span>
                        </div>
                      </div>
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
                        role="progressbar"
                        aria-valuenow={row.score}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Skor ${row.section}`}
                      >
                        <div
                          className={`h-full rounded-full ${tone.barClass}`}
                          style={{ width: `${row.score}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-outline-variant pt-5 lg:col-span-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
              <h4 className="font-display text-sm font-bold text-on-surface">
                Rekomendasi Langkah Berikutnya
              </h4>
              <dl className="mt-4 divide-y divide-outline-variant">
                {SAMPLE_N3_REPORT.rows.map((row) => (
                  <div key={row.section} className="py-3.5 first:pt-0 last:pb-0">
                    <dt className="font-display text-sm font-bold text-on-surface">
                      {row.section}
                    </dt>
                    <dd className="mt-1 text-xs leading-relaxed text-on-surface-variant sm:text-sm">
                      {row.recommendation}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <p className="mt-6 border-t border-outline-variant pt-4 text-xs leading-relaxed text-on-surface-variant">
            *{SAMPLE_N3_REPORT.disclaimer}
          </p>
        </div>
      ) : (
        <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 sm:p-7">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Sementara Terkunci
              </p>
              <h3 className="mt-1 font-display text-lg font-extrabold text-on-surface sm:text-xl">
                Mini Simulasi JLPT Sedang Dikunci
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant sm:text-sm">
                Soal simulasi lama sementara dikunci untuk memastikan semua soal
                Try Out menggunakan data asli terverifikasi. Gunakan{' '}
                <strong className="text-on-surface">
                  15 Paket Try Out JLPT N3, N2 &amp; N1
                </strong>{' '}
                yang sudah dilengkapi soal asli, kunci jawaban resmi, audio, dan
                transkrip Choukai untuk pembelajaran.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onTabChange('n2-official');
                onSelectedLevelChange(null);
                onPacketOpenedChange(false);
              }}
              className="m3-tactile inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary hover:bg-primary-hover"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span>Buka 15 Paket Try Out Terverifikasi</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onNavigateAnki}
              className="m3-tactile inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-outline px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container"
            >
              <span>Latih Kosakata Anki</span>
            </button>
            <button
              type="button"
              onClick={onNavigateLearn}
              className="m3-tactile inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-outline px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container"
            >
              <span>Pelajari Materi Bunpou</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
