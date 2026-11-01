import { useState } from 'react';
import { useGame } from '../store';
import { ledger, rackReadiness } from '../ledger';
import { Panel, usd, dateOf } from './common';
import Tip from './Tip';

/** Per-design "what am I missing" with one-click ordering. Used by Warehouse and Build screens. */
export function MissingParts({ designId, racks = 1, onMsg, setLearn }: { designId: string; racks?: number; onMsg?: (m: string) => void; setLearn?: (id: string) => void }) {
  const g = useGame(s => s.game);
  const r = rackReadiness(g, designId, racks);
  if (!r) return null;
  if (r.complete) return <div className="pos" style={{ fontSize: 12 }}>✓ All parts for {racks} rack{racks > 1 ? 's' : ''} are in the warehouse.</div>;
  const order = () => { const st = useGame.getState(); const out: string[] = []; for (const l of r.toBuy) if (l.buyable) { const m = st.buy(l.id, l.short - l.onOrder); out.push(m.ok ? '✓' : m.message); } onMsg?.(out.every(x => x === '✓') ? `Ordered ${r.toBuy.length} part type(s) · arrives within ~${r.etaMonths} mo.` : out.filter(x => x !== '✓').join(' ')); };
  return <div>
    <table style={{ fontSize: 12 }}><thead><tr><th>Missing part</th><th>Need</th><th>Have</th><th>On order</th><th>Unit</th><th>Lead</th></tr></thead><tbody>
      {r.lines.filter(l => l.short > 0).map(l => <tr key={l.id}><td><a style={{ cursor: 'pointer' }} onClick={() => setLearn?.(l.id)}>{l.name}</a>{!l.buyable && <div className="neg" style={{ fontSize: 11 }}>{l.reason ?? 'Unavailable now'}</div>}</td>
        <td className="mono">{l.need}</td><td className="mono">{l.have}</td><td className="mono">{l.onOrder || '—'}</td><td className="mono">{l.buyable ? usd(l.unitPrice) : '—'}</td><td className="mono">{l.buyable ? l.leadMonths + ' mo' : '—'}</td></tr>)}
    </tbody></table>
    {r.blocked.length > 0 ? <div className="warn" style={{ marginTop: 6 }}>⚠ {r.blocked.map(b => b.name).join(', ')} cannot be bought this month — redesign the tray/rack with a part that is shipping (Design Lab), or wait for it.</div>
      : r.toBuy.length > 0 ? <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}><button className="btn go" disabled={r.cost > g.cash} onClick={order}>ORDER ALL MISSING · {usd(r.cost)}</button><span className="dim">arrives in ~{r.etaMonths} mo</span></div>
        : <div className="dim" style={{ marginTop: 6 }}>Everything missing is already on order.</div>}
  </div>;
}

const KIND_ORDER = ['accelerator', 'cpu', 'memory', 'nvme', 'nic', 'switch', 'cable', 'chassis', 'rack', 'storage', 'power', 'cooling'];

export default function Inventory({ go, setLearn }: { go: (s: string) => void; setLearn: (id: string) => void }) {
  const g = useGame(s => s.game);
  const [msg, setMsg] = useState('');
  const [hall, setHall] = useState(g.halls[0]?.id);
  const [n, setN] = useState(1);
  const rows = ledger(g);
  const kinds = [...new Set(rows.map(r => r.kind))].sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b));
  const st = useGame.getState();
  const value = rows.reduce((s, r) => s + r.warehouse, 0);
  return <div className="fit"><div className="hdr"><h2>Warehouse & assembly</h2>
    <span className="dim">Parts live in one of three states: <b>on order</b> (paid, in transit) → <b>warehouse</b> (arrived, ready to assemble) → <b>deployed</b> (racked on the floor or installed in a hall). {msg && <b style={{ color: 'var(--cy)' }}> {msg}</b>}</span></div>
    <div className="fb c2w">
      <div className="col"><Tip>Parts move <b>on order → warehouse → deployed</b>. A rack can only be deployed when every part in its design is in the warehouse and the hall has power, cooling and a free slot.</Tip><Panel title="Rack assembly — your designs" glow>
        {g.racks.length === 0 && <span className="dim">No rack designs yet. Buy a system in Procure (it saves its design automatically) or build one in the Design Lab.</span>}
        {g.racks.map(d => { const r = rackReadiness(g, d.id, n)!; const placedN = g.halls.reduce((a, h) => a + h.racks.filter(p => p.designId === d.id).length, 0);
          return <div key={d.id} style={{ borderBottom: '1px solid var(--bd)', padding: '10px 0' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><b>{d.name}</b>
              <span className="tag">{r.buildableNow} ready to deploy</span><span className="tag">{placedN} deployed</span>
              <span className="sp" />
              {r.buildableNow > 0 && <><select value={hall} onChange={e => setHall(e.target.value)}>{g.halls.map(h => <option key={h.id} value={h.id}>{h.name} ({h.racks.length}/{h.rackSlots})</option>)}</select>
                <button className="btn go sm" onClick={() => setMsg(st.placeRack(hall ?? g.halls[0].id, d.id).message)}>DEPLOY 1</button></>}</div>
            <div style={{ marginTop: 6 }}><MissingParts designId={d.id} racks={Math.max(1, n)} onMsg={setMsg} setLearn={setLearn} /></div>
          </div>; })}
        {g.racks.length > 0 && <div className="dim" style={{ marginTop: 8 }}>Plan for <input type="number" min={1} value={n} onChange={e => setN(Math.max(1, +e.target.value || 1))} style={{ width: 56 }} /> rack(s) of each design.</div>}
      </Panel></div>
      <div className="col">
        <Panel title="In transit">{g.orders.length === 0 ? <span className="dim">Nothing on order. <a style={{ cursor: 'pointer' }} onClick={() => go('shop')}>Open Procure →</a></span>
          : [...g.orders].sort((a, b) => a.arriveMonth - b.arriveMonth).map(o => <div key={o.id} className="mono" style={{ fontSize: 12 }}>{o.qty}× {rows.find(r => r.id === o.itemId)?.name ?? o.itemId} → {dateOf(o.arriveMonth)} <span className="dim">({o.arriveMonth - g.month} mo)</span></div>)}</Panel>
        <Panel title="Racks on the floor">{g.halls.flatMap(h => h.racks.map(p => ({ h, p }))).length === 0 ? <span className="dim">None deployed.</span>
          : g.halls.flatMap(h => h.racks.map(p => <div key={p.id} style={{ fontSize: 12 }}>{h.name} · {g.racks.find(r => r.id === p.designId)?.name} <span className={'tag ' + (p.status === 'online' ? 'pos' : p.status === 'failed' ? 'neg' : '')}>{p.status}{p.status !== 'online' ? ` → ${dateOf(p.readyMonth)}` : ''}</span></div>))}</Panel>
    <Panel title={`Full inventory ledger (${value} units in warehouse)`}>
      <div><table><thead><tr><th>Part</th><th>Kind</th><th>Warehouse</th><th>On order</th><th>Deployed</th></tr></thead><tbody>
        {kinds.flatMap(kd => rows.filter(r => r.kind === kd).map(r => <tr key={r.id}><td><a style={{ cursor: 'pointer' }} onClick={() => setLearn(r.id)}>{r.name}</a><div className="dim" style={{ fontSize: 11 }}>{r.vendor}</div></td><td className="dim">{r.kind}</td>
          <td className="mono">{r.warehouse || '—'}</td><td className="mono">{r.onOrder ? `${r.onOrder} · ${dateOf(r.nextEta!)}` : '—'}</td><td className="mono">{r.deployed || '—'}</td></tr>))}
        {rows.length === 0 && <tr><td colSpan={5} className="dim">Empty. Buy something in Procure.</td></tr>}
      </tbody></table></div></Panel>
      </div></div></div>;
}
