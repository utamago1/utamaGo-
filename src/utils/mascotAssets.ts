import {
  getRankForLevel,
  type LearnerGender,
  type RankStageId,
} from './levelProgression';

export type MascotExpression =
  | 'idle'
  | 'tap_kaget'
  | 'happy'
  | 'mikir_loading'
  | 'bingung_sedih'
  | 'ngantuk_tidur';

export type MascotStageNumber = 1 | 2 | 3 | 4 | 5;

export const MASCOT_EXPRESSION_ORDER: readonly MascotExpression[] = [
  'idle',
  'happy',
  'tap_kaget',
  'mikir_loading',
  'bingung_sedih',
  'ngantuk_tidur',
];

export const MASCOT_EXPRESSION_LABELS: Record<MascotExpression, string> = {
  idle: 'Siap',
  happy: 'Ceria',
  tap_kaget: 'Kaget',
  mikir_loading: 'Mikir',
  bingung_sedih: 'Bingung',
  ngantuk_tidur: 'Ngantuk',
};

interface MascotFolderSpec {
  folder: string;
  prefix: string;
}

export const MASCOT_STAGE_ASSETS: Record<
  LearnerGender,
  Record<RankStageId, MascotFolderSpec>
> = {
  cowok: {
    EGG: { folder: 'stage_egg_n5_1795072569641', prefix: 'egg' },
    HATCH: { folder: 'stage_hatch_n4_1795072570966', prefix: 'hatch_n4' },
    CHICK: { folder: 'stage_chick_n3_1795072571171', prefix: 'chick_n3' },
    GROW: { folder: 'stage_grow_n2_1795072570529', prefix: 'grow_n2' },
    FLY: { folder: 'stage_fly_n1_1795072570015', prefix: 'fly_n1' },
  },
  cewek: {
    EGG: { folder: 'stage_egg_cewek_1795270161974', prefix: 'egg' },
    HATCH: { folder: 'stage_hatch_cewek_1795270162328', prefix: 'hatch_n4' },
    CHICK: { folder: 'stage_chick_cewek_1795270162240', prefix: 'chick_n3' },
    GROW: { folder: 'stage_grow_cewek_1795270163692', prefix: 'grow_n2' },
    FLY: { folder: 'stage_fly_cewek_1795270163227', prefix: 'fly_n1' },
  },
};

const STAGE_BY_NUMBER: Record<MascotStageNumber, RankStageId> = {
  1: 'EGG',
  2: 'HATCH',
  3: 'CHICK',
  4: 'GROW',
  5: 'FLY',
};

/**
 * Resolves a RankStageId from an explicit RankStageId, a 1-5 stage number,
 * or a learner XP level (mapped via RANKS thresholds).
 */
export function resolveMascotStage(options: {
  stage?: RankStageId;
  stageNumber?: MascotStageNumber;
  level?: number;
}): RankStageId {
  if (options.stage) return options.stage;
  if (options.stageNumber) {
    return STAGE_BY_NUMBER[options.stageNumber] ?? 'EGG';
  }
  if (typeof options.level === 'number' && Number.isFinite(options.level)) {
    return getRankForLevel(Math.max(1, Math.floor(options.level))).stage;
  }
  return 'EGG';
}

export function normalizeMascotGender(
  gender?: LearnerGender | string | null,
): LearnerGender {
  return gender === 'cewek' ? 'cewek' : 'cowok';
}

/**
 * Returns the local public URL for a mascot animated GIF given stage, gender,
 * and expression. Defaults gender to 'cowok' and expression to 'idle'.
 */
export function getMascotGifPath(
  stageOrNumber: RankStageId | MascotStageNumber,
  gender?: LearnerGender | null,
  expression: MascotExpression = 'idle',
): string {
  const stage: RankStageId =
    typeof stageOrNumber === 'number'
      ? (STAGE_BY_NUMBER[stageOrNumber] ?? 'EGG')
      : stageOrNumber;
  const safeGender = normalizeMascotGender(gender);
  const spec = MASCOT_STAGE_ASSETS[safeGender][stage];
  return `/assets/mascot/${spec.folder}/${spec.prefix}_${expression}.gif`;
}

export const MASCOT_PRIORITY_PRELOAD_EXPRESSIONS: readonly MascotExpression[] = [
  'idle',
  'tap_kaget',
  'happy',
];

export const MASCOT_SECONDARY_PRELOAD_EXPRESSIONS: readonly MascotExpression[] =
  ['mikir_loading', 'bingung_sedih', 'ngantuk_tidur'];

export function getMascotPreloadPaths(
  stage: RankStageId,
  gender?: LearnerGender | null,
  includeAll = false,
): string[] {
  const list = includeAll
    ? MASCOT_EXPRESSION_ORDER
    : MASCOT_PRIORITY_PRELOAD_EXPRESSIONS;
  return list.map((expr) => getMascotGifPath(stage, gender, expr));
}

// Keep references to preloaded Image instances so the browser holds decoded GIFs warm in cache
const preloadedMascotCache = new Map<string, HTMLImageElement>();

export function preloadMascotGifs(
  stage: RankStageId,
  gender?: LearnerGender | null,
): void {
  if (typeof window === 'undefined' || typeof window.Image === 'undefined') {
    return;
  }

  const warmUrls = (urls: string[]) => {
    for (const url of urls) {
      if (preloadedMascotCache.has(url)) continue;
      const img = new window.Image();
      img.decoding = 'async';
      img.src = url;
      preloadedMascotCache.set(url, img);
    }
  };

  // Preload core interactive expressions immediately so tap switches have zero flicker
  warmUrls(getMascotPreloadPaths(stage, gender, false));

  // Warm remaining state expressions gently in the background
  const secondaryUrls = MASCOT_SECONDARY_PRELOAD_EXPRESSIONS.map((expr) =>
    getMascotGifPath(stage, gender, expr),
  );
  const scheduleIdle =
    typeof window.requestIdleCallback === 'function'
      ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 2500 })
      : (cb: () => void) => window.setTimeout(cb, 800);
  scheduleIdle(() => warmUrls(secondaryUrls));
}

export const MASCOT_TAP_ENCOURAGEMENTS: readonly string[] = [
  'Wah! Kaget! Ganbatte belajar hari ini ya!',
  'Ehh! Yuk cicil 5 kartu Anki bareng aku!',
  'Osu! Semangat terus menuju lulus JLPT!',
  'Hehe! Satu pola Bunpou hari ini, pasti bisa!',
  'Hai-hai! Sedikit tiap hari bikin makin jago!',
  'Yoshi! Ayo kita kumpulkan XP hari ini!',
];

export const MASCOT_WAKE_UP_LINES: readonly string[] = [
  'Eh?! Aku ketiduran! Yuk lanjut belajar!',
  'Hoaam... wah bangun! Siap latihan lagi!',
  'Ups, ketiduran bentar! Ayo buka 5 kartu!',
];

export const MASCOT_SLEEPY_IDLE_LINES: readonly string[] = [
  'Zzz... ketuk aku kalau siap lanjut ya...',
  'Hoaaam... aku tunggu sambil merem ya...',
  'Zzz... istirahat sebentar, nanti latihan lagi...',
];

export const MASCOT_LOADING_LINES: readonly string[] = [
  'Hmm... sebentar ya, lagi nyiapin kartumu!',
  'Lagi mikir dan memuat data belajarmu...',
];

export const MASCOT_ERROR_OR_EMPTY_LINES: readonly string[] = [
  'Eh, datanya belum lengkap. Coba muat ulang ya!',
  'Hmm, kartu review belum tersedia nih.',
];
