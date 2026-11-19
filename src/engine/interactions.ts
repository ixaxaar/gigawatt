// ===========================================================================
// GIGAWATT — the INTERACTION GRAPH. One declarative description of every player action:
// which entity lifecycles it moves, its preconditions (predicates over the same data the engine
// checks), the side effects it may / must have, and the UI controls that trigger it.
//
// src/engine/interactions.test.ts verifies the engine against this file after every action of a
// seeded random walk, and checks that the Godot screens only call actions modelled here.
// docs/INTERACTIONS.md is the human-readable version.
//
// RULE: a new store action, or a new UI control that calls b.act(...), must be added here first.
// ===========================================================================
import { getItem, VENDORS } from '../data';
import { getTemplate } from '../data/templates';
import { DILEMMAS } from '../sim/story-data';
import { RECRUIT_COST_USD, SEVERANCE_USD } from '../sim/staffing';
import { validateRack } from '../sim/validate';
import { FRAMEWORK_DEPOSIT_PCT, FRAMEWORK_MAX_MONTHS, FRAMEWORK_MIN_COMMIT_USD, FRAMEWORK_MIN_MONTHS, frameworkFor } from '../sim/vendors';
import type { CoolingClass, GameMode, GameState } from '../types';
import type { ActionResult, GameStore } from './api';
import { COOL_LEVEL } from './actions/consts';
import { availableFor, creditLimit, FLOOR_UNIT_COST, offerFor, rackBom, volumeDiscount } from './pricing';

export type ActionName = Exclude<keyof GameStore, 'game'>;
/** Pseudo-actions: things that move state without a player call. */
export type Driver = ActionName | 'tick';

// ---------------------------------------------------------------------------
// Side effects: a coarse, observable classification of how an action changed the game.
// ---------------------------------------------------------------------------
export type Effect =
  | 'sign'          // a contract moved from the offer board into activeContracts
  | 'assign'        // an active contract's cluster set / deploy deadline changed
  | 'close'         // an active contract left (completed / walked)
  | 'offers'        // the offer board changed other than by signing
  | 'cash-' | 'cash+' | 'debt'
  | 'order+' | 'order-'
  | 'inventory' | 'spares' | 'design' | 'reserve'
  | 'hall'          // a hall was built or its shell / plant / floor changed
  | 'rack+' | 'rack-' | 'rack~'   // placed racks appeared / disappeared / changed status
  | 'membership'    // a placed rack joined or left a cluster
  | 'cluster+' | 'cluster-' | 'cluster~'
  | 'project' | 'staff' | 'uplink' | 'power' | 'spot' | 'vendor' | 'policy'
  | 'mode' | 'site' | 'news' | 'story' | 'reputation' | 'utility' | 'month' | 'status';

/** Fields that never count as a side effect (bookkeeping, counters, narration). */
const QUIET = new Set(['log', 'rackSeq', 'clusterSeq', 'stats', 'codexSeen', 'missionsDone']);
const J = (v: unknown) => JSON.stringify(v ?? null);

/** Observable side effects between two states. Unknown changed fields come back as `other:<field>`. */
export function diffEffects(a: GameState, b: GameState): Set<string> {
  const out = new Set<string>();
  const ka = new Set([...Object.keys(a), ...Object.keys(b)]);
  const done = new Set<string>(['availableContracts', 'activeContracts', 'cash', 'orders', 'halls', 'clusters', 'trays', 'racks', 'spotClusters', 'spotRacks', 'spotReserve', 'spotPrice', 'spotHistory', 'powerOffers', 'powerContracts', 'frameworks', 'vendorRel', 'news', 'launchesSeen']);
  // contracts
  const actA = new Map(a.activeContracts.map((x) => [x.contract.id, x])), actB = new Map(b.activeContracts.map((x) => [x.contract.id, x]));
  for (const id of actB.keys()) if (!actA.has(id)) out.add('sign');
  for (const [id, x] of actA) {
    const y = actB.get(id);
    if (!y) { out.add('close'); continue; }
    if (J(x.clusterIds) !== J(y.clusterIds) || x.deployBy !== y.deployBy || x.startMonth !== y.startMonth) out.add('assign');
  }
  const signed = new Set([...actB.keys()].filter((id) => !actA.has(id)));
  if (J(a.availableContracts.filter((c) => !signed.has(c.id))) !== J(b.availableContracts)) out.add('offers');
  if (b.cash < a.cash) out.add('cash-'); else if (b.cash > a.cash || (Number.isNaN(b.cash) && !Number.isNaN(a.cash))) out.add('cash+');
  // orders
  const oa = new Map(a.orders.map((o) => [o.id, o])), ob = new Map(b.orders.map((o) => [o.id, o]));
  for (const id of ob.keys()) if (!oa.has(id)) out.add('order+');
  for (const [id, o] of oa) { const p = ob.get(id); if (!p || J(p) !== J(o)) out.add('order-'); }
  // halls and placed racks
  const shell = (g: GameState) => J(g.halls.map((h) => ({ ...h, racks: undefined, pue: undefined })));
  if (shell(a) !== shell(b)) out.add('hall');
  const ra = new Map(a.halls.flatMap((h) => h.racks).map((r) => [r.id, r])), rb = new Map(b.halls.flatMap((h) => h.racks).map((r) => [r.id, r]));
  for (const id of rb.keys()) if (!ra.has(id)) out.add('rack+');
  for (const [id, r] of ra) {
    const s = rb.get(id);
    if (!s) { out.add('rack-'); continue; }
    if ((r.clusterId ?? '') !== (s.clusterId ?? '')) out.add('membership');
    if (J({ ...r, clusterId: undefined }) !== J({ ...s, clusterId: undefined })) out.add('rack~');
  }
  // clusters
  const ca = new Map(a.clusters.map((c) => [c.id, c])), cb = new Map(b.clusters.map((c) => [c.id, c]));
  for (const id of cb.keys()) if (!ca.has(id)) out.add('cluster+');
  for (const [id, c] of ca) { const d = cb.get(id); if (!d) out.add('cluster-'); else if (J(c) !== J(d)) out.add('cluster~'); }
  if (J(a.trays) !== J(b.trays) || J(a.racks) !== J(b.racks)) out.add('design');
  const simple: Record<string, Effect> = { debt: 'debt', inventory: 'inventory', spareStock: 'spares', rackReserve: 'reserve', projects: 'project', staff: 'staff', uplinks: 'uplink', policy: 'policy', mode: 'mode', site: 'site', story: 'story', reputation: 'reputation', utilityUSDPerKWh: 'utility', month: 'month', status: 'status' };
  for (const [k, e] of Object.entries(simple)) { done.add(k); if (J((a as any)[k]) !== J((b as any)[k])) out.add(e); }
  if (['spotClusters', 'spotRacks', 'spotReserve', 'spotPrice', 'spotHistory'].some((k) => J((a as any)[k]) !== J((b as any)[k]))) out.add('spot');
  if (['powerOffers', 'powerContracts'].some((k) => J((a as any)[k]) !== J((b as any)[k]))) out.add('power');
  if (['frameworks', 'vendorRel'].some((k) => J((a as any)[k]) !== J((b as any)[k]))) out.add('vendor');
  if (['news', 'launchesSeen'].some((k) => J((a as any)[k]) !== J((b as any)[k]))) out.add('news');
  for (const k of ka) if (!done.has(k) && !QUIET.has(k) && J((a as any)[k]) !== J((b as any)[k])) out.add(`other:${k}`);
  return out;
}

// ---------------------------------------------------------------------------
// Entity lifecycles. Each machine can read an entity's state from a GameState, so a test can
// observe every state change an action caused and check it is an edge of this graph.
// ---------------------------------------------------------------------------
export interface Transition { from: string; to: string; by: Driver[]; note?: string }
export interface Machine {
  entity: string;
  doc: string;
  states: Record<string, string>;
  transitions: Transition[];
  /** ids of all instances present in a state (union over before/after is taken by the checker). */
  ids: (g: GameState) => string[];
  /** state of one instance; 'absent' when it does not exist. */
  stateOf: (g: GameState, id: string) => string;
}

const ABSENT = 'absent';
/** Everything the month tick runs, plus the Easy-path step nextMonth performs afterwards. */
const TICK: Driver[] = ['tick', 'nextMonth'];

export const MACHINES: Machine[] = [
  {
    entity: 'contract',
    doc: 'A customer contract: offered on the board, signed (pending deployment), serving, then gone (completed, walked away or expired). Renewals arrive as NEW offers with id `<old>-r<month>`.',
    states: { absent: 'not on the board / no longer active', offered: 'on the market board (availableContracts)', pending: 'signed, no cluster yet; deployBy clock running', serving: 'signed with ≥1 cluster assigned; revenue + SLA clock' },
    ids: (g) => [...g.availableContracts.map((c) => c.id), ...g.activeContracts.map((a) => a.contract.id)],
    stateOf: (g, id) => {
      const a = g.activeContracts.find((x) => x.contract.id === id);
      if (a) return a.clusterIds.length ? 'serving' : 'pending';
      return g.availableContracts.some((c) => c.id === id) ? 'offered' : ABSENT;
    },
    transitions: [
      { from: 'absent', to: 'offered', by: TICK, note: 'fresh offers each month; renewals 4 months before the end of a clean contract or at completion' },
      { from: 'offered', to: 'absent', by: TICK, note: 'deadlineMonth passed, or trimmed by the 10-offer board cap' },
      { from: 'offered', to: 'pending', by: ['acceptContract'], note: 'Sign. The ONLY way to sign apart from Easy Path / Serve-from-racks, which call it.' },
      { from: 'pending', to: 'serving', by: ['assignContract'], note: 'a qualifying cluster set' },
      { from: 'serving', to: 'serving', by: ['assignContract'], note: 'change the cluster set' },
      { from: 'serving', to: 'pending', by: ['unassignContract', 'disbandCluster'], note: 'deployBy = max(deployBy, month+2)' },
      { from: 'pending', to: 'absent', by: TICK, note: 'walked: month > deployBy (one 3-month extension if an Easy-path build is under way); −8 reputation' },
      { from: 'serving', to: 'absent', by: TICK, note: 'completed: monthsServed ≥ durationMonths; reputation gain; renewal offer if clean' },
    ],
  },
  {
    entity: 'rack',
    doc: 'A physical rack on a hall floor. (Racks on order are parts in `orders`, not placed racks: status `ordered` exists in the type but nothing produces it.)',
    states: { absent: 'not on the floor', installing: 'placed, being installed', commissioning: 'burn-in', online: 'serving-capable', failed: 'down (burn-in DOA or a part failure), back at readyMonth' },
    ids: (g) => g.halls.flatMap((h) => h.racks.map((r) => r.id)),
    stateOf: (g, id) => g.halls.flatMap((h) => h.racks).find((r) => r.id === id)?.status ?? ABSENT,
    transitions: [
      { from: 'absent', to: 'installing', by: ['placeRack'], note: 'consumes one rack BOM from free inventory and one reservation' },
      { from: 'installing', to: 'commissioning', by: TICK },
      { from: 'commissioning', to: 'online', by: TICK },
      { from: 'commissioning', to: 'failed', by: TICK, note: 'dead on arrival (burn-in policy changes the odds)' },
      { from: 'online', to: 'failed', by: TICK, note: 'part failure; a spare on the shelf makes it a one-month repair' },
      { from: 'failed', to: 'online', by: TICK },
      { from: 'installing', to: 'absent', by: ['decommissionRack'] },
      { from: 'commissioning', to: 'absent', by: ['decommissionRack'] },
      { from: 'online', to: 'absent', by: ['decommissionRack'], note: 'only when not in a cluster' },
      { from: 'failed', to: 'absent', by: ['decommissionRack'] },
    ],
  },
  {
    entity: 'rackMembership',
    doc: 'Whether a placed rack belongs to a cluster.',
    states: { absent: 'not placed', free: 'placed, in no cluster (may be on spot by itself)', clustered: 'part of exactly one cluster' },
    ids: (g) => g.halls.flatMap((h) => h.racks.map((r) => r.id)),
    stateOf: (g, id) => { const r = g.halls.flatMap((h) => h.racks).find((x) => x.id === id); return !r ? ABSENT : r.clusterId ? 'clustered' : 'free'; },
    transitions: [
      { from: 'absent', to: 'free', by: ['placeRack'] },
      { from: 'free', to: 'clustered', by: ['createCluster'] },
      { from: 'clustered', to: 'free', by: ['disbandCluster'] },
      { from: 'free', to: 'absent', by: ['decommissionRack'] },
    ],
  },
  {
    entity: 'cluster',
    doc: 'A set of racks joined by a scale-out fabric. Ids are never reused.',
    states: { absent: 'does not exist', idle: 'exists, serves no contract', serving: 'assigned to ≥1 active contract' },
    ids: (g) => g.clusters.map((c) => c.id),
    stateOf: (g, id) => (!g.clusters.some((c) => c.id === id) ? ABSENT : g.activeContracts.some((a) => a.clusterIds.includes(id)) ? 'serving' : 'idle'),
    transitions: [
      { from: 'absent', to: 'idle', by: ['createCluster'] },
      { from: 'idle', to: 'serving', by: ['assignContract'] },
      { from: 'serving', to: 'serving', by: ['assignContract'] },
      { from: 'serving', to: 'idle', by: ['unassignContract', 'assignContract'], note: 'released, or dropped from a contract’s new cluster set' },
      { from: 'serving', to: 'idle', by: TICK, note: 'its last contract completed or walked' },
      { from: 'idle', to: 'absent', by: ['disbandCluster'] },
      { from: 'serving', to: 'absent', by: ['disbandCluster'], note: 'its contracts drop back to pending (2-month grace)' },
    ],
  },
  {
    entity: 'order',
    doc: 'An open purchase line. buyTemplate creates a batch (one line per part, shared `batch` id) that is cancelled / reduced as a unit.',
    states: { absent: 'not open', open: 'in transit, arrives at arriveMonth' },
    ids: (g) => g.orders.map((o) => o.id),
    stateOf: (g, id) => (g.orders.some((o) => o.id === id) ? 'open' : ABSENT),
    transitions: [
      { from: 'absent', to: 'open', by: ['buy', 'buyTemplate'] },
      { from: 'open', to: 'open', by: ['reduceOrder'], note: 'qty reduced, 90% of the difference refunded' },
      { from: 'open', to: 'absent', by: ['cancelOrder', 'reduceOrder'], note: 'cancelled (90% refund) or reduced to zero' },
      { from: 'open', to: 'absent', by: TICK, note: 'arrived: parts land in inventory (spare lines on the spares shelf)' },
    ],
  },
  {
    entity: 'project',
    doc: 'An Easy-path build for one contract. It signs (via acceptContract) when started, then installs plant, places racks, clusters and assigns as parts arrive. It never signs anything later.',
    states: { absent: 'none', building: 'waiting for parts / plant, placing racks', commissioning: 'all racks placed, waiting until all are online', clustering: 'building the fabric', assigning: 'assigning the new cluster to its contract', done: 'contract served', failed: 'gave up (order cancelled, contract gone, stuck >10 months)' },
    ids: (g) => (g.projects ?? []).map((p) => p.id),
    stateOf: (g, id) => (g.projects ?? []).find((p) => p.id === id)?.stage ?? ABSENT,
    transitions: [
      { from: 'absent', to: 'building', by: ['startEasy'] },
      { from: 'building', to: 'commissioning', by: ['stepEasy'] },
      { from: 'commissioning', to: 'clustering', by: ['stepEasy'] },
      { from: 'clustering', to: 'assigning', by: ['stepEasy'] },
      { from: 'assigning', to: 'done', by: ['stepEasy'] },
      { from: 'building', to: 'failed', by: ['stepEasy', 'cancelOrder', 'reduceOrder'], note: 'order cancelled, or stuck more than 10 months' },
      { from: 'commissioning', to: 'failed', by: ['stepEasy'], note: 'contract no longer active' },
      { from: 'clustering', to: 'failed', by: ['stepEasy'] },
      { from: 'assigning', to: 'failed', by: ['stepEasy'] },
    ],
  },
  {
    entity: 'hall',
    doc: 'A data hall: cooling class, rack slots, IT power and heat rejection. Halls are never removed.',
    states: { absent: 'not built', built: 'shell exists (power/cooling/floor change via install*/expandHall)' },
    ids: (g) => g.halls.map((h) => h.id),
    stateOf: (g, id) => (g.halls.some((h) => h.id === id) ? 'built' : ABSENT),
    transitions: [{ from: 'absent', to: 'built', by: ['buildHall'] }],
  },
  {
    entity: 'framework',
    doc: 'A vendor framework agreement (commit spend for a discount).',
    states: { absent: 'none', active: 'running until endMonth' },
    ids: (g) => (g.frameworks ?? []).map((f) => f.id),
    stateOf: (g, id) => ((g.frameworks ?? []).some((f) => f.id === id) ? 'active' : ABSENT),
    transitions: [
      { from: 'absent', to: 'active', by: ['signFramework'] },
      { from: 'active', to: 'absent', by: ['cancelFramework'], note: '20% of the unmet commitment as a penalty' },
      { from: 'active', to: 'absent', by: TICK, note: 'expired at endMonth' },
    ],
  },
  {
    entity: 'powerDeal',
    doc: 'Power purchase agreements: an offer on the energy board becomes a contract (same id) when signed.',
    states: { absent: 'none', offered: 'on the energy board', signed: 'take-or-pay PPA running' },
    ids: (g) => [...(g.powerOffers ?? []).map((o) => o.id), ...(g.powerContracts ?? []).map((o) => o.id)],
    stateOf: (g, id) => ((g.powerContracts ?? []).some((o) => o.id === id) ? 'signed' : (g.powerOffers ?? []).some((o) => o.id === id) ? 'offered' : ABSENT),
    transitions: [
      { from: 'absent', to: 'offered', by: TICK },
      { from: 'offered', to: 'absent', by: TICK },
      { from: 'offered', to: 'signed', by: ['signPower'] },
      { from: 'signed', to: 'absent', by: TICK, note: 'term ended' },
    ],
  },
  {
    entity: 'dilemma',
    doc: 'A story decision card.',
    states: { absent: 'none open', open: 'waiting for an answer (lapses after 3 months)' },
    ids: () => ['open'],
    stateOf: (g) => (g.story?.open ? 'open' : ABSENT),
    transitions: [
      { from: 'absent', to: 'open', by: TICK },
      { from: 'open', to: 'absent', by: ['resolveDilemma', 'tick', 'nextMonth'] },
      { from: 'open', to: 'open', by: TICK, note: 'replaced by a new one' },
    ],
  },
  {
    entity: 'session',
    doc: 'The game itself.',
    states: { playing: 'normal play', bankrupt: 'cash < 0 for 3 months (not in learner mode)', fired: 'three missed board reviews', finished: 'reached Dec 2028' },
    ids: () => ['game'],
    stateOf: (g) => g.status ?? 'playing',
    transitions: [
      { from: 'playing', to: 'bankrupt', by: TICK },
      { from: 'playing', to: 'fired', by: TICK },
      { from: 'playing', to: 'finished', by: TICK },
    ],
  },
];

/** Actions that replace the whole game; the per-entity transition check does not apply to them. */
export const RESETS: ActionName[] = ['newGame', 'load'];

// ---------------------------------------------------------------------------
// Actions.
// ---------------------------------------------------------------------------
export interface Guard {
  id: string;
  text: string;
  /** true when the precondition holds. */
  holds: (g: GameState, args: any[]) => boolean;
  /** The engine does NOT enforce this today (a known bug, see KNOWN_ISSUES); the walk avoids such args. */
  knownIssue?: string;
}
export interface UiBinding { file: string; control: string; gate?: string }
export interface ActionSpec {
  name: ActionName;
  domain: string;
  args: string[];
  /** 'result' actions return {ok, message, issues?}; 'void' ones return nothing. */
  returns: 'result' | 'void';
  doc: string;
  /** All must hold for success. */
  guards: Guard[];
  /** true: the guards are the complete rule set (all hold ⇒ success). false: necessary only. */
  exact: boolean;
  /** Effects this action may cause itself; effects of `calls` are allowed too. '*' = anything. */
  effects: (Effect | '*')[];
  /** Effects that must be present after a success. */
  requires?: Effect[];
  /** Other actions it runs internally (their effects / transitions are allowed). */
  calls?: Driver[];
  /** Post-condition on success (null = fine, else what is wrong). */
  post?: (before: GameState, after: GameState, args: any[], r: ActionResult | undefined) => string | null;
  ui: UiBinding[];
  /** Known violations of the feedback contract (ids into KNOWN_ISSUES). */
  knownIssues?: string[];
}

const hall = (g: GameState, id: string) => g.halls.find((h) => h.id === id);
const fin = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
const active = (g: GameState, id: string) => g.activeContracts.find((a) => a.contract.id === id);
const placedRacks = (g: GameState) => g.halls.flatMap((h) => h.racks);
const MODES: GameMode[] = ['learner', 'operator', 'tycoon'];
const COOLING: CoolingClass[] = ['air', 'rdhx', 'dlc', 'immersion'];

/** Mirror of buy()'s pricing: what n units cost after cap, volume and vendor discounts. */
export function buyCost(g: GameState, itemId: string, qty: number): number {
  const item = getItem(itemId)!; const o = offerFor(g, item);
  let n = Math.floor(qty); if (o.qtyCap && n > o.qtyCap) n = o.qtyCap;
  return Math.round(o.unitPrice * n * (1 - volumeDiscount(item, n, o.unitPrice)));
}
/** Parts check of placeRack: every BOM line covered by free (unreserved-for-others) stock. */
export const partsFree = (g: GameState, designId: string) => { const need = rackBom(g, designId) ?? {}; const free = availableFor(g, designId); return Object.entries(need).every(([id, n]) => (free[id] ?? 0) >= n); };

export const ACTIONS_SPEC: ActionSpec[] = [
  // ----- session -----
  { name: 'newGame', domain: 'session', args: ['seed?', 'mode?'], returns: 'void', doc: 'Fresh game. Learner starts with $80M, tycoon $30M, operator $50M. At least one opening offer is servable in time.', guards: [], exact: true, effects: ['*'], ui: [{ file: 'godot/main.gd', control: 'Title ▸ New game (mode picker)' }] },
  { name: 'setMode', domain: 'session', args: ['mode'], returns: 'void', doc: 'Switch learner/operator/tycoon mid-game. Cash and hall are untouched.', guards: [{ id: 'valid-mode', text: 'mode is learner, operator or tycoon', holds: (_g, [m]) => MODES.includes(m) }], exact: true, effects: ['mode'], ui: [{ file: 'godot/main.gd', control: 'Top bar mode button (confirm dialog)' }] },
  { name: 'nextMonth', domain: 'session', args: [], returns: 'void', doc: 'Run the monthly tick (deliveries, commissioning, failures, contracts, market, finance, story, board, endgame) then step every Easy-path project once. No-op when the game is over.', guards: [{ id: 'playing', text: 'game status is playing', holds: (g) => !g.status || g.status === 'playing' }], exact: true, effects: ['*'], calls: ['tick', 'stepEasy'], ui: [{ file: 'godot/main.gd', control: 'NEXT MONTH button / Space' }] },
  { name: 'save', domain: 'session', args: ['slot?'], returns: 'result', doc: 'Write the game to a save slot (localStorage). Never changes the game.', guards: [], exact: false, effects: [], ui: [{ file: 'godot/main.gd', control: 'Pause menu ▸ Save game ▸ slot; autosave on quit' }] },
  { name: 'load', domain: 'session', args: ['slot?'], returns: 'result', doc: 'Replace the game with a saved one (migrated to the current schema).', guards: [], exact: false, effects: ['*'], ui: [{ file: 'godot/main.gd', control: 'Title / pause menu ▸ Load game ▸ slot' }] },
  { name: 'ackNews', domain: 'session', args: [], returns: 'void', doc: 'Dismiss the oldest keynote card.', guards: [], exact: true, effects: ['news'], ui: [{ file: 'godot/ui/keynote.gd', control: 'Keynote card ▸ close' }, { file: 'godot/main.gd', control: 'Keynote overlay dismiss' }] },
  { name: 'ackStory', domain: 'session', args: [], returns: 'void', doc: 'Dismiss the oldest chapter card.', guards: [], exact: true, effects: ['story'], ui: [{ file: 'godot/ui/story.gd', control: 'Chapter card ▸ continue' }, { file: 'godot/main.gd', control: 'Chapter overlay dismiss' }] },
  { name: 'setSite', domain: 'session', args: ['site'], returns: 'void', doc: 'Cosmetic hall look.', guards: [], exact: true, effects: ['site'], ui: [{ file: 'godot/main.gd', control: 'Change look' }] },
  { name: 'resolveDilemma', domain: 'session', args: ['choice'], returns: 'result', doc: 'Answer the open decision card.', exact: true,
    guards: [
      { id: 'open', text: 'a decision is open', holds: (g) => !!g.story?.open },
      { id: 'choice', text: 'choice is 0 or 1', holds: (g, [c]) => !!DILEMMAS.find((d) => d.id === g.story?.open?.id)?.choices[c] },
      { id: 'afford', text: 'a paid option is affordable', holds: (g, [c]) => { const e = DILEMMAS.find((d) => d.id === g.story?.open?.id)?.choices[c]?.effect; return !e || (e.cash ?? 0) >= 0 || g.cash + (e.cash ?? 0) >= 0; } },
    ],
    effects: ['cash+', 'cash-', 'reputation', 'staff', 'utility', 'story'], requires: ['story'],
    post: (_a, b) => (b.story?.open ? 'decision still open' : b.staff < 1 ? `staff dropped to ${b.staff}` : null),
    ui: [{ file: 'godot/ui/story.gd', control: 'Decision card ▸ choice A / B' }] },

  // ----- procurement -----
  { name: 'buy', domain: 'procure', args: ['itemId', 'qty', 'spare?'], returns: 'result', doc: 'Order loose parts (capped by vendor allocation). Never signs, never places.', exact: true,
    guards: [
      { id: 'item', text: 'item exists', holds: (_g, [id]) => !!getItem(id) },
      { id: 'not-uplink', text: 'not an internet circuit (those use buyUplink)', holds: (_g, [id]) => getItem(id)?.kind !== 'uplink' },
      { id: 'qty', text: 'qty is a positive number', holds: (_g, [, q]) => fin(q) && q > 0 },
      { id: 'whole', text: 'qty rounds down to at least 1', holds: (_g, [, q]) => !(fin(q) && q > 0 && Math.floor(q) < 1) },
      { id: 'available', text: 'the part is purchasable this month (shipping or pre-order open)', holds: (g, [id]) => offerFor(g, getItem(id)!).available },
      { id: 'cash', text: 'cash covers the (capped, discounted) cost', holds: (g, [id, q]) => buyCost(g, id, q) <= g.cash },
    ],
    effects: ['cash-', 'order+', 'vendor'], requires: ['order+'],
    ui: [{ file: 'godot/ui/screens/procure.gd', control: 'Parts bin ▸ Buy (and spares)', gate: 'total > cash' }, { file: 'godot/ui/screens/facility.gd', control: 'Build ▸ plant ▸ Buy 1', gate: 'offer.unitPrice > cash' }, { file: 'godot/ui/screens/missing_parts.gd', control: 'Missing parts ▸ ORDER' }, { file: 'godot/ui/screens/stock.gd', control: 'Spares ▸ Buy N' }] },
  { name: 'buyTemplate', domain: 'procure', args: ['templateId', 'racks', 'spares=true'], returns: 'result', doc: 'Adopt a template’s tray+rack designs and order its full bill of materials (+ bundled spares) as one batch; reserves the racks for that design. Atomic: a refused order adopts no designs. MUST NOT sign any contract.', exact: false,
    guards: [
      { id: 'template', text: 'template exists', holds: (_g, [t]) => !!getTemplate(t) },
      { id: 'racks', text: 'at least one rack', holds: (_g, [, n]) => Math.floor(n) >= 1 },
    ],
    effects: ['cash-', 'order+', 'reserve', 'vendor'], requires: ['order+', 'cash-'], calls: ['adoptTemplate'],
    post: (a, b, [t, n]) => { const id = `rack-${t}`; return (b.rackReserve?.[id] ?? 0) - (a.rackReserve?.[id] ?? 0) === Math.floor(n) ? null : 'reservation not increased by the rack count'; },
    ui: [{ file: 'godot/ui/screens/procure.gd', control: 'Shop ▸ ORDER N RACKS', gate: 'quote.cost > cash, or quote.unavailable, or not quote.orderable (shows quote.blocker)' }, { file: 'godot/ui/screens/contracts.gd', control: 'Offer / Pending ▸ What you need ▸ Just order the racks (confirm)', gate: 'buildOption.orderCost > cash or not buildOption.canOrder (shows orderBlocker)' }], },
  { name: 'adoptTemplate', domain: 'design', args: ['templateId'], returns: 'result', doc: 'Save a template’s tray and rack designs (idempotent).', exact: true, guards: [{ id: 'template', text: 'template exists', holds: (_g, [t]) => !!getTemplate(t) }], effects: [], calls: ['saveTray', 'saveRack'], ui: [{ file: 'godot/ui/screens/design.gd', control: 'Designer ▸ start from template' }] },
  { name: 'cancelOrder', domain: 'procure', args: ['orderId'], returns: 'result', doc: 'Cancel an open order (the whole batch for rack orders), 90% refund; releases the batch’s reservation and fails Easy-path projects waiting on it.', exact: true,
    guards: [{ id: 'open', text: 'order is open', holds: (g, [id]) => g.orders.some((o) => o.id === id) }],
    effects: ['cash+', 'order-', 'reserve', 'project'], requires: ['order-'],
    post: (_a, b, [id]) => (b.orders.some((o) => o.id === id) ? 'order still open' : null),
    ui: [{ file: 'godot/ui/screens/procure.gd', control: 'Orders ▸ Cancel (confirm)' }] },
  { name: 'reduceOrder', domain: 'procure', args: ['orderId', 'qty'], returns: 'result', doc: 'Reduce a loose line to qty, or a rack batch to qty racks (0 = cancel). 90% of the difference refunded.', exact: true,
    guards: [
      { id: 'open', text: 'order is open', holds: (g, [id]) => g.orders.some((o) => o.id === id) },
      { id: 'qty', text: 'qty ≥ 0', holds: (_g, [, q]) => Math.floor(q) >= 0 },
      { id: 'smaller', text: 'new size is smaller than the current one', holds: (g, [id, q]) => { const o = g.orders.find((x) => x.id === id); if (!o) return false; const n = Math.floor(q); return n === 0 || n < (o.batch && o.templateId ? (o.racks ?? 0) : o.qty); } },
    ],
    effects: ['cash+', 'order-', 'reserve', 'project'], requires: ['order-'], calls: ['cancelOrder'],
    ui: [{ file: 'godot/ui/screens/procure.gd', control: 'Orders ▸ −1 / half / one fewer' }] },

  // ----- design -----
  { name: 'saveTray', domain: 'design', args: ['tray'], returns: 'result', doc: 'Create or overwrite a tray design (no validation here; placeRack validates).', exact: true, guards: [], effects: ['design'], ui: [{ file: 'godot/ui/screens/design.gd', control: 'Tray designer ▸ SAVE TRAY', gate: 'validateTray has errors' }] },
  { name: 'saveRack', domain: 'design', args: ['rack'], returns: 'result', doc: 'Create or overwrite a rack design.', exact: true, guards: [], effects: ['design'], ui: [{ file: 'godot/ui/screens/design.gd', control: 'Rack designer ▸ SAVE RACK', gate: 'validateRack has errors' }] },

  // ----- facility -----
  { name: 'buildHall', domain: 'facility', args: ['name', 'coolingClass', 'rackSlots'], returns: 'result', doc: 'Build an empty hall shell ($2M + $250k/slot). No power or cooling plant.', exact: true,
    guards: [
      { id: 'slots-number', text: 'rackSlots is a number', holds: (_g, [, , s]) => fin(s) },
      { id: 'cooling-class', text: 'coolingClass is air, rdhx, dlc or immersion', holds: (_g, [, c]) => COOLING.includes(c) },
      { id: 'slots', text: '4 ≤ slots ≤ 200', holds: (_g, [, , s]) => !(Math.floor(s) < 4 || Math.floor(s) > 200) },
      { id: 'cash', text: 'cash ≥ cost', holds: (g, [, , s]) => !(2_000_000 + 250_000 * Math.floor(s) > g.cash) },
    ],
    effects: ['cash-', 'hall'], requires: ['hall'],
    ui: [{ file: 'godot/ui/screens/facility.gd', control: 'Build ▸ New hall' }] },
  { name: 'expandHall', domain: 'facility', args: ['hallId', 'units'], returns: 'result', doc: 'Buy floor space in 10-slot units; commissioned after a delay.', exact: true,
    guards: [
      { id: 'hall', text: 'hall exists', holds: (g, [h]) => !!hall(g, h) },
      { id: 'units', text: '≥ 1 unit', holds: (_g, [, u]) => Math.floor(u) >= 1 },
      { id: 'cash', text: 'cash ≥ units × $2.5M', holds: (g, [, u]) => !(Math.floor(u) * FLOOR_UNIT_COST > g.cash) },
    ],
    effects: ['cash-', 'hall'], requires: ['hall'],
    ui: [{ file: 'godot/ui/screens/facility.gd', control: 'Build ▸ +N positions', gate: 'floorQuote.cost > cash' }] },
  ...(['installPower', 'installCooling'] as const).map((name): ActionSpec => ({
    name, domain: 'facility', args: ['hallId', 'itemId', 'qty'], returns: 'result', exact: true,
    doc: name === 'installPower' ? 'Move transformers/UPS/… from the warehouse into a hall (adds IT kW for feed types). PDUs and power shelves are rack parts and are refused.' : 'Move cooling plant from the warehouse into a hall of a compatible class (rdhx halls take air plant, immersion takes dlc plant).',
    guards: [
      { id: 'hall', text: 'hall exists', holds: (g, [h]) => !!hall(g, h) },
      { id: 'kind', text: `item is ${name === 'installPower' ? 'hall-level power equipment' : 'cooling equipment for this hall class'}`, holds: (g, [h, id]) => { const it = getItem(id) as any; if (name === 'installPower') return it?.kind === 'power' && it.powerType !== 'pdu' && it.powerType !== 'power-shelf'; if (it?.kind !== 'cooling') return false; const c = hall(g, h)?.coolingClass; return it.serves === c || (c === 'rdhx' && it.serves === 'air') || (c === 'immersion' && it.serves === 'dlc'); } },
      { id: 'qty-number', text: 'qty is a number', holds: (_g, [, , q]) => fin(q) },
      { id: 'qty', text: 'qty ≥ 1', holds: (_g, [, , q]) => !(Math.floor(q) <= 0) },
      { id: 'stock', text: 'that many in the warehouse', holds: (g, [, id, q]) => !((g.inventory[id] ?? 0) < Math.floor(q)) },
    ],
    effects: ['inventory', 'hall'], requires: ['inventory', 'hall'],
    ui: [{ file: 'godot/ui/screens/facility.gd', control: 'Build ▸ warehouse plant ▸ Install 1' }],
  })),
  { name: 'buyUplink', domain: 'facility', args: ['itemId'], returns: 'result', doc: 'Turn up one internet circuit (install fee now, monthly charge after).', exact: true,
    guards: [
      { id: 'uplink', text: 'item is an internet circuit', holds: (_g, [id]) => getItem(id)?.kind === 'uplink' },
      { id: 'offered', text: 'offered by this month', holds: (g, [id]) => { const it = getItem(id); return !!it && !(it.availableFrom * 12 - 2020 * 12 > g.month); } },
      { id: 'cash', text: 'cash ≥ install fee', holds: (g, [id]) => !(g.cash < (getItem(id)?.priceUSD ?? Infinity)) },
    ],
    effects: ['cash-', 'uplink'], requires: ['uplink'],
    ui: [{ file: 'godot/ui/screens/facility.gd', control: 'Build ▸ Internet ▸ Add', gate: 'priceUSD > cash' }] },
  { name: 'dropUplink', domain: 'facility', args: ['itemId'], returns: 'result', doc: 'Cancel one circuit of that type.', exact: true, guards: [{ id: 'have', text: 'you have one', holds: (g, [id]) => (g.uplinks?.[id] ?? 0) > 0 }], effects: ['uplink'], requires: ['uplink'], ui: [{ file: 'godot/ui/screens/facility.gd', control: 'Build ▸ Internet ▸ Drop' }] },

  // ----- deploy -----
  { name: 'reserveRacks', domain: 'deploy', args: ['designId', 'racks'], returns: 'result', doc: 'Earmark parts for N racks of a design so other designs cannot consume them.', exact: true,
    guards: [
      { id: 'design', text: 'rack design exists', holds: (g, [d]) => g.racks.some((r) => r.id === d) },
      { id: 'non-negative', text: 'racks is a whole number ≥ 0', holds: (_g, [, n]) => fin(n) && Math.floor(n) >= 0 },
    ],
    effects: ['reserve'], ui: [{ file: 'godot/ui/screens/missing_parts.gd', control: 'Missing parts ▸ ORDER (reserves after buying)' }] },
  { name: 'placeRack', domain: 'deploy', args: ['hallId', 'designId'], returns: 'result', doc: 'Put one rack of a design on the floor: consumes its BOM from free stock and one reservation; status installing, online ~2 months later. Warns (does not fail) on power/cooling overcommit.', exact: true,
    guards: [
      { id: 'hall', text: 'hall exists', holds: (g, [h]) => !!hall(g, h) },
      { id: 'design', text: 'rack design exists', holds: (g, [, d]) => g.racks.some((r) => r.id === d) },
      { id: 'slot', text: 'a free slot', holds: (g, [h]) => { const x = hall(g, h); return !!x && x.racks.length < x.rackSlots; } },
      { id: 'cooling', text: 'hall cooling class ≥ rack cooling interface', holds: (g, [h, d]) => { const x = hall(g, h), r = g.racks.find((y) => y.id === d); return !!x && !!r && !(COOL_LEVEL[r.coolingInterface] > COOL_LEVEL[x.coolingClass]); } },
      { id: 'floor-load', text: 'rack weight ≤ hall floor rating', holds: (g, [h, d]) => { const x = hall(g, h), r = g.racks.find((y) => y.id === d); return !!x && !!r && !(validateRack(r, g.trays, getItem).stats.weightKg > x.floorLoadKgPerRack); } },
      { id: 'parts', text: 'its whole BOM is in free (not reserved for other designs) stock', holds: (g, [, d]) => partsFree(g, d) },
      { id: 'valid', text: 'the design validates without errors', holds: (g, [, d]) => { const r = g.racks.find((y) => y.id === d); return !!r && !validateRack(r, g.trays, getItem).issues.some((i) => i.severity === 'error'); } },
    ],
    effects: ['inventory', 'rack+', 'reserve'], requires: ['rack+', 'inventory'],
    post: (a, b, [h]) => { const n = (g: GameState) => hall(g, h)?.racks.length ?? 0; const r = hall(b, h)?.racks.at(-1); return n(b) !== n(a) + 1 ? 'hall rack count did not grow by one' : r?.status !== 'installing' ? `new rack status ${r?.status}` : null; },
    ui: [{ file: 'godot/ui/screens/stock.gd', control: 'Warehouse ▸ DEPLOY 1', gate: 'rackReadiness.buildableNow > 0' }, { file: 'godot/ui/screens/facility.gd', control: 'Build ▸ PLACE RACK', gate: 'inventory < rackBom or rackReadiness.buildableNow == 0' }] },

  // ----- clusters -----
  { name: 'createCluster', domain: 'clusters', args: ['name', 'rackIds', 'fabric'], returns: 'result', doc: 'Join free ONLINE placed racks with a scale-out fabric (installing/commissioning/failed racks are refused).', exact: false,
    guards: [
      { id: 'some', text: 'at least one rack', holds: (_g, [, ids]) => Array.isArray(ids) && ids.length > 0 },
      { id: 'placed', text: 'every rack is placed', holds: (g, [, ids]) => (ids ?? []).every((id: string) => placedRacks(g).some((r) => r.id === id)) },
      { id: 'free', text: 'no rack is already in a cluster', holds: (g, [, ids]) => !(ids ?? []).some((id: string) => placedRacks(g).find((r) => r.id === id)?.clusterId) },
      { id: 'online', text: 'every rack is online', holds: (g, [, ids]) => (ids ?? []).every((id: string) => placedRacks(g).find((r) => r.id === id)?.status === 'online') },
    ],
    effects: ['cluster+', 'membership'], requires: ['cluster+', 'membership'],
    post: (a, b, [, ids]) => { const c = b.clusters.find((x) => !a.clusters.some((y) => y.id === x.id)); return !c ? 'no new cluster' : [...new Set(ids as string[])].every((id) => placedRacks(b).find((r) => r.id === id)?.clusterId === c.id) ? null : 'racks not linked to the new cluster'; },
    ui: [{ file: 'godot/ui/screens/network.gd', control: 'Supercomputer ▸ BUILD CLUSTER', gate: 'evaluateCluster(stats) == null' }, { file: 'godot/main.gd', control: 'GW_CLUSTERS screenshot helper (online free racks only)' }] },
  { name: 'disbandCluster', domain: 'clusters', args: ['clusterId'], returns: 'result', doc: 'Uncluster: racks become free; contracts it served drop back to pending with 2 months grace; leaves spot.', exact: true,
    guards: [{ id: 'cluster', text: 'cluster exists', holds: (g, [id]) => g.clusters.some((c) => c.id === id) }],
    effects: ['cluster-', 'membership', 'assign', 'spot'], requires: ['cluster-'],
    post: (_a, b, [id]) => (placedRacks(b).some((r) => r.clusterId === id) || b.activeContracts.some((x) => x.clusterIds.includes(id)) ? 'dangling references to the disbanded cluster' : null),
    ui: [{ file: 'godot/ui/screens/network.gd', control: 'Supercomputer ▸ Uncluster (confirm) / Re-cluster' }] },

  // ----- contracts -----
  { name: 'acceptContract', domain: 'contracts', args: ['contractId'], returns: 'result', doc: 'SIGN an offer: it becomes pending with deployBy = month + rampMonths (default 4). No revenue, no SLA until a cluster is assigned.', exact: true,
    guards: [
      { id: 'offered', text: 'the offer is on the board', holds: (g, [id]) => g.availableContracts.some((c) => c.id === id) },
      { id: 'deadline', text: 'month ≤ deadlineMonth', holds: (g, [id]) => { const c = g.availableContracts.find((x) => x.id === id); return !!c && !(g.month > c.deadlineMonth); } },
    ],
    effects: ['sign'], requires: ['sign'],
    post: (_a, b, [id]) => { const x = active(b, id); return !x ? 'not active' : x.clusterIds.length ? 'signed contract already has clusters' : x.deployBy !== b.month + (x.contract.rampMonths ?? 4) ? 'deployBy wrong' : null; },
    ui: [{ file: 'godot/ui/screens/contracts.gd', control: 'Offer ▸ SIGN NOW · DEPLOY LATER / SIGN & START SERVING (then assignContract(best))', gate: 'contractFit.verdict' }] },
  { name: 'assignContract', domain: 'contracts', args: ['contractId', 'clusterIds'], returns: 'result', doc: 'Serve a SIGNED contract from a set of clusters. Training: totals over the set must meet accelerators / domain / scale-out / memory, and each cluster must be exclusive. Inference: free token capacity after other contracts, TTFT and model fit.', exact: false,
    guards: [
      { id: 'active', text: 'the contract is signed', holds: (g, [id]) => !!active(g, id) },
      { id: 'clusters', text: 'every cluster exists', holds: (g, [, ids]) => Array.isArray(ids) && ids.every((id: string) => g.clusters.some((c) => c.id === id)) },
      { id: 'some', text: 'at least one cluster', holds: (_g, [, ids]) => Array.isArray(ids) && ids.length > 0 },
    ],
    effects: ['assign'],
    post: (_a, b, [id, ids]) => { const x = active(b, id); return !x ? 'contract gone' : J([...new Set(ids)]) !== J(x.clusterIds) ? 'cluster set differs from the request' : null; },
    ui: [{ file: 'godot/ui/screens/contracts.gd', control: 'Offer ▸ SIGN & START SERVING (2nd step); Pending ▸ ASSIGN & GO LIVE; Serving ▸ UPDATE CLUSTERS', gate: 'selection empty (pending preselects contractFit.best only when the verdict is ready)' }] },
  { name: 'unassignContract', domain: 'contracts', args: ['contractId'], returns: 'result', doc: 'Release a serving contract’s clusters: back to pending with deployBy ≥ month + 2.', exact: true,
    guards: [
      { id: 'active', text: 'the contract is signed', holds: (g, [id]) => !!active(g, id) },
      { id: 'serving', text: 'it has a cluster', holds: (g, [id]) => (active(g, id)?.clusterIds.length ?? 0) > 0 },
    ],
    effects: ['assign'], requires: ['assign'],
    ui: [{ file: 'godot/ui/screens/contracts.gd', control: 'Serving ▸ Release cluster (back to pending)' }] },
  { name: 'assignRacks', domain: 'contracts', args: ['contractId', 'rackIds'], returns: 'result', doc: 'Serve from online free racks: SIGNS the contract if still on offer, auto-builds a cluster with the cheapest qualifying fabric, assigns it. All-or-nothing: on any failure the game is exactly as before (not signed, no cluster, no log).', exact: false,
    guards: [
      { id: 'some', text: 'at least one rack', holds: (_g, [, ids]) => Array.isArray(ids) && ids.length > 0 },
      { id: 'online', text: 'every rack is online', holds: (g, [, ids]) => (ids ?? []).every((id: string) => placedRacks(g).find((r) => r.id === id)?.status === 'online') },
      { id: 'known', text: 'the contract is on offer or signed', holds: (g, [id]) => !!active(g, id) || g.availableContracts.some((c) => c.id === id && !(g.month > c.deadlineMonth)) },
      { id: 'free', text: 'no rack is already in a cluster', holds: (g, [, ids]) => !(ids ?? []).some((id: string) => placedRacks(g).find((r) => r.id === id)?.clusterId) },
    ],
    effects: [], calls: ['acceptContract', 'createCluster', 'assignContract', 'disbandCluster'],
    ui: [{ file: 'godot/ui/screens/contracts.gd', control: 'Pending ▸ Serve straight from racks ▸ SERVE FROM N RACKS', gate: 'selection non-empty' }] },
  { name: 'startEasy', domain: 'contracts', args: ['contractId', 'templateId', 'racks'], returns: 'result', doc: 'Easy Path. (1) If an idle owned cluster qualifies: SIGN + assign it now, order nothing. (2) Else: requires the template among buildOptions, enough racks and fitsRamp; SIGNS, orders the template (buyTemplate), builds a hall if none fits, orders missing transformers/cooling, creates a project and steps it once. All-or-nothing: on failure the game is exactly as before (the customer is not signed).', exact: false,
    guards: [
      { id: 'template', text: 'template exists', holds: (_g, [, t]) => !!getTemplate(t) },
      { id: 'known', text: 'the contract is on offer or signed', holds: (g, [id]) => !!active(g, id) || g.availableContracts.some((c) => c.id === id) },
    ],
    effects: ['project'], calls: ['acceptContract', 'assignContract', 'buyTemplate', 'buildHall', 'buy', 'stepEasy'], knownIssues: ['KI-easy-pending-deadline'],
    ui: [{ file: 'godot/ui/screens/contracts.gd', control: 'Offer / Pending ▸ What you need ▸ EASY PATH (confirm)', gate: 'buildOption.orderCost > cash or not buildOption.canStartEasy (shows easyBlocker)' }, { file: 'godot/main.gd', control: 'GW_DEMO screenshot helper' }], },
  { name: 'stepEasy', domain: 'contracts', args: [], returns: 'void', doc: 'Advance every Easy-path project one step (also keeps internet uplink ahead of demand). Never signs.', guards: [], exact: true, effects: ['project'], calls: ['installPower', 'installCooling', 'placeRack', 'createCluster', 'assignContract', 'buy', 'buyUplink'], ui: [{ file: 'godot/ui/screens/dash.gd', control: 'Projects ▸ step now' }] },

  // ----- finance / staff / vendors / policy -----
  { name: 'takeLoan', domain: 'finance', args: ['amountUSD'], returns: 'result', doc: 'Borrow up to the credit limit ($5M + 60% of capex basis).', exact: true,
    guards: [
      { id: 'positive', text: 'amount is a positive number', holds: (_g, [x]) => fin(Math.floor(x)) && Math.floor(x) > 0 },
      { id: 'limit', text: 'debt + amount ≤ credit limit', holds: (g, [x]) => !(g.debt + Math.floor(x) > creditLimit(g)) },
    ],
    effects: ['debt', 'cash+'], requires: ['debt', 'cash+'], ui: [{ file: 'godot/ui/screens/ops.gd', control: 'Operations ▸ Debt ▸ Borrow $5M / $20M' }, { file: 'godot/main.gd', control: 'GW_DEMO screenshot helper' }] },
  { name: 'repayLoan', domain: 'finance', args: ['amountUSD'], returns: 'result', doc: 'Repay principal.', exact: true,
    guards: [
      { id: 'positive', text: 'amount is a positive number', holds: (_g, [x]) => fin(Math.floor(x)) && Math.floor(x) > 0 },
      { id: 'owed', text: 'amount ≤ debt', holds: (g, [x]) => !(Math.floor(x) > g.debt) },
      { id: 'cash', text: 'amount ≤ cash', holds: (g, [x]) => !(Math.floor(x) > g.cash) },
    ],
    effects: ['debt', 'cash-'], requires: ['debt', 'cash-'], ui: [{ file: 'godot/ui/screens/ops.gd', control: 'Operations ▸ Debt ▸ Repay $1M / $5M / all affordable', gate: 'debt ≤ 0, cash < amount or amount > debt (all affordable: min(debt, cash) ≤ 0)' }] },
  { name: 'hireStaff', domain: 'staff', args: ['n'], returns: 'result', doc: 'Hire 1–50 operators ($15k recruiting each).', exact: true,
    guards: [
      { id: 'range', text: '1 ≤ n ≤ 50', holds: (_g, [n]) => fin(Math.floor(n)) && Math.floor(n) >= 1 && Math.floor(n) <= 50 },
      { id: 'cash', text: 'cash ≥ recruiting cost', holds: (g, [n]) => !(g.cash < RECRUIT_COST_USD * Math.floor(n)) },
    ],
    effects: ['cash-', 'staff'], requires: ['staff'], ui: [{ file: 'godot/ui/screens/ops.gd', control: 'Operations ▸ Staff ▸ Hire' }, { file: 'godot/main.gd', control: 'GW_PERF benchmark helper' }] },
  { name: 'fireStaff', domain: 'staff', args: ['n'], returns: 'result', doc: 'Let n go (2 months severance each); never below 1.', exact: true,
    guards: [
      { id: 'positive', text: 'n ≥ 1', holds: (_g, [n]) => fin(Math.floor(n)) && Math.floor(n) >= 1 },
      { id: 'floor', text: 'keeps ≥ 1 staff', holds: (g, [n]) => !(g.staff - Math.floor(n) < 1) },
      { id: 'cash', text: 'cash ≥ severance', holds: (g, [n]) => !(g.cash < SEVERANCE_USD * Math.floor(n)) },
    ],
    effects: ['cash-', 'staff'], requires: ['staff'], ui: [{ file: 'godot/ui/screens/ops.gd', control: 'Operations ▸ Staff ▸ Fire' }] },
  { name: 'signFramework', domain: 'vendors', args: ['vendorId', 'commitUSD', 'months'], returns: 'result', doc: 'Commit spend with a vendor for a discount; 5% deposit counts toward it.', exact: true,
    guards: [
      { id: 'vendor', text: 'vendor exists', holds: (_g, [v]) => VENDORS.some((x) => x.id === v) },
      { id: 'commit', text: `commit ≥ $${FRAMEWORK_MIN_COMMIT_USD.toLocaleString('en-US')}`, holds: (_g, [, c]) => fin(c) && c >= FRAMEWORK_MIN_COMMIT_USD },
      { id: 'term', text: `${FRAMEWORK_MIN_MONTHS}–${FRAMEWORK_MAX_MONTHS} whole months`, holds: (_g, [, , m]) => Number.isInteger(m) && m >= FRAMEWORK_MIN_MONTHS && m <= FRAMEWORK_MAX_MONTHS },
      { id: 'one', text: 'no active framework with that vendor', holds: (g, [v]) => !frameworkFor(g, v) },
      { id: 'cash', text: 'cash ≥ deposit', holds: (g, [, c]) => !(g.cash < Math.round(c * FRAMEWORK_DEPOSIT_PCT)) },
    ],
    effects: ['cash-', 'vendor'], requires: ['vendor'], ui: [{ file: 'godot/ui/screens/ops.gd', control: 'Operations ▸ Vendors ▸ Sign framework', gate: 'frameworkQuote.valid' }] },
  { name: 'cancelFramework', domain: 'vendors', args: ['frameworkId'], returns: 'result', doc: 'Walk away: 20% of the unmet commitment as penalty and a relationship hit.', exact: true,
    guards: [
      { id: 'exists', text: 'framework exists', holds: (g, [id]) => (g.frameworks ?? []).some((f) => f.id === id) },
      { id: 'cash', text: 'cash ≥ penalty', holds: (g, [id]) => { const f = (g.frameworks ?? []).find((x) => x.id === id); return !f || !(f.commitUSD - f.spentUSD > 0 && g.cash < Math.round((f.commitUSD - f.spentUSD) * 0.2)); } },
    ],
    effects: ['cash-', 'vendor'], requires: ['vendor'], ui: [{ file: 'godot/ui/screens/ops.gd', control: 'Operations ▸ Vendors ▸ Cancel framework' }] },
  { name: 'setPolicy', domain: 'policy', args: ['burnInMonths', 'maintenance'], returns: 'result', doc: 'Burn-in 0–3 months, maintenance 0–2.', exact: true,
    guards: [
      { id: 'burnin', text: 'burn-in is a whole number 0–3', holds: (_g, [b]) => Number.isInteger(b) && b >= 0 && b <= 3 },
      { id: 'maint', text: 'maintenance is 0, 1 or 2', holds: (_g, [, m]) => Number.isInteger(m) && m >= 0 && m <= 2 },
    ],
    effects: ['policy'], ui: [{ file: 'godot/ui/screens/ops.gd', control: 'Operations ▸ Policy ▸ burn-in / maintenance' }] },

  // ----- energy -----
  { name: 'signPower', domain: 'energy', args: ['offerId', 'mw?'], returns: 'result', doc: 'Sign a PPA (optionally resized to 1..2× the offered MW); starts next month.', exact: true,
    guards: [
      { id: 'offer', text: 'offer is on the board', holds: (g, [id]) => (g.powerOffers ?? []).some((o) => o.id === id) },
      { id: 'mw-number', text: 'mw is omitted or a number', holds: (_g, [, mw]) => mw === undefined || mw === null || fin(mw) },
    ],
    effects: ['power'], requires: ['power'], ui: [{ file: 'godot/ui/screens/energy.gd', control: 'Energy ▸ PPA offers ▸ Sign' }] },
  { name: 'setSpot', domain: 'energy', args: ['clusterId', 'on'], returns: 'result', doc: 'Offer an idle cluster on the spot market.', exact: true, guards: [{ id: 'cluster', text: 'cluster exists', holds: (g, [id]) => g.clusters.some((c) => c.id === id) }], effects: ['spot'], ui: [{ file: 'godot/ui/screens/energy.gd', control: 'Energy ▸ Spot ▸ cluster toggle' }] },
  { name: 'setSpotRack', domain: 'energy', args: ['rackId', 'on'], returns: 'result', doc: 'Offer a single placed rack on spot (earns only while online).', exact: true, guards: [{ id: 'rack', text: 'rack is placed', holds: (g, [id]) => placedRacks(g).some((r) => r.id === id) }], effects: ['spot'], ui: [{ file: 'godot/ui/screens/energy.gd', control: 'Energy ▸ Spot ▸ rack checkbox', gate: 'status != online' }, { file: 'godot/main.gd', control: 'Rack inspector ▸ Spot market ON/off' }] },
  { name: 'setSpotReserve', domain: 'energy', args: ['usd'], returns: 'result', doc: 'Reserve price $/GPU-hr (clamped ≥ 0).', exact: true, guards: [{ id: 'number', text: 'usd is a number', holds: (_g, [x]) => fin(x) }], effects: ['spot'], ui: [{ file: 'godot/ui/screens/energy.gd', control: 'Energy ▸ Spot ▸ reserve price' }] },

  // ----- lifecycle -----
  { name: 'decommissionRack', domain: 'lifecycle', args: ['rackId'], returns: 'result', doc: 'Sell an unclustered placed rack at 85% of residual value; frees the slot and its spot listing.', exact: true,
    guards: [
      { id: 'rack', text: 'rack is placed', holds: (g, [id]) => placedRacks(g).some((r) => r.id === id) },
      { id: 'not-ordered', text: 'not in status ordered', holds: (g, [id]) => placedRacks(g).find((r) => r.id === id)?.status !== 'ordered' },
      { id: 'free', text: 'not in a cluster', holds: (g, [id]) => !placedRacks(g).find((r) => r.id === id)?.clusterId },
    ],
    effects: ['cash+', 'rack-', 'spot'], requires: ['rack-'], ui: [{ file: 'godot/ui/screens/ops.gd', control: 'Operations ▸ Lifecycle ▸ Sell', gate: 'row.clusterId set' }, { file: 'godot/main.gd', control: 'Rack inspector ▸ Decommission (confirm)' }] },
  { name: 'sellInventory', domain: 'lifecycle', args: ['itemId', 'qty'], returns: 'result', doc: 'Sell warehouse stock at 60% of catalog price.', exact: true,
    guards: [
      { id: 'item', text: 'item exists', holds: (_g, [id]) => !!getItem(id) },
      { id: 'qty', text: 'qty is a number ≥ 1', holds: (_g, [, q]) => fin(q) && Math.floor(q) >= 1 },
      { id: 'stock', text: 'that many in the warehouse', holds: (g, [id, q]) => !((g.inventory[id] ?? 0) < Math.floor(q)) },
    ],
    effects: ['cash+', 'inventory'], requires: ['inventory'], ui: [{ file: 'godot/ui/screens/ops.gd', control: 'Operations ▸ Warehouse ▸ Sell 1 / all' }] },
];

/** Internal store plumbing: present on the store, hidden from the bridge. */
export const INTERNAL_ACTIONS: ActionName[] = ['patchProject', 'addProject'];

export const SPEC = Object.fromEntries(ACTIONS_SPEC.map((s) => [s.name, s])) as Record<ActionName, ActionSpec>;

/** Effects allowed for an action, including those of everything it calls (transitively). */
export function allowedEffects(name: Driver, seen = new Set<Driver>()): Set<string> {
  const out = new Set<string>(); if (seen.has(name)) return out; seen.add(name);
  if (name === 'tick') { out.add('*'); return out; }
  const s = SPEC[name as ActionName]; if (!s) return out;
  for (const e of s.effects) out.add(e);
  for (const c of s.calls ?? []) for (const e of allowedEffects(c, seen)) out.add(e);
  return out;
}

/** Drivers whose transitions an action may perform (itself + transitive calls). */
export function drivers(name: Driver, seen = new Set<Driver>()): Set<Driver> {
  if (seen.has(name)) return seen; seen.add(name);
  for (const c of (SPEC[name as ActionName]?.calls ?? [])) drivers(c, seen);
  return seen;
}

/** Is `from → to` reachable for this entity using only edges the action (or what it calls) drives? */
export function reachable(m: Machine, from: string, to: string, name: Driver): boolean {
  if (from === to) return true;
  const ds = drivers(name);
  const seen = new Set([from]); const q = [from];
  while (q.length) {
    const s = q.shift()!;
    for (const t of m.transitions) if (t.from === s && t.by.some((b) => ds.has(b)) && !seen.has(t.to)) { if (t.to === to) return true; seen.add(t.to); q.push(t.to); }
  }
  return false;
}

/** First failing guard (or null when all hold). `includeKnown` also evaluates known-issue guards. */
export function failingGuard(name: ActionName, g: GameState, args: any[], includeKnown = true): Guard | null {
  for (const gd of SPEC[name]?.guards ?? []) { if (!includeKnown && gd.knownIssue) continue; let ok = false; try { ok = gd.holds(g, args); } catch { ok = false; } if (!ok) return gd; }
  return null;
}

// ---------------------------------------------------------------------------
// Rules of consistency (see docs/INTERACTIONS.md). Checked by interactions.test.ts.
// ---------------------------------------------------------------------------
export const RULES = [
  { id: 'R1-only-sign-signs', text: 'Only acceptContract signs. startEasy and assignRacks sign only by calling it; buy / buyTemplate / placeRack / createCluster / stepEasy never sign.' },
  { id: 'R2-feedback', text: 'Every result action returns {ok: boolean, message: string, issues?: ValidationIssue[]}. A failure has a non-empty human message.' },
  { id: 'R3-atomic', text: 'A failed action leaves the game exactly as it was (deep-equal).' },
  { id: 'R4-guards', text: 'If a modelled precondition is false the action fails; for exact actions, if all hold it succeeds.' },
  { id: 'R5-graph', text: 'Every entity state change an action causes is an edge of its lifecycle graph labelled with that action (or one it calls).' },
  { id: 'R6-effects', text: 'An action only causes the side effects it declares (plus those of the actions it calls).' },
  { id: 'R7-enabled-succeeds', text: 'A button the UI shows enabled succeeds; when its gate is a query, the query and the action agree.' },
  { id: 'R8-invariants', text: 'Global invariants hold after every action (one state per contract, no dangling ids, no rack in two clusters, finite numbers, non-negative stock).' },
  { id: 'R9-modelled', text: 'Every store action and every b.act(...) call in godot/ is modelled here.' },
] as const;

// ---------------------------------------------------------------------------
// Known inconsistencies (engine or UI): add an entry here, reference it from the spec, and pin it with an `it.fails` test.
// ---------------------------------------------------------------------------
export const KNOWN_ISSUES: Record<string, { summary: string; where: string; fix: string }> = {
  // Fixed ones live on as regression tests in interactions.test.ts ("fixed inconsistencies").
  'KI-easy-pending-deadline': { summary: 'For a SIGNED (pending) contract the UI computes buildOptions with signedAt = deployBy, so a build that cannot arrive by deployBy shows canStartEasy=false and EASY PATH is disabled. startEasy itself re-runs buildOptions WITHOUT signedAt (deadline = this month + rampMonths) and starts the project anyway: the engine accepts a build that will arrive after the customer walks (the GUI is safe, agents/bridge are not). The easyBlocker text for pending contracts also cites rampMonths ("within 6 months of signing") instead of the real deployBy, so it can read "Parts take 3 months … within 6 months".', where: 'src/autopilot.ts:149-153; src/contractfit.ts:208', fix: 'In startProject pass signedAt = active.deployBy when the contract is already signed (buildOptions(g0, cand, ac?.deployBy)) and word the refusal / easyBlocker with the actual deadline month.' },
};
