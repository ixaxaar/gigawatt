import { describe, it, expect } from 'vitest';
import { getItem } from '../data';
import type { Accelerator, GameState, HallState, PlacedRack } from '../types';
import { assetValue, generationsBehind, rackAccelItem, rackAgeMonths, rackResidualUSD, residualFactor } from './lifecycle';

const monthOf = (year: number) => Math.round((year - 2020) * 12);
const price = (id: string) => getItem(id)?.priceUSD ?? 0;
const A100 = getItem('nv-a100-40-sxm') as Accelerator;
const H100 = getItem('nv-h100-sxm') as Accelerator;

const makeHall = (o: Partial<HallState> = {}): HallState => ({
  id: 'h1', name: 'H1', coolingClass: 'air', rackSlots: 10, itPowerKW: 0, coolingKW: 0, pue: 1,
  powerEquip: {}, coolingEquip: {}, racks: [], floorLoadKgPerRack: 1500, ...o,
});

const makeState = (o: Partial<GameState> = {}): GameState => ({
  month: 0, seed: 1, cash: 0, debt: 0, reputation: 50, halls: [],
  trays: [
    { id: 't-a100', name: 'A100 tray', chassisId: 'nv-hgx-h100-8gy', parts: [{ slot: 'accelerator', itemId: 'nv-a100-40-sxm', count: 8 }] },
    { id: 't-h100', name: 'H100 tray', chassisId: 'nv-hgx-h100-8gy', parts: [{ slot: 'accelerator', itemId: 'nv-h100-sxm', count: 8 }] },
  ],
  racks: [
    { id: 'r-a100', name: 'A100 rack', rackId: 'gen-rack-19-42u', items: [{ type: 'tray', trayId: 't-a100', count: 1 }], coolingInterface: 'air' },
    { id: 'r-h100', name: 'H100 rack', rackId: 'gen-rack-19-42u', items: [{ type: 'tray', trayId: 't-h100', count: 1 }], coolingInterface: 'air' },
    { id: 'r-net', name: 'Net rack', rackId: 'gen-rack-19-42u', items: [{ type: 'switch', switchId: 'nv-qm9700', count: 2 }], coolingInterface: 'air' },
  ],
  clusters: [], inventory: {}, orders: [], availableContracts: [], activeContracts: [], log: [],
  staff: 0, utilityUSDPerKWh: 0.1, codexSeen: [], missionsDone: [], history: [], ...o,
});

const rack = (designId: string, o: Partial<PlacedRack> = {}): PlacedRack => ({
  id: 'RK-0001', designId, slot: 0, status: 'online', readyMonth: 6, installedMonth: 4, ...o,
});

describe('rackAgeMonths', () => {
  it('ages from installedMonth and treats legacy racks as readyMonth − 2', () => {
    expect(rackAgeMonths(rack('r-a100'), 16)).toBe(12);
    expect(rackAgeMonths(rack('r-a100', { installedMonth: undefined }), 16)).toBe(12);
    expect(rackAgeMonths(rack('r-a100'), 0)).toBe(0);
  });
});

describe('generationsBehind', () => {
  it('counts newer accelerator launch years, capped at 3', () => {
    expect(generationsBehind(A100, monthOf(2020.9))).toBe(0);
    expect(generationsBehind(A100, monthOf(2023))).toBe(2); // 2021 (MI250X), 2022 (H100)
    expect(generationsBehind(A100, monthOf(2024))).toBe(3); // +2023
    expect(generationsBehind(A100, monthOf(2027))).toBe(3); // capped
    expect(generationsBehind(H100, monthOf(2024))).toBe(2); // 2023 + H20 at exactly 2024.0
  });
});

describe('residualFactor', () => {
  it('falls with age and obsolescence, floored at 8%', () => {
    expect(residualFactor(makeState({ month: 0 }), rack('r-a100'))).toBe(1);
    let prev = 1, hitFloor = false;
    for (let m = 1; m <= 144; m++) {
      const f = residualFactor(makeState({ month: m }), rack('r-a100'));
      expect(f).toBeLessThanOrEqual(prev);
      if (f === 0.08) hitFloor = true;
      prev = f;
    }
    expect(hitFloor).toBe(true);
  });
  it('values a newer generation above an older one at the same age', () => {
    const g = makeState({ month: monthOf(2024) });
    expect(residualFactor(g, rack('r-a100', { installedMonth: monthOf(2024) }))).toBeCloseTo(1 - 0.12 * 3, 6);
    expect(residualFactor(g, rack('r-h100', { installedMonth: monthOf(2024) }))).toBeCloseTo(1 - 0.12 * 2, 6);
  });
  it('accelerator-less racks wear slower and floor at 20%', () => {
    expect(residualFactor(makeState({ month: 60 }), rack('r-net', { installedMonth: 0 }))).toBeCloseTo(1 - 0.12 * 5, 6);
    expect(residualFactor(makeState({ month: 120 }), rack('r-net', { installedMonth: 0 }))).toBe(0.2);
  });
});

describe('rackAccelItem / rackResidualUSD / assetValue', () => {
  it('finds the design accelerator (undefined for network racks)', () => {
    const g = makeState();
    expect(rackAccelItem(g, 'r-a100')?.id).toBe('nv-a100-40-sxm');
    expect(rackAccelItem(g, 'r-net')).toBeUndefined();
  });
  it('residual is BOM × factor; asset value blends stock, spares, plant and racks', () => {
    const bom = price('gen-rack-19-42u') + price('nv-hgx-h100-8gy') + 8 * price('nv-a100-40-sxm');
    const g = makeState({
      month: 0,
      inventory: { 'nv-a100-40-sxm': 4 },
      spareStock: { 'sam-pm9a3-3t84': 2 },
      halls: [makeHall({ powerEquip: { 'vt-exl-s1-1250': 1 }, racks: [rack('r-a100')] })],
    });
    expect(rackResidualUSD(g, rack('r-a100'))).toBeCloseTo(bom, 6); // age 0 → factor 1
    expect(assetValue(g)).toBeCloseTo(0.8 * (4 * price('nv-a100-40-sxm') + 2 * price('sam-pm9a3-3t84')) + 0.6 * price('vt-exl-s1-1250') + bom, 6);
  });
});
