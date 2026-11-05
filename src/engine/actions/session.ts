// GIGAWATT engine — session actions. Generated from the former store.ts monolith.
import { stepAllProjects } from '../../autopilot';
import type { GameStore } from '../api';
import { advanceMonth } from '../../sim/tick';
import { fail, ok } from './consts';
import { DEFAULT_SLOT, readSlot, writeSlot } from '../persistence';
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

    nextMonth: () => {
      if (get().game.status && get().game.status !== 'playing') return; // game over
      set({ game: advanceMonth(get().game) });
      stepAllProjects(get);
      writeSlot('auto', get().game); // autosave every month (best-effort)
    },

    save: (slot = DEFAULT_SLOT) => (writeSlot(slot, get().game) ? ok(`Saved to slot '${slot}'.`) : fail('Could not write the save (storage unavailable).')),

    load: (slot = DEFAULT_SLOT) => {
      const r = readSlot(slot);
      if (!r.game) return fail(r.error ?? 'No save found.');
      set({ game: r.game });
      return ok(`Loaded month ${r.game.month}.`);
    },

  };
};
