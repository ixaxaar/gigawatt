import { it, expect } from 'vitest';
import { ALL_ITEMS, getItem } from './data';
import { partFitsSlot, validateTray } from './sim/validate';
import { offerAt, START_MONTH } from './store';
import type { Chassis, TrayDesign } from './types';
it('a valid tray exists at game start for the A100 HGX chassis', () => {
  const ch = getItem('nv-hgx-a100-8gy') as Chassis;
  expect(offerAt(ch, START_MONTH).available).toBe(true);
  const parts = ch.slots.map(s => {
    const o = ALL_ITEMS.find(i => partFitsSlot(s, i) && offerAt(i, START_MONTH).available);
    return o ? { slot: s.kind, itemId: o.id, count: s.required ?? s.count } : null;
  });
  console.log('MISSING SLOTS:', ch.slots.filter((s, i) => !parts[i]).map(s => s.kind));
  const d: TrayDesign = { id: 't', name: 't', chassisId: ch.id, parts: parts.filter(Boolean) as any };
  const v = validateTray(d, getItem);
  console.log(v.issues.map(i => i.severity + ':' + i.code + ' ' + i.message.slice(0, 90)), JSON.stringify(v.stats));
  expect(ch.slots.filter((s, i) => !parts[i] && (s.required ?? 0) > 0)).toEqual([]);
});

import { rackReadiness } from './ledger';
import { useGame as _ug } from './store';
import { it as _it, expect as _ex } from 'vitest';
_it('installPower refuses rack-level PDUs; rackReadiness reports missing parts', () => {
  const mem = new Map<string, string>(); (globalThis as any).localStorage ??= { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  _ug.getState().newGame(3);
  const pdu = ALL_ITEMS.find((i) => i.kind === 'power' && (i as any).powerType === 'pdu')!;
  _ug.setState((s) => ({ game: { ...s.game, inventory: { [pdu.id]: 4 } } }));
  const r = _ug.getState().installPower('hall-1', pdu.id, 1);
  _ex(r.ok).toBe(false);
  _ex(_ug.getState().game.inventory[pdu.id]).toBe(4);
  _ug.getState().adoptTemplate('hgx-a100-diy');
  const g = _ug.getState().game;
  if (g.racks[0]) { const rr = rackReadiness(g, g.racks[0].id, 1)!; _ex(rr.complete).toBe(false); _ex(rr.toBuy.length).toBeGreaterThan(0); }
});
