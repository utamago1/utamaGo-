/**
 * Micro-typography & 3-layer scannable formatter for JLPT N5–N1 Bunpou explanations.
 *
 * Transforms dense wall-of-text grammar notes into a structured 3-layer layout:
 *   1. Kalimat Pembuka (short 1-sentence core function)
 *   2. Poin Aturan & Situasi (`\n- **Label:** ...` bullet points)
 *   3. Catatan Nuansa / Batasan (optional politeness, restriction, or comparison note)
 *
 * Micro-typography guarantees:
 *   - Every `- ` bullet starts on its own newline (`\n- `)
 *   - Situation/rule labels before colons are bolded (`**Label:**`)
 *   - Japanese words/particles/phrases in Indonesian prose are wrapped in `「...」`
 *   - Transformation/reading arrows use ` → ` with clean spacing
 */

const JP_CHAR_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/;

/**
 * Normalizes arrows (`->`, `=>`, tight `→`) to spaced ` → `.
 */
function normalizeArrows(text: string): string {
  return text
    .replace(/\s*(?:->|=>|＝>|→)\s*/g, ' → ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Wraps bare Japanese tokens/phrases outside existing `「...」` brackets in `「...」`.
 * Preserves already-bracketed Japanese phrases untouched.
 */
function wrapBareJapaneseInBrackets(line: string): string {
  // Split by existing 「...」 segments so we never double-wrap
  const segments = line.split(/(「[^」]+」)/g);

  return segments
    .map((segment) => {
      if (segment.startsWith('「') && segment.endsWith('」')) {
        return segment;
      }

      // Match Japanese phrases (optionally starting with ~ or 〜, or digits attached to JP counters like 4円, 100円)
      // Allows internal Japanese punctuation (、。！？・ー々()〜~) ONLY when bridged to more Japanese characters.
      const jpPhraseRe =
        /(?:[~〜]|\d+)?[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF](?:[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBFー々・…~〜、。！？\d]|(?:\s+(?=[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]))|(?:\([^\u0029]*[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF][^\u0029]*\)))*/g;

      return segment.replace(jpPhraseRe, (match) => {
        const trimmed = match.trim();
        if (!trimmed || !JP_CHAR_RE.test(trimmed)) return match;
        // Keep trailing sentence-ending period outside if followed by space/end only when it's not a full JP sentence
        const leadingSpace = match.startsWith(' ') ? ' ' : '';
        const trailingSpace = match.endsWith(' ') ? ' ' : '';
        return `${leadingSpace}「${trimmed}」${trailingSpace}`;
      });
    })
    .join('');
}

/**
 * Formats a bullet item so any leading `Label:` becomes `**Label:**`.
 */
function formatBulletLine(rawBody: string): string {
  const cleaned = normalizeArrows(rawBody.replace(/^[-•]\s*/, '').trim());
  if (!cleaned) return '';

  // Already has bold label like **Perkenalan:** ...
  if (/^\*\*[^*]+\*\*/.test(cleaned)) {
    return `- ${wrapBareJapaneseInBrackets(cleaned)}`;
  }

  // Pattern: `「すみません」: ...` or `「間」 = ...`
  const jpLeadMatch = cleaned.match(/^(「[^」]+」)\s*[:=]\s*(.+)$/);
  if (jpLeadMatch) {
    const label = jpLeadMatch[1];
    const rest = wrapBareJapaneseInBrackets(jpLeadMatch[2].trim());
    return `- **${label}:** ${rest}`;
  }

  // Pattern: `Label singkat: penjelasan...` (up to 42 chars, no period before colon)
  const colonMatch = cleaned.match(/^([^:.]{2,42}):\s*(.+)$/);
  if (colonMatch) {
    const rawLabel = colonMatch[1].trim();
    const rest = wrapBareJapaneseInBrackets(colonMatch[2].trim());
    const formattedLabel = JP_CHAR_RE.test(rawLabel)
      ? wrapBareJapaneseInBrackets(rawLabel)
      : rawLabel;
    return `- **${formattedLabel}:** ${rest}`;
  }

  // Pattern: `Formula = arti` (e.g. `V-kamus + ところ = tepat sebelum terjadi`)
  const eqMatch = cleaned.match(/^([^=.]{2,36})\s*=\s*(.+)$/);
  if (eqMatch) {
    const left = wrapBareJapaneseInBrackets(eqMatch[1].trim());
    const right = wrapBareJapaneseInBrackets(eqMatch[2].trim());
    return `- **${left}:** ${right}`;
  }

  return `- ${wrapBareJapaneseInBrackets(cleaned)}`;
}

/**
 * Infers a concise Indonesian micro-label for a standalone detail/nuance sentence.
 */
function inferSentenceLabel(sentence: string): string {
  const lower = sentence.toLowerCase();

  if (
    /^(?:tidak\s+(?:bisa|dapat|diikuti|dipakai|digunakan|boleh)|jangan|bukan\s+untuk|jarang|umumnya\s+tidak|biasanya\s+tidak|hindari)/.test(
      lower,
    ) ||
    /(?:tidak bisa diikuti|tidak boleh|dilarang|tidak dipakai untuk)/.test(lower)
  ) {
    return 'Batasan';
  }

  if (
    /(?:sopan|formal|resmi|santai|ragam|tulisan|lisan|percakapan|kasual|halus|kaku|sastra|berita|pidato)/.test(
      lower,
    )
  ) {
    return 'Nuansa & Ragam';
  }

  if (/^(?:kalimat setelahnya|bagian belakang|klausa belakang|predikat)/.test(lower)) {
    return 'Kalimat Setelahnya';
  }

  if (/^(?:subjek|pelaku|pembicara)/.test(lower)) {
    return 'Subjek & Sudut Pandang';
  }

  if (
    /^(?:bedanya|berbeda|dibanding|sama dengan|mirip dengan|kebalikan|lawan)/.test(
      lower,
    )
  ) {
    return 'Perbandingan';
  }

  if (/^「[^」]+」/.test(sentence.trim())) {
    return 'Pembeda Pola';
  }

  if (/^(?:contoh|misalnya|seperti)/.test(lower)) {
    return 'Penerapan';
  }

  if (/^(?:jika|kalau|apabila|saat|ketika|bila|untuk|dalam|di\s+)/.test(lower)) {
    return 'Aturan Pakai';
  }

  return 'Catatan Nuansa';
}

/**
 * Splits a prose paragraph into sentences while protecting abbreviations (dsb., dll., No.)
 * and text inside parentheses or `「...」`.
 */
function splitSentencesSafely(text: string): string[] {
  const sentences: string[] = [];
  let current = '';
  let parenDepth = 0;
  let jpBracketDepth = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(' || ch === '（') parenDepth += 1;
    else if (ch === ')' || ch === '）') parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === '「') jpBracketDepth += 1;
    else if (ch === '」') jpBracketDepth = Math.max(0, jpBracketDepth - 1);

    current += ch;

    if (
      parenDepth === 0 &&
      jpBracketDepth === 0 &&
      (ch === '.' || ch === '!' || ch === '?')
    ) {
      const next = text[i + 1] ?? '';
      const isEndOrSpace = next === '' || /\s/.test(next);
      const isAbbrev = /(?:dsb|dll|dst|dkk|no|dr|mr|mrs|ms|vs|hal|bab|hlm)\.$/i.test(
        current.trim(),
      );
      if (isEndOrSpace && !isAbbrev) {
        const trimmed = current.trim();
        if (trimmed) sentences.push(trimmed);
        current = '';
      }
    }
  }

  const tail = current.trim();
  if (tail) sentences.push(tail);
  return sentences;
}

/**
 * Reformat raw bunpou `note` / `explanation` text into a clean, scannable
 * 3-layer format with newline-separated bullets, bold labels, `「...」` Japanese
 * tokens, and ` → ` arrows.
 */
export function formatBunpouExplanation(rawText: string): string {
  if (!rawText) return '';

  const collapsed = rawText
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (!collapsed) return '';

  // Case 1: Already multi-line structured text
  if (collapsed.includes('\n')) {
    const lines = collapsed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return lines
      .map((line) =>
        /^[-•]\s+/.test(line)
          ? formatBulletLine(line)
          : wrapBareJapaneseInBrackets(normalizeArrows(line)),
      )
      .join('\n');
  }

  // Case 2: Wall-of-text containing inline ` - ` bullet items (e.g. N5 greetings/counters)
  const normalizedInlineBullets = collapsed.replace(
    /\s+-\s+(?=\*\*|「|[A-Z0-9]|[\u3040-\u30FF\u4E00-\u9FFF])/g,
    '\n- ',
  );
  if (
    normalizedInlineBullets.includes('\n- ') ||
    /^-\s+/.test(normalizedInlineBullets)
  ) {
    const rawLines = normalizedInlineBullets
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return rawLines
      .map((line, idx) => {
        if (/^[-•]\s+/.test(line)) {
          return formatBulletLine(line);
        }
        const cleanedIntro = normalizeArrows(line).replace(/:$/, '.');
        return idx === 0
          ? wrapBareJapaneseInBrackets(cleanedIntro)
          : formatBulletLine(cleanedIntro);
      })
      .join('\n');
  }

  // Case 3: Inline `Pemakaian A: ... Pemakaian B: ...` or `Pola A: ... Pola B: ...`
  const pemakaianSplit = collapsed.replace(
    /\s+(?=(?:Pemakaian|Penggunaan|Bentuk|Pola|Situasi|Makna|Arti)\s+[A-D1-4]\s*:)/g,
    '\n- ',
  );
  if (
    pemakaianSplit.includes('\n- ') ||
    /^(?:Pemakaian|Penggunaan|Bentuk|Pola|Situasi|Makna|Arti)\s+[A-D1-4]\s*:/.test(
      pemakaianSplit,
    )
  ) {
    const lines = pemakaianSplit
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return lines
      .map((line) => {
        if (
          /^[-•]\s+/.test(line) ||
          /^(?:Pemakaian|Penggunaan|Bentuk|Pola|Situasi|Makna|Arti)\s+[A-D1-4]\s*:/.test(
            line,
          )
        ) {
          return formatBulletLine(line);
        }
        return wrapBareJapaneseInBrackets(normalizeArrows(line));
      })
      .join('\n');
  }

  // Case 4: Multiple `「X」 = ...` comparison clauses (e.g. `「間」 = ... 「間に」 = ...`)
  const jpEqMatches = collapsed.match(/「[^」]+」\s*=/g);
  if (jpEqMatches && jpEqMatches.length >= 2) {
    const splitJpEq = collapsed.replace(/\s+(?=「[^」]+」\s*=)/g, '\n- ');
    const lines = splitJpEq
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return lines
      .map((line) =>
        /^[-•]\s+/.test(line) || /^「[^」]+」\s*=/.test(line)
          ? formatBulletLine(line)
          : wrapBareJapaneseInBrackets(normalizeArrows(line)),
      )
      .join('\n');
  }

  // Case 5: Semicolon-separated formula rules (`V-kamus + X = ...; V-ta + X = ...`)
  const sentences = splitSentencesSafely(collapsed);
  const firstSentence = sentences[0] ?? '';
  if (
    firstSentence.includes(';') &&
    (firstSentence.match(/=/g)?.length ?? 0) >= 2
  ) {
    const semiParts = firstSentence
      .split(';')
      .map((p) => p.trim().replace(/\.$/, ''))
      .filter(Boolean);
    const out: string[] = semiParts.map((part) => formatBulletLine(part));
    for (const extra of sentences.slice(1)) {
      const label = inferSentenceLabel(extra);
      out.push(
        `- **${label}:** ${wrapBareJapaneseInBrackets(normalizeArrows(extra))}`,
      );
    }
    return out.join('\n');
  }

  // Case 6: Standard prose (1 sentence stays concise intro; 2+ sentences become intro + scannable bullets)
  if (sentences.length <= 1) {
    // Check if single sentence has a semicolon separating two distinct nuances
    if (collapsed.includes(';')) {
      const parts = collapsed
        .split(';')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 2 && parts.every((p) => p.length >= 18)) {
        const intro = wrapBareJapaneseInBrackets(
          normalizeArrows(parts[0].replace(/\.?$/, '.')),
        );
        const bullets = parts.slice(1).map((p) => {
          const cap = p.charAt(0).toUpperCase() + p.slice(1);
          if (/^「[^」]+」/.test(cap) && /[:=]/.test(cap.slice(0, 32))) {
            return formatBulletLine(cap);
          }
          const label = inferSentenceLabel(cap);
          return `- **${label}:** ${wrapBareJapaneseInBrackets(normalizeArrows(cap))}`;
        });
        return [intro, ...bullets].join('\n');
      }
    }
    return wrapBareJapaneseInBrackets(normalizeArrows(collapsed));
  }

  // 2+ sentences -> Layer 1: 1-sentence intro; Layer 2/3: concise labeled bullet points
  const intro = wrapBareJapaneseInBrackets(normalizeArrows(sentences[0]));
  const usedLabels = new Map<string, number>();

  const bullets = sentences.slice(1).map((sentence) => {
    const normalized = normalizeArrows(sentence);
    // If sentence itself starts with `Label: ...` or `「X」 = ...`, format directly
    if (
      /^「[^」]+」\s*[:=]/.test(normalized) ||
      /^[A-Z][^:.]{2,30}:\s+/.test(normalized)
    ) {
      return formatBulletLine(normalized);
    }

    let label = inferSentenceLabel(normalized);
    const count = usedLabels.get(label) ?? 0;
    usedLabels.set(label, count + 1);
    if (count > 0) {
      // Avoid repeating identical labels back-to-back
      if (label === 'Catatan Nuansa') label = 'Detail Tambahan';
      else if (label === 'Batasan') label = 'Larangan Lain';
      else if (label === 'Aturan Pakai') label = 'Situasi Lain';
    }

    return `- **${label}:** ${wrapBareJapaneseInBrackets(normalized)}`;
  });

  return [intro, ...bullets].join('\n');
}
