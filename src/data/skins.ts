import type { PigeonLook, SkinDef } from '../game/types';

export const SKINS: SkinDef[] = [
  {
    id: 'comum',
    name: 'Pombo Comum',
    title: 'O Clássico da Praça',
    price: 0,
    desc: 'Nasceu na praça, cresceu na praça. Confiável e sempre com fome.',
    colors: {
      body: '#8d95a3', wing: '#a3abb8', wingBar: '#3a3f4a', tip: '#4a505c', head: '#6e7685',
      neck: '#3fae7c', neck2: '#8a4fb8', beak: '#2d2d2d', tail: '#6a7180', tailTip: '#2f333b',
    },
    accessory: 'none',
    stats: { speed: 300, agility: 9, hp: 3 },
    mobility: 'Equilibrado: nem rápido, nem lento.',
    skill: {
      id: 'dash', name: 'Rasante', icon: '💨', cooldown: 2.6, duration: 0.2,
      desc: 'Impulso veloz na direção do voo. Fica invulnerável durante o rasante.',
    },
  },
  {
    id: 'paz',
    name: 'Pombo da Paz',
    title: 'Mensageiro Divino',
    price: 350,
    desc: 'Branco como algodão. Carrega um raminho de oliveira e muita calma.',
    colors: {
      body: '#f5f5f2', wing: '#ffffff', wingBar: '#d9d9d4', tip: '#cfd2d6', head: '#fbfbf8',
      neck: '#eef1ee', neck2: '#e6e2f0', beak: '#e9a06b', tail: '#efefea', tailTip: '#d6d6d0',
    },
    accessory: 'olive',
    stats: { speed: 290, agility: 8, hp: 4 },
    mobility: 'Voo suave e resistente.',
    skill: {
      id: 'shield', name: 'Escudo da Paz', icon: '🛡️', cooldown: 12, duration: 4,
      desc: 'Uma bolha sagrada que bloqueia qualquer dano por 4s.',
    },
  },
  {
    id: 'malandro',
    name: 'Pombo Malandro',
    title: 'Rei do Calçadão',
    price: 800,
    desc: 'De boné, óculos juliet e corrente de ouro. Na ginga dele, o mundo fica em câmera lenta.',
    colors: {
      body: '#a87b55', wing: '#b98c63', wingBar: '#5b3b22', tip: '#6e4a2c', head: '#8f6646',
      neck: '#d4a017', neck2: '#c0392b', beak: '#3a2a1e', tail: '#8a6343', tailTip: '#4b3220',
    },
    accessory: 'cap',
    stats: { speed: 320, agility: 10, hp: 3 },
    mobility: 'Ágil e estiloso.',
    skill: {
      id: 'slowmo', name: 'Ginga', icon: '😎', cooldown: 13, duration: 4,
      desc: 'O mundo desacelera por 4s. Só você continua no ritmo.',
    },
  },
  {
    id: 'ninja',
    name: 'Pombo Ninja',
    title: 'Sombra dos Telhados',
    price: 1300,
    desc: 'Ninguém sabe de onde veio. Some e reaparece como fumaça.',
    colors: {
      body: '#2b2d35', wing: '#363944', wingBar: '#15161b', tip: '#101114', head: '#23252c',
      neck: '#4b5563', neck2: '#1f2937', beak: '#c9c9c9', tail: '#22242b', tailTip: '#0c0d10', eye: '#ff3b3b',
    },
    accessory: 'headband',
    stats: { speed: 335, agility: 17, hp: 3 },
    mobility: 'Curvas instantâneas, controle cirúrgico.',
    skill: {
      id: 'phase', name: 'Sombra', icon: '🥷', cooldown: 11, duration: 3,
      desc: 'Fica intangível por 3s: atravessa tudo sem tomar dano.',
    },
  },
  {
    id: 'turbo',
    name: 'Pombo Turbo',
    title: 'Piloto de Corrida',
    price: 1900,
    desc: 'Óculos de aviador e listras de corrida. Velocidade máxima, freio mínimo.',
    colors: {
      body: '#d63031', wing: '#e84343', wingBar: '#ffffff', tip: '#7a1010', head: '#b71c1c',
      neck: '#ffeaa7', neck2: '#fdcb6e', beak: '#2d3436', tail: '#c0392b', tailTip: '#2d3436',
    },
    accessory: 'goggles',
    stats: { speed: 390, agility: 5.5, hp: 3 },
    mobility: 'O mais rápido, mas escorrega nas curvas.',
    skill: {
      id: 'nitro', name: 'Nitro', icon: '🔥', cooldown: 14, duration: 3,
      desc: 'Dispara à frente por 3s, invencível, atropelando o que estiver no caminho.',
    },
  },
  {
    id: 'robo',
    name: 'Pombo Robô',
    title: 'Modelo PX-3000',
    price: 2700,
    desc: 'Blindado, pesado e com um laser ocular de fábrica.',
    colors: {
      body: '#9aa4b1', wing: '#b4bdc9', wingBar: '#59636f', tip: '#3d4550', head: '#7d8794',
      neck: '#00d2ff', neck2: '#0984e3', beak: '#f39c12', tail: '#808a97', tailTip: '#3d4550', eye: '#00e5ff',
    },
    accessory: 'visor',
    stats: { speed: 305, agility: 6.5, hp: 5 },
    mobility: 'Pesado e blindado. Demora para virar.',
    skill: {
      id: 'laser', name: 'Laser Ocular', icon: '🔆', cooldown: 12, duration: 2.5,
      desc: 'Raio contínuo à frente por 2.5s que derrete inimigos, projéteis e chefões.',
    },
  },
  {
    id: 'mago',
    name: 'Pombo Mago',
    title: 'Alquimista Arcano',
    price: 3800,
    desc: 'Estudou 300 anos na torre da igreja. Transforma perigo em ouro.',
    colors: {
      body: '#6c5ce7', wing: '#7d6ff0', wingBar: '#f9ca24', tip: '#3d2f9e', head: '#5a4bd1',
      neck: '#a29bfe', neck2: '#fd79a8', beak: '#f9ca24', tail: '#5a4bd1', tailTip: '#f9ca24',
    },
    accessory: 'hat',
    stats: { speed: 320, agility: 11, hp: 4 },
    mobility: 'Voo leve e preciso.',
    skill: {
      id: 'alchemy', name: 'Alquimia', icon: '🔮', cooldown: 15, duration: 5,
      desc: 'Transforma todos os projéteis em moedas e atrai todo o ouro da tela por 5s.',
    },
  },
  {
    id: 'fenix',
    name: 'Pombo Fênix',
    title: 'Lenda Imortal',
    price: 5500,
    desc: 'Dizem que é só um pombo que tomou sol demais. Mas ele não morre.',
    colors: {
      body: '#ff7a18', wing: '#ff9f1a', wingBar: '#ffe066', tip: '#d63031', head: '#ff6b00',
      neck: '#ffd32a', neck2: '#ff3f34', beak: '#ffe066', tail: '#ff5e00', tailTip: '#ffd32a', eye: '#fff200',
    },
    accessory: 'flame',
    stats: { speed: 360, agility: 12, hp: 5 },
    mobility: 'Rápido, ágil e resistente.',
    skill: {
      id: 'nova', name: 'Explosão Solar', icon: '☀️', cooldown: 18, duration: 0.6,
      desc: 'Explosão que limpa a tela e fere muito os chefões.',
    },
    passive: 'Renasce uma vez por entrega com 2 de vida.',
  },
];

export const FRIEND_LOOK: PigeonLook = {
  colors: {
    body: '#9c8a7a', wing: '#b09d8b', wingBar: '#5a4636', tip: '#5e4c3d', head: '#87766a',
    neck: '#45b08c', neck2: '#9b59b6', beak: '#3a2f28', tail: '#7d6c5e', tailTip: '#3a2f28',
  },
  accessory: 'none',
};

export function getSkin(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
