import { lookupKanjiReadings } from '../data/kanjiReadings';
import type { JlptLevel } from '../data/utamagoContent';
import type { AnkiCard } from './ankiParser';

export type WritingPracticeMode =
  | 'kanji'
  | 'difficult-kanji'
  | 'hiragana'
  | 'katakana';

export interface WritingPracticeItem {
  id: string;
  character: string;
  kind: 'kanji' | 'hiragana' | 'katakana';
  reading: string;
  romaji: string;
  meaning: string;
  onyomi?: string[];
  kunyomi?: string[];
  jlptLevel?: JlptLevel;
  exampleWord?: string;
  exampleReading?: string;
  exampleMeaning?: string;
  isDifficult?: boolean;
}

const HIRAGANA_SEEDS: ReadonlyArray<[string, string, string, string]> = [
  ['あ', 'a', 'あめ', 'hujan'],
  ['い', 'i', 'いぬ', 'anjing'],
  ['う', 'u', 'うみ', 'laut'],
  ['え', 'e', 'えき', 'stasiun'],
  ['お', 'o', 'おちゃ', 'teh'],
  ['か', 'ka', 'かさ', 'payung'],
  ['き', 'ki', 'きって', 'perangko'],
  ['く', 'ku', 'くつ', 'sepatu'],
  ['け', 'ke', 'けさ', 'tadi pagi'],
  ['こ', 'ko', 'こども', 'anak'],
  ['さ', 'sa', 'さくら', 'sakura'],
  ['し', 'shi', 'しお', 'garam'],
  ['す', 'su', 'すし', 'sushi'],
  ['せ', 'se', 'せんせい', 'guru'],
  ['そ', 'so', 'そら', 'langit'],
  ['た', 'ta', 'たまご', 'telur'],
  ['ち', 'chi', 'ちず', 'peta'],
  ['つ', 'tsu', 'つき', 'bulan'],
  ['て', 'te', 'てがみ', 'surat'],
  ['と', 'to', 'とけい', 'jam'],
  ['な', 'na', 'なつ', 'musim panas'],
  ['に', 'ni', 'にほん', 'Jepang'],
  ['ぬ', 'nu', 'ぬの', 'kain'],
  ['ね', 'ne', 'ねこ', 'kucing'],
  ['の', 'no', 'のみもの', 'minuman'],
  ['は', 'ha', 'はな', 'bunga'],
  ['ひ', 'hi', 'ひと', 'orang'],
  ['ふ', 'fu', 'ふゆ', 'musim dingin'],
  ['へ', 'he', 'へや', 'kamar'],
  ['ほ', 'ho', 'ほん', 'buku'],
  ['ま', 'ma', 'まど', 'jendela'],
  ['み', 'mi', 'みず', 'air'],
  ['む', 'mu', 'むし', 'serangga'],
  ['め', 'me', 'めがね', 'kacamata'],
  ['も', 'mo', 'もり', 'hutan'],
  ['や', 'ya', 'やま', 'gunung'],
  ['ゆ', 'yu', 'ゆき', 'salju'],
  ['よ', 'yo', 'よる', 'malam'],
  ['ら', 'ra', 'らいねん', 'tahun depan'],
  ['り', 'ri', 'りんご', 'apel'],
  ['る', 'ru', 'るす', 'tidak di rumah'],
  ['れ', 're', 'れきし', 'sejarah'],
  ['ろ', 'ro', 'ろうそく', 'lilin'],
  ['わ', 'wa', 'わたし', 'saya'],
  ['を', 'wo', 'ほんをよむ', 'partikel objek'],
  ['ん', 'n', 'でんわ', 'telepon'],
];

const KATAKANA_SEEDS: ReadonlyArray<[string, string, string, string]> = [
  ['ア', 'a', 'アイス', 'es krim'],
  ['イ', 'i', 'イス', 'kursi'],
  ['ウ', 'u', 'ウサギ', 'kelinci'],
  ['エ', 'e', 'エレベーター', 'lift'],
  ['オ', 'o', 'オレンジ', 'jeruk'],
  ['カ', 'ka', 'カメラ', 'kamera'],
  ['キ', 'ki', 'キッチン', 'dapur'],
  ['ク', 'ku', 'クラス', 'kelas'],
  ['ケ', 'ke', 'ケーキ', 'kue'],
  ['コ', 'ko', 'コーヒー', 'kopi'],
  ['サ', 'sa', 'サラダ', 'salad'],
  ['シ', 'shi', 'シャツ', 'kemeja'],
  ['ス', 'su', 'スーパー', 'supermarket'],
  ['セ', 'se', 'セーター', 'sweter'],
  ['ソ', 'so', 'ソファ', 'sofa'],
  ['タ', 'ta', 'タクシー', 'taksi'],
  ['チ', 'chi', 'チーズ', 'keju'],
  ['ツ', 'tsu', 'ツアー', 'tur'],
  ['テ', 'te', 'テレビ', 'televisi'],
  ['ト', 'to', 'トイレ', 'toilet'],
  ['ナ', 'na', 'ナイフ', 'pisau'],
  ['ニ', 'ni', 'ニュース', 'berita'],
  ['ヌ', 'nu', 'ヌードル', 'mi'],
  ['ネ', 'ne', 'ネクタイ', 'dasi'],
  ['ノ', 'no', 'ノート', 'buku catatan'],
  ['ハ', 'ha', 'バス', 'bus'],
  ['ヒ', 'hi', 'ヒント', 'petunjuk'],
  ['フ', 'fu', 'フォーク', 'garpu'],
  ['ヘ', 'he', 'ヘルメット', 'helm'],
  ['ホ', 'ho', 'ホテル', 'hotel'],
  ['マ', 'ma', 'マップ', 'peta'],
  ['ミ', 'mi', 'ミルク', 'susu'],
  ['ム', 'mu', 'ムード', 'suasana'],
  ['メ', 'me', 'メニュー', 'menu'],
  ['モ', 'mo', 'メモ', 'catatan'],
  ['ヤ', 'ya', 'ヤシ', 'kelapa'],
  ['ユ', 'yu', 'ユニフォーム', 'seragam'],
  ['ヨ', 'yo', 'ヨーグルト', 'yogurt'],
  ['ラ', 'ra', 'ラーメン', 'ramen'],
  ['リ', 'ri', 'リスト', 'daftar'],
  ['ル', 'ru', 'ルール', 'aturan'],
  ['レ', 're', 'レストラン', 'restoran'],
  ['ロ', 'ro', 'ロボット', 'robot'],
  ['ワ', 'wa', 'ワイン', 'anggur'],
  ['ヲ', 'wo', 'ヲ', 'partikel katakana'],
  ['ン', 'n', 'パン', 'roti'],
];

export const HIRAGANA_PRACTICE_ITEMS: WritingPracticeItem[] = HIRAGANA_SEEDS.map(
  ([char, romaji, exampleWord, exampleMeaning]) => ({
    id: `hira-${romaji}-${char}`,
    character: char,
    kind: 'hiragana',
    reading: char,
    romaji,
    meaning: `Hiragana "${romaji}"`,
    jlptLevel: 'N5',
    exampleWord,
    exampleReading: exampleWord,
    exampleMeaning,
  }),
);

export const KATAKANA_PRACTICE_ITEMS: WritingPracticeItem[] = KATAKANA_SEEDS.map(
  ([char, romaji, exampleWord, exampleMeaning]) => ({
    id: `kata-${romaji}-${char}`,
    character: char,
    kind: 'katakana',
    reading: char,
    romaji,
    meaning: `Katakana "${romaji}"`,
    jlptLevel: 'N5',
    exampleWord,
    exampleReading: exampleWord,
    exampleMeaning,
  }),
);

const KANJI_REGEX = /[\u4e00-\u9faf]/g;

export function extractKanjiCharacters(text: string): string[] {
  const matches = text.match(KANJI_REGEX);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

export function extractKanjiPracticeItems(
  cards: readonly AnkiCard[],
  options?: {
    level?: JlptLevel | 'ALL';
    difficultCardIds?: ReadonlySet<string>;
    onlyDifficult?: boolean;
    limit?: number;
  },
): WritingPracticeItem[] {
  const levelFilter = options?.level ?? 'ALL';
  const difficultSet = options?.difficultCardIds ?? new Set<string>();
  const onlyDifficult = Boolean(options?.onlyDifficult);
  const limit = options?.limit ?? 120;

  const seenKanji = new Map<string, WritingPracticeItem>();

  for (const card of cards) {
    if (card.cardKind === 'bunpou') continue;
    const isDifficult = difficultSet.has(card.id);
    if (onlyDifficult && !isDifficult) continue;
    if (
      !onlyDifficult &&
      levelFilter !== 'ALL' &&
      card.jlptLevel !== levelFilter
    ) {
      continue;
    }

    const kanjis = extractKanjiCharacters(card.word);
    for (const ch of kanjis) {
      const existing = seenKanji.get(ch);
      if (existing) {
        if (isDifficult && !existing.isDifficult) {
          existing.isDifficult = true;
        }
        continue;
      }
      const readings = lookupKanjiReadings(ch, cards);
      seenKanji.set(ch, {
        id: `kanji-${ch}`,
        character: ch,
        kind: 'kanji',
        reading: card.furigana || card.word,
        romaji: card.romaji || '',
        meaning: card.meaning || '',
        onyomi: readings.onyomi,
        kunyomi: readings.kunyomi,
        jlptLevel: card.jlptLevel,
        exampleWord: card.word,
        exampleReading: card.furigana || card.word,
        exampleMeaning: card.meaning,
        isDifficult,
      });
      if (seenKanji.size >= limit) {
        return Array.from(seenKanji.values());
      }
    }
  }

  return Array.from(seenKanji.values());
}

export function buildWritingPracticeDeck(params: {
  mode: WritingPracticeMode;
  level: JlptLevel | 'ALL';
  cards: readonly AnkiCard[];
  difficultCardIds?: ReadonlySet<string>;
  seedText?: string;
}): WritingPracticeItem[] {
  const { mode, level, cards, difficultCardIds, seedText } = params;

  if (seedText) {
    const seedKanjis = extractKanjiCharacters(seedText);
    if (seedKanjis.length > 0) {
      const cardIndex = new Map<string, AnkiCard>();
      for (const c of cards) {
        if (c.word === seedText) {
          seedKanjis.forEach((k) => cardIndex.set(k, c));
          break;
        }
      }
      const fallbackItems = extractKanjiPracticeItems(cards, {
        level: 'ALL',
        difficultCardIds,
        limit: 400,
      });
      const fallbackMap = new Map(fallbackItems.map((it) => [it.character, it]));

      return seedKanjis.map((ch) => {
        const directCard = cardIndex.get(ch);
        if (directCard) {
          const readings = lookupKanjiReadings(ch, cards);
          return {
            id: `kanji-${ch}`,
            character: ch,
            kind: 'kanji',
            reading: directCard.furigana || directCard.word,
            romaji: directCard.romaji || '',
            meaning: directCard.meaning || '',
            onyomi: readings.onyomi,
            kunyomi: readings.kunyomi,
            jlptLevel: directCard.jlptLevel,
            exampleWord: directCard.word,
            exampleReading: directCard.furigana || directCard.word,
            exampleMeaning: directCard.meaning,
            isDifficult: difficultCardIds?.has(directCard.id) ?? false,
          };
        }
        const fallbackHit = fallbackMap.get(ch);
        if (fallbackHit) return fallbackHit;
        const readings = lookupKanjiReadings(ch, cards);
        return {
          id: `kanji-${ch}`,
          character: ch,
          kind: 'kanji',
          reading: seedText,
          romaji: '',
          meaning: `Kanji dari "${seedText}"`,
          onyomi: readings.onyomi,
          kunyomi: readings.kunyomi,
          exampleWord: seedText,
        };
      });
    }
  }

  if (mode === 'hiragana') return HIRAGANA_PRACTICE_ITEMS;
  if (mode === 'katakana') return KATAKANA_PRACTICE_ITEMS;
  if (mode === 'difficult-kanji') {
    return extractKanjiPracticeItems(cards, {
      level: 'ALL',
      difficultCardIds,
      onlyDifficult: true,
      limit: 60,
    });
  }
  return extractKanjiPracticeItems(cards, {
    level,
    difficultCardIds,
    onlyDifficult: false,
    limit: 100,
  });
}
