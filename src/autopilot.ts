// "Easy path": given a contract and a chosen build, the game orders, installs plant, deploys, clusters and assigns for you —
// one step per call, so the player watches each stage and learns why it happens.
import { ALL_ITEMS, getItem, ITEMS_BY_KIND } from './data';
import { getTemplate } from './data/templates';
import { evaluateCluster } from './sim/network';
import { offerAt, rackBom, useGame, type GameStore } from './store';
const G = () => useGame.getState().game;
import { uplinkGbps, contractNeedGbps } from './sim/internet';
import { rackIdOf, templateFacts } from './plan';
import type { Cluster, FabricDesign, GameState, Project, ScaleOutTech, Topology } from './types';

const TECH: ScaleOutTech[] = ['ib-ndr', 'ib-xdr', 'spectrum-x', 'eth-400', 'eth-800', 'roce', 'uec-eth'];
const TOPO: Topology = 'fat-tree-rail-optimized';

const ctxOf = (g: GameState) => ({
  getRack: (id: string) => { const pid = g.halls.flatMap(h => h.racks).find(p => p.id === id)?.designId ?? id; return g.racks.find(r => r.id === pid); },
  getTray: (id: string) => g.trays.find(t => t.id === id), getItem,
});

/** Pick the cheapest fabric that evaluates without errors and reaches `targetGBs` per accelerator (else the best available). */
export function autoFabric(g: GameState, rackIds: string[], targetGBs = 0): { fabric: FabricDesign; note: string } | null {
  const sw = ITEMS_BY_KIND('switch').filter(s => s.role === 'scale-out' && s.rackUnits > 0 && offerAt(s, g.month).available);
  const cables = ITEMS_BY_KIND('cable').filter(c => offerAt(c, g.month).available);
  const node = cables.find(c => c.cableType === 'aoc') ?? cables[0], spine = cables.find(c => c.cableType === 'optic-dr') ?? cables[0];
  if (!sw.length || !node) return null;
  let best: { f: FabricDesign; cost: number; bw: number; ok: boolean } | null = null;
  for (const tech of TECH) for (const leaf of sw) for (const over of [1, 2, 4]) {
    const f: FabricDesign = { id: 'auto', name: 'Auto fabric', scaleOutTech: tech, topology: TOPO, oversubscription: over, leafSwitchId: leaf.id, spineSwitchId: leaf.id, nodeToLeafCableId: node.id, leafToSpineCableId: spine?.id };
    let st; try { st = evaluateCluster({ id: 'd', name: 'd', rackIds, fabric: f } as Cluster, ctxOf(g)); } catch { continue; }
    if (st.issues.some(i => i.severity === 'error')) continue;
    const cost = Object.entries(st.switchCounts).reduce((n, [id, c]) => n + (getItem(id)?.priceUSD ?? 0) * c, 0) + Object.entries(st.cableCounts).reduce((n, [id, c]) => n + (getItem(id)?.priceUSD ?? 0) * c, 0);
    const ok = st.effScaleOutGBs >= targetGBs;
    if (!best || (ok && !best.ok) || (ok === best.ok && (ok ? cost < best.cost : st.effScaleOutGBs > best.bw))) best = { f, cost, bw: st.effScaleOutGBs, ok };
  }
  if (!best) return null;
  return { fabric: best.f, note: `${best.f.scaleOutTech.toUpperCase()} · ${best.f.oversubscription}:1 · ${getItem(best.f.leafSwitchId)?.name} → ${best.bw.toFixed(0)} GB/s per accelerator` };
}

const COOL_LEVEL: Record<string, number> = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };

/** Cheapest-per-kW purchasable plant units for a hall. */
function plantChoice(g: GameState, hallClass: string, kind: 'power' | 'cooling') {
  const cand = ALL_ITEMS.filter(i => kind === 'power' ? (i.kind === 'power' && i.powerType === 'transformer') : (i.kind === 'cooling' && i.serves === hallClass)).map(i => offerAt(i, g.month)).filter(o => o.available);
  cand.sort((a, b) => a.unitPrice / ((a.item as any).capacityKW || 1) - b.unitPrice / ((b.item as any).capacityKW || 1));
  return cand[0];
}

export function stepProject(st: GameStore, pid: string): void {
  const g = G(); const p = (g.projects ?? []).find(x => x.id === pid); if (!p || p.stage === 'done' || p.stage === 'failed') return;
  const t = getTemplate(p.templateId); const hall = g.halls.find(h => h.id === p.hallId); if (!t || !hall) return st.patchProject(pid, { stage: 'failed', notes: [...p.notes, 'Template or hall disappeared.'] });
  const f = templateFacts(t);
  if (!G().activeContracts.some(a => a.contract.id === p.contractId) && p.stage !== 'building') { st.patchProject(pid, { stage: 'failed', notes: [...p.notes, 'Contract was cancelled — the capacity is yours; offer it on spot in Energy.'] }); return; }
  const note = (s: string) => st.patchProject(pid, { notes: [...(g.projects!.find(x => x.id === pid)!.notes), `${2020 + Math.floor(g.month / 12)}-${String(g.month % 12 + 1).padStart(2, '0')}: ${s}`].slice(-12) });
  if (p.stage === 'building') {
    // install whatever plant has arrived
    for (const pl of p.plant) { const have = g.inventory[pl.id] ?? 0; const it = getItem(pl.id); if (have > 0 && it) { const inst = (it.kind === 'power' ? hall.powerEquip : hall.coolingEquip)[pl.id] ?? 0; const need = Math.max(0, pl.n - inst); const n = Math.min(have, need); if (n > 0) { const r = it.kind === 'power' ? st.installPower(hall.id, pl.id, n) : st.installCooling(hall.id, pl.id, n); if (r.ok) note(`installed ${n} × ${it.name}`); } } }
    const h2 = useStoreHall(st, hall.id);
    const load = h2.racks.reduce((n, r) => n + (r.status === 'failed' ? 0 : templateFactsOfDesign(G(), r.designId)), 0) + f.kWPerRack * (p.racks - p.rackIds.length);
    const free = h2.rackSlots - h2.racks.length;
    const designId = rackIdOf(t);
    const bom = rackBom(G(), designId) ?? {};
    const have = (n: number) => Object.entries(bom).every(([id, c]) => (G().inventory[id] ?? 0) >= c * n);
    let placed = p.rackIds.length;
    if (load <= h2.itPowerKW && load <= h2.coolingKW) {
      while (placed < p.racks && free - (placed - p.rackIds.length) > 0 && have(1)) { const r = st.placeRack(hall.id, designId); if (!r.ok) { note(`placement blocked: ${r.message}`); break; } placed++; }
    }
    if (placed > p.rackIds.length) { const ids = useStoreHall(st, hall.id).racks.filter(r => r.designId === designId && !r.clusterId).map(r => r.id).slice(0, p.racks); note(`deployed ${placed}/${p.racks} racks`); st.patchProject(pid, { rackIds: ids, ...(placed >= p.racks ? { stage: 'commissioning' as const } : {}) }); }
  } else if (p.stage === 'commissioning') {
    const racks = useStoreHall(st, hall.id).racks.filter(r => p.rackIds.includes(r.id));
    if (racks.length && racks.every(r => r.status === 'online')) { note('all racks online — designing the fabric'); st.patchProject(pid, { stage: 'clustering' }); stepProject(st, pid); }
  } else if (p.stage === 'clustering') {
    const c = G().activeContracts.find(a => a.contract.id === p.contractId)?.contract; const target = c && c.kind === 'training' ? c.minScaleOutGBsPerAccel : 0;
    const af = autoFabric(G(), p.rackIds, target); if (!af) return note('no valid fabric found — build one by hand on the Supercomputer screen');
    const r = st.createCluster(p.name, p.rackIds, af.fabric);
    if (!r.ok) return note(`cluster blocked: ${r.message}`);
    note(`cluster built: ${af.note}`); st.patchProject(pid, { stage: 'assigning', clusterId: G().clusters[G().clusters.length - 1].id }); stepProject(st, pid);
  } else if (p.stage === 'assigning') {
    const cid = p.clusterId ?? G().clusters[G().clusters.length - 1]?.id; if (!cid) return;
    const r = st.assignContract(p.contractId, [cid]);
    if (r.ok) { note('contract live — revenue starts next month'); st.patchProject(pid, { stage: 'done' }); }
    else note(`not qualified yet: ${r.message}`);
  }
}
const useStoreHall = (_st: GameStore, hid: string) => G().halls.find(h => h.id === hid)!;
const templateFactsOfDesign = (g: GameState, designId: string) => { const d = g.racks.find(r => r.id === designId); if (!d) return 0; const t = (g.projects ?? []).map(p => getTemplate(p.templateId)).find(tt => tt && rackIdOf(tt) === designId); return t ? templateFacts(t).kWPerRack : 30; };

/** Keep internet capacity ahead of demand (signed + in-flight contracts), buying the cheapest transit that covers the gap. */
function ensureUplink(st: GameStore) {
  const g = G(); if (!g.uplinks) return;
  const live = new Set(g.activeContracts.map(a => a.contract.id));
  let need = g.activeContracts.reduce((n, a) => n + contractNeedGbps(a.contract as never), 0);
  for (const p of g.projects ?? []) if (p.stage !== 'done' && p.stage !== 'failed' && !live.has(p.contractId)) { const c = g.availableContracts.find(x => x.id === p.contractId); if (c) need += contractNeedGbps(c as never); }
  const have = uplinkGbps(g); if (have >= need * 1.1) return;
  const opts = ITEMS_BY_KIND('uplink').filter(u => u.service === 'transit' && u.availableFrom * 12 - 2020 * 12 <= g.month).sort((a, b) => a.mrcUSD / a.gbps - b.mrcUSD / b.gbps);
  const fit = opts.filter(u => u.gbps >= need * 1.1 - have).sort((a, b) => a.mrcUSD - b.mrcUSD)[0] ?? opts[opts.length - 1];
  if (fit) st.buyUplink(fit.id);
}
export function stepAllProjects(getSt: () => GameStore): void { ensureUplink(getSt()); for (const p of getSt().game.projects ?? []) stepProject(getSt(), p.id); }

/** Start an easy-path project: sign, order the build, order any missing hall plant. Returns a message. */
export function startProject(st: GameStore, contractId: string, templateId: string, racks: number): { ok: boolean; message: string } {
  const t = getTemplate(templateId); if (!t) return { ok: false, message: 'Unknown build.' };
  const g0 = G();
  if (!g0.activeContracts.some(a => a.contract.id === contractId)) { const a = st.acceptContract(contractId); if (!a.ok) return a; }
  const r = st.buyTemplate(templateId, racks); if (!r.ok) return r;
  const f = templateFacts(t);
  // choose a hall that can host this cooling class, else build one
  let hall = G().halls.find(h => COOL_LEVEL[h.coolingClass] >= COOL_LEVEL[t.rack.cooling] && h.rackSlots - h.racks.length >= racks);
  const notes: string[] = [`ordered ${racks} × ${t.name}`];
  if (!hall) { const b = st.buildHall(`Hall ${String.fromCharCode(65 + G().halls.length)}`, t.rack.cooling as any, Math.max(8, racks + 4)); notes.push(b.message); hall = G().halls[G().halls.length - 1]; }
  const need = f.kWPerRack * racks + hall.racks.length * 0;
  const plant: { id: string; n: number }[] = [];
  const g = G(); const fresh = g.halls.find(h => h.id === hall!.id)!;
  const pw = plantChoice(g, fresh.coolingClass, 'power'), cl = plantChoice(g, fresh.coolingClass, 'cooling');
  const loadNow = fresh.racks.length ? need : need;
  if (fresh.itPowerKW < loadNow && pw) { const n = Math.ceil((loadNow - fresh.itPowerKW) / (pw.item as any).capacityKW); const b = st.buy(pw.item.id, n); if (b.ok) { plant.push({ id: pw.item.id, n }); notes.push(`ordered ${n} × ${pw.item.name} (power)`); } else notes.push(`power plant: ${b.message}`); }
  if (fresh.coolingKW < loadNow && cl) { const n = Math.ceil((loadNow - fresh.coolingKW) / (cl.item as any).capacityKW); const b = st.buy(cl.item.id, n); if (b.ok) { plant.push({ id: cl.item.id, n }); notes.push(`ordered ${n} × ${cl.item.name} (cooling)`); } else notes.push(`cooling plant: ${b.message}`); }
  const proj: Project = { id: `pj-${g.month}-${(g.projects ?? []).length + 1}`, contractId, templateId, racks, hallId: fresh.id, name: `Cluster ${(g.clusters.length + 1)}`, stage: 'building', rackIds: [], plant, notes: notes.map(n => `${2020 + Math.floor(g.month / 12)}-${String(g.month % 12 + 1).padStart(2, '0')}: ${n}`), startMonth: g.month };
  st.addProject(proj);
  return { ok: true, message: `Easy path started: ${notes.join('; ')}. I will install, deploy, cluster and assign as parts arrive.` };
}

/** Serve a contract straight from racks — the game builds a cluster behind the scenes (no manual clustering needed). */
export function assignFromRacks(st: GameStore, contractId: string, rackIds: string[]): { ok: boolean; message: string } {
  if (!rackIds.length) return { ok: false, message: 'Pick at least one online rack.' };
  const g = G();
  const placed = g.halls.flatMap(h => h.racks);
  const bad = rackIds.filter(id => placed.find(p => p.id === id)?.status !== 'online');
  if (bad.length) return { ok: false, message: 'All chosen racks must be online (commissioned).' };
  if (!g.activeContracts.some(a => a.contract.id === contractId)) { const a = st.acceptContract(contractId); if (!a.ok) return a; }
  const c = G().activeContracts.find(a => a.contract.id === contractId)!.contract;
  const af = autoFabric(G(), rackIds, c.kind === 'training' ? c.minScaleOutGBsPerAccel : 0);
  if (!af) return { ok: false, message: 'No valid network fabric found for these racks.' };
  const free = rackIds.filter(id => !placed.find(p => p.id === id)?.clusterId);
  if (free.length !== rackIds.length) return { ok: false, message: 'Some racks already belong to a cluster — assign that cluster instead.' };
  const r = st.createCluster(`Auto · ${c.customer}`, rackIds, af.fabric); if (!r.ok) return r;
  const cl = G().clusters[G().clusters.length - 1];
  const a = st.assignContract(contractId, [cl.id]);
  if (!a.ok) st.disbandCluster(cl.id);
  return a.ok ? { ok: true, message: `Serving ${c.customer} from ${rackIds.length} rack(s) (auto-clustered: ${af.note}).` } : { ok: false, message: `${a.message} (nothing was changed — racks are still free.)` };
}
