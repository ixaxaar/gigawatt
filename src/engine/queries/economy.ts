// Read-only engine queries — economy. (Pure functions of the current game; exposed through the bridge.)
import { getItem } from '../../data';
import { HOURS_PER_MONTH, monthlyOpex } from '../../sim/economy';
import { POWER_SOURCES, settlePower, spotAnchor, spotRevenue, spotUtilization } from '../../sim/power';
import { validateRack as vr } from '../../sim/validate';
import { selectCapexBasis, selectMonthlyPnL, selectNetWorth } from '../../store';
import { G } from './shared';

export const economyQueries: Record<string, (...a: any[]) => any> = {
  pnl: () => selectMonthlyPnL(G()),
  netWorth: () => selectNetWorth(G()),
  capexBasis: () => selectCapexBasis(G()),
  opex: () => monthlyOpex(G()),
  powerPreview: () => { const g = G(); const o = monthlyOpex(g); const drawMW = (o.itPowerKW * o.pue) / 1000; return { drawMW, opex: o, settle: settlePower(g, drawMW, () => 0.5, () => {}), spotAnchor: spotAnchor(g.month), spotPrice: g.spotPrice ?? spotAnchor(g.month), spotUtil: spotUtilization(g.spotPrice ?? spotAnchor(g.month), g.month), hours: HOURS_PER_MONTH }; },
  spotRevenue: () => { const g = G(); return spotRevenue(g, new Set(g.activeContracts.flatMap(a => a.clusterIds)), d => { const rd = g.racks.find(r => r.id === d); return rd ? vr(rd, g.trays, getItem).stats.accels : 0; }); },
  powerSources: () => POWER_SOURCES,
};
