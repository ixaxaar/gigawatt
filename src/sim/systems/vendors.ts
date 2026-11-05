import {
  FRAMEWORK_EXPIRY_PENALTY_PCT, FRAMEWORK_EXPIRY_REL_BONUS, FRAMEWORK_EXPIRY_REL_HIT,
  REL_DECAY_PER_MONTH, adjustRel,
} from '../vendors';
import type { System } from './types';

/** Frameworks settle at expiry (take-or-pay) and relationships decay without spend. No RNG. */
export const vendorsSystem: System = {
  id: 'vendors',
  run: ({ s, log }) => {
    const expired = (s.frameworks ?? []).filter((f) => f.endMonth < s.month);
    s.frameworks = (s.frameworks ?? []).filter((f) => f.endMonth >= s.month);
    for (const fw of expired) {
      const unmet = fw.commitUSD - fw.spentUSD;
      if (unmet > 0) {
        const penalty = Math.round(unmet * FRAMEWORK_EXPIRY_PENALTY_PCT);
        s.cash -= penalty;
        adjustRel(s, fw.vendorId, FRAMEWORK_EXPIRY_REL_HIT);
        log('bad', `${fw.vendorId} framework expired with $${Math.round(unmet).toLocaleString('en-US')} of the commitment unmet: $${penalty.toLocaleString('en-US')} take-or-pay penalty and the relationship soured. Size commitments to what you will actually buy.`);
      } else {
        adjustRel(s, fw.vendorId, FRAMEWORK_EXPIRY_REL_BONUS);
        log('good', `${fw.vendorId} framework closed out in full — the account team now takes your calls first.`);
      }
    }
    for (const [vendorId, rel] of Object.entries(s.vendorRel ?? {}))
      s.vendorRel![vendorId] = Math.max(0, rel - REL_DECAY_PER_MONTH);
  },
};
