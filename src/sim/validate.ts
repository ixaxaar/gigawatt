// ===========================================================================
// GIGAWATT — design validation: tray, rack, hall + PUE.
// Pure TS, no DOM. All issues teach the underlying engineering and link to a
// catalog codex entry via `learn`. Deterministic: no RNG, no Date.
// ===========================================================================
import type {
  CatalogItem, Chassis, ChassisSlot, CoolingClass, HallState, RackDesign,
  RackItem, TrayDesign, ValidationIssue,
} from '../types';

export type CatalogGet = (id: string) => CatalogItem | undefined;

export interface TrayStats {
  watts: number; pcieLanesUsed: number; costUSD: number;
  accels: number; tflopsFp8: number; memGB: number;
}
export interface TrayValidation { issues: ValidationIssue[]; stats: TrayStats }
export interface RackStats {
  kW: number; units: number; weightKg: number; costUSD: number;
  accels: number; scaleUpDomain: number;
}
export interface RackValidation { issues: ValidationIssue[]; stats: RackStats }
/** A rack design plus the tray designs it references, for hall validation. */
export interface RackContext { design: RackDesign; trays: TrayDesign[] }

// U.2/E1.S NVMe drives are PCIe x4 devices; the catalog stores no lane field.
const NVME_LANES_PER_DRIVE = 4;
// One NVLink spine/switch tray serves 8 GPU packages (9 trays per 72-GPU NVL72).
const GPUS_PER_SPINE_TRAY = 8;
const COOL_LEVEL: Record<CoolingClass, number> = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };

const err = (code: string, message: string, learn?: string): ValidationIssue =>
  ({ severity: 'error', code, message, learn });

// ---------- slot <-> part matching ----------
export function partFitsSlot(slot: ChassisSlot, item: CatalogItem): boolean {
  switch (slot.kind) {
    case 'accelerator':
      return item.kind === 'accelerator' && (!slot.accepts || slot.accepts.includes(item.formFactor));
    case 'cpu':
      return item.kind === 'cpu' && (!slot.accepts || slot.accepts.includes(item.arch));
    case 'dimm':
      return item.kind === 'memory' && (!slot.accepts || slot.accepts.includes(item.type));
    case 'nic':
      return item.kind === 'nic';
    case 'dpu':
      return item.kind === 'nic' && item.nicClass !== 'nic';
    case 'nvme':
      return item.kind === 'nvme';
    case 'psu':
      return item.kind === 'power' && (item.powerType === 'pdu' || item.powerType === 'power-shelf');
    case 'switchchip':
      return item.kind === 'switch' && item.rackUnits === 0;
    case 'coldplate':
      return item.kind === 'cooling' && item.coolingType === 'cold-plate-loop';
    default:
      return false; // 'fan': no fan-class parts exist in the catalog yet
  }
}

/** Electrical draw of a part inside the tray (W). PSUs/cold plates draw ~0 at the tray. */
function partWatts(item: CatalogItem): number {
  switch (item.kind) {
    case 'accelerator': return item.tdpW;
    case 'cpu': return item.tdpW;
    case 'memory': return item.watts;
    case 'nvme': return item.watts;
    case 'nic': return item.watts;
    case 'switch': return item.watts;
    default: return 0;
  }
}

/** Host PCIe lanes consumed. SXM/OAM modules ride the baseboard fabric, not host lanes. */
function partPcieLanes(item: CatalogItem): number {
  if (item.kind === 'nic') return item.pcieLanes;
  if (item.kind === 'nvme') return NVME_LANES_PER_DRIVE;
  if (item.kind === 'accelerator' && item.formFactor === 'pcie') return item.pcieLanes;
  return 0;
}

// ===========================================================================
// Tray
// ===========================================================================
export function validateTray(design: TrayDesign, get: CatalogGet): TrayValidation {
  const stats: TrayStats = { watts: 0, pcieLanesUsed: 0, costUSD: 0, accels: 0, tflopsFp8: 0, memGB: 0 };
  const chassisItem = get(design.chassisId);
  if (!chassisItem || chassisItem.kind !== 'chassis') {
    return {
      issues: [err('TRAY_UNKNOWN_CHASSIS',
        `Chassis '${design.chassisId}' is not in the catalog — a tray is built around a real chassis and its slot map; pick one first.`)],
      stats,
    };
  }
  const chassis = chassisItem as Chassis;
  stats.costUSD = chassis.priceUSD;

  const slotByKind = new Map(chassis.slots.map(s => [s.kind, s]));
  const filled = new Map<ChassisSlot['kind'], number>();
  const seenAccels = new Set<string>();
  const issues: ValidationIssue[] = [];
  for (const entry of design.parts) {
    const item = get(entry.itemId);
    const slot = slotByKind.get(entry.slot);
    if (!item) {
      issues.push(err('TRAY_UNKNOWN_PART',
        `Part '${entry.itemId}' is not in the catalog — every component must be a real purchasable item.`));
      continue;
    }
    if (!slot) {
      issues.push(err('TRAY_PART_FIT',
        `${item.name} needs a '${entry.slot}' slot but the ${chassis.name} has none — this chassis physically cannot hold that part class.`,
        chassis.id));
      continue;
    }
    if (!partFitsSlot(slot, item)) {
      const want = slot.accepts?.join('/') ?? slot.kind;
      const got = item.kind === 'accelerator' ? item.formFactor
        : item.kind === 'cpu' ? item.arch
        : item.kind === 'memory' ? item.type
        : item.kind;
      issues.push(err('TRAY_PART_FIT',
        `${item.name} (${got}) does not fit the ${chassis.name}'s ${slot.kind} slot (accepts: ${want}). Module form factors are physical standards — an OAM card has no SXM socket to drop into.`,
        chassis.id));
    }
    filled.set(entry.slot, (filled.get(entry.slot) ?? 0) + entry.count);

    // accumulate stats
    stats.watts += partWatts(item) * entry.count;
    stats.pcieLanesUsed += partPcieLanes(item) * entry.count;
    stats.costUSD += item.priceUSD * entry.count;
    if (item.kind === 'accelerator') {
      stats.accels += entry.count;
      stats.tflopsFp8 += (item.tflops.fp8 ?? 0) * entry.count;
      stats.memGB += item.memGB * entry.count;
      if (!seenAccels.has(item.id) && !item.cooling.includes(chassis.cooling)) {
        seenAccels.add(item.id);
        issues.push(err('TRAY_ACCEL_COOLING',
          `${item.name} is a ${item.tdpW} W part that only cools by ${item.cooling.join('/')} — it cannot live in the ${chassis.name}, which is a ${chassis.cooling} chassis. At this TDP the heat has to leave through a cold plate, not air.`,
          item.id));
      }
    }
  }

  // slot count / required checks (aggregated per slot kind)
  for (const slot of chassis.slots) {
    const n = filled.get(slot.kind) ?? 0;
    if (n > slot.count) {
      issues.push(err('TRAY_SLOT_OVERFLOW',
        `${n}x ${slot.kind} parts assigned but the ${chassis.name} only has ${slot.count} '${slot.kind}' slot(s) — slots are physical sockets and board lanes, not bookkeeping.`,
        chassis.id));
    }
    if (slot.required !== undefined && n < slot.required) {
      issues.push(err('TRAY_SLOT_REQUIRED',
        `Only ${n}/${slot.required} '${slot.kind}' slots filled on the ${chassis.name}. The chassis will not POST (or validate) below its minimum: ${slot.required} is the floor for power rails and boot devices.`,
        chassis.id));
    }
  }

  const partW = stats.watts;
  stats.watts += chassis.overheadW;

  if (stats.pcieLanesUsed > chassis.pcieLanesAvail) {
    issues.push(err('TRAY_PCIE_LANES',
      `NICs and NVMe need ${stats.pcieLanesUsed} PCIe lanes but the ${chassis.name} has ${chassis.pcieLanesAvail} left after the accelerators take theirs — every lane is a physical differential pair on the board; oversubscribing them means ports that down-train or vanish.`,
      chassis.id));
  }
  if (stats.watts > chassis.maxPowerW) {
    issues.push(err('TRAY_POWER',
      `Tray draws ~${stats.watts} W (parts ${partW} W + ${chassis.overheadW} W fans/BMC/VRM overhead) but the ${chassis.name} power feed tops out at ${chassis.maxPowerW} W. Above the feed limit PSUs trip — pick lower-TDP parts or a beefier chassis.`,
      chassis.id));
  }
  if (chassis.cooling === 'air' && chassis.maxAirWattsPerU !== undefined
      && partW > chassis.maxAirWattsPerU * chassis.rackUnits) {
    issues.push(err('TRAY_AIR_WATTS',
      `${partW} W of parts in an air-cooled ${chassis.rackUnits}U chassis exceeds its ~${chassis.maxAirWattsPerU} W/U air budget (max ~${chassis.maxAirWattsPerU * chassis.rackUnits} W). Air carries roughly 1-1.5 kW per U before heatsinks and fans saturate — this is exactly the wall that pushed AI silicon to liquid.`,
      chassis.id));
  }
  return { issues, stats };
}

// ===========================================================================
// Rack
// ===========================================================================
/** Spine-switch tray catalog id per scale-up tech, for `learn` links. */
const SPINE_LEARN: Partial<Record<string, string>> = {
  nvlink5: 'nv-nvlink-switch-tray5',
  nvlink6: 'nv-nvlink-switch-tray6',
  'ualink': 'gen-ualink-sw',
};

export function validateRack(design: RackDesign, trays: TrayDesign[], get: CatalogGet): RackValidation {
  const stats: RackStats = { kW: 0, units: 0, weightKg: 0, costUSD: 0, accels: 0, scaleUpDomain: 0 };
  const rackItem = get(design.rackId);
  if (!rackItem || rackItem.kind !== 'rack') {
    return {
      issues: [err('RACK_UNKNOWN_RACK',
        `Rack '${design.rackId}' is not in the catalog — pick a real rack (its U count, kW rating and cooling options define what fits).`)],
      stats,
    };
  }
  const rack = rackItem;
  stats.costUSD = rack.priceUSD;
  const issues: ValidationIssue[] = [];

  if (!rack.cooling.includes(design.coolingInterface)) {
    issues.push(err('RACK_INTERFACE_UNSUPPORTED',
      `The ${rack.name} cannot serve a '${design.coolingInterface}' cooling interface (supports: ${rack.cooling.join('/')}). Cooling interface means what actually captures the heat — air in the aisle, a rear-door coil, or coolant manifolds on the rack spine.`,
      rack.id));
  }

  const spineByTech = new Map<string, number>();
  const trayById = new Map(trays.map(t => [t.id, t]));
  let watts = 0;

  // pre-scan switches so spine availability is known when trays are judged
  for (const item of design.items as RackItem[]) {
    if (item.type !== 'switch') continue;
    const sw = get(item.switchId);
    if (sw && sw.kind === 'switch' && sw.role === 'scale-up') {
      spineByTech.set(sw.tech, (spineByTech.get(sw.tech) ?? 0) + item.count);
    }
  }

  for (const item of design.items as RackItem[]) {
    if (item.type === 'tray') {
      const td = trayById.get(item.trayId);
      if (!td) {
        issues.push(err('RACK_UNKNOWN_TRAY',
          `Tray '${item.trayId}' referenced but not designed yet — design the tray before racking it.`));
        continue;
      }
      const tv = validateTray(td, get);
      issues.push(...tv.issues);
      watts += tv.stats.watts * item.count;
      stats.costUSD += tv.stats.costUSD * item.count;
      stats.accels += tv.stats.accels * item.count;

      const ch = get(td.chassisId);
      if (ch && ch.kind === 'chassis') {
        const chassis = ch as Chassis;
        stats.units += chassis.rackUnits * item.count;
        stats.weightKg += chassis.weightKg * item.count;

        if (chassis.rackStandard !== rack.standard) {
          issues.push(err('RACK_STANDARD_MISMATCH',
            `The ${chassis.name} is a ${chassis.rackStandard} design and will not mount in the ${rack.name} (${rack.standard}). Rack standards fix rail spacing and width — a 21-inch ORv3 tray simply has no rails in a 19-inch cabinet.`,
            chassis.id));
        }
        if (COOL_LEVEL[chassis.cooling] > COOL_LEVEL[design.coolingInterface]) {
          issues.push(err('RACK_TRAY_COOLING',
            `${chassis.name} trays need ${chassis.cooling.toUpperCase()} cooling but this rack's interface is '${design.coolingInterface}' — liquid-cooled trays have cold plates plumbed to rack manifolds; without them the tray cooks.`,
            chassis.id));
        }
        if (!rack.hasBusbar && !chassis.slots.some(s => s.kind === 'psu')) {
          issues.push(err('RACK_TRAY_NEEDS_BUSBAR',
            `${chassis.name} trays carry no PSUs — they expect 48V from the rack busbar, and the ${rack.name} has none. Busbar-fed trays need an ORv3/MGX-style rack with power shelves.`,
            rack.id));
        }
        // scale-up domain contribution
        const bb = chassis.baseboard;
        if (bb && tv.stats.accels > 0) {
          const perTrayAccels = tv.stats.accels;
          const totalAccels = perTrayAccels * item.count;
          let accelDomainCap = 0;
          for (const p of td.parts) {
            const pi = get(p.itemId);
            if (pi && pi.kind === 'accelerator') accelDomainCap = Math.max(accelDomainCap, pi.maxScaleUpDomain);
          }
          const domainCap = Math.min(bb.domainSize, accelDomainCap || bb.domainSize);
          const needsSpine = !bb.includesSwitchChips && bb.domainSize > perTrayAccels;
          if (needsSpine) {
            const needed = Math.ceil(Math.min(totalAccels, bb.domainSize) / GPUS_PER_SPINE_TRAY);
            const have = spineByTech.get(bb.scaleUp) ?? 0;
            if (have < needed) {
              issues.push(err('RACK_NEEDS_SCALEUP_SWITCH',
                `The ${chassis.name} baseboard expects a ${bb.domainSize}-accelerator ${bb.scaleUp} domain but has no switch silicon on-board: ${needed} spine switch tray(s) are required and ${have} are placed. Without the spine trays each tray is an island — no NVLink-scale memory semantics across trays.`,
                SPINE_LEARN[bb.scaleUp] ?? chassis.id));
              stats.scaleUpDomain = Math.max(stats.scaleUpDomain, Math.min(perTrayAccels, domainCap));
            } else {
              stats.scaleUpDomain = Math.max(stats.scaleUpDomain, Math.min(totalAccels, domainCap));
            }
          } else {
            stats.scaleUpDomain = Math.max(stats.scaleUpDomain, Math.min(totalAccels, domainCap));
          }
        }
      }
    } else if (item.type === 'switch') {
      const sw = get(item.switchId);
      if (!sw || sw.kind !== 'switch') {
        issues.push(err('RACK_UNKNOWN_ITEM', `Switch '${item.switchId}' is not in the catalog.`));
        continue;
      }
      stats.units += sw.rackUnits * item.count;
      watts += sw.watts * item.count;
      stats.costUSD += sw.priceUSD * item.count;
      if (sw.role === 'scale-up') {
        spineByTech.set(sw.tech, (spineByTech.get(sw.tech) ?? 0) + item.count);
      }
    } else if (item.type === 'storage') {
      const st = get(item.storageId);
      if (!st || st.kind !== 'storage') {
        issues.push(err('RACK_UNKNOWN_ITEM', `Storage system '${item.storageId}' is not in the catalog.`));
        continue;
      }
      stats.units += st.rackUnits * item.count;
      watts += st.watts * item.count;
      stats.costUSD += st.priceUSD * item.count;
    } else {
      const pw = get(item.powerId);
      if (!pw || pw.kind !== 'power') {
        issues.push(err('RACK_UNKNOWN_ITEM', `Power equipment '${item.powerId}' is not in the catalog.`));
        continue;
      }
      stats.costUSD += pw.priceUSD * item.count; // no U, no IT watts (it feeds, not draws)
    }
  }

  stats.kW = watts / 1000;
  if (stats.units > rack.units) {
    issues.push(err('RACK_UNITS',
      `${stats.units}U of gear in a ${rack.units}U rack — U is physical height; the excess simply has nowhere to bolt in.`,
      rack.id));
  }
  if (stats.kW > rack.maxKW) {
    issues.push(err('RACK_POWER',
      `Rack draws ~${stats.kW.toFixed(1)} kW but the ${rack.name} is rated ${rack.maxKW} kW. Rack power is limited by feed/breakers and how much heat its cooling path removes — either thin the rack or move to a higher-density rack.`,
      rack.id));
  }
  if (stats.weightKg > rack.maxWeightKg) {
    issues.push(err('RACK_WEIGHT',
      `Loaded trays weigh ~${stats.weightKg} kg against the ${rack.name}'s ${rack.maxWeightKg} kg rating — racks are structural; an overloaded frame warps rails and fails floor loading.`,
      rack.id));
  }
  return { issues, stats };
}

// ===========================================================================
// Hall
// ===========================================================================
export function validateHall(hall: HallState, racks: RackContext[], get: CatalogGet): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byDesign = new Map(racks.map(r => [r.design.id, r]));
  const placed = hall.racks.filter(p => p.status !== 'failed');

  if (placed.length > hall.rackSlots) {
    issues.push(err('HALL_RACK_SLOTS',
      `${placed.length} racks placed but the hall has ${hall.rackSlots} floor slots — each rack needs a tile position with power whip and coolant drop.`));
  }

  let itKW = 0;
  for (const p of placed) {
    const ctx = byDesign.get(p.designId);
    if (!ctx) {
      issues.push(err('HALL_UNKNOWN_DESIGN',
        `Placed rack '${p.id}' references design '${p.designId}' which does not exist — remove it or restore the design.`));
      continue;
    }
    const rv = validateRack(ctx.design, ctx.trays, get);
    issues.push(...rv.issues);
    itKW += rv.stats.kW;

    if (COOL_LEVEL[ctx.design.coolingInterface] > COOL_LEVEL[hall.coolingClass]) {
      issues.push(err('HALL_COOLING_CLASS',
        `Rack design '${ctx.design.name}' needs a ${ctx.design.coolingInterface} row but the hall is ${hall.coolingClass}-class. A liquid rack without facility coolant (CDUs, chilled water) is a very expensive space heater — upgrade the hall's cooling class or use air trays.`,
        'ct-cdu-1600'));
    }
    if (rv.stats.weightKg > hall.floorLoadKgPerRack) {
      issues.push(err('HALL_FLOOR_LOAD',
        `Rack design '${ctx.design.name}' weighs ~${rv.stats.weightKg} kg but the hall floor is rated ${hall.floorLoadKgPerRack} kg per rack. Raised floors and slabs have point-load limits — liquid AI racks regularly need floor reinforcement.`,
        ctx.design.rackId));
    }
  }

  if (itKW > hall.itPowerKW) {
    issues.push(err('HALL_IT_POWER',
      `Racks draw ~${itKW.toFixed(1)} kW of IT power but the hall's transformers/UPS only deliver ${hall.itPowerKW} kW. Every IT watt must exist as installed power capacity — add a transformer/UPS or commission fewer racks.`,
      'et-padmount-2500'));
  }
  if (itKW > hall.coolingKW) {
    issues.push(err('HALL_COOLING',
      `Racks reject ~${itKW.toFixed(1)} kW of heat but the hall's cooling plant removes only ${hall.coolingKW} kW. IT power turns into heat almost 1:1; without matching CDU/CRAH/chiller capacity the room thermal-runs and hardware throttles.`,
      'ct-cdu-1600'));
  }
  return issues;
}

// ===========================================================================
// PUE
// ===========================================================================
/**
 * PUE = 1 + (cooling electricity + power-conversion losses) / IT load.
 * Cooling draws `wattsPerKW` for each kW actually removed (capped by unit capacity);
 * losses use the capacity-weighted average efficiency of installed power equipment.
 * Returns 1 when there is no IT load (no division by zero, no plant -> no overhead).
 */
export function computePUE(hall: HallState, get: CatalogGet): number {
  const itKW = hall.itPowerKW;
  if (itKW <= 0) return 1;

  let coolingElecKW = 0;
  for (const [id, count] of Object.entries(hall.coolingEquip)) {
    const c = get(id);
    if (!c || c.kind !== 'cooling') continue;
    coolingElecKW += count * Math.min(itKW, c.capacityKW) * (c.wattsPerKW / 1000);
  }

  let cap = 0, effSum = 0;
  for (const [id, count] of Object.entries(hall.powerEquip)) {
    const p = get(id);
    if (!p || p.kind !== 'power' || p.efficiency >= 1) continue;
    cap += count * p.capacityKW;
    effSum += count * p.capacityKW * p.efficiency;
  }
  const lossKW = cap > 0 ? itKW * (1 - effSum / cap) : 0;

  return 1 + (coolingElecKW + lossKW) / itKW;
}
