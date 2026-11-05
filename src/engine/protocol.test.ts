import { describe, it, expect } from 'vitest';
import { handle, ACTIONS } from './protocol';
import { QUERIES } from './queries';
import { PIPELINE } from '../sim/tick';
import { DOMAINS } from './actions';

describe('engine protocol', () => {
  it('exposes every domain action and no internals', () => {
    expect(ACTIONS).toContain('buyTemplate'); expect(ACTIONS).toContain('expandHall'); expect(ACTIONS).toContain('nextMonth');
    expect(ACTIONS).not.toContain('patchProject'); expect(ACTIONS).not.toContain('game');
    expect(Object.keys(DOMAINS).length).toBeGreaterThanOrEqual(9);
  });
  it('answers init/act/q/unknown', () => {
    expect(handle({ id: 1, fn: 'init' }).ok).toBe(true);
    handle({ fn: 'act', name: 'newGame', args: [5, 'operator'] });
    const r = handle({ id: 2, fn: 'act', name: 'nextMonth' }); expect(r.ok).toBe(true); expect((r.game as any).month).toBe(12);
    expect(handle({ fn: 'q', name: 'pnl' }).ok).toBe(true);
    expect(handle({ fn: 'q', name: 'nope' }).ok).toBe(false);
    expect(handle({ fn: 'act', name: 'patchProject' }).ok).toBe(false);
  });
  it('has queries and a tick pipeline with unique system ids', () => {
    expect(Object.keys(QUERIES).length).toBeGreaterThan(40);
    const ids = PIPELINE.map((s) => s.id); expect(new Set(ids).size).toBe(ids.length);
  });
});
