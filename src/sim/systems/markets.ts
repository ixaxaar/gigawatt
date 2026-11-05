import { rollEvents } from '../events';
import { powerMarketTick, spotRevenue, stepSpotPrice } from '../power';
import { rackAccels } from './helpers';
import type { System } from './types';

export const worldEvents: System = { id: 'world-events', run: ({ s, rng, log }) => rollEvents(s, rng, log) };

/** Spot GPU market sells idle accelerators; the power market reprices PPAs. */
export const spotAndPower: System = {
  id: 'spot-and-power',
  run: (c) => {
    const { s, rng, log } = c;
    stepSpotPrice(s, rng);
    const spot = spotRevenue(s, c.served, (d) => rackAccels(s, d));
    if (spot.revenue > 0) {
      c.revenue += spot.revenue;
      log('info', `Spot market: ${Math.round(spot.accels)} idle GPUs sold at $${(s.spotPrice ?? 0).toFixed(2)}/GPU-hr (${Math.round(spot.util * 100)}% filled) → +$${Math.round(spot.revenue).toLocaleString('en-US')}.`);
    }
    powerMarketTick(s, rng, log);
  },
};
