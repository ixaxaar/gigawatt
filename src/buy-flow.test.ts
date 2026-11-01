import { describe, it, expect } from 'vitest';
import { useGame } from './store';
import { TEMPLATES } from './data/templates';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };

describe('first-time player flow', () => {
  for (const tier of ['diy', 'oem', 'turnkey'] as const) it(`buy an A100 ${tier} rack at game start, receive it and place it`, () => {
    useGame.getState().newGame(1);
    const t = TEMPLATES.find(x => x.platform.startsWith('HGX A100') && x.tier === tier)!;
    const cash0 = useGame.getState().game.cash;
    const r = useGame.getState().buyTemplate(t.id, 1);
    expect(r.ok, r.message).toBe(true);
    expect(useGame.getState().game.cash).toBeLessThan(cash0);
    expect(useGame.getState().game.racks.length).toBe(1);
    for (let i = 0; i < 12 && useGame.getState().game.orders.length; i++) useGame.getState().nextMonth();
    const p = useGame.getState().placeRack('hall-1', `rack-${t.id}`);
    expect(p.ok, p.message + JSON.stringify(p.issues ?? []).slice(0, 300)).toBe(true);
  });
  it('turnkey costs more but arrives sooner than DIY', () => {
    const quote = (tier: 'diy' | 'turnkey') => { useGame.getState().newGame(1); const t = TEMPLATES.find(x => x.platform.startsWith('HGX A100') && x.tier === tier)!; useGame.getState().buyTemplate(t.id, 1); const g = useGame.getState().game; return { spent: 50_000_000 - g.cash, lead: Math.max(...g.orders.map(o => o.arriveMonth)) }; };
    const d = quote('diy'), k = quote('turnkey');
    expect(k.spent).toBeGreaterThan(d.spent); expect(k.lead).toBeLessThanOrEqual(d.lead);
  });
  it('refuses cleanly when you cannot afford it', () => {
    useGame.getState().newGame(1);
    const t = TEMPLATES.find(x => x.platform.startsWith('HGX A100'))!;
    const r = useGame.getState().buyTemplate(t.id, 500);
    expect(r.ok).toBe(false); expect(r.message).toMatch(/Insufficient|Allocation/);
  });
});
