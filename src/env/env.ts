// Programmatic simulation interface for agents (RL / LLM / scripted). Gymnasium-shaped:
//   reset({seed, scenario}) -> obs;  step({name,args}) -> {obs, reward, done, truncated, info};
//   legalActions() -> probed-valid actions;  hash() -> state digest (determinism checks).
// One env per process (the engine is a zustand singleton); parallelise with worker processes.
import { useGame, selectNetWorth, selectMonthlyPnL } from '../store';
import { TEMPLATES } from '../data/templates';
import type { GameState } from '../types';

export interface Action { name: string; args?: unknown[] }
export interface StepResult { obs: Obs; reward: number; done: boolean; truncated: boolean; info: { ok: boolean; message: string; issues: unknown[]; terminalReason?: string } }
export interface Scenario {
  id: string; title: string; seed: number; horizonMonths: number; description: string;
  /** Runs against the store right after newGame (set cash/month, buy, build, advance...). Must be deterministic. */
  setup?: () => void;
}
export type Obs = ReturnType<typeof observe>;

const st = () => useGame.getState();
const G = () => st().game;

/** FNV-1a over a key-sorted JSON encoding: identical state => identical hash, regardless of key order. */
function stable(v: any): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}
export function hashState(g: GameState): string {
  const s = stable(g); let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export function observe() {
  const g = G(); const pnl = selectMonthlyPnL(g) as any;
  const racks = g.halls.flatMap(h => h.racks);
  const by = (f: (x: any) => string) => racks.reduce<Record<string, number>>((m, r) => { const k = f(r); m[k] = (m[k] ?? 0) + 1; return m; }, {});
  return {
    month: g.month, year: +(2020 + g.month / 12).toFixed(2), cash: g.cash, debt: g.debt, netWorth: selectNetWorth(g), reputation: g.reputation,
    monthlyPnL: pnl,
    halls: g.halls.map((h: any) => ({ id: h.id, name: h.name, coolingClass: h.coolingClass, rackSlots: h.rackSlots, racks: h.racks.length, rackStatus: h.racks.reduce((m: any, r: any) => (m[r.status] = (m[r.status] ?? 0) + 1, m), {}), itPowerKW: h.itPowerKW, coolingKW: h.coolingKW, pue: h.pue, powerEquip: h.powerEquip, coolingEquip: h.coolingEquip })),
    rackStatus: by(r => r.status),
    inventory: g.inventory, spares: g.spareStock ?? {},
    orders: g.orders.map(o => ({ itemId: o.itemId, qty: o.qty, arriveMonth: o.arriveMonth, spare: !!o.spare })),
    offers: g.availableContracts, active: g.activeContracts.map(a => ({ id: a.contract.id, customer: (a.contract as any).customer, clusterIds: a.clusterIds, monthsServed: a.monthsServed, slaMisses: a.slaMisses, deployBy: (a as any).deployBy })),
    clusters: g.clusters.map(c => ({ id: c.id, name: c.name, racks: c.rackIds.length, fabric: c.fabric, stats: c.stats })),
    projects: g.projects ?? [], powerContracts: g.powerContracts ?? [], powerOffers: g.powerOffers ?? [], uplinks: g.uplinks ?? {}, spotPrice: g.spotPrice,
    log: g.log.slice(-10),
  };
}

/** Short plain-text rendering for LLM agents. */
export function describe(): string {
  const o = observe(); const f = (n: number) => Math.round(n).toLocaleString('en-US');
  return [
    `Month ${o.month} (${o.year}). Cash $${f(o.cash)}, debt $${f(o.debt)}, net worth $${f(o.netWorth)}, reputation ${o.reputation.toFixed(0)}.`,
    `Halls: ${o.halls.map(h => `${h.name}[${h.coolingClass}, ${h.racks}/${h.rackSlots} racks ${JSON.stringify(h.rackStatus)}]`).join('; ') || 'none'}.`,
    `Orders in flight: ${o.orders.length}. Inventory lines: ${Object.keys(o.inventory).length}. Clusters: ${o.clusters.length}.`,
    `Contracts: ${o.active.length} active, ${o.offers.length} on offer.`,
    `Recent log:\n${o.log.map((l: any) => ` - [${l.level}] ${l.text}`).join('\n')}`,
  ].join('\n');
}

let scenario: Scenario | null = null; let t0 = 0; let broke = 0;

export function reset(opts: { seed?: number; scenario?: Scenario; mode?: 'learner' | 'operator' | 'tycoon' } = {}) {
  scenario = opts.scenario ?? null;
  const seed = opts.seed ?? scenario?.seed ?? 1;
  st().newGame(seed, opts.mode ?? 'operator');
  scenario?.setup?.();
  t0 = G().month; broke = 0;
  return observe();
}

export function step(a: Action): StepResult {
  const before = selectNetWorth(G()); const fn = (st() as any)[a.name];
  if (typeof fn !== 'function') return { obs: observe(), reward: -0.01, done: false, truncated: false, info: { ok: false, message: 'unknown action ' + a.name, issues: [] } };
  const r = fn(...(a.args ?? []));
  const res = r && typeof r === 'object' && 'ok' in r ? r : { ok: true, message: '' };
  let reward = res.ok ? 0 : -0.01;
  if (a.name === 'nextMonth') {
    const g = G(); reward += (selectNetWorth(g) - before) / 1e6;
    broke = g.cash < 0 ? broke + 1 : 0;
  }
  const g = G(); const horizon = scenario?.horizonMonths ?? 120;
  const bankrupt = broke >= 2; const truncated = g.month - t0 >= horizon;
  if (bankrupt) reward -= 10;
  return { obs: observe(), reward, done: bankrupt, truncated, info: { ok: !!res.ok, message: res.message ?? '', issues: res.issues ?? [], ...(bankrupt ? { terminalReason: 'bankrupt (cash<0 for 2 months)' } : {}) } };
}

/** Dry-run: apply, read ok, restore. Exact legality without duplicating the rule set. */
export function probe(a: Action): boolean {
  const snap = G(); const fn = (st() as any)[a.name];
  try { const r = fn(...(a.args ?? [])); return !r || typeof r !== 'object' || !('ok' in r) || !!r.ok; } catch { return false; } finally { useGame.setState({ game: snap }); }
}

/** Candidate actions filtered by `probe`. `full` also enumerates plant installs and every template x contract pair. */
export function legalActions(opts: { full?: boolean } = {}): (Action & { desc: string })[] {
  const g = G(); const out: (Action & { desc: string })[] = [{ name: 'nextMonth', desc: 'Advance one month' }];
  const add = (a: Action, desc: string) => { if (probe(a)) out.push({ ...a, desc }); };
  add({ name: 'takeLoan', args: [5_000_000] }, 'Borrow $5M'); add({ name: 'takeLoan', args: [25_000_000] }, 'Borrow $25M');
  for (const c of g.availableContracts) add({ name: 'acceptContract', args: [c.id] }, `Accept contract ${c.id}`);
  for (const t of TEMPLATES) add({ name: 'buyTemplate', args: [t.id, 1] }, `Order 1 rack of ${t.name}`);
  for (const a of g.activeContracts) for (const cl of g.clusters) if (!a.clusterIds.includes(cl.id)) add({ name: 'assignContract', args: [a.contract.id, [cl.id]] }, `Serve ${a.contract.id} on ${cl.name}`);
  for (const a of g.activeContracts) if (a.clusterIds.length) out.push({ name: 'unassignContract', args: [a.contract.id], desc: `Release ${a.contract.id}` });
  for (const cl of g.clusters) out.push({ name: 'disbandCluster', args: [cl.id], desc: `Disband ${cl.name}` });
  if (opts.full) {
    for (const c of g.activeContracts) for (const t of TEMPLATES) add({ name: 'startEasy', args: [c.contract.id, t.id, 4] }, `Auto-build ${c.contract.id} with ${t.name}`);
    for (const h of g.halls) for (const k of Object.keys(g.inventory)) { add({ name: 'installPower', args: [h.id, k, 1] }, `Install ${k} power in ${h.name}`); add({ name: 'installCooling', args: [h.id, k, 1] }, `Install ${k} cooling in ${h.name}`); }
  }
  return out;
}

export const hash = () => hashState(G());
export const state = () => JSON.parse(JSON.stringify(G())) as GameState;
