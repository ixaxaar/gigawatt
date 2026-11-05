// GIGAWATT engine — session actions. Generated from the former store.ts monolith.
import { stepAllProjects } from '../../autopilot';
import type { GameStore } from '../api';
import { getItem } from '../../data';
import { advanceMonth } from '../../sim/tick';
import { GameState } from '../../types';
import { POWER_FEED_TYPES, SAVE_KEY, fail, ok } from './consts';
import { newGameState } from '../state';
import type { Ctx } from './ctx';

export const sessionActions = (c: Ctx): Partial<GameStore> => {
  const { get, set } = c;
  return {
    newGame: (seed = Math.floor(Math.random() * 2 ** 31), mode = 'operator') => {
      const g = newGameState(seed);
      g.mode = mode;
      if (mode === 'learner') { g.cash = 80_000_000; g.log.push({ month: g.month, level: 'info', text: '🎓 Learner mode: $80M starting cash, explainers everywhere, and the Easy path will do the build steps for you.' }); }
      if (mode === 'tycoon') { g.cash = 30_000_000; g.log.push({ month: g.month, level: 'info', text: '💼 Tycoon mode: $30M, no hand-holding. Good luck.' }); }
      set({ game: g });
    },

    setMode: (m) => set(s => ({ game: { ...s.game, mode: m } })),

    patchProject: (id, patch) => set(s => ({ game: { ...s.game, projects: (s.game.projects ?? []).map(p => p.id === id ? { ...p, ...patch } : p) } })),

    addProject: (p) => set(s => ({ game: { ...s.game, projects: [...(s.game.projects ?? []), p] } })),

    nextMonth: () => { set({ game: advanceMonth(get().game) }); stepAllProjects(get); },

    save: () => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(get().game));
      } catch {
        // storage unavailable (private mode / SSR) — nothing to do
      }
    },

    load: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return fail('No save found.');
        const g = JSON.parse(raw) as GameState;
        if (
          typeof g.month !== 'number' ||
          typeof g.cash !== 'number' ||
          !Array.isArray(g.halls) ||
          !Array.isArray(g.clusters)
        ) {
          return fail('Save file corrupted.');
        }
        // migration: rack-level PDUs/power shelves wrongly installed into halls go back to the warehouse
        for (const h of g.halls) for (const [id, n] of Object.entries(h.powerEquip ?? {})) {
          const it = getItem(id);
          if (it?.kind === 'power' && (it.powerType === 'pdu' || it.powerType === 'power-shelf')) {
            g.inventory[id] = (g.inventory[id] ?? 0) + n; delete h.powerEquip[id];
            if (POWER_FEED_TYPES.includes(it.powerType)) h.itPowerKW = Math.max(0, h.itPowerKW - n * it.capacityKW);
          }
        }
        set({ game: g });
        return ok(`Loaded month ${g.month}.`);
      } catch {
        return fail('Save file unreadable.');
      }
    },

  };
};
