import type { GameResult, MissionDef } from './game/types';
import type { SaveData } from './save';

export interface RunSummary {
  mission: MissionDef;
  result: GameResult;
  base: number;
  collected: number;
  bonus: number;
  distanceBonus: number;
  total: number;
  stars: number;
  firstClear: boolean;
  newBest: boolean;
}

export function summarize(m: MissionDef, r: GameResult, save: SaveData): RunSummary {
  const empty = { mission: m, result: r, base: 0, bonus: 0, distanceBonus: 0, stars: 0, firstClear: false, newBest: false };
  if (m.endless) {
    const distanceBonus = Math.floor(r.distance / 50);
    const bonus = r.bossesDefeated * 60;
    return { ...empty, collected: r.coinsCollected, distanceBonus, bonus, total: r.coinsCollected + distanceBonus + bonus, newBest: r.distance > save.bestEndless };
  }
  if (!r.success) {
    const kept = Math.floor(r.coinsCollected * 0.5);
    return { ...empty, collected: kept, total: kept };
  }
  const firstClear = !save.missions[m.id]?.done;
  const base = firstClear ? m.reward : Math.round(m.reward * 0.5);
  const stars = r.damageTaken === 0 ? 3 : r.damageTaken <= 2 ? 2 : 1;
  const bonus = stars === 3 ? Math.round(m.reward * 0.3) : 0;
  return { ...empty, base, collected: r.coinsCollected, bonus, total: base + r.coinsCollected + bonus, stars, firstClear };
}

export function applyRun(s: SaveData, sum: RunSummary): SaveData {
  const next: SaveData = { ...s, coins: s.coins + sum.total, missions: { ...s.missions } };
  if (sum.mission.endless) {
    if (sum.result.distance > s.bestEndless) next.bestEndless = Math.floor(sum.result.distance);
  } else if (sum.result.success) {
    const prev = s.missions[sum.mission.id];
    next.missions[sum.mission.id] = { done: true, stars: Math.max(prev?.stars ?? 0, sum.stars) };
    next.deliveries = s.deliveries + 1;
  }
  return next;
}
