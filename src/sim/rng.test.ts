import { describe, it, expect } from 'vitest';
import { mulberry32, randInt, randRange, pick, chance } from './rng';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = Array.from({ length: 100 }, a);
    const seqB = Array.from({ length: 100 }, b);
    expect(seqA).toEqual(seqB);
  });

  it('produces floats in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 10000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds diverge', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, a);
    const seqB = Array.from({ length: 10 }, b);
    expect(seqA).not.toEqual(seqB);
  });

  it('is roughly uniform (mean near 0.5)', () => {
    const rng = mulberry32(42);
    let s = 0;
    for (let i = 0; i < 10000; i++) s += rng();
    expect(s / 10000).toBeGreaterThan(0.48);
    expect(s / 10000).toBeLessThan(0.52);
  });
});

describe('helpers', () => {
  it('randInt stays within inclusive bounds and hits both ends', () => {
    const rng = mulberry32(9);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = randInt(rng, 2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
      seen.add(v);
    }
    expect(seen.has(2)).toBe(true);
    expect(seen.has(5)).toBe(true);
  });

  it('randRange respects bounds', () => {
    const rng = mulberry32(10);
    for (let i = 0; i < 200; i++) {
      const v = randRange(rng, -3, 7);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThan(7);
    }
    expect(randRange(rng, 5, 5)).toBe(5);
  });

  it('pick returns members of the array', () => {
    const rng = mulberry32(11);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) expect(arr).toContain(pick(rng, arr));
  });

  it('chance is strict at the boundaries', () => {
    const rng = mulberry32(12);
    expect(chance(rng, 0)).toBe(false);
    expect(chance(rng, 1)).toBe(true);
  });
});
