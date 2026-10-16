import { useEffect, useRef, type RefObject } from 'react';

interface Props {
  bandsRef: RefObject<Float32Array>;
  numBands: number;
  running: boolean;
  canvasRef?: RefObject<HTMLCanvasElement | null>;
}

export function Bars({ bandsRef, numBands, running, canvasRef }: Props) {
  const innerRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? innerRef;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = ref.current;
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

      const bands = bandsRef.current;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, w, h);

      const gap = 4 * dpr;
      const bw = (w - gap * (numBands - 1)) / numBands;
      for (let i = 0; i < numBands; i++) {
        const v = (bands[i] ?? 0) / 255; // 0..1
        const bh = Math.max(2 * dpr, v * (h - 24 * dpr));
        const x = i * (bw + gap);
        const y = h - bh;

        // Bass=cyan -> mid=violet -> treble=magenta gradient by index.
        const hue = 190 + (i / numBands) * 120;
        ctx.fillStyle = `hsl(${hue} 90% ${45 + v * 20}%)`;
        ctx.fillRect(x, y, bw, bh);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bandsRef, numBands, running, ref]);

  return <canvas ref={ref} className="viz-canvas" aria-label="Log frequency bars" />;
}
