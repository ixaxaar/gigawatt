// Scenario library for agent training and stress-testing. Every setup runs through public store actions
// (no state surgery beyond cash/month), so scenarios exercise the same rules a player faces.
import { useGame, rackBom } from '../store';
import { ALL_ITEMS } from '../data';
import { offerAt } from '../store';
import { TEMPLATES } from '../data/templates';
import { templateFacts } from '../plan';
import type { Scenario } from './env';
import type { CoolingClass } from '../types';

const st = () => useGame.getState();
const patch = (f: (g: any) => void) => useGame.setState(s => { const g = JSON.parse(JSON.stringify(s.game)); f(g); return { game: g }; });
const LEVEL: Record<string, number> = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };

function plantUnit(kind: 'power' | 'cooling', cls0: string) {
  const cls = cls0 === 'rdhx' ? 'air' : cls0; // rear-door halls reject heat through the chilled-water (air-class) plant
  const cand = ALL_ITEMS.filter(i => kind === 'power' ? (i.kind === 'power' && i.powerType === 'transformer') : (i.kind === 'cooling' && i.serves === cls && !['cold-plate-loop', 'rdhx'].includes(i.coolingType)))
    .map(i => offerAt(i, st().game.month)).filter(o => o.available);
  cand.sort((a, b) => a.unitPrice / ((a.item as any).capacityKW || 1) - b.unitPrice / ((b.item as any).capacityKW || 1));
  return cand[0];
}
const advance = (n: number) => { for (let i = 0; i < n; i++) st().nextMonth(); };

/** Build one 200-slot hall per cooling class and fill each with `racksPerTemplate` of every compatible template. Returns a report. */
export function stressFill(racksPerTemplate: number, hallsPerClass = 1) {
  const report: Record<string, any> = { halls: [], skipped: [] };
  const classes: CoolingClass[] = ['air', 'rdhx', 'dlc', 'immersion'];
  const hallOf: Record<string, string[]> = {};
  for (const c of classes) for (let k = 0; k < hallsPerClass; k++) { const r = st().buildHall(`${c.toUpperCase()}-${k + 1}`, c, 200); if (r.ok) (hallOf[c] ??= []).push(st().game.halls[st().game.halls.length - 1].id); }
  const load: Record<string, number> = {}; const plan: { t: typeof TEMPLATES[number]; hall: string; n: number }[] = [];
  let rr = 0;
  for (const t of TEMPLATES) {
    const f = templateFacts(t); const cls = classes.find(c => c === t.rack.cooling) ?? 'air';
    const halls = hallOf[cls] ?? []; if (!halls.length) { report.skipped.push(t.id + ': no hall'); continue; }
    const hall = halls[rr++ % halls.length];
    let n = racksPerTemplate, r = st().buyTemplate(t.id, n, false);
    while (!r.ok && n > 1 && /llocation/.test(r.message)) { n = Math.max(1, Math.floor(n / 2)); r = st().buyTemplate(t.id, n, false); }
    if (!r.ok) { report.skipped.push(`${t.id}: ${r.message.slice(0, 90)}`); continue; }
    load[hall] = (load[hall] ?? 0) + f.kWPerRack * n; plan.push({ t, hall, n });
  }
  const bought: Record<string, { id: string; n: number; kind: string }[]> = {};
  for (const [hallId, kw] of Object.entries(load)) {
    const h = st().game.halls.find(x => x.id === hallId)!;
    for (const kind of ['power', 'cooling'] as const) {
      const u = plantUnit(kind, h.coolingClass); if (!u) { report.skipped.push(`${hallId}: no ${kind} plant`); continue; }
      const n = Math.ceil((kw * 1.15) / ((u.item as any).capacityKW || 1)); const b = st().buy(u.item.id, n); if (!b.ok) report.skipped.push(`${hallId} ${kind}: ${b.message.slice(0, 80)}`); else (bought[hallId] ??= []).push({ id: u.item.id, n, kind });
    }
  }
  for (const { t, n } of plan) {
    const did = st().game.racks.find(r => r.id.includes(t.id))?.id; if (!did) continue;
    for (const [id, c] of Object.entries(rackBom(st().game, did) ?? {})) { const need = c * n - (st().game.inventory[id] ?? 0); if (need > 0) { const b = st().buy(id, need); if (!b.ok) report.skipped.push(`${t.id} part ${id}: ${b.message.slice(0, 70)}`); } }
  }
  for (let i = 0; i < 16 && st().game.orders.length; i++) advance(1);
  for (const [hallId, list] of Object.entries(bought)) for (const p of list) {
    const ir = p.kind === 'power' ? st().installPower(hallId, p.id, p.n) : st().installCooling(hallId, p.id, p.n);
    if (!ir.ok) report.skipped.push(`${hallId} install ${p.id}: ${ir.message.slice(0, 90)}`);
  }
  for (const { t, hall, n: cnt } of plan) {
    const designId = `rk-${t.id}`.length ? (st().game.racks.find(r => r.id.includes(t.id))?.id ?? '') : '';
    let placed = 0; if (designId) for (let i = 0; i < cnt; i++) { const r = st().placeRack(hall, designId); if (!r.ok) { report.skipped.push(`${t.id} place ${i}: ${r.message}`); break; } placed++; }
    report[t.id] = placed;
  }
  advance(6);
  report.halls = st().game.halls.map(h => ({ id: h.id, class: h.coolingClass, racks: h.racks.length, kW: h.itPowerKW, coolKW: h.coolingKW, pue: h.pue }));
  return report;
}

export const SCENARIOS: Scenario[] = [
  { id: 'classic', title: 'Classic start (Jan 2020)', seed: 1, horizonMonths: 120, description: 'Default $50M start; the baseline for comparing agents.' },
  { id: 'lean', title: 'Lean start', seed: 2, horizonMonths: 120, description: '$8M cash: every dollar of capex and every contract choice matters.', setup: () => patch(g => { g.cash = 8_000_000; }) },
  { id: 'gold-rush-2025', title: 'GPU gold rush (Jan 2025)', seed: 3, horizonMonths: 60, description: 'Start in 2025 with $250M into Blackwell-era scarcity, high demand and allocation caps.', setup: () => patch(g => { g.month = 60; g.cash = 250_000_000; }) },
  { id: 'stress-all-racks', title: 'Stress: every rack type deployed', seed: 4, horizonMonths: 24, description: 'Sep-2026 start, effectively unlimited cash; four 200-slot halls (air/RDHx/DLC/immersion) pre-filled with every system template to test extremes of power, cooling, failures and fabric.', setup: () => { patch(g => { g.month = 80; g.cash = 5e10; }); stressFill(6); } },
  { id: 'stress-campus', title: 'Stress: multi-hall campus', seed: 5, horizonMonths: 24, description: 'Eight halls (two per cooling class), 12 racks of every template each: a gigawatt-class campus for scaling limits.', setup: () => { patch(g => { g.month = 80; g.cash = 2e11; }); stressFill(12, 2); } },
];
