import { useEffect, useMemo, useState } from 'react';
import type { CatalogItem, Chassis, RackDesign, RackItem, SlotKind, TrayDesign, CoolingClass, RackSpec, Switch } from '../types';
import { ALL_ITEMS, getItem, ITEMS_BY_KIND } from '../data';
import { useGame, offerAt } from '../store';
import { partFitsSlot, validateTray, validateRack } from '../sim/validate';
import { Panel, Issues, Stat, usd, num, vendorColor, specsOf } from './common';
import { TEMPLATES, getTemplate } from '../data/templates';
import { rackIdOf } from '../plan';
import { monthToYear } from '../types';
import { ItemArt } from './art';
import { BoardDefs, Pcb, Trace, Silk, Lga, Dimm, Sxm, PcieSlot, Nvme, Psu, Misc, Vrm, Chip } from './board';
import { RackFrame, Device, UH, RW, RAIL } from './rackart';
import TraySizing from './TraySizing';
import Tip from './Tip';

type Sockets = Record<string, (string | null)[]>;
type Pos = { x: number; y: number };
const SOCK: Record<string, { w: number; h: number }> = {
  accelerator: { w: 108, h: 108 }, cpu: { w: 104, h: 104 }, dimm: { w: 13, h: 118 }, nic: { w: 150, h: 36 }, dpu: { w: 150, h: 36 }, nvme: { w: 62, h: 28 },
  psu: { w: 100, h: 54 }, coldplate: { w: 80, h: 50 }, switchchip: { w: 66, h: 66 }, fan: { w: 48, h: 48 },
};
const ZONE_NAME: Record<string, string> = { accelerator: 'ACCELERATOR', cpu: 'CPU', dimm: 'DIMM', nic: 'PCIe NIC', dpu: 'PCIe DPU', nvme: 'NVMe BAY', psu: 'PSU BAY', coldplate: 'COLD PLATE', switchchip: 'SWITCH CHIP', fan: 'FAN' };
const shortName = (n: string) => n.replace(/^(NVIDIA|AMD|Intel|Samsung|Vertiv|Micron|Mellanox|Broadcom|Schneider|Eaton)\s+/i, '');

function TrayLab({ setLearn }: { setLearn: (id: string) => void }) {
  const g = useGame(s => s.game);
  const year = monthToYear(g.month);
  const chassisList = ITEMS_BY_KIND('chassis').filter(c => offerAt(c, g.month).available);
  const [cid, setCid] = useState(chassisList[0]?.id ?? '');
  const ch = getItem(cid) as Chassis | undefined;
  const [sock, setSock] = useState<Sockets>({});
  const [selS, setSelS] = useState<{ kind: string; idx: number } | null>(null);
  const [name, setName] = useState('My Tray');
  const [msg, setMsg] = useState('');
  const [drag, setDrag] = useState<string | null>(null);
  const cells = (kind: string): (string | null)[] => { const n = ch?.slots.find(s => s.kind === kind)?.count ?? 0; const cur = sock[kind] ?? []; return Array.from({ length: n }, (_, i) => cur[i] ?? null); };
  const active = selS?.kind ?? ch?.slots[0]?.kind ?? 'accelerator';
  const optionsOf = (kind: string) => ch ? ALL_ITEMS.filter(i => partFitsSlot({ kind: kind as SlotKind, count: 0, accepts: ch.slots.find(s => s.kind === kind)?.accepts }, i)).map(i => offerAt(i, g.month)).sort((a, b) => Number(b.available) - Number(a.available) || b.item.availableFrom - a.item.availableFrom) : [];
  const setCell = (kind: string, idx: number, id: string | null) => { const arr = cells(kind); arr[idx] = id; setSock({ ...sock, [kind]: arr }); };
  const fits = (kind: string, id: string) => { const it = getItem(id); const slot = ch?.slots.find(x => x.kind === kind); return !!it && !!slot && partFitsSlot({ kind: kind as SlotKind, count: 0, accepts: slot.accepts }, it); };
  const install = (id: string) => { // into selected socket (or next empty of active kind), then advance
    const kind = active; const arr = cells(kind); let idx = selS && selS.kind === kind ? selS.idx : arr.findIndex(x => !x);
    if (idx < 0) { setMsg(`All ${kind} sockets are full — click one to replace it.`); return; }
    arr[idx] = id; setSock({ ...sock, [kind]: arr }); setMsg('');
    const next = arr.findIndex((x, i) => !x && i !== idx); setSelS({ kind, idx: next >= 0 ? next : idx });
  };
  const fillAll = (id: string) => { const arr = cells(active).map(x => x ?? id); setSock({ ...sock, [active]: arr }); setMsg(''); };
  const loadChassis = (id: string) => { setCid(id); setSock({}); setSelS({ kind: (getItem(id) as Chassis)?.slots[0]?.kind ?? 'accelerator', idx: 0 }); };
  const autofill = () => { if (!ch) return; const next: Sockets = {}; for (const s of ch.slots) { const o = optionsOf(s.kind).find(x => x.available); const n = s.required ?? s.count; next[s.kind] = Array.from({ length: s.count }, (_, i) => o && i < n ? o.item.id : null); } setSock(next); };
  const loadTemplate = (tid: string) => { const t = getTemplate(tid); if (!t) return; const c = getItem(t.tray.chassisId) as Chassis; setCid(c.id); const next: Sockets = {}; for (const s of c.slots) next[s.kind] = Array.from({ length: s.count }, () => null); for (const p of t.tray.parts) { const arr = next[p.slot] ?? (next[p.slot] = []); let k = 0; for (let i = 0; i < arr.length && k < p.count; i++) if (!arr[i]) { arr[i] = p.itemId; k++; } } setSock(next); setName(t.name); setSelS(null); };
  const parts: TrayDesign['parts'] = ch ? ch.slots.flatMap(s => { const m = new Map<string, number>(); for (const id of cells(s.kind)) if (id) m.set(id, (m.get(id) ?? 0) + 1); return [...m].map(([itemId, count]) => ({ slot: s.kind, itemId, count })); }) : [];
  const design: TrayDesign = { id: 'draft', name, chassisId: cid, parts };
  const v = ch ? validateTray(design, getItem) : null;
  const bf16 = parts.reduce((n, p) => { const it = getItem(p.itemId); return n + (it?.kind === 'accelerator' ? (it.tflops.bf16 ?? it.tflops.fp16 ?? 0) * p.count : 0); }, 0);

  // ---- physical layout (board coordinates) ----
  const W = 1400, GAP = 10;
  const has = (k: string) => (ch?.slots.find(s => s.kind === k)?.count ?? 0) > 0;
  const cnt = (k: string) => ch?.slots.find(s => s.kind === k)?.count ?? 0;
  const place: Record<string, Pos[]> = {};
  const traces: any[] = []; const chips: { x: number; y: number; w: number; h: number; label: string; hot?: boolean }[] = []; const silk: { x: number; y: number; t: string; a?: 'start' | 'middle' | 'end' }[] = []; const vrms: { x: number; y: number; w: number }[] = [];
  const NV_PER = 10, PS_PER = 6;
  const nvW = has('nvme') ? Math.ceil(cnt('nvme') / NV_PER) * (SOCK.nvme.w + 8) : 0, psW = has('psu') ? Math.ceil(cnt('psu') / PS_PER) * (SOCK.psu.w + 8) : 0;
  const bx0 = 40 + nvW + (nvW ? 26 : 0), bx1 = W - 30 - psW - (psW ? 26 : 0), bw = bx1 - bx0;
  const top = 64; let y = top + 16;
  place.nvme = Array.from({ length: cnt('nvme') }, (_, i) => ({ x: 40 + Math.floor(i / NV_PER) * (SOCK.nvme.w + 8), y: top + 30 + (i % NV_PER) * (SOCK.nvme.h + 8) }));
  place.psu = Array.from({ length: cnt('psu') }, (_, i) => ({ x: bx1 + 26 + Math.floor(i / PS_PER) * (SOCK.psu.w + 8), y: top + 30 + (i % PS_PER) * (SOCK.psu.h + 8) }));
  let cpuBand: { y: number; h: number } | null = null, accBand: { y: number; h: number } | null = null, nicBand: { y: number; h: number } | null = null;
  if (has('cpu') || has('dimm')) {
    const nC = cnt('cpu'), nD = cnt('dimm'), cw = SOCK.cpu.w + 40;
    const dl = Math.ceil(nD / 2), dr = nD - dl, dw = SOCK.dimm.w + 4;
    const sideW = (bw - nC * cw) / 2 - 20;
    const per = Math.max(1, Math.floor(sideW / dw)), rowsB = Math.max(1, Math.ceil(Math.max(dl, dr) / per));
    const bandH = Math.max(nC ? SOCK.cpu.h + 64 : 0, rowsB * (SOCK.dimm.h + 12) + 24);
    const cx0 = bx0 + bw / 2 - (nC * cw) / 2 + 20;
    place.cpu = Array.from({ length: nC }, (_, i) => ({ x: cx0 + i * cw, y: y + 18 }));
    const bank = (n: number, x0: number, right: boolean) => Array.from({ length: n }, (_, i) => { const r = Math.floor(i / per), c = i % per; return { x: right ? x0 + c * dw : x0 + sideW - (c + 1) * dw - dw, y: y + 18 + r * (SOCK.dimm.h + 12) }; });
    const lx = bx0 + 18, rx = cx0 + nC * cw - 20;
    place.dimm = [...bank(dl, lx, false), ...bank(dr, rx + 24, true)];
    place.cpu.forEach((p, i) => { vrms.push({ x: p.x - 6, y: p.y + SOCK.cpu.h + 14, w: SOCK.cpu.w + 12 }); silk.push({ x: p.x + SOCK.cpu.w / 2, y: p.y - 6, t: `CPU${i} · SOCKET`, a: 'middle' }); if (i > 0) traces.push({ x1: place.cpu![i - 1].x + SOCK.cpu.w, y1: p.y + 30, x2: p.x, y2: p.y + 30, n: 4, gap: 6 }); });
    if (nC && dl) traces.push({ x1: lx + sideW - 6, y1: y + 56, x2: place.cpu[0].x, y2: y + 56, n: 6, gap: 9 });
    if (nC && dr) traces.push({ x1: place.cpu[nC - 1].x + SOCK.cpu.w, y1: y + 56, x2: rx + 24, y2: y + 56, n: 6, gap: 9 });
    if (dl) silk.push({ x: lx + sideW / 2, y: y + 6, t: `DDR · CH A–${String.fromCharCode(64 + Math.max(1, Math.ceil(dl / 2)))}`, a: 'middle' });
    if (dr) silk.push({ x: rx + 24 + sideW / 2, y: y + 6, t: `DDR · CH ${String.fromCharCode(65 + Math.ceil(dl / 2))}–${String.fromCharCode(64 + Math.ceil(dl / 2) + Math.ceil(dr / 2))}`, a: 'middle' });
    cpuBand = { y, h: bandH }; y += bandH + 24;
  }
  if (has('accelerator')) {
    const n = cnt('accelerator'), sk = SOCK.accelerator, per = n <= 8 ? Math.min(4, n) : Math.max(1, Math.min(8, Math.floor((bw - 40) / (sk.w + GAP)))), rows = Math.ceil(n / per);
    const sw = ch?.baseboard?.includesSwitchChips && rows >= 2 ? 78 : 0;
    const bandH = rows * (sk.h + 30) + sw + 40; const pitch = sk.w + 34; const rowW = Math.min(per, n) * pitch - 34; const x0 = bx0 + (bw - rowW) / 2;
    place.accelerator = Array.from({ length: n }, (_, i) => { const r = Math.floor(i / per); return { x: x0 + (i % per) * pitch, y: y + 36 + r * (sk.h + 30) + (r >= 1 ? sw : 0) }; });
    if (ch?.baseboard?.includesSwitchChips) { if (sw) { const cy = y + 36 + sk.h + 15 + 8; const nSw = per <= 4 ? 4 : 6; for (let k = 0; k < nSw; k++) chips.push({ x: bx0 + bw / 2 - (nSw * 78) / 2 + k * 78 + 6, y: cy, w: 66, h: 50, label: 'NVSWITCH', hot: true }); place.accelerator.forEach((p, i) => { const r = Math.floor(i / per); traces.push(r === 0 ? { x1: p.x + sk.w / 2, y1: p.y + sk.h, x2: p.x + sk.w / 2, y2: cy + 20, n: 3, gap: 7, vertical: true } : { x1: p.x + sk.w / 2, y1: p.y, x2: p.x + sk.w / 2, y2: cy + 30, n: 3, gap: 7, vertical: true }); }); } else { chips.push({ x: bx0 + bw / 2 - 40, y: y + 40 + sk.h + 10, w: 80, h: 34, label: 'NVSWITCH', hot: true }); } }
    else place.accelerator.forEach((p, i, arr) => { if (i % per < per - 1 && arr[i + 1]) traces.push({ x1: p.x + sk.w, y1: p.y + sk.h / 2, x2: arr[i + 1].x, y2: arr[i + 1].y + sk.h / 2, n: 3, gap: 6 }); });
    place.accelerator.forEach((p, i) => silk.push({ x: p.x + sk.w / 2, y: p.y - 6, t: `${(ch?.baseboard?.scaleUp ?? 'pcie').toUpperCase()} · GPU${i}`, a: 'middle' }));
    if (cpuBand && place.cpu) place.cpu.forEach(p => traces.push({ x1: p.x + SOCK.cpu.w / 2, y1: p.y + SOCK.cpu.h + 40, x2: p.x + SOCK.cpu.w / 2, y2: y + 6, n: 5, gap: 6, vertical: true }));
    accBand = { y, h: bandH }; y += bandH + 24;
  }
  const misc = ['coldplate', 'switchchip', 'fan'].filter(has);
  if (misc.length) { let x = bx0 + 30; for (const k of misc) { place[k] = Array.from({ length: cnt(k) }, (_, i) => { const p = { x, y: y + 18 }; x += SOCK[k].w + 18; silk.push({ x: p.x, y: p.y - 6, t: `${k.toUpperCase()} ${i + 1}` }); return p; }); } y += 100; }
  const nicKinds = ['nic', 'dpu'].filter(has);
  if (nicKinds.length) { const wslot = SOCK.nic.w + 36; const per = Math.max(1, Math.floor((bw - 50) / wslot)); let k = 0; for (const kind of nicKinds) place[kind] = Array.from({ length: cnt(kind) }, () => { const i = k++; const p = { x: bx0 + 36 + (i % per) * wslot, y: y + 30 + Math.floor(i / per) * 60 }; silk.push({ x: p.x + SOCK.nic.w + 6, y: p.y + 6, t: `PCIE5 x16 #${i + 1}` }); return p; }); const rows = Math.ceil(k / per); nicBand = { y, h: rows * 60 + 30 }; if (cpuBand && place.cpu) traces.push({ x1: bx0 + 20, y1: cpuBand.y + cpuBand.h / 2, x2: bx0 + 20, y2: y + 20, n: 6, gap: 5, vertical: true }); y += rows * 60 + 54; }
  const bottom = y + 6;
  chips.push({ x: bx0 + 30, y: bottom + 6, w: 54, h: 30, label: 'BMC' }, { x: bx0 + 98, y: bottom + 6, w: 54, h: 30, label: 'PCH' }, { x: bx0 + 166, y: bottom + 6, w: 40, h: 30, label: 'TPM' });
  const H = Math.max(bottom + 60, top + 40 + Math.max(has('nvme') ? Math.min(cnt('nvme'), NV_PER) * 36 : 0, has('psu') ? Math.min(cnt('psu'), PS_PER) * 62 : 0) + 30);
  const cooled = ch?.cooling && ch.cooling !== 'air';
  void accBand; void nicBand;
  const onDrop = (kind: string, idx: number) => (e: React.DragEvent) => { e.preventDefault(); const id = e.dataTransfer.getData('text/part'); setDrag(null); if (!id) return; if (!fits(kind, id)) { setMsg(`${getItem(id)?.name ?? 'That part'} does not fit a ${ZONE_NAME[kind] ?? kind} socket on this chassis.`); return; } setCell(kind, idx, id); setSelS({ kind, idx }); setMsg(''); };
  const opts = optionsOf(active);
  const curId = selS ? cells(selS.kind)[selS.idx] : null;
  const templates = TEMPLATES.filter(t => t.availableFrom <= year && (!t.eolAfter || year <= t.eolAfter));
  useEffect(() => { if (typeof location !== 'undefined' && location.hash.includes('fill')) autofill(); }, []);
  const slotInfo = ch?.slots.find(s => s.kind === active);
  return <div className="fb cgd"><Panel title="Tray bench" glow cls="fillp">
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <select value={cid} onChange={e => loadChassis(e.target.value)} style={{ flex: 1, minWidth: 220 }}>{chassisList.map(c => <option key={c.id} value={c.id}>{c.name} ({c.cooling}, {c.rackUnits}U)</option>)}</select>
      <select value="" onChange={e => e.target.value && loadTemplate(e.target.value)}><option value="">📦 load pre-built system…</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name} — {t.integrator}</option>)}</select>
      <button className="btn sm" onClick={autofill}>⚡ Auto-fill</button><button className="btn sm" onClick={() => setSock({})}>🗑 Clear</button></div>
    {ch && <div className="sv"><svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', borderRadius: 10, background: 'radial-gradient(900px 500px at 50% 30%,#14293d,#070d14)' }}>
      <BoardDefs />
      <rect x={4} y={4} width={W - 8} height={H - 8} rx={16} fill="none" stroke={cooled ? '#38bdf8' : '#4a647c'} strokeWidth={3} />
      <rect x={12} y={12} width={W - 24} height={30} rx={7} fill="#10202f" /><text x={26} y={32} fill="#8fb4cf" fontSize={14} style={{ letterSpacing: '.16em' }}>◀ FRONT · {ch.name.toUpperCase().slice(0, 56)} · {ch.rackUnits}U · {ch.cooling.toUpperCase()} · REAR ▶</text>
      <text x={W - 26} y={32} textAnchor="end" fill="#6a8aa5" fontSize={12}>click a socket, then choose a part →</text>
      {has('nvme') && <g><rect x={30} y={top + 8} width={nvW + 20} height={Math.min(cnt('nvme'), NV_PER) * 36 + 44} rx={8} fill="#0d141c" stroke="#2c3b4b" /><Silk x={40} y={top + 24} t="NVME CAGE" size={10} /></g>}
      {has('psu') && <g><rect x={bx1 + 16} y={top + 8} width={psW + 20} height={Math.min(cnt('psu'), PS_PER) * 62 + 44} rx={8} fill="#0d141c" stroke="#2c3b4b" /><Silk x={bx1 + 26} y={top + 24} t="REAR PSU BAY" size={10} /></g>}
      <g opacity={.5}>{Array.from({ length: 3 }).map((_, i) => <g key={i}><circle cx={24} cy={H - 70 - i * 0} r={0} /></g>)}</g>
      <Pcb x={bx0 - 8} y={top} w={bw + 16} h={H - top - 18} />
      {traces.map((t, i) => <Trace key={i} {...t} />)}
      {vrms.map((v, i) => <Vrm key={i} x={v.x} y={v.y} w={v.w} />)}
      {chips.map((c, i) => <Chip key={i} {...c} />)}
      <circle cx={bx1 - 40} cy={bottom + 22} r={14} fill="#b9c0c9" stroke="#3a424c" strokeWidth={2} /><Silk x={bx1 - 40} y={bottom + 50} t="CR2032" anchor="middle" size={8} />
      {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={bx1 - 180 + i * 22} y={bottom + 12} width={16} height={20} fill="#e9eef3" stroke="#6b7480" />)}<Silk x={bx1 - 180} y={bottom + 50} t="FAN HDR / SYS PWR" size={8} />
      {silk.map((s2, i) => <Silk key={i} x={s2.x} y={s2.y} t={s2.t} anchor={s2.a} size={9} />)}
      {ch.slots.map(s => { const arr = cells(s.kind); const pos = place[s.kind] ?? [];
        return <g key={s.kind}>{arr.map((id, i) => { const p = pos[i]; if (!p) return null; const sk = SOCK[s.kind] ?? { w: 40, h: 30 }; const it = id ? getItem(id) : undefined; const isSel = selS?.kind === s.kind && selS.idx === i; const hot = !!drag && fits(s.kind, drag);
          const lbl = `${s.kind.toUpperCase()}${i}`;
          const art = s.kind === 'cpu' ? <Lga x={p.x} y={p.y} w={sk.w} h={sk.h} item={it} label="" /> : s.kind === 'dimm' ? <Dimm x={p.x} y={p.y} w={sk.w} h={sk.h} item={it} /> : s.kind === 'accelerator' ? <Sxm x={p.x} y={p.y} w={sk.w} h={sk.h} item={it} label="" />
            : s.kind === 'nic' || s.kind === 'dpu' ? <PcieSlot x={p.x} y={p.y} w={sk.w} h={sk.h} item={it} label="" /> : s.kind === 'nvme' ? <Nvme x={p.x} y={p.y} w={sk.w} h={sk.h} item={it} /> : s.kind === 'psu' ? <Psu x={p.x} y={p.y} w={sk.w} h={sk.h} item={it} /> : <Misc x={p.x} y={p.y} w={sk.w} h={sk.h} item={it} kind={s.kind} label={lbl} />;
          return <g key={i} onClick={() => setSelS({ kind: s.kind, idx: i })} onDragOver={e => e.preventDefault()} onDrop={onDrop(s.kind, i)} style={{ cursor: 'pointer' }} className="sockg">
            {art}<rect x={p.x - 4} y={p.y - 4} width={sk.w + 8} height={sk.h + 8} rx={6} fill="transparent" stroke={isSel ? '#fff' : hot ? '#4fd1ff' : 'transparent'} strokeWidth={isSel ? 2.5 : 1.5} strokeDasharray={isSel ? '' : '5 4'} style={isSel ? { filter: 'drop-shadow(0 0 7px #4fd1ff)' } : undefined} />
            <title>{it?.name ?? `empty ${s.kind} socket`}</title></g>; })}</g>; })}
    </svg></div>}
    {ch && <div className="dim" style={{ marginTop: 8, fontSize: 12 }}>{ch.codex.summary}</div>}
    {msg && <div className="warn" style={{ marginTop: 6 }}>{msg}</div>}
  </Panel><div className="col">
    <Tip>This is a server <b>tray</b>. Click a socket on the board and pick a part. Watch the Sizing advisor: GPUs set the power and NIC needs, CPUs set PCIe lanes and memory channels — and everything you add costs money per GPU-hour.</Tip>
    <Panel title={`Install into: ${ZONE_NAME[active] ?? active}${selS ? ` #${selS.idx + 1}` : ''}`} glow>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>{ch?.slots.map(s => <button key={s.kind} className={'btn sm' + (active === s.kind ? ' pri' : '')} onClick={() => setSelS({ kind: s.kind, idx: Math.max(0, cells(s.kind).findIndex(x => !x)) })}>{ZONE_NAME[s.kind] ?? s.kind} {cells(s.kind).filter(Boolean).length}/{s.count}</button>)}</div>
      {slotInfo && <div className="dim" style={{ fontSize: 11, marginBottom: 6 }}>{slotInfo.required != null ? `Needs ≥ ${slotInfo.required}` : 'Optional'}{slotInfo.accepts ? ` · accepts ${slotInfo.accepts.join(' / ')}` : ''}</div>}
      <div className="binlist">{opts.length === 0 && <span className="dim">Nothing compatible exists for this socket.</span>}
        {opts.map(o => { const cur = curId === o.item.id; return <div key={o.item.id} draggable={o.available} onDragStart={e => { e.dataTransfer.setData('text/part', o.item.id); setDrag(o.item.id); }} onDragEnd={() => setDrag(null)}
          onClick={() => o.available && install(o.item.id)} className={'partcard' + (cur ? ' on' : '')} style={{ opacity: o.available ? 1 : .45, cursor: o.available ? 'pointer' : 'not-allowed' }}>
          <ItemArt item={o.item} size={34} /><div style={{ flex: 1, minWidth: 0 }}><b style={{ color: vendorColor(o.item.vendor), fontSize: 12 }}>{o.item.name}</b>
            <div className="dim" style={{ fontSize: 10.5 }}>{specsOf(o.item).slice(0, 3).map(([a, b]) => `${a}: ${b}`).join(' · ')}</div></div>
          <div style={{ textAlign: 'right' }}><div className="mono" style={{ fontSize: 11 }}>{o.available ? usd(o.unitPrice) : `ships ${Math.floor(o.item.availableFrom)}`}</div>
            {o.available && <a className="dim" style={{ fontSize: 10, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); fillAll(o.item.id); }}>fill all</a>}</div></div>; })}</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>{curId && selS && <button className="btn sm" onClick={() => setCell(selS.kind, selS.idx, null)}>Remove from socket</button>}{curId && <button className="btn sm" onClick={() => setLearn(curId)}>Codex</button>}</div>
      <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>Click a socket on the board to target it, then click a part to install it there (it advances to the next empty socket). “fill all” populates every empty socket of that type.</div>
    </Panel>
    {ch && v && <Panel glow title="Live validation"><div className="grid g2" style={{ marginBottom: 10 }}><Stat label="Power" value={`${(v.stats.watts / 1000).toFixed(1)} kW`} /><Stat label="Cost" value={usd(v.stats.costUSD)} /><Stat label="Accelerators" value={v.stats.accels} /><Stat label="FP8 / BF16" value={`${num(v.stats.tflopsFp8 / 1000, 1)} / ${num(bf16 / 1000, 1)} PF`} /><Stat label="HBM" value={`${num(v.stats.memGB)} GB`} /><Stat label="PCIe lanes" value={`${v.stats.pcieLanesUsed}/${ch.pcieLanesAvail}`} /></div>
      <Issues issues={v.issues} onLearn={setLearn} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}><input value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} /><button className="btn go" disabled={v.issues.some(i => i.severity === 'error')} onClick={() => setMsg(useGame.getState().saveTray({ ...design, id: `tray-${g.trays.length + 1}` }).message)}>SAVE TRAY</button></div></Panel>}
    <Panel title="Sizing & cost advisor" glow>{ch && <TraySizing design={design} month={g.month} utility={g.utilityUSDPerKWh} />}</Panel>
    <Panel title="Saved trays">{g.trays.length ? g.trays.map(t => <div key={t.id} className="mono" style={{ fontSize: 12 }}>{t.id} · {t.name} · {getItem(t.chassisId)?.name}</div>) : <span className="dim">None yet</span>}</Panel></div></div>;
}

type Armed = { kind: 'tray' | 'switch' | 'storage' | 'power'; id: string } | null;
const RC = { tray: '#76b900', switch: '#4fd1ff', storage: '#c792ea', power: '#ffb020' } as const;

function RackLab({ setLearn }: { setLearn: (id: string) => void }) {
  const g = useGame(s => s.game);
  const racks = ITEMS_BY_KIND('rack').filter(r => offerAt(r, g.month).available);
  const [rid, setRid] = useState([...racks].sort((a, b) => b.maxKW - a.maxKW).find(r => r.cooling.includes('air'))?.id ?? racks[0]?.id ?? '');
  const rk = getItem(rid) as RackSpec | undefined;
  const units = rk?.units ?? 42;
  const [items, setItems] = useState<RackItem[]>([]);
  const [cool, setCool] = useState<CoolingClass>('air');
  const [name, setName] = useState('My Rack');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'tray' | 'switch' | 'storage' | 'power'>('switch');
  const [armed, setArmed] = useState<Armed>(null);
  const [selU, setSelU] = useState<number | null>(null);
  const [hoverU, setHoverU] = useState<number | null>(null);
  const [selDev, setSelDev] = useState<number | null>(null);
  const [zoomFull, setZoomFull] = useState(false);
  const design: RackDesign = { id: 'draft', name, rackId: rid, items: [...items].sort((a, b) => (a.u ?? 0) - (b.u ?? 0)), coolingInterface: cool };
  const v = rk ? validateRack(design, g.trays, getItem) : null;
  const unitsPer = (it: RackItem) => { if (it.type === 'tray') { const t = g.trays.find(x => x.id === it.trayId); return (getItem(t?.chassisId ?? '') as Chassis)?.rackUnits ?? 1; } if (it.type === 'switch') return (getItem(it.switchId) as Switch)?.rackUnits || 1; if (it.type === 'storage') return (getItem(it.storageId) as any)?.rackUnits ?? 2; return 2; };
  const heightOf = (it: RackItem) => it.type === 'power' ? 2 : unitsPer(it) * it.count;
  const meta = (it: RackItem) => {
    if (it.type === 'tray') { const t = g.trays.find(x => x.id === it.trayId); const w = t ? validateTray(t, getItem).stats.watts : 0; return { label: t?.name ?? it.trayId, kw: w * it.count / 1000, sub: `${unitsPer(it)}U each` }; }
    if (it.type === 'switch') { const sw = getItem(it.switchId) as Switch; return { label: sw?.name ?? it.switchId, kw: ((sw as any)?.watts ?? 0) * it.count / 1000, sub: sw?.role ?? 'switch' }; }
    if (it.type === 'storage') { const st = getItem(it.storageId) as any; return { label: st?.name ?? it.storageId, kw: (st?.watts ?? 0) * it.count / 1000, sub: 'storage' }; }
    const pw = getItem(it.powerId) as any; return { label: pw?.name ?? it.powerId, kw: 0, sub: pw?.powerType ?? 'power' };
  };
  const occupancy = (list: RackItem[], skip = -1) => { const o: number[] = Array(units).fill(-1); list.forEach((it, i) => { if (i === skip) return; const s = it.u ?? 0, h = heightOf(it); for (let u = s; u < Math.min(units, s + h); u++) o[u] = i; }); return o; };
  const occ = occupancy(items);
  const fitsAt = (list: RackItem[], h: number, s: number, skip = -1) => { if (s < 0 || s + h > units) return false; const o = occupancy(list, skip); for (let u = s; u < s + h; u++) if (o[u] !== -1) return false; return true; };
  const firstFree = (list: RackItem[], h: number, top: boolean) => { const order = [...Array(units).keys()]; if (top) order.reverse(); for (const u of order) { const s = top ? u - h + 1 : u; if (fitsAt(list, h, s)) return s; } return -1; };
  const make = (a: NonNullable<Armed>): RackItem => a.kind === 'tray' ? { type: 'tray', trayId: a.id, count: 1 } : a.kind === 'switch' ? { type: 'switch', switchId: a.id, count: 1 } : a.kind === 'storage' ? { type: 'storage', storageId: a.id, count: 1 } : { type: 'power', powerId: a.id, count: 1 };
  const placeAt = (a: Armed, u: number | null) => {
    if (!a) return; const it = make(a); const h = heightOf(it); let s = -1;
    if (u != null) s = fitsAt(items, h, u) ? u : fitsAt(items, h, u - h + 1) ? u - h + 1 : -1;
    else s = firstFree(items, h, a.kind === 'switch'); // ToR switches default to the top of the rack
    if (s < 0) { setMsg(`${meta(it).label} needs ${h} free U${u != null ? ' at that position' : ''} — free some space or pick another spot.`); return; }
    setItems([...items, { ...it, u: s } as RackItem]); setMsg(''); setSelU(null);
  };
  const bump = (i: number, d: number) => { const it = items[i]; const c = it.count + d; if (c <= 0) return setItems(items.filter((_, k) => k !== i)); const n = { ...it, count: c } as RackItem; if (it.type !== 'power' && !fitsAt(items, heightOf(n), it.u ?? 0, i)) return setMsg('No free U above it — move it or free space first.'); setItems(items.map((x, k) => k === i ? n : x)); setMsg(''); };
  const nudge = (i: number, d: number) => { const it = items[i]; const s = (it.u ?? 0) + d; if (!fitsAt(items, heightOf(it), s, i)) return setMsg('Blocked by another device or the rack edge.'); setItems(items.map((x, k) => k === i ? { ...x, u: s } as RackItem : x)); };
  const layout = (list: RackItem[]): RackItem[] => { // auto-position: power/storage bottom, trays above, switches at top
    const copy = list.map(x => ({ ...x })); const bottom = copy.filter(x => x.type === 'power' || x.type === 'storage'), mid = copy.filter(x => x.type === 'tray'), top = copy.filter(x => x.type === 'switch');
    let u = 0; for (const it of [...bottom, ...mid]) { it.u = u; u += heightOf(it); } let t = units; for (const it of top) { t -= heightOf(it); it.u = Math.max(u, t); } return copy;
  };
  const loadRack = (id: string) => { const d = useGame.getState().game.racks.find(r => r.id === id); if (!d) return; setRid(d.rackId); setItems(d.items.some(i => i.u == null) ? layout(d.items) : d.items); setCool(d.coolingInterface); setName(d.name + ' (copy)'); };
  const loadTemplate = (tid: string) => { const t = getTemplate(tid); if (!t) return; const r = useGame.getState().adoptTemplate(tid); if (!r.ok) return setMsg(r.message); loadRack(rackIdOf(t)); };
  const year = monthToYear(g.month);
  const templates = TEMPLATES.filter(t => t.availableFrom <= year && (!t.eolAfter || year <= t.eolAfter));
  useEffect(() => { if (typeof location !== 'undefined' && location.hash.includes('fill') && templates[0]) loadTemplate(templates[0].id); }, []);
  const palette: { id: string; name: string; sub: string; kind: NonNullable<Armed>['kind']; item?: CatalogItem; price?: number; ok: boolean }[] =
    tab === 'tray' ? g.trays.map(t => ({ id: t.id, name: t.name, sub: `${(getItem(t.chassisId) as Chassis)?.rackUnits}U · ${(validateTray(t, getItem).stats.watts / 1000).toFixed(1)} kW · ${validateTray(t, getItem).stats.accels} accel`, kind: 'tray' as const, ok: true }))
    : tab === 'switch' ? ITEMS_BY_KIND('switch').filter(s => s.rackUnits > 0).map(s => ({ id: s.id, name: s.name, sub: `${s.role} · ${s.rackUnits}U`, kind: 'switch' as const, item: s, price: offerAt(s, g.month).unitPrice, ok: offerAt(s, g.month).available }))
    : tab === 'storage' ? ITEMS_BY_KIND('storage').map(s => ({ id: s.id, name: s.name, sub: `${s.capacityPB} PB · ${s.readGBs} GB/s · ${s.rackUnits}U`, kind: 'storage' as const, item: s, price: offerAt(s, g.month).unitPrice, ok: offerAt(s, g.month).available }))
    : ITEMS_BY_KIND('power').filter(p => p.powerType === 'pdu' || p.powerType === 'power-shelf').map(p => ({ id: p.id, name: p.name, sub: `${p.powerType} · ${p.capacityKW} kW`, kind: 'power' as const, item: p, price: offerAt(p, g.month).unitPrice, ok: offerAt(p, g.month).available }));
  const TOP = 44, H = TOP + units * UH + 44;
  const uB = (u: number) => TOP + (units - u) * UH;
  const kw = v?.stats.kW ?? 0;
  const dropU = (e: React.DragEvent<SVGElement>) => { const svg = e.currentTarget.ownerSVGElement ?? (e.currentTarget as unknown as SVGSVGElement); const r = svg.getBoundingClientRect(); const y = (e.clientY - r.top) / r.height * H; return Math.max(0, Math.min(units - 1, Math.floor(units - (y - TOP) / UH))); };
  const ghost = armed && hoverU != null ? (() => { const h = heightOf(make(armed)); const s = fitsAt(items, h, hoverU) ? hoverU : fitsAt(items, h, hoverU - h + 1) ? hoverU - h + 1 : hoverU; return { s, h, ok: fitsAt(items, h, s) }; })() : null;
  const zone = (a: number, b: number, label: string, col: string) => <g style={{ pointerEvents: 'none' }}><rect x={RAIL + 2} y={uB(b)} width={RW - RAIL * 2 + 10} height={(b - a) * UH} fill={col} fillOpacity={.06} /><text x={RW - RAIL + 6} y={uB(b) + 11} fontSize={9} fill={col} opacity={.9} textAnchor="end" style={{ letterSpacing: '.12em' }}>{label}</text></g>;
  return <div className="fb cgd"><Panel title="Rack bench" glow cls="fillp">
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
      <select value={rid} onChange={e => { setRid(e.target.value); setItems([]); }} style={{ flex: 1, minWidth: 200 }}>{racks.map(r => <option key={r.id} value={r.id}>{r.name} ({r.units}U, {r.maxKW} kW)</option>)}</select>
      <select value={cool} onChange={e => setCool(e.target.value as CoolingClass)}>{['air', 'rdhx', 'dlc', 'immersion'].map(c => <option key={c}>{c}</option>)}</select>
      <select value="" onChange={e => e.target.value && loadTemplate(e.target.value)}><option value="">📦 pre-built rack…</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name} — {t.integrator}</option>)}</select>
      {g.racks.length > 0 && <select value="" onChange={e => e.target.value && loadRack(e.target.value)}><option value="">📂 open saved…</option>{g.racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>}
      <button className="btn sm" onClick={() => setItems([])}>🗑 Clear</button><button className="btn sm" onClick={() => setZoomFull(!zoomFull)}>{zoomFull ? '🔍 fit to window' : '🔍 full size'}</button></div>
    {rk && <div className="sv" style={{ overflow: zoomFull ? 'auto' : 'hidden' }}><svg viewBox={`0 0 ${RW + 84} ${H}`} width={zoomFull ? '100%' : undefined} height={zoomFull ? undefined : '100%'} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', margin: '0 auto', borderRadius: 10, background: 'radial-gradient(700px 500px at 50% 20%,#14293d,#070d14)' }}
        onDragOver={e => { e.preventDefault(); setHoverU(dropU(e as any)); }} onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('text/rackpart'); if (!id) return; const [k, pid] = id.split('|'); placeAt({ kind: k as any, id: pid }, dropU(e as any)); }}>
        <BoardDefs />
        <RackFrame units={units} top={TOP} name={`${rk.name} · ${units}U · ${rk.maxKW} kW`} />
        {zone(Math.max(0, units - 4), units, 'TOR / NETWORK', '#4fd1ff')}{zone(0, Math.min(units, 6), 'POWER / STORAGE', '#ffb020')}{zone(6, Math.max(6, units - 4), 'COMPUTE', '#76b900')}
        {Array.from({ length: units }).map((_, u) => occ[u] === -1 && <rect key={'e' + u} x={RAIL + 2} y={uB(u + 1)} width={RW - RAIL * 2 + 10} height={UH} fill={selU === u ? 'rgba(79,209,255,.28)' : 'transparent'} stroke={selU === u ? '#4fd1ff' : 'transparent'} style={{ cursor: 'pointer' }} onMouseEnter={() => setHoverU(u)} onMouseLeave={() => setHoverU(null)} onClick={() => armed ? placeAt(armed, u) : setSelU(selU === u ? null : u)} />)}
        {ghost && <rect x={RAIL + 4} y={uB(ghost.s + ghost.h) + 1} width={RW - RAIL * 2 + 6} height={ghost.h * UH - 2} rx={3} fill={ghost.ok ? '#4fd1ff' : '#ff5d73'} fillOpacity={.22} stroke={ghost.ok ? '#4fd1ff' : '#ff5d73'} strokeWidth={2} strokeDasharray="6 4" style={{ pointerEvents: 'none' }} />}
        {items.map((it, i) => { const m = meta(it); const hu = heightOf(it); const s0 = it.u ?? 0; const col = RC[it.type];
          const itm = it.type === 'switch' ? getItem(it.switchId) : it.type === 'storage' ? getItem(it.storageId) : it.type === 'power' ? getItem(it.powerId) : undefined;
          const tray = it.type === 'tray' ? g.trays.find(x => x.id === it.trayId) : undefined;
          const accel = tray ? validateTray(tray, getItem).stats.accels : 0;
          if (it.type === 'tray') { const u1 = unitsPer(it); return <g key={i} onClick={() => setSelDev(i)} style={{ cursor: 'pointer' }}>{Array.from({ length: it.count }).map((_, k) => <Device key={k} kind="tray" y={uB(s0 + (k + 1) * u1)} h={u1} label={m.label} sub={`${m.sub} · ${(m.kw / it.count).toFixed(1)} kW`} color={col} item={undefined} accel={accel} selected={selDev === i} />)}</g>; }
          return <g key={i} onClick={() => setSelDev(i)} style={{ cursor: 'pointer' }}><Device kind={it.type} y={uB(s0 + hu)} h={hu} label={m.label} sub={`${m.sub}${m.kw ? ` · ${m.kw.toFixed(1)} kW` : ''}`} color={col} item={itm as CatalogItem | undefined} selected={selDev === i} /></g>; })}
        <rect x={RW + 30} y={TOP} width={22} height={units * UH} rx={6} fill="#0e1a28" stroke="#2b3b50" />
        <rect x={RW + 30} y={TOP + units * UH * (1 - Math.min(1, kw / Math.max(1, rk.maxKW)))} width={22} height={units * UH * Math.min(1, kw / Math.max(1, rk.maxKW))} rx={6} fill={kw > rk.maxKW ? '#ff5d73' : kw > rk.maxKW * .85 ? '#ffb020' : '#3ddc97'} />
        <text x={RW + 41} y={TOP - 8} fontSize={11} fill="#9bb7cc" textAnchor="middle">kW</text>
        <text x={RW + 66} y={TOP + units * UH} fontSize={11} fill="#9bb7cc" transform={`rotate(-90 ${RW + 66} ${TOP + units * UH})`}>{kw.toFixed(0)} / {rk.maxKW} kW</text>
      </svg></div>}
    {msg && <div className="warn" style={{ marginTop: 6 }}>{msg}</div>}
  </Panel><div className="col">
    {selDev != null && items[selDev] && <Panel title={`Selected: ${meta(items[selDev]).label}`} glow right={<span className="tag">U{(items[selDev].u ?? 0) + 1}–{(items[selDev].u ?? 0) + heightOf(items[selDev])}</span>}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {items[selDev].type !== 'power' && <><button className="btn sm" onClick={() => bump(selDev, -1)}>− count</button><b className="mono">{items[selDev].count}</b><button className="btn sm" onClick={() => bump(selDev, 1)}>+ count</button></>}
        <button className="btn sm" onClick={() => nudge(selDev, 1)}>▲ up</button><button className="btn sm" onClick={() => nudge(selDev, -1)}>▼ down</button>
        <button className="btn sm" onClick={() => { setItems(items.filter((_, k) => k !== selDev)); setSelDev(null); }}>🗑 remove</button></div></Panel>}
    <Panel title="Install into rack" glow>
      <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>{(['switch', 'tray', 'power', 'storage'] as const).map(k => <button key={k} className={'btn sm' + (tab === k ? ' pri' : '')} onClick={() => setTab(k)}>{k === 'tray' ? 'Compute trays' : k === 'switch' ? 'ToR / switches' : k === 'storage' ? 'Storage' : 'Power'}</button>)}</div>
      <div className="dim" style={{ fontSize: 11, marginBottom: 6 }}>{selU != null ? `Target: U${selU + 1}. ` : 'No U selected — Add puts it in the best free spot (switches go to the top). '}{armed ? 'A part is armed — click an empty U to place it.' : ''}</div>
      <div className="binlist">{palette.length === 0 && <span className="dim">{tab === 'tray' ? 'No saved trays — build one on the Tray bench or load a pre-built rack.' : 'Nothing here yet.'}</span>}
        {palette.map(p => { const on = armed?.id === p.id; return <div key={p.id} draggable={p.ok} onDragStart={e => e.dataTransfer.setData('text/rackpart', `${p.kind}|${p.id}`)} className={'partcard' + (on ? ' on' : '')} style={{ opacity: p.ok ? 1 : .45, cursor: p.ok ? 'grab' : 'not-allowed' }} onClick={() => p.ok && setArmed(on ? null : { kind: p.kind, id: p.id })}>
          {p.item ? <ItemArt item={p.item} size={32} /> : <div style={{ width: 32, height: 32, borderRadius: 6, background: RC[p.kind], opacity: .5 }} />}
          <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 12, color: RC[p.kind] }}>{p.name}</b><div className="dim" style={{ fontSize: 10.5 }}>{p.sub}{p.price ? ` · ${usd(p.price)}` : ''}</div></div>
          <button className="btn sm" disabled={!p.ok} onClick={e => { e.stopPropagation(); placeAt({ kind: p.kind, id: p.id }, selU); }}>Add</button></div>; })}</div>
      <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>Drag a part onto the rack, or click a part to arm it and click the U where it should sit. Zones are hints: ToR switches at the top, compute in the middle, power/storage at the bottom.</div>
    </Panel>
    {rk && v && <Panel glow title="Rack validation"><div className="grid g3" style={{ marginBottom: 8 }}><Stat label="Power" value={`${v.stats.kW.toFixed(0)} / ${rk.maxKW} kW`} cls={v.stats.kW > rk.maxKW ? 'neg' : ''} /><Stat label="Units" value={`${v.stats.units}/${rk.units}`} /><Stat label="Weight" value={`${num(v.stats.weightKg)} kg`} /><Stat label="Cost" value={usd(v.stats.costUSD)} /><Stat label="Accels" value={v.stats.accels} /><Stat label="Scale-up" value={v.stats.scaleUpDomain} /></div>
      <Issues issues={v.issues} onLearn={setLearn} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}><input value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} /><button className="btn go" disabled={v.issues.some(i => i.severity === 'error') || !items.length} onClick={() => setMsg(useGame.getState().saveRack({ ...design, id: `rack-${g.racks.length + 1}` }).message)}>SAVE RACK</button></div></Panel>}
    <Panel title="Saved racks">{g.racks.length ? g.racks.map(r => <div key={r.id} className="mono" style={{ fontSize: 12 }}>{r.id} · {r.name}</div>) : <span className="dim">None yet</span>}</Panel></div></div>;
}

export default function Designer({ setLearn }: { setLearn: (id: string) => void }) {
  const [tab, setTab] = useState<'tray' | 'rack'>(typeof location !== 'undefined' && location.hash.includes('rack') ? 'rack' : 'tray');
  return <div className="fit"><div className="hdr"><h2>Design Lab</h2>
    <button className={'btn' + (tab === 'tray' ? ' pri' : '')} onClick={() => setTab('tray')}>① Tray bench</button><button className={'btn' + (tab === 'rack' ? ' pri' : '')} onClick={() => setTab('rack')}>② Rack bench</button></div>
    {tab === 'tray' ? <TrayLab setLearn={setLearn} /> : <RackLab setLearn={setLearn} />}</div>;
}
