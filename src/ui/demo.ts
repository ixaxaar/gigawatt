import { useGame } from '../store';
import { TEMPLATES } from '../data/templates';
import { templateBom } from '../plan';

/** Seeds a populated mid-game state (for screenshots / quick exploration via #demo). */
export function seedDemo() {
  const s = useGame.getState(); s.newGame(7);
  useGame.setState(st => ({ game: { ...st.game, month: 44, cash: 60_000_000 } }));
  const t = TEMPLATES.find(x => x.id === 'tpl-hgx-h100-nvidia-turnkey')!;
  s.adoptTemplate(t.id);
  useGame.setState(st => ({ game: { ...st.game, inventory: templateBom(t, 12) } }));
  for (let i = 0; i < 11; i++) useGame.getState().placeRack('hall-1', `rack-${t.id}`);
  useGame.setState(st => { const g = JSON.parse(JSON.stringify(st.game)); g.halls[0].racks.forEach((r: any, i: number) => { r.status = i < 7 ? 'online' : i === 7 ? 'commissioning' : i === 8 ? 'installing' : i === 9 ? 'failed' : 'ordered'; }); g.halls[0].coolingEquip['ct-cdu-80'] = 1; g.missionsDone = ['order', 'cool', 'tray', 'rack', 'place']; g.log.push({ month: 44, level: 'good', text: 'Demo state loaded.' }); return { game: g }; });
}
