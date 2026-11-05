import { getItem } from '../../data';
import type { Order } from '../../types';
import type { System } from './types';

/** Orders whose lead time elapsed land in inventory (or the spares shelf). */
export const deliveries: System = {
  id: 'deliveries',
  run: ({ s, log }) => {
    const arrived: Order[] = [];
    s.orders = s.orders.filter((od) => {
      if (od.arriveMonth <= s.month) { arrived.push(od); return false; }
      return true;
    });
    for (const od of arrived) {
      if (od.spare) { s.spareStock = s.spareStock ?? {}; s.spareStock[od.itemId] = (s.spareStock[od.itemId] ?? 0) + od.qty; }
      else s.inventory[od.itemId] = (s.inventory[od.itemId] ?? 0) + od.qty;
    }
    if (arrived.length) {
      const units = arrived.reduce((n, od) => n + od.qty, 0);
      log('good', `Delivered ${units} unit(s) from ${arrived.length} order(s) into inventory.`);
    }
  },
};

/** Purchased floor space finishes commissioning and becomes rack positions. */
export const floorSpace: System = {
  id: 'floor-space',
  run: ({ s, log }) => {
    for (const hall of s.halls) {
      if (!hall.expansions?.length) continue;
      const due = hall.expansions.filter((e) => e.readyMonth <= s.month);
      if (!due.length) continue;
      const slots = due.reduce((n, e) => n + e.units * 10, 0);
      hall.rackSlots += slots;
      hall.expansions = hall.expansions.filter((e) => e.readyMonth > s.month);
      log('good', `${hall.name}: ${slots} new rack positions commissioned (${hall.rackSlots} total).`);
    }
  },
};
