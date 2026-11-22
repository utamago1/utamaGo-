import type { StudyActivityLog } from './studyAnalytics';

export type MascotCondition =
  | 'new_user'
  | 'night'
  | 'target_reached'
  | 'high_streak'
  | 'sick_inactive'
  | 'gloomy_missed'
  | 'not_studied';

export type MascotMood =
  | 'neutral'
  | 'happy'
  | 'sleepy'
  | 'gloomy'
  | 'sick'
  | 'angry';

export interface MascotDialogInput {
  hasAnyHistory: boolean;
  dailyDoneCards: number;
  isTargetReached: boolean;
  dueAnkiCount: number;
  streakDays: number;
  hour?: number;
  /** Number of calendar days since the learner's last recorded study session (0 = today, null = never) */
  daysSinceLastStudy?: number | null;
}

export interface MascotDialogState {
  condition: MascotCondition;
  mood: MascotMood;
  variants: string[];
}

export const MASCOT_MAX_LINE_LENGTH = 60;

export const MASCOT_MOOD_ORDER: readonly MascotMood[] = [
  'happy',
  'neutral',
  'gloomy',
  'sick',
  'angry',
  'sleepy',
];

export const MASCOT_MOOD_LABELS: Record<MascotMood, string> = {
  neutral: 'Siap',
  happy: 'Ceria',
  sleepy: 'Ngantuk',
  gloomy: 'Murung',
  sick: 'Sakit',
  angry: 'Kesal',
};

const TRANSPARENT_MASCOT_BY_SOURCE: Record<string, string> = {
  '/src/assets/images/stage_egg_n5_1795072569641.jpg':
    '/assets/mascots/egg_cowok.png',
  '/src/assets/images/stage_hatch_n4_1795072570966.jpg':
    '/assets/mascots/hatch_cowok.png',
  '/src/assets/images/stage_chick_n3_1795072571171.jpg':
    '/assets/mascots/chick_cowok.png',
  '/src/assets/images/stage_grow_n2_1795072570529.jpg':
    '/assets/mascots/grow_cowok.png',
  '/src/assets/images/stage_fly_n1_1795072570015.jpg':
    '/assets/mascots/fly_cowok.png',
  '/src/assets/images/stage_egg_cewek_1795270161974.jpg':
    '/assets/mascots/egg_cewek.png',
  '/src/assets/images/stage_hatch_cewek_1795270162328.jpg':
    '/assets/mascots/hatch_cewek.png',
  '/src/assets/images/stage_chick_cewek_1795270162240.jpg':
    '/assets/mascots/chick_cewek.png',
  '/src/assets/images/stage_grow_cewek_1795270163692.jpg':
    '/assets/mascots/grow_cewek.png',
  '/src/assets/images/stage_fly_cewek_1795270163227.jpg':
    '/assets/mascots/fly_cewek.png',
};

/**
 * Resolves the high-resolution (400x400) transparent PNG mascot asset
 * corresponding to the current learner rank & gender illustration.
 */
export function resolveTransparentMascotSrc(
  illustrationPath: string,
  overrideSrc?: string,
): string {
  if (overrideSrc && overrideSrc.trim().length > 0) {
    return overrideSrc.trim();
  }
  return TRANSPARENT_MASCOT_BY_SOURCE[illustrationPath] ?? illustrationPath;
}

export function isNightHour(hour: number): boolean {
  const normalized = ((Math.floor(hour) % 24) + 24) % 24;
  return normalized >= 21 || normalized < 4;
}

function parseDateKeyUtc(dateKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Computes how many calendar days have passed since the learner's most recent
 * non-zero activity day. Returns null when the learner has no active day history.
 */
export function computeDaysSinceLastStudy(
  days: StudyActivityLog['days'],
  todayKey: string,
): number | null {
  const todayMs = parseDateKeyUtc(todayKey);
  if (todayMs === null) return null;

  let latestActiveMs: number | null = null;
  for (const [key, entry] of Object.entries(days)) {
    if (!entry || entry.total <= 0) continue;
    const ms = parseDateKeyUtc(key);
    if (ms === null || ms > todayMs) continue;
    if (latestActiveMs === null || ms > latestActiveMs) {
      latestActiveMs = ms;
    }
  }

  if (latestActiveMs === null) return null;
  return Math.max(0, Math.round((todayMs - latestActiveMs) / 86_400_000));
}

export const MASCOT_ANGRY_VARIANTS: readonly string[] = [
  'Hmph! Jangan dicolek terus dong!',
  'Eh, pelan-pelan ketuknya ya!',
  'Grrr... aku jadi pusing dicubit terus!',
  'Tahan dulu jarinya, yuk belajar bareng!',
];

export const MASCOT_WAVE_VARIANTS: readonly string[] = [
  'Halo! Semangat belajar hari ini ya!',
  'Hai-hai! Yuk cicil 5 kartu bareng.',
  'Dadah! Aku selalu siap menemanimu.',
  'Hore! Senang banget disapa kamu!',
];

export const MASCOT_SOOTHE_VARIANTS: readonly string[] = [
  'Hehe, makasih udah dielus! Semangat lagi!',
  'Yeay! Mood aku langsung membaik nih.',
  'Asyik! Sekarang yuk lanjut belajar!',
  'Makasih ya! Kamu teman belajar terbaik.',
];

export const MASCOT_SICK_VARIANTS: readonly string[] = [
  'Uhuk... sudah lama absen, aku lemas nih.',
  'Brrr... yuk 5 kartu biar aku sembuh!',
  'Aduh kepalaku... temani belajar sebentar ya.',
  'Hachii... butuh vitamin latihan hari ini!',
];

export const MASCOT_GLOOMY_VARIANTS: readonly string[] = [
  'Huhu... kemarin bolong, mulai lagi yuk?',
  'Sepi banget... temani aku 5 kartu ya.',
  'Aku murung nih, belum latihan hari ini...',
  'Yuk bangkit lagi, pelan-pelan nggak apa-apa.',
];

export function getMoodPreviewVariants(
  mood: MascotMood,
  dueAnkiCount: number,
  streakDays: number,
): string[] {
  switch (mood) {
    case 'angry':
      return [...MASCOT_ANGRY_VARIANTS];
    case 'sick':
      return [...MASCOT_SICK_VARIANTS];
    case 'gloomy':
      return [...MASCOT_GLOOMY_VARIANTS];
    case 'sleepy':
      return [
        'Sudah malam, santai sebentar yuk...',
        'Hoaaam... 5 kartu lalu istirahat ya.',
        'Malam yang tenang, belajar pelan aja.',
        'Waktunya rehat, besok lanjut lagi ya!',
      ];
    case 'happy':
      return streakDays >= 3
        ? [
            `Streak ${streakDays} hari, jangan putus ya!`,
            'Hebat! Semangat belajarmu luar biasa.',
            'Hore! Progresmu makin mantap hari ini.',
            'Asyik! Terus jaga ritme belajarmu ya!',
          ]
        : [
            'Hebat, semangat belajarmu keren banget!',
            'Hore! Aku senang banget hari ini!',
            'Mantap, progres belajarmu makin solid!',
            'Yeay! Yuk lanjut selangkah lagi!',
          ];
    default:
      return dueAnkiCount > 0
        ? [
            `Ayo, ${dueAnkiCount} kartu menunggu!`,
            `Yuk buka ${dueAnkiCount} kartu sebentar!`,
            'Hai-hai! Siap belajar bareng hari ini?',
            'Ketuk aku buat sapaan semangat ya!',
          ]
        : [
            'Halo! Aku teman belajarmu di sini.',
            'Hai-hai! Yuk intip materi Bunpou baru.',
            'Siap belajar Jepang bareng hari ini?',
            'Ketuk aku kapan saja buat semangat!',
          ];
  }
}

export function resolveMascotDialogState(
  input: MascotDialogInput,
): MascotDialogState {
  const {
    hasAnyHistory,
    dailyDoneCards,
    isTargetReached,
    dueAnkiCount,
    streakDays,
    hour = new Date().getHours(),
    daysSinceLastStudy = null,
  } = input;

  // 1. Pengguna baru tanpa riwayat belajar sama sekali
  if (!hasAnyHistory && dailyDoneCards === 0 && streakDays === 0) {
    return {
      condition: 'new_user',
      mood: 'neutral',
      variants: [
        'Halo! Aku teman belajarmu di sini.',
        'Salam kenal! Yuk mulai dari 5 kartu.',
        'Siap belajar Jepang bareng hari ini?',
        'Ketuk aku kapan saja buat semangat!',
      ],
    };
  }

  // 2. Malam hari (setelah 21:00 hingga 03:59)
  if (isNightHour(hour)) {
    return {
      condition: 'night',
      mood: 'sleepy',
      variants: [
        'Sudah malam, santai sebentar yuk...',
        'Hoaaam... 5 kartu lalu istirahat ya.',
        'Malam yang tenang, belajar pelan aja.',
        'Waktunya rehat, besok lanjut lagi ya!',
      ],
    };
  }

  // 3. Target harian tercapai (tanpa duplikasi pesan kartu "Target hari ini tercapai")
  if (isTargetReached) {
    return {
      condition: 'target_reached',
      mood: 'happy',
      variants: [
        'Hebat, target hari ini beres!',
        'Keren! Latihanmu tuntas hari ini.',
        'Mantap, progres belajarmu makin solid!',
        'Sukses! Istirahat dulu atau bonus?',
      ],
    };
  }

  // 4. Streak >= 3 hari
  if (streakDays >= 3) {
    return {
      condition: 'high_streak',
      mood: 'happy',
      variants: [
        `Streak ${streakDays} hari, jangan putus ya!`,
        `Keren, ${streakDays} hari beruntun! Lanjut yuk.`,
        `Api ${streakDays} hari menyala! Yuk jaga bareng.`,
        `Sudah ${streakDays} hari konsisten, hebat!`,
      ],
    };
  }

  // 5. Sakit / lemas: sudah >= 3 hari tidak belajar sejak sesi terakhir
  if (
    daysSinceLastStudy !== null &&
    daysSinceLastStudy >= 3 &&
    dailyDoneCards === 0
  ) {
    return {
      condition: 'sick_inactive',
      mood: 'sick',
      variants: [...MASCOT_SICK_VARIANTS],
    };
  }

  // 6. Murung / sedih: kemarin absen (streak putus) dan hari ini belum mulai
  if (
    daysSinceLastStudy !== null &&
    daysSinceLastStudy >= 1 &&
    streakDays === 0 &&
    dailyDoneCards === 0
  ) {
    return {
      condition: 'gloomy_missed',
      mood: 'gloomy',
      variants: [...MASCOT_GLOOMY_VARIANTS],
    };
  }

  // 7. Belum belajar hari ini / masih ada kartu menunggu
  if (dueAnkiCount > 0) {
    return {
      condition: 'not_studied',
      mood: 'neutral',
      variants: [
        `Ayo, ${dueAnkiCount} kartu menunggu!`,
        `Yuk buka ${dueAnkiCount} kartu sebentar!`,
        `Sedikit demi sedikit, ${dueAnkiCount} kartu siap!`,
        `Pemanasan dulu, ada ${dueAnkiCount} kartu menanti.`,
      ],
    };
  }

  return {
    condition: 'not_studied',
    mood: 'neutral',
    variants: [
      'Kartu kosong, yuk intip materi baru!',
      'Santai dulu, atau coba baca Bunpou?',
      'Antrean bersih! Coba Tantangan yuk.',
      'Semua kartu aman. Lanjut baca materi?',
    ],
  };
}

/**
 * Picks a random line from variants that is strictly different from previousLine
 * whenever more than one variant is available.
 */
export function pickNextMascotLine(
  variants: readonly string[],
  previousLine?: string,
  rng: () => number = Math.random,
): string {
  if (variants.length === 0) return '';
  if (variants.length === 1) return variants[0];

  const pool =
    previousLine !== undefined
      ? variants.filter((line) => line !== previousLine)
      : [...variants];

  const candidates = pool.length > 0 ? pool : variants;
  const rawIndex = Math.floor(rng() * candidates.length);
  const safeIndex = Math.max(0, Math.min(candidates.length - 1, rawIndex));
  return candidates[safeIndex];
}
