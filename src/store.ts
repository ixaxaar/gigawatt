// ===========================================================================
// GIGAWATT — game store facade. The engine lives in src/engine/*:
//   state.ts (new game) · pricing.ts (offers, BOMs, floor) · selectors.ts (derived numbers)
//   actions/<domain>.ts (every player action) · persistence.ts · sim/* (monthly rules).
// This file only composes them and keeps the long-standing import surface stable.
// ===========================================================================
import { createStore } from './engine/runtime';
import type { GameStore } from './engine/api';
import { newGameState } from './engine/state';
import { makeCtx } from './engine/actions/ctx';
import { composeActions } from './engine/actions';

export * from './engine/api';
export * from './engine/pricing';
export * from './engine/selectors';
export * from './engine/state';
export * from './engine/persistence';

export const useGame = createStore<GameStore>((set, get) => ({
  game: newGameState(0),
  ...composeActions(makeCtx(get, set)),
}));
