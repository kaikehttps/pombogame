import { useEffect, useRef } from 'react';
import { drawPigeon } from '../game/draw';
import type { PigeonLook } from '../game/types';

interface Props {
  look: PigeonLook;
  size?: number;
  carrying?: boolean;
  dim?: boolean;
}

export default function PigeonPreview({ look, size = 120, carrying = true, dim = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    const start = performance.now() - Math.random() * 1000;
    let raf = 0;
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      drawPigeon(ctx, look, size / 2, size / 2 - size * 0.06 + Math.sin(t * 2) * size * 0.02, {
        t,
        scale: size / 82,
        carrying,
        bank: Math.sin(t * 0.9) * 0.35,
        alpha: dim ? 0.55 : 1,
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [look, size, carrying, dim]);

  return <canvas ref={ref} className="pigeon-preview" style={{ width: size, height: size }} />;
}
