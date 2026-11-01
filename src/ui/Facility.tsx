import { useState } from 'react';
import type { CoolingClass, HallState } from '../types';
import { getItem } from '../data';
import { useGame, rackBom } from '../store';
import { validateHall, validateRack, computePUE } from '../sim/validate';
import { Panel, Issues, Stat, usd, num } from './common';
import World from './World';
import { MissingParts } from './Inventory';
import Concepts from './Concepts';
import { offerAt } from '../store';
import { ALL_ITEMS } from '../data';

const Gauge = ({ label, v, max, unit }: { label: string; v: number; max: number; unit: string }) => { const p = max ? v / max : v ? 2 : 0; return <div style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="dim">{label}</span><span className="mono">{num(v)} / {num(max)} {unit}</span></div>
  <div className="bar"><div style={{ width: `${Math.min(100, p * 100)}%`, background: p > 1 ? 'var(--rd)' : p > .85 ? 'var(--am)' : 'var(--gr)' }} /></div></div>; };

export default function Facility({ setLearn, go }: { setLearn: (id: string) => void; go?: (s: string) => void }) {
  const [plantKind, setPlantKind] = useState<'cooling' | 'power'>('cooling');
  const g = useGame(s => s.game);
  const [hid, setHid] = useState(g.halls[0]?.id);
  const hall: HallState | undefined = g.halls.find(h => h.id === hid) ?? g.halls[0];
  const [design, setDesign] = useState('');
  const [msg, setMsg] = useState('');
  const [nh, setNh] = useState<{ name: string; cool: CoolingClass; slots: number }>({ name: 'Hall 2', cool: 'dlc', slots: 20 });
  const st = useGame.getState();
  const say = (r: { message: string }) => setMsg(r.message);
  if (!hall) return <div>No halls.</div>;
  const ctx = hall.racks.map(p => { const d = g.racks.find(r => r.id === p.designId)!; return { design: d, trays: g.trays }; });
  const issues = validateHall(hall, ctx, getItem);
  const kw = hall.racks.reduce((n, p) => { const d = g.racks.find(r => r.id === p.designId); return n + (d ? validateRack(d, g.trays, getItem).stats.kW : 0); }, 0);
  const inv = Object.entries(g.inventory).filter(([id, n]) => n > 0 && (['power', 'cooling'].includes(getItem(id)?.kind ?? '') && !['pdu', 'power-shelf'].includes((getItem(id) as any)?.powerType)));
  const bom = design ? rackBom(g, design) : undefined;
  const missing = bom ? Object.entries(bom).filter(([id, n]) => (g.inventory[id] ?? 0) < n) : [];
  return <div className="fit"><div className="hdr"><h2>Build</h2>{g.halls.map(h => <button key={h.id} className={'btn' + (h.id === hall.id ? ' pri' : '')} onClick={() => setHid(h.id)}>{h.name} · {h.coolingClass}</button>)}</div>
    <div className="fb c2w"><Panel title={`${hall.name} floor`} glow cls="fillp">
      <div className="sv"><World game={g} hall={hall} selected={null} fill onSelect={(rid, slot) => { if (!rid && design) say(st.placeRack(hall.id, design)); }} /></div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}><select value={design} onChange={e => setDesign(e.target.value)}><option value="">choose rack design…</option>{g.racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <button className="btn go" disabled={!design || missing.length > 0} onClick={() => say(st.placeRack(hall.id, design))}>PLACE RACK</button>
        {missing.length > 0 && <span className="warn">missing {missing.length} part type(s) — see below</span>}</div>
      {design && missing.length > 0 && <div style={{ marginTop: 8 }}><MissingParts designId={design} onMsg={setMsg} setLearn={setLearn} /></div>}
      <div className="dim" style={{ marginTop: 6 }}>{msg}</div></Panel>
    <div className="col">
      {(g.mode === 'learner') && <Panel title="🎓 Datacenter 101 — do I need this?" glow><Concepts go={go} only={['power', 'cooling', 'chiller', 'liquid', 'rdhx', 'pue', 'ups']} /></Panel>}
      <Panel title="Power & cooling" glow><Gauge label="IT load" v={kw} max={hall.itPowerKW} unit="kW" /><Gauge label="Heat rejection" v={kw} max={hall.coolingKW} unit="kW" />
        <div className="grid g3"><Stat label="PUE" value={computePUE(hall, getItem).toFixed(2)} /><Stat label="Racks" value={`${hall.racks.length}/${hall.rackSlots}`} /><Stat label="Class" value={hall.coolingClass} /></div></Panel>
      <Panel title="Install equipment from inventory">{inv.length === 0 && <span className="dim">Buy transformers, UPS, CRAH/CDU/chillers in Procurement.</span>}
        {inv.map(([id, n]) => { const it = getItem(id)!; return <div key={id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}><span style={{ flex: 1 }}>{n}× {it.name}</span>
          <button className="btn sm" onClick={() => say(it.kind === 'power' ? st.installPower(hall.id, id, 1) : st.installCooling(hall.id, id, 1))}>Install 1</button></div>; })}
        <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>Installed: {[...Object.entries(hall.powerEquip), ...Object.entries(hall.coolingEquip)].map(([id, n]) => `${n}× ${getItem(id)?.name}`).join(', ') || 'nothing'}</div></Panel>
      <Panel title="Buy plant for this hall"><div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>{(['cooling', 'power'] as const).map(k => <button key={k} className={'btn sm' + (plantKind === k ? ' pri' : '')} onClick={() => setPlantKind(k)}>{k}</button>)}</div>
        <div>{ALL_ITEMS.filter(i => i.kind === plantKind && (i.kind === 'cooling' ? i.serves === hall.coolingClass : !['pdu', 'power-shelf'].includes((i as any).powerType))).map(i => offerAt(i, g.month)).filter(o => o.available).map(o => { const cap = (o.item as any).capacityKW; return <div key={o.item.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, fontSize: 12 }}>
          <span style={{ flex: 1 }}>{o.item.name}<div className="dim" style={{ fontSize: 11 }}>{cap} kW · {usd(o.unitPrice)} · {o.leadMonths} mo</div></span>
          <button className="btn sm" disabled={o.unitPrice > g.cash} onClick={() => say(st.buy(o.item.id, 1))}>Buy 1</button></div>; })}</div>
        <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>Arrives in Warehouse, then use “Install 1” above.</div></Panel>
      <Panel title="Hall checks"><Issues issues={issues} onLearn={setLearn} /></Panel>
      <Panel title="Build new hall"><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><input value={nh.name} onChange={e => setNh({ ...nh, name: e.target.value })} style={{ width: 100 }} />
        <select value={nh.cool} onChange={e => setNh({ ...nh, cool: e.target.value as CoolingClass })}>{['air', 'rdhx', 'dlc', 'immersion'].map(c => <option key={c}>{c}</option>)}</select><input type="number" value={nh.slots} onChange={e => setNh({ ...nh, slots: +e.target.value || 4 })} />
        <button className="btn" onClick={() => say(st.buildHall(nh.name, nh.cool, nh.slots))}>Build</button></div></Panel>
    </div></div></div>;
}
