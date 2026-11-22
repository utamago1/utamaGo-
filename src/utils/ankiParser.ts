export type AnkiDeckLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type AnkiDeckCategory = 'kosakata' | 'bunpou';
export type AnkiDeckId =
  | AnkiDeckLevel
  | 'N5_BUNPOU'
  | 'N4_BUNPOU'
  | 'N3_BUNPOU'
  | 'N2_BUNPOU'
  | 'N1_BUNPOU';

export type AnkiCategoryGroup =
  | 'Semua'
  | 'Kata benda'
  | 'Kata kerja'
  | 'Kata sifat'
  | 'Kata keterangan & Lainnya';

export type AnkiRating = 'again' | 'hard' | 'good' | 'easy';

export interface AnkiExample {
  jp: string;
  id: string;
}

export interface AnkiCard {
  id: string;
  index: number;
  word: string;
  partOfSpeech: string;
  categoryGroup: Exclude<AnkiCategoryGroup, 'Semua'>;
  readingTerm: string;
  furigana: string | null;
  meaning: string;
  examples: AnkiExample[];
  tag: string;
  deckId?: AnkiDeckId;
  category?: AnkiDeckCategory;
  jlptLevel?: AnkiDeckLevel;
  cardKind?: 'vocab' | 'bunpou';
  code?: string;
  romaji?: string;
  formula?: string;
  note?: string;
  register?: string;
  crossReference?: string;
  lessonNumber?: number;
  lessonTitle?: string;
  groupId?: string;
  groupTitle?: string;
}

export interface RubySegment {
  base: string;
  ruby?: string;
}

const KANJI_CHAR_REGEX = /[\u4e00-\u9faf々]/;

/**
 * Splits a readingTerm like "上げる(あげる)" or "学校(がっこう)" or "茶わん(ちゃわん)"
 * into aligned ruby segments so okurigana / kana prefixes stay outside <ruby> tags.
 */
export function splitReadingForRuby(readingTerm: string): RubySegment[] {
  const trimmed = readingTerm.trim();
  if (!trimmed) return [];

  const match = trimmed.match(/^(.+?)\(([^)]+)\)$/);
  if (!match) {
    return [{ base: trimmed }];
  }

  const fullBase = match[1].trim();
  const fullReading = match[2].trim();
  if (!fullBase || !fullReading) {
    return [{ base: trimmed }];
  }

  let start = 0;
  while (
    start < fullBase.length &&
    start < fullReading.length &&
    !KANJI_CHAR_REGEX.test(fullBase[start]) &&
    fullBase[start] === fullReading[start]
  ) {
    start++;
  }

  let baseEnd = fullBase.length - 1;
  let readEnd = fullReading.length - 1;
  while (
    baseEnd >= start &&
    readEnd >= start &&
    !KANJI_CHAR_REGEX.test(fullBase[baseEnd]) &&
    fullBase[baseEnd] === fullReading[readEnd]
  ) {
    baseEnd--;
    readEnd--;
  }

  const segments: RubySegment[] = [];
  if (start > 0) {
    segments.push({ base: fullBase.slice(0, start) });
  }

  const coreBase = fullBase.slice(start, baseEnd + 1);
  const coreReading = fullReading.slice(start, readEnd + 1);
  if (coreBase) {
    if (KANJI_CHAR_REGEX.test(coreBase) && coreReading) {
      segments.push({ base: coreBase, ruby: coreReading });
    } else {
      segments.push({ base: coreBase });
    }
  }

  if (baseEnd + 1 < fullBase.length) {
    segments.push({ base: fullBase.slice(baseEnd + 1) });
  }

  return segments.length > 0 ? segments : [{ base: fullBase }];
}

export const ANKI_N5_DECK_URL = '/assets/aistudio/JLPT_N5_Indonesia_7e38cf1d.txt';
export const ANKI_N4_DECK_URL = '/assets/aistudio/JLPT_N4_Indonesia.txt';
export const ANKI_N3_DECK_URL = '/assets/aistudio/JLPT_N3_Indonesia.txt';
export const ANKI_N2_DECK_URL = '/assets/aistudio/JLPT_N2_Indonesia.txt';
export const ANKI_N1_DECK_URL = '/assets/aistudio/JLPT_N1_Indonesia.txt';

export const ANKI_CATEGORIES: AnkiCategoryGroup[] = [
  'Semua',
  'Kata benda',
  'Kata kerja',
  'Kata sifat',
  'Kata keterangan & Lainnya',
];

export function categorizePartOfSpeech(
  partOfSpeech: string,
): Exclude<AnkiCategoryGroup, 'Semua'> {
  const normalized = partOfSpeech.trim().toLowerCase();
  if (normalized.startsWith('kata kerja')) {
    return 'Kata kerja';
  }
  if (normalized.startsWith('kata sifat')) {
    return 'Kata sifat';
  }
  if (normalized.startsWith('kata benda')) {
    return 'Kata benda';
  }
  return 'Kata keterangan & Lainnya';
}

function splitFirstIdeographicSpace(input: string): [string, string] {
  const idx = input.indexOf('\u3000');
  if (idx !== -1) {
    return [input.slice(0, idx).trim(), input.slice(idx + 1).trim()];
  }
  const spaceIdx = input.search(/\s+/);
  if (spaceIdx !== -1) {
    return [input.slice(0, spaceIdx).trim(), input.slice(spaceIdx).trim()];
  }
  return [input.trim(), ''];
}

function inferJlptLevelFromTag(tag: string): AnkiDeckLevel {
  const lower = tag.toLowerCase();
  if (lower.includes('n1')) return 'N1';
  if (lower.includes('n2')) return 'N2';
  if (lower.includes('n3')) return 'N3';
  if (lower.includes('n4')) return 'N4';
  return 'N5';
}

export function parseAnkiTxtDeck(
  rawText: string,
  levelOverride?: AnkiDeckLevel,
): AnkiCard[] {
  const lines = rawText.split(/\r?\n/);
  const cards: AnkiCard[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const columns = line.split('\t');
    if (columns.length < 2) {
      continue;
    }

    const [frontRaw, backRaw, tagRaw = 'jlpt-n5'] = columns;
    const [word, partOfSpeech] = splitFirstIdeographicSpace(frontRaw);
    if (!word) {
      continue;
    }

    const blocks = backRaw.split(/<br\s*\/?>\s*<br\s*\/?>/i);
    const headerBlock = blocks[0] ?? '';
    const [readingTerm, meaning] = splitFirstIdeographicSpace(headerBlock);

    const furiganaMatch = readingTerm.match(/^(.+?)\(([^)]+)\)$/);
    const furigana = furiganaMatch ? furiganaMatch[2].trim() : null;

    const examples: AnkiExample[] = [];
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i].trim();
      if (!block) continue;
      const parts = block.split(/<br\s*\/?>/i).map((part) => part.trim());
      const jpRaw = parts[0] ?? '';
      const jp = jpRaw.replace(/^\d+\.\s*/, '').trim();
      const id = parts.slice(1).join(' ').trim();
      if (jp) {
        examples.push({ jp, id });
      }
    }

    const tag = tagRaw.trim() || 'jlpt-n5';
    const jlptLevel = levelOverride ?? inferJlptLevelFromTag(tag);
    const index = cards.length;
    cards.push({
      id: `${tag}-${index + 1}-${word}`,
      index,
      word,
      partOfSpeech: partOfSpeech || 'Kosakata',
      categoryGroup: categorizePartOfSpeech(partOfSpeech),
      readingTerm: readingTerm || word,
      furigana,
      meaning: meaning || '',
      examples,
      tag,
      deckId: jlptLevel,
      category: 'kosakata',
      jlptLevel,
      cardKind: 'vocab',
    });
  }

  return cards;
}

export function filterAnkiCards(
  cards: AnkiCard[],
  query: string,
  category: AnkiCategoryGroup,
): AnkiCard[] {
  const trimmedQuery = query.trim().toLowerCase();

  return cards.filter((card) => {
    if (category !== 'Semua' && card.categoryGroup !== category) {
      return false;
    }

    if (!trimmedQuery) {
      return true;
    }

    const haystack = [
      card.word,
      card.readingTerm,
      card.furigana ?? '',
      card.meaning,
      card.partOfSpeech,
      card.code ?? '',
      card.romaji ?? '',
      card.formula ?? '',
      card.note ?? '',
      card.lessonTitle ?? '',
      ...card.examples.map((ex) => `${ex.jp} ${ex.id}`),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(trimmedQuery);
  });
}

export function applyAnkiRating(
  queue: number[],
  currentPos: number,
  rating: AnkiRating,
): { nextQueue: number[]; nextPos: number } {
  if (queue.length === 0) {
    return { nextQueue: [], nextPos: 0 };
  }

  const safePos = Math.max(0, Math.min(currentPos, queue.length - 1));
  const currentCardIdx = queue[safePos];

  if (rating === 'again' && queue.length > 1) {
    const nextQueue = [...queue];
    const insertAt = Math.min(safePos + 4, nextQueue.length);
    nextQueue.splice(insertAt, 0, currentCardIdx);
    return {
      nextQueue,
      nextPos: Math.min(safePos + 1, nextQueue.length - 1),
    };
  }

  const nextPos = safePos + 1 < queue.length ? safePos + 1 : 0;
  return {
    nextQueue: queue,
    nextPos,
  };
}

export const INITIAL_ANKI_N5_SEED = `#separator:tab
#html:true
#tags column:3
かばん　Kata benda	かばん　Tas (tas jinjing, tas kerja, koper kecil)<br><br>1. このかばんは軽いです。<br>Tas ini ringan.<br><br>2. かばんの中に本が入っています。<br>Di dalam tas ada buku.	jlpt-n5
ください　Ungkapan	ください　Tolong (berikan kepada saya)<br><br>1. 水をください。<br>Tolong beri saya air.<br><br>2. この本をください。<br>Tolong beri saya buku ini.	jlpt-n5
いる　Kata kerja (Ichidan) - intransitif	いる　Ada, berada (untuk makhluk hidup)<br><br>1. 弟は部屋にいます。<br>Adik laki-laki ada di kamar.<br><br>2. 犬が庭にいます。<br>Ada anjing di halaman.	jlpt-n5
こちら　Kata ganti	こちら　Arah sini, ke sini<br><br>1. こちらへどうぞ。<br>Silakan lewat sini.<br><br>2. こちらは田中さんです。<br>Ini Tanaka-san. (memperkenalkan orang)	jlpt-n5
やさしい　Kata sifat-i	やさしい　Mudah, sederhana<br><br>1. この問題はやさしいです。<br>Soal ini mudah.<br><br>2. やさしい日本語で話してください。<br>Tolong bicara dengan bahasa Jepang yang mudah.	jlpt-n5`;

export const INITIAL_ANKI_N4_SEED = `#separator:tab
#html:true
#tags column:3
ぶどう　Kata benda	ぶどう　Anggur<br><br>1. ぶどうを洗って食べます。<br>Saya mencuci anggur lalu memakannya.<br><br>2. このぶどうは甘いです。<br>Anggur ini manis.	jlpt-n4
いたす　Kata kerja (Godan) - transitif	いたす　Melakukan (bentuk rendah hati)<br><br>1. 私が致します。<br>Saya yang akan melakukannya.<br><br>2. ご案内致します。<br>Saya akan memandu Anda.	jlpt-n4
おかしい　Kata sifat-i	おかしい　Aneh, lucu<br><br>1. この話はおかしいです。<br>Cerita ini lucu.<br><br>2. 機械の音がおかしいです。<br>Suara mesinnya aneh.	jlpt-n4`;

export const INITIAL_ANKI_N3_SEED = `#separator:tab
#html:true
#tags column:3
ほど　Kata benda / Kata keterangan	ほど　Sejauh, tingkat, kira-kira<br><br>1. 思ったほど難しくありませんでした。<br>Tidak sesulit yang saya kira.<br><br>2. 忙しいほど充実感があります。<br>Semakin sibuk, semakin terasa kepuasannya.	jlpt-n3
さる　Kata benda	さる　Monyet<br><br>1. 昨日、図鑑でさるの生態について調べました。<br>Kemarin saya mencari tahu tentang kehidupan monyet di ensiklopedia.<br><br>2. 自然の中で生きているさるの姿を一度見てみたいです。<br>Saya ingin sekali melihat langsung sosok monyet yang hidup di alam.	jlpt-n3
かご　Kata benda	かご　Keranjang, sangkar<br><br>1. 必要なかごを机の上に並べて確認しました。<br>Saya menata dan memeriksa keranjang yang diperlukan di atas meja.<br><br>2. 壊れやすいので、このかごは丁寧に扱ってください。<br>Karena mudah rusak, tolong tangani keranjang ini dengan hati-hati.	jlpt-n3`;

export const INITIAL_ANKI_N2_SEED = `#separator:tab
#html:true
#tags column:3
もち　Kata benda	もち　Mochi, kue beras ketan<br><br>1. スーパーで新鮮なもちを買って帰りました。<br>Saya membeli mochi segar di supermarket lalu pulang.<br><br>2. この店で作られているもちは本当においしいです。<br>Mochi yang dibuat di toko ini benar-benar enak.	jlpt-n2
れんが　Kata benda	れんが　Batu bata<br><br>1. 必要なれんがを机の上に並べて確認しました。<br>Saya menata dan memeriksa batu bata yang diperlukan di atas meja.<br><br>2. 壊れやすいので、このれんがは丁寧に扱ってください。<br>Karena mudah rusak, tolong tangani batu bata ini dengan hati-hati.	jlpt-n2
血圧　Kata benda	血圧(けつあつ)　Tekanan darah<br><br>1. 健康を保つために、日頃から血圧の状態を気にかけています。<br>Untuk menjaga kesehatan, saya selalu memperhatikan kondisi tekanan darah.<br><br>2. 運動する前は、特に血圧に負担がかからないよう注意します。<br>Sebelum berolahraga, saya berhati-hati agar tekanan darah tidak terbebani.	jlpt-n2`;

export const INITIAL_ANKI_N1_SEED = `#separator:tab
#html:true
#tags column:3
はちみつ　Kata benda	はちみつ　Madu<br><br>1. スーパーで新鮮なはちみつを買って帰りました。<br>Saya membeli madu segar di supermarket lalu pulang.<br><br>2. この店で作られているはちみつは本当においしいです。<br>Madu yang dibuat di toko ini benar-benar enak.	jlpt-n1
危機　Kata benda	危機(きき)　Krisis, situasi genting<br><br>1. 新聞の第一面で、日本の危機に関する記事を読みました。<br>Di halaman depan koran saya membaca artikel tentang krisis di Jepang.<br><br>2. 社会全体のことを考えるうえで、危機への理解は欠かせません。<br>Dalam memikirkan masyarakat luas, pemahaman mengenai krisis sangat penting.	jlpt-n1
まとめ　Kata benda	まとめ　Ringkasan, kesimpulan<br><br>1. 図書館で借りた本の中から、このまとめを見つけました。<br>Saya menemukan ringkasan ini dari buku yang saya pinjam di perpustakaan.<br><br>2. 正確に理解するために、まとめの意味を辞書で調べました。<br>Agar memahami dengan tepat, saya mencari arti ringkasan di kamus.	jlpt-n1`;
