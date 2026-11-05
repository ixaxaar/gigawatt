import { describe, it, expect } from 'vitest';
import { useGame } from '../store';
import { advanceMonth } from '../sim/tick';
import { HORIZON_MONTH, ratingFor } from '../sim/systems/endgame';
import { migrate, SAVE_VERSION } from './persistence';
import type { GameState } from '../types';

const fresh = (mode: 'operator' | 'learner' = 'operator'): GameState => { useGame.getState().newGame(3, mode); return JSON.parse(JSON.stringify(useGame.getState().game)); };

describe('ending', () => {
  it('goes bankrupt after 3 consecutive negative-cash months, then the world stops', () => {
    let g = fresh(); g.cash = -1e9; g.debt = 0;
    g = advanceMonth(g); expect(g.status).toBe('playing');
    g = advanceMonth(g); expect(g.status).toBe('playing');
    g = advanceMonth(g); expect(g.status).toBe('bankrupt'); expect(g.endReport?.reason).toBe('bankrupt');
    const frozen = advanceMonth(g); expect(frozen).toBe(g);
  });
  it('learner mode cannot go bankrupt', () => {
    let g = fresh('learner'); g.cash = -1e9;
    for (let i = 0; i < 5; i++) g = advanceMonth(g);
    expect(g.status).toBe('playing');
  });
  it('finishes at the 2028 horizon with a score and rating', () => {
    let g = fresh(); g.month = HORIZON_MONTH - 1; g.cash = 3e8;
    g = advanceMonth(g);
    expect(g.status).toBe('finished'); expect(g.endReport?.rating).toBeTruthy(); expect(g.endReport!.score).toBeGreaterThan(0);
    expect(ratingFor(2e9)).toBe('AI Datacenter Tycoon');
  });
  it('nextMonth is a no-op after game over', () => {
    const s = useGame.getState(); s.newGame(4, 'operator'); useGame.setState({ game: { ...useGame.getState().game, status: 'bankrupt' } });
    const m = useGame.getState().game.month; useGame.getState().nextMonth(); expect(useGame.getState().game.month).toBe(m);
  });
});

describe('save migration', () => {
  it('upgrades a v1 save and rejects garbage / future saves', () => {
    const g: any = fresh(); delete g.saveVersion; delete g.stats; delete g.status; g.halls[0].racks.push({ id: 'RK-0001', designId: 'x', slot: 0, status: 'online', readyMonth: 14 });
    expect(migrate(g)).toBeNull(); expect(g.saveVersion).toBe(SAVE_VERSION); expect(g.stats).toBeTruthy(); expect(g.halls[0].racks[0].installedMonth).toBe(12); expect(g.halls[0].racks[0].serial).toBeGreaterThan(0);
    expect(migrate({} as any)).toMatch(/corrupted/);
    expect(migrate({ ...fresh(), saveVersion: 99 } as any)).toMatch(/newer/);
  });
});
