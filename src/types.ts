// ===========================================================================
// GIGAWATT — core data contract. Catalogs (src/data) conform to these types;
// the sim (src/sim) and UI (src/ui) consume them. Keep units EXACT as noted.
// ===========================================================================

// ---------- shared primitives ----------
export type Vendor =
  | 'nvidia' | 'amd' | 'tenstorrent' | 'cerebras' | 'intel' | 'groq'
  | 'broadcom' | 'arista' | 'cisco' | 'marvell' | 'supermicro' | 'dell' | 'hpe'
  | 'gigabyte' | 'quanta' | 'foxconn' | 'ocp'
  | 'vertiv' | 'schneider' | 'eaton' | 'delta' | 'submer' | 'coolit' | 'motivair'
  | 'vast' | 'weka' | 'ddn' | 'samsung' | 'micron' | 'skhynix' | 'generic';

/** Learning text attached to every catalog entry. Plain text, no markdown. */
export interface Codex {
  /** One sentence: what is this thing. */
  summary: string;
  /** 2-4 sentences: why does it exist / what problem it solves / how it works. */
  explain: string;
  /** 1-3 short bullet strings: real engineering tradeoffs the player should care about. */
  tradeoffs: string[];
  /** Optional tags for search: e.g. ['hbm','training','scale-up']. */
  tags?: string[];
}

export interface CatalogBase {
  id: string;              // unique kebab id, e.g. 'nv-h100-sxm'
  name: string;            // display name
  vendor: Vendor;
  /** Year (decimal ok, 2024.5 = mid 2024) the part becomes purchasable in-game. */
  availableFrom: number;
  /** Year after which it is considered end-of-sale (optional). */
  eolAfter?: number;
  /** Unit price USD at launch (street/OEM-ish; approximate). */
  priceUSD: number;
  /** Lead time in months at launch; the sim modulates by demand. */
  leadTimeMonths: number;
  /** Max units a single buyer can get per quarter early in the life (allocation); undefined = unconstrained. */
  allocationPerQuarter?: number;
  codex: Codex;
}

// ---------- interconnect vocabulary ----------
/** Scale-up: tightly coupled memory-semantic fabric inside a "domain". */
export type ScaleUpTech =
  | 'nvlink3' | 'nvlink4' | 'nvlink5' | 'nvlink6'
  | 'infinity-fabric' | 'ualink' | 'tt-ethernet-mesh' | 'wafer' | 'groq-chip2chip' | 'gaudi-roce' | 'pcie' | 'none';

/** Scale-out network technology between domains/nodes. */
export type ScaleOutTech =
  | 'ib-hdr' | 'ib-ndr' | 'ib-xdr' | 'ib-gdr'
  | 'eth-100' | 'eth-200' | 'eth-400' | 'eth-800' | 'eth-1600'
  | 'spectrum-x' | 'uec-eth' | 'roce';

export type CoolingClass = 'air' | 'rdhx' | 'dlc' | 'immersion';

export type FormFactor = 'sxm' | 'oam' | 'pcie' | 'wafer' | 'module' | 'superchip' | 'rack-scale';

export type DataType = 'fp64' | 'fp32' | 'tf32' | 'bf16' | 'fp16' | 'fp8' | 'fp6' | 'fp4' | 'int8';

// ---------- compute parts ----------
export interface Accelerator extends CatalogBase {
  kind: 'accelerator';
  family: string;                       // 'Hopper', 'Blackwell', 'CDNA3', 'Blackhole', 'WSE'
  formFactor: FormFactor;
  /** Dense (non-sparse) peak TFLOPS per datatype. Omit unsupported types. */
  tflops: Partial<Record<DataType, number>>;
  memGB: number;                        // HBM / on-chip memory total, GB
  memType: 'hbm2' | 'hbm2e' | 'hbm3' | 'hbm3e' | 'hbm4' | 'hbm4e' | 'gddr6' | 'gddr7' | 'sram' | 'lpddr5x';
  memBWTBs: number;                     // TB/s
  /** On-die SRAM (MB) for SRAM-centric chips (Groq, Cerebras, Tenstorrent); else optional. */
  sramMB?: number;
  tdpW: number;
  scaleUp: ScaleUpTech;
  /** Per-accelerator scale-up bandwidth, GB/s, bidirectional aggregate. 0 if none. */
  scaleUpGBs: number;
  /** Max accelerators in one scale-up domain with the vendor's reference fabric. */
  maxScaleUpDomain: number;
  /** Native scale-out port per accelerator, in Gb/s (e.g., 400 for CX-7). 0 if the chip IS the NIC (e.g., Tenstorrent eth links counted here). */
  nativeScaleOutGbps: number;
  pcieGen: 4 | 5 | 6 | 0;
  pcieLanes: 16 | 8 | 0;
  cooling: CoolingClass[];              // supported cooling classes
  /** Software-stack maturity 0..1 (CUDA=1.0). Multiplies achieved MFU in sim. */
  softwareMaturity: number;
  /** Supported perf use: relative efficiency modifiers 0..1.5 */
  trainingAffinity: number;
  inferenceAffinity: number;
}

export interface Cpu extends CatalogBase {
  kind: 'cpu';
  arch: 'x86' | 'arm' | 'riscv';
  cores: number;
  tdpW: number;
  memChannels: number;
  maxMemGB: number;
  memBWGBs: number;
  pcieGen: 3 | 4 | 5 | 6;
  pcieLanes: number;
  /** For superchips (GH200 / GB200) the CPU is NVLink-C2C attached. */
  c2cGBs?: number;
}

export interface MemoryModule extends CatalogBase {
  kind: 'memory';
  type: 'ddr4' | 'ddr5' | 'lpddr5x' | 'mrdimm';
  capacityGB: number;
  speedMTs: number;
  watts: number;
}

export interface Storage extends CatalogBase {
  kind: 'nvme';
  capacityTB: number;
  readGBs: number;
  writeGBs: number;
  pcieGen: 4 | 5;
  watts: number;
}

// ---------- networking parts ----------
export interface Nic extends CatalogBase {
  kind: 'nic';
  /** 'nic' = plain adapter, 'dpu' = programmable (Arm cores, offload, security), 'smartnic'. */
  nicClass: 'nic' | 'smartnic' | 'dpu';
  tech: ScaleOutTech;
  gbps: number;                         // per-NIC aggregate line rate
  ports: number;
  pcieGen: 4 | 5 | 6;
  pcieLanes: 8 | 16;
  watts: number;
  /** Optional features list, e.g. ['sharp','rdma','gpudirect','ipsec','nvme-of','arm-cores:16']. */
  features: string[];
}

export interface Switch extends CatalogBase {
  kind: 'switch';
  role: 'scale-up' | 'scale-out' | 'frontend' | 'oob';
  tech: ScaleUpTech | ScaleOutTech;
  portCount: number;                    // number of ports at portGbps
  portGbps: number;                     // per-port line rate in Gb/s (for NVLink switch: per-port aggregate)
  /** Total switching capacity Tb/s. */
  capacityTbps: number;
  rackUnits: number;                    // U height (0 for in-rack switch trays that occupy a tray slot: use 1)
  watts: number;
  cooling: CoolingClass[];
  /** In-network compute (SHARP etc.) */
  inNetworkCompute?: boolean;
  features: string[];
}

export type CableType = 'dac' | 'acc' | 'aoc' | 'optic-sr' | 'optic-dr' | 'optic-fr' | 'nvlink-spine' | 'power' | 'liquid-hose' | 'copper-backplane';
export interface CableOrOptic extends CatalogBase {
  kind: 'cable';
  cableType: CableType;
  gbps: number;                         // 0 for power/liquid
  maxReachM: number;
  /** Power per end in W (optics burn real power). */
  wattsPerEnd: number;
  compatibleTech: (ScaleOutTech | ScaleUpTech)[];
}

// ---------- servers / trays ----------
/** A slot in a chassis/tray where parts go. The tray designer fills these. */
export type SlotKind = 'accelerator' | 'cpu' | 'dimm' | 'nic' | 'dpu' | 'nvme' | 'psu' | 'switchchip' | 'coldplate' | 'fan';
export interface ChassisSlot {
  kind: SlotKind;
  count: number;
  /** Which part families are acceptable, matched against Accelerator.formFactor etc. */
  accepts?: string[];
  /** Min count that must be filled for the chassis to be valid. */
  required?: number;
}

export interface Chassis extends CatalogBase {
  kind: 'chassis';
  /** U height for rack-mount; for rack-scale compute trays, 1 or 2 U-equivalents of the rack. */
  rackUnits: number;
  rackStandard: '19in' | 'orv3-21in' | 'nvl-mgx';
  slots: ChassisSlot[];
  /** Fixed baseboard/backplane capability: which scale-up tech the baseboard integrates, with domain size inside the chassis. */
  baseboard?: { scaleUp: ScaleUpTech; domainSize: number; includesSwitchChips?: boolean };
  /** Cooling class the chassis is designed for. */
  cooling: CoolingClass;
  /** Idle/overhead watts (fans, BMC, VRM losses) excluding configurable parts. */
  overheadW: number;
  /** Max sustained watts this chassis's PSUs/busbar feed can deliver. */
  maxPowerW: number;
  weightKg: number;
  /** PCIe Gen5 lanes available to NICs/NVMe after accelerators. */
  pcieLanesAvail: number;
  /** Aggregate max airflow-cooled TDP per chassis: if cooling==='air', total part watts must be <= this. */
  maxAirWattsPerU?: number;
}

// ---------- facility parts ----------
export interface RackSpec extends CatalogBase {
  kind: 'rack';
  standard: '19in' | 'orv3-21in' | 'nvl-mgx';
  units: number;                        // usable U (42/48/52...)
  maxKW: number;                        // design power density limit
  maxWeightKg: number;
  cooling: CoolingClass[];
  widthMM: number; depthMM: number; heightMM: number;
  /** Has integrated busbar / power shelf (ORv3, NVL). */
  hasBusbar: boolean;
}

export interface PowerEquip extends CatalogBase {
  kind: 'power';
  powerType: 'transformer' | 'ups' | 'genset' | 'pdu' | 'busway' | 'switchgear' | 'power-shelf' | 'battery' | 'solar-ppa' | 'gas-turbine';
  capacityKW: number;
  efficiency: number;                   // 0..1
  /** Install duration months. */
  installMonths: number;
  /** For PDUs: outlets/phase etc. may be described in codex. */
}

export interface CoolingEquip extends CatalogBase {
  kind: 'cooling';
  coolingType: 'crah' | 'rdhx' | 'cdu' | 'chiller' | 'dry-cooler' | 'cooling-tower' | 'immersion-tank' | 'cold-plate-loop';
  /** Heat removal capacity in kW. */
  capacityKW: number;
  /** Electrical watts consumed per kW heat removed (drives PUE). */
  wattsPerKW: number;
  /** Cooling class it serves. */
  serves: CoolingClass;
  /** Max supply coolant temp (C) for liquid, else air supply temp. */
  supplyTempC: number;
  installMonths: number;
}

export interface StorageSystem extends CatalogBase {
  kind: 'storage';
  tier: 'hot-nvme' | 'warm' | 'object';
  capacityPB: number;
  readGBs: number;
  writeGBs: number;
  rackUnits: number;
  watts: number;
}

// ---------- union ----------
export type CatalogItem =
  | Accelerator | Cpu | MemoryModule | Storage | Nic | Switch | CableOrOptic
  | Chassis | RackSpec | PowerEquip | CoolingEquip | StorageSystem;

// ---------- vendor ----------
export interface VendorInfo {
  id: Vendor;
  name: string;
  /** Sells which kinds. */
  sells: CatalogItem['kind'][];
  /** Base reliability 0..1 and support quality 0..1. */
  reliability: number;
  support: number;
  /** Volume discount: each doubling of cumulative spend above $1M yields this % off (cap 25%). */
  volumeDiscountPerDoublingPct: number;
  codex: Codex;
}

// ===========================================================================
// Player designs
// ===========================================================================
export interface TrayDesign {
  id: string;
  name: string;
  chassisId: string;
  /** Map slotKind -> list of {itemId, count}. */
  parts: { slot: SlotKind; itemId: string; count: number }[];
}

export interface RackDesign {
  id: string;
  name: string;
  rackId: string;
  /** Placed items bottom-to-top. */
  items: RackItem[];
  coolingInterface: CoolingClass;
}
export type RackItem =
  | { type: 'tray'; trayId: string; count: number; u?: number }
  | { type: 'switch'; switchId: string; count: number; u?: number }
  | { type: 'storage'; storageId: string; count: number; u?: number }
  | { type: 'power'; powerId: string; count: number; u?: number };

export interface ValidationIssue {
  severity: 'error' | 'warn' | 'info';
  code: string;
  message: string;
  /** Link to codex entry id for learning. */
  learn?: string;
}

// ===========================================================================
// Facility & fabric
// ===========================================================================
export interface HallState {
  id: string;
  name: string;
  coolingClass: CoolingClass;
  /** Rack slots (floor positions). */
  rackSlots: number;
  /** Facility power available to IT, kW (limited by transformers/UPS you've installed). */
  itPowerKW: number;
  /** Heat rejection capacity in kW (CDUs/chillers/CRAHs installed). */
  coolingKW: number;
  /** Computed PUE given installed equipment. */
  pue: number;
  /** Equipment installed: item id -> count. */
  powerEquip: Record<string, number>;
  coolingEquip: Record<string, number>;
  /** Placed racks. */
  racks: PlacedRack[];
  floorLoadKgPerRack: number;
}
export interface PlacedRack {
  id: string;
  designId: string;
  slot: number;
  status: 'ordered' | 'installing' | 'commissioning' | 'online' | 'failed';
  readyMonth: number;
  clusterId?: string;
  /** Part id that broke (needs a spare, otherwise a slow RMA). */
  failedPart?: string;
}

export type Topology = 'fat-tree-rail-optimized' | 'fat-tree' | 'dragonfly' | 'torus-ish' | 'single-domain';
export interface FabricDesign {
  id: string;
  name: string;
  scaleOutTech: ScaleOutTech;
  topology: Topology;
  /** Oversubscription ratio at the leaf->spine tier, 1 = non-blocking. */
  oversubscription: number;
  leafSwitchId: string;
  spineSwitchId?: string;
  /** Cable choices by tier. */
  nodeToLeafCableId: string;
  leafToSpineCableId?: string;
}

export interface Cluster {
  id: string;
  name: string;
  rackIds: string[];
  fabric: FabricDesign;
  /** Derived at evaluation time. */
  stats?: ClusterStats;
}
export interface ClusterStats {
  accelerators: number;
  acceleratorId: string;
  scaleUpDomain: number;
  totalMemGB: number;
  peakPFLOPSFp8: number;
  peakPFLOPSBf16: number;
  powerKW: number;
  bisectionTbps: number;
  /** Per-accelerator effective scale-out GB/s after oversubscription. */
  effScaleOutGBs: number;
  switchCounts: Record<string, number>;
  cableCounts: Record<string, number>;
  issues: ValidationIssue[];
}

// ===========================================================================
// Market
// ===========================================================================
export interface ModelSpec {
  id: string;
  name: string;               // e.g. 'Llama-3-70B'
  paramsB: number;            // total parameters in billions
  activeParamsB: number;      // active per token (MoE) else = paramsB
  layers: number;
  kvBytesPerToken: number;    // KV cache bytes per token per sequence (at serving dtype)
  era: number;                // year it becomes a typical customer ask
}

export interface TrainingContract {
  kind: 'training';
  id: string;
  customer: string;
  archetype: 'startup' | 'lab' | 'enterprise' | 'sovereign';
  model: ModelSpec;
  /** Min coherent accelerators in a single cluster. */
  minAccelerators: number;
  /** Min scale-up domain size required (e.g. 72 for MoE with expert-parallel). */
  minScaleUpDomain: number;
  /** Min effective scale-out GB/s per accelerator (else MFU collapse). */
  minScaleOutGBsPerAccel: number;
  /** Min total memory GB across the cluster (param + optimizer + activations). */
  minTotalMemGB: number;
  durationMonths: number;
  /** USD per accelerator-hour. */
  pricePerAccelHour: number;
  /** Penalty fraction of monthly revenue per 1% under SLA availability. */
  penaltyRate: number;
  deadlineMonth: number;     // offer window: absolute game month by which you must SIGN
  /** Months after signing you have to bring capacity online before the customer walks. */
  rampMonths?: number;
  slaAvailability: number;   // e.g. 0.97 allowed for restart/failures
}

export interface InferenceContract {
  kind: 'inference';
  id: string;
  customer: string;
  archetype: 'startup' | 'lab' | 'enterprise' | 'sovereign';
  model: ModelSpec;
  /** Required sustained output tokens/s across the deployment. */
  tokensPerSec: number;
  /** p95 time-per-output-token ms */
  tpotMs: number;
  /** p95 time-to-first-token ms */
  ttftMs: number;
  /** Avg context length tokens. */
  contextTokens: number;
  durationMonths: number;
  /** USD per million output tokens. */
  pricePerMTok: number;
  penaltyRate: number;
  deadlineMonth: number;
  rampMonths?: number;
  slaAvailability: number;
}

export type Contract = TrainingContract | InferenceContract;

// ===========================================================================
// Top-level game state (serializable)
// ===========================================================================
export interface GameState {
  month: number;                 // 0 = Jan 2020
  seed: number;
  cash: number;
  debt: number;
  reputation: number;            // 0..100
  halls: HallState[];
  trays: TrayDesign[];
  racks: RackDesign[];
  clusters: Cluster[];
  /** Purchased but unplaced inventory: itemId -> count. */
  inventory: Record<string, number>;
  orders: Order[];
  availableContracts: Contract[];
  activeContracts: ActiveContract[];
  log: LogEntry[];
  staff: number;
  utilityUSDPerKWh: number;
  codexSeen: string[];
  missionsDone: string[];
  history: { month: number; revenue: number; opex: number; cash: number; utilization: number }[];
  /** Power procurement (optional so old saves load). */
  powerOffers?: PowerOffer[];
  powerContracts?: PowerContract[];
  /** Spot GPU market: current $/GPU-hr, recent history, reserve price and clusters offered on spot. */
  spotPrice?: number;
  spotHistory?: number[];
  spotReserve?: number;
  spotClusters?: string[];
  /** Individual placed racks offered on spot (no cluster needed). */
  spotRacks?: string[];
  mode?: GameMode;
  /** "Easy path" projects: the game executes the build steps for a signed contract. */
  projects?: Project[];
}
export type GameMode = 'learner' | 'operator' | 'tycoon';
export interface Project {
  id: string; contractId: string; templateId: string; racks: number; hallId: string; name: string;
  stage: 'building' | 'commissioning' | 'clustering' | 'assigning' | 'done' | 'failed';
  rackIds: string[]; plant: { id: string; n: number }[]; clusterId?: string; notes: string[]; startMonth: number;
}
export interface PowerOffer {
  id: string; supplier: string; source: 'grid' | 'solar' | 'gas' | 'hydro' | 'nuclear';
  /** Committed (take-or-pay) MW. */ mw: number; priceUSDPerMWh: number; termMonths: number;
  /** Oversubscription limit: extra draw above commit allowed, as a fraction of mw. */ overdrawPct: number;
  /** Price multiplier on overdraw. */ overageMult: number;
  /** Probability the supplier delivers in a given month (1 - curtailment risk). */ firmness: number;
  offerUntil: number;
}
export interface PowerContract extends PowerOffer { startMonth: number; endMonth: number }
export interface Order { id: string; itemId: string; qty: number; unitPrice: number; arriveMonth: number; }
export interface ActiveContract { contract: Contract; clusterIds: string[]; startMonth: number; monthsServed: number; slaMisses: number; /** Month by which a cluster must be serving, else the contract defaults. */ deployBy?: number; }
export interface LogEntry { month: number; level: 'info' | 'good' | 'bad'; text: string; }

export const MONTHS_PER_YEAR = 12;
export const BASE_YEAR = 2020;
export const monthToYear = (m: number) => BASE_YEAR + m / MONTHS_PER_YEAR;

// ===========================================================================
// System templates: pre-engineered trays/racks you can buy as a bundle or customise.
// ===========================================================================
export type TemplateTier = 'diy' | 'oem' | 'turnkey';
export interface SystemTemplate {
  id: string;
  name: string;
  /** Who sells/integrates it (nvidia DGX, supermicro, dell, hpe, foxconn...). */
  integrator: Vendor;
  tier: TemplateTier;
  platform: string;               // e.g. 'HGX A100', 'GB200 NVL72' - groups variants together
  tagline: string;
  availableFrom: number;
  eolAfter?: number;
  tray: { chassisId: string; parts: { slot: SlotKind; itemId: string; count: number }[] };
  rack: { rackId: string; trayCount: number; extras: RackItem[]; cooling: CoolingClass };
  /** Price premium over the sum of part prices (integration, validation, support, margin). */
  premium: number;
  /** Lead-time multiplier: integrators hold allocation and ship pre-built (<1 is faster). */
  leadFactor: number;
  /** One line: who should buy this. */
  audience: string;
  codex: Codex;
}
