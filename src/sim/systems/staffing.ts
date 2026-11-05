import { STAFF_COST_PER_MONTH } from '../economy';
import { staffNeeded } from '../staffing';
import type { System } from './types';

/** Warns about crew shortages (and idle payroll) before failures roll. No RNG. */
export const staffingCheck: System = {
  id: 'staffing',
  run: ({ s, log }) => {
    const { needed } = staffNeeded(s);
    if (s.staff < needed) {
      log('bad', `Understaffed: ${s.staff} of ${needed} needed. Failures x1.8, repairs slower. Hire on Dashboard/Facility.`);
    } else if (s.staff > needed + 2 && s.month % 6 === 0) {
      log('info', `Overstaffed: ${s.staff} on the payroll, only ${needed} needed — each extra costs $${STAFF_COST_PER_MONTH.toLocaleString('en-US')}/month. Let a few go on the Dashboard.`);
    }
  },
};
