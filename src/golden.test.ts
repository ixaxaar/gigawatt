import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { mulberry32 } from './sim/rng';
// Regenerates golden vectors that the Godot ports must reproduce.
it('export rng golden', () => {
  const out: Record<string, number[]> = {};
  for (const s of [0, 1, 42, 99999, 4294967295]) { const r = mulberry32(s); out[s] = Array.from({ length: 50 }, () => r()); }
  writeFileSync('godot/tests/rng_golden.json', JSON.stringify(out));
});
