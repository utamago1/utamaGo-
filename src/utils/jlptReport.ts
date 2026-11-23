import type {
  JlptSection,
  MiniTryOutQuestion,
  ReportSectionRow,
} from '../data/utamagoContent';

export interface ComputedTryOutReport {
  average: number;
  correctCount: number;
  totalQuestions: number;
  statusLabel: 'Siap Evaluasi Lanjut' | 'Perlu Penguatan' | 'Fokus Fondasi';
  rows: ReportSectionRow[];
}

const SECTION_ORDER: JlptSection[] = ['Moji-Goi', 'Bunpou', 'Dokkai', 'Choukai'];

export function getRecommendationForScore(section: JlptSection, score: number): string {
  if (score >= 75) {
    switch (section) {
      case 'Moji-Goi':
        return 'Pertahankan konsistensi pengulangan kosakata lewat deck Anki harian.';
      case 'Bunpou':
        return 'Pemahaman pola sudah kuat; jaga ketelitian pada nuansa antarpola mirip.';
      case 'Dokkai':
        return 'Pertahankan tempo membaca dan ketepatan menangkap maksud penulis.';
      case 'Choukai':
        return 'Pertahankan fokus menyimak poin kunci dan transisi percakapan.';
    }
  }

  if (score >= 50) {
    switch (section) {
      case 'Moji-Goi':
        return 'Perbanyak pengulangan Kanji dan padanan kata dalam konteks kalimat.';
      case 'Bunpou':
        return 'Perkuat pemahaman pola dan perbedaan penggunaannya lewat latihan kalimat.';
      case 'Dokkai':
        return 'Latih pencarian ide pokok paragraf dan hubungan antarkalimat.';
      case 'Choukai':
        return 'Latih menangkap kata kunci dan maksud pembicara dalam dialog singkat.';
    }
  }

  switch (section) {
    case 'Moji-Goi':
      return 'Prioritaskan fondasi Kanji dan kosakata inti dengan review Anki terjadwal.';
    case 'Bunpou':
      return 'Bangun ulang pemahaman struktur dasar dan fungsi tiap pola tata bahasa.';
    case 'Dokkai':
      return 'Latih pemahaman teks bertahap mulai dari kalimat pendek dan kecepatan membaca.';
    case 'Choukai':
      return 'Biasakan menyimak audio pendek sambil mencatat kata kunci informasi.';
  }
}

export function calculateTryOutReport(
  answers: Record<string, number>,
  questions: MiniTryOutQuestion[],
): ComputedTryOutReport {
  const grouped = new Map<JlptSection, { correct: number; total: number }>();

  for (const section of SECTION_ORDER) {
    grouped.set(section, { correct: 0, total: 0 });
  }

  let totalCorrect = 0;

  for (const question of questions) {
    const bucket = grouped.get(question.section) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (answers[question.id] === question.correctIndex) {
      bucket.correct += 1;
      totalCorrect += 1;
    }
    grouped.set(question.section, bucket);
  }

  const rows: ReportSectionRow[] = SECTION_ORDER.map((section) => {
    const bucket = grouped.get(section) ?? { correct: 0, total: 0 };
    const score = bucket.total > 0 ? Math.round((bucket.correct / bucket.total) * 100) : 0;
    return {
      section,
      score,
      recommendation: getRecommendationForScore(section, score),
    };
  });

  const average =
    questions.length > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0;

  const statusLabel: ComputedTryOutReport['statusLabel'] =
    average >= 75
      ? 'Siap Evaluasi Lanjut'
      : average >= 50
        ? 'Perlu Penguatan'
        : 'Fokus Fondasi';

  return {
    average,
    correctCount: totalCorrect,
    totalQuestions: questions.length,
    statusLabel,
    rows,
  };
}

export const TEACHER_INSTAGRAM_HANDLE = '@ryan_lief';
export const TEACHER_INSTAGRAM_URL = 'https://www.instagram.com/ryan_lief/';

export function buildWhatsAppInquiryUrl(note?: string): string {
  const lines = [
    'Halo pengajar UtamaGo!, saya sedang memakai aplikasi belajar JLPT UtamaGo! dan ingin bertanya mengenai materi.',
    note ? `Catatan: ${note}` : null,
  ].filter(Boolean);

  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}
