// Staffing rules: how many operators a datacenter needs and what a shortage costs.
import { STAFF_COST_PER_MONTH } from './economy';
import type { GameState } from '../types';

export const RECRUIT_COST_USD = 15_000;
export const SEVERANCE_USD = 2 * STAFF_COST_PER_MONTH;

export interface StaffNeed {
  needed: number;
  breakdown: { label: string; n: number }[];
}
export interface StaffEffect {
  /** Multiplier on per-rack failure probability (1 = fully staffed, up to 2.5). */
  failureMult: number;
  /** Extra months on no-spare repairs when badly understaffed. */
  repairExtraMonths: number;
}

/** One ops technician per 10 online racks, +1 liquid-cooling specialist if any
 *  DLC/immersion hall has online racks, +1 network engineer per 1024 clustered
 *  accelerators. An empty datacenter still needs a skeleton crew of 1. */
export function staffNeeded(g: GameState): StaffNeed {
  let onlineRacks = 0;
  let liquidOnline = false;
  for (const h of g.halls) {
    const on = h.racks.filter((r) => r.status === 'online').length;
    onlineRacks += on;
    if (on > 0 && (h.coolingClass === 'dlc' || h.coolingClass === 'immersion')) liquidOnline = true;
  }
  const accels = g.clusters.reduce((n, cl) => n + (cl.stats?.accelerators ?? 0), 0);
  const breakdown: StaffNeed['breakdown'] = [];
  if (onlineRacks > 0) breakdown.push({ label: 'ops technicians', n: Math.ceil(onlineRacks / 10) });
  if (liquidOnline) breakdown.push({ label: 'liquid-cooling specialist', n: 1 });
  if (accels > 0) breakdown.push({ label: 'network engineers', n: Math.ceil(accels / 1024) });
  return { needed: Math.max(1, breakdown.reduce((n, b) => n + b.n, 0)), breakdown };
}

/** Shortfall fraction of needed staff: failures scale with 1 + 1.5*shortfall,
 *  and repairs without spares take a month longer past a third short. */
export function staffEffect(g: GameState): StaffEffect {
  const { needed } = staffNeeded(g);
  const shortfall = Math.max(0, needed - g.staff) / needed;
  return { failureMult: 1 + 1.5 * shortfall, repairExtraMonths: shortfall >= 0.34 ? 1 : 0 };
}
