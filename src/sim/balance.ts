// Economy tuning knobs in one place. The playtest sweep (PLAYTEST=1 vitest run src/playtest) and src/balance.test.ts
// pin the outcomes these produce; change a value here, re-run the sweep, and keep the targets in balance.test.ts green.
export const BAL = {
  /** Multiplier on contract $/accelerator-hour for training offers. */
  trainPrice: 1.0,
  /** Multiplier on inference offer sizes (tokens/s). Prices per Mtok stay calibrated to real API prices. */
  inferDemand: 3,
  /** A fully used GPU serving inference earns this multiple of the reserved GPU-hour price. */
  inferPremium: 2.4,
  /** Spot sells at this fraction of the reserved-contract anchor price. */
  spotDiscount: 0.6,
  /** Spot demand depth by year: how many GPUs the spot market can absorb at the quoted fill rate. */
  spotDepth: [[2020, 40], [2022, 150], [2024, 450], [2026, 800], [2028, 1200]] as [number, number][],
  /** Spot price multiplier for an accelerator that is 0, 1, 2, 3 launch-years behind the current top part. */
  spotGeneration: [1, 0.7, 0.5, 0.35],
  /** Fraction of revenue lost per unit of staffing shortfall (0..1). */
  understaffedAvail: 0.5,
};

export const lerpPoints = (pts: [number, number][], x: number): number => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  return pts[pts.length - 1][1];
};
