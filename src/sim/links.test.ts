import { describe, it, expect } from 'vitest';
import { linkLoss, linkRisk, LINK_RATE, applyLinkFaults, linkFaults } from './systems/links';
import type { Cluster, ClusterStats } from '../types';

const stats = (cableCounts: Record<string, number>, eff = 50): ClusterStats => ({ accelerators: 64, acceleratorId: 'nv-h100-sxm', scaleUpDomain: 8, totalMemGB: 1, peakPFLOPSFp8: 1, peakPFLOPSBf16: 1, powerKW: 1, bisectionTbps: 1, effScaleOutGBs: eff, switchCounts: {}, cableCounts, issues: [] });

describe('link faults', () => {
  it('optics fail far more often than DACs', () => { expect(LINK_RATE.optic).toBeGreaterThan(LINK_RATE.dac * 10); });
  it('loss grows with links down and is capped', () => {
    expect(linkLoss(0, 100)).toBe(0);
    expect(linkLoss(1, 1000)).toBeGreaterThan(0.01);
    expect(linkLoss(5, 1000)).toBeGreaterThan(linkLoss(1, 1000));
    expect(linkLoss(500, 1000)).toBe(0.5);
  });
  it('risk is zero for an empty fabric and positive otherwise', () => {
    expect(linkRisk(stats({})).lambda).toBe(0);
    const r = linkRisk(stats({ 'gen-dac-400-2m': 100 }));
    expect(r.total).toBe(100);
  });
  it('down links cut scale-out bandwidth and add an issue', () => {
    const cl = { id: 'c', name: 'C', rackIds: [], linkFaults: { down: 3, total: 300, cableId: 'x', fixMonth: 9, fromSpares: false } } as unknown as Cluster;
    const s = applyLinkFaults(cl, stats({ x: 300 }, 100));
    expect(s.effScaleOutGBs).toBeLessThan(100);
    expect(s.linkLoss).toBeGreaterThan(0);
    expect(s.issues.some((i) => i.code === 'links-down')).toBe(true);
  });
  it('healthy clusters are untouched', () => {
    const cl = { id: 'c', name: 'C', rackIds: [] } as unknown as Cluster;
    const st = stats({}, 80);
    expect(applyLinkFaults(cl, st)).toBe(st);
  });
  it('is a system with a stable id', () => { expect(linkFaults.id).toBe('link-faults'); });
});

import { netHealth } from '../engine/needs';
describe('netHealth', () => {
  it('reports links down and bandwidth share', () => {
    const g: any = { clusters: [{ id: 'c', name: 'Alpha', rackIds: [], fabric: { scaleOutTech: 'roce', topology: 'fat-tree', oversubscription: 1 }, stats: { ...stats({ x: 100 }, 40), linkLoss: 0.05 }, linkFaults: { down: 2, total: 100, cableId: 'x', fixMonth: 6, fromSpares: false } }], activeContracts: [], spareStock: {}, uplinks: undefined };
    const h = netHealth(g);
    expect(h.level).toBe(1);
    expect(h.clusters[0].down).toBe(2);
    expect(h.bandwidthPct).toBeCloseTo(0.95, 2);
    expect(h.summary).toContain('2 links down');
  });
  it('is quiet with no clusters', () => {
    const h = netHealth({ clusters: [], activeContracts: [], uplinks: undefined } as any);
    expect(h.level).toBe(0);
  });
});
