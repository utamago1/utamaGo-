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
  Hash,
  PenTool,
  Play,
  RotateCcw,
  Square,
  Undo2,
} from 'lucide-react';
import type { JlptLevel } from '../data/utamagoContent';
import type { AnkiCard } from '../utils/ankiParser';
import { vibrateSuccess, vibrateTap } from '../utils/haptics';
import {
  getCachedStrokeData,
  loadCharacterStrokeData,
  prefetchCharacterStrokeData,
  type CharacterStrokeData,
} from '../utils/strokeOrder';
import {
  buildWritingPracticeDeck,
  type WritingPracticeMode,
} from '../utils/writingPractice';
import { useLanguage } from '../i18n/LanguageContext';
import { resolveWritingItemSpeechText } from '../utils/japaneseSpeech';
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

const STROKE_ANIM_DURATION_MS = 640;
const STROKE_ANIM_PAUSE_MS = 160;

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
  const { t } = useLanguage();
  const [mode, setMode] = useState<WritingPracticeMode>(initialMode);
  const [level, setLevel] = useState<JlptLevel | 'ALL'>(unlockedLevel);
  const [seedText, setSeedText] = useState<string | undefined>(initialSeedText);
  const [index, setIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const [showStrokeNumbers, setShowStrokeNumbers] = useState(true);
  const [brushSize, setBrushSize] = useState<'fine' | 'calligraphy'>(
    'calligraphy',
  );
  const [strokes, setStrokes] = useState<CanvasStroke[]>([]);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);

  // Authentic KanjiVG stroke order state
  const [strokeData, setStrokeData] = useState<CharacterStrokeData | null>(null);
  const [strokeDataLoading, setStrokeDataLoading] = useState(false);

  // Interactive stroke-order animation state
  const [animState, setAnimState] = useState<{
    mode: 'idle' | 'all' | 'single';
    strokeIndex: number;
    progress: number;
  }>({ mode: 'idle', strokeIndex: 0, progress: 0 });
  const [inspectedStrokeIdx, setInspectedStrokeIdx] = useState<number | null>(
    null,
  );
  const [animTip, setAnimTip] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animPathRef = useRef<SVGPathElement | null>(null);
  const animRafRef = useRef<number | null>(null);
  const drawingRef = useRef(false);
  const activeStrokeRef = useRef<CanvasStroke | null>(null);

  const stopStrokeAnimation = useCallback(() => {
    if (animRafRef.current !== null) {
      window.cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }
    setAnimState({ mode: 'idle', strokeIndex: 0, progress: 0 });
    setAnimTip(null);
  }, []);

  // Reset modal internal state whenever opened with fresh props
  useEffect(() => {
    if (!open) return;
    stopStrokeAnimation();
    setMode(initialMode);
    setLevel(unlockedLevel);
    setSeedText(initialSeedText);
    setIndex(0);
    setStrokes([]);
    setInspectedStrokeIdx(null);
  }, [initialMode, initialSeedText, open, stopStrokeAnimation, unlockedLevel]);

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
  const nextItem =
    deck.length > 1 ? deck[(safeIndex + 1) % deck.length] : null;

  // Load KanjiVG stroke order whenever the active character changes
  useEffect(() => {
    if (!open || !activeItem) {
      setStrokeData(null);
      setStrokeDataLoading(false);
      return;
    }

    stopStrokeAnimation();
    setInspectedStrokeIdx(null);

    const char = activeItem.character;
    const cached = getCachedStrokeData(char);
    if (cached !== undefined) {
      setStrokeData(cached);
      setStrokeDataLoading(false);
    } else {
      let cancelled = false;
      setStrokeData(null);
      setStrokeDataLoading(true);
      void loadCharacterStrokeData(char).then((data) => {
        if (cancelled) return;
        setStrokeData(data);
        setStrokeDataLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }
  }, [activeItem, open, stopStrokeAnimation]);

  // Silently prefetch next character's stroke order for zero-latency navigation
  useEffect(() => {
    if (!open || !nextItem) return;
    prefetchCharacterStrokeData(nextItem.character);
  }, [nextItem, open]);

  // Clean up animation frame on unmount / close
  useEffect(() => {
    if (!open) {
      stopStrokeAnimation();
    }
    return () => {
      if (animRafRef.current !== null) {
        window.cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }
    };
  }, [open, stopStrokeAnimation]);

  const runStrokeAnimation = useCallback(
    (playMode: 'all' | 'single', startIdx: number) => {
      if (!strokeData || strokeData.strokes.length === 0) return;
      stopStrokeAnimation();

      const total = strokeData.strokes.length;
      const clampedStart = Math.max(0, Math.min(startIdx, total - 1));
      const endIdx = playMode === 'single' ? clampedStart : total - 1;
      const stepTotalMs = STROKE_ANIM_DURATION_MS + STROKE_ANIM_PAUSE_MS;
      const startedAt = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startedAt;
        const stepOffset = Math.floor(elapsed / stepTotalMs);
        const currentIdx = clampedStart + stepOffset;

        if (currentIdx > endIdx) {
          animRafRef.current = null;
          setAnimState({ mode: 'idle', strokeIndex: endIdx, progress: 0 });
          setAnimTip(null);
          return;
        }

        const withinStep = elapsed - stepOffset * stepTotalMs;
        const rawProgress = Math.min(1, withinStep / STROKE_ANIM_DURATION_MS);
        // Smooth ease-out curve for natural calligraphy pacing
        const eased = 1 - Math.pow(1 - rawProgress, 2.2);

        setAnimState({
          mode: playMode,
          strokeIndex: currentIdx,
          progress: eased,
        });

        animRafRef.current = window.requestAnimationFrame(tick);
      };

      setAnimState({ mode: playMode, strokeIndex: clampedStart, progress: 0 });
      animRafRef.current = window.requestAnimationFrame(tick);
    },
    [stopStrokeAnimation, strokeData],
  );

  // Sync live red brush tip coordinates from SVG path geometry during animation
  useEffect(() => {
    if (animState.mode === 'idle') {
      setAnimTip(null);
      return;
    }
    const pathEl = animPathRef.current;
    if (!pathEl) return;
    try {
      const len = pathEl.getTotalLength();
      const pt = pathEl.getPointAtLength(len * animState.progress);
      setAnimTip({ x: pt.x, y: pt.y });
    } catch {
      setAnimTip(null);
    }
  }, [animState]);

  const redrawCanvas = useCallback(
    (strokeList: CanvasStroke[], inProgress?: CanvasStroke | null) => {
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

      // Render smooth quadratic Bezier user ink strokes on transparent layer
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
    [],
  );

  useEffect(() => {
    if (!open) return;
    redrawCanvas(strokes);
    const handleResize = () => redrawCanvas(strokes);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, redrawCanvas, strokes]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopStrokeAnimation();
        if (masteredIds.length > 0) {
          onCompletePractice?.(masteredIds.length);
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [masteredIds.length, onClose, onCompletePractice, open, stopStrokeAnimation]);

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
    if (animState.mode !== 'idle') {
      stopStrokeAnimation();
    }
    if (inspectedStrokeIdx !== null) {
      setInspectedStrokeIdx(null);
    }
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
    stopStrokeAnimation();
    setInspectedStrokeIdx(null);
    setStrokes([]);
  };

  const handleUndo = () => {
    vibrateTap();
    stopStrokeAnimation();
    setInspectedStrokeIdx(null);
    setStrokes((prev) => prev.slice(0, -1));
  };

  const goToIndex = (nextIdx: number) => {
    if (deck.length === 0) return;
    stopStrokeAnimation();
    setInspectedStrokeIdx(null);
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
    stopStrokeAnimation();
    if (masteredIds.length > 0) {
      onCompletePractice?.(masteredIds.length);
    }
    onClose();
  };

  const isAnimating = animState.mode !== 'idle';
  const totalExpectedStrokes = strokeData?.strokeCount ?? null;

  // Which stroke should be highlighted as the next/inspected stroke guide
  const focusedStrokeIdx = (() => {
    if (!strokeData || !showGuide) return -1;
    if (isAnimating) return animState.strokeIndex;
    if (inspectedStrokeIdx !== null) return inspectedStrokeIdx;
    if (strokes.length < strokeData.strokeCount) return strokes.length;
    return -1;
  })();

  const focusedStroke =
    strokeData && focusedStrokeIdx >= 0
      ? strokeData.strokes[focusedStrokeIdx]
      : null;

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
                stopStrokeAnimation();
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
                        stopStrokeAnimation();
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
                          stopStrokeAnimation();
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
              {/* Left / Top: Interactive Genkouyoushi Canvas + Live Stroke Order Overlay */}
              <div className="space-y-2.5">
                <div className="mx-auto flex w-full max-w-[360px] items-center justify-between text-xs text-on-surface-variant">
                  <span className="font-mono font-bold tabular-nums text-on-surface">
                    Karakter {safeIndex + 1}/{deck.length}
                  </span>
                  <span className="font-mono tabular-nums">
                    {isAnimating && totalExpectedStrokes ? (
                      <span className="font-bold text-primary">
                        Animasi {animState.strokeIndex + 1}/
                        {totalExpectedStrokes}
                      </span>
                    ) : totalExpectedStrokes ? (
                      <>
                        Goresan{' '}
                        <strong className="text-on-surface">
                          {strokes.length}/{totalExpectedStrokes}
                        </strong>{' '}
                        · {showGuide ? 'Tracing' : 'Memori'}
                      </>
                    ) : (
                      <>
                        {strokes.length} goresan ·{' '}
                        {showGuide ? 'Tracing' : 'Memori'}
                      </>
                    )}
                  </span>
                </div>

                <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-2xl border border-outline bg-white shadow-xs">
                  {/* Layer 1: Genkouyoushi Grid + Vector Stroke Order Guide (109x109 KanjiVG space) */}
                  <svg
                    viewBox="0 0 109 109"
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full select-none"
                  >
                    {/* Genkouyoushi 4-quadrant calligraphy grid */}
                    <g stroke="rgba(113, 113, 122, 0.24)" strokeWidth="0.55" strokeDasharray="2.2 2.2">
                      <line x1="54.5" y1="3" x2="54.5" y2="106" />
                      <line x1="3" y1="54.5" x2="106" y2="54.5" />
                    </g>
                    <g stroke="rgba(113, 113, 122, 0.12)" strokeWidth="0.45" strokeDasharray="2 2.5">
                      <line x1="4" y1="4" x2="105" y2="105" />
                      <line x1="105" y1="4" x2="4" y2="105" />
                    </g>

                    {/* Case A: Authentic KanjiVG Stroke Order Data loaded */}
                    {strokeData ? (
                      <>
                        {/* Base ghost character paths (in Tracing mode or during Animation) */}
                        {(showGuide || isAnimating) && (
                          <g
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            {strokeData.strokes.map((st, idx) => {
                              const isCompletedDuringAnim =
                                isAnimating &&
                                animState.mode === 'all' &&
                                idx < animState.strokeIndex;
                              const isFocusedNext =
                                !isAnimating &&
                                showGuide &&
                                idx === focusedStrokeIdx;

                              return (
                                <path
                                  key={st.number}
                                  d={st.d}
                                  stroke={
                                    isCompletedDuringAnim
                                      ? 'rgba(24, 24, 27, 0.72)'
                                      : isFocusedNext
                                        ? 'rgba(220, 38, 38, 0.34)'
                                        : 'rgba(24, 24, 27, 0.13)'
                                  }
                                  strokeWidth={
                                    isCompletedDuringAnim
                                      ? 4.2
                                      : isFocusedNext
                                        ? 5.2
                                        : 4.5
                                  }
                                  strokeDasharray={
                                    isFocusedNext ? '2.8 2.4' : undefined
                                  }
                                />
                              );
                            })}
                          </g>
                        )}

                        {/* Active Animated Stroke Path */}
                        {isAnimating && focusedStroke && (
                          <g
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path
                              ref={animPathRef}
                              d={focusedStroke.d}
                              pathLength={1}
                              stroke="#dc2626"
                              strokeWidth="5.2"
                              strokeDasharray="1"
                              strokeDashoffset={Math.max(
                                0,
                                1 - animState.progress,
                              )}
                            />
                            {animTip && (
                              <circle
                                cx={animTip.x}
                                cy={animTip.y}
                                r="3.4"
                                fill="#dc2626"
                                stroke="#ffffff"
                                strokeWidth="1.2"
                              />
                            )}
                          </g>
                        )}

                        {/* Stroke Number Badges for all strokes (when Tracing + Numbers ON) */}
                        {showGuide && showStrokeNumbers && !isAnimating && (
                          <g>
                            {strokeData.strokes.map((st, idx) => {
                              if (idx === focusedStrokeIdx) return null;
                              const alreadyDrawn = idx < strokes.length;
                              return (
                                <g
                                  key={`num-${st.number}`}
                                  transform={`translate(${st.labelX}, ${st.labelY})`}
                                  opacity={alreadyDrawn ? 0.42 : 0.88}
                                >
                                  <circle
                                    r="3.8"
                                    fill={alreadyDrawn ? '#e4e4e7' : '#ffffff'}
                                    stroke={
                                      alreadyDrawn ? '#a1a1aa' : '#71717a'
                                    }
                                    strokeWidth="0.65"
                                  />
                                  <text
                                    y="0.3"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fill={alreadyDrawn ? '#52525b' : '#27272a'}
                                    fontSize="4.6"
                                    fontWeight="700"
                                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                                  >
                                    {st.number}
                                  </text>
                                </g>
                              );
                            })}
                          </g>
                        )}

                        {/* Highlighted Start Dot + Direction Arrow for Next / Active Stroke */}
                        {(showGuide || isAnimating) && focusedStroke && (
                          <g>
                            {/* Directional arrow showing where to pull the stroke */}
                            <g
                              transform={`translate(${focusedStroke.startX}, ${focusedStroke.startY}) rotate(${focusedStroke.angleDeg})`}
                            >
                              <line
                                x1="4.8"
                                y1="0"
                                x2="11.5"
                                y2="0"
                                stroke="#dc2626"
                                strokeWidth="1.35"
                                strokeLinecap="round"
                              />
                              <polyline
                                points="9.2,-2.2 12.2,0 9.2,2.2"
                                fill="none"
                                stroke="#dc2626"
                                strokeWidth="1.35"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </g>

                            {/* Crisp numbered starting point dot */}
                            <g
                              transform={`translate(${focusedStroke.startX}, ${focusedStroke.startY})`}
                            >
                              <circle
                                r="5.1"
                                fill="#dc2626"
                                stroke="#ffffff"
                                strokeWidth="1.1"
                              />
                              <text
                                y="0.3"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#ffffff"
                                fontSize="5.4"
                                fontWeight="800"
                                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                              >
                                {focusedStroke.number}
                              </text>
                            </g>
                          </g>
                        )}
                      </>
                    ) : (
                      /* Fallback font outline while KanjiVG SVG loads or offline uncached */
                      showGuide && (
                        <text
                          x="54.5"
                          y="56"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="rgba(24, 24, 27, 0.11)"
                          fontSize="74"
                          fontWeight="700"
                          fontFamily='"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif'
                        >
                          {activeItem.character}
                        </text>
                      )
                    )}
                  </svg>

                  {/* Layer 2: User's transparent interactive drawing canvas */}
                  <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    aria-label={`Kanvas tulis karakter ${activeItem.character}`}
                    className="relative z-10 h-full w-full cursor-crosshair touch-none select-none"
                  />

                  {/* Subtle contextual hint at bottom of box */}
                  {strokes.length === 0 && !isAnimating && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-2 bottom-2 left-2 z-20 text-center text-[11px] font-medium text-on-surface-variant/80"
                    >
                      {strokeDataLoading
                        ? 'Memuat panduan urutan goresan...'
                        : strokeData && showGuide
                          ? `Mulai goresan 1 dari titik merah, ikuti arah panah`
                          : 'Tulis dengan jari atau mouse di dalam kotak'}
                    </span>
                  )}
                </div>

                {/* Stroke Order Animation & Numbers Quick Row */}
                <div className="mx-auto grid w-full max-w-[360px] grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!strokeData}
                    onClick={() => {
                      vibrateTap();
                      if (isAnimating) {
                        stopStrokeAnimation();
                      } else {
                        setShowGuide(true);
                        setInspectedStrokeIdx(null);
                        runStrokeAnimation('all', 0);
                      }
                    }}
                    className={`m3-tactile inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-45 ${
                      isAnimating
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-primary/40 bg-primary-container text-on-primary-container hover:border-primary'
                    }`}
                  >
                    {isAnimating ? (
                      <>
                        <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        <span>Hentikan Animasi</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        <span>
                          Putar Urutan
                          {totalExpectedStrokes
                            ? ` (${totalExpectedStrokes})`
                            : ''}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!strokeData || !showGuide}
                    aria-pressed={showStrokeNumbers}
                    onClick={() => {
                      vibrateTap();
                      setShowStrokeNumbers((prev) => !prev);
                    }}
                    className={`m3-tactile inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-45 ${
                      showStrokeNumbers && showGuide
                        ? 'border-outline bg-surface-container text-on-surface'
                        : 'border-outline-variant bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    <Hash className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>
                      {showStrokeNumbers ? 'Nomor: Aktif' : 'Nomor: Mati'}
                    </span>
                  </button>
                </div>

                {/* Canvas Drawing Toolbar */}
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
                      stopStrokeAnimation();
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

              {/* Right / Bottom: Character Reference, Interactive Stroke Steps, Audio & Progression */}
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
                      {totalExpectedStrokes
                        ? ` · ${totalExpectedStrokes} Goresan`
                        : ''}
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

                {activeItem.kind === 'kanji' && (
                  <div
                    aria-label={t(
                      "Cara baca On'yomi dan Kun'yomi",
                      "On'yomi and Kun'yomi readings",
                    )}
                    className="grid grid-cols-1 gap-2.5 border-t border-outline-variant pt-3 sm:grid-cols-2"
                  >
                    <div className="rounded-xl border border-outline-variant bg-surface px-3 py-2.5">
                      <p className="text-[11px] font-bold tracking-wide text-primary">
                        On&apos;yomi{' '}
                        <span className="font-normal text-on-surface-variant">
                          音読み
                        </span>
                      </p>
                      <p className="mt-1 font-display text-sm font-bold leading-snug text-on-surface">
                        {activeItem.onyomi && activeItem.onyomi.length > 0
                          ? activeItem.onyomi.join('・')
                          : '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-outline-variant bg-surface px-3 py-2.5">
                      <p className="text-[11px] font-bold tracking-wide text-secondary">
                        Kun&apos;yomi{' '}
                        <span className="font-normal text-on-surface-variant">
                          訓読み
                        </span>
                      </p>
                      <p className="mt-1 font-display text-sm font-bold leading-snug text-on-surface">
                        {activeItem.kunyomi && activeItem.kunyomi.length > 0
                          ? activeItem.kunyomi.join('・')
                          : '—'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Interactive Step-by-Step Stroke Picker */}
                {strokeData && (
                  <div className="space-y-2 border-t border-outline-variant pt-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-on-surface">
                        {t(
                          'Urutan Goresan (ketuk nomor untuk lihat arah)',
                          'Stroke Order (tap a number to preview)',
                        )}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
                        {strokeData.strokeCount}{' '}
                        {t('langkah', 'strokes')}
                      </span>
                    </div>

                    <div
                      role="group"
                      aria-label="Pilih langkah urutan goresan"
                      className="flex flex-wrap gap-1.5"
                    >
                      {strokeData.strokes.map((st, idx) => {
                        const isFocused = idx === focusedStrokeIdx;
                        const isDone = !isAnimating && idx < strokes.length;
                        return (
                          <button
                            key={st.number}
                            type="button"
                            onClick={() => {
                              vibrateTap();
                              setShowGuide(true);
                              setInspectedStrokeIdx(idx);
                              runStrokeAnimation('single', idx);
                            }}
                            aria-label={`Lihat animasi goresan ke-${st.number}`}
                            className={`m3-tactile inline-flex h-9 w-9 items-center justify-center rounded-lg border font-mono text-xs font-bold tabular-nums transition-colors ${
                              isFocused
                                ? 'border-primary bg-primary text-on-primary'
                                : isDone
                                  ? 'border-success/40 bg-success-container text-on-success-container'
                                  : 'border-outline-variant bg-surface text-on-surface hover:border-primary/50 hover:text-primary'
                            }`}
                          >
                            {st.number}
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[11px] leading-relaxed text-on-surface-variant">
                      Titik merah bernomor menunjukkan posisi awal pena dan panah
                      menunjukkan arah tarikan goresan.
                    </p>
                  </div>
                )}

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
                    text={resolveWritingItemSpeechText(activeItem)}
                    compact
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

                <p className="border-t border-outline-variant pt-2.5 text-[11px] text-on-surface-variant/80">
                  Panduan urutan goresan bersumber dari KanjiVG (CC BY-SA 3.0).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
