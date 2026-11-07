// Playtest personas: scripted "players" with different styles. They drive the real engine through env.step,
// so every rule, validation and failure applies exactly as for a human.
import * as E from '../env/env';
import { TEMPLATES } from '../data/templates';
import { getItem } from '../data';
import { offerAt } from '../store';
import { staffNeeded } from '../sim/staffing';
import { rackResidualUSD, residualFactor } from '../sim/lifecycle';
import type { Agent } from '../env/agents';
import { operatorAgent, idleAgent, randomAgent, qualifyingBuilds, serveFromExisting } from '../env/agents';
import { mulberry32 } from '../sim/rng';
import type { Action } from '../env/env';

const buyable = (month: number) => TEMPLATES.filter((t) => (t.availableFrom * 12 - 2020 * 12) <= month && !(t.eolAfter && (t.eolAfter * 12 - 2020 * 12) < month)
  && getItem(t.tray.chassisId) && offerAt(getItem(t.tray.chassisId)!, month).available);

/** Common housekeeping every competent player does: staff up, pay down debt, sell junk. */
function housekeeping(out: Action[], opts: { repay: boolean; sell: boolean }) {
  const g = E.state();
  const need = staffNeeded(g).needed;
  if (g.staff < need) { const a = { name: 'hireStaff', args: [need - g.staff] }; if (E.probe(a)) out.push(a); }
  if (opts.repay && g.debt > 0 && g.cash > g.debt * 2 + 5e6) out.push({ name: 'repayLoan', args: [Math.min(g.debt, g.cash - 5e6)] });
  if (opts.sell) for (const h of g.halls) for (const r of h.racks) {
    if (!r.clusterId && r.status === 'online' && residualFactor(g, r) < 0.3 && rackResidualUSD(g, r) > 0) { out.push({ name: 'decommissionRack', args: [r.id] }); break; }
  }
}

/** Leverages debt and builds for as many contracts as it can; hires, repays, signs frameworks, replaces old racks. */
export const tycoonAgent: Agent = (o) => {
  const out: Action[] = [];
  const g = E.state();
  if (o.month % 3 === 0 && g.debt < 10e6 && g.cash < 25e6) { const a = { name: 'takeLoan', args: [10_000_000] }; if (E.probe(a)) out.push(a); }
  const live = new Set([...(o.active as any[]).map((a) => a.id), ...(o.projects as any[]).filter((p) => p.stage !== 'done' && p.stage !== 'failed').map((p) => p.contractId)]);
  out.push(...serveFromExisting(live, 8));
  if (live.size < 4 && o.cash > 8e6) {
    for (const c of o.offers as any[]) {
      if (live.size >= 4) break;
      for (const b of qualifyingBuilds(c.id).slice(0, 6)) { const a = { name: 'startEasy', args: [c.id, b.templateId, b.racks] }; if (b.cost < o.cash * 0.7 && E.probe(a)) { out.push(a); live.add(c.id); break; } }
    }
  }
  if (g.cash > 60e6 && !(g.frameworks ?? []).length) { const a = { name: 'signFramework', args: ['nvidia', 10_000_000, 24] }; if (E.probe(a)) out.push(a); }
  if (g.cash > 40e6 && g.policy?.maintenance !== 1) out.push({ name: 'setPolicy', args: [2, 1] });
  housekeeping(out, { repay: true, sell: true });
  out.push({ name: 'nextMonth' });
  return out;
};

/** Never borrows, one contract at a time, premium maintenance, long burn-in; sells idle racks on the spot market. */
export const cautiousAgent: Agent = (o) => {
  const out: Action[] = [];
  const g = E.state();
  if (!g.policy || g.policy.maintenance !== 2) out.push({ name: 'setPolicy', args: [3, 2] });
  const busy = (o.projects as any[]).some((p) => p.stage !== 'done' && p.stage !== 'failed') || (o.active as any[]).length >= 1;
  if (!busy && o.cash > 15e6) {
    for (const c of o.offers as any[]) { let done = false; for (const b of qualifyingBuilds(c.id).slice(0, 6)) { const a = { name: 'startEasy', args: [c.id, b.templateId, b.racks] }; if (E.probe(a)) { out.push(a); done = true; break; } } if (done) break; }
  }
  for (const h of g.halls) for (const r of h.racks) if (r.status === 'online' && !r.clusterId && !(g.spotRacks ?? []).includes(r.id)) { out.push({ name: 'setSpotRack', args: [r.id, true] }); break; }
  housekeeping(out, { repay: true, sell: false });
  out.push({ name: 'nextMonth' });
  return out;
};

/** Buys single racks and lives off the spot market only (never signs a contract). */
export const spotterAgent: Agent = (o) => {
  const out: Action[] = [];
  const g = E.state();
  if (o.cash > 10e6 && g.orders.length < 3) {
    const t = buyable(o.month).find((x) => E.probe({ name: 'buyTemplate', args: [x.id, 1] }));
    if (t) out.push({ name: 'buyTemplate', args: [t.id, 1] });
  }
  for (const h of g.halls) for (const r of h.racks) if (r.status === 'online' && !(g.spotRacks ?? []).includes(r.id)) out.push({ name: 'setSpotRack', args: [r.id, true] });
  // place anything we own
  for (const d of g.racks) { const a = { name: 'placeRack', args: [g.halls[0].id, d.id] }; if (E.probe(a)) { out.push(a); break; } }
  housekeeping(out, { repay: true, sell: true });
  out.push({ name: 'nextMonth' });
  return out;
};


/** Reinvests: serves every offer its idle clusters can, builds double-size clusters for the best-payback offer when
 *  capacity is nearly full, repays debt, hires, sells obsolete racks. The reference for "a good player". */
export const builderAgent: Agent = (o) => {
  const out: Action[] = [];
  const g = E.state();
  const live = new Set([...(o.active as any[]).map((a) => a.id), ...(o.projects as any[]).filter((p) => p.stage !== 'done' && p.stage !== 'failed').map((p) => p.contractId)]);
  out.push(...serveFromExisting(live, 40));
  const building = (o.projects as any[]).filter((p) => p.stage !== 'done' && p.stage !== 'failed').length;
  const clustered = g.clusters.reduce((n, c) => n + (c.stats?.accelerators ?? 0), 0);
  const busyCl = g.clusters.filter((c) => g.activeContracts.some((a) => a.clusterIds.includes(c.id))).length;
  const needMore = true; void clustered; void busyCl;
  if (building < 2 && needMore && o.cash > 3e6) {
    const cands: { c: any; b: { templateId: string; racks: number; cost: number; paybackMo: number } }[] = [];
    for (const c of o.offers as any[]) if (!live.has(c.id)) for (const b of qualifyingBuilds(c.id).slice(0, 4)) if (b.cost < o.cash * 0.6 && b.paybackMo <= 36) cands.push({ c, b });
    cands.sort((x, y) => x.b.paybackMo - y.b.paybackMo);
    for (const { c, b } of cands) {
      const big = b.cost * 2 < o.cash * 0.5 ? b.racks * 2 : b.racks;
      const a = { name: 'startEasy', args: [c.id, b.templateId, big] };
      if (E.probe(a)) { out.push(a); break; }
    }
  }
  for (const h of g.halls) for (const r of h.racks) if (r.status === 'online' && !r.clusterId && !(g.spotRacks ?? []).includes(r.id)) out.push({ name: 'setSpotRack', args: [r.id, true] });
  for (const cl of g.clusters) if (!g.activeContracts.some((a) => a.clusterIds.includes(cl.id)) && !(g.spotClusters ?? []).includes(cl.id)) out.push({ name: 'setSpot', args: [cl.id, true] });
  housekeeping(out, { repay: true, sell: true });
  out.push({ name: 'nextMonth' });
  return out;
};

/** Uses the whole toolbox: serves from idle clusters, builds by payback, signs a power contract once it is running a
 *  real hall, signs a vendor framework, sells obsolete racks, repays debt and keeps the crew sized. */
export const plannerAgent: Agent = (o, l) => {
  const base = operatorAgent(o, l); const extra: Action[] = []; const g = E.state();
  if (o.cash > 15e6 && !(g.powerContracts ?? []).some((c) => g.month <= c.endMonth) && g.halls.some((h) => h.racks.length >= 12)) {
    const offer = [...(g.powerOffers ?? [])].sort((a, b) => a.priceUSDPerMWh - b.priceUSDPerMWh)[0];
    if (offer) { const a = { name: 'signPower', args: [offer.id, Math.max(1, Math.round(offer.mw * 0.6))] }; if (E.probe(a)) extra.push(a); }
  }
  if (g.cash > 70e6 && !(g.frameworks ?? []).length) { const a = { name: 'signFramework', args: ['nvidia', 8_000_000, 24] }; if (E.probe(a)) extra.push(a); }
  housekeeping(extra, { repay: true, sell: true });
  return [...base.slice(0, -1), ...extra, base[base.length - 1]];
};

export const PERSONAS: Record<string, (seed: number) => Agent> = {
  idle: () => idleAgent,
  random: (seed) => randomAgent(mulberry32(seed)),
  operator: () => (o, l) => { const a = operatorAgent(o, l); const hk: Action[] = []; housekeeping(hk, { repay: true, sell: false }); return [...a.slice(0, -1), ...hk, a[a.length - 1]]; },
  tycoon: () => tycoonAgent,
  builder: () => builderAgent,
  planner: () => plannerAgent,
  cautious: () => cautiousAgent,
  spotter: () => spotterAgent,
};
