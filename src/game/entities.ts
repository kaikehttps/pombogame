import { W, H } from './constants';
import type { Game } from './Game';
import type { EntityKind } from './types';
import { clamp, damp, dist2, hash, pick, rand, randInt, segDist2, TAU } from './math';
import { BIRDS, circle, drawBat, drawBird, drawDrone, drawPigeon, drawShadow, ellipse, outlinedText, rr } from './draw';
import { sfx } from './audio';
import { FRIEND_LOOK } from '../data/skins';

export interface Entity {
  kind: EntityKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  t: number;
  /** Quanto do movimento do chão a entidade acompanha (1 = presa ao cenário, 0 = espaço da tela). */
  scrollF: number;
  hostile: boolean;
  shootable: boolean;
  dead: boolean;
  state: number;
  st: number;
  flash: number;
  d: Record<string, number>;
  color: string;
}

/** Moedas que cada inimigo/obstáculo solta ao ser destruído. */
export const LOOT: Partial<Record<EntityKind, number>> = {
  balloon: 3, seagull: 2, hawk: 3, drone: 4, bat: 1, chinelo: 1, kite: 2, plane: 6, wire: 1,
};

const DESTRUCTIBLE = new Set<EntityKind>(['wire', 'balloon', 'kite', 'chinelo', 'plane', 'seagull', 'hawk', 'drone', 'bat']);
export const isDestructible = (e: Entity) => DESTRUCTIBLE.has(e.kind);
export const isCreature = (e: Entity) => e.kind === 'seagull' || e.kind === 'hawk' || e.kind === 'bat';

const BALLOON_COLORS = ['#ff4d6d', '#ffd23f', '#3bceac', '#5e60ce', '#ff8c42', '#ee6c4d'];
const KITE_COLORS: [string, string][] = [['#e63946', '#f1faee'], ['#ffb703', '#023047'], ['#2a9d8f', '#e9c46a'], ['#8338ec', '#ffbe0b']];
const CHINELO_COLORS: [string, string][] = [['#2e9e4f', '#ffd400'], ['#1e5bd8', '#ffffff'], ['#f2f2f2', '#2e9e4f'], ['#ff5c8a', '#ffffff']];

function make(kind: EntityKind, x: number, y: number, o: Partial<Entity> = {}): Entity {
  return {
    kind, x, y, vx: 0, vy: 0, r: 16, hp: 1, t: 0, scrollF: 1, hostile: true, shootable: false,
    dead: false, state: 0, st: 0, flash: 0, d: {}, color: '#fff', ...o,
  };
}

export function spawnEntity(g: Game, kind: EntityKind): Entity {
  const p = g.player;
  const diff = g.diff;
  let e: Entity;
  switch (kind) {
    case 'wire': {
      e = make('wire', W / 2, -30, { r: 0 });
      const type = Math.random();
      const gap = clamp(150 - diff * 7, 100, 150);
      e.d.a2 = -1;
      e.d.b2 = -1;
      if (type < 0.35) {
        e.d.a1 = 0;
        e.d.b1 = rand(W * 0.42, W * 0.68);
      } else if (type < 0.7) {
        e.d.a1 = rand(W * 0.32, W * 0.58);
        e.d.b1 = W;
      } else {
        const c = rand(gap / 2 + 40, W - gap / 2 - 40);
        e.d.a1 = 0;
        e.d.b1 = c - gap / 2;
        e.d.a2 = c + gap / 2;
        e.d.b2 = W;
      }
      e.d.seed = Math.random() * 1000;
      break;
    }
    case 'balloon': {
      e = make('balloon', rand(40, W - 40), -40, { r: 19, hp: 1, shootable: true, scrollF: 0.8, vy: -15, color: pick(BALLOON_COLORS) });
      e.d.x0 = e.x;
      e.d.ph = rand(0, TAU);
      break;
    }
    case 'kite': {
      e = make('kite', 0, -70, { r: 15, scrollF: 0.85, hp: 2 });
      e.d.amp = rand(60, 130);
      e.d.cx = rand(e.d.amp + 25, W - e.d.amp - 25);
      e.d.spd = rand(1, 1.7);
      e.d.ph = rand(0, TAU);
      e.d.len = rand(170, 240);
      e.d.ax = e.d.cx + rand(-60, 60);
      e.d.c = randInt(0, KITE_COLORS.length - 1);
      e.x = e.d.cx;
      break;
    }
    case 'cloud': {
      e = make('cloud', rand(90, W - 90), -100, { r: 0, scrollF: 0.55, vx: rand(-20, 20) });
      e.st = rand(0.6, 1.4);
      e.d.R = 78;
      break;
    }
    case 'plane': {
      const side = Math.random() < 0.5 ? -1 : 1;
      const y = clamp(p.y + rand(-220, 40), 150, H - 130);
      e = make('plane', side < 0 ? -120 : W + 120, y, { r: 0, scrollF: 0, st: 1.4 });
      e.d.dir = -side;
      sfx.warn();
      break;
    }
    case 'chinelo': {
      const side = Math.random() < 0.5 ? -1 : 1;
      e = make('chinelo', side < 0 ? -24 : W + 24, clamp(p.y + rand(-160, 80), 160, H - 80), { r: 13, scrollF: 0, st: 0.75 });
      e.d.dir = -side;
      e.d.rot = 0;
      e.d.c = randInt(0, CHINELO_COLORS.length - 1);
      break;
    }
    case 'wind': {
      e = make('wind', W / 2, -90, { r: 0, hostile: false });
      e.d.dir = Math.random() < 0.5 ? -1 : 1;
      e.d.h = 150;
      e.d.seed = Math.random() * 100;
      break;
    }
    case 'seagull': {
      e = make('seagull', rand(40, W - 40), -30, { r: 15, hp: 2, shootable: true, scrollF: 0.35, vy: rand(110, 150) + diff * 8 });
      e.d.x0 = e.x;
      e.d.amp = rand(20, 70);
      e.d.ph = rand(0, TAU);
      e.d.f = rand(1.5, 2.5);
      break;
    }
    case 'hawk': {
      e = make('hawk', clamp(p.x + rand(-120, 120), 40, W - 40), -40, { r: 17, hp: 3, shootable: true, scrollF: 0 });
      e.d.ty = rand(70, 160);
      e.d.ang = Math.PI / 2;
      break;
    }
    case 'drone': {
      e = make('drone', rand(100, W - 100), -30, { r: 18, hp: 4 + Math.floor(diff / 3), shootable: true, scrollF: 0 });
      e.d.x0 = e.x;
      e.d.ty = rand(90, 230);
      e.d.fire = 1.1;
      break;
    }
    case 'bat': {
      e = make('bat', rand(40, W - 40), -20, { r: 12, hp: 1, shootable: true, scrollF: 0.3, vy: rand(170, 220) });
      e.d.dir = Math.random() < 0.5 ? -1 : 1;
      e.st = rand(0.2, 0.5);
      break;
    }
    case 'friend':
    default: {
      e = make('friend', rand(60, W - 60), -30, { r: 18, hostile: false, scrollF: 0.45, vy: 30 });
      break;
    }
  }
  g.entities.push(e);
  return e;
}

export function updateEntity(g: Game, e: Entity, dt: number) {
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.y += g.scroll * e.scrollF * dt;
  const p = g.player;
  const d = e.d;
  switch (e.kind) {
    case 'balloon':
      e.y += e.vy * dt;
      e.x = d.x0 + Math.sin(e.t * 1.4 + d.ph) * 26;
      break;
    case 'kite':
      e.x = d.cx + Math.sin(e.t * d.spd + d.ph) * d.amp;
      break;
    case 'cloud':
      e.x += e.vx * dt;
      e.st -= dt;
      if (e.st <= 0) {
        if (e.state === 0) {
          e.state = 1;
          e.st = 0.95;
        } else if (e.state === 1) {
          e.state = 2;
          e.st = 0.25;
          if (e.y > -40 && e.y < H + 40) {
            sfx.zap();
            g.shake = Math.max(g.shake, 5);
          }
        } else {
          e.state = 0;
          e.st = rand(1.4, 2.4);
        }
      }
      break;
    case 'plane':
      if (e.state === 0) {
        e.st -= dt;
        if (e.st <= 0) {
          e.state = 1;
          e.vx = d.dir * (470 + g.diff * 18);
        }
      } else {
        e.x += e.vx * dt;
        if ((d.dir > 0 && e.x > W + 220) || (d.dir < 0 && e.x < -220)) e.dead = true;
      }
      return;
    case 'chinelo':
      if (e.state === 0) {
        e.st -= dt;
        if (e.st <= 0) {
          e.state = 1;
          e.vx = d.dir * rand(340, 430);
          e.vy = rand(-140, 30);
        }
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        d.rot += 14 * dt * d.dir;
        if (e.x < -60 || e.x > W + 60) e.dead = true;
      }
      return;
    case 'wind':
      if (Math.abs(p.y - e.y) < d.h / 2 && g.canAct()) p.vx += d.dir * 1300 * dt;
      break;
    case 'seagull':
      e.y += e.vy * dt;
      e.x = d.x0 + Math.sin(e.t * d.f + d.ph) * d.amp;
      break;
    case 'hawk':
      if (e.state === 0) {
        e.y += (d.ty - e.y) * damp(3, dt);
        e.x += (p.x - e.x) * damp(1.4, dt);
        d.ang = Math.PI / 2;
        if (e.t > 1.1) {
          e.state = 1;
          e.st = 0.6;
          sfx.screech();
        }
      } else if (e.state === 1) {
        e.st -= dt;
        if (e.st > 0.22) d.ang = Math.atan2(p.y - e.y, p.x - e.x);
        if (e.st <= 0) {
          e.state = 2;
          const sp = 560 + g.diff * 30;
          e.vx = Math.cos(d.ang) * sp;
          e.vy = Math.sin(d.ang) * sp;
        }
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
      break;
    case 'drone':
      if (e.state === 0) {
        e.y += (d.ty - e.y) * damp(2.5, dt);
        if (e.t > 1.2) e.state = 1;
      } else if (e.state === 1) {
        e.x = d.x0 + Math.sin((e.t - 1.2) * 1.3) * 80;
        e.y = d.ty + Math.sin(e.t * 2) * 6;
        d.fire -= dt;
        if (d.fire <= 0) {
          g.fire(e.x, e.y + 12, g.aim(e.x, e.y), 220 * g.bulletSpeed, 'spark', 6);
          d.fire = Math.max(0.8, 1.7 - g.diff * 0.08);
        }
        if (e.t > 7.5) e.state = 2;
      } else {
        e.vy -= 400 * dt;
        e.y += e.vy * dt;
        if (e.y < -60) e.dead = true;
      }
      break;
    case 'bat':
      e.y += e.vy * dt;
      e.x += d.dir * 230 * dt;
      e.st -= dt;
      if (e.st <= 0 || e.x < 20 || e.x > W - 20) {
        d.dir = e.x < 20 ? 1 : e.x > W - 20 ? -1 : -d.dir;
        e.st = rand(0.25, 0.55);
      }
      break;
    case 'friend':
      e.y += e.vy * dt;
      e.x += Math.sin(e.t * 2) * 30 * dt;
      break;
  }
  if (e.y > H + 320 || e.y < -400 || e.x < -200 || e.x > W + 200) e.dead = true;
}

export function entityHitsPlayer(e: Entity, px: number, py: number, pr: number): boolean {
  const d = e.d;
  switch (e.kind) {
    case 'wire': {
      if (Math.abs(py - e.y) > 8 + pr * 0.5) return false;
      if (px > d.a1 - pr * 0.4 && px < d.b1 + pr * 0.4) return true;
      return d.a2 >= 0 && px > d.a2 - pr * 0.4 && px < d.b2 + pr * 0.4;
    }
    case 'kite':
      if (dist2(px, py, e.x, e.y) < (e.r + pr * 0.8) ** 2) return true;
      return segDist2(px, py, e.x, e.y + 14, d.ax, e.y + d.len) < (pr * 0.45 + 1.5) ** 2;
    case 'cloud':
      return e.state === 2 && dist2(px, py, e.x, e.y) < (d.R + pr * 0.4) ** 2;
    case 'plane': {
      if (e.state !== 1) return false;
      const lx = (px - e.x) * d.dir;
      const ly = py - e.y;
      const r = pr * 0.5;
      if (Math.abs(lx) < 80 + r && Math.abs(ly) < 12 + r) return true;
      if (lx > -28 - r && lx < 8 + r && Math.abs(ly) < 72 + r) return true;
      return lx > -80 - r && lx < -58 + r && Math.abs(ly) < 28 + r;
    }
    case 'chinelo':
      return e.state === 1 && dist2(px, py, e.x, e.y) < (e.r + pr * 0.7) ** 2;
    case 'wind':
    case 'friend':
      return false;
    default:
      return dist2(px, py, e.x, e.y) < (e.r + pr * 0.75) ** 2;
  }
}

/** O pombo amigo é coletado com essa checagem (não é hostil). */
export function touchesFriend(e: Entity, px: number, py: number, pr: number) {
  return e.kind === 'friend' && dist2(px, py, e.x, e.y) < (e.r + pr) ** 2;
}

// ---------------------------------------------------------------- desenho

function hitFlash(ctx: CanvasRenderingContext2D, e: Entity) {
  if (e.flash <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  circle(ctx, e.x, e.y, e.r + 4);
  ctx.fill();
  ctx.restore();
}

function edgeWarning(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, big: boolean) {
  if (Math.floor(t * 8) % 2 !== 0) return;
  const s = big ? 1.2 : 0.85;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = '#1d2340';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(16, 12);
  ctx.lineTo(-16, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1d2340';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('!', 0, 3);
  ctx.restore();
}

function drawWire(ctx: CanvasRenderingContext2D, e: Entity) {
  const d = e.d;
  const segs: [number, number][] = [[d.a1, d.b1]];
  if (d.a2 >= 0) segs.push([d.a2, d.b2]);
  for (const [a, b] of segs) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    for (const off of [-6, 0, 6]) {
      ctx.moveTo(a + 10, e.y + off + 14);
      ctx.lineTo(b + 10, e.y + off + 14);
    }
    ctx.stroke();
    ctx.strokeStyle = '#1e1e24';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (const off of [-6, 0, 6]) {
      ctx.moveTo(a, e.y + off);
      ctx.quadraticCurveTo((a + b) / 2, e.y + off + 5, b, e.y + off);
    }
    ctx.stroke();
    for (const px of [a, b]) {
      if (px <= 2 || px >= W - 2) continue;
      drawShadow(ctx, px + 10, e.y + 12, 9, 6, 0.22);
      ctx.fillStyle = '#5c4129';
      ctx.fillRect(px - 3, e.y - 11, 6, 22);
      ctx.fillStyle = '#7a5a3a';
      circle(ctx, px, e.y, 7);
      ctx.fill();
      ctx.fillStyle = '#9fd3ff';
      for (const off of [-6, 0, 6]) {
        circle(ctx, px, e.y + off, 1.6);
        ctx.fill();
      }
    }
    // passarinhos pousados e o famoso tênis pendurado
    const len = b - a;
    for (let i = 0; i < 3; i++) {
      if (hash(d.seed + i) < 0.45) continue;
      const bx = a + 20 + hash(d.seed + i * 7) * (len - 40);
      ctx.fillStyle = '#5b6170';
      ellipse(ctx, bx, e.y - 2, 3, 4.5);
      ctx.fill();
      ctx.fillStyle = '#3e434f';
      circle(ctx, bx, e.y - 6, 2.2);
      ctx.fill();
    }
    if (hash(d.seed + 99) > 0.6 && len > 80) {
      const sx = a + len * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (const o of [-4, 4]) {
        rr(ctx, sx + o - 3, e.y + 4, 6, 11, 3);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#e63946';
      ctx.fillRect(sx - 7, e.y + 12, 6, 2);
      ctx.fillRect(sx + 1, e.y + 12, 6, 2);
    }
  }
}

export function drawEntity(ctx: CanvasRenderingContext2D, e: Entity, g: Game) {
  const t = g.t;
  const d = e.d;
  switch (e.kind) {
    case 'wire':
      drawWire(ctx, e);
      break;
    case 'balloon': {
      drawShadow(ctx, e.x + 18, e.y + 26, 14, 10, 0.15);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + e.r);
      ctx.quadraticCurveTo(e.x + Math.sin(t * 3) * 6, e.y + e.r + 14, e.x, e.y + e.r + 28);
      ctx.stroke();
      ctx.fillStyle = e.color;
      ellipse(ctx, e.x, e.y, e.r * 0.9, e.r);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ellipse(ctx, e.x - e.r * 0.35, e.y - e.r * 0.4, e.r * 0.22, e.r * 0.34, -0.4);
      ctx.fill();
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.moveTo(e.x - 3, e.y + e.r + 4);
      ctx.lineTo(e.x + 3, e.y + e.r + 4);
      ctx.lineTo(e.x, e.y + e.r - 1);
      ctx.fill();
      hitFlash(ctx, e);
      break;
    }
    case 'kite': {
      const ax = d.ax;
      const ay = e.y + d.len;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,40,40,0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + 14);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = '#f1faee';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + 14);
      for (let i = 1; i <= 5; i++) ctx.lineTo(e.x + Math.sin(t * 6 + i) * 2.4 * i, e.y + 14 + i * 9);
      ctx.stroke();
      const [c0, c1] = KITE_COLORS[d.c] ?? KITE_COLORS[0];
      for (let i = 1; i <= 5; i += 2) {
        ctx.fillStyle = c0;
        const bx = e.x + Math.sin(t * 6 + i) * 2.4 * i;
        const by = e.y + 14 + i * 9;
        ctx.beginPath();
        ctx.moveTo(bx - 4, by - 2);
        ctx.lineTo(bx + 4, by + 2);
        ctx.lineTo(bx + 4, by - 2);
        ctx.lineTo(bx - 4, by + 2);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.sin(t * 2 + d.ph) * 0.2);
      drawShadow(ctx, 14, 22, 12, 10, 0.15);
      ctx.fillStyle = c0;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(-13, 0);
      ctx.lineTo(0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(13, 0);
      ctx.lineTo(0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#5c4129';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(0, 16);
      ctx.moveTo(-13, 0);
      ctx.lineTo(13, 0);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'cloud': {
      const R = d.R;
      if (e.state === 1) {
        ctx.fillStyle = `rgba(255,230,80,${0.12 + 0.1 * Math.sin(t * 30)})`;
        circle(ctx, e.x, e.y, R);
        ctx.fill();
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = 'rgba(255,230,80,0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (e.state === 2) {
        ctx.fillStyle = 'rgba(255,255,220,0.45)';
        circle(ctx, e.x, e.y, R);
        ctx.fill();
        ctx.strokeStyle = '#fff59d';
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
          let a = rand(0, TAU);
          let lx = e.x;
          let ly = e.y;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          for (let s = 1; s <= 4; s++) {
            a += rand(-0.6, 0.6);
            lx = e.x + Math.cos(a) * (R / 4) * s;
            ly = e.y + Math.sin(a) * (R / 4) * s;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke();
        }
      }
      drawShadow(ctx, e.x + 30, e.y + 40, 60, 30, 0.12);
      const cols = ['#4b5260', '#5d6573', '#6f7887'];
      [[-30, 0, 30], [0, -12, 34], [28, 4, 28], [-8, 14, 26], [12, 16, 24]].forEach(([ox, oy, r], i) => {
        ctx.fillStyle = cols[i % 3];
        circle(ctx, e.x + ox, e.y + oy, r);
        ctx.fill();
      });
      if (e.state === 1 && Math.random() < 0.5) {
        ctx.fillStyle = 'rgba(255,240,120,0.7)';
        circle(ctx, e.x + rand(-30, 30), e.y + rand(-15, 15), rand(4, 9));
        ctx.fill();
      }
      break;
    }
    case 'plane': {
      if (e.state === 0) {
        ctx.fillStyle = `rgba(255,60,60,${0.08 + 0.05 * Math.sin(t * 20)})`;
        ctx.fillRect(0, e.y - 74, W, 148);
        edgeWarning(ctx, d.dir > 0 ? 26 : W - 26, e.y, t, true);
        break;
      }
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(d.dir, 1);
      ctx.save();
      ctx.translate(36, 48);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(-80, -12, 160, 24);
      ctx.fillRect(-28, -72, 36, 144);
      ctx.restore();
      ctx.fillStyle = '#c9d3df';
      ctx.strokeStyle = '#7d8a99';
      ctx.lineWidth = 1.5;
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(8, sy * 8);
        ctx.lineTo(-14, sy * 72);
        ctx.lineTo(-28, sy * 72);
        ctx.lineTo(-16, sy * 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-60, sy * 6);
        ctx.lineTo(-72, sy * 28);
        ctx.lineTo(-80, sy * 28);
        ctx.lineTo(-74, sy * 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#5d6b7a';
        ctx.fillRect(-10, sy * 34 - 4, 16, 8);
        ctx.fillStyle = '#c9d3df';
      }
      ctx.fillStyle = '#f5f7fa';
      rr(ctx, -82, -12, 164, 24, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e63946';
      ctx.fillRect(-70, -2, 130, 4);
      ctx.fillStyle = '#1d3557';
      ellipse(ctx, 68, 0, 9, 7);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'chinelo': {
      if (e.state === 0) {
        edgeWarning(ctx, d.dir > 0 ? 20 : W - 20, e.y, t, false);
        break;
      }
      const [sole, strap] = CHINELO_COLORS[d.c] ?? CHINELO_COLORS[0];
      drawShadow(ctx, e.x + 12, e.y + 16, 10, 6, 0.2);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = sole;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.2;
      rr(ctx, -7.5, -15, 15, 30, 7.5);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = strap;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-6.5, 3);
      ctx.lineTo(0, -8);
      ctx.lineTo(6.5, 3);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'wind': {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(0, e.y - d.h / 2, W, d.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const x = ((((hash(d.seed + i) * W + t * d.dir * 380) % (W + 60)) + (W + 60)) % (W + 60)) - 30;
        const y = e.y - d.h / 2 + 12 + i * 17;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - d.dir * 42, y);
        ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      outlinedText(ctx, d.dir > 0 ? '»»' : '««', W / 2, e.y, 26, 'rgba(255,255,255,0.8)', 'rgba(0,0,0,0.3)', 3);
      break;
    }
    case 'seagull': {
      const tilt = Math.cos(e.t * d.f + d.ph) * d.amp * d.f * 0.004;
      drawBird(ctx, e.x, e.y, Math.PI - tilt, 1, t, BIRDS.gull, 9);
      hitFlash(ctx, e);
      break;
    }
    case 'hawk': {
      const ang = e.state === 0 ? Math.PI : d.ang + Math.PI / 2;
      if (e.state === 1) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,50,50,${0.5 + 0.4 * Math.sin(t * 30)})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(d.ang) * 900, e.y + Math.sin(d.ang) * 900);
        ctx.stroke();
        ctx.restore();
      }
      drawBird(ctx, e.x + (e.state === 1 ? rand(-1.5, 1.5) : 0), e.y, ang, 1.15, t, BIRDS.hawk, e.state === 2 ? 4 : 11);
      hitFlash(ctx, e);
      break;
    }
    case 'drone':
      drawDrone(ctx, e.x, e.y, 1, t, g.biomeDef.lamps);
      hitFlash(ctx, e);
      break;
    case 'bat':
      drawBat(ctx, e.x, e.y, t);
      hitFlash(ctx, e);
      break;
    case 'friend': {
      drawPigeon(ctx, FRIEND_LOOK, e.x, e.y, { t: t + 0.7, scale: 0.85 });
      const by = e.y - 34 + Math.sin(t * 4) * 2;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1d2340';
      ctx.lineWidth = 2;
      rr(ctx, e.x - 15, by - 11, 30, 20, 8);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e63946';
      ctx.font = 'bold 13px Arial';
      ctx.fillText('♥', e.x, by);
      break;
    }
  }
}
