// Warehouse ledger: what you own, where it is (warehouse / on order / deployed) and what a rack still needs.
import { getItem } from './data';
import { offerAt, rackBom, volumeDiscount } from './store';
import type { GameState } from './types';

export interface LedgerRow { id: string; name: string; kind: string; vendor: string; warehouse: number; onOrder: number; nextEta?: number; deployed: number; }

export function ledger(g: GameState): LedgerRow[] {
  const rows = new Map<string, LedgerRow>();
  const row = (id: string): LedgerRow => {
    let r = rows.get(id);
    if (!r) { const it = getItem(id); r = { id, name: it?.name ?? id, kind: it?.kind ?? '?', vendor: it?.vendor ?? '', warehouse: 0, onOrder: 0, deployed: 0 }; rows.set(id, r); }
    return r;
  };
  for (const [id, n] of Object.entries(g.inventory)) if (n > 0) row(id).warehouse += n;
  for (const o of g.orders) { const r = row(o.itemId); r.onOrder += o.qty; r.nextEta = Math.min(r.nextEta ?? 1e9, o.arriveMonth); }
  for (const h of g.halls) {
    for (const [id, n] of Object.entries({ ...h.powerEquip, ...h.coolingEquip })) row(id).deployed += n;
    for (const p of h.racks) for (const [id, n] of Object.entries(rackBom(g, p.designId) ?? {})) row(id).deployed += n;
  }
  return [...rows.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
}

export interface MissingLine { id: string; name: string; need: number; have: number; short: number; onOrder: number; buyable: boolean; unitPrice: number; leadMonths: number; reason?: string; }

/** What is still missing to assemble `racks` copies of a design, and what it'd cost / how long it takes. */
export function rackReadiness(g: GameState, designId: string, racks = 1) {
  const bom = rackBom(g, designId);
  if (!bom) return undefined;
  const lines: MissingLine[] = Object.entries(bom).map(([id, per]) => {
    const need = per * racks, have = g.inventory[id] ?? 0;
    const onOrder = g.orders.filter((o) => o.itemId === id).reduce((n, o) => n + o.qty, 0);
    const it = getItem(id)!;
    const o = it ? offerAt(it, g.month) : undefined;
    return { id, name: it?.name ?? id, need, have, short: Math.max(0, need - have), onOrder, buyable: !!o?.available, unitPrice: o?.unitPrice ?? 0, leadMonths: o?.leadMonths ?? 0, reason: o?.reason };
  });
  const per = Object.values(bom);
  const buildableNow = Math.min(...Object.entries(bom).map(([id, n]) => Math.floor((g.inventory[id] ?? 0) / n)));
  void per;
  const toBuy = lines.filter((l) => l.short - l.onOrder > 0);
  const cost = toBuy.reduce((n, l) => { const q = l.short - l.onOrder; return n + Math.round(l.unitPrice * q * (1 - (it(l.id) ? volumeDiscount(it(l.id)!, q, l.unitPrice) : 0))); }, 0);
  const blocked = toBuy.filter((l) => !l.buyable);
  const eta = Math.max(0, ...lines.filter((l) => l.short > 0).map((l) => (l.onOrder >= l.short ? Math.max(0, (g.orders.filter((o) => o.itemId === l.id).map((o) => o.arriveMonth).sort((a, b) => b - a)[0] ?? g.month) - g.month) : l.leadMonths)));
  return { lines, buildableNow, complete: lines.every((l) => l.short === 0), toBuy, blocked, cost, etaMonths: eta };
}
const it = (id: string) => getItem(id);
