// Refactor safety net: full-game trajectories must stay bit-identical.
// Regenerate deliberately with GOLDEN_UPDATE=1 when game rules change on purpose.
import { it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import * as E from './env/env';
import { SCENARIOS } from './env/scenarios';
import { operatorAgent, randomAgent, idleAgent, type Agent } from './env/agents';
import { mulberry32 } from './sim/rng';

const FILE = 'src/__golden__/trajectories.json';
function run(agent: Agent, seed: number, months: number, scenarioId?: string): string[] {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  let obs = E.reset({ seed, scenario }); const hashes: string[] = [];
  for (let m = 0; m < months; m++) {
    for (const a of agent(obs, () => E.legalActions())) { const r = E.step(a); obs = r.obs; if (r.done) return hashes; }
    hashes.push(E.hash());
  }
  return hashes;
}
it('trajectories are unchanged', () => {
  const out: Record<string, string[]> = {};
  for (const seed of [11, 12]) {
    out[`operator-${seed}`] = run(operatorAgent, seed, 36);
    out[`random-${seed}`] = run(randomAgent(mulberry32(seed)), seed, 24);
    out[`idle-${seed}`] = run(idleAgent, seed, 24);
  }
  for (const id of ['gold-rush-2025', 'stress-campus']) if (SCENARIOS.some((s) => s.id === id)) out[`op-${id}`] = run(operatorAgent, 5, 12, id);
  if (process.env.GOLDEN_UPDATE || !existsSync(FILE)) { writeFileSync(FILE, JSON.stringify(out)); return; }
  expect(out).toEqual(JSON.parse(readFileSync(FILE, 'utf8')));
}, 300000);
