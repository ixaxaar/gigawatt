import { describe, it, expect } from 'vitest';
import { rollEvents } from './events';
import { mulberry32 } from './rng';
import { useGame } from '../store';

const fresh = () => { useGame.getState().newGame(5); return JSON.parse(JSON.stringify(useGame.getState().game)); };

describe('events', () => {
  it('is deterministic for a seed', () => {
    const run = () => { const s = fresh(); const logs: string[] = []; const r = mulberry32(9); for (let m = 0; m < 80; m++) { s.month = 11 + m; rollEvents(s, r, (_l, t) => logs.push(t)); } return [logs, s.cash, s.utilityUSDPerKWh]; };
    expect(run()).toEqual(run());
  });
  it('fires at a sane rate and keeps state finite over 10 years', () => {
    const s = fresh(); let n = 0; const r = mulberry32(3);
    for (let m = 0; m < 120; m++) { s.month = 11 + m; rollEvents(s, r, () => n++); }
    expect(n).toBeGreaterThan(12); expect(n).toBeLessThan(60);
    expect(Number.isFinite(s.cash)).toBe(true);
    expect(s.reputation).toBeGreaterThanOrEqual(0); expect(s.reputation).toBeLessThanOrEqual(100);
    expect(s.utilityUSDPerKWh).toBeLessThanOrEqual(0.2);
  });
  it('gives a grace period at the start', () => {
    const s = fresh(); let n = 0; const r = mulberry32(1);
    for (let m = 0; m < 3; m++) { s.month = 11 + m; rollEvents(s, r, () => n++); }
    expect(n).toBe(0);
  });
});
