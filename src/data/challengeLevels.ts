import type { JlptLevel } from '../data/utamagoContent';

export interface ChallengeQuestion {
  id: string;
  tag: string;
  prompt: string;
  passage?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ChallengeStage {
  id: string;
  order: number;
  chapter: string;
  jlptLevel: JlptLevel;
  title: string;
  subtitle: string;
  xpReward: number;
  questions: ChallengeQuestion[];
}

export const CHALLENGE_STAGES: ChallengeStage[] = [
  {
    id: 'stage-1',
    order: 1,
    chapter: 'Bab 1 · EGG (N5 Dasar)',
    jlptLevel: 'N5',
    title: 'Benda & Aktivitas Harian',
    subtitle: 'Uji kosakata inti N5 dari deck Anki',
    xpReward: 60,
    questions: [
      {
        id: 's1-q1',
        tag: 'Kosakata N5',
        prompt: 'Apa arti dari kata 「鞄 (かばん)」?',
        options: ['Tas', 'Sepatu', 'Kunci', 'Payung'],
        correctIndex: 0,
        explanation:
          '鞄 (かばん) berarti tas (tas jinjing, tas kerja, atau koper kecil). Contoh: この鞄は軽いです。',
      },
      {
        id: 's1-q2',
        tag: 'Kosakata N5',
        prompt: 'Bagaimana cara baca yang tepat untuk 「新聞」?',
        options: ['しんぶん (shinbun)', 'しんもん (shinmon)', 'あたらぶん (atarabun)', 'かみぶん (kamibun)'],
        correctIndex: 0,
        explanation: '新聞 dibaca しんぶん (shinbun) yang berarti surat kabar / koran.',
      },
      {
        id: 's1-q3',
        tag: 'Kosakata N5',
        prompt: 'Pilih arti yang tepat untuk 「毎朝 (まいあさ)」:',
        options: ['Setiap pagi', 'Setiap malam', 'Besok pagi', 'Tadi pagi'],
        correctIndex: 0,
        explanation: '毎朝 (まいあさ) berarti setiap pagi. Contoh: 毎朝コーヒーを飲みます。',
      },
      {
        id: 's1-q4',
        tag: 'Kata Sifat N5',
        prompt: 'Lawan kata dari 「大きい (おおきい)」 adalah...',
        options: ['小さい (ちいさい)', '高い (たかい)', '新しい (あたらしい)', '重い (おもい)'],
        correctIndex: 0,
        explanation: '大きい (besar) berlawanan dengan 小さい (ちいさい = kecil).',
      },
      {
        id: 's1-q5',
        tag: 'Kata Kerja N5',
        prompt: 'Lengkapi kalimat: 「図書館で本を＿＿＿＿。」 (Meminjam buku di perpustakaan)',
        options: ['借ります (かります)', '貸します (かします)', '売ります (うります)', '洗います (あらいます)'],
        correctIndex: 0,
        explanation: '借ります (かります) berarti meminjam, sedangkan 貸します berarti meminjamkan.',
      },
    ],
  },
  {
    id: 'stage-2',
    order: 2,
    chapter: 'Bab 1 · EGG (N5 Dasar)',
    jlptLevel: 'N5',
    title: 'Waktu, Tempat & Arah',
    subtitle: 'Tantangan angka, waktu, dan penunjuk lokasi',
    xpReward: 70,
    questions: [
      {
        id: 's2-q1',
        tag: 'Waktu N5',
        prompt: 'Apa arti dari 「来週 (らいしゅう)」?',
        options: ['Minggu depan', 'Minggu lalu', 'Bulan depan', 'Tahun depan'],
        correctIndex: 0,
        explanation: '来週 (らいしゅう) = minggu depan. Minggu lalu adalah 先週 (せんしゅう).',
      },
      {
        id: 's2-q2',
        tag: 'Lokasi N5',
        prompt: '「駅の＿＿に銀行があります。」 (Ada bank di sebelah stasiun)',
        options: ['隣 (となり)', '昨日 (きのう)', '午前 (ごぜん)', '半分 (はんぶん)'],
        correctIndex: 0,
        explanation: '隣 (となり) berarti di sebelah / samping.',
      },
      {
        id: 's2-q3',
        tag: 'Kanji N5',
        prompt: 'Bagaimana cara baca 「右」 dan 「左」?',
        options: ['みぎ dan ひだり', 'うえ dan した', 'なか dan そと', 'まえ dan うしろ'],
        correctIndex: 0,
        explanation: '右 dibaca みぎ (kanan) dan 左 dibaca ひだり (kiri).',
      },
      {
        id: 's2-q4',
        tag: 'Partikel N5',
        prompt: '「電車＿＿学校へ行きます。」 (Pergi ke sekolah naik kereta)',
        options: ['で', 'を', 'が', 'と'],
        correctIndex: 0,
        explanation: 'Partikel で digunakan untuk menyatakan alat/sarana transportasi.',
      },
      {
        id: 's2-q5',
        tag: 'Kosakata N5',
        prompt: 'Apa arti kata 「交差点 (こうさてん)」?',
        options: ['Perempatan jalan', 'Jembatan penyeberangan', 'Lampu merah', 'Halte bus'],
        correctIndex: 0,
        explanation: '交差点 (こうさてん) berarti persimpangan / perempatan jalan.',
      },
    ],
  },
  {
    id: 'stage-3',
    order: 3,
    chapter: 'Bab 2 · HATCH (N5 Lanjut & N4)',
    jlptLevel: 'N4',
    title: 'Kata Kerja & Bentuk Sopan',
    subtitle: 'Latihan perubahan kata kerja dan ungkapan umum',
    xpReward: 80,
    questions: [
      {
        id: 's3-q1',
        tag: 'Tata Bahasa N4',
        prompt: '「窓を＿＿＿＿もいいですか。」 (Bolehkah saya membuka jendela?)',
        options: ['開けて (あけて)', '開けって', '開くで', '開けた'],
        correctIndex: 0,
        explanation: 'Pola izin meminta dengan sopan menggunakan Bentuk-て + もいいですか -> 開けてもいいですか。',
      },
      {
        id: 's3-q2',
        tag: 'Kosakata N4',
        prompt: 'Apa arti dari 「約束 (やくそく)」?',
        options: ['Janji', 'Liburan', 'Pelajaran', 'Pengalaman'],
        correctIndex: 0,
        explanation: '約束 (やくそく) berarti janji. Contoh: 友達と約束があります。',
      },
      {
        id: 's3-q3',
        tag: 'Tata Bahasa N4',
        prompt: '「日本へ行った＿＿＿があります。」 (Saya pernah pergi ke Jepang)',
        options: ['こと', 'もの', 'とき', 'ところ'],
        correctIndex: 0,
        explanation: 'Bentuk lampau (た) + ことがあります digunakan untuk menyatakan pengalaman ("pernah").',
      },
      {
        id: 's3-q4',
        tag: 'Kosakata N4',
        prompt: 'Cara baca kanji 「準備」 yang benar adalah...',
        options: ['じゅんび (junbi)', 'しゅんび (shunbi)', 'じゅんぴ (junpi)', 'ぜんび (zenbi)'],
        correctIndex: 0,
        explanation: '準備 dibaca じゅんび (junbi) yang berarti persiapan.',
      },
      {
        id: 's3-q5',
        tag: 'Tata Bahasa N4',
        prompt: '「雨が降っている＿＿、傘を持って行きましょう。」 (Karena hujan turun, mari bawa payung)',
        options: ['から', 'まで', 'より', 'しか'],
        correctIndex: 0,
        explanation: 'から di akhir klausa menyatakan alasan ("karena").',
      },
    ],
  },
  {
    id: 'stage-4',
    order: 4,
    chapter: 'Bab 2 · HATCH (N5 Lanjut & N4)',
    jlptLevel: 'N3',
    title: 'Situasi Percakapan & Nuansa',
    subtitle: 'Jembatan menuju konteks sehari-hari tingkat N3',
    xpReward: 95,
    questions: [
      {
        id: 's4-q1',
        tag: 'Kosakata N3',
        prompt: 'Apa arti dari 「確認 (かくにん)」?',
        options: ['Konfirmasi / pengecekan', 'Perbandingan', 'Pengumuman', 'Pendaftaran'],
        correctIndex: 0,
        explanation: '確認 (かくにん) berarti mengecek atau memastikan kembali.',
      },
      {
        id: 's4-q2',
        tag: 'Bunpou N3',
        prompt: '「風邪をひいた＿＿＿、今日は早く寝ます。」 (Karena masuk angin, hari ini tidur lebih cepat)',
        options: ['ので', 'のに', 'ながら', 'ばかり'],
        correctIndex: 0,
        explanation: 'ので menyatakan alasan dengan nuansa objektif dan halus.',
      },
      {
        id: 's4-q3',
        tag: 'Bunpou N3',
        prompt: '「毎日練習した＿＿、試合に負けてしまった。」 (Padahal sudah latihan tiap hari, tetap kalah)',
        options: ['のに', 'ので', 'ため', 'ように'],
        correctIndex: 0,
        explanation: 'のに menyatakan hasil yang berlawanan atau di luar dugaan ("padahal...").',
      },
      {
        id: 's4-q4',
        tag: 'Kosakata N3',
        prompt: 'Cara baca yang tepat untuk 「努力」 adalah...',
        options: ['どりょく (doryoku)', 'つとめりょく', 'のうりょく', 'どうりょく'],
        correctIndex: 0,
        explanation: '努力 dibaca どりょく (doryoku) yang berarti usaha keras.',
      },
      {
        id: 's4-q5',
        tag: 'Konteks N3',
        prompt: 'Saat menunda jadwal rapat, kata yang tepat digunakan adalah...',
        options: ['延期 (えんき)', '参加 (さんか)', '賛成 (さんせい)', '到着 (とうちゃく)'],
        correctIndex: 0,
        explanation: '延期 (えんき) berarti penundaan jadwal.',
      },
    ],
  },
  {
    id: 'stage-5',
    order: 5,
    chapter: 'Bab 3 · GROW (Tantangan N2)',
    jlptLevel: 'N2',
    title: 'Bunpou Nuansa N2',
    subtitle: 'Membedakan pola tata bahasa yang sekilas mirip',
    xpReward: 115,
    questions: [
      {
        id: 's5-q1',
        tag: 'Bunpou N2',
        prompt: '「日本に住んでいるからといって、漢字が全部読める＿＿＿＿。」',
        options: ['わけではない', 'に違いない', 'はずだ', 'ばかりだ'],
        correctIndex: 0,
        explanation: '〜わけではない menyangkal kesimpulan mutlak ("bukan berarti selalu...").',
      },
      {
        id: 's5-q2',
        tag: 'Bunpou N2',
        prompt: '「高い教材を買えば、必ず合格する＿＿＿＿。」',
        options: ['とは限らない', 'に過ぎない', 'わけがない', 'どころではない'],
        correctIndex: 0,
        explanation: '〜とは限らない berarti "belum tentu / tidak selalu demikian".',
      },
      {
        id: 's5-q3',
        tag: 'Bunpou N2',
        prompt: '「忙しくて、テレビを見る＿＿＿＿ではない。」 (Saking sibuknya, jangankan menonton TV...)',
        options: ['どころ', 'ばかり', 'ほど', 'きり'],
        correctIndex: 0,
        explanation: '〜どころではない berarti keadaannya jauh dari memungkinkan untuk melakukan hal tersebut.',
      },
      {
        id: 's5-q4',
        tag: 'Moji-Goi N2',
        prompt: 'Cara baca yang tepat untuk 「把握」 adalah...',
        options: ['はあく (haaku)', 'は握 (hanigi)', 'ばあく (baaku)', 'はく (haku)'],
        correctIndex: 0,
        explanation: '把握 dibaca はあく (haaku) yang berarti memahami kondisi secara menyeluruh.',
      },
      {
        id: 's5-q5',
        tag: 'Moji-Goi N2',
        prompt: '「会議の日程を 変更 する。」 Arti & bacaan 変更 adalah...',
        options: ['へんこう · mengubah jadwal', 'へんか · berubah bentuk', 'かいこう · membuka rapat', 'てんこう · pindah sekolah'],
        correctIndex: 0,
        explanation: '変更 (へんこう) berarti mengubah rencana, jadwal, atau ketentuan.',
      },
    ],
  },
  {
    id: 'stage-6',
    order: 6,
    chapter: 'Bab 3 · GROW (Tantangan N2)',
    jlptLevel: 'N2',
    title: 'Boss Dokkai & Choukai N2',
    subtitle: 'Tantangan pemahaman teks & dialog tingkat menengah atas',
    xpReward: 140,
    questions: [
      {
        id: 's6-q1',
        tag: 'Dokkai N2',
        passage:
          'オンライン学習は時間や場所を選ばないという利点がある一方で、学習計画を自分で立てなければ継続が難しい。そのため、定期的な進捗確認の仕組みが重要になる。',
        prompt: 'Kata penanda 「そのため」 pada teks di atas berfungsi untuk...',
        options: [
          'Menunjukkan kesimpulan / solusi utama penulis',
          'Menambahkan contoh kejadian masa lalu',
          'Menyangkal seluruh kalimat sebelumnya',
          'Mengubah topik ke pembahasan baru',
        ],
        correctIndex: 0,
        explanation: 'そのため ("oleh karena itu") mengantar kesimpulan penulis mengenai pentingnya cek progres berkala.',
      },
      {
        id: 's6-q2',
        tag: 'Dokkai N2',
        passage:
          '新しいシステムは作業時間を短縮できる一方、慣れるまでは確認作業が増えるため、導入直後は負担が減らないこともある。',
        prompt: 'Apa pesan utama penulis tentang sistem baru tersebut?',
        options: [
          'Tepat setelah diterapkan, beban kerja tidak selalu langsung turun sebelum terbiasa.',
          'Sistem baru selalu menambah beban kerja selamanya.',
          'Pekerja tidak perlu melakukan pengecekan tambahan sama sekali.',
          'Sistem baru hanya berguna untuk perusahaan kecil.',
        ],
        correctIndex: 0,
        explanation: '慣れるまでは確認作業が増える menunjukkan perlu masa adaptasi sebelum beban kerja berkurang.',
      },
      {
        id: 's6-q3',
        tag: 'Choukai N2',
        passage:
          'A:「資料の印刷、今からお願いできますか。」 B:「すみません、今プリンターの紙が切れていて。補充してからすぐやりますね。」',
        prompt: 'Apa yang akan langsung dilakukan pembicara B?',
        options: [
          'Mengisi kertas printer lalu mencetak dokumennya.',
          'Menolak mencetak dokumen sama sekali.',
          'Meminta A mencetak sendiri di ruang lain.',
          'Menyerahkan dokumen yang sudah dicetak.',
        ],
        correctIndex: 0,
        explanation: '補充してからすぐやります berarti mengisi ulang kertas dulu lalu segera mencetak.',
      },
      {
        id: 's6-q4',
        tag: 'Moji-Goi N2',
        prompt: 'Apa arti dari 「傾向 (けいこう)」?',
        options: ['Kecenderungan / tren', 'Keputusan resmi', 'Keterbatasan waktu', 'Kerjasama tim'],
        correctIndex: 0,
        explanation: '傾向 (けいこう) berarti tren atau kecenderungan.',
      },
      {
        id: 's6-q5',
        tag: 'Bunpou N2',
        prompt: '「毎日練習した＿＿＿＿、試合で勝つことができなかった。」',
        options: ['にもかかわらず', 'おかげで', 'ばかりに', 'ついでに'],
        correctIndex: 0,
        explanation: '〜にもかかわらず berarti "meskipun sudah..." (hasil bertolak belakang).',
      },
    ],
  },
];
