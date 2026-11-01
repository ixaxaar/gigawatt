import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { ALL_ITEMS, VENDORS } from './data';
import { TEMPLATES } from './data/templates';
// Not a real test: `vitest run src/export.test.ts` regenerates the Godot data files.
it('export catalog for Godot', () => {
  writeFileSync('godot/data/catalog.json', JSON.stringify(ALL_ITEMS));
  writeFileSync('godot/data/vendors.json', JSON.stringify(VENDORS));
  writeFileSync('godot/data/templates.json', JSON.stringify(TEMPLATES));
});

import { templateFacts } from './plan';
import { quote } from './ui/quote';
it('export derived systems for Godot', () => {
  const out = TEMPLATES.map(t => {
    const f = templateFacts(t); const month = Math.max(0, Math.ceil((t.availableFrom - 2020) * 12) + 1);
    const q = quote(t, 1, month);
    return { id: t.id, name: t.name, platform: t.platform, tier: t.tier, integrator: t.integrator, tagline: t.tagline, availableFrom: t.availableFrom, eolAfter: t.eolAfter ?? 2100,
      cooling: t.rack.cooling, accels: f.accels, kW: f.kWPerRack, memGB: f.memGB, tflopsFp8: f.tflopsFp8, tflopsBf16: f.tflopsBf16, scaleUp: f.scaleUp,
      priceAtLaunch: q.cost, leadMonths: q.lead, launchMonth: month, premium: t.premium, ok: f.errors.length === 0 };
  });
  writeFileSync('godot/data/systems.json', JSON.stringify(out, null, 1));
});
