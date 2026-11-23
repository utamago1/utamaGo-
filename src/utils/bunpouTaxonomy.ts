import type { JlptLevel } from '../data/utamagoContent';
import type { BunpouN2Item } from './bunpouN2Parser';

export type BunpouCategoryType = 'semantic' | 'structural_base';

export type BunpouTopicId =
  | 'sebab-akibat'
  | 'pertentangan'
  | 'pengandaian-syarat'
  | 'waktu-bersamaan'
  | 'kabar-dugaan'
  | 'pembatasan-penambahan'
  | 'perbandingan-kontras'
  | 'keterkaitan-standar'
  | 'kemampuan-kewajiban-larangan'
  | 'penyangkalan'
  | 'keinginan-niat-saran'
  | 'tujuan-sarana'
  | 'perasaan-penilaian'
  | 'hasil-perubahan-keadaan'
  | 'rentang-batas'
  | 'topik-contoh-kutipan'
  | 'pemberi-keigo'
  | 'bentuk-dasar-konjugasi';

export interface BunpouSubClusterDef {
  id: string;
  label: string;
  description: string;
  patternIds: readonly string[];
}

export interface BunpouTopicDef {
  id: BunpouTopicId;
  label: string;
  categoryType: BunpouCategoryType;
  beginnerGroupIds?: readonly string[];
  subClusters: readonly BunpouSubClusterDef[];
}

export interface PatternTaxonomyAssignment {
  topicId: BunpouTopicId;
  topicLabel: string;
  subClusterId: string;
  subClusterLabel: string;
  categoryType: BunpouCategoryType;
  similarPatterns: string[];
}

export interface TaxonomyAuditIssue {
  code:
    | 'ERROR_MORPHOLOGY_IN_SEMANTIC_TOPIC'
    | 'ERROR_PHANTOM_LEVEL'
    | 'ERROR_DUPLICATE_ID'
    | 'ERROR_INVALID_RELATION'
    | 'ERROR_UNCLASSIFIED_PATTERN'
    | 'WARN_ORPHAN_SUBCLUSTER';
  severity: 'error' | 'warning';
  topicId: string;
  patternId?: string;
  message: string;
}

export interface TaxonomyAuditReport {
  totalPatterns: number;
  semanticPatterns: number;
  structuralBasePatterns: number;
  errorCount: number;
  warningCount: number;
  issues: TaxonomyAuditIssue[];
}

/**
 * JSON Schema (Draft 2020-12) for validated Bunpou comparison pattern records.
 * Enforces strict separation between semantic topics and structural/morphological
 * base categories, 2-tier sub-cluster membership, and explicit confusable links.
 */
export const BUNPOU_COMPARISON_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://utamago.app/schemas/bunpou-comparison-taxonomy.schema.json',
  title: 'UtamaGo Bunpou Cross-Level Comparison Pattern',
  type: 'object',
  required: [
    'id',
    'level',
    'pattern',
    'meaning',
    'topic_id',
    'sub_cluster_id',
    'category_type',
    'similar_patterns',
  ],
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
      pattern: '^n[1-5]-bunpou-[A-Za-z0-9-]+$',
      description: 'Unique canonical pattern identifier across JLPT N5–N1.',
    },
    level: {
      type: 'string',
      enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    },
    pattern: {
      type: 'string',
      minLength: 1,
    },
    romaji: {
      type: 'string',
    },
    register: {
      type: 'string',
    },
    meaning: {
      type: 'string',
      minLength: 1,
    },
    formula: {
      type: 'string',
    },
    nuance: {
      type: 'string',
      minLength: 1,
    },
    topic_id: {
      type: 'string',
      enum: [
        'sebab-akibat',
        'pertentangan',
        'pengandaian-syarat',
        'waktu-bersamaan',
        'kabar-dugaan',
        'pembatasan-penambahan',
        'perbandingan-kontras',
        'keterkaitan-standar',
        'kemampuan-kewajiban-larangan',
        'penyangkalan',
        'keinginan-niat-saran',
        'tujuan-sarana',
        'perasaan-penilaian',
        'hasil-perubahan-keadaan',
        'rentang-batas',
        'topik-contoh-kutipan',
        'pemberi-keigo',
        'bentuk-dasar-konjugasi',
      ],
    },
    sub_cluster_id: {
      type: 'string',
      minLength: 3,
      description:
        'Strict semantic sub-cluster enforcing apples-to-apples pairing inside a topic.',
    },
    category_type: {
      type: 'string',
      enum: ['semantic', 'structural_base'],
      description:
        'Structural/morphological forms (e.g., Futsuukei, Te-form, basic particles) MUST use structural_base and NEVER enter semantic topics.',
    },
    similar_patterns: {
      type: 'array',
      uniqueItems: true,
      items: {
        type: 'string',
        pattern: '^n[1-5]-bunpou-[A-Za-z0-9-]+$',
      },
      description:
        'Direct confusable_with pattern IDs (same or adjacent JLPT levels) prioritized at top of Dropdown B.',
    },
    examples: {
      type: 'array',
      items: {
        type: 'object',
        required: ['jp', 'id'],
        properties: {
          jp: { type: 'string' },
          id: { type: 'string' },
        },
      },
    },
  },
  allOf: [
    {
      if: { properties: { category_type: { const: 'structural_base' } } },
      then: {
        properties: { topic_id: { const: 'bentuk-dasar-konjugasi' } },
      },
    },
    {
      if: { properties: { topic_id: { const: 'bentuk-dasar-konjugasi' } } },
      then: {
        properties: { category_type: { const: 'structural_base' } },
      },
    },
  ],
} as const;

/**
 * 2-tier linguistic taxonomy: Topik Utama -> Sub-Cluster Nuansa.
 * Every single one of the 553 authentic JLPT N5–N1 patterns is classified
 * strictly by Core Syntactic & Semantic Function (never blind keyword matching
 * or whole-chapter dumping).
 */
export const BUNPOU_TAXONOMY_TOPICS: readonly BunpouTopicDef[] = [
  {
    id: 'sebab-akibat',
    label: 'Sebab & Akibat (Alasan, Dampak & Penyebab)',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'sebab-objektif-netral',
        label: 'Alasan Objektif, Netral & Formal',
        description:
          'Menyatakan sebab/alasan secara netral hingga formal (〜から vs 〜ので vs 〜ため vs 〜につき vs 〜ゆえに).',
        patternIds: [
          'n5-bunpou-25', // 読みたいですから、…
          'n4-bunpou-9-1', // ~から…・~からです
          'n4-bunpou-9-2', // ~ので…
          'n4-bunpou-9-3', // ~て…・~くて…・~で… (sebab perasaan/kondisi)
          'n4-bunpou-P2-12-1', // ですから・だから
          'n4-bunpou-P2-12-2', // それで
          'n3-bunpou-5-1', // ~ためだ・~ため(に)…
          'n3-bunpou-5-2', // ~によって…・~による… (sebab)
          'n3-bunpou-5-3', // ~から…・~ことから… (dasar kesimpulan)
          'n2-bunpou-16-1', // ~によって (sebab)
          'n2-bunpou-16-5', // ~につき
          'n1-bunpou-12-2', // ~とあって
          'n1-bunpou-12-5', // ~ゆえ(に)
        ],
      },
      {
        id: 'sebab-berkat-gara',
        label: 'Akibat Baik/Buruk, Menyalahkan & Saking',
        description:
          'Kontras sebab positif vs negatif, penyesalan satu penyebab, dan sebab berlebihan (〜おかげで vs 〜せいで vs 〜ばかりに vs 〜あまり).',
        patternIds: [
          'n3-bunpou-5-4', // ~おかげだ/~せいだ
          'n2-bunpou-16-3', // ~おかげだ/~せいだ
          'n2-bunpou-16-4', // ~あまり・あまりの~に
          'n2-bunpou-17-4', // ~ばかりに
        ],
      },
      {
        id: 'sebab-subjektif-dalih',
        label: 'Alasan Sudah Jelas, Dalih & Menjaga Muka',
        description:
          'Alasan bernuansa subjektif, pembelaan, penekanan "justru karena", atau kewajiban moral (〜のだから vs 〜ものだから vs 〜だけに vs 〜ばこそ).',
        patternIds: [
          'n3-bunpou-5-5', // ~のだから…
          'n3-bunpou-P2-1-4', // どうして/なぜ~かというと、…からだ
          'n3-bunpou-P3-1-4', // どうして/なぜ~かというと +…からだ
          'n2-bunpou-16-2', // ~ものだから・~もので・~もの
          'n2-bunpou-17-1', // ~ことだし
          'n2-bunpou-17-2', // ~のことだから
          'n2-bunpou-17-3', // ~だけに
          'n2-bunpou-17-5', // ~からには・~以上(は)・~上は
          'n1-bunpou-12-1', // ~ばこそ
          'n1-bunpou-12-3', // ~ではあるまいし
          'n1-bunpou-12-4', // ~手前
        ],
      },
    ],
  },
  {
    id: 'pertentangan',
    label: 'Pertentangan & Syarat Berlawanan (Meskipun / Padahal)',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'pertentangan-kontras-langsung',
        label: 'Kontras "Tetapi / Padahal / Meskipun"',
        description:
          'Dua fakta bertolak belakang atau hasil di luar dugaan (〜が/〜けど vs 〜のに vs 〜ものの vs 〜ながら(も) vs 〜にもかかわらず).',
        patternIds: [
          'n5-bunpou-35', // 楽しかったですが、…
          'n5-bunpou-42', // 授業は ないけど、…
          'n5-bunpou-P9-3-2', // ぎゃくせつ (しかし・でも)
          'n4-bunpou-16-2', // ~のに…
          'n4-bunpou-P2-12-3', // けれど(も)
          'n3-bunpou-8-5', // ~ことは~が、…
          'n2-bunpou-14-1', // ~にもかかわらず
          'n2-bunpou-14-2', // ~ものの・~とはいうものの
          'n2-bunpou-14-3', // ~ながら(も)
          'n2-bunpou-14-4', // ~つつ(も)
          'n1-bunpou-8-1', // ~ところを
          'n1-bunpou-8-2', // ~ものを
          'n1-bunpou-8-5', // ~と思いきや
        ],
      },
      {
        id: 'pertentangan-meski-dikatakan',
        label: 'Konsesi "Meskipun Dikatakan / Hanya Karena"',
        description:
          'Mengakui pernyataan awal lalu meluruskan kenyataan sebenarnya (〜といっても vs 〜からといって vs 〜とはいえ vs 〜といえども).',
        patternIds: [
          'n2-bunpou-14-5', // ~といっても
          'n2-bunpou-14-6', // ~からといって
          'n1-bunpou-8-3', // ~とはいえ
          'n1-bunpou-8-4', // ~といえども
        ],
      },
      {
        id: 'pertentangan-syarat-berlawanan',
        label: 'Syarat Berlawanan "Sekalipun / Biarpun"',
        description:
          'Pengandaian ekstrem yang tetap tidak mengubah hasil akhir (〜ても vs たとえ〜ても vs 〜としても/にしろ vs 〜たところで).',
        patternIds: [
          'n4-bunpou-16-1', // ~ても…
          'n3-bunpou-6-4', // たとえ~ても…・たとえ~でも…
          'n3-bunpou-I-13', // どんなに・いくら・たとえ + ~ても・~でも
          'n3-bunpou-I-14', // せっかく + ~のに・~ても/~でも・~のだから
          'n2-bunpou-15-6', // ~としても・~にしても・~にしろ・~にせよ
          'n1-bunpou-10-1', // ~(よ)うと(も)・~(よ)うが
          'n1-bunpou-10-2', // ~(よ)うと~まいと・~(よ)うが~まいが
          'n1-bunpou-10-3', // ~であれ・~であろうと
          'n1-bunpou-10-4', // ~たところで
          'n1-bunpou-10-5', // ~ば~で・~なら~で・~たら~たで
        ],
      },
    ],
  },
  {
    id: 'pengandaian-syarat',
    label: 'Syarat & Pengandaian (Jika / Kalau / Tanpa)',
    categoryType: 'semantic',
    beginnerGroupIds: ['n4-pengandaian'],
    subClusters: [
      {
        id: 'syarat-umum-pengandaian',
        label: 'Syarat Umum & Pengandaian Hipotetis',
        description:
          'Empat syarat inti dan bentuk pengandaian lanjutan (〜たら vs 〜ば vs 〜なら vs 〜と vs 〜としたら vs 〜とあれば).',
        patternIds: [
          'n4-bunpou-14-1', // ~たら…
          'n4-bunpou-14-2', // ~ば…・~なら…
          'n4-bunpou-14-3', // ~と…
          'n4-bunpou-15-1', // ~たら… (setelah)
          'n4-bunpou-15-2', // ~なら… (topik)
          'n3-bunpou-6-1', // ~(の)なら…
          'n3-bunpou-6-5', // ~ば…・~たら…・~なら… (khayalan)
          'n3-bunpou-I-12', // もしも・万一・万が一 + ~ば/~たら
          'n2-bunpou-15-1', // ~としたら・~とすれば・~とすると
          'n1-bunpou-9-1', // ~とあれば
        ],
      },
      {
        id: 'syarat-minimal-peringatan',
        label: 'Syarat Minimal & Peringatan Konsekuensi Buruk',
        description:
          'Asalkan satu syarat terpenuhi, atau peringatan "kalau sampai terjadi pasti gawat" (〜さえ〜ば vs 〜ては vs 〜ようものなら vs 〜たら最後).',
        patternIds: [
          'n3-bunpou-6-2', // ~ては…・~(の)では…
          'n3-bunpou-6-3', // ~さえ~ば…・~さえ~なら…
          'n2-bunpou-15-2', // ~ものなら
          'n2-bunpou-15-3', // ~(よ)うものなら
          'n1-bunpou-9-2', // ~たら最後・~たが最後
          'n1-bunpou-9-3', // ~ようでは
        ],
      },
      {
        id: 'syarat-mutlak-tanpa',
        label: 'Syarat Mutlak "Kalau Belum / Tanpa"',
        description:
          'Kondisi wajib agar sesuatu bisa terwujud (〜てからでないと vs 〜ないことには vs 〜を抜きにしては vs 〜なくして(は) vs 〜あっての).',
        patternIds: [
          'n3-bunpou-1-3', // ~てからでないと…
          'n2-bunpou-3-5', // ~てからでないと・~てからでなければ
          'n2-bunpou-15-4', // ~ないことには
          'n2-bunpou-15-5', // ~を抜きにしては
          'n1-bunpou-9-4', // ~なしに(は)・~なくして(は)
          'n1-bunpou-17-5', // ~あっての
        ],
      },
    ],
  },
  {
    id: 'waktu-bersamaan',
    label: 'Waktu, Sedang Berlangsung & Segera Setelah',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'waktu-tepat-setelah',
        label: 'Tepat Setelah & Hampir Bersamaan',
        description:
          'Kejadian kedua langsung menyusul seketika setelah kejadian pertama (〜たばかり vs 〜たとたん vs 〜か〜ないかのうちに vs 〜が早いか).',
        patternIds: [
          'n3-bunpou-F-5', // ~たばかりだ
          'n3-bunpou-H-2', // ~と…た (berurutan segera)
          'n2-bunpou-1-3', // ~たとたん(に)
          'n2-bunpou-1-4', // ~(か)と思うと・~(か)と思ったら
          'n2-bunpou-1-5', // ~か~ないかのうちに
          'n2-bunpou-3-3', // ~次第
          'n1-bunpou-1-1', // ~が早いか
          'n1-bunpou-1-2', // ~や・~や否や
          'n1-bunpou-1-3', // ~なり
          'n1-bunpou-1-4', // ~そばから
        ],
      },
      {
        id: 'waktu-sedang-selagi',
        label: 'Sedang Berlangsung & Selagi Masih',
        description:
          'Tindakan yang sedang berjalan, tepat akan terjadi, atau berlangsung dalam rentang waktu tertentu (〜ている vs 〜ところだ vs 〜うちに vs 〜最中だ vs 〜つつある).',
        patternIds: [
          'n5-bunpou-29', // 買い物を して います
          'n4-bunpou-2-2', // ~ところです
          'n4-bunpou-P2-9-1', // 「~ています」の使い方
          'n3-bunpou-1-1', // ~うちに…
          'n3-bunpou-1-2', // ~間…・~間に…
          'n3-bunpou-1-4', // ~ところだ・~ところ(+助詞)…
          'n2-bunpou-2-1', // ~最中だ
          'n2-bunpou-2-2', // ~うちに
          'n2-bunpou-2-4', // ~(よ)うとしている
          'n2-bunpou-2-5', // ~つつある
        ],
      },
      {
        id: 'waktu-sambil-sekalian',
        label: 'Sambil & Tindakan yang Menyertai',
        description:
          'Melakukan dua tindakan bersamaan atau memanfaatkan kesempatan sekalian (〜ながら vs 〜ついでに vs 〜つつ vs 〜がてら vs 〜かたわら).',
        patternIds: [
          'n5-bunpou-38', // 雪を 見ながら、…
          'n4-bunpou-2-1', // ~ながら…
          'n3-bunpou-2-5', // ~ついでに…
          'n2-bunpou-2-6', // ~つつ
          'n1-bunpou-7-1', // ~がてら
          'n1-bunpou-7-2', // ~かたがた
          'n1-bunpou-7-3', // ~かたわら
        ],
      },
      {
        id: 'waktu-sebelum-sesudah-sejak',
        label: 'Sebelum, Setelah, Saat Khusus & Sejak',
        description:
          'Urutan waktu berjarak, momen formal/khusus, dan titik awal perubahan (〜まえに vs 〜あとで vs 〜際(に) vs 〜上(で) vs 〜て以来).',
        patternIds: [
          'n5-bunpou-31', // チェックインしてから、…
          'n5-bunpou-36', // スキーを した あとで、…
          'n5-bunpou-37', // 朝ご飯を 食べる まえに、…
          'n4-bunpou-2-3', // ~まで…・~までに…
          'n2-bunpou-1-1', // ~際(に)
          'n2-bunpou-1-2', // ~に際して・~にあたって
          'n2-bunpou-3-1', // ~てはじめて
          'n2-bunpou-3-2', // ~上(で)
          'n2-bunpou-3-4', // ~て以来・~てこのかた
          'n1-bunpou-1-5', // ~てからというもの(は)
          'n1-bunpou-1-6', // ~にあって
        ],
      },
    ],
  },
  {
    id: 'kabar-dugaan',
    label: 'Kabar, Dugaan & Tampilan (Katanya / Sepertinya)',
    categoryType: 'semantic',
    beginnerGroupIds: ['n4-souda-youda'],
    subClusters: [
      {
        id: 'dugaan-tampilan-kesan',
        label: 'Tampilan Visual & Kesan "Sepertinya / Seolah-olah"',
        description:
          'Kesan langsung dari penglihatan atau perumpamaan sikap (〜そうだ様態 vs 〜ようだ/みたいだ vs 〜とみえる vs 〜んばかりだ).',
        patternIds: [
          'n4-bunpou-8-1', // ~そうです (様態)
          'n4-bunpou-12-3', // ~ようです・~みたいです
          'n3-bunpou-D-1', // ~(かの)ようだ・~のようだ
          'n3-bunpou-I-8', // 今にも + ~そうだ
          'n3-bunpou-I-9', // まるで・ちょうど + ~ようだ・~みたいだ
          'n3-bunpou-J-12', // ~のようだ・~みたいだ (mirip)
          'n2-bunpou-22-1', // ~とみえる
          'n1-bunpou-6-1', // ~んばかりだ
          'n1-bunpou-6-2', // ~とばかり(に)
        ],
      },
      {
        id: 'dugaan-kabar-berita',
        label: 'Kabar & Informasi dari Orang Lain "Katanya / Konon"',
        description:
          'Menyampaikan ulang berita atau ucapan dari sumber lain (〜そうだ伝聞 vs 〜らしい vs 〜とのことだ vs 〜と言われている).',
        patternIds: [
          'n4-bunpou-19-1', // ~と言っていました
          'n4-bunpou-19-2', // ~そうです (伝聞)
          'n4-bunpou-19-3', // ~らしいです
          'n3-bunpou-7-1', // ~ということだ・~とのことだ
          'n3-bunpou-7-2', // ~と言われている
          'n3-bunpou-7-3', // ~とか
          'n3-bunpou-7-4', // ~って
          'n3-bunpou-7-5', // ~という
        ],
      },
      {
        id: 'dugaan-kemungkinan-yakin',
        label: 'Kemungkinan, Keyakinan & Kekhawatiran',
        description:
          'Tingkat kepastian dugaan dari "mungkin", "dikhawatirkan", hingga "pasti" (〜かもしれない vs 〜はずだ vs 〜かねない vs 〜おそれがある vs 〜に違いない).',
        patternIds: [
          'n4-bunpou-12-1', // ~かもしれません
          'n4-bunpou-12-2', // ~はずです
          'n3-bunpou-C-4', // ~のではないか・~のではないだろうか
          'n3-bunpou-I-5', // もしかしたら + ~かもしれない
          'n3-bunpou-I-6', // おそらく + ~だろう
          'n3-bunpou-I-7', // どうも + ~ようだ・~らしい
          'n2-bunpou-22-2', // ~かねない
          'n2-bunpou-22-3', // ~おそれがある
          'n2-bunpou-22-4', // ~まい/~ではあるまいか
          'n2-bunpou-22-5', // ~に違いない・~に相違ない
          'n2-bunpou-22-6', // ~にきまっている
        ],
      },
    ],
  },
  {
    id: 'pembatasan-penambahan',
    label: 'Pembatasan, Penambahan & Penekanan Ekstrem',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'pembatasan-hanya',
        label: 'Pembatasan "Hanya / Khusus / Sekadar"',
        description:
          'Membatasi jumlah, ruang lingkup, atau pengecualian khusus (〜だけ vs 〜しか vs 〜ばかり vs 〜に限り vs 〜にすぎない vs 〜ならでは).',
        patternIds: [
          'n5-bunpou-P9-1-16', // だけ
          'n4-bunpou-P2-3-2', // 「しか」の使い方
          'n4-bunpou-P2-4-1', // 「だけ」の使い方
          'n3-bunpou-A-8', // だけ
          'n3-bunpou-F-1', // ~ばかり…
          'n3-bunpou-F-2', // ~てばかりいる
          'n3-bunpou-I-15', // ただ + ~だけ
          'n2-bunpou-5-1', // ~に限り
          'n2-bunpou-5-2', // ~限り(は)
          'n2-bunpou-5-3', // ~限りでは
          'n2-bunpou-5-4', // ~に限って
          'n2-bunpou-23-3', // ~にすぎない
          'n1-bunpou-2-5', // ~といったところだ
          'n1-bunpou-3-1', // ~をおいて
          'n1-bunpou-3-2', // ~ならでは
        ],
      },
      {
        id: 'penambahan-tidak-hanya',
        label: 'Penambahan "Tidak Hanya ... Tetapi Juga"',
        description:
          'Menambahkan fakta kedua yang sejajar atau lebih tinggi tingkatannya (〜し vs 〜ばかりでなく vs 〜のみならず vs 〜ばかりか vs 〜にとどまらず).',
        patternIds: [
          'n4-bunpou-11-1', // (~も)~し、(~も)…
          'n4-bunpou-P2-12-4', // それに
          'n3-bunpou-F-3', // ~ばかりでなく…
          'n3-bunpou-H-3', // ~も~ば~も…・~も~なら~も…
          'n3-bunpou-P2-4-3', // ~はもちろん…も
          'n2-bunpou-6-1', // ~に限らず
          'n2-bunpou-6-2', // ~のみならず
          'n2-bunpou-6-3', // ~ばかりか
          'n2-bunpou-6-4', // ~はもとより
          'n2-bunpou-6-5', // ~上(に)
          'n1-bunpou-3-3', // ~にとどまらず
          'n1-bunpou-3-4', // ~はおろか
          'n1-bunpou-3-5', // ~もさることながら
        ],
      },
      {
        id: 'penekanan-bahkan-ekstrem',
        label: 'Penekanan "Bahkan / Sampai-sampai / Justru"',
        description:
          'Menekankan contoh ekstrem, batas minimum, atau jumlah luar biasa (〜でも vs 〜さえ vs 〜までして vs 〜すら vs 〜だに vs 〜たりとも).',
        patternIds: [
          'n4-bunpou-P2-3-1', // 「も」の使い方
          'n4-bunpou-P2-4-2', // 「でも」の使い方
          'n3-bunpou-A-1', // こそ
          'n3-bunpou-A-2', // でも
          'n3-bunpou-A-3', // も
          'n3-bunpou-A-4', // さえ
          'n3-bunpou-A-5', // まで
          'n3-bunpou-A-6', // ぐらい・くらい
          'n2-bunpou-21-1', // ~ぐらい・~くらい
          'n2-bunpou-21-2', // ~など・~なんか・~なんて
          'n2-bunpou-21-3', // ~まで・~までして・~てまで
          'n2-bunpou-21-5', // ~さえ
          'n2-bunpou-21-6', // ~てでも
          'n1-bunpou-17-1', // ~たりとも…ない
          'n1-bunpou-17-2', // ~すら
          'n1-bunpou-17-3', // ~だに
          'n1-bunpou-17-4', // ~にして
          'n1-bunpou-17-6', // ~からある・~からする・~からの
        ],
      },
    ],
  },
  {
    id: 'perbandingan-kontras',
    label: 'Perbandingan, Kontras & Penilaian Ukuran',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'perbandingan-lebih-paling',
        label: 'Lebih Dari, Paling & Daripada',
        description:
          'Membandingkan derajat atau memilih opsi terbaik (〜より/ほど vs 〜くらい…はない vs 〜くらいなら vs 〜に限る vs 〜にもまして).',
        patternIds: [
          'n4-bunpou-1-1', // ~より… / ~ほど…ません
          'n4-bunpou-1-2', // ~より~のほう
          'n4-bunpou-1-3', // ~と~とどちら
          'n3-bunpou-2-4', // (~ば)~ほど…
          'n3-bunpou-3-1', // ~くらいだ・~ほどだ
          'n3-bunpou-3-2', // ~くらい…はない
          'n3-bunpou-3-3', // ~くらいなら…
          'n3-bunpou-3-4', // ~に限る
          'n2-bunpou-23-5', // ~に越したことはない
          'n1-bunpou-9-5', // ~くらいなら
          'n1-bunpou-15-2', // ~にもまして
          'n1-bunpou-15-3', // ~ないまでも
        ],
      },
      {
        id: 'perbandingan-dua-sisi',
        label: 'Kontras Dua Sisi "Sebaliknya / Di Sisi Lain"',
        description:
          'Mempertentangkan dua aspek berbeda dari hal yang sama atau dua pihak yang berlawanan (〜に対して vs 〜反面 vs 〜一方(で) vs 〜にひきかえ).',
        patternIds: [
          'n3-bunpou-4-1', // ~に対して… (kontras)
          'n3-bunpou-4-2', // ~反面…
          'n3-bunpou-4-3', // ~一方(で)…
          'n3-bunpou-4-4', // ~というより…
          'n3-bunpou-4-5', // ~かわりに…
          'n1-bunpou-15-1', // ~にひきかえ
        ],
      },
      {
        id: 'perbandingan-ukuran-standar',
        label: 'Menilai dari Ukuran & Standar Harapan',
        description:
          'Membandingkan kenyataan dengan standar umum yang diharapkan (〜わりに(は) vs 〜にしては vs 〜だけ(のことは)ある vs 〜なりに).',
        patternIds: [
          'n2-bunpou-19-1', // ~わりに(は)
          'n2-bunpou-19-2', // ~にしては
          'n2-bunpou-19-3', // ~だけ(のことは)ある
          'n1-bunpou-5-5', // ~ならいざしらず
          'n1-bunpou-14-5', // ~なりに
        ],
      },
    ],
  },
  {
    id: 'keterkaitan-standar',
    label: 'Keterkaitan, Standar & Tanpa Memandang',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'keterkaitan-dasar-sesuai',
        label: 'Berdasarkan, Sesuai & Seiring Perubahan',
        description:
          'Menyesuaikan dengan dasar/patokan atau perubahan yang berjalan paralel (〜とおり vs 〜に基づいて vs 〜に沿って vs 〜につれて vs 〜に応じて vs 〜いかんだ).',
        patternIds: [
          'n3-bunpou-2-1', // ~とおりだ・~どおり
          'n3-bunpou-2-2', // ~によって…・~によっては…
          'n3-bunpou-2-3', // ~たびに…
          'n3-bunpou-D-2', // ~ように… (sama seperti / contoh)
          'n2-bunpou-8-1', // ~をもとに(して)
          'n2-bunpou-8-2', // ~に基づいて
          'n2-bunpou-8-3', // ~に沿って
          'n2-bunpou-8-4', // ~のもとで・~のもとに
          'n2-bunpou-8-5', // ~向けだ
          'n2-bunpou-9-1', // ~につれて・~にしたがって
          'n2-bunpou-9-2', // ~に伴って・~とともに
          'n2-bunpou-9-3', // ~次第だ
          'n2-bunpou-9-4', // ~に応じて
          'n2-bunpou-9-5', // ~につけて
          'n1-bunpou-5-1', // ~いかんだ
        ],
      },
      {
        id: 'keterkaitan-objek-sudutpandang',
        label: 'Mengenai, Terhadap & Sudut Pandang Posisi',
        description:
          'Menandai objek bahasan, pihak yang dituju, atau sudut pandang kedudukan (〜について vs 〜に関して vs 〜にとって vs 〜として vs 〜にすれば vs 〜たるもの).',
        patternIds: [
          'n3-bunpou-B-1', // ~について…
          'n3-bunpou-B-2', // ~に対して…・~に対する…
          'n3-bunpou-B-4', // ~にとって…
          'n3-bunpou-B-5', // ~として…
          'n3-bunpou-P2-4-2', // ~を…として・~を…に
          'n2-bunpou-7-1', // ~に関して
          'n2-bunpou-7-2', // ~をめぐって
          'n2-bunpou-7-3', // ~にかけては
          'n2-bunpou-7-4', // ~に対して
          'n2-bunpou-7-5', // ~にこたえて
          'n2-bunpou-19-4', // ~として
          'n2-bunpou-19-5', // ~にとって
          'n2-bunpou-19-6', // ~にしたら・~にすれば
          'n1-bunpou-14-2', // ~ともなると・~ともなれば
          'n1-bunpou-14-3', // ~ともあろう
          'n1-bunpou-14-4', // ~たるもの(は)
        ],
      },
      {
        id: 'keterkaitan-tanpa-memandang',
        label: 'Tanpa Memandang & Mengabaikan',
        description:
          'Berlaku tanpa terpengaruh kriteria atau tetap bertindak mengabaikan halangan (〜を問わず vs 〜にかかわらず vs 〜もかまわず vs 〜いかんにかかわらず vs 〜をよそに).',
        patternIds: [
          'n2-bunpou-11-1', // ~を問わず
          'n2-bunpou-11-2', // ~にかかわらず・~にかかわりなく
          'n2-bunpou-11-3', // ~もかまわず
          'n2-bunpou-11-4', // ~はともかく(として)
          'n2-bunpou-11-5', // ~はさておき
          'n1-bunpou-5-2', // ~いかんにかかわらず・~いかんを問わず
          'n1-bunpou-5-3', // ~をものともせずに
          'n1-bunpou-5-4', // ~をよそに
        ],
      },
    ],
  },
  {
    id: 'kemampuan-kewajiban-larangan',
    label: 'Kemampuan, Kesulitan, Kewajiban & Keterpaksaan',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'kemampuan-bisa-sulit',
        label: 'Bisa, Mudah & Sulit Dilakukan',
        description:
          'Tingkat kemampuan, kemudahan, dan kesulitan fisik maupun psikologis (〜ことができる vs 〜やすい/にくい/づらい vs 〜がたい vs 〜かねる vs 〜得る vs 〜べくもない).',
        patternIds: [
          'n4-bunpou-4-1', // ~(ら)れます [bentuk potensial]
          'n4-bunpou-4-2', // ~ができます・~ことができます
          'n4-bunpou-4-3', // 見えます・聞こえます
          'n4-bunpou-P2-14-2', // ~にくいです
          'n4-bunpou-P2-14-3', // ~やすいです
          'n3-bunpou-J-5', // ~やすい
          'n3-bunpou-J-6', // ~にくい
          'n3-bunpou-J-7', // ~づらい
          'n2-bunpou-18-1', // ~がたい
          'n2-bunpou-18-3', // ~かねる
          'n2-bunpou-18-4', // ~ようがない
          'n2-bunpou-18-6', // ~得る/~得ない
          'n1-bunpou-13-1', // ~にかたくない
          'n1-bunpou-13-2', // ~に~ない・~(よ)うにも~ない
          'n1-bunpou-13-4', // ~べくもない
        ],
      },
      {
        id: 'kewajiban-izin-larangan',
        label: 'Izin, Kewajiban, Larangan & Tidak Perlu',
        description:
          'Aturan boleh/dilarang, keharusan moral, dan ketiadaan keharusan (〜てもいい/てはいけない vs 〜なければならない vs 〜べきだ vs 〜ことはない vs 〜べからず).',
        patternIds: [
          'n5-bunpou-32', // 入れないで ください
          'n4-bunpou-6-1', // ~てもいいです / ~てはいけません
          'n4-bunpou-6-2', // ~なくてもいいです / ~なければなりません
          'n4-bunpou-13-3', // ~ないと
          'n3-bunpou-10-1', // 命令(しろ)/禁止(~な)
          'n3-bunpou-10-2', // ~こと (instruksi/peringatan)
          'n3-bunpou-10-3', // ~べきだ/~べきではない
          'n3-bunpou-C-2', // ~ことはない
          'n2-bunpou-23-7', // ~べきだ/~べきではない
          'n2-bunpou-24-4', // ~ことはない
          'n1-bunpou-13-5', // ~べからず・~べからざる
          'n1-bunpou-13-6', // ~まじき
          'n1-bunpou-18-1', // ~までもない
          'n1-bunpou-18-4', // ~には当たらない
        ],
      },
      {
        id: 'kewajiban-keterpaksaan',
        label: 'Keterpaksaan & Dorongan Tak Tertahankan',
        description:
          'Keadaan tidak bisa menghindari atau terpaksa bertindak karena situasi/perasaan (〜わけにはいかない vs 〜ざるを得ない vs 〜ずにはいられない vs 〜を余儀なくされる).',
        patternIds: [
          'n3-bunpou-E-2', // ~わけにはいかない
          'n3-bunpou-E-3', // ~ないわけにはいかない
          'n2-bunpou-18-2', // ~わけにはいかない・~わけにもいかない
          'n2-bunpou-18-5', // ~どころではない
          'n2-bunpou-23-6', // ~しかない・~よりほかない
          'n2-bunpou-25-3', // ~ないではいられない・~ずにはいられない
          'n2-bunpou-25-4', // ~ないわけには(は)いかない
          'n2-bunpou-25-5', // ~ざるを得ない
          'n1-bunpou-13-3', // ~て(は)いられない
          'n1-bunpou-20-3', // ~ないではすまない・~ずにはすまない
          'n1-bunpou-20-4', // ~ないではおかない・~ずにはおかない
          'n1-bunpou-20-5', // ~を禁じ得ない
          'n1-bunpou-20-6', // ~を余儀なくされる
        ],
      },
    ],
  },
  {
    id: 'penyangkalan',
    label: 'Penyangkalan Tegas & Penyangkalan Sebagian',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'penyangkalan-total-mustahil',
        label: 'Penyangkalan Total & Mustahil',
        description:
          'Menolak kemungkinan sepenuhnya atau menyangkal dengan tegas (〜はずがない vs 〜わけがない vs 〜どころか vs 〜ものか vs 〜として〜ない).',
        patternIds: [
          'n5-bunpou-14', // どこへも 行きません
          'n3-bunpou-8-1', // ~はずがない・~わけがない
          'n3-bunpou-I-1', // 全く・少しも・決して + ~ない
          'n2-bunpou-12-1', // ~わけがない
          'n2-bunpou-12-2', // ~どころではない・~どころか
          'n2-bunpou-12-3', // ~ものか
          'n2-bunpou-21-4', // ~として~ない
          'n2-bunpou-24-6', // ~ものか (tekad/penyangkalan kuat)
        ],
      },
      {
        id: 'penyangkalan-sebagian',
        label: 'Penyangkalan Sebagian "Bukan Berarti / Belum Tentu"',
        description:
          'Menghaluskan penyangkalan agar tidak mutlak (〜とは限らない vs 〜わけではない vs 〜ないことはない vs 〜というものではない).',
        patternIds: [
          'n3-bunpou-8-2', // ~とは限らない
          'n3-bunpou-8-3', // ~わけではない・~というわけではない
          'n3-bunpou-8-4', // ~ないことはない
          'n2-bunpou-12-4', // ~わけではない・~というわけではない
          'n2-bunpou-12-5', // ~というものではない・~というものでもない
        ],
      },
    ],
  },
  {
    id: 'keinginan-niat-saran',
    label: 'Keinginan, Harapan, Ajakan, Niat & Saran',
    categoryType: 'semantic',
    beginnerGroupIds: ['n5-tai-hoshii', 'n5-ajakan', 'n4-youni-naru-suru'],
    subClusters: [
      {
        id: 'keinginan-harapan',
        label: 'Keinginan & Harapan',
        description:
          'Menyatakan keinginan diri sendiri, keinginan terhadap orang lain, dan harapan mendalam (〜たい vs 〜ほしい vs 〜てほしい vs 〜たいものだ vs 〜ないものか).',
        patternIds: [
          'n5-bunpou-10', // ほしいです
          'n5-bunpou-24', // 読みたいです
          'n4-bunpou-7-1', // ~がほしいです・~たいです
          'n4-bunpou-7-2', // ~といいです
          'n4-bunpou-8-2', // ~がっています・~がります
          'n3-bunpou-9-1', // ~てもらいたい・~てほしい
          'n3-bunpou-9-2', // ~(さ)せてもらいたい・~(さ)せてほしい
          'n3-bunpou-9-3', // ~といい・~ばいい・~たらいい
          'n3-bunpou-I-10', // ぜひ・なんとかして + ~たい/~てほしい
          'n3-bunpou-I-11', // どうか + ~てください/~てほしい
          'n2-bunpou-26-1', // ~たいものだ・~てほしいものだ
          'n2-bunpou-26-3', // ~ないもの(だろう)か
        ],
      },
      {
        id: 'ajakan-permintaan-saran',
        label: 'Ajakan, Permintaan & Saran',
        description:
          'Mengajak, meminta tolong, dan memberi nasihat halus hingga formal (〜ませんか vs 〜ましょう vs 〜ほうがいい vs 〜たらどうか vs 〜ことだ vs 〜ものではない).',
        patternIds: [
          'n5-bunpou-15', // 行きませんか
          'n5-bunpou-19', // 行きましょう
          'n5-bunpou-30', // 待って ください
          'n4-bunpou-3-1', // ~ませんか
          'n4-bunpou-3-2', // ~ましょう(か)
          'n4-bunpou-13-1', // ~なさい
          'n4-bunpou-13-2', // ~ほうがいいです
          'n3-bunpou-10-4', // ~たらどうか
          'n3-bunpou-D-4', // ~ように… (permintaan tak langsung)
          'n2-bunpou-24-1', // ~(よ)うではないか
          'n2-bunpou-24-2', // ~ことだ (nasihat)
          'n2-bunpou-24-3', // ~ものだ/~ものではない (saran umum)
        ],
      },
      {
        id: 'niat-keputusan-pembiasaan',
        label: 'Niat, Keputusan & Usaha Pembiasaan',
        description:
          'Rencana pribadi, keputusan sendiri vs aturan luar, serta pembiasaan (〜つもりだ vs 〜ことにする vs 〜ことになる vs 〜ようにする vs 〜ようになる vs 〜まい).',
        patternIds: [
          'n4-bunpou-18-1', // ~(よ)うと思います
          'n4-bunpou-18-2', // ~つもりです
          'n4-bunpou-21-1', // ~にします・~ことにします
          'n4-bunpou-21-2', // ~になります・~ことになります
          'n3-bunpou-11-1', // ~ことにする・~ことにしている
          'n3-bunpou-11-2', // ~ようにする・~ようにしている
          'n3-bunpou-11-3', // ~(よ)うとする
          'n3-bunpou-11-4', // ~つもりだ
          'n3-bunpou-G-2', // ~にする・~ことにする / ~になる・~ことになる
          'n3-bunpou-G-3', // ~にしている・~ことにしている / ~になっている
          'n3-bunpou-G-4', // ~ようにする(A) / ~ようになる
          'n3-bunpou-G-5', // ~ようにする(B)・~ようにしている / ~ようになっている
          'n2-bunpou-24-5', // ~まい/~(よ)うか~まいか
        ],
      },
    ],
  },
  {
    id: 'tujuan-sarana',
    label: 'Tujuan & Sarana / Cara (Demi / Supaya / Dengan)',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'tujuan-maksud',
        label: 'Tujuan & Maksud "Demi / Supaya / Untuk"',
        description:
          'Membedakan tujuan aksi terkendali vs keadaan tak terkendali serta ragam sastra (〜に行く vs 〜ために vs 〜ように vs 〜べく vs 〜んがために).',
        patternIds: [
          'n5-bunpou-27', // 見に 行きませんか
          'n4-bunpou-10-1', // ~に… (pergi/datang untuk)
          'n4-bunpou-10-2', // ~ため(に)…
          'n4-bunpou-10-3', // ~ように…
          'n3-bunpou-D-3', // ~ように… (agar/supaya)
          'n3-bunpou-P3-1-2', // ~には・~のには + …が必要だ
          'n1-bunpou-11-1', // ~べく
          'n1-bunpou-11-2', // ~んがため(に)
        ],
      },
      {
        id: 'sarana-cara',
        label: 'Cara, Alat & Sarana "Dengan"',
        description:
          'Menunjukkan alat atau sarana formal untuk mencapai maksud (〜で vs 〜をもって).',
        patternIds: [
          'n5-bunpou-12', // バスで 行きました
          'n1-bunpou-11-3', // ~をもって (sarana)
        ],
      },
    ],
  },
  {
    id: 'perasaan-penilaian',
    label: 'Perasaan Kuat, Kesan & Penegasan',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'perasaan-emosi-ekstrem',
        label: 'Perasaan Sangat Kuat & Keharuan',
        description:
          'Mengungkapkan rasa yang meluap atau ekstrem secara alami maupun sastra (〜てたまらない vs 〜てならない vs 〜ことか vs 〜かぎりだ vs 〜極まりない vs 〜てやまない).',
        patternIds: [
          'n2-bunpou-25-1', // ~てしかたがない・~てしょうがない・~てたまらない
          'n2-bunpou-25-2', // ~てならない
          'n2-bunpou-26-4', // ~ものがある
          'n2-bunpou-26-5', // ~ことだ (keharuan/keterkejutan)
          'n2-bunpou-26-6', // ~ことだろう・~ことか
          'n1-bunpou-19-3', // ~といったらない
          'n1-bunpou-19-4', // ~かぎりだ
          'n1-bunpou-19-5', // ~極まる・~極まりない
          'n1-bunpou-19-6', // ~とは (keterkejutan/kekaguman)
          'n1-bunpou-20-1', // ~てやまない
          'n1-bunpou-20-2', // ~に堪えない (perasaan tak tertahankan)
        ],
      },
      {
        id: 'penilaian-kelayakan-tegas',
        label: 'Penilaian Kelayakan & Pernyataan Tegas',
        description:
          'Menilai pantas/tidaknya sesuatu serta menegaskan kesimpulan tanpa ragu (〜わけだ vs 〜ものだ vs 〜にほかならない vs 〜に足る vs 〜までだ).',
        patternIds: [
          'n3-bunpou-E-1', // ~わけだ・~というわけだ
          'n2-bunpou-23-1', // ~ものだ (kebenaran umum)
          'n2-bunpou-23-2', // ~というものだ
          'n2-bunpou-23-4', // ~にほかならない
          'n1-bunpou-18-2', // ~までだ・~までのことだ
          'n1-bunpou-18-3', // ~ばそれまでだ
          'n1-bunpou-18-5', // ~でなくてなんだろう(か)
          'n1-bunpou-19-1', // ~に足る
          'n1-bunpou-19-2', // ~に堪える/~に堪えない (layak/tidak sanggup)
        ],
      },
    ],
  },
  {
    id: 'hasil-perubahan-keadaan',
    label: 'Hasil Tindakan, Perubahan & Pengalaman',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'perubahan-kecenderungan',
        label: 'Perubahan Keadaan, Tahap Aksi & Kecenderungan',
        description:
          'Proses perubahan, kecenderungan sifat, dan progres satu arah (〜なる/する vs 〜かける/きる/出す vs 〜がちだ/っぽい vs 〜ばかりだ/一方だ vs 〜きらいがある).',
        patternIds: [
          'n5-bunpou-23', // 上手に なりました (+ ~く/にします)
          'n4-bunpou-20-1', // ~くします・~にします
          'n4-bunpou-20-2', // ~くなります・~になります・~ようになります
          'n4-bunpou-P2-10-1', // ~てきます・~ていきます
          'n4-bunpou-P2-14-1', // ~すぎます
          'n3-bunpou-F-4', // ~ばかりだ (perubahan satu arah)
          'n3-bunpou-G-1', // ~にする・~くする / ~になる・~くなる
          'n3-bunpou-I-3', // 少しずつ・次第に・ますます + 変化
          'n3-bunpou-J-1', // ~かける・~かけだ
          'n3-bunpou-J-2', // ~きる
          'n3-bunpou-J-3', // ~通す
          'n3-bunpou-J-4', // ~出す
          'n3-bunpou-J-8', // ~すぎる・~すぎだ
          'n3-bunpou-J-9', // ~がちだ
          'n3-bunpou-J-10', // ~らしい (khas)
          'n3-bunpou-J-11', // ~っぽい
          'n3-bunpou-J-13', // ~だらけだ
          'n2-bunpou-2-3', // ~ばかりだ・~一方だ
          'n1-bunpou-6-5', // ~きらいがある
        ],
      },
      {
        id: 'hasil-akhir-terlanjur',
        label: 'Hasil Akhir, Penyesalan & Keadaan Dibiarkan',
        description:
          'Akhir dari proses panjang, hasil tak terduga, atau keadaan dibiarkan begitu saja (〜てしまう vs 〜まま vs 〜あげく vs 〜末(に) vs 〜始末だ vs 〜っぱなしだ).',
        patternIds: [
          'n4-bunpou-8-3', // ~まま…
          'n4-bunpou-22-1', // ~てみます
          'n4-bunpou-22-2', // ~ておきます
          'n4-bunpou-22-3', // ~てしまいます
          'n4-bunpou-P2-9-2', // 「~てあります」の使い方
          'n3-bunpou-H-1', // ~と…た・~たら…た (penemuan)
          'n2-bunpou-20-1', // ~たところ
          'n2-bunpou-20-2', // ~きり
          'n2-bunpou-20-3', // ~あげく
          'n2-bunpou-20-4', // ~末(に)
          'n2-bunpou-20-5', // ~ところだった
          'n2-bunpou-20-6', // ~ずじまいだ
          'n1-bunpou-6-3', // ~ともなく・~ともなしに
          'n1-bunpou-6-4', // ~ながらに(して)
          'n1-bunpou-16-1', // ~に至って・~に至っても
          'n1-bunpou-16-2', // ~に至っては
          'n1-bunpou-16-3', // ~始末だ
          'n1-bunpou-16-4', // ~っぱなしだ
        ],
      },
      {
        id: 'pengalaman-kebiasaan',
        label: 'Pengalaman & Kenangan Masa Lalu',
        description:
          'Menyatakan pernah mengalami, kadang terjadi, atau kebiasaan dulu (〜たことがある vs 〜ことがある vs 〜ものだ kenangan).',
        patternIds: [
          'n4-bunpou-5-1', // ~たことがあります
          'n4-bunpou-5-2', // ~ことがあります
          'n3-bunpou-C-1', // ~ことがある
          'n2-bunpou-26-2', // ~ものだ (mengenang masa lalu)
        ],
      },
    ],
  },
  {
    id: 'rentang-batas',
    label: 'Awal, Akhir & Batas Rentang (Dari ... Hingga)',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'rentang-awal-akhir',
        label: 'Titik Awal & Batas Akhir Rentang',
        description:
          'Menandai awal rangkaian hingga titik ekstrem/pengakhiran resmi (〜から〜まで vs 〜から〜にかけて vs 〜をはじめ vs 〜を皮切りに vs 〜に至るまで vs 〜を限りに).',
        patternIds: [
          'n5-bunpou-P9-1-7', // から・まで
          'n3-bunpou-P2-4-1', // ~から…にかけて
          'n2-bunpou-4-1', // ~をはじめ(として)
          'n2-bunpou-4-2', // ~からして
          'n1-bunpou-2-1', // ~を皮切りに(して)
          'n1-bunpou-2-2', // ~に至るまで
          'n1-bunpou-2-3', // ~を限りに
          'n1-bunpou-2-4', // ~をもって (akhir)
        ],
      },
      {
        id: 'rentang-sepanjang-batas',
        label: 'Sepanjang Periode & Batas Maksimal',
        description:
          'Mencakup keseluruhan rentang waktu/wilayah atau batas maksimal (〜にわたって vs 〜を通じて/を通して vs 〜限り vs 〜だけ maksimal).',
        patternIds: [
          'n2-bunpou-4-3', // ~にわたって
          'n2-bunpou-4-4', // ~を通じて・~を通して
          'n2-bunpou-4-5', // ~限り
          'n2-bunpou-4-6', // ~だけ (batas maksimal)
        ],
      },
    ],
  },
  {
    id: 'topik-contoh-kutipan',
    label: 'Topik, Menyebut Contoh & Kutipan',
    categoryType: 'semantic',
    subClusters: [
      {
        id: 'topik-pengantar-definisi',
        label: 'Mengangkat Topik & Definisi',
        description:
          'Memperkenalkan definisi istilah, asosiasi topik, atau keluhan soal topik (〜というのは vs 〜とは vs 〜といえば vs 〜となると vs 〜ときたら).',
        patternIds: [
          'n5-bunpou-20', // 「アメ横」 という ところ
          'n3-bunpou-C-3', // ~というのは…だ
          'n3-bunpou-P2-3-1', // 名前を紹介する(~という…)
          'n3-bunpou-P2-3-2', // 内容を示す(~という…)
          'n3-bunpou-P2-3-3', // 知識・事実などを示す(~ということ)
          'n3-bunpou-P2-3-4', // よく知らない言葉を示す(~というの)
          'n2-bunpou-13-1', // ~とは (definisi)
          'n2-bunpou-13-2', // ~といえば
          'n2-bunpou-13-3', // ~というと・~といえば・~といったら
          'n2-bunpou-13-4', // ~(のこと)となると
          'n2-bunpou-13-5', // ~といったら
          'n1-bunpou-14-1', // ~ときたら
        ],
      },
      {
        id: 'contoh-daftar',
        label: 'Menyebut Contoh & Daftar Paralel',
        description:
          'Menyebut beberapa contoh kegiatan atau pasangan paralel (〜たり〜たり vs 〜や〜など vs 〜といった vs 〜やら〜やら vs 〜なり〜なり vs 〜といい〜といい).',
        patternIds: [
          'n5-bunpou-34', // スキーを したり、おんせんに 入ったり
          'n5-bunpou-P9-1-8', // や・など
          'n4-bunpou-11-2', // ~たり~たりします
          'n4-bunpou-P2-12-5', // たとえば
          'n3-bunpou-A-7', // など・なんか
          'n3-bunpou-P2-3-5', // いくつかの例を示す(~といった)
          'n2-bunpou-10-1', // ~やら~やら
          'n2-bunpou-10-2', // ~というか~というか
          'n2-bunpou-10-3', // ~にしても~にしても・~にしろ~にしろ
          'n2-bunpou-10-4', // ~といった
          'n1-bunpou-4-1', // ~なり…なり
          'n1-bunpou-4-2', // ~であれ…であれ
          'n1-bunpou-4-3', // ~といい…といい
          'n1-bunpou-4-4', // ~といわず…といわず
        ],
      },
      {
        id: 'kutipan-klausa-tanya',
        label: 'Kutipan Langsung, Tak Langsung & Klausa Tanya',
        description:
          'Menyisipkan ucapan, pikiran, perintah, atau pertanyaan ke dalam kalimat (〜と思う/言う vs 〜かどうか vs 〜ようにと).',
        patternIds: [
          'n4-bunpou-17-1', // ~と… (kutipan)
          'n4-bunpou-17-2', // ~か…・~かどうか…
          'n3-bunpou-P2-1-1', // 普通形 + と…(言う・思う・感じる)
          'n3-bunpou-P2-1-2', // ~ように(と)・~てほしいと・命令形と
          'n3-bunpou-P2-1-3', // ~かどうか・疑問詞+~か
        ],
      },
    ],
  },
  {
    id: 'pemberi-keigo',
    label: 'Pemberi-Penerima, Pasif, Kausatif & Keigo',
    categoryType: 'semantic',
    beginnerGroupIds: ['n4-ageru-morau-kureru'],
    subClusters: [
      {
        id: 'pemberi-penerima',
        label: 'Memberi & Menerima Bantuan',
        description:
          'Arah pemberian dan rasa terima kasih (あげる vs くれる vs もらう).',
        patternIds: [
          'n4-bunpou-23-1', // あげます・~てあげます
          'n4-bunpou-23-2', // くれます・~てくれます
          'n4-bunpou-23-3', // もらいます・~てもらいます
        ],
      },
      {
        id: 'pasif-kausatif',
        label: 'Kalimat Pasif, Kausatif & Kausatif-Pasif',
        description:
          'Membedakan di-..., menyuruh/membiarkan, dan dipaksa/terpaksa (受身 vs 使役 vs 使役受身 vs 〜によって pelaku pasif).',
        patternIds: [
          'n4-bunpou-24-1', // ~(ら)れます — 受身 1
          'n4-bunpou-24-2', // ~(ら)れます — 受身 2
          'n4-bunpou-24-3', // ~(ら)れます — 受身 3
          'n4-bunpou-25-1', // ~(さ)せます [Kausatif]
          'n4-bunpou-25-2', // ~さ(せら)れます [Kausatif Pasif]
          'n3-bunpou-B-3', // ~によって… (pelaku pasif)
        ],
      },
      {
        id: 'keigo-salam',
        label: 'Bahasa Hormat (Keigo) & Ungkapan Sopan',
        description:
          'Membedakan meninggikan lawan bicara, merendahkan diri sendiri, dan bahasa sopan standar (尊敬語 vs 謙譲語 vs 丁寧語).',
        patternIds: [
          'n5-bunpou-1-1', // あいさつ基本
          'n5-bunpou-1-2', // すみません・しつれいします・どうぞ
          'n3-bunpou-12-1', // 尊敬語
          'n3-bunpou-12-2', // 謙譲語1
          'n3-bunpou-12-3', // 謙譲語2
          'n3-bunpou-12-4', // 丁寧語
        ],
      },
    ],
  },
  {
    id: 'bentuk-dasar-konjugasi',
    label: 'Bentuk Dasar, Konjugasi & Struktur Kalimat',
    categoryType: 'structural_base',
    beginnerGroupIds: ['n5-wa-ga', 'n5-ni-de'],
    subClusters: [
      {
        id: 'dasar-bentuk-kalimat-kala',
        label: 'Bentuk Dasar, Kasual (Futsuukei) & Kala Waktu',
        description:
          'Bentuk sopan vs bentuk biasa/kasual (普通形), lampau, dan penyesuaian kala waktu — dipisahkan dari topik semantik.',
        patternIds: [
          'n5-bunpou-1', // あります (現在肯定形・現在否定形)
          'n5-bunpou-2', // ありますか
          'n5-bunpou-3', // どこですか
          'n5-bunpou-9', // きのう 買いました
          'n5-bunpou-39', // 楽しい 旅行でした
          'n5-bunpou-40', // 午後、いそがしい？ (Bentuk Biasa / Futsuukei)
          'n5-bunpou-41', // 鈴木くん、午後、いそがしい？ (Penghilangan partikel)
          'n5-bunpou-43', // もう 食べた
          'n5-bunpou-44', // まだ 食べて いない
          'n4-bunpou-P2-13-1', // まだ / もう
          'n3-bunpou-I-2', // すでに + ~た・~ている・~てある
          'n3-bunpou-I-4', // そのうち・今に + 動きを表す動詞
          'n3-bunpou-P3-2-1', // 時間を表す言葉と動詞の形を合わせる
          'n3-bunpou-P3-2-2', // 「~ている」の使い方
          'n3-bunpou-P3-2-3', // 「~とき」の前の動詞の時制
        ],
      },
      {
        id: 'dasar-partikel-tunjuk',
        label: 'Partikel Inti & Kata Tunjuk (こ・そ・あ)',
        description:
          'Fungsi dasar partikel inti (は/が/を/に/で/へ/と/の/か/ね/よ) dan kata tunjuk lokasi/benda.',
        patternIds: [
          'n5-bunpou-4', // あちらです
          'n5-bunpou-6', // 日本の です
          'n5-bunpou-8', // 電子辞書ですね
          'n5-bunpou-13', // どこか 行きましたか
          'n5-bunpou-16', // おもしろい ところですよ
          'n5-bunpou-17', // 駅の 前
          'n5-bunpou-18', // 公園が あります
          'n5-bunpou-P9-1-1', // が
          'n5-bunpou-P9-1-2', // を
          'n5-bunpou-P9-1-3', // に
          'n5-bunpou-P9-1-4', // で
          'n5-bunpou-P9-1-5', // へ
          'n5-bunpou-P9-1-6', // と
          'n5-bunpou-P9-1-9', // の
          'n5-bunpou-P9-1-10', // は
          'n5-bunpou-P9-1-11', // も
          'n5-bunpou-P9-1-12', // か
          'n5-bunpou-P9-1-13', // ね
          'n5-bunpou-P9-1-14', // よ
          'n5-bunpou-P9-1-15', // くらい(ぐらい)
          'n4-bunpou-P2-1-1', // 「で」の使い方
          'n4-bunpou-P2-1-2', // 「に」の使い方
          'n4-bunpou-P2-2-1', // 「を」の使い方
          'n4-bunpou-P2-2-2', // 「と」の使い方
          'n4-bunpou-P2-5-1', // 「は」の使い方
          'n4-bunpou-P2-5-2', // 「が」の使い方
          'n4-bunpou-P2-11-1', // 「こ」の使い方
          'n4-bunpou-P2-11-2', // 「そ」の使い方
          'n4-bunpou-P2-11-3', // 「あ」の使い方
        ],
      },
      {
        id: 'dasar-modifikasi-struktur',
        label: 'Modifikasi Kata Benda, Nominalisasi, Adverbia & Struktur Kalimat',
        description:
          'Susunan klausa penjelas kata benda, nominalisasi こと/の, transitif-intransitif, kata sambung dasar, dan kelas kata.',
        patternIds: [
          'n5-bunpou-5', // 新しい 電子辞書
          'n5-bunpou-7', // 23,800円 です
          'n5-bunpou-11', // 駅まで 行って、…
          'n5-bunpou-21', // 「アメ横」 は 安い 店が 多いです
          'n5-bunpou-22', // 安くて おいしいです
          'n5-bunpou-26', // まんがが 好きです
          'n5-bunpou-28', // まんがを かく ことです
          'n5-bunpou-33', // 早く 行きましょう
          'n5-bunpou-45', // 木が たくさん ある 公園
          'n5-bunpou-P9-2-1', // ていどを表す副詞
          'n5-bunpou-P9-2-2', // りょうを表す副詞
          'n5-bunpou-P9-2-3', // 時間に関する副詞
          'n5-bunpou-P9-2-4', // 頻度を表す副詞
          'n5-bunpou-P9-2-5', // じょうたいを表す副詞
          'n5-bunpou-P9-3-1', // じゅんせつ
          'n5-bunpou-P9-3-3', // てんかん
          'n5-bunpou-P9-4-1', // 接尾語
          'n4-bunpou-P2-6-1', // 「の」の使い方
          'n4-bunpou-P2-6-2', // 「こと」の使い方
          'n4-bunpou-P2-7-1', // 「~て… / ~ないで…」の使い方
          'n4-bunpou-P2-8-1', // 他動詞・自動詞
          'n4-bunpou-P2-12-6', // (それ)では・じゃ
          'n4-bunpou-P2-13-2', // なかなか / やっと / とうとう
          'n4-bunpou-P2-13-3', // かならず / きっと / ぜひ
          'n4-bunpou-P2-15-1', // 名詞 ⇔ 動詞
          'n4-bunpou-P2-15-2', // 名詞 ⇔ 形容詞
          'n4-bunpou-P2-15-3', // 副詞 ⇔ 形容詞
          'n4-bunpou-P2-15-4', // 名詞 ⇔ 文
          'n3-bunpou-C-0', // 「こと」だけを使う場合 / 「の」だけを使う場合
          'n3-bunpou-P2-2-1', // 普通形 + 名詞
          'n3-bunpou-P2-2-2', // 助詞 + の + 名詞
          'n3-bunpou-P2-2-3', // 助詞のような働きをする言葉 + の + 名詞
          'n3-bunpou-P2-2-4', // 助詞のような働きをする言葉の名詞につく形
          'n3-bunpou-P2-2-5', // 状態や様子を表す言葉 + の + 名詞
          'n3-bunpou-P3-1-1', // ~には +…がいる・…がある
          'n3-bunpou-P3-1-3', // ~のは + …だ・…からだ
          'n3-bunpou-P3-1-5', // 助詞と動詞の対応
        ],
      },
    ],
  },
];

/**
 * Curated symmetric confusable-pattern cliques (`similar_patterns` / `confusable_with`).
 * Patterns within the same clique are treated as high-priority comparison partners
 * and floated to the very top of Dropdown B when the other is selected as Pola A.
 */
const CONFUSABLE_CLIQUES: readonly (readonly string[])[] = [
  // Sebab-Akibat: Objektif / Formal
  ['n5-bunpou-25', 'n4-bunpou-9-1', 'n4-bunpou-9-2', 'n3-bunpou-5-1', 'n2-bunpou-16-5', 'n1-bunpou-12-5'],
  // Sebab-Akibat: Berkat vs Gara-gara vs Saking
  ['n3-bunpou-5-4', 'n2-bunpou-16-3', 'n2-bunpou-17-4', 'n2-bunpou-16-4'],
  // Sebab-Akibat: Justru karena / Sudah jelas / Dalih
  ['n3-bunpou-5-5', 'n2-bunpou-16-2', 'n2-bunpou-17-3', 'n2-bunpou-17-5', 'n1-bunpou-12-1'],
  // Pertentangan: Kontras langsung (tetapi / padahal / meskipun)
  ['n5-bunpou-35', 'n5-bunpou-42', 'n4-bunpou-16-2', 'n2-bunpou-14-2', 'n2-bunpou-14-3', 'n2-bunpou-14-4', 'n2-bunpou-14-1'],
  ['n4-bunpou-16-2', 'n1-bunpou-8-1', 'n1-bunpou-8-2'],
  // Pertentangan: Konsesi "meski dikatakan"
  ['n2-bunpou-14-5', 'n2-bunpou-14-6', 'n1-bunpou-8-3', 'n1-bunpou-8-4'],
  // Pertentangan: Syarat berlawanan "sekalipun"
  ['n4-bunpou-16-1', 'n3-bunpou-6-4', 'n2-bunpou-15-6', 'n1-bunpou-10-1', 'n1-bunpou-10-3', 'n1-bunpou-10-4'],
  // Pengandaian: 4 syarat inti & lanjutan
  ['n4-bunpou-14-1', 'n4-bunpou-14-2', 'n4-bunpou-14-3', 'n3-bunpou-6-1', 'n2-bunpou-15-1', 'n1-bunpou-9-1'],
  ['n3-bunpou-6-2', 'n2-bunpou-15-3', 'n1-bunpou-9-2', 'n1-bunpou-9-3'],
  ['n3-bunpou-1-3', 'n2-bunpou-3-5', 'n2-bunpou-15-4', 'n2-bunpou-15-5', 'n1-bunpou-9-4'],
  // Waktu: Tepat setelah / hampir bersamaan
  ['n3-bunpou-F-5', 'n2-bunpou-1-3', 'n2-bunpou-1-4', 'n2-bunpou-1-5', 'n1-bunpou-1-1', 'n1-bunpou-1-2', 'n1-bunpou-1-3'],
  // Waktu: Sedang berlangsung / selagi
  ['n4-bunpou-2-2', 'n3-bunpou-1-1', 'n3-bunpou-1-2', 'n3-bunpou-1-4', 'n2-bunpou-2-1', 'n2-bunpou-2-2'],
  // Waktu: Sambil / sekalian
  ['n5-bunpou-38', 'n4-bunpou-2-1', 'n3-bunpou-2-5', 'n2-bunpou-2-6', 'n1-bunpou-7-1', 'n1-bunpou-7-2', 'n1-bunpou-7-3'],
  // Waktu: Setelah / sejak
  ['n5-bunpou-31', 'n5-bunpou-36', 'n2-bunpou-3-1', 'n2-bunpou-3-2', 'n2-bunpou-3-4', 'n1-bunpou-1-5'],
  // Kabar & Dugaan
  ['n4-bunpou-8-1', 'n4-bunpou-12-3', 'n3-bunpou-D-1', 'n2-bunpou-22-1', 'n1-bunpou-6-1'],
  ['n4-bunpou-19-2', 'n4-bunpou-19-3', 'n3-bunpou-7-1', 'n3-bunpou-7-2', 'n3-bunpou-7-3'],
  ['n4-bunpou-12-1', 'n4-bunpou-12-2', 'n2-bunpou-22-2', 'n2-bunpou-22-3', 'n2-bunpou-22-5', 'n2-bunpou-22-6'],
  // Pembatasan & Penambahan
  ['n5-bunpou-P9-1-16', 'n4-bunpou-P2-3-2', 'n4-bunpou-P2-4-1', 'n3-bunpou-F-1', 'n2-bunpou-5-1', 'n2-bunpou-5-4', 'n2-bunpou-23-3', 'n1-bunpou-3-2'],
  ['n3-bunpou-F-3', 'n3-bunpou-P2-4-3', 'n2-bunpou-6-1', 'n2-bunpou-6-2', 'n2-bunpou-6-3', 'n2-bunpou-6-4', 'n1-bunpou-3-3', 'n1-bunpou-3-4'],
  ['n3-bunpou-A-4', 'n3-bunpou-A-5', 'n2-bunpou-21-3', 'n2-bunpou-21-5', 'n1-bunpou-17-2', 'n1-bunpou-17-3'],
  // Perbandingan & Kontras
  ['n4-bunpou-1-1', 'n3-bunpou-3-2', 'n3-bunpou-3-3', 'n1-bunpou-9-5', 'n1-bunpou-15-2'],
  ['n3-bunpou-4-1', 'n3-bunpou-4-2', 'n3-bunpou-4-3', 'n1-bunpou-15-1'],
  ['n2-bunpou-19-1', 'n2-bunpou-19-2', 'n2-bunpou-19-3', 'n1-bunpou-14-5'],
  // Keterkaitan & Tanpa Memandang
  ['n3-bunpou-2-1', 'n2-bunpou-8-1', 'n2-bunpou-8-2', 'n2-bunpou-8-3', 'n2-bunpou-9-4'],
  ['n2-bunpou-9-1', 'n2-bunpou-9-2', 'n2-bunpou-9-3', 'n1-bunpou-5-1'],
  ['n2-bunpou-11-1', 'n2-bunpou-11-2', 'n2-bunpou-11-3', 'n1-bunpou-5-2', 'n1-bunpou-5-3', 'n1-bunpou-5-4'],
  // Kemampuan, Kewajiban & Keterpaksaan
  ['n4-bunpou-P2-14-2', 'n3-bunpou-J-6', 'n3-bunpou-J-7', 'n2-bunpou-18-1', 'n2-bunpou-18-3', 'n1-bunpou-13-1'],
  ['n4-bunpou-6-2', 'n3-bunpou-10-3', 'n2-bunpou-23-7', 'n1-bunpou-13-5', 'n1-bunpou-13-6'],
  ['n3-bunpou-E-2', 'n3-bunpou-E-3', 'n2-bunpou-18-2', 'n2-bunpou-25-3', 'n2-bunpou-25-4', 'n2-bunpou-25-5', 'n1-bunpou-20-3', 'n1-bunpou-20-6'],
  // Penyangkalan
  ['n3-bunpou-8-1', 'n2-bunpou-12-1', 'n2-bunpou-12-2', 'n2-bunpou-12-3'],
  ['n3-bunpou-8-2', 'n3-bunpou-8-3', 'n3-bunpou-8-4', 'n2-bunpou-12-4', 'n2-bunpou-12-5'],
  // Keinginan, Niat & Tujuan
  ['n4-bunpou-18-1', 'n4-bunpou-18-2', 'n4-bunpou-21-1', 'n3-bunpou-11-1', 'n3-bunpou-11-2', 'n3-bunpou-11-4'],
  ['n4-bunpou-10-2', 'n4-bunpou-10-3', 'n3-bunpou-D-3', 'n1-bunpou-11-1', 'n1-bunpou-11-2'],
  // Perasaan & Hasil Akhir
  ['n2-bunpou-25-1', 'n2-bunpou-25-2', 'n1-bunpou-19-3', 'n1-bunpou-19-4', 'n1-bunpou-19-5', 'n1-bunpou-20-1'],
  ['n4-bunpou-22-3', 'n2-bunpou-20-3', 'n2-bunpou-20-4', 'n2-bunpou-20-6', 'n1-bunpou-16-3', 'n1-bunpou-16-4'],
  // Rentang
  ['n5-bunpou-P9-1-7', 'n3-bunpou-P2-4-1', 'n2-bunpou-4-1', 'n2-bunpou-4-3', 'n1-bunpou-2-1', 'n1-bunpou-2-2', 'n1-bunpou-2-3'],
];

const SIMILAR_PATTERN_MAP: Map<string, string[]> = (() => {
  const map = new Map<string, Set<string>>();
  for (const clique of CONFUSABLE_CLIQUES) {
    for (const id of clique) {
      let set = map.get(id);
      if (!set) {
        set = new Set<string>();
        map.set(id, set);
      }
      for (const peer of clique) {
        if (peer !== id) set.add(peer);
      }
    }
  }
  const out = new Map<string, string[]>();
  for (const [id, set] of map.entries()) {
    out.set(id, Array.from(set));
  }
  return out;
})();

const PATTERN_ASSIGNMENT_MAP: Map<string, PatternTaxonomyAssignment> = (() => {
  const map = new Map<string, PatternTaxonomyAssignment>();
  for (const topic of BUNPOU_TAXONOMY_TOPICS) {
    for (const cluster of topic.subClusters) {
      for (const patternId of cluster.patternIds) {
        map.set(patternId, {
          topicId: topic.id,
          topicLabel: topic.label,
          subClusterId: cluster.id,
          subClusterLabel: cluster.label,
          categoryType: topic.categoryType,
          similarPatterns: SIMILAR_PATTERN_MAP.get(patternId) ?? [],
        });
      }
    }
  }
  return map;
})();

export function getPatternTaxonomyAssignment(
  patternId: string,
): PatternTaxonomyAssignment | null {
  return PATTERN_ASSIGNMENT_MAP.get(patternId) ?? null;
}

export function getSimilarPatternIds(patternId: string): string[] {
  return SIMILAR_PATTERN_MAP.get(patternId) ?? [];
}

/**
 * Heuristics used ONLY by the automated taxonomy auditor to catch
 * morphological/structural base patterns (e.g. Futsuukei, basic conjugation,
 * basic particle lessons) that must NEVER leak into semantic topics.
 */
const MORPHOLOGICAL_BASE_AUDIT_PATTERNS: readonly RegExp[] = [
  /普通形\s*\+\s*名詞/i,
  /現在肯定形|現在否定形/i,
  /percakapan\s+(santai|kasual)\s+(dengan|tanpa)/i,
  /bentuk\s+biasa|futsuukei/i,
  /他動詞・自動詞/i,
  /品詞|kelas\s+kata/i,
  /助詞と動詞の対応/i,
  /時間を表す言葉と動詞の形/i,
  /午後、いそがしい/,
  /^「(は|が|を|に|で|と|こ|そ|あ|の|こと).*」の使い方$/,
];

export function isLikelyMorphologicalBaseItem(item: {
  pattern: string;
  meaning: string;
  lessonFullTitle?: string;
}): boolean {
  const combined = `${item.pattern} ${item.meaning} ${item.lessonFullTitle ?? ''}`;
  return MORPHOLOGICAL_BASE_AUDIT_PATTERNS.some((rx) => rx.test(combined));
}

export interface AuditableComparisonGroup {
  id: string;
  categoryType: BunpouCategoryType;
  levels: JlptLevel[];
  entries: Array<{
    id: string;
    level: JlptLevel;
    pattern: string;
    meaning: string;
    subClusterId: string;
    categoryType: BunpouCategoryType;
    similarPatterns: string[];
  }>;
}

/**
 * Automated taxonomy auditor that scans every topic & pattern to detect:
 * 1. Morphological/structural base patterns leaking into semantic topics
 * 2. Phantom levels (0 valid patterns) present in topic.levels
 * 3. Duplicate IDs across groups
 * 4. Self-referencing or broken similar_patterns links
 * 5. Unclassified patterns falling outside the canonical taxonomy
 */
export function auditBunpouTaxonomy(
  groups: readonly AuditableComparisonGroup[],
  allSourceItems?: readonly BunpouN2Item[],
): TaxonomyAuditReport {
  const issues: TaxonomyAuditIssue[] = [];
  const seenIds = new Set<string>();
  const allEntryIds = new Set<string>();

  for (const group of groups) {
    for (const entry of group.entries) {
      allEntryIds.add(entry.id);
    }
  }

  let semanticPatterns = 0;
  let structuralBasePatterns = 0;

  for (const group of groups) {
    const levelCounts: Record<JlptLevel, number> = {
      N5: 0,
      N4: 0,
      N3: 0,
      N2: 0,
      N1: 0,
    };
    const clusterCounts = new Map<string, number>();

    for (const entry of group.entries) {
      levelCounts[entry.level] += 1;
      clusterCounts.set(
        entry.subClusterId,
        (clusterCounts.get(entry.subClusterId) ?? 0) + 1,
      );

      if (group.categoryType === 'semantic') semanticPatterns += 1;
      else structuralBasePatterns += 1;

      if (seenIds.has(entry.id)) {
        issues.push({
          code: 'ERROR_DUPLICATE_ID',
          severity: 'error',
          topicId: group.id,
          patternId: entry.id,
          message: `Pola ${entry.id} muncul lebih dari satu kali dalam taksonomi.`,
        });
      }
      seenIds.add(entry.id);

      // Rule 1 check: No morphological/structural base patterns inside semantic topics
      if (
        group.categoryType === 'semantic' &&
        (entry.categoryType === 'structural_base' ||
          isLikelyMorphologicalBaseItem(entry))
      ) {
        issues.push({
          code: 'ERROR_MORPHOLOGY_IN_SEMANTIC_TOPIC',
          severity: 'error',
          topicId: group.id,
          patternId: entry.id,
          message: `Pola struktural/morfologi [${entry.level}] "${entry.pattern}" tidak boleh berada di topik semantik "${group.id}".`,
        });
      }

      // Relation hygiene check
      for (const peerId of entry.similarPatterns) {
        if (peerId === entry.id) {
          issues.push({
            code: 'ERROR_INVALID_RELATION',
            severity: 'error',
            topicId: group.id,
            patternId: entry.id,
            message: `Pola ${entry.id} mereferensikan dirinya sendiri di similarPatterns.`,
          });
        } else if (!allEntryIds.has(peerId)) {
          issues.push({
            code: 'ERROR_INVALID_RELATION',
            severity: 'error',
            topicId: group.id,
            patternId: entry.id,
            message: `Relasi similarPatterns "${peerId}" dari "${entry.id}" tidak ditemukan di dataset.`,
          });
        }
      }
    }

    // Rule 2 check: No 0-count phantom levels exposed in group.levels
    for (const lvl of group.levels) {
      if (levelCounts[lvl] === 0) {
        issues.push({
          code: 'ERROR_PHANTOM_LEVEL',
          severity: 'error',
          topicId: group.id,
          message: `Level ${lvl} tercantum pada topik "${group.id}" padahal jumlah pola valid = 0.`,
        });
      }
    }

    // Sub-cluster sanity check
    for (const [clusterId, count] of clusterCounts.entries()) {
      if (count < 2) {
        issues.push({
          code: 'WARN_ORPHAN_SUBCLUSTER',
          severity: 'warning',
          topicId: group.id,
          message: `Sub-cluster "${clusterId}" pada topik "${group.id}" hanya memiliki ${count} pola.`,
        });
      }
    }
  }

  if (allSourceItems) {
    for (const src of allSourceItems) {
      if (!seenIds.has(src.id)) {
        issues.push({
          code: 'ERROR_UNCLASSIFIED_PATTERN',
          severity: 'error',
          topicId: 'unclassified',
          patternId: src.id,
          message: `Pola [${src.level ?? '?'}] "${src.pattern}" (${src.id}) belum terpetakan di taksonomi.`,
        });
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return {
    totalPatterns: seenIds.size,
    semanticPatterns,
    structuralBasePatterns,
    errorCount,
    warningCount,
    issues,
  };
}
