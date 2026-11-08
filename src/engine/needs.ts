// Read-only "what should I do next" helpers: fleet utilisation and a ranked list of things that need the player.
import { getItem } from '../data';
import { inferenceCapacity } from '../sim/perf';
import { staffNeeded } from '../sim/staffing';
import { BOARD_STRIKES, boardTarget } from '../sim/systems/board';
import { rackAccels } from '../sim/systems/helpers';
import { DILEMMAS } from '../sim/story-data';
import { buildOptions } from '../contractfit';
import { uplinkGbps, totalNeedGbps } from '../sim/internet';
import type { Accelerator, Contract, GameState } from '../types';

export interface ClusterLoad { id: string; name: string; accels: number; contracts: number; loadPct: number; spot: boolean }
export interface Fleet {
  /** Accelerators in clusters that are online. */
  clustered: number;
  /** Accelerators in online racks that are not in any cluster (cannot serve contracts). */
  loose: number;
  /** Clustered accelerators weighted by how much of their capacity contracts use (0..clustered). */
  busy: number;
  /** busy / clustered, 0..1. */
  utilization: number;
  idleClusters: number;
  clusters: ClusterLoad[];
}

/** How loaded each cluster is: training holds a cluster exclusively (100%); inference contracts share it up to its token capacity. */
export function fleetOf(g: GameState): Fleet {
  const clusters: ClusterLoad[] = [];
  let clustered = 0, busy = 0, idleClusters = 0;
  for (const cl of g.clusters) {
    const st = cl.stats; if (!st || st.accelerators <= 0) continue;
    const on = g.activeContracts.filter((a) => a.clusterIds.includes(cl.id));
    let load = 0;
    if (on.some((a) => a.contract.kind === 'training')) load = 1;
    else if (on.length) {
      const accel = getItem(st.acceleratorId);
      if (accel?.kind === 'accelerator') for (const a of on) {
        const k = a.contract; if (k.kind !== 'inference') continue;
        const cap = inferenceCapacity(st, accel as Accelerator, k.model, { contextTokens: k.contextTokens, tpotMs: k.tpotMs }).tokensPerSec;
        load += cap > 0 ? k.tokensPerSec / cap / Math.max(1, a.clusterIds.length) : 0;
      }
      load = Math.min(1, load);
    }
    clustered += st.accelerators; busy += st.accelerators * load;
    if (!on.length) idleClusters += 1;
    clusters.push({ id: cl.id, name: cl.name, accels: st.accelerators, contracts: on.length, loadPct: Math.round(load * 100), spot: (g.spotClusters ?? []).includes(cl.id) });
  }
  const inCluster = new Set(g.clusters.flatMap((c) => c.rackIds));
  let loose = 0;
  for (const h of g.halls) for (const r of h.racks) if (r.status === 'online' && !inCluster.has(r.id)) loose += rackAccels(g, r.designId);
  return { clustered, loose, busy: Math.round(busy), utilization: clustered > 0 ? busy / clustered : 0, idleClusters, clusters };
}

export interface ClusterNet { id: string; name: string; accels: number; gbs: number; tech: string; topology: string; oversub: number; down: number; loss: number; fixMonth: number; fromSpares: boolean; cableName: string; spares: number; contracts: number }
export interface NetHealth {
  clusters: ClusterNet[];
  uplink: { gbps: number; needGbps: number; pct: number; unlimited: boolean };
  /** 0 = healthy, 1 = degraded (links down or uplink above 85%), 2 = saturated. */
  level: 0 | 1 | 2;
  /** Share of scale-out bandwidth available across clustered GPUs, 0..1. */
  bandwidthPct: number;
  summary: string;
}

/** The network at a glance: per-cluster fabric, links down, and the internet uplink. */
export function netHealth(g: GameState): NetHealth {
  const clusters: ClusterNet[] = [];
  let acc = 0; let lossW = 0;
  for (const cl of g.clusters) {
    const st = cl.stats; if (!st || st.accelerators <= 0) continue;
    const f = cl.linkFaults;
    const loss = st.linkLoss ?? 0;
    acc += st.accelerators; lossW += st.accelerators * loss;
    clusters.push({ id: cl.id, name: cl.name, accels: st.accelerators, gbs: st.effScaleOutGBs, tech: cl.fabric?.scaleOutTech ?? '', topology: cl.fabric?.topology ?? '', oversub: cl.fabric?.oversubscription ?? 1, down: f?.down ?? 0, loss, fixMonth: f?.fixMonth ?? 0, fromSpares: f?.fromSpares ?? true, cableName: f ? (getItem(f.cableId)?.name ?? 'link') : '', spares: f ? (g.spareStock?.[f.cableId] ?? 0) : 0, contracts: g.activeContracts.filter((a) => a.clusterIds.includes(cl.id)).length });
  }
  const gb = uplinkGbps(g); const need = totalNeedGbps(g);
  const unlimited = !Number.isFinite(gb);
  const pct = unlimited || gb <= 0 ? 0 : need / gb;
  const bandwidthPct = acc > 0 ? 1 - lossW / acc : 1;
  const downTotal = clusters.reduce((n, c) => n + c.down, 0);
  const level: NetHealth['level'] = pct > 1 ? 2 : downTotal > 0 || pct > 0.85 ? 1 : 0;
  const summary = clusters.length === 0 && need === 0 ? 'No fabric yet' : pct > 1 ? `Internet uplink saturated (${Math.round(pct * 100)}%)` : downTotal > 0 ? `${downTotal} link${downTotal === 1 ? '' : 's'} down, ${Math.round(bandwidthPct * 100)}% bandwidth` : pct > 0.85 ? `Uplink ${Math.round(pct * 100)}% used` : 'All links up';
  return { clusters, uplink: { gbps: unlimited ? 0 : gb, needGbps: need, pct, unlimited }, level, bandwidthPct, summary };
}

export interface Need { id: string; level: 'crit' | 'warn' | 'info'; title: string; detail: string; go: string; button: string }

const usd = (x: number) => (x >= 1e6 ? `$${(x / 1e6).toFixed(1)}M` : `$${Math.round(x / 1e3)}k`);

/** Ranked list of what needs the player right now (most urgent first). Never empty: falls back to "advance a month". */
export function needsOf(g: GameState): Need[] {
  const out: Need[] = [];
  const month = g.month;
  const serving = g.activeContracts.filter((a) => a.clusterIds.length > 0);
  const revenue = serving.reduce((n, a) => {
    const k = a.contract;
    if (k.kind === 'training') return n + a.clusterIds.reduce((m, id) => m + (g.clusters.find((c) => c.id === id)?.stats?.accelerators ?? 0), 0) * k.pricePerAccelHour * 730;
    return n + ((k.tokensPerSec * 730 * 3600) / 1e6) * k.pricePerMTok;
  }, 0);

  const walk = g.activeContracts.filter((a) => a.clusterIds.length === 0 && (a.deployBy ?? a.startMonth + 4) <= month + 1);
  if (walk.length) out.push({ id: 'walk', level: 'crit', title: 'A customer is about to walk', detail: `${walk.map((a) => a.contract.customer).join(', ')}: bring a qualifying cluster online and assign it this month.`, go: 'contracts', button: 'Open Customers' });

  const net = revenue - g.activeContracts.length * 0; void net;
  if (g.cash < 0) out.push({ id: 'cash-neg', level: 'crit', title: 'Cash is negative', detail: 'Creditors close you down after three months. Take a loan, land a contract or sell idle hardware.', go: 'finance', button: 'Open Operations' });

  if (revenue > 0) {
    const ending = serving.filter((a) => a.contract.durationMonths - a.monthsServed <= 3);
    const endingRev = ending.reduce((n, a) => {
      const k = a.contract;
      return n + (k.kind === 'training' ? a.clusterIds.reduce((m, id) => m + (g.clusters.find((c) => c.id === id)?.stats?.accelerators ?? 0), 0) * k.pricePerAccelHour * 730 : ((k.tokensPerSec * 730 * 3600) / 1e6) * k.pricePerMTok);
    }, 0);
    const hasRenewals = g.availableContracts.some((c) => (c as { renewalOf?: string }).renewalOf !== undefined);
    if (endingRev / revenue >= 0.5) out.push({ id: 'cliff', level: 'warn', title: `${Math.round((endingRev / revenue) * 100)}% of your revenue ends within 3 months`, detail: hasRenewals ? 'Renewal offers are on the board: sign them before they expire.' : 'Line up replacement contracts now, or put the idle capacity on the spot market.', go: 'contracts', button: 'Open Customers' });
  }

  const b = g.board;
  if (b && b.strikes > 0) out.push({ id: 'board', level: 'warn', title: `Board strike ${b.strikes} of ${BOARD_STRIKES}`, detail: `Revenue is under target. The next review is in ${12 - ((month - b.startMonth) % 12)} months and wants about ${usd(boardTarget(b.baseNW, Math.round((month - b.startMonth) / 12) + 1))}/mo.`, go: 'contracts', button: 'Find contracts' });

  if (g.story?.open) {
    const d = DILEMMAS.find((x) => x.id === g.story!.open!.id);
    if (d) out.push({ id: 'dilemma', level: 'warn', title: `Decision: ${d.title}`, detail: `Answer within ${Math.max(0, 3 - (g.month - g.story.open.month))} months or the offer lapses.`, go: 'story', button: 'Decide' });
  }

  const nh = netHealth(g);
  const hurt = nh.clusters.filter((c) => c.down > 0);
  if (hurt.length) out.push({ id: 'links', level: hurt.some((c) => c.contracts > 0) ? 'warn' : 'info', title: `${hurt.reduce((n, c) => n + c.down, 0)} network link${hurt.reduce((n, c) => n + c.down, 0) === 1 ? '' : 's'} down`, detail: `${hurt.map((c) => `${c.name}: ${c.down} × ${c.cableName}, back in month ${c.fixMonth}`).join('; ')}. ${hurt.every((c) => c.fromSpares) ? 'Swapping from spares.' : 'Spare cables and optics in the warehouse make this a one-month blip.'}`, go: 'network', button: 'Open Supercomputer' });
  if (nh.uplink.pct > 0.85) out.push({ id: 'uplink', level: nh.uplink.pct > 1 ? 'crit' : 'warn', title: nh.uplink.pct > 1 ? 'Internet uplink is saturated' : 'Internet uplink is nearly full', detail: `Customers need ${nh.uplink.needGbps.toFixed(1)} Gb/s of ${nh.uplink.gbps.toFixed(0)} Gb/s. Over 100% every contract loses availability: buy transit on Build.`, go: 'facility', button: 'Open Build' });

  const need = staffNeeded(g);
  if (g.staff < need.needed) out.push({ id: 'staff', level: g.staff < need.needed * 0.6 ? 'crit' : 'warn', title: `Understaffed: ${g.staff} of ${need.needed} operators`, detail: 'A short crew means more failures, slower repairs and lost availability on every contract.', go: 'finance', button: 'Hire staff' });

  const f = fleetOf(g);
  const idle = f.clustered - f.busy;
  if (f.clustered >= 16 && idle / f.clustered > 0.4) out.push({ id: 'idle', level: 'info', title: `${Math.round(idle)} GPUs are sitting idle`, detail: 'Sign contracts they can serve, or sell the spare capacity on the spot market.', go: 'contracts', button: 'Open Customers' });
  if (f.loose >= 8) out.push({ id: 'loose', level: 'info', title: `${f.loose} GPUs are not in a cluster`, detail: 'Racks outside a cluster cannot serve contracts. Group them on the Supercomputer screen.', go: 'network', button: 'Open Supercomputer' });

  if (g.stats && g.stats.contractsCompleted === 0 && g.activeContracts.length === 0 && g.orders.length === 0 && g.halls.every((h) => h.racks.length === 0)) out.push({ id: 'start', level: 'info', title: 'Land your first customer', detail: 'Open Customers, pick an offer you can serve, and hit Easy Path: the game orders, installs and assigns for you.', go: 'contracts', button: 'Open Customers' });

  const rank = { crit: 0, warn: 1, info: 2 } as const;
  out.sort((a, b2) => rank[a.level] - rank[b2.level]);
  if (!out.length) out.push({ id: 'ok', level: 'info', title: 'All quiet', detail: 'Nothing needs you right now. Advance the month, or scout the next hardware keynote.', go: 'dash', button: 'Next month' });
  return out;
}

export interface OfferMoney { monthly: number; total: number; powerMo: number; profitMo: number }

/** What an offer pays at full size and roughly what it costs to power, so players can compare offers by profit. */
export function offerMoney(g: GameState, c: Contract): OfferMoney {
  const monthly = c.kind === 'training' ? c.minAccelerators * c.pricePerAccelHour * 730 : ((c.tokensPerSec * 730 * 3600) / 1e6) * c.pricePerMTok;
  const opts = buildOptions({ ...g, availableContracts: [] } as GameState, c).filter((o) => o.powerMo > 0);
  const cheapest = [...opts].sort((a, b) => a.cost - b.cost)[0];
  const powerMo = cheapest ? cheapest.powerMo : c.kind === 'training' ? c.minAccelerators * 1.05 * 1.3 * 730 * g.utilityUSDPerKWh : monthly * 0.05;
  return { monthly: Math.round(monthly), total: Math.round(monthly * c.durationMonths), powerMo: Math.round(powerMo), profitMo: Math.round(monthly - powerMo) };
}
