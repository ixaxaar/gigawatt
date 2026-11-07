import { VENDORS } from '../data';
import { estimateCapexBasis } from '../sim/economy';
import { capMultiplier, frameworkDiscount, frameworkFor, relDiscount } from '../sim/vendors';
import { CatalogItem, GameState, monthToYear } from '../types';
import { preorderOpens, shipMonthOf } from '../data/launches';

// ---------- procurement model (deterministic: f(item, month)) ----------

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (m: number) => `${MONTH_NAMES[((m % 12) + 12) % 12]} ${2020 + Math.floor(m / 12)}`;

export const DEMAND_CURVE: [number, number][] = [
  [2020, 0.2], [2022.4, 0.4], [2023.3, 1.0], [2024.6, 0.9], [2026, 0.55], [2028, 0.5],
];

export const lerpCurve = (pts: [number, number][], x: number): number => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
};

/** 0..1 how hot the AI hardware market is (drives lead times and street prices). */
export const START_MONTH = 11; // Dec 2020: HGX A100 ships, CPUs/NVMe/NICs for a first real build exist
export const demandIndex = (year: number): number => lerpCurve(DEMAND_CURVE, year);

export interface Offer {
  item: CatalogItem;
  available: boolean;
  reason?: string;
  unitPrice: number;
  leadMonths: number;
  /** Per-quarter allocation cap, if the vendor rations this part. */
  qtyCap?: number;
  /** Announced but not shipping yet: you can queue for it now at the launch premium. */
  preorder?: boolean;
  /** Month the part starts shipping (set on pre-orders and on announced-but-not-open parts). */
  ships?: number;
  /** Month pre-orders open (set when the part is announced). */
  opens?: number;
}

/** Price drift + lead-time modulation + availability for a catalog item this month. */
export const offerAt = (item: CatalogItem, month: number, preorder = false): Offer => {
  const year = monthToYear(month);
  if (year < item.availableFrom) {
    const opens = preorderOpens(item);
    const ships = shipMonthOf(item);
    if (preorder && opens !== undefined && month >= opens) {
      // Queue behind the hyperscalers: delivery lands a few months after the part starts shipping, at the launch premium.
      const demand = demandIndex(item.availableFrom);
      const lead = Math.max(1, Math.round(item.leadTimeMonths * (1 + demand * (item.kind === 'accelerator' ? 1 : 0.25))));
      const boom = 1 + demand * (item.kind === 'accelerator' ? 0.18 : 0.06);
      return {
        item, available: true, preorder: true, ships, opens,
        unitPrice: Math.round(item.priceUSD * 1.12 * boom),
        leadMonths: Math.max(1, ships - month + Math.ceil(lead / 2)),
        qtyCap: item.allocationPerQuarter !== undefined ? Math.max(1, Math.floor(item.allocationPerQuarter / 2)) : undefined,
      };
    }
    return {
      item,
      available: false,
      reason: opens !== undefined && month < opens
        ? `Announced — pre-orders open ${monthLabel(opens)}, shipping ${monthLabel(ships)}.`
        : `Not shipping until ${Math.floor(item.availableFrom)} — labs and hyperscalers queue first.`,
      unitPrice: 0,
      leadMonths: 0,
      ships: opens !== undefined ? ships : undefined,
      opens,
    };
  }
  if (item.eolAfter && year > item.eolAfter) {
    return {
      item,
      available: false,
      reason: 'End-of-sale: the vendor no longer ships this generation. Look at newer parts.',
      unitPrice: 0,
      leadMonths: 0,
    };
  }
  const age = year - item.availableFrom;
  const hype = age < 0.4 ? 1.12 : 1;
  const decay = Math.max(0.55, 1 - 0.1 * Math.max(0, age - 0.4));
  const demand = demandIndex(year);
  const boom = 1 + demand * (item.kind === 'accelerator' ? 0.18 : 0.06);
  const lead = Math.max(
    1,
    Math.round(item.leadTimeMonths * (1 + demand * (item.kind === 'accelerator' ? 1 : 0.25))),
  );
  return {
    item,
    available: true,
    unitPrice: Math.round(item.priceUSD * hype * decay * boom),
    leadMonths: lead,
    qtyCap: item.allocationPerQuarter,
  };
};

/** offerAt for this month, adjusted for the player's vendor standing: relationship + framework
 *  discounts off the unit price, allocation cap scaled by relationship/reputation. */
export const offerFor = (g: GameState, item: CatalogItem): Offer => {
  const o = offerAt(item, g.month, true);
  if (!o.available) return o;
  const fw = frameworkFor(g, item.vendor);
  const disc = relDiscount(g, item.vendor) + (fw ? frameworkDiscount(fw) : 0);
  return {
    ...o,
    unitPrice: Math.max(0, Math.round(o.unitPrice * (1 - disc))),
    qtyCap: o.qtyCap !== undefined ? Math.floor(o.qtyCap * capMultiplier(g, item.vendor)) : undefined,
  };
};

/** Volume discount for a single order (each $-doubling above $1M adds vendorPct, cap 25%). */
export const volumeDiscount = (item: CatalogItem, qty: number, unitPrice: number): number => {
  const vendor = VENDORS.find((v) => v.id === item.vendor);
  if (!vendor || qty <= 0) return 0;
  const doublings = Math.floor(Math.log2(Math.max(1, unitPrice * qty) / 1e6));
  if (doublings <= 0) return 0;
  return Math.min(0.25, doublings * (vendor.volumeDiscountPerDoublingPct / 100));
};

/** Full parts list (itemId -> count) needed to physically place one rack of a design. */
export const rackBom = (state: GameState, designId: string): Record<string, number> | undefined => {
  const design = state.racks.find((r) => r.id === designId);
  if (!design) return undefined;
  const need: Record<string, number> = { [design.rackId]: 1 };
  for (const item of design.items) {
    if (item.type === 'tray') {
      const tray = state.trays.find((t) => t.id === item.trayId);
      if (!tray) return undefined;
      for (const p of tray.parts) need[p.itemId] = (need[p.itemId] ?? 0) + p.count * item.count;
    } else {
      const id = item.type === 'switch' ? item.switchId : item.type === 'storage' ? item.storageId : item.powerId;
      need[id] = (need[id] ?? 0) + item.count;
    }
  }
  return need;
};

/** Parts of `designId`'s BOM that are free for it: warehouse stock minus what other designs have reserved. */
export const availableFor = (g: GameState, designId: string): Record<string, number> => {
  const bom = rackBom(g, designId) ?? {};
  const held: Record<string, number> = {};
  for (const [did, n] of Object.entries(g.rackReserve ?? {})) {
    if (did === designId || !(n > 0)) continue;
    for (const [p, per] of Object.entries(rackBom(g, did) ?? {})) held[p] = (held[p] ?? 0) + per * n;
  }
  const out: Record<string, number> = {};
  for (const p of Object.keys(bom)) out[p] = Math.max(0, (g.inventory[p] ?? 0) - (held[p] ?? 0));
  return out;
};
export const reserve = (g: GameState, designId: string, n: number) => { g.rackReserve = { ...(g.rackReserve ?? {}), [designId]: Math.max(0, (g.rackReserve?.[designId] ?? 0) + n) }; if (!g.rackReserve[designId]) delete g.rackReserve[designId]; };

/** Floor space is sold in units of this many rack slots. */
export const FLOOR_UNIT_SLOTS = 10;
export const FLOOR_UNIT_COST = 250_000 * FLOOR_UNIT_SLOTS;
export const floorCommissionMonths = (units: number) => 2 + Math.ceil(units / 5);

/** Borrowing headroom: fixed line + collateral against capitalized equipment. */
export const creditLimit = (state: GameState): number => 5_000_000 + estimateCapexBasis(state) * 0.6;

