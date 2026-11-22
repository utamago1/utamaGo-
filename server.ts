import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';

dotenv.config();

interface DriveAudioAssetMeta {
  mimeType: string;
  fileName: string;
}

// Allowlisted official JLPT Choukai audio files hosted on Google Drive
const ALLOWED_DRIVE_AUDIO: Record<string, DriveAudioAssetMeta> = {
  // JLPT N2 (2010.07 - 2018.12)
  '1BijZlQrAGGx08Uuo0x49xLTQ63pzWE10': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2010_07_Choukai.mp3',
  },
  '1UEsUFDoJdGY8oX4eQfWqByaRb78Mm2ee': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2010_12_Choukai.mp3',
  },
  '17mCy0CaTGTS8s9mvfSFyJNfSP3doSPDP': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2011_07_Choukai.mp3',
  },
  '1kn8VnS_zvXdmpHWqww1YiU9bOFkdjc92': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2011_12_Choukai.mp3',
  },
  '1Le-Gd5r0g90jBXBVlVyF5m3BXwtQKDvC': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2012_07_Choukai.mp3',
  },
  '1BHvKVgeVPC-BNM_wuXiocYcmhZHFlK40': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2012_12_Choukai.mp3',
  },
  '1ao2afARgAExKJ-J9fMGqKvF3TFkPKw5H': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2013_07_Choukai.mp3',
  },
  '1Kv-yRdC2_4nU3n40gXtj8kLLa-5U6pOz': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2013_12_Choukai.mp3',
  },
  '1lL625WsBGMnjUeCO_B0sYPsx6VggRsZ_': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2014_07_Choukai.mp3',
  },
  '1qmLFyWy8ViferPZGmp0JpYH8NnLesgmR': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2014_12_Choukai.mp3',
  },
  '1yiA_Mq1TNapFgVB-myFrdXSNZWhUJUY_': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2015_07_Choukai.mp3',
  },
  '1bK2Xf2-6fFzO_9zdxWihJndiDbtWrLo2': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2015_12_Choukai.mp3',
  },
  '11iDebYEputE9JC_S7F9Tm_qSH6w14ky7': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2016_07_Choukai.mp3',
  },
  '1M9hANkTMe_HQDG2a0T6ebkHEE5D5dJgg': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2016_12_Choukai.mp3',
  },
  '1YjRhfuuUyx-Ri0zkZfPhoh51G7_Lhi7u': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2017_07_Choukai.mp3',
  },
  '14pIase7lYswPr4juFyJXOUZq6FwsHI-T': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2017_12_Choukai.mp3',
  },
  '1R1KCOqFFSw4nLfTQZAYzUSv7YiH6wIFH': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2018_07_Choukai.mp3',
  },
  '17qRZ8B8RXHo-tDhs9-O3vR3gYEs3Q4fH': {
    mimeType: 'audio/mpeg',
    fileName: 'JLPT_N2_2018_12_Choukai.mp3',
  },
  // JLPT N1 (2010.07 - 2018.12)
  '1C-e2n7BKlxMzYCp1NqfkxAfmOiqiz3z-': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2010_07_Choukai.m4a',
  },
  '1SFmPy5MFYFLDqrhRcgYKSTvTpHbwZQej': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2010_12_Choukai.m4a',
  },
  '12MDcEEtE0DyglEBKRR2gvPR-wG_w_U1k': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2011_07_Choukai.m4a',
  },
  '14PARWoCCw9wZZSlPjaviuceE8QpdQNxz': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2011_12_Choukai.m4a',
  },
  '1IOFbCAWLZnLn7D-PtJNJuzWCISmwkbGT': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2012_07_Choukai.m4a',
  },
  '1rXWQg1jHfSrTffLcidq8mZh-dy40v2QS': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2012_12_Choukai.m4a',
  },
  '1pLHBXNmF_jcwTAbs1BSni-62O0Cts4Xg': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2013_07_Choukai.m4a',
  },
  '1X-P496yHiBixcAcqbXMnIVt9J2LWDqwJ': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2013_12_Choukai.m4a',
  },
  '1oa-KDlxobIVa5XCq-rgLcpPcdkquAWvi': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2014_07_Choukai.m4a',
  },
  '1Kp7cijguVaf-HuyGdZ539mY0OBTEBodI': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2014_12_Choukai.m4a',
  },
  '1jSFlXwkH8t2sTiTCCc2Oe9nKq3UXmwPU': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2015_07_Choukai.m4a',
  },
  '14gz-OC_aYPH6iPVAScoFNM8f-68HzBKB': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2015_12_Choukai.m4a',
  },
  '1TYo9GSUq5ONE98dYzrvaY13ljqGwbQCt': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2016_07_Choukai.m4a',
  },
  '1_W0yIUn0CLx6ppNJIhRLnp9CmwEIa4Tj': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2016_12_Choukai.m4a',
  },
  '1xAVxWamYNm0dLfreSYaYc5ggpWiQkKkI': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2017_07_Choukai.m4a',
  },
  '1UEjGjKW532lioJYH_s4v1O-DUu6pb5q1': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2017_12_Choukai.m4a',
  },
  '1j4qkXniIaurqjB6AiKV_Y89_NcEuiKYV': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2018_07_Choukai.m4a',
  },
  '19jDX4zRZCr1u4MVkM_eNJLrjekdQsKWB': {
    mimeType: 'audio/mp4',
    fileName: 'JLPT_N1_2018_12_Choukai.m4a',
  },
};

function buildDriveDownloadUrl(fileId: string): string {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
}

// Local disk cache for Choukai MP3/M4A files so play, pause, and -15s/+15s seeking
// respond in <5ms instead of repeating multi-second Google Drive round-trips.
const AUDIO_CACHE_DIR = path.join(os.tmpdir(), 'utamago-audio-cache');
const AUDIO_CACHE_MAX_BYTES = 180 * 1024 * 1024; // Keep cache <= 180 MB (safe for Cloud Run tmpfs)
// Cap every HTTP 206 chunk to 1 MB so 40-48 MB Choukai MP3s stay 32x below Cloud Run's response cap.
const MAX_RANGE_CHUNK_BYTES = 1024 * 1024;
const PREWARM_DRIVE_AUDIO_IDS = ['1BijZlQrAGGx08Uuo0x49xLTQ63pzWE10']; // JLPT N2 Paket 1 (2010.07)

interface ActiveAudioDownload {
  fileId: string;
  tmpPath: string;
  finalPath: string;
  totalBytes: number | null;
  downloadedBytes: number;
  promise: Promise<void>;
}

const activeAudioDownloads = new Map<string, ActiveAudioDownload>();
const resolvedDriveUrlCache = new Map<
  string,
  { url: string; expiresAt: number }
>();

function ensureAudioCacheDir() {
  try {
    fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
  } catch {
    // Ignore directory creation race
  }
}

function getAudioCachePath(fileId: string): string {
  const safeId = fileId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(AUDIO_CACHE_DIR, `${safeId}.audio`);
}

function pruneAudioCacheIfNeeded(keepFilePath?: string) {
  try {
    ensureAudioCacheDir();
    const entries = fs
      .readdirSync(AUDIO_CACHE_DIR)
      .filter((name) => name.endsWith('.audio'))
      .map((name) => {
        const fullPath = path.join(AUDIO_CACHE_DIR, name);
        const stat = fs.statSync(fullPath);
        return { fullPath, size: stat.size, mtimeMs: stat.mtimeMs };
      })
      .sort((a, b) => a.mtimeMs - b.mtimeMs);

    let totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    for (const entry of entries) {
      if (totalSize <= AUDIO_CACHE_MAX_BYTES) break;
      if (keepFilePath && entry.fullPath === keepFilePath) continue;
      try {
        fs.unlinkSync(entry.fullPath);
        totalSize -= entry.size;
      } catch {
        // Ignore eviction errors
      }
    }
  } catch {
    // Ignore cache pruning errors
  }
}

function ensureDriveAudioCached(
  fileId: string,
  meta: DriveAudioAssetMeta,
): ActiveAudioDownload | null {
  ensureAudioCacheDir();
  const finalPath = getAudioCachePath(fileId);
  if (fs.existsSync(finalPath)) {
    try {
      const now = new Date();
      fs.utimesSync(finalPath, now, now);
    } catch {
      // Ignore touch errors
    }
    return null;
  }

  const existing = activeAudioDownloads.get(fileId);
  if (existing) return existing;

  const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.tmp`;
  const task: ActiveAudioDownload = {
    fileId,
    tmpPath,
    finalPath,
    totalBytes: null,
    downloadedBytes: 0,
    promise: Promise.resolve(),
  };

  task.promise = (async () => {
    try {
      const upstream = await fetch(buildDriveDownloadUrl(fileId), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: `${meta.mimeType},audio/*,*/*;q=0.9`,
        },
        redirect: 'follow',
      });

      if (!upstream.ok || !upstream.body) {
        throw new Error(`Upstream status ${upstream.status}`);
      }
      const upstreamType = upstream.headers.get('content-type') ?? '';
      if (upstreamType.includes('text/html')) {
        throw new Error('Upstream returned HTML instead of audio');
      }

      if (upstream.url && upstream.url.startsWith('https://')) {
        resolvedDriveUrlCache.set(fileId, {
          url: upstream.url,
          expiresAt: Date.now() + 15 * 60 * 1000,
        });
      }

      const lenHeader = upstream.headers.get('content-length');
      const parsedLen = lenHeader ? Number.parseInt(lenHeader, 10) : Number.NaN;
      if (Number.isFinite(parsedLen) && parsedLen > 0) {
        task.totalBytes = parsedLen;
      }

      const writer = fs.createWriteStream(tmpPath);
      const reader = (
        upstream.body as unknown as WebReadableStream<Uint8Array>
      ).getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && value.byteLength > 0) {
            if (!writer.write(value)) {
              await new Promise<void>((resolve) => writer.once('drain', resolve));
            }
            task.downloadedBytes += value.byteLength;
          }
        }
      } finally {
        reader.releaseLock();
      }

      await new Promise<void>((resolve, reject) => {
        writer.end(() => resolve());
        writer.on('error', reject);
      });

      if (task.totalBytes !== null && task.downloadedBytes < task.totalBytes) {
        throw new Error('Incomplete audio download');
      }

      fs.renameSync(tmpPath, finalPath);
      pruneAudioCacheIfNeeded(finalPath);
    } catch {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
        // Ignore cleanup errors
      }
    } finally {
      activeAudioDownloads.delete(fileId);
    }
  })();

  activeAudioDownloads.set(fileId, task);
  return task;
}

// Synthesize an uncompressed 8-bit 8kHz mono RIFF WAV buffer on the fly per byte range
// so N2 packets without external Drive MP3s play smoothly with exact HTTP 206 seeking.
const WAV_SAMPLE_RATE = 8000;
const WAV_HEADER_BYTES = 44;

function parsePacketSeed(packetId: string): number {
  let hash = 0;
  for (let i = 0; i < packetId.length; i += 1) {
    hash = (hash * 31 + packetId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function parseSingleRange(
  rangeHeader: string | undefined,
  totalBytes: number,
): { start: number; end: number; isPartial: boolean } | null {
  if (!rangeHeader) {
    return { start: 0, end: totalBytes - 1, isPartial: false };
  }
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  let start = 0;
  let end = totalBytes - 1;

  if (rawStart === '' && rawEnd !== '') {
    const suffix = Number.parseInt(rawEnd, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, totalBytes - suffix);
  } else {
    start = Number.parseInt(rawStart, 10);
    if (!Number.isFinite(start) || start < 0 || start >= totalBytes) {
      return null;
    }
    if (rawEnd !== '') {
      const parsedEnd = Number.parseInt(rawEnd, 10);
      if (!Number.isFinite(parsedEnd) || parsedEnd < start) return null;
      end = Math.min(totalBytes - 1, parsedEnd);
    }
  }

  return { start, end, isPartial: true };
}

function createChoukaiWavHeader(dataLength: number): Buffer {
  const header = Buffer.alloc(WAV_HEADER_BYTES);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM format chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // Mono
  header.writeUInt32LE(WAV_SAMPLE_RATE, 24);
  header.writeUInt32LE(WAV_SAMPLE_RATE, 28); // Byte rate (8kHz * 1 channel * 1 byte)
  header.writeUInt16LE(1, 32); // Block align
  header.writeUInt16LE(8, 34); // Bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

const PENTATONIC_FREQS = [523.25, 587.33, 659.25, 783.99, 880.0];

function renderChoukaiWavSlice(
  packetId: string,
  startByte: number,
  endByte: number,
  durationSeconds: number,
): Buffer {
  const totalPcmBytes = durationSeconds * WAV_SAMPLE_RATE;
  const header = createChoukaiWavHeader(totalPcmBytes);
  const length = endByte - startByte + 1;
  const out = Buffer.allocUnsafe(length);
  const seed = parsePacketSeed(packetId);
  const cueIntervalSamples = 15 * WAV_SAMPLE_RATE;

  for (let offset = 0; offset < length; offset += 1) {
    const absByte = startByte + offset;
    if (absByte < WAV_HEADER_BYTES) {
      out[offset] = header[absByte];
      continue;
    }

    const sampleIdx = absByte - WAV_HEADER_BYTES;
    const blockIdx = Math.floor(sampleIdx / cueIntervalSamples);
    const sampleInBlock = sampleIdx % cueIntervalSamples;

    let amplitude = 0;
    // Gentle JLPT chime cue at the start of every 15-second question slot
    if (sampleInBlock < Math.floor(1.4 * WAV_SAMPLE_RATE)) {
      const t = sampleInBlock / WAV_SAMPLE_RATE;
      const noteIdx = (blockIdx + seed) % PENTATONIC_FREQS.length;
      const freq = sampleInBlock < 0.55 * WAV_SAMPLE_RATE
        ? PENTATONIC_FREQS[noteIdx]
        : PENTATONIC_FREQS[(noteIdx + 2) % PENTATONIC_FREQS.length];
      const localT =
        sampleInBlock < 0.55 * WAV_SAMPLE_RATE ? t : t - 0.55;
      const env =
        Math.min(1, localT / 0.03) * Math.exp(-localT * 4.2);
      amplitude =
        0.26 * env * Math.sin(2 * Math.PI * freq * localT) +
        0.07 * env * Math.sin(2 * Math.PI * freq * 2 * localT);
    }

    const pcmByte = Math.max(0, Math.min(255, Math.round(128 + amplitude * 96)));
    out[offset] = pcmByte;
  }

  return out;
}

function buildCappedUpstreamRangeHeader(
  rawRangeHeader: string | undefined,
): string {
  if (!rawRangeHeader || !rawRangeHeader.trim()) {
    return `bytes=0-${MAX_RANGE_CHUNK_BYTES - 1}`;
  }
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rawRangeHeader.trim());
  if (!match) {
    return `bytes=0-${MAX_RANGE_CHUNK_BYTES - 1}`;
  }
  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd !== '') {
    const suffix = Math.min(
      MAX_RANGE_CHUNK_BYTES,
      Math.max(1, Number.parseInt(rawEnd, 10) || MAX_RANGE_CHUNK_BYTES),
    );
    return `bytes=-${suffix}`;
  }
  const start = Math.max(0, Number.parseInt(rawStart, 10) || 0);
  const maxEnd = start + MAX_RANGE_CHUNK_BYTES - 1;
  if (rawEnd === '') {
    return `bytes=${start}-${maxEnd}`;
  }
  const requestedEnd = Number.parseInt(rawEnd, 10);
  const end =
    Number.isFinite(requestedEnd) && requestedEnd >= start
      ? Math.min(requestedEnd, maxEnd)
      : maxEnd;
  return `bytes=${start}-${end}`;
}

function sendLocalFileWithRanges(
  req: Request,
  res: Response,
  filePath: string,
  mimeType: string,
  fileName?: string,
  cacheControl = 'private, no-cache, no-transform',
  etag?: string,
) {
  const stat = fs.statSync(filePath);
  const total = stat.size;
  const parsed = parseSingleRange(req.headers.range, total);

  if (!parsed) {
    res.status(416).set('Content-Range', `bytes */${total}`).end();
    return;
  }

  // Per RFC 9110: ONLY return 206 when the client sent a Range header.
  // Cap open-ended Range chunks to 1 MB so 40-48 MB MP3s never exceed Cloud Run's 32 MB response limit.
  const start = parsed.start;
  const end =
    req.method !== 'HEAD' && parsed.isPartial
      ? Math.min(parsed.end, start + MAX_RANGE_CHUNK_BYTES - 1)
      : parsed.end;
  const isPartial = parsed.isPartial;
  const strongEtag = etag ?? `"utamago-${total}-${Math.floor(stat.mtimeMs)}"`;

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Vary', 'Range');
  res.setHeader('ETag', strongEtag);
  res.setHeader('Last-Modified', stat.mtime.toUTCString());
  res.setHeader(
    'Content-Disposition',
    fileName ? `inline; filename="${fileName}"` : 'inline',
  );
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', cacheControl);

  if (isPartial) {
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', String(end - start + 1));
  } else {
    res.status(200);
    res.setHeader('Content-Length', String(total));
  }

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = fs.createReadStream(filePath, { start, end });
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).end();
    } else if (!res.writableEnded) {
      res.end();
    }
  });
  stream.pipe(res);
}

async function handleDriveAudioProxy(req: Request, res: Response) {
  const rawId = req.params.fileId ?? '';
  const fileId = rawId.trim();
  const meta = ALLOWED_DRIVE_AUDIO[fileId];

  if (!meta) {
    res.status(404).json({ error: 'Audio track not found in catalog.' });
    return;
  }

  // 1. Fast path: serve directly from local disk cache (<5ms latency, capped at 1 MB per 206 chunk)
  const cachedPath = getAudioCachePath(fileId);
  if (fs.existsSync(cachedPath)) {
    try {
      const now = new Date();
      fs.utimesSync(cachedPath, now, now);
    } catch {
      // Ignore touch error
    }
    const stat = fs.statSync(cachedPath);
    sendLocalFileWithRanges(
      req,
      res,
      cachedPath,
      meta.mimeType,
      meta.fileName,
      'private, no-cache, no-transform',
      `"utamago-${fileId}-${stat.size}"`,
    );
    return;
  }

  // 2. Kick off deduplicated background caching to disk immediately
  const downloadTask = ensureDriveAudioCached(fileId, meta);

  // 3. Partial-cache fast path: check ACTUAL flushed disk size (never buffered count!)
  // so we never hit EOF early or mismatch Content-Length.
  if (downloadTask && downloadTask.totalBytes !== null) {
    const total = downloadTask.totalBytes;
    const stableEtag = `"utamago-${fileId}-${total}"`;
    if (req.method === 'HEAD') {
      res.status(200);
      res.setHeader('Content-Type', meta.mimeType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Vary', 'Range');
      res.setHeader('ETag', stableEtag);
      res.setHeader('Content-Length', String(total));
      res.setHeader('Content-Disposition', `inline; filename="${meta.fileName}"`);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'private, no-cache, no-transform');
      res.end();
      return;
    }

    let diskSize = 0;
    let sourcePath: string | null = null;
    try {
      if (fs.existsSync(cachedPath)) {
        // Download just finished & renamed atomically!
        sendLocalFileWithRanges(
          req,
          res,
          cachedPath,
          meta.mimeType,
          meta.fileName,
          'private, no-cache, no-transform',
          stableEtag,
        );
        return;
      }
      if (fs.existsSync(downloadTask.tmpPath)) {
        diskSize = fs.statSync(downloadTask.tmpPath).size;
        sourcePath = downloadTask.tmpPath;
      }
    } catch {
      diskSize = 0;
      sourcePath = null;
    }

    const parsed = parseSingleRange(req.headers.range, total);
    const safeFlushedEnd = diskSize - 65536 - 1;
    if (
      sourcePath &&
      parsed &&
      parsed.isPartial &&
      safeFlushedEnd - parsed.start >= 131072
    ) {
      const serveEnd = Math.min(
        parsed.end,
        safeFlushedEnd,
        parsed.start + MAX_RANGE_CHUNK_BYTES - 1,
      );
      try {
        const fd = fs.openSync(sourcePath, 'r');
        const chunkLen = serveEnd - parsed.start + 1;
        res.status(206);
        res.setHeader('Content-Type', meta.mimeType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Vary', 'Range');
        res.setHeader('ETag', stableEtag);
        res.setHeader(
          'Content-Range',
          `bytes ${parsed.start}-${serveEnd}/${total}`,
        );
        res.setHeader('Content-Length', String(chunkLen));
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${meta.fileName}"`,
        );
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cache-Control', 'private, no-cache, no-transform');

        const stream = fs.createReadStream('', {
          fd,
          start: parsed.start,
          end: serveEnd,
          autoClose: true,
        });
        stream.on('error', () => {
          if (!res.writableEnded) res.end();
        });
        stream.pipe(res);
        return;
      } catch {
        // Fall through cleanly if tmpPath was renamed concurrently
        if (fs.existsSync(cachedPath)) {
          sendLocalFileWithRanges(
            req,
            res,
            cachedPath,
            meta.mimeType,
            meta.fileName,
            'private, no-cache, no-transform',
            stableEtag,
          );
          return;
        }
      }
    }
  }

  // 4. Cold-miss streaming pass-through (always capped at 2 MB per request for Cloud Run!)
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });

  try {
    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'audio/*,*/*;q=0.9',
      Range:
        req.method === 'HEAD'
          ? 'bytes=0-0'
          : buildCappedUpstreamRangeHeader(
              typeof req.headers.range === 'string'
                ? req.headers.range
                : undefined,
            ),
    };

    const cachedDirect = resolvedDriveUrlCache.get(fileId);
    const targetUrl =
      cachedDirect && cachedDirect.expiresAt > Date.now()
        ? cachedDirect.url
        : buildDriveDownloadUrl(fileId);

    let upstream = await fetch(targetUrl, {
      headers: upstreamHeaders,
      redirect: 'follow',
      signal: controller.signal,
    });

    if (
      !upstream.ok &&
      upstream.status !== 206 &&
      targetUrl !== buildDriveDownloadUrl(fileId)
    ) {
      resolvedDriveUrlCache.delete(fileId);
      upstream = await fetch(buildDriveDownloadUrl(fileId), {
        headers: upstreamHeaders,
        redirect: 'follow',
        signal: controller.signal,
      });
    }

    if (!upstream.ok && upstream.status !== 206) {
      res.status(502).json({
        error: `Upstream Google Drive returned status ${upstream.status}`,
      });
      return;
    }

    const upstreamType = upstream.headers.get('content-type') ?? '';
    if (upstreamType.includes('text/html')) {
      res.status(502).json({
        error: 'Upstream Google Drive returned HTML instead of audio binary.',
      });
      return;
    }

    if (upstream.url && upstream.url.startsWith('https://')) {
      resolvedDriveUrlCache.set(fileId, {
        url: upstream.url,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
    }

    const contentRange = upstream.headers.get('content-range');
    const totalMatch = contentRange?.match(/\/(\d+)$/);
    const totalLen =
      totalMatch?.[1] ?? upstream.headers.get('content-length') ?? '';
    const stableEtag = totalLen ? `"utamago-${fileId}-${totalLen}"` : undefined;

    if (req.method === 'HEAD') {
      res.status(200);
      res.setHeader('Content-Type', meta.mimeType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Vary', 'Range');
      if (stableEtag) {
        res.setHeader('ETag', stableEtag);
      }
      if (totalLen) {
        res.setHeader('Content-Length', totalLen);
      }
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${meta.fileName}"`,
      );
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'private, no-cache, no-transform');
      try {
        await upstream.body?.cancel();
      } catch {
        // Ignore cancel errors
      }
      res.end();
      return;
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', meta.mimeType);
    res.setHeader(
      'Accept-Ranges',
      upstream.headers.get('accept-ranges') ?? 'bytes',
    );
    res.setHeader('Vary', 'Range');
    if (stableEtag) {
      res.setHeader('ETag', stableEtag);
    }
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${meta.fileName}"`,
    );
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'private, no-cache, no-transform');

    if (!upstream.body) {
      res.end();
      return;
    }

    const nodeStream = Readable.fromWeb(
      upstream.body as unknown as WebReadableStream<Uint8Array>,
    );
    nodeStream.on('error', () => {
      if (!res.writableEnded) {
        res.end();
      }
    });
    nodeStream.pipe(res);
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      return;
    }
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Gagal menghubungi server streaming audio.',
      });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
}

// Plain HTTP 200 OK binary chunk endpoint for MediaSource Extensions (MSE) streaming.
// Bypasses browser/proxy HTTP 206 Range quirks on Android Chrome & Cloud Run completely.
async function handleDriveAudioChunk(req: Request, res: Response) {
  const fileId = (req.params.fileId ?? '').trim();
  const meta = ALLOWED_DRIVE_AUDIO[fileId];
  if (!meta) {
    res.status(404).json({ error: 'Audio track not found in catalog.' });
    return;
  }

  const rawStart = Number.parseInt(String(req.query.start ?? '0'), 10);
  const rawLength = Number.parseInt(String(req.query.length ?? '524288'), 10);
  const start = Number.isFinite(rawStart) && rawStart >= 0 ? rawStart : 0;
  const length = Math.max(
    16384,
    Math.min(
      MAX_RANGE_CHUNK_BYTES,
      Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 524288,
    ),
  );

  const sendSliceFromPath = (filePath: string, total: number): boolean => {
    if (start >= total) {
      res.status(204);
      res.setHeader('X-Audio-Total-Bytes', String(total));
      res.setHeader('X-Audio-Mime-Type', meta.mimeType);
      res.setHeader('Cache-Control', 'private, no-store, no-transform');
      res.end();
      return true;
    }
    const end = Math.min(total - 1, start + length - 1);
    const chunkLen = end - start + 1;
    try {
      const fd = fs.openSync(filePath, 'r');
      res.status(200);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', String(chunkLen));
      res.setHeader('X-Audio-Total-Bytes', String(total));
      res.setHeader('X-Audio-Chunk-Start', String(start));
      res.setHeader('X-Audio-Chunk-End', String(end));
      res.setHeader('X-Audio-Mime-Type', meta.mimeType);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'private, no-store, no-transform');
      const stream = fs.createReadStream('', {
        fd,
        start,
        end,
        autoClose: true,
      });
      stream.on('error', () => {
        if (!res.writableEnded) res.end();
      });
      stream.pipe(res);
      return true;
    } catch {
      return false;
    }
  };

  // 1. Local disk cache (<5ms)
  const cachedPath = getAudioCachePath(fileId);
  if (fs.existsSync(cachedPath)) {
    try {
      const now = new Date();
      fs.utimesSync(cachedPath, now, now);
      const total = fs.statSync(cachedPath).size;
      if (sendSliceFromPath(cachedPath, total)) return;
    } catch {
      // Fall through
    }
  }

  // 2. Warm background cache + check flushed partial .tmp
  const downloadTask = ensureDriveAudioCached(fileId, meta);
  if (downloadTask && downloadTask.totalBytes !== null) {
    const total = downloadTask.totalBytes;
    if (start >= total) {
      res.status(204);
      res.setHeader('X-Audio-Total-Bytes', String(total));
      res.setHeader('X-Audio-Mime-Type', meta.mimeType);
      res.setHeader('Cache-Control', 'private, no-store, no-transform');
      res.end();
      return;
    }
    try {
      if (fs.existsSync(cachedPath)) {
        if (sendSliceFromPath(cachedPath, total)) return;
      }
      if (fs.existsSync(downloadTask.tmpPath)) {
        const diskSize = fs.statSync(downloadTask.tmpPath).size;
        const safeFlushedEnd = diskSize - 65536 - 1;
        const targetEnd = Math.min(total - 1, start + length - 1);
        if (safeFlushedEnd >= targetEnd) {
          if (sendSliceFromPath(downloadTask.tmpPath, total)) return;
        }
      }
    } catch {
      // Fall through to upstream
    }
  }

  // 3. Cold-miss fetch single <=1 MB range from Google Drive and return as HTTP 200
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const end = start + length - 1;
    const cachedDirect = resolvedDriveUrlCache.get(fileId);
    const targetUrl =
      cachedDirect && cachedDirect.expiresAt > Date.now()
        ? cachedDirect.url
        : buildDriveDownloadUrl(fileId);
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'audio/*,*/*;q=0.9',
      Range: `bytes=${start}-${end}`,
    };

    let upstream = await fetch(targetUrl, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });
    if (
      !upstream.ok &&
      upstream.status !== 206 &&
      upstream.status !== 416 &&
      targetUrl !== buildDriveDownloadUrl(fileId)
    ) {
      resolvedDriveUrlCache.delete(fileId);
      upstream = await fetch(buildDriveDownloadUrl(fileId), {
        headers,
        redirect: 'follow',
        signal: controller.signal,
      });
    }

    if (upstream.status === 416) {
      const cr = upstream.headers.get('content-range') ?? '';
      const totalMatch = cr.match(/\/(\d+)$/);
      res.status(204);
      if (totalMatch?.[1]) {
        res.setHeader('X-Audio-Total-Bytes', totalMatch[1]);
      }
      res.setHeader('X-Audio-Mime-Type', meta.mimeType);
      res.setHeader('Cache-Control', 'private, no-store, no-transform');
      res.end();
      return;
    }

    if (!upstream.ok && upstream.status !== 206) {
      res.status(502).json({ error: `Upstream status ${upstream.status}` });
      return;
    }
    const upstreamType = upstream.headers.get('content-type') ?? '';
    if (upstreamType.includes('text/html') || !upstream.body) {
      res.status(502).json({ error: 'Upstream did not return audio binary.' });
      return;
    }

    if (upstream.url && upstream.url.startsWith('https://')) {
      resolvedDriveUrlCache.set(fileId, {
        url: upstream.url,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
    }

    const cr = upstream.headers.get('content-range') ?? '';
    const rangeMatch = /^bytes\s+(\d+)-(\d+)\/(\d+)$/i.exec(cr);
    const cl = upstream.headers.get('content-length');
    const actualStart = rangeMatch ? rangeMatch[1] : String(start);
    const actualEnd = rangeMatch
      ? rangeMatch[2]
      : cl
        ? String(start + Number.parseInt(cl, 10) - 1)
        : String(end);
    const totalBytes = rangeMatch ? rangeMatch[3] : (cl ?? '');

    res.status(200);
    res.setHeader('Content-Type', 'application/octet-stream');
    if (cl) res.setHeader('Content-Length', cl);
    if (totalBytes) res.setHeader('X-Audio-Total-Bytes', totalBytes);
    res.setHeader('X-Audio-Chunk-Start', actualStart);
    res.setHeader('X-Audio-Chunk-End', actualEnd);
    res.setHeader('X-Audio-Mime-Type', meta.mimeType);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'private, no-store, no-transform');

    const nodeStream = Readable.fromWeb(
      upstream.body as unknown as WebReadableStream<Uint8Array>,
    );
    nodeStream.on('error', () => {
      if (!res.writableEnded) res.end();
    });
    nodeStream.pipe(res);
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return;
    if (!res.headersSent) {
      res.status(502).json({ error: 'Gagal mengambil potongan audio.' });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
}

function handleLocalOrPracticeChoukaiAudio(
  req: Request,
  res: Response,
  rawPacketId: string,
) {
  const packetId = rawPacketId.replace(/[^a-zA-Z0-9_-]/g, '') || 'n2-1';
  const aistudioDir = path.resolve(process.cwd(), 'public/assets/aistudio');

  // Serve real static MP3/M4A if present in public/assets/aistudio/
  const candidates = [
    path.join(aistudioDir, `${packetId}.mp3`),
    path.join(aistudioDir, `${packetId}.m4a`),
    ...(packetId === 'n2-1'
      ? [path.join(aistudioDir, '2016_12_N2_choukai.mp3')]
      : []),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const mimeType = candidate.endsWith('.m4a')
        ? 'audio/mp4'
        : 'audio/mpeg';
      sendLocalFileWithRanges(req, res, candidate, mimeType);
      return;
    }
  }

  // Otherwise serve valid HTTP 206 Range-capable WAV cue track (12 minutes structured pacing)
  const durationSeconds = 12 * 60;
  const totalBytes = WAV_HEADER_BYTES + durationSeconds * WAV_SAMPLE_RATE;
  const parsed = parseSingleRange(req.headers.range, totalBytes);

  if (!parsed) {
    res.status(416).set('Content-Range', `bytes */${totalBytes}`).end();
    return;
  }

  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="JLPT_${packetId}_Choukai.wav"`,
  );
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  if (parsed.isPartial) {
    res.status(206);
    res.setHeader(
      'Content-Range',
      `bytes ${parsed.start}-${parsed.end}/${totalBytes}`,
    );
    res.setHeader('Content-Length', String(parsed.end - parsed.start + 1));
  } else {
    res.status(200);
    res.setHeader('Content-Length', String(totalBytes));
  }

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const slice = renderChoukaiWavSlice(
    packetId,
    parsed.start,
    parsed.end,
    durationSeconds,
  );
  res.send(slice);
}

async function startServer() {
  const app = express();
  const port = Number.parseInt(process.env.PORT ?? '3000', 10) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/audio/prefetch/:fileId', (req, res) => {
    const fileId = (req.params.fileId ?? '').trim();
    const meta = ALLOWED_DRIVE_AUDIO[fileId];
    if (!meta) {
      res.status(404).json({ error: 'Audio track not found in catalog.' });
      return;
    }
    const finalPath = getAudioCachePath(fileId);
    if (fs.existsSync(finalPath)) {
      res.json({ status: 'cached', fileId });
      return;
    }
    const task = ensureDriveAudioCached(fileId, meta);
    res.status(202).json({
      status: 'downloading',
      fileId,
      downloadedBytes: task?.downloadedBytes ?? 0,
      totalBytes: task?.totalBytes ?? null,
    });
  });

  app.get('/api/audio/chunk/:fileId', (req, res) => {
    void handleDriveAudioChunk(req, res);
  });

  app.get('/api/audio/drive/:fileId', (req, res) => {
    void handleDriveAudioProxy(req, res);
  });
  app.head('/api/audio/drive/:fileId', (req, res) => {
    void handleDriveAudioProxy(req, res);
  });

  app.get('/api/audio/choukai/:packetId', (req, res) => {
    handleLocalOrPracticeChoukaiAudio(req, res, req.params.packetId ?? 'n2-1');
  });
  app.head('/api/audio/choukai/:packetId', (req, res) => {
    handleLocalOrPracticeChoukaiAudio(req, res, req.params.packetId ?? 'n2-1');
  });

  // Guard legacy static path if offline MP3 was not bundled
  app.get('/assets/aistudio/2016_12_N2_choukai.mp3', (req, res, next) => {
    const filePath = path.resolve(
      process.cwd(),
      'public/assets/aistudio/2016_12_N2_choukai.mp3',
    );
    if (fs.existsSync(filePath)) {
      next();
      return;
    }
    handleLocalOrPracticeChoukaiAudio(req, res, 'n2-1');
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`UtamaGo! server listening on http://0.0.0.0:${port}`);
    // Gently pre-warm JLPT N2 Paket 1 (2010.07) Choukai audio into local cache
    setTimeout(() => {
      for (const fileId of PREWARM_DRIVE_AUDIO_IDS) {
        const meta = ALLOWED_DRIVE_AUDIO[fileId];
        if (meta) ensureDriveAudioCached(fileId, meta);
      }
    }, 1000);
  });
}

void startServer();
