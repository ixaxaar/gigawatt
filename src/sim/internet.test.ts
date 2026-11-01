import { describe, it, expect } from 'vitest';
import { uplinkGbps, carrierCount, contractNeedGbps, uplinkMonthlyUSD } from './internet';
import { hallResilience } from './resilience';
import { newGameState } from '../store';
import type { GameState, HallState } from '../types';

describe('internet uplinks', () => {
  it('new games start with a single 10G carrier; legacy saves are unlimited', () => {
    const g = newGameState(1);
    expect(uplinkGbps(g)).toBe(10);
    expect(carrierCount(g)).toBe(1);
    expect(uplinkMonthlyUSD(g)).toBe(3500);
    expect(uplinkGbps({ ...g, uplinks: undefined } as GameState)).toBe(Infinity);
  });
  it('a second carrier is counted and demand scales with the contract', () => {
    const g = { ...newGameState(1), uplinks: { 'transit-10g-a': 1, 'transit-100g-b': 1 } };
    expect(carrierCount(g)).toBe(2);
    expect(uplinkGbps(g)).toBe(110);
    expect(contractNeedGbps({ kind: 'inference', tokensPerSec: 1_000_000 })).toBe(20);
    expect(contractNeedGbps({ kind: 'training', minAccelerators: 1000 })).toBe(20);
  });
});

describe('N+1 power', () => {
  const hall = (e: Record<string, number>) => ({ itPowerKW: 2000, powerEquip: e, coolingEquip: {}, racks: [] } as unknown as HallState);
  it('two gensets with paralleling gear and a UPS reach N+1', () => {
    const r = hallResilience(hall({ 'vt-exl-s1-1250': 2, 'gen-vrla-500': 1, 'cat-3516-2500': 2, 'abb-paralleling-4000': 1, 'gen-ats-1600': 3 }));
    expect(r.tier).toBe('N+1');
  });
  it('a single genset is only N', () => {
    const r = hallResilience(hall({ 'vt-exl-s1-1250': 2, 'gen-vrla-500': 1, 'cat-3516-2500': 1, 'gen-ats-1600': 3 }));
    expect(r.tier).toBe('N');
  });
});
