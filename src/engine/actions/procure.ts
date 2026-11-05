// GIGAWATT engine — procure actions. Generated from the former store.ts monolith.
import { getItem } from '../../data';
import type { GameStore } from '../api';
import { getTemplate } from '../../data/templates';
import { rackIdOf, rackOf, templateBom, trayIdOf, trayOf } from '../../plan';
import type { GameState } from '../../types';
import { spareQty } from '../../sim/failures';
import { fail, ok, usd } from './consts';
import { offerFor, reserve, volumeDiscount } from '../pricing';
import { frameworkFor, recordSpend, relDiscount } from '../../sim/vendors';
import type { Ctx } from './ctx';

export const procureActions = (c: Ctx): Partial<GameStore> => {
  const { get, commit, logln } = c;
  return {
    buy: (itemId, qty, spare = false) =>
      commit((g) => {
        const item = getItem(itemId);
        if (!item) return fail(`Unknown item '${itemId}'.`);
        if (item.kind === 'uplink') return fail('Internet circuits are added on Build → Internet.');
        if (!Number.isFinite(qty) || qty <= 0) return fail('Order quantity must be positive.');
        const offer = offerFor(g, item);
        if (!offer.available) {
          return fail(offer.reason ?? 'Not purchasable this month.', [
            { severity: 'error', code: 'unavailable', message: offer.reason ?? '', learn: item.id },
          ]);
        }
        let n = Math.floor(qty);
        let note = '';
        if (offer.qtyCap && n > offer.qtyCap) {
          n = offer.qtyCap;
          note = ` Vendor allocation capped the order at ${n}/quarter — everyone is fighting for these parts.`;
        }
        const discount = volumeDiscount(item, n, offer.unitPrice);
        const cost = Math.round(offer.unitPrice * n * (1 - discount));
        if (cost > g.cash) {
          return fail(`Insufficient funds: $${usd(cost)} needed, $${usd(g.cash)} in the bank.`);
        }
        const fw = frameworkFor(g, item.vendor);
        const rel = relDiscount(g, item.vendor);
        const vendorNote = `${fw ? ` (framework -${Math.round(fw.discountPct)}%)` : ''}${rel > 0 ? ` (relationship -${Math.round(rel * 100)}%)` : ''}`;
        g.cash -= cost;
        g.orders.push({
          id: `ord-${g.month}-${g.orders.length + 1}-${itemId}`,
          itemId,
          qty: n,
          unitPrice: Math.round(offer.unitPrice * (1 - discount)),
          arriveMonth: g.month + offer.leadMonths,
          placedMonth: g.month,
          ...(spare ? { spare: true } : {}),
        });
        recordSpend(g, item.vendor, cost);
        logln(
          g,
          'info',
          `Ordered ${n} ${spare ? 'spare ' : ''}× ${item.name} for $${usd(cost)}${discount > 0 ? ` (${(discount * 100).toFixed(0)}% volume discount)` : ''}${vendorNote}; arriving month ${g.month + offer.leadMonths}.${note}`,
        );
        return ok(`Ordered ${n} × ${item.name}; arrives month ${g.month + offer.leadMonths}.${vendorNote}${note}`);
      }),

    adoptTemplate: (templateId) => {
      const t = getTemplate(templateId);
      if (!t) return { ok: false, message: 'Unknown template.' };
      const g = get().game;
      if (!g.trays.some((x) => x.id === trayIdOf(t))) { const r = get().saveTray(trayOf(t)); if (!r.ok) return r; }
      if (!get().game.racks.some((x) => x.id === rackIdOf(t))) { const r = get().saveRack(rackOf(t)); if (!r.ok) return r; }
      return { ok: true, message: `Saved designs for ${t.name}.` };
    },

    buyTemplate: (templateId, racks, spares = true) => {
      const t = getTemplate(templateId);
      const nRacks = Math.floor(racks);
      if (!t) return { ok: false, message: 'Unknown template.' };
      if (!(nRacks >= 1)) return { ok: false, message: 'Order at least one rack.' };
      const adopted = get().adoptTemplate(templateId);
      if (!adopted.ok) return adopted;
      return commit((g) => {
        const bom = templateBom(t, nRacks);
        const spareBom: Record<string, number> = {};
        if (spares) for (const id of Object.keys(bom)) { const sp = spareQty(id, bom[id]); if (sp) spareBom[id] = sp; }
        let cost = 0, lead = 1;
        const lines: { itemId: string; n: number; unit: number; lead: number; spare?: boolean }[] = [];
        const wanted: [string, number, boolean][] = [...Object.entries(bom).map(([i, n]): [string, number, boolean] => [i, n, false]), ...Object.entries(spareBom).map(([i, n]): [string, number, boolean] => [i, n, true])];
        const vendorSpend = new Map<string, number>();
        let relNote = '', fwNote = '';
        for (const [itemId, n, isSpare] of wanted) {
          const item = getItem(itemId)!;
          const offer = offerFor(g, item);
          if (!offer.available) return fail(`${item.name} is not purchasable yet: ${offer.reason}`);
          if (offer.qtyCap && n > offer.qtyCap) return fail(`Allocation: the vendor will only sell ${offer.qtyCap} × ${item.name} per quarter and you asked for ${n}. Order fewer racks or split across quarters.`);
          const unit = Math.round(offer.unitPrice * (1 - volumeDiscount(item, n, offer.unitPrice)) * (1 + t.premium));
          cost += unit * n;
          vendorSpend.set(item.vendor, (vendorSpend.get(item.vendor) ?? 0) + unit * n);
          const fw = frameworkFor(g, item.vendor);
          if (fw) fwNote = ` (framework -${Math.round(fw.discountPct)}%)`;
          const rel = relDiscount(g, item.vendor);
          if (rel > 0) relNote = ` (relationship -${Math.round(rel * 100)}%)`;
          const l = Math.max(1, Math.round(offer.leadMonths * t.leadFactor));
          lead = Math.max(lead, l);
          lines.push({ itemId, n, unit, lead: l, spare: isSpare });
        }
        if (cost > g.cash) return fail(`Insufficient funds: this order costs $${usd(cost)} but you have $${usd(g.cash)}. Try fewer racks, or take a loan on the Dashboard.`);
        g.cash -= cost;
        reserve(g, rackIdOf(t), nRacks);
        const batch = `bt-${g.month}-${g.orders.length + 1}-${t.id}`;
        for (const l of lines) g.orders.push({ id: `ord-${g.month}-${g.orders.length + 1}-${l.itemId}`, batch, templateId: t.id, racks: nRacks, placedMonth: g.month, itemId: l.itemId, qty: l.n, unitPrice: l.unit, arriveMonth: g.month + l.lead, ...(l.spare ? { spare: true } : {}) });
        for (const [vendorId, usdSpent] of vendorSpend) recordSpend(g, vendorId, usdSpent);
        const vendorNote = `${fwNote}${relNote}`;
        logln(g, 'info', `Ordered ${nRacks} × ${t.name} for $${usd(cost)} (${t.tier}, ${Math.round(t.premium * 100)}% integration premium)${vendorNote}. Full bill of materials arrives by month ${g.month + lead}.`);
        return ok(`Ordered ${nRacks} racks: $${usd(cost)}, everything arrives by month ${g.month + lead}.${vendorNote}`);
      });
    },


    cancelOrder: (orderId) =>
      commit((g) => {
        const o = g.orders.find((x) => x.id === orderId);
        if (!o) return fail('That order has already arrived or does not exist.');
        const lines = o.batch ? g.orders.filter((x) => x.batch === o.batch) : [o];
        const refund = Math.round(lines.reduce((n, x) => n + x.qty * x.unitPrice, 0) * REFUND);
        g.cash += refund;
        g.orders = g.orders.filter((x) => !lines.includes(x));
        let what = `${o.qty} × ${getItem(o.itemId)?.name ?? o.itemId}`;
        if (o.batch && o.templateId) {
          const t = getTemplate(o.templateId);
          if (t) { reserve(g, rackIdOf(t), -(o.racks ?? 0)); what = `${o.racks} × ${t.name}`; }
          failProjects(g, o.templateId, `order cancelled in month ${g.month}`);
        }
        logln(g, 'info', `Cancelled ${what}; refunded $${usd(refund)} (${Math.round((1 - REFUND) * 100)}% restocking fee).`);
        return ok(`Cancelled ${what}. Refunded $${usd(refund)}.`);
      }),

    reduceOrder: (orderId, qty) => {
      const o = get().game.orders.find((x) => x.id === orderId);
      if (!o) return { ok: false, message: 'That order has already arrived or does not exist.' };
      const n = Math.floor(qty);
      if (!(n >= 0)) return { ok: false, message: 'Quantity must be zero or more.' };
      if (n === 0) return get().cancelOrder(orderId);
      return commit((g) => {
        const cur = g.orders.find((x) => x.id === orderId)!;
        if (!cur.batch || !cur.templateId) {
          if (n >= cur.qty) return fail(`Orders can only be reduced (currently ${cur.qty}).`);
          const refund = Math.round((cur.qty - n) * cur.unitPrice * REFUND);
          g.cash += refund; cur.qty = n;
          logln(g, 'info', `Reduced ${getItem(cur.itemId)?.name ?? cur.itemId} order to ${n}; refunded $${usd(refund)}.`);
          return ok(`Reduced to ${n}. Refunded $${usd(refund)}.`);
        }
        const t = getTemplate(cur.templateId); const old = cur.racks ?? 0;
        if (!t) return fail('Unknown template.');
        if (n >= old) return fail(`A rack order can only be reduced (currently ${old} racks).`);
        const bom = templateBom(t, n); let refund = 0;
        for (const l of g.orders.filter((x) => x.batch === cur.batch)) {
          const want = l.spare ? spareQty(l.itemId, bom[l.itemId] ?? 0) : (bom[l.itemId] ?? 0);
          if (want < l.qty) { refund += (l.qty - want) * l.unitPrice * REFUND; l.qty = want; }
          l.racks = n;
        }
        g.orders = g.orders.filter((x) => x.qty > 0);
        refund = Math.round(refund); g.cash += refund;
        reserve(g, rackIdOf(t), n - old);
        for (const p of g.projects ?? []) if (p.templateId === t.id && p.stage === 'building' && p.racks === old) { p.racks = n; p.notes.push(`order reduced to ${n} racks`); }
        logln(g, 'info', `Reduced ${t.name} order from ${old} to ${n} racks; refunded $${usd(refund)}.`);
        return ok(`Reduced to ${n} racks. Refunded $${usd(refund)}.`);
      });
    },

  };
};

/** Fraction of an open order's price returned on cancel/reduce (the rest is a restocking fee). */
const REFUND = 0.9;

/** An Easy Path project still waiting for parts cannot finish once its order is gone. */
function failProjects(g: GameState, templateId: string, why: string) {
  for (const p of g.projects ?? []) if (p.templateId === templateId && p.stage === 'building') { p.stage = 'failed'; p.notes.push(`stopped: ${why}`); }
}
