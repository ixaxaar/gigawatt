import { createInterface } from "node:readline";
const DIY = (by = "generic") => ({
  tier: "diy",
  by,
  label: "Build it yourself",
  premium: 0,
  lead: 1,
  audience: "Teams with integration staff chasing lowest capex.",
  pitch: "Buy the baseboard and every part separately and assemble, cable and burn-in yourself.",
  tradeoff: "Cheapest, but you own integration, firmware validation and debugging; parts arrive on different lead times."
});
const OEM = (by, premium = 0.07) => ({
  tier: "oem",
  by,
  label: `${by[0].toUpperCase() + by.slice(1)} integrated rack`,
  premium,
  lead: 0.85,
  audience: "Most neoclouds: a validated rack from an OEM with a support contract.",
  pitch: "OEM builds, cables and burn-tests the rack at the factory (L11/L12) and ships it ready to roll in.",
  tradeoff: "A modest premium buys faster install and one vendor to call; less customisation than DIY."
});
const TURNKEY = (by, label, premium = 0.18) => ({
  tier: "turnkey",
  by,
  label,
  premium,
  lead: 0.7,
  audience: "First-time operators and anyone who values uptime and support over capex.",
  pitch: "Vendor-engineered reference system with software stack and premium support; fastest to production.",
  tradeoff: "Highest capex; you pay for validation, support SLAs and allocation priority."
});
const hdr = (accel, cpu2, dimm, dn, nic2, nn, nvme, psu, extra = []) => [
  { slot: "accelerator", itemId: accel, count: 8 },
  { slot: "cpu", itemId: cpu2, count: 2 },
  { slot: "dimm", itemId: dimm, count: dn },
  { slot: "nic", itemId: nic2, count: nn },
  { slot: "nvme", itemId: nvme, count: 2 },
  { slot: "psu", itemId: "vt-geist-5kw", count: psu },
  ...extra
];
const sw$1 = (switchId, count = 1) => ({ type: "switch", switchId, count });
const PLATFORMS = [
  {
    key: "hgx-a100",
    label: "HGX A100 8-GPU",
    from: 2020.85,
    eol: 2024.5,
    chassisId: "nv-hgx-a100-8gy",
    rackId: "gen-rack-19-48u-hd",
    trays: 3,
    cooling: "air",
    parts: hdr("nv-a100-80-sxm", "amd-epyc-7742", "sam-ddr4-3200-64", 16, "nv-connectx6-hdr", 4, "sam-pm1733-3t84", 4),
    extras: [sw$1("nv-qm8700")],
    story: "The Ampere generation: 8 A100s in one NVLink3 box, scaled out over 200G InfiniBand. DGX A100 is NVIDIA's own build of this.",
    variants: [DIY(), OEM("supermicro"), OEM("dell", 0.08), TURNKEY("nvidia", "NVIDIA DGX A100 (rack)")]
  },
  {
    key: "hgx-h100",
    label: "HGX H100 8-GPU",
    from: 2022.9,
    eol: 2025.5,
    chassisId: "nv-hgx-h100-8gy",
    rackId: "gen-rack-19-48u-hd",
    trays: 2,
    cooling: "air",
    parts: hdr("nv-h100-sxm", "amd-epyc-genoa", "sam-ddr5-5600-64", 16, "nv-connectx7", 4, "sam-pm9a3-3t84", 4),
    extras: [sw$1("nv-qm9700")],
    story: "Hopper: FP8 Transformer Engine and NVLink4. 10 kW per server is the edge of air cooling, so only two fit per air rack.",
    variants: [DIY(), OEM("supermicro"), OEM("hpe", 0.09), TURNKEY("nvidia", "NVIDIA DGX H100 (rack)")]
  },
  {
    key: "hgx-h200",
    label: "HGX H200 8-GPU",
    from: 2024.5,
    eol: 2026,
    chassisId: "nv-hgx-h100-8gy",
    rackId: "gen-rack-19-48u-hd",
    trays: 2,
    cooling: "air",
    parts: hdr("nv-h200-sxm", "amd-epyc-genoa", "sam-ddr5-5600-64", 16, "nv-connectx7", 4, "sam-pm9a3-3t84", 4),
    extras: [sw$1("nv-qm9700")],
    story: "Same Hopper compute, 141 GB of faster HBM3e: a drop-in for inference, where memory bandwidth and capacity set tokens/s.",
    variants: [DIY(), OEM("supermicro"), TURNKEY("nvidia", "NVIDIA DGX H200 (rack)")]
  },
  {
    key: "hgx-b200",
    label: "HGX B200 8-GPU (liquid)",
    from: 2025,
    chassisId: "nv-hgx-b200-8gy",
    rackId: "gen-rack-19-48u-dlc",
    trays: 4,
    cooling: "dlc",
    parts: [...hdr("nv-b200-sxm", "amd-epyc-turin", "skh-ddr5-6400-96", 16, "nv-connectx8", 4, "mic-9550-15t36", 6), { slot: "coldplate", itemId: "ct-coldplate-80", count: 8 }],
    extras: [sw$1("nv-qmx8000")],
    story: "Blackwell in the HGX form factor: 15 kW per server needs direct liquid cooling, so you need a CDU and liquid-ready racks.",
    variants: [DIY(), OEM("supermicro"), OEM("dell", 0.09), TURNKEY("nvidia", "NVIDIA DGX B200 (rack)")]
  },
  {
    key: "gb200",
    label: "GB200 NVL72 rack-scale",
    from: 2024.9,
    eol: 2026.5,
    chassisId: "nv-gb200-nvl72-ct",
    rackId: "fox-nvl72-mgx",
    trays: 18,
    cooling: "dlc",
    parts: [{ slot: "accelerator", itemId: "nv-gb200", count: 2 }, { slot: "nic", itemId: "nv-connectx8", count: 4 }, { slot: "nvme", itemId: "sam-pm1743-15t36", count: 2 }],
    extras: [sw$1("nv-nvlink-switch-tray5", 9)],
    story: "72 Blackwell GPUs in ONE NVLink domain: one 120+ kW liquid-cooled rack acts as a single giant GPU. You cannot DIY this; it ships integrated.",
    variants: [OEM("foxconn", 0.06), OEM("dell", 0.09), TURNKEY("nvidia", "NVIDIA GB200 NVL72 reference rack", 0.14)]
  },
  {
    key: "gb300",
    label: "GB300 NVL72 rack-scale",
    from: 2025.7,
    chassisId: "nv-gb200-nvl72-ct",
    rackId: "fox-nvl72-mgx",
    trays: 18,
    cooling: "dlc",
    parts: [{ slot: "accelerator", itemId: "nv-gb300", count: 2 }, { slot: "nic", itemId: "nv-connectx8", count: 4 }, { slot: "nvme", itemId: "sam-pm1743-15t36", count: 2 }],
    extras: [sw$1("nv-nvlink-switch-tray5", 9)],
    story: "Blackwell Ultra NVL72: 288 GB HBM3e per GPU for long-context reasoning inference at rack scale.",
    variants: [OEM("foxconn", 0.06), TURNKEY("nvidia", "NVIDIA GB300 NVL72 reference rack", 0.14)]
  },
  {
    key: "mi300x",
    label: "AMD Instinct MI300X 8-GPU",
    from: 2023.9,
    eol: 2026,
    chassisId: "sm-ubb-oam8-mi300x",
    rackId: "gen-rack-19-48u-hd",
    trays: 2,
    cooling: "air",
    parts: hdr("amd-mi300x", "amd-epyc-genoa", "sam-ddr5-5600-64", 12, "nv-connectx7", 4, "sam-pm9a3-3t84", 4),
    extras: [sw$1("cs-n9364e")],
    story: "AMD's answer to H100: 192 GB HBM3 per GPU (more than H100/H200) on an 8-GPU OAM board. Ethernet-first scale-out and the ROCm software stack.",
    variants: [DIY("gigabyte"), OEM("supermicro"), OEM("dell", 0.08)]
  },
  {
    key: "mi355x",
    label: "AMD Instinct MI355X 8-GPU (liquid)",
    from: 2025.5,
    chassisId: "gig-ubb-oam8-lq",
    rackId: "gen-rack-19-48u-dlc",
    trays: 4,
    cooling: "dlc",
    parts: [...hdr("amd-mi355x", "amd-epyc-turin", "skh-ddr5-6400-96", 12, "nv-connectx7", 4, "mic-9550-15t36", 4), { slot: "coldplate", itemId: "ct-coldplate-80", count: 8 }],
    extras: [sw$1("nv-sn5600")],
    story: "CDNA4 with 288 GB HBM3E and FP4/FP6 support, liquid cooled at 1.4 kW per GPU.",
    variants: [DIY("gigabyte"), OEM("supermicro", 0.08)]
  },
  {
    key: "gaudi3",
    label: "Intel Gaudi 3 8-accelerator",
    from: 2024.7,
    chassisId: "int-gaudi3-hls",
    rackId: "gen-rack-19-48u-hd",
    trays: 2,
    cooling: "air",
    parts: [{ slot: "accelerator", itemId: "int-gaudi-3", count: 8 }, { slot: "cpu", itemId: "amd-epyc-genoa", count: 2 }, { slot: "dimm", itemId: "sam-ddr5-5600-64", count: 12 }, { slot: "nvme", itemId: "sam-pm9a3-3t84", count: 2 }, { slot: "psu", itemId: "vt-geist-5kw", count: 4 }],
    extras: [sw$1("cs-n9364e")],
    story: "Ethernet-native: each Gaudi 3 has 24x200G RoCE ports on the chip itself, so no separate NICs are needed.",
    variants: [OEM("supermicro", 0.06), DIY()]
  },
  {
    key: "galaxy",
    label: "Tenstorrent Galaxy (32-chip)",
    from: 2023.5,
    chassisId: "tt-galaxy-4u",
    rackId: "gen-rack-19-48u-hd",
    trays: 3,
    cooling: "air",
    parts: [{ slot: "accelerator", itemId: "tt-galaxy", count: 1 }, { slot: "cpu", itemId: "amd-epyc-genoa", count: 1 }, { slot: "dimm", itemId: "sam-ddr5-5600-64", count: 4 }, { slot: "nic", itemId: "nv-connectx7", count: 1 }, { slot: "psu", itemId: "vt-geist-5kw", count: 4 }],
    extras: [sw$1("cs-n9364e")],
    story: "Open RISC-V architecture: 32 Wormhole chips meshed by Ethernet inside the box and between boxes, no NVLink and no InfiniBand.",
    variants: [DIY("generic")]
  },
  {
    key: "cs3",
    label: "Cerebras CS-3 (wafer-scale)",
    from: 2024.3,
    chassisId: "cb-cs3-cab",
    rackId: "gen-rack-19-48u-dlc",
    trays: 2,
    cooling: "dlc",
    parts: [{ slot: "accelerator", itemId: "cb-wse-3", count: 1 }, { slot: "nic", itemId: "nv-connectx7", count: 2 }, { slot: "nvme", itemId: "sam-pm9a3-3t84", count: 2 }, { slot: "psu", itemId: "vt-geist-22kw", count: 6 }],
    extras: [],
    story: "One 46,000 mm² wafer is the chip: 900k cores with all weights in on-wafer SRAM, so there is no HBM and no GPU-to-GPU network inside the system.",
    variants: [TURNKEY("cerebras", "Cerebras CS-3 system", 0.1)]
  }
];
const nameOf = (v2) => v2[0].toUpperCase() + v2.slice(1);
const TEMPLATES = PLATFORMS.flatMap((p) => p.variants.map((v2) => {
  const codex = { summary: `${p.label} - ${v2.label}. ${v2.pitch}`, explain: p.story, tradeoffs: [v2.tradeoff, p.cooling === "air" ? "Air-cooled: simple facility, limited rack density." : "Liquid-cooled: needs a DLC hall with CDUs."], tags: [p.key, v2.tier, p.cooling] };
  return {
    id: `tpl-${p.key}-${v2.by}-${v2.tier}`,
    name: v2.tier === "turnkey" ? v2.label : `${p.label} · ${nameOf(v2.by)} ${v2.tier === "diy" ? "(DIY)" : "rack"}`,
    integrator: v2.by,
    tier: v2.tier,
    platform: p.label,
    tagline: v2.pitch,
    availableFrom: p.from,
    eolAfter: p.eol,
    tray: { chassisId: p.chassisId, parts: p.parts },
    rack: { rackId: p.rackId, trayCount: p.trays, extras: p.extras, cooling: p.cooling },
    premium: v2.premium,
    leadFactor: v2.lead,
    audience: v2.audience,
    codex
  };
}));
const getTemplate = (id) => TEMPLATES.find((t) => t.id === id);
const NVIDIA_ACCELERATORS = [
  {
    id: "nv-v100-sxm2",
    name: "Tesla V100 SXM2 16GB",
    vendor: "nvidia",
    kind: "accelerator",
    family: "Volta",
    formFactor: "sxm",
    availableFrom: 2017.5,
    eolAfter: 2022.5,
    priceUSD: 1e4,
    leadTimeMonths: 3,
    tflops: { fp64: 7.8, fp32: 15.7, fp16: 125 },
    memGB: 16,
    memType: "hbm2",
    memBWTBs: 0.9,
    tdpW: 300,
    scaleUp: "nvlink3",
    scaleUpGBs: 300,
    maxScaleUpDomain: 16,
    nativeScaleOutGbps: 0,
    pcieGen: 4,
    pcieLanes: 16,
    cooling: ["air"],
    softwareMaturity: 0.98,
    trainingAffinity: 0.9,
    inferenceAffinity: 0.8,
    codex: {
      summary: "The GPU that started the deep-learning datacenter era: Volta with the first Tensor Cores and NVLink fabric.",
      explain: "V100 introduced Tensor Cores for mixed-precision matrix math and 2nd-gen NVLink, letting NVSwitch tie 16 GPUs into one memory-coherent domain (DGX-2). PCIe link is actually Gen3 to the host, just below this catalog range.",
      tradeoffs: [
        "Only 16GB HBM2 - modern LLMs do not fit, fine for ResNet/transformer-era training only",
        "No sparsity or FP8/FP4: peak 125 dense FP16 TFLOPS is tiny by later standards"
      ],
      tags: ["volta", "tensor-cores", "nvswitch", "legacy"]
    }
  },
  {
    id: "nv-a100-80-sxm",
    name: "A100 80GB SXM4",
    vendor: "nvidia",
    kind: "accelerator",
    family: "Ampere",
    formFactor: "sxm",
    availableFrom: 2020.85,
    eolAfter: 2024.5,
    priceUSD: 18e3,
    leadTimeMonths: 3,
    tflops: { fp64: 19.5, fp32: 19.5, tf32: 156, bf16: 312, fp16: 312, int8: 624 },
    memGB: 80,
    memType: "hbm2e",
    memBWTBs: 2.04,
    tdpW: 400,
    scaleUp: "nvlink3",
    scaleUpGBs: 600,
    maxScaleUpDomain: 8,
    nativeScaleOutGbps: 0,
    pcieGen: 4,
    pcieLanes: 16,
    cooling: ["air"],
    softwareMaturity: 1,
    trainingAffinity: 1,
    inferenceAffinity: 0.9,
    codex: {
      summary: "Ampere workhorse that carried the 2020-2023 LLM boom: 80GB HBM2e, NVLink3, Multi-Instance GPU.",
      explain: "A100 doubled NVLink to 600 GB/s and introduced TF32/BF16 tensor paths plus MIG for slicing one GPU into isolated instances. 80GB of HBM2e was the key unlock for GPT-3-class training.",
      tradeoffs: [
        "Great efficiency per watt for its era, but 312 dense BF16 TFLOPS ages fast vs Hopper/Blackwell",
        "No FP8: inference economics beaten badly by H100 and later"
      ],
      tags: ["ampere", "mig", "training", "workhorse"]
    }
  },
  {
    id: "nv-h100-sxm",
    name: "H100 SXM5 80GB",
    vendor: "nvidia",
    kind: "accelerator",
    family: "Hopper",
    formFactor: "sxm",
    availableFrom: 2022.75,
    eolAfter: 2025.5,
    priceUSD: 3e4,
    leadTimeMonths: 6,
    allocationPerQuarter: 2048,
    tflops: { fp64: 34, fp32: 67, tf32: 495, bf16: 989, fp16: 989, fp8: 1979 },
    memGB: 80,
    memType: "hbm3",
    memBWTBs: 3.35,
    tdpW: 700,
    scaleUp: "nvlink4",
    scaleUpGBs: 900,
    maxScaleUpDomain: 8,
    nativeScaleOutGbps: 0,
    pcieGen: 5,
    pcieLanes: 16,
    cooling: ["air", "dlc"],
    softwareMaturity: 1,
    trainingAffinity: 1.1,
    inferenceAffinity: 1,
    codex: {
      summary: "Hopper flagship and the chip the generative-AI buildout fought over through 2023-2024.",
      explain: "H100 brought FP8 tensor cores (2x BF16 throughput), 900 GB/s NVLink4 with SHARP in-network reduction, and a Transformer Engine that picks per-layer precision automatically. The 2023 shortage made it effectively allocation-gated.",
      tradeoffs: [
        "700W SXM module pushes air cooling to its limit; direct-to-chip liquid becomes the comfortable path",
        "Only 80GB: large-batch serving of 70B+ models needs H200 or tensor parallelism"
      ],
      tags: ["hopper", "fp8", "transformer-engine", "nvlink4"]
    }
  },
  {
    id: "nv-h200-sxm",
    name: "H200 SXM 141GB",
    vendor: "nvidia",
    kind: "accelerator",
    family: "Hopper",
    formFactor: "sxm",
    availableFrom: 2024.5,
    priceUSD: 32e3,
    leadTimeMonths: 4,
    tflops: { fp64: 34, fp32: 67, tf32: 495, bf16: 989, fp16: 989, fp8: 1979 },
    memGB: 141,
    memType: "hbm3e",
    memBWTBs: 4.8,
    tdpW: 700,
    scaleUp: "nvlink4",
    scaleUpGBs: 900,
    maxScaleUpDomain: 8,
    nativeScaleOutGbps: 0,
    pcieGen: 5,
    pcieLanes: 16,
    cooling: ["air", "dlc"],
    softwareMaturity: 1,
    trainingAffinity: 1.1,
    inferenceAffinity: 1.15,
    codex: {
      summary: "Hopper with a memory transplant: same compute as H100 but 141GB of faster HBM3e.",
      explain: "H200 keeps the H100 die and swaps in HBM3e, lifting capacity 1.76x and bandwidth to 4.8 TB/s. That is an inference win: more KV-cache per GPU means bigger batches and more tokens per dollar.",
      tradeoffs: [
        "Identical training speed to H100 - you pay for memory, not FLOPs",
        "Great bridge product while waiting for Blackwell; drops in the same HGX boards"
      ],
      tags: ["hopper", "hbm3e", "inference", "kv-cache"]
    }
  },
  {
    id: "nv-gh200",
    name: "Grace Hopper GH200 Superchip",
    vendor: "nvidia",
    kind: "accelerator",
    family: "Hopper",
    formFactor: "superchip",
    availableFrom: 2024.25,
    priceUSD: 45e3,
    leadTimeMonths: 4,
    tflops: { fp64: 34, fp32: 67, tf32: 495, bf16: 989, fp16: 989, fp8: 1979 },
    memGB: 144,
    memType: "hbm3e",
    memBWTBs: 4.9,
    tdpW: 1e3,
    scaleUp: "nvlink4",
    scaleUpGBs: 900,
    maxScaleUpDomain: 32,
    nativeScaleOutGbps: 0,
    pcieGen: 0,
    pcieLanes: 0,
    cooling: ["dlc"],
    softwareMaturity: 0.98,
    trainingAffinity: 1.15,
    inferenceAffinity: 1.1,
    codex: {
      summary: "A Grace Arm CPU fused to a Hopper GPU by NVLink-C2C, with coherent access to LPDDR5X and HBM.",
      explain: "GH200 packages 144GB HBM3e on the GPU plus ~480GB of LPDDR5X on Grace, connected by a 900 GB/s chip-to-chip link so the GPU sees CPU memory without PCIe copies. NVLink Switch fabric builds the NVL32 domain of 32 superchips acting like one giant GPU.",
      tradeoffs: [
        "Coherent unified memory removes the PCIe bottleneck for huge models, but the extra Grace CPU adds cost that pure-GPU boxes avoid",
        "NVL32 racks are liquid-cooled only and want ~600W+ per superchip removed by CDUs"
      ],
      tags: ["grace", "c2c", "unified-memory", "nvl32"]
    }
  },
  {
    id: "nv-b200-sxm",
    name: "Blackwell B200 SXM 180GB",
    vendor: "nvidia",
    kind: "accelerator",
    family: "Blackwell",
    formFactor: "sxm",
    availableFrom: 2025,
    priceUSD: 35e3,
    leadTimeMonths: 5,
    tflops: { fp64: 40, tf32: 1100, bf16: 2200, fp16: 2200, fp8: 4500, fp6: 9e3, fp4: 9e3 },
    memGB: 180,
    memType: "hbm3e",
    memBWTBs: 8,
    tdpW: 1e3,
    scaleUp: "nvlink5",
    scaleUpGBs: 1800,
    maxScaleUpDomain: 72,
    nativeScaleOutGbps: 0,
    pcieGen: 5,
    pcieLanes: 16,
    cooling: ["air", "dlc"],
    softwareMaturity: 0.92,
    trainingAffinity: 1.15,
    inferenceAffinity: 1.2,
    codex: {
      summary: "First Blackwell: two reticle-size dies acting as one GPU, with FP4 tensor cores and 1.8 TB/s NVLink5.",
      explain: "B200 doubles everything - 8 TB/s HBM3e, 4.5 PF dense FP8, and NVLink5 fast enough to build the 72-GPU NVL72 domain. Early racks suffered real software bring-up pain (NCCL/cuDNN tuning), which is why maturity here is below Hopper.",
      tradeoffs: [
        "1000W per SXM module: air cooling works but liquid is the sane default at rack scale",
        "FP4 only pays off with quantization-aware or post-training-quantized models; legacy BF16 code sees roughly 2x H100, not 10x"
      ],
      tags: ["blackwell", "fp4", "nvlink5", "reticle-dies"]
    }
  },
  {
    id: "nv-b300-sxm",
    name: "Blackwell Ultra B300 SXM 288GB",
    vendor: "nvidia",
    kind: "accelerator",
    family: "Blackwell Ultra",
    formFactor: "sxm",
    availableFrom: 2025.7,
    priceUSD: 4e4,
    leadTimeMonths: 5,
    tflops: { fp64: 40, tf32: 1250, bf16: 2400, fp16: 2400, fp8: 4500, fp6: 9e3, fp4: 13500 },
    memGB: 288,
    memType: "hbm3e",
    memBWTBs: 8,
    tdpW: 1400,
    scaleUp: "nvlink5",
    scaleUpGBs: 1800,
    maxScaleUpDomain: 72,
    nativeScaleOutGbps: 0,
    pcieGen: 5,
    pcieLanes: 16,
    cooling: ["air", "dlc"],
    softwareMaturity: 0.95,
    trainingAffinity: 1.1,
    inferenceAffinity: 1.3,
    codex: {
      summary: "Blackwell Ultra: same generation tuned for inference - 288GB HBM3e and 1.5x the dense FP4 throughput.",
      explain: "B300 spends its extra transistor budget on low-precision tensor throughput and HBM capacity rather than FP8 training math. The reference NVL72 rack (GB300) pushes ~140kW per rack through liquid cold plates.",
      tradeoffs: [
        "1400W TDP: air-cooled HGX variants exist but direct liquid is the intended design point",
        "Barely moves BF16/FP8 training numbers - it is a serving chip, buy B200/GB200 or wait for Rubin to train"
      ],
      tags: ["blackwell-ultra", "inference", "fp4", "hbm3e"]
    }
  },
  {
    id: "nv-rubin-vr200",
    name: "Vera Rubin VR200 (NVL144)",
    vendor: "nvidia",
    kind: "accelerator",
    family: "Rubin",
    formFactor: "superchip",
    availableFrom: 2026.75,
    priceUSD: 6e4,
    leadTimeMonths: 6,
    tflops: { fp64: 50, tf32: 2800, bf16: 5600, fp16: 5600, fp8: 11500, fp6: 23e3, fp4: 23e3 },
    memGB: 288,
    memType: "hbm4",
    memBWTBs: 13,
    tdpW: 2400,
    scaleUp: "nvlink6",
    scaleUpGBs: 3600,
    maxScaleUpDomain: 72,
    nativeScaleOutGbps: 0,
    pcieGen: 0,
    pcieLanes: 0,
    cooling: ["dlc"],
    softwareMaturity: 0.9,
    trainingAffinity: 1.2,
    inferenceAffinity: 1.35,
    codex: {
      summary: "Rubin GPU package (two reticle dies of HBM4) paired with the Vera Arm CPU in the VR200 NVL144 rack.",
      explain: "Each Rubin package moves to HBM4 (~13 TB/s) and NVLink6 at 3.6 TB/s; NVIDIA counts dies, so NVL144 is 144 dies = 72 packages acting as one domain. Rack power lands near 250kW, firmly in direct-liquid territory.",
      tradeoffs: [
        "Rubin-generation numbers are announced roadmap specs (GTC 2025), so treat exact TFLOPS as estimates until launch",
        "Liquid-only and ~3.5kW per package slot: halls without CDU capacity cannot host it"
      ],
      tags: ["rubin", "hbm4", "nvlink6", "vera", "roadmap"]
    }
  },
  {
    id: "nv-rubin-ultra",
    name: "Rubin Ultra (NVL576)",
    vendor: "nvidia",
    kind: "accelerator",
    family: "Rubin Ultra",
    formFactor: "superchip",
    availableFrom: 2027.5,
    priceUSD: 9e4,
    leadTimeMonths: 8,
    allocationPerQuarter: 512,
    tflops: { fp64: 90, tf32: 6e3, bf16: 12e3, fp16: 12e3, fp8: 25e3, fp6: 5e4, fp4: 5e4 },
    memGB: 1024,
    memType: "hbm4e",
    memBWTBs: 20,
    tdpW: 4800,
    scaleUp: "nvlink6",
    scaleUpGBs: 3600,
    maxScaleUpDomain: 144,
    nativeScaleOutGbps: 0,
    pcieGen: 0,
    pcieLanes: 0,
    cooling: ["dlc"],
    softwareMaturity: 0.88,
    trainingAffinity: 1.25,
    inferenceAffinity: 1.4,
    codex: {
      summary: "2027 roadmap monster: four reticle dies per package, ~1TB of HBM4e, 576 dies coherent in one Kyber rack.",
      explain: "Rubin Ultra NVL576 makes 144 packages (576 dies) a single NVLink6 domain targeting ~15 exaflops of FP4 inference per rack. Everything about it - ~600kW Kyber racks, 1PB-class aggregate memory - assumes a purpose-built liquid-cooled facility.",
      tradeoffs: [
        "All figures are roadmap estimates; early allocation will be brutally scarce",
        "Rack power near 600kW demands busbar + CDU infrastructure most halls simply do not have"
      ],
      tags: ["rubin-ultra", "kyber", "hbm4e", "roadmap", "nvl576"]
    }
  },
  {
    id: "nv-l40s",
    name: "L40S 48GB",
    vendor: "nvidia",
    kind: "accelerator",
    family: "Ada Lovelace",
    formFactor: "pcie",
    availableFrom: 2023.75,
    priceUSD: 9500,
    leadTimeMonths: 2,
    tflops: { fp32: 91, tf32: 181, bf16: 181, fp16: 181, fp8: 366 },
    memGB: 48,
    memType: "gddr6",
    memBWTBs: 0.864,
    tdpW: 350,
    scaleUp: "pcie",
    scaleUpGBs: 0,
    maxScaleUpDomain: 1,
    nativeScaleOutGbps: 0,
    pcieGen: 4,
    pcieLanes: 16,
    cooling: ["air"],
    softwareMaturity: 1,
    trainingAffinity: 0.7,
    inferenceAffinity: 1.1,
    codex: {
      summary: "Ada Lovelace PCIe workhorse: cheap FP8 inference and fine-tuning without NVLink or HBM.",
      explain: "L40S pairs a pro-graphics-class GPU with 48GB of ordinary GDDR6 on a 350W air-cooled card that fits any server. With no NVLink it scales out over PCIe/Ethernet, which suits inference sharding and small-batch work far better than big training runs.",
      tradeoffs: [
        "864 GB/s GDDR6 is ~4x slower than HBM parts: decode-heavy LLM serving hits the memory wall early",
        "No scale-up fabric - tensor parallelism across cards crawls through PCIe"
      ],
      tags: ["ada", "gddr6", "inference", "budget", "pcie"]
    }
  },
  {
    id: "nv-h100-nvl",
    name: "H100 NVL 94GB (PCIe pair)",
    vendor: "nvidia",
    kind: "accelerator",
    family: "Hopper",
    formFactor: "pcie",
    availableFrom: 2023.25,
    priceUSD: 3e4,
    leadTimeMonths: 5,
    tflops: { fp64: 26, fp32: 51, tf32: 378, bf16: 756, fp16: 756, fp8: 1513 },
    memGB: 94,
    memType: "hbm3",
    memBWTBs: 3.9,
    tdpW: 350,
    scaleUp: "nvlink4",
    scaleUpGBs: 600,
    maxScaleUpDomain: 2,
    nativeScaleOutGbps: 0,
    pcieGen: 5,
    pcieLanes: 16,
    cooling: ["air"],
    softwareMaturity: 1,
    trainingAffinity: 0.95,
    inferenceAffinity: 1.2,
    codex: {
      summary: "The odd-duck H100: a 94GB PCIe card sold in bridged pairs with NVLink, aimed at 70B-model inference.",
      explain: "H100 NVL puts a cut-down Hopper on a 350W PCIe card with a NVLink4 bridge (600 GB/s) between two cards, so tensor-parallel serving of Llama-2-70B stays on one air-cooled node. The quirky 94GB exists to hold that model in FP8 weights plus KV-cache.",
      tradeoffs: [
        "94GB across two cards finally fits 70B-class serving on standard air-cooled servers",
        "Domain stops at 2 GPUs and clocks are below SXM - training throughput trails H100 SXM clearly"
      ],
      tags: ["hopper", "nvl", "inference", "pcie", "70b"]
    }
  }
];
const NVIDIA_CPUS = [
  {
    id: "nv-grace",
    name: "NVIDIA Grace CPU (72-core Neoverse V2)",
    vendor: "nvidia",
    kind: "cpu",
    arch: "arm",
    cores: 72,
    tdpW: 300,
    memChannels: 16,
    maxMemGB: 480,
    memBWGBs: 512,
    pcieGen: 5,
    pcieLanes: 128,
    c2cGBs: 900,
    availableFrom: 2024.25,
    priceUSD: 6500,
    leadTimeMonths: 4,
    codex: {
      summary: "NVIDIA's Arm server CPU built to sit beside GPUs on NVLink-C2C instead of PCIe.",
      explain: "Grace uses 72 Neoverse V2 cores with LPDDR5X (512 GB/s) rather than costly HBM or big DDR5 banks, and attaches to a Hopper/Blackwell GPU over a 900 GB/s coherent C2C link. That coherence lets the GPU stream CPU memory directly, which is why GH200-style hosts stop being a data-movement bottleneck.",
      tradeoffs: [
        "LPDDR5X gives server-class bandwidth at far lower cost and power than DDR5 RDIMMs, but lower capacity ceiling",
        "Arm ecosystem is mature for AI hosts (drivers, NCCL, containers) though some legacy x86 enterprise software will not run"
      ],
      tags: ["arm", "neoverse-v2", "grace", "c2c", "lpddr5x"]
    }
  },
  {
    id: "nv-vera",
    name: "NVIDIA Vera CPU (88-core)",
    vendor: "nvidia",
    kind: "cpu",
    arch: "arm",
    cores: 88,
    tdpW: 450,
    memChannels: 16,
    maxMemGB: 512,
    memBWGBs: 512,
    pcieGen: 5,
    pcieLanes: 128,
    c2cGBs: 1800,
    availableFrom: 2026.75,
    priceUSD: 9e3,
    leadTimeMonths: 6,
    codex: {
      summary: "The Rubin-generation Grace successor: 88 custom Arm cores, one Vera per Rubin package in VR200.",
      explain: "Vera rides on the same NVLink-C2C idea with roughly double the coherent link bandwidth feeding two Rubin dies. One Vera plus two Rubin GPUs forms the VR200 compute board; the rack-scale NVL144 is built from those boards.",
      tradeoffs: [
        "Announced roadmap part - core counts and link figures are pre-launch estimates",
        "Still LPDDR5X-attached: bandwidth per core matters less here than keeping the GPUs' NVLink domains fed"
      ],
      tags: ["arm", "vera", "rubin", "c2c", "roadmap"]
    }
  }
];
const OTHER_ACCELERATORS = [
  {
    kind: "accelerator",
    id: "amd-mi250x",
    name: "AMD Instinct MI250X",
    vendor: "amd",
    availableFrom: 2021.85,
    eolAfter: 2025,
    priceUSD: 12e3,
    leadTimeMonths: 5,
    allocationPerQuarter: 4e3,
    family: "CDNA2",
    formFactor: "oam",
    tflops: { fp64: 47.9, fp32: 47.9, bf16: 191.5, fp16: 191.5, int8: 383 },
    memGB: 128,
    memType: "hbm2e",
    memBWTBs: 3.2,
    tdpW: 500,
    scaleUp: "infinity-fabric",
    scaleUpGBs: 370,
    maxScaleUpDomain: 4,
    nativeScaleOutGbps: 0,
    pcieGen: 4,
    pcieLanes: 16,
    cooling: ["air", "dlc"],
    softwareMaturity: 0.5,
    trainingAffinity: 0.85,
    inferenceAffinity: 0.7,
    codex: {
      summary: "AMD dual-die OAM module that powered the Frontier exascale supercomputer.",
      explain: "Two GPU chiplets linked by Infinity Fabric share 128GB of HBM2e, roughly doubling FP64 throughput versus contemporary NVIDIA parts for HPC. ROCm support was thin outside supercomputing centers, which limited commercial adoption.",
      tradeoffs: [
        "Excellent FP64 and HBM capacity for 2021, competitive with A100 on HPC workloads",
        "ROCm software maturity lagged CUDA badly; many model stacks required porting",
        "Only 4-module xGMI domains vs NVIDIA 8-GPU NVSwitch nodes"
      ],
      tags: ["cdna2", "hpc", "infinity-fabric", "frontier"]
    }
  },
  {
    kind: "accelerator",
    id: "amd-mi300x",
    name: "AMD Instinct MI300X",
    vendor: "amd",
    availableFrom: 2023.9,
    priceUSD: 16e3,
    leadTimeMonths: 4,
    allocationPerQuarter: 8e3,
    family: "CDNA3",
    formFactor: "oam",
    tflops: { fp64: 81.7, fp32: 163.4, tf32: 653.7, bf16: 1307.4, fp16: 1307.4, fp8: 2614.9, int8: 2614.9 },
    memGB: 192,
    memType: "hbm3",
    memBWTBs: 5.3,
    tdpW: 750,
    scaleUp: "infinity-fabric",
    scaleUpGBs: 864,
    maxScaleUpDomain: 8,
    nativeScaleOutGbps: 0,
    pcieGen: 5,
    pcieLanes: 16,
    cooling: ["air", "dlc"],
    softwareMaturity: 0.68,
    trainingAffinity: 0.9,
    inferenceAffinity: 1.15,
    codex: {
      summary: "AMD 2023 chiplet flagship: 192GB HBM3, the first accelerator able to hold a 70B-class model on one GPU.",
      explain: "It packages GPU compute dies plus an IO die on 2.5D interposers, delivering 5.3TB/s memory bandwidth inside a full 8-GPU Infinity Fabric domain. Huge memory made it an inference favorite where model fit beats raw FLOPs.",
      tradeoffs: [
        "192GB fits a 70B model in FP16 where H100 80GB cannot, slashing multi-GPU overhead",
        "ROCm improved greatly but still trails CUDA on long-tail kernels",
        "750W OAM pushes many chassis toward liquid cooling"
      ],
      tags: ["cdna3", "hbm3", "inference", "infinity-fabric"]
    }
  },
  {
    kind: "accelerator",
    id: "amd-mi325x",
    name: "AMD Instinct MI325X",
    vendor: "amd",
    availableFrom: 2024.85,
    priceUSD: 18e3,
    leadTimeMonths: 4,
    allocationPerQuarter: 6e3,
    family: "CDNA3.5",
    formFactor: "oam",
    tflops: { fp64: 81.7, fp32: 163.4, tf32: 653.7, bf16: 1307.4, fp16: 1307.4, fp8: 2614.9, int8: 2614.9 },
    memGB: 256,
    memType: "hbm3e",
    memBWTBs: 6,
    tdpW: 1e3,
    scaleUp: "infinity-fabric",
    scaleUpGBs: 864,
    maxScaleUpDomain: 8,
    nativeScaleOutGbps: 0,
    pcieGen: 5,
    pcieLanes: 16,
    cooling: ["air", "dlc"],
    softwareMaturity: 0.7,
    trainingAffinity: 0.9,
    inferenceAffinity: 1.2,
    codex: {
      summary: "Mid-gen MI300X refresh that doubles memory to 256GB of faster HBM3e on the same compute silicon.",
      explain: "Same CDNA3 compute with 256GB at 6TB/s, aimed at inference density: more and bigger models resident per GPU. FLOPs are unchanged from MI300X.",
      tradeoffs: [
        "256GB holds roughly 140B parameters in FP16 on a single card",
        "No compute uplift, so bandwidth-bound token generation gains the most",
        "1kW OAM largely forces liquid-cooled trays"
      ],
      tags: ["cdna3.5", "hbm3e", "inference"]
    }
  },
  {
    kind: "accelerator",
    id: "amd-mi355x",
    name: "AMD Instinct MI355X",
    vendor: "amd",
    availableFrom: 2025.5,
    priceUSD: 25e3,
    leadTimeMonths: 4,
    allocationPerQuarter: 5e3,
    family: "CDNA3.5",
    formFactor: "oam",
    tflops: { fp64: 81.7, fp32: 163.4, bf16: 2614.9, fp16: 2614.9, fp8: 5229.8, fp6: 5229.8, fp4: 10459.5, int8: 5229.8 },
    memGB: 256,
    memType: "hbm3e",
    memBWTBs: 8,
    tdpW: 1400,
    scaleUp: "infinity-fabric",
    scaleUpGBs: 864,
    maxScaleUpDomain: 8,
    nativeScaleOutGbps: 0,
    pcieGen: 5,
    pcieLanes: 16,
    cooling: ["dlc", "immersion"],
    softwareMaturity: 0.72,
    trainingAffinity: 0.95,
    inferenceAffinity: 1.25,
    codex: {
      summary: "AMD 2025 flagship: 256GB HBM3e at 8TB/s with double the compute plus FP4/FP6 support.",
      explain: "A bigger die in the same packaging doubles dense FP8 to about 5.2 PFLOPS and adds 4- and 6-bit datatypes for cheap token generation. Its 1.4kW TDP makes it liquid-cooled only.",
      tradeoffs: [
        "8TB/s HBM3e is class-leading decode bandwidth for MoE serving",
        "FP4/FP6 support targets the same quantized workloads as Blackwell",
        "1.4kW requires DLC or immersion; air cooling is out"
      ],
      tags: ["cdna3.5", "hbm3e", "fp4", "liquid-cooled"]
    }
  },
  {
    kind: "accelerator",
    id: "amd-mi400x",
    name: "AMD Instinct MI400X (Helios)",
    vendor: "amd",
    availableFrom: 2026.75,
    priceUSD: 35e3,
    leadTimeMonths: 4,
    allocationPerQuarter: 4e3,
    family: "CDNA4",
    formFactor: "oam",
    tflops: { bf16: 5e3, fp16: 5e3, fp8: 1e4, fp6: 1e4, fp4: 2e4 },
    memGB: 432,
    memType: "hbm4",
    memBWTBs: 19.6,
    tdpW: 1600,
    scaleUp: "ualink",
    scaleUpGBs: 1600,
    maxScaleUpDomain: 72,
    nativeScaleOutGbps: 0,
    pcieGen: 5,
    pcieLanes: 16,
    cooling: ["dlc"],
    softwareMaturity: 0.7,
    trainingAffinity: 1,
    inferenceAffinity: 1.3,
    codex: {
      summary: "AMD CDNA4 accelerator for the Helios rack: 432GB HBM4 at about 20TB/s inside a 72-GPU UALink domain.",
      explain: "Rather than compete board by board, MI400 ships as part of the rack-scale Helios system: 72 GPUs plus MI450 host CPUs linked by UALink, with Ultra Ethernet for scale-out. Volume availability is slated for H2 2026 with OpenAI as anchor customer.",
      tradeoffs: [
        "72-GPU UALink domain mirrors NVL72-style scale-up memory semantics",
        "HBM4 capacity and bandwidth lead the 2026 generation on paper",
        "Rack-scale procurement: you buy the Helios system, not loose cards"
      ],
      tags: ["cdna4", "hbm4", "ualink", "helios", "rack-scale"]
    }
  },
  {
    kind: "accelerator",
    id: "tt-wormhole-n300",
    name: "Tenstorrent Wormhole n300",
    vendor: "tenstorrent",
    availableFrom: 2023.4,
    priceUSD: 1400,
    leadTimeMonths: 2,
    allocationPerQuarter: 2e3,
    family: "Wormhole",
    formFactor: "pcie",
    tflops: { bf16: 168, fp16: 168, int8: 336 },
    memGB: 24,
    memType: "gddr6",
    memBWTBs: 0.576,
    tdpW: 300,
    scaleUp: "tt-ethernet-mesh",
    scaleUpGBs: 400,
    maxScaleUpDomain: 4,
    nativeScaleOutGbps: 400,
    pcieGen: 4,
    pcieLanes: 16,
    cooling: ["air"],
    softwareMaturity: 0.35,
    trainingAffinity: 0.5,
    inferenceAffinity: 0.75,
    codex: {
      summary: "Tenstorrent dual-Wormhole PCIe card: cheap RISC-V+Tensix chips that network over plain Ethernet.",
      explain: "Two Wormhole chips expose 100GbE mesh links straight from the package, so scale-up and scale-out use the same standard Ethernet switches. It was sold near cost to seed an open software community.",
      tradeoffs: [
        "Ethernet-native fabric means cheap whitebox switches and no proprietary lock-in",
        "GDDR6 (24GB) and modest FLOPs limit it to small models and experimentation",
        "Young TT-Metalium stack requires hands-on kernel work"
      ],
      tags: ["wormhole", "risc-v", "ethernet", "budget"]
    }
  },
  {
    kind: "accelerator",
    id: "tt-blackhole-p150",
    name: "Tenstorrent Blackhole p150",
    vendor: "tenstorrent",
    availableFrom: 2025.3,
    priceUSD: 1300,
    leadTimeMonths: 2,
    allocationPerQuarter: 4e3,
    family: "Blackhole",
    formFactor: "pcie",
    tflops: { bf16: 197, fp16: 197, fp8: 394, int8: 394 },
    memGB: 32,
    memType: "lpddr5x",
    memBWTBs: 0.512,
    tdpW: 300,
    scaleUp: "tt-ethernet-mesh",
    scaleUpGBs: 800,
    maxScaleUpDomain: 8,
    nativeScaleOutGbps: 1600,
    pcieGen: 5,
    pcieLanes: 16,
    cooling: ["air"],
    softwareMaturity: 0.4,
    trainingAffinity: 0.55,
    inferenceAffinity: 0.85,
    codex: {
      summary: "Tenstorrent second-gen single-chip card: 32GB LPDDR5, about 197 BF16 TFLOPS and 16 integrated 400GbE ports.",
      explain: "Blackhole drops dependence on a host CPU (RISC-V cores on package) and wires Ethernet into every chip, so each card is simultaneously compute and network. It targets cost-per-token inference and research clusters.",
      tradeoffs: [
        "400GbE on-package removes NIC cost and enables free-form topologies",
        "LPDDR5 bandwidth (0.5TB/s) is far below HBM parts: decode-heavy workloads only",
        "Ecosystem and compiler still maturing vs CUDA/ROCm"
      ],
      tags: ["blackhole", "risc-v", "ethernet", "budget"]
    }
  },
  {
    kind: "accelerator",
    id: "tt-galaxy",
    name: "Tenstorrent Galaxy (32x Wormhole)",
    vendor: "tenstorrent",
    availableFrom: 2023.5,
    priceUSD: 12e4,
    leadTimeMonths: 4,
    allocationPerQuarter: 30,
    family: "Galaxy",
    formFactor: "rack-scale",
    tflops: { bf16: 5376, fp16: 5376, int8: 10752 },
    memGB: 768,
    memType: "gddr6",
    memBWTBs: 9.2,
    tdpW: 4e3,
    scaleUp: "tt-ethernet-mesh",
    scaleUpGBs: 6400,
    maxScaleUpDomain: 4,
    nativeScaleOutGbps: 1600,
    pcieGen: 4,
    pcieLanes: 16,
    cooling: ["air"],
    softwareMaturity: 0.35,
    trainingAffinity: 0.6,
    inferenceAffinity: 0.8,
    codex: {
      summary: "Tenstorrent 4U server packing 32 Wormhole chips (768GB GDDR6) pre-meshed over integrated Ethernet.",
      explain: "A Galaxy is roughly 5.4 BF16 PFLOPS in a box whose chips form a 2D mesh using on-die 100GbE links; up to four Galaxies mesh into a 128-chip pod. It demonstrates Tenstorrent thesis that lossless-Ethernet scale-up can replace exotic fabrics.",
      tradeoffs: [
        "One box is a 32-chip domain with no separate switch purchase",
        "GDDR6 capacity and bandwidth cap per-chip model sizes",
        "Main risk is software (TT-Metalium/TT-NN), not hardware"
      ],
      tags: ["wormhole", "galaxy", "ethernet", "mesh"]
    }
  },
  {
    kind: "accelerator",
    id: "cb-wse-3",
    name: "Cerebras CS-3 (WSE-3)",
    vendor: "cerebras",
    availableFrom: 2024.3,
    priceUSD: 3e6,
    leadTimeMonths: 9,
    allocationPerQuarter: 20,
    family: "WSE",
    formFactor: "wafer",
    tflops: { bf16: 62500, fp16: 62500 },
    memGB: 44,
    memType: "sram",
    memBWTBs: 21e3,
    sramMB: 44e3,
    tdpW: 23e3,
    scaleUp: "wafer",
    scaleUpGBs: 17e5,
    maxScaleUpDomain: 2048,
    nativeScaleOutGbps: 0,
    pcieGen: 0,
    pcieLanes: 0,
    cooling: ["dlc"],
    softwareMaturity: 0.5,
    trainingAffinity: 1.1,
    inferenceAffinity: 1.25,
    codex: {
      summary: "Cerebras wafer-scale engine: a single 900k-core chip the size of a dinner plate with 44GB of on-wafer SRAM.",
      explain: "WSE-3 keeps activations in SRAM at 21PB/s and streams weights from external MemoryX, so one wafer trains or serves giant models without sharding. Clusters scale to 2048 CS-3 systems with near-linear deterministic scaling.",
      tradeoffs: [
        "Dataflow SRAM architecture gives extreme tokens/s per watt for decoding",
        "Only 44GB on-wafer: weights live in MemoryX, a proprietary streaming tier",
        "Custom stack: you adapt workloads to Cerebras, not the reverse"
      ],
      tags: ["wafer-scale", "sram", "memoryx", "training"]
    }
  },
  {
    kind: "accelerator",
    id: "int-gaudi-2",
    name: "Intel Gaudi 2",
    vendor: "intel",
    availableFrom: 2022.75,
    eolAfter: 2025.5,
    priceUSD: 1e4,
    leadTimeMonths: 5,
    allocationPerQuarter: 6e3,
    family: "Gaudi",
    formFactor: "oam",
    tflops: { bf16: 432, fp16: 432, fp8: 865, int8: 865 },
    memGB: 96,
    memType: "hbm2e",
    memBWTBs: 2.45,
    tdpW: 600,
    scaleUp: "gaudi-roce",
    scaleUpGBs: 300,
    maxScaleUpDomain: 8,
    nativeScaleOutGbps: 2400,
    pcieGen: 4,
    pcieLanes: 16,
    cooling: ["air", "dlc"],
    softwareMaturity: 0.5,
    trainingAffinity: 0.85,
    inferenceAffinity: 0.75,
    codex: {
      summary: "Intel Habana-built 2022 challenger: 96GB HBM2e with 24 integrated 100GbE RoCE ports per card.",
      explain: "Gaudi 2 put the network on the accelerator: scale-up and scale-out run over standard Ethernet/RoCE with no separate NICs. MLPerf results showed real training capability at aggressive prices.",
      tradeoffs: [
        "Integrated RoCE fabric cuts system cost and cabling complexity",
        "SynapseAI lacked CUDA breadth, so adoption stayed niche",
        "FP8 support exists but tooling trailed NVIDIA"
      ],
      tags: ["gaudi", "habana", "roce", "ethernet"]
    }
  },
  {
    kind: "accelerator",
    id: "int-gaudi-3",
    name: "Intel Gaudi 3",
    vendor: "intel",
    availableFrom: 2024.7,
    priceUSD: 16e3,
    leadTimeMonths: 4,
    allocationPerQuarter: 5e3,
    family: "Gaudi",
    formFactor: "oam",
    tflops: { bf16: 917.5, fp16: 917.5, fp8: 1835, int8: 1468 },
    memGB: 128,
    memType: "hbm2e",
    memBWTBs: 3.7,
    tdpW: 900,
    scaleUp: "gaudi-roce",
    scaleUpGBs: 600,
    maxScaleUpDomain: 8,
    nativeScaleOutGbps: 4800,
    pcieGen: 5,
    pcieLanes: 16,
    cooling: ["air", "dlc"],
    softwareMaturity: 0.52,
    trainingAffinity: 0.9,
    inferenceAffinity: 0.85,
    codex: {
      summary: "Intel 2024 Gaudi update: 128GB HBM2e, about 1.8 FP8 PFLOPS and 24 integrated 200GbE RoCEv2 ports.",
      explain: "It doubles Gaudi 2 memory bandwidth and compute while keeping the Ethernet-native design in standard OAM packaging. Intel positioned it on price-performance for inference-heavy deployments.",
      tradeoffs: [
        "24x200GbE on-package gives huge east-west bandwidth with cheap switches",
        "SynapseAI software remains the adoption bottleneck",
        "Roadmap uncertainty after Intel strategy shifts"
      ],
      tags: ["gaudi", "roce", "ethernet", "hbm2e"]
    }
  },
  {
    kind: "accelerator",
    id: "grq-lpu",
    name: "Groq LPU (GroqChip)",
    vendor: "groq",
    availableFrom: 2023.2,
    priceUSD: 15e3,
    leadTimeMonths: 4,
    allocationPerQuarter: 1e3,
    family: "LPU",
    formFactor: "module",
    tflops: { fp16: 94, int8: 188 },
    memGB: 0.23,
    memType: "sram",
    memBWTBs: 80,
    sramMB: 230,
    tdpW: 300,
    scaleUp: "groq-chip2chip",
    scaleUpGBs: 100,
    maxScaleUpDomain: 576,
    nativeScaleOutGbps: 0,
    pcieGen: 0,
    pcieLanes: 0,
    cooling: ["air"],
    softwareMaturity: 0.45,
    trainingAffinity: 0.45,
    inferenceAffinity: 1.4,
    codex: {
      summary: "Groq deterministic tensor-streaming LPU: 230MB of on-die SRAM, no HBM, compiler-scheduled execution.",
      explain: "The LPU executes a pre-planned schedule with no caches or memory contention, making batch-1 token latency extreme and perfectly predictable. Models are sharded across hundreds of chips wired in a rigid chip-to-chip fabric.",
      tradeoffs: [
        "SRAM-only design delivers outstanding decode latency and tokens/s per user",
        "230MB per chip means weights must be sharded: 70B models span hundreds of LPUs",
        "Great at inference serving, essentially unusable for training"
      ],
      tags: ["lpu", "sram", "inference", "deterministic"]
    }
  }
];
const OTHER_CPUS = [
  {
    kind: "cpu",
    id: "amd-epyc-genoa",
    name: "AMD EPYC 9654 (Genoa)",
    vendor: "amd",
    availableFrom: 2022.85,
    priceUSD: 11600,
    leadTimeMonths: 2,
    arch: "x86",
    cores: 96,
    tdpW: 360,
    memChannels: 12,
    maxMemGB: 6144,
    memBWGBs: 461,
    pcieGen: 5,
    pcieLanes: 128,
    codex: {
      summary: "AMD Zen4 server CPU flagship: 96 cores, 12-channel DDR5 and 128 PCIe 5.0 lanes.",
      explain: "Genoa made x86 GPU hosts cheaper per core than Intel while doubling memory bandwidth for data staging. The SP5 platform it introduced is used by most MI300 and Gaudi systems.",
      tradeoffs: [
        "128 Gen5 lanes feed multiple accelerators and NICs from one socket",
        "12-channel DDR5 must be fully populated or bandwidth tanks",
        "High core count at modest clocks: also great for storage/frontend nodes"
      ],
      tags: ["zen4", "ddr5", "host-cpu"]
    }
  },
  {
    kind: "cpu",
    id: "amd-epyc-turin",
    name: "AMD EPYC 9965 (Turin)",
    vendor: "amd",
    availableFrom: 2024.8,
    priceUSD: 14800,
    leadTimeMonths: 2,
    arch: "x86",
    cores: 192,
    tdpW: 500,
    memChannels: 12,
    maxMemGB: 6144,
    memBWGBs: 614,
    pcieGen: 5,
    pcieLanes: 128,
    codex: {
      summary: "AMD Zen5 server generation: up to 192 cores per socket on the same SP5 DDR5 platform.",
      explain: "Turin (EPYC 9005) doubles cores to 192 and moves to DDR5-6400 while being drop-in compatible with Genoa boards. Dense Zen5c variants target cloud hosts and AI datacenter service nodes.",
      tradeoffs: [
        "192 cores amortize host cost across more GPUs per node",
        "500W TDP flagship SKUs need serious chassis airflow",
        "Socket-compatible with Genoa: a capacity upgrade without a platform swap"
      ],
      tags: ["zen5", "ddr5", "host-cpu"]
    }
  }
];
const NICS = [
  {
    id: "nv-connectx6-dx",
    name: "NVIDIA ConnectX-6 Dx 200G",
    vendor: "nvidia",
    kind: "nic",
    nicClass: "nic",
    tech: "eth-200",
    gbps: 400,
    ports: 2,
    pcieGen: 4,
    pcieLanes: 16,
    watts: 18,
    availableFrom: 2020.25,
    eolAfter: 2025.5,
    priceUSD: 1400,
    leadTimeMonths: 3,
    features: ["roce", "rdma", "gpudirect", "ipsec", "macsec", "ovs-offload"],
    codex: {
      summary: "Dual-port 200G Ethernet/RoCE adapter that was the standard AI node NIC of the A100 era.",
      explain: "ConnectX-6 Dx moved RDMA, adaptive routing and inline IPsec/MACsec into the NIC so hosts could do line-rate RoCE without burning CPU. Rail-optimized A100 clusters wired one 200G port per GPU across 8 rails to the leaf tier.",
      tradeoffs: [
        "PCIe Gen4 x16 (~32 GB/s) caps useful throughput well below the 400 Gb/s line rate",
        "No 400G per port: keeping pace with one H100 needs two ports or an upgrade"
      ],
      tags: ["ethernet", "roce", "200g", "a100-era"]
    }
  },
  {
    id: "nv-connectx7",
    name: "NVIDIA ConnectX-7 400G",
    vendor: "nvidia",
    kind: "nic",
    nicClass: "nic",
    tech: "eth-400",
    gbps: 800,
    ports: 2,
    pcieGen: 5,
    pcieLanes: 16,
    watts: 25,
    availableFrom: 2022.75,
    eolAfter: 2029,
    priceUSD: 2800,
    leadTimeMonths: 4,
    features: ["roce", "rdma", "gpudirect", "sharp", "ipsec", "nvme-of", "ovs-offload"],
    codex: {
      summary: "Dual-port 400G adapter that gives each H100 one 400G port and speaks both Ethernet/RoCE and InfiniBand NDR.",
      explain: "ConnectX-7 unified InfiniBand and Ethernet on one chip: with Quantum-2 it gets SHARP in-network collectives, with Spectrum switches it forms Spectrum-X. DGX H100 ships one CX-7 per GPU, i.e. 400 Gb/s of scale-out per GPU.",
      tradeoffs: [
        "400 Gb/s per H100 is ~50 GB/s, one third of NVLink speed, so the scale-out fabric must be non-blocking",
        "One SKU for IB and Ethernet simplifies spares, but pulls a full PCIe Gen5 x16 slot"
      ],
      tags: ["ethernet", "infiniband", "400g", "h100-era", "spectrum-x"]
    }
  },
  {
    id: "nv-connectx8",
    name: "NVIDIA ConnectX-8 800G",
    vendor: "nvidia",
    kind: "nic",
    nicClass: "nic",
    tech: "eth-800",
    gbps: 1600,
    ports: 2,
    pcieGen: 5,
    pcieLanes: 16,
    watts: 40,
    availableFrom: 2025,
    priceUSD: 5500,
    leadTimeMonths: 4,
    allocationPerQuarter: 12e3,
    features: ["rdma", "roce", "gpudirect", "nvme-of", "spectrum-x", "macsec"],
    codex: {
      summary: "Dual-port 800G adapter shipping in GB200 NVL72 racks, feeding every pair of Blackwell GPUs with 800 Gb/s scale-out.",
      explain: "Each NVL72 compute tray carries four dual-port ConnectX-8 for eight 800G uplinks, adding up to 57.6 Tb/s of scale-out per rack. With Spectrum-X it does adaptive routing and congestion control in hardware.",
      tradeoffs: [
        "800G optics or active copper per port is expensive: the cable BOM can rival the switch cost",
        "PCIe Gen5 x16 (~128 GB/s) cannot saturate both 800G ports simultaneously"
      ],
      tags: ["ethernet", "800g", "blackwell-era", "spectrum-x"]
    }
  },
  {
    id: "nv-connectx9",
    name: "NVIDIA ConnectX-9 1.6T",
    vendor: "nvidia",
    kind: "nic",
    nicClass: "nic",
    tech: "eth-1600",
    gbps: 3200,
    ports: 2,
    pcieGen: 6,
    pcieLanes: 16,
    watts: 55,
    availableFrom: 2026.5,
    priceUSD: 8500,
    leadTimeMonths: 6,
    allocationPerQuarter: 8e3,
    features: ["rdma", "gpudirect", "nvme-of", "spectrum-x"],
    codex: {
      summary: "1.6 Tb/s per-port adapter for the Rubin era, matched to 1.6T switch silicon and PCIe Gen6 hosts.",
      explain: "ConnectX-9 doubles per-port rate to 1.6 Tb/s and steps to PCIe Gen6 so the host link no longer bottlenecks the network. Announced at GTC 2025 alongside Quantum-X and Spectrum-X photonics.",
      tradeoffs: [
        "Needs 1.6T optics or very short copper: link budgets explode past a few hundred meters",
        "Early allocations stay tight through 2027; plan lead times like a launch GPU"
      ],
      tags: ["ethernet", "1600g", "rubin-era", "pcie-gen6"]
    }
  },
  {
    id: "nv-bluefield3",
    name: "NVIDIA BlueField-3 DPU",
    vendor: "nvidia",
    kind: "nic",
    nicClass: "dpu",
    tech: "eth-400",
    gbps: 800,
    ports: 2,
    pcieGen: 5,
    pcieLanes: 16,
    watts: 25,
    availableFrom: 2023,
    priceUSD: 4200,
    leadTimeMonths: 5,
    allocationPerQuarter: 8e3,
    features: ["arm-cores:16", "rdma", "gpudirect", "ipsec", "nvme-of", "ovs-offload"],
    codex: {
      summary: "A ConnectX-class 400G NIC fused with 16 Arm A78 cores: networking, storage and security run on the card.",
      explain: "The DPU turns infrastructure work into a separate compute domain by offloading OVS, IPsec, NVMe-oF and RDMA from host CPUs, isolating tenant workloads from cluster plumbing (its SDK is DOCA).",
      tradeoffs: [
        "Burns ~25 W and a full Gen5 x16 slot to do what a plain NIC does at half the price",
        "Best on storage and front-end nodes; pure GPU rail nodes usually take plain ConnectX"
      ],
      tags: ["dpu", "arm", "offload", "security"]
    }
  },
  {
    id: "nv-bluefield4",
    name: "NVIDIA BlueField-4 DPU",
    vendor: "nvidia",
    kind: "nic",
    nicClass: "dpu",
    tech: "eth-800",
    gbps: 1600,
    ports: 2,
    pcieGen: 5,
    pcieLanes: 16,
    watts: 55,
    availableFrom: 2026.75,
    priceUSD: 7500,
    leadTimeMonths: 6,
    allocationPerQuarter: 4e3,
    features: ["arm-cores", "rdma", "gpudirect", "inline-crypto", "nvme-of", "ovs-offload"],
    codex: {
      summary: "Roadmap 800G DPU pairing ConnectX-8-class line rate with a much larger Arm complex for secure multi-tenant serving.",
      explain: "BlueField-4 is positioned on the NVIDIA roadmap for the Blackwell-to-Rubin window, aiming DPU-class programmability at 800 Gb/s. Specs are announced targets, not shipping silicon yet.",
      tradeoffs: [
        "Roadmap part: dates and specs can slip, so treat lead times as uncertain",
        "High watts per port means dense front-end trays must plan airflow around it"
      ],
      tags: ["dpu", "800g", "roadmap"]
    }
  },
  {
    id: "amd-pollara-400",
    name: "AMD Pensando Pollara 400",
    vendor: "amd",
    kind: "nic",
    nicClass: "nic",
    tech: "uec-eth",
    gbps: 800,
    ports: 8,
    pcieGen: 5,
    pcieLanes: 16,
    watts: 35,
    availableFrom: 2025.75,
    priceUSD: 3200,
    leadTimeMonths: 6,
    allocationPerQuarter: 5e3,
    features: ["uec-ready", "rdma", "rocev2", "gpudirect"],
    codex: {
      summary: "AMD UEC-ready 800G AI NIC for MI-series clusters, built to converge on Ultra Ethernet RDMA.",
      explain: "Pollara 400 is the first NIC aimed at the Ultra Ethernet Consortium spec, staying RoCEv2-compatible so it interoperates with existing fleets while UEC software matures. It pairs with Pensando Vulcano switch silicon in AMD reference designs.",
      tradeoffs: [
        "UEC is young: peak performance depends on ecosystem software still landing",
        "8x100G port flexibility matches UEC fabrics but makes cabling denser than 2x400G"
      ],
      tags: ["uec", "ultra-ethernet", "800g", "ai-nic"]
    }
  },
  {
    id: "amd-salina",
    name: "AMD Pensando Salina DPU",
    vendor: "amd",
    kind: "nic",
    nicClass: "dpu",
    tech: "eth-200",
    gbps: 400,
    ports: 2,
    pcieGen: 5,
    pcieLanes: 16,
    watts: 25,
    availableFrom: 2025.25,
    priceUSD: 3e3,
    leadTimeMonths: 4,
    features: ["arm-cores", "p4-programmable", "rdma", "ipsec", "ovs-offload", "tls"],
    codex: {
      summary: "Fourth-generation Pensando DPU with roughly double the throughput of its predecessor and P4-programmable pipelines.",
      explain: "Salina keeps the Pensando P4-programmable packet processors and adds Arm cores, aiming at OVS, TLS and IPsec offload in cloud hosts and appliances rather than GPU rail traffic.",
      tradeoffs: [
        "P4 pipeline skills are scarce; offload code must be written and maintained",
        "400 Gb/s class line rate lags 800G AI NICs: this is a cloud DPU, not a scale-out AI NIC"
      ],
      tags: ["dpu", "p4", "cloud", "amd"]
    }
  },
  {
    id: "cb-thor2",
    name: "Broadcom Thor 2 UEC NIC",
    vendor: "broadcom",
    kind: "nic",
    nicClass: "smartnic",
    tech: "uec-eth",
    gbps: 800,
    ports: 8,
    pcieGen: 5,
    pcieLanes: 16,
    watts: 40,
    availableFrom: 2026,
    priceUSD: 3600,
    leadTimeMonths: 6,
    allocationPerQuarter: 4e3,
    features: ["uec-ready", "rdma", "rocev2", "gpudirect"],
    codex: {
      summary: "Broadcom UEC-ready 800G smart NIC, the NIC-side companion to its Tomahawk and Jericho switch silicon.",
      explain: "Thor 2 targets AI backends that want Tomahawk-class merchant switches plus a multi-vendor UEC NIC instead of a single-vendor fabric, keeping the data plane open.",
      tradeoffs: [
        "Merchant-silicon strategy means fabric software (SONiC/UEC) is yours to integrate",
        "Nicer ecosystem story than NVIDIA only if you can staff it; NIC software stack is newer than MOFED/DOCA"
      ],
      tags: ["uec", "ethernet", "smartnic", "broadcom"]
    }
  },
  {
    id: "intel-e810-2cqda2",
    name: "Intel Ethernet Adapter E810-2CQDA2",
    vendor: "intel",
    kind: "nic",
    nicClass: "nic",
    tech: "eth-100",
    gbps: 200,
    ports: 2,
    pcieGen: 4,
    pcieLanes: 16,
    watts: 15,
    availableFrom: 2021,
    priceUSD: 950,
    leadTimeMonths: 2,
    features: ["rdma", "rocev2", "iwarp", "lldp"],
    codex: {
      summary: "Dual-port 100G Intel adapter, the classic front-end and storage NIC of x86 AI nodes.",
      explain: "E810 (Ice Lake-D lineage) is everywhere in Intel servers for management, storage and East-West traffic; supporting both iWARP and RoCEv2 let Intel shops adopt RDMA without changing fabrics.",
      tradeoffs: [
        "PCIe Gen4 and 100G ports only: fine for front-end, wrong for GPU rail traffic",
        "iWARP vs RoCE means two RDMA dialects in one fleet unless you standardize"
      ],
      tags: ["ethernet", "100g", "frontend", "intel"]
    }
  }
];
const CABLES = [
  {
    id: "gen-dac-100-3m",
    name: "100G DAC copper 3m (QSFP28)",
    vendor: "generic",
    kind: "cable",
    cableType: "dac",
    gbps: 100,
    maxReachM: 3,
    wattsPerEnd: 0.5,
    compatibleTech: ["eth-100", "roce", "ib-hdr"],
    availableFrom: 2018,
    priceUSD: 120,
    leadTimeMonths: 1,
    codex: {
      summary: "Passive twinax copper cable for 100G links inside a rack.",
      explain: "No electronics on board: the switch SERDES drives the copper directly, so DACs cost almost nothing to run, but attenuation kills the signal past a few meters.",
      tradeoffs: [
        "Cheapest and lowest-power link type, but 3-5 m reach only",
        "Stiff twinax bundles make dense ToR wiring a physical problem"
      ],
      tags: ["copper", "dac", "in-rack", "100g"]
    }
  },
  {
    id: "gen-dac-400-2m",
    name: "400G DAC copper 2m (QSFP112)",
    vendor: "generic",
    kind: "cable",
    cableType: "dac",
    gbps: 400,
    maxReachM: 2,
    wattsPerEnd: 1,
    compatibleTech: ["eth-400", "roce", "ib-ndr"],
    availableFrom: 2021.5,
    priceUSD: 350,
    leadTimeMonths: 1,
    codex: {
      summary: "Passive 400G copper jumper for NDR/400G leaf links within a rack.",
      explain: "At 400G the eye margins shrink, so passive twinax tops out near 2 m; anything longer in-rack must step up to ACC or AOC.",
      tradeoffs: [
        "Roughly a quarter of a 400G optic price at ~1 W per end",
        "Two-meter ceiling forces the leaf switch into the same rack as the nodes"
      ],
      tags: ["copper", "dac", "400g"]
    }
  },
  {
    id: "gen-acc-400-4m",
    name: "400G ACC active copper 4m",
    vendor: "generic",
    kind: "cable",
    cableType: "acc",
    gbps: 400,
    maxReachM: 4,
    wattsPerEnd: 2.5,
    compatibleTech: ["eth-400", "roce", "ib-ndr"],
    availableFrom: 2022.5,
    priceUSD: 550,
    leadTimeMonths: 1,
    codex: {
      summary: "Active copper cable: a DSP retimer in each connector stretches 400G copper to about 4 m.",
      explain: "ACCs trade a couple of watts and dollars for reach, bridging the gap between in-rack DAC and between-rack optics.",
      tradeoffs: [
        "About 40% cheaper than a 400G optic with twice the reach of passive DAC",
        "DSP adds 2-3 W per end and a small extra failure population"
      ],
      tags: ["copper", "acc", "400g"]
    }
  },
  {
    id: "gen-acc-800-3m",
    name: "800G ACC active copper 3m",
    vendor: "generic",
    kind: "cable",
    cableType: "acc",
    gbps: 800,
    maxReachM: 3,
    wattsPerEnd: 4,
    compatibleTech: ["eth-800", "ib-xdr", "spectrum-x"],
    availableFrom: 2024,
    priceUSD: 750,
    leadTimeMonths: 1,
    codex: {
      summary: "Active copper for 800G links: the default in-rack cable of NVL72-style builds.",
      explain: "At 800 Gb/s even short twinax needs retimers; ACCs put a DSP in each end and skip lasers entirely, staying far cheaper than 800G optics.",
      tradeoffs: [
        "Roughly a quarter the price of an 800G optic at a fraction of the power",
        "3 m reach keeps leaves and nodes in the same row; cross-row runs need optics"
      ],
      tags: ["copper", "acc", "800g"]
    }
  },
  {
    id: "gen-dac-1600-1m",
    name: "1.6T DAC copper 1m",
    vendor: "generic",
    kind: "cable",
    cableType: "dac",
    gbps: 1600,
    maxReachM: 1,
    wattsPerEnd: 1.5,
    compatibleTech: ["eth-1600", "ib-gdr"],
    availableFrom: 2026.5,
    priceUSD: 1400,
    leadTimeMonths: 2,
    codex: {
      summary: "Passive 1.6T copper jumper for CX-9-era ports, usable only within a chassis or between adjacent trays.",
      explain: "Doubling the rate again halves passive reach, so 1.6T DAC is effectively a backplane technology. This copper wall is exactly why the industry is chasing co-packaged optics.",
      tradeoffs: [
        "Cheapest 1.6T link but about 1 m of reach only",
        "Copper density limits are why 1.6T fabrics lean on CPO at scale"
      ],
      tags: ["copper", "dac", "1600g", "cpo-era"]
    }
  },
  {
    id: "gen-aoc-100-30m",
    name: "100G AOC 30m",
    vendor: "generic",
    kind: "cable",
    cableType: "aoc",
    gbps: 100,
    maxReachM: 30,
    wattsPerEnd: 1.5,
    compatibleTech: ["eth-100", "roce", "ib-hdr"],
    availableFrom: 2018,
    priceUSD: 220,
    leadTimeMonths: 1,
    codex: {
      summary: "Active optical cable: fiber with lasers permanently attached, terminated in copper connectors.",
      explain: "AOCs move DAC-class simplicity into the 10-30 m gap between rack-adjacent and building-scale runs, avoiding pluggable optics and dirty connectors.",
      tradeoffs: [
        "Cheaper and more robust than pluggable optics for fixed runs",
        "Fixed length and no field repair: any rerig means replacing whole cables"
      ],
      tags: ["aoc", "optical", "100g"]
    }
  },
  {
    id: "gen-aoc-400-30m",
    name: "400G AOC 30m",
    vendor: "generic",
    kind: "cable",
    cableType: "aoc",
    gbps: 400,
    maxReachM: 30,
    wattsPerEnd: 3,
    compatibleTech: ["eth-400", "roce", "ib-ndr"],
    availableFrom: 2021.5,
    priceUSD: 500,
    leadTimeMonths: 1,
    codex: {
      summary: "400G active optical cable for same-row and adjacent-row 400G links.",
      explain: "The AOC integrates DSPs and lasers at both ends, trading optical flexibility for a simple plug-and-go part with no connector-loss budget.",
      tradeoffs: [
        "Around 60-70% of a 400G optic price with none of the dirty-connector failures",
        "30 m ceiling: past that you need pluggable DR4/FR4"
      ],
      tags: ["aoc", "optical", "400g"]
    }
  },
  {
    id: "gen-aoc-800-10m",
    name: "800G AOC 10m",
    vendor: "generic",
    kind: "cable",
    cableType: "aoc",
    gbps: 800,
    maxReachM: 10,
    wattsPerEnd: 8,
    compatibleTech: ["eth-800", "ib-xdr"],
    availableFrom: 2024.5,
    priceUSD: 900,
    leadTimeMonths: 2,
    codex: {
      summary: "800G active optical cable for short rack-to-rack hops.",
      explain: "Burying the optics inside the cable avoids the 16 W pluggable-module tax and connector reliability issues, at the cost of fixed lengths.",
      tradeoffs: [
        "8 W per end versus 16 W for a pluggable 800G optic",
        "10 m ceiling and no field repair: failures swap the whole cable"
      ],
      tags: ["aoc", "optical", "800g"]
    }
  },
  {
    id: "gen-sr8-400-70m",
    name: "400G SR8 MMF optic 70m",
    vendor: "generic",
    kind: "cable",
    cableType: "optic-sr",
    gbps: 400,
    maxReachM: 70,
    wattsPerEnd: 3.5,
    compatibleTech: ["eth-400", "ib-ndr", "roce"],
    availableFrom: 2020.5,
    priceUSD: 1600,
    leadTimeMonths: 2,
    codex: {
      summary: "400G SR8 multimode transceiver: the workhorse short-reach 400G optic on OM4 fiber.",
      explain: "SR8 drives 8 parallel 50G VCSEL lanes over an MPO-16 trunk; multimode stays cheaper than single-mode but strictly distance-limited.",
      tradeoffs: [
        "Cheapest 400G option under 70 m with cheap multimode fiber",
        "Past 70 m you must move to single-mode DR4; MPO-16 trunks cost more to rework"
      ],
      tags: ["optic", "multimode", "sr8", "400g"]
    }
  },
  {
    id: "gen-dr4-400-500m",
    name: "400G DR4 SMF optic 500m",
    vendor: "generic",
    kind: "cable",
    cableType: "optic-dr",
    gbps: 400,
    maxReachM: 500,
    wattsPerEnd: 4.5,
    compatibleTech: ["eth-400", "roce", "ib-ndr"],
    availableFrom: 2021,
    priceUSD: 2e3,
    leadTimeMonths: 2,
    codex: {
      summary: "400G DR4 single-mode transceiver reaching 500 m over 8-fiber MPO.",
      explain: "DR4 sends 4 parallel 100G PAM4 lanes over single-mode fiber, covering row-to-spine distances inside a building.",
      tradeoffs: [
        "500 m reach covers nearly every in-building fabric hop",
        "Parallel optics need ribbon MPO fiber plant, pricier per meter than duplex LC"
      ],
      tags: ["optic", "singlemode", "dr4", "400g"]
    }
  },
  {
    id: "gen-fr4-400-2km",
    name: "400G FR4 SMF optic 2km",
    vendor: "generic",
    kind: "cable",
    cableType: "optic-fr",
    gbps: 400,
    maxReachM: 2e3,
    wattsPerEnd: 4,
    compatibleTech: ["eth-400", "roce", "spectrum-x"],
    availableFrom: 2021,
    priceUSD: 1900,
    leadTimeMonths: 2,
    codex: {
      summary: "400G FR4 duplex single-mode transceiver for up to 2 km.",
      explain: "FR4 lambdas four 100G lanes onto one CWDM wavelength grid over ordinary duplex LC fiber, making it the default building-to-building 400G optic.",
      tradeoffs: [
        "Reuses any duplex LC plant: cheapest cabling per meter",
        "2 km reach is wasted inside a hall where DR4/SR8 are cheaper per port"
      ],
      tags: ["optic", "singlemode", "fr4", "400g"]
    }
  },
  {
    id: "gen-sr8-800-70m",
    name: "800G SR8 MMF optic 70m (OSFP)",
    vendor: "generic",
    kind: "cable",
    cableType: "optic-sr",
    gbps: 800,
    maxReachM: 70,
    wattsPerEnd: 16,
    compatibleTech: ["eth-800", "ib-xdr", "spectrum-x"],
    availableFrom: 2024,
    priceUSD: 3200,
    leadTimeMonths: 3,
    codex: {
      summary: "800G SR8 multimode optic (8x100G PAM4, 70 m on OM4): the short-reach 800G standard.",
      explain: "SR8 keeps VCSEL economics at 800G by doubling lane rate to 100G PAM4; its roughly 16 W draw is why 800G switch power budgets got painful.",
      tradeoffs: [
        "Cheapest 800G option under 70 m",
        "16 W per module: 64 ports add more than a kW per switch just in optics"
      ],
      tags: ["optic", "multimode", "sr8", "800g"]
    }
  },
  {
    id: "gen-dr8-800-500m",
    name: "800G DR8 SMF optic 500m",
    vendor: "generic",
    kind: "cable",
    cableType: "optic-dr",
    gbps: 800,
    maxReachM: 500,
    wattsPerEnd: 16,
    compatibleTech: ["eth-800", "ib-xdr", "spectrum-x"],
    availableFrom: 2024.5,
    priceUSD: 3800,
    leadTimeMonths: 3,
    codex: {
      summary: "800G DR8 single-mode optic: 8 parallel 100G lanes to 500 m over MPO-16.",
      explain: "DR8 is the inside-the-building long hop for 800G fat-trees, keeping 100G-per-lane PAM4 but doubling lane count versus DR4.",
      tradeoffs: [
        "500 m reach with mature 100G lane signaling",
        "MPO-16 single-mode ribbon costs more than duplex, and 16 W per end adds up fast"
      ],
      tags: ["optic", "singlemode", "dr8", "800g"]
    }
  },
  {
    id: "gen-2fr4-800-2km",
    name: "800G 2xFR4 SMF optic 2km",
    vendor: "generic",
    kind: "cable",
    cableType: "optic-fr",
    gbps: 800,
    maxReachM: 2e3,
    wattsPerEnd: 18,
    compatibleTech: ["eth-800", "spectrum-x"],
    availableFrom: 2025,
    priceUSD: 4200,
    leadTimeMonths: 3,
    codex: {
      summary: "800G packaged as two FR4 lanes on duplex LC fiber, reaching 2 km.",
      explain: "Putting two CWDM4-style optical submodules in one OSFP module gives 800G over a normal two-fiber plant, ideal for campus-scale spines.",
      tradeoffs: [
        "No ribbon fiber needed: reuses existing duplex plant",
        "Two optical submodules per port make it the priciest 800G flavor"
      ],
      tags: ["optic", "singlemode", "fr4", "800g"]
    }
  },
  {
    id: "gen-dr8-1600-500m",
    name: "1.6T DR8 SMF optic 500m",
    vendor: "generic",
    kind: "cable",
    cableType: "optic-dr",
    gbps: 1600,
    maxReachM: 500,
    wattsPerEnd: 22,
    compatibleTech: ["eth-1600", "ib-gdr"],
    availableFrom: 2026.5,
    priceUSD: 6500,
    leadTimeMonths: 3,
    codex: {
      summary: "1.6T DR8 optic: 8x200G PAM4 lanes to 500 m, the first 1.6T-class transceiver.",
      explain: "Doubling lane rate to 200G PAM4 keeps the 8-lane MPO geometry of DR8 while doubling throughput for ConnectX-9 / Quantum-X / Spectrum-X generation fabrics.",
      tradeoffs: [
        "About 22 W per end: optics now out-draw small switches",
        "200G lanes sit at the edge of signaling capability, so early units have tight margins"
      ],
      tags: ["optic", "singlemode", "1600g", "cpo-era"]
    }
  },
  {
    id: "nv-nvlink5-spine-cu",
    name: "NVLink5 spine copper harness",
    vendor: "nvidia",
    kind: "cable",
    cableType: "nvlink-spine",
    gbps: 14400,
    maxReachM: 1.5,
    wattsPerEnd: 1,
    compatibleTech: ["nvlink5", "nvlink6"],
    availableFrom: 2024.9,
    priceUSD: 2500,
    leadTimeMonths: 5,
    codex: {
      summary: "The passive copper harness linking GB200 compute trays to NVLink5 switch trays in an NVL72-class rack.",
      explain: "Each superchip gets 1.8 TB/s (14.4 Tb/s) across the spine, and keeping every hop under about 1.3 m of copper is exactly why a 72-GPU coherent domain is one liquid-cooled rack.",
      tradeoffs: [
        "Passive copper makes a 130 kW memory-coherent domain possible, and pins it to a single rack",
        "A harness fault partitions the domain: redundancy is per-link, not per-rack"
      ],
      tags: ["nvlink", "copper", "scale-up", "nvl72"]
    }
  },
  {
    id: "gen-rack-power-c19",
    name: "Rack power cord C19/C20 3m",
    vendor: "generic",
    kind: "cable",
    cableType: "power",
    gbps: 0,
    maxReachM: 3,
    wattsPerEnd: 0,
    compatibleTech: [],
    availableFrom: 2016,
    priceUSD: 25,
    leadTimeMonths: 1,
    codex: {
      summary: "Heavy IEC C19/C20 jumper cord (230 V, 16 A) from PDU to server PSU.",
      explain: "One C19 circuit delivers at most about 4 kW, so high-density trays exceed cord-count sanity long before rack power does; that is why ORv3 and NVL racks moved to busbars and busway.",
      tradeoffs: [
        "Cord jungle above 20 kW per rack: busbar designs eliminate it entirely",
        "IEC ratings are amp-limited; derate for hot aisles and long runs"
      ],
      tags: ["power", "pdu", "iec"]
    }
  },
  {
    id: "gen-liquid-hose-2in",
    name: "Liquid cooling hose set 2in QD",
    vendor: "generic",
    kind: "cable",
    cableType: "liquid-hose",
    gbps: 0,
    maxReachM: 20,
    wattsPerEnd: 0,
    compatibleTech: [],
    availableFrom: 2022,
    priceUSD: 250,
    leadTimeMonths: 1,
    codex: {
      summary: "Two-inch supply/return hose set with quick-disconnects linking rack manifolds to CDU loops.",
      explain: "Direct-liquid racks push 100+ kW of heat through these hoses; drips on disconnect are the operational nightmare, so loops are built N+1 with leak detection.",
      tradeoffs: [
        "One wet connection can trip an entire row: leak detection and dripless QDs are mandatory",
        "About 20 m practical rack-to-CDU distance reshapes the whole floor layout"
      ],
      tags: ["liquid", "dlc", "cdu", "facility"]
    }
  }
];
const SWITCHES = [
  {
    id: "nv-nvswitch2",
    name: "NVSwitch Gen2 (Ampere baseboard chip)",
    vendor: "nvidia",
    kind: "switch",
    role: "scale-up",
    tech: "nvlink3",
    availableFrom: 2020.5,
    eolAfter: 2024.5,
    priceUSD: 1200,
    leadTimeMonths: 3,
    portCount: 16,
    portGbps: 400,
    capacityTbps: 6.4,
    rackUnits: 0,
    watts: 20,
    cooling: ["air"],
    inNetworkCompute: false,
    features: ["nvlink3", "baseboard-crossbar", "6-per-hgx-a100"],
    codex: {
      summary: "Ampere-generation NVSwitch chip that glues 8 A100s into one NVLink3 domain on every HGX A100 baseboard.",
      explain: "Six of these chips per baseboard crossbar the 96 NVLink3 links so all 8 GPUs reach each other at 600 GB/s each. DGX SuperPOD racks add standalone switch tiers to stitch multiple boards into one addressable fabric.",
      tradeoffs: [
        "Full bisection only inside the 8-GPU board - bigger domains need extra tiers, latency and cost",
        "Fixed 400 Gb/s link rate matches Ampere; unusable with later GPU generations"
      ],
      tags: ["nvswitch", "nvlink3", "ampere", "scale-up"]
    }
  },
  {
    id: "nv-nvswitch3",
    name: "NVSwitch Gen3 chip (64x NVLink4, SHARP)",
    vendor: "nvidia",
    kind: "switch",
    role: "scale-up",
    tech: "nvlink4",
    availableFrom: 2022.75,
    priceUSD: 2500,
    leadTimeMonths: 3,
    portCount: 64,
    portGbps: 400,
    capacityTbps: 25.6,
    rackUnits: 0,
    watts: 50,
    cooling: ["air"],
    inNetworkCompute: true,
    features: ["nvlink4", "sharp", "standalone-l1-l2", "hgx-h100"],
    codex: {
      summary: "Hopper-generation NVSwitch chip with 64 NVLink4 ports and SHARP in-network reduction.",
      explain: "Four per HGX H100 baseboard; the same silicon in standalone 1U NVLink Switch units builds SHARP trees that extend NVLink domains to SuperPOD scale. SHARP executes AllReduce-style collectives inside the fabric, cutting latency and freeing GPU cycles.",
      tradeoffs: [
        "SHARP gains shrink if fabric tiers are oversubscribed",
        "Domains stay node-scale (8-32 GPUs) versus Blackwell rack-scale NVL72"
      ],
      tags: ["nvswitch", "nvlink4", "sharp", "hopper", "scale-up"]
    }
  },
  {
    id: "nv-nvlink-switch-tray5",
    name: "NVLink Switch Tray Gen5 (GB200/GB300 NVL72)",
    vendor: "nvidia",
    kind: "switch",
    role: "scale-up",
    tech: "nvlink5",
    availableFrom: 2024.85,
    priceUSD: 15e4,
    leadTimeMonths: 9,
    portCount: 72,
    portGbps: 14400,
    capacityTbps: 1036.8,
    rackUnits: 1,
    watts: 2500,
    cooling: ["dlc"],
    inNetworkCompute: true,
    features: ["nvlink5", "18-nvswitch5-chips", "copper-backplane", "sharp", "mgx-tray"],
    codex: {
      summary: "Liquid-cooled tray of 18 NVSwitch Gen5 chips that fuses 72 Blackwell GPUs into a single memory domain in GB200/GB300 NVL72 racks.",
      explain: "Each GPU connects at 1.8 TB/s bidirectional through a copper backplane, giving 130 TB/s all-to-all bandwidth with in-fabric collectives. Two trays per NVL72 replace the entire top-of-rack switch concept for scale-up.",
      tradeoffs: [
        "The only way to get NVLink domains larger than one HGX board for Blackwell",
        "Copper backplane reach confines the domain to one rack; power and price are rack-BOM scale"
      ],
      tags: ["nvlink5", "nvl72", "blackwell", "mgx", "scale-up"]
    }
  },
  {
    id: "nv-nvlink-switch-tray6",
    name: "NVLink Switch Tray Gen6 (Vera Rubin NVL144)",
    vendor: "nvidia",
    kind: "switch",
    role: "scale-up",
    tech: "nvlink6",
    availableFrom: 2026.75,
    priceUSD: 25e4,
    leadTimeMonths: 9,
    portCount: 144,
    portGbps: 20800,
    capacityTbps: 2995.2,
    rackUnits: 1,
    watts: 4e3,
    cooling: ["dlc"],
    inNetworkCompute: true,
    features: ["nvlink6", "rubin", "copper-backplane", "sharp", "mgx-tray"],
    codex: {
      summary: "Sixth-generation NVLink switch tray for Vera Rubin NVL144, roughly tripling rack-scale NVLink bandwidth.",
      explain: "Rubin dies connect at ~2.6 TB/s each over NVLink6, enabling 144-GPU single domains that giant MoE expert-parallel training wants. Ships on the announced 2026 roadmap as part of the VR200 NVL144 rack.",
      tradeoffs: [
        "Roadmap part: dates and pricing carry real schedule risk",
        "Requires liquid-cooled MGX racks; cannot retrofit into air-cooled halls"
      ],
      tags: ["nvlink6", "rubin", "nvl144", "scale-up", "roadmap"]
    }
  },
  {
    id: "nv-qm9700",
    name: "NVIDIA Quantum-2 QM9700 (NDR IB)",
    vendor: "nvidia",
    kind: "switch",
    role: "scale-out",
    tech: "ib-ndr",
    availableFrom: 2022,
    priceUSD: 45e3,
    leadTimeMonths: 6,
    portCount: 64,
    portGbps: 400,
    capacityTbps: 25.6,
    rackUnits: 1,
    watts: 400,
    cooling: ["air"],
    inNetworkCompute: true,
    features: ["sharp", "rdma", "adaptive-routing", "self-healing"],
    codex: {
      summary: "Quantum-2 InfiniBand switch: 64x 400G NDR ports in 1U, the backbone of 2022-2025 AI training fabrics.",
      explain: "25.6 Tb/s of RDMA with SHARP in-network collectives, adaptive routing and self-healing failover. It carried the GPT-4-generation clusters, where optics often cost as much as the switch itself.",
      tradeoffs: [
        "Lowest tail latency for collectives, but InfiniBand is a niche fabric with scarce ops talent",
        "400G optics/DAC BOM can add 50-100% on top of switch capex"
      ],
      tags: ["infiniband", "ndr", "sharp", "scale-out"]
    }
  },
  {
    id: "nv-qmx8000",
    name: "NVIDIA Quantum-X800 QMX8000 (XDR IB)",
    vendor: "nvidia",
    kind: "switch",
    role: "scale-out",
    tech: "ib-xdr",
    availableFrom: 2024.75,
    priceUSD: 15e4,
    leadTimeMonths: 6,
    portCount: 144,
    portGbps: 800,
    capacityTbps: 115.2,
    rackUnits: 1,
    watts: 800,
    cooling: ["air"],
    inNetworkCompute: true,
    features: ["sharp", "rdma", "xdr-collectives", "adaptive-routing"],
    codex: {
      summary: "Quantum-X800: 144x 800G XDR InfiniBand delivering 115.2 Tb/s in 1U for Blackwell-era fabrics.",
      explain: "Halving switch count versus NDR halves optics, power and rail complexity when each node feeds 800G. Extends SHARP to XDR-rate collectives alongside ConnectX-8 NICs.",
      tradeoffs: [
        "800G optics are expensive and supply-limited at launch",
        "Only pays off when nodes actually source/sink 800G (GB200/GB300-class racks)"
      ],
      tags: ["infiniband", "xdr", "sharp", "blackwell-era", "scale-out"]
    }
  },
  {
    id: "nv-sn5600",
    name: "NVIDIA Spectrum-4 SN5600 (800G Ethernet)",
    vendor: "nvidia",
    kind: "switch",
    role: "scale-out",
    tech: "eth-800",
    availableFrom: 2023.9,
    priceUSD: 4e4,
    leadTimeMonths: 4,
    portCount: 64,
    portGbps: 800,
    capacityTbps: 51.2,
    rackUnits: 1,
    watts: 650,
    cooling: ["air"],
    inNetworkCompute: false,
    features: ["rocev2", "pfc", "ecn", "telemetry", "vxlan"],
    codex: {
      summary: "Spectrum-4 SN5600: 64x 800G Ethernet switch (51.2 Tb/s) that is also the silicon behind Spectrum-X AI Ethernet.",
      explain: "One merchant-class 51.2T ASIC with full PFC/ECN and telemetry for RoCEv2 lossless Ethernet. The same family serves plain datacenter fabrics and Spectrum-X AI fabrics when paired with BlueField SuperNICs.",
      tradeoffs: [
        "Ethernet economics and ops familiarity, but lossless behavior needs ECN/PFC discipline",
        "Shared-buffer Ethernet can still drop under incast without careful tuning"
      ],
      tags: ["ethernet", "800g", "roce", "spectrum", "scale-out"]
    }
  },
  {
    id: "nv-sn6800",
    name: "NVIDIA Spectrum-X800 SN6800 (1.6T Ethernet)",
    vendor: "nvidia",
    kind: "switch",
    role: "scale-out",
    tech: "spectrum-x",
    availableFrom: 2026.4,
    priceUSD: 12e4,
    leadTimeMonths: 6,
    portCount: 64,
    portGbps: 1600,
    capacityTbps: 102.4,
    rackUnits: 2,
    watts: 1e3,
    cooling: ["air"],
    inNetworkCompute: false,
    features: ["adaptive-routing", "congestion-control", "telemetry", "spectrum-x", "1.6t-ports"],
    codex: {
      summary: "Spectrum-X800 SN6800: 102.4 Tb/s Ethernet switch with 64x 1.6T ports for Rubin-era Spectrum-X AI fabrics.",
      explain: "Spectrum-X co-designs switch and BlueField SuperNIC so adaptive routing, congestion control and telemetry make standard Ethernet behave losslessly for AI traffic. SN6800 doubles per-port rate to 1.6T, sized for VR200 NVL144 rack uplinks.",
      tradeoffs: [
        "Lossless claims depend on an all-NVIDIA NIC+switch stack",
        "1.6T optics ecosystem is immature; short-reach DACs come first"
      ],
      tags: ["spectrum-x", "ethernet", "1.6t", "rubin-era", "scale-out"]
    }
  },
  {
    id: "ar-7060x6",
    name: "Arista 7060X6 64x800G (Tomahawk 5)",
    vendor: "arista",
    kind: "switch",
    role: "scale-out",
    tech: "eth-800",
    availableFrom: 2023.5,
    priceUSD: 85e3,
    leadTimeMonths: 3,
    portCount: 64,
    portGbps: 800,
    capacityTbps: 51.2,
    rackUnits: 2,
    watts: 1100,
    cooling: ["air"],
    inNetworkCompute: false,
    features: ["rocev2", "tomahawk5", "eos", "cloudvision", "vxlan-evpn"],
    codex: {
      summary: "Arista 7060X6: 64x 800G (128x 400G) Tomahawk 5 leaf/spine switch at 51.2 Tb/s.",
      explain: "The merchant-silicon alternative to NVIDIA switching, running EOS with CloudVision automation and solid RoCEv2 for AI backends. A common pick for Ethernet-first AI clusters and for converged storage networks.",
      tradeoffs: [
        "No SHARP-style in-network compute: RoCE collectives burn more host cycles",
        "EOS operational model is superb, but fabric tuning for AI is on you"
      ],
      tags: ["arista", "ethernet", "800g", "tomahawk5", "scale-out"]
    }
  },
  {
    id: "ar-7800r4",
    name: "Arista 7800R4 AI Spine (Jericho3-AI)",
    vendor: "arista",
    kind: "switch",
    role: "scale-out",
    tech: "eth-800",
    availableFrom: 2023.25,
    priceUSD: 55e4,
    leadTimeMonths: 4,
    portCount: 144,
    portGbps: 800,
    capacityTbps: 115.2,
    rackUnits: 13,
    watts: 8500,
    cooling: ["air"],
    inNetworkCompute: false,
    features: ["jericho3ai", "deep-buffer", "modular", "cloudvision", "non-blocking-spine"],
    codex: {
      summary: "Arista 7800R4 modular spine with Jericho3-AI: 115.2 Tb/s and deep buffers for non-blocking AI spines.",
      explain: "Jericho-class large packet buffers absorb incast that shallow Ethernet ASICs drop, letting rail-optimized fabrics stay lossless without perfect tuning. One chassis of 800G line cards replaces several spine tiers.",
      tradeoffs: [
        "Deep buffers trade a little latency for loss resilience - great for collectives and storage",
        "Big chassis capex and slow refresh cycles versus fixed-form 1U switches"
      ],
      tags: ["arista", "spine", "deep-buffer", "800g", "scale-out"]
    }
  },
  {
    id: "bc-tomahawk6-sw",
    name: "Tomahawk 6 102.4T Switch (reference platform)",
    vendor: "broadcom",
    kind: "switch",
    role: "scale-out",
    tech: "eth-1600",
    availableFrom: 2026,
    priceUSD: 95e3,
    leadTimeMonths: 6,
    portCount: 64,
    portGbps: 1600,
    capacityTbps: 102.4,
    rackUnits: 2,
    watts: 1500,
    cooling: ["air"],
    inNetworkCompute: false,
    features: ["tomahawk6", "1.6t", "uec-ready", "rocev2", "pam4-dac"],
    codex: {
      summary: "First 102.4 Tb/s Ethernet switch platforms built on Broadcom Tomahawk 6 (64x 1.6T or 128x 800G).",
      explain: "TH6 doubles Tomahawk 5 capacity and targets Ultra Ethernet Consortium scale-out AI fabrics. ODMs like Celestica and Wistron ship it as the merchant leaf/spine option outside NVIDIA lock-in.",
      tradeoffs: [
        "UEC congestion-control stack is still standardizing; early adopters carry integration risk",
        "1.6T electrical DAC reach is only a meter or two - spine links need optics"
      ],
      tags: ["broadcom", "ethernet", "1.6t", "uec", "tomahawk6", "scale-out"]
    }
  },
  {
    id: "cs-n9364e",
    name: "Cisco Nexus 9364E-SG2 (64x400G)",
    vendor: "cisco",
    kind: "switch",
    role: "scale-out",
    tech: "eth-400",
    availableFrom: 2021.5,
    priceUSD: 7e4,
    leadTimeMonths: 3,
    portCount: 64,
    portGbps: 400,
    capacityTbps: 25.6,
    rackUnits: 2,
    watts: 1200,
    cooling: ["air"],
    inNetworkCompute: false,
    features: ["silicon-one", "rocev2", "vxlan-evpn", "aci", "nexus-dashboard"],
    codex: {
      summary: "Cisco Nexus 9364E-SG2: 64x 400G switch on Cisco Silicon One for AI backends or DC fabric.",
      explain: "The G100 ASIC does credible RoCEv2 for AI work while NX-OS/ACI keep enterprise features shops already operate. Frequently chosen when the datacenter is a Cisco house politically.",
      tradeoffs: [
        "AI-fabric tooling is younger than NVIDIA or Arista equivalents",
        "Enterprise feature set adds power and cost per port"
      ],
      tags: ["cisco", "ethernet", "400g", "silicon-one", "scale-out"]
    }
  },
  {
    id: "gen-ualink-sw",
    name: "UALink 1.0 Scale-Up Switch (1024-domain)",
    vendor: "generic",
    kind: "switch",
    role: "scale-up",
    tech: "ualink",
    availableFrom: 2027,
    priceUSD: 8e4,
    leadTimeMonths: 9,
    portCount: 128,
    portGbps: 1600,
    capacityTbps: 204.8,
    rackUnits: 1,
    watts: 900,
    cooling: ["air", "dlc"],
    inNetworkCompute: false,
    features: ["ualink-1.0", "mem-semantic", "load-store", "open-spec", "1024-endpoints"],
    codex: {
      summary: "UALink 1.0 scale-up switch: an open, memory-semantic fabric meant to rival NVLink across up to 1024 accelerators.",
      explain: "UALink is the AMD/Broadcom/Intel-led open spec (1.0 published 2025) doing load/store memory semantics over 200G lanes; first switch chips pair with AMD MI400 Helios racks in 2026-2027. This entry is a representative spec-level part, not a shipping SKU.",
      tradeoffs: [
        "Open multi-vendor ecosystem versus NVLink: cheaper ports but a much younger software stack",
        "Memory-semantic switching is harder than packet forwarding; first-gen silicon runs hot"
      ],
      tags: ["ualink", "open-fabric", "scale-up", "amd-ecosystem", "roadmap"]
    }
  },
  {
    id: "nv-sn3700c",
    name: "NVIDIA Spectrum-2 SN3700C (64x100G frontend)",
    vendor: "nvidia",
    kind: "switch",
    role: "frontend",
    tech: "eth-100",
    availableFrom: 2019.25,
    priceUSD: 1e4,
    leadTimeMonths: 2,
    portCount: 64,
    portGbps: 100,
    capacityTbps: 6.4,
    rackUnits: 1,
    watts: 215,
    cooling: ["air"],
    inNetworkCompute: false,
    features: ["rocev2", "vxlan", "pfc", "storage-network"],
    codex: {
      summary: "Spectrum-2 SN3700C: 64x 100G Ethernet ToR for frontend, storage and user-facing traffic.",
      explain: "Not every network in an AI DC is a 400G collective fabric: API ingress, NFS/S3 frontends and dataset staging ride cheaper 100G. SN3700C does RoCEv2 and VXLAN at 6.4 Tb/s in 1U.",
      tradeoffs: [
        "About a tenth of the per-port cost of 800G AI-fabric ports",
        "Never route training collectives over it - it becomes the bottleneck instantly"
      ],
      tags: ["ethernet", "100g", "frontend", "storage", "tor"]
    }
  },
  {
    id: "ar-7010t48",
    name: "Arista 7010T-48 (1G OOB management)",
    vendor: "arista",
    kind: "switch",
    role: "oob",
    tech: "eth-100",
    availableFrom: 2016,
    priceUSD: 4e3,
    leadTimeMonths: 1,
    portCount: 48,
    portGbps: 1,
    capacityTbps: 0.176,
    rackUnits: 1,
    watts: 60,
    cooling: ["air"],
    inNetworkCompute: false,
    features: ["rj45", "10g-sfp-uplinks", "bmc-mgmt", "oob"],
    codex: {
      summary: "Arista 7010T-48: 48x 1G copper switch for the out-of-band management network.",
      explain: "OOB carries BMC/IPMI, switch console and PDU control on a path fully separate from production fabrics, so you can still reach gear when the AI network or its software stack melts down. 1G copper matches every server BMC port and costs almost nothing.",
      tradeoffs: [
        "Tiny bandwidth, but it only moves KVM, sensors and consoles",
        "Skipping OOB separation is a classic outage amplifier at rack scale"
      ],
      tags: ["oob", "management", "1g", "bmc"]
    }
  }
];
const CHASSIS = [
  {
    kind: "chassis",
    id: "nv-hgx-a100-8gy",
    name: "NVIDIA HGX A100 8-GPU baseboard (8U server)",
    vendor: "nvidia",
    availableFrom: 2020.85,
    eolAfter: 2025,
    priceUSD: 55e3,
    leadTimeMonths: 3,
    rackUnits: 8,
    rackStandard: "19in",
    slots: [
      { kind: "accelerator", count: 8, accepts: ["sxm"], required: 8 },
      { kind: "cpu", count: 2, accepts: ["x86"], required: 2 },
      { kind: "dimm", count: 16, accepts: ["ddr4"], required: 8 },
      { kind: "nic", count: 8, required: 2 },
      { kind: "nvme", count: 8, required: 2 },
      { kind: "psu", count: 4, required: 4 }
    ],
    baseboard: { scaleUp: "nvlink3", domainSize: 8, includesSwitchChips: true },
    cooling: "air",
    overheadW: 1e3,
    maxPowerW: 6500,
    weightKg: 95,
    pcieLanesAvail: 128,
    maxAirWattsPerU: 800,
    codex: {
      summary: "The 8-GPU SXM4 baseboard that defined the AI-server template: 8 A100s wired through 6 NVSwitch chips into one NVLink3 domain.",
      explain: "HGX is NVIDIA's reference GPU board that ODMs (Supermicro, Dell, Gigabyte...) wrap in a chassis; buying GPUs plus this board is how a DGX-class box gets built. All 8 GPUs share a coherent NVLink domain so tensor-parallel training sees 8 GPUs as one fast machine.",
      tradeoffs: [
        "NVSwitch chips are on the board - no separate scale-up switch to buy",
        "Air-cooled at ~6.5kW in 8U; near the practical limit of air"
      ],
      tags: ["hgx", "nvlink", "nvswitch", "dgx"]
    }
  },
  {
    kind: "chassis",
    id: "nv-hgx-h100-8gy",
    name: "NVIDIA HGX H100/H200 8-GPU baseboard (8U server)",
    vendor: "nvidia",
    availableFrom: 2022.9,
    priceUSD: 75e3,
    leadTimeMonths: 3,
    rackUnits: 8,
    rackStandard: "19in",
    slots: [
      { kind: "accelerator", count: 8, accepts: ["sxm"], required: 8 },
      { kind: "cpu", count: 2, accepts: ["x86"], required: 2 },
      { kind: "dimm", count: 32, accepts: ["ddr5"], required: 16 },
      { kind: "nic", count: 8, required: 2 },
      { kind: "dpu", count: 2 },
      { kind: "nvme", count: 8, required: 2 },
      { kind: "psu", count: 6, required: 4 }
    ],
    baseboard: { scaleUp: "nvlink4", domainSize: 8, includesSwitchChips: true },
    cooling: "air",
    overheadW: 1500,
    maxPowerW: 10500,
    weightKg: 130,
    pcieLanesAvail: 128,
    maxAirWattsPerU: 1300,
    codex: {
      summary: "Fourth-gen NVLink baseboard: 8 H100/H200 GPUs, 4 NVSwitch3 chips with in-network SHARP reductions, 900 GB/s per GPU.",
      explain: "The workhorse of the 2023-24 build-out; the same board takes H100 or H200, so memory can be upgraded without touching the fabric. 10.2kW in 8U is about the densest thing that still reliably air-cools.",
      tradeoffs: [
        "SHARP in the NVSwitches accelerates allreduce - scale-up is not just fast links",
        "H200 drop-in doubles HBM to 141GB but pushes power and price up"
      ],
      tags: ["hgx", "nvlink4", "hopper", "sharp"]
    }
  },
  {
    kind: "chassis",
    id: "nv-hgx-b200-8gy",
    name: "NVIDIA HGX B200/B300 8-GPU baseboard (8U server)",
    vendor: "nvidia",
    availableFrom: 2025,
    priceUSD: 12e4,
    leadTimeMonths: 4,
    allocationPerQuarter: 60,
    rackUnits: 8,
    rackStandard: "19in",
    slots: [
      { kind: "accelerator", count: 8, accepts: ["sxm"], required: 8 },
      { kind: "cpu", count: 2, accepts: ["x86"], required: 2 },
      { kind: "dimm", count: 32, accepts: ["ddr5", "mrdimm"], required: 16 },
      { kind: "nic", count: 8, required: 2 },
      { kind: "nvme", count: 8, required: 2 },
      { kind: "psu", count: 6, required: 6 },
      { kind: "coldplate", count: 8, required: 8 }
    ],
    baseboard: { scaleUp: "nvlink5", domainSize: 8, includesSwitchChips: true },
    cooling: "dlc",
    overheadW: 1800,
    maxPowerW: 15500,
    weightKg: 140,
    pcieLanesAvail: 128,
    codex: {
      summary: "Blackwell-generation HGX: 8 B200/B300 SXM modules at 1-1.4kW each, liquid-cooled, NVLink5 at 1.8 TB/s per GPU.",
      explain: "Beyond ~1kW per GPU, air stops working - this board assumes direct-to-chip cold plates on every module. Domain is still 8 GPUs per board; going to 72 needs the NVL72 rack architecture instead.",
      tradeoffs: [
        "Requires a liquid hall/CDU - no air fallback at 15kW per box",
        "B300 (Blackwell Ultra) drops in for 288GB HBM3e but needs every cold plate seated"
      ],
      tags: ["hgx", "blackwell", "nvlink5", "liquid"]
    }
  },
  {
    kind: "chassis",
    id: "nv-gb200-nvl72-ct",
    name: "NVIDIA GB200 NVL72 compute tray (MGX)",
    vendor: "nvidia",
    availableFrom: 2024.75,
    priceUSD: 65e3,
    leadTimeMonths: 5,
    allocationPerQuarter: 36,
    rackUnits: 2,
    rackStandard: "nvl-mgx",
    slots: [
      { kind: "accelerator", count: 2, accepts: ["superchip"], required: 2 },
      { kind: "nic", count: 4, required: 4 },
      { kind: "nvme", count: 4, required: 2 }
    ],
    baseboard: { scaleUp: "nvlink5", domainSize: 72, includesSwitchChips: false },
    cooling: "dlc",
    overheadW: 400,
    maxPowerW: 6e3,
    weightKg: 90,
    pcieLanesAvail: 96,
    codex: {
      summary: "One compute tray of the GB200 NVL72 rack: two Grace-Blackwell superchips (4 GPUs) fed by busbar and cooled by liquid.",
      explain: "18 of these trays plus 9 NVLink switch trays form the NVL72 - one NVLink5 domain of 72 GPUs acting as a single GPU with 130 TB/s of fabric. The tray itself has no PSUs; 48V comes from the rack busbar, so it only works in an MGX/ORv3-style rack.",
      tradeoffs: [
        "Domain of 72 spans the whole rack via switch trays - you must buy and place those too",
        "No air option: NVL72 pulls ~120-132kW per rack through liquid"
      ],
      tags: ["nvl72", "gb200", "mgx", "rack-scale"]
    }
  },
  {
    kind: "chassis",
    id: "sm-ubb-oam8-mi300x",
    name: "Supermicro AS-8125GS (MI300X UBB, 8U)",
    vendor: "supermicro",
    availableFrom: 2023.9,
    priceUSD: 42e3,
    leadTimeMonths: 3,
    rackUnits: 8,
    rackStandard: "19in",
    slots: [
      { kind: "accelerator", count: 8, accepts: ["oam"], required: 8 },
      { kind: "cpu", count: 2, accepts: ["x86"], required: 2 },
      { kind: "dimm", count: 24, accepts: ["ddr5"], required: 12 },
      { kind: "nic", count: 8, required: 2 },
      { kind: "nvme", count: 6, required: 2 },
      { kind: "psu", count: 4, required: 4 }
    ],
    baseboard: { scaleUp: "infinity-fabric", domainSize: 8, includesSwitchChips: false },
    cooling: "air",
    overheadW: 1200,
    maxPowerW: 10400,
    weightKg: 120,
    pcieLanesAvail: 128,
    maxAirWattsPerU: 1300,
    codex: {
      summary: "AMD's answer to HGX: the UBB (Universal Baseboard) hosting 8 OAM-accelerator modules (MI300X/MI325X) linked by Infinity Fabric.",
      explain: "OAM is the open-module standard (OCP) AMD spearheaded, so baseboards come from Supermicro, Gigabyte and others rather than one vendor. Eight MI300X GPUs form a fully-connected Infinity Fabric domain of 8 with 896 GB/s per GPU - no separate switch silicon.",
      tradeoffs: [
        "No NVSwitch equivalent: fabric is direct GPU-to-GPU links on the UBB",
        "8x 750W air-cooled in 8U is right at the edge - hot aisles must stay tight"
      ],
      tags: ["ubb", "oam", "mi300x", "infinity-fabric"]
    }
  },
  {
    kind: "chassis",
    id: "gig-ubb-oam8-lq",
    name: "Gigabyte G493 UBB liquid (MI325X/MI355X, 8U)",
    vendor: "gigabyte",
    availableFrom: 2024.9,
    priceUSD: 52e3,
    leadTimeMonths: 3,
    rackUnits: 8,
    rackStandard: "19in",
    slots: [
      { kind: "accelerator", count: 8, accepts: ["oam"], required: 8 },
      { kind: "cpu", count: 2, accepts: ["x86"], required: 2 },
      { kind: "dimm", count: 24, accepts: ["ddr5"], required: 12 },
      { kind: "nic", count: 8, required: 2 },
      { kind: "nvme", count: 6, required: 2 },
      { kind: "psu", count: 4, required: 4 },
      { kind: "coldplate", count: 8, required: 8 }
    ],
    baseboard: { scaleUp: "infinity-fabric", domainSize: 8, includesSwitchChips: false },
    cooling: "dlc",
    overheadW: 1200,
    maxPowerW: 16e3,
    weightKg: 130,
    pcieLanesAvail: 128,
    codex: {
      summary: "Liquid-cooled 8-OAM UBB server for the 1kW+ MI355X generation of AMD accelerators.",
      explain: "When AMD modules crossed 1kW (MI355X at 1.4kW), the same UBB moved from air to direct liquid with cold plates. Same Infinity Fabric domain of 8, but the box now depends on facility coolant loops.",
      tradeoffs: [
        "DLC removes the air limit but couples uptime to CDU reliability",
        "8x MI355X = 288GB HBM3e per GPU - best memory-per-GPU of its generation"
      ],
      tags: ["ubb", "mi355x", "liquid", "infinity-fabric"]
    }
  },
  {
    kind: "chassis",
    id: "tt-galaxy-4u",
    name: "Tenstorrent Galaxy 4U (32-chip mesh server)",
    vendor: "tenstorrent",
    availableFrom: 2023.5,
    priceUSD: 1e4,
    leadTimeMonths: 2,
    rackUnits: 4,
    rackStandard: "19in",
    slots: [
      { kind: "accelerator", count: 1, accepts: ["rack-scale"], required: 1 },
      { kind: "cpu", count: 1, accepts: ["x86"], required: 1 },
      { kind: "dimm", count: 8, accepts: ["ddr4", "ddr5"], required: 4 },
      { kind: "nic", count: 2, required: 1 },
      { kind: "psu", count: 4, required: 4 }
    ],
    baseboard: { scaleUp: "tt-ethernet-mesh", domainSize: 32, includesSwitchChips: true },
    cooling: "air",
    overheadW: 800,
    maxPowerW: 5500,
    weightKg: 80,
    pcieLanesAvail: 48,
    maxAirWattsPerU: 1400,
    codex: {
      summary: "Tenstorrent's scale-up argument in metal: a 4U box whose 32 Wormhole chips mesh over plain on-die Ethernet - no NVLink, no InfiniBand.",
      explain: "The Galaxy ships as one integrated unit (the 32-chip mesh assembly plus enclosure, PSUs and host node), pre-wired into a 2D torus using the same 100GbE PHYs it uses for scale-out. Up to four Galaxies mesh into a 128-chip pod over QSFP-DD.",
      tradeoffs: [
        "Scale-up fabric costs nothing extra - it is the chips' own Ethernet links",
        "Ethernet-class latency and GDDR6 bandwidth, not NVLink-class - software must cope"
      ],
      tags: ["galaxy", "wormhole", "ethernet", "mesh"]
    }
  },
  {
    kind: "chassis",
    id: "cb-cs3-cab",
    name: "Cerebras CS-3 cabinet",
    vendor: "cerebras",
    availableFrom: 2024.3,
    priceUSD: 6e4,
    leadTimeMonths: 6,
    allocationPerQuarter: 20,
    rackUnits: 15,
    rackStandard: "19in",
    slots: [
      { kind: "accelerator", count: 1, accepts: ["wafer"], required: 1 },
      { kind: "nic", count: 4, required: 2 },
      { kind: "nvme", count: 8, required: 2 },
      { kind: "psu", count: 6, required: 6 }
    ],
    baseboard: { scaleUp: "wafer", domainSize: 2048, includesSwitchChips: true },
    cooling: "dlc",
    overheadW: 2e3,
    maxPowerW: 28e3,
    weightKg: 900,
    pcieLanesAvail: 64,
    codex: {
      summary: "The purpose-built cabinet that houses one WSE-3 wafer plus its power, cooling and I/O train.",
      explain: "A CS-3 is delivered as an appliance: ~23kW for the wafer alone, fed by redundant supplies and a cold-plate loop in the cabinet. Weights stream from the separate MemoryX/SwarmX tiers, which Cerebras sells as an attached storage/interconnect system.",
      tradeoffs: [
        "One SKU, one wafer - no mixing vendors or upgrading piecemeal",
        "23kW in 15U means dedicated liquid and structural floor loading"
      ],
      tags: ["cs-3", "wse-3", "wafer-scale", "appliance"]
    }
  },
  {
    kind: "chassis",
    id: "int-gaudi3-hls",
    name: "Intel Gaudi 3 HLS 8-OAM baseboard (8U)",
    vendor: "intel",
    availableFrom: 2024.5,
    priceUSD: 4e4,
    leadTimeMonths: 3,
    rackUnits: 8,
    rackStandard: "19in",
    slots: [
      { kind: "accelerator", count: 8, accepts: ["oam"], required: 8 },
      { kind: "cpu", count: 2, accepts: ["x86"], required: 2 },
      { kind: "dimm", count: 24, accepts: ["ddr5"], required: 12 },
      { kind: "nvme", count: 6, required: 2 },
      { kind: "psu", count: 4, required: 4 }
    ],
    baseboard: { scaleUp: "gaudi-roce", domainSize: 8, includesSwitchChips: false },
    cooling: "air",
    overheadW: 1200,
    maxPowerW: 9800,
    weightKg: 110,
    pcieLanesAvail: 80,
    maxAirWattsPerU: 1300,
    codex: {
      summary: "Intel's 8-GPU Gaudi 3 system: OAM modules whose scale-up fabric is standard RoCE Ethernet, not a proprietary interconnect.",
      explain: "Each Gaudi 3 integrates 24x 200GbE RoCEv2 ports, so the baseboard's 8-GPU domain needs no switch silicon and scale-out uses ordinary Ethernet switches. It is the cheapest fabric story in the catalog - if the software holds up.",
      tradeoffs: [
        "Ethernet everywhere: same switches for scale-up and scale-out, no vendor lock",
        "RoCE congestion control is fragile at scale - lossless tuning is on you"
      ],
      tags: ["gaudi3", "hls", "roce", "oam"]
    }
  },
  {
    kind: "chassis",
    id: "gen-pcie-1u",
    name: "Generic 1U PCIe GPU server (2 single-width cards)",
    vendor: "supermicro",
    availableFrom: 2020.5,
    priceUSD: 4200,
    leadTimeMonths: 1,
    rackUnits: 1,
    rackStandard: "19in",
    slots: [
      { kind: "accelerator", count: 2, accepts: ["pcie"], required: 1 },
      { kind: "cpu", count: 2, accepts: ["x86"], required: 1 },
      { kind: "dimm", count: 16, accepts: ["ddr4", "ddr5"], required: 4 },
      { kind: "nic", count: 2, required: 1 },
      { kind: "nvme", count: 4, required: 1 },
      { kind: "psu", count: 2, required: 2 }
    ],
    cooling: "air",
    overheadW: 200,
    maxPowerW: 1600,
    weightKg: 18,
    pcieLanesAvail: 96,
    maxAirWattsPerU: 900,
    codex: {
      summary: "A pizza-box server for inference: two low-profile PCIe GPUs in 1U.",
      explain: "Height is the cheapest thing in a rack, but airflow is not: a 1U box has tiny fans and almost no heatsink volume, so it only fits small, low-power PCIe cards. Great density per U for light inference; useless for big-model training because PCIe has no NVLink-class scale-up.",
      tradeoffs: ["Cheapest per box, densest per U for small inference", "Air budget ~900 W/U caps you to low-TDP cards", "No NVLink: GPUs talk over PCIe"],
      tags: ["1u", "pcie", "inference"]
    }
  },
  {
    kind: "chassis",
    id: "gen-pcie-2u",
    name: "Generic 2U PCIe GPU server (4 dual-width cards)",
    vendor: "supermicro",
    availableFrom: 2020.5,
    priceUSD: 7800,
    leadTimeMonths: 1,
    rackUnits: 2,
    rackStandard: "19in",
    slots: [
      { kind: "accelerator", count: 4, accepts: ["pcie"], required: 1 },
      { kind: "cpu", count: 2, accepts: ["x86"], required: 1 },
      { kind: "dimm", count: 32, accepts: ["ddr4", "ddr5"], required: 4 },
      { kind: "nic", count: 4, required: 1 },
      { kind: "nvme", count: 8, required: 1 },
      { kind: "psu", count: 2, required: 2 }
    ],
    cooling: "air",
    overheadW: 250,
    maxPowerW: 3e3,
    weightKg: 32,
    pcieLanesAvail: 128,
    maxAirWattsPerU: 800,
    codex: {
      summary: "The workhorse 2U: four double-width PCIe GPUs, two sockets.",
      explain: "Two U gives enough heatsink volume and fan wall for four 300 W-class cards. This is the sweet spot for PCIe inference fleets and small fine-tuning boxes: moderate $/GPU, easy air cooling, and you can still feed each card a NIC lane.",
      tradeoffs: ["Good balance of density and airflow", "4 GPUs per server means more CPUs/NICs per GPU than HGX", "Still PCIe-only scale-up"],
      tags: ["2u", "pcie"]
    }
  },
  {
    kind: "chassis",
    id: "gen-pcie-4u",
    name: "Generic 4U PCIe GPU server (8 dual-width cards)",
    vendor: "supermicro",
    availableFrom: 2020.5,
    priceUSD: 12500,
    leadTimeMonths: 2,
    rackUnits: 4,
    rackStandard: "19in",
    slots: [
      { kind: "accelerator", count: 8, accepts: ["pcie"], required: 1 },
      { kind: "cpu", count: 2, accepts: ["x86"], required: 1 },
      { kind: "dimm", count: 32, accepts: ["ddr4", "ddr5"], required: 4 },
      { kind: "nic", count: 8, required: 1 },
      { kind: "nvme", count: 8, required: 1 },
      { kind: "psu", count: 4, required: 2 }
    ],
    cooling: "air",
    overheadW: 350,
    maxPowerW: 5200,
    weightKg: 55,
    pcieLanesAvail: 128,
    maxAirWattsPerU: 1300,
    codex: {
      summary: "A 4U air-cooled tower of eight PCIe GPUs: the budget alternative to an 8U HGX box.",
      explain: "Four U buys room for eight double-width cards and deep fans. It is half the height of an 8U HGX server and far cheaper, but the GPUs only talk over PCIe (or paired NVLink bridges), so tensor-parallel training scales worse. Often the cost-minimising choice for inference contracts.",
      tradeoffs: ["Half the height and a fraction of the price of HGX", "PCIe-only scale-up limits large-model training", "~1.3 kW/U airflow is near the air limit"],
      tags: ["4u", "pcie"]
    }
  },
  {
    kind: "chassis",
    id: "dell-r760-head-2u",
    name: "Dell PowerEdge R760 head node (2U)",
    vendor: "dell",
    availableFrom: 2023.3,
    priceUSD: 7500,
    leadTimeMonths: 1,
    rackUnits: 2,
    rackStandard: "19in",
    slots: [
      { kind: "cpu", count: 2, accepts: ["x86"], required: 1 },
      { kind: "dimm", count: 16, accepts: ["ddr5"], required: 8 },
      { kind: "nic", count: 2, required: 1 },
      { kind: "dpu", count: 1 },
      { kind: "nvme", count: 10, required: 2 },
      { kind: "psu", count: 2, required: 2 }
    ],
    cooling: "air",
    overheadW: 250,
    maxPowerW: 1200,
    weightKg: 35,
    pcieLanesAvail: 64,
    maxAirWattsPerU: 700,
    codex: {
      summary: "Boring on purpose: a dual-socket x86 2U server for the jobs GPUs are bad at - scheduling, storage services, login and management.",
      explain: "Every GPU rack still needs CPU head nodes to run the cluster manager, serve datasets and terminate the storage fabric. Its NVMe bays hold local scratch and OS images so a failed GPU tray never takes the cluster's brain with it.",
      tradeoffs: [
        "Cheap and instantly available - never a procurement bottleneck",
        "Zero AI FLOPs: budget for these but do not confuse them with compute"
      ],
      tags: ["head-node", "management", "x86"]
    }
  }
];
const RACKS = [
  {
    kind: "rack",
    id: "gen-rack-19-42u",
    name: "Generic 19-inch 42U rack",
    vendor: "generic",
    availableFrom: 2020,
    priceUSD: 900,
    leadTimeMonths: 1,
    standard: "19in",
    units: 42,
    maxKW: 8,
    maxWeightKg: 1e3,
    cooling: ["air"],
    widthMM: 600,
    depthMM: 1200,
    heightMM: 2e3,
    hasBusbar: false,
    codex: {
      summary: "Commodity steel server rack: 42U, ~8kW of air-cooled gear, nothing fancy.",
      explain: "The default enclosure of classical datacenters. Power leaves PSUs as cord-and-C15 plugs into racked PDUs, which caps realistic density around 8-10kW per rack.",
      tradeoffs: [
        "Cheap and everywhere, but air density tops out - not for GPU trays above ~10kW",
        "No busbar: every server needs its own PSU and cord"
      ],
      tags: ["19in", "air", "rack"]
    }
  },
  {
    kind: "rack",
    id: "gen-rack-19-48u-hd",
    name: "High-density 19-inch 48U rack (RDHx-ready)",
    vendor: "generic",
    availableFrom: 2020,
    priceUSD: 2600,
    leadTimeMonths: 1,
    standard: "19in",
    units: 48,
    maxKW: 22,
    maxWeightKg: 1600,
    cooling: ["air", "rdhx"],
    widthMM: 600,
    depthMM: 1200,
    heightMM: 2100,
    hasBusbar: false,
    codex: {
      summary: "Taller, heavier-gauge 48U rack designed for AI servers with a rear-door heat exchanger option.",
      explain: "A rear-door heat exchanger (RDHx) swaps the hot aisle's waste heat into facility water at the rack, roughly doubling usable density without touching the servers. This is the bridge product between legacy air halls and full liquid.",
      tradeoffs: [
        "RDHx adds ~20kW of capture but needs chilled water at the rack row",
        "Still cord-and-PDU power - busbar retrofits are awkward"
      ],
      tags: ["19in", "rdhx", "high-density"]
    }
  },
  {
    kind: "rack",
    id: "ocp-orv3-48u",
    name: "OCP Open Rack v3 48U (21-inch)",
    vendor: "ocp",
    availableFrom: 2023,
    priceUSD: 6800,
    leadTimeMonths: 2,
    standard: "orv3-21in",
    units: 48,
    maxKW: 66,
    maxWeightKg: 1800,
    cooling: ["air", "rdhx", "dlc"],
    widthMM: 600,
    depthMM: 1200,
    heightMM: 2134,
    hasBusbar: true,
    codex: {
      summary: "The hyperscaler-standard open rack: 21-inch wide trays, a 48V busbar up the spine, and power shelves instead of per-server PSUs.",
      explain: "ORv3 moves rectification into shared power shelves (with batteries in some designs) and delivers 48V via busbar, cutting conversion losses and letting trays slide in without cabling. It is the chassis standard AMD, Intel and the MGX ecosystem build to.",
      tradeoffs: [
        "Busbar + shelves enable 40-66kW racks cleanly; trays must be ORv3-native",
        "21-inch trays do not fit legacy 19in racks - pick a lane per hall"
      ],
      tags: ["orv3", "ocp", "busbar", "48v"]
    }
  },
  {
    kind: "rack",
    id: "fox-nvl72-mgx",
    name: "Foxconn/NVIDIA MGX rack for GB200 NVL72",
    vendor: "foxconn",
    availableFrom: 2024.75,
    priceUSD: 38e3,
    leadTimeMonths: 4,
    allocationPerQuarter: 24,
    standard: "nvl-mgx",
    units: 48,
    maxKW: 140,
    maxWeightKg: 1900,
    cooling: ["dlc"],
    widthMM: 600,
    depthMM: 1200,
    heightMM: 2200,
    hasBusbar: true,
    codex: {
      summary: "The rack that makes an NVL72: 48U of 21-inch MGX slots with 48V busbar, coolant manifolds and space for 18 compute trays plus 9 NVLink switch trays.",
      explain: "MGX is NVIDIA's rack spec on top of ORv3 ideas; the rack itself carries power shelves, a vertical busbar and liquid distribution manifolds, and the NVLink spine cabling comes with the switch trays. Fully populated it draws ~120-132kW - roughly a whole legacy container in one floor tile.",
      tradeoffs: [
        "132kW requires ~80kW-class CDUs and often facility water upgrades",
        "Heavy (1.5-2t loaded) and liquid-only; no air fallback at all"
      ],
      tags: ["mgx", "nvl72", "rack-scale", "liquid"]
    }
  }
];
const STORAGE_SYSTEMS = [
  {
    kind: "storage",
    id: "gen-nvme-jbod-2u24",
    name: "Generic 2U NVMe JBOF (24x Gen5)",
    vendor: "generic",
    availableFrom: 2023.5,
    priceUSD: 38e3,
    leadTimeMonths: 2,
    tier: "hot-nvme",
    capacityPB: 0.35,
    readGBs: 55,
    writeGBs: 25,
    rackUnits: 2,
    watts: 850,
    codex: {
      summary: "Dumb and fast: 24 NVMe drives behind dual controllers, ~0.35PB of flash for training checkpoints and datasets.",
      explain: `JBOF ("just a bunch of flash") is the cheap way to add scratch capacity; the storage intelligence lives in the head nodes' software stack (Lustre, WekaFS, etc). Checkpoint bandwidth - not capacity - is usually what gates big training runs.`,
      tradeoffs: [
        "Lowest $/GB way to get 50+ GB/s of read for data loading",
        "No resilience story of its own - replication is software's problem"
      ],
      tags: ["nvme", "jbof", "scratch"]
    }
  },
  {
    kind: "storage",
    id: "ddn-ai400x2",
    name: "DDN AI400X2 (A3I appliance)",
    vendor: "ddn",
    availableFrom: 2023.1,
    priceUSD: 26e4,
    leadTimeMonths: 4,
    tier: "hot-nvme",
    capacityPB: 0.36,
    readGBs: 140,
    writeGBs: 120,
    rackUnits: 2,
    watts: 1500,
    codex: {
      summary: "Purpose-built AI storage appliance: ~0.36PB of NVMe delivering 100+ GB/s sustained for GPU-direct data and checkpoint floods.",
      explain: "DDN's A3I line pairs Lustre-parallel filesystems with tuned NVMe controllers; NVIDIA ships it as the reference storage for DGX SuperPODs. The whole game is writing a multi-TB checkpoint in seconds so training restarts before the queue drains.",
      tradeoffs: [
        "Extreme streaming throughput per rack unit for checkpoint/restart",
        "Premium price per PB - keep bulk datasets on cheaper tiers"
      ],
      tags: ["ddn", "a3i", "lustre", "checkpoint"]
    }
  },
  {
    kind: "storage",
    id: "vast-cnode-2u",
    name: "VAST Data CNode 2U (NVMe tier)",
    vendor: "vast",
    availableFrom: 2023.8,
    priceUSD: 11e4,
    leadTimeMonths: 3,
    tier: "hot-nvme",
    capacityPB: 0.37,
    readGBs: 80,
    writeGBs: 60,
    rackUnits: 2,
    watts: 1200,
    codex: {
      summary: "VAST's NVMe performance node: shared-nothing datastore software over standard flash, selling S3, NFS and a guarantee-like simplicity.",
      explain: "VAST separates the write path from the read path across CNodes and DBoxes so capacity tiers can be added without touching performance. For AI that means one namespace serving both the data lake (S3 objects) and the hot training set (NFS).",
      tradeoffs: [
        "One system for hot and cold tiers simplifies operations",
        "Performance per node is mid-tier; scale wide, not tall"
      ],
      tags: ["vast", "nvme", "s3", "datastore"]
    }
  },
  {
    kind: "storage",
    id: "vast-dbox-5u",
    name: "VAST Data DBox 5U (capacity tier)",
    vendor: "vast",
    availableFrom: 2023.8,
    priceUSD: 12e4,
    leadTimeMonths: 3,
    tier: "object",
    capacityPB: 1.5,
    readGBs: 25,
    writeGBs: 25,
    rackUnits: 5,
    watts: 1100,
    codex: {
      summary: "VAST's capacity enclosure: ~1.5PB of high-density drives per 5U that front-ends as cheap object storage under the same namespace.",
      explain: "DBoxes hold the epochs of checkpoints, raw corpora and compliance copies that would bankrupt an all-flash tier. Because CNodes serve the hot reads, DBox spinners can be tuned for capacity per watt rather than IOPS.",
      tradeoffs: [
        "Best $/PB under the VAST software umbrella",
        "Not a standalone product - needs CNodes in front of it"
      ],
      tags: ["vast", "object", "capacity"]
    }
  },
  {
    kind: "storage",
    id: "gen-warm-jbod-4u60",
    name: "Generic 4U60 warm HDD JBOD",
    vendor: "generic",
    availableFrom: 2022,
    priceUSD: 55e3,
    leadTimeMonths: 2,
    tier: "warm",
    capacityPB: 1.2,
    readGBs: 26,
    writeGBs: 16,
    rackUnits: 4,
    watts: 800,
    codex: {
      summary: "60-drive 3.5-inch JBOD: ~1.2PB of warm bulk storage for datasets, mirrors and aged checkpoints.",
      explain: "Sequential HDD streaming (~25 GB/s per box) still covers data loading for many training pipelines at a fraction of flash cost per terabyte. The trade is latency and rebuild times measured in days when a drive dies.",
      tradeoffs: [
        "Cheapest usable PB for staging next training runs",
        "Slow rebuilds and vibration sensitivity in dense boxes"
      ],
      tags: ["hdd", "jbod", "warm"]
    }
  },
  {
    kind: "storage",
    id: "gen-object-store-4u60",
    name: "Generic 4U60 object-storage node",
    vendor: "generic",
    availableFrom: 2022,
    priceUSD: 58e3,
    leadTimeMonths: 2,
    tier: "object",
    capacityPB: 1.2,
    readGBs: 25,
    writeGBs: 15,
    rackUnits: 4,
    watts: 850,
    codex: {
      summary: "Self-hosted S3-compatible node: same 60-drive box as the warm JBOD but sold with erasure-coded object software.",
      explain: "Enterprises that must own their lake run MinIO/Ceph-style object stores on commodity boxes with erasure coding instead of replication. Durability math (8+3 etc.) trades ~30% of raw capacity for surviving rack-level faults.",
      tradeoffs: [
        "S3 API unlocks the whole data-tooling ecosystem",
        "Erasure coding costs capacity and small-read latency"
      ],
      tags: ["object", "s3", "erasure-coding"]
    }
  }
];
const MEMORY = [
  {
    kind: "memory",
    id: "sam-ddr4-3200-32",
    name: "Samsung DDR4-3200 RDIMM 32GB",
    vendor: "samsung",
    availableFrom: 2020,
    priceUSD: 160,
    leadTimeMonths: 1,
    type: "ddr4",
    capacityGB: 32,
    speedMTs: 3200,
    watts: 5,
    codex: {
      summary: "The default server RDIMM of the Ampere-EPYC era: 32GB at DDR4-3200.",
      explain: "HGX A100-class hosts have 16 DIMM slots; filling them sets how many data-loading workers and page-cache hits a node sustains. RDIMM (registered) memory tolerates two modules per channel in servers where consumer UDIMMs cannot.",
      tradeoffs: [
        "Cheapest per GB once DDR5 glut hits - great for head nodes",
        "DDR4 bandwidth (~200 GB/s/socket) bottlenecks EPYC2-era hosts"
      ],
      tags: ["ddr4", "rdimm"]
    }
  },
  {
    kind: "memory",
    id: "mic-ddr5-4800-32",
    name: "Micron DDR5-4800 RDIMM 32GB",
    vendor: "micron",
    availableFrom: 2021.75,
    priceUSD: 260,
    leadTimeMonths: 2,
    type: "ddr5",
    capacityGB: 32,
    speedMTs: 4800,
    watts: 7,
    codex: {
      summary: "First-generation DDR5 server RDIMM: 32GB at 4800 MT/s with on-module power management.",
      explain: "DDR5 moved voltage regulation onto the DIMM itself and doubled sub-channels, which is what lets Sapphire-Rapids and Genoa hosts stream ~300-460 GB/s per socket. Early pricing was brutal - DDR5 carried a large premium through 2022's supply squeeze.",
      tradeoffs: [
        "Twice the bandwidth per socket of DDR4 for data staging",
        "Launch-era price per GB far above DDR4"
      ],
      tags: ["ddr5", "rdimm"]
    }
  },
  {
    kind: "memory",
    id: "sam-ddr5-5600-64",
    name: "Samsung DDR5-5600 RDIMM 64GB",
    vendor: "samsung",
    availableFrom: 2023,
    priceUSD: 330,
    leadTimeMonths: 2,
    type: "ddr5",
    capacityGB: 64,
    speedMTs: 5600,
    watts: 10,
    codex: {
      summary: "The volume server DIMM of 2023-25: 64GB DDR5-5600, the sweet spot for H100-era hosts.",
      explain: "HGX H100 hosts take 32 DIMMs, so 64GB sticks mean 2TB of CPU-side memory - enough to cache a training shard per node. Matching the CPU's official MT/s matters: the memory controller drops a gear with mixed speeds.",
      tradeoffs: [
        "Best $/GB of the DDR5 lineup once supply normalized",
        "Populating all 2DPC slots drops sustainable MT/s - check the CPU's tables"
      ],
      tags: ["ddr5", "rdimm", "sweet-spot"]
    }
  },
  {
    kind: "memory",
    id: "skh-ddr5-6400-96",
    name: "SK hynix DDR5-6400 RDIMM 96GB",
    vendor: "skhynix",
    availableFrom: 2024,
    priceUSD: 560,
    leadTimeMonths: 2,
    type: "ddr5",
    capacityGB: 96,
    speedMTs: 6400,
    watts: 12,
    codex: {
      summary: "Odd-but-real 96GB RDIMM built from 24Gb-die hybrids of 2 ranks, tuned for Turin/Granite Rapids hosts.",
      explain: "96GB modules exist because 48Gb-die monolithic DRAM is expensive; fusing 24Gb die yields cheap mid-capacity with mild bank-group penalties. They let a 12-channel EPYC reach 1.15TB without LRDIMM pricing.",
      tradeoffs: [
        "More capacity per slot than 64GB at decent speed",
        "Slightly worse latency than true 3DS parts at the same speed"
      ],
      tags: ["ddr5", "96gb", "rdimm"]
    }
  },
  {
    kind: "memory",
    id: "mic-mrdimm-8800-128",
    name: "Micron MCR DIMM 8800 128GB",
    vendor: "micron",
    availableFrom: 2024.5,
    priceUSD: 950,
    leadTimeMonths: 2,
    type: "mrdimm",
    capacityGB: 128,
    speedMTs: 8800,
    watts: 18,
    codex: {
      summary: "Multi-Channel-Ranked DIMM: two buffered DRAM ranks driven in parallel for 8800 MT/s in ordinary sockets.",
      explain: "MRDIMM puts a small router/buffer on the module that talks to both ranks at once, roughly 1.5x the bandwidth of RDIMMs of the same generation. Sapphire Rapids-adjacent platforms use it to feed ever-hungrier tensor-host pipelines.",
      tradeoffs: [
        "Bandwidth uplift without a new socket",
        "Costs and burns more watts than plain RDIMM per GB"
      ],
      tags: ["mrdimm", "ddr5", "bandwidth"]
    }
  },
  {
    kind: "memory",
    id: "mic-mrdimm-8800-256",
    name: "Micron MCR DIMM 8800 256GB",
    vendor: "micron",
    availableFrom: 2025.5,
    priceUSD: 2800,
    leadTimeMonths: 3,
    type: "mrdimm",
    capacityGB: 256,
    speedMTs: 8800,
    watts: 28,
    codex: {
      summary: "Biggest server DIMM commonly orderable: 256GB MRDIMM, for hosts that keep whole models in CPU memory.",
      explain: "GB300-class trays spec multi-TB host memory so frameworks can page weights, KV caches and giant batches through CPU RAM under the GPUs' HBM. At 32 DIMMs of 256GB a single HGX node reaches 8TB.",
      tradeoffs: [
        "2TB+ per tray unlocks CPU-offload serving strategies",
        "Very expensive per GB - buy only where capacity, not bandwidth, is the goal"
      ],
      tags: ["mrdimm", "capacity", "256gb"]
    }
  }
];
const NVME = [
  {
    kind: "nvme",
    id: "sam-pm9a3-3t84",
    name: "Samsung PM9A3 3.84TB U.2 (Gen4)",
    vendor: "samsung",
    availableFrom: 2021,
    priceUSD: 420,
    leadTimeMonths: 1,
    capacityTB: 3.84,
    readGBs: 6.8,
    writeGBs: 4,
    pcieGen: 4,
    watts: 9,
    codex: {
      summary: "Datacenter workhorse SSD: 3.84TB U.2, Gen4, 6.8 GB/s reads, one DWPD endurance.",
      explain: "PM9A3 is the drive most OEM trays default to for OS, scratch and local cache. 3.84TB is the classic 1-DWPD capacity point (built from the 7.68TB endurance SKU's flash with more spare area).",
      tradeoffs: [
        "Ubiquitous and cheap - ideal for boot/scratch tiers",
        "Gen4 bandwidth is fine for data loading, dated for checkpoint floods"
      ],
      tags: ["u2", "gen4", "tlc"]
    }
  },
  {
    kind: "nvme",
    id: "mic-9400-7t68",
    name: "Micron 9400 PRO 7.68TB U.2 (Gen4)",
    vendor: "micron",
    availableFrom: 2022.5,
    priceUSD: 820,
    leadTimeMonths: 2,
    capacityTB: 7.68,
    readGBs: 6.8,
    writeGBs: 5.5,
    pcieGen: 4,
    watts: 14,
    codex: {
      summary: "High-capacity Gen4 datacenter SSD: 7.68TB with strong mixed-workload write throughput.",
      explain: "The 9400 balances capacity and endurance, which matters for checkpoint journals and Ceph OSDs where writes are not sequential. Its deep queue stream feeds data-loader shards at line rate.",
      tradeoffs: [
        "2x the capacity per bay of 3.84TB at similar bandwidth",
        "Heavier idle and burst power than smaller drives - dense boxes get hot"
      ],
      tags: ["u2", "gen4", "capacity"]
    }
  },
  {
    kind: "nvme",
    id: "sam-pm1743-15t36",
    name: "Samsung PM1743 15.36TB U.2 (Gen5)",
    vendor: "samsung",
    availableFrom: 2023.2,
    priceUSD: 1600,
    leadTimeMonths: 2,
    capacityTB: 15.36,
    readGBs: 14.9,
    writeGBs: 7,
    pcieGen: 5,
    watts: 23,
    codex: {
      summary: "First mainstream Gen5 enterprise SSD: 15.36TB at ~15 GB/s reads.",
      explain: "PCIe 5.0 doubled link bandwidth, and PM1743 uses it for read-heavy training storage where loading cannot stall the GPUs. Its write path is comparatively modest - vendors prioritize read IOPS for AI.",
      tradeoffs: [
        "Read bandwidth near line rate of x4 Gen5",
        "Write throughput and endurance trail reads - checkpoint-heavy users should mix tiers"
      ],
      tags: ["u2", "gen5", "read-optimized"]
    }
  },
  {
    kind: "nvme",
    id: "mic-9550-15t36",
    name: "Micron 9550 15.36TB U.2 (Gen5)",
    vendor: "micron",
    availableFrom: 2024.6,
    priceUSD: 1450,
    leadTimeMonths: 2,
    capacityTB: 15.36,
    readGBs: 14,
    writeGBs: 9,
    pcieGen: 5,
    watts: 20,
    codex: {
      summary: "Balanced Gen5 flagship: 15.36TB with class-leading mixed read/write throughput.",
      explain: "The 9550 is tuned for AI pipelines that both read shards and write checkpoints on the same device, keeping more of the x4 Gen5 link busy in both directions. Better watts-per-GB/s than first-gen Gen5 parts.",
      tradeoffs: [
        "Strong writes - single-tier storage without a separate checkpoint device",
        "Premium vs Gen4 $/TB; use for hot nodes, not bulk"
      ],
      tags: ["u2", "gen5", "mixed-workload"]
    }
  },
  {
    kind: "nvme",
    id: "sam-bm1743-30t72",
    name: "Samsung BM1743 30.72TB E1.S (Gen5 QLC)",
    vendor: "samsung",
    availableFrom: 2024.5,
    priceUSD: 2900,
    leadTimeMonths: 3,
    capacityTB: 30.72,
    readGBs: 7.5,
    writeGBs: 4,
    pcieGen: 5,
    watts: 22,
    codex: {
      summary: "Dense QLC ruler SSD: 30.72TB in an E1.S module, built for read-mostly capacity tiers.",
      explain: "QLC packs 4 bits per cell for huge capacity but with slower writes and endurance measured in fractions of a DWPD. Ruler (E1.S/E1.L) form factors pack far more flash per rack unit than 2.5-inch U.2 while improving airflow.",
      tradeoffs: [
        "2 PB+ in one 1U ruler shelf - unbeatable flash density for warm reads",
        "QLC endurance: never put checkpoint journals on it"
      ],
      tags: ["e1s", "qlc", "capacity", "ruler"]
    }
  }
];
const VENDORS$1 = [
  {
    id: "nvidia",
    name: "NVIDIA",
    sells: ["accelerator", "cpu", "chassis", "switch", "nic", "rack"],
    reliability: 0.95,
    support: 0.95,
    volumeDiscountPerDoublingPct: 3,
    codex: {
      summary: "Dominant AI-compute vendor: GPUs plus the interconnect (NVLink/NVSwitch) and rack designs (HGX, MGX/NVL) around them.",
      explain: "NVIDIA sells the reference platforms - HGX boards and full NVL racks - while ODMs assemble variants, which is why every competitor defines themselves against its fabric and software. CUDA maturity is the moat the numbers in this game reflect.",
      tradeoffs: [
        "Best software and fabric, highest prices, tightest allocation in shortages"
      ]
    }
  },
  {
    id: "supermicro",
    name: "Supermicro",
    sells: ["chassis", "rack", "cpu", "memory", "nvme"],
    reliability: 0.9,
    support: 0.85,
    volumeDiscountPerDoublingPct: 5,
    codex: {
      summary: "Volume ODM/whitebox builder: first to market with NVIDIA HGX and AMD UBB server chassis.",
      explain: "Supermicro's business is packaging other vendors' silicon into every cooling and rack flavor (air, DLC, ORv3) fast. Buying the board from NVIDIA and the box from Supermicro is the classic AI-cluster recipe.",
      tradeoffs: [
        "Speed and breadth of catalog versus thinner own-IP and support bench"
      ]
    }
  },
  {
    id: "gigabyte",
    name: "GIGABYTE",
    sells: ["chassis", "rack"],
    reliability: 0.88,
    support: 0.82,
    volumeDiscountPerDoublingPct: 5,
    codex: {
      summary: "Taiwanese ODM offering aggressive alternates to Supermicro, especially G-series GPU servers.",
      explain: "GIGABYTE's G493-class boxes host 8 OAM AMD accelerators and often undercut rivals on price. Its liquid-cooled variants were early to the 1kW-per-GPU era.",
      tradeoffs: [
        "Cost-competitive second source for UBB servers",
        "Support and firmware polish trail the tier-1s"
      ]
    }
  },
  {
    id: "dell",
    name: "Dell Technologies",
    sells: ["chassis", "rack", "storage"],
    reliability: 0.95,
    support: 0.95,
    volumeDiscountPerDoublingPct: 4,
    codex: {
      summary: "Tier-1 enterprise server vendor: PowerEdge head nodes, storage, and integration muscle.",
      explain: "Dell (like HPE) sells the whole stack to enterprises - GPU servers, PowerScale/APEX storage, financing - and its IR7000 rack is its NVL72 vehicle. Enterprises pay the Dell premium for one throat to choke.",
      tradeoffs: [
        "Enterprise SLAs and global spares at a price premium over whitebox"
      ]
    }
  },
  {
    id: "tenstorrent",
    name: "Tenstorrent",
    sells: ["accelerator", "chassis"],
    reliability: 0.78,
    support: 0.7,
    volumeDiscountPerDoublingPct: 6,
    codex: {
      summary: "RISC-V AI-hardware startup whose Wormhole/Blackhole chips and Galaxy servers mesh over plain Ethernet.",
      explain: "Tenstorrent bets that Ethernet-native scale-up plus open-source tooling (TT-Metalium) can undercut proprietary fabrics. Its hardware is cheap per FLOP; the ecosystem is the risk you underwrite.",
      tradeoffs: [
        "Very low cost and no fabric tax; immature software stack"
      ]
    }
  },
  {
    id: "cerebras",
    name: "Cerebras Systems",
    sells: ["accelerator", "chassis"],
    reliability: 0.85,
    support: 0.9,
    volumeDiscountPerDoublingPct: 4,
    codex: {
      summary: "Wafer-scale computing vendor: the CS-3 appliance trains and serves models on a single dinner-plate chip.",
      explain: "Cerebras sidesteps multi-GPU sharding entirely - one WSE-3, weights streamed from MemoryX, clusters of up to 2048 systems. Buyers get extreme simplicity per system at a bespoke price.",
      tradeoffs: [
        "Deterministic scaling and blistering decode; single-vendor lock and few ports"
      ]
    }
  },
  {
    id: "intel",
    name: "Intel",
    sells: ["accelerator", "chassis", "cpu", "nic", "switch"],
    reliability: 0.88,
    support: 0.85,
    volumeDiscountPerDoublingPct: 5,
    codex: {
      summary: "Incumbent CPU giant whose Gaudi accelerators bet against proprietary scale-up fabrics.",
      explain: "Gaudi 3 systems use integrated RoCE Ethernet for both scale-up and scale-out, riding Intel's Xeon installed base and Tofino-era networking DNA. After the 2024 wind-down toward Gaudi 3 as the last of the line, software continuity moved to the Habana-to-LPU transition.",
      tradeoffs: [
        "Xeon ubiquity and open fabrics; Gaudi roadmap risk"
      ]
    }
  },
  {
    id: "foxconn",
    name: "Foxconn (ODM)",
    sells: ["chassis", "rack"],
    reliability: 0.87,
    support: 0.8,
    volumeDiscountPerDoublingPct: 6,
    codex: {
      summary: "The assembler behind much of the world's servers, including NVIDIA MGX racks for GB200 NVL72.",
      explain: "Foxconn (Hon Hai) builds to others' specs at hyperscale margins; its MGX rack is the physical skeleton NVL72 ships in. Buying racks from the ODM avoids brand markup but puts integration QA on you.",
      tradeoffs: [
        "Scale pricing and early availability on hot designs",
        "Thin direct support; you or an integrator handle integration"
      ]
    }
  },
  {
    id: "ocp",
    name: "OCP (Open Compute)",
    sells: ["rack"],
    reliability: 0.9,
    support: 0.7,
    volumeDiscountPerDoublingPct: 8,
    codex: {
      summary: "Not a company but the Open Compute Project: the ORv3 rack and OAM specs that hyperscalers publish for everyone.",
      explain: `OCP specs let any fabricator build standards-compliant racks, power shelves and accelerator modules, which is how AMD's UBB ecosystem exists. "Buying OCP" means buying spec-compliant gear from the open market.`,
      tradeoffs: [
        "Standards kill vendor lock-in; community support only, no SLA"
      ]
    }
  },
  {
    id: "generic",
    name: "Generic / commodity",
    sells: ["rack", "memory", "nvme", "storage", "cpu", "chassis"],
    reliability: 0.8,
    support: 0.6,
    volumeDiscountPerDoublingPct: 9,
    codex: {
      summary: "The spot market: commodity racks, JBODs, DRAM and SSDs with no brand behind them.",
      explain: "Generic gear fills the unglamorous layers - warm storage, head-node scratch, spare DIMMs - where specs are standardized and the premium brands add little. Lead times are short because no allocation queue applies.",
      tradeoffs: [
        "Cheap and available; weak RMA and firmware support when it breaks"
      ]
    }
  },
  {
    id: "samsung",
    name: "Samsung Semiconductor",
    sells: ["memory", "nvme"],
    reliability: 0.96,
    support: 0.9,
    volumeDiscountPerDoublingPct: 6,
    codex: {
      summary: "World's largest memory and enterprise-SSD maker: DRAM, HBM, and PM/BM-series NVMe.",
      explain: "Samsung's PM9A3/PM1743 SSDs are the default enterprise flash, and its DRAM rides in nearly every server. Memory pricing cycles (shortages and gluts) show up in this game as its price drift.",
      tradeoffs: [
        "Top reliability and availability at mid-premium prices"
      ]
    }
  },
  {
    id: "micron",
    name: "Micron Technology",
    sells: ["memory", "nvme"],
    reliability: 0.95,
    support: 0.88,
    volumeDiscountPerDoublingPct: 6,
    codex: {
      summary: "US-headquartered memory vendor: DDR5 RDIMMs, MRDIMMs, and 9400/9550 datacenter SSDs.",
      explain: "Micron pushes the performance edges - MRDIMM buffered modules and mixed-workload Gen5 flash - and is the second source that keeps Samsung honest on price. Its 9550 targets AI read/write mixtures specifically.",
      tradeoffs: [
        "Often first with new module technologies",
        "Second-source volumes can lag Samsung's in shortages"
      ]
    }
  },
  {
    id: "skhynix",
    name: "SK hynix",
    sells: ["memory"],
    reliability: 0.95,
    support: 0.88,
    volumeDiscountPerDoublingPct: 6,
    codex: {
      summary: "Korean memory maker, the dominant supplier of HBM for AI accelerators and a top DDR5 vendor.",
      explain: "Every MI- and H-series GPU depends on SK hynix (and Micron/Samsung) HBM3e supply; its DDR5 RDIMMs including the popular 96GB hybrid-die parts fill server channels. HBM allocation squeezes are the hidden bottleneck of GPU ramps.",
      tradeoffs: [
        "HBM leadership makes it a strategic supplier",
        "Consumer-market swings whipsaw its DRAM pricing"
      ]
    }
  },
  {
    id: "ddn",
    name: "DDN (DataDirect Networks)",
    sells: ["storage"],
    reliability: 0.93,
    support: 0.9,
    volumeDiscountPerDoublingPct: 5,
    codex: {
      summary: "High-performance storage vendor whose A3I appliances are the reference file tier for DGX SuperPODs.",
      explain: "DDN built its name on Lustre-parallel scratch for HPC and now sells AI400X2-class NVMe systems tuned for checkpoint floods and GPU-direct reads. When a 100k-GPU run must restart in minutes, this is what writes the checkpoint.",
      tradeoffs: [
        "Top sustained throughput per U; appliance pricing hurts $/PB"
      ]
    }
  },
  {
    id: "weka",
    name: "WEKA",
    sells: ["storage"],
    reliability: 0.9,
    support: 0.88,
    volumeDiscountPerDoublingPct: 4,
    codex: {
      summary: "Software-defined parallel filesystem vendor tuned for GPU clusters.",
      explain: "WEKA runs on commodity NVMe servers and exposes a POSIX namespace over RDMA, feeding GPUs hundreds of GB/s. You license the software per capacity and own the hardware choices.",
      tradeoffs: ["Flexible hardware, fast data path", "Software licence is a recurring cost"]
    }
  },
  {
    id: "vast",
    name: "VAST Data",
    sells: ["storage"],
    reliability: 0.92,
    support: 0.88,
    volumeDiscountPerDoublingPct: 5,
    codex: {
      summary: "Software-defined unstructured-storage vendor selling one namespace that spans NVMe performance nodes to capacity boxes.",
      explain: "VAST's CNode/DBox split decouples performance from capacity, serving S3 and NFS from the same datastore - a popular simplification for AI data lakes. Disaggregated shared-nothing architecture is the pitch; simplicity of one system is what buyers notice.",
      tradeoffs: [
        "One namespace for hot and cold data",
        "Performance per node is modest - scale horizontally"
      ]
    }
  },
  {
    id: "amd",
    name: "AMD",
    sells: ["accelerator", "cpu", "nic"],
    reliability: 0.9,
    support: 0.85,
    volumeDiscountPerDoublingPct: 4,
    codex: {
      summary: "The challenger compute platform: Instinct MI accelerators, EPYC server CPUs, and Pensando DPUs/NICs under one roof.",
      explain: "AMD is the only credible end-to-end alternative to NVIDIA - EPYC hosts every HGX box anyway, Instinct MI300X-class parts beat NVIDIA on HBM capacity per dollar, and Pensando supplies the networking. The catch is ROCm software maturity, which the sim reflects as a sub-1.0 software multiplier.",
      tradeoffs: [
        "More HBM and FLOPs per dollar than NVIDIA; thinner software ecosystem",
        "Open ecosystem intent (UALink, OAM) versus shipping volume today"
      ],
      tags: ["amd", "rocm", "epyc", "instinct"]
    }
  },
  {
    id: "groq",
    name: "Groq",
    sells: ["accelerator"],
    reliability: 0.85,
    support: 0.8,
    volumeDiscountPerDoublingPct: 3,
    codex: {
      summary: "Inference specialist: the LPU (Language Processing Unit), a deterministic SRAM-only processor that keeps whole model weights on-chip.",
      explain: "Groq removes HBM entirely - 230MB of on-die SRAM and a statically scheduled pipeline mean no branch mispredictions, no cache misses, and extraordinary tokens-per-second at excellent latency. The price is tiny per-chip capacity, so big models need hundreds of LPUs in lockstep, and it serves inference only, not training.",
      tradeoffs: [
        "Massive tokens/s and p95 latency wins on supported models",
        "SRAM-only: hundreds of chips per model, specialist capacity only"
      ],
      tags: ["groq", "lpu", "sram", "inference"]
    }
  },
  {
    id: "broadcom",
    name: "Broadcom",
    sells: ["switch", "nic"],
    reliability: 0.94,
    support: 0.85,
    volumeDiscountPerDoublingPct: 5,
    codex: {
      summary: "Merchant switch-silicon king: Tomahawk and Jericho ASICs that power most of the Ethernet switches in this catalog.",
      explain: "Broadcom does not sell you a switch - it sells the silicon inside Arista, Cisco, Celestica and whitebox boxes. Tomahawk 5 (51.2T) and Tomahawk 6 (102.4T) define the price-performance curve of scale-out fabrics, and its Jericho line adds deep buffering for AI congestion.",
      tradeoffs: [
        "Commodity economics: every vendor competes on the same silicon",
        "Feature differentiation lives in software, so vendor choice still matters"
      ],
      tags: ["tomahawk", "jericho", "merchant-silicon", "ethernet"]
    }
  },
  {
    id: "arista",
    name: "Arista Networks",
    sells: ["switch"],
    reliability: 0.94,
    support: 0.92,
    volumeDiscountPerDoublingPct: 4,
    codex: {
      summary: "The datacenter Ethernet leader: EOS-based leaf/spine and AI-backend switches built on Broadcom silicon.",
      explain: "Arista took the hyperscaler playbook - single EOS image, deep telemetry (CloudVision) - and became the default AI fabric vendor for Ethernet backends. Its 7800R4 and 7060X6 lines target exactly the 400/800G leaf-spine tiers this game wires.",
      tradeoffs: [
        "Best-in-class EOS software and support at a premium over whitebox",
        "Rides Broadcom silicon, so ASIC features arrive on Broadcom's schedule"
      ],
      tags: ["arista", "eos", "leaf-spine", "ethernet"]
    }
  },
  {
    id: "cisco",
    name: "Cisco Systems",
    sells: ["switch"],
    reliability: 0.93,
    support: 0.95,
    volumeDiscountPerDoublingPct: 4,
    codex: {
      summary: "The networking incumbent, entering AI fabrics with Silicon One-based Nexus/8000-series Ethernet switches.",
      explain: "Cisco's answer to Arista in AI is its own Silicon One G100/G200 ASICs plus the enterprise service machine - the largest support organization in networking. Enterprises already standardized on Cisco optics, ops tooling and TAC; AI backends are the new battleground.",
      tradeoffs: [
        "Unmatched global support and enterprise integration",
        "Silicon One is newer to AI-scale backends than Tomahawk incumbency"
      ],
      tags: ["cisco", "silicon-one", "nexus", "ethernet"]
    }
  },
  {
    id: "eaton",
    name: "Eaton",
    sells: ["power"],
    reliability: 0.93,
    support: 0.9,
    volumeDiscountPerDoublingPct: 5,
    codex: {
      summary: "Power-management heavyweight: pad-mount transformers, switchgear, and the 93PM-series UPS feeding AI halls.",
      explain: "Eaton is one of the few vendors spanning medium-voltage utility gear down to rack PDUs, which is what a facility build actually sequences: transformer, switchgear, UPS, busway. Its 93PM UPS (up to 1.5MW per frame) and 99% eco-mode efficiency are the workhorses behind many AI sites.",
      tradeoffs: [
        "Full MV-to-rack power chain from one vendor simplifies commissioning",
        "Lead times on transformers and switchgear are the facility critical path"
      ],
      tags: ["eaton", "ups", "switchgear", "transformer"]
    }
  },
  {
    id: "schneider",
    name: "Schneider Electric",
    sells: ["power", "cooling"],
    reliability: 0.92,
    support: 0.9,
    volumeDiscountPerDoublingPct: 5,
    codex: {
      summary: "Datacenter infrastructure generalist: APC UPS/PDUs, EcoStruxure monitoring, Uniflair CRAHs and CDUs under one controls umbrella.",
      explain: "Schneider sells the facility as a system - power (Galaxy VX/VS UPS), white-space cooling, and the EcoStruxure software that ties them together. For AI retrofits its RDHx (passive rear-door) line is the classic way to squeeze ~2x density out of an air hall.",
      tradeoffs: [
        "Integrated monitoring and global service coverage",
        "Generalist depth: specialist AI vendors (CDU/immersion) out-feature it at the edge cases"
      ],
      tags: ["schneider", "apc", "ups", "rdhx", "ecology"]
    }
  },
  {
    id: "vertiv",
    name: "Vertiv",
    sells: ["power", "cooling"],
    reliability: 0.93,
    support: 0.9,
    volumeDiscountPerDoublingPct: 5,
    codex: {
      summary: "The datacenter power-and-cooling pure-play: Liebert UPS, power shelves, CRAHs, chillers and the CDUs behind most NVL-class deployments.",
      explain: "Vertiv sits at the center of the liquid-cooling gold rush - its 230V/415V AC and 48V DC power chain plus XDU/xCDU family (800kW-2.3MW liquid-to-liquid and liquid-to-air) is the reference path for GB200 racks. When an AI hall is specified, Vertiv is usually in the RFQ.",
      tradeoffs: [
        "Broadest AI-era power+cooling portfolio and field service network",
        "Premium pricing; hot new CDU capacity is allocation-constrained like GPUs"
      ],
      tags: ["vertiv", "liebert", "cdu", "ups", "liquid"]
    }
  },
  {
    id: "delta",
    name: "Delta Electronics",
    sells: ["power", "cooling"],
    reliability: 0.9,
    support: 0.85,
    volumeDiscountPerDoublingPct: 6,
    codex: {
      summary: "Taiwanese power specialist: PSUs and power shelves inside half the industry's servers, plus busway, CDUs and fan coils.",
      explain: "Delta is the silent incumbent of the power layer - its 97%+ efficiency rectifiers populate OCP power shelves and its liquid components (CDUs, manifolds, cold plates) ride the same ODM supply chains that build AI trays. Buying Delta means hyperscaler economics at the component level.",
      tradeoffs: [
        "OEM pricing and 97-98% conversion efficiency at the shelf",
        "Component-grade support: no white-glove facility service like Vertiv"
      ],
      tags: ["delta", "psu", "power-shelf", "busway", "cdu"]
    }
  },
  {
    id: "coolit",
    name: "CoolIT Systems",
    sells: ["cooling"],
    reliability: 0.9,
    support: 0.85,
    volumeDiscountPerDoublingPct: 5,
    codex: {
      summary: "Direct-to-chip liquid cooling specialist: cold plates and rack/inline CDUs shipping inside most HGX and UBB liquid servers.",
      explain: "CoolIT pioneered production GPU cold plates (A100-era) and now sells both the plate side (cold plates on every SXM module) and the facility side (CHx CDUs up to MW class, liquid-to-liquid and liquid-to-air). If a tray needs 8 cold plates, odds are they are CoolIT or an ODM badge on the same designs.",
      tradeoffs: [
        "Deep cold-plate expertise and GPU-vendor co-design",
        "Rack-scale CDU redundancy (n+1 pumps) must be designed in, not assumed"
      ],
      tags: ["coolit", "dlc", "cold-plate", "cdu"]
    }
  },
  {
    id: "motivair",
    name: "Motivair",
    sells: ["cooling"],
    reliability: 0.9,
    support: 0.85,
    volumeDiscountPerDoublingPct: 5,
    codex: {
      summary: "Facility-scale liquid cooling specialist: CDUs, coolant distribution units and rear-door heat exchangers for AI halls.",
      explain: "Motivair builds the big liquid-to-liquid CDUs (up to ~2.3MW) and facility side loops that sit between chillers and the rack manifolds of NVL72-class deployments. In 2025 Schneider took a majority stake - a signal that facility liquid is the growth tier of cooling.",
      tradeoffs: [
        "Facility-grade CDU engineering with true concurrent maintainability",
        "Facility side only: you still need plate-level vendors inside the trays"
      ],
      tags: ["motivair", "cdu", "liquid", "facility"]
    }
  },
  {
    id: "submer",
    name: "Submer",
    sells: ["cooling"],
    reliability: 0.88,
    support: 0.82,
    volumeDiscountPerDoublingPct: 6,
    codex: {
      summary: "Immersion-cooling pioneer: single-phase immersion tanks and the coolant-handling ecosystem (baths, CDUs, fluids) around them.",
      explain: "Submer drops whole servers into tanks of dielectric oil - single-phase immersion that removes fans entirely and enables 100kW+ per tank. It sidesteps leak anxiety of DLC but demands oil-compatible hardware (no thermal paste washout, buoyancy-aware boards) and tank-scale service workflows.",
      tradeoffs: [
        "Highest density and PUE floor; no water anywhere near electronics",
        "Immersion-branded hardware, awkward RMA flow - every service is a lift-and-drain"
      ],
      tags: ["submer", "immersion", "single-phase", "pue"]
    }
  }
];
const POWER = [
  {
    id: "et-padmount-2500",
    name: "Eaton 2.5 MVA MV Pad-Mount Transformer",
    vendor: "eaton",
    kind: "power",
    powerType: "transformer",
    availableFrom: 2020,
    priceUSD: 145e3,
    leadTimeMonths: 4,
    capacityKW: 2500,
    efficiency: 0.988,
    installMonths: 4,
    codex: {
      summary: "Pad-mounted medium-voltage transformer stepping the utility 10-25 kV feed down to 400/480 V.",
      explain: "Nearly every IT watt flows through this iron, so even 1.2% copper and core loss becomes ~30 kW of heat at full load. Adding transformer capacity is how a hall grows past a few MW.",
      tradeoffs: [
        "Losses and cost are always on; oversizing wastes money at partial load",
        "The utility interconnect queue, not the transformer, is usually the real bottleneck"
      ],
      tags: ["transformer", "mv", "grid", "power"]
    }
  },
  {
    id: "et-padmount-5000",
    name: "Eaton 5 MVA MV Pad-Mount Transformer",
    vendor: "eaton",
    kind: "power",
    powerType: "transformer",
    availableFrom: 2020,
    priceUSD: 27e4,
    leadTimeMonths: 5,
    capacityKW: 5e3,
    efficiency: 0.99,
    installMonths: 5,
    codex: {
      summary: "Double-size pad-mount transformer for multi-MW halls and campus substations.",
      explain: "Bigger cores run slightly more efficiently per kVA and halve the count of interconnection points. Utilities often prefer fewer, larger banks.",
      tradeoffs: [
        "A single 5 MVA unit is one big fault domain; critical halls go 2N",
        "Specialty craning and splicing stretch installs past half a year in practice"
      ],
      tags: ["transformer", "mv", "grid", "power"]
    }
  },
  {
    id: "et-swgr-3000",
    name: "Eaton LV Switchgear Lineup (3 MW)",
    vendor: "eaton",
    kind: "power",
    powerType: "switchgear",
    availableFrom: 2020,
    priceUSD: 32e4,
    leadTimeMonths: 4,
    capacityKW: 3e3,
    efficiency: 0.995,
    installMonths: 4,
    codex: {
      summary: "Low-voltage metal-clad switchgear lineup distributing 400/480 V to UPSs, busways and mechanical plant.",
      explain: "The protection and metering backbone: breakers, feeders and the automatic transfer logic that signals gensets when utility voltage sags. ~0.5% bus losses.",
      tradeoffs: [
        "Dual-bus (2N) lineups double cost but allow maintenance with zero downtime",
        "Arc-flash domains: live work is regulated, planned and expensive"
      ],
      tags: ["switchgear", "distribution", "power"]
    }
  },
  {
    id: "se-galaxy-vs-500",
    name: "Schneider Galaxy VS 500 kW UPS",
    vendor: "schneider",
    kind: "power",
    powerType: "ups",
    availableFrom: 2020,
    priceUSD: 155e3,
    leadTimeMonths: 3,
    capacityKW: 500,
    efficiency: 0.97,
    installMonths: 2,
    codex: {
      summary: "500 kW double-conversion UPS keeping sags, spikes and outages away from the IT load.",
      explain: "The inverter continuously regenerates clean AC from batteries, burning ~3% of everything that passes through. Batteries bridge the seconds until diesels synchronize.",
      tradeoffs: [
        "Double conversion protects best but taxes every IT watt ~3%",
        "Eco-mode reaches ~99% efficiency by passing raw utility most of the time"
      ],
      tags: ["ups", "backup", "power", "pue"]
    }
  },
  {
    id: "et-93ps-225",
    name: "Eaton 93PS 225 kW Modular UPS",
    vendor: "eaton",
    kind: "power",
    powerType: "ups",
    availableFrom: 2020,
    priceUSD: 75e3,
    leadTimeMonths: 2,
    capacityKW: 225,
    efficiency: 0.96,
    installMonths: 1.5,
    codex: {
      summary: "Modular 225 kW UPS frame with plug-in power modules for small halls and edge sites.",
      explain: "Buy capacity in 25-50 kW slices as the hall fills instead of paying for an oversized frame on day one. Internal N+1 modules keep the load alive during swaps.",
      tradeoffs: [
        "Higher cost per kW than monolithic megawatt frames",
        "225 kW is one AI rack soon after 2023 - plan to outgrow it"
      ],
      tags: ["ups", "modular", "power"]
    }
  },
  {
    id: "vt-exl-s1-1250",
    name: "Vertiv EXL S1 1250 kW UPS",
    vendor: "vertiv",
    kind: "power",
    powerType: "ups",
    availableFrom: 2021,
    priceUSD: 43e4,
    leadTimeMonths: 4,
    capacityKW: 1250,
    efficiency: 0.97,
    installMonths: 3,
    codex: {
      summary: "1.25 MW monolithic double-conversion UPS for serious halls.",
      explain: "One frame carries a megawatt-class room; paralleling frames gives N+1 redundancy at ~97% efficiency at high load. The workhorse of colo halls.",
      tradeoffs: [
        "N+1 paralleling nearly doubles footprint and cost",
        "Efficiency drops badly below ~40% load - size frames to run hot"
      ],
      tags: ["ups", "mw-scale", "power"]
    }
  },
  {
    id: "se-galaxy-vxl-1250",
    name: "Schneider Galaxy VXL 1250 kW UPS",
    vendor: "schneider",
    kind: "power",
    powerType: "ups",
    availableFrom: 2024,
    priceUSD: 45e4,
    leadTimeMonths: 5,
    capacityKW: 1250,
    efficiency: 0.975,
    installMonths: 2.5,
    codex: {
      summary: "2024-generation 1.25 MW UPS packing a megawatt into about half the traditional footprint at 97.5%.",
      explain: "Denser power electronics and live-swap modules shrink the power room right when AI halls need the space back for cooling kit.",
      tradeoffs: [
        "Concentrating 1.25 MW per frame makes maintenance windows high-stakes",
        "Premium price only pays back when actually loaded near capacity"
      ],
      tags: ["ups", "mw-scale", "power", "2024"]
    }
  },
  {
    id: "gen-vrla-500",
    name: "VRLA Battery String (500 kWh / 250 kW)",
    vendor: "generic",
    kind: "power",
    powerType: "battery",
    availableFrom: 2020,
    priceUSD: 7e4,
    leadTimeMonths: 2,
    capacityKW: 250,
    efficiency: 0.85,
    installMonths: 0.5,
    codex: {
      summary: "Valve-regulated lead-acid strings giving a UPS 5-10 minutes of ride-through.",
      explain: "Cheap per kWh and boring in a good way; covers the gap between utility loss and diesel sync. Round-trip losses are irrelevant for this duty.",
      tradeoffs: [
        "3-5 year replacement cycle and heavy derating in warm rooms",
        "A tonne per ~100 kWh: floor loading adds up fast"
      ],
      tags: ["battery", "vrla", "backup"]
    }
  },
  {
    id: "vt-dynaflex-750",
    name: "Vertiv DynaFlex LFP BESS (750 kW / 1.5 MWh)",
    vendor: "vertiv",
    kind: "power",
    powerType: "battery",
    availableFrom: 2023,
    priceUSD: 36e4,
    leadTimeMonths: 4,
    capacityKW: 750,
    efficiency: 0.92,
    installMonths: 2,
    codex: {
      summary: "Lithium-iron-phosphate battery cabinet pairing with Vertiv UPSs for long ride-through and peak shaving.",
      explain: "LFP lasts 2-3x longer than VRLA, tolerates deep cycling, and can shave utility demand peaks. Integrated battery management talks to the UPS lineup.",
      tradeoffs: [
        "Higher capex per kWh than lead-acid, though lower TCO",
        "Thermal-runaway engineering and commissioning add real overhead"
      ],
      tags: ["battery", "lfp", "bess", "peak-shaving"]
    }
  },
  {
    id: "vt-powerbar-400",
    name: "Vertiv PowerBar Overhead Busway (400 kW run)",
    vendor: "vertiv",
    kind: "power",
    powerType: "busway",
    availableFrom: 2020,
    priceUSD: 38e3,
    leadTimeMonths: 2,
    capacityKW: 400,
    efficiency: 0.995,
    installMonths: 1,
    codex: {
      summary: "Overhead busway run at 400 V carrying ~400 kW per tap-off zone.",
      explain: "Rack PDUs clamp onto the bus instead of pulling home-run conduits back to floor PDUs, turning rack power changes into a plug-in job.",
      tradeoffs: [
        "Retrofitting tap-offs under live load is slow and procedure-heavy",
        "Tap-off boxes cost more per rack than hardwired whips"
      ],
      tags: ["busway", "distribution", "rack-power"]
    }
  },
  {
    id: "vt-geist-5kw",
    name: "Vertiv Geist Switched Rack PDU (5 kW 1-phase)",
    vendor: "vertiv",
    kind: "power",
    powerType: "pdu",
    availableFrom: 2020,
    priceUSD: 1600,
    leadTimeMonths: 1,
    capacityKW: 5,
    efficiency: 0.99,
    installMonths: 0.1,
    codex: {
      summary: "Metered, per-outlet-switchable single-phase rack PDU for classic air-cooled racks.",
      explain: "Branch metering feeds your DCIM data and remote power cycling saves a truck roll. At 208 V single phase you top out near 5 kW per feed.",
      tradeoffs: [
        "Single-phase feeds cap at ~5 kW: useless for AI racks",
        "Per-outlet switching costs 2-3x a dumb strip"
      ],
      tags: ["pdu", "rack-power", "metering"]
    }
  },
  {
    id: "vt-geist-22kw",
    name: "Vertiv Geist 3-Phase Rack PDU (22 kW)",
    vendor: "vertiv",
    kind: "power",
    powerType: "pdu",
    availableFrom: 2020,
    priceUSD: 3400,
    leadTimeMonths: 1,
    capacityKW: 22,
    efficiency: 0.99,
    installMonths: 0.1,
    codex: {
      summary: "Three-phase 400/415 V rack PDU delivering ~22 kW into one cabinet.",
      explain: "Three phases share neutral current efficiently, quadrupling per-feed power versus single-phase. The default for dense 2U-server and HGX-class racks.",
      tradeoffs: [
        "Requires balanced phases or you waste a third of the capacity",
        "Still short of the 40-130 kW modern liquid racks demand"
      ],
      tags: ["pdu", "rack-power", "3phase"]
    }
  },
  {
    id: "vt-geist-150kw",
    name: "Vertiv Geist High-Density Rack PDU (150 kW)",
    vendor: "vertiv",
    kind: "power",
    powerType: "pdu",
    availableFrom: 2024,
    priceUSD: 12e3,
    leadTimeMonths: 2,
    capacityKW: 150,
    efficiency: 0.99,
    installMonths: 0.25,
    codex: {
      summary: "Busbar-fed three-phase rack PDU rated 150 kW for NVL72-class liquid racks.",
      explain: "A GB200 NVL72 rack can pull 120-132 kW, several times what any corded PDU can feed; these units tap rack busbars and meter every branch.",
      tradeoffs: [
        "A single feed failure bricks the whole rack, so designs go A/B busbar",
        "Only meaningful with liquid cooling: no air rack survives this density"
      ],
      tags: ["pdu", "rack-power", "nvl72", "high-density"]
    }
  },
  {
    id: "dl-orv3-shelf-33",
    name: "Delta ORv3 Power Shelf (33 kW, 48 VDC)",
    vendor: "delta",
    kind: "power",
    powerType: "power-shelf",
    availableFrom: 2023,
    priceUSD: 4800,
    leadTimeMonths: 2,
    capacityKW: 33,
    efficiency: 0.975,
    installMonths: 0.1,
    codex: {
      summary: "Open Rack v3 power shelf rectifying 415 VAC to 48 VDC busbars, 33 kW per shelf.",
      explain: "ORv3 moves conversion into the rack: hot-swap 5.5 kW modules feed 48 V busbars that trays clip onto directly. NVIDIA MGX racks stack shelves to 100 kW+.",
      tradeoffs: [
        "48 V means enormous currents: 100 kW draws over 2000 A through busbars",
        "N+1 modules per shelf trade idle capacity against single-module failures"
      ],
      tags: ["orv3", "power-shelf", "48v", "mgx"]
    }
  },
  {
    id: "gen-genset-2500",
    name: "2.5 MW Diesel Genset (CAT 3516-class)",
    vendor: "generic",
    kind: "power",
    powerType: "genset",
    availableFrom: 2020,
    priceUSD: 19e5,
    leadTimeMonths: 6,
    capacityKW: 2500,
    efficiency: 0.38,
    installMonths: 6,
    codex: {
      summary: "2.5 MW medium-speed diesel generator set carrying the hall through utility outages.",
      explain: "Starts, warms and synchronizes in well under a minute while UPS batteries hold the load. ~38% of fuel energy becomes electricity; the rest is heat out the radiator and exhaust.",
      tradeoffs: [
        "Emissions permits and fuel storage make these backup-only in practice",
        "Weekly no-load exercising is mandatory or they fail when needed"
      ],
      tags: ["genset", "diesel", "backup"]
    }
  },
  {
    id: "gen-turbine-15",
    name: "15 MW Gas Turbine (Titan 130-class)",
    vendor: "generic",
    kind: "power",
    powerType: "gas-turbine",
    availableFrom: 2020,
    priceUSD: 14e6,
    leadTimeMonths: 9,
    capacityKW: 15e3,
    efficiency: 0.35,
    installMonths: 18,
    codex: {
      summary: "Industrial gas turbine generating 15 MW on-site where the grid is weak, slow or expensive.",
      explain: "Turns a gas contract into firm power for a whole AI block, and exhaust heat can drive absorption chillers in combined cooling and power mode.",
      tradeoffs: [
        "Gas prices flow straight into opex per kWh",
        "An 18-month build makes this a strategic bet, not a quick fix"
      ],
      tags: ["gas-turbine", "onsite-power", "mw-scale"]
    }
  },
  {
    id: "gen-turbine-32",
    name: "32 MW Aero-Derivative Gas Turbine (LM2500-class)",
    vendor: "generic",
    kind: "power",
    powerType: "gas-turbine",
    availableFrom: 2021,
    priceUSD: 26e6,
    leadTimeMonths: 10,
    capacityKW: 32e3,
    efficiency: 0.39,
    installMonths: 20,
    codex: {
      summary: "Jet-engine-derivative turbine delivering 32 MW with fast start and ~39% efficiency.",
      explain: "Aero cores spin up in ~10 minutes, letting datacenters use them for peak shaving and grid-constrained expansion, not just emergency backup.",
      tradeoffs: [
        "Highest capex per kW in the plant; needs firm gas supply contracts",
        "Maintenance counts in fired hours, so cycling it daily gets costly"
      ],
      tags: ["gas-turbine", "aeroderivative", "onsite-power"]
    }
  },
  {
    id: "gen-solar-ppa-10mw",
    name: "Utility Solar PPA Block (10 MW nameplate)",
    vendor: "generic",
    kind: "power",
    powerType: "solar-ppa",
    availableFrom: 2021,
    priceUSD: 18e4,
    leadTimeMonths: 6,
    capacityKW: 1e4,
    efficiency: 0.25,
    installMonths: 12,
    codex: {
      summary: "Power purchase agreement block: 10 MW of nameplate solar contracted at a fixed price, no capex.",
      explain: "You pay an interconnection fee and a per-kWh rate below grid retail. The efficiency figure models firm capacity: nights and weather mean only ~25% of nameplate is dependable.",
      tradeoffs: [
        "Cheapest energy per kWh but never firm: needs BESS or turbines behind it",
        "Multi-year contract locks pricing against future market swings"
      ],
      tags: ["ppa", "solar", "renewables", "opex"]
    }
  }
];
const COOLING = [
  {
    id: "vt-crah-100",
    name: "Vertiv Liebert CRAH 100 kW",
    vendor: "vertiv",
    kind: "cooling",
    coolingType: "crah",
    availableFrom: 2020,
    priceUSD: 42e3,
    leadTimeMonths: 2,
    capacityKW: 100,
    wattsPerKW: 25,
    serves: "air",
    supplyTempC: 22,
    installMonths: 1,
    codex: {
      summary: "Computer-room air handler pulling hot return air through chilled-water coils and blowing ~22 C supply.",
      explain: "Fan power is what you pay here; the real electric bill sits in the chiller plant behind the coils. EC fans and raised-floor delivery define classic hall cooling.",
      tradeoffs: [
        "Only as good as its chilled-water plant: count both in PUE",
        "Air delivery caps out near 20-40 kW per rack before fans and recirculation win"
      ],
      tags: ["crah", "air", "chilled-water"]
    }
  },
  {
    id: "se-uniflair-300",
    name: "Schneider Uniflair CRAH 300 kW",
    vendor: "schneider",
    kind: "cooling",
    coolingType: "crah",
    availableFrom: 2020,
    priceUSD: 115e3,
    leadTimeMonths: 2,
    capacityKW: 300,
    wattsPerKW: 22,
    serves: "air",
    supplyTempC: 22,
    installMonths: 1.5,
    codex: {
      summary: "Floor-standing 300 kW chilled-water CRAH with EC fans and variable-capacity control.",
      explain: "Larger frames with modulating fans hold supply temperature tightly across load swings, which keeps efficiency near its 22 W/kW rating most of the year.",
      tradeoffs: [
        "Fewer, bigger units reduce fan count but concentrate failure domains",
        "Still air: the per-rack density ceiling remains"
      ],
      tags: ["crah", "air", "chilled-water"]
    }
  },
  {
    id: "gen-ahu-1000",
    name: "Modular Central AHU (1 MW)",
    vendor: "generic",
    kind: "cooling",
    coolingType: "crah",
    availableFrom: 2020,
    priceUSD: 26e4,
    leadTimeMonths: 3,
    capacityKW: 1e3,
    wattsPerKW: 18,
    serves: "air",
    supplyTempC: 22,
    installMonths: 3,
    codex: {
      summary: "Rooftop-style modular air handling unit moving 1 MW of hall heat to a chilled-water loop.",
      explain: "Central airhandlers beat rows of small CRAHs on fan efficiency at scale and free-cool on economizer dampers when outside air cooperates.",
      tradeoffs: [
        "Ducting and volume dampers make retrofits disruptive",
        "One 1 MW unit down means a hot zone until N+1 kicks in"
      ],
      tags: ["ahu", "air", "economizer"]
    }
  },
  {
    id: "vt-rdhx-40",
    name: "Vertiv Passive Rear-Door HX (40 kW)",
    vendor: "vertiv",
    kind: "cooling",
    coolingType: "rdhx",
    availableFrom: 2020,
    priceUSD: 8500,
    leadTimeMonths: 1.5,
    capacityKW: 40,
    wattsPerKW: 5,
    serves: "air",
    supplyTempC: 18,
    installMonths: 0.25,
    codex: {
      summary: "Passive chilled-water rear-door heat exchanger neutralizing rack exhaust before it reaches the room.",
      explain: "The door coil captures 100% of rack heat with no added fans, so the room loop only sees leakage and lighting. A cheap bridge from air-cooled to high density.",
      tradeoffs: [
        "Adds ~30 kg and door swing depth to every cabinet",
        "Capacity collapses if chilled water is not cold and plentiful"
      ],
      tags: ["rdhx", "rear-door", "air", "chilled-water"]
    }
  },
  {
    id: "se-rdhx-60",
    name: "Schneider Active Rear-Door HX (60 kW)",
    vendor: "schneider",
    kind: "cooling",
    coolingType: "rdhx",
    availableFrom: 2021,
    priceUSD: 14e3,
    leadTimeMonths: 2,
    capacityKW: 60,
    wattsPerKW: 9,
    serves: "air",
    supplyTempC: 18,
    installMonths: 0.25,
    codex: {
      summary: "Fan-assisted rear-door heat exchanger extracting up to 60 kW from a single rack.",
      explain: "Assisted doors add small fans to pull exhaust through a bigger coil, pushing past passive-door limits while still keeping room air thermally neutral.",
      tradeoffs: [
        "Fan power (9 W/kW) is still far cheaper than CRAH overcooling",
        "Door fans become a maintenance item at thousands of racks"
      ],
      tags: ["rdhx", "rear-door", "high-density"]
    }
  },
  {
    id: "ct-cdu-80",
    name: "CoolIT In-Rack CDU (80 kW)",
    vendor: "coolit",
    kind: "cooling",
    coolingType: "cdu",
    availableFrom: 2020,
    priceUSD: 32e3,
    leadTimeMonths: 2,
    capacityKW: 80,
    wattsPerKW: 20,
    serves: "dlc",
    supplyTempC: 30,
    installMonths: 0.25,
    codex: {
      summary: "In-rack coolant distribution unit pumping temperature-controlled water to cold plates.",
      explain: "Separates dirty facility water from the polished tech-coolant loop touching the silicon, exchanging heat through a plate exchanger inside the rack.",
      tradeoffs: [
        "One pump failure takes out exactly that rack: cheap but blunt redundancy",
        "Rack real estate spent on the CDU is not spent on GPUs"
      ],
      tags: ["cdu", "dlc", "in-rack", "cold-plate"]
    }
  },
  {
    id: "ct-coldplate-80",
    name: "CoolIT Rack Cold-Plate Loop Kit (80 kW)",
    vendor: "coolit",
    kind: "cooling",
    coolingType: "cold-plate-loop",
    availableFrom: 2021,
    priceUSD: 25e3,
    leadTimeMonths: 2,
    capacityKW: 80,
    wattsPerKW: 12,
    serves: "dlc",
    supplyTempC: 30,
    installMonths: 0.25,
    codex: {
      summary: "Manifolds, quick-disconnects and copper cold plates converting a rack to direct liquid cooling.",
      explain: "Captures 70-80% of AI heat straight into water at 30 C, sidestepping the air ceiling entirely; the loop still needs a CDU to reject that heat somewhere.",
      tradeoffs: [
        "Accelerator swaps mean dripless disconnects and spill procedures",
        "A fitting leak is rare but catastrophic for one tray"
      ],
      tags: ["cold-plate", "dlc", "retrofit"]
    }
  },
  {
    id: "dl-cdu-150",
    name: "Delta ORv3 In-Rack CDU (150 kW)",
    vendor: "delta",
    kind: "cooling",
    coolingType: "cdu",
    availableFrom: 2023,
    priceUSD: 45e3,
    leadTimeMonths: 2,
    capacityKW: 150,
    wattsPerKW: 18,
    serves: "dlc",
    supplyTempC: 32,
    installMonths: 0.25,
    codex: {
      summary: "ORv3-form-factor in-rack CDU moving 150 kW from rack coolant loop to facility water.",
      explain: "Slides into the same rack ecosystem as ORv3 power shelves, giving MGX-style builds matched liquid distribution at 32 C supply.",
      tradeoffs: [
        "Higher supply temps save chiller energy but shrink safety margin",
        "Still per-rack redundancy: row-level CDUs scale better"
      ],
      tags: ["cdu", "orv3", "dlc", "mgx"]
    }
  },
  {
    id: "mv-chillcdu-1800",
    name: "Motivair ChillCDU 1800 (1.8 MW)",
    vendor: "motivair",
    kind: "cooling",
    coolingType: "cdu",
    availableFrom: 2023,
    priceUSD: 4e5,
    leadTimeMonths: 3,
    capacityKW: 1800,
    wattsPerKW: 25,
    serves: "dlc",
    supplyTempC: 32,
    installMonths: 2,
    codex: {
      summary: "Row-scale 1.8 MW liquid-to-liquid CDU sized for GB200 NVL72-class rows.",
      explain: "Two 130 kW racks already exceed 250 kW, so halls deploy megawatt CDUs between facility water and rack coolant, typically one per rack-pair with an N+1 spare.",
      tradeoffs: [
        "N+1 spares idle a megawatt of capital capacity",
        "Facility water temperature and quality define real throughput"
      ],
      tags: ["cdu", "nvl72", "dlc", "mw-scale"]
    }
  },
  {
    id: "ct-cdu-1600",
    name: "CoolIT CHx1600-Class CDU (1.6 MW)",
    vendor: "coolit",
    kind: "cooling",
    coolingType: "cdu",
    availableFrom: 2024,
    priceUSD: 38e4,
    leadTimeMonths: 3,
    capacityKW: 1600,
    wattsPerKW: 22,
    serves: "dlc",
    supplyTempC: 32,
    installMonths: 2,
    codex: {
      summary: "Redundant-pump 1.6 MW coolant distribution unit for dense direct-liquid rows.",
      explain: "Dual pump paths and warm-water operation at 32 C let rows run most of the year on dry coolers alone instead of compressor-based chillers.",
      tradeoffs: [
        "Built-in redundancy raises price per kW over in-rack units",
        "Bigger single units mean bigger maintenance lifts and rigging"
      ],
      tags: ["cdu", "dlc", "redundant", "warm-water"]
    }
  },
  {
    id: "vt-coolchip-2300",
    name: "Vertiv CoolChip CDU 2300 (2.3 MW)",
    vendor: "vertiv",
    kind: "cooling",
    coolingType: "cdu",
    availableFrom: 2024.5,
    priceUSD: 46e4,
    leadTimeMonths: 4,
    capacityKW: 2300,
    wattsPerKW: 24,
    serves: "dlc",
    supplyTempC: 32,
    installMonths: 2,
    codex: {
      summary: "2.3 MW coolant distribution unit sized for GB300 and Vera-Rubin era liquid rows.",
      explain: "Racks are headed past 130 kW each, and CDU capacity per row has to keep pace; 2.3 MW covers a pair of 250 kW-class racks with change to spare.",
      tradeoffs: [
        "A single 2 MW+ unit is a huge blast radius without row redundancy",
        "High supply temps save chillers but must match silicon warranty limits"
      ],
      tags: ["cdu", "dlc", "gb300", "rubin"]
    }
  },
  {
    id: "se-chiller-400",
    name: "Air-Cooled Screw Chiller (400 kW)",
    vendor: "schneider",
    kind: "cooling",
    coolingType: "chiller",
    availableFrom: 2020,
    priceUSD: 12e4,
    leadTimeMonths: 3,
    capacityKW: 400,
    wattsPerKW: 290,
    serves: "air",
    supplyTempC: 10,
    installMonths: 2,
    codex: {
      summary: "Self-contained air-cooled screw chiller making 400 kW of 10 C chilled water, no cooling tower needed.",
      explain: "Rejects hall heat straight to outside air via refrigeration at roughly 1.1 kW per ton, which lands near 290 electrical watts per kW of IT heat.",
      tradeoffs: [
        "Simple siting, but capacity and efficiency sag badly on hot days",
        "Compressor power dominates PUE: pair with economizer hours when possible"
      ],
      tags: ["chiller", "air-cooled", "chilled-water"]
    }
  },
  {
    id: "gen-chiller-2000",
    name: "Water-Cooled Centrifugal Chiller (2 MW)",
    vendor: "generic",
    kind: "cooling",
    coolingType: "chiller",
    availableFrom: 2020,
    priceUSD: 65e4,
    leadTimeMonths: 4,
    capacityKW: 2e3,
    wattsPerKW: 170,
    serves: "air",
    supplyTempC: 10,
    installMonths: 4,
    codex: {
      summary: "Plant-class water-cooled centrifugal chiller delivering 2 MW of chilled water at ~0.6 kW per ton.",
      explain: "Condenser water from towers lets centrifugal compressors hit ~170 W/kW, the efficient end of chilled-water plants that large halls standardize on.",
      tradeoffs: [
        "Needs towers, water treatment and permits on site",
        "Part-load efficiency favors staging several smaller units"
      ],
      tags: ["chiller", "centrifugal", "chilled-water", "plant"]
    }
  },
  {
    id: "mv-drycooler-1000",
    name: "Motivair Dry Cooler (1 MW)",
    vendor: "motivair",
    kind: "cooling",
    coolingType: "dry-cooler",
    availableFrom: 2021,
    priceUSD: 85e3,
    leadTimeMonths: 2,
    capacityKW: 1e3,
    wattsPerKW: 20,
    serves: "dlc",
    supplyTempC: 30,
    installMonths: 2,
    codex: {
      summary: "1 MW dry cooler rejecting warm loop heat to ambient air with fans only, no compressor.",
      explain: "With 30 C+ direct-liquid loops, the loop runs warmer than the outside air most of the year, so plain radiators do the job and chillers stay off.",
      tradeoffs: [
        "Capacity collapses on 40 C days: size for your design ambient",
        "Zero water use, but you trade that against hot-weather derating"
      ],
      tags: ["dry-cooler", "free-cooling", "warm-water", "no-water"]
    }
  },
  {
    id: "gen-tower-2000",
    name: "Evaporative Cooling Tower (2 MW)",
    vendor: "generic",
    kind: "cooling",
    coolingType: "cooling-tower",
    availableFrom: 2020,
    priceUSD: 15e4,
    leadTimeMonths: 3,
    capacityKW: 2e3,
    wattsPerKW: 12,
    serves: "air",
    supplyTempC: 25,
    installMonths: 3,
    codex: {
      summary: "Evaporative cooling tower rejecting 2 MW of condenser heat at ~12 W/kW.",
      explain: "Evaporating 1 kg of water absorbs ~2.26 MJ, so towers reject heat nearly free electrically; they are what makes water-cooled chillers and water-side economization efficient.",
      tradeoffs: [
        "Burns roughly 1.8 L of water per kWh of heat rejected",
        "Legionella dosing, winterization and drift elimination never stop"
      ],
      tags: ["cooling-tower", "evaporative", "water"]
    }
  },
  {
    id: "su-smartpod-100",
    name: "Submer SmartPod Immersion Tank (100 kW)",
    vendor: "submer",
    kind: "cooling",
    coolingType: "immersion-tank",
    availableFrom: 2021,
    priceUSD: 16e4,
    leadTimeMonths: 3,
    capacityKW: 100,
    wattsPerKW: 8,
    serves: "immersion",
    supplyTempC: 40,
    installMonths: 1,
    codex: {
      summary: "Single-phase immersion tank: ~100 kW of servers bathed in circulating dielectric fluid.",
      explain: "Boards sit in non-conductive oil that convects heat to a 40 C water loop; fans disappear entirely and silicon can run nearer its limits.",
      tradeoffs: [
        "PUE contribution near 1.03-1.05, but hardware swaps are slow and oily",
        "Several tonnes filled: floor loading and specialist ops skills required"
      ],
      tags: ["immersion", "single-phase", "submer"]
    }
  },
  {
    id: "su-smartpodx-1000",
    name: "Submer SmartPodX Pod (1 MW)",
    vendor: "submer",
    kind: "cooling",
    coolingType: "immersion-tank",
    availableFrom: 2024,
    priceUSD: 11e5,
    leadTimeMonths: 4,
    capacityKW: 1e3,
    wattsPerKW: 6,
    serves: "immersion",
    supplyTempC: 45,
    installMonths: 4,
    codex: {
      summary: "Megawatt-scale immersion pod running 45 C warm-water heat rejection for dense AI blocks.",
      explain: "Purpose-built multi-tank pods with integrated pumps target the densest deployments without cold plates, feeding heat straight to dry coolers or reuse.",
      tradeoffs: [
        "Locks you into immersion-compatible tray designs",
        "Immersion technicians are rare; train and retain them"
      ],
      tags: ["immersion", "mw-scale", "warm-water", "heat-reuse"]
    }
  }
];
const ERA_CPUS = [
  {
    id: "amd-epyc-7742",
    kind: "cpu",
    name: "AMD EPYC 7742 (Rome)",
    vendor: "amd",
    availableFrom: 2019.6,
    priceUSD: 6950,
    leadTimeMonths: 2,
    arch: "x86",
    cores: 64,
    tdpW: 225,
    memChannels: 8,
    maxMemGB: 4096,
    memBWGBs: 204.8,
    pcieGen: 4,
    pcieLanes: 128,
    codex: {
      summary: "64-core Zen 2 server CPU and the first x86 host with PCIe Gen4, which A100 and ConnectX-6 need.",
      explain: "Rome gave 128 PCIe Gen4 lanes per socket, so one CPU can feed GPUs, NICs and NVMe without a lane shortage. That is why DGX A100 picked AMD hosts.",
      tradeoffs: ["Gen4 lanes double the bandwidth to NICs and drives", "Host CPU power is small next to the GPUs but still counts against rack kW"],
      tags: ["host", "pcie4"]
    }
  },
  {
    id: "amd-epyc-7763",
    kind: "cpu",
    name: "AMD EPYC 7763 (Milan)",
    vendor: "amd",
    availableFrom: 2021.2,
    priceUSD: 7890,
    leadTimeMonths: 2,
    arch: "x86",
    cores: 64,
    tdpW: 280,
    memChannels: 8,
    maxMemGB: 4096,
    memBWGBs: 204.8,
    pcieGen: 4,
    pcieLanes: 128,
    codex: {
      summary: "Zen 3 refresh of Rome with higher IPC; a common host CPU for HGX A100 servers.",
      explain: "Same socket and lanes as Rome with about 19% better per-core performance. Host CPUs matter for data loading and for the NIC and driver software path.",
      tradeoffs: ["More host performance helps data pipelines", "Adds about 55 W per socket over Rome"],
      tags: ["host", "pcie4"]
    }
  },
  {
    id: "intel-xeon-8380",
    kind: "cpu",
    name: "Intel Xeon Platinum 8380 (Ice Lake)",
    vendor: "intel",
    availableFrom: 2021.3,
    priceUSD: 8099,
    leadTimeMonths: 2,
    arch: "x86",
    cores: 40,
    tdpW: 270,
    memChannels: 8,
    maxMemGB: 6144,
    memBWGBs: 204.8,
    pcieGen: 4,
    pcieLanes: 64,
    codex: {
      summary: "Intel 40-core Ice Lake-SP with PCIe Gen4, offered in HGX A100 platforms by many OEMs.",
      explain: "Ice Lake brought Gen4 to Intel servers, but with 64 lanes per socket against 128 on EPYC. Dense GPU and NIC trays often need two sockets to reach the same lane count.",
      tradeoffs: ["Fewer PCIe lanes per socket than EPYC", "Strong software ecosystem and OEM availability"],
      tags: ["host", "pcie4"]
    }
  }
];
const ERA_NVME = [
  {
    id: "sam-pm1733-3t84",
    kind: "nvme",
    name: "Samsung PM1733 3.84 TB (Gen4 U.2)",
    vendor: "samsung",
    availableFrom: 2020,
    priceUSD: 780,
    leadTimeMonths: 1,
    capacityTB: 3.84,
    readGBs: 7,
    writeGBs: 3.8,
    pcieGen: 4,
    watts: 17,
    codex: {
      summary: "Enterprise PCIe Gen4 U.2 SSD, about 7 GB/s sequential read.",
      explain: "Training jobs read datasets and write checkpoints. Eight local drives give a tray tens of GB/s, enough to stage data and absorb checkpoint bursts without stalling the GPUs.",
      tradeoffs: ["Each drive uses 4 PCIe lanes from the host budget", "Local NVMe is fast but not shared; the cluster also needs network storage"],
      tags: ["storage", "checkpoint"]
    }
  },
  {
    id: "sam-pm1733-7t68",
    kind: "nvme",
    name: "Samsung PM1733 7.68 TB (Gen4 U.2)",
    vendor: "samsung",
    availableFrom: 2020,
    priceUSD: 1450,
    leadTimeMonths: 1,
    capacityTB: 7.68,
    readGBs: 7,
    writeGBs: 3.8,
    pcieGen: 4,
    watts: 17,
    codex: {
      summary: "Double-capacity Gen4 U.2 SSD with the same throughput as the 3.84 TB model.",
      explain: "Capacity per lane doubles at the same bandwidth. Use it when datasets, not speed, are the limit.",
      tradeoffs: ["Better capacity per PCIe lane", "Higher cost per drive"],
      tags: ["storage"]
    }
  }
];
const must = (arr, id) => {
  const x = arr.find((i) => i.id === id);
  if (!x) throw new Error("era2020: missing base " + id);
  return x;
};
const A100 = must(NVIDIA_ACCELERATORS, "nv-a100-80-sxm");
const V100 = must(NVIDIA_ACCELERATORS, "nv-v100-sxm2");
const ERA_ACCELERATORS = [
  {
    ...A100,
    id: "nv-a100-40-sxm",
    name: "A100 40GB SXM4",
    availableFrom: 2020.4,
    priceUSD: 12500,
    memGB: 40,
    memBWTBs: 1.56,
    memType: "hbm2",
    codex: {
      summary: "The launch A100: 40 GB HBM2 at 1.56 TB/s, same compute as the 80 GB part.",
      explain: "Memory capacity, not FLOPS, is what the 80 GB refresh fixed: bigger models and KV caches fit per GPU, so fewer GPUs per replica.",
      tradeoffs: ["Cheaper per GPU but half the model fits per card", "Same NVLink3 and tensor cores as the 80 GB model"],
      tags: ["ampere", "hbm"]
    }
  },
  {
    ...V100,
    id: "nv-v100-32-sxm2",
    name: "Tesla V100 SXM2 32GB",
    availableFrom: 2018.2,
    eolAfter: 2022.5,
    priceUSD: 9500,
    memGB: 32,
    codex: {
      summary: "Volta with 32 GB HBM2 - the last pre-Ampere workhorse, now discounted.",
      explain: "Still useful for inference and small training, but no BF16/TF32 tensor cores, so modern training recipes run far slower than on A100.",
      tradeoffs: ["Cheap, but lacks BF16/TF32 - poor for new LLM training", "NVLink2: 300 GB/s per GPU vs 600 on A100"],
      tags: ["volta", "legacy"]
    }
  },
  {
    ...A100,
    id: "nv-a100-80-pcie",
    name: "A100 80GB PCIe",
    availableFrom: 2021.45,
    formFactor: "pcie",
    priceUSD: 14e3,
    tdpW: 300,
    scaleUp: "pcie",
    scaleUpGBs: 64,
    maxScaleUpDomain: 8,
    pcieGen: 4,
    pcieLanes: 16,
    codex: {
      summary: "Same Ampere die in a 300 W PCIe card: no NVSwitch fabric, GPUs talk over PCIe.",
      explain: "PCIe cards drop into ordinary servers and are cheap to deploy, but multi-GPU training is bottlenecked by PCIe (64 GB/s vs 600 GB/s NVLink). Best for inference of models that fit one GPU.",
      tradeoffs: ["Easy to deploy, lower power per card", "Poor for tensor/expert-parallel training across GPUs"],
      tags: ["pcie", "inference"]
    }
  }
];
const CX6 = must(NICS, "nv-connectx6-dx");
const ERA_NICS = [
  {
    ...CX6,
    id: "nv-connectx6-hdr",
    name: "NVIDIA ConnectX-6 VPI HDR 200G",
    availableFrom: 2019.9,
    tech: "ib-hdr",
    gbps: 200,
    ports: 1,
    watts: 20,
    features: ["rdma", "gpudirect", "sharp"],
    codex: {
      summary: "The InfiniBand HDR (200 Gb/s) adapter that connected 2020-era A100 supercomputers.",
      explain: "One CX-6 per GPU (rail-per-GPU) gives each A100 its own 200 Gb/s path; RDMA and GPUDirect let NICs move GPU memory without the CPU. InfiniBand gave training clusters lossless, low-latency collectives.",
      tradeoffs: ["InfiniBand is purpose-built for HPC/AI but vendor-locked to NVIDIA", "One NIC per GPU doubles network cost versus one per pair"],
      tags: ["infiniband", "rdma", "hdr"]
    }
  }
];
const QM = must(SWITCHES, "nv-sn3700c");
const ERA_SWITCHES = [
  {
    ...QM,
    id: "nv-qm8700",
    name: "NVIDIA Quantum QM8700 HDR (40x200G)",
    role: "scale-out",
    tech: "ib-hdr",
    availableFrom: 2018.9,
    priceUSD: 24e3,
    portCount: 40,
    portGbps: 200,
    capacityTbps: 16,
    rackUnits: 1,
    watts: 253,
    inNetworkCompute: true,
    features: ["sharp", "adaptive-routing"],
    codex: {
      summary: "40-port 200 Gb/s InfiniBand switch: the leaf/spine building block of 2020-2021 AI clusters.",
      explain: "A radix-40 switch builds a non-blocking fat-tree: 20 ports down to nodes, 20 up to spines. SHARP offloads all-reduce math into the switch, cutting collective time.",
      tradeoffs: ["Radix 40 means more switch tiers than NDR radix 64", "SHARP helps training but needs matching NICs and software"],
      tags: ["infiniband", "hdr", "sharp"]
    }
  }
];
const D32 = must(MEMORY, "sam-ddr4-3200-32");
const ERA_MEMORY = [
  { ...D32, id: "sam-ddr4-3200-64", name: "Samsung DDR4-3200 RDIMM 64GB", capacityGB: 64, priceUSD: 340, watts: 6 },
  { ...D32, id: "sam-ddr4-3200-16", name: "Samsung DDR4-3200 RDIMM 16GB", capacityGB: 16, priceUSD: 90, watts: 5 }
];
const JB = STORAGE_SYSTEMS[0];
const ERA_STORAGE = [
  {
    ...JB,
    id: "ddn-ai400x",
    name: "DDN A3I AI400X (2U NVMe parallel FS)",
    vendor: "ddn",
    availableFrom: 2020,
    priceUSD: 16e4,
    tier: "hot-nvme",
    capacityPB: 0.18,
    readGBs: 48,
    writeGBs: 30,
    rackUnits: 2,
    watts: 1400,
    codex: {
      summary: "Turnkey 2U parallel-filesystem appliance (Lustre) built for GPU clusters.",
      explain: "Training reads datasets and writes checkpoints in bursts; a shared fast filesystem keeps hundreds of GPUs fed. Appliances scale by adding units, each adding capacity and bandwidth.",
      tradeoffs: ["Buy storage bandwidth in proportion to GPU count", "Checkpoint bursts, not average load, size the system"],
      tags: ["storage", "lustre", "checkpoint"]
    }
  }
];
const ERA_CPUS_EXTRA = [
  {
    id: "amd-epyc-7542",
    kind: "cpu",
    name: "AMD EPYC 7542 (Rome, 32c)",
    vendor: "amd",
    availableFrom: 2019.6,
    priceUSD: 3400,
    leadTimeMonths: 2,
    arch: "x86",
    cores: 32,
    tdpW: 225,
    memChannels: 8,
    maxMemGB: 4096,
    memBWGBs: 204.8,
    pcieGen: 4,
    pcieLanes: 128,
    codex: {
      summary: "Half the cores of the 7742 at half the price, still with all 128 Gen4 lanes.",
      explain: "GPU servers rarely need huge CPUs: the host feeds data and drives NICs. Fewer cores cuts cost and power while keeping the PCIe lanes that matter.",
      tradeoffs: ["Cheaper hosts leave more budget for GPUs", "Too few cores can starve data loading/preprocessing"],
      tags: ["host", "pcie4"]
    }
  },
  {
    id: "intel-xeon-8280",
    kind: "cpu",
    name: "Intel Xeon Platinum 8280 (Cascade Lake)",
    vendor: "intel",
    availableFrom: 2019.3,
    eolAfter: 2023,
    priceUSD: 10009,
    leadTimeMonths: 2,
    arch: "x86",
    cores: 28,
    tdpW: 205,
    memChannels: 6,
    maxMemGB: 4608,
    memBWGBs: 140.8,
    pcieGen: 3,
    pcieLanes: 48,
    codex: {
      summary: "Last-gen Intel host: PCIe Gen3 only, so it caps a Gen4 A100/CX-6 at half speed.",
      explain: "A Gen4 device in a Gen3 slot negotiates down to Gen3 bandwidth. This is a classic trap: the right GPU in the wrong host wastes the NIC.",
      tradeoffs: ["Mature and widely stocked", "Gen3 halves host bandwidth to Gen4 NICs/NVMe"],
      tags: ["host", "pcie3"]
    }
  }
];
const B200 = must(NVIDIA_ACCELERATORS, "nv-b200-sxm");
const ERA_BLACKWELL = [
  {
    ...B200,
    id: "nv-gb200",
    name: "GB200 Blackwell GPU (NVL72 superchip)",
    formFactor: "superchip",
    availableFrom: 2024.75,
    eolAfter: 2026.5,
    priceUSD: 36e3,
    tdpW: 1200,
    memGB: 186,
    memBWTBs: 8,
    scaleUpGBs: 1800,
    maxScaleUpDomain: 72,
    cooling: ["dlc"],
    codex: {
      summary: "Blackwell GPU packaged two-per-Grace-CPU on the GB200 superchip, built to live in a 72-GPU NVLink domain.",
      explain: "In NVL72, 72 of these GPUs are wired through NVLink-5 switch trays so all 72 act as one memory-coherent accelerator. Its ~1200 W per GPU means the rack draws 120+ kW and must be liquid cooled.",
      tradeoffs: ["72-GPU scale-up domain is ideal for MoE and giant-model inference", "Whole-rack failure domain and 120+ kW density demand liquid cooling and heavy power"],
      tags: ["blackwell", "nvl72", "nvlink5", "dlc"]
    }
  },
  {
    ...B200,
    id: "nv-gb300",
    name: "GB300 Blackwell Ultra GPU (NVL72 superchip)",
    formFactor: "superchip",
    availableFrom: 2025.7,
    priceUSD: 42e3,
    tdpW: 1400,
    memGB: 279,
    memBWTBs: 8,
    scaleUpGBs: 1800,
    maxScaleUpDomain: 72,
    cooling: ["dlc"],
    codex: {
      summary: "Blackwell Ultra: same NVL72 rack, 50% more HBM3e (288 GB) per GPU.",
      explain: "Bigger HBM stacks mean longer contexts and larger batches per GPU. Reasoning models with huge KV caches are the target.",
      tradeoffs: ["More memory per GPU raises tokens/s on KV-bound inference", "Higher power per GPU pushes cooling and power limits further"],
      tags: ["blackwell", "nvl72", "hbm3e"]
    }
  }
];
const HD = RACKS.find((r) => r.id === "gen-rack-19-48u-hd");
const ERA_RACKS = [
  {
    ...HD,
    id: "gen-rack-19-48u-dlc",
    name: 'Generic 19" 48U liquid-ready rack (80 kW, manifolds)',
    availableFrom: 2022.5,
    priceUSD: 18e3,
    maxKW: 80,
    maxWeightKg: 1800,
    cooling: ["dlc", "rdhx"],
    codex: {
      summary: "19-inch cabinet with rack coolant manifolds and quick-disconnects for direct-to-chip liquid cooling.",
      explain: "Direct liquid cooling moves heat with water, not air, enabling 60-80 kW per rack. Manifolds run vertically at the back; each server taps in via blind-mate quick-disconnects.",
      tradeoffs: ["Enables 3-4x air-cooled rack density", "Needs a CDU and facility water loop; leaks become an operational risk"],
      tags: ["dlc", "manifold", "density"]
    }
  }
];
const cdx$1 = ([summary, explain, tradeoffs]) => ({ summary, explain, tradeoffs, tags: ["expansion"] });
const base$1 = (id, name, vendor, from, price, lead, c) => ({ id, name, vendor, availableFrom: from, priceUSD: price, leadTimeMonths: lead, codex: cdx$1(c) });
const pw$1 = (o) => ({ kind: "power", ...o });
const co$1 = (o) => ({ kind: "cooling", ...o });
const gen = (id, name, v2, price, kw, lead, c, from = 2020) => pw$1({ ...base$1(id, name, v2, from, price, lead, c), powerType: id.startsWith("bloom") ? "gas-turbine" : "genset", capacityKW: kw, efficiency: 0.96, installMonths: 3 });
const EXP2_POWER = [
  gen("cat-3516-2500", "Caterpillar 3516 Diesel Genset (2.5 MW)", "caterpillar", 92e4, 2500, 6, ["Cat 3516: the classic 2.5 MW data-centre diesel standby set.", "Caterpillar dominates datacenter standby power: Cat 3500-series sets start in about 10 seconds and take full load in one step. You need fuel storage, emissions permits and monthly load tests.", ["Proven, fast start, strong dealer service", "Diesel permits and fuel logistics"]]),
  gen("cat-c175-3000", "Caterpillar C175-16 Diesel Genset (3 MW)", "caterpillar", 115e4, 3e3, 7, ["Cat C175-16: 3 MW Tier-2 diesel set for large halls.", "More power per engine means fewer sets and a simpler paralleling plant.", ["Fewer engines to parallel", "Long lead time"]], 2021),
  gen("cat-g3520-gas-2500", "Caterpillar G3520 Natural-Gas Genset (2.5 MW)", "caterpillar", 14e5, 2500, 8, ["Gas-fired prime-power set: no diesel tank, can run continuously.", "Gas sets can run as on-site prime power and sell flexibility to the grid; they depend on pipeline gas, so a gas outage is a power outage unless you hold diesel too.", ["Continuous duty and lower emissions", "Depends on gas pipeline"]], 2021),
  gen("cummins-qsk95-3500", "Cummins QSK95 Diesel Genset (3.5 MW)", "cummins", 125e4, 3500, 7, ["Cummins QSK95: 3.5 MW high-speed diesel set.", "Cummins is the main alternative to Cat. Price and lead time vary by quarter; mixing brands complicates spares and training.", ["Competitive price", "Mixed fleets mean mixed spares"]], 2021),
  gen("mtu-20v4000-2750", "MTU 20V4000 Diesel Genset (2.75 MW)", "mtu", 118e4, 2750, 7, ["Rolls-Royce MTU 20V4000: a dense 2.75 MW standby set.", "MTU sets are popular in hyperscale builds and are available in rated-for-data-centre 10-second-start versions.", ["Compact for its rating", "Smaller dealer network"]]),
  gen("kohler-kd2500", "Kohler KD2500 Diesel Genset (2.5 MW)", "kohler", 87e4, 2500, 5, ["Kohler KD2500: lower-cost 2.5 MW set with shorter lead time.", "Often the cheapest and quickest to receive; you trade some dealer depth.", ["Lower price, faster delivery", "Less aftermarket support"]]),
  gen("bloom-es5-300", "Bloom Energy Server (300 kW SOFC fuel cell)", "bloom", 135e4, 300, 6, ["Solid-oxide fuel cell running on natural gas, no combustion.", "Bloom boxes give always-on on-site power with no diesel and quiet running. Cost per kW is high but they avoid grid interconnection waits.", ["Bypasses grid queue", "High $/kW"]], 2021),
  pw$1({
    ...base$1("abb-paralleling-4000", "Paralleling Switchgear (4 MW, ATS-integrated)", "abb", 2020, 26e4, 5, ["Synchronises several generators onto one bus and transfers load automatically.", "With more than one genset you need paralleling gear. It also gives N+1: lose one engine and the others still carry the hall.", ["Enables N+1 genset plants", "Complex controls, a single bus"]]),
    powerType: "switchgear",
    capacityKW: 4e3,
    efficiency: 0.998,
    installMonths: 3
  }),
  pw$1({
    ...base$1("gen-utility-feed-b", "Second utility feed (diverse substation)", "generic", 2020, 9e5, 12, ["A second grid connection from a different substation.", "Most real outages are grid faults. A diverse second feed turns them into a non-event but takes a year of utility engineering.", ["Cuts outage frequency sharply", "Long lead time and big upfront fee"]]),
    powerType: "switchgear",
    capacityKW: 5e3,
    efficiency: 0.999,
    installMonths: 6
  }),
  pw$1({
    ...base$1("piller-rotary-1500", "Rotary Flywheel UPS (1.5 MW, diesel-ready)", "generic", 2020, 52e4, 6, ["Rotary UPS: a spinning flywheel carries load until the generator starts.", "No batteries to replace; ride-through is only 10-15 seconds, so it requires a generator that starts reliably.", ["No battery maintenance", "Short ride-through"]]),
    powerType: "ups",
    capacityKW: 1500,
    efficiency: 0.975,
    installMonths: 3
  }),
  pw$1({
    ...base$1("siemens-mv-swgr-6000", "Siemens MV Switchgear (6 MW)", "siemens", 2021, 34e4, 5, ["Medium-voltage switchgear for large halls.", "Large sites distribute at MV and step down near the load; this is the breaker line-up that makes it safe to maintain.", ["Needed past ~5 MW", "Long lead time"]]),
    powerType: "switchgear",
    capacityKW: 6e3,
    efficiency: 0.998,
    installMonths: 3
  }),
  pw$1({
    ...base$1("et-padmount-10000", "Eaton 10 MVA MV Pad-Mount Transformer", "eaton", 2021, 41e4, 9, ["10 MVA transformer for multi-hall campuses.", "Transformers are the longest-lead item in power; order early.", ["One unit powers four halls", "Lead time over a year in tight markets"]]),
    powerType: "transformer",
    capacityKW: 9e3,
    efficiency: 0.99,
    installMonths: 4
  })
];
const chill = (id, name, v2, price, kw, wpk, serves, temp, lead, c, from = 2020) => co$1({ ...base$1(id, name, v2, from, price, lead, c), coolingType: "chiller", capacityKW: kw, wattsPerKW: wpk, serves, supplyTempC: temp, installMonths: 2 });
const EXP2_COOLING = [
  chill("trane-rtac-700", "Trane RTAC Air-Cooled Chiller (700 kW)", "trane", 19e4, 700, 280, "air", 10, 4, ["Trane Series R air-cooled screw chiller.", "Compact and reliable. Efficiency collapses in heat waves; water-cooled plants do better at scale.", ["Simple, no tower", "Poor hot-day efficiency"]]),
  chill("carrier-30xf-1000", "Carrier AquaForce 30XF (1 MW)", "carrier", 29e4, 1e3, 240, "air", 10, 4, ["Carrier AquaForce air-cooled chiller with VFD compressors.", "Variable-speed compressors track load, saving energy at part load, which is where datacenters run most hours.", ["Good part-load efficiency", "Capex above fixed-speed units"]]),
  chill("jci-york-yvaa-1100", "Johnson Controls YORK YVAA (1.1 MW)", "jci", 33e4, 1100, 230, "air", 10, 5, ["YORK YVAA free-cooling-capable air chiller.", "Adds a free-cooling coil so cold weather needs no compressors.", ["Seasonal free cooling", "Climate-dependent savings"]]),
  chill("trane-centravac-2500", "Trane CenTraVac Water-Cooled Chiller (2.5 MW)", "trane", 78e4, 2500, 150, "air", 8, 8, ["Magnetic-bearing centrifugal chiller on a cooling-tower loop.", "The efficiency leader for big halls, but it needs a tower, pumps and makeup water.", ["Best kW per ton at scale", "Water, tower and pumps"]], 2021),
  chill("daikin-wmc-1500", "Daikin Magnitude Oil-Free Chiller (1.5 MW)", "daikin", 54e4, 1500, 160, "air", 8, 6, ["Oil-free magnetic-bearing centrifugal chiller.", "No oil means less maintenance and better part-load efficiency.", ["Low maintenance, great part load", "Higher price"]], 2021),
  chill("trane-dlc-trim-1200", "Trane Warm-Water Trim Chiller (1.2 MW, DLC)", "trane", 36e4, 1200, 90, "dlc", 32, 5, ["Trim chiller for warm-water liquid cooling loops.", "Liquid-cooled racks accept 30 C water, so the chiller only trims on the hottest days. Energy per kW removed falls dramatically.", ["Excellent for DLC", "Useless for air-cooled halls"]], 2023),
  chill("carrier-dlc-trim-2000", "Carrier AquaEdge Trim Chiller (2 MW, DLC)", "carrier", 52e4, 2e3, 85, "dlc", 32, 6, ["Large warm-water trim chiller for liquid-cooled halls.", "Pairs with dry coolers for most-year free cooling.", ["Low PUE", "DLC only"]], 2023)
];
const up$1 = (id, name, price, mrc, gbps, carrier, service, lead, c, from = 2020) => ({ kind: "uplink", ...base$1(id, name, "generic", from, price, lead, c), gbps, mrcUSD: mrc, carrier, service });
const EXP2_UPLINKS = [
  up$1("transit-10g-a", "10G IP transit (carrier A)", 4e3, 3500, 10, "carrier-a", "transit", 1, ["10 Gb/s Tier-1 IP transit.", "Enough to start a small inference business. Billed monthly; build-out takes weeks.", ["Cheap to start", "Single carrier means a single fiber-cut risk"]]),
  up$1("transit-100g-a", "100G IP transit (carrier A)", 25e3, 22e3, 100, "carrier-a", "transit", 3, ["100 Gb/s IP transit.", "Serves mid-size inference fleets and dataset ingestion for training.", ["Price per Gb/s drops with size", "Still a single carrier"]]),
  up$1("transit-100g-b", "100G IP transit (carrier B, diverse path)", 25e3, 24e3, 100, "carrier-b", "transit", 3, ["A second 100G circuit from a different carrier on a different fiber route.", "Two carriers on diverse paths mean a backhoe cut does not take you offline.", ["Survives a fiber cut", "Pay twice for the same capacity"]]),
  up$1("transit-400g-a", "400G IP transit (carrier A)", 9e4, 7e4, 400, "carrier-a", "transit", 5, ["400 Gb/s IP transit.", "For large inference fleets and multi-petabyte dataset pulls.", ["Cheapest per Gb/s", "Large commitment"]], 2022),
  up$1("transit-400g-c", "400G IP transit (carrier C, diverse path)", 9e4, 76e3, 400, "carrier-c", "transit", 5, ["400G from a third carrier for diversity.", "The second leg of a redundant internet edge.", ["Redundancy", "Cost"]], 2022),
  up$1("ixp-peering-100g", "100G IX peering port", 15e3, 6e3, 100, "ixp", "peering", 4, ["Peering at an Internet Exchange.", "Swaps traffic directly with eyeball networks and clouds at a fraction of transit cost; needs a presence in an exchange facility.", ["Very cheap per Gb/s", "Only reaches networks that peer"]]),
  up$1("cloud-onramp-100g", "100G cloud on-ramp (Direct Connect-style)", 4e4, 3e4, 100, "cloud", "cloud-onramp", 4, ["Private link to a hyperscaler cloud.", "Enterprises and labs pull datasets and serve results through their cloud; a private on-ramp avoids the public internet.", ["Low jitter, predictable", "Expensive per Gb/s"]], 2021),
  up$1("dark-fiber-campus", "Dark fiber pair to a carrier hotel", 18e4, 12e3, 800, "carrier-b", "dark-fiber", 8, ["Leased dark fiber you light yourself.", "Gives huge capacity for a flat fee but you buy the optics and own the failure domain.", ["Cheapest at hyperscale", "You operate it"]], 2021)
];
const v = (id, name, sells, summary) => ({
  id,
  name,
  sells,
  reliability: 0.93,
  support: 0.9,
  volumeDiscountPerDoublingPct: 3,
  codex: { summary, explain: `${name} supplies datacenter infrastructure. Compare lead time, service coverage and spares logistics, not just price.`, tradeoffs: ["Strong service network", "Price varies by quarter"] }
});
const EXP2_VENDORS = [
  v("caterpillar", "Caterpillar", ["power"], "Leading maker of datacenter standby generators (Cat 3500 and C175 series)."),
  v("cummins", "Cummins", ["power"], "Diesel and gas generator maker; the main alternative to Caterpillar."),
  v("mtu", "Rolls-Royce MTU", ["power"], "German high-speed engines and gensets popular in hyperscale builds."),
  v("kohler", "Kohler", ["power"], "Generator maker with competitive price and delivery."),
  v("bloom", "Bloom Energy", ["power"], "Solid-oxide fuel cells for on-site datacenter power."),
  v("abb", "ABB", ["power"], "Switchgear and paralleling controls."),
  v("siemens", "Siemens", ["power"], "Medium-voltage switchgear and power distribution."),
  v("trane", "Trane", ["cooling"], "Chillers and HVAC for large halls."),
  v("carrier", "Carrier", ["cooling"], "Chillers with variable-speed compressors."),
  v("jci", "Johnson Controls (YORK)", ["cooling"], "YORK chillers and building controls."),
  v("daikin", "Daikin Applied", ["cooling"], "Oil-free magnetic-bearing chillers.")
];
const cdx = ([summary, explain, t]) => ({ summary, explain, tradeoffs: t ?? ["Cheaper or simpler than the flagship option, with a real compromise"], tags: ["expansion"] });
const base = (id, name, vendor, from, price, lead, c) => ({ id, name, vendor, availableFrom: from, priceUSD: price, leadTimeMonths: lead, codex: cdx(c) });
const L40S = NVIDIA_ACCELERATORS.find((a) => a.id === "nv-l40s");
const H100 = NVIDIA_ACCELERATORS.find((a) => a.id === "nv-h100-sxm");
const pcieAccel = (o) => ({ ...L40S, ...o });
const EXP_ACCELERATORS = [
  pcieAccel({
    ...base("nv-l4", "L4 24GB (72 W low-profile)", "nvidia", 2023.2, 2700, 2, ["Single-slot, 72 W inference card that fits 1U servers.", "Passively cooled and tiny, the L4 is the density king for small-model serving, video and embeddings. It has no NVLink and only 24 GB, so large LLMs do not fit.", ["Best tokens per watt for small models", "24 GB caps model size; no scale-up"]]),
    family: "Ada Lovelace",
    tflops: { fp32: 30, tf32: 60, bf16: 121, fp16: 121, fp8: 242, int8: 242 },
    memGB: 24,
    memBWTBs: 0.3,
    tdpW: 72,
    trainingAffinity: 0.2,
    inferenceAffinity: 0.8
  }),
  pcieAccel({
    ...base("nv-a30", "A30 24GB (HBM2, PCIe)", "nvidia", 2021.4, 5e3, 2, ["165 W HBM2 PCIe card: a cheap A100 slice for inference and fine-tuning.", "Half an A100 with HBM bandwidth, so memory-bound inference runs well. NVLink bridge pairs two cards, but nothing larger.", ["HBM at low power", "Small memory, bridge-only scale-up"]]),
    family: "Ampere",
    tflops: { fp64: 5.2, fp32: 10.3, tf32: 82, bf16: 165, fp16: 165, int8: 330 },
    memGB: 24,
    memType: "hbm2",
    memBWTBs: 0.933,
    tdpW: 165,
    trainingAffinity: 0.45,
    inferenceAffinity: 0.85
  }),
  pcieAccel({
    ...base("nv-h100-pcie", "H100 80GB PCIe", "nvidia", 2022.9, 25e3, 4, ["Air-cooled H100 PCIe: Hopper silicon at 350 W with reduced bandwidth.", "Same die with fewer SMs and HBM2e, in a standard double-width card that fits any 4U/2U PCIe server. Great for inference; for training you give up NVLink4 and ~35% memory bandwidth.", ["Fits ordinary air-cooled servers", "No NVSwitch: tensor-parallel scaling is weak"]]),
    family: "Hopper",
    tflops: { fp32: 51, tf32: 378, bf16: 756, fp16: 756, fp8: 1513, int8: 1513 },
    memGB: 80,
    memType: "hbm2e",
    memBWTBs: 2,
    tdpW: 350,
    trainingAffinity: 0.7,
    inferenceAffinity: 0.95,
    softwareMaturity: 1
  }),
  pcieAccel({
    ...base("nv-rtx-pro-6000", "RTX PRO 6000 Blackwell 96GB", "nvidia", 2025.3, 8500, 2, ["96 GB GDDR7 Blackwell workstation/server card with FP4.", "Big memory for the money with FP4 support, a strong cost-per-token option for mid-size models. GDDR7 bandwidth is far below HBM, so decode throughput lags datacenter parts.", ["Lowest $/GB of fast memory", "GDDR bandwidth limits long-context decode"]]),
    family: "Blackwell",
    tflops: { fp32: 120, tf32: 250, bf16: 500, fp16: 500, fp8: 1e3, fp4: 2e3, int8: 1e3 },
    memGB: 96,
    memType: "gddr7",
    memBWTBs: 1.79,
    tdpW: 600,
    pcieGen: 5,
    trainingAffinity: 0.55,
    inferenceAffinity: 0.85
  }),
  pcieAccel({
    ...base("amd-mi210", "AMD Instinct MI210 64GB (PCIe)", "amd", 2022, 9e3, 3, ["CDNA2 PCIe card with 64 GB HBM2e and 1.6 TB/s.", "The air-cooled AMD alternative for PCIe servers; strong FP64 for HPC, cheaper than A100 but with a thinner software ecosystem.", ["Good memory capacity per dollar", "ROCm maturity trails CUDA"]]),
    family: "CDNA2",
    tflops: { fp64: 22.6, fp32: 22.6, bf16: 181, fp16: 181, int8: 181 },
    memGB: 64,
    memType: "hbm2e",
    memBWTBs: 1.6,
    tdpW: 300,
    trainingAffinity: 0.5,
    inferenceAffinity: 0.7,
    softwareMaturity: 0.6
  }),
  {
    ...H100,
    ...base("nv-h20", "H20 96GB (export-compliant Hopper)", "nvidia", 2024, 12e3, 3, ["Hopper with compute cut ~85% but 4 TB/s HBM3 and full NVLink.", "Built to meet export limits: tiny FLOPS, huge memory bandwidth. Terrible for training, surprisingly good for decode-heavy inference where bandwidth is the limit.", ["Inference-only value", "Compute-starved for training"]]),
    tflops: { fp32: 44, tf32: 74, bf16: 148, fp16: 148, fp8: 296, int8: 296 },
    memGB: 96,
    memType: "hbm3",
    memBWTBs: 4,
    tdpW: 400,
    trainingAffinity: 0.2,
    inferenceAffinity: 0.9
  }
];
const AMD7742 = { kind: "cpu", arch: "x86" };
const cpu = (o) => ({ ...AMD7742, ...o });
const EXP_CPUS = [
  cpu({
    ...base("amd-epyc-9124", "AMD EPYC 9124 (16-core Genoa, GPU-host value)", "amd", 2022.9, 1083, 2, ["16-core Genoa with all 128 PCIe5 lanes at 200 W: the budget GPU-host CPU.", "A GPU server needs lanes and memory channels, not cores. This part keeps the full I/O of Genoa at one fifth of the price of a 96-core chip, so it minimises $/GPU for inference trays.", ["Cheapest way to get 128 Gen5 lanes", "Few cores: data loading and tokenisation can bottleneck"]]),
    cores: 16,
    tdpW: 200,
    memChannels: 12,
    maxMemGB: 6144,
    memBWGBs: 460.8,
    pcieGen: 5,
    pcieLanes: 128
  }),
  cpu({
    ...base("intel-xeon-8480", "Intel Xeon Platinum 8480+ (Sapphire Rapids)", "intel", 2023.1, 11600, 3, ["56-core Sapphire Rapids with PCIe5 and AMX: the DGX H100 host CPU.", "Intel AMX accelerates small-batch CPU inference, and PCIe5 feeds ConnectX-7. Only 80 lanes per socket, so GPU-dense trays need two.", ["Strong OEM support", "80 lanes/socket versus 128 on EPYC"]]),
    cores: 56,
    tdpW: 350,
    memChannels: 8,
    maxMemGB: 4096,
    memBWGBs: 307,
    pcieGen: 5,
    pcieLanes: 80
  }),
  cpu({
    ...base("intel-xeon-6980p", "Intel Xeon 6980P (Granite Rapids, 128-core)", "intel", 2024.7, 17800, 3, ["128 P-cores with MRDIMM and 96 PCIe5 lanes at 500 W.", "Granite Rapids pushes memory bandwidth past 800 GB/s with MRDIMMs, useful for CPU-hosted KV caches. Power and price are high.", ["Huge host memory bandwidth", "500 W per socket adds to rack power"]]),
    cores: 128,
    tdpW: 500,
    memChannels: 12,
    maxMemGB: 6144,
    memBWGBs: 844,
    pcieGen: 5,
    pcieLanes: 96
  }),
  cpu({
    ...base("ampere-one-192", "AmpereOne 192-core Arm", "generic", 2023.9, 5800, 4, ["192 Arm cores at 350 W with 128 PCIe5 lanes.", "Cloud-native Arm host with excellent perf/W for orchestration and data prep. x86-only software and drivers occasionally lag.", ["Great perf per watt", "Some tooling is x86-only"]]),
    arch: "arm",
    cores: 192,
    tdpW: 350,
    memChannels: 8,
    maxMemGB: 4096,
    memBWGBs: 307,
    pcieGen: 5,
    pcieLanes: 128
  })
];
const nic = (o) => ({ kind: "nic", features: ["rdma"], ...o });
const EXP_NICS = [
  nic({
    ...base("gen-ocp-nic-50", "OCP NIC 3.0 2x25G (front-end)", "generic", 2020, 320, 1, ["Cheap dual-port 25G OCP NIC for the front-end network.", "Management, datasets and inference traffic rarely need 400G. A cheap NIC saves money but cannot feed GPU-to-GPU collectives.", ["Great for front-end and inference ingress", "Useless as a training back-end"]]),
    nicClass: "nic",
    tech: "eth-100",
    gbps: 50,
    ports: 2,
    pcieGen: 4,
    pcieLanes: 8,
    watts: 15,
    features: []
  }),
  nic({
    ...base("nv-connectx7-200", "ConnectX-7 1x200G (cost-reduced)", "nvidia", 2023, 900, 2, ["Single-port 200G ConnectX-7 at about half the price of the 400G card.", "Pair one per GPU in PCIe inference nodes where 200G per GPU is plenty; training clusters usually want 400G.", ["Half the cost and power of CX7-400", "Caps per-GPU network at 25 GB/s"]]),
    nicClass: "nic",
    tech: "ib-ndr",
    gbps: 200,
    ports: 1,
    pcieGen: 5,
    pcieLanes: 16,
    watts: 20,
    features: ["rdma", "gpudirect"]
  })
];
const sw = (o) => ({ kind: "switch", cooling: ["air"], inNetworkCompute: false, ...o });
const EXP_SWITCHES = [
  sw({
    ...base("cl-ds5000-sonic", "Celestica DS5000 64x400G (SONiC)", "generic", 2023, 42e3, 3, ["Open-networking 51.2 Tb/s-class white-box switch running SONiC.", "Hyperscalers buy white-box Tomahawk switches for half the price and run SONiC. You save capex but own the software, tuning and bug fixes.", ["About half the price of branded Ethernet", "You are your own support team"]]),
    role: "scale-out",
    tech: "eth-400",
    portCount: 64,
    portGbps: 400,
    capacityTbps: 25.6,
    rackUnits: 2,
    watts: 750,
    features: ["rocev2", "sonic"]
  }),
  sw({
    ...base("ar-7050x3", "Arista 7050X3 32x100G leaf", "arista", 2020, 14e3, 2, ["Workhorse 100G leaf for 2020-era Ethernet back-ends and storage.", "Cheap and ubiquitous; enough for A100 nodes with 100G NICs, a bottleneck for anything later.", ["Low cost per port", "Out of its depth past 200G"]]),
    role: "scale-out",
    tech: "eth-100",
    portCount: 32,
    portGbps: 100,
    capacityTbps: 3.2,
    rackUnits: 1,
    watts: 250,
    features: ["rocev2", "eos"]
  }),
  sw({
    ...base("cs-8101-32h", "Cisco 8101-32H 32x400G", "cisco", 2022.5, 36e3, 3, ["Cisco Silicon One 400G router/switch for fabric and storage.", "Deep buffers and strong telemetry. Cisco, Arista and NVIDIA Spectrum-X all aim at the AI Ethernet back-end.", ["Operational maturity", "Premium price per port"]]),
    role: "scale-out",
    tech: "eth-400",
    portCount: 32,
    portGbps: 400,
    capacityTbps: 12.8,
    rackUnits: 1,
    watts: 500,
    features: ["rocev2", "silicon-one"]
  }),
  sw({
    ...base("gen-oob-1g48", "Management switch 48x1G (OOB)", "generic", 2020, 1800, 1, ["Out-of-band management switch for BMCs and PDUs.", "Every server and PDU has a management port. The OOB network is how you recover a hung node without touching it.", ["Tiny cost, vital reliability", "One per rack adds up at scale"]]),
    role: "oob",
    tech: "eth-100",
    portCount: 48,
    portGbps: 1,
    capacityTbps: 0.1,
    rackUnits: 1,
    watts: 60,
    features: []
  })
];
const pw = (o) => ({ kind: "power", ...o });
const EXP_POWER = [
  pw({
    ...base("gen-ats-1600", "Automatic Transfer Switch (1600 A / 1 MW)", "eaton", 2020, 85e3, 3, ["Swaps the hall between utility and generator.", "Without an ATS a utility outage is a hard stop. The ATS detects loss, starts the generator and transfers when voltage is stable.", ["Single point of failure unless duplicated", "Needed for any real backup plan"]]),
    powerType: "switchgear",
    capacityKW: 1e3,
    efficiency: 0.998,
    installMonths: 1
  }),
  pw({
    ...base("gen-sts-400", "Static Transfer Switch (400 kW)", "eaton", 2020, 38e3, 2, ["Millisecond A/B feed transfer for dual-corded racks.", "Lets a rack ride through a failing feed with no outage. Cheaper than full 2N, but still a single device.", ["Cheap path to A/B redundancy", "Transfers load, does not store energy"]]),
    powerType: "switchgear",
    capacityKW: 400,
    efficiency: 0.998,
    installMonths: 0.5
  }),
  pw({
    ...base("gen-busway-800a", "Overhead Busway (800 A, 480 V)", "schneider", 2020, 48e3, 2, ["Overhead busway that feeds rack taps without cabling.", "Busway makes power reconfigurable and cuts install cost per rack, but a fault can take a whole row.", ["Fast rack adds", "Fault domain is a full run"]]),
    powerType: "busway",
    capacityKW: 550,
    efficiency: 0.995,
    installMonths: 1
  }),
  pw({
    ...base("se-li-ion-500", "Li-ion UPS Battery Cabinet (500 kW)", "schneider", 2021, 19e4, 3, ["Lithium-ion battery cabinet for UPS ride-through.", "Li-ion lasts 10-15 years versus 3-5 for lead-acid, takes a third of the floor space, and tolerates warm rooms. It costs about 2.5x as much up front.", ["Lower total cost over 10 years", "High upfront price and fire-safety rules"]]),
    powerType: "battery",
    capacityKW: 500,
    efficiency: 0.96,
    installMonths: 1
  }),
  pw({
    ...base("gen-genset-3000", "Diesel Genset (3 MW, Tier 4)", "generic", 2020, 78e4, 6, ["3 MW diesel generator with emissions after-treatment.", "Backs up a whole hall for days. Long lead time and strict permits; a genset that was never load-tested will not start when needed.", ["Reliable backup", "Long lead time and emissions permits"]]),
    powerType: "genset",
    capacityKW: 3e3,
    efficiency: 0.95,
    installMonths: 3
  }),
  pw({
    ...base("gen-bess-2000", "Grid Battery (BESS, 2 MW / 4 MWh)", "generic", 2022, 11e5, 6, ["Utility-scale battery for peak shaving and backup.", "Charges when power is cheap and covers peak or outages. It cuts PPA overage and demand charges but does not replace a genset for multi-hour outages.", ["Arbitrage and demand shaving", "Limited duration"]]),
    powerType: "battery",
    capacityKW: 2e3,
    efficiency: 0.9,
    installMonths: 4
  })
];
const co = (o) => ({ kind: "cooling", ...o });
const EXP_COOLING = [
  co({
    ...base("gen-crac-dx-60", "CRAC DX unit (60 kW)", "generic", 2020, 38e3, 2, ["Self-contained DX air conditioner for small rooms.", "No chilled water needed, so it is quick to deploy, but compressor power is high (poor PUE).", ["Easy install", "Inefficient"]]),
    coolingType: "crah",
    capacityKW: 60,
    wattsPerKW: 380,
    serves: "air",
    supplyTempC: 18,
    installMonths: 0.5
  }),
  co({
    ...base("vt-fanwall-250", "Fan-wall air handler (250 kW)", "vertiv", 2022, 11e4, 3, ["EC fan-wall air handler fed by chilled water.", "Many small fans share the load and run at partial speed, saving fan energy compared with big CRAHs.", ["Redundant by design", "Needs a chilled-water plant"]]),
    coolingType: "crah",
    capacityKW: 250,
    wattsPerKW: 150,
    serves: "air",
    supplyTempC: 20,
    installMonths: 1
  }),
  co({
    ...base("gen-adiabatic-1200", "Adiabatic dry-cooler (1.2 MW)", "generic", 2021, 26e4, 4, ["Dry cooler with water-spray assist on hot days.", "Free cooling most of the year; the spray uses water only during heat peaks. Warm-water DLC loops pair well with it.", ["Very low energy per kW removed", "Water use and local availability"]]),
    coolingType: "dry-cooler",
    capacityKW: 1200,
    wattsPerKW: 70,
    serves: "dlc",
    supplyTempC: 32,
    installMonths: 2
  })
];
const ss = (o) => ({ kind: "storage", ...o });
const EXP_STORAGE = [
  ss({
    ...base("weka-pod-nvme", "WEKA NVMe parallel FS pod (8U)", "weka", 2022, 78e4, 4, ["Software-defined parallel filesystem on NVMe nodes.", "Delivers hundreds of GB/s to GPU clients over RDMA. Software-licensed, so it runs on commodity servers.", ["Fast and flexible", "Licence is a recurring cost"]]),
    tier: "hot-nvme",
    capacityPB: 0.5,
    readGBs: 200,
    writeGBs: 120,
    rackUnits: 8,
    watts: 4200
  }),
  ss({
    ...base("pure-flashblade-s500", "Pure FlashBlade//S500 (warm tier)", "generic", 2022.5, 12e5, 5, ["All-flash scale-out file/object system.", "Holds datasets and finished checkpoints cheaper than hot NVMe, at lower bandwidth.", ["Cheap warm tier", "Not for checkpoint bursts"]]),
    tier: "warm",
    capacityPB: 2,
    readGBs: 60,
    writeGBs: 25,
    rackUnits: 5,
    watts: 3500
  }),
  ss({
    ...base("ceph-hdd-4u", "Ceph HDD object node (4U, 60 drives)", "generic", 2020, 12e4, 2, ["Dense HDD node for the object tier.", "Cold datasets and old checkpoints belong on spinning disk. Throughput is poor but cost per PB is tiny.", ["Lowest $/PB", "Slow rebuilds"]]),
    tier: "object",
    capacityPB: 1,
    readGBs: 6,
    writeGBs: 3,
    rackUnits: 4,
    watts: 900
  })
];
const mem$1 = (o) => ({ kind: "memory", ...o });
const EXP_MEMORY = [
  mem$1({ ...base("sam-ddr5-4800-32", "Samsung DDR5-4800 RDIMM 32GB", "samsung", 2022, 230, 1, ["Entry DDR5 DIMM for cost-sensitive hosts.", "Enough for inference hosts that do not cache datasets.", ["Cheap", "Low capacity"]]), type: "ddr5", capacityGB: 32, speedMTs: 4800, watts: 8 }),
  mem$1({ ...base("sam-ddr5-5600-128", "Samsung DDR5-5600 RDIMM 128GB", "samsung", 2023.5, 1400, 2, ["128GB DDR5 for memory-hungry hosts.", "Useful for CPU offload and KV-cache spill; costs more per GB.", ["High capacity per slot", "Higher $/GB"]]), type: "ddr5", capacityGB: 128, speedMTs: 5600, watts: 12 })
];
const nv = (o) => ({ kind: "nvme", ...o });
const EXP_NVME = [
  nv({ ...base("gen-nvme-boot-960", "Boot NVMe 960 GB (M.2)", "generic", 2020, 140, 1, ["Small boot drive for the OS image.", "Keeps the host alive when the big drives are busy with checkpoints.", ["Cheap", "Little capacity"]]), capacityTB: 0.96, readGBs: 3.5, writeGBs: 1.5, pcieGen: 4, watts: 6 })
];
const VENDORS = [...VENDORS$1, ...EXP2_VENDORS];
const ALL_ITEMS = [
  ...NVIDIA_ACCELERATORS,
  ...NVIDIA_CPUS,
  ...OTHER_ACCELERATORS,
  ...OTHER_CPUS,
  ...NICS,
  ...CABLES,
  ...SWITCHES,
  ...CHASSIS,
  ...RACKS,
  ...STORAGE_SYSTEMS,
  ...MEMORY,
  ...NVME,
  ...ERA_CPUS,
  ...ERA_NVME,
  ...ERA_ACCELERATORS,
  ...ERA_NICS,
  ...ERA_SWITCHES,
  ...ERA_MEMORY,
  ...ERA_STORAGE,
  ...ERA_CPUS_EXTRA,
  ...ERA_BLACKWELL,
  ...ERA_RACKS,
  ...POWER,
  ...COOLING,
  ...EXP_ACCELERATORS,
  ...EXP_CPUS,
  ...EXP_NICS,
  ...EXP_SWITCHES,
  ...EXP_POWER,
  ...EXP_COOLING,
  ...EXP_STORAGE,
  ...EXP_MEMORY,
  ...EXP_NVME,
  ...EXP2_POWER,
  ...EXP2_COOLING,
  ...EXP2_UPLINKS
];
const BY_ID = new Map(ALL_ITEMS.map((i) => [i.id, i]));
const getItem = (id) => BY_ID.get(id);
const ITEMS_BY_KIND = (k2) => ALL_ITEMS.filter((i) => i.kind === k2);
const PART_RATE = {
  accelerator: 1 / 8e3,
  psu: 1 / 3e3,
  nic: 1 / 6e3,
  nvme: 1 / 6e3,
  memory: 1 / 2e4,
  cpu: 1 / 2e4,
  switch: 1 / 5e3
};
const PART_LABEL = {
  accelerator: "GPU/accelerator",
  psu: "power supply",
  nic: "NIC",
  nvme: "NVMe drive",
  memory: "DIMM",
  cpu: "CPU",
  switch: "ToR switch"
};
function rackParts(state, designId) {
  const out = {};
  const d = state.racks.find((r) => r.id === designId);
  const add = (id, n) => {
    out[id] = (out[id] ?? 0) + n;
  };
  for (const it2 of d?.items ?? []) {
    if (it2.type === "tray") {
      const t = state.trays.find((x) => x.id === it2.trayId);
      for (const p of t?.parts ?? []) add(p.itemId, p.count * it2.count);
    } else if (it2.type === "switch") add(it2.switchId, it2.count);
  }
  return out;
}
const partClass = (id) => {
  const k2 = getItem(id)?.kind;
  return k2 && PART_RATE[k2] !== void 0 ? k2 : void 0;
};
function rackRates(state, designId) {
  return Object.entries(rackParts(state, designId)).flatMap(([id, n]) => {
    const c = partClass(id);
    return c ? [{ id, rate: n * PART_RATE[c] }] : [];
  });
}
function recommendedSpares(state, id) {
  let total = 0;
  for (const h of state.halls) for (const p of h.racks) total += rackParts(state, p.designId)[id] ?? 0;
  const c = partClass(id);
  if (!c || total === 0) return 0;
  return Math.max(1, Math.ceil(total * PART_RATE[c] * 3));
}
function spareQty(id, qty) {
  const c = partClass(id);
  return c ? Math.max(1, Math.ceil(qty * PART_RATE[c] * 6)) : 0;
}
const NVME_LANES_PER_DRIVE = 4;
const GPUS_PER_SPINE_TRAY = 8;
const COOL_LEVEL$2 = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };
const err = (code, message, learn) => ({ severity: "error", code, message, learn });
function partFitsSlot(slot, item) {
  switch (slot.kind) {
    case "accelerator":
      return item.kind === "accelerator" && (!slot.accepts || slot.accepts.includes(item.formFactor));
    case "cpu":
      return item.kind === "cpu" && (!slot.accepts || slot.accepts.includes(item.arch));
    case "dimm":
      return item.kind === "memory" && (!slot.accepts || slot.accepts.includes(item.type));
    case "nic":
      return item.kind === "nic";
    case "dpu":
      return item.kind === "nic" && item.nicClass !== "nic";
    case "nvme":
      return item.kind === "nvme";
    case "psu":
      return item.kind === "power" && (item.powerType === "pdu" || item.powerType === "power-shelf");
    case "switchchip":
      return item.kind === "switch" && item.rackUnits === 0;
    case "coldplate":
      return item.kind === "cooling" && item.coolingType === "cold-plate-loop";
    default:
      return false;
  }
}
function partWatts(item) {
  switch (item.kind) {
    case "accelerator":
      return item.tdpW;
    case "cpu":
      return item.tdpW;
    case "memory":
      return item.watts;
    case "nvme":
      return item.watts;
    case "nic":
      return item.watts;
    case "switch":
      return item.watts;
    default:
      return 0;
  }
}
function partPcieLanes(item) {
  if (item.kind === "nic") return item.pcieLanes;
  if (item.kind === "nvme") return NVME_LANES_PER_DRIVE;
  if (item.kind === "accelerator" && item.formFactor === "pcie") return item.pcieLanes;
  return 0;
}
function validateTray(design, get) {
  const stats = { watts: 0, pcieLanesUsed: 0, costUSD: 0, accels: 0, tflopsFp8: 0, memGB: 0 };
  const chassisItem = get(design.chassisId);
  if (!chassisItem || chassisItem.kind !== "chassis") {
    return {
      issues: [err(
        "TRAY_UNKNOWN_CHASSIS",
        `Chassis '${design.chassisId}' is not in the catalog — a tray is built around a real chassis and its slot map; pick one first.`
      )],
      stats
    };
  }
  const chassis = chassisItem;
  stats.costUSD = chassis.priceUSD;
  const slotByKind = new Map(chassis.slots.map((s) => [s.kind, s]));
  const filled = /* @__PURE__ */ new Map();
  const seenAccels = /* @__PURE__ */ new Set();
  const issues = [];
  for (const entry of design.parts) {
    const item = get(entry.itemId);
    const slot = slotByKind.get(entry.slot);
    if (!item) {
      issues.push(err(
        "TRAY_UNKNOWN_PART",
        `Part '${entry.itemId}' is not in the catalog — every component must be a real purchasable item.`
      ));
      continue;
    }
    if (!slot) {
      issues.push(err(
        "TRAY_PART_FIT",
        `${item.name} needs a '${entry.slot}' slot but the ${chassis.name} has none — this chassis physically cannot hold that part class.`,
        chassis.id
      ));
      continue;
    }
    if (!partFitsSlot(slot, item)) {
      const want = slot.accepts?.join("/") ?? slot.kind;
      const got = item.kind === "accelerator" ? item.formFactor : item.kind === "cpu" ? item.arch : item.kind === "memory" ? item.type : item.kind;
      issues.push(err(
        "TRAY_PART_FIT",
        `${item.name} (${got}) does not fit the ${chassis.name}'s ${slot.kind} slot (accepts: ${want}). Module form factors are physical standards — an OAM card has no SXM socket to drop into.`,
        chassis.id
      ));
    }
    filled.set(entry.slot, (filled.get(entry.slot) ?? 0) + entry.count);
    stats.watts += partWatts(item) * entry.count;
    stats.pcieLanesUsed += partPcieLanes(item) * entry.count;
    stats.costUSD += item.priceUSD * entry.count;
    if (item.kind === "accelerator") {
      stats.accels += entry.count;
      stats.tflopsFp8 += (item.tflops.fp8 ?? 0) * entry.count;
      stats.memGB += item.memGB * entry.count;
      if (!seenAccels.has(item.id) && !item.cooling.includes(chassis.cooling)) {
        seenAccels.add(item.id);
        issues.push(err(
          "TRAY_ACCEL_COOLING",
          `${item.name} is a ${item.tdpW} W part that only cools by ${item.cooling.join("/")} — it cannot live in the ${chassis.name}, which is a ${chassis.cooling} chassis. At this TDP the heat has to leave through a cold plate, not air.`,
          item.id
        ));
      }
    }
  }
  for (const slot of chassis.slots) {
    const n = filled.get(slot.kind) ?? 0;
    if (n > slot.count) {
      issues.push(err(
        "TRAY_SLOT_OVERFLOW",
        `${n}x ${slot.kind} parts assigned but the ${chassis.name} only has ${slot.count} '${slot.kind}' slot(s) — slots are physical sockets and board lanes, not bookkeeping.`,
        chassis.id
      ));
    }
    if (slot.required !== void 0 && n < slot.required) {
      issues.push(err(
        "TRAY_SLOT_REQUIRED",
        `Only ${n}/${slot.required} '${slot.kind}' slots filled on the ${chassis.name}. The chassis will not POST (or validate) below its minimum: ${slot.required} is the floor for power rails and boot devices.`,
        chassis.id
      ));
    }
  }
  const partW = stats.watts;
  stats.watts += chassis.overheadW;
  if (stats.pcieLanesUsed > chassis.pcieLanesAvail) {
    issues.push(err(
      "TRAY_PCIE_LANES",
      `NICs and NVMe need ${stats.pcieLanesUsed} PCIe lanes but the ${chassis.name} has ${chassis.pcieLanesAvail} left after the accelerators take theirs — every lane is a physical differential pair on the board; oversubscribing them means ports that down-train or vanish.`,
      chassis.id
    ));
  }
  if (stats.watts > chassis.maxPowerW) {
    issues.push(err(
      "TRAY_POWER",
      `Tray draws ~${stats.watts} W (parts ${partW} W + ${chassis.overheadW} W fans/BMC/VRM overhead) but the ${chassis.name} power feed tops out at ${chassis.maxPowerW} W. Above the feed limit PSUs trip — pick lower-TDP parts or a beefier chassis.`,
      chassis.id
    ));
  }
  if (chassis.cooling === "air" && chassis.maxAirWattsPerU !== void 0 && partW > chassis.maxAirWattsPerU * chassis.rackUnits) {
    issues.push(err(
      "TRAY_AIR_WATTS",
      `${partW} W of parts in an air-cooled ${chassis.rackUnits}U chassis exceeds its ~${chassis.maxAirWattsPerU} W/U air budget (max ~${chassis.maxAirWattsPerU * chassis.rackUnits} W). Air carries roughly 1-1.5 kW per U before heatsinks and fans saturate — this is exactly the wall that pushed AI silicon to liquid.`,
      chassis.id
    ));
  }
  return { issues, stats };
}
const SPINE_LEARN = {
  nvlink5: "nv-nvlink-switch-tray5",
  nvlink6: "nv-nvlink-switch-tray6",
  "ualink": "gen-ualink-sw"
};
function validateRack(design, trays, get) {
  const stats = { kW: 0, units: 0, weightKg: 0, costUSD: 0, accels: 0, scaleUpDomain: 0 };
  const rackItem = get(design.rackId);
  if (!rackItem || rackItem.kind !== "rack") {
    return {
      issues: [err(
        "RACK_UNKNOWN_RACK",
        `Rack '${design.rackId}' is not in the catalog — pick a real rack (its U count, kW rating and cooling options define what fits).`
      )],
      stats
    };
  }
  const rack = rackItem;
  stats.costUSD = rack.priceUSD;
  const issues = [];
  if (!rack.cooling.includes(design.coolingInterface)) {
    issues.push(err(
      "RACK_INTERFACE_UNSUPPORTED",
      `The ${rack.name} cannot serve a '${design.coolingInterface}' cooling interface (supports: ${rack.cooling.join("/")}). Cooling interface means what actually captures the heat — air in the aisle, a rear-door coil, or coolant manifolds on the rack spine.`,
      rack.id
    ));
  }
  const spineByTech = /* @__PURE__ */ new Map();
  const trayById = new Map(trays.map((t) => [t.id, t]));
  let watts = 0;
  for (const item of design.items) {
    if (item.type !== "switch") continue;
    const sw2 = get(item.switchId);
    if (sw2 && sw2.kind === "switch" && sw2.role === "scale-up") {
      spineByTech.set(sw2.tech, (spineByTech.get(sw2.tech) ?? 0) + item.count);
    }
  }
  for (const item of design.items) {
    if (item.type === "tray") {
      const td = trayById.get(item.trayId);
      if (!td) {
        issues.push(err(
          "RACK_UNKNOWN_TRAY",
          `Tray '${item.trayId}' referenced but not designed yet — design the tray before racking it.`
        ));
        continue;
      }
      const tv = validateTray(td, get);
      issues.push(...tv.issues);
      watts += tv.stats.watts * item.count;
      stats.costUSD += tv.stats.costUSD * item.count;
      stats.accels += tv.stats.accels * item.count;
      const ch = get(td.chassisId);
      if (ch && ch.kind === "chassis") {
        const chassis = ch;
        stats.units += chassis.rackUnits * item.count;
        stats.weightKg += chassis.weightKg * item.count;
        if (chassis.rackStandard !== rack.standard) {
          issues.push(err(
            "RACK_STANDARD_MISMATCH",
            `The ${chassis.name} is a ${chassis.rackStandard} design and will not mount in the ${rack.name} (${rack.standard}). Rack standards fix rail spacing and width — a 21-inch ORv3 tray simply has no rails in a 19-inch cabinet.`,
            chassis.id
          ));
        }
        if (COOL_LEVEL$2[chassis.cooling] > COOL_LEVEL$2[design.coolingInterface]) {
          issues.push(err(
            "RACK_TRAY_COOLING",
            `${chassis.name} trays need ${chassis.cooling.toUpperCase()} cooling but this rack's interface is '${design.coolingInterface}' — liquid-cooled trays have cold plates plumbed to rack manifolds; without them the tray cooks.`,
            chassis.id
          ));
        }
        if (!rack.hasBusbar && !chassis.slots.some((s) => s.kind === "psu")) {
          issues.push(err(
            "RACK_TRAY_NEEDS_BUSBAR",
            `${chassis.name} trays carry no PSUs — they expect 48V from the rack busbar, and the ${rack.name} has none. Busbar-fed trays need an ORv3/MGX-style rack with power shelves.`,
            rack.id
          ));
        }
        const bb = chassis.baseboard;
        if (bb && tv.stats.accels > 0) {
          const perTrayAccels = tv.stats.accels;
          const totalAccels = perTrayAccels * item.count;
          let accelDomainCap = 0;
          for (const p of td.parts) {
            const pi = get(p.itemId);
            if (pi && pi.kind === "accelerator") accelDomainCap = Math.max(accelDomainCap, pi.maxScaleUpDomain);
          }
          const domainCap = Math.min(bb.domainSize, accelDomainCap || bb.domainSize);
          const needsSpine = !bb.includesSwitchChips && bb.domainSize > perTrayAccels;
          if (needsSpine) {
            const needed = Math.ceil(Math.min(totalAccels, bb.domainSize) / GPUS_PER_SPINE_TRAY);
            const have = spineByTech.get(bb.scaleUp) ?? 0;
            if (have < needed) {
              issues.push(err(
                "RACK_NEEDS_SCALEUP_SWITCH",
                `The ${chassis.name} baseboard expects a ${bb.domainSize}-accelerator ${bb.scaleUp} domain but has no switch silicon on-board: ${needed} spine switch tray(s) are required and ${have} are placed. Without the spine trays each tray is an island — no NVLink-scale memory semantics across trays.`,
                SPINE_LEARN[bb.scaleUp] ?? chassis.id
              ));
              stats.scaleUpDomain = Math.max(stats.scaleUpDomain, Math.min(perTrayAccels, domainCap));
            } else {
              stats.scaleUpDomain = Math.max(stats.scaleUpDomain, Math.min(totalAccels, domainCap));
            }
          } else {
            stats.scaleUpDomain = Math.max(stats.scaleUpDomain, Math.min(totalAccels, domainCap));
          }
        }
      }
    } else if (item.type === "switch") {
      const sw2 = get(item.switchId);
      if (!sw2 || sw2.kind !== "switch") {
        issues.push(err("RACK_UNKNOWN_ITEM", `Switch '${item.switchId}' is not in the catalog.`));
        continue;
      }
      stats.units += sw2.rackUnits * item.count;
      watts += sw2.watts * item.count;
      stats.costUSD += sw2.priceUSD * item.count;
      if (sw2.role === "scale-up") {
        spineByTech.set(sw2.tech, (spineByTech.get(sw2.tech) ?? 0) + item.count);
      }
    } else if (item.type === "storage") {
      const st2 = get(item.storageId);
      if (!st2 || st2.kind !== "storage") {
        issues.push(err("RACK_UNKNOWN_ITEM", `Storage system '${item.storageId}' is not in the catalog.`));
        continue;
      }
      stats.units += st2.rackUnits * item.count;
      watts += st2.watts * item.count;
      stats.costUSD += st2.priceUSD * item.count;
    } else {
      const pw2 = get(item.powerId);
      if (!pw2 || pw2.kind !== "power") {
        issues.push(err("RACK_UNKNOWN_ITEM", `Power equipment '${item.powerId}' is not in the catalog.`));
        continue;
      }
      stats.costUSD += pw2.priceUSD * item.count;
    }
  }
  stats.kW = watts / 1e3;
  if (stats.units > rack.units) {
    issues.push(err(
      "RACK_UNITS",
      `${stats.units}U of gear in a ${rack.units}U rack — U is physical height; the excess simply has nowhere to bolt in.`,
      rack.id
    ));
  }
  if (stats.kW > rack.maxKW) {
    issues.push(err(
      "RACK_POWER",
      `Rack draws ~${stats.kW.toFixed(1)} kW but the ${rack.name} is rated ${rack.maxKW} kW. Rack power is limited by feed/breakers and how much heat its cooling path removes — either thin the rack or move to a higher-density rack.`,
      rack.id
    ));
  }
  if (stats.weightKg > rack.maxWeightKg) {
    issues.push(err(
      "RACK_WEIGHT",
      `Loaded trays weigh ~${stats.weightKg} kg against the ${rack.name}'s ${rack.maxWeightKg} kg rating — racks are structural; an overloaded frame warps rails and fails floor loading.`,
      rack.id
    ));
  }
  return { issues, stats };
}
function validateHall(hall, racks, get) {
  const issues = [];
  const byDesign = new Map(racks.map((r) => [r.design.id, r]));
  const placed2 = hall.racks.filter((p) => p.status !== "failed");
  if (placed2.length > hall.rackSlots) {
    issues.push(err(
      "HALL_RACK_SLOTS",
      `${placed2.length} racks placed but the hall has ${hall.rackSlots} floor slots — each rack needs a tile position with power whip and coolant drop.`
    ));
  }
  let itKW = 0;
  for (const p of placed2) {
    const ctx = byDesign.get(p.designId);
    if (!ctx) {
      issues.push(err(
        "HALL_UNKNOWN_DESIGN",
        `Placed rack '${p.id}' references design '${p.designId}' which does not exist — remove it or restore the design.`
      ));
      continue;
    }
    const rv = validateRack(ctx.design, ctx.trays, get);
    issues.push(...rv.issues);
    itKW += rv.stats.kW;
    if (COOL_LEVEL$2[ctx.design.coolingInterface] > COOL_LEVEL$2[hall.coolingClass]) {
      issues.push(err(
        "HALL_COOLING_CLASS",
        `Rack design '${ctx.design.name}' needs a ${ctx.design.coolingInterface} row but the hall is ${hall.coolingClass}-class. A liquid rack without facility coolant (CDUs, chilled water) is a very expensive space heater — upgrade the hall's cooling class or use air trays.`,
        "ct-cdu-1600"
      ));
    }
    if (rv.stats.weightKg > hall.floorLoadKgPerRack) {
      issues.push(err(
        "HALL_FLOOR_LOAD",
        `Rack design '${ctx.design.name}' weighs ~${rv.stats.weightKg} kg but the hall floor is rated ${hall.floorLoadKgPerRack} kg per rack. Raised floors and slabs have point-load limits — liquid AI racks regularly need floor reinforcement.`,
        ctx.design.rackId
      ));
    }
  }
  if (itKW > hall.itPowerKW) {
    issues.push(err(
      "HALL_IT_POWER",
      `Racks draw ~${itKW.toFixed(1)} kW of IT power but the hall's transformers/UPS only deliver ${hall.itPowerKW} kW. Every IT watt must exist as installed power capacity — add a transformer/UPS or commission fewer racks.`,
      "et-padmount-2500"
    ));
  }
  if (itKW > hall.coolingKW) {
    issues.push(err(
      "HALL_COOLING",
      `Racks reject ~${itKW.toFixed(1)} kW of heat but the hall's cooling plant removes only ${hall.coolingKW} kW. IT power turns into heat almost 1:1; without matching CDU/CRAH/chiller capacity the room thermal-runs and hardware throttles.`,
      "ct-cdu-1600"
    ));
  }
  return issues;
}
function computePUE(hall, get) {
  const itKW = hall.itPowerKW;
  if (itKW <= 0) return 1;
  let coolingElecKW = 0;
  for (const [id, count] of Object.entries(hall.coolingEquip)) {
    const c = get(id);
    if (!c || c.kind !== "cooling") continue;
    coolingElecKW += count * Math.min(itKW, c.capacityKW) * (c.wattsPerKW / 1e3);
  }
  let cap = 0, effSum = 0;
  for (const [id, count] of Object.entries(hall.powerEquip)) {
    const p = get(id);
    if (!p || p.kind !== "power" || p.efficiency >= 1) continue;
    cap += count * p.capacityKW;
    effSum += count * p.capacityKW * p.efficiency;
  }
  const lossKW = cap > 0 ? itKW * (1 - effSum / cap) : 0;
  return 1 + (coolingElecKW + lossKW) / itKW;
}
const trayIdOf = (t) => `tray-${t.id}`;
const rackIdOf = (t) => `rack-${t.id}`;
const trayOf = (t) => ({ id: trayIdOf(t), name: `${t.platform} tray`, chassisId: t.tray.chassisId, parts: t.tray.parts });
const rackOf = (t) => ({
  id: rackIdOf(t),
  name: t.name,
  rackId: t.rack.rackId,
  coolingInterface: t.rack.cooling,
  items: [{ type: "tray", trayId: trayIdOf(t), count: t.rack.trayCount }, ...t.rack.extras]
});
function templateBom(t, racks = 1) {
  const need = { [t.rack.rackId]: racks };
  const add = (id, n) => {
    need[id] = (need[id] ?? 0) + n * racks;
  };
  add(t.tray.chassisId, t.rack.trayCount);
  for (const p of t.tray.parts) add(p.itemId, p.count * t.rack.trayCount);
  for (const e of t.rack.extras) add(e.type === "switch" ? e.switchId : e.type === "storage" ? e.storageId : e.type === "power" ? e.powerId : "", e.count);
  delete need[""];
  return need;
}
function templateFacts(t) {
  const tray = trayOf(t), rack = rackOf(t);
  const tv = validateTray(tray, getItem), rv = validateRack(rack, [tray], getItem);
  const errors = [...tv.issues, ...rv.issues].filter((i) => i.severity === "error").map((i) => `${i.code}: ${i.message}`);
  const per = tv.stats;
  const bf = t.tray.parts.reduce((n, p) => {
    const it2 = getItem(p.itemId);
    return n + (it2?.kind === "accelerator" ? (it2.tflops.bf16 ?? it2.tflops.fp16 ?? 0) * p.count : 0);
  }, 0) * t.rack.trayCount;
  return { tflopsBf16: bf, accels: rv.stats.accels, kWPerRack: rv.stats.kW, scaleUp: rv.stats.scaleUpDomain, tflopsFp8: per.tflopsFp8 * t.rack.trayCount, memGB: per.memGB * t.rack.trayCount, errors };
}
const racksFor = (t, n) => Math.max(1, Math.ceil(n / Math.max(1, templateFacts(t).accels)));
const __vite_import_meta_env__$1 = {};
const createStoreImpl = (createState) => {
  let state;
  const listeners = /* @__PURE__ */ new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const getInitialState = () => initialState;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const destroy = () => {
    if ((__vite_import_meta_env__$1 ? "production" : void 0) !== "production") {
      console.warn(
        "[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."
      );
    }
    listeners.clear();
  };
  const api = { setState, getState, getInitialState, subscribe, destroy };
  const initialState = state = createState(setState, getState, api);
  return api;
};
const createStore = (createState) => createState ? createStoreImpl(createState) : createStoreImpl;
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var react = { exports: {} };
var react_production_min = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReact_production_min;
function requireReact_production_min() {
  if (hasRequiredReact_production_min) return react_production_min;
  hasRequiredReact_production_min = 1;
  var l = Symbol.for("react.element"), n = Symbol.for("react.portal"), p = Symbol.for("react.fragment"), q = Symbol.for("react.strict_mode"), r = Symbol.for("react.profiler"), t = Symbol.for("react.provider"), u = Symbol.for("react.context"), v2 = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), x = Symbol.for("react.memo"), y = Symbol.for("react.lazy"), z = Symbol.iterator;
  function A(a) {
    if (null === a || "object" !== typeof a) return null;
    a = z && a[z] || a["@@iterator"];
    return "function" === typeof a ? a : null;
  }
  var B = { isMounted: function() {
    return false;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, C = Object.assign, D = {};
  function E(a, b, e) {
    this.props = a;
    this.context = b;
    this.refs = D;
    this.updater = e || B;
  }
  E.prototype.isReactComponent = {};
  E.prototype.setState = function(a, b) {
    if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, a, b, "setState");
  };
  E.prototype.forceUpdate = function(a) {
    this.updater.enqueueForceUpdate(this, a, "forceUpdate");
  };
  function F() {
  }
  F.prototype = E.prototype;
  function G2(a, b, e) {
    this.props = a;
    this.context = b;
    this.refs = D;
    this.updater = e || B;
  }
  var H = G2.prototype = new F();
  H.constructor = G2;
  C(H, E.prototype);
  H.isPureReactComponent = true;
  var I = Array.isArray, J = Object.prototype.hasOwnProperty, K = { current: null }, L = { key: true, ref: true, __self: true, __source: true };
  function M(a, b, e) {
    var d, c = {}, k2 = null, h = null;
    if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k2 = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
    var g = arguments.length - 2;
    if (1 === g) c.children = e;
    else if (1 < g) {
      for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
      c.children = f;
    }
    if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
    return { $$typeof: l, type: a, key: k2, ref: h, props: c, _owner: K.current };
  }
  function N(a, b) {
    return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
  }
  function O(a) {
    return "object" === typeof a && null !== a && a.$$typeof === l;
  }
  function escape(a) {
    var b = { "=": "=0", ":": "=2" };
    return "$" + a.replace(/[=:]/g, function(a2) {
      return b[a2];
    });
  }
  var P = /\/+/g;
  function Q2(a, b) {
    return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
  }
  function R(a, b, e, d, c) {
    var k2 = typeof a;
    if ("undefined" === k2 || "boolean" === k2) a = null;
    var h = false;
    if (null === a) h = true;
    else switch (k2) {
      case "string":
      case "number":
        h = true;
        break;
      case "object":
        switch (a.$$typeof) {
          case l:
          case n:
            h = true;
        }
    }
    if (h) return h = a, c = c(h), a = "" === d ? "." + Q2(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
      return a2;
    })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
    h = 0;
    d = "" === d ? "." : d + ":";
    if (I(a)) for (var g = 0; g < a.length; g++) {
      k2 = a[g];
      var f = d + Q2(k2, g);
      h += R(k2, b, e, f, c);
    }
    else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k2 = a.next()).done; ) k2 = k2.value, f = d + Q2(k2, g++), h += R(k2, b, e, f, c);
    else if ("object" === k2) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
    return h;
  }
  function S(a, b, e) {
    if (null == a) return a;
    var d = [], c = 0;
    R(a, d, "", "", function(a2) {
      return b.call(e, a2, c++);
    });
    return d;
  }
  function T(a) {
    if (-1 === a._status) {
      var b = a._result;
      b = b();
      b.then(function(b2) {
        if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
      }, function(b2) {
        if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
      });
      -1 === a._status && (a._status = 0, a._result = b);
    }
    if (1 === a._status) return a._result.default;
    throw a._result;
  }
  var U = { current: null }, V = { transition: null }, W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
  function X() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  react_production_min.Children = { map: S, forEach: function(a, b, e) {
    S(a, function() {
      b.apply(this, arguments);
    }, e);
  }, count: function(a) {
    var b = 0;
    S(a, function() {
      b++;
    });
    return b;
  }, toArray: function(a) {
    return S(a, function(a2) {
      return a2;
    }) || [];
  }, only: function(a) {
    if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
    return a;
  } };
  react_production_min.Component = E;
  react_production_min.Fragment = p;
  react_production_min.Profiler = r;
  react_production_min.PureComponent = G2;
  react_production_min.StrictMode = q;
  react_production_min.Suspense = w;
  react_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
  react_production_min.act = X;
  react_production_min.cloneElement = function(a, b, e) {
    if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
    var d = C({}, a.props), c = a.key, k2 = a.ref, h = a._owner;
    if (null != b) {
      void 0 !== b.ref && (k2 = b.ref, h = K.current);
      void 0 !== b.key && (c = "" + b.key);
      if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
      for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
    }
    var f = arguments.length - 2;
    if (1 === f) d.children = e;
    else if (1 < f) {
      g = Array(f);
      for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
      d.children = g;
    }
    return { $$typeof: l, type: a.type, key: c, ref: k2, props: d, _owner: h };
  };
  react_production_min.createContext = function(a) {
    a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
    a.Provider = { $$typeof: t, _context: a };
    return a.Consumer = a;
  };
  react_production_min.createElement = M;
  react_production_min.createFactory = function(a) {
    var b = M.bind(null, a);
    b.type = a;
    return b;
  };
  react_production_min.createRef = function() {
    return { current: null };
  };
  react_production_min.forwardRef = function(a) {
    return { $$typeof: v2, render: a };
  };
  react_production_min.isValidElement = O;
  react_production_min.lazy = function(a) {
    return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
  };
  react_production_min.memo = function(a, b) {
    return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
  };
  react_production_min.startTransition = function(a) {
    var b = V.transition;
    V.transition = {};
    try {
      a();
    } finally {
      V.transition = b;
    }
  };
  react_production_min.unstable_act = X;
  react_production_min.useCallback = function(a, b) {
    return U.current.useCallback(a, b);
  };
  react_production_min.useContext = function(a) {
    return U.current.useContext(a);
  };
  react_production_min.useDebugValue = function() {
  };
  react_production_min.useDeferredValue = function(a) {
    return U.current.useDeferredValue(a);
  };
  react_production_min.useEffect = function(a, b) {
    return U.current.useEffect(a, b);
  };
  react_production_min.useId = function() {
    return U.current.useId();
  };
  react_production_min.useImperativeHandle = function(a, b, e) {
    return U.current.useImperativeHandle(a, b, e);
  };
  react_production_min.useInsertionEffect = function(a, b) {
    return U.current.useInsertionEffect(a, b);
  };
  react_production_min.useLayoutEffect = function(a, b) {
    return U.current.useLayoutEffect(a, b);
  };
  react_production_min.useMemo = function(a, b) {
    return U.current.useMemo(a, b);
  };
  react_production_min.useReducer = function(a, b, e) {
    return U.current.useReducer(a, b, e);
  };
  react_production_min.useRef = function(a) {
    return U.current.useRef(a);
  };
  react_production_min.useState = function(a) {
    return U.current.useState(a);
  };
  react_production_min.useSyncExternalStore = function(a, b, e) {
    return U.current.useSyncExternalStore(a, b, e);
  };
  react_production_min.useTransition = function() {
    return U.current.useTransition();
  };
  react_production_min.version = "18.3.1";
  return react_production_min;
}
var react_development = { exports: {} };
/**
 * @license React
 * react.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
react_development.exports;
var hasRequiredReact_development;
function requireReact_development() {
  if (hasRequiredReact_development) return react_development.exports;
  hasRequiredReact_development = 1;
  (function(module, exports) {
    if (process.env.NODE_ENV !== "production") {
      (function() {
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var ReactVersion = "18.3.1";
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactCurrentDispatcher = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactCurrentBatchConfig = {
          transition: null
        };
        var ReactCurrentActQueue = {
          current: null,
          // Used to reproduce behavior of `batchedUpdates` in legacy mode.
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false
        };
        var ReactCurrentOwner = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactDebugCurrentFrame = {};
        var currentExtraStackFrame = null;
        function setExtraStackFrame(stack) {
          {
            currentExtraStackFrame = stack;
          }
        }
        {
          ReactDebugCurrentFrame.setExtraStackFrame = function(stack) {
            {
              currentExtraStackFrame = stack;
            }
          };
          ReactDebugCurrentFrame.getCurrentStack = null;
          ReactDebugCurrentFrame.getStackAddendum = function() {
            var stack = "";
            if (currentExtraStackFrame) {
              stack += currentExtraStackFrame;
            }
            var impl = ReactDebugCurrentFrame.getCurrentStack;
            if (impl) {
              stack += impl() || "";
            }
            return stack;
          };
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var ReactSharedInternals = {
          ReactCurrentDispatcher,
          ReactCurrentBatchConfig,
          ReactCurrentOwner
        };
        {
          ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
          ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
        }
        function warn(format) {
          {
            {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              printWarning("warn", format, args);
            }
          }
        }
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var didWarnStateUpdateForUnmountedComponent = {};
        function warnNoop(publicInstance, callerName) {
          {
            var _constructor = publicInstance.constructor;
            var componentName = _constructor && (_constructor.displayName || _constructor.name) || "ReactClass";
            var warningKey = componentName + "." + callerName;
            if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
              return;
            }
            error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, componentName);
            didWarnStateUpdateForUnmountedComponent[warningKey] = true;
          }
        }
        var ReactNoopUpdateQueue = {
          /**
           * Checks whether or not this composite component is mounted.
           * @param {ReactClass} publicInstance The instance we want to test.
           * @return {boolean} True if mounted, false otherwise.
           * @protected
           * @final
           */
          isMounted: function(publicInstance) {
            return false;
          },
          /**
           * Forces an update. This should only be invoked when it is known with
           * certainty that we are **not** in a DOM transaction.
           *
           * You may want to call this when you know that some deeper aspect of the
           * component's state has changed but `setState` was not called.
           *
           * This will not invoke `shouldComponentUpdate`, but it will invoke
           * `componentWillUpdate` and `componentDidUpdate`.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueForceUpdate: function(publicInstance, callback, callerName) {
            warnNoop(publicInstance, "forceUpdate");
          },
          /**
           * Replaces all of the state. Always use this or `setState` to mutate state.
           * You should treat `this.state` as immutable.
           *
           * There is no guarantee that `this.state` will be immediately updated, so
           * accessing `this.state` after calling this method may return the old value.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} completeState Next state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueReplaceState: function(publicInstance, completeState, callback, callerName) {
            warnNoop(publicInstance, "replaceState");
          },
          /**
           * Sets a subset of the state. This only exists because _pendingState is
           * internal. This provides a merging strategy that is not available to deep
           * properties which is confusing. TODO: Expose pendingState or don't use it
           * during the merge.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} partialState Next partial state to be merged with state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} Name of the calling function in the public API.
           * @internal
           */
          enqueueSetState: function(publicInstance, partialState, callback, callerName) {
            warnNoop(publicInstance, "setState");
          }
        };
        var assign = Object.assign;
        var emptyObject = {};
        {
          Object.freeze(emptyObject);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
            throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
          }
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        {
          var deprecatedAPIs = {
            isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
            replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
          };
          var defineDeprecationWarning = function(methodName, info) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
                return void 0;
              }
            });
          };
          for (var fnName in deprecatedAPIs) {
            if (deprecatedAPIs.hasOwnProperty(fnName)) {
              defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
            }
          }
        }
        function ComponentDummy() {
        }
        ComponentDummy.prototype = Component.prototype;
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
        pureComponentPrototype.constructor = PureComponent;
        assign(pureComponentPrototype, Component.prototype);
        pureComponentPrototype.isPureReactComponent = true;
        function createRef() {
          var refObject = {
            current: null
          };
          {
            Object.seal(refObject);
          }
          return refObject;
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init2 = lazyComponent._init;
                try {
                  return getComponentNameFromType(init2(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          var warnAboutAccessingKey = function() {
            {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function defineRefPropWarningGetter(props, displayName) {
          var warnAboutAccessingRef = function() {
            {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingRef.isReactWarning = true;
          Object.defineProperty(props, "ref", {
            get: warnAboutAccessingRef,
            configurable: true
          });
        }
        function warnIfStringRefCannotBeAutoConverted(config) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function createElement(type, config, children) {
          var propName;
          var props = {};
          var key = null;
          var ref = null;
          var self = null;
          var source = null;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              {
                warnIfStringRefCannotBeAutoConverted(config);
              }
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            self = config.__self === void 0 ? null : config.__self;
            source = config.__source === void 0 ? null : config.__source;
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            {
              if (Object.freeze) {
                Object.freeze(childArray);
              }
            }
            props.children = childArray;
          }
          if (type && type.defaultProps) {
            var defaultProps = type.defaultProps;
            for (propName in defaultProps) {
              if (props[propName] === void 0) {
                props[propName] = defaultProps[propName];
              }
            }
          }
          {
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
          }
          return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
          return newElement;
        }
        function cloneElement(element, config, children) {
          if (element === null || element === void 0) {
            throw new Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
          }
          var propName;
          var props = assign({}, element.props);
          var key = element.key;
          var ref = element.ref;
          var self = element._self;
          var source = element._source;
          var owner = element._owner;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              owner = ReactCurrentOwner.current;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            var defaultProps;
            if (element.type && element.type.defaultProps) {
              defaultProps = element.type.defaultProps;
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === void 0 && defaultProps !== void 0) {
                  props[propName] = defaultProps[propName];
                } else {
                  props[propName] = config[propName];
                }
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
          }
          return ReactElement(element.type, key, ref, self, source, owner, props);
        }
        function isValidElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        var SEPARATOR = ".";
        var SUBSEPARATOR = ":";
        function escape(key) {
          var escapeRegex = /[=:]/g;
          var escaperLookup = {
            "=": "=0",
            ":": "=2"
          };
          var escapedString = key.replace(escapeRegex, function(match) {
            return escaperLookup[match];
          });
          return "$" + escapedString;
        }
        var didWarnAboutMaps = false;
        var userProvidedKeyEscapeRegex = /\/+/g;
        function escapeUserProvidedKey(text) {
          return text.replace(userProvidedKeyEscapeRegex, "$&/");
        }
        function getElementKey(element, index) {
          if (typeof element === "object" && element !== null && element.key != null) {
            {
              checkKeyStringCoercion(element.key);
            }
            return escape("" + element.key);
          }
          return index.toString(36);
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if (type === "undefined" || type === "boolean") {
            children = null;
          }
          var invokeCallback = false;
          if (children === null) {
            invokeCallback = true;
          } else {
            switch (type) {
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                }
            }
          }
          if (invokeCallback) {
            var _child = children;
            var mappedChild = callback(_child);
            var childKey = nameSoFar === "" ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;
            if (isArray(mappedChild)) {
              var escapedChildKey = "";
              if (childKey != null) {
                escapedChildKey = escapeUserProvidedKey(childKey) + "/";
              }
              mapIntoArray(mappedChild, array, escapedChildKey, "", function(c) {
                return c;
              });
            } else if (mappedChild != null) {
              if (isValidElement(mappedChild)) {
                {
                  if (mappedChild.key && (!_child || _child.key !== mappedChild.key)) {
                    checkKeyStringCoercion(mappedChild.key);
                  }
                }
                mappedChild = cloneAndReplaceKey(
                  mappedChild,
                  // Keep both the (mapped) and old keys if they differ, just as
                  // traverseAllChildren used to do for objects as children
                  escapedPrefix + // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
                  (mappedChild.key && (!_child || _child.key !== mappedChild.key) ? (
                    // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                    // eslint-disable-next-line react-internal/safe-string-coercion
                    escapeUserProvidedKey("" + mappedChild.key) + "/"
                  ) : "") + childKey
                );
              }
              array.push(mappedChild);
            }
            return 1;
          }
          var child;
          var nextName;
          var subtreeCount = 0;
          var nextNamePrefix = nameSoFar === "" ? SEPARATOR : nameSoFar + SUBSEPARATOR;
          if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              nextName = nextNamePrefix + getElementKey(child, i);
              subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
            }
          } else {
            var iteratorFn = getIteratorFn(children);
            if (typeof iteratorFn === "function") {
              var iterableChildren = children;
              {
                if (iteratorFn === iterableChildren.entries) {
                  if (!didWarnAboutMaps) {
                    warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead.");
                  }
                  didWarnAboutMaps = true;
                }
              }
              var iterator = iteratorFn.call(iterableChildren);
              var step;
              var ii = 0;
              while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getElementKey(child, ii++);
                subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
              }
            } else if (type === "object") {
              var childrenString = String(children);
              throw new Error("Objects are not valid as a React child (found: " + (childrenString === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
          return subtreeCount;
        }
        function mapChildren(children, func, context) {
          if (children == null) {
            return children;
          }
          var result = [];
          var count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function countChildren(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        }
        function forEachChildren(children, forEachFunc, forEachContext) {
          mapChildren(children, function() {
            forEachFunc.apply(this, arguments);
          }, forEachContext);
        }
        function toArray(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }
        function onlyChild(children) {
          if (!isValidElement(children)) {
            throw new Error("React.Children.only expected to receive a single React element child.");
          }
          return children;
        }
        function createContext(defaultValue) {
          var context = {
            $$typeof: REACT_CONTEXT_TYPE,
            // As a workaround to support multiple concurrent renderers, we categorize
            // some renderers as primary and others as secondary. We only expect
            // there to be two concurrent renderers at most: React Native (primary) and
            // Fabric (secondary); React DOM (primary) and React ART (secondary).
            // Secondary renderers store their context values on separate fields.
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            // Used to track how many concurrent renderers this context currently
            // supports within in a single renderer. Such as parallel server rendering.
            _threadCount: 0,
            // These are circular
            Provider: null,
            Consumer: null,
            // Add these to use same hidden class in VM as ServerContext
            _defaultValue: null,
            _globalName: null
          };
          context.Provider = {
            $$typeof: REACT_PROVIDER_TYPE,
            _context: context
          };
          var hasWarnedAboutUsingNestedContextConsumers = false;
          var hasWarnedAboutUsingConsumerProvider = false;
          var hasWarnedAboutDisplayNameOnConsumer = false;
          {
            var Consumer = {
              $$typeof: REACT_CONTEXT_TYPE,
              _context: context
            };
            Object.defineProperties(Consumer, {
              Provider: {
                get: function() {
                  if (!hasWarnedAboutUsingConsumerProvider) {
                    hasWarnedAboutUsingConsumerProvider = true;
                    error("Rendering <Context.Consumer.Provider> is not supported and will be removed in a future major release. Did you mean to render <Context.Provider> instead?");
                  }
                  return context.Provider;
                },
                set: function(_Provider) {
                  context.Provider = _Provider;
                }
              },
              _currentValue: {
                get: function() {
                  return context._currentValue;
                },
                set: function(_currentValue) {
                  context._currentValue = _currentValue;
                }
              },
              _currentValue2: {
                get: function() {
                  return context._currentValue2;
                },
                set: function(_currentValue2) {
                  context._currentValue2 = _currentValue2;
                }
              },
              _threadCount: {
                get: function() {
                  return context._threadCount;
                },
                set: function(_threadCount) {
                  context._threadCount = _threadCount;
                }
              },
              Consumer: {
                get: function() {
                  if (!hasWarnedAboutUsingNestedContextConsumers) {
                    hasWarnedAboutUsingNestedContextConsumers = true;
                    error("Rendering <Context.Consumer.Consumer> is not supported and will be removed in a future major release. Did you mean to render <Context.Consumer> instead?");
                  }
                  return context.Consumer;
                }
              },
              displayName: {
                get: function() {
                  return context.displayName;
                },
                set: function(displayName) {
                  if (!hasWarnedAboutDisplayNameOnConsumer) {
                    warn("Setting `displayName` on Context.Consumer has no effect. You should set it directly on the context with Context.displayName = '%s'.", displayName);
                    hasWarnedAboutDisplayNameOnConsumer = true;
                  }
                }
              }
            });
            context.Consumer = Consumer;
          }
          {
            context._currentRenderer = null;
            context._currentRenderer2 = null;
          }
          return context;
        }
        var Uninitialized = -1;
        var Pending = 0;
        var Resolved = 1;
        var Rejected = 2;
        function lazyInitializer(payload) {
          if (payload._status === Uninitialized) {
            var ctor = payload._result;
            var thenable = ctor();
            thenable.then(function(moduleObject2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var resolved = payload;
                resolved._status = Resolved;
                resolved._result = moduleObject2;
              }
            }, function(error2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var rejected = payload;
                rejected._status = Rejected;
                rejected._result = error2;
              }
            });
            if (payload._status === Uninitialized) {
              var pending = payload;
              pending._status = Pending;
              pending._result = thenable;
            }
          }
          if (payload._status === Resolved) {
            var moduleObject = payload._result;
            {
              if (moduleObject === void 0) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", moduleObject);
              }
            }
            {
              if (!("default" in moduleObject)) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }
            return moduleObject.default;
          } else {
            throw payload._result;
          }
        }
        function lazy(ctor) {
          var payload = {
            // We use these fields to store the result.
            _status: Uninitialized,
            _result: ctor
          };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: payload,
            _init: lazyInitializer
          };
          {
            var defaultProps;
            var propTypes;
            Object.defineProperties(lazyType, {
              defaultProps: {
                configurable: true,
                get: function() {
                  return defaultProps;
                },
                set: function(newDefaultProps) {
                  error("React.lazy(...): It is not supported to assign `defaultProps` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  defaultProps = newDefaultProps;
                  Object.defineProperty(lazyType, "defaultProps", {
                    enumerable: true
                  });
                }
              },
              propTypes: {
                configurable: true,
                get: function() {
                  return propTypes;
                },
                set: function(newPropTypes) {
                  error("React.lazy(...): It is not supported to assign `propTypes` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  propTypes = newPropTypes;
                  Object.defineProperty(lazyType, "propTypes", {
                    enumerable: true
                  });
                }
              }
            });
          }
          return lazyType;
        }
        function forwardRef(render) {
          {
            if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
              error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).");
            } else if (typeof render !== "function") {
              error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render);
            } else {
              if (render.length !== 0 && render.length !== 2) {
                error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
              }
            }
            if (render != null) {
              if (render.defaultProps != null || render.propTypes != null) {
                error("forwardRef render functions do not support propTypes or defaultProps. Did you accidentally pass a React component?");
              }
            }
          }
          var elementType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!render.name && !render.displayName) {
                  render.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function memo(type, compare) {
          {
            if (!isValidElementType(type)) {
              error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
            }
          }
          var elementType = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: compare === void 0 ? null : compare
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!type.name && !type.displayName) {
                  type.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        function resolveDispatcher() {
          var dispatcher = ReactCurrentDispatcher.current;
          {
            if (dispatcher === null) {
              error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
            }
          }
          return dispatcher;
        }
        function useContext(Context) {
          var dispatcher = resolveDispatcher();
          {
            if (Context._context !== void 0) {
              var realContext = Context._context;
              if (realContext.Consumer === Context) {
                error("Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be removed in a future major release. Did you mean to call useContext(Context) instead?");
              } else if (realContext.Provider === Context) {
                error("Calling useContext(Context.Provider) is not supported. Did you mean to call useContext(Context) instead?");
              }
            }
          }
          return dispatcher.useContext(Context);
        }
        function useState(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init2) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init2);
        }
        function useRef(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useEffect(create2, deps);
        }
        function useInsertionEffect(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useInsertionEffect(create2, deps);
        }
        function useLayoutEffect(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useLayoutEffect(create2, deps);
        }
        function useCallback(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useMemo(create2, deps);
        }
        function useImperativeHandle(ref, create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useImperativeHandle(ref, create2, deps);
        }
        function useDebugValue2(value, formatterFn) {
          {
            var dispatcher = resolveDispatcher();
            return dispatcher.useDebugValue(value, formatterFn);
          }
        }
        function useTransition() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useTransition();
        }
        function useDeferredValue(value) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useDeferredValue(value);
        }
        function useId() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useId();
        }
        function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
        }
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                c--;
              }
              for (; s >= 1 && c >= 0; s--, c--) {
                if (sampleLines[s] !== controlLines[c]) {
                  if (s !== 1 || c !== 1) {
                    do {
                      s--;
                      c--;
                      if (c < 0 || sampleLines[s] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher$1.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component2) {
          var prototype = Component2.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init2 = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init2(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err2 = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err2.name = "Invariant Violation";
                    throw err2;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              setExtraStackFrame(stack);
            } else {
              setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function getDeclarationErrorAddendum() {
          if (ReactCurrentOwner.current) {
            var name = getComponentNameFromType(ReactCurrentOwner.current.type);
            if (name) {
              return "\n\nCheck the render method of `" + name + "`.";
            }
          }
          return "";
        }
        function getSourceInfoErrorAddendum(source) {
          if (source !== void 0) {
            var fileName = source.fileName.replace(/^.*[\\\/]/, "");
            var lineNumber = source.lineNumber;
            return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
          }
          return "";
        }
        function getSourceInfoErrorAddendumForProps(elementProps) {
          if (elementProps !== null && elementProps !== void 0) {
            return getSourceInfoErrorAddendum(elementProps.__source);
          }
          return "";
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          var info = getDeclarationErrorAddendum();
          if (!info) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info;
        }
        function validateExplicitKey(element, parentType) {
          if (!element._store || element._store.validated || element.key != null) {
            return;
          }
          element._store.validated = true;
          var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
          if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
          }
          ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
          var childOwner = "";
          if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
            childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
          }
          {
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          if (typeof node !== "object") {
            return;
          }
          if (isArray(node)) {
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              if (isValidElement(child)) {
                validateExplicitKey(child, parentType);
              }
            }
          } else if (isValidElement(node)) {
            if (node._store) {
              node._store.validated = true;
            }
          } else if (node) {
            var iteratorFn = getIteratorFn(node);
            if (typeof iteratorFn === "function") {
              if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                  if (isValidElement(step.value)) {
                    validateExplicitKey(step.value, parentType);
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function createElementWithValidation(type, props, children) {
          var validType = isValidElementType(type);
          if (!validType) {
            var info = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info += sourceInfo;
            } else {
              info += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
          }
          var element = createElement.apply(this, arguments);
          if (element == null) {
            return element;
          }
          if (validType) {
            for (var i = 2; i < arguments.length; i++) {
              validateChildKeys(arguments[i], type);
            }
          }
          if (type === REACT_FRAGMENT_TYPE) {
            validateFragmentProps(element);
          } else {
            validatePropTypes(element);
          }
          return element;
        }
        var didWarnAboutDeprecatedCreateFactory = false;
        function createFactoryWithValidation(type) {
          var validatedFactory = createElementWithValidation.bind(null, type);
          validatedFactory.type = type;
          {
            if (!didWarnAboutDeprecatedCreateFactory) {
              didWarnAboutDeprecatedCreateFactory = true;
              warn("React.createFactory() is deprecated and will be removed in a future major release. Consider using JSX or use React.createElement() directly instead.");
            }
            Object.defineProperty(validatedFactory, "type", {
              enumerable: false,
              get: function() {
                warn("Factory.type is deprecated. Access the class directly before passing it to createFactory.");
                Object.defineProperty(this, "type", {
                  value: type
                });
                return type;
              }
            });
          }
          return validatedFactory;
        }
        function cloneElementWithValidation(element, props, children) {
          var newElement = cloneElement.apply(this, arguments);
          for (var i = 2; i < arguments.length; i++) {
            validateChildKeys(arguments[i], newElement.type);
          }
          validatePropTypes(newElement);
          return newElement;
        }
        function startTransition(scope, options) {
          var prevTransition = ReactCurrentBatchConfig.transition;
          ReactCurrentBatchConfig.transition = {};
          var currentTransition = ReactCurrentBatchConfig.transition;
          {
            ReactCurrentBatchConfig.transition._updatedFibers = /* @__PURE__ */ new Set();
          }
          try {
            scope();
          } finally {
            ReactCurrentBatchConfig.transition = prevTransition;
            {
              if (prevTransition === null && currentTransition._updatedFibers) {
                var updatedFibersCount = currentTransition._updatedFibers.size;
                if (updatedFibersCount > 10) {
                  warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.");
                }
                currentTransition._updatedFibers.clear();
              }
            }
          }
        }
        var didWarnAboutMessageChannel = false;
        var enqueueTaskImpl = null;
        function enqueueTask(task) {
          if (enqueueTaskImpl === null) {
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              var nodeRequire = module && module[requireString];
              enqueueTaskImpl = nodeRequire.call(module, "timers").setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                {
                  if (didWarnAboutMessageChannel === false) {
                    didWarnAboutMessageChannel = true;
                    if (typeof MessageChannel === "undefined") {
                      error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.");
                    }
                  }
                }
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          }
          return enqueueTaskImpl(task);
        }
        var actScopeDepth = 0;
        var didWarnNoAwaitAct = false;
        function act(callback) {
          {
            var prevActScopeDepth = actScopeDepth;
            actScopeDepth++;
            if (ReactCurrentActQueue.current === null) {
              ReactCurrentActQueue.current = [];
            }
            var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
            var result;
            try {
              ReactCurrentActQueue.isBatchingLegacy = true;
              result = callback();
              if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
                var queue = ReactCurrentActQueue.current;
                if (queue !== null) {
                  ReactCurrentActQueue.didScheduleLegacyUpdate = false;
                  flushActQueue(queue);
                }
              }
            } catch (error2) {
              popActScope(prevActScopeDepth);
              throw error2;
            } finally {
              ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
            }
            if (result !== null && typeof result === "object" && typeof result.then === "function") {
              var thenableResult = result;
              var wasAwaited = false;
              var thenable = {
                then: function(resolve, reject) {
                  wasAwaited = true;
                  thenableResult.then(function(returnValue2) {
                    popActScope(prevActScopeDepth);
                    if (actScopeDepth === 0) {
                      recursivelyFlushAsyncActWork(returnValue2, resolve, reject);
                    } else {
                      resolve(returnValue2);
                    }
                  }, function(error2) {
                    popActScope(prevActScopeDepth);
                    reject(error2);
                  });
                }
              };
              {
                if (!didWarnNoAwaitAct && typeof Promise !== "undefined") {
                  Promise.resolve().then(function() {
                  }).then(function() {
                    if (!wasAwaited) {
                      didWarnNoAwaitAct = true;
                      error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);");
                    }
                  });
                }
              }
              return thenable;
            } else {
              var returnValue = result;
              popActScope(prevActScopeDepth);
              if (actScopeDepth === 0) {
                var _queue = ReactCurrentActQueue.current;
                if (_queue !== null) {
                  flushActQueue(_queue);
                  ReactCurrentActQueue.current = null;
                }
                var _thenable = {
                  then: function(resolve, reject) {
                    if (ReactCurrentActQueue.current === null) {
                      ReactCurrentActQueue.current = [];
                      recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                    } else {
                      resolve(returnValue);
                    }
                  }
                };
                return _thenable;
              } else {
                var _thenable2 = {
                  then: function(resolve, reject) {
                    resolve(returnValue);
                  }
                };
                return _thenable2;
              }
            }
          }
        }
        function popActScope(prevActScopeDepth) {
          {
            if (prevActScopeDepth !== actScopeDepth - 1) {
              error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
            }
            actScopeDepth = prevActScopeDepth;
          }
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          {
            var queue = ReactCurrentActQueue.current;
            if (queue !== null) {
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  if (queue.length === 0) {
                    ReactCurrentActQueue.current = null;
                    resolve(returnValue);
                  } else {
                    recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  }
                });
              } catch (error2) {
                reject(error2);
              }
            } else {
              resolve(returnValue);
            }
          }
        }
        var isFlushing = false;
        function flushActQueue(queue) {
          {
            if (!isFlushing) {
              isFlushing = true;
              var i = 0;
              try {
                for (; i < queue.length; i++) {
                  var callback = queue[i];
                  do {
                    callback = callback(true);
                  } while (callback !== null);
                }
                queue.length = 0;
              } catch (error2) {
                queue = queue.slice(i + 1);
                throw error2;
              } finally {
                isFlushing = false;
              }
            }
          }
        }
        var createElement$1 = createElementWithValidation;
        var cloneElement$1 = cloneElementWithValidation;
        var createFactory = createFactoryWithValidation;
        var Children = {
          map: mapChildren,
          forEach: forEachChildren,
          count: countChildren,
          toArray,
          only: onlyChild
        };
        exports.Children = Children;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
        exports.act = act;
        exports.cloneElement = cloneElement$1;
        exports.createContext = createContext;
        exports.createElement = createElement$1;
        exports.createFactory = createFactory;
        exports.createRef = createRef;
        exports.forwardRef = forwardRef;
        exports.isValidElement = isValidElement;
        exports.lazy = lazy;
        exports.memo = memo;
        exports.startTransition = startTransition;
        exports.unstable_act = act;
        exports.useCallback = useCallback;
        exports.useContext = useContext;
        exports.useDebugValue = useDebugValue2;
        exports.useDeferredValue = useDeferredValue;
        exports.useEffect = useEffect;
        exports.useId = useId;
        exports.useImperativeHandle = useImperativeHandle;
        exports.useInsertionEffect = useInsertionEffect;
        exports.useLayoutEffect = useLayoutEffect;
        exports.useMemo = useMemo;
        exports.useReducer = useReducer;
        exports.useRef = useRef;
        exports.useState = useState;
        exports.useSyncExternalStore = useSyncExternalStore;
        exports.useTransition = useTransition;
        exports.version = ReactVersion;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  })(react_development, react_development.exports);
  return react_development.exports;
}
if (process.env.NODE_ENV === "production") {
  react.exports = requireReact_production_min();
} else {
  react.exports = requireReact_development();
}
var reactExports = react.exports;
const ReactExports = /* @__PURE__ */ getDefaultExportFromCjs(reactExports);
var withSelector = { exports: {} };
var withSelector_production = {};
var shim = { exports: {} };
var useSyncExternalStoreShim_production = {};
/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredUseSyncExternalStoreShim_production;
function requireUseSyncExternalStoreShim_production() {
  if (hasRequiredUseSyncExternalStoreShim_production) return useSyncExternalStoreShim_production;
  hasRequiredUseSyncExternalStoreShim_production = 1;
  var React = reactExports;
  function is(x, y) {
    return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
  }
  var objectIs = "function" === typeof Object.is ? Object.is : is, useState = React.useState, useEffect = React.useEffect, useLayoutEffect = React.useLayoutEffect, useDebugValue2 = React.useDebugValue;
  function useSyncExternalStore$2(subscribe, getSnapshot) {
    var value = getSnapshot(), _useState = useState({ inst: { value, getSnapshot } }), inst = _useState[0].inst, forceUpdate = _useState[1];
    useLayoutEffect(
      function() {
        inst.value = value;
        inst.getSnapshot = getSnapshot;
        checkIfSnapshotChanged(inst) && forceUpdate({ inst });
      },
      [subscribe, value, getSnapshot]
    );
    useEffect(
      function() {
        checkIfSnapshotChanged(inst) && forceUpdate({ inst });
        return subscribe(function() {
          checkIfSnapshotChanged(inst) && forceUpdate({ inst });
        });
      },
      [subscribe]
    );
    useDebugValue2(value);
    return value;
  }
  function checkIfSnapshotChanged(inst) {
    var latestGetSnapshot = inst.getSnapshot;
    inst = inst.value;
    try {
      var nextValue = latestGetSnapshot();
      return !objectIs(inst, nextValue);
    } catch (error) {
      return true;
    }
  }
  function useSyncExternalStore$1(subscribe, getSnapshot) {
    return getSnapshot();
  }
  var shim2 = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
  useSyncExternalStoreShim_production.useSyncExternalStore = void 0 !== React.useSyncExternalStore ? React.useSyncExternalStore : shim2;
  return useSyncExternalStoreShim_production;
}
var useSyncExternalStoreShim_development = {};
/**
 * @license React
 * use-sync-external-store-shim.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredUseSyncExternalStoreShim_development;
function requireUseSyncExternalStoreShim_development() {
  if (hasRequiredUseSyncExternalStoreShim_development) return useSyncExternalStoreShim_development;
  hasRequiredUseSyncExternalStoreShim_development = 1;
  "production" !== process.env.NODE_ENV && function() {
    function is(x, y) {
      return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
    }
    function useSyncExternalStore$2(subscribe, getSnapshot) {
      didWarnOld18Alpha || void 0 === React.startTransition || (didWarnOld18Alpha = true, console.error(
        "You are using an outdated, pre-release alpha of React 18 that does not support useSyncExternalStore. The use-sync-external-store shim will not work correctly. Upgrade to a newer pre-release."
      ));
      var value = getSnapshot();
      if (!didWarnUncachedGetSnapshot) {
        var cachedValue = getSnapshot();
        objectIs(value, cachedValue) || (console.error(
          "The result of getSnapshot should be cached to avoid an infinite loop"
        ), didWarnUncachedGetSnapshot = true);
      }
      cachedValue = useState({
        inst: { value, getSnapshot }
      });
      var inst = cachedValue[0].inst, forceUpdate = cachedValue[1];
      useLayoutEffect(
        function() {
          inst.value = value;
          inst.getSnapshot = getSnapshot;
          checkIfSnapshotChanged(inst) && forceUpdate({ inst });
        },
        [subscribe, value, getSnapshot]
      );
      useEffect(
        function() {
          checkIfSnapshotChanged(inst) && forceUpdate({ inst });
          return subscribe(function() {
            checkIfSnapshotChanged(inst) && forceUpdate({ inst });
          });
        },
        [subscribe]
      );
      useDebugValue2(value);
      return value;
    }
    function checkIfSnapshotChanged(inst) {
      var latestGetSnapshot = inst.getSnapshot;
      inst = inst.value;
      try {
        var nextValue = latestGetSnapshot();
        return !objectIs(inst, nextValue);
      } catch (error) {
        return true;
      }
    }
    function useSyncExternalStore$1(subscribe, getSnapshot) {
      return getSnapshot();
    }
    "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var React = reactExports, objectIs = "function" === typeof Object.is ? Object.is : is, useState = React.useState, useEffect = React.useEffect, useLayoutEffect = React.useLayoutEffect, useDebugValue2 = React.useDebugValue, didWarnOld18Alpha = false, didWarnUncachedGetSnapshot = false, shim2 = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
    useSyncExternalStoreShim_development.useSyncExternalStore = void 0 !== React.useSyncExternalStore ? React.useSyncExternalStore : shim2;
    "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  }();
  return useSyncExternalStoreShim_development;
}
var hasRequiredShim;
function requireShim() {
  if (hasRequiredShim) return shim.exports;
  hasRequiredShim = 1;
  if (process.env.NODE_ENV === "production") {
    shim.exports = requireUseSyncExternalStoreShim_production();
  } else {
    shim.exports = requireUseSyncExternalStoreShim_development();
  }
  return shim.exports;
}
/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredWithSelector_production;
function requireWithSelector_production() {
  if (hasRequiredWithSelector_production) return withSelector_production;
  hasRequiredWithSelector_production = 1;
  var React = reactExports, shim2 = requireShim();
  function is(x, y) {
    return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
  }
  var objectIs = "function" === typeof Object.is ? Object.is : is, useSyncExternalStore = shim2.useSyncExternalStore, useRef = React.useRef, useEffect = React.useEffect, useMemo = React.useMemo, useDebugValue2 = React.useDebugValue;
  withSelector_production.useSyncExternalStoreWithSelector = function(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
    var instRef = useRef(null);
    if (null === instRef.current) {
      var inst = { hasValue: false, value: null };
      instRef.current = inst;
    } else inst = instRef.current;
    instRef = useMemo(
      function() {
        function memoizedSelector(nextSnapshot) {
          if (!hasMemo) {
            hasMemo = true;
            memoizedSnapshot = nextSnapshot;
            nextSnapshot = selector(nextSnapshot);
            if (void 0 !== isEqual && inst.hasValue) {
              var currentSelection = inst.value;
              if (isEqual(currentSelection, nextSnapshot))
                return memoizedSelection = currentSelection;
            }
            return memoizedSelection = nextSnapshot;
          }
          currentSelection = memoizedSelection;
          if (objectIs(memoizedSnapshot, nextSnapshot)) return currentSelection;
          var nextSelection = selector(nextSnapshot);
          if (void 0 !== isEqual && isEqual(currentSelection, nextSelection))
            return memoizedSnapshot = nextSnapshot, currentSelection;
          memoizedSnapshot = nextSnapshot;
          return memoizedSelection = nextSelection;
        }
        var hasMemo = false, memoizedSnapshot, memoizedSelection, maybeGetServerSnapshot = void 0 === getServerSnapshot ? null : getServerSnapshot;
        return [
          function() {
            return memoizedSelector(getSnapshot());
          },
          null === maybeGetServerSnapshot ? void 0 : function() {
            return memoizedSelector(maybeGetServerSnapshot());
          }
        ];
      },
      [getSnapshot, getServerSnapshot, selector, isEqual]
    );
    var value = useSyncExternalStore(subscribe, instRef[0], instRef[1]);
    useEffect(
      function() {
        inst.hasValue = true;
        inst.value = value;
      },
      [value]
    );
    useDebugValue2(value);
    return value;
  };
  return withSelector_production;
}
var withSelector_development = {};
/**
 * @license React
 * use-sync-external-store-shim/with-selector.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredWithSelector_development;
function requireWithSelector_development() {
  if (hasRequiredWithSelector_development) return withSelector_development;
  hasRequiredWithSelector_development = 1;
  "production" !== process.env.NODE_ENV && function() {
    function is(x, y) {
      return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
    }
    "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var React = reactExports, shim2 = requireShim(), objectIs = "function" === typeof Object.is ? Object.is : is, useSyncExternalStore = shim2.useSyncExternalStore, useRef = React.useRef, useEffect = React.useEffect, useMemo = React.useMemo, useDebugValue2 = React.useDebugValue;
    withSelector_development.useSyncExternalStoreWithSelector = function(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
      var instRef = useRef(null);
      if (null === instRef.current) {
        var inst = { hasValue: false, value: null };
        instRef.current = inst;
      } else inst = instRef.current;
      instRef = useMemo(
        function() {
          function memoizedSelector(nextSnapshot) {
            if (!hasMemo) {
              hasMemo = true;
              memoizedSnapshot = nextSnapshot;
              nextSnapshot = selector(nextSnapshot);
              if (void 0 !== isEqual && inst.hasValue) {
                var currentSelection = inst.value;
                if (isEqual(currentSelection, nextSnapshot))
                  return memoizedSelection = currentSelection;
              }
              return memoizedSelection = nextSnapshot;
            }
            currentSelection = memoizedSelection;
            if (objectIs(memoizedSnapshot, nextSnapshot))
              return currentSelection;
            var nextSelection = selector(nextSnapshot);
            if (void 0 !== isEqual && isEqual(currentSelection, nextSelection))
              return memoizedSnapshot = nextSnapshot, currentSelection;
            memoizedSnapshot = nextSnapshot;
            return memoizedSelection = nextSelection;
          }
          var hasMemo = false, memoizedSnapshot, memoizedSelection, maybeGetServerSnapshot = void 0 === getServerSnapshot ? null : getServerSnapshot;
          return [
            function() {
              return memoizedSelector(getSnapshot());
            },
            null === maybeGetServerSnapshot ? void 0 : function() {
              return memoizedSelector(maybeGetServerSnapshot());
            }
          ];
        },
        [getSnapshot, getServerSnapshot, selector, isEqual]
      );
      var value = useSyncExternalStore(subscribe, instRef[0], instRef[1]);
      useEffect(
        function() {
          inst.hasValue = true;
          inst.value = value;
        },
        [value]
      );
      useDebugValue2(value);
      return value;
    };
    "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  }();
  return withSelector_development;
}
if (process.env.NODE_ENV === "production") {
  withSelector.exports = requireWithSelector_production();
} else {
  withSelector.exports = requireWithSelector_development();
}
var withSelectorExports = withSelector.exports;
const useSyncExternalStoreExports = /* @__PURE__ */ getDefaultExportFromCjs(withSelectorExports);
const __vite_import_meta_env__ = {};
const { useDebugValue } = ReactExports;
const { useSyncExternalStoreWithSelector } = useSyncExternalStoreExports;
let didWarnAboutEqualityFn = false;
const identity = (arg) => arg;
function useStore(api, selector = identity, equalityFn) {
  if ((__vite_import_meta_env__ ? "production" : void 0) !== "production" && equalityFn && !didWarnAboutEqualityFn) {
    console.warn(
      "[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"
    );
    didWarnAboutEqualityFn = true;
  }
  const slice = useSyncExternalStoreWithSelector(
    api.subscribe,
    api.getState,
    api.getServerState || api.getInitialState,
    selector,
    equalityFn
  );
  useDebugValue(slice);
  return slice;
}
const createImpl = (createState) => {
  if ((__vite_import_meta_env__ ? "production" : void 0) !== "production" && typeof createState !== "function") {
    console.warn(
      "[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`."
    );
  }
  const api = typeof createState === "function" ? createStore(createState) : createState;
  const useBoundStore = (selector, equalityFn) => useStore(api, selector, equalityFn);
  Object.assign(useBoundStore, api);
  return useBoundStore;
};
const create = (createState) => createImpl;
const MONTHS_PER_YEAR = 12;
const BASE_YEAR = 2020;
const monthToYear = (m) => BASE_YEAR + m / MONTHS_PER_YEAR;
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const randRange = (rng, lo, hi) => lo + rng() * (hi - lo);
const randInt = (rng, lo, hi) => Math.floor(lo + rng() * (hi - lo + 1));
function pick(rng, arr) {
  return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
}
const MODELS = [
  { id: "gpt2-xl", name: "GPT-2 1.5B", paramsB: 1.5, activeParamsB: 1.5, layers: 48, kvBytesPerToken: 196608, era: 2020 },
  { id: "gpt3-175b", name: "GPT-3 175B", paramsB: 175, activeParamsB: 175, layers: 96, kvBytesPerToken: 4718592, era: 2020.3 },
  { id: "gptj-6b", name: "GPT-J 6B", paramsB: 6, activeParamsB: 6, layers: 28, kvBytesPerToken: 28672, era: 2021.5 },
  { id: "mtnlg-530b", name: "Megatron-Turing NLG 530B", paramsB: 530, activeParamsB: 530, layers: 105, kvBytesPerToken: 8601600, era: 2022 },
  { id: "chinchilla-70b", name: "Chinchilla 70B", paramsB: 70, activeParamsB: 70, layers: 80, kvBytesPerToken: 2621440, era: 2022.25 },
  { id: "palm-540b", name: "PaLM 540B", paramsB: 540, activeParamsB: 540, layers: 118, kvBytesPerToken: 2895872, era: 2022.3 },
  { id: "gpt35-turbo", name: "GPT-3.5 Turbo", paramsB: 175, activeParamsB: 175, layers: 96, kvBytesPerToken: 393216, era: 2022.9 },
  { id: "llama-65b", name: "LLaMA 65B", paramsB: 65, activeParamsB: 65, layers: 80, kvBytesPerToken: 2621440, era: 2023.1 },
  { id: "gpt4", name: "GPT-4", paramsB: 1800, activeParamsB: 280, layers: 120, kvBytesPerToken: 491520, era: 2023.2 },
  { id: "llama2-70b", name: "Llama 2 70B", paramsB: 70, activeParamsB: 70, layers: 80, kvBytesPerToken: 327680, era: 2023.55 },
  { id: "mistral-7b", name: "Mistral 7B", paramsB: 7, activeParamsB: 7, layers: 32, kvBytesPerToken: 131072, era: 2023.75 },
  { id: "mixtral-8x7b", name: "Mixtral 8x7B MoE", paramsB: 46.7, activeParamsB: 12.9, layers: 32, kvBytesPerToken: 131072, era: 2023.9 },
  { id: "grok-1", name: "Grok-1 314B MoE", paramsB: 314, activeParamsB: 80, layers: 64, kvBytesPerToken: 262144, era: 2024.25 },
  { id: "llama3-70b", name: "Llama 3 70B", paramsB: 70, activeParamsB: 70, layers: 80, kvBytesPerToken: 327680, era: 2024.3 },
  { id: "gpt4o", name: "GPT-4o", paramsB: 200, activeParamsB: 200, layers: 88, kvBytesPerToken: 360448, era: 2024.45 },
  { id: "llama31-405b", name: "Llama 3.1 405B", paramsB: 405, activeParamsB: 405, layers: 126, kvBytesPerToken: 516096, era: 2024.6 },
  { id: "deepseek-v3", name: "DeepSeek-V3 671B MoE", paramsB: 671, activeParamsB: 37, layers: 61, kvBytesPerToken: 70272, era: 2024.95 },
  { id: "deepseek-r1", name: "DeepSeek-R1 671B MoE", paramsB: 671, activeParamsB: 37, layers: 61, kvBytesPerToken: 70272, era: 2025.05 },
  { id: "grok-3", name: "Grok-3", paramsB: 400, activeParamsB: 50, layers: 80, kvBytesPerToken: 327680, era: 2025.15 },
  { id: "llama4-maverick", name: "Llama 4 Maverick 400B MoE", paramsB: 400, activeParamsB: 17, layers: 128, kvBytesPerToken: 524288, era: 2025.3 },
  { id: "qwen3-235b", name: "Qwen3 235B-A22B MoE", paramsB: 235, activeParamsB: 22, layers: 94, kvBytesPerToken: 192512, era: 2025.35 },
  { id: "kimi-k2", name: "Kimi K2 1T MoE", paramsB: 1e3, activeParamsB: 32, layers: 61, kvBytesPerToken: 70272, era: 2025.45 },
  { id: "glm45", name: "GLM-4.5 355B MoE", paramsB: 355, activeParamsB: 32, layers: 92, kvBytesPerToken: 376832, era: 2025.55 },
  { id: "gpt5", name: "GPT-5", paramsB: 900, activeParamsB: 120, layers: 120, kvBytesPerToken: 491520, era: 2025.65 },
  { id: "llama5", name: "Llama 5", paramsB: 1600, activeParamsB: 80, layers: 140, kvBytesPerToken: 161280, era: 2026.4 },
  { id: "deepseek-v4", name: "DeepSeek-V4 MoE", paramsB: 700, activeParamsB: 40, layers: 64, kvBytesPerToken: 73728, era: 2026.6 },
  { id: "gemini3-ultra", name: "Gemini 3 Ultra", paramsB: 2500, activeParamsB: 90, layers: 160, kvBytesPerToken: 655360, era: 2026.9 },
  { id: "gpt6", name: "GPT-6", paramsB: 3e3, activeParamsB: 150, layers: 180, kvBytesPerToken: 737280, era: 2027.4 },
  { id: "frontier-stargate", name: "Stargate-class frontier run", paramsB: 8e3, activeParamsB: 250, layers: 220, kvBytesPerToken: 905216, era: 2028 }
];
const CUSTOMERS = {
  startup: ["Stealth Labs", "Glyph AI", "Peregrine Models", "Otter Systems", "VectorForge"],
  lab: ["MIT LIDS", "Flatiron Institute", "CERN OpenLab", "RIKEN AICS", "Turing Institute"],
  enterprise: ["Acme Retail Media", "Helios Bank", "Nordwind Auto", "MedSyn Pharma", "Skyline Telecom"],
  sovereign: ["EU Sovereign Cloud", "Emirates AI Council", "Nippon AI Grid", "Sovereign Tech Fund"]
};
const lerpCurve$1 = (points, x) => {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      return y0 + (x - x0) / (x1 - x0) * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
};
const GPU_HOUR_ANCHOR = [
  [2020, 1.9],
  [2021, 1.75],
  [2022, 1.6],
  [2023.2, 2.9],
  [2024, 2.6],
  [2024.6, 3],
  [2025, 2.8],
  [2026, 2.6],
  [2026.8, 3.4],
  [2027, 3.2],
  [2028, 3]
];
const gpuHourAnchor = (year) => lerpCurve$1(GPU_HOUR_ANCHOR, year);
const MTOK_DECAY = [
  [2020, 1],
  [2021, 0.75],
  [2022, 0.55],
  [2023, 0.4],
  [2024, 0.175],
  [2025, 0.115],
  [2026, 0.07],
  [2027, 0.05],
  [2028, 0.035]
];
const mtokPrice = (activeParamsB, year) => 0.96 * Math.pow(Math.max(1, activeParamsB), 0.8) * lerpCurve$1(MTOK_DECAY, year);
const ERA_MEM_GB = [
  [2020, 40],
  [2022, 80],
  [2023.7, 141],
  [2024.8, 192],
  [2026.2, 288],
  [2027, 384],
  [2028, 384]
];
const ERA_SCALEOUT_GBPS = [[2020, 6], [2022, 12.5], [2023.5, 25], [2024.5, 50], [2026, 100], [2027, 200], [2028, 200]];
const ERA_TOKENS_PER_SEC = [
  [2020, 3e3],
  [2021, 2e4],
  [2022, 1e5],
  [2023, 5e5],
  [2024, 3e6],
  [2025, 2e7],
  [2026, 8e7],
  [2027, 2e8],
  [2028, 5e8]
];
const ACCEL_BUCKETS = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
const bucket = (n) => ACCEL_BUCKETS.find((b) => b >= n) ?? ACCEL_BUCKETS[ACCEL_BUCKETS.length - 1];
const CONTEXT_OPTIONS = [
  [2022, [1024, 2048]],
  [2024, [2048, 4096, 8192]],
  [2026, [8192, 32768, 65536]],
  [2029, [32768, 131072, 262144]]
];
const round2$1 = (x) => Math.round(x * 100) / 100;
const round3 = (x) => Math.round(x * 1e3) / 1e3;
const ARCHETYPE_TABLE = {
  startup: { minRep: 0, weight: 0.38, accelMult: 1, tokenMult: 0.25, priceMult: 0.9, trainDur: [2, 6], inferDur: [3, 9], sla: 0.95, penalty: [4e-3, 8e-3] },
  lab: { minRep: 20, weight: 0.3, accelMult: 1, tokenMult: 0.6, priceMult: 1, trainDur: [4, 10], inferDur: [6, 12], sla: 0.97, penalty: [5e-3, 0.01] },
  enterprise: { minRep: 45, weight: 0.22, accelMult: 2, tokenMult: 1, priceMult: 1.1, trainDur: [6, 18], inferDur: [12, 24], sla: 0.98, penalty: [8e-3, 0.015] },
  sovereign: { minRep: 70, weight: 0.1, accelMult: 4, tokenMult: 2.5, priceMult: 1.15, trainDur: [12, 36], inferDur: [24, 48], sla: 0.995, penalty: [0.01, 0.02] }
};
function rollArchetype(rng, reputation) {
  const eligible = Object.keys(ARCHETYPE_TABLE).map((a) => ({ a, t: ARCHETYPE_TABLE[a] })).filter(({ t }) => reputation >= t.minRep);
  const total = eligible.reduce((s, e) => s + e.t.weight, 0);
  let r = rng() * total;
  for (const e of eligible) {
    r -= e.t.weight;
    if (r <= 0) return e.a;
  }
  return eligible[0].a;
}
function generateContracts(state, month, rng) {
  const year = monthToYear(month);
  const eligible = MODELS.filter((m) => m.era <= year + 0.01);
  if (eligible.length === 0) return [];
  const out = [];
  const n = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const model = pick(rng, rng() < 0.6 ? eligible.slice(-4) : eligible.slice(-8));
    const trainP = model.paramsB > 200 ? 0.7 : model.paramsB < 15 ? 0.12 : 0.4;
    const archetype = rollArchetype(rng, state.reputation);
    const t = ARCHETYPE_TABLE[archetype];
    const suffix = String(1e3 + Math.floor(rng() * 9e3));
    const common = {
      customer: pick(rng, CUSTOMERS[archetype]),
      archetype,
      model,
      durationMonths: 0,
      penaltyRate: round3(randRange(rng, t.penalty[0], t.penalty[1])),
      deadlineMonth: month + randInt(rng, 2, 6),
      slaAvailability: Math.min(0.999, Math.max(0.9, t.sla + randRange(rng, -5e-3, 5e-3)))
    };
    if (rng() < trainP) {
      const stateGB = 16 * model.paramsB;
      const memPerAccel = lerpCurve$1(ERA_MEM_GB, year);
      const raw = stateGB / memPerAccel * randRange(rng, 2, 4.5) * t.accelMult;
      const minAccelerators = Math.min(32768, Math.max(32, bucket(Math.ceil(raw))));
      const isMoe = model.activeParamsB < model.paramsB * 0.8;
      const moeDomain = year >= 2027 ? 128 : year >= 2025.5 ? 64 : year >= 2024 ? 32 : 16;
      const minScaleUpDomain = Math.min(
        minAccelerators,
        isMoe ? moeDomain : year >= 2025 ? 16 : 8
      );
      const tier = lerpCurve$1(ERA_SCALEOUT_GBPS, year);
      const contract = {
        kind: "training",
        id: `trn-${month}-${i}-${suffix}`,
        ...common,
        durationMonths: randInt(rng, t.trainDur[0], t.trainDur[1]),
        minAccelerators,
        minScaleUpDomain,
        minScaleOutGBsPerAccel: round2$1(model.paramsB < 15 ? tier * 0.75 : tier),
        minTotalMemGB: Math.ceil(stateGB),
        pricePerAccelHour: round2$1(
          gpuHourAnchor(year) * (model.paramsB >= 300 ? 1.15 : isMoe ? 0.95 : 1) * t.priceMult * randRange(rng, 0.92, 1.15)
        )
      };
      contract.rampMonths = Math.min(20, 6 + Math.round(Math.log2(minAccelerators / 32) * 1.6) + (year >= 2024 ? 1 : 0));
      out.push(contract);
    } else {
      const tps = Math.max(
        100,
        Math.round(lerpCurve$1(ERA_TOKENS_PER_SEC, year) * t.tokenMult * randRange(rng, 0.6, 1.8))
      );
      const tpotMs = Math.round(randRange(rng, 20, 60) + (model.activeParamsB > 80 ? randRange(rng, 10, 40) : 0));
      const ctxOpts = CONTEXT_OPTIONS.find(([y]) => year < y)?.[1] ?? [262144];
      const contract = {
        kind: "inference",
        id: `inf-${month}-${i}-${suffix}`,
        ...common,
        durationMonths: randInt(rng, t.inferDur[0], t.inferDur[1]),
        tokensPerSec: tps,
        tpotMs: Math.max(15, tpotMs),
        ttftMs: Math.round(randRange(rng, 150, 700) / 10) * 10,
        contextTokens: pick(rng, ctxOpts),
        pricePerMTok: Math.max(
          0.01,
          round3(
            mtokPrice(model.activeParamsB, year) * (tpotMs < 30 ? 1.25 : 1) * t.priceMult * randRange(rng, 0.9, 1.2)
          )
        )
      };
      contract.rampMonths = randInt(rng, 5, 8);
      out.push(contract);
    }
  }
  return out;
}
const scaleOutTier = (year) => lerpCurve$1(ERA_SCALEOUT_GBPS, year);
const pe = (id) => {
  const i = getItem(id);
  return i && i.kind === "power" ? i : void 0;
};
function hallResilience(hall) {
  let upsKW = 0, gensetKW = 0, batteryKW = 0, transferKW = 0, gensetCount = 0, flywheelKW = 0, feedB = false, parallel = false;
  for (const [id, n] of Object.entries(hall.powerEquip)) {
    const e = pe(id);
    if (!e || n <= 0) continue;
    if (/feed-b/.test(id)) feedB = true;
    if (/paralleling/.test(id)) parallel = true;
    if (e.powerType === "ups") {
      upsKW += e.capacityKW * n;
      if (/rotary|flywheel/.test(id)) flywheelKW += e.capacityKW * n;
    } else if (e.powerType === "battery") batteryKW += e.capacityKW * n;
    else if (e.powerType === "genset" || e.powerType === "gas-turbine") {
      gensetKW += e.capacityKW * n;
      gensetCount += n;
    } else if (e.powerType === "switchgear" && /ats|sts|paralleling/.test(id)) transferKW += e.capacityKW * n;
  }
  const load = Math.max(1, hall.itPowerKW);
  const ups = upsKW >= load * 0.9 && (batteryKW > 0 || flywheelKW >= load * 0.9);
  const backup = gensetKW >= load * 1;
  const transfer = transferKW >= load * 0.9;
  const gaps = [];
  if (!ups) gaps.push(upsKW < load * 0.9 ? "UPS capacity below IT load" : "UPS has no battery string");
  if (!backup) gaps.push(gensetKW <= 0 ? "no generator: outages longer than battery ride-through take you down" : "generator smaller than IT load");
  if (!transfer) gaps.push("no automatic transfer switch (ATS/STS or paralleling gear) to move load to the generator");
  let score = (ups ? 0.55 : 0) + (backup ? 0.25 : 0) + (transfer ? 0.12 : 0);
  const n1 = gensetCount >= 2 && gensetKW - gensetKW / gensetCount >= load && (parallel || gensetCount < 2) || upsKW >= load * 1.8;
  if (ups && backup && transfer && n1) score = 1;
  else if (ups && backup && transfer) score = 0.92;
  if (feedB && score > 0) score = Math.min(1, score + 0.08);
  const tier = score >= 1 ? "N+1" : score >= 0.9 ? "N" : score >= 0.5 ? "basic" : "none";
  return { score, tier, ups, backup, transfer, upsKW, gensetKW, batteryKW, gensetCount, feedB, gaps };
}
const up = (id) => {
  const i = getItem(id);
  return i && i.kind === "uplink" ? i : void 0;
};
function uplinkGbps(s) {
  if (!s.uplinks) return Infinity;
  return Object.entries(s.uplinks).reduce((n, [id, c]) => n + (up(id)?.gbps ?? 0) * c, 0);
}
const uplinkMonthlyUSD = (s) => Object.entries(s.uplinks ?? {}).reduce((n, [id, c]) => n + (up(id)?.mrcUSD ?? 0) * c, 0);
const carrierCount = (s) => new Set(Object.entries(s.uplinks ?? {}).filter(([, c]) => c > 0).map(([id]) => up(id)?.carrier).filter(Boolean)).size;
function contractNeedGbps(c) {
  return c.kind === "inference" ? Math.max(0.2, (c.tokensPerSec ?? 0) / 5e4) : Math.max(0.2, (c.minAccelerators ?? 0) * 0.02);
}
function totalNeedGbps(s) {
  return s.activeContracts.filter((a) => a.clusterIds.length > 0).reduce((n, a) => n + contractNeedGbps(a.contract), 0);
}
const BASE_POWER_PRICE = 0.07;
const onlineRacks = (s) => s.halls.flatMap((h) => h.racks).filter((r) => r.status === "online").length;
function rollEvents(s, rng, log, graceMonths = 4) {
  s.utilityUSDPerKWh = Math.round((s.utilityUSDPerKWh + (BASE_POWER_PRICE - s.utilityUSDPerKWh) * 0.05) * 1e4) / 1e4;
  if (s.month < 11 + graceMonths) return;
  if (rng() > 0.28) return;
  const racks = onlineRacks(s);
  const year = 2020 + s.month / 12;
  const pool = [];
  pool.push(() => {
    s.utilityUSDPerKWh = Math.min(0.2, Math.round(s.utilityUSDPerKWh * 1.3 * 1e4) / 1e4);
    log("bad", `⚡ Energy crisis: utility rate jumps to $${s.utilityUSDPerKWh.toFixed(3)}/kWh. Lesson: power is the biggest opex line — long-term PPAs, on-site solar/gas and a lower PUE are how real operators hedge.`);
  });
  pool.push(() => {
    const cut = Math.round(1e6 + rng() * 2e6);
    s.cash += cut;
    log("good", `🏛 Sovereign-AI grant: a regional government pays +$${(cut / 1e6).toFixed(1)}M to bring GPU capacity on-shore. Governments are now a real customer class.`);
  });
  pool.push(() => {
    const extra = generateContracts(s, s.month, rng).filter((c) => c.kind === "inference").slice(0, 2);
    extra.forEach((c) => {
      if (c.kind === "inference") c.pricePerMTok = Math.round(c.pricePerMTok * 1.25 * 100) / 100;
    });
    s.availableContracts = [...s.availableContracts, ...extra];
    log("good", `🚀 A viral model launch floods the market with inference demand${extra.length ? `: ${extra.length} premium (+25%) serving offers posted` : ""}. Memory-bandwidth-rich GPUs earn the most per watt on decode.`);
  });
  if (year >= 2021) pool.push(() => {
    const bill = Math.round(25e3 * Math.max(1, racks));
    s.cash -= bill;
    log("bad", `🌡 Heatwave: dry-coolers derate in hot ambient air; extra chiller/pump energy costs $${(bill / 1e3).toFixed(0)}k. Lesson: warm-water DLC tolerates hot days — air-cooled halls suffer first.`);
  });
  if (racks > 0 && s.uplinks) {
    pool.push(() => {
      if (carrierCount(s) >= 2) {
        log("good", "🧵 A backhoe cuts a fiber route, but your second carrier on a diverse path keeps every customer online.");
        return;
      }
      s.activeContracts.forEach((a) => {
        a.slaMisses += 1;
      });
      s.reputation = Math.max(0, s.reputation - 2);
      log("bad", "🧵 A backhoe cuts your only fiber route: customers lose connectivity for hours and SLAs take a hit. Lesson: buy a second circuit from a different carrier on a diverse path.");
    });
  }
  if (racks > 0) {
    pool.push(() => {
      const live = s.halls.filter((h) => h.racks.some((r) => r.status === "online"));
      const weakest = live.map(hallResilience).sort((a, b) => a.score - b.score)[0];
      const score = weakest?.score ?? 0;
      if (rng() < score) {
        log("good", `🔌 Utility outage: your ${weakest?.tier} power chain (UPS → generator → transfer switch) carried the halls through with no customer impact.`);
        return;
      }
      s.activeContracts.forEach((a) => {
        a.slaMisses += 1;
      });
      s.reputation = Math.max(0, s.reputation - 2);
      const why = weakest?.gaps[0] ?? "no backup power installed";
      log("bad", `🔌 Utility outage with weak protection (${why}): running jobs restart from checkpoint and SLAs take a hit. Lesson: UPS + battery + generator + transfer switch, sized N+1, keep training alive.`);
    });
    pool.push(() => {
      const bonus = Math.round(racks * 4e4);
      s.cash += bonus;
      s.reputation = Math.min(100, s.reputation + 1);
      log("good", `📣 A customer publishes a benchmark crediting your cluster's uptime: +${bonus ? "$" + (bonus / 1e3).toFixed(0) + "k" : ""} in spot demand and +1 reputation.`);
    });
  }
  pool[Math.floor(rng() * pool.length)]();
}
const ETH_FAMILY = ["eth-100", "eth-200", "eth-400", "eth-800", "eth-1600", "spectrum-x", "uec-eth", "roce"];
const COPPER_DOMAIN_TECHS = ["nvlink3", "nvlink4", "nvlink5", "nvlink6", "wafer", "groq-chip2chip", "pcie"];
const r3 = (x) => Math.round(x * 1e3) / 1e3;
const cableClass = (c) => {
  if (c.cableType === "dac" || c.cableType === "acc" || c.cableType === "copper-backplane") return "dac";
  if (c.cableType === "aoc") return "aoc";
  if (c.cableType.startsWith("optic-")) return "optic";
  return "other";
};
const sameFamily = (a, b) => a === b || isScaleOut(a) && ETH_FAMILY.includes(a) && ETH_FAMILY.includes(b);
const isScaleOut = (t) => !COPPER_DOMAIN_TECHS.includes(t) && t !== "ualink" && t !== "tt-ethernet-mesh" && t !== "infinity-fabric";
const isAccel = (i) => !!i && i.kind === "accelerator";
const isNic = (i) => !!i && i.kind === "nic";
const isSwitch = (i) => !!i && i.kind === "switch";
function planFabric(nodes, nodeUplinkGbps, leaf, spine, nodeCable, spineCable, oversub, nicPortGbps, topology, issues) {
  const o = Math.max(1, oversub);
  const desired = nicPortGbps > 0 ? nicPortGbps : nodeCable?.gbps ?? 200;
  const caps = [desired, leaf.portGbps];
  if (nicPortGbps > 0) caps.push(nicPortGbps);
  if (nodeCable) caps.push(nodeCable.gbps);
  const linkGbps = Math.max(1, Math.min(...caps));
  if (linkGbps < desired) {
    issues.push({
      severity: "info",
      code: "link-rate-capped",
      message: `Links run at ${linkGbps} Gb/s, below the ${desired} Gb/s cable/NIC capability (switch port or NIC port is slower).`,
      learn: leaf.id
    });
  }
  const hostLinksPerNode = Math.max(1, Math.ceil(nodeUplinkGbps / linkGbps));
  const fabricPerNodeGbps = hostLinksPerNode * linkGbps;
  if (fabricPerNodeGbps < nodeUplinkGbps * 0.999) {
    issues.push({
      severity: "warn",
      code: "host-bottleneck",
      message: `Fabric entry carries ${fabricPerNodeGbps} Gb/s per node but hosts source ${Math.round(nodeUplinkGbps)} Gb/s.`,
      learn: leaf.id
    });
  }
  const hostLinks = hostLinksPerNode * nodes;
  const hostTotalGbps = hostLinks * linkGbps;
  const leafOnly = () => ({
    hostLinks,
    linkGbps,
    leafCount: Math.max(1, Math.ceil(hostLinks / leaf.portCount)),
    spineCount: 0,
    superSpineCount: 0,
    leafSpineLinks: 0,
    coreLinks: 0,
    bisectionGbps: hostTotalGbps / 2,
    effPerNodeGbps: Math.min(nodeUplinkGbps, fabricPerNodeGbps)
  });
  if (topology === "single-domain") {
    return { ...leafOnly(), hostLinks: 0, leafCount: 0, bisectionGbps: 0, effPerNodeGbps: 0 };
  }
  if (topology === "dragonfly" || topology === "torus-ish") {
    const factor = topology === "dragonfly" ? 0.12 : 0.03;
    issues.push({
      severity: "info",
      code: "topology-approx",
      message: `${topology} is modeled approximately: leaf tier plus ${factor * 100}% bisection from group/circuit links.`
    });
    const p = leafOnly();
    return { ...p, bisectionGbps: hostTotalGbps * factor };
  }
  if (!spine) {
    issues.push({ severity: "info", code: "single-tier-fabric", message: "No spine switch: single leaf tier, no oversubscription possible across rows." });
    return leafOnly();
  }
  const spineLinkGbps = Math.max(1, Math.min(spineCable?.gbps ?? linkGbps, leaf.portGbps, spine.portGbps));
  const maxDown = Math.max(1, Math.floor(leaf.portCount * o / (1 + o)));
  const leafCount = Math.max(1, Math.ceil(hostLinks / maxDown));
  const hostLinksPerLeaf = hostLinks / leafCount;
  const uplinkPortsPerLeaf = Math.max(1, Math.ceil(hostLinksPerLeaf * linkGbps / o / spineLinkGbps));
  if (leafCount <= spine.portCount) {
    const spineCount2 = uplinkPortsPerLeaf;
    const leafSpineLinks2 = leafCount * spineCount2;
    const uplinkTierGbps2 = leafSpineLinks2 * spineLinkGbps;
    const spineCapacityGbps = spineCount2 * spine.portCount * spineLinkGbps;
    const bisectionGbps2 = Math.min(hostTotalGbps, uplinkTierGbps2, spineCapacityGbps) / 2;
    return {
      hostLinks,
      linkGbps,
      leafCount,
      spineCount: spineCount2,
      superSpineCount: 0,
      leafSpineLinks: leafSpineLinks2,
      coreLinks: 0,
      bisectionGbps: bisectionGbps2,
      effPerNodeGbps: Math.min(nodeUplinkGbps, fabricPerNodeGbps / o)
    };
  }
  const leavesPerPod = Math.max(1, Math.floor(spine.portCount / 2));
  const pods = Math.ceil(leafCount / leavesPerPod);
  let podSpines = Math.min(uplinkPortsPerLeaf, spine.portCount - leavesPerPod);
  if (podSpines < 1) {
    issues.push({
      severity: "error",
      code: "spine-radix-too-small",
      message: `Spine (${spine.portCount} ports) cannot serve pods of ${leavesPerPod} leaves.`,
      learn: spine.id
    });
    podSpines = 1;
  }
  if (podSpines < uplinkPortsPerLeaf) {
    issues.push({
      severity: "warn",
      code: "pod-oversub",
      message: `Pod is oversubscribed beyond the target: leaves want ${uplinkPortsPerLeaf} pod spines but only ${podSpines} fit.`,
      learn: spine.id
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
    effPerNodeGbps: Math.min(nodeUplinkGbps, fabricPerNodeGbps / o)
  };
}
function evaluateCluster(cluster, ctx = defaultClusterContext(), opts = {}) {
  const issues = [];
  const nodeToLeafReachM = opts.nodeToLeafReachM ?? 3;
  const leafToSpineReachM = opts.leafToSpineReachM ?? 70;
  const accelsById = /* @__PURE__ */ new Map();
  const nicsById = /* @__PURE__ */ new Map();
  const rackSwitches = /* @__PURE__ */ new Map();
  let totalAccels = 0;
  let totalNics = 0;
  let nicWatts = 0;
  let domainSize = 1;
  let domainTech;
  let accelsPerTray = 0;
  let accelsPerRack = 0;
  let mixedDomains = false;
  for (const rackId of cluster.rackIds) {
    const rack = ctx.getRack(rackId);
    if (!rack) {
      issues.push({ severity: "error", code: "missing-rack", message: `Rack ${rackId} not found.` });
      continue;
    }
    let rackAccels2 = 0;
    for (const item of rack.items) {
      if (item.type === "tray") {
        const tray = ctx.getTray(item.trayId);
        if (!tray) {
          issues.push({ severity: "error", code: "missing-tray", message: `Tray ${item.trayId} not found.` });
          continue;
        }
        const chassis = ctx.getItem(tray.chassisId);
        let trayAccels = 0;
        let trayNics = 0;
        for (const p of tray.parts) {
          const it2 = ctx.getItem(p.itemId);
          if (!it2) {
            issues.push({ severity: "error", code: "missing-part", message: `Part ${p.itemId} not found (tray ${tray.id}).` });
            continue;
          }
          if (isAccel(it2)) {
            trayAccels += p.count;
            accelsById.set(it2.id, (accelsById.get(it2.id) ?? 0) + p.count * item.count);
          } else if (isNic(it2)) {
            trayNics += p.count;
            nicsById.set(it2.id, (nicsById.get(it2.id) ?? 0) + p.count * item.count);
            nicWatts += it2.watts * p.count * item.count;
          }
        }
        totalNics += trayNics * item.count;
        rackAccels2 += trayAccels * item.count;
        if (chassis && chassis.kind === "chassis" && chassis.baseboard) {
          if (domainTech !== void 0 && (chassis.baseboard.domainSize !== domainSize || chassis.baseboard.scaleUp !== domainTech)) {
            mixedDomains = true;
          }
          domainSize = chassis.baseboard.domainSize;
          domainTech = chassis.baseboard.scaleUp;
          accelsPerTray = trayAccels;
        }
      } else if (item.type === "switch") {
        const sw2 = ctx.getItem(item.switchId);
        if (!isSwitch(sw2)) {
          issues.push({ severity: "error", code: "missing-part", message: `Switch ${item.switchId} not found.` });
          continue;
        }
        rackSwitches.set(sw2.id, (rackSwitches.get(sw2.id) ?? 0) + item.count);
      }
    }
    accelsPerRack = Math.max(accelsPerRack, rackAccels2);
  }
  for (const [id, n] of accelsById) totalAccels += n;
  if (mixedDomains) {
    issues.push({ severity: "warn", code: "mixed-domains", message: "Cluster mixes chassis with different scale-up baseboards; using the last-seen domain size." });
  }
  const dominantAccelId = [...accelsById.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (accelsById.size > 1) {
    issues.push({
      severity: "error",
      code: "mixed-accelerators",
      message: `Mixed accelerator models (${[...accelsById.keys()].join(", ")}); stats assume ${dominantAccelId}.`
    });
  }
  const acc = isAccel(ctx.getItem(dominantAccelId ?? "")) ? ctx.getItem(dominantAccelId) : void 0;
  if (!acc) {
    issues.push({ severity: "error", code: "no-accelerators", message: "Cluster contains no accelerators (or the model is missing from the catalog)." });
    return zeroStats(dominantAccelId ?? "", issues);
  }
  if (domainTech && domainTech !== acc.scaleUp) {
    issues.push({
      severity: "error",
      code: "domain-mismatch",
      message: `Chassis baseboard is ${domainTech} but ${acc.id} scales up over ${acc.scaleUp}.`,
      learn: acc.id
    });
  }
  if (domainSize > acc.maxScaleUpDomain) {
    issues.push({
      severity: "error",
      code: "domain-too-big",
      message: `Domain of ${domainSize} exceeds ${acc.id} max scale-up domain of ${acc.maxScaleUpDomain}.`,
      learn: acc.id
    });
  } else if (domainSize < acc.maxScaleUpDomain) {
    issues.push({
      severity: "info",
      code: "domain-smaller-than-max",
      message: `Scale-up domain is ${domainSize}; ${acc.id} supports up to ${acc.maxScaleUpDomain} in one domain.`,
      learn: acc.id
    });
  }
  if (domainSize > accelsPerRack && domainSize > 1) {
    const copper = COPPER_DOMAIN_TECHS.includes(acc.scaleUp);
    issues.push({
      severity: copper ? "error" : "warn",
      code: "domain-spans-racks",
      message: `A ${domainSize}-accelerator domain does not fit in one rack (${accelsPerRack} accelerators per rack); ${copper ? "copper scale-up fabrics cannot cross racks" : "domain will span racks over longer links"}.`
    });
  }
  const nodes = Math.floor(totalAccels / Math.max(1, domainSize));
  if (nodes < 1) {
    issues.push({ severity: "error", code: "no-full-domain", message: `Fewer than one full scale-up domain (${totalAccels}/${domainSize} accelerators).` });
  }
  if (totalAccels % Math.max(1, domainSize) !== 0) {
    issues.push({ severity: "warn", code: "partial-domain", message: `Accelerator count ${totalAccels} is not a multiple of the ${domainSize}-wide scale-up domain.` });
  }
  const dominantNicId = [...nicsById.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const nic2 = isNic(ctx.getItem(dominantNicId ?? "")) ? ctx.getItem(dominantNicId) : void 0;
  if (nicsById.size > 1) {
    issues.push({ severity: "warn", code: "mixed-nics", message: `Mixed NIC models (${[...nicsById.keys()].join(", ")}); assuming ${dominantNicId}.` });
  }
  const nicPortGbps = nic2 ? nic2.gbps / Math.max(1, nic2.ports) : 0;
  let totalNicGbps = 0;
  for (const [id, n] of nicsById) {
    const nn = ctx.getItem(id);
    if (isNic(nn)) totalNicGbps += nn.gbps * n;
  }
  const totalNativeGbps = totalAccels * acc.nativeScaleOutGbps;
  const nodeUplinkGbps = nodes > 0 ? (totalNicGbps + totalNativeGbps) / nodes : 0;
  const accelsPerNode = Math.max(1, domainSize);
  const fab = cluster.fabric;
  const leaf = isSwitch(ctx.getItem(fab.leafSwitchId)) ? ctx.getItem(fab.leafSwitchId) : void 0;
  const spine = fab.spineSwitchId ? ctx.getItem(fab.spineSwitchId) : void 0;
  const spineSw = isSwitch(spine) ? spine : void 0;
  const nodeCable = ctx.getItem(fab.nodeToLeafCableId);
  const nodeCableOk = !!nodeCable && nodeCable.kind === "cable";
  const spineCable = fab.leafToSpineCableId ? ctx.getItem(fab.leafToSpineCableId) : void 0;
  const spineCableOk = !!spineCable && spineCable.kind === "cable";
  const switchCounts = {};
  const cableCounts = {};
  let bisectionGbps = 0;
  let effPerNodeGbps = 0;
  let fabricSwitchWatts = 0;
  if (!nodeCableOk) {
    issues.push({ severity: "error", code: "missing-part", message: `Node-to-leaf cable ${fab.nodeToLeafCableId} not found.` });
  }
  if (fab.spineSwitchId && !spineSw) {
    issues.push({ severity: "error", code: "missing-part", message: `Spine switch ${fab.spineSwitchId} not found.` });
  }
  if (spineSw && !spineCableOk) {
    issues.push({ severity: "error", code: "missing-part", message: `Leaf-to-spine cable ${fab.leafToSpineCableId} not found.` });
  }
  if (nodeUplinkGbps <= 0 && fab.topology !== "single-domain") {
    issues.push({
      severity: "error",
      code: "no-scale-out",
      message: `Nodes have no scale-out connectivity: add NICs to the trays or use accelerators with native Ethernet ports (${acc.id} has ${acc.nativeScaleOutGbps} Gb/s native).`,
      learn: nic2?.id ?? acc.id
    });
  }
  if (leaf && leaf.role === "scale-up") {
    issues.push({ severity: "error", code: "wrong-switch-role", message: `Leaf switch ${leaf.id} is a ${leaf.role} switch.`, learn: leaf.id });
  }
  if (leaf && leaf.tech !== fab.scaleOutTech && !sameFamily(leaf.tech, fab.scaleOutTech)) {
    issues.push({
      severity: "warn",
      code: "fabric-tech-mismatch",
      message: `Leaf switch runs ${leaf.tech} but the fabric is ${fab.scaleOutTech}.`,
      learn: leaf.id
    });
  }
  if (nodeCableOk && nodeCable && !nodeCable.compatibleTech.includes(fab.scaleOutTech)) {
    issues.push({
      severity: "error",
      code: "cable-tech-mismatch",
      message: `Node cable ${nodeCable.id} (${nodeCable.compatibleTech.join("/")}) does not speak ${fab.scaleOutTech}.`,
      learn: nodeCable.id
    });
  }
  if (spineCableOk && spineCable && !spineCable.compatibleTech.includes(fab.scaleOutTech)) {
    issues.push({
      severity: "error",
      code: "cable-tech-mismatch",
      message: `Spine cable ${spineCable.id} does not speak ${fab.scaleOutTech}.`,
      learn: spineCable.id
    });
  }
  const checkReach = (c, reachM, where) => {
    if (c.maxReachM < reachM) {
      issues.push({
        severity: "error",
        code: "cable-too-short",
        message: `${where}: ${c.id} reaches ${c.maxReachM} m but the run is ~${reachM} m; move up to AOC or optics.`,
        learn: c.id
      });
    } else if (cableClass(c) === "optic" && reachM <= 3) {
      issues.push({
        severity: "info",
        code: "optic-overkill",
        message: `${where}: ${c.id} is optics but the run is only ~${reachM} m; DAC/ACC would be cheaper and cooler.`,
        learn: c.id
      });
    }
  };
  if (nodeCableOk && nodeCable) checkReach(nodeCable, nodeToLeafReachM, "Node to leaf");
  if (spineCableOk && spineCable) checkReach(spineCable, leafToSpineReachM, "Leaf to spine");
  if (leaf && nodes > 0) {
    const plan = planFabric(
      nodes,
      nodeUplinkGbps,
      leaf,
      spineSw,
      nodeCableOk ? nodeCable : void 0,
      spineCableOk ? spineCable : void 0,
      fab.oversubscription,
      nicPortGbps,
      fab.topology,
      issues
    );
    if (fab.oversubscription > 8) {
      issues.push({
        severity: "warn",
        code: "oversub-high",
        message: `Oversubscription ${fab.oversubscription}:1 will collapse large training collectives.`,
        learn: leaf.id
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
  } else if (fab.topology === "single-domain") {
    issues.push({ severity: "info", code: "single-domain", message: "Single scale-up domain cluster: no scale-out fabric needed." });
  }
  let rackSwitchWatts = 0;
  for (const [id, n] of rackSwitches) {
    switchCounts[id] = (switchCounts[id] ?? 0) + n;
    const sw2 = ctx.getItem(id);
    if (isSwitch(sw2)) rackSwitchWatts += sw2.watts * n;
  }
  const needsSpineTrays = !!domainTech && accelsPerTray < domainSize && domainSize > 8;
  if (needsSpineTrays) {
    const hasScaleUpSwitch = [...rackSwitches.keys()].some((id) => {
      const sw2 = ctx.getItem(id);
      return isSwitch(sw2) && sw2.role === "scale-up";
    });
    const chassisItem = ALL_ITEMS.find(
      (i) => i.kind === "chassis" && i.baseboard && i.baseboard.domainSize === domainSize && i.baseboard.scaleUp === domainTech
    );
    const chassisHasSwitchChips = !!chassisItem?.baseboard?.includesSwitchChips;
    if (!hasScaleUpSwitch && !chassisHasSwitchChips) {
      issues.push({
        severity: "error",
        code: "missing-scale-up-switches",
        message: `A ${domainSize}-wide domain needs scale-up switch trays in the racks (e.g. NVLink Switch trays).`
      });
    }
    const spineCableForDomain = ALL_ITEMS.find(
      (i) => i.kind === "cable" && i.cableType === "nvlink-spine" && i.compatibleTech.includes(acc.scaleUp)
    );
    if (spineCableForDomain) {
      cableCounts[spineCableForDomain.id] = (cableCounts[spineCableForDomain.id] ?? 0) + totalAccels;
    }
  }
  let opticsWatts = 0;
  for (const [id, n] of Object.entries(cableCounts)) {
    const c = ctx.getItem(id);
    if (c && c.kind === "cable") opticsWatts += c.wattsPerEnd * 2 * n;
  }
  const powerKW = (totalAccels * acc.tdpW + nicWatts + fabricSwitchWatts + rackSwitchWatts + opticsWatts) / 1e3;
  const effScaleOutGBs = nodes > 0 ? effPerNodeGbps / accelsPerNode / 8 : 0;
  return {
    accelerators: totalAccels,
    acceleratorId: acc.id,
    scaleUpDomain: domainSize,
    totalMemGB: totalAccels * acc.memGB,
    peakPFLOPSFp8: r3(totalAccels * (acc.tflops.fp8 ?? 0) / 1e3),
    peakPFLOPSBf16: r3(totalAccels * (acc.tflops.bf16 ?? 0) / 1e3),
    powerKW: r3(powerKW),
    bisectionTbps: r3(bisectionGbps / 1e3),
    effScaleOutGBs: r3(effScaleOutGBs),
    switchCounts,
    cableCounts,
    issues
  };
}
const zeroStats = (acceleratorId, issues) => ({
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
  issues
});
const defaultClusterContext = () => ({
  getRack: () => void 0,
  getTray: () => void 0,
  getItem
});
const TRAIN_CEILING = 0.62;
const STRAGGLER = 1.15;
const PREFILL_MFU = 0.5;
const FP8_UTIL = 0.75;
const GB = 1e9;
const clamp$2 = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const peakAt = (a, d) => {
  if (d && a.tflops[d]) return a.tflops[d];
  return a.tflops.bf16 ?? a.tflops.fp16 ?? a.tflops.tf32 ?? Math.max(0, ...Object.values(a.tflops));
};
const domainOf = (stats, n) => clamp$2(Math.round(stats.scaleUpDomain) || 1, 1, n);
function trainingTokensPerSec(stats, accel, model, opts = {}) {
  const issues = [];
  const N = Math.max(1, Math.round(stats.accelerators));
  const d = domainOf(stats, N);
  const D = Math.max(1, Math.ceil(N / d));
  const peak = peakAt(accel, opts.dtype);
  const Pa = model.activeParamsB;
  const B = Math.max(1, opts.localBatch ?? 32);
  if (peak <= 0) {
    issues.push({ severity: "error", code: "no-peak", message: `${accel.id} has no TFLOPS for the requested datatype.` });
    return { mfu: 0, tokensPerSec: 0, stepMs: 0, zeroAcrossDomains: false, fitsTrainingState: false, issues };
  }
  const tC = 6 * Pa * GB * B / (peak * 1e12);
  const G2 = 2 * Pa / N;
  const tSu = d > 1 ? 2 * G2 * (d - 1) / d / Math.max(accel.scaleUpGBs * 0.5, 1e-6) : 0;
  const Bso = Math.max(stats.effScaleOutGBs * 0.5, 1e-4);
  let tSo = D > 1 ? 2 * G2 * (D - 1) / D / Bso : 0;
  if (D > 1 && stats.effScaleOutGBs <= 0) {
    issues.push({
      severity: "error",
      code: "no-scale-out",
      message: `Training across ${D} domains needs scale-out bandwidth; the cluster has none.`
    });
    return { mfu: 0, tokensPerSec: 0, stepMs: 0, zeroAcrossDomains: false, fitsTrainingState: false, issues };
  }
  const stateGB = 16 * model.paramsB;
  let zeroAcrossDomains = false;
  let fitsTrainingState = true;
  if (stateGB > N * accel.memGB) {
    fitsTrainingState = false;
    issues.push({
      severity: "error",
      code: "state-does-not-fit",
      message: `Training state (~${stateGB} GB for ${model.name}) exceeds cluster memory ${N * accel.memGB} GB.`,
      learn: accel.id
    });
    return { mfu: 0, tokensPerSec: 0, stepMs: 0, zeroAcrossDomains, fitsTrainingState, issues };
  }
  if (stateGB > d * accel.memGB) {
    zeroAcrossDomains = true;
    tSo *= 3;
    issues.push({
      severity: "warn",
      code: "zero-across-domains",
      message: `Training state (~${stateGB} GB) exceeds one ${d}-accelerator domain (${d * accel.memGB} GB): ZeRO sharding over scale-out triples gradient traffic.`,
      learn: accel.id
    });
  }
  const overlap = clamp$2(opts.commOverlap ?? 0.5, 0, 0.9);
  const stepSec = tC + (tSu + tSo) * (1 - overlap) * STRAGGLER;
  const mfu = clamp$2(tC / stepSec * TRAIN_CEILING * accel.softwareMaturity * accel.trainingAffinity, 5e-3, 0.65);
  const tokensPerSec = N * peak * 1e12 * mfu / (6 * Pa * GB);
  return {
    mfu,
    tokensPerSec,
    stepMs: stepSec * 1e3,
    zeroAcrossDomains,
    fitsTrainingState,
    issues
  };
}
function inferenceCapacity(stats, accel, model, opts = {}) {
  const issues = [];
  const N = Math.max(1, Math.round(stats.accelerators));
  const d = domainOf(stats, N);
  const bpp = Math.max(0.125, opts.bytesPerParam ?? 1);
  const ctxT = Math.max(1, opts.contextTokens ?? 4096);
  const weightsGB = model.paramsB * bpp;
  const activeGB = model.activeParamsB * bpp;
  const kvPerSeqGB = model.kvBytesPerToken * ctxT / GB;
  let tp = 1;
  while (tp * 2 <= d && tp * accel.memGB < weightsGB * 1.1) tp *= 2;
  let fitsWeights = tp * accel.memGB >= weightsGB * 1.1;
  if (!fitsWeights && d * accel.memGB >= weightsGB * 1.02) {
    tp = d;
    fitsWeights = true;
  } else if (!fitsWeights) {
    tp = d;
    issues.push({
      severity: "error",
      code: "weights-exceed-domain",
      message: `Weights (${weightsGB} GB) plus overhead do not fit a ${d}-accelerator scale-up domain (${d * accel.memGB} GB); tensor parallelism cannot shard them.`,
      learn: accel.id
    });
  }
  const replicas = Math.floor(N / tp);
  if (replicas < 1) {
    issues.push({ severity: "error", code: "no-replica", message: "Fewer accelerators than one tensor-parallel replica." });
  }
  const kvAvailGB = tp * accel.memGB - weightsGB * 1.05;
  const maxBatchKV = Math.max(0, Math.floor(kvAvailGB / Math.max(kvPerSeqGB, 1e-9)));
  if (maxBatchKV < 1) {
    issues.push({
      severity: "error",
      code: "kv-no-room",
      message: `No memory left for KV cache: weights + runtime use ${weightsGB * 1.05} GB of ${tp * accel.memGB} GB per replica.`,
      learn: accel.id
    });
  }
  let tpEff = 1;
  if (tp > 1) {
    if (accel.scaleUp === "pcie" || accel.scaleUp === "none") tpEff = 0.35;
    else if (accel.scaleUp === "wafer") tpEff = 0.9;
    else tpEff = 0.85;
  }
  if (!fitsWeights) tpEff *= 0.3;
  const readBW = Math.max(tp * accel.memBWTBs * 1e3 * tpEff, 1e-6);
  let batch = Math.max(1, maxBatchKV);
  if (opts.tpotMs !== void 0) {
    const budgetBytes = opts.tpotMs / 1e3 * readBW * GB;
    const batchTpot = Math.floor((budgetBytes - activeGB * GB) / (model.kvBytesPerToken * ctxT));
    if (batchTpot < 1) {
      issues.push({
        severity: "error",
        code: "tpot-infeasible",
        message: `Cannot meet ${opts.tpotMs} ms per-token latency: even batch 1 decode exceeds it.`
      });
    } else {
      batch = Math.min(batch, batchTpot);
    }
  }
  const stepSec = (activeGB + batch * kvPerSeqGB) / readBW;
  const perUserTokensPerSec = 1 / stepSec;
  const tokensPerSec = replicas * batch * perUserTokensPerSec * accel.softwareMaturity * Math.min(accel.inferenceAffinity, 1.3);
  const prefillFlops = 2 * model.activeParamsB * GB * ctxT;
  const pfPeak = (accel.tflops.fp8 ?? peakAt(accel)) * 1e12 * FP8_UTIL;
  const ttftMs = prefillFlops / (tp * pfPeak * PREFILL_MFU * accel.softwareMaturity) * 1e3;
  return {
    tpSize: tp,
    replicas,
    fitsWeights,
    maxBatchKV,
    batch,
    stepMs: stepSec * 1e3,
    perUserTokensPerSec,
    tokensPerSec,
    ttftMs,
    issues
  };
}
const HOURS_PER_MONTH = 730;
const STAFF_COST_PER_MONTH = 12e3;
const SUPPORT_RATE_PER_YEAR = 0.05;
const DEPRECIATION_YEARS = 5;
const DEFAULT_APR = 0.07;
const FALLBACK_PUE = 1.4;
const clusterPowerKW = (state) => state.clusters.reduce((s, c) => s + (c.stats?.powerKW ?? 0), 0);
const weightedPue = (state) => {
  const total = state.halls.reduce((s, h) => s + h.itPowerKW, 0);
  if (total <= 0) {
    const ps = state.halls.map((h) => h.pue);
    return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : FALLBACK_PUE;
  }
  return state.halls.reduce((s, h) => s + h.pue * h.itPowerKW, 0) / total;
};
function monthlyOpex(state, opts = {}) {
  const itPowerKW = Math.max(0, opts.itPowerKW ?? clusterPowerKW(state));
  const pue = opts.pue ?? weightedPue(state);
  const kwh = itPowerKW * pue * HOURS_PER_MONTH;
  const powerUSD = kwh * state.utilityUSDPerKWh;
  const staffUSD = state.staff * (opts.staffCostPerMonth ?? STAFF_COST_PER_MONTH);
  const supportUSD = (opts.capexUSD ?? estimateCapexBasis(state)) * SUPPORT_RATE_PER_YEAR / 12;
  const networkUSD = uplinkMonthlyUSD(state);
  return {
    itPowerKW,
    pue,
    kwh,
    powerUSD,
    staffUSD,
    supportUSD,
    networkUSD,
    totalUSD: powerUSD + staffUSD + supportUSD + networkUSD
  };
}
const monthlyDepreciation = (capexUSD, years = DEPRECIATION_YEARS) => years > 0 ? capexUSD / (years * 12) : 0;
const monthlyInterest = (debtUSD, apr = DEFAULT_APR) => debtUSD * apr / 12;
function trayBomValue(design) {
  let v2 = getItem(design.chassisId)?.priceUSD ?? 0;
  return v2 + design.parts.reduce((s, p) => s + (getItem(p.itemId)?.priceUSD ?? 0) * p.count, 0);
}
function rackBomValue(state, design) {
  let v2 = getItem(design.rackId)?.priceUSD ?? 0;
  for (const item of design.items) {
    if (item.type === "tray") {
      const tray = state.trays.find((t) => t.id === item.trayId);
      v2 += (tray ? trayBomValue(tray) : 0) * item.count;
    } else {
      const id = item.type === "switch" ? item.switchId : item.type === "storage" ? item.storageId : item.powerId;
      v2 += (getItem(id)?.priceUSD ?? 0) * item.count;
    }
  }
  return v2;
}
function estimateCapexBasis(state) {
  let v2 = 0;
  for (const [id, count] of Object.entries(state.inventory)) v2 += (getItem(id)?.priceUSD ?? 0) * count;
  for (const hall of state.halls) {
    for (const [id, count] of Object.entries(hall.powerEquip)) v2 += (getItem(id)?.priceUSD ?? 0) * count;
    for (const [id, count] of Object.entries(hall.coolingEquip)) v2 += (getItem(id)?.priceUSD ?? 0) * count;
    for (const rack of hall.racks) {
      const design = state.racks.find((r) => r.id === rack.designId);
      if (design) v2 += rackBomValue(state, design);
    }
  }
  return v2;
}
function contractRevenue(ac, opts) {
  const hours = opts.hoursPerMonth ?? HOURS_PER_MONTH;
  const c = ac.contract;
  const avail = Math.max(0, Math.min(1, opts.availability));
  const gross = c.kind === "training" ? (opts.accelerators ?? 0) * c.pricePerAccelHour * hours : (opts.tokensPerSec ?? 0) * hours * 3600 / 1e6 * c.pricePerMTok;
  const slaMet = avail >= c.slaAvailability;
  const billable = slaMet ? gross : gross * (avail / Math.max(c.slaAvailability, 1e-9));
  const rawPenalty = slaMet ? 0 : gross * c.penaltyRate * Math.max(0, c.slaAvailability - avail) * 100;
  const penalty = Math.min(rawPenalty, gross * 0.25);
  return { grossUSD: gross, billableUSD: billable, penaltyUSD: penalty, netUSD: billable - penalty, slaMet };
}
const clamp$1 = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const r2 = (x) => Math.round(x * 100) / 100;
const SOURCES = {
  grid: { names: ["Metro Utility", "Regional Grid Co-op", "StateWide Electric"], priceMWh: [58, 74], term: [12, 36], overdraw: [0.15, 0.3], overage: 1.4, firmness: [0.9, 0.97], lesson: "Utility firm service: reliable and flexible, priced near spot. Overdraw is tolerated until the interconnect trips." },
  solar: { names: ["SunHarvest PPA", "Helios Renewables", "DesertBright Solar"], priceMWh: [34, 46], term: [60, 120], overdraw: [0, 0.05], overage: 2, firmness: [0.72, 0.82], lesson: "Solar PPA: cheapest energy, but non-firm — nights and clouds mean you fall back to the grid at spot." },
  gas: { names: ["Cascade Gas Peakers", "Permian Power", "Gulf Coast Generation"], priceMWh: [78, 98], term: [24, 60], overdraw: [0.05, 0.12], overage: 1.8, firmness: [0.96, 0.99], lesson: "Gas generation: dispatchable and firm, but fuel-indexed and expensive. Tight overdraw limits." },
  hydro: { names: ["Columbia Basin Hydro", "Alpine Hydro Co"], priceMWh: [38, 52], term: [60, 180], overdraw: [0.05, 0.1], overage: 1.6, firmness: [0.9, 0.95], lesson: "Hydro: cheap, low-carbon baseload with long terms — but droughts happen." },
  nuclear: { names: ["Ridgeline Nuclear", "Harbor Atomic"], priceMWh: [48, 62], term: [120, 240], overdraw: [0, 0.03], overage: 2.5, firmness: [0.985, 0.998], lesson: "Nuclear PPA: the firmest carbon-free power, long take-or-pay terms and almost no overdraw — you must size the commit carefully." }
};
const POWER_SOURCES = SOURCES;
function generatePowerOffers(s, rng, n = 1) {
  const out = [];
  const hallKW = s.halls.reduce((a, h) => a + h.itPowerKW, 0);
  for (let i = 0; i < n; i++) {
    const kinds = Object.keys(SOURCES);
    const kind = kinds[Math.floor(rng() * kinds.length)];
    if ((kind === "nuclear" || kind === "hydro") && s.reputation < 15 && rng() < 0.7) continue;
    const t = SOURCES[kind];
    const pick2 = (a) => a[0] + (a[1] - a[0]) * rng();
    const baseMW = Math.max(1, Math.round(hallKW / 1e3 * (0.4 + rng() * 1.2) * (kind === "nuclear" ? 3 : 1)));
    out.push({
      id: `pw-${s.month}-${Math.floor(rng() * 1e5)}`,
      supplier: t.names[Math.floor(rng() * t.names.length)],
      source: kind,
      mw: baseMW,
      priceUSDPerMWh: Math.round(pick2(t.priceMWh)),
      termMonths: Math.round(pick2(t.term)),
      overdrawPct: r2(pick2(t.overdraw)),
      overageMult: t.overage,
      firmness: r2(pick2(t.firmness)),
      offerUntil: s.month + 4
    });
  }
  return out;
}
function settlePower(s, drawMW, rng, log) {
  const spotMWh = s.utilityUSDPerKWh * 1e3;
  const cs = s.powerContracts ?? [];
  const live = cs.filter((c) => s.month >= c.startMonth && s.month <= c.endMonth);
  if (!live.length) return { netUSD: drawMW * spotMWh * HOURS_PER_MONTH, contractUSD: 0, overageUSD: 0, spotUSD: drawMW * spotMWh * HOURS_PER_MONTH, resaleUSD: 0, committedMW: 0, capMW: 0, drawMW, avgUSDPerMWh: spotMWh };
  let contractUSD = 0, committed = 0, cap = 0, overageCap = 0, overagePrice = 0;
  const delivered = [];
  for (const c of live) {
    contractUSD += c.mw * c.priceUSDPerMWh * HOURS_PER_MONTH;
    const failed = rng() > c.firmness;
    const frac = failed ? c.source === "solar" ? 0.35 : 0.5 : 1;
    if (failed) log("bad", `${c.supplier} (${c.source}) curtailed — only ${Math.round(frac * 100)}% delivered this month. You still pay take-or-pay and buy the gap at spot.`);
    delivered.push({ c, frac });
    committed += c.mw * frac;
    cap += c.mw * frac * (1 + c.overdrawPct);
    overageCap += c.mw * frac * c.overdrawPct;
    overagePrice = Math.max(overagePrice, c.priceUSDPerMWh * c.overageMult);
  }
  const base2 = delivered.reduce((a, d) => a + d.c.mw * d.frac, 0);
  let overageUSD = 0, spotUSD = 0, resaleUSD = 0;
  if (drawMW <= base2) resaleUSD = (base2 - drawMW) * spotMWh * 0.8 * HOURS_PER_MONTH;
  else {
    const over = Math.min(drawMW - base2, overageCap);
    overageUSD = over * overagePrice * HOURS_PER_MONTH;
    const rest = drawMW - base2 - over;
    if (rest > 0) spotUSD = rest * spotMWh * HOURS_PER_MONTH;
  }
  const net = contractUSD + overageUSD + spotUSD - resaleUSD;
  return { netUSD: net, contractUSD, overageUSD, spotUSD, resaleUSD, committedMW: committed, capMW: cap, drawMW, avgUSDPerMWh: drawMW > 0 ? net / (drawMW * HOURS_PER_MONTH) : 0 };
}
function powerMarketTick(s, rng, log) {
  s.powerOffers = (s.powerOffers ?? []).filter((o) => o.offerUntil >= s.month);
  const ended = (s.powerContracts ?? []).filter((c) => s.month > c.endMonth);
  for (const c of ended) log("info", `Power contract with ${c.supplier} (${c.mw} MW) has ended. Renegotiate on the Energy screen or you are back on the spot utility rate.`);
  s.powerContracts = (s.powerContracts ?? []).filter((c) => s.month <= c.endMonth);
  if (rng() < 0.45) s.powerOffers = [...s.powerOffers, ...generatePowerOffers(s, rng, 1)].slice(-6);
}
const spotAnchor = (month) => gpuHourAnchor(2020 + month / 12) * 0.85;
function spotUtilization(price, month) {
  return clamp$1(1.2 - 0.95 * (price / gpuHourAnchor(2020 + month / 12)), 0.12, 0.95);
}
function stepSpotPrice(s, rng) {
  const anchor = spotAnchor(s.month);
  const cur = s.spotPrice ?? anchor;
  const shock = (rng() - 0.5) * 0.22 + (rng() < 0.06 ? rng() < 0.5 ? 0.35 : -0.3 : 0);
  const next = clamp$1(cur + (anchor - cur) * 0.2 + cur * shock, anchor * 0.4, anchor * 2.2);
  s.spotPrice = r2(next);
  s.spotHistory = [...s.spotHistory ?? [], s.spotPrice].slice(-24);
}
function spotRevenue(s, servedClusterIds, accelsOfDesign = () => 0) {
  const price = s.spotPrice ?? spotAnchor(s.month);
  if (price < (s.spotReserve ?? 0)) return { revenue: 0, accels: 0, util: 0 };
  const util = spotUtilization(price, s.month);
  let accels = 0;
  for (const id of s.spotClusters ?? []) {
    if (servedClusterIds.has(id)) continue;
    accels += s.clusters.find((c) => c.id === id)?.stats?.accelerators ?? 0;
  }
  const inClusterSpot = new Set(s.spotClusters ?? []);
  for (const id of s.spotRacks ?? []) {
    const pr = s.halls.flatMap((h) => h.racks).find((r) => r.id === id);
    if (!pr || pr.status !== "online") continue;
    if (pr.clusterId && (servedClusterIds.has(pr.clusterId) || inClusterSpot.has(pr.clusterId))) continue;
    accels += accelsOfDesign(pr.designId);
  }
  return { revenue: accels * util * price * HOURS_PER_MONTH, accels, util };
}
const DEFAULT_TICK = {
  accelFailureProbPerMonth: 1 / 8e3,
  commissionFailProb: 0.04,
  repairMonths: 4,
  // RMA turnaround when no spare is on the shelf
  maxAvailableContracts: 10
};
const RACK_READY_LEAD = 2;
const ARCH_BONUS = {
  startup: 1,
  lab: 2,
  enterprise: 3,
  sovereign: 5
};
const round2 = (x) => Math.round(x * 100) / 100;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const ctxOf$2 = (state) => ({
  getRack: (id) => {
    const pid = state.halls.flatMap((h) => h.racks).find((p) => p.id === id)?.designId ?? id;
    return state.racks.find((r) => r.id === pid);
  },
  getTray: (id) => state.trays.find((t) => t.id === id),
  getItem
});
const rackAccels = (state, designId) => {
  const design = state.racks.find((r) => r.id === designId);
  if (!design) return 0;
  let n = 0;
  for (const item of design.items) {
    if (item.type !== "tray") continue;
    const tray = state.trays.find((t) => t.id === item.trayId);
    if (!tray) continue;
    for (const p of tray.parts) {
      if (getItem(p.itemId)?.kind === "accelerator") n += p.count * item.count;
    }
  }
  return n;
};
function advanceMonth(state, opts = {}) {
  const o = { ...DEFAULT_TICK, ...opts };
  const s = JSON.parse(JSON.stringify(state));
  const rng = mulberry32((s.seed ^ Math.imul(s.month + 1, 2654435769)) >>> 0);
  s.month += 1;
  const logs = [];
  const log = (level, text) => logs.push({ month: s.month, level, text });
  const arrived = [];
  s.orders = s.orders.filter((od) => {
    if (od.arriveMonth <= s.month) {
      arrived.push(od);
      return false;
    }
    return true;
  });
  for (const od of arrived) {
    if (od.spare) {
      s.spareStock = s.spareStock ?? {};
      s.spareStock[od.itemId] = (s.spareStock[od.itemId] ?? 0) + od.qty;
    } else s.inventory[od.itemId] = (s.inventory[od.itemId] ?? 0) + od.qty;
  }
  if (arrived.length) {
    const units = arrived.reduce((n, od) => n + od.qty, 0);
    log("good", `Delivered ${units} unit(s) from ${arrived.length} order(s) into inventory.`);
  }
  const placed2 = [];
  for (const hall of s.halls) placed2.push(...hall.racks);
  for (const rack of placed2) {
    if (rack.status === "installing" && s.month >= rack.readyMonth - 1) {
      rack.status = "commissioning";
    } else if (rack.status === "commissioning" && s.month >= rack.readyMonth) {
      if (rng() < o.commissionFailProb) {
        rack.status = "failed";
        rack.readyMonth = s.month + o.repairMonths;
        log("bad", `Rack ${rack.id} failed burn-in during commissioning; repair ETA month ${rack.readyMonth}.`);
      } else {
        rack.status = "online";
        log("good", `Rack ${rack.id} commissioned and online.`);
      }
    } else if (rack.status === "failed" && s.month >= rack.readyMonth) {
      rack.status = "online";
      rack.failedPart = void 0;
      log("good", `Rack ${rack.id} repaired and back online.`);
    }
  }
  const placedById = new Map(placed2.map((r) => [r.id, r]));
  const ctx = ctxOf$2(s);
  const onlineIdsOf = (c) => c.rackIds.filter((id) => placedById.get(id)?.status === "online");
  const refreshStats = () => {
    for (const c of s.clusters) c.stats = evaluateCluster({ ...c, rackIds: onlineIdsOf(c) }, ctx);
  };
  refreshStats();
  const onlineKW = s.clusters.reduce((n, c) => n + (c.stats?.powerKW ?? 0), 0);
  const coolingKW = s.halls.reduce((n, h) => n + h.coolingKW, 0);
  const stressed = coolingKW < onlineKW;
  let failedNow = 0;
  for (const rack of placed2) {
    if (rack.status !== "online") continue;
    const rates = rackRates(s, rack.designId);
    const total = rates.reduce((n, r) => n + r.rate, 0) * (o.accelFailureProbPerMonth * 8e3);
    const p = 1 - Math.exp(-total * (stressed ? 3 : 1));
    if (p > 0 && rng() < p) {
      let pick2 = rng() * rates.reduce((n, r) => n + r.rate, 0);
      const part = (rates.find((r) => (pick2 -= r.rate) <= 0) ?? rates[0]).id;
      const label = PART_LABEL[partClass(part) ?? ""] ?? "part";
      rack.status = "failed";
      rack.failedPart = part;
      if ((s.spareStock?.[part] ?? 0) > 0) {
        s.spareStock[part] -= 1;
        rack.readyMonth = s.month + 1;
        log("info", `${rack.id}: ${label} failed (${getItem(part)?.name}); swapping from your spares — back next month.`);
      } else {
        rack.readyMonth = s.month + o.repairMonths;
        log("bad", `${rack.id}: ${label} failed (${getItem(part)?.name}) and you have NO SPARE. Waiting on RMA until month ${rack.readyMonth}. Keep spares in the warehouse.`);
      }
      failedNow++;
    }
  }
  if (failedNow) {
    log(
      "bad",
      `${failedNow} rack(s) went down${stressed ? " — cooling capacity is below IT load, heat is killing hardware (3x failure rate)" : ""}.`
    );
    refreshStats();
  }
  for (const hall of s.halls) hall.pue = computePUE(hall, getItem);
  let revenueTotal = 0;
  const servedClusterIds = /* @__PURE__ */ new Set();
  const completed = [];
  const defaulted = [];
  const usedFrac = {};
  const needGbps = totalNeedGbps(s);
  const netFactor = needGbps > 0 ? Math.min(1, uplinkGbps(s) / needGbps) : 1;
  if (netFactor < 1) log("bad", `Internet uplink is saturated: customers need ~${needGbps.toFixed(1)} Gb/s but you only have ${uplinkGbps(s).toFixed(0)} Gb/s, so every contract runs at ${(netFactor * 100).toFixed(0)}% availability. Buy transit on Build → Internet.`);
  for (const ac of s.activeContracts) {
    const c = ac.contract;
    if (ac.clusterIds.length === 0) {
      const by = ac.deployBy ?? ac.startMonth + 4;
      if (s.month > by) defaulted.push(ac);
      else if (s.month === by) log("bad", `Last month to bring capacity online for ${c.customer} (${c.model.name}) — assign a qualifying cluster now or they walk.`);
      continue;
    }
    for (const id of ac.clusterIds) servedClusterIds.add(id);
    let availability = 0;
    let accelerators = 0;
    let tokensPerSec = 0;
    if (c.kind === "training") {
      let total = 0;
      let eff = 0;
      for (const id of ac.clusterIds) {
        const cl = s.clusters.find((x) => x.id === id);
        if (!cl) continue;
        eff += cl.stats?.accelerators ?? 0;
        total += cl.rackIds.reduce((n, rid) => {
          const pr = placedById.get(rid);
          return n + (pr ? rackAccels(s, pr.designId) : 0);
        }, 0);
      }
      availability = total > 0 ? eff / total : 0;
      accelerators = eff;
    } else {
      let capacity = 0;
      let worstTtftMs = 0;
      const parts = [];
      for (const id of ac.clusterIds) {
        const cl = s.clusters.find((x) => x.id === id);
        const stats = cl?.stats;
        if (!stats || stats.accelerators <= 0) continue;
        const item = getItem(stats.acceleratorId);
        if (!item || item.kind !== "accelerator") continue;
        const accel = item;
        const cap = inferenceCapacity(stats, accel, c.model, {
          contextTokens: c.contextTokens,
          tpotMs: c.tpotMs
        });
        const remain = Math.max(0, 1 - (usedFrac[id] ?? 0));
        parts.push({ id, capTok: cap.tokensPerSec, remain });
        capacity += cap.tokensPerSec * remain;
        worstTtftMs = Math.max(worstTtftMs, cap.ttftMs);
      }
      const served = Math.min(capacity, c.tokensPerSec);
      for (const pt of parts) if (capacity > 0 && pt.capTok > 0) usedFrac[pt.id] = (usedFrac[pt.id] ?? 0) + served * (pt.capTok * pt.remain / capacity) / pt.capTok;
      const frac = capacity / Math.max(1, c.tokensPerSec);
      availability = Math.min(1, frac) * (worstTtftMs <= c.ttftMs ? 1 : 0.8);
      tokensPerSec = Math.min(capacity, c.tokensPerSec);
    }
    availability *= netFactor;
    const res = c.kind === "training" ? contractRevenue(ac, { accelerators, availability }) : contractRevenue(ac, { tokensPerSec, availability });
    revenueTotal += res.netUSD;
    if (!res.slaMet) {
      ac.slaMisses += 1;
      log(
        "bad",
        `SLA miss for ${c.customer} (${c.model.name}): availability ${(availability * 100).toFixed(1)}% vs ${(c.slaAvailability * 100).toFixed(1)}% required. Penalties applied.`
      );
    }
    ac.monthsServed += 1;
    if (ac.monthsServed >= c.durationMonths) completed.push(ac);
  }
  for (const ac of defaulted) {
    s.reputation = clamp(s.reputation - 8, 0, 100);
    log("bad", `${ac.contract.customer} cancelled: you never brought a qualifying cluster online for ${ac.contract.model.name} in time. Reputation −8.`);
  }
  s.activeContracts = s.activeContracts.filter((ac) => {
    if (defaulted.includes(ac)) return false;
    if (!completed.includes(ac)) return true;
    const c = ac.contract;
    const clean = ac.slaMisses === 0;
    const sloppy = ac.slaMisses > Math.ceil(c.durationMonths / 3);
    const gain = 2 + ARCH_BONUS[c.archetype] + (clean ? 1 : 0) - (sloppy ? 3 : 0);
    s.reputation = clamp(s.reputation + gain, 0, 100);
    log(
      "good",
      `${c.customer} contract complete: ${c.model.name}, ${c.durationMonths} mo served, ${ac.slaMisses} SLA miss(es). Reputation ${gain >= 0 ? "+" : ""}${gain}.`
    );
    return false;
  });
  const expired = s.availableContracts.filter((c) => c.deadlineMonth < s.month);
  const fresh = generateContracts(s, s.month, rng);
  s.availableContracts = [
    ...s.availableContracts.filter((c) => c.deadlineMonth >= s.month),
    ...fresh
  ].slice(-o.maxAvailableContracts);
  if (expired.length) log("info", `${expired.length} contract offer(s) expired unserved.`);
  if (fresh.length) log("info", `${fresh.length} new contract offer(s) on the market.`);
  rollEvents(s, rng, log);
  stepSpotPrice(s, rng);
  const spot = spotRevenue(s, servedClusterIds, (d) => rackAccels(s, d));
  if (spot.revenue > 0) {
    revenueTotal += spot.revenue;
    log("info", `Spot market: ${Math.round(spot.accels)} idle GPUs sold at $${(s.spotPrice ?? 0).toFixed(2)}/GPU-hr (${Math.round(spot.util * 100)}% filled) → +$${Math.round(spot.revenue).toLocaleString("en-US")}.`);
  }
  powerMarketTick(s, rng, log);
  const opex0 = monthlyOpex(s);
  const pw2 = settlePower(s, opex0.itPowerKW * opex0.pue / 1e3, rng, log);
  const opex = { powerUSD: pw2.netUSD, totalUSD: opex0.totalUSD - opex0.powerUSD + pw2.netUSD };
  const depreciation = monthlyDepreciation(estimateCapexBasis(s));
  const interest = monthlyInterest(s.debt);
  const prevCash = s.cash;
  s.cash = round2(s.cash + revenueTotal - opex.totalUSD - interest);
  if (s.cash < 0 && prevCash >= 0) {
    log("bad", "Bankruptcy warning: cash is negative. Raise a loan, land contracts, or cut opex before creditors close you down.");
  }
  const onlineAccels = s.clusters.reduce((n, c) => n + (c.stats?.accelerators ?? 0), 0);
  const servingAccels = [...servedClusterIds].reduce(
    (n, id) => n + (s.clusters.find((x) => x.id === id)?.stats?.accelerators ?? 0),
    0
  );
  const utilization = onlineAccels > 0 ? Math.min(1, servingAccels / onlineAccels) : 0;
  s.history.push({
    month: s.month,
    revenue: round2(revenueTotal),
    opex: round2(opex.totalUSD + depreciation + interest),
    cash: s.cash,
    utilization: round2(utilization)
  });
  s.log = [...s.log, ...logs].slice(-400);
  return s;
}
const G$1 = () => useGame.getState().game;
const TECH = ["ib-ndr", "ib-xdr", "spectrum-x", "eth-400", "eth-800", "roce", "uec-eth"];
const TOPO = "fat-tree-rail-optimized";
const ctxOf$1 = (g) => ({
  getRack: (id) => {
    const pid = g.halls.flatMap((h) => h.racks).find((p) => p.id === id)?.designId ?? id;
    return g.racks.find((r) => r.id === pid);
  },
  getTray: (id) => g.trays.find((t) => t.id === id),
  getItem
});
function autoFabric(g, rackIds, targetGBs = 0) {
  const sw2 = ITEMS_BY_KIND("switch").filter((s) => s.role === "scale-out" && s.rackUnits > 0 && offerAt(s, g.month).available);
  const cables = ITEMS_BY_KIND("cable").filter((c) => offerAt(c, g.month).available);
  const node = cables.find((c) => c.cableType === "aoc") ?? cables[0], spine = cables.find((c) => c.cableType === "optic-dr") ?? cables[0];
  if (!sw2.length || !node) return null;
  let best = null;
  for (const tech of TECH) for (const leaf of sw2) for (const over of [1, 2, 4]) {
    const f = { id: "auto", name: "Auto fabric", scaleOutTech: tech, topology: TOPO, oversubscription: over, leafSwitchId: leaf.id, spineSwitchId: leaf.id, nodeToLeafCableId: node.id, leafToSpineCableId: spine?.id };
    let st2;
    try {
      st2 = evaluateCluster({ id: "d", name: "d", rackIds, fabric: f }, ctxOf$1(g));
    } catch {
      continue;
    }
    if (st2.issues.some((i) => i.severity === "error")) continue;
    const cost = Object.entries(st2.switchCounts).reduce((n, [id, c]) => n + (getItem(id)?.priceUSD ?? 0) * c, 0) + Object.entries(st2.cableCounts).reduce((n, [id, c]) => n + (getItem(id)?.priceUSD ?? 0) * c, 0);
    const ok2 = st2.effScaleOutGBs >= targetGBs;
    if (!best || ok2 && !best.ok || ok2 === best.ok && (ok2 ? cost < best.cost : st2.effScaleOutGBs > best.bw)) best = { f, cost, bw: st2.effScaleOutGBs, ok: ok2 };
  }
  if (!best) return null;
  return { fabric: best.f, note: `${best.f.scaleOutTech.toUpperCase()} · ${best.f.oversubscription}:1 · ${getItem(best.f.leafSwitchId)?.name} → ${best.bw.toFixed(0)} GB/s per accelerator` };
}
const COOL_LEVEL$1 = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };
function plantChoice(g, hallClass, kind) {
  const cand = ALL_ITEMS.filter((i) => kind === "power" ? i.kind === "power" && i.powerType === "transformer" : i.kind === "cooling" && i.serves === hallClass).map((i) => offerAt(i, g.month)).filter((o) => o.available);
  cand.sort((a, b) => a.unitPrice / (a.item.capacityKW || 1) - b.unitPrice / (b.item.capacityKW || 1));
  return cand[0];
}
function stepProject(st2, pid) {
  const g = G$1();
  const p = (g.projects ?? []).find((x) => x.id === pid);
  if (!p || p.stage === "done" || p.stage === "failed") return;
  const t = getTemplate(p.templateId);
  const hall = g.halls.find((h) => h.id === p.hallId);
  if (!t || !hall) return st2.patchProject(pid, { stage: "failed", notes: [...p.notes, "Template or hall disappeared."] });
  const f = templateFacts(t);
  if (!G$1().activeContracts.some((a) => a.contract.id === p.contractId) && p.stage !== "building") {
    st2.patchProject(pid, { stage: "failed", notes: [...p.notes, "Contract was cancelled — the capacity is yours; offer it on spot in Energy."] });
    return;
  }
  const note = (s) => st2.patchProject(pid, { notes: [...g.projects.find((x) => x.id === pid).notes, `${2020 + Math.floor(g.month / 12)}-${String(g.month % 12 + 1).padStart(2, "0")}: ${s}`].slice(-12) });
  if (p.stage === "building") {
    for (const pl of p.plant) {
      const have2 = g.inventory[pl.id] ?? 0;
      const it2 = getItem(pl.id);
      if (have2 > 0 && it2) {
        const inst = (it2.kind === "power" ? hall.powerEquip : hall.coolingEquip)[pl.id] ?? 0;
        const need = Math.max(0, pl.n - inst);
        const n = Math.min(have2, need);
        if (n > 0) {
          const r = it2.kind === "power" ? st2.installPower(hall.id, pl.id, n) : st2.installCooling(hall.id, pl.id, n);
          if (r.ok) note(`installed ${n} × ${it2.name}`);
        }
      }
    }
    const h2 = useStoreHall(st2, hall.id);
    const load = h2.racks.reduce((n, r) => n + (r.status === "failed" ? 0 : templateFactsOfDesign(G$1(), r.designId)), 0) + f.kWPerRack * (p.racks - p.rackIds.length);
    const free = h2.rackSlots - h2.racks.length;
    const designId = rackIdOf(t);
    const bom = rackBom(G$1(), designId) ?? {};
    const have = (n) => Object.entries(bom).every(([id, c]) => (G$1().inventory[id] ?? 0) >= c * n);
    let placed2 = p.rackIds.length;
    if (load <= h2.itPowerKW && load <= h2.coolingKW) {
      while (placed2 < p.racks && free - (placed2 - p.rackIds.length) > 0 && have(1)) {
        const r = st2.placeRack(hall.id, designId);
        if (!r.ok) {
          note(`placement blocked: ${r.message}`);
          break;
        }
        placed2++;
      }
    }
    if (placed2 > p.rackIds.length) {
      const ids = useStoreHall(st2, hall.id).racks.filter((r) => r.designId === designId && !r.clusterId).map((r) => r.id).slice(0, p.racks);
      note(`deployed ${placed2}/${p.racks} racks`);
      st2.patchProject(pid, { rackIds: ids, ...placed2 >= p.racks ? { stage: "commissioning" } : {} });
    }
  } else if (p.stage === "commissioning") {
    const racks = useStoreHall(st2, hall.id).racks.filter((r) => p.rackIds.includes(r.id));
    if (racks.length && racks.every((r) => r.status === "online")) {
      note("all racks online — designing the fabric");
      st2.patchProject(pid, { stage: "clustering" });
      stepProject(st2, pid);
    }
  } else if (p.stage === "clustering") {
    const c = G$1().activeContracts.find((a) => a.contract.id === p.contractId)?.contract;
    const target = c && c.kind === "training" ? c.minScaleOutGBsPerAccel : 0;
    const af = autoFabric(G$1(), p.rackIds, target);
    if (!af) return note("no valid fabric found — build one by hand on the Supercomputer screen");
    const r = st2.createCluster(p.name, p.rackIds, af.fabric);
    if (!r.ok) return note(`cluster blocked: ${r.message}`);
    note(`cluster built: ${af.note}`);
    st2.patchProject(pid, { stage: "assigning", clusterId: G$1().clusters[G$1().clusters.length - 1].id });
    stepProject(st2, pid);
  } else if (p.stage === "assigning") {
    const cid = p.clusterId ?? G$1().clusters[G$1().clusters.length - 1]?.id;
    if (!cid) return;
    const r = st2.assignContract(p.contractId, [cid]);
    if (r.ok) {
      note("contract live — revenue starts next month");
      st2.patchProject(pid, { stage: "done" });
    } else note(`not qualified yet: ${r.message}`);
  }
}
const useStoreHall = (_st, hid) => G$1().halls.find((h) => h.id === hid);
const templateFactsOfDesign = (g, designId) => {
  const d = g.racks.find((r) => r.id === designId);
  if (!d) return 0;
  const t = (g.projects ?? []).map((p) => getTemplate(p.templateId)).find((tt) => tt && rackIdOf(tt) === designId);
  return t ? templateFacts(t).kWPerRack : 30;
};
function ensureUplink(st2) {
  const g = G$1();
  if (!g.uplinks) return;
  const live = new Set(g.activeContracts.map((a) => a.contract.id));
  let need = g.activeContracts.reduce((n, a) => n + contractNeedGbps(a.contract), 0);
  for (const p of g.projects ?? []) if (p.stage !== "done" && p.stage !== "failed" && !live.has(p.contractId)) {
    const c = g.availableContracts.find((x) => x.id === p.contractId);
    if (c) need += contractNeedGbps(c);
  }
  const have = uplinkGbps(g);
  if (have >= need * 1.1) return;
  const opts = ITEMS_BY_KIND("uplink").filter((u) => u.service === "transit" && u.availableFrom * 12 - 2020 * 12 <= g.month).sort((a, b) => a.mrcUSD / a.gbps - b.mrcUSD / b.gbps);
  const fit = opts.filter((u) => u.gbps >= need * 1.1 - have).sort((a, b) => a.mrcUSD - b.mrcUSD)[0] ?? opts[opts.length - 1];
  if (fit) st2.buyUplink(fit.id);
}
function stepAllProjects(getSt) {
  ensureUplink(getSt());
  for (const p of getSt().game.projects ?? []) stepProject(getSt(), p.id);
}
function startProject(st2, contractId, templateId, racks) {
  const t = getTemplate(templateId);
  if (!t) return { ok: false, message: "Unknown build." };
  const g0 = G$1();
  if (!g0.activeContracts.some((a) => a.contract.id === contractId)) {
    const a = st2.acceptContract(contractId);
    if (!a.ok) return a;
  }
  const r = st2.buyTemplate(templateId, racks);
  if (!r.ok) return r;
  const f = templateFacts(t);
  let hall = G$1().halls.find((h) => COOL_LEVEL$1[h.coolingClass] >= COOL_LEVEL$1[t.rack.cooling] && h.rackSlots - h.racks.length >= racks);
  const notes = [`ordered ${racks} × ${t.name}`];
  if (!hall) {
    const b = st2.buildHall(`Hall ${String.fromCharCode(65 + G$1().halls.length)}`, t.rack.cooling, Math.max(8, racks + 4));
    notes.push(b.message);
    hall = G$1().halls[G$1().halls.length - 1];
  }
  const need = f.kWPerRack * racks + hall.racks.length * 0;
  const plant = [];
  const g = G$1();
  const fresh = g.halls.find((h) => h.id === hall.id);
  const pw2 = plantChoice(g, fresh.coolingClass, "power"), cl = plantChoice(g, fresh.coolingClass, "cooling");
  const loadNow = fresh.racks.length ? need : need;
  if (fresh.itPowerKW < loadNow && pw2) {
    const n = Math.ceil((loadNow - fresh.itPowerKW) / pw2.item.capacityKW);
    const b = st2.buy(pw2.item.id, n);
    if (b.ok) {
      plant.push({ id: pw2.item.id, n });
      notes.push(`ordered ${n} × ${pw2.item.name} (power)`);
    } else notes.push(`power plant: ${b.message}`);
  }
  if (fresh.coolingKW < loadNow && cl) {
    const n = Math.ceil((loadNow - fresh.coolingKW) / cl.item.capacityKW);
    const b = st2.buy(cl.item.id, n);
    if (b.ok) {
      plant.push({ id: cl.item.id, n });
      notes.push(`ordered ${n} × ${cl.item.name} (cooling)`);
    } else notes.push(`cooling plant: ${b.message}`);
  }
  const proj = { id: `pj-${g.month}-${(g.projects ?? []).length + 1}`, contractId, templateId, racks, hallId: fresh.id, name: `Cluster ${g.clusters.length + 1}`, stage: "building", rackIds: [], plant, notes: notes.map((n) => `${2020 + Math.floor(g.month / 12)}-${String(g.month % 12 + 1).padStart(2, "0")}: ${n}`), startMonth: g.month };
  st2.addProject(proj);
  return { ok: true, message: `Easy path started: ${notes.join("; ")}. I will install, deploy, cluster and assign as parts arrive.` };
}
function assignFromRacks(st2, contractId, rackIds) {
  if (!rackIds.length) return { ok: false, message: "Pick at least one online rack." };
  const g = G$1();
  const placed2 = g.halls.flatMap((h) => h.racks);
  const bad = rackIds.filter((id) => placed2.find((p) => p.id === id)?.status !== "online");
  if (bad.length) return { ok: false, message: "All chosen racks must be online (commissioned)." };
  if (!g.activeContracts.some((a2) => a2.contract.id === contractId)) {
    const a2 = st2.acceptContract(contractId);
    if (!a2.ok) return a2;
  }
  const c = G$1().activeContracts.find((a2) => a2.contract.id === contractId).contract;
  const af = autoFabric(G$1(), rackIds, c.kind === "training" ? c.minScaleOutGBsPerAccel : 0);
  if (!af) return { ok: false, message: "No valid network fabric found for these racks." };
  const free = rackIds.filter((id) => !placed2.find((p) => p.id === id)?.clusterId);
  if (free.length !== rackIds.length) return { ok: false, message: "Some racks already belong to a cluster — assign that cluster instead." };
  const r = st2.createCluster(`Auto · ${c.customer}`, rackIds, af.fabric);
  if (!r.ok) return r;
  const cl = G$1().clusters[G$1().clusters.length - 1];
  const a = st2.assignContract(contractId, [cl.id]);
  return a.ok ? { ok: true, message: `Serving ${c.customer} from ${rackIds.length} rack(s) (auto-clustered: ${af.note}).` } : { ok: false, message: `${a.message} (the racks were grouped into '${cl.name}' — add more racks or fix and assign from Customers.)` };
}
const DEMAND_CURVE = [
  [2020, 0.2],
  [2022.4, 0.4],
  [2023.3, 1],
  [2024.6, 0.9],
  [2026, 0.55],
  [2028, 0.5]
];
const lerpCurve = (pts, x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + (x - x0) / (x1 - x0) * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
};
const START_MONTH = 11;
const demandIndex = (year) => lerpCurve(DEMAND_CURVE, year);
const offerAt = (item, month) => {
  const year = monthToYear(month);
  if (year < item.availableFrom) {
    return {
      item,
      available: false,
      reason: `Not shipping until ${Math.floor(item.availableFrom)} — labs and hyperscalers queue first.`,
      unitPrice: 0,
      leadMonths: 0
    };
  }
  if (item.eolAfter && year > item.eolAfter) {
    return {
      item,
      available: false,
      reason: "End-of-sale: the vendor no longer ships this generation. Look at newer parts.",
      unitPrice: 0,
      leadMonths: 0
    };
  }
  const age = year - item.availableFrom;
  const hype = age < 0.4 ? 1.12 : 1;
  const decay = Math.max(0.55, 1 - 0.1 * Math.max(0, age - 0.4));
  const demand = demandIndex(year);
  const boom = 1 + demand * (item.kind === "accelerator" ? 0.18 : 0.06);
  const lead = Math.max(
    1,
    Math.round(item.leadTimeMonths * (1 + demand * (item.kind === "accelerator" ? 1 : 0.25)))
  );
  return {
    item,
    available: true,
    unitPrice: Math.round(item.priceUSD * hype * decay * boom),
    leadMonths: lead,
    qtyCap: item.allocationPerQuarter
  };
};
const volumeDiscount = (item, qty, unitPrice) => {
  const vendor = VENDORS.find((v2) => v2.id === item.vendor);
  if (!vendor || qty <= 0) return 0;
  const doublings = Math.floor(Math.log2(Math.max(1, unitPrice * qty) / 1e6));
  if (doublings <= 0) return 0;
  return Math.min(0.25, doublings * (vendor.volumeDiscountPerDoublingPct / 100));
};
const rackBom = (state, designId) => {
  const design = state.racks.find((r) => r.id === designId);
  if (!design) return void 0;
  const need = { [design.rackId]: 1 };
  for (const item of design.items) {
    if (item.type === "tray") {
      const tray = state.trays.find((t) => t.id === item.trayId);
      if (!tray) return void 0;
      for (const p of tray.parts) need[p.itemId] = (need[p.itemId] ?? 0) + p.count * item.count;
    } else {
      const id = item.type === "switch" ? item.switchId : item.type === "storage" ? item.storageId : item.powerId;
      need[id] = (need[id] ?? 0) + item.count;
    }
  }
  return need;
};
const creditLimit = (state) => 5e6 + estimateCapexBasis(state) * 0.6;
const selectCapexBasis = estimateCapexBasis;
const selectNetWorth = (g) => g.cash - g.debt + estimateCapexBasis(g) * 0.5;
const selectMonthlyPnL = (g) => {
  const opex = monthlyOpex(g);
  const depreciation = monthlyDepreciation(estimateCapexBasis(g));
  const interest = monthlyInterest(g.debt);
  const revenue = g.activeContracts.reduce((sum2, ac) => {
    if (ac.clusterIds.length === 0) return sum2;
    const c = ac.contract;
    if (c.kind === "training") {
      const accels = ac.clusterIds.reduce(
        (n, id) => n + (g.clusters.find((x) => x.id === id)?.stats?.accelerators ?? 0),
        0
      );
      return sum2 + accels * c.pricePerAccelHour * HOURS_PER_MONTH;
    }
    return sum2 + c.tokensPerSec * HOURS_PER_MONTH * 3600 / 1e6 * c.pricePerMTok;
  }, 0);
  return { revenue, opex: opex.totalUSD, depreciation, interest, net: revenue - opex.totalUSD - depreciation - interest };
};
const POWER_LESSON = Object.fromEntries(Object.entries(POWER_SOURCES).map(([k2, v2]) => [k2, v2.lesson]));
const SAVE_KEY = "gigawatt-save-v1";
const ok = (message = "", issues) => ({ ok: true, message, issues });
const fail = (message, issues) => ({ ok: false, message, issues });
const usd = (n) => Math.round(n).toLocaleString("en-US");
const COOL_LEVEL = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };
const POWER_FEED_TYPES = [
  "transformer",
  "ups",
  "busway",
  "power-shelf",
  "solar-ppa",
  "gas-turbine"
];
const useGame = create()((set, get) => {
  const commit = (mutate) => {
    const g = JSON.parse(JSON.stringify(get().game));
    const res = mutate(g) ?? ok();
    if (res.ok) set({ game: g });
    return res;
  };
  const logln = (g, level, text) => {
    g.log.push({ month: g.month, level, text });
  };
  return {
    game: newGameState(0),
    newGame: (seed = Math.floor(Math.random() * 2 ** 31), mode = "operator") => {
      const g = newGameState(seed);
      g.mode = mode;
      if (mode === "learner") {
        g.cash = 8e7;
        g.log.push({ month: g.month, level: "info", text: "🎓 Learner mode: $80M starting cash, explainers everywhere, and the Easy path will do the build steps for you." });
      }
      if (mode === "tycoon") {
        g.cash = 3e7;
        g.log.push({ month: g.month, level: "info", text: "💼 Tycoon mode: $30M, no hand-holding. Good luck." });
      }
      set({ game: g });
    },
    patchProject: (id, patch) => set((s) => ({ game: { ...s.game, projects: (s.game.projects ?? []).map((p) => p.id === id ? { ...p, ...patch } : p) } })),
    addProject: (p) => set((s) => ({ game: { ...s.game, projects: [...s.game.projects ?? [], p] } })),
    setMode: (m) => set((s) => ({ game: { ...s.game, mode: m } })),
    startEasy: (contractId, templateId, racks) => {
      const r = startProject(get(), contractId, templateId, racks);
      if (r.ok) stepAllProjects(get);
      return r;
    },
    stepEasy: () => stepAllProjects(get),
    buy: (itemId, qty, spare = false) => commit((g) => {
      const item = getItem(itemId);
      if (!item) return fail(`Unknown item '${itemId}'.`);
      if (item.kind === "uplink") return fail("Internet circuits are added on Build → Internet.");
      if (!Number.isFinite(qty) || qty <= 0) return fail("Order quantity must be positive.");
      const offer = offerAt(item, g.month);
      if (!offer.available) {
        return fail(offer.reason ?? "Not purchasable this month.", [
          { severity: "error", code: "unavailable", message: offer.reason ?? "", learn: item.id }
        ]);
      }
      let n = Math.floor(qty);
      let note = "";
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
        ...spare ? { spare: true } : {}
      });
      logln(
        g,
        "info",
        `Ordered ${n} ${spare ? "spare " : ""}× ${item.name} for $${usd(cost)}${discount > 0 ? ` (${(discount * 100).toFixed(0)}% volume discount)` : ""}; arriving month ${g.month + offer.leadMonths}.${note}`
      );
      return ok(`Ordered ${n} × ${item.name}; arrives month ${g.month + offer.leadMonths}.${note}`);
    }),
    adoptTemplate: (templateId) => {
      const t = getTemplate(templateId);
      if (!t) return { ok: false, message: "Unknown template." };
      const g = get().game;
      if (!g.trays.some((x) => x.id === trayIdOf(t))) {
        const r = get().saveTray(trayOf(t));
        if (!r.ok) return r;
      }
      if (!get().game.racks.some((x) => x.id === rackIdOf(t))) {
        const r = get().saveRack(rackOf(t));
        if (!r.ok) return r;
      }
      return { ok: true, message: `Saved designs for ${t.name}.` };
    },
    buyTemplate: (templateId, racks, spares = true) => {
      const t = getTemplate(templateId);
      const nRacks = Math.floor(racks);
      if (!t) return { ok: false, message: "Unknown template." };
      if (!(nRacks >= 1)) return { ok: false, message: "Order at least one rack." };
      const adopted = get().adoptTemplate(templateId);
      if (!adopted.ok) return adopted;
      return commit((g) => {
        const bom = templateBom(t, nRacks);
        const spareBom = {};
        if (spares) for (const id of Object.keys(bom)) {
          const sp = spareQty(id, bom[id]);
          if (sp) spareBom[id] = sp;
        }
        let cost = 0, lead = 1;
        const lines = [];
        const wanted = [...Object.entries(bom).map(([i, n]) => [i, n, false]), ...Object.entries(spareBom).map(([i, n]) => [i, n, true])];
        for (const [itemId, n, isSpare] of wanted) {
          const item = getItem(itemId);
          const offer = offerAt(item, g.month);
          if (!offer.available) return fail(`${item.name} is not purchasable yet: ${offer.reason}`);
          if (offer.qtyCap && n > offer.qtyCap) return fail(`Allocation: the vendor will only sell ${offer.qtyCap} × ${item.name} per quarter and you asked for ${n}. Order fewer racks or split across quarters.`);
          const unit = Math.round(offer.unitPrice * (1 - volumeDiscount(item, n, offer.unitPrice)) * (1 + t.premium));
          cost += unit * n;
          const l = Math.max(1, Math.round(offer.leadMonths * t.leadFactor));
          lead = Math.max(lead, l);
          lines.push({ itemId, n, unit, lead: l, spare: isSpare });
        }
        if (cost > g.cash) return fail(`Insufficient funds: this order costs $${usd(cost)} but you have $${usd(g.cash)}. Try fewer racks, or take a loan on the Dashboard.`);
        g.cash -= cost;
        for (const l of lines) g.orders.push({ id: `ord-${g.month}-${g.orders.length + 1}-${l.itemId}`, itemId: l.itemId, qty: l.n, unitPrice: l.unit, arriveMonth: g.month + l.lead, ...l.spare ? { spare: true } : {} });
        logln(g, "info", `Ordered ${nRacks} × ${t.name} for $${usd(cost)} (${t.tier}, ${Math.round(t.premium * 100)}% integration premium). Full bill of materials arrives by month ${g.month + lead}.`);
        return ok(`Ordered ${nRacks} racks: $${usd(cost)}, everything arrives by month ${g.month + lead}.`);
      });
    },
    saveTray: (tray) => commit((g) => {
      const i = g.trays.findIndex((t) => t.id === tray.id);
      if (i >= 0) g.trays[i] = tray;
      else g.trays.push(tray);
      logln(g, "info", `Tray design '${tray.name}' saved.`);
      return ok("Tray saved.");
    }),
    saveRack: (rack) => commit((g) => {
      const i = g.racks.findIndex((r) => r.id === rack.id);
      if (i >= 0) g.racks[i] = rack;
      else g.racks.push(rack);
      logln(g, "info", `Rack design '${rack.name}' saved.`);
      return ok("Rack saved.");
    }),
    buildHall: (name, coolingClass, rackSlots) => commit((g) => {
      const slots = Math.floor(rackSlots);
      if (slots < 4 || slots > 200) return fail("Halls hold between 4 and 200 rack slots.");
      const cost = 2e6 + 25e4 * slots;
      if (cost > g.cash) return fail(`This hall costs $${usd(cost)} — not enough cash.`);
      g.cash -= cost;
      const id = `hall-${g.halls.length + 1}`;
      const hall = {
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
        floorLoadKgPerRack: 1500
      };
      g.halls.push(hall);
      logln(
        g,
        "good",
        `Built ${hall.name}: ${slots} slots, ${coolingClass.toUpperCase()}-ready shell. Install power and cooling plant before racks come in.`
      );
      return ok(`${hall.name} built. Install power & cooling next.`);
    }),
    buyUplink: (itemId) => commit((g) => {
      const item = getItem(itemId);
      if (!item || item.kind !== "uplink") return fail("Pick an internet circuit.");
      if (item.availableFrom * 12 - 2020 * 12 > g.month) return fail(`${item.name} is not offered yet.`);
      if (g.cash < item.priceUSD) return fail(`Install fee is $${usd(item.priceUSD)}; you have $${usd(g.cash)}.`);
      g.cash -= item.priceUSD;
      g.uplinks = { ...g.uplinks ?? {}, [itemId]: ((g.uplinks ?? {})[itemId] ?? 0) + 1 };
      logln(g, "info", `Turned up ${item.name}: $${usd(item.priceUSD)} install, then $${usd(item.mrcUSD)}/month.`);
      return ok(`${item.name} is live. Billing $${usd(item.mrcUSD)}/month.`);
    }),
    dropUplink: (itemId) => commit((g) => {
      const c = g.uplinks?.[itemId] ?? 0;
      if (c <= 0) return fail("You have no such circuit.");
      g.uplinks = { ...g.uplinks, [itemId]: c - 1 };
      return ok("Circuit cancelled; billing stops next month.");
    }),
    installPower: (hallId, itemId, qty) => commit((g) => {
      const hall = g.halls.find((h) => h.id === hallId);
      if (!hall) return fail(`Hall '${hallId}' not found.`);
      const item = getItem(itemId);
      if (!item || item.kind !== "power") return fail("Pick a power-equipment catalog item.");
      if (item.powerType === "pdu" || item.powerType === "power-shelf") {
        return fail(`${item.name} is a rack/tray-level part — it gets used when you place a rack, not installed in the hall. Keep it in the warehouse.`);
      }
      const n = Math.floor(qty);
      if (n <= 0) return fail("Quantity must be positive.");
      const have = g.inventory[itemId] ?? 0;
      if (have < n) {
        return fail(`Need ${n} × ${item.name} in inventory (have ${have}). Order them first.`, [
          { severity: "error", code: "missing-parts", message: `Need ${n}, have ${have}.`, learn: item.id }
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
        "good",
        `Installed ${n} × ${item.name} in ${hall.name}${addedKW > 0 ? ` (+${usd(addedKW)} kW IT capacity)` : ""}.`
      );
      return ok(`Installed in ${hall.name}.`);
    }),
    installCooling: (hallId, itemId, qty) => commit((g) => {
      const hall = g.halls.find((h) => h.id === hallId);
      if (!hall) return fail(`Hall '${hallId}' not found.`);
      const item = getItem(itemId);
      if (!item || item.kind !== "cooling") return fail("Pick a cooling-equipment catalog item.");
      const n = Math.floor(qty);
      if (n <= 0) return fail("Quantity must be positive.");
      if (item.serves !== hall.coolingClass) {
        return fail(
          `${item.name} serves ${item.serves.toUpperCase()} loads, but ${hall.name} is a ${hall.coolingClass.toUpperCase()} hall.`,
          [
            {
              severity: "error",
              code: "cooling-mismatch",
              message: `${item.name} serves ${item.serves}; hall is ${hall.coolingClass}.`,
              learn: item.id
            }
          ]
        );
      }
      const have = g.inventory[itemId] ?? 0;
      if (have < n) {
        return fail(`Need ${n} × ${item.name} in inventory (have ${have}). Order them first.`, [
          { severity: "error", code: "missing-parts", message: `Need ${n}, have ${have}.`, learn: item.id }
        ]);
      }
      g.inventory[itemId] = have - n;
      if (g.inventory[itemId] <= 0) delete g.inventory[itemId];
      hall.coolingEquip[itemId] = (hall.coolingEquip[itemId] ?? 0) + n;
      hall.coolingKW += n * item.capacityKW;
      hall.pue = computePUE(hall, getItem);
      logln(g, "good", `Installed ${n} × ${item.name} in ${hall.name} (+${usd(n * item.capacityKW)} kW heat rejection).`);
      return ok(`Installed in ${hall.name}.`);
    }),
    placeRack: (hallId, designId) => commit((g) => {
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
              severity: "error",
              code: "cooling-mismatch",
              message: `Rack needs ${design.coolingInterface}; hall offers ${hall.coolingClass}.`,
              learn: design.rackId
            }
          ]
        );
      }
      const need = rackBom(g, designId) ?? {};
      const missing = Object.entries(need).filter(([id, n]) => (g.inventory[id] ?? 0) < n);
      if (missing.length) {
        return fail(
          `Missing parts: ${missing.map(([id, n]) => `${n - (g.inventory[id] ?? 0)} more × ${getItem(id)?.name ?? id}`).join(", ")}.`,
          missing.map(([id, n]) => ({
            severity: "error",
            code: "missing-parts",
            message: `Need ${n} × ${getItem(id)?.name ?? id}, have ${g.inventory[id] ?? 0}.`,
            learn: id
          }))
        );
      }
      const validation = validateRack(design, g.trays, getItem);
      const errors = validation.issues.filter((i) => i.severity === "error");
      if (errors.length) return fail("Rack design has validation errors — fix it in the designer.", errors);
      for (const [id, n] of Object.entries(need)) {
        g.inventory[id] -= n;
        if (g.inventory[id] <= 0) delete g.inventory[id];
      }
      const rack = {
        id: `pr-${g.month}-${hall.racks.length + 1}-${designId}`,
        designId,
        slot: hall.racks.length,
        status: "installing",
        readyMonth: g.month + RACK_READY_LEAD
      };
      hall.racks.push(rack);
      const liveKW = hall.racks.filter((r) => r.status !== "failed").reduce((kw, r) => {
        const d = g.racks.find((x) => x.id === r.designId);
        return kw + (d ? validateRack(d, g.trays, getItem).stats.kW : 0);
      }, 0);
      const warns = [];
      if (liveKW > hall.itPowerKW) {
        warns.push({
          severity: "warn",
          code: "power-overcommit",
          message: `${hall.name} IT load ~${usd(liveKW)} kW exceeds provisioned ${usd(hall.itPowerKW)} kW — racks will throttle or trip.`
        });
      }
      if (liveKW > hall.coolingKW) {
        warns.push({
          severity: "warn",
          code: "cooling-overcommit",
          message: `${hall.name} heat load ~${usd(liveKW)} kW exceeds heat rejection ${usd(hall.coolingKW)} kW — expect thermal failures (3x MTBF stress).`
        });
      }
      logln(
        g,
        "info",
        `Placed ${design.name} in ${hall.name} slot ${rack.slot}; install + commissioning, online ~month ${rack.readyMonth}.`
      );
      return ok(`Rack placed; online ~month ${rack.readyMonth}.`, warns);
    }),
    createCluster: (name, rackIds, fabric) => commit((g) => {
      const ids = [...new Set(rackIds)];
      if (!ids.length) return fail("Pick at least one placed rack.");
      const placed2 = /* @__PURE__ */ new Map();
      for (const hall of g.halls) for (const r of hall.racks) placed2.set(r.id, r);
      const unknown = ids.filter((id) => !placed2.has(id));
      if (unknown.length) return fail(`Unknown placed racks: ${unknown.join(", ")}.`);
      const claimed = ids.filter((id) => placed2.get(id)?.clusterId);
      if (claimed.length) return fail(`Racks already belong to a cluster: ${claimed.join(", ")}.`);
      const cluster = { id: `cl-${g.clusters.length + 1}`, name, rackIds: ids, fabric };
      const stats = evaluateCluster(cluster, {
        getRack: (id) => {
          const pid = placed2.get(id)?.designId ?? id;
          return g.racks.find((r) => r.id === pid);
        },
        getTray: (id) => g.trays.find((t) => t.id === id),
        getItem
      });
      const errors = stats.issues.filter((i) => i.severity === "error");
      if (errors.length) return fail("This fabric does not fit the rack set.", errors);
      cluster.stats = stats;
      g.clusters.push(cluster);
      for (const id of ids) placed2.get(id).clusterId = cluster.id;
      logln(
        g,
        "good",
        `Cluster '${name}': ${stats.accelerators} accelerators, ${stats.powerKW.toFixed(0)} kW, bisection ${stats.bisectionTbps.toFixed(0)} Tb/s.`
      );
      return ok(`Cluster '${name}' created.`);
    }),
    acceptContract: (contractId) => commit((g) => {
      const i = g.availableContracts.findIndex((c) => c.id === contractId);
      if (i < 0) return fail("Offer not found.");
      const contract = g.availableContracts[i];
      if (g.month > contract.deadlineMonth) return fail("This offer already expired.");
      g.availableContracts.splice(i, 1);
      g.activeContracts.push({
        contract,
        clusterIds: [],
        startMonth: g.month,
        monthsServed: 0,
        slaMisses: 0,
        deployBy: g.month + (contract.rampMonths ?? 4)
      });
      logln(
        g,
        "info",
        `Signed ${contract.customer} (${contract.model.name}). You have until month ${g.month + (contract.rampMonths ?? 4)} to bring a qualifying cluster online — no revenue and no SLA clock until then, but miss it and the customer walks (−reputation).`
      );
      return ok(`Contract signed. Deploy capacity and assign a cluster by month ${g.month + (contract.rampMonths ?? 4)}.`);
    }),
    assignContract: (contractId, clusterIds) => commit((g) => {
      const ac = g.activeContracts.find((a) => a.contract.id === contractId);
      if (!ac) return fail("Active contract not found.");
      const ids = [...new Set(clusterIds)];
      const clusters = ids.map((id) => g.clusters.find((c) => c.id === id));
      if (clusters.some((c) => !c)) return fail("Unknown cluster in the list.");
      const contract = ac.contract;
      const issues = [];
      if (contract.kind === "training") {
        let accelerators = 0;
        let maxDomain = 0;
        let maxScaleOut = 0;
        let totalMemGB = 0;
        for (const cl of clusters) {
          const stats = cl.stats;
          if (!stats) continue;
          accelerators += stats.accelerators;
          maxDomain = Math.max(maxDomain, stats.scaleUpDomain);
          maxScaleOut = Math.max(maxScaleOut, stats.effScaleOutGBs);
          totalMemGB += stats.totalMemGB;
        }
        if (accelerators < contract.minAccelerators) {
          issues.push({
            severity: "error",
            code: "too-few-accelerators",
            message: `Needs ${contract.minAccelerators} coherent accelerators; the assigned set has ${accelerators}.`
          });
        }
        if (maxDomain < contract.minScaleUpDomain) {
          issues.push({
            severity: "error",
            code: "domain-too-small",
            message: `Needs scale-up domains of ${contract.minScaleUpDomain} accelerators (${contract.model.name} runs expert/tensor parallel inside one domain); largest is ${maxDomain}.`
          });
        }
        if (maxScaleOut < contract.minScaleOutGBsPerAccel) {
          issues.push({
            severity: "error",
            code: "scale-out-starved",
            message: `Needs ${contract.minScaleOutGBsPerAccel} GB/s effective scale-out per accelerator; fabric delivers ${maxScaleOut.toFixed(1)}. MFU will collapse.`
          });
        }
        if (totalMemGB < contract.minTotalMemGB) {
          issues.push({
            severity: "error",
            code: "memory-too-small",
            message: `Needs ${contract.minTotalMemGB} GB total for training state; the cluster has ${totalMemGB} GB.`
          });
        }
      } else {
        let total = 0;
        let worstTtft = 0;
        for (const cl of clusters) {
          const stats = cl.stats;
          if (!stats) continue;
          const item = getItem(stats.acceleratorId);
          if (!item || item.kind !== "accelerator") {
            issues.push({ severity: "error", code: "no-accelerators", message: `Cluster '${cl.name}' has no accelerators to serve inference.` });
            continue;
          }
          const cap = inferenceCapacity(stats, item, contract.model, { contextTokens: contract.contextTokens, tpotMs: contract.tpotMs });
          for (const i of cap.issues) if (i.severity === "error") issues.push({ ...i, message: `[${cl.name}] ${i.message}` });
          let used = 0;
          for (const o of g.activeContracts) {
            if (o.contract.id === contractId || !o.clusterIds.includes(cl.id)) continue;
            if (o.contract.kind === "training") {
              used = 1;
              break;
            }
            const oct = o.contract;
            if (oct.kind !== "inference") continue;
            const oc = o.clusterIds.map((id) => g.clusters.find((x) => x.id === id)?.stats).filter(Boolean);
            const oCap = oc.reduce((n, st2) => {
              const it2 = getItem(st2.acceleratorId);
              return n + (it2?.kind === "accelerator" ? inferenceCapacity(st2, it2, oct.model, { contextTokens: oct.contextTokens, tpotMs: oct.tpotMs }).tokensPerSec : 0);
            }, 0);
            used += oCap > 0 ? Math.min(1, oct.tokensPerSec / oCap) : 0;
          }
          total += cap.tokensPerSec * Math.max(0, 1 - Math.min(1, used));
          worstTtft = Math.max(worstTtft, cap.ttftMs);
          if (cap.ttftMs > contract.ttftMs) issues.push({ severity: "error", code: "ttft-sla", message: `[${cl.name}] p95 TTFT ${Math.round(cap.ttftMs)} ms exceeds the ${contract.ttftMs} ms SLA.`, learn: item.id });
        }
        if (total < contract.tokensPerSec) issues.push({ severity: "error", code: "tokens-under-capacity", message: `The assigned clusters have ~${usd(total)} tok/s free (after other contracts) of the required ${usd(contract.tokensPerSec)} tok/s at p95 ${contract.tpotMs} ms/TPOT.` });
      }
      if (contract.kind === "training") {
        for (const cl of clusters) if (g.activeContracts.some((o) => o.contract.id !== contractId && o.clusterIds.includes(cl.id))) issues.push({ severity: "error", code: "cluster-busy", message: `Cluster '${cl.name}' is already serving another contract; a training job needs it exclusively.` });
      }
      const errors = issues.filter((i) => i.severity === "error");
      if (errors.length) return fail("The assigned clusters do not meet this contract.", issues);
      ac.clusterIds = ids;
      ac.startMonth = g.month;
      const names = ids.map((id) => g.clusters.find((x) => x.id === id)?.name ?? id).join(" + ");
      logln(g, "good", `${contract.customer} (${contract.model.name}) now served by ${names}.`);
      return ok(`Serving ${contract.customer}.`, issues);
    }),
    signPower: (offerId, mwOverride) => commit((g) => {
      const i = (g.powerOffers ?? []).findIndex((o2) => o2.id === offerId);
      if (i < 0) return fail("Offer not found or expired.");
      const o = g.powerOffers[i];
      const mw = Math.max(1, Math.min(o.mw * 2, Math.round(mwOverride ?? o.mw)));
      g.powerOffers.splice(i, 1);
      (g.powerContracts ??= []).push({ ...o, mw, startMonth: g.month + 1, endMonth: g.month + o.termMonths });
      logln(g, "good", `Signed ${mw} MW ${o.source} PPA with ${o.supplier}: $${o.priceUSDPerMWh}/MWh take-or-pay for ${o.termMonths} mo, overdraw up to +${Math.round(o.overdrawPct * 100)}%. ${POWER_LESSON[o.source]}`);
      return ok(`Signed ${mw} MW with ${o.supplier}; starts next month.`);
    }),
    setSpot: (clusterId, on) => commit((g) => {
      if (!g.clusters.some((c) => c.id === clusterId)) return fail("Unknown cluster.");
      const set2 = new Set(g.spotClusters ?? []);
      if (on) set2.add(clusterId);
      else set2.delete(clusterId);
      g.spotClusters = [...set2];
      return ok(on ? "Cluster offered on the spot market when idle." : "Cluster removed from the spot market.");
    }),
    setSpotRack: (rackId, on) => commit((g) => {
      if (!g.halls.some((h) => h.racks.some((r) => r.id === rackId))) return fail("Unknown rack.");
      const set2 = new Set(g.spotRacks ?? []);
      if (on) set2.add(rackId);
      else set2.delete(rackId);
      g.spotRacks = [...set2];
      return ok(on ? "Rack offered on spot when online." : "Rack withdrawn from spot.");
    }),
    assignRacks: (contractId, rackIds) => assignFromRacks(get(), contractId, rackIds),
    setSpotReserve: (usd2) => commit((g) => {
      g.spotReserve = Math.max(0, usd2);
      return ok(`Reserve price $${Math.max(0, usd2).toFixed(2)}/GPU-hr.`);
    }),
    takeLoan: (amountUSD) => commit((g) => {
      const amt = Math.floor(amountUSD);
      if (!Number.isFinite(amt) || amt <= 0) return fail("Loan amount must be positive.");
      const limit = creditLimit(g);
      if (g.debt + amt > limit) {
        return fail(
          `Credit limit is $${usd(limit)} (fixed line + collateral against installed assets). Borrow less or build more first.`
        );
      }
      g.debt += amt;
      g.cash += amt;
      logln(g, "info", `Drew a $${usd(amt)} loan at 7% APR — interest hits monthly. Principal due on refinancing.`);
      return ok(`$${usd(amt)} borrowed.`);
    }),
    nextMonth: () => {
      set({ game: advanceMonth(get().game) });
      stepAllProjects(get);
    },
    save: () => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(get().game));
      } catch {
      }
    },
    load: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return fail("No save found.");
        const g = JSON.parse(raw);
        if (typeof g.month !== "number" || typeof g.cash !== "number" || !Array.isArray(g.halls) || !Array.isArray(g.clusters)) {
          return fail("Save file corrupted.");
        }
        for (const h of g.halls) for (const [id, n] of Object.entries(h.powerEquip ?? {})) {
          const it2 = getItem(id);
          if (it2?.kind === "power" && (it2.powerType === "pdu" || it2.powerType === "power-shelf")) {
            g.inventory[id] = (g.inventory[id] ?? 0) + n;
            delete h.powerEquip[id];
            if (POWER_FEED_TYPES.includes(it2.powerType)) h.itPowerKW = Math.max(0, h.itPowerKW - n * it2.capacityKW);
          }
        }
        set({ game: g });
        return ok(`Loaded month ${g.month}.`);
      } catch {
        return fail("Save file unreadable.");
      }
    }
  };
});
function newGameState(seed) {
  const hall = {
    id: "hall-1",
    name: "Hall A",
    coolingClass: "air",
    rackSlots: 40,
    itPowerKW: 500,
    coolingKW: 600,
    pue: 1,
    powerEquip: { "et-padmount-2500": 1, "se-galaxy-vs-500": 1 },
    coolingEquip: { "vt-crah-100": 6 },
    racks: [],
    floorLoadKgPerRack: 1500
  };
  hall.pue = computePUE(hall, getItem);
  const g = {
    month: START_MONTH,
    seed,
    cash: 5e7,
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
    uplinks: { "transit-10g-a": 1 },
    codexSeen: [],
    missionsDone: [],
    history: [],
    powerOffers: [],
    powerContracts: [],
    spotClusters: [],
    spotReserve: 0
  };
  g.powerOffers = [...generatePowerOffers(g, mulberry32(seed + 1), 3)];
  g.availableContracts = generateContracts(g, START_MONTH, mulberry32(seed));
  g.log.push({
    month: START_MONTH,
    level: "info",
    text: "GIGAWATT day one: $50M cash, Hall A with 500 kW IT power / 600 kW air cooling over 40 rack slots, utility at $0.07/kWh."
  });
  g.log.push({
    month: START_MONTH,
    level: "info",
    text: "Order parts, design a tray and rack, then place racks — contracts on the market pay once a cluster serves them."
  });
  return g;
}
const placed = (g) => g.halls.flatMap((h) => h.racks);
const MISSIONS = [
  { id: "order", title: "Place your first order", go: "shop", reward: 25e4, hint: "Open Procurement and buy anything.", lesson: "Hardware has LEAD TIMES (and for GPUs, allocation). Order early — parts arrive months later.", done: (g) => g.orders.length > 0 || Object.keys(g.inventory).length > 0 },
  { id: "cool", title: "Expand your cooling plant", go: "facility", reward: 25e4, hint: "Buy another CRAH and install it in Hall A (Facility).", lesson: "Every watt of IT power becomes a watt of heat. Cooling capacity — not floor space — caps most AI halls.", done: (g) => g.halls.some((h) => h.coolingKW > 600) },
  { id: "tray", title: "Design a server tray", go: "design", reward: 3e5, hint: "Pick an 8-GPU chassis and fill every required slot.", lesson: "A tray is a chassis plus parts. PCIe lanes, power and cooling class all constrain what fits.", done: (g) => g.trays.length > 0 },
  { id: "rack", title: "Design a rack", go: "design", reward: 3e5, hint: "Stack trays + a leaf switch into a rack within its kW limit.", lesson: "Rack density is the real limit: 8-GPU H100 trays ≈ 10 kW each — 4 per rack is already 40 kW.", done: (g) => g.racks.length > 0 },
  { id: "place", title: "Place a rack on the floor", go: "stock", reward: 3e5, hint: "Own every part in the Warehouse, then deploy the rack.", lesson: "Racks take months to install and commission. Burn-in finds failed optics and GPUs before customers do.", done: (g) => placed(g).length > 0 },
  { id: "online", title: "Get a rack online", go: "facility", reward: 5e5, hint: "Advance months until commissioning finishes.", lesson: "Commissioning = power-on, firmware, NCCL/RCCL burn-in. Skipping it is how you ship dead GPUs.", done: (g) => placed(g).some((p) => p.status === "online") },
  { id: "cluster", title: "Build a cluster", go: "network", reward: 5e5, hint: "Select online racks and choose a scale-out fabric.", lesson: "A cluster is racks + a network fabric. Oversubscription and rail design decide how well jobs scale.", done: (g) => g.clusters.length > 0 },
  { id: "contract", title: "Land your first contract", go: "contracts", reward: 75e4, hint: "Accept a contract and assign a cluster that meets it.", lesson: "Inference is memory-bandwidth-bound; training is compute- and network-bound. Match hardware to workload.", done: (g) => g.activeContracts.length > 0 },
  { id: "ppa", title: "Sign a power contract", go: "energy", reward: 5e5, hint: "Open Energy and sign a PPA from a power plant.", lesson: "Take-or-pay PPAs are cheaper than spot but you pay even when idle. Firmness and the oversubscription limit decide how safe they are.", done: (g) => (g.powerContracts?.length ?? 0) > 0 },
  { id: "rev", title: "Earn revenue", go: "finance", reward: 1e6, hint: "Advance a month with an active contract.", lesson: "Revenue minus power, staff, support, depreciation and interest = profit. Utilization is everything.", done: (g) => g.history.some((h) => h.revenue > 0) },
  { id: "liquid", title: "Go liquid-cooled", go: "facility", reward: 15e5, hint: "Build a DLC hall with CDUs and place a ≥100 kW rack.", lesson: "Beyond ~40 kW/rack air fails. GB200 NVL72 (~120 kW) needs direct-to-chip liquid cooling and CDUs.", done: (g) => g.halls.some((h) => h.coolingClass === "dlc" && h.racks.length > 0) },
  { id: "xl", title: "Run a 256-accelerator supercomputer", go: "network", reward: 3e6, hint: "Join racks into one cluster of 256+ accelerators.", lesson: "At scale the network IS the computer: bisection bandwidth and failure rates dominate training efficiency.", done: (g) => g.clusters.some((c) => (c.stats?.accelerators ?? 0) >= 256) },
  { id: "nvl", title: "Deploy a 72-GPU NVLink domain", go: "design", reward: 5e6, hint: "Build a GB200 NVL72 rack.", lesson: "NVLink-5 makes 72 GPUs act like one — critical for MoE expert parallelism and huge-model inference.", done: (g) => g.clusters.some((c) => (c.stats?.scaleUpDomain ?? 0) >= 72) }
];
const hallLoad = (g) => g.halls.reduce((n, h) => n + h.racks.reduce((a, p) => {
  const d = g.racks.find((r) => r.id === p.designId);
  return a + (d ? validateRack(d, g.trays, getItem).stats.kW : 0);
}, 0), 0);
const maxRackKW = (g) => Math.max(0, ...g.racks.map((d) => validateRack(d, g.trays, getItem).stats.kW));
const sum = (g, k2) => g.halls.reduce((n, h) => n + h[k2], 0);
const CONCEPTS = [
  {
    id: "power",
    icon: "⚡",
    name: "Transformer / switchgear (power feed)",
    what: "Steps utility voltage down to what the hall uses and sets the maximum IT load (kW) you may draw.",
    why: "Every GPU turns watts into tokens. If racks draw more than the feed, breakers trip or racks throttle.",
    when: "When planned rack load approaches the hall’s “IT power” number.",
    go: "facility",
    status: (g) => {
      const l = hallLoad(g), c = sum(g, "itPowerKW");
      return l > c ? { level: "now", text: `Load ${l.toFixed(0)} kW exceeds feed ${c} kW — buy transformers.` } : l > c * 0.8 ? { level: "soon", text: `Load ${l.toFixed(0)}/${c} kW — you are ≥80% of your feed.` } : { level: "ok", text: `Load ${l.toFixed(0)}/${c} kW — plenty of headroom.` };
    }
  },
  {
    id: "cooling",
    icon: "❄",
    name: "CRAH / air handler (air cooling)",
    what: "Computer-room air handlers push cold air through the floor and pull hot air back, rejecting heat to chilled water.",
    why: "Every watt of IT power becomes a watt of heat. Heat rejection must be ≥ IT load or hardware fails 3× more often.",
    when: "Whenever IT load > installed cooling kW. Air works up to ~20–25 kW per rack.",
    go: "facility",
    status: (g) => {
      const l = hallLoad(g), c = sum(g, "coolingKW");
      return l > c ? { level: "now", text: `Heat ${l.toFixed(0)} kW > cooling ${c} kW — buy CRAH units.` } : l > c * 0.8 ? { level: "soon", text: `Heat ${l.toFixed(0)}/${c} kW — nearly out of cooling.` } : { level: "ok", text: `Cooling ${c} kW covers ${l.toFixed(0)} kW.` };
    }
  },
  {
    id: "chiller",
    icon: "🧊",
    name: "Chiller & cooling tower",
    what: "A chiller makes cold water for CRAHs/CDUs; a tower or dry cooler throws the heat to outside air.",
    why: "Air handlers and CDUs don’t destroy heat, they move it. Past ~1 MW you need a central plant to reject it.",
    when: "Halls beyond ~800 kW of heat, or any liquid-cooled hall.",
    go: "facility",
    status: (g) => {
      const l = hallLoad(g);
      return l > 800 || g.halls.some((h) => h.coolingClass === "dlc") ? { level: "now", text: "Your heat load or liquid halls need central heat rejection." } : l > 500 ? { level: "soon", text: "You will need a chiller plant around 800 kW." } : { level: "na", text: "Not yet — small air halls use packaged CRAHs." };
    }
  },
  {
    id: "liquid",
    icon: "💧",
    name: "Direct-to-chip liquid cooling (CDU)",
    what: "Coolant flows through cold plates on GPUs/CPUs; a coolant distribution unit (CDU) isolates and pumps the loop.",
    why: "Air can’t carry away 40+ kW from one rack. GB200 NVL72 racks (~120 kW) are liquid-only.",
    when: "When any rack design exceeds ~40 kW or uses a liquid-cooled chassis.",
    go: "facility",
    status: (g) => {
      const m = maxRackKW(g);
      return m >= 40 ? { level: g.halls.some((h) => h.coolingClass === "dlc") ? "ok" : "now", text: `Your densest rack is ${m.toFixed(0)} kW — ${g.halls.some((h) => h.coolingClass === "dlc") ? "you have a liquid hall." : "build a DLC hall."}` } : { level: "na", text: `Densest rack ${m.toFixed(0)} kW — air is fine.` };
    }
  },
  {
    id: "rdhx",
    icon: "🚪",
    name: "Rear-door heat exchanger",
    what: "A water coil on the rack’s back door cools exhaust air before it re-enters the room.",
    why: "Stretches air-cooled halls to ~40 kW racks without plumbing the servers.",
    when: "Racks of 20–40 kW in an air hall.",
    go: "facility",
    status: (g) => {
      const m = maxRackKW(g);
      return m > 22 && m < 40 ? { level: "soon", text: `Your densest rack is ${m.toFixed(0)} kW — consider RDHx.` } : { level: "na", text: "Not needed at your rack density." };
    }
  },
  {
    id: "pue",
    icon: "📏",
    name: "PUE (power usage effectiveness)",
    what: "Total facility power ÷ IT power. 1.0 would be perfect; 1.1–1.5 is typical.",
    why: "You pay for the overhead (cooling, conversion losses) on top of IT power every month.",
    when: "Always — lower PUE directly cuts your power bill.",
    status: (g) => {
      const p = g.halls[0]?.pue ?? 1.4;
      return { level: p > 1.4 ? "soon" : "ok", text: `Hall A PUE ${p.toFixed(2)} — ${p > 1.4 ? "efficient cooling would save real money." : "healthy."}` };
    }
  },
  {
    id: "ups",
    icon: "🔋",
    name: "UPS & generator",
    what: "Batteries ride through grid dips; generators take over for long outages.",
    why: "Customers sign SLAs (95–99.5% availability). A grid blip without a UPS restarts every training job.",
    when: "Before you sign enterprise/sovereign contracts (SLA ≥ 98%).",
    go: "facility",
    status: (g) => {
      const worst = g.halls.map(hallResilience).sort((a, b) => a.score - b.score)[0];
      if (!worst) return { level: "na", text: "No hall." };
      const sla = g.activeContracts.some((a) => a.contract.slaAvailability >= 0.995);
      return worst.score >= 0.9 ? { level: "ok", text: `Tier ${worst.tier}: UPS + battery + generator + transfer switch.` } : { level: sla ? "now" : "soon", text: `Tier ${worst.tier} — ${worst.gaps[0] ?? "add redundancy"}.` };
    }
  },
  { id: "psu", icon: "🔌", name: "PSU, N+1 redundancy & rack PDUs", what: "Each server has several power supplies; N+1 means one can fail without taking the server down.", why: "A single PSU failure would otherwise kill a $250k tray. Over-provisioning wastes money, under-provisioning risks outages.", when: "In the Tray bench: size PSUs to the GPU draw, plus one.", go: "design", status: () => ({ level: "na", text: "See the Sizing advisor in the Tray bench." }) },
  { id: "scaleup", icon: "🧵", name: "Scale-up (NVLink) vs scale-out (InfiniBand/Ethernet)", what: "Scale-up links GPUs inside a node/rack at TB/s; scale-out connects nodes at 25–100+ GB/s per GPU.", why: "Model-parallel and MoE traffic needs scale-up; data-parallel gradients cross scale-out. Wrong balance = idle GPUs.", when: "When a training customer asks for a scale-up domain (e.g. 72) or GB/s per GPU.", go: "network", status: () => ({ level: "na", text: "Contracts list these requirements explicitly." }) },
  { id: "oversub", icon: "🔀", name: "Oversubscription", what: "Spine uplinks carrying less than the sum of leaf downlinks (e.g. 2:1).", why: "Cheaper network, but collective operations slow down. Fine for inference, costly for big training.", when: "Design choice on the Supercomputer screen.", go: "network", status: () => ({ level: "na", text: "Pick 1:1 for training, 2–4:1 for inference." }) },
  { id: "hbm", icon: "🧠", name: "HBM capacity & KV cache", what: "GPU memory holds model weights plus the KV cache of every active request.", why: "Inference is memory-bandwidth bound; if weights fill HBM there is no room to batch users.", when: "When choosing GPUs for an inference contract.", status: () => ({ level: "na", text: "“What you need to buy” checks this for you." }) },
  { id: "spot", icon: "📈", name: "Spot vs reserved capacity", what: "Reserved contracts pay a steady rate with SLAs; spot sells idle GPUs at a floating price with no commitment.", why: "Idle GPUs still cost power and depreciation. Spot turns waiting-for-contract time into revenue.", when: "While racks wait for a customer.", go: "energy", status: (g) => {
    const idle = g.halls.flatMap((h) => h.racks).filter((r) => r.status === "online" && !(g.spotRacks ?? []).includes(r.id) && !r.clusterId).length;
    return idle ? { level: "now", text: `${idle} online rack(s) are idle and not on spot.` } : { level: "ok", text: "Nothing idle." };
  } },
  { id: "ppa", icon: "🏭", name: "PPA / take-or-pay power", what: "A long contract to buy fixed MW from a plant at a fixed price, paid whether you use it or not.", why: "Power is your biggest opex line; PPAs hedge price spikes but punish over-commitment.", when: "Once your steady load is predictable.", go: "energy", status: (g) => ({ level: g.powerContracts?.length ?? 0 ? "ok" : "soon", text: g.powerContracts?.length ?? 0 ? "You have PPAs." : "You are fully exposed to spot power prices." }) },
  {
    id: "internet",
    icon: "🌐",
    name: "Internet transit & carrier diversity",
    what: "IP transit and peering circuits connect your hall to customers; each has a monthly bill.",
    why: "Inference streams tokens to users and training ingests datasets; if demand exceeds your uplink every contract slows. One carrier is one fiber cut away from an outage.",
    when: "Before you serve more traffic than your uplink, and before you sign SLA-heavy contracts.",
    go: "facility",
    status: (g) => {
      if (!g.uplinks) return { level: "na", text: "Legacy save: unlimited internet." };
      const have = uplinkGbps(g), need = totalNeedGbps(g);
      return need > have ? { level: "now", text: `Demand ${need.toFixed(1)} Gb/s exceeds ${have.toFixed(0)} Gb/s — buy transit.` } : carrierCount(g) < 2 && g.activeContracts.length ? { level: "soon", text: "Single carrier: add a second one on a diverse path." } : { level: "ok", text: `${have.toFixed(0)} Gb/s, ${carrierCount(g)} carrier(s).` };
    }
  },
  {
    id: "spares",
    icon: "🧰",
    name: "Spare parts & RMA",
    what: "Parts fail at a steady rate. A spare on your shelf swaps in at once; otherwise the vendor RMA takes months.",
    why: "A rack down for 4 months misses SLAs and earns nothing while still depreciating.",
    when: "As soon as racks are deployed; orders include spares by default.",
    go: "stock",
    status: (g) => {
      const ids = /* @__PURE__ */ new Set();
      g.halls.forEach((h) => h.racks.forEach((p) => {
        const d = g.racks.find((r) => r.id === p.designId);
        d?.items.forEach((it2) => {
          if (it2.type === "tray") g.trays.find((t) => t.id === it2.trayId)?.parts.forEach((pt) => ids.add(pt.itemId));
        });
      }));
      const short = [...ids].filter((id) => (g.spareStock?.[id] ?? 0) < recommendedSpares(g, id)).length;
      return !ids.size ? { level: "na", text: "No racks deployed yet." } : short ? { level: "soon", text: `${short} part type(s) below the advised spare count.` } : { level: "ok", text: "Spares shelf is stocked." };
    }
  }
];
function quote(t, racks, month) {
  const lines = [];
  const unavailable = [];
  const capped = [];
  let cost = 0, lead = 1;
  for (const [id, n] of Object.entries(templateBom(t, racks))) {
    const item = getItem(id);
    const o = offerAt(item, month);
    if (!o.available) {
      unavailable.push(item.name);
      continue;
    }
    if (o.qtyCap && n > o.qtyCap) capped.push(`${item.name} (cap ${o.qtyCap}/qtr)`);
    const unit = Math.round(o.unitPrice * (1 - volumeDiscount(item, n, o.unitPrice)) * (1 + t.premium));
    lines.push({ id, name: item.name, n, unit, total: unit * n });
    cost += unit * n;
    lead = Math.max(lead, Math.max(1, Math.round(o.leadMonths * t.leadFactor)));
  }
  lines.sort((a, b) => b.total - a.total);
  return { cost, lead, lines, unavailable, capped };
}
function hallChecks(g, t, racks) {
  const f = templateFacts(t);
  const h = g.halls[0];
  const kw = f.kWPerRack * racks;
  const used = g.halls.flatMap((x) => x.racks).length;
  const cls = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };
  return [
    { ok: kw <= (h?.itPowerKW ?? 0), label: `Power: ${kw.toFixed(0)} kW IT load`, detail: `Hall A has ${h?.itPowerKW ?? 0} kW of IT power. ${kw > (h?.itPowerKW ?? 0) ? "Buy transformers/UPS in the Parts bin and install them in Facility." : "Fits."}` },
    {
      ok: kw <= (h?.coolingKW ?? 0) && (cls[h?.coolingClass ?? "air"] ?? 0) >= (cls[t.rack.cooling] ?? 0),
      label: `Cooling: ${t.rack.cooling.toUpperCase()}, ${kw.toFixed(0)} kW of heat`,
      detail: (cls[h?.coolingClass ?? "air"] ?? 0) < (cls[t.rack.cooling] ?? 0) ? `Hall A is ${h?.coolingClass}-cooled; this needs a ${t.rack.cooling} hall with CDUs. Build a new hall in Facility.` : kw > (h?.coolingKW ?? 0) ? `Only ${h?.coolingKW ?? 0} kW of heat rejection installed - add CRAH/CDU units.` : "Fits."
    },
    { ok: used + racks <= (h?.rackSlots ?? 0), label: `Floor space: ${racks} rack slot${racks > 1 ? "s" : ""}`, detail: `${used}/${h?.rackSlots ?? 0} slots used.` }
  ];
}
const k = (n) => n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : `${Math.round(n)}`;
function pipeline(g) {
  const clustered = new Set(g.clusters.flatMap((c) => c.rackIds));
  let online = 0, installing = 0;
  for (const c of g.clusters) online += c.stats?.accelerators ?? 0;
  const accelsIn = (designId) => {
    const d = g.racks.find((r) => r.id === designId);
    let n = 0;
    for (const i of d?.items ?? []) if (i.type === "tray") {
      for (const p of g.trays.find((t) => t.id === i.trayId)?.parts ?? []) if (getItem(p.itemId)?.kind === "accelerator") n += p.count * i.count;
    }
    return n;
  };
  let freeOnline = 0;
  for (const h of g.halls) for (const p of h.racks) {
    if (clustered.has(p.id)) continue;
    if (p.status === "online") freeOnline += accelsIn(p.designId);
    else installing += accelsIn(p.designId);
  }
  const isAccel2 = (id) => getItem(id)?.kind === "accelerator";
  const warehouse = Object.entries(g.inventory).filter(([id]) => isAccel2(id)).reduce((n, [, q]) => n + q, 0);
  const ordered = g.orders.filter((o) => isAccel2(o.itemId)).reduce((n, o) => n + o.qty, 0);
  return { online, freeOnline, installing, warehouse, ordered };
}
function contractFit(g, c) {
  const all = g.clusters.filter((cl) => cl.stats).map((cl) => {
    const s = cl.stats;
    const checks = [];
    if (c.kind === "training") {
      checks.push({ label: "Accelerators", need: `≥ ${k(c.minAccelerators)}`, have: k(s.accelerators), ok: s.accelerators >= c.minAccelerators });
      checks.push({ label: "Scale-up domain", need: `≥ ${c.minScaleUpDomain}`, have: `${s.scaleUpDomain}`, ok: s.scaleUpDomain >= c.minScaleUpDomain });
      checks.push({ label: "Scale-out / GPU", need: `≥ ${c.minScaleOutGBsPerAccel} GB/s`, have: `${s.effScaleOutGBs.toFixed(1)} GB/s`, ok: s.effScaleOutGBs >= c.minScaleOutGBsPerAccel });
      checks.push({ label: "Total memory", need: `≥ ${k(c.minTotalMemGB / 1e3)} TB`, have: `${k(s.totalMemGB / 1e3)} TB`, ok: s.totalMemGB >= c.minTotalMemGB });
    } else {
      const a = getItem(s.acceleratorId);
      if (a?.kind === "accelerator") {
        const cap = inferenceCapacity(s, a, c.model, { contextTokens: c.contextTokens, tpotMs: c.tpotMs });
        checks.push({ label: "Throughput", need: `${k(c.tokensPerSec)} tok/s`, have: `${k(cap.tokensPerSec)} tok/s`, ok: cap.tokensPerSec >= c.tokensPerSec });
        checks.push({ label: "Model fits", need: `${c.model.paramsB}B weights`, have: cap.fitsWeights ? `fits (TP${cap.tpSize})` : "does not fit", ok: cap.fitsWeights });
        checks.push({ label: "p95 TTFT", need: `≤ ${c.ttftMs} ms`, have: `${Math.round(cap.ttftMs)} ms`, ok: cap.ttftMs <= c.ttftMs });
        checks.cap = cap.tokensPerSec;
      } else checks.push({ label: "Accelerators", need: "any", have: "none", ok: false });
    }
    return { cluster: cl, checks, ok: checks.every((x) => x.ok), score: checks.filter((x) => x.ok).length / checks.length };
  }).sort((a, b) => b.score - a.score);
  const best = all[0];
  const p = pipeline(g);
  const pipelineAccels = p.freeOnline + p.installing + p.warehouse + p.ordered;
  let shortfall = "";
  let verdict = "none";
  if (best?.ok) verdict = "ready";
  else if (c.kind === "training") {
    const have = best?.cluster.stats?.accelerators ?? 0;
    const gap = Math.max(0, c.minAccelerators - have);
    shortfall = gap > 0 ? `Short ${k(gap)} accelerators vs your best cluster (${k(have)}). ` : "";
    const failing = (best?.checks ?? []).filter((x) => !x.ok && x.label !== "Accelerators").map((x) => x.label.toLowerCase());
    if (failing.length) shortfall += `Also fails: ${failing.join(", ")} — needs a different platform/fabric, not just more of the same.`;
    verdict = pipelineAccels + have >= c.minAccelerators && !failing.length ? "building" : "short";
    if (!best) {
      shortfall = `${p.freeOnline > 0 ? `You have ${k(p.freeOnline)} online accelerators not yet in a cluster — group them in Network. ` : ""}You have no cluster yet. Needs ${k(c.minAccelerators)} accelerators in one fabric with a ${c.minScaleUpDomain}-wide scale-up domain.`;
      verdict = pipelineAccels >= c.minAccelerators ? "building" : "short";
    }
  } else {
    const cap = best?.checks?.cap;
    if (cap !== void 0 && cap > 0 && cap < c.tokensPerSec) {
      shortfall = `Your best cluster serves ${k(cap)} tok/s; need ${k(c.tokensPerSec)} → about ${Math.ceil(c.tokensPerSec / cap)}× that capacity.`;
      verdict = pipelineAccels > 0 ? "building" : "short";
    } else if (best) {
      shortfall = "A hard limit fails (weights/TTFT) — more of the same GPU will not help; pick more memory or faster prefill.";
      verdict = "short";
    } else {
      shortfall = "You have no cluster yet.";
      verdict = pipelineAccels > 0 ? "building" : "short";
    }
  }
  const monthsToDeploy = verdict === "ready" ? 0 : p.ordered + p.warehouse + p.installing + p.freeOnline > 0 ? 3 : 7;
  return { best, all, verdict, shortfall, pipelineAccels, monthsToDeploy };
}
const HOURS = 730;
function buildOptions(g, c, signedAt) {
  const year = 2020 + g.month / 12;
  const hall = g.halls[0];
  const cls = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };
  const ramp = c.rampMonths ?? 4;
  const deployBy = signedAt != null ? signedAt : g.month + ramp;
  const out = [];
  for (const t of TEMPLATES) {
    if (t.availableFrom > year || t.eolAfter && year > t.eolAfter || t.tier === "turnkey" && false) continue;
    const f = templateFacts(t);
    if (f.errors.length || f.accels <= 0) continue;
    let racks = 0, why = "";
    let capInfo;
    const accelItem = (() => {
      for (const p of t.tray.parts) {
        const it2 = getItem(p.itemId);
        if (it2?.kind === "accelerator") return it2;
      }
    })();
    if (!accelItem) continue;
    const trayAccels = t.tray.parts.filter((p) => getItem(p.itemId)?.kind === "accelerator").reduce((n, p) => n + p.count, 0) || 1;
    const nicGBs = t.tray.parts.reduce((n, p) => {
      const it2 = getItem(p.itemId);
      return n + (it2?.kind === "nic" ? it2.gbps * p.count : 0);
    }, 0) / 8 / trayAccels;
    if (c.kind === "training") {
      if (f.scaleUp < c.minScaleUpDomain) continue;
      if (nicGBs < c.minScaleOutGBsPerAccel * 0.98) continue;
      racks = Math.max(Math.ceil(c.minAccelerators / f.accels), Math.ceil(c.minTotalMemGB / Math.max(1, f.memGB)));
      why = `${racks * f.accels} accelerators, ${f.scaleUp}-wide NVLink/scale-up domain, ${Math.round(racks * f.memGB / 1e3)} TB memory`;
    } else {
      for (let r = 1; r <= 96; r++) {
        const stats = { accelerators: r * f.accels, acceleratorId: accelItem.id, scaleUpDomain: f.scaleUp };
        const cap = inferenceCapacity(stats, accelItem, c.model, { contextTokens: c.contextTokens, tpotMs: c.tpotMs });
        if (cap.fitsWeights && cap.ttftMs <= c.ttftMs && cap.tokensPerSec >= c.tokensPerSec) {
          capInfo = cap;
          racks = r;
          why = `${Math.round(cap.tokensPerSec).toLocaleString()} tok/s, TTFT ${Math.round(cap.ttftMs)} ms, TP${cap.tpSize} × ${cap.replicas} replicas`;
          break;
        }
        if (!cap.fitsWeights && r >= 8) break;
      }
      if (!racks) continue;
    }
    if (racks > 256) continue;
    const q = quote(t, racks, g.month);
    if (q.unavailable.length || !q.lines.length) continue;
    const kw = f.kWPerRack * racks, accels = racks * f.accels;
    const readyMonth = g.month + q.lead + 2 + 1;
    const hallGaps = [];
    const used = g.halls.flatMap((h) => h.racks).length;
    if (kw > (hall?.itPowerKW ?? 0)) hallGaps.push(`Power: need ${kw.toFixed(0)} kW IT, hall has ${hall?.itPowerKW ?? 0} kW`);
    if ((cls[hall?.coolingClass ?? "air"] ?? 0) < (cls[t.rack.cooling] ?? 0)) hallGaps.push(`Cooling type: needs a ${t.rack.cooling.toUpperCase()} hall — build one in Build`);
    else if (kw > (hall?.coolingKW ?? 0)) hallGaps.push(`Cooling: need ${kw.toFixed(0)} kW heat rejection, hall has ${hall?.coolingKW ?? 0} kW`);
    if (used + racks > (hall?.rackSlots ?? 0)) hallGaps.push(`Space: ${racks} racks but only ${(hall?.rackSlots ?? 0) - used} free slots`);
    const revenueMo = c.kind === "training" ? accels * c.pricePerAccelHour * HOURS : Math.min(c.tokensPerSec, c.tokensPerSec) * HOURS * 3600 / 1e6 * c.pricePerMTok;
    const powerMo = kw * 1.3 * HOURS * g.utilityUSDPerKWh;
    const net = revenueMo - powerMo;
    const cover = c.kind === "training" ? [
      { label: "Accelerators", need: `≥ ${c.minAccelerators}`, have: `${accels}`, ok: accels >= c.minAccelerators },
      { label: "Scale-up domain", need: `≥ ${c.minScaleUpDomain}`, have: `${f.scaleUp}`, ok: f.scaleUp >= c.minScaleUpDomain },
      { label: "Scale-out per GPU", need: `≥ ${c.minScaleOutGBsPerAccel} GB/s`, have: `${nicGBs.toFixed(1)} GB/s (NICs)`, ok: nicGBs >= c.minScaleOutGBsPerAccel * 0.98 },
      { label: "Memory", need: `≥ ${Math.round(c.minTotalMemGB / 1e3)} TB`, have: `${Math.round(racks * f.memGB / 1e3)} TB`, ok: racks * f.memGB >= c.minTotalMemGB }
    ] : [
      { label: "Throughput", need: `${Math.round(c.tokensPerSec).toLocaleString()} tok/s`, have: `${Math.round(capInfo?.tokensPerSec ?? 0).toLocaleString()} tok/s`, ok: (capInfo?.tokensPerSec ?? 0) >= c.tokensPerSec },
      { label: "Model fits", need: `${c.model.paramsB}B`, have: capInfo?.fitsWeights ? `TP${capInfo.tpSize}` : "no", ok: !!capInfo?.fitsWeights },
      { label: "p95 TTFT", need: `≤ ${c.ttftMs} ms`, have: `${Math.round(capInfo?.ttftMs ?? 0)} ms`, ok: (capInfo?.ttftMs ?? 1e9) <= c.ttftMs }
    ];
    const headroom = uplinkGbps(g) - totalNeedGbps(g), needNet = contractNeedGbps(c);
    cover.push({ label: "Internet uplink", need: `${needNet.toFixed(1)} Gb/s`, have: g.uplinks ? `${Number.isFinite(headroom) ? Math.max(0, headroom).toFixed(0) : "∞"} Gb/s free${headroom >= needNet ? "" : " — buy transit (Easy path does)"}` : "unlimited", ok: headroom >= needNet });
    if (c.slaAvailability >= 0.995 && hall) {
      const r = hallResilience(hall);
      cover.push({ label: "Outage protection", need: `${(c.slaAvailability * 100).toFixed(1)}% SLA → tier N or better`, have: `${r.tier}${r.gaps[0] ? " — " + r.gaps[0] : ""}`, ok: r.score >= 0.9 });
    }
    cover.push({ label: "Deploy window", need: `by ${Math.round(deployBy)}`, have: `ready ${readyMonth}`, ok: readyMonth <= deployBy });
    cover.push({ label: "Hall power / cooling / space", need: `${kw.toFixed(0)} kW · ${racks} racks`, have: hallGaps.length ? "needs plant" : "fits", ok: hallGaps.length === 0 });
    out.push({ t, racks, accels, cover, cost: q.cost, lead: q.lead, kw, readyMonth, fitsRamp: readyMonth <= deployBy, slack: deployBy - readyMonth, revenueMo, powerMo, paybackMo: net > 0 ? q.cost / net : Infinity, hallGaps, why, tags: [], unavailable: q.unavailable });
  }
  const feasible = out.filter((o) => o.cost <= Math.max(g.cash * 4, 1));
  const pool = feasible.length ? feasible : out;
  pool.sort((a, b) => a.cost - b.cost);
  const cheapest = pool.find((o) => o.fitsRamp) ?? pool[0];
  const fastest = [...pool].sort((a, b) => a.readyMonth - b.readyMonth || a.cost - b.cost)[0];
  const payback = [...pool].filter((o) => isFinite(o.paybackMo) && o.fitsRamp).sort((a, b) => a.paybackMo - b.paybackMo)[0];
  cheapest && cheapest.tags.push("💰 cheapest");
  fastest && fastest.tags.push("⚡ fastest");
  payback && payback.tags.push("📈 best payback");
  const picked = [...new Set([cheapest, fastest, payback].filter(Boolean))];
  for (const o of pool) {
    if (picked.length >= 4) break;
    if (!picked.includes(o)) picked.push(o);
  }
  return picked;
}
function ledger(g) {
  const rows = /* @__PURE__ */ new Map();
  const row = (id) => {
    let r = rows.get(id);
    if (!r) {
      const it2 = getItem(id);
      r = { id, name: it2?.name ?? id, kind: it2?.kind ?? "?", vendor: it2?.vendor ?? "", warehouse: 0, onOrder: 0, deployed: 0 };
      rows.set(id, r);
    }
    return r;
  };
  for (const [id, n] of Object.entries(g.inventory)) if (n > 0) row(id).warehouse += n;
  for (const [id, n] of Object.entries(g.spareStock ?? {})) if (n > 0) row(id).spares = (row(id).spares ?? 0) + n;
  for (const o of g.orders) {
    const r = row(o.itemId);
    r.onOrder += o.qty;
    r.nextEta = Math.min(r.nextEta ?? 1e9, o.arriveMonth);
  }
  for (const h of g.halls) {
    for (const [id, n] of Object.entries({ ...h.powerEquip, ...h.coolingEquip })) row(id).deployed += n;
    for (const p of h.racks) for (const [id, n] of Object.entries(rackBom(g, p.designId) ?? {})) row(id).deployed += n;
  }
  return [...rows.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
}
function rackReadiness(g, designId, racks = 1) {
  const bom = rackBom(g, designId);
  if (!bom) return void 0;
  const lines = Object.entries(bom).map(([id, per2]) => {
    const need = per2 * racks, have = g.inventory[id] ?? 0;
    const onOrder = g.orders.filter((o2) => o2.itemId === id && !o2.spare).reduce((n, o2) => n + o2.qty, 0);
    const it2 = getItem(id);
    const o = it2 ? offerAt(it2, g.month) : void 0;
    return { id, name: it2?.name ?? id, need, have, short: Math.max(0, need - have), onOrder, buyable: !!o?.available, unitPrice: o?.unitPrice ?? 0, leadMonths: o?.leadMonths ?? 0, reason: o?.reason };
  });
  Object.values(bom);
  const buildableNow = Math.min(...Object.entries(bom).map(([id, n]) => Math.floor((g.inventory[id] ?? 0) / n)));
  const toBuy = lines.filter((l) => l.short - l.onOrder > 0);
  const cost = toBuy.reduce((n, l) => {
    const q = l.short - l.onOrder;
    return n + Math.round(l.unitPrice * q * (1 - (it(l.id) ? volumeDiscount(it(l.id), q, l.unitPrice) : 0)));
  }, 0);
  const blocked = toBuy.filter((l) => !l.buyable);
  const eta = Math.max(0, ...lines.filter((l) => l.short > 0).map((l) => l.onOrder >= l.short ? Math.max(0, (g.orders.filter((o) => o.itemId === l.id).map((o) => o.arriveMonth).sort((a, b) => b - a)[0] ?? g.month) - g.month) : l.leadMonths));
  return { lines, buildableNow, complete: lines.every((l) => l.short === 0), toBuy, blocked, cost, etaMonths: eta };
}
const it = (id) => getItem(id);
const mem = /* @__PURE__ */ new Map();
globalThis.localStorage = { getItem: (k2) => mem.get(k2) ?? null, setItem: (k2, v2) => void mem.set(k2, v2), removeItem: (k2) => void mem.delete(k2) };
const st = () => useGame.getState();
const G = () => st().game;
const ctxOf = (g) => {
  const placed2 = g.halls.flatMap((h) => h.racks);
  return { getRack: (id) => {
    const pid = placed2.find((p) => p.id === id)?.designId ?? id;
    return g.racks.find((r) => r.id === pid);
  }, getTray: (id) => g.trays.find((t) => t.id === id), getItem };
};
const tpl = (id) => TEMPLATES.find((t) => t.id === id);
const Q = {
  validateTray: (tray) => validateTray(tray, getItem),
  validateRack: (rack, trays) => validateRack(rack, trays ?? G().trays, getItem),
  validateHall: (hallId) => {
    const g = G();
    const hall = g.halls.find((h) => h.id === hallId);
    return validateHall(hall, hall.racks.map((p) => ({ design: g.racks.find((r) => r.id === p.designId), trays: g.trays })), getItem);
  },
  hallStats: (hallId) => {
    const g = G();
    const hall = g.halls.find((h) => h.id === hallId);
    const kw = hall.racks.reduce((n, p) => {
      const d = g.racks.find((r) => r.id === p.designId);
      return n + (d ? validateRack(d, g.trays, getItem).stats.kW : 0);
    }, 0);
    return { kw, pue: computePUE(hall, getItem), resilience: hallResilience(hall) };
  },
  rackStatsAll: () => {
    const g = G();
    return Object.fromEntries(g.racks.map((d) => [d.id, validateRack(d, g.trays, getItem).stats]));
  },
  partFitsSlot: (slot, itemId) => partFitsSlot(slot, getItem(itemId)),
  offer: (itemId) => {
    const it2 = getItem(itemId);
    return it2 ? offerAt(it2, G().month) : null;
  },
  offersAll: () => Object.fromEntries(ALL_ITEMS.map((i) => [i.id, offerAt(i, G().month)])),
  volumeDiscount: (itemId, n, unit) => volumeDiscount(getItem(itemId), n, unit),
  quote: (tid, racks) => quote(tpl(tid), racks, G().month),
  hallChecks: (tid, racks) => hallChecks(G(), tpl(tid), racks),
  templateFacts: (tid) => templateFacts(tpl(tid)),
  templatesAll: () => TEMPLATES.map((t) => ({ ...templateFacts(t), id: t.id, racksFor1: 1, quote1: quote(t, 1, G().month) })),
  templateBom: (tid, racks) => templateBom(tpl(tid), racks),
  racksFor: (tid, n) => racksFor(tpl(tid), n),
  rackBom: (designId) => rackBom(G(), designId),
  rackReadiness: (designId, racks) => rackReadiness(G(), designId, racks ?? 1),
  ledger: () => ledger(G()),
  pnl: () => selectMonthlyPnL(G()),
  netWorth: () => selectNetWorth(G()),
  capexBasis: () => selectCapexBasis(G()),
  opex: () => monthlyOpex(G()),
  resilience: (hallId) => hallResilience(G().halls.find((h) => h.id === hallId)),
  internet: () => {
    const g = G();
    return { have: uplinkGbps(g), need: totalNeedGbps(g), carriers: carrierCount(g), mrc: uplinkMonthlyUSD(g) };
  },
  contractNeed: (cid) => {
    const g = G();
    const c = g.availableContracts.find((x) => x.id === cid) ?? g.activeContracts.find((a) => a.contract.id === cid)?.contract;
    return c ? contractNeedGbps(c) : 0;
  },
  evaluateCluster: (cluster) => evaluateCluster(cluster, ctxOf(G())),
  clusterPerf: (cluster, modelId, ctxTokens = 4096) => {
    const g = G();
    const stats = evaluateCluster(cluster, ctxOf(g));
    const accel = getItem(stats.acceleratorId);
    const m = MODELS.find((x) => x.id === modelId);
    return { stats, train: accel ? trainingTokensPerSec(stats, accel, m) : null, infer: accel ? inferenceCapacity(stats, accel, m, { contextTokens: ctxTokens }) : null };
  },
  models: () => {
    const y = 2020 + G().month / 12;
    return { all: MODELS, tier: scaleOutTier(y), anchor: gpuHourAnchor(y) };
  },
  autoFabric: (rackIds, target) => autoFabric(G(), rackIds, target),
  contractFit: (cid) => {
    const g = G();
    const c = g.availableContracts.find((x) => x.id === cid) ?? g.activeContracts.find((a) => a.contract.id === cid)?.contract;
    return c ? contractFit(g, c) : null;
  },
  buildOptions: (cid, signedAt) => {
    const g = G();
    const c = g.availableContracts.find((x) => x.id === cid) ?? g.activeContracts.find((a) => a.contract.id === cid)?.contract;
    return c ? buildOptions(g, c, signedAt ?? void 0) : [];
  },
  pipeline: () => pipeline(G()),
  powerPreview: () => {
    const g = G();
    const o = monthlyOpex(g);
    const drawMW = o.itPowerKW * o.pue / 1e3;
    return { drawMW, opex: o, settle: settlePower(g, drawMW, () => 0.5, () => {
    }), spotAnchor: spotAnchor(g.month), spotPrice: g.spotPrice ?? spotAnchor(g.month), spotUtil: spotUtilization(g.spotPrice ?? spotAnchor(g.month), g.month), hours: HOURS_PER_MONTH };
  },
  spotRevenue: () => {
    const g = G();
    return spotRevenue(g, new Set(g.activeContracts.flatMap((a) => a.clusterIds)), (d) => {
      const rd = g.racks.find((r) => r.id === d);
      return rd ? validateRack(rd, g.trays, getItem).stats.accels : 0;
    });
  },
  powerSources: () => POWER_SOURCES,
  spares: () => {
    const g = G();
    return { shelf: g.spareStock ?? {}, rec: Object.fromEntries(Object.keys(g.inventory).map((id) => [id, recommendedSpares(g, id)])) };
  },
  sparesView: () => {
    const g = G();
    const ids = /* @__PURE__ */ new Set();
    g.halls.forEach((h) => h.racks.forEach((p) => Object.keys(rackParts(g, p.designId)).forEach((id) => partClass(id) && ids.add(id))));
    const failed = g.halls.flatMap((h) => h.racks).filter((p) => p.status === "failed").map((p) => ({ id: p.id, part: p.failedPart ? getItem(p.failedPart)?.name ?? "" : "burn-in failure", readyMonth: p.readyMonth }));
    return { failed, rows: [...ids].map((id) => ({ id, name: getItem(id).name, label: PART_LABEL[partClass(id)], have: (g.spareStock?.[id] ?? 0) + g.orders.filter((o) => o.spare && o.itemId === id).reduce((n, o) => n + o.qty, 0), adv: recommendedSpares(g, id) })) };
  },
  slotOptions: (chassisId, kind) => {
    const ch = getItem(chassisId);
    if (!ch) return [];
    const slot = ch.slots.find((s) => s.kind === kind);
    return ALL_ITEMS.filter((i) => partFitsSlot({ kind, accepts: slot?.accepts }, i)).map((i) => offerAt(i, G().month)).sort((a, b) => Number(b.available) - Number(a.available) || b.item.availableFrom - a.item.availableFrom);
  },
  traySizing: (design) => {
    const g = G();
    const month = g.month;
    const utility = g.utilityUSDPerKWh;
    const ch = getItem(design.chassisId);
    if (!ch) return null;
    const v2 = validateTray(design, getItem);
    const year = 2020 + month / 12;
    const parts = design.parts.map((p) => ({ ...p, it: getItem(p.itemId) })).filter((p) => p.it);
    const n = (k2) => parts.filter((p) => p.it.kind === k2).reduce((a, p) => a + p.count, 0);
    const gpus = v2.stats.accels || 0;
    const draw = v2.stats.watts + ch.overheadW;
    const psus = parts.filter((p) => p.slot === "psu");
    const psuW = psus.reduce((a, p) => a + (p.it.capacityKW ?? 0) * 1e3 * p.count, 0), psuCount = psus.reduce((a, p) => a + p.count, 0);
    const unitW = psuCount ? psuW / psuCount : 0, need = unitW ? Math.ceil(draw / (unitW * 0.9)) : 0;
    const redundantOK = psuCount >= 2 && psuW - unitW >= draw * 0.9;
    const cpu2 = parts.find((p) => p.it.kind === "cpu");
    const cpuItem = cpu2?.it;
    const cpuN = cpu2?.count ?? 0;
    const lanesAvail = Math.min(ch.pcieLanesAvail, (cpuItem?.pcieLanes ?? 0) * cpuN || ch.pcieLanesAvail);
    const dimms = n("memory");
    const channels = (cpuItem?.memChannels ?? 0) * cpuN;
    const nics = parts.filter((p) => p.it.kind === "nic");
    const nicGbps = nics.reduce((a, p) => a + p.it.gbps * p.count, 0);
    const perGpu = gpus ? nicGbps / 8 / gpus : 0, tier = scaleOutTier(year);
    const bestNic = ITEMS_BY_KIND("nic").filter((x) => x.nicClass === "nic" && offerAt(x, month).available).sort((a, b) => b.gbps - a.gbps)[0];
    const nicNeed = bestNic && gpus ? Math.ceil(tier * 8 * gpus / bestNic.gbps) : 0;
    const hbm = v2.stats.memGB, hostRam = parts.filter((p) => p.it.kind === "memory").reduce((a, p) => a + p.it.capacityGB * p.count, 0);
    const capex = v2.stats.costUSD;
    const powerMo = draw / 1e3 * 1.3 * 730 * utility;
    const hours = 5 * 8760;
    const costHr = gpus ? (capex / hours + powerMo * 12 * 5 / hours) / gpus : 0;
    const price = gpuHourAnchor(year);
    const cpuOpt = ITEMS_BY_KIND("cpu").filter((c) => offerAt(c, month).available && c.arch === (cpuItem?.arch ?? "x86")).sort((a, b) => b.availableFrom - a.availableFrom)[0];
    return {
      gpus,
      draw,
      psuW,
      psuCount,
      unitW,
      need,
      redundantOK,
      chassisMaxW: ch.maxPowerW,
      lanesUsed: v2.stats.pcieLanesUsed,
      lanesAvail: lanesAvail || ch.pcieLanesAvail,
      chassisLanes: ch.pcieLanesAvail,
      cpuN,
      cpuLanes: cpuItem?.pcieLanes ?? 0,
      cpuHint: cpuOpt ? { name: cpuOpt.name, lanes: cpuOpt.pcieLanes, channels: cpuOpt.memChannels, tdp: cpuOpt.tdpW, price: cpuOpt.priceUSD } : null,
      dimms,
      channels,
      nicCount: nics.reduce((a, p) => a + p.count, 0),
      nicGbps,
      perGpu,
      tier,
      year,
      bestNic: bestNic ? { name: bestNic.name, gbps: bestNic.gbps, lanes: bestNic.pcieLanes } : null,
      nicNeed,
      hbm,
      hostRam,
      capex,
      powerMo,
      costHr,
      price
    };
  },
  failureRates: (designId) => rackRates(G(), designId),
  rackParts: (designId) => rackParts(G(), designId),
  spareQty: (id, qty) => spareQty(id, qty),
  concepts: () => CONCEPTS.map((c) => ({ id: c.id, icon: c.icon, name: c.name, what: c.what, why: c.why, when: c.when, go: c.go, status: c.status(G()) })),
  missions: () => MISSIONS.map((m) => ({ id: m.id, title: m.title, hint: m.hint, lesson: m.lesson, reward: m.reward, go: m.go, done: m.done(G()) }))
};
const ACTIONS = ["newGame", "setMode", "buy", "buyTemplate", "adoptTemplate", "saveTray", "saveRack", "buildHall", "installPower", "installCooling", "placeRack", "createCluster", "acceptContract", "assignContract", "takeLoan", "nextMonth", "save", "load", "signPower", "buyUplink", "dropUplink", "setSpot", "setSpotReserve", "setSpotRack", "assignRacks", "startEasy", "stepEasy"];
function snapshot() {
  const g = JSON.parse(JSON.stringify(G()));
  g.log = g.log.slice(-150);
  return g;
}
function init() {
  return { items: ALL_ITEMS, vendors: VENDORS, templates: TEMPLATES, models: MODELS, missions: MISSIONS.map((m) => ({ id: m.id, title: m.title, hint: m.hint, lesson: m.lesson, reward: m.reward, go: m.go })), concepts: CONCEPTS.map((c) => ({ id: c.id, icon: c.icon, name: c.name, what: c.what, why: c.why, when: c.when, go: c.go })), actions: ACTIONS };
}
const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }
  const out = (o) => process.stdout.write(JSON.stringify({ id: req.id, ...o }) + "\n");
  try {
    if (req.fn === "init") return out({ ok: true, result: init(), game: snapshot() });
    if (req.fn === "act") {
      if (!ACTIONS.includes(req.name)) return out({ ok: false, error: "unknown action " + req.name });
      const r = st()[req.name](...req.args ?? []);
      return out({ ok: true, result: r ?? null, game: snapshot() });
    }
    if (req.fn === "q") {
      const f = Q[req.name];
      if (!f) return out({ ok: false, error: "unknown query " + req.name });
      return out({ ok: true, result: f(...req.args ?? []) });
    }
    if (req.fn === "claim") {
      const done = [];
      for (const m of MISSIONS) {
        const g = G();
        if (!g.missionsDone.includes(m.id) && m.done(g)) {
          useGame.setState((s) => ({ game: { ...s.game, cash: s.game.cash + m.reward, missionsDone: [...s.game.missionsDone, m.id], log: [...s.game.log, { month: s.game.month, level: "good", text: `★ Mission complete: ${m.title} (+$${Math.round(m.reward).toLocaleString("en-US")}). ${m.lesson}` }] } }));
          done.push({ id: m.id, title: m.title, reward: m.reward });
          break;
        }
      }
      return out({ ok: true, result: done, game: snapshot() });
    }
    if (req.fn === "ping") return out({ ok: true, result: "pong" });
    out({ ok: false, error: "unknown fn" });
  } catch (e) {
    out({ ok: false, error: String(e?.stack ?? e) });
  }
});
