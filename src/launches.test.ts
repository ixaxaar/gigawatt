import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, getItem } from './data';
import { LAUNCHES, preorderOpens, shipMonthOf } from './data/launches';
import { offerAt } from './engine/pricing';
import { quote } from './quote';
import { getTemplate } from './data/templates';
import { advanceMonth } from './sim/tick';
import { newGameState } from './engine/state';

describe('launch calendar', () => {
  it('references real parts, in date order, with unique ids', () => {
    expect(new Set(LAUNCHES.map((l) => l.id)).size).toBe(LAUNCHES.length);
    for (let i = 1; i < LAUNCHES.length; i++) expect(LAUNCHES[i].month).toBeGreaterThanOrEqual(LAUNCHES[i - 1].month);
    for (const l of LAUNCHES) for (const id of l.items) {
      const it = getItem(id); expect(it, `${l.id} -> ${id}`).toBeTruthy();
      expect(shipMonthOf(it!), `${l.id} -> ${id} ships before its keynote`).toBeGreaterThanOrEqual(l.month);
    }
  });
  it('pre-orders open at the keynote (at most 12 months before shipping) and not before', () => {
    const h100 = getItem('nv-h100-sxm')!; const open = preorderOpens(h100)!;
    expect(open).toBe(26);
    expect(offerAt(h100, open - 1, true).available).toBe(false);
    expect(offerAt(h100, open - 1, true).reason).toMatch(/Announced/);
    const pre = offerAt(h100, open, true);
    expect(pre.available).toBe(true); expect(pre.preorder).toBe(true);
    expect(pre.leadMonths).toBeGreaterThan(shipMonthOf(h100) - open);
    expect(offerAt(h100, open, false).available).toBe(false);   // planners/autopilot never see unreleased parts
    const rubin = getItem('nv-rubin-vr200')!;
    expect(preorderOpens(rubin)).toBeGreaterThanOrEqual(shipMonthOf(rubin) - 12);
  });
  it('a pre-ordered rack template quotes with a ship date', () => {
    const t = getTemplate('tpl-gb200-nvidia-turnkey')!;
    expect(quote(t, 1, 52, false).unavailable.length).toBeGreaterThan(0);
    const q = quote(t, 1, 56, true);
    expect(q.unavailable).toEqual([]); expect(q.preorder).toBe(true); expect(q.ships).toBeGreaterThan(56);
  });
  it('fires keynote cards on their month', () => {
    const l = LAUNCHES[2]; let g = newGameState(7); g.month = l.month - 1;
    g = advanceMonth(g);
    expect(g.news).toContain(l.id); expect(g.launchesSeen).toContain(l.id);
    expect(g.log.some((x) => x.text.includes(l.venue))).toBe(true);
    expect(ALL_ITEMS.length).toBeGreaterThan(0);
  });
});
