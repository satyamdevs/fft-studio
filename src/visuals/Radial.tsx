import { useEffect, useRef, type RefObject } from 'react';

interface Props {
  bandsRef: RefObject<Float32Array>;
  levelsRef: RefObject<{ bass: number; mid: number; treble: number; beat: number }>;
  numBands: number;
  running: boolean;
}

/** Polar spectrum — radius = magnitude, beat pulses the core. Cheap but looks premium. */
export function Radial({ bandsRef, levelsRef, numBands, running }: Props) {
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

      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h) * 0.22;
      const maxR = Math.min(w, h) * 0.46;
      const beat = levelsRef.current.beat ?? 0;

      // Beat core.
      const coreR = base * 0.45 * (1 + beat * 0.6);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
      grad.addColorStop(0, `rgba(34,211,238,${0.5 + beat * 0.5})`);
      grad.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 2, 0, Math.PI * 2);
      ctx.fill();

      const bands = bandsRef.current;
      for (let i = 0; i < numBands; i++) {
        const v = (bands[i] ?? 0) / 255;
        const angle = (i / numBands) * Math.PI * 2 - Math.PI / 2;
        const r0 = base;
        const r1 = base + v * (maxR - base);
        const hue = 190 + (i / numBands) * 120;
        ctx.strokeStyle = `hsl(${hue} 90% ${50 + v * 15}%)`;
        ctx.lineWidth = Math.max(2 * dpr, ((Math.PI * 2 * base) / numBands) * 0.55);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0);
        ctx.lineTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bandsRef, levelsRef, numBands, running]);

  return <canvas ref={canvasRef} className="viz-canvas square" aria-label="Radial spectrum" />;
}
