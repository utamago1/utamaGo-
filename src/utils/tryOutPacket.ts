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

export type TryOutLevelOption = 'N3' | 'N2' | 'N1';

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
  mojiBunpouCount?: number;
  dokkaiCount?: number;
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
  'n3-1',
  'n3-2',
  'n3-3',
  'n3-4',
  'n3-5',
  'n2-2',
  'n2-3',
  'n2-4',
  'n2-5',
  'n2-6',
  'n2-7',
  'n1-1',
  'n1-2',
  'n1-3',
  'n1-4',
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
  dokkaiCount?: number;
  choukaiCount?: number;
  choukaiMinutes?: number;
  audioDurationLabel?: string;
}

const N3_SESSIONS: SessionSeedSpec[] = [
  {
    id: 'n3-1',
    examCode: '2010.07',
    yearLabel: 'Juli 2010',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/hpkzbw.mp3',
    choukaiCount: 28,
  },
  {
    id: 'n3-2',
    examCode: '2011.07',
    yearLabel: 'Juli 2011',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/d6lbqh.mp3',
    choukaiCount: 27,
  },
  {
    id: 'n3-3',
    examCode: '2011.12',
    yearLabel: 'Desember 2011',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/zhstka.mp3',
    choukaiCount: 27,
  },
  {
    id: 'n3-4',
    examCode: '2012.07',
    yearLabel: 'Juli 2012',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/2atz7d.mp3',
    choukaiCount: 28,
  },
  {
    id: 'n3-5',
    examCode: '2012.12',
    yearLabel: 'Desember 2012',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/74mi06.mp3',
    choukaiCount: 28,
  },
  {
    id: 'n3-6',
    examCode: '2013.07',
    yearLabel: 'Juli 2013',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/qwu6ii.mp3',
  },
  {
    id: 'n3-7',
    examCode: '2013.12',
    yearLabel: 'Desember 2013',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/1uszlx.mp3',
  },
  {
    id: 'n3-8',
    examCode: '2014.07',
    yearLabel: 'Juli 2014',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/olokg6.mp3',
  },
  {
    id: 'n3-9',
    examCode: '2014.12',
    yearLabel: 'Desember 2014',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/c8ip5f.mp3',
  },
  {
    id: 'n3-10',
    examCode: '2015.12',
    yearLabel: 'Desember 2015',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/hzcpma.mp3',
  },
  {
    id: 'n3-11',
    examCode: '2016.07',
    yearLabel: 'Juli 2016',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/y21tzz.mp3',
  },
  {
    id: 'n3-12',
    examCode: '2016.12',
    yearLabel: 'Desember 2016',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/79fueb.mp3',
  },
  {
    id: 'n3-13',
    examCode: '2017.07',
    yearLabel: 'Juli 2017',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/05sss5.mp3',
  },
  {
    id: 'n3-14',
    examCode: '2017.12',
    yearLabel: 'Desember 2017',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/xo65sa.mp3',
  },
  {
    id: 'n3-15',
    examCode: '2018.07',
    yearLabel: 'Juli 2018',
    fileId: '',
    directAudioUrl: 'https://files.catbox.moe/jgc3zf.mp3',
  },
];

export const TRYOUT_N3_PACKETS: TryOutPacketCatalogItem[] = [...N3_SESSIONS]
  .sort((a, b) => a.examCode.localeCompare(b.examCode))
  .map((spec, idx): TryOutPacketCatalogItem => {
    const number = idx + 1;
    const order = String(number).padStart(2, '0');
    const codeFile = spec.examCode.replace('.', '_');
    const choukaiMinutes = spec.choukaiMinutes ?? 40;
    const verified = isVerifiedTryOutPacket(spec.id);
    const choukaiCount = spec.choukaiCount ?? 28;
    const questionCount = 58 + 16 + choukaiCount;
    return {
      id: spec.id,
      level: 'N3',
      order,
      number,
      title: `JLPT N3 — Paket ${number} (${spec.examCode})`,
      examCode: spec.examCode,
      yearLabel: spec.yearLabel,
      description: verified
        ? `Soal asli terverifikasi seri ${spec.examCode} (${spec.yearLabel}) · Moji-Bunpou 58 soal, Dokkai 16 soal, Choukai ${choukaiCount} soal + audio resmi, ilustrasi, & transkrip Choukai.`
        : `Paket JLPT N3 seri ${spec.examCode} (${spec.yearLabel}) sementara terkunci sambil menunggu verifikasi soal & kunci jawaban resmi.`,
      questionCount,
      mojiBunpouCount: 58,
      dokkaiCount: 16,
      choukaiCount,
      recommendedMinutes: 100 + choukaiMinutes,
      xpReward: 150,
      hasQuestions: verified,
      isFullText: verified,
      audioSrc: spec.directAudioUrl ?? driveAudioProxyUrl(spec.fileId),
      audioFileName: `JLPT_N3_${codeFile}_Choukai.mp3`,
      audioDurationLabel: spec.audioDurationLabel ?? '40:00',
      choukaiMinutes,
    };
  });

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
      mojiBunpouCount: 54,
      dokkaiCount: 21,
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
    directAudioUrl: 'https://files.catbox.moe/kssn7r.m4a',
    dokkaiCount: 26,
    choukaiCount: 37,
    audioDurationLabel: '56:00',
  },
  {
    id: 'n1-2',
    examCode: '2010.12',
    yearLabel: 'Desember 2010',
    fileId: '1SFmPy5MFYFLDqrhRcgYKSTvTpHbwZQej',
    directAudioUrl: 'https://files.catbox.moe/yha7n7.m4a',
    dokkaiCount: 26,
    choukaiCount: 36,
  },
  {
    id: 'n1-3',
    examCode: '2011.07',
    yearLabel: 'Juli 2011',
    fileId: '12MDcEEtE0DyglEBKRR2gvPR-wG_w_U1k',
    directAudioUrl: 'https://files.catbox.moe/z0wq68.m4a',
    dokkaiCount: 25,
    choukaiCount: 36,
  },
  {
    id: 'n1-4',
    examCode: '2011.12',
    yearLabel: 'Desember 2011',
    fileId: '14PARWoCCw9wZZSlPjaviuceE8QpdQNxz',
    directAudioUrl: 'https://files.catbox.moe/hqktxl.m4a',
    dokkaiCount: 25,
    choukaiCount: 36,
  },
  {
    id: 'n1-5',
    examCode: '2012.07',
    yearLabel: 'Juli 2012',
    fileId: '1IOFbCAWLZnLn7D-PtJNJuzWCISmwkbGT',
    directAudioUrl: 'https://files.catbox.moe/i5r5im.m4a',
  },
  {
    id: 'n1-6',
    examCode: '2012.12',
    yearLabel: 'Desember 2012',
    fileId: '1rXWQg1jHfSrTffLcidq8mZh-dy40v2QS',
    directAudioUrl: 'https://files.catbox.moe/10cffh.m4a',
  },
  {
    id: 'n1-7',
    examCode: '2013.07',
    yearLabel: 'Juli 2013',
    fileId: '1pLHBXNmF_jcwTAbs1BSni-62O0Cts4Xg',
    directAudioUrl: 'https://files.catbox.moe/gugw3n.m4a',
  },
  {
    id: 'n1-8',
    examCode: '2013.12',
    yearLabel: 'Desember 2013',
    fileId: '1X-P496yHiBixcAcqbXMnIVt9J2LWDqwJ',
    directAudioUrl: 'https://files.catbox.moe/fonv77.m4a',
  },
  {
    id: 'n1-9',
    examCode: '2014.07',
    yearLabel: 'Juli 2014',
    fileId: '1oa-KDlxobIVa5XCq-rgLcpPcdkquAWvi',
    directAudioUrl: 'https://files.catbox.moe/qlpjp1.m4a',
  },
  {
    id: 'n1-10',
    examCode: '2014.12',
    yearLabel: 'Desember 2014',
    fileId: '1Kp7cijguVaf-HuyGdZ539mY0OBTEBodI',
    directAudioUrl: 'https://files.catbox.moe/u6j4mv.m4a',
  },
  {
    id: 'n1-11',
    examCode: '2015.07',
    yearLabel: 'Juli 2015',
    fileId: '1jSFlXwkH8t2sTiTCCc2Oe9nKq3UXmwPU',
    directAudioUrl: 'https://files.catbox.moe/v9m3tc.m4a',
  },
  {
    id: 'n1-12',
    examCode: '2015.12',
    yearLabel: 'Desember 2015',
    fileId: '14gz-OC_aYPH6iPVAScoFNM8f-68HzBKB',
    directAudioUrl: 'https://files.catbox.moe/8o3176.m4a',
  },
  {
    id: 'n1-13',
    examCode: '2016.07',
    yearLabel: 'Juli 2016',
    fileId: '1TYo9GSUq5ONE98dYzrvaY13ljqGwbQCt',
    directAudioUrl: 'https://files.catbox.moe/xdqxf9.m4a',
  },
  {
    id: 'n1-14',
    examCode: '2016.12',
    yearLabel: 'Desember 2016',
    fileId: '1_W0yIUn0CLx6ppNJIhRLnp9CmwEIa4Tj',
    directAudioUrl: 'https://files.catbox.moe/eftt4e.m4a',
  },
  {
    id: 'n1-15',
    examCode: '2017.07',
    yearLabel: 'Juli 2017',
    fileId: '1xAVxWamYNm0dLfreSYaYc5ggpWiQkKkI',
    directAudioUrl: 'https://files.catbox.moe/1vhrdb.m4a',
  },
  {
    id: 'n1-16',
    examCode: '2017.12',
    yearLabel: 'Desember 2017',
    fileId: '1UEjGjKW532lioJYH_s4v1O-DUu6pb5q1',
    directAudioUrl: 'https://files.catbox.moe/afjymx.m4a',
  },
  {
    id: 'n1-17',
    examCode: '2018.07',
    yearLabel: 'Juli 2018',
    fileId: '1j4qkXniIaurqjB6AiKV_Y89_NcEuiKYV',
    directAudioUrl: 'https://files.catbox.moe/9vlon0.m4a',
  },
  {
    id: 'n1-18',
    examCode: '2018.12',
    yearLabel: 'Desember 2018',
    fileId: '19jDX4zRZCr1u4MVkM_eNJLrjekdQsKWB',
    directAudioUrl: 'https://files.catbox.moe/n2mwx5.m4a',
  },
];

export const CATBOX_ALL_CHOUKAI_URLS: readonly string[] = [
  ...N3_SESSIONS,
  ...N2_SESSIONS,
  ...N1_SESSIONS,
]
  .map((s) => s.directAudioUrl)
  .filter((url): url is string => Boolean(url));

export const TRYOUT_N1_PACKETS: TryOutPacketCatalogItem[] = [...N1_SESSIONS]
  .sort((a, b) => a.examCode.localeCompare(b.examCode))
  .map((spec, idx): TryOutPacketCatalogItem => {
    const number = idx + 1;
    const order = String(number).padStart(2, '0');
    const codeFile = spec.examCode.replace('.', '_');
    const verified = isVerifiedTryOutPacket(spec.id);
    const dokkaiCount = spec.dokkaiCount ?? 26;
    const choukaiCount = spec.choukaiCount ?? 36;
    const questionCount = 45 + dokkaiCount + choukaiCount;
    return {
      id: spec.id,
      level: 'N1',
      order,
      number,
      title: `JLPT N1 — Paket ${number} (${spec.examCode})`,
      examCode: spec.examCode,
      yearLabel: spec.yearLabel,
      description: verified
        ? `Soal asli terverifikasi seri ${spec.examCode} (${spec.yearLabel}) · Moji-Bunpou 45 soal, Dokkai ${dokkaiCount} soal, Choukai ${choukaiCount} soal + audio resmi & transkrip Choukai.`
        : `Paket JLPT N1 seri ${spec.examCode} (${spec.yearLabel}) sementara terkunci sambil menunggu verifikasi soal & kunci jawaban resmi.`,
      questionCount,
      mojiBunpouCount: 45,
      dokkaiCount,
      choukaiCount,
      recommendedMinutes: 166,
      xpReward: 150,
      hasQuestions: verified,
      isFullText: verified,
      audioSrc: spec.directAudioUrl ?? driveAudioProxyUrl(spec.fileId),
      audioFileName: `JLPT_N1_${codeFile}_Choukai.m4a`,
      audioDurationLabel: spec.audioDurationLabel ?? '56:00',
      choukaiMinutes: 56,
    };
  });

export const ALL_TRYOUT_PACKETS: TryOutPacketCatalogItem[] = [
  ...TRYOUT_N3_PACKETS,
  ...TRYOUT_N2_PACKETS,
  ...TRYOUT_N1_PACKETS,
];

export function getTryOutPacketsByLevel(
  level: TryOutLevelOption,
): TryOutPacketCatalogItem[] {
  if (level === 'N3') return TRYOUT_N3_PACKETS;
  if (level === 'N1') return TRYOUT_N1_PACKETS;
  return TRYOUT_N2_PACKETS;
}

export function getTryOutPacketById(packetId: string): TryOutPacketCatalogItem {
  return (
    ALL_TRYOUT_PACKETS.find((packet) => packet.id === packetId) ??
    TRYOUT_N2_PACKETS[0]
  );
}

export function getTryOutPacketParts(packetId: string): TryOutPacketPart[] {
  const packet = getTryOutPacketById(packetId);
  if (packet.level === 'N3') {
    const mbCount = packet.mojiBunpouCount ?? 58;
    const dkCount = packet.dokkaiCount ?? 16;
    return [
      {
        id: 'moji-bunpou',
        order: '01',
        title: 'Moji-Goi & Bunpou',
        subtitle: `Soal asli kanji, kosakata (35), & tata bahasa (23) JLPT N3 ${packet.examCode} (${mbCount} soal · 9 halaman)`,
        questionCount: mbCount,
        pageCount: 9,
        recommendedMinutes: 55,
        xpReward: 50,
      },
      {
        id: 'dokkai',
        order: '02',
        title: 'Dokkai (Pemahaman Bacaan)',
        subtitle: `Wacana teks pendek, menengah, panjang, & pencarian info JLPT N3 ${packet.examCode} (${dkCount} soal · 4 halaman)`,
        questionCount: dkCount,
        pageCount: 4,
        recommendedMinutes: 45,
        xpReward: 50,
      },
      {
        id: 'choukai',
        order: '03',
        title: 'Choukai (Menyimak + Audio & Transkrip)',
        subtitle: `Audio resmi JLPT N3 ${packet.examCode} (${packet.yearLabel}) + ilustrasi & transkrip Choukai (${packet.choukaiCount} soal · 5 halaman)`,
        questionCount: packet.choukaiCount,
        pageCount: 5,
        recommendedMinutes: packet.choukaiMinutes,
        xpReward: 50,
        audioSrc: packet.audioSrc,
        audioFileName: packet.audioFileName,
      },
    ];
  }

  if (packet.level === 'N1') {
    const dkCount = packet.dokkaiCount ?? 26;
    return [
      {
        id: 'moji-bunpou',
        order: '01',
        title: 'Moji-Goi & Bunpou',
        subtitle: `Soal asli kanji, kosakata, & tata bahasa JLPT N1 ${packet.examCode} (45 soal · 8 halaman)`,
        questionCount: 45,
        pageCount: 8,
        recommendedMinutes: 50,
        xpReward: 50,
      },
      {
        id: 'dokkai',
        order: '02',
        title: 'Dokkai (Pemahaman Bacaan)',
        subtitle: `Wacana teks pendek, menengah, panjang, opini A/B, & info JLPT N1 ${packet.examCode} (${dkCount} soal · 6 halaman)`,
        questionCount: dkCount,
        pageCount: 6,
        recommendedMinutes: 60,
        xpReward: 50,
      },
      {
        id: 'choukai',
        order: '03',
        title: 'Choukai (Menyimak + Audio & Transkrip)',
        subtitle: `Audio resmi JLPT N1 ${packet.examCode} (${packet.yearLabel}) + soal Mondai 1–5 & transkrip Choukai (${packet.choukaiCount} soal · 5 halaman)`,
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
  title?: string;
  subtitle?: string;
  paragraphs?: string[];
  sections?: Array<{ heading: string; lines: string[] }>;
  notes?: string[];
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
  subtitle?: string;
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
  pageTitle: string;
  pageSubtitle?: string;
  mondaiInstruction?: string;
  prompt: string;
  optionTexts?: string[];
  chosen: string;
  chosenText?: string;
  correct: string;
  correctText?: string;
  passageContext?: string;
  transcript?: string;
}

export interface PartScoreSummary {
  correctCount: number;
  totalGradable: number;
  accuracyPercent: number;
  wrongItems: WrongAnswerDetail[];
}

function formatPassageForContext(item: FormProgressItemRef): string {
  const chunks: string[] = [];
  if (item.title && item.title.trim()) {
    chunks.push(item.title.trim());
  }
  if (item.paragraphs && item.paragraphs.length > 0) {
    chunks.push(
      item.paragraphs
        .map((p) => p.trim())
        .filter(Boolean)
        .join('\n'),
    );
  }
  if (item.sections && item.sections.length > 0) {
    for (const sec of item.sections) {
      const heading = sec.heading?.trim();
      const body = sec.lines
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n');
      if (heading && body) chunks.push(`[${heading}]\n${body}`);
      else if (body) chunks.push(body);
    }
  }
  if (item.notes && item.notes.length > 0) {
    chunks.push(
      item.notes
        .map((n) => n.trim())
        .filter(Boolean)
        .join('\n'),
    );
  }
  return chunks.join('\n\n').trim().slice(0, 4600);
}

function isSubstantivePassage(item: FormProgressItemRef): boolean {
  if (item.kind !== 'passage') return false;
  if (item.sections && item.sections.length > 0) return true;
  const paragraphs = (item.paragraphs ?? []).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) return false;
  const totalLen = paragraphs.reduce((sum, p) => sum + p.trim().length, 0);
  // Single short Japanese instruction lines (e.g. "下線の言葉の読み方...") are instructions, not reading passages.
  if (
    paragraphs.length === 1 &&
    totalLen < 120 &&
    /選びなさい|答えなさい|聞いて|選びましょう/.test(paragraphs[0])
  ) {
    return false;
  }
  return paragraphs.length >= 2 || totalLen >= 80;
}

export function evaluatePartScore(
  pages: readonly FormProgressPageRef[],
  values: TryOutFormValues,
): PartScoreSummary {
  let correctCount = 0;
  let totalGradable = 0;
  const wrongItems: WrongAnswerDetail[] = [];

  for (const page of pages) {
    let mondaiInstruction = '';
    let latestPassageContext = '';

    for (const item of page.items) {
      if (item.kind === 'passage') {
        if (!mondaiInstruction) {
          if (item.subtitle && item.subtitle.trim()) {
            mondaiInstruction = item.subtitle.trim();
          } else if (
            item.paragraphs &&
            item.paragraphs.length === 1 &&
            item.paragraphs[0].trim().length > 0 &&
            item.paragraphs[0].trim().length <= 220
          ) {
            mondaiInstruction = item.paragraphs[0].trim();
          }
        }
        if (isSubstantivePassage(item)) {
          latestPassageContext = formatPassageForContext(item);
        }
        continue;
      }

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
          pageTitle: page.title,
          pageSubtitle: page.subtitle,
          mondaiInstruction: mondaiInstruction || undefined,
          prompt: item.prompt ?? item.label ?? '',
          optionTexts:
            item.optionTexts && item.optionTexts.length > 0
              ? item.optionTexts
              : undefined,
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
          passageContext: latestPassageContext || undefined,
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
