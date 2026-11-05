import { getItem } from '../../data';
import type { GameState } from '../../types';
import type { ClusterContext } from '../network';

export const round2 = (x: number) => Math.round(x * 100) / 100;

export const clusterContextOf = (state: GameState): ClusterContext => ({
  getRack: (id) => { const pid = state.halls.flatMap((h) => h.racks).find((p) => p.id === id)?.designId ?? id; return state.racks.find((r) => r.id === pid); },
  getTray: (id) => state.trays.find((t) => t.id === id),
  getItem,
});

/** Accelerators in one rack of `designId`. */
export const rackAccels = (state: GameState, designId: string): number => {
  const design = state.racks.find((r) => r.id === designId);
  if (!design) return 0;
  let n = 0;
  for (const item of design.items) {
    if (item.type !== 'tray') continue;
    const tray = state.trays.find((t) => t.id === item.trayId);
    if (!tray) continue;
    for (const p of tray.parts) if (getItem(p.itemId)?.kind === 'accelerator') n += p.count * item.count;
  }
  return n;
};
