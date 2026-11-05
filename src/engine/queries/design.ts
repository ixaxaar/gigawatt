// Read-only engine queries — design. (Pure functions of the current game; exposed through the bridge.)
import { ALL_ITEMS, ITEMS_BY_KIND, getItem } from '../../data';
import { rackReadiness } from '../../ledger';
import { PART_LABEL, partClass, rackParts, rackRates, recommendedSpares, spareQty } from '../../sim/failures';
import { gpuHourAnchor as gha, scaleOutTier } from '../../sim/market';
import { hallResilience } from '../../sim/resilience';
import { computePUE, partFitsSlot, validateHall, validateRack, validateTray } from '../../sim/validate';
import { offerAt, rackBom } from '../../store';
import { Chassis, Cpu, Nic, TrayDesign } from '../../types';
import { G } from './shared';

export const designQueries: Record<string, (...a: any[]) => any> = {
  validateTray: (tray) => validateTray(tray, getItem),
  validateRack: (rack, trays) => validateRack(rack, trays ?? G().trays, getItem),
  validateHall: (hallId) => { const g = G(); const hall = g.halls.find(h => h.id === hallId)!; return validateHall(hall, hall.racks.map(p => ({ design: g.racks.find(r => r.id === p.designId)!, trays: g.trays })), getItem); },
  hallStats: (hallId) => { const g = G(); const hall = g.halls.find(h => h.id === hallId)!; const kw = hall.racks.reduce((n, p) => { const d = g.racks.find(r => r.id === p.designId); return n + (d ? validateRack(d, g.trays, getItem).stats.kW : 0); }, 0); return { kw, pue: computePUE(hall, getItem), resilience: hallResilience(hall) }; },
  rackStatsAll: () => { const g = G(); return Object.fromEntries(g.racks.map(d => [d.id, validateRack(d, g.trays, getItem).stats])); },
  partFitsSlot: (slot, itemId) => partFitsSlot(slot, getItem(itemId)!),
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
  rackBom: (designId) => rackBom(G(), designId),
  rackReadiness: (designId, racks) => rackReadiness(G(), designId, racks ?? 1),
  failureRates: (designId) => rackRates(G(), designId),
  rackParts: (designId) => rackParts(G(), designId),
  spareQty: (id, qty) => spareQty(id, qty),
  spares: () => { const g = G(); return { shelf: g.spareStock ?? {}, rec: Object.fromEntries(Object.keys(g.inventory).map(id => [id, recommendedSpares(g, id)])) }; },
  sparesView: () => { const g = G(); const ids = new Set<string>(); g.halls.forEach(h => h.racks.forEach(p => Object.keys(rackParts(g, p.designId)).forEach(id => partClass(id) && ids.add(id))));
    const failed = g.halls.flatMap(h => h.racks).filter(p => p.status === 'failed').map(p => ({ id: p.id, part: p.failedPart ? getItem(p.failedPart)?.name ?? '' : 'burn-in failure', readyMonth: p.readyMonth }));
    return { failed, rows: [...ids].map(id => ({ id, name: getItem(id)!.name, label: PART_LABEL[partClass(id)!], have: (g.spareStock?.[id] ?? 0) + g.orders.filter(o => o.spare && o.itemId === id).reduce((n, o) => n + o.qty, 0), adv: recommendedSpares(g, id) })) }; },
};
