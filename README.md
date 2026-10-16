# FFT Studio — Dynamic Audio Visualizer & DSP Playground

Real-time audio → FFT → 32 log bands → smoothed Canvas2D visuals, with a DSP playground (filter, dB, presets, recording).

## Run

```bash
npm run dev     # open localhost, click Start audio (test tone)
npm run lint
npx vitest run
npm run build
npm run preview
```

## Architecture

```
[file | mic | osc] -> AudioContext -> Gain -> BiquadFilter -> Analyser -> destination (muted for mic)
  -> rAF: getByteFrequencyData (+ getFloatFrequencyData in dB mode) + time domain
  -> dsp.ts: log bands + attack/release smooth + bass/mid/treble + beat flux
  -> refs (no per-frame React state) -> Bars / Radial / Waveform
  -> stats @5Hz + presets (localStorage) + webm recording
```

## Controls

- Source: test tone / mic / audio file
- Mode: byte (0-255) vs dB (`getFloatFrequencyData`, -100..-30 mapped to 0-1)
- FFT 512-8192, smoothing, gain, filter type (`lowpass/highpass/bandpass/notch`) + freq + Q, tone freq, beat threshold
- Presets: factory `Bass Test / Vocal / Airy` + save/load/delete in `localStorage`
- Record: captures Bars canvas to `webm` download

## DSP notes

- `binHz = sampleRate / fftSize`, `nyquist = sampleRate / 2`
- Log bands: `20 * (top/20)^(i/32)` from 20Hz to Nyquist — fixes dead-bass of linear splits
- Smoothing: native `smoothingTimeConstant` + manual attack 0.45 / release 0.08
- Beat: `flux = max(0, bassNow - bassPrev)`, fire at threshold, decay `*0.92`

## Demo

1. Start on test tone → Bars move, radial core pulses on beat
2. FFT 512 vs 8192 → granularity vs transient lag
3. Lowpass 500Hz kills treble, highpass 2k kills bass, Q sharpens bandpass (raise gain)
4. dB mode reveals quiet detail byte mode crushes
5. Save preset → reload restores all DSP sliders

## Tests

`src/audio/dsp.test.ts` — band mapping, 440Hz peak lands in right band, dB mapping, attack>release, beat fire/decay.
