import type {
  TryOutFormItem,
  TryOutFormPage,
  TryOutPassageSection,
} from '../data/tryOutN2Data';
import type { TryOutPacketPartId } from './tryOutPacket';

export interface ChoukaiTranscriptEntry {
  id: string;
  mondaiNumber: number;
  itemNumberLabel: string; // e.g., "1番", "3番 (質問1・2)"
  questionNumbers: number[]; // sequential question numbers in Choukai part
  body: string;
  correctAnswerLabel: string;
}

export interface ChoukaiTranscriptSection {
  mondaiNumber: number;
  title: string; // e.g., "問題1 課題理解"
  entries: ChoukaiTranscriptEntry[];
}

export interface ParsedVerifiedTryOutPacket {
  packetId: string;
  examCode: string;
  yearLabel: string;
  headerTitle: string;
  forms: Record<TryOutPacketPartId, TryOutFormPage[]>;
  choukaiTranscript: ChoukaiTranscriptSection[];
  counts: {
    mojiBunpou: number;
    dokkai: number;
    choukai: number;
    total: number;
  };
}

export const VERIFIED_EXAM_CODE_TO_PACKET_ID: Record<
  string,
  { packetId: string; yearLabel: string; orderNumber: number }
> = {
  '2010.07': { packetId: 'n2-2', yearLabel: 'Juli 2010', orderNumber: 1 },
  '2010.12': { packetId: 'n2-3', yearLabel: 'Desember 2010', orderNumber: 2 },
  '2011.07': { packetId: 'n2-4', yearLabel: 'Juli 2011', orderNumber: 3 },
  '2011.12': { packetId: 'n2-5', yearLabel: 'Desember 2011', orderNumber: 4 },
  '2012.07': { packetId: 'n2-6', yearLabel: 'Juli 2012', orderNumber: 5 },
  '2012.12': { packetId: 'n2-7', yearLabel: 'Desember 2012', orderNumber: 6 },
};

function cleanLine(line: string): string {
  return line.replace(/\uFEFF/g, '').trim();
}

export function formatBlankParentheses(text: string): string {
  return text.replace(/[（(][\s\u3000]*[）)]/g, '(____)');
}

/**
 * Exact underlined target words for Moji-Goi Mondai 1 (1-5), Mondai 2 (6-10),
 * and Mondai 5 (23-27) across the 6 verified JLPT N2 exams (2010.07-2012.12).
 */
const VERIFIED_MOJI_UNDERLINES: Record<string, Record<number, string>> = {
  '2010.07': {
    1: '相互',
    2: '辛くて',
    3: '景色',
    4: '備えて',
    5: '防災',
    6: 'れいぎ',
    7: 'しゅっせ',
    8: 'でんとう',
    9: 'あせらなくても',
    10: 'くらして',
    23: 'とりあえず',
    24: 'ゆずって',
    25: '雑談',
    26: 'かしこい',
    27: '大げさだ',
  },
  '2010.12': {
    1: '規模',
    2: '触れた',
    3: '尊重',
    4: '治療',
    5: '隣',
    6: 'かいさい',
    7: 'たより',
    8: 'みだれて',
    9: 'うんちん',
    10: 'さつえい',
    23: '勝手な',
    24: 'たびたび',
    25: 'ぶかぶかだ',
    26: '見解',
    27: 'レンタルした',
  },
  '2011.07': {
    1: '敗れて',
    2: '要求',
    3: '祝った',
    4: '調節',
    5: '至急',
    6: 'しょうちょう',
    7: 'はげしい',
    8: 'とうろく',
    9: 'さそった',
    10: 'へんこう',
    23: 'ブーム',
    24: '慎重に',
    25: 'ちぢんで',
    26: 'ほぼ',
    27: '回復する',
  },
  '2011.12': {
    1: '地元',
    2: '密接',
    3: '豊富',
    4: '補いたい',
    5: '率直',
    6: 'あたえた',
    7: 'かんり',
    8: 'ふくし',
    9: 'とうろん',
    10: 'ぞくして',
    23: 'くたくたになった',
    24: 'わずかに',
    25: '優秀だった',
    26: 'うつむいて',
    27: 'いきなり',
  },
  '2012.07': {
    1: '装置',
    2: '占める',
    3: '削除',
    4: '焦点',
    5: '略して',
    6: 'みちびいて',
    7: 'あつかって',
    8: 'せっきょくてき',
    9: 'ていこう',
    10: 'かた',
    23: 'ただちに',
    24: '奇妙な',
    25: '仕上げて',
    26: '日中',
    27: 'しめっている',
  },
  '2012.12': {
    1: '抽象的',
    2: '返却',
    3: '針',
    4: '撮影',
    5: '破片',
    6: 'おとずれる',
    7: 'しゅうかく',
    8: 'いきおい',
    9: 'そしき',
    10: 'いたるところ',
    23: '追加したい',
    24: 'そうとう',
    25: 'じっとして',
    26: 'あやまった',
    27: 'かさかさしている',
  },
};

function underlineExactOnce(text: string, target: string): string {
  if (!target || text.includes(`[[${target}]]`)) return text;
  const idx = text.indexOf(target);
  if (idx < 0) return text;
  return `${text.slice(0, idx)}[[${target}]]${text.slice(idx + target.length)}`;
}

const MONDAI6_CONJUGATION_PATTERNS: Record<string, RegExp> = {
  はずす: /はず(?:して|した|す|さ|せ)/,
  保つ: /保(?:って|った|つ|た|て)/,
  かなう: /かな(?:った|って|い|う)/,
  受け入れる: /受け入れ(?:て|た|る|られ)/,
  とぼしい: /とぼし(?:くて|かった|い)/,
  問い合わせる: /問い合わせ(?:られ(?:た|て|る)?|よう|て|た|る)?/,
  心強い: /心強(?:くて|かった|い)/,
  ふさぐ: /ふさ(?:いで|いだ|ぐ|が|げ)/,
};

function underlineMondai6WordInOption(option: string, headword: string): string {
  const cleanedHead = headword.replace(/^\[\[|\]\]$/g, '').trim();
  if (!cleanedHead) return option;
  if (option.includes(cleanedHead)) {
    return underlineExactOnce(option, cleanedHead);
  }
  const regex = MONDAI6_CONJUGATION_PATTERNS[cleanedHead];
  if (regex) {
    const match = option.match(regex);
    if (match && match.index !== undefined) {
      return `${option.slice(0, match.index)}[[${match[0]}]]${option.slice(match.index + match[0].length)}`;
    }
  }
  return option;
}

/**
 * Extracts 4 options (1..4) from a block of one or more lines.
 * Supports:
 * - Single-line: "1 しょうご  2 しょうごう  3 そうご  4 そうごう"
 * - Two-per-line: "1 ...  2 ...\n3 ...  4 ..."
 * - One-per-line: "1 ...\n2 ...\n3 ...\n4 ..."
 */
function parseFourOptions(lines: string[]): string[] {
  const joined = lines.map((l) => l.trim()).filter(Boolean).join('\n');
  if (!joined) return [];

  // Try matching 1 ... 2 ... 3 ... 4 ... with boundary before 2, 3, 4 (newline or >=2 spaces or start)
  const opts: string[] = ['', '', '', ''];
  const markerRegex = /(?:^|\n|\s{2,})([1-4])\s+/g;
  const matches: Array<{ num: number; start: number; textStart: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = markerRegex.exec(joined)) !== null) {
    const num = Number(m[1]);
    // Only accept strictly ascending 1 -> 2 -> 3 -> 4
    const expected = matches.length + 1;
    if (num === expected) {
      matches.push({
        num,
        start: m.index,
        textStart: m.index + m[0].length,
      });
    }
  }

  if (matches.length === 4) {
    for (let i = 0; i < 4; i++) {
      const end = i < 3 ? matches[i + 1].start : joined.length;
      opts[i] = joined
        .slice(matches[i].textStart, end)
        .replace(/\s*\n\s*/g, ' ')
        .trim();
    }
    return opts;
  }

  // Fallback: looser single-space separator (for rare lines with 1 space between options)
  const looseRegex = /(?:^|\s)([1-4])\s+/g;
  const looseMatches: Array<{ num: number; start: number; textStart: number }> = [];
  while ((m = looseRegex.exec(joined)) !== null) {
    const num = Number(m[1]);
    if (num === looseMatches.length + 1) {
      looseMatches.push({
        num,
        start: m.index,
        textStart: m.index + m[0].length,
      });
    }
  }
  if (looseMatches.length === 4) {
    for (let i = 0; i < 4; i++) {
      const end = i < 3 ? looseMatches[i + 1].start : joined.length;
      opts[i] = joined
        .slice(looseMatches[i].textStart, end)
        .replace(/\s*\n\s*/g, ' ')
        .trim();
    }
    return opts;
  }

  return [];
}

interface ParsedAnswerKeys {
  written: Record<number, string>; // 1..75
  choukai: {
    m1: string[];
    m2: string[];
    m3: string[];
    m4: string[];
    m5: string[]; // length 4: [1番, 2番, 3番質問1, 3番質問2]
  };
}

function parseAnswerKeyBlock(lines: string[]): ParsedAnswerKeys {
  const written: Record<number, string> = {};
  const choukai = {
    m1: [] as string[],
    m2: [] as string[],
    m3: [] as string[],
    m4: [] as string[],
    m5: [] as string[],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = cleanLine(lines[i]);
    if (!line) continue;

    // Look for "文字・語彙 — 問題1 (1-5)" or "文法 — 問題7 (33-44)" or "読解 — 問題10 (55-59)"
    const writtenRangeMatch = line.match(
      /^(?:文字・語彙|文法|読解)\s*[—–-]\s*問題\d+\s*\((\d+)-(\d+)\)/,
    );
    if (writtenRangeMatch) {
      const startNum = Number(writtenRangeMatch[1]);
      // Next non-empty line has the comma-separated digits
      let valLine = '';
      for (let j = i + 1; j < lines.length; j++) {
        const candidate = cleanLine(lines[j]);
        if (candidate) {
          valLine = candidate;
          i = j;
          break;
        }
      }
      const digits = valLine.match(/[1-4]/g) ?? [];
      digits.forEach((d, idx) => {
        written[startNum + idx] = d;
      });
      continue;
    }

    // Look for "聴解 — 問題1 (1-5)" .. "聴解 — 問題5 (1-3)" / "(1-4)"
    const chMatch = line.match(/^聴解\s*[—–-]\s*問題([1-5])\s*\((\d+)-(\d+)\)/);
    if (chMatch) {
      const mondai = Number(chMatch[1]);
      let valLine = '';
      for (let j = i + 1; j < lines.length; j++) {
        const candidate = cleanLine(lines[j]);
        if (candidate) {
          valLine = candidate;
          i = j;
          break;
        }
      }
      if (mondai === 1) {
        choukai.m1 = valLine.match(/[1-4]/g) ?? [];
      } else if (mondai === 2) {
        choukai.m2 = valLine.match(/[1-4]/g) ?? [];
      } else if (mondai === 3) {
        choukai.m3 = valLine.match(/[1-4]/g) ?? [];
      } else if (mondai === 4) {
        choukai.m4 = valLine.match(/[1-3]/g) ?? [];
      } else if (mondai === 5) {
        // Formats:
        // "1: 2, 2: 3, 3(質問1): 2, 3(質問2): 3"
        // "1: 3, 2: 4, 3: 1, 4: 3"
        // "1: 3, 2: 4, 3: 3/1 (質問1: 3, 質問2: 1)"
        const m1 = valLine.match(/1\s*:\s*([1-4])/);
        const m2 = valLine.match(/2\s*:\s*([1-4])/);
        const q1 =
          valLine.match(/質問1\s*\)?\s*:\s*([1-4])/) ??
          valLine.match(/3\s*:\s*([1-4])\s*\/\s*[1-4]/) ??
          valLine.match(/3\s*:\s*([1-4])/);
        const q2 =
          valLine.match(/質問2\s*\)?\s*:\s*([1-4])/) ??
          valLine.match(/3\s*:\s*[1-4]\s*\/\s*([1-4])/) ??
          valLine.match(/4\s*:\s*([1-4])/);
        choukai.m5 = [
          m1?.[1] ?? '1',
          m2?.[1] ?? '1',
          q1?.[1] ?? '1',
          q2?.[1] ?? '1',
        ];
      }
    }
  }

  return { written, choukai };
}

interface ParsedQuestionBlock {
  number: number;
  prompt: string;
  optionTexts: string[];
}

function parseNumberedQuestions(
  lines: string[],
  startNumber: number,
  endNumber: number,
): ParsedQuestionBlock[] {
  const blocks: Array<{ number: number; rawLines: string[] }> = [];
  let current: { number: number; rawLines: string[] } | null = null;

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;
    const qMatch = line.match(/^\[(\d+)\]\s*(.*)$/);
    if (qMatch) {
      const num = Number(qMatch[1]);
      if (num >= startNumber && num <= endNumber) {
        if (current) blocks.push(current);
        current = { number: num, rawLines: qMatch[2] ? [qMatch[2]] : [] };
        continue;
      }
    }
    if (current) {
      current.rawLines.push(line);
    }
  }
  if (current) blocks.push(current);

  return blocks.map((b) => {
    // Separate prompt lines from option lines (options start at first line beginning with "1 ")
    const firstOptIdx = b.rawLines.findIndex((l) => /^1\s+/.test(l));
    let prompt = '';
    let optionLines: string[] = [];
    if (firstOptIdx >= 0) {
      prompt = b.rawLines.slice(0, firstOptIdx).join('\n').trim();
      optionLines = b.rawLines.slice(firstOptIdx);
    } else {
      prompt = b.rawLines.join('\n').trim();
    }
    const optionTexts = parseFourOptions(optionLines);
    return {
      number: b.number,
      prompt,
      optionTexts,
    };
  });
}

function splitSectionsByRegex(
  lines: string[],
  headerRegex: RegExp,
): Array<{ header: string; match: RegExpMatchArray; lines: string[] }> {
  const result: Array<{ header: string; match: RegExpMatchArray; lines: string[] }> = [];
  let current: { header: string; match: RegExpMatchArray; lines: string[] } | null = null;

  for (const raw of lines) {
    const line = cleanLine(raw);
    const m = line.match(headerRegex);
    if (m) {
      if (current) result.push(current);
      current = { header: line, match: m, lines: [] };
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }
  if (current) result.push(current);
  return result;
}

function parsePassageAndNotes(lines: string[]): {
  paragraphs: string[];
  notes: string[];
  source?: string;
} {
  const paragraphs: string[] = [];
  const notes: string[] = [];
  let source: string | undefined;

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;
    if (/^[（(]注[0-9０-９]*[）)]/.test(line) || /^注[0-9０-９]*[:：]/.test(line)) {
      notes.push(line);
    } else if (/^[（(][^）)]*(?:による|より|新聞|著|編|刊|HP|ホームページ)[^）)]*[）)]$/.test(line)) {
      source = line;
    } else {
      paragraphs.push(line);
    }
  }

  return { paragraphs, notes, source };
}

function parseDokkaiMondaiWithSubPassages(
  lines: string[],
  mondaiNum: number,
  instruction: string,
  packetId: string,
  keys: Record<number, string>,
): TryOutFormItem[] {
  const items: TryOutFormItem[] = [
    {
      kind: 'passage',
      id: `${packetId}-dk-m${mondaiNum}-intro`,
      title: `問題${mondaiNum}`,
      subtitle: instruction,
      paragraphs: [],
    },
  ];

  // Split into chunks by (1), (2), ... or A / B for Mondai 12
  if (mondaiNum === 10 || mondaiNum === 11) {
    const subParts: Array<{ label: string; lines: string[] }> = [];
    let current: { label: string; lines: string[] } | null = null;

    for (const raw of lines) {
      const line = cleanLine(raw);
      if (!line) continue;
      const subMatch = line.match(/^\((\d+)\)\s*(.*)$/);
      if (subMatch) {
        if (current) subParts.push(current);
        current = {
          label: `(${subMatch[1]})`,
          lines: subMatch[2] ? [subMatch[2]] : [],
        };
        continue;
      }
      if (current) current.lines.push(line);
    }
    if (current) subParts.push(current);

    subParts.forEach((sub, subIdx) => {
      const firstQIdx = sub.lines.findIndex((l) => /^\[\d+\]/.test(l));
      const passageLines = firstQIdx >= 0 ? sub.lines.slice(0, firstQIdx) : sub.lines;
      const qLines = firstQIdx >= 0 ? sub.lines.slice(firstQIdx) : [];

      const { paragraphs, notes, source } = parsePassageAndNotes(passageLines);
        items.push({
        kind: 'passage',
        id: `${packetId}-dk-m${mondaiNum}-p${subIdx + 1}`,
        title: `問題${mondaiNum} ${sub.label}`,
        paragraphs: paragraphs.map(formatBlankParentheses),
        notes: notes.length > 0 ? notes : undefined,
        source,
      });

      const questions = parseNumberedQuestions(qLines, 55, 75);
      for (const q of questions) {
        items.push({
          kind: 'choice',
          id: `${packetId}-dk-q-${q.number}`,
          number: q.number,
          label: `Soal ${q.number}`,
          prompt: formatBlankParentheses(q.prompt),
          optionTexts: q.optionTexts.map(formatBlankParentheses),
          correctAnswer: keys[q.number] ?? '1',
          image: null,
          options: ['1', '2', '3', '4'],
          required: true,
        });
      }
    });

    return items;
  }

  // Mondai 12 (A & B), Mondai 13 (Long), Mondai 14 (Info retrieval)
  const firstQIdx = lines.findIndex((l) => /^\[\d+\]/.test(cleanLine(l)));
  const passageLines = firstQIdx >= 0 ? lines.slice(0, firstQIdx) : lines;
  const qLines = firstQIdx >= 0 ? lines.slice(firstQIdx) : [];

  if (mondaiNum === 12) {
    const sections: TryOutPassageSection[] = [];
    let currentHeading: string | null = null;
    let currentLines: string[] = [];
    const notes: string[] = [];
    const preLines: string[] = [];

    for (const raw of passageLines) {
      const line = cleanLine(raw);
      if (!line) continue;
      if (/^[（(]注/.test(line)) {
        notes.push(line);
        continue;
      }
      const abMatch = line.match(/^([AB])\s*(.*)$/);
      if (abMatch && (line === 'A' || line === 'B' || /^[AB][：:\s]/.test(line))) {
        if (currentHeading) {
          sections.push({ heading: currentHeading, lines: currentLines });
        }
        currentHeading = `文章 ${abMatch[1]}`;
        currentLines = abMatch[2] ? [abMatch[2].replace(/^[：:]\s*/, '')] : [];
        continue;
      }
      if (currentHeading) {
        currentLines.push(line);
      } else {
        preLines.push(line);
      }
    }
    if (currentHeading) {
      sections.push({ heading: currentHeading, lines: currentLines });
    }

    items.push({
      kind: 'passage',
      id: `${packetId}-dk-m12-passage`,
      title: '文章 A・B',
      paragraphs: preLines,
      sections: sections.length > 0 ? sections : undefined,
      notes: notes.length > 0 ? notes : undefined,
    });
  } else {
    const { paragraphs, notes, source } = parsePassageAndNotes(passageLines);
    items.push({
      kind: 'passage',
      id: `${packetId}-dk-m${mondaiNum}-passage`,
      title: mondaiNum === 13 ? '長文読解' : '情報検索',
      paragraphs,
      notes: notes.length > 0 ? notes : undefined,
      source,
    });
  }

  const questions = parseNumberedQuestions(qLines, 55, 75);
  for (const q of questions) {
    items.push({
      kind: 'choice',
      id: `${packetId}-dk-q-${q.number}`,
      number: q.number,
      label: `Soal ${q.number}`,
      prompt: q.prompt,
      optionTexts: q.optionTexts,
      correctAnswer: keys[q.number] ?? '1',
      image: null,
      options: ['1', '2', '3', '4'],
      required: true,
    });
  }

  return items;
}

interface ParsedChoukaiTranscriptMap {
  sections: ChoukaiTranscriptSection[];
  byMondaiAndItem: Record<string, string>; // key `${mondai}-${itemNum}` -> clean transcript body
}

function parseChoukaiTranscript(
  lines: string[],
  keys: ParsedAnswerKeys['choukai'],
  packetId: string,
): ParsedChoukaiTranscriptMap {
  const sections: ChoukaiTranscriptSection[] = [];
  const byMondaiAndItem: Record<string, string> = {};

  const mondaiBlocks = splitSectionsByRegex(lines, /^問題([1-5])\s*(.*)$/);

  // Calculate sequential question numbers matching Choukai form pages
  const m1Count = keys.m1.length || 5;
  const m2Count = keys.m2.length || 6;
  const m3Count = keys.m3.length || 5;
  const m4Count = keys.m4.length || 12;

  const mondaiStartNum: Record<number, number> = {
    1: 1,
    2: 1 + m1Count,
    3: 1 + m1Count + m2Count,
    4: 1 + m1Count + m2Count + m3Count,
    5: 1 + m1Count + m2Count + m3Count + m4Count,
  };

  for (const mb of mondaiBlocks) {
    const mondaiNumber = Number(mb.match[1]);
    const title = mb.header;
    const entries: ChoukaiTranscriptEntry[] = [];

    // Split entries by "1番", "2番", ...
    const rawEntries: Array<{ itemNum: number; firstLineRest: string; lines: string[] }> = [];
    let current: { itemNum: number; firstLineRest: string; lines: string[] } | null = null;

    for (const raw of mb.lines) {
      const line = cleanLine(raw);
      if (!line) continue;
      const itemMatch = line.match(/^(\d+)番(?:\s+(.*))?$/);
      if (itemMatch) {
        if (current) rawEntries.push(current);
        current = {
          itemNum: Number(itemMatch[1]),
          firstLineRest: itemMatch[2]?.trim() ?? '',
          lines: [],
        };
        continue;
      }
      if (current) {
        current.lines.push(line);
      }
    }
    if (current) rawEntries.push(current);

    for (const re of rawEntries) {
      const allLines: string[] = [];
      if (re.firstLineRest) allLines.push(re.firstLineRest);

      let answerNote = '';
      for (const l of re.lines) {
        if (/^正解[：:]/.test(l)) {
          answerNote = l.replace(/^正解[：:]\s*/, '').trim();
        } else {
          allLines.push(l);
        }
      }

      const body = allLines.join('\n').trim();
      byMondaiAndItem[`${mondaiNumber}-${re.itemNum}`] = body;

      const baseStart = mondaiStartNum[mondaiNumber] ?? 1;
      let questionNumbers: number[] = [baseStart + re.itemNum - 1];
      let itemNumberLabel = `${re.itemNum}番`;
      let correctAnswerLabel = answerNote;

      if (mondaiNumber === 1) {
        correctAnswerLabel = keys.m1[re.itemNum - 1] ?? answerNote;
      } else if (mondaiNumber === 2) {
        correctAnswerLabel = keys.m2[re.itemNum - 1] ?? answerNote;
      } else if (mondaiNumber === 3) {
        correctAnswerLabel = keys.m3[re.itemNum - 1] ?? answerNote;
      } else if (mondaiNumber === 4) {
        correctAnswerLabel = keys.m4[re.itemNum - 1] ?? answerNote;
      } else if (mondaiNumber === 5) {
        if (re.itemNum === 3) {
          questionNumbers = [baseStart + 2, baseStart + 3];
          itemNumberLabel = '3番 (質問1・質問2)';
          correctAnswerLabel = `質問1: ${keys.m5[2] ?? '-'} / 質問2: ${keys.m5[3] ?? '-'}`;
        } else {
          correctAnswerLabel = keys.m5[re.itemNum - 1] ?? answerNote;
        }
      }

      entries.push({
        id: `${packetId}-tr-m${mondaiNumber}-${re.itemNum}`,
        mondaiNumber,
        itemNumberLabel,
        questionNumbers,
        body,
        correctAnswerLabel,
      });
    }

    sections.push({
      mondaiNumber,
      title,
      entries,
    });
  }

  return { sections, byMondaiAndItem };
}

function parseChoukaiPart(
  choukaiLines: string[],
  keys: ParsedAnswerKeys['choukai'],
  transcriptMap: ParsedChoukaiTranscriptMap,
  packetId: string,
): TryOutFormPage[] {
  const mondaiBlocks = splitSectionsByRegex(choukaiLines, /^問題([1-5])\s*$/);
  const blockByNum = new Map<number, string[]>();
  for (const mb of mondaiBlocks) {
    blockByNum.set(Number(mb.match[1]), mb.lines);
  }

  const pages: TryOutFormPage[] = [];
  let seqNum = 1;

  // Helper to extract N番 option blocks for Mondai 1 & Mondai 2
  const parsePaperChoiceMondai = (
    mondaiNum: 1 | 2,
    title: string,
    subtitle: string,
    ansList: string[],
  ): TryOutFormPage => {
    const mLines = blockByNum.get(mondaiNum) ?? [];
    const firstItemIdx = mLines.findIndex((l) => /^\d+番$/.test(cleanLine(l)));
    const instructionLines =
      firstItemIdx >= 0
        ? mLines.slice(0, firstItemIdx).map(cleanLine).filter(Boolean)
        : mLines.map(cleanLine).filter(Boolean);
    const itemsLines = firstItemIdx >= 0 ? mLines.slice(firstItemIdx) : [];

    const itemBlocks = splitSectionsByRegex(itemsLines, /^(\d+)番$/);
    const items: TryOutFormItem[] = [
      {
        kind: 'passage',
        id: `${packetId}-ch-m${mondaiNum}-intro`,
        title,
        subtitle,
        paragraphs: instructionLines,
      },
    ];

    itemBlocks.forEach((ib, idx) => {
      const itemNum = Number(ib.match[1]);
      const optTexts = parseFourOptions(ib.lines);
      const qNum = seqNum++;
      items.push({
        kind: 'choice',
        id: `${packetId}-ch-m${mondaiNum}-${itemNum}`,
        number: qNum,
        label: `問題${mondaiNum} · ${itemNum}番`,
        prompt: `Dengarkan audio 問題${mondaiNum} (${itemNum}番), lalu pilih jawaban terbaik:`,
        optionTexts: optTexts.length === 4 ? optTexts : undefined,
        correctAnswer: ansList[idx] ?? '1',
        transcript: transcriptMap.byMondaiAndItem[`${mondaiNum}-${itemNum}`],
        image: null,
        options: ['1', '2', '3', '4'],
        required: true,
      });
    });

    return {
      id: `${packetId}-ch-page-${mondaiNum}`,
      title,
      subtitle,
      items,
    };
  };

  // Page 1: 問題1 課題理解
  pages.push(
    parsePaperChoiceMondai(
      1,
      '問題1 課題理解',
      'Dengarkan pertanyaan & percakapan, pilih tindakan berikutnya (5 soal)',
      keys.m1,
    ),
  );

  // Page 2: 問題2 要点理解
  pages.push(
    parsePaperChoiceMondai(
      2,
      '問題2 要点理解',
      'Baca pilihan, dengarkan percakapan, lalu pilih poin utama (6 soal)',
      keys.m2,
    ),
  );

  // Page 3: 問題3 概要理解 (5 audio-only questions, 4 options)
  {
    const m3Lines = (blockByNum.get(3) ?? []).map(cleanLine).filter(Boolean);
    const count = keys.m3.length || 5;
    const items: TryOutFormItem[] = [
      {
        kind: 'passage',
        id: `${packetId}-ch-m3-intro`,
        title: '問題3 概要理解',
        subtitle: `Soal murni audio tanpa pilihan tercetak (${count} soal)`,
        paragraphs: m3Lines,
      },
    ];
    for (let i = 1; i <= count; i++) {
      const qNum = seqNum++;
      items.push({
        kind: 'choice',
        id: `${packetId}-ch-m3-${i}`,
        number: qNum,
        label: `問題3 · ${i}番`,
        prompt: `Dengarkan audio 問題3 (${i}番) dan pilih 1, 2, 3, atau 4.`,
        correctAnswer: keys.m3[i - 1] ?? '1',
        transcript: transcriptMap.byMondaiAndItem[`3-${i}`],
        image: null,
        options: ['1', '2', '3', '4'],
        required: true,
      });
    }
    pages.push({
      id: `${packetId}-ch-page-3`,
      title: '問題3 概要理解',
      subtitle: `Pemahaman garis besar secara audio (${count} soal)`,
      items,
    });
  }

  // Page 4: 問題4 即時応答 (11 or 12 audio-only questions, 3 options)
  {
    const m4Lines = (blockByNum.get(4) ?? []).map(cleanLine).filter(Boolean);
    const count = keys.m4.length || 12;
    const items: TryOutFormItem[] = [
      {
        kind: 'passage',
        id: `${packetId}-ch-m4-intro`,
        title: '問題4 即時応答',
        subtitle: `Respons cepat audio — pilih 1, 2, atau 3 (${count} soal)`,
        paragraphs: m4Lines,
      },
    ];
    for (let i = 1; i <= count; i++) {
      const qNum = seqNum++;
      items.push({
        kind: 'choice',
        id: `${packetId}-ch-m4-${i}`,
        number: qNum,
        label: `問題4 · ${i}番`,
        prompt: `Dengarkan ucapan & 3 pilihan respons 問題4 (${i}番), pilih 1, 2, atau 3.`,
        correctAnswer: keys.m4[i - 1] ?? '1',
        transcript: transcriptMap.byMondaiAndItem[`4-${i}`],
        image: null,
        options: ['1', '2', '3'],
        required: true,
      });
    }
    pages.push({
      id: `${packetId}-ch-page-4`,
      title: '問題4 即時応答',
      subtitle: `Respons cepat 3 pilihan (${count} soal)`,
      items,
    });
  }

  // Page 5: 問題5 総合理解 (1番, 2番 audio-only + 3番 質問1 & 質問2 with printed choices)
  {
    const m5Lines = (blockByNum.get(5) ?? []).map(cleanLine).filter(Boolean);
    const q1Idx = m5Lines.findIndex((l) => /^質問1/.test(l));
    const q2Idx = m5Lines.findIndex((l) => /^質問2/.test(l));

    const introEnd = q1Idx >= 0 ? q1Idx : m5Lines.length;
    const introLines = m5Lines.slice(0, introEnd);
    const q1OptLines =
      q1Idx >= 0 ? m5Lines.slice(q1Idx + 1, q2Idx >= 0 ? q2Idx : undefined) : [];
    const q2OptLines = q2Idx >= 0 ? m5Lines.slice(q2Idx + 1) : [];

    const q1Opts = parseFourOptions(q1OptLines);
    const q2Opts = parseFourOptions(q2OptLines);

    const items: TryOutFormItem[] = [
      {
        kind: 'passage',
        id: `${packetId}-ch-m5-intro`,
        title: '問題5 総合理解',
        subtitle: 'Pemahaman terpadu: 1番・2番 audio, 3番 (質問1 & 質問2) dengan pilihan teks',
        paragraphs: introLines,
      },
      {
        kind: 'choice',
        id: `${packetId}-ch-m5-1`,
        number: seqNum++,
        label: '問題5 · 1番',
        prompt: 'Dengarkan audio 問題5 (1番), lalu pilih 1, 2, 3, atau 4.',
        correctAnswer: keys.m5[0] ?? '1',
        transcript: transcriptMap.byMondaiAndItem['5-1'],
        image: null,
        options: ['1', '2', '3', '4'],
        required: true,
      },
      {
        kind: 'choice',
        id: `${packetId}-ch-m5-2`,
        number: seqNum++,
        label: '問題5 · 2番',
        prompt: 'Dengarkan audio 問題5 (2番), lalu pilih 1, 2, 3, atau 4.',
        correctAnswer: keys.m5[1] ?? '1',
        transcript: transcriptMap.byMondaiAndItem['5-2'],
        image: null,
        options: ['1', '2', '3', '4'],
        required: true,
      },
      {
        kind: 'choice',
        id: `${packetId}-ch-m5-3a`,
        number: seqNum++,
        label: '問題5 · 3番 (質問1)',
        prompt: 'Dengarkan audio 問題5 (3番 · 質問1), lalu pilih jawaban terbaik:',
        optionTexts: q1Opts.length === 4 ? q1Opts : undefined,
        correctAnswer: keys.m5[2] ?? '1',
        transcript: transcriptMap.byMondaiAndItem['5-3'],
        image: null,
        options: ['1', '2', '3', '4'],
        required: true,
      },
      {
        kind: 'choice',
        id: `${packetId}-ch-m5-3b`,
        number: seqNum++,
        label: '問題5 · 3番 (質問2)',
        prompt: 'Dengarkan audio 問題5 (3番 · 質問2), lalu pilih jawaban terbaik:',
        optionTexts: q2Opts.length === 4 ? q2Opts : undefined,
        correctAnswer: keys.m5[3] ?? '1',
        transcript: transcriptMap.byMondaiAndItem['5-3'],
        image: null,
        options: ['1', '2', '3', '4'],
        required: true,
      },
    ];

    pages.push({
      id: `${packetId}-ch-page-5`,
      title: '問題5 総合理解',
      subtitle: 'Pemahaman terpadu (4 soal: 1番, 2番, 3番 質問1 & 質問2)',
      items,
    });
  }

  return pages;
}

const MOJI_MONDAI_META: Record<
  number,
  { title: string; subtitle: string; start: number; end: number }
> = {
  1: { title: '問題1 · 漢字読み', subtitle: 'Pilih cara baca kanji yang tepat (Soal 1–5)', start: 1, end: 5 },
  2: { title: '問題2 · 表記', subtitle: 'Pilih penulisan kanji yang tepat (Soal 6–10)', start: 6, end: 10 },
  3: { title: '問題3 · 語形成', subtitle: 'Pilih prefiks/sufiks pembentuk kata (Soal 11–15)', start: 11, end: 15 },
  4: { title: '問題4 · 文脈規定', subtitle: 'Pilih kosakata yang sesuai konteks kalimat (Soal 16–22)', start: 16, end: 22 },
  5: { title: '問題5 · 言い換え類義', subtitle: 'Pilih padanan kata dengan makna terdekat (Soal 23–27)', start: 23, end: 27 },
  6: { title: '問題6 · 用法', subtitle: 'Pilih kalimat dengan penggunaan kata yang tepat (Soal 28–32)', start: 28, end: 32 },
  7: { title: '問題7 · 文の文法1', subtitle: 'Pilih pola tata bahasa yang tepat untuk kalimat (Soal 33–44)', start: 33, end: 44 },
  8: { title: '問題8 · 文の文法2 (★)', subtitle: 'Susun urutan kata dan pilih yang menempati posisi ★ (Soal 45–49)', start: 45, end: 49 },
  9: { title: '問題9 · 文章の文法', subtitle: 'Baca wacana dan lengkapi bagian (50)–(54) (Soal 50–54)', start: 50, end: 54 },
};

const DOKKAI_MONDAI_META: Record<number, { title: string; subtitle: string }> = {
  10: { title: '問題10 · 内容理解（短文）', subtitle: '5 wacana pendek (Soal 55–59)' },
  11: { title: '問題11 · 内容理解（中文）', subtitle: '3 wacana menengah (Soal 60–68)' },
  12: { title: '問題12 · 統合理解（A・B比較）', subtitle: 'Perbandingan 2 wacana A & B (Soal 69–70)' },
  13: { title: '問題13 · 主張理解（長文）', subtitle: '1 wacana panjang (Soal 71–73)' },
  14: { title: '問題14 · 情報検索', subtitle: 'Pencarian informasi pada pengumuman/brosur (Soal 74–75)' },
};

export function parseVerifiedTryOutDocument(
  rawText: string,
): ParsedVerifiedTryOutPacket[] {
  const normalized = rawText.replace(/^\uFEFF/, '');
  const rawPackets = normalized
    .split(/(?=^SOAL TAHUN \d{4} BULAN \d{2})/m)
    .filter((block) => block.trim().startsWith('SOAL TAHUN'));

  const parsedPackets: ParsedVerifiedTryOutPacket[] = [];

  for (const packetText of rawPackets) {
    const lines = packetText.split(/\r?\n/);
    const headerTitle = cleanLine(lines[0] ?? '');
    const codeMatch = headerTitle.match(/SOAL TAHUN (\d{4}) BULAN (\d{2})/);
    if (!codeMatch) continue;

    const examCode = `${codeMatch[1]}.${codeMatch[2]}`;
    const mapping = VERIFIED_EXAM_CODE_TO_PACKET_ID[examCode];
    if (!mapping) continue;

    const { packetId, yearLabel, orderNumber } = mapping;

    const dokkaiIdx = lines.findIndex((l) => cleanLine(l) === '読解');
    const choukaiIdx = lines.findIndex((l) => cleanLine(l) === '聴解');
    const jawabanIdx = lines.findIndex((l) => /^JAWABAN\s*\(/.test(cleanLine(l)));
    const transkripIdx = lines.findIndex((l) =>
      /^TRANSKRIP CHOUKAI/.test(cleanLine(l)),
    );

    if (dokkaiIdx < 0 || choukaiIdx < 0 || jawabanIdx < 0 || transkripIdx < 0) {
      continue;
    }

    const mojiBunpouLines = lines.slice(1, dokkaiIdx);
    const dokkaiLines = lines.slice(dokkaiIdx + 1, choukaiIdx);
    const choukaiLines = lines.slice(choukaiIdx + 1, jawabanIdx);
    const answerLines = lines.slice(jawabanIdx + 1, transkripIdx);
    const transcriptLines = lines.slice(transkripIdx + 1);

    const keys = parseAnswerKeyBlock(answerLines);
    const transcriptMap = parseChoukaiTranscript(
      transcriptLines,
      keys.choukai,
      packetId,
    );

    // 1. Build Moji-Goi & Bunpou pages (Page 1 notice + Mondai 1..9)
    const choukaiCount =
      keys.choukai.m1.length +
      keys.choukai.m2.length +
      keys.choukai.m3.length +
      keys.choukai.m4.length +
      keys.choukai.m5.length;

    const mojiPages: TryOutFormPage[] = [
      {
        id: `${packetId}-mb-page-0`,
        title: 'Tata Tertib Pengerjaan',
        subtitle: `Panduan singkat JLPT N2 Paket ${orderNumber} (${examCode} · ${yearLabel})`,
        items: [
          {
            kind: 'notice',
            id: `${packetId}-mb-rules`,
            title: `Tata Tertib JLPT N2 — Paket ${orderNumber} (${examCode})`,
            bullets: [
              `Soal Terverifikasi: Berisi 54 soal Moji-Goi & Bunpou, 21 soal Dokkai, dan ${choukaiCount} soal Choukai asli seri ${examCode} (${yearLabel}).`,
              'Kunci Jawaban Resmi: Skor otomatis, status benar/salah, dan pembahasan kunci jawaban muncul setelah kamu mengumpulkan bagian ini.',
              'Audio & Transkrip Choukai: Bagian Choukai dilengkapi audio resmi. Transkrip lengkap (聴力原文) terbuka otomatis saat evaluasi setelah kamu mengumpulkan jawaban.',
            ],
          },
        ],
      },
    ];

    const mojiBlocks = splitSectionsByRegex(mojiBunpouLines, /^問題([1-9])\s+(.*)$/);
    const examUnderlines = VERIFIED_MOJI_UNDERLINES[examCode] ?? {};
    for (const mb of mojiBlocks) {
      const mNum = Number(mb.match[1]);
      const instruction = formatBlankParentheses(mb.match[2]?.trim() ?? '');
      const meta = MOJI_MONDAI_META[mNum];
      if (!meta) continue;

      const items: TryOutFormItem[] = [];

      if (mNum === 9) {
        // Passage precedes [50]..[54]
        const firstQIdx = mb.lines.findIndex((l) => /^\[50\]/.test(cleanLine(l)));
        const passageLines = firstQIdx >= 0 ? mb.lines.slice(0, firstQIdx) : [];
        const qLines = firstQIdx >= 0 ? mb.lines.slice(firstQIdx) : mb.lines;
        const { paragraphs, notes, source } = parsePassageAndNotes(passageLines);

        items.push({
          kind: 'passage',
          id: `${packetId}-mb-m9-passage`,
          title: '問題9 · 文章の文法',
          subtitle: instruction,
          paragraphs: paragraphs.map(formatBlankParentheses),
          notes: notes.length > 0 ? notes : undefined,
          source,
        });

        const questions = parseNumberedQuestions(qLines, meta.start, meta.end);
        for (const q of questions) {
          items.push({
            kind: 'choice',
            id: `${packetId}-mb-q-${q.number}`,
            number: q.number,
            label: `Soal ${q.number}`,
            prompt: formatBlankParentheses(
              q.prompt || `Pilih jawaban paling tepat untuk mengisi (${q.number}).`,
            ),
            optionTexts: q.optionTexts.map(formatBlankParentheses),
            correctAnswer: keys.written[q.number] ?? '1',
            image: null,
            options: ['1', '2', '3', '4'],
            required: true,
          });
        }
      } else {
        items.push({
          kind: 'passage',
          id: `${packetId}-mb-m${mNum}-intro`,
          title: meta.title,
          subtitle: instruction,
          paragraphs: [],
        });

        const questions = parseNumberedQuestions(mb.lines, meta.start, meta.end);
        for (const q of questions) {
          let formattedPrompt = formatBlankParentheses(q.prompt);
          let formattedOptions = q.optionTexts.map((opt) =>
            formatBlankParentheses(opt.replace(/\s+文法$/, '').trim()),
          );

          if (mNum === 6) {
            const headword = formattedPrompt.trim();
            formattedPrompt = `[[${headword}]]`;
            formattedOptions = formattedOptions.map((opt) =>
              underlineMondai6WordInOption(opt, headword),
            );
          } else if (examUnderlines[q.number]) {
            formattedPrompt = underlineExactOnce(
              formattedPrompt,
              examUnderlines[q.number],
            );
          }

          items.push({
            kind: 'choice',
            id: `${packetId}-mb-q-${q.number}`,
            number: q.number,
            label: `Soal ${q.number}`,
            prompt: formattedPrompt,
            optionTexts: formattedOptions,
            correctAnswer: keys.written[q.number] ?? '1',
            image: null,
            options: ['1', '2', '3', '4'],
            required: true,
          });
        }
      }

      mojiPages.push({
        id: `${packetId}-mb-page-${mNum}`,
        title: meta.title,
        subtitle: meta.subtitle,
        items,
      });
    }

    // 2. Build Dokkai pages (Mondai 10..14)
    const dokkaiPages: TryOutFormPage[] = [];
    const dokkaiBlocks = splitSectionsByRegex(
      dokkaiLines,
      /^問題(1[0-4])\s+(.*)$/,
    );
    for (const db of dokkaiBlocks) {
      const mNum = Number(db.match[1]);
      const instruction = db.match[2]?.trim() ?? '';
      const meta = DOKKAI_MONDAI_META[mNum];
      if (!meta) continue;

      dokkaiPages.push({
        id: `${packetId}-dk-page-${mNum}`,
        title: meta.title,
        subtitle: meta.subtitle,
        items: parseDokkaiMondaiWithSubPassages(
          db.lines,
          mNum,
          instruction,
          packetId,
          keys.written,
        ),
      });
    }

    // 3. Build Choukai pages (Mondai 1..5)
    const choukaiPages = parseChoukaiPart(
      choukaiLines,
      keys.choukai,
      transcriptMap,
      packetId,
    );

    const countChoices = (pages: TryOutFormPage[]) =>
      pages.reduce(
        (sum, pg) => sum + pg.items.filter((it) => it.kind === 'choice').length,
        0,
      );

    const mbCount = countChoices(mojiPages);
    const dkCount = countChoices(dokkaiPages);
    const chCount = countChoices(choukaiPages);

    parsedPackets.push({
      packetId,
      examCode,
      yearLabel,
      headerTitle,
      forms: {
        'moji-bunpou': mojiPages,
        dokkai: dokkaiPages,
        choukai: choukaiPages,
      },
      choukaiTranscript: transcriptMap.sections,
      counts: {
        mojiBunpou: mbCount,
        dokkai: dkCount,
        choukai: chCount,
        total: mbCount + dkCount + chCount,
      },
    });
  }

  return parsedPackets;
}
