import { useState } from 'react';
import { useGame } from '../store';
import { getItem } from '../data';
import { validateRack } from '../sim/validate';
import { monthlyOpex, HOURS_PER_MONTH } from '../sim/economy';
import { POWER_SOURCES, settlePower, spotAnchor, spotRevenue, spotUtilization } from '../sim/power';
import { Panel, Stat, usd, num, dateOf } from './common';
import Tip from './Tip';

const ICON: Record<string, string> = { grid: '🔌', solar: '☀️', gas: '🔥', hydro: '💧', nuclear: '⚛️' };
const Spark = ({ v }: { v: number[] }) => { if (v.length < 2) return <span className="dim">collecting…</span>; const lo = Math.min(...v), hi = Math.max(...v), W = 220, H = 46; const pts = v.map((x, i) => `${(i / (v.length - 1)) * W},${H - ((x - lo) / Math.max(1e-6, hi - lo)) * (H - 6) - 3}`).join(' '); return <svg width={W} height={H}><polyline points={pts} fill="none" stroke="#4fd1ff" strokeWidth="2" /></svg>; };

export default function Energy() {
  const g = useGame(s => s.game);
  const st = useGame.getState();
  const [msg, setMsg] = useState('');
  const [mw, setMw] = useState<Record<string, number>>({});
  const o0 = monthlyOpex(g);
  const drawMW = (o0.itPowerKW * o0.pue) / 1000;
  const preview = settlePower(g, drawMW, () => 0.5, () => {});
  const spotMWh = g.utilityUSDPerKWh * 1000;
  const contracts = g.powerContracts ?? [];
  const live = contracts.filter(c => g.month >= c.startMonth);
  const committed = live.reduce((a, c) => a + c.mw, 0);
  const cap = live.reduce((a, c) => a + c.mw * (1 + c.overdrawPct), 0);
  const price = g.spotPrice ?? spotAnchor(g.month);
  const util = spotUtilization(price, g.month);
  const sp = spotRevenue(g, new Set(g.activeContracts.flatMap(a => a.clusterIds)), d => { const rd = g.racks.find(r => r.id === d); return rd ? validateRack(rd, g.trays, getItem).stats.accels : 0; });
  const freeAccels = g.clusters.reduce((n, c) => n + (c.stats?.accelerators ?? 0), 0);
  const costPerGpuHr = freeAccels ? (o0.itPowerKW / freeAccels) * o0.pue * g.utilityUSDPerKWh : 0;
  const inSpot = new Set(g.spotClusters ?? []);
  const draw = Math.max(0.01, drawMW);
  return <div className="fit"><div className="hdr"><h2>Energy & spot market</h2><span className="dim">Buy power on take-or-pay contracts (cheap, but paid even if unused) or stay on spot. {msg && <b style={{ color: 'var(--cy)' }}>{msg}</b>}</span></div>
    <div className="fb" style={{ gridTemplateRows: 'auto minmax(0,1fr)' }}>
    <div className="grid g3" style={{ alignItems: 'start' }}>
      <Panel title="Power position" glow>
        <div className="grid g2"><Stat label="Facility draw" value={`${drawMW.toFixed(2)} MW`} /><Stat label="Spot utility" value={`$${spotMWh.toFixed(0)}/MWh`} /><Stat label="Committed (firm)" value={`${committed.toFixed(1)} MW`} /><Stat label="Max incl. overdraw" value={`${cap.toFixed(1)} MW`} /></div>
        <div className="bar" style={{ margin: '10px 0 4px', position: 'relative' }}><div style={{ width: `${Math.min(100, (drawMW / Math.max(cap, drawMW, 0.01)) * 100)}%`, background: drawMW > cap ? 'var(--rd)' : drawMW > committed ? 'var(--am)' : 'var(--gr)' }} /></div>
        <div className="dim" style={{ fontSize: 12 }}>{live.length === 0 ? 'No contracts: 100% bought at the spot utility rate (volatile — see energy-crisis events).' : drawMW > cap ? 'Above contract + overdraw limit: the excess is bought at spot.' : drawMW > committed ? 'In the overdraw band: extra MW billed at a premium.' : `Under-using your commit: ${(committed - drawMW).toFixed(2)} MW is resold to the grid at ~80% of spot.`}</div>
        <div className="mono" style={{ marginTop: 6 }}>Projected power bill: <b>{usd(preview.netUSD)}</b>/mo · blended ${preview.avgUSDPerMWh.toFixed(0)}/MWh</div>
      </Panel>
      <Panel title="Spot GPU market" glow right={<span className="tag">{`$${price.toFixed(2)}/GPU-hr`}</span>}>
        <Spark v={g.spotHistory ?? []} />
        <div className="grid g2" style={{ marginTop: 6 }}><Stat label="Demand (fill rate)" value={`${Math.round(util * 100)}%`} /><Stat label="Your power cost" value={`$${costPerGpuHr.toFixed(2)}/GPU-hr`} /></div>
        <div className="dim" style={{ fontSize: 12, marginTop: 6 }}>Spot price follows supply and demand; when it spikes, idle clusters print money, when it crashes they barely cover power. Spot is pre-emptible — contracts always win.</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>Reserve price $<input type="number" step="0.1" min={0} value={g.spotReserve ?? 0} onChange={e => setMsg(st.setSpotReserve(+e.target.value || 0).message)} style={{ width: 70 }} />/GPU-hr <span className="dim" style={{ fontSize: 11 }}>(won't sell below this)</span></div>
      </Panel>
      <Panel title="Offer idle capacity on spot">
        <div className="dim" style={{ fontSize: 12, marginBottom: 4 }}>No cluster needed: tick individual racks. They earn while they wait for a contract; once a contract takes them they leave spot automatically.</div>
        {g.halls.flatMap(h => h.racks).length === 0 && <span className="dim">Deploy a rack first (Warehouse).</span>}
        {g.halls.flatMap(h => h.racks).map(r => <label key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}><input type="checkbox" disabled={r.status !== 'online'} checked={(g.spotRacks ?? []).includes(r.id)} onChange={e => setMsg(st.setSpotRack(r.id, e.target.checked).message)} /><span style={{ flex: 1 }}>{g.racks.find(d => d.id === r.designId)?.name.slice(0, 26)} <span className="dim">({r.id.slice(3, 9)})</span></span><span className={'tag ' + (r.status === 'online' ? 'pos' : '')}>{r.status}</span></label>)}
        {g.clusters.length > 0 && <div className="dim" style={{ fontSize: 11, margin: '6px 0 2px' }}>Whole clusters:</div>}
        {g.clusters.map(c => { const serving = g.activeContracts.some(a => a.clusterIds.includes(c.id)); return <label key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}><input type="checkbox" checked={inSpot.has(c.id)} onChange={e => setMsg(st.setSpot(c.id, e.target.checked).message)} /><span style={{ flex: 1 }}>{c.name} <span className="dim">({num(c.stats?.accelerators ?? 0)} GPUs)</span></span>{serving ? <span className="tag">on contract</span> : <span className="tag pos">idle</span>}</label>; })}
        <div className="mono" style={{ marginTop: 6 }}>Projected spot revenue: <b className="pos">{usd(sp.revenue)}</b>/mo{price < (g.spotReserve ?? 0) ? <span className="warn"> (below your reserve)</span> : ''}</div>
      </Panel>
    </div>
    <div className="col"><Tip>A <b>PPA</b> is a long contract to buy fixed MW from a power plant. It is cheaper than spot, but you pay for the committed MW even if unused (surplus is resold at a discount). <b>Spot GPU</b> sells idle racks hour by hour — no cluster needed.</Tip>{live.length + contracts.length > 0 && <><h3>Your power contracts ({contracts.length})</h3><div className="grid g3">{contracts.map(c => <Panel key={c.id} title={`${ICON[c.source]} ${c.supplier}`} right={<span className="tag">{c.source}</span>}>
      <div className="mono">{c.mw} MW · ${c.priceUSDPerMWh}/MWh · take-or-pay {usd(c.mw * c.priceUSDPerMWh * HOURS_PER_MONTH)}/mo</div>
      <div className="dim" style={{ fontSize: 12 }}>{g.month < c.startMonth ? 'starts ' + dateOf(c.startMonth) : 'ends ' + dateOf(c.endMonth) + ` · ${c.endMonth - g.month} mo left`} · overdraw +{Math.round(c.overdrawPct * 100)}% at ×{c.overageMult} · firmness {Math.round(c.firmness * 100)}%</div></Panel>)}</div></>}
    <h3>Power plant offers ({(g.powerOffers ?? []).length})</h3>
    {(g.powerOffers ?? []).length === 0 && <span className="dim">No offers right now — new ones appear most months.</span>}
    <div className="grid g3">{(g.powerOffers ?? []).map(o => { const m = mw[o.id] ?? o.mw; const take = m * o.priceUSDPerMWh * HOURS_PER_MONTH; const spotCost = Math.min(draw, m) * spotMWh * HOURS_PER_MONTH; const save = spotCost - Math.min(draw, m) * o.priceUSDPerMWh * HOURS_PER_MONTH;
      return <Panel key={o.id} glow title={`${ICON[o.source]} ${o.supplier}`} right={<span className="tag">{o.source}</span>}>
        <div className="mono">${o.priceUSDPerMWh}/MWh <span className={o.priceUSDPerMWh < spotMWh ? 'pos' : 'neg'}>({o.priceUSDPerMWh < spotMWh ? '−' : '+'}{Math.abs(Math.round((o.priceUSDPerMWh / spotMWh - 1) * 100))}% vs spot)</span> · {o.termMonths} mo</div>
        <table style={{ fontSize: 12, margin: '6px 0' }}><tbody>
          <tr><td className="dim">Firmness</td><td>{Math.round(o.firmness * 100)}% months delivered</td></tr>
          <tr><td className="dim">Oversubscription limit</td><td>+{Math.round(o.overdrawPct * 100)}% over commit, billed ×{o.overageMult}</td></tr>
          <tr><td className="dim">Take-or-pay</td><td className="mono">{usd(take)}/mo</td></tr>
          <tr><td className="dim">Covers</td><td>{Math.round(Math.min(1, m / draw) * 100)}% of today's {drawMW.toFixed(2)} MW draw</td></tr></tbody></table>
        <div className="dim" style={{ fontSize: 11 }}>{POWER_SOURCES[o.source].lesson}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>Commit <input type="number" min={1} value={m} onChange={e => setMw({ ...mw, [o.id]: Math.max(1, +e.target.value || 1) })} style={{ width: 60 }} /> MW
          <button className="btn go" onClick={() => setMsg(st.signPower(o.id, m).message)}>SIGN PPA</button></div>
        <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{drawMW <= 0.01 ? 'Nothing is drawing power yet — you would pay for unused MW (resold at 80% of spot).' : save >= 0 ? `≈ ${usd(save)}/mo cheaper than spot at today's load.` : `≈ ${usd(-save)}/mo dearer than spot at today's load.`} Offer open until {dateOf(o.offerUntil)}.</div></Panel>; })}</div>
  </div></div></div>;
}
