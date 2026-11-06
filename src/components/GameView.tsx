import { useEffect, useMemo, useRef, useState } from 'react';
import { Game } from '../game/Game';
import { Input } from '../game/input';
import { W, H } from '../game/constants';
import type { GameResult, MissionDef, SkinDef, Upgrades } from '../game/types';

interface Props {
  mission: MissionDef;
  skin: SkinDef;
  upgrades: Upgrades;
  muted: boolean;
  onEnd: (r: GameResult) => void;
  onQuit: () => void;
  onToggleMute: () => void;
}

export default function GameView({ mission, skin, upgrades, muted, onEnd, onQuit, onToggleMute }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const [paused, setPaused] = useState(false);
  const [run, setRun] = useState(0);
  const isTouch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !wrap || !ctx) return;

    const input = new Input();
    const game = new Game(mission, skin, upgrades, input, { onEnd: (r) => onEndRef.current(r), onPause: setPaused }, isTouch);
    gameRef.current = game;
    setPaused(false);
    if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;

    let scale = 1;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      scale = Math.min(window.innerWidth / W, window.innerHeight / H);
      const cw = Math.floor(W * scale);
      const ch = Math.floor(H * scale);
      wrap.style.width = `${cw}px`;
      wrap.style.height = `${ch}px`;
      canvas.width = Math.floor(cw * dpr);
      canvas.height = Math.floor(ch * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const toLocal = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    };
    const onDown = (e: PointerEvent) => {
      if (game.paused) return;
      canvas.setPointerCapture(e.pointerId);
      const p = toLocal(e);
      input.pointer = { active: true, x: p.x, y: p.y, id: e.pointerId };
    };
    const onMove = (e: PointerEvent) => {
      if (!input.pointer.active || e.pointerId !== input.pointer.id) return;
      const p = toLocal(e);
      input.pointer.x = p.x;
      input.pointer.y = p.y;
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === input.pointer.id) input.pointer.active = false;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const onVis = () => {
      if (document.hidden) game.setPaused(true);
    };
    document.addEventListener('visibilitychange', onVis);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      game.update(dt);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      game.render(ctx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      input.dispose();
      gameRef.current = null;
    };
  }, [run, mission, skin, upgrades, isTouch]);

  const resume = () => gameRef.current?.setPaused(false);

  return (
    <div className="game-screen">
      <div className="game-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} className="game-canvas" />
        <button className="hud-btn hud-pause" aria-label="Pausar" onClick={() => gameRef.current?.setPaused(true)}>
          ❚❚
        </button>
        <button
          className="hud-btn hud-skill"
          aria-label="Usar habilidade"
          onPointerDown={(e) => {
            e.stopPropagation();
            gameRef.current?.input.press('skill');
          }}
        />
        {paused && (
          <div className="pause-overlay">
            <div className="pause-panel">
              <h2>Pausado</h2>
              <p className="pause-mission">{mission.title}</p>
              <button className="btn btn-primary" onClick={resume}>▶ Continuar</button>
              <button className="btn btn-secondary" onClick={() => setRun((r) => r + 1)}>↻ Recomeçar</button>
              <button className="btn btn-ghost" onClick={onToggleMute}>{muted ? '🔇 Som desligado' : '🔊 Som ligado'}</button>
              <button className="btn btn-danger" onClick={onQuit}>✕ Desistir da entrega</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
