// Rival AI-cloud operators. Their installed base and pricing push the market
// price index that scales every freshly generated contract offer (see market.ts).
import { monthToYear, type GameState, type Rival } from '../types';
import { gpuHourAnchor } from './market';
import { mulberry32, randRange, type RNG } from './rng';
import { rackAccels } from './systems/helpers';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

const RIVAL_ARCHETYPES: { id: string; name: string; style: Rival['style']; accels: number; priceMult: number; aggression: number }[] = [
  { id: 'hyperion', name: 'Hyperion Cloud', style: 'hyperscaler', accels: 4000, priceMult: 1.0, aggression: 0.5 },
  { id: 'nimbus', name: 'Nimbus Compute', style: 'neocloud', accels: 800, priceMult: 0.85, aggression: 0.8 },
  { id: 'atlas', name: 'Atlas Sovereign AI', style: 'sovereign', accels: 300, priceMult: 1.05, aggression: 0.3 },
];

/** The three rivals, with ±10% fleet jitter drawn deterministically from the game seed. */
export function initialRivals(seed: number): Rival[] {
  const rng = mulberry32((seed ^ 0x511a13) >>> 0);
  return RIVAL_ARCHETYPES.map((a) => ({ ...a, accels: Math.round(a.accels * randRange(rng, 0.9, 1.1)), cash: 0 }));
}

/** Player accelerators sitting in racks that are online right now. */
export function onlineAccels(s: GameState): number {
  let n = 0;
  for (const h of s.halls) for (const r of h.racks) if (r.status === 'online') n += rackAccels(s, r.designId);
  return n;
}

/** One month of rival behaviour. Draws the rng EXACTLY ONCE per rival, in fixed
 *  order (hyperion, nimbus, atlas): fleets compound, cash trickles in, and each
 *  priceMult drifts 10% of the way toward 0.7 + (1 - playerShare) * 0.4 —
 *  rivals hold a premium while they own the market and undercut toward 0.7 as
 *  the player's share of supply grows. */
export function stepRivals(s: GameState, rng: RNG): void {
  const rivals = s.rivals ?? (s.rivals = initialRivals(s.seed));
  const mine = onlineAccels(s);
  const rivalTotal = rivals.reduce((n, r) => n + r.accels, 0);
  const supplyShare = mine / Math.max(1, mine + rivalTotal);
  const demandFactor = clamp(gpuHourAnchor(monthToYear(s.month)) / 2.5, 0.5, 1.5);
  for (const r of rivals) {
    const growth = r.aggression * randRange(rng, 0.005, 0.015) * demandFactor;
    r.accels = Math.round(r.accels * (1 + growth));
    r.cash += r.accels * 0.3;
    const target = 0.7 + (1 - supplyShare) * 0.4;
    r.priceMult += (target - r.priceMult) * 0.1;
  }
}

/** Market price index applied to new contract offers.
 *
 *  index = clamp(0.5 + 0.42 * rivalMeanPrice + 0.28 * playerShare, 0.7, 1.15)
 *
 *  - rivalMeanPrice = accel-weighted mean of rival priceMult; playerShare =
 *    online player accels / (player + all rival accels).
 *  - No player capacity and rivals near list price (~0.98) → ≈0.91, i.e. the
 *    market opens slightly soft (~0.9): you sell into someone else's glut.
 *  - Player holding >50% of supply → ≈1.05+: scarce alternative capacity earns
 *    a premium; the term is strictly monotonic in player share.
 *  - Rivals undercutting hard (mean → 0.7) with no player share → ≈0.79, so
 *    heavy competition bottoms out above the 0.75 line; the clamp keeps every
 *    offer within [0.7, 1.15] regardless. */
export function priceIndexOf(s: GameState, playerAccels: number = onlineAccels(s)): number {
  const rivals = s.rivals ?? [];
  const rivalAccels = rivals.reduce((n, r) => n + r.accels, 0);
  if (rivalAccels <= 0) return 1;
  const rivalMean = rivals.reduce((n, r) => n + r.accels * r.priceMult, 0) / rivalAccels;
  const playerShare = playerAccels / (playerAccels + rivalAccels);
  return clamp(0.5 + 0.42 * rivalMean + 0.28 * playerShare, 0.7, 1.15);
}
