// Reference agents. They double as a learnability check: a useful reward must separate them.
import * as E from './env';
import { TEMPLATES } from '../data/templates';
import { offerAt } from '../store';
import { getItem } from '../data';
import type { Action, Scenario } from './env';
import { buildOptions } from '../contractfit';

export type Agent = (obs: E.Obs, legal: () => Action[]) => Action[];

/** Picks one random legal non-advance action per month, then advances. */
export const randomAgent = (rng: () => number): Agent => (_o, legal) => {
  const acts = legal().filter(a => a.name !== 'nextMonth');
  return acts.length ? [acts[Math.floor(rng() * acts.length)], { name: 'nextMonth' }] : [{ name: 'nextMonth' }];
};

/** Does nothing: the cost of standing still (loan interest, opex, depreciation). */
export const idleAgent: Agent = () => [{ name: 'nextMonth' }];

/** Builds the contract's own "what you need to buy" list would offer: qualifying, on-time, cheapest first. */
export function qualifyingBuilds(contractId: string): { templateId: string; racks: number; cost: number }[] {
  const g = E.state(); const c = g.availableContracts.find((x) => x.id === contractId) ?? g.activeContracts.find((a) => a.contract.id === contractId)?.contract;
  if (!c) return [];
  return buildOptions(g, c).filter((o) => o.fitsRamp && o.hallGaps.every((x) => !x.startsWith('Cooling type'))).map((o) => ({ templateId: o.t.id, racks: o.racks, cost: o.cost })).sort((a, b) => a.cost - b.cost);
}

/** Easy-path operator: signs the first contract it can staff with the cheapest qualifying build, never overextends. */
export const operatorAgent: Agent = (o) => {
  const out: Action[] = [];
  const live = new Set([...(o.active as any[]).map(a => a.id), ...(o.projects as any[]).filter(p => p.stage !== 'done' && p.stage !== 'failed').map(p => p.contractId)]);
  if (live.size < 2 && o.cash > 12_000_000) {
    for (const c of o.offers as any[]) {
      for (const b of qualifyingBuilds(c.id).slice(0, 4)) { const a = { name: 'startEasy', args: [c.id, b.templateId, b.racks] }; if (b.cost < o.cash * 0.6 && E.probe(a)) { out.push(a); live.add(c.id); break; } }
      if (live.size >= 2) break;
    }
  }
  out.push({ name: 'nextMonth' });
  return out;
};

export function rollout(agent: Agent, seed: number, months: number, scenario?: Scenario) {
  let obs = E.reset({ seed, scenario }); let ret = 0; let broke = false;
  for (let m = 0; m < months && !broke; m++) for (const a of agent(obs, () => E.legalActions())) { const r = E.step(a); obs = r.obs; ret += r.reward; if (r.done) { broke = true; break; } }
  return { ret, netWorth: obs.netWorth, cash: obs.cash, broke };
}
