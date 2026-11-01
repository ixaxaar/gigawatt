// Headless engine bridge for the Godot front-end. JSON lines on stdin -> JSON lines on stdout.
// Request:  {"id":1,"fn":"act","name":"buyTemplate","args":[...]}  |  {"id":2,"fn":"q","name":"validateRack","args":[...]}  |  {"id":3,"fn":"init"}
// Response: {"id":1,"ok":true,"result":...,"game":{...}}   (game is attached to every `act` and `init` response)
import { createInterface } from 'node:readline';
// localStorage shim so the store's save/load work headless.
const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };

import { useGame, offerAt, selectMonthlyPnL, selectNetWorth, selectCapexBasis, rackBom, volumeDiscount } from './store';
import { ALL_ITEMS, VENDORS, getItem } from './data';
import { TEMPLATES } from './data/templates';
import { MODELS, scaleOutTier, gpuHourAnchor } from './sim/market';
import { MISSIONS } from './missions';
import { CONCEPTS } from './concepts';
import { validateTray, validateRack, validateHall, computePUE, partFitsSlot } from './sim/validate';
import { evaluateCluster } from './sim/network';
import { trainingTokensPerSec, inferenceCapacity, trainingMFU } from './sim/perf';
import { quote, hallChecks } from './ui/quote';
import { templateFacts, templateBom, racksFor, rackIdOf, trayIdOf } from './plan';
import { contractFit, buildOptions, pipeline } from './contractfit';
import { autoFabric } from './autopilot';
import { ledger, rackReadiness } from './ledger';
import { hallResilience } from './sim/resilience';
import { uplinkGbps, uplinkMonthlyUSD, carrierCount, totalNeedGbps, contractNeedGbps } from './sim/internet';
import { monthlyOpex, HOURS_PER_MONTH } from './sim/economy';
import { POWER_SOURCES, settlePower, spotAnchor, spotRevenue, spotUtilization } from './sim/power';
import { recommendedSpares, spareQty, rackParts, rackRates } from './sim/failures';
import { validateRack as vr } from './sim/validate';
import type { Cluster } from './types';

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
  buildOptions: (cid) => { const g = G(); const c = g.availableContracts.find(x => x.id === cid) ?? g.activeContracts.find(a => a.contract.id === cid)?.contract; return c ? buildOptions(g, c) : []; },
  pipeline: () => pipeline(G()),
  powerPreview: () => { const g = G(); const o = monthlyOpex(g); const drawMW = (o.itPowerKW * o.pue) / 1000; return { drawMW, opex: o, settle: settlePower(g, drawMW, () => 0.5, () => {}), spotAnchor: spotAnchor(g.month), spotPrice: g.spotPrice ?? spotAnchor(g.month), spotUtil: spotUtilization(g.spotPrice ?? spotAnchor(g.month), g.month), hours: HOURS_PER_MONTH }; },
  spotRevenue: () => { const g = G(); return spotRevenue(g, new Set(g.activeContracts.flatMap(a => a.clusterIds)), d => { const rd = g.racks.find(r => r.id === d); return rd ? vr(rd, g.trays, getItem).stats.accels : 0; }); },
  powerSources: () => POWER_SOURCES,
  spares: () => { const g = G(); return { shelf: g.spareStock ?? {}, rec: Object.fromEntries(Object.keys(g.inventory).map(id => [id, recommendedSpares(g, id)])) }; },
  failureRates: (designId) => rackRates(G(), designId),
  rackParts: (designId) => rackParts(G(), designId),
  spareQty: (id, qty) => spareQty(id, qty),
  concepts: () => CONCEPTS.map(c => ({ id: c.id, icon: c.icon, name: c.name, what: c.what, why: c.why, when: c.when, go: c.go, status: c.status(G()) })),
  missions: () => MISSIONS.map(m => ({ id: m.id, title: m.title, hint: m.hint, lesson: m.lesson, reward: m.reward, go: m.go, done: m.done(G()) })),
};

const ACTIONS = ['newGame','setMode','buy','buyTemplate','adoptTemplate','saveTray','saveRack','buildHall','installPower','installCooling','placeRack','createCluster','acceptContract','assignContract','takeLoan','nextMonth','save','load','signPower','buyUplink','dropUplink','setSpot','setSpotReserve','setSpotRack','assignRacks','startEasy','stepEasy'];

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
    if (req.fn === 'ping') return out({ ok: true, result: 'pong' });
    out({ ok: false, error: 'unknown fn' });
  } catch (e: any) { out({ ok: false, error: String(e?.stack ?? e) }); }
});
