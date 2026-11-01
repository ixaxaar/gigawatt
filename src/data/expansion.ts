// Realism expansion: second-tier and alternative parts so the player faces real
// cost/performance trade-offs (cheap hosts, PCIe/inference GPUs, SONiC switches,
// tiered storage, safer power/cooling). Approximate public specs.
import type { Accelerator, Cpu, Nic, Switch, PowerEquip, CoolingEquip, StorageSystem, MemoryModule, Storage, Vendor, CatalogBase } from '../types';
import { NVIDIA_ACCELERATORS } from './nvidia';

type Cx = [string, string, string[]?];
const cdx = ([summary, explain, t]: Cx): CatalogBase['codex'] => ({ summary, explain, tradeoffs: t ?? ['Cheaper or simpler than the flagship option, with a real compromise'], tags: ['expansion'] });
const base = (id: string, name: string, vendor: Vendor, from: number, price: number, lead: number, c: Cx) =>
  ({ id, name, vendor, availableFrom: from, priceUSD: price, leadTimeMonths: lead, codex: cdx(c) });

const L40S = NVIDIA_ACCELERATORS.find(a => a.id === 'nv-l40s') as Accelerator;
const H100 = NVIDIA_ACCELERATORS.find(a => a.id === 'nv-h100-sxm') as Accelerator;
const pcieAccel = (o: Partial<Accelerator> & Pick<Accelerator, 'id' | 'name' | 'vendor' | 'availableFrom' | 'priceUSD' | 'leadTimeMonths' | 'codex'>): Accelerator => ({ ...L40S, ...o });

export const EXP_ACCELERATORS: Accelerator[] = [
  pcieAccel({ ...base('nv-l4', 'L4 24GB (72 W low-profile)', 'nvidia', 2023.2, 2700, 2, ['Single-slot, 72 W inference card that fits 1U servers.', 'Passively cooled and tiny, the L4 is the density king for small-model serving, video and embeddings. It has no NVLink and only 24 GB, so large LLMs do not fit.', ['Best tokens per watt for small models', '24 GB caps model size; no scale-up']]),
    family: 'Ada Lovelace', tflops: { fp32: 30, tf32: 60, bf16: 121, fp16: 121, fp8: 242, int8: 242 }, memGB: 24, memBWTBs: 0.3, tdpW: 72, trainingAffinity: 0.2, inferenceAffinity: 0.8 }),
  pcieAccel({ ...base('nv-a30', 'A30 24GB (HBM2, PCIe)', 'nvidia', 2021.4, 5000, 2, ['165 W HBM2 PCIe card: a cheap A100 slice for inference and fine-tuning.', 'Half an A100 with HBM bandwidth, so memory-bound inference runs well. NVLink bridge pairs two cards, but nothing larger.', ['HBM at low power', 'Small memory, bridge-only scale-up']]),
    family: 'Ampere', tflops: { fp64: 5.2, fp32: 10.3, tf32: 82, bf16: 165, fp16: 165, int8: 330 }, memGB: 24, memType: 'hbm2', memBWTBs: 0.933, tdpW: 165, trainingAffinity: 0.45, inferenceAffinity: 0.85 }),
  pcieAccel({ ...base('nv-h100-pcie', 'H100 80GB PCIe', 'nvidia', 2022.9, 25000, 4, ['Air-cooled H100 PCIe: Hopper silicon at 350 W with reduced bandwidth.', 'Same die with fewer SMs and HBM2e, in a standard double-width card that fits any 4U/2U PCIe server. Great for inference; for training you give up NVLink4 and ~35% memory bandwidth.', ['Fits ordinary air-cooled servers', 'No NVSwitch: tensor-parallel scaling is weak']]),
    family: 'Hopper', tflops: { fp32: 51, tf32: 378, bf16: 756, fp16: 756, fp8: 1513, int8: 1513 }, memGB: 80, memType: 'hbm2e', memBWTBs: 2.0, tdpW: 350, trainingAffinity: 0.7, inferenceAffinity: 0.95, softwareMaturity: 1 }),
  pcieAccel({ ...base('nv-rtx-pro-6000', 'RTX PRO 6000 Blackwell 96GB', 'nvidia', 2025.3, 8500, 2, ['96 GB GDDR7 Blackwell workstation/server card with FP4.', 'Big memory for the money with FP4 support, a strong cost-per-token option for mid-size models. GDDR7 bandwidth is far below HBM, so decode throughput lags datacenter parts.', ['Lowest $/GB of fast memory', 'GDDR bandwidth limits long-context decode']]),
    family: 'Blackwell', tflops: { fp32: 120, tf32: 250, bf16: 500, fp16: 500, fp8: 1000, fp4: 2000, int8: 1000 }, memGB: 96, memType: 'gddr7', memBWTBs: 1.79, tdpW: 600, pcieGen: 5, trainingAffinity: 0.55, inferenceAffinity: 0.85 }),
  pcieAccel({ ...base('amd-mi210', 'AMD Instinct MI210 64GB (PCIe)', 'amd', 2022.0, 9000, 3, ['CDNA2 PCIe card with 64 GB HBM2e and 1.6 TB/s.', 'The air-cooled AMD alternative for PCIe servers; strong FP64 for HPC, cheaper than A100 but with a thinner software ecosystem.', ['Good memory capacity per dollar', 'ROCm maturity trails CUDA']]),
    family: 'CDNA2', tflops: { fp64: 22.6, fp32: 22.6, bf16: 181, fp16: 181, int8: 181 }, memGB: 64, memType: 'hbm2e', memBWTBs: 1.6, tdpW: 300, trainingAffinity: 0.5, inferenceAffinity: 0.7, softwareMaturity: 0.6 }),
  { ...H100, ...base('nv-h20', 'H20 96GB (export-compliant Hopper)', 'nvidia', 2024.0, 12000, 3, ['Hopper with compute cut ~85% but 4 TB/s HBM3 and full NVLink.', 'Built to meet export limits: tiny FLOPS, huge memory bandwidth. Terrible for training, surprisingly good for decode-heavy inference where bandwidth is the limit.', ['Inference-only value', 'Compute-starved for training']]),
    tflops: { fp32: 44, tf32: 74, bf16: 148, fp16: 148, fp8: 296, int8: 296 }, memGB: 96, memType: 'hbm3', memBWTBs: 4.0, tdpW: 400, trainingAffinity: 0.2, inferenceAffinity: 0.9 },
];

const AMD7742 = { kind: 'cpu' as const, arch: 'x86' as const };
const cpu = (o: Omit<Cpu, 'kind' | 'arch'> & { arch?: Cpu['arch'] }): Cpu => ({ ...AMD7742, ...o });
export const EXP_CPUS: Cpu[] = [
  cpu({ ...base('amd-epyc-9124', 'AMD EPYC 9124 (16-core Genoa, GPU-host value)', 'amd', 2022.9, 1083, 2, ['16-core Genoa with all 128 PCIe5 lanes at 200 W: the budget GPU-host CPU.', 'A GPU server needs lanes and memory channels, not cores. This part keeps the full I/O of Genoa at one fifth of the price of a 96-core chip, so it minimises $/GPU for inference trays.', ['Cheapest way to get 128 Gen5 lanes', 'Few cores: data loading and tokenisation can bottleneck']]),
    cores: 16, tdpW: 200, memChannels: 12, maxMemGB: 6144, memBWGBs: 460.8, pcieGen: 5, pcieLanes: 128 }),
  cpu({ ...base('intel-xeon-8480', 'Intel Xeon Platinum 8480+ (Sapphire Rapids)', 'intel', 2023.1, 11600, 3, ['56-core Sapphire Rapids with PCIe5 and AMX: the DGX H100 host CPU.', 'Intel AMX accelerates small-batch CPU inference, and PCIe5 feeds ConnectX-7. Only 80 lanes per socket, so GPU-dense trays need two.', ['Strong OEM support', '80 lanes/socket versus 128 on EPYC']]),
    cores: 56, tdpW: 350, memChannels: 8, maxMemGB: 4096, memBWGBs: 307, pcieGen: 5, pcieLanes: 80 }),
  cpu({ ...base('intel-xeon-6980p', 'Intel Xeon 6980P (Granite Rapids, 128-core)', 'intel', 2024.7, 17800, 3, ['128 P-cores with MRDIMM and 96 PCIe5 lanes at 500 W.', 'Granite Rapids pushes memory bandwidth past 800 GB/s with MRDIMMs, useful for CPU-hosted KV caches. Power and price are high.', ['Huge host memory bandwidth', '500 W per socket adds to rack power']]),
    cores: 128, tdpW: 500, memChannels: 12, maxMemGB: 6144, memBWGBs: 844, pcieGen: 5, pcieLanes: 96 }),
  cpu({ ...base('ampere-one-192', 'AmpereOne 192-core Arm', 'generic', 2023.9, 5800, 4, ['192 Arm cores at 350 W with 128 PCIe5 lanes.', 'Cloud-native Arm host with excellent perf/W for orchestration and data prep. x86-only software and drivers occasionally lag.', ['Great perf per watt', 'Some tooling is x86-only']]),
    arch: 'arm', cores: 192, tdpW: 350, memChannels: 8, maxMemGB: 4096, memBWGBs: 307, pcieGen: 5, pcieLanes: 128 }),
];

const nic = (o: Omit<Nic, 'kind' | 'features'> & { features?: string[] }): Nic => ({ kind: 'nic', features: ['rdma'], ...o });
export const EXP_NICS: Nic[] = [
  nic({ ...base('gen-ocp-nic-50', 'OCP NIC 3.0 2x25G (front-end)', 'generic', 2020.0, 320, 1, ['Cheap dual-port 25G OCP NIC for the front-end network.', 'Management, datasets and inference traffic rarely need 400G. A cheap NIC saves money but cannot feed GPU-to-GPU collectives.', ['Great for front-end and inference ingress', 'Useless as a training back-end']]),
    nicClass: 'nic', tech: 'eth-100', gbps: 50, ports: 2, pcieGen: 4, pcieLanes: 8, watts: 15, features: [] }),
  nic({ ...base('nv-connectx7-200', 'ConnectX-7 1x200G (cost-reduced)', 'nvidia', 2023.0, 900, 2, ['Single-port 200G ConnectX-7 at about half the price of the 400G card.', 'Pair one per GPU in PCIe inference nodes where 200G per GPU is plenty; training clusters usually want 400G.', ['Half the cost and power of CX7-400', 'Caps per-GPU network at 25 GB/s']]),
    nicClass: 'nic', tech: 'ib-ndr', gbps: 200, ports: 1, pcieGen: 5, pcieLanes: 16, watts: 20, features: ['rdma', 'gpudirect'] }),
];

const sw = (o: Omit<Switch, 'kind' | 'cooling' | 'inNetworkCompute'>): Switch => ({ kind: 'switch', cooling: ['air'], inNetworkCompute: false, ...o });
export const EXP_SWITCHES: Switch[] = [
  sw({ ...base('cl-ds5000-sonic', 'Celestica DS5000 64x400G (SONiC)', 'generic', 2023.0, 42000, 3, ['Open-networking 51.2 Tb/s-class white-box switch running SONiC.', 'Hyperscalers buy white-box Tomahawk switches for half the price and run SONiC. You save capex but own the software, tuning and bug fixes.', ['About half the price of branded Ethernet', 'You are your own support team']]),
    role: 'scale-out', tech: 'eth-400', portCount: 64, portGbps: 400, capacityTbps: 25.6, rackUnits: 2, watts: 750, features: ['rocev2', 'sonic'] }),
  sw({ ...base('ar-7050x3', 'Arista 7050X3 32x100G leaf', 'arista', 2020.0, 14000, 2, ['Workhorse 100G leaf for 2020-era Ethernet back-ends and storage.', 'Cheap and ubiquitous; enough for A100 nodes with 100G NICs, a bottleneck for anything later.', ['Low cost per port', 'Out of its depth past 200G']]),
    role: 'scale-out', tech: 'eth-100', portCount: 32, portGbps: 100, capacityTbps: 3.2, rackUnits: 1, watts: 250, features: ['rocev2', 'eos'] }),
  sw({ ...base('cs-8101-32h', 'Cisco 8101-32H 32x400G', 'cisco', 2022.5, 36000, 3, ['Cisco Silicon One 400G router/switch for fabric and storage.', 'Deep buffers and strong telemetry. Cisco, Arista and NVIDIA Spectrum-X all aim at the AI Ethernet back-end.', ['Operational maturity', 'Premium price per port']]),
    role: 'scale-out', tech: 'eth-400', portCount: 32, portGbps: 400, capacityTbps: 12.8, rackUnits: 1, watts: 500, features: ['rocev2', 'silicon-one'] }),
  sw({ ...base('gen-oob-1g48', 'Management switch 48x1G (OOB)', 'generic', 2020.0, 1800, 1, ['Out-of-band management switch for BMCs and PDUs.', 'Every server and PDU has a management port. The OOB network is how you recover a hung node without touching it.', ['Tiny cost, vital reliability', 'One per rack adds up at scale']]),
    role: 'oob', tech: 'eth-100', portCount: 48, portGbps: 1, capacityTbps: 0.1, rackUnits: 1, watts: 60, features: [] }),
];

const pw = (o: Omit<PowerEquip, 'kind'>): PowerEquip => ({ kind: 'power', ...o });
export const EXP_POWER: PowerEquip[] = [
  pw({ ...base('gen-ats-1600', 'Automatic Transfer Switch (1600 A / 1 MW)', 'eaton', 2020.0, 85000, 3, ['Swaps the hall between utility and generator.', 'Without an ATS a utility outage is a hard stop. The ATS detects loss, starts the generator and transfers when voltage is stable.', ['Single point of failure unless duplicated', 'Needed for any real backup plan']]),
    powerType: 'switchgear', capacityKW: 1000, efficiency: 0.998, installMonths: 1 }),
  pw({ ...base('gen-sts-400', 'Static Transfer Switch (400 kW)', 'eaton', 2020.0, 38000, 2, ['Millisecond A/B feed transfer for dual-corded racks.', 'Lets a rack ride through a failing feed with no outage. Cheaper than full 2N, but still a single device.', ['Cheap path to A/B redundancy', 'Transfers load, does not store energy']]),
    powerType: 'switchgear', capacityKW: 400, efficiency: 0.998, installMonths: 0.5 }),
  pw({ ...base('gen-busway-800a', 'Overhead Busway (800 A, 480 V)', 'schneider', 2020.0, 48000, 2, ['Overhead busway that feeds rack taps without cabling.', 'Busway makes power reconfigurable and cuts install cost per rack, but a fault can take a whole row.', ['Fast rack adds', 'Fault domain is a full run']]),
    powerType: 'busway', capacityKW: 550, efficiency: 0.995, installMonths: 1 }),
  pw({ ...base('se-li-ion-500', 'Li-ion UPS Battery Cabinet (500 kW)', 'schneider', 2021.0, 190000, 3, ['Lithium-ion battery cabinet for UPS ride-through.', 'Li-ion lasts 10-15 years versus 3-5 for lead-acid, takes a third of the floor space, and tolerates warm rooms. It costs about 2.5x as much up front.', ['Lower total cost over 10 years', 'High upfront price and fire-safety rules']]),
    powerType: 'battery', capacityKW: 500, efficiency: 0.96, installMonths: 1 }),
  pw({ ...base('gen-genset-3000', 'Diesel Genset (3 MW, Tier 4)', 'generic', 2020.0, 780000, 6, ['3 MW diesel generator with emissions after-treatment.', 'Backs up a whole hall for days. Long lead time and strict permits; a genset that was never load-tested will not start when needed.', ['Reliable backup', 'Long lead time and emissions permits']]),
    powerType: 'genset', capacityKW: 3000, efficiency: 0.95, installMonths: 3 }),
  pw({ ...base('gen-bess-2000', 'Grid Battery (BESS, 2 MW / 4 MWh)', 'generic', 2022.0, 1100000, 6, ['Utility-scale battery for peak shaving and backup.', 'Charges when power is cheap and covers peak or outages. It cuts PPA overage and demand charges but does not replace a genset for multi-hour outages.', ['Arbitrage and demand shaving', 'Limited duration']]),
    powerType: 'battery', capacityKW: 2000, efficiency: 0.9, installMonths: 4 }),
];

const co = (o: Omit<CoolingEquip, 'kind'>): CoolingEquip => ({ kind: 'cooling', ...o });
export const EXP_COOLING: CoolingEquip[] = [
  co({ ...base('gen-crac-dx-60', 'CRAC DX unit (60 kW)', 'generic', 2020.0, 38000, 2, ['Self-contained DX air conditioner for small rooms.', 'No chilled water needed, so it is quick to deploy, but compressor power is high (poor PUE).', ['Easy install', 'Inefficient']]),
    coolingType: 'crah', capacityKW: 60, wattsPerKW: 380, serves: 'air', supplyTempC: 18, installMonths: 0.5 }),
  co({ ...base('vt-fanwall-250', 'Fan-wall air handler (250 kW)', 'vertiv', 2022.0, 110000, 3, ['EC fan-wall air handler fed by chilled water.', 'Many small fans share the load and run at partial speed, saving fan energy compared with big CRAHs.', ['Redundant by design', 'Needs a chilled-water plant']]),
    coolingType: 'crah', capacityKW: 250, wattsPerKW: 150, serves: 'air', supplyTempC: 20, installMonths: 1 }),
  co({ ...base('gen-adiabatic-1200', 'Adiabatic dry-cooler (1.2 MW)', 'generic', 2021.0, 260000, 4, ['Dry cooler with water-spray assist on hot days.', 'Free cooling most of the year; the spray uses water only during heat peaks. Warm-water DLC loops pair well with it.', ['Very low energy per kW removed', 'Water use and local availability']]),
    coolingType: 'dry-cooler', capacityKW: 1200, wattsPerKW: 70, serves: 'dlc', supplyTempC: 32, installMonths: 2 }),
];

const ss = (o: Omit<StorageSystem, 'kind'>): StorageSystem => ({ kind: 'storage', ...o });
export const EXP_STORAGE: StorageSystem[] = [
  ss({ ...base('weka-pod-nvme', 'WEKA NVMe parallel FS pod (8U)', 'weka', 2022.0, 780000, 4, ['Software-defined parallel filesystem on NVMe nodes.', 'Delivers hundreds of GB/s to GPU clients over RDMA. Software-licensed, so it runs on commodity servers.', ['Fast and flexible', 'Licence is a recurring cost']]),
    tier: 'hot-nvme', capacityPB: 0.5, readGBs: 200, writeGBs: 120, rackUnits: 8, watts: 4200 }),
  ss({ ...base('pure-flashblade-s500', 'Pure FlashBlade//S500 (warm tier)', 'generic', 2022.5, 1200000, 5, ['All-flash scale-out file/object system.', 'Holds datasets and finished checkpoints cheaper than hot NVMe, at lower bandwidth.', ['Cheap warm tier', 'Not for checkpoint bursts']]),
    tier: 'warm', capacityPB: 2, readGBs: 60, writeGBs: 25, rackUnits: 5, watts: 3500 }),
  ss({ ...base('ceph-hdd-4u', 'Ceph HDD object node (4U, 60 drives)', 'generic', 2020.0, 120000, 2, ['Dense HDD node for the object tier.', 'Cold datasets and old checkpoints belong on spinning disk. Throughput is poor but cost per PB is tiny.', ['Lowest $/PB', 'Slow rebuilds']]),
    tier: 'object', capacityPB: 1, readGBs: 6, writeGBs: 3, rackUnits: 4, watts: 900 }),
];

const mem = (o: Omit<MemoryModule, 'kind'>): MemoryModule => ({ kind: 'memory', ...o });
export const EXP_MEMORY: MemoryModule[] = [
  mem({ ...base('sam-ddr5-4800-32', 'Samsung DDR5-4800 RDIMM 32GB', 'samsung', 2022.0, 230, 1, ['Entry DDR5 DIMM for cost-sensitive hosts.', 'Enough for inference hosts that do not cache datasets.', ['Cheap', 'Low capacity']]), type: 'ddr5', capacityGB: 32, speedMTs: 4800, watts: 8 }),
  mem({ ...base('sam-ddr5-5600-128', 'Samsung DDR5-5600 RDIMM 128GB', 'samsung', 2023.5, 1400, 2, ['128GB DDR5 for memory-hungry hosts.', 'Useful for CPU offload and KV-cache spill; costs more per GB.', ['High capacity per slot', 'Higher $/GB']]), type: 'ddr5', capacityGB: 128, speedMTs: 5600, watts: 12 }),
];

const nv = (o: Omit<Storage, 'kind'>): Storage => ({ kind: 'nvme', ...o });
export const EXP_NVME: Storage[] = [
  nv({ ...base('gen-nvme-boot-960', 'Boot NVMe 960 GB (M.2)', 'generic', 2020.0, 140, 1, ['Small boot drive for the OS image.', 'Keeps the host alive when the big drives are busy with checkpoints.', ['Cheap', 'Little capacity']]), capacityTB: 0.96, readGBs: 3.5, writeGBs: 1.5, pcieGen: 4, watts: 6 }),
];
