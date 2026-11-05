import { CoolingClass, FabricDesign, GameMode, GameState, Project, RackDesign, TrayDesign, ValidationIssue } from '../types';
import { ok, usd } from './actions/consts';
import { FLOOR_UNIT_SLOTS } from './pricing';

export interface ActionResult {
  ok: boolean;
  message: string;
  issues?: ValidationIssue[];
}

export interface GameStore {
  game: GameState;
  newGame: (seed?: number, mode?: GameMode) => void;
  buy: (itemId: string, qty: number, spare?: boolean) => ActionResult;
  /** Adopt a template's tray+rack designs and order the full bill of materials for `racks` racks, atomically. */
  buyTemplate: (templateId: string, racks: number, spares?: boolean) => ActionResult;
  adoptTemplate: (templateId: string) => ActionResult;
  saveTray: (tray: TrayDesign) => ActionResult;
  saveRack: (rack: RackDesign) => ActionResult;
  buildHall: (name: string, coolingClass: CoolingClass, rackSlots: number) => ActionResult;
  /** Buy floor space: `units` blocks of FLOOR_UNIT_SLOTS racks; they come online after a commissioning delay. */
  expandHall: (hallId: string, units: number) => ActionResult;
  /** Earmark `racks` of a design's parts so other designs can't consume them. */
  reserveRacks: (designId: string, racks: number) => ActionResult;
  installPower: (hallId: string, itemId: string, qty: number) => ActionResult;
  installCooling: (hallId: string, itemId: string, qty: number) => ActionResult;
  placeRack: (hallId: string, designId: string) => ActionResult;
  createCluster: (name: string, rackIds: string[], fabric: FabricDesign) => ActionResult;
  acceptContract: (contractId: string) => ActionResult;
  assignContract: (contractId: string, clusterIds: string[]) => ActionResult;
  unassignContract: (contractId: string) => ActionResult;
  disbandCluster: (clusterId: string) => ActionResult;
  takeLoan: (amountUSD: number) => ActionResult;
  nextMonth: () => void;
  save: (slot?: string) => ActionResult;
  load: (slot?: string) => ActionResult;
  signPower: (offerId: string, mw?: number) => ActionResult;
  buyUplink: (itemId: string) => ActionResult;
  dropUplink: (itemId: string) => ActionResult;
  setSpot: (clusterId: string, on: boolean) => ActionResult;
  setSpotReserve: (usd: number) => ActionResult;
  setSpotRack: (rackId: string, on: boolean) => ActionResult;
  assignRacks: (contractId: string, rackIds: string[]) => ActionResult;
  patchProject: (id: string, patch: Partial<Project>) => void;
  addProject: (p: Project) => void;
  startEasy: (contractId: string, templateId: string, racks: number) => ActionResult;
  stepEasy: () => void;
  setMode: (m: GameMode) => void;
  /** Sell a placed rack (must be unclustered) for its residual value; frees the slot. */
  decommissionRack: (rackId: string) => ActionResult;
  /** Sell warehouse stock at a discount (clear obsolete parts). */
  sellInventory: (itemId: string, qty: number) => ActionResult;
  hireStaff: (n: number) => ActionResult;
  fireStaff: (n: number) => ActionResult;
  repayLoan: (amountUSD: number) => ActionResult;
  /** Commit `commitUSD` of spend with a vendor for `months` months in exchange for a discount and priority. */
  signFramework: (vendorId: string, commitUSD: number, months: number) => ActionResult;
  cancelFramework: (frameworkId: string) => ActionResult;
  /** Choose burn-in length (0..3 months) and maintenance level (0..2). */
  setPolicy: (burnInMonths: number, maintenance: number) => ActionResult;
}

