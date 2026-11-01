import { describe, it, expect } from 'vitest';
import { hallResilience } from './resilience';
import type { HallState } from '../types';

const hall = (equip: Record<string, number>): HallState => ({ id: 'h', name: 'H', itPowerKW: 500, powerEquip: equip, coolingEquip: {}, racks: [] } as unknown as HallState);

describe('hall resilience', () => {
  it('no protection scores 0 with gaps', () => { const r = hallResilience(hall({})); expect(r.score).toBe(0); expect(r.gaps.length).toBe(3); });
  it('UPS+battery alone is basic', () => { const r = hallResilience(hall({ 'vt-exl-s1-1250': 1, 'gen-vrla-500': 1 })); expect(r.tier).toBe('basic'); });
  it('full chain reaches N+1 or better', () => { const r = hallResilience(hall({ 'vt-exl-s1-1250': 1, 'gen-vrla-500': 1, 'gen-genset-2500': 1, 'gen-ats-1600': 1 })); expect(r.score).toBeGreaterThanOrEqual(0.9); expect(r.gaps).toEqual([]); });
});
