import { useEffect, useState } from 'react';
import { defaultSave, loadSave, writeSave, type SaveData } from './save';
import { applyRun, summarize, type RunSummary } from './progress';
import { ENDLESS, ENDLESS_UNLOCK, MISSIONS } from './data/missions';
import { getSkin, SKINS } from './data/skins';
import { UPGRADES, upgradeCost } from './data/upgrades';
import type { GameResult, MissionDef, UpgradeId } from './game/types';
import { setMuted, sfx } from './game/audio';
import Menu from './screens/Menu';
import Missions from './screens/Missions';
import Hangar from './screens/Hangar';
import Results from './screens/Results';
import GameView from './components/GameView';

type Screen = 'menu' | 'missions' | 'hangar' | 'game' | 'results';

export default function App() {
  const [save, setSave] = useState<SaveData>(loadSave);
  const [screen, setScreen] = useState<Screen>('menu');
  const [mission, setMission] = useState<MissionDef>(MISSIONS[0]);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => writeSave(save), [save]);
  useEffect(() => setMuted(save.muted), [save.muted]);

  const skin = getSkin(save.skin);
  const endlessUnlocked = !!save.missions[ENDLESS_UNLOCK]?.done;

  const go = (s: Screen) => {
    sfx.click();
    setScreen(s);
  };

  const play = (m: MissionDef) => {
    sfx.click();
    setMission(m);
    setRunKey((k) => k + 1);
    setScreen('game');
  };

  const handleEnd = (r: GameResult) => {
    const s = summarize(mission, r, save);
    setSave((prev) => applyRun(prev, s));
    setSummary(s);
    setScreen('results');
  };

  const buySkin = (id: string) => {
    const s = SKINS.find((k) => k.id === id);
    if (!s || save.owned.includes(id) || save.coins < s.price) return;
    sfx.buy();
    setSave((prev) => ({ ...prev, coins: prev.coins - s.price, owned: [...prev.owned, id], skin: id }));
  };

  const equip = (id: string) => {
    if (!save.owned.includes(id)) return;
    sfx.click();
    setSave((prev) => ({ ...prev, skin: id }));
  };

  const buyUpgrade = (id: UpgradeId) => {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return;
    const lvl = save.upgrades[id];
    const cost = upgradeCost(u, lvl);
    if (lvl >= u.max || save.coins < cost) return;
    sfx.buy();
    setSave((prev) => ({ ...prev, coins: prev.coins - cost, upgrades: { ...prev.upgrades, [id]: lvl + 1 } }));
  };

  const toggleMute = () => setSave((prev) => ({ ...prev, muted: !prev.muted }));

  const reset = () => {
    if (!window.confirm('Apagar TODO o progresso (moedas, skins e entregas)?')) return;
    setSave(defaultSave());
  };

  const nextMission = summary && !summary.mission.endless ? MISSIONS.find((m) => m.id === summary.mission.id + 1) : undefined;

  switch (screen) {
    case 'missions':
      return <Missions save={save} onBack={() => go('menu')} onPlay={play} onHangar={() => go('hangar')} />;
    case 'hangar':
      return <Hangar save={save} onBack={() => go('menu')} onBuySkin={buySkin} onEquip={equip} onBuyUpgrade={buyUpgrade} />;
    case 'game':
      return (
        <GameView
          key={runKey}
          mission={mission}
          skin={skin}
          upgrades={save.upgrades}
          muted={save.muted}
          onEnd={handleEnd}
          onQuit={() => go(mission.endless ? 'menu' : 'missions')}
          onToggleMute={toggleMute}
        />
      );
    case 'results':
      return summary ? (
        <Results
          summary={summary}
          coins={save.coins}
          save={save}
          onRetry={() => play(summary.mission)}
          onNext={nextMission ? () => play(nextMission) : undefined}
          onMissions={() => go(summary.mission.endless ? 'menu' : 'missions')}
          onHangar={() => go('hangar')}
        />
      ) : null;
    default:
      return (
        <Menu
          save={save}
          skin={skin}
          endlessUnlocked={endlessUnlocked}
          onPlay={() => go('missions')}
          onHangar={() => go('hangar')}
          onEndless={() => play(ENDLESS)}
          onToggleMute={toggleMute}
          onReset={reset}
        />
      );
  }
}
