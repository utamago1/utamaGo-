import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Lightbulb,
  Loader2,
  RefreshCw,
  Square,
  XCircle,
} from 'lucide-react';
import type { TryOutFormItem } from '../data/tryOutN2Data';
import {
  buildTryOutExplanationCacheKey,
  fetchTryOutWrongExplanation,
  getCachedTryOutExplanation,
  type TryOutQuestionExplanation,
} from '../services/tryOutExplanation';
import { vibrateError, vibrateSuccess, vibrateTap } from '../utils/haptics';
import type {
  TryOutPacketPartId,
  WrongAnswerDetail,
} from '../utils/tryOutPacket';

type ChoiceFormItem = Extract<TryOutFormItem, { kind: 'choice' }>;

interface TryOutWrongReviewSectionProps {
  levelLabel: string;
  examCode: string;
  partId: TryOutPacketPartId;
  partTitle: string;
  totalGradable: number;
  wrongItems: WrongAnswerDetail[];
  choiceItemById: Map<string, ChoiceFormItem>;
  focusedWrongItemId?: string | null;
  onFocusHandled?: () => void;
}

function renderUnderlinedJapanese(text: string) {
  const parts = text.split(/(\[\[.*?\]\])/g);
  if (parts.length === 1) return text;
  return parts.map((segment, index) => {
    if (segment.startsWith('[[') && segment.endsWith(']]')) {
      const inner = segment.slice(2, -2);
      return (
        <span
          key={index}
          className="font-bold underline decoration-primary decoration-2 underline-offset-4"
        >
          {inner}
        </span>
      );
    }
    return <span key={index}>{segment}</span>;
  });
}

const MAX_BATCH_PER_CLICK = 8;

export function TryOutWrongReviewSection({
  levelLabel,
  examCode,
  partId,
  partTitle,
  totalGradable,
  wrongItems,
  choiceItemById,
  focusedWrongItemId,
  onFocusHandled,
}: TryOutWrongReviewSectionProps) {
  const [explanations, setExplanations] = useState<
    Record<string, TryOutQuestionExplanation>
  >({});
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [openPassageIds, setOpenPassageIds] = useState<Record<string, boolean>>(
    {},
  );
  const [openTranscriptIds, setOpenTranscriptIds] = useState<
    Record<string, boolean>
  >({});
  const [batchProgress, setBatchProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const mountedRef = useRef(true);
  const cancelBatchRef = useRef(false);
  const autoLoadedFirstKeyRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelBatchRef.current = true;
    };
  }, []);

  const cacheKeysByItemId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const wrong of wrongItems) {
      map[wrong.itemId] = buildTryOutExplanationCacheKey({
        levelLabel,
        examCode,
        partId,
        itemId: wrong.itemId,
        chosen: wrong.chosen,
        correct: wrong.correct,
      });
    }
    return map;
  }, [examCode, levelLabel, partId, wrongItems]);

  // Hydrate any cached explanations from localStorage immediately
  useEffect(() => {
    const hydrated: Record<string, TryOutQuestionExplanation> = {};
    for (const wrong of wrongItems) {
      const key = cacheKeysByItemId[wrong.itemId];
      if (!key) continue;
      const cached = getCachedTryOutExplanation(key);
      if (cached) {
        hydrated[wrong.itemId] = cached;
      }
    }
    if (Object.keys(hydrated).length > 0) {
      setExplanations((prev) => ({ ...hydrated, ...prev }));
    }
  }, [cacheKeysByItemId, wrongItems]);

  const loadExplanationForWrong = useCallback(
    async (wrong: WrongAnswerDetail, silent = false): Promise<boolean> => {
      const id = wrong.itemId;
      setLoadingIds((prev) => ({ ...prev, [id]: true }));
      setErrorById((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setCollapsedIds((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });

      try {
        const result = await fetchTryOutWrongExplanation({
          levelLabel,
          examCode,
          partId,
          itemId: wrong.itemId,
          questionNumber: wrong.number,
          mondaiTitle: wrong.pageTitle,
          mondaiInstruction: wrong.mondaiInstruction,
          prompt: wrong.prompt,
          options: wrong.optionTexts,
          chosen: wrong.chosen,
          chosenText: wrong.chosenText,
          correct: wrong.correct,
          correctText: wrong.correctText,
          passageContext: wrong.passageContext,
          transcript: wrong.transcript,
        });

        if (!mountedRef.current) return false;
        setExplanations((prev) => ({ ...prev, [id]: result }));
        if (!silent) vibrateSuccess();
        return true;
      } catch (err) {
        if (!mountedRef.current) return false;
        const message =
          err instanceof Error
            ? err.message
            : 'Gagal memuat pembahasan soal. Silakan coba lagi.';
        setErrorById((prev) => ({ ...prev, [id]: message }));
        if (!silent) vibrateError();
        return false;
      } finally {
        if (mountedRef.current) {
          setLoadingIds((prev) => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      }
    },
    [examCode, levelLabel, partId],
  );

  // Auto-load the first wrong question once so the user immediately sees why they missed it
  useEffect(() => {
    if (wrongItems.length === 0) return;
    const first = wrongItems[0];
    const firstKey = cacheKeysByItemId[first.itemId];
    if (!firstKey || autoLoadedFirstKeyRef.current === firstKey) return;
    autoLoadedFirstKeyRef.current = firstKey;

    if (getCachedTryOutExplanation(firstKey)) return;
    void loadExplanationForWrong(first, true);
  }, [cacheKeysByItemId, loadExplanationForWrong, wrongItems]);

  // Support jumping directly from a red tile in the recap grid
  useEffect(() => {
    if (!focusedWrongItemId) return;
    const targetWrong = wrongItems.find((w) => w.itemId === focusedWrongItemId);
    if (!targetWrong) return;

    const el = document.getElementById(`wrong-review-${focusedWrongItemId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setCollapsedIds((prev) => {
      if (!prev[focusedWrongItemId]) return prev;
      const next = { ...prev };
      delete next[focusedWrongItemId];
      return next;
    });
    if (
      !explanations[focusedWrongItemId] &&
      !loadingIds[focusedWrongItemId]
    ) {
      void loadExplanationForWrong(targetWrong, true);
    }
    onFocusHandled?.();
  }, [
    explanations,
    focusedWrongItemId,
    loadExplanationForWrong,
    loadingIds,
    onFocusHandled,
    wrongItems,
  ]);

  const unexplainedItems = useMemo(
    () =>
      wrongItems.filter(
        (w) => !explanations[w.itemId] && !loadingIds[w.itemId],
      ),
    [explanations, loadingIds, wrongItems],
  );

  const handleExplainBatch = async () => {
    if (batchProgress || unexplainedItems.length === 0) return;
    vibrateTap();
    cancelBatchRef.current = false;
    const targets = unexplainedItems.slice(0, MAX_BATCH_PER_CLICK);
    setBatchProgress({ done: 0, total: targets.length });

    let completed = 0;
    const concurrency = 2;
    let cursor = 0;

    const runWorker = async () => {
      while (cursor < targets.length && !cancelBatchRef.current && mountedRef.current) {
        const idx = cursor;
        cursor += 1;
        const item = targets[idx];
        await loadExplanationForWrong(item, true);
        completed += 1;
        if (mountedRef.current) {
          setBatchProgress({ done: completed, total: targets.length });
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => runWorker()));

    if (mountedRef.current) {
      setBatchProgress(null);
      if (!cancelBatchRef.current) vibrateSuccess();
    }
  };

  if (wrongItems.length === 0) {
    return (
      <div className="rounded-2xl bg-success-container p-4 text-xs font-semibold text-on-success-container">
        Sempurna! Semua {totalGradable} soal pada bagian ini dijawab benar
        (100%).
      </div>
    );
  }

  const batchLabel =
    unexplainedItems.length <= MAX_BATCH_PER_CLICK
      ? `Bahas Semua (${unexplainedItems.length})`
      : `Bahas ${MAX_BATCH_PER_CLICK} Berikutnya (${unexplainedItems.length} tersisa)`;

  return (
    <div className="space-y-3.5 rounded-2xl bg-surface-container p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <XCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <h5 className="font-display text-sm font-extrabold text-on-surface">
              Review &amp; Pembahasan Soal Salah ({wrongItems.length} Soal)
            </h5>
            <p className="mt-0.5 text-xs text-[#4b4b53] dark:text-[#b4b4c0]">
              Pelajari mengapa jawabanmu salah, alasan kunci benar, dan tips
              JLPT untuk tiap nomor.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {batchProgress ? (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                cancelBatchRef.current = true;
              }}
              className="m3-tactile inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-primary/40 bg-primary-container/50 px-3.5 py-2 text-xs font-bold text-on-primary-container"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <span className="font-mono tabular-nums">
                Membahas {batchProgress.done}/{batchProgress.total}
              </span>
              <Square className="ml-1 h-3 w-3 fill-current" aria-hidden="true" />
            </button>
          ) : unexplainedItems.length > 0 ? (
            <button
              type="button"
              onClick={() => void handleExplainBatch()}
              className="m3-tactile inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-hover"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{batchLabel}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Semua dibahas</span>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {wrongItems.map((wrong) => {
          const matchedChoice = choiceItemById.get(wrong.itemId);
          const explanation = explanations[wrong.itemId];
          const isLoading = Boolean(loadingIds[wrong.itemId]);
          const errorMsg = errorById[wrong.itemId];
          const isCollapsed = Boolean(collapsedIds[wrong.itemId]);
          const isPassageOpen = Boolean(openPassageIds[wrong.itemId]);
          const isTranscriptOpen = Boolean(openTranscriptIds[wrong.itemId]);
          const hasOptions = Boolean(
            wrong.optionTexts && wrong.optionTexts.length > 0,
          );

          return (
            <article
              key={wrong.itemId}
              id={`wrong-review-${wrong.itemId}`}
              className="space-y-3 rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-xs"
            >
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs font-bold text-primary">
                  #{wrong.number} · {wrong.label}
                </p>
                {wrong.pageTitle && (
                  <span className="text-[11px] font-semibold text-[#4b4b53] dark:text-[#b4b4c0]">
                    {wrong.pageTitle}
                  </span>
                )}
              </div>

              {/* Prompt */}
              {wrong.prompt && (
                <p className="whitespace-pre-line text-sm font-semibold leading-relaxed text-on-surface">
                  {renderUnderlinedJapanese(wrong.prompt)}
                </p>
              )}

              {/* Optional Illustration */}
              {matchedChoice?.image && (
                <div className="flex justify-center rounded-xl border border-outline-variant bg-[#f6f5f0] p-2.5 dark:bg-[#eceae2]">
                  <img
                    src={matchedChoice.image.src}
                    alt={`Ilustrasi ${wrong.label} — ${partTitle}`}
                    width={matchedChoice.image.w}
                    height={matchedChoice.image.h}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className="mx-auto h-auto max-h-[240px] w-auto max-w-full select-none rounded-lg object-contain mix-blend-multiply"
                  />
                </div>
              )}

              {/* Options Comparison */}
              {hasOptions ? (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {wrong.optionTexts!.map((optText, idx) => {
                    const numStr = String(idx + 1);
                    const isChosen = wrong.chosen === numStr;
                    const isCorrect = wrong.correct === numStr;
                    return (
                      <div
                        key={numStr}
                        className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed ${
                          isCorrect
                            ? 'border-success/55 bg-success-container/45 text-on-surface'
                            : isChosen
                              ? 'border-primary/50 bg-primary-container/35 text-on-surface'
                              : 'border-outline-variant/80 bg-surface text-[#4b4b53] dark:text-[#b4b4c0]'
                        }`}
                      >
                        <span
                          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold ${
                            isCorrect
                              ? 'bg-success text-white'
                              : isChosen
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container text-[#4b4b53] dark:text-[#b4b4c0]'
                          }`}
                        >
                          {numStr}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-on-surface">
                            {renderUnderlinedJapanese(optText)}
                          </span>
                          {isCorrect && (
                            <span className="ml-1.5 font-bold text-success">
                              · Kunci Benar
                            </span>
                          )}
                          {isChosen && (
                            <span className="ml-1.5 font-bold text-primary">
                              · Jawabanmu
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <div className="flex-1 rounded-xl border border-primary/45 bg-primary-container/30 px-3 py-2">
                    <span className="text-[11px] font-bold text-primary">
                      Jawabanmu
                    </span>
                    <p className="mt-0.5 font-mono text-sm font-extrabold text-on-surface">
                      Opsi {wrong.chosen}
                    </p>
                  </div>
                  <div className="flex-1 rounded-xl border border-success/50 bg-success-container/40 px-3 py-2">
                    <span className="text-[11px] font-bold text-success">
                      Kunci Benar
                    </span>
                    <p className="mt-0.5 font-mono text-sm font-extrabold text-on-surface">
                      Opsi {wrong.correct}
                    </p>
                  </div>
                </div>
              )}

              {/* Context Toggles (Reading Passage / Choukai Transcript) */}
              {(wrong.passageContext || wrong.transcript) && (
                <div className="flex flex-wrap gap-2">
                  {wrong.passageContext && (
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        setOpenPassageIds((prev) => ({
                          ...prev,
                          [wrong.itemId]: !prev[wrong.itemId],
                        }));
                      }}
                      aria-expanded={isPassageOpen}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-[11px] font-bold text-on-surface hover:bg-surface-container"
                    >
                      <FileText
                        className="h-3.5 w-3.5 text-primary"
                        aria-hidden="true"
                      />
                      <span>
                        {isPassageOpen
                          ? 'Tutup Wacana'
                          : 'Lihat Wacana Terkait'}
                      </span>
                      {isPassageOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronDown
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  )}

                  {wrong.transcript && (
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        setOpenTranscriptIds((prev) => ({
                          ...prev,
                          [wrong.itemId]: !prev[wrong.itemId],
                        }));
                      }}
                      aria-expanded={isTranscriptOpen}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-[11px] font-bold text-on-surface hover:bg-surface-container"
                    >
                      <BookOpen
                        className="h-3.5 w-3.5 text-primary"
                        aria-hidden="true"
                      />
                      <span>
                        {isTranscriptOpen
                          ? 'Tutup Transkrip'
                          : 'Lihat Transkrip Choukai (聴力原文)'}
                      </span>
                      {isTranscriptOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronDown
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  )}
                </div>
              )}

              {wrong.passageContext && isPassageOpen && (
                <div className="max-h-64 overflow-y-auto rounded-xl border border-outline-variant bg-surface p-3">
                  <p className="mb-1.5 text-[11px] font-bold text-primary">
                    Wacana Terkait
                  </p>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-on-surface">
                    {wrong.passageContext}
                  </p>
                </div>
              )}

              {wrong.transcript && isTranscriptOpen && (
                <div className="max-h-64 overflow-y-auto rounded-xl border border-outline-variant bg-surface p-3">
                  <p className="mb-1.5 text-[11px] font-bold text-primary">
                    Transkrip Choukai (聴力原文)
                  </p>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-on-surface">
                    {wrong.transcript}
                  </p>
                </div>
              )}

              {/* Pembahasan Area */}
              <div className="border-t border-outline-variant pt-3">
                {isLoading ? (
                  <div
                    role="status"
                    className="flex items-center gap-2.5 rounded-xl bg-surface px-3.5 py-3 text-xs font-medium text-[#4b4b53] dark:text-[#b4b4c0]"
                  >
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin text-primary"
                      aria-hidden="true"
                    />
                    <span>
                      Menyusun pembahasan mengapa jawabanmu salah untuk Soal #
                      {wrong.number}...
                    </span>
                  </div>
                ) : errorMsg ? (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-primary/35 bg-primary-container/40 px-3.5 py-2.5 text-xs text-on-primary-container"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <AlertCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span>{errorMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        void loadExplanationForWrong(wrong);
                      }}
                      className="m3-tactile inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg border border-outline bg-surface px-3 py-1 text-xs font-bold text-on-surface hover:bg-surface-container"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Coba Lagi</span>
                    </button>
                  </div>
                ) : explanation ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-extrabold text-on-surface">
                        Pembahasan{' '}
                        <span className="font-semibold text-primary">
                          · {explanation.focusTag}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          vibrateTap();
                          setCollapsedIds((prev) => ({
                            ...prev,
                            [wrong.itemId]: !prev[wrong.itemId],
                          }));
                        }}
                        aria-expanded={!isCollapsed}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-[#4b4b53] hover:text-on-surface dark:text-[#b4b4c0]"
                      >
                        <span>
                          {isCollapsed ? 'Tampilkan' : 'Sembunyikan'}
                        </span>
                        {isCollapsed ? (
                          <ChevronDown
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronUp
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </div>

                    {!isCollapsed && (
                      <div className="space-y-2.5 rounded-xl border border-outline-variant bg-surface p-3.5 text-xs leading-relaxed">
                        {explanation.questionMeaning && (
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-[#4b4b53] dark:text-[#b4b4c0]">
                              Arti &amp; Inti Soal
                            </p>
                            <p className="mt-0.5 text-on-surface">
                              {explanation.questionMeaning}
                            </p>
                          </div>
                        )}

                        <div className="border-l-2 border-primary pl-3">
                          <p className="text-[11px] font-bold text-primary">
                            Mengapa Jawabanmu (Opsi {wrong.chosen}) Salah
                          </p>
                          <p className="mt-0.5 whitespace-pre-line text-on-surface">
                            {explanation.whyChosenWrong}
                          </p>
                        </div>

                        <div className="border-l-2 border-success pl-3">
                          <p className="text-[11px] font-bold text-success">
                            Mengapa Kunci (Opsi {wrong.correct}) Benar
                          </p>
                          <p className="mt-0.5 whitespace-pre-line text-on-surface">
                            {explanation.whyCorrectRight}
                          </p>
                        </div>

                        {explanation.distractorNotes && (
                          <div className="border-t border-outline-variant/70 pt-2">
                            <p className="text-[11px] font-bold text-[#4b4b53] dark:text-[#b4b4c0]">
                              Catatan Opsi Lain
                            </p>
                            <p className="mt-0.5 whitespace-pre-line text-[#4b4b53] dark:text-[#b4b4c0]">
                              {explanation.distractorNotes}
                            </p>
                          </div>
                        )}

                        {explanation.studyTip && (
                          <div className="flex items-start gap-2 rounded-xl bg-surface-container px-3 py-2 text-on-surface">
                            <Lightbulb
                              className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                              aria-hidden="true"
                            />
                            <div>
                              <span className="font-bold">Tips JLPT: </span>
                              <span>{explanation.studyTip}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      void loadExplanationForWrong(wrong);
                    }}
                    className="m3-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:border-primary/50 hover:bg-surface-container sm:w-auto"
                  >
                    <HelpCircle
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                    <span>Lihat Pembahasan — Mengapa Salah?</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
