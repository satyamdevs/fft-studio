// Pure DSP helpers — no DOM, no AudioContext. Fully unit-testable.

export interface BandMapping {
  /** inclusive start bin */
  loBin: number;
  /** inclusive end bin */
  hiBin: number;
  /** center frequency in Hz (for labels) */
  centerHz: number;
}

/**
 * Build log-spaced band mapping from 20Hz..nyquist.
 * Human hearing is logarithmic, linear FFT bins are not — this fixes
 * the "dead bass" problem of naive bass=0..12 splits.
 */
export function buildLogBands(
  sampleRate: number,
  fftSize: number,
  numBands = 32,
  fMin = 20,
  fMax?: number,
): BandMapping[] {
  const nyquist = sampleRate / 2;
  const top = Math.min(fMax ?? 20000, nyquist * 0.99);
  const binHz = sampleRate / fftSize;
  const binCount = fftSize / 2;
  const bands: BandMapping[] = [];

  for (let i = 0; i < numBands; i++) {
    const loF = fMin * Math.pow(top / fMin, i / numBands);
    const hiF = fMin * Math.pow(top / fMin, (i + 1) / numBands);
    const loBin = Math.max(0, Math.floor(loF / binHz));
    const hiBin = Math.min(binCount - 1, Math.max(loBin, Math.ceil(hiF / binHz) - 1));
    const centerHz = Math.sqrt(loF * hiF);
    bands.push({ loBin, hiBin, centerHz });
  }
  return bands;
}

/** Average byte-frequency bins (0-255) into log bands. */
export function computeLogBands(
  byteFreq: Uint8Array | number[],
  mapping: BandMapping[],
  out?: Float32Array,
): Float32Array {
  const result = out ?? new Float32Array(mapping.length);
  for (let i = 0; i < mapping.length; i++) {
    const { loBin, hiBin } = mapping[i];
    let sum = 0;
    let n = 0;
    for (let b = loBin; b <= hiBin && b < byteFreq.length; b++) {
      sum += byteFreq[b];
      n++;
    }
    result[i] = n > 0 ? sum / n : 0;
  }
  return result;
}

/**
 * Per-band exponential smoothing with separate attack/release.
 * Fast attack (jump up quickly on beats), slow release (fall gracefully).
 */
export function smoothBands(
  prev: Float32Array,
  next: Float32Array | number[],
  attack = 0.45,
  release = 0.08,
  out?: Float32Array,
): Float32Array {
  const result = out ?? new Float32Array(prev.length);
  for (let i = 0; i < prev.length; i++) {
    const raw = next[i] ?? 0;
    const k = raw > prev[i] ? attack : release;
    result[i] = prev[i] + (raw - prev[i]) * k;
  }
  return result;
}

/** Map dB value to 0..1 visual range. Native range is roughly -100..-30. */
export function dbToNorm(db: number, min = -100, max = -30): number {
  if (db <= min) return 0;
  if (db >= max) return 1;
  return (db - min) / (max - min);
}

/** Average float dB spectrum into 0-255 log bands (same scale as byte path). */
export function floatBandsToNorm(
  floatFreq: Float32Array | number[],
  mapping: BandMapping[],
  out?: Float32Array,
  minDb = -100,
  maxDb = -30,
): Float32Array {
  const result = out ?? new Float32Array(mapping.length);
  for (let i = 0; i < mapping.length; i++) {
    const { loBin, hiBin } = mapping[i];
    let sum = 0;
    let n = 0;
    for (let b = loBin; b <= hiBin && b < floatFreq.length; b++) {
      sum += floatFreq[b] ?? minDb;
      n++;
    }
    const avgDb = n > 0 ? sum / n : minDb;
    result[i] = dbToNorm(avgDb, minDb, maxDb) * 255;
  }
  return result;
}

export interface Levels {
  bass: number;
  mid: number;
  treble: number;
}

/** Bass <250Hz, Mid <4kHz, Treble rest — computed from raw bins + sampleRate. */
export function computeLevels(
  byteFreq: Uint8Array | number[],
  sampleRate: number,
  fftSize: number,
): Levels {
  const binHz = sampleRate / fftSize;
  const bassEnd = Math.floor(250 / binHz);
  const midEnd = Math.floor(4000 / binHz);
  const avg = (lo: number, hi: number) => {
    const h = Math.min(hi, byteFreq.length - 1);
    if (h < lo) return 0;
    let s = 0;
    for (let i = lo; i <= h; i++) s += byteFreq[i];
    return s / (h - lo + 1);
  };
  return {
    bass: avg(0, bassEnd),
    mid: avg(bassEnd + 1, midEnd),
    treble: avg(midEnd + 1, byteFreq.length - 1),
  };
}

/**
 * Simple onset detector on bass energy flux.
 * Returns new beat envelope 0..1. Caller stores prevBass + beat.
 */
export function updateBeat(
  bassNow: number,
  prevBass: number,
  beatPrev: number,
  threshold = 12,
): { beat: number; flux: number } {
  const flux = Math.max(0, bassNow - prevBass);
  const beat = flux > threshold ? 1 : beatPrev * 0.92;
  return { beat, flux };
}
