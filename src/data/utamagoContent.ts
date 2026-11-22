export type JlptSection = 'Moji-Goi' | 'Bunpou' | 'Dokkai' | 'Choukai';

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface WhyItem {
  number: string;
  title: string;
  description: string;
}

export interface PillarItem {
  id: 'fondasi' | 'struktur' | 'penerapan' | 'evaluasi';
  step: string;
  label: string;
  title: string;
  description: string;
  bullets: string[];
}

export interface RoadmapStage {
  stage: 'EGG' | 'HATCH' | 'CHICK' | 'GROW' | 'FLY';
  level: JlptLevel;
  summary: string;
  available: boolean;
  illustrationPath: string;
  illustrationAlt: string;
  focus: string;
  milestones: string[];
}

export interface ReportSectionRow {
  section: JlptSection;
  score: number;
  recommendation: string;
}

export interface MiniTryOutQuestion {
  id: string;
  section: JlptSection;
  prompt: string;
  passage?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const BRAND_ASSETS = {
  logoPath: '/assets/aistudio/Logo_bg_putih_017d0900.jpg',
  bannerPath: '/assets/aistudio/Banner_55d8051f.png',
};

export const SHOW_TESTIMONIALS = false;

export const WHY_UTAMAGO: WhyItem[] = [
  {
    number: '01',
    title: 'Terstruktur',
    description:
      'Materi disusun bertahap, jadi kamu tidak bingung harus mulai dari mana.',
  },
  {
    number: '02',
    title: 'Spaced Repetition',
    description:
      'Kanji dan kosakata diulang berjarak lewat Anki, supaya bertahan di ingatan jangka panjang.',
  },
  {
    number: '03',
    title: 'Latihan Terapan',
    description:
      'Bunpou dan Dokkai melatihmu memakai bahasa Jepang, bukan sekadar mengenalinya.',
  },
  {
    number: '04',
    title: 'Terukur',
    description:
      'Try Out dan Laporan Belajar menunjukkan kekuatan dan kelemahanmu dengan jelas.',
  },
];

export const PILLARS: PillarItem[] = [
  {
    id: 'fondasi',
    step: '01',
    label: 'FONDASI',
    title: 'Kanji & Moji-Goi (Anki)',
    description:
      'Bangun fondasi kosakata dan huruf lewat deck Anki dengan sistem pengulangan berjarak.',
    bullets: [
      'Pengenalan Kanji, arti, dan cara baca',
      'Penguasaan kosakata',
      'Contoh penggunaan dalam kalimat',
      'Pengulangan terjadwal',
    ],
  },
  {
    id: 'struktur',
    step: '02',
    label: 'STRUKTUR',
    title: 'Bunpou',
    description:
      'Pahami pola tata bahasa lewat penjelasan runtut, contoh kalimat, dan perbandingan pola yang mirip.',
    bullets: [
      'Makna dan fungsi tiap pola',
      'Perbedaan nuansa antarpola',
      'Latihan pemahaman',
    ],
  },
  {
    id: 'penerapan',
    step: '03',
    label: 'PENERAPAN',
    title: 'Dokkai',
    description:
      'Terapkan kosakata dan tata bahasa lewat latihan membaca bertahap.',
    bullets: [
      'Menemukan ide pokok dan informasi penting',
      'Memahami hubungan antarkalimat',
      'Menangkap maksud penulis',
      'Strategi menjawab soal Dokkai',
    ],
  },
  {
    id: 'evaluasi',
    step: '04',
    label: 'UJI & EVALUASI',
    title: 'Try Out JLPT & Laporan Belajar',
    description:
      'Kerjakan simulasi soal dengan batas waktu, ikuti sesi pembahasan, lalu terima Laporan Belajar berisi persentase kemampuan per bagian dan rekomendasi langkah berikutnya.',
    bullets: [
      'Simulasi soal dengan batas waktu nyata',
      'Sesi pembahasan mendalam per nomor',
      'Laporan Belajar berbasis persentase per bagian',
      'Rekomendasi latihan berikutnya yang terarah',
    ],
  },
];

export const ANKI_SAMPLE_CARDS = [
  {
    kanji: '把握',
    reading: 'はあく (haaku)',
    meaning: 'Memahami secara menyeluruh / menggenggam inti persoalan',
    example: '現状を正確に把握することが大切だ。',
    translation: 'Penting untuk memahami kondisi saat ini secara akurat.',
  },
  {
    kanji: '傾向',
    reading: 'けいこう (keikou)',
    meaning: 'Kecenderungan / tren',
    example: '最近の試験には新しい傾向が見られる。',
    translation: 'Pada ujian akhir-akhir ini terlihat kecenderungan baru.',
  },
];

export const BUNPOU_COMPARISON = [
  {
    pattern: '〜わけではない',
    nuance: 'Menyangkal kesimpulan penuh ("bukan berarti selalu...")',
    example: '日本に住んでいるからといって、漢字が全部読めるわけではない。',
    translation: 'Tinggal di Jepang bukan berarti bisa membaca semua Kanji.',
  },
  {
    pattern: '〜とは限らない',
    nuance: 'Menyatakan ada pengecualian ("belum tentu...")',
    example: '高い教材を買えば、必ず合格するとは限らない。',
    translation: 'Membeli materi mahal belum tentu menjamin pasti lulus.',
  },
];

export const ROADMAP_STAGES: RoadmapStage[] = [
  {
    stage: 'EGG',
    level: 'N5',
    summary: 'Membangun fondasi dasar bahasa Jepang.',
    available: true,
    illustrationPath: '/src/assets/images/stage_egg_n5_1795072569641.jpg',
    illustrationAlt: 'Ilustrasi tahap EGG JLPT N5 — telur dengan hachimaki',
    focus: 'Deck Anki Kosakata JLPT N5 (654 kartu), Materi & Anki Bunpou N5 (72 pola dalam 12 bab TRY! JLPT N5) sudah tersedia gratis di aplikasi.',
    milestones: ['654 kartu Anki Kosakata N5', '72 pola Bunpou N5 (Materi & Anki)', '2 contoh kalimat & arti Indonesia'],
  },
  {
    stage: 'HATCH',
    level: 'N4',
    summary: 'Mulai memakai bahasa Jepang dalam situasi sehari-hari.',
    available: true,
    illustrationPath: '/src/assets/images/stage_hatch_n4_1795072570966.jpg',
    illustrationAlt: 'Ilustrasi tahap HATCH JLPT N4 — anak ayam menetas dari cangkang',
    focus: 'Deck Anki Kosakata JLPT N4 (567 kartu), Materi & Anki Bunpou N4 (99 pola dalam 40 bab Shin Kanzen Master), dan tantangan level N4 tersedia gratis.',
    milestones: ['567 kartu Anki Kosakata N4', '99 pola Bunpou N4 (Materi & Anki)', 'Tantangan level Bab 2'],
  },
  {
    stage: 'CHICK',
    level: 'N3',
    summary: 'Memahami bahasa Jepang dalam berbagai konteks.',
    available: true,
    illustrationPath: '/src/assets/images/stage_chick_n3_1795072571171.jpg',
    illustrationAlt: 'Ilustrasi tahap CHICK JLPT N3 — anak ayam keluar penuh semangat',
    focus: 'Deck Anki Kosakata JLPT N3 (1.641 kartu), Materi & Anki Bunpou N3 (144 pola dalam 28 bab & ringkasan), serta tantangan level N3 tersedia gratis.',
    milestones: ['1.641 kartu Anki Kosakata N3', '144 pola Bunpou N3 (Materi & Anki)', 'Cara baca, rumus & 2 contoh kalimat'],
  },
  {
    stage: 'GROW',
    level: 'N2',
    summary: 'Menguasai bahasa Jepang yang lebih kompleks.',
    available: true,
    illustrationPath: '/src/assets/images/stage_grow_n2_1795072570529.jpg',
    illustrationAlt: 'Ilustrasi tahap GROW JLPT N2 — maskot belajar sambil memegang buku',
    focus: 'Deck Anki Kosakata N2 (1.685 kartu), Materi & Anki Bunpou N2 (141 pola), serta 6 paket Try Out JLPT N2 terverifikasi (2010.07–2012.12) lengkap kunci resmi, audio, & transkrip Choukai.',
    milestones: ['1.685 kartu Anki N2 + 141 pola Bunpou', '6 paket Try Out N2 terverifikasi (2010–2012)', 'Kunci resmi, audio & transkrip Choukai'],
  },
  {
    stage: 'FLY',
    level: 'N1',
    summary: 'Mencapai pemahaman tingkat lanjut.',
    available: true,
    illustrationPath: '/src/assets/images/stage_fly_n1_1795072570015.jpg',
    illustrationAlt: 'Ilustrasi tahap FLY JLPT N1 — maskot terbang mengepakkan sayap',
    focus: 'Deck Anki Kosakata N1 (2.866 kartu) serta Materi & Anki Bunpou N1 (97 pola dalam 20 bab). Paket Try Out JLPT N1 sementara terkunci menunggu verifikasi soal & kunci resmi.',
    milestones: ['2.866 kartu Anki N1 + 97 pola Bunpou', 'Materi per bab & komparasi lintas level', 'Try Out N1 sementara terkunci'],
  },
];

export const SAMPLE_N3_REPORT: {
  title: string;
  average: number;
  rows: ReportSectionRow[];
  disclaimer: string;
} = {
  title: 'JLPT N3 — TRY OUT REPORT (Ilustrasi)',
  average: 60,
  rows: [
    {
      section: 'Moji-Goi',
      score: 70,
      recommendation: 'Pertahankan konsistensi pengulangan kosakata.',
    },
    {
      section: 'Bunpou',
      score: 65,
      recommendation: 'Perkuat pemahaman pola dan penggunaannya.',
    },
    {
      section: 'Dokkai',
      score: 45,
      recommendation: 'Latih pemahaman teks dan kecepatan membaca.',
    },
    {
      section: 'Choukai',
      score: 60,
      recommendation: 'Latih fokus menyimak poin inti dan transisi percakapan.',
    },
  ],
  disclaimer:
    'Angka di atas hanya ilustrasi tampilan laporan, bukan hasil peserta sebenarnya. Laporan ini adalah evaluasi UtamaGo! dan bukan skor resmi JLPT.',
};

export const MINI_TRYOUT_QUESTIONS: MiniTryOutQuestion[] = [
  {
    id: 'q-mojigoi',
    section: 'Moji-Goi',
    prompt: 'Pilih cara baca yang tepat untuk kata bergaris bawah: 「会議の日程を 変更 する。」',
    options: ['へんこう (henkou)', 'へんか (henka)', 'かいこう (kaikou)', 'かわる (kawaru)'],
    correctIndex: 0,
    explanation: '変更 dibaca へんこう (henkou) yang berarti "perubahan / mengubah jadwal atau rencana".',
  },
  {
    id: 'q-bunpou',
    section: 'Bunpou',
    prompt: 'Lengkapi kalimat berikut: 「毎日練習した＿＿＿＿、試合で勝つことができなかった。」',
    options: ['にもかかわらず', 'おかげで', 'ばかりに', 'ついでに'],
    correctIndex: 0,
    explanation: '〜にもかかわらず berarti "meskipun sudah..." dan menunjukkan hasil yang bertolak belakang dari usaha.',
  },
  {
    id: 'q-dokkai',
    section: 'Dokkai',
    passage:
      '新しいシステムは作業時間を短縮できる一方、慣れるまでは確認作業が増えるため、導入直後は負担が減らないこともある。',
    prompt: 'Berdasarkan teks singkat di atas, pernyataan mana yang sesuai?',
    options: [
      'Setelah sistem baru diterapkan, beban kerja tidak selalu langsung berkurang di awal.',
      'Sistem baru selalu gagal mempersingkat waktu pengerjaan.',
      'Semua karyawan langsung terbiasa tanpa perlu proses pengecekan tambahan.',
      'Sistem baru membuat waktu kerja menjadi dua kali lebih lama selamanya.',
    ],
    correctIndex: 0,
    explanation: 'Kalimat menyatakan bahwa hingga terbiasa (慣れるまで), pengecekan bertambah sehingga beban sesaat setelah pengenalan tidak selalu berkurang.',
  },
  {
    id: 'q-choukai',
    section: 'Choukai',
    passage:
      'Transkrip Audio — A:「資料の印刷、今からお願いできますか。」 B:「すみません、今プリンターの紙が切れていて。補充してからすぐやりますね。」',
    prompt: 'Apa yang akan dilakukan pembicara B setelah percakapan ini?',
    options: [
      'Mengisi kertas printer terlebih dahulu, lalu mencetak dokumen.',
      'Menolak permintaan pencetakan dokumen secara permanen.',
      'Meminta pembicara A membeli printer baru.',
      'Langsung menyerahkan dokumen yang sudah selesai dicetak.',
    ],
    correctIndex: 0,
    explanation: 'Frasa 「補充してからすぐやります」 berarti B akan mengisi ulang kertas dulu baru segera mencetak.',
  },
];

export const FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'UtamaGo! cocok untuk siapa?',
    answer:
      'Untuk pembelajar bahasa Jepang dari tingkat dasar hingga mahir (JLPT N5 sampai N1) yang ingin persiapan terstruktur lewat flashcard kosakata Anki, materi Bunpou, tantangan bertahap, serta evaluasi Try Out secara berkala.',
  },
  {
    id: 'faq-2',
    question: 'Apakah seluruh materi di aplikasi ini gratis?',
    answer:
      'Ya, 100% gratis. Kamu bisa langsung memakai 10 deck Anki independen (Kosakata JLPT N5–N1 & Bunpou JLPT N5–N1), materi Bunpou lengkap N5–N1 per bab (553 pola) beserta komparasi pola mirip lintas level, Level Tantangan, serta 6 paket Try Out JLPT N2 terverifikasi (2010–2012) lengkap dengan kunci resmi, audio, dan transkrip Choukai tanpa biaya apapun.',
  },
  {
    id: 'faq-3',
    question: 'Materi dan level apa saja yang sudah tersedia?',
    answer:
      'Saat ini tersedia Deck Anki Kosakata lengkap JLPT N5 (654 kartu), N4 (567 kartu), N3 (1.641 kartu), N2 (1.685 kartu), dan N1 (2.866 kartu) lengkap arti Indonesia & 2 contoh kalimat; Materi per bab & Deck Anki Bunpou lengkap JLPT N5 (72 pola · 12 bab TRY!), JLPT N4 (99 pola · 40 bab), JLPT N3 (144 pola · 28 bab & ringkasan), JLPT N2 (141 pola · 26 bab), dan JLPT N1 (97 pola · 20 bab) — total 553 pola tata bahasa lengkap komparasi lintas level; Level Tantangan N5–N2; serta 6 paket Try Out JLPT N2 terverifikasi (Juli 2010 – Desember 2012) lengkap soal asli, kunci jawaban resmi, audio, dan transkrip Choukai (paket lainnya sementara terkunci menunggu verifikasi).',
  },
  {
    id: 'faq-4',
    question: 'Bagaimana cara memakai fitur kartu Anki di UtamaGo!?',
    answer:
      'Tidak perlu instal aplikasi tambahan. Buka tab Anki, pilih Kosakata (N5–N1) atau Bunpou (N5–N1), lalu mulai sesi pop-up. Setiap deck punya progres dan pengaturan independen. Kamu bisa langsung menggeser kartu ke kanan jika sudah hafal (Bagus), menggeser ke kiri untuk mengulang (Lagi), atau memilih tombol Lagi, Sulit, Bagus, dan Mudah dengan jadwal pengulangan berkala otomatis.',
  },
  {
    id: 'faq-5',
    question: 'Apa bedanya Bunpou dan Dokkai?',
    answer:
      'Bunpou berfokus pada pola tata bahasa, rumus sambungan, makna, dan perbedaan nuansa. Dokkai berfokus pada kemampuan membaca, menemukan ide pokok, dan memahami maksud penulis.',
  },
  {
    id: 'faq-6',
    question: 'Bagaimana cara mengerjakan Try Out JLPT N2 & membaca transkrip Choukai?',
    answer:
      'Masuk ke tab Try Out, lalu pilih JLPT N2 untuk mengakses 6 paket soal asli terverifikasi (2010.07–2012.12). Paket N2 2013–2018, seluruh paket N1, dan Mini Simulasi sementara dikunci menunggu verifikasi soal resmi. Di setiap paket N2 yang terbuka, kamu bisa mengerjakan Moji-Goi & Bunpou, Dokkai, serta Choukai (dilengkapi pemutar audio MP3). Transkrip Choukai (聴力原文) terbuka otomatis pada halaman evaluasi setelah kamu mengumpulkan jawaban.',
  },
  {
    id: 'faq-7',
    question: 'Apakah bisa dijalankan secara offline?',
    answer:
      'Sebagian besar fitur—seperti seluruh deck Anki Kosakata N5–N1, Materi & Anki Bunpou N5–N1 (553 pola), level tantangan, serta soal teks dan transkrip Choukai Try Out N2—tersimpan lokal di perangkatmu. Pemutaran audio Choukai membutuhkan koneksi internet agar rekaman dapat diputar dengan lancar.',
  },
  {
    id: 'faq-8',
    question: 'Apakah Try Out UtamaGo! sama dengan JLPT resmi?',
    answer:
      'Tidak. UtamaGo! adalah aplikasi persiapan belajar gratis dan bukan penyelenggara resmi JLPT. Hasil Try Out dan estimasi level adalah evaluasi latihan, bukan skor resmi.',
  },
];
