import { describe, it, expect } from 'vitest';
import { useGame, rackBom, availableFor } from './store';
import { TEMPLATES } from './data/templates';
import { rackIdOf } from './plan';
import { machineLedger, rackReadiness } from './ledger';

const fresh = () => { useGame.getState().newGame(3); useGame.setState((s) => ({ game: { ...s.game, cash: 5e9 } })); };
const st = () => useGame.getState();
const g = () => useGame.getState().game;

describe('rack reservation', () => {
  it('parts reserved for one design are not deployable as another design', () => {
    fresh();
    const t = TEMPLATES[0];
    st().adoptTemplate(t.id);
    const base = g().racks.find((r) => r.id === rackIdOf(t))!;
    st().saveRack({ ...base, id: 'clone', name: 'Clone' });          // a second design built from identical parts
    const bom = rackBom(g(), base.id)!;
    const stock = (n: number) => useGame.setState((s) => ({ game: { ...s.game, inventory: Object.fromEntries(Object.entries(bom).map(([k, per]) => [k, per * n])) } }));
    stock(2);
    expect(rackReadiness(g(), 'clone', 1)!.buildableNow).toBe(2);     // nothing reserved yet: parts are fungible
    st().reserveRacks(base.id, 2);                                    // "I ordered 2 of the base design"
    expect(rackReadiness(g(), 'clone', 1)!.buildableNow).toBe(0);
    expect(rackReadiness(g(), base.id, 1)!.buildableNow).toBe(2);
    expect(st().placeRack(g().halls[0].id, 'clone').ok).toBe(false);
    st().reserveRacks(base.id, -1); st().reserveRacks('clone', 1);    // split 1 + 1
    expect(rackReadiness(g(), base.id, 1)!.buildableNow).toBe(1);
    expect(rackReadiness(g(), 'clone', 1)!.buildableNow).toBe(1);
  });
});

describe('rack identity', () => {
  it('serials are unique across halls', () => {
    fresh();
    const t = TEMPLATES[0]; st().buyTemplate(t.id, 2, false);
    useGame.setState((s) => ({ game: { ...s.game, inventory: { ...s.game.inventory, ...Object.fromEntries(Object.entries(rackBom(s.game, rackIdOf(t))!).map(([k, n]) => [k, n * 4])) } } }));
    for (const h of g().halls) { st().installPower; void h; }
    const hall2 = (st().buildHall('H2', 'air', 8), g().halls[1]);
    const ids: string[] = [];
    for (const h of [g().halls[0], hall2]) { const r = st().placeRack(h.id, rackIdOf(t)); void r; }
    for (const h of g().halls) for (const r of h.racks) ids.push(r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(machineLedger(g()).map((m) => m.serial).length).toBe(ids.length);
  });
});

describe('floor space', () => {
  it('expansion adds slots only after the commissioning delay', () => {
    fresh();
    const h = g().halls[0], before = h.rackSlots;
    expect(st().expandHall(h.id, 2).ok).toBe(true);
    expect(g().halls[0].rackSlots).toBe(before);
    for (let i = 0; i < 6; i++) st().nextMonth();
    expect(g().halls[0].rackSlots).toBe(before + 20);
    expect(g().halls[0].expansions ?? []).toHaveLength(0);
  });
});
