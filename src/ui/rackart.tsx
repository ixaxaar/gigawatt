// Realistic 19" rack elevation art: rails, mounting holes, server fronts with fan walls and drive bays, switches with port arrays, PDUs.
import type { CatalogItem } from '../types';
import { vendorColor } from './common';
import { short } from './board';

export const UH = 27, RW = 640, RAIL = 34;
export const uBottom = (units: number, top: number, u: number) => top + (units - u) * UH;

export function RackFrame({ units, top, name }: { units: number; top: number; name: string }) {
  const H = units * UH;
  return <g>
    <rect x={6} y={top - 26} width={RW + 8} height={H + 52} rx={10} fill="#0a1017" stroke="#5a6b7d" strokeWidth={4} />
    <rect x={RAIL} y={top} width={RW - RAIL * 2 + 14} height={H} fill="#05080c" />
    {[RAIL - 22, RW - RAIL + 14 - 2].map((x, k) => <g key={k}><rect x={x} y={top} width={24} height={H} fill="url(#steel)" stroke="#1b2128" />
      {Array.from({ length: units }).map((_, u) => <g key={u}>{[6, 15, 24].map(o => <rect key={o} x={x + 8} y={top + u * UH + o - 3} width={8} height={5} rx={1} fill="#06090c" stroke="#222a33" />)}</g>)}</g>)}
    {Array.from({ length: units }).map((_, i) => { const u = units - 1 - i; return <g key={u}><line x1={RAIL + 2} x2={RW - RAIL + 12} y1={top + i * UH} y2={top + i * UH} stroke="#18222d" /><text x={RAIL - 26} y={top + i * UH + UH / 2 + 3} fontSize={9} fill="#6c849a" textAnchor="end" fontFamily="'Share Tech Mono',monospace">{(u + 1) % 2 === 1 ? u + 1 : ''}</text></g>; })}
    <text x={RW / 2 + 4} y={top - 8} textAnchor="middle" fontSize={13} fill="#9bb7cc" style={{ letterSpacing: '.2em' }}>{name.toUpperCase().slice(0, 50)}</text>
    <rect x={6} y={top + H + 8} width={RW + 8} height={14} rx={4} fill="#111922" /><text x={RW / 2 + 4} y={top + H + 19} fontSize={9} fill="#5d7487" textAnchor="middle">FLOOR</text>
  </g>;
}

const Fan = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => <g><circle cx={cx} cy={cy} r={r} fill="#05080b" stroke="#2c3744" strokeWidth={1.5} />{[0, 72, 144, 216, 288].map(a => <path key={a} d={`M${cx},${cy} q${Math.cos(a * Math.PI / 180) * r * .7},${Math.sin(a * Math.PI / 180) * r * .7} ${Math.cos((a + 50) * Math.PI / 180) * r * .85},${Math.sin((a + 50) * Math.PI / 180) * r * .85}`} stroke="#3b4857" strokeWidth={1.6} fill="none" />)}<circle cx={cx} cy={cy} r={r * .18} fill="#3b4857" /></g>;

export type DevKind = 'tray' | 'switch' | 'storage' | 'power';
/** One device occupying `h` U at screen y (top) with width spanning the rails. */
export function Device({ kind, y, h, label, sub, color, selected, item, accel }: { kind: DevKind; y: number; h: number; label: string; sub: string; color: string; selected?: boolean; item?: CatalogItem; accel?: number }) {
  const x = RAIL + 2, w = RW - RAIL * 2 + 10, H = h * UH - 3, yy = y + 1.5;
  const c = item ? vendorColor(item.vendor) : color;
  const body = <g>
    <rect x={x} y={yy} width={w} height={H} rx={3} fill="url(#chassisG)" stroke={selected ? '#fff' : '#06090c'} strokeWidth={selected ? 2.5 : 1.4} style={selected ? { filter: 'drop-shadow(0 0 8px #4fd1ff)' } : undefined} />
    <rect x={x} y={yy} width={5} height={H} fill={color} /><rect x={x + w - 5} y={yy} width={5} height={H} fill={color} opacity={.6} />
    {/* rack ears + screws */}
    {[yy + 6, yy + H - 8].map((v, i) => <g key={i}><circle cx={x + 12} cy={v} r={2.6} fill="#8b939e" /><circle cx={x + w - 12} cy={v} r={2.6} fill="#8b939e" /></g>)}</g>;
  if (kind === 'tray') {
    const bigFans = h >= 4, fanR = bigFans ? 22 : Math.min(11, H / 2 - 4);
    const nF = bigFans ? Math.floor((w * .58) / (fanR * 2 + 8)) : Math.floor((w * .58) / (fanR * 2 + 6));
    const rows = bigFans ? Math.max(1, Math.floor((H - 16) / (fanR * 2 + 10))) : 1;
    return <g>{body}
      {Array.from({ length: rows }).map((_, r) => Array.from({ length: nF }).map((__, i) => <Fan key={`${r}-${i}`} cx={x + 30 + fanR + i * (fanR * 2 + (bigFans ? 8 : 6))} cy={yy + (rows === 1 ? H / 2 : 12 + fanR + r * (fanR * 2 + 10))} r={fanR} />))}
      <g transform={`translate(${x + w * .66},${yy + 6})`}>{Array.from({ length: Math.min(8, Math.max(2, h * 2)) }).map((_, i) => { const cols = h >= 4 ? 4 : 8, rr = Math.floor(i / cols), cc = i % cols; const bw = (w * .26) / cols - 3; return <rect key={i} x={cc * (bw + 3)} y={rr * 16} width={bw} height={12} rx={1.5} fill="#0a0d11" stroke="#46525f" />; })}</g>
      <rect x={x + w * .66} y={yy + H - 20} width={w * .26} height={14} rx={2} fill="#0b1118" stroke={c} /><text x={x + w * .66 + 6} y={yy + H - 9} fontSize={10} fill={c} fontWeight={700}>{label.slice(0, 24)}</text>
      <g>{[0, 1, 2].map(i => <circle key={i} cx={x + w - 26 + i * 6} cy={yy + 10} r={2.2} fill={i === 0 ? '#3ddc97' : i === 1 ? '#ffb020' : '#4fd1ff'} />)}</g>
      <text x={x + 36} y={yy + H - 4} fontSize={9} fill="#7f93a6" fontFamily="'Share Tech Mono',monospace">{sub}{accel ? ` · ${accel} accel` : ''}</text></g>;
  }
  if (kind === 'switch') return <g>{body}
    <rect x={x + 16} y={yy + 6} width={w - 150} height={H - 12} rx={2} fill="#05080b" stroke="#2c3744" />
    {Array.from({ length: 32 }).map((_, i) => { const cols = 16, r = Math.floor(i / cols), cc = i % cols; const pw = (w - 190) / cols - 2; return <g key={i}><rect x={x + 22 + cc * (pw + 2)} y={yy + 10 + r * ((H - 20) / 2)} width={pw} height={(H - 28) / 2} rx={1} fill="#10161d" stroke={i % 5 === 0 ? c : '#35414f'} /><circle cx={x + 22 + cc * (pw + 2) + pw / 2} cy={yy + 10 + r * ((H - 20) / 2) + (H - 28) / 2 + 3} r={1.4} fill={i % 3 === 0 ? '#3ddc97' : '#ffb020'} /></g>; })}
    <text x={x + w - 126} y={yy + H / 2 + 3} fontSize={10.5} fill={c} fontWeight={800}>{short(label).slice(0, 18)}</text><text x={x + w - 126} y={yy + H / 2 + 15} fontSize={8.5} fill="#7f93a6">{sub}</text></g>;
  if (kind === 'storage') return <g>{body}
    {Array.from({ length: h >= 4 ? 24 : 12 }).map((_, i) => { const cols = h >= 4 ? 12 : 12, r = Math.floor(i / cols), cc = i % cols; const bw = (w - 170) / cols - 3, bh = Math.min(26, (H - 14) / Math.ceil((h >= 4 ? 24 : 12) / cols) - 3); return <g key={i}><rect x={x + 18 + cc * (bw + 3)} y={yy + 8 + r * (bh + 3)} width={bw} height={bh} rx={1.5} fill="#0a0d11" stroke="#46525f" /><rect x={x + 20 + cc * (bw + 3)} y={yy + 10 + r * (bh + 3)} width={3} height={bh - 4} fill={c} /></g>; })}
    <text x={x + w - 140} y={yy + H / 2 + 3} fontSize={10.5} fill={c} fontWeight={800}>{short(label).slice(0, 16)}</text><text x={x + w - 140} y={yy + H / 2 + 15} fontSize={8.5} fill="#7f93a6">{sub}</text></g>;
  return <g>{body}
    {Array.from({ length: 6 }).map((_, i) => <g key={i}><rect x={x + 22 + i * 50} y={yy + 8} width={42} height={H - 16} rx={2} fill="#0a0d11" stroke="#46525f" /><rect x={x + 28 + i * 50} y={yy + 12} width={14} height={H - 24} rx={1} fill="#e28a1a" opacity={.9} /><circle cx={x + 36 + i * 50} cy={yy + H - 11} r={2} fill="#3ddc97" /></g>)}
    {Array.from({ length: 8 }).map((_, i) => <circle key={i} cx={x + 340 + i * 18} cy={yy + H / 2} r={6} fill="#05080b" stroke="#6c7a8a" />)}
    <text x={x + w - 130} y={yy + H / 2 - 2} fontSize={10.5} fill="#ffb020" fontWeight={800}>{short(label).slice(0, 14)}</text><text x={x + w - 130} y={yy + H / 2 + 11} fontSize={8.5} fill="#7f93a6">{sub}</text></g>;
}
