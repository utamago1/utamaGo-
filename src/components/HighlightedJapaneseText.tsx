import { useEffect, useMemo, useRef, useState } from 'react';
import { Repeat, Square, Volume2 } from 'lucide-react';
import { vibrateTap } from '../utils/haptics';
import { highlightJapaneseSentence } from '../utils/japaneseHighlight';
import {
  isJapaneseSpeechSupported,
  speakJapanese,
  startShadowingSequence,
  stopJapaneseSpeech,
  type ShadowingStage,
} from '../utils/japaneseSpeech';

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
  const [shadowStage, setShadowStage] = useState<ShadowingStage>('idle');
  const [repeatLeft, setRepeatLeft] = useState(0);
  const shadowRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      shadowRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    shadowRef.current?.stop();
    shadowRef.current = null;
    setShadowStage('idle');
    setSpeaking(false);
  }, [sentence]);

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
  const isShadowing = shadowStage !== 'idle';

  const handleSpeak = () => {
    vibrateTap();
    if (isShadowing) {
      shadowRef.current?.stop();
      shadowRef.current = null;
      setShadowStage('idle');
    }
    if (speaking) {
      stopJapaneseSpeech();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    const ok = speakJapanese(sentence, {
      onEnd: () => setSpeaking(false),
    });
    if (!ok) {
      setSpeaking(false);
    }
  };

  const handleShadow = () => {
    vibrateTap();
    if (speaking) {
      stopJapaneseSpeech();
      setSpeaking(false);
    }
    if (isShadowing) {
      shadowRef.current?.stop();
      shadowRef.current = null;
      setShadowStage('idle');
      return;
    }
    shadowRef.current = startShadowingSequence(sentence, {
      onStageChange: (stage, sec) => {
        setShadowStage(stage);
        if (typeof sec === 'number') setRepeatLeft(sec);
      },
      onComplete: () => {
        shadowRef.current = null;
      },
    });
  };

  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <span className="inline-flex items-start gap-2">
        <span className="flex-1">
          {prefix ? (
            <span className="mr-1 font-mono text-xs opacity-70">{prefix}</span>
          ) : null}
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
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleSpeak}
              aria-label={
                speaking
                  ? 'Hentikan pengucapan kalimat'
                  : 'Dengarkan pengucapan kalimat Jepang'
              }
              title={speaking ? 'Hentikan' : 'Dengarkan pengucapan'}
              className={`m3-tactile inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                speaking
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-primary'
              }`}
            >
              {speaking ? (
                <Square className="h-3 w-3 fill-current" aria-hidden="true" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={handleShadow}
              aria-pressed={isShadowing}
              aria-label={
                isShadowing
                  ? 'Hentikan shadowing kalimat'
                  : 'Latihan shadowing kalimat (pelan → ucapkan → normal)'
              }
              title="Shadowing (pelan → tiru → normal)"
              className={`m3-tactile inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-bold transition-colors ${
                isShadowing
                  ? 'border-primary bg-primary-container text-on-primary-container'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-primary'
              }`}
            >
              <Repeat
                className={`h-3 w-3 ${isShadowing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {isShadowing && (
                <span className="font-mono tabular-nums">
                  {shadowStage === 'slow'
                    ? 'Pelan'
                    : shadowStage === 'repeat'
                      ? `${repeatLeft}d`
                      : 'Normal'}
                </span>
              )}
            </button>
          </span>
        )}
      </span>
      {isShadowing && (
        <span className="text-[11px] font-medium text-primary">
          {shadowStage === 'slow' && 'Shadowing 1/3 · Dengarkan versi pelan...'}
          {shadowStage === 'repeat' &&
            `Shadowing 2/3 · Ucapkan ulang lantang (${repeatLeft}d)...`}
          {shadowStage === 'normal' && 'Shadowing 3/3 · Versi kecepatan normal...'}
        </span>
      )}
    </span>
  );
}
