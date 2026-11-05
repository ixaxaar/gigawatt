// ===========================================================================
// Vendor relationships & framework agreements (pure rules; callers mutate
// cloned state). Relationship is 0..100 per vendor: it buys allocation
// headroom (capMultiplier) and a small price discount (relDiscount), rises
// with recorded spend (recordSpend) and decays monthly (REL_DECAY_PER_MONTH).
// Frameworks commit USD over N months for a bigger discount — take-or-pay.
// ===========================================================================
import type { Framework, GameState } from '../types';

export const REL_MAX = 100;
export const FRAMEWORK_MIN_COMMIT_USD = 2_000_000;
export const FRAMEWORK_MIN_MONTHS = 6;
export const FRAMEWORK_MAX_MONTHS = 36;
export const FRAMEWORK_DEPOSIT_PCT = 0.05;
export const FRAMEWORK_CANCEL_PENALTY_PCT = 0.2;
export const FRAMEWORK_CANCEL_REL_HIT = -15;
export const FRAMEWORK_EXPIRY_PENALTY_PCT = 0.15;
export const FRAMEWORK_EXPIRY_REL_HIT = -10;
export const FRAMEWORK_EXPIRY_REL_BONUS = 5;
export const REL_DECAY_PER_MONTH = 0.5;
export const REL_GAIN_PER_ORDER_MAX = 8;
export const REL_GAIN_PER_USD = 1 / 1e6;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const logT = (x: number, lo: number, hi: number) => clamp((Math.log(x) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)), 0, 1);

/** Relationship 0..100 → 0..1. */
export const relBonus = (rel: number): number => clamp(rel, 0, REL_MAX) / REL_MAX;

/** Allocation headroom: 1.0 base, +0.5 at relationship 100, +0.003 per reputation point, capped at 2. */
export const capMultiplier = (g: GameState, vendorId: string): number =>
  Math.min(2, 1 + 0.5 * relBonus(g.vendorRel?.[vendorId] ?? 0) + 0.003 * clamp(g.reputation, 0, 100));

/** Relationship price discount: up to 6% off at relationship 100. */
export const relDiscount = (g: GameState, vendorId: string): number => 0.06 * relBonus(g.vendorRel?.[vendorId] ?? 0);

/** The vendor's live framework this month: inside its window and not yet exhausted (spent < commit). */
export const frameworkFor = (g: GameState, vendorId: string): Framework | undefined =>
  (g.frameworks ?? []).find((f) => f.vendorId === vendorId && f.startMonth <= g.month && g.month <= f.endMonth && f.spentUSD < f.commitUSD);

export const frameworkDiscount = (fw: Framework): number => fw.discountPct / 100;

/**
 * Framework discount %, log-interpolated between the anchors:
 *   3% at $2M/12mo … 12% at $50M/36mo.
 *   sizeT = log position of commitUSD in [$2M, $50M] (clamped 0..1)
 *   termT = log position of months in [12, 36] (clamped 0..1)
 *   pct = 3 + 9 · (sizeT + termT) / 2, rounded to 0.1 — monotonic in both arguments.
 */
export const discountPctFor = (commitUSD: number, months: number): number =>
  Math.round((3 + 9 * ((logT(Math.max(1, commitUSD), 2e6, 50e6) + logT(Math.max(1, months), 12, 36)) / 2)) * 10) / 10;

/** Relationship setter used by actions and the monthly system (clamped 0..100). */
export const adjustRel = (g: GameState, vendorId: string, delta: number): void => {
  g.vendorRel = { ...(g.vendorRel ?? {}), [vendorId]: clamp((g.vendorRel?.[vendorId] ?? 0) + delta, 0, REL_MAX) };
};

/** Credit a purchase: counts toward the live framework and warms the relationship (+1 per $1M, max +8 per order, cap 100). */
export function recordSpend(g: GameState, vendorId: string, usd: number): void {
  const fw = frameworkFor(g, vendorId);
  if (fw) fw.spentUSD += usd;
  adjustRel(g, vendorId, Math.min(REL_GAIN_PER_ORDER_MAX, usd * REL_GAIN_PER_USD));
}
