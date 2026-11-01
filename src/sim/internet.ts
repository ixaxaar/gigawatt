import { getItem } from '../data';
import type { GameState, Uplink } from '../types';

const up = (id: string) => { const i = getItem(id); return i && i.kind === 'uplink' ? (i as Uplink) : undefined; };

/** Total committed internet capacity in Gb/s. Legacy saves without uplinks are treated as unlimited. */
export function uplinkGbps(s: GameState): number {
  if (!s.uplinks) return Infinity;
  return Object.entries(s.uplinks).reduce((n, [id, c]) => n + (up(id)?.gbps ?? 0) * c, 0);
}
export const uplinkMonthlyUSD = (s: GameState): number =>
  Object.entries(s.uplinks ?? {}).reduce((n, [id, c]) => n + (up(id)?.mrcUSD ?? 0) * c, 0);
/** Distinct carriers (a fiber cut takes out one carrier's circuits). */
export const carrierCount = (s: GameState): number =>
  new Set(Object.entries(s.uplinks ?? {}).filter(([, c]) => c > 0).map(([id]) => up(id)?.carrier).filter(Boolean)).size;

/** Gb/s needed to serve a contract: inference streams tokens to users; training ingests datasets and ships checkpoints. */
export function contractNeedGbps(c: { kind: 'training' | 'inference'; minAccelerators?: number; tokensPerSec?: number }): number {
  return c.kind === 'inference' ? Math.max(0.2, (c.tokensPerSec ?? 0) / 50_000) : Math.max(0.2, (c.minAccelerators ?? 0) * 0.02);
}
export function totalNeedGbps(s: GameState): number {
  return s.activeContracts.filter((a) => a.clusterIds.length > 0).reduce((n, a) => n + contractNeedGbps(a.contract as never), 0);
}
