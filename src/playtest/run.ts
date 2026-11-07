// Playtest driver: plays a full campaign with a persona, checks invariants every month, samples a timeline,
// verifies save/load round-trips and determinism, and flags gameplay anomalies.
import * as E from '../env/env';
import { SCENARIOS } from '../env/scenarios';
import { advanceMonth } from '../sim/tick';
import { migrate } from '../engine/persistence';
import { selectNetWorth } from '../store';
import { PERSONAS } from './personas';
import { check, type Violation } from './invariants';
import { fleetOf } from '../engine/needs';
import { rackAccels } from '../sim/systems/helpers';
import { staffNeeded } from '../sim/staffing';
import type { GameState } from '../types';

export interface Sample { installed: number; util: number; month: number; cash: number; debt: number; netWorth: number; accels: number; racks: number; contracts: number; offers: number; staff: number; rep: number; revenue: number; priceIndex: number }
export interface Report {
  persona: string; seed: number; scenario: string; months: number; status: string; endMonth: number; netWorth: number; score: number; rating: string;
  violations: Violation[]; anomalies: string[]; timeline: Sample[]; tickMsMax: number; tickMsAvg: number; actionsOk: number; actionsFailed: number; failedByName: Record<string, number>;
  stateKB: number; hash: string; contractsCompleted: number; peakAccels: number; peakInstalled: number; avgUtil: number; slaMisses: number;
}

const installedOf = (g: GameState): number => g.halls.reduce((n, h) => n + h.racks.filter((r) => r.status === 'online').reduce((m, r) => m + rackAccels(g, r.designId), 0), 0);
const sample = (g: GameState): Sample => ({
  installed: installedOf(g), util: Math.round(fleetOf(g).utilization * 100),
  month: g.month, cash: Math.round(g.cash), debt: Math.round(g.debt), netWorth: Math.round(selectNetWorth(g)),
  accels: g.clusters.reduce((n, c) => n + (c.stats?.accelerators ?? 0), 0), racks: g.halls.reduce((n, h) => n + h.racks.length, 0),
  contracts: g.activeContracts.length, offers: g.availableContracts.length, staff: g.staff, rep: Math.round(g.reputation),
  revenue: Math.round(g.history[g.history.length - 1]?.revenue ?? 0), priceIndex: Math.round((g.marketPriceIndex ?? 1) * 100) / 100,
});

export function play(persona: string, seed: number, months: number, scenarioId?: string): Report {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  const agent = PERSONAS[persona](seed);
  let obs = E.reset({ seed, scenario });
  const violations: Violation[] = []; const anomalies: string[] = []; const timeline: Sample[] = [];
  const failedByName: Record<string, number> = {}; let actionsOk = 0, actionsFailed = 0, tickMax = 0, tickSum = 0, ticks = 0;
  let peakInstalled = 0, utilSum = 0, utilN = 0, lowUtilRun = 0, shortStaffRun = 0; const revHist: number[] = []; let cliffFlagged = false, lowUtilFlagged = false, shortFlagged = false;
  let prevMonth = E.state().month; let prevNW = selectNetWorth(E.state()); let idleCashMonths = 0; let saveChecked = false;
  const start = prevMonth;
  for (let m = 0; m < months; m++) {
    for (const a of agent(obs, () => E.legalActions())) {
      const t0 = performance.now(); const r = E.step(a); const dt = performance.now() - t0; obs = r.obs;
      if (a.name === 'nextMonth') { tickMax = Math.max(tickMax, dt); tickSum += dt; ticks++; }
      if (r.info.ok) actionsOk++; else { actionsFailed++; failedByName[a.name] = (failedByName[a.name] ?? 0) + 1; }
      if (r.done) break;
    }
    const g = E.state();
    for (const v of check(g, prevMonth)) if (!violations.some((x) => x.rule === v.rule)) violations.push(v);
    prevMonth = g.month;
    peakInstalled = Math.max(peakInstalled, installedOf(g));
    { const f = fleetOf(g); if (f.clustered > 0) { utilSum += f.utilization; utilN++; }
      lowUtilRun = f.clustered >= 32 && f.utilization < 0.7 ? lowUtilRun + 1 : 0;
      if (lowUtilRun === 6 && !lowUtilFlagged) { lowUtilFlagged = true; anomalies.push(`month ${g.month}: more than 30% of clustered GPUs idle for 6 months in a row`); }
      shortStaffRun = g.staff < staffNeeded(g).needed ? shortStaffRun + 1 : 0;
      if (shortStaffRun === 12 && !shortFlagged) { shortFlagged = true; anomalies.push(`month ${g.month}: understaffed for 12 months in a row (${g.staff}/${staffNeeded(g).needed})`); }
      const rev = g.history[g.history.length - 1]?.revenue ?? 0; revHist.push(rev);
      if (revHist.length > 6 && !cliffFlagged) { const before = Math.max(...revHist.slice(-7, -1)); if (before >= 500_000 && rev < before * 0.2) { cliffFlagged = true; anomalies.push(`month ${g.month}: revenue fell ${Math.round((1 - rev / before) * 100)}% in under 6 months ($${(before / 1e6).toFixed(1)}M -> $${(rev / 1e6).toFixed(2)}M/mo)`); } }
    }
    if ((g.month - start) % 6 === 0) timeline.push(sample(g));
    // anomalies: unexplained net-worth cliffs, idle riches
    const nw = selectNetWorth(g);
    if (prevNW > 20e6 && nw < prevNW * 0.6 && !(g.log.slice(-25).some((l) => /Ordered|Bought|Installed|commission|floor|expan|framework|loan/i.test(l.text)))) anomalies.push(`month ${g.month}: net worth fell ${Math.round((1 - nw / prevNW) * 100)}% ($${Math.round(prevNW / 1e6)}M → $${Math.round(nw / 1e6)}M) with no purchase in the log`);
    prevNW = nw;
    idleCashMonths = g.cash > 80e6 && g.orders.length === 0 && !(g.projects ?? []).some((p) => p.stage !== 'done' && p.stage !== 'failed') ? idleCashMonths + 1 : 0;
    if (idleCashMonths === 18) anomalies.push(`month ${g.month}: sitting on >$80M for 18 months with nothing to spend it on (no order or project in flight)`);
    if (!saveChecked && g.month - start >= 24 && g.status === 'playing') {
      saveChecked = true;
      const copy = JSON.parse(JSON.stringify(g)) as GameState; const err = migrate(copy);
      if (err) violations.push({ month: g.month, rule: 'save migrate failed', detail: err });
      else if (E.hashState(advanceMonth(copy)) !== E.hashState(advanceMonth(g))) violations.push({ month: g.month, rule: 'save/load changes the future', detail: 'advanceMonth(loaded) != advanceMonth(original)' });
    }
    if (g.status && g.status !== 'playing') break;
  }
  const g = E.state(); const er = g.endReport;
  return {
    persona, seed, scenario: scenarioId ?? 'classic', months, status: g.status ?? 'playing', endMonth: g.month, netWorth: Math.round(selectNetWorth(g)), score: er?.score ?? 0, rating: er?.rating ?? '',
    violations, anomalies, timeline, tickMsMax: Math.round(tickMax), tickMsAvg: ticks ? Math.round((tickSum / ticks) * 10) / 10 : 0, actionsOk, actionsFailed, failedByName,
    stateKB: Math.round(JSON.stringify(g).length / 1024), hash: E.hash(), peakInstalled, avgUtil: utilN ? Math.round((utilSum / utilN) * 100) : 0, contractsCompleted: g.stats?.contractsCompleted ?? 0, peakAccels: g.stats?.peakAccels ?? 0, slaMisses: g.stats?.slaMisses ?? 0,
  };
}

export function toMarkdown(reports: Report[]): string {
  const L: string[] = ['# Playtest report', '', '| persona | seed | scenario | end | status | net worth | score | contracts done | peak GPUs (clustered) | peak GPUs (installed) | avg util % | SLA misses | tick avg/max ms | state KB | violations | anomalies |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const r of reports) L.push(`| ${r.persona} | ${r.seed} | ${r.scenario} | ${r.endMonth} | ${r.status}${r.rating ? ' / ' + r.rating : ''} | $${(r.netWorth / 1e6).toFixed(1)}M | ${r.score} | ${r.contractsCompleted} | ${r.peakAccels} | ${r.peakInstalled} | ${r.avgUtil} | ${r.slaMisses} | ${r.tickMsAvg}/${r.tickMsMax} | ${r.stateKB} | ${r.violations.length} | ${r.anomalies.length} |`);
  for (const r of reports) {
    if (!r.violations.length && !r.anomalies.length && !Object.keys(r.failedByName).length) continue;
    L.push('', `## ${r.persona} seed ${r.seed} (${r.scenario})`);
    for (const v of r.violations) L.push(`- **VIOLATION** month ${v.month}: ${v.rule} — ${v.detail}`);
    for (const a of r.anomalies) L.push(`- anomaly: ${a}`);
    const f = Object.entries(r.failedByName).sort((a, b) => b[1] - a[1]).slice(0, 6); if (f.length) L.push(`- most-failed actions: ${f.map(([k, n]) => `${k}×${n}`).join(', ')}`);
  }
  L.push('', '## Timelines (every 6 months)');
  for (const r of reports) { L.push('', `### ${r.persona} seed ${r.seed} (${r.scenario})`, '| month | cash $M | debt $M | net worth $M | clustered GPUs | installed GPUs | util % | racks | contracts | offers | staff | rep | rev $M | price idx |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const s of r.timeline) L.push(`| ${s.month} | ${(s.cash / 1e6).toFixed(1)} | ${(s.debt / 1e6).toFixed(1)} | ${(s.netWorth / 1e6).toFixed(1)} | ${s.accels} | ${s.installed} | ${s.util} | ${s.racks} | ${s.contracts} | ${s.offers} | ${s.staff} | ${s.rep} | ${(s.revenue / 1e6).toFixed(2)} | ${s.priceIndex} |`); }
  return L.join('\n') + '\n';
}
