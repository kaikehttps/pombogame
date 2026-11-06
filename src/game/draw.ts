import { W, H } from './constants';
import type { Accessory, BiomeDef, PigeonLook } from './types';
import { hash, TAU } from './math';

export const FONT = '"Lilita One", "Arial Black", Impact, sans-serif';

type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------- primitivas

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function circle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU);
}

export function drawShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.18) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ellipse(ctx, x, y, rx, ry);
  ctx.fill();
}

export function outlinedText(ctx: Ctx, text: string, x: number, y: number, size: number, fill: string, stroke = 'rgba(10,14,30,0.85)', lw = 5) {
  ctx.font = `${size}px ${FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

// ---------------------------------------------------------------- pombo

export interface PigeonOpts {
  t: number;
  scale?: number;
  angle?: number;
  bank?: number;
  carrying?: boolean;
  alpha?: number;
  flapSpeed?: number;
  shadow?: boolean;
}

function pigeonWingPath(ctx: Ctx, side: number, span: number, tipY: number, f: number) {
  ctx.beginPath();
  ctx.moveTo(side * 4, -7);
  ctx.quadraticCurveTo(side * span * 0.55, -12 - 3 * f, side * span, tipY);
  ctx.quadraticCurveTo(side * span * 0.72, 9, side * 4, 11);
  ctx.closePath();
}

/** Pombo visto de cima, com a cabeça apontando para cima (-y). */
export function drawPigeon(ctx: Ctx, look: PigeonLook, x: number, y: number, o: PigeonOpts) {
  const s = o.scale ?? 1;
  const c = look.colors;
  const t = o.t;
  const bank = o.bank ?? 0;
  const f = 0.5 + 0.5 * Math.sin(t * (o.flapSpeed ?? 13));
  const outline = 'rgba(20,22,30,0.45)';

  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.shadow !== false) drawShadow(ctx, x + 16 * s, y + 24 * s, (14 + 12 * f) * s, 8 * s);
  ctx.translate(x, y);
  ctx.rotate((o.angle ?? 0) + bank * 0.3);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (look.accessory === 'flame') {
    const g = ctx.createRadialGradient(0, 2, 4, 0, 2, 42);
    g.addColorStop(0, 'rgba(255,200,60,0.55)');
    g.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = g;
    circle(ctx, 0, 2, 42);
    ctx.fill();
    for (let i = -1; i <= 1; i++) {
      const wob = Math.sin(t * 14 + i * 2) * 3;
      ctx.fillStyle = i === 0 ? '#ffd32a' : '#ff5e00';
      ctx.beginPath();
      ctx.moveTo(i * 4 - 3, 16);
      ctx.quadraticCurveTo(i * 8 + wob, 34, i * 6 + wob, 46 - Math.abs(i) * 7);
      ctx.quadraticCurveTo(i * 4 + 3, 30, i * 4 + 3, 16);
      ctx.fill();
    }
  }

  // cauda
  ctx.fillStyle = c.tail;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-5, 11);
  ctx.lineTo(-9.5, 27);
  ctx.quadraticCurveTo(0, 31, 9.5, 27);
  ctx.lineTo(5, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = c.tailTip;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-8.6, 25);
  ctx.quadraticCurveTo(0, 28.6, 8.6, 25);
  ctx.stroke();

  if (o.carrying) drawPackage(ctx, 0, 21, t);

  // asas
  for (const side of [-1, 1]) {
    const asym = 1 + side * bank * 0.22;
    const span = (13 + 19 * f) * asym;
    const tipY = -1 + 7 * (1 - f);
    pigeonWingPath(ctx, side, span, tipY, f);
    ctx.fillStyle = c.wing;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.tip;
    ctx.fillRect(side > 0 ? span * 0.7 : -span * 0.7 - 40, -30, 40, 60);
    ctx.strokeStyle = c.wingBar;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(side * 7, 1);
    ctx.lineTo(side * span * 0.52, 2.5);
    ctx.moveTo(side * 7, 5.5);
    ctx.lineTo(side * span * 0.46, 7);
    ctx.stroke();
    ctx.restore();
    pigeonWingPath(ctx, side, span, tipY, f);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // corpo
  ctx.fillStyle = c.body;
  ctx.strokeStyle = outline;
  ellipse(ctx, 0, 3, 8.5, 14);
  ctx.fill();
  ctx.stroke();
  if (look.accessory === 'goggles') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1.6, -3, 3.2, 17);
  }
  if (look.accessory === 'visor') {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-7, 4);
    ctx.lineTo(7, 4);
    ctx.moveTo(-6, 10);
    ctx.lineTo(6, 10);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const rx of [-5, 5]) {
      circle(ctx, rx, 7, 0.9);
      ctx.fill();
    }
  }

  // pescoço iridescente
  const ng = ctx.createLinearGradient(-7, -8, 7, -8);
  ng.addColorStop(0, c.neck);
  ng.addColorStop(0.5, c.neck2);
  ng.addColorStop(1, c.neck);
  ctx.fillStyle = ng;
  ellipse(ctx, 0, -7, 7.2, 6);
  ctx.fill();

  // cabeça
  ctx.fillStyle = c.head;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.2;
  circle(ctx, 0, -13, 6);
  ctx.fill();
  ctx.stroke();

  // bico
  ctx.fillStyle = c.beak;
  ctx.beginPath();
  ctx.moveTo(-2, -18.2);
  ctx.lineTo(0, -23.5);
  ctx.lineTo(2, -18.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ellipse(ctx, 0, -18.6, 1.6, 1);
  ctx.fill();

  // olhos
  for (const side of [-1, 1]) {
    ctx.fillStyle = c.eye ?? '#f39c12';
    circle(ctx, side * 4.2, -14, 1.8);
    ctx.fill();
    ctx.fillStyle = '#111';
    circle(ctx, side * 4.5, -14.2, 0.9);
    ctx.fill();
  }

  drawAccessory(ctx, look.accessory, t);
  ctx.restore();
}

function drawAccessory(ctx: Ctx, acc: Accessory, t: number) {
  switch (acc) {
    case 'olive': {
      ctx.strokeStyle = '#5a7d2a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.quadraticCurveTo(6, -27, 13, -25);
      ctx.stroke();
      ctx.fillStyle = '#7fb03a';
      for (const [lx, ly, r] of [[4, -25.5, 0.6], [8, -27.2, -0.2], [11, -23.8, 0.9], [6.5, -22.8, 0.3]]) {
        ellipse(ctx, lx, ly, 2.7, 1.2, r);
        ctx.fill();
      }
      break;
    }
    case 'cap': {
      ctx.fillStyle = '#e74c3c';
      circle(ctx, 0, -11.5, 5.6);
      ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.ellipse(0, -7, 5.6, 3.6, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      circle(ctx, 0, -12, 1.2);
      ctx.fill();
      ctx.fillStyle = '#111';
      rr(ctx, -6.8, -17.4, 13.6, 3.4, 1.7);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,200,255,0.7)';
      ctx.fillRect(-5.6, -16.9, 3, 1);
      ctx.fillRect(2.6, -16.9, 3, 1);
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([1.6, 1.2]);
      ctx.beginPath();
      ctx.arc(0, -5.5, 6.8, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'headband': {
      ctx.fillStyle = '#e63946';
      ctx.fillRect(-6.3, -12, 12.6, 2.8);
      ctx.strokeStyle = '#e63946';
      ctx.lineWidth = 2;
      for (const k of [0, 1]) {
        const w = Math.sin(t * 16 + k * 1.3) * 3;
        ctx.beginPath();
        ctx.moveTo(4, -10.5);
        ctx.quadraticCurveTo(8 + k * 2, -3, 6 + k * 4 + w, 5 + k * 2);
        ctx.stroke();
      }
      break;
    }
    case 'goggles': {
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 1.6;
      circle(ctx, 0, -13, 6.2);
      ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#8d6e63';
        circle(ctx, side * 3.2, -15.5, 2.9);
        ctx.fill();
        ctx.fillStyle = '#81ecec';
        circle(ctx, side * 3.2, -15.5, 1.9);
        ctx.fill();
      }
      break;
    }
    case 'visor': {
      ctx.fillStyle = 'rgba(0,229,255,0.95)';
      rr(ctx, -6.6, -16.6, 13.2, 3, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(3, -4);
      ctx.stroke();
      ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff4757' : '#7a1f28';
      circle(ctx, 3, -4, 1.7);
      ctx.fill();
      break;
    }
    case 'hat': {
      ctx.fillStyle = '#3d2f9e';
      circle(ctx, 0, -12, 8.5);
      ctx.fill();
      ctx.fillStyle = '#5b4bd6';
      ctx.beginPath();
      ctx.moveTo(-5, -14);
      ctx.quadraticCurveTo(0, -18, 5, -14);
      ctx.lineTo(2 + Math.sin(t * 3) * 1.5, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f9ca24';
      for (const [sx, sy] of [[-2, -12], [2, -8], [0.6, -3.5]]) {
        circle(ctx, sx, sy, 1.1);
        ctx.fill();
      }
      ctx.fillStyle = '#f9ca24';
      ctx.beginPath();
      ctx.moveTo(-2, -18.4);
      ctx.lineTo(0, -23.5);
      ctx.lineTo(2, -18.4);
      ctx.fill();
      break;
    }
    case 'flame': {
      for (let i = -1; i <= 1; i++) {
        ctx.fillStyle = i === 0 ? '#ffd32a' : '#ff9f1a';
        ctx.beginPath();
        ctx.moveTo(i * 2.5 - 1.5, -12);
        ctx.quadraticCurveTo(i * 4 + Math.sin(t * 12 + i) * 1.5, -4, i * 3, -Math.abs(i) * 2);
        ctx.quadraticCurveTo(i * 2.5 + 1.5, -6, i * 2.5 + 1.5, -12);
        ctx.fill();
      }
      break;
    }
    case 'none':
      break;
  }
}

export function drawPackage(ctx: Ctx, x: number, y: number, t: number, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 3) * 0.1);
  ctx.scale(s, s);
  ctx.fillStyle = '#c98b4f';
  ctx.strokeStyle = '#6b4220';
  ctx.lineWidth = 1.2;
  rr(ctx, -8, -6.5, 16, 13, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-1.4, -6.5, 2.8, 13);
  ctx.fillRect(-8, -1.2, 16, 2.4);
  ctx.restore();
}

// ---------------------------------------------------------------- outros bichos

export interface BirdStyle {
  body: string;
  wing: string;
  tip: string;
  head: string;
  beak: string;
  tail: string;
  eye?: string;
  long?: boolean;
  cap?: string;
  crown?: boolean;
}

export const BIRDS: Record<'gull' | 'hawk' | 'carcara' | 'queenGull' | 'kingVulture', BirdStyle> = {
  gull: { body: '#f4f6f8', wing: '#cfd6de', tip: '#2c2f36', head: '#ffffff', beak: '#f4b400', tail: '#e6eaee', long: true },
  hawk: { body: '#8a5a32', wing: '#7a4a26', tip: '#2b1a0e', head: '#a87444', beak: '#f0a830', tail: '#5e3a1c', eye: '#ffcc00' },
  carcara: { body: '#5a3a22', wing: '#6b4428', tip: '#1c120a', head: '#f3e6c8', beak: '#f08a24', tail: '#e9dcc0', cap: '#1c120a', eye: '#ff3b30' },
  queenGull: { body: '#f4f6f8', wing: '#cfd6de', tip: '#2c2f36', head: '#ffffff', beak: '#f4b400', tail: '#e6eaee', long: true, crown: true, eye: '#ff3b30' },
  kingVulture: { body: '#efe9e0', wing: '#ece5da', tip: '#151518', head: '#ff7a2e', beak: '#e03c2c', tail: '#151518', crown: true, eye: '#ffffff' },
};

/** Pássaro genérico visto de cima. ang=0 olha para cima; ang=PI olha para baixo. */
export function drawBird(ctx: Ctx, x: number, y: number, ang: number, s: number, t: number, st: BirdStyle, flapSpeed = 10, shadow = true) {
  const f = 0.5 + 0.5 * Math.sin(t * flapSpeed);
  const outline = 'rgba(20,20,25,0.5)';
  ctx.save();
  if (shadow) drawShadow(ctx, x + 14 * s, y + 20 * s, (16 + 10 * f) * s, 7 * s);
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.1;

  ctx.fillStyle = st.tail;
  ctx.strokeStyle = outline;
  ctx.beginPath();
  ctx.moveTo(-4, 9);
  ctx.lineTo(-7.5, 21);
  ctx.lineTo(7.5, 21);
  ctx.lineTo(4, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const span = st.long ? 24 + 12 * f : 15 + 15 * f;
  for (const side of [-1, 1]) {
    const tipY = st.long ? 2 + 3 * (1 - f) : 1 + 6 * (1 - f);
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(side * 3.5, -6);
      ctx.quadraticCurveTo(side * span * 0.5, -9 - 3 * f, side * span, tipY);
      ctx.quadraticCurveTo(side * span * 0.6, st.long ? 5 : 9, side * 3.5, 8);
      ctx.closePath();
    };
    path();
    ctx.fillStyle = st.wing;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = st.tip;
    ctx.fillRect(side > 0 ? span * 0.68 : -span * 0.68 - 40, -30, 40, 60);
    ctx.restore();
    path();
    ctx.strokeStyle = outline;
    ctx.stroke();
  }

  ctx.fillStyle = st.body;
  ellipse(ctx, 0, 2, 7, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = st.head;
  circle(ctx, 0, -11, 5.2);
  ctx.fill();
  ctx.stroke();
  if (st.cap) {
    ctx.fillStyle = st.cap;
    ellipse(ctx, 0, -9.5, 4, 3);
    ctx.fill();
  }
  ctx.fillStyle = st.beak;
  ctx.beginPath();
  ctx.moveTo(-2, -15);
  ctx.lineTo(0, -21);
  ctx.lineTo(2, -15);
  ctx.closePath();
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.fillStyle = st.eye ?? '#111';
    circle(ctx, side * 3.6, -12, 1.4);
    ctx.fill();
  }
  if (st.crown) drawCrown(ctx, 0, -9);
  ctx.restore();
}

export function drawCrown(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = '#f9ca24';
  ctx.strokeStyle = '#b7860b';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2;
    const r = i % 2 === 0 ? 7 : 4.2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e74c3c';
  circle(ctx, x, y, 1.6);
  ctx.fill();
}

export function drawDrone(ctx: Ctx, x: number, y: number, s: number, t: number, police = false) {
  ctx.save();
  drawShadow(ctx, x + 18 * s, y + 22 * s, 22 * s, 12 * s, 0.2);
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = '#2d3436';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-15, -15);
  ctx.lineTo(15, 15);
  ctx.moveTo(15, -15);
  ctx.lineTo(-15, 15);
  ctx.stroke();
  for (const [rx, ry] of [[-15, -15], [15, -15], [-15, 15], [15, 15]]) {
    ctx.fillStyle = 'rgba(200,210,220,0.35)';
    circle(ctx, rx, ry, 9);
    ctx.fill();
    const a = t * 40 + rx;
    ctx.strokeStyle = 'rgba(40,40,40,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx + Math.cos(a) * 9, ry + Math.sin(a) * 9);
    ctx.lineTo(rx - Math.cos(a) * 9, ry - Math.sin(a) * 9);
    ctx.stroke();
    ctx.fillStyle = '#2d3436';
    circle(ctx, rx, ry, 2.5);
    ctx.fill();
  }
  ctx.fillStyle = '#3d4852';
  rr(ctx, -9, -9, 18, 18, 5);
  ctx.fill();
  ctx.fillStyle = '#566573';
  rr(ctx, -7, -8, 14, 6, 3);
  ctx.fill();
  ctx.fillStyle = '#ff3b30';
  circle(ctx, 0, 3, 3.5);
  ctx.fill();
  ctx.fillStyle = '#fff';
  circle(ctx, -1, 2, 1);
  ctx.fill();
  if (police) {
    const on = Math.floor(t * 6) % 2 === 0;
    ctx.fillStyle = on ? '#ff3b30' : '#2e86de';
    circle(ctx, -6, -6, 2.2);
    ctx.fill();
    ctx.fillStyle = on ? '#2e86de' : '#ff3b30';
    circle(ctx, 6, -6, 2.2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBat(ctx: Ctx, x: number, y: number, t: number, s = 1) {
  const f = Math.sin(t * 22);
  ctx.save();
  drawShadow(ctx, x + 12 * s, y + 16 * s, 14 * s, 5 * s, 0.15);
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#3d2c4f';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 3, -3);
    ctx.quadraticCurveTo(side * 12, -10 - f * 4, side * 22 * (0.8 + 0.2 * f), -4);
    ctx.lineTo(side * 17, 1);
    ctx.lineTo(side * 13, -1);
    ctx.lineTo(side * 9, 4);
    ctx.quadraticCurveTo(side * 5, 4, side * 3, 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#2a1d38';
  ellipse(ctx, 0, 0, 5, 7);
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 1.5, 4);
    ctx.lineTo(side * 4.5, 10);
    ctx.lineTo(side * 4, 4);
    ctx.fill();
  }
  ctx.fillStyle = '#ff3b30';
  circle(ctx, -2, 4.5, 1.1);
  ctx.fill();
  circle(ctx, 2, 4.5, 1.1);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- itens

export function drawCoin(ctx: Ctx, x: number, y: number, t: number, value = 1) {
  const s = value >= 5 ? 1.4 : 1;
  const sx = Math.abs(Math.cos(t * 5 + x * 0.05)) * 0.8 + 0.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx * s, s);
  ctx.fillStyle = value >= 5 ? '#ffb020' : '#f7c531';
  circle(ctx, 0, 0, 8);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#a8740a';
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#fff3b0';
  circle(ctx, 0, 0, 5);
  ctx.stroke();
  ctx.restore();
}

export function drawHeart(ctx: Ctx, x: number, y: number, s: number, fill: string, stroke = 'rgba(0,0,0,0.55)') {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.2, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

export function drawCorn(ctx: Ctx, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.5);
  ctx.fillStyle = '#5fae3a';
  ellipse(ctx, -4, 3, 3, 9, -0.3);
  ctx.fill();
  ellipse(ctx, 4, 3, 3, 9, 0.3);
  ctx.fill();
  ctx.fillStyle = '#f9d71c';
  ellipse(ctx, 0, -1, 4.5, 9.5);
  ctx.fill();
  ctx.fillStyle = '#e0b400';
  for (let i = -2; i <= 2; i++) {
    for (const k of [-1.6, 1.6]) {
      circle(ctx, k, i * 3.2 - 1, 0.9);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawPickup(ctx: Ctx, kind: 'heart' | 'corn', x: number, y: number, t: number) {
  const by = y + Math.sin(t * 4) * 3;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  circle(ctx, x, by, 17 + Math.sin(t * 6) * 1.2);
  ctx.fill();
  ctx.stroke();
  if (kind === 'heart') drawHeart(ctx, x, by + 1, 9, '#ff4d6d', '#fff');
  else drawCorn(ctx, x, by);
  ctx.restore();
}

export interface BulletLike {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  kind: string;
  t: number;
}

export function drawBullet(ctx: Ctx, b: BulletLike) {
  const ang = Math.atan2(b.vy, b.vx);
  ctx.save();
  ctx.fillStyle = 'rgba(255,40,60,0.22)';
  circle(ctx, b.x, b.y, b.r + 4);
  ctx.fill();
  ctx.translate(b.x, b.y);
  switch (b.kind) {
    case 'feather':
      ctx.rotate(ang);
      ctx.fillStyle = '#8b5a2b';
      ellipse(ctx, 0, 0, b.r * 1.8, b.r * 0.7);
      ctx.fill();
      ctx.strokeStyle = '#f3e6c8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-b.r * 1.8, 0);
      ctx.lineTo(b.r * 1.8, 0);
      ctx.stroke();
      break;
    case 'fish':
      ctx.rotate(ang);
      ctx.fillStyle = '#9fb4c4';
      ctx.beginPath();
      ctx.moveTo(-b.r, 0);
      ctx.lineTo(-b.r * 1.7, -b.r * 0.6);
      ctx.lineTo(-b.r * 1.7, b.r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c9d6e0';
      ellipse(ctx, 0, 0, b.r, b.r * 0.55);
      ctx.fill();
      ctx.strokeStyle = '#5d7484';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#111';
      circle(ctx, b.r * 0.55, -1, 1.3);
      ctx.fill();
      break;
    case 'poop':
      ctx.fillStyle = '#f6f6ef';
      circle(ctx, 0, 0, b.r);
      ctx.fill();
      ctx.fillStyle = '#8f8f7d';
      circle(ctx, 1, 1, b.r * 0.45);
      ctx.fill();
      break;
    case 'spark':
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(0,229,255,0.35)';
      circle(ctx, 0, 0, b.r * 2);
      ctx.fill();
      ctx.fillStyle = '#c7f9ff';
      circle(ctx, 0, 0, b.r);
      ctx.fill();
      break;
    case 'missile':
      ctx.rotate(ang);
      ctx.fillStyle = '#ffb703';
      ellipse(ctx, -b.r * 1.6, 0, b.r * 0.9 + Math.random() * 2, b.r * 0.45);
      ctx.fill();
      ctx.fillStyle = '#e63946';
      rr(ctx, -b.r * 1.1, -b.r * 0.45, b.r * 2.2, b.r * 0.9, b.r * 0.45);
      ctx.fill();
      ctx.fillStyle = '#eee';
      ctx.beginPath();
      ctx.moveTo(b.r * 1.1, -b.r * 0.45);
      ctx.lineTo(b.r * 1.7, 0);
      ctx.lineTo(b.r * 1.1, b.r * 0.45);
      ctx.fill();
      break;
    case 'orb':
      ctx.fillStyle = 'rgba(162,89,255,0.35)';
      circle(ctx, 0, 0, b.r * 1.7);
      ctx.fill();
      ctx.fillStyle = '#e2c8ff';
      circle(ctx, 0, 0, b.r);
      ctx.fill();
      ctx.strokeStyle = '#7d3cff';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    default:
      ctx.fillStyle = '#ffd166';
      circle(ctx, 0, 0, b.r);
      ctx.fill();
      ctx.strokeStyle = '#8a5a00';
      ctx.lineWidth = 1.5;
      ctx.stroke();
  }
  ctx.restore();
}

export function drawPoopShot(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  circle(ctx, x, y, r + 3);
  ctx.fill();
  ctx.fillStyle = '#fbfbf4';
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = '#7d6b4f';
  circle(ctx, x + 1, y + 1, r * 0.5);
  ctx.fill();
}

// ---------------------------------------------------------------- pontos A e B

export function drawLandmark(ctx: Ctx, x: number, y: number, letter: 'A' | 'B', label: string, t: number, active: boolean) {
  const col = letter === 'A' ? '#3b82f6' : '#22c55e';
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rr(ctx, x - 112, y - 78, 240, 176, 12);
  ctx.fill();
  ctx.fillStyle = '#e9e4d8';
  ctx.strokeStyle = '#a49c8a';
  ctx.lineWidth = 3;
  rr(ctx, x - 120, y - 86, 240, 176, 12);
  ctx.fill();
  ctx.stroke();
  // faixas de alerta na borda
  ctx.save();
  rr(ctx, x - 120, y - 86, 240, 176, 12);
  ctx.clip();
  ctx.strokeStyle = 'rgba(250,204,21,0.8)';
  ctx.lineWidth = 6;
  ctx.strokeRect(x - 114, y - 80, 228, 164);
  ctx.restore();

  if (active) {
    const k = (t * 1.2) % 1;
    ctx.strokeStyle = col;
    ctx.globalAlpha = 1 - k;
    ctx.lineWidth = 4;
    circle(ctx, x, y, 56 + k * 34);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = col;
  circle(ctx, x, y, 56);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  circle(ctx, x, y, 47);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  outlinedText(ctx, letter, x, y + 3, 54, '#ffffff', 'rgba(0,0,0,0.25)', 4);

  // placa
  ctx.font = `15px ${FONT}`;
  const tw = Math.min(220, ctx.measureText(label).width + 26);
  ctx.fillStyle = '#1f2937';
  rr(ctx, x - tw / 2, y + 62, tw, 26, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, x, y + 76, 200);
  ctx.restore();
}

// ---------------------------------------------------------------- cenário

const CH = 230;
export const AVENUES: [number, number][] = [[150, 186], [318, 354]];
const BLOCKS: [number, number][] = [[0, 144], [192, 312], [360, 480]];
const CAR_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#ecf0f1', '#2ecc71', '#34495e', '#e67e22', '#9b59b6'];

function drawCar(ctx: Ctx, x: number, y: number, ang: number, col: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rr(ctx, -11, -4, 26, 12, 3);
  ctx.fill();
  ctx.fillStyle = col;
  rr(ctx, -13, -6, 26, 12, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(30,40,60,0.75)';
  ctx.fillRect(3, -4.5, 5, 9);
  ctx.fillRect(-9, -4.5, 3.5, 9);
  ctx.restore();
}

function drawTree(ctx: Ctx, x: number, y: number, r: number, col: string) {
  drawShadow(ctx, x + r * 0.5, y + r * 0.6, r, r * 0.8, 0.2);
  ctx.fillStyle = col;
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.55);
  ctx.fill();
}

function drawRoof(ctx: Ctx, b: BiomeDef, x: number, y: number, w: number, h: number, seed: number) {
  const col = b.roofs[Math.floor(hash(seed + 2) * b.roofs.length)];
  const tall = 4 + hash(seed + 3) * 9;
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.fillRect(x + tall, y + tall, w, h);
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  const k = hash(seed + 4);
  if (k < 0.3) {
    // telhado de telhas
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let yy = y + 8; yy < y + h; yy += 8) {
      ctx.moveTo(x + 3, yy);
      ctx.lineTo(x + w - 3, yy);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x, y + h / 2 - 1.5, w, 3);
  } else {
    // laje com caixa d'água, ar-condicionado e painéis
    if (hash(seed + 5) < 0.75) {
      const cx = x + 14 + hash(seed + 6) * (w - 28);
      const cy = y + 14 + hash(seed + 7) * (h - 28);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      circle(ctx, cx + 3, cy + 3, 9);
      ctx.fill();
      ctx.fillStyle = '#3a7bd5';
      circle(ctx, cx, cy, 9);
      ctx.fill();
      ctx.strokeStyle = '#8fbfff';
      ctx.lineWidth = 2;
      circle(ctx, cx, cy, 6);
      ctx.stroke();
    }
    const n = 1 + Math.floor(hash(seed + 8) * 3);
    for (let i = 0; i < n; i++) {
      const ax = x + 6 + hash(seed + 9 + i) * (w - 20);
      const ay = y + 6 + hash(seed + 12 + i) * (h - 18);
      ctx.fillStyle = '#d8dde3';
      ctx.fillRect(ax, ay, 12, 9);
      ctx.strokeStyle = '#8d96a0';
      ctx.lineWidth = 1;
      ctx.strokeRect(ax, ay, 12, 9);
      circle(ctx, ax + 6, ay + 4.5, 3);
      ctx.stroke();
    }
    if (k > 0.78 && w > 50) {
      const pw = Math.min(w - 16, 50);
      const px = x + w - pw - 8;
      const py = y + h - 26;
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(px, py, pw, 18);
      ctx.strokeStyle = 'rgba(147,197,253,0.6)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(px + (pw / 4) * i, py);
        ctx.lineTo(px + (pw / 4) * i, py + 18);
        ctx.stroke();
      }
    }
  }
}

function drawBlock(ctx: Ctx, b: BiomeDef, x: number, y: number, w: number, h: number, seed: number) {
  const r = hash(seed);
  if (r < 0.62) {
    if (hash(seed + 1) > 0.55) {
      drawRoof(ctx, b, x + 6, y + 6, w - 12, h / 2 - 9, seed);
      drawRoof(ctx, b, x + 6, y + h / 2 + 3, w - 12, h / 2 - 9, seed + 13.7);
    } else {
      drawRoof(ctx, b, x + 6, y + 6, w - 12, h - 12, seed);
    }
  } else if (r < 0.8) {
    // praça
    ctx.fillStyle = b.park;
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    ctx.strokeStyle = 'rgba(232,218,180,0.9)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 3);
    ctx.lineTo(x + w - 3, y + h - 3);
    ctx.stroke();
    if (hash(seed + 2) > 0.5) {
      ctx.fillStyle = '#b8bcc2';
      circle(ctx, x + w / 2, y + h / 2, 15);
      ctx.fill();
      ctx.fillStyle = '#5dade2';
      circle(ctx, x + w / 2, y + h / 2, 10);
      ctx.fill();
    }
    const n = 4 + Math.floor(hash(seed + 3) * 4);
    for (let i = 0; i < n; i++) {
      drawTree(ctx, x + 14 + hash(seed + 4 + i) * (w - 28), y + 14 + hash(seed + 20 + i) * (h - 28), 10 + hash(seed + 40 + i) * 7, b.tree);
    }
  } else if (r < 0.9) {
    // estacionamento
    ctx.fillStyle = '#6b6f76';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    for (let xx = x + 10; xx < x + w - 10; xx += 22) {
      ctx.beginPath();
      ctx.moveTo(xx, y + 8);
      ctx.lineTo(xx, y + 40);
      ctx.moveTo(xx, y + h - 40);
      ctx.lineTo(xx, y + h - 8);
      ctx.stroke();
      if (hash(seed + xx) > 0.4) drawCar(ctx, xx + 11, y + 24, Math.PI / 2, CAR_COLORS[Math.floor(hash(seed + xx * 3) * CAR_COLORS.length)]);
      if (hash(seed + xx * 2) > 0.5) drawCar(ctx, xx + 11, y + h - 24, -Math.PI / 2, CAR_COLORS[Math.floor(hash(seed + xx * 5) * CAR_COLORS.length)]);
    }
  } else {
    // campinho de futebol
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let yy = y + 4; yy < y + h - 4; yy += 24) ctx.fillRect(x + 4, yy, w - 8, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 12, y + 12, w - 24, h - 24);
    ctx.beginPath();
    ctx.moveTo(x + 12, y + h / 2);
    ctx.lineTo(x + w - 12, y + h / 2);
    ctx.stroke();
    circle(ctx, x + w / 2, y + h / 2, 16);
    ctx.stroke();
    ctx.strokeRect(x + w / 2 - 20, y + 12, 40, 18);
    ctx.strokeRect(x + w / 2 - 20, y + h - 30, 40, 18);
  }
}

function drawCity(ctx: Ctx, b: BiomeDef, gy: number, t: number) {
  ctx.fillStyle = b.ground;
  ctx.fillRect(0, 0, W, H);
  for (const [a0, a1] of AVENUES) {
    ctx.fillStyle = b.sidewalk;
    ctx.fillRect(a0 - 6, 0, a1 - a0 + 12, H);
    ctx.fillStyle = b.road;
    ctx.fillRect(a0, 0, a1 - a0, H);
  }
  const k0 = Math.floor(-gy / CH) - 1;
  const k1 = Math.floor((H - gy) / CH);
  for (let k = k0; k <= k1; k++) {
    const y0 = k * CH + gy;
    ctx.fillStyle = b.sidewalk;
    ctx.fillRect(0, y0, W, 46);
    ctx.fillStyle = b.road;
    ctx.fillRect(0, y0 + 6, W, 34);
    ctx.fillStyle = b.line;
    for (let x = 8; x < W; x += 40) ctx.fillRect(x, y0 + 22, 20, 2.5);
    for (const [a0] of AVENUES) {
      for (let i = 0; i < 5; i++) ctx.fillRect(a0 + 3 + i * 7, y0 + 48, 4, 12);
    }
    for (let j = 0; j < BLOCKS.length; j++) {
      const [x0, x1] = BLOCKS[j];
      drawBlock(ctx, b, x0, y0 + 46, x1 - x0, CH - 46, k * 3.17 + j * 11.3);
    }
    for (let i = 0; i < 2; i++) {
      const dir = i === 0 ? 1 : -1;
      const sp = 50 + hash(k * 5.1 + i) * 70;
      const span = W + 80;
      const cx = (((hash(k * 7.7 + i * 3.3) * span + t * sp * dir) % span) + span) % span - 40;
      drawCar(ctx, cx, y0 + (i === 0 ? 31 : 15), dir > 0 ? 0 : Math.PI, CAR_COLORS[Math.floor(hash(k * 2.2 + i) * CAR_COLORS.length)]);
    }
  }
  ctx.fillStyle = b.line2;
  for (const [a0, a1] of AVENUES) {
    const cx = (a0 + a1) / 2;
    for (let y = (gy % 44) - 44; y < H; y += 44) ctx.fillRect(cx - 1.5, y, 3, 22);
    // carros nas avenidas
    for (let i = 0; i < 3; i++) {
      const lane = i % 2 === 0 ? -1 : 1;
      const span = H + 80;
      const yy = (((hash(a0 + i * 9.1) * span + gy + t * (lane > 0 ? 70 : -40)) % span) + span) % span - 40;
      drawCar(ctx, cx + lane * 9, yy, lane > 0 ? Math.PI / 2 : -Math.PI / 2, CAR_COLORS[Math.floor(hash(a0 * 0.3 + i) * CAR_COLORS.length)]);
    }
  }
}

function shoreX(wy: number) {
  return 300 + Math.sin(wy * 0.006) * 34 + Math.sin(wy * 0.019) * 12;
}

function drawPalm(ctx: Ctx, x: number, y: number, s: number, col: string) {
  drawShadow(ctx, x + 12, y + 14, 22 * s, 12 * s, 0.18);
  ctx.fillStyle = col;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + s;
    ellipse(ctx, x + Math.cos(a) * 12 * s, y + Math.sin(a) * 12 * s, 14 * s, 4.5 * s, a);
    ctx.fill();
  }
  ctx.fillStyle = '#7a5230';
  circle(ctx, x, y, 4 * s);
  ctx.fill();
}

function drawUmbrella(ctx: Ctx, x: number, y: number, r: number, c1: string, c2: string) {
  drawShadow(ctx, x + 8, y + 10, r, r * 0.8, 0.2);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, (i / 8) * TAU, ((i + 1) / 8) * TAU);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  circle(ctx, x, y, 2);
  ctx.fill();
}

const UMB = [['#e63946', '#ffffff'], ['#ffb703', '#219ebc'], ['#2a9d8f', '#e9c46a'], ['#8338ec', '#ffbe0b']];

function drawBeach(ctx: Ctx, b: BiomeDef, gy: number, t: number) {
  ctx.fillStyle = b.ground;
  ctx.fillRect(0, 0, W, H);
  // avenida da orla
  ctx.fillStyle = b.road;
  ctx.fillRect(0, 0, 40, H);
  ctx.fillStyle = b.line2;
  for (let y = (gy % 44) - 44; y < H; y += 44) ctx.fillRect(19, y, 3, 22);
  // calçadão de ondas
  ctx.fillStyle = '#f7f4ec';
  ctx.fillRect(40, 0, 46, H);
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 5;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    for (let y = -10; y <= H + 10; y += 8) {
      const x = 52 + i * 22 + Math.sin((y - gy) * 0.05) * 6;
      if (y === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // areia molhada, mar e espuma
  const pts: [number, number][] = [];
  for (let y = -20; y <= H + 20; y += 16) pts.push([shoreX(y - gy), y]);
  ctx.fillStyle = b.wetSand ?? '#d9bc7c';
  ctx.beginPath();
  ctx.moveTo(W, -20);
  for (const [x, y] of pts) ctx.lineTo(x - 18, y);
  ctx.lineTo(W, H + 20);
  ctx.closePath();
  ctx.fill();
  const sea = ctx.createLinearGradient(260, 0, W, 0);
  sea.addColorStop(0, b.sea ?? '#2aa7da');
  sea.addColorStop(1, b.seaDeep ?? '#1479b8');
  ctx.fillStyle = sea;
  ctx.beginPath();
  ctx.moveTo(W, -20);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(W, H + 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const xx = x - 2 + Math.sin(t * 1.6 + y * 0.02) * 4;
    if (i === 0) ctx.moveTo(xx, y);
    else ctx.lineTo(xx, y);
  });
  ctx.stroke();

  const k0 = Math.floor(-gy / CH) - 1;
  const k1 = Math.floor((H - gy) / CH);
  for (let k = k0; k <= k1; k++) {
    const y0 = k * CH + gy;
    // ondas
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const wy = y0 + hash(k * 3.1 + i) * CH;
      const wx = shoreX(wy - gy) + 30 + hash(k * 1.7 + i) * 120;
      ctx.beginPath();
      ctx.arc(wx + Math.sin(t + i) * 4, wy, 10, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    // barco
    if (hash(k * 4.4) > 0.55) {
      const bx = shoreX(y0 - gy) + 70 + hash(k * 5.5) * 80;
      const by = y0 + 40 + hash(k * 6.6) * 140;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(-0.3);
      drawShadow(ctx, 6, 8, 18, 7, 0.2);
      ctx.fillStyle = '#ffffff';
      ellipse(ctx, 0, 0, 18, 7);
      ctx.fill();
      ctx.fillStyle = '#e76f51';
      ellipse(ctx, -2, 0, 9, 4);
      ctx.fill();
      ctx.restore();
    }
    // palmeira no calçadão
    drawPalm(ctx, 90, y0 + 40 + hash(k * 2.9) * 150, 1 + hash(k * 8.8) * 0.3, b.tree);
    // guarda-sóis e cangas
    for (let i = 0; i < 3; i++) {
      const uy = y0 + 20 + hash(k * 9.3 + i) * 190;
      const sx = shoreX(uy - gy);
      const ux = 118 + hash(k * 7.1 + i * 2.3) * Math.max(10, sx - 160);
      const col = UMB[Math.floor(hash(k + i * 1.3) * UMB.length)];
      ctx.fillStyle = col[1] === '#ffffff' ? '#ffd166' : col[1];
      ctx.fillRect(ux + 10, uy - 4, 12, 24);
      drawUmbrella(ctx, ux, uy, 16, col[0], col[1]);
    }
  }
}

export function drawGround(ctx: Ctx, b: BiomeDef, gy: number, t: number) {
  if (b.kind === 'beach') drawBeach(ctx, b, gy, t);
  else drawCity(ctx, b, gy, t);
}

export function drawOverlay(ctx: Ctx, b: BiomeDef) {
  if (!b.overlay) return;
  if (b.overlay === 'sunset') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,120,60,0.32)');
    g.addColorStop(1, 'rgba(120,40,120,0.22)');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = b.overlay;
  }
  ctx.fillRect(0, 0, W, H);
}

export function drawLamps(ctx: Ctx, gy: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const draw = (x: number, y: number) => {
    const g = ctx.createRadialGradient(x, y, 2, x, y, 46);
    g.addColorStop(0, 'rgba(255,214,130,0.5)');
    g.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 46, y - 46, 92, 92);
  };
  for (const [a0] of AVENUES) {
    for (let y = (gy % 115) - 115; y < H + 50; y += 115) draw(a0 - 4, y);
  }
  const k0 = Math.floor(-gy / CH) - 1;
  const k1 = Math.floor((H - gy) / CH);
  for (let k = k0; k <= k1; k++) {
    const y0 = k * CH + gy;
    draw(70, y0 + 4);
    draw(410, y0 + 4);
  }
  ctx.restore();
}

export function drawClouds(ctx: Ctx, gy: number, dark: boolean) {
  const cy = gy * 1.45;
  const CS = 360;
  const k0 = Math.floor(-cy / CS) - 1;
  const k1 = Math.floor((H - cy) / CS) + 1;
  ctx.save();
  ctx.fillStyle = dark ? 'rgba(60,66,82,0.26)' : 'rgba(255,255,255,0.18)';
  for (let k = k0; k <= k1; k++) {
    if (hash(k * 1.31 + 0.7) > 0.5) continue;
    const x = hash(k * 2.13) * W;
    const y = k * CS + cy + hash(k * 3.7) * 120;
    const s = 0.8 + hash(k * 4.1) * 0.8;
    for (const [ox, oy, r] of [[0, 0, 40], [34, 8, 30], [-32, 10, 28], [10, 22, 30], [-8, -16, 26]]) {
      circle(ctx, x + ox * s, y + oy * s, r * s);
      ctx.fill();
    }
  }
  ctx.restore();
}
