import { useCallback, useEffect, useRef, useState } from 'react';
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

type StreamMode = 'native' | 'mse' | 'blob' | 'drive-embed';

const SPEED_OPTIONS = [0.9, 1, 1.1, 1.25] as const;
const MSE_CHUNK_BYTES = 256 * 1024; // 256 KB (~16s of 128kbps MP3) per frame-aligned JSON chunk
const BLOB_CHUNK_BYTES = 512 * 1024; // 512 KB per JSON chunk for universal Blob fallback
const MSE_BUFFER_AHEAD_SECONDS = 65;
const MSE_EVICT_BEHIND_SECONDS = 30;

function extractDriveFileId(src: string): string | null {
  const match = src.match(/\/api\/audio\/drive\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function buildDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

function supportsMpegMse(fileName: string): boolean {
  if (fileName.toLowerCase().endsWith('.m4a')) return false;
  if (typeof window === 'undefined' || typeof window.MediaSource === 'undefined') {
    return false;
  }
  try {
    return window.MediaSource.isTypeSupported('audio/mpeg');
  } catch {
    return false;
  }
}

function decodeBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = window.atob(base64);
  const len = binary.length;
  const buffer = new ArrayBuffer(len);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface JsonAudioChunkResponse {
  eof: boolean;
  totalBytes: number;
  start: number;
  nextStart: number;
  byteLength?: number;
  mimeType: string;
  data: string;
}

async function fetchAudioJsonChunk(
  driveFileId: string,
  start: number,
  length: number,
  alignMp3: boolean,
  signal: AbortSignal,
): Promise<JsonAudioChunkResponse> {
  const url = `/api/audio/json-chunk/${encodeURIComponent(driveFileId)}?start=${start}&length=${length}&align=${alignMp3 ? '1' : '0'}`;
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    signal,
  });
  const contentType = res.headers.get('content-type') ?? '';
  if (!res.ok || !contentType.includes('application/json')) {
    throw new Error(`Invalid audio chunk response (${res.status} ${contentType})`);
  }
  const payload = (await res.json()) as Partial<JsonAudioChunkResponse>;
  if (typeof payload.eof !== 'boolean' || typeof payload.data !== 'string') {
    throw new Error('Malformed audio chunk JSON payload');
  }
  return {
    eof: payload.eof,
    totalBytes: Number(payload.totalBytes) || 0,
    start: Number(payload.start) || start,
    nextStart: Number(payload.nextStart) || start,
    byteLength: Number(payload.byteLength) || 0,
    mimeType: payload.mimeType || 'audio/mpeg',
    data: payload.data,
  };
}

interface MseController {
  seekTo: (targetSeconds: number) => void;
  ensureBuffered: () => void;
  destroy: () => void;
}

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
  const mseCtrlRef = useRef<MseController | null>(null);
  const prevSrcRef = useRef<string>(src);
  const initialTimeRef = useRef<number>(initialTime);
  const initialPlaybackRateRef = useRef<number>(initialPlaybackRate);
  const restoredPositionRef = useRef(false);
  const lastSavedSecRef = useRef(Math.floor(initialTime));
  const pendingAutoPlayRef = useRef(false);
  const nativeRetryCountRef = useRef(0);

  initialTimeRef.current = initialTime;
  initialPlaybackRateRef.current = initialPlaybackRate;

  const driveFileId = extractDriveFileId(src);
  const isDriveStream = Boolean(driveFileId) || src.startsWith('http');

  const [streamMode, setStreamMode] = useState<StreamMode>('native');
  const [mseObjectUrl, setMseObjectUrl] = useState<string | null>(null);
  const [blobObjectUrl, setBlobObjectUrl] = useState<string | null>(null);
  const [blobProgressPct, setBlobProgressPct] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(initialPlaybackRate);
  const [hasError, setHasError] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const effectiveSrc =
    streamMode === 'drive-embed'
      ? ''
      : streamMode === 'mse'
        ? (mseObjectUrl ?? '')
        : streamMode === 'blob'
          ? (blobObjectUrl ?? '')
          : reloadNonce > 0
            ? `${src}${src.includes('?') ? '&' : '?'}r=${reloadNonce}`
            : src;

  const emitAudioState = useCallback(
    (nextTime: number, nextRate: number) => {
      onAudioStateChange?.({
        currentTime: Math.max(0, Math.floor(nextTime)),
        playbackRate: nextRate,
      });
    },
    [onAudioStateChange],
  );

  const escalatePlaybackMode = useCallback(
    (autoPlayAfterSwitch: boolean) => {
      pendingAutoPlayRef.current = autoPlayAfterSwitch;
      if (streamMode === 'native') {
        if (nativeRetryCountRef.current < 1) {
          nativeRetryCountRef.current += 1;
          setHasError(false);
          setIsLoading(true);
          setIsPlaying(false);
          setReloadNonce((n) => n + 1);
          return;
        }
        if (driveFileId && supportsMpegMse(fileName)) {
          setHasError(false);
          setIsLoading(true);
          setIsPlaying(false);
          setStreamMode('mse');
          return;
        }
        if (driveFileId) {
          setHasError(false);
          setIsLoading(true);
          setIsPlaying(false);
          setStreamMode('blob');
          return;
        }
      } else if (streamMode === 'mse' && driveFileId) {
        setHasError(false);
        setIsLoading(true);
        setIsPlaying(false);
        setStreamMode('blob');
        return;
      } else if (streamMode === 'blob' && driveFileId) {
        // Final guaranteed fallback: official Google Drive player at proper un-cropped height
        // (essential when hosted on static-only hosting or behind strict proxy cookie walls)
        setHasError(false);
        setIsLoading(false);
        setIsPlaying(false);
        setStreamMode('drive-embed');
        return;
      }

      setHasError(true);
      setIsPlaying(false);
      setIsLoading(false);
    },
    [driveFileId, fileName, streamMode],
  );

  // Trigger non-blocking server-side cache warm-up so playback & seeking become instant
  useEffect(() => {
    if (!driveFileId) return;
    void fetch(`/api/audio/prefetch/${encodeURIComponent(driveFileId)}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }).catch(() => {});
  }, [driveFileId]);

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
    mseCtrlRef.current?.destroy();
    mseCtrlRef.current = null;

    const nextInitialTime = initialTimeRef.current;
    const nextInitialRate = initialPlaybackRateRef.current;
    restoredPositionRef.current = false;
    pendingAutoPlayRef.current = false;
    nativeRetryCountRef.current = 0;
    lastSavedSecRef.current = Math.floor(nextInitialTime);
    setStreamMode('native');
    setMseObjectUrl(null);
    setBlobObjectUrl(null);
    setBlobProgressPct(0);
    setIsPlaying(false);
    setIsLoading(true);
    setDuration(0);
    setHasError(false);
    setReloadNonce(0);
    setCurrentTime(nextInitialTime);
    setPlaybackRate(nextInitialRate);
  }, [src]);

  // Layer 2: MP3-frame-aligned JSON-chunked MediaSource streaming (same sleek UtamaGo! UI)
  useEffect(() => {
    if (streamMode !== 'mse' || !driveFileId || !supportsMpegMse(fileName)) {
      return;
    }

    let cancelled = false;
    let currentAbort: AbortController | null = null;
    const mediaSource = new window.MediaSource();
    const objectUrl = URL.createObjectURL(mediaSource);
    setMseObjectUrl(objectUrl);
    setIsLoading(true);
    setHasError(false);

    let sourceBuffer: SourceBuffer | null = null;
    let totalBytes = 0;
    let nextByteOffset = 0;
    let bytesPerSecond = 16000;
    let estimatedDuration = 0;
    let isFetching = false;
    let eofReached = false;
    let pendingSeekTarget: number | null = null;

    const waitForUpdateEnd = (sb: SourceBuffer) =>
      new Promise<void>((resolve) => {
        if (!sb.updating) {
          resolve();
          return;
        }
        const onEnd = () => {
          sb.removeEventListener('updateend', onEnd);
          resolve();
        };
        sb.addEventListener('updateend', onEnd);
      });

    const getBufferedAhead = (): number => {
      const audio = audioRef.current;
      if (!audio || !sourceBuffer) return 0;
      const t = audio.currentTime || 0;
      const ranges = sourceBuffer.buffered;
      for (let i = 0; i < ranges.length; i += 1) {
        if (t >= ranges.start(i) - 0.5 && t <= ranges.end(i) + 0.5) {
          return Math.max(0, ranges.end(i) - t);
        }
      }
      return 0;
    };

    const isTimeBuffered = (targetSec: number): boolean => {
      if (!sourceBuffer) return false;
      const ranges = sourceBuffer.buffered;
      for (let i = 0; i < ranges.length; i += 1) {
        if (targetSec >= ranges.start(i) && targetSec <= ranges.end(i) - 0.25) {
          return true;
        }
      }
      return false;
    };

    const evictOldBuffer = async (keepFromSec: number) => {
      if (!sourceBuffer || cancelled || mediaSource.readyState !== 'open') return;
      await waitForUpdateEnd(sourceBuffer);
      if (cancelled || mediaSource.readyState !== 'open') return;
      if (sourceBuffer.buffered.length === 0) return;
      const start = sourceBuffer.buffered.start(0);
      if (keepFromSec > start + 5) {
        try {
          sourceBuffer.remove(start, keepFromSec);
          await waitForUpdateEnd(sourceBuffer);
        } catch {
          // Ignore range eviction errors
        }
      }
    };

    const fetchAndAppendChunk = async (
      startByte: number,
      isFirstAfterSeek = false,
      seekSec = 0,
    ): Promise<boolean> => {
      if (cancelled || !sourceBuffer || mediaSource.readyState !== 'open') {
        return false;
      }

      currentAbort?.abort();
      const abort = new AbortController();
      currentAbort = abort;

      const chunk = await fetchAudioJsonChunk(
        driveFileId,
        startByte,
        MSE_CHUNK_BYTES,
        true,
        abort.signal,
      );

      if (cancelled || mediaSource.readyState !== 'open') return false;

      if (chunk.totalBytes > 0) {
        totalBytes = chunk.totalBytes;
      }

      if (chunk.eof || !chunk.data) {
        eofReached = true;
        if (mediaSource.readyState === 'open' && !sourceBuffer.updating) {
          try {
            mediaSource.endOfStream();
          } catch {
            // Ignore endOfStream race
          }
        }
        return false;
      }

      const bytes = decodeBase64ToUint8Array(chunk.data);
      if (bytes.byteLength === 0) {
        eofReached = true;
        return false;
      }

      await waitForUpdateEnd(sourceBuffer);
      if (cancelled || mediaSource.readyState !== 'open') return false;

      if (isFirstAfterSeek) {
        try {
          if (sourceBuffer.buffered.length > 0) {
            const bStart = sourceBuffer.buffered.start(0);
            const bEnd = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
            if (bEnd > bStart) {
              sourceBuffer.remove(bStart, bEnd);
              await waitForUpdateEnd(sourceBuffer);
            }
          }
          sourceBuffer.timestampOffset = seekSec;
        } catch {
          // Ignore seek reset errors
        }
      }

      const appendWithQuotaRetry = async () => {
        if (!sourceBuffer || cancelled || mediaSource.readyState !== 'open') return;
        try {
          sourceBuffer.appendBuffer(bytes);
          await waitForUpdateEnd(sourceBuffer);
        } catch (err) {
          if ((err as { name?: string })?.name === 'QuotaExceededError') {
            const cur = audioRef.current?.currentTime ?? 0;
            await evictOldBuffer(Math.max(0, cur - 10));
            if (!cancelled && mediaSource.readyState === 'open') {
              sourceBuffer.appendBuffer(bytes);
              await waitForUpdateEnd(sourceBuffer);
            }
          } else {
            throw err;
          }
        }
      };

      await appendWithQuotaRetry();
      if (cancelled) return false;

      nextByteOffset =
        chunk.nextStart > startByte
          ? chunk.nextStart
          : startByte + bytes.byteLength;

      if (
        startByte === 0 &&
        totalBytes > 0 &&
        sourceBuffer.buffered.length > 0
      ) {
        const decodedSec = sourceBuffer.buffered.end(0);
        if (decodedSec > 1) {
          bytesPerSecond = bytes.byteLength / decodedSec;
          estimatedDuration = totalBytes / bytesPerSecond;
          setDuration(estimatedDuration);
          try {
            if (mediaSource.readyState === 'open' && !sourceBuffer.updating) {
              mediaSource.duration = estimatedDuration;
            }
          } catch {
            // Ignore duration update error on strict mobile browsers
          }
        }
      } else if (estimatedDuration > 0) {
        setDuration(estimatedDuration);
      }

      if (totalBytes > 0 && nextByteOffset >= totalBytes) {
        eofReached = true;
        if (mediaSource.readyState === 'open' && !sourceBuffer.updating) {
          try {
            mediaSource.endOfStream();
          } catch {
            // Ignore endOfStream race
          }
        }
      }

      return true;
    };

    const pumpBuffer = async () => {
      if (cancelled || isFetching || !sourceBuffer || mediaSource.readyState !== 'open') {
        return;
      }
      isFetching = true;
      try {
        while (!cancelled && mediaSource.readyState === 'open') {
          if (pendingSeekTarget !== null) {
            const targetSec = pendingSeekTarget;
            pendingSeekTarget = null;
            eofReached = false;
            const targetByte =
              totalBytes > 0
                ? Math.max(
                    0,
                    Math.min(
                      Math.max(0, totalBytes - 16384),
                      Math.floor(targetSec * bytesPerSecond),
                    ),
                  )
                : 0;
            await fetchAndAppendChunk(targetByte, true, targetSec);
            if (!cancelled && audioRef.current) {
              audioRef.current.currentTime = targetSec;
              setCurrentTime(targetSec);
            }
            continue;
          }

          if (eofReached) break;

          const curTime = audioRef.current?.currentTime ?? 0;
          if (curTime > MSE_EVICT_BEHIND_SECONDS + 15) {
            await evictOldBuffer(curTime - MSE_EVICT_BEHIND_SECONDS);
          }

          if (nextByteOffset > 0 && getBufferedAhead() >= MSE_BUFFER_AHEAD_SECONDS) {
            break;
          }

          const appended = await fetchAndAppendChunk(nextByteOffset);
          if (!appended) break;

          if (nextByteOffset <= MSE_CHUNK_BYTES + 4096) {
            setIsLoading(false);
            if (pendingAutoPlayRef.current && audioRef.current) {
              pendingAutoPlayRef.current = false;
              audioRef.current.playbackRate = playbackRate;
              void audioRef.current.play().catch(() => {
                setIsPlaying(false);
              });
            }
          }
        }
      } catch (err) {
        if (cancelled || (err as { name?: string })?.name === 'AbortError') {
          return;
        }
        setIsPlaying(false);
        setStreamMode('blob');
      } finally {
        isFetching = false;
        if (!cancelled && pendingSeekTarget !== null) {
          void pumpBuffer();
        }
      }
    };

    const onSourceOpen = () => {
      if (cancelled || mediaSource.readyState !== 'open') return;
      try {
        sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      } catch {
        setStreamMode('blob');
        return;
      }
      try {
        if (sourceBuffer.mode !== 'sequence') {
          sourceBuffer.mode = 'sequence';
        }
      } catch {
        // Safe to ignore on browsers enforcing sequence mode
      }
      void pumpBuffer();
    };

    mediaSource.addEventListener('sourceopen', onSourceOpen);

    mseCtrlRef.current = {
      seekTo: (targetSeconds: number) => {
        if (cancelled) return;
        const clamped = Math.max(
          0,
          Math.min(estimatedDuration || duration || targetSeconds, targetSeconds),
        );
        if (isTimeBuffered(clamped) && audioRef.current) {
          audioRef.current.currentTime = clamped;
          setCurrentTime(clamped);
          void pumpBuffer();
          return;
        }
        pendingSeekTarget = clamped;
        currentAbort?.abort();
        setIsLoading(true);
        void pumpBuffer();
      },
      ensureBuffered: () => {
        if (!cancelled) {
          void pumpBuffer();
        }
      },
      destroy: () => {
        cancelled = true;
        currentAbort?.abort();
        mediaSource.removeEventListener('sourceopen', onSourceOpen);
        try {
          if (mediaSource.readyState === 'open') {
            mediaSource.endOfStream();
          }
        } catch {
          // Ignore cleanup errors
        }
        URL.revokeObjectURL(objectUrl);
      },
    };

    return () => {
      mseCtrlRef.current?.destroy();
      mseCtrlRef.current = null;
    };
  }, [driveFileId, fileName, streamMode]);

  // Layer 3: Universal JSON-chunked Blob loader (for .m4a N1 files or browsers without MPEG MSE)
  useEffect(() => {
    if (streamMode !== 'blob' || !driveFileId) {
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;
    const abort = new AbortController();
    setIsLoading(true);
    setHasError(false);
    setBlobProgressPct(0);

    const loadFullBlob = async () => {
      try {
        const firstChunk = await fetchAudioJsonChunk(
          driveFileId,
          0,
          BLOB_CHUNK_BYTES,
          false,
          abort.signal,
        );
        if (cancelled) return;
        if (firstChunk.eof || !firstChunk.data) {
          throw new Error('Empty audio payload');
        }

        const total = firstChunk.totalBytes;
        const mimeType =
          firstChunk.mimeType ||
          (fileName.toLowerCase().endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg');
        const firstBytes = decodeBase64ToUint8Array(firstChunk.data);

        const offsets: number[] = [];
        let cursor = firstChunk.nextStart || firstBytes.byteLength;
        while (total > 0 && cursor < total) {
          offsets.push(cursor);
          cursor += BLOB_CHUNK_BYTES;
        }

        const parts: Uint8Array[] = new Array(offsets.length + 1);
        parts[0] = firstBytes;
        let receivedBytes = firstBytes.byteLength;
        if (total > 0) {
          setBlobProgressPct(Math.min(99, Math.round((receivedBytes / total) * 100)));
        }

        // Fetch remaining chunks with 3x concurrency for rapid mobile loading
        let nextIdx = 0;
        const worker = async () => {
          while (!cancelled && nextIdx < offsets.length) {
            const idx = nextIdx;
            nextIdx += 1;
            const chunk = await fetchAudioJsonChunk(
              driveFileId,
              offsets[idx],
              BLOB_CHUNK_BYTES,
              false,
              abort.signal,
            );
            if (cancelled) return;
            const decoded = chunk.data
              ? decodeBase64ToUint8Array(chunk.data)
              : new Uint8Array(0);
            parts[idx + 1] = decoded;
            receivedBytes += decoded.byteLength;
            if (total > 0) {
              setBlobProgressPct(
                Math.min(99, Math.round((receivedBytes / total) * 100)),
              );
            }
          }
        };

        const workerCount = Math.min(3, Math.max(1, offsets.length));
        await Promise.all(Array.from({ length: workerCount }, () => worker()));

        if (cancelled) return;
        const blob = new Blob(parts.filter(Boolean) as BlobPart[], {
          type: mimeType,
        });
        createdUrl = URL.createObjectURL(blob);
        setBlobProgressPct(100);
        setBlobObjectUrl(createdUrl);
        setHasError(false);
      } catch (err) {
        if (cancelled || (err as { name?: string })?.name === 'AbortError') {
          return;
        }
        // Failover cleanly to Layer 4 official Drive player so user is NEVER blocked
        setHasError(false);
        setIsLoading(false);
        setIsPlaying(false);
        setStreamMode('drive-embed');
      }
    };

    void loadFullBlob();

    return () => {
      cancelled = true;
      abort.abort();
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [driveFileId, fileName, streamMode]);

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
        const target = Math.max(0, audio.currentTime - offset);
        if (streamMode === 'mse' && mseCtrlRef.current) {
          mseCtrlRef.current.seekTo(target);
        } else {
          audio.currentTime = target;
        }
      });
      ms.setActionHandler('seekforward', (details) => {
        const audio = audioRef.current;
        if (!audio) return;
        const offset = details.seekOffset ?? 15;
        const maxDur = duration || audio.duration || Number.MAX_SAFE_INTEGER;
        const target = Math.min(maxDur, audio.currentTime + offset);
        if (streamMode === 'mse' && mseCtrlRef.current) {
          mseCtrlRef.current.seekTo(target);
        } else {
          audio.currentTime = target;
        }
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
  }, [album, duration, streamMode, title]);

  const triggerFreshReload = (autoPlayAfterReload: boolean) => {
    pendingAutoPlayRef.current = autoPlayAfterReload;
    nativeRetryCountRef.current = 0;
    setHasError(false);
    setIsLoading(true);
    setBlobProgressPct(0);
    setStreamMode('native');
    setReloadNonce((n) => n + 1);
  };

  const togglePlay = async () => {
    vibrateTap();
    const audio = audioRef.current;
    if (!audio) {
      pendingAutoPlayRef.current = true;
      return;
    }

    if (hasError || audio.error) {
      escalatePlaybackMode(true);
      return;
    }

    if (audio.paused) {
      try {
        if (streamMode === 'mse') {
          mseCtrlRef.current?.ensureBuffered();
        } else if (audio.readyState === 0) {
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
        escalatePlaybackMode(true);
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
    const maxDuration =
      duration > 0
        ? duration
        : Number.isFinite(audio.duration)
          ? audio.duration
          : 0;
    const clamped = Math.max(0, Math.min(maxDuration, nextTime));
    if (streamMode === 'mse' && mseCtrlRef.current) {
      mseCtrlRef.current.seekTo(clamped);
    } else {
      audio.currentTime = clamped;
    }
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

  const statusText =
    streamMode === 'drive-embed'
      ? 'Pemutar Audio Resmi · Tekan tombol Putar di bawah'
      : isPlaying
        ? 'Sedang diputar · Tetap berjalan saat memilih jawaban'
        : streamMode === 'blob' &&
            isLoading &&
            blobProgressPct > 0 &&
            blobProgressPct < 100
          ? `Menyiapkan audio Choukai (${blobProgressPct}%)...`
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
      {effectiveSrc && (
        <audio
          key={`${streamMode}-${effectiveSrc}`}
          ref={audioRef}
          src={effectiveSrc}
          preload={streamMode === 'native' ? preload : 'auto'}
          playsInline
          controlsList="nodownload noplaybackrate"
          aria-label={title}
          onLoadStart={() => {
            setHasError(false);
            setIsLoading(true);
          }}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            const loadedDuration =
              Number.isFinite(el.duration) && el.duration > 0
                ? el.duration
                : duration;
            if (loadedDuration > 0) {
              setDuration(loadedDuration);
            }
            setHasError(false);
            setIsLoading(false);
            el.playbackRate = playbackRate;
            const savedStart = initialTimeRef.current;
            if (
              streamMode !== 'mse' &&
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
            if (streamMode === 'mse') {
              mseCtrlRef.current?.ensureBuffered();
            }
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
            if (streamMode === 'mse') {
              mseCtrlRef.current?.ensureBuffered();
            }
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
            escalatePlaybackMode(pendingAutoPlayRef.current);
          }}
        />
      )}

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

        {streamMode !== 'drive-embed' && (
          <button
            type="button"
            onClick={handleCycleSpeed}
            aria-label={`Ubah kecepatan audio, saat ini ${playbackRate} kali`}
            className="m3-tactile min-h-[48px] shrink-0 whitespace-nowrap rounded-xl border border-outline bg-surface-container-low px-3 py-2 font-mono text-xs font-bold tabular-nums text-on-surface hover:bg-surface-container-high"
          >
            {playbackRate.toFixed(2).replace(/\.00$/, '.0')}x
          </button>
        )}
      </div>

      {streamMode === 'drive-embed' && driveFileId ? (
        <div className="mt-3.5 space-y-2.5">
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-xs">
            <iframe
              src={buildDrivePreviewUrl(driveFileId)}
              title={title}
              allow="autoplay; encrypted-media"
              className="block h-[180px] w-full border-0"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
            <span>Audio tetap diputar langsung di halaman ini.</span>
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                triggerFreshReload(false);
              }}
              className="m3-tactile inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Coba Pemutar Utama</span>
            </button>
          </div>
        </div>
      ) : hasError ? (
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
