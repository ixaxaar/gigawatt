import { describe, it, expect } from 'vitest';
import {
  monthlyOpex, monthlyDepreciation, monthlyInterest, loanMonthlyPayment,
  contractRevenue, estimateCapexBasis,
} from './economy';
import { getItem } from '../data';
import type { ActiveContract, GameState, HallState, InferenceContract, TrainingContract } from '../types';

const makeHall = (o: Partial<HallState> = {}): HallState => ({
  id: 'h1',
  name: 'Hall 1',
  coolingClass: 'air',
  rackSlots: 40,
  itPowerKW: 5000,
  coolingKW: 5000,
  pue: 1.3,
  powerEquip: {},
  coolingEquip: {},
  racks: [],
  floorLoadKgPerRack: 1500,
  ...o,
});

const makeState = (o: Partial<GameState> = {}): GameState => ({
  month: 0,
  seed: 1,
  cash: 0,
  debt: 0,
  reputation: 50,
  halls: [],
  trays: [{ id: 't1', name: 'HGX tray', chassisId: 'nv-hgx-h100-8gy', parts: [{ slot: 'accelerator', itemId: 'nv-h100-sxm', count: 8 }] }],
  racks: [{ id: 'r1', name: 'Rack 1', rackId: 'gen-rack-19-42u', items: [{ type: 'tray', trayId: 't1', count: 1 }], coolingInterface: 'air' }],
  clusters: [],
  inventory: {},
  orders: [],
  availableContracts: [],
  activeContracts: [],
  log: [],
  staff: 0,
  utilityUSDPerKWh: 0.1,
  codexSeen: [],
  missionsDone: [],
  history: [],
  ...o,
});

describe('monthlyOpex', () => {
  it('computes power as kWh * $/kWh with PUE over the cluster draw', () => {
    const s = makeState({
      staff: 10,
      halls: [makeHall({ pue: 1.3 })],
      clusters: [{ id: 'c1', name: 'C1', rackIds: [], fabric: { id: 'f1', name: 'F', scaleOutTech: 'roce', topology: 'fat-tree', oversubscription: 1, leafSwitchId: 'x', nodeToLeafCableId: 'y' }, stats: { accelerators: 8, acceleratorId: 'nv-h100-sxm', scaleUpDomain: 8, totalMemGB: 640, peakPFLOPSFp8: 16, peakPFLOPSBf16: 8, powerKW: 1000, bisectionTbps: 6.4, effScaleOutGBs: 50, switchCounts: {}, cableCounts: {}, issues: [] } }],
    });
    const opex = monthlyOpex(s, { capexUSD: 12_000_000 });
    expect(opex.itPowerKW).toBe(1000);
    expect(opex.pue).toBe(1.3);
    expect(opex.kwh).toBeCloseTo(1000 * 1.3 * 730, 0);
    expect(opex.powerUSD).toBeCloseTo(94900, 0);
    expect(opex.staffUSD).toBe(120000);
    expect(opex.supportUSD).toBeCloseTo(50000, 0);
    expect(opex.totalUSD).toBeCloseTo(94900 + 120000 + 50000, 0);
  });

  it('weights PUE across halls by their IT power', () => {
    const s = makeState({
      halls: [makeHall({ id: 'a', pue: 1.1, itPowerKW: 1000 }), makeHall({ id: 'b', pue: 1.5, itPowerKW: 3000 })],
    });
    const opex = monthlyOpex(s, { itPowerKW: 2000 });
    expect(opex.pue).toBeCloseTo(1.4, 6);
    expect(opex.kwh).toBeCloseTo(2000 * 1.4 * 730, 0);
  });

  it('an empty facility burns nothing but staff', () => {
    const s = makeState({ staff: 4 });
    const opex = monthlyOpex(s);
    expect(opex.powerUSD).toBe(0);
    expect(opex.staffUSD).toBe(48000);
    expect(opex.supportUSD).toBe(0);
    expect(opex.totalUSD).toBe(48000);
  });

  it('honors explicit overrides', () => {
    const s = makeState({ staff: 10, halls: [makeHall({ pue: 1.5 })], utilityUSDPerKWh: 0.05 });
    const opex = monthlyOpex(s, { itPowerKW: 2000, pue: 1.2, staffCostPerMonth: 20000, capexUSD: 0 });
    expect(opex.powerUSD).toBeCloseTo(2000 * 1.2 * 730 * 0.05, 0);
    expect(opex.staffUSD).toBe(200000);
  });
});

describe('depreciation & loans', () => {
  it('straight-lines capex over 5 years by default', () => {
    expect(monthlyDepreciation(6_000_000)).toBeCloseTo(100000, 6);
    expect(monthlyDepreciation(6_000_000, 3)).toBeCloseTo(6_000_000 / 36, 6);
    expect(monthlyDepreciation(0)).toBe(0);
  });

  it('interest is debt * apr / 12', () => {
    expect(monthlyInterest(12_000_000, 0.06)).toBeCloseTo(60000, 6);
    expect(monthlyInterest(0)).toBe(0);
  });

  it('amortizes loan payments correctly', () => {
    expect(loanMonthlyPayment(120_000, 0, 12)).toBeCloseTo(10000, 6);
    const pmt = loanMonthlyPayment(1_000_000, 0.06, 36);
    expect(pmt).toBeGreaterThan(1_000_000 / 36);
    expect(pmt * 36).toBeGreaterThan(1_000_000);
    expect(pmt * 36).toBeLessThan(1_100_000);
  });
});

describe('contractRevenue', () => {
  const train: TrainingContract = {
    kind: 'training',
    id: 't1', customer: 'Acme', archetype: 'enterprise',
    model: { id: 'm', name: 'M', paramsB: 70, activeParamsB: 70, layers: 80, kvBytesPerToken: 327680, era: 2024 },
    minAccelerators: 256, minScaleUpDomain: 8, minScaleOutGBsPerAccel: 50, minTotalMemGB: 1120,
    durationMonths: 6, pricePerAccelHour: 2.5, penaltyRate: 0.01, deadlineMonth: 10, slaAvailability: 0.98,
  };
  const infer: InferenceContract = {
    kind: 'inference',
    id: 'i1', customer: 'Acme', archetype: 'startup',
    model: train.model,
    tokensPerSec: 1000, tpotMs: 40, ttftMs: 300, contextTokens: 4096,
    durationMonths: 6, pricePerMTok: 5, penaltyRate: 0.01, deadlineMonth: 10, slaAvailability: 0.98,
  };
  const active = (c: TrainingContract | InferenceContract): ActiveContract => ({
    contract: c, clusterIds: ['c1'], startMonth: 0, monthsServed: 0, slaMisses: 0,
  });
  const GROSS_TRAIN = 256 * 2.5 * 730;

  it('pays full freight when the SLA is met', () => {
    const r = contractRevenue(active(train), { accelerators: 256, availability: 0.995 });
    expect(r.grossUSD).toBeCloseTo(GROSS_TRAIN, 6);
    expect(r.slaMet).toBe(true);
    expect(r.penaltyUSD).toBe(0);
    expect(r.netUSD).toBeCloseTo(GROSS_TRAIN, 6);
  });

  it('bills proportionally and penalizes per 1% under SLA', () => {
    const r = contractRevenue(active(train), { accelerators: 256, availability: 0.95 });
    expect(r.slaMet).toBe(false);
    expect(r.billableUSD).toBeCloseTo(GROSS_TRAIN * (0.95 / 0.98), 6);
    expect(r.penaltyUSD).toBeCloseTo(GROSS_TRAIN * 0.01 * 3, 6);
    expect(r.netUSD).toBeCloseTo(GROSS_TRAIN * (0.95 / 0.98) - GROSS_TRAIN * 0.03, 6);
    expect(r.netUSD).toBeLessThan(GROSS_TRAIN);
  });

  it('penalties are capped at 25% of gross even at zero availability', () => {
    const r = contractRevenue(active(train), { accelerators: 256, availability: 0 });
    expect(r.billableUSD).toBe(0);
    expect(r.penaltyUSD).toBeCloseTo(GROSS_TRAIN * 0.25, 6);
    expect(r.netUSD).toBeCloseTo(-GROSS_TRAIN * 0.25, 6);
  });

  it('inference bills by the million output tokens', () => {
    const r = contractRevenue(active(infer), { tokensPerSec: 1000, availability: 0.99 });
    expect(r.grossUSD).toBeCloseTo((1000 * 730 * 3600) / 1e6 * 5, 6);
    expect(r.netUSD).toBeCloseTo(13140, 1);
    const zero = contractRevenue(active(infer), { tokensPerSec: 0, availability: 1 });
    expect(zero.grossUSD).toBe(0);
  });
});

describe('estimateCapexBasis', () => {
  it('values inventory at catalog prices', () => {
    const s = makeState({ inventory: { 'nv-h100-sxm': 8 } });
    const expected = 8 * (getItem('nv-h100-sxm')?.priceUSD ?? 0);
    expect(expected).toBeGreaterThan(0);
    expect(estimateCapexBasis(s)).toBeCloseTo(expected, 6);
  });

  it('values hall plant and installed rack BOMs', () => {
    const s = makeState({
      inventory: { 'nv-h100-sxm': 8 },
      halls: [makeHall({
        powerEquip: { 'vt-exl-s1-1250': 1 },
        racks: [{ id: 'pr1', designId: 'r1', slot: 0, status: 'online', readyMonth: 0 }],
      })],
    });
    const expected =
      8 * (getItem('nv-h100-sxm')?.priceUSD ?? 0)
      + (getItem('vt-exl-s1-1250')?.priceUSD ?? 0)
      + (getItem('gen-rack-19-42u')?.priceUSD ?? 0)
      + (getItem('nv-hgx-h100-8gy')?.priceUSD ?? 0)
      + 8 * (getItem('nv-h100-sxm')?.priceUSD ?? 0);
    expect(estimateCapexBasis(s)).toBeCloseTo(expected, 6);
  });

  it('is zero for a fresh game', () => {
    expect(estimateCapexBasis(makeState())).toBe(0);
  });
});
