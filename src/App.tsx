import { useEffect, useRef, useState } from 'react';
import { AudioEngine, type SourceKind } from './audio/AudioEngine';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { Controls } from './components/Controls';
import { Bars } from './visuals/Bars';
import { Waveform } from './visuals/Waveform';
import { Radial } from './visuals/Radial';
import './App.css';

export default function App() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  const [started, setStarted] = useState(false);
  const [running] = useState(true);
  const [source, setSource] = useState<SourceKind>('none');
  const [fftSize, setFftSize] = useState(2048);
  const [smoothing, setSmoothing] = useState(0.8);
  const [gain, setGain] = useState(1);
  const [filterFreq, setFilterFreq] = useState(20000);
  const [oscFreq, setOscFreq] = useState(110);
  const [beatThreshold, setBeatThreshold] = useState(12);
  const [micError, setMicError] = useState<string | null>(null);

  const getEngine = (): AudioEngine => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
      setEngine(engineRef.current);
    }
    return engineRef.current;
  };

  // Only start the analyzer loop once the engine exists.
  const { bandsRef, waveRef, levelsRef, stats, numBands } = useAudioAnalyzer(
    engine,
    started && running,
    beatThreshold,
  );

  useEffect(() => {
    return () => engineRef.current?.dispose();
  }, []);

  const ensureStarted = async () => {
    const eng = getEngine();
    await eng.init();
    eng.setFftSize(fftSize);
    eng.setSmoothing(smoothing);
    eng.setGain(gain);
    eng.setFilterFreq(filterFreq);
    setStarted(true);
  };

  const handleSource = async (s: SourceKind, file?: File) => {
    setMicError(null);
    try {
      const eng = getEngine();
      if (!started) await ensureStarted();
      if (s === 'osc') {
        await eng.startOsc(oscFreq);
        eng.unmuteOut();
      } else if (s === 'mic') {
        await eng.startMic();
      } else if (s === 'file' && file) {
        eng.unmuteOut();
        await eng.startFile(file);
      }
      setSource(eng.source);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (s === 'mic') setMicError(`Mic blocked: ${msg}. Use Test tone or File instead (HTTPS required for mic).`);
      else setMicError(msg);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>FFT Studio</h1>
        <p>Web Audio FFT → log bands → smoothed visuals. Small phase: Bars + Wave + Radial.</p>
      </header>

      {!started ? (
        <div className="gate">
          <button
            className="primary"
            onClick={() => void handleSource('osc')}
          >
            Start audio (test tone)
          </button>
          <p className="hint">Browsers require a click before AudioContext can run.</p>
        </div>
      ) : (
        <>
          <Controls
            source={source}
            fftSize={fftSize}
            smoothing={smoothing}
            gain={gain}
            filterFreq={filterFreq}
            oscFreq={oscFreq}
            beatThreshold={beatThreshold}
            micError={micError}
            onSource={(s, f) => void handleSource(s, f)}
            onFftSize={(n) => {
              setFftSize(n);
              getEngine().setFftSize(n);
            }}
            onSmoothing={(n) => {
              setSmoothing(n);
              getEngine().setSmoothing(n);
            }}
            onGain={(n) => {
              setGain(n);
              getEngine().setGain(n);
            }}
            onFilterFreq={(n) => {
              setFilterFreq(n);
              getEngine().setFilterFreq(n);
            }}
            onOscFreq={(n) => {
              setOscFreq(n);
              getEngine().setOscFreq(n);
            }}
            onBeatThreshold={setBeatThreshold}
          />

          <div className="stats">
            <div>Bass <b>{stats.bass}</b></div>
            <div>Mid <b>{stats.mid}</b></div>
            <div>Treble <b>{stats.treble}</b></div>
            <div>Beat <b>{stats.beat}</b></div>
            <div>FPS <b>{stats.fps}</b></div>
            <div>Src <b>{source}</b></div>
          </div>

          <main className="viz-grid">
            <section>
              <h2>Log bars (32)</h2>
              <Bars bandsRef={bandsRef} numBands={numBands} running={started} />
            </section>
            <section>
              <h2>Radial + beat</h2>
              <Radial bandsRef={bandsRef} levelsRef={levelsRef} numBands={numBands} running={started} />
            </section>
            <section className="wide">
              <h2>Waveform (time domain)</h2>
              <Waveform waveRef={waveRef} running={started} />
            </section>
          </main>
        </>
      )}
    </div>
  );
}
