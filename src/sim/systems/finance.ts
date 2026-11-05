import { estimateCapexBasis, monthlyDepreciation, monthlyInterest, monthlyOpex } from '../economy';
import { settlePower } from '../power';
import { round2 } from './helpers';
import type { System } from './types';

/** Opex (with settled power), interest and cash. Bankruptcy is only a warning today. */
export const finances: System = {
  id: 'finances',
  run: (c) => {
    const { s, rng, log } = c;
    const opex0 = monthlyOpex(s);
    const pw = settlePower(s, (opex0.itPowerKW * opex0.pue) / 1000, rng, log);
    c.opexUSD = opex0.totalUSD - opex0.powerUSD + pw.netUSD;
    c.depreciation = monthlyDepreciation(estimateCapexBasis(s));
    c.interest = monthlyInterest(s.debt);
    const prevCash = s.cash;
    s.cash = round2(s.cash + c.revenue - c.opexUSD - c.interest);
    if (s.cash < 0 && prevCash >= 0) log('bad', 'Bankruptcy warning: cash is negative. Raise a loan, land contracts, or cut opex before creditors close you down.');
  },
};

export const history: System = {
  id: 'history',
  run: (c) => {
    const { s } = c;
    const onlineAccels = s.clusters.reduce((n, cl) => n + (cl.stats?.accelerators ?? 0), 0);
    const servingAccels = [...c.served].reduce((n, id) => n + (s.clusters.find((x) => x.id === id)?.stats?.accelerators ?? 0), 0);
    const utilization = onlineAccels > 0 ? Math.min(1, servingAccels / onlineAccels) : 0;
    s.history.push({ month: s.month, revenue: round2(c.revenue), opex: round2(c.opexUSD + c.depreciation + c.interest), cash: s.cash, utilization: round2(utilization) });
  },
};
