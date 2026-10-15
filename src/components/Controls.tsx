import type { SourceKind } from '../audio/AudioEngine';

interface Props {
  source: SourceKind;
  fftSize: number;
  smoothing: number;
  gain: number;
  filterFreq: number;
  oscFreq: number;
  beatThreshold: number;
  micError: string | null;
  onSource: (s: SourceKind, file?: File) => void;
  onFftSize: (n: number) => void;
  onSmoothing: (n: number) => void;
  onGain: (n: number) => void;
  onFilterFreq: (n: number) => void;
  onOscFreq: (n: number) => void;
  onBeatThreshold: (n: number) => void;
}

export function Controls(p: Props) {
  return (
    <div className="controls">
      <div className="row">
        <span className="label">Source</span>
        <div className="btn-group">
          <button className={p.source === 'osc' ? 'active' : ''} onClick={() => p.onSource('osc')}>
            Test tone
          </button>
          <button className={p.source === 'mic' ? 'active' : ''} onClick={() => p.onSource('mic')}>
            Mic
          </button>
          <label className={`file-btn ${p.source === 'file' ? 'active' : ''}`}>
            File
            <input
              type="file"
              accept="audio/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) p.onSource('file', f);
              }}
            />
          </label>
        </div>
      </div>
      {p.micError && <div className="error">{p.micError}</div>}

      <div className="grid">
        <label>
          FFT {p.fftSize}
          <select value={p.fftSize} onChange={(e) => p.onFftSize(Number(e.target.value))}>
            {[512, 1024, 2048, 4096, 8192].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Smoothing {p.smoothing.toFixed(2)}
          <input
            type="range"
            min={0}
            max={0.95}
            step={0.01}
            value={p.smoothing}
            onChange={(e) => p.onSmoothing(Number(e.target.value))}
          />
        </label>
        <label>
          Gain {p.gain.toFixed(2)}
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={p.gain}
            onChange={(e) => p.onGain(Number(e.target.value))}
          />
        </label>
        <label>
          Lowpass {p.filterFreq >= 20000 ? 'off' : `${p.filterFreq}Hz`}
          <input
            type="range"
            min={200}
            max={20000}
            step={10}
            value={p.filterFreq}
            onChange={(e) => p.onFilterFreq(Number(e.target.value))}
          />
        </label>
        <label>
          Tone {p.oscFreq}Hz
          <input
            type="range"
            min={40}
            max={880}
            step={1}
            value={p.oscFreq}
            onChange={(e) => p.onOscFreq(Number(e.target.value))}
          />
        </label>
        <label>
          Beat thr {p.beatThreshold}
          <input
            type="range"
            min={2}
            max={40}
            step={1}
            value={p.beatThreshold}
            onChange={(e) => p.onBeatThreshold(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
