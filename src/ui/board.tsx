// Procedural SVG motherboard / server-chassis art. Everything here is drawn: PCB, copper traces, LGA sockets,
// DIMM slots, SXM modules, PCIe connectors + cards, NVMe carriers, PSU bays, VRMs, BMC.
import type { CatalogItem } from '../types';
import { vendorColor } from './common';

export const short = (n: string) => n.replace(/^(NVIDIA|AMD|Intel|Samsung|Vertiv|Micron|Mellanox|Broadcom|Schneider|Eaton|Cerebras|Tenstorrent)\s+/i, '');
const R = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + (b - a) * (n === 1 ? 0 : i / (n - 1)));

export function BoardDefs() {
  return <defs>
    <linearGradient id="pcb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#12503a" /><stop offset=".5" stopColor="#0d3f2e" /><stop offset="1" stopColor="#0a3225" /></linearGradient>
    <pattern id="pcbgrid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#ffffff" strokeOpacity=".05" /></pattern>
    <linearGradient id="alu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d5dae1" /><stop offset=".5" stopColor="#9aa2ad" /><stop offset="1" stopColor="#6d7580" /></linearGradient>
    <linearGradient id="cu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e39a5b" /><stop offset="1" stopColor="#9a5a2a" /></linearGradient>
    <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b939e" /><stop offset="1" stopColor="#4c535c" /></linearGradient>
    <linearGradient id="chassisG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a4452" /><stop offset=".5" stopColor="#262e3a" /><stop offset="1" stopColor="#1a2029" /></linearGradient>
    <pattern id="pins" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".9" fill="#d4af37" /></pattern>
    <pattern id="mesh" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#0b0f14" /><circle cx="3" cy="3" r="1.9" fill="#1d2733" /></pattern>
  </defs>;
}

export function Pcb({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <g>
    <rect x={x} y={y} width={w} height={h} rx={10} fill="url(#pcb)" stroke="#071a13" strokeWidth={3} />
    <rect x={x} y={y} width={w} height={h} rx={10} fill="url(#pcbgrid)" />
    <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={7} fill="none" stroke="#d4af37" strokeOpacity={.25} strokeDasharray="2 5" />
    {[[x + 16, y + 16], [x + w - 16, y + 16], [x + 16, y + h - 16], [x + w - 16, y + h - 16]].map(([a, b], i) => <g key={i}><circle cx={a} cy={b} r={7} fill="#0a1f17" stroke="#d4af37" /><circle cx={a} cy={b} r={3} fill="#02100b" /></g>)}
  </g>;
}

/** Copper trace bundle between two points, routed in an L / straight. */
export function Trace({ x1, y1, x2, y2, n = 4, gap = 4, vertical = false }: { x1: number; y1: number; x2: number; y2: number; n?: number; gap?: number; vertical?: boolean }) {
  return <g fill="none" strokeLinecap="round" strokeLinejoin="round">{Array.from({ length: n }, (_, i) => { const o = (i - (n - 1) / 2) * gap; const d = vertical ? `M${x1 + o},${y1} L${x1 + o},${(y1 + y2) / 2} L${x2 + o},${(y1 + y2) / 2} L${x2 + o},${y2}` : `M${x1},${y1 + o} L${(x1 + x2) / 2},${y1 + o} L${(x1 + x2) / 2},${y2 + o} L${x2},${y2 + o}`;
    return <g key={i}><path d={d} stroke="#031a11" strokeWidth={3.4} /><path d={d} stroke="#c9952f" strokeWidth={1.5} strokeOpacity={.85} /></g>; })}</g>;
}
export const Silk = ({ x, y, t, size = 9, anchor = 'start', rot = 0 }: { x: number; y: number; t: string; size?: number; anchor?: 'start' | 'middle' | 'end'; rot?: number }) =>
  <text x={x} y={y} fontSize={size} fill="#e9f5ea" fillOpacity={.7} textAnchor={anchor} fontFamily="'Share Tech Mono',monospace" transform={rot ? `rotate(${rot} ${x} ${y})` : undefined} style={{ pointerEvents: 'none', letterSpacing: '.06em' }}>{t}</text>;

const Fins = ({ x, y, w, h, vertical = true, step = 5 }: { x: number; y: number; w: number; h: number; vertical?: boolean; step?: number }) =>
  <g stroke="#59616c" strokeWidth={1}>{vertical ? R(x + 3, x + w - 3, Math.max(2, Math.floor(w / step))).map((v, i) => <line key={i} x1={v} x2={v} y1={y + 2} y2={y + h - 2} />) : R(y + 3, y + h - 3, Math.max(2, Math.floor(h / step))).map((v, i) => <line key={i} x1={x + 2} x2={x + w - 2} y1={v} y2={v} />)}</g>;

/** CPU LGA socket / heatsink. */
export function Lga({ x, y, w, h, item, label }: { x: number; y: number; w: number; h: number; item?: CatalogItem; label: string }) {
  const c = item ? vendorColor(item.vendor) : '#7a8591';
  if (!item) return <g><rect x={x} y={y} width={w} height={h} rx={5} fill="url(#steel)" stroke="#20262d" strokeWidth={2} /><rect x={x + 8} y={y + 8} width={w - 16} height={h - 16} fill="#1b2128" /><rect x={x + 12} y={y + 12} width={w - 24} height={h - 24} fill="url(#pins)" opacity={.75} />
    <path d={`M${x + 8},${y + 8} l14,0 l-14,14z`} fill="#e0b13a" /><rect x={x + w - 6} y={y + h / 2 - 18} width={5} height={36} rx={2} fill="#c0c6cf" /><text x={x + w / 2} y={y + h / 2 + 6} textAnchor="middle" fill="#4fd1ff" fontSize={22} opacity={.85}>+</text><Silk x={x + w / 2} y={y - 5} t={label} anchor="middle" /></g>;
  return <g><rect x={x} y={y} width={w} height={h} rx={5} fill="url(#alu)" stroke="#20262d" strokeWidth={2} /><Fins x={x} y={y} w={w} h={h} />
    {[[6, 6], [w - 6, 6], [6, h - 6], [w - 6, h - 6]].map(([a, b], i) => <circle key={i} cx={x + a} cy={y + b} r={3.2} fill="#2b323a" stroke="#cfd5dc" />)}
    <rect x={x + w * .2} y={y + h * .36} width={w * .6} height={h * .28} rx={4} fill="#0b1117" stroke={c} strokeWidth={1.6} /><text x={x + w / 2} y={y + h * .56} textAnchor="middle" fontSize={10} fill={c} fontWeight={700}>{short(item.name).replace(/\(.*\)/, '').trim().slice(0, 11)}</text></g>;
}

/** Vertical DIMM slot (empty) or populated module. */
export function Dimm({ x, y, w, h, item }: { x: number; y: number; w: number; h: number; item?: CatalogItem }) {
  if (!item) return <g><rect x={x} y={y} width={w} height={h} rx={2} fill="#0b0e12" stroke="#2d3743" /><rect x={x + w / 2 - 1} y={y + 5} width={2} height={h - 10} fill="url(#pins)" opacity={.8} /><rect x={x - 1} y={y - 3} width={w + 2} height={5} rx={1} fill="#d9dde3" /><rect x={x - 1} y={y + h - 2} width={w + 2} height={5} rx={1} fill="#d9dde3" /></g>;
  const c = vendorColor(item.vendor);
  return <g><rect x={x} y={y} width={w} height={h} rx={2} fill="#0f6b4a" stroke="#06241a" />{R(y + 8, y + h - 22, 4).map((v, i) => <rect key={i} x={x + 2} y={v} width={w - 4} height={h / 9} fill="#0a0d11" />)}<rect x={x} y={y + h - 8} width={w} height={8} fill="#d4af37" opacity={.9} /><rect x={x} y={y} width={w} height={3} fill={c} /><rect x={x - 1} y={y - 3} width={w + 2} height={5} rx={1} fill="#d9dde3" /><rect x={x - 1} y={y + h - 2} width={w + 2} height={5} rx={1} fill="#d9dde3" /></g>;
}

/** SXM / OAM accelerator module: empty footprint or full heatsink. */
export function Sxm({ x, y, w, h, item, label }: { x: number; y: number; w: number; h: number; item?: CatalogItem; label: string }) {
  const c = item ? vendorColor(item.vendor) : '#7a8591';
  if (!item) return <g><rect x={x} y={y} width={w} height={h} rx={6} fill="#10161d" stroke="#3b4b5c" strokeWidth={1.6} strokeDasharray="5 3" /><rect x={x + 10} y={y + 10} width={w - 20} height={h - 20} fill="url(#pins)" opacity={.35} />
    {[[8, 8], [w - 8, 8], [8, h - 8], [w - 8, h - 8]].map(([a, b], i) => <circle key={i} cx={x + a} cy={y + b} r={3.5} fill="#05090d" stroke="#6b7b8c" />)}<text x={x + w / 2} y={y + h / 2 + 7} textAnchor="middle" fill="#4fd1ff" fontSize={24} opacity={.85}>+</text><Silk x={x + 6} y={y - 4} t={label} /></g>;
  return <g><rect x={x} y={y} width={w} height={h} rx={6} fill="url(#alu)" stroke="#161b21" strokeWidth={2} /><Fins x={x} y={y} w={w} h={h} vertical={false} step={4} />
    {[[8, 8], [w - 8, 8], [8, h - 8], [w - 8, h - 8]].map(([a, b], i) => <circle key={i} cx={x + a} cy={y + b} r={4} fill="#2b323a" stroke="#dfe4ea" />)}
    <rect x={x + 14} y={y + h * .3} width={w - 28} height={h * .4} rx={4} fill="#0a1016" stroke={c} strokeWidth={2} /><text x={x + w / 2} y={y + h * .5} textAnchor="middle" fontSize={12} fill={c} fontWeight={800}>{short(item.name).split(' ').slice(0, 2).join(' ').slice(0, 14)}</text><text x={x + w / 2} y={y + h * .5 + 13} textAnchor="middle" fontSize={9} fill="#9fb4c8">{(item as any).memGB ? `${(item as any).memGB} GB` : ''}</text>
    <Silk x={x + 6} y={y - 4} t={label} /></g>;
}

/** Horizontal PCIe x16 connector; filled → add-in card (NIC/DPU) with heatsink and bracket. */
export function PcieSlot({ x, y, w, h, item, label }: { x: number; y: number; w: number; h: number; item?: CatalogItem; label: string }) {
  const cy = y + h - 15, c = item ? vendorColor(item.vendor) : '#4fd1ff';
  return <g>
    {item && <g><rect x={x + 2} y={y} width={w - 4} height={h - 16} rx={2} fill="#164a73" stroke="#0a2438" /><rect x={x + 8} y={y + 4} width={w * .3} height={h - 26} rx={2} fill="url(#alu)" /><rect x={x + w * .4} y={y + 6} width={14} height={14} fill="#0a0d11" stroke={c} /><rect x={x + w * .62} y={y + 5} width={w * .28} height={5} fill="#0a0d11" /><rect x={x - 5} y={y - 2} width={6} height={h - 12} fill="#b8bfc8" /><rect x={x + 2} y={y + h - 20} width={w - 4} height={4} fill="#d4af37" /><text x={x + w * .62} y={y + h - 24} fontSize={8.5} fill="#d6ecff">{short(item.name).slice(0, 16)}</text></g>}
    <rect x={x} y={cy} width={w} height={13} rx={2} fill="#0a0d11" stroke="#323d4a" /><rect x={x + 3} y={cy + 4} width={w * .38} height={5} fill="url(#pins)" opacity={.9} /><rect x={x + w * .41} y={cy + 2} width={5} height={9} fill="#05080b" /><rect x={x + w * .45} y={cy + 4} width={w * .52} height={5} fill="url(#pins)" opacity={.9} />
    {!item && <text x={x + w / 2} y={y + h - 22} textAnchor="middle" fill={c} fontSize={16} opacity={.8}>+</text>}<Silk x={x + w + 6} y={cy + 10} t={label} size={8} /></g>;
}

/** U.2/E1.S hot-swap carrier on the front cage. */
export function Nvme({ x, y, w, h, item }: { x: number; y: number; w: number; h: number; item?: CatalogItem }) {
  const c = item ? vendorColor(item.vendor) : '#4fd1ff';
  return <g><rect x={x} y={y} width={w} height={h} rx={2} fill={item ? 'url(#chassisG)' : '#06090c'} stroke={item ? '#6c7a8a' : '#2a3542'} />{item ? <><rect x={x + 3} y={y + 3} width={w - 18} height={h - 6} rx={1} fill="url(#mesh)" /><rect x={x + w - 12} y={y + 4} width={9} height={h - 8} rx={1} fill={c} opacity={.9} /><circle cx={x + w - 7.5} cy={y + 8} r={1.6} fill="#3ddc97" /></> : <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fill={c} fontSize={14} opacity={.8}>+</text>}</g>;
}

export function Psu({ x, y, w, h, item }: { x: number; y: number; w: number; h: number; item?: CatalogItem }) {
  const c = item ? vendorColor(item.vendor) : '#ffb020';
  return <g><rect x={x} y={y} width={w} height={h} rx={3} fill={item ? 'url(#chassisG)' : '#06090c'} stroke={item ? '#7f8d9c' : '#2a3542'} strokeWidth={1.4} />
    {item ? <><circle cx={x + 24} cy={y + h / 2} r={h * .36} fill="#0a0d11" stroke="#4a5767" /><g stroke="#8997a8" strokeWidth={1.4}>{[0, 60, 120].map(a => <line key={a} x1={x + 24 - Math.cos(a * Math.PI / 180) * h * .3} y1={y + h / 2 - Math.sin(a * Math.PI / 180) * h * .3} x2={x + 24 + Math.cos(a * Math.PI / 180) * h * .3} y2={y + h / 2 + Math.sin(a * Math.PI / 180) * h * .3} />)}</g><rect x={x + 50} y={y + 6} width={w - 58} height={5} rx={1} fill={c} /><circle cx={x + w - 10} cy={y + h - 9} r={2.2} fill="#3ddc97" /><text x={x + 50} y={y + h - 8} fontSize={8.5} fill="#cfdae6">{short(item.name).slice(0, 12)}</text></>
      : <text x={x + w / 2} y={y + h / 2 + 6} textAnchor="middle" fill={c} fontSize={18} opacity={.8}>+</text>}</g>;
}

/** Cold plate / switch chip / fan miscellany. */
export function Misc({ x, y, w, h, item, kind, label }: { x: number; y: number; w: number; h: number; item?: CatalogItem; kind: string; label: string }) {
  if (kind === 'fan') return <g><rect x={x} y={y} width={w} height={h} rx={5} fill="#0b0f14" stroke="#2f3b48" />{item ? <g stroke="#8997a8" strokeWidth={2}>{[0, 72, 144, 216, 288].map(a => <path key={a} d={`M${x + w / 2},${y + h / 2} q${Math.cos(a * Math.PI / 180) * 12},${Math.sin(a * Math.PI / 180) * 12} ${Math.cos((a + 40) * Math.PI / 180) * 15},${Math.sin((a + 40) * Math.PI / 180) * 15}`} fill="none" />)}</g> : <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fill="#4fd1ff" fontSize={14}>+</text>}</g>;
  if (kind === 'coldplate') return <g><rect x={x} y={y} width={w} height={h} rx={4} fill={item ? 'url(#cu)' : '#0b0f14'} stroke={item ? '#5b3315' : '#2f3b48'} strokeDasharray={item ? '' : '4 3'} />{item ? <g stroke="#f1c9a2" strokeWidth={3} fill="none"><path d={`M${x + 8},${y + 10} h${w - 16} M${x + 8},${y + h - 10} h${w - 16}`} /><circle cx={x + 8} cy={y + 10} r={4} fill="#5b3315" /><circle cx={x + w - 8} cy={y + h - 10} r={4} fill="#5b3315" /></g> : <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fill="#4fd1ff" fontSize={14}>+</text>}</g>;
  return <g><rect x={x} y={y} width={w} height={h} rx={4} fill={item ? '#0b1016' : '#0b0f14'} stroke={item ? vendorColor(item.vendor) : '#2f3b48'} strokeDasharray={item ? '' : '4 3'} />{item ? <><rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} fill="url(#alu)" /><Fins x={x + 6} y={y + 6} w={w - 12} h={h - 12} /></> : <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fill="#4fd1ff" fontSize={14}>+</text>}<Silk x={x} y={y - 3} t={label} size={8} /></g>;
}

export function Vrm({ x, y, w, cols = 8 }: { x: number; y: number; w: number; cols?: number }) {
  return <g>{R(x + 6, x + w - 14, cols).map((v, i) => <g key={i}><rect x={v} y={y} width={11} height={11} fill="#0a0d11" stroke="#b38a2e" /><circle cx={v + 5.5} cy={y + 20} r={5} fill="#c9ced6" stroke="#3a424c" /><line x1={v + 3} y1={y + 20} x2={v + 8} y2={y + 20} stroke="#3a424c" /></g>)}</g>;
}
export function Chip({ x, y, w, h, label, hot }: { x: number; y: number; w: number; h: number; label: string; hot?: boolean }) {
  return <g><rect x={x} y={y} width={w} height={h} rx={3} fill="#0a0d11" stroke={hot ? '#4fd1ff' : '#4a5767'} />{hot && <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} fill="url(#alu)" opacity={.85} />}<text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize={7.5} fill={hot ? '#10202f' : '#9bb0c4'} fontFamily="'Share Tech Mono',monospace">{label}</text></g>;
}
