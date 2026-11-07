// Launch calendar: the keynotes where new hardware is announced (GTC, Computex, OCP, Advancing AI ...).
// An announcement does three things in the game: a keynote card explains the technology and what it changes,
// the parts become PRE-ORDERABLE (queued behind the hyperscalers, at a launch premium), and the codex learns about them.
// Parts ship at their catalog `availableFrom`; pre-orders open at the keynote, but never earlier than 12 months before shipping.
import type { CatalogItem } from '../types';
import { TEMPLATES } from './templates';

export interface Launch {
  id: string;
  /** Months since Jan 2020 (0 = Jan 2020). */
  month: number;
  venue: string;
  title: string;
  /** One line that fits a toast. */
  headline: string;
  /** What is technically new, in plain words. */
  tech: string[];
  /** What it changes for the player. */
  impact: string[];
  /** The one thing to remember. */
  takeaway: string;
  /** Catalog ids that become pre-orderable (empty = roadmap/tech briefing only). */
  items: string[];
}

const m = (year: number, month1: number) => (year - 2020) * 12 + (month1 - 1);

export const LAUNCHES: Launch[] = [
  {
    id: 'gtc-2021-grace', month: m(2021, 4), venue: 'GTC Spring 2021', title: 'NVIDIA unveils Grace, an Arm CPU built for GPUs',
    headline: 'Grace CPU + NVLink-C2C announced — the CPU becomes a GPU companion, not a bottleneck.',
    tech: ['Grace is a 72-core Arm CPU wired to the GPU over NVLink-C2C at 900 GB/s — about 7× PCIe Gen5.', 'CPU and GPU share one memory space, so a GPU can use CPU memory as a slow extension of its own HBM.', 'BlueField DPUs move networking, storage and security off the host CPU.'],
    impact: ['Later Grace-based superchips (GH200, GB200) need fewer PCIe lanes and skip x86 hosts altogether.', 'Nothing to buy for years — this is a roadmap keynote. Note the date: Grace ships in 2024.'],
    takeaway: 'The fastest link in a server is the one between CPU and GPU — whoever shortens it wins on memory-bound work.',
    items: ['nv-grace', 'nv-bluefield3'],
  },
  {
    id: 'gtc-2022-hopper', month: m(2022, 3), venue: 'GTC Spring 2022', title: 'Hopper H100: the Transformer Engine',
    headline: 'H100 announced — FP8 Transformer Engine, NVLink 4, HBM3. Pre-orders open; shipping in autumn.',
    tech: ['FP8 tensor math doubles throughput on transformer layers versus FP16, with the hardware picking the precision per layer.', 'HBM3 lifts memory bandwidth to ~3.35 TB/s; NVLink 4 gives 900 GB/s between GPUs. NVSwitch gen3 builds 256-GPU NVLink domains.', 'Power goes up with it: 700 W per SXM GPU, so an 8-GPU node is ~10 kW.'],
    impact: ['Roughly 2–3× an A100 on LLM training; contracts that were out of reach become serviceable.', 'Four H100 nodes per rack is ~40 kW: the edge of what air cooling can remove. Plan rear-door heat exchangers or liquid early.', 'Allocation is rationed: pre-ordering is how you get in the queue before the rush.'],
    takeaway: 'A new GPU generation is a power and cooling project first and a chip purchase second.',
    items: ['nv-h100-sxm', 'nv-h100-pcie', 'nv-connectx7', 'nv-nvswitch3'],
  },
  {
    id: 'computex-2023-gh200', month: m(2023, 5), venue: 'Computex 2023', title: 'Grace Hopper in production, Spectrum-X, and the MGX modular rack',
    headline: 'GH200 superchip and Spectrum-X Ethernet announced; MGX makes servers modular.',
    tech: ['GH200 pairs a Grace CPU with an H100 over NVLink-C2C: 576 GB of coherent memory per superchip.', 'Spectrum-X is Ethernet tuned for AI: adaptive routing and congestion control that keeps big all-reduce traffic from stalling.', 'MGX is a modular server spec: one chassis, many CPU/GPU/DPU combinations.'],
    impact: ['Huge-memory inference (large KV caches, big recommenders) gets cheaper per token on GH200.', 'You now have a real alternative to InfiniBand for the scale-out fabric: Ethernet that behaves.'],
    takeaway: 'Scale-out networking is a design choice: InfiniBand for lowest latency, tuned Ethernet for cost and openness.',
    items: ['nv-gh200', 'nv-sn5600'],
  },
  {
    id: 'amd-2023-mi300x', month: m(2023, 6), venue: 'AMD Data Center & AI Premiere', title: 'AMD Instinct MI300X: 192 GB on one accelerator',
    headline: 'MI300X announced with 192 GB of HBM3 — the memory-capacity alternative to H100.',
    tech: ['Chiplet design: eight GPU dies and four I/O dies stacked on one package with 192 GB HBM3 at 5.3 TB/s.', 'ROCm is AMD’s CUDA equivalent. Software maturity is the real question, not the silicon.'],
    impact: ['A 70B-parameter model fits on one MI300X; inference needs fewer GPUs per replica and tokens/s per dollar improves.', 'Software maturity is lower than CUDA: expect more tuning and lower utilization at first, at a lower price.'],
    takeaway: 'Memory capacity and bandwidth, not FLOPS, decide inference economics.',
    items: ['amd-mi300x'],
  },
  {
    id: 'sc-2023-h200', month: m(2023, 11), venue: 'SC23', title: 'H200: the same compute, far more memory',
    headline: 'H200 announced — 141 GB of HBM3e, 4.8 TB/s. Same Hopper silicon, inference up to ~1.9×.',
    tech: ['HBM3e is the next memory generation: 76% more capacity and 43% more bandwidth than H100 at the same 700 W.', 'Decode (generating tokens) reads every weight for every token, so it scales with memory bandwidth, not with FLOPS.'],
    impact: ['Drops into H100 HGX baseboards: same power, same cooling, much better for inference contracts.', 'Existing H100 racks do not upgrade in place — the GPUs are soldered to the baseboard.'],
    takeaway: 'When a workload is memory-bound, faster memory is worth more than faster math.',
    items: ['nv-h200-sxm'],
  },
  {
    id: 'gtc-2024-blackwell', month: m(2024, 3), venue: 'GTC 2024', title: 'Blackwell: GB200 NVL72 and NVLink 5',
    headline: 'Blackwell announced — B200, GB200 NVL72 (72 GPUs as one), NVLink 5, 120 kW racks.',
    tech: ['Two reticle-sized dies per GPU, FP4 support, and NVLink 5 at 1.8 TB/s per GPU.', 'GB200 NVL72 links 72 GPUs and 36 Grace CPUs in one liquid-cooled rack through NVLink switch trays: one 13.5 TB memory domain.', 'A rack draws ~120 kW — direct-to-chip liquid cooling is mandatory, and the floor needs a CDU loop.', 'Quantum-X800 InfiniBand and Spectrum-X800 Ethernet move the scale-out fabric to 800 Gb/s per port.'],
    impact: ['Mixture-of-experts and trillion-parameter inference become practical because all-to-all traffic stays inside the NVLink domain.', 'Your hall needs ~120 kW per rack and CDUs. Air-cooled halls cannot host this at all.', 'These racks sell out before shipping: pre-order to join the queue, or wait and pay the allocation price.'],
    takeaway: 'At rack scale the product is not a GPU, it is a liquid-cooled 120 kW machine that you have to build a hall around.',
    items: ['nv-b200-sxm', 'nv-gb200', 'nv-nvlink-switch-tray5', 'nv-qmx8000', 'nv-connectx8'],
  },
  {
    id: 'cerebras-2024-cs3', month: m(2024, 3), venue: 'Cerebras CS-3', title: 'Wafer-scale: the whole wafer is the chip',
    headline: 'Cerebras CS-3 (WSE-3) — 900,000 cores on one wafer, no GPU network needed inside the chip.',
    tech: ['Instead of cutting a wafer into hundreds of chips, WSE-3 keeps it whole: 44 GB of on-chip SRAM at ~21 PB/s.', 'On-chip SRAM is orders of magnitude faster than HBM, so small-batch inference is extremely quick; capacity is the limit.'],
    impact: ['A different architecture for latency-critical inference, not a drop-in GPU replacement.', 'Delivered as a turnkey system: its own power, cooling and software stack.'],
    takeaway: 'Specialised silicon can win on one axis (latency) while losing on flexibility.',
    items: ['cb-wse-3'],
  },
  {
    id: 'computex-2024-roadmap', month: m(2024, 6), venue: 'Computex 2024', title: 'The one-year rhythm: MI325X, Gaudi 3, Xeon 6, and the Rubin roadmap',
    headline: 'Vendors move to yearly cadence. AMD MI325X/MI350/MI400, Intel Gaudi 3, and NVIDIA Rubin revealed.',
    tech: ['NVIDIA, AMD and Intel all commit to annual accelerator generations instead of two-year cycles.', 'MI325X raises HBM3e to 256 GB; Gaudi 3 uses standard Ethernet scale-out; Xeon 6 brings 128 performance cores.'],
    impact: ['Hardware you buy depreciates faster: a part that is top of the line today is a generation behind in 12 months.', 'Residual value drops faster, so sell or reassign older racks before the next generation lands.'],
    takeaway: 'Under a yearly cadence, resale timing is part of the business model.',
    items: ['amd-mi325x', 'int-gaudi-3', 'intel-xeon-6980p'],
  },
  {
    id: 'amd-2024-turin', month: m(2024, 10), venue: 'AMD Advancing AI 2024', title: 'MI325X ships, EPYC Turin and Pensando Salina',
    headline: 'AMD launches EPYC Turin hosts and Pensando DPUs alongside MI325X.',
    tech: ['EPYC 9005 “Turin” adds Zen 5 cores with up to 192 cores per socket for GPU hosts.', 'Pensando Salina is a 400G DPU that offloads networking from the host CPU.'],
    impact: ['Better GPU host CPUs mean fewer sockets per tray for the same job.', 'DPUs matter when many tenants share a cluster.'],
    takeaway: 'The CPU and DPU around the GPUs decide how much of the GPU you can actually use.',
    items: ['amd-epyc-turin', 'amd-salina'],
  },
  {
    id: 'gtc-2025-ultra', month: m(2025, 3), venue: 'GTC 2025', title: 'Blackwell Ultra now, Vera Rubin next',
    headline: 'GB300/B300 Blackwell Ultra announced; Vera Rubin NVL144 and Rubin Ultra roadmapped.',
    tech: ['Blackwell Ultra raises HBM3e to 288 GB per GPU and adds ~50% more FP4 throughput within the same rack format.', 'Vera Rubin NVL144 brings HBM4, NVLink 6, and the Vera CPU. Rubin Ultra scales to 576 GPUs in a rack-scale domain.', 'Co-packaged optics put the laser inside the switch package to cut network power.'],
    impact: ['GB300 drops into GB200 racks: same 120 kW class, so the hall you built for GB200 keeps working.', 'Rubin racks will draw considerably more power; start planning bigger feeds and CDUs now.'],
    takeaway: 'Plan the building for two generations ahead: racks change yearly, power and cooling plants last decades.',
    items: ['nv-b300-sxm', 'nv-gb300'],
  },
  {
    id: 'computex-2025-hvdc', month: m(2025, 5), venue: 'Computex 2025', title: 'NVLink Fusion and 800 V DC power',
    headline: 'NVLink Fusion opens NVIDIA’s fabric to other silicon; 800 V DC distribution proposed for 1 MW racks.',
    tech: ['NVLink Fusion lets third-party CPUs and custom accelerators join an NVLink domain.', 'At 100+ kW per rack, copper busbars carrying 54 V waste space and power; 800 V DC cuts current by ~15×.'],
    impact: ['Not purchasable yet: this explains why future halls look different: fewer, thicker power paths.', 'RTX PRO Blackwell servers give you a cheaper air-cooled inference option today.'],
    takeaway: 'Power distribution, not chips, is what stops racks reaching 1 MW.',
    items: ['nv-rtx-pro-6000'],
  },
  {
    id: 'amd-2025-helios', month: m(2025, 6), venue: 'AMD Advancing AI 2025', title: 'MI350 series ships; MI400 “Helios” rack announced',
    headline: 'MI355X launched; MI400X/Helios rack-scale system and UALink scale-up announced for 2026.',
    tech: ['MI355X adds FP4/FP6 support and 288 GB HBM3e on a 3 nm compute die; liquid-cooled variants draw ~1.4 kW.', 'Helios is AMD’s rack-scale answer to NVL72 using UALink for GPU-to-GPU traffic, an open alternative to NVLink.', 'UALink and Ultra Ethernet are open standards for scale-up and scale-out.'],
    impact: ['AMD becomes a credible rack-scale vendor in 2026: more supply and more price pressure.', 'Mixed-vendor halls need separate software stacks and cluster domains: you cannot join MI355X and B200 into one NVLink domain.'],
    takeaway: 'Open standards (UALink, Ultra Ethernet) are how a second supplier becomes viable.',
    items: ['amd-mi355x', 'amd-mi400x', 'amd-pollara-400'],
  },
  {
    id: 'gtc-dc-2025-rubin', month: m(2025, 10), venue: 'GTC DC / OCP Global Summit 2025', title: 'Vera Rubin: orders open',
    headline: 'Vera Rubin NVL144, Vera CPU and NVLink 6 switch trays enter the order book for 2026.',
    tech: ['Vera Rubin NVL144: HBM4 memory, NVLink 6 at 3.6 TB/s per GPU, and a rack that draws well beyond a GB300.', 'BlueField-4 DPUs and ConnectX-9 1.6 Tb/s NICs arrive with it; the whole stack moves up a speed grade.', 'OCP contributes the open rack, busbar and liquid-cooling specs that these racks are built on.'],
    impact: ['Expect longer queues than any prior generation: hyperscalers have already reserved the first quarters.', 'GB200/GB300 prices soften as buyers wait for Rubin; sell older racks while residual value holds.'],
    takeaway: 'Every generation turns the previous one into a discounted workhorse, if you can keep it busy.',
    items: ['nv-rubin-vr200', 'nv-vera', 'nv-nvlink-switch-tray6', 'nv-bluefield4', 'nv-connectx9'],
  },
  {
    id: 'gtc-2026-ultra', month: m(2026, 3), venue: 'GTC 2026', title: 'Rubin Ultra, 1.6 T Ethernet and 100 T switches',
    headline: 'Rubin Ultra NVL576, Spectrum-X800 1.6 T Ethernet and Tomahawk 6 switching arrive on the roadmap.',
    tech: ['Rubin Ultra moves to 576 GPUs in one NVLink domain with HBM4e.', 'Spectrum-X800 and Tomahawk 6 are 102.4 Tb/s switch silicon: half the switches for the same fabric size.', 'UALink 1.0 switches open the scale-up market to non-NVIDIA accelerators.'],
    impact: ['Fewer, bigger switches reduce cabling and power per GPU at scale.', 'The scale-up domain size decides which models you can serve efficiently.'],
    takeaway: 'Switch radix is network economics: bigger switches mean fewer tiers and fewer hops.',
    items: ['nv-rubin-ultra', 'nv-sn6800', 'gen-ualink-sw'],
  },
];

const BASE_YEAR = 2020;
/** First month an item can be bought at the normal price: when its availableFrom year arrives. */
export const shipMonthOf = (item: Pick<CatalogItem, 'availableFrom'>): number => Math.ceil((item.availableFrom - BASE_YEAR) * 12 - 1e-6);

const FIRST_ANNOUNCE = new Map<string, number>();
for (const l of LAUNCHES) for (const id of l.items) if (!FIRST_ANNOUNCE.has(id) || l.month < FIRST_ANNOUNCE.get(id)!) FIRST_ANNOUNCE.set(id, l.month);

// A rack template inherits the announcement of its headline part: the chassis, rack frame and boards ship with it.
for (const t of TEMPLATES) {
  const ids = [t.rack.rackId, t.tray.chassisId, ...t.tray.parts.map((p) => p.itemId)];
  const first = Math.min(...ids.map((id) => FIRST_ANNOUNCE.get(id) ?? Infinity));
  if (first === Infinity) continue;
  for (const id of ids) if (!FIRST_ANNOUNCE.has(id)) FIRST_ANNOUNCE.set(id, first);
}

/** The month pre-orders open for an item, or undefined if it was never announced. */
export const preorderOpens = (item: Pick<CatalogItem, 'id' | 'availableFrom'>): number | undefined => {
  const a = FIRST_ANNOUNCE.get(item.id);
  return a === undefined ? undefined : Math.max(a, shipMonthOf(item) - 12);
};

export const launchAt = (month: number): Launch[] => LAUNCHES.filter((l) => l.month === month);
