import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  RotateCcw,
  Shuffle,
  Star,
  Trophy,
  XCircle,
} from 'lucide-react';
import type { ChallengeStage } from '../data/challengeLevels';
import { vibrateError, vibrateSuccess, vibrateTap } from '../utils/haptics';
import {
  evaluateChallengeResult,
  type ChallengeEvaluation,
} from '../utils/levelProgression';
import { BunpouExplanation } from './BunpouExplanation';

interface ChallengeRunnerModalProps {
  stage: ChallengeStage;
  previousBestStars: number;
  hasNextStage: boolean;
  unlimitedHearts?: boolean;
  useFormattedExplanation?: boolean;
  headerLabel?: string;
  closeButtonLabel?: string;
  onShuffleNewSet?: () => void;
  onComplete: (stage: ChallengeStage, evaluation: ChallengeEvaluation) => void;
  onProgressChange?: (hasUnfinishedProgress: boolean) => void;
  onNextStage: () => void;
  onClose: () => void;
}

const MAX_HEARTS = 3;
const OPTION_KEYS = ['A', 'B', 'C', 'D'];
const POPUP_DISMISS_GUARD_MS = 160;

export function ChallengeRunnerModal({
  stage,
  previousBestStars,
  hasNextStage,
  unlimitedHearts = false,
  useFormattedExplanation = false,
  headerLabel,
  closeButtonLabel,
  onShuffleNewSet,
  onComplete,
  onProgressChange,
  onNextStage,
  onClose,
}: ChallengeRunnerModalProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [correctCount, setCorrectCount] = useState(0);
  const [answersById, setAnswersById] = useState<Record<string, number>>({});
  const [evaluation, setEvaluation] = useState<ChallengeEvaluation | null>(null);
  const checkedAtRef = useRef<number>(0);

  const currentQuestion = stage.questions[questionIndex];
  const isCorrectChoice =
    checked &&
    selectedOption !== null &&
    selectedOption === currentQuestion.correctIndex;

  const progressPercent = evaluation
    ? 100
    : Math.round(
        ((questionIndex + (checked ? 1 : 0)) / stage.questions.length) * 100,
      );

  const wrongQuestions = evaluation
    ? stage.questions.filter(
        (q) =>
          typeof answersById[q.id] === 'number' &&
          answersById[q.id] !== q.correctIndex,
      )
    : [];

  const resolvedHeaderLabel =
    headerLabel ?? `Level ${stage.order} · ${stage.jlptLevel}`;
  const resolvedCloseLabel = closeButtonLabel ?? 'Kembali ke Peta Level';
  const resolvedShortCloseLabel = closeButtonLabel ?? 'Peta Level';

  const finishStage = useCallback(
    (finalCorrect: number, finalHearts: number) => {
      const safeTotal = Math.max(1, stage.questions.length);
      const result = unlimitedHearts
        ? (() => {
            const accuracy = Math.round((finalCorrect / safeTotal) * 100);
            const stars: 0 | 1 | 2 | 3 =
              accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : finalCorrect > 0 ? 1 : 0;
            const xpAwarded = Math.max(
              15,
              Math.round((stage.xpReward * Math.max(25, accuracy)) / 100),
            );
            return {
              correctCount: finalCorrect,
              totalQuestions: safeTotal,
              accuracy,
              passed: true,
              stars,
              xpAwarded,
            };
          })()
        : evaluateChallengeResult({
            correctCount: finalCorrect,
            totalQuestions: stage.questions.length,
            heartsRemaining: finalHearts,
            baseXpReward: stage.xpReward,
            previousBestStars,
          });
      setEvaluation(result);
      onProgressChange?.(false);
      onComplete(stage, result);
    },
    [
      onComplete,
      onProgressChange,
      previousBestStars,
      stage,
      unlimitedHearts,
    ],
  );

  // One-tap instant evaluation: clicking an option immediately checks and opens the feedback pop-up
  const handleSelectOption = useCallback(
    (idx: number) => {
      if (checked || evaluation) return;
      const isCorrect = idx === currentQuestion.correctIndex;
      checkedAtRef.current = Date.now();
      setSelectedOption(idx);
      setChecked(true);
      setAnswersById((prev) => ({ ...prev, [currentQuestion.id]: idx }));
      onProgressChange?.(true);

      if (isCorrect) {
        vibrateSuccess();
        setCorrectCount((prev) => prev + 1);
      } else {
        vibrateError();
        if (!unlimitedHearts) {
          setHearts((prev) => Math.max(0, prev - 1));
        }
      }
    },
    [checked, currentQuestion, evaluation, onProgressChange, unlimitedHearts],
  );

  const handleAdvance = useCallback(() => {
    if (!checked || evaluation) return;
    if (Date.now() - checkedAtRef.current < POPUP_DISMISS_GUARD_MS) return;
    vibrateTap();

    if (!unlimitedHearts && hearts <= 0) {
      finishStage(correctCount, 0);
      return;
    }

    const isLast = questionIndex + 1 >= stage.questions.length;
    if (isLast) {
      finishStage(correctCount, unlimitedHearts ? MAX_HEARTS : hearts);
      return;
    }

    setQuestionIndex((prev) => prev + 1);
    setSelectedOption(null);
    setChecked(false);
  }, [
    checked,
    correctCount,
    evaluation,
    finishStage,
    hearts,
    questionIndex,
    stage.questions.length,
    unlimitedHearts,
  ]);

  // Keyboard support: 1-4 / A-D to pick an option, Enter/Space/Escape to dismiss pop-up & advance
  useEffect(() => {
    if (evaluation) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (checked) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          handleAdvance();
        }
        return;
      }
      const key = e.key.toUpperCase();
      const idx =
        key >= '1' && key <= '4'
          ? Number(key) - 1
          : OPTION_KEYS.indexOf(key);
      if (idx >= 0 && idx < currentQuestion.options.length) {
        e.preventDefault();
        handleSelectOption(idx);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    checked,
    currentQuestion.options.length,
    evaluation,
    handleAdvance,
    handleSelectOption,
  ]);

  const handleReplay = () => {
    vibrateTap();
    setQuestionIndex(0);
    setSelectedOption(null);
    setChecked(false);
    setHearts(MAX_HEARTS);
    setCorrectCount(0);
    setAnswersById({});
    setEvaluation(null);
    onProgressChange?.(false);
  };

  const isFinishingNext =
    (!unlimitedHearts && hearts <= 0) ||
    questionIndex + 1 >= stage.questions.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${resolvedHeaderLabel}: ${stage.title}`}
      className="fixed inset-0 z-50 flex flex-col bg-surface text-on-surface"
    >
      <header className="shrink-0 border-b border-outline-variant bg-surface-container-low pt-safe pl-safe pr-safe">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Keluar dari sesi latihan"
            className="m3-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-on-surface hover:bg-surface-container"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-on-surface-variant">
              <span className="truncate">{resolvedHeaderLabel}</span>
              <span className="shrink-0 font-mono tabular-nums">
                {Math.min(questionIndex + 1, stage.questions.length)}/
                {stage.questions.length}
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progres soal"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {!unlimitedHearts && (
            <div
              className="flex shrink-0 items-center gap-1 rounded-full bg-primary-container px-2.5 py-1.5"
              aria-label={`Sisa nyawa ${hearts} dari ${MAX_HEARTS}`}
            >
              {Array.from({ length: MAX_HEARTS }).map((_, idx) => (
                <Heart
                  key={idx}
                  className={`h-4 w-4 ${
                    idx < hearts
                      ? 'fill-primary text-primary'
                      : 'fill-surface-container-high text-outline'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}
        </div>
      </header>

      {evaluation ? (
        <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-6 pb-safe">
          <div className="w-full max-w-md space-y-4">
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center">
              {evaluation.passed ? (
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-container text-warning">
                    <Trophy className="h-7 w-7" aria-hidden="true" />
                  </div>

                  {!unlimitedHearts && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {[1, 2, 3].map((starNum) => (
                        <Star
                          key={starNum}
                          className={`h-7 w-7 ${
                            starNum <= evaluation.stars
                              ? 'fill-amber-400 text-amber-500'
                              : 'fill-surface-container text-outline'
                          }`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-xs font-bold text-success">
                    {unlimitedHearts
                      ? 'Latihan Selesai!'
                      : `Level ${stage.order} Selesai!`}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-extrabold text-on-surface sm:text-2xl">
                    {stage.title}
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {evaluation.accuracy >= 90
                      ? 'Sempurna! Pemahamanmu sangat solid.'
                      : evaluation.accuracy >= 70
                        ? 'Bagus! Tinggal pertajam beberapa detail.'
                        : 'Cek ringkasan jawaban salah di bawah untuk menguatkan ingatan.'}
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-outline-variant bg-surface p-3">
                      <p className="text-[11px] font-medium text-on-surface-variant">
                        Hadiah XP
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-primary">
                        +{evaluation.xpAwarded}
                      </p>
                    </div>
                    <div className="rounded-xl border border-outline-variant bg-surface p-3">
                      <p className="text-[11px] font-medium text-on-surface-variant">
                        Akurasi
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-on-surface">
                        {evaluation.accuracy}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-outline-variant bg-surface p-3">
                      <p className="text-[11px] font-medium text-on-surface-variant">
                        {unlimitedHearts ? 'Benar' : 'Nyawa'}
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-on-surface">
                        {unlimitedHearts
                          ? `${evaluation.correctCount}/${evaluation.totalQuestions}`
                          : `${hearts}/${MAX_HEARTS}`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2.5">
                    {hasNextStage && !unlimitedHearts ? (
                      <button
                        type="button"
                        onClick={() => {
                          vibrateTap();
                          onNextStage();
                        }}
                        className="m3-tactile flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
                      >
                        Lanjut ke Level {stage.order + 1}
                      </button>
                    ) : onShuffleNewSet ? (
                      <button
                        type="button"
                        onClick={() => {
                          vibrateTap();
                          onShuffleNewSet();
                        }}
                        className="m3-tactile flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
                      >
                        <Shuffle className="h-4 w-4" aria-hidden="true" />
                        <span>Acak Soal Baru</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onClose}
                        className="m3-tactile flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
                      >
                        {resolvedCloseLabel}
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={handleReplay}
                        className="m3-tactile flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-outline bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Ulangi</span>
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="m3-tactile flex min-h-[44px] items-center justify-center rounded-2xl border border-outline bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container"
                      >
                        {resolvedShortCloseLabel}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
                    <XCircle className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-xs font-bold text-primary">
                    Tantangan Belum Lulus
                  </p>
                  <h2 className="mt-1 font-display text-xl font-extrabold text-on-surface sm:text-2xl">
                    {hearts === 0 ? 'Nyawa Habis!' : 'Skor Belum Mencapai 60%'}
                  </h2>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Akurasi kamu {evaluation.accuracy}% (
                    {evaluation.correctCount}/{evaluation.totalQuestions} benar).
                    Coba lagi untuk membuka level berikutnya!
                  </p>

                  <div className="mt-6 space-y-2.5">
                    <button
                      type="button"
                      onClick={handleReplay}
                      className="m3-tactile flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span>Coba Tantangan Lagi</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="m3-tactile flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-outline bg-surface px-5 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container"
                    >
                      {resolvedCloseLabel}
                    </button>
                  </div>
                </>
              )}
            </div>

            {wrongQuestions.length > 0 && (
              <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left">
                <h3 className="font-display text-sm font-extrabold text-on-surface">
                  Review Jawaban Salah ({wrongQuestions.length})
                </h3>
                <div className="mt-3 space-y-3">
                  {wrongQuestions.map((q) => {
                    const picked = answersById[q.id];
                    return (
                      <div
                        key={q.id}
                        className="rounded-xl border border-outline-variant bg-surface p-3.5 text-xs"
                      >
                        <p className="whitespace-pre-line font-semibold text-on-surface">
                          {q.prompt}
                        </p>
                        <p className="mt-1.5 text-primary">
                          Pilihanmu: <strong>{q.options[picked]}</strong>
                        </p>
                        <p className="mt-0.5 text-success">
                          Benar: <strong>{q.options[q.correctIndex]}</strong>
                        </p>
                        <div className="mt-2">
                          {useFormattedExplanation ? (
                            <BunpouExplanation
                              text={q.explanation}
                              className="text-xs"
                            />
                          ) : (
                            <p className="leading-relaxed text-on-surface-variant">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      ) : (
        <div className="relative flex-1 overflow-y-auto px-4 py-6 pb-safe">
          <div className="mx-auto max-w-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-on-surface-variant">
              <span className="text-primary">{currentQuestion.tag}</span>
              <span className="truncate">{stage.chapter}</span>
            </div>

            {currentQuestion.passage && (
              <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-sm leading-relaxed text-on-surface">
                {currentQuestion.passage}
              </div>
            )}

            <h2 className="whitespace-pre-line font-display text-lg font-bold leading-snug text-on-surface sm:text-xl">
              {currentQuestion.prompt}
            </h2>

            <div className="space-y-2.5 pt-1">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isRight =
                  checked && idx === currentQuestion.correctIndex;
                const isWrongSelected =
                  checked &&
                  isSelected &&
                  idx !== currentQuestion.correctIndex;

                let cardStyle =
                  'border-outline-variant bg-surface-container-low text-on-surface hover:border-outline';
                let keyStyle =
                  'bg-surface-container text-on-surface-variant';

                if (isRight) {
                  cardStyle =
                    'border-success bg-success-container text-on-success-container font-semibold';
                  keyStyle = 'bg-success text-white';
                } else if (isWrongSelected) {
                  cardStyle =
                    'border-primary bg-primary-container text-on-primary-container font-semibold';
                  keyStyle = 'bg-primary text-on-primary';
                } else if (isSelected) {
                  cardStyle =
                    'border-primary bg-primary text-on-primary font-semibold';
                  keyStyle = 'bg-white text-primary';
                }

                return (
                  <button
                    key={`${currentQuestion.id}-opt-${idx}`}
                    type="button"
                    disabled={checked}
                    onClick={() => handleSelectOption(idx)}
                    className={`m3-tactile flex min-h-[56px] w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3 text-left text-sm ${cardStyle}`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${keyStyle}`}
                    >
                      {OPTION_KEYS[idx]}
                    </span>
                    <span className="flex-1 leading-snug">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instant Feedback Pop-up: tap anywhere on screen to dismiss and advance immediately */}
          {checked && (
            <div
              role="status"
              aria-live="assertive"
              onClick={handleAdvance}
              className="fixed inset-0 z-[60] flex cursor-pointer items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
            >
              <div
                className={`w-full max-w-md rounded-2xl border p-5 shadow-xl ${
                  isCorrectChoice
                    ? 'border-success/50 bg-surface-container-low'
                    : 'border-primary/50 bg-surface-container-low'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isCorrectChoice
                        ? 'bg-success-container text-success'
                        : 'bg-primary-container text-primary'
                    }`}
                  >
                    {isCorrectChoice ? (
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-display text-base font-extrabold ${
                        isCorrectChoice ? 'text-success' : 'text-primary'
                      }`}
                    >
                      {isCorrectChoice
                        ? 'Benar! Mantap!'
                        : unlimitedHearts
                          ? 'Kurang tepat'
                          : hearts === 0
                            ? 'Kurang tepat · Nyawa habis'
                            : 'Kurang tepat · -1 Nyawa'}
                    </p>

                    {!isCorrectChoice && (
                      <p className="mt-1 text-xs font-medium text-on-surface">
                        Jawaban benar:{' '}
                        <span className="font-bold text-success">
                          {currentQuestion.options[currentQuestion.correctIndex]}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3.5 max-h-56 overflow-y-auto border-t border-outline-variant pt-3 text-xs leading-relaxed sm:text-sm">
                  {useFormattedExplanation ? (
                    <BunpouExplanation
                      text={currentQuestion.explanation}
                      className="text-xs sm:text-sm"
                    />
                  ) : (
                    <p className="text-on-surface-variant">
                      {currentQuestion.explanation}
                    </p>
                  )}
                </div>

                <p className="mt-4 text-center text-xs font-semibold text-on-surface-variant">
                  {isFinishingNext
                    ? 'Ketuk di mana saja untuk lihat hasil'
                    : 'Ketuk di mana saja untuk lanjut'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
