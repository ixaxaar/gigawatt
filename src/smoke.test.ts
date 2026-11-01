const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
import { it } from 'vitest';
import { useGame, offerAt, rackBom, START_MONTH } from './store';

it('full loop smoke', () => {
  const s = useGame.getState();
  s.newGame(7);
  let g = useGame.getState().game;
  if (g.month !== START_MONTH || g.cash !== 50_000_000 || g.halls[0].itPowerKW !== 500) throw new Error('bad newGame');
  if (!g.availableContracts.length) throw new Error('no starter offers');
  useGame.setState({ game: { ...g, month: 36 } }); // jump to Jan 2023 so the H100 build below is purchasable
  g = useGame.getState().game;

  const tray = {
    id: 'tray-h100', name: 'H100 8-way', chassisId: 'nv-hgx-h100-8gy',
    parts: [
      { slot: 'accelerator' as const, itemId: 'nv-h100-sxm', count: 8 },
      { slot: 'cpu' as const, itemId: 'amd-epyc-genoa', count: 2 },
      { slot: 'dimm' as const, itemId: 'sam-ddr5-5600-64', count: 16 },
      { slot: 'nic' as const, itemId: 'nv-connectx7', count: 4 },
      { slot: 'nvme' as const, itemId: 'sam-pm9a3-3t84', count: 2 },
      { slot: 'psu' as const, itemId: 'vt-geist-5kw', count: 4 },
    ],
  };
  if (!useGame.getState().saveTray(tray).ok) throw new Error('saveTray');

  const rack = {
    id: 'rack-a', name: 'Rack A', rackId: 'gen-rack-19-48u-hd',
    items: [{ type: 'tray' as const, trayId: 'tray-h100', count: 2 }], coolingInterface: 'air' as const,
  };
  if (!useGame.getState().saveRack(rack).ok) throw new Error('saveRack');

  // seed inventory directly to skip lead-time waiting; verify offer math separately
  g = useGame.getState().game;
  const bom = rackBom(g, 'rack-a')!;
  g.inventory = { ...bom };
  useGame.setState({ game: { ...g, inventory: { ...bom } } });

  const offer = offerAt({ ...(bom && { id: 'nv-h100-sxm' }) } as never, 0);
  void offer;

  const placed = useGame.getState().placeRack('hall-1', 'rack-a');
  if (!placed.ok) throw new Error('placeRack: ' + placed.message + JSON.stringify(placed.issues));

  // order flow: buy one cheap item, advance until it arrives
  const buyRes = useGame.getState().buy('vt-crah-100', 2);
  if (!buyRes.ok) throw new Error('buy: ' + buyRes.message);
  g = useGame.getState().game;
  if (g.cash >= 50_000_000) throw new Error('cash not debited');
  if (g.orders.length !== 1) throw new Error('order not created');
  const lead = g.orders[0].arriveMonth;
  const install = useGame.getState().installCooling('hall-1', 'vt-crah-100', 1);
  if (install.ok) throw new Error('install should fail without inventory');
  while (useGame.getState().game.month < lead + 1) useGame.getState().nextMonth();
  g = useGame.getState().game;
  if ((g.inventory['vt-crah-100'] ?? 0) !== 2) throw new Error('delivery missing');
  if (!useGame.getState().installCooling('hall-1', 'vt-crah-100', 1).ok) throw new Error('installCooling');
  g = useGame.getState().game;
  if (g.halls[0].coolingKW !== 700) throw new Error('coolingKW ' + g.halls[0].coolingKW);

  // rack commissioning -> online
  while (useGame.getState().game.halls[0].racks[0].status !== 'online') useGame.getState().nextMonth();
  g = useGame.getState().game;

  const fabric = {
    id: 'f', name: 'F', scaleOutTech: 'ib-ndr' as const, topology: 'single-domain' as const,
    oversubscription: 1, leafSwitchId: 'nv-qm9700', nodeToLeafCableId: 'gen-aoc-400-30m',
  };
  const cc = useGame.getState().createCluster('C1', [useGame.getState().game.halls[0].racks[0].id], fabric);
  if (!cc.ok) throw new Error('createCluster: ' + cc.message + JSON.stringify((cc as any).issues));

  const offer0 = useGame.getState().game.availableContracts[0];
  const acc = useGame.getState().acceptContract(offer0.id);
  if (!acc.ok) throw new Error('accept: ' + acc.message);
  const asg = useGame.getState().assignContract(offer0.id, ['cl-1']);
  if (!asg.ok && !asg.message) throw new Error('assign failure must teach');

  const loan = useGame.getState().takeLoan(1_000_000);
  if (!loan.ok) throw new Error('loan: ' + loan.message);
  g = useGame.getState().game;
  if (g.debt !== 1_000_000) throw new Error('debt');

  for (let i = 0; i < 6; i++) useGame.getState().nextMonth();
  g = useGame.getState().game;
  if (!g.history.length) throw new Error('no history');
  useGame.getState().save();
  if (!useGame.getState().load().ok) throw new Error('save/load roundtrip');
  console.log('SMOKE OK — month', g.month, 'cash', g.cash.toFixed(0), 'rep', g.reputation, 'log tail:', g.log.slice(-1)[0]?.text);
});
