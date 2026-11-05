// GIGAWATT engine — facility actions. Generated from the former store.ts monolith.
import { getItem } from '../../data';
import type { GameStore } from '../api';
import { computePUE } from '../../sim/validate';
import { HallState } from '../../types';
import { POWER_FEED_TYPES, fail, ok, usd } from './consts';
import { FLOOR_UNIT_COST, FLOOR_UNIT_SLOTS, floorCommissionMonths } from '../pricing';
import type { Ctx } from './ctx';

export const facilityActions = (c: Ctx): Partial<GameStore> => {
  const { commit, logln } = c;
  return {
    buildHall: (name, coolingClass, rackSlots) =>
      commit((g) => {
        const slots = Math.floor(rackSlots);
        if (slots < 4 || slots > 200) return fail('A new hall starts with 4–200 rack slots; buy more floor space later in units.');
        const cost = 2_000_000 + 250_000 * slots;
        if (cost > g.cash) return fail(`This hall costs $${usd(cost)} — not enough cash.`);
        g.cash -= cost;
        const id = `hall-${g.halls.length + 1}`;
        const hall: HallState = {
          id,
          name: name || id,
          coolingClass,
          rackSlots: slots,
          itPowerKW: 0,
          coolingKW: 0,
          pue: 1,
          powerEquip: {},
          coolingEquip: {},
          racks: [],
          floorLoadKgPerRack: { air: 1500, rdhx: 1800, dlc: 2400, immersion: 3200 }[coolingClass] ?? 1500,
        };
        g.halls.push(hall);
        logln(
          g,
          'good',
          `Built ${hall.name}: ${slots} slots, ${coolingClass.toUpperCase()}-ready shell. Install power and cooling plant before racks come in.`,
        );
        return ok(`${hall.name} built. Install power & cooling next.`);
      }),

    expandHall: (hallId, units) =>
      commit((g) => {
        const hall = g.halls.find((h) => h.id === hallId);
        if (!hall) return fail(`Hall '${hallId}' not found.`);
        const n = Math.floor(units);
        if (!(n >= 1)) return fail('Buy at least one floor unit.');
        const cost = n * FLOOR_UNIT_COST;
        if (cost > g.cash) return fail(`${n} floor unit(s) cost $${usd(cost)} — not enough cash.`);
        g.cash -= cost;
        const readyMonth = g.month + floorCommissionMonths(n);
        (hall.expansions ??= []).push({ units: n, readyMonth });
        logln(g, 'info', `Ordered ${n * FLOOR_UNIT_SLOTS} more rack positions for ${hall.name} ($${usd(cost)}). Slab, containment and fit-out finish in month ${readyMonth}.`);
        return ok(`${n * FLOOR_UNIT_SLOTS} slots ordered for ${hall.name}; commissioned ${readyMonth - g.month} months from now.`);
      }),

    installPower: (hallId, itemId, qty) =>
      commit((g) => {
        const hall = g.halls.find((h) => h.id === hallId);
        if (!hall) return fail(`Hall '${hallId}' not found.`);
        const item = getItem(itemId);
        if (!item || item.kind !== 'power') return fail('Pick a power-equipment catalog item.');
        if (item.powerType === 'pdu' || item.powerType === 'power-shelf') {
          return fail(`${item.name} is a rack/tray-level part — it gets used when you place a rack, not installed in the hall. Keep it in the warehouse.`);
        }
        const n = Math.floor(qty);
        if (n <= 0) return fail('Quantity must be positive.');
        const have = g.inventory[itemId] ?? 0;
        if (have < n) {
          return fail(`Need ${n} × ${item.name} in inventory (have ${have}). Order them first.`, [
            { severity: 'error', code: 'missing-parts', message: `Need ${n}, have ${have}.`, learn: item.id },
          ]);
        }
        g.inventory[itemId] = have - n;
        if (g.inventory[itemId] <= 0) delete g.inventory[itemId];
        hall.powerEquip[itemId] = (hall.powerEquip[itemId] ?? 0) + n;
        const addedKW = POWER_FEED_TYPES.includes(item.powerType) ? n * item.capacityKW : 0;
        hall.itPowerKW += addedKW;
        hall.pue = computePUE(hall, getItem);
        logln(
          g,
          'good',
          `Installed ${n} × ${item.name} in ${hall.name}${addedKW > 0 ? ` (+${usd(addedKW)} kW IT capacity)` : ''}.`,
        );
        return ok(`Installed in ${hall.name}.`);
      }),

    installCooling: (hallId, itemId, qty) =>
      commit((g) => {
        const hall = g.halls.find((h) => h.id === hallId);
        if (!hall) return fail(`Hall '${hallId}' not found.`);
        const item = getItem(itemId);
        if (!item || item.kind !== 'cooling') return fail('Pick a cooling-equipment catalog item.');
        const n = Math.floor(qty);
        if (n <= 0) return fail('Quantity must be positive.');
        // Rear-door halls reject heat through the same chilled-water (air-class) plant; immersion loops can use warm-water (DLC-class) plant.
        const compatible = item.serves === hall.coolingClass || (hall.coolingClass === 'rdhx' && item.serves === 'air') || (hall.coolingClass === 'immersion' && item.serves === 'dlc');
        if (!compatible) {
          return fail(
            `${item.name} serves ${item.serves.toUpperCase()} loads, but ${hall.name} is a ${hall.coolingClass.toUpperCase()} hall.`,
            [
              {
                severity: 'error',
                code: 'cooling-mismatch',
                message: `${item.name} serves ${item.serves}; hall is ${hall.coolingClass}.`,
                learn: item.id,
              },
            ],
          );
        }
        const have = g.inventory[itemId] ?? 0;
        if (have < n) {
          return fail(`Need ${n} × ${item.name} in inventory (have ${have}). Order them first.`, [
            { severity: 'error', code: 'missing-parts', message: `Need ${n}, have ${have}.`, learn: item.id },
          ]);
        }
        g.inventory[itemId] = have - n;
        if (g.inventory[itemId] <= 0) delete g.inventory[itemId];
        hall.coolingEquip[itemId] = (hall.coolingEquip[itemId] ?? 0) + n;
        hall.coolingKW += n * item.capacityKW;
        hall.pue = computePUE(hall, getItem);
        logln(g, 'good', `Installed ${n} × ${item.name} in ${hall.name} (+${usd(n * item.capacityKW)} kW heat rejection).`);
        return ok(`Installed in ${hall.name}.`);
      }),

    buyUplink: (itemId) =>
      commit((g) => {
        const item = getItem(itemId);
        if (!item || item.kind !== 'uplink') return fail('Pick an internet circuit.');
        if (item.availableFrom * 12 - 2020 * 12 > g.month) return fail(`${item.name} is not offered yet.`);
        if (g.cash < item.priceUSD) return fail(`Install fee is $${usd(item.priceUSD)}; you have $${usd(g.cash)}.`);
        g.cash -= item.priceUSD;
        g.uplinks = { ...(g.uplinks ?? {}), [itemId]: ((g.uplinks ?? {})[itemId] ?? 0) + 1 };
        logln(g, 'info', `Turned up ${item.name}: $${usd(item.priceUSD)} install, then $${usd(item.mrcUSD)}/month.`);
        return ok(`${item.name} is live. Billing $${usd(item.mrcUSD)}/month.`);
      }),

    dropUplink: (itemId) =>
      commit((g) => {
        const c = g.uplinks?.[itemId] ?? 0;
        if (c <= 0) return fail('You have no such circuit.');
        g.uplinks = { ...g.uplinks, [itemId]: c - 1 };
        return ok('Circuit cancelled; billing stops next month.');
      }),

  };
};
