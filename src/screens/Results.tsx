import type { RunSummary } from '../progress';
import type { SaveData } from '../save';
import { SKINS } from '../data/skins';
import CoinBadge, { Coin } from '../components/CoinBadge';
import { Clouds } from './Menu';

interface Props {
  summary: RunSummary;
  coins: number;
  save: SaveData;
  onRetry: () => void;
  onNext?: () => void;
  onMissions: () => void;
  onHangar: () => void;
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

export default function Results({ summary, coins, save, onRetry, onNext, onMissions, onHangar }: Props) {
  const { mission, result, stars } = summary;
  const win = result.success;
  const endless = !!mission.endless;
  const affordable = SKINS.find((s) => !save.owned.includes(s.id) && s.price <= coins);

  const title = endless ? 'FIM DO VOO' : win ? 'ENTREGA CONCLUÍDA!' : 'ENTREGA FALHOU';
  const rows: [string, number][] = [];
  if (endless) {
    rows.push(['Moedas coletadas', summary.collected], ['Bônus de distância', summary.distanceBonus]);
    if (summary.bonus) rows.push([`Chefões derrotados (${result.bossesDefeated})`, summary.bonus]);
  } else if (win) {
    rows.push([summary.firstClear ? 'Recompensa da entrega' : 'Recompensa (replay)', summary.base], ['Moedas coletadas', summary.collected]);
    if (summary.bonus) rows.push(['Bônus sem dano ⭐⭐⭐', summary.bonus]);
  } else {
    rows.push(['Moedas salvas (50%)', summary.collected]);
  }

  return (
    <div className="screen results">
      <Clouds />
      <div className="topbar">
        <span />
        <CoinBadge coins={coins} />
      </div>

      <div className={`result-card ${win || endless ? 'win' : 'lose'}`}>
        <div className="result-emoji">{endless ? '🏁' : win ? '📦' : '💥'}</div>
        <h1>{title}</h1>
        <p className="result-sub">{mission.title}</p>
        {!endless && win && (
          <div className="big-stars">
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? 'star on' : 'star'} style={{ animationDelay: `${i * 0.18}s` }}>★</span>
            ))}
          </div>
        )}
        {endless && (
          <p className="result-distance">
            {Math.floor(result.distance / 10)} m {summary.newBest && <span className="new-best">NOVO RECORDE!</span>}
          </p>
        )}

        <div className="result-stats">
          <span>⏱ {fmtTime(result.time)}</span>
          <span>💔 {result.damageTaken} dano</span>
          {result.bossesDefeated > 0 && <span>☠ {result.bossesDefeated} chefão</span>}
        </div>

        <div className="result-rows">
          {rows.map(([label, v]) => (
            <div key={label} className="result-row">
              <span>{label}</span>
              <b>+{v}</b>
            </div>
          ))}
          <div className="result-row total">
            <span>Total</span>
            <b><Coin /> +{summary.total}</b>
          </div>
        </div>

        {affordable && (
          <div className="afford-hint" onClick={onHangar}>
            🛍️ Você já pode comprar o <b>{affordable.name}</b>! Ir ao Hangar →
          </div>
        )}

        <div className="result-actions">
          {win && onNext && <button className="btn btn-primary" onClick={onNext}>Próxima entrega ▶</button>}
          <button className={win && onNext ? 'btn btn-secondary' : 'btn btn-primary'} onClick={onRetry}>
            {win ? '↻ Jogar de novo' : '↻ Tentar de novo'}
          </button>
          <div className="result-actions-row">
            <button className="btn btn-ghost" onClick={onHangar}>🏪 Hangar</button>
            <button className="btn btn-ghost" onClick={onMissions}>{endless ? 'Menu' : 'Entregas'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
