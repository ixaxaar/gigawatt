import { getItem } from '../../data';
import { computePUE } from '../validate';
import { rackRates, PART_LABEL, partClass } from '../failures';
import { staffEffect } from '../staffing';
import type { System } from './types';

/** installing → commissioning → online (or failed burn-in) → repaired. */
export const commissioning: System = {
  id: 'commissioning',
  run: (c) => {
    const { s, o, rng, log } = c;
    c.placed = s.halls.flatMap((h) => h.racks);
    c.placedById = new Map(c.placed.map((r) => [r.id, r]));
    for (const rack of c.placed) {
      if (rack.status === 'installing' && s.month >= rack.readyMonth - 1) {
        rack.status = 'commissioning';
      } else if (rack.status === 'commissioning' && s.month >= rack.readyMonth) {
        if (rng() < o.commissionFailProb) {
          rack.status = 'failed';
          rack.readyMonth = s.month + o.repairMonths;
          log('bad', `Rack ${rack.id} failed burn-in during commissioning; repair ETA month ${rack.readyMonth}.`);
        } else {
          rack.status = 'online';
          log('good', `Rack ${rack.id} commissioned and online.`);
        }
      } else if (rack.status === 'failed' && s.month >= rack.readyMonth) {
        rack.status = 'online';
        rack.failedPart = undefined;
        log('good', `Rack ${rack.id} repaired and back online.`);
      }
    }
  },
};

/** Cluster stats are computed from online racks only. */
export const clusterStats: System = { id: 'cluster-stats', run: (c) => c.refreshStats() };

/** MTBF-scaled random hardware failures; cooling shortfalls triple the rate,
 *  understaffing multiplies it and slows no-spare repairs. */
export const failures: System = {
  id: 'failures',
  run: (c) => {
    const { s, o, rng, log } = c;
    const staff = staffEffect(s);
    const onlineKW = s.clusters.reduce((n, cl) => n + (cl.stats?.powerKW ?? 0), 0);
    const coolingKW = s.halls.reduce((n, h) => n + h.coolingKW, 0);
    const stressed = coolingKW < onlineKW;
    let failedNow = 0;
    for (const rack of c.placed) {
      if (rack.status !== 'online') continue;
      const rates = rackRates(s, rack.designId);
      const total = rates.reduce((n, r) => n + r.rate, 0) * (o.accelFailureProbPerMonth * 8000);
      const p = Math.min(0.95, (1 - Math.exp(-total * (stressed ? 3 : 1))) * staff.failureMult);
      if (p > 0 && rng() < p) {
        let pick = rng() * rates.reduce((n, r) => n + r.rate, 0);
        const part = (rates.find((r) => (pick -= r.rate) <= 0) ?? rates[0]).id;
        const label = PART_LABEL[partClass(part) ?? ''] ?? 'part';
        rack.status = 'failed';
        rack.failedPart = part;
        if ((s.spareStock?.[part] ?? 0) > 0) {
          s.spareStock![part] -= 1;
          rack.readyMonth = s.month + 1;
          log('info', `${rack.id}: ${label} failed (${getItem(part)?.name}); swapping from your spares — back next month.`);
        } else {
          rack.readyMonth = s.month + o.repairMonths + staff.repairExtraMonths;
          log('bad', `${rack.id}: ${label} failed (${getItem(part)?.name}) and you have NO SPARE. Waiting on RMA until month ${rack.readyMonth}. Keep spares in the warehouse.`);
        }
        failedNow++;
      }
    }
    if (failedNow) {
      log('bad', `${failedNow} rack(s) went down${stressed ? ' — cooling capacity is below IT load, heat is killing hardware (3x failure rate)' : ''}.`);
      c.refreshStats();
    }
  },
};

export const pue: System = {
  id: 'pue',
  run: ({ s }) => { for (const hall of s.halls) hall.pue = computePUE(hall, getItem); },
};
