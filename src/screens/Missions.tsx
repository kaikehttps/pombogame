import type { SaveData } from '../save';
import type { MissionDef } from '../game/types';
import { MISSIONS } from '../data/missions';
import { BIOMES } from '../data/biomes';
import { BOSS_INFO } from '../game/bosses';
import CoinBadge, { Coin } from '../components/CoinBadge';
import { Clouds } from './Menu';

interface Props {
  save: SaveData;
  onBack: () => void;
  onPlay: (m: MissionDef) => void;
  onHangar: () => void;
}

const BIOME_ICON: Record<string, string> = {
  cidade: '🏙️', praia: '🏖️', noite: '🌙', tempestade: '⛈️', entardecer: '🌇', final: '😼',
};

export default function Missions({ save, onBack, onPlay, onHangar }: Props) {
  return (
    <div className="screen">
      <Clouds />
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Voltar">←</button>
        <h1 className="screen-title">Entregas</h1>
        <CoinBadge coins={save.coins} />
      </div>

      <div className="mission-list">
        {MISSIONS.map((m) => {
          const prog = save.missions[m.id];
          const unlocked = m.id === 1 || !!save.missions[m.id - 1]?.done;
          const reward = prog?.done ? Math.round(m.reward * 0.5) : m.reward;
          return (
            <div key={m.id} className={`mission-card ${unlocked ? '' : 'locked'} ${prog?.done ? 'done' : ''}`}>
              <div className={`mission-num biome-${m.biome}`}>
                <span>{BIOME_ICON[m.biome]}</span>
                <b>{m.id}</b>
              </div>
              <div className="mission-body">
                <div className="mission-head">
                  <h3>{m.title}</h3>
                  <div className="stars">
                    {[1, 2, 3].map((i) => (
                      <span key={i} className={i <= (prog?.stars ?? 0) ? 'star on' : 'star'}>★</span>
                    ))}
                  </div>
                </div>
                <div className="route">
                  <span className="pt pt-a">A</span> {m.from} <span className="arrow">→</span> <span className="pt pt-b">B</span> {m.to}
                </div>
                {unlocked && <p className="mission-desc">{m.desc}</p>}
                <div className="mission-tags">
                  <span className="tag">{BIOMES[m.biome].name}</span>
                  {m.boss ? <span className="tag tag-boss">☠ {BOSS_INFO[m.boss].name}</span> : <span className="tag">Sem chefão</span>}
                  <span className="tag tag-coin"><Coin /> {reward}{prog?.done ? ' (replay)' : ''}</span>
                </div>
              </div>
              <div className="mission-action">
                {unlocked ? (
                  <button className="btn btn-primary btn-small" onClick={() => onPlay(m)}>{prog?.done ? 'Jogar de novo' : 'Voar!'}</button>
                ) : (
                  <span className="lock">🔒</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-secondary hangar-cta" onClick={onHangar}>🏪 Ir para o Hangar</button>
    </div>
  );
}
