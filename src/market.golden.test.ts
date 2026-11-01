import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { mulberry32 } from './sim/rng';
import { generateContracts } from './sim/market';
import type { GameState } from './types';

// Regenerates golden contract vectors that the Godot port (godot/game/market.gd) must reproduce.
it('export market golden', () => {
  const state: GameState = {
    month: 0,
    seed: 7,
    cash: 2_000_000,
    debt: 0,
    reputation: 75,
    halls: [],
    trays: [],
    racks: [],
    clusters: [],
    inventory: {},
    orders: [],
    availableContracts: [],
    activeContracts: [],
    log: [],
    staff: 3,
    utilityUSDPerKWh: 0.11,
    codexSeen: [],
    missionsDone: [],
    history: [],
  };
  const cases = [11, 24, 48, 80].map((month) => ({
    month,
    seed: 7,
    contracts: generateContracts(state, month, mulberry32(7)),
  }));
  // Extra coverage: seed 7 never takes the training branch at any month.
  for (const [month, seed] of [[11, 23], [24, 42], [48, 36], [80, 28]] as const) {
    cases.push({ month, seed, contracts: generateContracts(state, month, mulberry32(seed)) });
  }
  writeFileSync('godot/tests/market_golden.json', JSON.stringify({ state, cases }, null, 1));
});
