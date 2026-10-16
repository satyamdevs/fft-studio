import { describe, expect, it } from 'vitest';
import {
  buildLogBands,
  computeLogBands,
  dbToNorm,
  floatBandsToNorm,
  smoothBands,
  updateBeat,
} from './dsp';

describe('buildLogBands', () => {
  it('builds 32 bands capped at 20k for 44.1k/2048', () => {
    const bands = buildLogBands(44100, 2048, 32);
    expect(bands).toHaveLength(32);
    for (const b of bands) expect(b.loBin).toBeLessThanOrEqual(b.hiBin);
    // 20k cap: floor(20000 / (44100/2048)) = 928; bins above are the 20k+ air band.
    expect(bands[31]?.hiBin).toBe(928);
  });

  it('covers full Nyquist when fMax exceeds it', () => {
    const bands = buildLogBands(44100, 2048, 32, 20, 30000);
    // top = nyquist*0.99 edge guard → hiBin 1013, not 1023.
    expect(bands[31]?.hiBin).toBe(1013);
  });
});

describe('computeLogBands', () => {
  it('peaks at the band containing a 440Hz spike', () => {
    const sampleRate = 44100;
    const fftSize = 2048;
    const binHz = sampleRate / fftSize;
    const spikeBin = Math.round(440 / binHz);
    const raw = new Uint8Array(1024);
    raw[spikeBin] = 255;
    const mapping = buildLogBands(sampleRate, fftSize, 32);
    const out = computeLogBands(raw, mapping);
    let maxIdx = 0;
    for (let i = 1; i < out.length; i++) if (out[i]! > out[maxIdx]!) maxIdx = i;
    const m = mapping[maxIdx]!;
    expect(spikeBin).toBeGreaterThanOrEqual(m.loBin);
    expect(spikeBin).toBeLessThanOrEqual(m.hiBin);
  });
});

describe('dbToNorm', () => {
  it('maps native dB range to 0..1', () => {
    expect(dbToNorm(-100)).toBe(0);
    expect(dbToNorm(-30)).toBe(1);
    expect(dbToNorm(-65)).toBeCloseTo(0.5, 5);
    expect(dbToNorm(-200)).toBe(0);
    expect(dbToNorm(0)).toBe(1);
  });
});

describe('floatBandsToNorm', () => {
  it('maps loud bands near 255 and silent near 0', () => {
    const mapping = buildLogBands(44100, 2048, 32);
    const loud = new Float32Array(1024).fill(-30);
    const quiet = new Float32Array(1024).fill(-100);
    const loudOut = floatBandsToNorm(loud, mapping);
    const quietOut = floatBandsToNorm(quiet, mapping);
    for (const v of loudOut) expect(v).toBeCloseTo(255, 5);
    for (const v of quietOut) expect(v).toBe(0);
  });
});

describe('smoothBands', () => {
  it('attacks faster than it releases', () => {
    const prev = new Float32Array([100]);
    const up = smoothBands(prev, new Float32Array([200]), 0.45, 0.08);
    const down = smoothBands(new Float32Array([200]), new Float32Array([100]), 0.45, 0.08);
    expect(up[0]).toBeCloseTo(145, 5);
    expect(down[0]).toBeCloseTo(192, 5);
  });
});

describe('updateBeat', () => {
  it('fires on flux above threshold and decays otherwise', () => {
    expect(updateBeat(100, 50, 0, 12).beat).toBe(1);
    expect(updateBeat(51, 50, 1, 12).beat).toBeCloseTo(0.92, 5);
  });
});
