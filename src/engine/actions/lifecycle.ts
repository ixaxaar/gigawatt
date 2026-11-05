// GIGAWATT engine — lifecycle actions: decommission racks, liquidate stock.
import { getItem } from '../../data';
import type { GameStore } from '../api';
import { rackAgeMonths, rackResidualUSD, residualFactor } from '../../sim/lifecycle';
import type { HallState, PlacedRack } from '../../types';
import { fail, ok, usd } from './consts';
import type { Ctx } from './ctx';

export const lifecycleActions = (c: Ctx): Partial<GameStore> => {
  const { commit, logln } = c;
  return {
    decommissionRack: (rackId) =>
      commit((g) => {
        let hall: HallState | undefined;
        let rack: PlacedRack | undefined;
        for (const h of g.halls) {
          rack = h.racks.find((r) => r.id === rackId);
          if (rack) { hall = h; break; }
        }
        if (!hall || !rack) return fail(`Rack '${rackId}' not found.`);
        if (rack.status === 'ordered') return fail('This rack is still on order — nothing to sell yet.');
        if (rack.clusterId) return fail('Disband its cluster first.');
        const age = rackAgeMonths(rack, g.month);
        const pct = Math.round(residualFactor(g, rack) * 100);
        const sale = Math.round(rackResidualUSD(g, rack) * 0.85);
        g.cash += sale;
        hall.racks = hall.racks.filter((r) => r.id !== rackId);
        g.spotRacks = (g.spotRacks ?? []).filter((id) => id !== rackId);
        g.stats ??= { contractsCompleted: 0, peakAccels: 0, slaMisses: 0, revenueTotal: 0, decommissioned: 0 };
        g.stats.decommissioned++;
        logln(g, 'info', `Decommissioned ${rack.id} at age ${age} months: sold for $${usd(sale)} at ${pct}% residual.`);
        return ok(`Rack sold for $${usd(sale)} (age ${age} months, ${pct}% residual).`);
      }),

    sellInventory: (itemId, qty) =>
      commit((g) => {
        const item = getItem(itemId);
        if (!item) return fail(`Unknown item '${itemId}'.`);
        if (!Number.isFinite(qty) || Math.floor(qty) < 1) return fail('Quantity must be a positive number.');
        const n = Math.floor(qty);
        const have = g.inventory[itemId] ?? 0;
        if (have < n) return fail(`Only ${have} × ${item.name} in the warehouse.`);
        const sale = Math.round(0.6 * item.priceUSD * n);
        g.inventory[itemId] = have - n;
        if (g.inventory[itemId] <= 0) delete g.inventory[itemId];
        g.cash += sale;
        logln(g, 'info', `Sold ${n} × ${item.name} from the warehouse for $${usd(sale)} (60% of catalog price).`);
        return ok(`Sold ${n} × ${item.name} for $${usd(sale)}.`);
      }),
  };
};
