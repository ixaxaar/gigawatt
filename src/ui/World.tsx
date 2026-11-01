import { useMemo, useState } from 'react';
import type { GameState, HallState } from '../types';
import { getItem } from '../data';
import { validateRack } from '../sim/validate';
import { vendorColor, dateOf } from './common';

const TW = 78, TH = 39, RH = 70;
const P = (c: number, r: number, z = 0) => [(c - r) * TW / 2, (c + r) * TH / 2 - z] as const;
const pts = (a: (readonly [number, number])[]) => a.map(p => p.join(',')).join(' ');
const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

function Box({ c, r, w, d, h, color, glow, ghost, onClick, onEnter, onLeave, children, sel }: { c: number; r: number; w: number; d: number; h: number; color: string; glow?: string; ghost?: boolean; sel?: boolean; onClick?: () => void; onEnter?: () => void; onLeave?: () => void; children?: any }) {
  const A = P(c, r, h), B = P(c + w, r, h), C = P(c + w, r + d, h), D = P(c, r + d, h);
  const Cb = P(c + w, r + d), Db = P(c, r + d), Bb = P(c + w, r);
  const op = ghost ? 0.35 : 1;
  return <g opacity={op} onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave} style={{ cursor: onClick ? 'pointer' : 'default', filter: glow ? `drop-shadow(0 0 7px ${glow})` : undefined }}>
    <polygon points={pts([D, C, Cb, Db])} fill={shade(color, 0.62)} stroke={sel ? '#fff' : '#05080c'} strokeWidth={sel ? 1.6 : 0.8} strokeDasharray={ghost ? '4 3' : ''} />
    <polygon points={pts([C, B, Bb, Cb])} fill={shade(color, 0.4)} stroke={sel ? '#fff' : '#05080c'} strokeWidth={sel ? 1.6 : 0.8} strokeDasharray={ghost ? '4 3' : ''} />
    <polygon points={pts([A, B, C, D])} fill={shade(color, 1.0)} stroke={sel ? '#fff' : '#05080c'} strokeWidth={sel ? 1.6 : 0.8} strokeDasharray={ghost ? '4 3' : ''} />
    {children}
  </g>;
}
const lerp = (a: readonly [number, number], b: readonly [number, number], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as const;

function RackSprite({ c, r, color, status, kw, sel, label, onClick, onEnter, onLeave, seed, tint, badge }: { c: number; r: number; color: string; status: string; kw: number; sel: boolean; label: string; onClick: () => void; onEnter: () => void; onLeave: () => void; seed: number; tint?: string; badge?: { color: string; letter: string } }) {
  const pad = 0.12, w = 1 - pad * 2, d = 1 - pad * 2, h = RH;
  const online = status === 'online', failed = status === 'failed', ghost = status === 'ordered' || status === 'installing';
  const base = failed ? '#7a2030' : status === 'commissioning' ? '#6a5016' : tint ?? '#1c2a3c';
  const D = P(c + pad, r + pad + d, h), Cc = P(c + pad + w, r + pad + d, h), Db = P(c + pad, r + pad + d), Cb = P(c + pad + w, r + pad + d);
  const strips = 9;
  return <Box c={c + pad} r={r + pad} w={w} d={d} h={h} color={base} ghost={ghost} sel={sel} glow={online ? color + 'aa' : failed ? '#ff5d73' : undefined} onClick={onClick} onEnter={onEnter} onLeave={onLeave}>
    {Array.from({ length: strips }).map((_, i) => { const t0 = (i + 0.2) / strips, t1 = (i + 0.8) / strips;
      const a = lerp(D, Db, t0), b = lerp(D, Db, t1), a2 = lerp(Cc, Cb, t0), b2 = lerp(Cc, Cb, t1);
      return <g key={i}><polygon points={pts([a, a2, b2, b])} fill={online ? (tint ? '#ffffff' : color) : status === 'commissioning' ? '#ffb020' : '#3a4a5e'} opacity={online ? 0.28 + ((seed + i * 7) % 10) / 40 : 0.4} />
        {online && <circle className="led" style={{ animationDelay: `${((seed + i) % 9) * 0.17}s` }} cx={lerp(a2, b2, 0.5)[0] - 5} cy={lerp(a2, b2, 0.5)[1]} r="1.5" fill={(seed + i) % 5 === 0 ? '#ffb020' : '#3ddc97'} />}</g>; })}
    {failed && [0, 1, 2].map(i => <circle key={i} className="smoke" style={{ animationDelay: `${i * 0.7}s` }} cx={P(c + 0.5, r + 0.5, h)[0]} cy={P(c + 0.5, r + 0.5, h)[1]} r="6" fill="#999" />)}
    <text x={P(c + 0.5, r + 0.5, h)[0]} y={P(c + 0.5, r + 0.5, h)[1] + 3} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700" style={{ pointerEvents: 'none', textShadow: '0 0 3px #000' }}>{kw >= 1 ? kw.toFixed(0) : ''}</text>
    {badge && <g style={{ pointerEvents: 'none' }}><circle cx={P(c + 0.5, r + 0.5, h + 14)[0]} cy={P(c + 0.5, r + 0.5, h + 14)[1]} r="8" fill={badge.color} stroke="#05080c" /><text x={P(c + 0.5, r + 0.5, h + 14)[0]} y={P(c + 0.5, r + 0.5, h + 14)[1] + 3.5} textAnchor="middle" fontSize="10" fontWeight="800" fill="#05080c">{badge.letter}</text></g>}
    <title>{label}</title>
  </Box>;
}

function vendorOfDesign(g: GameState, designId: string) {
  const d = g.racks.find(r => r.id === designId); const t = d && g.trays.find(x => d.items.some(i => i.type === 'tray' && i.trayId === x.id));
  const id = t?.chassisId ?? ''; return id.startsWith('nv') ? 'nvidia' : id.includes('mi') || id.startsWith('gig') || id.startsWith('sm-ubb') ? 'amd' : id.startsWith('int') ? 'intel' : id.startsWith('tt') ? 'tenstorrent' : id.startsWith('cb') ? 'cerebras' : 'generic';
}

export interface WorldProps { game: GameState; hall: HallState; selected?: string | null; onSelect?: (rackId: string | null, slot: number) => void; compact?: boolean; fill?: boolean }
type Mode = 'status' | 'thermal' | 'power';
const CLUSTER_COLORS = ['#4fd1ff', '#c792ea', '#ffd166', '#ff8fab', '#7ee787', '#f78c6c'];
const ramp = (t: number) => t < 0.5 ? `rgb(${Math.round(40 + 430 * t * .5)},${Math.round(150 + 60 * t)},${Math.round(90 - 60 * t)})` : `rgb(${Math.round(255)},${Math.round(210 - 330 * (t - .5))},${Math.round(60 - 40 * (t - .5))})`;
export default function World({ game: g, hall, selected, onSelect, compact, fill }: WorldProps) {
  const [hover, setHover] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('status');
  const cols = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(hall.rackSlots * 1.3)))), rows = Math.ceil(hall.rackSlots / cols);
  // paired rows: fronts face a cold aisle, backs face a hot aisle
  const COLD = 0.9, HOT = 0.9;
  const rowY: number[] = []; { let y = 0; for (let k = 0; k < rows; k++) { if (k > 0) y += k % 2 === 1 ? COLD : HOT; rowY.push(y); y += 1; } }
  const depth = rowY[rows - 1] + 1;
  const info = useMemo(() => Object.fromEntries(hall.racks.map(p => { const d = g.racks.find(r => r.id === p.designId); const v = d ? validateRack(d, g.trays, getItem).stats : null; const spec = d ? getItem(d.rackId) as any : null; return [p.id, { kw: v?.kW ?? 0, accels: v?.accels ?? 0, name: d?.name ?? p.designId, vendor: vendorOfDesign(g, p.designId), maxKW: spec?.maxKW ?? 40, weight: v?.weightKg ?? 0 }]; })), [hall.racks, g.racks, g.trays]);
  const heat = hall.racks.reduce((n, p) => n + (p.status === 'online' || p.status === 'commissioning' ? info[p.id]?.kw ?? 0 : 0), 0);
  const overheat = heat > hall.coolingKW, overpower = heat > hall.itPowerKW;
  const eq = (rec: Record<string, number>) => Object.entries(rec).flatMap(([id, n]) => Array.from({ length: Math.min(n, 5) }, (_, i) => ({ id, i })));
  const power = eq(hall.powerEquip).slice(0, 5), cool = eq(hall.coolingEquip).slice(0, 5);
  const minX = P(-2.6, depth + 0.6)[0] - 60, maxX = P(cols + 0.6, -2.6)[0] + 80, minY = P(-2.6, -2.6, RH)[1] - 10, maxY = P(cols + 0.6, depth + 0.6)[1] + 4;
  const slotPos = (i: number) => [i % cols, rowY[Math.floor(i / cols)]] as const;
  const clusterIdx = Object.fromEntries(g.clusters.map((c, i) => [c.id, i]));
  const clusterOf = (pid: string) => g.clusters.find(c => c.rackIds.includes(pid));
  const avgShare = hall.coolingKW / Math.max(1, hall.racks.length);
  const tintOf = (pid: string, status: string): string | undefined => {
    if (mode === 'status' || status !== 'online' && status !== 'commissioning') return undefined;
    const i = info[pid]; if (!i) return undefined;
    const t = mode === 'thermal' ? Math.min(1, i.kw / Math.max(1, avgShare) * (overheat ? 1.25 : .85)) : Math.min(1, i.kw / Math.max(1, i.maxKW));
    return ramp(t);
  };
  const items: { key: string; z: number; el: any }[] = [];
  for (let i = 0; i < hall.rackSlots; i++) { const [c, r] = slotPos(i); const pr = hall.racks.find(x => x.slot === i); const cl = pr ? clusterOf(pr.id) : undefined;
    items.push({ key: 'rk' + i, z: c + r + 0.5, el: pr ? <RackSprite key={pr.id} c={c} r={r} color={vendorColor(info[pr.id]?.vendor ?? 'generic')} status={pr.status} kw={info[pr.id]?.kw ?? 0} sel={(pin ?? selected) === pr.id} label={`${info[pr.id]?.name} · ${pr.status}`} seed={i * 3 + c} tint={tintOf(pr.id, pr.status)} badge={cl ? { color: CLUSTER_COLORS[clusterIdx[cl.id] % CLUSTER_COLORS.length], letter: String.fromCharCode(65 + clusterIdx[cl.id] % 26) } : undefined}
      onClick={() => { setPin(pin === pr.id ? null : pr.id); onSelect?.(pr.id, i); }} onEnter={() => setHover(pr.id)} onLeave={() => setHover(null)} /> : null }); }
  power.forEach((e, k) => { const it = getItem(e.id) as any; items.push({ key: 'pw' + e.id + e.i, z: -2 + k * 0.01, el: <Box key={'pw' + e.id + e.i} c={-1.8 + k * 1.1} r={-2.1} w={0.9} d={0.9} h={42} color={it?.powerType === 'transformer' ? '#3a4658' : it?.powerType === 'ups' ? '#2a4a3c' : it?.powerType === 'genset' ? '#5a4a22' : '#34404f'} glow="#ffb02066"><text x={P(-1.8 + k * 1.1 + 0.45, -2.1 + 0.45, 42)[0]} y={P(-1.8 + k * 1.1 + 0.45, -2.1 + 0.45, 42)[1] + 4} textAnchor="middle" fontSize="13">⚡</text></Box> }); });
  cool.forEach((e, k) => { const it = getItem(e.id) as any; const liquid = it?.serves === 'dlc' || it?.serves === 'immersion'; items.push({ key: 'cl' + e.id + e.i, z: k * 1.1 - 2 + 0.01, el: <Box key={'cl' + e.id + e.i} c={-2.1} r={-0.4 + k * 1.1} w={0.9} d={0.9} h={36} color={liquid ? '#1f4f78' : '#2c5560'} glow="#4fd1ff66"><text x={P(-2.1 + 0.45, -0.4 + k * 1.1 + 0.45, 36)[0]} y={P(-2.1 + 0.45, -0.4 + k * 1.1 + 0.45, 36)[1] + 4} textAnchor="middle" fontSize="13">❄</text></Box> }); });
  items.sort((a, b) => a.z - b.z);
  const liquid = hall.coolingClass === 'dlc' || hall.coolingClass === 'immersion';
  const sel = pin ?? (hover ?? null);
  const hv = sel ? hall.racks.find(p => p.id === sel) : null;
  const top = (i: number, z = RH) => { const [c, r] = slotPos(i); return P(c + 0.5, r + 0.5, z); };
  const links = g.clusters.map((cl, ci) => { const slots = cl.rackIds.map(id => hall.racks.find(p => p.id === id)?.slot).filter((x): x is number => x != null); return { cl, ci, slots }; }).filter(x => x.slots.length > 1);
  const pairs = Math.floor(rows / 2) + (rows % 2);
  return <div className={'world' + (overheat ? ' hot' : '')} style={{ height: fill ? '100%' : compact ? 'max(470px, 52vh)' : 'max(560px, calc(100vh - 260px))' }}>
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="fl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#152234" /><stop offset="1" stopColor="#0a121c" /></linearGradient></defs>
      <g opacity=".85">
        {[0, 1].map(k => { const bx = minX + 40 + k * 60, by = P(-2.6, -2.6)[1] + 70 + k * 26; return <g key={k}><path d={`M${bx - 28},${by} Q${bx - 16},${by - 38} ${bx - 22},${by - 80} L${bx + 22},${by - 80} Q${bx + 16},${by - 38} ${bx + 28},${by} Z`} fill="#1b2a3c" stroke="#2b4a68" />
          {[0, 1, 2].map(i => <circle key={i} className="smoke" style={{ animationDelay: `${i * 0.8 + k * 0.4}s` }} cx={bx} cy={by - 84} r="9" fill="#9fb8d0" />)}</g>; })}
        {(() => { const px = maxX - 90, py = P(cols + 0.6, -2.6)[1] + 120; return <g stroke="#3a526c" strokeWidth="3" fill="none"><path d={`M${px},${py} L${px},${py - 120} M${px - 30},${py - 100} L${px + 30},${py - 100} M${px - 22},${py - 76} L${px + 22},${py - 76} M${px - 40},${py} L${px},${py - 120} L${px + 40},${py}`} />
          <path d={`M${px - 30},${py - 100} Q${px - 110},${py - 70} ${px - 190},${py - 100}`} stroke="#ffb02088" strokeWidth="1.6" className="flow fast" /></g>; })()}
      </g>
      <polygon points={pts([P(-2.6, -2.6), P(cols + 0.6, -2.6), P(cols + 0.6, depth + 0.6), P(-2.6, depth + 0.6)])} fill="url(#fl)" stroke="#2b3b50" />
      {/* raised-floor tile grid */}
      <g stroke="#162435" strokeWidth=".6">{Array.from({ length: Math.ceil(cols + 3.2) }).map((_, k) => <line key={'v' + k} x1={P(-2.6 + k, -2.6)[0]} y1={P(-2.6 + k, -2.6)[1]} x2={P(-2.6 + k, depth + 0.6)[0]} y2={P(-2.6 + k, depth + 0.6)[1]} />)}
        {Array.from({ length: Math.ceil(depth + 3.2) }).map((_, k) => <line key={'h' + k} x1={P(-2.6, -2.6 + k)[0]} y1={P(-2.6, -2.6 + k)[1]} x2={P(cols + 0.6, -2.6 + k)[0]} y2={P(cols + 0.6, -2.6 + k)[1]} />)}</g>
      {/* hot / cold aisle strips with airflow */}
      {Array.from({ length: pairs }).map((_, k) => { const r0 = rowY[2 * k]; const r1 = rowY[2 * k + 1]; if (r1 == null) return null; const cs = r0 + 1, ce = r1; return <g key={'ca' + k}><polygon points={pts([P(0, cs), P(cols, cs), P(cols, ce), P(0, ce)])} fill="#38bdf8" fillOpacity={.13} />
        <path d={`M ${P(0.2, (cs + ce) / 2).join(',')} L ${P(cols - 0.2, (cs + ce) / 2).join(',')}`} stroke="#7dd3fc" strokeWidth="1.6" strokeDasharray="6 8" fill="none" className="flow" /><text x={P(cols / 2, (cs + ce) / 2)[0]} y={P(cols / 2, (cs + ce) / 2)[1] + 3} textAnchor="middle" fontSize="9" fill="#7dd3fc" opacity=".8" style={{ letterSpacing: '.3em' }}>COLD AISLE</text></g>; })}
      {Array.from({ length: Math.floor((rows - 1) / 2) }).map((_, k) => { const a = rowY[2 * k + 1] + 1, b = rowY[2 * k + 2]; return <g key={'ha' + k}><polygon points={pts([P(0, a), P(cols, a), P(cols, b), P(0, b)])} fill="#ff5d73" fillOpacity={overheat ? .26 : .1} />
        <text x={P(cols / 2, (a + b) / 2)[0]} y={P(cols / 2, (a + b) / 2)[1] + 3} textAnchor="middle" fontSize="9" fill="#ff8a9b" opacity=".8" style={{ letterSpacing: '.3em' }}>HOT AISLE</text></g>; })}
      {/* slot tiles */}
      {Array.from({ length: hall.rackSlots }).map((_, i) => { const [c, r] = slotPos(i); const occ = hall.racks.some(x => x.slot === i);
        return <g key={i} onClick={() => !occ && onSelect?.(null, i)} style={{ cursor: onSelect ? 'pointer' : 'default' }}><polygon points={pts([P(c, r), P(c + 1, r), P(c + 1, r + 1), P(c, r + 1)])} fill={occ ? '#0b1522' : '#4fd1ff08'} stroke={occ ? '#1f2e42' : '#2d5878'} strokeWidth={occ ? .8 : 1} strokeDasharray={occ ? '' : '3 3'} />
          {!occ && <text x={P(c + .5, r + .5)[0]} y={P(c + .5, r + .5)[1] + 3} textAnchor="middle" fontSize="9" fill="#4fd1ff" opacity=".55">{String.fromCharCode(65 + Math.floor(i / cols))}{(i % cols) + 1}</text>}</g>; })}
      {/* thermal floor glow */}
      {mode === 'thermal' && hall.racks.map(p => { const i = info[p.id]; if (!i || (p.status !== 'online' && p.status !== 'commissioning')) return null; const [c, r] = slotPos(p.slot); const t = Math.min(1, i.kw / Math.max(1, avgShare)); const [x, y] = P(c + .5, r + .5); return <ellipse key={'g' + p.id} cx={x} cy={y} rx={TW * .9} ry={TH * .9} fill={ramp(t)} opacity={.22 + .25 * t} style={{ pointerEvents: 'none' }} />; })}
      {cool.length > 0 && <path d={`M ${P(-1.6, 0.4).join(',')} L ${P(-1.6, depth + 0.2).join(',')} ${Array.from({ length: pairs }).map((_, k) => `M ${P(-1.6, rowY[2 * k] + 0.5).join(',')} L ${P(cols + 0.2, rowY[2 * k] + 0.5).join(',')}`).join(' ')}`} stroke={liquid ? '#4fd1ff' : '#4fd1ff55'} strokeWidth={liquid ? 2.4 : 1.4} fill="none" className="flow" />}
      {power.length > 0 && <path d={`M ${P(-1.3, -1.4).join(',')} L ${P(cols + 0.2, -1.4).join(',')} ${Array.from({ length: rows }).map((_, k) => `M ${P(cols + 0.15, -1.4).join(',')} L ${P(cols + 0.15, rowY[k] + .5).join(',')}`).join(' ')}`} stroke="#ffb020" strokeWidth="2" fill="none" className="flow fast" opacity=".8" />}
      {items.map(it => it.el)}
      {/* overhead fabric cables per cluster */}
      {links.map(({ cl, ci, slots }) => { const col = CLUSTER_COLORS[ci % CLUSTER_COLORS.length]; const ordered = [...slots].sort((a, b) => a - b); const d = ordered.map((sl, k) => { const [x, y] = top(sl, RH + 22); return `${k ? 'L' : 'M'} ${x},${y}`; }).join(' ');
        return <g key={cl.id} style={{ pointerEvents: 'none' }}><path d={d} stroke={col} strokeWidth="2.4" fill="none" opacity=".9" className="flow fast" strokeLinejoin="round" /><path d={d} stroke="#000" strokeWidth="5" fill="none" opacity=".25" /></g>; })}
      {overheat && <text x={(minX + maxX) / 2} y={minY + 34} textAnchor="middle" fill="#ff5d73" fontSize="22" fontWeight="800" className="led">🔥 COOLING OVERLOAD — racks will throttle</text>}
      {!overheat && overpower && <text x={(minX + maxX) / 2} y={minY + 34} textAnchor="middle" fill="#ffb020" fontSize="22" fontWeight="800" className="led">⚡ POWER OVERLOAD</text>}
    </svg>
    <div className="worldhud"><b>{hall.name}</b> · {hall.coolingClass.toUpperCase()} · {heat.toFixed(0)}/{hall.coolingKW} kW cooling · {hall.itPowerKW} kW power · PUE {hall.pue.toFixed(2)}</div>
    <div className="worldmodes">{(['status', 'thermal', 'power'] as Mode[]).map(m => <button key={m} className={'btn sm' + (mode === m ? ' pri' : '')} onClick={() => setMode(m)}>{m === 'status' ? '👁 Status' : m === 'thermal' ? '🌡 Thermal' : '⚡ Power'}</button>)}</div>
    <div className="worldlegend">{mode !== 'status' ? <><span style={{ background: 'linear-gradient(90deg,#28a05a,#ffd23c,#ff3c3c)', width: 80, height: 8, display: 'inline-block', borderRadius: 4 }} /> low → high load</> : <><i style={{ background: '#3ddc97' }} /> online <i style={{ background: '#ffb020' }} /> commissioning <i style={{ background: '#ff5d73' }} /> failed <i style={{ background: '#3a4a5e' }} /> installing</>}{g.clusters.map((c, ci) => <span key={c.id}><i style={{ background: CLUSTER_COLORS[ci % CLUSTER_COLORS.length] }} /> {String.fromCharCode(65 + ci % 26)} {c.name}</span>)}</div>
    {hv && info[hv.id] && <div className="worldtip"><b>{info[hv.id].name}</b><div>{hv.status}{hv.status !== 'online' ? ` → ${dateOf(hv.readyMonth)}` : ''} · slot {String.fromCharCode(65 + Math.floor(hv.slot / cols))}{(hv.slot % cols) + 1}</div>
      <div className="mono">{info[hv.id].kw.toFixed(0)} / {info[hv.id].maxKW} kW · {info[hv.id].accels} accelerators · {Math.round(info[hv.id].weight)} kg</div><div className="dim">{hv.clusterId ?? clusterOf(hv.id)?.name ?? 'not in a cluster'}{pin ? ' · pinned (click again to release)' : ''}</div></div>}
  </div>;
}
