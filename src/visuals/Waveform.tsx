import { useEffect, useRef, type RefObject } from 'react';

interface Props {
  waveRef: RefObject<Uint8Array>;
  running: boolean;
}

export function Waveform({ waveRef, running }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, w, h);

      const data = waveRef.current;
      if (data.length === 0) return;

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      const step = Math.max(1, Math.floor(data.length / w));
      for (let x = 0; x < w; x++) {
        const idx = Math.min(data.length - 1, Math.floor((x / w) * data.length));
        void step;
        const v = (data[idx] ?? 128) / 255; // 0..1, 0.5 = silence
        const y = h - v * h;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Center line.
      ctx.strokeStyle = 'rgba(148,163,184,0.35)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [waveRef, running]);

  return <canvas ref={canvasRef} className="viz-canvas short" aria-label="Time-domain waveform" />;
}
