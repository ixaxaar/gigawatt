import { describe, expect, it } from 'vitest';
import { settlePower, spotRevenue, generatePowerOffers } from './power';
import { mulberry32 } from './rng';
import { newGameState } from '../store';

const base = () => newGameState(5);
const c = (o: any = {}) => ({ id: 'c', supplier: 'X', source: 'grid' as const, mw: 10, priceUSDPerMWh: 50, termMonths: 24, overdrawPct: 0.2, overageMult: 1.5, firmness: 1, offerUntil: 99, startMonth: 0, endMonth: 99, ...o });
describe('power settlement', () => {
  it('no contracts = spot bill', () => { const g = base(); const r = settlePower(g, 2, () => 0.5, () => {}); expect(r.netUSD).toBeCloseTo(2 * g.utilityUSDPerKWh * 1000 * 730, 0); });
  it('take-or-pay + resale when under-using', () => { const g = { ...base(), month: 12, powerContracts: [c()] }; const r = settlePower(g, 4, () => 0.5, () => {}); expect(r.contractUSD).toBe(10 * 50 * 730); expect(r.resaleUSD).toBeGreaterThan(0); });
  it('overdraw is premium, beyond limit is spot', () => { const g = { ...base(), month: 12, powerContracts: [c()] }; const r = settlePower(g, 15, () => 0.5, () => {}); expect(r.overageUSD).toBeCloseTo(2 * 75 * 730, 0); expect(r.spotUSD).toBeCloseTo(3 * g.utilityUSDPerKWh * 1000 * 730, 0); });
  it('curtailment shrinks delivery', () => { const g = { ...base(), month: 12, powerContracts: [c({ firmness: 0.5 })] }; const r = settlePower(g, 9, () => 0.99, () => {}); expect(r.committedMW).toBe(5); expect(r.spotUSD).toBeGreaterThan(0); });
  it('offers are generated', () => { const o = generatePowerOffers(base(), mulberry32(1), 5); expect(o.length).toBeGreaterThan(0); });
  it('spot revenue only for idle spot clusters above reserve', () => { const g: any = { ...base(), spotPrice: 2, spotReserve: 1, spotClusters: ['a'], clusters: [{ id: 'a', stats: { accelerators: 100 } }] }; expect(spotRevenue(g, new Set()).revenue).toBeGreaterThan(0); expect(spotRevenue(g, new Set(['a'])).revenue).toBe(0); expect(spotRevenue({ ...g, spotReserve: 5 }, new Set()).revenue).toBe(0); });
});
