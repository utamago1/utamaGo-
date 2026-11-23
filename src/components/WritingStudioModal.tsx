import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Eye,
  EyeOff,
  PenTool,
  RotateCcw,
  Undo2,
} from 'lucide-react';
import type { JlptLevel } from '../data/utamagoContent';
import type { AnkiCard } from '../utils/ankiParser';
import { vibrateSuccess, vibrateTap } from '../utils/haptics';
import {
  buildWritingPracticeDeck,
  type WritingPracticeMode,
} from '../utils/writingPractice';
import { SpeechControlBar } from './SpeechControlBar';

interface StrokePoint {
  x: number;
  y: number;
}

interface CanvasStroke {
  points: StrokePoint[];
  width: number;
}

export interface WritingStudioModalProps {
  open: boolean;
  cards: readonly AnkiCard[];
  difficultCardIds: ReadonlySet<string>;
  unlockedLevel: JlptLevel;
  initialMode?: WritingPracticeMode;
  initialSeedText?: string;
  onCompletePractice?: (practicedCount: number) => void;
  onClose: () => void;
}

const MODE_OPTIONS: ReadonlyArray<{ id: WritingPracticeMode; label: string }> = [
  { id: 'kanji', label: 'Kanji' },
  { id: 'difficult-kanji', label: 'Kanji Sulit' },
  { id: 'hiragana', label: 'Hiragana' },
  { id: 'katakana', label: 'Katakana' },
];

const LEVEL_OPTIONS: ReadonlyArray<JlptLevel | 'ALL'> = [
  'N5',
  'N4',
  'N3',
  'N2',
  'N1',
  'ALL',
];

export function WritingStudioModal({
  open,
  cards,
  difficultCardIds,
  unlockedLevel,
  initialMode = 'kanji',
  initialSeedText,
  onCompletePractice,
  onClose,
}: WritingStudioModalProps) {
  const [mode, setMode] = useState<WritingPracticeMode>(initialMode);
  const [level, setLevel] = useState<JlptLevel | 'ALL'>(unlockedLevel);
  const [seedText, setSeedText] = useState<string | undefined>(initialSeedText);
  const [index, setIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const [brushSize, setBrushSize] = useState<'fine' | 'calligraphy'>('calligraphy');
  const [strokes, setStrokes] = useState<CanvasStroke[]>([]);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStrokeRef = useRef<CanvasStroke | null>(null);
  const drawingRef = useRef(false);

  // Sync initial props when modal opens
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setSeedText(initialSeedText);
    setIndex(0);
    setStrokes([]);
  }, [open, initialMode, initialSeedText]);

  const deck = useMemo(
    () =>
      buildWritingPracticeDeck({
        mode,
        level,
        cards,
        difficultCardIds,
        seedText,
      }),
    [cards, difficultCardIds, level, mode, seedText],
  );

  const safeIndex = deck.length > 0 ? Math.min(index, deck.length - 1) : 0;
  const activeItem = deck[safeIndex] ?? null;

  const redrawCanvas = useCallback(
    (strokeList: readonly CanvasStroke[], inProgress?: CanvasStroke | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const cssWidth = Math.max(200, Math.round(rect.width));
      const cssHeight = Math.max(200, Math.round(rect.height));

      if (
        canvas.width !== Math.round(cssWidth * dpr) ||
        canvas.height !== Math.round(cssHeight * dpr)
      ) {
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Draw genkouyoushi 4-quadrant calligraphy guides
      ctx.strokeStyle = 'rgba(113, 113, 122, 0.24)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      ctx.moveTo(cssWidth / 2, 10);
      ctx.lineTo(cssWidth / 2, cssHeight - 10);
      ctx.moveTo(10, cssHeight / 2);
      ctx.lineTo(cssWidth - 10, cssHeight / 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(113, 113, 122, 0.12)';
      ctx.beginPath();
      ctx.moveTo(12, 12);
      ctx.lineTo(cssWidth - 12, cssHeight - 12);
      ctx.moveTo(cssWidth - 12, 12);
      ctx.lineTo(12, cssHeight - 12);
      ctx.stroke();
      ctx.setLineDash([]);

      // Faint ghost tracing character
      if (showGuide && activeItem) {
        ctx.fillStyle = 'rgba(24, 24, 27, 0.11)';
        ctx.font = `700 ${Math.round(cssWidth * 0.68)}px "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeItem.character, cssWidth / 2, cssHeight / 2 + 4);
      }

      // Render smooth quadratic Bezier strokes
      const allStrokes = inProgress ? [...strokeList, inProgress] : strokeList;
      ctx.strokeStyle = '#18181b';
      ctx.fillStyle = '#18181b';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const stroke of allStrokes) {
        const pts = stroke.points;
        if (pts.length === 0) continue;
        ctx.lineWidth = stroke.width;

        if (pts.length === 1) {
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i += 1) {
          const midX = (pts[i].x + pts[i + 1].x) / 2;
          const midY = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }

      ctx.restore();
    },
    [activeItem, showGuide],
  );

  useEffect(() => {
    if (!open) return;
    redrawCanvas(strokes);
    const handleResize = () => redrawCanvas(strokes);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, redrawCanvas, strokes]);

  if (!open) return null;

  const getPointerPoint = (
    e: ReactPointerEvent<HTMLCanvasElement>,
  ): StrokePoint => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = getPointerPoint(e);
    const width = brushSize === 'calligraphy' ? 9 : 4.5;
    activeStrokeRef.current = { points: [pt], width };
    redrawCanvas(strokes, activeStrokeRef.current);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !activeStrokeRef.current) return;
    e.preventDefault();
    const pt = getPointerPoint(e);
    activeStrokeRef.current.points.push(pt);
    redrawCanvas(strokes, activeStrokeRef.current);
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !activeStrokeRef.current) return;
    e.preventDefault();
    drawingRef.current = false;
    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;
    setStrokes((prev) => [...prev, finished]);
  };

  const handleClear = () => {
    vibrateTap();
    setStrokes([]);
  };

  const handleUndo = () => {
    vibrateTap();
    setStrokes((prev) => prev.slice(0, -1));
  };

  const goToIndex = (nextIdx: number) => {
    if (deck.length === 0) return;
    const wrapped = (nextIdx + deck.length) % deck.length;
    setIndex(wrapped);
    setStrokes([]);
  };

  const handleMarkMasteredAndNext = () => {
    vibrateSuccess();
    if (activeItem && !masteredIds.includes(activeItem.id)) {
      setMasteredIds((prev) => [...prev, activeItem.id]);
    }
    if (safeIndex + 1 < deck.length) {
      goToIndex(safeIndex + 1);
    } else {
      setStrokes([]);
    }
  };

  const handleCloseStudio = () => {
    vibrateTap();
    if (masteredIds.length > 0) {
      onCompletePractice?.(masteredIds.length);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Studio Latihan Tulis Kanji dan Kana"
      className="fixed inset-0 z-50 flex flex-col bg-surface text-on-surface"
    >
      <header className="shrink-0 border-b border-outline-variant bg-surface-container-low pt-safe pl-safe pr-safe">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={handleCloseStudio}
              aria-label="Tutup studio tulis"
              className="m3-tactile inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface text-on-surface hover:bg-surface-container"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h2 className="truncate font-display text-base font-extrabold tracking-tight text-on-surface sm:text-lg">
                Studio Tulis Kanji &amp; Kana
              </h2>
              <p className="text-xs text-on-surface-variant">
                <span className="font-mono font-semibold tabular-nums text-primary">
                  {masteredIds.length}
                </span>{' '}
                karakter dilatih sesi ini
                {seedText ? ` · Fokus: ${seedText}` : ''}
              </p>
            </div>
          </div>

          {seedText && (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                setSeedText(undefined);
                setIndex(0);
                setStrokes([]);
              }}
              className="min-h-[40px] shrink-0 whitespace-nowrap rounded-xl border border-outline-variant bg-surface px-3 text-xs font-bold text-on-surface hover:bg-surface-container"
            >
              Semua Karakter
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-safe">
        <div className="mx-auto w-full max-w-4xl space-y-4">
          {/* Mode & Level Selector */}
          {!seedText && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div
                role="tablist"
                aria-label="Mode latihan menulis"
                className="no-scrollbar flex gap-1.5 overflow-x-auto"
              >
                {MODE_OPTIONS.map((opt) => {
                  const active = mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        vibrateTap();
                        setMode(opt.id);
                        setIndex(0);
                        setStrokes([]);
                      }}
                      className={`m3-tactile min-h-[40px] shrink-0 whitespace-nowrap rounded-xl border px-3 text-xs font-bold transition-colors ${
                        active
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-on-surface'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {mode === 'kanji' && (
                <div
                  role="group"
                  aria-label="Filter level Kanji"
                  className="no-scrollbar flex gap-1 overflow-x-auto"
                >
                  {LEVEL_OPTIONS.map((lv) => {
                    const active = level === lv;
                    return (
                      <button
                        key={lv}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          vibrateTap();
                          setLevel(lv);
                          setIndex(0);
                          setStrokes([]);
                        }}
                        className={`min-h-[38px] shrink-0 rounded-lg border px-2.5 font-mono text-xs font-bold transition-colors ${
                          active
                            ? 'border-primary bg-primary-container text-on-primary-container'
                            : 'border-outline-variant bg-surface text-on-surface-variant hover:border-outline hover:text-on-surface'
                        }`}
                      >
                        {lv === 'ALL' ? 'Semua' : lv}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!activeItem ? (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center">
              <p className="font-display text-base font-bold text-on-surface">
                Belum ada Kanji di daftar sulit
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Tandai kosakata ber-Kanji sebagai sulit di Anki atau Kamus, atau
                pilih mode Kanji / Hiragana / Katakana untuk mulai berlatih.
              </p>
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setMode('kanji');
                  setIndex(0);
                }}
                className="m3-tactile mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary-hover"
              >
                Buka Latihan Kanji {unlockedLevel}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
              {/* Left / Top: Interactive Genkouyoushi Canvas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-on-surface-variant">
                  <span className="font-mono font-bold tabular-nums text-on-surface">
                    Karakter {safeIndex + 1}/{deck.length}
                  </span>
                  <span className="font-mono tabular-nums">
                    {strokes.length} goresan ·{' '}
                    {showGuide ? 'Mode Tracing' : 'Uji Memori'}
                  </span>
                </div>

                <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-2xl border border-outline bg-white shadow-xs">
                  <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    aria-label={`Kanvas tulis karakter ${activeItem.character}`}
                    className="h-full w-full cursor-crosshair touch-none select-none"
                  />
                  {strokes.length === 0 && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-0 bottom-2.5 left-0 text-center text-[11px] font-medium text-on-surface-variant/70"
                    >
                      Tulis dengan jari atau mouse di dalam kotak
                    </span>
                  )}
                </div>

                {/* Canvas Toolbar */}
                <div className="mx-auto grid w-full max-w-[360px] grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={strokes.length === 0}
                    className="m3-tactile inline-flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border border-outline-variant bg-surface-container-low px-2 py-1.5 text-[11px] font-bold text-on-surface hover:bg-surface-container disabled:opacity-40"
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                    <span>Undo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={strokes.length === 0}
                    className="m3-tactile inline-flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border border-outline-variant bg-surface-container-low px-2 py-1.5 text-[11px] font-bold text-on-surface hover:bg-surface-container disabled:opacity-40"
                  >
                    <Eraser className="h-4 w-4" aria-hidden="true" />
                    <span>Bersih</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      setShowGuide((prev) => !prev);
                    }}
                    aria-pressed={showGuide}
                    className={`m3-tactile inline-flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-1.5 text-[11px] font-bold ${
                      showGuide
                        ? 'border-primary/40 bg-primary-container text-on-primary-container'
                        : 'border-outline-variant bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    {showGuide ? (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>{showGuide ? 'Tracing' : 'Memori'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      setBrushSize((prev) =>
                        prev === 'calligraphy' ? 'fine' : 'calligraphy',
                      );
                    }}
                    className="m3-tactile inline-flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border border-outline-variant bg-surface-container-low px-2 py-1.5 text-[11px] font-bold text-on-surface hover:bg-surface-container"
                  >
                    <PenTool className="h-4 w-4" aria-hidden="true" />
                    <span>{brushSize === 'calligraphy' ? 'Tebal' : 'Halus'}</span>
                  </button>
                </div>
              </div>

              {/* Right / Bottom: Character Reference, Audio & Progression */}
              <div className="space-y-4 rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-primary">
                      {activeItem.kind === 'kanji'
                        ? `Kanji ${activeItem.jlptLevel ?? 'JLPT'}`
                        : activeItem.kind === 'hiragana'
                          ? 'Hiragana Dasar'
                          : 'Katakana Dasar'}
                      {activeItem.isDifficult ? ' · Dari Kata Sulit' : ''}
                    </p>
                    <h3 className="mt-1 font-display text-2xl font-extrabold text-on-surface">
                      {activeItem.character}{' '}
                      <span className="text-base font-semibold text-on-surface-variant">
                        {activeItem.reading}
                      </span>
                    </h3>
                    {activeItem.romaji && (
                      <p className="mt-0.5 font-mono text-xs text-on-surface-variant">
                        {activeItem.romaji}
                      </p>
                    )}
                    <p className="mt-1.5 text-sm font-medium text-on-surface">
                      {activeItem.meaning}
                    </p>
                  </div>

                  {masteredIds.includes(activeItem.id) && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-success">
                      <Check className="h-4 w-4" aria-hidden="true" />
                      <span>Dilatih</span>
                    </span>
                  )}
                </div>

                {activeItem.exampleWord && (
                  <div className="border-t border-outline-variant pt-3 text-xs">
                    <p className="font-semibold text-on-surface-variant">
                      Contoh Kosakata
                    </p>
                    <p className="mt-1 font-display text-base font-bold text-on-surface">
                      {activeItem.exampleWord}
                      {activeItem.exampleReading &&
                        activeItem.exampleReading !== activeItem.exampleWord && (
                          <span className="ml-2 text-xs font-normal text-on-surface-variant">
                            ({activeItem.exampleReading})
                          </span>
                        )}
                    </p>
                    {activeItem.exampleMeaning && (
                      <p className="mt-0.5 text-on-surface-variant">
                        {activeItem.exampleMeaning}
                      </p>
                    )}
                  </div>
                )}

                <div className="border-t border-outline-variant pt-3">
                  <SpeechControlBar
                    text={activeItem.exampleWord || activeItem.character}
                    compact
                    showShadowing
                    showQuickSettings
                  />
                </div>

                {/* Self-check + Next / Previous Controls */}
                <div className="grid grid-cols-2 gap-2.5 border-t border-outline-variant pt-4">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="m3-tactile inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border border-outline bg-surface px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span>Tulis Ulang</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkMasteredAndNext}
                    className="m3-tactile inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-on-primary hover:bg-primary-hover"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {safeIndex + 1 < deck.length
                        ? 'Lancar · Lanjut'
                        : 'Tandai Lancar'}
                    </span>
                  </button>
                </div>

                {/* Quick Prev/Next Strip */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      goToIndex(safeIndex - 1);
                    }}
                    className="m3-tactile inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-outline-variant bg-surface px-3 text-xs font-semibold text-on-surface hover:bg-surface-container"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Sebelumnya</span>
                  </button>

                  <div className="no-scrollbar flex max-w-[180px] gap-1 overflow-x-auto sm:max-w-[260px]">
                    {deck.slice(Math.max(0, safeIndex - 3), safeIndex + 5).map((it) => {
                      const idxInDeck = deck.findIndex((d) => d.id === it.id);
                      const isCurrent = idxInDeck === safeIndex;
                      const isDone = masteredIds.includes(it.id);
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => {
                            vibrateTap();
                            goToIndex(idxInDeck);
                          }}
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${
                            isCurrent
                              ? 'border-primary bg-primary text-on-primary'
                              : isDone
                                ? 'border-success/40 bg-success-container text-on-success-container'
                                : 'border-outline-variant bg-surface text-on-surface hover:bg-surface-container'
                          }`}
                        >
                          {it.character}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      goToIndex(safeIndex + 1);
                    }}
                    className="m3-tactile inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-outline-variant bg-surface px-3 text-xs font-semibold text-on-surface hover:bg-surface-container"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
