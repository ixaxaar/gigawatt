// Pins the economy's design intent so tuning in src/sim/balance.ts cannot silently drift.
// If you change a knob on purpose, re-run `PLAYTEST=1 vitest run src/playtest`, read the table, and update the bands here.
const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
import { describe, it, expect } from 'vitest';
import { useGame } from './store';
import { buildOptions } from './contractfit';
import { generateContracts, gpuHourAnchor, refTokensPerGpu } from './sim/market';
import { mulberry32 } from './sim/rng';
import { BAL } from './sim/balance';
import { spotRevenue } from './sim/power';
import { play } from './playtest/run';
import { PERSONAS } from './playtest/personas';
import * as E from './env/env';
import type { GameState } from './types';

const SEEDS = [21, 22, 23];
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

describe('contract payback by era (best build per offer, median)', () => {
  const paybackMedian = (year: number): number => {
    useGame.getState().newGame(5, 'operator');
    const month = Math.round((year - 2020) * 12);
    useGame.setState((s) => ({ game: { ...s.game, month, cash: 1e9, reputation: 80 } }));
    const g = useGame.getState().game;
    const pb: number[] = [];
    for (let seed = 0; seed < 25; seed++) for (const c of generateContracts(g, month, mulberry32(seed + 3))) {
      const opts = buildOptions({ ...g, availableContracts: [] } as GameState, c).filter((o) => Number.isFinite(o.paybackMo));
      if (opts.length) pb.push(Math.min(...opts.map((o) => o.paybackMo)));
    }
    return median(pb);
  };
  it('boom years (2023-2025) pay back in 10-32 months', () => {
    for (const y of [2023.3, 2024, 2025]) { const m = paybackMedian(y); expect(m, `year ${y}`).toBeGreaterThanOrEqual(10); expect(m, `year ${y}`).toBeLessThanOrEqual(32); }
  });
  it('late years (2026-2028) pay back in 30-48 months', () => {
    for (const y of [2026, 2027, 2028]) { const m = paybackMedian(y); expect(m, `year ${y}`).toBeGreaterThanOrEqual(30); expect(m, `year ${y}`).toBeLessThanOrEqual(48); }
  });
});

describe('inference is priced off what a GPU-hour earns', () => {
  it('a fully used GPU earns roughly BAL.inferPremium x the GPU-hour price, bounded by real API prices', () => {
    useGame.getState().newGame(5, 'operator');
    const month = Math.round((2024 - 2020) * 12);
    const g = useGame.getState().game; const ratios: number[] = [];
    for (let seed = 0; seed < 60; seed++) for (const c of generateContracts({ ...g, reputation: 80 }, month, mulberry32(seed))) {
      if (c.kind !== 'inference') continue;
      const perGpu = refTokensPerGpu(2024, c.model, c.contextTokens, c.tpotMs);
      ratios.push((c.pricePerMTok * perGpu * 3600) / 1e6 / gpuHourAnchor(2024));
    }
    expect(ratios.length).toBeGreaterThan(5);
    const m = median(ratios);
    expect(m).toBeGreaterThan(0.5); expect(m).toBeLessThan(BAL.inferPremium * 2.2);
  });
});

describe('spot market is filler, not a business plan', () => {
  const base = (accels: number, month = 52): GameState => {
    useGame.getState().newGame(5, 'operator');
    const g = JSON.parse(JSON.stringify(useGame.getState().game)) as GameState;
    g.month = month; g.spotPrice = gpuHourAnchor(2020 + month / 12) * BAL.spotDiscount; g.spotReserve = 0; g.spotClusters = ['c'];
    g.clusters = [{ id: 'c', name: 'C', rackIds: [], fabric: undefined as never, stats: { accelerators: accels, acceleratorId: 'nv-b200-sxm', scaleUpDomain: 8, totalMemGB: 0, peakPFLOPSFp8: 0, peakPFLOPSBf16: 0, powerKW: 0, bisectionTbps: 0, effScaleOutGBs: 0, switchCounts: {}, cableCounts: {}, issues: [] } }];
    return g;
  };
  it('the more GPUs you offer, the less each one earns', () => {
    const small = spotRevenue(base(64), new Set()); const huge = spotRevenue(base(4096), new Set());
    expect(huge.revenue / huge.accels).toBeLessThan((small.revenue / small.accels) * 0.5);
  });
  it('an obsolete generation sells for less than the current one', () => {
    const now = spotRevenue(base(256, 52), new Set()).revenue / 1;
    const g = base(256, 52); g.clusters[0].stats!.acceleratorId = 'nv-a100-80-sxm';
    const old = spotRevenue(g, new Set()).revenue;
    expect(old).toBeLessThan(now);
  });
});

describe('the early game is not dead air', () => {
  it('a competent operator reaches $250k/month of revenue within 12 months (median) and 18 (worst)', () => {
    const months = SEEDS.map((seed) => {
      const agent = PERSONAS.operator(seed); let obs = E.reset({ seed }); const start = E.state().month;
      for (let m = 0; m < 30; m++) {
        for (const a of agent(obs, () => E.legalActions())) { const r = E.step(a); obs = r.obs; if (r.done) break; }
        const h = E.state().history; if (h[h.length - 1].revenue >= 250_000) return E.state().month - start;
      }
      return 99;
    });
    expect(median(months)).toBeLessThanOrEqual(12); expect(Math.max(...months)).toBeLessThanOrEqual(18);
  });
});

describe('persona sweep: what each play style earns (3 seeds, full campaign)', () => {
  const run = (persona: string) => SEEDS.map((s) => play(persona, s, 97));
  const results: Record<string, ReturnType<typeof run>> = {};
  const get = (p: string) => (results[p] ??= run(p));

  it('doing nothing gets you fired by the board', () => {
    for (const r of get('idle')) { expect(r.status).toBe('fired'); expect(r.endMonth).toBeLessThan(75); }
  });
  it('living on the spot market alone does not beat doing nothing', () => {
    const idle = median(get('idle').map((r) => r.netWorth)); const spot = median(get('spotter').map((r) => r.netWorth));
    expect(spot).toBeLessThanOrEqual(idle * 1.05);
  });
  it('a competent operator is never fired or bankrupt and clearly grows the company', () => {
    const r = get('operator');
    for (const x of r) expect(['finished'], `${x.persona} seed ${x.seed}`).toContain(x.status);
    expect(median(r.map((x) => x.netWorth))).toBeGreaterThanOrEqual(100e6);
  });
  it('leveraged play goes bust at most once in three', () => {
    expect(get('tycoon').filter((x) => x.status === 'bankrupt').length).toBeLessThanOrEqual(1);
  });
  it('reinvesting everything has the highest ceiling (and a wider spread than the steady operator)', () => {
    const b = get('builder').map((x) => x.netWorth); const o = get('operator').map((x) => x.netWorth);
    expect(Math.max(...b)).toBeGreaterThan(Math.max(...o));
    expect(Math.max(...b) - Math.min(...b)).toBeGreaterThan(Math.max(...o) - Math.min(...o) * 0.5);
  });
  it('scores separate the styles: idle scores under a quarter of the operator median', () => {
    const idle = median(get('idle').map((r) => r.score)); const op = median(get('operator').map((r) => r.score));
    expect(idle).toBeLessThan(op * 0.25);
  });
}, 300_000);
