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
  // =========================================================================
  // BAB 1 · EGG (N5 Dasar) — Stages 1–2
  // =========================================================================
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
        options: [
          'しんもん (shinmon)',
          'しんぶん (shinbun)',
          'あたらぶん (atarabun)',
          'かみぶん (kamibun)',
        ],
        correctIndex: 1,
        explanation:
          '新聞 dibaca しんぶん (shinbun) yang berarti surat kabar / koran.',
      },
      {
        id: 's1-q3',
        tag: 'Kosakata N5',
        prompt: 'Pilih arti yang tepat untuk 「毎朝 (まいあさ)」:',
        options: ['Setiap malam', 'Besok pagi', 'Setiap pagi', 'Tadi pagi'],
        correctIndex: 2,
        explanation:
          '毎朝 (まいあさ) berarti setiap pagi. Contoh: 毎朝コーヒーを飲みます。',
      },
      {
        id: 's1-q4',
        tag: 'Kata Sifat N5',
        prompt: 'Lawan kata dari 「大きい (おおきい)」 adalah...',
        options: [
          '高い (たかい)',
          '新しい (あたらしい)',
          '重い (おもい)',
          '小さい (ちいさい)',
        ],
        correctIndex: 3,
        explanation:
          '大きい (besar) berlawanan dengan 小さい (ちいさい = kecil).',
      },
      {
        id: 's1-q5',
        tag: 'Kata Kerja N5',
        prompt:
          'Lengkapi kalimat: 「図書館で本を＿＿＿＿。」 (Meminjam buku di perpustakaan)',
        options: [
          '貸します (かします)',
          '借ります (かります)',
          '売ります (うります)',
          '洗います (あらいます)',
        ],
        correctIndex: 1,
        explanation:
          '借ります (かります) berarti meminjam, sedangkan 貸します berarti meminjamkan.',
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
        options: ['Minggu lalu', 'Bulan depan', 'Minggu depan', 'Tahun depan'],
        correctIndex: 2,
        explanation:
          '来週 (らいしゅう) = minggu depan. Minggu lalu adalah 先週 (せんしゅう).',
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
        options: [
          'うえ dan した',
          'みぎ dan ひだり',
          'なか dan そと',
          'まえ dan うしろ',
        ],
        correctIndex: 1,
        explanation: '右 dibaca みぎ (kanan) dan 左 dibaca ひだり (kiri).',
      },
      {
        id: 's2-q4',
        tag: 'Partikel N5',
        prompt: '「電車＿＿学校へ行きます。」 (Pergi ke sekolah naik kereta)',
        options: ['を', 'が', 'と', 'で'],
        correctIndex: 3,
        explanation:
          'Partikel で digunakan untuk menyatakan alat/sarana transportasi.',
      },
      {
        id: 's2-q5',
        tag: 'Kosakata N5',
        prompt: 'Apa arti kata 「交差点 (こうさてん)」?',
        options: [
          'Jembatan penyeberangan',
          'Lampu merah',
          'Perempatan jalan',
          'Halte bus',
        ],
        correctIndex: 2,
        explanation:
          '交差点 (こうさてん) berarti persimpangan / perempatan jalan.',
      },
    ],
  },

  // =========================================================================
  // BAB 2 · HATCH (N4 Menengah Awal) — Stages 3–4
  // =========================================================================
  {
    id: 'stage-3',
    order: 3,
    chapter: 'Bab 2 · HATCH (N4 Menengah Awal)',
    jlptLevel: 'N4',
    title: 'Kata Kerja & Bentuk Sopan',
    subtitle: 'Latihan perubahan kata kerja dan ungkapan umum',
    xpReward: 80,
    questions: [
      {
        id: 's3-q1',
        tag: 'Tata Bahasa N4',
        prompt: '「窓を＿＿＿＿もいいですか。」 (Bolehkah saya membuka jendela?)',
        options: ['開けって', '開けて (あけて)', '開くで', '開けた'],
        correctIndex: 1,
        explanation:
          'Pola izin meminta dengan sopan menggunakan Bentuk-て + もいいですか → 開けてもいいですか。',
      },
      {
        id: 's3-q2',
        tag: 'Kosakata N4',
        prompt: 'Apa arti dari 「約束 (やくそく)」?',
        options: ['Janji', 'Liburan', 'Pelajaran', 'Pengalaman'],
        correctIndex: 0,
        explanation:
          '約束 (やくそく) berarti janji. Contoh: 友達と約束があります。',
      },
      {
        id: 's3-q3',
        tag: 'Tata Bahasa N4',
        prompt: '「日本へ行った＿＿＿があります。」 (Saya pernah pergi ke Jepang)',
        options: ['もの', 'とき', 'こと', 'ところ'],
        correctIndex: 2,
        explanation:
          'Bentuk lampau (た) + ことがあります digunakan untuk menyatakan pengalaman ("pernah").',
      },
      {
        id: 's3-q4',
        tag: 'Kosakata N4',
        prompt: 'Cara baca kanji 「準備」 yang benar adalah...',
        options: [
          'しゅんび (shunbi)',
          'じゅんぴ (junpi)',
          'ぜんび (zenbi)',
          'じゅんび (junbi)',
        ],
        correctIndex: 3,
        explanation: '準備 dibaca じゅんび (junbi) yang berarti persiapan.',
      },
      {
        id: 's3-q5',
        tag: 'Tata Bahasa N4',
        prompt:
          '「雨が降っている＿＿、傘を持って行きましょう。」 (Karena hujan turun, mari bawa payung)',
        options: ['まで', 'から', 'より', 'しか'],
        correctIndex: 1,
        explanation: 'から di akhir klausa menyatakan alasan ("karena").',
      },
    ],
  },
  {
    id: 'stage-n4-2',
    order: 4,
    chapter: 'Bab 2 · HATCH (N4 Menengah Awal)',
    jlptLevel: 'N4',
    title: 'Pengandaian, Saran & Pengalaman',
    subtitle: 'Pola 「〜たら」「〜ほうがいい」 dan kosakata keseharian N4',
    xpReward: 85,
    questions: [
      {
        id: 'sn4-2-q1',
        tag: 'Tata Bahasa N4',
        prompt:
          '「熱があるなら、今日は早く＿＿＿＿ほうがいいですよ。」 (Kalau demam, sebaiknya hari ini cepat istirahat)',
        options: ['休んで', '休む', '休んだ', '休ま'],
        correctIndex: 2,
        explanation:
          'Pola saran positif menggunakan Bentuk-た + ほうがいい → 休んだほうがいい (sebaiknya istirahat).',
      },
      {
        id: 'sn4-2-q2',
        tag: 'Kosakata N4',
        prompt: 'Apa arti dari 「経験 (けいけん)」?',
        options: ['Pengalaman', 'Keputusan', 'Peraturan', 'Perhatian'],
        correctIndex: 0,
        explanation:
          '経験 (けいけん) berarti pengalaman. Contoh: アルバイトの経験があります。',
      },
      {
        id: 'sn4-2-q3',
        tag: 'Tata Bahasa N4',
        prompt:
          '「駅に着い＿＿、電話してください。」 (Kalau sudah sampai stasiun, tolong telepon)',
        options: ['ながら', 'たら', 'ても', 'のに'],
        correctIndex: 1,
        explanation:
          'Bentuk-たら menyatakan syarat atau urutan "jika / setelah selesai melakukan A, lakukan B".',
      },
      {
        id: 'sn4-2-q4',
        tag: 'Kata Kerja N4',
        prompt:
          'Pilih pasangan transitif yang tepat untuk melengkapi: 「部屋が暗いので、電気を＿＿＿＿。」 (Menyalakan lampu)',
        options: [
          'つきます',
          '消えます (きえます)',
          '開きます (あきます)',
          'つけます',
        ],
        correctIndex: 3,
        explanation:
          'つける (transitif, dengan を) berarti menyalakan, sedangkan つく (intransitif, dengan が) berarti menyala.',
      },
      {
        id: 'sn4-2-q5',
        tag: 'Tata Bahasa N4',
        prompt:
          '「雨が降っ＿＿、試合は中止になりません。」 (Meskipun hujan turun, pertandingan tidak dibatalkan)',
        options: ['ても', 'から', 'ので', 'ように'],
        correctIndex: 0,
        explanation:
          'Bentuk-て + も menyatakan pertentangan pengandaian ("meskipun...").',
      },
    ],
  },

  // =========================================================================
  // BAB 3 · CHICK (N3 Menengah) — Stages 5–7
  // =========================================================================
  {
    id: 'stage-4',
    order: 5,
    chapter: 'Bab 3 · CHICK (N3 Menengah)',
    jlptLevel: 'N3',
    title: 'Situasi Percakapan & Nuansa',
    subtitle: 'Jembatan menuju konteks sehari-hari tingkat N3',
    xpReward: 95,
    questions: [
      {
        id: 's4-q1',
        tag: 'Kosakata N3',
        prompt: 'Apa arti dari 「確認 (かくにん)」?',
        options: [
          'Perbandingan',
          'Konfirmasi / pengecekan',
          'Pengumuman',
          'Pendaftaran',
        ],
        correctIndex: 1,
        explanation: '確認 (かくにん) berarti mengecek atau memastikan kembali.',
      },
      {
        id: 's4-q2',
        tag: 'Bunpou N3',
        prompt:
          '「風邪をひいた＿＿＿、今日は早く寝ます。」 (Karena masuk angin, hari ini tidur lebih cepat)',
        options: ['のに', 'ながら', 'ので', 'ばかり'],
        correctIndex: 2,
        explanation: 'ので menyatakan alasan dengan nuansa objektif dan halus.',
      },
      {
        id: 's4-q3',
        tag: 'Bunpou N3',
        prompt:
          '「毎日練習した＿＿、試合に負けてしまった。」 (Padahal sudah latihan tiap hari, tetap kalah)',
        options: ['のに', 'ので', 'ため', 'ように'],
        correctIndex: 0,
        explanation:
          'のに menyatakan hasil yang berlawanan atau di luar dugaan ("padahal...").',
      },
      {
        id: 's4-q4',
        tag: 'Kosakata N3',
        prompt: 'Cara baca yang tepat untuk 「努力」 adalah...',
        options: [
          'つとめりょく',
          'のうりょく',
          'どうりょく',
          'どりょく (doryoku)',
        ],
        correctIndex: 3,
        explanation: '努力 dibaca どりょく (doryoku) yang berarti usaha keras.',
      },
      {
        id: 's4-q5',
        tag: 'Konteks N3',
        prompt: 'Saat menunda jadwal rapat, kata yang tepat digunakan adalah...',
        options: [
          '参加 (さんか)',
          '延期 (えんき)',
          '賛成 (さんせい)',
          '到着 (とうちゃく)',
        ],
        correctIndex: 1,
        explanation: '延期 (えんき) berarti penundaan jadwal.',
      },
    ],
  },
  {
    id: 'stage-n3-2',
    order: 6,
    chapter: 'Bab 3 · CHICK (N3 Menengah)',
    jlptLevel: 'N3',
    title: 'Sebab-Akibat & Perubahan Kondisi',
    subtitle: 'Membedakan 「〜おかげで」「〜せいで」「〜うちに」',
    xpReward: 100,
    questions: [
      {
        id: 'sn3-2-q1',
        tag: 'Bunpou N3',
        prompt:
          '「先生のご指導の＿＿＿＿、無事にJLPTに合格できました。」 (Berkat bimbingan guru, berhasil lulus JLPT)',
        options: ['せいで', 'おかげで', 'わりに', 'くせに'],
        correctIndex: 1,
        explanation:
          '〜おかげで digunakan untuk penyebab yang menghasilkan akibat positif ("berkat...").',
      },
      {
        id: 'sn3-2-q2',
        tag: 'Bunpou N3',
        prompt:
          '「昨夜遅くまで起きていた＿＿＿＿、今日は頭が痛い。」 (Gara-gara begadang semalam, hari ini sakit kepala)',
        options: ['おかげで', 'ために', 'せいで', 'とおりに'],
        correctIndex: 2,
        explanation:
          '〜せいで digunakan untuk penyebab yang menimbulkan akibat negatif ("gara-gara...").',
      },
      {
        id: 'sn3-2-q3',
        tag: 'Bunpou N3',
        prompt:
          '「冷めない＿＿＿＿、どうぞ召し上がってください。」 (Selagi belum dingin, silakan dinikmati)',
        options: ['うちに', 'たびに', 'ばかりに', 'ところに'],
        correctIndex: 0,
        explanation:
          '〜うちに berarti "selagi kondisi masih berlangsung sebelum berubah".',
      },
      {
        id: 'sn3-2-q4',
        tag: 'Kosakata N3',
        prompt: 'Apa arti dari 「影響 (えいきょう)」?',
        options: ['Keuntungan', 'Persiapan', 'Kebiasaan', 'Pengaruh / dampak'],
        correctIndex: 3,
        explanation:
          '影響 (えいきょう) berarti pengaruh atau dampak. Contoh: 天気は売上に影響を与える。',
      },
      {
        id: 'sn3-2-q5',
        tag: 'Bunpou N3',
        prompt:
          '「この店は安い＿＿＿＿、味もとてもおいしい。」 (Dibanding harganya yang murah, rasanya juga sangat enak)',
        options: ['せいで', 'わりに', 'とおり', 'ほど'],
        correctIndex: 1,
        explanation:
          '〜わりに berarti "untuk ukuran... / padahal..., ternyata di luar ekspektasi".',
      },
    ],
  },
  {
    id: 'stage-n3-3',
    order: 7,
    chapter: 'Bab 3 · CHICK (N3 Menengah)',
    jlptLevel: 'N3',
    title: 'Boss Bacaan & Keigo Dasar N3',
    subtitle: 'Uji pemahaman paragraf pendek & kesopanan kerja N3',
    xpReward: 110,
    questions: [
      {
        id: 'sn3-3-q1',
        tag: 'Keigo N3',
        prompt:
          'Bagaimana cara sopan (Sonkeigo) menanyakan kepada atasan: "Apakah Anda sudah makan siang?"',
        options: [
          '昼ごはんをいただきましたか。',
          '昼ごはんを召し上がりましたか。',
          '昼ごはんを参りましたか。',
          '昼ごはんを申しましたか。',
        ],
        correctIndex: 1,
        explanation:
          '召し上がる (めしあがる) adalah bentuk hormat (Sonkeigo) dari 食べる/飲む untuk meninggikan tindakan lawan bicara.',
      },
      {
        id: 'sn3-3-q2',
        tag: 'Dokkai N3',
        passage:
          '最近の調査によると、毎日15分だけでも読書を続ける人は、休日にまとめて読む人より語彙力が伸びやすいという結果が出た。大切なのは一度の量ではなく、習慣にすることだ。',
        prompt: 'Menurut teks di atas, kunci utama agar kosakata berkembang adalah...',
        options: [
          'Membaca buku tebal sekaligus di hari libur',
          'Menghafal kamus dalam satu hari',
          'Menjadikan membaca sebagai kebiasaan rutin meski sebentar',
          'Membeli banyak buku baru setiap bulan',
        ],
        correctIndex: 2,
        explanation:
          'Kalimat penutup 「大切なのは一度の量ではなく、習慣にすることだ」 menegaskan konsistensi kebiasaan lebih penting daripada kuantitas sekaligus.',
      },
      {
        id: 'sn3-3-q3',
        tag: 'Bunpou N3',
        prompt:
          '「説明書に書いてある＿＿＿＿、組み立ててみた。」 (Mencoba merakit persis sesuai yang tertulis di buku panduan)',
        options: ['とおりに', 'かわりに', 'ついでに', 'とたんに'],
        correctIndex: 0,
        explanation:
          '〜とおりに berarti "sesuai dengan / persis seperti yang dikatakan atau ditulis".',
      },
      {
        id: 'sn3-3-q4',
        tag: 'Kosakata N3',
        prompt: 'Cara baca yang tepat untuk 「解決」 adalah...',
        options: [
          'かいけつ (kaiketsu)',
          'げけつ (geketsu)',
          'かいせつ (kaisetsu)',
          'かっけつ (kakketsu)',
        ],
        correctIndex: 0,
        explanation:
          '解決 dibaca かいけつ (kaiketsu) yang berarti penyelesaian masalah. (解説 = かいせつ = penjelasan).',
      },
      {
        id: 'sn3-3-q5',
        tag: 'Bunpou N3',
        prompt:
          '「駅に着いた＿＿＿＿、大雨が降り出した。」 (Begitu tiba di stasiun, hujan deras langsung turun)',
        options: ['うちに', 'おかげで', 'かわりに', 'とたんに'],
        correctIndex: 3,
        explanation:
          'Bentuk-た + とたんに menyatakan kejadian tak terduga yang terjadi seketika tepat setelah A.',
      },
    ],
  },

  // =========================================================================
  // BAB 4 · GROW (N2 Menengah Atas) — Stages 8–10
  // =========================================================================
  {
    id: 'stage-5',
    order: 8,
    chapter: 'Bab 4 · GROW (N2 Menengah Atas)',
    jlptLevel: 'N2',
    title: 'Bunpou Nuansa N2',
    subtitle: 'Membedakan pola tata bahasa yang sekilas mirip',
    xpReward: 115,
    questions: [
      {
        id: 's5-q1',
        tag: 'Bunpou N2',
        prompt:
          '「日本に住んでいるからといって、漢字が全部読める＿＿＿＿。」',
        options: ['に違いない', 'わけではない', 'はずだ', 'ばかりだ'],
        correctIndex: 1,
        explanation:
          '〜わけではない menyangkal kesimpulan mutlak ("bukan berarti selalu...").',
      },
      {
        id: 's5-q2',
        tag: 'Bunpou N2',
        prompt: '「高い教材を買えば、必ず合格する＿＿＿＿。」',
        options: ['とは限らない', 'に過ぎない', 'わけがない', 'どころではない'],
        correctIndex: 0,
        explanation:
          '〜とは限らない berarti "belum tentu / tidak selalu demikian".',
      },
      {
        id: 's5-q3',
        tag: 'Bunpou N2',
        prompt:
          '「忙しくて、テレビを見る＿＿＿＿ではない。」 (Saking sibuknya, jangankan menonton TV...)',
        options: ['ばかり', 'ほど', 'どころ', 'きり'],
        correctIndex: 2,
        explanation:
          '〜どころではない berarti keadaannya jauh dari memungkinkan untuk melakukan hal tersebut.',
      },
      {
        id: 's5-q4',
        tag: 'Moji-Goi N2',
        prompt: 'Cara baca yang tepat untuk 「把握」 adalah...',
        options: [
          'は握 (hanigi)',
          'ばあく (baaku)',
          'はく (haku)',
          'はあく (haaku)',
        ],
        correctIndex: 3,
        explanation:
          '把握 dibaca はあく (haaku) yang berarti memahami kondisi secara menyeluruh.',
      },
      {
        id: 's5-q5',
        tag: 'Moji-Goi N2',
        prompt: '「会議の日程を 変更 する。」 Arti & bacaan 変更 adalah...',
        options: [
          'へんこう · mengubah jadwal',
          'へんか · berubah bentuk',
          'かいこう · membuka rapat',
          'てんこう · pindah sekolah',
        ],
        correctIndex: 0,
        explanation:
          '変更 (へんこう) berarti mengubah rencana, jadwal, atau ketentuan.',
      },
    ],
  },
  {
    id: 'stage-6',
    order: 9,
    chapter: 'Bab 4 · GROW (N2 Menengah Atas)',
    jlptLevel: 'N2',
    title: 'Boss Dokkai & Choukai N2',
    subtitle: 'Tantangan pemahaman teks & dialog tingkat menengah atas',
    xpReward: 135,
    questions: [
      {
        id: 's6-q1',
        tag: 'Dokkai N2',
        passage:
          'オンライン学習は時間や場所を選ばないという利点がある一方で、学習計画を自分で立てなければ継続が難しい。そのため、定期的な進捗確認の仕組みが重要になる。',
        prompt: 'Kata penanda 「そのため」 pada teks di atas berfungsi untuk...',
        options: [
          'Menambahkan contoh kejadian masa lalu',
          'Menunjukkan kesimpulan / solusi utama penulis',
          'Menyangkal seluruh kalimat sebelumnya',
          'Mengubah topik ke pembahasan baru',
        ],
        correctIndex: 1,
        explanation:
          'そのため ("oleh karena itu") mengantar kesimpulan penulis mengenai pentingnya cek progres berkala.',
      },
      {
        id: 's6-q2',
        tag: 'Dokkai N2',
        passage:
          '新しいシステムは作業時間を短縮できる一方、慣れるまでは確認作業が増えるため、導入直後は負担が減らないこともある。',
        prompt: 'Apa pesan utama penulis tentang sistem baru tersebut?',
        options: [
          'Sistem baru selalu menambah beban kerja selamanya.',
          'Pekerja tidak perlu melakukan pengecekan tambahan sama sekali.',
          'Tepat setelah diterapkan, beban kerja tidak selalu langsung turun sebelum terbiasa.',
          'Sistem baru hanya berguna untuk perusahaan kecil.',
        ],
        correctIndex: 2,
        explanation:
          '慣れるまでは確認作業が増える menunjukkan perlu masa adaptasi sebelum beban kerja berkurang.',
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
        explanation:
          '補充してからすぐやります berarti mengisi ulang kertas dulu lalu segera mencetak.',
      },
      {
        id: 's6-q4',
        tag: 'Moji-Goi N2',
        prompt: 'Apa arti dari 「傾向 (けいこう)」?',
        options: [
          'Keputusan resmi',
          'Keterbatasan waktu',
          'Kerjasama tim',
          'Kecenderungan / tren',
        ],
        correctIndex: 3,
        explanation: '傾向 (けいこう) berarti tren atau kecenderungan.',
      },
      {
        id: 's6-q5',
        tag: 'Bunpou N2',
        prompt: '「毎日練習した＿＿＿＿、試合で勝つことができなかった。」',
        options: ['おかげで', 'にもかかわらず', 'ばかりに', 'ついでに'],
        correctIndex: 1,
        explanation:
          '〜にもかかわらず berarti "meskipun sudah..." (hasil bertolak belakang).',
      },
    ],
  },
  {
    id: 'stage-n2-3',
    order: 10,
    chapter: 'Bab 4 · GROW (N2 Menengah Atas)',
    jlptLevel: 'N2',
    title: 'Konteks Bisnis & Formal N2',
    subtitle: 'Pola resmi 「〜に際して」「〜をもとに」「〜ざるを得ない」',
    xpReward: 145,
    questions: [
      {
        id: 'sn2-3-q1',
        tag: 'Bunpou N2',
        prompt:
          '「海外出張＿＿＿＿、事前のビザ確認が必要です。」 (Pada kesempatan / saat melakukan dinas luar negeri)',
        options: ['に際して', 'にかけて', 'につれて', 'にしたがって'],
        correctIndex: 0,
        explanation:
          '〜に際して dipakai dalam bahasa formal untuk menyatakan "pada saat / kesempatan khusus melakukan suatu hal".',
      },
      {
        id: 'sn2-3-q2',
        tag: 'Bunpou N2',
        prompt:
          '「今回のアンケート結果＿＿＿＿、新しい研修プランを作成しました。」 (Berdasarkan hasil survei kali ini)',
        options: ['をめぐって', 'をもとに', 'をはじめ', 'にかわって'],
        correctIndex: 1,
        explanation:
          '〜をもとに berarti "berdasarkan / menjadikan A sebagai bahan dasar untuk membuat B".',
      },
      {
        id: 'sn2-3-q3',
        tag: 'Bunpou N2',
        prompt:
          '「台風で電車が止まったため、会議は中止に＿＿＿＿。」 (Terpaksa dibatalkan karena tidak ada pilihan lain)',
        options: [
          'するわけがない',
          'しないではいられない',
          'せざるを得ない',
          'するに決まっている',
        ],
        correctIndex: 2,
        explanation:
          '〜ざるを得ない (dengan する → せざるを得ない) berarti "terpaksa harus melakukan meski sebenarnya tidak ingin".',
      },
      {
        id: 'sn2-3-q4',
        tag: 'Moji-Goi N2',
        prompt: 'Apa arti dari 「検討 (けんとう)」 dalam kalimat 「企画案を検討する」?',
        options: [
          'Menolak secara sepihak',
          'Menyalin laporan',
          'Membatalkan kontrak',
          'Meninjau / mempertimbangkan dengan cermat',
        ],
        correctIndex: 3,
        explanation:
          '検討 (けんとう) sangat sering muncul di lingkungan kerja Jepang dan berarti meninjau atau mempertimbangkan secara matang.',
      },
      {
        id: 'sn2-3-q5',
        tag: 'Bunpou N2',
        prompt:
          '「年齢や性別＿＿＿＿、誰でも応募できます。」 (Tanpa memandang usia maupun jenis kelamin)',
        options: ['を問わず', 'を通じて', 'をこめて', 'を機に'],
        correctIndex: 0,
        explanation:
          '〜を問わず berarti "tanpa mempedulikan / tidak bergantung pada (usia, pengalaman, cuaca, dsb.)".',
      },
    ],
  },

  // =========================================================================
  // BAB 5 · FLY (N1 Mahir) — Stages 11–12
  // =========================================================================
  {
    id: 'stage-n1-1',
    order: 11,
    chapter: 'Bab 5 · FLY (N1 Mahir)',
    jlptLevel: 'N1',
    title: 'Nuansa Bunpou & Kosakata N1',
    subtitle: 'Ungkapan tingkat lanjut, penekanan, dan kosakata abstrak N1',
    xpReward: 165,
    questions: [
      {
        id: 'sn1-1-q1',
        tag: 'Bunpou N1',
        prompt:
          '「プロの料理人＿＿＿＿、この味付けは真似できない。」 (Bahkan koki profesional pun tidak bisa meniru bumbu ini)',
        options: ['ならでは', 'といえども', 'ながらも', 'ともなると'],
        correctIndex: 1,
        explanation:
          '〜といえども adalah bentuk formal tingkat N1 dari 「〜ても」 ("meskipun / sekalipun seorang...").',
      },
      {
        id: 'sn1-1-q2',
        tag: 'Bunpou N1',
        prompt:
          '「あの老舗の職人＿＿＿＿、この繊細な模様は作れない。」 (Hanya pengrajin toko legendaris itu yang mampu membuatnya)',
        options: ['ならではの', 'をよそに', 'ならまだしも', 'なくして'],
        correctIndex: 0,
        explanation:
          '〜ならでは(の) memuji keistimewaan yang hanya dimiliki oleh subjek tersebut ("khas / hanya bisa oleh...").',
      },
      {
        id: 'sn1-1-q3',
        tag: 'Moji-Goi N1',
        prompt: 'Cara baca yang tepat untuk 「迅速」 (cepat & tanggap) adalah...',
        options: [
          'しんそく (shinsoku)',
          'じんそく (jinsoku)',
          'じゅんそく (junsoku)',
          'ぜんそく (zensoku)',
        ],
        correctIndex: 1,
        explanation:
          '迅速 dibaca じんそく (jinsoku) yang berarti cepat dan sigap. Contoh: 迅速な対応に感謝いたします。',
      },
      {
        id: 'sn1-1-q4',
        tag: 'Bunpou N1',
        prompt:
          '「家族の協力＿＿＿＿、この研究は完成しなかっただろう。」 (Tanpa kerja sama keluarga, penelitian ini tak mungkin selesai)',
        options: ['を皮切りに', 'を余儀なくされ', 'なくしては', 'にひきかえ'],
        correctIndex: 2,
        explanation:
          '〜なくしては menyatakan syarat mutlak ("tanpa A, mustahil terjadi B").',
      },
      {
        id: 'sn1-1-q5',
        tag: 'Moji-Goi N1',
        prompt: 'Apa arti dari 「妥協 (だきょう)」?',
        options: [
          'Kewajiban mutlak',
          'Pertentangan tajam',
          'Pengabaian aturan',
          'Kompromi / jalan tengah',
        ],
        correctIndex: 3,
        explanation:
          '妥協 (だきょう) berarti kompromi. Contoh: 品質に関しては一切妥協しない (Tidak berkompromi sedikit pun soal kualitas).',
      },
    ],
  },
  {
    id: 'stage-n1-2',
    order: 12,
    chapter: 'Bab 5 · FLY (N1 Mahir)',
    jlptLevel: 'N1',
    title: 'Boss Final JLPT N1',
    subtitle: 'Analisis argumen Dokkai N1 & pola bunpou pembeda halus',
    xpReward: 190,
    questions: [
      {
        id: 'sn1-2-q1',
        tag: 'Dokkai N1',
        passage:
          '効率ばかりを追い求めるあまり、試行錯誤の時間を削ってしまっては、長期的な革新は生まれない。一見無駄に見える回り道こそが、新たな発想の土壌となるのである。',
        prompt: 'Apa gagasan inti penulis dalam paragraf tersebut?',
        options: [
          'Efisiensi tinggi selalu menjamin lahirnya inovasi jangka panjang.',
          'Proses coba-coba yang tampak membuang waktu justru menjadi fondasi ide baru.',
          'Segala aktivitas yang tidak langsung menghasilkan output harus dihapus.',
          'Inovasi hanya dapat muncul di perusahaan dengan anggaran besar.',
        ],
        correctIndex: 1,
        explanation:
          'Frasa 「一見無駄に見える回り道こそが、新たな発想の土壌となる」 menekankan bahwa jalan memutar / trial-and-error adalah lahan subur bagi inovasi.',
      },
      {
        id: 'sn1-2-q2',
        tag: 'Bunpou N1',
        prompt:
          '「大雨による土砂崩れのため、イベントは中止＿＿＿＿。」 (Terpaksa dibatalkan akibat tanah longsor)',
        options: [
          'を余儀なくされた',
          'にとどまらず',
          'に堪えない',
          'を踏まえて',
        ],
        correctIndex: 0,
        explanation:
          '〜を余儀なくされる adalah ungkapan formal/berita N1 yang berarti "terpaksa mengalami/melakukan akibat keadaan di luar kendali".',
      },
      {
        id: 'sn1-2-q3',
        tag: 'Bunpou N1',
        prompt:
          '「今回の失敗＿＿＿＿、次回の計画を見直す必要がある。」 (Dengan mempertimbangkan/berpijak pada kegagalan kali ini)',
        options: ['をよそに', 'を踏まえて', 'にかまけて', 'をものともせず'],
        correctIndex: 1,
        explanation:
          '〜を踏まえて berarti "berpijak pada / dengan mempertimbangkan fakta atau hasil sebelumnya".',
      },
      {
        id: 'sn1-2-q4',
        tag: 'Moji-Goi N1',
        prompt:
          'Dalam kalimat 「彼女の意見は説得力に富んでいる」, arti 「説得力 (せっとくりょく)」 adalah...',
        options: [
          'Daya tahan fisik',
          'Kecepatan berpikir',
          'Daya persuasi / kemampuan meyakinkan',
          'Kewenangan hukum',
        ],
        correctIndex: 2,
        explanation:
          '説得力 (せっとくりょく) berarti daya persuasi atau kekuatan argumen untuk meyakinkan orang lain.',
      },
      {
        id: 'sn1-2-q5',
        tag: 'Bunpou N1',
        prompt:
          '「周囲の反対＿＿＿＿、彼は自分の信じた道を突き進んだ。」 (Tanpa mempedulikan penentangan orang sekitar)',
        options: ['に際して', 'に即して', 'にあたって', 'をよそに'],
        correctIndex: 3,
        explanation:
          '〜をよそに berarti "mengabaikan / tidak mempedulikan kekhawatiran atau penentangan orang di sekitar".',
      },
    ],
  },
];
