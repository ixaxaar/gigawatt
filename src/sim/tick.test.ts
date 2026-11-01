import { describe, it, expect } from 'vitest';
import { advanceMonth, rackFailureProb, RACK_READY_LEAD } from './tick';
import { evaluateCluster } from './network';
import { inferenceCapacity } from './perf';
import { contractRevenue, monthlyOpex, HOURS_PER_MONTH } from './economy';
import { MODELS } from './market';
import { getItem } from '../data';
import type {
  ActiveContract,
  Cluster,
  FabricDesign,
  GameState,
  HallState,
  InferenceContract,
  RackDesign,
  TrainingContract,
  TrayDesign,
} from '../types';

const NO_FAIL = { accelFailureProbPerMonth: 0, commissionFailProb: 0 };

const tray = (id: string): TrayDesign => ({
  id,
  name: id,
  chassisId: 'nv-hgx-h100-8gy',
  parts: [
    { slot: 'accelerator', itemId: 'nv-h100-sxm', count: 8 },
    { slot: 'nic', itemId: 'nv-connectx7', count: 8 },
  ],
});

const rackDesign = (id: string): RackDesign => ({
  id,
  name: id,
  rackId: 'gen-rack-19-42u',
  items: [{ type: 'tray', trayId: 't0', count: 4 }],
  coolingInterface: 'air',
});

const fabric = (): FabricDesign => ({
  id: 'f',
  name: 'F',
  scaleOutTech: 'ib-ndr',
  topology: 'fat-tree-rail-optimized',
  oversubscription: 1,
  leafSwitchId: 'nv-qm9700',
  spineSwitchId: 'nv-qm9700',
  nodeToLeafCableId: 'gen-aoc-400-30m',
  leafToSpineCableId: 'gen-dr4-400-500m',
});

const RACKS = 16;
const ACCELS = RACKS * 4 * 8; // 512 H100s

const clusterFixture = (): Cluster => {
  const racks = Array.from({ length: RACKS }, (_, i) => rackDesign(`r${i}`));
  const cluster: Cluster = { id: 'c1', name: 'C1', rackIds: racks.map((r) => r.id), fabric: fabric() };
  cluster.stats = evaluateCluster(cluster, {
    getRack: (id) => racks.find((r) => r.id === id),
    getTray: (id) => (id === 't0' ? tray('t0') : undefined),
    getItem,
  });
  return cluster;
};

const baseGame = (over: Partial<GameState> = {}): GameState => {
  const cluster = clusterFixture();
  const racks = cluster.rackIds.map((id) => rackDesign(id));
  const hall: HallState = {
    id: 'hall-1',
    name: 'Hall A',
    coolingClass: 'air',
    rackSlots: 40,
    itPowerKW: 1000,
    coolingKW: 1000,
    pue: 1.1,
    powerEquip: {},
    coolingEquip: {},
    racks: racks.map((r, i) => ({
      id: r.id,
      designId: r.id,
      slot: i,
      status: 'online' as const,
      readyMonth: 0,
      clusterId: 'c1',
    })),
    floorLoadKgPerRack: 1500,
  };
  return {
    month: 10,
    seed: 424242,
    cash: 50_000_000,
    debt: 0,
    reputation: 10,
    halls: [hall],
    trays: [tray('t0')],
    racks,
    clusters: [cluster],
    inventory: {},
    orders: [],
    availableContracts: [],
    activeContracts: [],
    log: [],
    staff: 0,
    utilityUSDPerKWh: 0.07,
    codexSeen: [],
    missionsDone: [],
    history: [],
    ...over,
  };
};

const trainContract = (over: Partial<TrainingContract> = {}): TrainingContract => ({
  kind: 'training',
  id: 'trn-1',
  customer: 'Glyph AI',
  archetype: 'lab',
  model: MODELS.find((m) => m.id === 'chinchilla-70b')!,
  minAccelerators: ACCELS,
  minScaleUpDomain: 8,
  minScaleOutGBsPerAccel: 10,
  minTotalMemGB: 1120,
  durationMonths: 3,
  pricePerAccelHour: 2.5,
  penaltyRate: 0.01,
  deadlineMonth: 20,
  slaAvailability: 0.9,
  ...over,
});

const inferContract = (over: Partial<InferenceContract> = {}): InferenceContract => ({
  kind: 'inference',
  id: 'inf-1',
  customer: 'Otter Systems',
  archetype: 'startup',
  model: MODELS.find((m) => m.id === 'chinchilla-70b')!,
  tokensPerSec: 1000,
  tpotMs: 50,
  ttftMs: 5000,
  contextTokens: 4096,
  durationMonths: 6,
  pricePerMTok: 2,
  penaltyRate: 0.01,
  deadlineMonth: 20,
  slaAvailability: 0.9,
  ...over,
});

const active = (contract: TrainingContract | InferenceContract, clusterIds: string[] = ['c1'], monthsServed = 0): ActiveContract => ({
  contract,
  clusterIds,
  startMonth: 10,
  monthsServed,
  slaMisses: 0,
});

describe('advanceMonth: purity & determinism', () => {
  it('returns a new state and never mutates the input', () => {
    const g = baseGame({ activeContracts: [active(trainContract())] });
    const snapshot = JSON.parse(JSON.stringify(g)) as GameState;
    const after = advanceMonth(g, NO_FAIL);
    expect(after).not.toBe(g);
    expect(g).toEqual(snapshot);
  });

  it('is deterministic for a given seed', () => {
    const g = baseGame({ activeContracts: [active(trainContract())] });
    const a = advanceMonth(g);
    const b = advanceMonth(g);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
    const chainedA = advanceMonth(advanceMonth(g, NO_FAIL), NO_FAIL);
    const chainedB = advanceMonth(advanceMonth(g, NO_FAIL), NO_FAIL);
    expect(JSON.stringify(chainedA)).toEqual(JSON.stringify(chainedB));
  });
});

describe('advanceMonth: deliveries', () => {
  it('moves arrived orders into inventory and keeps future ones pending', () => {
    const g = baseGame({
      orders: [
        { id: 'o1', itemId: 'nv-h100-sxm', qty: 8, unitPrice: 30000, arriveMonth: 11 },
        { id: 'o2', itemId: 'nv-connectx7', qty: 4, unitPrice: 2500, arriveMonth: 13 },
      ],
    });
    const s = advanceMonth(g, NO_FAIL);
    expect(s.month).toBe(11);
    expect(s.inventory['nv-h100-sxm']).toBe(8);
    expect(s.orders).toEqual([g.orders[1]]);
    expect(s.log.some((l) => l.text.includes('Delivered 8 unit'))).toBe(true);
  });
});

describe('advanceMonth: rack commissioning', () => {
  const rackAt = (status: 'installing' | 'commissioning', readyMonth: number): GameState => {
    const g = baseGame({ clusters: [] });
    g.halls[0].racks = [
      { id: 'r0', designId: 'r0', slot: 0, status, readyMonth, clusterId: undefined },
    ];
    return g;
  };

  it('progresses installing -> commissioning -> online', () => {
    const placed = 10;
    const g = rackAt('installing', placed + RACK_READY_LEAD);
    const s1 = advanceMonth(g, NO_FAIL);
    expect(s1.halls[0].racks[0].status).toBe('commissioning');
    const s2 = advanceMonth(s1, NO_FAIL);
    expect(s2.halls[0].racks[0].status).toBe('online');
    expect(s2.log.some((l) => l.level === 'good' && l.text.includes('commissioned'))).toBe(true);
  });

  it('a burn-in failure sends the rack to repair instead', () => {
    const g = rackAt('commissioning', 11);
    const s = advanceMonth(g, { accelFailureProbPerMonth: 0, commissionFailProb: 1, repairMonths: 2 });
    const rack = s.halls[0].racks[0];
    expect(rack.status).toBe('failed');
    expect(rack.readyMonth).toBe(11 + 2);
    expect(s.log.some((l) => l.level === 'bad' && l.text.includes('burn-in'))).toBe(true);
  });
});

describe('advanceMonth: training contract serving', () => {
  it('bills accelerator-hours at full availability and settles opex', () => {
    const g = baseGame({ activeContracts: [active(trainContract())] });
    const s = advanceMonth(g, NO_FAIL);
    const expectedRevenue = ACCELS * 2.5 * HOURS_PER_MONTH; // 934,400
    expect(s.history[0].revenue).toBeCloseTo(expectedRevenue, 2);
    const opex = monthlyOpex(s);
    expect(s.cash).toBeCloseTo(50_000_000 + expectedRevenue - opex.totalUSD, 1);
    expect(s.activeContracts[0].monthsServed).toBe(1);
    expect(s.activeContracts[0].slaMisses).toBe(0);
    expect(s.history[0].utilization).toBe(1);
  });

  it('keeps an undeployed contract pending (no revenue, no SLA clock) until its deploy deadline, then cancels it', () => {
    const g0 = baseGame({ activeContracts: [] });
    const ac = { ...active(trainContract(), []), deployBy: g0.month + 2 };
    let s = advanceMonth({ ...g0, activeContracts: [ac] }, NO_FAIL);
    expect(s.history[0].revenue).toBe(0);
    expect(s.activeContracts[0].slaMisses).toBe(0);
    expect(s.activeContracts[0].monthsServed).toBe(0);
    const rep = s.reputation;
    s = advanceMonth(s, NO_FAIL); // month 2 = last month
    expect(s.activeContracts.length).toBe(1);
    s = advanceMonth(s, NO_FAIL); // month 3 > deployBy
    expect(s.activeContracts.length).toBe(0);
    expect(s.reputation).toBeLessThan(rep);
    expect(s.log.some((l) => l.level === 'bad' && l.text.includes('cancelled'))).toBe(true);
  });
});

describe('advanceMonth: inference contract serving', () => {
  it('bills delivered tokens and checks capacity', () => {
    const g = baseGame({ activeContracts: [active(inferContract())] });
    const s = advanceMonth(g, NO_FAIL);
    const stats = s.clusters[0].stats!;
    const accel = getItem(stats.acceleratorId)!;
    if (accel.kind !== 'accelerator') throw new Error('not an accelerator');
    const cap = inferenceCapacity(stats, accel, inferContract().model, { contextTokens: 4096, tpotMs: 50 });
    const delivered = Math.min(cap.tokensPerSec, 1000);
    const expected = contractRevenue(active(inferContract()), {
      tokensPerSec: delivered,
      availability: Math.min(1, cap.tokensPerSec / 1000) * (cap.ttftMs <= 5000 ? 1 : 0.8),
    });
    expect(cap.tokensPerSec).toBeGreaterThan(1000);
    expect(s.history[0].revenue).toBeCloseTo(expected.netUSD, 2);
    expect(s.activeContracts[0].slaMisses).toBe(0);
  });
});

describe('advanceMonth: failures & MTBF scaling', () => {
  it('rack failure probability grows with accelerator count and triples under cooling stress', () => {
    expect(rackFailureProb(0, false)).toBe(0);
    expect(rackFailureProb(1000, false)).toBeGreaterThan(rackFailureProb(100, false));
    expect(rackFailureProb(100, true)).toBeGreaterThan(rackFailureProb(100, false));
    expect(rackFailureProb(16384, false)).toBeGreaterThan(0.85);
  });

  it('takes racks down, misses SLA, then repairs them and revenue resumes', () => {
    const g = baseGame({ activeContracts: [active(trainContract())] });
    const t1 = advanceMonth(g, { accelFailureProbPerMonth: 1, commissionFailProb: 0, repairMonths: 2 });
    expect(t1.halls[0].racks.every((r) => r.status === 'failed')).toBe(true);
    expect(t1.history[0].revenue).toBe(0);
    expect(t1.activeContracts[0].slaMisses).toBe(1);
    expect(t1.log.some((l) => l.level === 'bad' && l.text.includes('rack(s) went down'))).toBe(true);

    const t2 = advanceMonth(t1, NO_FAIL);
    expect(t2.halls[0].racks.every((r) => r.status === 'failed')).toBe(true);
    expect(t2.activeContracts[0].slaMisses).toBe(2);

    const t3 = advanceMonth(t2, NO_FAIL);
    expect(t3.halls[0].racks.every((r) => r.status === 'online')).toBe(true);
    expect(t3.history[2].revenue).toBeCloseTo(ACCELS * 2.5 * HOURS_PER_MONTH, 2);
    expect(t3.activeContracts.length).toBe(0); // 3 months served -> complete
    expect(t3.reputation).toBe(11); // 2 + lab 2 + 0 clean - 3 sloppy
  });
});

describe('advanceMonth: contract lifecycle & market', () => {
  it('completes a served contract and pays reputation', () => {
    const g = baseGame({ activeContracts: [active(trainContract(), ['c1'], 2)] });
    const s = advanceMonth(g, NO_FAIL);
    expect(s.activeContracts.length).toBe(0);
    expect(s.reputation).toBe(15); // 2 + lab 2 + 1 clean
    expect(s.log.some((l) => l.level === 'good' && l.text.includes('contract complete'))).toBe(true);
  });

  it('generates fresh offers and drops expired ones', () => {
    const stale = trainContract({ id: 'stale', deadlineMonth: 10 });
    const g = baseGame({ clusters: [], activeContracts: [], availableContracts: [stale] });
    g.halls[0].racks = [];
    const s = advanceMonth(g, NO_FAIL);
    expect(s.availableContracts.some((c) => c.id === 'stale')).toBe(false);
    expect(s.availableContracts.length).toBeGreaterThanOrEqual(1);
    expect(s.availableContracts.length).toBeLessThanOrEqual(3);
    expect(s.log.some((l) => l.text.includes('new contract offer'))).toBe(true);
  });
});

describe('advanceMonth: finances', () => {
  it('charges monthly loan interest', () => {
    const g = baseGame({ debt: 1_000_000, clusters: [] });
    g.halls[0].racks = [];
    const s = advanceMonth(g, NO_FAIL);
    const interest = (1_000_000 * 0.07) / 12;
    expect(s.cash).toBeCloseTo(50_000_000 - interest, 1);
    expect(s.history[0].opex).toBeCloseTo(interest, 1);
    expect(s.debt).toBe(1_000_000);
  });

  it('flags bankruptcy when cash crosses zero', () => {
    const g = baseGame({ cash: 1000, staff: 20, clusters: [], activeContracts: [] });
    g.halls[0].racks = [];
    const s = advanceMonth(g, NO_FAIL);
    expect(s.cash).toBeLessThan(0);
    expect(s.log.some((l) => l.level === 'bad' && l.text.includes('Bankruptcy'))).toBe(true);
    expect(s.history[0].cash).toBeLessThan(0);
  });
});

describe('advanceMonth: spare parts', () => {
  const failing = { accelFailureProbPerMonth: 1, commissionFailProb: 0 };
  it('a spare shortens repair to 1 month and is consumed; no spare means a 4-month RMA', () => {
    const g = baseGame({ activeContracts: [] });
    const online = (x: GameState) => { x.halls[0].racks.forEach((r) => { r.status = 'online'; }); return x; };
    const noSpare = advanceMonth(online(JSON.parse(JSON.stringify(g))), failing);
    const r0 = noSpare.halls[0].racks[0];
    expect(r0.status).toBe('failed');
    expect(r0.failedPart).toBeTruthy();
    expect(r0.readyMonth).toBe(noSpare.month + 4);
    const g2 = online(JSON.parse(JSON.stringify(g)));
    g2.inventory[r0.failedPart!] = 50;
    const spare = advanceMonth(g2, failing);
    const r1 = spare.halls[0].racks[0];
    expect(r1.status).toBe('failed');
    expect(r1.readyMonth).toBe(spare.month + 1);
    expect(spare.inventory[r0.failedPart!]).toBeLessThan(50);
  });
});
