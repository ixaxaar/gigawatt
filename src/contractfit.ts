// Can my capacity serve this contract? Per-cluster checks, shortfall maths and pipeline accounting.
import { uplinkGbps, totalNeedGbps, contractNeedGbps } from './sim/internet';
import { hallResilience } from './sim/resilience';
import { getItem } from './data';
import { inferenceCapacity } from './sim/perf';
import type { Accelerator, Cluster, ClusterStats, Contract, GameState } from './types';

export interface Check { label: string; need: string; have: string; ok: boolean }
export interface ClusterFit { cluster: Cluster; checks: Check[]; ok: boolean; score: number }
export interface Fit {
  best?: ClusterFit; all: ClusterFit[]; verdict: 'ready' | 'building' | 'short' | 'none';
  shortfall: string; pipelineAccels: number; monthsToDeploy: number;
}

const k = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${Math.round(n)}`;

/** Accelerators that are not yet in a cluster: commissioning racks + (inventory GPUs) + on order. */
export function pipeline(g: GameState) {
  const clustered = new Set(g.clusters.flatMap((c) => c.rackIds));
  let online = 0, installing = 0;
  for (const c of g.clusters) online += c.stats?.accelerators ?? 0;
  const accelsIn = (designId: string) => { const d = g.racks.find((r) => r.id === designId); let n = 0; for (const i of d?.items ?? []) if (i.type === 'tray') for (const p of g.trays.find((t) => t.id === i.trayId)?.parts ?? []) if (getItem(p.itemId)?.kind === 'accelerator') n += p.count * i.count; return n; };
  let freeOnline = 0;
  for (const h of g.halls) for (const p of h.racks) {
    if (clustered.has(p.id)) continue;
    if (p.status === 'online') freeOnline += accelsIn(p.designId); else installing += accelsIn(p.designId);
  }
  const isAccel = (id: string) => getItem(id)?.kind === 'accelerator';
  const warehouse = Object.entries(g.inventory).filter(([id]) => isAccel(id)).reduce((n, [, q]) => n + q, 0);
  const ordered = g.orders.filter((o) => isAccel(o.itemId)).reduce((n, o) => n + o.qty, 0);
  return { online, freeOnline, installing, warehouse, ordered };
}

export function contractFit(g: GameState, c: Contract): Fit {
  const all: ClusterFit[] = g.clusters.filter((cl) => cl.stats).map((cl) => {
    const s = cl.stats!; const checks: Check[] = [];
    if (c.kind === 'training') {
      checks.push({ label: 'Accelerators', need: `≥ ${k(c.minAccelerators)}`, have: k(s.accelerators), ok: s.accelerators >= c.minAccelerators });
      checks.push({ label: 'Scale-up domain', need: `≥ ${c.minScaleUpDomain}`, have: `${s.scaleUpDomain}`, ok: s.scaleUpDomain >= c.minScaleUpDomain });
      checks.push({ label: 'Scale-out / GPU', need: `≥ ${c.minScaleOutGBsPerAccel} GB/s`, have: `${s.effScaleOutGBs.toFixed(1)} GB/s`, ok: s.effScaleOutGBs >= c.minScaleOutGBsPerAccel });
      checks.push({ label: 'Total memory', need: `≥ ${k(c.minTotalMemGB / 1000)} TB`, have: `${k(s.totalMemGB / 1000)} TB`, ok: s.totalMemGB >= c.minTotalMemGB });
    } else {
      const a = getItem(s.acceleratorId);
      if (a?.kind === 'accelerator') {
        const cap = inferenceCapacity(s, a as Accelerator, c.model, { contextTokens: c.contextTokens, tpotMs: c.tpotMs });
        checks.push({ label: 'Throughput', need: `${k(c.tokensPerSec)} tok/s`, have: `${k(cap.tokensPerSec)} tok/s`, ok: cap.tokensPerSec >= c.tokensPerSec });
        checks.push({ label: 'Model fits', need: `${c.model.paramsB}B weights`, have: cap.fitsWeights ? `fits (TP${cap.tpSize})` : 'does not fit', ok: cap.fitsWeights });
        checks.push({ label: 'p95 TTFT', need: `≤ ${c.ttftMs} ms`, have: `${Math.round(cap.ttftMs)} ms`, ok: cap.ttftMs <= c.ttftMs });
        (checks as any).cap = cap.tokensPerSec;
      } else checks.push({ label: 'Accelerators', need: 'any', have: 'none', ok: false });
    }
    return { cluster: cl, checks, ok: checks.every((x) => x.ok), score: checks.filter((x) => x.ok).length / checks.length };
  }).sort((a, b) => b.score - a.score);
  const best = all[0];
  const p = pipeline(g);
  const pipelineAccels = p.freeOnline + p.installing + p.warehouse + p.ordered;
  let shortfall = '';
  let verdict: Fit['verdict'] = 'none';
  if (best?.ok) verdict = 'ready';
  else if (c.kind === 'training') {
    const have = best?.cluster.stats?.accelerators ?? 0;
    const gap = Math.max(0, c.minAccelerators - have);
    shortfall = gap > 0 ? `Short ${k(gap)} accelerators vs your best cluster (${k(have)}). ` : '';
    const failing = (best?.checks ?? []).filter((x) => !x.ok && x.label !== 'Accelerators').map((x) => x.label.toLowerCase());
    if (failing.length) shortfall += `Also fails: ${failing.join(', ')} — needs a different platform/fabric, not just more of the same.`;
    verdict = pipelineAccels + have >= c.minAccelerators && !failing.length ? 'building' : 'short';
    if (!best) { shortfall = `${p.freeOnline > 0 ? `You have ${k(p.freeOnline)} online accelerators not yet in a cluster — group them in Network. ` : ''}You have no cluster yet. Needs ${k(c.minAccelerators)} accelerators in one fabric with a ${c.minScaleUpDomain}-wide scale-up domain.`; verdict = pipelineAccels >= c.minAccelerators ? 'building' : 'short'; }
  } else {
    const cap = (best?.checks as any)?.cap as number | undefined;
    if (cap !== undefined && cap > 0 && cap < c.tokensPerSec) { shortfall = `Your best cluster serves ${k(cap)} tok/s; need ${k(c.tokensPerSec)} → about ${Math.ceil(c.tokensPerSec / cap)}× that capacity.`; verdict = pipelineAccels > 0 ? 'building' : 'short'; }
    else if (best) { shortfall = 'A hard limit fails (weights/TTFT) — more of the same GPU will not help; pick more memory or faster prefill.'; verdict = 'short'; }
    else { shortfall = 'You have no cluster yet.'; verdict = pipelineAccels > 0 ? 'building' : 'short'; }
  }
  // typical time to deploy more: longest GPU lead (~4 mo) + 2 install + 1 commission + cluster build
  const monthsToDeploy = verdict === 'ready' ? 0 : p.ordered + p.warehouse + p.installing + p.freeOnline > 0 ? 3 : 7;
  return { best, all, verdict, shortfall, pipelineAccels, monthsToDeploy };
}

// ---------------------------------------------------------------------------
// "What do I need?": turn a contract into concrete purchasable builds.
// ---------------------------------------------------------------------------
import { TEMPLATES } from './data/templates';
import { templateFacts } from './plan';
import { quote } from './quote';
import type { SystemTemplate } from './types';

export interface BuildOption {
  t: SystemTemplate; racks: number; accels: number; cost: number; lead: number; kw: number;
  readyMonth: number; fitsRamp: boolean; slack: number; revenueMo: number; powerMo: number; paybackMo: number;
  hallGaps: string[]; why: string; tags: string[]; unavailable: string[]; cover: Check[];
}

const HOURS = 730;
export function buildOptions(g: GameState, c: Contract, signedAt?: number): BuildOption[] {
  const year = 2020 + g.month / 12;
  const hall = g.halls[0];
  const cls: Record<string, number> = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };
  const ramp = c.rampMonths ?? 4;
  const deployBy = signedAt != null ? signedAt : g.month + ramp;
  const out: BuildOption[] = [];
  for (const t of TEMPLATES) {
    if (t.availableFrom > year || (t.eolAfter && year > t.eolAfter) || t.tier === 'turnkey' && false) continue;
    const f = templateFacts(t);
    if (f.errors.length || f.accels <= 0) continue;
    let racks = 0, why = ''; let capInfo: ReturnType<typeof inferenceCapacity> | undefined;
    const accelItem = (() => { for (const p of t.tray.parts) { const it = getItem(p.itemId); if (it?.kind === 'accelerator') return it as Accelerator; } })();
    if (!accelItem) continue;
    const trayAccels = t.tray.parts.filter(p => getItem(p.itemId)?.kind === 'accelerator').reduce((n, p) => n + p.count, 0) || 1;
    const nicGBs = t.tray.parts.reduce((n, p) => { const it = getItem(p.itemId); return n + (it?.kind === 'nic' ? it.gbps * p.count : 0); }, 0) / 8 / trayAccels;
    if (c.kind === 'training') {
      if (f.scaleUp < c.minScaleUpDomain) continue;
      if (nicGBs < c.minScaleOutGBsPerAccel * 0.98) continue; // NICs cannot deliver the required scale-out bandwidth per accelerator
      racks = Math.max(Math.ceil(c.minAccelerators / f.accels), Math.ceil(c.minTotalMemGB / Math.max(1, f.memGB)));
      why = `${racks * f.accels} accelerators, ${f.scaleUp}-wide NVLink/scale-up domain, ${Math.round(racks * f.memGB / 1000)} TB memory`;
    } else {
      for (let r = 1; r <= 96; r++) {
        const stats: ClusterStats = { accelerators: r * f.accels, acceleratorId: accelItem.id, scaleUpDomain: f.scaleUp, totalMemGB: r * f.memGB, peakPFLOPSFp8: 0, peakPFLOPSBf16: 0, powerKW: 0, bisectionTbps: 0, effScaleOutGBs: 50, switchCounts: {}, cableCounts: {}, issues: [] };
        const cap = inferenceCapacity(stats, accelItem, c.model, { contextTokens: c.contextTokens, tpotMs: c.tpotMs });
        if (cap.fitsWeights && cap.ttftMs <= c.ttftMs && cap.tokensPerSec >= c.tokensPerSec) { capInfo = cap; racks = r; why = `${Math.round(cap.tokensPerSec).toLocaleString()} tok/s, TTFT ${Math.round(cap.ttftMs)} ms, TP${cap.tpSize} × ${cap.replicas} replicas`; break; }
        if (!cap.fitsWeights && r >= 8) break;
      }
      if (!racks) continue;
    }
    if (racks > 256) continue;
    const q = quote(t, racks, g.month);
    if (q.unavailable.length || !q.lines.length) continue;
    const kw = f.kWPerRack * racks, accels = racks * f.accels;
    const readyMonth = g.month + q.lead + 2 /* install */ + 1 /* commission + cluster */;
    const hallGaps: string[] = [];
    const used = g.halls.flatMap(h => h.racks).length;
    if (kw > (hall?.itPowerKW ?? 0)) hallGaps.push(`Power: need ${kw.toFixed(0)} kW IT, hall has ${hall?.itPowerKW ?? 0} kW`);
    if ((cls[hall?.coolingClass ?? 'air'] ?? 0) < (cls[t.rack.cooling] ?? 0)) hallGaps.push(`Cooling type: needs a ${t.rack.cooling.toUpperCase()} hall — build one in Build`);
    else if (kw > (hall?.coolingKW ?? 0)) hallGaps.push(`Cooling: need ${kw.toFixed(0)} kW heat rejection, hall has ${hall?.coolingKW ?? 0} kW`);
    if (used + racks > (hall?.rackSlots ?? 0)) hallGaps.push(`Space: ${racks} racks but only ${(hall?.rackSlots ?? 0) - used} free slots`);
    const revenueMo = c.kind === 'training' ? accels * c.pricePerAccelHour * HOURS : Math.min(c.tokensPerSec, c.tokensPerSec) * HOURS * 3600 / 1e6 * c.pricePerMTok;
    const powerMo = kw * 1.3 * HOURS * g.utilityUSDPerKWh;
    const net = revenueMo - powerMo;
    const cover: Check[] = c.kind === 'training' ? [
      { label: 'Accelerators', need: `≥ ${c.minAccelerators}`, have: `${accels}`, ok: accels >= c.minAccelerators },
      { label: 'Scale-up domain', need: `≥ ${c.minScaleUpDomain}`, have: `${f.scaleUp}`, ok: f.scaleUp >= c.minScaleUpDomain },
      { label: 'Scale-out per GPU', need: `≥ ${c.minScaleOutGBsPerAccel} GB/s`, have: `${nicGBs.toFixed(1)} GB/s (NICs)`, ok: nicGBs >= c.minScaleOutGBsPerAccel * 0.98 },
      { label: 'Memory', need: `≥ ${Math.round(c.minTotalMemGB / 1000)} TB`, have: `${Math.round(racks * f.memGB / 1000)} TB`, ok: racks * f.memGB >= c.minTotalMemGB },
    ] : [
      { label: 'Throughput', need: `${Math.round(c.tokensPerSec).toLocaleString()} tok/s`, have: `${Math.round(capInfo?.tokensPerSec ?? 0).toLocaleString()} tok/s`, ok: (capInfo?.tokensPerSec ?? 0) >= c.tokensPerSec },
      { label: 'Model fits', need: `${c.model.paramsB}B`, have: capInfo?.fitsWeights ? `TP${capInfo.tpSize}` : 'no', ok: !!capInfo?.fitsWeights },
      { label: 'p95 TTFT', need: `≤ ${c.ttftMs} ms`, have: `${Math.round(capInfo?.ttftMs ?? 0)} ms`, ok: (capInfo?.ttftMs ?? 1e9) <= c.ttftMs },
    ];
    const headroom = uplinkGbps(g) - totalNeedGbps(g), needNet = contractNeedGbps(c);
    cover.push({ label: 'Internet uplink', need: `${needNet.toFixed(1)} Gb/s`, have: g.uplinks ? `${Number.isFinite(headroom) ? Math.max(0, headroom).toFixed(0) : '∞'} Gb/s free${headroom >= needNet ? '' : ' — buy transit (Easy path does)'}` : 'unlimited', ok: headroom >= needNet });
    if (c.slaAvailability >= 0.995 && hall) { const r = hallResilience(hall); cover.push({ label: 'Outage protection', need: `${(c.slaAvailability * 100).toFixed(1)}% SLA → tier N or better`, have: `${r.tier}${r.gaps[0] ? ' — ' + r.gaps[0] : ''}`, ok: r.score >= 0.9 }); }
    cover.push({ label: 'Deploy window', need: `by ${Math.round(deployBy)}`, have: `ready ${readyMonth}`, ok: readyMonth <= deployBy });
    cover.push({ label: 'Hall power / cooling / space', need: `${kw.toFixed(0)} kW · ${racks} racks`, have: hallGaps.length ? 'needs plant' : 'fits', ok: hallGaps.length === 0 });
    out.push({ t, racks, accels, cover, cost: q.cost, lead: q.lead, kw, readyMonth, fitsRamp: readyMonth <= deployBy, slack: deployBy - readyMonth, revenueMo, powerMo, paybackMo: net > 0 ? q.cost / net : Infinity, hallGaps, why, tags: [], unavailable: q.unavailable });
  }
  const feasible = out.filter(o => o.cost <= Math.max(g.cash * 4, 1));
  const pool = feasible.length ? feasible : out;
  pool.sort((a, b) => a.cost - b.cost);
  const cheapest = pool.find(o => o.fitsRamp) ?? pool[0];
  const fastest = [...pool].sort((a, b) => a.readyMonth - b.readyMonth || a.cost - b.cost)[0];
  const payback = [...pool].filter(o => isFinite(o.paybackMo) && o.fitsRamp).sort((a, b) => a.paybackMo - b.paybackMo)[0];
  cheapest && cheapest.tags.push('💰 cheapest');
  fastest && fastest.tags.push('⚡ fastest');
  payback && payback.tags.push('📈 best payback');
  const picked = [...new Set([cheapest, fastest, payback].filter(Boolean) as BuildOption[])];
  for (const o of pool) { if (picked.length >= 4) break; if (!picked.includes(o)) picked.push(o); }
  return picked;
}
