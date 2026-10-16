import { useState } from 'react';
import type { SourceKind } from '../audio/AudioEngine';
import type { AnalyzerMode } from '../hooks/useAudioAnalyzer';
import type { Preset } from '../audio/presets';

interface Props {
  source: SourceKind;
  fftSize: number;
  smoothing: number;
  gain: number;
  filterType: BiquadFilterType;
  filterFreq: number;
  filterQ: number;
  oscFreq: number;
  beatThreshold: number;
  mode: AnalyzerMode;
  presets: Preset[];
  micError: string | null;
  onSource: (s: SourceKind, file?: File) => void;
  onFftSize: (n: number) => void;
  onSmoothing: (n: number) => void;
  onGain: (n: number) => void;
  onFilterType: (t: BiquadFilterType) => void;
  onFilterFreq: (n: number) => void;
  onFilterQ: (n: number) => void;
  onOscFreq: (n: number) => void;
  onBeatThreshold: (n: number) => void;
  onMode: (m: AnalyzerMode) => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (name: string) => void;
  onDeletePreset: (name: string) => void;
}

export function Controls(p: Props) {
  const [presetName, setPresetName] = useState('');

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
        <span className="label">Mode</span>
        <div className="btn-group">
          <button className={p.mode === 'byte' ? 'active' : ''} onClick={() => p.onMode('byte')}>
            Byte
          </button>
          <button className={p.mode === 'db' ? 'active' : ''} onClick={() => p.onMode('db')}>
            dB
          </button>
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
          Filter {p.filterType}
          <select
            value={p.filterType}
            onChange={(e) => p.onFilterType(e.target.value as BiquadFilterType)}
          >
            {(['lowpass', 'highpass', 'bandpass', 'notch'] as BiquadFilterType[]).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Filter freq {p.filterFreq >= 20000 && p.filterType === 'lowpass' ? 'off' : `${p.filterFreq}Hz`}
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
          Q {p.filterQ.toFixed(1)} (narrows band, level drops — raise gain)
          <input
            type="range"
            min={0.1}
            max={12}
            step={0.1}
            value={p.filterQ}
            onChange={(e) => p.onFilterQ(Number(e.target.value))}
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

      <div className="row" style={{ marginTop: 10 }}>
        <span className="label">Preset</span>
        <input
          placeholder="name…"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          style={{ maxWidth: 140 }}
        />
        <button onClick={() => presetName.trim() && p.onSavePreset(presetName.trim())}>Save</button>
        <select
          defaultValue=""
          onChange={(e) => e.target.value && p.onLoadPreset(e.target.value)}
          aria-label="Load preset"
        >
          <option value="">Load…</option>
          {p.presets.map((pr) => (
            <option key={pr.name} value={pr.name}>
              {pr.name}
            </option>
          ))}
        </select>
        <select
          defaultValue=""
          onChange={(e) => e.target.value && p.onDeletePreset(e.target.value)}
          aria-label="Delete preset"
        >
          <option value="">Delete…</option>
          {p.presets.map((pr) => (
            <option key={pr.name} value={pr.name}>
              {pr.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
