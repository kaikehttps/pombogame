import type { Upgrades } from './game/types';

export interface SaveData {
  coins: number;
  owned: string[];
  skin: string;
  upgrades: Upgrades;
  missions: Record<number, { done: boolean; stars: number }>;
  bestEndless: number;
  deliveries: number;
  muted: boolean;
}

const KEY = 'pombo-express-save-v1';

export function defaultSave(): SaveData {
  return {
    coins: 0,
    owned: ['comum'],
    skin: 'comum',
    upgrades: { asas: 0, agilidade: 0, vida: 0, ima: 0, recarga: 0, coco: 0 },
    missions: {},
    bestEndless: 0,
    deliveries: 0,
    muted: false,
  };
}

export function loadSave(): SaveData {
  const def = defaultSave();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return def;
    const d = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...def,
      ...d,
      upgrades: { ...def.upgrades, ...(d.upgrades ?? {}) },
      missions: d.missions ?? {},
      owned: Array.isArray(d.owned) && d.owned.length ? d.owned : def.owned,
    };
  } catch {
    return def;
  }
}

export function writeSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // armazenamento indisponível (aba anônima etc.) — o jogo segue sem salvar
  }
}
