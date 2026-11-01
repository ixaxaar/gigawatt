import { describe, expect, it } from 'vitest';
import { buildOptions } from './contractfit';
import { newGameState } from './store';

describe('buildOptions', () => {
  it('turns starter offers into purchasable, costed builds', () => {
    let n = 0;
    for (let seed = 1; seed < 12; seed++) {
      const g = newGameState(seed);
      for (const c of g.availableContracts) {
        const o = buildOptions(g, c);
        for (const x of o) { n++; expect(x.cost).toBeGreaterThan(0); expect(x.racks).toBeGreaterThan(0); expect(x.lead).toBeGreaterThan(0); }
      }
    }
    expect(n).toBeGreaterThan(0);
  });
});
