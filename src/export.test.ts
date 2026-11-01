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
