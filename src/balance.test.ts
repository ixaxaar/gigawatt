const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
import { it, expect } from 'vitest';
import { useGame, selectNetWorth } from './store';
import { buildOptions } from './contractfit';

/** A reasonable bot player using the Easy path: sign the best-payback offer it can afford and build it. */
export function playBot(seed: number, months: number, verbose = false) {
  useGame.getState().newGame(seed, 'learner');
  const rows: string[] = [];
  for (let i = 0; i < months; i++) {
    const st = useGame.getState(); const g = st.game;
    const busy = (g.projects ?? []).some(p => p.stage !== 'done' && p.stage !== 'failed');
    if (!busy) {
      let best: { cid: string; tid: string; racks: number; pay: number } | null = null;
      for (const c of g.availableContracts) for (const o of buildOptions(g, c)) {
        if (o.hallGaps.length > 3 || o.slack < 1 || o.cost > g.cash * 0.6) continue;
        if (!best || o.paybackMo < best.pay) best = { cid: c.id, tid: o.t.id, racks: o.racks, pay: o.paybackMo };
      }
      if (best) st.startEasy(best.cid, best.tid, best.racks);
    }
    for (const hh of useGame.getState().game.halls) for (const r of hh.racks) if (r.status === 'online') useGame.getState().setSpotRack(r.id, true);
    useGame.getState().nextMonth();
    const h = useGame.getState().game.history.slice(-1)[0];
    if (verbose && (i + 1) % 6 === 0 && h) rows.push(`m${i + 1}: cash ${(h.cash / 1e6).toFixed(1)}M rev ${(h.revenue / 1e3).toFixed(0)}k opex ${(h.opex / 1e3).toFixed(0)}k contracts ${useGame.getState().game.activeContracts.length} proj ${(useGame.getState().game.projects ?? []).map(p => p.stage[0]).join('')}`);
  }
  const g = useGame.getState().game;
  return { g, rows };
}

it('bot economics across seeds', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) { const { g } = playBot(seed, 48); const last = g.history.slice(-1)[0]; const rev = g.history.slice(-12).reduce((n, h) => n + h.revenue, 0); console.log(`seed ${seed}: NW ${(selectNetWorth(g) / 1e6).toFixed(1)}M cash ${(g.cash / 1e6).toFixed(1)}M  last-12m revenue ${(rev / 1e6).toFixed(2)}M  contracts ${g.activeContracts.length} done ${(g.projects ?? []).filter(p => p.stage === 'done').length}/${(g.projects ?? []).length} rep ${g.reputation.toFixed(0)}`); void last; }
});
it('bot can progress through the easy path', () => {
  const { g, rows } = playBot(3, 36, true);
  console.log(rows.join('\n'));
  console.log((g.projects ?? []).map(p => `${p.stage} ${p.templateId} x${p.racks} ${p.contractId}\n   ` + p.notes.join('\n   ')).join('\n'));
  expect(g.history.length).toBe(36);
  expect((g.projects ?? []).some(p => p.stage === 'done')).toBe(true);
});
