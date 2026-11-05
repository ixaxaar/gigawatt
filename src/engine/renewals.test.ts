import { describe, it, expect } from 'vitest';
import { useGame } from '../store';
import { TEMPLATES } from '../data/templates';
import { rackIdOf } from '../plan';
import type { Contract, GameState, InferenceContract, TrainingContract } from '../types';

const fresh = () => {
  useGame.getState().newGame(3);
  useGame.setState((s) => ({ game: { ...s.game, cash: 5e9, reputation: 50, uplinks: { 'transit-10g-a': 50 } } }));
};
const g = () => useGame.getState().game;
const st = () => useGame.getState();
const renewalOf = (c: Contract) => (c as Contract & { renewalOf?: string }).renewalOf;

/** One online rack (template design) in a real cluster, so a contract actually serves and completes. */
function servingSetup(): string {
  st().adoptTemplate(TEMPLATES[0].id);
  const rack = { id: 'rk-test', designId: rackIdOf(TEMPLATES[0]), slot: 0, status: 'online' as const, readyMonth: 0, installedMonth: 0 };
  useGame.setState((s) => ({ game: { ...s.game, halls: s.game.halls.map((h, i) => (i === 0 ? { ...h, racks: [...h.racks, rack] } : h)) } }));
  const fabric = { id: 'fabric-test', name: 'Test fabric', scaleOutTech: 'ib-hdr' as const, topology: 'fat-tree' as const, oversubscription: 1, leafSwitchId: 'nv-qm8700', nodeToLeafCableId: 'fs-aoc-100g-10m' };
  const res = st().createCluster('Renewal Test Cluster', [rack.id], fabric);
  expect(res.ok).toBe(true);
  return g().clusters[0].id;
}

/** Sign nothing: inject a 1-month contract on the serving cluster and tick once. */
function completeInOneMonth(k: Contract, clusterId: string, slaMisses = 0): void {
  const month = g().month;
  useGame.setState((s) => ({
    game: {
      ...s.game,
      availableContracts: s.game.availableContracts.filter((c) => c.id !== k.id),
      activeContracts: [...s.game.activeContracts, { contract: { ...k, durationMonths: 1 }, clusterIds: [clusterId], startMonth: month, monthsServed: 0, slaMisses, deployBy: month + 5 }],
    },
  }));
  st().nextMonth();
}

/** The seed-3 opening board is all-inference; tick until a training offer shows up. */
function findTraining(): TrainingContract {
  for (let i = 0; i < 8; i++) {
    const k = g().availableContracts.find((c) => c.kind === 'training');
    if (k) return k as TrainingContract;
    st().nextMonth();
  }
  throw new Error('no training contract appeared on the board');
}

describe('contract renewals', () => {
  it('a completed clean training contract queues a 1.5x renewal from the same customer', () => {
    fresh();
    const base = findTraining();
    expect(base).toBeTruthy();
    const clusterId = servingSetup();
    completeInOneMonth(base, clusterId);
    const renewed = g().availableContracts.find((c) => renewalOf(c) === base.customer) as TrainingContract;
    expect(renewed).toBeTruthy();
    expect(renewed.id).toBe(`${base.id}-r${g().month}`);
    expect(renewed.customer).toBe(base.customer);
    expect(renewed.model).toEqual(base.model);
    expect(renewed.minAccelerators).toBe(Math.round(base.minAccelerators * 1.5));
    expect(renewed.pricePerAccelHour).toBe(Math.round(base.pricePerAccelHour * 1.05 * 100) / 100);
    expect(renewed.durationMonths).toBe(1); // same as the completed (test-shortened) run
    expect(renewed.deadlineMonth).toBe(g().month + 6);
    expect(g().log.some((l) => l.text.includes('wants to renew'))).toBe(true);
  });

  it('inference renewals scale tokensPerSec ×1.5 and price ×1.05', () => {
    fresh();
    const base = g().availableContracts.find((c) => c.kind === 'inference') as InferenceContract;
    expect(base).toBeTruthy();
    const clusterId = servingSetup();
    completeInOneMonth(base, clusterId);
    const renewed = g().availableContracts.find((c) => renewalOf(c) === base.customer) as InferenceContract;
    expect(renewed).toBeTruthy();
    expect(renewed.kind).toBe('inference');
    expect(renewed.tokensPerSec).toBe(Math.round(base.tokensPerSec * 1.5));
    expect(renewed.pricePerMTok).toBe(Math.round(base.pricePerMTok * 1.05 * 1000) / 1000);
  });

  it('contracts with repeated SLA misses do not renew', () => {
    fresh();
    const base = findTraining();
    const clusterId = servingSetup();
    completeInOneMonth(base, clusterId, 3);
    expect(g().availableContracts.some((c) => renewalOf(c) === base.customer)).toBe(false);
  });

  it('renewals survive the board cap', () => {
    fresh();
    const base = findTraining();
    const clusterId = servingSetup();
    const filler: GameState['availableContracts'] = Array.from({ length: 10 }, (_, i) => ({ ...base, id: `fill-${i}`, deadlineMonth: g().month + 12 }));
    useGame.setState((s) => ({ game: { ...s.game, availableContracts: filler } }));
    completeInOneMonth(base, clusterId);
    const board = g().availableContracts;
    expect(board.length).toBeLessThanOrEqual(10);
    expect(board.some((c) => renewalOf(c) === base.customer)).toBe(true);
  });
});
