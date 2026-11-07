// "What happens if I press Next Month?" — a read-only forecast so the player is never surprised.
import { getItem } from '../../data';
import { selectMonthlyPnL } from '../selectors';
import { staffNeeded } from '../../sim/staffing';
import { policyOf, maintenanceUSD } from '../../sim/policy';
import { G } from './shared';
import { fleetOf, needsOf } from '../needs';

export const previewQueries: Record<string, (...a: any[]) => any> = {
  fleet: () => fleetOf(G()),
  needs: () => needsOf(G()),
  board: () => { const g = G(); return g.board ?? null; },
  preview: () => {
    const g = G(); const next = g.month + 1;
    const deliveries = g.orders.filter((o) => o.arriveMonth <= next).map((o) => ({ item: getItem(o.itemId)?.name ?? o.itemId, qty: o.qty, spare: !!o.spare }));
    const racks = g.halls.flatMap((h) => h.racks);
    const commissioning = racks.filter((r) => r.status === 'installing' && next >= r.readyMonth - 1).length;
    const online = racks.filter((r) => r.status === 'commissioning' && next >= r.readyMonth).length;
    const repaired = racks.filter((r) => r.status === 'failed' && next >= r.readyMonth).length;
    const floor = g.halls.flatMap((h) => (h.expansions ?? []).filter((e) => e.readyMonth <= next).map((e) => ({ hall: h.name, slots: e.units * 10 })));
    const walkAway = g.activeContracts.filter((a) => a.clusterIds.length === 0 && (a.deployBy ?? a.startMonth + 4) <= next).map((a) => a.contract.customer);
    const expiring = g.availableContracts.filter((c) => c.deadlineMonth <= g.month).map((c) => c.customer);
    const completing = g.activeContracts.filter((a) => a.clusterIds.length > 0 && a.monthsServed + 1 >= a.contract.durationMonths).map((a) => a.contract.customer);
    const pnl = selectMonthlyPnL(g);
    const cashDelta = pnl.revenue - pnl.opex - pnl.interest;
    const need = staffNeeded(g);
    const warnings: string[] = [];
    if (g.cash + cashDelta < 0) warnings.push(`Cash would go negative (${Math.round(g.cash + cashDelta).toLocaleString('en-US')}).`);
    if (walkAway.length) warnings.push(`${walkAway.join(', ')}: last month to bring capacity online or they walk.`);
    if (g.staff < need.needed) warnings.push(`Understaffed: ${g.staff}/${need.needed} operators.`);
    if (g.status && g.status !== 'playing') warnings.push('Game over.');
    return {
      month: g.month, nextMonth: next, deliveries, racks: { commissioning, online, repaired }, floor, walkAway, expiring, completing,
      revenue: Math.round(pnl.revenue), opex: Math.round(pnl.opex), interest: Math.round(pnl.interest), cashDelta: Math.round(cashDelta), cashAfter: Math.round(g.cash + cashDelta),
      runwayMonths: cashDelta < 0 ? Math.floor(g.cash / -cashDelta) : null,
      policy: policyOf(g), maintenanceUSD: Math.round(maintenanceUSD(g)), staff: { have: g.staff, needed: need.needed }, warnings,
    };
  },
};
