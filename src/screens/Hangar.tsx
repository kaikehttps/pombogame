import { useState } from 'react';
import type { SaveData } from '../save';
import type { UpgradeId } from '../game/types';
import { SKINS } from '../data/skins';
import { UPGRADES, upgradeCost } from '../data/upgrades';
import PigeonPreview from '../components/PigeonPreview';
import CoinBadge, { Coin } from '../components/CoinBadge';
import { Clouds } from './Menu';

interface Props {
  save: SaveData;
  onBack: () => void;
  onBuySkin: (id: string) => void;
  onEquip: (id: string) => void;
  onBuyUpgrade: (id: UpgradeId) => void;
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <div className="stat-bar">
        <div style={{ width: `${Math.round(Math.max(0.08, Math.min(1, value)) * 100)}%` }} />
      </div>
    </div>
  );
}

export default function Hangar({ save, onBack, onBuySkin, onEquip, onBuyUpgrade }: Props) {
  const [tab, setTab] = useState<'skins' | 'upgrades'>('skins');

  return (
    <div className="screen">
      <Clouds />
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Voltar">←</button>
        <h1 className="screen-title">Hangar</h1>
        <CoinBadge coins={save.coins} />
      </div>

      <div className="tabs">
        <button className={tab === 'skins' ? 'tab active' : 'tab'} onClick={() => setTab('skins')}>🐦 Skins</button>
        <button className={tab === 'upgrades' ? 'tab active' : 'tab'} onClick={() => setTab('upgrades')}>🪶 Melhorias</button>
      </div>

      {tab === 'skins' ? (
        <div className="skin-grid">
          {SKINS.map((s) => {
            const owned = save.owned.includes(s.id);
            const equipped = save.skin === s.id;
            const afford = save.coins >= s.price;
            return (
              <div key={s.id} className={`skin-card ${equipped ? 'equipped' : ''} ${owned ? '' : 'not-owned'}`}>
                <div className="skin-preview">
                  <PigeonPreview look={s} size={118} dim={!owned} />
                  {equipped && <span className="badge-eq">EQUIPADO</span>}
                </div>
                <h3>{s.name}</h3>
                <div className="skin-title">{s.title}</div>
                <p className="skin-desc">{s.desc}</p>
                <div className="stats">
                  <Bar label="Velocidade" value={(s.stats.speed - 250) / 150} />
                  <Bar label="Agilidade" value={s.stats.agility / 18} />
                  <Bar label="Vida" value={s.stats.hp / 5} />
                </div>
                <div className="mobility">✈️ {s.mobility}</div>
                <div className="skill-box">
                  <div className="skill-name">{s.skill.icon} {s.skill.name} <span>⏱ {s.skill.cooldown}s</span></div>
                  <div className="skill-desc">{s.skill.desc}</div>
                  {s.passive && <div className="skill-passive">✨ Passiva: {s.passive}</div>}
                </div>
                {owned ? (
                  <button className="btn btn-small btn-secondary" disabled={equipped} onClick={() => onEquip(s.id)}>
                    {equipped ? '✓ Em uso' : 'Equipar'}
                  </button>
                ) : (
                  <button className="btn btn-small btn-primary" disabled={!afford} onClick={() => onBuySkin(s.id)}>
                    Comprar <Coin /> {s.price.toLocaleString('pt-BR')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="upgrade-list">
          <p className="upgrade-hint">As melhorias valem para todas as skins.</p>
          {UPGRADES.map((u) => {
            const lvl = save.upgrades[u.id];
            const maxed = lvl >= u.max;
            const cost = upgradeCost(u, lvl);
            return (
              <div key={u.id} className="upgrade-card">
                <div className="upgrade-icon">{u.icon}</div>
                <div className="upgrade-body">
                  <h3>{u.name}</h3>
                  <p>{u.desc}</p>
                  <div className="pips">
                    {Array.from({ length: u.max }, (_, i) => (
                      <span key={i} className={i < lvl ? 'pip on' : 'pip'} />
                    ))}
                  </div>
                </div>
                <button className="btn btn-small btn-primary" disabled={maxed || save.coins < cost} onClick={() => onBuyUpgrade(u.id)}>
                  {maxed ? 'MÁX' : <><Coin /> {cost.toLocaleString('pt-BR')}</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
