// Read-only engine queries — vendors (relationships & frameworks).
import { VENDORS } from '../../data';
import {
  FRAMEWORK_DEPOSIT_PCT, FRAMEWORK_MAX_MONTHS, FRAMEWORK_MIN_COMMIT_USD, FRAMEWORK_MIN_MONTHS,
  capMultiplier, discountPctFor, frameworkFor, relDiscount,
} from '../../sim/vendors';
import { G } from './shared';

export const vendorsQueries: Record<string, (...a: any[]) => any> = {
  vendors: () => {
    const g = G();
    return VENDORS.filter((v) => (g.vendorRel?.[v.id] ?? 0) > 0 || (g.frameworks ?? []).some((f) => f.vendorId === v.id))
      .map((v) => {
        const fw = frameworkFor(g, v.id);
        return {
          id: v.id,
          name: v.name,
          rel: g.vendorRel?.[v.id] ?? 0,
          capMult: Math.round(capMultiplier(g, v.id) * 100) / 100,
          relDiscountPct: Math.round(relDiscount(g, v.id) * 1000) / 10,
          framework: fw ? { id: fw.id, commitUSD: fw.commitUSD, spentUSD: fw.spentUSD, discountPct: fw.discountPct, endMonth: fw.endMonth } : null,
        };
      });
  },

  frameworkQuote: (vendorId: string, commitUSD: number, months: number) => {
    const g = G();
    const invalid = (reason: string) => ({ discountPct: 0, depositUSD: 0, valid: false, reason });
    if (!VENDORS.some((v) => v.id === vendorId)) return invalid(`Unknown vendor '${vendorId}'.`);
    if (!Number.isFinite(commitUSD) || commitUSD < FRAMEWORK_MIN_COMMIT_USD) return invalid(`Commit at least $${FRAMEWORK_MIN_COMMIT_USD.toLocaleString('en-US')}.`);
    if (!Number.isInteger(months) || months < FRAMEWORK_MIN_MONTHS || months > FRAMEWORK_MAX_MONTHS)
      return invalid(`Term must be ${FRAMEWORK_MIN_MONTHS}-${FRAMEWORK_MAX_MONTHS} whole months.`);
    if (frameworkFor(g, vendorId)) return invalid('A framework with this vendor is already active.');
    const depositUSD = Math.round(commitUSD * FRAMEWORK_DEPOSIT_PCT);
    if (g.cash < depositUSD) return invalid(`Signing deposit $${depositUSD.toLocaleString('en-US')} exceeds cash on hand.`);
    return { discountPct: discountPctFor(commitUSD, months), depositUSD, valid: true, reason: '' };
  },
};
