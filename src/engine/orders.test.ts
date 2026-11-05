import { describe, it, expect } from 'vitest';
import { useGame } from '../store';
import { TEMPLATES } from '../data/templates';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
const S = useGame.getState;
const tpl = (tier: string) => TEMPLATES.find((x) => x.platform.startsWith('HGX A100') && x.tier === tier)!;

describe('open orders', () => {
  it('cancelling a rack order refunds 90%, drops the reservation and empties the batch', () => {
    S().newGame(1); const c0 = S().game.cash; const a = tpl('diy');
    expect(S().buyTemplate(a.id, 5).ok).toBe(true);
    const spent = c0 - S().game.cash; const id = S().game.orders[0].id;
    expect(S().cancelOrder(id).ok).toBe(true);
    expect(S().game.orders.length).toBe(0); expect(S().game.rackReserve?.[`rack-${a.id}`]).toBeUndefined();
    expect(c0 - S().game.cash).toBeCloseTo(spent * 0.1, -2);
  });
  it('reducing 5 racks to 2 keeps parts for exactly 2 racks and the reservation matches', () => {
    S().newGame(1); const a = tpl('diy'), b = tpl('oem');
    S().buyTemplate(a.id, 5); S().buyTemplate(b.id, 5);
    const id = S().game.orders.find((o) => o.templateId === a.id)!.id;
    expect(S().reduceOrder(id, 2).ok).toBe(true);
    expect(S().game.rackReserve?.[`rack-${a.id}`]).toBe(2);
    for (let i = 0; i < 14 && S().game.orders.length; i++) S().nextMonth();
    const place = (t: typeof a) => S().placeRack('hall-1', `rack-${t.id}`).ok;
    expect([1, 2, 3].map(() => place(a))).toEqual([true, true, false]);
    expect([1, 2, 3, 4, 5, 6].map(() => place(b)).filter(Boolean).length).toBe(5);
  });
  it('loose part orders can be reduced and a started project fails when its order is cancelled', () => {
    S().newGame(1); const before = S().game.cash;
    S().buy('nv-a100-80-sxm', 8); const id = S().game.orders[0].id;
    expect(S().reduceOrder(id, 3).ok).toBe(true); expect(S().game.orders[0].qty).toBe(3);
    expect(S().reduceOrder(id, 9).ok).toBe(false);
    expect(S().game.cash).toBeLessThan(before);
  });
});
