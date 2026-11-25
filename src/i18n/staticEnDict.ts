/**
 * Instant synchronous Indonesian -> English dictionary, dynamic regex patterns,
 * and smart Indonesian text detector for UtamaGo!.
 *
 * Used by the DOM auto-translator for 0ms UI translation before batching any
 * remaining dynamic content (Anki flashcards, Bunpou notes, FAQ, etc.) to
 * /api/translate-batch.
 */

export const STATIC_EN_DICT: Record<string, string> = {
  // Navigation & global actions
  'Beranda': 'Home',
  'Belajar': 'Learn',
  'Materi': 'Lessons',
  'Materi & Bunpou': 'Lessons & Grammar',
  'Tantangan': 'Challenge',
  'Arena Tantangan': 'Challenge Arena',
  'Arena Tantangan JLPT': 'JLPT Challenge Arena',
  'Try Out': 'Try Out',
  'Try Out JLPT': 'JLPT Try Out',
  'Profil': 'Profile',
  'Profil & Pengaturan': 'Profile & Settings',
  'Pengaturan': 'Settings',
  'Pesan': 'Messages',
  'Keluar': 'Sign Out',
  'Keluar Akun': 'Sign Out',
  'Masuk': 'Sign In',
  'Daftar': 'Sign Up',
  'Kembali': 'Back',
  'Lanjut': 'Continue',
  'Lanjutkan': 'Continue',
  'Mulai': 'Start',
  'Mulai Belajar': 'Start Studying',
  'Selesai': 'Done',
  'Simpan': 'Save',
  'Simpan Perubahan': 'Save Changes',
  'Simpan Catatan': 'Save Note',
  'Simpan & Mulai Belajar': 'Save & Start Studying',
  'Batal': 'Cancel',
  'Tutup': 'Close',
  'Hapus': 'Delete',
  'Ubah': 'Edit',
  'Ubah Filter': 'Change Filter',
  'Ubah Jawaban': 'Change Answer',
  'Reset': 'Reset',
  'Reset Isian': 'Reset Answers',
  'Reset Pengaturan ke Default': 'Reset Settings to Default',
  'Reset Semua Progres Belajar': 'Reset All Study Progress',
  'Terapkan ke Semua Deck': 'Apply to All Decks',
  'Muat Ulang': 'Reload',
  'Coba Lagi': 'Try Again',
  'Segarkan': 'Refresh',
  'Perbesar': 'Zoom In',
  'Cari': 'Search',
  'Filter': 'Filter',
  'Filter & Opsi': 'Filters & Options',
  'Daftar & Cari': 'Browse & Search',
  'Semua': 'All',
  'Semua Level': 'All Levels',
  'Semua Kategori': 'All Categories',
  'Lainnya': 'Other',
  'Sebelumnya': 'Previous',
  'Berikutnya': 'Next',
  'Bab Sebelumnya': 'Previous Chapter',
  'Bab Berikutnya': 'Next Chapter',
  'Lembar Prev': 'Prev Sheet',
  'Lembar Next': 'Next Sheet',
  'Kembali ke Bagian': 'Back to Sections',
  'Kembali ke Paket': 'Back to Packets',
  'Kembali ke Profil': 'Back to Profile',
  'Aktifkan': 'Enable',
  'Nonaktifkan': 'Disable',
  'Aktif': 'Active',
  'Terkunci': 'Locked',
  'Tunda': 'Suspend',
  'Favorit': 'Favorites',
  'Segera Hadir': 'Coming Soon',
  'Gratis': 'Free',
  'Baru': 'New',
  'Ditinjau': 'Reviewed',
  'Progres': 'Progress',
  'Statistik': 'Statistics',
  'Riwayat': 'History',
  'Catatan': 'Notes',
  'Ringkasan': 'Summary',
  'Detail': 'Details',
  'Bantuan': 'Help',
  'Tentang': 'About',
  'Tentang UtamaGo!': 'About UtamaGo!',
  'Pertanyaan Umum': 'FAQ',

  // Anki & Flashcards
  'Anki Kosakata': 'Anki Vocabulary',
  'Anki Bunpou': 'Anki Grammar',
  'Kosakata': 'Vocabulary',
  'Kosakata JLPT': 'JLPT Vocabulary',
  'Latih Kosakata Anki': 'Practice Anki Vocab',
  'Pelajari Materi Bunpou': 'Study Grammar Lessons',
  'Buka Materi Bunpou': 'Open Grammar Lessons',
  'Buka Kamus Kosakata': 'Open Vocab Dictionary',
  'Kamus N5–N1': 'N5–N1 Dictionary',
  'Kamus Kosakata': 'Vocabulary Dictionary',
  'Lihat Jawaban': 'Show Answer',
  'Tampilkan Jawaban': 'Show Answer',
  'Sembunyikan Jawaban': 'Hide Answer',
  'Lagi': 'Again',
  'Ulang': 'Again',
  'Ulangi': 'Repeat',
  'Sulit': 'Hard',
  'Bagus': 'Good',
  'Baik': 'Good',
  'Mudah': 'Easy',
  'Dikuasai': 'Mastered',
  'Jatuh Tempo': 'Due',
  'Kartu Baru': 'New Cards',
  'Sedang Dipelajari': 'Learning',
  'Ulasan': 'Reviews',
  'Ulasan Hari Ini': "Today's Reviews",
  'Buka Pop-up Kartu': 'Open Card Popup',
  'Latih Semua Kartu (Pop-up)': 'Practice All Cards (Popup)',
  'Cari & Tandai Kartu Favorit': 'Search & Bookmark Favorite Cards',
  'Acak (Fisher-Yates Harian)': 'Shuffle (Daily Fisher-Yates)',
  'Berurutan Sesuai Daftar': 'Sequential Order',
  'Acak di Antara Kartu Tempo': 'Shuffle Due Cards',
  'Tandai ke Kata Sulit': 'Add to Difficult Words',
  'Hapus dari Kata Sulit': 'Remove from Difficult Words',
  'Kata Sulit': 'Difficult Words',
  'Masih Sulit': 'Still Hard',
  'Sudah Ingat': 'Remembered',
  'Latih Tulis Kanji': 'Practice Writing Kanji',
  'Arti': 'Meaning',
  'Contoh Kalimat': 'Example Sentences',
  'Cara Baca': 'Reading',
  'Bacaan': 'Reading',
  'Penggunaan': 'Usage',
  'Nuansa': 'Nuance',
  'Rumus': 'Formula',
  'Rumus Sambungan': 'Connection Formula',
  'Sambungan': 'Connection',
  'Perbandingan': 'Comparison',
  'Paham': 'Understood',
  'Daftar Bab': 'Chapter List',
  'Uji Pemahaman Topik Ini (5 Soal)': 'Quiz This Topic (5 Questions)',
  'Kuis Campuran Lintas Topik': 'Mixed Cross-Topic Quiz',

  // Parts of speech (Anki cards)
  'Kata benda': 'Noun',
  'Kata kerja': 'Verb',
  'Kata kerja (Ichidan)': 'Ichidan Verb',
  'Kata kerja (Godan)': 'Godan Verb',
  'Kata kerja (Ichidan) - transitif': 'Ichidan Verb (transitive)',
  'Kata kerja (Ichidan) - intransitif': 'Ichidan Verb (intransitive)',
  'Kata kerja (Godan) - transitif': 'Godan Verb (transitive)',
  'Kata kerja (Godan) - intransitif': 'Godan Verb (intransitive)',
  'Kata kerja (Suru)': 'Suru Verb',
  'Kata kerja (Tidak beraturan)': 'Irregular Verb',
  'Kata sifat-i': 'i-Adjective',
  'Kata sifat-na': 'na-Adjective',
  'Kata sifat': 'Adjective',
  'Kata keterangan': 'Adverb',
  'Kata ganti': 'Pronoun',
  'Kata sambung': 'Conjunction',
  'Kata depan': 'Preposition',
  'Kata seru': 'Interjection',
  'Kata bilangan': 'Counter / Number',
  'Kata bantu': 'Auxiliary',
  'Partikel': 'Particle',
  'Ungkapan': 'Expression',
  'Awalan': 'Prefix',
  'Akhiran': 'Suffix',
  'Frasa': 'Phrase',
  'Idiom': 'Idiom',
  'Penggolong': 'Counter',

  // Challenge Arena & Modes
  'Main Lagi': 'Play Again',
  'Main Lagi (Acak Baru)': 'Play Again (New Shuffle)',
  'Acak Soal Baru': 'Shuffle New Questions',
  'Coba Tantangan Lagi': 'Retry Challenge',
  'Ulangi Susunan': 'Reset Order',
  'Pelan 0.8x': 'Slow 0.8x',
  'REKOR PRIBADI BARU!': 'NEW PERSONAL BEST!',
  'Lanjutkan Stage Terakhir': 'Continue Last Stage',
  'Latihan Cepat': 'Quick Drill',
  'Simulasi Cepat': 'Quick Simulation',
  'Latihan Campuran': 'Mixed Practice',
  'Susun Kalimat': 'Sentence Builder',
  'Tebak Audio': 'Audio Quiz',
  'Skor': 'Score',
  'Akurasi': 'Accuracy',
  'Benar': 'Correct',
  'Salah': 'Wrong',
  'Kombo': 'Combo',
  'Nyawa': 'Lives',
  'Waktu': 'Time',
  'Waktu Habis': "Time's Up",

  // Try Out JLPT & Choukai
  'Paket Try Out': 'Try Out Packets',
  'Grafik & Nilai': 'Charts & Scores',
  'Mini Simulasi': 'Mini Simulation',
  'Contoh Laporan': 'Sample Report',
  'Pilih Level Try Out': 'Choose Try Out Level',
  'Buka N3': 'Open N3',
  'Buka N2': 'Open N2',
  'Buka N1': 'Open N1',
  'Buka 15 Paket Try Out Terverifikasi': 'Open 15 Verified Try Out Packets',
  'Rumus skor:': 'Score formula:',
  'Terjawab': 'Answered',
  'Belum dijawab': 'Unanswered',
  'Ragu': 'Flagged',
  'Ragu-ragu': 'Flagged',
  'Kumpulkan Jawaban': 'Submit Answers',
  'Memenuhi ambang ≥ 19/60': 'Meets threshold ≥ 19/60',
  'Di bawah ambang 19/60': 'Below threshold 19/60',
  'Ambang 19': 'Pass mark 19',
  'Lulus': 'Passed',
  'Tidak Lulus': 'Not Passed',
  'Belum Lulus': 'Not Passed Yet',
  'Putar Audio': 'Play Audio',
  'Jeda': 'Pause',
  '-15d': '-15s',
  '+15d': '+15s',
  'Coba Pemutar Utama': 'Try Primary Player',
  'Audio tetap diputar langsung di halaman ini.': 'Audio continues playing right on this page.',
  'Transkrip Choukai': 'Choukai Transcript',
  'Tampilkan Transkrip': 'Show Transcript',
  'Sembunyikan Transkrip': 'Hide Transcript',
  'Semua dibahas': 'All reviewed',
  'Tips JLPT:': 'JLPT Tip:',
  'Lihat Pembahasan — Mengapa Salah?': 'View Explanation — Why Was It Wrong?',
  'Lihat Pembahasan': 'View Explanation',
  'Pembahasan Soal': 'Question Explanation',
  'Pembahasan JLPT': 'JLPT Explanation',
  'Detektor Kelemahan JLPT': 'JLPT Weakness Detector',
  'Kunci Jawaban': 'Answer Key',
  'Jawabanmu': 'Your Answer',
  'Kunci Resmi': 'Official Key',

  // Onboarding, Profile & Settings
  'Nama': 'Name',
  'Nama Panggilan': 'Nickname',
  'Jenis Kelamin': 'Gender',
  'Laki-laki': 'Male',
  'Perempuan': 'Female',
  'Cowok': 'Male',
  'Cewek': 'Female',
  'Level JLPT': 'JLPT Level',
  'Level Saat Ini': 'Current Level',
  'Target Level': 'Target Level',
  'Target Harian': 'Daily Goal',
  'Suara & Pelafalan Jepang': 'Japanese Voice & Pronunciation',
  'Kecepatan Audio': 'Audio Speed',
  'Tema Tampilan': 'Appearance Theme',
  'Terang': 'Light',
  'Gelap': 'Dark',
  'Sistem': 'System',
  'Bahasa Aplikasi': 'App Language',
  'Notifikasi': 'Notifications',
  'Pengingat Belajar': 'Study Reminders',
  'Lapor Bug & Saran': 'Report Bug & Feedback',
  'Laporkan Bug & Saran': 'Report Bug & Feedback',

  // Writing Studio
  'Studio Menulis': 'Writing Studio',
  'Latihan Menulis': 'Writing Practice',
  'Bersihkan': 'Clear',
  'Hapus Kanvas': 'Clear Canvas',
  'Garis Bantu': 'Guide Grid',
  'Urutan Goresan': 'Stroke Order',
  'Jumlah Goresan': 'Stroke Count',

  // Error Boundary
  'Terjadi Gangguan Tampilan': 'Display Error Occurred',
  'Data belajarmu tetap tersimpan aman di perangkat. Muat ulang aplikasi untuk melanjutkan belajar.':
    'Your study data remains safely saved on this device. Reload the app to continue studying.',
  'Muat Ulang UtamaGo!': 'Reload UtamaGo!',

  // Greetings & Misc
  'Selamat Pagi': 'Good Morning',
  'Selamat Siang': 'Good Afternoon',
  'Selamat Sore': 'Good Evening',
  'Selamat Malam': 'Good Night',
  'Hari Ini': 'Today',
  'Kemarin': 'Yesterday',
  'Minggu Ini': 'This Week',
  'Bulan Ini': 'This Month',
  'Total': 'Total',
  'Rata-rata': 'Average',
  'Menit': 'Minutes',
  'Detik': 'Seconds',
  'Jam': 'Hours',
  'Hari': 'Days',
  'Soal': 'Questions',
  'Kartu': 'Cards',
  'Pola': 'Patterns',
  'Bab': 'Chapter',
  'Bagian': 'Section',
  'Paket': 'Packet',
};

interface PatternRule {
  re: RegExp;
  replace: string | ((...args: string[]) => string);
}

const DYNAMIC_PATTERNS: PatternRule[] = [
  // Exact compound counters & timestamps
  { re: /^(\d+)\s+menit$/i, replace: '$1 min' },
  { re: /^(\d+)\s+detik$/i, replace: '$1 sec' },
  { re: /^(\d+)\s+jam$/i, replace: '$1 hr' },
  { re: /^(\d+)\s+hari$/i, replace: '$1 days' },
  { re: /^(\d+)\s+hari berturut-turut$/i, replace: '$1-day streak' },
  { re: /^Hari ke-(\d+)$/i, replace: 'Day $1' },
  { re: /^(\d+)\s+kartu$/i, replace: '$1 cards' },
  { re: /^(\d+)\s+kartu baru$/i, replace: '$1 new cards' },
  { re: /^(\d+)\s+kartu jatuh tempo$/i, replace: '$1 cards due' },
  { re: /^(\d+)\s+jatuh tempo$/i, replace: '$1 due' },
  { re: /^(\d+)\s+soal$/i, replace: '$1 questions' },
  { re: /^(\d+)\s+pola$/i, replace: '$1 patterns' },
  { re: /^(\d+)\s+paket$/i, replace: '$1 packets' },
  { re: /^(\d+)\s+goresan$/i, replace: '$1 strokes' },
  { re: /^(\d+)\/(\d+)\s+selesai$/i, replace: '$1/$2 completed' },
  { re: /^(\d+)\/(\d+)\s+terjawab$/i, replace: '$1/$2 answered' },
  { re: /^(\d+)\/(\d+)\s+benar$/i, replace: '$1/$2 correct' },
  { re: /^Bab\s+(\d+)$/i, replace: 'Chapter $1' },
  { re: /^Bagian\s+(\d+)$/i, replace: 'Section $1' },
  { re: /^Soal\s+(\d+)$/i, replace: 'Question $1' },
  { re: /^Soal\s+#?(\d+)\s+dari\s+(\d+)$/i, replace: 'Question $1 of $2' },
  { re: /^Halaman\s+(\d+)\s+dari\s+(\d+)$/i, replace: 'Page $1 of $2' },
  { re: /^Paket\s+(\d+)$/i, replace: 'Packet $1' },
  { re: /^Pelajaran\s+(\d+)$/i, replace: 'Lesson $1' },
  { re: /^Skor:\s*(.+)$/i, replace: 'Score: $1' },
  { re: /^Akurasi:\s*(.+)$/i, replace: 'Accuracy: $1' },
  { re: /^Target:\s*(.+)$/i, replace: 'Goal: $1' },
  { re: /^Waktu:\s*(.+)$/i, replace: 'Time: $1' },
  { re: /^(\d+)\s+menit\/hari$/i, replace: '$1 min/day' },
  // Anki POS combined with Japanese headword (e.g. "かばん　Kata benda")
  {
    re: /^([^\u0000-\u007F]+[\s　]+)(Kata benda|Kata kerja \(Ichidan\) - transitif|Kata kerja \(Ichidan\) - intransitif|Kata kerja \(Godan\) - transitif|Kata kerja \(Godan\) - intransitif|Kata kerja \(Ichidan\)|Kata kerja \(Godan\)|Kata kerja \(Suru\)|Kata kerja \(Tidak beraturan\)|Kata kerja|Kata sifat-i|Kata sifat-na|Kata sifat|Kata keterangan|Kata ganti|Kata sambung|Kata depan|Kata seru|Kata bilangan|Kata bantu|Partikel|Ungkapan|Awalan|Akhiran|Frasa|Idiom|Penggolong)$/i,
    replace: (_m, jp, pos) => {
      const normalizedKey = Object.keys(STATIC_EN_DICT).find(
        (k) => k.toLowerCase() === pos.toLowerCase(),
      );
      return `${jp}${normalizedKey ? STATIC_EN_DICT[normalizedKey] : pos}`;
    },
  },
];

// Common Indonesian stopwords & domain keywords used to detect Indonesian text
// while avoiding wasting API calls on already-English UI strings.
const INDONESIAN_WORDS = new Set([
  'yang', 'dan', 'untuk', 'dengan', 'dari', 'pada', 'tidak', 'bukan', 'adalah',
  'akan', 'sudah', 'sedang', 'masih', 'bisa', 'dapat', 'harus', 'perlu', 'kamu',
  'anda', 'saya', 'kami', 'kita', 'ini', 'itu', 'tersebut', 'atau', 'tetapi',
  'namun', 'jika', 'kalau', 'saat', 'ketika', 'agar', 'supaya', 'karena',
  'sehingga', 'sangat', 'lebih', 'paling', 'semua', 'setiap', 'beberapa',
  'banyak', 'sedikit', 'mulai', 'lanjut', 'lanjutkan', 'selesai', 'simpan',
  'hapus', 'batal', 'tutup', 'buka', 'pilih', 'cari', 'lihat', 'belajar',
  'latihan', 'latih', 'soal', 'jawaban', 'kartu', 'kata', 'kalimat', 'arti',
  'makna', 'contoh', 'baca', 'tulis', 'menulis', 'dengar', 'mendengarkan',
  'suara', 'waktu', 'menit', 'detik', 'hari', 'minggu', 'bulan', 'tahun',
  'tingkat', 'bab', 'bagian', 'daftar', 'masuk', 'keluar', 'akun', 'profil',
  'pengaturan', 'bahasa', 'laporan', 'lapor', 'laporkan', 'saran', 'kesalahan',
  'salah', 'benar', 'skor', 'nilai', 'hasil', 'harian', 'progres', 'statistik',
  'riwayat', 'catatan', 'kamus', 'pola', 'rumus', 'nuansa', 'penjelasan',
  'pembahasan', 'petunjuk', 'panduan', 'langkah', 'fitur', 'cepat', 'mudah',
  'sulit', 'baik', 'bagus', 'ulang', 'ulangi', 'baru', 'lama', 'aktif',
  'terkunci', 'gratis', 'resmi', 'lengkap', 'tersedia', 'belum', 'pernah',
  'coba', 'lagi', 'tunggu', 'sebentar', 'gagal', 'berhasil', 'terima', 'kasih',
  'selamat', 'datang', 'pagi', 'siang', 'sore', 'malam', 'halo', 'semangat',
  'mari', 'ayo', 'yuk', 'cek', 'tekan', 'ketuk', 'klik', 'geser', 'masukkan',
  'unggah', 'kompres', 'kirim', 'unduh', 'ekspor', 'muat', 'segarkan',
  'kembali', 'berikutnya', 'sebelumnya', 'selengkapnya', 'ringkasan', 'tentang',
  'pertanyaan', 'umum', 'bantuan', 'lainnya', 'kosakata', 'tata', 'membaca',
  'huruf', 'cara', 'terjemahan', 'penggunaan', 'sambungan', 'perbandingan',
  'pengecoh', 'kunci', 'transkrip', 'kecepatan', 'otomatis', 'gelap', 'terang',
  'sistem', 'notifikasi', 'pengingat', 'sinkronisasi', 'perangkat', 'koneksi',
  'jaringan', 'masalah', 'gangguan', 'tampilan', 'ketentuan', 'privasi',
  'versi', 'pengembang', 'pengajar', 'pelajar', 'siswa', 'pengguna', 'terjawab',
  'ragu', 'kumpulkan', 'ambang', 'lulus', 'putar', 'jeda', 'tampilkan',
  'sembunyikan', 'ingat', 'kelemahan', 'detektor', 'acak', 'berurutan',
  'sesuai', 'favorit', 'tandai', 'tunda', 'aktifkan', 'terapkan', 'pelan',
  'susunan', 'rekor', 'pribadi', 'campuran', 'lintas', 'topik', 'uji',
  'pemahaman', 'paham', 'pelafalan', 'benda', 'kerja', 'sifat', 'keterangan',
  'ganti', 'partikel', 'ungkapan', 'awalan', 'akhiran', 'frasa', 'goresan',
  'urutan', 'jumlah', 'bersihkan', 'kanvas', 'garis', 'bantu', 'panggilan',
  'jenis', 'kelamin', 'cowok', 'cewek', 'segera', 'hadir', 'paket',
  'terverifikasi', 'asli', 'tantangan', 'beranda', 'materi', 'pesan', 'tolong',
  'silakan', 'maaf', 'berapa', 'bagaimana', 'mengapa', 'kenapa', 'siapa',
  'dimana', 'kapan', 'apakah', 'hanya', 'saja', 'juga', 'pun', 'lalu',
  'kemudian', 'setelah', 'sebelum', 'selama', 'hingga', 'sampai', 'tanpa',
  'dalam', 'luar', 'atas', 'bawah', 'depan', 'belakang', 'samping', 'antara',
  'oleh', 'tentang', 'terhadap', 'bagi', 'seperti', 'bagai', 'walaupun',
  'meskipun', 'padahal', 'sedangkan', 'melainkan', 'bahkan', 'yakni', 'yaitu',
  'misalnya', 'contohnya', 'biasanya', 'sering', 'jarang', 'selalu', 'kadang',
  'langsung', 'segera', 'terus', 'makin', 'semakin', 'cukup', 'terlalu',
  'hampir', 'kira', 'sekitar', 'kurang', 'tambah', 'kurangi', 'ubah', 'ganti',
  'pakai', 'gunakan', 'buat', 'membuat', 'bikin', 'ambil', 'kasih', 'beri',
  'berikan', 'minta', 'tanya', 'jawab', 'bilang', 'katakan', 'ucap', 'pikir',
  'rasa', 'ingin', 'mau', 'suka', 'cinta', 'takut', 'senang', 'sedih', 'marah',
  'lelah', 'capek', 'sibuk', 'kosong', 'penuh', 'besar', 'kecil', 'panjang',
  'pendek', 'tinggi', 'rendah', 'jauh', 'dekat', 'cepat', 'lambat', 'berat',
  'ringan', 'mahal', 'murah', 'panas', 'dingin', 'hangat', 'sejuk', 'cerah',
  'hujan', 'angin', 'salju', 'awan', 'matahari', 'bintang', 'langit', 'bumi',
  'laut', 'gunung', 'sungai', 'danau', 'hutan', 'taman', 'jalan', 'rumah',
  'kamar', 'ruang', 'pintu', 'jendela', 'meja', 'kursi', 'kasur', 'buku',
  'tas', 'sepatu', 'baju', 'celana', 'topi', 'jam', 'uang', 'kertas', 'pena',
  'pensil', 'makanan', 'minuman', 'air', 'kopi', 'teh', 'susu', 'nasi', 'roti',
  'ikan', 'daging', 'sayur', 'buah', 'apel', 'jeruk', 'orang', 'teman',
  'keluarga', 'ayah', 'ibu', 'kakak', 'adik', 'anak', 'suami', 'istri',
  'guru', 'murid', 'dokter', 'polisi', 'kantor', 'sekolah', 'kampus', 'toko',
  'pasar', 'stasiun', 'bandara', 'kereta', 'mobil', 'sepeda', 'pesawat',
  'kapal', 'anjing', 'kucing', 'burung', 'hewan', 'tumbuhan', 'bunga', 'pohon',
  'merah', 'biru', 'hijau', 'kuning', 'hitam', 'putih', 'abu', 'coklat',
  'ungu', 'jingga', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh',
  'delapan', 'sembilan', 'sepuluh', 'seratus', 'seribu', 'pertama', 'kedua',
  'ketiga', 'terakhir', 'sendiri', 'bersama', 'sama', 'beda', 'berbeda',
  'penting', 'khusus', 'biasa', 'alami', 'nyata', 'pasti', 'mungkin',
  'tentu', 'jelas', 'tepat', 'cocok', 'sesuai', 'aman', 'bahaya', 'sehat',
  'sakit', 'kuat', 'lemah', 'hidup', 'mati', 'lahir', 'tumbuh', 'berubah',
  'berhenti', 'bergerak', 'berjalan', 'berlari', 'duduk', 'berdiri', 'tidur',
  'bangun', 'makan', 'minum', 'masak', 'cuci', 'beli', 'jual', 'bayar',
  'kerja', 'bekerja', 'main', 'bermain', 'nonton', 'menonton', 'dengar',
  'mendengar', 'bicara', 'berbicara', 'ngobrol', 'temu', 'bertemu', 'kenal',
  'kenalan', 'pergi', 'pulang', 'tiba', 'sampai', 'tinggal', 'pindah',
  'naik', 'turun', 'lewat', 'belok', 'seberang', 'kiri', 'kanan', 'lurus',
  'utara', 'selatan', 'timur', 'barat', 'tengah', 'pusat', 'pinggir', 'ujung',
  'di', 'ke', 'se', 'ada', 'jadi', 'menjadi', 'punya', 'memiliki', 'milik',
  'pernah', 'sering', 'selalu', 'belum', 'sudah', 'telah', 'sedang', 'tengah',
  'masih', 'baru', 'hampir', 'nyaris', 'segera', 'lekas', 'cepat', 'lambat',
  'tetap', 'terus', 'selamanya', 'sementara', 'sekarang', 'kini', 'nanti',
  'besok', 'lusa', 'kemarin', 'tadi', 'barusan', 'dulu', 'dahulu', 'esok',
  'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu',
  'januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus',
  'september', 'oktober', 'november', 'desember',
  'menunjukkan', 'menyatakan', 'digunakan', 'dipakai', 'artinya', 'berarti',
  'maknanya', 'bermakna', 'merupakan', 'termasuk', 'terdiri', 'terjadi',
  'terdapat', 'terlihat', 'terdengar', 'terasa', 'terkenal', 'terbaik',
  'terbesar', 'terkecil', 'tertinggi', 'terendah', 'tercepat', 'terbaru',
  'dibandingkan', 'berkaitan', 'berhubungan', 'bergantung', 'berdasarkan',
  'menurut', 'mengenai', 'tentang', 'sebab', 'akibat', 'tujuan', 'syarat',
  'kondisi', 'keadaan', 'situasi', 'suasana', 'perasaan', 'pikiran', 'pendapat',
  'alasan', 'hasil', 'dampak', 'pengaruh', 'perubahan', 'perkembangan',
  'kemajuan', 'masalah', 'solusi', 'pilihan', 'keputusan', 'rencana', 'jadwal',
  'kegiatan', 'acara', 'kejadian', 'peristiwa', 'pengalaman', 'kenangan',
  'harapan', 'impian', 'cita', 'usaha', 'kesempatan', 'kemungkinan',
  'kemampuan', 'keterampilan', 'pengetahuan', 'informasi', 'berita', 'cerita',
  'dongeng', 'sejarah', 'budaya', 'tradisi', 'kebiasaan', 'aturan', 'hukum',
  'hak', 'kewajiban', 'tanggung', 'jawab', 'perhatian', 'peringatan', 'larangan',
  'izin', 'persetujuan', 'penolakan', 'permintaan', 'tawaran', 'undangan',
  'ucapan', 'salam', 'selamat', 'doa', 'pujian', 'kritik', 'saran', 'nasihat',
]);

// High-confidence English-only stopwords so we skip already-English UI text
const STRONG_ENGLISH_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'you', 'are',
  'was', 'were', 'have', 'has', 'had', 'will', 'would', 'should', 'could',
  'not', 'but', 'what', 'when', 'where', 'which', 'who', 'why', 'how',
  'all', 'each', 'every', 'some', 'many', 'more', 'most', 'other', 'into',
  'about', 'after', 'before', 'between', 'during', 'without', 'through',
  'sign', 'login', 'logout', 'account', 'profile', 'settings', 'language',
  'home', 'learn', 'study', 'practice', 'challenge', 'arena', 'stage',
  'vocabulary', 'grammar', 'reading', 'listening', 'writing', 'dictionary',
  'flashcards', 'review', 'reviews', 'cards', 'questions', 'answers',
  'correct', 'wrong', 'score', 'accuracy', 'progress', 'streak', 'daily',
  'submit', 'cancel', 'close', 'save', 'delete', 'edit', 'search', 'filter',
  'loading', 'retry', 'refresh', 'export', 'upload', 'download', 'continue',
  'start', 'finish', 'done', 'next', 'previous', 'back', 'show', 'hide',
  'play', 'pause', 'audio', 'speed', 'theme', 'light', 'dark', 'system',
  'report', 'feedback', 'suggestion', 'please', 'thank', 'welcome', 'hello',
  'verified', 'official', 'transcript', 'explanation', 'meaning', 'example',
  'sentences', 'patterns', 'notes', 'chapter', 'section', 'packet', 'level',
  'beginner', 'intermediate', 'advanced', 'minutes', 'seconds', 'hours', 'days',
  'completed', 'locked', 'unlocked', 'mastered', 'remaining', 'total',
]);

const NEVER_TRANSLATE_EXACT = new Set([
  'UtamaGo!',
  'JLPT',
  'Anki',
  'Bunpou',
  'Choukai',
  'Dokkai',
  'Moji',
  'Goi',
  'Moji Goi',
  'Moji・Goi',
  'Bunpou・Dokkai',
  'Kanji',
  'Hiragana',
  'Katakana',
  'Romaji',
  'Furigana',
  "On'yomi",
  "Kun'yomi",
  'SRS',
  'XP',
  'ID',
  'EN',
  'N5',
  'N4',
  'N3',
  'N2',
  'N1',
  'N5–N1',
  'N5-N1',
  'Beta',
  'Admin',
  'OK',
  'Go!',
  'JSON',
  'CSV',
  'PDF',
  'MP3',
  'WAV',
  'TTS',
  'KB',
  'MB',
  'FX',
  'SFX',
  'Ryan',
  'Annisa',
]);

export function lookupStaticEn(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const exact = STATIC_EN_DICT[trimmed];
  if (exact) {
    return raw.replace(trimmed, exact);
  }

  for (const rule of DYNAMIC_PATTERNS) {
    if (rule.re.test(trimmed)) {
      const replaced =
        typeof rule.replace === 'function'
          ? trimmed.replace(rule.re, rule.replace)
          : trimmed.replace(rule.re, rule.replace);
      if (replaced !== trimmed) {
        return raw.replace(trimmed, replaced);
      }
    }
  }

  return null;
}

/**
 * Returns true if the string likely contains untranslated Indonesian text
 * (including mixed Japanese + Indonesian strings like Anki meanings/notes)
 * and should be queued for /api/translate-batch.
 */
export function needsIndonesianTranslation(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.length < 2) return false;
  if (NEVER_TRANSLATE_EXACT.has(trimmed)) return false;

  // Must contain at least 2 ASCII letters (skip pure Japanese, numbers, punctuation, emojis)
  const latinMatches = trimmed.match(/[A-Za-z]+/g);
  if (!latinMatches || latinMatches.length === 0) return false;

  // Skip URLs, emails, @handles, file paths, code-like tokens
  if (
    /^https?:\/\//i.test(trimmed) ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ||
    /^@[a-z0-9_.]+$/i.test(trimmed) ||
    /^\/[a-z0-9_./-]+$/i.test(trimmed)
  ) {
    return false;
  }

  // Skip purely short codes/badges like "N3 · 2012.12", "12/30", "0.8x", "35 KB", "12:00"
  const meaningfulWords = latinMatches
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 2 && !/^(n[1-5]|xp|kb|mb|ms|id|en|ok|am|pm|v\d+|m\d+|q\d+)$/.test(w));

  if (meaningfulWords.length === 0) return false;

  let idHits = 0;
  let enHits = 0;

  for (const w of meaningfulWords) {
    if (INDONESIAN_WORDS.has(w)) {
      idHits += 1;
    } else if (
      // Indonesian morphological patterns (me-..-kan, di-..-kan, ber-, ter-, ke-..-an, pe-..-an, -nya, -mu)
      w.length >= 5 &&
      (/(nya|kan|lah|kah|pun)$/.test(w) ||
        /^(meng|meny|mem|men|ber|ter|per|peng|peny|pen|pem|di)[a-z]{3,}/.test(w) ||
        /^ke[a-z]{3,}an$/.test(w))
    ) {
      if (!STRONG_ENGLISH_WORDS.has(w)) {
        idHits += 0.7;
      }
    }

    if (STRONG_ENGLISH_WORDS.has(w)) {
      enHits += 1;
    }
  }

  // Clearly Indonesian
  if (idHits >= 1 && idHits >= enHits * 0.6) {
    return true;
  }

  // Clearly English (no Indonesian signals and multiple English words)
  if (enHits >= 1 && idHits === 0) {
    return false;
  }

  // Mixed Japanese + Latin gloss (e.g. "かばん　Tas", "走る　Lari") where gloss isn't recognized English
  const hasJapanese = /[\u3040-\u30ff\u3400-\u9fff]/.test(trimmed);
  if (hasJapanese && meaningfulWords.length >= 1 && enHits === 0) {
    return true;
  }

  // Single/short capitalized word not recognized as English (e.g. "Pengecoh", "Sambungan", "Terkompresi")
  if (meaningfulWords.length <= 3 && enHits === 0) {
    // Check if it looks like romaji / Japanese term (skip pure Japanese romanized terms)
    if (
      /^(jlpt|bunpou|choukai|dokkai|moji|goi|kanji|hiragana|katakana|romaji|furigana|mondai|anki|sensei|utamago|on'yomi|kun'yomi|srs|blitz|survival|boss|stage|combo|streak|try|out)$/i.test(
        meaningfulWords.join(' '),
      )
    ) {
      return false;
    }
    return true;
  }

  return false;
}
