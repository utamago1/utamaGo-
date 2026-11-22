import type { JlptLevel } from '../data/utamagoContent';
import type { BunpouN2Item } from './bunpouN2Parser';

export interface BunpouComparisonEntry {
  id: string;
  level: JlptLevel;
  lessonLabel?: string;
  pattern: string;
  romaji?: string;
  register?: string;
  meaning: string;
  formula?: string;
  nuance: string;
  exampleJp: string;
  exampleId: string;
}

export interface BunpouComparisonGroup {
  id: string;
  label: string;
  level: JlptLevel | 'ALL';
  levels: JlptLevel[];
  entries: BunpouComparisonEntry[];
}

const LEVEL_SORT_ORDER: Record<JlptLevel, number> = {
  N5: 1,
  N4: 2,
  N3: 3,
  N2: 4,
  N1: 5,
};

export const BEGINNER_BUNPOU_COMPARISONS: Record<
  'N5' | 'N4',
  BunpouComparisonGroup[]
> = {
  N5: [
    {
      id: 'n5-wa-ga',
      label: 'Partikel Subjek & Topik (は vs が)',
      level: 'N5',
      levels: ['N5'],
      entries: [
        {
          id: 'n5-wa',
          level: 'N5',
          lessonLabel: 'Bab 1 · Partikel Inti',
          pattern: '〜は',
          romaji: 'wa',
          meaning: 'Menandai topik utama kalimat ("tentang ...")',
          formula: 'Kata Benda + は',
          nuance:
            'Dipakai saat memperkenalkan topik pembicaraan atau membandingkan dua hal. Informasi penting biasanya berada setelah は.',
          exampleJp: 'わたしは学生です。',
          exampleId: 'Saya adalah mahasiswa.',
        },
        {
          id: 'n5-ga',
          level: 'N5',
          lessonLabel: 'Bab 1 · Partikel Inti',
          pattern: '〜が',
          romaji: 'ga',
          meaning: 'Menandai subjek spesifik / fokus informasi baru',
          formula: 'Kata Benda + が',
          nuance:
            'Dipakai untuk menekankan siapa/apa pelakunya (menjawab "siapa/apa yang..."), menyatakan keberadaan (あります/います), atau sifat/kemampuan (好き・わかる).',
          exampleJp: '田中さんが来ました。',
          exampleId: 'Tanaka-san yang datang.',
        },
      ],
    },
    {
      id: 'n5-ni-de',
      label: 'Partikel Tempat (に vs で)',
      level: 'N5',
      levels: ['N5'],
      entries: [
        {
          id: 'n5-ni',
          level: 'N5',
          lessonLabel: 'Bab 2 · Partikel Tempat',
          pattern: '〜に',
          romaji: 'ni',
          meaning: 'Di / ke (lokasi keberadaan atau titik tujuan)',
          formula: 'Tempat + に + います / あります / 行きます',
          nuance:
            'Menunjukkan tempat keberadaan benda/orang yang diam (statis) atau titik tujuan pergerakan.',
          exampleJp: 'つくえの上に本があります。',
          exampleId: 'Di atas meja ada buku.',
        },
        {
          id: 'n5-de',
          level: 'N5',
          lessonLabel: 'Bab 2 · Partikel Tempat',
          pattern: '〜で',
          romaji: 'de',
          meaning: 'Di (lokasi berlangsungnya suatu aktivitas)',
          formula: 'Tempat + で + Kata Kerja aksi',
          nuance:
            'Dipakai saat subjek melakukan kegiatan aktif (makan, belajar, bekerja, bermain) di tempat tersebut.',
          exampleJp: '図書館で日本語を勉強します。',
          exampleId: 'Saya belajar bahasa Jepang di perpustakaan.',
        },
      ],
    },
    {
      id: 'n5-tai-hoshii',
      label: 'Keinginan (〜たい vs 〜ほしい)',
      level: 'N5',
      levels: ['N5'],
      entries: [
        {
          id: 'n5-tai',
          level: 'N5',
          lessonLabel: 'Bab 3 · Keinginan',
          pattern: '〜たい',
          romaji: 'tai',
          meaning: 'Ingin melakukan suatu tindakan',
          formula: 'V-ます (hapus ます) + たい',
          nuance:
            'Menyatakan keinginan diri sendiri untuk melakukan suatu kata kerja. Berkonjugasi seperti kata sifat-i.',
          exampleJp: '日本へ行きたいです。',
          exampleId: 'Saya ingin pergi ke Jepang.',
        },
        {
          id: 'n5-hoshii',
          level: 'N5',
          lessonLabel: 'Bab 3 · Keinginan',
          pattern: '〜がほしい',
          romaji: 'ga hoshii',
          meaning: 'Ingin memiliki suatu benda / hal',
          formula: 'Kata Benda + がほしい',
          nuance:
            'Menyatakan keinginan diri sendiri terhadap benda (kata benda), bukan tindakan.',
          exampleJp: '新しいカメラがほしいです。',
          exampleId: 'Saya ingin kamera baru.',
        },
      ],
    },
    {
      id: 'n5-ajakan',
      label: 'Permintaan & Ajakan (〜てください vs 〜ませんか vs 〜ましょう)',
      level: 'N5',
      levels: ['N5'],
      entries: [
        {
          id: 'n5-tekudasai',
          level: 'N5',
          lessonLabel: 'Bab 4 · Permintaan & Ajakan',
          pattern: '〜てください',
          romaji: 'te kudasai',
          meaning: 'Tolong lakukan ... (permintaan sopan)',
          formula: 'V-て + ください',
          nuance:
            'Meminta lawan bicara melakukan sesuatu dengan sopan, atau memberi instruksi ringan.',
          exampleJp: 'ここに名前を書いてください。',
          exampleId: 'Tolong tulis nama di sini.',
        },
        {
          id: 'n5-masenka',
          level: 'N5',
          lessonLabel: 'Bab 4 · Permintaan & Ajakan',
          pattern: '〜ませんか',
          romaji: 'masen ka',
          meaning: 'Maukah ... bersama? (ajakan halus)',
          formula: 'V-ません + か',
          nuance:
            'Mengajak dengan sopan sambil memberi ruang kepada lawan bicara untuk setuju atau menolak.',
          exampleJp: 'いっしょに昼ごはんを食べませんか。',
          exampleId: 'Maukah makan siang bersama?',
        },
        {
          id: 'n5-mashou',
          level: 'N5',
          lessonLabel: 'Bab 4 · Permintaan & Ajakan',
          pattern: '〜ましょう',
          romaji: 'mashou',
          meaning: 'Ayo kita ... (ajakan langsung / bersemangat)',
          formula: 'V-ます (ubah ます → ましょう)',
          nuance:
            'Lebih langsung dan akrab dibanding 〜ませんか, atau dipakai untuk menyetujui ajakan.',
          exampleJp: '少し休みましょう。',
          exampleId: 'Ayo kita istirahat sebentar.',
        },
      ],
    },
  ],
  N4: [
    {
      id: 'n4-pengandaian',
      label: 'Pengandaian (〜たら vs 〜ば vs 〜なら vs 〜と)',
      level: 'N4',
      levels: ['N4'],
      entries: [
        {
          id: 'n4-tara',
          level: 'N4',
          lessonLabel: 'Bab 1 · Pengandaian',
          pattern: '〜たら',
          romaji: 'tara',
          meaning: 'Kalau / setelah ... (paling serbaguna)',
          formula: 'V-た / A-かった / N-だった + ら',
          nuance:
            'Paling aman dipakai di percakapan. Bisa diikuti perintah, ajakan, atau kejadian nyata yang pasti terjadi ("nanti setelah...").',
          exampleJp: '家に着いたら、連絡してください。',
          exampleId: 'Kalau sudah sampai di rumah, tolong hubungi saya.',
        },
        {
          id: 'n4-ba',
          level: 'N4',
          lessonLabel: 'Bab 1 · Pengandaian',
          pattern: '〜ば',
          romaji: 'ba',
          meaning: 'Jika memenuhi syarat ..., maka ...',
          formula: 'V-ば / A-ければ',
          nuance:
            'Menekankan syarat logis/umum ("kalau syarat A terpenuhi, hasil B terjadi"). Umumnya tidak diikuti kalimat ajakan/perintah bila subjeknya sama.',
          exampleJp: '毎日練習すれば、上手になります。',
          exampleId: 'Jika berlatih setiap hari, akan menjadi mahir.',
        },
        {
          id: 'n4-nara',
          level: 'N4',
          lessonLabel: 'Bab 1 · Pengandaian',
          pattern: '〜なら',
          romaji: 'nara',
          meaning: 'Kalau soal ... / kalau memang ...',
          formula: 'Bentuk biasa / N + なら',
          nuance:
            'Menanggapi topik atau rencana yang baru disebutkan lawan bicara, lalu memberi saran atau informasi terkait.',
          exampleJp: '東京へ行くなら、新幹線が便利です。',
          exampleId: 'Kalau mau pergi ke Tokyo, Shinkansen praktis.',
        },
        {
          id: 'n4-to',
          level: 'N4',
          lessonLabel: 'Bab 1 · Pengandaian',
          pattern: '〜と',
          romaji: 'to',
          meaning: 'Begitu ... pasti otomatis ...',
          formula: 'V-kamus / V-ない + と',
          nuance:
            'Menyatakan hasil alami, hukum alam, arah jalan, atau kebiasaan otomatis. Tidak boleh diikuti permintaan, ajakan, atau keinginan.',
          exampleJp: 'このボタンを押すと、お湯が出ます。',
          exampleId: 'Kalau tombol ini ditekan, air panas akan keluar.',
        },
      ],
    },
    {
      id: 'n4-ageru-morau-kureru',
      label: 'Pemberi & Penerima (〜てあげる vs 〜てもらう vs 〜てくれる)',
      level: 'N4',
      levels: ['N4'],
      entries: [
        {
          id: 'n4-teageru',
          level: 'N4',
          lessonLabel: 'Bab 2 · Pemberi & Penerima',
          pattern: '〜てあげる',
          romaji: 'te ageru',
          meaning: 'Melakukan sesuatu untuk orang lain',
          formula: 'V-て + あげる',
          nuance:
            'Subjek (biasanya saya) memberi bantuan kepada orang lain. Hindari memakainya langsung ke atasan karena bisa terasa menggurui.',
          exampleJp: '妹に日本語を教えてあげました。',
          exampleId: 'Saya mengajari bahasa Jepang kepada adik perempuan saya.',
        },
        {
          id: 'n4-temorau',
          level: 'N4',
          lessonLabel: 'Bab 2 · Pemberi & Penerima',
          pattern: '〜てもらう',
          romaji: 'te morau',
          meaning: 'Menerima bantuan / dibantu oleh seseorang',
          formula: 'Orang + に + V-て + もらう',
          nuance:
            'Fokus pada penerima (saya) yang merasa terbantu atas permintaan atau kebaikan orang lain.',
          exampleJp: '友だちにレポートを見てもらいました。',
          exampleId: 'Saya meminta teman memeriksa laporan saya.',
        },
        {
          id: 'n4-tekureru',
          level: 'N4',
          lessonLabel: 'Bab 2 · Pemberi & Penerima',
          pattern: '〜てくれる',
          romaji: 'te kureru',
          meaning: 'Orang lain berbaik hati melakukan ... untuk saya',
          formula: 'Orang + が + V-て + くれる',
          nuance:
            'Fokus pada pelaku (orang lain) yang dengan sukarela membantu saya atau keluarga saya, dengan nuansa rasa terima kasih.',
          exampleJp: '先輩が駅まで送ってくれました。',
          exampleId: 'Senior mengantar saya sampai ke stasiun.',
        },
      ],
    },
    {
      id: 'n4-souda-youda',
      label: 'Kabar & Dugaan (〜そうだ kabarnya vs 〜そうだ kelihatannya vs 〜ようだ)',
      level: 'N4',
      levels: ['N4'],
      entries: [
        {
          id: 'n4-souda-hearsay',
          level: 'N4',
          lessonLabel: 'Bab 3 · Kabar & Dugaan',
          pattern: '〜そうだ（伝聞）',
          romaji: 'sou da (kabarnya)',
          meaning: 'Katanya / kabarnya ... (berdasarkan informasi orang lain)',
          formula: 'Bentuk biasa + そうだ',
          nuance:
            'Menyampaikan ulang informasi yang didengar dari berita, teman, atau sumber lain tanpa opini pribadi.',
          exampleJp: '天気予報によると、明日は雨が降るそうです。',
          exampleId: 'Menurut prakiraan cuaca, katanya besok akan turun hujan.',
        },
        {
          id: 'n4-souda-appearance',
          level: 'N4',
          lessonLabel: 'Bab 3 · Kabar & Dugaan',
          pattern: '〜そうだ（様態）',
          romaji: 'sou da (kelihatannya)',
          meaning: 'Kelihatannya ... / sepertinya akan ...',
          formula: 'V-ます stem / A-い (hapus い) + そうだ',
          nuance:
            'Kesan langsung dari penglihatan mata saat itu juga (belum dicoba atau belum terjadi).',
          exampleJp: 'このケーキはとてもおいしそうです。',
          exampleId: 'Kue ini kelihatannya sangat lezat.',
        },
        {
          id: 'n4-youda',
          level: 'N4',
          lessonLabel: 'Bab 3 · Kabar & Dugaan',
          pattern: '〜ようだ',
          romaji: 'you da',
          meaning: 'Sepertinya / tampaknya ... (dugaan dari bukti pancaindra)',
          formula: 'V-biasa / A-い / A-な / N-の + ようだ',
          nuance:
            'Dugaan subjektif setelah melihat petunjuk atau situasi sekitar (lebih beralasan dibanding tebakan kosong).',
          exampleJp: '外は寒いようです。みんなコートを着ています。',
          exampleId: 'Di luar sepertinya dingin. Semua orang memakai mantel.',
        },
      ],
    },
    {
      id: 'n4-youni-naru-suru',
      label: 'Perubahan & Usaha (〜ようになる vs 〜ようにする)',
      level: 'N4',
      levels: ['N4'],
      entries: [
        {
          id: 'n4-youninaru',
          level: 'N4',
          lessonLabel: 'Bab 4 · Perubahan & Usaha',
          pattern: '〜ようになる',
          romaji: 'you ni naru',
          meaning: 'Menjadi bisa / berubah menjadi terbiasa ...',
          formula: 'V-kamus / V-potensial / V-ない + ようになる',
          nuance:
            'Menekankan perubahan keadaan secara bertahap dari tidak bisa menjadi bisa, atau terbentuknya kebiasaan baru.',
          exampleJp: '漢字が少しずつ読めるようになりました。',
          exampleId: 'Saya sedikit demi sedikit menjadi bisa membaca kanji.',
        },
        {
          id: 'n4-younisuru',
          level: 'N4',
          lessonLabel: 'Bab 4 · Perubahan & Usaha',
          pattern: '〜ようにする',
          romaji: 'you ni suru',
          meaning: 'Berusaha agar selalu / membiasakan diri untuk ...',
          formula: 'V-kamus / V-ない + ようにする',
          nuance:
            'Menekankan usaha sadar dan niat pembicara untuk menjaga kebiasaan atau menghindari sesuatu.',
          exampleJp: '毎日水をたくさん飲むようにしています。',
          exampleId: 'Saya berusaha minum banyak air setiap hari.',
        },
      ],
    },
  ],
};

function cleanComparisonGroupLabel(item: BunpouN2Item): string {
  const full = item.lessonFullTitle.trim();
  if (full) return full;
  return `${item.lessonNumber}課`;
}

function formatEntryLessonLabel(item: BunpouN2Item): string {
  if (item.lessonFullTitle.startsWith('Ringkasan ')) {
    return item.lessonFullTitle.split('·')[0].trim();
  }
  if (item.lessonFullTitle.startsWith('Bab ')) {
    return item.lessonFullTitle.split('·')[0].trim();
  }
  if (item.lessonFullTitle.startsWith('Bag.')) {
    const match = item.lessonFullTitle.match(/^(Bag\.\d+\s*·\s*\d+課)/);
    if (match) return match[1];
  }
  return `${item.lessonNumber}課`;
}

function itemToComparisonEntry(
  item: BunpouN2Item,
  fallbackLevel: JlptLevel,
): BunpouComparisonEntry {
  const lvl = item.level ?? fallbackLevel;
  return {
    id: item.id,
    level: lvl,
    lessonLabel: formatEntryLessonLabel(item),
    pattern: item.pattern,
    romaji: item.romaji || undefined,
    register: item.register || undefined,
    meaning: item.meaning,
    formula: item.formula || undefined,
    nuance:
      item.note && item.note.trim().length > 0
        ? item.note.trim()
        : item.meaning,
    exampleJp: item.examples[0]?.jp ?? '',
    exampleId: item.examples[0]?.id ?? '',
  };
}

/**
 * Builds level-specific similar-pattern comparison groups directly from the
 * authentic Bunpou curriculum for all 5 levels (N5–N1). Falls back to curated
 * beginner comparisons only when N5/N4 items are not passed.
 */
export function buildBunpouComparisonGroups(
  level: JlptLevel,
  levelItems: BunpouN2Item[],
): BunpouComparisonGroup[] {
  if ((level === 'N5' || level === 'N4') && levelItems.length === 0) {
    return BEGINNER_BUNPOU_COMPARISONS[level];
  }

  const byLesson = new Map<
    number,
    { label: string; items: BunpouN2Item[] }
  >();

  for (const item of levelItems) {
    const existing = byLesson.get(item.lessonNumber);
    if (existing) {
      existing.items.push(item);
    } else {
      byLesson.set(item.lessonNumber, {
        label: cleanComparisonGroupLabel(item),
        items: [item],
      });
    }
  }

  return Array.from(byLesson.entries())
    .sort((a, b) => a[0] - b[0])
    .filter(([, group]) => group.items.length >= 2)
    .map(([lessonNumber, group]) => ({
      id: `${level.toLowerCase()}-lesson-${lessonNumber}`,
      label: group.label,
      level,
      levels: [level],
      entries: group.items.map((item) => itemToComparisonEntry(item, level)),
    }));
}

interface CrossLevelThemeDef {
  id: string;
  label: string;
  beginnerGroupIds?: string[];
  n5Lessons?: number[];
  n4Lessons?: number[];
  n3Lessons?: number[];
  n2Lessons?: number[];
  n1Lessons?: number[];
}

/**
 * Unified cross-level semantic themes mapping EVERY chapter across N5, N4, N3,
 * N2, and N1 into comparable meaning families so learners can compare similar
 * patterns across JLPT levels (e.g. N5 vs N4 vs N3 vs N2 vs N1) with explicit
 * level badges.
 */
const CROSS_LEVEL_THEMES: readonly CrossLevelThemeDef[] = [
  {
    id: 'cross-waktu',
    label: 'Waktu, Sedang Berlangsung & Segera Setelah',
    n5Lessons: [3, 7],
    n4Lessons: [2, 35],
    n3Lessons: [1, 28],
    n2Lessons: [1, 2, 3],
    n1Lessons: [1],
  },
  {
    id: 'cross-syarat',
    label: 'Syarat & Pengandaian (Kalau / Seandainya)',
    beginnerGroupIds: ['n4-pengandaian'],
    n4Lessons: [14, 15],
    n3Lessons: [6, 20],
    n2Lessons: [15],
    n1Lessons: [9],
  },
  {
    id: 'cross-pertentangan',
    label: 'Pertentangan & Syarat Berlawanan (Meskipun / Sekalipun)',
    n5Lessons: [8],
    n4Lessons: [16],
    n2Lessons: [14],
    n1Lessons: [8, 10],
  },
  {
    id: 'cross-sebab-alasan',
    label: 'Sebab, Alasan & Konjungsi (Karena / Oleh Sebab Itu)',
    n5Lessons: [11],
    n4Lessons: [9, 37],
    n3Lessons: [5],
    n2Lessons: [16, 17],
    n1Lessons: [12],
  },
  {
    id: 'cross-kabar-dugaan',
    label: 'Kabar, Dugaan & Tampilan (Katanya / Sepertinya)',
    beginnerGroupIds: ['n4-souda-youda'],
    n4Lessons: [8, 12, 19],
    n3Lessons: [7, 16],
    n2Lessons: [22],
    n1Lessons: [6],
  },
  {
    id: 'cross-pembatasan-penambahan',
    label: 'Pembatasan, Penambahan & Adverbia (Hanya / Tidak Hanya ... Juga)',
    n5Lessons: [10],
    n4Lessons: [11, 28, 29],
    n3Lessons: [18],
    n2Lessons: [5, 6],
    n1Lessons: [3],
  },
  {
    id: 'cross-rentang-batas',
    label: 'Awal, Akhir, Batas Rentang & Akhiran (Dari ... Hingga)',
    n5Lessons: [12],
    n3Lessons: [26],
    n2Lessons: [4],
    n1Lessons: [2],
  },
  {
    id: 'cross-keterkaitan-standar',
    label: 'Keterkaitan, Standar & Tanpa Memandang',
    n3Lessons: [2, 14],
    n2Lessons: [7, 8, 9, 11],
    n1Lessons: [5],
  },
  {
    id: 'cross-perbandingan-kontras',
    label: 'Perbandingan & Kontras (Lebih Dari / Berbeda Dengan)',
    n4Lessons: [1],
    n3Lessons: [3, 4],
    n1Lessons: [15],
  },
  {
    id: 'cross-penyangkalan',
    label: 'Penyangkalan Tegas & Tanpa Melakukan',
    n4Lessons: [32],
    n3Lessons: [8],
    n2Lessons: [12],
  },
  {
    id: 'cross-kemampuan-larangan',
    label: 'Bisa, Sulit, Izin, Kewajiban & Larangan',
    n5Lessons: [5],
    n4Lessons: [4, 6, 39],
    n3Lessons: [17],
    n2Lessons: [18],
    n1Lessons: [13],
  },
  {
    id: 'cross-topik-contoh-penekanan',
    label: 'Topik, Kutipan, Nominalisasi & Penekanan',
    beginnerGroupIds: ['n5-wa-ga'],
    n4Lessons: [17, 30, 31, 36],
    n3Lessons: [13, 25],
    n2Lessons: [10, 13, 21],
    n1Lessons: [4, 14, 17],
  },
  {
    id: 'cross-keinginan-saran-niat',
    label: 'Keinginan, Harapan, Ajakan, Niat & Saran',
    beginnerGroupIds: ['n5-tai-hoshii', 'n5-ajakan', 'n4-youni-naru-suru'],
    n5Lessons: [4, 6],
    n4Lessons: [3, 7, 13, 18],
    n3Lessons: [9, 10, 11, 19],
    n2Lessons: [24, 26],
  },
  {
    id: 'cross-perasaan-penilaian',
    label: 'Perasaan Kuat, Adverbia, Kesan & Penilaian',
    n4Lessons: [38],
    n2Lessons: [19, 23, 25],
    n1Lessons: [18, 19, 20],
  },
  {
    id: 'cross-hasil-tindakan',
    label: 'Hasil, Perubahan, Pengalaman & Keadaan Akhir',
    n4Lessons: [5, 20, 21, 22, 34],
    n2Lessons: [20],
    n1Lessons: [7, 16],
  },
  {
    id: 'cross-tujuan-pemberi-keigo',
    label: 'Salam, Tujuan, Pemberi-Penerima & Keigo',
    beginnerGroupIds: ['n4-ageru-morau-kureru'],
    n5Lessons: [1],
    n4Lessons: [10, 23],
    n3Lessons: [12],
    n1Lessons: [11],
  },
  {
    id: 'cross-partikel-struktur',
    label: 'Partikel Inti, Struktur Kalimat, Pasif & Kausatif',
    beginnerGroupIds: ['n5-ni-de'],
    n5Lessons: [2, 9],
    n4Lessons: [24, 25, 26, 27, 33, 40],
    n3Lessons: [15, 21, 22, 23, 24, 27],
  },
];

export interface CrossLevelComparisonInput {
  n5Items?: BunpouN2Item[];
  n4Items?: BunpouN2Item[];
  n3Items: BunpouN2Item[];
  n2Items: BunpouN2Item[];
  n1Items: BunpouN2Item[];
}

/**
 * Builds unified cross-level comparison groups covering ALL Bunpou across
 * JLPT N5, N4, N3, N2, and N1. Every entry carries its explicit JLPT level
 * so learners can compare similar grammar patterns across levels (e.g. N5 vs N4
 * or N3 vs N1).
 */
export function buildCrossLevelBunpouComparisonGroups(
  input: CrossLevelComparisonInput,
): BunpouComparisonGroup[] {
  const n5Items = input.n5Items ?? [];
  const n4Items = input.n4Items ?? [];
  const hasFullN5 = n5Items.length > 0;
  const hasFullN4 = n4Items.length > 0;

  const beginnerById = new Map<string, BunpouComparisonEntry[]>();
  if (!hasFullN5) {
    for (const grp of BEGINNER_BUNPOU_COMPARISONS.N5) {
      beginnerById.set(grp.id, grp.entries);
    }
  }
  if (!hasFullN4) {
    for (const grp of BEGINNER_BUNPOU_COMPARISONS.N4) {
      beginnerById.set(grp.id, grp.entries);
    }
  }

  const indexByLesson = (items: BunpouN2Item[], level: JlptLevel) => {
    const map = new Map<number, BunpouComparisonEntry[]>();
    for (const item of items) {
      const entry = itemToComparisonEntry(item, level);
      const list = map.get(item.lessonNumber);
      if (list) list.push(entry);
      else map.set(item.lessonNumber, [entry]);
    }
    return map;
  };

  const n5ByLesson = indexByLesson(n5Items, 'N5');
  const n4ByLesson = indexByLesson(n4Items, 'N4');
  const n3ByLesson = indexByLesson(input.n3Items, 'N3');
  const n2ByLesson = indexByLesson(input.n2Items, 'N2');
  const n1ByLesson = indexByLesson(input.n1Items, 'N1');

  const usedIds = new Set<string>();
  const groups: BunpouComparisonGroup[] = [];

  for (const theme of CROSS_LEVEL_THEMES) {
    const entries: BunpouComparisonEntry[] = [];

    for (const bid of theme.beginnerGroupIds ?? []) {
      for (const entry of beginnerById.get(bid) ?? []) {
        if (!usedIds.has(entry.id)) {
          usedIds.add(entry.id);
          entries.push(entry);
        }
      }
    }

    if (hasFullN5) {
      for (const lesson of theme.n5Lessons ?? []) {
        for (const entry of n5ByLesson.get(lesson) ?? []) {
          if (!usedIds.has(entry.id)) {
            usedIds.add(entry.id);
            entries.push(entry);
          }
        }
      }
    }

    if (hasFullN4) {
      for (const lesson of theme.n4Lessons ?? []) {
        for (const entry of n4ByLesson.get(lesson) ?? []) {
          if (!usedIds.has(entry.id)) {
            usedIds.add(entry.id);
            entries.push(entry);
          }
        }
      }
    }

    for (const lesson of theme.n3Lessons ?? []) {
      for (const entry of n3ByLesson.get(lesson) ?? []) {
        if (!usedIds.has(entry.id)) {
          usedIds.add(entry.id);
          entries.push(entry);
        }
      }
    }

    for (const lesson of theme.n2Lessons ?? []) {
      for (const entry of n2ByLesson.get(lesson) ?? []) {
        if (!usedIds.has(entry.id)) {
          usedIds.add(entry.id);
          entries.push(entry);
        }
      }
    }

    for (const lesson of theme.n1Lessons ?? []) {
      for (const entry of n1ByLesson.get(lesson) ?? []) {
        if (!usedIds.has(entry.id)) {
          usedIds.add(entry.id);
          entries.push(entry);
        }
      }
    }

    if (entries.length >= 2) {
      const levels = Array.from(new Set(entries.map((e) => e.level))).sort(
        (a, b) => LEVEL_SORT_ORDER[a] - LEVEL_SORT_ORDER[b],
      );
      groups.push({
        id: theme.id,
        label: theme.label,
        level: levels.length === 1 ? levels[0] : 'ALL',
        levels,
        entries,
      });
    }
  }

  // Safety fallback: include any unmapped future items so 100% of items are always comparable
  const leftover: BunpouComparisonEntry[] = [];
  for (const [lvl, items] of [
    ['N5', n5Items],
    ['N4', n4Items],
    ['N3', input.n3Items],
    ['N2', input.n2Items],
    ['N1', input.n1Items],
  ] as const) {
    for (const item of items) {
      if (!usedIds.has(item.id)) {
        usedIds.add(item.id);
        leftover.push(itemToComparisonEntry(item, lvl));
      }
    }
  }

  if (leftover.length >= 2) {
    const levels = Array.from(new Set(leftover.map((e) => e.level))).sort(
      (a, b) => LEVEL_SORT_ORDER[a] - LEVEL_SORT_ORDER[b],
    );
    groups.push({
      id: 'cross-lainnya',
      label: 'Pola Tambahan Lintas Level',
      level: levels.length === 1 ? levels[0] : 'ALL',
      levels,
      entries: leftover,
    });
  }

  return groups;
}
