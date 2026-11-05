import type { EndReport, GameState } from '../../types';
import { assetValue } from '../lifecycle';
import type { System, TickCtx } from './types';

/** The campaign runs Dec 2020 -> Dec 2028 (month 107 is the last played month). */
export const HORIZON_MONTH = 108;
export const BANKRUPT_AFTER_MONTHS = 3;

export const netWorthOf = (g: GameState): number => g.cash - g.debt + assetValue(g);

const RATINGS: [number, string][] = [
  [1e9, 'AI Datacenter Tycoon'], [3e8, 'Hyperscale contender'], [1.2e8, 'Solid operator'], [5e7, 'Stalled operator'], [0, 'Struggling operator'],
];
export const ratingFor = (netWorth: number): string => (RATINGS.find(([min]) => netWorth >= min) ?? [0, 'Bankrupt'])[1];

/** score: what the end screen and leaderboards rank. Net worth dominates; reliability and scale add. */
export const scoreOf = (g: GameState, netWorth: number): number =>
  Math.round(netWorth / 1e5 + (g.reputation ?? 0) * 5 + (g.stats?.contractsCompleted ?? 0) * 20 + (g.stats?.peakAccels ?? 0) / 50);

function finish(c: TickCtx, reason: EndReport['reason']): void {
  const { s, log } = c;
  const nw = netWorthOf(s);
  const stats = s.stats!;
  const rating = reason === 'bankrupt' ? 'Bankrupt' : ratingFor(nw);
  const summary = reason === 'bankrupt'
    ? `Creditors closed you down in month ${s.month}: cash stayed negative for ${BANKRUPT_AFTER_MONTHS} months.`
    : `You reached the end of 2028 with net worth $${Math.round(nw / 1e6)}M, ${stats.contractsCompleted} contracts completed and a peak of ${stats.peakAccels} accelerators.`;
  s.status = reason === 'bankrupt' ? 'bankrupt' : 'finished';
  s.endReport = { reason, month: s.month, score: scoreOf(s, nw), netWorth: Math.round(nw), rating, revenueTotal: Math.round(stats.revenueTotal), peakAccels: stats.peakAccels, contractsCompleted: stats.contractsCompleted, reputation: s.reputation, summary };
  log(reason === 'bankrupt' ? 'bad' : 'good', `${reason === 'bankrupt' ? 'GAME OVER' : '2028 COMPLETE'} - ${rating}. ${summary}`);
}

/** Last system of the month: lifetime stats, bankruptcy watch, the 2028 horizon. */
export const endgame: System = {
  id: 'endgame',
  run: (c) => {
    const { s, log } = c;
    s.stats ??= { contractsCompleted: 0, peakAccels: 0, slaMisses: 0, revenueTotal: 0, decommissioned: 0 };
    s.stats.revenueTotal += c.revenue;
    const accels = s.clusters.reduce((n, cl) => n + (cl.stats?.accelerators ?? 0), 0);
    s.stats.peakAccels = Math.max(s.stats.peakAccels, accels);

    if (s.cash < 0) {
      s.negCashMonths = (s.negCashMonths ?? 0) + 1;
      if (s.mode !== 'learner') {
        if (s.negCashMonths >= BANKRUPT_AFTER_MONTHS) return finish(c, 'bankrupt');
        log('bad', `Cash is negative (${s.negCashMonths}/${BANKRUPT_AFTER_MONTHS} months). Creditors close you down at ${BANKRUPT_AFTER_MONTHS}. Take a loan, land contracts, sell idle hardware.`);
      }
    } else s.negCashMonths = 0;

    if (s.month >= HORIZON_MONTH) finish(c, 'horizon');
  },
};
