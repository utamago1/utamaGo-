import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  RotateCcw,
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

interface ChallengeRunnerModalProps {
  stage: ChallengeStage;
  previousBestStars: number;
  hasNextStage: boolean;
  onComplete: (stage: ChallengeStage, evaluation: ChallengeEvaluation) => void;
  onProgressChange?: (hasUnfinishedProgress: boolean) => void;
  onNextStage: () => void;
  onClose: () => void;
}

const MAX_HEARTS = 3;
const OPTION_KEYS = ['A', 'B', 'C', 'D'];

export function ChallengeRunnerModal({
  stage,
  previousBestStars,
  hasNextStage,
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

  const currentQuestion = stage.questions[questionIndex];
  const isCorrectChoice =
    checked &&
    selectedOption !== null &&
    selectedOption === currentQuestion.correctIndex;

  const progressPercent = evaluation
    ? 100
    : Math.round(((questionIndex + (checked ? 1 : 0)) / stage.questions.length) * 100);

  const wrongQuestions = evaluation
    ? stage.questions.filter(
        (q) =>
          typeof answersById[q.id] === 'number' &&
          answersById[q.id] !== q.correctIndex,
      )
    : [];

  const handleSelectOption = (idx: number) => {
    vibrateTap();
    setSelectedOption(idx);
    onProgressChange?.(true);
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null || checked) return;
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    setChecked(true);
    setAnswersById((prev) => ({ ...prev, [currentQuestion.id]: selectedOption }));
    onProgressChange?.(true);
    if (isCorrect) {
      vibrateSuccess();
      setCorrectCount((prev) => prev + 1);
    } else {
      vibrateError();
      setHearts((prev) => Math.max(0, prev - 1));
    }
  };

  const finishStage = (finalCorrect: number, finalHearts: number) => {
    const result = evaluateChallengeResult({
      correctCount: finalCorrect,
      totalQuestions: stage.questions.length,
      heartsRemaining: finalHearts,
      baseXpReward: stage.xpReward,
      previousBestStars,
    });
    setEvaluation(result);
    onProgressChange?.(false);
    onComplete(stage, result);
  };

  const handleAdvance = () => {
    if (!checked) return;
    vibrateTap();

    if (hearts <= 0) {
      finishStage(correctCount, 0);
      return;
    }

    const isLast = questionIndex + 1 >= stage.questions.length;
    if (isLast) {
      finishStage(correctCount, hearts);
      return;
    }

    setQuestionIndex((prev) => prev + 1);
    setSelectedOption(null);
    setChecked(false);
  };

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Tantangan Level ${stage.order}: ${stage.title}`}
      className="fixed inset-0 z-50 flex flex-col bg-surface text-on-surface"
    >
      <header className="shrink-0 border-b border-outline-variant bg-surface-container-low pt-safe pl-safe pr-safe">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Keluar dari tantangan"
            className="m3-tactile flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-on-surface hover:bg-surface-container"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-on-surface-variant">
              <span className="truncate">
                Level {stage.order} · {stage.jlptLevel}
              </span>
              <span className="font-mono tabular-nums">
                {Math.min(questionIndex + 1, stage.questions.length)}/
                {stage.questions.length}
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progres soal level"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

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
        </div>
      </header>

      {evaluation ? (
        <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-6 pb-safe">
          <div className="w-full max-w-md space-y-4">
            <div className="rounded-3xl border border-outline-variant bg-surface-container-low p-6 text-center shadow-sm">
              {evaluation.passed ? (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-container text-warning">
                    <Trophy className="h-8 w-8" aria-hidden="true" />
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-2">
                    {[1, 2, 3].map((starNum) => (
                      <Star
                        key={starNum}
                        className={`h-8 w-8 ${
                          starNum <= evaluation.stars
                            ? 'fill-amber-400 text-amber-500'
                            : 'fill-surface-container text-outline'
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  <p className="mt-3 text-xs font-bold uppercase tracking-wider text-success">
                    Level {stage.order} Selesai!
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-extrabold text-on-surface">
                    {stage.title}
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {evaluation.stars === 3
                      ? 'Sempurna! Semua bintang berhasil diraih.'
                      : 'Bagus! Tantangan berhasil ditaklukkan.'}
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2.5">
                    <div className="rounded-2xl bg-surface-container p-3">
                      <p className="text-[11px] font-medium text-on-surface-variant">
                        Hadiah XP
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-primary">
                        +{evaluation.xpAwarded}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-container p-3">
                      <p className="text-[11px] font-medium text-on-surface-variant">
                        Akurasi
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-on-surface">
                        {evaluation.accuracy}%
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-container p-3">
                      <p className="text-[11px] font-medium text-on-surface-variant">
                        Nyawa
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-on-surface">
                        {hearts}/{MAX_HEARTS}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2.5">
                    {hasNextStage ? (
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
                    ) : (
                      <button
                        type="button"
                        onClick={onClose}
                        className="m3-tactile flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
                      >
                        Kembali ke Peta Level
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={handleReplay}
                        className="m3-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-outline bg-surface-container px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Ulangi</span>
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="m3-tactile flex min-h-[48px] items-center justify-center rounded-2xl border border-outline bg-surface-container px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high"
                      >
                        Peta Level
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
                    <XCircle className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-primary">
                    Tantangan Belum Lulus
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-extrabold text-on-surface">
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
                      className="m3-tactile flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-outline bg-surface-container px-5 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-high"
                    >
                      Kembali ke Peta Level
                    </button>
                  </div>
                </>
              )}
            </div>

            {wrongQuestions.length > 0 && (
              <section className="rounded-3xl bg-primary-container/60 p-5 text-left">
                <h3 className="font-display text-sm font-extrabold text-on-primary-container">
                  Review Jawaban Salah ({wrongQuestions.length})
                </h3>
                <div className="mt-3 space-y-3">
                  {wrongQuestions.map((q) => {
                    const picked = answersById[q.id];
                    return (
                      <div
                        key={q.id}
                        className="rounded-2xl bg-surface-container-low p-3.5 text-xs"
                      >
                        <p className="font-semibold text-on-surface">
                          {q.prompt}
                        </p>
                        <p className="mt-1.5 text-primary">
                          Pilihanmu: <strong>{q.options[picked]}</strong>
                        </p>
                        <p className="mt-0.5 text-success">
                          Benar: <strong>{q.options[q.correctIndex]}</strong>
                        </p>
                        <p className="mt-1.5 text-on-surface-variant">
                          {q.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mx-auto max-w-xl space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
                <span className="text-primary">{currentQuestion.tag}</span>
                <span>{stage.chapter}</span>
              </div>

              {currentQuestion.passage && (
                <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-sm leading-relaxed text-on-surface shadow-xs">
                  {currentQuestion.passage}
                </div>
              )}

              <h2 className="font-display text-lg font-bold leading-snug text-on-surface sm:text-xl">
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
                      key={opt}
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
          </div>

          <footer
            className={`shrink-0 border-t px-4 py-3 pb-safe ${
              checked
                ? isCorrectChoice
                  ? 'border-success/40 bg-success-container'
                  : 'border-primary/40 bg-primary-container'
                : 'border-outline-variant bg-surface-container-low'
            }`}
          >
            <div className="mx-auto max-w-xl">
              {!checked ? (
                <button
                  type="button"
                  disabled={selectedOption === null}
                  onClick={handleCheckAnswer}
                  className="m3-tactile flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant"
                >
                  Periksa Jawaban
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    {isCorrectChoice ? (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-success"
                        aria-hidden="true"
                      />
                    ) : (
                      <XCircle
                        className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0 flex-1 text-xs leading-relaxed">
                      <p
                        className={`font-bold ${
                          isCorrectChoice
                            ? 'text-on-success-container'
                            : 'text-on-primary-container'
                        }`}
                      >
                        {isCorrectChoice
                          ? 'Benar! Mantap!'
                          : hearts === 0
                            ? 'Kurang tepat · Nyawa habis'
                            : 'Kurang tepat · -1 Nyawa'}
                      </p>
                      <p
                        className={`mt-0.5 ${
                          isCorrectChoice
                            ? 'text-on-success-container/90'
                            : 'text-on-primary-container/90'
                        }`}
                      >
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdvance}
                    className={`m3-tactile flex min-h-[48px] w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold text-white ${
                      isCorrectChoice
                        ? 'bg-success hover:opacity-90'
                        : 'bg-primary hover:bg-primary-hover'
                    }`}
                  >
                    {hearts <= 0
                      ? 'Lihat Hasil'
                      : questionIndex + 1 >= stage.questions.length
                        ? 'Selesaikan Level'
                        : 'Lanjut'}
                  </button>
                </div>
              )}
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
