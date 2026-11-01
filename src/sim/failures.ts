import { getItem } from '../data';
import type { GameState } from '../types';

/** Monthly failure probability per installed unit (gameplay-scaled from real AFRs). */
export const PART_RATE: Record<string, number> = {
  accelerator: 1 / 8000, psu: 1 / 3000, nic: 1 / 6000, nvme: 1 / 6000, memory: 1 / 20000, cpu: 1 / 20000, switch: 1 / 5000,
};
export const PART_LABEL: Record<string, string> = {
  accelerator: 'GPU/accelerator', psu: 'power supply', nic: 'NIC', nvme: 'NVMe drive', memory: 'DIMM', cpu: 'CPU', switch: 'ToR switch',
};

/** Installed field-replaceable parts of one placed rack design, counted by item id. */
export function rackParts(state: GameState, designId: string): Record<string, number> {
  const out: Record<string, number> = {};
  const d = state.racks.find((r) => r.id === designId);
  const add = (id: string, n: number) => { out[id] = (out[id] ?? 0) + n; };
  for (const it of d?.items ?? []) {
    if (it.type === 'tray') {
      const t = state.trays.find((x) => x.id === it.trayId);
      for (const p of t?.parts ?? []) add(p.itemId, p.count * it.count);
    } else if (it.type === 'switch') add(it.switchId, it.count);
  }
  return out;
}

export const partClass = (id: string): string | undefined => { const k = getItem(id)?.kind; return k && PART_RATE[k] !== undefined ? k : undefined; };

/** Monthly per-part failure rates for a rack. */
export function rackRates(state: GameState, designId: string): { id: string; rate: number }[] {
  return Object.entries(rackParts(state, designId)).flatMap(([id, n]) => { const c = partClass(id); return c ? [{ id, rate: n * PART_RATE[c] }] : []; });
}

/** Recommended spare count for a part across the whole fleet: ~1 month of expected failures, min 1 once any are deployed. */
export function recommendedSpares(state: GameState, id: string): number {
  let total = 0;
  for (const h of state.halls) for (const p of h.racks) total += rackParts(state, p.designId)[id] ?? 0;
  const c = partClass(id);
  if (!c || total === 0) return 0;
  return Math.max(1, Math.ceil(total * PART_RATE[c] * 3));
}
