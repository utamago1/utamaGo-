import { useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { vibrateTap } from '../utils/haptics';
import { highlightJapaneseSentence } from '../utils/japaneseHighlight';
import { isJapaneseSpeechSupported, speakJapanese } from '../utils/japaneseSpeech';

interface HighlightedJapaneseTextProps {
  sentence: string;
  target: string;
  readingTerm?: string;
  kind: 'vocab' | 'bunpou';
  className?: string;
  showSpeakButton?: boolean;
  prefix?: string;
}

export function HighlightedJapaneseText({
  sentence,
  target,
  readingTerm,
  kind,
  className = '',
  showSpeakButton = false,
  prefix,
}: HighlightedJapaneseTextProps) {
  const [speaking, setSpeaking] = useState(false);

  const segments = useMemo(
    () =>
      highlightJapaneseSentence(sentence, {
        target,
        readingTerm,
        kind,
      }),
    [sentence, target, readingTerm, kind],
  );

  const canSpeak = showSpeakButton && isJapaneseSpeechSupported();

  const handleSpeak = () => {
    vibrateTap();
    setSpeaking(true);
    const ok = speakJapanese(sentence, {
      onEnd: () => setSpeaking(false),
    });
    if (!ok) {
      setSpeaking(false);
    }
  };

  return (
    <span className={`inline-flex items-start gap-2 ${className}`}>
      <span className="flex-1">
        {prefix ? <span className="mr-1 font-mono text-xs opacity-70">{prefix}</span> : null}
        {segments.map((seg, idx) =>
          seg.highlighted ? (
            <mark
              key={idx}
              className="mx-[1px] rounded-md border-b-2 border-primary bg-primary-container/90 px-1 py-0.5 font-extrabold text-on-primary-container"
            >
              {seg.text}
            </mark>
          ) : (
            <span key={idx}>{seg.text}</span>
          ),
        )}
      </span>
      {canSpeak && (
        <button
          type="button"
          onClick={handleSpeak}
          aria-label="Dengarkan pengucapan kalimat Jepang"
          title="Dengarkan pengucapan"
          className={`m3-tactile mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            speaking
              ? 'border-primary bg-primary text-on-primary'
              : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-primary'
          }`}
        >
          <Volume2
            className={`h-3.5 w-3.5 ${speaking ? 'animate-pulse' : ''}`}
            aria-hidden="true"
          />
        </button>
      )}
    </span>
  );
}
