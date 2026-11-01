import type { GameState, SystemTemplate } from '../types';
import { getItem } from '../data';
import { offerAt, volumeDiscount } from '../store';
import { templateBom, templateFacts, racksFor } from '../plan';

export interface Quote { cost: number; lead: number; lines: { id: string; name: string; n: number; unit: number; total: number }[]; unavailable: string[]; capped: string[] }
export function quote(t: SystemTemplate, racks: number, month: number): Quote {
  const lines: Quote['lines'] = []; const unavailable: string[] = []; const capped: string[] = []; let cost = 0, lead = 1;
  for (const [id, n] of Object.entries(templateBom(t, racks))) {
    const item = getItem(id)!; const o = offerAt(item, month);
    if (!o.available) { unavailable.push(item.name); continue; }
    if (o.qtyCap && n > o.qtyCap) capped.push(`${item.name} (cap ${o.qtyCap}/qtr)`);
    const unit = Math.round(o.unitPrice * (1 - volumeDiscount(item, n, o.unitPrice)) * (1 + t.premium));
    lines.push({ id, name: item.name, n, unit, total: unit * n }); cost += unit * n;
    lead = Math.max(lead, Math.max(1, Math.round(o.leadMonths * t.leadFactor)));
  }
  lines.sort((a, b) => b.total - a.total);
  return { cost, lead, lines, unavailable, capped };
}
export interface HallCheck { ok: boolean; label: string; detail: string }
export function hallChecks(g: GameState, t: SystemTemplate, racks: number): HallCheck[] {
  const f = templateFacts(t); const h = g.halls[0]; const kw = f.kWPerRack * racks;
  const used = g.halls.flatMap(x => x.racks).length;
  const cls: Record<string, number> = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };
  return [
    { ok: kw <= (h?.itPowerKW ?? 0), label: `Power: ${kw.toFixed(0)} kW IT load`, detail: `Hall A has ${h?.itPowerKW ?? 0} kW of IT power. ${kw > (h?.itPowerKW ?? 0) ? 'Buy transformers/UPS in the Parts bin and install them in Facility.' : 'Fits.'}` },
    { ok: kw <= (h?.coolingKW ?? 0) && (cls[h?.coolingClass ?? 'air'] ?? 0) >= (cls[t.rack.cooling] ?? 0), label: `Cooling: ${t.rack.cooling.toUpperCase()}, ${kw.toFixed(0)} kW of heat`,
      detail: (cls[h?.coolingClass ?? 'air'] ?? 0) < (cls[t.rack.cooling] ?? 0) ? `Hall A is ${h?.coolingClass}-cooled; this needs a ${t.rack.cooling} hall with CDUs. Build a new hall in Facility.` : kw > (h?.coolingKW ?? 0) ? `Only ${h?.coolingKW ?? 0} kW of heat rejection installed - add CRAH/CDU units.` : 'Fits.' },
    { ok: used + racks <= (h?.rackSlots ?? 0), label: `Floor space: ${racks} rack slot${racks > 1 ? 's' : ''}`, detail: `${used}/${h?.rackSlots ?? 0} slots used.` },
  ];
}
export { templateFacts, racksFor };
