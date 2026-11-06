export type SkillId = 'dash' | 'shield' | 'slowmo' | 'phase' | 'nitro' | 'laser' | 'alchemy' | 'nova';
export type Accessory = 'none' | 'olive' | 'cap' | 'headband' | 'goggles' | 'visor' | 'hat' | 'flame';
export type BiomeId = 'cidade' | 'praia' | 'noite' | 'tempestade' | 'entardecer' | 'final';
export type BossKind = 'carcara' | 'gaivota' | 'drone' | 'urubu' | 'heli' | 'robogato';
export type EntityKind =
  | 'wire'
  | 'balloon'
  | 'kite'
  | 'cloud'
  | 'plane'
  | 'chinelo'
  | 'wind'
  | 'seagull'
  | 'hawk'
  | 'drone'
  | 'bat'
  | 'friend';

export interface SkinColors {
  body: string;
  wing: string;
  wingBar: string;
  tip: string;
  head: string;
  neck: string;
  neck2: string;
  beak: string;
  tail: string;
  tailTip: string;
  eye?: string;
}

export interface PigeonLook {
  colors: SkinColors;
  accessory: Accessory;
}

export interface SkillDef {
  id: SkillId;
  name: string;
  icon: string;
  desc: string;
  cooldown: number;
  duration: number;
}

export interface SkinDef extends PigeonLook {
  id: string;
  name: string;
  title: string;
  desc: string;
  price: number;
  /** speed: velocidade máxima (px/s) · agility: quão rápido responde aos comandos · hp: vida base */
  stats: { speed: number; agility: number; hp: number };
  mobility: string;
  skill: SkillDef;
  passive?: string;
}

export interface MissionDef {
  id: number;
  title: string;
  from: string;
  to: string;
  desc: string;
  biome: BiomeId;
  length: number;
  scroll: number;
  reward: number;
  rate: number;
  spawns: [EntityKind, number][];
  boss?: BossKind;
  bossAt?: number;
  endless?: boolean;
}

export interface BiomeDef {
  name: string;
  kind: 'city' | 'beach';
  ground: string;
  road: string;
  sidewalk: string;
  line: string;
  line2: string;
  roofs: string[];
  park: string;
  tree: string;
  sea?: string;
  seaDeep?: string;
  wetSand?: string;
  overlay: string | null;
  lamps: boolean;
  rain: boolean;
  lightning: boolean;
  darkClouds: boolean;
}

export interface Upgrades {
  asas: number;
  agilidade: number;
  vida: number;
  ima: number;
  recarga: number;
  coco: number;
}
export type UpgradeId = keyof Upgrades;

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  icon: string;
  desc: string;
  max: number;
  baseCost: number;
}

export interface GameResult {
  success: boolean;
  endless: boolean;
  missionId: number;
  coinsCollected: number;
  damageTaken: number;
  hpLeft: number;
  maxHp: number;
  time: number;
  distance: number;
  bossesDefeated: number;
}
