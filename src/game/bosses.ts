import { W } from './constants';
import type { BulletKind, Game } from './Game';
import type { BossKind, EntityKind } from './types';
import { clamp, damp, rand, TAU } from './math';
import { BIRDS, circle, drawBird, drawDrone, drawShadow, ellipse, rr } from './draw';
import { spawnEntity } from './entities';
import { sfx } from './audio';

export interface Boss {
  kind: BossKind;
  name: string;
  title: string;
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  t: number;
  mode: string;
  /** tempo no modo atual */
  mt: number;
  /** temporizador de repetição dentro do modo */
  st: number;
  cool: number;
  seq: number;
  count: number;
  flash: number;
  homeY: number;
  tx: number;
  ty: number;
  ang: number;
  dir: number;
  dying: number;
}

export const BOSS_INFO: Record<BossKind, { name: string; title: string; hp: number; r: number }> = {
  carcara: { name: 'Gavião Carcará', title: 'O Terror dos Telhados', hp: 70, r: 40 },
  gaivota: { name: 'Gaivota Rainha', title: 'A Dona da Orla', hp: 95, r: 42 },
  drone: { name: 'Drone Vigia X-9', title: 'O Olho que Tudo Vê', hp: 120, r: 44 },
  urubu: { name: 'Urubu Rei', title: 'Senhor da Tempestade', hp: 140, r: 46 },
  heli: { name: 'Helicóptero da TV', title: 'Ao Vivo e a Cores', hp: 160, r: 50 },
  robogato: { name: 'Robo-Gato Mecha', title: 'O Pesadelo dos Pombos', hp: 240, r: 56 },
};

/** [fase 1, fase 2 (abaixo de 50% de vida)] */
const PATTERNS: Record<BossKind, [string[], string[]]> = {
  carcara: [['spread', 'dive', 'burst'], ['dive', 'ring', 'spread', 'dive', 'burst']],
  gaivota: [['fish', 'summon', 'sweep'], ['fish', 'sweep', 'ring', 'summon', 'fish']],
  drone: [['lasers', 'burst', 'spiral'], ['lasers', 'spiral', 'burst', 'lasers', 'ring']],
  urubu: [['ring', 'dive', 'summon', 'ring2'], ['ring2', 'dive', 'spiral', 'summon', 'dive']],
  heli: [['spot', 'missiles', 'sweep'], ['spot', 'missiles', 'ring', 'sweep', 'burst']],
  robogato: [['lasers', 'spread', 'summon', 'spiral'], ['lasers', 'spiral', 'spot', 'ring2', 'summon', 'spread']],
};

const BK: Record<BossKind, BulletKind> = {
  carcara: 'feather', gaivota: 'fish', drone: 'spark', urubu: 'orb', heli: 'missile', robogato: 'orb',
};
const SWEEP_BK: Record<BossKind, BulletKind> = {
  carcara: 'feather', gaivota: 'poop', drone: 'spark', urubu: 'orb', heli: 'seed', robogato: 'spark',
};
const MINION: Record<BossKind, EntityKind> = {
  carcara: 'hawk', gaivota: 'seagull', drone: 'drone', urubu: 'bat', heli: 'drone', robogato: 'drone',
};

export function createBoss(kind: BossKind, hpScale = 1): Boss {
  const info = BOSS_INFO[kind];
  const hp = Math.round(info.hp * hpScale);
  return {
    kind, name: info.name, title: info.title, x: W / 2, y: -130, r: info.r, hp, maxHp: hp, t: 0,
    mode: 'enter', mt: 0, st: 0, cool: 1, seq: 0, count: 0, flash: 0, homeY: 175, tx: 0, ty: 0,
    ang: 0, dir: 1, dying: 0,
  };
}

function setMode(b: Boss, mode: string) {
  b.mode = mode;
  b.mt = 0;
  b.st = 0;
}

function toIdle(b: Boss, cool: number) {
  setMode(b, 'idle');
  b.cool = cool;
}

function startAttack(g: Game, b: Boss, p2: boolean) {
  const list = PATTERNS[b.kind][p2 ? 1 : 0];
  const atk = list[b.seq++ % list.length];
  const bs = g.bulletSpeed;
  const k = BK[b.kind];
  const p = g.player;
  switch (atk) {
    case 'spread': {
      const n = p2 ? 7 : 5;
      const a0 = g.aim(b.x, b.y);
      for (let i = 0; i < n; i++) g.fire(b.x, b.y + b.r * 0.4, a0 + (i - (n - 1) / 2) * 0.19, 235 * bs, k, 7);
      b.cool = 1.3;
      break;
    }
    case 'fish': {
      const n = p2 ? 5 : 3;
      const a0 = g.aim(b.x, b.y);
      for (let i = 0; i < n; i++) g.fire(b.x, b.y + 30, a0 + (i - (n - 1) / 2) * 0.32, 190 * bs, 'fish', 10);
      b.cool = 1.1;
      break;
    }
    case 'ring': {
      const n = p2 ? 20 : 15;
      const off = rand(0, TAU);
      for (let i = 0; i < n; i++) g.fire(b.x, b.y, off + (i / n) * TAU, 165 * bs, k, 7);
      b.cool = 1.5;
      break;
    }
    case 'ring2':
      setMode(b, 'rings');
      b.count = 3;
      return;
    case 'burst':
      setMode(b, 'burst');
      b.count = p2 ? 8 : 5;
      return;
    case 'dive':
      setMode(b, 'diveAim');
      sfx.screech();
      return;
    case 'sweep':
      setMode(b, 'sweep');
      b.dir = b.x < W / 2 ? 1 : -1;
      return;
    case 'spiral':
      setMode(b, 'spiral');
      b.ang = rand(0, TAU);
      return;
    case 'summon': {
      const kind = MINION[b.kind];
      const n = kind === 'drone' || kind === 'hawk' ? 2 : kind === 'bat' ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const e = spawnEntity(g, kind);
        e.x = clamp(b.x + (i - (n - 1) / 2) * 70, 100, W - 100);
        e.y = b.y;
        e.d.x0 = e.x;
        e.d.ty = b.y + 70 + i * 20;
      }
      b.cool = 1.8;
      break;
    }
    case 'lasers': {
      const n = p2 ? 3 : 2;
      const xs = [clamp(p.x, 30, W - 30)];
      let guard = 0;
      while (xs.length < n && guard++ < 40) {
        const x = rand(40, W - 40);
        if (xs.every((o) => Math.abs(o - x) > 90)) xs.push(x);
      }
      xs.forEach((x) => g.beam(x, b.y + b.r * 0.5, 36, 0.95, 0.5));
      sfx.warn();
      b.cool = 2.1;
      break;
    }
    case 'missiles': {
      const n = p2 ? 6 : 4;
      for (let i = 0; i < n; i++) {
        g.fire(b.x + (i - (n - 1) / 2) * 16, b.y + 20, Math.PI / 2 + (i - (n - 1) / 2) * 0.3, 200 * bs, 'missile', 7, 1.0);
      }
      b.cool = 1.8;
      break;
    }
    case 'spot': {
      const n = p2 ? 2 : 1;
      for (let i = 0; i < n; i++) g.zone(p.x + (i ? rand(-120, 120) : 0), p.y, 64, 1.5 + i * 0.4, i === 0);
      sfx.warn();
      b.cool = 2.2;
      break;
    }
  }
}

export function updateBoss(g: Game, b: Boss, dt: number) {
  b.t += dt;
  b.mt += dt;
  b.st += dt;
  b.flash = Math.max(0, b.flash - dt);
  const p = g.player;

  if (b.dying > 0) {
    b.dying -= dt;
    b.y += 25 * dt;
    b.x += rand(-2, 2);
    if (Math.random() < 0.35) g.explosion(b.x + rand(-b.r, b.r), b.y + rand(-b.r, b.r), 0.7);
    if (b.dying <= 0) g.bossDefeated();
    return;
  }

  const p2 = b.hp < b.maxHp * 0.5;
  const sp = p2 ? 1.35 : 1;
  const bs = g.bulletSpeed;

  switch (b.mode) {
    case 'enter':
      b.y += (b.homeY - b.y) * damp(1.8, dt);
      if (b.mt > 1.8) toIdle(b, 0.6);
      break;
    case 'idle':
      b.x += (clamp(p.x, 80, W - 80) - b.x) * damp(0.9, dt);
      b.y += (b.homeY + Math.sin(b.t * 1.4) * 12 - b.y) * damp(3, dt);
      b.cool -= dt * sp;
      if (b.cool <= 0) startAttack(g, b, p2);
      break;
    case 'burst':
      if (b.st >= 0.15 / sp) {
        b.st = 0;
        g.fire(b.x, b.y + b.r * 0.4, g.aim(b.x, b.y) + rand(-0.06, 0.06), 270 * bs, BK[b.kind], 6, b.kind === 'heli' ? 0.6 : 0);
        if (--b.count <= 0) toIdle(b, 1);
      }
      break;
    case 'rings':
      if (b.st >= 0.38) {
        b.st = 0;
        const n = p2 ? 16 : 12;
        const off = b.count * (Math.PI / n);
        for (let i = 0; i < n; i++) g.fire(b.x, b.y, off + (i / n) * TAU, 160 * bs, BK[b.kind], 7);
        if (--b.count <= 0) toIdle(b, 1.3);
      }
      break;
    case 'diveAim':
      if (b.mt < 0.55) {
        b.tx = p.x;
        b.ty = p.y;
      }
      b.x += Math.sin(b.t * 40) * 1.2;
      if (b.mt > 0.8) setMode(b, 'dive');
      break;
    case 'dive': {
      const dx = b.tx - b.x;
      const dy = b.ty - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const v = 780 * sp * dt;
      if (d <= v || b.mt > 1.4) {
        setMode(b, 'return');
        if (p2) {
          const n = 10;
          for (let i = 0; i < n; i++) g.fire(b.x, b.y, (i / n) * TAU, 150 * bs, BK[b.kind], 6);
        }
      } else {
        b.x += (dx / d) * v;
        b.y += (dy / d) * v;
      }
      break;
    }
    case 'return':
      b.x += (clamp(p.x, 80, W - 80) - b.x) * damp(1.5, dt);
      b.y += (b.homeY - b.y) * damp(2.5, dt);
      if (b.mt > 1.1) toIdle(b, 0.5);
      break;
    case 'sweep': {
      const target = b.dir > 0 ? W - 60 : 60;
      b.x += b.dir * 290 * sp * dt;
      b.y += (b.homeY - 20 - b.y) * damp(3, dt);
      if (b.st >= 0.13) {
        b.st = 0;
        g.fire(b.x, b.y + b.r * 0.5, Math.PI / 2 + rand(-0.1, 0.1), 210 * bs, SWEEP_BK[b.kind], 7);
      }
      if ((b.dir > 0 && b.x >= target) || (b.dir < 0 && b.x <= target)) toIdle(b, 0.9);
      break;
    }
    case 'spiral':
      if (b.st >= 0.075 / sp) {
        b.st = 0;
        b.ang += 0.32;
        const arms = p2 ? 3 : 2;
        for (let a = 0; a < arms; a++) g.fire(b.x, b.y, b.ang + (a * TAU) / arms, 175 * bs, BK[b.kind], 6);
      }
      if (b.mt > 2.6) toIdle(b, 1.2);
      break;
  }
}

// ---------------------------------------------------------------- desenho

function drawHeli(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  drawShadow(ctx, x + 40, y + 60, 50, 34, 0.2);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(-5, -78, 10, 62);
  ctx.fillRect(-15, -82, 30, 8);
  const ta = t * 30;
  ctx.strokeStyle = 'rgba(20,20,20,0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(18 + Math.cos(ta) * 10, -78 + Math.sin(ta) * 10);
  ctx.lineTo(18 - Math.cos(ta) * 10, -78 - Math.sin(ta) * 10);
  ctx.stroke();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-26, -24);
  ctx.lineTo(-26, 34);
  ctx.moveTo(26, -24);
  ctx.lineTo(26, 34);
  ctx.stroke();
  ctx.fillStyle = '#2563eb';
  ctx.strokeStyle = '#0f1f4d';
  ctx.lineWidth = 2;
  ellipse(ctx, 0, 4, 24, 38);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#93c5fd';
  ellipse(ctx, 0, 26, 17, 13);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  rr(ctx, -15, -14, 30, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#e63946';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TV', 0, -4.5);
  ctx.fillStyle = 'rgba(30,30,30,0.12)';
  circle(ctx, 0, 0, 74);
  ctx.fill();
  const a = t * 22;
  ctx.strokeStyle = 'rgba(15,15,15,0.7)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(Math.cos(a) * 74, Math.sin(a) * 74);
  ctx.lineTo(-Math.cos(a) * 74, -Math.sin(a) * 74);
  ctx.moveTo(Math.cos(a + Math.PI / 2) * 74, Math.sin(a + Math.PI / 2) * 74);
  ctx.lineTo(-Math.cos(a + Math.PI / 2) * 74, -Math.sin(a + Math.PI / 2) * 74);
  ctx.stroke();
  ctx.fillStyle = '#111';
  circle(ctx, 0, 0, 5);
  ctx.fill();
  ctx.restore();
}

function drawRoboCat(ctx: CanvasRenderingContext2D, b: Boss, t: number) {
  const p2 = b.hp < b.maxHp * 0.5;
  drawShadow(ctx, b.x + 40, b.y + 60, 70, 40, 0.22);
  ctx.save();
  ctx.translate(b.x, b.y);
  // braços com garras
  for (const side of [-1, 1]) {
    const hx = side * 74;
    const hy = 22 + Math.sin(t * 3 + side) * 7;
    ctx.strokeStyle = '#5f6b7a';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(side * 40, -6);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.fillStyle = '#7f8c9d';
    circle(ctx, hx, hy, 11);
    ctx.fill();
    ctx.fillStyle = '#e8edf1';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + i * 7 - 3, hy + 6);
      ctx.lineTo(hx + i * 9, hy + 30 + Math.abs(i) * -4);
      ctx.lineTo(hx + i * 7 + 3, hy + 6);
      ctx.closePath();
      ctx.fill();
    }
  }
  // orelhas
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#7f8c9d';
    ctx.beginPath();
    ctx.moveTo(side * 46, -18);
    ctx.lineTo(side * 32, -66);
    ctx.lineTo(side * 10, -40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff7aa2';
    ctx.beginPath();
    ctx.moveTo(side * 38, -24);
    ctx.lineTo(side * 31, -54);
    ctx.lineTo(side * 18, -38);
    ctx.closePath();
    ctx.fill();
  }
  // cabeça metálica
  const g = ctx.createRadialGradient(-14, -16, 8, 0, 0, 58);
  g.addColorStop(0, '#d5dde2');
  g.addColorStop(1, '#5c676f');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#2d3436';
  ctx.lineWidth = 3;
  circle(ctx, 0, 0, 54);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(45,52,54,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-54, -4);
  ctx.quadraticCurveTo(0, -22, 54, -4);
  ctx.moveTo(0, -54);
  ctx.lineTo(0, -20);
  ctx.stroke();
  ctx.fillStyle = 'rgba(45,52,54,0.6)';
  for (const [rx, ry] of [[-36, -26], [36, -26], [-44, 10], [44, 10]]) {
    circle(ctx, rx, ry, 2);
    ctx.fill();
  }
  // olhos
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(255,45,85,${0.35 + 0.15 * Math.sin(t * 8)})`;
  circle(ctx, -20, 14, 18);
  ctx.fill();
  circle(ctx, 20, 14, 18);
  ctx.fill();
  ctx.restore();
  for (const side of [-1, 1]) {
    ctx.fillStyle = p2 ? '#ffea00' : '#ff2d55';
    ellipse(ctx, side * 20, 14, 11, 8);
    ctx.fill();
    ctx.fillStyle = '#300010';
    ellipse(ctx, side * 20, 14, 2.4, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#ff7aa2';
  ctx.beginPath();
  ctx.moveTo(-5, 28);
  ctx.lineTo(5, 28);
  ctx.lineTo(0, 34);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2d3436';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.quadraticCurveTo(-5, 41, -10, 37);
  ctx.moveTo(0, 34);
  ctx.quadraticCurveTo(5, 41, 10, 37);
  ctx.stroke();
  ctx.strokeStyle = '#eef2f4';
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(side * 14, 32 + i * 3);
      ctx.lineTo(side * 52, 24 + i * 9);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#2d3436';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -54);
  ctx.lineTo(0, -74);
  ctx.stroke();
  ctx.fillStyle = Math.sin(t * 7) > 0 ? '#ff3b30' : '#7a1f28';
  circle(ctx, 0, -76, 4);
  ctx.fill();
  if (p2) {
    ctx.strokeStyle = '#1e272e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-30, -36);
    ctx.lineTo(-20, -22);
    ctx.lineTo(-26, -10);
    ctx.moveTo(24, 36);
    ctx.lineTo(34, 26);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBoss(ctx: CanvasRenderingContext2D, b: Boss, g: Game) {
  const t = g.t;
  ctx.save();
  if (b.flash > 0) ctx.filter = 'brightness(2.2)';
  const ang = b.mode === 'dive' ? Math.atan2(b.ty - b.y, b.tx - b.x) + Math.PI / 2 : Math.PI;
  switch (b.kind) {
    case 'carcara':
      drawBird(ctx, b.x, b.y, ang, 2.5, t, BIRDS.carcara, 7);
      break;
    case 'gaivota':
      drawBird(ctx, b.x, b.y, ang, 2.6, t, BIRDS.queenGull, 6);
      break;
    case 'urubu':
      drawBird(ctx, b.x, b.y, ang, 2.9, t, BIRDS.kingVulture, 5);
      break;
    case 'drone':
      drawDrone(ctx, b.x, b.y, 2.4, t, true);
      break;
    case 'heli':
      drawHeli(ctx, b.x, b.y, t);
      break;
    case 'robogato':
      drawRoboCat(ctx, b, t);
      break;
  }
  ctx.filter = 'none';
  if (b.mode === 'diveAim') {
    ctx.strokeStyle = `rgba(255,50,50,${0.5 + 0.4 * Math.sin(t * 30)})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.tx, b.ty);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,50,50,0.8)';
    ctx.lineWidth = 2;
    circle(ctx, b.tx, b.ty, 22);
    ctx.stroke();
  }
  ctx.restore();
}
