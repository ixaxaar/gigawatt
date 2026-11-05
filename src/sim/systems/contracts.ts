import { getItem } from '../../data';
import type { Accelerator, ActiveContract, ClusterStats } from '../../types';
import { generateContracts } from '../market';
import { inferenceCapacity } from '../perf';
import { contractRevenue } from '../economy';
import { uplinkGbps, totalNeedGbps } from '../internet';
import { rackAccels } from './helpers';
import type { System } from './types';

const ARCH_BONUS: Record<ActiveContract['contract']['archetype'], number> = { startup: 1, lab: 2, enterprise: 3, sovereign: 5 };
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Bill every active contract against what its clusters actually deliver; settle SLA misses, completions, walk-aways. */
export const serveContracts: System = {
  id: 'serve-contracts',
  run: (c) => {
    const { s, log } = c;
    const completed: ActiveContract[] = [];
    const defaulted: ActiveContract[] = [];
    const usedFrac: Record<string, number> = {};
    const needGbps = totalNeedGbps(s);
    const netFactor = needGbps > 0 ? Math.min(1, uplinkGbps(s) / needGbps) : 1;
    if (netFactor < 1) log('bad', `Internet uplink is saturated: customers need ~${needGbps.toFixed(1)} Gb/s but you only have ${uplinkGbps(s).toFixed(0)} Gb/s, so every contract runs at ${(netFactor * 100).toFixed(0)}% availability. Buy transit on Build → Internet.`);
    for (const ac of s.activeContracts) {
      const k = ac.contract;
      if (ac.clusterIds.length === 0) {
        // Signed but not yet deployed: no revenue, no SLA clock — until the ramp deadline passes.
        const by = ac.deployBy ?? ac.startMonth + 4;
        if (s.month > by) defaulted.push(ac);
        else if (s.month === by) log('bad', `Last month to bring capacity online for ${k.customer} (${k.model.name}) — assign a qualifying cluster now or they walk.`);
        continue;
      }
      for (const id of ac.clusterIds) c.served.add(id);
      let availability = 0;
      let accelerators = 0;
      let tokensPerSec = 0;

      if (k.kind === 'training') {
        let total = 0;
        let eff = 0;
        for (const id of ac.clusterIds) {
          const cl = s.clusters.find((x) => x.id === id);
          if (!cl) continue;
          eff += cl.stats?.accelerators ?? 0;
          total += cl.rackIds.reduce((n, rid) => {
            const pr = c.placedById.get(rid);
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
          const cap = inferenceCapacity(stats, accel, k.model, { contextTokens: k.contextTokens, tpotMs: k.tpotMs });
          const remain = Math.max(0, 1 - (usedFrac[id] ?? 0));
          parts.push({ id, capTok: cap.tokensPerSec, remain });
          capacity += cap.tokensPerSec * remain;
          worstTtftMs = Math.max(worstTtftMs, cap.ttftMs);
        }
        // capacity sharing: several inference contracts can split one cluster; track the consumed fraction
        const served = Math.min(capacity, k.tokensPerSec);
        for (const pt of parts) if (capacity > 0 && pt.capTok > 0) usedFrac[pt.id] = (usedFrac[pt.id] ?? 0) + (served * ((pt.capTok * pt.remain) / capacity)) / pt.capTok;
        const frac = capacity / Math.max(1, k.tokensPerSec);
        availability = Math.min(1, frac) * (worstTtftMs <= k.ttftMs ? 1 : 0.8);
        tokensPerSec = Math.min(capacity, k.tokensPerSec);
      }

      availability *= netFactor;
      const res = k.kind === 'training'
        ? contractRevenue(ac, { accelerators, availability })
        : contractRevenue(ac, { tokensPerSec, availability });
      c.revenue += res.netUSD;
      if (!res.slaMet) {
        ac.slaMisses += 1;
        log('bad', `SLA miss for ${k.customer} (${k.model.name}): availability ${(availability * 100).toFixed(1)}% vs ${(k.slaAvailability * 100).toFixed(1)}% required. Penalties applied.`);
      }
      ac.monthsServed += 1;
      if (ac.monthsServed >= k.durationMonths) completed.push(ac);
    }

    for (const ac of defaulted) {
      s.reputation = clamp(s.reputation - 8, 0, 100);
      log('bad', `${ac.contract.customer} cancelled: you never brought a qualifying cluster online for ${ac.contract.model.name} in time. Reputation −8.`);
    }
    s.activeContracts = s.activeContracts.filter((ac) => {
      if (defaulted.includes(ac)) return false;
      if (!completed.includes(ac)) return true;
      const k = ac.contract;
      const clean = ac.slaMisses === 0;
      const sloppy = ac.slaMisses > Math.ceil(k.durationMonths / 3);
      const gain = 2 + ARCH_BONUS[k.archetype] + (clean ? 1 : 0) - (sloppy ? 3 : 0);
      s.reputation = clamp(s.reputation + gain, 0, 100);
      log('good', `${k.customer} contract complete: ${k.model.name}, ${k.durationMonths} mo served, ${ac.slaMisses} SLA miss(es). Reputation ${gain >= 0 ? '+' : ''}${gain}.`);
      return false;
    });
  },
};

/** Offers expire; the board refills with era-appropriate contracts. */
export const contractMarket: System = {
  id: 'contract-market',
  run: ({ s, o, rng, log }) => {
    const expired = s.availableContracts.filter((k) => k.deadlineMonth < s.month);
    const fresh = generateContracts(s, s.month, rng);
    s.availableContracts = [...s.availableContracts.filter((k) => k.deadlineMonth >= s.month), ...fresh].slice(-o.maxAvailableContracts);
    if (expired.length) log('info', `${expired.length} contract offer(s) expired unserved.`);
    if (fresh.length) log('info', `${fresh.length} new contract offer(s) on the market.`);
  },
};
