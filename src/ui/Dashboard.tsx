import { useGame, selectMonthlyPnL, selectCapexBasis, selectNetWorth } from '../store';
import { MISSIONS } from '../missions';
import { Panel, usd, num, dateOf } from './common';
import World from './World';

const Spark = ({ v, c }: { v: number[]; c: string }) => { if (v.length < 2) return <svg width="100%" height="26" />; const lo = Math.min(...v), hi = Math.max(...v); const pts = v.map((x, i) => `${(i / (v.length - 1)) * 100},${24 - ((x - lo) / Math.max(1e-6, hi - lo)) * 20}`).join(' '); return <svg viewBox="0 0 100 26" width="100%" height="26" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 3px ${c})` }} /></svg>; };

/** Game-style resource plaque: bevelled crate with icon, glowing number and a trend line. */
function Plaque({ icon, label, value, color, trend, sub }: { icon: string; label: string; value: string; color: string; trend: number[]; sub?: string }) {
  return <div className="plaque" style={{ ['--pc' as any]: color }}><div className="pic">{icon}</div><div className="pbody"><small>{label}</small><b>{value}</b><Spark v={trend} c={color} />{sub && <em>{sub}</em>}</div></div>;
}
const STAGES = ['building', 'commissioning', 'clustering', 'assigning', 'done'] as const;
const STAGE_LBL: Record<string, string> = { building: 'Order & build', commissioning: 'Burn-in', clustering: 'Cluster', assigning: 'Assign', done: 'LIVE' };

export default function Dashboard({ go }: { go: (s: string) => void }) {
  const g = useGame(s => s.game);
  const p = selectMonthlyPnL(g);
  const accels = g.clusters.reduce((n, c) => n + (c.stats?.accelerators ?? 0), 0);
  const hist = g.history.slice(-24);
  const next = MISSIONS.filter(m => !g.missionsDone.includes(m.id)).slice(0, 3);
  const projects = (g.projects ?? []).filter(x => x.stage !== 'done' || g.month - x.startMonth < 24).slice(-3);
  return <div className="dash">
    <div className="dmain">
      <World game={g} hall={g.halls[0]} fill />
      <div className="plaques">
        <Plaque icon="💰" label="REVENUE / MO" value={usd(p.revenue)} color="#3ddc97" trend={hist.map(h => h.revenue)} sub={`${g.activeContracts.filter(a => a.clusterIds.length).length} contracts serving`} />
        <Plaque icon="🔥" label="BURN / MO" value={usd(p.opex)} color="#ff7a59" trend={hist.map(h => h.opex)} sub="power · staff · support · interest" />
        <Plaque icon={p.net >= 0 ? '📈' : '📉'} label="NET / MO" value={usd(p.net)} color={p.net >= 0 ? '#4fd1ff' : '#ff5d73'} trend={hist.map(h => h.revenue - h.opex)} sub="after depreciation" />
        <Plaque icon="🏗" label="NET WORTH" value={usd(selectNetWorth(g))} color="#c792ea" trend={hist.map(h => h.cash)} sub={`capex ${usd(selectCapexBasis(g))} · ${num(accels)} GPUs clustered`} />
      </div>
    </div>
    <div className="col">
      {(g.projects ?? []).length > 0 && <Panel title="🟢 Easy-path projects" glow right={<button className="btn sm" onClick={() => useGame.getState().stepEasy()}>Check now</button>}>
        {projects.map(x => { const c = g.availableContracts.find(a => a.id === x.contractId) ?? g.activeContracts.find(a => a.contract.id === x.contractId)?.contract; const at = x.stage === 'failed' ? -1 : STAGES.indexOf(x.stage as any);
          return <div key={x.id} style={{ marginBottom: 10 }}><b style={{ fontSize: 13 }}>{c?.customer ?? 'Contract'} · {x.racks}× build</b>
            <div className="stages">{STAGES.map((s, i) => <span key={s} className={'stg' + (i < at ? ' done' : i === at ? ' now' : '') + (x.stage === 'failed' ? ' bad' : '')}>{STAGE_LBL[s]}</span>)}</div>
            <div className="dim" style={{ fontSize: 11 }}>{x.stage === 'failed' ? '✗ ' : ''}{x.notes[x.notes.length - 1]}</div></div>; })}</Panel>}
      <Panel title="Missions · learn the stack" right={<span className="dim">{g.missionsDone.length}/{MISSIONS.length}</span>}>
        {next.length === 0 && <div className="pos">All missions complete — you run a hyperscaler.</div>}
        {next.map(m => <div className="mission" key={m.id}><div className="chk" /><div style={{ flex: 1 }}><b>{m.title}</b> <span className="tag">+{usd(m.reward)}</span><div className="dim" style={{ fontSize: 12 }}>{m.hint}</div></div><button className="btn sm" onClick={() => go(m.go)}>Go →</button></div>)}</Panel>
      <Panel title="Customers">{g.activeContracts.length === 0 ? <span className="dim">None yet — open Customers.</span> : g.activeContracts.map(a => <div key={a.contract.id} style={{ marginBottom: 6 }}><span className="tag">{a.contract.kind}</span><b>{a.contract.customer}</b> · {a.contract.model.name}<div className="dim" style={{ fontSize: 11 }}>{a.clusterIds.length ? `${a.monthsServed}/${a.contract.durationMonths} mo · SLA misses ${a.slaMisses}` : `awaiting deployment (by ${dateOf(a.deployBy ?? a.startMonth + 4)})`}</div></div>)}</Panel>
      <Panel title="Log"><div>{[...g.log].reverse().slice(0, 40).map((l, i) => <div key={i} className={l.level === 'good' ? 'pos' : l.level === 'bad' ? 'neg' : 'dim'} style={{ fontSize: 12, marginBottom: 3 }}>{dateOf(l.month)} — {l.text}</div>)}</div></Panel>
    </div></div>;
}
