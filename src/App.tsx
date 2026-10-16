import { useEffect, useRef, useState } from 'react';
import { AudioEngine, type SourceKind } from './audio/AudioEngine';
import { deletePreset, loadPresets, savePreset, type Preset } from './audio/presets';
import { useAudioAnalyzer, type AnalyzerMode } from './hooks/useAudioAnalyzer';
import { useRecorder } from './hooks/useRecorder';
import { Controls } from './components/Controls';
import { Bars } from './visuals/Bars';
import { Waveform } from './visuals/Waveform';
import { Radial } from './visuals/Radial';
import './App.css';

export default function App() {
  const engineRef = useRef<AudioEngine | null>(null);
  const barsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  const [started, setStarted] = useState(false);
  const [running] = useState(true);
  const [source, setSource] = useState<SourceKind>('none');
  const [fftSize, setFftSize] = useState(2048);
  const [smoothing, setSmoothing] = useState(0.8);
  const [gain, setGain] = useState(1);
  const [filterType, setFilterType] = useState<BiquadFilterType>('lowpass');
  const [filterFreq, setFilterFreq] = useState(20000);
  const [filterQ, setFilterQ] = useState(0.7);
  const [oscFreq, setOscFreq] = useState(110);
  const [beatThreshold, setBeatThreshold] = useState(12);
  const [mode, setMode] = useState<AnalyzerMode>('byte');
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets());
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
    mode,
  );
  const rec = useRecorder(barsCanvasRef);

  useEffect(() => {
    return () => engineRef.current?.dispose();
  }, []);

  const ensureStarted = async () => {
    const eng = getEngine();
    await eng.init();
    eng.setFftSize(fftSize);
    eng.setSmoothing(smoothing);
    eng.setGain(gain);
    eng.setFilterType(filterType);
    eng.setFilterFreq(filterFreq);
    eng.setFilterQ(filterQ);
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

  const applyPreset = (pr: Preset) => {
    setFftSize(pr.fftSize);
    setSmoothing(pr.smoothing);
    setGain(pr.gain);
    setFilterType(pr.filterType);
    setFilterFreq(pr.filterFreq);
    setFilterQ(pr.filterQ);
    setBeatThreshold(pr.beatThreshold);
    const eng = getEngine();
    eng.setFftSize(pr.fftSize);
    eng.setSmoothing(pr.smoothing);
    eng.setGain(pr.gain);
    eng.setFilterType(pr.filterType);
    eng.setFilterFreq(pr.filterFreq);
    eng.setFilterQ(pr.filterQ);
  };

  return (
    <div className="app">
      <header>
        <h1>FFT Studio</h1>
        <p>Web Audio FFT → log bands → smoothed visuals. DSP playground: filter, dB, presets, record.</p>
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
            filterType={filterType}
            filterFreq={filterFreq}
            filterQ={filterQ}
            oscFreq={oscFreq}
            beatThreshold={beatThreshold}
            mode={mode}
            presets={presets}
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
            onFilterType={(t) => {
              setFilterType(t);
              getEngine().setFilterType(t);
            }}
            onFilterFreq={(n) => {
              setFilterFreq(n);
              getEngine().setFilterFreq(n);
            }}
            onFilterQ={(n) => {
              setFilterQ(n);
              getEngine().setFilterQ(n);
            }}
            onOscFreq={(n) => {
              setOscFreq(n);
              getEngine().setOscFreq(n);
            }}
            onBeatThreshold={setBeatThreshold}
            onMode={setMode}
            onSavePreset={(name) => {
              const next = savePreset({ name, fftSize, smoothing, gain, filterType, filterFreq, filterQ, beatThreshold });
              setPresets(next);
            }}
            onLoadPreset={(name) => {
              const pr = presets.find((x) => x.name === name);
              if (pr) applyPreset(pr);
            }}
            onDeletePreset={(name) => setPresets(deletePreset(name))}
          />

          <div className="stats">
            <div>Bass <b>{stats.bass}</b></div>
            <div>Mid <b>{stats.mid}</b></div>
            <div>Treble <b>{stats.treble}</b></div>
            <div>Beat <b>{stats.beat}</b></div>
            <div>FPS <b>{stats.fps}</b></div>
            <div>Src <b>{source}</b></div>
            <div>Mode <b>{mode}</b></div>
          </div>

          <div className="controls">
            <div className="row">
              <span className="label">Record bars</span>
              {!rec.recording ? (
                <button onClick={rec.start}>● Rec</button>
              ) : (
                <button onClick={rec.stop}>■ Stop</button>
              )}
              {rec.blobUrl && (
                <a href={rec.blobUrl} download="fft-bars.webm">
                  Download webm
                </a>
              )}
            </div>
            {rec.error && <div className="error">{rec.error}</div>}
          </div>

          <main className="viz-grid">
            <section>
              <h2>Log bars (32)</h2>
              <Bars bandsRef={bandsRef} numBands={numBands} running={started} canvasRef={barsCanvasRef} />
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
