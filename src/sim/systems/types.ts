// The monthly tick is an ordered pipeline of independent systems. Each system reads/writes the
// shared TickCtx; order is defined once in ../tick.ts. New dynamics (lifecycle, competitors,
// maintenance...) are new systems, not edits to a 350-line function.
import type { GameState, LogEntry, PlacedRack } from '../../types';
import type { RNG } from '../rng';
import type { ClusterContext } from '../network';

export interface TickOptions {
  /** Probability one accelerator fails in a month (MTBF scaling: p_rack = 1 - e^(-n*p)). */
  accelFailureProbPerMonth?: number;
  /** Probability a rack fails burn-in when commissioning completes. */
  commissionFailProb?: number;
  /** Months a failed rack takes to repair. */
  repairMonths?: number;
  /** Cap on the available-contracts board. */
  maxAvailableContracts?: number;
}

export interface TickCtx {
  /** The new (cloned) state being advanced; systems mutate it. */
  s: GameState;
  o: Required<TickOptions>;
  rng: RNG;
  log: (level: LogEntry['level'], text: string) => void;
  /** Every placed rack across halls (filled by the commissioning system). */
  placed: PlacedRack[];
  placedById: Map<string, PlacedRack>;
  /** Cluster evaluation context (designs/trays/catalog lookups). */
  cluster: ClusterContext;
  /** Re-evaluate cluster stats from currently-online racks. */
  refreshStats: () => void;
  /** Revenue accumulated this month by contract + spot systems. */
  revenue: number;
  /** Clusters that served a contract this month (spot sells only the rest). */
  served: Set<string>;
  /** Filled by the finance system, read by history. */
  opexUSD: number;
  depreciation: number;
  interest: number;
}

export type System = { id: string; run: (c: TickCtx) => void };
