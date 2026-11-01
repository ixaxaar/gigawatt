import { ALL_ITEMS, getItem as catalogGetItem } from '../data';
import type {
  Accelerator,
  CableOrOptic,
  CatalogItem,
  Chassis,
  Cluster,
  ClusterStats,
  Nic,
  RackDesign,
  ScaleOutTech,
  ScaleUpTech,
  Switch,
  TrayDesign,
  ValidationIssue,
} from '../types';

export interface ClusterContext {
  getRack(id: string): RackDesign | undefined;
  getTray(id: string): TrayDesign | undefined;
  getItem(id: string): CatalogItem | undefined;
}

export interface ClusterEvalOptions {
  nodeToLeafReachM?: number;
  leafToSpineReachM?: number;
}

const ETH_FAMILY: ScaleOutTech[] = ['eth-100', 'eth-200', 'eth-400', 'eth-800', 'eth-1600', 'spectrum-x', 'uec-eth', 'roce'];
const COPPER_DOMAIN_TECHS = ['nvlink3', 'nvlink4', 'nvlink5', 'nvlink6', 'wafer', 'groq-chip2chip', 'pcie'];

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const r3 = (x: number) => Math.round(x * 1000) / 1000;

export const cableClass = (c: CableOrOptic): 'dac' | 'aoc' | 'optic' | 'other' => {
  if (c.cableType === 'dac' || c.cableType === 'acc' || c.cableType === 'copper-backplane') return 'dac';
  if (c.cableType === 'aoc') return 'aoc';
  if (c.cableType.startsWith('optic-')) return 'optic';
  return 'other';
};

const sameFamily = (a: ScaleOutTech | ScaleUpTech, b: ScaleOutTech) =>
  a === b || (isScaleOut(a) && ETH_FAMILY.includes(a) && ETH_FAMILY.includes(b));
const isScaleOut = (t: ScaleOutTech | ScaleUpTech): t is ScaleOutTech => !COPPER_DOMAIN_TECHS.includes(t) && t !== 'ualink' && t !== 'tt-ethernet-mesh' && t !== 'infinity-fabric';

const isAccel = (i: CatalogItem | undefined): i is Accelerator => !!i && i.kind === 'accelerator';
const isNic = (i: CatalogItem | undefined): i is Nic => !!i && i.kind === 'nic';
const isSwitch = (i: CatalogItem | undefined): i is Switch => !!i && i.kind === 'switch';

interface FabricPlan {
  hostLinks: number;
  linkGbps: number;
  leafCount: number;
  spineCount: number;
  superSpineCount: number;
  leafSpineLinks: number;
  coreLinks: number;
  bisectionGbps: number;
  effPerNodeGbps: number;
}

function planFabric(
  nodes: number,
  nodeUplinkGbps: number,
  leaf: Switch,
  spine: Switch | undefined,
  nodeCable: CableOrOptic | undefined,
  spineCable: CableOrOptic | undefined,
  oversub: number,
  nicPortGbps: number,
  topology: Cluster['fabric']['topology'],
  issues: ValidationIssue[],
): FabricPlan {
  const o = Math.max(1, oversub);
  const desired = nicPortGbps > 0 ? nicPortGbps : (nodeCable?.gbps ?? 200);
  const caps = [desired, leaf.portGbps];
  if (nicPortGbps > 0) caps.push(nicPortGbps);
  if (nodeCable) caps.push(nodeCable.gbps);
  const linkGbps = Math.max(1, Math.min(...caps));
  if (linkGbps < desired) {
    issues.push({
      severity: 'info',
      code: 'link-rate-capped',
      message: `Links run at ${linkGbps} Gb/s, below the ${desired} Gb/s cable/NIC capability (switch port or NIC port is slower).`,
      learn: leaf.id,
    });
  }

  const hostLinksPerNode = Math.max(1, Math.ceil(nodeUplinkGbps / linkGbps));
  const fabricPerNodeGbps = hostLinksPerNode * linkGbps;
  if (fabricPerNodeGbps < nodeUplinkGbps * 0.999) {
    issues.push({
      severity: 'warn',
      code: 'host-bottleneck',
      message: `Fabric entry carries ${fabricPerNodeGbps} Gb/s per node but hosts source ${Math.round(nodeUplinkGbps)} Gb/s.`,
      learn: leaf.id,
    });
  }
  const hostLinks = hostLinksPerNode * nodes;
  const hostTotalGbps = hostLinks * linkGbps;

  const leafOnly = (): FabricPlan => ({
    hostLinks,
    linkGbps,
    leafCount: Math.max(1, Math.ceil(hostLinks / leaf.portCount)),
    spineCount: 0,
    superSpineCount: 0,
    leafSpineLinks: 0,
    coreLinks: 0,
    bisectionGbps: hostTotalGbps / 2,
    effPerNodeGbps: Math.min(nodeUplinkGbps, fabricPerNodeGbps),
  });

  if (topology === 'single-domain') {
    return { ...leafOnly(), hostLinks: 0, leafCount: 0, bisectionGbps: 0, effPerNodeGbps: 0 };
  }
  if (topology === 'dragonfly' || topology === 'torus-ish') {
    const factor = topology === 'dragonfly' ? 0.12 : 0.03;
    issues.push({
      severity: 'info',
      code: 'topology-approx',
      message: `${topology} is modeled approximately: leaf tier plus ${factor * 100}% bisection from group/circuit links.`,
    });
    const p = leafOnly();
    return { ...p, bisectionGbps: hostTotalGbps * factor };
  }

  if (!spine) {
    issues.push({ severity: 'info', code: 'single-tier-fabric', message: 'No spine switch: single leaf tier, no oversubscription possible across rows.' });
    return leafOnly();
  }

  const spineLinkGbps = Math.max(1, Math.min(spineCable?.gbps ?? linkGbps, leaf.portGbps, spine.portGbps));
  const maxDown = Math.max(1, Math.floor((leaf.portCount * o) / (1 + o)));
  const leafCount = Math.max(1, Math.ceil(hostLinks / maxDown));
  const hostLinksPerLeaf = hostLinks / leafCount;
  const uplinkPortsPerLeaf = Math.max(1, Math.ceil((hostLinksPerLeaf * linkGbps) / o / spineLinkGbps));

  if (leafCount <= spine.portCount) {
    const spineCount = uplinkPortsPerLeaf;
    const leafSpineLinks = leafCount * spineCount;
    const uplinkTierGbps = leafSpineLinks * spineLinkGbps;
    const spineCapacityGbps = spineCount * spine.portCount * spineLinkGbps;
    const bisectionGbps = Math.min(hostTotalGbps, uplinkTierGbps, spineCapacityGbps) / 2;
    return {
      hostLinks,
      linkGbps,
      leafCount,
      spineCount,
      superSpineCount: 0,
      leafSpineLinks,
      coreLinks: 0,
      bisectionGbps,
      effPerNodeGbps: Math.min(nodeUplinkGbps, fabricPerNodeGbps / o),
    };
  }

  const leavesPerPod = Math.max(1, Math.floor(spine.portCount / 2));
  const pods = Math.ceil(leafCount / leavesPerPod);
  let podSpines = Math.min(uplinkPortsPerLeaf, spine.portCount - leavesPerPod);
  if (podSpines < 1) {
    issues.push({
      severity: 'error',
      code: 'spine-radix-too-small',
      message: `Spine (${spine.portCount} ports) cannot serve pods of ${leavesPerPod} leaves.`,
      learn: spine.id,
    });
    podSpines = 1;
  }
  if (podSpines < uplinkPortsPerLeaf) {
    issues.push({
      severity: 'warn',
      code: 'pod-oversub',
      message: `Pod is oversubscribed beyond the target: leaves want ${uplinkPortsPerLeaf} pod spines but only ${podSpines} fit.`,
      learn: spine.id,
    });
  }
  const spineCount = pods * podSpines;
  const leafSpineLinks = leafCount * Math.min(uplinkPortsPerLeaf, podSpines);
  const podUplinkPorts = Math.max(1, spine.portCount - leavesPerPod);
  const coreLinks = pods * podUplinkPorts;
  const superSpineCount = Math.max(1, Math.ceil(coreLinks / spine.portCount));
  const uplinkTierGbps = leafSpineLinks * spineLinkGbps;
  const coreTierGbps = coreLinks * spineLinkGbps;
  const bisectionGbps = Math.min(hostTotalGbps, uplinkTierGbps, coreTierGbps) / 2;
  return {
    hostLinks,
    linkGbps,
    leafCount,
    spineCount,
    superSpineCount,
    leafSpineLinks,
    coreLinks,
    bisectionGbps,
    effPerNodeGbps: Math.min(nodeUplinkGbps, fabricPerNodeGbps / o),
  };
}

export function evaluateCluster(
  cluster: Cluster,
  ctx: ClusterContext = defaultClusterContext(),
  opts: ClusterEvalOptions = {},
): ClusterStats {
  const issues: ValidationIssue[] = [];
  const nodeToLeafReachM = opts.nodeToLeafReachM ?? 3;
  const leafToSpineReachM = opts.leafToSpineReachM ?? 70;

  const accelsById = new Map<string, number>();
  const nicsById = new Map<string, number>();
  const rackSwitches = new Map<string, number>();
  let totalAccels = 0;
  let totalNics = 0;
  let nicWatts = 0;
  let domainSize = 1;
  let domainTech: string | undefined;
  let accelsPerTray = 0;
  let accelsPerRack = 0;
  let mixedDomains = false;

  for (const rackId of cluster.rackIds) {
    const rack = ctx.getRack(rackId);
    if (!rack) {
      issues.push({ severity: 'error', code: 'missing-rack', message: `Rack ${rackId} not found.` });
      continue;
    }
    let rackAccels = 0;
    for (const item of rack.items) {
      if (item.type === 'tray') {
        const tray = ctx.getTray(item.trayId);
        if (!tray) {
          issues.push({ severity: 'error', code: 'missing-tray', message: `Tray ${item.trayId} not found.` });
          continue;
        }
        const chassis = ctx.getItem(tray.chassisId);
        let trayAccels = 0;
        let trayNics = 0;
        for (const p of tray.parts) {
          const it = ctx.getItem(p.itemId);
          if (!it) {
            issues.push({ severity: 'error', code: 'missing-part', message: `Part ${p.itemId} not found (tray ${tray.id}).` });
            continue;
          }
          if (isAccel(it)) {
            trayAccels += p.count;
            accelsById.set(it.id, (accelsById.get(it.id) ?? 0) + p.count * item.count);
          } else if (isNic(it)) {
            trayNics += p.count;
            nicsById.set(it.id, (nicsById.get(it.id) ?? 0) + p.count * item.count);
            nicWatts += it.watts * p.count * item.count;
          }
        }
        totalNics += trayNics * item.count;
        rackAccels += trayAccels * item.count;
        if (chassis && chassis.kind === 'chassis' && chassis.baseboard) {
          if (domainTech !== undefined && (chassis.baseboard.domainSize !== domainSize || chassis.baseboard.scaleUp !== domainTech)) {
            mixedDomains = true;
          }
          domainSize = chassis.baseboard.domainSize;
          domainTech = chassis.baseboard.scaleUp;
          accelsPerTray = trayAccels;
        }
      } else if (item.type === 'switch') {
        const sw = ctx.getItem(item.switchId);
        if (!isSwitch(sw)) {
          issues.push({ severity: 'error', code: 'missing-part', message: `Switch ${item.switchId} not found.` });
          continue;
        }
        rackSwitches.set(sw.id, (rackSwitches.get(sw.id) ?? 0) + item.count);
      }
    }
    accelsPerRack = Math.max(accelsPerRack, rackAccels);
  }

  for (const [id, n] of accelsById) totalAccels += n;
  if (mixedDomains) {
    issues.push({ severity: 'warn', code: 'mixed-domains', message: 'Cluster mixes chassis with different scale-up baseboards; using the last-seen domain size.' });
  }

  const dominantAccelId = [...accelsById.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (accelsById.size > 1) {
    issues.push({
      severity: 'error',
      code: 'mixed-accelerators',
      message: `Mixed accelerator models (${[...accelsById.keys()].join(', ')}); stats assume ${dominantAccelId}.`,
    });
  }
  const acc = isAccel(ctx.getItem(dominantAccelId ?? '')) ? (ctx.getItem(dominantAccelId!) as Accelerator) : undefined;
  if (!acc) {
    issues.push({ severity: 'error', code: 'no-accelerators', message: 'Cluster contains no accelerators (or the model is missing from the catalog).' });
    return zeroStats(dominantAccelId ?? '', issues);
  }

  if (domainTech && domainTech !== acc.scaleUp) {
    issues.push({
      severity: 'error',
      code: 'domain-mismatch',
      message: `Chassis baseboard is ${domainTech} but ${acc.id} scales up over ${acc.scaleUp}.`,
      learn: acc.id,
    });
  }
  if (domainSize > acc.maxScaleUpDomain) {
    issues.push({
      severity: 'error',
      code: 'domain-too-big',
      message: `Domain of ${domainSize} exceeds ${acc.id} max scale-up domain of ${acc.maxScaleUpDomain}.`,
      learn: acc.id,
    });
  } else if (domainSize < acc.maxScaleUpDomain) {
    issues.push({
      severity: 'info',
      code: 'domain-smaller-than-max',
      message: `Scale-up domain is ${domainSize}; ${acc.id} supports up to ${acc.maxScaleUpDomain} in one domain.`,
      learn: acc.id,
    });
  }
  if (domainSize > accelsPerRack && domainSize > 1) {
    const copper = COPPER_DOMAIN_TECHS.includes(acc.scaleUp);
    issues.push({
      severity: copper ? 'error' : 'warn',
      code: 'domain-spans-racks',
      message: `A ${domainSize}-accelerator domain does not fit in one rack (${accelsPerRack} accelerators per rack); ${copper ? 'copper scale-up fabrics cannot cross racks' : 'domain will span racks over longer links'}.`,
    });
  }

  const nodes = Math.floor(totalAccels / Math.max(1, domainSize));
  if (nodes < 1) {
    issues.push({ severity: 'error', code: 'no-full-domain', message: `Fewer than one full scale-up domain (${totalAccels}/${domainSize} accelerators).` });
  }
  if (totalAccels % Math.max(1, domainSize) !== 0) {
    issues.push({ severity: 'warn', code: 'partial-domain', message: `Accelerator count ${totalAccels} is not a multiple of the ${domainSize}-wide scale-up domain.` });
  }

  const dominantNicId = [...nicsById.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const nic = isNic(ctx.getItem(dominantNicId ?? '')) ? (ctx.getItem(dominantNicId!) as Nic) : undefined;
  if (nicsById.size > 1) {
    issues.push({ severity: 'warn', code: 'mixed-nics', message: `Mixed NIC models (${[...nicsById.keys()].join(', ')}); assuming ${dominantNicId}.` });
  }
  const nicPortGbps = nic ? nic.gbps / Math.max(1, nic.ports) : 0;

  let totalNicGbps = 0;
  for (const [id, n] of nicsById) {
    const nn = ctx.getItem(id);
    if (isNic(nn)) totalNicGbps += nn.gbps * n;
  }
  const totalNativeGbps = totalAccels * acc.nativeScaleOutGbps;
  const nodeUplinkGbps = nodes > 0 ? (totalNicGbps + totalNativeGbps) / nodes : 0;
  const accelsPerNode = Math.max(1, domainSize);

  const fab = cluster.fabric;
  const leaf = isSwitch(ctx.getItem(fab.leafSwitchId)) ? (ctx.getItem(fab.leafSwitchId) as Switch) : undefined;
  const spine = fab.spineSwitchId ? ctx.getItem(fab.spineSwitchId) : undefined;
  const spineSw = isSwitch(spine) ? spine : undefined;
  const nodeCable = ctx.getItem(fab.nodeToLeafCableId);
  const nodeCableOk = !!nodeCable && nodeCable.kind === 'cable';
  const spineCable = fab.leafToSpineCableId ? ctx.getItem(fab.leafToSpineCableId) : undefined;
  const spineCableOk = !!spineCable && spineCable.kind === 'cable';

  const switchCounts: Record<string, number> = {};
  const cableCounts: Record<string, number> = {};
  let bisectionGbps = 0;
  let effPerNodeGbps = 0;
  let fabricSwitchWatts = 0;

  if (!nodeCableOk) {
    issues.push({ severity: 'error', code: 'missing-part', message: `Node-to-leaf cable ${fab.nodeToLeafCableId} not found.` });
  }
  if (fab.spineSwitchId && !spineSw) {
    issues.push({ severity: 'error', code: 'missing-part', message: `Spine switch ${fab.spineSwitchId} not found.` });
  }
  if (spineSw && !spineCableOk) {
    issues.push({ severity: 'error', code: 'missing-part', message: `Leaf-to-spine cable ${fab.leafToSpineCableId} not found.` });
  }
  if (nodeUplinkGbps <= 0 && fab.topology !== 'single-domain') {
    issues.push({
      severity: 'error',
      code: 'no-scale-out',
      message: `Nodes have no scale-out connectivity: add NICs to the trays or use accelerators with native Ethernet ports (${acc.id} has ${acc.nativeScaleOutGbps} Gb/s native).`,
      learn: nic?.id ?? acc.id,
    });
  }
  if (leaf && leaf.role === 'scale-up') {
    issues.push({ severity: 'error', code: 'wrong-switch-role', message: `Leaf switch ${leaf.id} is a ${leaf.role} switch.`, learn: leaf.id });
  }
  if (leaf && leaf.tech !== fab.scaleOutTech && !sameFamily(leaf.tech, fab.scaleOutTech)) {
    issues.push({
      severity: 'warn',
      code: 'fabric-tech-mismatch',
      message: `Leaf switch runs ${leaf.tech} but the fabric is ${fab.scaleOutTech}.`,
      learn: leaf.id,
    });
  }
  if (nodeCableOk && nodeCable && !nodeCable.compatibleTech.includes(fab.scaleOutTech)) {
    issues.push({
      severity: 'error',
      code: 'cable-tech-mismatch',
      message: `Node cable ${nodeCable.id} (${nodeCable.compatibleTech.join('/')}) does not speak ${fab.scaleOutTech}.`,
      learn: nodeCable.id,
    });
  }
  if (spineCableOk && spineCable && !spineCable.compatibleTech.includes(fab.scaleOutTech)) {
    issues.push({
      severity: 'error',
      code: 'cable-tech-mismatch',
      message: `Spine cable ${spineCable.id} does not speak ${fab.scaleOutTech}.`,
      learn: spineCable.id,
    });
  }

  const checkReach = (c: CableOrOptic, reachM: number, where: string) => {
    if (c.maxReachM < reachM) {
      issues.push({
        severity: 'error',
        code: 'cable-too-short',
        message: `${where}: ${c.id} reaches ${c.maxReachM} m but the run is ~${reachM} m; move up to AOC or optics.`,
        learn: c.id,
      });
    } else if (cableClass(c) === 'optic' && reachM <= 3) {
      issues.push({
        severity: 'info',
        code: 'optic-overkill',
        message: `${where}: ${c.id} is optics but the run is only ~${reachM} m; DAC/ACC would be cheaper and cooler.`,
        learn: c.id,
      });
    }
  };

  if (nodeCableOk && nodeCable) checkReach(nodeCable, nodeToLeafReachM, 'Node to leaf');
  if (spineCableOk && spineCable) checkReach(spineCable, leafToSpineReachM, 'Leaf to spine');

  if (leaf && nodes > 0) {
    const plan = planFabric(
      nodes,
      nodeUplinkGbps,
      leaf,
      spineSw,
      nodeCableOk ? nodeCable : undefined,
      spineCableOk ? spineCable : undefined,
      fab.oversubscription,
      nicPortGbps,
      fab.topology,
      issues,
    );
    if (fab.oversubscription > 8) {
      issues.push({
        severity: 'warn',
        code: 'oversub-high',
        message: `Oversubscription ${fab.oversubscription}:1 will collapse large training collectives.`,
        learn: leaf.id,
      });
    }
    bisectionGbps = plan.bisectionGbps;
    effPerNodeGbps = plan.effPerNodeGbps;
    if (plan.leafCount > 0) {
      switchCounts[leaf.id] = plan.leafCount;
      fabricSwitchWatts += plan.leafCount * leaf.watts;
    }
    if (spineSw && plan.spineCount + plan.superSpineCount > 0) {
      switchCounts[spineSw.id] = (switchCounts[spineSw.id] ?? 0) + plan.spineCount + plan.superSpineCount;
      fabricSwitchWatts += (plan.spineCount + plan.superSpineCount) * spineSw.watts;
    }
    if (plan.hostLinks > 0 && nodeCableOk && nodeCable) {
      cableCounts[nodeCable.id] = plan.hostLinks;
    }
    if (spineCableOk && spineCable && plan.leafSpineLinks + plan.coreLinks > 0) {
      cableCounts[spineCable.id] = plan.leafSpineLinks + plan.coreLinks;
    }
  } else if (fab.topology === 'single-domain') {
    issues.push({ severity: 'info', code: 'single-domain', message: 'Single scale-up domain cluster: no scale-out fabric needed.' });
  }

  let rackSwitchWatts = 0;
  for (const [id, n] of rackSwitches) {
    switchCounts[id] = (switchCounts[id] ?? 0) + n;
    const sw = ctx.getItem(id);
    if (isSwitch(sw)) rackSwitchWatts += sw.watts * n;
  }

  const needsSpineTrays = !!domainTech && accelsPerTray < domainSize && domainSize > 8;
  if (needsSpineTrays) {
    const hasScaleUpSwitch = [...rackSwitches.keys()].some((id) => {
      const sw = ctx.getItem(id);
      return isSwitch(sw) && sw.role === 'scale-up';
    });
    const chassisItem = ALL_ITEMS.find(
      (i) => i.kind === 'chassis' && i.baseboard && i.baseboard.domainSize === domainSize && i.baseboard.scaleUp === domainTech,
    ) as Chassis | undefined;
    const chassisHasSwitchChips = !!chassisItem?.baseboard?.includesSwitchChips;
    if (!hasScaleUpSwitch && !chassisHasSwitchChips) {
      issues.push({
        severity: 'error',
        code: 'missing-scale-up-switches',
        message: `A ${domainSize}-wide domain needs scale-up switch trays in the racks (e.g. NVLink Switch trays).`,
      });
    }
    const spineCableForDomain = ALL_ITEMS.find(
      (i) => i.kind === 'cable' && i.cableType === 'nvlink-spine' && (i as CableOrOptic).compatibleTech.includes(acc.scaleUp),
    ) as CableOrOptic | undefined;
    if (spineCableForDomain) {
      cableCounts[spineCableForDomain.id] = (cableCounts[spineCableForDomain.id] ?? 0) + totalAccels;
    }
  }

  let opticsWatts = 0;
  for (const [id, n] of Object.entries(cableCounts)) {
    const c = ctx.getItem(id);
    if (c && c.kind === 'cable') opticsWatts += c.wattsPerEnd * 2 * n;
  }

  const powerKW =
    (totalAccels * acc.tdpW + nicWatts + fabricSwitchWatts + rackSwitchWatts + opticsWatts) / 1000;
  const effScaleOutGBs = nodes > 0 ? effPerNodeGbps / accelsPerNode / 8 : 0;

  return {
    accelerators: totalAccels,
    acceleratorId: acc.id,
    scaleUpDomain: domainSize,
    totalMemGB: totalAccels * acc.memGB,
    peakPFLOPSFp8: r3((totalAccels * (acc.tflops.fp8 ?? 0)) / 1000),
    peakPFLOPSBf16: r3((totalAccels * (acc.tflops.bf16 ?? 0)) / 1000),
    powerKW: r3(powerKW),
    bisectionTbps: r3(bisectionGbps / 1000),
    effScaleOutGBs: r3(effScaleOutGBs),
    switchCounts,
    cableCounts,
    issues,
  };
}

const zeroStats = (acceleratorId: string, issues: ValidationIssue[]): ClusterStats => ({
  accelerators: 0,
  acceleratorId,
  scaleUpDomain: 1,
  totalMemGB: 0,
  peakPFLOPSFp8: 0,
  peakPFLOPSBf16: 0,
  powerKW: 0,
  bisectionTbps: 0,
  effScaleOutGBs: 0,
  switchCounts: {},
  cableCounts: {},
  issues,
});

export const defaultClusterContext = (): ClusterContext => ({
  getRack: () => undefined,
  getTray: () => undefined,
  getItem: catalogGetItem,
});

export const suggestCable = (
  getItem: (id: string) => CatalogItem | undefined,
  ids: string[],
  tech: ScaleOutTech,
  gbps: number,
  reachM: number,
): CableOrOptic | undefined => {
  const candidates = ids
    .map((id) => getItem(id))
    .filter((i): i is CableOrOptic => !!i && i.kind === 'cable')
    .filter((c) => c.compatibleTech.includes(tech) && c.gbps >= gbps && c.maxReachM >= reachM);
  candidates.sort((a, b) => a.priceUSD - b.priceUSD);
  return candidates[0];
};

export { clamp };
