// GIGAWATT engine — staff actions (hire/fire).
import { STAFF_COST_PER_MONTH } from '../../sim/economy';
import { RECRUIT_COST_USD, SEVERANCE_USD } from '../../sim/staffing';
import { fail, ok, usd } from './consts';
import type { GameStore } from '../api';
import type { Ctx } from './ctx';

export const staffActions = (c: Ctx): Partial<GameStore> => {
  const { commit, logln } = c;
  return {
    hireStaff: (n) =>
      commit((g) => {
        const count = Math.floor(n);
        if (!Number.isFinite(count) || count < 1 || count > 50) return fail('Hire between 1 and 50 staff at a time.');
        const cost = RECRUIT_COST_USD * count;
        if (g.cash < cost) return fail(`Recruiting ${count} costs $${usd(cost)} — you only have $${usd(g.cash)}.`);
        g.cash -= cost;
        g.staff += count;
        logln(g, 'good', `Hired ${count} at $${usd(RECRUIT_COST_USD)} recruiting each; payroll is now $${usd(g.staff * STAFF_COST_PER_MONTH)}/month.`);
        return ok(`Hired ${count}.`);
      }),

    fireStaff: (n) =>
      commit((g) => {
        const count = Math.floor(n);
        if (!Number.isFinite(count) || count < 1) return fail('Fire at least 1 staff member.');
        if (g.staff - count < 1) return fail(`Cannot go below 1 staff member (you have ${g.staff}).`);
        const severance = SEVERANCE_USD * count;
        if (g.cash < severance) return fail(`Severance for ${count} is $${usd(severance)} (2 months each) — you only have $${usd(g.cash)}.`);
        g.cash -= severance;
        g.staff -= count;
        logln(g, 'info', `Let ${count} go with $${usd(severance)} severance; payroll is now $${usd(g.staff * STAFF_COST_PER_MONTH)}/month.`);
        return ok(`Fired ${count}.`);
      }),
  };
};
