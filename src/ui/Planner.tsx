import { useMemo, useState } from 'react';
import { useGame } from '../store';
import { TEMPLATES } from '../data/templates';
import { quote, hallChecks, templateFacts, racksFor } from './quote';
import { usd, num, vendorColor, dateOf } from './common';
import { sfx } from './sfx';
import Tip from './Tip';

const TIER = { diy: { icon: '🔧', t: 'Build it yourself' }, oem: { icon: '🏭', t: 'OEM integrated rack' }, turnkey: { icon: '🎁', t: 'Turnkey / reference' } } as const;
const yr = (m: number) => 2020 + m / 12;

export default function Planner({ go }: { go: (s: string) => void }) {
  const g = useGame(s => s.game);
  const platforms = useMemo(() => [...new Set(TEMPLATES.map(t => t.platform))], []);
  const state = (p: string) => { const ts = TEMPLATES.filter(t => t.platform === p); const from = ts[0].availableFrom, eol = ts[0].eolAfter; return { ts, from, live: yr(g.month) >= from && (!eol || yr(g.month) <= eol), future: yr(g.month) < from }; };
  const live = platforms.filter(p => state(p).live);
  const [plat, setPlat] = useState(live[0] ?? platforms[0]);
  const [want, setWant] = useState(64);
  const [tierSel, setTierSel] = useState<string>('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const ts = TEMPLATES.filter(t => t.platform === plat);
  const t = ts.find(x => x.id === tierSel) ?? ts[ts.length > 1 ? 1 : 0];
  const f = templateFacts(t); const racks = racksFor(t, want);
  const q = quote(t, racks, g.month); const checks = hallChecks(g, t, racks);
  const cantAfford = q.cost > g.cash;

  return <div className="fb c3p">
    <div className="col"><h3>1 · Platform</h3>
      {platforms.map(p => { const st = state(p); const a = st.ts[0]; const ff = templateFacts(a); const on = p === plat;
        return <div key={p} className={'pcard' + (on ? ' on' : '') + (st.live ? '' : ' lock')} onClick={() => { if (st.live) { setPlat(p); setTierSel(''); sfx('tick'); } }}>
          <div className="ptag" style={{ background: vendorColor(a.tray.chassisId.startsWith('nv') ? 'nvidia' : a.tray.chassisId.startsWith('cb') ? 'cerebras' : a.tray.chassisId.startsWith('tt') ? 'tenstorrent' : a.tray.chassisId.startsWith('int') ? 'intel' : 'amd') }} />
          <b>{p}</b><div className="dim" style={{ fontSize: 11 }}>{st.live ? `${ff.accels} accel / rack · ${ff.kWPerRack.toFixed(0)} kW · ${a.rack.cooling}` : st.future ? `🔒 ships ${Math.floor(st.from)}` : '⛔ end of sale'}</div></div>; })}</div>
    <div className="col"><Tip>Pick a platform (a GPU generation, pre-engineered), say how many accelerators you want, then choose DIY (cheapest, you integrate), an OEM rack, or a turnkey one (priciest, fastest). Check the hall can feed and cool it before you order.</Tip>
      <div className="panel"><h3>{plat}</h3><div className="codex"><p style={{ fontSize: 13 }}>{t.codex.explain}</p></div>
        <div className="grid g4" style={{ marginTop: 8 }}>
          <div className="stat"><small>Accel / rack</small><b>{f.accels}</b></div><div className="stat"><small>Scale-up</small><b>{f.scaleUp}</b></div>
          <div className="stat"><small>Memory / rack</small><b>{num(f.memGB / 1000, 1)} TB</b></div><div className="stat"><small>Power / rack</small><b>{f.kWPerRack.toFixed(0)} kW</b></div></div></div>
      <div className="panel"><h3>2 · How many accelerators?</h3>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><input type="range" min={f.accels} max={f.accels * 64} step={f.accels} value={Math.max(f.accels, racks * f.accels)} onChange={e => { setWant(+e.target.value); sfx('tick'); }} style={{ flex: 1 }} /><div className="bignum">{num(racks * f.accels)}</div></div>
        <div className="dim">= <b>{racks}</b> rack{racks > 1 ? 's' : ''} · {num(racks * (f.tflopsFp8 || f.tflopsBf16) / 1000, 1)} PFLOPS {f.tflopsFp8 ? 'FP8' : 'BF16'} · {num(racks * f.memGB / 1000, 1)} TB memory · {(racks * f.kWPerRack).toFixed(0)} kW</div></div>
      <div className="panel"><h3>3 · How do you want to buy it?</h3>
        <div className="grid g3">{ts.map(x => { const qq = quote(x, racks, g.month); const on = x.id === t.id;
          return <div key={x.id} className={'tier' + (on ? ' on' : '')} onClick={() => { setTierSel(x.id); sfx('tick'); }}>
            <div style={{ fontSize: 22 }}>{TIER[x.tier].icon}</div><b>{x.tier === 'turnkey' ? x.name : x.tier === 'oem' ? `${x.integrator[0].toUpperCase() + x.integrator.slice(1)} rack` : TIER[x.tier].t}</b>
            <div className="mono" style={{ fontSize: 16 }}>{usd(qq.cost)}</div><div className="dim" style={{ fontSize: 11 }}>{qq.lead} mo lead · +{Math.round(x.premium * 100)}%</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>{x.tagline}</div></div>; })}</div>
        <div className="dim" style={{ marginTop: 8 }}>⚖ {t.codex.tradeoffs[0]}</div></div></div>
    <div className="col">
      <div className="panel glow"><h3>4 · Does your hall have room?</h3>
        {checks.map((c, i) => <div key={i} className={'issue ' + (c.ok ? 'info' : 'error')}><div><b>{c.ok ? '✓ OK' : '✗ Action needed'} · {c.label}</b>{c.detail}</div></div>)}
        <button className="btn sm" onClick={() => go('facility')}>Open Build →</button></div>
      <div className="panel"><h3>Bill of materials · {racks} rack{racks > 1 ? 's' : ''}</h3>
        <div><table><tbody>{q.lines.map(l => <tr key={l.id}><td>{l.n}× {l.name}</td><td className="mono" style={{ textAlign: 'right' }}>{usd(l.total)}</td></tr>)}</tbody></table></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}><b>Total</b><b className="mono">{usd(q.cost)}</b></div>
        <div className="dim">Cash {usd(g.cash)} · arrives ~{dateOf(g.month + q.lead)}</div>
        {q.capped.length > 0 && <div className="warn">Allocation limits: {q.capped.join(', ')}</div>}
        <button className="btn go" style={{ width: '100%', marginTop: 10, padding: 12, fontSize: 14 }} disabled={cantAfford || q.unavailable.length > 0} onClick={() => { const r = useGame.getState().buyTemplate(t.id, racks); setMsg({ ok: r.ok, t: r.message }); sfx(r.ok ? 'buy' : 'bad'); }}>
          {cantAfford ? 'NOT ENOUGH CASH' : `ORDER ${racks} RACK${racks > 1 ? 'S' : ''} · ${usd(q.cost)}`}</button>
        {msg && <div className={msg.ok ? 'pos' : 'neg'} style={{ marginTop: 8 }}>{msg.t}{msg.ok && <div className="dim">Next: advance months until it arrives, then <a style={{ color: 'var(--cy)', cursor: 'pointer' }} onClick={() => go('stock')}>deploy it from the Warehouse →</a></div>}</div>}
      </div></div>
  </div>;
}
