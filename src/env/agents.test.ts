import { describe, it, expect } from 'vitest';
import { rollout, randomAgent, idleAgent, operatorAgent } from './agents';
import { mulberry32 } from '../sim/rng';

describe('reward separates agents', () => {
  it('operator > idle, and random is not better than the operator', () => {
    const seeds = [11, 12, 13, 14, 15]; const mean = (f: (s: number) => number) => seeds.map(f).reduce((a, b) => a + b, 0) / seeds.length;
    const idle = mean(s => rollout(idleAgent, s, 60).ret);
    const rnd = mean(s => rollout(randomAgent(mulberry32(s)), s, 60).ret);
    const op = mean(s => rollout(operatorAgent, s, 60).ret);
    console.log(`MEAN RETURN ($M net worth, 60 mo): idle ${idle.toFixed(2)} random ${rnd.toFixed(2)} operator ${op.toFixed(2)}`);
    expect(idle).toBeLessThan(0); // standing still must lose money (no free grants)
    expect(op).toBeGreaterThan(idle);
    expect(op).toBeGreaterThan(rnd);
  }, 240000);
});
