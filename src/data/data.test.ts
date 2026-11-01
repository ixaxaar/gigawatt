import { describe, it, expect } from 'vitest';
import { ALL_ITEMS, duplicateIds, ITEMS_BY_KIND, VENDORS } from './index';
describe('catalog', () => {
  it('has no duplicate ids', () => expect(duplicateIds()).toEqual([]));
  it('has codex on everything', () => expect(ALL_ITEMS.filter(i => !i.codex?.summary || !i.codex.explain || !i.codex.tradeoffs?.length).map(i => i.id)).toEqual([]));
  it('vendors cover items', () => { const v = new Set(VENDORS.map(x => x.id)); expect([...new Set(ALL_ITEMS.map(i => i.vendor))].filter(x => !v.has(x))).toEqual([]); });
  it('counts', () => { console.log(Object.fromEntries(['accelerator','cpu','nic','switch','cable','chassis','rack','power','cooling','storage','memory','nvme'].map(k => [k, ITEMS_BY_KIND(k as any).length]))); expect(ALL_ITEMS.length).toBeGreaterThan(100); });
});
