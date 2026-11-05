import { describe, it, expect } from 'vitest';
import { useGame, offerAt, offerFor } from '../store';
import { getItem } from '../data';
import { QUERIES } from './queries';
import { advanceMonth } from '../sim/tick';
import type { GameState } from '../types';

const fresh = () => { useGame.getState().newGame(3); };
const st = () => useGame.getState();
const g = () => useGame.getState().game;
const patch = (fn: (g: GameState) => GameState) => useGame.setState((s) => ({ game: fn(s.game) }));

describe('offerFor: relationship pricing and allocation', () => {
  it('lowers the unit price and raises the cap with relationship, and is neutral without one', () => {
    fresh();
    patch((s) => ({ ...s, month: 33, reputation: 0, vendorRel: { nvidia: 100 } })); // H100 era
    const item = getItem('nv-h100-sxm')!;
    const base = offerAt(item, 33);
    const o = offerFor(g(), item);
    expect(o.available).toBe(true);
    expect(o.unitPrice).toBe(Math.round(base.unitPrice * 0.94)); // 6% relationship discount
    expect(o.qtyCap).toBe(Math.floor(base.qtyCap! * 1.5));
    patch((s) => ({ ...s, vendorRel: {} }));
    const neutral = offerFor(g(), item);
    expect(neutral.unitPrice).toBe(base.unitPrice);
    expect(neutral.qtyCap).toBe(base.qtyCap);
  });

  it('stacks the framework discount on top of the relationship discount', () => {
    fresh();
    patch((s) => ({ ...s, month: 33, reputation: 0, vendorRel: { nvidia: 50 } }));
    expect(st().signFramework('nvidia', 2e6, 12).ok).toBe(true); // 3% framework
    const item = getItem('nv-h100-sxm')!;
    const base = offerAt(item, 33);
    const o = offerFor(g(), item);
    expect(o.unitPrice).toBe(Math.round(base.unitPrice * (1 - 0.03 - 0.03)));
  });
});

describe('buy: spend recording and discount notes', () => {
  it('records spend into vendorRel and the active framework', () => {
    fresh();
    expect(st().signFramework('samsung', 2e6, 12).ok).toBe(true);
    const deposit = 100_000;
    const r = st().buy('sam-pm1733-3t84', 100);
    expect(r.ok).toBe(true);
    expect(r.message).toContain('(framework -3%)');
    const ord = g().orders[g().orders.length - 1];
    const base = offerAt(getItem('sam-pm1733-3t84')!, g().month);
    expect(ord.unitPrice).toBe(Math.round(base.unitPrice * 0.97));
    const spent = g().vendorRel!.samsung * 1e6; // rel gain = $/1M
    expect(spent).toBeGreaterThan(0);
    expect(g().frameworks![0].spentUSD).toBeCloseTo(deposit + spent, -1);
  });

  it('buyTemplate records spend per vendor and notes vendor discounts', () => {
    fresh();
    expect(st().signFramework('nvidia', 2e6, 12).ok).toBe(true);
    const r = st().buyTemplate('tpl-hgx-a100-generic-diy', 1, false); // BOM spans nvidia/amd/samsung/vertiv/generic
    expect(r.ok).toBe(true);
    expect(r.message).toContain('(framework -3%)');
    expect(g().vendorRel!.nvidia).toBeGreaterThan(0);
    expect(g().vendorRel!.amd).toBeGreaterThan(0);
    expect(g().vendorRel!.samsung).toBeGreaterThan(0);
    expect(g().frameworks![0].spentUSD).toBeGreaterThan(100_000); // deposit + nvidia lines
  });
});

describe('signFramework validation', () => {
  it('rejects unknown vendor, small commit, wrong term, active duplicate and missing deposit', () => {
    fresh();
    expect(st().signFramework('no-such-vendor', 2e6, 12).ok).toBe(false);
    expect(st().signFramework('nvidia', 1_999_999, 12).ok).toBe(false);
    expect(st().signFramework('nvidia', NaN, 12).ok).toBe(false);
    expect(st().signFramework('nvidia', 2e6, 5).ok).toBe(false);
    expect(st().signFramework('nvidia', 2e6, 37).ok).toBe(false);
    expect(st().signFramework('nvidia', 2e6, 12.5).ok).toBe(false);
    patch((s) => ({ ...s, cash: 99_999 }));
    expect(st().signFramework('nvidia', 2e6, 12).ok).toBe(false);
    patch((s) => ({ ...s, cash: 5e9 }));
    expect(st().signFramework('nvidia', 2e6, 12).ok).toBe(true);
    expect(st().signFramework('nvidia', 2e6, 12).ok).toBe(false); // one active per vendor
  });

  it('deducts the 5% deposit (credited to spentUSD) and books the framework', () => {
    fresh();
    patch((s) => ({ ...s, cash: 5e9 }));
    expect(st().signFramework('nvidia', 10e6, 24).ok).toBe(true);
    expect(g().cash).toBe(5e9 - 500_000);
    const fw = g().frameworks![0];
    expect(fw).toMatchObject({ id: 'fw-11-1', vendorId: 'nvidia', commitUSD: 10e6, spentUSD: 500_000, startMonth: 11, endMonth: 35 });
    expect(fw.discountPct).toBe(8.1); // log-interpolated between 3%@$2M/12mo and 12%@$50M/36mo
  });
});

describe('cancelFramework', () => {
  it('charges 20% of the unmet commitment and hits the relationship', () => {
    fresh();
    patch((s) => ({ ...s, cash: 5e9, vendorRel: { nvidia: 20 } }));
    expect(st().signFramework('nvidia', 10e6, 24).ok).toBe(true); // deposit 500k
    expect(st().cancelFramework('fw-11-1').ok).toBe(true); // unmet 9.5M -> penalty 1.9M
    expect(g().cash).toBe(5e9 - 500_000 - 1_900_000);
    expect(g().vendorRel!.nvidia).toBe(5);
    expect(g().frameworks).toHaveLength(0);
    expect(g().log.some((l) => l.level === 'bad' && l.text.includes('framework'))).toBe(true);
  });

  it('refuses to cancel when the penalty cannot be paid; free when fully spent', () => {
    fresh();
    patch((s) => ({ ...s, cash: 500_000 }));
    expect(st().signFramework('nvidia', 10e6, 24).ok).toBe(true);
    expect(g().cash).toBe(0);
    expect(st().cancelFramework('fw-11-1').ok).toBe(false);
    expect(g().frameworks).toHaveLength(1);
    patch((s) => ({ ...s, frameworks: s.frameworks!.map((f) => ({ ...f, spentUSD: f.commitUSD })), vendorRel: { nvidia: 20 } }));
    const cashBefore = g().cash;
    expect(st().cancelFramework('fw-11-1').ok).toBe(true);
    expect(g().cash).toBe(cashBefore);
    expect(g().vendorRel!.nvidia).toBe(20);
  });
});

describe('monthly vendor system', () => {
  it('expired framework met in full: +5 rel, no penalty, removed', () => {
    fresh();
    patch((s) => ({ ...s, cash: 5e9, vendorRel: { nvidia: 50 } }));
    const twin = JSON.parse(JSON.stringify(g())) as GameState; // identical world without the framework
    expect(st().signFramework('nvidia', 2e6, 6).ok).toBe(true); // endMonth 17
    patch((s) => ({ ...s, frameworks: s.frameworks!.map((f) => ({ ...f, spentUSD: f.commitUSD })) }));
    let real = g(), ref = twin;
    for (let i = 0; i < 7; i++) { real = advanceMonth(real); ref = advanceMonth(ref); } // month 18 > 17
    expect(real.month).toBe(18);
    expect(real.frameworks ?? []).toHaveLength(0);
    expect(real.vendorRel!.nvidia).toBeCloseTo(50 + 5 - 7 * 0.5, 5); // bonus then monthly decay
    expect(ref.vendorRel!.nvidia).toBeCloseTo(50 - 7 * 0.5, 5);
    expect(real.cash).toBeCloseTo(ref.cash - 100_000, 0); // only the deposit was kept
    expect(real.log.some((l) => l.level === 'good' && l.text.includes('closed out in full'))).toBe(true);
  });

  it('expired framework with shortfall: 15% take-or-pay penalty and rel -10', () => {
    fresh();
    patch((s) => ({ ...s, cash: 5e9, vendorRel: { nvidia: 50 } }));
    const twin = JSON.parse(JSON.stringify(g())) as GameState;
    expect(st().signFramework('nvidia', 2e6, 6).ok).toBe(true); // deposit 100k spent, 1.9M unmet
    let real = g(), ref = twin;
    for (let i = 0; i < 7; i++) { real = advanceMonth(real); ref = advanceMonth(ref); }
    expect(real.frameworks ?? []).toHaveLength(0);
    expect(real.vendorRel!.nvidia).toBeCloseTo(50 - 10 - 7 * 0.5, 5);
    expect(real.cash).toBeCloseTo(ref.cash - 100_000 - 285_000, 0); // deposit + 15% of 1.9M
    expect(real.log.some((l) => l.level === 'bad' && l.text.includes('take-or-pay'))).toBe(true);
  });
});

describe('vendor queries', () => {
  it('vendors() lists only vendors with rel or a framework, with live framework details', () => {
    fresh();
    patch((s) => ({ ...s, vendorRel: { nvidia: 50, amd: 0 } }));
    let rows = QUERIES.vendors() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'nvidia', name: 'NVIDIA', rel: 50, framework: null });
    expect(rows[0].relDiscountPct).toBeCloseTo(3);
    expect(rows[0].capMult).toBeCloseTo(1 + 0.25 + 0.03); // rel 50, reputation 10
    expect(st().signFramework('nvidia', 2e6, 12).ok).toBe(true);
    rows = QUERIES.vendors() as any[];
    expect(rows[0].framework).toMatchObject({ commitUSD: 2e6, spentUSD: 100_000, discountPct: 3, endMonth: 23 });
  });

  it('frameworkQuote() validates and prices a prospective framework', () => {
    fresh();
    expect(QUERIES.frameworkQuote('amd', 5e6, 24)).toMatchObject({ valid: true, depositUSD: 250_000 });
    expect((QUERIES.frameworkQuote('amd', 5e6, 24) as any).discountPct).toBeGreaterThan(3);
    expect(QUERIES.frameworkQuote('amd', 1e6, 24).valid).toBe(false);
    expect(QUERIES.frameworkQuote('amd', 5e6, 48).valid).toBe(false);
    expect(QUERIES.frameworkQuote('nope', 5e6, 24).valid).toBe(false);
    expect(st().signFramework('nvidia', 2e6, 12).ok).toBe(true);
    expect(QUERIES.frameworkQuote('nvidia', 5e6, 24).valid).toBe(false);
  });
});
