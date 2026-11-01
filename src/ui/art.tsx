import type { CatalogItem } from '../types';
import { vendorColor } from './common';

/** Procedural "die shot" for any catalog item. Deterministic from id. */
export function ItemArt({ item, size = 96 }: { item: CatalogItem; size?: number }) {
  const c = vendorColor(item.vendor);
  const h = [...item.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const r = (n: number) => ((h >> n) & 15) / 15;
  const S = 100;
  const body = (() => {
    switch (item.kind) {
      case 'accelerator': {
        const hbm = Math.min(8, Math.max(0, Math.round(item.memGB / 36)));
        const wafer = item.formFactor === 'wafer';
        if (wafer) return <><rect x="14" y="14" width="72" height="72" rx="6" fill="#0d1520" stroke={c} strokeWidth="2" />{Array.from({ length: 49 }).map((_, i) => <rect key={i} x={20 + (i % 7) * 9.2} y={20 + Math.floor(i / 7) * 9.2} width="7.4" height="7.4" fill={c} opacity={0.35 + r(i % 12) * 0.5} />)}</>;
        return <>
          <rect x="6" y="18" width="88" height="64" rx="5" fill="#0c1420" stroke="#2b3b50" />
          <rect x="30" y="28" width="40" height="44" rx="3" fill="#10202f" stroke={c} strokeWidth="1.6" />
          {Array.from({ length: 24 }).map((_, i) => <rect key={i} x={33 + (i % 6) * 6} y={31 + Math.floor(i / 6) * 10} width="5" height="8" fill={c} opacity={0.3 + r(i % 14) * 0.6} />)}
          {Array.from({ length: hbm }).map((_, i) => { const left = i % 2 === 0, row = Math.floor(i / 2); return <rect key={i} x={left ? 11 : 74} y={22 + row * 14} width="15" height="12" rx="1.5" fill="#1d3b30" stroke="#3ddc97" strokeWidth=".8" />; })}
        </>;
      }
      case 'cpu': return <><rect x="22" y="22" width="56" height="56" rx="4" fill="#0e1722" stroke={c} strokeWidth="1.6" />{Array.from({ length: 16 }).map((_, i) => <rect key={i} x={28 + (i % 4) * 12} y={28 + Math.floor(i / 4) * 12} width="9" height="9" fill={c} opacity={0.3 + r(i) * 0.5} />)}</>;
      case 'switch': return <><rect x="4" y="36" width="92" height="28" rx="3" fill="#0e1722" stroke={c} />{Array.from({ length: 16 }).map((_, i) => <rect key={i} x={9 + i * 5.4} y={44} width="4" height="12" fill="#1c2c3e" stroke="#3a516c" strokeWidth=".5" />)}{Array.from({ length: 16 }).map((_, i) => <circle key={i} className="led" style={{ animationDelay: `${(i % 5) * .2}s` }} cx={11 + i * 5.4} cy={40} r=".9" fill={i % 3 ? '#3ddc97' : c} />)}</>;
      case 'nic': return <><rect x="8" y="30" width="84" height="40" rx="3" fill="#0e1722" stroke={c} /><rect x="14" y="36" width="22" height="28" fill="#142234" stroke={c} strokeWidth=".8" /><rect x="40" y="38" width="24" height="24" rx="2" fill="#10202f" stroke={c} /><rect x="70" y="34" width="16" height="8" fill="#222" /><rect x="70" y="46" width="16" height="8" fill="#222" /></>;
      case 'rack': return <><rect x="26" y="6" width="48" height="88" rx="2" fill="#0d1520" stroke={c} />{Array.from({ length: 10 }).map((_, i) => <rect key={i} x="30" y={10 + i * 8.3} width="40" height="6" fill="#16263a" stroke="#2b3b50" strokeWidth=".5" />)}</>;
      case 'chassis': return <><rect x="6" y="34" width="88" height="32" rx="3" fill="#0e1722" stroke={c} />{Array.from({ length: 8 }).map((_, i) => <rect key={i} x={12 + i * 10} y="40" width="7" height="20" fill="#16263a" stroke="#2b3b50" strokeWidth=".5" />)}</>;
      case 'power': return <><rect x="22" y="14" width="56" height="72" rx="3" fill="#0e1722" stroke="#ffb020" /><path d="M54 24 L38 54 H50 L46 78 L64 44 H52 Z" fill="#ffb020" /></>;
      case 'cooling': return <><rect x="20" y="14" width="60" height="72" rx="3" fill="#0e1722" stroke="#4fd1ff" />{Array.from({ length: 5 }).map((_, i) => <path key={i} d={`M28 ${30 + i * 11} q 11 -8 22 0 t 22 0`} stroke="#4fd1ff" fill="none" strokeWidth="1.5" />)}</>;
      case 'cable': return <path d="M6 70 C30 20, 70 90, 94 30" stroke={c} strokeWidth="4" fill="none" strokeLinecap="round" />;
      default: return <><rect x="14" y="26" width="72" height="48" rx="3" fill="#0e1722" stroke={c} />{Array.from({ length: 6 }).map((_, i) => <rect key={i} x={20 + i * 11} y="34" width="8" height="32" fill={c} opacity={0.35 + r(i) * 0.4} />)}</>;
    }
  })();
  return <svg width={size} height={size} viewBox={`0 0 ${S} ${S}`} style={{ filter: `drop-shadow(0 0 8px ${c}55)`, flex: 'none' }}>{body}</svg>;
}

export interface ElevItem { label: string; u: number; color: string; kw?: number }
/** Rack elevation: stacks items bottom-to-top, shows empty U. */
export function RackElevation({ units, items, width = 230, name }: { units: number; items: ElevItem[]; width?: number; name?: string }) {
  const uh = 11, pad = 18, H = units * uh + pad * 2;
  let cursor = 0;
  return <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`}>
    <rect x="4" y="4" width={width - 8} height={H - 8} rx="6" fill="#0a1018" stroke="#2b3b50" />
    {name && <text x={width / 2} y="13" textAnchor="middle" fill="#7d90a6" fontSize="9">{name}</text>}
    {Array.from({ length: units }).map((_, i) => <g key={i}><rect x="14" y={H - pad - (i + 1) * uh} width={width - 28} height={uh - 1} fill="#0e1520" stroke="#18222f" strokeWidth=".5" /><text x="8" y={H - pad - i * uh - 3} fill="#33465c" fontSize="6">{i + 1}</text></g>)}
    {items.map((it, n) => { const y = H - pad - (cursor + it.u) * uh; const out = <g key={n}>
      <rect x="14" y={y} width={width - 28} height={it.u * uh - 1} fill={it.color + '33'} stroke={it.color} />
      <text x="20" y={y + Math.min(it.u * uh, 16) / 2 + 3} fill="#d7e2ee" fontSize="8.5">{it.label.slice(0, 30)}</text>
      {Array.from({ length: Math.min(6, it.u * 2) }).map((_, k) => <circle key={k} className="led" style={{ animationDelay: `${k * .25}s` }} cx={width - 24 - k * 6} cy={y + 5} r="1.4" fill="#3ddc97" />)}
    </g>; cursor += it.u; return out; })}
  </svg>;
}

/** Top-down hall floor. */
export function HallFloor({ slots, racks, selected, onSelect, cooling }: { slots: number; racks: { slot: number; status: string; label: string; kw: number; id: string }[]; selected?: string; onSelect?: (id: string | null, slot: number) => void; cooling: string }) {
  const cols = Math.min(10, Math.max(4, Math.ceil(Math.sqrt(slots * 2)))), rows = Math.ceil(slots / cols);
  const cw = 54, ch = 74, W = cols * cw + 40, H = rows * ch + 50;
  const col = (s: string) => s === 'online' ? '#3ddc97' : s === 'failed' ? '#ff5d73' : s === 'commissioning' ? '#ffb020' : '#4fd1ff';
  const tint = cooling === 'air' ? '#4fd1ff' : cooling === 'immersion' ? '#9b8cff' : '#3a8bff';
  return <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 460 }}>
    <rect x="4" y="4" width={W - 8} height={H - 8} rx="10" fill="#080d14" stroke="#223042" />
    {Array.from({ length: slots }).map((_, i) => {
      const x = 20 + (i % cols) * cw, y = 34 + Math.floor(i / cols) * ch, rk = racks.find(r => r.slot === i);
      const aisle = Math.floor(i / cols) % 2 === 0;
      return <g key={i} onClick={() => onSelect?.(rk?.id ?? null, i)} style={{ cursor: 'pointer' }}>
        <rect x={x} y={y + ch - 6} width={cw - 8} height="4" fill={aisle ? tint + '22' : '#ff5d7322'} />
        <rect x={x} y={y} width={cw - 8} height={ch - 12} rx="3" fill={rk ? col(rk.status) + '22' : '#0c1219'} stroke={rk ? (selected === rk.id ? '#fff' : col(rk.status)) : '#1c2938'} strokeDasharray={rk ? '' : '3 3'} strokeWidth={selected === rk?.id ? 2 : 1} />
        {rk ? <>{Array.from({ length: 7 }).map((_, k) => <rect key={k} x={x + 5} y={y + 6 + k * 7} width={cw - 18} height="4.5" fill={col(rk.status)} opacity=".35" />)}
          {rk.status === 'online' && Array.from({ length: 3 }).map((_, k) => <circle key={k} className="led" style={{ animationDelay: `${(i + k) * .17}s` }} cx={x + cw - 15} cy={y + 9 + k * 14} r="1.8" fill="#3ddc97" />)}
          <text x={x + (cw - 8) / 2} y={y + ch - 17} textAnchor="middle" fontSize="7" fill="#d7e2ee">{rk.kw.toFixed(0)} kW</text></>
          : <text x={x + (cw - 8) / 2} y={y + (ch - 12) / 2 + 3} textAnchor="middle" fontSize="11" fill="#2a3a4e">+</text>}
      </g>; })}
    <text x="20" y="22" fill="#7d90a6" fontSize="9" letterSpacing="2">COLD AISLE ▬ HOT AISLE · {cooling.toUpperCase()}</text>
  </svg>;
}
