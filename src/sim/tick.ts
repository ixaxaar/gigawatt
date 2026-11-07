// ===========================================================================
// GIGAWATT — monthly tick. Pure, deterministic (all randomness flows from
// GameState.seed + month through mulberry32). advanceMonth(state) returns a
// NEW state; the input is never mutated. The rules live in ./systems/*; this
// file is only the ordered pipeline (order matters: RNG draws are sequenced).
// ===========================================================================
import type { GameState, LogEntry } from '../types';
import { mulberry32 } from './rng';
import { evaluateCluster } from './network';
import type { System, TickCtx, TickOptions } from './systems/types';
import { clusterContextOf } from './systems/helpers';
import { deliveries, floorSpace } from './systems/logistics';
import { commissioning, clusterStats, failures, pue } from './systems/racks';
import { serveContracts, contractMarket } from './systems/contracts';
import { worldEvents, spotAndPower } from './systems/markets';
import { finances, history } from './systems/finance';
import { staffingCheck } from './systems/staffing';
import { endgame } from './systems/endgame';
import { board } from './systems/board';
import { story } from './systems/story';
import { rivalsSystem } from './systems/rivals';
import { vendorsSystem } from './systems/vendors';
import { launchesSystem } from './systems/launches';

export type { TickOptions } from './systems/types';

export const DEFAULT_TICK: Required<TickOptions> = {
  accelFailureProbPerMonth: 1 / 8000,
  commissionFailProb: 0.04,
  repairMonths: 4, // RMA turnaround when no spare is on the shelf
  maxAvailableContracts: 10,
};

/** store.placeRack uses this: months from placement until a rack is online. */
export const RACK_READY_LEAD = 2;

/** Rack failure probability for n accelerators. Scales with count (at 16k GPUs
 *  something is always broken) and triples when cooling capacity is undersized. */
export const rackFailureProb = (
  accelerators: number,
  coolingStressed: boolean,
  pAccelPerMonth: number = DEFAULT_TICK.accelFailureProbPerMonth,
): number => 1 - Math.exp(-Math.max(0, accelerators) * pAccelPerMonth * (coolingStressed ? 3 : 1));

/** The month, in order. Add new dynamics by inserting a System here. */
export const PIPELINE: readonly System[] = [
  deliveries, vendorsSystem, floorSpace, commissioning, clusterStats, staffingCheck, failures, pue,
  serveContracts, rivalsSystem, contractMarket, worldEvents, launchesSystem, spotAndPower, finances, history, story, board, endgame,
];

/** Remember the worst thing that happened to the player, for the end screen. */
const INCIDENT_RANK: [string, number][] = [['🔥', 5], ['🔌', 4], ['❄', 3], ['💸', 3], ['🚢', 2], ['🧵', 2], ['🌡', 1]];
function recordIncidents(s: GameState, logs: LogEntry[]): void {
  s.stats ??= { contractsCompleted: 0, peakAccels: 0, slaMisses: 0, revenueTotal: 0, decommissioned: 0 };
  for (const l of logs) {
    const hit = INCIDENT_RANK.find(([e]) => l.text.startsWith(e));
    if (hit && (!s.stats.worstIncident || hit[1] > s.stats.worstIncident.rank)) s.stats.worstIncident = { month: l.month, rank: hit[1], text: l.text.replace(/^\S+\s*/, '') };
  }
}

export function advanceMonth(state: GameState, opts: TickOptions = {}): GameState {
  if (state.status && state.status !== 'playing') return state; // game over: the world stops
  const s: GameState = JSON.parse(JSON.stringify(state)) as GameState;
  const rng = mulberry32((s.seed ^ Math.imul(s.month + 1, 0x9e3779b9)) >>> 0);
  s.month += 1;
  const logs: LogEntry[] = [];
  const cluster = clusterContextOf(s);
  const c: TickCtx = {
    s, o: { ...DEFAULT_TICK, ...opts }, rng,
    log: (level, text) => logs.push({ month: s.month, level, text }),
    placed: [], placedById: new Map(), cluster,
    refreshStats: () => {
      const online = (cl: GameState['clusters'][number]) => cl.rackIds.filter((id) => c.placedById.get(id)?.status === 'online');
      for (const cl of s.clusters) cl.stats = evaluateCluster({ ...cl, rackIds: online(cl) }, cluster);
    },
    revenue: 0, served: new Set(), opexUSD: 0, depreciation: 0, interest: 0,
  };
  for (const system of PIPELINE) system.run(c);
  recordIncidents(s, logs);
  s.log = [...s.log, ...logs].slice(-400);
  return s;
}
