// ===========================================================================
// GIGAWATT — monthly tick. Pure, deterministic (all randomness flows from
// GameState.seed + month through mulberry32). advanceMonth(state) returns a
// NEW state; the input is never mutated.
// ===========================================================================
import { getItem } from '../data';
import type {
  Accelerator,
  ActiveContract,
  Cluster,
  ClusterStats,
  GameState,
  HallState,
  LogEntry,
  Order,
  PlacedRack,
} from '../types';
import { mulberry32 } from './rng';
import { generateContracts } from './market';
import { rollEvents } from './events';
import { evaluateCluster, type ClusterContext } from './network';
import { inferenceCapacity } from './perf';
import {
  contractRevenue,
  estimateCapexBasis,
  monthlyDepreciation,
  monthlyInterest,
  monthlyOpex,
} from './economy';
import { computePUE } from './validate';
import { powerMarketTick, settlePower, spotRevenue, stepSpotPrice } from './power';

export interface TickOptions {
  /** Probability one accelerator fails in a month (MTBF scaling: p_rack = 1 - e^(-n*p)). */
  accelFailureProbPerMonth?: number;
  /** Probability a rack fails burn-in when commissioning completes. */
  commissionFailProb?: number;
  /** Months a failed rack takes to repair. */
  repairMonths?: number;
  /** Cap on the available-contracts board. */
  maxAvailableContracts?: number;
}

export const DEFAULT_TICK: Required<TickOptions> = {
  accelFailureProbPerMonth: 1 / 8000,
  commissionFailProb: 0.04,
  repairMonths: 2,
  maxAvailableContracts: 10,
};

/** store.placeRack uses this: months from placement until a rack is online. */
export const RACK_READY_LEAD = 2;

const ARCH_BONUS: Record<ActiveContract['contract']['archetype'], number> = {
  startup: 1,
  lab: 2,
  enterprise: 3,
  sovereign: 5,
};

const round2 = (x: number) => Math.round(x * 100) / 100;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Rack failure probability for n accelerators. Scales with count (at 16k GPUs
 *  something is always broken) and triples when cooling capacity is undersized. */
export const rackFailureProb = (
  accelerators: number,
  coolingStressed: boolean,
  pAccelPerMonth: number = DEFAULT_TICK.accelFailureProbPerMonth,
): number => 1 - Math.exp(-Math.max(0, accelerators) * pAccelPerMonth * (coolingStressed ? 3 : 1));

const ctxOf = (state: GameState): ClusterContext => ({
  getRack: (id) => { const pid = state.halls.flatMap((h) => h.racks).find((p) => p.id === id)?.designId ?? id; return state.racks.find((r) => r.id === pid); },
  getTray: (id) => state.trays.find((t) => t.id === id),
  getItem,
});

/** Spare-parts policy: a failed rack with a spare accelerator in the warehouse is back in 1 month instead of the full repair time. */
const spareRepair = (state: GameState, designId: string, full: number): number => {
  const design = state.racks.find((r) => r.id === designId);
  const ids = new Set<string>();
  for (const item of design?.items ?? []) {
    if (item.type !== 'tray') continue;
    for (const p of state.trays.find((t) => t.id === item.trayId)?.parts ?? []) if (getItem(p.itemId)?.kind === 'accelerator') ids.add(p.itemId);
  }
  for (const id of ids) if ((state.inventory[id] ?? 0) > 0) { state.inventory[id] -= 1; return 1; }
  return full;
};

const rackAccels = (state: GameState, designId: string): number => {
  const design = state.racks.find((r) => r.id === designId);
  if (!design) return 0;
  let n = 0;
  for (const item of design.items) {
    if (item.type !== 'tray') continue;
    const tray = state.trays.find((t) => t.id === item.trayId);
    if (!tray) continue;
    for (const p of tray.parts) {
      if (getItem(p.itemId)?.kind === 'accelerator') n += p.count * item.count;
    }
  }
  return n;
};

export function advanceMonth(state: GameState, opts: TickOptions = {}): GameState {
  const o = { ...DEFAULT_TICK, ...opts };
  const s: GameState = JSON.parse(JSON.stringify(state)) as GameState;
  const rng = mulberry32((s.seed ^ Math.imul(s.month + 1, 0x9e3779b9)) >>> 0);
  s.month += 1;

  const logs: LogEntry[] = [];
  const log = (level: LogEntry['level'], text: string) => logs.push({ month: s.month, level, text });

  // ---------- 1. deliveries ----------
  const arrived: Order[] = [];
  s.orders = s.orders.filter((od) => {
    if (od.arriveMonth <= s.month) {
      arrived.push(od);
      return false;
    }
    return true;
  });
  for (const od of arrived) s.inventory[od.itemId] = (s.inventory[od.itemId] ?? 0) + od.qty;
  if (arrived.length) {
    const units = arrived.reduce((n, od) => n + od.qty, 0);
    log('good', `Delivered ${units} unit(s) from ${arrived.length} order(s) into inventory.`);
  }

  // ---------- 2. rack commissioning progress ----------
  const placed: PlacedRack[] = [];
  for (const hall of s.halls) placed.push(...hall.racks);
  for (const rack of placed) {
    if (rack.status === 'installing' && s.month >= rack.readyMonth - 1) {
      rack.status = 'commissioning';
    } else if (rack.status === 'commissioning' && s.month >= rack.readyMonth) {
      if (rng() < o.commissionFailProb) {
        rack.status = 'failed';
        rack.readyMonth = s.month + o.repairMonths;
        log('bad', `Rack ${rack.id} failed burn-in during commissioning; repair ETA month ${rack.readyMonth}.`);
      } else {
        rack.status = 'online';
        log('good', `Rack ${rack.id} commissioned and online.`);
      }
    } else if (rack.status === 'failed' && s.month >= rack.readyMonth) {
      rack.status = 'online';
      log('good', `Rack ${rack.id} repaired and back online.`);
    }
  }

  // ---------- 3. cluster stats refresh (online racks only) ----------
  const placedById = new Map(placed.map((r) => [r.id, r]));
  const ctx = ctxOf(s);
  const onlineIdsOf = (c: Cluster) => c.rackIds.filter((id) => placedById.get(id)?.status === 'online');
  const refreshStats = () => {
    for (const c of s.clusters) c.stats = evaluateCluster({ ...c, rackIds: onlineIdsOf(c) }, ctx);
  };
  refreshStats();

  // ---------- 4. random failures (MTBF scaling, thermal stress) ----------
  const onlineKW = s.clusters.reduce((n, c) => n + (c.stats?.powerKW ?? 0), 0);
  const coolingKW = s.halls.reduce((n, h) => n + h.coolingKW, 0);
  const stressed = coolingKW < onlineKW;
  let failedNow = 0;
  for (const rack of placed) {
    if (rack.status !== 'online') continue;
    const p = rackFailureProb(rackAccels(s, rack.designId), stressed, o.accelFailureProbPerMonth);
    if (p > 0 && rng() < p) {
      rack.status = 'failed';
      const fix = spareRepair(s, rack.designId, o.repairMonths);
      rack.readyMonth = s.month + fix;
      if (fix < o.repairMonths) log('info', `Swapped a spare accelerator from the warehouse into ${rack.id}: back in ${fix} month.`);
      failedNow++;
    }
  }
  if (failedNow) {
    log(
      'bad',
      `${failedNow} rack(s) went down${stressed ? ' — cooling capacity is below IT load, heat is killing hardware (3x failure rate)' : ''}. Repairs ETA month ${s.month + o.repairMonths}.`,
    );
    refreshStats();
  }

  // ---------- 5. PUE refresh ----------
  for (const hall of s.halls) hall.pue = computePUE(hall, getItem);

  // ---------- 6. serve active contracts ----------
  let revenueTotal = 0;
  const servedClusterIds = new Set<string>();
  const completed: ActiveContract[] = [];
  const defaulted: ActiveContract[] = [];
  const usedFrac: Record<string, number> = {};
  for (const ac of s.activeContracts) {
    const c = ac.contract;
    if (ac.clusterIds.length === 0) {
      // Signed but not yet deployed: no revenue, no SLA clock — until the ramp deadline passes.
      const by = ac.deployBy ?? ac.startMonth + 4;
      if (s.month > by) defaulted.push(ac);
      else if (s.month === by) log('bad', `Last month to bring capacity online for ${c.customer} (${c.model.name}) — assign a qualifying cluster now or they walk.`);
      continue;
    }
    for (const id of ac.clusterIds) servedClusterIds.add(id);
    let availability = 0;
    let accelerators = 0;
    let tokensPerSec = 0;

    if (c.kind === 'training') {
      let total = 0;
      let eff = 0;
      for (const id of ac.clusterIds) {
        const cl = s.clusters.find((x) => x.id === id);
        if (!cl) continue;
        eff += cl.stats?.accelerators ?? 0;
        total += cl.rackIds.reduce((n, rid) => {
          const pr = placedById.get(rid);
          return n + (pr ? rackAccels(s, pr.designId) : 0);
        }, 0);
      }
      availability = total > 0 ? eff / total : 0;
      accelerators = eff;
    } else {
      let capacity = 0;
      let worstTtftMs = 0;
      const parts: { id: string; capTok: number; remain: number }[] = [];
      for (const id of ac.clusterIds) {
        const cl = s.clusters.find((x) => x.id === id);
        const stats: ClusterStats | undefined = cl?.stats;
        if (!stats || stats.accelerators <= 0) continue;
        const item = getItem(stats.acceleratorId);
        if (!item || item.kind !== 'accelerator') continue;
        const accel: Accelerator = item;
        const cap = inferenceCapacity(stats, accel, c.model, {
          contextTokens: c.contextTokens,
          tpotMs: c.tpotMs,
        });
        const remain = Math.max(0, 1 - (usedFrac[id] ?? 0));
        parts.push({ id, capTok: cap.tokensPerSec, remain });
        capacity += cap.tokensPerSec * remain;
        worstTtftMs = Math.max(worstTtftMs, cap.ttftMs);
      }
      // capacity sharing: several inference contracts can split one cluster; track the consumed fraction
      const served = Math.min(capacity, c.tokensPerSec);
      for (const pt of parts) if (capacity > 0 && pt.capTok > 0) usedFrac[pt.id] = (usedFrac[pt.id] ?? 0) + (served * ((pt.capTok * pt.remain) / capacity)) / pt.capTok;
      const frac = capacity / Math.max(1, c.tokensPerSec);
      availability = Math.min(1, frac) * (worstTtftMs <= c.ttftMs ? 1 : 0.8);
      tokensPerSec = Math.min(capacity, c.tokensPerSec);
    }

    const res =
      c.kind === 'training'
        ? contractRevenue(ac, { accelerators, availability })
        : contractRevenue(ac, { tokensPerSec, availability });
    revenueTotal += res.netUSD;
    if (!res.slaMet) {
      ac.slaMisses += 1;
      log(
        'bad',
        `SLA miss for ${c.customer} (${c.model.name}): availability ${(availability * 100).toFixed(1)}% vs ${(c.slaAvailability * 100).toFixed(1)}% required. Penalties applied.`,
      );
    }
    ac.monthsServed += 1;
    if (ac.monthsServed >= c.durationMonths) completed.push(ac);
  }

  for (const ac of defaulted) {
    s.reputation = clamp(s.reputation - 8, 0, 100);
    log('bad', `${ac.contract.customer} cancelled: you never brought a qualifying cluster online for ${ac.contract.model.name} in time. Reputation −8.`);
  }
  s.activeContracts = s.activeContracts.filter((ac) => {
    if (defaulted.includes(ac)) return false;
    if (!completed.includes(ac)) return true;
    const c = ac.contract;
    const clean = ac.slaMisses === 0;
    const sloppy = ac.slaMisses > Math.ceil(c.durationMonths / 3);
    const gain = 2 + ARCH_BONUS[c.archetype] + (clean ? 1 : 0) - (sloppy ? 3 : 0);
    s.reputation = clamp(s.reputation + gain, 0, 100);
    log(
      'good',
      `${c.customer} contract complete: ${c.model.name}, ${c.durationMonths} mo served, ${ac.slaMisses} SLA miss(es). Reputation ${gain >= 0 ? '+' : ''}${gain}.`,
    );
    return false;
  });

  // ---------- 7. contract market: expiry + fresh offers ----------
  const expired = s.availableContracts.filter((c) => c.deadlineMonth < s.month);
  const fresh = generateContracts(s, s.month, rng);
  s.availableContracts = [
    ...s.availableContracts.filter((c) => c.deadlineMonth >= s.month),
    ...fresh,
  ].slice(-o.maxAvailableContracts);
  if (expired.length) log('info', `${expired.length} contract offer(s) expired unserved.`);
  if (fresh.length) log('info', `${fresh.length} new contract offer(s) on the market.`);

  // ---------- 7b. world events ----------
  rollEvents(s, rng, log);

  // ---------- 7c. spot GPU market + power market ----------
  stepSpotPrice(s, rng);
  const spot = spotRevenue(s, servedClusterIds, (d) => rackAccels(s, d));
  if (spot.revenue > 0) {
    revenueTotal += spot.revenue;
    log('info', `Spot market: ${Math.round(spot.accels)} idle GPUs sold at $${(s.spotPrice ?? 0).toFixed(2)}/GPU-hr (${Math.round(spot.util * 100)}% filled) → +$${Math.round(spot.revenue).toLocaleString('en-US')}.`);
  }
  powerMarketTick(s, rng, log);

  // ---------- 8. finances ----------
  const opex0 = monthlyOpex(s);
  const pw = settlePower(s, (opex0.itPowerKW * opex0.pue) / 1000, rng, log);
  const opex = { ...opex0, powerUSD: pw.netUSD, totalUSD: opex0.totalUSD - opex0.powerUSD + pw.netUSD };
  const depreciation = monthlyDepreciation(estimateCapexBasis(s));
  const interest = monthlyInterest(s.debt);
  const prevCash = s.cash;
  s.cash = round2(s.cash + revenueTotal - opex.totalUSD - interest);
  if (s.cash < 0 && prevCash >= 0) {
    log('bad', 'Bankruptcy warning: cash is negative. Raise a loan, land contracts, or cut opex before creditors close you down.');
  }

  // ---------- 9. history ----------
  const onlineAccels = s.clusters.reduce((n, c) => n + (c.stats?.accelerators ?? 0), 0);
  const servingAccels = [...servedClusterIds].reduce(
    (n, id) => n + (s.clusters.find((x) => x.id === id)?.stats?.accelerators ?? 0),
    0,
  );
  const utilization = onlineAccels > 0 ? Math.min(1, servingAccels / onlineAccels) : 0;
  s.history.push({
    month: s.month,
    revenue: round2(revenueTotal),
    opex: round2(opex.totalUSD + depreciation + interest),
    cash: s.cash,
    utilization: round2(utilization),
  });

  s.log = [...s.log, ...logs].slice(-400);
  return s;
}
