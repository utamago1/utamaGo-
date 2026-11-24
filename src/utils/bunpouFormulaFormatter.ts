/**
 * Structured formatter for JLPT N5–N1 Bunpou grammatical formulas ("Rumus Bunpou").
 *
 * Converts raw textbook shorthand (N, Adj-na, Adj-i, V-kamus, 普通形, だ→ー, etc.)
 * and multi-line formula variants into clear, human-readable Indonesian rows.
 */

export interface FormattedFormulaRow {
  kind: 'formula' | 'note' | 'heading';
  /** Optional prefix label such as "A", "Perintah", "Larangan", "Dekat pembicara (こ)" */
  label?: string;
  /** Main readable formula expression */
  expression: string;
  /** Optional extracted conjugation rule or inline note shown cleanly underneath */
  subNote?: string;
}

/**
 * Preserves true line breaks between distinct formula variants while rejoining
 * soft-wrapped continuation lines (unclosed parentheses or lines starting with `+` / `/`).
 */
export function normalizeFormulaLines(lines: string[]): string {
  const cleaned = lines.map((line) => line.trim()).filter(Boolean);
  if (cleaned.length === 0) return '';

  const merged: string[] = [];

  for (const line of cleaned) {
    if (merged.length === 0) {
      merged.push(line);
      continue;
    }

    const prev = merged[merged.length - 1];
    const prevOpenParens = (prev.match(/\(/g) ?? []).length;
    const prevCloseParens = (prev.match(/\)/g) ?? []).length;
    const hasUnclosedParen = prevOpenParens > prevCloseParens;
    const isOperatorContinuation = /^[+/・,、]/.test(line);
    const prevEndsWithConnector = /[+/・,、]$/.test(prev);

    if (hasUnclosedParen || isOperatorContinuation || prevEndsWithConnector) {
      merged[merged.length - 1] = `${prev} ${line}`
        .replace(/\s{2,}/g, ' ')
        .trim();
    } else {
      merged.push(line);
    }
  }

  return merged.join('\n');
}

/**
 * Expands dense grammar abbreviations into clear, natural Indonesian terms.
 */
export function humanizeFormulaText(raw: string): string {
  let text = raw.replace(/\s{2,}/g, ' ').trim();
  if (!text) return '';

  // Normalize arrows first
  text = text.replace(/\s*(?:->|=>|＝>|→)\s*/g, ' → ');

  // Replace raw Japanese grammar meta-terms
  text = text
    .replace(/普通形/g, 'Bentuk biasa')
    .replace(/動・形/g, 'Kata Kerja / Kata Sifat');

  // Replace cryptic dash / deletion markers inside conjugation notes
  text = text
    .replace(/だ\s*→\s*ー\s*\/\s*である/g, 'tanpa だ / ~である')
    .replace(/だ\s*→\s*ー/g, 'tanpa だ')
    .replace(/ー\s*\+\s*ではある/g, 'tanpa だ + ではある')
    .replace(/\(~い除く\)/g, '(buang い)')
    .replace(/\(~な除く\)/g, '(buang な)');

  // Combined class patterns (must come before individual N / V / Adj)
  text = text
    .replace(/\bN・V・Adj\b/g, 'Kata Benda / Kata Kerja / Kata Sifat')
    .replace(/\bV・Adj\b/g, 'Kata Kerja / Kata Sifat')
    .replace(/\bAdj-na・N\b/g, 'Kata Sifat-na / Kata Benda')
    .replace(/\bAdj-i\b/g, 'Kata Sifat-i')
    .replace(/\bI-adj\b/g, 'Kata Sifat-i')
    .replace(/\bAdj-na\b/g, 'Kata Sifat-na')
    .replace(/\bAdj-nai\b/g, 'Kata Sifat negatif')
    .replace(/\bAdj\b/g, 'Kata Sifat');

  // Verb conjugation shorthands (most specific first)
  text = text
    .replace(/\bV-masu\s+stem\b/gi, 'Kata Kerja bentuk ます (tanpa ます)')
    .replace(/\bV-ます\b/g, 'Kata Kerja bentuk ます')
    .replace(/\bV-ません\b/g, 'Kata Kerja bentuk ません')
    .replace(/\bV-ました\b/g, 'Kata Kerja bentuk ました')
    .replace(/\bV-ませんでした\b/g, 'Kata Kerja bentuk ませんでした')
    .replace(/\bV-te\s+iru\b/gi, 'Kata Kerja bentuk ている')
    .replace(/\bV-te\s+ita\b/gi, 'Kata Kerja bentuk ていた')
    .replace(/\bV-te\s+aru\b/gi, 'Kata Kerja bentuk てある')
    .replace(/\bV-nai\s+de\b/gi, 'Kata Kerja bentuk ないで')
    .replace(/\bV-kamus\b/gi, 'Kata Kerja (bentuk kamus)')
    .replace(/\bV-tara\b/gi, 'Kata Kerja bentuk たら')
    .replace(/\bV-nakereba\b/gi, 'Kata Kerja bentuk なければ')
    .replace(/\bV-te\b/gi, 'Kata Kerja bentuk て')
    .replace(/\bV-ta\b/gi, 'Kata Kerja bentuk た')
    .replace(/\bV-nai\b/gi, 'Kata Kerja bentuk ない')
    .replace(/\bV-ba\b/gi, 'Kata Kerja bentuk ば')
    .replace(/\bV-volitional\b/gi, 'Kata Kerja bentuk ajakan (よう)')
    .replace(
      /\bV-saseru\s*\(bentuk kausatif\)/gi,
      'Kata Kerja bentuk kausatif (させる)',
    )
    .replace(/\bV-saseru\b/gi, 'Kata Kerja bentuk kausatif (させる)')
    .replace(
      /\bV-\(r\)areru\s*\(bentuk pasif\/hormat\)/gi,
      'Kata Kerja bentuk pasif/hormat (られる)',
    )
    .replace(/\bV-\(r\)areru\b/gi, 'Kata Kerja bentuk (ら)れる')
    .replace(/\bV-Pl\b/g, 'Kata Kerja (bentuk biasa)')
    .replace(/\bV\s+gol\.?\s*II・III\b/g, 'Kata Kerja Gol. 2 & 3')
    .replace(/\bV\s+gol\.?\s*I\b/g, 'Kata Kerja Gol. 1')
    .replace(/\bV-III\b/g, 'Kata Kerja Gol. 3')
    .replace(/\bV-II\b/g, 'Kata Kerja Gol. 2')
    .replace(/\bV-I\b/g, 'Kata Kerja Gol. 1');

  // Noun + particle shorthands
  text = text
    .replace(/\bN\s*\(-の\)/g, 'Kata Benda (+ の)')
    .replace(/\bN-の/g, 'Kata Benda + の')
    .replace(/\bN\s+の(?=\s|[+/・)]|$)/g, 'Kata Benda + の')
    .replace(/\bN1\b/g, 'Kata Benda 1')
    .replace(/\bN2\b/g, 'Kata Benda 2');

  // Standalone N and V tokens (avoiding N5/N4/N3/N2/N1 or letters inside words)
  text = text
    .replace(/(?<![A-Za-z0-9])N(?![A-Za-z0-9])/g, 'Kata Benda')
    .replace(/(?<![A-Za-z0-9])V(?![A-Za-z0-9])/g, 'Kata Kerja');

  // Clean up spacing around `+`, ` / `, and parentheses
  text = text
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Fix occasional double "+ +" or "Bentuk biasa (nonpast)" clarity
  text = text
    .replace(/\+\s*\+/g, '+')
    .replace(/\(nonpast\)/gi, '(bentuk sekarang / non-lampau)')
    .replace(/\bnonpast\b/gi, 'sekarang (non-lampau)');

  return text;
}

/**
 * Extracts a long parenthetical conjugation note sitting right before `+` so the
 * core formula stays scannable at a glance.
 *
 * Example:
 *   "Bentuk biasa (Kata Sifat-na だ → な / ~である, Kata Benda だ → の / ~である) + ためだ・ため(に)"
 * ->
 *   expression: "Bentuk biasa + ためだ・ため(に)"
 *   subNote:    "Aturan bentuk: Kata Sifat-na だ → な / ~である, Kata Benda だ → の / ~である"
 */
function extractInlineConjugationNote(line: string): {
  expression: string;
  subNote?: string;
} {
  // Look for a detailed parenthetical containing grammar conjugation markers
  // (e.g. `Kata Sifat-na`, `Kata Benda`, `だ →`, `dihilangkan`, `tanpa だ`, `pengecualian`)
  const parenRe = /\(([^()]{14,})\)/g;
  const extractedNotes: string[] = [];

  const cleanedExpression = line.replace(parenRe, (fullMatch, inner: string) => {
    const looksLikeConjugationRule =
      /(?:Kata Sifat|Kata Benda|Kata Kerja Gol|だ\s*→|tanpa だ|dihilangkan|pengecualian|bila menerangkan|bentuk sekarang|hanya bentuk|memakai kata kerja|bahasa lisan)/i.test(
        inner,
      );
    // Do NOT strip if the parenthetical IS the entire left side before `+` (e.g. Kata tanya (...) + か)
    if (!looksLikeConjugationRule) {
      return fullMatch;
    }
    extractedNotes.push(inner.trim());
    return '';
  });

  if (extractedNotes.length === 0) {
    return { expression: line };
  }

  const normalizedExpr = cleanedExpression
    .replace(/\s+\+/g, ' +')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!normalizedExpr || normalizedExpr.startsWith('+')) {
    // Safety guard: never leave a broken formula
    return { expression: line };
  }

  const combinedNote = extractedNotes
    .map((n) => n.replace(/\s*;\s*/g, ' · '))
    .join(' · ');

  return {
    expression: normalizedExpr,
    subNote: `Aturan bentuk: ${combinedNote}`,
  };
}

/**
 * Splits a formula string (newline-separated or legacy single-line) into structured rows
 * for rendering in `BunpouFormula`.
 */
export function parseBunpouFormulaRows(rawFormula: string): FormattedFormulaRow[] {
  if (!rawFormula || !rawFormula.trim()) return [];

  // Split by real newlines first; also safely break legacy space-joined `A) ... B) ...`
  // or legacy space-joined `... + X Bentuk biasa (...) + X`
  const preSplitLines = rawFormula
    .replace(/\r\n?/g, '\n')
    .replace(/\s+(?=[B-D]\)\s+)/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: FormattedFormulaRow[] = [];

  for (const rawLine of preSplitLines) {
    // Case 1: Section sub-heading inside formula (e.g. "Kata kerja khusus:")
    if (/^[A-Za-z][^+:→=]{2,36}:$/.test(rawLine)) {
      rows.push({
        kind: 'heading',
        expression: rawLine.replace(/:$/, '').trim(),
      });
      continue;
    }

    // Case 2: Standalone asterisk or parenthetical note line
    if (
      /^\*\s*/.test(rawLine) ||
      (/^\(.+\)$/.test(rawLine) && !rawLine.includes('+')) ||
      /^\((?:pengecualian|bila|Adj-na|N\s*:|untuk|catatan)/i.test(rawLine)
    ) {
      const stripped = rawLine
        .replace(/^\*\s*/, '')
        .replace(/^\((.+)\)$/, '$1')
        .trim();
      const humanized = humanizeFormulaText(stripped).replace(/\s*;\s*/g, ' · ');
      // Attach directly to previous formula row as subNote if it looks like a conjugation detail
      const prevRow = rows[rows.length - 1];
      if (
        prevRow &&
        prevRow.kind === 'formula' &&
        !prevRow.subNote &&
        /^(?:Kata Sifat|Kata Benda|Pengecualian|pengecualian)/i.test(humanized)
      ) {
        prevRow.subNote = /^pengecualian/i.test(humanized)
          ? humanized.charAt(0).toUpperCase() + humanized.slice(1)
          : `Aturan bentuk: ${humanized}`;
      } else {
        rows.push({
          kind: 'note',
          expression: humanized.charAt(0).toUpperCase() + humanized.slice(1),
        });
      }
      continue;
    }

    // Case 3: Labelled prefix like `A) ...`, `B) ...`, `Perintah: ...`, `Larangan: ...`
    let label: string | undefined;
    let body = rawLine;

    const letterPrefix = body.match(/^([A-D])\)\s+(.+)$/);
    if (letterPrefix) {
      label = `Pola ${letterPrefix[1]}`;
      body = letterPrefix[2].trim();
    } else {
      const colonPrefix = body.match(
        /^(Perintah|Larangan|Bentuk negatif|Negatif Adj|Dekat pembicara \(こ\)|Dekat pendengar \(そ\)|Jauh dari keduanya \(あ\)|Tanya \(ど\)|Sopan|Kasual|Lisan|Tulisan)\s*:\s*(.+)$/i,
      );
      if (colonPrefix) {
        label = colonPrefix[1].trim();
        body = colonPrefix[2].trim();
      }
    }

    const humanized = humanizeFormulaText(body);
    const { expression, subNote } = extractInlineConjugationNote(humanized);

    rows.push({
      kind: 'formula',
      label,
      expression,
      subNote,
    });
  }

  return rows;
}

/**
 * Produces a clean single-line Indonesian summary of a formula for compact card previews.
 */
export function formatBunpouFormulaInline(rawFormula: string): string {
  const rows = parseBunpouFormulaRows(rawFormula);
  const formulas = rows.filter((r) => r.kind === 'formula');
  if (formulas.length === 0) return humanizeFormulaText(rawFormula);
  return formulas.map((r) => r.expression).join('  ·  ');
}
