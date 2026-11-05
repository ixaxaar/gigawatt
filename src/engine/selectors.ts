import { ALL_ITEMS } from '../data';
import { HOURS_PER_MONTH, estimateCapexBasis, monthlyDepreciation, monthlyInterest, monthlyOpex } from '../sim/economy';
import { CatalogItem, GameState, monthToYear } from '../types';

// ---------- derived selectors (pure, take GameState) ----------

export const selectCapexBasis = estimateCapexBasis;
export const selectNetWorth = (g: GameState): number => g.cash - g.debt + estimateCapexBasis(g) * 0.5;

export interface MonthlyPnL {
  revenue: number;
  opex: number;
  depreciation: number;
  interest: number;
  net: number;
}

/** Best-case monthly P&L projection (assumes SLAs met at current capacity). */
export const selectMonthlyPnL = (g: GameState): MonthlyPnL => {
  const opex = monthlyOpex(g);
  const depreciation = monthlyDepreciation(estimateCapexBasis(g));
  const interest = monthlyInterest(g.debt);
  const revenue = g.activeContracts.reduce((sum, ac) => {
    if (ac.clusterIds.length === 0) return sum;
    const c = ac.contract;
    if (c.kind === 'training') {
      const accels = ac.clusterIds.reduce(
        (n, id) => n + (g.clusters.find((x) => x.id === id)?.stats?.accelerators ?? 0),
        0,
      );
      return sum + accels * c.pricePerAccelHour * HOURS_PER_MONTH;
    }
    return sum + ((c.tokensPerSec * HOURS_PER_MONTH * 3600) / 1e6) * c.pricePerMTok;
  }, 0);
  return { revenue, opex: opex.totalUSD, depreciation, interest, net: revenue - opex.totalUSD - depreciation - interest };
};

export const selectPurchasable = (month: number): CatalogItem[] => {
  const year = monthToYear(month);
  return ALL_ITEMS.filter((i) => year >= i.availableFrom && (!i.eolAfter || year <= i.eolAfter));
};

// ---------- store ----------

