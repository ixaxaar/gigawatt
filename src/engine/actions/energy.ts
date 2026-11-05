// GIGAWATT engine — energy actions. Generated from the former store.ts monolith.
import { Cluster } from '../../types';
import type { GameStore } from '../api';
import { POWER_LESSON, fail, ok, usd } from './consts';
import { Offer } from '../pricing';
import type { Ctx } from './ctx';

export const energyActions = (c: Ctx): Partial<GameStore> => {
  const { set, commit, logln } = c;
  return {
    signPower: (offerId, mwOverride) =>
      commit((g) => {
        const i = (g.powerOffers ?? []).findIndex((o) => o.id === offerId);
        if (i < 0) return fail('Offer not found or expired.');
        const o = g.powerOffers![i];
        const mw = Math.max(1, Math.min(o.mw * 2, Math.round(mwOverride ?? o.mw)));
        g.powerOffers!.splice(i, 1);
        (g.powerContracts ??= []).push({ ...o, mw, startMonth: g.month + 1, endMonth: g.month + o.termMonths });
        logln(g, 'good', `Signed ${mw} MW ${o.source} PPA with ${o.supplier}: $${o.priceUSDPerMWh}/MWh take-or-pay for ${o.termMonths} mo, overdraw up to +${Math.round(o.overdrawPct * 100)}%. ${POWER_LESSON[o.source]}`);
        return ok(`Signed ${mw} MW with ${o.supplier}; starts next month.`);
      }),

    setSpot: (clusterId, on) =>
      commit((g) => {
        if (!g.clusters.some((c) => c.id === clusterId)) return fail('Unknown cluster.');
        const set = new Set(g.spotClusters ?? []);
        if (on) set.add(clusterId); else set.delete(clusterId);
        g.spotClusters = [...set];
        return ok(on ? 'Cluster offered on the spot market when idle.' : 'Cluster removed from the spot market.');
      }),

    setSpotRack: (rackId, on) =>
      commit((g) => {
        if (!g.halls.some((h) => h.racks.some((r) => r.id === rackId))) return fail('Unknown rack.');
        const set = new Set(g.spotRacks ?? []);
        if (on) set.add(rackId); else set.delete(rackId);
        g.spotRacks = [...set];
        return ok(on ? 'Rack offered on spot when online.' : 'Rack withdrawn from spot.');
      }),

    setSpotReserve: (usd) =>
      commit((g) => { g.spotReserve = Math.max(0, usd); return ok(`Reserve price $${Math.max(0, usd).toFixed(2)}/GPU-hr.`); }),

  };
};
