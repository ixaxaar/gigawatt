// Operating policy: burn-in length and maintenance level trade speed/cost against reliability.
import type { GameState, OpsPolicy } from '../types';

export const DEFAULT_POLICY: OpsPolicy = { burnInMonths: 1, maintenance: 0 };
export const policyOf = (g: GameState): OpsPolicy => g.policy ?? DEFAULT_POLICY;

/** Extra/less months until a rack is online versus the standard 2-month lead (burn-in 1 = standard). */
export const burnInLeadDelta = (g: GameState): number => policyOf(g).burnInMonths - 1;
/** Multiplier on the chance a rack fails burn-in: skipping burn-in ships dead GPUs; long burn-in catches them. */
export const BURN_IN_FAIL_MULT = [3, 1, 0.5, 0.25] as const;
export const commissionFailMult = (g: GameState): number => BURN_IN_FAIL_MULT[policyOf(g).burnInMonths] ?? 1;
/** Multiplier on in-service failure probability. */
export const MAINT_FAIL_MULT = [1, 0.75, 0.55] as const;
export const maintenanceFailMult = (g: GameState): number => MAINT_FAIL_MULT[policyOf(g).maintenance] ?? 1;
/** USD per online rack per month for the maintenance programme. */
export const MAINT_COST_PER_RACK = [0, 150, 400] as const;
export const maintenanceUSD = (g: GameState): number => {
  const racks = g.halls.reduce((n, h) => n + h.racks.filter((r) => r.status === 'online').length, 0);
  return racks * (MAINT_COST_PER_RACK[policyOf(g).maintenance] ?? 0);
};
