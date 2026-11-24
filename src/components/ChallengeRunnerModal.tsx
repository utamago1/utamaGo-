import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Flame,
  Heart,
  RotateCcw,
  ShieldAlert,
  Shuffle,
  Star,
  Swords,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  XCircle,
  Zap,
} from 'lucide-react';
import type {
  ChallengeQuestion,
  ChallengeStage,
} from '../data/challengeLevels';
import {
  loadChallengeSfxEnabled,
  playBossHitSfx,
  playCorrectSfx,
  playFeverSfx,
  playGameOverSfx,
  playTileTapSfx,
  playTimerTickSfx,
  playVictorySfx,
  playWrongSfx,
  saveChallengeSfxEnabled,
} from '../utils/gameSfx';
import { vibrateError, vibrateSuccess, vibrateTap } from '../utils/haptics';
import {
  isJapaneseSpeechSupported,
  speakJapanese,
  stopJapaneseSpeech,
} from '../utils/japaneseSpeech';
import {
  evaluateChallengeResult,
  type ChallengeEvaluation,
  type LearnerGender,
} from '../utils/levelProgression';
import type { MascotExpression } from '../utils/mascotAssets';
import { hashSeed } from '../utils/practiceGenerators';
import { BunpouExplanation } from './BunpouExplanation';
import { MascotAvatar } from './MascotAvatar';

interface ChallengeRunnerModalProps {
  stage: ChallengeStage;
  previousBestStars: number;
  hasNextStage: boolean;
  unlimitedHearts?: boolean;
  useFormattedExplanation?: boolean;
  headerLabel?: string;
  closeButtonLabel?: string;
  mascotLevel?: number;
  mascotGender?: LearnerGender;
  previousBestScore?: number;
  previousBestCleared?: number;
  onRequestMoreQuestions?: (wave: number) => ChallengeQuestion[];
  onShuffleNewSet?: () => void;
  onComplete: (stage: ChallengeStage, evaluation: ChallengeEvaluation) => void;
  onProgressChange?: (hasUnfinishedProgress: boolean) => void;
  onNextStage: () => void;
  onClose: () => void;
}

const MAX_HEARTS = 3;
const OPTION_KEYS = ['A', 'B', 'C', 'D'];
const POPUP_DISMISS_GUARD_MS = 160;
const BLITZ_CORRECT_ADVANCE_MS = 420;
const BLITZ_WRONG_ADVANCE_MS = 1050;
const BLITZ_COMBO_TIME_BONUS_MS = 3000;

interface WrongReviewItem {
  question: ChallengeQuestion;
  userAnswerText: string;
  correctAnswerText: string;
}

function getComboMultiplier(combo: number): number {
  if (combo >= 5) return 4;
  if (combo >= 3) return 3;
  if (combo >= 2) return 2;
  return 1;
}

function getShuffledTileOrder(questionId: string, tokens: string[]): number[] {
  const n = tokens.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  if (n <= 1) return indices;

  let seed = hashSeed(`tiles-${questionId}`) || 1;
  const nextRand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }

  // Ensure bank does not accidentally start in exact solved order
  const isSolved = indices.every((v, idx) => v === idx);
  if (isSolved && n >= 2) {
    const first = indices[0];
    indices[0] = indices[n - 1];
    indices[n - 1] = first;
  }
  return indices;
}

function getCorrectAnswerLabel(q: ChallengeQuestion): string {
  if (q.kind === 'sentence-order' && q.orderedTokens?.length) {
    return `${q.sentenceBefore ?? ''}${q.orderedTokens.join('')}${q.sentenceAfter ?? ''}`;
  }
  return q.options[q.correctIndex] ?? '';
}

export function ChallengeRunnerModal({
  stage,
  previousBestStars,
  hasNextStage,
  unlimitedHearts = false,
  useFormattedExplanation = false,
  headerLabel,
  closeButtonLabel,
  mascotLevel = 1,
  mascotGender = 'cowok',
  previousBestScore = 0,
  previousBestCleared = 0,
  onRequestMoreQuestions,
  onShuffleNewSet,
  onComplete,
  onProgressChange,
  onNextStage,
  onClose,
}: ChallengeRunnerModalProps) {
  const mode = stage.mode ?? (unlimitedHearts ? 'daily-drill' : 'stage');
  const isBlitz = mode === 'blitz';
  const isSurvival = mode === 'survival';
  const isBoss = mode === 'boss';
  const usesHearts = !unlimitedHearts && !isBlitz;

  const bossMaxHp = isBoss
    ? stage.bossMaxHp ?? Math.max(1, stage.questions.length)
    : 0;
  const initialBlitzMs = (stage.timeLimitSeconds ?? 60) * 1000;

  const [questions, setQuestions] = useState<ChallengeQuestion[]>(
    () => stage.questions,
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [placedTokenIndices, setPlacedTokenIndices] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [bossHp, setBossHp] = useState(bossMaxHp);
  const [bossHitPulse, setBossHitPulse] = useState(false);
  const [wrongShakePulse, setWrongShakePulse] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastPointsGain, setLastPointsGain] = useState(0);
  const [timeBonusFlash, setTimeBonusFlash] = useState(false);

  const [timeLeftMs, setTimeLeftMs] = useState(initialBlitzMs);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() =>
    loadChallengeSfxEnabled(),
  );
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const [wrongReviews, setWrongReviews] = useState<WrongReviewItem[]>([]);
  const [evaluation, setEvaluation] = useState<ChallengeEvaluation | null>(
    null,
  );
  const [mascotMood, setMascotMood] = useState<MascotExpression>('idle');
  const [mascotLine, setMascotLine] = useState<string>(() => {
    if (isBoss) return `Ayo taklukkan ${stage.bossName ?? 'Boss'} bersama!`;
    if (isBlitz) return 'Fokus cepat! Kejar kombo & bonus waktu +3 detik!';
    if (isSurvival) return 'Bertahan selama mungkin dengan 3 nyawa!';
    return 'Siap! Jawab dengan teliti dan bangun kombomu!';
  });

  const checkedAtRef = useRef<number>(0);
  const waveRef = useRef<number>(1);
  const finishedRef = useRef<boolean>(false);
  const blitzAdvanceTimerRef = useRef<number | null>(null);
  const lastTickSecondRef = useRef<number>(6);
  const scoreRef = useRef<number>(0);
  const correctRef = useRef<number>(0);
  const answeredRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const heartsRef = useRef<number>(MAX_HEARTS);
  const bossHpRef = useRef<number>(bossMaxHp);

  scoreRef.current = score;
  correctRef.current = correctCount;
  answeredRef.current = answeredCount;
  maxComboRef.current = maxCombo;
  heartsRef.current = hearts;
  bossHpRef.current = bossHp;

  const currentQuestion = questions[questionIndex] ?? questions[0];
  const questionKind = currentQuestion?.kind ?? 'mcq';
  const isFever = combo >= 5;
  const currentMultiplier = getComboMultiplier(combo);

  const shuffledTileIndices = useMemo(() => {
    if (
      !currentQuestion ||
      currentQuestion.kind !== 'sentence-order' ||
      !currentQuestion.orderedTokens
    ) {
      return [];
    }
    return getShuffledTileOrder(
      currentQuestion.id,
      currentQuestion.orderedTokens,
    );
  }, [currentQuestion]);

  const progressPercent = evaluation
    ? 100
    : isBlitz
      ? Math.max(0, Math.min(100, Math.round((timeLeftMs / initialBlitzMs) * 100)))
      : isBoss
        ? Math.max(0, Math.min(100, Math.round((bossHp / Math.max(1, bossMaxHp)) * 100)))
        : isSurvival
          ? Math.min(100, ((questionIndex % 10) + (checked ? 1 : 0)) * 10)
          : Math.round(
              ((questionIndex + (checked ? 1 : 0)) /
                Math.max(1, questions.length)) *
                100,
            );

  const resolvedHeaderLabel =
    headerLabel ??
    (isBoss
      ? `Boss Stage · ${stage.jlptLevel}`
      : isBlitz
        ? `Blitz 60 Detik · ${stage.jlptLevel}`
        : isSurvival
          ? `Survival · ${stage.jlptLevel}`
          : `Level ${stage.order} · ${stage.jlptLevel}`);
  const resolvedCloseLabel = closeButtonLabel ?? 'Kembali ke Arena Tantangan';
  const resolvedShortCloseLabel = closeButtonLabel ?? 'Arena';

  const clearBlitzAdvanceTimer = useCallback(() => {
    if (blitzAdvanceTimerRef.current !== null) {
      window.clearTimeout(blitzAdvanceTimerRef.current);
      blitzAdvanceTimerRef.current = null;
    }
  }, []);

  // Stop speech and timers on unmount
  useEffect(() => {
    return () => {
      clearBlitzAdvanceTimer();
      stopJapaneseSpeech();
    };
  }, [clearBlitzAdvanceTimer]);

  // Refill endless question stream for Survival / Blitz seamlessly
  useEffect(() => {
    if (evaluation) return;
    if ((!isSurvival && !isBlitz) || !onRequestMoreQuestions) return;
    if (questions.length - questionIndex <= 5) {
      waveRef.current += 1;
      const more = onRequestMoreQuestions(waveRef.current);
      if (more.length > 0) {
        setQuestions((prev) => [...prev, ...more]);
      }
    }
  }, [
    evaluation,
    isBlitz,
    isSurvival,
    onRequestMoreQuestions,
    questionIndex,
    questions.length,
  ]);

  // Auto-play audio for Tebak Audio Jepang questions
  const handlePlayAudio = useCallback(
    (rateOverride?: number) => {
      if (!currentQuestion?.audioText) return;
      if (!isJapaneseSpeechSupported()) return;
      speakJapanese(currentQuestion.audioText, {
        rate: rateOverride,
        onLoadingChange: (loading) => setIsAudioLoading(loading),
        onStart: () => {
          setIsAudioLoading(false);
          setIsAudioPlaying(true);
        },
        onEnd: () => {
          setIsAudioLoading(false);
          setIsAudioPlaying(false);
        },
      });
    },
    [currentQuestion],
  );

  useEffect(() => {
    if (evaluation || !currentQuestion) return;
    if (currentQuestion.kind === 'audio-choice' && currentQuestion.audioText) {
      setMascotMood('mikir_loading');
      setMascotLine('Dengarkan audionya baik-baik ya…');
      const timer = window.setTimeout(() => {
        handlePlayAudio();
      }, 180);
      return () => {
        window.clearTimeout(timer);
        stopJapaneseSpeech();
        setIsAudioPlaying(false);
        setIsAudioLoading(false);
      };
    }
    if (currentQuestion.kind === 'sentence-order' && !checked) {
      setMascotMood('mikir_loading');
      setMascotLine('Ketuk potongan kata berurutan untuk menyusun kalimat!');
    }
    return undefined;
  }, [checked, currentQuestion, evaluation, handlePlayAudio]);

  const finishStage = useCallback(
    (params: {
      finalCorrect: number;
      finalAnswered: number;
      finalHearts: number;
      finalScore: number;
      finalMaxCombo: number;
      finalBossHp: number;
    }) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      clearBlitzAdvanceTimer();
      stopJapaneseSpeech();

      const {
        finalCorrect,
        finalAnswered,
        finalHearts,
        finalScore,
        finalMaxCombo,
        finalBossHp,
      } = params;

      let result: ChallengeEvaluation;

      if (isBlitz) {
        const safeAnswered = Math.max(1, finalAnswered);
        const accuracy = Math.round((finalCorrect / safeAnswered) * 100);
        const passed = finalCorrect > 0;
        const stars: 0 | 1 | 2 | 3 =
          finalScore >= 2200 ? 3 : finalScore >= 1100 ? 2 : finalCorrect > 0 ? 1 : 0;
        const xpAwarded = Math.max(
          15,
          Math.min(180, Math.round(finalCorrect * 8 + finalMaxCombo * 4)),
        );
        const isNewRecord =
          finalScore > 0 && finalScore > previousBestScore;
        result = {
          correctCount: finalCorrect,
          totalQuestions: finalAnswered,
          accuracy,
          passed,
          stars,
          xpAwarded,
          score: finalScore,
          maxCombo: finalMaxCombo,
          isNewRecord,
        };
      } else if (isSurvival) {
        const safeAnswered = Math.max(1, finalAnswered);
        const accuracy = Math.round((finalCorrect / safeAnswered) * 100);
        const passed = finalCorrect > 0;
        const stars: 0 | 1 | 2 | 3 =
          finalCorrect >= 15 ? 3 : finalCorrect >= 8 ? 2 : finalCorrect > 0 ? 1 : 0;
        const xpAwarded = Math.max(
          15,
          Math.min(240, Math.round(finalCorrect * 10 + finalMaxCombo * 5)),
        );
        const isNewRecord =
          finalCorrect > 0 &&
          (finalCorrect > previousBestCleared ||
            (finalCorrect === previousBestCleared &&
              finalScore > previousBestScore));
        result = {
          correctCount: finalCorrect,
          totalQuestions: finalAnswered,
          accuracy,
          passed,
          stars,
          xpAwarded,
          score: finalScore,
          maxCombo: finalMaxCombo,
          isNewRecord,
        };
      } else if (isBoss) {
        const safeTotal = Math.max(1, questions.length);
        const accuracy = Math.round((finalCorrect / safeTotal) * 100);
        const bossDefeated = finalHearts > 0 && finalBossHp <= 0;
        const passed = bossDefeated || (finalHearts > 0 && accuracy >= 75);
        const stars: 0 | 1 | 2 | 3 = !passed
          ? 0
          : finalHearts === MAX_HEARTS && accuracy >= 90
            ? 3
            : accuracy >= 80
              ? 2
              : 1;
        const xpAwarded = passed
          ? previousBestStars === 0
            ? stage.xpReward + (stars === 3 ? 40 : stars === 2 ? 20 : 0)
            : stars > previousBestStars
              ? (stars - previousBestStars) * 25
              : 25
          : 0;
        result = {
          correctCount: finalCorrect,
          totalQuestions: safeTotal,
          accuracy,
          passed,
          stars,
          xpAwarded,
          score: finalScore,
          maxCombo: finalMaxCombo,
          bossDefeated: passed,
        };
      } else if (unlimitedHearts) {
        const safeTotal = Math.max(1, questions.length);
        const accuracy = Math.round((finalCorrect / safeTotal) * 100);
        const stars: 0 | 1 | 2 | 3 =
          accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : finalCorrect > 0 ? 1 : 0;
        const xpAwarded = Math.max(
          15,
          Math.round((stage.xpReward * Math.max(25, accuracy)) / 100),
        );
        result = {
          correctCount: finalCorrect,
          totalQuestions: safeTotal,
          accuracy,
          passed: true,
          stars,
          xpAwarded,
          score: finalScore,
          maxCombo: finalMaxCombo,
        };
      } else {
        const base = evaluateChallengeResult({
          correctCount: finalCorrect,
          totalQuestions: questions.length,
          heartsRemaining: finalHearts,
          baseXpReward: stage.xpReward,
          previousBestStars,
        });
        result = {
          ...base,
          score: finalScore,
          maxCombo: finalMaxCombo,
        };
      }

      if (result.passed) {
        playVictorySfx(isBoss || Boolean(result.isNewRecord), sfxEnabled);
        setMascotMood('happy');
        setMascotLine(
          result.isNewRecord
            ? 'WAH! Rekor pribadi baru berhasil dipecahkan!'
            : isBoss
              ? 'Luar biasa! Boss berhasil ditaklukkan!'
              : 'Hebat! Sesi tantangan selesai dengan gemilang!',
        );
      } else {
        playGameOverSfx(sfxEnabled);
        setMascotMood('bingung_sedih');
        setMascotLine('Jangan menyerah! Pelajari ulasan lalu coba lagi ya.');
      }

      setEvaluation(result);
      onProgressChange?.(false);
      onComplete(stage, result);
    },
    [
      clearBlitzAdvanceTimer,
      isBlitz,
      isBoss,
      isSurvival,
      onComplete,
      onProgressChange,
      previousBestCleared,
      previousBestScore,
      previousBestStars,
      questions.length,
      sfxEnabled,
      stage,
      unlimitedHearts,
    ],
  );

  // Blitz 60s countdown loop
  useEffect(() => {
    if (!isBlitz || evaluation) return;
    let lastNow = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      const delta = Math.min(250, now - lastNow);
      lastNow = now;
      setTimeLeftMs((prev) => {
        const next = Math.max(0, prev - delta);
        const secLeft = Math.ceil(next / 1000);
        if (secLeft <= 5 && secLeft > 0 && secLeft < lastTickSecondRef.current) {
          lastTickSecondRef.current = secLeft;
          playTimerTickSfx(secLeft <= 3, sfxEnabled);
          setMascotMood('tap_kaget');
          setMascotLine(`Cepat! Tinggal ${secLeft} detik lagi!`);
        }
        if (next <= 0) {
          window.clearInterval(interval);
          window.setTimeout(() => {
            finishStage({
              finalCorrect: correctRef.current,
              finalAnswered: answeredRef.current,
              finalHearts: MAX_HEARTS,
              finalScore: scoreRef.current,
              finalMaxCombo: maxComboRef.current,
              finalBossHp: 0,
            });
          }, 0);
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [evaluation, finishStage, isBlitz, sfxEnabled]);

  const advanceToNextQuestion = useCallback(() => {
    clearBlitzAdvanceTimer();
    stopJapaneseSpeech();
    setIsAudioPlaying(false);
    setIsAudioLoading(false);

    if (usesHearts && heartsRef.current <= 0) {
      finishStage({
        finalCorrect: correctRef.current,
        finalAnswered: answeredRef.current,
        finalHearts: 0,
        finalScore: scoreRef.current,
        finalMaxCombo: maxComboRef.current,
        finalBossHp: bossHpRef.current,
      });
      return;
    }

    if (isBoss && bossHpRef.current <= 0) {
      finishStage({
        finalCorrect: correctRef.current,
        finalAnswered: answeredRef.current,
        finalHearts: heartsRef.current,
        finalScore: scoreRef.current,
        finalMaxCombo: maxComboRef.current,
        finalBossHp: 0,
      });
      return;
    }

    const nextIdx = questionIndex + 1;
    if (!isSurvival && !isBlitz && nextIdx >= questions.length) {
      finishStage({
        finalCorrect: correctRef.current,
        finalAnswered: answeredRef.current,
        finalHearts: usesHearts ? heartsRef.current : MAX_HEARTS,
        finalScore: scoreRef.current,
        finalMaxCombo: maxComboRef.current,
        finalBossHp: bossHpRef.current,
      });
      return;
    }

    if (nextIdx >= questions.length) {
      // Safety fallback if pool couldn't expand further
      finishStage({
        finalCorrect: correctRef.current,
        finalAnswered: answeredRef.current,
        finalHearts: usesHearts ? heartsRef.current : MAX_HEARTS,
        finalScore: scoreRef.current,
        finalMaxCombo: maxComboRef.current,
        finalBossHp: bossHpRef.current,
      });
      return;
    }

    setQuestionIndex(nextIdx);
    setSelectedOption(null);
    setPlacedTokenIndices([]);
    setChecked(false);
    setLastPointsGain(0);
    setMascotMood('idle');
    setMascotLine(
      isBlitz
        ? 'Lanjut cepat! Jaga kombomu!'
        : isBoss
          ? `Fokus! Sisa HP Boss ${bossHpRef.current}/${bossMaxHp}.`
          : isSurvival
            ? `Soal #${nextIdx + 1} · Tetap fokus!`
            : 'Pilih jawaban paling tepat!',
    );
  }, [
    bossMaxHp,
    clearBlitzAdvanceTimer,
    finishStage,
    isBlitz,
    isBoss,
    isSurvival,
    questionIndex,
    questions.length,
    usesHearts,
  ]);

  const handleAdvance = useCallback(() => {
    if (!checked || evaluation) return;
    if (Date.now() - checkedAtRef.current < POPUP_DISMISS_GUARD_MS) return;
    vibrateTap();
    advanceToNextQuestion();
  }, [advanceToNextQuestion, checked, evaluation]);

  const commitEvaluation = useCallback(
    (isCorrect: boolean, userAnswerText: string) => {
      if (checked || evaluation || !currentQuestion) return;
      stopJapaneseSpeech();
      setIsAudioPlaying(false);
      checkedAtRef.current = Date.now();
      setChecked(true);
      setLastAnswerCorrect(isCorrect);
      setAnsweredCount((prev) => prev + 1);
      onProgressChange?.(true);

      if (isCorrect) {
        vibrateSuccess();
        const nextCombo = combo + 1;
        const mult = getComboMultiplier(nextCombo);
        const pointsEarned = (isBoss ? 120 : 100) * mult;
        const enteredFever = nextCombo === 5;

        setCorrectCount((prev) => prev + 1);
        setCombo(nextCombo);
        setMaxCombo((prev) => Math.max(prev, nextCombo));
        setScore((prev) => prev + pointsEarned);
        setLastPointsGain(pointsEarned);

        if (isBoss) {
          const nextBossHp = Math.max(0, bossHp - 1);
          setBossHp(nextBossHp);
          setBossHitPulse(true);
          window.setTimeout(() => setBossHitPulse(false), 320);
          playBossHitSfx(sfxEnabled);
          setMascotMood(enteredFever ? 'tap_kaget' : 'happy');
          setMascotLine(
            nextBossHp === 0
              ? 'Serangan penghabisan! Boss tumbang!'
              : `Serangan telak -1 HP! Sisa HP Boss: ${nextBossHp}/${bossMaxHp}!`,
          );
        } else if (enteredFever) {
          playFeverSfx(sfxEnabled);
          setMascotMood('tap_kaget');
          setMascotLine('FEVER AKTIF (x4)! Rentetanmu tak terbendung!');
        } else {
          playCorrectSfx(nextCombo, sfxEnabled);
          setMascotMood('happy');
          setMascotLine(
            nextCombo >= 6
              ? `FEVER x4! Kombo ${nextCombo} berturut-turut!`
              : nextCombo >= 3
                ? `Keren! Kombo x${nextCombo} (+${pointsEarned} poin)!`
                : 'Mantap! Jawabanmu tepat!',
          );
        }

        // Blitz time bonus every 5-combo streak
        if (isBlitz && nextCombo > 0 && nextCombo % 5 === 0) {
          setTimeLeftMs((prev) => Math.min(initialBlitzMs + 15000, prev + BLITZ_COMBO_TIME_BONUS_MS));
          lastTickSecondRef.current = 6;
          setTimeBonusFlash(true);
          window.setTimeout(() => setTimeBonusFlash(false), 950);
        }

        if (isBlitz) {
          clearBlitzAdvanceTimer();
          blitzAdvanceTimerRef.current = window.setTimeout(() => {
            advanceToNextQuestion();
          }, BLITZ_CORRECT_ADVANCE_MS);
        }
      } else {
        vibrateError();
        playWrongSfx(sfxEnabled);
        setCombo(0);
        setLastPointsGain(0);
        setWrongShakePulse(true);
        window.setTimeout(() => setWrongShakePulse(false), 360);

        setWrongReviews((prev) => [
          ...prev,
          {
            question: currentQuestion,
            userAnswerText,
            correctAnswerText: getCorrectAnswerLabel(currentQuestion),
          },
        ]);

        if (usesHearts) {
          const nextHearts = Math.max(0, hearts - 1);
          setHearts(nextHearts);
          setMascotMood('bingung_sedih');
          setMascotLine(
            nextHearts === 0
              ? 'Yah, nyawa habis… yuk lihat pembahasannya.'
              : isBoss
                ? 'Boss membalas! -1 Nyawa, ayo bangkit!'
                : 'Ups, kurang tepat! Perhatikan jawabannya ya.',
          );
        } else {
          setMascotMood('bingung_sedih');
          setMascotLine('Kombo reset! Tetap tenang dan lanjutkan!');
        }

        if (isBlitz) {
          clearBlitzAdvanceTimer();
          blitzAdvanceTimerRef.current = window.setTimeout(() => {
            advanceToNextQuestion();
          }, BLITZ_WRONG_ADVANCE_MS);
        }
      }
    },
    [
      advanceToNextQuestion,
      bossHp,
      bossMaxHp,
      checked,
      clearBlitzAdvanceTimer,
      combo,
      currentQuestion,
      evaluation,
      hearts,
      initialBlitzMs,
      isBlitz,
      isBoss,
      onProgressChange,
      sfxEnabled,
      usesHearts,
    ],
  );

  // One-tap evaluation for MCQ & Tebak Audio Jepang
  const handleSelectOption = useCallback(
    (idx: number) => {
      if (checked || evaluation || !currentQuestion) return;
      setSelectedOption(idx);
      const isCorrect = idx === currentQuestion.correctIndex;
      commitEvaluation(isCorrect, currentQuestion.options[idx] ?? '');
    },
    [checked, commitEvaluation, currentQuestion, evaluation],
  );

  // Sentence-Order tile tap handlers
  const handleTapBankTile = useCallback(
    (tokenIndex: number) => {
      if (checked || evaluation || !currentQuestion?.orderedTokens) return;
      if (placedTokenIndices.includes(tokenIndex)) return;
      vibrateTap();
      playTileTapSfx(false, sfxEnabled);
      const nextPlaced = [...placedTokenIndices, tokenIndex];
      setPlacedTokenIndices(nextPlaced);

      if (nextPlaced.length === currentQuestion.orderedTokens.length) {
        const builtText = nextPlaced
          .map((i) => currentQuestion.orderedTokens?.[i] ?? '')
          .join('');
        const targetText = currentQuestion.orderedTokens.join('');
        const isCorrect = builtText === targetText;
        const fullBuilt = `${currentQuestion.sentenceBefore ?? ''}${builtText}${currentQuestion.sentenceAfter ?? ''}`;
        commitEvaluation(isCorrect, fullBuilt);
      }
    },
    [
      checked,
      commitEvaluation,
      currentQuestion,
      evaluation,
      placedTokenIndices,
      sfxEnabled,
    ],
  );

  const handleRemoveSlotTile = useCallback(
    (slotPosition: number) => {
      if (checked || evaluation) return;
      vibrateTap();
      playTileTapSfx(true, sfxEnabled);
      setPlacedTokenIndices((prev) =>
        prev.filter((_, idx) => idx !== slotPosition),
      );
    },
    [checked, evaluation, sfxEnabled],
  );

  const handleResetSentenceSlots = useCallback(() => {
    if (checked || evaluation || placedTokenIndices.length === 0) return;
    vibrateTap();
    playTileTapSfx(true, sfxEnabled);
    setPlacedTokenIndices([]);
  }, [checked, evaluation, placedTokenIndices.length, sfxEnabled]);

  const handleToggleSfx = useCallback(() => {
    vibrateTap();
    setSfxEnabled((prev) => {
      const next = !prev;
      saveChallengeSfxEnabled(next);
      if (next) playTileTapSfx(false, true);
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (evaluation || !currentQuestion) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (checked) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          handleAdvance();
        }
        return;
      }
      if (questionKind === 'sentence-order') {
        if (e.key === 'Backspace' && placedTokenIndices.length > 0) {
          e.preventDefault();
          handleRemoveSlotTile(placedTokenIndices.length - 1);
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
    currentQuestion,
    evaluation,
    handleAdvance,
    handleRemoveSlotTile,
    handleSelectOption,
    placedTokenIndices.length,
    questionKind,
  ]);

  const handleReplay = () => {
    vibrateTap();
    clearBlitzAdvanceTimer();
    stopJapaneseSpeech();
    if ((isBlitz || isSurvival) && onShuffleNewSet) {
      onShuffleNewSet();
      return;
    }
    finishedRef.current = false;
    waveRef.current = 1;
    lastTickSecondRef.current = 6;
    setQuestions(stage.questions);
    setQuestionIndex(0);
    setSelectedOption(null);
    setPlacedTokenIndices([]);
    setChecked(false);
    setLastAnswerCorrect(false);
    setHearts(MAX_HEARTS);
    setBossHp(bossMaxHp);
    setCorrectCount(0);
    setAnsweredCount(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLastPointsGain(0);
    setTimeLeftMs(initialBlitzMs);
    setWrongReviews([]);
    setEvaluation(null);
    setMascotMood('idle');
    setMascotLine(
      isBoss
        ? `Ronde baru melawan ${stage.bossName ?? 'Boss'}! Ayo menang!`
        : 'Ronde baru dimulai! Fokus dan kejar kombo!',
    );
    onProgressChange?.(false);
  };

  const isFinishingNext =
    (usesHearts && hearts <= 0) ||
    (isBoss && bossHp <= 0) ||
    (!isSurvival && !isBlitz && questionIndex + 1 >= questions.length);

  const blitzSecondsFormatted = (timeLeftMs / 1000).toFixed(1);
  const isBlitzUrgent = isBlitz && timeLeftMs <= 10000;
  const survivalWaveNumber = Math.floor(questionIndex / 8) + 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${resolvedHeaderLabel}: ${stage.title}`}
      className="fixed inset-0 z-50 flex flex-col bg-surface text-on-surface"
    >
      {/* Top Game HUD */}
      <header className="shrink-0 border-b border-outline-variant bg-surface-container-low pt-safe pl-safe pr-safe">
        <div className="mx-auto flex min-h-[64px] max-w-2xl items-center gap-2.5 px-3 py-2 sm:gap-3 sm:px-4">
          <button
            type="button"
            onClick={() => {
              clearBlitzAdvanceTimer();
              stopJapaneseSpeech();
              onClose();
            }}
            aria-label="Keluar dari arena tantangan"
            className="m3-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-on-surface hover:bg-surface-container"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Center HUD Meter: Blitz Timer / Boss HP / Survival Wave / Stage Progress */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold">
              <span className="flex min-w-0 items-center gap-1.5 truncate text-on-surface-variant">
                {isBoss && (
                  <Swords
                    className="h-3.5 w-3.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                )}
                {isBlitz && (
                  <Timer
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isBlitzUrgent ? 'text-primary' : 'text-warning'
                    }`}
                    aria-hidden="true"
                  />
                )}
                {isSurvival && (
                  <ShieldAlert
                    className="h-3.5 w-3.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{resolvedHeaderLabel}</span>
              </span>

              <span className="flex shrink-0 items-center gap-1.5 font-mono tabular-nums">
                {isBlitz ? (
                  <>
                    {timeBonusFlash && (
                      <span className="utamago-combo-pop font-bold text-success">
                        +3s!
                      </span>
                    )}
                    <span
                      className={`text-sm font-extrabold ${
                        isBlitzUrgent ? 'text-primary' : 'text-on-surface'
                      }`}
                    >
                      {blitzSecondsFormatted}s
                    </span>
                  </>
                ) : isBoss ? (
                  <span className="font-bold text-primary">
                    HP Boss: {bossHp}/{bossMaxHp}
                  </span>
                ) : isSurvival ? (
                  <span className="font-bold text-on-surface">
                    Soal #{questionIndex + 1} · G{survivalWaveNumber}
                  </span>
                ) : (
                  <span className="text-on-surface-variant">
                    {Math.min(questionIndex + 1, questions.length)}/
                    {questions.length}
                  </span>
                )}
              </span>
            </div>

            <div
              className={`h-2 w-full overflow-hidden rounded-full bg-surface-container-high ${
                bossHitPulse ? 'utamago-hit-shake' : ''
              }`}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={
                isBlitz
                  ? 'Sisa waktu Blitz'
                  : isBoss
                    ? 'Sisa HP Boss'
                    : 'Progres soal'
              }
            >
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  isBlitz
                    ? isBlitzUrgent
                      ? 'bg-primary'
                      : 'bg-warning'
                    : isBoss
                      ? 'bg-primary'
                      : isFever
                        ? 'bg-warning'
                        : 'bg-primary'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Right HUD Controls: Score/Combo + Hearts + SFX Mute */}
          <div className="flex shrink-0 items-center gap-1.5">
            {!evaluation && (combo >= 2 || score > 0) && (
              <div
                key={`combo-${combo}-${score}`}
                className={`utamago-combo-pop hidden items-center gap-1 rounded-xl border px-2 py-1 font-mono text-xs font-bold tabular-nums min-[380px]:flex ${
                  isFever
                    ? 'border-warning/60 bg-warning-container text-on-warning-container'
                    : 'border-outline-variant bg-surface text-on-surface'
                }`}
                aria-label={`Skor ${score}, kombo ${combo}`}
              >
                {isFever ? (
                  <Flame
                    className="h-3.5 w-3.5 text-warning"
                    aria-hidden="true"
                  />
                ) : (
                  <Zap
                    className="h-3.5 w-3.5 text-primary"
                    aria-hidden="true"
                  />
                )}
                <span>{score}</span>
                {combo >= 2 && (
                  <span
                    className={
                      isFever ? 'font-extrabold text-warning' : 'text-primary'
                    }
                  >
                    {isFever ? `FEVER x${currentMultiplier}` : `x${currentMultiplier}`}
                  </span>
                )}
              </div>
            )}

            {usesHearts && (
              <div
                className="flex shrink-0 items-center gap-0.5 rounded-xl border border-primary/25 bg-primary-container/70 px-2 py-1.5"
                aria-label={`Sisa nyawa ${hearts} dari ${MAX_HEARTS}`}
              >
                {Array.from({ length: MAX_HEARTS }).map((_, idx) => (
                  <Heart
                    key={idx}
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                      idx < hearts
                        ? 'fill-primary text-primary'
                        : 'fill-surface-container-high text-outline'
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleToggleSfx}
              aria-label={sfxEnabled ? 'Matikan efek suara gim' : 'Aktifkan efek suara gim'}
              title={sfxEnabled ? 'Efek suara aktif' : 'Efek suara senyap'}
              className="m3-tactile flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            >
              {sfxEnabled ? (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {evaluation ? (
        /* Summary / End Screen */
        <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-6 pb-safe">
          <div className="w-full max-w-md space-y-4">
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center">
              <div className="mx-auto flex items-center justify-center">
                <MascotAvatar
                  level={mascotLevel}
                  gender={mascotGender}
                  expression={evaluation.passed ? 'happy' : 'bingung_sedih'}
                  size={84}
                  ariaLabel="Ekspresi akhir maskot UtamaGo"
                />
              </div>

              {evaluation.isNewRecord && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-warning">
                  <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>REKOR PRIBADI BARU!</span>
                </p>
              )}

              {evaluation.passed && (isBoss || (!unlimitedHearts && !isBlitz && !isSurvival)) && (
                <div className="mt-3 flex items-center justify-center gap-2">
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

              <p
                className={`mt-3 text-xs font-bold ${
                  evaluation.passed ? 'text-success' : 'text-primary'
                }`}
              >
                {isBlitz
                  ? 'Waktu Blitz Selesai!'
                  : isSurvival
                    ? 'Sesi Survival Selesai!'
                    : isBoss
                      ? evaluation.passed
                        ? 'Boss Berhasil Ditaklukkan!'
                        : 'Boss Masih Bertahan!'
                      : unlimitedHearts
                        ? 'Latihan Selesai!'
                        : evaluation.passed
                          ? `Level ${stage.order} Selesai!`
                          : 'Tantangan Belum Lulus'}
              </p>

              <h2 className="mt-1 font-display text-xl font-extrabold text-on-surface sm:text-2xl">
                {stage.title}
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {mascotLine}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-outline-variant bg-surface p-3">
                  <p className="text-[11px] font-medium text-on-surface-variant">
                    Skor
                  </p>
                  <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-on-surface">
                    {evaluation.score ?? score}
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface p-3">
                  <p className="text-[11px] font-medium text-on-surface-variant">
                    Kombo Maks
                  </p>
                  <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-warning">
                    x{evaluation.maxCombo ?? maxCombo}
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface p-3">
                  <p className="text-[11px] font-medium text-on-surface-variant">
                    {isSurvival || isBlitz ? 'Benar' : 'Akurasi'}
                  </p>
                  <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-on-surface">
                    {isSurvival || isBlitz
                      ? `${evaluation.correctCount}/${evaluation.totalQuestions}`
                      : `${evaluation.accuracy}%`}
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface p-3">
                  <p className="text-[11px] font-medium text-on-surface-variant">
                    Hadiah XP
                  </p>
                  <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-primary">
                    +{evaluation.xpAwarded}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2.5">
                {evaluation.passed &&
                hasNextStage &&
                !unlimitedHearts &&
                !isBlitz &&
                !isSurvival &&
                !isBoss ? (
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
                ) : (isBlitz || isSurvival) && onShuffleNewSet ? (
                  <button
                    type="button"
                    onClick={handleReplay}
                    className="m3-tactile flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span>Main Lagi (Acak Baru)</span>
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
                ) : !evaluation.passed ? (
                  <button
                    type="button"
                    onClick={handleReplay}
                    className="m3-tactile flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {isBoss ? 'Tantang Boss Lagi' : 'Coba Tantangan Lagi'}
                    </span>
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
                    <span>Main Lagi</span>
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
            </div>

            {wrongReviews.length > 0 && (
              <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left">
                <h3 className="font-display text-sm font-extrabold text-on-surface">
                  Review Jawaban Salah ({wrongReviews.length})
                </h3>
                <div className="mt-3 space-y-3">
                  {wrongReviews.map((item, idx) => (
                    <div
                      key={`${item.question.id}-${idx}`}
                      className="rounded-xl border border-outline-variant bg-surface p-3.5 text-xs"
                    >
                      <p className="whitespace-pre-line font-semibold text-on-surface">
                        {item.question.prompt}
                      </p>
                      {item.question.audioReveal && (
                        <p className="mt-1 font-medium text-on-surface-variant">
                          Audio: {item.question.audioReveal}
                        </p>
                      )}
                      <p className="mt-1.5 text-primary">
                        Jawabanmu: <strong>{item.userAnswerText}</strong>
                      </p>
                      <p className="mt-0.5 text-success">
                        Benar: <strong>{item.correctAnswerText}</strong>
                      </p>
                      <div className="mt-2">
                        {useFormattedExplanation ? (
                          <BunpouExplanation
                            text={item.question.explanation}
                            className="text-xs"
                          />
                        ) : (
                          <p className="leading-relaxed text-on-surface-variant">
                            {item.question.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      ) : (
        /* Active Play Arena */
        <div className="relative flex-1 overflow-y-auto px-4 py-4 pb-safe sm:py-5">
          <div
            className={`mx-auto max-w-xl space-y-4 ${
              wrongShakePulse ? 'utamago-hit-shake' : ''
            }`}
          >
            {/* Live Mascot Reaction Strip */}
            <div
              className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2 transition-colors ${
                isFever
                  ? 'border-warning/50 bg-warning-container/45'
                  : 'border-outline-variant bg-surface-container-low'
              }`}
            >
              <MascotAvatar
                level={mascotLevel}
                gender={mascotGender}
                expression={mascotMood}
                size={48}
                ariaLabel="Reaksi maskot UtamaGo"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-on-surface-variant">
                  <span className="text-primary">{currentQuestion.tag}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Skor {score}
                    {combo >= 2
                      ? isFever
                        ? ` · FEVER x${currentMultiplier}`
                        : ` · Kombo ${combo} (x${currentMultiplier})`
                      : ''}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs font-semibold text-on-surface sm:text-[13px]">
                  {mascotLine}
                </p>
              </div>
              {checked && lastAnswerCorrect && lastPointsGain > 0 && (
                <span className="utamago-combo-pop shrink-0 font-mono text-xs font-extrabold tabular-nums text-success">
                  +{lastPointsGain}
                </span>
              )}
            </div>

            {/* Optional Passage */}
            {currentQuestion.passage && (
              <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-sm leading-relaxed text-on-surface">
                {currentQuestion.passage}
              </div>
            )}

            {/* Question Prompt */}
            <h2 className="whitespace-pre-line font-display text-lg font-bold leading-snug text-on-surface sm:text-xl">
              {currentQuestion.prompt}
            </h2>

            {/* FORMAT A: TEBAK DARI AUDIO JEPANG */}
            {questionKind === 'audio-choice' && currentQuestion.audioText && (
              <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        handlePlayAudio(1.0);
                      }}
                      className="m3-tactile inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover"
                    >
                      <Volume2 className="h-5 w-5" aria-hidden="true" />
                      <span>
                        {isAudioLoading
                          ? 'Memuat…'
                          : isAudioPlaying
                            ? 'Memutar…'
                            : 'Putar Audio'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        handlePlayAudio(0.78);
                      }}
                      className="m3-tactile inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-outline bg-surface px-3.5 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container"
                    >
                      <span>Pelan 0.8x</span>
                    </button>
                  </div>

                  {/* Live waveform bars when speaking */}
                  <div
                    className="flex h-7 items-end gap-1 px-2"
                    aria-hidden="true"
                  >
                    <span
                      className={`w-1 rounded-full bg-primary transition-all ${
                        isAudioPlaying
                          ? 'utamago-wave-bar h-6'
                          : 'h-2 opacity-35'
                      }`}
                    />
                    <span
                      className={`w-1 rounded-full bg-primary transition-all ${
                        isAudioPlaying
                          ? 'utamago-wave-bar-delay-1 h-7'
                          : 'h-3.5 opacity-35'
                      }`}
                    />
                    <span
                      className={`w-1 rounded-full bg-primary transition-all ${
                        isAudioPlaying
                          ? 'utamago-wave-bar-delay-2 h-5'
                          : 'h-2.5 opacity-35'
                      }`}
                    />
                    <span
                      className={`w-1 rounded-full bg-primary transition-all ${
                        isAudioPlaying
                          ? 'utamago-wave-bar h-6'
                          : 'h-2 opacity-35'
                      }`}
                    />
                  </div>
                </div>

                {checked && currentQuestion.audioReveal && (
                  <p className="mt-3 border-t border-outline-variant pt-2.5 text-sm font-bold text-on-surface">
                    {currentQuestion.audioReveal}
                  </p>
                )}
              </div>
            )}

            {/* FORMAT B: SUSUN KALIMAT JLPT (★) */}
            {questionKind === 'sentence-order' &&
            currentQuestion.orderedTokens ? (
              <div className="space-y-4">
                {currentQuestion.sentenceHint && (
                  <p className="text-xs font-medium text-on-surface-variant">
                    Arti target: <strong className="text-on-surface">{currentQuestion.sentenceHint}</strong>
                  </p>
                )}

                {/* Sentence Assembly Tray */}
                <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
                  <div className="flex flex-wrap items-center gap-2 text-base font-bold leading-relaxed text-on-surface">
                    {currentQuestion.sentenceBefore && (
                      <span>{currentQuestion.sentenceBefore}</span>
                    )}

                    {currentQuestion.orderedTokens.map((_, slotIdx) => {
                      const placedIdx = placedTokenIndices[slotIdx];
                      const hasTile = typeof placedIdx === 'number';
                      const tokenText = hasTile
                        ? currentQuestion.orderedTokens?.[placedIdx]
                        : null;
                      const isStarSlot = currentQuestion.starSlotIndex === slotIdx;

                      let slotClass =
                        'border-dashed border-outline bg-surface text-on-surface-variant';
                      if (hasTile && !checked) {
                        slotClass =
                          'border-solid border-primary/50 bg-primary-container/60 text-on-primary-container';
                      } else if (checked) {
                        const expectedToken =
                          currentQuestion.orderedTokens?.[slotIdx];
                        const slotCorrect = tokenText === expectedToken;
                        slotClass = slotCorrect
                          ? 'border-solid border-success bg-success-container text-on-success-container'
                          : 'border-solid border-primary bg-primary-container text-on-primary-container';
                      }

                      return (
                        <button
                          key={`slot-${slotIdx}`}
                          type="button"
                          disabled={!hasTile || checked}
                          onClick={() => handleRemoveSlotTile(slotIdx)}
                          aria-label={
                            hasTile
                              ? `Hapus ${tokenText} dari posisi ${slotIdx + 1}`
                              : `Slot kosong ${slotIdx + 1}`
                          }
                          className={`m3-tactile inline-flex min-h-[44px] min-w-[68px] items-center justify-center gap-1 rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition-colors ${slotClass}`}
                        >
                          {hasTile ? (
                            <span>{tokenText}</span>
                          ) : (
                            <span className="font-mono text-xs opacity-75">
                              {isStarSlot ? '★' : slotIdx + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {currentQuestion.sentenceAfter && (
                      <span>{currentQuestion.sentenceAfter}</span>
                    )}
                  </div>

                  {!checked && placedTokenIndices.length > 0 && (
                    <div className="mt-3 flex justify-end border-t border-outline-variant pt-2.5">
                      <button
                        type="button"
                        onClick={handleResetSentenceSlots}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Ulangi Susunan</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Shuffled Word Bank */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-on-surface-variant">
                    Ketuk potongan kata di bawah secara berurutan:
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {shuffledTileIndices.map((tokenIdx) => {
                      const tokenText =
                        currentQuestion.orderedTokens?.[tokenIdx] ?? '';
                      const isUsed = placedTokenIndices.includes(tokenIdx);
                      return (
                        <button
                          key={`${currentQuestion.id}-tile-${tokenIdx}`}
                          type="button"
                          disabled={isUsed || checked}
                          onClick={() => handleTapBankTile(tokenIdx)}
                          className={`m3-tactile min-h-[48px] rounded-2xl border-2 px-4 py-2.5 text-sm font-bold transition-all ${
                            isUsed
                              ? 'border-outline-variant bg-surface-container/50 text-on-surface-variant/35 opacity-45'
                              : 'border-outline-variant bg-surface-container-low text-on-surface hover:border-primary hover:bg-surface-container'
                          }`}
                        >
                          {tokenText}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* FORMAT C: PILIHAN GANDA (MCQ & AUDIO OPTIONS) */
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
                      className={`m3-tactile flex min-h-[54px] w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3 text-left text-sm ${cardStyle}`}
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
            )}

            {/* Blitz Mode Fast Inline Feedback Banner (no blocking modal!) */}
            {checked && isBlitz && (
              <button
                type="button"
                onClick={handleAdvance}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                  lastAnswerCorrect
                    ? 'border-success/50 bg-success-container text-on-success-container'
                    : 'border-primary/50 bg-primary-container text-on-primary-container'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {lastAnswerCorrect ? (
                    <CheckCircle2
                      className="h-5 w-5 shrink-0 text-success"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      className="h-5 w-5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-display text-sm font-extrabold">
                      {lastAnswerCorrect
                        ? `Benar! +${lastPointsGain} poin${timeBonusFlash ? ' · +3 Detik!' : ''}`
                        : `Kurang tepat · Benar: ${getCorrectAnswerLabel(currentQuestion)}`}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold opacity-80">
                  Lanjut →
                </span>
              </button>
            )}
          </div>

          {/* Standard 1-Tap Instant Feedback Pop-up (Stage / Boss / Survival / Daily Drill) */}
          {checked && !isBlitz && (
            <div
              role="status"
              aria-live="assertive"
              onClick={handleAdvance}
              className="fixed inset-0 z-[60] flex cursor-pointer items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
            >
              <div
                className={`w-full max-w-md rounded-2xl border p-5 shadow-xl ${
                  lastAnswerCorrect
                    ? 'border-success/50 bg-surface-container-low'
                    : 'border-primary/50 bg-surface-container-low'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      lastAnswerCorrect
                        ? 'bg-success-container text-success'
                        : 'bg-primary-container text-primary'
                    }`}
                  >
                    {lastAnswerCorrect ? (
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-display text-base font-extrabold ${
                        lastAnswerCorrect ? 'text-success' : 'text-primary'
                      }`}
                    >
                      {lastAnswerCorrect
                        ? isBoss
                          ? `Serangan Telak! +${lastPointsGain} poin`
                          : combo >= 5
                            ? `FEVER x${currentMultiplier}! +${lastPointsGain} poin`
                            : combo >= 2
                              ? `Benar! Kombo x${combo} (+${lastPointsGain})`
                              : `Benar! +${lastPointsGain} poin`
                        : !usesHearts
                          ? 'Kurang tepat'
                          : hearts === 0
                            ? 'Kurang tepat · Nyawa habis'
                            : 'Kurang tepat · -1 Nyawa'}
                    </p>

                    {!lastAnswerCorrect && (
                      <p className="mt-1 text-xs font-medium text-on-surface">
                        Jawaban benar:{' '}
                        <span className="font-bold text-success">
                          {getCorrectAnswerLabel(currentQuestion)}
                        </span>
                      </p>
                    )}

                    {currentQuestion.audioReveal && (
                      <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                        Audio: {currentQuestion.audioReveal}
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
