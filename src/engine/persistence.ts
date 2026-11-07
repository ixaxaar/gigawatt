// Save slots + schema versioning. Storage is `localStorage` in the sidecar shim / browser; every access is guarded.
import { getItem } from '../data';
import type { GameState } from '../types';
import { SAVE_KEY, POWER_FEED_TYPES } from './actions/consts';

/** Bump when GameState changes shape and add a step to MIGRATIONS. */
export const SAVE_VERSION = 2;
export const DEFAULT_SLOT = 'main';
const INDEX_KEY = 'gigawatt-saves';
const slotKey = (slot: string) => (slot === DEFAULT_SLOT ? SAVE_KEY : `gigawatt-save-${slot}`);

export interface SaveInfo { slot: string; month: number; cash: number; debt: number; racks: number; mode: string; status: string; at?: number }

/** Each step upgrades a save from version N to N+1 in place. */
const MIGRATIONS: Record<number, (g: GameState) => void> = {
  // v1 -> v2: rack install dates + serials, lifetime stats, game status; PDUs wrongly installed into halls go back to the warehouse.
  1: (g) => {
    for (const h of g.halls) {
      for (const [id, n] of Object.entries(h.powerEquip ?? {})) {
        const it = getItem(id);
        if (it?.kind === 'power' && (it.powerType === 'pdu' || it.powerType === 'power-shelf')) {
          g.inventory[id] = (g.inventory[id] ?? 0) + n; delete h.powerEquip[id];
          if (POWER_FEED_TYPES.includes(it.powerType)) h.itPowerKW = Math.max(0, h.itPowerKW - n * it.capacityKW);
        }
      }
      for (const r of h.racks) {
        r.installedMonth ??= r.readyMonth - 2;
        if (r.serial == null) r.serial = g.rackSeq = (g.rackSeq ?? 0) + 1;
      }
    }
    g.stats ??= { contractsCompleted: 0, peakAccels: 0, slaMisses: 0, revenueTotal: 0, decommissioned: 0 };
    g.status ??= 'playing';
  },
};

/** Validate + upgrade a parsed save. Returns an error string, or null if `g` is now current. */
export function migrate(g: GameState): string | null {
  if (typeof g?.month !== 'number' || typeof g.cash !== 'number' || !Array.isArray(g.halls) || !Array.isArray(g.clusters)) return 'Save file corrupted.';
  let v = g.saveVersion ?? 1;
  if (v > SAVE_VERSION) return `Save is from a newer version (v${v}); update the game.`;
  for (; v < SAVE_VERSION; v++) MIGRATIONS[v]?.(g);
  g.saveVersion = SAVE_VERSION;
  return null;
}

const readIndex = (): Record<string, SaveInfo> => { try { return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '{}'); } catch { return {}; } };

let lastAt = 0;   // strictly increasing, so two saves in the same millisecond still order correctly
export function writeSlot(slot: string, g: GameState): boolean {
  try {
    localStorage.setItem(slotKey(slot), JSON.stringify({ ...g, saveVersion: SAVE_VERSION }));
    const idx = readIndex();
    idx[slot] = { slot, month: g.month, cash: g.cash, debt: g.debt, racks: g.halls.reduce((n, h) => n + h.racks.length, 0), mode: g.mode ?? 'operator', status: g.status ?? 'playing', at: (lastAt = Math.max(Date.now(), lastAt + 1)) };
    localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
    return true;
  } catch { return false; } // storage unavailable (private mode / headless) — nothing to do
}

export function readSlot(slot: string): { game?: GameState; error?: string } {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return { error: 'No save found.' };
    const g = JSON.parse(raw) as GameState;
    const err = migrate(g);
    return err ? { error: err } : { game: g };
  } catch { return { error: 'Save file unreadable.' }; }
}

export const listSaves = (): SaveInfo[] => Object.values(readIndex()).sort((a, b) => (b.at ?? 0) - (a.at ?? 0) || b.month - a.month);   // most recently written first

export const hasSave = (slot: string = DEFAULT_SLOT): boolean => {
  try { return localStorage.getItem(slotKey(slot)) !== null; } catch { return false; }
};
