import { STAFF_COST_PER_MONTH } from '../economy';
import { staffNeeded, staffEffect } from '../staffing';
import type { System } from './types';

/** Warns about crew shortages (and idle payroll) before failures roll. No RNG. */
export const staffingCheck: System = {
  id: 'staffing',
  run: ({ s, log }) => {
    const { needed } = staffNeeded(s);
    if (s.staff < needed) {
      // quarterly nag (a toast every month is noise); the Operations screen always shows the live gap
      if (s.month % 3 !== 0) return;
      const fx = staffEffect(s);
      log('bad', `Understaffed: ${s.staff} of ${needed} needed. Failures x${fx.failureMult.toFixed(1)}${fx.repairExtraMonths ? ', repairs a month slower' : ''}. Hire on the Operations screen.`);
    } else if (s.staff > needed + 2 && s.month % 6 === 0) {
      log('info', `Overstaffed: ${s.staff} on the payroll, only ${needed} needed — each extra costs $${STAFF_COST_PER_MONTH.toLocaleString('en-US')}/month. Let a few go on the Operations screen.`);
    }
  },
};
