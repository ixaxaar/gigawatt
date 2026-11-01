import { useEffect, useMemo, useState } from 'react';
import type { FabricDesign, ScaleOutTech, Topology, Cluster, ClusterStats, Accelerator } from '../types';
import { getItem, ITEMS_BY_KIND } from '../data';
import { useGame } from '../store';
import { evaluateCluster } from '../sim/network';
import { MODELS, scaleOutTier } from '../sim/market';
import { trainingTokensPerSec, inferenceCapacity } from '../sim/perf';
import { autoFabric } from '../autopilot';
import { Panel, Issues, Stat, num, usd } from './common';
import { vendorColor } from './common';
import Tip from './Tip';

const TECH: ScaleOutTech[] = ['ib-ndr', 'ib-xdr', 'spectrum-x', 'eth-400', 'eth-800', 'roce', 'uec-eth'];
const TOPO: Topology[] = ['fat-tree-rail-optimized', 'fat-tree', 'single-domain', 'dragonfly', 'torus-ish'];

/** Fat-tree diagram: racks (with their NVLink domain) → leaf switches → spine switches, link width ∝ bandwidth. */
function Topo({ racks, stats, f }: { racks: { id: string; label: string; accels: number; domain: number }[]; stats: ClusterStats | null; f: FabricDesign }) {
  const W = 900, H = 420, n = racks.length;
  const shown = racks.slice(0, 16), more = n - shown.length;
  const leafId = f.leafSwitchId, spineId = f.spineSwitchId ?? f.leafSwitchId;
  const leaves = Math.max(1, Math.min(8, stats?.switchCounts[leafId] ?? Math.ceil(n / 2)));
  const spines = f.topology === 'single-domain' ? 0 : Math.max(stats?.switchCounts[spineId] && leafId !== spineId ? stats.switchCounts[spineId] : 0, n > 1 ? 2 : 0);
  const rx = (i: number) => 60 + (i + .5) * ((W - 120) / Math.max(1, shown.length));
  const lx = (i: number) => 90 + (i + .5) * ((W - 180) / leaves);
  const sx = (i: number) => 180 + (i + .5) * ((W - 360) / Math.max(1, Math.min(spines, 4)));
  const col = vendorColor(getItem(stats?.acceleratorId ?? '')?.vendor ?? 'generic');
  const bw = stats ? Math.max(1.5, Math.min(7, stats.effScaleOutGBs / 8)) : 2;
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ background: 'radial-gradient(700px 400px at 50% 30%,#12304a,#070d14)', borderRadius: 10 }}>
    <text x={14} y={22} fill="#8fb4cf" fontSize={12} style={{ letterSpacing: '.15em' }}>FABRIC · {f.scaleOutTech.toUpperCase()} · {f.topology} · {f.oversubscription}:1</text>
    {Array.from({ length: Math.min(spines, 4) }).map((_, s) => <g key={'s' + s}>{Array.from({ length: leaves }).map((__, l) => <line key={l} x1={sx(s)} y1={78} x2={lx(l)} y2={190} stroke="#c9952f" strokeWidth={Math.max(1, bw / f.oversubscription)} className="flow" opacity={.85} />)}
      <rect x={sx(s) - 52} y={56} width={104} height={30} rx={5} fill="#0a0d11" stroke="#4fd1ff" /><text x={sx(s)} y={75} textAnchor="middle" fontSize={11} fill="#cfe9ff">SPINE {s + 1}</text></g>)}
    {spines > 4 && <text x={W - 150} y={75} fill="#8fb4cf" fontSize={11}>+{spines - 4} more spines</text>}
    {Array.from({ length: leaves }).map((_, l) => <g key={'l' + l}>{shown.map((r, i) => <line key={i} x1={lx(l)} y1={222} x2={rx(i)} y2={300} stroke="#3ddc97" strokeOpacity={.55} strokeWidth={Math.max(1, bw / 2)} className="flow" />)}
      <rect x={lx(l) - 46} y={190} width={92} height={32} rx={5} fill="#0a0d11" stroke="#3ddc97" /><text x={lx(l)} y={210} textAnchor="middle" fontSize={11} fill="#cfe9ff">LEAF {l + 1}</text></g>)}
    {shown.map((r, i) => { const x = rx(i); return <g key={r.id}>
      <rect x={x - 26} y={300} width={52} height={92} rx={5} fill="url(#chassisG)" stroke={col} strokeWidth={1.6} />{[0, 1, 2, 3, 4].map(k => <rect key={k} x={x - 21} y={306 + k * 17} width={42} height={12} rx={2} fill="#0a0d11" stroke="#46525f" />)}
      <text x={x} y={408} textAnchor="middle" fontSize={9} fill="#9bb7cc">{r.accels} GPU</text>
      {r.domain > 1 && <rect x={x - 31} y={295} width={62} height={102} rx={9} fill="none" stroke="#c792ea" strokeDasharray="5 3" />}</g>; })}
    {more > 0 && <text x={W - 40} y={350} textAnchor="end" fill="#8fb4cf" fontSize={12}>+{more} more racks</text>}
    <g fontSize={10} fill="#9bb7cc"><rect x={14} y={H - 24} width={10} height={4} fill="#c9952f" /><text x={30} y={H - 19}>spine uplinks</text><rect x={120} y={H - 24} width={10} height={4} fill="#3ddc97" /><text x={136} y={H - 19}>rack → leaf</text><rect x={220} y={H - 28} width={12} height={12} fill="none" stroke="#c792ea" strokeDasharray="3 2" /><text x={238} y={H - 19}>scale-up (NVLink) domain</text></g>
  </svg>;
}

export default function Network({ setLearn }: { setLearn: (id: string) => void }) {
  const g = useGame(s => s.game);
  const placed = g.halls.flatMap(h => h.racks);
  const free = placed.filter(r => r.status === 'online' && !r.clusterId);
  const [sel, setSel] = useState<string[]>([]);
  const sw = ITEMS_BY_KIND('switch').filter(s => s.role === 'scale-out' && s.rackUnits > 0);
  const cables = ITEMS_BY_KIND('cable');
  const [f, setF] = useState<FabricDesign>({ id: 'fab', name: 'Fabric', scaleOutTech: 'ib-ndr', topology: 'fat-tree-rail-optimized', oversubscription: 1, leafSwitchId: sw[0]?.id ?? '', spineSwitchId: sw[0]?.id, nodeToLeafCableId: cables.find(c => c.cableType === 'aoc')?.id ?? '', leafToSpineCableId: cables.find(c => c.cableType === 'optic-dr')?.id });
  useEffect(() => { if (!sel.length && free.length) setSel(free.map(p => p.id)); }, []);
  const [name, setName] = useState('Cluster A');
  const [msg, setMsg] = useState('');
  const [adv, setAdv] = useState(false);
  const ctx = useMemo(() => ({ getRack: (id: string) => { const pid = placed.find(p => p.id === id)?.designId ?? id; return g.racks.find(r => r.id === pid); }, getTray: (id: string) => g.trays.find(t => t.id === id), getItem }), [g]);
  const stats = useMemo(() => sel.length ? evaluateCluster({ id: 'draft', name, rackIds: sel, fabric: f } as Cluster, ctx) : null, [sel, f, name, ctx]);
  const accel = stats ? getItem(stats.acceleratorId) as Accelerator | undefined : undefined;
  const year = 2020 + g.month / 12, tier = scaleOutTier(year);
  const rackInfo = sel.map(id => { const p = placed.find(x => x.id === id)!; const st = evaluateCluster({ id: 'r', name: 'r', rackIds: [id], fabric: f } as Cluster, ctx); return { id, label: id, accels: st.accelerators, domain: st.scaleUpDomain }; });
  const models = MODELS.filter(m => m.era <= year + .01).slice(-6);
  const auto = (kind: 'train' | 'infer') => { if (!sel.length) return setMsg('Select racks first.'); const r = autoFabric(g, sel, kind === 'train' ? tier : 0); if (!r) return setMsg('No valid fabric for these racks.'); setF(r.fabric); setMsg(`Designed: ${r.note}`); };
  const opt = (arr: { id: string; name: string }[]) => arr.map(a => <option key={a.id} value={a.id}>{a.name}</option>);
  return <div className="fit"><div className="hdr"><h2>Supercomputer builder</h2><span className="dim">Group online racks into one machine, wire its network, and see what it can train or serve.</span></div>
    <div className="fb c3n">
      <div className="col">
        <Tip>A <b>cluster</b> is racks + a network. <b>Scale-up</b> (NVLink, purple boxes) links GPUs inside a rack at TB/s; <b>scale-out</b> (InfiniBand/Ethernet, green/gold) links racks. Training needs both; inference mostly needs memory and tokens/s.</Tip>
        <Panel title="1 · Pick racks" glow>{free.length === 0 ? <span className="dim">No free online racks — deploy racks in Warehouse and wait for commissioning. (You can also serve a customer straight from racks in Customers.)</span> :
          <><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{free.map(p => <button key={p.id} className={'btn sm' + (sel.includes(p.id) ? ' pri' : '')} onClick={() => setSel(sel.includes(p.id) ? sel.filter(x => x !== p.id) : [...sel, p.id])}>{g.racks.find(r => r.id === p.designId)?.name.slice(0, 16)} · {p.id.slice(3, 9)}</button>)}</div>
            <div style={{ marginTop: 6 }}><button className="btn sm" onClick={() => setSel(free.map(p => p.id))}>select all</button> <button className="btn sm" onClick={() => setSel([])}>none</button></div></>}</Panel>
        <Panel title="2 · Wire the network" glow>
          <div style={{ display: 'grid', gap: 6 }}><button className="btn go" onClick={() => auto('train')}>🧠 Auto-design for TRAINING</button><button className="btn" onClick={() => auto('infer')}>⚡ Auto-design for INFERENCE (cheaper)</button>
            <div className="dim" style={{ fontSize: 11 }}>Training customers expect ≥ {tier.toFixed(1)} GB/s per GPU in {Math.floor(year)}; auto-design finds the cheapest fabric that reaches it.</div></div>
          <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setAdv(!adv)}>{adv ? '▼' : '▶'} Advanced fabric</button>
          {adv && <div className="grid g2" style={{ marginTop: 8 }}>
            <label>Scale-out tech<br /><select value={f.scaleOutTech} onChange={e => setF({ ...f, scaleOutTech: e.target.value as ScaleOutTech })}>{TECH.map(t => <option key={t}>{t}</option>)}</select></label>
            <label>Topology<br /><select value={f.topology} onChange={e => setF({ ...f, topology: e.target.value as Topology })}>{TOPO.map(t => <option key={t}>{t}</option>)}</select></label>
            <label>Leaf switch<br /><select value={f.leafSwitchId} onChange={e => setF({ ...f, leafSwitchId: e.target.value })}>{opt(sw)}</select></label>
            <label>Spine switch<br /><select value={f.spineSwitchId} onChange={e => setF({ ...f, spineSwitchId: e.target.value })}>{opt(sw)}</select></label>
            <label>Node→leaf cable<br /><select value={f.nodeToLeafCableId} onChange={e => setF({ ...f, nodeToLeafCableId: e.target.value })}>{opt(cables)}</select></label>
            <label>Leaf→spine cable<br /><select value={f.leafToSpineCableId} onChange={e => setF({ ...f, leafToSpineCableId: e.target.value })}>{opt(cables)}</select></label>
            <label style={{ gridColumn: '1/3' }}>Oversubscription {f.oversubscription}:1<br /><input type="range" min={1} max={4} step={.5} value={f.oversubscription} onChange={e => setF({ ...f, oversubscription: +e.target.value })} style={{ width: '100%' }} /></label></div>}
          {msg && <div className="warn" style={{ marginTop: 6, fontSize: 12 }}>{msg}</div>}</Panel>
        <Panel title="Existing machines">{g.clusters.length ? g.clusters.map(c => <div key={c.id} style={{ marginBottom: 6 }}><b>{c.name}</b> <span className="tag">{c.fabric.scaleOutTech}</span>{g.activeContracts.some(a => a.clusterIds.includes(c.id)) && <span className="tag pos">serving</span>}<div className="dim" style={{ fontSize: 12 }}>{c.stats?.accelerators} accels · domain {c.stats?.scaleUpDomain} · {c.stats?.peakPFLOPSFp8.toFixed(0)} PF fp8 · {c.stats?.effScaleOutGBs.toFixed(0)} GB/s/GPU</div></div>) : <span className="dim">None yet</span>}</Panel>
      </div>
      <div className="col" style={{ gridTemplateRows: 'minmax(0,1fr) auto', overflow: 'hidden' }}>
        <Panel title="Topology" glow cls="fillp"><div className="sv"><Topo racks={rackInfo} stats={stats} f={f} /></div></Panel>
        {stats && <Panel><div className="grid g4"><Stat label="Accelerators" value={num(stats.accelerators)} /><Stat label="Scale-up domain" value={stats.scaleUpDomain} /><Stat label="FP8 compute" value={`${num(stats.peakPFLOPSFp8, 1)} PF`} /><Stat label="Memory" value={`${num(stats.totalMemGB / 1000, 1)} TB`} /><Stat label="Power" value={`${num(stats.powerKW)} kW`} /><Stat label="Scale-out / GPU" value={`${stats.effScaleOutGBs.toFixed(1)} GB/s`} cls={stats.effScaleOutGBs >= tier ? 'pos' : 'warn'} /><Stat label="Bisection" value={`${num(stats.bisectionTbps)} Tb/s`} /><Stat label="Network capex" value={usd(Object.entries({ ...stats.switchCounts, ...stats.cableCounts }).reduce((n, [id, c]) => n + (getItem(id)?.priceUSD ?? 0) * (stats.switchCounts[id] ?? stats.cableCounts[id] ?? 0), 0))} /></div></Panel>}
      </div>
      <div className="col">
        <Panel title="3 · What can this machine do?" glow>{!stats || !accel ? <span className="dim">Select racks to see which models it can train and serve.</span> :
          <table style={{ fontSize: 12 }}><thead><tr><th>Model</th><th>Train</th><th>Serve</th></tr></thead><tbody>{models.map(m => { const t = trainingTokensPerSec(stats, accel, m), inf = inferenceCapacity(stats, accel, m, { contextTokens: 4096 });
            return <tr key={m.id}><td><b>{m.name}</b><div className="dim" style={{ fontSize: 10 }}>{m.paramsB}B{m.activeParamsB !== m.paramsB ? ` (${m.activeParamsB}B active)` : ''}</div></td>
              <td>{t.fitsTrainingState && t.tokensPerSec > 0 ? <><span className="pos">✓</span> <span className="mono">{num(t.tokensPerSec / 1000, 0)}k tok/s</span><div className="dim" style={{ fontSize: 10 }}>MFU {(t.mfu * 100).toFixed(0)}%</div></> : <span className="neg">✗ state doesn’t fit</span>}</td>
              <td>{inf.fitsWeights ? <><span className="pos">✓</span> <span className="mono">{num(inf.tokensPerSec / 1000, 1)}k tok/s</span><div className="dim" style={{ fontSize: 10 }}>TTFT {Math.round(inf.ttftMs)} ms · TP{inf.tpSize}</div></> : <span className="neg">✗ weights don’t fit</span>}</td></tr>; })}</tbody></table>}</Panel>
        <Panel title="Checks">{!stats ? <span className="dim">—</span> : <Issues issues={stats.issues} onLearn={setLearn} />}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><input value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} /><button className="btn go" disabled={!stats} onClick={() => { const r = useGame.getState().createCluster(name, sel, f); setMsg(r.message); if (r.ok) setSel([]); }}>BUILD CLUSTER</button></div></Panel>
      </div>
    </div></div>;
}
