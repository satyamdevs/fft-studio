// Single-owner Web Audio graph. One AudioContext per page — create on user gesture.

export type SourceKind = 'file' | 'mic' | 'osc' | 'none';

const AudioCtx =
  window.AudioContext ??
  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

export class AudioEngine {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  private inputGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;

  private bufferSource: AudioBufferSourceNode | null = null;
  private mediaStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private osc: OscillatorNode | null = null;
  private oscGain: GainNode | null = null;

  source: SourceKind = 'none';
  sampleRate = 44100;

  async init(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    this.ctx = new AudioCtx({ latencyHint: 'interactive' });
    this.sampleRate = this.ctx.sampleRate;

    this.inputGain = this.ctx.createGain();
    this.inputGain.gain.value = 1;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 20000;
    this.filter.Q.value = 0.5;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // source -> gain -> filter -> analyser -> destination
    this.inputGain.connect(this.filter);
    this.filter.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  get ready(): boolean {
    return !!this.ctx && !!this.analyser;
  }

  get fftSize(): number {
    return this.analyser?.fftSize ?? 2048;
  }

  setFftSize(size: number): void {
    if (this.analyser) this.analyser.fftSize = size;
  }

  setSmoothing(v: number): void {
    if (this.analyser) this.analyser.smoothingTimeConstant = v;
  }

  setGain(v: number): void {
    if (this.ctx && this.inputGain) this.inputGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  setFilterFreq(hz: number): void {
    if (this.ctx && this.filter) this.filter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.02);
  }

  private stopCurrentSource(): void {
    try {
      this.bufferSource?.stop();
    } catch {
      /* already stopped */
    }
    this.bufferSource?.disconnect();
    this.bufferSource = null;

    this.osc?.stop();
    this.osc?.disconnect();
    this.osc = null;
    this.oscGain?.disconnect();
    this.oscGain = null;

    this.micSource?.disconnect();
    this.micSource = null;
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;

    this.source = 'none';
  }

  /** Play decoded audio file on loop. */
  async startFile(file: File): Promise<void> {
    await this.init();
    if (!this.ctx || !this.inputGain) return;
    this.stopCurrentSource();
    const buf = await file.arrayBuffer();
    const audioBuf = await this.ctx.decodeAudioData(buf.slice(0));
    const src = this.ctx.createBufferSource();
    src.buffer = audioBuf;
    src.loop = true;
    src.connect(this.inputGain);
    src.start();
    this.bufferSource = src;
    this.source = 'file';
  }

  /** Live microphone. NOT routed to speakers (feedback guard) — temporarily disconnect analyser out. */
  async startMic(): Promise<void> {
    await this.init();
    if (!this.ctx || !this.inputGain || !this.analyser) return;
    this.stopCurrentSource();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaStream = stream;
    const src = this.ctx.createMediaStreamSource(stream);
    src.connect(this.inputGain);
    // Avoid feedback: mute analyser -> destination while on mic.
    try {
      this.analyser.disconnect();
    } catch {
      /* not connected */
    }
    this.micSource = src;
    this.source = 'mic';
  }

  /** Test oscillator — works with no mic/file, great for dev. */
  async startOsc(freq = 110): Promise<void> {
    await this.init();
    if (!this.ctx || !this.inputGain || !this.analyser) return;
    this.stopCurrentSource();
    // Reconnect analyser to out (mic may have muted it).
    try {
      this.analyser.connect(this.ctx.destination);
    } catch {
      /* already connected */
    }
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = 0.15;
    osc.connect(g);
    g.connect(this.inputGain);
    osc.start();
    this.osc = osc;
    this.oscGain = g;
    this.source = 'osc';
  }

  setOscFreq(freq: number): void {
    if (this.ctx && this.osc) this.osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
  }

  /** Re-enable speaker out after mic (for file/osc). */
  unmuteOut(): void {
    if (!this.ctx || !this.analyser) return;
    try {
      this.analyser.connect(this.ctx.destination);
    } catch {
      /* already connected */
    }
  }

  stop(): void {
    this.stopCurrentSource();
  }

  dispose(): void {
    this.stopCurrentSource();
    this.inputGain?.disconnect();
    this.filter?.disconnect();
    this.analyser?.disconnect();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.analyser = null;
  }
}
