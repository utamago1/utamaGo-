/**
 * Zero-latency Web Audio API game sound effects engine for UtamaGo! Challenge Arena.
 * - 100% offline, zero external MP3 assets, never interferes with Japanese TTS playback.
 * - Gracefully degrades on browsers without AudioContext or when user mutes SFX.
 */

const SFX_PREF_STORAGE_KEY = 'utamago_challenge_sfx_v1';

let sfxContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sfxContext || sfxContext.state === 'closed') {
    try {
      sfxContext = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (sfxContext.state === 'suspended') {
    sfxContext.resume().catch(() => {
      // Autoplay policies may keep context suspended until next gesture
    });
  }
  return sfxContext;
}

export function loadChallengeSfxEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(SFX_PREF_STORAGE_KEY);
    if (raw === '0' || raw === 'false') return false;
    return true;
  } catch {
    return true;
  }
}

export function saveChallengeSfxEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SFX_PREF_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore storage quota / privacy restrictions
  }
}

function scheduleTone(
  ctx: AudioContext,
  opts: {
    freq: number;
    endFreq?: number;
    type?: OscillatorType;
    startOffsetSec?: number;
    durationSec: number;
    peakGain?: number;
  },
): void {
  const now = ctx.currentTime + (opts.startOffsetSec ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type ?? 'triangle';
  osc.frequency.setValueAtTime(opts.freq, now);
  if (typeof opts.endFreq === 'number') {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, opts.endFreq),
      now + opts.durationSec,
    );
  }

  const peak = opts.peakGain ?? 0.12;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + opts.durationSec + 0.02);
}

// Pentatonic ladder so rising combos sound musical and rewarding
const COMBO_PITCH_LADDER = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

export function playCorrectSfx(combo: number, enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const idx = Math.min(COMBO_PITCH_LADDER.length - 1, Math.max(0, combo - 1));
  const root = COMBO_PITCH_LADDER[idx];
  scheduleTone(ctx, {
    freq: root,
    type: 'triangle',
    startOffsetSec: 0,
    durationSec: 0.14,
    peakGain: 0.13,
  });
  scheduleTone(ctx, {
    freq: root * 1.25,
    type: 'sine',
    startOffsetSec: 0.055,
    durationSec: 0.18,
    peakGain: 0.11,
  });
}

export function playWrongSfx(enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  scheduleTone(ctx, {
    freq: 240,
    endFreq: 180,
    type: 'sawtooth',
    startOffsetSec: 0,
    durationSec: 0.14,
    peakGain: 0.075,
  });
  scheduleTone(ctx, {
    freq: 175,
    endFreq: 135,
    type: 'triangle',
    startOffsetSec: 0.09,
    durationSec: 0.18,
    peakGain: 0.09,
  });
}

export function playTileTapSfx(isRemove = false, enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  scheduleTone(ctx, {
    freq: isRemove ? 380 : 540,
    endFreq: isRemove ? 300 : 660,
    type: 'sine',
    startOffsetSec: 0,
    durationSec: 0.065,
    peakGain: 0.08,
  });
}

export function playFeverSfx(enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    scheduleTone(ctx, {
      freq,
      type: 'triangle',
      startOffsetSec: i * 0.055,
      durationSec: 0.22,
      peakGain: 0.12,
    });
  });
}

export function playBossHitSfx(enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Low punch + bright strike overtone
  scheduleTone(ctx, {
    freq: 170,
    endFreq: 68,
    type: 'sawtooth',
    startOffsetSec: 0,
    durationSec: 0.16,
    peakGain: 0.12,
  });
  scheduleTone(ctx, {
    freq: 740,
    endFreq: 987.77,
    type: 'triangle',
    startOffsetSec: 0.04,
    durationSec: 0.18,
    peakGain: 0.11,
  });
}

export function playTimerTickSfx(urgent = false, enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  scheduleTone(ctx, {
    freq: urgent ? 880 : 660,
    type: 'sine',
    startOffsetSec: 0,
    durationSec: 0.055,
    peakGain: urgent ? 0.09 : 0.055,
  });
}

export function playVictorySfx(isBossVictory = false, enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const fanfare = isBossVictory
    ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
    : [523.25, 659.25, 783.99, 1046.5];
  fanfare.forEach((freq, i) => {
    scheduleTone(ctx, {
      freq,
      type: i === fanfare.length - 1 ? 'sine' : 'triangle',
      startOffsetSec: i * 0.085,
      durationSec: i === fanfare.length - 1 ? 0.42 : 0.2,
      peakGain: 0.13,
    });
  });
}

export function playGameOverSfx(enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [392.0, 349.23, 311.13, 261.63];
  notes.forEach((freq, i) => {
    scheduleTone(ctx, {
      freq,
      type: 'triangle',
      startOffsetSec: i * 0.11,
      durationSec: 0.24,
      peakGain: 0.095,
    });
  });
}
