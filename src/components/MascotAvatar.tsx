import { useEffect, useMemo, useState } from 'react';
import type { LearnerGender, RankStageId } from '../utils/levelProgression';
import {
  getMascotGifPath,
  MASCOT_EXPRESSION_LABELS,
  normalizeMascotGender,
  preloadMascotGifs,
  resolveMascotStage,
  type MascotExpression,
  type MascotStageNumber,
} from '../utils/mascotAssets';

export interface MascotAvatarProps {
  /** Evolution stage ID (EGG, HATCH, CHICK, GROW, FLY). Takes precedence over level. */
  stage?: RankStageId;
  /** Optional explicit 1-5 evolution stage number */
  stageNumber?: MascotStageNumber;
  /** Optional learner XP level used if stage/stageNumber are not provided */
  level?: number;
  /** Character gender variant (defaults to 'cowok') */
  gender?: LearnerGender | null;
  /** Active animated GIF expression */
  expression?: MascotExpression;
  /** Square avatar size in pixels (default 104). Ignored for layout width/height when sizeClassName is provided. */
  size?: number;
  /** Optional responsive Tailwind width/height classes (e.g. "h-[124px] w-[124px] sm:h-[144px] sm:w-[144px]") */
  sizeClassName?: string;
  /** Static fallback image URL if the animated GIF ever fails to load */
  fallbackSrc?: string;
  /** Optional fallback text shown only if both GIF and static fallback fail */
  fallbackLabel?: string;
  /** Accessible button/image label */
  ariaLabel?: string;
  /** Interactive tap/click handler; renders a <button> when provided */
  onTap?: () => void;
  /** Extra classes for the outer avatar wrapper */
  className?: string;
  /** Optional data-* attributes for testing/inspection */
  dataMood?: string;
  dataCondition?: string;
}

/**
 * Compensates for generous empty white margins inside each stage's 512x512 GIF canvas
 * so every evolution stage appears crisp, prominent, and well-proportioned without clipping.
 */
const STAGE_OPTICAL_SCALE: Record<RankStageId, string> = {
  EGG: 'scale-[1.28]',
  HATCH: 'scale-[1.18]',
  CHICK: 'scale-[1.12]',
  GROW: 'scale-[1.14]',
  FLY: 'scale-[1.10]',
};

export function MascotAvatar({
  stage,
  stageNumber,
  level,
  gender = 'cowok',
  expression = 'idle',
  size = 104,
  sizeClassName,
  fallbackSrc,
  fallbackLabel = 'Tamago',
  ariaLabel = 'Maskot UtamaGo, ketuk untuk berinteraksi',
  onTap,
  className = '',
  dataMood,
  dataCondition,
}: MascotAvatarProps) {
  const resolvedStage = useMemo(
    () => resolveMascotStage({ stage, stageNumber, level }),
    [stage, stageNumber, level],
  );
  const resolvedGender = normalizeMascotGender(gender);

  const gifSrc = useMemo(
    () => getMascotGifPath(resolvedStage, resolvedGender, expression),
    [resolvedStage, resolvedGender, expression],
  );

  const [gifFailed, setGifFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  // Preload core GIFs (idle, tap_kaget, happy) for the active level & gender
  useEffect(() => {
    preloadMascotGifs(resolvedStage, resolvedGender);
  }, [resolvedStage, resolvedGender]);

  useEffect(() => {
    setGifFailed(false);
    setFallbackFailed(false);
  }, [gifSrc, fallbackSrc]);

  const activeSrc = !gifFailed ? gifSrc : fallbackSrc;
  const showImage = Boolean(activeSrc) && !fallbackFailed;
  const opticalScaleClass = !gifFailed ? STAGE_OPTICAL_SCALE[resolvedStage] : '';

  const avatarContent = showImage ? (
    <img
      src={activeSrc}
      alt={onTap ? '' : ariaLabel}
      aria-hidden={onTap ? true : undefined}
      width={size}
      height={size}
      loading="eager"
      decoding="async"
      draggable={false}
      onError={() => {
        if (!gifFailed && fallbackSrc) {
          setGifFailed(true);
        } else {
          setFallbackFailed(true);
        }
      }}
      className={`h-full w-full select-none object-contain mix-blend-multiply transition-transform duration-200 ${opticalScaleClass}`}
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center bg-primary-container font-display text-sm font-extrabold text-on-primary-container"
    >
      {fallbackLabel}
    </span>
  );

  const sharedBoxClasses =
    'relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-2xl border border-outline-variant/70 bg-[#f6f5f0] shadow-2xs dark:border-white/15 dark:bg-[#e8e5dd] dark:ring-1 dark:ring-white/10';
  const boxStyle = sizeClassName ? undefined : { width: size, height: size };

  if (onTap) {
    return (
      <button
        type="button"
        onClick={onTap}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={ariaLabel}
        title={`Maskot UtamaGo (${MASCOT_EXPRESSION_LABELS[expression]}) — ketuk untuk berinteraksi`}
        data-mascot-expression={expression}
        data-mascot-stage={resolvedStage}
        data-mascot-gender={resolvedGender}
        data-mascot-mood={dataMood}
        data-mascot-condition={dataCondition}
        style={boxStyle}
        className={`${sharedBoxClasses} cursor-pointer touch-manipulation p-0 transition-transform duration-150 active:scale-95 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${sizeClassName ?? ''} ${className}`}
      >
        {avatarContent}
      </button>
    );
  }

  return (
    <div
      data-mascot-expression={expression}
      data-mascot-stage={resolvedStage}
      data-mascot-gender={resolvedGender}
      data-mascot-mood={dataMood}
      data-mascot-condition={dataCondition}
      style={boxStyle}
      className={`${sharedBoxClasses} ${sizeClassName ?? ''} ${className}`}
    >
      {avatarContent}
    </div>
  );
}
