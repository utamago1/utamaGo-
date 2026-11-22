import { useEffect, useRef, useState } from 'react';
import {
  Headphones,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { vibrateTap } from '../utils/haptics';
import { formatAudioTime } from '../utils/tryOutPacket';

interface ChoukaiAudioPlayerProps {
  src: string;
  fileName: string;
  title?: string;
  album?: string;
  preload?: 'metadata' | 'auto';
  initialTime?: number;
  initialPlaybackRate?: number;
  onAudioStateChange?: (state: {
    currentTime: number;
    playbackRate: number;
  }) => void;
}

const SPEED_OPTIONS = [0.9, 1, 1.1, 1.25] as const;

export function ChoukaiAudioPlayer({
  src,
  fileName,
  title = 'Audio Choukai JLPT',
  album = 'Try Out JLPT — Choukai',
  preload = 'auto',
  initialTime = 0,
  initialPlaybackRate = 1,
  onAudioStateChange,
}: ChoukaiAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevSrcRef = useRef<string>(src);
  const initialTimeRef = useRef<number>(initialTime);
  const initialPlaybackRateRef = useRef<number>(initialPlaybackRate);
  const restoredPositionRef = useRef(false);
  const lastSavedSecRef = useRef(Math.floor(initialTime));

  initialTimeRef.current = initialTime;
  initialPlaybackRateRef.current = initialPlaybackRate;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(initialPlaybackRate);
  const [hasError, setHasError] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const pendingAutoPlayRef = useRef(false);

  const isDriveStream = src.includes('/api/audio/drive/') || src.startsWith('http');
  const effectiveSrc =
    reloadNonce > 0
      ? `${src}${src.includes('?') ? '&' : '?'}r=${reloadNonce}`
      : src;

  // Trigger non-blocking server-side cache warm-up so playback & seeking become instant
  useEffect(() => {
    const match = src.match(/\/api\/audio\/drive\/([^/?#]+)/);
    if (!match?.[1]) return;
    void fetch(`/api/audio/prefetch/${encodeURIComponent(match[1])}`, {
      method: 'GET',
      cache: 'no-store',
    }).catch(() => {});
  }, [src]);

  // Reset player state ONLY when the audio track source itself changes
  useEffect(() => {
    if (prevSrcRef.current === src) {
      return;
    }
    prevSrcRef.current = src;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    const nextInitialTime = initialTimeRef.current;
    const nextInitialRate = initialPlaybackRateRef.current;
    restoredPositionRef.current = false;
    pendingAutoPlayRef.current = false;
    lastSavedSecRef.current = Math.floor(nextInitialTime);
    setIsPlaying(false);
    setIsLoading(true);
    setDuration(0);
    setHasError(false);
    setReloadNonce(0);
    setCurrentTime(nextInitialTime);
    setPlaybackRate(nextInitialRate);
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Register native MediaSession controls for Android lockscreen / shade playback
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    const ms = navigator.mediaSession;
    try {
      if (typeof window !== 'undefined' && 'MediaMetadata' in window) {
        ms.metadata = new window.MediaMetadata({
          title,
          artist: 'UtamaGo! JLPT',
          album,
        });
      }
      ms.setActionHandler('play', () => {
        void audioRef.current?.play().catch(() => {});
      });
      ms.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });
      ms.setActionHandler('seekbackward', (details) => {
        const audio = audioRef.current;
        if (!audio) return;
        const offset = details.seekOffset ?? 15;
        audio.currentTime = Math.max(0, audio.currentTime - offset);
      });
      ms.setActionHandler('seekforward', (details) => {
        const audio = audioRef.current;
        if (!audio) return;
        const offset = details.seekOffset ?? 15;
        const maxDur = audio.duration || Number.MAX_SAFE_INTEGER;
        audio.currentTime = Math.min(maxDur, audio.currentTime + offset);
      });
    } catch {
      // Ignore MediaSession registration errors in restricted WebViews
    }
    return () => {
      try {
        ms.setActionHandler('play', null);
        ms.setActionHandler('pause', null);
        ms.setActionHandler('seekbackward', null);
        ms.setActionHandler('seekforward', null);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [album, title]);

  const emitAudioState = (nextTime: number, nextRate: number) => {
    onAudioStateChange?.({
      currentTime: Math.max(0, Math.floor(nextTime)),
      playbackRate: nextRate,
    });
  };

  const triggerFreshReload = (autoPlayAfterReload: boolean) => {
    pendingAutoPlayRef.current = autoPlayAfterReload;
    setHasError(false);
    setIsLoading(true);
    setReloadNonce((n) => n + 1);
  };

  const togglePlay = async () => {
    vibrateTap();
    const audio = audioRef.current;
    if (!audio) return;

    if (hasError || audio.error) {
      triggerFreshReload(true);
      return;
    }

    if (audio.paused) {
      try {
        if (audio.readyState === 0) {
          setIsLoading(true);
          audio.load();
        }
        audio.playbackRate = playbackRate;
        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
        setHasError(false);
      } catch (err) {
        const name = (err as { name?: string })?.name ?? '';
        if (name === 'AbortError') {
          return;
        }
        setIsPlaying(false);
        if (reloadNonce === 0) {
          triggerFreshReload(true);
        } else {
          setIsLoading(false);
          setHasError(true);
        }
      }
    } else {
      pendingAutoPlayRef.current = false;
      audio.pause();
      setIsPlaying(false);
      emitAudioState(audio.currentTime || currentTime, playbackRate);
    }
  };

  const handleSeek = (nextTime: number) => {
    vibrateTap();
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(duration || 0, nextTime));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
    lastSavedSecRef.current = Math.floor(clamped);
    emitAudioState(clamped, playbackRate);
  };

  const handleCycleSpeed = () => {
    vibrateTap();
    const audio = audioRef.current;
    const currentIdx = SPEED_OPTIONS.indexOf(
      playbackRate as (typeof SPEED_OPTIONS)[number],
    );
    const nextSpeed = SPEED_OPTIONS[(currentIdx + 1) % SPEED_OPTIONS.length];
    setPlaybackRate(nextSpeed);
    if (audio) {
      audio.playbackRate = nextSpeed;
    }
    emitAudioState(currentTime, nextSpeed);
  };

  const statusText = isPlaying
    ? 'Sedang diputar · Tetap berjalan saat memilih jawaban'
    : isLoading
      ? 'Menyiapkan audio Choukai...'
      : isDriveStream
        ? 'Streaming Audio Resmi · Posisi & kecepatan tersimpan otomatis'
        : 'Audio Terstruktur (Mondai 1–5) · Posisi & kecepatan tersimpan';

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        isPlaying
          ? 'border-primary/40 bg-surface-container shadow-xs'
          : 'border-transparent bg-surface-container'
      }`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <audio
        key={effectiveSrc}
        ref={audioRef}
        src={effectiveSrc}
        preload={preload}
        playsInline
        controlsList="nodownload noplaybackrate"
        aria-label={title}
        onLoadStart={() => {
          setHasError(false);
          setIsLoading(true);
        }}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          const loadedDuration = Number.isFinite(el.duration) ? el.duration : 0;
          setDuration(loadedDuration);
          setHasError(false);
          setIsLoading(false);
          el.playbackRate = playbackRate;
          const savedStart = initialTimeRef.current;
          if (
            !restoredPositionRef.current &&
            savedStart > 0 &&
            loadedDuration > 0 &&
            savedStart < loadedDuration - 1
          ) {
            el.currentTime = savedStart;
            setCurrentTime(savedStart);
            restoredPositionRef.current = true;
          }
        }}
        onLoadedData={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onCanPlay={(e) => {
          setIsLoading(false);
          setHasError(false);
          if (pendingAutoPlayRef.current) {
            pendingAutoPlayRef.current = false;
            const el = e.currentTarget;
            el.playbackRate = playbackRate;
            void el.play().catch(() => {
              setIsPlaying(false);
            });
          }
        }}
        onCanPlayThrough={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onWaiting={() => {
          if (isPlaying) {
            setIsLoading(true);
          }
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setIsLoading(false);
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime || 0;
          setCurrentTime(t);
          const floored = Math.floor(t);
          if (Math.abs(floored - lastSavedSecRef.current) >= 2) {
            lastSavedSecRef.current = floored;
            emitAudioState(floored, playbackRate);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={(e) => {
          setIsPlaying(false);
          emitAudioState(e.currentTarget.currentTime || 0, playbackRate);
        }}
        onEnded={() => {
          setIsPlaying(false);
          emitAudioState(0, playbackRate);
        }}
        onError={() => {
          setHasError(true);
          setIsPlaying(false);
          setIsLoading(false);
        }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
              isPlaying
                ? 'bg-primary text-on-primary'
                : 'bg-primary-container text-on-primary-container'
            }`}
          >
            {isPlaying ? (
              <span
                className="flex h-4 items-end gap-[2.5px]"
                aria-hidden="true"
              >
                <span className="utamago-wave-bar h-2 w-[3px] rounded-full bg-current" />
                <span className="utamago-wave-bar-delay-1 h-4 w-[3px] rounded-full bg-current" />
                <span className="utamago-wave-bar-delay-2 h-2.5 w-[3px] rounded-full bg-current" />
              </span>
            ) : isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Headphones className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-on-surface">
              {title}
            </p>
            <p className="text-[11px] font-medium text-on-surface-variant">
              {statusText}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCycleSpeed}
          aria-label={`Ubah kecepatan audio, saat ini ${playbackRate} kali`}
          className="m3-tactile min-h-[48px] shrink-0 whitespace-nowrap rounded-xl border border-outline bg-surface-container-low px-3 py-2 font-mono text-xs font-bold tabular-nums text-on-surface hover:bg-surface-container-high"
        >
          {playbackRate.toFixed(2).replace(/\.00$/, '.0')}x
        </button>
      </div>

      {hasError ? (
        <div className="mt-3 space-y-2.5 rounded-xl bg-primary-container p-3 text-xs font-medium text-on-primary-container">
          <p>
            {isDriveStream
              ? `Audio streaming (${fileName}) terputus sementara. Tekan Muat Ulang untuk menyambung ulang.`
              : `Audio (${fileName}) gagal dimuat di perangkat ini. Silakan coba muat ulang.`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                triggerFreshReload(true);
              }}
              className="m3-tactile inline-flex min-h-[48px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-on-primary hover:bg-primary-hover"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <span className="w-11 shrink-0 font-mono text-[11px] font-semibold tabular-nums text-on-surface-variant">
              {formatAudioTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration > 0 ? Math.floor(duration) : 100}
              value={duration > 0 ? Math.floor(currentTime) : 0}
              disabled={duration <= 0}
              onChange={(e) => handleSeek(Number(e.target.value))}
              aria-label="Posisi pemutaran audio Choukai"
              className="h-2.5 w-full cursor-pointer accent-red-600 disabled:cursor-not-allowed"
            />
            <span className="w-11 shrink-0 text-right font-mono text-[11px] font-semibold tabular-nums text-on-surface-variant">
              {formatAudioTime(duration)}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSeek(currentTime - 15)}
                aria-label="Mundur 15 detik"
                className="m3-tactile inline-flex min-h-[48px] items-center gap-1 whitespace-nowrap rounded-xl border border-outline bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>-15d</span>
              </button>

              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Jeda audio Choukai' : 'Putar audio Choukai'}
                className="m3-tactile inline-flex min-h-[48px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary-hover"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span>Jeda</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span>Putar Audio</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSeek(currentTime + 15)}
                aria-label="Maju 15 detik"
                className="m3-tactile inline-flex min-h-[48px] items-center gap-1 whitespace-nowrap rounded-xl border border-outline bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                <span>+15d</span>
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
