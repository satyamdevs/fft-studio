export interface Preset {
  name: string;
  fftSize: number;
  smoothing: number;
  gain: number;
  filterType: BiquadFilterType;
  filterFreq: number;
  filterQ: number;
  beatThreshold: number;
}

const KEY = 'fft-studio:presets:v1';

export const FACTORY_PRESETS: Preset[] = [
  { name: 'Bass Test', fftSize: 2048, smoothing: 0.8, gain: 1, filterType: 'lowpass', filterFreq: 300, filterQ: 0.7, beatThreshold: 12 },
  { name: 'Vocal', fftSize: 2048, smoothing: 0.8, gain: 1, filterType: 'bandpass', filterFreq: 1000, filterQ: 2, beatThreshold: 12 },
  { name: 'Airy', fftSize: 4096, smoothing: 0.85, gain: 1, filterType: 'highpass', filterFreq: 4000, filterQ: 0.7, beatThreshold: 14 },
];

export function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [...FACTORY_PRESETS];
    const parsed = JSON.parse(raw) as Preset[];
    if (!Array.isArray(parsed)) return [...FACTORY_PRESETS];
    return parsed;
  } catch {
    return [...FACTORY_PRESETS];
  }
}

export function savePreset(p: Preset): Preset[] {
  const all = loadPresets().filter((x) => x.name !== p.name);
  all.push(p);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage full/blocked — keep in-memory list */
  }
  return all;
}

export function deletePreset(name: string): Preset[] {
  const all = loadPresets().filter((x) => x.name !== name);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  return all;
}
