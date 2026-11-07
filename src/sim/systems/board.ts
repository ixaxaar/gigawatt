import { netWorthOf } from './endgame';
import { finish } from './endgame';
import type { System } from './types';

/** The investor board. Each year from the second anniversary on it reviews the trailing 3-month revenue against a
 *  target sized to the starting capital. Three missed reviews in a row end the game (Learner mode only warns). */
export const BOARD_MEMBERS = [
  { name: 'Margaux Vance', role: 'Chair', wants: 'growth' },
  { name: 'Dev Okonkwo', role: 'Finance', wants: 'margin' },
  { name: 'Ilse Brandt', role: 'Risk', wants: 'uptime' },
] as const;

/** Required monthly revenue as a fraction of the starting net worth, for reviews in year 2, 3, ... 8. */
export const BOARD_TARGETS = [0.001, 0.004, 0.008, 0.011, 0.013, 0.015, 0.017];

export const BOARD_STRIKES = 3;
/** Reviews after the sixth anniversary are advisory: the board does not fire a CEO in the last two years of the plan. */
export const BOARD_LAST_FIRING_REVIEW = 6;

export const boardTarget = (baseNW: number, k: number): number => Math.round(baseNW * BOARD_TARGETS[Math.max(0, Math.min(BOARD_TARGETS.length - 1, k - 2))]);
/** Scenarios that start late in the campaign get their first review after one year, so the board cannot be outlasted by doing nothing. */
export const firstReviewYear = (startMonth: number): number => (startMonth >= 36 ? 1 : 2);

export const board: System = {
  id: 'board',
  run: (c) => {
    const { s, log } = c;
    if (!s.board) s.board = { baseNW: Math.max(1e6, netWorthOf(s)), startMonth: s.month, strikes: 0, reviews: [] };
    const b = s.board;
    const k = Math.round((s.month - b.startMonth) / 12);
    if (k < firstReviewYear(b.startMonth) || (s.month - b.startMonth) % 12 !== 0) return;
    const hist = s.history.slice(-3);
    const actual = hist.length ? hist.reduce((n, h) => n + h.revenue, 0) / hist.length : 0;
    const target = boardTarget(b.baseNW, k);
    const prev = b.reviews.length ? b.reviews[b.reviews.length - 1].actual : 0;
    // Operator mode forgives a company that is clearly growing: at least 40% of the target and 25% up on last year's review
    const growing = s.mode === 'operator' && actual >= target * 0.4 && prev > 0 && actual >= prev * 1.25;
    const ok = actual >= target || growing;
    b.reviews.push({ month: s.month, target, actual: Math.round(actual), ok });
    const usd = (x: number) => (x >= 1e6 ? `$${(x / 1e6).toFixed(1)}M` : `$${Math.round(x / 1e3)}k`);
    if (ok) {
      b.strikes = 0;
      log('good', `Board review: revenue run-rate ${usd(actual)}/mo against a ${usd(target)} target${actual < target ? ' (growing fast enough to pass)' : ''}. Margaux Vance: "Keep going." Dev Okonkwo nods at the margins. Next year's target: ${usd(boardTarget(b.baseNW, k + 1))}/mo.`);
    } else {
      b.strikes += 1;
      log('bad', `Board review: revenue run-rate ${usd(actual)}/mo is under the ${usd(target)} target (strike ${b.strikes} of ${BOARD_STRIKES}; next year's target is ${usd(boardTarget(b.baseNW, k + 1))}/mo). Margaux Vance: "We funded a datacenter, not a savings account."${s.mode === 'learner' ? ' (Learner mode: no consequences.)' : ''}`);
      if (b.strikes >= BOARD_STRIKES && s.mode !== 'learner' && k <= BOARD_LAST_FIRING_REVIEW) finish(c, 'fired');
    }
  },
};
