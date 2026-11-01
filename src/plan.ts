import type { GameState, RackDesign, SystemTemplate, TrayDesign } from './types';
import { getItem } from './data';
import { validateRack, validateTray } from './sim/validate';

export const trayIdOf = (t: SystemTemplate) => `tray-${t.id}`;
export const rackIdOf = (t: SystemTemplate) => `rack-${t.id}`;
export const trayOf = (t: SystemTemplate): TrayDesign => ({ id: trayIdOf(t), name: `${t.platform} tray`, chassisId: t.tray.chassisId, parts: t.tray.parts });
export const rackOf = (t: SystemTemplate): RackDesign => ({ id: rackIdOf(t), name: t.name, rackId: t.rack.rackId, coolingInterface: t.rack.cooling,
  items: [{ type: 'tray', trayId: trayIdOf(t), count: t.rack.trayCount }, ...t.rack.extras] });

/** Parts needed for `racks` racks of this template. */
export function templateBom(t: SystemTemplate, racks = 1): Record<string, number> {
  const need: Record<string, number> = { [t.rack.rackId]: racks };
  const add = (id: string, n: number) => { need[id] = (need[id] ?? 0) + n * racks; };
  add(t.tray.chassisId, t.rack.trayCount);
  for (const p of t.tray.parts) add(p.itemId, p.count * t.rack.trayCount);
  for (const e of t.rack.extras) add(e.type === 'switch' ? e.switchId : e.type === 'storage' ? e.storageId : e.type === 'power' ? e.powerId : '', e.count);
  delete need[''];
  return need;
}

export interface TemplateFacts { tflopsBf16: number; accels: number; kWPerRack: number; scaleUp: number; tflopsFp8: number; memGB: number; errors: string[] }
export function templateFacts(t: SystemTemplate): TemplateFacts {
  const tray = trayOf(t), rack = rackOf(t);
  const tv = validateTray(tray, getItem), rv = validateRack(rack, [tray], getItem);
  const errors = [...tv.issues, ...rv.issues].filter((i) => i.severity === 'error').map((i) => `${i.code}: ${i.message}`);
  const per = tv.stats;
  const bf = t.tray.parts.reduce((n, p) => { const it = getItem(p.itemId); return n + (it?.kind === 'accelerator' ? (it.tflops.bf16 ?? it.tflops.fp16 ?? 0) * p.count : 0); }, 0) * t.rack.trayCount;
  return { tflopsBf16: bf, accels: rv.stats.accels, kWPerRack: rv.stats.kW, scaleUp: rv.stats.scaleUpDomain, tflopsFp8: per.tflopsFp8 * t.rack.trayCount, memGB: per.memGB * t.rack.trayCount, errors };
}

/** How many racks to reach at least `n` accelerators. */
export const racksFor = (t: SystemTemplate, n: number) => Math.max(1, Math.ceil(n / Math.max(1, templateFacts(t).accels)));
export const designsMissing = (g: GameState, t: SystemTemplate) => !g.trays.some((x) => x.id === trayIdOf(t)) || !g.racks.some((x) => x.id === rackIdOf(t));
