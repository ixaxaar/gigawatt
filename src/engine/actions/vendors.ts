// GIGAWATT engine — vendor framework actions.
import { VENDORS } from '../../data';
import { Framework } from '../../types';
import {
  FRAMEWORK_CANCEL_PENALTY_PCT, FRAMEWORK_CANCEL_REL_HIT, FRAMEWORK_DEPOSIT_PCT,
  FRAMEWORK_MAX_MONTHS, FRAMEWORK_MIN_COMMIT_USD, FRAMEWORK_MIN_MONTHS,
  adjustRel, discountPctFor, frameworkFor,
} from '../../sim/vendors';
import type { GameStore } from '../api';
import { fail, ok, usd } from './consts';
import type { Ctx } from './ctx';

export const vendorsActions = (c: Ctx): Partial<GameStore> => {
  const { commit, logln } = c;
  return {
    signFramework: (vendorId, commitUSD, months) =>
      commit((g) => {
        const vendor = VENDORS.find((v) => v.id === vendorId);
        if (!vendor) return fail(`Unknown vendor '${vendorId}'.`);
        if (!Number.isFinite(commitUSD) || commitUSD < FRAMEWORK_MIN_COMMIT_USD)
          return fail(`Commit at least $${usd(FRAMEWORK_MIN_COMMIT_USD)} of spend (you asked for $${usd(Number.isFinite(commitUSD) ? commitUSD : 0)}).`);
        if (!Number.isInteger(months) || months < FRAMEWORK_MIN_MONTHS || months > FRAMEWORK_MAX_MONTHS)
          return fail(`Term must be ${FRAMEWORK_MIN_MONTHS}-${FRAMEWORK_MAX_MONTHS} whole months.`);
        if (frameworkFor(g, vendorId)) return fail(`${vendor.name} already has an active framework — one at a time per vendor.`);
        const deposit = Math.round(commitUSD * FRAMEWORK_DEPOSIT_PCT);
        if (g.cash < deposit) return fail(`The signing deposit is $${usd(deposit)} (5% of commit); you have $${usd(g.cash)}.`);
        g.cash -= deposit;
        const fw: Framework = {
          id: `fw-${g.month}-${(g.frameworks?.length ?? 0) + 1}`,
          vendorId,
          commitUSD: Math.round(commitUSD),
          spentUSD: deposit, // the deposit counts toward the commitment
          discountPct: discountPctFor(commitUSD, months),
          startMonth: g.month,
          endMonth: g.month + months,
        };
        (g.frameworks ??= []).push(fw);
        logln(g, 'good', `Signed a ${months}-mo framework with ${vendor.name}: $${usd(fw.commitUSD)} committed for ${fw.discountPct}% off their parts (deposit $${usd(deposit)} credited toward the commit, runs to month ${fw.endMonth}).`);
        return ok(`Framework with ${vendor.name} signed: ${fw.discountPct}% off, $${usd(fw.commitUSD)} over ${months} months.`);
      }),

    cancelFramework: (frameworkId) =>
      commit((g) => {
        const fws = g.frameworks ?? [];
        const i = fws.findIndex((f) => f.id === frameworkId);
        if (i < 0) return fail('Framework not found.');
        const fw = fws[i];
        const name = VENDORS.find((v) => v.id === fw.vendorId)?.name ?? fw.vendorId;
        const unmet = fw.commitUSD - fw.spentUSD;
        if (unmet > 0) {
          const penalty = Math.round(unmet * FRAMEWORK_CANCEL_PENALTY_PCT);
          if (g.cash < penalty) return fail(`Walking away costs $${usd(penalty)} (20% of the $${usd(unmet)} unmet commitment) but you only have $${usd(g.cash)}.`);
          g.cash -= penalty;
          adjustRel(g, fw.vendorId, FRAMEWORK_CANCEL_REL_HIT);
          fws.splice(i, 1);
          logln(g, 'bad', `Cancelled the ${name} framework with $${usd(unmet)} of the commitment unmet: $${usd(penalty)} penalty paid and the relationship soured.`);
          return ok(`Cancelled ${name} framework for a $${usd(penalty)} penalty.`);
        }
        fws.splice(i, 1);
        logln(g, 'info', `Closed out the ${name} framework — commitment fully spent, no penalty.`);
        return ok(`Cancelled ${name} framework: commitment met, nothing owed.`);
      }),

  };
};
