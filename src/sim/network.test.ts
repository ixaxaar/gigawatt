import { describe, it, expect } from 'vitest';
import { evaluateCluster, cableClass, suggestCable, type ClusterContext } from './network';
import { getItem, ITEMS_BY_KIND } from '../data';
import type { CableOrOptic, Cluster, FabricDesign, RackDesign, TrayDesign } from '../types';

const ctxOf = (racks: Record<string, RackDesign>, trays: Record<string, TrayDesign>): ClusterContext => ({
  getRack: (id) => racks[id],
  getTray: (id) => trays[id],
  getItem,
});

const hgxTray = (id: string): TrayDesign => ({
  id,
  name: 'HGX H100 node',
  chassisId: 'nv-hgx-h100-8gy',
  parts: [
    { slot: 'accelerator', itemId: 'nv-h100-sxm', count: 8 },
    { slot: 'nic', itemId: 'nv-connectx7', count: 8 },
  ],
});

const b200Tray = (id: string): TrayDesign => ({
  id,
  name: 'HGX B200 node',
  chassisId: 'nv-hgx-b200-8gy',
  parts: [
    { slot: 'accelerator', itemId: 'nv-b200-sxm', count: 8 },
    { slot: 'nic', itemId: 'nv-connectx8', count: 8 },
  ],
});

const rackWith = (id: string, trayId: string, trayCount: number): RackDesign => ({
  id,
  name: id,
  rackId: 'gen-rack-19-42u',
  items: [{ type: 'tray', trayId, count: trayCount }],
  coolingInterface: 'air',
});

const fabric = (o: Partial<FabricDesign> = {}): FabricDesign => ({
  id: 'f',
  name: 'F',
  scaleOutTech: 'ib-ndr',
  topology: 'fat-tree-rail-optimized',
  oversubscription: 1,
  leafSwitchId: 'nv-qm9700',
  spineSwitchId: 'nv-qm9700',
  nodeToLeafCableId: 'gen-aoc-400-30m',
  leafToSpineCableId: 'gen-dr4-400-500m',
  ...o,
});

const buildCluster = (
  rackCount: number,
  fab: FabricDesign,
  tray: (id: string) => TrayDesign = hgxTray,
  traysPerRack = 4,
): { cluster: Cluster; ctx: ClusterContext } => {
  const racks: Record<string, RackDesign> = {};
  for (let i = 0; i < rackCount; i++) racks[`r${i}`] = rackWith(`r${i}`, `t${i}`, traysPerRack);
  const trays: Record<string, TrayDesign> = {};
  for (let i = 0; i < rackCount; i++) trays[`t${i}`] = tray(`t${i}`);
  return { cluster: { id: 'c1', name: 'C1', rackIds: Object.keys(racks), fabric: fab }, ctx: ctxOf(racks, trays) };
};

describe('evaluateCluster: 2-tier rail-optimized fat-tree', () => {
  const { cluster, ctx } = buildCluster(16, fabric());

  it('counts accelerators, memory, and peak FLOPS', () => {
    const s = evaluateCluster(cluster, ctx);
    expect(s.accelerators).toBe(512);
    expect(s.acceleratorId).toBe('nv-h100-sxm');
    expect(s.scaleUpDomain).toBe(8);
    expect(s.totalMemGB).toBe(40960);
    expect(s.peakPFLOPSBf16).toBeCloseTo(506.368, 2);
    expect(s.peakPFLOPSFp8).toBeCloseTo(1013.248, 2);
  });

  it('plans 32 leaves + 32 spines of Quantum-2 for 64x16-link nodes', () => {
    const s = evaluateCluster(cluster, ctx);
    expect(s.switchCounts['nv-qm9700']).toBe(64);
    expect(s.cableCounts['gen-aoc-400-30m']).toBe(1024);
    expect(s.cableCounts['gen-dr4-400-500m']).toBe(1024);
  });

  it('bisection is half of host bandwidth at 1:1 oversubscription', () => {
    const s = evaluateCluster(cluster, ctx);
    expect(s.bisectionTbps).toBeCloseTo(204.8, 1);
    expect(s.effScaleOutGBs).toBeCloseTo(100, 1);
  });

  it('power includes GPUs, NICs, switches and optics', () => {
    const s = evaluateCluster(cluster, ctx);
    expect(s.powerKW).toBeCloseTo(412.16, 0);
  });

  it('is error-free for a correct build', () => {
    const s = evaluateCluster(cluster, ctx);
    expect(s.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
});

describe('evaluateCluster: oversubscription', () => {
  it('8:1 oversubscription shrinks bisection and effective scale-out', () => {
    const { cluster, ctx } = buildCluster(16, fabric({ oversubscription: 8 }));
    const s = evaluateCluster(cluster, ctx);
    expect(s.bisectionTbps).toBeCloseTo(26.6, 1);
    expect(s.effScaleOutGBs).toBeCloseTo(12.5, 1);
    expect(s.switchCounts['nv-qm9700']).toBe(26);
  });

  it('flags oversubscription above 8:1', () => {
    const { cluster, ctx } = buildCluster(16, fabric({ oversubscription: 16 }));
    const s = evaluateCluster(cluster, ctx);
    expect(s.issues.some((i) => i.code === 'oversub-high')).toBe(true);
  });
});

describe('evaluateCluster: single-tier (no spine)', () => {
  it('sizes a leaf-only fabric', () => {
    const { cluster, ctx } = buildCluster(2, fabric({ spineSwitchId: undefined, leafToSpineCableId: undefined }));
    const s = evaluateCluster(cluster, ctx);
    expect(s.switchCounts['nv-qm9700']).toBe(2);
    expect(s.bisectionTbps).toBeCloseTo(25.6, 1);
    expect(s.effScaleOutGBs).toBeCloseTo(100, 1);
    expect(s.issues.some((i) => i.code === 'single-tier-fabric')).toBe(true);
  });
});

describe('evaluateCluster: 3-tier fat-tree', () => {
  it('adds pods and a super-spine tier for 512 B200 nodes', () => {
    const { cluster, ctx } = buildCluster(
      128,
      fabric({
        scaleOutTech: 'eth-800',
        leafSwitchId: 'nv-sn5600',
        spineSwitchId: 'nv-qmx8000',
        nodeToLeafCableId: 'gen-acc-800-3m',
        leafToSpineCableId: 'gen-dr8-800-500m',
      }),
      b200Tray,
    );
    const s = evaluateCluster(cluster, ctx);
    expect(s.accelerators).toBe(4096);
    expect(s.switchCounts['nv-sn5600']).toBe(256);
    expect(s.switchCounts['nv-qmx8000']).toBe(130);
    expect(s.cableCounts['gen-acc-800-3m']).toBe(8192);
    expect(s.cableCounts['gen-dr8-800-500m']).toBe(8192 + 288);
    expect(s.bisectionTbps).toBeCloseTo(115.2, 1);
    expect(s.effScaleOutGBs).toBeCloseTo(200, 1);
    expect(s.powerKW).toBeGreaterThan(4000);
  });
});

describe('evaluateCluster: issues', () => {
  it('errors on mixed accelerator models', () => {
    const a100Tray: TrayDesign = {
      id: 'ta',
      name: 'A100 node',
      chassisId: 'nv-hgx-a100-8gy',
      parts: [
        { slot: 'accelerator', itemId: 'nv-a100-80-sxm', count: 8 },
        { slot: 'nic', itemId: 'nv-connectx7', count: 8 },
      ],
    };
    const mixedRack: RackDesign = {
      id: 'r0',
      name: 'r0',
      rackId: 'gen-rack-19-42u',
      items: [
        { type: 'tray', trayId: 'ta', count: 1 },
        { type: 'tray', trayId: 't0', count: 3 },
      ],
      coolingInterface: 'air',
    };
    const s = evaluateCluster(
      { id: 'c', name: 'c', rackIds: ['r0'], fabric: fabric() },
      ctxOf({ r0: mixedRack }, { ta: a100Tray, t0: hgxTray('t0') }),
    );
    expect(s.issues.some((i) => i.code === 'mixed-accelerators' && i.severity === 'error')).toBe(true);
    expect(s.acceleratorId).toBe('nv-h100-sxm');
  });

  it('errors when nodes have no scale-out connectivity', () => {
    const bareTray: TrayDesign = {
      id: 'tb',
      name: 'no NIC',
      chassisId: 'nv-hgx-h100-8gy',
      parts: [{ slot: 'accelerator', itemId: 'nv-h100-sxm', count: 8 }],
    };
    const racks = { r0: rackWith('r0', 'tb', 4) };
    const s = evaluateCluster({ id: 'c', name: 'c', rackIds: ['r0'], fabric: fabric() }, ctxOf(racks, { tb: bareTray }));
    expect(s.issues.some((i) => i.code === 'no-scale-out' && i.severity === 'error')).toBe(true);
  });

  it('errors when a DAC is used beyond its reach', () => {
    const { cluster, ctx } = buildCluster(16, fabric({ nodeToLeafCableId: 'gen-dac-400-2m' }));
    const s = evaluateCluster(cluster, ctx);
    expect(s.issues.some((i) => i.code === 'cable-too-short' && i.severity === 'error')).toBe(true);
  });

  it('errors when the cable does not speak the fabric technology', () => {
    const { cluster, ctx } = buildCluster(16, fabric({ nodeToLeafCableId: 'gen-dac-100-3m' }));
    const s = evaluateCluster(cluster, ctx);
    expect(s.issues.some((i) => i.code === 'cable-tech-mismatch' && i.severity === 'error')).toBe(true);
    expect(s.issues.some((i) => i.code === 'link-rate-capped')).toBe(true);
  });

  it('validates NVL72-style rack-scale domains', () => {
    const nvlTray: TrayDesign = {
      id: 'tn',
      name: 'GB200 tray',
      chassisId: 'nv-gb200-nvl72-ct',
      parts: [
        { slot: 'accelerator', itemId: 'nv-gh200', count: 2 },
        { slot: 'nic', itemId: 'nv-connectx8', count: 4 },
      ],
    };
    const rack: RackDesign = {
      id: 'rn',
      name: 'NVL72',
      rackId: 'fox-nvl72-mgx',
      items: [
        { type: 'tray', trayId: 'tn', count: 18 },
        { type: 'switch', switchId: 'nv-nvlink-switch-tray5', count: 9 },
      ],
      coolingInterface: 'dlc',
    };
    const s = evaluateCluster(
      { id: 'c', name: 'c', rackIds: ['rn'], fabric: fabric() },
      ctxOf({ rn: rack }, { tn: nvlTray }),
    );
    const codes = s.issues.filter((i) => i.severity === 'error').map((i) => i.code);
    expect(codes).toContain('domain-mismatch');
    expect(codes).toContain('domain-too-big');
    expect(codes).toContain('domain-spans-racks');
    expect(codes).toContain('no-full-domain');
    expect(s.switchCounts['nv-nvlink-switch-tray5']).toBe(9);
    expect(s.effScaleOutGBs).toBe(0);
  });

  it('approximates dragonfly and torus topologies', () => {
    const { cluster, ctx } = buildCluster(16, fabric({ topology: 'dragonfly', spineSwitchId: undefined, leafToSpineCableId: undefined }));
    const s = evaluateCluster(cluster, ctx);
    expect(s.issues.some((i) => i.code === 'topology-approx')).toBe(true);
    expect(s.bisectionTbps).toBeCloseTo(49.15, 1);
  });
});

describe('cable helpers', () => {
  const cable = (id: string) => getItem(id) as CableOrOptic;

  it('classifies DAC/AOC/optics', () => {
    expect(cableClass(cable('gen-dac-400-2m'))).toBe('dac');
    expect(cableClass(cable('gen-acc-800-3m'))).toBe('dac');
    expect(cableClass(cable('gen-aoc-400-30m'))).toBe('aoc');
    expect(cableClass(cable('gen-dr8-800-500m'))).toBe('optic');
  });

  it('suggests AOC for 3 m and optics for 60 m runs', () => {
    const ids = ITEMS_BY_KIND('cable').map((c) => c.id);
    // Assert the *class and reach* of the pick, not a specific SKU: the catalogue keeps growing.
    const pick = (tech: any, gbps: number, m: number) => { const c = suggestCable(getItem, ids, tech, gbps, m); return c ? { cls: cableClass(c as any), reach: (c as any).maxReachM, gbps: (c as any).gbps } : undefined; };
    expect(pick('ib-ndr', 400, 3)).toMatchObject({ cls: 'aoc', gbps: 400 });
    expect(pick('ib-ndr', 400, 60)?.cls).toBe('optic');
    expect(pick('ib-ndr', 400, 60)!.reach).toBeGreaterThanOrEqual(60);
    expect(pick('eth-400', 400, 800)!.reach).toBeGreaterThanOrEqual(800);
    expect(suggestCable(getItem, ids, 'ib-ndr', 400, 800)).toBeUndefined();
  });
});
