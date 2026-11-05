// Read-only engine queries — facility. (Pure functions of the current game; exposed through the bridge.)
import { ledger, machineLedger } from '../../ledger';
import { carrierCount, totalNeedGbps, uplinkGbps, uplinkMonthlyUSD } from '../../sim/internet';
import { hallResilience } from '../../sim/resilience';
import { FLOOR_UNIT_COST, FLOOR_UNIT_SLOTS, floorCommissionMonths } from '../../store';
import { G } from './shared';

export const facilityQueries: Record<string, (...a: any[]) => any> = {
  ledger: () => ledger(G()),
  machineLedger: () => machineLedger(G()),
  floorQuote: (n) => ({ units: n, slots: n * FLOOR_UNIT_SLOTS, cost: n * FLOOR_UNIT_COST, months: floorCommissionMonths(n) }),
  resilience: (hallId) => hallResilience(G().halls.find(h => h.id === hallId)!),
  internet: () => { const g = G(); return { have: uplinkGbps(g), need: totalNeedGbps(g), carriers: carrierCount(g), mrc: uplinkMonthlyUSD(g) }; },
};
