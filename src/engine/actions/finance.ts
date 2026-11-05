// GIGAWATT engine — finance actions. Generated from the former store.ts monolith.
import { fail, ok, usd } from './consts';
import type { GameStore } from '../api';
import { creditLimit } from '../pricing';
import type { Ctx } from './ctx';

export const financeActions = (c: Ctx): Partial<GameStore> => {
  const { commit, logln } = c;
  return {
    takeLoan: (amountUSD) =>
      commit((g) => {
        const amt = Math.floor(amountUSD);
        if (!Number.isFinite(amt) || amt <= 0) return fail('Loan amount must be positive.');
        const limit = creditLimit(g);
        if (g.debt + amt > limit) {
          return fail(
            `Credit limit is $${usd(limit)} (fixed line + collateral against installed assets). Borrow less or build more first.`,
          );
        }
        g.debt += amt;
        g.cash += amt;
        logln(g, 'info', `Drew a $${usd(amt)} loan at 7% APR — interest hits monthly. Principal due on refinancing.`);
        return ok(`$${usd(amt)} borrowed.`);
      }),

    repayLoan: (amountUSD) =>
      commit((g) => {
        const amt = Math.floor(amountUSD);
        if (!Number.isFinite(amt) || amt <= 0) return fail('Repayment amount must be positive.');
        if (amt > g.debt) return fail(`You only owe $${usd(g.debt)} — repay less.`);
        if (amt > g.cash) return fail(`Repaying $${usd(amt)} needs cash — you only have $${usd(g.cash)}.`);
        g.debt -= amt;
        g.cash -= amt;
        logln(g, 'good', `Repaid $${usd(amt)} of principal; $${usd(g.debt)} of debt remains.`);
        return ok(`$${usd(amt)} repaid.`);
      }),

  };
};
