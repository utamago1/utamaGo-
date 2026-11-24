import type { ReactNode } from 'react';

interface BunpouExplanationProps {
  text: string;
  className?: string;
}

/**
 * Auto-fallback normalizer: rescues legacy single-line wall-of-text notes that
 * still have inline ` - ` bullets glued into one paragraph.
 */
function normalizeLegacyInlineBullets(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/\s+-\s+(?=\*\*|「|[A-Z])/g, '\n- ')
    .trim();
}

/**
 * Renders inline tokens safely as React nodes (never uses dangerouslySetInnerHTML):
 * - `**teks**`       -> bold neutral-900 label (also parses nested `「JP」` & `→`)
 * - `「teks jepang」` -> warm stone inline badge for Japanese vocabulary/particles
 * - `->` or `→`      -> red arrow connector
 */
function renderInlineTokens(segment: string, keyPrefix: string): ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|「[^」]+」|->|→)/g;
  const parts = segment.split(tokenRegex);

  return parts
    .filter((part) => part.length > 0)
    .map((part, idx) => {
      const key = `${keyPrefix}-${idx}`;

      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        const inner = part.slice(2, -2);
        return (
          <strong key={key} className="font-semibold text-on-surface">
            {renderInlineTokens(inner, `${key}-b`)}
          </strong>
        );
      }

      if (part.startsWith('「') && part.endsWith('」') && part.length > 2) {
        const jpInner = part.slice(1, -1);
        return (
          <span
            key={key}
            className="mx-0.5 inline-block rounded border border-outline-variant bg-surface-container px-1.5 py-0.5 font-medium leading-snug text-on-surface"
          >
            {jpInner}
          </span>
        );
      }

      if (part === '->' || part === '→') {
        return (
          <span key={key} className="mx-0.5 font-semibold text-primary">
            →
          </span>
        );
      }

      return part;
    });
}

/**
 * Scannable renderer for "Penjelasan & Nuansa" / "Perbedaan Nuansa" across
 * all JLPT N5–N1 Bunpou screens.
 */
export function BunpouExplanation({ text, className }: BunpouExplanationProps) {
  const normalized = normalizeLegacyInlineBullets(text);
  if (!normalized) return null;

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  type Block =
    | { kind: 'paragraph'; text: string }
    | { kind: 'bullets'; items: string[] };

  const blocks: Block[] = [];
  for (const line of lines) {
    const bulletMatch = line.match(/^[-•]\s+(.+)$/);
    if (bulletMatch) {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === 'bullets') {
        last.items.push(bulletMatch[1].trim());
      } else {
        blocks.push({ kind: 'bullets', items: [bulletMatch[1].trim()] });
      }
    } else {
      blocks.push({ kind: 'paragraph', text: line });
    }
  }

  return (
    <div
      className={`space-y-2.5 text-sm leading-relaxed text-on-surface-variant ${className ?? ''}`.trim()}
    >
      {blocks.map((block, bIdx) => {
        if (block.kind === 'paragraph') {
          return (
            <p key={`p-${bIdx}`} className="leading-relaxed">
              {renderInlineTokens(block.text, `p-${bIdx}`)}
            </p>
          );
        }

        return (
          <ul key={`ul-${bIdx}`} className="space-y-2">
            {block.items.map((item, iIdx) => (
              <li
                key={`li-${bIdx}-${iIdx}`}
                className="flex items-start gap-2.5 leading-relaxed"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80"
                />
                <span className="min-w-0 flex-1">
                  {renderInlineTokens(item, `li-${bIdx}-${iIdx}`)}
                </span>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
