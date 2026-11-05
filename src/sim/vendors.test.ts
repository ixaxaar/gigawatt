import { describe, it, expect } from 'vitest';
import {
  REL_MAX, adjustRel, capMultiplier, discountPctFor, frameworkDiscount, frameworkFor,
  recordSpend, relBonus, relDiscount,
} from './vendors';
import type { Framework, GameState } from '../types';

const game = (over: Partial<GameState> = {}): GameState =>
  ({ month: 11, reputation: 0, vendorRel: {}, ...over }) as unknown as GameState;

const fw = (over: Partial<Framework> = {}): Framework =>
  ({ id: 'fw-11-1', vendorId: 'nvidia', commitUSD: 2_000_000, spentUSD: 100_000, discountPct: 3, startMonth: 11, endMonth: 23, ...over });

describe('discountPctFor', () => {
  it('hits the anchors: 3% at $2M/12mo, 12% at $50M/36mo', () => {
    expect(discountPctFor(2e6, 12)).toBe(3);
    expect(discountPctFor(50e6, 36)).toBe(12);
  });

  it('clamps beyond the anchors', () => {
    expect(discountPctFor(1e6, 6)).toBe(3);
    expect(discountPctFor(500e6, 60)).toBe(12);
  });

  it('is monotonic in commitment and term', () => {
    const commits = [2e6, 5e6, 1e7, 2e7, 5e7];
    for (let i = 1; i < commits.length; i++) {
      expect(discountPctFor(commits[i], 24)).toBeGreaterThanOrEqual(discountPctFor(commits[i - 1], 24));
      expect(discountPctFor(commits[i], 12)).toBeGreaterThanOrEqual(discountPctFor(commits[i - 1], 12));
    }
    const terms = [12, 18, 24, 30, 36];
    for (let i = 1; i < terms.length; i++) {
      expect(discountPctFor(1e7, terms[i])).toBeGreaterThanOrEqual(discountPctFor(1e7, terms[i - 1]));
    }
  });
});

describe('relationship math', () => {
  it('relBonus maps 0..100 to 0..1 and clamps', () => {
    expect(relBonus(0)).toBe(0);
    expect(relBonus(50)).toBeCloseTo(0.5);
    expect(relBonus(REL_MAX)).toBe(1);
    expect(relBonus(150)).toBe(1);
  });

  it('capMultiplier: 1 at neutral, +0.5 at rel 100, +0.003 per reputation point, reputation clamped', () => {
    expect(capMultiplier(game(), 'nvidia')).toBe(1);
    expect(capMultiplier(game({ reputation: 50 }), 'nvidia')).toBeCloseTo(1.15);
    expect(capMultiplier(game({ vendorRel: { nvidia: 100 }, reputation: 0 }), 'nvidia')).toBeCloseTo(1.5);
    expect(capMultiplier(game({ vendorRel: { nvidia: 100 }, reputation: 100 }), 'nvidia')).toBeCloseTo(1.8);
    expect(capMultiplier(game({ vendorRel: { nvidia: 100 }, reputation: 900 }), 'nvidia')).toBeCloseTo(1.8);
  });

  it('relDiscount reaches 6% at rel 100', () => {
    expect(relDiscount(game(), 'amd')).toBe(0);
    expect(relDiscount(game({ vendorRel: { amd: 50 } }), 'amd')).toBeCloseTo(0.03);
    expect(relDiscount(game({ vendorRel: { amd: 100 } }), 'amd')).toBeCloseTo(0.06);
  });

  it('adjustRel clamps to 0..100', () => {
    const g = game({ vendorRel: { amd: 5 } });
    adjustRel(g, 'amd', -15);
    expect(g.vendorRel!.amd).toBe(0);
    adjustRel(g, 'amd', 200);
    expect(g.vendorRel!.amd).toBe(100);
  });
});

describe('frameworkFor', () => {
  it('finds the live framework and rejects out-of-window or exhausted ones', () => {
    const f = fw();
    expect(frameworkFor(game({ frameworks: [f] }), 'nvidia')).toBe(f);
    expect(frameworkFor(game({ month: 10, frameworks: [f] }), 'nvidia')).toBeUndefined();
    expect(frameworkFor(game({ month: 24, frameworks: [f] }), 'nvidia')).toBeUndefined();
    expect(frameworkFor(game({ frameworks: [{ ...f, spentUSD: 2e6 }] }), 'nvidia')).toBeUndefined();
    expect(frameworkFor(game({ frameworks: [f] }), 'amd')).toBeUndefined();
    expect(frameworkDiscount(f)).toBeCloseTo(0.03);
  });
});

describe('recordSpend', () => {
  it('credits the active framework and raises rel by $/1M', () => {
    const g = game({ frameworks: [fw()], vendorRel: { nvidia: 95 } });
    recordSpend(g, 'nvidia', 500_000);
    expect(g.frameworks![0].spentUSD).toBe(600_000);
    expect(g.vendorRel!.nvidia).toBeCloseTo(95.5);
  });

  it('caps the per-order gain at 8 and the relationship at 100', () => {
    const g = game({ vendorRel: { nvidia: 10 } });
    recordSpend(g, 'nvidia', 20e6);
    expect(g.vendorRel!.nvidia).toBe(18);
    const g2 = game({ vendorRel: { nvidia: 99 } });
    recordSpend(g2, 'nvidia', 5e6);
    expect(g2.vendorRel!.nvidia).toBe(100);
  });

  it('does not grow an exhausted framework', () => {
    const g = game({ frameworks: [fw({ spentUSD: 2e6 })] });
    recordSpend(g, 'nvidia', 1e6);
    expect(g.frameworks![0].spentUSD).toBe(2e6);
    expect(g.vendorRel!.nvidia).toBeCloseTo(1);
  });
});
