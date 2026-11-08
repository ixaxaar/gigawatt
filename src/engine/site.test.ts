const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
import { describe, it, expect } from 'vitest';
import { useGame } from '../store';
import { SITE_DEFAULT } from '../types';

describe('site (cosmetic surroundings)', () => {
  it('starts without a site, merges partial choices over the defaults, and survives a save and load', () => {
    useGame.getState().newGame(3, 'operator');
    expect(useGame.getState().game.site).toBeUndefined();
    useGame.getState().setSite({ floor: 'checker', accent: 'cyan', rack: 'white' });
    expect(useGame.getState().game.site).toEqual({ ...SITE_DEFAULT, floor: 'checker', accent: 'cyan', rack: 'white' });
    useGame.getState().setSite({ walls: 'brick' });
    expect(useGame.getState().game.site).toEqual({ ...SITE_DEFAULT, floor: 'checker', accent: 'cyan', rack: 'white', walls: 'brick' });
    useGame.getState().save('slot2');
    useGame.getState().newGame(4, 'operator');
    expect(useGame.getState().game.site).toBeUndefined();
    useGame.getState().load('slot2');
    expect(useGame.getState().game.site?.walls).toBe('brick');
  });
  it('does not touch the simulation: the same seed ticks to the same cash with and without a site', () => {
    useGame.getState().newGame(9, 'operator'); for (let i = 0; i < 6; i++) useGame.getState().nextMonth();
    const plain = useGame.getState().game.cash;
    useGame.getState().newGame(9, 'operator'); useGame.getState().setSite({ floor: 'terrazzo', walls: 'glass', light: 'night' }); for (let i = 0; i < 6; i++) useGame.getState().nextMonth();
    expect(useGame.getState().game.cash).toBe(plain);
  });
});
