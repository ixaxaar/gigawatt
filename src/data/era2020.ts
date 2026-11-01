import type { Cpu, Storage } from '../types';

export const ERA_CPUS: Cpu[] = [
  { id: 'amd-epyc-7742', kind: 'cpu', name: 'AMD EPYC 7742 (Rome)', vendor: 'amd', availableFrom: 2019.6, priceUSD: 6950, leadTimeMonths: 2,
    arch: 'x86', cores: 64, tdpW: 225, memChannels: 8, maxMemGB: 4096, memBWGBs: 204.8, pcieGen: 4, pcieLanes: 128,
    codex: { summary: '64-core Zen 2 server CPU and the first x86 host with PCIe Gen4, which A100 and ConnectX-6 need.',
      explain: 'Rome gave 128 PCIe Gen4 lanes per socket, so one CPU can feed GPUs, NICs and NVMe without a lane shortage. That is why DGX A100 picked AMD hosts.',
      tradeoffs: ['Gen4 lanes double the bandwidth to NICs and drives', 'Host CPU power is small next to the GPUs but still counts against rack kW'], tags: ['host', 'pcie4'] } },
  { id: 'amd-epyc-7763', kind: 'cpu', name: 'AMD EPYC 7763 (Milan)', vendor: 'amd', availableFrom: 2021.2, priceUSD: 7890, leadTimeMonths: 2,
    arch: 'x86', cores: 64, tdpW: 280, memChannels: 8, maxMemGB: 4096, memBWGBs: 204.8, pcieGen: 4, pcieLanes: 128,
    codex: { summary: 'Zen 3 refresh of Rome with higher IPC; a common host CPU for HGX A100 servers.',
      explain: 'Same socket and lanes as Rome with about 19% better per-core performance. Host CPUs matter for data loading and for the NIC and driver software path.',
      tradeoffs: ['More host performance helps data pipelines', 'Adds about 55 W per socket over Rome'], tags: ['host', 'pcie4'] } },
  { id: 'intel-xeon-8380', kind: 'cpu', name: 'Intel Xeon Platinum 8380 (Ice Lake)', vendor: 'intel', availableFrom: 2021.3, priceUSD: 8099, leadTimeMonths: 2,
    arch: 'x86', cores: 40, tdpW: 270, memChannels: 8, maxMemGB: 6144, memBWGBs: 204.8, pcieGen: 4, pcieLanes: 64,
    codex: { summary: 'Intel 40-core Ice Lake-SP with PCIe Gen4, offered in HGX A100 platforms by many OEMs.',
      explain: 'Ice Lake brought Gen4 to Intel servers, but with 64 lanes per socket against 128 on EPYC. Dense GPU and NIC trays often need two sockets to reach the same lane count.',
      tradeoffs: ['Fewer PCIe lanes per socket than EPYC', 'Strong software ecosystem and OEM availability'], tags: ['host', 'pcie4'] } },
];

export const ERA_NVME: Storage[] = [
  { id: 'sam-pm1733-3t84', kind: 'nvme', name: 'Samsung PM1733 3.84 TB (Gen4 U.2)', vendor: 'samsung', availableFrom: 2020, priceUSD: 780, leadTimeMonths: 1,
    capacityTB: 3.84, readGBs: 7, writeGBs: 3.8, pcieGen: 4, watts: 17,
    codex: { summary: 'Enterprise PCIe Gen4 U.2 SSD, about 7 GB/s sequential read.',
      explain: 'Training jobs read datasets and write checkpoints. Eight local drives give a tray tens of GB/s, enough to stage data and absorb checkpoint bursts without stalling the GPUs.',
      tradeoffs: ['Each drive uses 4 PCIe lanes from the host budget', 'Local NVMe is fast but not shared; the cluster also needs network storage'], tags: ['storage', 'checkpoint'] } },
  { id: 'sam-pm1733-7t68', kind: 'nvme', name: 'Samsung PM1733 7.68 TB (Gen4 U.2)', vendor: 'samsung', availableFrom: 2020, priceUSD: 1450, leadTimeMonths: 1,
    capacityTB: 7.68, readGBs: 7, writeGBs: 3.8, pcieGen: 4, watts: 17,
    codex: { summary: 'Double-capacity Gen4 U.2 SSD with the same throughput as the 3.84 TB model.',
      explain: 'Capacity per lane doubles at the same bandwidth. Use it when datasets, not speed, are the limit.',
      tradeoffs: ['Better capacity per PCIe lane', 'Higher cost per drive'], tags: ['storage'] } },
];

// ---------------- extra 2019-2021 era parts (cloned from catalog entries, real-world specs) ----------------
import { NVIDIA_ACCELERATORS } from './nvidia';
import { NICS } from './network';
import { SWITCHES } from './network-switches';
import { MEMORY, STORAGE_SYSTEMS } from './facility-chassis';
import type { Accelerator, MemoryModule, Nic, Switch, StorageSystem } from '../types';

const must = <T extends { id: string }>(arr: T[], id: string): T => { const x = arr.find(i => i.id === id); if (!x) throw new Error('era2020: missing base ' + id); return x; };
const A100 = must(NVIDIA_ACCELERATORS, 'nv-a100-80-sxm') as Accelerator;
const V100 = must(NVIDIA_ACCELERATORS, 'nv-v100-sxm2') as Accelerator;

export const ERA_ACCELERATORS: Accelerator[] = [
  { ...A100, id: 'nv-a100-40-sxm', name: 'A100 40GB SXM4', availableFrom: 2020.4, priceUSD: 12500, memGB: 40, memBWTBs: 1.56, memType: 'hbm2',
    codex: { summary: 'The launch A100: 40 GB HBM2 at 1.56 TB/s, same compute as the 80 GB part.',
      explain: 'Memory capacity, not FLOPS, is what the 80 GB refresh fixed: bigger models and KV caches fit per GPU, so fewer GPUs per replica.',
      tradeoffs: ['Cheaper per GPU but half the model fits per card', 'Same NVLink3 and tensor cores as the 80 GB model'], tags: ['ampere', 'hbm'] } },
  { ...V100, id: 'nv-v100-32-sxm2', name: 'Tesla V100 SXM2 32GB', availableFrom: 2018.2, eolAfter: 2022.5, priceUSD: 9500, memGB: 32,
    codex: { summary: 'Volta with 32 GB HBM2 - the last pre-Ampere workhorse, now discounted.',
      explain: 'Still useful for inference and small training, but no BF16/TF32 tensor cores, so modern training recipes run far slower than on A100.',
      tradeoffs: ['Cheap, but lacks BF16/TF32 - poor for new LLM training', 'NVLink2: 300 GB/s per GPU vs 600 on A100'], tags: ['volta', 'legacy'] } },
  { ...A100, id: 'nv-a100-80-pcie', name: 'A100 80GB PCIe', availableFrom: 2021.45, formFactor: 'pcie', priceUSD: 14000, tdpW: 300, scaleUp: 'pcie', scaleUpGBs: 64,
    maxScaleUpDomain: 8, pcieGen: 4, pcieLanes: 16,
    codex: { summary: 'Same Ampere die in a 300 W PCIe card: no NVSwitch fabric, GPUs talk over PCIe.',
      explain: 'PCIe cards drop into ordinary servers and are cheap to deploy, but multi-GPU training is bottlenecked by PCIe (64 GB/s vs 600 GB/s NVLink). Best for inference of models that fit one GPU.',
      tradeoffs: ['Easy to deploy, lower power per card', 'Poor for tensor/expert-parallel training across GPUs'], tags: ['pcie', 'inference'] } },
];

const CX6 = must(NICS, 'nv-connectx6-dx') as Nic;
export const ERA_NICS: Nic[] = [
  { ...CX6, id: 'nv-connectx6-hdr', name: 'NVIDIA ConnectX-6 VPI HDR 200G', availableFrom: 2019.9, tech: 'ib-hdr', gbps: 200, ports: 1, watts: 20,
    features: ['rdma', 'gpudirect', 'sharp'],
    codex: { summary: 'The InfiniBand HDR (200 Gb/s) adapter that connected 2020-era A100 supercomputers.',
      explain: 'One CX-6 per GPU (rail-per-GPU) gives each A100 its own 200 Gb/s path; RDMA and GPUDirect let NICs move GPU memory without the CPU. InfiniBand gave training clusters lossless, low-latency collectives.',
      tradeoffs: ['InfiniBand is purpose-built for HPC/AI but vendor-locked to NVIDIA', 'One NIC per GPU doubles network cost versus one per pair'], tags: ['infiniband', 'rdma', 'hdr'] } },
];

const QM = must(SWITCHES, 'nv-sn3700c') as Switch;
export const ERA_SWITCHES: Switch[] = [
  { ...QM, id: 'nv-qm8700', name: 'NVIDIA Quantum QM8700 HDR (40x200G)', role: 'scale-out', tech: 'ib-hdr', availableFrom: 2018.9, priceUSD: 24000, portCount: 40, portGbps: 200,
    capacityTbps: 16, rackUnits: 1, watts: 253, inNetworkCompute: true, features: ['sharp', 'adaptive-routing'],
    codex: { summary: '40-port 200 Gb/s InfiniBand switch: the leaf/spine building block of 2020-2021 AI clusters.',
      explain: 'A radix-40 switch builds a non-blocking fat-tree: 20 ports down to nodes, 20 up to spines. SHARP offloads all-reduce math into the switch, cutting collective time.',
      tradeoffs: ['Radix 40 means more switch tiers than NDR radix 64', 'SHARP helps training but needs matching NICs and software'], tags: ['infiniband', 'hdr', 'sharp'] } },
];

const D32 = must(MEMORY, 'sam-ddr4-3200-32') as MemoryModule;
export const ERA_MEMORY: MemoryModule[] = [
  { ...D32, id: 'sam-ddr4-3200-64', name: 'Samsung DDR4-3200 RDIMM 64GB', capacityGB: 64, priceUSD: 340, watts: 6 },
  { ...D32, id: 'sam-ddr4-3200-16', name: 'Samsung DDR4-3200 RDIMM 16GB', capacityGB: 16, priceUSD: 90, watts: 5 },
];

const JB = STORAGE_SYSTEMS[0] as StorageSystem;
export const ERA_STORAGE: StorageSystem[] = [
  { ...JB, id: 'ddn-ai400x', name: 'DDN A3I AI400X (2U NVMe parallel FS)', vendor: 'ddn', availableFrom: 2020.0, priceUSD: 160000, tier: 'hot-nvme', capacityPB: 0.18, readGBs: 48, writeGBs: 30, rackUnits: 2, watts: 1400,
    codex: { summary: 'Turnkey 2U parallel-filesystem appliance (Lustre) built for GPU clusters.',
      explain: 'Training reads datasets and writes checkpoints in bursts; a shared fast filesystem keeps hundreds of GPUs fed. Appliances scale by adding units, each adding capacity and bandwidth.',
      tradeoffs: ['Buy storage bandwidth in proportion to GPU count', 'Checkpoint bursts, not average load, size the system'], tags: ['storage', 'lustre', 'checkpoint'] } },
];

export const ERA_CPUS_EXTRA: Cpu[] = [
  { id: 'amd-epyc-7542', kind: 'cpu', name: 'AMD EPYC 7542 (Rome, 32c)', vendor: 'amd', availableFrom: 2019.6, priceUSD: 3400, leadTimeMonths: 2, arch: 'x86', cores: 32, tdpW: 225, memChannels: 8, maxMemGB: 4096, memBWGBs: 204.8, pcieGen: 4, pcieLanes: 128,
    codex: { summary: 'Half the cores of the 7742 at half the price, still with all 128 Gen4 lanes.',
      explain: 'GPU servers rarely need huge CPUs: the host feeds data and drives NICs. Fewer cores cuts cost and power while keeping the PCIe lanes that matter.',
      tradeoffs: ['Cheaper hosts leave more budget for GPUs', 'Too few cores can starve data loading/preprocessing'], tags: ['host', 'pcie4'] } },
  { id: 'intel-xeon-8280', kind: 'cpu', name: 'Intel Xeon Platinum 8280 (Cascade Lake)', vendor: 'intel', availableFrom: 2019.3, eolAfter: 2023, priceUSD: 10009, leadTimeMonths: 2, arch: 'x86', cores: 28, tdpW: 205, memChannels: 6, maxMemGB: 4608, memBWGBs: 140.8, pcieGen: 3, pcieLanes: 48,
    codex: { summary: 'Last-gen Intel host: PCIe Gen3 only, so it caps a Gen4 A100/CX-6 at half speed.',
      explain: 'A Gen4 device in a Gen3 slot negotiates down to Gen3 bandwidth. This is a classic trap: the right GPU in the wrong host wastes the NIC.',
      tradeoffs: ['Mature and widely stocked', 'Gen3 halves host bandwidth to Gen4 NICs/NVMe'], tags: ['host', 'pcie3'] } },
];

// ---------------- Blackwell rack-scale parts + 19" liquid rack ----------------
import { RACKS } from './facility-chassis';
import type { RackSpec } from '../types';
const B200 = must(NVIDIA_ACCELERATORS, 'nv-b200-sxm') as Accelerator;
export const ERA_BLACKWELL: Accelerator[] = [
  { ...B200, id: 'nv-gb200', name: 'GB200 Blackwell GPU (NVL72 superchip)', formFactor: 'superchip', availableFrom: 2024.75, eolAfter: 2026.5, priceUSD: 36000, tdpW: 1200, memGB: 186, memBWTBs: 8, scaleUpGBs: 1800, maxScaleUpDomain: 72, cooling: ['dlc'],
    codex: { summary: 'Blackwell GPU packaged two-per-Grace-CPU on the GB200 superchip, built to live in a 72-GPU NVLink domain.',
      explain: 'In NVL72, 72 of these GPUs are wired through NVLink-5 switch trays so all 72 act as one memory-coherent accelerator. Its ~1200 W per GPU means the rack draws 120+ kW and must be liquid cooled.',
      tradeoffs: ['72-GPU scale-up domain is ideal for MoE and giant-model inference', 'Whole-rack failure domain and 120+ kW density demand liquid cooling and heavy power'], tags: ['blackwell', 'nvl72', 'nvlink5', 'dlc'] } },
  { ...B200, id: 'nv-gb300', name: 'GB300 Blackwell Ultra GPU (NVL72 superchip)', formFactor: 'superchip', availableFrom: 2025.7, priceUSD: 42000, tdpW: 1400, memGB: 279, memBWTBs: 8, scaleUpGBs: 1800, maxScaleUpDomain: 72, cooling: ['dlc'],
    codex: { summary: 'Blackwell Ultra: same NVL72 rack, 50% more HBM3e (288 GB) per GPU.',
      explain: 'Bigger HBM stacks mean longer contexts and larger batches per GPU. Reasoning models with huge KV caches are the target.',
      tradeoffs: ['More memory per GPU raises tokens/s on KV-bound inference', 'Higher power per GPU pushes cooling and power limits further'], tags: ['blackwell', 'nvl72', 'hbm3e'] } },
];
const HD = RACKS.find(r => r.id === 'gen-rack-19-48u-hd') as RackSpec;
export const ERA_RACKS: RackSpec[] = [
  { ...HD, id: 'gen-rack-19-48u-dlc', name: 'Generic 19" 48U liquid-ready rack (80 kW, manifolds)', availableFrom: 2022.5, priceUSD: 18000, maxKW: 80, maxWeightKg: 1800, cooling: ['dlc', 'rdhx'],
    codex: { summary: '19-inch cabinet with rack coolant manifolds and quick-disconnects for direct-to-chip liquid cooling.',
      explain: 'Direct liquid cooling moves heat with water, not air, enabling 60-80 kW per rack. Manifolds run vertically at the back; each server taps in via blind-mate quick-disconnects.',
      tradeoffs: ['Enables 3-4x air-cooled rack density', 'Needs a CDU and facility water loop; leaks become an operational risk'], tags: ['dlc', 'manifold', 'density'] } },
];
