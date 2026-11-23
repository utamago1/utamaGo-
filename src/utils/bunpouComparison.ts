import type { JlptLevel } from '../data/utamagoContent';
import { formatBunpouExplanation } from './bunpouExplanationFormatter';
import type { BunpouN2Item } from './bunpouN2Parser';
import {
  BUNPOU_TAXONOMY_TOPICS,
  getSimilarPatternIds,
  type BunpouCategoryType,
} from './bunpouTaxonomy';

export type ComparisonFilterLevel = 'ALL' | JlptLevel;

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
  topicId: string;
  subClusterId: string;
  subClusterLabel: string;
  categoryType: BunpouCategoryType;
  similarPatterns: string[];
}

export interface BunpouSubClusterSummary {
  id: string;
  label: string;
  description: string;
  entryCount: number;
}

export interface BunpouComparisonGroup {
  id: string;
  label: string;
  categoryType: BunpouCategoryType;
  level: JlptLevel | 'ALL';
  levels: JlptLevel[];
  levelCounts: Record<JlptLevel, number>;
  subClusters: BunpouSubClusterSummary[];
  entries: BunpouComparisonEntry[];
}

export interface TopicLevelAvailability {
  level: JlptLevel;
  count: number;
  /** True only when at least 1 valid pattern exists in this topic for this level */
  isAvailable: boolean;
  /** True only when >= 2 valid patterns exist so a standalone same-level A vs B pair is possible */
  canFilterStandalone: boolean;
}

export type ComparisonRelevanceTier =
  | 'direct_similar'
  | 'same_sub_cluster'
  | 'other_sub_cluster';

export interface RankedComparisonOption {
  entry: BunpouComparisonEntry;
  tier: ComparisonRelevanceTier;
  score: number;
}

const ALL_JLPT_LEVELS_ASC: readonly JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

const LEVEL_SORT_ORDER: Record<JlptLevel, number> = {
  N5: 1,
  N4: 2,
  N3: 3,
  N2: 4,
  N1: 5,
};

function makeEmptyLevelCounts(): Record<JlptLevel, number> {
  return { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
}

function makeFallbackEntry(
  raw: Omit<
    BunpouComparisonEntry,
    'topicId' | 'subClusterId' | 'subClusterLabel' | 'categoryType' | 'similarPatterns'
  >,
  meta: {
    topicId: string;
    subClusterId: string;
    subClusterLabel: string;
    categoryType: BunpouCategoryType;
    similarPatterns?: string[];
  },
): BunpouComparisonEntry {
  return {
    ...raw,
    nuance: formatBunpouExplanation(raw.nuance),
    topicId: meta.topicId,
    subClusterId: meta.subClusterId,
    subClusterLabel: meta.subClusterLabel,
    categoryType: meta.categoryType,
    similarPatterns: meta.similarPatterns ?? [],
  };
}

export const BEGINNER_BUNPOU_COMPARISONS: Record<
  'N5' | 'N4',
  BunpouComparisonGroup[]
> = {
  N5: [
    {
      id: 'n5-wa-ga',
      label: 'Partikel Subjek & Topik (は vs が)',
      categoryType: 'structural_base',
      level: 'N5',
      levels: ['N5'],
      levelCounts: { N5: 2, N4: 0, N3: 0, N2: 0, N1: 0 },
      subClusters: [
        {
          id: 'dasar-partikel-tunjuk',
          label: 'Partikel Inti & Kata Tunjuk',
          description: 'Fungsi partikel inti dalam kalimat dasar.',
          entryCount: 2,
        },
      ],
      entries: [
        makeFallbackEntry(
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
            topicId: 'bentuk-dasar-konjugasi',
            subClusterId: 'dasar-partikel-tunjuk',
            subClusterLabel: 'Partikel Inti & Kata Tunjuk',
            categoryType: 'structural_base',
            similarPatterns: ['n5-ga'],
          },
        ),
        makeFallbackEntry(
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
          {
            topicId: 'bentuk-dasar-konjugasi',
            subClusterId: 'dasar-partikel-tunjuk',
            subClusterLabel: 'Partikel Inti & Kata Tunjuk',
            categoryType: 'structural_base',
            similarPatterns: ['n5-wa'],
          },
        ),
      ],
    },
    {
      id: 'n5-ni-de',
      label: 'Partikel Tempat (に vs で)',
      categoryType: 'structural_base',
      level: 'N5',
      levels: ['N5'],
      levelCounts: { N5: 2, N4: 0, N3: 0, N2: 0, N1: 0 },
      subClusters: [
        {
          id: 'dasar-partikel-tunjuk',
          label: 'Partikel Inti & Kata Tunjuk',
          description: 'Fungsi partikel tempat dasar.',
          entryCount: 2,
        },
      ],
      entries: [
        makeFallbackEntry(
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
            topicId: 'bentuk-dasar-konjugasi',
            subClusterId: 'dasar-partikel-tunjuk',
            subClusterLabel: 'Partikel Inti & Kata Tunjuk',
            categoryType: 'structural_base',
            similarPatterns: ['n5-de'],
          },
        ),
        makeFallbackEntry(
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
          {
            topicId: 'bentuk-dasar-konjugasi',
            subClusterId: 'dasar-partikel-tunjuk',
            subClusterLabel: 'Partikel Inti & Kata Tunjuk',
            categoryType: 'structural_base',
            similarPatterns: ['n5-ni'],
          },
        ),
      ],
    },
    {
      id: 'n5-tai-hoshii',
      label: 'Keinginan (〜たい vs 〜ほしい)',
      categoryType: 'semantic',
      level: 'N5',
      levels: ['N5'],
      levelCounts: { N5: 2, N4: 0, N3: 0, N2: 0, N1: 0 },
      subClusters: [
        {
          id: 'keinginan-harapan',
          label: 'Keinginan & Harapan',
          description: 'Keinginan melakukan tindakan vs memiliki benda.',
          entryCount: 2,
        },
      ],
      entries: [
        makeFallbackEntry(
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
            topicId: 'keinginan-niat-saran',
            subClusterId: 'keinginan-harapan',
            subClusterLabel: 'Keinginan & Harapan',
            categoryType: 'semantic',
            similarPatterns: ['n5-hoshii'],
          },
        ),
        makeFallbackEntry(
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
          {
            topicId: 'keinginan-niat-saran',
            subClusterId: 'keinginan-harapan',
            subClusterLabel: 'Keinginan & Harapan',
            categoryType: 'semantic',
            similarPatterns: ['n5-tai'],
          },
        ),
      ],
    },
    {
      id: 'n5-ajakan',
      label: 'Permintaan & Ajakan (〜てください vs 〜ませんか vs 〜ましょう)',
      categoryType: 'semantic',
      level: 'N5',
      levels: ['N5'],
      levelCounts: { N5: 3, N4: 0, N3: 0, N2: 0, N1: 0 },
      subClusters: [
        {
          id: 'ajakan-permintaan-saran',
          label: 'Ajakan, Permintaan & Saran',
          description: 'Permintaan sopan dan ajakan.',
          entryCount: 3,
        },
      ],
      entries: [
        makeFallbackEntry(
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
            topicId: 'keinginan-niat-saran',
            subClusterId: 'ajakan-permintaan-saran',
            subClusterLabel: 'Ajakan, Permintaan & Saran',
            categoryType: 'semantic',
            similarPatterns: ['n5-masenka', 'n5-mashou'],
          },
        ),
        makeFallbackEntry(
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
            topicId: 'keinginan-niat-saran',
            subClusterId: 'ajakan-permintaan-saran',
            subClusterLabel: 'Ajakan, Permintaan & Saran',
            categoryType: 'semantic',
            similarPatterns: ['n5-mashou'],
          },
        ),
        makeFallbackEntry(
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
          {
            topicId: 'keinginan-niat-saran',
            subClusterId: 'ajakan-permintaan-saran',
            subClusterLabel: 'Ajakan, Permintaan & Saran',
            categoryType: 'semantic',
            similarPatterns: ['n5-masenka'],
          },
        ),
      ],
    },
  ],
  N4: [
    {
      id: 'n4-pengandaian',
      label: 'Pengandaian (〜たら vs 〜ば vs 〜なら vs 〜と)',
      categoryType: 'semantic',
      level: 'N4',
      levels: ['N4'],
      levelCounts: { N5: 0, N4: 4, N3: 0, N2: 0, N1: 0 },
      subClusters: [
        {
          id: 'syarat-umum-pengandaian',
          label: 'Syarat Umum & Pengandaian Hipotetis',
          description: 'Empat bentuk pengandaian inti JLPT N4.',
          entryCount: 4,
        },
      ],
      entries: [
        makeFallbackEntry(
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
            topicId: 'pengandaian-syarat',
            subClusterId: 'syarat-umum-pengandaian',
            subClusterLabel: 'Syarat Umum & Pengandaian Hipotetis',
            categoryType: 'semantic',
            similarPatterns: ['n4-ba', 'n4-nara', 'n4-to'],
          },
        ),
        makeFallbackEntry(
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
            topicId: 'pengandaian-syarat',
            subClusterId: 'syarat-umum-pengandaian',
            subClusterLabel: 'Syarat Umum & Pengandaian Hipotetis',
            categoryType: 'semantic',
            similarPatterns: ['n4-tara', 'n4-nara', 'n4-to'],
          },
        ),
        makeFallbackEntry(
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
            topicId: 'pengandaian-syarat',
            subClusterId: 'syarat-umum-pengandaian',
            subClusterLabel: 'Syarat Umum & Pengandaian Hipotetis',
            categoryType: 'semantic',
            similarPatterns: ['n4-tara', 'n4-ba'],
          },
        ),
        makeFallbackEntry(
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
          {
            topicId: 'pengandaian-syarat',
            subClusterId: 'syarat-umum-pengandaian',
            subClusterLabel: 'Syarat Umum & Pengandaian Hipotetis',
            categoryType: 'semantic',
            similarPatterns: ['n4-tara', 'n4-ba'],
          },
        ),
      ],
    },
    {
      id: 'n4-ageru-morau-kureru',
      label: 'Pemberi & Penerima (〜てあげる vs 〜てもらう vs 〜てくれる)',
      categoryType: 'semantic',
      level: 'N4',
      levels: ['N4'],
      levelCounts: { N5: 0, N4: 3, N3: 0, N2: 0, N1: 0 },
      subClusters: [
        {
          id: 'pemberi-penerima',
          label: 'Memberi & Menerima Bantuan',
          description: 'Arah pemberian bantuan.',
          entryCount: 3,
        },
      ],
      entries: [
        makeFallbackEntry(
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
            topicId: 'pemberi-keigo',
            subClusterId: 'pemberi-penerima',
            subClusterLabel: 'Memberi & Menerima Bantuan',
            categoryType: 'semantic',
            similarPatterns: ['n4-temorau', 'n4-tekureru'],
          },
        ),
        makeFallbackEntry(
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
            topicId: 'pemberi-keigo',
            subClusterId: 'pemberi-penerima',
            subClusterLabel: 'Memberi & Menerima Bantuan',
            categoryType: 'semantic',
            similarPatterns: ['n4-teageru', 'n4-tekureru'],
          },
        ),
        makeFallbackEntry(
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
          {
            topicId: 'pemberi-keigo',
            subClusterId: 'pemberi-penerima',
            subClusterLabel: 'Memberi & Menerima Bantuan',
            categoryType: 'semantic',
            similarPatterns: ['n4-teageru', 'n4-temorau'],
          },
        ),
      ],
    },
    {
      id: 'n4-souda-youda',
      label: 'Kabar & Dugaan (〜そうだ kabarnya vs 〜そうだ kelihatannya vs 〜ようだ)',
      categoryType: 'semantic',
      level: 'N4',
      levels: ['N4'],
      levelCounts: { N5: 0, N4: 3, N3: 0, N2: 0, N1: 0 },
      subClusters: [
        {
          id: 'dugaan-tampilan-kesan',
          label: 'Tampilan Visual & Kesan',
          description: 'Kabar vs tampilan visual vs dugaan pancaindra.',
          entryCount: 3,
        },
      ],
      entries: [
        makeFallbackEntry(
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
            topicId: 'kabar-dugaan',
            subClusterId: 'dugaan-kabar-berita',
            subClusterLabel: 'Kabar & Informasi dari Orang Lain',
            categoryType: 'semantic',
            similarPatterns: ['n4-souda-appearance', 'n4-youda'],
          },
        ),
        makeFallbackEntry(
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
            topicId: 'kabar-dugaan',
            subClusterId: 'dugaan-tampilan-kesan',
            subClusterLabel: 'Tampilan Visual & Kesan',
            categoryType: 'semantic',
            similarPatterns: ['n4-souda-hearsay', 'n4-youda'],
          },
        ),
        makeFallbackEntry(
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
          {
            topicId: 'kabar-dugaan',
            subClusterId: 'dugaan-tampilan-kesan',
            subClusterLabel: 'Tampilan Visual & Kesan',
            categoryType: 'semantic',
            similarPatterns: ['n4-souda-appearance', 'n4-souda-hearsay'],
          },
        ),
      ],
    },
    {
      id: 'n4-youni-naru-suru',
      label: 'Perubahan & Usaha (〜ようになる vs 〜ようにする)',
      categoryType: 'semantic',
      level: 'N4',
      levels: ['N4'],
      levelCounts: { N5: 0, N4: 2, N3: 0, N2: 0, N1: 0 },
      subClusters: [
        {
          id: 'niat-keputusan-pembiasaan',
          label: 'Niat, Keputusan & Usaha Pembiasaan',
          description: 'Perubahan bertahap vs usaha pembiasaan.',
          entryCount: 2,
        },
      ],
      entries: [
        makeFallbackEntry(
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
            topicId: 'keinginan-niat-saran',
            subClusterId: 'niat-keputusan-pembiasaan',
            subClusterLabel: 'Niat, Keputusan & Usaha Pembiasaan',
            categoryType: 'semantic',
            similarPatterns: ['n4-younisuru'],
          },
        ),
        makeFallbackEntry(
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
          {
            topicId: 'keinginan-niat-saran',
            subClusterId: 'niat-keputusan-pembiasaan',
            subClusterLabel: 'Niat, Keputusan & Usaha Pembiasaan',
            categoryType: 'semantic',
            similarPatterns: ['n4-youninaru'],
          },
        ),
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
  taxonomyMeta?: {
    topicId: string;
    subClusterId: string;
    subClusterLabel: string;
    categoryType: BunpouCategoryType;
  },
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
        ? formatBunpouExplanation(item.note.trim())
        : item.meaning,
    exampleJp: item.examples[0]?.jp ?? '',
    exampleId: item.examples[0]?.id ?? '',
    topicId: taxonomyMeta?.topicId ?? `${lvl.toLowerCase()}-lesson-${item.lessonNumber}`,
    subClusterId: taxonomyMeta?.subClusterId ?? `${lvl.toLowerCase()}-lesson-${item.lessonNumber}`,
    subClusterLabel: taxonomyMeta?.subClusterLabel ?? cleanComparisonGroupLabel(item),
    categoryType: taxonomyMeta?.categoryType ?? 'semantic',
    similarPatterns: getSimilarPatternIds(item.id),
  };
}

/**
 * Builds level-specific similar-pattern comparison groups directly from the
 * authentic Bunpou curriculum for all 5 levels (N5–N1).
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
    .map(([lessonNumber, group]) => {
      const levelCounts = makeEmptyLevelCounts();
      levelCounts[level] = group.items.length;
      const clusterId = `${level.toLowerCase()}-lesson-${lessonNumber}`;
      return {
        id: clusterId,
        label: group.label,
        categoryType: 'semantic',
        level,
        levels: [level],
        levelCounts,
        subClusters: [
          {
            id: clusterId,
            label: group.label,
            description: group.label,
            entryCount: group.items.length,
          },
        ],
        entries: group.items.map((item) => itemToComparisonEntry(item, level)),
      };
    });
}

export interface CrossLevelComparisonInput {
  n5Items?: BunpouN2Item[];
  n4Items?: BunpouN2Item[];
  n3Items: BunpouN2Item[];
  n2Items: BunpouN2Item[];
  n1Items: BunpouN2Item[];
}

/**
 * Builds unified, linguistically audited 2-tier cross-level comparison groups
 * (Topik Utama -> Sub-Cluster Nuansa) covering all JLPT N5–N1 patterns.
 *
 * Guarantees:
 * - Zero blind keyword matching or whole-chapter dumping.
 * - Structural/morphological base patterns (e.g. N5 Futsuukei) are strictly
 *   isolated in `bentuk-dasar-konjugasi` and NEVER pollute semantic topics.
 * - `levels` and `levelCounts` reflect ONLY levels with >= 1 valid pattern.
 */
export function buildCrossLevelBunpouComparisonGroups(
  input: CrossLevelComparisonInput,
): BunpouComparisonGroup[] {
  const n5Items = input.n5Items ?? [];
  const n4Items = input.n4Items ?? [];
  const hasFullN5 = n5Items.length > 0;
  const hasFullN4 = n4Items.length > 0;

  // Index all source items by canonical ID
  const itemById = new Map<string, { item: BunpouN2Item; level: JlptLevel }>();
  const registerItems = (items: BunpouN2Item[], level: JlptLevel) => {
    for (const item of items) {
      itemById.set(item.id, { item, level });
    }
  };
  registerItems(n5Items, 'N5');
  registerItems(n4Items, 'N4');
  registerItems(input.n3Items, 'N3');
  registerItems(input.n2Items, 'N2');
  registerItems(input.n1Items, 'N1');

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

  const usedIds = new Set<string>();
  const groups: BunpouComparisonGroup[] = [];

  for (const topic of BUNPOU_TAXONOMY_TOPICS) {
    const entries: BunpouComparisonEntry[] = [];
    const subClusters: BunpouSubClusterSummary[] = [];

    // Curated fallback beginner entries only when full N5/N4 decks are absent
    for (const bid of topic.beginnerGroupIds ?? []) {
      for (const fallbackEntry of beginnerById.get(bid) ?? []) {
        if (!usedIds.has(fallbackEntry.id)) {
          usedIds.add(fallbackEntry.id);
          entries.push({
            ...fallbackEntry,
            topicId: topic.id,
            categoryType: topic.categoryType,
          });
        }
      }
    }

    for (const cluster of topic.subClusters) {
      let clusterCount = 0;
      for (const patternId of cluster.patternIds) {
        const found = itemById.get(patternId);
        if (!found || usedIds.has(patternId)) continue;
        usedIds.add(patternId);
        entries.push(
          itemToComparisonEntry(found.item, found.level, {
            topicId: topic.id,
            subClusterId: cluster.id,
            subClusterLabel: cluster.label,
            categoryType: topic.categoryType,
          }),
        );
        clusterCount += 1;
      }
      if (clusterCount > 0) {
        subClusters.push({
          id: cluster.id,
          label: cluster.label,
          description: cluster.description,
          entryCount: clusterCount,
        });
      }
    }

    if (entries.length >= 2) {
      // Keep canonical ascending JLPT order (N5 -> N1) while preserving cluster affinity
      const levelCounts = makeEmptyLevelCounts();
      for (const e of entries) {
        levelCounts[e.level] += 1;
      }
      const levels = ALL_JLPT_LEVELS_ASC.filter((lvl) => levelCounts[lvl] > 0);
      const validIdsInDataset = new Set(itemById.keys());
      for (const e of entries) {
        validIdsInDataset.add(e.id);
      }

      // Filter similarPatterns to only IDs present in this loaded dataset
      const cleanEntries = entries.map((e) => ({
        ...e,
        similarPatterns: e.similarPatterns.filter(
          (peerId) => peerId !== e.id && validIdsInDataset.has(peerId),
        ),
      }));

      groups.push({
        id: topic.id,
        label: topic.label,
        categoryType: topic.categoryType,
        level: levels.length === 1 ? levels[0] : 'ALL',
        levels,
        levelCounts,
        subClusters,
        entries: cleanEntries,
      });
    }
  }

  return groups;
}

/**
 * Dynamic Level Filtering (Rule #2):
 * Validates which JLPT levels (N5–N1) actually contain valid patterns in a topic.
 * Never forces empty levels (count === 0) to appear active.
 */
export function getTopicLevelAvailability(
  group: BunpouComparisonGroup | null,
): TopicLevelAvailability[] {
  return ALL_JLPT_LEVELS_ASC.map((level) => {
    const count = group ? (group.levelCounts[level] ?? 0) : 0;
    return {
      level,
      count,
      isAvailable: count > 0,
      canFilterStandalone: count >= 2,
    };
  });
}

/**
 * Filters a topic's entries for a selected level mode ('ALL' or 'N5'..'N1').
 */
export function getEntriesForFilterLevel(
  group: BunpouComparisonGroup | null,
  filterLevel: ComparisonFilterLevel,
): BunpouComparisonEntry[] {
  if (!group) return [];
  if (filterLevel === 'ALL') return group.entries;
  return group.entries.filter((entry) => entry.level === filterLevel);
}

/**
 * Computes semantic closeness score between Pola A and candidate Pola B.
 * Higher score = more pedagogically relevant comparison partner.
 */
function scoreComparisonPair(
  a: BunpouComparisonEntry,
  b: BunpouComparisonEntry,
  mode: ComparisonFilterLevel,
): { tier: ComparisonRelevanceTier; score: number } {
  const isDirectSimilar =
    a.similarPatterns.includes(b.id) || b.similarPatterns.includes(a.id);
  const isSameSubCluster = a.subClusterId === b.subClusterId;
  const levelDiff = Math.abs(
    LEVEL_SORT_ORDER[a.level] - LEVEL_SORT_ORDER[b.level],
  );

  let tier: ComparisonRelevanceTier = 'other_sub_cluster';
  let score = 0;

  if (isDirectSimilar) {
    tier = 'direct_similar';
    score += 1000;
  } else if (isSameSubCluster) {
    tier = 'same_sub_cluster';
    score += 500;
  }

  // Bonus if both direct similar AND same sub-cluster
  if (isDirectSimilar && isSameSubCluster) {
    score += 150;
  }

  if (mode === 'ALL') {
    // Rule #4.2: In "Semua Level", strongly prefer different levels with adjacent gap (e.g. N4 vs N3, N3 vs N2)
    if (levelDiff === 1) {
      score += 220;
      // Gentle priority for N4↔N3 or N3↔N2 as clear mid-tier entry pairs
      const minLvl = Math.min(
        LEVEL_SORT_ORDER[a.level],
        LEVEL_SORT_ORDER[b.level],
      );
      if (minLvl === 2 || minLvl === 3) {
        score += 40;
      }
    } else if (levelDiff === 2) {
      score += 160;
    } else if (levelDiff > 0) {
      score += 100;
    } else {
      // Same level in ALL mode ranks below cross-level pairs
      score += 20;
    }
  } else {
    // Rule #4.3: In specific level mode (e.g. N2), same-subcluster + direct similar wins
    if (isSameSubCluster) score += 120;
  }

  return { tier, score };
}

/**
 * Default (Pola A, Pola B) Pairing Algorithm (Rule #3 & Rule #4):
 * 1. Strictly enforces anti-duplicate (`polaA.id !== polaB.id`).
 * 2. In 'ALL' mode: selects two patterns from DIFFERENT levels (`A.level !== B.level`)
 *    within the SAME `subClusterId` (or direct `similarPatterns`), prioritizing
 *    adjacent levels (e.g. N4 vs N3 or N3 vs N2).
 * 3. In specific level mode (e.g. 'N2'): selects two distinct patterns in that level
 *    with the highest semantic closeness (`same sub_cluster` / `similar_patterns`).
 */
export function selectDefaultComparisonPair(
  entries: readonly BunpouComparisonEntry[],
  filterLevel: ComparisonFilterLevel,
): [BunpouComparisonEntry, BunpouComparisonEntry] | null {
  const pool =
    filterLevel === 'ALL'
      ? entries
      : entries.filter((entry) => entry.level === filterLevel);

  if (pool.length < 2) return null;

  let bestPair: [BunpouComparisonEntry, BunpouComparisonEntry] | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < pool.length; i += 1) {
    const a = pool[i];
    for (let j = i + 1; j < pool.length; j += 1) {
      const b = pool[j];
      if (a.id === b.id) continue;

      const { score } = scoreComparisonPair(a, b, filterLevel);
      // Enforce strict cross-level bonus in ALL mode so different levels always beat same-level
      const crossLevelBoost =
        filterLevel === 'ALL' && a.level !== b.level ? 2000 : 0;
      // Golden rule boost: same sub-cluster or direct similar ALWAYS beats cross-cluster
      const clusterRuleBoost =
        a.subClusterId === b.subClusterId ||
        a.similarPatterns.includes(b.id) ||
        b.similarPatterns.includes(a.id)
          ? 5000
          : 0;

      const totalScore = clusterRuleBoost + crossLevelBoost + score;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        // Order lower JLPT level on left (Pola A) and higher JLPT level on right (Pola B)
        bestPair =
          LEVEL_SORT_ORDER[a.level] <= LEVEL_SORT_ORDER[b.level]
            ? [a, b]
            : [b, a];
      }
    }
  }

  return bestPair;
}

/**
 * Dropdown B Relevance Sorter (Rule #4.4):
 * Excludes `leftEntry.id` (strict anti-duplicate) and sorts all candidate Pola B
 * options so the closest semantic / confusable patterns always appear at the top.
 */
export function sortComparisonOptionsForPartner(
  entries: readonly BunpouComparisonEntry[],
  leftEntry: BunpouComparisonEntry | null,
  filterLevel: ComparisonFilterLevel,
): RankedComparisonOption[] {
  const pool =
    filterLevel === 'ALL'
      ? entries
      : entries.filter((entry) => entry.level === filterLevel);

  if (!leftEntry) {
    return pool.map((entry) => ({
      entry,
      tier: 'other_sub_cluster',
      score: 0,
    }));
  }

  return pool
    .filter((candidate) => candidate.id !== leftEntry.id)
    .map((candidate) => {
      const { tier, score } = scoreComparisonPair(
        leftEntry,
        candidate,
        filterLevel,
      );
      return { entry: candidate, tier, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const lvlDiff =
        LEVEL_SORT_ORDER[a.entry.level] - LEVEL_SORT_ORDER[b.entry.level];
      if (lvlDiff !== 0) return lvlDiff;
      return a.entry.id.localeCompare(b.entry.id);
    });
}

/**
 * Resolves the optimal Pola B ID when the user picks a new Pola A.
 * Preserves current Pola B if it is still distinct AND semantically aligned
 * (same sub-cluster or direct confusable); otherwise picks the #1 most relevant
 * partner from `sortComparisonOptionsForPartner`.
 */
export function resolvePartnerIdOnLeftChange(
  entries: readonly BunpouComparisonEntry[],
  nextLeftEntry: BunpouComparisonEntry,
  currentRightId: string | null,
  filterLevel: ComparisonFilterLevel,
): string | null {
  const ranked = sortComparisonOptionsForPartner(
    entries,
    nextLeftEntry,
    filterLevel,
  );
  if (ranked.length === 0) return null;

  if (currentRightId && currentRightId !== nextLeftEntry.id) {
    const existing = ranked.find((opt) => opt.entry.id === currentRightId);
    if (
      existing &&
      (existing.tier === 'direct_similar' ||
        existing.tier === 'same_sub_cluster')
    ) {
      return existing.entry.id;
    }
  }

  return ranked[0].entry.id;
}
