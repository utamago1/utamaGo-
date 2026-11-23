export type TryOutPacketPartId = 'moji-bunpou' | 'dokkai' | 'choukai';

export interface TryOutPacketPart {
  id: TryOutPacketPartId;
  order: string;
  title: string;
  subtitle: string;
  questionCount: number;
  pageCount: number;
  recommendedMinutes: number;
  xpReward: number;
  audioSrc?: string;
  audioFileName?: string;
}

export const CHOUKAI_N2_AUDIO_URL = 'https://files.catbox.moe/rkpxrk.mp3';

function driveAudioProxyUrl(fileId: string): string {
  return `/api/audio/drive/${fileId}`;
}

export const TRYOUT_N2_1_PARTS: TryOutPacketPart[] = [
  {
    id: 'moji-bunpou',
    order: '01',
    title: 'Moji-Goi & Bunpou',
    subtitle:
      'Soal teks kanji, kosakata, dan tata bahasa JLPT N2 2016.12 (54 soal · 10 halaman)',
    questionCount: 54,
    pageCount: 10,
    recommendedMinutes: 45,
    xpReward: 50,
  },
  {
    id: 'dokkai',
    order: '02',
    title: 'Dokkai (Pemahaman Bacaan)',
    subtitle:
      'Wacana teks pendek, menengah, perbandingan A/B, panjang, & info (21 soal · 5 halaman)',
    questionCount: 21,
    pageCount: 5,
    recommendedMinutes: 60,
    xpReward: 50,
  },
  {
    id: 'choukai',
    order: '03',
    title: 'Choukai (Menyimak + Audio)',
    subtitle:
      'Audio resmi JLPT N2 2016.12 (Desember 2016) + soal pilihan teks lengkap Mondai 1–5 (32 soal · 5 halaman)',
    questionCount: 32,
    pageCount: 5,
    recommendedMinutes: 53,
    xpReward: 50,
    audioSrc: CHOUKAI_N2_AUDIO_URL,
    audioFileName: 'JLPT_N2_2016_12_Choukai.mp3',
  },
];

export const TRYOUT_N1_1_PARTS: TryOutPacketPart[] = [
  {
    id: 'moji-bunpou',
    order: '01',
    title: 'Moji-Goi & Bunpou',
    subtitle:
      'Soal teks kanji, kosakata, dan tata bahasa JLPT N1 2010.07 (45 soal · 8 halaman)',
    questionCount: 45,
    pageCount: 8,
    recommendedMinutes: 50,
    xpReward: 50,
  },
  {
    id: 'dokkai',
    order: '02',
    title: 'Dokkai (Pemahaman Bacaan)',
    subtitle:
      'Wacana teks pendek, menengah, panjang, opini A/B, & info JLPT N1 (26 soal · 6 halaman)',
    questionCount: 26,
    pageCount: 6,
    recommendedMinutes: 60,
    xpReward: 50,
  },
  {
    id: 'choukai',
    order: '03',
    title: 'Choukai (Menyimak + Audio)',
    subtitle:
      'Audio resmi JLPT N1 2010.07 (Juli 2010) + soal pilihan teks lengkap Mondai 1–5 (37 soal · 5 halaman)',
    questionCount: 37,
    pageCount: 5,
    recommendedMinutes: 56,
    xpReward: 50,
    audioSrc: driveAudioProxyUrl('1C-e2n7BKlxMzYCp1NqfkxAfmOiqiz3z-'),
    audioFileName: 'JLPT_N1_2010_07_Choukai.m4a',
  },
];

export type TryOutLevelOption = 'N2' | 'N1';

export interface TryOutPacketCatalogItem {
  id: string;
  level: TryOutLevelOption;
  order: string;
  number: number;
  title: string;
  examCode: string;
  yearLabel: string;
  description: string;
  questionCount: number;
  choukaiCount: number;
  recommendedMinutes: number;
  xpReward: number;
  hasQuestions: boolean;
  isFullText: boolean;
  audioSrc: string;
  audioFileName: string;
  audioDurationLabel: string;
  choukaiMinutes: number;
}

export const VERIFIED_TRYOUT_PACKET_IDS = [
  'n2-2',
  'n2-3',
  'n2-4',
  'n2-5',
  'n2-6',
  'n2-7',
] as const;

export function isVerifiedTryOutPacket(packetId: string): boolean {
  return (VERIFIED_TRYOUT_PACKET_IDS as readonly string[]).includes(packetId);
}

interface SessionSeedSpec {
  id: string;
  examCode: string;
  yearLabel: string;
  fileId: string;
  directAudioUrl?: string;
  choukaiCount?: number;
  choukaiMinutes?: number;
  audioDurationLabel?: string;
}

const N2_SESSIONS: SessionSeedSpec[] = [
  {
    id: 'n2-2',
    examCode: '2010.07',
    yearLabel: 'Juli 2010',
    fileId: '1BijZlQrAGGx08Uuo0x49xLTQ63pzWE10',
    directAudioUrl: 'https://files.catbox.moe/9xbz7l.mp3',
    choukaiCount: 32,
    audioDurationLabel: '50:35',
    choukaiMinutes: 51,
  },
  {
    id: 'n2-3',
    examCode: '2010.12',
    yearLabel: 'Desember 2010',
    fileId: '1UEsUFDoJdGY8oX4eQfWqByaRb78Mm2ee',
    directAudioUrl: 'https://files.catbox.moe/asvevt.mp3',
    choukaiCount: 32,
  },
  {
    id: 'n2-4',
    examCode: '2011.07',
    yearLabel: 'Juli 2011',
    fileId: '17mCy0CaTGTS8s9mvfSFyJNfSP3doSPDP',
    directAudioUrl: 'https://files.catbox.moe/jenpw0.mp3',
    choukaiCount: 31,
  },
  {
    id: 'n2-5',
    examCode: '2011.12',
    yearLabel: 'Desember 2011',
    fileId: '1kn8VnS_zvXdmpHWqww1YiU9bOFkdjc92',
    directAudioUrl: 'https://files.catbox.moe/3pnhbw.mp3',
    choukaiCount: 31,
  },
  {
    id: 'n2-6',
    examCode: '2012.07',
    yearLabel: 'Juli 2012',
    fileId: '1Le-Gd5r0g90jBXBVlVyF5m3BXwtQKDvC',
    directAudioUrl: 'https://files.catbox.moe/mrwty8.mp3',
    choukaiCount: 31,
  },
  {
    id: 'n2-7',
    examCode: '2012.12',
    yearLabel: 'Desember 2012',
    fileId: '1BHvKVgeVPC-BNM_wuXiocYcmhZHFlK40',
    directAudioUrl: 'https://files.catbox.moe/vo21e8.mp3',
    choukaiCount: 32,
  },
  {
    id: 'n2-8',
    examCode: '2013.07',
    yearLabel: 'Juli 2013',
    fileId: '1ao2afARgAExKJ-J9fMGqKvF3TFkPKw5H',
    directAudioUrl: 'https://files.catbox.moe/ry6rwd.mp3',
  },
  {
    id: 'n2-9',
    examCode: '2013.12',
    yearLabel: 'Desember 2013',
    fileId: '1Kv-yRdC2_4nU3n40gXtj8kLLa-5U6pOz',
    directAudioUrl: 'https://files.catbox.moe/8pmmgd.mp3',
  },
  {
    id: 'n2-10',
    examCode: '2014.07',
    yearLabel: 'Juli 2014',
    fileId: '1lL625WsBGMnjUeCO_B0sYPsx6VggRsZ_',
    directAudioUrl: 'https://files.catbox.moe/xvu6e9.mp3',
  },
  {
    id: 'n2-11',
    examCode: '2014.12',
    yearLabel: 'Desember 2014',
    fileId: '1qmLFyWy8ViferPZGmp0JpYH8NnLesgmR',
    directAudioUrl: 'https://files.catbox.moe/esi007.mp3',
  },
  {
    id: 'n2-12',
    examCode: '2015.07',
    yearLabel: 'Juli 2015',
    fileId: '1yiA_Mq1TNapFgVB-myFrdXSNZWhUJUY_',
    directAudioUrl: 'https://files.catbox.moe/kmeji2.mp3',
  },
  {
    id: 'n2-13',
    examCode: '2015.12',
    yearLabel: 'Desember 2015',
    fileId: '1bK2Xf2-6fFzO_9zdxWihJndiDbtWrLo2',
    directAudioUrl: 'https://files.catbox.moe/aq12c6.mp3',
  },
  {
    id: 'n2-14',
    examCode: '2016.07',
    yearLabel: 'Juli 2016',
    fileId: '11iDebYEputE9JC_S7F9Tm_qSH6w14ky7',
    directAudioUrl: 'https://files.catbox.moe/07shiy.mp3',
  },
  {
    id: 'n2-1',
    examCode: '2016.12',
    yearLabel: 'Desember 2016',
    fileId: '1M9hANkTMe_HQDG2a0T6ebkHEE5D5dJgg',
    directAudioUrl: 'https://files.catbox.moe/rkpxrk.mp3',
    choukaiMinutes: 53,
  },
  {
    id: 'n2-15',
    examCode: '2017.07',
    yearLabel: 'Juli 2017',
    fileId: '1YjRhfuuUyx-Ri0zkZfPhoh51G7_Lhi7u',
    directAudioUrl: 'https://files.catbox.moe/oh7lfi.mp3',
  },
  {
    id: 'n2-16',
    examCode: '2017.12',
    yearLabel: 'Desember 2017',
    fileId: '14pIase7lYswPr4juFyJXOUZq6FwsHI-T',
    directAudioUrl: 'https://files.catbox.moe/odph8a.mp3',
  },
  {
    id: 'n2-17',
    examCode: '2018.07',
    yearLabel: 'Juli 2018',
    fileId: '1R1KCOqFFSw4nLfTQZAYzUSv7YiH6wIFH',
    directAudioUrl: 'https://files.catbox.moe/iw65xx.mp3',
  },
  {
    id: 'n2-18',
    examCode: '2018.12',
    yearLabel: 'Desember 2018',
    fileId: '17qRZ8B8RXHo-tDhs9-O3vR3gYEs3Q4fH',
    directAudioUrl: 'https://files.catbox.moe/n1uprt.mp3',
  },
];

export const CATBOX_N2_CHOUKAI_URLS: readonly string[] = N2_SESSIONS.map(
  (s) => s.directAudioUrl,
).filter((url): url is string => Boolean(url));

export const TRYOUT_N2_PACKETS: TryOutPacketCatalogItem[] = [...N2_SESSIONS]
  .sort((a, b) => a.examCode.localeCompare(b.examCode))
  .map((spec, idx): TryOutPacketCatalogItem => {
    const number = idx + 1;
    const order = String(number).padStart(2, '0');
    const codeFile = spec.examCode.replace('.', '_');
    const choukaiMinutes = spec.choukaiMinutes ?? 52;
    const verified = isVerifiedTryOutPacket(spec.id);
    const choukaiCount = spec.choukaiCount ?? 32;
    const questionCount = 54 + 21 + choukaiCount;
    return {
      id: spec.id,
      level: 'N2',
      order,
      number,
      title: `JLPT N2 — Paket ${number} (${spec.examCode})`,
      examCode: spec.examCode,
      yearLabel: spec.yearLabel,
      description: verified
        ? `Soal asli terverifikasi seri ${spec.examCode} (${spec.yearLabel}) · Moji-Bunpou 54 soal, Dokkai 21 soal, Choukai ${choukaiCount} soal + audio resmi & transkrip Choukai.`
        : `Paket seri ${spec.examCode} (${spec.yearLabel}) sementara terkunci sambil menunggu verifikasi soal & kunci jawaban resmi.`,
      questionCount,
      choukaiCount,
      recommendedMinutes: 105 + choukaiMinutes,
      xpReward: 150,
      hasQuestions: verified,
      isFullText: verified,
      audioSrc: spec.directAudioUrl ?? driveAudioProxyUrl(spec.fileId),
      audioFileName: `JLPT_N2_${codeFile}_Choukai.mp3`,
      audioDurationLabel: spec.audioDurationLabel ?? '52:00',
      choukaiMinutes,
    };
  });

const N1_SESSIONS: SessionSeedSpec[] = [
  {
    id: 'n1-1',
    examCode: '2010.07',
    yearLabel: 'Juli 2010',
    fileId: '1C-e2n7BKlxMzYCp1NqfkxAfmOiqiz3z-',
    audioDurationLabel: '56:00',
  },
  {
    id: 'n1-2',
    examCode: '2010.12',
    yearLabel: 'Desember 2010',
    fileId: '1SFmPy5MFYFLDqrhRcgYKSTvTpHbwZQej',
  },
  {
    id: 'n1-3',
    examCode: '2011.07',
    yearLabel: 'Juli 2011',
    fileId: '12MDcEEtE0DyglEBKRR2gvPR-wG_w_U1k',
  },
  {
    id: 'n1-4',
    examCode: '2011.12',
    yearLabel: 'Desember 2011',
    fileId: '14PARWoCCw9wZZSlPjaviuceE8QpdQNxz',
  },
  {
    id: 'n1-5',
    examCode: '2012.07',
    yearLabel: 'Juli 2012',
    fileId: '1IOFbCAWLZnLn7D-PtJNJuzWCISmwkbGT',
  },
  {
    id: 'n1-6',
    examCode: '2012.12',
    yearLabel: 'Desember 2012',
    fileId: '1rXWQg1jHfSrTffLcidq8mZh-dy40v2QS',
  },
  {
    id: 'n1-7',
    examCode: '2013.07',
    yearLabel: 'Juli 2013',
    fileId: '1pLHBXNmF_jcwTAbs1BSni-62O0Cts4Xg',
  },
  {
    id: 'n1-8',
    examCode: '2013.12',
    yearLabel: 'Desember 2013',
    fileId: '1X-P496yHiBixcAcqbXMnIVt9J2LWDqwJ',
  },
  {
    id: 'n1-9',
    examCode: '2014.07',
    yearLabel: 'Juli 2014',
    fileId: '1oa-KDlxobIVa5XCq-rgLcpPcdkquAWvi',
  },
  {
    id: 'n1-10',
    examCode: '2014.12',
    yearLabel: 'Desember 2014',
    fileId: '1Kp7cijguVaf-HuyGdZ539mY0OBTEBodI',
  },
  {
    id: 'n1-11',
    examCode: '2015.07',
    yearLabel: 'Juli 2015',
    fileId: '1jSFlXwkH8t2sTiTCCc2Oe9nKq3UXmwPU',
  },
  {
    id: 'n1-12',
    examCode: '2015.12',
    yearLabel: 'Desember 2015',
    fileId: '14gz-OC_aYPH6iPVAScoFNM8f-68HzBKB',
  },
  {
    id: 'n1-13',
    examCode: '2016.07',
    yearLabel: 'Juli 2016',
    fileId: '1TYo9GSUq5ONE98dYzrvaY13ljqGwbQCt',
  },
  {
    id: 'n1-14',
    examCode: '2016.12',
    yearLabel: 'Desember 2016',
    fileId: '1_W0yIUn0CLx6ppNJIhRLnp9CmwEIa4Tj',
  },
  {
    id: 'n1-15',
    examCode: '2017.07',
    yearLabel: 'Juli 2017',
    fileId: '1xAVxWamYNm0dLfreSYaYc5ggpWiQkKkI',
  },
  {
    id: 'n1-16',
    examCode: '2017.12',
    yearLabel: 'Desember 2017',
    fileId: '1UEjGjKW532lioJYH_s4v1O-DUu6pb5q1',
  },
  {
    id: 'n1-17',
    examCode: '2018.07',
    yearLabel: 'Juli 2018',
    fileId: '1j4qkXniIaurqjB6AiKV_Y89_NcEuiKYV',
  },
  {
    id: 'n1-18',
    examCode: '2018.12',
    yearLabel: 'Desember 2018',
    fileId: '19jDX4zRZCr1u4MVkM_eNJLrjekdQsKWB',
  },
];

export const TRYOUT_N1_PACKETS: TryOutPacketCatalogItem[] = [...N1_SESSIONS]
  .sort((a, b) => a.examCode.localeCompare(b.examCode))
  .map((spec, idx): TryOutPacketCatalogItem => {
    const number = idx + 1;
    const order = String(number).padStart(2, '0');
    const codeFile = spec.examCode.replace('.', '_');
    return {
      id: spec.id,
      level: 'N1',
      order,
      number,
      title: `JLPT N1 — Paket ${number} (${spec.examCode})`,
      examCode: spec.examCode,
      yearLabel: spec.yearLabel,
      description: `Paket JLPT N1 seri ${spec.examCode} (${spec.yearLabel}) sementara terkunci sambil menunggu verifikasi soal & kunci jawaban resmi.`,
      questionCount: 108,
      choukaiCount: 37,
      recommendedMinutes: 166,
      xpReward: 150,
      hasQuestions: false,
      isFullText: false,
      audioSrc: driveAudioProxyUrl(spec.fileId),
      audioFileName: `JLPT_N1_${codeFile}_Choukai.m4a`,
      audioDurationLabel: spec.audioDurationLabel ?? '56:00',
      choukaiMinutes: 56,
    };
  });

export const ALL_TRYOUT_PACKETS: TryOutPacketCatalogItem[] = [
  ...TRYOUT_N2_PACKETS,
  ...TRYOUT_N1_PACKETS,
];

export function getTryOutPacketsByLevel(
  level: TryOutLevelOption,
): TryOutPacketCatalogItem[] {
  return level === 'N1' ? TRYOUT_N1_PACKETS : TRYOUT_N2_PACKETS;
}

export function getTryOutPacketById(packetId: string): TryOutPacketCatalogItem {
  return (
    ALL_TRYOUT_PACKETS.find((packet) => packet.id === packetId) ??
    TRYOUT_N2_PACKETS[0]
  );
}

export function getTryOutPacketParts(packetId: string): TryOutPacketPart[] {
  const packet = getTryOutPacketById(packetId);
  if (packet.level === 'N1') {
    return [
      {
        id: 'moji-bunpou',
        order: '01',
        title: 'Moji-Goi & Bunpou',
        subtitle: `Soal teks kanji, kosakata, & tata bahasa JLPT N1 ${packet.examCode} (45 soal · 8 halaman)`,
        questionCount: 45,
        pageCount: 8,
        recommendedMinutes: 50,
        xpReward: 50,
      },
      {
        id: 'dokkai',
        order: '02',
        title: 'Dokkai (Pemahaman Bacaan)',
        subtitle: `Wacana teks pendek, menengah, panjang, opini A/B, & info JLPT N1 ${packet.examCode} (26 soal · 6 halaman)`,
        questionCount: 26,
        pageCount: 6,
        recommendedMinutes: 60,
        xpReward: 50,
      },
      {
        id: 'choukai',
        order: '03',
        title: 'Choukai (Menyimak + Audio)',
        subtitle: `Audio resmi JLPT N1 ${packet.examCode} (${packet.yearLabel}) + soal pilihan teks Mondai 1–5 (${packet.choukaiCount} soal · 5 halaman)`,
        questionCount: packet.choukaiCount,
        pageCount: 5,
        recommendedMinutes: packet.choukaiMinutes,
        xpReward: 50,
        audioSrc: packet.audioSrc,
        audioFileName: packet.audioFileName,
      },
    ];
  }

  return [
    {
      id: 'moji-bunpou',
      order: '01',
      title: 'Moji-Goi & Bunpou',
      subtitle: `Soal asli kanji, kosakata, & tata bahasa JLPT ${packet.level} ${packet.examCode} (54 soal · 10 halaman)`,
      questionCount: 54,
      pageCount: 10,
      recommendedMinutes: 45,
      xpReward: 50,
    },
    {
      id: 'dokkai',
      order: '02',
      title: 'Dokkai (Pemahaman Bacaan)',
      subtitle: `Wacana teks pendek, menengah, perbandingan A/B, panjang, & info ${packet.examCode} (21 soal · 5 halaman)`,
      questionCount: 21,
      pageCount: 5,
      recommendedMinutes: 60,
      xpReward: 50,
    },
    {
      id: 'choukai',
      order: '03',
      title: 'Choukai (Menyimak + Audio & Transkrip)',
      subtitle: `Audio resmi JLPT ${packet.level} ${packet.examCode} (${packet.yearLabel}) + soal Mondai 1–5 & transkrip Choukai (${packet.choukaiCount} soal · 5 halaman)`,
      questionCount: packet.choukaiCount,
      pageCount: 5,
      recommendedMinutes: packet.choukaiMinutes,
      xpReward: 50,
      audioSrc: packet.audioSrc,
      audioFileName: packet.audioFileName,
    },
  ];
}

export function isFirstN2PacketCompleted(
  completedPartIds: readonly TryOutPacketPartId[],
): boolean {
  return TRYOUT_N2_1_PARTS.every((part) => completedPartIds.includes(part.id));
}

export function isTryOutPacketUnlocked(
  packetId: string,
  _completedFirstPacketPartIds?: readonly TryOutPacketPartId[],
): boolean {
  const packet = ALL_TRYOUT_PACKETS.find((item) => item.id === packetId);
  return Boolean(packet && packet.hasQuestions && packet.isFullText);
}

export type TryOutFormValues = Record<string, string>;

export interface FormProgressItemRef {
  kind: 'text' | 'date' | 'notice' | 'passage' | 'image' | 'choice';
  id: string;
  label?: string;
  required?: boolean;
  number?: number;
  prompt?: string;
  optionTexts?: string[];
  correctAnswer?: string;
  transcript?: string;
}

export interface FormProgressPageRef {
  id: string;
  title: string;
  items: FormProgressItemRef[];
}

export interface MissingFieldRef {
  pageIndex: number;
  pageTitle: string;
  itemId: string;
  label: string;
}

export interface PartFormProgressSummary {
  answeredChoices: number;
  totalChoices: number;
  answeredRequired: number;
  totalRequired: number;
  isReadyToSubmit: boolean;
  missingRequired: MissingFieldRef[];
}

export function evaluatePartFormProgress(
  pages: readonly FormProgressPageRef[],
  values: TryOutFormValues,
): PartFormProgressSummary {
  let answeredChoices = 0;
  let totalChoices = 0;
  let answeredRequired = 0;
  let totalRequired = 0;
  const missingRequired: MissingFieldRef[] = [];

  pages.forEach((page, pageIndex) => {
    page.items.forEach((item) => {
      if (item.kind !== 'choice' && item.kind !== 'text' && item.kind !== 'date') {
        return;
      }

      const rawVal = values[item.id] ?? '';
      const hasValue = rawVal.trim().length > 0;

      if (item.kind === 'choice') {
        totalChoices++;
        if (hasValue) {
          answeredChoices++;
        }
      }

      // Every fillable item in a Try Out form must be filled before proceeding
      totalRequired++;
      if (hasValue) {
        answeredRequired++;
      } else {
        missingRequired.push({
          pageIndex,
          pageTitle: page.title,
          itemId: item.id,
          label:
            item.label ??
            (item.number ? `Soal ${item.number}` : item.id),
        });
      }
    });
  });

  return {
    answeredChoices,
    totalChoices,
    answeredRequired,
    totalRequired,
    isReadyToSubmit: missingRequired.length === 0,
    missingRequired,
  };
}

export interface WrongAnswerDetail {
  itemId: string;
  number: number;
  label: string;
  prompt: string;
  chosen: string;
  chosenText?: string;
  correct: string;
  correctText?: string;
  transcript?: string;
}

export interface PartScoreSummary {
  correctCount: number;
  totalGradable: number;
  accuracyPercent: number;
  wrongItems: WrongAnswerDetail[];
}

export function evaluatePartScore(
  pages: readonly FormProgressPageRef[],
  values: TryOutFormValues,
): PartScoreSummary {
  let correctCount = 0;
  let totalGradable = 0;
  const wrongItems: WrongAnswerDetail[] = [];

  for (const page of pages) {
    for (const item of page.items) {
      if (item.kind !== 'choice' || !item.correctAnswer) continue;
      totalGradable++;
      const chosen = (values[item.id] ?? '').trim();
      if (chosen === item.correctAnswer) {
        correctCount++;
      } else {
        const chosenIdx = Number.parseInt(chosen, 10) - 1;
        const correctIdx = Number.parseInt(item.correctAnswer, 10) - 1;
        wrongItems.push({
          itemId: item.id,
          number: item.number ?? 0,
          label: item.label ?? `Soal ${item.number ?? item.id}`,
          prompt: item.prompt ?? item.label ?? '',
          chosen: chosen || '-',
          chosenText:
            chosenIdx >= 0 && item.optionTexts?.[chosenIdx]
              ? item.optionTexts[chosenIdx]
              : undefined,
          correct: item.correctAnswer,
          correctText:
            correctIdx >= 0 && item.optionTexts?.[correctIdx]
              ? item.optionTexts[correctIdx]
              : undefined,
          transcript: item.transcript,
        });
      }
    }
  }

  const accuracyPercent =
    totalGradable > 0 ? Math.round((correctCount / totalGradable) * 100) : 0;

  return {
    correctCount,
    totalGradable,
    accuracyPercent,
    wrongItems,
  };
}

export function getFirstIncompletePageIndex(
  pages: readonly FormProgressPageRef[],
  values: TryOutFormValues,
): number {
  for (let i = 0; i < pages.length; i++) {
    const summary = evaluatePartFormProgress([pages[i]], values);
    if (!summary.isReadyToSubmit) {
      return i;
    }
  }
  return pages.length;
}

export function formatAnswerSheetText(
  partTitle: string,
  pages: readonly FormProgressPageRef[],
  values: TryOutFormValues,
): string {
  const lines: string[] = [`=== ${partTitle} ===`];

  pages.forEach((page) => {
    const pageLines: string[] = [];
    page.items.forEach((item) => {
      if (item.kind === 'text' || item.kind === 'date') {
        const val = (values[item.id] ?? '').trim();
        if (val) {
          pageLines.push(`${item.label ?? item.id}: ${val}`);
        }
      } else if (item.kind === 'choice') {
        const val = (values[item.id] ?? '').trim() || '-';
        const status =
          item.correctAnswer && val !== '-'
            ? val === item.correctAnswer
              ? ' (Benar)'
              : ` (Kunci: ${item.correctAnswer})`
            : '';
        pageLines.push(`${item.label ?? `Soal ${item.number}`}: ${val}${status}`);
      }
    });

    if (pageLines.length > 0) {
      lines.push(`\n[${page.title}]`);
      lines.push(...pageLines);
    }
  });

  return lines.join('\n');
}

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface TryOutCompletionToggleResult {
  nextCompletedIds: TryOutPacketPartId[];
  xpDelta: number;
}

export function toggleTryOutPartCompletion(
  completedIds: TryOutPacketPartId[],
  partId: TryOutPacketPartId,
  xpReward: number,
): TryOutCompletionToggleResult {
  const alreadyCompleted = completedIds.includes(partId);
  if (alreadyCompleted) {
    return {
      nextCompletedIds: completedIds.filter((id) => id !== partId),
      xpDelta: 0,
    };
  }

  return {
    nextCompletedIds: [...completedIds, partId],
    xpDelta: xpReward,
  };
}
