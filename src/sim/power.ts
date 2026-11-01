// ===========================================================================
// Power procurement + spot GPU capacity.
//  - Offers: grid utility / solar PPA / gas / hydro / nuclear, each with a committed MW (take-or-pay),
//    an allowed overdraw ("oversubscription limit") billed at a premium, and a firmness (curtailment risk).
//  - Settlement: take-or-pay on committed MW; surplus MW resold to the grid below spot; overdraw billed at
//    a premium up to the limit; anything beyond falls to the spot utility rate (or is curtailed if a supplier fails).
//  - Spot GPU market: idle clustered accelerators sell at a mean-reverting spot price if above your reserve.
// Mutates the state passed in (tick works on a copy).
// ===========================================================================
import type { GameState, PowerContract, PowerOffer } from '../types';
import type { RNG } from './rng';
import { gpuHourAnchor } from './market';
import { HOURS_PER_MONTH } from './economy';

type Log = (level: 'info' | 'good' | 'bad', text: string) => void;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const r2 = (x: number) => Math.round(x * 100) / 100;

const SOURCES = {
  grid:    { names: ['Metro Utility', 'Regional Grid Co-op', 'StateWide Electric'], priceMWh: [58, 74], term: [12, 36], overdraw: [0.15, 0.3], overage: 1.4, firmness: [0.9, 0.97], lesson: 'Utility firm service: reliable and flexible, priced near spot. Overdraw is tolerated until the interconnect trips.' },
  solar:   { names: ['SunHarvest PPA', 'Helios Renewables', 'DesertBright Solar'], priceMWh: [34, 46], term: [60, 120], overdraw: [0.0, 0.05], overage: 2.0, firmness: [0.72, 0.82], lesson: 'Solar PPA: cheapest energy, but non-firm — nights and clouds mean you fall back to the grid at spot.' },
  gas:     { names: ['Cascade Gas Peakers', 'Permian Power', 'Gulf Coast Generation'], priceMWh: [78, 98], term: [24, 60], overdraw: [0.05, 0.12], overage: 1.8, firmness: [0.96, 0.99], lesson: 'Gas generation: dispatchable and firm, but fuel-indexed and expensive. Tight overdraw limits.' },
  hydro:   { names: ['Columbia Basin Hydro', 'Alpine Hydro Co'], priceMWh: [38, 52], term: [60, 180], overdraw: [0.05, 0.1], overage: 1.6, firmness: [0.9, 0.95], lesson: 'Hydro: cheap, low-carbon baseload with long terms — but droughts happen.' },
  nuclear: { names: ['Ridgeline Nuclear', 'Harbor Atomic'], priceMWh: [48, 62], term: [120, 240], overdraw: [0.0, 0.03], overage: 2.5, firmness: [0.985, 0.998], lesson: 'Nuclear PPA: the firmest carbon-free power, long take-or-pay terms and almost no overdraw — you must size the commit carefully.' },
} as const;
export const POWER_SOURCES = SOURCES;

export function generatePowerOffers(s: GameState, rng: RNG, n = 1): PowerOffer[] {
  const out: PowerOffer[] = [];
  const hallKW = s.halls.reduce((a, h) => a + h.itPowerKW, 0);
  for (let i = 0; i < n; i++) {
    const kinds = Object.keys(SOURCES) as (keyof typeof SOURCES)[];
    const kind = kinds[Math.floor(rng() * kinds.length)];
    if ((kind === 'nuclear' || kind === 'hydro') && s.reputation < 15 && rng() < 0.7) continue;
    const t = SOURCES[kind];
    const pick = (a: readonly number[]) => a[0] + (a[1] - a[0]) * rng();
    const baseMW = Math.max(1, Math.round((hallKW / 1000) * (0.4 + rng() * 1.2) * (kind === 'nuclear' ? 3 : 1)));
    out.push({
      id: `pw-${s.month}-${Math.floor(rng() * 1e5)}`, supplier: t.names[Math.floor(rng() * t.names.length)], source: kind,
      mw: baseMW, priceUSDPerMWh: Math.round(pick(t.priceMWh)), termMonths: Math.round(pick(t.term)),
      overdrawPct: r2(pick(t.overdraw)), overageMult: t.overage, firmness: r2(pick(t.firmness)), offerUntil: s.month + 4,
    });
  }
  return out;
}

export interface PowerSettlement { netUSD: number; contractUSD: number; overageUSD: number; spotUSD: number; resaleUSD: number; committedMW: number; capMW: number; drawMW: number; avgUSDPerMWh: number }

/** Compute this month's power bill. `drawMW` = facility draw incl. PUE. With no contracts this equals the legacy spot-utility bill. */
export function settlePower(s: GameState, drawMW: number, rng: RNG, log: Log): PowerSettlement {
  const spotMWh = s.utilityUSDPerKWh * 1000;
  const cs = s.powerContracts ?? [];
  const live = cs.filter((c) => s.month >= c.startMonth && s.month <= c.endMonth);
  if (!live.length) return { netUSD: drawMW * spotMWh * HOURS_PER_MONTH, contractUSD: 0, overageUSD: 0, spotUSD: drawMW * spotMWh * HOURS_PER_MONTH, resaleUSD: 0, committedMW: 0, capMW: 0, drawMW, avgUSDPerMWh: spotMWh };
  let contractUSD = 0, committed = 0, cap = 0, overageCap = 0, overagePrice = 0;
  const delivered: { c: PowerContract; frac: number }[] = [];
  for (const c of live) {
    contractUSD += c.mw * c.priceUSDPerMWh * HOURS_PER_MONTH; // take-or-pay
    const failed = rng() > c.firmness;
    const frac = failed ? (c.source === 'solar' ? 0.35 : 0.5) : 1;
    if (failed) log('bad', `${c.supplier} (${c.source}) curtailed — only ${Math.round(frac * 100)}% delivered this month. You still pay take-or-pay and buy the gap at spot.`);
    delivered.push({ c, frac });
    committed += c.mw * frac; cap += c.mw * frac * (1 + c.overdrawPct);
    overageCap += c.mw * frac * c.overdrawPct; overagePrice = Math.max(overagePrice, c.priceUSDPerMWh * c.overageMult);
  }
  const base = delivered.reduce((a, d) => a + d.c.mw * d.frac, 0);
  let overageUSD = 0, spotUSD = 0, resaleUSD = 0;
  if (drawMW <= base) resaleUSD = (base - drawMW) * spotMWh * 0.8 * HOURS_PER_MONTH;
  else {
    const over = Math.min(drawMW - base, overageCap);
    overageUSD = over * overagePrice * HOURS_PER_MONTH;
    const rest = drawMW - base - over;
    if (rest > 0) spotUSD = rest * spotMWh * HOURS_PER_MONTH;
  }
  const net = contractUSD + overageUSD + spotUSD - resaleUSD;
  return { netUSD: net, contractUSD, overageUSD, spotUSD, resaleUSD, committedMW: committed, capMW: cap, drawMW, avgUSDPerMWh: drawMW > 0 ? net / (drawMW * HOURS_PER_MONTH) : 0 };
}

/** Monthly power-market upkeep: expire offers/contracts, add offers. */
export function powerMarketTick(s: GameState, rng: RNG, log: Log): void {
  s.powerOffers = (s.powerOffers ?? []).filter((o) => o.offerUntil >= s.month);
  const ended = (s.powerContracts ?? []).filter((c) => s.month > c.endMonth);
  for (const c of ended) log('info', `Power contract with ${c.supplier} (${c.mw} MW) has ended. Renegotiate on the Energy screen or you are back on the spot utility rate.`);
  s.powerContracts = (s.powerContracts ?? []).filter((c) => s.month <= c.endMonth);
  if (rng() < 0.45) s.powerOffers = [...s.powerOffers, ...generatePowerOffers(s, rng, 1)].slice(-6);
}

// ---------- spot GPU market ----------
export const SPOT_HISTORY_LEN = 24;
export const spotAnchor = (month: number) => gpuHourAnchor(2020 + month / 12) * 0.85;

export function spotUtilization(price: number, month: number): number {
  return clamp(1.2 - 0.95 * (price / gpuHourAnchor(2020 + month / 12)), 0.12, 0.95);
}

/** Advance the spot price (mean-reverting with shocks; spikes when many people want GPUs). */
export function stepSpotPrice(s: GameState, rng: RNG): void {
  const anchor = spotAnchor(s.month);
  const cur = s.spotPrice ?? anchor;
  const shock = (rng() - 0.5) * 0.22 + (rng() < 0.06 ? (rng() < 0.5 ? 0.35 : -0.3) : 0);
  const next = clamp(cur + (anchor - cur) * 0.2 + cur * shock, anchor * 0.4, anchor * 2.2);
  s.spotPrice = r2(next);
  s.spotHistory = [...(s.spotHistory ?? []), s.spotPrice].slice(-SPOT_HISTORY_LEN);
}

/** Revenue from selling idle clustered accelerators on the spot market. */
export function spotRevenue(s: GameState, servedClusterIds: Set<string>, accelsOfDesign: (designId: string) => number = () => 0): { revenue: number; accels: number; util: number } {
  const price = s.spotPrice ?? spotAnchor(s.month);
  if (price < (s.spotReserve ?? 0)) return { revenue: 0, accels: 0, util: 0 };
  const util = spotUtilization(price, s.month);
  let accels = 0;
  for (const id of s.spotClusters ?? []) {
    if (servedClusterIds.has(id)) continue;
    accels += s.clusters.find((c) => c.id === id)?.stats?.accelerators ?? 0;
  }
  const inClusterSpot = new Set(s.spotClusters ?? []);
  for (const id of s.spotRacks ?? []) {
    const pr = s.halls.flatMap((h) => h.racks).find((r) => r.id === id);
    if (!pr || pr.status !== 'online') continue;
    if (pr.clusterId && (servedClusterIds.has(pr.clusterId) || inClusterSpot.has(pr.clusterId))) continue;
    accels += accelsOfDesign(pr.designId);
  }
  return { revenue: accels * util * price * HOURS_PER_MONTH, accels, util };
}
