import { LESSONS } from './lessons';
import { describe, it, expect } from 'vitest';
import { useGame } from '../store';
import { disasterPool, scriptedEvents } from './eraEvents';
import { rollEvents } from './events';
import type { GameState } from '../types';

const fresh = (): GameState => { useGame.getState().newGame(0); return useGame.getState().game; };
const clone = <T,>(g: T): T => JSON.parse(JSON.stringify(g));
const mkLog = () => { const entries: { level: string; text: string }[] = []; return { entries, log: (level: 'info' | 'good' | 'bad', text: string) => { entries.push({ level, text }); } }; };
const zeroRng = () => 0;
const onlineRack = (id: string, slot = 0) => ({ id, designId: 'd', slot, status: 'online' as const, readyMonth: 11 });

describe('scriptedEvents', () => {
  it('month 38 delays only in-transit accelerator orders by 2 months', () => {
    const g = fresh();
    g.month = 38;
    g.orders = [
      { id: 'o1', itemId: 'nv-v100-sxm2', qty: 8, unitPrice: 1, arriveMonth: 40 },
      { id: 'o2', itemId: 'gen-ats-1600', qty: 1, unitPrice: 1, arriveMonth: 40 },
      { id: 'o3', itemId: 'nv-v100-sxm2', qty: 8, unitPrice: 1, arriveMonth: 37 },
    ];
    const { entries, log } = mkLog();
    scriptedEvents(g, log);
    expect(g.orders.map((o) => o.arriveMonth)).toEqual([42, 40, 37]);
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('bad');
  });

  it('is silent in unscripted months', () => {
    const g = fresh();
    g.month = 37;
    g.orders = [{ id: 'o1', itemId: 'nv-v100-sxm2', qty: 8, unitPrice: 1, arriveMonth: 40 }];
    const { entries, log } = mkLog();
    scriptedEvents(g, log);
    expect(g.orders[0].arriveMonth).toBe(40);
    expect(entries).toHaveLength(0);
  });

  it('months 52 and 74 are log-only beats that change no game state', () => {
    const g = fresh();
    const { entries, log } = mkLog();
    for (const month of [52, 74]) {
      const before = JSON.stringify({ ...g, month: 0 });
      g.month = month;
      scriptedEvents(g, log);
      expect(JSON.stringify({ ...g, month: 0 })).toBe(before);
      expect(entries.at(-1)!.level).toBe('info');
    }
    expect(entries).toHaveLength(2);
  });

  it('fires from rollEvents even when the random draw suppresses events', () => {
    const g = fresh();
    g.month = 38;
    g.orders = [{ id: 'o1', itemId: 'nv-v100-sxm2', qty: 8, unitPrice: 1, arriveMonth: 40 }];
    rollEvents(g, () => 0.99, mkLog().log); // 0.99 > 0.28: random pool skipped
    expect(g.orders[0].arriveMonth).toBe(42);
  });
});

describe('disasterPool preconditions', () => {
  it('adds an entry only when its precondition holds', () => {
    const { log } = mkLog();
    const base = fresh();
    expect(disasterPool(base, zeroRng, log)).toHaveLength(0);            // nothing deployed, nothing on order, nothing assigned
    expect(disasterPool({ ...clone(base), orders: [{ id: 'o', itemId: 'x', qty: 1, unitPrice: 1, arriveMonth: 40 }] }, zeroRng, log)).toHaveLength(1);
    const withRack = clone(base);
    withRack.halls[0].racks.push(onlineRack('RK-1'));
    expect(disasterPool(withRack, zeroRng, log)).toHaveLength(2);        // fire + cooling fault
    const withContract = clone(base);
    withContract.activeContracts.push({ contract: base.availableContracts[0], clusterIds: ['c1'], startMonth: 12, monthsServed: 1, slaMisses: 0 });
    expect(disasterPool(withContract, zeroRng, log)).toHaveLength(1);    // customer default
    withContract.halls[0].racks.push(onlineRack('RK-1'));
    withContract.orders.push({ id: 'o', itemId: 'x', qty: 1, unitPrice: 1, arriveMonth: 40 });
    expect(disasterPool(withContract, zeroRng, log)).toHaveLength(4);
  });

  it('unassigned contracts cannot default', () => {
    const g = fresh();
    g.activeContracts.push({ contract: g.availableContracts[0], clusterIds: [], startMonth: 12, monthsServed: 0, slaMisses: 0 });
    expect(disasterPool(g, zeroRng, mkLog().log)).toHaveLength(0);
  });
});

describe('disasters firing', () => {
  it('fire fails an online rack for 8 months unless suppressed, then only 2 with no reputation hit', () => {
    const { log } = mkLog();
    const mk = (contained: boolean) => {
      const g = fresh();
      g.month = 30;
      g.halls[0].racks.push(onlineRack('RK-1'));
      if (contained) g.halls[0].coolingEquip = { ...g.halls[0].coolingEquip, 'fm-suppression': 1 };
      return g;
    };
    const open = mk(false);
    disasterPool(open, zeroRng, log)[0]();
    expect(open.halls[0].racks[0]).toMatchObject({ status: 'failed', readyMonth: 38, failedPart: undefined });
    expect(open.halls[0].racks[0].clusterId).toBeUndefined();            // cluster membership survives the fire
    expect(open.reputation).toBe(7);
    const safe = mk(true);
    disasterPool(safe, zeroRng, log)[0]();
    expect(safe.halls[0].racks[0]).toMatchObject({ status: 'failed', readyMonth: 32 });
    expect(safe.reputation).toBe(10);
  });

  it('customer default removes an assigned contract and claws back a month of estimated revenue', () => {
    const g = fresh();
    g.month = 30;
    const c = clone(g.availableContracts[0]);
    if (c.kind === 'training') { c.pricePerAccelHour = 2; c.minAccelerators = 100; }
    else { c.pricePerMTok = 1; c.tokensPerSec = 1_000_000; }
    const monthly = c.kind === 'training' ? 2 * 100 * 730 : (1 * 1_000_000 * 730 * 3600) / 1e6;
    g.activeContracts.push({ contract: c, clusterIds: ['c1'], startMonth: 12, monthsServed: 1, slaMisses: 0 });
    const cashBefore = g.cash;
    const { entries, log } = mkLog();
    disasterPool(g, zeroRng, log)[0]();
    expect(g.activeContracts).toHaveLength(0);
    expect(g.cash).toBe(cashBefore - Math.round(monthly));
    expect(g.reputation).toBe(9);
    expect(entries[0].text).toMatch(/defaults/);
    expect(LESSONS.find((l) => l.id === 'default')!.lesson).toMatch(/deposit|take-or-pay/i);
  });

  it('supply-chain shock slips every in-transit order by 2 months', () => {
    const g = fresh();
    g.month = 30;
    g.orders = [
      { id: 'o1', itemId: 'nv-v100-sxm2', qty: 8, unitPrice: 1, arriveMonth: 31 },
      { id: 'o2', itemId: 'gen-ats-1600', qty: 1, unitPrice: 1, arriveMonth: 45 },
    ];
    disasterPool(g, zeroRng, mkLog().log)[0]();
    expect(g.orders.map((o) => o.arriveMonth)).toEqual([33, 47]);
  });

  it('cooling-plant fault misses SLAs on serving contracts and bills per online rack', () => {
    const g = fresh();
    g.month = 30;
    g.cash = 10_000_000;
    g.halls[0].racks.push(onlineRack('RK-1', 0), onlineRack('RK-2', 1));
    g.activeContracts.push(
      { contract: clone(g.availableContracts[0]), clusterIds: ['c1'], startMonth: 12, monthsServed: 1, slaMisses: 2 },
      { contract: clone(g.availableContracts[0]), clusterIds: [], startMonth: 12, monthsServed: 1, slaMisses: 0 },
    );
    const { entries, log } = mkLog();
    disasterPool(g, zeroRng, log)[2](); // pool: [fire, customer default, cooling fault]
    expect(g.activeContracts[0].slaMisses).toBe(3);
    expect(g.activeContracts[1].slaMisses).toBe(0);
    expect(g.cash).toBe(10_000_000 - 40_000 * 2);
    expect(LESSONS.find((l) => l.id === 'chiller-trip')!.lesson).toMatch(/N\+1 chillers/i);  });
});
