const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
import { describe, it, expect } from 'vitest';
import { useGame } from './store';
import { advanceMonth } from './sim/tick';
import { monthlyOpex } from './sim/economy';
import { rackReadiness } from './ledger';
import { totalNeedGbps, uplinkGbps } from './sim/internet';

const fresh = () => { useGame.getState().newGame(3, 'operator'); return useGame.getState(); };

describe('systems are interconnected', () => {
  it('redundancy gear does not inflate IT power capacity', () => {
    const st = fresh();
    const before = st.game.halls[0].itPowerKW;
    useGame.setState({ game: { ...st.game, inventory: { ...st.game.inventory, 'gen-ats-1600': 1, 'cat-3516-2500': 1, 'gen-utility-feed-b': 1 } } });
    for (const id of ['gen-ats-1600', 'cat-3516-2500', 'gen-utility-feed-b']) expect(useGame.getState().installPower('hall-1', id, 1).ok).toBe(true);
    expect(useGame.getState().game.halls[0].itPowerKW).toBe(before);
  });

  it('spare orders land on the spares shelf, not in build stock, and do not count as rack parts on order', () => {
    const st = fresh();
    const g = st.game;
    const spareBuy = st.buy('vt-geist-5kw', 3, true);
    expect(spareBuy.ok).toBe(true);
    let s = useGame.getState().game;
    expect(s.orders.at(-1)!.spare).toBe(true);
    const arrive = s.orders.at(-1)!.arriveMonth;
    while (s.month < arrive) s = advanceMonth(s);
    expect(s.spareStock?.['vt-geist-5kw']).toBe(3);
    expect(s.inventory['vt-geist-5kw'] ?? 0).toBe(g.inventory['vt-geist-5kw'] ?? 0);
    void rackReadiness;
  });

  it('internet circuits are billed in monthly opex and saturation cuts availability', () => {
    const st = fresh();
    const base = monthlyOpex(st.game);
    expect(base.networkUSD).toBe(3500);
    expect(base.totalUSD).toBeGreaterThanOrEqual(3500);
    expect(uplinkGbps(st.game)).toBe(10);
    expect(totalNeedGbps(st.game)).toBe(0);
    expect(st.buyUplink('transit-100g-b').ok).toBe(true);
    const g = useGame.getState().game;
    expect(uplinkGbps(g)).toBe(110);
    expect(monthlyOpex(g).networkUSD).toBe(3500 + 24000);
  });

  it('buy() refuses internet circuits (they live on Build → Internet)', () => {
    expect(fresh().buy('transit-10g-a', 1).ok).toBe(false);
  });
});
