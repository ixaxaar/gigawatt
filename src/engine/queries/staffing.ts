// Read-only engine queries — staffing.
import { STAFF_COST_PER_MONTH } from '../../sim/economy';
import { staffEffect, staffNeeded, RECRUIT_COST_USD, SEVERANCE_USD } from '../../sim/staffing';
import { G } from './shared';

export const staffingQueries: Record<string, (...a: any[]) => any> = {
  staffing: () => {
    const g = G();
    const { needed, breakdown } = staffNeeded(g);
    const { failureMult, repairExtraMonths } = staffEffect(g);
    return {
      have: g.staff,
      needed,
      breakdown,
      failureMult,
      repairExtraMonths,
      monthlyCostUSD: g.staff * STAFF_COST_PER_MONTH,
      hireCostUSD: RECRUIT_COST_USD,
      severanceUSD: SEVERANCE_USD,
    };
  },
};
