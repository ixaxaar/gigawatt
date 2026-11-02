import type { SystemTemplate, TemplateTier, Vendor, RackItem, CoolingClass, SlotKind, Codex } from '../types';

type Parts = { slot: SlotKind; itemId: string; count: number }[];
interface Platform {
  key: string; label: string; from: number; eol?: number; chassisId: string; parts: Parts;
  rackId: string; trays: number; extras: RackItem[]; cooling: CoolingClass;
  story: string; variants: Variant[];
}
interface Variant { tier: TemplateTier; by: Vendor; label: string; premium: number; lead: number; audience: string; pitch: string; tradeoff: string }

const DIY = (by: Vendor = 'generic'): Variant => ({ tier: 'diy', by, label: 'Build it yourself', premium: 0, lead: 1, audience: 'Teams with integration staff chasing lowest capex.',
  pitch: 'Buy the baseboard and every part separately and assemble, cable and burn-in yourself.', tradeoff: 'Cheapest, but you own integration, firmware validation and debugging; parts arrive on different lead times.' });
const OEM = (by: Vendor, premium = 0.07): Variant => ({ tier: 'oem', by, label: `${by[0].toUpperCase() + by.slice(1)} integrated rack`, premium, lead: 0.85, audience: 'Most neoclouds: a validated rack from an OEM with a support contract.',
  pitch: 'OEM builds, cables and burn-tests the rack at the factory (L11/L12) and ships it ready to roll in.', tradeoff: 'A modest premium buys faster install and one vendor to call; less customisation than DIY.' });
const TURNKEY = (by: Vendor, label: string, premium = 0.18): Variant => ({ tier: 'turnkey', by, label, premium, lead: 0.7, audience: 'First-time operators and anyone who values uptime and support over capex.',
  pitch: 'Vendor-engineered reference system with software stack and premium support; fastest to production.', tradeoff: 'Highest capex; you pay for validation, support SLAs and allocation priority.' });

const hdr = (accel: string, cpu: string, dimm: string, dn: number, nic: string, nn: number, nvme: string, psu: number, extra: Parts = []): Parts => [
  { slot: 'accelerator', itemId: accel, count: 8 }, { slot: 'cpu', itemId: cpu, count: 2 }, { slot: 'dimm', itemId: dimm, count: dn },
  { slot: 'nic', itemId: nic, count: nn }, { slot: 'nvme', itemId: nvme, count: 2 }, { slot: 'psu', itemId: 'vt-geist-5kw', count: psu }, ...extra];
const sw = (switchId: string, count = 1): RackItem => ({ type: 'switch', switchId, count });

const PLATFORMS: Platform[] = [
  { key: 'hgx-a100', label: 'HGX A100 8-GPU', from: 2020.85, eol: 2024.5, chassisId: 'nv-hgx-a100-8gy', rackId: 'gen-rack-19-48u-hd', trays: 3, cooling: 'air',
    parts: hdr('nv-a100-80-sxm', 'amd-epyc-7742', 'sam-ddr4-3200-64', 16, 'nv-connectx6-hdr', 4, 'sam-pm1733-3t84', 4), extras: [sw('nv-qm8700')],
    story: 'The Ampere generation: 8 A100s in one NVLink3 box, scaled out over 200G InfiniBand. DGX A100 is NVIDIA\'s own build of this.',
    variants: [DIY(), OEM('supermicro'), OEM('dell', 0.08), TURNKEY('nvidia', 'NVIDIA DGX A100 (rack)')] },
  { key: 'hgx-h100', label: 'HGX H100 8-GPU', from: 2022.9, eol: 2025.5, chassisId: 'nv-hgx-h100-8gy', rackId: 'gen-rack-19-48u-hd', trays: 2, cooling: 'air',
    parts: hdr('nv-h100-sxm', 'amd-epyc-genoa', 'sam-ddr5-5600-64', 16, 'nv-connectx7', 4, 'sam-pm9a3-3t84', 4), extras: [sw('nv-qm9700')],
    story: 'Hopper: FP8 Transformer Engine and NVLink4. 10 kW per server is the edge of air cooling, so only two fit per air rack.',
    variants: [DIY(), OEM('supermicro'), OEM('hpe', 0.09), TURNKEY('nvidia', 'NVIDIA DGX H100 (rack)')] },
  { key: 'hgx-h200', label: 'HGX H200 8-GPU', from: 2024.5, eol: 2026, chassisId: 'nv-hgx-h100-8gy', rackId: 'gen-rack-19-48u-hd', trays: 2, cooling: 'air',
    parts: hdr('nv-h200-sxm', 'amd-epyc-genoa', 'sam-ddr5-5600-64', 16, 'nv-connectx7', 4, 'sam-pm9a3-3t84', 4), extras: [sw('nv-qm9700')],
    story: 'Same Hopper compute, 141 GB of faster HBM3e: a drop-in for inference, where memory bandwidth and capacity set tokens/s.',
    variants: [DIY(), OEM('supermicro'), TURNKEY('nvidia', 'NVIDIA DGX H200 (rack)')] },
  { key: 'hgx-b200', label: 'HGX B200 8-GPU (liquid)', from: 2025, chassisId: 'nv-hgx-b200-8gy', rackId: 'gen-rack-19-48u-dlc', trays: 4, cooling: 'dlc',
    parts: [...hdr('nv-b200-sxm', 'amd-epyc-turin', 'skh-ddr5-6400-96', 16, 'nv-connectx8', 4, 'mic-9550-15t36', 6), { slot: 'coldplate', itemId: 'ct-coldplate-80', count: 8 }], extras: [sw('nv-qmx8000')],
    story: 'Blackwell in the HGX form factor: 15 kW per server needs direct liquid cooling, so you need a CDU and liquid-ready racks.',
    variants: [DIY(), OEM('supermicro'), OEM('dell', 0.09), TURNKEY('nvidia', 'NVIDIA DGX B200 (rack)')] },
  { key: 'hgx-h200-rdhx', label: 'HGX H200 8-GPU (rear-door cooled)', from: 2024.5, eol: 2026, chassisId: 'nv-hgx-h100-8gy', rackId: 'gen-rack-19-48u-hd', trays: 4, cooling: 'rdhx',
    parts: hdr('nv-h200-sxm', 'amd-epyc-genoa', 'sam-ddr5-5600-64', 16, 'nv-connectx7', 4, 'sam-pm9a3-3t84', 4), extras: [sw('nv-qm9700')],
    story: 'The same air-cooled Hopper servers, but a chilled-water rear-door heat exchanger on the rack lets you double the density to four servers (~40 kW) without touching the servers.',
    variants: [OEM('supermicro'), OEM('dell', 0.08)] },
  { key: 'mi300x-rdhx', label: 'AMD Instinct MI300X 8-GPU (rear-door cooled)', from: 2023.9, eol: 2026, chassisId: 'sm-ubb-oam8-mi300x', rackId: 'gen-rack-19-48u-hd', trays: 4, cooling: 'rdhx',
    parts: hdr('amd-mi300x', 'amd-epyc-genoa', 'sam-ddr5-5600-64', 12, 'nv-connectx7', 4, 'sam-pm9a3-3t84', 4), extras: [sw('cs-n9364e')],
    story: 'MI300X servers in rear-door-cooled racks: a pragmatic retrofit path for existing air halls that need more kW per rack.',
    variants: [OEM('supermicro'), DIY('gigabyte')] },
  { key: 'gb200', label: 'GB200 NVL72 rack-scale', from: 2024.9, eol: 2026.5, chassisId: 'nv-gb200-nvl72-ct', rackId: 'fox-nvl72-mgx', trays: 18, cooling: 'dlc',
    parts: [{ slot: 'accelerator', itemId: 'nv-gb200', count: 2 }, { slot: 'nic', itemId: 'nv-connectx8', count: 4 }, { slot: 'nvme', itemId: 'sam-pm1743-15t36', count: 2 }],
    extras: [sw('nv-nvlink-switch-tray5', 9)],
    story: '72 Blackwell GPUs in ONE NVLink domain: one 120+ kW liquid-cooled rack acts as a single giant GPU. You cannot DIY this; it ships integrated.',
    variants: [OEM('foxconn', 0.06), OEM('dell', 0.09), TURNKEY('nvidia', 'NVIDIA GB200 NVL72 reference rack', 0.14)] },
  { key: 'gb300', label: 'GB300 NVL72 rack-scale', from: 2025.7, chassisId: 'nv-gb200-nvl72-ct', rackId: 'fox-nvl72-mgx', trays: 18, cooling: 'dlc',
    parts: [{ slot: 'accelerator', itemId: 'nv-gb300', count: 2 }, { slot: 'nic', itemId: 'nv-connectx8', count: 4 }, { slot: 'nvme', itemId: 'sam-pm1743-15t36', count: 2 }],
    extras: [sw('nv-nvlink-switch-tray5', 9)],
    story: 'Blackwell Ultra NVL72: 288 GB HBM3e per GPU for long-context reasoning inference at rack scale.',
    variants: [OEM('foxconn', 0.06), TURNKEY('nvidia', 'NVIDIA GB300 NVL72 reference rack', 0.14)] },
  { key: 'mi300x', label: 'AMD Instinct MI300X 8-GPU', from: 2023.9, eol: 2026, chassisId: 'sm-ubb-oam8-mi300x', rackId: 'gen-rack-19-48u-hd', trays: 2, cooling: 'air',
    parts: hdr('amd-mi300x', 'amd-epyc-genoa', 'sam-ddr5-5600-64', 12, 'nv-connectx7', 4, 'sam-pm9a3-3t84', 4), extras: [sw('cs-n9364e')],
    story: 'AMD\'s answer to H100: 192 GB HBM3 per GPU (more than H100/H200) on an 8-GPU OAM board. Ethernet-first scale-out and the ROCm software stack.',
    variants: [DIY('gigabyte'), OEM('supermicro'), OEM('dell', 0.08)] },
  { key: 'mi355x', label: 'AMD Instinct MI355X 8-GPU (liquid)', from: 2025.5, chassisId: 'gig-ubb-oam8-lq', rackId: 'gen-rack-19-48u-dlc', trays: 4, cooling: 'dlc',
    parts: [...hdr('amd-mi355x', 'amd-epyc-turin', 'skh-ddr5-6400-96', 12, 'nv-connectx7', 4, 'mic-9550-15t36', 4), { slot: 'coldplate', itemId: 'ct-coldplate-80', count: 8 }], extras: [sw('nv-sn5600')],
    story: 'CDNA4 with 288 GB HBM3E and FP4/FP6 support, liquid cooled at 1.4 kW per GPU.',
    variants: [DIY('gigabyte'), OEM('supermicro', 0.08)] },
  { key: 'gaudi3', label: 'Intel Gaudi 3 8-accelerator', from: 2024.7, chassisId: 'int-gaudi3-hls', rackId: 'gen-rack-19-48u-hd', trays: 2, cooling: 'air',
    parts: [{ slot: 'accelerator', itemId: 'int-gaudi-3', count: 8 }, { slot: 'cpu', itemId: 'amd-epyc-genoa', count: 2 }, { slot: 'dimm', itemId: 'sam-ddr5-5600-64', count: 12 }, { slot: 'nvme', itemId: 'sam-pm9a3-3t84', count: 2 }, { slot: 'psu', itemId: 'vt-geist-5kw', count: 4 }], extras: [sw('cs-n9364e')],
    story: 'Ethernet-native: each Gaudi 3 has 24x200G RoCE ports on the chip itself, so no separate NICs are needed.',
    variants: [OEM('supermicro', 0.06), DIY()] },
  { key: 'galaxy', label: 'Tenstorrent Galaxy (32-chip)', from: 2023.5, chassisId: 'tt-galaxy-4u', rackId: 'gen-rack-19-48u-hd', trays: 3, cooling: 'air',
    parts: [{ slot: 'accelerator', itemId: 'tt-galaxy', count: 1 }, { slot: 'cpu', itemId: 'amd-epyc-genoa', count: 1 }, { slot: 'dimm', itemId: 'sam-ddr5-5600-64', count: 4 }, { slot: 'nic', itemId: 'nv-connectx7', count: 1 }, { slot: 'psu', itemId: 'vt-geist-5kw', count: 4 }], extras: [sw('cs-n9364e')],
    story: 'Open RISC-V architecture: 32 Wormhole chips meshed by Ethernet inside the box and between boxes, no NVLink and no InfiniBand.',
    variants: [DIY('generic')] },
  { key: 'cs3', label: 'Cerebras CS-3 (wafer-scale)', from: 2024.3, chassisId: 'cb-cs3-cab', rackId: 'gen-rack-19-48u-dlc', trays: 2, cooling: 'dlc',
    parts: [{ slot: 'accelerator', itemId: 'cb-wse-3', count: 1 }, { slot: 'nic', itemId: 'nv-connectx7', count: 2 }, { slot: 'nvme', itemId: 'sam-pm9a3-3t84', count: 2 }, { slot: 'psu', itemId: 'vt-geist-22kw', count: 6 }], extras: [],
    story: 'One 46,000 mm² wafer is the chip: 900k cores with all weights in on-wafer SRAM, so there is no HBM and no GPU-to-GPU network inside the system.',
    variants: [TURNKEY('cerebras', 'Cerebras CS-3 system', 0.1)] },
];

const nameOf = (v: Vendor) => v[0].toUpperCase() + v.slice(1);
export const TEMPLATES: SystemTemplate[] = PLATFORMS.flatMap((p) => p.variants.map((v): SystemTemplate => {
  const codex: Codex = { summary: `${p.label} - ${v.label}. ${v.pitch}`, explain: p.story, tradeoffs: [v.tradeoff, p.cooling === 'air' ? 'Air-cooled: simple facility, limited rack density.' : 'Liquid-cooled: needs a DLC hall with CDUs.'], tags: [p.key, v.tier, p.cooling] };
  return { id: `tpl-${p.key}-${v.by}-${v.tier}`, name: v.tier === 'turnkey' ? v.label : `${p.label} · ${nameOf(v.by)} ${v.tier === 'diy' ? '(DIY)' : 'rack'}`, integrator: v.by, tier: v.tier, platform: p.label,
    tagline: v.pitch, availableFrom: p.from, eolAfter: p.eol, tray: { chassisId: p.chassisId, parts: p.parts }, rack: { rackId: p.rackId, trayCount: p.trays, extras: p.extras, cooling: p.cooling },
    premium: v.premium, leadFactor: v.lead, audience: v.audience, codex };
}));
export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);
