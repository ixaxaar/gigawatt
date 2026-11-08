import { getItem } from '../../data';
import type { Cluster, ClusterStats } from '../../types';
import { cableClass } from '../network';
import { staffEffect } from '../staffing';
import { mulberry32 } from '../rng';
import type { System } from './types';

/** Monthly failure probability per link (gameplay-scaled): optics flap and get dirty most, DACs almost never. */
export const LINK_RATE: Record<string, number> = { optic: 0.0006, aoc: 0.0002, dac: 0.00004, other: 0.0001 };
/** Months to get a replacement when none is on the shelf. */
export const LINK_RMA_MONTHS = 3;

const classOf = (id: string): string => { const c: any = getItem(id); return c && c.kind === 'cable' ? cableClass(c) : 'other'; };

/** Expected link failures per month for a cluster, and the cable that fails most often. */
export function linkRisk(stats: ClusterStats): { lambda: number; total: number; worst: string } {
  let lambda = 0; let total = 0; let worst = ''; let worstL = -1;
  for (const [id, n] of Object.entries(stats.cableCounts)) {
    const l = n * (LINK_RATE[classOf(id)] ?? 0.0001);
    lambda += l; total += n;
    if (l > worstL) { worstL = l; worst = id; }
  }
  return { lambda, total, worst };
}

/** Bandwidth share lost while links are down: a collective is only as fast as its slowest rail, so each dead link costs more than its own share. */
export const linkLoss = (down: number, total: number): number => (down <= 0 || total <= 0 ? 0 : Math.min(0.5, 0.01 * down + 3 * (down / total)));

/** Apply a cluster's current link faults to freshly evaluated stats. */
export function applyLinkFaults(cl: Cluster, stats: ClusterStats): ClusterStats {
  const f = cl.linkFaults;
  if (!f || f.down <= 0) return stats;
  const loss = linkLoss(f.down, f.total);
  const name = getItem(f.cableId)?.name ?? 'link';
  return {
    ...stats, linkLoss: loss, effScaleOutGBs: Math.round(stats.effScaleOutGBs * (1 - loss) * 1000) / 1000,
    issues: [...stats.issues, { severity: 'warn', code: 'links-down', message: `${f.down} ${name} link${f.down === 1 ? ' is' : 's are'} down; scale-out bandwidth is ${(loss * 100).toFixed(1)}% lower until month ${f.fixMonth}.`, learn: 'cables' }],
  };
}

const poisson = (lambda: number, rng: () => number): number => {
  if (lambda <= 0) return 0;
  if (lambda > 30) { const u = Math.max(rng(), 1e-9); const v = rng(); return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v))); }
  const L = Math.exp(-lambda); let k = 0; let p = 1;
  do { k += 1; p *= rng(); } while (p > L);
  return k - 1;
};

/** Links flap and die. A cluster with optics at scale loses a few every month; spare cables and optics on the shelf turn it into a one-month blip. */
export const linkFaults: System = {
  id: 'link-faults',
  run: (c) => {
    const { s, log } = c;
    const mult = staffEffect(s).failureMult;
    for (const cl of s.clusters) {
      const st = cl.stats;
      if (cl.linkFaults && s.month >= cl.linkFaults.fixMonth) {
        log('good', `🔗 ${cl.name}: ${cl.linkFaults.down} failed link${cl.linkFaults.down === 1 ? '' : 's'} replaced, full bandwidth restored.`);
        cl.linkFaults = undefined;
      }
      if (!st || st.accelerators <= 0 || cl.linkFaults) continue;
      const risk = linkRisk(st);
      // own stream, so the main tick's draws (and every golden trajectory) are untouched
      let h = 2166136261; for (const ch of cl.id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
      const rng = mulberry32((s.seed ^ Math.imul(s.month + 7, 0x85ebca6b) ^ h) >>> 0);
      const n = poisson(risk.lambda * mult, rng);
      if (n <= 0) continue;
      const have = s.spareStock?.[risk.worst] ?? 0;
      const used = Math.min(have, n);
      const fromSpares = used >= n;
      if (used > 0) s.spareStock![risk.worst] = have - used;
      const name = getItem(risk.worst)?.name ?? 'link';
      cl.linkFaults = { down: n, total: risk.total, cableId: risk.worst, fixMonth: s.month + (fromSpares ? 1 : LINK_RMA_MONTHS), fromSpares };
      log(fromSpares ? 'info' : 'bad', `🔗 ${cl.name}: ${n} ${name} link${n === 1 ? '' : 's'} went down (${(linkLoss(n, risk.total) * 100).toFixed(1)}% of scale-out bandwidth lost). ${fromSpares ? 'Swapping from your spares; fixed next month.' : `No spares on the shelf: replacements arrive in month ${cl.linkFaults.fixMonth}. Keep spare cables and optics in the warehouse.`}`);
    }
    c.refreshStats();
  },
};
