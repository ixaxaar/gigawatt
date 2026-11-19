// Verifies the engine against the interaction graph in ./interactions.ts:
//   (a) conformance on crafted states, (b) a seeded model-based random walk that checks every action
//   against its spec + global invariants, (c) UI/engine agreement for every query that gates a button,
//   (d) the graph covers every store action and every b.act(...) call in godot/.
// Open engine/UI bugs go in KNOWN_ISSUES and are pinned with `it.fails`; fixed ones stay as regression tests at the bottom.
import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { useGame } from '../store';
import { ALL_ITEMS, getItem, VENDORS } from '../data';
import { TEMPLATES } from '../data/templates';
import { autoFabric } from '../autopilot';
import { buildOptions, contractFit } from '../contractfit';
import { check as baseInvariants } from '../playtest/invariants';
import { mulberry32 } from '../sim/rng';
import { DILEMMAS } from '../sim/story-data';
import type { GameMode, GameState } from '../types';
import type { ActionResult } from './api';
import { ACTIONS } from './protocol';
import { QUERIES } from './queries';
import {
  ACTIONS_SPEC, type ActionName, allowedEffects, diffEffects, failingGuard, INTERNAL_ACTIONS, KNOWN_ISSUES, MACHINES, partsFree, reachable, RESETS, SPEC,
} from './interactions';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };

const S = () => useGame.getState() as any;
const G = (): GameState => useGame.getState().game;
const ROOT: string = (process as any).cwd(); // vitest runs from the repo root
const { readFileSync } = fs;
const readdirSync = (fs as any).readdirSync as (p: string) => string[];
const statSync = (fs as any).statSync as (p: string) => { isDirectory(): boolean };

// ---------------------------------------------------------------------------
// The checker: run one action, return every rule it broke.
// ---------------------------------------------------------------------------
type Hit = { rule: string; detail: string; ki?: string };

export function invariants(g: GameState): Hit[] {
  const out: Hit[] = baseInvariants(g, g.month).map((v) => ({ rule: 'R8-invariants', detail: `${v.rule}: ${v.detail}`, }));
  const bad = (d: string) => out.push({ rule: 'R8-invariants', detail: d });
  const avail = new Set(g.availableContracts.map((c) => c.id)); const act = g.activeContracts.map((a) => a.contract.id);
  if (new Set(act).size !== act.length) bad('a contract is active twice');
  for (const id of act) if (avail.has(id)) bad(`contract ${id} is both offered and signed`);
  const owner = new Map<string, string>();
  for (const c of g.clusters) for (const r of c.rackIds) { if (owner.has(r)) bad(`rack ${r} in clusters ${owner.get(r)} and ${c.id}`); owner.set(r, c.id); }
  for (const h of g.halls) for (const r of h.racks) if ((r.clusterId ?? '') !== (owner.get(r.id) ?? '')) bad(`rack ${r.id} clusterId ${r.clusterId} but cluster lists ${owner.get(r.id)}`);
  for (const a of g.activeContracts) {
    if (new Set(a.clusterIds).size !== a.clusterIds.length) bad(`contract ${a.contract.id} lists a cluster twice`);
    if (a.contract.kind === 'training') for (const id of a.clusterIds) if (g.activeContracts.some((o) => o !== a && o.clusterIds.includes(id))) bad(`training contract ${a.contract.id} shares cluster ${id}`);
  }
  for (const o of g.orders) if (!(o.qty > 0) || !Number.isInteger(o.qty)) bad(`order ${o.id} qty ${o.qty}`);
  for (const id of Object.keys(g.rackReserve ?? {})) if (!g.racks.some((r) => r.id === id)) bad(`reservation for unknown design ${id}`);
  if (!['learner', 'operator', 'tycoon', undefined].includes(g.mode)) bad(`mode ${g.mode}`);
  if (!Number.isFinite(g.cash) || !Number.isFinite(g.debt)) bad('cash/debt not finite');
  return out;
}

/** What the checks exercised: per-action outcomes and lifecycle edges actually observed. */
const COVER = { calls: new Map<string, { ok: number; fail: number }>(), edges: new Map<string, number>() };
const bump = <K,>(m: Map<K, number>, k: K) => m.set(k, (m.get(k) ?? 0) + 1);

function verify(name: ActionName, args: any[]): { hits: Hit[]; r: ActionResult | undefined } {
  const spec = SPEC[name];
  const hits: Hit[] = [];
  const before = G(); const beforeJ = JSON.stringify(before);
  const guard = failingGuard(name, before, args, false);
  let r: ActionResult | undefined;
  try { r = S()[name](...args); } catch (e: any) { hits.push({ rule: 'R2-feedback', detail: `threw ${String(e?.message ?? e).slice(0, 160)}` }); return { hits, r }; }
  const after = G(); const changed = JSON.stringify(after) !== beforeJ;
  // R2 feedback shape
  if (spec.returns === 'result') {
    if (!r || typeof r !== 'object' || typeof r.ok !== 'boolean' || typeof r.message !== 'string') hits.push({ rule: 'R2-feedback', detail: `bad result ${JSON.stringify(r)?.slice(0, 120)}` });
    else {
      if (!r.ok && !r.message.trim()) hits.push({ rule: 'R2-feedback', detail: 'failure without a message' });
      if (r.issues !== undefined && (!Array.isArray(r.issues) || r.issues.some((i) => !i || typeof i.message !== 'string' || !['error', 'warn', 'info'].includes(i.severity)))) hits.push({ rule: 'R2-feedback', detail: 'malformed issues' });
    }
  } else if (r !== undefined) hits.push({ rule: 'R2-feedback', detail: 'void action returned a value' });
  const ok = spec.returns === 'void' ? true : !!r?.ok;
  const cc = COVER.calls.get(name) ?? { ok: 0, fail: 0 }; if (ok) cc.ok++; else cc.fail++; COVER.calls.set(name, cc);
  // R3 atomic
  if (!ok && changed) hits.push({ rule: 'R3-atomic', detail: `failed ("${r?.message.slice(0, 80)}") but changed ${[...diffEffects(JSON.parse(beforeJ), after)].join(',') || 'log/counters'}` });
  // R4 guards
  if (guard && ok && spec.returns === 'result') hits.push({ rule: 'R4-guards', detail: `succeeded although "${guard.text}" is false` });
  if (!guard && spec.exact && !ok && spec.returns === 'result') hits.push({ rule: 'R4-guards', detail: `all modelled preconditions hold but it failed: ${r?.message}` });
  // R5/R6 on success
  if (ok && changed) {
    const b0 = JSON.parse(beforeJ) as GameState;
    const allowed = allowedEffects(name); const eff = diffEffects(b0, after);
    if (!allowed.has('*')) for (const e of eff) if (!allowed.has(e)) hits.push({ rule: e === 'sign' ? 'R1-only-sign-signs' : 'R6-effects', detail: `undeclared effect ${e}` });
    for (const e of spec.requires ?? []) if (!eff.has(e)) hits.push({ rule: 'R6-effects', detail: `missing required effect ${e}` });
    const p = spec.post?.(b0, after, args, r);
    if (p) hits.push({ rule: 'R5-graph', detail: `post-condition: ${p}` });
    if (!RESETS.includes(name)) for (const m of MACHINES) {
      const ids = new Set([...m.ids(b0), ...m.ids(after)]);
      for (const id of ids) { const s0 = m.stateOf(b0, id), s1 = m.stateOf(after, id); if (s0 !== s1) bump(COVER.edges, `${m.entity}: ${s0} → ${s1}`); if (s0 !== s1 && !reachable(m, s0, s1, name)) hits.push({ rule: 'R5-graph', detail: `${m.entity} ${id}: ${s0} → ${s1} is not an edge for ${name}` }); }
    }
  } else if (ok && spec.returns === 'result' && (spec.requires ?? []).length) hits.push({ rule: 'R6-effects', detail: 'reported success but changed nothing' });
  hits.push(...invariants(after));
  return { hits, r };
}

/** Run in a sandbox: the game is restored afterwards. */
function sandbox<T>(f: () => T): T { const snap = G(); try { return f(); } finally { useGame.setState({ game: snap }); } }

// ---------------------------------------------------------------------------
// Random plausible actions (valid and invalid) drawn from the current state.
// ---------------------------------------------------------------------------
const pick = <T,>(rng: () => number, xs: T[]): T | undefined => (xs.length ? xs[Math.floor(rng() * xs.length)] : undefined);
const year = (g: GameState) => 2020 + g.month / 12;
const PLANT = ALL_ITEMS.filter((i) => i.kind === 'power' || i.kind === 'cooling').map((i) => i.id);
const UPLINKS = ALL_ITEMS.filter((i) => i.kind === 'uplink').map((i) => i.id);
const COOL = ['air', 'rdhx', 'dlc', 'immersion'];

function candidates(g: GameState, rng: () => number): [ActionName, any[]][] {
  const out: [ActionName, any[]][] = [];
  const offer = pick(rng, g.availableContracts); const act = pick(rng, g.activeContracts); const cl = pick(rng, g.clusters);
  const racks = g.halls.flatMap((h) => h.racks); const rack = pick(rng, racks); const hall = pick(rng, g.halls)!;
  const freeOnline = racks.filter((r) => r.status === 'online' && !r.clusterId).map((r) => r.id);
  const tpls = TEMPLATES.filter((t) => t.availableFrom <= year(g) && !(t.eolAfter && year(g) > t.eolAfter));
  const t = pick(rng, tpls); const order = pick(rng, g.orders); const inv = pick(rng, Object.keys(g.inventory)); const design = pick(rng, g.racks);
  if (offer) out.push(['acceptContract', [offer.id]]);
  out.push(['acceptContract', ['no-such-offer']]);
  if (act) out.push(['assignContract', [act.contract.id, cl ? [cl.id] : []]], ['assignContract', [act.contract.id, ['cl-999']]], ['unassignContract', [act.contract.id]]);
  if (act && g.clusters.length) { const f = contractFit(g, act.contract); if (f.best) out.push(['assignContract', [act.contract.id, [f.best.cluster.id]]]); }
  if (offer && rng() < 0.5) {
    const opts = buildOptions(g, offer).filter((o) => o.cost <= g.cash); const o = pick(rng, opts);
    if (o) out.push(['startEasy', [offer.id, o.t.id, o.racks]], ['startEasy', [offer.id, o.t.id, Math.max(0, o.racks - 1)]]);
  }
  out.push(['startEasy', [offer?.id ?? 'x', 'no-such-template', 1]]);
  const target = act?.contract.id ?? offer?.id;
  if (target && freeOnline.length) out.push(['assignRacks', [target, freeOnline.slice(0, 1 + Math.floor(rng() * freeOnline.length))]]);
  if (target && rack) out.push(['assignRacks', [target, [rack.id]]]);
  if (t) out.push(['buyTemplate', [t.id, 1 + Math.floor(rng() * 3)]], ['buyTemplate', [t.id, 0]]);
  out.push(['buyTemplate', ['no-such-template', 1]]);
  const part = pick(rng, [...PLANT, ...(t ? t.tray.parts.map((p) => p.itemId) : [])]);
  if (part) out.push(['buy', [part, 1 + Math.floor(rng() * 4)]], ['buy', [part, -1]], ['buy', [part, NaN]]);
  out.push(['buy', [pick(rng, UPLINKS)!, 1]]);
  if (order) out.push(['cancelOrder', [order.id]], ['reduceOrder', [order.id, Math.floor(rng() * (order.racks ?? order.qty) * 1.5)]]);
  out.push(['cancelOrder', ['no-such-order']]);
  if (design) out.push(['placeRack', [hall.id, design.id]], ['reserveRacks', [design.id, 1]]);
  out.push(['placeRack', ['hall-99', design?.id ?? 'x']]);
  if (freeOnline.length) { const ids = freeOnline.slice(0, 1 + Math.floor(rng() * Math.min(8, freeOnline.length))); const f = autoFabric(g, ids, 0); if (f) out.push(['createCluster', [`W${g.month}`, ids, f.fabric]]); }
  if (rack && cl) out.push(['createCluster', ['dup', [rack.id], cl.fabric]]);
  out.push(['createCluster', ['empty', [], cl?.fabric]]);
  if (cl && rng() < 0.3) out.push(['disbandCluster', [cl.id]]);
  out.push(['disbandCluster', ['cl-999']]);
  if (rng() < 0.15) out.push(['buildHall', ['Walk hall', pick(rng, COOL), 4 + Math.floor(rng() * 8)]]);
  out.push(['buildHall', ['tiny', 'air', 2]], ['expandHall', [hall.id, 1]], ['expandHall', [hall.id, 0]]);
  const plantInv = pick(rng, Object.keys(g.inventory).filter((id) => PLANT.includes(id)));
  if (plantInv) out.push([getItem(plantInv)!.kind === 'power' ? 'installPower' : 'installCooling', [hall.id, plantInv, 1]]);
  if (inv) out.push(['installPower', [hall.id, inv, 1]], ['installCooling', [hall.id, inv, 1]], ['sellInventory', [inv, 1]], ['sellInventory', [inv, 1e9]]);
  const up = pick(rng, UPLINKS)!; out.push(['buyUplink', [up]], ['dropUplink', [up]]);
  out.push(['takeLoan', [5_000_000]], ['takeLoan', [1e13]], ['takeLoan', [-1]], ['repayLoan', [1_000_000]], ['repayLoan', [1e13]]);
  out.push(['hireStaff', [1 + Math.floor(rng() * 3)]], ['hireStaff', [0]], ['fireStaff', [1]], ['fireStaff', [1000]]);
  const po = pick(rng, g.powerOffers ?? []); if (po) out.push(['signPower', [po.id]], ['signPower', [po.id, po.mw * 1.5]]);
  out.push(['signPower', ['no-such-ppa']]);
  if (cl) out.push(['setSpot', [cl.id, rng() < 0.5]]);
  if (rack) out.push(['setSpotRack', [rack.id, rng() < 0.5]], ['decommissionRack', [rack.id]]);
  out.push(['setSpotReserve', [Math.round(rng() * 300) / 100]], ['decommissionRack', ['RK-9999']]);
  const v = pick(rng, VENDORS)!; out.push(['signFramework', [v.id, 2_000_000 + Math.floor(rng() * 8) * 1_000_000, 6 + Math.floor(rng() * 12)]], ['signFramework', [v.id, 10, 12]]);
  const fw = pick(rng, g.frameworks ?? []); if (fw) out.push(['cancelFramework', [fw.id]]);
  out.push(['setPolicy', [Math.floor(rng() * 5), Math.floor(rng() * 4)]]);
  out.push(['resolveDilemma', [Math.floor(rng() * 3)]], ['ackNews', []], ['ackStory', []], ['stepEasy', []]);
  out.push(['save', ['walk']], ['load', ['no-such-slot']]);
  if (rng() < 0.05) out.push(['load', ['walk']]);
  return out;
}

// ---------------------------------------------------------------------------
// UI ⇄ engine agreement on the current state (sandboxed).
// ---------------------------------------------------------------------------
function agreement(g: GameState, rng: () => number, ki: Map<string, number>): Hit[] {
  // Each block mirrors the gate expression of a Godot control (file:control) and checks the action it enables:
  // enabled ⇒ succeeds; disabled ⇒ would fail (nothing servable is hidden). Failures must always be explained.
  const out: Hit[] = []; const bad = (d: string) => out.push({ rule: 'R7-enabled-succeeds', detail: d });
  // contracts.gd _offer: "SIGN & START SERVING" (verdict ready) = acceptContract + assignContract([best]); "SIGN NOW · DEPLOY LATER" = acceptContract.
  for (const c of g.availableContracts) {
    const f = contractFit(g, c);
    const r = sandbox(() => { const a = S().acceptContract(c.id) as ActionResult; if (!a.ok || f.verdict !== 'ready' || !f.best) return a; return S().assignContract(c.id, [f.best.cluster.id]) as ActionResult; });
    if (!r.ok) bad(`${c.id}: ${f.verdict === 'ready' ? 'SIGN & START SERVING' : 'SIGN NOW'} is enabled but fails: ${r.message} ${JSON.stringify(r.issues ?? []).slice(0, 200)}`);
    if (f.verdict !== 'ready' && f.best) { const x = sandbox(() => { S().acceptContract(c.id); return S().assignContract(c.id, [f.best!.cluster.id]) as ActionResult; }); if (x.ok) bad(`${c.id}: contractFit says ${f.verdict} but its best cluster serves it — the UI hides a servable offer`); }
  }
  // contracts.gd _pending: ASSIGN & GO LIVE preselects [best] only when verdict == ready and is disabled with no selection.
  for (const a of g.activeContracts.filter((x) => !x.clusterIds.length)) {
    const f = contractFit(g, a.contract); if (!f.best) continue;
    const r = sandbox(() => S().assignContract(a.contract.id, [f.best!.cluster.id]) as ActionResult);
    if (f.verdict === 'ready' && !r.ok) bad(`${a.contract.id}: ASSIGN & GO LIVE (preselected best) fails: ${r.message}`);
    if (f.verdict !== 'ready' && r.ok) bad(`${a.contract.id}: verdict ${f.verdict} (nothing preselected) but assigning its best cluster works`);
    if (!r.ok && !r.message.trim()) out.push({ rule: 'R2-feedback', detail: 'assign failure without message' });
  }
  // contracts.gd _needs (offers, and pending contracts with signed_at = deployBy): afford = orderCost ≤ cash;
  //   EASY PATH enabled = afford and canStartEasy; Just order enabled = afford and canOrder.
  const subjects = [...g.availableContracts.map((c) => ({ c, at: undefined as number | undefined })), ...g.activeContracts.filter((x) => !x.clusterIds.length).map((x) => ({ c: x.contract, at: x.deployBy ?? x.startMonth + 4 }))];
  const sub = pick(rng, subjects);
  if (sub && contractFit(g, sub.c).verdict !== 'ready') for (const o of buildOptions(g, sub.c, sub.at)) {
    const afford = o.orderCost <= g.cash;
    const easyOn = afford && o.canStartEasy, justOn = afford && o.canOrder;
    if (!afford && (o.canOrder || o.canStartEasy)) bad(`${o.t.id}: canOrder/canStartEasy true although orderCost ${o.orderCost} > cash`);
    if (afford && !o.canStartEasy && !o.easyBlocker) bad(`${o.t.id}: EASY PATH disabled with no easyBlocker to show`);
    if (afford && !o.canOrder && !o.orderBlocker) bad(`${o.t.id}: Just order disabled with no orderBlocker to show`);
    const just = sandbox(() => { const n0 = G().activeContracts.length; const r = S().buyTemplate(o.t.id, o.racks) as ActionResult; return { r, signed: G().activeContracts.length !== n0 }; });
    if (just.signed) out.push({ rule: 'R1-only-sign-signs', detail: 'buyTemplate signed a contract' });
    if (justOn !== just.r.ok) bad(`Just order ${o.t.id}×${o.racks}: enabled=${justOn} but buyTemplate ok=${just.r.ok} (${just.r.message})`);
    else if (!just.r.ok && o.orderBlocker && just.r.message !== o.orderBlocker) bad(`orderBlocker "${o.orderBlocker}" ≠ buyTemplate "${just.r.message}"`);
    const easy = sandbox(() => S().startEasy(sub.c.id, o.t.id, o.racks) as ActionResult);
    if (!easyOn && easy.ok && sub.at !== undefined && o.canOrder && !o.fitsRamp) { ki.set('KI-easy-pending-deadline', (ki.get('KI-easy-pending-deadline') ?? 0) + 1); continue; }
    if (easyOn !== easy.ok) bad(`EASY PATH ${sub.at === undefined ? 'offer' : 'pending'} ${sub.c.id} ${o.t.id}×${o.racks}: enabled=${easyOn}${o.easyBlocker ? ` (${o.easyBlocker})` : ''} but startEasy ok=${easy.ok} (${easy.message})`);
  }
  // procure.gd ORDER: disabled = quote.cost > cash or quote.unavailable or not quote.orderable (shows quote.blocker).
  const t = pick(rng, TEMPLATES.filter((x) => x.availableFrom <= year(g) + 1));
  if (t) {
    const n = 1 + Math.floor(rng() * 4); const q = QUERIES.quote(t.id, n);
    const on = !(q.cost > g.cash) && !q.unavailable.length && q.orderable !== false;
    const r = sandbox(() => S().buyTemplate(t.id, n) as ActionResult);
    if (on !== r.ok) bad(`ORDER ${t.id}×${n}: enabled=${on} (cost ${q.cost}, cash ${Math.round(g.cash)}, orderable ${q.orderable}) but buyTemplate ok=${r.ok} (${r.message})`);
    else if (!r.ok && !(q.cost > g.cash) && q.blocker && r.message !== q.blocker) bad(`quote.blocker "${q.blocker}" ≠ buyTemplate "${r.message}"`);
  }
  // ops.gd Sign framework: frameworkQuote.valid ⇔ signFramework ok.
  const v = pick(rng, VENDORS)!; const commit = [1e6, 3e6, 2e7, 5e8][Math.floor(rng() * 4)]; const months = [3, 6, 12, 40][Math.floor(rng() * 4)];
  const fq = QUERIES.frameworkQuote(v.id, commit, months); const fr = sandbox(() => S().signFramework(v.id, commit, months) as ActionResult);
  if (fq.valid !== fr.ok) bad(`frameworkQuote.valid=${fq.valid} but signFramework ok=${fr.ok} (${fr.message})`);
  // stock.gd DEPLOY 1 (rackReadiness.buildableNow > 0) and facility.gd PLACE RACK (inventory ≥ BOM and buildableNow) vs placeRack's parts rule.
  for (const d of g.racks) {
    const rr = QUERIES.rackReadiness(d.id, 1); const bom = QUERIES.rackBom(d.id) ?? {};
    if ((rr.buildableNow > 0) !== partsFree(g, d.id)) bad(`rackReadiness(${d.id}).buildableNow=${rr.buildableNow} disagrees with placeRack's parts check`);
    const placeOn = Object.entries(bom).every(([id, n]) => (g.inventory[id] ?? 0) >= (n as number)) && rr.buildableNow > 0;
    const r = sandbox(() => S().placeRack(g.halls[0].id, d.id) as ActionResult);
    const partsRefused = !r.ok && (r.issues ?? []).some((i) => i.code === 'missing-parts');
    if (placeOn && partsRefused) bad(`PLACE RACK / DEPLOY 1 ${d.id} enabled but refused for parts: ${r.message}`);
    if (!placeOn && r.ok) bad(`PLACE RACK ${d.id} disabled but placeRack would succeed`);
  }
  // ops.gd Repay $1M / $5M: disabled = debt ≤ 0 or cash < amt or amt > debt. "Repay all affordable": all = int(min(debt, cash)), disabled = debt ≤ 0 or all ≤ 0.
  for (const amt of [1e6, 5e6]) { const on = !(g.debt <= 0 || g.cash < amt || amt > g.debt); const r = sandbox(() => S().repayLoan(amt) as ActionResult); if (on !== r.ok) bad(`Repay ${amt}: enabled=${on} but repayLoan ok=${r.ok} (${r.message})`); }
  { const all = Math.trunc(Math.min(g.debt, g.cash)); const on = !(g.debt <= 0 || all <= 0); if (on) { const r = sandbox(() => S().repayLoan(all) as ActionResult); if (!r.ok) bad(`Repay all affordable (${all}): ${r.message}`); } }
  // facility.gd floor (+N positions) and plant Buy 1.
  for (const n of [1, 5]) { const q = QUERIES.floorQuote(n); const r = sandbox(() => S().expandHall(g.halls[0].id, n) as ActionResult); if ((q.cost <= g.cash) !== r.ok) out.push({ rule: 'R7-enabled-succeeds', detail: `floorQuote(${n}) affordable=${q.cost <= g.cash} but expandHall ok=${r.ok}` }); }
  const offers = QUERIES.offersAll(); const plant = pick(rng, PLANT)!; const po = offers[plant];
  if (po?.available && po.unitPrice <= g.cash) { const r = sandbox(() => S().buy(plant, 1) as ActionResult); if (!r.ok) out.push({ rule: 'R7-enabled-succeeds', detail: `plant Buy 1 ${plant}: ${r.message}` }); }
  // network.gd BUILD CLUSTER: evaluateCluster without errors ⇔ createCluster ok (free online racks only, as the UI offers).
  const free = g.halls.flatMap((h) => h.racks).filter((r) => r.status === 'online' && !r.clusterId).map((r) => r.id);
  if (free.length) {
    const ids = free.slice(0, 1 + Math.floor(rng() * free.length)); const af = autoFabric(g, ids, 0);
    if (af) { const st = QUERIES.evaluateCluster({ id: 'draft', name: 'draft', rackIds: ids, fabric: af.fabric }); const r = sandbox(() => S().createCluster('draft', ids, af.fabric) as ActionResult); const clean = !st.issues.some((i: any) => i.severity === 'error'); if (clean !== r.ok) out.push({ rule: 'R7-enabled-succeeds', detail: `evaluateCluster clean=${clean} but createCluster ok=${r.ok} (${r.message})` }); }
  }
  // ops.gd Lifecycle ▸ Sell (enabled when not clustered).
  const row = pick(rng, QUERIES.lifecycle().rows.filter((x: any) => !x.clusterId) as any[]);
  if (row) { const r = sandbox(() => S().decommissionRack(row.id) as ActionResult); if (!r.ok) out.push({ rule: 'R7-enabled-succeeds', detail: `Sell ${row.id}: ${r.message}` }); }
  return out;
}

// ---------------------------------------------------------------------------
// (d) The graph covers the engine and the GUI.
// ---------------------------------------------------------------------------
const gdFiles = (dir: string): string[] => readdirSync(dir).flatMap((f: string) => { const p = join(dir, f); return statSync(p).isDirectory() ? (f === '.godot' || f === 'build' || f === 'addons' ? [] : gdFiles(p)) : p.endsWith('.gd') ? [p] : []; });

describe('interaction graph covers the engine and the GUI (R9)', () => {
  it('every bridge action is modelled, and nothing else', () => {
    const modelled = ACTIONS_SPEC.map((s) => s.name).sort();
    expect(new Set(modelled).size).toBe(modelled.length);
    expect(modelled).toEqual([...ACTIONS].sort());
    for (const n of INTERNAL_ACTIONS) expect(typeof S()[n]).toBe('function');
  });
  it('every b.act(...) in godot/ names a modelled action, and every UI binding exists in its file', () => {
    const files = gdFiles(join(ROOT, 'godot'));
    const called = new Map<string, Set<string>>();
    for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\bact\("([A-Za-z]+)"/g)) { const rel = f.slice(ROOT.length + 1); (called.get(m[1]) ?? called.set(m[1], new Set()).get(m[1])!).add(rel); }
    for (const [name, where] of called) expect(SPEC[name as ActionName], `${name} called from ${[...where]}`).toBeDefined();
    for (const s of ACTIONS_SPEC) for (const u of s.ui) {
      const src = readFileSync(join(ROOT, u.file), 'utf8');
      expect(src.includes(`"${s.name}"`), `${s.name}: ${u.file} does not call it (${u.control})`).toBe(true);
    }
    // every GUI call site is documented in the graph
    for (const [name, where] of called) for (const w of where) expect(SPEC[name as ActionName].ui.some((u) => u.file === w), `${name} is called from ${w} but has no UI binding there`).toBe(true);
  });
  it('docs/INTERACTIONS.md documents every action, lifecycle and known issue', () => {
    const doc = readFileSync(join(ROOT, 'docs/INTERACTIONS.md'), 'utf8');
    for (const s of ACTIONS_SPEC) expect(doc.includes(`**${s.name}**`), `${s.name} missing from the action tables`).toBe(true);
    for (const m of MACHINES) expect(doc.includes(`### ${m.entity}`), `${m.entity} lifecycle missing`).toBe(true);
    for (const k of Object.keys(KNOWN_ISSUES)) expect(doc.includes(k), `${k} missing`).toBe(true);
  });
  it('every b.q(...) in godot/ names an existing query', () => {
    for (const f of gdFiles(join(ROOT, 'godot'))) for (const m of readFileSync(f, 'utf8').matchAll(/\bq\("([A-Za-z]+)"/g)) expect(QUERIES[m[1]], `${m[1]} in ${f}`).toBeTypeOf('function');
  });
  it('the lifecycle graphs are well-formed', () => {
    for (const m of MACHINES) for (const t of m.transitions) {
      expect(m.states[t.from], `${m.entity}: unknown state ${t.from}`).toBeDefined();
      expect(m.states[t.to], `${m.entity}: unknown state ${t.to}`).toBeDefined();
      for (const b of t.by) expect(b === 'tick' || !!SPEC[b as ActionName], `${m.entity}: unknown driver ${b}`).toBe(true);
    }
    for (const s of ACTIONS_SPEC) for (const c of s.calls ?? []) expect(c === 'tick' || !!SPEC[c as ActionName]).toBe(true);
    for (const s of ACTIONS_SPEC) for (const k of s.knownIssues ?? []) expect(KNOWN_ISSUES[k], k).toBeDefined();
    for (const s of ACTIONS_SPEC) for (const g of s.guards) if (g.knownIssue) expect(KNOWN_ISSUES[g.knownIssue], g.knownIssue).toBeDefined();
  });
  it('R1: only acceptContract signs directly; everything that may sign does so by calling it', () => {
    for (const s of ACTIONS_SPEC) if (s.name !== 'acceptContract' && !['newGame', 'load', 'nextMonth'].includes(s.name)) expect(s.effects.includes('sign' as any), s.name).toBe(false);
    for (const n of ['buy', 'buyTemplate', 'placeRack', 'createCluster', 'stepEasy', 'assignContract'] as ActionName[]) expect(allowedEffects(n).has('sign'), n).toBe(false);
    for (const n of ['startEasy', 'assignRacks'] as ActionName[]) expect(allowedEffects(n).has('sign'), n).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (a) Conformance on crafted states.
// ---------------------------------------------------------------------------
const expectClean = (name: ActionName, args: any[]) => { const { hits, r } = verify(name, args); expect(hits.filter((h) => !h.ki), `${name}(${JSON.stringify(args)}): ${JSON.stringify(hits)}`).toEqual([]); return r!; };
const fresh = (seed = 3, mode: GameMode = 'operator') => { S().newGame(seed, mode); return G(); };
const months = (n: number) => { for (let i = 0; i < n; i++) S().nextMonth(); };

describe('conformance on crafted states', () => {
  it('every failing call is explained and changes nothing', () => {
    fresh();
    const g = G(); const offer = g.availableContracts[0];
    const calls: [ActionName, any[]][] = [
      ['acceptContract', ['nope']], ['assignContract', [offer.id, []]], ['unassignContract', [offer.id]], ['assignRacks', [offer.id, []]], ['startEasy', [offer.id, 'nope', 1]],
      ['buy', ['nope', 1]], ['buy', ['transit-10g-a', 1]], ['buy', [PLANT[0], 0]], ['buyTemplate', ['nope', 1]], ['buyTemplate', [TEMPLATES[0].id, 0]], ['adoptTemplate', ['nope']],
      ['cancelOrder', ['nope']], ['reduceOrder', ['nope', 1]], ['buildHall', ['x', 'air', 3]], ['buildHall', ['x', 'air', 201]], ['expandHall', ['nope', 1]], ['expandHall', ['hall-1', 0]], ['expandHall', ['hall-1', 1e6]],
      ['installPower', ['hall-1', 'nope', 1]], ['installCooling', ['hall-1', PLANT[0], 1]], ['buyUplink', ['nope']], ['dropUplink', ['nope']], ['reserveRacks', ['nope', 1]],
      ['placeRack', ['hall-1', 'nope']], ['createCluster', ['x', [], undefined]], ['createCluster', ['x', ['RK-0001'], undefined]], ['disbandCluster', ['nope']],
      ['takeLoan', [0]], ['takeLoan', [1e15]], ['repayLoan', [1]], ['hireStaff', [0]], ['hireStaff', [51]], ['fireStaff', [5]], ['signFramework', ['nope', 1e7, 12]], ['signFramework', [VENDORS[0].id, 1, 12]],
      ['cancelFramework', ['nope']], ['setPolicy', [4, 0]], ['setPolicy', [1, 3]], ['signPower', ['nope']], ['setSpot', ['nope', true]], ['setSpotRack', ['nope', true]],
      ['decommissionRack', ['nope']], ['sellInventory', ['nope', 1]], ['sellInventory', [PLANT[0], 1]], ['resolveDilemma', [0]], ['load', ['empty-slot']],
    ];
    for (const [n, a] of calls) { const r = expectClean(n, a); expect(r.ok, `${n} should fail`).toBe(false); }
  });

  it('manual path: ordering never signs; sign → deploy → cluster → serve → release → disband follows the graph', () => {
    let found = false;
    for (let seed = 1; seed <= 12 && !found; seed++) {
      fresh(seed, 'learner');
      const g = G();
      for (const c of g.availableContracts) {
        const o = buildOptions(g, c).find((x) => x.fitsRamp && x.cost < g.cash / 2 && x.racks <= 8 && x.hallGaps.length === 0 && x.t.rack.cooling === 'air');
        if (!o) continue;
        found = true;
        const r = expectClean('buyTemplate', [o.t.id, o.racks]);
        expect(r.ok, r.message).toBe(true);
        expect(G().activeContracts.length).toBe(0);              // ordering never signs
        expect(expectClean('acceptContract', [c.id]).ok).toBe(true);
        expect(MACHINES[0].stateOf(G(), c.id)).toBe('pending');
        for (let i = 0; i < 12 && G().orders.length; i++) S().nextMonth();
        for (let i = 0; i < o.racks; i++) expect(expectClean('placeRack', ['hall-1', `rack-${o.t.id}`]).ok).toBe(true);
        for (let i = 0; i < 6 && G().halls[0].racks.some((x) => x.status !== 'online'); i++) S().nextMonth();
        const ids = G().halls[0].racks.filter((x) => x.status === 'online').map((x) => x.id);
        expect(ids.length).toBeGreaterThan(0);
        const fab = autoFabric(G(), ids, c.kind === 'training' ? c.minScaleOutGBsPerAccel : 0)!;
        expect(expectClean('createCluster', ['Manual', ids, fab.fabric]).ok).toBe(true);
        const cid = G().clusters.at(-1)!.id;
        if (!G().activeContracts.some((a) => a.contract.id === c.id)) break; // walked while racks failed burn-in: still a valid path
        const f = contractFit(G(), c);
        const a = expectClean('assignContract', [c.id, [cid]]);
        expect(a.ok, `${f.verdict}: ${a.message} ${JSON.stringify(a.issues)}`).toBe(f.verdict === 'ready');
        if (a.ok) {
          expect(MACHINES[0].stateOf(G(), c.id)).toBe('serving');
          expect(expectClean('unassignContract', [c.id]).ok).toBe(true);
          expect(MACHINES[0].stateOf(G(), c.id)).toBe('pending');
          expect(expectClean('assignContract', [c.id, [cid]]).ok).toBe(true);
          expect(expectClean('disbandCluster', [cid]).ok).toBe(true);
          expect(MACHINES[0].stateOf(G(), c.id)).toBe('pending');
          expect(G().halls[0].racks.every((x) => !x.clusterId)).toBe(true);
        }
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('Easy path: signs at start, then orders, installs, deploys, clusters and assigns on its own; projects only move along the graph', () => {
    let done = false;
    for (let seed = 1; seed <= 8 && !done; seed++) {
      fresh(seed, 'learner');
      const g = G();
      const c = g.availableContracts.find((x) => buildOptions(g, x).some((o) => o.fitsRamp && o.cost < g.cash / 3)); if (!c) continue;
      const o = buildOptions(g, c).find((x) => x.fitsRamp && x.cost < g.cash / 3)!;
      const r = expectClean('startEasy', [c.id, o.t.id, o.racks]);
      expect(r.ok, r.message).toBe(true);
      expect(MACHINES[0].stateOf(G(), c.id)).toBe('pending');
      expect(G().orders.length).toBeGreaterThan(0);
      const pid = G().projects!.at(-1)!.id; const stages = [G().projects!.at(-1)!.stage];
      for (let i = 0; i < 24; i++) {
        const { hits } = verify('nextMonth', []); expect(hits.filter((h) => !h.ki)).toEqual([]);
        const st = G().projects!.find((p) => p.id === pid)!.stage; if (st !== stages.at(-1)) stages.push(st);
        if (st === 'done' || st === 'failed') break;
      }
      const order = ['building', 'commissioning', 'clustering', 'assigning', 'done'];
      for (let i = 1; i < stages.length; i++) expect(stages[i] === 'failed' || order.indexOf(stages[i]) > order.indexOf(stages[i - 1]), stages.join(' → ')).toBe(true);
      if (stages.at(-1) === 'done') { expect(MACHINES[0].stateOf(G(), c.id)).toMatch(/serving|absent/); done = true; }
    }
    expect(done).toBe(true);
  });

  it('cancelling an Easy-path order fails its project and releases the reservation', () => {
    fresh(2, 'learner'); const g = G();
    const c = g.availableContracts.find((x) => buildOptions(g, x).some((o) => o.fitsRamp && o.cost < g.cash / 3))!;
    const o = buildOptions(g, c).find((x) => x.fitsRamp && x.cost < g.cash / 3)!;
    expect(S().startEasy(c.id, o.t.id, o.racks).ok).toBe(true);
    const batch = G().orders.find((x) => x.batch)!;
    expect(expectClean('cancelOrder', [batch.id]).ok).toBe(true);
    expect(G().projects!.at(-1)!.stage).toBe('failed');
    expect(G().rackReserve?.[`rack-${o.t.id}`] ?? 0).toBe(0);
    expect(G().activeContracts.some((a) => a.contract.id === c.id)).toBe(true); // still signed: the player must now deliver by hand
  });
});

// ---------------------------------------------------------------------------
// (b) + (c) Seeded model-based random walk.
// ---------------------------------------------------------------------------
const SEEDS = [11, 23, 37, 41, 59];
const MONTHS = 60;
const PER_MONTH = 8;
const kiSeen = new Map<string, number>();

describe('model-based random walk', () => {
  for (const mode of ['learner', 'operator', 'tycoon'] as GameMode[]) it(`${mode}: ${SEEDS.length} seeds × ${MONTHS} months, every action checked against the graph`, () => {
    const violations: string[] = []; let actions = 0;
    for (const seed of SEEDS) {
      const rng = mulberry32(seed * 7919 + mode.length);
      S().newGame(seed, mode);
      for (let m = 0; m < MONTHS; m++) {
        if (G().status !== 'playing') break;
        if (m % 3 === 0) for (const h of agreement(G(), rng, kiSeen)) violations.push(`[${mode} s${seed} m${G().month}] UI ${h.rule}: ${h.detail}`);
        const cands = candidates(G(), rng);
        for (let k = 0; k < PER_MONTH; k++) {
          const c = pick(rng, cands)!; const [name, args] = c;
          if (failingGuard(name, G(), args)?.knownIssue) continue; // known-bad args are pinned below, not walked
          const { hits } = verify(name, args); actions++;
          for (const h of hits) { if (h.ki) { kiSeen.set(h.ki, (kiSeen.get(h.ki) ?? 0) + 1); continue; } violations.push(`[${mode} s${seed} m${G().month}] ${name}(${JSON.stringify(args).slice(0, 100)}) ${h.rule}: ${h.detail}`); }
        }
        const { hits } = verify('nextMonth', []); actions++;
        for (const h of hits) { if (h.ki) { kiSeen.set(h.ki, (kiSeen.get(h.ki) ?? 0) + 1); continue; } violations.push(`[${mode} s${seed} m${G().month}] nextMonth ${h.rule}: ${h.detail}`); }
      }
    }
    expect(actions).toBeGreaterThan(SEEDS.length * MONTHS);
    expect(violations.slice(0, 25), `${violations.length} violations`).toEqual([]);
  });
  it('report: known issues reached by the walk', () => {
    // Informational: printed for the lead; the issues themselves are pinned by it.fails below.
    console.log('known issues hit during the walk:', Object.fromEntries([...kiSeen].sort()));
    console.log('action outcomes (ok/fail):', Object.fromEntries([...COVER.calls].sort().map(([k, v]) => [k, `${v.ok}/${v.fail}`])));
    console.log('lifecycle edges observed:', Object.fromEntries([...COVER.edges].sort()));
    // the walk must actually reach the interesting parts of the graph, not just bounce off guards
    for (const e of ['contract: offered → pending', 'contract: pending → serving', 'contract: serving → absent', 'contract: pending → absent', 'rack: absent → installing', 'rack: commissioning → online', 'rackMembership: free → clustered', 'cluster: absent → idle', 'cluster: idle → serving', 'order: absent → open', 'order: open → absent', 'project: absent → building'])
      expect(COVER.edges.get(e) ?? 0, `walk never exercised ${e}`).toBeGreaterThan(0);
    expect([...COVER.edges.keys()].some((k) => /^project: \w+ → done$/.test(k)), 'no Easy-path project ever finished').toBe(true);
    for (const s of ACTIONS_SPEC) if (!['newGame', 'setMode', 'setSite', 'adoptTemplate', 'saveTray', 'saveRack'].includes(s.name)) expect(COVER.calls.has(s.name), `walk never called ${s.name}`).toBe(true);
    for (const k of kiSeen.keys()) expect(KNOWN_ISSUES[k], k).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Fixed inconsistencies (formerly KNOWN_ISSUES), kept as regression tests. A newly found one goes into KNOWN_ISSUES
// with an `it.fails` test asserting the correct behaviour; when it is fixed vitest flags it, and it moves up here.
// ---------------------------------------------------------------------------
const easyCase = () => {
  for (let seed = 1; seed < 20; seed++) {
    fresh(seed); const g = G();
    for (const c of g.availableContracts) { const o = buildOptions(g, c).find((x) => x.fitsRamp); if (o) return { c, o }; }
  }
  throw new Error('no servable offer');
};
const setCash = (cash: number) => useGame.setState({ game: { ...G(), cash } });
const J = (x: unknown) => JSON.stringify(x);

describe('fixed inconsistencies (regressions)', () => {
  it('startEasy is all-or-nothing: refused at list price + $1 leaves the game exactly as it was; orderCost is enough', () => {
    const { c, o } = easyCase(); expect(o.orderCost).toBeGreaterThan(o.cost); setCash(o.cost + 1);
    const before = J(G()); const r = S().startEasy(c.id, o.t.id, o.racks);
    expect(r.ok).toBe(false); expect(r.message).toMatch(/Insufficient funds/); expect(J(G())).toBe(before);
    const o2 = buildOptions(G(), c).find((x) => x.t.id === o.t.id)!; expect(o2.canStartEasy).toBe(false); expect(o2.easyBlocker).toMatch(/Insufficient funds/);
    setCash(o.orderCost); const o3 = buildOptions(G(), c).find((x) => x.t.id === o.t.id)!; expect(o3.canStartEasy).toBe(true);
    expect(S().startEasy(c.id, o.t.id, o.racks).ok).toBe(true);
  });
  it('quote() is exactly what buyTemplate charges (spares + vendor discounts)', () => {
    fresh(1); const t = TEMPLATES.find((x) => QUERIES.quote(x.id, 2).unavailable.length === 0 && x.availableFrom <= 2020.95)!;
    const q = QUERIES.quote(t.id, 2); expect(q.orderable).toBe(true); expect(q.lines.some((l: any) => l.spare)).toBe(true);
    setCash(q.cost - 1); expect(S().buyTemplate(t.id, 2).ok).toBe(false);
    setCash(q.cost); expect(S().buyTemplate(t.id, 2).ok).toBe(true); expect(G().cash).toBe(0);
  });
  it('buyTemplate is atomic: a refused rack order adopts no designs', () => {
    fresh(1); const t = TEMPLATES.find((x) => x.availableFrom <= 2020.95)!; setCash(0);
    const before = J(G()); const r = S().buyTemplate(t.id, 1);
    expect(r.ok).toBe(false); expect(J(G())).toBe(before);
  });
  it('quote.blocker is the exact refusal buyTemplate gives when allocation caps the order', () => {
    fresh(1); let hit: { t: (typeof TEMPLATES)[number]; q: any } | undefined;
    for (let m = 12; m < 120 && !hit; m += 6) { useGame.setState({ game: { ...G(), month: m, cash: 1e12 } }); hit = TEMPLATES.map((t) => ({ t, q: QUERIES.quote(t.id, 64) })).find((x) => x.q.capped.length && !x.q.unavailable.length); }
    expect(hit, 'no allocation-capped template found').toBeDefined(); if (!hit) return;
    expect(hit.q.orderable).toBe(false); expect(S().buyTemplate(hit.t.id, 64).message).toBe(hit.q.blocker);
  });
  it('assignRacks is all-or-nothing: a failed serve-from-racks leaves no signature, cluster, counter or log', () => {
    const { c } = easyCase(); const t = TEMPLATES.find((x) => x.availableFrom <= 2020.95 && x.rack.cooling === 'air')!;
    expect(S().buyTemplate(t.id, 1).ok).toBe(true); months(8); expect(S().placeRack('hall-1', `rack-${t.id}`).ok).toBe(true); months(4);
    const rk = G().halls[0].racks[0]; if (rk.status !== 'online') months(3);
    const big = { ...c, id: 'huge', kind: 'training', minAccelerators: 1e6, deadlineMonth: G().month + 6 } as any;
    useGame.setState({ game: { ...G(), availableContracts: [...G().availableContracts, big] } });
    const before = J(G()); const r = S().assignRacks('huge', [rk.id]);
    expect(r.ok).toBe(false); expect(J(G())).toBe(before);
  });
  it('createCluster refuses racks that are not online', () => {
    fresh(1); const t = TEMPLATES.find((x) => x.availableFrom <= 2020.95 && x.rack.cooling === 'air')!;
    S().buyTemplate(t.id, 1); months(8); expect(S().placeRack('hall-1', `rack-${t.id}`).ok).toBe(true);
    const rk = G().halls[0].racks[0]; expect(rk.status).toBe('installing');
    const fab = autoFabric(G(), [rk.id], 0)!;
    const r = S().createCluster('early', [rk.id], fab.fabric); expect(r.ok).toBe(false); expect(r.message).toMatch(/online/);
  });
  it('a "ready" verdict is backed by a cluster the contract can actually get (busy clusters are not "best")', () => {
    // two identical training offers, one cluster: after the first is served, the second must not read "ready"
    fresh(1); const t = TEMPLATES.find((x) => x.availableFrom <= 2020.95 && x.rack.cooling === 'air')!;
    S().buyTemplate(t.id, 1); months(8); S().placeRack('hall-1', `rack-${t.id}`); months(4);
    const rk = G().halls[0].racks[0]; if (rk.status !== 'online') months(3);
    const fab = autoFabric(G(), [rk.id], 0)!; expect(S().createCluster('one', [rk.id], fab.fabric).ok).toBe(true);
    const mk = (id: string) => ({ kind: 'training', id, customer: id, archetype: 'startup', model: G().availableContracts[0].model, minAccelerators: 1, minScaleUpDomain: 1, minScaleOutGBsPerAccel: 0, minTotalMemGB: 1, durationMonths: 6, pricePerAccelHour: 1, penaltyRate: 0, deadlineMonth: G().month + 3, slaAvailability: 0.9 }) as any;
    useGame.setState({ game: { ...G(), availableContracts: [mk('A'), mk('B')] } });
    expect(contractFit(G(), G().availableContracts[1]).verdict).toBe('ready');
    expect(S().acceptContract('A').ok).toBe(true); expect(S().assignContract('A', [G().clusters[0].id]).ok).toBe(true);
    const f = contractFit(G(), G().availableContracts[0]);
    expect(f.verdict).not.toBe('ready'); expect(f.best!.free).toBe(false); expect(f.best!.busy).toMatch(/A/); expect(f.shortfall).toMatch(/busy/);
    const r = sandbox(() => { S().acceptContract('B'); return S().assignContract('B', [f.best!.cluster.id]); });
    expect(r.ok).toBe(false);
  });
  it('NaN / non-finite arguments are refused with a message and change nothing', () => {
    fresh(1); useGame.setState({ game: { ...G(), inventory: { 'et-padmount-2500': 1 } } });
    const o = G().powerOffers![0];
    for (const [n, a] of [['buildHall', ['x', 'air', NaN]], ['buildHall', ['x', 'air', Infinity]], ['installPower', ['hall-1', 'et-padmount-2500', NaN]], ['installCooling', ['hall-1', 'vt-crah-100', NaN]], ['setSpotReserve', [NaN]], ['signPower', [o.id, NaN]], ['buy', [PLANT.find((id) => QUERIES.offer(id)?.available)!, NaN]]] as [ActionName, any[]][]) {
      const before = J(G()); const r = S()[n](...a); expect(r.ok, `${n}(${a})`).toBe(false); expect(r.message.trim()).not.toBe(''); expect(J(G()), n).toBe(before);
    }
  });
  it('buy(item, 0.5) is refused instead of placing a zero-quantity order', () => { fresh(1); const r = S().buy(PLANT.find((id) => QUERIES.offer(id)?.available)!, 0.5); expect(r.ok).toBe(false); expect(G().orders).toEqual([]); });
  it('buildHall rejects an unknown cooling class', () => { fresh(1); const r = S().buildHall('x', 'plasma', 8); expect(r.ok).toBe(false); expect(r.message).toMatch(/cooling/); expect(G().halls.length).toBe(1); });
  it('setMode ignores an unknown mode', () => { fresh(1); S().setMode('godmode'); expect(G().mode).toBe('operator'); S().setMode('tycoon'); expect(G().mode).toBe('tycoon'); });
  it('reserveRacks refuses a negative or non-numeric count', () => { fresh(1); const t = TEMPLATES[0]; S().adoptTemplate(t.id); expect(S().reserveRacks(`rack-${t.id}`, -2).ok).toBe(false); expect(S().reserveRacks(`rack-${t.id}`, NaN).ok).toBe(false); expect(S().reserveRacks(`rack-${t.id}`, 2).ok).toBe(true); });
  it('no decision takes staff below 1', () => {
    fresh(1);
    const d = DILEMMAS.find((x: any) => x.choices.some((c: any) => (c.effect.staff ?? 0) <= -2))!;
    const ci = d.choices.findIndex((c: any) => (c.effect.staff ?? 0) <= -2);
    useGame.setState({ game: { ...G(), staff: 2, cash: 1e9, story: { shown: [], seen: [], cards: [], open: { id: d.id, month: G().month } } } });
    S().resolveDilemma(ci); expect(G().staff).toBe(1);
  });
});

describe('known issues (it.fails until fixed)', () => {
  it.fails('KI-easy-pending-deadline: startEasy refuses a build that cannot arrive before a signed contract\'s deployBy (as the UI gate says)', () => {
    const { c } = easyCase(); expect(S().acceptContract(c.id).ok).toBe(true);
    useGame.setState({ game: { ...G(), activeContracts: G().activeContracts.map((a) => (a.contract.id === c.id ? { ...a, deployBy: G().month + 1 } : a)) } });
    const by = G().activeContracts.find((a) => a.contract.id === c.id)!.deployBy!;
    const engineOk = new Set(buildOptions(G(), c).filter((x) => x.fitsRamp).map((x) => x.t.id));
    const o = buildOptions(G(), c, by).find((x) => x.canOrder && !x.fitsRamp && engineOk.has(x.t.id))!; expect(o).toBeDefined(); expect(o.canStartEasy).toBe(false);
    expect(S().startEasy(c.id, o.t.id, o.racks).ok).toBe(false);
  });
});

describe('UI gates that used to disagree (regressions)', () => {
  it('Repay: the button rule (debt > 0, cash ≥ amount, amount ≤ debt) is exactly when repayLoan succeeds; above the debt it is refused with a reason', () => {
    fresh(1); useGame.setState({ game: { ...G(), debt: 500_000 } });
    const before = J(G()); const r = S().repayLoan(1_000_000);
    expect(r.ok).toBe(false); expect(r.message).toMatch(/owe/); expect(J(G())).toBe(before);
    expect(S().repayLoan(Math.trunc(Math.min(G().debt, G().cash))).ok).toBe(true); expect(G().debt).toBe(0);
  });
  it('EASY PATH: a build that cannot arrive in the ramp window is not startable (canStartEasy false, easyBlocker says why) and startEasy refuses it without changing anything', () => {
    for (let seed = 1; seed < 30; seed++) {
      fresh(seed); const g = G();
      for (const c of g.availableContracts) for (const o of buildOptions(g, c)) if (o.orderCost <= g.cash && !o.fitsRamp) {
        expect(o.canStartEasy).toBe(false); expect(o.easyBlocker).toMatch(/months/);
        const before = J(G()); const r = S().startEasy(c.id, o.t.id, o.racks);
        expect(r.ok).toBe(false); expect(r.message).toMatch(/months/); expect(J(G())).toBe(before);
        return;
      }
    }
    throw new Error('no late option found');
  });
  it('GUI steps Easy-path projects once per month (nextMonth already does it)', () => {
    expect(readFileSync(join(ROOT, 'godot/main.gd'), 'utf8')).not.toMatch(/act\("nextMonth"\);\s*b\.act\("stepEasy"\)/);
  });
});
