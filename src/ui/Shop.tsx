import { useMemo, useState } from 'react';
import type { CatalogItem } from '../types';
import { ALL_ITEMS } from '../data';
import { useGame, offerAt, volumeDiscount } from '../store';
import { Panel, CodexCard, specsOf, usd, num, vendorColor } from './common';
import { ItemArt } from './art';
import Planner from './Planner';
import { spareQty } from '../sim/failures';

const KINDS = ['accelerator', 'cpu', 'nic', 'switch', 'cable', 'chassis', 'rack', 'power', 'cooling', 'storage', 'memory', 'nvme'] as const;

export default function Shop({ go }: { go: (s: string) => void }) {
  const g = useGame(s => s.game);
  const [tab, setTab] = useState<'plan' | 'parts'>('plan');
  const [kind, setKind] = useState<string>('accelerator');
  const [vendor, setVendor] = useState('all');
  const [future, setFuture] = useState(false);
  const [sel, setSel] = useState<CatalogItem | null>(null);
  const [qty, setQty] = useState(8);
  const [spares, setSpares] = useState(true);
  const [msg, setMsg] = useState('');
  const items = useMemo(() => ALL_ITEMS.filter(i => i.kind === kind && (vendor === 'all' || i.vendor === vendor)).map(i => offerAt(i, g.month)).filter(o => future || o.available).sort((a, b) => a.item.availableFrom - b.item.availableFrom), [kind, vendor, future, g.month]);
  const vendors = [...new Set(ALL_ITEMS.filter(i => i.kind === kind).map(i => i.vendor))];
  const so = sel ? offerAt(sel, g.month) : null;
  const disc = so && so.available ? volumeDiscount(so.item, qty, so.unitPrice) : 0;
  const total = so ? so.unitPrice * qty * (1 - disc) : 0;
  if (tab === 'plan') return <div className="fit"><div className="hdr"><h2>Procurement</h2><button className="btn pri">🧭 Guided planner</button><button className="btn" onClick={() => setTab('parts')}>🔩 Parts bin (advanced)</button></div><Planner go={go} /></div>;
  return <div className="fit">
    <div className="hdr"><h2>Procurement</h2><button className="btn" onClick={() => setTab('plan')}>🧭 Guided planner</button><button className="btn pri">🔩 Parts bin (advanced)</button></div>
    <div className="fb" style={{ gridTemplateRows: 'auto minmax(0,1fr)' }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{KINDS.map(k => <button key={k} className={'btn sm' + (k === kind ? ' pri' : '')} onClick={() => { setKind(k); setVendor('all'); setSel(null); }}>{k}</button>)}
      <span className="sp" /><select value={vendor} onChange={e => setVendor(e.target.value)}><option value="all">all vendors</option>{vendors.map(v => <option key={v}>{v}</option>)}</select>
      <label className="dim"><input type="checkbox" checked={future} onChange={e => setFuture(e.target.checked)} /> show unreleased/EOL</label></div>
    <div className="fb c2w">
      <Panel cls="scr"><div><table><thead><tr><th></th><th>Part</th><th>Key specs</th><th>Price</th><th>Lead</th><th>In stock</th></tr></thead><tbody>
        {items.map(o => <tr key={o.item.id} className={'row' + (sel?.id === o.item.id ? ' sel' : '')} style={{ opacity: o.available ? 1 : .5 }} onClick={() => setSel(o.item)}>
          <td><ItemArt item={o.item} size={38} /></td>
          <td><b style={{ color: vendorColor(o.item.vendor) }}>{o.item.name}</b><div className="dim">{o.item.vendor} · {Math.floor(o.item.availableFrom)}</div></td>
          <td className="dim" style={{ fontSize: 11 }}>{specsOf(o.item).slice(0, 3).map(([a, b]) => `${a}: ${b}`).join(' · ')}</td>
          <td className="mono">{o.available ? usd(o.unitPrice) : '—'}</td><td className="mono">{o.available ? o.leadMonths + ' mo' : ''}</td><td className="mono">{g.inventory[o.item.id] ?? 0}</td></tr>)}
      </tbody></table></div></Panel>
      <div className="col">
        {sel && so ? <Panel glow title={sel.name}>
          <div style={{ display: 'flex', gap: 14 }}><ItemArt item={sel} size={110} /><table><tbody>{specsOf(sel).map(([a, b]) => <tr key={a}><td className="dim">{a}</td><td className="mono">{b}</td></tr>)}</tbody></table></div>
          <div style={{ margin: '12px 0' }}><CodexCard codex={sel.codex} /></div>
          {so.available ? <><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>Qty <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, +e.target.value || 1))} />
            <button className="btn go" disabled={total > g.cash} onClick={() => { const st = useGame.getState(); const m = st.buy(sel.id, qty); if (m.ok && spares && spareQty(sel.id, qty) > 0) st.buy(sel.id, spareQty(sel.id, qty), true); setMsg(m.message); }}>BUY {usd(total + (spares ? spareQty(sel.id, qty) * so.unitPrice : 0))}</button>{spareQty(sel.id, qty) > 0 && <label className="dim" style={{ fontSize: 11 }}><input type="checkbox" checked={spares} onChange={e => setSpares(e.target.checked)} /> + {spareQty(sel.id, qty)} spare{spareQty(sel.id, qty) > 1 ? 's' : ''}</label>}</div>
            <div className="dim" style={{ marginTop: 6 }}>{usd(so.unitPrice)} ea{disc > 0 && <span className="pos"> · −{(disc * 100).toFixed(0)}% volume</span>} · arrives in {so.leadMonths} mo{so.qtyCap ? ` · allocation ${num(so.qtyCap)}/qtr` : ''}</div></>
            : <div className="warn">{so.reason}</div>}
          {msg && <div className="dim" style={{ marginTop: 8 }}>{msg}</div>}
        </Panel> : <Panel><span className="dim">Select a part to see specs, the engineering story and tradeoffs.</span></Panel>}
        <Panel title="Open orders">{g.orders.length === 0 ? <span className="dim">None</span> : g.orders.map(o => <div key={o.id} className="mono" style={{ fontSize: 11 }}>{o.qty}× {o.itemId} → month {o.arriveMonth}</div>)}</Panel>
      </div>
    </div></div>
  </div>;
}
