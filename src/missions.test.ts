import { describe, it, expect } from 'vitest';
import { useGame } from './store';
import { MISSIONS } from './missions';

const fresh = () => { useGame.getState().newGame(0); return useGame.getState().game; };
const clone = <T,>(g: T): T => JSON.parse(JSON.stringify(g));
const done = (id: string, g: ReturnType<typeof fresh>) => MISSIONS.find((m) => m.id === id)!.done(g);
const LONG_FORM = ['kacc', 'accels5k', 'accels20k', 'contracts5', 'contracts15', 'nw100', 'nw500', 'nw1b', 'hall2', 'mw100', 'nplus1', 'carriers2', 'staffed', 'sellrack'];

describe('mission list', () => {
  it('has unique ids', () => {
    const ids = MISSIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('done() never throws on a fresh game, or a legacy save without stats', () => {
    const base = fresh();
    const legacy = { ...clone(base), stats: undefined };
    for (const m of MISSIONS) {
      expect(() => m.done(base)).not.toThrow();
      expect(() => m.done(legacy)).not.toThrow();
    }
  });

  it('long-form objectives are not done on a fresh game', () => {
    const g = fresh();
    for (const id of LONG_FORM) expect(done(id, g)).toBe(false);
  });
});

describe('long-form objectives', () => {
  it('complete when their lifetime stat is reached', () => {
    const g = fresh();
    const mod = (f: (g: ReturnType<typeof fresh>) => void) => { const c = clone(g); f(c); return c; };
    expect(done('kacc', mod((c) => { c.stats!.peakAccels = 1000; }))).toBe(true);
    expect(done('accels5k', mod((c) => { c.stats!.peakAccels = 5000; }))).toBe(true);
    expect(done('accels20k', mod((c) => { c.stats!.peakAccels = 20000; }))).toBe(true);
    expect(done('contracts5', mod((c) => { c.stats!.contractsCompleted = 5; }))).toBe(true);
    expect(done('contracts15', mod((c) => { c.stats!.contractsCompleted = 15; }))).toBe(true);
    expect(done('sellrack', mod((c) => { c.stats!.decommissioned = 1; }))).toBe(true);
  });

  it('track net worth milestones', () => {
    const g = fresh();
    const mod = (cash: number) => ({ ...clone(g), cash, debt: 0 });
    expect(done('nw100', mod(100_000_000))).toBe(true);
    expect(done('nw500', mod(500_000_000))).toBe(true);
    expect(done('nw1b', mod(1_000_000_000))).toBe(true);
    expect(done('nw1b', mod(999_000_000))).toBe(false);
  });

  it('track facility, connectivity and staffing milestones', () => {
    const g = fresh();
    const mod = (f: (g: ReturnType<typeof fresh>) => void) => { const c = clone(g); f(c); return c; };
    expect(done('hall2', mod((c) => { c.halls.push(clone(c.halls[0])); }))).toBe(true);
    expect(done('mw100', mod((c) => { c.halls[0].itPowerKW = 100_000; }))).toBe(true);
    expect(done('carriers2', mod((c) => { c.uplinks = { 'transit-10g-a': 1, 'transit-100g-b': 1 }; }))).toBe(true);
    expect(done('nplus1', mod((c) => {
      c.halls[0].powerEquip = { 'se-galaxy-vs-500': 1, 'se-li-ion-500': 1, 'gen-genset-3000': 2, 'abb-paralleling-4000': 1 };
    }))).toBe(true);
    const withRacks = mod((c) => {
      for (let i = 0; i < 25; i++) c.halls[0].racks.push({ id: `RK-${i}`, designId: 'd', slot: i, status: 'online', readyMonth: 11 });
    });
    expect(done('staffed', withRacks)).toBe(false);                       // 25 racks need 3 ops techs; fresh staff is 2
    expect(done('staffed', { ...withRacks, staff: 3 })).toBe(true);
  });
});
