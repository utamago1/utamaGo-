export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

const KANJI_REGEX = /[\u4e00-\u9faf々]/;

const GODAN_CONJUGATION_ROWS: Record<string, string[]> = {
  う: ['う', 'い', 'わ', 'え', 'お', 'っ'],
  く: ['く', 'き', 'か', 'け', 'こ', 'い', 'っ'],
  ぐ: ['ぐ', 'ぎ', 'が', 'げ', 'ご', 'い'],
  す: ['す', 'し', 'さ', 'せ', 'そ'],
  つ: ['つ', 'ち', 'た', 'て', 'と', 'っ'],
  ぬ: ['ぬ', 'に', 'な', 'ね', 'の', 'ん'],
  ぶ: ['ぶ', 'び', 'ば', 'べ', 'ぼ', 'ん'],
  む: ['む', 'み', 'ま', 'め', 'も', 'ん'],
  る: ['る', 'り', 'ら', 'れ', 'ろ', 'っ'],
};

const VERB_ADJ_SUFFIX_REGEX =
  /^(?:ませんでした|ました|ません|ます|ています|ていた|ている|てい|ておく|ておいた|ておき|てしまい|てしまった|てしまう|ており|てくる|てきた|ていく|ていった|てください|て|で(?!す|した|しょう|は|も)|なかった|ない|なく|なかったら|なければ|られる|られた|られない|させる|させた|させ|よう|たい|たかった|たくない|た|ば|たら|だら|かった|くない|く|ければ|そう|すぎ)/;

const BUNPOU_EQUIVALENTS: Array<[string, string]> = [
  ['にしたがって', 'に従って'],
  ['につれて', 'に連れて'],
  ['にともなって', 'に伴って'],
  ['にかかわらず', 'に関わらず'],
  ['にかかわりなく', 'に関わりなく'],
  ['にかわって', 'に代わって'],
  ['にかわり', 'に代わり'],
  ['にたいして', 'に対して'],
  ['について', 'に就いて'],
  ['にとって', 'に取って'],
  ['によって', 'に因って'],
  ['による', 'に因る'],
  ['にかけて', 'に掛けて'],
  ['にわたって', 'に渡って'],
  ['にわたる', 'に渡る'],
  ['にあたり', 'に当たり'],
  ['にあたって', 'に当たって'],
  ['にさいして', 'に際して'],
  ['にこたえて', 'に応えて'],
  ['にもとづいて', 'に基づいて'],
  ['にもとづく', 'に基づく'],
  ['にそって', 'に沿って'],
  ['にそう', 'に沿う'],
  ['にくわえて', 'に加えて'],
  ['にくらべて', 'に比べて'],
  ['にかぎって', 'に限って'],
  ['にかぎらず', 'に限らず'],
  ['にかぎり', 'に限り'],
  ['かぎり', '限り'],
  ['わりに', '割に'],
  ['うちに', '内に'],
  ['とおり', '通り'],
  ['どおり', '通り'],
  ['たびに', '度に'],
  ['うえに', '上に'],
  ['うえで', '上で'],
  ['うえは', '上は'],
  ['わけにはいかない', '訳にはいかない'],
  ['わけがない', '訳がない'],
  ['わけではない', '訳ではない'],
  ['わけだ', '訳だ'],
  ['ところ', '所'],
  ['さいちゅう', '最中'],
  ['さい', '際'],
  ['しだい', '次第'],
  ['とたん', '途端'],
  ['かわり', '代わり'],
  ['おかげ', 'お陰'],
  ['せい', '所為'],
  ['ため', '為'],
  ['ほど', '程'],
  ['くらい', '位'],
  ['ぐらい', '位'],
  ['まま', '儘'],
  ['こと', '事'],
  ['もの', '物'],
  ['える', '得る'],
  ['うる', '得る'],
  ['ざるをえない', 'ざるを得ない'],
  ['えない', '得ない'],
  ['きれない', '切れない'],
  ['きる', '切る'],
  ['ぬく', '抜く'],
  ['かける', '掛ける'],
  ['かける', '欠ける'],
  ['げ', '気'],
  ['っぽい', 'っぽい'],
  ['おそれがある', '恐れがある'],
  ['ちがいない', '違いない'],
  ['にすぎない', 'に過ぎない'],
  ['にほかならない', 'に他ならない'],
  ['にそういない', 'に相違ない'],
  ['をめぐって', 'をめぐって'],
  ['をめぐって', 'を巡って'],
  ['をはじめ', 'を始め'],
  ['をもとに', 'を基に'],
  ['をきに', 'を機に'],
  ['をけいきに', 'を契機に'],
  ['をこめて', 'を込めて'],
  ['をつうじて', 'を通じて'],
  ['をとおして', 'を通して'],
  ['をとわず', 'を問わず'],
  ['をぬきにして', 'を抜きにして'],
  ['をものともせず', 'をものともせず'],
  ['にもかかわらず', 'にも拘わらず'],
  ['からいって', 'から言って'],
  ['からいうと', 'から言うと'],
  ['からすれば', 'からすれば'],
  ['からみると', 'から見ると'],
  ['からして', 'からして'],
  ['ことから', 'ことから'],
  ['ことに', 'ことに'],
  ['ことから', '事から'],
  ['てしょうがない', 'て仕方がない'],
  ['てしかたがない', 'て仕方がない'],
  ['てたまらない', 'て堪らない'],
  ['てならない', 'てならない'],
  ['てはじめて', 'て初めて'],
];

function stripFurigana(term: string): { base: string; reading: string | null } {
  const trimmed = term.trim();
  const match = trimmed.match(/^(.+?)\(([^)]+)\)$/);
  if (!match) {
    return { base: trimmed, reading: null };
  }
  return { base: match[1].trim(), reading: match[2].trim() };
}

/**
 * Expands optional parenthesized segments like "~際(に)" -> ["際(に)", "際に", "際"]
 * or "(か)と思うと" -> ["かと思うと", "と思うと"].
 */
function expandOptionalParens(raw: string): string[] {
  const normalized = raw.replace(/（/g, '(').replace(/）/g, ')');
  const match = normalized.match(/\(([^()]+)\)/);
  if (!match) {
    return [normalized];
  }
  const before = normalized.slice(0, match.index ?? 0);
  const inner = match[1];
  const after = normalized.slice((match.index ?? 0) + match[0].length);
  const withInner = expandOptionalParens(before + inner + after);
  const withoutInner = expandOptionalParens(before + after);
  return [...withInner, ...withoutInner];
}

function addConjugatedForms(base: string, out: Set<string>): void {
  const clean = base.trim();
  if (!clean) return;
  out.add(clean);

  // Special irregulars
  if (clean === 'いい' || clean === 'よい' || clean === '良い') {
    ['いい', 'よい', 'よく', 'よかっ', 'よけれ', '良い', '良く', '良かっ'].forEach(
      (f) => out.add(f),
    );
    return;
  }

  if (clean === 'する') {
    ['する', 'しま', 'して', 'した', 'しない', 'され', 'させ', 'しよう'].forEach(
      (f) => out.add(f),
    );
    return;
  }

  if (clean.endsWith('する') && clean.length >= 3) {
    const stem = clean.slice(0, -2);
    out.add(stem);
    ['する', 'し', 'さ', 'せ', 'す'].forEach((sfx) => out.add(stem + sfx));
    return;
  }

  if (clean === '来る' || clean === 'くる') {
    ['来る', '来ま', '来て', '来た', '来な', '来ら', 'くる', 'きま', 'きて', 'きた', 'こな'].forEach(
      (f) => out.add(f),
    );
    return;
  }

  if (clean === 'いく' || clean === '行く') {
    ['行く', '行き', '行か', '行け', '行こ', '行っ', 'いく', 'いき', 'いか', 'いけ', 'いっ'].forEach(
      (f) => out.add(f),
    );
    return;
  }

  // -ない endings in bunpou/adjectives (e.g. わけにはいかない -> わけにはいかなく / わけにはいきません)
  if (clean.endsWith('ない') && clean.length >= 3) {
    const stem = clean.slice(0, -2);
    out.add(stem + 'ない');
    out.add(stem + 'なく');
    out.add(stem + 'なかっ');
    out.add(stem + 'なけれ');
    out.add(stem + 'ず');
    out.add(stem + 'ぬ');
    // Also convert polite negative patterns like いかない -> いきません / ならない -> なりません / できない -> できません
    if (clean.endsWith('いかない')) {
      const p = clean.slice(0, -4);
      out.add(p + 'いきません');
      out.add(p + 'いかなく');
      out.add(p + 'もいかない');
      out.add(p + 'もいきません');
    } else if (clean.endsWith('ならない')) {
      const p = clean.slice(0, -4);
      out.add(p + 'なりません');
    } else if (clean.endsWith('できない')) {
      const p = clean.slice(0, -4);
      out.add(p + 'できません');
    } else if (clean.endsWith('すぎない')) {
      const p = clean.slice(0, -4);
      out.add(p + 'すぎません');
    } else if (clean.endsWith('られない')) {
      const p = clean.slice(0, -4);
      out.add(p + 'られません');
    } else if (clean.endsWith('いられない')) {
      const p = clean.slice(0, -5);
      out.add(p + 'いられません');
    }
  }

  // -だ copula ending (e.g. がちだ -> がち, ばかりだ -> ばかり, わけだ -> わけ)
  if (clean.endsWith('だ') && clean.length >= 2) {
    const stem = clean.slice(0, -1);
    out.add(stem);
    out.add(stem + 'です');
    out.add(stem + 'な');
    out.add(stem + 'に');
    out.add(stem + 'の');
    out.add(stem + 'で');
  }

  // -い adjective ending
  if (clean.endsWith('い') && clean.length >= 2) {
    const stem = clean.slice(0, -1);
    if (stem.length >= 2 || KANJI_REGEX.test(stem)) {
      out.add(stem + 'い');
      out.add(stem + 'く');
      out.add(stem + 'かっ');
      out.add(stem + 'けれ');
      out.add(stem + 'さ');
    }
  }

  // -る / godan verb endings
  const lastChar = clean.slice(-1);
  if (lastChar in GODAN_CONJUGATION_ROWS && clean.length >= 2) {
    const stem = clean.slice(0, -1);
    const hasKanjiOrLong = KANJI_REGEX.test(stem) || stem.length >= 2;
    if (hasKanjiOrLong) {
      for (const rowChar of GODAN_CONJUGATION_ROWS[lastChar]) {
        out.add(stem + rowChar);
      }
      if (lastChar === 'る') {
        // Ichidan verb stem + common conjugations
        [
          'ます',
          'まし',
          'ませ',
          'て',
          'た',
          'ない',
          'なく',
          'なかっ',
          'られ',
          'させ',
          'よう',
          'たい',
          'ず',
        ].forEach((sfx) => out.add(stem + sfx));
      }
    } else if (clean === 'いる') {
      // High-frequency N5 ichidan/godan "いる"
      ['います', 'いました', 'いません', 'いて', 'いた', 'いない', 'いります', 'いりません', 'いった', 'いる'].forEach(
        (f) => out.add(f),
      );
    } else if (clean === 'ある') {
      ['あります', 'ありました', 'ありません', 'あって', 'あった', 'ある'].forEach(
        (f) => out.add(f),
      );
    } else if (clean === 'みる' || clean === '見る') {
      ['見ます', '見ました', '見て', '見た', '見ない', '見る', 'みます', 'みて', 'みた', 'みる'].forEach(
        (f) => out.add(f),
      );
    } else if (clean === 'きる' || clean === '着る') {
      ['着ます', '着て', '着た', '着ない', '着る', 'きます', 'きて', 'きた'].forEach(
        (f) => out.add(f),
      );
    } else if (clean === 'ねる' || clean === '寝る') {
      ['寝ます', '寝て', '寝た', '寝ない', '寝る', 'ねます', 'ねて', 'ねた'].forEach(
        (f) => out.add(f),
      );
    } else if (clean === 'でる' || clean === '出る') {
      ['出ます', '出て', '出た', '出ない', '出る', 'でます', 'でて', 'でた'].forEach(
        (f) => out.add(f),
      );
    }
  }

  // -て / -た forms in bunpou (e.g. に際して -> に際し, にあたって -> にあたり)
  if (clean.endsWith('って') && clean.length >= 3) {
    out.add(clean.slice(0, -2) + 'り');
    out.add(clean.slice(0, -2) + 'る');
  } else if (clean.endsWith('して') && clean.length >= 3) {
    out.add(clean.slice(0, -2) + 'し');
    out.add(clean.slice(0, -2) + 'する');
  } else if (clean.endsWith('いて') && clean.length >= 3) {
    out.add(clean.slice(0, -2) + 'き');
    out.add(clean.slice(0, -2) + 'く');
  }
}

function addKanjiKanaEquivalents(candidates: Set<string>): void {
  const snapshot = Array.from(candidates);
  for (const item of snapshot) {
    for (const [kana, kanji] of BUNPOU_EQUIVALENTS) {
      if (item.includes(kana)) {
        candidates.add(item.replace(kana, kanji));
      }
      if (item.includes(kanji)) {
        candidates.add(item.replace(kanji, kana));
      }
    }
  }
}

function buildVocabCandidates(word: string, readingTerm?: string): string[] {
  const candidates = new Set<string>();
  const termsToCheck: string[] = [];

  if (readingTerm) {
    const parsed = stripFurigana(readingTerm);
    if (parsed.base) termsToCheck.push(parsed.base);
    if (parsed.reading) termsToCheck.push(parsed.reading);
  }
  if (word) {
    const parsed = stripFurigana(word);
    if (parsed.base) termsToCheck.push(parsed.base);
    if (parsed.reading) termsToCheck.push(parsed.reading);
  }

  for (const raw of termsToCheck) {
    const cleaned = raw.replace(/[~〜・]/g, '').trim();
    if (!cleaned) continue;
    for (const part of cleaned.split(/[／/,、\s]+/)) {
      const p = part.trim();
      if (!p) continue;
      for (const expanded of expandOptionalParens(p)) {
        const trimmed = expanded.trim();
        if (!trimmed) continue;
        addConjugatedForms(trimmed, candidates);
        // Strip leading お/ご honorific if present
        if ((trimmed.startsWith('お') || trimmed.startsWith('ご')) && trimmed.length >= 3) {
          addConjugatedForms(trimmed.slice(1), candidates);
        }
        // Strip trailing な on na-adjectives written with な
        if (trimmed.endsWith('な') && trimmed.length >= 3) {
          candidates.add(trimmed.slice(0, -1));
        }
      }
    }
  }

  return Array.from(candidates)
    .filter((c) => c.length > 0)
    .sort((a, b) => b.length - a.length);
}

interface BunpouCandidatePlan {
  singles: string[];
  splitPairs: Array<[string, string]>;
}

function buildBunpouCandidatePlan(pattern: string): BunpouCandidatePlan {
  const singles = new Set<string>();
  const splitPairs: Array<[string, string]> = [];

  // Split variants separated by ・, ／, or /
  const variants = pattern
    .split(/[・／/]/)
    .map((v) => v.trim())
    .filter(Boolean);

  for (const rawVariant of variants) {
    // Strip leading/trailing ~ or 〜
    const stripped = rawVariant.replace(/^[~〜]+/, '').replace(/[~〜]+$/, '').trim();
    if (!stripped) continue;

    // Check for split pattern like "から~にかけて" or "も~ば~も"
    if (/[~〜]/.test(stripped)) {
      const pieces = stripped
        .split(/[~〜]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (pieces.length >= 2) {
        const leftOptions = expandOptionalParens(pieces[0]).filter(Boolean);
        const rightOptions = expandOptionalParens(pieces[pieces.length - 1]).filter(
          Boolean,
        );
        for (const l of leftOptions) {
          for (const r of rightOptions) {
            splitPairs.push([l, r]);
          }
        }
        // Also add conjugated forms of the longer piece as fallback
        for (const piece of pieces) {
          for (const exp of expandOptionalParens(piece)) {
            if (exp.length >= 2) addConjugatedForms(exp, singles);
          }
        }
      }
      continue;
    }

    for (const expanded of expandOptionalParens(stripped)) {
      const clean = expanded.trim();
      if (!clean) continue;

      addConjugatedForms(clean, singles);

      // Handle leading た/て sound voicing (た -> だ, て -> で, e.g., 飲んだとたんに, 読んでからでないと)
      if (clean.startsWith('た') && clean.length >= 3) {
        const rest = clean.slice(1);
        addConjugatedForms('だ' + rest, singles);
        addConjugatedForms(rest, singles);
      } else if (clean.startsWith('て') && clean.length >= 3) {
        const rest = clean.slice(1);
        addConjugatedForms('で' + rest, singles);
      } else if (clean.startsWith('ない') && clean.length >= 4) {
        const rest = clean.slice(2);
        addConjugatedForms('ず' + rest, singles);
        addConjugatedForms('ぬ' + rest, singles);
      }

      // Handle particle variations like は <-> も (e.g., わけにはいかない / わけにもいかない)
      if (clean.includes('には')) {
        addConjugatedForms(clean.replace('には', 'にも'), singles);
      }
      if (clean.includes('では')) {
        addConjugatedForms(clean.replace('では', 'でも'), singles);
      }
    }
  }

  addKanjiKanaEquivalents(singles);

  return {
    singles: Array.from(singles)
      .filter((c) => c.length > 0)
      .sort((a, b) => b.length - a.length),
    splitPairs,
  };
}

interface MatchRange {
  start: number;
  end: number;
}

function mergeRanges(ranges: MatchRange[]): MatchRange[] {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: MatchRange[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.start <= prev.end) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }
  return merged;
}

function rangesToSegments(sentence: string, ranges: MatchRange[]): HighlightSegment[] {
  if (ranges.length === 0) {
    return [{ text: sentence, highlighted: false }];
  }
  const merged = mergeRanges(ranges);
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const r of merged) {
    if (r.start > cursor) {
      segments.push({ text: sentence.slice(cursor, r.start), highlighted: false });
    }
    segments.push({ text: sentence.slice(r.start, r.end), highlighted: true });
    cursor = r.end;
  }
  if (cursor < sentence.length) {
    segments.push({ text: sentence.slice(cursor), highlighted: false });
  }
  return segments;
}

function extendConjugatedSuffix(
  sentence: string,
  endIndex: number,
  extendVerbEnding: boolean,
): number {
  if (!extendVerbEnding || endIndex >= sentence.length) return endIndex;
  const tail = sentence.slice(endIndex);
  const suffixMatch = tail.match(VERB_ADJ_SUFFIX_REGEX);
  if (suffixMatch) {
    return endIndex + suffixMatch[0].length;
  }
  return endIndex;
}

function findSingleMatches(
  sentence: string,
  candidates: string[],
  extendVerbEnding: boolean,
): MatchRange[] {
  for (const candidate of candidates) {
    const idx = sentence.indexOf(candidate);
    if (idx === -1) continue;

    // Collect all non-overlapping occurrences of the best (longest) matching candidate
    const ranges: MatchRange[] = [];
    let searchFrom = 0;
    while (searchFrom < sentence.length) {
      const found = sentence.indexOf(candidate, searchFrom);
      if (found === -1) break;
      const rawEnd = found + candidate.length;
      const extendedEnd = extendConjugatedSuffix(
        sentence,
        rawEnd,
        extendVerbEnding,
      );
      ranges.push({ start: found, end: extendedEnd });
      searchFrom = extendedEnd;
    }
    if (ranges.length > 0) {
      return ranges;
    }
  }
  return [];
}

/**
 * Splits a Japanese example sentence into normal & highlighted segments
 * marking the target Kosakata word or Bunpou grammar pattern being studied.
 */
export function highlightJapaneseSentence(
  sentence: string,
  options: {
    target: string;
    readingTerm?: string;
    kind: 'vocab' | 'bunpou';
  },
): HighlightSegment[] {
  if (!sentence) return [];
  const { target, readingTerm, kind } = options;
  if (!target.trim() && !readingTerm?.trim()) {
    return [{ text: sentence, highlighted: false }];
  }

  if (kind === 'bunpou') {
    const plan = buildBunpouCandidatePlan(target);

    // 1. Try split-pattern pairs first (e.g., ~から~にかけて)
    for (const [left, right] of plan.splitPairs) {
      const leftIdx = sentence.indexOf(left);
      if (leftIdx === -1) continue;
      const rightIdx = sentence.indexOf(right, leftIdx + left.length);
      if (rightIdx === -1) continue;
      return rangesToSegments(sentence, [
        { start: leftIdx, end: leftIdx + left.length },
        { start: rightIdx, end: rightIdx + right.length },
      ]);
    }

    // 2. Match longest bunpou single candidate
    const ranges = findSingleMatches(sentence, plan.singles, false);
    return rangesToSegments(sentence, ranges);
  }

  // Vocab mode
  const candidates = buildVocabCandidates(target, readingTerm);
  // Extend verb/adjective suffix only when candidate looks like a verb/adj stem (ends in kana or kanji)
  const ranges = findSingleMatches(sentence, candidates, true);
  return rangesToSegments(sentence, ranges);
}
