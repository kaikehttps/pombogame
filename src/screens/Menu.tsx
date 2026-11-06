import { useState } from 'react';
import type { SaveData } from '../save';
import type { SkinDef } from '../game/types';
import { ENDLESS_UNLOCK, MISSIONS } from '../data/missions';
import PigeonPreview from '../components/PigeonPreview';
import CoinBadge from '../components/CoinBadge';

interface Props {
  save: SaveData;
  skin: SkinDef;
  endlessUnlocked: boolean;
  onPlay: () => void;
  onHangar: () => void;
  onEndless: () => void;
  onToggleMute: () => void;
  onReset: () => void;
}

export default function Menu({ save, skin, endlessUnlocked, onPlay, onHangar, onEndless, onToggleMute, onReset }: Props) {
  const [help, setHelp] = useState(false);
  const done = MISSIONS.filter((m) => save.missions[m.id]?.done).length;

  return (
    <div className="screen menu">
      <Clouds />
      <div className="topbar">
        <button className="icon-btn" onClick={onToggleMute} aria-label="Som">{save.muted ? '🔇' : '🔊'}</button>
        <CoinBadge coins={save.coins} />
      </div>

      <div className="logo">
        <span className="logo-1">POMBO</span>
        <span className="logo-2">EXPRESS</span>
        <span className="logo-sub">Entregas aéreas desde a Idade Média</span>
      </div>

      <div className="menu-hero">
        <div className="hero-glow" />
        <PigeonPreview look={skin} size={190} />
        <div className="hero-name">{skin.name}</div>
        <div className="hero-skill">{skin.skill.icon} {skin.skill.name}</div>
      </div>

      <div className="menu-buttons">
        <button className="btn btn-primary btn-big" onClick={onPlay}>
          ▶ Entregas <small>{done}/{MISSIONS.length} concluídas</small>
        </button>
        <button className="btn btn-secondary" onClick={onHangar}>
          🏪 Hangar <small>skins e melhorias</small>
        </button>
        <button className="btn btn-dark" disabled={!endlessUnlocked} onClick={onEndless}>
          ♾️ Entrega Infinita{' '}
          <small>{endlessUnlocked ? `recorde: ${Math.floor(save.bestEndless / 10)} m` : `conclua a entrega ${ENDLESS_UNLOCK}`}</small>
        </button>
        <button className="btn btn-ghost" onClick={() => setHelp(true)}>❓ Como jogar</button>
      </div>

      {help && (
        <div className="modal-bg" onClick={() => setHelp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Como jogar</h2>
            <ol className="help-list">
              <li><b>Ponto A:</b> voe até a encomenda para pegá-la.</li>
              <li><b>Voe até o Ponto B</b> desviando de fios, pipas, aviões, chinelos, raios e bichos.</li>
              <li><b>Mini-chefões</b> bloqueiam o caminho: derrote-os para seguir.</li>
              <li><b>Pouse no Ponto B</b> para entregar e ganhar moedas.</li>
              <li>Gaste moedas no <b>Hangar</b>: skins com habilidades e voos diferentes, e melhorias de asa.</li>
            </ol>
            <div className="help-grid">
              <div><kbd>WASD</kbd> / <kbd>Setas</kbd><span>voar</span></div>
              <div><kbd>Espaço</kbd><span>atirar cocô 💩</span></div>
              <div><kbd>Shift</kbd><span>habilidade</span></div>
              <div><kbd>Esc</kbd><span>pausar</span></div>
            </div>
            <p className="help-touch">📱 No celular: arraste o dedo para voar (atira sozinho) e toque no botão da habilidade.</p>
            <p className="help-tip">⭐⭐⭐ Entregue sem levar dano para ganhar bônus de 30%. Pombos amigos (♥) dão moedas e às vezes vida!</p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setHelp(false)}>Bora voar!</button>
              <button className="btn btn-link" onClick={onReset}>Apagar progresso</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Clouds() {
  return (
    <div className="clouds" aria-hidden>
      <span className="cloud c1" />
      <span className="cloud c2" />
      <span className="cloud c3" />
      <span className="cloud c4" />
    </div>
  );
}
