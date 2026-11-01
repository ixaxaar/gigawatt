import { describe, it, expect } from 'vitest';
import { TEMPLATES } from './data/templates';
import { templateBom, templateFacts } from './plan';
import { getItem } from './data';
import { offerAt } from './store';

describe('system templates', () => {
  it('has unique ids and real parts', () => {
    expect(new Set(TEMPLATES.map(t => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) for (const id of Object.keys(templateBom(t))) expect(getItem(id), `${t.id}: ${id}`).toBeTruthy();
  });
  for (const t of TEMPLATES) it(`${t.id} is valid and fully purchasable on launch`, () => {
    const f = templateFacts(t);
    expect(f.errors, f.errors.join('\n')).toEqual([]);
    const month = Math.ceil((t.availableFrom - 2020) * 12) + 1;
    const late = Object.keys(templateBom(t)).filter(id => !offerAt(getItem(id)!, month).available);
    expect(late, `unavailable at month ${month}`).toEqual([]);
  });
});
