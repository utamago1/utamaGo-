import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Eye,
  Flag,
  Lock,
  Maximize2,
  RotateCcw,
  Send,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { TryOutFormPage } from '../data/tryOutN2Data';
import { vibrateError, vibrateSuccess, vibrateTap } from '../utils/haptics';
import {
  evaluateJlptN2PartScore,
  JLPT_N2_SECTION_MAX,
  JLPT_N2_SECTION_PASS_MIN,
} from '../utils/jlptN2Scoring';
import {
  evaluatePartFormProgress,
  evaluatePartScore,
  formatAudioTime,
  getFirstIncompletePageIndex,
  type TryOutFormValues,
  type TryOutPacketPart,
} from '../utils/tryOutPacket';
import type { ChoukaiTranscriptSection } from '../utils/tryOutVerifiedParser';
import { ChoukaiAudioPlayer } from './ChoukaiAudioPlayer';
import { ChoukaiTranscriptPanel } from './ChoukaiTranscriptPanel';
import { TryOutWrongReviewSection } from './TryOutWrongReviewSection';

function renderUnderlinedJapanese(text: string, isInverted = false) {
  const parts = text.split(/(\[\[.*?\]\])/g);
  if (parts.length === 1) return text;
  return parts.map((segment, index) => {
    if (segment.startsWith('[[') && segment.endsWith(']]')) {
      const inner = segment.slice(2, -2);
      return (
        <span
          key={index}
          className={`font-bold underline decoration-2 underline-offset-4 ${
            isInverted ? 'decoration-on-primary' : 'decoration-primary'
          }`}
        >
          {inner}
        </span>
      );
    }
    return <span key={index}>{segment}</span>;
  });
}

interface TryOutFormRunnerProps {
  packetTitle?: string;
  levelLabel?: string;
  examCode?: string;
  part: TryOutPacketPart;
  pages: TryOutFormPage[];
  values: TryOutFormValues;
  flaggedIds: string[];
  initialElapsedSeconds: number;
  isSubmitted: boolean;
  choukaiAudio?: { currentTime: number; playbackRate: number };
  choukaiTranscript?: ChoukaiTranscriptSection[];
  closeSheetSignal?: number;
  onSheetViewerOpenChange?: (open: boolean) => void;
  onAudioStateChange?: (state: {
    currentTime: number;
    playbackRate: number;
  }) => void;
  onChangeValue: (fieldId: string, value: string) => void;
  onToggleFlag: (itemId: string) => void;
  onElapsedChange: (elapsedSeconds: number) => void;
  onSubmitPart: () => void;
  onReopenPart: () => void;
  onResetPartValues: () => void;
  onBack: () => void;
}

export function TryOutFormRunner({
  packetTitle = 'JLPT N2 Try Out 1',
  levelLabel = 'JLPT N2',
  examCode = '2010.07',
  part,
  pages,
  values,
  flaggedIds,
  initialElapsedSeconds,
  isSubmitted,
  choukaiAudio,
  choukaiTranscript,
  closeSheetSignal = 0,
  onSheetViewerOpenChange,
  onAudioStateChange,
  onChangeValue,
  onToggleFlag,
  onElapsedChange,
  onSubmitPart,
  onReopenPart,
  onResetPartValues,
  onBack,
}: TryOutFormRunnerProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);
  const [recapFilter, setRecapFilter] = useState<'all' | 'wrong' | 'flagged'>(
    'all',
  );
  const [showMissingHighlight, setShowMissingHighlight] = useState(false);
  const [validationError, setValidationError] = useState<{
    message: string;
    firstMissingPageIndex: number;
  } | null>(null);
  const [sheetModalIndex, setSheetModalIndex] = useState<number | null>(null);
  const [sheetZoom, setSheetZoom] = useState<1 | 1.5 | 2>(1);
  const [showMondaiBreakdown, setShowMondaiBreakdown] = useState(true);
  const [focusedWrongItemId, setFocusedWrongItemId] = useState<string | null>(
    null,
  );

  const formTopRef = useRef<HTMLDivElement | null>(null);
  const elapsedRef = useRef(elapsedSeconds);
  elapsedRef.current = elapsedSeconds;
  const lastSyncedElapsedRef = useRef(initialElapsedSeconds);
  const onElapsedChangeRef = useRef(onElapsedChange);
  onElapsedChangeRef.current = onElapsedChange;
  const onSheetViewerOpenChangeRef = useRef(onSheetViewerOpenChange);
  onSheetViewerOpenChangeRef.current = onSheetViewerOpenChange;
  const sheetOpenRef = useRef(false);
  sheetOpenRef.current = sheetModalIndex !== null;

  const recommendedSeconds = part.recommendedMinutes * 60;
  const remainingSeconds = Math.max(0, recommendedSeconds - elapsedSeconds);
  const isOverTime = elapsedSeconds > recommendedSeconds;
  const isLowTime = !isOverTime && remainingSeconds <= 300;

  useEffect(() => {
    if (isSubmitted) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [isSubmitted]);

  useEffect(() => {
    if (isSubmitted) return;
    if (
      elapsedSeconds > 0 &&
      elapsedSeconds % 5 === 0 &&
      elapsedSeconds !== lastSyncedElapsedRef.current
    ) {
      lastSyncedElapsedRef.current = elapsedSeconds;
      onElapsedChangeRef.current(elapsedSeconds);
    }
  }, [elapsedSeconds, isSubmitted]);

  useEffect(() => {
    return () => {
      if (elapsedRef.current !== lastSyncedElapsedRef.current) {
        lastSyncedElapsedRef.current = elapsedRef.current;
        onElapsedChangeRef.current(elapsedRef.current);
      }
    };
  }, []);

  const progress = useMemo(
    () => evaluatePartFormProgress(pages, values),
    [pages, values],
  );

  const firstIncompletePageIndex = useMemo(
    () => getFirstIncompletePageIndex(pages, values),
    [pages, values],
  );

  const currentPage = pages[pageIndex] ?? pages[0];
  const currentPageProgress = useMemo(
    () => evaluatePartFormProgress([currentPage], values),
    [currentPage, values],
  );
  const isLastPage = pageIndex === pages.length - 1;

  const allChoiceItems = useMemo(
    () => pages.flatMap((pg) => pg.items).filter((it) => it.kind === 'choice'),
    [pages],
  );
  const flaggedChoices = useMemo(
    () => allChoiceItems.filter((it) => flaggedIds.includes(it.id)),
    [allChoiceItems, flaggedIds],
  );
  const scoreSummary = useMemo(
    () => evaluatePartScore(pages, values),
    [pages, values],
  );
  const isN2Level = levelLabel.toUpperCase().includes('N2');
  const n2PartScore = useMemo(
    () => (isN2Level ? evaluateJlptN2PartScore(part.id, pages, values) : null),
    [isN2Level, pages, part.id, values],
  );
  const wrongItemIds = useMemo(
    () => new Set(scoreSummary.wrongItems.map((w) => w.itemId)),
    [scoreSummary.wrongItems],
  );
  const wrongChoices = useMemo(
    () => allChoiceItems.filter((it) => wrongItemIds.has(it.id)),
    [allChoiceItems, wrongItemIds],
  );

  const choiceItemById = useMemo(
    () => new Map(allChoiceItems.map((it) => [it.id, it])),
    [allChoiceItems],
  );

  const currentPageSheets = useMemo(
    () =>
      currentPage.items.flatMap((it) => {
        if (it.kind === 'image') {
          return [
            {
              id: it.id,
              label: `Lembar Soal · ${currentPage.title}`,
              image: it.image,
            },
          ];
        }
        if (it.kind === 'choice' && it.image) {
          return [
            {
              id: it.id,
              label: `Ilustrasi Soal · ${it.label}`,
              image: it.image,
            },
          ];
        }
        return [];
      }),
    [currentPage],
  );

  const openSheetModal = (idx: number) => {
    vibrateTap();
    setSheetZoom(1);
    setSheetModalIndex(idx);
    onSheetViewerOpenChangeRef.current?.(true);
  };

  const closeSheetModal = () => {
    setSheetModalIndex(null);
    setSheetZoom(1);
    onSheetViewerOpenChangeRef.current?.(false);
  };

  useEffect(() => {
    if (closeSheetSignal > 0 && sheetModalIndex !== null) {
      setSheetModalIndex(null);
      setSheetZoom(1);
    }
  }, [closeSheetSignal, sheetModalIndex]);

  useEffect(() => {
    if (sheetModalIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSheetModalIndex(null);
        setSheetZoom(1);
        onSheetViewerOpenChangeRef.current?.(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sheetModalIndex]);

  useEffect(() => {
    return () => {
      if (sheetOpenRef.current) {
        onSheetViewerOpenChangeRef.current?.(false);
      }
    };
  }, []);

  const scrollToFormTop = () => {
    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToField = (itemId: string) => {
    if (typeof document === 'undefined') return;
    window.requestAnimationFrame(() => {
      const target = document.querySelector(`[data-field-id="${itemId}"]`);
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  };

  const handleGoPage = (targetIndex: number) => {
    vibrateTap();
    const boundedTarget = Math.max(0, Math.min(pages.length - 1, targetIndex));

    if (
      boundedTarget <= pageIndex ||
      boundedTarget <= firstIncompletePageIndex
    ) {
      setValidationError(null);
      setShowMissingHighlight(false);
      setPageIndex(boundedTarget);
      scrollToFormTop();
      return;
    }

    vibrateError();
    const blockerIndex = firstIncompletePageIndex;
    const blockerSummary = evaluatePartFormProgress(
      [pages[blockerIndex]],
      values,
    );
    const firstMissing = blockerSummary.missingRequired[0];

    setPageIndex(blockerIndex);
    setShowMissingHighlight(true);
    setValidationError({
      message: `Semua isian & soal wajib diisi sebelum lanjut. Masih ada ${blockerSummary.missingRequired.length} yang kosong di Halaman ${blockerIndex + 1} (${firstMissing?.label ?? 'wajib diisi'}).`,
      firstMissingPageIndex: blockerIndex,
    });
    if (firstMissing) {
      scrollToField(firstMissing.itemId);
    }
  };

  const handleNextPage = () => {
    if (!currentPageProgress.isReadyToSubmit) {
      vibrateError();
      const firstMissing = currentPageProgress.missingRequired[0];
      setShowMissingHighlight(true);
      setValidationError({
        message: `Semua isian & soal di halaman ini wajib diisi sebelum lanjut. Masih ada ${currentPageProgress.missingRequired.length} yang belum diisi (${firstMissing?.label ?? 'wajib diisi'}).`,
        firstMissingPageIndex: pageIndex,
      });
      if (firstMissing) {
        scrollToField(firstMissing.itemId);
      }
      return;
    }

    vibrateTap();
    setValidationError(null);
    setShowMissingHighlight(false);
    setPageIndex((prev) => Math.min(pages.length - 1, prev + 1));
    scrollToFormTop();
  };

  const handleSubmit = () => {
    if (!progress.isReadyToSubmit) {
      vibrateError();
      const firstMissing = progress.missingRequired[0];
      setPageIndex(firstMissing.pageIndex);
      setShowMissingHighlight(true);
      setValidationError({
        message: `Semua isian & soal wajib diisi sebelum mengumpulkan. Masih ada ${progress.missingRequired.length} bagian kosong (mulai dari "${firstMissing.label}" di Halaman ${firstMissing.pageIndex + 1}).`,
        firstMissingPageIndex: firstMissing.pageIndex,
      });
      scrollToField(firstMissing.itemId);
      return;
    }

    vibrateSuccess();
    lastSyncedElapsedRef.current = elapsedSeconds;
    onElapsedChangeRef.current(elapsedSeconds);
    setValidationError(null);
    setShowMissingHighlight(false);
    onSubmitPart();
    scrollToFormTop();
  };

  const remainingMinutesRounded = Math.ceil(remainingSeconds / 60);
  const progressPercent =
    progress.totalChoices > 0
      ? Math.round((progress.answeredChoices / progress.totalChoices) * 100)
      : 0;

  return (
    <div ref={formTopRef} className="space-y-4">
      <section className="rounded-3xl border border-outline-variant bg-surface-container-low p-4 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-3.5">
          <button
            type="button"
            onClick={() => {
              if (isSubmitted) {
                lastSyncedElapsedRef.current = elapsedSeconds;
                onElapsedChangeRef.current(elapsedSeconds);
              }
              onBack();
            }}
            className="m3-tactile inline-flex min-h-[48px] items-center gap-2 whitespace-nowrap rounded-2xl border border-outline bg-surface-container px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Kembali ke Bagian</span>
          </button>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono tabular-nums ${
                isOverTime
                  ? 'bg-primary-container text-on-primary-container'
                  : isLowTime
                    ? 'bg-warning-container text-on-warning-container'
                    : 'bg-surface-container text-on-surface'
              }`}
              title={`Batas waktu bagian ini: ${part.recommendedMinutes} menit`}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {isOverTime
                ? `Lewat +${formatAudioTime(elapsedSeconds - recommendedSeconds)} (${part.recommendedMinutes} mnt)`
                : `${formatAudioTime(remainingSeconds)} (${remainingMinutesRounded}/${part.recommendedMinutes} mnt)`}
            </span>
            <span className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-warning-container px-3 py-1.5 font-mono tabular-nums text-on-warning-container">
              <Zap
                className="h-3.5 w-3.5 fill-amber-400 text-amber-500"
                aria-hidden="true"
              />
              +{part.xpReward} XP
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              BAGIAN {part.order} · WAJIB DIISI SEMUA
            </p>
            <h3 className="mt-0.5 font-display text-lg font-extrabold text-on-surface sm:text-xl">
              {part.title}
            </h3>
            <p className="mt-1 text-xs text-on-surface-variant">
              Timer bagian: {part.recommendedMinutes} menit · Jika keluar
              sebelum dikumpulkan, kamu bisa memilih simpan progres atau keluar
              tanpa simpan.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-surface-container px-4 py-2.5 sm:min-w-[190px]">
            <div className="flex items-center justify-between gap-3 text-xs font-bold">
              <span className="text-on-surface-variant">Terjawab</span>
              <span className="font-mono tabular-nums text-primary">
                {progress.answeredChoices}/{progress.totalChoices} Soal
              </span>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progres soal ${part.title}`}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {!isSubmitted && (isLowTime || isOverTime) && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${
            isOverTime
              ? 'border-primary/40 bg-primary-container text-on-primary-container'
              : 'border-warning/40 bg-warning-container text-on-warning-container'
          }`}
        >
          {isOverTime
            ? `Waktu anjuran ${part.recommendedMinutes} menit telah habis. Kamu tetap bisa menuntaskan soal dan mengumpulkan jawaban.`
            : `Perhatian: Sisa waktu bagian ini kurang dari 5 menit (${formatAudioTime(remainingSeconds)}).`}
        </div>
      )}

      {part.audioSrc && part.audioFileName && (
        <ChoukaiAudioPlayer
          key={part.audioSrc}
          src={part.audioSrc}
          fileName={part.audioFileName}
          title={`Audio Choukai — ${packetTitle}`}
          album={`${packetTitle} — Choukai`}
          preload="auto"
          initialTime={choukaiAudio?.currentTime ?? 0}
          initialPlaybackRate={choukaiAudio?.playbackRate ?? 1}
          onAudioStateChange={onAudioStateChange}
        />
      )}

      {isSubmitted ? (
        <section className="space-y-5 rounded-3xl border border-success/50 bg-surface-container-low p-4 shadow-xs sm:p-6">
          <div className="flex flex-col justify-between gap-4 border-b border-outline-variant pb-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success text-white">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-success">
                  Form Terkumpul · +{part.xpReward} XP
                </p>
                <h4 className="mt-0.5 font-display text-lg font-extrabold text-on-surface">
                  Ringkasan Jawaban {part.title}
                </h4>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {progress.answeredChoices} dari {progress.totalChoices} soal
                  terjawab · Waktu {formatAudioTime(elapsedSeconds)} ·{' '}
                  {flaggedChoices.length} ditandai ragu
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  onReopenPart();
                }}
                className="m3-tactile inline-flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-outline bg-surface-container px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ubah Jawaban</span>
              </button>
              <button
                type="button"
                onClick={onBack}
                className="m3-tactile inline-flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary-hover"
              >
                <span>Kembali ke Paket</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl bg-surface-container p-4 sm:p-5">
            {n2PartScore ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant">
                      Estimasi Skor JLPT N2 · {n2PartScore.japaneseLabel} ({examCode})
                    </p>
                    <p className="mt-0.5 font-display text-lg font-extrabold text-on-surface">
                      Benar {n2PartScore.correctCount} dari{' '}
                      {n2PartScore.totalQuestions} Soal
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-on-surface-variant">
                      <span className="font-mono tabular-nums">
                        Akurasi {n2PartScore.accuracyPercent}%
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Poin berbobot {n2PartScore.earnedRawPoints}/
                        {n2PartScore.maxRawPoints}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Ambang bagian {JLPT_N2_SECTION_PASS_MIN}/
                        {JLPT_N2_SECTION_MAX}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p
                      className={`font-mono text-2xl font-extrabold tabular-nums ${
                        n2PartScore.passedCutoff
                          ? 'text-success'
                          : 'text-primary'
                      }`}
                    >
                      {n2PartScore.scaledScore}
                      <span className="text-sm font-bold text-on-surface-variant">
                        /{JLPT_N2_SECTION_MAX}
                      </span>
                    </p>
                    <p
                      className={`mt-0.5 inline-flex items-center gap-1 text-xs font-bold ${
                        n2PartScore.passedCutoff
                          ? 'text-success'
                          : 'text-warning'
                      }`}
                    >
                      {n2PartScore.passedCutoff ? (
                        <>
                          <CheckCircle2
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>Memenuhi ambang ≥ 19/60</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>Di bawah ambang 19/60</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <div
                      className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high"
                      role="progressbar"
                      aria-valuenow={n2PartScore.scaledScore}
                      aria-valuemin={0}
                      aria-valuemax={JLPT_N2_SECTION_MAX}
                      aria-label={`Skor estimasi JLPT N2 ${part.title}: ${n2PartScore.scaledScore} dari ${JLPT_N2_SECTION_MAX}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          n2PartScore.scaledScore >= 30
                            ? 'bg-success'
                            : n2PartScore.passedCutoff
                              ? 'bg-warning'
                              : 'bg-primary'
                        }`}
                        style={{
                          width: `${Math.round(
                            (n2PartScore.scaledScore / JLPT_N2_SECTION_MAX) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-on-surface/55"
                      style={{
                        left: `${(JLPT_N2_SECTION_PASS_MIN / JLPT_N2_SECTION_MAX) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] tabular-nums text-on-surface-variant">
                    <span>0</span>
                    <span>Ambang 19</span>
                    <span>Target 30+</span>
                    <span>60</span>
                  </div>
                </div>

                {n2PartScore.mondaiBreakdown.length > 0 && (
                  <div className="border-t border-outline-variant pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        setShowMondaiBreakdown((prev) => !prev);
                      }}
                      aria-expanded={showMondaiBreakdown}
                      className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left text-xs font-bold text-on-surface hover:text-primary"
                    >
                      <span>
                        Rincian Bobot per Mondai (
                        {n2PartScore.mondaiBreakdown.length} Mondai · Menyesuaikan{' '}
                        {n2PartScore.totalQuestions} Soal)
                      </span>
                      {showMondaiBreakdown ? (
                        <ChevronUp
                          className="h-4 w-4 shrink-0 text-on-surface-variant"
                          aria-hidden="true"
                        />
                      ) : (
                        <ChevronDown
                          className="h-4 w-4 shrink-0 text-on-surface-variant"
                          aria-hidden="true"
                        />
                      )}
                    </button>

                    {showMondaiBreakdown && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-outline-variant text-[11px] font-semibold text-on-surface-variant">
                              <th className="py-2 pr-1.5 font-semibold sm:pr-2">
                                Mondai
                              </th>
                              <th className="whitespace-nowrap px-1.5 py-2 text-right font-semibold sm:px-2">
                                Bobot
                              </th>
                              <th className="whitespace-nowrap px-1.5 py-2 text-right font-semibold sm:px-2">
                                Benar
                              </th>
                              <th className="whitespace-nowrap py-2 pl-1.5 text-right font-semibold sm:pl-2">
                                Poin
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/60">
                            {n2PartScore.mondaiBreakdown.map((row) => (
                              <tr key={row.pageId}>
                                <td className="py-2 pr-1.5 font-medium text-on-surface sm:pr-2">
                                  {row.title}
                                </td>
                                <td className="whitespace-nowrap px-1.5 py-2 text-right font-mono text-[11px] tabular-nums text-on-surface-variant sm:px-2 sm:text-xs">
                                  {row.weightLabel}
                                </td>
                                <td className="whitespace-nowrap px-1.5 py-2 text-right font-mono tabular-nums text-on-surface sm:px-2">
                                  {row.correctCount}/{row.totalQuestions}
                                </td>
                                <td className="whitespace-nowrap py-2 pl-1.5 text-right font-mono font-bold tabular-nums text-on-surface sm:pl-2">
                                  {row.earnedRawPoints}/{row.maxRawPoints}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-outline-variant font-bold text-on-surface">
                              <td className="pt-2.5 pr-1.5 sm:pr-2">
                                Total (× 60 ÷ {n2PartScore.maxRawPoints})
                              </td>
                              <td className="px-1.5 pt-2.5 text-right font-mono text-on-surface-variant sm:px-2">
                                —
                              </td>
                              <td className="whitespace-nowrap px-1.5 pt-2.5 text-right font-mono tabular-nums sm:px-2">
                                {n2PartScore.correctCount}/
                                {n2PartScore.totalQuestions}
                              </td>
                              <td className="whitespace-nowrap pt-2.5 pl-1.5 text-right font-mono tabular-nums text-primary sm:pl-2">
                                {n2PartScore.earnedRawPoints}/
                                {n2PartScore.maxRawPoints}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant">
                      Skor Otomatis (Kunci Resmi {levelLabel} {examCode})
                    </p>
                    <p className="mt-0.5 font-display text-lg font-extrabold text-on-surface">
                      Benar {scoreSummary.correctCount} dari{' '}
                      {scoreSummary.totalGradable} Soal
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-mono text-2xl font-extrabold tabular-nums text-primary">
                      {scoreSummary.accuracyPercent}%
                    </p>
                    <p className="text-[11px] font-semibold text-on-surface-variant">
                      {scoreSummary.wrongItems.length} jawaban perlu ditinjau
                    </p>
                  </div>
                </div>
                <div
                  className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high"
                  role="progressbar"
                  aria-valuenow={scoreSummary.accuracyPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Skor ${part.title}`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      scoreSummary.accuracyPercent >= 60
                        ? 'bg-success'
                        : scoreSummary.accuracyPercent >= 45
                          ? 'bg-warning'
                          : 'bg-primary'
                    }`}
                    style={{ width: `${scoreSummary.accuracyPercent}%` }}
                  />
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/70 pt-3 text-[11px] text-on-surface-variant">
              <span>
                {scoreSummary.wrongItems.length} soal salah untuk ditinjau ·
                Otomatis tercatat ke grafik Try Out.
              </span>
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  onBack();
                }}
                className="font-bold text-primary hover:underline"
              >
                Lihat Ringkasan Paket →
              </button>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h5 className="font-display text-sm font-bold text-on-surface">
                Rekapan Pilihan Jawaban Anda
              </h5>

              <div className="inline-flex flex-wrap rounded-xl bg-surface-container p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setRecapFilter('all')}
                  className={`min-h-[40px] whitespace-nowrap rounded-lg px-3 font-semibold ${
                    recapFilter === 'all'
                      ? 'bg-surface-container-low text-on-surface shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  Semua ({allChoiceItems.length})
                </button>
                {wrongChoices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRecapFilter('wrong')}
                    className={`min-h-[40px] whitespace-nowrap rounded-lg px-3 font-semibold ${
                      recapFilter === 'wrong'
                        ? 'bg-primary-container text-on-primary-container'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    Salah ({wrongChoices.length})
                  </button>
                )}
                {flaggedChoices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRecapFilter('flagged')}
                    className={`min-h-[40px] whitespace-nowrap rounded-lg px-3 font-semibold ${
                      recapFilter === 'flagged'
                        ? 'bg-warning-container text-on-warning-container'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    Ragu ({flaggedChoices.length})
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
              {(recapFilter === 'flagged'
                ? flaggedChoices
                : recapFilter === 'wrong'
                  ? wrongChoices
                  : allChoiceItems
              ).map((it) => {
                const chosen = values[it.id] || '-';
                const isFlagged = flaggedIds.includes(it.id);
                const isCorrect =
                  Boolean(it.correctAnswer) && chosen === it.correctAnswer;
                if (isCorrect) {
                  return (
                    <div
                      key={it.id}
                      className="flex items-center justify-between rounded-xl border border-success/40 bg-success-container px-2.5 py-2 font-mono text-xs text-on-success-container"
                    >
                      <span className="inline-flex items-center gap-1 opacity-85">
                        #{it.number}
                        {isFlagged && (
                          <Flag
                            className="h-3 w-3"
                            aria-label="Ditandai ragu"
                          />
                        )}
                      </span>
                      <span className="font-bold">{chosen} ✓</span>
                    </div>
                  );
                }
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      setFocusedWrongItemId(it.id);
                    }}
                    title={`Lihat pembahasan Soal #${it.number}`}
                    className="m3-tactile flex items-center justify-between rounded-xl border border-primary/40 bg-primary-container px-2.5 py-2 font-mono text-xs text-on-primary-container hover:border-primary"
                  >
                    <span className="inline-flex items-center gap-1 opacity-85">
                      #{it.number}
                      {isFlagged && (
                        <Flag className="h-3 w-3" aria-label="Ditandai ragu" />
                      )}
                    </span>
                    <span className="font-bold">
                      {chosen}→{it.correctAnswer}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <TryOutWrongReviewSection
            levelLabel={levelLabel}
            examCode={examCode}
            partId={part.id}
            partTitle={part.title}
            totalGradable={scoreSummary.totalGradable}
            wrongItems={scoreSummary.wrongItems}
            choiceItemById={choiceItemById}
            focusedWrongItemId={focusedWrongItemId}
            onFocusHandled={() => setFocusedWrongItemId(null)}
          />

          {part.id === 'choukai' &&
            choukaiTranscript &&
            choukaiTranscript.length > 0 && (
              <ChoukaiTranscriptPanel
                packetTitle={packetTitle}
                sections={choukaiTranscript}
                defaultOpen
              />
            )}
        </section>
      ) : (
        <>
          <nav
            aria-label="Navigasi halaman soal"
            className="rounded-2xl border border-outline-variant bg-surface-container-low p-2.5 shadow-xs"
          >
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
              {pages.map((pg, idx) => {
                const pgProgress = evaluatePartFormProgress([pg], values);
                const isDonePage = pgProgress.isReadyToSubmit;
                const isActive = idx === pageIndex;
                const isLockedFuture =
                  idx > pageIndex && idx > firstIncompletePageIndex;

                return (
                  <button
                    key={pg.id}
                    type="button"
                    onClick={() => handleGoPage(idx)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`m3-tactile inline-flex min-h-[48px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-xs'
                        : isDonePage
                          ? 'bg-success-container text-on-success-container hover:opacity-90'
                          : isLockedFuture
                            ? 'bg-surface-container text-on-surface-variant/60'
                            : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {isDonePage ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : isLockedFuture ? (
                      <Lock className="h-3 w-3" aria-hidden="true" />
                    ) : null}
                    <span>Hal {idx + 1}</span>
                    {pgProgress.totalChoices > 0 && (
                      <span
                        className={`font-mono text-[10px] tabular-nums ${
                          isActive ? 'text-on-primary/90' : 'opacity-75'
                        }`}
                      >
                        ({pgProgress.answeredChoices}/{pgProgress.totalChoices})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <section className="rounded-3xl border border-outline-variant bg-surface-container-low p-4 shadow-xs sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
              <div>
                <p className="font-mono text-xs font-bold text-primary">
                  Halaman {pageIndex + 1} dari {pages.length}
                </p>
                <h4 className="mt-0.5 font-display text-base font-extrabold text-on-surface sm:text-lg">
                  {currentPage.title}
                </h4>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {currentPage.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setValidationError(null);
                  setShowMissingHighlight(false);
                  setPageIndex(0);
                  setElapsedSeconds(0);
                  elapsedRef.current = 0;
                  lastSyncedElapsedRef.current = 0;
                  onElapsedChangeRef.current(0);
                  onResetPartValues();
                }}
                className="m3-tactile inline-flex min-h-[48px] items-center gap-1.5 whitespace-nowrap rounded-2xl border border-outline bg-surface-container px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset Isian</span>
              </button>
            </div>

            <div className="sticky top-[calc(3.75rem+env(safe-area-inset-top,0px))] z-20 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/30 bg-surface-container-high/95 px-3.5 py-2 backdrop-blur-xs lg:top-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 font-mono font-bold tabular-nums ${
                    isOverTime
                      ? 'bg-primary text-on-primary'
                      : isLowTime
                        ? 'bg-warning-container text-on-warning-container'
                        : 'bg-surface-container-low text-on-surface'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {isOverTime
                      ? `Lewat +${formatAudioTime(elapsedSeconds - recommendedSeconds)}`
                      : `Sisa ${formatAudioTime(remainingSeconds)}`}
                  </span>
                </span>
                <span className="font-semibold text-on-surface-variant">
                  Batas {part.recommendedMinutes} menit · Hal {pageIndex + 1}/
                  {pages.length}
                </span>
              </div>

              {currentPageSheets.length > 0 && (
                <button
                  type="button"
                  onClick={() => openSheetModal(0)}
                  className="m3-tactile inline-flex min-h-[48px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-on-primary hover:bg-primary-hover"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Lihat Lembar Soal ({currentPageSheets.length})</span>
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {currentPage.items.map((item) => {
                if (item.kind === 'text') {
                  const val = values[item.id] ?? '';
                  const isMissing =
                    showMissingHighlight && val.trim().length === 0;
                  return (
                    <div
                      key={item.id}
                      data-field-id={item.id}
                      className={`rounded-2xl p-4 transition-colors ${
                        isMissing
                          ? 'border border-primary bg-primary-container/35'
                          : 'bg-surface-container'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label
                          htmlFor={item.id}
                          className="block text-sm font-bold text-on-surface"
                        >
                          {item.label}
                          <span className="ml-1 text-primary" aria-hidden="true">
                            *
                          </span>
                        </label>
                        {isMissing && (
                          <span className="text-xs font-bold text-primary">
                            Wajib diisi
                          </span>
                        )}
                      </div>
                      <input
                        id={item.id}
                        type="text"
                        value={val}
                        onChange={(e) => {
                          setValidationError(null);
                          onChangeValue(item.id, e.target.value);
                        }}
                        placeholder={item.placeholder}
                        required
                        className={`mt-2.5 min-h-[48px] w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none ${
                          isMissing ? 'border-primary' : 'border-outline'
                        }`}
                      />
                    </div>
                  );
                }

                if (item.kind === 'date') {
                  const val = values[item.id] ?? '';
                  const isMissing =
                    showMissingHighlight && val.trim().length === 0;
                  return (
                    <div
                      key={item.id}
                      data-field-id={item.id}
                      className={`rounded-2xl p-4 transition-colors ${
                        isMissing
                          ? 'border border-primary bg-primary-container/35'
                          : 'bg-surface-container'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label
                          htmlFor={item.id}
                          className="block text-sm font-bold text-on-surface"
                        >
                          {item.label}
                          <span className="ml-1 text-primary" aria-hidden="true">
                            *
                          </span>
                        </label>
                        {isMissing && (
                          <span className="text-xs font-bold text-primary">
                            Wajib diisi
                          </span>
                        )}
                      </div>
                      <input
                        id={item.id}
                        type="date"
                        value={val}
                        onChange={(e) => {
                          setValidationError(null);
                          onChangeValue(item.id, e.target.value);
                        }}
                        required
                        className={`mt-2.5 min-h-[48px] w-full max-w-xs rounded-xl border bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none ${
                          isMissing ? 'border-primary' : 'border-outline'
                        }`}
                      />
                    </div>
                  );
                }

                if (item.kind === 'notice') {
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-warning-container p-4 text-on-warning-container sm:p-5"
                    >
                      <h5 className="font-display text-sm font-extrabold">
                        {item.title}
                      </h5>
                      <ul className="mt-2.5 space-y-2 text-xs leading-relaxed opacity-95 sm:text-sm">
                        {item.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2">
                            <span
                              aria-hidden="true"
                              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
                            />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                if (item.kind === 'passage') {
                  return (
                    <article
                      key={item.id}
                      className="space-y-3 rounded-2xl border border-outline-variant bg-surface-container p-4 sm:p-5"
                    >
                      {item.title && (
                        <h5 className="font-display text-sm font-extrabold text-primary sm:text-base">
                          {item.title}
                        </h5>
                      )}
                      {item.subtitle && (
                        <p className="text-xs font-medium leading-relaxed text-on-surface-variant sm:text-sm">
                          {renderUnderlinedJapanese(item.subtitle)}
                        </p>
                      )}
                      {item.paragraphs.length > 0 && (
                        <div className="space-y-3">
                          {item.paragraphs.map((paragraph, pIdx) => (
                            <p
                              key={pIdx}
                              className="whitespace-pre-line text-sm leading-relaxed text-on-surface sm:text-[15px]"
                            >
                              {renderUnderlinedJapanese(paragraph)}
                            </p>
                          ))}
                        </div>
                      )}
                      {item.sections && item.sections.length > 0 && (
                        <div className="space-y-3">
                          {item.sections.map((section, sIdx) => (
                            <div
                              key={sIdx}
                              className="space-y-2 rounded-xl border border-outline-variant bg-surface-container-low p-3.5 sm:p-4"
                            >
                              <h6 className="font-display text-xs font-extrabold tracking-wide text-on-surface sm:text-sm">
                                {section.heading}
                              </h6>
                              {section.lines.map((line, lIdx) => (
                                <p
                                  key={lIdx}
                                  className="whitespace-pre-line text-sm leading-relaxed text-on-surface"
                                >
                                  {renderUnderlinedJapanese(line)}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                      {item.notes && item.notes.length > 0 && (
                        <div className="space-y-1 border-t border-outline-variant pt-2.5 text-xs leading-relaxed text-on-surface-variant">
                          {item.notes.map((note, nIdx) => (
                            <p key={nIdx}>{note}</p>
                          ))}
                        </div>
                      )}
                      {item.source && (
                        <p className="text-right text-[11px] font-medium text-on-surface-variant">
                          {item.source}
                        </p>
                      )}
                    </article>
                  );
                }

                if (item.kind === 'image') {
                  const sheetIdx = currentPageSheets.findIndex(
                    (s) => s.id === item.id,
                  );
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-outline-variant bg-surface-container-low p-2.5 shadow-xs sm:p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2 border-b border-outline-variant pb-2 text-xs text-on-surface-variant">
                        <span className="font-mono font-bold text-on-surface">
                          Lembar {sheetIdx >= 0 ? sheetIdx + 1 : 1}/
                          {currentPageSheets.length} · {levelLabel} {examCode}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            openSheetModal(sheetIdx >= 0 ? sheetIdx : 0)
                          }
                          className="m3-tactile inline-flex min-h-[48px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container-high"
                        >
                          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Perbesar</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          openSheetModal(sheetIdx >= 0 ? sheetIdx : 0)
                        }
                        aria-label={`Perbesar lembar soal ${sheetIdx + 1} ${currentPage.title}`}
                        className="block w-full cursor-zoom-in overflow-hidden rounded-lg bg-[#f6f5f0] p-1 text-left focus:outline-none focus:ring-2 focus:ring-primary dark:bg-[#eceae2]"
                      >
                        <img
                          src={item.image.src}
                          alt={`Lembar soal ${sheetIdx + 1} ${currentPage.title}`}
                          width={item.image.w}
                          height={item.image.h}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                          className="h-auto w-full select-none rounded-lg object-contain mix-blend-multiply"
                        />
                      </button>
                    </div>
                  );
                }

                const selectedVal = values[item.id] ?? '';
                const isAnswered = selectedVal.length > 0;
                const isMissing = showMissingHighlight && !isAnswered;
                const isFlagged = flaggedIds.includes(item.id);
                const hasOptionTexts =
                  Array.isArray(item.optionTexts) &&
                  item.optionTexts.length === item.options.length;
                const useTwoColsForTextOptions =
                  hasOptionTexts &&
                  item.optionTexts!.every((txt) => txt.length <= 16);

                return (
                  <fieldset
                    key={item.id}
                    data-field-id={item.id}
                    className={`rounded-2xl p-4 transition-colors sm:p-5 ${
                      isMissing
                        ? 'border border-primary bg-primary-container/35'
                        : isAnswered
                          ? 'border border-outline-variant bg-surface-container-low'
                          : 'bg-surface-container'
                    }`}
                  >
                    <legend className="sr-only">{item.label}</legend>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-on-surface">
                        <span
                          className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg px-1.5 text-[11px] ${
                            isAnswered
                              ? 'bg-success text-white'
                              : isMissing
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container-high text-on-surface'
                          }`}
                        >
                          {item.number}
                        </span>
                        <span>{item.label}</span>
                        <span className="text-primary" aria-hidden="true">
                          *
                        </span>
                      </span>

                      <div className="flex items-center gap-2">
                        {isAnswered ? (
                          <span className="font-mono text-xs font-bold text-success">
                            Pilihan: {selectedVal}
                          </span>
                        ) : isMissing ? (
                          <span className="text-xs font-bold text-primary">
                            Wajib diisi
                          </span>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => {
                            vibrateTap();
                            onToggleFlag(item.id);
                          }}
                          aria-pressed={isFlagged}
                          aria-label={
                            isFlagged
                              ? `Hapus tanda ragu pada ${item.label}`
                              : `Tandai ragu pada ${item.label}`
                          }
                          className={`m3-tactile inline-flex min-h-[48px] items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold ${
                            isFlagged
                              ? 'bg-warning-container text-on-warning-container'
                              : 'text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="hidden min-[380px]:inline">Ragu</span>
                        </button>
                      </div>
                    </div>

                    {item.prompt && (
                      <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-relaxed text-on-surface sm:text-[15px]">
                        {renderUnderlinedJapanese(item.prompt)}
                      </p>
                    )}

                    {item.image && (() => {
                      const choiceSheetIdx = currentPageSheets.findIndex(
                        (s) => s.id === item.id,
                      );
                      return (
                        <div className="mt-3 rounded-xl border border-outline-variant bg-surface-container-low p-2.5 shadow-xs sm:p-3.5">
                          <div className="mb-2 flex items-center justify-between gap-2 border-b border-outline-variant pb-2 text-xs text-on-surface-variant">
                            <span className="font-mono font-bold text-on-surface">
                              Ilustrasi Soal · {item.label}
                            </span>
                            {choiceSheetIdx >= 0 && (
                              <button
                                type="button"
                                onClick={() => openSheetModal(choiceSheetIdx)}
                                className="m3-tactile inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container-high"
                              >
                                <Maximize2
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                <span>Perbesar</span>
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (choiceSheetIdx >= 0) {
                                openSheetModal(choiceSheetIdx);
                              }
                            }}
                            aria-label={`Perbesar ilustrasi ${item.label}`}
                            className="flex w-full cursor-zoom-in justify-center overflow-hidden rounded-lg bg-[#f6f5f0] p-1.5 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-[#eceae2]"
                          >
                            <img
                              src={item.image.src}
                              alt={`Ilustrasi ${item.label} — ${part.title}`}
                              width={item.image.w}
                              height={item.image.h}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              draggable={false}
                              onContextMenu={(e) => e.preventDefault()}
                              className="mx-auto h-auto max-h-[340px] w-auto max-w-full select-none rounded-lg object-contain mix-blend-multiply"
                            />
                          </button>
                        </div>
                      );
                    })()}

                    {hasOptionTexts ? (
                      <div
                        role="radiogroup"
                        aria-label={item.label}
                        className={`mt-3 grid gap-2 ${
                          useTwoColsForTextOptions
                            ? 'grid-cols-1 min-[380px]:grid-cols-2'
                            : 'grid-cols-1'
                        }`}
                      >
                        {item.options.map((opt, optIdx) => {
                          const checked = selectedVal === opt;
                          const optionText = item.optionTexts![optIdx] ?? '';
                          return (
                            <button
                              key={opt}
                              type="button"
                              role="radio"
                              aria-checked={checked}
                              onClick={() => {
                                vibrateTap();
                                setValidationError(null);
                                onChangeValue(item.id, opt);
                              }}
                              className={`m3-tactile flex min-h-[52px] w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                                checked
                                  ? 'border-primary bg-primary text-on-primary shadow-xs'
                                  : isMissing
                                    ? 'border-primary/60 bg-surface-container-low text-on-surface hover:border-primary'
                                    : 'border-outline bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                              }`}
                            >
                              <span
                                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-extrabold ${
                                  checked
                                    ? 'bg-on-primary text-primary'
                                    : 'bg-surface-container-high text-on-surface'
                                }`}
                              >
                                {opt}
                              </span>
                              <span className="flex-1 text-sm font-medium leading-relaxed">
                                {renderUnderlinedJapanese(optionText, checked)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        role="radiogroup"
                        aria-label={item.label}
                        className={`mt-3 grid gap-2 ${
                          item.options.length === 3
                            ? 'grid-cols-3'
                            : 'grid-cols-4'
                        }`}
                      >
                        {item.options.map((opt) => {
                          const checked = selectedVal === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              role="radio"
                              aria-checked={checked}
                              onClick={() => {
                                vibrateTap();
                                setValidationError(null);
                                onChangeValue(item.id, opt);
                              }}
                              className={`m3-tactile flex min-h-[52px] items-center justify-center rounded-xl border font-mono text-sm font-extrabold ${
                                checked
                                  ? 'border-primary bg-primary text-on-primary shadow-xs'
                                  : isMissing
                                    ? 'border-primary/60 bg-surface-container-low text-on-surface hover:border-primary'
                                    : 'border-outline bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </fieldset>
                );
              })}
            </div>

            {validationError && (
              <div
                role="alert"
                className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-primary/40 bg-primary-container p-4 text-xs text-on-primary-container sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <p className="font-semibold leading-relaxed">
                    {validationError.message}
                  </p>
                </div>
                {validationError.firstMissingPageIndex !== pageIndex && (
                  <button
                    type="button"
                    onClick={() =>
                      handleGoPage(validationError.firstMissingPageIndex)
                    }
                    className="m3-tactile min-h-[48px] shrink-0 whitespace-nowrap rounded-xl bg-primary px-3.5 py-2 font-bold text-on-primary hover:bg-primary-hover"
                  >
                    Buka Halaman {validationError.firstMissingPageIndex + 1}
                  </button>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5 border-t border-outline-variant pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {pageIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => handleGoPage(pageIndex - 1)}
                    className="m3-tactile inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-outline bg-surface-container px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container-high sm:flex-none"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Sebelumnya</span>
                  </button>
                )}
                {!isLastPage && (
                  <button
                    type="button"
                    onClick={handleNextPage}
                    className="m3-tactile inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-inverse-surface px-5 py-2.5 text-xs font-bold text-inverse-on-surface hover:opacity-90 sm:flex-none"
                  >
                    <span>Berikutnya</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {isLastPage ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="m3-tactile inline-flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary hover:bg-primary-hover"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Kumpulkan Jawaban</span>
                </button>
              ) : (
                <p className="text-xs font-medium text-on-surface-variant">
                  Sisa {currentPageProgress.missingRequired.length} isian wajib
                  pada halaman ini
                </p>
              )}
            </div>
          </section>
        </>
      )}

      {sheetModalIndex !== null && currentPageSheets[sheetModalIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Penampil Lembar Soal ${levelLabel} ${examCode}`}
          className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white pt-safe pb-safe"
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/15 bg-black/70 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate font-mono text-xs font-bold text-white">
                {currentPageSheets[sheetModalIndex].label} · {levelLabel}{' '}
                {examCode}
              </p>
              <p className="truncate text-[11px] text-white/75">
                {part.title}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setSheetZoom((z) => (z === 1 ? 1.5 : z === 1.5 ? 2 : 1));
                }}
                aria-label={`Ubah tingkat zoom, saat ini ${sheetZoom}x`}
                className="inline-flex min-h-[48px] items-center gap-1 whitespace-nowrap rounded-xl border border-white/25 bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/20"
              >
                {sheetZoom > 1 ? (
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="font-mono">{sheetZoom}x</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  closeSheetModal();
                }}
                aria-label="Tutup penampil lembar soal"
                className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-1 rounded-xl bg-primary px-3 text-xs font-bold text-on-primary hover:bg-primary-hover"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Tutup</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2 sm:p-4">
            <div
              className="mx-auto bg-white p-1.5 shadow-lg"
              style={{ width: `${sheetZoom * 100}%`, maxWidth: sheetZoom === 1 ? '900px' : 'none' }}
            >
              {(() => {
                const activeSheet = currentPageSheets[sheetModalIndex];
                return (
                  <img
                    src={activeSheet.image.src}
                    alt={`${activeSheet.label} ${levelLabel} ${examCode}`}
                    width={activeSheet.image.w}
                    height={activeSheet.image.h}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className="h-auto w-full select-none bg-white object-contain"
                  />
                );
              })()}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-white/15 bg-black/80 px-3 py-2">
            <button
              type="button"
              disabled={sheetModalIndex <= 0}
              onClick={() => {
                vibrateTap();
                setSheetModalIndex((i) => (i !== null ? Math.max(0, i - 1) : 0));
              }}
              className="inline-flex min-h-[48px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/25 bg-white/10 px-4 text-xs font-bold text-white disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Lembar Prev</span>
            </button>

            <span className="font-mono text-xs font-bold tabular-nums text-white/85">
              {sheetModalIndex + 1} / {currentPageSheets.length}
            </span>

            <button
              type="button"
              disabled={sheetModalIndex >= currentPageSheets.length - 1}
              onClick={() => {
                vibrateTap();
                setSheetModalIndex((i) =>
                  i !== null
                    ? Math.min(currentPageSheets.length - 1, i + 1)
                    : 0,
                );
              }}
              className="inline-flex min-h-[48px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/25 bg-white/10 px-4 text-xs font-bold text-white disabled:opacity-40"
            >
              <span>Lembar Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
