import { describe, it, expect } from 'vitest';
import { useGame } from '../store';
import { handle } from './protocol';
import { commissionFailMult, maintenanceFailMult, maintenanceUSD, burnInLeadDelta } from '../sim/policy';
import { monthlyOpex } from '../sim/economy';

describe('ops policy', () => {
  it('validates and stores the policy; defaults are neutral', () => {
    useGame.getState().newGame(3, 'operator');
    const g0 = useGame.getState().game;
    expect(commissionFailMult(g0)).toBe(1); expect(maintenanceFailMult(g0)).toBe(1); expect(burnInLeadDelta(g0)).toBe(0);
    expect(useGame.getState().setPolicy(5, 0).ok).toBe(false); expect(useGame.getState().setPolicy(1, 3).ok).toBe(false);
    expect(useGame.getState().setPolicy(3, 2).ok).toBe(true);
    const g = useGame.getState().game;
    expect(g.policy).toEqual({ burnInMonths: 3, maintenance: 2 }); expect(burnInLeadDelta(g)).toBe(2);
    expect(commissionFailMult(g)).toBeLessThan(1); expect(maintenanceFailMult(g)).toBeLessThan(1);
  });
  it('maintenance costs money per online rack and shows up in opex', () => {
    useGame.getState().newGame(3, 'operator');
    const g = JSON.parse(JSON.stringify(useGame.getState().game));
    g.policy = { burnInMonths: 1, maintenance: 2 };
    g.halls[0].racks.push({ id: 'RK-1', designId: 'x', slot: 0, status: 'online', readyMonth: 0 }, { id: 'RK-2', designId: 'x', slot: 1, status: 'online', readyMonth: 0 });
    expect(maintenanceUSD(g)).toBe(800); expect(monthlyOpex(g).maintenanceUSD).toBe(800);
  });
  it('preview answers and is read-only', () => {
    useGame.getState().newGame(3, 'operator');
    const before = JSON.stringify(useGame.getState().game);
    const r: any = handle({ fn: 'q', name: 'preview' }).result;
    expect(r.nextMonth).toBe(useGame.getState().game.month + 1); expect(Array.isArray(r.warnings)).toBe(true);
    expect(JSON.stringify(useGame.getState().game)).toBe(before);
  });
});
