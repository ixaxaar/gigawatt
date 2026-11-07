// Reference agents. They double as a learnability check: a useful reward must separate them.
import * as E from './env';
import { TEMPLATES } from '../data/templates';
import { offerAt } from '../store';
import { getItem } from '../data';
import type { Action, Scenario } from './env';
import { buildOptions, contractFit } from '../contractfit';

export type Agent = (obs: E.Obs, legal: () => Action[]) => Action[];

/** Picks one random legal non-advance action per month, then advances. */
export const randomAgent = (rng: () => number): Agent => (_o, legal) => {
  const acts = legal().filter(a => a.name !== 'nextMonth');
  return acts.length ? [acts[Math.floor(rng() * acts.length)], { name: 'nextMonth' }] : [{ name: 'nextMonth' }];
};

/** Does nothing: the cost of standing still (loan interest, opex, depreciation). */
export const idleAgent: Agent = () => [{ name: 'nextMonth' }];

/** Builds the contract's own "what you need to buy" list would offer: qualifying, on-time, cheapest first. */
export function qualifyingBuilds(contractId: string): { templateId: string; racks: number; cost: number; paybackMo: number }[] {
  const g = E.state(); const c = g.availableContracts.find((x) => x.id === contractId) ?? g.activeContracts.find((a) => a.contract.id === contractId)?.contract;
  if (!c) return [];
  return buildOptions(g, c).filter((o) => o.fitsRamp).map((o) => ({ templateId: o.t.id, racks: o.racks, cost: o.cost, paybackMo: o.paybackMo })).sort((a, b) => a.cost - b.cost);
}


/** Sign offers that an idle, already-built cluster can serve right now (what a sensible player does before buying more).
 *  Training needs a cluster no training job holds; inference may share a cluster while its token budget lasts. */
export function serveFromExisting(live: Set<string>, maxLive: number): Action[] {
  const out: Action[] = []; const g = E.state();
  const claimed = new Map<string, { exclusive: boolean; tok: number }>();
  for (const a of g.activeContracts) for (const id of a.clusterIds) { const c = claimed.get(id) ?? { exclusive: false, tok: 0 }; if (a.contract.kind === 'training') c.exclusive = true; else c.tok += a.contract.tokensPerSec; claimed.set(id, c); }
  for (const c of g.availableContracts) {
    if (live.size >= maxLive) break;
    if (live.has(c.id) || !E.probe({ name: 'acceptContract', args: [c.id] })) continue;
    const fit = contractFit(g, c);
    const pick = fit.all.find((f) => {
      if (!f.ok) return false; const cl = claimed.get(f.cluster.id);
      if (!cl) return true; if (cl.exclusive || c.kind === 'training') return false;
      return cl.tok + (c as any).tokensPerSec <= ((f.checks as any).cap ?? 0) * 0.9;
    });
    if (!pick) continue;
    out.push({ name: 'acceptContract', args: [c.id] }, { name: 'assignContract', args: [c.id, [pick.cluster.id]] });
    live.add(c.id); const cl = claimed.get(pick.cluster.id) ?? { exclusive: false, tok: 0 };
    if (c.kind === 'training') cl.exclusive = true; else cl.tok += c.tokensPerSec; claimed.set(pick.cluster.id, cl);
  }
  return out;
}

/** Easy-path operator: signs the first contract it can staff with the cheapest qualifying build, never overextends. */
export const operatorAgent: Agent = (o) => {
  const out: Action[] = [];
  const live = new Set([...(o.active as any[]).map(a => a.id), ...(o.projects as any[]).filter(p => p.stage !== 'done' && p.stage !== 'failed').map(p => p.contractId)]);
  const building = (o.projects as any[]).filter(p => p.stage !== 'done' && p.stage !== 'failed').length;
  out.push(...serveFromExisting(live, 10));
  if (building < 1 + Math.floor(o.cash / 60e6) && o.cash > 4_000_000) {
    const cands: { c: any; b: { templateId: string; racks: number; cost: number; paybackMo: number } }[] = [];
    for (const c of o.offers as any[]) if (!live.has(c.id)) for (const b of qualifyingBuilds(c.id).slice(0, 4)) if (b.cost < o.cash * 0.6 && b.paybackMo <= 40) cands.push({ c, b });
    cands.sort((x, y) => x.b.paybackMo - y.b.paybackMo);
    for (const { c, b } of cands) { const a = { name: 'startEasy', args: [c.id, b.templateId, b.racks] }; if (E.probe(a)) { out.push(a); live.add(c.id); break; } }
  }
  // idle online racks earn spot money rather than sit dark
  const g = E.state();
  for (const h of g.halls) for (const r of h.racks) if (r.status === 'online' && !r.clusterId && !(g.spotRacks ?? []).includes(r.id)) out.push({ name: 'setSpotRack', args: [r.id, true] });
  for (const cl of g.clusters) if (!g.activeContracts.some(a => a.clusterIds.includes(cl.id)) && !(g.spotClusters ?? []).includes(cl.id)) out.push({ name: 'setSpot', args: [cl.id, true] });
  out.push({ name: 'nextMonth' });
  return out;
};

export function rollout(agent: Agent, seed: number, months: number, scenario?: Scenario) {
  let obs = E.reset({ seed, scenario }); let ret = 0; let broke = false;
  for (let m = 0; m < months && !broke; m++) for (const a of agent(obs, () => E.legalActions())) { const r = E.step(a); obs = r.obs; ret += r.reward; if (r.done) { broke = true; break; } }
  return { ret, netWorth: obs.netWorth, cash: obs.cash, broke };
}
