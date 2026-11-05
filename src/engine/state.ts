import { SAVE_VERSION } from './persistence';
import { getItem } from '../data';
import { generateContracts } from '../sim/market';
import { initialRivals } from '../sim/rivals';
import { generatePowerOffers } from '../sim/power';
import { mulberry32 } from '../sim/rng';
import { computePUE } from '../sim/validate';
import { GameState, HallState } from '../types';
import { START_MONTH } from './pricing';

export function newGameState(seed: number): GameState {
  const hall: HallState = {
    id: 'hall-1',
    name: 'Hall A',
    coolingClass: 'air',
    rackSlots: 40,
    itPowerKW: 500,
    coolingKW: 600,
    pue: 1,
    powerEquip: { 'et-padmount-2500': 1, 'se-galaxy-vs-500': 1 },
    coolingEquip: { 'vt-crah-100': 6 },
    racks: [],
    floorLoadKgPerRack: 1500,
  };
  hall.pue = computePUE(hall, getItem);
  const g: GameState = {
    month: START_MONTH,
    seed,
    cash: 50_000_000,
    debt: 0,
    reputation: 10,
    halls: [hall],
    trays: [],
    racks: [],
    clusters: [],
    inventory: {},
    orders: [],
    availableContracts: [],
    activeContracts: [],
    log: [],
    staff: 2,
    utilityUSDPerKWh: 0.07,
    uplinks: { 'transit-10g-a': 1 },
    codexSeen: [],
    missionsDone: [],
    history: [],
    powerOffers: [],
    powerContracts: [],
    spotClusters: [],
    spotReserve: 0,
    status: 'playing',
    negCashMonths: 0,
    saveVersion: SAVE_VERSION,
    stats: { contractsCompleted: 0, peakAccels: 0, slaMisses: 0, revenueTotal: 0, decommissioned: 0 },
    rivals: initialRivals(seed),
    marketPriceIndex: 1,
  };
  g.powerOffers = [...generatePowerOffers(g, mulberry32(seed + 1), 3)];
  g.availableContracts = generateContracts(g, START_MONTH, mulberry32(seed));
  g.log.push({
    month: START_MONTH,
    level: 'info',
    text: 'GIGAWATT day one: $50M cash, Hall A with 500 kW IT power / 600 kW air cooling over 40 rack slots, utility at $0.07/kWh.',
  });
  g.log.push({
    month: START_MONTH,
    level: 'info',
    text: 'Order parts, design a tray and rack, then place racks — contracts on the market pay once a cluster serves them.',
  });
  return g;
}

