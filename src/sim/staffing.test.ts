import { describe, it, expect } from 'vitest';
import { staffNeeded, staffEffect, SEVERANCE_USD, RECRUIT_COST_USD } from './staffing';
import { STAFF_COST_PER_MONTH } from './economy';
import type { CoolingClass, GameState, HallState, PlacedRack } from '../types';

const hall = (coolingClass: CoolingClass, online: number, failed = 0): HallState =>
  ({
    coolingClass,
    racks: [
      ...Array.from({ length: online }, (_, i) => ({ id: `on${i}`, status: 'online' })),
      ...Array.from({ length: failed }, (_, i) => ({ id: `fa${i}`, status: 'failed' })),
    ] as PlacedRack[],
  }) as unknown as HallState;

const game = (halls: HallState[], accels = 0, staff = 2): GameState =>
  ({ halls, staff, clusters: accels > 0 ? [{ stats: { accelerators: accels } }] : [] }) as unknown as GameState;

describe('staffNeeded', () => {
  it('an empty datacenter still needs a skeleton crew of 1', () => {
    const r = staffNeeded(game([hall('air', 0)]));
    expect(r.needed).toBe(1);
    expect(r.breakdown).toEqual([]);
  });

  it('scales with online racks only: one ops technician per 10', () => {
    expect(staffNeeded(game([hall('air', 25)])).breakdown).toEqual([{ label: 'ops technicians', n: 3 }]);
    expect(staffNeeded(game([hall('air', 10, 30)])).breakdown).toEqual([{ label: 'ops technicians', n: 1 }]);
  });

  it('adds a liquid-cooling specialist only when a DLC/immersion hall has online racks', () => {
    expect(staffNeeded(game([hall('air', 10), hall('dlc', 4)])).needed).toBe(3); // 1 tech + 1 tech + specialist
    expect(staffNeeded(game([hall('air', 10), hall('immersion', 0)])).needed).toBe(1);
  });

  it('adds one network engineer per 1024 clustered accelerators', () => {
    expect(staffNeeded(game([hall('air', 10)], 1024)).needed).toBe(2);
    expect(staffNeeded(game([hall('air', 10)], 1025)).needed).toBe(3);
  });
});

describe('staffEffect', () => {
  it('fully staffed is neutral', () => {
    expect(staffEffect(game([hall('air', 30)], 0, 3))).toEqual({ failureMult: 1, repairExtraMonths: 0 });
  });

  it('understaffed multiplies failure probability and slows repairs', () => {
    // 25 racks (3 techs) + 1024 accels (1 engineer) = 4 needed, 1 on hand: 75% short.
    expect(staffEffect(game([hall('air', 25)], 1024, 1))).toEqual({ failureMult: 2.125, repairExtraMonths: 1 });
  });

  it('a shortfall under a third costs failures but not repair months', () => {
    const r = staffEffect(game([hall('air', 30)], 0, 2)); // 3 needed, 2 on hand: 1/3 short
    expect(r.failureMult).toBeCloseTo(1.5, 10);
    expect(r.repairExtraMonths).toBe(0);
  });

  it('cost constants stay in sync with the spec', () => {
    expect(RECRUIT_COST_USD).toBe(15_000);
    expect(SEVERANCE_USD).toBe(2 * STAFF_COST_PER_MONTH);
  });
});
