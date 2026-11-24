import { useEffect, useState } from 'react';
import {
  Loader2,
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
  stopJapaneseSpeech,
  subscribeSpeechPreferences,
  type JapaneseVoiceOption,
  type SpeechPreferences,
  type SpeechVoiceStyle,
} from '../utils/japaneseSpeech';

interface SpeechControlBarProps {
  text: string;
  compact?: boolean;
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
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [voices, setVoices] = useState<JapaneseVoiceOption[]>(() =>
    listJapaneseVoices(),
  );

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

  // Stop active playback when target text changes
  useEffect(() => {
    setSpeaking(false);
    setLoadingAudio(false);
  }, [text]);

  if (!supported || !text.trim()) return null;

  const handleToggleSpeak = () => {
    vibrateTap();
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
                      stopJapaneseSpeech();
                      setSpeaking(false);
                      setLoadingAudio(false);
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
