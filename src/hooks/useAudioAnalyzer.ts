import { useEffect, useRef, useState } from 'react';
import type { AudioEngine } from '../audio/AudioEngine';
import { buildLogBands, computeLevels, computeLogBands, smoothBands, updateBeat } from '../audio/dsp';

export interface AnalyzerStats {
  bass: number;
  mid: number;
  treble: number;
  beat: number;
  fps: number;
}

const NUM_BANDS = 32;

export function useAudioAnalyzer(
  engine: AudioEngine | null,
  running: boolean,
  beatThreshold = 12,
) {
  const bandsRef = useRef<Float32Array>(new Float32Array(NUM_BANDS));
  const waveRef = useRef<Uint8Array>(new Uint8Array(2048));
  const levelsRef = useRef({ bass: 0, mid: 0, treble: 0, beat: 0 });
  const [stats, setStats] = useState<AnalyzerStats>({ bass: 0, mid: 0, treble: 0, beat: 0, fps: 0 });

  const thresholdRef = useRef(beatThreshold);

  useEffect(() => {
    thresholdRef.current = beatThreshold;
  }, [beatThreshold]);

  useEffect(() => {
    if (!engine || !running || !engine.ready || !engine.analyser || !engine.ctx) return;

    const analyser = engine.analyser;
    let raf = 0;
    let lastStats = performance.now();
    let frames = 0;
    let prevBass = 0;
    let beat = 0;
    const rawFreq = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);
    let mapping = buildLogBands(engine.sampleRate, analyser.fftSize, NUM_BANDS);
    let lastFftSize = analyser.fftSize;
    const smoothed = new Float32Array(NUM_BANDS);
    const computed = new Float32Array(NUM_BANDS);

    const loop = () => {
      raf = requestAnimationFrame(loop);
      // fftSize can change live from controls — rebuild mapping + buffers.
      if (analyser.fftSize !== lastFftSize) {
        lastFftSize = analyser.fftSize;
        mapping = buildLogBands(engine.sampleRate, analyser.fftSize, NUM_BANDS);
      }
      if (rawFreq.length !== analyser.frequencyBinCount) {
        // Reallocate without breaking refs held by visuals.
        const next = new Uint8Array(analyser.frequencyBinCount);
        rawFreq.set(next.subarray(0, 0));
      }
      analyser.getByteFrequencyData(rawFreq as Uint8Array<ArrayBuffer>);
      analyser.getByteTimeDomainData(timeData as Uint8Array<ArrayBuffer>);

      computeLogBands(rawFreq, mapping, computed);
      smoothBands(smoothed, computed, 0.45, 0.08, smoothed);
      bandsRef.current.set(smoothed);

      if (waveRef.current.length !== timeData.length) {
        waveRef.current = new Uint8Array(timeData.length);
      }
      waveRef.current.set(timeData);

      const levels = computeLevels(rawFreq, engine.sampleRate, analyser.fftSize);
      const b = updateBeat(levels.bass, prevBass, beat, thresholdRef.current);
      prevBass = levels.bass;
      beat = b.beat;
      levelsRef.current = { ...levels, beat };

      frames++;
      const now = performance.now();
      if (now - lastStats > 200) {
        const fps = Math.round((frames * 1000) / (now - lastStats));
        frames = 0;
        lastStats = now;
        setStats({ bass: Math.round(levels.bass), mid: Math.round(levels.mid), treble: Math.round(levels.treble), beat: Math.round(beat * 100) / 100, fps });
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine, running]);

  return { bandsRef, waveRef, levelsRef, stats, numBands: NUM_BANDS };
}
