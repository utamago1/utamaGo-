import type { AnkiCard } from './ankiParser';
import { formatBunpouExplanation } from './bunpouExplanationFormatter';
import { normalizeFormulaLines } from './bunpouFormulaFormatter';

export const BUNPOU_N5_TEXT_URL =
  '/assets/aistudio/Bunpou_N5_Try_0fefe20b.txt';
export const BUNPOU_N4_TEXT_URL =
  '/assets/aistudio/Bunpou_N4_Shinkanzenmaster_a448db92.txt';
export const BUNPOU_N3_TEXT_URL =
  '/assets/aistudio/Bunpou_N3_ShinKanzenMaster_c3c47d26.txt';
export const BUNPOU_N2_TEXT_URL =
  '/assets/aistudio/JLPT_N2_Bunpou_Indonesia.txt';
export const BUNPOU_N1_TEXT_URL =
  '/assets/aistudio/Bunpou_N1_pelajaran1-20_c990e95d.txt';

export type BunpouDeckLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type BunpouN5GroupCode = 'BAB1_4' | 'BAB5_8' | 'BAB9';
export type BunpouN2GroupCode = 'I' | 'II' | 'III';
export type BunpouN3GroupCode = 'B1' | 'RINGKASAN' | 'B2' | 'B3';
export type BunpouGroupCode =
  | BunpouN5GroupCode
  | BunpouN2GroupCode
  | BunpouN3GroupCode;
export type BunpouN2GroupFilter = 'Semua' | BunpouGroupCode;

export interface BunpouN2GroupMeta {
  id: BunpouN2GroupFilter;
  shortLabel: string;
  title: string;
}

export const BUNPOU_N2_GROUPS: BunpouN2GroupMeta[] = [
  { id: 'Semua', shortLabel: 'Semua (141)', title: 'Semua Kelompok Tata Bahasa' },
  {
    id: 'I',
    shortLabel: 'I. Menjelaskan Hal',
    title: 'I. Menjelaskan Suatu Hal (ことがらを説明する)',
  },
  {
    id: 'II',
    shortLabel: 'II. Penilaian & Pandangan',
    title: 'II. Menyertakan Penilaian Pembicara (主観を含めて説明する)',
  },
  {
    id: 'III',
    shortLabel: 'III. Perasaan & Sikap',
    title: 'III. Menyatakan Pandangan & Perasaan (主観を述べる)',
  },
];

export function getBunpouGroupsForLevel(
  level: BunpouDeckLevel,
  totalCount?: number,
): BunpouN2GroupMeta[] {
  if (level === 'N5') {
    const countLabel = totalCount ?? 72;
    return [
      {
        id: 'Semua',
        shortLabel: `Semua (${countLabel})`,
        title: 'Semua Bagian Bunpou N5',
      },
      {
        id: 'BAB1_4',
        shortLabel: 'Bab 1–4: Dasar',
        title: 'Bab 1–4: Salam, Toko Elektronik, Belanja & Kota Ueno',
      },
      {
        id: 'BAB5_8',
        shortLabel: 'Bab 5–8: Lanjutan',
        title: 'Bab 5–8: Manga, Bandara, Ski & Makan Siang',
      },
      {
        id: 'BAB9',
        shortLabel: 'Bab 9–12: Partikel & Kata Bantu',
        title: 'Bab 9–12: Partikel, Adverbia, Konjungsi & Akhiran',
      },
    ];
  }

  if (level === 'N4') {
    const countLabel = totalCount ?? 99;
    return [
      {
        id: 'Semua',
        shortLabel: `Semua (${countLabel})`,
        title: 'Semua Bagian Bunpou N4',
      },
      {
        id: 'B1',
        shortLabel: 'Bab 1–25: Fungsi Makna',
        title: 'Bagian 1: Tata Bahasa Menurut Fungsi Makna',
      },
      {
        id: 'B2',
        shortLabel: 'Bab 26–40: Bentuk & Partikel',
        title: 'Bagian 2: Penyusunan Bentuk & Partikel',
      },
    ];
  }

  if (level === 'N3') {
    const countLabel = totalCount ?? 144;
    return [
      {
        id: 'Semua',
        shortLabel: `Semua (${countLabel})`,
        title: 'Semua Bagian Bunpou N3',
      },
      {
        id: 'B1',
        shortLabel: 'Bab 1–12: Fungsi Makna',
        title: 'Bagian 1: Tata Bahasa Menurut Fungsi Makna',
      },
      {
        id: 'RINGKASAN',
        shortLabel: 'Bab 13–22: Ringkasan A–J',
        title: 'Ringkasan Bentuk Tata Bahasa A–J',
      },
      {
        id: 'B2',
        shortLabel: 'Bab 23–26: Susunan Kalimat',
        title: 'Bagian 2: Susunan Kalimat',
      },
      {
        id: 'B3',
        shortLabel: 'Bab 27–28: Wacana',
        title: 'Bagian 3: Tata Bahasa Teks & Wacana',
      },
    ];
  }

  const countLabel = totalCount ?? (level === 'N1' ? 97 : 141);
  return [
    {
      id: 'Semua',
      shortLabel: `Semua (${countLabel})`,
      title: `Semua Kelompok Bunpou ${level}`,
    },
    {
      id: 'I',
      shortLabel: 'I. Menjelaskan Hal',
      title: 'I. Menjelaskan Suatu Hal (ことがらを説明する)',
    },
    {
      id: 'II',
      shortLabel: 'II. Penilaian & Pandangan',
      title: 'II. Menyertakan Penilaian Pembicara (主観を含めて説明する)',
    },
    {
      id: 'III',
      shortLabel: 'III. Perasaan & Sikap',
      title: 'III. Menyatakan Pandangan & Perasaan (主観を述べる)',
    },
  ];
}

export interface BunpouN2Example {
  jp: string;
  id: string;
}

export interface BunpouN2Item {
  id: string;
  level: BunpouDeckLevel;
  index: number;
  code: string;
  pattern: string;
  romaji: string;
  crossReference: string;
  lessonNumber: number;
  lessonTitle: string;
  /** Standardized Indonesian chapter title (present for 100% of N5–N1 chapters) */
  lessonTitleId?: string;
  /** Original Japanese chapter topic / key patterns */
  lessonTitleJp?: string;
  lessonFullTitle: string;
  groupId: BunpouGroupCode;
  groupTitle: string;
  meaning: string;
  register: string;
  formula: string;
  note: string;
  examples: BunpouN2Example[];
}

/**
 * Uniform short chapter badge used across Daftar Bab, breadcrumbs, Anki cards, and Comparison badges.
 */
export function formatBunpouLessonLabel(
  lessonOrItem: number | { lessonNumber: number },
): string {
  const num =
    typeof lessonOrItem === 'number' ? lessonOrItem : lessonOrItem.lessonNumber;
  return `Bab ${num}`;
}

/**
 * Complete Indonesian translations for all 40 JLPT N4 Bunpou chapters (Bagian 1 & 2).
 */
const N4_LESSON_TRANSLATIONS_ID: Record<number, { id: string; jp?: string }> = {
  1: { id: 'Perbandingan & Pilihan', jp: '~より・~ほど…ません・~のほう・~とどちら' },
  2: { id: 'Sambil, Tepat Saat & Batas Waktu', jp: '~ながら・~ところです・~まで・~までに' },
  3: { id: 'Ajakan & Tawaran', jp: '~ませんか・~ましょう(か)' },
  4: { id: 'Kemampuan / Bentuk Potensial', jp: '~(ら)れます・~ができます・見えます・聞こえます' },
  5: { id: 'Pengalaman & Kebiasaan', jp: '~たことがあります・~ことがあります' },
  6: { id: 'Izin, Larangan & Kewajiban', jp: '~てもいい・~てはいけない・~なくてもいい・~なければならない' },
  7: { id: 'Keinginan & Harapan', jp: '~がほしいです・~たいです・~といいです' },
  8: { id: 'Kesan, Tampilan & Kondisi Tetap', jp: '~そうです・~がっています・~まま' },
  9: { id: 'Sebab & Alasan', jp: '~から・~ので・~て' },
  10: { id: 'Tujuan', jp: '~に・~ため(に)・~ように' },
  11: { id: 'Menyebutkan Alasan & Aktivitas Beragam', jp: '(~も)~し・~たり~たりします' },
  12: { id: 'Dugaan, Keyakinan & Kemiripan', jp: '~かもしれません・~はずです・~ようです・~みたいです' },
  13: { id: 'Perintah, Saran & Keharusan', jp: '~なさい・~ほうがいいです・~ないと' },
  14: { id: 'Pengandaian & Syarat (1)', jp: '~たら・~ば・~なら・~と' },
  15: { id: 'Pengandaian & Syarat (2)', jp: '~たら・~なら' },
  16: { id: 'Pertentangan (Meskipun & Padahal)', jp: '~ても・~のに' },
  17: { id: 'Kutipan & Kalimat Tanya Tak Langsung', jp: '~と・~か・~かどうか' },
  18: { id: 'Niat & Rencana', jp: '~(よ)うと思います・~つもりです' },
  19: { id: 'Kabar & Sumber Informasi', jp: '~と言っていました・~そうです・~らしいです' },
  20: { id: 'Perubahan Keadaan & Kemampuan', jp: '~く/にします・~く/になります・~ようになります' },
  21: { id: 'Keputusan & Ketetapan', jp: '~にします・~ことにします・~になります・~ことになります' },
  22: { id: 'Mencoba, Persiapan & Selesai / Terlanjur', jp: '~てみます・~ておきます・~てしまいます' },
  23: { id: 'Memberi & Menerima', jp: 'あげます・くれます・もらいます' },
  24: { id: 'Kalimat Pasif', jp: '~(ら)れます (受身)' },
  25: { id: 'Kalimat Kausatif & Kausatif-Pasif', jp: '~(さ)せます・~さ(せら)れます' },
  26: { id: 'Partikel で dan に', jp: 'で・に' },
  27: { id: 'Partikel を dan と', jp: 'を・と' },
  28: { id: 'Partikel も dan しか', jp: 'も・しか' },
  29: { id: 'Partikel だけ dan でも', jp: 'だけ・でも' },
  30: { id: 'Partikel は dan が', jp: 'は・が' },
  31: { id: 'Nominalisasi の dan こと', jp: 'の・こと' },
  32: { id: 'Bentuk て dan ないで', jp: '~て・~ないで' },
  33: { id: 'Kata Kerja Transitif & Intransitif', jp: '他動詞・自動詞' },
  34: { id: 'Keadaan Berlangsung & Hasil Tindakan', jp: '~ています・~てあります' },
  35: { id: 'Arah Perubahan & Tindakan', jp: '~てきます・~ていきます' },
  36: { id: 'Kata Tunjuk こ・そ・あ', jp: 'こ・そ・あ' },
  37: { id: 'Kata Sambung / Konjungsi', jp: '接続の言葉' },
  38: { id: 'Kata Keterangan / Adverbia', jp: '副詞' },
  39: { id: 'Terlalu, Sulit & Mudah Dilakukan', jp: '~すぎます・~にくいです・~やすいです' },
  40: { id: 'Kelas Kata', jp: '品詞' },
};

const N5_LESSON_TITLES_ID: Record<number, { id: string; jp: string }> = {
  1: { id: 'Salam & Perkenalan', jp: 'あいさつ' },
  2: { id: 'Di Toko Elektronik', jp: '電気屋で' },
  3: { id: 'Belanja Kemarin', jp: 'きのうの買い物' },
  4: { id: 'Kota Ueno', jp: '上野の町' },
  5: { id: 'Manga', jp: 'まんが' },
  6: { id: 'Di Bandara', jp: '空港で' },
  7: { id: 'Ski & Pemandian Air Panas', jp: 'スキーとおんせん' },
  8: { id: 'Makan Siang', jp: '昼ご飯' },
  9: { id: 'Partikel', jp: '助詞' },
  10: { id: 'Kata Keterangan / Adverbia', jp: '副詞' },
  11: { id: 'Kata Sambung / Konjungsi', jp: '接続詞' },
  12: { id: 'Akhiran / Sufiks', jp: '接尾語' },
};

function capitalizeIndonesianTitle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Extracts uniform `{ lessonTitleId, lessonTitleJp, lessonTitle, lessonFullTitle }`
 * for every chapter across N5, N4, N3, N2, and N1.
 */
function buildStandardLessonMeta(params: {
  level: BunpouDeckLevel;
  lessonNumber: number;
  rawTitle: string;
  ringkasanLetter?: string;
}): {
  lessonTitleId: string;
  lessonTitleJp: string;
  lessonTitle: string;
  lessonFullTitle: string;
} {
  const { level, lessonNumber, rawTitle, ringkasanLetter } = params;
  const cleanedRaw = rawTitle.replace(/\s{2,}/g, ' ').trim();

  if (level === 'N5' && N5_LESSON_TITLES_ID[lessonNumber]) {
    const { id, jp } = N5_LESSON_TITLES_ID[lessonNumber];
    return {
      lessonTitleId: id,
      lessonTitleJp: jp,
      lessonTitle: `${id} (${jp})`,
      lessonFullTitle: `Bab ${lessonNumber} · ${id} (${jp})`,
    };
  }

  if (level === 'N4' && N4_LESSON_TRANSLATIONS_ID[lessonNumber]) {
    const mapped = N4_LESSON_TRANSLATIONS_ID[lessonNumber];
    const jp = mapped.jp ?? cleanedRaw;
    return {
      lessonTitleId: mapped.id,
      lessonTitleJp: jp,
      lessonTitle: `${mapped.id} (${jp})`,
      lessonFullTitle: `Bab ${lessonNumber} · ${mapped.id} (${jp})`,
    };
  }

  // Standard "Japanese Topic (Indonesian Translation)" format used across N3, N2, N1
  let titleJp = cleanedRaw;
  let titleId = '';

  const trailingParenMatch = cleanedRaw.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (trailingParenMatch) {
    const candidateJp = trailingParenMatch[1].trim();
    const candidateId = trailingParenMatch[2].trim();
    // Make sure trailing paren is actually Indonesian (not purely Japanese like `(進行中)` or `(1)・(2)`)
    if (/[A-Za-z]{2,}/.test(candidateId)) {
      titleJp = candidateJp;
      titleId = capitalizeIndonesianTitle(
        candidateId
          .replace(/^BAB\s+\d+\s*:\s*/i, '')
          .replace(/^受身\s*\/\s*/, ''),
      );
    }
  }

  if (ringkasanLetter && titleId && !/^Ringkasan\s+[A-J]/i.test(titleId)) {
    titleId = `Ringkasan ${ringkasanLetter}: ${titleId}`;
  }

  if (!titleId) {
    titleId = titleJp;
  }

  const lessonTitle =
    titleJp && titleJp !== titleId ? `${titleId} (${titleJp})` : titleId;
  const lessonFullTitle = `Bab ${lessonNumber} · ${lessonTitle}`;

  return {
    lessonTitleId: titleId,
    lessonTitleJp: titleJp,
    lessonTitle,
    lessonFullTitle,
  };
}

function normalizeMultilineField(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
}

function parseHeaderLine(rest: string): {
  pattern: string;
  romaji: string;
  crossReference: string;
} {
  let working = rest.trim();
  let crossReference = '';

  const arrowMatch = working.match(/^(.+?)\s{2,}→\s*(.+)$/);
  if (arrowMatch) {
    working = arrowMatch[1].trim();
    crossReference = arrowMatch[2].trim();
  }

  let pattern = working;
  let romaji = '';

  const romajiMatch = working.match(/^(.+?)\s{2,}\((.+)\)$/);
  if (romajiMatch) {
    pattern = romajiMatch[1].trim();
    romaji = romajiMatch[2].trim();
  } else {
    const romajiBracketMatch = working.match(
      /^(.+?)\s{2,}\(([^)]+)\)\s+\[([^\]]+)\]$/,
    );
    if (romajiBracketMatch) {
      pattern = romajiBracketMatch[1].trim();
      romaji = `${romajiBracketMatch[2].trim()} · ${romajiBracketMatch[3].trim()}`;
    }
  }

  return { pattern, romaji, crossReference };
}

function isSectionNoteOrDivider(trimmed: string): boolean {
  if (/^---.+---$/.test(trimmed)) return true;
  if (
    /^\((?:Pola lain|Lihat juga|Catatan one-point|Pola tetap)/i.test(trimmed)
  ) {
    return true;
  }
  if (/^Selesai\.$/.test(trimmed)) return true;
  if (/^Catatan penyusun:/i.test(trimmed)) return true;
  return false;
}

export function parseBunpouDeck(
  rawText: string,
  level: BunpouDeckLevel = 'N2',
): BunpouN2Item[] {
  const lines = rawText.split(/\r?\n/);
  const items: BunpouN2Item[] = [];

  let currentGroupId: BunpouGroupCode =
    level === 'N5' ? 'BAB1_4' : level === 'N4' || level === 'N3' ? 'B1' : 'I';
  let currentGroupTitle =
    level === 'N5'
      ? 'Bab 1–4: Salam, Toko Elektronik, Belanja & Kota Ueno'
      : level === 'N4'
        ? 'Bagian 1: Tata Bahasa Menurut Fungsi Makna'
        : level === 'N3'
          ? 'Bagian 1: Tata Bahasa Menurut Fungsi Makna'
          : 'I. Menjelaskan Suatu Hal (ことがらを説明する)';
  let currentLessonNumber = 1;
  let nextSequentialSection = 0;
  let currentRingkasanLetter: string | undefined;
  let currentRawLessonTitle =
    level === 'N5'
      ? 'あいさつ (BAB 1: SALAM / GREETINGS)'
      : level === 'N4'
        ? '~より… / ~ほど…ません・~より~のほう・~と~とどちら'
        : level === 'N3'
          ? '~とき (Waktu)'
          : level === 'N1'
            ? '時間関係 (Hubungan waktu)'
            : '~とき・~直後に (Saat / segera setelah)';
  let currentLessonMeta = buildStandardLessonMeta({
    level,
    lessonNumber: currentLessonNumber,
    rawTitle: currentRawLessonTitle,
  });
  let currentSectionDasar = '';
  let inSectionBlockNote = false;
  let pendingSectionHeadingLines = false;

  type FieldKey = 'arti' | 'ragam' | 'rumus' | 'catatan' | 'contoh' | null;

  let currentEntry: {
    code: string;
    pattern: string;
    romaji: string;
    crossReference: string;
    lessonNumber: number;
    lessonTitle: string;
    lessonTitleId: string;
    lessonTitleJp: string;
    lessonFullTitle: string;
    groupId: BunpouGroupCode;
    groupTitle: string;
    sectionDasar: string;
    artiLines: string[];
    ragamLines: string[];
    rumusLines: string[];
    catatanLines: string[];
    examples: BunpouN2Example[];
    pendingExampleJp: string | null;
    pendingExampleIdLines: string[];
  } | null = null;

  let activeField: FieldKey = null;

  const flushPendingExample = () => {
    if (!currentEntry || currentEntry.pendingExampleJp === null) return;
    currentEntry.examples.push({
      jp: currentEntry.pendingExampleJp.trim(),
      id: normalizeMultilineField(currentEntry.pendingExampleIdLines),
    });
    currentEntry.pendingExampleJp = null;
    currentEntry.pendingExampleIdLines = [];
  };

  const flushEntry = () => {
    if (!currentEntry) return;
    flushPendingExample();
    const index = items.length;
    const rawMeaning = normalizeMultilineField(currentEntry.artiLines);
    const rawNote = normalizeMultilineField(currentEntry.catatanLines);
    const meaning =
      rawMeaning ||
      (currentEntry.sectionDasar
        ? `${currentEntry.lessonTitleId} (${currentEntry.pattern})`
        : `${currentEntry.lessonTitleId} — ${currentEntry.pattern}`);
    const note = formatBunpouExplanation(rawNote || currentEntry.sectionDasar);

    items.push({
      id: `${level.toLowerCase()}-bunpou-${currentEntry.code}`,
      level,
      index,
      code: currentEntry.code,
      pattern: currentEntry.pattern,
      romaji: currentEntry.romaji,
      crossReference: currentEntry.crossReference,
      lessonNumber: currentEntry.lessonNumber,
      lessonTitle: currentEntry.lessonTitle,
      lessonTitleId: currentEntry.lessonTitleId,
      lessonTitleJp: currentEntry.lessonTitleJp,
      lessonFullTitle: currentEntry.lessonFullTitle,
      groupId: currentEntry.groupId,
      groupTitle: currentEntry.groupTitle,
      meaning,
      register: normalizeMultilineField(currentEntry.ragamLines),
      formula: normalizeFormulaLines(currentEntry.rumusLines),
      note,
      examples: currentEntry.examples,
    });
    currentEntry = null;
    activeField = null;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (/^Selesai\.$/.test(trimmed)) {
      flushEntry();
      break;
    }

    if (/^[#=]{6,}$/.test(trimmed)) {
      pendingSectionHeadingLines = false;
      continue;
    }

    if (inSectionBlockNote) {
      if (!trimmed || trimmed.endsWith(')')) {
        inSectionBlockNote = false;
      }
      continue;
    }

    // N5 chapter headers (第1章 .. 第9章) and Bab 9 subsection headers (1. 助詞 .. 4. 接尾語)
    if (level === 'N5') {
      const chapMatch = trimmed.match(/^第(\d+)章\s+(.+)$/);
      if (chapMatch) {
        flushEntry();
        currentSectionDasar = '';
        currentRingkasanLetter = undefined;
        const chapNum = Number(chapMatch[1]);
        const chapTitle = chapMatch[2].replace(/\s{2,}/g, ' ').trim();
        if (chapNum <= 4) {
          currentGroupId = 'BAB1_4';
          currentGroupTitle =
            'Bab 1–4: Salam, Toko Elektronik, Belanja & Kota Ueno';
        } else if (chapNum <= 8) {
          currentGroupId = 'BAB5_8';
          currentGroupTitle = 'Bab 5–8: Manga, Bandara, Ski & Makan Siang';
        } else {
          currentGroupId = 'BAB9';
          currentGroupTitle = 'Bab 9–12: Partikel, Adverbia, Konjungsi & Akhiran';
        }

        if (chapNum <= 8) {
          nextSequentialSection += 1;
          currentLessonNumber = nextSequentialSection;
          currentRawLessonTitle = chapTitle;
          currentLessonMeta = buildStandardLessonMeta({
            level,
            lessonNumber: currentLessonNumber,
            rawTitle: currentRawLessonTitle,
          });
          pendingSectionHeadingLines = true;
        } else {
          pendingSectionHeadingLines = false;
        }
        continue;
      }

      if (currentGroupId === 'BAB9') {
        const subMatch = trimmed.match(/^([1-4])\.\s+(.+)$/);
        if (subMatch && !trimmed.startsWith('[')) {
          flushEntry();
          currentSectionDasar = '';
          currentRingkasanLetter = undefined;
          nextSequentialSection += 1;
          currentLessonNumber = nextSequentialSection;
          currentRawLessonTitle = subMatch[2].replace(/\s{2,}/g, ' ').trim();
          currentLessonMeta = buildStandardLessonMeta({
            level,
            lessonNumber: currentLessonNumber,
            rawTitle: currentRawLessonTitle,
          });
          pendingSectionHeadingLines = true;
          continue;
        }
      }
    }

    // N4 major part headers inside ### blocks
    if (level === 'N4') {
      if (/^第1部\s+意味機能別の文法形式/.test(trimmed)) {
        flushEntry();
        currentGroupId = 'B1';
        currentGroupTitle = 'Bagian 1: Tata Bahasa Menurut Fungsi Makna';
        continue;
      }
      if (/^第2部\s+文法形式の整理/.test(trimmed)) {
        flushEntry();
        currentGroupId = 'B2';
        currentGroupTitle = 'Bagian 2: Penyusunan Bentuk & Partikel';
        continue;
      }
    }

    // N3 major part headers inside ### blocks
    if (level === 'N3') {
      if (/^第1部\s+文の文法1/.test(trimmed)) {
        flushEntry();
        currentGroupId = 'B1';
        currentGroupTitle = 'Bagian 1: Tata Bahasa Menurut Fungsi Makna';
        continue;
      }
      if (/^文法形式の整理/.test(trimmed)) {
        flushEntry();
        currentGroupId = 'RINGKASAN';
        currentGroupTitle = 'Ringkasan Bentuk Tata Bahasa A–J';
        continue;
      }
      if (/^第2部\s+文の文法2/.test(trimmed)) {
        flushEntry();
        currentGroupId = 'B2';
        currentGroupTitle = 'Bagian 2: Susunan Kalimat';
        continue;
      }
      if (/^第3部\s+文章の文法/.test(trimmed)) {
        flushEntry();
        currentGroupId = 'B3';
        currentGroupTitle = 'Bagian 3: Tata Bahasa Teks & Wacana';
        continue;
      }
    }

    // N2 & N1 Roman numeral group headers (I., II., III.)
    const groupMatch = trimmed.match(/^(I|II|III)\.\s+(.+)$/);
    if (groupMatch && !trimmed.startsWith('[')) {
      flushEntry();
      currentGroupId = groupMatch[1] as BunpouN2GroupCode;
      currentGroupTitle =
        currentGroupId === 'I'
          ? 'I. Menjelaskan Suatu Hal (ことがらを説明する)'
          : currentGroupId === 'II'
            ? 'II. Menyertakan Penilaian Pembicara (主観を含めて説明する)'
            : 'III. Menyatakan Pandangan & Perasaan (主観を述べる)';
      continue;
    }

    // Standard lesson header: "1課 ..."
    const lessonMatch = trimmed.match(/^(\d+)課\s+(.+)$/);
    if (lessonMatch) {
      flushEntry();
      currentSectionDasar = '';
      currentRingkasanLetter = undefined;
      const rawNum = Number(lessonMatch[1]);
      currentRawLessonTitle = lessonMatch[2].replace(/\s{2,}/g, ' ').trim();
      if (level === 'N3' || level === 'N4') {
        nextSequentialSection += 1;
        currentLessonNumber = nextSequentialSection;
      } else {
        currentLessonNumber = rawNum;
      }
      currentLessonMeta = buildStandardLessonMeta({
        level,
        lessonNumber: currentLessonNumber,
        rawTitle: currentRawLessonTitle,
      });
      pendingSectionHeadingLines = true;
      continue;
    }

    // N3 lettered summary section header: "A いろいろな働きをする助詞  (...)"
    if (level === 'N3') {
      const letterSectionMatch = trimmed.match(/^([A-J])\s+(.+)$/);
      if (letterSectionMatch && !trimmed.startsWith('[')) {
        flushEntry();
        currentSectionDasar = '';
        nextSequentialSection += 1;
        currentLessonNumber = nextSequentialSection;
        currentRingkasanLetter = letterSectionMatch[1];
        currentRawLessonTitle = letterSectionMatch[2]
          .replace(/\s{2,}/g, ' ')
          .trim();
        currentLessonMeta = buildStandardLessonMeta({
          level,
          lessonNumber: currentLessonNumber,
          rawTitle: currentRawLessonTitle,
          ringkasanLetter: currentRingkasanLetter,
        });
        pendingSectionHeadingLines = true;
        continue;
      }
    }

    // Continuation line of a wrapped section header (e.g. N3 Bagian 2 3課)
    if (
      pendingSectionHeadingLines &&
      trimmed &&
      !trimmed.startsWith('[') &&
      !/^Dasar\s*:/.test(trimmed)
    ) {
      currentRawLessonTitle = `${currentRawLessonTitle} ${trimmed}`.trim();
      currentLessonMeta = buildStandardLessonMeta({
        level,
        lessonNumber: currentLessonNumber,
        rawTitle: currentRawLessonTitle,
        ringkasanLetter: currentRingkasanLetter,
      });
      continue;
    }

    // Section-level "Dasar : ..." summary (e.g. N3 Ringkasan G, P2-2, P3-1)
    const dasarMatch = trimmed.match(/^Dasar\s*:\s*(.+)$/);
    if (dasarMatch && !currentEntry) {
      currentSectionDasar = dasarMatch[1].trim();
      continue;
    }
    if (
      !currentEntry &&
      currentSectionDasar &&
      trimmed &&
      !trimmed.startsWith('[') &&
      !isSectionNoteOrDivider(trimmed)
    ) {
      currentSectionDasar = `${currentSectionDasar} ${trimmed}`;
      continue;
    }

    // Section notes or sub-dividers between entries (e.g. "--- A. ... ---", "(Lihat juga: ...)")
    if (isSectionNoteOrDivider(trimmed)) {
      if (currentEntry && activeField === 'contoh') {
        flushPendingExample();
        activeField = null;
      }
      if (trimmed.startsWith('(') && !trimmed.endsWith(')')) {
        inSectionBlockNote = true;
      }
      continue;
    }

    // Entry header: [1], [45], [1-1], [A-1], [C-0], [P2-1-1], [P3-2-3], [P9-1-1]
    const entryMatch = trimmed.match(
      /^\[((?:[A-Z]\d*-)?\d+(?:-\d+)*)\]\s+(.+)$/,
    );
    if (entryMatch) {
      flushEntry();
      pendingSectionHeadingLines = false;
      const { pattern, romaji, crossReference } = parseHeaderLine(
        entryMatch[2],
      );
      currentEntry = {
        code: entryMatch[1],
        pattern,
        romaji,
        crossReference,
        lessonNumber: currentLessonNumber,
        lessonTitle: currentLessonMeta.lessonTitle,
        lessonTitleId: currentLessonMeta.lessonTitleId,
        lessonTitleJp: currentLessonMeta.lessonTitleJp,
        lessonFullTitle: currentLessonMeta.lessonFullTitle,
        groupId: currentGroupId,
        groupTitle: currentGroupTitle,
        sectionDasar: currentSectionDasar,
        artiLines: [],
        ragamLines: [],
        rumusLines: [],
        catatanLines: [],
        examples: [],
        pendingExampleJp: null,
        pendingExampleIdLines: [],
      };
      activeField = null;
      continue;
    }

    if (!currentEntry) {
      continue;
    }

    if (!trimmed) {
      if (activeField === 'contoh') {
        flushPendingExample();
      }
      continue;
    }

    const fieldMatch = trimmed.match(
      /^(Arti|Ragam|Rumus|Catatan|Contoh)\s*:\s*(.*)$/,
    );
    if (fieldMatch) {
      const label = fieldMatch[1].toLowerCase() as Exclude<FieldKey, null>;
      const value = fieldMatch[2].trim();
      activeField = label;
      if (label === 'arti' && value) currentEntry.artiLines.push(value);
      if (label === 'ragam' && value) currentEntry.ragamLines.push(value);
      if (label === 'rumus' && value) currentEntry.rumusLines.push(value);
      if (label === 'catatan' && value) currentEntry.catatanLines.push(value);
      continue;
    }

    // Continuation line right after [code] header before any field (e.g. N1 [4-2], [5-2])
    if (activeField === null) {
      if (trimmed.startsWith('→')) {
        currentEntry.crossReference = trimmed.replace(/^→\s*/, '').trim();
      } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        currentEntry.romaji = trimmed.slice(1, -1).trim();
      }
      continue;
    }

    if (activeField === 'contoh') {
      const exampleStart = trimmed.match(/^(\d+)\)\s+(.+)$/);
      if (exampleStart) {
        flushPendingExample();
        currentEntry.pendingExampleJp = exampleStart[2].trim();
      } else if (currentEntry.pendingExampleJp !== null) {
        currentEntry.pendingExampleIdLines.push(trimmed);
      }
      continue;
    }

    if (activeField === 'arti') currentEntry.artiLines.push(trimmed);
    else if (activeField === 'ragam') currentEntry.ragamLines.push(trimmed);
    else if (activeField === 'rumus') currentEntry.rumusLines.push(trimmed);
    else if (activeField === 'catatan') currentEntry.catatanLines.push(trimmed);
  }

  flushEntry();
  return items;
}

export function parseBunpouN5Deck(rawText: string): BunpouN2Item[] {
  return parseBunpouDeck(rawText, 'N5');
}

export function parseBunpouN4Deck(rawText: string): BunpouN2Item[] {
  return parseBunpouDeck(rawText, 'N4');
}

export function parseBunpouN2Deck(rawText: string): BunpouN2Item[] {
  return parseBunpouDeck(rawText, 'N2');
}

export function parseBunpouN3Deck(rawText: string): BunpouN2Item[] {
  return parseBunpouDeck(rawText, 'N3');
}

export function parseBunpouN1Deck(rawText: string): BunpouN2Item[] {
  return parseBunpouDeck(rawText, 'N1');
}

export function filterBunpouN2Items(
  items: BunpouN2Item[],
  query: string,
  groupFilter: BunpouN2GroupFilter = 'Semua',
  lessonFilter: number | 'all' = 'all',
): BunpouN2Item[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (groupFilter !== 'Semua' && item.groupId !== groupFilter) {
      return false;
    }
    if (lessonFilter !== 'all' && item.lessonNumber !== lessonFilter) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      item.code,
      item.pattern,
      item.romaji,
      item.meaning,
      item.formula,
      item.note,
      item.lessonFullTitle,
      ...item.examples.map((ex) => `${ex.jp} ${ex.id}`),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function bunpouItemToAnkiCard(item: BunpouN2Item): AnkiCard {
  const lvl = item.level ?? 'N2';
  const shortLessonLabel = formatBunpouLessonLabel(item.lessonNumber);

  return {
    id: item.id,
    index: item.index,
    word: item.pattern,
    partOfSpeech: `${shortLessonLabel} · Bunpou ${lvl}`,
    categoryGroup: 'Kata keterangan & Lainnya',
    readingTerm: item.pattern,
    furigana: item.romaji || null,
    meaning: item.meaning,
    examples: item.examples,
    tag: `jlpt-${lvl.toLowerCase()}-bab-${item.lessonNumber}`,
    deckId: `${lvl}_BUNPOU` as AnkiCard['deckId'],
    category: 'bunpou',
    jlptLevel: lvl,
    cardKind: 'bunpou',
    code: item.code,
    romaji: item.romaji || undefined,
    formula: item.formula || undefined,
    note: item.note || undefined,
    register: item.register || undefined,
    crossReference: item.crossReference || undefined,
    lessonNumber: item.lessonNumber,
    lessonTitle: item.lessonFullTitle,
    groupId: item.groupId,
    groupTitle: item.groupTitle,
  };
}

export function ankiCardToBunpouItem(card: AnkiCard): BunpouN2Item {
  const lessonNum = card.lessonNumber ?? 1;
  const level: BunpouDeckLevel = card.id.startsWith('n5-bunpou-')
    ? 'N5'
    : card.id.startsWith('n4-bunpou-')
      ? 'N4'
      : card.id.startsWith('n3-bunpou-')
        ? 'N3'
        : card.id.startsWith('n1-bunpou-')
          ? 'N1'
          : 'N2';

  const rawFull = card.lessonTitle ?? `Bab ${lessonNum}`;
  const strippedBody = rawFull
    .replace(
      /^(?:Bag\.\d+\s*·\s*)?\d+課\s*|^Ringkasan\s+[A-J]\s*·\s*|^Bab\s+\d+(?:\.\d+)?\s*·\s*/,
      '',
    )
    .trim();

  // Extract Indonesian + Japanese parts cleanly whether already standardized or legacy
  let lessonTitleId = strippedBody;
  let lessonTitleJp = '';
  const stdMatch = strippedBody.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (stdMatch && !/^[A-Za-z\s/-]+$/.test(stdMatch[2].trim())) {
    // Standardized format: "Indonesian Title (Japanese Topic)"
    lessonTitleId = stdMatch[1].trim();
    lessonTitleJp = stdMatch[2].trim();
  } else {
    const meta = buildStandardLessonMeta({
      level,
      lessonNumber: lessonNum,
      rawTitle: strippedBody,
    });
    lessonTitleId = meta.lessonTitleId;
    lessonTitleJp = meta.lessonTitleJp;
  }

  const lessonTitle =
    lessonTitleJp && lessonTitleJp !== lessonTitleId
      ? `${lessonTitleId} (${lessonTitleJp})`
      : lessonTitleId;
  const lessonFullTitle = `Bab ${lessonNum} · ${lessonTitle}`;

  const fallbackGroupId: BunpouGroupCode =
    level === 'N5'
      ? 'BAB1_4'
      : level === 'N4' || level === 'N3'
        ? 'B1'
        : 'I';

  return {
    id: card.id,
    level,
    index: card.index,
    code: card.code ?? `${lessonNum}-1`,
    pattern: card.word,
    romaji: card.romaji ?? '',
    crossReference: card.crossReference ?? '',
    lessonNumber: lessonNum,
    lessonTitle,
    lessonTitleId,
    lessonTitleJp,
    lessonFullTitle,
    groupId: (card.groupId as BunpouGroupCode | undefined) ?? fallbackGroupId,
    groupTitle: card.groupTitle ?? '',
    meaning: card.meaning,
    register: card.register ?? '',
    formula: card.formula ?? '',
    note: card.note ?? '',
    examples: card.examples,
  };
}

export const INITIAL_BUNPOU_N5_SEED = `################################################################
第1章 あいさつ  (BAB 1: SALAM / GREETINGS)
################################################################

[1-1] あいさつ基本   (Ungkapan salam dasar)
Arti    : Salam perkenalan, terima kasih, salam harian, makan, berkunjung,
          meminta tolong, dan menanyakan keadaan.
Rumus   : Ungkapan tetap (idiomatis)
Catatan : Dipakai dalam kehidupan sehari-hari sesuai situasi.
Contoh  :
  1) はじめまして。わたしはアリです。どうぞよろしくおねがいします。
     Perkenalkan, saya Ali. Mohon kerja samanya.
  2) ごちそうさまでした。とてもおいしかったです。
     Terima kasih atas hidangannya. Enak sekali.

[1-2] すみません・しつれいします・どうぞ   (Sumimasen / Shitsurei shimasu / Douzo)
Arti    : Maaf / Permisi / Silakan
Rumus   : Ungkapan tetap (idiomatis)
Catatan : 「すみません」 untuk meminta maaf, berterima kasih, atau memanggil orang; 「しつれいします」 saat permisi; 「どうぞ」 untuk mempersilakan.
Contoh  :
  1) すみません、ちょっとおねがいがあります。
     Permisi/maaf, saya ada sedikit permintaan.
  2) お先にしつれいします。おつかれさまでした。
     Saya permisi pulang duluan. Terima kasih atas kerja kerasnya.

################################################################
第2章 電気屋で (1)・(2)  (BAB 2: DI TOKO ELEKTRONIK)
################################################################

[1] あります (現在肯定形・現在否定形)   (~desu / ~masu / negatif)
Arti    : Bentuk sekarang / masa depan (positif dan negatif)
Rumus   : V-ます / V-ません · Adj-i + です / ~くないです · N + です / ~じゃありません
Catatan : 「~です」「~ます」 dipakai untuk menyatakan hal sekarang atau masa depan.
Contoh  :
  1) わたしは毎朝7時に起きます。
     Saya bangun jam 7 setiap pagi.
  2) 今日はあまり暑くないです。
     Hari ini tidak terlalu panas.
`;

export const INITIAL_BUNPOU_N4_SEED = `################################################################
第1部 意味機能別の文法形式  (BAGIAN 1: TATA BAHASA MENURUT FUNGSI MAKNA)
################################################################

================================================================
1課 ~より… / ~ほど…ません・~より~のほう・~と~とどちら
================================================================

[1-1] ~より… / ~ほど…ません   (yori ... / hodo ... masen)
Arti    : Lebih ... daripada ... / Tidak se-... (dalam kalimat negatif)
Rumus   : N + より / N + ほど…ません (kalimat negatif)
Catatan : 「~より」 membandingkan tingkat topik dengan hal lain. Dalam kalimat negatif gunakan 「~ほど…ません」.
Contoh  :
  1) 東京はわたしの国より物価が高いです。
     Tokyo biaya hidupnya lebih mahal daripada negara saya.
  2) 今年の夏は去年の夏ほど暑くありませんでした。
     Musim panas tahun ini tidak sepanas musim panas tahun lalu.

[1-2] ~より~のほう   (yori ... no hou)
Arti    : Dibanding ..., lebih ...
Rumus   : N1 + より + N2 + のほう
Catatan : Membandingkan dua hal untuk menyatakan bahwa N2 memiliki tingkat yang lebih tinggi daripada N1.
Contoh  :
  1) 電車より飛行機のほうが速いです。
     Dibanding kereta, pesawat lebih cepat.
  2) コーヒーよりお茶のほうが好きです。
     Dibanding kopi, saya lebih suka teh.

[1-3] ~と~とどちら   (to ... to dochira)
Arti    : Antara ... dan ..., yang mana (lebih ...)
Rumus   : N1 + と + N2 + とどちら
Catatan : Digunakan untuk menanyakan pilihan di antara dua hal.
Contoh  :
  1) 夏と冬とどちらが好きですか。
     Antara musim panas dan musim dingin, mana yang kamu suka?
  2) 和食と洋食とどちらがいいですか。
     Antara makanan Jepang dan makanan Barat, mana yang lebih baik?
`;

export const INITIAL_BUNPOU_N3_SEED = `################################################################
第1部 文の文法1  (BAGIAN 1: TATA BAHASA KALIMAT 1)
意味機能別の文法形式  (Bentuk tata bahasa menurut fungsi makna)
################################################################

================================================================
1課 ~とき  (Waktu)
================================================================

[1-1] ~うちに…   (uchi ni)
Arti    : A) Selagi masih ... (lakukan sesuatu sebelum keadaan berubah)
          B) Selagi ... (tanpa disadari terjadi perubahan)
Rumus   : N + の / V-kamus・V-te iru・V-nai / Adj-i + い / Adj-na + な + うちに
Catatan : Pemakaian A: kalimat setelahnya berisi tindakan yang disengaja
          (dilakukan sebelum keadaan berubah). Pemakaian B: kalimat
          setelahnya berisi perubahan yang terjadi tanpa kehendak pembicara.
Contoh  :
  1) 若いうちに、いろいろな国を旅行しておきたい。
     Selagi masih muda, saya ingin bepergian ke berbagai negara. (A)
  2) 本を読んでいるうちに、いつの間にか眠ってしまった。
     Selagi membaca buku, tanpa sadar saya tertidur. (B)

[1-2] ~間…・~間に…   (aida / aida ni)
Arti    : Selama ... / Selagi ... (dalam rentang waktu ...)
Rumus   : N + の / V-kamus・V-te iru・V-nai + 間・間に
Catatan : 「間」 = selama keadaan itu berlangsung, kegiatan lain terus
          berlangsung (kegiatan yang berlangsung lama).
          「間に」 = pada suatu saat dalam rentang itu terjadi kejadian
          sesaat.
Contoh  :
  1) 母が買い物に行っている間、わたしは留守番をしていた。
     Selama ibu pergi berbelanja, saya menjaga rumah.
  2) 友だちが席を外している間に、メッセージを送っておいた。
     Selagi teman saya meninggalkan tempat duduknya, saya sudah mengirim pesan.

[1-3] ~てからでないと…・~てからでなければ…   (te kara de nai to / te kara de nakereba)
Arti    : Kalau belum ... maka tidak bisa ... / Sebelum ... tidak bisa ...
Rumus   : V-te + からでないと / からでなければ
Catatan : Menyatakan bahwa sebelum tindakan itu selesai, hal berikutnya tidak
          bisa terjadi / tidak boleh dilakukan. Kalimat setelahnya berisi
          makna negatif.
Contoh  :
  1) 先生に相談してからでないと、進路は決められません。
     Kalau belum berkonsultasi dengan guru, saya tidak bisa menentukan jalur masa depan.
  2) 食事をしてからでなければ、この薬を飲んではいけません。
     Sebelum makan, obat ini tidak boleh diminum.
`;

export const INITIAL_BUNPOU_N2_SEED = `################################################################
第1部 文の文法 1  (BAGIAN 1: TATA BAHASA KALIMAT 1)
I. ことがらを説明する  (Menjelaskan suatu hal)
################################################################

================================================================
1課 ~とき・~直後に  (Saat / segera setelah)
================================================================

[1-1] ~際(に)   (sai (ni))
Arti    : Saat / ketika ... (sama dengan ~とき, tetapi lebih formal)
Ragam   : 硬い言い方 (formal)
Rumus   : N-の / V-kamus / V-ta + 際(に)
Catatan : Dipakai dengan kata kerja yang menyatakan tindakan atau kejadian
          (使う, 完成する, dsb.) dan kata benda (搭乗, 外出, dsb.). Banyak dipakai
          dalam situasi resmi, jarang untuk hal sehari-hari yang biasa.
Contoh  :
  1) 空港に到着した際に、パスポートを提示してください。
     Saat tiba di bandara, harap tunjukkan paspor.
  2) ご不明な点がある際は、いつでもお問い合わせください。
     Jika ada hal yang kurang jelas, silakan hubungi kami kapan saja.

[1-2] ~に際して・~にあたって   (ni saishite / ni atatte)
Arti    : Pada saat akan melakukan (sesuatu yang istimewa) / dalam rangka ...
Ragam   : 硬い言い方 (formal)
Rumus   : N / V-kamus + に際して・にあたって
Catatan : Dipakai untuk momen khusus yang sifatnya sekali waktu dan disengaja
          (menikah, membuka toko, dsb.). Kalimat setelahnya biasanya berisi
          tindakan. 「~にあたって」 dipakai untuk tindakan yang lebih positif.
Contoh  :
  1) 新しい会社を設立するに際して、多くの方にご協力いただきました。
     Dalam rangka mendirikan perusahaan baru, kami mendapat bantuan dari banyak pihak.
  2) 留学するにあたって、ビザの手続きを済ませておかなければならない。
     Sebelum berangkat studi ke luar negeri, saya harus menyelesaikan urusan visa.

[1-3] ~たとたん(に)   (ta totan (ni))
Arti    : Begitu ... langsung (terjadi hal yang tak terduga)
Rumus   : V-ta + とたん(に)
Catatan : Dipakai untuk gerakan/perubahan yang terjadi sesaat. Kalimat setelahnya
          adalah kejadian di luar dugaan. Tidak bisa diikuti kalimat keinginan,
          ajakan, atau perintah pembicara.
Contoh  :
  1) 電車のドアが開いたとたん、大勢の人が降りてきた。
     Begitu pintu kereta terbuka, banyak orang langsung turun.
  2) 薬を飲んだとたんに、眠くなってしまった。
     Begitu minum obat, saya langsung mengantuk.
`;

export const INITIAL_BUNPOU_N1_SEED = `################################################################
第1部 文の文法 1  (BAGIAN 1: TATA BAHASA KALIMAT 1)
I. ことがらを説明する  (Menjelaskan suatu hal)
################################################################

================================================================
1課 時間関係  (Hubungan waktu)
================================================================

[1-1] ~が早いか   (ga hayai ka)
Arti    : Begitu ... langsung ... (hal berikutnya terjadi segera setelahnya)
Rumus   : V-kamus / V-ta + が早いか
Catatan : Dipakai dengan kata kerja yang menyatakan gerakan sesaat. Kalimat
          setelahnya berisi fakta yang agak di luar dugaan. Tidak diikuti
          kalimat keinginan/niat atau ajakan pembicara.
Contoh  :
  1) 彼は電車に乗り込むが早いか、座席で眠ってしまった。
     Begitu naik ke kereta, dia langsung tertidur di kursinya.
  2) 授業の終わりを告げるチャイムが鳴るが早いか、生徒たちは教室を飛び出した。
     Begitu bel tanda akhir pelajaran berbunyi, para murid langsung berhamburan keluar kelas.

[1-2] ~や・~や否や   (ya / ya ina ya)
Arti    : Begitu ... (hampir bersamaan dengan itu terjadi hal berikutnya)
Rumus   : V-kamus + や・や否や
Catatan : Dipakai dengan kata kerja yang menyatakan hal sesaat. Kalimat
          setelahnya berisi fakta/kejadian nyata, bukan keinginan, niat,
          atau ajakan pembicara.
Contoh  :
  1) 彼女は私の顔を見るや、泣き出した。
     Begitu melihat wajah saya, dia langsung menangis.
  2) 発表が終わるや否や、会場から拍手が起こった。
     Begitu presentasi selesai, tepuk tangan bergemuruh dari seluruh ruangan.

[1-3] ~なり   (nari)
Arti    : Begitu ... langsung ... (tindakan berikutnya langsung menyusul)
Rumus   : V-kamus + なり
Catatan : Kalimat setelahnya berisi tindakan disengaja yang agak tidak terduga.
          Subjeknya biasanya orang ketiga, dan subjek sebelum dan sesudahnya
          sama.
Contoh  :
  1) 彼は家に帰るなり、ベッドに倒れ込んだ。
     Begitu pulang ke rumah, dia langsung roboh di atas tempat tidur.
  2) 社長は報告を聞くなり、席を立って部屋を出ていった。
     Begitu mendengar laporan, direktur langsung berdiri dan keluar dari ruangan.
`;
