import { splitReadingForRuby } from '../utils/ankiParser';

interface RubyReadingProps {
  readingTerm: string;
  className?: string;
  rtClassName?: string;
}

export function RubyReading({
  readingTerm,
  className = '',
  rtClassName = 'text-primary',
}: RubyReadingProps) {
  const segments = splitReadingForRuby(readingTerm);

  return (
    <span className={className}>
      {segments.map((seg, idx) =>
        seg.ruby ? (
          <ruby key={`${seg.base}-${idx}`} className="mx-[0.02em]">
            {seg.base}
            <rp>(</rp>
            <rt className={rtClassName}>{seg.ruby}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          <span key={`${seg.base}-${idx}`}>{seg.base}</span>
        ),
      )}
    </span>
  );
}
