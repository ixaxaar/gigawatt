import type { GameStore } from '../api';
import { MAINT_COST_PER_RACK } from '../../sim/policy';
import { fail, ok } from './consts';
import type { Ctx } from './ctx';

export const policyActions = (c: Ctx): Partial<GameStore> => {
  const { commit, logln } = c;
  return {
    setPolicy: (burnInMonths, maintenance) =>
      commit((g) => {
        if (!Number.isInteger(burnInMonths) || burnInMonths < 0 || burnInMonths > 3) return fail('Burn-in must be 0–3 months.');
        if (!Number.isInteger(maintenance) || maintenance < 0 || maintenance > 2) return fail('Maintenance level must be 0, 1 or 2.');
        g.policy = { burnInMonths, maintenance: maintenance as 0 | 1 | 2 };
        logln(g, 'info', `Policy: ${burnInMonths}-month burn-in, ${['reactive', 'preventive', 'premium'][maintenance]} maintenance ($${MAINT_COST_PER_RACK[maintenance]}/rack/mo). Applies to racks placed from now on and to future failures.`);
        return ok('Policy updated.');
      }),
  };
};
