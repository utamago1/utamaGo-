import { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  Repeat,
  SlidersHorizontal,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { vibrateTap } from '../utils/haptics';
import {
  formatSpeechRateLabel,
  formatSpeechStyleLabel,
  isDeviceSpeechSynthesisSupported,
  isJapaneseSpeechSupported,
  listJapaneseVoices,
  loadSpeechPreferences,
  saveSpeechPreferences,
  speakJapanese,
  SPEECH_RATE_PRESETS,
  startShadowingSequence,
  stopJapaneseSpeech,
  subscribeSpeechPreferences,
  type JapaneseVoiceOption,
  type ShadowingStage,
  type SpeechPreferences,
  type SpeechVoiceStyle,
} from '../utils/japaneseSpeech';

interface SpeechControlBarProps {
  text: string;
  compact?: boolean;
  showShadowing?: boolean;
  showQuickSettings?: boolean;
  showAutoPlayToggle?: boolean;
  className?: string;
  onWriteKanji?: () => void;
  writeKanjiLabel?: string;
}

const STYLE_OPTIONS: ReadonlyArray<{ id: SpeechVoiceStyle; label: string }> = [
  { id: 'auto', label: 'Otomatis' },
  { id: 'female', label: 'Cewek' },
  { id: 'male', label: 'Cowok' },
];

export function SpeechControlBar({
  text,
  compact = false,
  showShadowing = true,
  showQuickSettings = true,
  showAutoPlayToggle = false,
  className = '',
  onWriteKanji,
  writeKanjiLabel = 'Latih Tulis',
}: SpeechControlBarProps) {
  const [prefs, setPrefs] = useState<SpeechPreferences>(() =>
    loadSpeechPreferences(),
  );
  const [speaking, setSpeaking] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [shadowStage, setShadowStage] = useState<ShadowingStage>('idle');
  const [repeatLeft, setRepeatLeft] = useState<number>(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [voices, setVoices] = useState<JapaneseVoiceOption[]>(() =>
    listJapaneseVoices(),
  );

  const shadowHandleRef = useRef<{ stop: () => void } | null>(null);
  const supported = isJapaneseSpeechSupported();

  useEffect(() => {
    const unsub = subscribeSpeechPreferences(setPrefs);
    return unsub;
  }, []);

  useEffect(() => {
    if (!isDeviceSpeechSynthesisSupported()) return;
    const syncVoices = () => setVoices(listJapaneseVoices());
    syncVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', syncVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', syncVoices);
    };
  }, []);

  useEffect(() => {
    return () => {
      shadowHandleRef.current?.stop();
    };
  }, []);

  // Stop active playback when target text changes
  useEffect(() => {
    shadowHandleRef.current?.stop();
    shadowHandleRef.current = null;
    setShadowStage('idle');
    setSpeaking(false);
    setLoadingAudio(false);
  }, [text]);

  if (!supported || !text.trim()) return null;

  const isShadowing = shadowStage !== 'idle';

  const handleToggleSpeak = () => {
    vibrateTap();
    if (isShadowing) {
      shadowHandleRef.current?.stop();
      shadowHandleRef.current = null;
      setShadowStage('idle');
    }
    if (speaking || loadingAudio) {
      stopJapaneseSpeech();
      setSpeaking(false);
      setLoadingAudio(false);
      return;
    }
    setSpeaking(true);
    const ok = speakJapanese(text, {
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

  const handleToggleShadowing = () => {
    vibrateTap();
    if (speaking) {
      stopJapaneseSpeech();
      setSpeaking(false);
    }
    if (isShadowing) {
      shadowHandleRef.current?.stop();
      shadowHandleRef.current = null;
      setShadowStage('idle');
      return;
    }
    shadowHandleRef.current = startShadowingSequence(text, {
      onStageChange: (stage, secLeft) => {
        setShadowStage(stage);
        if (typeof secLeft === 'number') {
          setRepeatLeft(secLeft);
        }
      },
      onComplete: () => {
        shadowHandleRef.current = null;
      },
    });
  };

  const shadowLabel =
    shadowStage === 'slow'
      ? 'Pelan...'
      : shadowStage === 'repeat'
        ? `Ucapkan (${repeatLeft}d)`
        : shadowStage === 'normal'
          ? 'Normal...'
          : 'Shadowing';

  const btnHeight = compact ? 'min-h-[38px] px-2.5 py-1.5' : 'min-h-[44px] px-3 py-2';

  return (
    <div className={`relative space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        <button
          type="button"
          onClick={handleToggleSpeak}
          aria-label={speaking ? 'Hentikan suara' : 'Dengarkan pelafalan Jepang'}
          className={`m3-tactile inline-flex ${btnHeight} items-center gap-1.5 whitespace-nowrap rounded-xl border text-xs font-bold transition-colors ${
            speaking
              ? 'border-primary bg-primary text-on-primary'
              : 'border-outline-variant bg-surface-container text-on-surface hover:border-outline hover:text-primary'
          }`}
        >
          {loadingAudio ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : speaking ? (
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>
            {loadingAudio ? 'Memuat...' : speaking ? 'Berhenti' : 'Dengar'}
          </span>
        </button>

        {showShadowing && (
          <button
            type="button"
            onClick={handleToggleShadowing}
            aria-pressed={isShadowing}
            aria-label={
              isShadowing
                ? 'Hentikan mode shadowing'
                : 'Mulai latihan shadowing: dengar pelan, ucapkan ulang, lalu normal'
            }
            className={`m3-tactile inline-flex ${btnHeight} items-center gap-1.5 whitespace-nowrap rounded-xl border text-xs font-bold transition-colors ${
              isShadowing
                ? 'border-primary bg-primary-container text-on-primary-container'
                : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-on-surface'
            }`}
          >
            <Repeat
              className={`h-3.5 w-3.5 ${isShadowing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span className="font-mono tabular-nums">{shadowLabel}</span>
          </button>
        )}

        {showQuickSettings && (
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              setPopoverOpen((prev) => !prev);
            }}
            aria-expanded={popoverOpen}
            aria-label="Atur kecepatan dan gaya suara Jepang"
            className={`m3-tactile inline-flex ${btnHeight} items-center gap-1.5 whitespace-nowrap rounded-xl border text-xs font-semibold transition-colors ${
              popoverOpen
                ? 'border-primary bg-surface text-primary'
                : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-on-surface'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-mono tabular-nums">
              {formatSpeechRateLabel(prefs.rate)} ·{' '}
              {formatSpeechStyleLabel(prefs.voiceStyle)}
            </span>
          </button>
        )}

        {onWriteKanji && (
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onWriteKanji();
            }}
            className={`m3-tactile inline-flex ${btnHeight} items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface-variant hover:border-outline hover:text-primary`}
          >
            <span>{writeKanjiLabel}</span>
          </button>
        )}
      </div>

      {isShadowing && (
        <p className="text-center text-[11px] font-medium text-primary sm:text-left">
          {shadowStage === 'slow' &&
            'Tahap 1/3 · Dengarkan pelafalan pelan dengan saksama...'}
          {shadowStage === 'repeat' &&
            `Tahap 2/3 · Sekarang giliranmu ucapkan lantang (${repeatLeft} detik)...`}
          {shadowStage === 'normal' &&
            `Tahap 3/3 · Bandingkan dengan kecepatan normal (${formatSpeechRateLabel(prefs.rate)})...`}
        </p>
      )}

      {popoverOpen && (
        <div
          role="region"
          aria-label="Kontrol cepat suara Jepang"
          className="space-y-3 rounded-2xl border border-outline-variant bg-surface p-3.5 text-left shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-on-surface">
              Pengaturan Cepat Suara Jepang
            </p>
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                setPopoverOpen(false);
              }}
              aria-label="Tutup kontrol suara"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
              <span className="font-semibold">Kecepatan Bicara</span>
              <span className="font-mono font-bold tabular-nums text-primary">
                {formatSpeechRateLabel(prefs.rate)}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {SPEECH_RATE_PRESETS.map((rateOpt) => {
                const active = Math.abs(prefs.rate - rateOpt) < 0.03;
                return (
                  <button
                    key={rateOpt}
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      saveSpeechPreferences({ rate: rateOpt });
                    }}
                    className={`min-h-[38px] rounded-lg border font-mono text-[11px] font-bold tabular-nums transition-colors ${
                      active
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-on-surface'
                    }`}
                  >
                    {formatSpeechRateLabel(rateOpt)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-on-surface-variant">
              Gaya Suara
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {STYLE_OPTIONS.map((opt) => {
                const active = prefs.voiceStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      saveSpeechPreferences({
                        voiceStyle: opt.id,
                        voiceURI: '',
                      });
                    }}
                    className={`min-h-[40px] rounded-lg border px-2 text-xs font-bold transition-colors ${
                      active
                        ? 'border-primary bg-primary-container text-on-primary-container'
                        : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-on-surface'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {voices.length > 1 && (
            <div className="space-y-1.5">
              <label
                htmlFor="quick-jp-voice-select"
                className="block text-[11px] font-semibold text-on-surface-variant"
              >
                Suara Perangkat ({voices.length} tersedia)
              </label>
              <select
                id="quick-jp-voice-select"
                value={prefs.voiceURI}
                onChange={(e) => {
                  saveSpeechPreferences({ voiceURI: e.target.value });
                }}
                className="min-h-[40px] w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 text-xs font-medium text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="">
                  Suara Server Natural ({formatSpeechStyleLabel(prefs.voiceStyle)})
                </option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang}
                    {v.detectedGender !== 'unknown'
                      ? ` · ${v.detectedGender === 'female' ? 'Cewek' : 'Cowok'}`
                      : ''}
                    )
                  </option>
                ))}
              </select>
            </div>
          )}

          {showAutoPlayToggle && (
            <label className="flex min-h-[40px] cursor-pointer items-center justify-between gap-3 border-t border-outline-variant pt-2.5 text-xs">
              <span className="font-semibold text-on-surface">
                Putar otomatis saat kartu Anki muncul
              </span>
              <input
                type="checkbox"
                checked={prefs.autoPlayAnki}
                onChange={(e) => {
                  vibrateTap();
                  saveSpeechPreferences({ autoPlayAnki: e.target.checked });
                }}
                className="h-4 w-4 accent-primary"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
