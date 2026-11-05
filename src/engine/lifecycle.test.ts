import { describe, it, expect } from 'vitest';
import { getItem } from '../data';
import { useGame, rackBom } from '../store';
import { assetValue, rackResidualUSD } from '../sim/lifecycle';
import { selectNetWorth } from './selectors';
import { lifecycleQueries } from './queries/lifecycle';

const fresh = () => { useGame.getState().newGame(3); useGame.setState((s) => ({ game: { ...s.game, cash: 5e9, month: 36 } })); };
const st = () => useGame.getState();
const g = () => useGame.getState().game;
const price = (id: string) => getItem(id)?.priceUSD ?? 0;

const placeH100Rack = () => {
  expect(st().saveTray({
    id: 'tray-h100', name: 'H100 8-way', chassisId: 'nv-hgx-h100-8gy',
    parts: [
      { slot: 'accelerator' as const, itemId: 'nv-h100-sxm', count: 8 },
      { slot: 'cpu' as const, itemId: 'amd-epyc-genoa', count: 2 },
      { slot: 'dimm' as const, itemId: 'sam-ddr5-5600-64', count: 16 },
      { slot: 'nic' as const, itemId: 'nv-connectx7', count: 4 },
      { slot: 'nvme' as const, itemId: 'sam-pm9a3-3t84', count: 2 },
      { slot: 'psu' as const, itemId: 'vt-geist-5kw', count: 4 },
    ],
  }).ok).toBe(true);
  expect(st().saveRack({
    id: 'rack-a', name: 'Rack A', rackId: 'gen-rack-19-48u-hd',
    items: [{ type: 'tray' as const, trayId: 'tray-h100', count: 2 }], coolingInterface: 'air' as const,
  }).ok).toBe(true);
  useGame.setState((s) => ({ game: { ...s.game, inventory: { ...rackBom(s.game, 'rack-a')! } } }));
  return st().placeRack('hall-1', 'rack-a');
};

describe('decommissionRack', () => {
  it('refuses clustered racks, then pays 0.85 × residual and cleans up', () => {
    fresh();
    expect(placeH100Rack().ok).toBe(true);
    const rack0 = g().halls[0].racks[0];
    const fabric = {
      id: 'f', name: 'F', scaleOutTech: 'ib-ndr' as const, topology: 'single-domain' as const,
      oversubscription: 1, leafSwitchId: 'nv-qm9700', nodeToLeafCableId: 'gen-aoc-400-30m',
    };
    expect(st().createCluster('C1', [rack0.id], fabric).ok).toBe(true);
    const refused = st().decommissionRack(rack0.id);
    expect(refused.ok).toBe(false);
    expect(refused.message).toContain('Disband');
    st().disbandCluster(g().clusters[0].id);
    st().setSpotRack(rack0.id, true);
    const cashBefore = g().cash;
    const sale = Math.round(rackResidualUSD(g(), rack0) * 0.85);
    const done = st().decommissionRack(rack0.id);
    expect(done.ok).toBe(true);
    expect(done.message).toContain('$');
    expect(g().cash).toBe(cashBefore + sale);
    expect(g().halls[0].racks).toHaveLength(0);
    expect(g().spotRacks ?? []).not.toContain(rack0.id);
    expect(g().stats?.decommissioned).toBe(1);
  });

  it('refuses unknown racks and racks still on order', () => {
    fresh();
    expect(placeH100Rack().ok).toBe(true);
    expect(st().decommissionRack('RK-9999').ok).toBe(false);
    useGame.setState((s) => ({ game: { ...s.game, halls: s.game.halls.map((h) => ({ ...h, racks: h.racks.map((r) => ({ ...r, status: 'ordered' as const })) })) } }));
    expect(st().decommissionRack(g().halls[0].racks[0].id).ok).toBe(false);
  });
});

describe('selectNetWorth', () => {
  it('is cash − debt + assetValue (stock 0.8, plant 0.6)', () => {
    fresh();
    useGame.setState((s) => ({ game: { ...s.game, cash: 123_000_000, debt: 5_000_000, inventory: { 'vt-crah-100': 2 } } }));
    const plant = price('et-padmount-2500') + price('se-galaxy-vs-500') + 6 * price('vt-crah-100');
    expect(assetValue(g())).toBeCloseTo(0.8 * 2 * price('vt-crah-100') + 0.6 * plant, 6);
    expect(selectNetWorth(g())).toBeCloseTo(g().cash - g().debt + assetValue(g()), 6);
  });
});

describe('sellInventory', () => {
  it('pays 60% of catalog price, deletes emptied keys and validates input', () => {
    fresh();
    useGame.setState((s) => ({ game: { ...s.game, inventory: { 'nv-h100-sxm': 8, 'sam-pm9a3-3t84': 2 } } }));
    const before = g().cash;
    expect(st().sellInventory('nope', 1).ok).toBe(false);
    expect(st().sellInventory('nv-h100-sxm', 0).ok).toBe(false);
    expect(st().sellInventory('nv-h100-sxm', 9).ok).toBe(false);
    expect(st().sellInventory('nv-h100-sxm', 3).ok).toBe(true);
    expect(g().cash).toBe(before + Math.round(0.6 * price('nv-h100-sxm') * 3));
    expect(g().inventory['nv-h100-sxm']).toBe(5);
    expect(st().sellInventory('sam-pm9a3-3t84', 2).ok).toBe(true);
    expect('sam-pm9a3-3t84' in g().inventory).toBe(false);
  });
});

describe('lifecycle query', () => {
  it('lists each rack with advice and totals', () => {
    fresh();
    expect(placeH100Rack().ok).toBe(true);
    useGame.setState((s) => ({ game: { ...s.game, month: 96 } })); // 2028: 5 years old, 3 gens behind
    const { rows, totals } = lifecycleQueries.lifecycle() as { rows: any[]; totals: any };
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.accelerator).toContain('H100');
    expect(row.residualPct).toBe(19);
    expect(row.advice).toBe('replace');
    expect(row.saleUSD).toBe(Math.round(rackResidualUSD(g(), g().halls[0].racks[0]) * 0.85));
    expect(totals.racks).toBe(1);
    expect(totals.saleUSD).toBe(row.saleUSD);
    expect(totals.assetValue).toBeCloseTo(assetValue(g()), 6);
  });
});
