import type { UpgradeDef } from '../game/types';

export const UPGRADES: UpgradeDef[] = [
  { id: 'asas', name: 'Asas Fortes', icon: '🪶', desc: '+7% de velocidade de voo por nível.', max: 5, baseCost: 120 },
  { id: 'agilidade', name: 'Penas Aerodinâmicas', icon: '🌀', desc: '+12% de agilidade nas curvas por nível.', max: 5, baseCost: 100 },
  { id: 'vida', name: 'Peito de Aço', icon: '❤️', desc: '+1 de vida máxima por nível.', max: 3, baseCost: 260 },
  { id: 'ima', name: 'Bico Magnético', icon: '🧲', desc: 'Atrai moedas de mais longe.', max: 5, baseCost: 80 },
  { id: 'recarga', name: 'Milho Energético', icon: '🌽', desc: '-8% no tempo de recarga da habilidade por nível.', max: 5, baseCost: 150 },
  { id: 'coco', name: 'Cocô Turbinado', icon: '💩', desc: 'Mais cadência e dano no ataque.', max: 5, baseCost: 130 },
];

export function upgradeCost(u: UpgradeDef, level: number): number {
  return Math.round((u.baseCost * Math.pow(1.75, level)) / 10) * 10;
}
