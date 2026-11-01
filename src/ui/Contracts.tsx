import { useState } from 'react';
import type { ActiveContract, Contract } from '../types';
import { useGame } from '../store';
import { buildOptions, contractFit, pipeline } from '../contractfit';
import { Panel, usd, num, dateOf } from './common';
import Tip from './Tip';

const VERDICT = {
  ready: { c: 'pos', t: '✓ CAN SERVE NOW', d: 'A cluster you own already meets every requirement.' },
  building: { c: 'warn', t: '◔ CAN BUILD IN TIME', d: 'Not yet, but the hardware you own/ordered could get there.' },
  short: { c: 'neg', t: '✗ NEED MORE / DIFFERENT HARDWARE', d: 'Your current plan cannot meet this.' },
  none: { c: 'neg', t: '✗ NO CLUSTER YET', d: '' },
} as const;

function Needs({ c, go, onMsg, signedAt }: { c: Contract; go: (s: string) => void; onMsg: (m: string) => void; signedAt?: number }) {
  const g = useGame(s => s.game);
  const opts = buildOptions(g, c, signedAt);
  if (!opts.length) return <div className="warn" style={{ fontSize: 12 }}>No purchasable platform on the market today can meet this (hardware not shipped yet or too big). Wait for newer GPUs or skip it.</div>;
  return <div className="needs"><div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>🛒 What you need to buy</div>
    {opts.map(o => { const afford = o.cost <= g.cash; return <div key={o.t.id} className="needopt">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}><b>{o.racks} × {o.t.name}</b><span className="dim" style={{ fontSize: 11 }}>{o.t.tier === 'diy' ? 'DIY' : o.t.integrator}</span>{o.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
      <table style={{ fontSize: 11 }}><tbody>{o.cover.map(x => <tr key={x.label}><td className={x.ok ? 'pos' : 'neg'}>{x.ok ? '✓' : '✗'}</td><td>{x.label}</td><td className="mono dim">need {x.need}</td><td className="mono">{x.have}</td></tr>)}</tbody></table>
      <div className="mono" style={{ fontSize: 12 }}>{usd(o.cost)} · parts+install ready ≈ {dateOf(o.readyMonth)} <span className={o.fitsRamp ? 'pos' : 'neg'}>({o.fitsRamp ? `${o.slack} mo spare` : `${-o.slack} mo too late`})</span></div>
      <div className="dim" style={{ fontSize: 11 }}>{Number.isFinite(o.paybackMo) ? `Earns ≈ ${usd(o.revenueMo)}/mo, power ≈ ${usd(o.powerMo)}/mo → pays back in ${o.paybackMo.toFixed(0)} months` : 'Does not pay back at this price'}</div>
      {o.hallGaps.length > 0 && <div className="warn" style={{ fontSize: 11 }}>Your hall also needs: {o.hallGaps.join(' · ')} <a style={{ cursor: 'pointer' }} onClick={() => go('facility')}>→ Build</a></div>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn sm go" disabled={!afford} title="Signs the contract (if needed), orders the rack bundle AND any power/cooling plant, then installs, deploys, clusters and assigns automatically as parts arrive." onClick={() => onMsg(useGame.getState().startEasy(c.id, o.t.id, o.racks).message)}>{afford ? '🟢 EASY PATH — do it all for me' : 'Need more cash — take a loan'}</button>
        <button className="btn sm" disabled={!afford} onClick={() => onMsg(useGame.getState().buyTemplate(o.t.id, o.racks).message)}>Just order the racks (I’ll do the rest)</button></div></div>; })}
    <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>Easy path = the game signs, buys, installs plant, deploys racks, builds the fabric and assigns the contract for you as parts arrive (watch Projects on the Datacenter screen). After a manual order: wait for delivery → Warehouse ▸ Deploy racks → wait for commissioning → Network ▸ build a cluster → come back here and assign it.</div></div>;
}

function RackAssign({ contractId, onMsg }: { contractId: string; onMsg: (m: string) => void }) {
  const g = useGame(s => s.game);
  const [sel, setSel] = useState<string[]>([]);
  const free = g.halls.flatMap(h => h.racks).filter(r => r.status === 'online' && !r.clusterId);
  if (!free.length) return null;
  return <div style={{ margin: '6px 0', padding: 6, border: '1px dashed var(--bd)', borderRadius: 8 }}><div style={{ fontSize: 12, fontWeight: 700 }}>Serve straight from racks (no clustering step)</div>
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', margin: '4px 0' }}>{free.map(r => <button key={r.id} className={'btn sm' + (sel.includes(r.id) ? ' pri' : '')} onClick={() => setSel(sel.includes(r.id) ? sel.filter(x => x !== r.id) : [...sel, r.id])}>{g.racks.find(d => d.id === r.designId)?.name.slice(0, 18)} · {r.id.slice(3, 9)}</button>)}<button className="btn sm" onClick={() => setSel(free.map(r => r.id))}>all</button></div>
    <button className="btn sm go" disabled={!sel.length} onClick={() => onMsg(useGame.getState().assignRacks(contractId, sel).message)}>SERVE FROM {sel.length || ''} RACK{sel.length === 1 ? '' : 'S'}</button></div>;
}

export default function Contracts({ go }: { go: (s: string) => void }) {
  const g = useGame(s => s.game);
  const [msg, setMsg] = useState('');
  const [pick, setPick] = useState<Record<string, string[]>>({});
  const st = useGame.getState();
  const p = pipeline(g);
  const chosen = (id: string, fallback?: string) => pick[id] ?? (fallback ? [fallback] : []);
  const toggle = (id: string, cl: string, base: string[]) => { const cur = base; setPick({ ...pick, [id]: cur.includes(cl) ? cur.filter(x => x !== cl) : [...cur, cl] }); };

  const checks = (c: Contract) => { const f = contractFit(g, c); return { f, el: <>
    <div className={VERDICT[f.verdict].c} style={{ fontWeight: 700, fontSize: 12 }}>{VERDICT[f.verdict].t}</div>
    {f.best && <table style={{ fontSize: 12, margin: '4px 0' }}><tbody>{f.best.checks.map(x => <tr key={x.label}><td className={x.ok ? 'pos' : 'neg'}>{x.ok ? '✓' : '✗'}</td><td>{x.label}</td><td className="mono dim">need {x.need}</td><td className="mono">have {x.have}</td></tr>)}</tbody></table>}
    {f.best && <div className="dim" style={{ fontSize: 11 }}>vs best cluster: {f.best.cluster.name}</div>}
    {f.shortfall && <div className="warn" style={{ fontSize: 12 }}>{f.shortfall}</div>}
    {f.verdict !== 'ready' && <div className="dim" style={{ fontSize: 11 }}>Pipeline not yet clustered: {num(p.freeOnline)} online · {num(p.installing)} commissioning · {num(p.warehouse)} in warehouse · {num(p.ordered)} on order (accelerators).</div>}
  </> }; };

  const offer = (c: Contract) => {
    const { f, el } = checks(c);
    const ramp = c.rampMonths ?? 4, t = c.kind === 'training';
    return <Panel key={c.id} glow title={`${c.customer} · ${c.archetype}`} right={<span className="tag">{c.kind}</span>}>
      <b>{c.model.name}</b> <span className="dim">{c.model.paramsB}B{c.model.activeParamsB !== c.model.paramsB ? ` (${c.model.activeParamsB}B active)` : ''}</span>
      <div className="mono" style={{ margin: '6px 0' }}>{t ? `${num(c.minAccelerators)}+ GPUs · ${usd(c.pricePerAccelHour)}/GPU-hr` : `${num(c.tokensPerSec)} tok/s · ${usd(c.pricePerMTok)}/Mtok`} · {c.durationMonths} mo · SLA {(c.slaAvailability * 100).toFixed(1)}%</div>
      {t && <div className="dim" style={{ fontSize: 12 }}>≈ {usd(c.minAccelerators * c.pricePerAccelHour * 730)}/month at full size · total ≈ {usd(c.minAccelerators * c.pricePerAccelHour * 730 * c.durationMonths)}</div>}
      <div style={{ margin: '8px 0' }}>{el}</div>
      {f.verdict !== 'ready' && <Needs c={c} go={go} onMsg={setMsg} />}
      <div className="dim" style={{ fontSize: 12 }}>Offer open until <b>{dateOf(c.deadlineMonth)}</b> · after signing you get <b>{ramp} months</b> to deploy (no revenue, no SLA clock until live; miss it → they walk, −8 rep).</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className={'btn ' + (f.verdict === 'ready' ? 'go' : 'pri')} onClick={() => { const a = st.acceptContract(c.id); if (!a.ok) return setMsg(a.message); if (f.verdict === 'ready' && f.best) setMsg(useGame.getState().assignContract(c.id, [f.best.cluster.id]).message); else setMsg(a.message); }}>{f.verdict === 'ready' ? 'SIGN & START SERVING' : 'SIGN NOW · DEPLOY LATER'}</button>
        {f.verdict === 'short' && <button className="btn sm" onClick={() => go('shop')}>Plan capacity →</button>}
      </div></Panel>;
  };

  const active = (a: ActiveContract) => {
    const c = a.contract, pending = a.clusterIds.length === 0;
    if (!pending) return <Panel key={c.id} title={`${c.customer} · ${c.kind}`} right={<span className="tag pos">serving</span>}><b>{c.model.name}</b>
      <div className="mono">{a.monthsServed}/{c.durationMonths} mo · SLA misses {a.slaMisses}</div><div className="dim" style={{ fontSize: 12 }}>on {a.clusterIds.map(id => g.clusters.find(x => x.id === id)?.name ?? id).join(' + ')}</div></Panel>;
    const left = (a.deployBy ?? a.startMonth + 4) - g.month;
    const { f, el } = checks(c);
    const base = chosen(c.id, f.best?.cluster.id);
    return <Panel key={c.id} glow title={`${c.customer} · ${c.kind}`} right={<span className={'tag ' + (left <= 1 ? 'neg' : 'warn')}>deploy by {dateOf(a.deployBy ?? a.startMonth + 4)} · {Math.max(0, left)} mo left</span>}>
      <b>{c.model.name}</b><div style={{ margin: '8px 0' }}>{el}</div>
      {f.verdict !== 'ready' && <Needs c={c} go={go} onMsg={setMsg} signedAt={a.deployBy ?? a.startMonth + 4} />}
      <RackAssign contractId={c.id} onMsg={setMsg} />
      {g.clusters.length > 0 ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{g.clusters.map(cl => <label key={cl.id} className="tag" style={{ cursor: 'pointer' }}><input type="checkbox" checked={base.includes(cl.id)} onChange={() => toggle(c.id, cl.id, base)} /> {cl.name} ({num(cl.stats?.accelerators ?? 0)})</label>)}
        <button className="btn go" disabled={!base.length} onClick={() => setMsg(st.assignContract(c.id, base).message)}>ASSIGN & GO LIVE</button></div>
        : <div className="dim">Build online racks into a cluster (Network), then come back and assign it. <a style={{ cursor: 'pointer' }} onClick={() => go('network')}>Open Network →</a></div>}
    </Panel>;
  };

  const pend = g.activeContracts.filter(a => a.clusterIds.length === 0), live = g.activeContracts.filter(a => a.clusterIds.length > 0);
  return <div className="fit"><div className="hdr"><h2>Customers & contracts</h2><span className="dim">Sign now, deploy within the ramp window — or wait until you can serve at once. {msg && <b style={{ color: 'var(--cy)' }}>{msg}</b>}</span></div>
    <div className="fb c2w">
      <div className="col"><Tip>Customers pay for <b>capacity</b>: training customers rent a big coherent cluster by the GPU-hour; inference customers pay per million tokens. Each offer shows what it needs and what you still lack — hit <b>EASY PATH</b> and the game orders, installs, deploys and assigns it for you.</Tip><h3>Market offers ({g.availableContracts.length})</h3>{g.availableContracts.length === 0 && <span className="dim">No offers right now — new ones appear every month.</span>}{g.availableContracts.map(offer)}</div>
      <div className="col">
        <Panel title="Your capacity (accelerators)"><div className="grid g2 mono" style={{ fontSize: 13 }}><span>Clustered: <b>{num(p.online)}</b></span><span>Online, free: <b>{num(p.freeOnline)}</b></span><span>Commissioning: <b>{num(p.installing)}</b></span><span>Warehouse: <b>{num(p.warehouse)}</b></span><span>On order: <b>{num(p.ordered)}</b></span></div></Panel>
        {pend.length > 0 && <><h3>Signed — awaiting deployment ({pend.length})</h3>{pend.map(active)}</>}
        <h3>Serving ({live.length})</h3>{live.length === 0 ? <span className="dim">None yet.</span> : live.map(active)}
      </div></div></div>;
}
