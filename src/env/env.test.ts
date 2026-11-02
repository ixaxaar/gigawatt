import { describe, it, expect } from 'vitest';
import * as E from './env';
import { SCENARIOS, stressFill } from './scenarios';

const script = (seed: number, months: number) => {
  E.reset({ seed }); const hs: string[] = [];
  for (let m = 0; m < months; m++) {
    const acts = E.legalActions();
    const accept = acts.find(a => a.name === 'acceptContract'); if (accept && m % 3 === 0) E.step(accept);
    const buy = acts.find(a => a.name === 'buyTemplate'); if (buy && m % 4 === 1) E.step(buy);
    E.step({ name: 'nextMonth' }); hs.push(E.hash());
  }
  return hs;
};

describe('env', () => {
  it('is deterministic: same seed + same actions => identical state hashes every month', () => {
    const a = script(7, 18), b = script(7, 18);
    expect(a).toEqual(b);
  });
  it('different seeds diverge', () => expect(script(7, 6)).not.toEqual(script(8, 6)));
  it('step returns gym-shaped result and rewards net worth change', () => {
    E.reset({ seed: 1 }); const r = E.step({ name: 'nextMonth' });
    expect(r).toHaveProperty('obs'); expect(typeof r.reward).toBe('number'); expect(r.done).toBe(false);
    expect(E.step({ name: 'bogus' }).info.ok).toBe(false);
  });
  it('probe restores state', () => { E.reset({ seed: 1 }); const h = E.hash(); E.legalActions({ full: true }); expect(E.hash()).toBe(h); });
  it('lists scenarios', () => expect(SCENARIOS.length).toBeGreaterThanOrEqual(5));
});
describe('stress', () => {
  it('fills halls with every available template and stays well-formed', () => {
    const s = SCENARIOS.find(x => x.id === 'stress-all-racks')!; E.reset({ scenario: s });
    const g = E.state(); const online = g.halls.flatMap(h => h.racks).filter(r => r.status === 'online').length;
    console.log('stress-all-racks:', g.halls.map(h => `${h.name} ${h.racks.length} racks ${h.itPowerKW}kW/${h.coolingKW}kW PUE ${h.pue.toFixed(3)}`).join(' | '));
    expect(g.halls.flatMap(h => h.racks).length).toBeGreaterThan(80);
    expect(online).toBeGreaterThan(80);
    expect(Number.isFinite(g.cash)).toBe(true);
    // the sim must survive 12 months at extreme scale without NaNs
    for (let i = 0; i < 12; i++) E.step({ name: 'nextMonth' });
    const o = E.observe(); expect(Number.isFinite(o.cash) && Number.isFinite(o.netWorth)).toBe(true);
  }, 120000);
  it('campus scenario is bigger and deterministic', () => {
    const s = SCENARIOS.find(x => x.id === 'stress-campus')!; E.reset({ scenario: s }); const h1 = E.hash(); const n1 = E.state().halls.flatMap(h => h.racks).length;
    E.reset({ scenario: s }); expect(E.hash()).toBe(h1); expect(n1).toBeGreaterThan(150);
  }, 240000);
});
void stressFill;
