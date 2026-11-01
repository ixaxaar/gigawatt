// Seeded, deterministic RNG utilities. The whole sim must be reproducible
// from GameState.seed, so all randomness flows through these.

export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randRange = (rng: RNG, lo: number, hi: number): number => lo + rng() * (hi - lo);

export const randInt = (rng: RNG, lo: number, hi: number): number =>
  Math.floor(lo + rng() * (hi - lo + 1));

export const chance = (rng: RNG, p: number): boolean => rng() < p;

export function pick<T>(rng: RNG, arr: readonly T[]): T {
  return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
}
