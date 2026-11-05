// Headless engine bridge for the Godot front-end. JSON lines on stdin -> JSON lines on stdout.
// Request:  {"id":1,"fn":"act","name":"buyTemplate","args":[...]}  |  {"id":2,"fn":"q","name":"validateRack","args":[...]}  |  {"id":3,"fn":"init"}
// Response: {"id":1,"ok":true,"result":...,"game":{...}}   (game is attached to every `act` and `init` response)
import { createInterface } from 'node:readline';
import * as ENV from './env/env';
import { SCENARIOS } from './env/scenarios';
// localStorage shim so the store's save/load work headless.
const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };

import { FLOOR_UNIT_SLOTS, FLOOR_UNIT_COST, floorCommissionMonths, useGame, offerAt, selectMonthlyPnL, selectNetWorth, selectCapexBasis, rackBom, volumeDiscount } from './store';
import { ALL_ITEMS, VENDORS, getItem } from './data';
import { TEMPLATES } from './data/templates';
import { MODELS, scaleOutTier, gpuHourAnchor } from './sim/market';
import { MISSIONS } from './missions';
import { CONCEPTS } from './concepts';
import { validateTray, validateRack, validateHall, computePUE, partFitsSlot } from './sim/validate';
import { evaluateCluster } from './sim/network';
import { trainingTokensPerSec, inferenceCapacity, trainingMFU } from './sim/perf';
import { quote, hallChecks } from './quote';
import { templateFacts, templateBom, racksFor, rackIdOf, trayIdOf } from './plan';
import { contractFit, buildOptions, pipeline } from './contractfit';
import { autoFabric } from './autopilot';
import { ledger, rackReadiness, machineLedger } from './ledger';
import { hallResilience } from './sim/resilience';
import { uplinkGbps, uplinkMonthlyUSD, carrierCount, totalNeedGbps, contractNeedGbps } from './sim/internet';
import { monthlyOpex, HOURS_PER_MONTH } from './sim/economy';
import { POWER_SOURCES, settlePower, spotAnchor, spotRevenue, spotUtilization } from './sim/power';
import { recommendedSpares, spareQty, rackParts, rackRates, partClass, PART_LABEL } from './sim/failures';
import { validateRack as vr } from './sim/validate';
import type { Cluster, TrayDesign, Chassis, Cpu, Nic } from './types';
import { ITEMS_BY_KIND } from './data';
import { gpuHourAnchor as gha } from './sim/market';

const st = () => useGame.getState();
const G = () => st().game;
const ctxOf = (g: any) => { const placed = g.halls.flatMap((h: any) => h.racks); return { getRack: (id: string) => { const pid = placed.find((p: any) => p.id === id)?.designId ?? id; return g.racks.find((r: any) => r.id === pid); }, getTray: (id: string) => g.trays.find((t: any) => t.id === id), getItem }; };
const tpl = (id: string) => TEMPLATES.find(t => t.id === id)!;

const Q: Record<string, (...a: any[]) => any> = {
  validateTray: (tray) => validateTray(tray, getItem),
  validateRack: (rack, trays) => validateRack(rack, trays ?? G().trays, getItem),
  validateHall: (hallId) => { const g = G(); const hall = g.halls.find(h => h.id === hallId)!; return validateHall(hall, hall.racks.map(p => ({ design: g.racks.find(r => r.id === p.designId)!, trays: g.trays })), getItem); },
  hallStats: (hallId) => { const g = G(); const hall = g.halls.find(h => h.id === hallId)!; const kw = hall.racks.reduce((n, p) => { const d = g.racks.find(r => r.id === p.designId); return n + (d ? validateRack(d, g.trays, getItem).stats.kW : 0); }, 0); return { kw, pue: computePUE(hall, getItem), resilience: hallResilience(hall) }; },
  rackStatsAll: () => { const g = G(); return Object.fromEntries(g.racks.map(d => [d.id, validateRack(d, g.trays, getItem).stats])); },
  partFitsSlot: (slot, itemId) => partFitsSlot(slot, getItem(itemId)!),
  offer: (itemId) => { const it = getItem(itemId); return it ? offerAt(it, G().month) : null; },
  offersAll: () => Object.fromEntries(ALL_ITEMS.map(i => [i.id, offerAt(i, G().month)])),
  volumeDiscount: (itemId, n, unit) => volumeDiscount(getItem(itemId)!, n, unit),
  quote: (tid, racks) => quote(tpl(tid), racks, G().month),
  hallChecks: (tid, racks) => hallChecks(G(), tpl(tid), racks),
  templateFacts: (tid) => templateFacts(tpl(tid)),
  templatesAll: () => TEMPLATES.map(t => ({ ...templateFacts(t), id: t.id, racksFor1: 1, quote1: quote(t, 1, G().month) })),
  templateBom: (tid, racks) => templateBom(tpl(tid), racks),
  racksFor: (tid, n) => racksFor(tpl(tid), n),
  rackBom: (designId) => rackBom(G(), designId),
  rackReadiness: (designId, racks) => rackReadiness(G(), designId, racks ?? 1),
  ledger: () => ledger(G()),
  machineLedger: () => machineLedger(G()),
  floorQuote: (n) => ({ units: n, slots: n * FLOOR_UNIT_SLOTS, cost: n * FLOOR_UNIT_COST, months: floorCommissionMonths(n) }),
  pnl: () => selectMonthlyPnL(G()),
  netWorth: () => selectNetWorth(G()),
  capexBasis: () => selectCapexBasis(G()),
  opex: () => monthlyOpex(G()),
  resilience: (hallId) => hallResilience(G().halls.find(h => h.id === hallId)!),
  internet: () => { const g = G(); return { have: uplinkGbps(g), need: totalNeedGbps(g), carriers: carrierCount(g), mrc: uplinkMonthlyUSD(g) }; },
  contractNeed: (cid) => { const g = G(); const c = g.availableContracts.find(x => x.id === cid) ?? g.activeContracts.find(a => a.contract.id === cid)?.contract; return c ? contractNeedGbps(c) : 0; },
  evaluateCluster: (cluster: Cluster) => evaluateCluster(cluster, ctxOf(G())),
  clusterPerf: (cluster: Cluster, modelId: string, ctxTokens = 4096) => { const g = G(); const stats = evaluateCluster(cluster, ctxOf(g)); const accel: any = getItem(stats.acceleratorId); const m = MODELS.find(x => x.id === modelId)!; return { stats, train: accel ? trainingTokensPerSec(stats, accel, m) : null, infer: accel ? inferenceCapacity(stats, accel, m, { contextTokens: ctxTokens }) : null }; },
  models: () => { const y = 2020 + G().month / 12; return { all: MODELS, tier: scaleOutTier(y), anchor: gpuHourAnchor(y) }; },
  autoFabric: (rackIds, target) => autoFabric(G(), rackIds, target),
  contractFit: (cid) => { const g = G(); const c = g.availableContracts.find(x => x.id === cid) ?? g.activeContracts.find(a => a.contract.id === cid)?.contract; return c ? contractFit(g, c) : null; },
  buildOptions: (cid, signedAt) => { const g = G(); const c = g.availableContracts.find(x => x.id === cid) ?? g.activeContracts.find(a => a.contract.id === cid)?.contract; return c ? buildOptions(g, c, signedAt ?? undefined) : []; },
  pipeline: () => pipeline(G()),
  powerPreview: () => { const g = G(); const o = monthlyOpex(g); const drawMW = (o.itPowerKW * o.pue) / 1000; return { drawMW, opex: o, settle: settlePower(g, drawMW, () => 0.5, () => {}), spotAnchor: spotAnchor(g.month), spotPrice: g.spotPrice ?? spotAnchor(g.month), spotUtil: spotUtilization(g.spotPrice ?? spotAnchor(g.month), g.month), hours: HOURS_PER_MONTH }; },
  spotRevenue: () => { const g = G(); return spotRevenue(g, new Set(g.activeContracts.flatMap(a => a.clusterIds)), d => { const rd = g.racks.find(r => r.id === d); return rd ? vr(rd, g.trays, getItem).stats.accels : 0; }); },
  powerSources: () => POWER_SOURCES,
  spares: () => { const g = G(); return { shelf: g.spareStock ?? {}, rec: Object.fromEntries(Object.keys(g.inventory).map(id => [id, recommendedSpares(g, id)])) }; },
  sparesView: () => { const g = G(); const ids = new Set<string>(); g.halls.forEach(h => h.racks.forEach(p => Object.keys(rackParts(g, p.designId)).forEach(id => partClass(id) && ids.add(id))));
    const failed = g.halls.flatMap(h => h.racks).filter(p => p.status === 'failed').map(p => ({ id: p.id, part: p.failedPart ? getItem(p.failedPart)?.name ?? '' : 'burn-in failure', readyMonth: p.readyMonth }));
    return { failed, rows: [...ids].map(id => ({ id, name: getItem(id)!.name, label: PART_LABEL[partClass(id)!], have: (g.spareStock?.[id] ?? 0) + g.orders.filter(o => o.spare && o.itemId === id).reduce((n, o) => n + o.qty, 0), adv: recommendedSpares(g, id) })) }; },
  slotOptions: (chassisId: string, kind: string) => { const ch = getItem(chassisId) as Chassis | undefined; if (!ch) return []; const slot = ch.slots.find(s => s.kind === kind);
    return ALL_ITEMS.filter(i => partFitsSlot({ kind: kind as any, count: 0, accepts: slot?.accepts }, i)).map(i => offerAt(i, G().month)).sort((a, b) => Number(b.available) - Number(a.available) || b.item.availableFrom - a.item.availableFrom); },
  traySizing: (design: TrayDesign) => { const g = G(); const month = g.month; const utility = g.utilityUSDPerKWh; const ch = getItem(design.chassisId) as Chassis | undefined; if (!ch) return null;
    const v = validateTray(design, getItem); const year = 2020 + month / 12; const parts = design.parts.map(p => ({ ...p, it: getItem(p.itemId)! })).filter(p => p.it);
    const n = (k: string) => parts.filter(p => p.it.kind === k).reduce((a, p) => a + p.count, 0); const gpus = v.stats.accels || 0; const draw = v.stats.watts + ch.overheadW;
    const psus = parts.filter(p => p.slot === 'psu'); const psuW = psus.reduce((a, p) => a + ((p.it as any).capacityKW ?? 0) * 1000 * p.count, 0), psuCount = psus.reduce((a, p) => a + p.count, 0);
    const unitW = psuCount ? psuW / psuCount : 0, need = unitW ? Math.ceil(draw / (unitW * 0.9)) : 0; const redundantOK = psuCount >= 2 && psuW - unitW >= draw * 0.9;
    const cpu = parts.find(p => p.it.kind === 'cpu'); const cpuItem = cpu?.it as Cpu | undefined; const cpuN = cpu?.count ?? 0; const lanesAvail = Math.min(ch.pcieLanesAvail, (cpuItem?.pcieLanes ?? 0) * cpuN || ch.pcieLanesAvail);
    const dimms = n('memory'); const channels = (cpuItem?.memChannels ?? 0) * cpuN; const nics = parts.filter(p => p.it.kind === 'nic'); const nicGbps = nics.reduce((a, p) => a + (p.it as Nic).gbps * p.count, 0);
    const perGpu = gpus ? nicGbps / 8 / gpus : 0, tier = scaleOutTier(year);
    const bestNic = (ITEMS_BY_KIND('nic') as any[]).filter(x => x.nicClass === 'nic' && offerAt(x, month).available).sort((a, b) => b.gbps - a.gbps)[0];
    const nicNeed = bestNic && gpus ? Math.ceil((tier * 8 * gpus) / bestNic.gbps) : 0; const hbm = v.stats.memGB, hostRam = parts.filter(p => p.it.kind === 'memory').reduce((a, p) => a + (p.it as any).capacityGB * p.count, 0);
    const capex = v.stats.costUSD; const powerMo = (draw / 1000) * 1.3 * 730 * utility; const hours = 5 * 8760; const costHr = gpus ? (capex / hours + (powerMo * 12 * 5) / hours) / gpus : 0; const price = gha(year);
    const cpuOpt = (ITEMS_BY_KIND('cpu') as any[]).filter(c => offerAt(c, month).available && c.arch === ((cpuItem as any)?.arch ?? 'x86')).sort((a, b) => b.availableFrom - a.availableFrom)[0];
    return { gpus, draw, psuW, psuCount, unitW, need, redundantOK, chassisMaxW: ch.maxPowerW, lanesUsed: v.stats.pcieLanesUsed, lanesAvail: lanesAvail || ch.pcieLanesAvail, chassisLanes: ch.pcieLanesAvail, cpuN, cpuLanes: cpuItem?.pcieLanes ?? 0,
      cpuHint: cpuOpt ? { name: cpuOpt.name, lanes: cpuOpt.pcieLanes, channels: cpuOpt.memChannels, tdp: cpuOpt.tdpW, price: cpuOpt.priceUSD } : null, dimms, channels, nicCount: nics.reduce((a, p) => a + p.count, 0), nicGbps, perGpu, tier, year,
      bestNic: bestNic ? { name: bestNic.name, gbps: bestNic.gbps, lanes: bestNic.pcieLanes } : null, nicNeed, hbm, hostRam, capex, powerMo, costHr, price }; },
  failureRates: (designId) => rackRates(G(), designId),
  rackParts: (designId) => rackParts(G(), designId),
  spareQty: (id, qty) => spareQty(id, qty),
  concepts: () => CONCEPTS.map(c => ({ id: c.id, icon: c.icon, name: c.name, what: c.what, why: c.why, when: c.when, go: c.go, status: c.status(G()) })),
  missions: () => MISSIONS.map(m => ({ id: m.id, title: m.title, hint: m.hint, lesson: m.lesson, reward: m.reward, go: m.go, done: m.done(G()) })),
};

const ACTIONS = ['newGame','setMode','buy','buyTemplate','adoptTemplate','saveTray','saveRack','buildHall','installPower','installCooling','placeRack','createCluster','acceptContract','assignContract','unassignContract','disbandCluster','takeLoan','nextMonth','save','load','signPower','buyUplink','dropUplink','setSpot','setSpotReserve','setSpotRack','assignRacks','startEasy','stepEasy'];

function snapshot() { const g: any = JSON.parse(JSON.stringify(G())); g.log = g.log.slice(-150); return g; }
function init() {
  return { items: ALL_ITEMS, vendors: VENDORS, templates: TEMPLATES, models: MODELS, missions: MISSIONS.map(m => ({ id: m.id, title: m.title, hint: m.hint, lesson: m.lesson, reward: m.reward, go: m.go })), concepts: CONCEPTS.map(c => ({ id: c.id, icon: c.icon, name: c.name, what: c.what, why: c.why, when: c.when, go: c.go })), actions: ACTIONS };
}

const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  let req: any; try { req = JSON.parse(line); } catch { return; }
  const out = (o: any) => process.stdout.write(JSON.stringify({ id: req.id, ...o }) + '\n');
  try {
    if (req.fn === 'init') return out({ ok: true, result: init(), game: snapshot() });
    if (req.fn === 'act') {
      if (!ACTIONS.includes(req.name)) return out({ ok: false, error: 'unknown action ' + req.name });
      const r = (st() as any)[req.name](...(req.args ?? []));
      return out({ ok: true, result: r ?? null, game: snapshot() });
    }
    if (req.fn === 'q') {
      const f = Q[req.name]; if (!f) return out({ ok: false, error: 'unknown query ' + req.name });
      return out({ ok: true, result: f(...(req.args ?? [])) });
    }
    if (req.fn === 'claim') { // award finished missions (the web UI did this in a React effect)
      const done: any[] = [];
      for (const m of MISSIONS) { const g = G(); if (!g.missionsDone.includes(m.id) && m.done(g)) { useGame.setState(s => ({ game: { ...s.game, cash: s.game.cash + m.reward, missionsDone: [...s.game.missionsDone, m.id], log: [...s.game.log, { month: s.game.month, level: 'good' as const, text: `★ Mission complete: ${m.title} (+$${Math.round(m.reward).toLocaleString('en-US')}). ${m.lesson}` }] } })); done.push({ id: m.id, title: m.title, reward: m.reward }); break; } }
      return out({ ok: true, result: done, game: snapshot() });
    }
    if (req.fn === 'env') { // agent API: reset | step | obs | text | actions | hash | scenarios
      const a = req.args ?? []; const sc = (id?: string) => id ? SCENARIOS.find(x => x.id === id) : undefined;
      const r: any = req.name === 'reset' ? ENV.reset({ seed: a[0]?.seed, mode: a[0]?.mode, scenario: sc(a[0]?.scenario) })
        : req.name === 'step' ? ENV.step(a[0]) : req.name === 'obs' ? ENV.observe() : req.name === 'text' ? ENV.describe()
        : req.name === 'actions' ? ENV.legalActions(a[0] ?? {}) : req.name === 'hash' ? ENV.hash()
        : req.name === 'scenarios' ? SCENARIOS.map(x => ({ id: x.id, title: x.title, description: x.description, horizonMonths: x.horizonMonths, seed: x.seed })) : undefined;
      if (r === undefined) return out({ ok: false, error: 'unknown env fn ' + req.name });
      return out({ ok: true, result: r, game: snapshot() });
    }
    if (req.fn === 'ping') return out({ ok: true, result: 'pong' });
    out({ ok: false, error: 'unknown fn' });
  } catch (e: any) { out({ ok: false, error: String(e?.stack ?? e) }); }
});
