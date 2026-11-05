// Shared plumbing handed to every action module.
import type { GameState } from '../../types';
import type { Setter } from '../runtime';
import type { ActionResult, GameStore } from '../api';
import { ok } from './consts';

export interface Ctx {
  get: () => GameStore;
  set: Setter<GameStore>;
  /** Clone the game, run `mutate`, and swap it in only if the result is ok (atomic action). */
  commit: (mutate: (g: GameState) => ActionResult | void) => ActionResult;
  logln: (g: GameState, level: 'info' | 'good' | 'bad', text: string) => void;
}

export function makeCtx(get: () => GameStore, set: Setter<GameStore>): Ctx {
  return {
    get, set,
    commit: (mutate) => {
      const g: GameState = JSON.parse(JSON.stringify(get().game)) as GameState;
      const res = mutate(g) ?? ok();
      if (res.ok) set({ game: g });
      return res;
    },
    logln: (g, level, text) => { g.log.push({ month: g.month, level, text }); if (g.log.length > 400) g.log.splice(0, g.log.length - 400); },
  };
}
