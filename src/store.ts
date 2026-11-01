// ===========================================================================
// GIGAWATT — Zustand game store. All mutations clone the GameState, apply,
// and commit atomically. Sim stays pure (src/sim); this file only wires it
// to React + localStorage persistence.
// ===========================================================================
import { getTemplate } from './data/templates';
import { templateBom, trayOf, rackOf, trayIdOf, rackIdOf } from './plan';
import { create } from 'zustand';
import { ALL_ITEMS, getItem, VENDORS } from './data';
import { monthToYear } from './types';
import type {
  ClusterStats,
  CatalogItem,
  CoolingClass,
  Cluster,
  FabricDesign,
  GameState,
  HallState,
  GameMode,
  Project,
  PlacedRack,
  RackDesign,
  TrayDesign,
  ValidationIssue,
} from './types';
import { advanceMonth, RACK_READY_LEAD } from './sim/tick';
import { evaluateCluster } from './sim/network';
import { inferenceCapacity } from './sim/perf';
import { computePUE, validateRack } from './sim/validate';
import {
  estimateCapexBasis,
  HOURS_PER_MONTH,
  monthlyDepreciation,
  monthlyInterest,
  monthlyOpex,
} from './sim/economy';
import { mulberry32 } from './sim/rng';
import { generateContracts } from './sim/market';
import { generatePowerOffers, spotAnchor } from './sim/power';
import { startProject, stepAllProjects, assignFromRacks } from './autopilot';

// ---------- procurement model (deterministic: f(item, month)) ----------

const DEMAND_CURVE: [number, number][] = [
  [2020, 0.2], [2022.4, 0.4], [2023.3, 1.0], [2024.6, 0.9], [2026, 0.55], [2028, 0.5],
];

const lerpCurve = (pts: [number, number][], x: number): number => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
};

/** 0..1 how hot the AI hardware market is (drives lead times and street prices). */
export const START_MONTH = 11; // Dec 2020: HGX A100 ships, CPUs/NVMe/NICs for a first real build exist
export const demandIndex = (year: number): number => lerpCurve(DEMAND_CURVE, year);

export interface Offer {
  item: CatalogItem;
  available: boolean;
  reason?: string;
  unitPrice: number;
  leadMonths: number;
  /** Per-quarter allocation cap, if the vendor rations this part. */
  qtyCap?: number;
}

/** Price drift + lead-time modulation + availability for a catalog item this month. */
export const offerAt = (item: CatalogItem, month: number): Offer => {
  const year = monthToYear(month);
  if (year < item.availableFrom) {
    return {
      item,
      available: false,
      reason: `Not shipping until ${Math.floor(item.availableFrom)} — labs and hyperscalers queue first.`,
      unitPrice: 0,
      leadMonths: 0,
    };
  }
  if (item.eolAfter && year > item.eolAfter) {
    return {
      item,
      available: false,
      reason: 'End-of-sale: the vendor no longer ships this generation. Look at newer parts.',
      unitPrice: 0,
      leadMonths: 0,
    };
  }
  const age = year - item.availableFrom;
  const hype = age < 0.4 ? 1.12 : 1;
  const decay = Math.max(0.55, 1 - 0.1 * Math.max(0, age - 0.4));
  const demand = demandIndex(year);
  const boom = 1 + demand * (item.kind === 'accelerator' ? 0.18 : 0.06);
  const lead = Math.max(
    1,
    Math.round(item.leadTimeMonths * (1 + demand * (item.kind === 'accelerator' ? 1 : 0.25))),
  );
  return {
    item,
    available: true,
    unitPrice: Math.round(item.priceUSD * hype * decay * boom),
    leadMonths: lead,
    qtyCap: item.allocationPerQuarter,
  };
};

/** Volume discount for a single order (each $-doubling above $1M adds vendorPct, cap 25%). */
export const volumeDiscount = (item: CatalogItem, qty: number, unitPrice: number): number => {
  const vendor = VENDORS.find((v) => v.id === item.vendor);
  if (!vendor || qty <= 0) return 0;
  const doublings = Math.floor(Math.log2(Math.max(1, unitPrice * qty) / 1e6));
  if (doublings <= 0) return 0;
  return Math.min(0.25, doublings * (vendor.volumeDiscountPerDoublingPct / 100));
};

/** Full parts list (itemId -> count) needed to physically place one rack of a design. */
export const rackBom = (state: GameState, designId: string): Record<string, number> | undefined => {
  const design = state.racks.find((r) => r.id === designId);
  if (!design) return undefined;
  const need: Record<string, number> = { [design.rackId]: 1 };
  for (const item of design.items) {
    if (item.type === 'tray') {
      const tray = state.trays.find((t) => t.id === item.trayId);
      if (!tray) return undefined;
      for (const p of tray.parts) need[p.itemId] = (need[p.itemId] ?? 0) + p.count * item.count;
    } else {
      const id = item.type === 'switch' ? item.switchId : item.type === 'storage' ? item.storageId : item.powerId;
      need[id] = (need[id] ?? 0) + item.count;
    }
  }
  return need;
};

/** Borrowing headroom: fixed line + collateral against capitalized equipment. */
export const creditLimit = (state: GameState): number => 5_000_000 + estimateCapexBasis(state) * 0.6;

// ---------- derived selectors (pure, take GameState) ----------

export const selectCapexBasis = estimateCapexBasis;
export const selectNetWorth = (g: GameState): number => g.cash - g.debt + estimateCapexBasis(g) * 0.5;

export interface MonthlyPnL {
  revenue: number;
  opex: number;
  depreciation: number;
  interest: number;
  net: number;
}

/** Best-case monthly P&L projection (assumes SLAs met at current capacity). */
export const selectMonthlyPnL = (g: GameState): MonthlyPnL => {
  const opex = monthlyOpex(g);
  const depreciation = monthlyDepreciation(estimateCapexBasis(g));
  const interest = monthlyInterest(g.debt);
  const revenue = g.activeContracts.reduce((sum, ac) => {
    if (ac.clusterIds.length === 0) return sum;
    const c = ac.contract;
    if (c.kind === 'training') {
      const accels = ac.clusterIds.reduce(
        (n, id) => n + (g.clusters.find((x) => x.id === id)?.stats?.accelerators ?? 0),
        0,
      );
      return sum + accels * c.pricePerAccelHour * HOURS_PER_MONTH;
    }
    return sum + ((c.tokensPerSec * HOURS_PER_MONTH * 3600) / 1e6) * c.pricePerMTok;
  }, 0);
  return { revenue, opex: opex.totalUSD, depreciation, interest, net: revenue - opex.totalUSD - depreciation - interest };
};

export const selectPurchasable = (month: number): CatalogItem[] => {
  const year = monthToYear(month);
  return ALL_ITEMS.filter((i) => year >= i.availableFrom && (!i.eolAfter || year <= i.eolAfter));
};

// ---------- store ----------

export interface ActionResult {
  ok: boolean;
  message: string;
  issues?: ValidationIssue[];
}

export interface GameStore {
  game: GameState;
  newGame: (seed?: number, mode?: GameMode) => void;
  buy: (itemId: string, qty: number) => ActionResult;
  /** Adopt a template's tray+rack designs and order the full bill of materials for `racks` racks, atomically. */
  buyTemplate: (templateId: string, racks: number) => ActionResult;
  adoptTemplate: (templateId: string) => ActionResult;
  saveTray: (tray: TrayDesign) => ActionResult;
  saveRack: (rack: RackDesign) => ActionResult;
  buildHall: (name: string, coolingClass: CoolingClass, rackSlots: number) => ActionResult;
  installPower: (hallId: string, itemId: string, qty: number) => ActionResult;
  installCooling: (hallId: string, itemId: string, qty: number) => ActionResult;
  placeRack: (hallId: string, designId: string) => ActionResult;
  createCluster: (name: string, rackIds: string[], fabric: FabricDesign) => ActionResult;
  acceptContract: (contractId: string) => ActionResult;
  assignContract: (contractId: string, clusterIds: string[]) => ActionResult;
  takeLoan: (amountUSD: number) => ActionResult;
  nextMonth: () => void;
  save: () => void;
  load: () => ActionResult;
  signPower: (offerId: string, mw?: number) => ActionResult;
  setSpot: (clusterId: string, on: boolean) => ActionResult;
  setSpotReserve: (usd: number) => ActionResult;
  setSpotRack: (rackId: string, on: boolean) => ActionResult;
  assignRacks: (contractId: string, rackIds: string[]) => ActionResult;
  patchProject: (id: string, patch: Partial<Project>) => void;
  addProject: (p: Project) => void;
  startEasy: (contractId: string, templateId: string, racks: number) => ActionResult;
  stepEasy: () => void;
  setMode: (m: GameMode) => void;
}

import { POWER_SOURCES } from './sim/power';
const POWER_LESSON = Object.fromEntries(Object.entries(POWER_SOURCES).map(([k, v]) => [k, v.lesson])) as Record<string, string>;
void spotAnchor;
const SAVE_KEY = 'gigawatt-save-v1';

const ok = (message = '', issues?: ValidationIssue[]): ActionResult => ({ ok: true, message, issues });
const fail = (message: string, issues?: ValidationIssue[]): ActionResult => ({ ok: false, message, issues });

const usd = (n: number): string => Math.round(n).toLocaleString('en-US');

const COOL_LEVEL: Record<CoolingClass, number> = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };

const POWER_FEED_TYPES = [
  'transformer', 'switchgear', 'ups', 'genset', 'busway', 'power-shelf', 'solar-ppa', 'gas-turbine',
];

export const useGame = create<GameStore>()((set, get) => {
  const commit = (mutate: (g: GameState) => ActionResult | void): ActionResult => {
    const g: GameState = JSON.parse(JSON.stringify(get().game)) as GameState;
    const res = mutate(g) ?? ok();
    if (res.ok) set({ game: g });
    return res;
  };
  const logln = (g: GameState, level: 'info' | 'good' | 'bad', text: string) => {
    g.log.push({ month: g.month, level, text });
  };

  return {
    game: newGameState(0),

    newGame: (seed = Math.floor(Math.random() * 2 ** 31), mode = 'operator') => {
      const g = newGameState(seed);
      g.mode = mode;
      if (mode === 'learner') { g.cash = 80_000_000; g.log.push({ month: g.month, level: 'info', text: '🎓 Learner mode: $80M starting cash, explainers everywhere, and the Easy path will do the build steps for you.' }); }
      if (mode === 'tycoon') { g.cash = 30_000_000; g.log.push({ month: g.month, level: 'info', text: '💼 Tycoon mode: $30M, no hand-holding. Good luck.' }); }
      set({ game: g });
    },

    patchProject: (id, patch) => set(s => ({ game: { ...s.game, projects: (s.game.projects ?? []).map(p => p.id === id ? { ...p, ...patch } : p) } })),
    addProject: (p) => set(s => ({ game: { ...s.game, projects: [...(s.game.projects ?? []), p] } })),
    setMode: (m) => set(s => ({ game: { ...s.game, mode: m } })),
    startEasy: (contractId, templateId, racks) => { const r = startProject(get(), contractId, templateId, racks); if (r.ok) stepAllProjects(get); return r; },
    stepEasy: () => stepAllProjects(get),

    buy: (itemId, qty) =>
      commit((g) => {
        const item = getItem(itemId);
        if (!item) return fail(`Unknown item '${itemId}'.`);
        if (!Number.isFinite(qty) || qty <= 0) return fail('Order quantity must be positive.');
        const offer = offerAt(item, g.month);
        if (!offer.available) {
          return fail(offer.reason ?? 'Not purchasable this month.', [
            { severity: 'error', code: 'unavailable', message: offer.reason ?? '', learn: item.id },
          ]);
        }
        let n = Math.floor(qty);
        let note = '';
        if (offer.qtyCap && n > offer.qtyCap) {
          n = offer.qtyCap;
          note = ` Vendor allocation capped the order at ${n}/quarter — everyone is fighting for these parts.`;
        }
        const discount = volumeDiscount(item, n, offer.unitPrice);
        const cost = Math.round(offer.unitPrice * n * (1 - discount));
        if (cost > g.cash) {
          return fail(`Insufficient funds: $${usd(cost)} needed, $${usd(g.cash)} in the bank.`);
        }
        g.cash -= cost;
        g.orders.push({
          id: `ord-${g.month}-${g.orders.length + 1}-${itemId}`,
          itemId,
          qty: n,
          unitPrice: Math.round(offer.unitPrice * (1 - discount)),
          arriveMonth: g.month + offer.leadMonths,
        });
        logln(
          g,
          'info',
          `Ordered ${n} × ${item.name} for $${usd(cost)}${discount > 0 ? ` (${(discount * 100).toFixed(0)}% volume discount)` : ''}; arriving month ${g.month + offer.leadMonths}.${note}`,
        );
        return ok(`Ordered ${n} × ${item.name}; arrives month ${g.month + offer.leadMonths}.${note}`);
      }),

    adoptTemplate: (templateId) => {
      const t = getTemplate(templateId);
      if (!t) return { ok: false, message: 'Unknown template.' };
      const g = get().game;
      if (!g.trays.some((x) => x.id === trayIdOf(t))) { const r = get().saveTray(trayOf(t)); if (!r.ok) return r; }
      if (!get().game.racks.some((x) => x.id === rackIdOf(t))) { const r = get().saveRack(rackOf(t)); if (!r.ok) return r; }
      return { ok: true, message: `Saved designs for ${t.name}.` };
    },

    buyTemplate: (templateId, racks) => {
      const t = getTemplate(templateId);
      const nRacks = Math.floor(racks);
      if (!t) return { ok: false, message: 'Unknown template.' };
      if (!(nRacks >= 1)) return { ok: false, message: 'Order at least one rack.' };
      const adopted = get().adoptTemplate(templateId);
      if (!adopted.ok) return adopted;
      return commit((g) => {
        const bom = templateBom(t, nRacks);
        let cost = 0, lead = 1;
        const lines: { itemId: string; n: number; unit: number; lead: number }[] = [];
        for (const [itemId, n] of Object.entries(bom)) {
          const item = getItem(itemId)!;
          const offer = offerAt(item, g.month);
          if (!offer.available) return fail(`${item.name} is not purchasable yet: ${offer.reason}`);
          if (offer.qtyCap && n > offer.qtyCap) return fail(`Allocation: the vendor will only sell ${offer.qtyCap} × ${item.name} per quarter and you asked for ${n}. Order fewer racks or split across quarters.`);
          const unit = Math.round(offer.unitPrice * (1 - volumeDiscount(item, n, offer.unitPrice)) * (1 + t.premium));
          cost += unit * n;
          const l = Math.max(1, Math.round(offer.leadMonths * t.leadFactor));
          lead = Math.max(lead, l);
          lines.push({ itemId, n, unit, lead: l });
        }
        if (cost > g.cash) return fail(`Insufficient funds: this order costs $${usd(cost)} but you have $${usd(g.cash)}. Try fewer racks, or take a loan on the Dashboard.`);
        g.cash -= cost;
        for (const l of lines) g.orders.push({ id: `ord-${g.month}-${g.orders.length + 1}-${l.itemId}`, itemId: l.itemId, qty: l.n, unitPrice: l.unit, arriveMonth: g.month + l.lead });
        logln(g, 'info', `Ordered ${nRacks} × ${t.name} for $${usd(cost)} (${t.tier}, ${Math.round(t.premium * 100)}% integration premium). Full bill of materials arrives by month ${g.month + lead}.`);
        return ok(`Ordered ${nRacks} racks: $${usd(cost)}, everything arrives by month ${g.month + lead}.`);
      });
    },

    saveTray: (tray) =>
      commit((g) => {
        const i = g.trays.findIndex((t) => t.id === tray.id);
        if (i >= 0) g.trays[i] = tray;
        else g.trays.push(tray);
        logln(g, 'info', `Tray design '${tray.name}' saved.`);
        return ok('Tray saved.');
      }),

    saveRack: (rack) =>
      commit((g) => {
        const i = g.racks.findIndex((r) => r.id === rack.id);
        if (i >= 0) g.racks[i] = rack;
        else g.racks.push(rack);
        logln(g, 'info', `Rack design '${rack.name}' saved.`);
        return ok('Rack saved.');
      }),

    buildHall: (name, coolingClass, rackSlots) =>
      commit((g) => {
        const slots = Math.floor(rackSlots);
        if (slots < 4 || slots > 200) return fail('Halls hold between 4 and 200 rack slots.');
        const cost = 2_000_000 + 250_000 * slots;
        if (cost > g.cash) return fail(`This hall costs $${usd(cost)} — not enough cash.`);
        g.cash -= cost;
        const id = `hall-${g.halls.length + 1}`;
        const hall: HallState = {
          id,
          name: name || id,
          coolingClass,
          rackSlots: slots,
          itPowerKW: 0,
          coolingKW: 0,
          pue: 1,
          powerEquip: {},
          coolingEquip: {},
          racks: [],
          floorLoadKgPerRack: 1500,
        };
        g.halls.push(hall);
        logln(
          g,
          'good',
          `Built ${hall.name}: ${slots} slots, ${coolingClass.toUpperCase()}-ready shell. Install power and cooling plant before racks come in.`,
        );
        return ok(`${hall.name} built. Install power & cooling next.`);
      }),

    installPower: (hallId, itemId, qty) =>
      commit((g) => {
        const hall = g.halls.find((h) => h.id === hallId);
        if (!hall) return fail(`Hall '${hallId}' not found.`);
        const item = getItem(itemId);
        if (!item || item.kind !== 'power') return fail('Pick a power-equipment catalog item.');
        if (item.powerType === 'pdu' || item.powerType === 'power-shelf') {
          return fail(`${item.name} is a rack/tray-level part — it gets used when you place a rack, not installed in the hall. Keep it in the warehouse.`);
        }
        const n = Math.floor(qty);
        if (n <= 0) return fail('Quantity must be positive.');
        const have = g.inventory[itemId] ?? 0;
        if (have < n) {
          return fail(`Need ${n} × ${item.name} in inventory (have ${have}). Order them first.`, [
            { severity: 'error', code: 'missing-parts', message: `Need ${n}, have ${have}.`, learn: item.id },
          ]);
        }
        g.inventory[itemId] = have - n;
        if (g.inventory[itemId] <= 0) delete g.inventory[itemId];
        hall.powerEquip[itemId] = (hall.powerEquip[itemId] ?? 0) + n;
        const addedKW = POWER_FEED_TYPES.includes(item.powerType) ? n * item.capacityKW : 0;
        hall.itPowerKW += addedKW;
        hall.pue = computePUE(hall, getItem);
        logln(
          g,
          'good',
          `Installed ${n} × ${item.name} in ${hall.name}${addedKW > 0 ? ` (+${usd(addedKW)} kW IT capacity)` : ''}.`,
        );
        return ok(`Installed in ${hall.name}.`);
      }),

    installCooling: (hallId, itemId, qty) =>
      commit((g) => {
        const hall = g.halls.find((h) => h.id === hallId);
        if (!hall) return fail(`Hall '${hallId}' not found.`);
        const item = getItem(itemId);
        if (!item || item.kind !== 'cooling') return fail('Pick a cooling-equipment catalog item.');
        const n = Math.floor(qty);
        if (n <= 0) return fail('Quantity must be positive.');
        if (item.serves !== hall.coolingClass) {
          return fail(
            `${item.name} serves ${item.serves.toUpperCase()} loads, but ${hall.name} is a ${hall.coolingClass.toUpperCase()} hall.`,
            [
              {
                severity: 'error',
                code: 'cooling-mismatch',
                message: `${item.name} serves ${item.serves}; hall is ${hall.coolingClass}.`,
                learn: item.id,
              },
            ],
          );
        }
        const have = g.inventory[itemId] ?? 0;
        if (have < n) {
          return fail(`Need ${n} × ${item.name} in inventory (have ${have}). Order them first.`, [
            { severity: 'error', code: 'missing-parts', message: `Need ${n}, have ${have}.`, learn: item.id },
          ]);
        }
        g.inventory[itemId] = have - n;
        if (g.inventory[itemId] <= 0) delete g.inventory[itemId];
        hall.coolingEquip[itemId] = (hall.coolingEquip[itemId] ?? 0) + n;
        hall.coolingKW += n * item.capacityKW;
        hall.pue = computePUE(hall, getItem);
        logln(g, 'good', `Installed ${n} × ${item.name} in ${hall.name} (+${usd(n * item.capacityKW)} kW heat rejection).`);
        return ok(`Installed in ${hall.name}.`);
      }),

    placeRack: (hallId, designId) =>
      commit((g) => {
        const hall = g.halls.find((h) => h.id === hallId);
        if (!hall) return fail(`Hall '${hallId}' not found.`);
        const design = g.racks.find((r) => r.id === designId);
        if (!design) return fail(`Rack design '${designId}' not found.`);
        if (hall.racks.length >= hall.rackSlots) {
          return fail(`${hall.name} is full (${hall.rackSlots} slots). Build another hall.`);
        }
        if (COOL_LEVEL[design.coolingInterface] > COOL_LEVEL[hall.coolingClass]) {
          return fail(
            `${design.name} needs ${design.coolingInterface.toUpperCase()} cooling; ${hall.name} is only ${hall.coolingClass.toUpperCase()}.`,
            [
              {
                severity: 'error',
                code: 'cooling-mismatch',
                message: `Rack needs ${design.coolingInterface}; hall offers ${hall.coolingClass}.`,
                learn: design.rackId,
              },
            ],
          );
        }
        const need = rackBom(g, designId) ?? {};
        const missing = Object.entries(need).filter(([id, n]) => (g.inventory[id] ?? 0) < n);
        if (missing.length) {
          return fail(
            `Missing parts: ${missing
              .map(([id, n]) => `${n - (g.inventory[id] ?? 0)} more × ${getItem(id)?.name ?? id}`)
              .join(', ')}.`,
            missing.map(([id, n]) => ({
              severity: 'error' as const,
              code: 'missing-parts',
              message: `Need ${n} × ${getItem(id)?.name ?? id}, have ${g.inventory[id] ?? 0}.`,
              learn: id,
            })),
          );
        }
        const validation = validateRack(design, g.trays, getItem);
        const errors = validation.issues.filter((i) => i.severity === 'error');
        if (errors.length) return fail('Rack design has validation errors — fix it in the designer.', errors);

        for (const [id, n] of Object.entries(need)) {
          g.inventory[id] -= n;
          if (g.inventory[id] <= 0) delete g.inventory[id];
        }
        const rack: PlacedRack = {
          id: `pr-${g.month}-${hall.racks.length + 1}-${designId}`,
          designId,
          slot: hall.racks.length,
          status: 'installing',
          readyMonth: g.month + RACK_READY_LEAD,
        };
        hall.racks.push(rack);

        const liveKW = hall.racks
          .filter((r) => r.status !== 'failed')
          .reduce((kw, r) => {
            const d = g.racks.find((x) => x.id === r.designId);
            return kw + (d ? validateRack(d, g.trays, getItem).stats.kW : 0);
          }, 0);
        const warns: ValidationIssue[] = [];
        if (liveKW > hall.itPowerKW) {
          warns.push({
            severity: 'warn',
            code: 'power-overcommit',
            message: `${hall.name} IT load ~${usd(liveKW)} kW exceeds provisioned ${usd(hall.itPowerKW)} kW — racks will throttle or trip.`,
          });
        }
        if (liveKW > hall.coolingKW) {
          warns.push({
            severity: 'warn',
            code: 'cooling-overcommit',
            message: `${hall.name} heat load ~${usd(liveKW)} kW exceeds heat rejection ${usd(hall.coolingKW)} kW — expect thermal failures (3x MTBF stress).`,
          });
        }
        logln(
          g,
          'info',
          `Placed ${design.name} in ${hall.name} slot ${rack.slot}; install + commissioning, online ~month ${rack.readyMonth}.`,
        );
        return ok(`Rack placed; online ~month ${rack.readyMonth}.`, warns);
      }),

    createCluster: (name, rackIds, fabric) =>
      commit((g) => {
        const ids = [...new Set(rackIds)];
        if (!ids.length) return fail('Pick at least one placed rack.');
        const placed = new Map<string, PlacedRack>();
        for (const hall of g.halls) for (const r of hall.racks) placed.set(r.id, r);
        const unknown = ids.filter((id) => !placed.has(id));
        if (unknown.length) return fail(`Unknown placed racks: ${unknown.join(', ')}.`);
        const claimed = ids.filter((id) => placed.get(id)?.clusterId);
        if (claimed.length) return fail(`Racks already belong to a cluster: ${claimed.join(', ')}.`);
        const cluster: Cluster = { id: `cl-${g.clusters.length + 1}`, name, rackIds: ids, fabric };
        const stats = evaluateCluster(cluster, {
          getRack: (id) => { const pid = placed.get(id)?.designId ?? id; return g.racks.find((r) => r.id === pid); },
          getTray: (id) => g.trays.find((t) => t.id === id),
          getItem,
        });
        const errors = stats.issues.filter((i) => i.severity === 'error');
        if (errors.length) return fail('This fabric does not fit the rack set.', errors);
        cluster.stats = stats;
        g.clusters.push(cluster);
        for (const id of ids) placed.get(id)!.clusterId = cluster.id;
        logln(
          g,
          'good',
          `Cluster '${name}': ${stats.accelerators} accelerators, ${stats.powerKW.toFixed(0)} kW, bisection ${stats.bisectionTbps.toFixed(0)} Tb/s.`,
        );
        return ok(`Cluster '${name}' created.`);
      }),

    acceptContract: (contractId) =>
      commit((g) => {
        const i = g.availableContracts.findIndex((c) => c.id === contractId);
        if (i < 0) return fail('Offer not found.');
        const contract = g.availableContracts[i];
        if (g.month > contract.deadlineMonth) return fail('This offer already expired.');
        g.availableContracts.splice(i, 1);
        g.activeContracts.push({
          contract,
          clusterIds: [],
          startMonth: g.month,
          monthsServed: 0,
          slaMisses: 0,
          deployBy: g.month + (contract.rampMonths ?? 4),
        });
        logln(
          g,
          'info',
          `Signed ${contract.customer} (${contract.model.name}). You have until month ${g.month + (contract.rampMonths ?? 4)} to bring a qualifying cluster online — no revenue and no SLA clock until then, but miss it and the customer walks (−reputation).`,
        );
        return ok(`Contract signed. Deploy capacity and assign a cluster by month ${g.month + (contract.rampMonths ?? 4)}.`);
      }),

    assignContract: (contractId, clusterIds) =>
      commit((g) => {
        const ac = g.activeContracts.find((a) => a.contract.id === contractId);
        if (!ac) return fail('Active contract not found.');
        const ids = [...new Set(clusterIds)];
        const clusters = ids.map((id) => g.clusters.find((c) => c.id === id));
        if (clusters.some((c) => !c)) return fail('Unknown cluster in the list.');
        const contract = ac.contract;
        const issues: ValidationIssue[] = [];

        if (contract.kind === 'training') {
          let accelerators = 0;
          let maxDomain = 0;
          let maxScaleOut = 0;
          let totalMemGB = 0;
          for (const cl of clusters) {
            const stats = cl!.stats;
            if (!stats) continue;
            accelerators += stats.accelerators;
            maxDomain = Math.max(maxDomain, stats.scaleUpDomain);
            maxScaleOut = Math.max(maxScaleOut, stats.effScaleOutGBs);
            totalMemGB += stats.totalMemGB;
          }
          if (accelerators < contract.minAccelerators) {
            issues.push({
              severity: 'error',
              code: 'too-few-accelerators',
              message: `Needs ${contract.minAccelerators} coherent accelerators; the assigned set has ${accelerators}.`,
            });
          }
          if (maxDomain < contract.minScaleUpDomain) {
            issues.push({
              severity: 'error',
              code: 'domain-too-small',
              message: `Needs scale-up domains of ${contract.minScaleUpDomain} accelerators (${contract.model.name} runs expert/tensor parallel inside one domain); largest is ${maxDomain}.`,
            });
          }
          if (maxScaleOut < contract.minScaleOutGBsPerAccel) {
            issues.push({
              severity: 'error',
              code: 'scale-out-starved',
              message: `Needs ${contract.minScaleOutGBsPerAccel} GB/s effective scale-out per accelerator; fabric delivers ${maxScaleOut.toFixed(1)}. MFU will collapse.`,
            });
          }
          if (totalMemGB < contract.minTotalMemGB) {
            issues.push({
              severity: 'error',
              code: 'memory-too-small',
              message: `Needs ${contract.minTotalMemGB} GB total for training state; the cluster has ${totalMemGB} GB.`,
            });
          }
        } else {
          let total = 0; let worstTtft = 0;
          for (const cl of clusters) {
            const stats = cl!.stats;
            if (!stats) continue;
            const item = getItem(stats.acceleratorId);
            if (!item || item.kind !== 'accelerator') {
              issues.push({ severity: 'error', code: 'no-accelerators', message: `Cluster '${cl!.name}' has no accelerators to serve inference.` });
              continue;
            }
            const cap = inferenceCapacity(stats, item, contract.model, { contextTokens: contract.contextTokens, tpotMs: contract.tpotMs });
            for (const i of cap.issues) if (i.severity === 'error') issues.push({ ...i, message: `[${cl!.name}] ${i.message}` });
            // other inference contracts already consume a share of this cluster
            let used = 0;
            for (const o of g.activeContracts) {
              if (o.contract.id === contractId || !o.clusterIds.includes(cl!.id)) continue;
              if (o.contract.kind === 'training') { used = 1; break; }
              const oct = o.contract; if (oct.kind !== 'inference') continue;
              const oc = o.clusterIds.map((id) => g.clusters.find((x) => x.id === id)?.stats).filter(Boolean) as ClusterStats[];
              const oCap = oc.reduce((n, st2) => { const it2 = getItem(st2.acceleratorId); return n + (it2?.kind === 'accelerator' ? inferenceCapacity(st2, it2, oct.model, { contextTokens: oct.contextTokens, tpotMs: oct.tpotMs }).tokensPerSec : 0); }, 0);
              used += oCap > 0 ? Math.min(1, oct.tokensPerSec / oCap) : 0;
            }
            total += cap.tokensPerSec * Math.max(0, 1 - Math.min(1, used));
            worstTtft = Math.max(worstTtft, cap.ttftMs);
            if (cap.ttftMs > contract.ttftMs) issues.push({ severity: 'error', code: 'ttft-sla', message: `[${cl!.name}] p95 TTFT ${Math.round(cap.ttftMs)} ms exceeds the ${contract.ttftMs} ms SLA.`, learn: item.id });
          }
          if (total < contract.tokensPerSec) issues.push({ severity: 'error', code: 'tokens-under-capacity', message: `The assigned clusters have ~${usd(total)} tok/s free (after other contracts) of the required ${usd(contract.tokensPerSec)} tok/s at p95 ${contract.tpotMs} ms/TPOT.` });
        }
        if (contract.kind === 'training') {
          for (const cl of clusters) if (g.activeContracts.some((o) => o.contract.id !== contractId && o.clusterIds.includes(cl!.id))) issues.push({ severity: 'error', code: 'cluster-busy', message: `Cluster '${cl!.name}' is already serving another contract; a training job needs it exclusively.` });
        }

        const errors = issues.filter((i) => i.severity === 'error');
        if (errors.length) return fail('The assigned clusters do not meet this contract.', issues);

        ac.clusterIds = ids;
        ac.startMonth = g.month;
        const names = ids.map((id) => g.clusters.find((x) => x.id === id)?.name ?? id).join(' + ');
        logln(g, 'good', `${contract.customer} (${contract.model.name}) now served by ${names}.`);
        return ok(`Serving ${contract.customer}.`, issues);
      }),

    signPower: (offerId, mwOverride) =>
      commit((g) => {
        const i = (g.powerOffers ?? []).findIndex((o) => o.id === offerId);
        if (i < 0) return fail('Offer not found or expired.');
        const o = g.powerOffers![i];
        const mw = Math.max(1, Math.min(o.mw * 2, Math.round(mwOverride ?? o.mw)));
        g.powerOffers!.splice(i, 1);
        (g.powerContracts ??= []).push({ ...o, mw, startMonth: g.month + 1, endMonth: g.month + o.termMonths });
        logln(g, 'good', `Signed ${mw} MW ${o.source} PPA with ${o.supplier}: $${o.priceUSDPerMWh}/MWh take-or-pay for ${o.termMonths} mo, overdraw up to +${Math.round(o.overdrawPct * 100)}%. ${POWER_LESSON[o.source]}`);
        return ok(`Signed ${mw} MW with ${o.supplier}; starts next month.`);
      }),

    setSpot: (clusterId, on) =>
      commit((g) => {
        if (!g.clusters.some((c) => c.id === clusterId)) return fail('Unknown cluster.');
        const set = new Set(g.spotClusters ?? []);
        if (on) set.add(clusterId); else set.delete(clusterId);
        g.spotClusters = [...set];
        return ok(on ? 'Cluster offered on the spot market when idle.' : 'Cluster removed from the spot market.');
      }),

    setSpotRack: (rackId, on) =>
      commit((g) => {
        if (!g.halls.some((h) => h.racks.some((r) => r.id === rackId))) return fail('Unknown rack.');
        const set = new Set(g.spotRacks ?? []);
        if (on) set.add(rackId); else set.delete(rackId);
        g.spotRacks = [...set];
        return ok(on ? 'Rack offered on spot when online.' : 'Rack withdrawn from spot.');
      }),

    assignRacks: (contractId, rackIds) => assignFromRacks(get(), contractId, rackIds),

    setSpotReserve: (usd) =>
      commit((g) => { g.spotReserve = Math.max(0, usd); return ok(`Reserve price $${Math.max(0, usd).toFixed(2)}/GPU-hr.`); }),

    takeLoan: (amountUSD) =>
      commit((g) => {
        const amt = Math.floor(amountUSD);
        if (!Number.isFinite(amt) || amt <= 0) return fail('Loan amount must be positive.');
        const limit = creditLimit(g);
        if (g.debt + amt > limit) {
          return fail(
            `Credit limit is $${usd(limit)} (fixed line + collateral against installed assets). Borrow less or build more first.`,
          );
        }
        g.debt += amt;
        g.cash += amt;
        logln(g, 'info', `Drew a $${usd(amt)} loan at 7% APR — interest hits monthly. Principal due on refinancing.`);
        return ok(`$${usd(amt)} borrowed.`);
      }),

    nextMonth: () => { set({ game: advanceMonth(get().game) }); stepAllProjects(get); },

    save: () => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(get().game));
      } catch {
        // storage unavailable (private mode / SSR) — nothing to do
      }
    },

    load: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return fail('No save found.');
        const g = JSON.parse(raw) as GameState;
        if (
          typeof g.month !== 'number' ||
          typeof g.cash !== 'number' ||
          !Array.isArray(g.halls) ||
          !Array.isArray(g.clusters)
        ) {
          return fail('Save file corrupted.');
        }
        // migration: rack-level PDUs/power shelves wrongly installed into halls go back to the warehouse
        for (const h of g.halls) for (const [id, n] of Object.entries(h.powerEquip ?? {})) {
          const it = getItem(id);
          if (it?.kind === 'power' && (it.powerType === 'pdu' || it.powerType === 'power-shelf')) {
            g.inventory[id] = (g.inventory[id] ?? 0) + n; delete h.powerEquip[id];
            if (POWER_FEED_TYPES.includes(it.powerType)) h.itPowerKW = Math.max(0, h.itPowerKW - n * it.capacityKW);
          }
        }
        set({ game: g });
        return ok(`Loaded month ${g.month}.`);
      } catch {
        return fail('Save file unreadable.');
      }
    },
  };
});

export const hasSave = (): boolean => {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
};

export function newGameState(seed: number): GameState {
  const hall: HallState = {
    id: 'hall-1',
    name: 'Hall A',
    coolingClass: 'air',
    rackSlots: 40,
    itPowerKW: 500,
    coolingKW: 600,
    pue: 1,
    powerEquip: { 'et-padmount-2500': 1, 'se-galaxy-vs-500': 1 },
    coolingEquip: { 'vt-crah-100': 6 },
    racks: [],
    floorLoadKgPerRack: 1500,
  };
  hall.pue = computePUE(hall, getItem);
  const g: GameState = {
    month: START_MONTH,
    seed,
    cash: 50_000_000,
    debt: 0,
    reputation: 10,
    halls: [hall],
    trays: [],
    racks: [],
    clusters: [],
    inventory: {},
    orders: [],
    availableContracts: [],
    activeContracts: [],
    log: [],
    staff: 2,
    utilityUSDPerKWh: 0.07,
    codexSeen: [],
    missionsDone: [],
    history: [],
    powerOffers: [],
    powerContracts: [],
    spotClusters: [],
    spotReserve: 0,
  };
  g.powerOffers = [...generatePowerOffers(g, mulberry32(seed + 1), 3)];
  g.availableContracts = generateContracts(g, START_MONTH, mulberry32(seed));
  g.log.push({
    month: START_MONTH,
    level: 'info',
    text: 'GIGAWATT day one: $50M cash, Hall A with 500 kW IT power / 600 kW air cooling over 40 rack slots, utility at $0.07/kWh.',
  });
  g.log.push({
    month: START_MONTH,
    level: 'info',
    text: 'Order parts, design a tray and rack, then place racks — contracts on the market pay once a cluster serves them.',
  });
  return g;
}
