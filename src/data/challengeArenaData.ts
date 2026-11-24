import type { ChallengeQuestion, ChallengeStage } from './challengeLevels';
import type { JlptLevel } from './utamagoContent';

export interface SentenceOrderTemplate {
  id: string;
  level: JlptLevel;
  tag: string;
  prompt: string;
  sentenceBefore?: string;
  orderedTokens: string[];
  sentenceAfter?: string;
  starSlotIndex: number;
  sentenceHint?: string;
  explanation: string;
}

/**
 * Curated, grammatically verified JLPT Sentence-Ordering (文の組み立て / ★) bank
 * covering N5 through N1.
 * - N5 & N4 include supportive Indonesian prompts/hints.
 * - N3, N2, and N1 prompts and tokens are 100% Japanese (zero Latin/Indonesian clues).
 */
export const SENTENCE_ORDER_BANK: SentenceOrderTemplate[] = [
  // =========================================================================
  // N5 (6 items)
  // =========================================================================
  {
    id: 'so-n5-1',
    level: 'N5',
    tag: 'Susun Kalimat N5',
    prompt: 'Susun potongan kata menjadi kalimat yang benar:',
    sentenceBefore: 'わたしは',
    orderedTokens: ['毎朝', '公園で', 'コーヒーを', '飲みます'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    sentenceHint: 'Saya minum kopi di taman setiap pagi.',
    explanation:
      'Urutan alami: 毎朝 (waktu) → 公園で (tempat aktivitas) → コーヒーを (objek) → 飲みます (predikat).',
  },
  {
    id: 'so-n5-2',
    level: 'N5',
    tag: 'Susun Kalimat N5',
    prompt: 'Susun potongan kata menjadi kalimat yang benar:',
    sentenceBefore: 'きのう',
    orderedTokens: ['友だちと', '駅で', '映画を', '見ました'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    sentenceHint: 'Kemarin menonton film bersama teman di stasiun.',
    explanation:
      'Urutan: 友だちと (bersama teman) → 駅で (di stasiun) → 映画を (film) → 見ました (menonton).',
  },
  {
    id: 'so-n5-3',
    level: 'N5',
    tag: 'Susun Kalimat N5',
    prompt: 'Susun potongan kata menjadi kalimat yang benar:',
    sentenceBefore: 'すみません、',
    orderedTokens: ['ここで', '写真を', '撮っても', 'いいですか'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    sentenceHint: 'Permisi, bolehkah saya mengambil foto di sini?',
    explanation:
      'Pola izin 「～てもいいですか」 diletakkan di akhir: ここで + 写真を + 撮っても + いいですか。',
  },
  {
    id: 'so-n5-4',
    level: 'N5',
    tag: 'Susun Kalimat N5',
    prompt: 'Susun potongan kata menjadi kalimat yang benar:',
    sentenceBefore: '日曜日に',
    orderedTokens: ['家族と', 'デパートへ', '買いに', '行きます'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    sentenceHint: 'Hari Minggu pergi ke department store untuk berbelanja bersama keluarga.',
    explanation:
      'Pola tujuan pergi 「tempatへ + V-ます形 + に + 行きます」: 家族と + デパートへ + 買いに + 行きます。',
  },
  {
    id: 'so-n5-5',
    level: 'N5',
    tag: 'Susun Kalimat N5',
    prompt: 'Susun potongan kata menjadi kalimat yang benar:',
    sentenceBefore: 'この部屋は',
    orderedTokens: ['静かで', 'とても', '勉強し', 'やすいです'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    sentenceHint: 'Kamar ini tenang dan sangat mudah untuk belajar.',
    explanation:
      'Kata sifat-na 「静か」 disambung dengan 「で」, lalu とても + 勉強しやすいです (mudah untuk belajar).',
  },
  {
    id: 'so-n5-6',
    level: 'N5',
    tag: 'Susun Kalimat N5',
    prompt: 'Susun potongan kata menjadi kalimat yang benar:',
    sentenceBefore: '日本語の',
    orderedTokens: ['辞書を', '図書館で', '借りて', '帰りました'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    sentenceHint: 'Meminjam kamus bahasa Jepang di perpustakaan lalu pulang.',
    explanation:
      'Urutan aksi beruntun dengan bentuk-て: 辞書を + 図書館で + 借りて + 帰りました。',
  },

  // =========================================================================
  // N4 (6 items)
  // =========================================================================
  {
    id: 'so-n4-1',
    level: 'N4',
    tag: 'Susun Kalimat N4',
    prompt: 'Susun potongan kata menjadi kalimat yang benar:',
    sentenceBefore: '雨が',
    orderedTokens: ['降りそう', 'なので', '傘を', '持って行きます'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    sentenceHint: 'Karena kelihatannya akan turun hujan, saya membawa payung.',
    explanation:
      '「降りそう」 (kelihatannya akan turun) berperilaku seperti kata sifat-na, sehingga diikuti 「なので」 sebelum kalimat utama.',
  },
  {
    id: 'so-n4-2',
    level: 'N4',
    tag: 'Susun Kalimat N4',
    prompt: 'Susun potongan kata menjadi kalimat yang benar:',
    sentenceBefore: '日本へ',
    orderedTokens: ['行く', 'まえに', '漢字を', '覚えておきます'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    sentenceHint: 'Sebelum pergi ke Jepang, saya menghafal kanji terlebih dahulu.',
    explanation:
      'Pola persiapan 「V-ておきます」 didahului klausa waktu 「行くまえに」: 行く + まえに + 漢字を + 覚えておきます。',
  },
  {
    id: 'so-n4-3',
    level: 'N4',
    tag: 'Susun Kalimat N4',
    prompt: 'Susun potongan kata menjadi kalimat yang benar:',
    sentenceBefore: '毎日',
    orderedTokens: ['練習した', 'おかげで', '日本語が', '上手になりました'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    sentenceHint: 'Berkat berlatih setiap hari, bahasa Jepang saya menjadi mahir.',
    explanation:
      '「V-た + おかげで」 menyatakan sebab positif (berkat…), diikuti hasil 「日本語が上手になりました」.',
  },
  {
    id: 'so-n4-4',
    level: 'N4',
    tag: 'Susun Kalimat N4',
    prompt: 'Susun potongan kata menjadi kalimat yang benar:',
    sentenceBefore: '電車が',
    orderedTokens: ['遅れた', 'ため', '会議に', '間に合いませんでした'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    sentenceHint: 'Karena kereta terlambat, saya tidak sempat menghadiri rapat.',
    explanation:
      '「遅れたため」 menyatakan alasan (karena terlambat), diikuti 「会議に間に合いませんでした」.',
  },
  {
    id: 'so-n4-5',
    level: 'N4',
    tag: 'Susun Kalimat N4',
    prompt: 'Susun potongan kata menjadi kalimat yang benar:',
    sentenceBefore: '先生に',
    orderedTokens: ['作文を', '直して', 'もらって', '助かりました'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    sentenceHint: 'Saya sangat terbantu karena karangan saya dikoreksi oleh guru.',
    explanation:
      'Pola menerima kebaikan 「先生に + 作文を + 直してもらって + 助かりました」.',
  },
  {
    id: 'so-n4-6',
    level: 'N4',
    tag: 'Susun Kalimat N4',
    prompt: 'Susun potongan kata menjadi kalimat yang benar:',
    sentenceBefore: 'もう少し',
    orderedTokens: ['早く', '起きれば', 'バスに', '乗れたのに'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    sentenceHint: 'Andai saja bangun sedikit lebih awal, padahal bisa naik bus.',
    explanation:
      'Bentuk pengandaian 「起きれば」 berpasangan dengan penyesalan 「乗れたのに」 di akhir kalimat.',
  },

  // =========================================================================
  // N3 (6 items — FULL JAPANESE)
  // =========================================================================
  {
    id: 'so-n3-1',
    level: 'N3',
    tag: '文の組み立て N3',
    prompt: '正しい順番に並べて、自然な文を完成させてください。',
    sentenceBefore: 'この店では',
    orderedTokens: ['季節に', 'よって', 'メニューが', '変わります'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    explanation:
      '「～によって」(tergantung pada…) menghubungkan 季節 dan メニューが変わります → 季節によってメニューが変わります。',
  },
  {
    id: 'so-n3-2',
    level: 'N3',
    tag: '文の組み立て N3',
    prompt: '正しい順番に並べて、自然な文を完成させてください。',
    sentenceBefore: '彼は',
    orderedTokens: ['忙しい', 'わりに', 'いつも', '元気そうだ'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    explanation:
      '「～わりに」(padahal / dibandingkan dengan tingkat…) dipakai setelah 忙しい → 忙しいわりにいつも元気そうだ。',
  },
  {
    id: 'so-n3-3',
    level: 'N3',
    tag: '文の組み立て N3',
    prompt: '正しい順番に並べて、自然な文を完成させてください。',
    sentenceBefore: '何度',
    orderedTokens: ['注意した', 'ところで', 'すぐ', '忘れてしまう'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    explanation:
      '「V-たところで」(meskipun sudah…, tetap saja percuma) berpasangan dengan hasil negatif すぐ忘れてしまう。',
  },
  {
    id: 'so-n3-4',
    level: 'N3',
    tag: '文の組み立て N3',
    prompt: '正しい順番に並べて、自然な文を完成させてください。',
    sentenceBefore: '健康の',
    orderedTokens: ['ためには', '運動する', 'だけでなく', '食事も大切だ'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    explanation:
      '「～だけでなく…も」(tidak hanya…, tetapi juga…) menghubungkan 運動する dan 食事も大切だ。',
  },
  {
    id: 'so-n3-5',
    level: 'N3',
    tag: '文の組み立て N3',
    prompt: '正しい順番に並べて、自然な文を完成させてください。',
    sentenceBefore: '窓を',
    orderedTokens: ['開けた', 'とたんに', '冷たい風が', '入ってきた'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    explanation:
      '「V-たとたんに」(tepat begitu…) menyatakan kejadian seketika di luar kontrol: 開けたとたんに冷たい風が入ってきた。',
  },
  {
    id: 'so-n3-6',
    level: 'N3',
    tag: '文の組み立て N3',
    prompt: '正しい順番に並べて、自然な文を完成させてください。',
    sentenceBefore: 'この資料は',
    orderedTokens: ['会議が', '終わる', 'までに', '確認しておいてください'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    explanation:
      'Batas waktu 「終わるまでに」 diikuti permintaan persiapan 「確認しておいてください」.',
  },

  // =========================================================================
  // N2 (6 items — FULL JAPANESE)
  // =========================================================================
  {
    id: 'so-n2-1',
    level: 'N2',
    tag: '文の組み立て N2',
    prompt: '言葉の順番を正しく並べ替えて文を完成させてください。',
    sentenceBefore: '今回の計画は',
    orderedTokens: ['予算の', '都合上', '見直さざるを', '得なくなった'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    explanation:
      '「予算の都合上」(karena alasan anggaran) + 「V-ざるを得ない」(mau tidak mau harus…) → 見直さざるを得なくなった。',
  },
  {
    id: 'so-n2-2',
    level: 'N2',
    tag: '文の組み立て N2',
    prompt: '言葉の順番を正しく並べ替えて文を完成させてください。',
    sentenceBefore: '新しい制度を',
    orderedTokens: ['導入するに', 'あたって', '現場の意見を', '広く集めた'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    explanation:
      '「～にあたって」(menjelang / dalam rangka melaksanakan momen penting) menghubungkan 導入する dan 現場の意見を広く集めた。',
  },
  {
    id: 'so-n2-3',
    level: 'N2',
    tag: '文の組み立て N2',
    prompt: '言葉の順番を正しく並べ替えて文を完成させてください。',
    sentenceBefore: '専門家の',
    orderedTokens: ['説明を', '聞いた', 'ところで', 'すぐには理解できなかった'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    explanation:
      '「V-たところで」(kalaupun sudah…) selalu mengarah ke hasil yang tidak sesuai harapan: すぐには理解できなかった。',
  },
  {
    id: 'so-n2-4',
    level: 'N2',
    tag: '文の組み立て N2',
    prompt: '言葉の順番を正しく並べ替えて文を完成させてください。',
    sentenceBefore: 'この地域は',
    orderedTokens: ['人口が', '減る', '一方', '高齢化が進んでいる'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    explanation:
      '「～一方」(di satu sisi…, sementara di sisi lain…) membandingkan dua tren: 人口が減る一方、高齢化が進んでいる。',
  },
  {
    id: 'so-n2-5',
    level: 'N2',
    tag: '文の組み立て N2',
    prompt: '言葉の順番を正しく並べ替えて文を完成させてください。',
    sentenceBefore: '結果が',
    orderedTokens: ['どうであれ', '最後まで', '諦めずに', 'やり抜くつもりだ'],
    sentenceAfter: '。',
    starSlotIndex: 0,
    explanation:
      '「どうであれ」(bagaimanapun hasilnya) menjadi klausa konsesif di awal, diikuti tekad 最後まで諦めずにやり抜くつもりだ。',
  },
  {
    id: 'so-n2-6',
    level: 'N2',
    tag: '文の組み立て N2',
    prompt: '言葉の順番を正しく並べ替えて文を完成させてください。',
    sentenceBefore: '天候が',
    orderedTokens: ['回復し', '次第', '屋外イベントを', '再開いたします'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    explanation:
      '「V-ます形 + 次第」(segera setelah…) → 回復し次第 + 屋外イベントを再開いたします。',
  },

  // =========================================================================
  // N1 (6 items — FULL JAPANESE)
  // =========================================================================
  {
    id: 'so-n1-1',
    level: 'N1',
    tag: '文の組み立て N1',
    prompt: '最も自然な文になるよう、語句を正しい順に並べてください。',
    sentenceBefore: '長年支えてくれた',
    orderedTokens: ['人々の', '期待を', '裏切るわけには', 'いかない'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    explanation:
      '「～わけにはいかない」(tidak mungkin/tidak boleh secara moral) menempel pada 裏切る → 人々の期待を裏切るわけにはいかない。',
  },
  {
    id: 'so-n1-2',
    level: 'N1',
    tag: '文の組み立て N1',
    prompt: '最も自然な文になるよう、語句を正しい順に並べてください。',
    sentenceBefore: 'いかなる',
    orderedTokens: ['困難が', 'あろうとも', '信念を', '貫き通す覚悟だ'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    explanation:
      '「いかなる～あろうとも」(kesulitan apa pun yang menghadang) berpasangan dengan tekad 信念を貫き通す覚悟だ。',
  },
  {
    id: 'so-n1-3',
    level: 'N1',
    tag: '文の組み立て N1',
    prompt: '最も自然な文になるよう、語句を正しい順に並べてください。',
    sentenceBefore: 'この法案は',
    orderedTokens: ['議論を', '尽くした', 'うえで', '採決されるべきだ'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    explanation:
      '「V-たうえで」(setelah melalui tahapan penuh) menghubungkan 議論を尽くした dan 採決されるべきだ。',
  },
  {
    id: 'so-n1-4',
    level: 'N1',
    tag: '文の組み立て N1',
    prompt: '最も自然な文になるよう、語句を正しい順に並べてください。',
    sentenceBefore: '彼女の演奏は',
    orderedTokens: ['聴衆の', '心を', '揺さぶらずには', 'おかなかった'],
    sentenceAfter: '。',
    starSlotIndex: 2,
    explanation:
      '「V-ずにはおかない」(pasti membuat / tak pelak menggugah) menempel pada 揺さぶる → 聴衆の心を揺さぶらずにはおかなかった。',
  },
  {
    id: 'so-n1-5',
    level: 'N1',
    tag: '文の組み立て N1',
    prompt: '最も自然な文になるよう、語句を正しい順に並べてください。',
    sentenceBefore: '表面的な',
    orderedTokens: ['対策に', 'とどまらず', '根本的な', '構造改革が求められる'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    explanation:
      '「～にとどまらず」(tidak berhenti sebatas…) mengontraskan 表面的な対策 dan 根本的な構造改革。',
  },
  {
    id: 'so-n1-6',
    level: 'N1',
    tag: '文の組み立て N1',
    prompt: '最も自然な文になるよう、語句を正しい順に並べてください。',
    sentenceBefore: '当時の記録を',
    orderedTokens: ['ひもとく', 'につれて', '新たな事実が', '浮かび上がってきた'],
    sentenceAfter: '。',
    starSlotIndex: 1,
    explanation:
      '「～につれて」(seiring semakin…) menyatakan perubahan bertahap: ひもとくにつれて新たな事実が浮かび上がってきた。',
  },
];

export function templateToSentenceOrderQuestion(
  tpl: SentenceOrderTemplate,
  idOverride?: string,
): ChallengeQuestion {
  const fullSentence = `${tpl.sentenceBefore ?? ''}${tpl.orderedTokens.join('')}${tpl.sentenceAfter ?? ''}`;
  return {
    id: idOverride ?? tpl.id,
    kind: 'sentence-order',
    tag: tpl.tag,
    prompt: tpl.prompt,
    orderedTokens: tpl.orderedTokens,
    sentenceBefore: tpl.sentenceBefore,
    sentenceAfter: tpl.sentenceAfter,
    starSlotIndex: tpl.starSlotIndex,
    sentenceHint: tpl.sentenceHint,
    options: [fullSentence],
    correctIndex: 0,
    explanation: tpl.explanation,
  };
}

/**
 * 30 Curated Tebak Audio Jepang (聴解ミッション) questions — 6 per JLPT level (N5–N1).
 * - N5 & N4 test spoken comprehension into clear Indonesian meanings.
 * - N3, N2, and N1 are 100% Japanese in prompts and options (zero Latin/Indonesian clues).
 */
export const AUDIO_MISSION_BANK: Record<JlptLevel, ChallengeQuestion[]> = {
  N5: [
    {
      id: 'am-n5-1',
      kind: 'audio-choice',
      tag: 'Misi Audio N5',
      prompt: 'Dengarkan pelafalan Jepang berikut, lalu pilih arti yang tepat:',
      audioText: 'おはようございます。',
      audioReveal: 'おはようございます (ohayou gozaimasu)',
      options: ['Selamat pagi', 'Selamat malam', 'Sampai jumpa besok', 'Terima kasih banyak'],
      correctIndex: 0,
      explanation: 'おはようございます adalah salam sopan yang diucapkan di pagi hari ("Selamat pagi").',
    },
    {
      id: 'am-n5-2',
      kind: 'audio-choice',
      tag: 'Misi Audio N5',
      prompt: 'Dengarkan kalimat berikut, lalu pilih arti yang benar:',
      audioText: 'いま、なんじですか。',
      audioReveal: '今、何時ですか (いま、なんじですか)',
      options: ['Hari ini hari apa?', 'Sekarang jam berapa?', 'Stasiun di sebelah mana?', 'Harganya berapa yen?'],
      correctIndex: 1,
      explanation: '今 (いま = sekarang) + 何時ですか (なんじですか = jam berapa?).',
    },
    {
      id: 'am-n5-3',
      kind: 'audio-choice',
      tag: 'Misi Audio N5',
      prompt: 'Dengarkan kata yang diucapkan, lalu pilih artinya:',
      audioText: 'ちかてつで いきます。',
      audioReveal: '地下鉄で行きます (ちかてつで いきます)',
      options: ['Pergi dengan sepeda', 'Pergi jalan kaki', 'Pergi naik kereta bawah tanah', 'Pergi naik pesawat'],
      correctIndex: 2,
      explanation: '地下鉄 (ちかてつ) berarti kereta bawah tanah (subway), dan で menyatakan sarana transportasi.',
    },
    {
      id: 'am-n5-4',
      kind: 'audio-choice',
      tag: 'Misi Audio N5',
      prompt: 'Dengarkan kalimat pendek berikut, lalu pilih maksudnya:',
      audioText: 'みずを ください。',
      audioReveal: '水をください (みずを ください)',
      options: ['Tolong buka pintunya', 'Tolong berikan air minum', 'Tolong tulis nama Anda', 'Tolong tunggu sebentar'],
      correctIndex: 1,
      explanation: '水 (みず) = air, ～をください = tolong berikan saya…',
    },
    {
      id: 'am-n5-5',
      kind: 'audio-choice',
      tag: 'Misi Audio N5',
      prompt: 'Dengarkan audio berikut, lalu pilih arti yang paling sesuai:',
      audioText: 'あしたは やすみです。',
      audioReveal: '明日は休みです (あしたは やすみです)',
      options: ['Kemarin cuaca hujan', 'Hari ini sangat sibuk', 'Minggu lalu pergi wisata', 'Besok adalah hari libur'],
      correctIndex: 3,
      explanation: '明日 (あした) = besok, 休み (やすみ) = libur / istirahat.',
    },
    {
      id: 'am-n5-6',
      kind: 'audio-choice',
      tag: 'Misi Audio N5',
      prompt: 'Dengarkan kalimat berikut, lalu pilih arti yang tepat:',
      audioText: 'ゆうびんきょくは 駅の まえに あります。',
      audioReveal: '郵便局は駅の前にあります (ゆうびんきょくは えきの まえに あります)',
      options: [
        'Kantor pos ada di depan stasiun',
        'Rumah sakit ada di belakang taman',
        'Bank ada di dalam stasiun',
        'Sekolah ada di sebelah toko',
      ],
      correctIndex: 0,
      explanation: '郵便局 (ゆうびんきょく) = kantor pos, 駅の前 (えきのまえ) = di depan stasiun.',
    },
  ],
  N4: [
    {
      id: 'am-n4-1',
      kind: 'audio-choice',
      tag: 'Misi Audio N4',
      prompt: 'Dengarkan kalimat berikut, lalu pilih maksud yang tepat:',
      audioText: 'すみませんが、もう少しゆっくり話していただけますか。',
      audioReveal: 'すみませんが、もう少しゆっくり話していただけますか。',
      options: [
        'Maaf, bisakah Anda berbicara sedikit lebih pelan?',
        'Maaf, apakah rapat hari ini sudah selesai?',
        'Maaf, bolehkah saya duduk di kursi ini?',
        'Maaf, bisakah Anda menuliskannya dengan huruf besar?',
      ],
      correctIndex: 0,
      explanation: '「ゆっくり話していただけますか」 adalah permintaan sangat sopan agar lawan bicara berbicara lebih pelan.',
    },
    {
      id: 'am-n4-2',
      kind: 'audio-choice',
      tag: 'Misi Audio N4',
      prompt: 'Dengarkan audio Jepang, lalu pilih arti yang benar:',
      audioText: '電車の事故で、三十分ぐらい遅れそうです。',
      audioReveal: '電車の事故で、30分ぐらい遅れそうです。',
      options: [
        'Kereta berangkat 30 menit lebih awal',
        'Karena kecelakaan kereta, sepertinya terlambat sekitar 30 menit',
        'Stasiun ditutup selama 30 menit untuk pemeriksaan',
        'Saya menunggu teman di peron selama 30 menit',
      ],
      correctIndex: 1,
      explanation: '事故 (じこ) = kecelakaan, 遅れそうです (おくれそうです) = sepertinya akan terlambat.',
    },
    {
      id: 'am-n4-3',
      kind: 'audio-choice',
      tag: 'Misi Audio N4',
      prompt: 'Dengarkan kalimat berikut, lalu pilih makna yang paling tepat:',
      audioText: '風邪をひかないように、毎日うがいをしています。',
      audioReveal: '風邪をひかないように、毎日うがいをしています。',
      options: [
        'Karena sedang flu, saya minum obat setiap pagi',
        'Supaya tidak masuk angin, saya berkumur setiap hari',
        'Saya lupa membawa jaket saat cuaca dingin',
        'Dokter melarang saya keluar rumah minggu ini',
      ],
      correctIndex: 1,
      explanation: '「～ないように」 menyatakan tujuan pencegahan ("agar tidak kena flu"), うがい = berkumur.',
    },
    {
      id: 'am-n4-4',
      kind: 'audio-choice',
      tag: 'Misi Audio N4',
      prompt: 'Dengarkan audio berikut, lalu pilih arti yang benar:',
      audioText: '部屋の電気をつけたまま、寝てしまいました。',
      audioReveal: '部屋の電気をつけたまま、寝てしまいました。',
      options: [
        'Saya mematikan lampu sebelum tidur',
        'Lampu kamar tiba-tiba padam tengah malam',
        'Saya telanjur tertidur dengan lampu kamar masih menyala',
        'Saya bangun pagi lalu menyalakan lampu kamar',
      ],
      correctIndex: 2,
      explanation: '「V-たまま」 menyatakan kondisi tetap bertahan (lampu dibiarkan menyala), 「寝てしまいました」 = telanjur tertidur.',
    },
    {
      id: 'am-n4-5',
      kind: 'audio-choice',
      tag: 'Misi Audio N4',
      prompt: 'Dengarkan kalimat berikut, lalu pilih maksudnya:',
      audioText: '来月、大阪へ出張することになりました。',
      audioReveal: '来月、大阪へ出張することになりました。',
      options: [
        'Bulan lalu saya baru pulang wisata dari Osaka',
        'Saya berencana pindah rumah ke Osaka tahun depan',
        'Sudah diputuskan bahwa bulan depan saya dinas ke Osaka',
        'Perjalanan dinas ke Osaka akhirnya dibatalkan',
      ],
      correctIndex: 2,
      explanation: '出張 (しゅっちょう) = perjalanan dinas, 「～ことになりました」 = telah diputuskan (oleh kantor/pihak luar).',
    },
    {
      id: 'am-n4-6',
      kind: 'audio-choice',
      tag: 'Misi Audio N4',
      prompt: 'Dengarkan audio Jepang, lalu pilih arti yang tepat:',
      audioText: 'この書類は明日までに提出しなければなりません。',
      audioReveal: 'この書類は明日までに提出しなければなりません。',
      options: [
        'Dokumen ini harus dikumpulkan paling lambat besok',
        'Dokumen ini boleh diserahkan minggu depan',
        'Dokumen ini sudah diperiksa oleh atasan kemarin',
        'Dokumen ini tidak perlu dibawa saat rapat',
      ],
      correctIndex: 0,
      explanation: '書類 (しょるい) = dokumen, 提出 (ていしゅつ) = pengumpulan, 「明日までに」 = paling lambat besok.',
    },
  ],
  N3: [
    {
      id: 'am-n3-1',
      kind: 'audio-choice',
      tag: '聴解ミッション N3',
      prompt: '音声を聞いて、内容に最も合うものを選んでください。',
      audioText: '雨のせいで、予定していた試合は来週に延期された。',
      audioReveal: '雨のせいで、予定していた試合は来週に延期された。',
      options: [
        '雨のため試合の日程が来週へ延びた',
        '雨が降ったが予定どおり試合を行った',
        '天気予報が外れて試合は中止になった',
        '先週の試合の結果が今日発表された',
      ],
      correctIndex: 0,
      explanation: '「延期された」(えんきされた) berarti ditunda ke jadwal berikutnya (minggu depan) karena hujan.',
    },
    {
      id: 'am-n3-2',
      kind: 'audio-choice',
      tag: '聴解ミッション N3',
      prompt: '音声で読まれた言葉の正しい漢字表記を選んでください。',
      audioText: '内容をかくにんする',
      audioReveal: '内容を確認する (ないようを かくにんする)',
      options: ['内容を確認する', '内容を拡張する', '内容を覚悟する', '内容を獲得する'],
      correctIndex: 0,
      explanation: '確認 (かくにん) = memastikan / mengecek kembali isi.',
    },
    {
      id: 'am-n3-3',
      kind: 'audio-choice',
      tag: '聴解ミッション N3',
      prompt: '音声を聞いて、話者の気持ちに最も近いものを選んでください。',
      audioText: 'せっかく早起きしたのに、一番見たかった展示が休みだった。',
      audioReveal: 'せっかく早起きしたのに、一番見たかった展示が休みだった。',
      options: [
        'せっかく早く起きたのに目当てが見られず残念だ',
        '早起きしたおかげで人気の展示をゆっくり見られた',
        '展示が休みだと知っていたので家でゆっくり寝た',
        '思ったより人が少なくてすぐに入場できた',
      ],
      correctIndex: 0,
      explanation: '「せっかく～のに」 mengungkapkan rasa kecewa/sayang karena usaha bangun pagi tidak membuahkan hasil.',
    },
    {
      id: 'am-n3-4',
      kind: 'audio-choice',
      tag: '聴解ミッション N3',
      prompt: '音声で流れた文の意味に最も近いものはどれですか。',
      audioText: '部長はさきほど会議室へいらっしゃいました。',
      audioReveal: '部長はさきほど会議室へいらっしゃいました。',
      options: [
        '部長は少し前に会議室へ行った',
        '部長はまだ会社に到着していない',
        '部長は会議室から自分の席へ戻った',
        '部長は今日の会議を欠席する予定だ',
      ],
      correctIndex: 0,
      explanation: '「いらっしゃいました」 adalah bentuk Sonkeigo (hormat) untuk 行く/来る/いる; さきほど = baru saja/beberapa saat lalu.',
    },
    {
      id: 'am-n3-5',
      kind: 'audio-choice',
      tag: '聴解ミッション N3',
      prompt: '音声を聞いて、正しい漢字の組み合わせを選んでください。',
      audioText: '問題をかいけつする',
      audioReveal: '問題を解決する (もんだいを かいけつする)',
      options: ['問題を解説する', '問題を解決する', '問題を改正する', '問題を解散する'],
      correctIndex: 1,
      explanation: '解決 (かいけつ) = menyelesaikan masalah. Jangan tertukar dengan 解説 (かいせつ = penjelasan).',
    },
    {
      id: 'am-n3-6',
      kind: 'audio-choice',
      tag: '聴解ミッション N3',
      prompt: '音声を聞いて、内容と合っているものを選んでください。',
      audioText: 'スープが冷めないうちに、どうぞ召し上がってください。',
      audioReveal: 'スープが冷めないうちに、どうぞ召し上がってください。',
      options: [
        'スープが温かいうちに早く食べてほしい',
        'スープが冷めてから食べたほうがおいしい',
        'スープを作り直すので少し待ってほしい',
        'スープの味が薄いので塩を足してほしい',
      ],
      correctIndex: 0,
      explanation: '「冷めないうちに」(selagi belum dingin) + 「召し上がってください」(silakan disantap, Sonkeigo).',
    },
  ],
  N2: [
    {
      id: 'am-n2-1',
      kind: 'audio-choice',
      tag: '聴解ミッション N2',
      prompt: '音声を聞いて、話の内容に最も合うものを選んでください。',
      audioText: '来期の予算配分については、次回の役員会で改めて検討する予定です。',
      audioReveal: '来期の予算配分については、次回の役員会で改めて検討する予定です。',
      options: [
        '次の役員会で予算の振り分け方をもう一度話し合う',
        '来期の予算はすでに今回の会議で最終決定した',
        '役員会が中止になったため予算案を白紙に戻す',
        '予算配分は各部署の判断だけで決めることにした',
      ],
      correctIndex: 0,
      explanation: '改めて検討する (あらためて けんとうする) = meninjau/membahas kembali secara saksama di rapat direksi berikutnya.',
    },
    {
      id: 'am-n2-2',
      kind: 'audio-choice',
      tag: '聴解ミッション N2',
      prompt: '音声で読まれた表現の正しい表記を選んでください。',
      audioText: 'さいがいへの たいさくを てっていする',
      audioReveal: '災害への対策を徹底する (さいがいへの たいさくを てっていする)',
      options: [
        '災害への対策を徹底する',
        '災害への対策を撤回する',
        '災害への対策を訂正する',
        '災害への対策を停滞する',
      ],
      correctIndex: 0,
      explanation: '徹底する (てっていする) = menerapkan secara menyeluruh dan konsisten tanpa celah.',
    },
    {
      id: 'am-n2-3',
      kind: 'audio-choice',
      tag: '聴解ミッション N2',
      prompt: '音声を聞いて、文の意味に最も近いものを選んでください。',
      audioText: '台風で交通機関が止まったため、本日の説明会は中止にせざるを得ない。',
      audioReveal: '台風で交通機関が止まったため、本日の説明会は中止にせざるを得ない。',
      options: [
        '交通が止まったのでやむを得ず説明会を中止する',
        '台風が近づいているが説明会は予定どおり開催する',
        '参加者が少ないため説明会の開始時刻を早める',
        'オンラインに切り替えて説明会を続けることにした',
      ],
      correctIndex: 0,
      explanation: '「～ざるを得ない」 menyatakan keterpaksaan karena tidak ada pilihan lain akibat transportasi lumpuh.',
    },
    {
      id: 'am-n2-4',
      kind: 'audio-choice',
      tag: '聴解ミッション N2',
      prompt: '音声を聞いて、正しい内容を選んでください。',
      audioText: 'このコンテストは年齢や経験を問わず、どなたでも応募できます。',
      audioReveal: 'このコンテストは年齢や経験を問わず、どなたでも応募できます。',
      options: [
        '年齢や経験の制限はなく誰でも参加を申し込める',
        '実務経験が三年以上ある人だけが応募できる',
        '学生を対象としているため社会人は参加できない',
        '過去の受賞者のみが招待されて出場できる',
      ],
      correctIndex: 0,
      explanation: '「～を問わず」 = tanpa memandang / tidak dibatasi oleh usia maupun pengalaman.',
    },
    {
      id: 'am-n2-5',
      kind: 'audio-choice',
      tag: '聴解ミッション N2',
      prompt: '音声で流れた熟語の正しい表記を選んでください。',
      audioText: 'げんじょうを せいかくに はあくする',
      audioReveal: '現状を正確に把握する (げんじょうを せいかくに はあくする)',
      options: [
        '現状を正確に把握する',
        '現状を正確に発揮する',
        '現状を正確に発覚する',
        '現状を正確に配置する',
      ],
      correctIndex: 0,
      explanation: '把握する (はあくする) = memahami/menguasai kondisi saat ini secara akurat.',
    },
    {
      id: 'am-n2-6',
      kind: 'audio-choice',
      tag: '聴解ミッション N2',
      prompt: '音声を聞いて、話者の言いたいことに最も近いものを選んでください。',
      audioText: '高い参考書を買ったからといって、必ず合格するとは限らない。',
      audioReveal: '高い参考書を買ったからといって、必ず合格するとは限らない。',
      options: [
        '高価な教材を買っても合格できるとは言い切れない',
        '高い参考書を使えば誰でも確実に合格できる',
        '安い参考書では試験に合格するのは難しい',
        '参考書を何冊も買うほど点数が上がりやすい',
      ],
      correctIndex: 0,
      explanation: '「～からといって～とは限らない」 menyangkal anggapan mutlak: membeli buku mahal belum tentu menjamin kelulusan.',
    },
  ],
  N1: [
    {
      id: 'am-n1-1',
      kind: 'audio-choice',
      tag: '聴解ミッション N1',
      prompt: '音声を聞いて、文の趣旨に最も近いものを選んでください。',
      audioText: '安全基準に関しては、いかなる事情があっても一切妥協は許されない。',
      audioReveal: '安全基準に関しては、いかなる事情があっても一切妥協は許されない。',
      options: [
        'どのような理由があっても安全基準を緩めてはならない',
        '緊急時には状況に応じて安全基準を柔軟に緩和すべきだ',
        'コスト削減のため一部の安全確認は省略しても構わない',
        '安全基準の見直しは現場の裁量に任せるのが望ましい',
      ],
      correctIndex: 0,
      explanation: 'いかなる事情があっても = apa pun alasannya; 妥協 (だきょう) = kompromi.',
    },
    {
      id: 'am-n1-2',
      kind: 'audio-choice',
      tag: '聴解ミッション N1',
      prompt: '音声で読まれた語句の正しい表記を選んでください。',
      audioText: 'じんそくな たいおうに かんしゃいたします',
      audioReveal: '迅速な対応に感謝いたします (じんそくな たいおうに かんしゃいたします)',
      options: [
        '迅速な対応に感謝いたします',
        '深刻な対応に感謝いたします',
        '慎重な対応に感謝いたします',
        '新設な対応に感謝いたします',
      ],
      correctIndex: 0,
      explanation: '迅速 (じんそく) = cepat, tanggap, dan sigap.',
    },
    {
      id: 'am-n1-3',
      kind: 'audio-choice',
      tag: '聴解ミッション N1',
      prompt: '音声を聞いて、内容に最も合致するものを選んでください。',
      audioText: '前回の調査で明らかになった課題を踏まえて、次期の施策を見直す必要がある。',
      audioReveal: '前回の調査で明らかになった課題を踏まえて、次期の施策を見直す必要がある。',
      options: [
        '前回調査の課題をもとに次期の方針を改善すべきだ',
        '前回調査の結果は古いため完全に無視して新計画を立てる',
        'すでに十分な成果が出ているので次期の変更は不要だ',
        '調査をやり直してから来年の予算を削減する予定だ',
      ],
      correctIndex: 0,
      explanation: '「～を踏まえて」 = berpijak pada / mempertimbangkan temuan masalah sebelumnya.',
    },
    {
      id: 'am-n1-4',
      kind: 'audio-choice',
      tag: '聴解ミッション N1',
      prompt: '音声を聞いて、文の意味として最も適切なものを選んでください。',
      audioText: '周囲の強い反対をよそに、彼は自分の信じた研究テーマを貫いた。',
      audioReveal: '周囲の強い反対をよそに、彼は自分の信じた研究テーマを貫いた。',
      options: [
        '周りの反対を気にせず自分の研究方針を最後まで押し通した',
        '周囲の意見を受け入れて研究テーマを途中で変更した',
        '周囲の強い支援に支えられて研究を早期に完了させた',
        '反対意見が多かったため研究計画を無期限に延期した',
      ],
      correctIndex: 0,
      explanation: '「～をよそに」 = mengabaikan / tak menghiraukan penentangan sekitar; 貫く (つらぬく) = teguh menjalankan sampai tuntas.',
    },
    {
      id: 'am-n1-5',
      kind: 'audio-choice',
      tag: '聴解ミッション N1',
      prompt: '音声で読まれた表現の正しい漢字表記を選んでください。',
      audioText: 'せっとくりょくに とむ ていあん',
      audioReveal: '説得力に富む提案 (せっとくりょくに とむ ていあん)',
      options: [
        '説得力に富む提案',
        '説得力に飛ぶ提案',
        '説得力に止む提案',
        '説得力に組む提案',
      ],
      correctIndex: 0,
      explanation: '「～に富む」(にとむ) berarti kaya akan / penuh dengan (daya persuasi yang kuat).',
    },
    {
      id: 'am-n1-6',
      kind: 'audio-choice',
      tag: '聴解ミッション N1',
      prompt: '音声を聞いて、話者の主張に最も近いものを選んでください。',
      audioText: '地域住民の協力なくしては、この防災計画の実現は不可能だっただろう。',
      audioReveal: '地域住民の協力なくしては、この防災計画の実現は不可能だっただろう。',
      options: [
        '住民の協力があったからこそ防災計画を実現できた',
        '行政だけの力で十分に防災計画を達成できたはずだ',
        '住民の協力を得られず防災計画は実現に至らなかった',
        '防災計画の策定には地域住民の参加は不可欠ではない',
      ],
      correctIndex: 0,
      explanation: '「～なくしては…不可能だった」 menegaskan bahwa kerja sama warga merupakan syarat mutlak terwujudnya rencana.',
    },
  ],
};

/**
 * 5 Dedicated Curated Boss Stages — Stage 6 of every JLPT chapter (Stages 6, 12, 18, 24, 30).
 * Defeating a chapter Boss unlocks Stage 1 of the next JLPT chapter!
 * Each Boss has 8 HP and mixes all 3 question formats: MCQ, Susun Kalimat JLPT (★), and Tebak Audio Jepang.
 */
export const BOSS_CHALLENGE_STAGES: ChallengeStage[] = [
  // =========================================================================
  // BOSS N5 (Stage 6)
  // =========================================================================
  {
    id: 'boss-n5',
    order: 6,
    chapter: 'Bab 1 · EGG (N5 Dasar)',
    jlptLevel: 'N5',
    mode: 'boss',
    stageKind: 'boss',
    isCampaignStage: true,
    bossName: 'Tamago Guardian',
    bossTitle: 'Boss Akhir N5 · Gerbang Fondasi',
    bossMaxHp: 8,
    title: 'Boss Stage N5 · Gerbang Fondasi',
    subtitle: '8 HP Boss · Kalahkan untuk membuka Bab 2 (N4)',
    xpReward: 150,
    questions: [
      {
        id: 'bn5-q1',
        kind: 'audio-choice',
        tag: 'Tebak Audio N5',
        prompt: 'Dengarkan audio Jepang, lalu pilih arti yang tepat:',
        audioText: '図書館で本を借ります。',
        audioReveal: '図書館で本を借ります (としょかんで ほんを かります)',
        options: [
          'Meminjam buku di perpustakaan',
          'Membeli koran di toko buku',
          'Membaca surat di ruang kelas',
          'Menulis catatan di rumah',
        ],
        correctIndex: 0,
        explanation:
          '図書館 (としょかん) = perpustakaan, 本を借ります = meminjam buku.',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[0], 'bn5-q2'),
      {
        id: 'bn5-q3',
        kind: 'mcq',
        tag: 'Bunpou N5',
        prompt: 'Lengkapi kalimat: 「雨が降っています＿＿＿、傘を持っていきます。」',
        options: ['から', 'でも', 'ほど', 'しか'],
        correctIndex: 0,
        explanation:
          '「～から」 menyatakan alasan/sebab (karena sedang hujan, saya membawa payung).',
      },
      {
        id: 'bn5-q4',
        kind: 'audio-choice',
        tag: 'Tebak Audio N5',
        prompt: 'Dengarkan kata yang diucapkan, lalu pilih arti yang benar:',
        audioText: '来週の水曜日',
        audioReveal: '来週の水曜日 (らいしゅうの すいようび)',
        options: [
          'Hari Rabu minggu lalu',
          'Hari Rabu minggu depan',
          'Hari Kamis minggu depan',
          'Hari Selasa bulan depan',
        ],
        correctIndex: 1,
        explanation:
          '来週 (らいしゅう) = minggu depan, 水曜日 (すいようび) = hari Rabu.',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[2], 'bn5-q5'),
      {
        id: 'bn5-q6',
        kind: 'mcq',
        tag: 'Kosakata N5',
        prompt: 'Pilih pasangan bacaan yang tepat untuk 「電気」:',
        options: ['てんき', 'でんき', 'げんき', 'べんき'],
        correctIndex: 1,
        explanation:
          '電気 dibaca でんき (listrik / lampu), sedangkan 天気 (てんき) = cuaca, 元気 (げんき) = sehat.',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[3], 'bn5-q7'),
      {
        id: 'bn5-q8',
        kind: 'mcq',
        tag: 'Serangan Penutup N5',
        prompt: 'Lengkapi kalimat: 「この靴は軽くて、とても歩き＿＿＿です。」',
        options: ['やすい', 'すぎる', 'ながら', 'ほしい'],
        correctIndex: 0,
        explanation:
          '「V-ます形 + やすい」 berarti mudah dilakukan (歩きやすい = nyaman/mudah dipakai berjalan).',
      },
    ],
  },

  // =========================================================================
  // BOSS N4 (Stage 12)
  // =========================================================================
  {
    id: 'boss-n4',
    order: 12,
    chapter: 'Bab 2 · HATCH (N4 Menengah Awal)',
    jlptLevel: 'N4',
    mode: 'boss',
    stageKind: 'boss',
    isCampaignStage: true,
    bossName: 'Hatch Sentinel',
    bossTitle: 'Boss Akhir N4 · Jembatan Menetas',
    bossMaxHp: 8,
    title: 'Boss Stage N4 · Jembatan Menetas',
    subtitle: '8 HP Boss · Kalahkan untuk membuka Bab 3 (N3)',
    xpReward: 180,
    questions: [
      {
        id: 'bn4-q1',
        kind: 'audio-choice',
        tag: 'Tebak Audio N4',
        prompt: 'Dengarkan kalimat Jepang berikut, lalu pilih maksudnya:',
        audioText: '会議の時間を間違えてしまいました。',
        audioReveal: '会議の時間を間違えてしまいました (かいぎの じかんを まちがえて しまいました)',
        options: [
          'Saya telanjur salah mengira waktu rapat',
          'Waktu rapat akhirnya dimajukan lebih awal',
          'Saya sudah mencatat jadwal rapat dengan benar',
          'Rapat hari ini dibatalkan karena hujan',
        ],
        correctIndex: 0,
        explanation:
          '間違えてしまいました (bentuk ～てしまう) menyatakan penyesalan karena tidak sengaja salah.',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[6], 'bn4-q2'),
      {
        id: 'bn4-q3',
        kind: 'mcq',
        tag: 'Bunpou N4',
        prompt: 'Lengkapi kalimat: 「日本語が上手になる＿＿＿、毎日ニュースを聞いています。」',
        options: ['ように', 'そうに', 'らしい', 'ばかり'],
        correctIndex: 0,
        explanation:
          '「V-potensial/non-volitional + ように」 menyatakan tujuan (agar bahasa Jepang menjadi mahir).',
      },
      {
        id: 'bn4-q4',
        kind: 'audio-choice',
        tag: 'Tebak Audio N4',
        prompt: 'Dengarkan audio Jepang, lalu pilih arti yang tepat:',
        audioText: 'パスポートを忘れないでください。',
        audioReveal: 'パスポートを忘れないでください (ぱすぽーとを わすれないで ください)',
        options: [
          'Tolong tunjukkan paspor Anda di loket',
          'Tolong jangan sampai lupa membawa paspor',
          'Paspor ini sudah habis masa berlakunya',
          'Saya menitipkan paspor di meja resepsionis',
        ],
        correctIndex: 1,
        explanation:
          '「V-ないでください」 = tolong jangan melakukan… (忘れないでください = tolong jangan lupa).',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[7], 'bn4-q5'),
      {
        id: 'bn4-q6',
        kind: 'mcq',
        tag: 'Keigo N4',
        prompt: 'Bentuk sopan (Sonkeigo) untuk menanyakan apakah guru akan datang besok:',
        options: [
          '先生は明日いらっしゃいますか。',
          '先生は明日まいりますか。',
          '先生は明日おりますか。',
          '先生は明日いたしますか。',
        ],
        correctIndex: 0,
        explanation:
          '「いらっしゃいます」 adalah bentuk hormat (Sonkeigo) dari 来ます/行きます/います, sedangkan まいります/おります adalah Kenjougo (merendahkan diri).',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[8], 'bn4-q7'),
      {
        id: 'bn4-q8',
        kind: 'mcq',
        tag: 'Serangan Penutup N4',
        prompt: 'Lengkapi kalimat: 「さっき掃除した＿＿＿なのに、もう部屋が汚いです。」',
        options: ['ばかり', 'ながら', 'はず', 'つもり'],
        correctIndex: 0,
        explanation:
          '「V-たばかり」 = baru saja selesai dilakukan (padahal baru saja dibersihkan, kamarnya sudah kotor lagi).',
      },
    ],
  },

  // =========================================================================
  // BOSS N3 (Stage 18 — FULL JAPANESE)
  // =========================================================================
  {
    id: 'boss-n3',
    order: 18,
    chapter: 'Bab 3 · CHICK (N3 Menengah)',
    jlptLevel: 'N3',
    mode: 'boss',
    stageKind: 'boss',
    isCampaignStage: true,
    bossName: '試練の番人',
    bossTitle: 'Boss Akhir N3 · 試練の番人',
    bossMaxHp: 8,
    title: 'Boss Stage N3 · 試練の番人',
    subtitle: '8 HP Boss · Full Jepang · Kalahkan untuk membuka Bab 4 (N2)',
    xpReward: 220,
    questions: [
      {
        id: 'bn3-q1',
        kind: 'audio-choice',
        tag: '聴解クイズ N3',
        prompt: '音声をよく聞いて、内容に最も合う表現を選んでください。',
        audioText: '締め切りに間に合うように、急いで準備を進めています。',
        audioReveal: '締め切りに間に合うように、急いで準備を進めています。',
        options: [
          '期限に遅れないよう作業を急いでいる',
          '期限が延びたのでゆっくり休んでいる',
          '準備がすべて終わって安心している',
          '締め切りを忘れて計画を中止した',
        ],
        correctIndex: 0,
        explanation:
          '締め切り (tenggat waktu) に間に合うように急いで進めている = bekerja cepat agar tidak terlambat dari tenggat.',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[12], 'bn3-q2'),
      {
        id: 'bn3-q3',
        kind: 'mcq',
        tag: '文法 N3',
        prompt: '次の（　）に入る最も適切な言葉はどれですか。\n「雨が降っている（　）、彼は傘もささずに歩いていった。」',
        options: ['にもかかわらず', 'おかげで', 'ついでに', 'かわりに'],
        correctIndex: 0,
        explanation:
          '「～にもかかわらず」(meskipun…) mengekspresikan kontras kuat: padahal hujan, ia tetap berjalan tanpa payung.',
      },
      {
        id: 'bn3-q4',
        kind: 'audio-choice',
        tag: '聴解クイズ N3',
        prompt: '音声で読まれた言葉の正しい漢字表記を選んでください。',
        audioText: '計画を変更する',
        audioReveal: '計画を変更する (けいかくを へんこうする)',
        options: ['計画を変更する', '計画を返事する', '計画を研究する', '計画を遠慮する'],
        correctIndex: 0,
        explanation:
          '変更 (へんこう) berarti perubahan/mengubah (rencana).',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[13], 'bn3-q5'),
      {
        id: 'bn3-q6',
        kind: 'mcq',
        tag: '語彙 N3',
        prompt: '下線の言葉に最も近い意味はどれですか。\n「新しい環境にようやく【慣れた】。」',
        options: ['違和感がなくなった', 'すぐ飽きてしまった', '急に不安になった', '全部忘れてしまった'],
        correctIndex: 0,
        explanation:
          '「慣れる」(terbiasa) mendekati makna 「違和感がなくなる」(rasa canggung/asing hilang).',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[16], 'bn3-q7'),
      {
        id: 'bn3-q8',
        kind: 'mcq',
        tag: '最終問題 N3',
        prompt: '次の（　）に入る最も適切な表現はどれですか。\n「一度引き受けた（　）、最後まで責任を持ってやり遂げたい。」',
        options: ['以上は', 'わりに', '最中に', 'とたんに'],
        correctIndex: 0,
        explanation:
          '「V-た以上は」(karena sudah telanjur menerima/berjanji…) diikuti tekad atau kewajiban kuat.',
      },
    ],
  },

  // =========================================================================
  // BOSS N2 (Stage 24 — FULL JAPANESE)
  // =========================================================================
  {
    id: 'boss-n2',
    order: 24,
    chapter: 'Bab 4 · GROW (N2 Menengah Atas)',
    jlptLevel: 'N2',
    mode: 'boss',
    stageKind: 'boss',
    isCampaignStage: true,
    bossName: '実戦の覇者',
    bossTitle: 'Boss Akhir N2 · 実戦の覇者',
    bossMaxHp: 8,
    title: 'Boss Stage N2 · 実戦の覇者',
    subtitle: '8 HP Boss · Full Jepang · Kalahkan untuk membuka Bab 5 (N1)',
    xpReward: 260,
    questions: [
      {
        id: 'bn2-q1',
        kind: 'audio-choice',
        tag: '聴解クイズ N2',
        prompt: '音声を聞いて、話者の意図に最も近いものを選んでください。',
        audioText: 'この件については、早急に検討したうえでご連絡いたします。',
        audioReveal: 'この件については、早急に検討したうえでご連絡いたします。',
        options: [
          'すぐ確認・検討してから折り返し連絡する',
          'その件は対象外なので対応を断る',
          'すでに結論が出たため連絡は不要だ',
          '来月まで待ってから改めて相談したい',
        ],
        correctIndex: 0,
        explanation:
          '早急に (segera) + 検討したうえで (setelah menimbang) + ご連絡いたします (akan menghubungi kembali).',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[18], 'bn2-q2'),
      {
        id: 'bn2-q3',
        kind: 'mcq',
        tag: '文法 N2',
        prompt: '次の（　）に入る最も適切な表現はどれですか。\n「最新の調査（　）、若者の読書時間は増加傾向にあるという。」',
        options: ['によると', 'にわたって', 'に際して', 'をめぐって'],
        correctIndex: 0,
        explanation:
          '「～によると…という」 mengutip sumber informasi/hasil survei.',
      },
      {
        id: 'bn2-q4',
        kind: 'audio-choice',
        tag: '聴解クイズ N2',
        prompt: '音声で流れた語句の正しい表記を選んでください。',
        audioText: '状況を把握する',
        audioReveal: '状況を把握する (じょうきょうを はあくする)',
        options: ['状況を把握する', '状況を派遣する', '状況を排除する', '状況を配慮する'],
        correctIndex: 0,
        explanation:
          '把握 (はあく) = memahami/menguasai situasi secara menyeluruh.',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[19], 'bn2-q5'),
      {
        id: 'bn2-q6',
        kind: 'mcq',
        tag: '文法 N2',
        prompt: '次の（　）に入る最も適切な表現はどれですか。\n「どんなに準備をした（　）、本番で予期せぬ事態は起こり得る。」',
        options: ['としても', 'あまり', 'だけに', 'ばかりに'],
        correctIndex: 0,
        explanation:
          '「どんなに～としても」(seberapa pun matangnya persiapan, tetap saja…) menyatakan pengandaian konsesif.',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[23], 'bn2-q7'),
      {
        id: 'bn2-q8',
        kind: 'mcq',
        tag: '最終問題 N2',
        prompt: '次の（　）に入る最も適切な言葉はどれですか。\n「住民の反対を押し切って工事を進めた（　）、激しい批判を浴びた。」',
        options: ['あげく', 'ついでに', 'かぎりに', 'つつも'],
        correctIndex: 0,
        explanation:
          '「V-たあげく」(setelah sekian lama/memaksakan…, akhirnya berujung hasil buruk).',
      },
    ],
  },

  // =========================================================================
  // BOSS N1 (Stage 30 — FULL JAPANESE)
  // =========================================================================
  {
    id: 'boss-n1',
    order: 30,
    chapter: 'Bab 5 · FLY (N1 Mahir)',
    jlptLevel: 'N1',
    mode: 'boss',
    stageKind: 'boss',
    isCampaignStage: true,
    bossName: '極みの賢者',
    bossTitle: 'Boss Akhir N1 · 極みの賢者',
    bossMaxHp: 8,
    title: 'Boss Stage N1 · 極みの賢者',
    subtitle: '8 HP Boss · Ujian Puncak JLPT N1 (Full Jepang)',
    xpReward: 320,
    questions: [
      {
        id: 'bn1-q1',
        kind: 'audio-choice',
        tag: '聴解クイズ N1',
        prompt: '音声を聞いて、文の意味に最も近いものを選んでください。',
        audioText: '目先の利益にとらわれず、長期的な視点で判断すべきだ。',
        audioReveal: '目先の利益にとらわれず、長期的な視点で判断すべきだ。',
        options: [
          '短期的な得失に縛られず長い目で決めるべきだ',
          '今すぐ利益が出る案だけを優先すべきだ',
          '将来の見通しは不確かなので判断を先送りすべきだ',
          '過去の成功例をそのまま踏襲すべきだ',
        ],
        correctIndex: 0,
        explanation:
          '目先の利益にとらわれず = tidak terpaku pada keuntungan jangka pendek; 長期的な視点 = sudut pandang jangka panjang.',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[24], 'bn1-q2'),
      {
        id: 'bn1-q3',
        kind: 'mcq',
        tag: '文法 N1',
        prompt: '次の（　）に入る最も適切な表現はどれですか。\n「彼女の圧倒的な演技力には、誰もが感嘆（　）。」',
        options: [
          'せざるを得なかった',
          'するまでもなかった',
          'しかねなかった',
          'しがたかった',
        ],
        correctIndex: 0,
        explanation:
          '「感嘆せざるを得ない」(tidak bisa tidak kagum / mau tidak mau terpukau).',
      },
      {
        id: 'bn1-q4',
        kind: 'audio-choice',
        tag: '聴解クイズ N1',
        prompt: '音声で読まれた熟語の正しい表記を選んでください。',
        audioText: '本質を見極める',
        audioReveal: '本質を見極める (ほんしつを みきわめる)',
        options: ['本質を見極める', '本質を見落とす', '本質を見過ごす', '本質を見合わせる'],
        correctIndex: 0,
        explanation:
          '見極める (みきわめる) = menelisik dan memastikan inti/hakikat secara saksama.',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[25], 'bn1-q5'),
      {
        id: 'bn1-q6',
        kind: 'mcq',
        tag: '語彙 N1',
        prompt: '下線の言葉の意味として最も適切なものはどれですか。\n「膨大な資料を【網羅】した報告書が完成した。」',
        options: [
          '漏れなくすべて含めている',
          '不要な部分を大幅に削っている',
          '要点だけを簡潔に要約している',
          '古い記録を新しい順に並べている',
        ],
        correctIndex: 0,
        explanation:
          '網羅する (もうらする) = mencakup keseluruhan tanpa ada yang terlewat.',
      },
      templateToSentenceOrderQuestion(SENTENCE_ORDER_BANK[27], 'bn1-q7'),
      {
        id: 'bn1-q8',
        kind: 'mcq',
        tag: '最終問題 N1',
        prompt: '次の（　）に入る最も適切な表現はどれですか。\n「今回の不祥事は、企業としての信頼を根底から揺るがすものに（　）。」',
        options: ['ほかならない', 'すぎない', 'かぎらない', 'あたらない'],
        correctIndex: 0,
        explanation:
          '「～にほかならない」(tiada lain adalah / benar-benar merupakan…) menegaskan penilaian kuat pembicara.',
      },
    ],
  },
];

export function getBossStageForLevel(level: JlptLevel): ChallengeStage | undefined {
  return BOSS_CHALLENGE_STAGES.find((boss) => boss.jlptLevel === level);
}
