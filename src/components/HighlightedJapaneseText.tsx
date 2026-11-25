import { useEffect, useMemo, useState } from 'react';
import { Loader2, Square, Volume2 } from 'lucide-react';
import { vibrateTap } from '../utils/haptics';
import { highlightJapaneseSentence } from '../utils/japaneseHighlight';
import {
  isJapaneseSpeechSupported,
  speakJapanese,
  stopJapaneseSpeech,
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
  const [loadingAudio, setLoadingAudio] = useState(false);

  useEffect(() => {
    setSpeaking(false);
    setLoadingAudio(false);
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

  const handleSpeak = () => {
    vibrateTap();
    if (speaking || loadingAudio) {
      stopJapaneseSpeech();
      setSpeaking(false);
      setLoadingAudio(false);
      return;
    }
    setSpeaking(true);
    const ok = speakJapanese(sentence, {
      onLoadingChange: (loading) => setLoadingAudio(loading),
      onEnd: () => {
        setSpeaking(false);
        setLoadingAudio(false);
      },
    });
    if (!ok) {
      setSpeaking(false);
      setLoadingAudio(false);
    }
  };

  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <span className="inline-flex items-start gap-2">
        {prefix ? (
          <span className="mt-[3px] shrink-0 font-mono text-xs tabular-nums opacity-70">
            {prefix}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
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
                speaking || loadingAudio
                  ? 'Hentikan pengucapan kalimat'
                  : 'Dengarkan pengucapan kalimat Jepang'
              }
              title={
                loadingAudio
                  ? 'Memuat audio...'
                  : speaking
                    ? 'Hentikan'
                    : 'Dengarkan pengucapan'
              }
              className={`m3-tactile inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                speaking || loadingAudio
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-primary'
              }`}
            >
              {loadingAudio ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : speaking ? (
                <Square className="h-3 w-3 fill-current" aria-hidden="true" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </span>
        )}
      </span>
    </span>
  );
}
