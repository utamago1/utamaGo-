import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import type { AnkiCard } from '../utils/ankiParser';
import { vibrateSuccess, vibrateTap } from '../utils/haptics';
import type { DifficultCardEntry } from '../utils/homeSummary';
import {
  isJapaneseSpeechSupported,
  resolveAnkiCardSpeechText,
  speakJapanese,
} from '../utils/japaneseSpeech';
import { HighlightedJapaneseText } from './HighlightedJapaneseText';

interface DifficultDrillModalProps {
  cards: DifficultCardEntry[];
  onMarkRemembered: (card: AnkiCard) => number;
  onClose: () => void;
}

const MAX_ROUND_CARDS = 15;

export function DifficultDrillModal({
  cards,
  onMarkRemembered,
  onClose,
}: DifficultDrillModalProps) {
  const [queue, setQueue] = useState<DifficultCardEntry[]>(() =>
    cards.slice(0, MAX_ROUND_CARDS),
  );
  const [totalRound, setTotalRound] = useState<number>(() =>
    Math.min(cards.length, MAX_ROUND_CARDS),
  );
  const [revealed, setRevealed] = useState(false);
  const [showReadingHint, setShowReadingHint] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [requeuedCount, setRequeuedCount] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);

  const speechSupported = useMemo(() => isJapaneseSpeechSupported(), []);
  const currentEntry = queue[0] ?? null;
  const isFinished = queue.length === 0;

  const progressPercent =
    totalRound > 0
      ? Math.min(100, Math.round((masteredCount / totalRound) * 100))
      : 100;

  const handleReveal = () => {
    vibrateTap();
    setRevealed(true);
  };

  const handleStillDifficult = () => {
    if (!currentEntry) return;
    vibrateTap();
    setReviewCount((prev) => prev + 1);
    setRequeuedCount((prev) => prev + 1);
    setQueue((prev) => {
      if (prev.length <= 1) return prev;
      const [head, ...rest] = prev;
      const insertAt = Math.min(rest.length, 2);
      const next = [...rest];
      next.splice(insertAt, 0, {
        ...head,
        lapses: head.lapses + 1,
      });
      return next;
    });
    setRevealed(false);
    setShowReadingHint(false);
  };

  const handleRemembered = () => {
    if (!currentEntry) return;
    vibrateSuccess();
    const xp = onMarkRemembered(currentEntry.card);
    setEarnedXp((prev) => prev + xp);
    setMasteredCount((prev) => prev + 1);
    setReviewCount((prev) => prev + 1);
    setQueue((prev) => prev.slice(1));
    setRevealed(false);
    setShowReadingHint(false);
  };

  const handleRestartRound = () => {
    vibrateTap();
    const fresh = cards.slice(0, MAX_ROUND_CARDS);
    setQueue(fresh);
    setTotalRound(fresh.length);
    setRevealed(false);
    setShowReadingHint(false);
    setMasteredCount(0);
    setReviewCount(0);
    setRequeuedCount(0);
    setEarnedXp(0);
  };

  const currentCard = currentEntry?.card ?? null;
  const firstExample = currentCard?.examples[0] ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Drill Khusus Kata Sulit"
      className="fixed inset-0 z-50 flex flex-col bg-surface text-on-surface"
    >
      <header className="shrink-0 border-b border-outline-variant bg-surface-container-low pt-safe pl-safe pr-safe">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            aria-label="Keluar dari drill kata sulit"
            className="m3-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-on-surface hover:bg-surface-container"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-on-surface-variant">
              <span className="truncate text-on-surface">
                Drill Kata Sulit
              </span>
              <span className="shrink-0 font-mono tabular-nums">
                {masteredCount}/{totalRound} selesai
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progres drill kata sulit"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {isFinished ? (
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6 pb-safe">
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-container text-success">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>

            <h2 className="mt-4 font-display text-xl font-extrabold text-on-surface">
              Sesi Drill Selesai
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
              Semua kata sulit di putaran ini berhasil kamu kuasai kembali dan
              dijadwalkan ulang di SRS Anki.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-outline-variant bg-surface p-3">
                <p className="text-[11px] font-medium text-on-surface-variant">
                  Dikuasai
                </p>
                <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-success">
                  {masteredCount}
                </p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface p-3">
                <p className="text-[11px] font-medium text-on-surface-variant">
                  Total Ulasan
                </p>
                <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-on-surface">
                  {reviewCount}
                </p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface p-3">
                <p className="text-[11px] font-medium text-on-surface-variant">
                  Hadiah XP
                </p>
                <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-primary">
                  +{earnedXp}
                </p>
              </div>
            </div>

            {requeuedCount > 0 && (
              <p className="mt-3 text-xs text-on-surface-variant">
                Diulang di dalam sesi sebanyak{' '}
                <span className="font-mono font-semibold tabular-nums text-on-surface">
                  {requeuedCount}x
                </span>{' '}
                sebelum hafal.
              </p>
            )}

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  onClose();
                }}
                className="m3-tactile flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
              >
                Selesai &amp; Kembali
              </button>

              {cards.length > 0 && (
                <button
                  type="button"
                  onClick={handleRestartRound}
                  className="m3-tactile flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-outline bg-surface px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Drill Putaran Berikutnya ({Math.min(cards.length, MAX_ROUND_CARDS)} kartu)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-5">
            <div className="w-full max-w-lg space-y-4">
              {/* Unboxed metadata strip */}
              <div className="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
                <p className="truncate font-medium">
                  <span className="font-mono font-semibold text-primary">
                    {currentCard?.jlptLevel ?? 'JLPT'}
                  </span>
                  {currentCard?.partOfSpeech ? ` · ${currentCard.partOfSpeech}` : ''}
                  {' · diulang '}
                  <span className="font-mono tabular-nums">
                    {currentEntry?.lapses ?? 1}x
                  </span>
                </p>
                <span className="shrink-0 font-mono tabular-nums">
                  {queue.length} tersisa
                </span>
              </div>

              {/* Flashcard Surface */}
              <div
                onClick={() => {
                  if (!revealed) handleReveal();
                }}
                className={`rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center transition-colors ${
                  !revealed ? 'cursor-pointer hover:border-outline' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      vibrateTap();
                      setShowReadingHint((prev) => !prev);
                    }}
                    className="m3-tactile inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-2.5 py-1 text-xs font-semibold text-on-surface-variant hover:text-on-surface"
                  >
                    {showReadingHint || revealed ? (
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>
                      {showReadingHint || revealed ? 'Bacaan tampil' : 'Lihat bacaan'}
                    </span>
                  </button>

                  {speechSupported && currentCard && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        vibrateTap();
                        speakJapanese(resolveAnkiCardSpeechText(currentCard));
                      }}
                      aria-label={`Dengarkan pelafalan ${currentCard.word}`}
                      className="m3-tactile inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-primary hover:opacity-90"
                    >
                      <Volume2 className="h-4.5 w-4.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="py-7">
                  <h2 className="font-display text-3xl font-extrabold tracking-tight text-on-surface break-words sm:text-4xl">
                    {currentCard?.word}
                  </h2>

                  {(showReadingHint || revealed) &&
                    currentCard?.furigana &&
                    currentCard.furigana !== currentCard.word && (
                      <p className="mt-2 text-base font-medium text-on-surface-variant">
                        {currentCard.furigana}
                        {currentCard.romaji ? ` · ${currentCard.romaji}` : ''}
                      </p>
                    )}

                  {!revealed && (
                    <p className="mt-5 text-xs text-on-surface-variant">
                      Ketuk kartu atau tombol di bawah untuk membuka arti &amp; contoh kalimat
                    </p>
                  )}
                </div>

                {revealed && currentCard && (
                  <div className="space-y-4 border-t border-outline-variant pt-5 text-left">
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant">
                        Arti
                      </p>
                      <p className="mt-1 font-display text-lg font-bold leading-snug text-on-surface">
                        {currentCard.meaning}
                      </p>
                    </div>

                    {firstExample && (
                      <div className="rounded-xl border border-outline-variant bg-surface p-3.5">
                        <p className="text-xs font-semibold text-on-surface-variant">
                          Contoh Kalimat
                        </p>
                        <div className="mt-1.5 text-sm leading-relaxed text-on-surface">
                          <HighlightedJapaneseText
                            sentence={firstExample.jp}
                            target={currentCard.word}
                            readingTerm={currentCard.readingTerm}
                            kind={
                              currentCard.cardKind === 'bunpou'
                                ? 'bunpou'
                                : 'vocab'
                            }
                            showSpeakButton
                          />
                        </div>
                        {firstExample.id && (
                          <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">
                            {firstExample.id}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <footer className="shrink-0 border-t border-outline-variant bg-surface-container-low px-4 py-3 pb-safe">
            <div className="mx-auto max-w-lg">
              {!revealed ? (
                <button
                  type="button"
                  onClick={handleReveal}
                  className="m3-tactile flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
                >
                  Tampilkan Jawaban
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleStillDifficult}
                    className="m3-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-outline bg-surface px-4 py-3 text-sm font-bold text-on-surface hover:bg-surface-container"
                  >
                    <RotateCcw className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span>Masih Sulit</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemembered}
                    className="m3-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-success px-4 py-3 text-sm font-bold text-white hover:opacity-95"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>Sudah Ingat</span>
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
