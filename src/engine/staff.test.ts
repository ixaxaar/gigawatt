import { describe, it, expect } from 'vitest';
import { useGame } from '../store';

const fresh = () => { useGame.getState().newGame(3); };
const st = () => useGame.getState();
const g = () => useGame.getState().game;
const setCash = (cash: number) => useGame.setState((s) => ({ game: { ...s.game, cash } }));

describe('hire/fire staff', () => {
  it('hiring pays $15k recruiting per head from cash', () => {
    fresh();
    const cash = g().cash;
    expect(st().hireStaff(2).ok).toBe(true);
    expect(g().staff).toBe(4);
    expect(g().cash).toBe(cash - 30_000);
  });

  it('rejects out-of-range counts and unaffordable recruiting fees', () => {
    fresh();
    expect(st().hireStaff(0).ok).toBe(false);
    expect(st().hireStaff(51).ok).toBe(false);
    setCash(10_000);
    expect(st().hireStaff(1).ok).toBe(false);
    expect(g().staff).toBe(2);
    expect(g().cash).toBe(10_000);
  });

  it('firing pays 2 months severance per head and never goes below 1', () => {
    fresh();
    const cash = g().cash;
    expect(st().fireStaff(1).ok).toBe(true);
    expect(g().staff).toBe(1);
    expect(g().cash).toBe(cash - 24_000);
    expect(st().fireStaff(1).ok).toBe(false); // floor of 1
    expect(g().staff).toBe(1);
  });

  it('rejects firing when severance cannot be covered', () => {
    fresh();
    useGame.setState((s) => ({ game: { ...s.game, staff: 3, cash: 10_000 } }));
    expect(st().fireStaff(1).ok).toBe(false);
    expect(g().staff).toBe(3);
    expect(g().cash).toBe(10_000);
  });
});

describe('repayLoan', () => {
  it('repays principal from cash', () => {
    fresh();
    st().takeLoan(1_000_000);
    const cash = g().cash;
    expect(st().repayLoan(400_000).ok).toBe(true);
    expect(g().debt).toBe(600_000);
    expect(g().cash).toBe(cash - 400_000);
  });

  it('refuses non-positive, over-debt and over-cash repayments', () => {
    fresh();
    st().takeLoan(1_000_000);
    expect(st().repayLoan(0).ok).toBe(false);
    expect(st().repayLoan(1_000_001).ok).toBe(false);
    setCash(500);
    expect(st().repayLoan(1_000).ok).toBe(false);
    expect(g().debt).toBe(1_000_000);
    expect(g().cash).toBe(500);
  });
});
