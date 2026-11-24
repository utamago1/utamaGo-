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
        options: [
          '隣 (となり)',
          '中 (なか)',
          '上 (うえ)',
          '後ろ (うしろ)',
        ],
        correctIndex: 0,
        explanation:
          '隣 (となり) berarti di sebelah / samping, sedangkan 中 = di dalam, 上 = di atas, dan 後ろ = di belakang.',
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
        options: ['開けって', '開けて', '開くで', '開けた'],
        correctIndex: 1,
        explanation:
          'Pola meminta izin dengan sopan menggunakan Bentuk-て + もいいですか → 開けて (あけて) もいいですか。',
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
          'Pilih kata kerja yang tepat: 「部屋が暗いので、電気を＿＿＿＿。」 (Menyalakan lampu)',
        options: ['つきます', '消えます', '消します', 'つけます'],
        correctIndex: 3,
        explanation:
          'つけます (transitif, dengan partikel を) berarti menyalakan, sedangkan つきます (intransitif, dengan が) berarti menyala.',
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
  // BAB 3 · CHICK (N3 Menengah) — Stages 5–7 (Full Japanese)
  // =========================================================================
  {
    id: 'stage-4',
    order: 5,
    chapter: 'Bab 3 · CHICK (N3 Menengah)',
    jlptLevel: 'N3',
    title: '日常の語彙と基本文法',
    subtitle: 'Soal full bahasa Jepang · Kosakata & tata bahasa inti N3',
    xpReward: 95,
    questions: [
      {
        id: 's4-q1',
        tag: '語彙 N3',
        prompt: 'メールを送る前に、まちがいがないかもう一度（　　　）してください。',
        options: ['比較', '確認', '発表', '登録'],
        correctIndex: 1,
        explanation:
          '確認 (かくにん) berarti memeriksa / memastikan kembali sebelum mengirim email. (比較 = perbandingan, 発表 = pengumuman, 登録 = pendaftaran).',
      },
      {
        id: 's4-q2',
        tag: '文法 N3',
        prompt: '朝から少し熱がある（　　　）、今日の飲み会は欠席します。',
        options: ['のに', 'ながら', 'ので', 'ばかり'],
        correctIndex: 2,
        explanation:
          'ので menyatakan alasan secara objektif dan halus ("karena agak demam sejak pagi, saya izin tidak ikut").',
      },
      {
        id: 's4-q3',
        tag: '文法 N3',
        prompt: '毎日おそくまで練習した（　　　）、試合に負けてしまった。',
        options: ['のに', 'ので', 'ため', 'ように'],
        correctIndex: 0,
        explanation:
          'のに menyatakan hasil yang berlawanan dengan harapan ("padahal sudah latihan sampai malam setiap hari, tetap kalah").',
      },
      {
        id: 's4-q4',
        tag: '漢字 N3',
        prompt: '「努力」の読み方として最もよいものを一つ選びなさい。',
        options: ['つとめりょく', 'のうりょく', 'どうりょく', 'どりょく'],
        correctIndex: 3,
        explanation:
          '努力 dibaca どりょく yang berarti usaha keras. (能力 = のうりょく, 動力 = どうりょく).',
      },
      {
        id: 's4-q5',
        tag: '語彙 N3',
        prompt: '台風が近づいているため、明日の運動会は来週に（　　　）された。',
        options: ['参加', '延期', '賛成', '到着'],
        correctIndex: 1,
        explanation:
          '延期 (えんき) berarti ditunda ke jadwal lain ("karena topan mendekat, festival olahraga besok ditunda ke minggu depan").',
      },
    ],
  },
  {
    id: 'stage-n3-2',
    order: 6,
    chapter: 'Bab 3 · CHICK (N3 Menengah)',
    jlptLevel: 'N3',
    title: '原因・条件・対比の文法',
    subtitle: 'Soal full bahasa Jepang · 「〜おかげで」「〜せいで」「〜うちに」',
    xpReward: 100,
    questions: [
      {
        id: 'sn3-2-q1',
        tag: '文法 N3',
        prompt: '先生のご指導の（　　　）、無事にJLPTに合格することができた。',
        options: ['せいで', 'おかげで', 'わりに', 'くせに'],
        correctIndex: 1,
        explanation:
          '〜おかげで digunakan untuk penyebab yang membawa hasil positif ("berkat bimbingan guru, berhasil lulus JLPT").',
      },
      {
        id: 'sn3-2-q2',
        tag: '文法 N3',
        prompt: '昨夜遅くまで起きていた（　　　）、今日は一日中頭が痛い。',
        options: ['おかげで', 'わりに', 'せいで', 'とおりに'],
        correctIndex: 2,
        explanation:
          '〜せいで digunakan untuk penyebab yang menimbulkan akibat negatif ("gara-gara begadang semalam, hari ini sakit kepala").',
      },
      {
        id: 'sn3-2-q3',
        tag: '文法 N3',
        prompt: 'スープが冷めない（　　　）、どうぞ召し上がってください。',
        options: ['うちに', 'たびに', 'ばかりに', 'ところに'],
        correctIndex: 0,
        explanation:
          '〜うちに berarti "selagi kondisi masih berlangsung sebelum berubah" (selagi supnya belum dingin).',
      },
      {
        id: 'sn3-2-q4',
        tag: '語彙 N3',
        prompt: '長雨が続いたことが、今年の野菜の値段に大きな（　　　）を与えた。',
        options: ['利益', '準備', '習慣', '影響'],
        correctIndex: 3,
        explanation:
          '影響を与える (えいきょうをあたえる) adalah kolokasi alami yang berarti "memberikan pengaruh/dampak".',
      },
      {
        id: 'sn3-2-q5',
        tag: '文法 N3',
        prompt: 'このレストランは値段が安い（　　　）、料理がとてもおいしい。',
        options: ['せいで', 'わりに', 'とおり', 'ほど'],
        correctIndex: 1,
        explanation:
          '〜わりに berarti "untuk ukuran harganya yang murah, masakannya ternyata sangat enak" (di luar ekspektasi).',
      },
    ],
  },
  {
    id: 'stage-n3-3',
    order: 7,
    chapter: 'Bab 3 · CHICK (N3 Menengah)',
    jlptLevel: 'N3',
    title: '読解・敬語ボスステージ N3',
    subtitle: 'Soal full bahasa Jepang · Bacaan pendek & Keigo dasar N3',
    xpReward: 110,
    questions: [
      {
        id: 'sn3-3-q1',
        tag: '敬語 N3',
        prompt: '部長に対して「昼ごはんを食べましたか」とていねいに聞くときの表現として最も適切なものはどれか。',
        options: [
          '昼ごはんをいただきましたか。',
          '昼ごはんを召し上がりましたか。',
          '昼ごはんを参りましたか。',
          '昼ごはんを申しましたか。',
        ],
        correctIndex: 1,
        explanation:
          '召し上がる (めしあがる) adalah bentuk hormat (Sonkeigo) dari 食べる/飲む untuk menanyakan tindakan atasan, sedangkan いただく adalah Kenjougo untuk diri sendiri.',
      },
      {
        id: 'sn3-3-q2',
        tag: '読解 N3',
        passage:
          '最近の調査によると、毎日15分だけでも読書を続ける人は、休日にまとめて読む人より語彙力が伸びやすいという結果が出た。大切なのは一度の量ではなく、習慣にすることだ。',
        prompt: 'この文章によると、語彙力を伸ばすために大切なことは何か。',
        options: [
          '休日にまとめて長い本を読むこと',
          '毎日少しずつでも読み続けること',
          '難しい専門書を優先して選ぶこと',
          '一日に読むページ数を増やすこと',
        ],
        correctIndex: 1,
        explanation:
          'Kalimat penutup 「大切なのは一度の量ではなく、習慣にすることだ」 menegaskan bahwa membaca sedikit demi sedikit setiap hari lebih efektif daripada membaca sekaligus di hari libur.',
      },
      {
        id: 'sn3-3-q3',
        tag: '文法 N3',
        prompt: '説明書に書いてある（　　　）組み立てたら、うまくできた。',
        options: ['とおりに', 'かわりに', 'ついでに', 'とたんに'],
        correctIndex: 0,
        explanation:
          '〜とおりに berarti "sesuai dengan / persis seperti yang tertulis di buku petunjuk".',
      },
      {
        id: 'sn3-3-q4',
        tag: '漢字 N3',
        prompt: '「問題を解決する」の「解決」の読み方として最もよいものはどれか。',
        options: ['かいけつ', 'げけつ', 'かいせつ', 'かっけつ'],
        correctIndex: 0,
        explanation:
          '解決 dibaca かいけつ (penyelesaian masalah). Hati-hati tertukar dengan 解説 (かいせつ = penjelasan).',
      },
      {
        id: 'sn3-3-q5',
        tag: '文法 N3',
        prompt: '駅を出た（　　　）、急に強い雨が降り出した。',
        options: ['うちに', 'おかげで', 'かわりに', 'とたんに'],
        correctIndex: 3,
        explanation:
          'Bentuk-た + とたんに menyatakan kejadian tak terduga yang terjadi seketika tepat setelah aksi pertama.',
      },
    ],
  },

  // =========================================================================
  // BAB 4 · GROW (N2 Menengah Atas) — Stages 8–10 (Full Japanese)
  // =========================================================================
  {
    id: 'stage-5',
    order: 8,
    chapter: 'Bab 4 · GROW (N2 Menengah Atas)',
    jlptLevel: 'N2',
    title: 'N2 類義文法・文字語彙',
    subtitle: 'Soal full bahasa Jepang · Pembeda nuansa pola & kosakata N2',
    xpReward: 115,
    questions: [
      {
        id: 's5-q1',
        tag: '文法 N2',
        prompt: '日本に長く住んでいるからといって、漢字が全部読める（　　　）。',
        options: ['に違いない', 'わけではない', 'はずだ', 'ばかりだ'],
        correctIndex: 1,
        explanation:
          '〜からといって〜わけではない adalah pasangan tetap N2 untuk menyangkal kesimpulan mutlak ("meski tinggal lama di Jepang, bukan berarti bisa membaca semua kanji").',
      },
      {
        id: 's5-q2',
        tag: '文法 N2',
        prompt: '高い参考書を買ったからといって、必ず合格する（　　　）。',
        options: ['とは限らない', 'に過ぎない', 'わけがない', 'どころではない'],
        correctIndex: 0,
        explanation:
          '〜とは限らない berarti "belum tentu / tidak selalu demikian" (sering berpasangan dengan 必ず).',
      },
      {
        id: 's5-q3',
        tag: '文法 N2',
        prompt: '期末試験の直前で忙しく、テレビを見る（　　　）ではない。',
        options: ['ばかり', 'ほど', 'どころ', 'きり'],
        correctIndex: 2,
        explanation:
          '〜どころではない berarti situasi sangat tidak memungkinkan untuk melakukan hal tersebut ("jangankan menonton TV...").',
      },
      {
        id: 's5-q4',
        tag: '文字・語彙 N2',
        prompt: '「現状を正確に把握する」の「把握」の読み方として最もよいものはどれか。',
        options: ['はく', 'ばあく', 'はぎ', 'はあく'],
        correctIndex: 3,
        explanation:
          '把握 dibaca はあく yang berarti memahami / menguasai kondisi secara menyeluruh.',
      },
      {
        id: 's5-q5',
        tag: '文字・語彙 N2',
        prompt: '都合により、来週の会議の日程を（　　　）することになった。',
        options: ['変更', '変化', '交換', '転向'],
        correctIndex: 0,
        explanation:
          '変更 (へんこう) berarti mengubah jadwal/rencana secara sengaja. (変化 = perubahan alami, 交換 = pertukaran, 転向 = berganti haluan).',
      },
    ],
  },
  {
    id: 'stage-6',
    order: 9,
    chapter: 'Bab 4 · GROW (N2 Menengah Atas)',
    jlptLevel: 'N2',
    title: 'N2 読解・聴解ボスステージ',
    subtitle: 'Soal full bahasa Jepang · Pemahaman wacana & dialog kerja N2',
    xpReward: 135,
    questions: [
      {
        id: 's6-q1',
        tag: '読解 N2',
        passage:
          'オンライン学習は時間や場所を選ばないという利点がある一方で、学習計画を自分で立てなければ継続が難しい。そのため、定期的な進捗確認の仕組みが重要になる。',
        prompt: '筆者がこの文章で最も述べたいことは何か。',
        options: [
          'オンライン学習は通学より効率が高い',
          '学習を続けるには定期的な振り返りの仕組みが欠かせない',
          '自分の予定に合わせて学習時間を減らすべきだ',
          '学習計画は専門家だけに任せたほうがよい',
        ],
        correctIndex: 1,
        explanation:
          'Penanda 「そのため」 mengantar kesimpulan utama penulis: mekanisme pengecekan progres berkala (定期的な進捗確認の仕組み) sangat penting agar belajar online bisa berlanjut.',
      },
      {
        id: 's6-q2',
        tag: '読解 N2',
        passage:
          '新しいシステムは作業時間を短縮できる一方、慣れるまでは確認作業が増えるため、導入直後は負担が減らないこともある。',
        prompt: '新しいシステムについて、文章の内容と合っているものはどれか。',
        options: [
          '導入してすぐは作業時間が増え続ける',
          '慣れてくると確認作業が不要になる',
          '導入したばかりの時期は負担が軽くならない場合がある',
          '作業時間を短くする効果は期待できない',
        ],
        correctIndex: 2,
        explanation:
          'Frasa 「導入直後は負担が減らないこともある」 selaras dengan opsi 3: sesaat setelah diterapkan, beban kerja ada kalanya belum langsung berkurang sebelum terbiasa.',
      },
      {
        id: 's6-q3',
        tag: '聴解 N2',
        passage:
          '女：「資料の印刷、今からお願いできますか。」\n男：「すみません、今プリンターの紙が切れていて。補充してからすぐやりますね。」',
        prompt: '男の人はこの後まず何をするか。',
        options: [
          'プリンターに紙を入れる',
          '別の部署へ資料を取りに行く',
          '女の人に印刷を代わってもらう',
          '印刷済みの資料を会議室へ運ぶ',
        ],
        correctIndex: 0,
        explanation:
          '補充してからすぐやります berarti pembicara laki-laki akan mengisi ulang kertas printer terlebih dahulu sebelum mencetak.',
      },
      {
        id: 's6-q4',
        tag: '文字・語彙 N2',
        prompt: '最近の若者は、テレビより動画サイトを見る（　　　）が強い。',
        options: ['決定', '制限', '協力', '傾向'],
        correctIndex: 3,
        explanation:
          '傾向が強い (けいこうがつよい) adalah frasa umum N2 yang berarti "memiliki kecenderungan/tren yang kuat".',
      },
      {
        id: 's6-q5',
        tag: '文法 N2',
        prompt: '何度も注意した（　　　）、同じミスが繰り返されている。',
        options: ['おかげで', 'にもかかわらず', 'ばかりに', 'ついでに'],
        correctIndex: 1,
        explanation:
          '〜にもかかわらず berarti "meskipun sudah berulang kali diingatkan, kesalahan yang sama tetap terulang".',
      },
    ],
  },
  {
    id: 'stage-n2-3',
    order: 10,
    chapter: 'Bab 4 · GROW (N2 Menengah Atas)',
    jlptLevel: 'N2',
    title: 'N2 ビジネス・フォーマル表現',
    subtitle: 'Soal full bahasa Jepang · 「〜に際して」「〜をもとに」「〜ざるを得ない」',
    xpReward: 145,
    questions: [
      {
        id: 'sn2-3-q1',
        tag: '文法 N2',
        prompt: '海外出張（　　　）、事前にビザの有効期限を確認してください。',
        options: ['に際して', 'にかけて', 'につれて', 'にしたがって'],
        correctIndex: 0,
        explanation:
          '〜に際して dipakai dalam konteks formal untuk menyatakan "pada saat / kesempatan khusus melakukan suatu hal".',
      },
      {
        id: 'sn2-3-q2',
        tag: '文法 N2',
        prompt: '今回のアンケート結果（　　　）、新しい研修プログラムを作成した。',
        options: ['をめぐって', 'をもとに', 'をはじめ', 'にかわって'],
        correctIndex: 1,
        explanation:
          '〜をもとに berarti "berdasarkan / menjadikan A sebagai bahan dasar untuk menyusun B".',
      },
      {
        id: 'sn2-3-q3',
        tag: '文法 N2',
        prompt: '台風で交通機関が止まったため、本日の説明会は中止に（　　　）。',
        options: [
          'するわけがない',
          'しないではいられない',
          'せざるを得ない',
          'するに決まっている',
        ],
        correctIndex: 2,
        explanation:
          '〜ざるを得ない (dengan する → せざるを得ない) berarti "terpaksa harus dilakukan karena tidak ada pilihan lain".',
      },
      {
        id: 'sn2-3-q4',
        tag: '文字・語彙 N2',
        prompt: '来期の予算配分については、次回の役員会で改めて（　　　）する予定だ。',
        options: ['拒否', '複製', '解約', '検討'],
        correctIndex: 3,
        explanation:
          '検討する (けんとうする) berarti meninjau atau mempertimbangkan secara cermat dalam rapat.',
      },
      {
        id: 'sn2-3-q5',
        tag: '文法 N2',
        prompt: 'このコンテストは年齢や経験（　　　）、どなたでも応募できます。',
        options: ['を問わず', 'を通じて', 'をこめて', 'を機に'],
        correctIndex: 0,
        explanation:
          '〜を問わず berarti "tanpa memandang / tidak dibatasi oleh (usia, pengalaman, dsb.)".',
      },
    ],
  },

  // =========================================================================
  // BAB 5 · FLY (N1 Mahir) — Stages 11–12 (Full Japanese)
  // =========================================================================
  {
    id: 'stage-n1-1',
    order: 11,
    chapter: 'Bab 5 · FLY (N1 Mahir)',
    jlptLevel: 'N1',
    title: 'N1 語彙・上級文法ニュアンス',
    subtitle: 'Soal full bahasa Jepang · Ungkapan formal & kosakata abstrak N1',
    xpReward: 165,
    questions: [
      {
        id: 'sn1-1-q1',
        tag: '文法 N1',
        prompt: '長年経験を積んだプロの料理人（　　　）、この繊細な味付けを再現するのは容易ではない。',
        options: ['ならでは', 'といえども', 'ながらも', 'ともなると'],
        correctIndex: 1,
        explanation:
          '〜といえども adalah bentuk formal tingkat N1 dari 「〜ても」 ("sekalipun seorang koki profesional berpengalaman...").',
      },
      {
        id: 'sn1-1-q2',
        tag: '文法 N1',
        prompt: 'この柔らかな光沢は、老舗の職人の手仕事（　　　）仕上がりだ。',
        options: ['ならではの', 'をよそに', 'ならまだしも', 'なくしての'],
        correctIndex: 0,
        explanation:
          '〜ならではの memuji keistimewaan yang hanya mungkin dihasilkan oleh subjek tersebut ("hasil khas yang hanya bisa dibuat oleh...").',
      },
      {
        id: 'sn1-1-q3',
        tag: '文字・語彙 N1',
        prompt: '「迅速な対応に感謝いたします」の「迅速」の読み方として最もよいものはどれか。',
        options: ['しんそく', 'じんそく', 'じゅんそく', 'ぜんそく'],
        correctIndex: 1,
        explanation:
          '迅速 dibaca じんそく yang berarti cepat, tanggap, dan sigap.',
      },
      {
        id: 'sn1-1-q4',
        tag: '文法 N1',
        prompt: '地域住民の協力（　　　）、この防災計画の実現は不可能だっただろう。',
        options: ['を皮切りに', 'を余儀なくされ', 'なくしては', 'にひきかえ'],
        correctIndex: 2,
        explanation:
          '〜なくしては menyatakan syarat mutlak ("tanpa kerja sama warga setempat, rencana ini mustahil terwujud").',
      },
      {
        id: 'sn1-1-q5',
        tag: '文字・語彙 N1',
        prompt: '安全基準に関しては、いかなる事情があっても一切（　　　）は許されない。',
        options: ['義務', '対立', '省略', '妥協'],
        correctIndex: 3,
        explanation:
          '妥協 (だきょう) berarti kompromi ("soal standar keselamatan, kompromi sedikit pun tidak dapat ditoleransi").',
      },
    ],
  },
  {
    id: 'stage-n1-2',
    order: 12,
    chapter: 'Bab 5 · FLY (N1 Mahir)',
    jlptLevel: 'N1',
    title: 'JLPT N1 総合ボスステージ',
    subtitle: 'Soal full bahasa Jepang · Analisis argumen Dokkai & Bunpou N1',
    xpReward: 190,
    questions: [
      {
        id: 'sn1-2-q1',
        tag: '読解 N1',
        passage:
          '効率ばかりを追い求めるあまり、試行錯誤の時間を削ってしまっては、長期的な革新は生まれない。一見無駄に見える回り道こそが、新たな発想の土壌となるのである。',
        prompt: '筆者の主張に最も近いものはどれか。',
        options: [
          '成果を早く出すには回り道を省くべきだ',
          '一見遠回りに見える試行錯誤が革新の土台になる',
          '効率を重視する組織ほど新しい発想が生まれやすい',
          '長期的な計画よりも短期的な成果を優先すべきだ',
        ],
        correctIndex: 1,
        explanation:
          'Frasa 「一見無駄に見える回り道こそが、新たな発想の土壌となる」 menegaskan bahwa proses coba-coba (試行錯誤) yang tampak memutar justru menjadi tanah subur bagi inovasi.',
      },
      {
        id: 'sn1-2-q2',
        tag: '文法 N1',
        prompt: '大雨による土砂崩れのため、屋外イベントは中止（　　　）。',
        options: [
          'を余儀なくされた',
          'にとどまらず',
          'に堪えない',
          'を踏まえて',
        ],
        correctIndex: 0,
        explanation:
          '〜を余儀なくされる adalah ungkapan formal/berita N1 yang berarti "terpaksa mengalami/melakukan akibat situasi di luar kendali".',
      },
      {
        id: 'sn1-2-q3',
        tag: '文法 N1',
        prompt: '前回の調査で明らかになった課題（　　　）、次期の施策を見直す必要がある。',
        options: ['をよそに', 'を踏まえて', 'にかまけて', 'をものともせず'],
        correctIndex: 1,
        explanation:
          '〜を踏まえて berarti "berpijak pada / dengan mempertimbangkan hasil atau fakta sebelumnya".',
      },
      {
        id: 'sn1-2-q4',
        tag: '文字・語彙 N1',
        prompt: '具体的なデータに裏づけられた彼女の提案は、極めて（　　　）に富んでいる。',
        options: ['持久力', '判断力', '説得力', '強制力'],
        correctIndex: 2,
        explanation:
          '説得力に富む (せっとくりょくにとむ) adalah ungkapan alami N1 yang berarti "kaya akan daya persuasi / sangat meyakinkan".',
      },
      {
        id: 'sn1-2-q5',
        tag: '文法 N1',
        prompt: '周囲の強い反対（　　　）、彼は自分の信じた研究テーマを貫いた。',
        options: ['に際して', 'に即して', 'にあたって', 'をよそに'],
        correctIndex: 3,
        explanation:
          '〜をよそに berarti "mengabaikan / tidak mempedulikan kekhawatiran atau penentangan orang di sekitar".',
      },
    ],
  },
];
