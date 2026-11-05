import type { ActiveContract, GameState, RackDesign, TrayDesign } from '../types';
import { getItem } from '../data';
import { uplinkMonthlyUSD } from './internet';
import { maintenanceUSD } from './policy';

export const HOURS_PER_MONTH = 730;
export const STAFF_COST_PER_MONTH = 12000;
export const SUPPORT_RATE_PER_YEAR = 0.05;
export const DEPRECIATION_YEARS = 5;
export const DEFAULT_APR = 0.07;
const FALLBACK_PUE = 1.4;

export interface OpexOptions {
  itPowerKW?: number;
  pue?: number;
  capexUSD?: number;
  staffCostPerMonth?: number;
}

export interface OpexBreakdown {
  itPowerKW: number;
  pue: number;
  kwh: number;
  powerUSD: number;
  staffUSD: number;
  supportUSD: number;
  networkUSD: number;
  maintenanceUSD: number;
  totalUSD: number;
}

const clusterPowerKW = (state: GameState): number =>
  state.clusters.reduce((s, c) => s + (c.stats?.powerKW ?? 0), 0);

const weightedPue = (state: GameState): number => {
  const total = state.halls.reduce((s, h) => s + h.itPowerKW, 0);
  if (total <= 0) {
    const ps = state.halls.map((h) => h.pue);
    return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : FALLBACK_PUE;
  }
  return state.halls.reduce((s, h) => s + h.pue * h.itPowerKW, 0) / total;
};

export function monthlyOpex(state: GameState, opts: OpexOptions = {}): OpexBreakdown {
  const itPowerKW = Math.max(0, opts.itPowerKW ?? clusterPowerKW(state));
  const pue = opts.pue ?? weightedPue(state);
  const kwh = itPowerKW * pue * HOURS_PER_MONTH;
  const powerUSD = kwh * state.utilityUSDPerKWh;
  const staffUSD = state.staff * (opts.staffCostPerMonth ?? STAFF_COST_PER_MONTH);
  const supportUSD = ((opts.capexUSD ?? estimateCapexBasis(state)) * SUPPORT_RATE_PER_YEAR) / 12;
  const networkUSD = uplinkMonthlyUSD(state);
  const maintenance = maintenanceUSD(state);
  return {
    itPowerKW,
    pue,
    kwh,
    powerUSD,
    staffUSD,
    supportUSD,
    networkUSD,
    maintenanceUSD: maintenance,
    totalUSD: powerUSD + staffUSD + supportUSD + networkUSD + maintenance,
  };
}

export const monthlyDepreciation = (capexUSD: number, years: number = DEPRECIATION_YEARS): number =>
  years > 0 ? capexUSD / (years * 12) : 0;

export const monthlyInterest = (debtUSD: number, apr: number = DEFAULT_APR): number =>
  (debtUSD * apr) / 12;

export function loanMonthlyPayment(principal: number, apr: number, months: number): number {
  if (months <= 0) return principal;
  const r = apr / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function trayBomValue(design: TrayDesign): number {
  let v = getItem(design.chassisId)?.priceUSD ?? 0;
  return v + design.parts.reduce((s, p) => s + (getItem(p.itemId)?.priceUSD ?? 0) * p.count, 0);
}

export function rackBomValue(state: GameState, design: RackDesign): number {
  let v = getItem(design.rackId)?.priceUSD ?? 0;
  for (const item of design.items) {
    if (item.type === 'tray') {
      const tray = state.trays.find((t) => t.id === item.trayId);
      v += (tray ? trayBomValue(tray) : 0) * item.count;
    } else {
      const id = item.type === 'switch' ? item.switchId : item.type === 'storage' ? item.storageId : item.powerId;
      v += (getItem(id)?.priceUSD ?? 0) * item.count;
    }
  }
  return v;
}

/** Current capitalized equipment: inventory + hall plant + installed rack BOMs. */
export function estimateCapexBasis(state: GameState): number {
  let v = 0;
  for (const [id, count] of Object.entries(state.inventory)) v += (getItem(id)?.priceUSD ?? 0) * count;
  for (const hall of state.halls) {
    for (const [id, count] of Object.entries(hall.powerEquip)) v += (getItem(id)?.priceUSD ?? 0) * count;
    for (const [id, count] of Object.entries(hall.coolingEquip)) v += (getItem(id)?.priceUSD ?? 0) * count;
    for (const rack of hall.racks) {
      const design = state.racks.find((r) => r.id === rack.designId);
      if (design) v += rackBomValue(state, design);
    }
  }
  return v;
}

export interface RevenueOptions {
  /** Training: accelerators serving the contract this month. */
  accelerators?: number;
  /** Inference: sustained output tokens/s this month. */
  tokensPerSec?: number;
  /** Achieved availability fraction 0..1 for the month. */
  availability: number;
  hoursPerMonth?: number;
}

export interface RevenueResult {
  grossUSD: number;
  billableUSD: number;
  penaltyUSD: number;
  netUSD: number;
  slaMet: boolean;
}

export function contractRevenue(ac: ActiveContract, opts: RevenueOptions): RevenueResult {
  const hours = opts.hoursPerMonth ?? HOURS_PER_MONTH;
  const c = ac.contract;
  const avail = Math.max(0, Math.min(1, opts.availability));
  const gross =
    c.kind === 'training'
      ? (opts.accelerators ?? 0) * c.pricePerAccelHour * hours
      : (((opts.tokensPerSec ?? 0) * hours * 3600) / 1e6) * c.pricePerMTok;
  const slaMet = avail >= c.slaAvailability;
  const billable = slaMet ? gross : gross * (avail / Math.max(c.slaAvailability, 1e-9));
  const rawPenalty = slaMet ? 0 : gross * c.penaltyRate * Math.max(0, c.slaAvailability - avail) * 100;
  const penalty = Math.min(rawPenalty, gross * 0.25);
  return { grossUSD: gross, billableUSD: billable, penaltyUSD: penalty, netUSD: billable - penalty, slaMet };
}
