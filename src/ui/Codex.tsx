import { useMemo, useState } from 'react';
import { ALL_ITEMS, getItem, VENDORS } from '../data';
import { Panel, CodexCard, specsOf, vendorColor } from './common';
import { ItemArt } from './art';
import Concepts from './Concepts';

export default function Codex({ learn, setLearn, go }: { learn: string | null; setLearn: (s: string | null) => void; go?: (s: string) => void }) {
  const [q, setQ] = useState('');
  const [view, setView] = useState<'list' | 'time' | 'concepts'>('list');
  const list = useMemo(() => ALL_ITEMS.filter(i => (i.name + i.vendor + i.kind + (i.codex.tags ?? []).join(' ')).toLowerCase().includes(q.toLowerCase())), [q]);
  const sel = learn ? getItem(learn) : null;
  const accel = ALL_ITEMS.filter(i => i.kind === 'accelerator').sort((a, b) => a.availableFrom - b.availableFrom);
  return <div className="fit"><div className="hdr"><h2>Codex <span className="dim" style={{ fontSize: 13, fontWeight: 500 }}>· {ALL_ITEMS.length} real parts</span></h2>
    <input placeholder="search: hbm, nvlink, dpu, liquid…" value={q} onChange={e => setQ(e.target.value)} style={{ width: 280 }} />
    <button className={'btn sm' + (view === 'list' ? ' pri' : '')} onClick={() => setView('list')}>Parts encyclopedia</button><button className={'btn sm' + (view === 'concepts' ? ' pri' : '')} onClick={() => setView('concepts')}>🎓 Datacenter 101</button><button className={'btn sm' + (view === 'time' ? ' pri' : '')} onClick={() => setView('time')}>Accelerator timeline</button></div>
    {view === 'concepts' ? <div className="fb"><div className="col"><Panel title="What is it, why do I need it, and do I need it right now?" glow><Concepts go={go} /></Panel></div></div>
    : view === 'time' ? <div className="fb"><div className="col"><Panel title="Accelerator generations"><div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {accel.map(a => <div key={a.id} className="panel" style={{ width: 200, cursor: 'pointer', borderColor: vendorColor(a.vendor) + '66' }} onClick={() => { setLearn(a.id); setView('list'); }}>
        <div className="dim mono">{a.availableFrom}</div><ItemArt item={a} size={60} /><b style={{ color: vendorColor(a.vendor) }}>{a.name}</b>
        <div className="dim" style={{ fontSize: 11 }}>{a.memGB} GB · {a.memBWTBs} TB/s · {a.tdpW} W</div><div className="dim" style={{ fontSize: 11 }}>{a.scaleUp}</div></div>)}</div></Panel></div></div>
    : <div className="fb c2w"><div className="col"><Panel><table><tbody>{list.map(i => <tr className={'row' + (sel?.id === i.id ? ' sel' : '')} key={i.id} onClick={() => setLearn(i.id)}><td><ItemArt item={i} size={34} /></td><td><b style={{ color: vendorColor(i.vendor) }}>{i.name}</b><div className="dim">{i.kind} · {i.codex.summary}</div></td></tr>)}</tbody></table></Panel></div>
      <div className="col">{sel ? <Panel glow title={sel.name}><div style={{ display: 'flex', gap: 14, marginBottom: 12 }}><ItemArt item={sel} size={110} /><table><tbody>{specsOf(sel).map(([a, b]) => <tr key={a}><td className="dim">{a}</td><td className="mono">{b}</td></tr>)}</tbody></table></div><CodexCard codex={sel.codex} />
        <div className="dim" style={{ marginTop: 10 }}>Vendor: {VENDORS.find(v => v.id === sel.vendor)?.codex.summary}</div></Panel> : <Panel><span className="dim">Pick a part. Every entry explains what it is, why it exists, and the tradeoffs you will face building with it.</span></Panel>}</div></div>}
  </div>;
}
