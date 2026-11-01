// Tests for src/sim/validate.ts using REAL catalog ids from src/data.
// Expected stats are hand-computed from published catalog numbers.
import { describe, it, expect } from 'vitest';
import { getItem } from '../data';
import { validateTray, validateRack, validateHall, computePUE } from './validate';
import type { RackContext } from './validate';
import type { TrayDesign, RackDesign, HallState } from '../types';

const get = getItem;
const codes = (iss: { code: string }[]) => iss.map(i => i.code);

// ---- shared fixtures (real ids, specs from src/data) ----
// nv-hgx-h100-8gy: 8U air, overhead 1500W, maxPower 10500W, lanes 128, air 1300W/U, $75000, 130kg
// nv-h100-sxm: 700W, fp8 1979, 80GB, $30000  | amd-epyc-genoa: 360W, $11600
// sam-ddr5-5600-64: 10W, $330  | nv-connectx7: x16, 25W, $2800  | sam-pm9a3-3t84: 9W, $420
// vt-geist-5kw (pdu): $1600
const h100Tray: TrayDesign = {
  id: 'tray-h100', name: 'H100 8-way', chassisId: 'nv-hgx-h100-8gy',
  parts: [
    { slot: 'accelerator', itemId: 'nv-h100-sxm', count: 8 },
    { slot: 'cpu', itemId: 'amd-epyc-genoa', count: 2 },
    { slot: 'dimm', itemId: 'sam-ddr5-5600-64', count: 16 },
    { slot: 'nic', itemId: 'nv-connectx7', count: 4 },
    { slot: 'nvme', itemId: 'sam-pm9a3-3t84', count: 2 },
    { slot: 'psu', itemId: 'vt-geist-5kw', count: 4 },
  ],
};
const H100_TRAY_WATTS = 1500 + 8 * 700 + 2 * 360 + 16 * 10 + 4 * 25 + 2 * 9; // 8098
const H100_TRAY_COST = 75000 + 8 * 30000 + 2 * 11600 + 16 * 330 + 4 * 2800 + 2 * 420 + 4 * 1600;

// sm-ubb-oam8-mi300x: 8U air, overhead 1200W, maxPower 10400W, air 1300W/U
// amd-mi355x: oam, 1400W, dlc/immersion-only cooling
const mi355AirTray: TrayDesign = {
  id: 'tray-mi355-air', name: 'MI355X on air UBB', chassisId: 'sm-ubb-oam8-mi300x',
  parts: [
    { slot: 'accelerator', itemId: 'amd-mi355x', count: 8 },
    { slot: 'cpu', itemId: 'amd-epyc-genoa', count: 2 },
    { slot: 'dimm', itemId: 'sam-ddr5-5600-64', count: 12 },
    { slot: 'nic', itemId: 'nv-connectx7', count: 2 },
    { slot: 'nvme', itemId: 'sam-pm9a3-3t84', count: 2 },
    { slot: 'psu', itemId: 'vt-geist-5kw', count: 4 },
  ],
};
// gig-ubb-oam8-lq: 8U dlc, overhead 1200W, maxPower 16000W, coldplate slot 8 required 8
const mi355DlcTray: TrayDesign = {
  id: 'tray-mi355-dlc', name: 'MI355X liquid UBB', chassisId: 'gig-ubb-oam8-lq',
  parts: [
    { slot: 'accelerator', itemId: 'amd-mi355x', count: 8 },
    { slot: 'cpu', itemId: 'amd-epyc-genoa', count: 2 },
    { slot: 'dimm', itemId: 'sam-ddr5-5600-64', count: 12 },
    { slot: 'nic', itemId: 'nv-connectx7', count: 2 },
    { slot: 'nvme', itemId: 'sam-pm9a3-3t84', count: 2 },
    { slot: 'psu', itemId: 'vt-geist-5kw', count: 4 },
    { slot: 'coldplate', itemId: 'ct-coldplate-80', count: 8 },
  ],
};
// nv-gb200-nvl72-ct: 2U dlc, overhead 400W, maxPower 6000W, lanes 96, no PSU slots (busbar)
// nv-gh200: superchip, 1000W, $45000, maxScaleUpDomain 32
const gb72Tray: TrayDesign = {
  id: 'tray-gb72', name: 'NVL72 compute tray', chassisId: 'nv-gb200-nvl72-ct',
  parts: [
    { slot: 'accelerator', itemId: 'nv-gh200', count: 2 },
    { slot: 'nic', itemId: 'nv-connectx7', count: 4 },
    { slot: 'nvme', itemId: 'sam-pm9a3-3t84', count: 2 },
  ],
};
const GB72_TRAY_WATTS = 400 + 2 * 1000 + 4 * 25 + 2 * 9; // 2518

const nvlRack: RackDesign = {
  id: 'rack-nvl72', name: 'GB200 NVL72', rackId: 'fox-nvl72-mgx',
  items: [
    { type: 'tray', trayId: 'tray-gb72', count: 17 },
    { type: 'switch', switchId: 'nv-nvlink-switch-tray5', count: 9 },
  ],
  coolingInterface: 'dlc',
};
const nvlCtx: RackContext = { design: nvlRack, trays: [gb72Tray] };

describe('validateTray', () => {
  it('accepts a fully-populated H100 HGX tray and reports exact stats', () => {
    const r = validateTray(h100Tray, get);
    expect(r.issues).toEqual([]);
    expect(r.stats).toEqual({
      watts: H100_TRAY_WATTS,       // 8098 = 1500 overhead + parts
      pcieLanesUsed: 4 * 16 + 2 * 4, // CX7 x16 each, NVMe x4 each; SXM accels ride NVSwitch, not host lanes
      costUSD: H100_TRAY_COST,
      accels: 8,
      tflopsFp8: 8 * 1979,
      memGB: 8 * 80,
    });
  });

  it('flags more parts than physical slots', () => {
    const r = validateTray({ ...h100Tray, parts: h100Tray.parts.map(p => p.slot === 'accelerator' ? { ...p, count: 9 } : p) }, get);
    expect(codes(r.issues)).toContain('TRAY_SLOT_OVERFLOW');
    expect(r.issues[0].severity).toBe('error');
    expect(r.issues[0].learn).toBe('nv-hgx-h100-8gy');
  });

  it('flags unmet required slot counts', () => {
    const r = validateTray({ ...h100Tray, parts: h100Tray.parts.map(p => p.slot === 'accelerator' ? { ...p, count: 4 } : p) }, get);
    expect(codes(r.issues)).toContain('TRAY_SLOT_REQUIRED');
  });

  it('flags parts the slot does not accept (OAM module in an SXM board)', () => {
    const r = validateTray({ ...h100Tray, parts: h100Tray.parts.map(p => p.slot === 'accelerator' ? { ...p, itemId: 'amd-mi300x' } : p) }, get);
    expect(codes(r.issues)).toContain('TRAY_PART_FIT');
  });

  it('flags PCIe lane overdraft from NICs/NVMe', () => {
    const r = validateTray({ ...h100Tray, parts: h100Tray.parts.map(p =>
      p.slot === 'nic' ? { ...p, count: 8 } : p.slot === 'nvme' ? { ...p, count: 4 } : p) }, get);
    expect(r.stats.pcieLanesUsed).toBe(8 * 16 + 4 * 4); // 144
    expect(codes(r.issues)).toContain('TRAY_PCIE_LANES');
  });

  it('flags unknown part ids and skips them in stats', () => {
    const r = validateTray({ ...h100Tray, parts: [...h100Tray.parts, { slot: 'nic', itemId: 'no-such-nic', count: 1 }] }, get);
    expect(codes(r.issues)).toContain('TRAY_UNKNOWN_PART');
    expect(r.stats.pcieLanesUsed).toBe(4 * 16 + 2 * 4);
  });

  it('teaches why a 1400W dlc-only OAM cannot go in an air UBB: power, air limit and cooling', () => {
    const r = validateTray(mi355AirTray, get);
    const c = codes(r.issues);
    expect(r.stats.watts).toBe(1200 + 8 * 1400 + 2 * 360 + 12 * 10 + 2 * 25 + 2 * 9); // 13308 > 10400 maxPower
    expect(c).toContain('TRAY_POWER');
    expect(c).toContain('TRAY_AIR_WATTS');
    expect(c).toContain('TRAY_ACCEL_COOLING');
    expect(r.issues.find(i => i.code === 'TRAY_ACCEL_COOLING')!.learn).toBe('amd-mi355x');
  });

  it('accepts the same MI355X tray in the liquid UBB with cold plates filled', () => {
    const r = validateTray(mi355DlcTray, get);
    expect(r.issues).toEqual([]);
    expect(r.stats.watts).toBe(13308);
  });
});

describe('validateRack', () => {
  it('accepts 2x H100 trays + a ToR IB switch in a 48U RDHx rack', () => {
    const design: RackDesign = {
      id: 'rk1', name: 'air rack', rackId: 'gen-rack-19-48u-hd',
      items: [{ type: 'tray', trayId: 'tray-h100', count: 2 }, { type: 'switch', switchId: 'nv-qm9700', count: 1 }],
      coolingInterface: 'air',
    };
    const r = validateRack(design, [h100Tray], get);
    expect(r.issues).toEqual([]);
    expect(r.stats).toEqual({
      kW: (2 * H100_TRAY_WATTS + 400) / 1000, // 16.596
      units: 2 * 8 + 1,                       // 17U of 48
      weightKg: 2 * 130,                      // chassis weight only (switches lack weight data)
      costUSD: 2600 + 2 * H100_TRAY_COST + 45000,
      accels: 16,
      scaleUpDomain: 8, // NVLink4 domain inside one HGX board
    });
  });

  it('flags rack power overdraft with a teaching message', () => {
    const design: RackDesign = {
      id: 'rk2', name: 'too hot', rackId: 'gen-rack-19-48u-hd',
      items: [{ type: 'tray', trayId: 'tray-h100', count: 4 }],
      coolingInterface: 'air',
    };
    const r = validateRack(design, [h100Tray], get);
    expect(r.stats.kW).toBeCloseTo((4 * H100_TRAY_WATTS) / 1000, 3);
    const e = r.issues.find(i => i.code === 'RACK_POWER')!;
    expect(e).toBeTruthy();
    expect(e.severity).toBe('error');
    expect(e.learn).toBe('gen-rack-19-48u-hd');
    expect(e.message).toMatch(/kW/);
  });

  it('flags 19in trays in an MGX rack and an unsupported cooling interface', () => {
    const design: RackDesign = {
      id: 'rk3', name: 'mixed standards', rackId: 'fox-nvl72-mgx',
      items: [{ type: 'tray', trayId: 'tray-h100', count: 1 }],
      coolingInterface: 'air', // fox-nvl72-mgx is dlc-only
    };
    const c = codes(validateRack(design, [h100Tray], get).issues);
    expect(c).toContain('RACK_STANDARD_MISMATCH');
    expect(c).toContain('RACK_INTERFACE_UNSUPPORTED');
  });

  it('flags busbar-less trays: NVL72 compute tray has no PSUs, needs a 48V busbar rack', () => {
    const design: RackDesign = {
      id: 'rk4', name: 'wrong rack', rackId: 'gen-rack-19-48u-hd',
      items: [{ type: 'tray', trayId: 'tray-gb72', count: 1 }],
      coolingInterface: 'dlc',
    };
    expect(codes(validateRack(design, [gb72Tray], get).issues)).toContain('RACK_TRAY_NEEDS_BUSBAR');
  });

  it('validates a 17-tray NVL72: 43U, ~65.3kW, domain 32 (gh200 caps at 32)', () => {
    const r = validateRack(nvlRack, [gb72Tray], get);
    expect(r.issues).toEqual([]);
    expect(r.stats).toEqual({
      kW: (17 * GB72_TRAY_WATTS + 9 * 2500) / 1000, // 65.306
      units: 17 * 2 + 9,
      weightKg: 17 * 90,
      costUSD: 38000 + 17 * (65000 + 2 * 45000 + 4 * 2800 + 2 * 420) + 9 * 150000,
      accels: 34,
      scaleUpDomain: 32, // min(34 packages, chassis domainSize 72, gh200 maxScaleUpDomain 32)
    });
  });

  it('demands NVLink switch trays for rack-scale domains and shrinks the domain without them', () => {
    const noSw: RackDesign = { ...nvlRack, items: [{ type: 'tray', trayId: 'tray-gb72', count: 17 }] };
    const r = validateRack(noSw, [gb72Tray], get);
    const e = r.issues.find(i => i.code === 'RACK_NEEDS_SCALEUP_SWITCH')!;
    expect(e).toBeTruthy();
    expect(e.learn).toBe('nv-nvlink-switch-tray5');
    expect(r.stats.scaleUpDomain).toBe(2); // isolated per-tray domain
  });
});

describe('validateHall', () => {
  const hall = (over: Partial<HallState> = {}): HallState => ({
    id: 'h1', name: 'Hall 1', coolingClass: 'dlc', rackSlots: 4,
    itPowerKW: 150, coolingKW: 150, pue: 1.05,
    powerEquip: {}, coolingEquip: {},
    racks: [{ id: 'pr1', designId: 'rack-nvl72', slot: 0, status: 'online', readyMonth: 12 }],
    floorLoadKgPerRack: 1600,
    ...over,
  });

  it('accepts a hall sized for one NVL72 (65.3kW IT, 1530kg)', () => {
    expect(validateHall(hall(), [nvlCtx], get)).toEqual([]);
  });

  it('flags IT power, heat rejection, floor load and slot overdrafts', () => {
    const bad = validateHall(hall({ itPowerKW: 50, coolingKW: 50, floorLoadKgPerRack: 1500, rackSlots: 0 }), [nvlCtx], get);
    const c = codes(bad);
    expect(c).toContain('HALL_IT_POWER');
    expect(c).toContain('HALL_COOLING');
    expect(c).toContain('HALL_FLOOR_LOAD');
    expect(c).toContain('HALL_RACK_SLOTS');
    expect(bad.every(i => i.severity === 'error' && i.message.length > 20)).toBe(true);
  });

  it('flags a liquid rack in an air hall and points at CDU learning', () => {
    const iss = validateHall(hall({ coolingClass: 'air' }), [nvlCtx], get);
    const e = iss.find(i => i.code === 'HALL_COOLING_CLASS')!;
    expect(e).toBeTruthy();
    expect(e.learn).toBe('ct-cdu-1600');
  });
});

describe('computePUE', () => {
  it('adds cooling electricity and conversion losses over IT load', () => {
    // 1000 kW IT; one 1600kW CDU at 22 W per removed kW serves min(1000,1600)*22/1000 = 22 kW;
    // one 2.5MVA padmount at 98.8% eff loses 1000*(1-0.988) = 12 kW.
    const hall = {
      id: 'h', name: 'h', coolingClass: 'dlc' as const, rackSlots: 4, itPowerKW: 1000,
      coolingKW: 1600, pue: 1, powerEquip: { 'et-padmount-2500': 1 },
      coolingEquip: { 'ct-cdu-1600': 1 }, racks: [], floorLoadKgPerRack: 2000,
    };
    expect(computePUE(hall, get)).toBeCloseTo(1 + (22 + 12) / 1000, 4);
  });

  it('returns 1 with no IT load or no plant', () => {
    const base = { id: 'h', name: 'h', coolingClass: 'air' as const, rackSlots: 1, itPowerKW: 0, coolingKW: 0, pue: 1, powerEquip: {}, coolingEquip: {}, racks: [], floorLoadKgPerRack: 1 };
    expect(computePUE(base, get)).toBe(1);
    expect(computePUE({ ...base, itPowerKW: 100 }, get)).toBe(1);
  });
});
