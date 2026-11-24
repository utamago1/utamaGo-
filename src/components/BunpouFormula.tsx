import { useMemo } from 'react';
import {
  parseBunpouFormulaRows,
  type FormattedFormulaRow,
} from '../utils/bunpouFormulaFormatter';

interface BunpouFormulaProps {
  formula: string;
  compact?: boolean;
  className?: string;
}

/**
 * Highlights the `+` connector and the trailing Japanese target grammar pattern
 * so students immediately see: [Kata yang disambung] + [Pola Bunpou].
 */
function renderFormulaExpression(expression: string) {
  const plusParts = expression.split(/\s+\+\s+/);
  if (plusParts.length <= 1) {
    return <span className="font-medium text-on-surface">{expression}</span>;
  }

  const lastIdx = plusParts.length - 1;
  return (
    <span className="inline">
      {plusParts.map((part, idx) => {
        const isTargetSuffix = idx === lastIdx;
        return (
          <span key={idx}>
            {idx > 0 && (
              <span
                className="mx-1.5 font-mono font-bold text-primary/80"
                aria-hidden="true"
              >
                +
              </span>
            )}
            <span
              className={
                isTargetSuffix
                  ? 'font-bold text-primary'
                  : 'font-medium text-on-surface'
              }
            >
              {part}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * Renders structured "Rumus Bunpou" rows with clear Indonesian labels,
 * separated multi-variant lines, and cleanly indented conjugation notes.
 */
export function BunpouFormula({
  formula,
  compact = false,
  className = '',
}: BunpouFormulaProps) {
  const rows = useMemo(() => parseBunpouFormulaRows(formula), [formula]);

  if (rows.length === 0) return null;

  const formulaCount = rows.filter((r) => r.kind === 'formula').length;
  const showNumbers = formulaCount > 1;
  let runningNum = 0;

  return (
    <div
      className={`rounded-xl border border-outline-variant bg-surface ${
        compact ? 'px-3 py-2.5 text-xs' : 'px-4 py-3 text-sm'
      } ${className}`}
    >
      <div className="divide-y divide-outline-variant/60">
        {rows.map((row: FormattedFormulaRow, idx: number) => {
          if (row.kind === 'heading') {
            return (
              <p
                key={idx}
                className="py-2 first:pt-0 last:pb-0 text-xs font-bold text-on-surface-variant"
              >
                {row.expression}
              </p>
            );
          }

          if (row.kind === 'note') {
            return (
              <p
                key={idx}
                className={`py-2 first:pt-0 last:pb-0 leading-relaxed text-on-surface-variant ${
                  compact ? 'text-[11px]' : 'text-xs'
                }`}
              >
                <span className="font-semibold text-on-surface">Catatan: </span>
                {row.expression}
              </p>
            );
          }

          runningNum += 1;
          return (
            <div
              key={idx}
              className="py-2.5 first:pt-0 last:pb-0 space-y-1 leading-relaxed"
            >
              <div className="flex items-baseline gap-2">
                {row.label ? (
                  <span className="shrink-0 font-semibold text-on-surface-variant">
                    {row.label}:
                  </span>
                ) : showNumbers ? (
                  <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-primary">
                    {runningNum}.
                  </span>
                ) : null}
                <div className="min-w-0 flex-1 break-words">
                  {renderFormulaExpression(row.expression)}
                </div>
              </div>

              {row.subNote && (
                <p
                  className={`leading-relaxed text-on-surface-variant ${
                    showNumbers || row.label ? 'pl-5' : ''
                  } ${compact ? 'text-[11px]' : 'text-xs'}`}
                >
                  {row.subNote}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
