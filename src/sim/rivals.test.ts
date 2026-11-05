import { describe, it, expect } from 'vitest';
import { mulberry32 } from './rng';
import { initialRivals, onlineAccels, priceIndexOf, stepRivals } from './rivals';
import { useGame } from '../store';
import type { GameState, Rival } from '../types';

const withRivals = (rivals: Rival[]) => ({ rivals }) as unknown as GameState;

describe('initialRivals', () => {
  it('is deterministic from the seed, with the three styles and ±10% fleet jitter', () => {
    const a = initialRivals(7);
    expect(initialRivals(7)).toEqual(a);
    expect(initialRivals(8)).not.toEqual(a);
    expect(a.map((r) => r.id)).toEqual(['hyperion', 'nimbus', 'atlas']);
    const [hyp, neo, sov] = a;
    expect(hyp).toMatchObject({ name: 'Hyperion Cloud', style: 'hyperscaler', priceMult: 1.0, aggression: 0.5 });
    expect(neo).toMatchObject({ name: 'Nimbus Compute', style: 'neocloud', priceMult: 0.85, aggression: 0.8 });
    expect(sov).toMatchObject({ name: 'Atlas Sovereign AI', style: 'sovereign', priceMult: 1.05, aggression: 0.3 });
    expect(hyp.accels).toBeGreaterThanOrEqual(3600);
    expect(hyp.accels).toBeLessThanOrEqual(4400);
    expect(neo.accels).toBeGreaterThanOrEqual(720);
    expect(neo.accels).toBeLessThanOrEqual(880);
    expect(sov.accels).toBeGreaterThanOrEqual(270);
    expect(sov.accels).toBeLessThanOrEqual(330);
  });
});

describe('priceIndexOf', () => {
  it('sits near 0.9 with no player capacity, ≈1.05+ above 50% share, and is monotonic in player share', () => {
    const s = withRivals(initialRivals(3));
    const none = priceIndexOf(s, 0);
    expect(none).toBeGreaterThan(0.85);
    expect(none).toBeLessThan(0.95);
    expect(priceIndexOf(s, 6000)).toBeGreaterThan(1.03); // ~ parity with the rival fleet
    let prev = none;
    for (const n of [500, 2000, 6000, 20000, 100000]) {
      const idx = priceIndexOf(s, n);
      expect(idx).toBeGreaterThan(prev);
      prev = idx;
    }
    expect(prev).toBeLessThanOrEqual(1.15);
  });

  it('stays within [0.7, 1.15] even when rivals dump or hold a premium', () => {
    const dump = withRivals(initialRivals(3).map((r) => ({ ...r, priceMult: 0.7 })));
    expect(priceIndexOf(dump, 0)).toBeGreaterThanOrEqual(0.75);
    const premium = withRivals(initialRivals(3).map((r) => ({ ...r, priceMult: 1.4 })));
    expect(priceIndexOf(premium, 0)).toBeLessThanOrEqual(1.15);
    expect(priceIndexOf(premium, 1e9)).toBeLessThanOrEqual(1.15);
  });
});

describe('stepRivals', () => {
  it('grows every fleet with exactly one rng draw per rival, deterministically', () => {
    const base = JSON.parse(JSON.stringify(useGame.getState().game)) as GameState;
    let draws = 0;
    const counting = () => { draws++; return 0.5; };
    const a = JSON.parse(JSON.stringify(base)) as GameState;
    const b = JSON.parse(JSON.stringify(base)) as GameState;
    const c = JSON.parse(JSON.stringify(base)) as GameState;
    stepRivals(a, counting);
    expect(draws).toBe(3);
    stepRivals(b, mulberry32(42));
    stepRivals(c, mulberry32(42));
    expect(b.rivals).toEqual(c.rivals);
    expect(a.rivals!.every((r, i) => r.accels >= base.rivals![i].accels)).toBe(true);
    expect(a.rivals!.every((r) => r.cash > 0)).toBe(true);
  });

  it('runs in the monthly tick: fleets move and the price index is set and bounded', () => {
    useGame.getState().newGame(3);
    const g0 = useGame.getState().game;
    expect(g0.rivals).toHaveLength(3);
    const before = g0.rivals!.map((r) => r.accels);
    for (let i = 0; i < 11; i++) useGame.getState().nextMonth();
    const g1 = useGame.getState().game;
    expect(g1.rivals!.map((r) => r.accels)).not.toEqual(before);
    expect(g1.marketPriceIndex).toBeGreaterThanOrEqual(0.7);
    expect(g1.marketPriceIndex).toBeLessThanOrEqual(1.15);
    expect(onlineAccels(g1)).toBe(0); // no racks placed: share is all rivals
  });

  it('exposes the competition through the rivals query', async () => {
    const { QUERIES } = await import('../engine/queries');
    useGame.getState().newGame(3);
    useGame.getState().nextMonth();
    const q = QUERIES.rivals() as any;
    expect(q.rivals).toHaveLength(3);
    expect(q.rivals.map((r: Rival) => r.id)).toEqual(['hyperion', 'nimbus', 'atlas']);
    expect(q.rivals.every((r: any) => typeof r.sharePct === 'number' && typeof r.priceMult === 'number')).toBe(true);
    expect(q.priceIndex).toBeGreaterThan(0.7);
    expect(q.priceIndex).toBeLessThanOrEqual(1.15);
    expect(q.playerAccels).toBe(0);
    expect(q.playerSharePct).toBe(0);
    expect(q.headline.length).toBeGreaterThan(10);
  });
});
