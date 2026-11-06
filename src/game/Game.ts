import { W, H } from './constants';
import type { BiomeDef, BiomeId, BossKind, GameResult, MissionDef, SkinDef, Upgrades } from './types';
import type { Input } from './input';
import { sfx } from './audio';
import { clamp, damp, dist2, rand, TAU, weightedPick } from './math';
import { type Entity, drawEntity, entityHitsPlayer, isCreature, isDestructible, LOOT, spawnEntity, touchesFriend, updateEntity } from './entities';
import { type Boss, createBoss, drawBoss, updateBoss } from './bosses';
import * as D from './draw';
import { BIOMES, ENDLESS_BIOMES } from '../data/biomes';

export type BulletKind = 'seed' | 'feather' | 'fish' | 'poop' | 'spark' | 'missile' | 'orb';

export interface Bullet { x: number; y: number; vx: number; vy: number; r: number; kind: BulletKind; t: number; dead: boolean; homing: number }
export interface Shot { x: number; y: number; vx: number; vy: number; r: number; dmg: number; t: number; dead: boolean }
export interface Coin { x: number; y: number; vx: number; vy: number; value: number; t: number; pulled: boolean; dead: boolean }
export interface Pickup { x: number; y: number; kind: 'heart' | 'corn'; t: number; dead: boolean }
export type ParticleKind = 'dot' | 'spark' | 'feather' | 'ring' | 'text' | 'ghost' | 'smoke' | 'confetti';
export interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; size: number;
  color: string; kind: ParticleKind; rot: number; vr: number; grav: number; text?: string;
}
export interface Beam { x: number; y0: number; w: number; warn: number; active: number; t: number; dead: boolean }
export interface Zone { x: number; y: number; r: number; warn: number; t: number; follow: boolean; exploded: boolean; dead: boolean }
interface Banner { text: string; sub?: string; t: number; dur: number; color: string }

export interface Player {
  x: number; y: number; vx: number; vy: number; r: number;
  hp: number; maxHp: number; inv: number;
  fireCd: number; skillCd: number;
  dashT: number; shieldT: number; phaseT: number; nitroT: number; laserT: number; alchemyT: number;
  reviveUsed: boolean; bank: number; ramCd: number; ghostT: number;
}

export interface GameCallbacks {
  onEnd: (r: GameResult) => void;
  onPause: (paused: boolean) => void;
}

type Phase = 'pickup' | 'flight' | 'arrival' | 'delivered' | 'dead';

const ENDLESS_BOSSES: BossKind[] = ['carcara', 'gaivota', 'drone', 'urubu', 'heli', 'robogato'];
const ENDLESS_BOSS_EVERY = 4500;
const ENDLESS_BIOME_EVERY = 5000;
const PAD_STOP_Y = 300;

export class Game {
  readonly m: MissionDef;
  readonly skin: SkinDef;
  readonly input: Input;
  private cb: GameCallbacks;
  private touch: boolean;

  phase: Phase = 'pickup';
  phaseT = 0;
  paused = false;
  ended = false;
  t = 0;
  time = 0;
  distance = 0;
  scroll = 0;
  groundY = 0;
  diff: number;
  biome: BiomeId;

  player: Player;
  entities: Entity[] = [];
  bullets: Bullet[] = [];
  shots: Shot[] = [];
  coins: Coin[] = [];
  pickups: Pickup[] = [];
  particles: Particle[] = [];
  beams: Beam[] = [];
  zones: Zone[] = [];
  boss: Boss | null = null;
  bossDone = false;
  private bossCycle = 0;
  private nextBossAt = ENDLESS_BOSS_EVERY;

  private aY = H - 330;
  private bY: number | null = null;
  private pkgOnPad = true;
  private deliverPkg: { x: number; y: number } | null = null;
  private fallPkg: { x: number; y: number; vy: number; rot: number } | null = null;
  private arrivalCleared = false;

  private spawnT = 1.4;
  private coinT = 0.6;
  private pickupT = 11;
  slowmo = 0;
  shake = 0;
  private flash = 0;
  private flashColor = '#ffffff';
  private banner: Banner | null = null;
  private rain: { x: number; y: number; l: number }[] = [];
  private lightningT = 5;

  coinsCollected = 0;
  damageTaken = 0;
  bossesDefeated = 0;

  // atributos finais (skin + melhorias)
  readonly maxSpeed: number;
  readonly agility: number;
  readonly magnetR: number;
  readonly skillCdMax: number;
  readonly fireRate: number;
  readonly dmg: number;

  constructor(m: MissionDef, skin: SkinDef, up: Upgrades, input: Input, cb: GameCallbacks, touch: boolean) {
    this.m = m;
    this.skin = skin;
    this.input = input;
    this.cb = cb;
    this.touch = touch;
    this.biome = m.biome;
    this.diff = m.endless ? 1 : m.id;
    this.maxSpeed = skin.stats.speed * (1 + 0.07 * up.asas);
    this.agility = skin.stats.agility * (1 + 0.12 * up.agilidade);
    this.magnetR = 46 + 26 * up.ima;
    this.skillCdMax = skin.skill.cooldown * (1 - 0.08 * up.recarga);
    this.fireRate = 3.4 + 0.55 * up.coco;
    this.dmg = 1 + 0.2 * up.coco;
    const maxHp = skin.stats.hp + up.vida;
    this.player = {
      x: W / 2, y: H - 110, vx: 0, vy: 0, r: 13, hp: maxHp, maxHp, inv: 0, fireCd: 0, skillCd: 0,
      dashT: 0, shieldT: 0, phaseT: 0, nitroT: 0, laserT: 0, alchemyT: 0, reviveUsed: false,
      bank: 0, ramCd: 0, ghostT: 0,
    };
    this.showBanner('PONTO A', 'Pegue a encomenda!', '#60a5fa', 2.6);
    for (let i = 0; i < 90; i++) this.rain.push({ x: rand(0, W), y: rand(0, H), l: rand(10, 22) });
  }

  // ------------------------------------------------------------ utilidades públicas

  get biomeDef(): BiomeDef {
    return BIOMES[this.biome];
  }

  get bulletSpeed() {
    return 1 + (this.diff - 1) * 0.05;
  }

  canAct() {
    return this.phase === 'flight' || this.phase === 'arrival';
  }

  aim(x: number, y: number) {
    return Math.atan2(this.player.y - y, this.player.x - x);
  }

  fire(x: number, y: number, ang: number, speed: number, kind: BulletKind = 'seed', r = 6, homing = 0) {
    this.bullets.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r, kind, t: 0, dead: false, homing });
  }

  beam(x: number, y0: number, w: number, warn: number, active: number) {
    this.beams.push({ x, y0, w, warn, active, t: 0, dead: false });
  }

  zone(x: number, y: number, r: number, warn: number, follow: boolean) {
    this.zones.push({ x, y, r, warn, t: 0, follow, exploded: false, dead: false });
  }

  setPaused(v: boolean) {
    if (this.ended || this.paused === v) return;
    this.paused = v;
    this.input.clear();
    this.cb.onPause(v);
  }

  private showBanner(text: string, sub: string | undefined, color: string, dur = 2.2) {
    this.banner = { text, sub, color, dur, t: 0 };
  }

  // ------------------------------------------------------------ partículas

  particle(o: Partial<Particle> & { x: number; y: number }) {
    if (this.particles.length > 650) this.particles.shift();
    const life = o.life ?? 0.6;
    this.particles.push({ vx: 0, vy: 0, size: 3, color: '#fff', kind: 'dot', rot: 0, vr: 0, grav: 0, ...o, life, max: life });
  }

  burst(x: number, y: number, n: number, color: string, speed = 180, kind: ParticleKind = 'dot', size = 3) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const s = rand(0.3, 1) * speed;
      this.particle({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, kind, size: rand(size * 0.6, size * 1.3),
        life: rand(0.3, 0.75), rot: rand(0, TAU), vr: rand(-8, 8),
      });
    }
  }

  floatText(x: number, y: number, text: string, color = '#ffffff', size = 18) {
    this.particle({ x, y, vy: -60, kind: 'text', text, color, size, life: 1 });
  }

  explosion(x: number, y: number, scale = 1) {
    this.particle({ x, y, kind: 'ring', size: 60 * scale, life: 0.45, color: '#ffb347' });
    this.burst(x, y, Math.round(12 * scale), '#ff9f1a', 260 * scale, 'dot', 4);
    this.burst(x, y, Math.round(6 * scale), 'rgba(90,90,90,0.6)', 80, 'smoke', 7);
    sfx.boom();
  }

  dropCoin(x: number, y: number, value: number, burst: boolean) {
    this.coins.push({
      x, y, vx: burst ? rand(-220, 220) : 0, vy: burst ? rand(-260, 100) : 0, value, t: burst ? 0 : 1, pulled: false, dead: false,
    });
  }

  // ------------------------------------------------------------ dano e mortes

  killEntity(e: Entity) {
    if (e.dead) return;
    e.dead = true;
    const loot = LOOT[e.kind] ?? 0;
    for (let i = 0; i < loot; i++) this.dropCoin(e.x, e.y, 1, true);
    if (e.kind === 'plane') this.explosion(e.x, e.y, 1.3);
    else if (e.kind === 'drone') this.explosion(e.x, e.y, 0.7);
    else if (isCreature(e)) this.burst(e.x, e.y, 9, e.kind === 'bat' ? '#3d2c4f' : e.kind === 'hawk' ? '#8a5a32' : '#e6eaee', 140, 'feather', 3);
    else this.burst(e.x, e.y, 12, e.kind === 'balloon' ? e.color : '#ffffff', 200);
    sfx.pop();
  }

  damageEntity(e: Entity, dmg: number) {
    e.hp -= dmg;
    e.flash = 0.08;
    if (e.hp <= 0) this.killEntity(e);
    else sfx.enemyHit();
  }

  hitBoss(dmg: number) {
    const b = this.boss;
    if (!b || b.dying > 0 || b.mode === 'enter') return;
    b.hp -= dmg;
    b.flash = 0.06;
    if (b.hp <= 0) {
      b.hp = 0;
      b.dying = 1.6;
      this.shake = 14;
      this.clearHazards();
      sfx.boom();
    }
  }

  bossDefeated() {
    const b = this.boss;
    if (!b) return;
    this.explosion(b.x, b.y, 2.2);
    this.shake = 20;
    this.flash = 0.6;
    this.flashColor = '#fff6d0';
    for (let i = 0; i < 24; i++) this.dropCoin(b.x + rand(-40, 40), b.y + rand(-30, 30), i < 6 ? 5 : 1, true);
    this.showBanner('CHEFÃO DERROTADO!', b.name, '#7bd389', 2.6);
    this.boss = null;
    this.bossDone = true;
    this.bossesDefeated++;
    this.nextBossAt = this.distance + ENDLESS_BOSS_EVERY;
    this.clearHazards();
    sfx.win();
  }

  private clearHazards() {
    for (const b of this.bullets) {
      b.dead = true;
      this.particle({ x: b.x, y: b.y, kind: 'spark', color: '#ffffff', size: 2, vx: rand(-60, 60), vy: rand(-60, 60), life: 0.3 });
    }
    for (const bm of this.beams) bm.dead = true;
    for (const z of this.zones) z.dead = true;
  }

  private isSafe() {
    const p = this.player;
    return p.inv > 0 || p.dashT > 0 || p.phaseT > 0 || p.nitroT > 0 || p.shieldT > 0;
  }

  /** Retorna true se o pombo realmente levou dano. */
  hurt(): boolean {
    const p = this.player;
    if (!this.canAct() || this.isSafe()) return false;
    p.hp--;
    this.damageTaken++;
    p.inv = 1.4;
    this.shake = 12;
    this.flash = 0.25;
    this.flashColor = '#ff3b3b';
    sfx.hit();
    this.burst(p.x, p.y, 12, this.skin.colors.wing, 160, 'feather', 3.5);
    if (p.hp <= 0) {
      if (this.skin.skill.id === 'nova' && !p.reviveUsed) {
        p.reviveUsed = true;
        p.hp = 2;
        p.inv = 2.5;
        this.nova();
        this.showBanner('RENASCEU DAS CINZAS!', 'A Fênix não morre', '#ffb347', 2.4);
      } else {
        this.die();
      }
    }
    return true;
  }

  private die() {
    const p = this.player;
    this.phase = 'dead';
    this.phaseT = 0;
    this.shake = 18;
    sfx.lose();
    this.burst(p.x, p.y, 26, this.skin.colors.body, 220, 'feather', 4);
    this.fallPkg = { x: p.x, y: p.y + 20, vy: 60, rot: 0 };
    this.showBanner(this.m.endless ? 'FIM DE VOO!' : 'ENTREGA FALHOU!', this.m.endless ? `${Math.floor(this.distance / 10)} m percorridos` : 'A encomenda caiu...', '#ff6b6b', 2.4);
  }

  private nova() {
    const p = this.player;
    this.flash = 0.7;
    this.flashColor = '#fff3c4';
    this.shake = 16;
    this.particle({ x: p.x, y: p.y, kind: 'ring', size: 650, life: 0.8, color: '#ffb347' });
    this.burst(p.x, p.y, 40, '#ffd32a', 420, 'spark', 3);
    this.clearHazards();
    for (const e of this.entities) {
      if (e.hostile && isDestructible(e) && e.y > -40 && e.y < H + 40) this.killEntity(e);
    }
    if (this.boss) this.hitBoss(this.boss.maxHp * 0.18);
    sfx.nova();
  }

  private alchemize() {
    for (const b of this.bullets) {
      if (b.dead) continue;
      b.dead = true;
      this.dropCoin(b.x, b.y, 1, false);
      this.particle({ x: b.x, y: b.y, kind: 'ring', size: 16, life: 0.35, color: '#c39bff' });
    }
  }

  // ------------------------------------------------------------ loop principal

  update(dtIn: number) {
    if (this.input.consume('pause') && !this.ended && this.phase !== 'delivered' && this.phase !== 'dead') {
      this.setPaused(!this.paused);
    }
    if (this.paused || this.ended) return;
    const dt = Math.min(dtIn, 1 / 30);
    this.t += dt;
    this.phaseT += dt;
    if (this.canAct()) this.time += dt;
    this.slowmo = Math.max(0, this.slowmo - dt);
    const wdt = dt * (this.slowmo > 0 ? 0.4 : 1);

    this.updateScroll(dt);
    const sc = this.scroll * wdt;
    this.groundY += sc;
    this.aY += sc;
    if (this.bY !== null) this.bY += sc;
    if (this.phase === 'flight' && !this.boss) this.distance += sc;
    if (this.m.endless) this.updateEndless();

    this.updatePlayer(dt);
    this.updateSpawns(wdt);
    for (const e of this.entities) updateEntity(this, e, wdt);
    if (this.boss) updateBoss(this, this.boss, wdt);
    this.updateProjectiles(dt, wdt);
    this.updateCoins(dt, wdt);
    this.updateParticles(dt);
    if (this.fallPkg) {
      this.fallPkg.vy += 300 * dt;
      this.fallPkg.y += this.fallPkg.vy * dt;
      this.fallPkg.rot += 6 * dt;
    }
    this.collisions(dt);
    this.updatePhase();
    this.updateWeather(dt);

    this.entities = this.entities.filter((e) => !e.dead);
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.shots = this.shots.filter((s) => !s.dead);
    this.coins = this.coins.filter((c) => !c.dead);
    this.pickups = this.pickups.filter((p) => !p.dead);
    this.particles = this.particles.filter((p) => p.life > 0);
    this.beams = this.beams.filter((b) => !b.dead);
    this.zones = this.zones.filter((z) => !z.dead);

    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.dur) this.banner = null;
    }
    this.shake = Math.max(0, this.shake - 40 * dt);
    this.flash = Math.max(0, this.flash - 1.6 * dt);
  }

  private updateScroll(dt: number) {
    const base = this.m.scroll;
    let target = 0;
    if (this.phase === 'flight') target = base * (this.boss ? 0.3 : 1) * (this.player.nitroT > 0 ? 2.8 : 1);
    else if (this.phase === 'arrival' && this.bY !== null) target = clamp((PAD_STOP_Y - this.bY) * 1.1, 0, base);
    else if (this.phase === 'dead') target = base * 0.4;
    this.scroll += (target - this.scroll) * damp(this.phase === 'arrival' ? 6 : 2.5, dt);
  }

  private updateEndless() {
    this.diff = Math.min(9, 1 + this.distance / 3500);
    const idx = Math.floor(this.distance / ENDLESS_BIOME_EVERY) % ENDLESS_BIOMES.length;
    const b = ENDLESS_BIOMES[idx];
    if (b !== this.biome) {
      this.biome = b;
      this.showBanner('NOVA REGIÃO', BIOMES[b].name, '#a5f3fc', 2);
    }
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    const inp = this.input;
    p.inv = Math.max(0, p.inv - dt);
    p.dashT = Math.max(0, p.dashT - dt);
    p.shieldT = Math.max(0, p.shieldT - dt);
    p.phaseT = Math.max(0, p.phaseT - dt);
    p.nitroT = Math.max(0, p.nitroT - dt);
    p.laserT = Math.max(0, p.laserT - dt);
    p.alchemyT = Math.max(0, p.alchemyT - dt);
    p.fireCd = Math.max(0, p.fireCd - dt);
    p.ramCd = Math.max(0, p.ramCd - dt);
    if (this.canAct()) p.skillCd = Math.max(0, p.skillCd - dt);

    if (this.phase === 'dead') {
      p.vx *= 0.98;
      p.x += p.vx * dt;
      p.y += 140 * dt;
      return;
    }
    if (this.phase === 'delivered' && this.bY !== null) {
      p.x += (W / 2 - p.x) * damp(3, dt);
      p.y += (this.bY + 6 - p.y) * damp(3, dt);
      p.bank *= 0.9;
      return;
    }

    const ax = inp.axis();
    let tvx = ax.x * this.maxSpeed;
    let tvy = ax.y * this.maxSpeed;
    if (inp.pointer.active) {
      tvx = (inp.pointer.x - p.x) * 8;
      tvy = (inp.pointer.y - 80 - p.y) * 8;
      const m = Math.hypot(tvx, tvy);
      if (m > this.maxSpeed) {
        tvx *= this.maxSpeed / m;
        tvy *= this.maxSpeed / m;
      }
    }
    if (p.dashT <= 0) {
      const k = damp(this.agility, dt);
      p.vx += (tvx - p.vx) * k;
      p.vy += (tvy - p.vy) * k;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < 22) { p.x = 22; p.vx = Math.max(0, p.vx); }
    if (p.x > W - 22) { p.x = W - 22; p.vx = Math.min(0, p.vx); }
    if (p.y < 100) { p.y = 100; p.vy = Math.max(0, p.vy); }
    if (p.y > H - 40) { p.y = H - 40; p.vy = Math.min(0, p.vy); }
    p.bank += (clamp(p.vx / this.maxSpeed, -1, 1) - p.bank) * damp(8, dt);

    // rastros
    p.ghostT -= dt;
    if ((p.dashT > 0 || p.nitroT > 0) && p.ghostT <= 0) {
      p.ghostT = 0.03;
      this.particle({ x: p.x, y: p.y, kind: 'ghost', rot: p.bank, life: 0.25 });
    }
    if (p.nitroT > 0) {
      for (let i = 0; i < 2; i++) {
        this.particle({ x: p.x + rand(-6, 6), y: p.y + 26, vx: rand(-30, 30), vy: rand(200, 320), kind: 'dot', color: Math.random() < 0.5 ? '#ffb703' : '#fb5607', size: rand(3, 6), life: 0.35 });
      }
    }
    if (p.alchemyT > 0 && Math.random() < 0.4) {
      this.particle({ x: p.x + rand(-26, 26), y: p.y + rand(-26, 26), vy: -40, kind: 'spark', color: '#c39bff', size: 2, life: 0.5 });
    }

    if (!this.canAct()) return;

    if (inp.firing() && p.fireCd <= 0 && p.laserT <= 0) {
      this.shots.push({ x: p.x, y: p.y - 20, vx: p.vx * 0.08, vy: -720, r: 6, dmg: this.dmg, t: 0, dead: false });
      p.fireCd = 1 / this.fireRate;
      sfx.shoot();
    }
    if (inp.consume('skill')) this.activateSkill();
  }

  private activateSkill() {
    const p = this.player;
    const sk = this.skin.skill;
    if (p.skillCd > 0) return;
    p.skillCd = this.skillCdMax;
    sfx.skill();
    this.floatText(p.x, p.y - 36, sk.name.toUpperCase(), '#ffe066', 18);
    switch (sk.id) {
      case 'dash': {
        const ax = this.input.axis();
        let dx = ax.x;
        let dy = ax.y;
        if (this.input.pointer.active || (!dx && !dy)) {
          dx = p.vx;
          dy = p.vy;
        }
        const m = Math.hypot(dx, dy);
        if (m < 1) {
          dx = 0;
          dy = -1;
        } else {
          dx /= m;
          dy /= m;
        }
        p.vx = dx * 1150;
        p.vy = dy * 1150;
        p.dashT = sk.duration;
        p.inv = Math.max(p.inv, 0.4);
        break;
      }
      case 'shield':
        p.shieldT = sk.duration;
        break;
      case 'slowmo':
        this.slowmo = sk.duration;
        break;
      case 'phase':
        p.phaseT = sk.duration;
        this.burst(p.x, p.y, 16, 'rgba(40,40,60,0.7)', 90, 'smoke', 6);
        break;
      case 'nitro':
        p.nitroT = sk.duration;
        this.shake = 6;
        break;
      case 'laser':
        p.laserT = sk.duration;
        break;
      case 'alchemy':
        p.alchemyT = sk.duration;
        this.alchemize();
        this.particle({ x: p.x, y: p.y, kind: 'ring', size: 500, life: 0.7, color: '#c39bff' });
        break;
      case 'nova':
        this.nova();
        break;
    }
  }

  private updateSpawns(wdt: number) {
    if (this.phase !== 'flight' || this.boss) return;
    if (!this.m.endless && this.distance > this.m.length - 450) return;
    const ratio = Math.max(0.3, this.scroll / this.m.scroll);
    const prog = this.m.endless ? 0 : this.distance / this.m.length;
    const rate = this.m.rate * (1 + 0.5 * prog) * (this.m.endless ? 1 + this.distance / 15000 : 1);

    this.spawnT -= wdt * ratio;
    if (this.spawnT <= 0) {
      const kind = weightedPick(this.m.spawns);
      const e = spawnEntity(this, kind);
      if (kind === 'seagull' && Math.random() < 0.3) {
        for (const off of [-40, 40]) {
          const w = spawnEntity(this, 'seagull');
          w.d.x0 = clamp(e.d.x0 + off, 40, W - 40);
          w.y = e.y - 30;
          w.vy = e.vy;
          w.d.ph = e.d.ph;
          w.d.amp = e.d.amp;
          w.d.f = e.d.f;
        }
      }
      this.spawnT = rand(0.75, 1.25) / rate;
    }

    this.coinT -= wdt * ratio;
    if (this.coinT <= 0) {
      this.spawnCoinPattern();
      this.coinT = rand(1.6, 2.8);
    }

    this.pickupT -= wdt;
    if (this.pickupT <= 0) {
      const p = this.player;
      const kind = p.hp < p.maxHp && Math.random() < 0.6 ? 'heart' : 'corn';
      this.pickups.push({ x: rand(50, W - 50), y: -30, kind, t: 0, dead: false });
      this.pickupT = rand(14, 22);
    }
  }

  private spawnCoinPattern() {
    const type = Math.floor(Math.random() * 5);
    const cx = rand(60, W - 60);
    const add = (x: number, y: number) => this.dropCoin(clamp(x, 20, W - 20), y, 1, false);
    switch (type) {
      case 0:
        for (let i = 0; i < 6; i++) add(cx, -20 - i * 32);
        break;
      case 1:
        for (let i = 0; i < 5; i++) add(cx + (i - 2) * 36, -20);
        break;
      case 2:
        for (let i = 0; i < 8; i++) add(cx + Math.sin(i * 0.8) * 50, -20 - i * 28);
        break;
      case 3: {
        const c = clamp(cx, 90, W - 90);
        for (let i = 0; i < 8; i++) add(c + Math.cos((i / 8) * TAU) * 44, -70 + Math.sin((i / 8) * TAU) * 44);
        this.dropCoin(c, -70, 5, false);
        break;
      }
      default:
        for (let i = 0; i < 7; i++) add(cx + (i % 2 ? 30 : -30), -20 - i * 30);
    }
  }

  private updateProjectiles(dt: number, wdt: number) {
    for (const b of this.bullets) {
      b.t += wdt;
      if (b.homing > 0 && b.t < b.homing) {
        const sp = Math.hypot(b.vx, b.vy);
        let cur = Math.atan2(b.vy, b.vx);
        const want = this.aim(b.x, b.y);
        const diff = ((want - cur + Math.PI * 3) % TAU) - Math.PI;
        cur += clamp(diff, -2.4 * wdt, 2.4 * wdt);
        b.vx = Math.cos(cur) * sp;
        b.vy = Math.sin(cur) * sp;
      }
      if (b.kind === 'missile' && Math.random() < 0.5) {
        this.particle({ x: b.x - b.vx * 0.03, y: b.y - b.vy * 0.03, kind: 'smoke', size: 3, life: 0.35, color: 'rgba(210,210,210,0.5)' });
      }
      b.x += b.vx * wdt;
      b.y += b.vy * wdt;
      if (b.x < -40 || b.x > W + 40 || b.y < -80 || b.y > H + 40) b.dead = true;
    }
    for (const s of this.shots) {
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y < -20) s.dead = true;
    }
    const p = this.player;
    for (const bm of this.beams) {
      bm.t += wdt;
      if (bm.t > bm.warn + bm.active) bm.dead = true;
    }
    for (const z of this.zones) {
      z.t += wdt;
      if (z.follow && z.t < z.warn * 0.75) {
        z.x += (p.x - z.x) * damp(3.5, wdt);
        z.y += (p.y - z.y) * damp(3.5, wdt);
      }
      if (!z.exploded && z.t >= z.warn) {
        z.exploded = true;
        this.explosion(z.x, z.y, 1.3);
        this.shake = Math.max(this.shake, 8);
        if (dist2(p.x, p.y, z.x, z.y) < (z.r + p.r * 0.4) ** 2) this.hurt();
      }
      if (z.t > z.warn + 0.3) z.dead = true;
    }
    for (const pk of this.pickups) {
      pk.t += dt;
      pk.y += this.scroll * wdt;
      if (pk.y > H + 30) pk.dead = true;
    }
  }

  private updateCoins(dt: number, wdt: number) {
    const p = this.player;
    const alive = this.phase !== 'dead';
    const global = p.alchemyT > 0 || this.phase === 'delivered';
    const mr2 = this.magnetR ** 2;
    for (const c of this.coins) {
      c.t += dt;
      c.vx *= Math.exp(-4 * wdt);
      c.vy *= Math.exp(-4 * wdt);
      c.x += c.vx * wdt;
      c.y += c.vy * wdt + this.scroll * wdt;
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const d2 = dx * dx + dy * dy;
      if (alive && !c.pulled && c.t > 0.3 && (global || d2 < mr2)) c.pulled = true;
      if (c.pulled && alive) {
        const d = Math.sqrt(d2) || 1;
        const sp = 560 + c.t * 120;
        c.x += (dx / d) * sp * dt;
        c.y += (dy / d) * sp * dt;
      }
      if (alive && d2 < (p.r + 10) ** 2) {
        c.dead = true;
        this.coinsCollected += c.value;
        sfx.coin();
        this.particle({ x: c.x, y: c.y, kind: 'ring', size: 14, life: 0.25, color: '#ffd23f' });
        if (c.value > 1) this.floatText(c.x, c.y - 10, `+${c.value}`, '#ffd23f', 16);
      }
      if (c.y > H + 30) c.dead = true;
    }
  }

  private updateParticles(dt: number) {
    for (const q of this.particles) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += q.grav * dt;
      q.rot += q.vr * dt;
      if (q.kind === 'feather' || q.kind === 'confetti' || q.kind === 'dot') {
        q.vx *= Math.exp(-2.5 * dt);
        q.vy *= Math.exp(-2.5 * dt);
      }
      if (q.kind === 'feather') q.vy += 30 * dt;
    }
  }

  private collisions(dt: number) {
    const p = this.player;

    // cocôs do pombo
    for (const s of this.shots) {
      for (const e of this.entities) {
        if (!e.shootable || e.dead) continue;
        if (dist2(s.x, s.y, e.x, e.y) < (e.r + s.r) ** 2) {
          s.dead = true;
          this.damageEntity(e, s.dmg);
          this.burst(s.x, s.y, 4, '#f6f6ef', 80, 'dot', 2);
          break;
        }
      }
      const b = this.boss;
      if (!s.dead && b && b.mode !== 'enter' && b.dying <= 0 && dist2(s.x, s.y, b.x, b.y) < (b.r + s.r) ** 2) {
        s.dead = true;
        this.hitBoss(s.dmg);
        this.burst(s.x, s.y, 5, '#f6f6ef', 100, 'dot', 2.5);
        sfx.enemyHit();
      }
    }

    // laser ocular
    if (p.laserT > 0 && this.canAct()) {
      const top = p.y - 22;
      for (const e of this.entities) {
        if (e.dead || e.y > top || e.y < -30 || Math.abs(e.x - p.x) > 22 + e.r) continue;
        if (e.shootable) this.damageEntity(e, 30 * dt);
        else if (e.kind === 'chinelo' || e.kind === 'kite') this.killEntity(e);
      }
      for (const b of this.bullets) {
        if (b.y < top && Math.abs(b.x - p.x) < 22 + b.r) {
          b.dead = true;
          this.particle({ x: b.x, y: b.y, kind: 'spark', color: '#a5f3fc', size: 2, vx: rand(-80, 80), vy: rand(-80, 80), life: 0.3 });
        }
      }
      const bo = this.boss;
      if (bo && bo.y < top && Math.abs(bo.x - p.x) < bo.r + 18) {
        this.hitBoss(26 * dt);
        if (Math.random() < 0.5) this.particle({ x: p.x + rand(-10, 10), y: bo.y + bo.r * 0.6, kind: 'spark', color: '#e0ffff', size: 2.5, vx: rand(-200, 200), vy: rand(-60, 160), life: 0.3 });
      }
    }

    if (!this.canAct()) return;

    // projéteis inimigos
    const safe = this.isSafe();
    for (const b of this.bullets) {
      if (dist2(b.x, b.y, p.x, p.y) > (b.r + p.r * 0.7) ** 2) continue;
      if (p.alchemyT > 0) {
        b.dead = true;
        this.dropCoin(b.x, b.y, 1, false);
      } else if (p.shieldT > 0) {
        b.dead = true;
        this.burst(b.x, b.y, 5, '#bfe9ff', 120, 'spark', 2);
      } else if (!safe && this.hurt()) {
        b.dead = true;
      }
    }
    if (p.alchemyT > 0) {
      for (const b of this.bullets) {
        if (!b.dead && dist2(b.x, b.y, p.x, p.y) < 95 * 95) {
          b.dead = true;
          this.dropCoin(b.x, b.y, 1, false);
          this.particle({ x: b.x, y: b.y, kind: 'ring', size: 14, life: 0.3, color: '#c39bff' });
        }
      }
    }

    // obstáculos e NPCs
    for (const e of this.entities) {
      if (e.dead) continue;
      if (touchesFriend(e, p.x, p.y, p.r)) {
        e.dead = true;
        const bonus = 8;
        for (let i = 0; i < bonus; i++) this.dropCoin(e.x, e.y, 1, true);
        sfx.pickup();
        if (p.hp < p.maxHp && Math.random() < 0.35) {
          p.hp++;
          this.floatText(e.x, e.y - 30, 'Valeu, parça! +♥', '#ff8fab', 17);
        } else {
          this.floatText(e.x, e.y - 30, 'Valeu, parça!', '#ffffff', 17);
        }
        continue;
      }
      if (!e.hostile || !entityHitsPlayer(e, p.x, p.y, p.r)) continue;
      if (p.phaseT > 0) continue;
      if (p.nitroT > 0 || p.shieldT > 0) {
        if (isDestructible(e) && (p.nitroT > 0 || e.kind !== 'wire')) {
          this.killEntity(e);
          this.shake = Math.max(this.shake, 4);
        }
        continue;
      }
      this.hurt();
    }

    // corpo do chefão
    const bo = this.boss;
    if (bo && bo.dying <= 0 && dist2(bo.x, bo.y, p.x, p.y) < (bo.r * 0.8 + p.r) ** 2) {
      if (p.nitroT > 0) {
        if (p.ramCd <= 0) {
          this.hitBoss(6);
          p.ramCd = 0.25;
          p.vy = 500;
          this.shake = 8;
        }
      } else if (p.phaseT <= 0) {
        this.hurt();
      }
    }

    // lasers
    for (const bm of this.beams) {
      if (bm.t < bm.warn || bm.t > bm.warn + bm.active) continue;
      if (p.y > bm.y0 && Math.abs(p.x - bm.x) < bm.w / 2 + p.r * 0.5) this.hurt();
    }

    // itens
    for (const pk of this.pickups) {
      if (dist2(pk.x, pk.y, p.x, p.y) > (p.r + 16) ** 2) continue;
      pk.dead = true;
      if (pk.kind === 'heart') {
        if (p.hp < p.maxHp) {
          p.hp++;
          this.floatText(pk.x, pk.y - 20, '+1 VIDA', '#ff8fab', 18);
        } else {
          this.coinsCollected += 10;
          this.floatText(pk.x, pk.y - 20, '+10', '#ffd23f', 18);
        }
        sfx.heal();
      } else {
        p.skillCd = 0;
        this.floatText(pk.x, pk.y - 20, 'HABILIDADE PRONTA!', '#ffe066', 16);
        sfx.pickup();
      }
    }
  }

  private updatePhase() {
    const p = this.player;
    switch (this.phase) {
      case 'pickup':
        if (dist2(p.x, p.y, W / 2, this.aY) < 36 * 36) {
          this.pkgOnPad = false;
          this.phase = 'flight';
          this.phaseT = 0;
          sfx.pickup();
          this.burst(W / 2, this.aY, 20, '#ffd23f', 160, 'confetti', 4);
          this.showBanner('ENCOMENDA COLETADA!', this.m.endless ? 'Voe o mais longe possível!' : `Leve até: ${this.m.to}`, '#ffd23f', 2.6);
        }
        break;
      case 'flight':
        if (this.m.endless) {
          if (!this.boss && this.distance >= this.nextBossAt) {
            this.startBoss(ENDLESS_BOSSES[this.bossCycle % ENDLESS_BOSSES.length], 1 + this.bossCycle * 0.2);
            this.bossCycle++;
          }
        } else {
          if (this.m.boss && !this.bossDone && !this.boss && this.distance >= this.m.length * (this.m.bossAt ?? 0.6)) {
            this.startBoss(this.m.boss, 1);
          }
          if (!this.boss && this.distance >= this.m.length) {
            this.phase = 'arrival';
            this.phaseT = 0;
            this.bY = -200;
            this.showBanner('PONTO B À VISTA!', this.m.to, '#4ade80', 2.4);
          }
        }
        break;
      case 'arrival':
        if (!this.arrivalCleared && this.scroll < 40) {
          this.arrivalCleared = true;
          for (const e of this.entities) {
            if (!e.hostile) continue;
            e.dead = true;
            this.burst(e.x, e.y, 6, 'rgba(255,255,255,0.8)', 80, 'smoke', 5);
          }
          this.clearHazards();
        }
        if (this.bY !== null && this.bY > 120 && dist2(p.x, p.y, W / 2, this.bY) < 58 * 58) this.deliver();
        break;
      case 'delivered':
        if (this.phaseT > 2.6) this.end(true);
        break;
      case 'dead':
        if (this.phaseT > 2.4) this.end(false);
        break;
    }
  }

  private startBoss(kind: BossKind, hpScale: number) {
    this.boss = createBoss(kind, hpScale);
    this.showBanner('⚠ CHEFÃO ⚠', this.boss.name, '#ff6b6b', 2.6);
    sfx.boss();
    this.shake = 6;
  }

  private deliver() {
    const p = this.player;
    this.phase = 'delivered';
    this.phaseT = 0;
    this.deliverPkg = { x: p.x, y: p.y + 20 };
    sfx.win();
    for (let i = 0; i < 70; i++) {
      const a = rand(0, TAU);
      const s = rand(80, 360);
      this.particle({
        x: W / 2, y: this.bY ?? H / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, grav: 260, kind: 'confetti',
        color: ['#ffd23f', '#ff4d6d', '#3bceac', '#5e60ce', '#ff8c42'][i % 5], size: rand(5, 9), rot: rand(0, TAU), vr: rand(-10, 10), life: rand(1.2, 2),
      });
    }
    this.showBanner('ENTREGUE!', this.m.to, '#4ade80', 2.6);
  }

  private end(success: boolean) {
    if (this.ended) return;
    this.ended = true;
    const p = this.player;
    this.cb.onEnd({
      success,
      endless: !!this.m.endless,
      missionId: this.m.id,
      coinsCollected: this.coinsCollected,
      damageTaken: this.damageTaken,
      hpLeft: Math.max(0, p.hp),
      maxHp: p.maxHp,
      time: this.time,
      distance: this.distance,
      bossesDefeated: this.bossesDefeated,
    });
  }

  private updateWeather(dt: number) {
    const b = this.biomeDef;
    if (b.rain) {
      for (const d of this.rain) {
        d.y += 900 * dt;
        d.x -= 120 * dt;
        if (d.y > H) {
          d.y = -20;
          d.x = rand(0, W + 60);
        }
      }
    }
    if (b.lightning) {
      this.lightningT -= dt;
      if (this.lightningT <= 0) {
        this.lightningT = rand(5, 10);
        this.flash = Math.max(this.flash, 0.45);
        this.flashColor = '#e8f0ff';
        sfx.thunder();
      }
    }
  }

  // ------------------------------------------------------------ desenho

  render(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const bd = this.biomeDef;
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-1, 1) * this.shake * 0.5, rand(-1, 1) * this.shake * 0.5);

    D.drawGround(ctx, bd, this.groundY, this.t);
    if (this.aY < H + 120) D.drawLandmark(ctx, W / 2, this.aY, 'A', this.m.from, this.t, this.phase === 'pickup');
    if (this.bY !== null) D.drawLandmark(ctx, W / 2, this.bY, 'B', this.m.to, this.t, this.phase === 'arrival');
    D.drawOverlay(ctx, bd);
    if (bd.lamps) D.drawLamps(ctx, this.groundY);

    if (this.pkgOnPad) {
      D.drawPackage(ctx, W / 2, this.aY, 0, 1.6);
      const by = this.aY - 44 + Math.sin(this.t * 6) * 5;
      ctx.fillStyle = '#ffd23f';
      ctx.strokeStyle = '#1d2340';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 10, by - 12);
      ctx.lineTo(W / 2 + 10, by - 12);
      ctx.lineTo(W / 2, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (this.deliverPkg && this.bY !== null) {
      const k = clamp(this.phaseT / 0.6, 0, 1);
      D.drawPackage(ctx, this.deliverPkg.x + (W / 2 - this.deliverPkg.x) * k, this.deliverPkg.y + (this.bY - this.deliverPkg.y) * k, 0, 1 + k * 0.6);
    }

    for (const e of this.entities) if (e.kind === 'wind') drawEntity(ctx, e, this);
    for (const c of this.coins) D.drawCoin(ctx, c.x, c.y, this.t, c.value);
    for (const pk of this.pickups) D.drawPickup(ctx, pk.kind, pk.x, pk.y, pk.t);
    for (const e of this.entities) if (e.kind !== 'wind') drawEntity(ctx, e, this);

    for (const z of this.zones) this.drawZone(ctx, z);
    if (this.boss) drawBoss(ctx, this.boss, this);
    for (const bm of this.beams) this.drawBeam(ctx, bm);
    if (p.laserT > 0) this.drawPlayerLaser(ctx);
    for (const s of this.shots) D.drawPoopShot(ctx, s.x, s.y, s.r);
    for (const b of this.bullets) D.drawBullet(ctx, b);

    this.drawPlayer(ctx);
    if (this.fallPkg) {
      const f = this.fallPkg;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      D.drawPackage(ctx, 0, 0, 0, Math.max(0.3, 1.4 - this.phaseT * 0.4));
      ctx.restore();
    }
    this.drawParticles(ctx);

    D.drawClouds(ctx, this.groundY, bd.darkClouds);
    if (bd.rain) {
      ctx.strokeStyle = 'rgba(190,210,255,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const d of this.rain) {
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.l * 0.13, d.y + d.l);
      }
      ctx.stroke();
    }
    if (p.nitroT > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const x = rand(0, W);
        const y = rand(0, H);
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rand(40, 90));
      }
      ctx.stroke();
    }
    ctx.restore();

    if (this.slowmo > 0) {
      ctx.fillStyle = 'rgba(80,140,255,0.13)';
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, 'rgba(20,30,80,0)');
      g.addColorStop(1, 'rgba(20,30,80,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(0.8, this.flash);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    this.drawHUD(ctx);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    if (this.phase === 'dead') {
      const k = clamp(1 - this.phaseT * 0.35, 0.2, 1);
      D.drawPigeon(ctx, this.skin, p.x, p.y, { t: this.t * 0.3, scale: 0.95 * k, angle: this.phaseT * 9, alpha: k });
      return;
    }
    let alpha = 1;
    if (p.phaseT > 0) alpha = 0.38;
    else if (p.inv > 0 && p.dashT <= 0 && Math.floor(this.t * 20) % 2 === 0) alpha = 0.35;
    const carrying = this.phase === 'flight' || this.phase === 'arrival';
    const flap = p.nitroT > 0 ? 24 : 12 + Math.max(0, -p.vy) / 60;
    if (p.phaseT > 0) {
      ctx.fillStyle = 'rgba(40,30,70,0.35)';
      D.circle(ctx, p.x, p.y, 30);
      ctx.fill();
    }
    D.drawPigeon(ctx, this.skin, p.x, p.y, { t: this.t, scale: 0.95, bank: p.bank, carrying, alpha, flapSpeed: flap });
    if (p.shieldT > 0) {
      const pulse = Math.sin(this.t * 10) * 2;
      const fading = p.shieldT < 1 && Math.floor(this.t * 12) % 2 === 0;
      ctx.save();
      ctx.globalAlpha = fading ? 0.35 : 0.85;
      const g = ctx.createRadialGradient(p.x - 8, p.y - 10, 4, p.x, p.y, 38);
      g.addColorStop(0, 'rgba(255,255,255,0.05)');
      g.addColorStop(0.8, 'rgba(160,220,255,0.25)');
      g.addColorStop(1, 'rgba(200,240,255,0.6)');
      ctx.fillStyle = g;
      D.circle(ctx, p.x, p.y, 36 + pulse);
      ctx.fill();
      ctx.strokeStyle = 'rgba(220,245,255,0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPlayerLaser(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const top = p.y - 22;
    const w = 26 + Math.sin(this.t * 40) * 4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(p.x - w, 0, p.x + w, 0);
    g.addColorStop(0, 'rgba(0,229,255,0)');
    g.addColorStop(0.35, 'rgba(0,229,255,0.5)');
    g.addColorStop(0.5, 'rgba(230,255,255,0.95)');
    g.addColorStop(0.65, 'rgba(0,229,255,0.5)');
    g.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - w, 0, w * 2, top);
    ctx.fillStyle = 'rgba(200,255,255,0.8)';
    D.circle(ctx, p.x, top, 12);
    ctx.fill();
    ctx.restore();
  }

  private drawBeam(ctx: CanvasRenderingContext2D, bm: Beam) {
    ctx.save();
    if (bm.t < bm.warn) {
      const k = bm.t / bm.warn;
      ctx.fillStyle = `rgba(255,40,60,${0.08 + 0.12 * k})`;
      ctx.fillRect(bm.x - bm.w / 2, bm.y0, bm.w, H - bm.y0);
      ctx.strokeStyle = `rgba(255,60,80,${0.5 + 0.5 * Math.sin(this.t * 30)})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(bm.x, bm.y0);
      ctx.lineTo(bm.x, H);
      ctx.stroke();
    } else {
      ctx.globalCompositeOperation = 'lighter';
      const w = bm.w * (0.9 + Math.random() * 0.2);
      const g = ctx.createLinearGradient(bm.x - w / 2, 0, bm.x + w / 2, 0);
      g.addColorStop(0, 'rgba(255,40,80,0)');
      g.addColorStop(0.3, 'rgba(255,40,80,0.7)');
      g.addColorStop(0.5, 'rgba(255,230,240,1)');
      g.addColorStop(0.7, 'rgba(255,40,80,0.7)');
      g.addColorStop(1, 'rgba(255,40,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(bm.x - w / 2, bm.y0, w, H - bm.y0);
    }
    ctx.restore();
  }

  private drawZone(ctx: CanvasRenderingContext2D, z: Zone) {
    if (z.exploded) return;
    const k = z.t / z.warn;
    ctx.save();
    ctx.fillStyle = `rgba(255,240,150,${0.15 + 0.2 * k})`;
    D.circle(ctx, z.x, z.y, z.r);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,80,60,${0.6 + 0.4 * Math.sin(this.t * 25)})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,80,60,0.9)';
    ctx.lineWidth = 2;
    D.circle(ctx, z.x, z.y, z.r * (1 - k));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(z.x - 12, z.y);
    ctx.lineTo(z.x + 12, z.y);
    ctx.moveTo(z.x, z.y - 12);
    ctx.lineTo(z.x, z.y + 12);
    ctx.stroke();
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const q of this.particles) {
      const k = Math.max(0, q.life / q.max);
      ctx.globalAlpha = Math.min(1, k * 1.5);
      switch (q.kind) {
        case 'dot':
          ctx.fillStyle = q.color;
          D.circle(ctx, q.x, q.y, q.size * (0.4 + 0.6 * k));
          ctx.fill();
          break;
        case 'spark':
          ctx.strokeStyle = q.color;
          ctx.lineWidth = q.size;
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04);
          ctx.stroke();
          break;
        case 'feather':
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.rot);
          ctx.fillStyle = q.color;
          D.ellipse(ctx, 0, 0, q.size * 1.6, q.size * 0.6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-q.size * 1.6, 0);
          ctx.lineTo(q.size * 1.6, 0);
          ctx.stroke();
          ctx.restore();
          break;
        case 'ring':
          ctx.strokeStyle = q.color;
          ctx.lineWidth = 6 * k + 1;
          D.circle(ctx, q.x, q.y, q.size * (1 - k) + 2);
          ctx.stroke();
          break;
        case 'text':
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          D.outlinedText(ctx, q.text ?? '', q.x, q.y, q.size, q.color, 'rgba(0,0,0,0.75)', 4);
          break;
        case 'ghost':
          D.drawPigeon(ctx, this.skin, q.x, q.y, { t: this.t, scale: 0.95, bank: q.rot, alpha: 0.35 * k, shadow: false, carrying: true });
          break;
        case 'smoke':
          ctx.fillStyle = q.color;
          D.circle(ctx, q.x, q.y, q.size * (2 - k));
          ctx.fill();
          break;
        case 'confetti':
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.rot);
          ctx.fillStyle = q.color;
          ctx.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2);
          ctx.restore();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawHUD(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    ctx.save();
    ctx.textBaseline = 'middle';

    // barra de progresso A → B
    ctx.fillStyle = 'rgba(12,16,32,0.6)';
    D.rr(ctx, 60, 8, W - 120, 32, 16);
    ctx.fill();
    const yy = 24;
    if (!this.m.endless) {
      const x0 = 96;
      const x1 = W - 96;
      const prog = this.phase === 'pickup' ? 0 : this.phase === 'flight' ? clamp(this.distance / this.m.length, 0, 1) : 1;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      D.rr(ctx, x0, yy - 4, x1 - x0, 8, 4);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      D.rr(ctx, x0, yy - 4, Math.max(8, (x1 - x0) * prog), 8, 4);
      ctx.fill();
      if (this.m.boss) {
        const bx = x0 + (x1 - x0) * (this.m.bossAt ?? 0.6);
        ctx.fillStyle = this.bossDone ? '#4ade80' : '#ff4d4d';
        D.circle(ctx, bx, yy, 7);
        ctx.fill();
        ctx.strokeStyle = '#1d2340';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.bossDone ? '✓' : '!', bx, yy + 1);
      }
      for (const [x, letter, col] of [[76, 'A', '#3b82f6'], [W - 76, 'B', '#22c55e']] as const) {
        ctx.fillStyle = col;
        D.circle(ctx, x, yy, 11);
        ctx.fill();
        ctx.textAlign = 'center';
        D.outlinedText(ctx, letter, x, yy + 1, 14, '#ffffff', 'rgba(0,0,0,0.3)', 2);
      }
      D.drawPigeon(ctx, this.skin, x0 + (x1 - x0) * prog, yy, { t: this.t, scale: 0.42, shadow: false });
    } else {
      ctx.textAlign = 'center';
      D.outlinedText(ctx, `${Math.floor(this.distance / 10)} m`, W / 2, yy + 1, 20, '#ffffff', 'rgba(0,0,0,0.5)', 4);
    }

    // vidas
    for (let i = 0; i < p.maxHp; i++) D.drawHeart(ctx, 22 + i * 24, 60, 9, i < p.hp ? '#ff4d6d' : 'rgba(255,255,255,0.22)');

    // moedas
    ctx.textAlign = 'right';
    ctx.font = `22px ${D.FONT}`;
    const txt = String(this.coinsCollected);
    const tw = ctx.measureText(txt).width;
    D.outlinedText(ctx, txt, W - 16, 61, 22, '#ffd23f', 'rgba(0,0,0,0.7)', 5);
    D.drawCoin(ctx, W - 30 - tw, 60, 0, 1);

    // chefão
    const b = this.boss;
    if (b) {
      const bw = W - 80;
      const show = b.mode === 'enter' ? clamp(b.mt / 1.2, 0, 1) : 1;
      ctx.globalAlpha = show;
      ctx.fillStyle = 'rgba(12,16,32,0.7)';
      D.rr(ctx, 40, 82, bw, 30, 10);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      D.rr(ctx, 50, 100, bw - 20, 7, 3.5);
      ctx.fill();
      ctx.fillStyle = b.hp < b.maxHp * 0.5 ? '#ff6b35' : '#ff3b5c';
      D.rr(ctx, 50, 100, Math.max(0, (bw - 20) * (b.hp / b.maxHp)), 7, 3.5);
      ctx.fill();
      ctx.textAlign = 'left';
      D.outlinedText(ctx, b.name.toUpperCase(), 52, 91, 13, '#ffffff', 'rgba(0,0,0,0.6)', 3);
      ctx.globalAlpha = 1;
    }

    // botão de habilidade
    const sx = W - 52;
    const sy = H - 56;
    const sr = 34;
    const sk = this.skin.skill;
    const ready = p.skillCd <= 0;
    ctx.fillStyle = 'rgba(12,16,32,0.6)';
    D.circle(ctx, sx, sy, sr);
    ctx.fill();
    if (!ready) {
      const k = 1 - p.skillCd / this.skillCdMax;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, sr, -Math.PI / 2, -Math.PI / 2 + k * TAU);
      ctx.closePath();
      ctx.fill();
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = ready ? `rgba(255,224,102,${0.75 + 0.25 * Math.sin(this.t * 6)})` : 'rgba(255,255,255,0.25)';
    D.circle(ctx, sx, sy, sr);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.globalAlpha = ready ? 1 : 0.45;
    ctx.font = '30px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    ctx.fillText(sk.icon, sx, sy + 2);
    ctx.globalAlpha = 1;
    if (!ready) D.outlinedText(ctx, Math.ceil(p.skillCd).toString(), sx, sy + 2, 20, '#ffffff', 'rgba(0,0,0,0.8)', 4);
    if (!this.touch) D.outlinedText(ctx, 'SHIFT', sx, sy + sr + 9, 11, '#ffffff', 'rgba(0,0,0,0.7)', 3);

    // dica de controles
    if (this.phase === 'pickup') {
      const lines = this.touch
        ? ['Arraste o dedo para voar', 'Segurando = atira cocô 💩', 'Toque no botão ao lado = habilidade']
        : ['WASD / Setas: voar', 'Espaço: atirar cocô 💩', 'Shift: habilidade  •  Esc: pausar'];
      ctx.fillStyle = 'rgba(12,16,32,0.65)';
      D.rr(ctx, W / 2 - 150, H - 150, 300, 84, 14);
      ctx.fill();
      ctx.font = `15px ${D.FONT}`;
      ctx.fillStyle = '#ffffff';
      lines.forEach((l, i) => ctx.fillText(l, W / 2, H - 128 + i * 22));
    }

    // banner central
    const bn = this.banner;
    if (bn) {
      const k = bn.t / bn.dur;
      const a = k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1;
      const sc = k < 0.1 ? 0.6 + 0.4 * (k / 0.1) : 1;
      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.translate(W / 2, H * 0.36);
      ctx.scale(sc, sc);
      ctx.textAlign = 'center';
      D.outlinedText(ctx, bn.text, 0, 0, 38, bn.color, 'rgba(10,14,30,0.9)', 8);
      if (bn.sub) D.outlinedText(ctx, bn.sub, 0, 36, 20, '#ffffff', 'rgba(10,14,30,0.9)', 5);
      ctx.restore();
    }
    ctx.restore();
  }
}
