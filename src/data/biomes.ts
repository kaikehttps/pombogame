import type { BiomeDef, BiomeId } from '../game/types';

const DAY_ROOFS = ['#c4553a', '#e08a47', '#e6c36a', '#8aa1b8', '#b8b0a2', '#7f9a6b', '#d77a8a', '#9a8cc4'];
const NIGHT_ROOFS = ['#7a3a2c', '#83552f', '#8a7740', '#4f6070', '#6e6960', '#4d5e42', '#7a4b55', '#5b5280'];

const city: BiomeDef = {
  name: 'Cidade',
  kind: 'city',
  ground: '#c2bbad',
  road: '#5a5e66',
  sidewalk: '#ddd6c8',
  line: '#f4f1e6',
  line2: '#f2c94c',
  roofs: DAY_ROOFS,
  park: '#79b85c',
  tree: '#3f8a3a',
  overlay: null,
  lamps: false,
  rain: false,
  lightning: false,
  darkClouds: false,
};

const night: BiomeDef = {
  ...city,
  name: 'Noite',
  ground: '#6f6a62',
  road: '#33363d',
  sidewalk: '#8a857a',
  line: '#cfcab8',
  line2: '#d4a937',
  roofs: NIGHT_ROOFS,
  park: '#3f6b33',
  tree: '#24521f',
  overlay: 'rgba(10,16,48,0.5)',
  lamps: true,
};

export const BIOMES: Record<BiomeId, BiomeDef> = {
  cidade: city,
  praia: {
    ...city,
    name: 'Praia',
    kind: 'beach',
    ground: '#f0d89e',
    sidewalk: '#f7f4ec',
    tree: '#2f8f46',
    sea: '#2aa7da',
    seaDeep: '#1479b8',
    wetSand: '#d9bc7c',
  },
  noite: night,
  tempestade: {
    ...city,
    name: 'Tempestade',
    ground: '#9a958b',
    road: '#43464d',
    sidewalk: '#b3ad9f',
    roofs: ['#9c4a37', '#a8723f', '#ad9855', '#6c8296', '#8e877b', '#62785a', '#a3626f', '#7a6f9e'],
    park: '#5a8c47',
    tree: '#2f6b2b',
    overlay: 'rgba(30,40,62,0.42)',
    rain: true,
    lightning: true,
    darkClouds: true,
  },
  entardecer: { ...city, name: 'Entardecer', overlay: 'sunset' },
  final: {
    ...night,
    name: 'Território Felino',
    overlay: 'rgba(40,8,60,0.5)',
    rain: true,
    lightning: true,
    darkClouds: true,
  },
};

export const ENDLESS_BIOMES: BiomeId[] = ['cidade', 'praia', 'entardecer', 'noite', 'tempestade', 'final'];
