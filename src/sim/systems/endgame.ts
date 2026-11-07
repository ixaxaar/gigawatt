import type { EndReport, EndingId, GameState } from '../../types';
import { assetValue } from '../lifecycle';
import type { System, TickCtx } from './types';

/** The campaign runs Dec 2020 -> Dec 2028 (month 107 is the last played month). */
export const HORIZON_MONTH = 108;
export const BANKRUPT_AFTER_MONTHS = 3;

export const netWorthOf = (g: GameState): number => g.cash - g.debt + assetValue(g);

const RATINGS: [number, string][] = [
  [6e8, 'AI Datacenter Tycoon'], [2.5e8, 'Hyperscale contender'], [1e8, 'Solid operator'], [6e7, 'Steady operator'], [0, 'Struggling operator'],
];
export const ratingFor = (netWorth: number): string => (RATINGS.find(([min]) => netWorth >= min) ?? [0, 'Bankrupt'])[1];

/** score: what the end screen and leaderboards rank. Net worth dominates; reliability and scale add. */
export const scoreOf = (g: GameState, netWorth: number): number =>
  Math.round(netWorth / 1e5 + (g.reputation ?? 0) * 5 + (g.stats?.contractsCompleted ?? 0) * 20 + (g.stats?.peakAccels ?? 0) / 50);

/** How the story ends: decided by where the company stands, not just net worth. */
export function endingFor(g: GameState, reason: EndReport['reason'], nw: number): { ending: EndingId; rating: string; epilogue: string } {
  if (reason === 'bankrupt') return { ending: 'bankrupt', rating: 'Bankrupt', epilogue: 'The receivers auction the racks by the pallet. A hyperscaler buys the lot for cents on the dollar, and a rival hires your night shift.' };
  if (reason === 'fired') return { ending: 'fired', rating: 'Fired by the board', epilogue: 'Margaux Vance thanks you for your service. Security carries your box to the car. The board brings in an operator who has actually read the plan.' };
  const rating = ratingFor(nw); const rep = g.reputation ?? 0;
  if (nw >= 2.5e8 && rep >= 60) return { ending: 'ipo', rating, epilogue: 'You ring the opening bell. The ticker is GIGW, the float is oversubscribed twelve times, and Dev Okonkwo cries on live television. Your hall is now a line item in every index fund.' };
  if (nw >= 1e8) return { ending: 'acquired', rating, epilogue: 'A hyperscaler buys the company for its power contracts and its crew. You get a seat on a very large board and a retention bonus that is mostly stock.' };
  if (nw >= 6e7) return { ending: 'steady', rating, epilogue: 'You never became a legend, but the halls hum, the customers renew and the lights stay on. Ilse Brandt calls it the best-run small operator she audited.' };
  return { ending: 'fire-sale', rating, epilogue: 'You sell the racks to a competitor, honour the last contracts and keep the name. It was a long eight years, and the GPUs were never cheap.' };
}

export function finish(c: TickCtx, reason: EndReport['reason']): void {
  const { s, log } = c;
  const nw = netWorthOf(s);
  const stats = s.stats!;
  const end = endingFor(s, reason, nw);
  const rating = end.rating;
  const summary = reason === 'bankrupt'
    ? `Creditors closed you down in month ${s.month}: cash stayed negative for ${BANKRUPT_AFTER_MONTHS} months.`
    : reason === 'fired'
      ? `The board removed you in month ${s.month} after three missed yearly reviews in a row.`
      : `You reached the end of 2028 with net worth $${Math.round(nw / 1e6)}M, ${stats.contractsCompleted} contracts completed and a peak of ${stats.peakAccels} accelerators.`;
  s.status = reason === 'bankrupt' ? 'bankrupt' : reason === 'fired' ? 'fired' : 'finished';
  s.endReport = { reason, ending: end.ending, epilogue: end.epilogue, month: s.month, score: Math.round(scoreOf(s, nw) * (reason === 'fired' ? 0.3 : reason === 'bankrupt' ? 0.5 : 1)), netWorth: Math.round(nw), rating, revenueTotal: Math.round(stats.revenueTotal), peakAccels: stats.peakAccels, contractsCompleted: stats.contractsCompleted, reputation: s.reputation, summary };
  log(reason === 'horizon' ? 'good' : 'bad', `${reason === 'bankrupt' ? 'GAME OVER' : reason === 'fired' ? 'FIRED' : '2028 COMPLETE'} - ${rating}. ${summary}`);
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
    if (s.status && s.status !== 'playing') return; // the board already ended the game this month

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
