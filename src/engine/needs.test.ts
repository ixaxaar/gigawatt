const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
import { describe, it, expect } from 'vitest';
import { useGame } from '../store';
import { fleetOf, needsOf, offerMoney } from './needs';
import { contractRevenue } from '../sim/economy';
import { generateContracts } from '../sim/market';
import { mulberry32 } from '../sim/rng';
import type { ActiveContract, GameState } from '../types';

const fresh = (mode: 'operator' | 'learner' = 'operator'): GameState => { useGame.getState().newGame(9, mode); return JSON.parse(JSON.stringify(useGame.getState().game)); };

describe('offerMoney', () => {
  it('matches what the engine bills for a fully served contract', () => {
    const g = fresh(); g.reputation = 80;
    let n = 0;
    for (let seed = 0; seed < 30; seed++) for (const c of generateContracts(g, 40, mulberry32(seed))) {
      const ac = { contract: c, clusterIds: ['x'], startMonth: 0, monthsServed: 0, slaMisses: 0 } as ActiveContract;
      const billed = c.kind === 'training' ? contractRevenue(ac, { accelerators: c.minAccelerators, availability: 1 }) : contractRevenue(ac, { tokensPerSec: c.tokensPerSec, availability: 1 });
      const m = offerMoney(g, c);
      expect(Math.abs(m.monthly - billed.grossUSD)).toBeLessThan(2);
      expect(Math.abs(m.total - m.monthly * c.durationMonths)).toBeLessThanOrEqual(c.durationMonths);
      expect(m.profitMo).toBeLessThan(m.monthly); expect(m.powerMo).toBeGreaterThan(0);
      n++;
    }
    expect(n).toBeGreaterThan(20);
  });
});

describe('needsOf', () => {
  it('never returns an empty list and starts a fresh game on "land your first customer"', () => {
    const g = fresh(); const n = needsOf(g);
    expect(n.length).toBeGreaterThan(0); expect(n[0].id).toBe('start');
  });
  it('flags a customer about to walk as critical and ranks it first', () => {
    const g = fresh(); const c = g.availableContracts[0];
    g.activeContracts.push({ contract: c, clusterIds: [], startMonth: g.month - 3, monthsServed: 0, slaMisses: 0, deployBy: g.month + 1 });
    const n = needsOf(g); expect(n[0].id).toBe('walk'); expect(n[0].level).toBe('crit');
  });
  it('warns when most revenue ends within three months', () => {
    const g = fresh();
    g.reputation = 80; let c: ReturnType<typeof generateContracts>[number] | undefined;
    for (let seed = 0; seed < 50 && !c; seed++) c = generateContracts(g, 40, mulberry32(seed)).find((x) => x.kind === 'training');
    g.clusters = [{ id: 'c1', name: 'C1', rackIds: [], fabric: undefined as never, stats: { accelerators: Math.max(64, (c as { minAccelerators: number }).minAccelerators), acceleratorId: 'nv-h100-sxm', scaleUpDomain: 8, totalMemGB: 0, peakPFLOPSFp8: 0, peakPFLOPSBf16: 0, powerKW: 0, bisectionTbps: 0, effScaleOutGBs: 0, switchCounts: {}, cableCounts: {}, issues: [] } }];
    g.activeContracts = [{ contract: { ...c!, durationMonths: 10 }, clusterIds: ['c1'], startMonth: 0, monthsServed: 8, slaMisses: 0 }];
    expect(needsOf(g).some((x) => x.id === 'cliff')).toBe(true);
  });
  it('flags understaffing and idle GPUs', () => {
    const g = fresh(); g.staff = 0;
    g.halls[0].racks = [{ id: 'r1', designId: 'd', slot: 0, status: 'online', readyMonth: 0, clusterId: 'c1' } as never];
    expect(needsOf(g).some((x) => x.id === 'staff')).toBe(true); // an online rack needs at least the skeleton crew
    const f = fleetOf(g); expect(f.utilization).toBe(0);
  });
});

describe('needsOf: failed racks', () => {
  it('says plainly that racks are down, and when they are back', () => {
    const g = fresh();
    expect(needsOf(g).some((n) => n.id === 'failed')).toBe(false);
    g.halls[0].racks.push({ id: 'RK-T', slot: 0, designId: 'x', status: 'failed', readyMonth: g.month + 8 } as any);
    const n = needsOf(g).find((x) => x.id === 'failed');
    expect(n?.level).toBe('crit'); expect(n?.title).toMatch(/1 rack is down/); expect(n?.detail).toMatch(/8 months/);
  });
});

