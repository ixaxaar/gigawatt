// Minimal observable store: the only runtime the engine needs (no React, no zustand, no DOM).
export type Setter<T> = (patch: Partial<T> | ((s: T) => Partial<T>)) => void;
export interface Store<T> { getState: () => T; setState: Setter<T>; subscribe: (fn: (s: T) => void) => () => void }

export function createStore<T extends object>(init: (set: Setter<T>, get: () => T) => T): Store<T> {
  let state!: T;
  const subs = new Set<(s: T) => void>();
  const get = () => state;
  const set: Setter<T> = (patch) => {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    subs.forEach((f) => f(state));
  };
  state = init(set, get);
  return { getState: get, setState: set, subscribe: (fn) => (subs.add(fn), () => subs.delete(fn)) };
}
