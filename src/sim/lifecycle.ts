// Hardware lifecycle: rack age, accelerator obsolescence, residual value, resale.
import { ALL_ITEMS, getItem } from '../data';
import type { Accelerator, GameState, PlacedRack } from '../types';
import { monthToYear } from '../types';
import { rackBomValue } from './economy';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const ACCELERATORS = ALL_ITEMS.filter((i): i is Accelerator => i.kind === 'accelerator');

export const rackAgeMonths = (rack: PlacedRack, month: number): number =>
  Math.max(0, month - (rack.installedMonth ?? rack.readyMonth - 2));

/** First accelerator in the rack design's trays; undefined for network/storage-only racks. */
export function rackAccelItem(g: GameState, designId: string): Accelerator | undefined {
  const design = g.racks.find((r) => r.id === designId);
  if (!design) return undefined;
  for (const item of design.items) {
    if (item.type !== 'tray') continue;
    const tray = g.trays.find((t) => t.id === item.trayId);
    if (!tray) continue;
    for (const p of tray.parts) {
      const it = getItem(p.itemId);
      if (it?.kind === 'accelerator') return it;
    }
  }
  return undefined;
}

/** Distinct accelerator launch years shipped since this one, capped at 3. */
export function generationsBehind(accel: Accelerator, month: number): number {
  const mine = Math.floor(accel.availableFrom);
  const now = monthToYear(month);
  const newer = new Set<number>();
  for (const a of ACCELERATORS) {
    if (a.availableFrom <= now && Math.floor(a.availableFrom) > mine) newer.add(Math.floor(a.availableFrom));
  }
  return Math.min(3, newer.size);
}

/** Fraction of BOM value a rack still holds: age wear plus generation obsolescence. */
export function residualFactor(g: GameState, rack: PlacedRack): number {
  const ageYears = rackAgeMonths(rack, g.month) / 12;
  const accel = rackAccelItem(g, rack.designId);
  return accel
    ? clamp(1 - 0.16 * ageYears - 0.12 * generationsBehind(accel, g.month), 0.08, 1)
    : clamp(1 - 0.12 * ageYears, 0.2, 1);
}

export const rackResidualUSD = (g: GameState, rack: PlacedRack): number => {
  const design = g.racks.find((r) => r.id === rack.designId);
  return design ? rackBomValue(g, design) * residualFactor(g, rack) : 0;
};

/** Market value of everything owned: stock at 0.8, plant at 0.6, racks at residual. */
export function assetValue(g: GameState): number {
  let v = 0;
  for (const [id, n] of Object.entries(g.inventory)) v += 0.8 * (getItem(id)?.priceUSD ?? 0) * n;
  for (const [id, n] of Object.entries(g.spareStock ?? {})) v += 0.8 * (getItem(id)?.priceUSD ?? 0) * n;
  for (const hall of g.halls) {
    for (const [id, n] of Object.entries(hall.powerEquip)) v += 0.6 * (getItem(id)?.priceUSD ?? 0) * n;
    for (const [id, n] of Object.entries(hall.coolingEquip)) v += 0.6 * (getItem(id)?.priceUSD ?? 0) * n;
    for (const rack of hall.racks) v += rackResidualUSD(g, rack);
  }
  return v;
}
