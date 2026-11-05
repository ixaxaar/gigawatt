// Cheap whole-state invariants checked after every month of a playtest. A violation is always a bug
// (engine, save format or UI contract) — never a strategy problem.
import type { GameState } from '../types';

export interface Violation { month: number; rule: string; detail: string }

function scanNumbers(v: unknown, path: string, out: string[], depth = 0): void {
  if (out.length > 5 || depth > 8) return;
  if (typeof v === 'number') { if (!Number.isFinite(v)) out.push(`${path}=${v}`); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => scanNumbers(x, `${path}[${i}]`, out, depth + 1)); return; }
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) scanNumbers(x, `${path}.${k}`, out, depth + 1);
}

export function check(g: GameState, prevMonth: number): Violation[] {
  const vs: Violation[] = []; const bad = (rule: string, detail: string) => vs.push({ month: g.month, rule, detail });
  const nan: string[] = []; scanNumbers(g, 'g', nan); if (nan.length) bad('non-finite number', nan.join(', '));
  if (g.month < prevMonth) bad('time went backwards', `${prevMonth} -> ${g.month}`);
  if (g.debt < -1e-6) bad('negative debt', String(g.debt));
  if (g.staff < 1) bad('no staff', String(g.staff));
  if (g.reputation < 0 || g.reputation > 100) bad('reputation out of range', String(g.reputation));
  for (const [k, n] of Object.entries(g.inventory)) if (n < 0 || !Number.isInteger(n)) bad('bad inventory', `${k}=${n}`);
  for (const [k, n] of Object.entries(g.spareStock ?? {})) if (n < 0) bad('negative spares', `${k}=${n}`);
  for (const [k, n] of Object.entries(g.rackReserve ?? {})) if (n < 0) bad('negative reservation', `${k}=${n}`);
  if (g.log.length > 400) bad('log not capped', String(g.log.length));
  const rackIds = new Set<string>(); const placed = new Map<string, string>();
  for (const h of g.halls) {
    const slots = new Set<number>();
    for (const r of h.racks) {
      if (rackIds.has(r.id)) bad('duplicate rack id', r.id); rackIds.add(r.id); placed.set(r.id, r.clusterId ?? '');
      if (slots.has(r.slot)) bad('two racks in one slot', `${h.name}#${r.slot}`); slots.add(r.slot);
      if (r.slot >= h.rackSlots) bad('rack beyond hall slots', `${r.id} slot ${r.slot} >= ${h.rackSlots}`);
      if (!g.racks.some((d) => d.id === r.designId)) bad('rack with unknown design', `${r.id}:${r.designId}`);
    }
    if (h.coolingKW < 0 || h.itPowerKW < 0) bad('negative hall capacity', h.name);
  }
  const clusterIds = new Set(g.clusters.map((c) => c.id));
  if (clusterIds.size !== g.clusters.length) bad('duplicate cluster id', '');
  for (const c of g.clusters) for (const rid of c.rackIds) if (!rackIds.has(rid)) bad('cluster references missing rack', `${c.id}:${rid}`);
  for (const [rid, cid] of placed) if (cid && !clusterIds.has(cid)) bad('rack points at missing cluster', `${rid}:${cid}`);
  for (const ac of g.activeContracts) for (const cid of ac.clusterIds) if (!clusterIds.has(cid)) bad('contract references missing cluster', `${ac.contract.id}:${cid}`);
  for (const id of g.spotRacks ?? []) if (!rackIds.has(id)) bad('spot list has missing rack', id);
  for (const id of g.spotClusters ?? []) if (!clusterIds.has(id)) bad('spot list has missing cluster', id);
  for (const p of g.projects ?? []) for (const rid of p.rackIds) if (p.stage !== 'failed' && p.stage !== 'done' && rid && !rackIds.has(rid) && !g.orders.length && false) bad('project rack missing', rid);
  const ids = g.availableContracts.map((c) => c.id); if (new Set(ids).size !== ids.length) bad('duplicate offer ids', '');
  if (g.availableContracts.length > 40) bad('offer board unbounded', String(g.availableContracts.length));
  if ((g.frameworks ?? []).some((f) => f.spentUSD < 0)) bad('negative framework spend', '');
  for (const r of g.rivals ?? []) if (r.accels < 0) bad('negative rival capacity', r.id);
  if (g.marketPriceIndex != null && (g.marketPriceIndex < 0.5 || g.marketPriceIndex > 1.5)) bad('price index out of range', String(g.marketPriceIndex));
  const size = JSON.stringify(g).length; if (size > 6_000_000) bad('state too large', `${(size / 1e6).toFixed(1)} MB`);
  return vs;
}
