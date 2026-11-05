import { createInterface } from "node:readline";
const mem$2 = /* @__PURE__ */ new Map();
globalThis.localStorage = { getItem: (k2) => mem$2.get(k2) ?? null, setItem: (k2, v2) => void mem$2.set(k2, v2), removeItem: (k2) => void mem$2.delete(k2) };
function createStore(init2) {
  let state2;
  const subs = /* @__PURE__ */ new Set();
  const get = () => state2;
  const set = (patch2) => {
    state2 = { ...state2, ...typeof patch2 === "function" ? patch2(state2) : patch2 };
    subs.forEach((f) => f(state2));
  };
  state2 = init2(set, get);
  return { getState: get, setState: set, subscribe: (fn) => (subs.add(fn), () => subs.delete(fn)) };
}
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
const mk = (pt, id, name, v2, from, price, lead, kw, eff, inst, c, tags = []) => ({ kind: "power", id, name, vendor: v2, availableFrom: from, priceUSD: price, leadTimeMonths: lead, powerType: pt, capacityKW: kw, efficiency: (pt === "genset" || pt === "gas-turbine" || pt === "solar-ppa") && eff < 0.9 ? 0.96 : eff, installMonths: inst, codex: { summary: c[0], explain: c[1], tradeoffs: c[2], tags: ["cat-power", ...tags] } });
const xfmr = (id, name, v2, from, price, lead, kw, eff, c, inst = 2, tags = []) => mk("transformer", id, name, v2, from, price, lead, kw, eff, inst, c, tags);
const swgr = (id, name, v2, from, price, lead, kw, eff, c, inst = 3, tags = []) => mk("switchgear", id, name, v2, from, price, lead, kw, eff, inst, c, tags);
const ups = (id, name, v2, from, price, lead, kw, eff, c, inst = 2, tags = []) => mk("ups", id, name, v2, from, price, lead, kw, eff, inst, c, tags);
const batt = (id, name, v2, from, price, lead, kw, eff, c, inst = 0.5, tags = []) => mk("battery", id, name, v2, from, price, lead, kw, eff, inst, c, tags);
const bus = (id, name, v2, from, price, lead, kw, eff, c, inst = 0.5, tags = []) => mk("busway", id, name, v2, from, price, lead, kw, eff, inst, c, tags);
const pdu = (id, name, v2, from, price, lead, kw, eff, c, inst = 0.1, tags = []) => mk("pdu", id, name, v2, from, price, lead, kw, eff, inst, c, tags);
const shelf = (id, name, v2, from, price, lead, kw, eff, c, inst = 0.1, tags = []) => mk("power-shelf", id, name, v2, from, price, lead, kw, eff, inst, c, tags);
const genset = (id, name, v2, from, price, lead, kw, eff, c, inst = 3, tags = []) => mk("genset", id, name, v2, from, price, lead, kw, eff, inst, c, tags);
const turb = (id, name, v2, from, price, lead, kw, eff, c, inst = 12, tags = []) => mk("gas-turbine", id, name, v2, from, price, lead, kw, eff, inst, c, tags);
const CAT_POWER = [
  // ---- Eaton: dry/oil transformers, xEnergy LV switchgear, 93PM/93PR UPS, xStorage ----
  xfmr("et-dry-1000", "Eaton Ventilated Dry-Type Transformer (1 MVA)", "eaton", 2020, 3e4, 3, 1e3, 0.993, ["Indoor 480 V dry-type transformer feeding a PDU room.", "No oil means no bunding or fire suppression; costs more per kVA than pad-mount iron.", ["Indoor-friendly, near-zero maintenance", "Pricier per kVA than oil-filled"]]),
  xfmr("et-padmount-1000", "Eaton MV Pad-Mount Transformer (1 MVA)", "eaton", 2020, 95e3, 4, 1e3, 0.988, ["Pad-mounted 15-25 kV transformer stepping one utility feed down to 480 V.", "The classic single-hall service transformer; loss ratio ~1.2% burns ~12 kW continuously at full load.", ["Boring, proven, everywhere", "Lead times track the utility interconnect"]]),
  xfmr("et-padmount-15000", "Eaton MV Substation Transformer (15 MVA)", "eaton", 2021, 54e4, 10, 15e3, 0.993, ["15 MVA oil-filled substation transformer serving several halls.", "Consolidating feeds into one big bank cuts interconnects and losses per kVA, but makes it a single fault domain.", ["Lowest loss and cost per kVA", "One unit down is a campus event"]]),
  swgr("et-xenergy-2500", "Eaton Power Xpert xEnergy LV Switchgear (2.5 MW)", "eaton", 2021, 26e4, 4, 2500, 0.996, ["xEnergy low-voltage assembly with Power Xpert metering and arc-flash mitigation.", "Distributes 480 V to UPS and mechanical lineups while metering every feeder for DCIM.", ["Integrated metering and protection relays", "Maintenance requires planned shutdowns per section"]]),
  ups("et-93pm-100", "Eaton 93PM UPS (100 kW)", "eaton", 2020, 26e3, 2, 100, 0.965, ["Compact 93PM double-conversion UPS for small halls and edge sites.", "Tower/frames up to 150 kW can sit beside the racks; internal N+1 modules keep output alive during service.", ["Small footprint, hot-swap modules", "Per-kW cost beats bigger frames only below ~200 kW"]]),
  ups("et-93pm-150", "Eaton 93PM UPS (150 kW)", "eaton", 2020, 33e3, 2, 150, 0.965, ["150 kW 93PM frame, the top of the small-form 93PM range.", "Scales by paralleling frames; eBoost eco-mode passes utility power directly for ~99% efficiency.", ["Parallels for 2N easily", "Eco-mode trades protection for efficiency"]]),
  ups("et-93pm-300", "Eaton 93PM UPS (300 kW)", "eaton", 2020, 58e3, 2.5, 300, 0.965, ["300 kW 93PM in a single 1600 mm frame.", "The workhorse rating for mid-size halls; four frames in parallel with static transfers give 2N on one floor.", ["Dense single-frame 300 kW", "Needs external battery cabinets"]]),
  ups("et-93pm-500", "Eaton 93PM UPS (500 kW)", "eaton", 2020, 88e3, 2.5, 500, 0.966, ["500 kW 93PM power module for scalable frames.", "Frames stack modules to 1.5 MW so capacity tracks the fill curve instead of being overbought day one.", ["Buy capacity in 25 kW increments", "Frame-sharing complicates electrical single-line diagrams"]]),
  ups("et-93pm-750", "Eaton 93PM UPS (750 kW)", "eaton", 2020, 125e3, 3, 750, 0.966, ["750 kW 93PM frame for large halls.", "Parallel-capable with load-sharing controls; efficiency holds ~96.5% double-conversion, ~99% in eBoost.", ["Scales to 3.75 MW in parallel", "Big frames need forklift access and rigging"]]),
  ups("et-93pm-1000", "Eaton 93PM UPS (1000 kW)", "eaton", 2021, 165e3, 3, 1e3, 0.966, ["1 MW 93PM megawatt-class frame.", "One cabinet per megawatt halves the power-room footprint versus 500 kW frames.", ["Megawatt per frame", "Single-frame failure takes a megawatt with it"]]),
  ups("et-93pm-1500", "Eaton 93PM UPS (1500 kW)", "eaton", 2021, 245e3, 3.5, 1500, 0.966, ["1.5 MW 93PM, the top rating of the range.", "Serves colo halls where one frame plus lithium cabinets covers a full IT pod.", ["Fewest frames per megawatt", "Heavy rigging and commissioning"]]),
  ups("et-93pr-250", "Eaton 93PR Modular UPS (250 kW frame)", "eaton", 2022, 98e3, 3, 250, 0.97, ["93PR rack-in-row modular UPS frame starting at 250 kW.", "Power and battery modules slide in as the hall fills, so day-one capex tracks load instead of nameplate.", ["Pay-as-you-grow modularity", "Higher $/kW than monolithic frames at full load"]], 2),
  ups("et-93pr-1000", "Eaton 93PR Modular UPS (1000 kW)", "eaton", 2022, 36e4, 3.5, 1e3, 0.97, ["Fully populated 93PR lineup delivering 1 MW with internal N+1 modules.", "Module-level redundancy means a failed 25 kW module never drops the bus, only margin.", ["Internal N+1 by construction", "Cost premium over fixed-frame UPS"]], 2),
  batt("et-xstorage-500", "Eaton xStorage BESS (500 kW / 1 MWh)", "eaton", 2022, 64e4, 5, 500, 0.93, ["Containerized lithium battery energy storage for ride-through and peak shaving.", "Beyond UPS backup it shaves utility demand peaks and earns grid revenue where markets allow.", ["Dual use: backup plus arbitrage", "Fire-protection engineering adds cost"]], 2),
  // ---- Schneider Electric: Galaxy VS/VX/VL UPS, Okken/Blokset/MasterPact, Canalis, rPDUs ----
  ups("se-galaxy-vs-100", "Schneider Galaxy VS UPS (100 kW)", "schneider", 2020, 42e3, 2, 100, 0.97, ["Modular Galaxy VS frame covering 10-150 kW rooms.", "Swappable modules and built-in network card make it the default small-hall Schneider UPS.", ["Hot-swap power modules", "Efficiency sags below 40% load"]]),
  ups("se-galaxy-vs-150", "Schneider Galaxy VS UPS (150 kW)", "schneider", 2020, 55e3, 2, 150, 0.97, ["Top rating of the compact Galaxy VS range.", "Parallels to four frames for N+1; eco-conversion reaches 99% when the load can tolerate it.", ["Compact for its rating", "Above 150 kW you must jump to VX/VL frames"]]),
  ups("se-galaxy-vx-500", "Schneider Galaxy VX UPS (500 kW)", "schneider", 2020, 16e4, 3, 500, 0.965, ["Galaxy VX 500 kW monolithic double-conversion frame.", "The mid-tier workhorse for colo halls; parallel frames and shared battery strings give N+1.", ["Proven MW-class platform", "Bigger floor loading and rigging than VS"]]),
  ups("se-galaxy-vx-1000", "Schneider Galaxy VX UPS (1000 kW)", "schneider", 2020, 31e4, 3, 1e3, 0.965, ["1 MW Galaxy VX frame.", "Halves frame count versus 500 kW builds; lithium-ready battery management included.", ["Megawatt in one cabinet", "Single-frame blast radius"]]),
  ups("se-galaxy-vx-1500", "Schneider Galaxy VX UPS (1500 kW)", "schneider", 2021, 45e4, 3.5, 1500, 0.965, ["1.5 MW flagship of the VX monolithic range.", "For large halls that want the fewest possible frames per megawatt of critical load.", ["Lowest frame count per MW", "Commissioning and rigging dominate install time"]]),
  ups("se-galaxy-vl-750", "Schneider Galaxy VL Modular UPS (750 kW)", "schneider", 2022, 26e4, 4, 750, 0.975, ["Galaxy VL modular frame at 750 kW with live-swappable 50 kW units.", "2022-generation density packs a megawatt-class room into half the footprint of VX.", ["Top efficiency in the Schneider range", "Module pricing premiums at low fill"]], 2),
  ups("se-galaxy-vl-1500", "Schneider Galaxy VL Modular UPS (1500 kW)", "schneider", 2022, 48e4, 4, 1500, 0.975, ["Fully populated Galaxy VL 1.5 MW lineup.", "Internal N+1 module redundancy plus 99% class eco-mode is the modern hyperscale default.", ["Internal N+1, live module swaps", "Highest capex per frame in the range"]], 2),
  batt("se-galaxy-lion-500", "Schneider Galaxy Li-ion Battery Cabinet (500 kWh)", "schneider", 2022, 21e4, 4, 250, 0.95, ["Lithium-ion battery cabinet matched to Galaxy VS/VX/VL UPS lineups.", "Half the weight and 2-3x the cycle life of VRLA for the same ride-through, with per-string telemetry.", ["Longer life, smaller footprint", "Thermal-runaway suppression adds install scope"]]),
  swgr("se-okken-4000", "Schneider Okken LV Switchboard (4 MW)", "schneider", 2020, 34e4, 4, 4e3, 0.996, ["Okken type-tested low-voltage switchboard lineup.", "Form-4 separation lets one cubicle be serviced live while neighbours keep feeding the hall.", ["Type-tested, form-4 segregated", "Long factory build slots"]]),
  swgr("se-blokset-2500", "Schneider Blokset LV Switchboard (2.5 MW)", "schneider", 2020, 22e4, 4, 2500, 0.996, ["Blokset low-voltage distribution lineup for UPS and mechanical boards.", "The value alternative to Okken with the same breaker ecosystem and remote monitoring.", ["Cheaper than Okken per MW", "Lower fault ratings than the top Okken configs"]]),
  swgr("se-masterpact-4400", "Schneider MasterPact MTZ3 Incoming Lineup (4.4 MVA)", "schneider", 2021, 2e5, 5, 4400, 0.997, ["6300 A MasterPact MTZ3 air circuit breaker front-ending a distribution board.", "The big breaker everything else hangs off; its trip unit is the arc-flash and selective-coordination brain.", ["Full selectivity with downstream breakers", "Breaker failures are site-level events"]]),
  bus("se-canalis-ks-440", "Schneider Canalis KS Busway (630 A, ~440 kW)", "schneider", 2020, 16e3, 1.5, 440, 0.996, ["Overhead KS busway run with tap-off boxes feeding rack rows.", "Adding a rack becomes a tap-off box click instead of a conduit pull back to the PDU.", ["Reconfigurable under load (rated tap-offs)", "Tap boxes cost more per rack than whips"]]),
  bus("se-canalis-kt-1400", "Schneider Canalis KT Busway (2000 A, ~1.4 MW)", "schneider", 2021, 46e3, 2, 1400, 0.996, ["Heavy-duty KT busway serving high-density rows from a central feed.", "Carries a whole row of 20+ kW racks on one 2000 A run with redundant feeds.", ["One run feeds a whole row", "Joint resistance must be torque-audited or losses climb"]], 1),
  pdu("se-rpdu-metered-22", "Schneider Metered rPDU (22 kW 3-phase)", "schneider", 2020, 1400, 1, 22, 0.99, ["Metered three-phase rack PDU for standard 10-20 kW racks.", "Input metering feeds capacity planning; branch protection keeps dense racks code-compliant.", ["Cheap per rack", "No per-outlet switching or billing detail"]], 0.25),
  pdu("se-rpdu-switched-41", "Schneider Switched rPDU (400 V 63 A, ~41 kW)", "schneider", 2022, 3200, 1.5, 41, 0.99, ["Outlet-level switched rPDU for 400 V three-phase dense racks.", "Remote per-outlet cycling and outlet billing tie power to individual servers.", ["Per-outlet control and metering", "Costs 2x a metered strip"]], 0.25),
  // ---- Vertiv: Liebert APM2 / Trinergy Cube UPS, PowerBar busway, Geist rPDUs ----
  ups("vt-apm2-600", "Vertiv Liebert APM2 Modular UPS (600 kW)", "vertiv", 2021, 23e4, 3, 600, 0.975, ["Liebert APM2 frame at 600 kW with 100 kW hot-swap units.", "Module capacity tracks the fill curve and internal redundancy keeps the bus up during service.", ["Live module swaps", "Costs more per kW than monolithic frames at full load"]]),
  ups("vt-apm2-1200", "Vertiv Liebert APM2 Modular UPS (1200 kW)", "vertiv", 2021, 43e4, 3.5, 1200, 0.975, ["Fully populated APM2 at 1.2 MW.", "The densest Vertiv modular frame; two frames side by side give 2N for a colo pod.", ["Internal N+1 by design", "Frame price assumes near-full population"]], 2.5),
  ups("vt-trinergy-1000", "Vertiv Trinergy Cube UPS (1000 kW)", "vertiv", 2020, 35e4, 3, 1e3, 0.974, ["Trinergy Cube monolithic double-conversion UPS at 1 MW.", "Long-standing hyperscale workhorse with 98.5% class eco-mode and lithium-ready controls.", ["Very high eco-mode efficiency", "Fixed capacity per frame"]], 2),
  ups("vt-trinergy-2500", "Vertiv Trinergy Cube UPS (2500 kW)", "vertiv", 2020, 8e5, 3.5, 2500, 0.973, ["2.5 MW Trinergy Cube frame.", "One frame carries a full hall pod, minimizing floor space and parallel complexity.", ["Fewest frames per megawatt", "Single-frame failure drops a whole pod"]], 2.5),
  ups("vt-trinergy-3400", "Vertiv Trinergy Cube UPS (3400 kW)", "vertiv", 2021, 105e4, 4, 3400, 0.972, ["Top-of-range 3.4 MVA Trinergy Cube.", "For megawatt-dense AI halls where UPS footprint is competing with CDUs for floor area.", ["Highest density Vertiv frame", "Rigging and commissioning are major works"]], 2.5),
  bus("vt-powerbar-800", "Vertiv PowerBar 800A Overhead Busway (~575 kW)", "vertiv", 2022, 58e3, 2, 575, 0.995, ["800 A overhead busway run for high-density rack rows.", "Tap-off boxes under live load let rows grow rack by rack without electrical downtime.", ["Live add-on taps", "Torque and IR-scanning discipline required"]], 0.5),
  pdu("vt-geist-hd-63", "Vertiv Geist 2.0 HD rPDU (400 V 63 A, ~43 kW)", "vertiv", 2021, 4200, 1.5, 43, 0.99, ["High-density Geist rack PDU feeding 40 kW-class racks from 400 V three-phase.", "Outlet-level metering ties each server to its power and thermal profile in DCIM.", ["Metering per outlet", "Needs A/B feeds above ~25 kW racks"]], 0.25),
  // ---- ABB: DryFormer/power transformers, MegaFlex/DPA UPS, HiPerGuard MV UPS, UniGear/MNS3 ----
  xfmr("abb-dryformer-2000", "ABB Hitachi DryFormer Dry Transformer (2 MVA)", "abb", 2020, 11e4, 4, 2e3, 0.991, ["Cast-coil 2 MVA dry-type transformer for indoor substations.", "No oil means it can sit inside next to switchgear; the trade is price per kVA and fan kits for overloads.", ["Indoor install, no fire vault", "Pricier per kVA than oil units"]]),
  xfmr("abb-padmount-2500", "Hitachi Energy MV Pad-Mount Transformer (2.5 MVA)", "abb", 2020, 15e4, 5, 2500, 0.99, ["2.5 MVA oil-filled pad-mount unit stepping a 15-25 kV feeder to 480 V.", "The standard block of utility service for one mid-size hall; iron losses run ~1% at load.", ["Proven service transformer", "Interconnect lead time dominates delivery"]]),
  xfmr("abb-powertxfmr-30000", "Hitachi Energy Power Transformer (30 MVA)", "abb", 2021, 12e5, 12, 3e4, 0.9955, ["30 MVA station transformer serving a multi-hall campus.", "Consolidated MV-to-LV conversion at its best efficiency point; the longest-lead item in any build.", ["Best loss per kVA at scale", "Over a year of lead time in tight markets"]], 6),
  ups("abb-megaflex-1100", "ABB MegaFlex UPS (1100 kW)", "abb", 2020, 42e4, 4, 1100, 0.97, ["MegaFlex 1100 kW double-conversion UPS with DPA-derived topology.", "Decentralized parallel architecture lets frames share load without a central master controller.", ["Masterless paralleling", "Efficiency drops off sharply at light load"]]),
  ups("abb-megaflex-1500", "ABB MegaFlex UPS (1500 kW)", "abb", 2020, 56e4, 4, 1500, 0.97, ["1.5 MW MegaFlex frame, the top monolithic ABB rating.", "Serves large halls with minimal frame count; pairs with MegaFlex battery lineups.", ["Megawatt-plus per frame", "Large footprint and rigging"]], 2.5),
  ups("abb-dpa-500", "ABB DPA 500 UPS S4 System (500 kW)", "abb", 2020, 21e4, 3, 500, 0.965, ["Decentralized Parallel Architecture modular UPS at 500 kW.", "25 kW slide-in units give true module-level redundancy without paralleling cabinets.", ["Module-level N+1", "Costs above monolithic at full load"]]),
  ups("abb-hiperguard-3300", "ABB HiPerGuard MV UPS (3.3 MW)", "abb", 2022, 13e5, 6, 3300, 0.98, ["Medium-voltage UPS feeding 11-13.8 kV distribution directly.", "Skipping the MV-to-LV stage for the UPS bus cuts a whole conversion and its losses at hyperscale.", ["~98% efficiency at MV", "Needs MV-rated switching and clearance practices"]], 4),
  swgr("abb-unigear-12000", "Hitachi Energy UniGear ZS1 MV Switchgear (12 MW)", "abb", 2020, 44e4, 6, 12e3, 0.998, ["Metal-clad 12 kV switchgear lineup for campus MV distribution.", "Carries utility feeders to hall transformers with arc-resistant construction and relay protection.", ["Arc-resistant options", "MV work needs certified switching procedures"]]),
  swgr("abb-mns3-3200", "Hitachi Energy MNS3 LV Switchgear (3.2 MW)", "abb", 2021, 24e4, 4, 3200, 0.996, ["MNS3 low-voltage assembly distributing 480 V around the hall.", "Form-separated cubicles with withdrawal-proof breaker technology; the ABB answer to Eaton and Schneider lineups.", ["Type-tested form separation", "Factory build slots set delivery"]], 2.5),
  // ---- Siemens: GEAFOL transformers, SIVACON S8 / 8MV+ switchgear, SENTRON distribution ----
  xfmr("sie-geafol-2500", "Siemens GEAFOL Cast-Resin Transformer (2.5 MVA)", "siemens", 2020, 13e4, 4, 2500, 0.992, ["2.5 MVA cast-resin dry-type transformer for indoor substations.", "Epoxy-cast coils are fire-safe and maintenance-free, letting the substation live inside the hall shell.", ["Fire-safe, no oil containment", "Overload capability needs forced-air kits"]]),
  swgr("sie-sivacon-s8-3200", "Siemens SIVACON S8 LV Switchboard (3.2 MW)", "siemens", 2020, 27e4, 4, 3200, 0.996, ["SIVACON S8 type-tested low-voltage switchboard lineup.", "Feeds UPS and mechanical boards at 480 V with 3VA/3WL breakers and integrated metering.", ["Type-tested to IEC 61439", "Lead times stretch with custom busbar runs"]], 3),
  swgr("sie-sivacon-8mv-12000", "Siemens SIVACON 8MV+ MV Switchgear (12 MW class)", "siemens", 2021, 46e4, 6, 12e3, 0.998, ["SIVACON 8MV+ medium-voltage metal-clad switchgear.", "Distributes 12-24 kV campus feeders to hall transformers with vacuum breakers and SIPROTEC relays.", ["Vacuum interrupters, low maintenance", "MV switching needs certified staff"]]),
  swgr("sie-sentron-2000", "Siemens SENTRON LV Main Distribution (2 MW)", "siemens", 2020, 15e4, 3, 2e3, 0.996, ["SENTRON 3VA breaker-based main distribution board for mid-size halls.", "The value lineup under SIVACON: same breaker ecosystem, lighter construction, faster delivery.", ["Fast lead time", "Lower busbar ratings than full SIVACON"]], 2),
  // ---- Hitachi Energy grid side: DryFormer, power transformers, UniGear/MNS3 ----
  xfmr("he-dryformer-3000", "Hitachi Energy DryFormer Dry Transformer (3 MVA)", "hitachi-energy", 2021, 15e4, 4, 3e3, 0.992, ["3 MVA cast-resin dry transformer for indoor substations.", "Sits beside LV switchgear without fire-rated vaults; the go-to for halls with no outdoor pad space.", ["Indoor, oil-free", "Heavier and pricier than equal oil units"]]),
  xfmr("he-powertxfmr-30000", "Hitachi Energy Power Transformer (30 MVA)", "hitachi-energy", 2021, 115e4, 12, 3e4, 0.9955, ["30 MVA grid-class transformer stepping campus MV to hall LV.", "At this size losses are engineered per project; a 0.45% saving is megawatt-hours every year.", ["Best-in-class loss performance", "Ordering 12-18 months ahead is normal"]], 6),
  xfmr("he-powertxfmr-63000", "Hitachi Energy Power Transformer (63 MVA)", "hitachi-energy", 2022, 21e5, 14, 63e3, 0.996, ["63 MVA substation transformer for hyperscale campuses.", "Consolidates whole-campus conversion into one bank; sparing strategy must accept a long replacement tail.", ["Serves an entire campus", "Single point of failure without a spare"]], 8),
  swgr("he-unigear-12000", "Hitachi Energy UniGear MV Switchgear (12 MW)", "hitachi-energy", 2021, 43e4, 6, 12e3, 0.998, ["UniGear ZS1 medium-voltage lineup for campus feeders.", "Legacy ABB MV platform under Hitachi Energy branding, with relay protection and arc venting.", ["Broad service network", "Custom relay settings add commissioning time"]]),
  // ---- GE Vernova: Prolec GE transformers + aeroderivative/mobile turbines ----
  xfmr("gv-prolec-12500", "Prolec GE Substation Transformer (12.5 MVA)", "ge-vernova", 2020, 48e4, 8, 12500, 0.9935, ["12.5 MVA pad-mount substation transformer from Prolec GE.", "The mid-campus workhorse rating; balanced losses, cost and lead time for two-to-four hall sites.", ["Balanced cost/loss point", "Interconnect utility work drives schedule"]], 4),
  xfmr("gv-powertxfmr-50000", "GE Vernova Power Transformer (50 MVA)", "ge-vernova", 2021, 17e5, 13, 5e4, 0.996, ["50 MVA power transformer for hyperscale campus substations.", "Designed to order around loss-capitalization formulas; the biggest single iron item on site.", ["Campus-scale conversion", "13+ month lead and heavy haul logistics"]], 6),
  turb("gv-lm2500-33000", "GE Vernova LM2500+G4 Aeroderivative (33 MW)", "ge-vernova", 2020, 26e6, 12, 33e3, 0.38, ["33 MW aeroderivative gas turbine derived from a marine/airframe core.", "Fast starts and high part-load efficiency make it the default bridge power unit for grid-constrained campuses.", ["10-minute start to full load", "Capex and gas contract dominate economics"]], 15),
  turb("gv-tm2500-36000", "GE Vernova TM2500 Mobile Turbine (36 MW)", "ge-vernova", 2021, 24e6, 8, 36e3, 0.37, ["Trailer-mounted 36 MW TM2500 mobile power unit.", "The renting-class turbine: hook up gas and HV, and a 36 MW bridge is live in weeks, not years.", ["Deployable in weeks", "Fuel logistics and rental economics at scale"]], 3),
  turb("gv-lm6000-45000", "GE Vernova LM6000 PF+ (45 MW)", "ge-vernova", 2022, 32e6, 12, 45e3, 0.41, ["45 MW LM6000 PF+ sprint-class aeroderivative turbine.", "Highest simple-cycle efficiency of its class (~41%), used for peak support and fast campus expansion.", ["Best simple-cycle efficiency", "Premium maintenance on fired hours"]], 15),
  // ---- Hammond Power Solutions: K-rated dry-type transformers ----
  xfmr("hps-dry-500", "Hammond Dry-Type Transformer (500 kVA)", "hammond", 2020, 22e3, 3, 500, 0.992, ["500 kVA NEMA-rated dry-type with low temperature-rise windings.", "Harmonics-friendly (K-13 class) iron for feeding dense server floors from hall LV boards.", ["Handles harmonics-rich loads", "Costs more than commodity dry-types"]]),
  xfmr("hps-dry-1500", "Hammond Dry-Type Transformer (1.5 MVA)", "hammond", 2020, 52e3, 3, 1500, 0.993, ["1.5 MVA low-loss dry transformer.", "The typical PDU-room transformer isolating hall power from rack power with clean 480-208 V steps.", ["Low 115 C rise windings", "Needs ventilation headroom in the room"]], 1.5),
  xfmr("hps-dry-3000", "Hammond Dry-Type Transformer (3 MVA)", "hammond", 2021, 95e3, 4, 3e3, 0.994, ["3 MVA K-factor-rated dry transformer.", "Covers an entire large hall floor from one frame; specify epsilon shielding for IT harmonics.", ["One frame per floor", "Heavy: crane into the electrical room"]], 2),
  // ---- Eaton Cooper Power Systems: pad-mount and substation transformers ----
  xfmr("coop-padmount-1500", "Cooper Pad-Mount Transformer (1.5 MVA)", "cooper", 2020, 12e4, 5, 1500, 0.989, ["1.5 MVA loop-feed pad-mount distribution transformer.", "Two bushings in, two out: halls daisy-chain these along the campus MV loop.", ["Loop-feed design simplifies MV runs", "Losses near 1.1% at rated load"]]),
  xfmr("coop-padmount-5000", "Cooper Pad-Mount Transformer (5 MVA)", "cooper", 2020, 285e3, 7, 5e3, 0.991, ["5 MVA three-phase pad-mount transformer.", "The single-hall service block for classic 2-4 MW IT loads with mechanical plant on top.", ["One unit per hall", "Utility coordination sets delivery"]], 3.5),
  xfmr("coop-substation-25000", "Cooper Substation Transformer (25 MVA)", "cooper", 2021, 9e5, 11, 25e3, 0.995, ["25 MVA three-phase substation transformer bank.", "Serves several halls from one interconnection; order with the utility application, not after it.", ["Consolidates interconnects", "Replacement lead time is a year-plus"]], 5),
  // ---- Caterpillar: C9..C175-20 diesel, G3500 gas gensets ----
  genset("cat-c9-300", "Cat C9.3 Diesel Genset (300 kW)", "caterpillar", 2020, 21e4, 5, 300, 0.35, ["Smallest Cat standby set in the datacenter range.", "The edge-site standard: quick to crane in, quick to permit, and cheap enough to N+1 small rooms.", ["Fast deployment at low ratings", "Poor fuel burn per kW versus big sets"]], 2.5),
  genset("cat-c13-400", "Cat C13 Diesel Genset (400 kW)", "caterpillar", 2020, 265e3, 5, 400, 0.36, ["C13 in-line six at 400 kW standby.", "Bridges the gap between edge sets and the 3500 V platform for single-hall backup.", ["Simple inline engine", "Rating tops out below MW class"]], 2.5),
  genset("cat-c15-500", "Cat C15 Diesel Genset (500 kW)", "caterpillar", 2020, 32e4, 5, 500, 0.36, ["C15 at the classic half-megawatt standby rating.", "The most common mid-range set; dealer parts are on shelves everywhere.", ["Ubiquitous parts network", "Needs monthly load-bank testing"]], 2.5),
  genset("cat-c18-600", "Cat C18 Diesel Genset (600 kW)", "caterpillar", 2020, 38e4, 5.5, 600, 0.36, ["C18 at 600 kW standby in a compact skid.", "Top of the C-series before jumping to the 3500 platform; two of these cover a small hall with N+1.", ["Compact per kW", "Vibration isolation matters on light slabs"]], 2.5),
  genset("cat-3508-800", "Cat 3508 Diesel Genset (800 kW)", "caterpillar", 2020, 43e4, 6, 800, 0.37, ["3508: entry engine of the 3500 family at 800 kW.", "The 3500 platform is the datacenter standard; 3508 is its small end, keeping spares common across mixed fleets.", ["Common platform with bigger Cat sets", "Radiator and exhaust engineering dominate install"]], 3),
  genset("cat-3512-1500", "Cat 3512 Diesel Genset (1.5 MW)", "caterpillar", 2020, 64e4, 6, 1500, 0.38, ["3512 at 1.5 MW standby.", "Half a 3516 block pair; popular where smaller sets allow staged expansion without megawatt-scale fuel systems.", ["Scales fleets incrementally", "More sets means more engine maintenance"]], 3),
  genset("cat-3516-2000", "Cat 3516B Diesel Genset (2 MW)", "caterpillar", 2020, 79e4, 6, 2e3, 0.38, ["3516B at 2 MW standby, the volume rating of AI-era standby plants.", "Tens of thousands shipped; every contractor and permit office knows the installation pattern.", ["Industry default standby set", "Emissions permits are the real gate"]], 3),
  genset("cat-c17520-3600", "Cat C175-20 Diesel Genset (3.6 MW)", "caterpillar", 2022, 132e4, 8, 3600, 0.39, ["C175-20, the highest-power single high-speed diesel genset Cat sells.", "One engine replaces two 3516-class sets, halving paralleling gear and exhaust stacks per megawatt.", ["Fewest engines per MW", "Long lead time and heavy foundation works"]], 3.5),
  genset("cat-g3512-700", "Cat G3512 Gas Genset (700 kW)", "caterpillar", 2020, 56e4, 7, 700, 0.4, ["G3512 lean-burn natural gas set for continuous duty.", "Runs on pipeline gas without diesel storage or fuel polishers; the classic base for on-site prime power pods.", ["No diesel tanks or polishers", "Pipeline loss is a total outage"]], 3.5),
  genset("cat-g3516-1000", "Cat G3516 Gas Genset (1 MW)", "caterpillar", 2020, 74e4, 7, 1e3, 0.41, ["G3516 lean-burn gas engine at 1 MW continuous.", "Higher efficiency and lower NOx than the G3512; pairs into MW-class prime-power microgrids.", ["Continuous-rated prime power", "Jacket/exhaust heat recovery adds plumbing"]], 3.5),
  genset("cat-g3520h-1400", "Cat G3520H Gas Genset (1.4 MW)", "caterpillar", 2021, 94e4, 8, 1400, 0.42, ["G3520H, the top of the gas 3500 line at 1.4 MW.", 'High-efficiency lean burn with aftertreatment; the engine behind many distributed "always-on" AI power pods.', ["Best gas efficiency in range", "Aftertreatment service adds opex"]], 3.5),
  // ---- Cummins: C-series DQ and QSK standby/prime diesel + QSK60G gas ----
  genset("cum-c500d5-500", "Cummins C500 D5 Diesel Genset (500 kW)", "cummins", 2020, 3e5, 5, 500, 0.35, ["C500 D5 enclosure-ready set at 500 kW standby.", "The small end of the DQ range; popular for edge and mid halls where Cat pricing bites.", ["Competitive list pricing", "Service depth trails Cat in some regions"]], 2.5),
  genset("cum-c1000d6-1000", "Cummins C1000 D6 Diesel Genset (1 MW)", "cummins", 2020, 47e4, 5, 1e3, 0.37, ["C1000 D6 with the QSX15-gDI engine at 1 MW standby.", "A dense single-engine megawatt option that avoids the 3500-class footprint.", ["One engine per MW at small frames", "High BMEP means tighter maintenance windows"]], 2.5),
  genset("cum-c1500d6-1500", "Cummins C1500 D6 Diesel Genset (1.5 MW)", "cummins", 2020, 62e4, 6, 1500, 0.37, ["C1500 D6 on the QSK23 at 1.5 MW standby.", "Cummins builds its own engines, alternators and transfer switches, which simplifies single-vendor service contracts.", ["One throat to choke for service", "QSK parts pricing fluctuates"]], 3),
  genset("cum-c2000d6-2000", "Cummins C2000 D6 Diesel Genset (2 MW)", "cummins", 2021, 76e4, 6, 2e3, 0.38, ["C2000 D6 on the QSK45 at 2 MW standby.", "The direct 3516 alternative for hyperscale standby plants; PowerCommand controls parallel natively.", ["Native paralleling controls", "Big-bore fuel burn at low load"]], 3),
  genset("cum-qsk60-2750", "Cummins QSK60 Diesel Genset (2.75 MW)", "cummins", 2021, 102e4, 7, 2750, 0.39, ["QSK60 16-cylinder at 2.75 MW standby.", "Sits one step under the QSK95, letting plants tune engine count against fuel storage limits.", ["High density per engine", "Heavy fuel-polisher and tank needs"]], 3),
  genset("cum-qsk78-3250", "Cummins QSK78 Diesel Genset (3.25 MW)", "cummins", 2022, 115e4, 8, 3250, 0.39, ["QSK78 at 3.25 MW standby.", "78 L of displacement covering AI hall blocks with fewer running hours per engine.", ["Fewer sets per megawatt block", "Crane and foundation scale with the block"]], 3.5),
  genset("cum-qsk60g-1750", "Cummins QSK60G Gas Genset (1.75 MW)", "cummins", 2021, 88e4, 8, 1750, 0.4, ["QSK60G lean-burn natural gas engine at 1.75 MW.", "Continuous-rated gas prime power for campuses hedging against diesel restrictions.", ["Clean continuous prime power", "Intermittent gas pressure needs planning"]], 3.5),
  // ---- Rolls-Royce MTU: Series 2000/4000 gensets ----
  genset("mtu-12v2000-750", "MTU 12V2000 Diesel Genset (750 kW)", "mtu", 2020, 33e4, 6, 750, 0.37, ["Series 2000 12-cylinder at 750 kW standby.", "Compact and quiet for its class; common in urban sites where floor space is the constraint.", ["Very compact package", "Smaller service footprint than Cat/Cummins"]], 2.5),
  genset("mtu-16v2000-1250", "MTU 16V2000 Diesel Genset (1.25 MW)", "mtu", 2020, 52e4, 6, 1250, 0.37, ["Series 2000 16-cylinder at 1.25 MW standby.", "The density champion of its class; hyperscalers use it where racks-per-megawatt beats engine count.", ["Highest power density in class", "Runs hot: cooling air design is critical"]], 2.5),
  genset("mtu-12v4000-1500", "MTU 12V4000 L62 Diesel Genset (1.5 MW)", "mtu", 2020, 61e4, 7, 1500, 0.38, ["Series 4000 12-cylinder at 1.5 MW.", "Rated for unlimited continuous power with 10-second emergency start variants.", ["Continuous or standby duty", "Premium price versus US brands"]], 3),
  genset("mtu-16v4000-2500", "MTU 16V4000 L64 Diesel Genset (2.5 MW)", "mtu", 2020, 95e4, 7, 2500, 0.38, ["Series 4000 16-cylinder at 2.5 MW standby.", "The 3516-class competitor; many hyperscale sites dual-source Cat and MTU at exactly this rating.", ["Drop-in 3516 alternative", "Dual-brand fleets split spares inventory"]], 3),
  genset("mtu-20v4000-3250", "MTU 20V4000 L64 Diesel Genset (3.25 MW)", "mtu", 2021, 128e4, 8, 3250, 0.38, ["Series 4000 20-cylinder at 3.25 MW standby.", "Packs megawatts per square meter: fewer engines, stacks and silencers for the same block of standby power.", ["Densest standby package", "Loudest of the class: acoustic works add cost"]], 3.5),
  genset("mtu-16v4000g-2500", "MTU 16V4000 G62 Gas Genset (2.5 MW)", "mtu", 2022, 115e4, 8, 2500, 0.42, ["Series 4000 gas engine at 2.5 MW continuous.", "High-efficiency lean burn aimed at datacenter prime power and cogeneration pods.", ["Continuous gas prime power", "Jacket-water heat recovery plumbing"]], 3.5),
  // ---- Kohler / Rehlko: KD series ----
  genset("kh-kd750-750", "Kohler KD750 Diesel Genset (750 kW)", "kohler", 2020, 36e4, 5, 750, 0.37, ["KD750 in the KD heavy-duty range.", "Kohler has been consolidating under the Rehlko brand since 2024; same product line, new badge.", ["Aggressive pricing", "Fewer hyperscale references than Cat"]], 2.5),
  genset("kh-kd1250-1250", "Kohler KD1250 Diesel Genset (1.25 MW)", "kohler", 2020, 54e4, 5, 1250, 0.37, ["KD1250 mid-range standby set.", "DEC-style controllers parallel cleanly; a solid value pick for regional colos.", ["Value per kW", "Resale market thinner than Cat/Cummins"]], 2.5),
  genset("kh-kd1850-1850", "Kohler KD1850 Diesel Genset (1.85 MW)", "kohler", 2020, 72e4, 6, 1850, 0.38, ["KD1850 on the 60 Hz big-block platform.", "Fills the gap between KD1250 and KD2250 for staged hall builds.", ["Fine-grained rating steps", "Some ratings are region-specific"]], 3),
  genset("kh-kd2250-2250", "Kohler KD2250 Diesel Genset (2.25 MW)", "kohler", 2020, 84e4, 6, 2250, 0.38, ["KD2250: Kohler workhorse at the 2 MW+ class.", "Direct competition for the 3516 and 16V4000 with shorter lead times in many quarters.", ["Often faster delivery", "Load-test infrastructure still needed"]], 3),
  genset("kh-kd3000-3000", "Kohler KD3000 Diesel Genset (3 MW)", "kohler", 2021, 106e4, 7, 3e3, 0.39, ["KD3000 large-frame standby set.", "Brings single-engine 3 MW to Kohler fleets chasing megawatt-dense AI halls.", ["Single-engine 3 MW", "Big-block parts logistics"]], 3.5),
  genset("kh-kd4000-4000", "Kohler KD4000 Diesel Genset (4 MW)", "kohler", 2022, 138e4, 8, 4e3, 0.39, ["KD4000, the most powerful genset Kohler/Rehlko builds.", "One engine covers an entire AI hall block; testing needs full-load banks on site.", ["Top rating in the KD line", "Massive air and fuel systems on site"]], 3.5),
  // ---- Generac Industrial: SD diesel + SG gaseous ----
  genset("gna-sd350-350", "Generac SD350 Diesel Genset (350 kW)", "generac", 2020, 23e4, 4, 350, 0.35, ["SD350 in Generac industrial diesel line.", "Value-tier standby for edge sites; single-source controls keep it simple to operate.", ["Sharp price point", "Thin large-datacenter track record"]], 2),
  genset("gna-sd800-800", "Generac SD800 Diesel Genset (800 kW)", "generac", 2020, 41e4, 4, 800, 0.36, ["SD800 standby set.", "Generac undercuts the big three on price and often delivery for mid ratings.", ["Faster delivery than the big three", "Verify local service depth first"]], 2.5),
  genset("gna-sd1500-1500", "Generac SD1500 Diesel Genset (1.5 MW)", "generac", 2020, 64e4, 5, 1500, 0.37, ["SD1500 on the big inline platform.", "A credible second-source genset for budget-sensitive hall builds.", ["Price per MW advantage", "Fewer hyperscale references"]], 2.5),
  genset("gna-sd2000-2000", "Generac SD2000 Diesel Genset (2 MW)", "generac", 2021, 8e5, 6, 2e3, 0.38, ["SD2000 standby genset.", "Enters the 3516 weight class at a discount; paralleling gear is Generac-standard.", ["2 MW at value pricing", "Mixed-brand fleets complicate spares"]], 3),
  genset("gna-sd3000-3000", "Generac SD3000 Diesel Genset (3 MW)", "generac", 2022, 112e4, 7, 3e3, 0.38, ["Top rating of the Generac industrial diesel range.", "Single-engine 3 MW for value-driven large builds; availability varies by region.", ["Single-engine 3 MW value", "Regional availability varies"]], 3, ["unverified"]),
  genset("gna-sg600-600", "Generac SG600 Gaseous Genset (600 kW)", "generac", 2020, 43e4, 5, 600, 0.38, ["SG600 natural-gas standby/prime set.", "Gas option where diesel storage is restricted; ties to pipeline reliability.", ["No on-site diesel storage", "Gas pressure dependent"]], 3),
  // ---- Wärtsilä: medium-speed gas engines for continuous prime power ----
  genset("war-31sg-3300", "Wärtsilä 31SG Gas Engine (3.3 MW)", "wartsila", 2021, 19e5, 9, 3300, 0.43, ["31SG medium-speed gas engine, rated for continuous baseload.", "Guinness-certified most-efficient 4-stroke: for AI campuses buying their own gas-fired generation.", ["Highest engine efficiency in class", "Slow start: not an emergency standby set"]], 6),
  genset("war-34sg-4700", "Wärtsilä 34SG Gas Engine (4.7 MW)", "wartsila", 2021, 26e5, 10, 4700, 0.44, ["34SG at 4.7 MW continuous.", "The workhorse of gas-fueled datacenter microgrids in the Nordics and US gas basins.", ["Utility-class durability", "Heavy civil works and gas interconnect"]], 6),
  genset("war-50sg-9300", "Wärtsilä 50SG Gas Engine (9.3 MW)", "wartsila", 2022, 49e5, 12, 9300, 0.45, ["50SG at 9.3 MW continuous.", "Utility-scale blocks behind the meter: campuses pairing engines with turbines and BESS for islanded operation.", ["Engine-plant economics", "Multi-year gas supply contracting"]], 9),
  // ---- Solar Turbines (Caterpillar): Centaur/Mercury/Taurus/Titan gas turbines ----
  turb("sol-centaur50-4600", "Solar Centaur 50 Gas Turbine (4.6 MW)", "solar-turbines", 2020, 95e5, 9, 4600, 0.29, ["Centaur 50 industrial gas turbine set.", "Compact continuous power for campuses with firm gas; simple-cycle efficiency is modest but reliability is excellent.", ["Very high availability", "Low simple-cycle efficiency without HRSG"]], 9),
  turb("sol-mercury50-4600", "Solar Mercury 50 Recuperated Turbine (4.6 MW)", "solar-turbines", 2021, 11e6, 10, 4600, 0.385, ["Mercury 50 with a recuperator recovering exhaust heat.", "Roughly a third more efficient than plain Centaur by preheating combustion air; ultra-low NOx signature.", ["Best small-turbine efficiency", "Recuperator adds maintenance cost"]], 9),
  turb("sol-taurus70-7500", "Solar Taurus 70 Gas Turbine (7.5 MW)", "solar-turbines", 2020, 13e6, 9, 7500, 0.32, ["Taurus 70 package for campus power islands.", "Solective drive and dual-fuel options; the common first turbine when a hall outgrows engine sets.", ["Package-level delivery", "Efficiency depends on HRSG economics"]], 10),
  turb("sol-titan130-15000", "Solar Titan 130 Gas Turbine (15 MW)", "solar-turbines", 2020, 23e6, 10, 15e3, 0.35, ["Titan 130 at 15 MW continuous.", "Mid-campus turbine class feeding 13.8 kV switchyards directly.", ["Direct MV connection", "Gas contract and water needs grow with size"]], 14),
  turb("sol-titan250-22000", "Solar Titan 250 Gas Turbine (22 MW)", "solar-turbines", 2021, 31e6, 12, 22e3, 0.38, ["Titan 250 at 22 MW, the top of Solar industrial line.", "Serves entire AI blocks; exhaust heat drives absorption chillers or steam in CHP mode.", ["CHP synergy with cooling", "Long-lead big-ticket item"]], 16),
  // ---- Siemens Energy: SGT industrial and heavy-frame turbines ----
  turb("sen-sgt300-11000", "Siemens Energy SGT-300 (11 MW)", "siemens-energy", 2020, 19e6, 12, 11e3, 0.32, ["SGT-300 industrial gas turbine set at 11 MW.", "Proven mid-frame for datacenter power islands where grid queues stretch past two years.", ["Compact for its class", "OEM long-term service agreements are costly"]], 14),
  turb("sen-sgt700-31000", "Siemens Energy SGT-700 (31 MW)", "siemens-energy", 2021, 42e6, 14, 31e3, 0.36, ["SGT-700 at 31 MW continuous.", "Campus-scale generation; used in Irish and Nordic datacenter power-park builds.", ["High availability record", "Multi-year construction window"]], 16),
  turb("sen-sgt800-50000", "Siemens Energy SGT-800 (50 MW)", "siemens-energy", 2021, 62e6, 16, 5e4, 0.385, ["SGT-800 at 50 MW, the popular mid-frame for captive campuses.", "Combined with HRSG and steam turbines it exceeds 55% in combined-cycle mode.", ["CC upgrade path", "Capex and interconnect dominate the plan"]], 18),
  turb("sen-sgt5-2000e-168000", "Siemens Energy SGT5-2000E Heavy Frame (168 MW)", "siemens-energy", 2022, 14e7, 24, 168e3, 0.345, ["SGT5-2000E heavy-duty frame for utility-style captive plants.", "The behind-the-meter answer for gigawatt campuses: one turbine block serves dozens of halls.", ["Gigawatt-class blocks", "E-class efficiency: viability rides on cheap gas"]], 30),
  // ---- Bloom Energy: SOFC fuel cells for always-on prime power ----
  genset("bl-es1-100", "Bloom Energy Server ES1 (100 kW SOFC)", "bloom", 2020, 43e4, 4, 100, 0.55, ["Early-generation 100 kW solid-oxide fuel cell server.", "Electrochemical conversion at ~55% electrical efficiency, no combustion and nearly silent.", ["High electrical efficiency", "Per-kW cost stays high at small ratings"]], 1),
  genset("bl-es5-200", "Bloom Energy Server ES5 (200 kW SOFC)", "bloom", 2024, 8e5, 5, 200, 0.57, ["Current-generation ES5 fuel cell at 200 kW.", "Field-swappable stacks and higher power density; deployed in MW blocks beside the substations of AI campuses.", ["Grid-queue bypass at MW scale", "Hydrogen/natural gas blend contracts needed"]], 1),
  // ---- Delta: Modulon modular UPS for mid-size halls ----
  ups("dl-modulon-120", "Delta Modulon DPH Modular UPS (120 kW)", "delta", 2020, 46e3, 3, 120, 0.96, ["Modulon DPH frame at 120 kW with 20 kW modules.", "Value-tier modular UPS popular in Asian-built facilities; rides the same 96% double-conversion class.", ["Module economies at small ratings", "Service network thinner in EMEA/Americas"]], 1),
  // ---- Legrand (Starline): track busway ----
  bus("lgr-starline-60a", "Legrand Starline Track Busway (60 A, ~43 kW)", "legrand", 2020, 9e3, 1.5, 43, 0.996, ["60 A overhead track busway for light rack rows.", "Tap-offs plug in anywhere along the run, so rack moves are an hour of work, not an electrician project.", ["Tool-free tap placement", "Light ratings only: 60 A tops out ~43 kW"]], 0.25),
  bus("lgr-starline-225a", "Legrand Starline Track Busway (225 A, ~160 kW)", "legrand", 2020, 19e3, 1.5, 160, 0.996, ["225 A Starline run for conventional colo rows.", "The default colo busway rating; pairs A/B runs for redundancy above ~80 kW per row.", ["Redundant A/B pattern standard", "Tap contact resistance needs inspection cycles"]], 0.25),
  bus("lgr-starline-800a", "Legrand Starline Track Busway (800 A, ~575 kW)", "legrand", 2021, 48e3, 2, 575, 0.996, ["800 A Starline for high-density rows.", "Carries liquid-cooled rack rows on a single overhead pair without cable trays.", ["High density on one run", "Feeder and drop engineering at every joint"]], 0.5),
  // ---- Raritan (Legrand): PX3 rack PDUs ----
  pdu("rar-px3-17", "Raritan PX3 Switched rPDU (17 kW)", "raritan", 2020, 3200, 1.5, 17, 0.99, ["PX3 switched rack PDU at 208 V three-phase.", "Per-outlet switching, metering and environmental sensors; the de facto enterprise colo standard.", ["Outlet-level remote control", "Premium over metered-only strips"]], 0.25),
  pdu("rar-px3-43", "Raritan PX3 HD rPDU (400 V 63 A, ~41 kW)", "raritan", 2021, 4600, 1.5, 41, 0.99, ["PX3 high-density unit for 400 V three-phase dense racks.", "Feeds 40 kW-class air-cooled AI racks with branch-circuit protection intact.", ["HD rating without busbar mods", "A/B pairs mandatory above 25 kW"]], 0.25),
  // ---- ServerTech (Legrand): PRO2/Sentinel switched CDUs ----
  pdu("svt-pro2-17", "ServerTech PRO2 Switched CDU (17 kW)", "servertech", 2020, 2800, 1.5, 17, 0.99, ["PRO2 switched CDU at 208 V three-phase.", "Outlet-grade metering with PIPP pawn telemetry into DCIM systems.", ["Mature enterprise telemetry", "Rating caps at classic rack densities"]], 0.25),
  pdu("svt-sentinel-41", "ServerTech Sentinel Switched CDU (400 V, ~41 kW)", "servertech", 2022, 4200, 2, 41, 0.99, ["Sentinel-class switched CDU for 400 V high-density feeds.", "Carries dense compute racks with per-inlet and per-outlet visibility.", ["HD feeds with full telemetry", "Costs cluster at the top of the PDU range"]], 0.25),
  // ---- Rittal: RiLine busbar trunking ----
  bus("rt-riline-400", "Rittal RiLine60 Busbar (400 A, ~277 kW)", "rittal", 2020, 16e3, 2, 277, 0.996, ["RiLine60 in-enclosure busbar system at 400 A.", "Distributes hall LV power along rack rows inside the white space with tap-off units per rack group.", ["Compact in-row distribution", "Ratings below overhead-class busway"]], 0.5),
  bus("rt-riline-1600", "Rittal RiLine60 Busbar (1600 A, ~1.1 MW)", "rittal", 2021, 52e3, 2.5, 1100, 0.996, ["Top-rating RiLine run for whole-row feeds.", "Serves dense rows from a single bus with fused tap-offs; verify torque and IR at commissioning.", ["Row-scale single feed", "Ratings beyond ~800 A need derating checks"]], 1, ["unverified"]),
  // ---- Flex: ORv3 power shelves ----
  shelf("flex-orv3-33", "Flex ORv3 Power Shelf (33 kW, 48 VDC)", "flex", 2023, 4400, 2.5, 33, 0.975, ["Open Rack v3 power shelf with six 5.5 kW CRPS rectifiers.", "The second-source ORv3 shelf beside Delta: hot-swap modules feed 48 V busbars in OCP-standard AI racks.", ["OCP-standard second source", "48 V currents demand fat busbars"]], 0.1),
  // ---- Battery cabinets: Samsung SDI, LG Energy Solution, Saft, ZincFive ----
  batt("sdi-li-250", "Samsung SDI Li-ion UPS Battery Cabinet (250 kW / 15 min)", "samsung-sdi", 2022, 15e4, 4, 250, 0.95, ["Rack-scale NMC lithium cabinet sized for UPS ride-through.", "A quarter of the floor space and far longer cycle life than the VRLA strings it replaces, with per-rack BMS telemetry.", ["Long calendar and cycle life", "NMC chemistry needs stricter fire engineering"]]),
  batt("lge-li-250", "LG Energy Solution ESS Cabinet (250 kW ride-through)", "lg-energy", 2022, 14e4, 4, 250, 0.95, ["LG ESS battery cabinet paired to major UPS platforms.", "LFP-based racks with cabinet-level thermal management; a drop-in modernization of lead-acid rooms.", ["LFP thermal stability", "Integration kits are UPS-brand specific"]]),
  batt("saft-intensium-1000", "Saft Intensium Max BESS Container (1 MW / 2 MWh)", "saft", 2021, 72e4, 6, 1e3, 0.93, ["Containerized 2 MWh lithium battery system from Saft.", "Goes beyond ride-through into peak shaving and grid services for campuses with demand charges.", ["Multi-hour storage envelope", "Container fire systems and spacing rules"]], 1.5),
  batt("zf-bc2-150", "ZincFive BC2 Ni-Zn Battery Cabinet (150 kW)", "zincfive", 2021, 18e4, 4, 150, 0.9, ["Nickel-zinc UPS battery cabinet.", "Chemistry that neither burns like lithium nor leadds like VRLA: no thermal runaway, wide temperature tolerance.", ["Non-flammable chemistry", "Fewer cells per kWh than lithium"]])
];
const v$5 = (id, name, sells, summary) => ({
  id,
  name,
  sells,
  reliability: 0.93,
  support: 0.9,
  volumeDiscountPerDoublingPct: 3,
  codex: { summary, explain: `${name} supplies datacenter infrastructure. Compare lead time, service coverage and spares logistics, not just price.`, tradeoffs: ["Strong service network", "Price varies by quarter"], tags: ["cat-power"] }
});
const CAT_POWER_VENDORS = [
  v$5("eaton", "Eaton", ["power"], "Power management giant: transformers, switchgear, 93PM/93PR UPS and xStorage BESS."),
  v$5("schneider", "Schneider Electric", ["power"], "Galaxy UPS families, Okken/Blokset switchboards, Canalis busway and rack PDUs."),
  v$5("vertiv", "Vertiv", ["power"], "Liebert UPS platforms, busway and Geist rack PDUs for mission-critical halls."),
  v$5("delta", "Delta Electronics", ["power"], "Modular UPS and ORv3 power infrastructure from the ODM powering hyperscale racks."),
  v$5("hitachi-energy", "Hitachi Energy", ["power"], "Grid-grade power and dry transformers plus MV switchgear."),
  v$5("ge-vernova", "GE Vernova", ["power"], "Large transformers and aeroderivative/mobile gas turbines for bridge and islanded power."),
  v$5("hammond", "Hammond Power Solutions", ["power"], "Specialist dry-type and K-rated transformers for IT loads."),
  v$5("cooper", "Eaton Cooper Power Systems", ["power"], "Pad-mount and substation distribution transformers."),
  v$5("generac", "Generac", ["power"], "Value-tier industrial diesel and gaseous gensets."),
  v$5("wartsila", "Wärtsilä", ["power"], "Medium-speed gas engines for continuous prime-power microgrids."),
  v$5("solar-turbines", "Solar Turbines (Cat)", ["power"], "Industrial gas turbine packages from 1-22 MW for campus power islands."),
  v$5("siemens-energy", "Siemens Energy", ["power"], "Industrial and heavy-frame gas turbines for captive and islanded generation."),
  v$5("legrand", "Legrand (Starline)", ["power"], "Track busway and rack power distribution systems."),
  v$5("raritan", "Raritan (Legrand)", ["power"], "PX-series intelligent rack PDUs."),
  v$5("servertech", "ServerTech (Legrand)", ["power"], "Switched and metered rack CDUs."),
  v$5("rittal", "Rittal", ["power"], "Busbar power distribution and enclosure-integrated power systems."),
  v$5("flex", "Flex", ["power"], "ORv3 power shelves and OCP-standard power building blocks."),
  v$5("samsung-sdi", "Samsung SDI", ["power"], "Lithium UPS battery cabinets and ESS cells."),
  v$5("lg-energy", "LG Energy Solution", ["power"], "LFP ESS cabinets for UPS ride-through and peak shaving."),
  v$5("saft", "Saft", ["power"], "Industrial lithium battery systems for ride-through and BESS duty."),
  v$5("zincfive", "ZincFive", ["power"], "Nickel-zinc battery cabinets: non-flammable UPS energy storage.")
];
const cdx$4 = ([summary, explain, tradeoffs, tags]) => ({ summary, explain, tradeoffs, tags });
const base$4 = (id, name, v2, from, price, lead, c) => ({ id, name, vendor: v2, availableFrom: from, priceUSD: price, leadTimeMonths: lead, codex: cdx$4(c) });
const st$4 = (tier, ru, lead = 3) => (id, name, v2, price, pb, r, w, watts, c, from = 2020, l = lead) => ({ kind: "storage", ...base$4(id, name, v2, from, price, l, c), tier, capacityPB: pb, readGBs: r, writeGBs: w, rackUnits: ru, watts });
const hot = st$4("hot-nvme", 2);
const warm = st$4("warm", 4);
const obj = st$4("object", 4);
const RAW_STORAGE = [
  // ---- DDN EXAScaler / SFA (Lustre + storage fabric) ----
  hot("ddn-ai200x2", "DDN EXAScaler AI200X2 (2U NVMe Lustre)", "ddn", 175e3, 0.3, 65, 25, 1500, ["2U EXAScaler Lustre appliance, the compact A3I-class step.", "AI200X2 pairs Lustre parallel filesystem with NVMe in 2U for teams starting AI clusters; add units to scale bandwidth linearly.", ["Entry A3I economics", "Bandwidth scales only per unit"]], 2022.5),
  hot("ddn-ai400x3", "DDN EXAScaler AI400X3 (2U NVMe Lustre)", "ddn", 295e3, 0.37, 130, 90, 1600, ["Third-gen AI400: Gen5 NVMe and faster controllers in the same 2U.", "The AI400X3 raises per-appliance bandwidth so fewer units cover a given checkpoint burst, cutting rack space versus scaling AI400X2s.", ["More GB/s per U than AI400X2", "Premium per PB"]], 2024.3),
  hot("ddn-ai7990x", "DDN AI7990X (3U 24-bay NVMe)", "ddn", 42e4, 0.72, 110, 70, 2e3, ["3U high-density NVMe appliance for the SFA7990X storage fabric line.", "The 7990X doubles bay count per rack unit versus 2U appliances; used as bandwidth tier of large EXAScaler/SFA installations.", ["Density: 24 NVMe in 3U", "Needs fabric/software layer around it"]], 2023.5),
  hot("ddn-sfa100nvx2", "DDN SFA100NVX2 (1U NVMe fabric)", "ddn", 235e3, 0.31, 70, 45, 1100, ["1U single-controller NVMe appliance from DDN's SFA fabric family.", "SFA100NVX2 is the smallest fabric appliance: slot one per rack row as a dedicated checkpoint target without sacrificing a 2U footprint.", ["Smallest DDN appliance", "Single-controller failure domain"]], 2022),
  hot("ddn-sfa400nvx2", "DDN SFA400NVX2 (2U NVMe fabric)", "ddn", 265e3, 0.37, 95, 60, 1400, ["2U dual-controller SFA fabric appliance with HA controllers.", "Dual controllers give path redundancy at appliance level; Lustre/GPFS orchestration is layered by DDN or the customer.", ["HA controllers in 2U", "Still needs filesystem software"]], 2021.5),
  warm("ddn-sfa18kx0", "DDN SFA18KX0 (4U HDD fabric, ~1.2 PB)", "ddn", 98e3, 1.2, 26, 16, 900, ["4U 90-bay HDD storage fabric appliance for bulk EXAScaler tiers.", "Pair NVMe bandwidth tiers with KX0 HDD capacity tiers; DDN positions it as the cheap PB behind the flash front-end.", ["Cheap PB under one fabric stack", "HDD rebuilds and latency"]], 2021),
  // ---- VAST Data ----
  hot("vast-ceres-2u", "VAST Data Ceres Single-Server (2U)", "vast", 13e4, 0.5, 70, 40, 1200, ["VAST's single-server DataServer (Ceres) for small clusters and edge AI.", "Ceres packs the full VAST software stack into one 2U node: QLC-heavy flash, direct-to-QLC layout and S3/NFS/database services without a two-node minimum.", ["Full VAST stack at entry price", "Scale-out wins still need more nodes"]], 2025),
  obj("vast-maverick-5u", "VAST Data Mavericks AI Appliance (5U)", "vast", 48e4, 1.5, 45, 30, 1600, ["Turnkey AI storage appliance combining performance and capacity tiers in one enclosure.", "Mavericks bundles VAST servers and dense capacity media pre-integrated, targeting AI teams that want one SKU to cover training data and checkpoint archives.", ["One-box AI storage", "Less tuning freedom than building CNode+DBox tiers"]], 2024.7, 4),
  // ---- WEKA on reference hardware ----
  hot("weka-sm-ref-2u", "WEKA on Supermicro 2U NVMe reference node", "weka", 145e3, 0.65, 60, 35, 1300, ["2U 24-bay NVMe server sold as WEKA's Supermicro-based reference node.", "WEKA is software-defined: the appliance is validated hardware running the WekaFS parallel filesystem with GPU-direct storage offload.", ["GPU-direct into NCCL loaders", "You pay integration markup per node"]], 2023),
  hot("weka-dell-ref-2u", "WEKA on Dell PowerEdge R660 reference node", "weka", 155e3, 0.65, 60, 35, 1300, ["Dell PowerEdge R660 2U24 NVMe node in WEKA's validated Dell design.", "Same WekaFS software over Dell hardware for shops standardised on Dell; bandwidth per node is near-identical to the Supermicro reference.", ["Dell service channel", "Slightly higher hardware price"]], 2023.5),
  // ---- Pure Storage ----
  hot("pure-fb-s100", "Pure Storage FlashBlade//S S100", "pure", 19e4, 0.7, 40, 18, 1300, ["Entry step of the FlashBlade//S scale-out file/object array (2U chassis + XFM).", "S-series moved to a blade architecture where a Director Module and Flash Modules scale independently; S100 covers small AI file tiers with one namespace across nodes.", ["Unified file+object namespace", "Blades add cost over JBOD-style tiers"]], 2023.8),
  hot("pure-fb-s200", "Pure Storage FlashBlade//S S200", "pure", 33e4, 1.4, 70, 35, 1600, ["Mid FlashBlade//S system: ~1.4 PB effective with doubled bandwidth.", "S200 is the volume sweet spot for training data lakes that need tens of GB/s to hundreds of concurrent GPU loaders.", ["Linear blade scaling", "QLC write limits in sustained phases"]], 2023.8),
  hot("pure-fb-s500", "Pure Storage FlashBlade//S S500", "pure", 52e4, 2.6, 90, 45, 1900, ["Top FlashBlade//S: ~2.6 PB effective, ~90 GB/s reads per system.", "S500 targets multi-hundred-GPU clusters: checkpoint floods and S3 corpora in one system, scale to dozens of blades for a shared namespace.", ["Class-leading file+object throughput", "Highest $/PB of the //S range"]], 2023.8),
  obj("pure-fb-e", "Pure Storage FlashBlade//E (QLC capacity tier)", "pure", 38e4, 2.5, 20, 15, 1200, ["FlashBlade//E: dense QLC economics under the same Evergreen//One subscription model.", "The E-series swaps performance density for $/PB, letting AI teams hold epochs and raw corpora on flash without HDD rebuild windows.", ["Flash object tier near-HDD pricing", "Not a performance tier: front it with //S"]], 2022.5),
  hot("pure-fa-xl", "Pure Storage FlashArray//XL R4", "pure", 18e4, 0.35, 14, 7, 1100, ["Block-only NVMe array (2U controller + shelf) for databases and head nodes.", "FlashArray//XL targets low-latency block workloads: VM stores, databases and NFS heads in front of larger file tiers, not AI bandwidth.", ["Sub-ms block latency", "Wrong tool for GB/s checkpoint floods"]], 2022),
  // ---- NetApp ----
  hot("netapp-aff-a250", "NetApp AFF A250 (2U HA pair)", "netapp", 14e4, 0.3, 19, 8, 1200, ["Entry all-flash AFF A-series HA pair for enterprise AI and file workloads.", "A250 brings ONTAP (NFS/S3/SMB in one OS) at department scale; per-node bandwidth is modest but ONTAP's data management is the draw.", ["ONTAP snapshot/clone workflows", "Modest GB/s per system"]], 2022),
  hot("netapp-aff-a400", "NetApp AFF A400 (2U HA pair)", "netapp", 22e4, 0.55, 30, 12, 1400, ["Mid AFF A-series HA pair: ~0.55 PB effective, ~30 GB/s reads.", "A400 is the common enterprise checkpoint tier; ONTAP FlexClone lets you snapshot a dataset and spin training jobs against frozen copies in seconds.", ["Instant dataset clones", "Below DDN/VAST on raw GB/s per $"]], 2023.2),
  hot("netapp-aff-c800", "NetApp AFF C-Series C800 (QLC)", "netapp", 26e4, 1, 35, 15, 1500, ["QLC-heavy AFF C800 for capacity-tilted all-flash namespaces.", "C-series accepts lower-endurance QLC to cut $/TB while keeping ONTAP services; targeted at AI data lakes and analytics rather than checkpoint write bursts.", ["Better $/TB than A-series", "Lower sustained write ceiling"]], 2023.5),
  hot("netapp-ef600", "NetApp EF600 (4U60 NVMe block)", "netapp", 19e4, 1.4, 50, 20, 1500, ["60-bay NVMe block array (4U60) from the EF-series HPC line.", "EF600 trades ONTAP richness for raw NVMe block throughput; HPC shops front it with open-source filesystems instead.", ["Highest GB/s per NetApp $", "Block-only, no built-in file server"]], 2021.5),
  hot("netapp-ef300", "NetApp EF300 (4U60 value NVMe block)", "netapp", 145e3, 1.2, 30, 12, 1400, ["Value-tier EF-series 4U60 block array.", "EF300 is the cost-reduced EF600: same bays, fewer front-end ports, aimed at scratch volumes in HPC/AI clusters.", ["Cheap flash scratch tier", "Reduced connectivity vs EF600"]], 2022),
  obj("netapp-sg6060", "NetApp StorageGRID SG6060 (4U60 object)", "netapp", 15e4, 1.4, 20, 14, 1300, ["StorageGRID object-storage appliance (4U60) for S3 data lakes.", "SG appliances run the StorageGRID S3 platform with erasure coding; AI teams drop corpora in and mount via S3 or NFS gateways.", ["True S3 appliance with EC", "Object latency, not file-speed"]], 2021.5),
  obj("netapp-sg5712", "NetApp StorageGRID SG5712 (2U12 object)", "netapp", 45e3, 0.28, 8, 5, 600, ["2U12 StorageGRID appliance step for small grids.", "Starts a StorageGRID grid at 2U per node; scale by stacking nodes into erasure-coded sites.", ["Low-entry S3 node", "2U12 density limits per-node bandwidth"]], 2022),
  // ---- Dell PowerScale / ObjectScale / PowerStore ----
  hot("dell-powerscale-f210", "Dell PowerScale F210 (1U all-flash)", "dell", 9e4, 0.15, 25, 12, 900, ["Smallest current PowerScale all-flash node (1U) for edge Isilon clusters.", "F210 packs NVMe into 1U so branch/edge sites get OneFS namespaces; bandwidth per node is modest - scale wide for AI.", ["1U PowerScale entry", "Per-node bandwidth is limited"]], 2023.1),
  hot("dell-powerscale-f710", "Dell PowerScale F710 (2U hybrid NVMe)", "dell", 13e4, 0.4, 40, 20, 1100, ["2U PowerScale node mixing NVMe with high-capacity tiers.", "F710 balances capacity and performance for media/AI pipelines: NVMe holds the working set while dense bays keep cost per PB sane.", ["Balanced $/PB and GB/s", "Not line-rate NVMe throughout"]], 2023.1),
  hot("dell-powerscale-f910", "Dell PowerScale F910 (2U all-NVMe)", "dell", 21e4, 0.55, 65, 35, 1300, ["Top PowerScale all-flash node (2U, Gen5 NVMe) for AI performance tiers.", "F910 is the node NVIDIA references for SuperPOD-style PowerScale deployments: OneFS namespace at tens of GB/s per node.", ["Best PowerScale GB/s per U", "All-flash pricing per PB"]], 2023.6),
  obj("dell-xf960", "Dell ObjectScale XF960 (1U 24 E1.S object)", "dell", 55e3, 0.35, 15, 10, 700, ["1U dense object node running ObjectScale (ECS software) on 24 E1.S drives.", "XF960 packs rack-dense S3 into 1U slices; ObjectScale brings ECS erasure-coded object services onto Dell hardware.", ["1U S3 node density", "ECS licensing on top"]], 2024.2),
  hot("dell-powerstore-9200t", "Dell PowerStore 9200T (2U block)", "dell", 12e4, 0.25, 25, 10, 1e3, ["Upper-mid PowerStore appliance (2U, NVMe block) for enterprise storage.", "PowerStore serves VM/database block with scale-up + scale-out clustering; it is the general-purpose tier, not an AI bandwidth tier.", ["Strong block services", "Overkill as pure scratch storage"]], 2024),
  // ---- HPE Alletra MP / ClusterStor ----
  hot("hpe-alletra-mp-x10000", "HPE Alletra Storage MP X10000 (2U scale-out)", "hpe", 125e3, 0.15, 20, 10, 900, ["HPE's scale-out DDM file/object node (Alletra MP X10000), 2U slices.", "X10000 runs HPE's data-services mesh (NFS/S3) with per-node scaling; positioned as the OneFS-competitor for AI pipelines in HPE shops.", ["Unified file+object scale-out", "Early ecosystem vs PowerScale/VAST"]], 2024.4),
  hot("hpe-clusterstor-e1000", "HPE Cray ClusterStor E1000 (Lustre)", "hpe", 24e4, 0.4, 70, 40, 1400, ["ClusterStor E1000: integrated Lustre storage bundles for Cray-class HPC/AI.", "E1000 pairs 1U Lustre server nodes with 2U24 NVMe enclosures in validated ratios; the whole EXAScaler-style stack is supported by HPE Cray service.", ["Turnkey Lustre at supercomputer scale", "Locked into HPE ratios/support"]], 2021.5, 4),
  hot("hpe-clusterstor-e2000", "HPE Cray ClusterStor E2000 (Lustre, Gen5)", "hpe", 3e5, 0.5, 85, 50, 1500, ["Second-gen ClusterStor with Gen5 NVMe enclosures and faster OSS nodes.", "E2000 lifts per-enclosure bandwidth for zettascale-era Cray systems; same integrated Lustre operational model with fewer units per PB.", ["More GB/s per enclosure", "HPE-only service ecosystem"]], 2022.8, 4),
  // ---- IBM Storage Scale ----
  hot("ibm-sss-6000", "IBM Storage Scale System 6000 (2U24)", "ibm", 23e4, 0.45, 65, 30, 1300, ["IBM's 2U24 NVMe appliance running Storage Scale (GPFS) file services.", "SSS 6000 delivers ~65 GB/s per appliance and can speak NVMe-oF so clients mount it as block too; GPFS clustering remains the HPC staple at national labs.", ["NVMe-oF file+block hybrid", "GPFS licensing complexity"]], 2023.4),
  hot("ibm-ess-3500", "IBM ESS 3500 (2U flash)", "ibm", 95e3, 0.03, 14, 7, 700, ["Entry Elastic Storage Server flash drawer for small GPFS clusters.", "ESS 3500 scales GPFS out from a tiny footprint - bandwidth per drawer is limited, so buy many or step up to ESS 5000/6000.", ["GPFS entry point", "Small per-drawer capacity"]], 2021),
  hot("ibm-ess-5000", "IBM ESS 5000 (2U24 NVMe)", "ibm", 22e4, 0.45, 60, 28, 1300, ["ESS 5000: 24-bay NVMe drawer behind GPFS protocol nodes.", "The 5000 was IBM's flash-drawer workhorse before the SSS 6000 rebrand; still sold into existing GPFS estates.", ["Proven GPFS flash drawer", "Superseded by SSS 6000"]], 2021, 4),
  // ---- HPC filesystem references ----
  hot("hammerspace-anvil-2u", "Hammerspace Anvil (2U global namespace node)", "hammerspace", 95e3, 0.2, 30, 15, 900, ["Anvil: Hammerspace's 2U node providing the Global Data Environment metadata tier.", "Hammerspace abstracts data from hardware - Anvils track where every file lives and orchestrate placement across NFS/S3 backends, enabling cross-site GPU-direct reads.", ["Namespace over mixed vendors", "Needs real storage behind it"]], 2022.5),
  hot("thinkparq-beegfs-2u", "BeeGFS reference node (2U24 NVMe, ThinkParQ)", "thinkparq", 85e3, 0.35, 55, 30, 1100, ["Validated 2U NVMe server for BeeGFS parallel filesystem clusters.", "BeeGFS (by ThinkParQ) scales metadata and storage services on any commodity hardware; these reference nodes are the vendor-validated recipe.", ["Commodity-hardware Lustre rival", "You assemble/staff the cluster yourself"]], 2022),
  // ---- Huawei / Qumulo / MinIO / Ceph ----
  hot("huawei-pacific-9950", "Huawei OceanStor Pacific 9950 (2U NVMe)", "huawei", 12e4, 0.37, 60, 30, 1200, ["Scale-out all-flash Pacific-series node running Huawei's distributed file/object software.", "Pacific 9950 nodes use Huawei's encoding layout to cut redundancy overhead below classic 3-replica systems; common in APAC AI builds.", ["Lower redundancy overhead", "Non-Western service footprint"]], 2021.5),
  warm("huawei-pacific-9546", "Huawei OceanStor Pacific 9546 (5U dense HDD)", "huawei", 85e3, 1.8, 40, 25, 1e3, ["5U 120-bay dense capacity node of the Pacific series.", "Huawei decouples metadata from capacity boxes: 9546 holds ~120 HDDs per 5U feeding the same namespace as the flash nodes.", ["Very high PB per U", "Dense-vibration HDD risk"]], 2021.5),
  hot("qumulo-k218t4", "Qumulo K-218T4 (2U NVMe cluster node)", "qumulo", 12e4, 0.3, 45, 25, 1100, ["Qumulo 2U flash node for scale-out file clusters (unified analytics + NFS).", "Qumulo sells file clusters with real-time capacity/analytics; nodes scale in fixed validated SKUs, flash nodes front HDD nodes for cost balance.", ["Real-time cluster analytics", "Fixed SKU scaling ladder"], ["unverified"]], 2021.5),
  warm("qumulo-hdd-5u", "Qumulo dense HDD node (5U)", "qumulo", 95e3, 1.5, 30, 18, 1e3, ["5U high-density Qumulo capacity node behind flash fronts.", "Capacity nodes take the bulk of a Qumulo namespace at HDD economics while flash nodes absorb metadata and hot reads.", ["Cheap PB under one namespace", "Flash fronts still required"], ["unverified"]], 2021.5),
  hot("minio-ref-2u24", "MinIO reference server (2U24 NVMe, S3)", "minio", 48e3, 0.35, 55, 30, 1100, ["Commodity 2U24 NVMe node validated for MinIO S3 clusters.", "MinIO is erasure-coded S3 software famous for benchmark headline GB/s; reference nodes are plain x86 boxes you license the software on.", ["Highest S3 throughput per $", "You run the ops (K8s, monitoring)"]], 2022),
  hot("ceph-ref-2u24", "Ceph OSD reference node (2U24 NVMe)", "ceph", 38e3, 0.35, 50, 28, 1100, ["Open-source Ceph cluster node: 24 NVMe OSDs, RADOS + CephFS/RGW services.", "Ceph unifies block (RBD), file (CephFS) and object (RGW) on one cluster - the open-source alternative to vendor appliances with no license fees.", ["No license cost, full API suite", "Operational complexity is yours"]], 2022),
  // ---- Seagate xPod ----
  hot("seagate-xpod-7201", "Seagate Nytro xPod XP7201 (2U NVMe pod)", "seagate", 11e5, 1.6, 70, 40, 3200, ["2U pod holding 100+ NVMe SSDs with integrated switch fabric for datacenter flash density.", "xPod converts Seagate's HDD density playbook to flash: >1 PB per 2U with internal fabric, exposed as NVMe targets to head nodes.", ["Flash density per U champion", "Pod-level failure domain"], ["unverified"]], 2024.5, 5)
];
const nv$1 = (gen2) => (id, name, v2, price, tb, r, w, watts, c, from = 2020, lead = 1) => ({ kind: "nvme", ...base$4(id, name, v2, from, price, lead, c), capacityTB: tb, readGBs: r, writeGBs: w, pcieGen: gen2, watts });
const CAT_NVME = [
  // ---- Samsung ----
  nv$1(4)("sam-pm9a3-7t68", "Samsung PM9A3 7.68TB U.2 (Gen4)", "samsung", 800, 7.68, 6.8, 4, 13, ["7.68TB step of the PM9A3 Gen4 workhorse.", "Doubling capacity per bay halves drive count per PB; same 1-DWPD endurance class and PCIe 4.0 x4 interface as the 3.84TB.", ["Capacity per bay doubles", "Thermal throttle risk in dense shelves"]], 2021),
  nv$1(4)("sam-pm9a3-15t36", "Samsung PM9A3 15.36TB U.2 (Gen4)", "samsung", 1500, 15.36, 6.8, 4, 14, ["Largest PM9A3: 15.36TB in a U.2 Gen4 envelope.", "Endurance scales down per TB as spare area shrinks - fine for read-mostly datasets, thin for checkpoint journals.", ["Best PM9A3 capacity per bay", "0.5-DWPD-class endurance"]], 2021.5),
  nv$1(5)("sam-pm1743-3t84", "Samsung PM1743 3.84TB U.2 (Gen5)", "samsung", 750, 3.84, 14, 6, 12, ["Small-capacity PM1743 for latency-sensitive Gen5 boot/scratch.", "Same 14 GB/s-class link saturation as bigger PM1743s at lower cost; capacity per PCIe lane is the trade.", ["Gen5 speed at entry price", "Low capacity per bay"]], 2023.2),
  nv$1(5)("sam-pm1753-15t36", "Samsung PM1753 15.36TB U.2/E1.S (Gen5)", "samsung", 1800, 15.36, 14, 9, 24, ["Second-gen Gen5 flagship with stronger writes than PM1743.", "PM1753 widens the write path (~9 GB/s) and ships in E1.S ruler form for shelf density; aimed at AI pipelines that checkpoint as hard as they read.", ["Better write bandwidth", "Newer part: supply ramps through 2025"]], 2024.8, 2),
  nv$1(5)("sam-pm9d3a-30t72", "Samsung PM9D3a 30.72TB (Gen5)", "samsung", 3400, 30.72, 12, 5, 22, ["High-capacity Gen5 datacenter SSD read-tuned for AI datasets.", "PM9D3a pairs Gen5 links with QLC-leaning endurance for warm read tiers where 30 TB per bay cuts shelf count in half.", ["30TB per bay density", "Read-tilted: thin write endurance"], ["unverified"]], 2025.2, 2),
  nv$1(4)("sam-990pro-2tb", "Samsung 990 PRO 2TB M.2 (client Gen4)", "samsung", 180, 2, 7, 6.9, 8, ["Consumer flagship M.2 sometimes pressed into lab/edge nodes.", "Client drives lack PLP (power-loss protection) and enterprise endurance; acceptable for management nodes, risky for arrays.", ["Cheapest 7 GB/s option", "No PLP or rated write durability"]], 2022.8),
  // ---- Micron ----
  nv$1(4)("mic-7450-3t84", "Micron 7450 PRO 3.84TB U.3 (Gen4)", "micron", 480, 3.84, 7, 4.5, 14, ["First volume Gen4 U.3 TLC SSD with flexible NVMe feature set.", "The 7450 made PCIe 4.0 U.3 mainstream in OEM trays; NVMe namespace management lets one physical drive fake multiple per-host devices.", ["U.3 flexibility (x2/x4 configs)", "Writes lag reads at sustained loads"]], 2022),
  nv$1(5)("mic-7500-7t68", "Micron 7500 PRO 7.68TB U.3 (Gen5)", "micron", 1100, 7.68, 14, 7, 25, ["Micron's Gen5 workhorse: 7.68TB near line-rate reads.", "7500 PRO moves checkpoint and scratch tiers onto Gen5 links; power climbs with the faster interface, so dense shelves need airflow headroom.", ["Gen5 bandwidth at mid price", "~25 W per drive heats dense JBODs"]], 2023.5),
  nv$1(5)("mic-6500ion-61t44", "Micron 6500 ION 61.44TB U.3 (Gen5 QLC)", "micron", 6500, 61.44, 7.5, 3.5, 22, ["61.44TB QLC monster: the biggest per-drive capacity point of its era.", "6500 ION puts >2 PB in a 2U24 shelf with flash reliability instead of HDD latency; QLC write endurance confines it to warm/read tiers.", ["Unmatched TB per bay and watt", "Never use for checkpoint journals"]], 2024.3, 2),
  // ---- Solidigm ----
  nv$1(4)("sol-d5-p5336-30t72", "Solidigm D5-P5336 30.72TB U.2 (QLC)", "solidigm", 2600, 30.72, 3.2, 2.4, 16, ["Dense QLC capacity drive (ex-Intel DC P5336 lineage).", "Solidigm inherited Intel's 3D QLC stack: 30-60 TB per drive at HDD-adjacent $/TB, displacing spinning rust in warm AI object tiers.", ["HDD-killer $/TB on flash", "Slow sustained writes"]], 2022),
  nv$1(4)("sol-d5-p5336-61t44", "Solidigm D5-P5336 61.44TB U.2 (QLC)", "solidigm", 5400, 61.44, 3.3, 2.4, 18, ["61.44TB flagship of the P5336 QLC family.", "The capacity king of its generation: ~5 PB per 2U24 shelf for read-mostly corpora and object stores.", ["Record TB per bay", "QLC endurance + modest interface speed"]], 2023),
  nv$1(4)("sol-d7-p5520-3t84", "Solidigm D7-P5520 3.84TB U.3 (Gen4 TLC)", "solidigm", 550, 3.84, 6.8, 5.2, 13, ["Mainstream Gen4 TLC write-competent SSD (ex-Intel P5520).", "P5520 balances read and write for mixed arrays - the default pick where checkpoints land on the same drive as datasets.", ["Strong mixed-workload profile", "Gen4 ceiling vs newer Gen5 parts"]], 2022),
  nv$1(4)("sol-d5-p5430-15t36", "Solidigm D5-P5430 15.36TB U.2 (Gen4 QLC)", "solidigm", 1700, 15.36, 5, 2.5, 15, ["Mid-capacity QLC read-intensive drive.", "P5430 splits the difference between P5336 capacity and P5520 bandwidth for warm data-loader tiers.", ["Good warm-tier economics", "Thin sustained write rate"]], 2022.5),
  nv$1(5)("sol-d7-ps1010-15t36", "Solidigm D7-PS1010 15.36TB (Gen5 TLC)", "solidigm", 1700, 15.36, 14, 10, 25, ["Solidigm's Gen5 TLC flagship with unusually strong writes.", "PS1010 keeps ~10 GB/s writes alongside Gen5 reads, letting one drive class serve both data loading and checkpoint storms.", ["Best-in-class Gen5 writes", "Power and price above read-tilted parts"]], 2024.5, 2),
  nv$1(5)("sol-d7-ps1030-15t36", "Solidigm D7-PS1030 (Gen5 write-optimized)", "solidigm", 2200, 15.36, 14, 14, 26, ["SLOG-oriented Gen5 variant tuned for sustained write bursts.", "PS1030 targets journal/write-ahead-log roles (WAL, telemetry ingest) where symmetric GB/s matters more than capacity per bay.", ["Symmetric read/write GB/s", "Niche role; overkill for general tiers"], ["unverified"]], 2025),
  // ---- KIOXIA ----
  nv$1(4)("kio-cm6-6t4", "KIOXIA CM6 6.4TB U.3 (Gen4)", "kioxia", 800, 6.4, 6.2, 5.7, 13, ["KIOXIA's Gen4 enterprise TLC workhorse (former Toshiba Memory).", "CM6 brought full-power Gen4 with kaminario-derived KIOXIA FLAIR+ firmware; a common choice in Japanese OEM storage stacks.", ["Balanced TLC profile", "Thinner Western service channel"]], 2020.5),
  nv$1(5)("kio-cm7-6t4", "KIOXIA CM7-R 6.4TB U.3 (Gen5)", "kioxia", 1e3, 6.4, 14, 7, 20, ["Gen5 flagship from the world's second-largest NAND maker.", "CM7 saturates Gen5 x4 (~14 GB/s reads) with TLC endurance intact; KIOXIA supplies much of the industry's flash indirectly, so its own SKUs are price-competitive.", ["Line-rate Gen5 reads", "Dual-port variants cost more"]], 2023.8),
  nv$1(5)("kio-cd8-30t72", "KIOXIA CD8-R 30.72TB U.3 (Gen5 QLC)", "kioxia", 2600, 30.72, 6.6, 4.2, 15, ["Gen5 QLC capacity drive in the CD8 family.", "CD8 pairs Gen5 interfaces with QLC economics for warm AI tiers; per-drive capacity halves shelf count versus 15TB TLC.", ["Gen5 speed + QLC density", "Read-tilted endurance"]], 2023.9),
  nv$1(4)("kio-xd6-800g", "KIOXIA XD6 800GB (Gen4 SLOG)", "kioxia", 320, 0.8, 5.8, 5.5, 9, ["Small write-optimized SLOG drive for ZFS log devices.", "XD-class drives sacrifice capacity for symmetric sustained writes - the standard sync-write accelerator in ZFS/Ceph journal roles.", ["Sustained write specialist", "Tiny capacity per dollar"], ["unverified"]], 2021.5),
  // ---- SK hynix ----
  nv$1(4)("skh-pe8010-7t68", "SK hynix PE8010 7.68TB U.3 (Gen4)", "skhynix", 750, 7.68, 6.5, 5, 13, ["SK hynix Gen4 enterprise TLC SSD common in hyperscaler fleets.", "PE8010 rides the NAND giant's in-house controllers; big-cloud validation but thinner channel availability than Samsung/Micron.", ["Hyperscaler-proven Gen4", "Limited channel availability"], ["unverified"]], 2021.8),
  nv$1(5)("skh-ps1010-15t36", "SK hynix PS1010 15.36TB (Gen5)", "skhynix", 1600, 15.36, 13, 10, 24, ["SK hynix Gen5 TLC flagship balancing reads and writes.", "PS1010 brings the NAND-maker advantage: cutting-edge flash yields tuned firmware for AI checkpoint-plus-dataset duty.", ["Balanced Gen5 profile", "Supply skews to hyperscale contracts"], ["unverified"]], 2024.5, 2),
  nv$1(5)("skh-peb110-61t44", "SK hynix PEB110 61.44TB E1.S (Gen5)", "skhynix", 5500, 61.44, 6, 3, 20, ["Ruler-form 61TB Gen5 SSD for flash-dense warm tiers.", "PEB110 in E1.S packs 24 x 61 TB into a 1U shelf - ~1.5 PB/U of read-optimized flash for object and dataset tiers.", ["Extreme density per U", "Warm-tier endurance only"], ["unverified"]], 2024.9, 3),
  // ---- Western Digital / Seagate ----
  nv$1(4)("wd-sn640-15t36", "Western Digital SN640 15.36TB U.3 (Gen4)", "wd", 1500, 15.36, 3.5, 3.3, 15, ["WD's Gen4 capacity SSD (ex-SanDisk enterprise line).", "SN640 focused on $/TB over headline GB/s - common in hyperscale read tiers where capacity per bay beats bandwidth.", ["Solid capacity economics", "Low sequential ceiling for Gen4"]], 2020.7),
  nv$1(4)("wd-sn655-30t72", "Western Digital SN655 30.72TB U.3 (Gen4)", "wd", 2800, 30.72, 6.6, 4.4, 16, ["30.72TB Gen4 step-up with faster reads than SN640.", "SN655 doubled capacity and nearly doubled bandwidth, extending WD's warm-flash playbook before its Gen5 parts arrived.", ["Dense Gen4 capacity", "Still QLC-class write limits"], ["unverified"]], 2022.4),
  nv$1(5)("wd-sn861-15t36", "Western Digital SN861 15.36TB U.3 (Gen5)", "wd", 1600, 15.36, 14, 8, 24, ["WD's Gen5 datacenter flagship for AI-scale reads.", "SN861 answers Samsung PM1743 with ~14 GB/s reads and better power efficiency per GB/s, targeting checkpoint-heavy AI shelves.", ["Efficient Gen5 bandwidth", "Newer ramp, pricier per TB"]], 2024.2, 2),
  nv$1(4)("seagate-xp2050-3t84", "Seagate Nytro XP2050 3.84TB (dual-port U.3)", "seagate", 600, 3.84, 6.5, 5.5, 13, ["Dual-ported NVMe SSD that stays alive through a controller failure.", "Two PCIe ports let a drive straddle two hosts: arrays and clustered filesystems keep serving through one path's loss - a classic HA storage trick.", ["Path redundancy per drive", "Dual-port tax on price"]], 2022.5)
];
const mem$1 = (type) => (id, name, v2, price, gb, mts, watts, c, from = 2020, lead = 1) => ({ kind: "memory", ...base$4(id, name, v2, from, price, lead, c), type, capacityGB: gb, speedMTs: mts, watts });
const CAT_MEMORY = [
  // ---- Samsung ----
  mem$1("ddr4")("sam-ddr4-3200-128", "Samsung DDR4-3200 LRDIMM 128GB", "samsung", 620, 128, 3200, 10, ["128GB load-reduced DDR4 module for maxing out older Gen4 hosts.", "LRDIMMs buffer the ranks so two DIMMs per channel still train; they filled 4TB+ EPYC Rome/Milan hosts before 3DS DDR5 existed.", ["Biggest DDR4 capacity per slot", "Extra buffering latency"]], 2020),
  mem$1("ddr5")("sam-ddr5-4800-64", "Samsung DDR5-4800 RDIMM 64GB", "samsung", 400, 64, 4800, 10, ["First-wave DDR5 64GB RDIMM for Sapphire Rapids/Genoa hosts.", "JEDEC 4800 was the launch spec; these filled early 2022-23 GPU hosts where every 32-DIMM socket wanted 2TB.", ["Launch DDR5 capacity point", "Slowest DDR5 gear ratio"]], 2022),
  mem$1("ddr5")("sam-ddr5-5600-96", "Samsung DDR5-5600 RDIMM 96GB", "samsung", 620, 96, 5600, 14, ["96GB 3DS RDIMM: mid-capacity step for 12-channel Turin hosts.", "3DS stacking yields 96GB at RDIMM-ish pricing, letting one EPYC socket reach 1.15TB without LRDIMM premiums.", ["1.15TB per socket without LRDIMM", "3DS latency slightly above monolithic"]], 2024.2),
  mem$1("ddr5")("sam-ddr5-6400-128", "Samsung DDR5-6400 RDIMM 128GB 3DS", "samsung", 1100, 128, 6400, 16, ["128GB DDR5-6400: the fast end of server RDIMM in 2024-25.", "6400 MT/s is the top JEDEC bin Granite Rapids/Turin memory controllers run broadly; 128GB 3DS stacks combine capacity with that bandwidth.", ["Top standard DDR5 bin", "Cost per GB climbs with speed"]], 2024.7),
  mem$1("lpddr5x")("sam-socamm-96", "Samsung SOCAMM 96GB LPDDR5X (Grace-class)", "samsung", 450, 96, 6400, 6, ["Small Outline Compression Attached Memory Module for GB200-class Grace CPUs.", "SOCAMM packs LPDDR5X into removable small modules: NVIDIA's Grace superchips populate them 8-at-a-time for ~480GB and ~8 TB/s of shared CPU-GPU memory.", ["Removable LPDDR5X: serviceable unlike soldered", "Speed bins lag soldered LPDDR5X"], ["unverified"]], 2024.7),
  // ---- Micron ----
  mem$1("ddr4")("mic-ddr4-3200-64", "Micron DDR4-3200 RDIMM 64GB", "micron", 340, 64, 3200, 6, ["Micron's 64GB DDR4 RDIMM for the Gen4 GPU-host era.", "Same spec class as the Samsung part; mixing vendors per channel is disallowed - pick one brand per host for validated training.", ["Second source for DDR4 fleets", "DDR4 bandwidth caps modern hosts"]], 2020),
  mem$1("ddr5")("mic-ddr5-4800-64", "Micron DDR5-4800 RDIMM 64GB", "micron", 400, 64, 4800, 10, ["Micron's first-wave DDR5 64GB RDIMM.", "The 2022 DDR5 supply crunch made these briefly pricier than the DDR4 they replaced; prices normalized once Korean fabs caught up.", ["Launch DDR5 second source", "Was scarcity-priced through 2022"]], 2022),
  mem$1("ddr5")("mic-ddr5-5600-96", "Micron DDR5-5600 RDIMM 96GB", "micron", 600, 96, 5600, 14, ["96GB 3DS RDIMM second-source for EPYC Turin hosts.", "Micron's 3DS 96GB matches the Samsung part: 12 channels x 96GB x 2 sockets = 2.3TB per HGX node.", ["Cheap mid-capacity uplift", "Verify BIOS QVL before mixing brands"]], 2024.2),
  mem$1("ddr5")("mic-ddr5-6400-128", "Micron DDR5-6400 RDIMM 128GB 3DS", "micron", 1150, 128, 6400, 16, ["128GB DDR5-6400 3DS RDIMM for bandwidth-hungry hosts.", "Populating 32 DIMMs of these in an HGX tray gives 4TB at 6400 - the high-water mark of standard RDIMM before MRDIMM.", ["4TB per tray at top RDIMM speed", "Price per GB nearly doubles vs 5600"]], 2024.8),
  mem$1("lpddr5x")("mic-socamm-96", "Micron SOCAMM 96GB LPDDR5X", "micron", 450, 96, 6400, 6, ["Micron's SOCAMM LPDDR5X module for GB200/GB300 Grace hosts.", "Micron is a primary SOCAMM supplier for NVIDIA rack programs; modules hot-plug via connector instead of board rework.", ["Grace-standard memory on connectors", "Only used in ARM superchip trays"], ["unverified"]], 2024.7),
  // ---- SK hynix ----
  mem$1("ddr4")("skh-ddr4-3200-64", "SK hynix DDR4-3200 RDIMM 64GB", "skhynix", 340, 64, 3200, 6, ["SK hynix 64GB DDR4 RDIMM - the third DDR4 source.", "Having three RDIMM vendors smooths allocation crunches; spec-identical parts mean channel-level brand mixing is a policy choice, not a technical one.", ["Third DDR4 source", "Legacy speed for new builds"]], 2020),
  mem$1("ddr5")("skh-ddr5-4800-64", "SK hynix DDR5-4800 RDIMM 64GB", "skhynix", 400, 64, 4800, 10, ["SK hynix first-wave DDR5 64GB RDIMM.", "Launch-bin DDR5; SK hynix volume skewed to hyperscalers, so channel stock lagged Samsung/Micron in 2022.", ["Launch DDR5 third source", "Channel availability lagged in 2022"]], 2022),
  mem$1("ddr5")("skh-ddr5-5600-128", "SK hynix DDR5-5600 RDIMM 128GB 3DS", "skhynix", 1200, 128, 5600, 15, ["128GB 3DS RDIMM at 5600 for capacity-first hosts.", "A 2-socket host of 24 slots reaches 3TB of CPU memory for KV-cache-heavy inference servers without MRDIMM pricing.", ["3TB+ hosts without LRDIMM pricing", "Runs a gear slower than 6400 parts"]], 2024.3),
  mem$1("ddr5")("skh-ddr5-6400-128", "SK hynix DDR5-6400 RDIMM 128GB 3DS", "skhynix", 1150, 128, 6400, 16, ["Top-bin 128GB RDIMM matching Granite/Turin controllers.", "SK hynix 1b-nm DRAM made 6400 MT/s at 128GB practical; bandwidth per socket approaches 640 GB/s in 12-channel EPYC.", ["Top-bin DDR5 bandwidth", "Premium pricing per GB"]], 2024.8),
  mem$1("lpddr5x")("skh-socamm-128", "SK hynix SOCAMM 128GB LPDDR5X", "skhynix", 560, 128, 6400, 7, ["128GB LPDDR5X SOCAMM for GB300-class Grace hosts.", "GB300 doubled per-superchip LPDDR5X (to 384GB+); SOCAMM 128GB steps are how the density scales while staying field-replaceable.", ["Grace capacity step-up", "Superchip-tray-only fit"], ["unverified"]], 2025.5)
];
const rk = (std) => (id, name, v2, price, units, kw, wkg, cooling, wMM, dMM, hMM, busbar, c, from = 2020, lead = 2) => ({ kind: "rack", ...base$4(id, name, v2, from, price, lead, c), standard: std, units, maxKW: kw, maxWeightKg: wkg, cooling, widthMM: wMM, depthMM: dMM, heightMM: hMM, hasBusbar: busbar });
const r19 = rk("19in");
const RAW_RACKS = [
  // ---- Rittal ----
  r19("rittal-ts-it-42u", "Rittal TS IT 42U Server Rack (600x1200)", "rittal", 1500, 42, 15, 1200, ["air"], 600, 1200, 2e3, false, ["Rittal's volume 19-inch enclosure: 42U, 600 wide, 1200 deep.", "TS IT is the German-industrial standard cabinet: heavy-gauge steel, cable entry top/bottom, baying kits for rows - the workhorse under Rittal LCP cooling add-ons.", ["Industrial build, row-ready", "Cord-and-PDU power unless retrofitted"]]),
  r19("rittal-ts-it-48u", "Rittal TS IT 48U Server Rack (600x1200)", "rittal", 1900, 48, 15, 1500, ["air"], 600, 1200, 2200, false, ["Taller 48U step of the TS IT line.", "Six extra U helps GPU trays (2U each) plus switches and PDUs breathe; same power reality: cords and rack PDUs.", ["48U of the same enclosure line", "Still air-power-limited"]]),
  r19("rittal-vx-it-42u", "Rittal VX IT 42U Rack (600x1200)", "rittal", 1700, 42, 15, 1300, ["air"], 600, 1200, 2e3, false, ["VX IT: TS IT with 25% more inner installation depth for cabling and PDUs.", "The extra inner volume keeps 1200mm-deep servers, vertical PDU and cable management from fighting each other - useful for GPU trays with fat looms.", ["More usable inner depth", "Slightly wider exterior footprint"], ["unverified"]]),
  // ---- APC / Schneider ----
  r19("apc-netshelter-sx-42u", "APC NetShelter SX 42U (600x1200)", "schneider", 1600, 42, 10, 1300, ["air"], 600, 1200, 1991, false, ["The most-cited datacenter rack in enterprise IT: 42U, perforated doors, full-height side panels.", "NetShelter SX defined the modern rack accessory ecosystem (roof PDU strips, cable containment, AR-series accessories); standard 600x1200 fits legacy rows everywhere.", ["Universal accessory ecosystem", "Air-cooled cord-power ceiling ~10kW"]]),
  r19("apc-netshelter-sx-48u", "APC NetShelter SX 48U (600x1200)", "schneider", 2100, 48, 10, 1400, ["air"], 600, 1200, 2293, false, ["48U tall SX for maximum density in the same footprint.", "Tall cabinets fit AI trays plus switching without new floor tiles; check hall ceiling clearance for ducts and cable tray above.", ["48U in a standard footprint", "Head-height clearance needed"]]),
  r19("apc-netshelter-sv-48u", "APC NetShelter SV 48U (600x1060)", "schneider", 1300, 48, 8, 1100, ["air"], 600, 1060, 2288, false, ["Value version of NetShelter with shallower 1060mm depth.", "SV trades depth (and some accessory breadth) for price; fine for storage switches and 1U builds, tight for deep GPU servers.", ["Budget 48U", "Shallow depth limits deep servers"]]),
  // ---- Vertiv ----
  r19("vertiv-vr3100-42u", "Vertiv VR3100 42U Rack (600x1070)", "vertiv", 1500, 42, 10, 1100, ["air"], 600, 1070, 1995, false, ["Vertiv's standard 42U rack from the VR series.", "Pairs with Vertiv white-space gear (Geist PDUs, Liebert cooling) for single-vendor rows; medium-duty load ratings fit enterprise halls.", ["Single-vendor Vertiv row", "Medium-duty density class"], ["unverified"]]),
  r19("vertiv-vr3300-48u", "Vertiv VR3300 48U Rack (600x1200)", "vertiv", 2e3, 48, 12, 1400, ["air"], 600, 1200, 2290, false, ["48U heavy-duty step of the Vertiv VR line.", "Deeper and beefier: accepts dense GPU trays plus rear-door retrofits up to ~12kW before liquid becomes mandatory.", ["Heavy-duty 48U", "RDHx retrofit needed past ~12kW"], ["unverified"]]),
  r19("vertiv-vr-liquid-48u", "Vertiv Liquid-Ready Rack 48U (80 kW, manifolds)", "vertiv", 11500, 48, 80, 1800, ["rdhx", "dlc"], 600, 1200, 2290, false, ["Vertiv cabinet pre-fitted with coolant manifolds and quick-disconnects for direct-chip loops.", "Vertiv bundles cabinet + manifolds + top-of-rack piping so a DLC hall deploys from one SKU list; pairs with Liebert XDU CDUs behind it.", ["Manifold-ready out of the box", "Needs facility water + CDU"], ["unverified"]], 2022.5),
  // ---- OEM server racks ----
  r19("dell-smart-rack-4210", "Dell Smart Rack 4210 (42U)", "dell", 1400, 42, 10, 1200, ["air"], 600, 1070, 2e3, false, ["Dell's 42U static rack sold alongside PowerEdge fleets.", "Buying racks from the server vendor keeps the SKU list unified and support contracts single-threaded; specs match generic 42U class.", ["One-vendor stack with Dell gear", "Generic density class"], ["unverified"]]),
  r19("hpe-rack-10642g2", "HPE 10642 G2 Rack (42U, 600x1200)", "hpe", 1500, 42, 10, 1360, ["air"], 600, 1200, 1998, false, ["HPE's long-running 42U G2 rack (AF001A lineage).", "The 10642 is the default enclosure across HPE enterprise installs; high load ratings and toolless accessory mounting.", ["Proven workhorse rack", "Air-power-limited like all cord racks"]]),
  r19("hpe-rack-10847", "HPE 10847 Rack (47U, 800x1200)", "hpe", 2100, 47, 12, 1500, ["air"], 800, 1200, 2214, false, ["Wider 800mm 47U HPE rack for dense cabling and side-access builds.", "The 800mm width simplifies side channel routing for in-row PDUs and liquid piping; extra U helps AI trays breathe.", ["Wider service aisle per cabinet", "Floor space grows per row"], ["unverified"]], 2021),
  r19("supermicro-42u-rack", "Supermicro 42U Rack (600x1200)", "supermicro", 1300, 42, 10, 1200, ["air"], 600, 1200, 2e3, false, ["Supermicro's enclosure line matching its server trays.", "Buying rack+servers+CDU from one ODM simplifies logistics for fast AI builds; rack specs track the generic 42U standard.", ["Bundle-friendly with SM servers", "Commodity enclosure"], ["unverified"]], 2021),
  r19("lenovo-42u-rack", "Lenovo Enterprise 42U Rack (600x1200)", "lenovo", 1500, 42, 10, 1300, ["air"], 600, 1200, 2e3, false, ["Lenovo's 42U rack sold with ThinkSystem/ThinkSystem SD-class fleets.", "Pairs with Lenovo Neptune DLC offerings; rack itself is a standard cord-powered enclosure until liquid manifolds are ordered.", ["Pairs with Neptune liquid line", "Generic density without add-ons"], ["unverified"]]),
  // ---- Open Compute ----
  rk("orv3-21in")("ocp-orv3-hpr-48u", 'OCP Open Rack v3 High-Power Rack (48U, 21")', "ocp", 8500, 48, 100, 1900, ["air", "rdhx", "dlc"], 600, 1200, 2134, true, ["ORv3 variant pushing toward 100kW per rack with extra power shelves.", "High-power ORv3 stacks more 48V power shelves and heavier busbar so 21-inch trays approach liquid-cooling densities without changing the rack spec.", ["Near-100kW on the ORv3 standard", "Trays must respect ORv3 thermal limits"], ["unverified"]], 2024),
  // ---- NVIDIA rack ----
  rk("nvl-mgx")("nv-gb300-nvl72-rack", "NVIDIA GB300 NVL72 Rack (MGX, liquid)", "nvidia", 42e3, 48, 150, 1900, ["dlc"], 600, 1200, 2200, true, ["The GB300-generation MGX rack: 18 compute trays, 9 NVLink switch trays, busbar and liquid manifolds.", "Each NVL rack generation raises density: GB300 pushes ~140-150kW per floor tile, which rewrites power and cooling budgets hall-wide.", ["150kW density: 10 legacy racks in one", "Liquid-only, huge facility prerequisites"]], 2025.6, 5),
  // ---- Schneider liquid-ready / Legrand / Eaton / CPI ----
  r19("schneider-netshelter-52u-lq", "Schneider NetShelter Liquid-Ready 52U (800x1200)", "schneider", 9800, 52, 60, 1700, ["rdhx", "dlc"], 800, 1200, 2484, false, ["Tall, deep NetShelter variant with liquid manifolds and RDHx option from Schneider.", "Schneider rides its NetShelter ubiquity into liquid: same accessory rails, now with manifold columns and CDU-adjacent plumbing kits.", ["Familiar rack becomes liquid-ready", "Liquid accessories price up fast"], ["unverified"]], 2023),
  r19("legrand-zonix-42u", "Legrand Zonix 42U Server Rack (600x1200)", "legrand", 1400, 42, 10, 1200, ["air"], 600, 1200, 2e3, false, ["Legrand's datacenter cabinet line (Zonix family).", "Legrand bundles racks with its Raritan/ServerTech PDUs and BusWay for EMEA-centric builds; enclosure specs track the 42U standard.", ["Matches Legrand power lineup", "Regional service focus"], ["unverified"]]),
  r19("eaton-42u-rack", "Eaton 42U Server Rack (600x1200)", "eaton", 1300, 42, 10, 1200, ["air"], 600, 1200, 2e3, false, ["Eaton's entry enclosure alongside its rack-PDU and eSTS lines.", "Eaton sells the cabinet so its power chain (PDU -> eSTS -> rack) is one vendor quote; enclosure itself is commodity class.", ["Single-quote Eaton power chain", "Commodity rack class"], ["unverified"]]),
  r19("chatsworth-z4-45u", "Chatsworth Z4-Series SeismicFrame 45U", "chatsworth", 2200, 45, 12, 1800, ["air"], 600, 1219, 2263, false, ["CPI's seismic-rated heavy-duty cabinet (Z4-Series).", "SeismicFrame racks carry 1500+ kg with anchoring hardware certified for earthquake zones - mandatory in some US West Coast and APAC sites.", ["Seismic zone certified", "Heavy and priced for it"]], 2021)
];
const v$4 = (id, name, sells, summary) => ({
  id,
  name,
  sells,
  reliability: 0.92,
  support: 0.88,
  volumeDiscountPerDoublingPct: 4,
  codex: { summary, explain: `${name} supplies the storage/memory/rack layer of the catalogue. Compare lead time, service coverage and spares logistics, not just price.`, tradeoffs: ["Category specialist depth", "Service network varies by region"] }
});
const CAT_STORAGE_VENDORS = [
  v$4("pure", "Pure Storage", ["storage", "nvme"], "All-flash specialist: FlashBlade//S and //E scale-out file/object arrays plus FlashArray//XL block."),
  v$4("netapp", "NetApp", ["storage"], "ONTAP-centric storage: AFF A/C all-flash, EF block arrays and StorageGRID S3 appliances."),
  v$4("hpe", "HPE", ["storage", "rack"], "Alletra MP scale-out storage and Cray ClusterStor Lustre bundles, plus racks."),
  v$4("ibm", "IBM", ["storage"], "Storage Scale (GPFS) appliances: Storage Scale System 6000 and ESS drawers."),
  v$4("huawei", "Huawei", ["storage"], "OceanStor Pacific scale-out file/object storage, dominant in APAC AI builds."),
  v$4("qumulo", "Qumulo", ["storage"], "Scale-out file clusters with real-time analytics over flash and HDD node tiers."),
  v$4("minio", "MinIO", ["storage"], "High-performance open-source S3 object store sold on validated commodity NVMe nodes."),
  v$4("ceph", "Ceph", ["storage"], "Open-source unified block/file/object storage; reference nodes, no license fees."),
  v$4("hammerspace", "Hammerspace", ["storage"], "Global data environment software (Anvil nodes) orchestrating data across vendor backends."),
  v$4("thinkparq", "ThinkParQ (BeeGFS)", ["storage"], "Company behind BeeGFS parallel filesystem; sells validated reference nodes and support."),
  v$4("solidigm", "Solidigm", ["nvme"], "SK-group NAND house (ex-Intel SSD unit): QLC capacity kings and Gen5 TLC."),
  v$4("kioxia", "KIOXIA", ["nvme"], "Toshiba-memory successor and top NAND maker: CM TLC, CD QLC, XD SLOG enterprise SSDs."),
  v$4("wd", "Western Digital", ["nvme"], "SanDisk-lineage datacenter SSDs: SN640/655 capacity and SN861 Gen5."),
  v$4("seagate", "Seagate", ["nvme", "storage"], "Nytro enterprise SSDs and xPod dense NVMe platforms."),
  v$4("lenovo", "Lenovo", ["rack"], "ThinkSystem-adjacent racks and Neptune liquid infrastructure."),
  v$4("chatsworth", "Chatsworth Products (CPI)", ["rack"], "Heavy-duty and seismic-rated enclosures (Z4-Series SeismicFrame)."),
  v$4("apc", "APC (Schneider Electric)", ["rack"], "NetShelter SX/SV rack line and aisle containment - the enterprise rack default.")
];
const CAP_FIX = { "netapp-ef600": 0.37, "netapp-ef300": 0.37, "ibm-ess-3500": 0.37 };
const CAT_STORAGE_SYSTEMS = RAW_STORAGE.map((x) => {
  const y = { ...x, capacityPB: CAP_FIX[x.id] ?? x.capacityPB };
  if (y.tier === "hot-nvme" && y.rackUnits <= 2 && y.capacityPB > 0.75) {
    const k2 = Math.ceil(y.capacityPB / 0.75);
    return { ...y, rackUnits: 2 * k2, watts: Math.round(y.watts * k2 * 0.85) };
  }
  return y;
});
const CAT_RACKS = RAW_RACKS.map((r) => r.maxKW > 30 && r.cooling.includes("air") ? { ...r, cooling: r.cooling.filter((c) => c !== "air") } : r);
const o = (id, name, reliability, support, summary) => ({
  id,
  name,
  sells: ["chassis", "rack"],
  reliability,
  support,
  volumeDiscountPerDoublingPct: 3,
  codex: { summary, explain: `${name} integrates accelerators, CPUs, NICs and cooling into validated servers and racks. Compare premium, lead time, firmware support and the quality of the service contract, not just list price.`, tradeoffs: ["Validated build and one support number", "Premium over DIY; availability tied to NVIDIA/AMD allocation"] }
});
const OEM_VENDORS = [
  o("lenovo", "Lenovo", 0.94, 0.92, "ThinkSystem SR670/SR675/SR680a/SR685a AI servers with Neptune liquid cooling."),
  o("quanta", "Quanta Cloud Technology (QCT)", 0.93, 0.85, "Hyperscale ODM that builds HGX servers and GB200/GB300 NVL72 racks for cloud buyers and neoclouds."),
  o("wiwynn", "Wiwynn", 0.93, 0.84, "Taiwanese ODM building rack-scale GB200/GB300 NVL72 and OCP-style systems at hyperscale."),
  o("asus", "ASUS (ESC servers)", 0.92, 0.82, "ESC8000/ESC N8/N-series AI servers, strong in HGX and MI300X platforms and fast to market."),
  o("inspur", "Inspur", 0.92, 0.8, "Large Chinese server maker (NF5488/NF5688); sells HGX A100 generation systems internationally."),
  o("cisco", "Cisco UCS", 0.95, 0.94, "UCS C885A / X-Series AI servers with Intersight management and Nexus/Silicon One networking.")
];
const cdx$3 = ([summary, explain, tradeoffs]) => ({ summary, explain, tradeoffs, tags: [] });
const base$3 = (id, name, vendor, from, price, lead, c, tags = [], eol) => ({ id, name, vendor, availableFrom: from, ...eol ? { eolAfter: eol } : {}, priceUSD: price, leadTimeMonths: lead, codex: { ...cdx$3(c), tags } });
const nic$1 = (o2) => ({ kind: "nic", ...o2 });
const cb = (o2) => ({ kind: "cable", ...o2 });
const CAT_NICS_A = [
  nic$1({ ...base$3("nv-cx5-100", "NVIDIA ConnectX-5 100G (2x100)", "nvidia", 2017.5, 1100, 2, ["Dual-port 100G Mellanox adapter that dominated pre-A100 GPU clusters.", "ConnectX-5 moved RDMA, OVS and VXLAN offload into the mainstream and stayed in production through the A100 era; fleets still use it for storage and front-end rails.", ["Early revisions are PCIe Gen3 only", "No 200G ports or SHARP collectives"]], ["ethernet", "roce", "100g", "a100-era"], 2024.5), nicClass: "nic", tech: "eth-100", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 13, features: ["roce", "rdma", "ovs-offload", "ipsec"] }),
  nic$1({ ...base$3("nv-cx5-25", "NVIDIA ConnectX-5 25G (2x25)", "nvidia", 2017.5, 450, 2, ["Dual-port 25G ConnectX-5 for front-end and storage networks.", "The 25G CX-5 was the cheap workhorse of cloud front-ends; RDMA offload came standard even at this price point.", ["25G is front-end only: useless for GPU rails", "Lowest-cost CX-5 entry"]], ["ethernet", "25g", "frontend"], 2024.5), nicClass: "nic", tech: "eth-100", gbps: 50, ports: 2, pcieGen: 4, pcieLanes: 8, watts: 9, features: ["roce", "rdma", "ovs-offload"] }),
  nic$1({ ...base$3("nv-cx5-50", "NVIDIA ConnectX-5 50G (2x50)", "nvidia", 2018, 600, 2, ["Dual-port 50G ConnectX-5 on SFP56.", "50G per lane arrived on CX-5 before QSFP56 was common; useful for storage fabrics and mid-tier compute nodes.", ["Odd speed class: limited switch ecosystem", "Superseded by CX-6 Lx at lower power"]], ["ethernet", "50g", "storage"], 2024.5), nicClass: "nic", tech: "eth-100", gbps: 100, ports: 2, pcieGen: 4, pcieLanes: 8, watts: 11, features: ["roce", "rdma", "ovs-offload"] }),
  nic$1({ ...base$3("nv-cx5ex-100", "NVIDIA ConnectX-5 Ex 100G (Gen4)", "nvidia", 2019, 1500, 3, ["ConnectX-5 Ex: PCIe Gen4 100G adapter with inline TLS/IPsec crypto.", "The Ex added Gen4 host bandwidth and inline encryption, making it the security-conscious upgrade for A100-era back-ends.", ["Inline crypto costs throughput vs plain CX-5", "Still 100G-per-port class"]], ["ethernet", "100g", "pcie-gen4", "crypto"], 2025), nicClass: "smartnic", tech: "eth-100", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 14, features: ["rdma", "roce", "tls", "ipsec"] }),
  nic$1({ ...base$3("nv-cx6-100", "NVIDIA ConnectX-6 100G (2x100)", "nvidia", 2020, 1150, 2, ["Base ConnectX-6: Gen4 100G adapter below the feature-rich Dx.", "The plain CX-6 kept RDMA and GPUDirect but trimmed offload features, giving a cheap 100G option for storage and front-end rails.", ["Fewer offloads than CX-6 Dx", "200G reserved for Dx and above"]], ["ethernet", "100g", "storage"], 2025.5), nicClass: "nic", tech: "eth-100", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 15, features: ["roce", "rdma", "gpudirect", "ovs-offload"] }),
  nic$1({ ...base$3("nv-cx6lx-25", "NVIDIA ConnectX-6 Lx 25G (2x25)", "nvidia", 2020.25, 300, 1, ["Low-power dual-25G adapter, the successor to 25G CX-5 front-ends.", "ConnectX-6 Lx targets OCP front-end slots and management-adjacent traffic: all the RDMA offload of CX-6 in an 8 W part.", ["Front-end class only", "Cheapest modern ConnectX"]], ["ethernet", "25g", "frontend", "low-power"], 2026), nicClass: "nic", tech: "eth-100", gbps: 50, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 8, features: ["roce", "rdma", "ovs-offload"] }),
  nic$1({ ...base$3("nv-cx6lx-50", "NVIDIA ConnectX-6 Lx 50G (2x50)", "nvidia", 2021, 400, 1, ["Dual-port 50G variant of the ConnectX-6 Lx.", "Adds 50G-per-lane SFP56 for storage clusters that outgrew 25G while keeping the same low power budget.", ["Still not a GPU-rail NIC", "50G switch ports less common than 100G"]], ["ethernet", "50g", "frontend", "low-power"], 2026), nicClass: "nic", tech: "eth-100", gbps: 100, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 9, features: ["roce", "rdma", "ovs-offload"] }),
  nic$1({ ...base$3("nv-cx6dx-100", "NVIDIA ConnectX-6 Dx 100G (2x100)", "nvidia", 2020.5, 1e3, 2, ["Dual-port 100G variant of the CX-6 Dx, the storage/RDMA volume SKU.", "Same silicon as the 200G Dx: full RDMA, NVMe-oF, MACsec, just 100G ports, which made it the default card for file and object tiers feeding GPU clusters.", ["100G ports cannot feed H100-class GPUs", "Mostly used host-side or on storage nodes"]], ["ethernet", "100g", "roce", "storage"], 2025.5), nicClass: "nic", tech: "eth-100", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 15, features: ["roce", "rdma", "gpudirect", "ipsec", "macsec", "nvme-of"] }),
  nic$1({ ...base$3("nv-cx6dx-ocp3", "NVIDIA ConnectX-6 Dx 100G OCP 3.0", "nvidia", 2021, 950, 2, ["CX-6 Dx 100G in the OCP NIC 3.0 form factor for hyperscale motherboards.", "OCP 3.0 cards slot directly into hyperscale server boards, cutting the PCIe riser and cabling cost per node at fleet scale.", ["Only fits OCP 3.0 boards", "Same silicon, lower serviceable cost"]], ["ethernet", "100g", "ocp3"], 2025.5), nicClass: "nic", tech: "eth-100", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 15, features: ["roce", "rdma", "gpudirect", "ipsec", "nvme-of"] }),
  nic$1({ ...base$3("nv-cx7-400-1p", "NVIDIA ConnectX-7 400G (1x400 QSFP112)", "nvidia", 2023.25, 1700, 3, ["Single-port 400G ConnectX-7 for cost-reduced AI nodes.", "One 400G port per node instead of two halves the switch-port bill where a single rail suffices; common in inference and storage-head builds.", ["Half the aggregate bandwidth of the dual-port card", "One rail means no rail-failure isolation"]], ["ethernet", "400g", "h100-era"], 2029), nicClass: "nic", tech: "eth-400", gbps: 400, ports: 1, pcieGen: 5, pcieLanes: 16, watts: 22, features: ["rdma", "roce", "gpudirect", "sharp", "nvme-of"] }),
  nic$1({ ...base$3("nv-cx7-200-2p", "NVIDIA ConnectX-7 200G (2x100)", "nvidia", 2023.25, 1300, 3, ["Dual-port 100G-per-port ConnectX-7 variant.", "The 200G CX-7 SKU serves clusters that kept 100G fabrics but want Gen5 host bandwidth and the CX-7 offload feature set.", ["200G aggregate lags 400G-per-GPU guidance", "Gen5 x16 host link it cannot fill"]], ["ethernet", "200g", "h100-era"], 2029), nicClass: "nic", tech: "eth-200", gbps: 200, ports: 2, pcieGen: 5, pcieLanes: 16, watts: 18, features: ["rdma", "roce", "gpudirect", "sharp"] })
];
const CAT_NICS_B = [
  nic$1({ ...base$3("nv-cx7-ocp3", "NVIDIA ConnectX-7 400G OCP 3.0", "nvidia", 2023.75, 2700, 3, ["Dual-port 400G ConnectX-7 in the OCP NIC 3.0 form factor.", "The OCP 3.0 CX-7 is what hyperscale builders slot into GB-class and ODM boards: identical silicon, cheaper integration, tool-less service.", ["OCP 3.0 boards only", "Volume pricing depends on fleet size"]], ["ethernet", "400g", "ocp3", "spectrum-x"], 2029), nicClass: "nic", tech: "eth-400", gbps: 800, ports: 2, pcieGen: 5, pcieLanes: 16, watts: 25, features: ["rdma", "roce", "gpudirect", "sharp", "spectrum-x"] }),
  nic$1({ ...base$3("nv-cx8-ocp3", "NVIDIA ConnectX-8 800G OCP 3.0 SuperNIC", "nvidia", 2025.5, 5500, 4, ["ConnectX-8 800G in OCP NIC 3.0 form for GB200-class ODM trays.", "Same 800G-per-port silicon as the PCIe CX-8 but packaged for OCP motherboards, letting ODMs build NVL-compatible compute trays without NVIDIA chassis.", ["800G per port still outruns PCIe Gen5 x16", "Unverified: OCP variant specs are early"]], ["ethernet", "800g", "ocp3", "unverified"]), nicClass: "nic", tech: "eth-800", gbps: 1600, ports: 2, pcieGen: 5, pcieLanes: 16, watts: 40, features: ["rdma", "roce", "gpudirect", "spectrum-x", "nvme-of"] }),
  nic$1({ ...base$3("nv-bf2-200", "NVIDIA BlueField-2 DPU 200G (2x100)", "nvidia", 2021, 2800, 3, ["First-generation BlueField DPU: 2x100G NIC fused with 8 Arm A72 cores.", "BlueField-2 proved the DPU concept in production clouds: OVS, IPsec, TLS and NVMe-oF run on the card so host CPUs serve tenants. DOCA software ships on it.", ["Gen4 host link and 200G cap: dated for AI back-ends", "~2800 USD for what a plain NIC does at a third of the price"]], ["dpu", "arm", "offload", "security"], 2026), nicClass: "dpu", tech: "eth-200", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 18, features: ["arm-cores:8", "rdma", "ovs-offload", "ipsec", "nvme-of", "tls"] }),
  nic$1({ ...base$3("nv-bf2-100", "NVIDIA BlueField-2 DPU 100G (1x100)", "nvidia", 2021.5, 2400, 3, ["Single-port 100G BlueField-2 for storage and security appliances.", "The 100G BF-2 is the volume SKU in storage heads and security gateways where the Arm cores matter more than line rate.", ["100G single port: no rail redundancy on-card", "DPU tax on non-offloaded workloads"]], ["dpu", "100g", "storage"], 2026), nicClass: "dpu", tech: "eth-100", gbps: 100, ports: 1, pcieGen: 4, pcieLanes: 16, watts: 15, features: ["arm-cores:8", "rdma", "ovs-offload", "ipsec", "nvme-of"] }),
  nic$1({ ...base$3("nv-bf3-200", "NVIDIA BlueField-3 DPU 200G (2x100)", "nvidia", 2023.5, 3300, 4, ["Lower-rate BlueField-3 SKU with 16 Arm cores at 200G aggregate.", "Brings the BlueField-3 Arm complex and DOCA 3.x to 100G-fabric clouds that do not need 400G ports.", ["200G aggregate in a 400G-class card", "Unverified SKU: exact port config varies by OEM"]], ["dpu", "200g", "unverified"]), nicClass: "dpu", tech: "eth-200", gbps: 200, ports: 2, pcieGen: 5, pcieLanes: 16, watts: 20, features: ["arm-cores:16", "rdma", "ovs-offload", "ipsec", "nvme-of", "tls"] }),
  nic$1({ ...base$3("nv-bf3-supernic", "NVIDIA BlueField-3 SuperNIC 400G", "nvidia", 2024.75, 4800, 5, ["BlueField-3 variant tuned for AI clouds: 400G ports, 16 Arm cores, in-network collectives.", "The SuperNIC branding marks BlueField-3s validated for AI back-end duty: rail-optimized RDMA, SHARP-style in-network computing and tight Spectrum-X integration for multi-tenant GPU clouds.", ["Costs 60% more than a plain CX-7 for the same line rate", "DOCA software stack is a real operational commitment"]], ["dpu", "400g", "ai-cloud", "spectrum-x"]), nicClass: "dpu", tech: "eth-400", gbps: 800, ports: 2, pcieGen: 5, pcieLanes: 16, watts: 30, features: ["arm-cores:16", "rdma", "gpudirect", "sharp", "nvme-of", "ipsec"] })
];
const CAT_NICS_C = [
  nic$1({ ...base$3("cb-p225p", "Broadcom NetXtreme-E P225p 2x25G", "broadcom", 2020, 350, 2, ["Dual-port 25G NetXtreme-E for hyperscale front-ends.", "The P225p is the OCP-ecosystem default 25G card: cheap, cool-running and backed by Broadcom silicon found in most white-box fleets.", ["Front-end class only", "Driver stack less polished than Mellanox for RDMA"]], ["ethernet", "25g", "frontend", "ocp"]), nicClass: "nic", tech: "eth-100", gbps: 50, ports: 2, pcieGen: 4, pcieLanes: 8, watts: 8, features: ["rdma", "rocev2"] }),
  nic$1({ ...base$3("cb-p425p", "Broadcom NetXtreme-E P425p 4x25G", "broadcom", 2020, 600, 2, ["Quad-port 25G NetXtreme-E for bond-heavy front-ends.", "Four SFP28 ports on one card let hyperscale hosts bond front-end, storage and inter-pod networks without extra slots.", ["Four cables per node: patch-panel density pain", "25G ceiling"]], ["ethernet", "25g", "frontend"]), nicClass: "nic", tech: "eth-100", gbps: 100, ports: 4, pcieGen: 4, pcieLanes: 8, watts: 11, features: ["rdma", "rocev2"] }),
  nic$1({ ...base$3("cb-p2100g", "Broadcom NetXtreme-E P2100G 2x100G", "broadcom", 2020.5, 1100, 2, ["Dual-port 100G NetXtreme-E on the Gen4 Thor-family silicon.", "The P2100G gave hyperscalers a merchant alternative to ConnectX for 100G storage and front-end fabrics, with full RoCEv2 offload.", ["100G class: below AI-rail needs", "Weaker GPUDirect story than NVIDIA"]], ["ethernet", "100g", "roce"]), nicClass: "nic", tech: "eth-100", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 15, features: ["rdma", "rocev2", "nvme-of"] }),
  nic$1({ ...base$3("cb-p1400gd", "Broadcom NetXtreme-E P1400GD 400G", "broadcom", 2023, 1500, 3, ["400G-class NetXtreme-E in QSFP-DD, the P-series step to PAM4 lanes.", "The P1400GD extends the NetXtreme-E line to 400G for storage and front-end fabrics riding Tomahawk-based networks.", ["Specs not fully public", "Unverified: exact port split varies by OEM build"]], ["ethernet", "400g", "unverified"]), nicClass: "nic", tech: "eth-400", gbps: 400, ports: 1, pcieGen: 4, pcieLanes: 16, watts: 18, features: ["rdma", "rocev2", "nvme-of"] }),
  nic$1({ ...base$3("cb-p1800gd", "Broadcom NetXtreme-E P1800GD 800G", "broadcom", 2024.5, 2600, 4, ["Dual-port 400G-per-port NetXtreme-E aiming at 800G aggregate.", "Top of the P-series: 800G aggregate on Gen4+ Thor silicon for AI-adjacent fabrics that stay merchant-silicon.", ["Specs early and partly unverified", "Software ecosystem younger than MOFED"]], ["ethernet", "800g", "unverified"]), nicClass: "nic", tech: "eth-800", gbps: 800, ports: 2, pcieGen: 5, pcieLanes: 16, watts: 30, features: ["rdma", "rocev2"] }),
  nic$1({ ...base$3("cb-n2100g", "Broadcom Thor2 N2100G 2x100G", "broadcom", 2021, 900, 3, ["Thor2-based dual-100G smart NIC with inline crypto and telemetry.", "Thor2 silicon adds programmable flow steering and crypto to the classic NetXtreme profile, popular in hyperscale storage fleets.", ["Unverified: N-series naming varies by OEM", "Not an AI-rail part"]], ["ethernet", "100g", "smartnic", "unverified"]), nicClass: "smartnic", tech: "eth-100", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 14, features: ["rdma", "rocev2", "tls", "ipsec"] }),
  nic$1({ ...base$3("cb-n425p", "Broadcom Thor2 N425p 4x25G", "broadcom", 2021, 550, 2, ["Thor2 quad-25G smart NIC for OCP front-ends.", "Same Thor2 crypto and telemetry features as the N2100G at 25G ports, aimed at hyperscale front-end refresh cycles.", ["Unverified SKU naming", "25G class"]], ["ethernet", "25g", "smartnic", "unverified"]), nicClass: "smartnic", tech: "eth-100", gbps: 100, ports: 4, pcieGen: 4, pcieLanes: 8, watts: 10, features: ["rdma", "rocev2", "tls"] }),
  nic$1({ ...base$3("cb-n1400gd", "Broadcom Thor2 N1400GD 400G", "broadcom", 2023, 1500, 3, ["Thor2 400G smart NIC, the N-series answer to 400G storage fabrics.", "Pairs Tomahawk-class networking with Thor2 programmability for clouds that standardize on Broadcom end to end.", ["Unverified: exact SKU string uncertain", "RDMA tuning leans RoCEv2 rather than UEC"]], ["ethernet", "400g", "unverified"]), nicClass: "smartnic", tech: "eth-400", gbps: 400, ports: 1, pcieGen: 4, pcieLanes: 16, watts: 18, features: ["rdma", "rocev2", "tls", "nvme-of"] }),
  nic$1({ ...base$3("cb-stingray-p58800", "Broadcom Stingray BCM58800 SmartNIC 200G", "broadcom", 2020, 1600, 3, ["Stingray P-series smart NIC: 200G of PCIe-attached Arm cores and crypto offload.", "Stingray put bare-metal provisioning, VXLAN and IPsec on the card for cloud providers; Broadcom later folded the lessons into Thor2.", ["Program largely wound down after Thor2 arrived", "Spares and software support are the real risk"]], ["smartnic", "100g", "arm", "crypto"], 2024.5), nicClass: "smartnic", tech: "eth-200", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 25, features: ["arm-cores:8", "rdma", "tls", "ipsec", "ovs-offload"] })
];
const CAT_NICS_D = [
  nic$1({ ...base$3("intel-e810-xxvda2", "Intel Ethernet Adapter E810-XXVDA2 (2x25G)", "intel", 2021, 700, 2, ["Dual-port 10/25G Intel 800-series adapter for front-end networks.", "E810 silicon brings DDP (dynamic device personalization), ADQ queue steering and both iWARP and RoCEv2 to cheap 25G ports; the default Intel-server front-end card.", ["Front-end class", "Two RDMA dialects in one driver stack"]], ["ethernet", "25g", "frontend", "intel"]), nicClass: "nic", tech: "eth-100", gbps: 50, ports: 2, pcieGen: 4, pcieLanes: 8, watts: 9, features: ["rdma", "rocev2", "iwarp", "adq"] }),
  nic$1({ ...base$3("intel-e810-xxvda4", "Intel Ethernet Adapter E810-XXVDA4 (4x25G)", "intel", 2021, 900, 2, ["Quad-port 25G E810 for consolidated front-end and storage fabrics.", "Four SFP28 ports with full E810 offloads let x86 hosts carry storage, management and tenant networks on one card.", ["Cable count per node", "25G ceiling"]], ["ethernet", "25g", "frontend"]), nicClass: "nic", tech: "eth-100", gbps: 100, ports: 4, pcieGen: 4, pcieLanes: 8, watts: 12, features: ["rdma", "rocev2", "iwarp", "adq"] }),
  nic$1({ ...base$3("intel-e810-cqda2", "Intel Ethernet Adapter E810-CQDA2 (2x100G)", "intel", 2021, 950, 2, ["Dual-port 40/100G E810 on QSFP28.", "The 100G E810 volume SKU: storage heads, NVMe-oF targets and East-West RDMA on Intel servers at a third of a ConnectX price.", ["100G ports: front-end and storage, not GPU rails", "Gen4 host link"]], ["ethernet", "100g", "storage", "roce"]), nicClass: "nic", tech: "eth-100", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 14, features: ["rdma", "rocev2", "iwarp", "nvme-of"] }),
  nic$1({ ...base$3("intel-e810-xxvam2", "Intel Ethernet Adapter E810-XXVAM2 (OCP 3.0, 2x25G)", "intel", 2021.5, 600, 2, ["OCP 3.0 form of the dual-25G E810 for hyperscale boards.", "Same E810 offloads in the mezzanine form factor OCP mothersboards expect, cutting per-node integration cost.", ["OCP 3.0 slots only", "Unverified: exact SKU string may vary"]], ["ethernet", "25g", "ocp3", "unverified"]), nicClass: "nic", tech: "eth-100", gbps: 50, ports: 2, pcieGen: 4, pcieLanes: 8, watts: 9, features: ["rdma", "rocev2", "adq"] }),
  nic$1({ ...base$3("intel-e830-ccin", "Intel Ethernet Adapter E830-CCIN (200G)", "intel", 2023, 1300, 3, ["Intel E830: 200G-per-port step for the Ethernet 800 family.", "E830 raises the lane rate to 100G PAM4 for 200G ports with Gen5 host bandwidth, keeping Intel servers relevant in 200G storage and front-end fabrics.", ["Single 200G port: no dual-port redundancy in this SKU", "Still no GPUDirect-class AI features"]], ["ethernet", "200g", "pcie-gen5"]), nicClass: "nic", tech: "eth-200", gbps: 200, ports: 1, pcieGen: 5, pcieLanes: 16, watts: 16, features: ["rdma", "rocev2", "adq", "ddp"] }),
  nic$1({ ...base$3("amd-elba", "AMD Pensando Elba DPU 800G", "amd", 2026, 3800, 6, ["Fifth-generation Pensando DPU targeting 800G with a large P4-programmable complex.", "Elba follows Salina with doubled flow capacity and more Arm cores, aimed at AI-network infrastructure offload. Roadmap part: dates have already slipped once.", ["Unverified: roadmap specs can slip", "P4 pipeline skills are scarce"]], ["dpu", "800g", "roadmap", "unverified"]), nicClass: "dpu", tech: "eth-800", gbps: 800, ports: 2, pcieGen: 5, pcieLanes: 16, watts: 35, features: ["arm-cores", "p4-programmable", "rdma", "ipsec", "tls", "ovs-offload"] }),
  nic$1({ ...base$3("amd-giglio", "AMD Pensando Giglio DPU 800G", "amd", 2026.5, 3600, 6, ["Next Pensando DPU generation after Salina, aimed at hyperscale AI clouds.", "Giglio is the announced follow-on to Salina with higher port counts and UEC-era features; custom variants (cloud co-designs) dominate demand.", ["Unverified: announced product, not shipping silicon", "Allocation may be cloud-locked"]], ["dpu", "800g", "roadmap", "unverified"]), nicClass: "dpu", tech: "eth-800", gbps: 800, ports: 2, pcieGen: 5, pcieLanes: 16, watts: 30, features: ["arm-cores", "p4-programmable", "rdma", "tls", "ovs-offload"] }),
  nic$1({ ...base$3("amd-pollara800", "AMD Pensando Pollara 800 AI NIC", "amd", 2026.75, 4500, 6, ["Second-generation UEC AI NIC after Pollara 400, aimed at MI400-era clusters.", "Pollara 800 pushes Ultra Ethernet RDMA to 1.6T-class aggregate so AMD-scale clusters keep pace with ConnectX-9 without leaving the open UEC path.", ["Unverified: roadmap part", "UEC software still maturing"]], ["uec", "ai-nic", "roadmap", "unverified"]), nicClass: "nic", tech: "uec-eth", gbps: 1600, ports: 2, pcieGen: 5, pcieLanes: 16, watts: 45, features: ["uec-ready", "rdma", "rocev2", "gpudirect"] }),
  nic$1({ ...base$3("mv-ql41232", "Marvell FastLinQ 41232 (2x100G)", "marvell", 2019.5, 850, 2, ["Dual-port 100G FastLinQ adapter found in millions of OEM servers.", "The 41000 series is the classic Marvell/QLogic 100G workhorse: solid RoCE, low power, deep OEM integration (HPE/Dell ship it as a standard option).", ["No AI-era offloads", "Driver ecosystem smaller than Mellanox/Intel"]], ["ethernet", "100g", "roce", "oem"], 2026), nicClass: "nic", tech: "eth-100", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 17, features: ["rdma", "rocev2", "ovs-offload"] }),
  nic$1({ ...base$3("mv-ql41132", "Marvell FastLinQ 41132 (1x100G)", "marvell", 2019.5, 550, 2, ["Single-port 100G FastLinQ for storage and front-end duty.", "The one-port 41132 halves cost and cabling where a single 100G uplink suffices.", ["Single port: no A/B failover", "Unverified: SKU string approximate"]], ["ethernet", "100g", "storage", "unverified"], 2026), nicClass: "nic", tech: "eth-100", gbps: 100, ports: 1, pcieGen: 4, pcieLanes: 8, watts: 12, features: ["rdma", "rocev2"] }),
  nic$1({ ...base$3("mv-octeon10-98xx", "Marvell OCTEON 10 98XX DPU/SmartNIC", "marvell", 2022, 2200, 4, ["5nm OCTEON 10 smart NIC/DPU with integrated Arm Neoverse cores and crypto.", "OCTEON 10 merges packet processing, Arm compute and inline IPsec/TLS for 5G cores, security appliances and cloud DPUs on a single 5nm chip.", ["Unverified: exact SKU configs vary", "Software stack tuned to Marvell tools, not DOCA/SONiC"]], ["dpu", "smartnic", "arm", "unverified"]), nicClass: "dpu", tech: "eth-400", gbps: 400, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 40, features: ["arm-cores", "p4-programmable", "ipsec", "tls", "compression"] })
];
const CAT_NICS_E = [
  nic$1({ ...base$3("cs-vic-15828", "Cisco UCS VIC 15828 (2x100G mLOM)", "cisco", 2020.5, 1800, 3, ["Fourth-generation Cisco virtual interface card: dual 100G mLOM with PCIe Gen4.", "VIC cards present virtual NICs (VN-Tag) per tenant and policy from UCS Manager, folding networking policy into the server hardware; Gen4 models added RDMA/RoCE support.", ["Only useful inside UCS fabric management", "100G class: not an AI-rail part"]], ["ethernet", "100g", "frontend", "ucs"]), nicClass: "nic", tech: "eth-100", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 15, features: ["rdma", "rocev2", "npar", "uevi"] }),
  nic$1({ ...base$3("cs-vic-15231", "Cisco UCS VIC 15231 (4x25G mLOM)", "cisco", 2020.5, 1200, 2, ["Quad-port 25G VIC for UCS front-end consolidation.", "Four 25G mLOM ports with vNIC partitioning carry management, storage and tenant traffic under UCS policy on one riser.", ["UCS-only value", "25G class"]], ["ethernet", "25g", "frontend", "ucs"]), nicClass: "nic", tech: "eth-100", gbps: 100, ports: 4, pcieGen: 4, pcieLanes: 8, watts: 11, features: ["npar", "uevi"] }),
  nic$1({ ...base$3("cs-vic-15230", "Cisco UCS VIC 15230 (2x25G mLOM)", "cisco", 2020.5, 800, 2, ["Dual-port 25G VIC, the entry UCS front-end card.", "Cheapest way to hang a UCS blade on a 25G fabric with full vNIC policy support.", ["Two ports is thin for bond+storage designs", "Unverified: exact SKU string approximate"]], ["ethernet", "25g", "frontend", "ucs", "unverified"]), nicClass: "nic", tech: "eth-100", gbps: 50, ports: 2, pcieGen: 4, pcieLanes: 8, watts: 9, features: ["npar", "uevi"] }),
  nic$1({ ...base$3("hpe-cassini-200-pcie", "HPE Slingshot Cassini 200G NIC (PCIe)", "hpe", 2021.5, 1600, 4, ["The NIC of HPE Slingshot: 200G PCIe Gen4 card purpose-built for Cray EX HPC/AI systems.", "Cassini implements Slingshot's 128-port roosting, adaptive routing and congestion control, including GPU-direct RDMA for AMD and NVIDIA accelerators in Cray EX compute blades.", ["Only interoperates with Slingshot switches", "Closed-ecosystem: HPE integration required"]], ["hpc", "slingshot", "200g", "rdma"]), nicClass: "nic", tech: "eth-200", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 20, features: ["rdma", "adaptive-routing", "gpudirect", "congestion-control"] }),
  nic$1({ ...base$3("hpe-cassini-200-ocp", "HPE Slingshot Cassini 200G NIC (OCP 3.0)", "hpe", 2022.5, 1500, 4, ["Cassini 200G in the OCP NIC 3.0 form factor.", "Lets OCP-style compute sleds join a Slingshot fabric, extending HPE's interconnect beyond classic Cray blades.", ["Unverified: OCP variant details scarce", "Slingshot switches still required"]], ["hpc", "slingshot", "200g", "ocp3", "unverified"]), nicClass: "nic", tech: "eth-200", gbps: 200, ports: 2, pcieGen: 4, pcieLanes: 16, watts: 20, features: ["rdma", "adaptive-routing", "gpudirect"] }),
  nic$1({ ...base$3("hpe-cassini-400", "HPE Slingshot Cassini 400G NIC", "hpe", 2024.5, 2600, 5, ["400G Cassini for Slingshot 11, doubling per-node bandwidth for exascale AI systems.", "Slingshot 11 doubles port rates while keeping the same adaptive-routing control plane, so existing fabrics scale without redesign.", ["Unverified: announced with Slingshot 11", "400G optics make node cabling expensive"]], ["hpc", "slingshot", "400g", "unverified"]), nicClass: "nic", tech: "eth-400", gbps: 400, ports: 1, pcieGen: 5, pcieLanes: 16, watts: 28, features: ["rdma", "adaptive-routing", "gpudirect", "congestion-control"] })
];
const RAW_NICS = [...CAT_NICS_A, ...CAT_NICS_B, ...CAT_NICS_C, ...CAT_NICS_D, ...CAT_NICS_E];
const CAT_CABLES_A = [
  cb({ ...base$3("fs-dac-25g-2m", "FS SFP28 25G DAC 2m", "fs", 2020, 45, 1, ["Passive 2 m twinax for 25G SFP28 links.", "25G DACs are near-disposable: the SERDES drives copper directly, so front-end cabling costs cents per Gb/s.", ["Cheapest link type sold", "Stiff twinax under 2-3 m only"]], ["dac", "25g", "copper", "frontend"]), cableType: "dac", gbps: 25, maxReachM: 2, wattsPerEnd: 0.3, compatibleTech: ["eth-100", "roce"] }),
  cb({ ...base$3("amphenol-dac-25g-3m", "Amphenol SFP28 25G DAC 3m", "amphenol", 2018, 50, 1, ["3 m passive 25G DAC from a first-tier connector maker.", "Amphenol twinax is the safe-bet brand for patch panels where cheap generics fail acceptance testing.", ["3 m ceiling", "Zero power draw"]], ["dac", "25g", "copper"]), cableType: "dac", gbps: 25, maxReachM: 3, wattsPerEnd: 0.4, compatibleTech: ["eth-100", "roce"] }),
  cb({ ...base$3("molex-aoc-25g-10m", "Molex SFP28 25G AOC 10m", "molex", 2020, 75, 1, ["10 m active optical cable for 25G spans across a row.", "AOCs stretch optical reach to 10-30 m without pluggable-module management; lasers are buried in the connectors.", ["Fixed length: rerigs replace whole cables", "Adds ~1 W per end"]], ["aoc", "25g", "optical"]), cableType: "aoc", gbps: 25, maxReachM: 10, wattsPerEnd: 1, compatibleTech: ["eth-100", "roce"] }),
  cb({ ...base$3("fs-optic-25g-sr", "FS 25G-SR SFP28 optic 100m", "fs", 2019, 55, 1, ["25G-SR duplex multimode transceiver (100 m on OM4).", "The 25G-SR pairs with duplex LC MMF and makes front-end optics nearly as cheap as copper.", ["MMF only: 100 m limit", "Cheap enough to spare liberally"]], ["optic", "25g", "multimode", "frontend"]), cableType: "optic-sr", gbps: 25, maxReachM: 100, wattsPerEnd: 0.8, compatibleTech: ["eth-100", "roce"] }),
  cb({ ...base$3("innolight-optic-25g-lr", "Innolight 25G-LR SFP28 optic 10km", "innolight", 2019, 90, 1, ["Single-lambda 25G-LR duplex optic for 10 km campus spans.", "One 25G wavelength on duplex single-mode covers building-to-building front-end links without CWDM optics.", ["10 km reach at datacenter-optic pricing", "Single lambda: no upgrade path to 40G bidi"]], ["optic", "25g", "singlemode", "frontend"]), cableType: "optic-fr", gbps: 25, maxReachM: 1e4, wattsPerEnd: 1.1, compatibleTech: ["eth-100"] }),
  cb({ ...base$3("fs-dac-50g-2m", "FS SFP56 50G DAC 2m", "fs", 2021, 60, 1, ["Passive 2 m twinax for SFP56 50G links.", "50G-per-lane PAM4 cuts passive reach versus 25G, but 2 m in-rack jumpers still work at copper prices.", ["PAM4 margins: only quality vendors", "2 m max"]], ["dac", "50g", "copper"]), cableType: "dac", gbps: 50, maxReachM: 2, wattsPerEnd: 0.5, compatibleTech: ["eth-100", "roce"] }),
  cb({ ...base$3("molex-aoc-50g-15m", "Molex SFP56 50G AOC 15m", "molex", 2021, 110, 1, ["15 m 50G active optical cable.", "Covers row-to-row 50G hops where copper cannot reach and duplex optics would be overkill.", ["Fixed lengths", "~1.2 W per end"]], ["aoc", "50g", "optical"]), cableType: "aoc", gbps: 50, maxReachM: 15, wattsPerEnd: 1.2, compatibleTech: ["eth-100", "roce"] }),
  cb({ ...base$3("amphenol-dac-100g-1m", "Amphenol QSFP28 100G DAC 1m", "amphenol", 2019, 70, 1, ["1 m passive 100G jumper for switch-to-server in-rack links.", "Short DACs are the default wiring for ToR leaf-to-node at 100G; 1 m versions fit shallow racks and cable managers.", ["0.4 W per end", "Reach too short for wide racks"]], ["dac", "100g", "copper"]), cableType: "dac", gbps: 100, maxReachM: 1, wattsPerEnd: 0.4, compatibleTech: ["eth-100", "roce", "ib-hdr"] }),
  cb({ ...base$3("fs-acc-100g-5m", "FS QSFP28 100G ACC 5m", "fs", 2021, 180, 1, ["Active-conditioned copper stretching 100G to 5 m.", "A retimer in each connector restores the PAM4 eye past passive reach, filling the gap to optics for mid-rack spans.", ["~1.5 W per end", "Small per-unit DSP failure population"]], ["acc", "100g", "copper"]), cableType: "acc", gbps: 100, maxReachM: 5, wattsPerEnd: 1.5, compatibleTech: ["eth-100", "roce", "ib-hdr"] }),
  cb({ ...base$3("fs-aoc-100g-10m", "FS QSFP28 100G AOC 10m", "fs", 2019, 150, 1, ["10 m 100G AOC for leaf-to-spine in-rack hops.", "Buried optics avoid connector dirt and exceed ACC reach at AOC pricing.", ["No field repair", "1 W per end"]], ["aoc", "100g", "optical"]), cableType: "aoc", gbps: 100, maxReachM: 10, wattsPerEnd: 1, compatibleTech: ["eth-100", "roce", "ib-hdr"] }),
  cb({ ...base$3("fs-optic-100g-sr4", "FS 100G-SR4 QSFP28 optic 100m", "fs", 2019, 160, 1, ["4x25G parallel multimode optic on MPO-12.", "100G-SR4 reuses the OM4 MPO plant of 40G-SR4 eras, keeping short-reach optics cheap but trunk-fiber-hungry.", ["Needs MPO-12 multimode plant", "100 m limit on OM4"]], ["optic", "100g", "multimode", "sr4"]), cableType: "optic-sr", gbps: 100, maxReachM: 100, wattsPerEnd: 2.5, compatibleTech: ["eth-100", "roce", "ib-hdr"] }),
  cb({ ...base$3("arista-aoc-100g-15m", "Arista 100G AOC 15m", "arista", 2020, 170, 1, ["Arista-branded 15 m active optical cable for EOS fabrics.", "Buying the switch vendor's AOC keeps single-vendor optics support for the fabric warranty.", ["Premium over white-label equivalents", "Fixed length"]], ["aoc", "100g", "optical"]), cableType: "aoc", gbps: 100, maxReachM: 15, wattsPerEnd: 1.2, compatibleTech: ["eth-100", "roce"] })
];
const CAT_CABLES_B = [
  cb({ ...base$3("cisco-optic-100g-fr1", "Cisco 100G-FR QSFP28 optic 2km", "cisco", 2019, 200, 2, ["Single-lambda 100G duplex optic for 2 km.", "100G-FR needs only ordinary duplex single-mode, making it the campus-ring workhorse for Cisco fabrics.", ["Cheap fiber plant: duplex LC everywhere", "2 km overkill inside a hall"]], ["optic", "100g", "singlemode", "fr1"]), cableType: "optic-fr", gbps: 100, maxReachM: 2e3, wattsPerEnd: 1.5, compatibleTech: ["eth-100", "roce"] }),
  cb({ ...base$3("coherent-optic-100g-lr4", "Coherent (Finisar) 100G-LR4 optic 10km", "coherent", 2018, 300, 2, ["Classic 4x25G CWDM 100G optic for 10 km.", "LR4 launched the 100G era; Coherent/Finisar parts are the fleet-standard spares on duplex single-mode rings.", ["4 wavelengths: CWDM alignment matters", "Superseded by cheaper FR1 inside datacenters"]], ["optic", "100g", "singlemode", "lr4"]), cableType: "optic-fr", gbps: 100, maxReachM: 1e4, wattsPerEnd: 3.5, compatibleTech: ["eth-100", "roce"] }),
  cb({ ...base$3("fs-breakout-100g-4x25-dac", "QSFP28 100G to 4xSFP28 breakout DAC 1m", "fs", 2019, 80, 1, ["Breakout copper: one 100G port fans out to four 25G servers.", "Breakout DACs quadruple front-end port counts on leaf switches without buying more switch ports.", ["Server ports limited to 25G", "Breakout pairs must stay on matching switch groups"]], ["dac", "100g", "breakout", "frontend"]), cableType: "dac", gbps: 100, maxReachM: 1, wattsPerEnd: 0.5, compatibleTech: ["eth-100", "roce"] }),
  cb({ ...base$3("fs-dac-200g-2m", "FS QSFP56 200G DAC 2m", "fs", 2022, 130, 1, ["Passive 200G twinax jumper.", "At 200G (4x50G PAM4) passive copper still manages 2 m, keeping in-rack links at commodity prices.", ["PAM4 eye margins demand quality cable", "2 m ceiling"]], ["dac", "200g", "copper"]), cableType: "dac", gbps: 200, maxReachM: 2, wattsPerEnd: 0.8, compatibleTech: ["eth-200", "roce"] }),
  cb({ ...base$3("amphenol-acc-200g-3m", "Amphenol QSFP56 200G ACC 3m", "amphenol", 2022, 220, 1, ["Active-conditioned 200G copper for 3 m spans.", "Retimers stretch 200G copper past passive limits for mid-rack and adjacent-rack hops.", ["~2 W per end", "Adds a DSP to every link"]], ["acc", "200g", "copper"]), cableType: "acc", gbps: 200, maxReachM: 3, wattsPerEnd: 2, compatibleTech: ["eth-200", "roce"] }),
  cb({ ...base$3("eoptolink-optic-200g-sr2", "Eoptolink 200G-SR2 QSFP56 optic 70m", "eoptolink", 2022.5, 450, 2, ["2x100G PAM4 multimode optic on duplex MMF patch leads.", "200G-SR2 runs two 100G PAM4 lanes over duplex OM4, avoiding MPO trunks for short 200G hops.", ["Duplex fiber: simple patching", "70 m multimode ceiling"]], ["optic", "200g", "multimode", "sr2"]), cableType: "optic-sr", gbps: 200, maxReachM: 70, wattsPerEnd: 3, compatibleTech: ["eth-200", "roce"] }),
  cb({ ...base$3("innolight-optic-200g-dr4", "Innolight 200G-DR4 QSFP56 optic 500m", "innolight", 2022, 600, 2, ["4x50G PAM4 single-mode optic to 500 m on MPO.", "200G-DR4 covers building-scale 200G hops with the same MPO-12 discipline as 400G DR4.", ["MPO ribbon plant required", "4 W per end"]], ["optic", "200g", "singlemode", "dr4"]), cableType: "optic-dr", gbps: 200, maxReachM: 500, wattsPerEnd: 4, compatibleTech: ["eth-200", "roce", "ib-hdr"] }),
  cb({ ...base$3("fs-optic-200g-fr4", "FS 200G-FR4 QSFP56 optic 2km", "fs", 2022, 550, 2, ["4x50G CWDM duplex optic for 2 km 200G spans.", "FR4 keeps 200G on ordinary duplex single-mode, ideal for campus fabric rings and DCI-lite links.", ["Duplex plant only", "Rarely needed inside one hall"]], ["optic", "200g", "singlemode", "fr4"]), cableType: "optic-fr", gbps: 200, maxReachM: 2e3, wattsPerEnd: 4.5, compatibleTech: ["eth-200", "roce"] }),
  cb({ ...base$3("nvidia-linkx-aoc-200g-10m", "NVIDIA LinkX 200G AOC 10m", "nvidia", 2021.5, 350, 2, ["NVIDIA-qualified 200G AOC for ConnectX-6 Dx era clusters.", "LinkX parts carry NVIDIA interoperability validation, which matters for Quantum/RoCE certification support.", ["Brand premium over generic AOCs", "10 m class reach"]], ["aoc", "200g", "linkx"]), cableType: "aoc", gbps: 200, maxReachM: 10, wattsPerEnd: 3, compatibleTech: ["eth-200", "roce", "ib-hdr"] }),
  cb({ ...base$3("molex-breakout-200g-2x100-dac", "QSFP56 200G to 2xQSFP28 breakout DAC 1m", "molex", 2022, 150, 1, ["Breakout copper: 200G port to two 100G hosts.", "Halves the leaf-port bill for 100G servers while the switch runs 200G silicon.", ["Host capped at 100G", "Breakout lane mapping must match switch config"]], ["dac", "200g", "breakout"]), cableType: "dac", gbps: 200, maxReachM: 1, wattsPerEnd: 0.6, compatibleTech: ["eth-200", "roce"] }),
  cb({ ...base$3("fs-breakout-400g-4x100-dac", "QSFP-DD 400G to 4xQSFP28 breakout DAC 1.5m", "fs", 2022, 300, 1, ["Breakout copper: 400G port to four 100G servers.", "The classic way to run 100G server farms off 400G Tomahawk/Spectrum leaves at minimum cost per server port.", ["1.5 m: switch must sit mid-rack", "Four-trunk stiffness is a cable-management tax"]], ["dac", "400g", "breakout"]), cableType: "dac", gbps: 400, maxReachM: 1.5, wattsPerEnd: 1, compatibleTech: ["eth-400", "roce"] })
];
const CAT_CABLES_C = [
  cb({ ...base$3("amphenol-acc-400g-3m", "Amphenol QSFP-DD 400G ACC 3m", "amphenol", 2022.5, 450, 1, ["Active-conditioned 400G copper for 3 m spans.", "400G PAM4 needs retimers past 2 m; ACCs keep copper economics for adjacent-rack hops.", ["2.5 W per end", "DSP adds per-link failure modes"]], ["acc", "400g", "copper"]), cableType: "acc", gbps: 400, maxReachM: 3, wattsPerEnd: 2.5, compatibleTech: ["eth-400", "roce", "ib-ndr"] }),
  cb({ ...base$3("molex-breakout-400g-2x200-dac", "QSFP-DD 400G to 2xQSFP56 breakout DAC 1m", "molex", 2022.5, 280, 1, ["Breakout copper: 400G leaf port to two 200G hosts.", "Bridges 400G switch generations to 200G servers during fabric transitions.", ["Lane-mapping must match switch breakout config", "1 m reach only"]], ["dac", "400g", "breakout"]), cableType: "dac", gbps: 400, maxReachM: 1, wattsPerEnd: 1, compatibleTech: ["eth-400", "roce"] }),
  cb({ ...base$3("fs-aoc-400g-5m", "FS QSFP-DD 400G AOC 5m", "fs", 2022, 380, 1, ["Short 400G AOC for in-rack and in-row hops.", "Buried optics beat ACC reach and add only ~4 W per end, the volume wiring for 400G rows.", ["Fixed length", "No connector cleaning possible"]], ["aoc", "400g", "optical"]), cableType: "aoc", gbps: 400, maxReachM: 5, wattsPerEnd: 4, compatibleTech: ["eth-400", "roce", "ib-ndr"] }),
  cb({ ...base$3("nvidia-linkx-sr4-400g", "NVIDIA LinkX 400G-SR4 MMF optic 70m", "nvidia", 2021, 1600, 2, ["NVIDIA-qualified multimode 400G optic (8x50G lanes over MPO).", "SR-class LinkX optics pair with Spectrum/Quantum switches for short-reach AI fabrics on cheap multimode fiber.", ["Multimode plant: 70 m cap", "8 lanes need MPO-16 trunks"]], ["optic", "400g", "multimode", "linkx", "sr4"]), cableType: "optic-sr", gbps: 400, maxReachM: 70, wattsPerEnd: 3.5, compatibleTech: ["eth-400", "ib-ndr", "roce"] }),
  cb({ ...base$3("nvidia-linkx-dr4-400g-500m", "NVIDIA LinkX 400G-DR4 SMF optic 500m", "nvidia", 2021.5, 1200, 2, ["LinkX 400G-DR4: 4x100G PAM4 over single-mode MPO to 500 m.", "The default NVIDIA-recommended optic for row-to-spine 400G runs; NVIDIA certification feeds Quantum/Spectrum RMA and support paths.", ["Single-vendor premium over generics", "MPO-12/16 single-mode plant required"]], ["optic", "400g", "singlemode", "linkx", "dr4"]), cableType: "optic-dr", gbps: 400, maxReachM: 500, wattsPerEnd: 4.5, compatibleTech: ["eth-400", "ib-ndr", "roce"] }),
  cb({ ...base$3("nvidia-linkx-fr4-400g-2km", "NVIDIA LinkX 400G-FR4 SMF optic 2km", "nvidia", 2021.5, 1400, 2, ["LinkX 400G-FR4 duplex optic for 2 km runs.", "4x100G CWDM lambdas over ordinary duplex LC: the choice for building-to-building NVIDIA fabric extensions.", ["Reuses duplex fiber plant", "Highest-power 400G LinkX class at ~4 W"]], ["optic", "400g", "singlemode", "linkx", "fr4"]), cableType: "optic-fr", gbps: 400, maxReachM: 2e3, wattsPerEnd: 4, compatibleTech: ["eth-400", "roce", "spectrum-x"] }),
  cb({ ...base$3("cisco-optic-400g-sr8-70m", "Cisco QSFP-DD 400G-SR8 optic 70m", "cisco", 2021, 1500, 2, ["Cisco multimode 400G optic: 8x50G PAM4 lanes.", "SR8 is the short-reach choice for Nexus-based AI fabrics on OM4 MPO trunks, with Cisco optics-OS integration (DOM, FEC tuning).", ["MPO-16 multimode plant", "70 m ceiling"]], ["optic", "400g", "multimode", "sr8"]), cableType: "optic-sr", gbps: 400, maxReachM: 70, wattsPerEnd: 3.5, compatibleTech: ["eth-400", "roce"] }),
  cb({ ...base$3("cisco-optic-400g-fr4-2km", "Cisco QSFP-DD 400G-FR4 optic 2km", "cisco", 2021.5, 1600, 2, ["Cisco duplex 400G optic for 2 km campus links.", "FR4 keeps Nexus fabric rings on duplex single-mode with full Cisco telemetry integration.", ["Duplex plant only", "Priced for campus, not in-hall use"]], ["optic", "400g", "singlemode", "fr4"]), cableType: "optic-fr", gbps: 400, maxReachM: 2e3, wattsPerEnd: 4, compatibleTech: ["eth-400", "roce"] }),
  cb({ ...base$3("arista-optic-400g-dr4-500m", "Arista 400G-DR4 optic 500m", "arista", 2021.5, 1100, 2, ["Arista-branded 400G-DR4 for EOS fabrics.", "Same 4x100G PAM4 single-mode recipe with Arista optics-OS support; buying vendor optics keeps EOS validation clean.", ["Vendor premium over FS/Innolight equivalents", "MPO plant needed"]], ["optic", "400g", "singlemode", "dr4"]), cableType: "optic-dr", gbps: 400, maxReachM: 500, wattsPerEnd: 4.5, compatibleTech: ["eth-400", "roce"] }),
  cb({ ...base$3("eoptolink-optic-400g-sr8-70m", "Eoptolink 400G-SR8 optic 70m", "eoptolink", 2022.5, 950, 2, ["Volume-market multimode 400G optic from a top-tier Chinese module maker.", "Eoptolink SR8 undercut branded optics sharply after 2022, which is why hyperscaler 400G MMF fabrics got cheap fast.", ["Price erosion story: half of 2021 pricing", "Qualify vendors: batch variation exists"]], ["optic", "400g", "multimode", "sr8"]), cableType: "optic-sr", gbps: 400, maxReachM: 70, wattsPerEnd: 3.5, compatibleTech: ["eth-400", "roce", "ib-ndr"] }),
  cb({ ...base$3("coherent-optic-400g-fr4-2km", "Coherent 400G-FR4 optic 2km", "coherent", 2022, 1500, 2, ["Coherent (II-VI/Finisar) 400G duplex optic.", "The Finisar lineage makes this the fleet-standard FR4 spare for multi-vendor 400G fabrics.", ["Brand safety for mixed-vendor fleets", "Duplex reach wasted in-hall"]], ["optic", "400g", "singlemode", "fr4"]), cableType: "optic-fr", gbps: 400, maxReachM: 2e3, wattsPerEnd: 4, compatibleTech: ["eth-400", "roce", "spectrum-x"] })
];
const CAT_CABLES_D = [
  cb({ ...base$3("fs-optic-400g-lr4-10km", "FS 400G-LR4 optic 10km", "fs", 2023, 4500, 2, ["4x100G CWDM duplex optic for 10 km 400G spans.", "LR4 is the metro-campus 400G optic: two-fiber plant, 10 km, and 6-8 W per end that dwarfs in-hall optics.", ["Expensive per port", "10 km reach only pays off between buildings"]], ["optic", "400g", "singlemode", "lr4"]), cableType: "optic-fr", gbps: 400, maxReachM: 1e4, wattsPerEnd: 6.5, compatibleTech: ["eth-400", "roce"] }),
  cb({ ...base$3("innolight-optic-400g-dr4-500m", "Innolight 400G-DR4 optic 500m", "innolight", 2023, 700, 2, ["Volume-market 400G-DR4 from the world's largest transceiver maker.", "Innolight scale drove 400G DR4 pricing toward 700 USD by 2023-24, reshaping hyperscaler fabric BOMs.", ["Sharpest price in the market", "Volume batches need incoming qualification"]], ["optic", "400g", "singlemode", "dr4"]), cableType: "optic-dr", gbps: 400, maxReachM: 500, wattsPerEnd: 4.5, compatibleTech: ["eth-400", "roce", "ib-ndr"] }),
  cb({ ...base$3("fs-dac-800g-1m", "OSFP 800G DAC 1m", "fs", 2024.5, 550, 1, ["Passive 1 m twinax for 800G ports.", "At 800G passive copper survives barely a meter, which is why NVL-style racks put leaves within arm's reach of nodes.", ["1 m or less: layout pinning", "PAM4 112G lanes: only tier-1 cable plants"]], ["dac", "800g", "copper"]), cableType: "dac", gbps: 800, maxReachM: 1, wattsPerEnd: 1.2, compatibleTech: ["eth-800", "ib-xdr"] }),
  cb({ ...base$3("te-acc-800g-3m", "TE Connectivity 800G ACC 3m", "te", 2024.5, 800, 2, ["Active copper for 800G in-row links.", "TE's connector and DSP integration stretches 800G copper to 3 m at a quarter of optic cost, the default NVL72-style cabling.", ["~4 W per end", "3 m keeps the whole fabric in one row"]], ["acc", "800g", "copper"]), cableType: "acc", gbps: 800, maxReachM: 3, wattsPerEnd: 4, compatibleTech: ["eth-800", "ib-xdr", "spectrum-x"] }),
  cb({ ...base$3("fs-aoc-800g-5m", "FS OSFP 800G AOC 5m", "fs", 2024.75, 850, 2, ["Short 800G AOC for in-rack hops.", "AOCs skip the 16 W pluggable-800G tax: buried optics run near 6 W per end for rack-scale hops.", ["Fixed length", "Failure means whole-cable swap"]], ["aoc", "800g", "optical"]), cableType: "aoc", gbps: 800, maxReachM: 5, wattsPerEnd: 6, compatibleTech: ["eth-800", "ib-xdr"] }),
  cb({ ...base$3("innolight-aoc-800g-15m", "Innolight 800G AOC 15m", "innolight", 2025, 1100, 2, ["Longer-reach 800G AOC for row-to-row hops.", "15 m AOCs cover adjacent-row 800G links without pluggable optics and their connector-loss headaches.", ["~8 W per end", "Cable bulk at 15 m is a routing exercise"]], ["aoc", "800g", "optical"]), cableType: "aoc", gbps: 800, maxReachM: 15, wattsPerEnd: 8, compatibleTech: ["eth-800", "ib-xdr", "spectrum-x"] }),
  cb({ ...base$3("eoptolink-optic-800g-sr8-70m", "Eoptolink 800G-SR8 OSFP optic 70m", "eoptolink", 2024.75, 2400, 2, ["Multimode 800G optic: 8x100G PAM4 VCSEL lanes.", "SR8 keeps multimode economics alive at 800G; Eoptolink volume pricing came in well under branded equivalents by 2025.", ["~15 W per end: optics power matters", "MPO-16 multimode plant"]], ["optic", "800g", "multimode", "sr8"]), cableType: "optic-sr", gbps: 800, maxReachM: 70, wattsPerEnd: 15, compatibleTech: ["eth-800", "ib-xdr", "spectrum-x"] }),
  cb({ ...base$3("coherent-optic-800g-dr8-500m", "Coherent 800G-DR8 optic 500m", "coherent", 2024.75, 3400, 3, ["8x100G PAM4 single-mode optic to 500 m.", "Coherent's Finisar-lineage DR8 is the mixed-fleet-safe 800G single-mode part for row-to-spine hops.", ["16 W per end", "MPO-16 single-mode ribbon plant"]], ["optic", "800g", "singlemode", "dr8"]), cableType: "optic-dr", gbps: 800, maxReachM: 500, wattsPerEnd: 16, compatibleTech: ["eth-800", "ib-xdr", "spectrum-x"] }),
  cb({ ...base$3("arista-optic-800g-2fr4-2km", "Arista 800G-2xFR4 optic 2km", "arista", 2025, 4400, 3, ["Arista duplex 800G optic: two independent 400G FR4 sublinks.", "2xFR4 puts 800G on ordinary duplex fiber, letting EOS campus spines scale without ribbon rework.", ["Two optical submodules: priciest 800G class", "Breaks into 2x400G only with matching config"]], ["optic", "800g", "singlemode", "2fr4"]), cableType: "optic-fr", gbps: 800, maxReachM: 2e3, wattsPerEnd: 18, compatibleTech: ["eth-800", "spectrum-x"] }),
  cb({ ...base$3("nvidia-linkx-2dr4-800g", "NVIDIA LinkX 800G-2xDR4 optic 500m", "nvidia", 2025, 3600, 3, ["OSFP 800G optic presenting two independent 400G-DR4 links.", "2xDR4 lets one 800G switch port feed two 400G fabric planes or hosts, halving switch-port cost in transitional fabrics.", ["Unverified: exact LinkX SKU string", "Sublinks must be configured as separate ports"]], ["optic", "800g", "singlemode", "2dr4", "linkx", "unverified"]), cableType: "optic-dr", gbps: 800, maxReachM: 500, wattsPerEnd: 16, compatibleTech: ["eth-800", "ib-xdr", "spectrum-x"] }),
  cb({ ...base$3("nvidia-linkx-acc-800g-2m", "NVIDIA LinkX 800G ACC 2m", "nvidia", 2024.5, 700, 2, ["NVIDIA-qualified active copper for 800G rails.", "The LinkX ACC is the NVIDIA-validated in-rack cabling for Spectrum-X/Quantum-2 rails, with RMA support behind it.", ["2 m reach", "Unverified: exact P/N varies by OSFP vs QSFP-DD"]], ["acc", "800g", "linkx", "unverified"]), cableType: "acc", gbps: 800, maxReachM: 2, wattsPerEnd: 3.5, compatibleTech: ["eth-800", "ib-xdr", "spectrum-x"] }),
  cb({ ...base$3("fs-breakout-800g-osfp-2x400-dac", "OSFP 800G to 2xQSFP112 breakout DAC 1m", "fs", 2024.5, 650, 1, ["Breakout copper: 800G port to two 400G hosts.", "Runs 400G CX-7 hosts off 800G Spectrum-4/Tomahawk-5 leaves, halving the leaf count during 800G transitions.", ["1 m: leaves must sit beside hosts", "Both sublinks must terminate in matching hosts"]], ["dac", "800g", "breakout"]), cableType: "dac", gbps: 800, maxReachM: 1, wattsPerEnd: 1.2, compatibleTech: ["eth-800", "ib-xdr"] })
];
const CAT_CABLES_E = [
  cb({ ...base$3("molex-breakout-800g-osfp-4x200-dac", "OSFP 800G to 4xQSFP56-DD breakout DAC 1m", "molex", 2025, 700, 2, ["Breakout copper: 800G port to four 200G hosts.", "The widest breakout sold: feeds 200G storage or compute rails off 800G leaves, though cable bulk gets serious.", ["Unverified: narrow-market SKU", "Four-trunk stiffness"]], ["dac", "800g", "breakout", "unverified"]), cableType: "dac", gbps: 800, maxReachM: 1, wattsPerEnd: 1.2, compatibleTech: ["eth-800"] }),
  cb({ ...base$3("fs-acc-1600g-2m", "OSFP224 1.6T ACC 2m", "fs", 2026.5, 1800, 3, ["Retimed copper for 1.6T in-rack links.", "224G lane signaling kills passive copper past ~1 m; ACC DSPs claw back to 2 m at a fraction of optic cost.", ["Unverified: 224G ACC is early hardware", "~5 W per end"]], ["acc", "1600g", "copper", "unverified"]), cableType: "acc", gbps: 1600, maxReachM: 2, wattsPerEnd: 5, compatibleTech: ["eth-1600", "ib-gdr"] }),
  cb({ ...base$3("coherent-aoc-1600g-5m", "Coherent 1.6T AOC 5m", "coherent", 2026.5, 2600, 3, ["Integrated-optics 1.6T AOC for rack-scale hops.", "Burying the lasers avoids 25 W-class pluggable optics and connector margins that barely close at 224G lanes.", ["Unverified: first-gen part", "~12 W per end still lands in the power budget"]], ["aoc", "1600g", "optical", "unverified"]), cableType: "aoc", gbps: 1600, maxReachM: 5, wattsPerEnd: 12, compatibleTech: ["eth-1600", "ib-gdr"] }),
  cb({ ...base$3("innolight-optic-1600g-dr8-500m", "Innolight 1.6T-DR8 optic 500m", "innolight", 2026.5, 5200, 3, ["8x200G PAM4 single-mode optic: the first 1.6T transceiver at volume.", "Innolight ships the bulk of early 1.6T DR8 for ConnectX-9/Quantum-X generation fabrics; 200G lanes run at the edge of signaling capability.", ["~24 W per end", "Tight margins: burn-in matters"]], ["optic", "1600g", "singlemode", "dr8"]), cableType: "optic-dr", gbps: 1600, maxReachM: 500, wattsPerEnd: 24, compatibleTech: ["eth-1600", "ib-gdr"] }),
  cb({ ...base$3("eoptolink-optic-1600g-2fr4-2km", "Eoptolink 1.6T-2xFR4 optic 2km", "eoptolink", 2026.75, 5800, 3, ["Duplex 1.6T optic: two independent 800G FR4 sublinks.", "Keeps 1.6T on ordinary two-fiber plant for campus spines where ribbon rework is unthinkable.", ["Unverified: very early part", "Highest power draw of any pluggable (~26 W)"]], ["optic", "1600g", "singlemode", "2fr4", "unverified"]), cableType: "optic-fr", gbps: 1600, maxReachM: 2e3, wattsPerEnd: 26, compatibleTech: ["eth-1600", "spectrum-x"] }),
  cb({ ...base$3("nvidia-linkx-1600g-2dr4", "NVIDIA LinkX 1.6T-2xDR4 optic 500m", "nvidia", 2026.75, 5600, 3, ["NVIDIA 1.6T optic split as two 800G-DR4 links.", "The Quantum-X/Spectrum-X photonics era pattern: one OSFP-XD port feeds two 800G planes, halving switch-port count again.", ["Unverified: roadmap optic", "Each sublink needs its own fabric plane"]], ["optic", "1600g", "singlemode", "2dr4", "linkx", "unverified"]), cableType: "optic-dr", gbps: 1600, maxReachM: 500, wattsPerEnd: 22, compatibleTech: ["eth-1600", "ib-gdr", "spectrum-x"] }),
  cb({ ...base$3("amphenol-mpo16-om4-15m", "Amphenol MPO-16 OM4 trunk 15m", "amphenol", 2022, 180, 1, ["Passive 16-fiber multimode trunk feeding SR8 optics.", "Pre-terminated MPO trunks replace per-lane patching in SR8 fabrics; polarity (Method B/C) mistakes are the classic install bug.", ["Passive: 0 W", "One bad MPO ferrule kills a whole 400G link"]], ["mpo", "multimode", "trunk", "sr8"]), cableType: "optic-sr", gbps: 800, maxReachM: 15, wattsPerEnd: 0, compatibleTech: ["eth-400", "eth-800", "ib-ndr", "ib-xdr"] }),
  cb({ ...base$3("amphenol-mpo16-os2-50m", "Amphenol MPO-16 OS2 trunk 50m", "amphenol", 2023, 260, 1, ["Single-mode 16-fiber ribbon trunk for cross-row DR8/SR8 runs.", "Ribbon single-mode trunks are how 800G fabrics cross rows without 16 individual patch cords; testing each fiber (MPO-pro) is mandatory.", ["Passive: 0 W", "Fiber-level fault isolation needs MPO test gear"]], ["mpo", "singlemode", "trunk", "dr8"]), cableType: "optic-dr", gbps: 800, maxReachM: 50, wattsPerEnd: 0, compatibleTech: ["eth-400", "eth-800", "ib-xdr"] }),
  cb({ ...base$3("fs-mpo16-om4-30m", "FS MPO-16 OM4 trunk 30m", "fs", 2022.5, 200, 1, ["30 m multimode MPO trunk for hall-scale SR8 plants.", "The commodity version of the SR8 trunk plant: cheap enough to over-provision fiber so ports never strand on cable scarcity.", ["Passive: 0 W", "MMF attenuation: 70 m optic ceiling still applies"]], ["mpo", "multimode", "trunk"]), cableType: "optic-sr", gbps: 800, maxReachM: 30, wattsPerEnd: 0, compatibleTech: ["eth-400", "eth-800"] }),
  cb({ ...base$3("fs-mpo12-om4-15m", "FS MPO-12 OM4 trunk 15m", "fs", 2019, 90, 1, ["12-fiber multimode trunk for 100G-SR4 era plants.", "The 100G-SR4 trunk pattern: 8 fibers live, 4 spare, one MPO instead of four duplex LC pairs.", ["Passive: 0 W", "Legacy geometry: not reusable for SR8/MPO-16"]], ["mpo", "multimode", "trunk", "sr4"]), cableType: "optic-sr", gbps: 100, maxReachM: 15, wattsPerEnd: 0, compatibleTech: ["eth-100", "ib-hdr"] }),
  cb({ ...base$3("nv-nvlink4-harness", "NVIDIA NVLink4 GPU-NVSwitch copper harness", "nvidia", 2022.5, 1800, 4, ["The internal copper harness cabling each HGX H100 GPU board to its NVSwitch baseboard.", "HGX H100 boards carry 900 GB/s of NVLink4 per GPU across short precision twinax; the harness is why 8 GPUs form one coherent memory domain on one baseboard.", ["Unverified: internal part, sold only via integrators", "A failed harness partitions the GPU domain"]], ["nvlink", "copper", "scale-up", "h100-era"]), cableType: "nvlink-spine", gbps: 7200, maxReachM: 0.7, wattsPerEnd: 1, compatibleTech: ["nvlink4"] }),
  cb({ ...base$3("nv-nvlink3-bridge", "NVIDIA NVLink3 2-GPU bridge (A100)", "nvidia", 2020.5, 350, 2, ["Passive bridge connecting two A100/HGX boards across all 12 NVLink3 links.", "The A100 scale-up topology: 600 GB/s per GPU realized with chunky passive bridges between adjacent SXM sockets, not cables to a switch.", ["Pairs only: domain size capped at 2 without NVSwitch", "Bridge seating errors cause silent link drops"]], ["nvlink", "copper", "scale-up", "a100-era"]), cableType: "nvlink-spine", gbps: 4800, maxReachM: 0.1, wattsPerEnd: 0, compatibleTech: ["nvlink3"] })
];
const CAT_CABLES_F = [
  cb({ ...base$3("amphenol-power-c19-locking", "Amphenol locking IEC C19/C20 cord 3m", "amphenol", 2018, 45, 1, ["Twist-lock C19 power cord for PDUs feeding high-draw PSUs.", "Locking C19s stop the classic 2 a.m. incident: a server cord vibrated out of a PDU during a maintenance shuffle.", ["Rated 16 A / ~3.7 kW per circuit", "Cord density still breaks above ~20 kW per rack"]], ["power", "pdu", "c19"]), cableType: "power", gbps: 0, maxReachM: 3, wattsPerEnd: 0, compatibleTech: [] }),
  cb({ ...base$3("gen-liquid-hose-1in", "Liquid cooling hose set 1in QD 10m", "generic", 2022, 150, 1, ["One-inch supply/return quick-disconnect hose set for lower-density DLC rows.", "Half-inch/1-inch loops carry roughly 20-40 kW per rack comfortably; the 2-inch sets are for NVL-class densities.", ["Lower flow: per-rack kW capped", "Still needs leak detection and dripless QDs"]], ["liquid", "dlc", "hose"]), cableType: "liquid-hose", gbps: 0, maxReachM: 10, wattsPerEnd: 0, compatibleTech: [] })
];
const RAW_CABLES = [
  ...CAT_CABLES_A,
  ...CAT_CABLES_B,
  ...CAT_CABLES_C,
  ...CAT_CABLES_D,
  ...CAT_CABLES_E,
  ...CAT_CABLES_F
];
const v$3 = (id, name, sells, summary) => ({
  id,
  name,
  sells,
  reliability: 0.92,
  support: 0.88,
  volumeDiscountPerDoublingPct: 4,
  codex: { summary, explain: `${name} supplies interconnect hardware. Optics and cables are commodity-like, but batch quality and RMA speed decide fabric availability, so vendor mix matters even at scale.`, tradeoffs: ["Sharp pricing at volume", "Qualify vendors before fleet-wide rollout"], tags: [] }
});
const CAT_NIC_VENDORS = [
  { ...v$3("fs", "FS.com", ["cable"], "Volume networking-components reseller: DACs, AOCs and transceivers at aggressive prices."), reliability: 0.88, support: 0.82 },
  v$3("innolight", "Innolight", ["cable"], "World's largest optical transceiver maker; drives 400G/800G module pricing for hyperscalers."),
  v$3("eoptolink", "Eoptolink", ["cable"], "Top-tier Chinese transceiver maker known for aggressive 400G/800G pricing."),
  v$3("coherent", "Coherent (II-VI/Finisar)", ["cable"], "Finisar-lineage transceiver maker; the multi-vendor-safe optics brand."),
  v$3("amphenol", "Amphenol", ["cable"], "First-tier connector and cable-assembly maker: DACs, MPO trunks and power cords."),
  v$3("te", "TE Connectivity", ["cable"], "Connector giant with high-speed ACC/copper assemblies for AI racks."),
  v$3("molex", "Molex", ["cable"], "Connector maker with AOC, breakout DAC and high-density cable assemblies."),
  v$3("marvell", "Marvell", ["nic", "switch"], "Merchant silicon house: OCTEON DPUs and FastLinQ adapters behind OEM-ship NICs.")
];
const NIC_FIX = {
  "nv-cx7-ocp3": { gbps: 400, ports: 2, tech: "eth-400" },
  // CX-7 tops out at 400G aggregate
  "nv-cx8-ocp3": { gbps: 800, ports: 2, tech: "eth-800" },
  // CX-8 SuperNIC is 800G
  "nv-bf3-supernic": { gbps: 400, ports: 1, tech: "eth-400" },
  // BlueField-3 SuperNIC B3140H: 1 x 400G
  "cb-p1800gd": { gbps: 800, ports: 1 },
  // Thor Ultra: single 800G
  "amd-elba": { gbps: 200, ports: 2, tech: "eth-200", availableFrom: 2021 },
  // Pensando DSC-200 (2 x 100/200G class)
  "amd-giglio": { gbps: 200, ports: 2, tech: "eth-200", availableFrom: 2023 },
  "amd-pollara800": { gbps: 800, ports: 1, availableFrom: 2026.5 },
  // Vulcano-class 800G UEC NIC (roadmap)
  "cs-vic-15231": { gbps: 200, ports: 2 }
  // 2 x 100G mLOM
};
const CAT_NICS = RAW_NICS.map((n) => NIC_FIX[n.id] ? { ...n, ...NIC_FIX[n.id], codex: { ...n.codex, tags: [...n.codex.tags ?? [], ...NIC_FIX[n.id].gbps ? [] : []] } } : n);
const CAT_CABLES = RAW_CABLES.filter((c) => !/-mpo\d+-/.test(c.id));
const sw$2 = (id, name, vendor, role, tech, launch, priceUSD, lead, ports, portGbps, capTbps, units, watts, summary, explain, tradeoffs, tags, opts = {}) => ({
  id,
  name,
  vendor,
  kind: "switch",
  role,
  tech,
  availableFrom: launch,
  priceUSD,
  leadTimeMonths: lead,
  portCount: ports,
  portGbps,
  capacityTbps: capTbps,
  rackUnits: units,
  watts,
  cooling: ["air"],
  features: tags,
  ...opts,
  codex: { summary, explain, tradeoffs, tags }
});
const CAT_SWITCHES_A = [
  // ---------- NVIDIA Spectrum / Quantum ----------
  sw$2(
    "nv-sn5400",
    "NVIDIA Spectrum-4 SN5400 (64x400G)",
    "nvidia",
    "scale-out",
    "eth-400",
    2024.75,
    85e3,
    5,
    64,
    400,
    25.6,
    1,
    700,
    "Spectrum-4 SN5400: 64x 400GbE OSFP in 1U (25.6 Tb/s).",
    "Same Spectrum-4 generation as the SN5600 but pinned at 400G per port, so teams standardised on 400G optics still get the Spectrum-4 telemetry and RoCEv2 stack.",
    ["400G optics keep the BOM cheaper than 800G", "Half the fabric bandwidth of SN5600"],
    ["spectrum-4", "400g", "roce", "ethernet"]
  ),
  sw$2(
    "nv-sn4700",
    "NVIDIA Spectrum-3 SN4700 (32x400G)",
    "nvidia",
    "scale-out",
    "eth-400",
    2021.5,
    6e4,
    4,
    32,
    400,
    12.8,
    1,
    450,
    "Spectrum-3 SN4700: 32x 400GbE OSFP in 1U (12.8 Tb/s).",
    "Spectrum-3 brought OSFP cages, enhanced RoCEv2 tuning and telemetry; SN4700 powered many pre-Spectrum-4 GPU backends and storage fabrics.",
    ["Cheaper 400G entry than Spectrum-4", "Half the radix of 64-port Spectrum-4 boxes"],
    ["spectrum-3", "400g", "roce"]
  ),
  sw$2(
    "nv-sn4600c",
    "NVIDIA Spectrum-3 SN4600C (64x200G + 400G uplinks)",
    "nvidia",
    "scale-out",
    "eth-200",
    2020.5,
    7e4,
    4,
    64,
    200,
    16,
    1,
    500,
    "Spectrum-3 SN4600C: 64x 200GbE QSFP56 plus 400G-capable cage group in 1U.",
    "The 200G-dense Spectrum-3 SKU: leaf for 200G-connected nodes or storage clusters, with breakout-capable cages for fat uplinks toward the spine.",
    ["Dense cheap 200G ports", "Only a few true 400G uplinks"],
    ["spectrum-3", "200g", "roce", "unverified"]
  ),
  sw$2(
    "nv-sn3700",
    "NVIDIA Spectrum-2 SN3700 (32x200G)",
    "nvidia",
    "scale-out",
    "eth-200",
    2019.5,
    45e3,
    4,
    32,
    200,
    6.4,
    1,
    380,
    "Spectrum-2 SN3700: 32x 200GbE QSFP56 in 1U (6.4 Tb/s).",
    "Spectrum-2 moved Mellanox Ethernet to 200G SerDes with scale-out RDMA; SN3700 served GPU-adjacent storage and early RoCE fabrics.",
    ["Mature and cheap", "Superseded by Spectrum-3/4 for AI fabrics"],
    ["spectrum-2", "200g", "roce"],
    { eolAfter: 2025 }
  ),
  sw$2(
    "nv-sn3420",
    "NVIDIA Spectrum-2 SN3420 (48x100G + 6x200G)",
    "nvidia",
    "frontend",
    "eth-100",
    2019.5,
    38e3,
    4,
    48,
    100,
    6,
    1,
    320,
    "Spectrum-2 SN3420: dense 100G frontend/storage leaf with 200G uplinks.",
    "The 100G-dense Spectrum-2 SKU for NFS/S3 frontends and tenant networks, with a few 200G links up to the spine.",
    ["Dense cheap 100G ports", "Not an AI-fabric part"],
    ["spectrum-2", "100g", "frontend", "unverified"],
    { eolAfter: 2024.5, features: ["100g-leaf", "6x200g-uplink", "roce", "vxlan"] }
  ),
  sw$2(
    "nv-qm9790",
    "NVIDIA Quantum-2 QM9790 (144x400G NDR IB)",
    "nvidia",
    "scale-out",
    "ib-ndr",
    2022.5,
    78e3,
    5,
    144,
    400,
    57.6,
    3,
    1e3,
    "Quantum-2 QM9790: 144x 400Gb/s NDR InfiniBand ports (32 OSFP cages) in 3U, 57.6 Tb/s.",
    "High-radix Quantum-2: same NDR silicon as the QM9700 with 2.25x the ports, letting a fat-tree tier collapse from many 64-port switches into a handful; SHARPv3 collectives in-network.",
    ["Fewer switches per fat-tree stage than QM9700", "OSFP breakout cabling everywhere"],
    ["infiniband", "ndr", "sharp", "scale-out"]
  ),
  sw$2(
    "nv-qm8790",
    "NVIDIA Quantum QM8790 (80x200G HDR IB)",
    "nvidia",
    "scale-out",
    "ib-hdr",
    2019.5,
    46e3,
    4,
    80,
    200,
    16,
    3,
    500,
    "Quantum QM8790: 80x 200Gb/s HDR ports in a managed switch, 16 Tb/s.",
    "HDR big-radix sibling of the QM8700; the standard spine tier for 200G InfiniBand fat-trees in 2020-2023 AI clusters.",
    ["High radix per chassis", "HDR generation - NDR is now the standard"],
    ["infiniband", "hdr", "scale-out", "unverified"]
  ),
  sw$2(
    "nv-q3200",
    "NVIDIA Quantum-X800 QM3200 (64x800G XDR IB)",
    "nvidia",
    "scale-out",
    "ib-xdr",
    2024.75,
    12e4,
    6,
    64,
    800,
    51.2,
    1,
    800,
    "Quantum-X800 QM3200: 64x 800Gb/s XDR InfiniBand in 1U, 51.2 Tb/s.",
    "Compact Quantum-X800: XDR doubles per-port rate over NDR so GB300-era backends keep 400G-era port counts while doubling bandwidth.",
    ["800G optics are expensive", "XDR ecosystem still ramping"],
    ["infiniband", "xdr", "unverified"]
  ),
  sw$2(
    "nv-sn2201",
    "NVIDIA SN2201 (48x1G + 8x10G OOB)",
    "nvidia",
    "oob",
    "eth-100",
    2022.5,
    2800,
    2,
    48,
    1,
    0.13,
    1,
    60,
    "NVIDIA SN2201: 48x 1GbE RJ45 plus 10G SFP+ uplinks, an out-of-band management switch.",
    "Purpose-built OOB ToR for GPU clusters: BMC/IPMI and switch management ride a separate plane so a fabric meltdown never locks you out.",
    ["Cheap isolation of the management plane", "No use outside management"],
    ["oob", "management", "unverified"],
    { features: ["48x1g-rj45", "8x10g-sfp"] }
  ),
  // ---------- Arista ----------
  sw$2(
    "ar-7050x4",
    "Arista 7050X4 32x100G leaf (Trident 3)",
    "arista",
    "frontend",
    "eth-100",
    2019,
    14e3,
    3,
    32,
    100,
    4,
    1,
    220,
    "Arista 7050X4: 32x 100GbE Trident 3 leaf for frontend and modest backends.",
    "The volume merchant-silicon leaf of 2019-2021; single-image EOS and CloudVision telemetry made it the default enterprise DC leaf.",
    ["Cheap per 100G port", "Outgrown by 200/400G AI fabrics"],
    ["trident3", "100g", "leaf", "frontend"],
    { eolAfter: 2024.5 }
  ),
  sw$2(
    "ar-7060x4",
    "Arista 7060X4 32x400G (Tomahawk 3)",
    "arista",
    "scale-out",
    "eth-400",
    2020.5,
    52e3,
    4,
    32,
    400,
    12.8,
    1,
    480,
    "Arista 7060X4: 32x 400GbE QSFP-DD, 12.8 Tb/s Tomahawk 3 leaf/spine.",
    "The first 400G merchant-silicon box; early 400G fabrics and storage backends used it before Tomahawk 4 doubled density.",
    ["Early-400G power and thermals", "Superseded by 7060X5/X6"],
    ["tomahawk3", "400g", "leaf"],
    { eolAfter: 2024 }
  ),
  sw$2(
    "ar-7060x5",
    "Arista 7060X5 64x400G (Tomahawk 4)",
    "arista",
    "scale-out",
    "eth-400",
    2021.5,
    85e3,
    4,
    64,
    400,
    25.6,
    1,
    560,
    "Arista 7060X5: 64x 400GbE in 1U at 25.6 Tb/s.",
    "Tomahawk 4 density at 400G made this the workhorse AI leaf/spine for 100-400G-era clusters before 51.2T silicon landed.",
    ["Proven volume platform", "No 800G upgrade path"],
    ["tomahawk4", "400g", "leaf", "spine"]
  ),
  sw$2(
    "ar-7060dx5",
    "Arista 7060DX5-64S 64x800G (Tomahawk 5)",
    "arista",
    "scale-out",
    "eth-800",
    2023.5,
    115e3,
    5,
    64,
    800,
    51.2,
    1,
    700,
    "Arista 7060DX5-64S: disaggregated 51.2 Tb/s Tomahawk 5 switch, 64x 800GbE OSFP in 1U.",
    "Disaggregated design (separate CPU card, passive port-side cooling) targets AI leaf economics: 800G radix without Spectrum-X pricing.",
    ["800G optics dominate the BOM", "Merchant silicon - no NVIDIA telemetry stack"],
    ["tomahawk5", "800g", "leaf", "ai"]
  ),
  sw$2(
    "ar-7170",
    "Arista 7170-32C (Jericho2 router, MACsec)",
    "arista",
    "frontend",
    "eth-100",
    2019.5,
    26e3,
    3,
    32,
    100,
    3.2,
    1,
    260,
    "Arista 7170-32C: 32x 100GbE Jericho2 configurable router with MACsec.",
    "Configurable-config router family: Jericho2 deep buffers plus a programmable pipeline for WAN/peering and MACsec-secured links.",
    ["Router features at switch-class power", "100G-era radix only"],
    ["jericho2", "router", "macsec"],
    { eolAfter: 2025.5 }
  ),
  sw$2(
    "ar-7260x3",
    "Arista 7260CX3 32x100G leaf (Trident 3)",
    "arista",
    "frontend",
    "eth-100",
    2017.5,
    19e3,
    3,
    32,
    100,
    3.6,
    1,
    240,
    "Arista 7260X3: the 2017 100G Trident 3 leaf generation.",
    "Everywhere in older cloud DCs and common on the secondary market; fine for frontend, too shallow for modern backends.",
    ["Cheap refresh 100G leaf", "End-of-life platform"],
    ["trident3", "100g", "leaf", "unverified"],
    { eolAfter: 2023 }
  ),
  sw$2(
    "ar-7280r3",
    "Arista 7280R3-32C4 (Jericho3 router)",
    "arista",
    "scale-out",
    "eth-400",
    2021.5,
    68e3,
    4,
    32,
    400,
    12.8,
    1,
    520,
    "Arista 7280R3-32C4: 32x 400GbE Jericho3 deep-buffered router.",
    "R3 fixed routers add Jericho3 deep buffers for lossless convergence, telemetry and MACsec; used at cloud edges and some AI storage tiers.",
    ["Deep buffers absorb microbursts", "Router pricing per port"],
    ["jericho3", "400g", "router"]
  ),
  sw$2(
    "ar-7280r4a",
    "Arista 7280R4A-48 (Jericho3-AI leaf)",
    "arista",
    "scale-out",
    "eth-400",
    2023.75,
    95e3,
    5,
    48,
    400,
    28.8,
    1,
    600,
    "Arista 7280R4A: fixed 400G AI leaf on Jericho3-AI silicon.",
    "R4A brings Jericho3-AI (28.8 Tb/s, in-network collectives) into a fixed leaf form for EOS-based AI fabrics.",
    ["Jericho3-AI features in 1U", "Fewer 800G options than 7388X5/7060X6"],
    ["jericho3-ai", "400g", "ai", "unverified"]
  ),
  sw$2(
    "ar-7388x5",
    "Arista 7388X5 AI leaf (Tomahawk 5)",
    "arista",
    "scale-out",
    "eth-800",
    2023.5,
    88e3,
    5,
    64,
    400,
    25.6,
    1,
    550,
    "Arista 7388X5: Tomahawk 5 AI-leaf family announced with the EOS AI fabric stack.",
    "Pairs 51.2T merchant silicon with AI leaf features (adaptive routing, RDMA-aware queuing) as the Spectrum-X alternative.",
    ["Merchant-silicon economics", "Exact port splits vary by SKU"],
    ["tomahawk5", "ai", "leaf", "unverified"]
  ),
  sw$2(
    "ar-7800r3",
    "Arista 7800R3-8 modular spine (Jericho3)",
    "arista",
    "scale-out",
    "eth-400",
    2021.5,
    26e4,
    6,
    192,
    400,
    76.8,
    13,
    4e3,
    "Arista 7800R3: modular Jericho3 router chassis (8-slot shown; a 16-slot also exists) for spine and peering tiers.",
    "R3 modular replaced the 7500R: deep-buffer Jericho3 line cards and big radix for cloud peering and large fat-tree spines.",
    ["Chassis capex and floor space", "Overkill below hyperscale"],
    ["jericho3", "modular", "spine", "router", "unverified"]
  ),
  sw$2(
    "ar-7700r4",
    "Arista 7700R4-4 Distributed Etherlink Switch",
    "arista",
    "scale-out",
    "eth-800",
    2024,
    52e4,
    6,
    144,
    800,
    115.2,
    11,
    4500,
    "Arista 7700R4-4: Distributed Etherlink Switch with 115.2 Tb/s of 800G switching for AI clusters.",
    "DES spreads one giant switch across modules linked by private high-speed interconnect, cutting spine cabling versus a two-tier fat tree; aimed at 100k+ GPU fabrics.",
    ["Radical topology needing Arista end-to-end", "Premium pricing"],
    ["jericho3-ai", "800g", "des", "ai", "unverified"]
  ),
  // ---------- Cisco ----------
  sw$2(
    "cs-n93600gx",
    "Cisco Nexus 93600YC-GX (48x25G + 6x400G)",
    "cisco",
    "frontend",
    "eth-400",
    2019.5,
    32e3,
    3,
    6,
    400,
    3.6,
    1,
    330,
    "Cisco Nexus 93600YC-GX: 48x 1/10/25G host ports plus 6x 400G QSFP-DD uplinks in 1U.",
    "The 400G-uplink member of the 9300-GX line: host ports stay 25G for legacy tenants while uplinks jump to 400G.",
    ["Bridges legacy 25G hosts to 400G spines", "Only six 400G ports"],
    ["nexus", "gx", "400g", "frontend"],
    { eolAfter: 2024.5, features: ["nexus", "vxlan", "evpn", "48x25g-host", "6x400g-uplink", "telemetry"] }
  ),
  sw$2(
    "cs-n93180fx3",
    "Cisco Nexus 93180YC-FX3 (48x25G + 6x100G)",
    "cisco",
    "frontend",
    "eth-100",
    2019.5,
    18e3,
    3,
    6,
    100,
    1.8,
    1,
    260,
    "Cisco Nexus 93180YC-FX3: 48x 1/10/25G host ports plus 6x 100G uplinks in 1U.",
    "The volume 25G ToR of the Nexus 9000 line: VXLAN/EVPN, INT telemetry and dense 25G host connectivity at merchant-silicon prices.",
    ["Cheap dense 25G", "25/100G ceiling - not for AI backends"],
    ["nexus", "fx3", "25g", "tor", "frontend"],
    { eolAfter: 2025.5, features: ["nexus", "vxlan", "evpn", "48x25g-host", "6x100g-uplink"] }
  ),
  sw$2(
    "cs-n9332d",
    "Cisco Nexus 9332D-GX2B (32x400G)",
    "cisco",
    "scale-out",
    "eth-400",
    2022,
    78e3,
    4,
    32,
    400,
    12.8,
    1,
    450,
    "Cisco Nexus 9332D-GX2B: 32x 400GbE QSFP-DD in 1U (12.8 Tb/s).",
    "GX2-generation compact 400G switch on the CloudScale ASIC; aimed at leaf stages of 400G AI fabrics and storage backends.",
    ["Compact 400G radix", "Smaller ecosystem than mainstream Nexus 9300"],
    ["nexus", "gx2", "400g", "ai"]
  ),
  sw$2(
    "cs-n9364d",
    "Cisco Nexus 9364D-GX2A (64x400G)",
    "cisco",
    "scale-out",
    "eth-400",
    2022.5,
    95e3,
    4,
    64,
    400,
    25.6,
    1,
    560,
    "Cisco Nexus 9364D-GX2A: 64x 400GbE in 1U, 25.6 Tb/s.",
    "The dense 400G AI-leaf answer: 64 QSFP-DD ports, NX-OS VXLAN/EVPN plus a low-latency mode; pairs with Nexus 9500/9800 spines.",
    ["Full 400G radix in 1U", "CloudScale ASIC - feature split vs Silicon One models"],
    ["nexus", "gx2", "400g", "ai", "leaf"]
  ),
  sw$2(
    "cs-n9508",
    "Cisco Nexus 9508 modular (8-slot, 36x400G cards)",
    "cisco",
    "scale-out",
    "eth-400",
    2019,
    39e4,
    6,
    288,
    400,
    115.2,
    13,
    4500,
    "Cisco Nexus 9508: 8-slot modular Nexus with X9736C-FX3 400G line cards (288x 400G total).",
    "The classic modular spine: fabric modules, redundant supervisors and mixed 100G/400G cards make it the default large-tenant core.",
    ["Chassis economics need filling", "13U and heavy cabling"],
    ["nexus", "9500", "modular", "spine", "400g"]
  ),
  sw$2(
    "cs-n9808",
    "Cisco Nexus 9808 modular (8-slot 400G)",
    "cisco",
    "scale-out",
    "eth-400",
    2021.5,
    48e4,
    6,
    256,
    400,
    102.4,
    8,
    6e3,
    "Cisco Nexus 9808: 8-slot 400G modular switch of the 9800 generation.",
    "The 9800 line (9804/9808) refreshed modular Cisco switching for 400G-now/800G-later fabrics with deeper buffers for AI leaf-spine stages.",
    ["Future-proof modular core", "Expensive versus fixed-form spines"],
    ["nexus", "9800", "modular", "400g", "unverified"]
  ),
  sw$2(
    "cs-8201",
    "Cisco 8201 (Silicon One 400G)",
    "cisco",
    "scale-out",
    "eth-400",
    2022,
    45e3,
    4,
    24,
    400,
    10.4,
    1,
    400,
    "Cisco 8201: Silicon One G100 fixed router/switch (24x 400G + 8x 100G class) for fabric and WAN edges.",
    "Part of the Cisco 8000 family running IOS-XR on Silicon One: one silicon story across routing and switching with strong streaming telemetry.",
    ["Single-silicon routing + switching", "Younger ecosystem than NX-OS"],
    ["silicon-one", "400g", "router", "unverified"],
    { features: ["silicon-one", "ios-xr", "24x400g", "8x100g"] }
  ),
  sw$2(
    "cs-8501",
    "Cisco Nexus 8501 (Silicon One dense 800G)",
    "cisco",
    "scale-out",
    "eth-800",
    2024.5,
    12e4,
    5,
    32,
    800,
    25.6,
    1,
    700,
    "Cisco Nexus 8501: Silicon One-based dense 800G-class Nexus for AI backends.",
    "The newest Nexus generation pushes Silicon One capacity toward 800G AI leaves/spines inside the NX-OS operational model.",
    ["Very new - thin field history", "Positioning still settling versus Nexus 9800"],
    ["silicon-one", "800g", "ai", "unverified"]
  ),
  sw$2(
    "cs-8812",
    "Cisco 8812 (12-slot Silicon One chassis)",
    "cisco",
    "scale-out",
    "eth-800",
    2023.5,
    9e5,
    6,
    384,
    800,
    307.2,
    12,
    12e3,
    "Cisco 8812: 12-slot Silicon One router chassis of the 8000 series.",
    "8812/8818 chassis scale Silicon One line cards toward hundreds of Tb/s for core routing, DCI and the largest AI spines.",
    ["Huge capex and power", "Needs carrier-class planning"],
    ["silicon-one", "modular", "router", "unverified"]
  ),
  sw$2(
    "cs-n93108tcfx3",
    "Cisco Nexus 93108TC-FX3 (48x10G copper OOB)",
    "cisco",
    "oob",
    "eth-100",
    2020.5,
    12e3,
    2,
    48,
    10,
    0.68,
    1,
    220,
    "Cisco Nexus 93108TC-FX3: 48x 1/10GBASE-T copper plus 8x SFP+ (10/25G), the DC copper ToR/OOB switch.",
    "RJ45 10G copper keeps management, BMC and legacy hosts on cheap structured cabling; the default OOB and frontend ToR in Cisco shops.",
    ["Copper is cheap cabling but reach-limited", "Not a fabric switch"],
    ["nexus", "fx3", "10g", "oob", "tor"],
    { features: ["48x10gbase-t", "8x10-25g-sfp"] }
  )
];
const s = (id, name, vendor, role, tech, ports, portGbps, tbps, u, watts, priceUSD, from, summary, explain, tradeoffs, tags, extra = {}) => ({
  id,
  name,
  vendor,
  kind: "switch",
  role,
  tech,
  portCount: ports,
  portGbps,
  capacityTbps: tbps,
  rackUnits: u,
  watts,
  priceUSD,
  leadTimeMonths: 3,
  availableFrom: from,
  cooling: ["air"],
  inNetworkCompute: false,
  features: [],
  codex: { summary, explain, tradeoffs, tags },
  ...extra
});
const v$2 = (id, name, reliability, support, discount, summary, explain, tradeoffs, tags, sells = ["switch"]) => ({
  id,
  name,
  sells,
  reliability,
  support,
  volumeDiscountPerDoublingPct: discount,
  codex: { summary, explain, tradeoffs, tags }
});
const CAT_SWITCHES_B = [
  s(
    "jnp-qfx5120-48y",
    "Juniper QFX5120-48Y (48x25G + 8x100G)",
    "juniper",
    "frontend",
    "eth-100",
    48,
    25,
    2,
    1,
    360,
    26e3,
    2019.3,
    "25G top-of-rack switch for general datacenter leaf tiers.",
    "Tomahawk+-class fixed switch with 48 SFP28 server ports plus 8x100G uplinks, run under Junos ELS for EVPN-VXLAN leaf roles.",
    ["No 100G host ports; uplinks oversubscribe server bandwidth", "Junos feature licenses add cost vs whitebox"],
    ["25g", "tor", "frontend", "evpn"],
    { leadTimeMonths: 4 }
  ),
  s(
    "jnp-qfx5120-32c",
    "Juniper QFX5120-32C (32x100G)",
    "juniper",
    "frontend",
    "eth-100",
    32,
    100,
    3.2,
    1,
    450,
    45e3,
    2019,
    "Compact 100G leaf switch for small EVPN fabrics.",
    "Tomahawk-class pipeline with 32 QSFP28 ports; a common dense leaf or small-spine building block in Juniper DC designs.",
    ["Shallow buffers for bursty storage traffic", "Fixed form factor: growth means forklift replacement"],
    ["100g", "leaf", "evpn"],
    { leadTimeMonths: 4 }
  ),
  s(
    "jnp-qfx5130-48c",
    "Juniper QFX5130-48C (48x25G + 8x100G)",
    "juniper",
    "frontend",
    "eth-100",
    48,
    25,
    2,
    1,
    400,
    3e4,
    2020.2,
    "Newer-generation 25G TOR succeeding the QFX5120-48Y.",
    "ELS-based fixed switch with 48x1/10/25G plus 8x100G; Broadcom-silicon pipeline refreshed for ZR optics and deeper MAC tables.",
    ["25G-class in a 100G-era catalogue", "Juniper premium over equivalent ODM"],
    ["25g", "tor", "frontend", "unverified"],
    { leadTimeMonths: 4 }
  ),
  s(
    "jnp-qfx5230-64od",
    "Juniper QFX5230-64OD (64x400G OSFP)",
    "juniper",
    "scale-out",
    "eth-400",
    64,
    400,
    25.6,
    1,
    1100,
    95e3,
    2022,
    "400G backend fabric switch for AI leaf/spine tiers.",
    "Tomahawk 4-class OSFP platform; 64x400G with breakout to 128x200G/256x100G for rail-optimized AI backend fabrics.",
    ["OSFP optics cost more and are scarcer than QSFP-DD", "Juniper price premium over the same whitebox"],
    ["400g", "ai-fabric", "scale-out", "unverified"],
    { leadTimeMonths: 5 }
  ),
  s(
    "jnp-qfx5240-64od",
    "Juniper QFX5240-64OD (64x800G OSFP)",
    "juniper",
    "scale-out",
    "eth-800",
    64,
    800,
    51.2,
    2,
    2e3,
    145e3,
    2022.6,
    "51.2T Tomahawk5 switch for AI spine and mega-fabric tiers.",
    "64x800G OSFP (or 128x400G breakout) on Tomahawk 5 silicon; Juniper flagship for non-blocking AI backend fabrics.",
    ["800G optics dominate BOM cost", "Needs liquid-ready high-airflow racks at full draw"],
    ["800g", "tomahawk5", "ai-fabric"],
    { leadTimeMonths: 5 }
  ),
  s(
    "jnp-qfx5700",
    "Juniper QFX5700 multirate modular fabric switch",
    "juniper",
    "scale-out",
    "eth-400",
    128,
    400,
    51.2,
    2,
    2600,
    26e4,
    2023.5,
    "Modular multirate switch for mixed 100-800G datacenter fabrics.",
    "Card-based QFX5700 slots Tomahawk5-class modules into one chassis, letting one fabric mix 100/200/400/800G without forklifts.",
    ["Chassis cost and lead time exceed fixed 64-port SKUs", "Overkill below roughly 10 racks"],
    ["modular", "multirate", "scale-out", "unverified"],
    { leadTimeMonths: 6 }
  ),
  s(
    "jnp-ptx10001-36mr",
    "Juniper PTX10001-36MR (36x400G)",
    "juniper",
    "frontend",
    "eth-400",
    36,
    400,
    14.4,
    2,
    1500,
    19e4,
    2019.5,
    "Compact datacenter-interconnect router with 36x400G magnified ports.",
    "Junos EVO platform on Juniper Express silicon; magnified (MR) optics collapse parallel lanes so one 2U chassis lands multi-hundred-GbE transit and peering.",
    ["Router feature set is overkill for pure leaf-spine switching", "Premium price vs equivalent switching capacity"],
    ["dci", "router", "peering", "400g"],
    { leadTimeMonths: 6 }
  ),
  s(
    "cel-ds3000",
    "Celestica DS3000 (48x25G + 8x100G)",
    "celestica",
    "oob",
    "eth-100",
    48,
    25,
    2,
    1,
    180,
    9e3,
    2018.5,
    "Compact open 25G TOR frequently repurposed as management/OOB fabric.",
    "Tomahawk-class ODM box, SONiC/Cumulus friendly; hyperscalers run it both as TOR and as cheap resilient out-of-band switches.",
    ["ODM support is self-service unless a NOS contract is bought", "25G silicon dated for new builds"],
    ["oob", "odm", "sonic", "unverified"]
  ),
  s(
    "cel-ds4000",
    "Celestica DS4000 (32x100G)",
    "celestica",
    "frontend",
    "eth-100",
    32,
    100,
    3.2,
    1,
    320,
    16e3,
    2017.5,
    "100G whitebox leaf switch from the hyperscaler SONiC fleet.",
    "Trident/Tomahawk-generation 1RU with 32 QSFP28; a workhorse of large open-network fleets and lab SONiC testbeds.",
    ["No vendor software support without a NOS partner", "Older pipeline lacks newer telemetry features"],
    ["whitebox", "sonic", "100g", "unverified"]
  ),
  s(
    "cel-ds5000",
    "Celestica DS5000 (64x100G)",
    "celestica",
    "scale-out",
    "eth-100",
    64,
    100,
    6.4,
    1,
    500,
    25e3,
    2018.8,
    "Tomahawk3-generation 100G fabric whitebox.",
    "64x100G (or 128x50G breakout) leaf/spine platform widely qualified in hyperscaler SONiC fleets at a fraction of OEM pricing.",
    ["You own the NOS and its bugs", "100G-only ports in a 400G era"],
    ["whitebox", "sonic", "100g", "unverified"]
  ),
  s(
    "cel-ds6000",
    "Celestica DS6000 (128x100G)",
    "celestica",
    "scale-out",
    "eth-100",
    128,
    100,
    12.8,
    2,
    900,
    45e3,
    2020,
    "Dense 128x100G Tomahawk4-generation fabric whitebox.",
    "Dual-bank 2RU design giving 12.8T of 100G; used as compact spine where QSFP28 optics stock already exists.",
    ["No native 400G ports", "2RU dense 100G runs hot; watch airflow"],
    ["whitebox", "sonic", "100g", "unverified"]
  ),
  s(
    "ec-as7726-32x",
    "Edgecore AS7726-32X (32x100G)",
    "edgecore",
    "frontend",
    "eth-100",
    32,
    100,
    3.2,
    1,
    300,
    14e3,
    2017.2,
    "Tomahawk-generation open 100G TOR/spine from Accton.",
    "OCP-recognized 32 QSFP28 box, a staple of open SONiC/Cumulus deployments and small AI lab fabrics.",
    ["Software support sold separately", "Superseded silicon, mostly residual stock"],
    ["ocp", "sonic", "100g"],
    { eolAfter: 2024 }
  ),
  s(
    "ec-as9726-64xo",
    "Edgecore AS9726-64XO (64x800G OSFP)",
    "edgecore",
    "scale-out",
    "eth-800",
    64,
    800,
    51.2,
    1,
    1900,
    55e3,
    2023,
    "Tomahawk5 open 800G switch for AI backend fabrics.",
    "64 OSFP800 on Tomahawk 5 with SONiC support service; the open alternative to OEM 51.2T SKUs at roughly half price.",
    ["You integrate SONiC/optics yourself", "OSFP800 optics are the dominant cost"],
    ["tomahawk5", "ai-fabric", "sonic", "unverified"],
    { leadTimeMonths: 4 }
  ),
  s(
    "ec-as9736-64dpo",
    "Edgecore AS9736-64DPO (64x800G, deep buffer)",
    "edgecore",
    "scale-out",
    "eth-800",
    64,
    800,
    51.2,
    2,
    2200,
    65e3,
    2023.5,
    "Deep-buffer Tomahawk5 variant tuned for storage and bursty east-west AI traffic.",
    "Same 64x800G pipeline as AS9726 but with large packet-buffer SKU (DPO) that absorbs incasts from NVMe-oF and collective offloads.",
    ["Buffer does not fix long-lived congestion", "2RU and higher power draw"],
    ["deep-buffer", "tomahawk5", "ai-fabric", "unverified"],
    { leadTimeMonths: 4 }
  ),
  s(
    "ec-as9817-64o",
    "Edgecore AS9817-64O (128x800G, Tomahawk6-class)",
    "edgecore",
    "scale-out",
    "eth-800",
    128,
    800,
    102.4,
    2,
    3e3,
    85e3,
    2024.5,
    "First-wave 102.4T open switch on Tomahawk 6 silicon.",
    "128 OSFP800 (breakout to 256x400G) targeting next-gen AI spines; early units ship with SONiC builds co-developed with Broadcom.",
    ["102.4T optics ecosystem still maturing", "Power/cooling near liquid-cooling threshold"],
    ["tomahawk6", "ai-fabric", "unverified"],
    { leadTimeMonths: 6 }
  ),
  s(
    "del-z9332f",
    "Dell PowerSwitch Z9332F-ON (32x400G OSFP)",
    "dell",
    "scale-out",
    "eth-400",
    32,
    400,
    12.8,
    1,
    1100,
    75e3,
    2019.3,
    "Tomahawk3-class 400G backend switch native to Microsoft fleets.",
    "32 OSFP400 plus 4x100G; sold with Dell OS10 or SONiC support and used as the classic Azure 400G leaf/spine.",
    ["OSFP optics pricier than QSFP-DD", "OS10 end-of-life pushes buyers onto SONiC"],
    ["400g", "ai-fabric", "sonic"]
  ),
  s(
    "del-z9432f",
    "Dell PowerSwitch Z9432F-ON (32x400G + 16x100G)",
    "dell",
    "scale-out",
    "eth-400",
    32,
    400,
    14.4,
    1,
    1300,
    95e3,
    2021.2,
    "Tomahawk4 backend switch mixing 400G fabric ports with 100G host ports.",
    "32 OSFP400 for leaf/spine links plus 16 SFP56 100G host-facing ports, letting one box serve both rails in storage fabrics.",
    ["Mixed-port designs complicate optics inventory", "Not a clean fit for pure 800G-era spines"],
    ["400g", "scale-out", "unverified"],
    { leadTimeMonths: 4 }
  ),
  s(
    "del-z9664f",
    "Dell PowerSwitch Z9664F-ON (64x400G OSFP)",
    "dell",
    "scale-out",
    "eth-400",
    64,
    400,
    25.6,
    1,
    1400,
    12e4,
    2022,
    "Tomahawk4 64x400G fabric switch for denser AI backends.",
    "Doubling of the Z9332F port count on Tomahawk 4; the higher-radix 400G spine for rail-optimized cluster designs.",
    ["64 OSFP in 1RU needs high-airflow racks", "Same OSFP optics premium"],
    ["400g", "spine", "scale-out", "unverified"],
    { leadTimeMonths: 5 }
  ),
  s(
    "del-z9864f",
    "Dell PowerSwitch Z9864F-ON (64x800G OSFP)",
    "dell",
    "scale-out",
    "eth-800",
    64,
    800,
    51.2,
    2,
    2200,
    165e3,
    2023,
    "Tomahawk5 51.2T switch for AI spine tiers.",
    "64 OSFP800 (128x400G breakout) on Tomahawk 5 with SONiC or Dell Enterprise SONiC images for AI backends.",
    ["800G optics dominate cost", "2RU high-power draw strains air-cooled racks"],
    ["800g", "tomahawk5", "ai-fabric"]
  ),
  s(
    "del-s5232f",
    "Dell PowerSwitch S5232F-ON (32x100G)",
    "dell",
    "frontend",
    "eth-100",
    32,
    100,
    3.2,
    1,
    340,
    34e3,
    2018.3,
    "Tomahawk 100G leaf for storage and frontend fabrics.",
    "32 QSFP28 plus a handful of breakout ports; the common Dell 100G TOR/leaf SKU in general-purpose datacenters.",
    ["Shallow buffers for bursty NVMe traffic", "100G-era, superseded by 400G Z-series"],
    ["100g", "leaf", "frontend"]
  ),
  s(
    "del-s5248f",
    "Dell PowerSwitch S5248F-ON (48x25G + 8x100G)",
    "dell",
    "frontend",
    "eth-100",
    48,
    25,
    2,
    1,
    260,
    22e3,
    2020,
    "25G TOR with 100G uplinks for general compute rows.",
    "48 SFP28 server ports plus 100G QSFP28 uplinks; Dell workhorse TOR priced under equivalent OEM leaf SKUs.",
    ["25G host ports limit newer 100G NICs", "Compact 1RU thermals at full PoE-like loads"],
    ["25g", "tor", "frontend", "unverified"]
  ),
  s(
    "del-s5296f",
    "Dell PowerSwitch S5296F-ON (96x40G + 8x100G)",
    "dell",
    "frontend",
    "eth-100",
    96,
    40,
    4,
    1,
    500,
    38e3,
    2017,
    "High-port-count 40G aggregation switch for legacy rows.",
    "96 SFP+/SFP28 multirate ports plus 8 QSFP28 uplinks on Tomahawk+-class silicon; end-of-sale as fleets move to 100/400G.",
    ["40G-era optics ecosystem fading", "Aggregation role replaced by 400G leaf designs"],
    ["40g", "aggregation", "legacy", "unverified"],
    { eolAfter: 2024 }
  ),
  s(
    "del-n3248te",
    "Dell PowerSwitch N3248TE-ON (48x1G + 4x10G)",
    "dell",
    "oob",
    "eth-100",
    48,
    1,
    0.1,
    1,
    70,
    4e3,
    2019.5,
    "48-port 1G switch used for out-of-band management networks.",
    "Copper RJ45 access ports with 4 SFP+ uplinks; the cheap, boring, essential switch that keeps BMCs reachable when the fabric melts.",
    ["1G copper only - no SFP host ports", "Not for data-plane use"],
    ["oob", "1g", "management"]
  ),
  s(
    "aru-cx8325-32c",
    "HPE Aruba CX 8325-32C (32x100G)",
    "aruba",
    "frontend",
    "eth-100",
    32,
    100,
    3.2,
    1,
    380,
    48e3,
    2018.7,
    "100G leaf/spine running Aruba AOS-CX.",
    "Trident3-class fixed switch under AOS-CX with REST/Netconf automation; common in HPE-campus and HPC storage fabrics.",
    ["AOS-CX licensing on advanced features", "Enterprise pricing over whitebox equivalents"],
    ["100g", "aoscx", "leaf"]
  ),
  s(
    "aru-cx8325-48y8c",
    "HPE Aruba CX 8325-48Y8C (48x25G + 8x100G)",
    "aruba",
    "frontend",
    "eth-100",
    48,
    25,
    2,
    1,
    320,
    34e3,
    2018.7,
    "25G TOR with 100G uplinks under AOS-CX.",
    "48 SFP28 plus 8 QSFP28; the default Aruba datacenter TOR, strong on telemetry and zero-touch provisioning.",
    ["25G host ports cap 100G NIC deployments", "Aruba support contracts add real cost"],
    ["25g", "tor", "aoscx"]
  ),
  s(
    "aru-cx8360-48y4c",
    "HPE Aruba CX 8360-48Y4C (48x25G + 4x100G)",
    "aruba",
    "frontend",
    "eth-100",
    48,
    25,
    1.6,
    1,
    280,
    26e3,
    2019.8,
    "Compact mid-tier datacenter TOR below the 8325.",
    "Trident3-class 1RU with 48x25G and 4x100G for branch-DC and edge fabrics that still want AOS-CX tooling.",
    ["Half the uplink capacity of the 8325-48Y8C", "Not suited to AI backend roles"],
    ["25g", "edge", "aoscx", "unverified"]
  ),
  s(
    "aru-cx10000-48y4c",
    "HPE Aruba CX 10000-48Y4C (48x25G + 4x100G)",
    "aruba",
    "frontend",
    "eth-100",
    48,
    25,
    1.6,
    1,
    350,
    55e3,
    2021.5,
    "Trident4 switch with an on-switch telemetry processing CPU.",
    "The CX 10000 pairs a Trident4 pipeline with an on-board telemetry processor that streams per-flow analytics without external taps.",
    ["Telemetry premium buys little in plain L2 roles", "25G host ports; uplinks only 4x100G"],
    ["telemetry", "trident4", "aoscx", "unverified"]
  ),
  s(
    "aru-cx6300-48g",
    "HPE Aruba CX 6300M 48G (48x1G + 4x10G)",
    "aruba",
    "oob",
    "eth-100",
    48,
    1,
    0.1,
    1,
    80,
    3500,
    2020.3,
    "1G access switch pressed into OOB-management duty.",
    "Modular AOS-CX access line; the 48-port copper model with SFP+ uplinks is a standard management-fabric choice in HPE shops.",
    ["1G copper only", "Access-oriented features you pay for but never use in OOB"],
    ["oob", "1g", "management"]
  ),
  s(
    "hpe-slingshot-rosetta",
    "HPE Slingshot Rosetta switch (64x200G)",
    "hpe",
    "scale-out",
    "eth-200",
    64,
    200,
    12.8,
    1,
    1400,
    18e4,
    2019.7,
    "Slingshot fabric switch with adaptive routing and in-network collectives.",
    "Cray-developed Rosetta silicon drives 64x200G ports with per-packet adaptive routing, dynamic congestion control and offloaded collective acceleration for HPC/AI cabinets.",
    ["Effectively locked to HPE EX cabinets and Slingshot NICs", "Sold via systems, not à la carte"],
    ["slingshot", "hpc", "adaptive-routing", "in-network-collectives"],
    { leadTimeMonths: 8, inNetworkCompute: true, allocationPerQuarter: 200, features: ["adaptive-routing", "in-network-collectives", "congestion-control"] }
  ),
  s(
    "hpe-slingshot-rosetta2",
    "HPE Slingshot Rosetta 2 switch (64x400G)",
    "hpe",
    "scale-out",
    "eth-400",
    64,
    400,
    25.6,
    1,
    1800,
    22e4,
    2025,
    "Second-generation Slingshot switch doubling per-port bandwidth.",
    "Rosetta 2 lifts ports to 400G (25.6T) with the same adaptive-routing and in-network collective model, feeding Shasta/EX generation systems.",
    ["Slingshot port rates need matching Slingshot NICs", "Proprietary fabric vs open 400G Ethernet"],
    ["slingshot", "hpc", "adaptive-routing", "unverified"],
    { leadTimeMonths: 9, inNetworkCompute: true, features: ["adaptive-routing", "in-network-collectives", "congestion-control"] }
  ),
  s(
    "bc-th3-ref",
    "Broadcom Tomahawk 3 whitebox reference (32x400G)",
    "broadcom",
    "scale-out",
    "eth-400",
    32,
    400,
    12.8,
    1,
    1e3,
    22e3,
    2018.8,
    "Reference design behind the first 400G switch wave.",
    "Tomahawk 3 (BCM56880) delivers 12.8T as 32 OSFP400 or 128x100G breakouts; ODMs clone this reference into most 400G whiteboxes.",
    ["Broadcom sells silicon - support means NOS partner contracts", "First-gen 400G optics ran hot and pricey"],
    ["tomahawk3", "reference", "400g"]
  ),
  s(
    "bc-th4-ref",
    "Broadcom Tomahawk 4 whitebox reference (64x400G)",
    "broadcom",
    "scale-out",
    "eth-400",
    64,
    400,
    25.6,
    1,
    1200,
    38e3,
    2019.9,
    "Tomahawk 4 reference: the workhorse of hyperscaler AI backends.",
    "25.6T of 400G (128x100G breakouts) in 1RU; Azure-class AI leaf/spine switches are mostly this reference with a logo on it.",
    ["Deep-buffer variants vary by ODM implementation", "No native 800G ports"],
    ["tomahawk4", "reference", "400g"]
  ),
  s(
    "bc-th5-ref",
    "Broadcom Tomahawk 5 whitebox reference (64x800G)",
    "broadcom",
    "scale-out",
    "eth-800",
    64,
    800,
    51.2,
    2,
    2e3,
    7e4,
    2022.8,
    "Tomahawk 5 reference design: 51.2T of 800G for AI spines.",
    "64 OSFP800 (128x400G) with HBM-free deep buffers and improved telemetry; basis of most OEM 51.2T switches shipped since 2023.",
    ["800G optics dominate BOM", "2RU, near the air-cooling ceiling"],
    ["tomahawk5", "reference", "800g"]
  ),
  s(
    "bc-jericho3ai-ref",
    "Broadcom Jericho3-AI whitebox reference (AI backend)",
    "broadcom",
    "scale-out",
    "eth-400",
    32,
    400,
    12.8,
    1,
    1100,
    11e4,
    2023,
    "Jericho3-AI reference: huge-radix deep-buffer fabric for very large AI clusters.",
    "Jericho3-AI combines deep buffers with fabric expansion toward tens of thousands of endpoints in two-tier designs, targeting AI/storage backends that choke shallow-buffer switches.",
    ["Expensive per port vs plain Tomahawk", "Deep buffers mask congestion instead of removing it"],
    ["jericho", "deep-buffer", "ai-fabric", "unverified"],
    { leadTimeMonths: 6 }
  )
];
const CAT_SWITCH_VENDORS = [
  v$2(
    "juniper",
    "Juniper Networks",
    0.9,
    0.86,
    3,
    "Networking vendor spanning datacenter switching, routing and AI fabrics.",
    "Junos/EVO one-image consistency from QFX TORs to PTX DCI routers; strong routing heritage for peering and DCI tiers.",
    ["Junos complexity vs open NOS alternatives", "Feature licensing and support add cost"],
    ["routing", "evpn", "mpls", "dci"]
  ),
  v$2(
    "celestica",
    "Celestica",
    0.82,
    0.62,
    5,
    "ODM building hyperscaler-qualified whitebox switches and servers.",
    "Celestica DS-series Tomahawk/Jericho platforms ship NOS-less; software comes via SONiC/Cumulus contracts you arrange yourself.",
    ["Self-managed software stack", "Limited enterprise support without third parties"],
    ["whitebox", "odm", "sonic"]
  ),
  v$2(
    "edgecore",
    "Edgecore Networks (Accton)",
    0.82,
    0.65,
    5,
    "Open-network switch brand covering OCP and AI backends.",
    "Broad Tomahawk/Jericho portfolio with optional SONiC support services; the default choice for open AI fabric builds.",
    ["Software support is an add-on", "Hardware vendor neutral - you pick the NOS"],
    ["ocp", "sonic", "whitebox"]
  ),
  v$2(
    "aruba",
    "HPE Aruba Networking",
    0.88,
    0.9,
    3,
    "HPE networking arm for datacenter and campus switching.",
    "AOS-CX on Broadcom silicon with strong automation/telemetry; HPE also sells the proprietary Slingshot HPC fabric via systems.",
    ["Enterprise pricing premium", "Slingshot fabric locked to HPE systems"],
    ["aoscx", "evpn", "telemetry"]
  )
];
const cdx$2 = ([summary, explain, tradeoffs, tags]) => ({ summary, explain, tradeoffs, tags });
const base$2 = (id, name, v2, from, price, lead, c) => ({ id, name, vendor: v2, availableFrom: from, priceUSD: price, leadTimeMonths: lead, codex: cdx$2(c) });
const co$2 = (o2) => ({ kind: "cooling", ...o2 });
const coo = (t, serves, temp, inst) => (id, name, v2, price, kw, wpk, lead, c, from = 2020) => co$2({ ...base$2(id, name, v2, from, price, lead, c), coolingType: t, capacityKW: kw, wattsPerKW: wpk, serves, supplyTempC: temp, installMonths: inst });
const crac = coo("crah", "air", 22, 1);
const door = coo("rdhx", "air", 18, 0.25);
const cdu = coo("cdu", "dlc", 32, 2);
const chA = coo("chiller", "air", 7, 3);
const chW = coo("chiller", "air", 7, 4);
const dry = coo("dry-cooler", "dlc", 30, 2);
const twr = coo("cooling-tower", "air", 25, 3);
const cc = coo("cooling-tower", "dlc", 32, 3);
const tank = coo("immersion-tank", "immersion", 45, 2);
const plate = coo("cold-plate-loop", "dlc", 32, 0.25);
const RAW_COOLING = [
  // ---- Vertiv (Liebert) ----
  crac("vt-pdx-30", "Vertiv Liebert PDX 30 kW CRAC", "vertiv", 38e3, 30, 35, 2, ["Packaged 30 kW direct-expansion CRAC with air-cooled condenser.", "DX CRACs are self-contained: refrigerant circuit and condenser in one unit, no chilled-water plant required.", ["No plant to build: power, duct and go", "Compressor power makes PUE poor in heat"]]),
  crac("vt-pdx-60", "Vertiv Liebert PDX 60 kW CRAC", "vertiv", 62e3, 60, 35, 2, ["60 kW step of the Liebert PDX DX CRAC range (air/glycol/water-cooled variants).", "Bigger frames share the same iCOM controls; pick water-cooled variants when a condenser loop already exists.", ["Familiar service footprint worldwide", "Still 1.2-1.4 kW electrical per kW at part load"]]),
  crac("vt-pdx-afc-40", "Vertiv Liebert PDX AFC 40 kW (adiabatic free-cooling)", "vertiv", 58e3, 40, 28, 2, ["PDX with adiabatic free-cooling coils pre-cooling outside air before the DX circuit.", "Adiabatic pads evaporate water into the intake air, buying compressor-free hours without the cost of a full waterside economizer.", ["Cuts compressor hours 50-80% in temperate climates", "Needs water quality management"]], 2021),
  crac("vt-dse-45", "Vertiv Liebert DSE 45 kW (free-cooling DX)", "vertiv", 72e3, 45, 26, 2, ["Liebert DSE: DX CRAC with integral economizer circuit for compressor-free cooling in cold weather.", "A second refrigerant path bypasses the compressor below ~10 C outdoor, blending DX simplicity with airside-economizer savings.", ["Free cooling without a chiller plant", "More refrigerant circuits to maintain"]], 2021),
  crac("vt-crv-20", "Vertiv Liebert CRV020 In-Row (20 kW)", "vertiv", 19e3, 20, 33, 1, ["In-row air conditioner sitting between cabinets on the hot aisle.", "Short air path kills mixing losses: heat is captured where it is made, supporting 20-30 kW racks without raised-floor changes.", ["Spot density relief", "Rows eat floor space"]]),
  crac("vt-crv-40", "Vertiv Liebert CRV040 In-Row CW (40 kW)", "vertiv", 29e3, 40, 24, 1, ["Chilled-water version of the Liebert CRV in-row cooler.", "Water in the row moves 2x the heat of the DX variant with half the fan power, feeding off the same chilled loop as CRAHs.", ["Scales to 40 kW racks", "Needs chilled water piped to the row"]]),
  cdu("vt-xdu-450", "Vertiv Liebert XDU450 CDU (450 kW)", "vertiv", 16e4, 450, 20, 3, ["Liquid-to-liquid CDU isolating facility water from the rack coolant loop.", "450 kW covers one to two high-density rows of 40-80 kW liquid racks; plate-exchanger isolation keeps clean coolant at the silicon.", ["First MW-class step of the XDU line", "One unit per row concentrates risk"]], 2021),
  cdu("vt-xdu-1350", "Vertiv Liebert XDU1350 CDU (1.35 MW)", "vertiv", 32e4, 1350, 18, 3, ["1.35 MW liquid-to-liquid CDU with redundant pumps and controls.", "Row-scale CDUs cut piping runs and commissioning time versus a fleet of rack units; N+1 sizing is the norm.", ["Fewer units to plumb and maintain", "A tripped 1.35 MW unit is a row outage without N+1"]], 2022),
  door("vt-dcd-30", "Vertiv Liebert DCD Rear Door (30 kW)", "vertiv", 12e3, 30, 5, 1.5, ["Passive chilled-water rear door neutralizing 30 kW rack exhaust.", "The door coil condenses the plume so room air stays thermally neutral - no fans, no floor space, retrofittable cabinet by cabinet.", ["Silent, zero fan power", "Capacity tied to chilled water being cold enough"]], 2021),
  door("vt-xdr-45", "Vertiv Liebert XDR Rear Door (45 kW)", "vertiv", 15e3, 45, 8, 1.5, ["Higher-capacity rear-door heat exchanger for 45 kW-class racks.", "Deeper coil and wider waterway stretch passive door limits; still needs 18 C-class water to rate full capacity.", ["Bridges air halls toward 50 kW racks", "Door depth adds aisle footprint"]], 2021),
  chA("vt-afc-350", "Vertiv Liebert AFC 350 kW Chiller", "vertiv", 105e3, 350, 220, 4, ["Air-cooled chiller with integrated free-cooling coil from the Liebert line.", "Pairs with PDX/AFC white space for a single-vendor plant; free-cooling coil handles winter without compressor starts.", ["Matched Liebert ecosystem", "Air-cooled efficiency ceiling"]], 2021),
  chW("vt-acw-600", "Vertiv Liebert ACW 600 kW Chiller", "vertiv", 18e4, 600, 150, 4, ["Water-cooled Liebert chilled-water plant unit.", "Condenser water lets it run ~150 W/kW; you take on towers and water treatment instead.", ["Better kW/kW than air-cooled", "Tower and water-treatment overhead"], ["unverified"]], 2022),
  // ---- Schneider Electric (APC InRow / Uniflair) + Motivair (Schneider) ----
  door("se-inrow-rc-30", "APC InRow RC 30 kW Rear Door", "schneider", 16e3, 30, 9, 1.5, ["Fan-assisted rear-door heat exchanger mounting on standard APC racks.", "Assisted-door coils pull rack exhaust straight through chilled water, letting an air hall host one or two dense racks without touching the room design.", ["Retrofit-friendly density", "Door fans are another maintenance item"]]),
  crac("se-inrow-rd-35", "APC InRow RD 35 kW Roof Heat Rejection", "schneider", 13e3, 35, 30, 1.5, ["Roof-mounted heat-rejection unit venting hot-aisle containment air straight outside.", "Cuts the room out of the loop: contained hot air goes to the roof coil and returns cold, so white space stays at ambient pressure.", ["No interior floor space used", "Roof penetrations and weatherization"]]),
  crac("se-inrow-dx-30", "APC InRow DX 30 kW", "schneider", 26e3, 30, 32, 1.5, ["Self-contained DX in-row cooler for rooms without chilled water.", "Refrigerant circuit inside the row removes heat where it appears - the classic edge-site answer when there is no plant.", ["Zero plant dependency", "DX part-load efficiency is mediocre"]]),
  crac("se-inrow-fc-40", "APC InRow FC 40 kW (free-cooling)", "schneider", 31e3, 40, 22, 1.5, ["In-row chilled-water unit with economizer coil for cold-weather free cooling.", "Below about 12 C outdoor the economizer coil carries the load and the CW coil idles, trimming fan-and-pump power only.", ["Cheap winter operation", "Two coils per unit, more to clean"]], 2021),
  chA("se-uniflair-chiller-1000", "Uniflair Chiller Line 1 MW Air-Cooled", "schneider", 25e4, 1e3, 240, 4, ["Uniflair air-cooled screw chiller feeding CRAH chilled-water loops.", "Schneider pairs these with Uniflair CRAHs so white space and plant share EcoStruxure controls and one service contract.", ["One vendor, one BMS", "Hot-day derate typical of air-cooled"]]),
  chA("se-uniflair-fc-500", "Uniflair Free-Cooling Chiller 500 kW", "schneider", 145e3, 500, 210, 4, ["Air-cooled chiller with dual coils running compressors only when economizer hours run out.", "Northern climates can spend a third of the year compressor-free, dropping plant energy per kW removed dramatically.", ["Big seasonal energy cut", "Bigger footprint than plain 30XA-class frames"]], 2021),
  door("mv-chilled-door-75", "Motivair ChilledDoor 75 kW", "motivair", 22e3, 75, 10, 2, ["Active 75 kW rear-door heat exchanger for dense racks.", "Motivair pushed the rear-door concept past 50 kW with bigger coils and door fans, often bridging air halls toward liquid rows.", ["One door neutralizes a 75 kW rack", "Needs 12-18 C water at real flow"]], 2021),
  cdu("mv-cdu-1200", "Motivair CDU 1200 (1.2 MW)", "motivair", 33e4, 1200, 22, 3, ["Facility-grade 1.2 MW liquid-to-liquid CDU with concurrent-maintainable pump sets.", "Motivair engineered the megawatt CDU category hyperscalers standardized on; dual pumps let you service one side with the row still cooling.", ["True N+1 pumps and controls", "Facility water quality still rules throughput"]], 2023),
  cdu("mv-cdu-2300", "Motivair CDU 2300 (2.3 MW)", "motivair", 52e4, 2300, 22, 4, ["Flagship 2.3 MW CDU for GB300/Rubin-class liquid rows.", "When racks pass 130 kW, a single CDU per rack-pair with a 2.3 MW unit leaves headroom for the next silicon generation.", ["Top of the CDU capacity ladder", "Rigging and floor loading for a 3-tonne unit"]], 2024.5),
  // ---- STULZ ----
  crac("st-cyberair-30", "STULZ CyberAir 30 kW CRAC", "stulz", 36e3, 30, 34, 2, ["German precision CRAC with EC fans and stepless DX control.", "CyberAir is the European precision-cooling default: tight temperature control for halls that also host telecom or HPC white space.", ["Excellent part-load control", "Smaller service network outside EMEA"]]),
  crac("st-cyberair-80", "STULZ CyberAir 80 kW CW CRAH", "stulz", 66e3, 80, 23, 2, ["Chilled-water CyberAir frame at the top of the range.", "One 80 kW unit replaces three small CRACs, cutting fan count and floor space for the same heat.", ["Fewer units per hall", "Bigger single-point failure domains"]]),
  crac("st-cyberrow-41", "STULZ CyberRow 41 kW In-Row", "stulz", 23e3, 41, 26, 1.5, ["In-row cooler dropping into the hot aisle of contained rows.", "Complements CyberAir plant cooling with spot capacity where rack density spikes.", ["Localized density fix", "Row units need row-level monitoring"]], 2021),
  chA("st-cybercool-500", "STULZ CyberCool CM 500 kW Air-Cooled Chiller", "stulz", 14e4, 500, 230, 4, ["Air-cooled screw chiller from the STULZ CyberCool line.", "Matches the CyberAir white space for a single-vendor chilled-water plant, popular in European colo builds.", ["Matched controls and spares", "Air-cooled kW/kW ceiling"]], 2021),
  chA("st-cybercool-1000", "STULZ CyberCool CM 1 MW Air-Cooled Chiller", "stulz", 265e3, 1e3, 225, 4, ["Top frame of the CyberCool CM air-cooled range.", "Two of these carry a typical 2 MW CRAH hall; staging them gives cheap N+1.", ["2 MW from one pad", "Still compressor-hungry above 30 C ambient"]], 2022),
  // ---- Trane ----
  chA("tr-rtac-250", "Trane Series R RTAC 250 kW", "trane", 72e3, 250, 275, 4, ["Smallest step of the RTAC air-cooled screw chiller line.", "Series R helical-rotor compressors are the workhorse of small chiller plants; staging two 250 kW units beats one 500 kW frame for redundancy.", ["Cheap, compact, everywhere", "Efficiency collapses above 35 C"]]),
  chA("tr-rtac-550", "Trane Series R RTAC 550 kW", "trane", 148e3, 550, 270, 4, ["Mid-size RTAC air-cooled screw chiller.", "The default choice when there is no tower water and the hall outgrows packaged CRACs.", ["Air-cooled simplicity at scale", "Fan and condenser maintenance yearly"]]),
  chA("tr-rtaf-500", "Trane Sintesis RTAF 500 kW (free cooling)", "trane", 15e4, 500, 225, 4, ["Sintesis RTAF air-cooled chiller with integrated free-cooling coils.", "In EMEA climates the RTAF spends most hours below the compressor changeover point, running fans-only like a giant dry cooler.", ["Long economizer season", "Wider frame, taller coils to clean"]], 2021),
  chW("tr-cvhf-1000", "Trane CenTraVac CVHF 1 MW (magnetic bearing)", "trane", 34e4, 1e3, 140, 6, ["Water-cooled centrifugal chiller on oil-free magnetic bearings.", "Low-lift centrifugal compressors on a tower loop set the kW-per-ton record; magnetic bearings kill oil management entirely.", ["Best full-load and IPLV efficiency", "Needs towers, pumps and water chemistry"]], 2021),
  chW("tr-rtwd-1000", "Trane Sintesis RTWD 1 MW Water-Cooled Screw", "trane", 265e3, 1e3, 155, 5, ["Water-cooled screw chiller from the Sintesis range.", "Screw compressors hold part-load efficiency down to low loads, pairing well with modest tower plants.", ["Strong IPLV for its class", "Condenser water obligations apply"]], 2021),
  chA("tr-stealth-450", "Trane Sintesis Stealth 450 kW", "trane", 135e3, 450, 235, 4, ["Low-noise variant of the Sintesis air-cooled chiller range.", "Encased compressor compartments and night-mode fans keep sound pressure low - relevant for urban or residential-adjacent sites.", ["Noise compliance without barriers", "Acoustic treatment trims a little capacity"], ["unverified"]], 2022),
  // ---- Carrier ----
  chA("ca-30xa-350", "Carrier AquaForce 30XA 350 kW", "carrier", 95e3, 350, 275, 4, ["Air-cooled screw chiller from the AquaForce 30XA range.", "The 30XA is the global default small-plant chiller: one frame, R-134a circuit, service in every country.", ["Ubiquitous service network", "No free cooling without the 30XF variant"]]),
  chA("ca-30xa-600", "Carrier AquaForce 30XA 600 kW", "carrier", 158e3, 600, 270, 4, ["600 kW step of the AquaForce 30XA air-cooled line.", "Two frames side by side give a 1.2 MW plant with N+1 staging for CRAH halls.", ["Staging-friendly sizing", "Fixed-speed steps cost part-load efficiency"]]),
  chA("ca-30xf-500", "Carrier AquaForce 30XF 500 kW (free cooling)", "carrier", 145e3, 500, 220, 4, ["30XF adds integral free-cooling coils to the AquaForce platform.", "Hybrid coils reject heat directly to air when ambient allows, so compressors only run in the warm season.", ["Long compressor-off season", "Higher first cost than the 30XA"]], 2021),
  chW("ca-30xw-1000", "Carrier AquaForce 30XW 1 MW Water-Cooled", "carrier", 26e4, 1e3, 155, 5, ["Water-cooled screw chiller on a condenser/tower loop.", "Water-cooled screws split the difference between packaged DX and centrifugal plants: efficient, staged, tower-fed.", ["Good part-load on VFD screws", "Tower water and treatment needed"]]),
  chW("ca-19dv-2000", "Carrier AquaEdge 19DV 2 MW (oil-free)", "carrier", 56e4, 2e3, 135, 6, ["Oil-free magnetic-bearing centrifugal chiller from the AquaEdge 19DV line.", "No oil means no oil heaters, exchangers or separators, and the compressor rides part load with minimal penalty - the hyperscaler trim-plant favorite.", ["Near-zero part-load derate", "Premium price per kW"]], 2022),
  chW("ca-61xwh-350", "Carrier 61XWH 350 kW Water-Cooled", "carrier", 115e3, 350, 160, 5, ["Compact water-cooled chiller step for tight plants.", "Small water-cooled frames let you stage several units instead of one big centrifugal, spreading risk across the plant.", ["Staged redundancy in small kW steps", "Niche frame: check regional availability"], ["unverified"]], 2021),
  // ---- Johnson Controls (YORK) ----
  chA("jci-yvaa-500", "YORK YVAA 500 kW Air-Cooled (magnetic)", "jci", 15e4, 500, 235, 5, ["YVAA variable-speed air-cooled screw chiller on magnetic bearings.", "Oil-free YVAA compressors track load nearly linearly, so part-load kW per kW removed is among the best of any air-cooled frame.", ["Oil-free part-load champion", "Air-cooled ceiling still applies"]]),
  chA("jci-yvaa-1600", "YORK YVAA 1.6 MW Air-Cooled (magnetic)", "jci", 47e4, 1600, 230, 5, ["Top frame of the YVAA air-cooled magnetic-bearing line.", "One YVAA 1600 replaces three mid-size frames; staging two gives a 3 MW air-cooled plant without towers.", ["Big capacity, no tower", "Highest $/kW of the air-cooled list"]]),
  chA("jci-yvfa-900", "YORK YVFA 900 kW Free-Cooling", "jci", 27e4, 900, 220, 5, ["YVFA air-cooled chiller with integral free-cooling coils.", "The extra coil section turns the chiller into a dry cooler for most of the year - the plant becomes seasonal equipment.", ["Compressor-free winter operation", "Bigger footprint and fan count"]], 2021),
  chW("jci-yz-1500", "YORK YZ 1.5 MW Water-Cooled (magnetic)", "jci", 43e4, 1500, 135, 6, ["YZ oil-free magnetic-bearing centrifugal chiller on a tower loop.", "The YZ competes with CenTraVac and AquaEdge 19DV for the efficient-end of big plants; mixing brands in one plant is a spares decision.", ["Reference-class efficiency", "Tower dependency", "Premium $/kW"]], 2021),
  chW("jci-yk-2500", "YORK YK 2.5 MW Water-Cooled Centrifugal", "jci", 7e5, 2500, 150, 6, ["Classic YK centrifugal workhorse of large chilled-water plants.", "Decades of field data, rebuildable compressors and competitive price keep YKs in plants that value predictability over peak efficiency.", ["Proven and rebuildable", "Older part-load behavior than oil-free rivals"]]),
  chA("jci-yvam-600", "YORK YVAM 600 kW (Silent Night)", "jci", 185e3, 600, 240, 5, ["YVAM air-cooled magnetic-bearing chiller in the low-noise Silent Night configuration.", "Night-mode fan maps and acoustic lining keep residential neighbors quiet while the oil-free compressors hold part-load efficiency.", ["Noise-regulated sites", "Small premium and a niche variant"], ["unverified"]], 2022),
  // ---- Daikin Applied ----
  chA("dk-pathfinder-500", "Daikin Pathfinder 500 kW Air-Cooled", "daikin", 14e4, 500, 225, 4, ["Pathfinder air-cooled chiller running low-GWP R-32 refrigerant.", "R-32 cuts both refrigerant charge rules friction and efficiency penalties; the Pathfinder is the future-proofed air-cooled plant pick.", ["Low-GWP refrigerant compliance", "R-32 handling certifications for staff"]], 2021),
  chA("dk-pathfinder-1100", "Daikin Pathfinder 1.1 MW Air-Cooled", "daikin", 29e4, 1100, 220, 4, ["Largest Pathfinder step, inverter-driven air-cooled chiller.", "Inverter screws glide across part load, which is where datacenter plants actually live most hours of the year.", ["Inverter part-load savings", "Air-cooled hot-day derate"]], 2022),
  chW("dk-wme-1300", "Daikin Magnitude WME 1.3 MW Water-Cooled (oil-free)", "daikin", 4e5, 1300, 140, 6, ["Magnitude WME oil-free magnetic-bearing centrifugal chiller.", "The Magnitude line invented the oil-free centrifugal category; WME frames carry big halls on tower water with minimal maintenance.", ["Category-defining oil-free tech", "Tower loop required"]], 2021),
  chW("dk-navigator-450", "Daikin Navigator 450 kW Water-Cooled Screw", "daikin", 13e4, 450, 160, 5, ["Navigator water-cooled screw chiller for staged plants.", "Cheaper per kW than Magnitude frames, with enough efficiency for plants that stage several screws across the day.", ["Budget-friendly water-cooled step", "Not the efficiency leader"]]),
  // ---- Mitsubishi Electric ----
  chA("me-chiller-400", "Mitsubishi Electric Inverter Air-Cooled Chiller (400 kW)", "mitsubishi-electric", 115e3, 400, 240, 4, ["Inverter-driven commercial chiller from the Mitsubishi Electric HVAC line.", "Common across Japanese and Southeast Asian datacenter builds; inverter scroll/screw compressors hold part-load efficiency without tower water.", ["Strong inverter part load", "Regional availability varies outside Asia"], ["unverified"]], 2022),
  // ---- Munters ----
  crac("mu-oasis-250", "Munters Oasis 250 kW Indirect Evaporative", "munters", 125e3, 250, 40, 3, ["Indirect evaporative AHU: outside air cooled by an exchanger wet side, never touching IT air.", "The Oasis family runs the numbers for hot-dry sites: outside-air PUE near 1.1 with no moisture carried into the hall.", ["Evaporator hours without wet IT air", "Water quality and pad maintenance"]]),
  crac("mu-oasis-500", "Munters Oasis 500 kW Indirect Evaporative", "munters", 235e3, 500, 38, 3, ["Twin-fan Oasis frame for 500 kW of indirect evaporative cooling.", "Bigger fans and a shared wet section cut per-kW fan power; two units stage for redundancy.", ["Low-PUE air cooling at scale", "Needs makeup water and drain infrastructure"]]),
  crac("mu-sycool-75", "Munters SyCool 75 kW Edge Unit", "munters", 45e3, 75, 30, 2, ["Compact precision unit bringing Munters economizer tech to edge rooms.", "SyCool packs a small AHU-style cooler into 75 kW for pop sites where full AHUs cannot fit.", ["Edge-sized economizer", "Single-unit failure domain"], ["unverified"]], 2021),
  // ---- Alfa Laval ----
  cdu("al-phe-2000", "Alfa Laval M15 Gasketed PHE (2 MW loop HX)", "alfa-laval", 6e4, 2e3, 4, 2, ["Gasketed plate heat exchanger isolating facility and rack coolant loops.", "A CDU minus the pumps: M15 plates transfer megawatts between loops with pressure drops measured in metres of head.", ["Cheap per MW, nearly no parasitics", "You own the pump and controls design"]]),
  dry("al-drycooler-900", "Alfa Laval Air-Cooled Heat Exchanger (900 kW)", "alfa-laval", 78e3, 900, 20, 2, ["Finned-tube air-cooled exchanger rejecting warm-loop heat with fans only.", "Alfa Laval sells the coil-and-fan unit that integrators turn into DLC dry-cooler plants; zero water, compressor-free.", ["No water, no compressor", "Hot-day derating to size for"], ["unverified"]], 2021),
  // ---- Baltimore Aircoil ----
  twr("bac-vxt-750", "BAC VXT Evaporative Tower (750 kW)", "baltimore-aircoil", 65e3, 750, 12, 3, ["Vertical induced-draft crossflow cooling tower.", "Evaporation rejects condenser heat at a fraction of chiller power; the tower is why water-cooled plants win the kW-per-ton race.", ["Cheapest heat rejection per kW", "Water burn ~1.8 L/kWh rejected"]]),
  cc("bac-1500-cc-1000", "BAC Series 1500 Closed-Circuit Cooler (1 MW)", "baltimore-aircoil", 125e3, 1e3, 18, 3, ["Closed-circuit cooler: process fluid stays in a clean coil while spray water wets the outside.", "Keeps the DLC loop sealed from airborne dirt and legionella exposure, at the cost of coil fouling checks.", ["Clean sealed coolant loop", "Heavier and pricier than open towers"]]),
  cc("bac-hxi-1000", "BAC HXI Hybrid Cooler (1 MW)", "baltimore-aircoil", 15e4, 1e3, 16, 3, ["Hybrid wet/dry closed-circuit cooler switching between dry and evaporative modes.", "Runs dry when ambient allows (no water use) and wets the coil on hot days - the compliance-friendly tower for water-restricted sites.", ["Dry mode saves water most of the year", "Highest cost per kW of the BAC line"]], 2021),
  // ---- EVAPCO ----
  twr("ev-atc-1000", "EVAPCO ATC Evaporative Tower (1 MW)", "evapco", 95e3, 1e3, 12, 3, ["Induced-draft counterflow tower from the ATC line.", "EVAPCO towers feed condenser loops across hyperscale campuses; capacity per dollar of heat rejection is unbeaten.", ["Lowest $ per kW rejected", "Legionella and drift management"]]),
  cc("ev-eco-ls-900", "EVAPCO eco-LS Closed-Circuit Cooler (900 kW)", "evapco", 115e3, 900, 18, 3, ["Closed-circuit cooler keeping DLC fluid in a sealed coil.", "The loop stays clean without a plate HX; a spray system wets the coil only when ambient demand requires.", ["Sealed coolant path", "Coil scale/fouling checks quarterly"]]),
  cc("ev-eco-at-800", "EVAPCO eco-AT Hybrid Tower (800 kW)", "evapco", 14e4, 800, 15, 3, ["Hybrid cooler alternating dry and evaporative operation.", "Adiabatic pre-cooling plus dry coils cut annual water use 60-90% versus a plain tower - the answer where discharge permits bite.", ["Water-rationing-proof", "Costs more per kW than either pure mode"]], 2021),
  // ---- Nortek Air Solutions / Colt ----
  crac("nkc-il800-350", "Colt IL800 Indirect Evaporative AHU (350 kW)", "nortek-colt", 15e4, 350, 42, 3, ["Modular indirect evaporative cooling unit from the Colt IL line.", "Colt IL units cool European halls with outside air through a wet-side exchanger, hitting PUEs near 1.15 without wet IT air.", ["Evaporative hours, dry IT air", "Rooftop or yard space and water supply"]]),
  crac("nkc-il1400-600", "Colt IL1400 Indirect Evaporative AHU (600 kW)", "nortek-colt", 24e4, 600, 40, 3, ["Largest IL-series indirect evaporative unit.", "One IL1400 replaces several CRAHs; ducted AHUs beat unit-level cooling on fan efficiency at scale.", ["AHU economics at 600 kW", "Single-unit blast radius - stage two"]]),
  // ---- Airedale by Modine ----
  chA("ad-modcel-450", "Airedale Modcel 450 kW Modular Chiller", "airedale", 12e4, 450, 235, 3, ["Modular air-cooled chiller built from stacked 450 kW cells.", "Modcel cells crane in one at a time: capacity grows with the hall instead of one giant lift, popular with UK/EU colo operators.", ["Phased capacity growth", "More frames and fans to maintain"]]),
  chA("ad-titan-2000", "Airedale Titan 2 MW Air-Cooled Chiller", "airedale", 52e4, 2e3, 225, 4, ["Large-frame air-cooled chiller aimed squarely at datacenter plants.", "Titan-class frames pack megawatt capacity into air-cooled format for sites that cannot justify tower water.", ["MW-class without towers", "Big-pad footprint and fan noise"], ["unverified"]], 2022),
  // ---- Rittal ----
  crac("rt-lcp-inline-40", "Rittal LCP Inline CW 40 kW", "rittal", 28e3, 40, 25, 1.5, ["Inline liquid-cooling package inserting between rack rows.", "The LCP bolts into Rittal bayed-suite rows and feeds chilled water through fans in-line, no raised floor needed.", ["Turnkey with Rittal rows", "40 kW ceiling per unit"]]),
  crac("rt-lcp-rack-30", "Rittal LCP Rack CW 30 kW", "rittal", 23e3, 30, 27, 1.5, ["Rack-integrated water-air cooler occupying a cabinet slot.", "One cabinet becomes the cooler for its neighbors - spot density relief inside standard Rittal enclosures.", ["No external footprint", "Consumes a rack position"]]),
  // ---- CoolIT ----
  cdu("ct-chx800", "CoolIT CHx800 CDU (800 kW)", "coolit", 27e4, 800, 20, 3, ["800 kW liquid-to-liquid CDU from the CoolIT CHx family.", "CHx units pair with CoolIT cold plates end-to-end: one vendor from silicon to facility water simplifies warranty chains.", ["Plate-to-plant single vendor", "Row-level blast radius per unit"]], 2023),
  cdu("ct-chx2000", "CoolIT CHx2000 CDU (2 MW)", "coolit", 52e4, 2e3, 19, 4, ["2 MW flagship CHx liquid-to-liquid CDU.", "Redundant pump modules and warm-water operation target GB300/Rubin rows running dry-cooler-first plants.", ["Covers two dense NVL-class rows", "Requires 32 C+ facility water quality discipline"]], 2024.5),
  // ---- LiquidStack ----
  cdu("ls-cdu-1500", "LiquidStack CDU 1500 (1.5 MW)", "liquidstack", 43e4, 1500, 18, 3, ["Liquid-to-liquid CDU from the immersion-specialist turned DLC vendor.", "LiquidStack brings immersion-grade coolant handling to plate loops; CDUs share the pump and filtration philosophy of its tank systems.", ["Coolant chemistry expertise", "Newer field-install base than Vertiv/CoolIT"], ["unverified"]], 2024),
  tank("ls-tank-100", "LiquidStack Immersion Tank (100 kW)", "liquidstack", 17e4, 100, 10, 3, ["Single-phase immersion tank from the BitCool lineage.", "Servers sink into dielectric fluid; the same vendor can supply tank and CDU for full-immersion blocks.", ["Fans vanish, density rises", "Immersion-qualified hardware only"], ["unverified"]], 2021),
  // ---- Submer ----
  tank("su-smartpod-25", "Submer SmartPod 25 kW", "submer", 75e3, 25, 9, 2, ["Compact single-phase immersion pod for edge and lab sites.", "The 25 kW MicroPod brings Submer tank operations to sites that cannot host the 100 kW standard frame.", ["Edge-immersion entry", "Small batches raise per-kW cost"]], 2021),
  // ---- GRC ----
  tank("grc-iceraq-100", "GRC ICEraQ Immersion Rack (100 kW)", "grc", 15e4, 100, 15, 2, ["Immersion rack system integrating tank, CDU and rack in one enclosure.", "ICEraQ treats immersion as rack plumbing: roll the tank in, connect facility water, and a 100 kW block is live.", ["Integrated CDU and tank", "Proprietary rails and service flow"]], 2021),
  // ---- Asperitas ----
  tank("asp-icp-a25", "Asperitas Immersed Computing A25 (25 kW)", "asperitas", 6e4, 25, 8, 2, ["Natural-convection immersion bath requiring no pump for the IT side.", "Asperitas baths rely on buoyancy-driven circulation of dielectric fluid - fewer moving parts than pumped immersion designs.", ["Near-silent, pumpless immersion", "Lower density ceilings than pumped tanks"], ["unverified"]], 2021),
  // ---- Nidec / Boyd / Delta ----
  cdu("nd-cdu-1200", "Nidec Industrial CDU 1200 (1.2 MW)", "nidec", 38e4, 1200, 20, 3, ["Facility CDU from Nidec Industrial Solutions entering the liquid-cooling market.", "A motor-and-drive giant applying industrial pump/training discipline to megawatt CDUs, usually competitive on price.", ["Aggressive pricing", "Thin datacenter service network"], ["unverified"]], 2024),
  plate("bd-plate-b200", "Boyd GPU Cold-Plate Loop Kit (60 kW)", "boyd", 18e3, 60, 12, 2, ["Cold plates, manifolds and quick-disconnects for a liquid-cooled GPU tray.", "Boyd (Aavid lineage) supplies GB200-class plates to OEMs; the same designs sell as retrofit loop kits.", ["OEM-grade plate engineering", "Still needs a CDU behind it"]], 2024.5),
  cdu("dl-cdu-600", "Delta CDU 600 (600 kW)", "delta", 19e4, 600, 19, 3, ["Mid-size liquid-to-liquid CDU from the Delta liquid line.", "Delta rides its ODM relationships: CDUs land inside hyperscaler builds at component-grade pricing.", ["ODM economics", "Self-integration burden on you"], ["unverified"]], 2024),
  // ---- Equinix-style retrofit doors + generic/dry-cooler vendors ----
  door("gen-equinix-rdhx-30", "High-Density Retrofit Rear Door (30 kW)", "generic", 13e3, 30, 6, 1.5, ["Colo-style rear-door retrofit as deployed across Equinix IBX high-density zones.", "Rear doors are how carriers/colos upgrade legacy cabinets to 30 kW without touching hall airflow design.", ["Retrofit path to 30 kW cabinets", "Door-by-door chilled-water drops add IM trades"]], 2021),
  dry("gen-adiabatic-1200-b", "Adiabatic Dry Cooler (1.2 MW)", "generic", 95e3, 1200, 24, 2, ["Dry cooler with adiabatic pre-cooling pads for hot-day capacity recovery.", "Most of the year it is a plain fan-coil radiator; water misting of the intake recovers design capacity on 35 C+ days.", ["Year-round compressor-free cooling", "Adiabatic pads consume water and need hygiene checks"]]),
  dry("gun-gch-1200", "Guentner Dry Cooler (1.2 MW)", "gunther", 9e4, 1200, 20, 2, ["Microchannel dry cooler from the Guentner industrial range.", "Guentner coils are the OEM-standard behind many CDU and chiller plants; buying direct saves integrator margin.", ["OEM-grade coil metallurgy", "Integrator duties fall on you"]]),
  dry("gun-hydrobox-800", "Guentner Adiabatic Cooler (800 kW)", "gunther", 95e3, 800, 22, 2, ["Adiabatic variant of the Guentner air-cooled line.", "Hydro-mode misting keeps approach temperatures tight in hot climates while staying compressor-free.", ["Hot-climate dry cooling", "Water treatment obligations"], ["unverified"]], 2021),
  dry("lv-xlin-1000", "LU-VE Dry Cooler (1 MW)", "lu-ve", 85e3, 1e3, 20, 2, ["Finned dry cooler from the LU-VE heat-exchanger range.", "Italian coil maker supplying both OEM condensers and site-ready dry coolers for warm-water loops.", ["Competitive coil pricing", "Smaller global service footprint"]]),
  dry("tk-ths-900", "Thermokey Dry Cooler (900 kW)", "thermokey", 75e3, 900, 21, 2, ["Value-tier dry cooler from the Thermokey range.", "Thermokey coils undercut the big brands for budget dry-cooler plants; spec verification is on you.", ["Lowest $/kW of the dry list", "Shorter vendor track record"]])
];
const v$1 = (id, name, sells, summary) => ({
  id,
  name,
  sells,
  reliability: 0.9,
  support: 0.85,
  volumeDiscountPerDoublingPct: 5,
  codex: { summary, explain: `${name} supplies datacenter cooling infrastructure. Compare lead time, service coverage and spares logistics, not just price.`, tradeoffs: ["Specialist depth in its category", "Service network varies by region"] }
});
const CAT_COOLING_VENDORS = [
  v$1("stulz", "STULZ", ["cooling"], "German precision-cooling specialist: CyberAir CRAC/CRAH, CyberRow in-row and CyberCool chillers."),
  v$1("mitsubishi-electric", "Mitsubishi Electric", ["cooling"], "Japanese HVAC major whose inverter chillers serve Asian datacenter plants."),
  v$1("munters", "Munters", ["cooling"], "Indirect evaporative cooling specialist (Oasis AHUs, SyCool edge units) for low-PUE air halls."),
  v$1("alfa-laval", "Alfa Laval", ["cooling"], "Heat-exchanger maker: the gasketed PHEs inside most CDUs and dry coolers."),
  v$1("baltimore-aircoil", "Baltimore Aircoil (BAC)", ["cooling"], "Cooling towers, closed-circuit and hybrid coolers (VXT, Series 1500, HXI)."),
  v$1("evapco", "EVAPCO", ["cooling"], "Towers, closed-circuit coolers and hybrid eco-series heat rejection."),
  v$1("nortek-colt", "Nortek Air Solutions (Colt)", ["cooling"], "Indirect evaporative AHUs (Colt IL series) and datacenter air handling."),
  v$1("airedale", "Airedale by Modine", ["cooling"], "UK datacenter chiller specialist: Modcel modular and Titan-class air-cooled chillers."),
  v$1("rittal", "Rittal", ["cooling"], "Enclosure-integrated cooling: LCP inline/rack packages and bayed-suite infrastructure."),
  v$1("liquidstack", "LiquidStack", ["cooling"], "Immersion-origin liquid cooling vendor: DLC CDUs and immersion tanks."),
  v$1("grc", "GRC", ["cooling"], "Integrated immersion rack systems (ICEraQ) with tank, CDU and rack as one product."),
  v$1("asperitas", "Asperitas", ["cooling"], "Natural-convection single-phase immersion (Immersed Computing baths)."),
  v$1("nidec", "Nidec Industrial Solutions", ["cooling"], "Industrial pump/motor group entering megawatt CDUs."),
  v$1("boyd", "Boyd", ["cooling"], "Thermal specialist (Aavid lineage): GPU cold plates and liquid loop hardware."),
  v$1("gunther", "Guentner", ["cooling"], "Dry coolers and adiabatic coils behind warm-water DLC plants."),
  v$1("lu-ve", "LU-VE", ["cooling"], "Italian heat-exchanger maker: dry coolers and condenser coils."),
  v$1("thermokey", "Thermokey", ["cooling"], "Value-tier coils and dry coolers for budget heat-rejection plants.")
];
const CAT_COOLING = RAW_COOLING.map((c) => c.coolingType === "crah" && /\bDX\b|PDX|DSE|CRAC/.test(c.name) && c.wattsPerKW < 120 ? { ...c, wattsPerKW: /free|adiabatic|AFC|DSE/i.test(c.name) ? 180 : 280 } : c);
const cdx$1 = ([summary, explain, tradeoffs]) => ({ summary, explain, tradeoffs, tags: ["expansion"] });
const base$1 = (id, name, vendor, from, price, lead, c) => ({ id, name, vendor, availableFrom: from, priceUSD: price, leadTimeMonths: lead, codex: cdx$1(c) });
const pw$1 = (o2) => ({ kind: "power", ...o2 });
const co$1 = (o2) => ({ kind: "cooling", ...o2 });
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
const pcieAccel = (o2) => ({ ...L40S, ...o2 });
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
const cpu = (o2) => ({ ...AMD7742, ...o2 });
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
const nic = (o2) => ({ kind: "nic", features: ["rdma"], ...o2 });
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
const sw$1 = (o2) => ({ kind: "switch", cooling: ["air"], inNetworkCompute: false, ...o2 });
const EXP_SWITCHES = [
  sw$1({
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
  sw$1({
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
  sw$1({
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
  sw$1({
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
const pw = (o2) => ({ kind: "power", ...o2 });
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
const co = (o2) => ({ kind: "cooling", ...o2 });
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
const ss = (o2) => ({ kind: "storage", ...o2 });
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
const mem = (o2) => ({ kind: "memory", ...o2 });
const EXP_MEMORY = [
  mem({ ...base("sam-ddr5-4800-32", "Samsung DDR5-4800 RDIMM 32GB", "samsung", 2022, 230, 1, ["Entry DDR5 DIMM for cost-sensitive hosts.", "Enough for inference hosts that do not cache datasets.", ["Cheap", "Low capacity"]]), type: "ddr5", capacityGB: 32, speedMTs: 4800, watts: 8 }),
  mem({ ...base("sam-ddr5-5600-128", "Samsung DDR5-5600 RDIMM 128GB", "samsung", 2023.5, 1400, 2, ["128GB DDR5 for memory-hungry hosts.", "Useful for CPU offload and KV-cache spill; costs more per GB.", ["High capacity per slot", "Higher $/GB"]]), type: "ddr5", capacityGB: 128, speedMTs: 5600, watts: 12 })
];
const nv = (o2) => ({ kind: "nvme", ...o2 });
const EXP_NVME = [
  nv({ ...base("gen-nvme-boot-960", "Boot NVMe 960 GB (M.2)", "generic", 2020, 140, 1, ["Small boot drive for the OS image.", "Keeps the host alive when the big drives are busy with checkpoints.", ["Cheap", "Little capacity"]]), capacityTB: 0.96, readGBs: 3.5, writeGBs: 1.5, pcieGen: 4, watts: 6 })
];
const _v = [...VENDORS$1, ...EXP2_VENDORS, ...CAT_POWER_VENDORS, ...CAT_STORAGE_VENDORS, ...CAT_SWITCH_VENDORS, ...CAT_NIC_VENDORS, ...OEM_VENDORS, ...CAT_COOLING_VENDORS];
const SW_FIX = {
  "nv-sn4600c": { portCount: 64, portGbps: 100, tech: "eth-100" },
  "cs-n93180fx3": { portCount: 48, portGbps: 25 },
  "cs-n93600gx": { portCount: 28, portGbps: 100 }
};
const fixSwitch = (x) => {
  const y = { ...x, ...SW_FIX[x.id] ?? {} };
  const calc = y.portCount * y.portGbps / 1e3;
  return Math.abs(calc - y.capacityTbps) / Math.max(calc, 0.01) > 0.12 && calc >= 1 ? { ...y, capacityTbps: Math.round(calc * 100) / 100 } : y;
};
const CAT_SWITCHES = [...CAT_SWITCHES_A, ...CAT_SWITCHES_B].map(fixSwitch);
const VENDORS = _v.filter((x, i) => _v.findIndex((y) => y.id === x.id) === i);
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
  ...EXP2_UPLINKS,
  ...CAT_POWER,
  ...CAT_COOLING,
  ...CAT_STORAGE_SYSTEMS,
  ...CAT_MEMORY,
  ...CAT_NVME,
  ...CAT_RACKS,
  ...CAT_NICS,
  ...CAT_CABLES,
  ...CAT_SWITCHES
];
const BY_ID = new Map(ALL_ITEMS.map((i) => [i.id, i]));
const getItem = (id) => BY_ID.get(id);
const ITEMS_BY_KIND = (k2) => ALL_ITEMS.filter((i) => i.kind === k2);
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
  [2025, 3.6],
  [2026, 4.4],
  [2026.8, 5.6],
  [2027, 5.6],
  [2028, 5.2]
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
  [2021, 12e3],
  [2022, 4e4],
  [2023, 12e4],
  [2024, 3e5],
  [2025, 6e5],
  [2026, 1e6],
  [2027, 15e5],
  [2028, 22e5]
];
const ACCEL_BUCKETS = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
const bucket = (n) => ACCEL_BUCKETS.find((b) => b >= n) ?? ACCEL_BUCKETS[ACCEL_BUCKETS.length - 1];
const CONTEXT_OPTIONS = [
  [2022, [1024, 2048]],
  [2024, [2048, 4096, 8192]],
  [2026, [8192, 32768, 65536]],
  [2029, [32768, 131072, 262144]]
];
const round2$2 = (x) => Math.round(x * 100) / 100;
const round3$1 = (x) => Math.round(x * 1e3) / 1e3;
const ARCHETYPE_TABLE = {
  startup: { minRep: 0, weight: 0.38, accelMult: 1, tokenMult: 0.25, priceMult: 0.9, trainDur: [2, 6], inferDur: [3, 9], sla: 0.95, penalty: [4e-3, 8e-3] },
  lab: { minRep: 20, weight: 0.3, accelMult: 1, tokenMult: 0.6, priceMult: 1, trainDur: [4, 10], inferDur: [6, 12], sla: 0.97, penalty: [5e-3, 0.01] },
  enterprise: { minRep: 45, weight: 0.22, accelMult: 2, tokenMult: 1, priceMult: 1.1, trainDur: [6, 18], inferDur: [12, 24], sla: 0.98, penalty: [8e-3, 0.015] },
  sovereign: { minRep: 70, weight: 0.1, accelMult: 4, tokenMult: 2.5, priceMult: 1.15, trainDur: [12, 36], inferDur: [24, 48], sla: 0.995, penalty: [0.01, 0.02] }
};
function rollArchetype(rng, reputation) {
  const eligible = Object.keys(ARCHETYPE_TABLE).map((a) => ({ a, t: ARCHETYPE_TABLE[a] })).filter(({ t }) => reputation >= t.minRep);
  const total = eligible.reduce((s2, e) => s2 + e.t.weight, 0);
  let r = rng() * total;
  for (const e of eligible) {
    r -= e.t.weight;
    if (r <= 0) return e.a;
  }
  return eligible[0].a;
}
function generateContracts(state2, month, rng) {
  const year = monthToYear(month);
  const eligible = MODELS.filter((m) => m.era <= year + 0.01);
  if (eligible.length === 0) return [];
  const out = [];
  const n = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const tail = eligible.filter((m) => m.activeParamsB <= 80 && m.paramsB <= 700);
    const model = rng() < 0.5 && tail.length ? pick(rng, tail) : pick(rng, rng() < 0.6 ? eligible.slice(-4) : eligible.slice(-8));
    const trainP = model.paramsB > 200 ? 0.7 : model.paramsB < 15 ? 0.12 : 0.4;
    const archetype = rollArchetype(rng, state2.reputation);
    const t = ARCHETYPE_TABLE[archetype];
    const suffix = String(1e3 + Math.floor(rng() * 9e3));
    const common = {
      customer: pick(rng, CUSTOMERS[archetype]),
      archetype,
      model,
      durationMonths: 0,
      penaltyRate: round3$1(randRange(rng, t.penalty[0], t.penalty[1])),
      deadlineMonth: month + randInt(rng, 2, 6),
      slaAvailability: Math.min(0.999, Math.max(0.9, t.sla + randRange(rng, -5e-3, 5e-3)))
    };
    if (rng() < trainP) {
      const stateGB = 16 * model.paramsB;
      const memPerAccel = lerpCurve$1(ERA_MEM_GB, year);
      const raw = stateGB / memPerAccel * randRange(rng, 2, 4.5) * t.accelMult;
      const minAccelerators = Math.min(32768, Math.max(32, bucket(Math.ceil(raw))));
      const isMoe = model.activeParamsB < model.paramsB * 0.8;
      const moeDomain = year >= 2025.5 ? 32 : year >= 2024.9 ? 16 : 8;
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
        minScaleOutGBsPerAccel: round2$2(model.paramsB < 15 ? tier * 0.75 : tier),
        minTotalMemGB: Math.ceil(stateGB),
        pricePerAccelHour: round2$2(
          gpuHourAnchor(year) * (model.paramsB >= 300 ? 1.15 : isMoe ? 0.95 : 1) * t.priceMult * randRange(rng, 0.92, 1.15) * (state2.marketPriceIndex ?? 1)
          // rival competition reprices fresh offers
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
          round3$1(
            mtokPrice(model.activeParamsB, year) * (tpotMs < 30 ? 1.25 : 1) * t.priceMult * randRange(rng, 0.9, 1.2) * (state2.marketPriceIndex ?? 1)
            // rival competition reprices fresh offers
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
const up = (id) => {
  const i = getItem(id);
  return i && i.kind === "uplink" ? i : void 0;
};
function uplinkGbps(s2) {
  if (!s2.uplinks) return Infinity;
  return Object.entries(s2.uplinks).reduce((n, [id, c]) => n + (up(id)?.gbps ?? 0) * c, 0);
}
const uplinkMonthlyUSD = (s2) => Object.entries(s2.uplinks ?? {}).reduce((n, [id, c]) => n + (up(id)?.mrcUSD ?? 0) * c, 0);
const carrierCount = (s2) => new Set(Object.entries(s2.uplinks ?? {}).filter(([, c]) => c > 0).map(([id]) => up(id)?.carrier).filter(Boolean)).size;
function contractNeedGbps(c) {
  return c.kind === "inference" ? Math.max(0.2, (c.tokensPerSec ?? 0) / 5e4) : Math.max(0.2, (c.minAccelerators ?? 0) * 0.02);
}
function totalNeedGbps(s2) {
  return s2.activeContracts.filter((a) => a.clusterIds.length > 0).reduce((n, a) => n + contractNeedGbps(a.contract), 0);
}
const DEFAULT_POLICY = { burnInMonths: 1, maintenance: 0 };
const policyOf = (g) => g.policy ?? DEFAULT_POLICY;
const burnInLeadDelta = (g) => policyOf(g).burnInMonths - 1;
const BURN_IN_FAIL_MULT = [3, 1, 0.5, 0.25];
const commissionFailMult = (g) => BURN_IN_FAIL_MULT[policyOf(g).burnInMonths] ?? 1;
const MAINT_FAIL_MULT = [1, 0.75, 0.55];
const maintenanceFailMult = (g) => MAINT_FAIL_MULT[policyOf(g).maintenance] ?? 1;
const MAINT_COST_PER_RACK = [0, 150, 400];
const maintenanceUSD = (g) => {
  const racks = g.halls.reduce((n, h) => n + h.racks.filter((r) => r.status === "online").length, 0);
  return racks * (MAINT_COST_PER_RACK[policyOf(g).maintenance] ?? 0);
};
const HOURS_PER_MONTH = 730;
const STAFF_COST_PER_MONTH = 12e3;
const SUPPORT_RATE_PER_YEAR = 0.035;
const DEPRECIATION_YEARS = 5;
const DEFAULT_APR = 0.07;
const FALLBACK_PUE = 1.4;
const clusterPowerKW = (state2) => state2.clusters.reduce((s2, c) => s2 + (c.stats?.powerKW ?? 0), 0);
const weightedPue = (state2) => {
  const total = state2.halls.reduce((s2, h) => s2 + h.itPowerKW, 0);
  if (total <= 0) {
    const ps = state2.halls.map((h) => h.pue);
    return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : FALLBACK_PUE;
  }
  return state2.halls.reduce((s2, h) => s2 + h.pue * h.itPowerKW, 0) / total;
};
function monthlyOpex(state2, opts = {}) {
  const itPowerKW = Math.max(0, opts.itPowerKW ?? clusterPowerKW(state2));
  const pue2 = opts.pue ?? weightedPue(state2);
  const kwh = itPowerKW * pue2 * HOURS_PER_MONTH;
  const powerUSD = kwh * state2.utilityUSDPerKWh;
  const staffUSD = state2.staff * (opts.staffCostPerMonth ?? STAFF_COST_PER_MONTH);
  const supportUSD = (opts.capexUSD ?? estimateCapexBasis(state2)) * SUPPORT_RATE_PER_YEAR / 12;
  const networkUSD = uplinkMonthlyUSD(state2);
  const maintenance = maintenanceUSD(state2);
  return {
    itPowerKW,
    pue: pue2,
    kwh,
    powerUSD,
    staffUSD,
    supportUSD,
    networkUSD,
    maintenanceUSD: maintenance,
    totalUSD: powerUSD + staffUSD + supportUSD + networkUSD + maintenance
  };
}
const monthlyDepreciation = (capexUSD, years = DEPRECIATION_YEARS) => years > 0 ? capexUSD / (years * 12) : 0;
const monthlyInterest = (debtUSD, apr = DEFAULT_APR) => debtUSD * apr / 12;
function trayBomValue(design) {
  let v2 = getItem(design.chassisId)?.priceUSD ?? 0;
  return v2 + design.parts.reduce((s2, p) => s2 + (getItem(p.itemId)?.priceUSD ?? 0) * p.count, 0);
}
function rackBomValue(state2, design) {
  let v2 = getItem(design.rackId)?.priceUSD ?? 0;
  for (const item of design.items) {
    if (item.type === "tray") {
      const tray = state2.trays.find((t) => t.id === item.trayId);
      v2 += (tray ? trayBomValue(tray) : 0) * item.count;
    } else {
      const id = item.type === "switch" ? item.switchId : item.type === "storage" ? item.storageId : item.powerId;
      v2 += (getItem(id)?.priceUSD ?? 0) * item.count;
    }
  }
  return v2;
}
function estimateCapexBasis(state2) {
  let v2 = 0;
  for (const [id, count] of Object.entries(state2.inventory)) v2 += (getItem(id)?.priceUSD ?? 0) * count;
  for (const hall of state2.halls) {
    for (const [id, count] of Object.entries(hall.powerEquip)) v2 += (getItem(id)?.priceUSD ?? 0) * count;
    for (const [id, count] of Object.entries(hall.coolingEquip)) v2 += (getItem(id)?.priceUSD ?? 0) * count;
    for (const rack of hall.racks) {
      const design = state2.racks.find((r) => r.id === rack.designId);
      if (design) v2 += rackBomValue(state2, design);
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
const clamp$5 = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const r2 = (x) => Math.round(x * 100) / 100;
const SOURCES = {
  grid: { names: ["Metro Utility", "Regional Grid Co-op", "StateWide Electric"], priceMWh: [58, 74], term: [12, 36], overdraw: [0.15, 0.3], overage: 1.4, firmness: [0.9, 0.97], lesson: "Utility firm service: reliable and flexible, priced near spot. Overdraw is tolerated until the interconnect trips." },
  solar: { names: ["SunHarvest PPA", "Helios Renewables", "DesertBright Solar"], priceMWh: [34, 46], term: [60, 120], overdraw: [0, 0.05], overage: 2, firmness: [0.72, 0.82], lesson: "Solar PPA: cheapest energy, but non-firm — nights and clouds mean you fall back to the grid at spot." },
  gas: { names: ["Cascade Gas Peakers", "Permian Power", "Gulf Coast Generation"], priceMWh: [78, 98], term: [24, 60], overdraw: [0.05, 0.12], overage: 1.8, firmness: [0.96, 0.99], lesson: "Gas generation: dispatchable and firm, but fuel-indexed and expensive. Tight overdraw limits." },
  hydro: { names: ["Columbia Basin Hydro", "Alpine Hydro Co"], priceMWh: [38, 52], term: [60, 180], overdraw: [0.05, 0.1], overage: 1.6, firmness: [0.9, 0.95], lesson: "Hydro: cheap, low-carbon baseload with long terms — but droughts happen." },
  nuclear: { names: ["Ridgeline Nuclear", "Harbor Atomic"], priceMWh: [48, 62], term: [120, 240], overdraw: [0, 0.03], overage: 2.5, firmness: [0.985, 0.998], lesson: "Nuclear PPA: the firmest carbon-free power, long take-or-pay terms and almost no overdraw — you must size the commit carefully." }
};
const POWER_SOURCES = SOURCES;
function generatePowerOffers(s2, rng, n = 1) {
  const out = [];
  const hallKW = s2.halls.reduce((a, h) => a + h.itPowerKW, 0);
  for (let i = 0; i < n; i++) {
    const kinds = Object.keys(SOURCES);
    const kind = kinds[Math.floor(rng() * kinds.length)];
    if ((kind === "nuclear" || kind === "hydro") && s2.reputation < 15 && rng() < 0.7) continue;
    const t = SOURCES[kind];
    const pick2 = (a) => a[0] + (a[1] - a[0]) * rng();
    const baseMW = Math.max(1, Math.round(hallKW / 1e3 * (0.4 + rng() * 1.2) * (kind === "nuclear" ? 3 : 1)));
    out.push({
      id: `pw-${s2.month}-${Math.floor(rng() * 1e5)}`,
      supplier: t.names[Math.floor(rng() * t.names.length)],
      source: kind,
      mw: baseMW,
      priceUSDPerMWh: Math.round(pick2(t.priceMWh)),
      termMonths: Math.round(pick2(t.term)),
      overdrawPct: r2(pick2(t.overdraw)),
      overageMult: t.overage,
      firmness: r2(pick2(t.firmness)),
      offerUntil: s2.month + 4
    });
  }
  return out;
}
function settlePower(s2, drawMW, rng, log) {
  const spotMWh = s2.utilityUSDPerKWh * 1e3;
  const cs = s2.powerContracts ?? [];
  const live = cs.filter((c) => s2.month >= c.startMonth && s2.month <= c.endMonth);
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
function powerMarketTick(s2, rng, log) {
  s2.powerOffers = (s2.powerOffers ?? []).filter((o2) => o2.offerUntil >= s2.month);
  const ended = (s2.powerContracts ?? []).filter((c) => s2.month > c.endMonth);
  for (const c of ended) log("info", `Power contract with ${c.supplier} (${c.mw} MW) has ended. Renegotiate on the Energy screen or you are back on the spot utility rate.`);
  s2.powerContracts = (s2.powerContracts ?? []).filter((c) => s2.month <= c.endMonth);
  if (rng() < 0.45) s2.powerOffers = [...s2.powerOffers, ...generatePowerOffers(s2, rng, 1)].slice(-6);
}
const spotAnchor = (month) => gpuHourAnchor(2020 + month / 12) * 0.85;
function spotUtilization(price, month) {
  return clamp$5(1.45 - 1 * (price / gpuHourAnchor(2020 + month / 12)), 0.15, 0.95);
}
function stepSpotPrice(s2, rng) {
  const anchor = spotAnchor(s2.month);
  const cur = s2.spotPrice ?? anchor;
  const shock = (rng() - 0.5) * 0.22 + (rng() < 0.06 ? rng() < 0.5 ? 0.35 : -0.3 : 0);
  const next = clamp$5(cur + (anchor - cur) * 0.2 + cur * shock, anchor * 0.4, anchor * 2.2);
  s2.spotPrice = r2(next);
  s2.spotHistory = [...s2.spotHistory ?? [], s2.spotPrice].slice(-24);
}
function spotRevenue(s2, servedClusterIds, accelsOfDesign = () => 0) {
  const price = s2.spotPrice ?? spotAnchor(s2.month);
  if (price < (s2.spotReserve ?? 0)) return { revenue: 0, accels: 0, util: 0 };
  const util = spotUtilization(price, s2.month);
  let accels = 0;
  for (const id of s2.spotClusters ?? []) {
    if (servedClusterIds.has(id)) continue;
    accels += s2.clusters.find((c) => c.id === id)?.stats?.accelerators ?? 0;
  }
  const inClusterSpot = new Set(s2.spotClusters ?? []);
  for (const id of s2.spotRacks ?? []) {
    const pr = s2.halls.flatMap((h) => h.racks).find((r) => r.id === id);
    if (!pr || pr.status !== "online") continue;
    if (pr.clusterId && (servedClusterIds.has(pr.clusterId) || inClusterSpot.has(pr.clusterId))) continue;
    accels += accelsOfDesign(pr.designId);
  }
  return { revenue: accels * util * price * HOURS_PER_MONTH, accels, util };
}
const POWER_LESSON = Object.fromEntries(Object.entries(POWER_SOURCES).map(([k2, v2]) => [k2, v2.lesson]));
const SAVE_KEY = "gigawatt-save-v1";
const ok = (message = "", issues) => ({ ok: true, message, issues });
const fail = (message, issues) => ({ ok: false, message, issues });
const usd = (n) => Math.round(n).toLocaleString("en-US");
const COOL_LEVEL$2 = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };
const POWER_FEED_TYPES = [
  "transformer",
  "ups",
  "busway",
  "power-shelf",
  "solar-ppa",
  "gas-turbine"
];
const SAVE_VERSION = 2;
const DEFAULT_SLOT = "main";
const INDEX_KEY = "gigawatt-saves";
const slotKey = (slot) => slot === DEFAULT_SLOT ? SAVE_KEY : `gigawatt-save-${slot}`;
const MIGRATIONS = {
  // v1 -> v2: rack install dates + serials, lifetime stats, game status; PDUs wrongly installed into halls go back to the warehouse.
  1: (g) => {
    for (const h of g.halls) {
      for (const [id, n] of Object.entries(h.powerEquip ?? {})) {
        const it2 = getItem(id);
        if (it2?.kind === "power" && (it2.powerType === "pdu" || it2.powerType === "power-shelf")) {
          g.inventory[id] = (g.inventory[id] ?? 0) + n;
          delete h.powerEquip[id];
          if (POWER_FEED_TYPES.includes(it2.powerType)) h.itPowerKW = Math.max(0, h.itPowerKW - n * it2.capacityKW);
        }
      }
      for (const r of h.racks) {
        r.installedMonth ??= r.readyMonth - 2;
        if (r.serial == null) r.serial = g.rackSeq = (g.rackSeq ?? 0) + 1;
      }
    }
    g.stats ??= { contractsCompleted: 0, peakAccels: 0, slaMisses: 0, revenueTotal: 0, decommissioned: 0 };
    g.status ??= "playing";
  }
};
function migrate(g) {
  if (typeof g?.month !== "number" || typeof g.cash !== "number" || !Array.isArray(g.halls) || !Array.isArray(g.clusters)) return "Save file corrupted.";
  let v2 = g.saveVersion ?? 1;
  if (v2 > SAVE_VERSION) return `Save is from a newer version (v${v2}); update the game.`;
  for (; v2 < SAVE_VERSION; v2++) MIGRATIONS[v2]?.(g);
  g.saveVersion = SAVE_VERSION;
  return null;
}
const readIndex = () => {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? "{}");
  } catch {
    return {};
  }
};
function writeSlot(slot, g) {
  try {
    localStorage.setItem(slotKey(slot), JSON.stringify({ ...g, saveVersion: SAVE_VERSION }));
    const idx = readIndex();
    idx[slot] = { slot, month: g.month, cash: g.cash, debt: g.debt, racks: g.halls.reduce((n, h) => n + h.racks.length, 0), mode: g.mode ?? "operator", status: g.status ?? "playing" };
    localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
    return true;
  } catch {
    return false;
  }
}
function readSlot(slot) {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return { error: "No save found." };
    const g = JSON.parse(raw);
    const err2 = migrate(g);
    return err2 ? { error: err2 } : { game: g };
  } catch {
    return { error: "Save file unreadable." };
  }
}
const listSaves = () => Object.values(readIndex()).sort((a, b) => (a.slot === "auto" ? 1 : 0) - (b.slot === "auto" ? 1 : 0) || b.month - a.month);
const round2$1 = (x) => Math.round(x * 100) / 100;
const clusterContextOf = (state2) => ({
  getRack: (id) => {
    const pid = state2.halls.flatMap((h) => h.racks).find((p) => p.id === id)?.designId ?? id;
    return state2.racks.find((r) => r.id === pid);
  },
  getTray: (id) => state2.trays.find((t) => t.id === id),
  getItem
});
const rackAccels = (state2, designId) => {
  const design = state2.racks.find((r) => r.id === designId);
  if (!design) return 0;
  let n = 0;
  for (const item of design.items) {
    if (item.type !== "tray") continue;
    const tray = state2.trays.find((t) => t.id === item.trayId);
    if (!tray) continue;
    for (const p of tray.parts) if (getItem(p.itemId)?.kind === "accelerator") n += p.count * item.count;
  }
  return n;
};
const clamp$4 = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const RIVAL_ARCHETYPES = [
  { id: "hyperion", name: "Hyperion Cloud", style: "hyperscaler", accels: 4e3, priceMult: 1, aggression: 0.5 },
  { id: "nimbus", name: "Nimbus Compute", style: "neocloud", accels: 800, priceMult: 0.85, aggression: 0.8 },
  { id: "atlas", name: "Atlas Sovereign AI", style: "sovereign", accels: 300, priceMult: 1.05, aggression: 0.3 }
];
function initialRivals(seed) {
  const rng = mulberry32((seed ^ 5315091) >>> 0);
  return RIVAL_ARCHETYPES.map((a) => ({ ...a, accels: Math.round(a.accels * randRange(rng, 0.9, 1.1)), cash: 0 }));
}
function onlineAccels(s2) {
  let n = 0;
  for (const h of s2.halls) for (const r of h.racks) if (r.status === "online") n += rackAccels(s2, r.designId);
  return n;
}
function stepRivals(s2, rng) {
  const rivals = s2.rivals ?? (s2.rivals = initialRivals(s2.seed));
  const mine = onlineAccels(s2);
  const rivalTotal = rivals.reduce((n, r) => n + r.accels, 0);
  const supplyShare = mine / Math.max(1, mine + rivalTotal);
  const demandFactor = clamp$4(gpuHourAnchor(monthToYear(s2.month)) / 2.5, 0.5, 1.5);
  for (const r of rivals) {
    const growth = r.aggression * randRange(rng, 5e-3, 0.015) * demandFactor;
    r.accels = Math.round(r.accels * (1 + growth));
    r.cash += r.accels * 0.3;
    const target = 0.7 + (1 - supplyShare) * 0.4;
    r.priceMult += (target - r.priceMult) * 0.1;
  }
}
function priceIndexOf(s2, playerAccels = onlineAccels(s2)) {
  const rivals = s2.rivals ?? [];
  const rivalAccels = rivals.reduce((n, r) => n + r.accels, 0);
  if (rivalAccels <= 0) return 1;
  const rivalMean = rivals.reduce((n, r) => n + r.accels * r.priceMult, 0) / rivalAccels;
  const playerShare = playerAccels / (playerAccels + rivalAccels);
  return clamp$4(0.5 + 0.42 * rivalMean + 0.28 * playerShare, 0.7, 1.15);
}
const NVME_LANES_PER_DRIVE = 4;
const GPUS_PER_SPINE_TRAY = 8;
const COOL_LEVEL$1 = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };
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
  const slotByKind = new Map(chassis.slots.map((s2) => [s2.kind, s2]));
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
        if (COOL_LEVEL$1[chassis.cooling] > COOL_LEVEL$1[design.coolingInterface]) {
          issues.push(err(
            "RACK_TRAY_COOLING",
            `${chassis.name} trays need ${chassis.cooling.toUpperCase()} cooling but this rack's interface is '${design.coolingInterface}' — liquid-cooled trays have cold plates plumbed to rack manifolds; without them the tray cooks.`,
            chassis.id
          ));
        }
        if (!rack.hasBusbar && !chassis.slots.some((s2) => s2.kind === "psu")) {
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
  const maxKW = rack.maxKW + (design.coolingInterface === "rdhx" && rack.cooling.includes("rdhx") ? 20 : 0);
  if (stats.kW > maxKW) {
    issues.push(err(
      "RACK_POWER",
      `Rack draws ~${stats.kW.toFixed(1)} kW but the ${rack.name} is rated ${maxKW} kW${maxKW > rack.maxKW ? " with a rear-door heat exchanger" : ""}. Rack power is limited by feed/breakers and how much heat its cooling path removes — either thin the rack or move to a higher-density rack.`,
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
    if (COOL_LEVEL$1[ctx.design.coolingInterface] > COOL_LEVEL$1[hall.coolingClass]) {
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
  const isPlant = (c) => ["chiller", "dry-cooler", "cooling-tower"].includes(c.coolingType) || c.coolingType === "crah" && c.wattsPerKW >= 120;
  const stage = (plant2) => {
    let capT = 0, w = 0;
    for (const [id, count] of Object.entries(hall.coolingEquip)) {
      const c = get(id);
      if (!c || c.kind !== "cooling" || isPlant(c) !== plant2) continue;
      capT += count * c.capacityKW;
      w += count * c.capacityKW * c.wattsPerKW;
    }
    return { capT, avg: capT > 0 ? w / capT : 0 };
  };
  const term = stage(false), plant = stage(true);
  const liquid = hall.coolingClass === "dlc" || hall.coolingClass === "immersion";
  const plantAvg = plant.capT > 0 ? plant.avg : term.capT > 0 ? liquid ? 60 : 250 : 0;
  const termAvg = term.capT > 0 ? term.avg : plant.capT > 0 && plant.avg < 120 ? liquid ? 15 : 40 : 0;
  const coolingElecKW = itKW * ((termAvg + plantAvg) / 1e3);
  const overheadKW = term.capT + plant.capT > 0 ? itKW * 0.02 : 0;
  let cap = 0, effSum = 0;
  for (const [id, count] of Object.entries(hall.powerEquip)) {
    const p = get(id);
    if (!p || p.kind !== "power" || p.efficiency >= 1 || !["transformer", "ups", "busway", "pdu", "power-shelf", "switchgear"].includes(p.powerType)) continue;
    cap += count * p.capacityKW;
    effSum += count * p.capacityKW * p.efficiency;
  }
  const lossKW = cap > 0 ? itKW * (1 - effSum / cap) : 0;
  return 1 + (coolingElecKW + lossKW + overheadKW) / itKW;
}
const REL_MAX = 100;
const FRAMEWORK_MIN_COMMIT_USD = 2e6;
const FRAMEWORK_MIN_MONTHS = 6;
const FRAMEWORK_MAX_MONTHS = 36;
const FRAMEWORK_DEPOSIT_PCT = 0.05;
const FRAMEWORK_CANCEL_PENALTY_PCT = 0.2;
const FRAMEWORK_CANCEL_REL_HIT = -15;
const FRAMEWORK_EXPIRY_PENALTY_PCT = 0.15;
const FRAMEWORK_EXPIRY_REL_HIT = -10;
const FRAMEWORK_EXPIRY_REL_BONUS = 5;
const REL_DECAY_PER_MONTH = 0.5;
const REL_GAIN_PER_ORDER_MAX = 8;
const REL_GAIN_PER_USD = 1 / 1e6;
const clamp$3 = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const logT = (x, lo, hi) => clamp$3((Math.log(x) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)), 0, 1);
const relBonus = (rel) => clamp$3(rel, 0, REL_MAX) / REL_MAX;
const capMultiplier = (g, vendorId) => Math.min(2, 1 + 0.5 * relBonus(g.vendorRel?.[vendorId] ?? 0) + 3e-3 * clamp$3(g.reputation, 0, 100));
const relDiscount = (g, vendorId) => 0.06 * relBonus(g.vendorRel?.[vendorId] ?? 0);
const frameworkFor = (g, vendorId) => (g.frameworks ?? []).find((f) => f.vendorId === vendorId && f.startMonth <= g.month && g.month <= f.endMonth && f.spentUSD < f.commitUSD);
const frameworkDiscount = (fw) => fw.discountPct / 100;
const discountPctFor = (commitUSD, months) => Math.round((3 + 9 * ((logT(Math.max(1, commitUSD), 2e6, 5e7) + logT(Math.max(1, months), 12, 36)) / 2)) * 10) / 10;
const adjustRel = (g, vendorId, delta) => {
  g.vendorRel = { ...g.vendorRel ?? {}, [vendorId]: clamp$3((g.vendorRel?.[vendorId] ?? 0) + delta, 0, REL_MAX) };
};
function recordSpend(g, vendorId, usd2) {
  const fw = frameworkFor(g, vendorId);
  if (fw) fw.spentUSD += usd2;
  adjustRel(g, vendorId, Math.min(REL_GAIN_PER_ORDER_MAX, usd2 * REL_GAIN_PER_USD));
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
const offerFor = (g, item) => {
  const o2 = offerAt(item, g.month);
  if (!o2.available) return o2;
  const fw = frameworkFor(g, item.vendor);
  const disc = relDiscount(g, item.vendor) + (fw ? frameworkDiscount(fw) : 0);
  return {
    ...o2,
    unitPrice: Math.max(0, Math.round(o2.unitPrice * (1 - disc))),
    qtyCap: o2.qtyCap !== void 0 ? Math.floor(o2.qtyCap * capMultiplier(g, item.vendor)) : void 0
  };
};
const volumeDiscount = (item, qty, unitPrice) => {
  const vendor = VENDORS.find((v2) => v2.id === item.vendor);
  if (!vendor || qty <= 0) return 0;
  const doublings = Math.floor(Math.log2(Math.max(1, unitPrice * qty) / 1e6));
  if (doublings <= 0) return 0;
  return Math.min(0.25, doublings * (vendor.volumeDiscountPerDoublingPct / 100));
};
const rackBom = (state2, designId) => {
  const design = state2.racks.find((r) => r.id === designId);
  if (!design) return void 0;
  const need = { [design.rackId]: 1 };
  for (const item of design.items) {
    if (item.type === "tray") {
      const tray = state2.trays.find((t) => t.id === item.trayId);
      if (!tray) return void 0;
      for (const p of tray.parts) need[p.itemId] = (need[p.itemId] ?? 0) + p.count * item.count;
    } else {
      const id = item.type === "switch" ? item.switchId : item.type === "storage" ? item.storageId : item.powerId;
      need[id] = (need[id] ?? 0) + item.count;
    }
  }
  return need;
};
const availableFor = (g, designId) => {
  const bom = rackBom(g, designId) ?? {};
  const held = {};
  for (const [did, n] of Object.entries(g.rackReserve ?? {})) {
    if (did === designId || !(n > 0)) continue;
    for (const [p, per] of Object.entries(rackBom(g, did) ?? {})) held[p] = (held[p] ?? 0) + per * n;
  }
  const out = {};
  for (const p of Object.keys(bom)) out[p] = Math.max(0, (g.inventory[p] ?? 0) - (held[p] ?? 0));
  return out;
};
const reserve = (g, designId, n) => {
  g.rackReserve = { ...g.rackReserve ?? {}, [designId]: Math.max(0, (g.rackReserve?.[designId] ?? 0) + n) };
  if (!g.rackReserve[designId]) delete g.rackReserve[designId];
};
const FLOOR_UNIT_SLOTS = 10;
const FLOOR_UNIT_COST = 25e4 * FLOOR_UNIT_SLOTS;
const floorCommissionMonths = (units) => 2 + Math.ceil(units / 5);
const creditLimit = (state2) => 5e6 + estimateCapexBasis(state2) * 0.6;
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
    spotReserve: 0,
    status: "playing",
    negCashMonths: 0,
    saveVersion: SAVE_VERSION,
    stats: { contractsCompleted: 0, peakAccels: 0, slaMisses: 0, revenueTotal: 0, decommissioned: 0 },
    rivals: initialRivals(seed),
    marketPriceIndex: 1
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
function makeCtx(get, set) {
  return {
    get,
    set,
    commit: (mutate) => {
      const g = JSON.parse(JSON.stringify(get().game));
      const res = mutate(g) ?? ok();
      if (res.ok) set({ game: g });
      return res;
    },
    logln: (g, level, text) => {
      g.log.push({ month: g.month, level, text });
      if (g.log.length > 400) g.log.splice(0, g.log.length - 400);
    }
  };
}
const NAMES = { hpe: "HPE", asus: "ASUS", quanta: "Quanta (QCT)", wiwynn: "Wiwynn", cisco: "Cisco UCS", inspur: "Inspur", lenovo: "Lenovo", supermicro: "Supermicro", gigabyte: "Gigabyte", foxconn: "Foxconn", dell: "Dell", nvidia: "NVIDIA" };
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
  label: `${NAMES[by] ?? by[0].toUpperCase() + by.slice(1)} integrated rack`,
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
const sw = (switchId, count = 1) => ({ type: "switch", switchId, count });
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
    extras: [sw("nv-qm8700")],
    story: "The Ampere generation: 8 A100s in one NVLink3 box, scaled out over 200G InfiniBand. DGX A100 is NVIDIA's own build of this.",
    variants: [DIY(), OEM("supermicro"), OEM("dell", 0.08), TURNKEY("nvidia", "NVIDIA DGX A100 (rack)"), OEM("lenovo", 0.09), OEM("inspur", 0.05), OEM("quanta", 0.04)]
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
    extras: [sw("nv-qm9700")],
    story: "Hopper: FP8 Transformer Engine and NVLink4. 10 kW per server is the edge of air cooling, so only two fit per air rack.",
    variants: [DIY(), OEM("supermicro"), OEM("hpe", 0.09), TURNKEY("nvidia", "NVIDIA DGX H100 (rack)"), OEM("lenovo", 0.09), OEM("quanta", 0.04), OEM("asus", 0.06), OEM("cisco", 0.12), OEM("dell", 0.08)]
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
    extras: [sw("nv-qm9700")],
    story: "Same Hopper compute, 141 GB of faster HBM3e: a drop-in for inference, where memory bandwidth and capacity set tokens/s.",
    variants: [DIY(), OEM("supermicro"), TURNKEY("nvidia", "NVIDIA DGX H200 (rack)"), OEM("lenovo", 0.09), OEM("quanta", 0.04), OEM("asus", 0.06), OEM("cisco", 0.12), OEM("dell", 0.08), OEM("hpe", 0.09)]
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
    extras: [sw("nv-qmx8000")],
    story: "Blackwell in the HGX form factor: 15 kW per server needs direct liquid cooling, so you need a CDU and liquid-ready racks.",
    variants: [DIY(), OEM("supermicro"), OEM("dell", 0.09), TURNKEY("nvidia", "NVIDIA DGX B200 (rack)"), OEM("lenovo", 0.09), OEM("quanta", 0.04), OEM("asus", 0.06), OEM("hpe", 0.09)]
  },
  {
    key: "hgx-h200-rdhx",
    label: "HGX H200 8-GPU (rear-door cooled)",
    from: 2024.5,
    eol: 2026,
    chassisId: "nv-hgx-h100-8gy",
    rackId: "gen-rack-19-48u-hd",
    trays: 4,
    cooling: "rdhx",
    parts: hdr("nv-h200-sxm", "amd-epyc-genoa", "sam-ddr5-5600-64", 16, "nv-connectx7", 4, "sam-pm9a3-3t84", 4),
    extras: [sw("nv-qm9700")],
    story: "The same air-cooled Hopper servers, but a chilled-water rear-door heat exchanger on the rack lets you double the density to four servers (~40 kW) without touching the servers.",
    variants: [OEM("supermicro"), OEM("dell", 0.08), OEM("lenovo", 0.09), OEM("hpe", 0.09)]
  },
  {
    key: "mi300x-rdhx",
    label: "AMD Instinct MI300X 8-GPU (rear-door cooled)",
    from: 2023.9,
    eol: 2026,
    chassisId: "sm-ubb-oam8-mi300x",
    rackId: "gen-rack-19-48u-hd",
    trays: 4,
    cooling: "rdhx",
    parts: hdr("amd-mi300x", "amd-epyc-genoa", "sam-ddr5-5600-64", 12, "nv-connectx7", 4, "sam-pm9a3-3t84", 4),
    extras: [sw("cs-n9364e")],
    story: "MI300X servers in rear-door-cooled racks: a pragmatic retrofit path for existing air halls that need more kW per rack.",
    variants: [OEM("supermicro"), DIY("gigabyte")]
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
    extras: [sw("nv-nvlink-switch-tray5", 9)],
    story: "72 Blackwell GPUs in ONE NVLink domain: one 120+ kW liquid-cooled rack acts as a single giant GPU. You cannot DIY this; it ships integrated.",
    variants: [OEM("foxconn", 0.06), OEM("dell", 0.09), TURNKEY("nvidia", "NVIDIA GB200 NVL72 reference rack", 0.14), OEM("quanta", 0.05), OEM("wiwynn", 0.05), OEM("supermicro", 0.07), OEM("hpe", 0.1)]
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
    extras: [sw("nv-nvlink-switch-tray5", 9)],
    story: "Blackwell Ultra NVL72: 288 GB HBM3e per GPU for long-context reasoning inference at rack scale.",
    variants: [OEM("foxconn", 0.06), TURNKEY("nvidia", "NVIDIA GB300 NVL72 reference rack", 0.14), OEM("quanta", 0.05), OEM("wiwynn", 0.05), OEM("dell", 0.09), OEM("supermicro", 0.07), OEM("hpe", 0.1)]
  },
  {
    key: "vr200",
    label: "Vera Rubin NVL144 rack-scale",
    from: 2026.75,
    chassisId: "nv-gb200-nvl72-ct",
    rackId: "fox-nvl72-mgx",
    trays: 18,
    cooling: "dlc",
    parts: [{ slot: "accelerator", itemId: "nv-rubin-vr200", count: 2 }, { slot: "nic", itemId: "nv-connectx9", count: 4 }, { slot: "nvme", itemId: "sam-pm1743-15t36", count: 2 }],
    extras: [sw("nv-nvlink-switch-tray5", 9)],
    story: "Rubin: HBM4 and NVLink6 in one liquid-cooled rack-scale domain, with 1.6T ConnectX-9 NICs for scale-out. The 2027 frontier-training workhorse.",
    variants: [OEM("foxconn", 0.06), TURNKEY("nvidia", "NVIDIA Vera Rubin NVL144 reference rack", 0.14), OEM("quanta", 0.05), OEM("wiwynn", 0.05), OEM("dell", 0.09), OEM("supermicro", 0.07), OEM("hpe", 0.1)]
  },
  {
    key: "mi400x",
    label: "AMD Instinct MI400X 8-GPU (liquid)",
    from: 2026.75,
    chassisId: "gig-ubb-oam8-lq",
    rackId: "gen-rack-19-48u-dlc",
    trays: 4,
    cooling: "dlc",
    parts: [...hdr("amd-mi400x", "amd-epyc-turin", "skh-ddr5-6400-96", 12, "nv-connectx8", 4, "mic-9550-15t36", 4), { slot: "coldplate", itemId: "ct-coldplate-80", count: 8 }],
    extras: [sw("nv-sn5600")],
    story: "CDNA5-era MI400X with HBM4, UALink/UEC scale-out, liquid cooled — AMD's answer to Rubin for operators who want a second source.",
    variants: [DIY("gigabyte"), OEM("supermicro", 0.08), OEM("dell", 0.09), OEM("hpe", 0.09), OEM("asus", 0.06), OEM("lenovo", 0.09)]
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
    extras: [sw("cs-n9364e")],
    story: "AMD's answer to H100: 192 GB HBM3 per GPU (more than H100/H200) on an 8-GPU OAM board. Ethernet-first scale-out and the ROCm software stack.",
    variants: [DIY("gigabyte"), OEM("supermicro"), OEM("dell", 0.08), OEM("lenovo", 0.09), OEM("asus", 0.06), OEM("hpe", 0.09)]
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
    extras: [sw("nv-sn5600")],
    story: "CDNA4 with 288 GB HBM3E and FP4/FP6 support, liquid cooled at 1.4 kW per GPU.",
    variants: [DIY("gigabyte"), OEM("supermicro", 0.08), OEM("dell", 0.09), OEM("hpe", 0.09), OEM("asus", 0.06), OEM("lenovo", 0.09)]
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
    extras: [sw("cs-n9364e")],
    story: "Ethernet-native: each Gaudi 3 has 24x200G RoCE ports on the chip itself, so no separate NICs are needed.",
    variants: [OEM("supermicro", 0.06), DIY(), OEM("dell", 0.08), OEM("hpe", 0.09)]
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
    extras: [sw("cs-n9364e")],
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
const nameOf = (v2) => NAMES[v2] ?? v2[0].toUpperCase() + v2.slice(1);
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
function rackParts(state2, designId) {
  const out = {};
  const d = state2.racks.find((r) => r.id === designId);
  const add = (id, n) => {
    out[id] = (out[id] ?? 0) + n;
  };
  for (const it2 of d?.items ?? []) {
    if (it2.type === "tray") {
      const t = state2.trays.find((x) => x.id === it2.trayId);
      for (const p of t?.parts ?? []) add(p.itemId, p.count * it2.count);
    } else if (it2.type === "switch") add(it2.switchId, it2.count);
  }
  return out;
}
const partClass = (id) => {
  const k2 = getItem(id)?.kind;
  return k2 && PART_RATE[k2] !== void 0 ? k2 : void 0;
};
function rackRates(state2, designId) {
  return Object.entries(rackParts(state2, designId)).flatMap(([id, n]) => {
    const c = partClass(id);
    return c ? [{ id, rate: n * PART_RATE[c] }] : [];
  });
}
function recommendedSpares(state2, id) {
  let total = 0;
  for (const h of state2.halls) for (const p of h.racks) total += rackParts(state2, p.designId)[id] ?? 0;
  const c = partClass(id);
  if (!c || total === 0) return 0;
  return Math.max(1, Math.ceil(total * PART_RATE[c] * 3));
}
function spareQty(id, qty) {
  const c = partClass(id);
  return c ? Math.max(1, Math.ceil(qty * PART_RATE[c] * 6)) : 0;
}
const procureActions = (c) => {
  const { get, commit, logln } = c;
  return {
    buy: (itemId, qty, spare = false) => commit((g) => {
      const item = getItem(itemId);
      if (!item) return fail(`Unknown item '${itemId}'.`);
      if (item.kind === "uplink") return fail("Internet circuits are added on Build → Internet.");
      if (!Number.isFinite(qty) || qty <= 0) return fail("Order quantity must be positive.");
      const offer = offerFor(g, item);
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
      const fw = frameworkFor(g, item.vendor);
      const rel = relDiscount(g, item.vendor);
      const vendorNote = `${fw ? ` (framework -${Math.round(fw.discountPct)}%)` : ""}${rel > 0 ? ` (relationship -${Math.round(rel * 100)}%)` : ""}`;
      g.cash -= cost;
      g.orders.push({
        id: `ord-${g.month}-${g.orders.length + 1}-${itemId}`,
        itemId,
        qty: n,
        unitPrice: Math.round(offer.unitPrice * (1 - discount)),
        arriveMonth: g.month + offer.leadMonths,
        placedMonth: g.month,
        ...spare ? { spare: true } : {}
      });
      recordSpend(g, item.vendor, cost);
      logln(
        g,
        "info",
        `Ordered ${n} ${spare ? "spare " : ""}× ${item.name} for $${usd(cost)}${discount > 0 ? ` (${(discount * 100).toFixed(0)}% volume discount)` : ""}${vendorNote}; arriving month ${g.month + offer.leadMonths}.${note}`
      );
      return ok(`Ordered ${n} × ${item.name}; arrives month ${g.month + offer.leadMonths}.${vendorNote}${note}`);
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
        const vendorSpend = /* @__PURE__ */ new Map();
        let relNote = "", fwNote = "";
        for (const [itemId, n, isSpare] of wanted) {
          const item = getItem(itemId);
          const offer = offerFor(g, item);
          if (!offer.available) return fail(`${item.name} is not purchasable yet: ${offer.reason}`);
          if (offer.qtyCap && n > offer.qtyCap) return fail(`Allocation: the vendor will only sell ${offer.qtyCap} × ${item.name} per quarter and you asked for ${n}. Order fewer racks or split across quarters.`);
          const unit = Math.round(offer.unitPrice * (1 - volumeDiscount(item, n, offer.unitPrice)) * (1 + t.premium));
          cost += unit * n;
          vendorSpend.set(item.vendor, (vendorSpend.get(item.vendor) ?? 0) + unit * n);
          const fw = frameworkFor(g, item.vendor);
          if (fw) fwNote = ` (framework -${Math.round(fw.discountPct)}%)`;
          const rel = relDiscount(g, item.vendor);
          if (rel > 0) relNote = ` (relationship -${Math.round(rel * 100)}%)`;
          const l = Math.max(1, Math.round(offer.leadMonths * t.leadFactor));
          lead = Math.max(lead, l);
          lines.push({ itemId, n, unit, lead: l, spare: isSpare });
        }
        if (cost > g.cash) return fail(`Insufficient funds: this order costs $${usd(cost)} but you have $${usd(g.cash)}. Try fewer racks, or take a loan on the Dashboard.`);
        g.cash -= cost;
        reserve(g, rackIdOf(t), nRacks);
        const batch = `bt-${g.month}-${g.orders.length + 1}-${t.id}`;
        for (const l of lines) g.orders.push({ id: `ord-${g.month}-${g.orders.length + 1}-${l.itemId}`, batch, templateId: t.id, racks: nRacks, placedMonth: g.month, itemId: l.itemId, qty: l.n, unitPrice: l.unit, arriveMonth: g.month + l.lead, ...l.spare ? { spare: true } : {} });
        for (const [vendorId, usdSpent] of vendorSpend) recordSpend(g, vendorId, usdSpent);
        const vendorNote = `${fwNote}${relNote}`;
        logln(g, "info", `Ordered ${nRacks} × ${t.name} for $${usd(cost)} (${t.tier}, ${Math.round(t.premium * 100)}% integration premium)${vendorNote}. Full bill of materials arrives by month ${g.month + lead}.`);
        return ok(`Ordered ${nRacks} racks: $${usd(cost)}, everything arrives by month ${g.month + lead}.${vendorNote}`);
      });
    },
    cancelOrder: (orderId) => commit((g) => {
      const o2 = g.orders.find((x) => x.id === orderId);
      if (!o2) return fail("That order has already arrived or does not exist.");
      const lines = o2.batch ? g.orders.filter((x) => x.batch === o2.batch) : [o2];
      const refund = Math.round(lines.reduce((n, x) => n + x.qty * x.unitPrice, 0) * REFUND);
      g.cash += refund;
      g.orders = g.orders.filter((x) => !lines.includes(x));
      let what = `${o2.qty} × ${getItem(o2.itemId)?.name ?? o2.itemId}`;
      if (o2.batch && o2.templateId) {
        const t = getTemplate(o2.templateId);
        if (t) {
          reserve(g, rackIdOf(t), -(o2.racks ?? 0));
          what = `${o2.racks} × ${t.name}`;
        }
        failProjects(g, o2.templateId, `order cancelled in month ${g.month}`);
      }
      logln(g, "info", `Cancelled ${what}; refunded $${usd(refund)} (${Math.round((1 - REFUND) * 100)}% restocking fee).`);
      return ok(`Cancelled ${what}. Refunded $${usd(refund)}.`);
    }),
    reduceOrder: (orderId, qty) => {
      const o2 = get().game.orders.find((x) => x.id === orderId);
      if (!o2) return { ok: false, message: "That order has already arrived or does not exist." };
      const n = Math.floor(qty);
      if (!(n >= 0)) return { ok: false, message: "Quantity must be zero or more." };
      if (n === 0) return get().cancelOrder(orderId);
      return commit((g) => {
        const cur = g.orders.find((x) => x.id === orderId);
        if (!cur.batch || !cur.templateId) {
          if (n >= cur.qty) return fail(`Orders can only be reduced (currently ${cur.qty}).`);
          const refund2 = Math.round((cur.qty - n) * cur.unitPrice * REFUND);
          g.cash += refund2;
          cur.qty = n;
          logln(g, "info", `Reduced ${getItem(cur.itemId)?.name ?? cur.itemId} order to ${n}; refunded $${usd(refund2)}.`);
          return ok(`Reduced to ${n}. Refunded $${usd(refund2)}.`);
        }
        const t = getTemplate(cur.templateId);
        const old = cur.racks ?? 0;
        if (!t) return fail("Unknown template.");
        if (n >= old) return fail(`A rack order can only be reduced (currently ${old} racks).`);
        const bom = templateBom(t, n);
        let refund = 0;
        for (const l of g.orders.filter((x) => x.batch === cur.batch)) {
          const want = l.spare ? spareQty(l.itemId, bom[l.itemId] ?? 0) : bom[l.itemId] ?? 0;
          if (want < l.qty) {
            refund += (l.qty - want) * l.unitPrice * REFUND;
            l.qty = want;
          }
          l.racks = n;
        }
        g.orders = g.orders.filter((x) => x.qty > 0);
        refund = Math.round(refund);
        g.cash += refund;
        reserve(g, rackIdOf(t), n - old);
        for (const p of g.projects ?? []) if (p.templateId === t.id && p.stage === "building" && p.racks === old) {
          p.racks = n;
          p.notes.push(`order reduced to ${n} racks`);
        }
        logln(g, "info", `Reduced ${t.name} order from ${old} to ${n} racks; refunded $${usd(refund)}.`);
        return ok(`Reduced to ${n} racks. Refunded $${usd(refund)}.`);
      });
    }
  };
};
const REFUND = 0.9;
function failProjects(g, templateId, why) {
  for (const p of g.projects ?? []) if (p.templateId === templateId && p.stage === "building") {
    p.stage = "failed";
    p.notes.push(`stopped: ${why}`);
  }
}
const designActions = (c) => {
  const { commit, logln } = c;
  return {
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
    })
  };
};
const facilityActions = (c) => {
  const { commit, logln } = c;
  return {
    buildHall: (name, coolingClass, rackSlots) => commit((g) => {
      const slots = Math.floor(rackSlots);
      if (slots < 4 || slots > 200) return fail("A new hall starts with 4–200 rack slots; buy more floor space later in units.");
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
        floorLoadKgPerRack: { air: 1500, rdhx: 1800, dlc: 2400, immersion: 3200 }[coolingClass] ?? 1500
      };
      g.halls.push(hall);
      logln(
        g,
        "good",
        `Built ${hall.name}: ${slots} slots, ${coolingClass.toUpperCase()}-ready shell. Install power and cooling plant before racks come in.`
      );
      return ok(`${hall.name} built. Install power & cooling next.`);
    }),
    expandHall: (hallId, units) => commit((g) => {
      const hall = g.halls.find((h) => h.id === hallId);
      if (!hall) return fail(`Hall '${hallId}' not found.`);
      const n = Math.floor(units);
      if (!(n >= 1)) return fail("Buy at least one floor unit.");
      const cost = n * FLOOR_UNIT_COST;
      if (cost > g.cash) return fail(`${n} floor unit(s) cost $${usd(cost)} — not enough cash.`);
      g.cash -= cost;
      const readyMonth = g.month + floorCommissionMonths(n);
      (hall.expansions ??= []).push({ units: n, readyMonth });
      logln(g, "info", `Ordered ${n * FLOOR_UNIT_SLOTS} more rack positions for ${hall.name} ($${usd(cost)}). Slab, containment and fit-out finish in month ${readyMonth}.`);
      return ok(`${n * FLOOR_UNIT_SLOTS} slots ordered for ${hall.name}; commissioned ${readyMonth - g.month} months from now.`);
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
      const compatible = item.serves === hall.coolingClass || hall.coolingClass === "rdhx" && item.serves === "air" || hall.coolingClass === "immersion" && item.serves === "dlc";
      if (!compatible) {
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
      const c2 = g.uplinks?.[itemId] ?? 0;
      if (c2 <= 0) return fail("You have no such circuit.");
      g.uplinks = { ...g.uplinks, [itemId]: c2 - 1 };
      return ok("Circuit cancelled; billing stops next month.");
    })
  };
};
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
  const o2 = Math.max(1, oversub);
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
  const maxDown = Math.max(1, Math.floor(leaf.portCount * o2 / (1 + o2)));
  const leafCount = Math.max(1, Math.ceil(hostLinks / maxDown));
  const hostLinksPerLeaf = hostLinks / leafCount;
  const uplinkPortsPerLeaf = Math.max(1, Math.ceil(hostLinksPerLeaf * linkGbps / o2 / spineLinkGbps));
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
      effPerNodeGbps: Math.min(nodeUplinkGbps, fabricPerNodeGbps / o2)
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
    effPerNodeGbps: Math.min(nodeUplinkGbps, fabricPerNodeGbps / o2)
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
const deliveries = {
  id: "deliveries",
  run: ({ s: s2, log }) => {
    const arrived = [];
    s2.orders = s2.orders.filter((od) => {
      if (od.arriveMonth <= s2.month) {
        arrived.push(od);
        return false;
      }
      return true;
    });
    for (const od of arrived) {
      if (od.spare) {
        s2.spareStock = s2.spareStock ?? {};
        s2.spareStock[od.itemId] = (s2.spareStock[od.itemId] ?? 0) + od.qty;
      } else s2.inventory[od.itemId] = (s2.inventory[od.itemId] ?? 0) + od.qty;
    }
    if (arrived.length) {
      const units = arrived.reduce((n, od) => n + od.qty, 0);
      log("good", `Delivered ${units} unit(s) from ${arrived.length} order(s) into inventory.`);
    }
  }
};
const floorSpace = {
  id: "floor-space",
  run: ({ s: s2, log }) => {
    for (const hall of s2.halls) {
      if (!hall.expansions?.length) continue;
      const due = hall.expansions.filter((e) => e.readyMonth <= s2.month);
      if (!due.length) continue;
      const slots = due.reduce((n, e) => n + e.units * 10, 0);
      hall.rackSlots += slots;
      hall.expansions = hall.expansions.filter((e) => e.readyMonth > s2.month);
      log("good", `${hall.name}: ${slots} new rack positions commissioned (${hall.rackSlots} total).`);
    }
  }
};
const RECRUIT_COST_USD = 15e3;
const SEVERANCE_USD = 2 * STAFF_COST_PER_MONTH;
function staffNeeded(g) {
  let onlineRacks2 = 0;
  let liquidOnline = false;
  for (const h of g.halls) {
    const on = h.racks.filter((r) => r.status === "online").length;
    onlineRacks2 += on;
    if (on > 0 && (h.coolingClass === "dlc" || h.coolingClass === "immersion")) liquidOnline = true;
  }
  const accels = g.clusters.reduce((n, cl) => n + (cl.stats?.accelerators ?? 0), 0);
  const breakdown = [];
  if (onlineRacks2 > 0) breakdown.push({ label: "ops technicians", n: Math.ceil(onlineRacks2 / 10) });
  if (liquidOnline) breakdown.push({ label: "liquid-cooling specialist", n: 1 });
  if (accels > 0) breakdown.push({ label: "network engineers", n: Math.ceil(accels / 1024) });
  return { needed: Math.max(1, breakdown.reduce((n, b) => n + b.n, 0)), breakdown };
}
function staffEffect(g) {
  const { needed } = staffNeeded(g);
  const shortfall = Math.max(0, needed - g.staff) / needed;
  return { failureMult: 1 + 1.5 * shortfall, repairExtraMonths: shortfall >= 0.34 ? 1 : 0 };
}
const commissioning = {
  id: "commissioning",
  run: (c) => {
    const { s: s2, o: o2, rng, log } = c;
    c.placed = s2.halls.flatMap((h) => h.racks);
    c.placedById = new Map(c.placed.map((r) => [r.id, r]));
    for (const rack of c.placed) {
      if (rack.status === "installing" && s2.month >= rack.readyMonth - 1) {
        rack.status = "commissioning";
      } else if (rack.status === "commissioning" && s2.month >= rack.readyMonth) {
        if (rng() < o2.commissionFailProb * commissionFailMult(s2)) {
          rack.status = "failed";
          rack.readyMonth = s2.month + Math.min(o2.repairMonths, 2);
          log("bad", `Rack ${rack.id} failed burn-in during commissioning (dead on arrival); warranty swap ETA month ${rack.readyMonth}.`);
        } else {
          rack.status = "online";
          log("good", `Rack ${rack.id} commissioned and online.`);
        }
      } else if (rack.status === "failed" && s2.month >= rack.readyMonth) {
        rack.status = "online";
        rack.failedPart = void 0;
        log("good", `Rack ${rack.id} repaired and back online.`);
      }
    }
  }
};
const clusterStats = { id: "cluster-stats", run: (c) => c.refreshStats() };
const failures = {
  id: "failures",
  run: (c) => {
    const { s: s2, o: o2, rng, log } = c;
    const staff = staffEffect(s2);
    const onlineKW = s2.clusters.reduce((n, cl) => n + (cl.stats?.powerKW ?? 0), 0);
    const coolingKW = s2.halls.reduce((n, h) => n + h.coolingKW, 0);
    const stressed = coolingKW < onlineKW;
    let failedNow = 0;
    for (const rack of c.placed) {
      if (rack.status !== "online") continue;
      const rates = rackRates(s2, rack.designId);
      const total = rates.reduce((n, r) => n + r.rate, 0) * (o2.accelFailureProbPerMonth * 8e3);
      const p = Math.min(0.95, (1 - Math.exp(-total * (stressed ? 3 : 1))) * staff.failureMult * maintenanceFailMult(s2));
      if (p > 0 && rng() < p) {
        let pick2 = rng() * rates.reduce((n, r) => n + r.rate, 0);
        const part = (rates.find((r) => (pick2 -= r.rate) <= 0) ?? rates[0]).id;
        const label = PART_LABEL[partClass(part) ?? ""] ?? "part";
        rack.status = "failed";
        rack.failedPart = part;
        if ((s2.spareStock?.[part] ?? 0) > 0) {
          s2.spareStock[part] -= 1;
          rack.readyMonth = s2.month + 1;
          log("info", `${rack.id}: ${label} failed (${getItem(part)?.name}); swapping from your spares — back next month.`);
        } else {
          rack.readyMonth = s2.month + o2.repairMonths + staff.repairExtraMonths;
          log("bad", `${rack.id}: ${label} failed (${getItem(part)?.name}) and you have NO SPARE. Waiting on RMA until month ${rack.readyMonth}. Keep spares in the warehouse.`);
        }
        failedNow++;
      }
    }
    if (failedNow) {
      log("bad", `${failedNow} rack(s) went down${stressed ? " — cooling capacity is below IT load, heat is killing hardware (3x failure rate)" : ""}.`);
      c.refreshStats();
    }
  }
};
const pue = {
  id: "pue",
  run: ({ s: s2 }) => {
    for (const hall of s2.halls) hall.pue = computePUE(hall, getItem);
  }
};
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
const ARCH_BONUS = { startup: 1, lab: 2, enterprise: 3, sovereign: 5 };
const clamp$1 = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round2 = (x) => Math.round(x * 100) / 100;
const round3 = (x) => Math.round(x * 1e3) / 1e3;
function queueRenewal(s2, k2) {
  const renewed = { ...k2 };
  renewed.id = `${k2.id}-r${s2.month}`;
  renewed.deadlineMonth = s2.month + 6;
  renewed.renewalOf = k2.customer;
  if (renewed.kind === "training") {
    renewed.minAccelerators = Math.round(renewed.minAccelerators * 1.5);
    renewed.pricePerAccelHour = round2(renewed.pricePerAccelHour * 1.05);
  } else {
    renewed.tokensPerSec = Math.round(renewed.tokensPerSec * 1.5);
    renewed.pricePerMTok = round3(renewed.pricePerMTok * 1.05);
  }
  s2.availableContracts.push(renewed);
}
const serveContracts = {
  id: "serve-contracts",
  run: (c) => {
    const { s: s2, log } = c;
    const completed = [];
    const defaulted = [];
    const usedFrac = {};
    const needGbps = totalNeedGbps(s2);
    const netFactor = needGbps > 0 ? Math.min(1, uplinkGbps(s2) / needGbps) : 1;
    if (netFactor < 1) log("bad", `Internet uplink is saturated: customers need ~${needGbps.toFixed(1)} Gb/s but you only have ${uplinkGbps(s2).toFixed(0)} Gb/s, so every contract runs at ${(netFactor * 100).toFixed(0)}% availability. Buy transit on Build → Internet.`);
    for (const ac of s2.activeContracts) {
      const k2 = ac.contract;
      if (ac.clusterIds.length === 0) {
        const by = ac.deployBy ?? ac.startMonth + 4;
        if (s2.month > by) defaulted.push(ac);
        else if (s2.month === by) log("bad", `Last month to bring capacity online for ${k2.customer} (${k2.model.name}) — assign a qualifying cluster now or they walk.`);
        continue;
      }
      for (const id of ac.clusterIds) c.served.add(id);
      let availability = 0;
      let accelerators = 0;
      let tokensPerSec = 0;
      if (k2.kind === "training") {
        let total = 0;
        let eff = 0;
        for (const id of ac.clusterIds) {
          const cl = s2.clusters.find((x) => x.id === id);
          if (!cl) continue;
          eff += cl.stats?.accelerators ?? 0;
          total += cl.rackIds.reduce((n, rid) => {
            const pr = c.placedById.get(rid);
            return n + (pr ? rackAccels(s2, pr.designId) : 0);
          }, 0);
        }
        availability = total > 0 ? eff / total : 0;
        accelerators = eff;
      } else {
        let capacity = 0;
        let worstTtftMs = 0;
        const parts = [];
        for (const id of ac.clusterIds) {
          const cl = s2.clusters.find((x) => x.id === id);
          const stats = cl?.stats;
          if (!stats || stats.accelerators <= 0) continue;
          const item = getItem(stats.acceleratorId);
          if (!item || item.kind !== "accelerator") continue;
          const accel = item;
          const cap = inferenceCapacity(stats, accel, k2.model, { contextTokens: k2.contextTokens, tpotMs: k2.tpotMs });
          const remain = Math.max(0, 1 - (usedFrac[id] ?? 0));
          parts.push({ id, capTok: cap.tokensPerSec, remain });
          capacity += cap.tokensPerSec * remain;
          worstTtftMs = Math.max(worstTtftMs, cap.ttftMs);
        }
        const served = Math.min(capacity, k2.tokensPerSec);
        for (const pt of parts) if (capacity > 0 && pt.capTok > 0) usedFrac[pt.id] = (usedFrac[pt.id] ?? 0) + served * (pt.capTok * pt.remain / capacity) / pt.capTok;
        const frac = capacity / Math.max(1, k2.tokensPerSec);
        availability = Math.min(1, frac) * (worstTtftMs <= k2.ttftMs ? 1 : 0.8);
        tokensPerSec = Math.min(capacity, k2.tokensPerSec);
      }
      availability *= netFactor;
      const res = k2.kind === "training" ? contractRevenue(ac, { accelerators, availability }) : contractRevenue(ac, { tokensPerSec, availability });
      c.revenue += res.netUSD;
      if (!res.slaMet) {
        ac.slaMisses += 1;
        if (s2.stats) s2.stats.slaMisses += 1;
        log("bad", `SLA miss for ${k2.customer} (${k2.model.name}): availability ${(availability * 100).toFixed(1)}% vs ${(k2.slaAvailability * 100).toFixed(1)}% required. Penalties applied.`);
      }
      ac.monthsServed += 1;
      if (ac.monthsServed >= k2.durationMonths) completed.push(ac);
    }
    for (const ac of defaulted) {
      s2.reputation = clamp$1(s2.reputation - 8, 0, 100);
      log("bad", `${ac.contract.customer} cancelled: you never brought a qualifying cluster online for ${ac.contract.model.name} in time. Reputation −8.`);
    }
    s2.activeContracts = s2.activeContracts.filter((ac) => {
      if (defaulted.includes(ac)) return false;
      if (!completed.includes(ac)) return true;
      const k2 = ac.contract;
      const clean = ac.slaMisses === 0;
      const sloppy = ac.slaMisses > Math.ceil(k2.durationMonths / 3);
      const gain = 2 + ARCH_BONUS[k2.archetype] + (clean ? 1 : 0) - (sloppy ? 3 : 0);
      s2.reputation = clamp$1(s2.reputation + gain, 0, 100);
      if (s2.stats) s2.stats.contractsCompleted += 1;
      log("good", `${k2.customer} contract complete: ${k2.model.name}, ${k2.durationMonths} mo served, ${ac.slaMisses} SLA miss(es). Reputation ${gain >= 0 ? "+" : ""}${gain}.`);
      if (ac.slaMisses === 0 || ac.slaMisses <= 1 && s2.reputation >= 20) {
        queueRenewal(s2, k2);
        log("good", `${k2.customer} wants to renew — a larger contract is on the board for 6 months.`);
      }
      return false;
    });
  }
};
const contractMarket = {
  id: "contract-market",
  run: ({ s: s2, o: o2, rng, log }) => {
    const isRenewal = (k2) => k2.renewalOf !== void 0;
    const expired = s2.availableContracts.filter((k2) => k2.deadlineMonth < s2.month);
    const alive = s2.availableContracts.filter((k2) => k2.deadlineMonth >= s2.month);
    const renewals = alive.filter(isRenewal);
    const fresh = generateContracts(s2, s2.month, rng);
    const regular = [...alive.filter((k2) => !isRenewal(k2)), ...fresh];
    const room = Math.max(0, o2.maxAvailableContracts - renewals.length);
    s2.availableContracts = [...regular.slice(-room), ...renewals];
    if (expired.length) log("info", `${expired.length} contract offer(s) expired unserved.`);
    if (fresh.length) log("info", `${fresh.length} new contract offer(s) on the market.`);
  }
};
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
  const ups2 = upsKW >= load * 0.9 && (batteryKW > 0 || flywheelKW >= load * 0.9);
  const backup = gensetKW >= load * 1;
  const transfer = transferKW >= load * 0.9;
  const gaps = [];
  if (!ups2) gaps.push(upsKW < load * 0.9 ? "UPS capacity below IT load" : "UPS has no battery string");
  if (!backup) gaps.push(gensetKW <= 0 ? "no generator: outages longer than battery ride-through take you down" : "generator smaller than IT load");
  if (!transfer) gaps.push("no automatic transfer switch (ATS/STS or paralleling gear) to move load to the generator");
  let score = (ups2 ? 0.55 : 0) + (backup ? 0.25 : 0) + (transfer ? 0.12 : 0);
  const n1 = gensetCount >= 2 && gensetKW - gensetKW / gensetCount >= load && (parallel || gensetCount < 2) || upsKW >= load * 1.8;
  if (ups2 && backup && transfer && n1) score = 1;
  else if (ups2 && backup && transfer) score = 0.92;
  if (feedB && score > 0) score = Math.min(1, score + 0.08);
  const tier = score >= 1 ? "N+1" : score >= 0.9 ? "N" : score >= 0.5 ? "basic" : "none";
  return { score, tier, ups: ups2, backup, transfer, upsKW, gensetKW, batteryKW, gensetCount, feedB, gaps };
}
function scriptedEvents(s2, log) {
  if (s2.month === 38) {
    let units = 0;
    for (const o2 of s2.orders) {
      if (getItem(o2.itemId)?.kind === "accelerator" && o2.arriveMonth > s2.month) {
        o2.arriveMonth += 2;
        units += o2.qty;
      }
    }
    log("bad", `📦 Mar 2023 — ChatGPT went viral and every buyer on earth wants GPUs: allocation is slashed and ${units} accelerator(s) already in the pipeline slip 2 months. Lesson: lead times quoted in a soft market are fiction in a hot one — order ahead and hold spares.`);
  } else if (s2.month === 52) {
    log("info", "💧 Apr 2024 — the Blackwell generation makes liquid cooling mainstream: GB200 NVL72 racks (~120 kW) cannot be air-cooled at all. Lesson: plan the DLC transition early — CDUs, coolant quality and floor plumbing have lead times of their own.");
  } else if (s2.month === 74) {
    log("info", "🧲 Feb 2026 — NVIDIA opens Rubin allocation and existing AI-factory operators get first call. Lesson: vendors reward demonstrated deployments — a campus that ships on schedule is your ticket to the next generation.");
  }
}
function disasterPool(s2, rng, log) {
  const pool = [];
  const live = s2.halls.filter((h) => h.racks.some((r) => r.status === "online"));
  if (live.length) pool.push(() => {
    const hall = live[Math.floor(rng() * live.length)];
    const online = hall.racks.filter((r) => r.status === "online");
    const rack = online[Math.floor(rng() * online.length)];
    const contained = Object.keys(hall.coolingEquip).some((id) => id.includes("suppression")) || hallResilience(hall).score >= 0.9;
    const down = contained ? 2 : 8;
    rack.status = "failed";
    rack.readyMonth = s2.month + down;
    rack.failedPart = void 0;
    if (!contained) s2.reputation = Math.max(0, s2.reputation - 3);
    log(contained ? "info" : "bad", `🔥 Fire in ${hall.name}: rack ${rack.id} ${contained ? "saved by early smoke detection and clean-agent suppression" : "destroyed"} — ${down} months to rebuild${contained ? "." : " and −3 reputation."} Lesson: ${contained ? "detection plus suppression turns a total loss into a bad weekend." : "smoke detection and clean-agent suppression cost pennies next to a hall of GPUs."}`);
  });
  const assigned = s2.activeContracts.filter((a) => a.clusterIds.length > 0);
  if (assigned.length) pool.push(() => {
    const a = assigned[Math.floor(rng() * assigned.length)];
    const c = a.contract;
    const monthly = c.kind === "training" ? c.pricePerAccelHour * c.minAccelerators * 730 : c.pricePerMTok * c.tokensPerSec * 730 * 3600 / 1e6;
    s2.activeContracts = s2.activeContracts.filter((x) => x !== a);
    s2.cash -= Math.round(monthly);
    s2.reputation = Math.max(0, s2.reputation - 1);
    log("bad", `💸 ${c.customer} defaults on its ${c.kind} contract: the cluster goes idle and ~$${Math.round(monthly).toLocaleString("en-US")} of a month's expected revenue never lands (−1 reputation). Lesson: deposits, take-or-pay minimums and credit checks exist because customers go bankrupt mid-deal.`);
  });
  if (s2.orders.length) pool.push(() => {
    const n = s2.orders.length;
    for (const o2 of s2.orders) o2.arriveMonth += 2;
    log("bad", `🚢 Supply-chain shock — a substrate shortage closes a fab and a port strike strands containers: all ${n} in-transit order(s) slip 2 months. Lesson: dual-sourcing and safety stock are insurance, not waste.`);
  });
  if (live.length) pool.push(() => {
    const hall = live[Math.floor(rng() * live.length)];
    const racks = hall.racks.filter((r) => r.status === "online").length;
    s2.activeContracts.forEach((a) => {
      if (a.clusterIds.length) a.slaMisses += 1;
    });
    s2.cash -= 4e4 * racks;
    log("bad", `❄ Chiller trip in ${hall.name}: a compressor fault drops the loop for hours and every serving contract takes an SLA miss; emergency pumping and overtime cost $${(4e4 * racks / 1e3).toFixed(0)}k. Lesson: N+1 chillers with automatic switchover keep the water cold while one unit is repaired.`);
  });
  return pool;
}
const BASE_POWER_PRICE = 0.07;
const onlineRacks = (s2) => s2.halls.flatMap((h) => h.racks).filter((r) => r.status === "online").length;
function rollEvents(s2, rng, log, graceMonths = 4) {
  s2.utilityUSDPerKWh = Math.round((s2.utilityUSDPerKWh + (BASE_POWER_PRICE - s2.utilityUSDPerKWh) * 0.05) * 1e4) / 1e4;
  scriptedEvents(s2, log);
  if (s2.month < 11 + graceMonths) return;
  if (rng() > 0.28) return;
  const racks = onlineRacks(s2);
  const year = 2020 + s2.month / 12;
  const pool = [];
  pool.push(() => {
    s2.utilityUSDPerKWh = Math.min(0.2, Math.round(s2.utilityUSDPerKWh * 1.3 * 1e4) / 1e4);
    log("bad", `⚡ Energy crisis: utility rate jumps to $${s2.utilityUSDPerKWh.toFixed(3)}/kWh. Lesson: power is the biggest opex line — long-term PPAs, on-site solar/gas and a lower PUE are how real operators hedge.`);
  });
  if (racks > 0) pool.push(() => {
    const cut = Math.round(1e6 + rng() * 2e6);
    s2.cash += cut;
    log("good", `🏛 Sovereign-AI grant: a regional government pays +$${(cut / 1e6).toFixed(1)}M to bring GPU capacity on-shore. Governments are now a real customer class.`);
  });
  pool.push(() => {
    const extra = generateContracts(s2, s2.month, rng).filter((c) => c.kind === "inference").slice(0, 2);
    extra.forEach((c) => {
      if (c.kind === "inference") c.pricePerMTok = Math.round(c.pricePerMTok * 1.25 * 100) / 100;
    });
    s2.availableContracts = [...s2.availableContracts, ...extra];
    log("good", `🚀 A viral model launch floods the market with inference demand${extra.length ? `: ${extra.length} premium (+25%) serving offers posted` : ""}. Memory-bandwidth-rich GPUs earn the most per watt on decode.`);
  });
  if (year >= 2021) pool.push(() => {
    const bill = Math.round(25e3 * Math.max(1, racks));
    s2.cash -= bill;
    log("bad", `🌡 Heatwave: dry-coolers derate in hot ambient air; extra chiller/pump energy costs $${(bill / 1e3).toFixed(0)}k. Lesson: warm-water DLC tolerates hot days — air-cooled halls suffer first.`);
  });
  if (racks > 0 && s2.uplinks) {
    pool.push(() => {
      if (carrierCount(s2) >= 2) {
        log("good", "🧵 A backhoe cuts a fiber route, but your second carrier on a diverse path keeps every customer online.");
        return;
      }
      s2.activeContracts.forEach((a) => {
        a.slaMisses += 1;
      });
      s2.reputation = Math.max(0, s2.reputation - 2);
      log("bad", "🧵 A backhoe cuts your only fiber route: customers lose connectivity for hours and SLAs take a hit. Lesson: buy a second circuit from a different carrier on a diverse path.");
    });
  }
  if (racks > 0) {
    pool.push(() => {
      const live = s2.halls.filter((h) => h.racks.some((r) => r.status === "online"));
      const weakest = live.map(hallResilience).sort((a, b) => a.score - b.score)[0];
      const score = weakest?.score ?? 0;
      if (rng() < score) {
        log("good", `🔌 Utility outage: your ${weakest?.tier} power chain (UPS → generator → transfer switch) carried the halls through with no customer impact.`);
        return;
      }
      s2.activeContracts.forEach((a) => {
        a.slaMisses += 1;
      });
      s2.reputation = Math.max(0, s2.reputation - 2);
      const why = weakest?.gaps[0] ?? "no backup power installed";
      log("bad", `🔌 Utility outage with weak protection (${why}): running jobs restart from checkpoint and SLAs take a hit. Lesson: UPS + battery + generator + transfer switch, sized N+1, keep training alive.`);
    });
    pool.push(() => {
      const bonus = Math.round(racks * 4e4);
      s2.cash += bonus;
      s2.reputation = Math.min(100, s2.reputation + 1);
      log("good", `📣 A customer publishes a benchmark crediting your cluster's uptime: +${bonus ? "$" + (bonus / 1e3).toFixed(0) + "k" : ""} in spot demand and +1 reputation.`);
    });
  }
  pool.push(...disasterPool(s2, rng, log));
  pool[Math.floor(rng() * pool.length)]();
}
const worldEvents = { id: "world-events", run: ({ s: s2, rng, log }) => rollEvents(s2, rng, log) };
const spotAndPower = {
  id: "spot-and-power",
  run: (c) => {
    const { s: s2, rng, log } = c;
    stepSpotPrice(s2, rng);
    const spot = spotRevenue(s2, c.served, (d) => rackAccels(s2, d));
    if (spot.revenue > 0) {
      c.revenue += spot.revenue;
      log("info", `Spot market: ${Math.round(spot.accels)} idle GPUs sold at $${(s2.spotPrice ?? 0).toFixed(2)}/GPU-hr (${Math.round(spot.util * 100)}% filled) → +$${Math.round(spot.revenue).toLocaleString("en-US")}.`);
    }
    powerMarketTick(s2, rng, log);
  }
};
const finances = {
  id: "finances",
  run: (c) => {
    const { s: s2, rng, log } = c;
    const opex0 = monthlyOpex(s2);
    const pw2 = settlePower(s2, opex0.itPowerKW * opex0.pue / 1e3, rng, log);
    c.opexUSD = opex0.totalUSD - opex0.powerUSD + pw2.netUSD;
    c.depreciation = monthlyDepreciation(estimateCapexBasis(s2));
    c.interest = monthlyInterest(s2.debt);
    const prevCash = s2.cash;
    s2.cash = round2$1(s2.cash + c.revenue - c.opexUSD - c.interest);
    if (s2.cash < 0 && prevCash >= 0) log("bad", "Bankruptcy warning: cash is negative. Raise a loan, land contracts, or cut opex before creditors close you down.");
  }
};
const history = {
  id: "history",
  run: (c) => {
    const { s: s2 } = c;
    const onlineAccels2 = s2.clusters.reduce((n, cl) => n + (cl.stats?.accelerators ?? 0), 0);
    const servingAccels = [...c.served].reduce((n, id) => n + (s2.clusters.find((x) => x.id === id)?.stats?.accelerators ?? 0), 0);
    const utilization = onlineAccels2 > 0 ? Math.min(1, servingAccels / onlineAccels2) : 0;
    s2.history.push({ month: s2.month, revenue: round2$1(c.revenue), opex: round2$1(c.opexUSD + c.depreciation + c.interest), cash: s2.cash, utilization: round2$1(utilization) });
  }
};
const staffingCheck = {
  id: "staffing",
  run: ({ s: s2, log }) => {
    const { needed } = staffNeeded(s2);
    if (s2.staff < needed) {
      if (s2.month % 3 !== 0) return;
      const fx = staffEffect(s2);
      log("bad", `Understaffed: ${s2.staff} of ${needed} needed. Failures x${fx.failureMult.toFixed(1)}${fx.repairExtraMonths ? ", repairs a month slower" : ""}. Hire on the Operations screen.`);
    } else if (s2.staff > needed + 2 && s2.month % 6 === 0) {
      log("info", `Overstaffed: ${s2.staff} on the payroll, only ${needed} needed — each extra costs $${STAFF_COST_PER_MONTH.toLocaleString("en-US")}/month. Let a few go on the Operations screen.`);
    }
  }
};
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const ACCELERATORS = ALL_ITEMS.filter((i) => i.kind === "accelerator");
const rackAgeMonths = (rack, month) => Math.max(0, month - (rack.installedMonth ?? rack.readyMonth - 2));
function rackAccelItem(g, designId) {
  const design = g.racks.find((r) => r.id === designId);
  if (!design) return void 0;
  for (const item of design.items) {
    if (item.type !== "tray") continue;
    const tray = g.trays.find((t) => t.id === item.trayId);
    if (!tray) continue;
    for (const p of tray.parts) {
      const it2 = getItem(p.itemId);
      if (it2?.kind === "accelerator") return it2;
    }
  }
  return void 0;
}
function generationsBehind(accel, month) {
  const mine = Math.floor(accel.availableFrom);
  const now = monthToYear(month);
  const newer = /* @__PURE__ */ new Set();
  for (const a of ACCELERATORS) {
    if (a.availableFrom <= now && Math.floor(a.availableFrom) > mine) newer.add(Math.floor(a.availableFrom));
  }
  return Math.min(3, newer.size);
}
function residualFactor(g, rack) {
  const ageYears = rackAgeMonths(rack, g.month) / 12;
  const accel = rackAccelItem(g, rack.designId);
  return accel ? clamp(1 - 0.12 * ageYears - 0.07 * generationsBehind(accel, g.month), 0.1, 1) : clamp(1 - 0.1 * ageYears, 0.25, 1);
}
const rackResidualUSD = (g, rack) => {
  const design = g.racks.find((r) => r.id === rack.designId);
  return design ? rackBomValue(g, design) * residualFactor(g, rack) : 0;
};
function assetValue(g) {
  let v2 = 0;
  for (const [id, n] of Object.entries(g.inventory)) v2 += 0.8 * (getItem(id)?.priceUSD ?? 0) * n;
  for (const [id, n] of Object.entries(g.spareStock ?? {})) v2 += 0.8 * (getItem(id)?.priceUSD ?? 0) * n;
  for (const o2 of g.orders) v2 += 0.9 * o2.unitPrice * o2.qty;
  for (const hall of g.halls) {
    for (const [id, n] of Object.entries(hall.powerEquip)) v2 += 0.6 * (getItem(id)?.priceUSD ?? 0) * n;
    for (const [id, n] of Object.entries(hall.coolingEquip)) v2 += 0.6 * (getItem(id)?.priceUSD ?? 0) * n;
    for (const rack of hall.racks) v2 += rackResidualUSD(g, rack);
  }
  return v2;
}
const HORIZON_MONTH = 108;
const BANKRUPT_AFTER_MONTHS = 3;
const netWorthOf = (g) => g.cash - g.debt + assetValue(g);
const RATINGS = [
  [1e9, "AI Datacenter Tycoon"],
  [3e8, "Hyperscale contender"],
  [1e8, "Solid operator"],
  [5e7, "Steady operator"],
  [0, "Struggling operator"]
];
const ratingFor = (netWorth) => (RATINGS.find(([min]) => netWorth >= min) ?? [0, "Bankrupt"])[1];
const scoreOf = (g, netWorth) => Math.round(netWorth / 1e5 + (g.reputation ?? 0) * 5 + (g.stats?.contractsCompleted ?? 0) * 20 + (g.stats?.peakAccels ?? 0) / 50);
function finish(c, reason) {
  const { s: s2, log } = c;
  const nw = netWorthOf(s2);
  const stats = s2.stats;
  const rating = reason === "bankrupt" ? "Bankrupt" : ratingFor(nw);
  const summary = reason === "bankrupt" ? `Creditors closed you down in month ${s2.month}: cash stayed negative for ${BANKRUPT_AFTER_MONTHS} months.` : `You reached the end of 2028 with net worth $${Math.round(nw / 1e6)}M, ${stats.contractsCompleted} contracts completed and a peak of ${stats.peakAccels} accelerators.`;
  s2.status = reason === "bankrupt" ? "bankrupt" : "finished";
  s2.endReport = { reason, month: s2.month, score: scoreOf(s2, nw), netWorth: Math.round(nw), rating, revenueTotal: Math.round(stats.revenueTotal), peakAccels: stats.peakAccels, contractsCompleted: stats.contractsCompleted, reputation: s2.reputation, summary };
  log(reason === "bankrupt" ? "bad" : "good", `${reason === "bankrupt" ? "GAME OVER" : "2028 COMPLETE"} - ${rating}. ${summary}`);
}
const endgame = {
  id: "endgame",
  run: (c) => {
    const { s: s2, log } = c;
    s2.stats ??= { contractsCompleted: 0, peakAccels: 0, slaMisses: 0, revenueTotal: 0, decommissioned: 0 };
    s2.stats.revenueTotal += c.revenue;
    const accels = s2.clusters.reduce((n, cl) => n + (cl.stats?.accelerators ?? 0), 0);
    s2.stats.peakAccels = Math.max(s2.stats.peakAccels, accels);
    if (s2.cash < 0) {
      s2.negCashMonths = (s2.negCashMonths ?? 0) + 1;
      if (s2.mode !== "learner") {
        if (s2.negCashMonths >= BANKRUPT_AFTER_MONTHS) return finish(c, "bankrupt");
        log("bad", `Cash is negative (${s2.negCashMonths}/${BANKRUPT_AFTER_MONTHS} months). Creditors close you down at ${BANKRUPT_AFTER_MONTHS}. Take a loan, land contracts, sell idle hardware.`);
      }
    } else s2.negCashMonths = 0;
    if (s2.month >= HORIZON_MONTH) finish(c, "horizon");
  }
};
const rivalsSystem = {
  id: "rivals",
  run: ({ s: s2, rng, log }) => {
    if (!s2.rivals) s2.rivals = initialRivals(s2.seed);
    const before = s2.rivals.map((r) => ({ r, accels: r.accels, priceMult: r.priceMult }));
    stepRivals(s2, rng);
    s2.marketPriceIndex = priceIndexOf(s2);
    if (s2.month % 6 === 0) {
      let top = before[0];
      let added = 0;
      for (const b of before) {
        const d = b.r.accels - b.accels;
        if (d > added) {
          added = d;
          top = b;
        }
      }
      const cut = (top.priceMult - top.r.priceMult) * 100;
      const move = cut >= 0.05 ? `cut prices ${cut.toFixed(0)}%` : cut <= -0.05 ? `raised prices ${(-cut).toFixed(0)}%` : "held prices flat";
      log("info", `${top.r.name} added ${Math.round(added).toLocaleString("en-US")} accelerators and ${move} — competition sets the market: your share of supply moves the price index.`);
    }
  }
};
const vendorsSystem = {
  id: "vendors",
  run: ({ s: s2, log }) => {
    const expired = (s2.frameworks ?? []).filter((f) => f.endMonth < s2.month);
    s2.frameworks = (s2.frameworks ?? []).filter((f) => f.endMonth >= s2.month);
    for (const fw of expired) {
      const unmet = fw.commitUSD - fw.spentUSD;
      if (unmet > 0) {
        const penalty = Math.round(unmet * FRAMEWORK_EXPIRY_PENALTY_PCT);
        s2.cash -= penalty;
        adjustRel(s2, fw.vendorId, FRAMEWORK_EXPIRY_REL_HIT);
        log("bad", `${fw.vendorId} framework expired with $${Math.round(unmet).toLocaleString("en-US")} of the commitment unmet: $${penalty.toLocaleString("en-US")} take-or-pay penalty and the relationship soured. Size commitments to what you will actually buy.`);
      } else {
        adjustRel(s2, fw.vendorId, FRAMEWORK_EXPIRY_REL_BONUS);
        log("good", `${fw.vendorId} framework closed out in full — the account team now takes your calls first.`);
      }
    }
    for (const [vendorId, rel] of Object.entries(s2.vendorRel ?? {}))
      s2.vendorRel[vendorId] = Math.max(0, rel - REL_DECAY_PER_MONTH);
  }
};
const DEFAULT_TICK = {
  accelFailureProbPerMonth: 1 / 8e3,
  commissionFailProb: 0.04,
  repairMonths: 4,
  // RMA turnaround when no spare is on the shelf
  maxAvailableContracts: 10
};
const RACK_READY_LEAD = 2;
const PIPELINE = [
  deliveries,
  vendorsSystem,
  floorSpace,
  commissioning,
  clusterStats,
  staffingCheck,
  failures,
  pue,
  serveContracts,
  rivalsSystem,
  contractMarket,
  worldEvents,
  spotAndPower,
  finances,
  history,
  endgame
];
function advanceMonth(state2, opts = {}) {
  if (state2.status && state2.status !== "playing") return state2;
  const s2 = JSON.parse(JSON.stringify(state2));
  const rng = mulberry32((s2.seed ^ Math.imul(s2.month + 1, 2654435769)) >>> 0);
  s2.month += 1;
  const logs = [];
  const cluster = clusterContextOf(s2);
  const c = {
    s: s2,
    o: { ...DEFAULT_TICK, ...opts },
    rng,
    log: (level, text) => logs.push({ month: s2.month, level, text }),
    placed: [],
    placedById: /* @__PURE__ */ new Map(),
    cluster,
    refreshStats: () => {
      const online = (cl) => cl.rackIds.filter((id) => c.placedById.get(id)?.status === "online");
      for (const cl of s2.clusters) cl.stats = evaluateCluster({ ...cl, rackIds: online(cl) }, cluster);
    },
    revenue: 0,
    served: /* @__PURE__ */ new Set(),
    opexUSD: 0,
    depreciation: 0,
    interest: 0
  };
  for (const system of PIPELINE) system.run(c);
  s2.log = [...s2.log, ...logs].slice(-400);
  return s2;
}
const deployActions = (c) => {
  const { commit, logln } = c;
  return {
    reserveRacks: (designId, racks) => commit((g) => {
      if (!g.racks.some((r) => r.id === designId)) return fail("Unknown rack design.");
      reserve(g, designId, Math.floor(racks));
      return ok(`Reserved ${Math.floor(racks)} rack(s) of this design.`);
    }),
    placeRack: (hallId, designId) => commit((g) => {
      const hall = g.halls.find((h) => h.id === hallId);
      if (!hall) return fail(`Hall '${hallId}' not found.`);
      const design = g.racks.find((r) => r.id === designId);
      if (!design) return fail(`Rack design '${designId}' not found.`);
      if (hall.racks.length >= hall.rackSlots) {
        return fail(`${hall.name} is full (${hall.rackSlots} slots). Build another hall.`);
      }
      if (COOL_LEVEL$2[design.coolingInterface] > COOL_LEVEL$2[hall.coolingClass]) {
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
      const wKg = validateRack(design, g.trays, getItem).stats.weightKg;
      if (wKg > hall.floorLoadKgPerRack) {
        return fail(`${design.name} weighs ~${Math.round(wKg)} kg but ${hall.name}'s floor is rated ${hall.floorLoadKgPerRack} kg per rack. Build a liquid/immersion-class hall (slab-on-grade, higher rating) or choose a lighter design.`, [{ severity: "error", code: "HALL_FLOOR_LOAD", message: `Rack ${Math.round(wKg)} kg > floor ${hall.floorLoadKgPerRack} kg.`, learn: design.rackId }]);
      }
      const need = rackBom(g, designId) ?? {};
      const free = availableFor(g, designId);
      const missing = Object.entries(need).filter(([id, n]) => (free[id] ?? 0) < n);
      if (missing.length) {
        return fail(
          `Missing parts: ${missing.map(([id, n]) => `${n - (free[id] ?? 0)} more × ${getItem(id)?.name ?? id}`).join(", ")}.`,
          missing.map(([id, n]) => ({
            severity: "error",
            code: "missing-parts",
            message: `Need ${n} × ${getItem(id)?.name ?? id}, ${free[id] ?? 0} free (${g.inventory[id] ?? 0} in warehouse, rest reserved for other racks).`,
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
      g.rackSeq = (g.rackSeq ?? g.halls.reduce((n, h) => n + h.racks.length, 0)) + 1;
      reserve(g, designId, -1);
      const rack = {
        id: `RK-${String(g.rackSeq).padStart(4, "0")}`,
        serial: g.rackSeq,
        designId,
        slot: (() => {
          const used = new Set(hall.racks.map((r) => r.slot));
          let i = 0;
          while (used.has(i)) i++;
          return i;
        })(),
        status: "installing",
        readyMonth: g.month + RACK_READY_LEAD + burnInLeadDelta(g),
        installedMonth: g.month
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
    })
  };
};
const clustersActions = (c) => {
  const { get, set, commit, logln } = c;
  return {
    createCluster: (name, rackIds, fabric) => commit((g) => {
      const ids = [...new Set(rackIds)];
      if (!ids.length) return fail("Pick at least one placed rack.");
      const placed2 = /* @__PURE__ */ new Map();
      for (const hall of g.halls) for (const r of hall.racks) placed2.set(r.id, r);
      const unknown = ids.filter((id) => !placed2.has(id));
      if (unknown.length) return fail(`Unknown placed racks: ${unknown.join(", ")}.`);
      const claimed = ids.filter((id) => placed2.get(id)?.clusterId);
      if (claimed.length) return fail(`Racks already belong to a cluster: ${claimed.join(", ")}.`);
      const nextN = Math.max(g.clusterSeq ?? 0, g.clusters.reduce((m, c2) => Math.max(m, parseInt(c2.id.replace(/\D/g, "")) || 0), 0)) + 1;
      g.clusterSeq = nextN;
      const cluster = { id: `cl-${nextN}`, name, rackIds: ids, fabric };
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
    disbandCluster: (clusterId) => commit((g) => {
      const cl = g.clusters.find((c2) => c2.id === clusterId);
      if (!cl) return fail("Unknown cluster.");
      for (const h of g.halls) for (const r of h.racks) if (r.clusterId === clusterId) r.clusterId = void 0;
      for (const ac of g.activeContracts) {
        if (!ac.clusterIds.includes(clusterId)) continue;
        ac.clusterIds = ac.clusterIds.filter((x) => x !== clusterId);
        if (!ac.clusterIds.length) ac.deployBy = Math.max(ac.deployBy ?? g.month, g.month + 2);
      }
      g.clusters = g.clusters.filter((c2) => c2.id !== clusterId);
      g.spotClusters = (g.spotClusters ?? []).filter((x) => x !== clusterId);
      logln(g, "info", `Cluster '${cl.name}' disbanded — its racks are free to re-cluster.`);
      return ok(`Cluster '${cl.name}' disbanded; racks are free again.`);
    })
  };
};
function quote(t, racks, month) {
  const lines = [];
  const unavailable = [];
  const capped = [];
  let cost = 0, lead = 1;
  for (const [id, n] of Object.entries(templateBom(t, racks))) {
    const item = getItem(id);
    const o2 = offerAt(item, month);
    if (!o2.available) {
      unavailable.push(item.name);
      continue;
    }
    if (o2.qtyCap && n > o2.qtyCap) capped.push(`${item.name} (cap ${o2.qtyCap}/qtr)`);
    const unit = Math.round(o2.unitPrice * (1 - volumeDiscount(item, n, o2.unitPrice)) * (1 + t.premium));
    lines.push({ id, name: item.name, n, unit, total: unit * n });
    cost += unit * n;
    lead = Math.max(lead, Math.max(1, Math.round(o2.leadMonths * t.leadFactor)));
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
  const ordered = g.orders.filter((o2) => isAccel2(o2.itemId)).reduce((n, o2) => n + o2.qty, 0);
  return { online, freeOnline, installing, warehouse, ordered };
}
function contractFit(g, c) {
  const all = g.clusters.filter((cl) => cl.stats).map((cl) => {
    const s2 = cl.stats;
    const checks = [];
    if (c.kind === "training") {
      checks.push({ label: "Accelerators", need: `≥ ${k(c.minAccelerators)}`, have: k(s2.accelerators), ok: s2.accelerators >= c.minAccelerators });
      checks.push({ label: "Scale-up domain", need: `≥ ${c.minScaleUpDomain}`, have: `${s2.scaleUpDomain}`, ok: s2.scaleUpDomain >= c.minScaleUpDomain });
      checks.push({ label: "Scale-out / GPU", need: `≥ ${c.minScaleOutGBsPerAccel} GB/s`, have: `${s2.effScaleOutGBs.toFixed(1)} GB/s`, ok: s2.effScaleOutGBs >= c.minScaleOutGBsPerAccel });
      checks.push({ label: "Total memory", need: `≥ ${k(c.minTotalMemGB / 1e3)} TB`, have: `${k(s2.totalMemGB / 1e3)} TB`, ok: s2.totalMemGB >= c.minTotalMemGB });
    } else {
      const a = getItem(s2.acceleratorId);
      if (a?.kind === "accelerator") {
        const cap = inferenceCapacity(s2, a, c.model, { contextTokens: c.contextTokens, tpotMs: c.tpotMs });
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
  const feasible = out.filter((o2) => o2.cost <= Math.max(g.cash * 4, 1));
  const pool = feasible.length ? feasible : out;
  pool.sort((a, b) => a.cost - b.cost);
  const cheapest = pool.find((o2) => o2.fitsRamp) ?? pool[0];
  const fastest = [...pool].sort((a, b) => a.readyMonth - b.readyMonth || a.cost - b.cost)[0];
  const payback = [...pool].filter((o2) => isFinite(o2.paybackMo) && o2.fitsRamp).sort((a, b) => a.paybackMo - b.paybackMo)[0];
  cheapest && cheapest.tags.push("💰 cheapest");
  fastest && fastest.tags.push("⚡ fastest");
  payback && payback.tags.push("📈 best payback");
  const picked = [...new Set([cheapest, fastest, payback].filter(Boolean))];
  for (const o2 of pool) {
    if (picked.length >= 4) break;
    if (!picked.includes(o2)) picked.push(o2);
  }
  return picked;
}
const G$3 = () => useGame.getState().game;
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
  const sw2 = ITEMS_BY_KIND("switch").filter((s2) => s2.role === "scale-out" && s2.rackUnits > 0 && offerAt(s2, g.month).available);
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
const COOL_LEVEL = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };
function plantChoice(g, hallClass, kind) {
  const cand = ALL_ITEMS.filter((i) => kind === "power" ? i.kind === "power" && i.powerType === "transformer" : i.kind === "cooling" && i.serves === hallClass).map((i) => offerAt(i, g.month)).filter((o2) => o2.available);
  cand.sort((a, b) => a.unitPrice / (a.item.capacityKW || 1) - b.unitPrice / (b.item.capacityKW || 1));
  return cand[0];
}
function stepProject(st2, pid) {
  const g = G$3();
  const p = (g.projects ?? []).find((x) => x.id === pid);
  if (!p || p.stage === "done" || p.stage === "failed") return;
  const t = getTemplate(p.templateId);
  const hall = g.halls.find((h) => h.id === p.hallId);
  if (!t || !hall) return st2.patchProject(pid, { stage: "failed", notes: [...p.notes, "Template or hall disappeared."] });
  const f = templateFacts(t);
  if (!G$3().activeContracts.some((a) => a.contract.id === p.contractId) && p.stage !== "building") {
    st2.patchProject(pid, { stage: "failed", notes: [...p.notes, "Contract was cancelled — the capacity is yours; offer it on spot in Energy."] });
    return;
  }
  const note = (s2) => st2.patchProject(pid, { notes: [...g.projects.find((x) => x.id === pid).notes, `${2020 + Math.floor(g.month / 12)}-${String(g.month % 12 + 1).padStart(2, "0")}: ${s2}`].slice(-12) });
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
    const load = h2.racks.reduce((n, r) => n + (r.status === "failed" ? 0 : templateFactsOfDesign(G$3(), r.designId)), 0) + f.kWPerRack * (p.racks - p.rackIds.length);
    const free = h2.rackSlots - h2.racks.length;
    const designId = rackIdOf(t);
    const bom = rackBom(G$3(), designId) ?? {};
    const have = (n) => Object.entries(bom).every(([id, c]) => (G$3().inventory[id] ?? 0) >= c * n);
    let placed2 = p.rackIds.length;
    const before = new Set(useStoreHall(st2, hall.id).racks.map((r) => r.id));
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
      const ids = [...p.rackIds, ...useStoreHall(st2, hall.id).racks.filter((r) => !before.has(r.id)).map((r) => r.id)];
      note(`deployed ${placed2}/${p.racks} racks`);
      st2.patchProject(pid, { rackIds: ids, ...placed2 >= p.racks ? { stage: "commissioning" } : {} });
    } else {
      const why = load > h2.itPowerKW ? `waiting for power: need ${load.toFixed(0)} kW IT, hall has ${h2.itPowerKW.toFixed(0)} kW (order a transformer on Build)` : load > h2.coolingKW ? `waiting for cooling: need ${load.toFixed(0)} kW, hall rejects ${h2.coolingKW.toFixed(0)} kW (add cooling on Build)` : free <= 0 ? `${hall.name} is full — buy floor space on Build` : !have(1) ? "waiting for parts to arrive (lead time)" : "waiting";
      const last = (G$3().projects ?? []).find((x) => x.id === pid)?.notes.slice(-1)[0] ?? "";
      if (!last.endsWith(why)) note(why);
      if (G$3().month - p.startMonth > 16) {
        st2.patchProject(pid, { stage: "failed", notes: [...(G$3().projects ?? []).find((x) => x.id === pid).notes, "Gave up after 16 months stuck — the parts are in your warehouse; finish the build by hand."].slice(-12) });
      }
    }
  } else if (p.stage === "commissioning") {
    const racks = useStoreHall(st2, hall.id).racks.filter((r) => p.rackIds.includes(r.id));
    if (racks.length && racks.every((r) => r.status === "online")) {
      note("all racks online — designing the fabric");
      st2.patchProject(pid, { stage: "clustering" });
      stepProject(st2, pid);
    }
  } else if (p.stage === "clustering") {
    const c = G$3().activeContracts.find((a) => a.contract.id === p.contractId)?.contract;
    const target = c && c.kind === "training" ? c.minScaleOutGBsPerAccel : 0;
    const af = autoFabric(G$3(), p.rackIds, target);
    if (!af) return note("no valid fabric found — build one by hand on the Supercomputer screen");
    const r = st2.createCluster(p.name, p.rackIds, af.fabric);
    if (!r.ok) return note(`cluster blocked: ${r.message}`);
    note(`cluster built: ${af.note}`);
    st2.patchProject(pid, { stage: "assigning", clusterId: G$3().clusters[G$3().clusters.length - 1].id });
    stepProject(st2, pid);
  } else if (p.stage === "assigning") {
    const cid = p.clusterId ?? G$3().clusters[G$3().clusters.length - 1]?.id;
    if (!cid) return;
    const r = st2.assignContract(p.contractId, [cid]);
    if (r.ok) {
      note("contract live — revenue starts next month");
      st2.patchProject(pid, { stage: "done" });
    } else note(`not qualified yet: ${r.message}`);
  }
}
const useStoreHall = (_st, hid) => G$3().halls.find((h) => h.id === hid);
const templateFactsOfDesign = (g, designId) => {
  const d = g.racks.find((r) => r.id === designId);
  if (!d) return 0;
  const t = (g.projects ?? []).map((p) => getTemplate(p.templateId)).find((tt) => tt && rackIdOf(tt) === designId);
  return t ? templateFacts(t).kWPerRack : 30;
};
function ensureUplink(st2) {
  const g = G$3();
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
  const g0 = G$3();
  const cand = g0.activeContracts.find((a) => a.contract.id === contractId)?.contract ?? g0.availableContracts.find((c) => c.id === contractId);
  if (!cand) return { ok: false, message: "Contract not found." };
  const busy = new Set(g0.activeContracts.flatMap((a) => a.clusterIds));
  const idle = contractFit(g0, cand).all.find((x) => x.ok && !busy.has(x.cluster.id));
  if (idle) {
    if (!g0.activeContracts.some((a) => a.contract.id === contractId)) {
      const a = st2.acceptContract(contractId);
      if (!a.ok) return a;
    }
    const r22 = st2.assignContract(contractId, [idle.cluster.id]);
    if (r22.ok) return { ok: true, message: `Reused your idle cluster "${idle.cluster.name}" — no new hardware needed. Revenue starts next month.` };
  }
  const opts = buildOptions(g0, cand);
  const opt = opts.find((o2) => o2.t.id === templateId);
  if (!opt) return { ok: false, message: `${t.name} cannot serve ${cand.customer}'s ${cand.model.name} (${opts.length ? "qualifying builds: " + opts.slice(0, 3).map((o2) => o2.t.name).join(", ") : "no build you can buy today qualifies"}).` };
  if (racks < opt.racks) return { ok: false, message: `${cand.customer} needs at least ${opt.racks} × ${t.name} to qualify (you asked for ${racks}).` };
  if (!opt.fitsRamp) return { ok: false, message: `Parts take ${opt.lead} months to arrive but ${cand.customer} requires capacity within ${cand.rampMonths ?? 4} months of signing — they would walk away. Pick a build with a shorter lead time.` };
  if (!g0.activeContracts.some((a) => a.contract.id === contractId)) {
    const a = st2.acceptContract(contractId);
    if (!a.ok) return a;
  }
  const r = st2.buyTemplate(templateId, racks);
  if (!r.ok) return r;
  const f = templateFacts(t);
  let hall = G$3().halls.find((h) => COOL_LEVEL[h.coolingClass] >= COOL_LEVEL[t.rack.cooling] && h.rackSlots - h.racks.length >= racks);
  const notes = [`ordered ${racks} × ${t.name}`];
  if (!hall) {
    const b = st2.buildHall(`Hall ${String.fromCharCode(65 + G$3().halls.length)}`, t.rack.cooling, Math.max(8, racks + 4));
    notes.push(b.message);
    hall = G$3().halls[G$3().halls.length - 1];
  }
  const kwOf = (did) => {
    const d = G$3().racks.find((r22) => r22.id === did);
    return d ? validateRack(d, G$3().trays, getItem).stats.kW : 0;
  };
  const inFlightKW = (G$3().projects ?? []).filter((pp) => pp.hallId === hall.id && pp.stage === "building").reduce((n, pp) => {
    const tt = getTemplate(pp.templateId);
    return n + (tt ? templateFacts(tt).kWPerRack * Math.max(0, pp.racks - pp.rackIds.length) : 0);
  }, 0);
  const need = f.kWPerRack * racks + hall.racks.reduce((n, r22) => n + kwOf(r22.designId), 0) + inFlightKW;
  const plant = [];
  const g = G$3();
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
  const g = G$3();
  const placed2 = g.halls.flatMap((h) => h.racks);
  const bad = rackIds.filter((id) => placed2.find((p) => p.id === id)?.status !== "online");
  if (bad.length) return { ok: false, message: "All chosen racks must be online (commissioned)." };
  if (!g.activeContracts.some((a2) => a2.contract.id === contractId)) {
    const a2 = st2.acceptContract(contractId);
    if (!a2.ok) return a2;
  }
  const c = G$3().activeContracts.find((a2) => a2.contract.id === contractId).contract;
  const af = autoFabric(G$3(), rackIds, c.kind === "training" ? c.minScaleOutGBsPerAccel : 0);
  if (!af) return { ok: false, message: "No valid network fabric found for these racks." };
  const free = rackIds.filter((id) => !placed2.find((p) => p.id === id)?.clusterId);
  if (free.length !== rackIds.length) return { ok: false, message: "Some racks already belong to a cluster — assign that cluster instead." };
  const r = st2.createCluster(`Auto · ${c.customer}`, rackIds, af.fabric);
  if (!r.ok) return r;
  const cl = G$3().clusters[G$3().clusters.length - 1];
  const a = st2.assignContract(contractId, [cl.id]);
  if (!a.ok) st2.disbandCluster(cl.id);
  return a.ok ? { ok: true, message: `Serving ${c.customer} from ${rackIds.length} rack(s) (auto-clustered: ${af.note}).` } : { ok: false, message: `${a.message} (nothing was changed — racks are still free.)` };
}
const contractsActions = (c) => {
  const { get, set, commit, logln } = c;
  return {
    acceptContract: (contractId) => commit((g) => {
      const i = g.availableContracts.findIndex((c2) => c2.id === contractId);
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
      const clusters = ids.map((id) => g.clusters.find((c2) => c2.id === id));
      if (clusters.some((c2) => !c2)) return fail("Unknown cluster in the list.");
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
          for (const o2 of g.activeContracts) {
            if (o2.contract.id === contractId || !o2.clusterIds.includes(cl.id)) continue;
            if (o2.contract.kind === "training") {
              used = 1;
              break;
            }
            const oct = o2.contract;
            if (oct.kind !== "inference") continue;
            const oc = o2.clusterIds.map((id) => g.clusters.find((x) => x.id === id)?.stats).filter(Boolean);
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
        for (const cl of clusters) if (g.activeContracts.some((o2) => o2.contract.id !== contractId && o2.clusterIds.includes(cl.id))) issues.push({ severity: "error", code: "cluster-busy", message: `Cluster '${cl.name}' is already serving another contract; a training job needs it exclusively.` });
      }
      const errors = issues.filter((i) => i.severity === "error");
      if (errors.length) return fail("The assigned clusters do not meet this contract.", issues);
      ac.clusterIds = ids;
      ac.startMonth = g.month;
      const names = ids.map((id) => g.clusters.find((x) => x.id === id)?.name ?? id).join(" + ");
      logln(g, "good", `${contract.customer} (${contract.model.name}) now served by ${names}.`);
      return ok(`Serving ${contract.customer}.`, issues);
    }),
    unassignContract: (contractId) => commit((g) => {
      const ac = g.activeContracts.find((a) => a.contract.id === contractId);
      if (!ac) return fail("Active contract not found.");
      if (!ac.clusterIds.length) return fail("This contract has no cluster assigned.");
      ac.clusterIds = [];
      ac.deployBy = Math.max(ac.deployBy ?? g.month, g.month + 2);
      logln(g, "info", `${ac.contract.customer}: cluster released. Re-assign a qualifying cluster by ${g.month + 2 >= (ac.deployBy ?? 0) ? "month " + ac.deployBy : "the deadline"} or they walk.`);
      return ok("Cluster released; the contract is awaiting deployment again (2 months grace).");
    }),
    assignRacks: (contractId, rackIds) => assignFromRacks(get(), contractId, rackIds),
    startEasy: (contractId, templateId, racks) => {
      const r = startProject(get(), contractId, templateId, racks);
      if (r.ok) stepAllProjects(get);
      return r;
    },
    stepEasy: () => stepAllProjects(get)
  };
};
const financeActions = (c) => {
  const { commit, logln } = c;
  return {
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
    repayLoan: (amountUSD) => commit((g) => {
      const amt = Math.floor(amountUSD);
      if (!Number.isFinite(amt) || amt <= 0) return fail("Repayment amount must be positive.");
      if (amt > g.debt) return fail(`You only owe $${usd(g.debt)} — repay less.`);
      if (amt > g.cash) return fail(`Repaying $${usd(amt)} needs cash — you only have $${usd(g.cash)}.`);
      g.debt -= amt;
      g.cash -= amt;
      logln(g, "good", `Repaid $${usd(amt)} of principal; $${usd(g.debt)} of debt remains.`);
      return ok(`$${usd(amt)} repaid.`);
    })
  };
};
const energyActions = (c) => {
  const { set, commit, logln } = c;
  return {
    signPower: (offerId, mwOverride) => commit((g) => {
      const i = (g.powerOffers ?? []).findIndex((o22) => o22.id === offerId);
      if (i < 0) return fail("Offer not found or expired.");
      const o2 = g.powerOffers[i];
      const mw = Math.max(1, Math.min(o2.mw * 2, Math.round(mwOverride ?? o2.mw)));
      g.powerOffers.splice(i, 1);
      (g.powerContracts ??= []).push({ ...o2, mw, startMonth: g.month + 1, endMonth: g.month + o2.termMonths });
      logln(g, "good", `Signed ${mw} MW ${o2.source} PPA with ${o2.supplier}: $${o2.priceUSDPerMWh}/MWh take-or-pay for ${o2.termMonths} mo, overdraw up to +${Math.round(o2.overdrawPct * 100)}%. ${POWER_LESSON[o2.source]}`);
      return ok(`Signed ${mw} MW with ${o2.supplier}; starts next month.`);
    }),
    setSpot: (clusterId, on) => commit((g) => {
      if (!g.clusters.some((c2) => c2.id === clusterId)) return fail("Unknown cluster.");
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
    setSpotReserve: (usd2) => commit((g) => {
      g.spotReserve = Math.max(0, usd2);
      return ok(`Reserve price $${Math.max(0, usd2).toFixed(2)}/GPU-hr.`);
    })
  };
};
const sessionActions = (c) => {
  const { get, set } = c;
  return {
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
    setMode: (m) => set((s2) => ({ game: { ...s2.game, mode: m } })),
    patchProject: (id, patch2) => set((s2) => ({ game: { ...s2.game, projects: (s2.game.projects ?? []).map((p) => p.id === id ? { ...p, ...patch2 } : p) } })),
    addProject: (p) => set((s2) => ({ game: { ...s2.game, projects: [...s2.game.projects ?? [], p] } })),
    nextMonth: () => {
      if (get().game.status && get().game.status !== "playing") return;
      set({ game: advanceMonth(get().game) });
      stepAllProjects(get);
      writeSlot("auto", get().game);
    },
    save: (slot = DEFAULT_SLOT) => writeSlot(slot, get().game) ? ok(`Saved to slot '${slot}'.`) : fail("Could not write the save (storage unavailable)."),
    load: (slot = DEFAULT_SLOT) => {
      const r = readSlot(slot);
      if (!r.game) return fail(r.error ?? "No save found.");
      set({ game: r.game });
      return ok(`Loaded month ${r.game.month}.`);
    }
  };
};
const lifecycleActions = (c) => {
  const { commit, logln } = c;
  return {
    decommissionRack: (rackId) => commit((g) => {
      let hall;
      let rack;
      for (const h of g.halls) {
        rack = h.racks.find((r) => r.id === rackId);
        if (rack) {
          hall = h;
          break;
        }
      }
      if (!hall || !rack) return fail(`Rack '${rackId}' not found.`);
      if (rack.status === "ordered") return fail("This rack is still on order — nothing to sell yet.");
      if (rack.clusterId) return fail("Disband its cluster first.");
      const age = rackAgeMonths(rack, g.month);
      const pct = Math.round(residualFactor(g, rack) * 100);
      const sale = Math.round(rackResidualUSD(g, rack) * 0.85);
      g.cash += sale;
      hall.racks = hall.racks.filter((r) => r.id !== rackId);
      g.spotRacks = (g.spotRacks ?? []).filter((id) => id !== rackId);
      g.stats ??= { contractsCompleted: 0, peakAccels: 0, slaMisses: 0, revenueTotal: 0, decommissioned: 0 };
      g.stats.decommissioned++;
      logln(g, "info", `Decommissioned ${rack.id} at age ${age} months: sold for $${usd(sale)} at ${pct}% residual.`);
      return ok(`Rack sold for $${usd(sale)} (age ${age} months, ${pct}% residual).`);
    }),
    sellInventory: (itemId, qty) => commit((g) => {
      const item = getItem(itemId);
      if (!item) return fail(`Unknown item '${itemId}'.`);
      if (!Number.isFinite(qty) || Math.floor(qty) < 1) return fail("Quantity must be a positive number.");
      const n = Math.floor(qty);
      const have = g.inventory[itemId] ?? 0;
      if (have < n) return fail(`Only ${have} × ${item.name} in the warehouse.`);
      const sale = Math.round(0.6 * item.priceUSD * n);
      g.inventory[itemId] = have - n;
      if (g.inventory[itemId] <= 0) delete g.inventory[itemId];
      g.cash += sale;
      logln(g, "info", `Sold ${n} × ${item.name} from the warehouse for $${usd(sale)} (60% of catalog price).`);
      return ok(`Sold ${n} × ${item.name} for $${usd(sale)}.`);
    })
  };
};
const staffActions = (c) => {
  const { commit, logln } = c;
  return {
    hireStaff: (n) => commit((g) => {
      const count = Math.floor(n);
      if (!Number.isFinite(count) || count < 1 || count > 50) return fail("Hire between 1 and 50 staff at a time.");
      const cost = RECRUIT_COST_USD * count;
      if (g.cash < cost) return fail(`Recruiting ${count} costs $${usd(cost)} — you only have $${usd(g.cash)}.`);
      g.cash -= cost;
      g.staff += count;
      logln(g, "good", `Hired ${count} at $${usd(RECRUIT_COST_USD)} recruiting each; payroll is now $${usd(g.staff * STAFF_COST_PER_MONTH)}/month.`);
      return ok(`Hired ${count}.`);
    }),
    fireStaff: (n) => commit((g) => {
      const count = Math.floor(n);
      if (!Number.isFinite(count) || count < 1) return fail("Fire at least 1 staff member.");
      if (g.staff - count < 1) return fail(`Cannot go below 1 staff member (you have ${g.staff}).`);
      const severance = SEVERANCE_USD * count;
      if (g.cash < severance) return fail(`Severance for ${count} is $${usd(severance)} (2 months each) — you only have $${usd(g.cash)}.`);
      g.cash -= severance;
      g.staff -= count;
      logln(g, "info", `Let ${count} go with $${usd(severance)} severance; payroll is now $${usd(g.staff * STAFF_COST_PER_MONTH)}/month.`);
      return ok(`Fired ${count}.`);
    })
  };
};
const vendorsActions = (c) => {
  const { commit, logln } = c;
  return {
    signFramework: (vendorId, commitUSD, months) => commit((g) => {
      const vendor = VENDORS.find((v2) => v2.id === vendorId);
      if (!vendor) return fail(`Unknown vendor '${vendorId}'.`);
      if (!Number.isFinite(commitUSD) || commitUSD < FRAMEWORK_MIN_COMMIT_USD)
        return fail(`Commit at least $${usd(FRAMEWORK_MIN_COMMIT_USD)} of spend (you asked for $${usd(Number.isFinite(commitUSD) ? commitUSD : 0)}).`);
      if (!Number.isInteger(months) || months < FRAMEWORK_MIN_MONTHS || months > FRAMEWORK_MAX_MONTHS)
        return fail(`Term must be ${FRAMEWORK_MIN_MONTHS}-${FRAMEWORK_MAX_MONTHS} whole months.`);
      if (frameworkFor(g, vendorId)) return fail(`${vendor.name} already has an active framework — one at a time per vendor.`);
      const deposit = Math.round(commitUSD * FRAMEWORK_DEPOSIT_PCT);
      if (g.cash < deposit) return fail(`The signing deposit is $${usd(deposit)} (5% of commit); you have $${usd(g.cash)}.`);
      g.cash -= deposit;
      const fw = {
        id: `fw-${g.month}-${(g.frameworks?.length ?? 0) + 1}`,
        vendorId,
        commitUSD: Math.round(commitUSD),
        spentUSD: deposit,
        // the deposit counts toward the commitment
        discountPct: discountPctFor(commitUSD, months),
        startMonth: g.month,
        endMonth: g.month + months
      };
      (g.frameworks ??= []).push(fw);
      logln(g, "good", `Signed a ${months}-mo framework with ${vendor.name}: $${usd(fw.commitUSD)} committed for ${fw.discountPct}% off their parts (deposit $${usd(deposit)} credited toward the commit, runs to month ${fw.endMonth}).`);
      return ok(`Framework with ${vendor.name} signed: ${fw.discountPct}% off, $${usd(fw.commitUSD)} over ${months} months.`);
    }),
    cancelFramework: (frameworkId) => commit((g) => {
      const fws = g.frameworks ?? [];
      const i = fws.findIndex((f) => f.id === frameworkId);
      if (i < 0) return fail("Framework not found.");
      const fw = fws[i];
      const name = VENDORS.find((v2) => v2.id === fw.vendorId)?.name ?? fw.vendorId;
      const unmet = fw.commitUSD - fw.spentUSD;
      if (unmet > 0) {
        const penalty = Math.round(unmet * FRAMEWORK_CANCEL_PENALTY_PCT);
        if (g.cash < penalty) return fail(`Walking away costs $${usd(penalty)} (20% of the $${usd(unmet)} unmet commitment) but you only have $${usd(g.cash)}.`);
        g.cash -= penalty;
        adjustRel(g, fw.vendorId, FRAMEWORK_CANCEL_REL_HIT);
        fws.splice(i, 1);
        logln(g, "bad", `Cancelled the ${name} framework with $${usd(unmet)} of the commitment unmet: $${usd(penalty)} penalty paid and the relationship soured.`);
        return ok(`Cancelled ${name} framework for a $${usd(penalty)} penalty.`);
      }
      fws.splice(i, 1);
      logln(g, "info", `Closed out the ${name} framework — commitment fully spent, no penalty.`);
      return ok(`Cancelled ${name} framework: commitment met, nothing owed.`);
    })
  };
};
const policyActions = (c) => {
  const { commit, logln } = c;
  return {
    setPolicy: (burnInMonths, maintenance) => commit((g) => {
      if (!Number.isInteger(burnInMonths) || burnInMonths < 0 || burnInMonths > 3) return fail("Burn-in must be 0–3 months.");
      if (!Number.isInteger(maintenance) || maintenance < 0 || maintenance > 2) return fail("Maintenance level must be 0, 1 or 2.");
      g.policy = { burnInMonths, maintenance };
      logln(g, "info", `Policy: ${burnInMonths}-month burn-in, ${["reactive", "preventive", "premium"][maintenance]} maintenance ($${MAINT_COST_PER_RACK[maintenance]}/rack/mo). Applies to racks placed from now on and to future failures.`);
      return ok("Policy updated.");
    })
  };
};
const DOMAINS = {
  procure: procureActions,
  design: designActions,
  facility: facilityActions,
  deploy: deployActions,
  clusters: clustersActions,
  contracts: contractsActions,
  finance: financeActions,
  energy: energyActions,
  session: sessionActions,
  lifecycle: lifecycleActions,
  staff: staffActions,
  vendors: vendorsActions,
  policy: policyActions
};
const composeActions = (c) => Object.assign({}, ...Object.values(DOMAINS).map((f) => f(c)));
const selectCapexBasis = estimateCapexBasis;
const selectNetWorth = (g) => g.cash - g.debt + assetValue(g);
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
const useGame = createStore((set, get) => ({
  game: newGameState(0),
  ...composeActions(makeCtx(get, set))
}));
const st$3 = () => useGame.getState();
const G$2 = () => st$3().game;
function stable(v2) {
  if (v2 === null || typeof v2 !== "object") return JSON.stringify(v2);
  if (Array.isArray(v2)) return "[" + v2.map(stable).join(",") + "]";
  return "{" + Object.keys(v2).sort().map((k2) => JSON.stringify(k2) + ":" + stable(v2[k2])).join(",") + "}";
}
function hashState(g) {
  const s2 = stable(g);
  let h = 2166136261;
  for (let i = 0; i < s2.length; i++) {
    h ^= s2.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
function observe() {
  const g = G$2();
  const pnl = selectMonthlyPnL(g);
  const racks = g.halls.flatMap((h) => h.racks);
  const by = (f) => racks.reduce((m, r) => {
    const k2 = f(r);
    m[k2] = (m[k2] ?? 0) + 1;
    return m;
  }, {});
  return {
    month: g.month,
    year: +(2020 + g.month / 12).toFixed(2),
    cash: g.cash,
    debt: g.debt,
    netWorth: selectNetWorth(g),
    reputation: g.reputation,
    monthlyPnL: pnl,
    halls: g.halls.map((h) => ({ id: h.id, name: h.name, coolingClass: h.coolingClass, rackSlots: h.rackSlots, racks: h.racks.length, rackStatus: h.racks.reduce((m, r) => (m[r.status] = (m[r.status] ?? 0) + 1, m), {}), itPowerKW: h.itPowerKW, coolingKW: h.coolingKW, pue: h.pue, powerEquip: h.powerEquip, coolingEquip: h.coolingEquip })),
    rackStatus: by((r) => r.status),
    inventory: g.inventory,
    spares: g.spareStock ?? {},
    orders: g.orders.map((o2) => ({ itemId: o2.itemId, qty: o2.qty, arriveMonth: o2.arriveMonth, spare: !!o2.spare })),
    offers: g.availableContracts,
    active: g.activeContracts.map((a) => ({ id: a.contract.id, customer: a.contract.customer, clusterIds: a.clusterIds, monthsServed: a.monthsServed, slaMisses: a.slaMisses, deployBy: a.deployBy })),
    clusters: g.clusters.map((c) => ({ id: c.id, name: c.name, racks: c.rackIds.length, fabric: c.fabric, stats: c.stats })),
    projects: g.projects ?? [],
    powerContracts: g.powerContracts ?? [],
    powerOffers: g.powerOffers ?? [],
    uplinks: g.uplinks ?? {},
    spotPrice: g.spotPrice,
    log: g.log.slice(-10)
  };
}
function describe() {
  const o2 = observe();
  const f = (n) => Math.round(n).toLocaleString("en-US");
  return [
    `Month ${o2.month} (${o2.year}). Cash $${f(o2.cash)}, debt $${f(o2.debt)}, net worth $${f(o2.netWorth)}, reputation ${o2.reputation.toFixed(0)}.`,
    `Halls: ${o2.halls.map((h) => `${h.name}[${h.coolingClass}, ${h.racks}/${h.rackSlots} racks ${JSON.stringify(h.rackStatus)}]`).join("; ") || "none"}.`,
    `Orders in flight: ${o2.orders.length}. Inventory lines: ${Object.keys(o2.inventory).length}. Clusters: ${o2.clusters.length}.`,
    `Contracts: ${o2.active.length} active, ${o2.offers.length} on offer.`,
    `Recent log:
${o2.log.map((l) => ` - [${l.level}] ${l.text}`).join("\n")}`
  ].join("\n");
}
let scenario = null;
let t0 = 0;
let broke = 0;
function reset(opts = {}) {
  scenario = opts.scenario ?? null;
  const seed = opts.seed ?? scenario?.seed ?? 1;
  st$3().newGame(seed, opts.mode ?? "operator");
  scenario?.setup?.();
  t0 = G$2().month;
  broke = 0;
  return observe();
}
function step(a) {
  const before = selectNetWorth(G$2());
  const fn = st$3()[a.name];
  if (typeof fn !== "function") return { obs: observe(), reward: -0.01, done: false, truncated: false, info: { ok: false, message: "unknown action " + a.name, issues: [] } };
  const r = fn(...a.args ?? []);
  const res = r && typeof r === "object" && "ok" in r ? r : { ok: true, message: "" };
  let reward = res.ok ? 0 : -0.01;
  if (a.name === "nextMonth") {
    const g2 = G$2();
    reward += (selectNetWorth(g2) - before) / 1e6;
    broke = g2.cash < 0 ? broke + 1 : 0;
  }
  const g = G$2();
  const horizon = scenario?.horizonMonths ?? 120;
  const bankrupt = broke >= 2 || g.status === "bankrupt";
  const truncated = g.month - t0 >= horizon;
  if (bankrupt) reward -= 10;
  return { obs: observe(), reward, done: bankrupt, truncated: truncated || g.status === "finished", info: { ok: !!res.ok, message: res.message ?? "", issues: res.issues ?? [], ...bankrupt ? { terminalReason: "bankrupt (cash<0 for 2 months)" } : {} } };
}
function probe(a) {
  const snap = G$2();
  const fn = st$3()[a.name];
  try {
    const r = fn(...a.args ?? []);
    return !r || typeof r !== "object" || !("ok" in r) || !!r.ok;
  } catch {
    return false;
  } finally {
    useGame.setState({ game: snap });
  }
}
function legalActions(opts = {}) {
  const g = G$2();
  const out = [{ name: "nextMonth", desc: "Advance one month" }];
  const add = (a, desc) => {
    if (probe(a)) out.push({ ...a, desc });
  };
  add({ name: "takeLoan", args: [5e6] }, "Borrow $5M");
  add({ name: "takeLoan", args: [25e6] }, "Borrow $25M");
  for (const c of g.availableContracts) add({ name: "acceptContract", args: [c.id] }, `Accept contract ${c.id}`);
  for (const t of TEMPLATES) add({ name: "buyTemplate", args: [t.id, 1] }, `Order 1 rack of ${t.name}`);
  for (const a of g.activeContracts) for (const cl of g.clusters) if (!a.clusterIds.includes(cl.id)) add({ name: "assignContract", args: [a.contract.id, [cl.id]] }, `Serve ${a.contract.id} on ${cl.name}`);
  for (const a of g.activeContracts) if (a.clusterIds.length) out.push({ name: "unassignContract", args: [a.contract.id], desc: `Release ${a.contract.id}` });
  for (const cl of g.clusters) out.push({ name: "disbandCluster", args: [cl.id], desc: `Disband ${cl.name}` });
  if (opts.full) {
    for (const c of g.activeContracts) for (const t of TEMPLATES) add({ name: "startEasy", args: [c.contract.id, t.id, 4] }, `Auto-build ${c.contract.id} with ${t.name}`);
    for (const h of g.halls) for (const k2 of Object.keys(g.inventory)) {
      add({ name: "installPower", args: [h.id, k2, 1] }, `Install ${k2} power in ${h.name}`);
      add({ name: "installCooling", args: [h.id, k2, 1] }, `Install ${k2} cooling in ${h.name}`);
    }
  }
  return out;
}
const hash = () => hashState(G$2());
const state = () => JSON.parse(JSON.stringify(G$2()));
const st$2 = () => useGame.getState();
const patch = (f) => useGame.setState((s2) => {
  const g = JSON.parse(JSON.stringify(s2.game));
  f(g);
  return { game: g };
});
function plantUnit(kind, cls0) {
  const cls = cls0 === "rdhx" ? "air" : cls0;
  const cand = ALL_ITEMS.filter((i) => kind === "power" ? i.kind === "power" && i.powerType === "transformer" : i.kind === "cooling" && i.serves === cls && !["cold-plate-loop", "rdhx"].includes(i.coolingType)).map((i) => offerAt(i, st$2().game.month)).filter((o2) => o2.available);
  cand.sort((a, b) => a.unitPrice / (a.item.capacityKW || 1) - b.unitPrice / (b.item.capacityKW || 1));
  return cand[0];
}
const advance = (n) => {
  for (let i = 0; i < n; i++) st$2().nextMonth();
};
function stressFill(racksPerTemplate, hallsPerClass = 1) {
  const report = { halls: [], skipped: [] };
  const classes = ["air", "rdhx", "dlc", "immersion"];
  const hallOf = {};
  for (const c of classes) for (let k2 = 0; k2 < hallsPerClass; k2++) {
    const r = st$2().buildHall(`${c.toUpperCase()}-${k2 + 1}`, c, 200);
    if (r.ok) (hallOf[c] ??= []).push(st$2().game.halls[st$2().game.halls.length - 1].id);
  }
  const load = {};
  const plan = [];
  let rr = 0;
  for (const t of TEMPLATES) {
    const f = templateFacts(t);
    const cls = classes.find((c) => c === t.rack.cooling) ?? "air";
    const halls = hallOf[cls] ?? [];
    if (!halls.length) {
      report.skipped.push(t.id + ": no hall");
      continue;
    }
    const hall = halls[rr++ % halls.length];
    let n = racksPerTemplate, r = st$2().buyTemplate(t.id, n, false);
    while (!r.ok && n > 1 && /llocation/.test(r.message)) {
      n = Math.max(1, Math.floor(n / 2));
      r = st$2().buyTemplate(t.id, n, false);
    }
    if (!r.ok) {
      report.skipped.push(`${t.id}: ${r.message.slice(0, 90)}`);
      continue;
    }
    load[hall] = (load[hall] ?? 0) + f.kWPerRack * n;
    plan.push({ t, hall, n });
  }
  const bought = {};
  for (const [hallId, kw] of Object.entries(load)) {
    const h = st$2().game.halls.find((x) => x.id === hallId);
    for (const kind of ["power", "cooling"]) {
      const u = plantUnit(kind, h.coolingClass);
      if (!u) {
        report.skipped.push(`${hallId}: no ${kind} plant`);
        continue;
      }
      const n = Math.ceil(kw * 1.15 / (u.item.capacityKW || 1));
      const b = st$2().buy(u.item.id, n);
      if (!b.ok) report.skipped.push(`${hallId} ${kind}: ${b.message.slice(0, 80)}`);
      else (bought[hallId] ??= []).push({ id: u.item.id, n, kind });
    }
  }
  for (const { t, n } of plan) {
    const did = st$2().game.racks.find((r) => r.id.includes(t.id))?.id;
    if (!did) continue;
    for (const [id, c] of Object.entries(rackBom(st$2().game, did) ?? {})) {
      const need = c * n - (st$2().game.inventory[id] ?? 0);
      if (need > 0) {
        const b = st$2().buy(id, need);
        if (!b.ok) report.skipped.push(`${t.id} part ${id}: ${b.message.slice(0, 70)}`);
      }
    }
  }
  for (let i = 0; i < 16 && st$2().game.orders.length; i++) advance(1);
  for (const [hallId, list] of Object.entries(bought)) for (const p of list) {
    const ir = p.kind === "power" ? st$2().installPower(hallId, p.id, p.n) : st$2().installCooling(hallId, p.id, p.n);
    if (!ir.ok) report.skipped.push(`${hallId} install ${p.id}: ${ir.message.slice(0, 90)}`);
  }
  for (const { t, hall, n: cnt } of plan) {
    const designId = `rk-${t.id}`.length ? st$2().game.racks.find((r) => r.id.includes(t.id))?.id ?? "" : "";
    let placed2 = 0;
    if (designId) for (let i = 0; i < cnt; i++) {
      const r = st$2().placeRack(hall, designId);
      if (!r.ok) {
        report.skipped.push(`${t.id} place ${i}: ${r.message}`);
        break;
      }
      placed2++;
    }
    report[t.id] = placed2;
  }
  advance(6);
  report.halls = st$2().game.halls.map((h) => ({ id: h.id, class: h.coolingClass, racks: h.racks.length, kW: h.itPowerKW, coolKW: h.coolingKW, pue: h.pue }));
  return report;
}
const SCENARIOS = [
  { id: "classic", title: "Classic start (Jan 2020)", seed: 1, horizonMonths: 120, description: "Default $50M start; the baseline for comparing agents." },
  { id: "lean", title: "Lean start", seed: 2, horizonMonths: 120, description: "$8M cash: every dollar of capex and every contract choice matters.", setup: () => patch((g) => {
    g.cash = 8e6;
  }) },
  { id: "gold-rush-2025", title: "GPU gold rush (Jan 2025)", seed: 3, horizonMonths: 60, description: "Start in 2025 with $250M into Blackwell-era scarcity, high demand and allocation caps.", setup: () => patch((g) => {
    g.month = 60;
    g.cash = 25e7;
  }) },
  { id: "stress-all-racks", title: "Stress: every rack type deployed", seed: 4, horizonMonths: 24, description: "Sep-2026 start, effectively unlimited cash; four 200-slot halls (air/RDHx/DLC/immersion) pre-filled with every system template to test extremes of power, cooling, failures and fabric.", setup: () => {
    patch((g) => {
      g.month = 80;
      g.cash = 5e10;
    });
    stressFill(6);
  } },
  { id: "stress-campus", title: "Stress: multi-hall campus", seed: 5, horizonMonths: 24, description: "Eight halls (two per cooling class), 12 racks of every template each: a gigawatt-class campus for scaling limits.", setup: () => {
    patch((g) => {
      g.month = 80;
      g.cash = 2e11;
    });
    stressFill(12, 2);
  } }
];
const placed = (g) => g.halls.flatMap((h) => h.racks);
const onlineRackCount = (g) => g.halls.reduce((n, h) => n + h.racks.filter((r) => r.status === "online").length, 0);
const itPower = (g) => g.halls.reduce((n, h) => n + h.itPowerKW, 0);
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
  { id: "nvl", title: "Deploy a 72-GPU NVLink domain", go: "design", reward: 5e6, hint: "Build a GB200 NVL72 rack.", lesson: "NVLink-5 makes 72 GPUs act like one — critical for MoE expert parallelism and huge-model inference.", done: (g) => g.clusters.some((c) => (c.stats?.scaleUpDomain ?? 0) >= 72) },
  // ---------- long-form campaign objectives ----------
  { id: "kacc", title: "Field 1,000 accelerators", go: "network", reward: 2e6, hint: "Scale your clusters until a thousand accelerators have served at once.", lesson: "Past a thousand GPUs, fleet operations beat heroics: standardized racks, staged spares and disciplined commissioning keep utilization high.", done: (g) => (g.stats?.peakAccels ?? 0) >= 1e3 },
  { id: "accels5k", title: "Operate 5,000 accelerators", go: "network", reward: 8e6, hint: "Keep building — five thousand accelerators online across your campus.", lesson: "At 5k GPUs something is always broken: maintenance windows, spare depth and staff rotation ARE the product.", done: (g) => (g.stats?.peakAccels ?? 0) >= 5e3 },
  { id: "accels20k", title: "Run a 20,000-accelerator campus", go: "network", reward: 5e7, hint: "Twenty thousand accelerators at peak — a true AI factory.", lesson: "Campuses this big are limited by power and construction, not chips: substations, interconnects and build sequencing decide who ships first.", done: (g) => (g.stats?.peakAccels ?? 0) >= 2e4 },
  { id: "contracts5", title: "Complete five contracts", go: "contracts", reward: 3e6, hint: "Deliver contracts to completion — satisfied customers come back.", lesson: "Renewals are cheaper than acquisitions: every delivered contract compounds reputation and brings follow-on offers.", done: (g) => (g.stats?.contractsCompleted ?? 0) >= 5 },
  { id: "contracts15", title: "Complete fifteen contracts", go: "contracts", reward: 1e7, hint: "Build a book of repeat customers — fifteen delivered contracts.", lesson: "A contract book balanced across training and inference rides out demand cycles instead of chasing them.", done: (g) => (g.stats?.contractsCompleted ?? 0) >= 15 },
  { id: "nw100", title: "Reach a $100M net worth", go: "finance", reward: 2e6, hint: "Grow cash minus debt plus asset value to nine figures.", lesson: "Net worth = cash − debt + assets at residual value: only profitable months compound, borrowed scale does not.", done: (g) => netWorthOf(g) >= 1e8 },
  { id: "nw500", title: "Reach a $500M net worth", go: "finance", reward: 8e6, hint: "Compound profit until assets and cash pass half a billion.", lesson: "At this size cheap capital and cheap power dominate the P&L: refinance debt, hedge energy, keep PUE low.", done: (g) => netWorthOf(g) >= 5e8 },
  { id: "nw1b", title: "Become an AI-factory billionaire", go: "finance", reward: 25e6, hint: "Push net worth past one billion dollars.", lesson: "A billion in net worth comes from asset velocity: racks bought, filled, refreshed and sold before they obsolesce.", done: (g) => netWorthOf(g) >= 1e9 },
  { id: "hall2", title: "Build a second hall", go: "facility", reward: 2e6, hint: "Construct another hall — air and liquid fleets can be segmented.", lesson: "A second hall de-risks concentration and separates air from liquid cooling — but shells and utility queues take years, not months.", done: (g) => g.halls.length >= 2 },
  { id: "mw100", title: "Energize 100 MW of IT power", go: "facility", reward: 15e6, hint: "Install transformers until your halls can feed 100 MW of IT load.", lesson: "A 100 MW campus starts with grid interconnection studies and transformers ordered years ahead — power, not GPUs, is the long pole.", done: (g) => itPower(g) >= 1e5 },
  { id: "nplus1", title: "Reach N+1 power protection", go: "facility", reward: 3e6, hint: "One hall needs UPS + battery + transfer gear + two gensets that can parallel.", lesson: "N+1 means any single engine, battery string or chiller can fail with zero customer impact — that is what tier-III customers pay for.", done: (g) => g.halls.some((h) => hallResilience(h).tier === "N+1") },
  { id: "carriers2", title: "Diversify to two carriers", go: "network", reward: 2e6, hint: "Buy a second uplink from a different carrier on a diverse path.", lesson: "Two carriers on physically diverse routes turn a backhoe into a non-event; one circuit is an outage waiting for a shovel.", done: (g) => carrierCount(g) >= 2 },
  { id: "staffed", title: "Fully staff your operations", go: "finance", reward: 2e6, hint: "With racks online, hire until staffing meets the site need.", lesson: "Racks do not run themselves: understaffed sites fail more and repair slower — hire ahead of the fleet, not after it.", done: (g) => onlineRackCount(g) >= 1 && g.staff >= staffNeeded(g).needed },
  { id: "sellrack", title: "Sell your first obsolete rack", go: "stock", reward: 2e6, hint: "Decommission an aging, unclustered rack for its residual value.", lesson: "GPUs lose value to new generations faster than to wear — refresh on a cadence and sell while residual value is real.", done: (g) => (g.stats?.decommissioned ?? 0) >= 1 }
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
const randomAgent = (rng) => (_o, legal) => {
  const acts = legal().filter((a) => a.name !== "nextMonth");
  return acts.length ? [acts[Math.floor(rng() * acts.length)], { name: "nextMonth" }] : [{ name: "nextMonth" }];
};
const idleAgent = () => [{ name: "nextMonth" }];
function qualifyingBuilds(contractId) {
  const g = state();
  const c = g.availableContracts.find((x) => x.id === contractId) ?? g.activeContracts.find((a) => a.contract.id === contractId)?.contract;
  if (!c) return [];
  return buildOptions(g, c).filter((o2) => o2.fitsRamp && o2.hallGaps.every((x) => !x.startsWith("Cooling type"))).map((o2) => ({ templateId: o2.t.id, racks: o2.racks, cost: o2.cost })).sort((a, b) => a.cost - b.cost);
}
const operatorAgent = (o2) => {
  const out = [];
  const live = /* @__PURE__ */ new Set([...o2.active.map((a) => a.id), ...o2.projects.filter((p) => p.stage !== "done" && p.stage !== "failed").map((p) => p.contractId)]);
  if (live.size < 2 && o2.cash > 12e6) {
    for (const c of o2.offers) {
      for (const b of qualifyingBuilds(c.id).slice(0, 4)) {
        const a = { name: "startEasy", args: [c.id, b.templateId, b.racks] };
        if (b.cost < o2.cash * 0.6 && probe(a)) {
          out.push(a);
          live.add(c.id);
          break;
        }
      }
      if (live.size >= 2) break;
    }
  }
  const g = state();
  for (const h of g.halls) for (const r of h.racks) if (r.status === "online" && !r.clusterId && !(g.spotRacks ?? []).includes(r.id)) out.push({ name: "setSpotRack", args: [r.id, true] });
  for (const cl of g.clusters) if (!g.activeContracts.some((a) => a.clusterIds.includes(cl.id)) && !(g.spotClusters ?? []).includes(cl.id)) out.push({ name: "setSpot", args: [cl.id, true] });
  out.push({ name: "nextMonth" });
  return out;
};
const buyable = (month) => TEMPLATES.filter((t) => t.availableFrom * 12 - 2020 * 12 <= month && !(t.eolAfter && t.eolAfter * 12 - 2020 * 12 < month) && getItem(t.tray.chassisId) && offerAt(getItem(t.tray.chassisId), month).available);
function housekeeping(out, opts) {
  const g = state();
  const need = staffNeeded(g).needed;
  if (g.staff < need) {
    const a = { name: "hireStaff", args: [need - g.staff] };
    if (probe(a)) out.push(a);
  }
  if (opts.repay && g.debt > 0 && g.cash > g.debt * 2 + 5e6) out.push({ name: "repayLoan", args: [Math.min(g.debt, g.cash - 5e6)] });
  if (opts.sell) for (const h of g.halls) for (const r of h.racks) {
    if (!r.clusterId && r.status === "online" && residualFactor(g, r) < 0.3 && rackResidualUSD(g, r) > 0) {
      out.push({ name: "decommissionRack", args: [r.id] });
      break;
    }
  }
}
const tycoonAgent = (o2) => {
  const out = [];
  const g = state();
  if (o2.month % 3 === 0 && g.debt < 2e7) {
    const a = { name: "takeLoan", args: [2e7] };
    if (probe(a)) out.push(a);
  }
  const live = /* @__PURE__ */ new Set([...o2.active.map((a) => a.id), ...o2.projects.filter((p) => p.stage !== "done" && p.stage !== "failed").map((p) => p.contractId)]);
  if (live.size < 6 && o2.cash > 8e6) {
    for (const c of o2.offers) {
      if (live.size >= 6) break;
      for (const b of qualifyingBuilds(c.id).slice(0, 6)) {
        const a = { name: "startEasy", args: [c.id, b.templateId, b.racks] };
        if (probe(a)) {
          out.push(a);
          live.add(c.id);
          break;
        }
      }
    }
  }
  if (g.cash > 6e7 && !(g.frameworks ?? []).length) {
    const a = { name: "signFramework", args: ["nvidia", 1e7, 24] };
    if (probe(a)) out.push(a);
  }
  if (g.cash > 4e7 && g.policy?.maintenance !== 1) out.push({ name: "setPolicy", args: [2, 1] });
  housekeeping(out, { repay: true, sell: true });
  out.push({ name: "nextMonth" });
  return out;
};
const cautiousAgent = (o2) => {
  const out = [];
  const g = state();
  if (!g.policy || g.policy.maintenance !== 2) out.push({ name: "setPolicy", args: [3, 2] });
  const busy = o2.projects.some((p) => p.stage !== "done" && p.stage !== "failed") || o2.active.length >= 1;
  if (!busy && o2.cash > 15e6) {
    for (const c of o2.offers) {
      let done = false;
      for (const b of qualifyingBuilds(c.id).slice(0, 6)) {
        const a = { name: "startEasy", args: [c.id, b.templateId, b.racks] };
        if (probe(a)) {
          out.push(a);
          done = true;
          break;
        }
      }
      if (done) break;
    }
  }
  for (const h of g.halls) for (const r of h.racks) if (r.status === "online" && !r.clusterId && !(g.spotRacks ?? []).includes(r.id)) {
    out.push({ name: "setSpotRack", args: [r.id, true] });
    break;
  }
  housekeeping(out, { repay: true, sell: false });
  out.push({ name: "nextMonth" });
  return out;
};
const spotterAgent = (o2) => {
  const out = [];
  const g = state();
  if (o2.cash > 1e7 && g.orders.length < 3) {
    const t = buyable(o2.month).find((x) => probe({ name: "buyTemplate", args: [x.id, 1] }));
    if (t) out.push({ name: "buyTemplate", args: [t.id, 1] });
  }
  for (const h of g.halls) for (const r of h.racks) if (r.status === "online" && !(g.spotRacks ?? []).includes(r.id)) out.push({ name: "setSpotRack", args: [r.id, true] });
  for (const d of g.racks) {
    const a = { name: "placeRack", args: [g.halls[0].id, d.id] };
    if (probe(a)) {
      out.push(a);
      break;
    }
  }
  housekeeping(out, { repay: true, sell: true });
  out.push({ name: "nextMonth" });
  return out;
};
const PERSONAS = {
  idle: () => idleAgent,
  random: (seed) => randomAgent(mulberry32(seed)),
  operator: () => operatorAgent,
  tycoon: () => tycoonAgent,
  cautious: () => cautiousAgent,
  spotter: () => spotterAgent
};
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
  for (const o2 of g.orders) {
    const r = row(o2.itemId);
    r.onOrder += o2.qty;
    r.nextEta = Math.min(r.nextEta ?? 1e9, o2.arriveMonth);
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
  const free = availableFor(g, designId);
  const lines = Object.entries(bom).map(([id, per2]) => {
    const need = per2 * racks, have = free[id] ?? 0;
    const onOrder = g.orders.filter((o22) => o22.itemId === id && !o22.spare).reduce((n, o22) => n + o22.qty, 0);
    const it2 = getItem(id);
    const o2 = it2 ? offerAt(it2, g.month) : void 0;
    return { id, name: it2?.name ?? id, need, have, short: Math.max(0, need - have), onOrder, buyable: !!o2?.available, unitPrice: o2?.unitPrice ?? 0, leadMonths: o2?.leadMonths ?? 0, reason: o2?.reason };
  });
  Object.values(bom);
  const buildableNow = Math.min(...Object.entries(bom).map(([id, n]) => Math.floor((free[id] ?? 0) / n)));
  const toBuy = lines.filter((l) => l.short - l.onOrder > 0);
  const cost = toBuy.reduce((n, l) => {
    const q = l.short - l.onOrder;
    return n + Math.round(l.unitPrice * q * (1 - (it(l.id) ? volumeDiscount(it(l.id), q, l.unitPrice) : 0)));
  }, 0);
  const blocked = toBuy.filter((l) => !l.buyable);
  const eta = Math.max(0, ...lines.filter((l) => l.short > 0).map((l) => l.onOrder >= l.short ? Math.max(0, (g.orders.filter((o2) => o2.itemId === l.id).map((o2) => o2.arriveMonth).sort((a, b) => b - a)[0] ?? g.month) - g.month) : l.leadMonths));
  return { lines, buildableNow, complete: lines.every((l) => l.short === 0), toBuy, blocked, cost, etaMonths: eta };
}
const it = (id) => getItem(id);
function machineLedger(g) {
  const rows = [];
  const spot = /* @__PURE__ */ new Set([...g.spotClusters ?? []]), spotRacks = new Set(g.spotRacks ?? []);
  let n = 0;
  for (const h of g.halls) for (const r of h.racks) {
    n++;
    const d = g.racks.find((x) => x.id === r.designId);
    const st2 = d ? validateRack(d, g.trays, getItem).stats : void 0;
    const cl = r.clusterId ? g.clusters.find((c) => c.id === r.clusterId) : void 0;
    const ac = cl ? g.activeContracts.find((a) => a.clusterIds.includes(cl.id)) : void 0;
    let role = "unassigned";
    if (r.status !== "online") role = r.status === "failed" ? "failed — awaiting repair" : r.status;
    else if (ac) role = ac.contract.kind === "training" ? "training" : "serving";
    else if (cl && spot.has(cl.id) || spotRacks.has(r.id)) role = "spot market";
    else if (cl) role = "clustered, idle";
    rows.push({
      serial: `RK-${String(r.serial ?? n).padStart(4, "0")}`,
      id: r.id,
      hallId: h.id,
      hall: h.name,
      slot: r.slot,
      design: d?.name ?? r.designId,
      status: r.status,
      readyMonth: r.readyMonth,
      clusterId: cl?.id,
      cluster: cl?.name,
      role,
      customer: ac?.contract.customer,
      model: ac?.contract.model.name,
      accels: st2?.accels ?? 0,
      kW: st2?.kW ?? 0
    });
  }
  return rows;
}
const st$1 = () => useGame.getState();
const G$1 = () => st$1().game;
const ctxOf = (g) => {
  const placed2 = g.halls.flatMap((h) => h.racks);
  return { getRack: (id) => {
    const pid = placed2.find((p) => p.id === id)?.designId ?? id;
    return g.racks.find((r) => r.id === pid);
  }, getTray: (id) => g.trays.find((t) => t.id === id), getItem };
};
const tpl = (id) => TEMPLATES.find((t) => t.id === id);
const designQueries = {
  validateTray: (tray) => validateTray(tray, getItem),
  validateRack: (rack, trays) => validateRack(rack, trays ?? G$1().trays, getItem),
  validateHall: (hallId) => {
    const g = G$1();
    const hall = g.halls.find((h) => h.id === hallId);
    return validateHall(hall, hall.racks.map((p) => ({ design: g.racks.find((r) => r.id === p.designId), trays: g.trays })), getItem);
  },
  hallStats: (hallId) => {
    const g = G$1();
    const hall = g.halls.find((h) => h.id === hallId);
    const kw = hall.racks.reduce((n, p) => {
      const d = g.racks.find((r) => r.id === p.designId);
      return n + (d ? validateRack(d, g.trays, getItem).stats.kW : 0);
    }, 0);
    return { kw, pue: computePUE(hall, getItem), resilience: hallResilience(hall) };
  },
  rackStatsAll: () => {
    const g = G$1();
    return Object.fromEntries(g.racks.map((d) => [d.id, validateRack(d, g.trays, getItem).stats]));
  },
  partFitsSlot: (slot, itemId) => partFitsSlot(slot, getItem(itemId)),
  slotOptions: (chassisId, kind) => {
    const ch = getItem(chassisId);
    if (!ch) return [];
    const slot = ch.slots.find((s2) => s2.kind === kind);
    return ALL_ITEMS.filter((i) => partFitsSlot({ kind, accepts: slot?.accepts }, i)).map((i) => offerAt(i, G$1().month)).sort((a, b) => Number(b.available) - Number(a.available) || b.item.availableFrom - a.item.availableFrom);
  },
  traySizing: (design) => {
    const g = G$1();
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
  rackBom: (designId) => rackBom(G$1(), designId),
  rackReadiness: (designId, racks) => rackReadiness(G$1(), designId, racks ?? 1),
  failureRates: (designId) => rackRates(G$1(), designId),
  rackParts: (designId) => rackParts(G$1(), designId),
  spareQty: (id, qty) => spareQty(id, qty),
  spares: () => {
    const g = G$1();
    return { shelf: g.spareStock ?? {}, rec: Object.fromEntries(Object.keys(g.inventory).map((id) => [id, recommendedSpares(g, id)])) };
  },
  sparesView: () => {
    const g = G$1();
    const ids = /* @__PURE__ */ new Set();
    g.halls.forEach((h) => h.racks.forEach((p) => Object.keys(rackParts(g, p.designId)).forEach((id) => partClass(id) && ids.add(id))));
    const failed = g.halls.flatMap((h) => h.racks).filter((p) => p.status === "failed").map((p) => ({ id: p.id, part: p.failedPart ? getItem(p.failedPart)?.name ?? "" : "burn-in failure", readyMonth: p.readyMonth }));
    return { failed, rows: [...ids].map((id) => ({ id, name: getItem(id).name, label: PART_LABEL[partClass(id)], have: (g.spareStock?.[id] ?? 0) + g.orders.filter((o2) => o2.spare && o2.itemId === id).reduce((n, o2) => n + o2.qty, 0), adv: recommendedSpares(g, id) })) };
  }
};
const catalogQueries = {
  offer: (itemId) => {
    const it2 = getItem(itemId);
    return it2 ? offerAt(it2, G$1().month) : null;
  },
  offersAll: () => Object.fromEntries(ALL_ITEMS.map((i) => [i.id, offerAt(i, G$1().month)])),
  volumeDiscount: (itemId, n, unit) => volumeDiscount(getItem(itemId), n, unit),
  quote: (tid, racks) => quote(tpl(tid), racks, G$1().month),
  hallChecks: (tid, racks) => hallChecks(G$1(), tpl(tid), racks),
  templateFacts: (tid) => templateFacts(tpl(tid)),
  templatesAll: () => TEMPLATES.map((t) => ({ ...templateFacts(t), id: t.id, racksFor1: 1, quote1: quote(t, 1, G$1().month) })),
  templateBom: (tid, racks) => templateBom(tpl(tid), racks),
  racksFor: (tid, n) => racksFor(tpl(tid), n)
};
const facilityQueries = {
  ledger: () => ledger(G$1()),
  machineLedger: () => machineLedger(G$1()),
  floorQuote: (n) => ({ units: n, slots: n * FLOOR_UNIT_SLOTS, cost: n * FLOOR_UNIT_COST, months: floorCommissionMonths(n) }),
  resilience: (hallId) => hallResilience(G$1().halls.find((h) => h.id === hallId)),
  internet: () => {
    const g = G$1();
    return { have: uplinkGbps(g), need: totalNeedGbps(g), carriers: carrierCount(g), mrc: uplinkMonthlyUSD(g) };
  }
};
const contractsQueries = {
  contractNeed: (cid) => {
    const g = G$1();
    const c = g.availableContracts.find((x) => x.id === cid) ?? g.activeContracts.find((a) => a.contract.id === cid)?.contract;
    return c ? contractNeedGbps(c) : 0;
  },
  evaluateCluster: (cluster) => evaluateCluster(cluster, ctxOf(G$1())),
  clusterPerf: (cluster, modelId, ctxTokens = 4096) => {
    const g = G$1();
    const stats = evaluateCluster(cluster, ctxOf(g));
    const accel = getItem(stats.acceleratorId);
    const m = MODELS.find((x) => x.id === modelId);
    return { stats, train: accel ? trainingTokensPerSec(stats, accel, m) : null, infer: accel ? inferenceCapacity(stats, accel, m, { contextTokens: ctxTokens }) : null };
  },
  autoFabric: (rackIds, target) => autoFabric(G$1(), rackIds, target),
  contractFit: (cid) => {
    const g = G$1();
    const c = g.availableContracts.find((x) => x.id === cid) ?? g.activeContracts.find((a) => a.contract.id === cid)?.contract;
    return c ? contractFit(g, c) : null;
  },
  buildOptions: (cid, signedAt) => {
    const g = G$1();
    const c = g.availableContracts.find((x) => x.id === cid) ?? g.activeContracts.find((a) => a.contract.id === cid)?.contract;
    return c ? buildOptions(g, c, signedAt ?? void 0) : [];
  },
  pipeline: () => pipeline(G$1())
};
const economyQueries = {
  pnl: () => selectMonthlyPnL(G$1()),
  netWorth: () => selectNetWorth(G$1()),
  capexBasis: () => selectCapexBasis(G$1()),
  opex: () => monthlyOpex(G$1()),
  powerPreview: () => {
    const g = G$1();
    const o2 = monthlyOpex(g);
    const drawMW = o2.itPowerKW * o2.pue / 1e3;
    return { drawMW, opex: o2, settle: settlePower(g, drawMW, () => 0.5, () => {
    }), spotAnchor: spotAnchor(g.month), spotPrice: g.spotPrice ?? spotAnchor(g.month), spotUtil: spotUtilization(g.spotPrice ?? spotAnchor(g.month), g.month), hours: HOURS_PER_MONTH };
  },
  spotRevenue: () => {
    const g = G$1();
    return spotRevenue(g, new Set(g.activeContracts.flatMap((a) => a.clusterIds)), (d) => {
      const rd = g.racks.find((r) => r.id === d);
      return rd ? validateRack(rd, g.trays, getItem).stats.accels : 0;
    });
  },
  powerSources: () => POWER_SOURCES
};
const knowledgeQueries = {
  models: () => {
    const y = 2020 + G$1().month / 12;
    return { all: MODELS, tier: scaleOutTier(y), anchor: gpuHourAnchor(y) };
  },
  concepts: () => CONCEPTS.map((c) => ({ id: c.id, icon: c.icon, name: c.name, what: c.what, why: c.why, when: c.when, go: c.go, status: c.status(G$1()) })),
  missions: () => MISSIONS.map((m) => ({ id: m.id, title: m.title, hint: m.hint, lesson: m.lesson, reward: m.reward, go: m.go, done: m.done(G$1()) }))
};
const lifecycleQueries = {
  lifecycle: () => {
    const g = G$1();
    const rows = [];
    let n = 0;
    for (const hall of g.halls) {
      for (const r of hall.racks) {
        n++;
        const residualUSD = rackResidualUSD(g, r);
        const residualPct = Math.round(residualFactor(g, r) * 100);
        rows.push({
          id: r.id,
          serial: `RK-${String(r.serial ?? n).padStart(4, "0")}`,
          hallId: hall.id,
          hallName: hall.name,
          design: g.racks.find((x) => x.id === r.designId)?.name ?? r.designId,
          accelerator: rackAccelItem(g, r.designId)?.name ?? "",
          ageMonths: rackAgeMonths(r, g.month),
          residualPct,
          residualUSD,
          saleUSD: Math.round(residualUSD * 0.85),
          status: r.status,
          ...r.clusterId ? { clusterId: r.clusterId } : {},
          advice: residualPct >= 60 ? "keep" : residualPct >= 30 ? "consider selling" : "replace"
        });
      }
    }
    return {
      rows,
      totals: {
        racks: rows.length,
        residualUSD: rows.reduce((s2, r) => s2 + r.residualUSD, 0),
        saleUSD: rows.reduce((s2, r) => s2 + r.saleUSD, 0),
        assetValue: assetValue(g)
      }
    };
  }
};
const staffingQueries = {
  staffing: () => {
    const g = G$1();
    const { needed, breakdown } = staffNeeded(g);
    const { failureMult, repairExtraMonths } = staffEffect(g);
    return {
      have: g.staff,
      needed,
      breakdown,
      failureMult,
      repairExtraMonths,
      monthlyCostUSD: g.staff * STAFF_COST_PER_MONTH,
      hireCostUSD: RECRUIT_COST_USD,
      severanceUSD: SEVERANCE_USD
    };
  }
};
const sessionQueries = {
  saves: () => listSaves(),
  endReport: () => ({ status: G$1().status ?? "playing", report: G$1().endReport ?? null })
};
const rivalsQueries = {
  rivals: () => {
    const g = G$1();
    const rivals = g.rivals ?? [];
    const rivalAccels = rivals.reduce((n, r) => n + r.accels, 0);
    const mine = onlineAccels(g);
    const shareOf = (accels) => mine + rivalAccels > 0 ? accels / (mine + rivalAccels) * 100 : 0;
    const top = [...rivals].sort((a, b) => b.accels - a.accels)[0];
    return {
      rivals: rivals.map((r) => ({
        id: r.id,
        name: r.name,
        style: r.style,
        accels: Math.round(r.accels),
        priceMult: Math.round(r.priceMult * 100) / 100,
        sharePct: Math.round(shareOf(r.accels) * 10) / 10
      })),
      priceIndex: g.marketPriceIndex ?? 1,
      playerAccels: mine,
      playerSharePct: Math.round(shareOf(mine) * 10) / 10,
      headline: top ? `${top.name} runs ${Math.round(top.accels).toLocaleString("en-US")} accelerators at ${Math.round(top.priceMult * 100)}% of list pricing.` : "No rival operators tracked yet."
    };
  }
};
const vendorsQueries = {
  vendors: () => {
    const g = G$1();
    return VENDORS.filter((v2) => (g.vendorRel?.[v2.id] ?? 0) > 0 || (g.frameworks ?? []).some((f) => f.vendorId === v2.id)).map((v2) => {
      const fw = frameworkFor(g, v2.id);
      return {
        id: v2.id,
        name: v2.name,
        rel: g.vendorRel?.[v2.id] ?? 0,
        capMult: Math.round(capMultiplier(g, v2.id) * 100) / 100,
        relDiscountPct: Math.round(relDiscount(g, v2.id) * 1e3) / 10,
        framework: fw ? { id: fw.id, commitUSD: fw.commitUSD, spentUSD: fw.spentUSD, discountPct: fw.discountPct, endMonth: fw.endMonth } : null
      };
    });
  },
  frameworkQuote: (vendorId, commitUSD, months) => {
    const g = G$1();
    const invalid = (reason) => ({ discountPct: 0, depositUSD: 0, valid: false, reason });
    if (!VENDORS.some((v2) => v2.id === vendorId)) return invalid(`Unknown vendor '${vendorId}'.`);
    if (!Number.isFinite(commitUSD) || commitUSD < FRAMEWORK_MIN_COMMIT_USD) return invalid(`Commit at least $${FRAMEWORK_MIN_COMMIT_USD.toLocaleString("en-US")}.`);
    if (!Number.isInteger(months) || months < FRAMEWORK_MIN_MONTHS || months > FRAMEWORK_MAX_MONTHS)
      return invalid(`Term must be ${FRAMEWORK_MIN_MONTHS}-${FRAMEWORK_MAX_MONTHS} whole months.`);
    if (frameworkFor(g, vendorId)) return invalid("A framework with this vendor is already active.");
    const depositUSD = Math.round(commitUSD * FRAMEWORK_DEPOSIT_PCT);
    if (g.cash < depositUSD) return invalid(`Signing deposit $${depositUSD.toLocaleString("en-US")} exceeds cash on hand.`);
    return { discountPct: discountPctFor(commitUSD, months), depositUSD, valid: true, reason: "" };
  }
};
const previewQueries = {
  preview: () => {
    const g = G$1();
    const next = g.month + 1;
    const deliveries2 = g.orders.filter((o2) => o2.arriveMonth <= next).map((o2) => ({ item: getItem(o2.itemId)?.name ?? o2.itemId, qty: o2.qty, spare: !!o2.spare }));
    const racks = g.halls.flatMap((h) => h.racks);
    const commissioning2 = racks.filter((r) => r.status === "installing" && next >= r.readyMonth - 1).length;
    const online = racks.filter((r) => r.status === "commissioning" && next >= r.readyMonth).length;
    const repaired = racks.filter((r) => r.status === "failed" && next >= r.readyMonth).length;
    const floor = g.halls.flatMap((h) => (h.expansions ?? []).filter((e) => e.readyMonth <= next).map((e) => ({ hall: h.name, slots: e.units * 10 })));
    const walkAway = g.activeContracts.filter((a) => a.clusterIds.length === 0 && (a.deployBy ?? a.startMonth + 4) <= next).map((a) => a.contract.customer);
    const expiring = g.availableContracts.filter((c) => c.deadlineMonth <= g.month).map((c) => c.customer);
    const completing = g.activeContracts.filter((a) => a.clusterIds.length > 0 && a.monthsServed + 1 >= a.contract.durationMonths).map((a) => a.contract.customer);
    const pnl = selectMonthlyPnL(g);
    const cashDelta = pnl.revenue - pnl.opex - pnl.interest;
    const need = staffNeeded(g);
    const warnings = [];
    if (g.cash + cashDelta < 0) warnings.push(`Cash would go negative (${Math.round(g.cash + cashDelta).toLocaleString("en-US")}).`);
    if (walkAway.length) warnings.push(`${walkAway.join(", ")}: last month to bring capacity online or they walk.`);
    if (g.staff < need.needed) warnings.push(`Understaffed: ${g.staff}/${need.needed} operators.`);
    if (g.status && g.status !== "playing") warnings.push("Game over.");
    return {
      month: g.month,
      nextMonth: next,
      deliveries: deliveries2,
      racks: { commissioning: commissioning2, online, repaired },
      floor,
      walkAway,
      expiring,
      completing,
      revenue: Math.round(pnl.revenue),
      opex: Math.round(pnl.opex),
      interest: Math.round(pnl.interest),
      cashDelta: Math.round(cashDelta),
      cashAfter: Math.round(g.cash + cashDelta),
      runwayMonths: cashDelta < 0 ? Math.floor(g.cash / -cashDelta) : null,
      policy: policyOf(g),
      maintenanceUSD: Math.round(maintenanceUSD(g)),
      staff: { have: g.staff, needed: need.needed },
      warnings
    };
  }
};
const PARTS = { design: designQueries, catalog: catalogQueries, facility: facilityQueries, contracts: contractsQueries, economy: economyQueries, knowledge: knowledgeQueries, lifecycle: lifecycleQueries, staffing: staffingQueries, session: sessionQueries, rivals: rivalsQueries, vendors: vendorsQueries, preview: previewQueries };
const QUERIES = {};
for (const [domain, qs] of Object.entries(PARTS)) for (const [name, fn] of Object.entries(qs)) {
  if (name in QUERIES) throw new Error(`duplicate query '${name}' (domain ${domain})`);
  QUERIES[name] = fn;
}
const st = () => useGame.getState();
const G = () => st().game;
const INTERNAL = /* @__PURE__ */ new Set(["game", "patchProject", "addProject"]);
const ACTIONS = Object.keys(st()).filter((k2) => typeof st()[k2] === "function" && !INTERNAL.has(k2));
function snapshot() {
  const g = JSON.parse(JSON.stringify(G()));
  g.log = g.log.slice(-150);
  return g;
}
function init() {
  return {
    items: ALL_ITEMS,
    vendors: VENDORS,
    templates: TEMPLATES,
    models: MODELS,
    missions: MISSIONS.map((m) => ({ id: m.id, title: m.title, hint: m.hint, lesson: m.lesson, reward: m.reward, go: m.go })),
    concepts: CONCEPTS.map((c) => ({ id: c.id, icon: c.icon, name: c.name, what: c.what, why: c.why, when: c.when, go: c.go })),
    actions: ACTIONS
  };
}
function claim() {
  const done = [];
  for (const m of MISSIONS) {
    const g = G();
    if (g.missionsDone.includes(m.id) || !m.done(g)) continue;
    useGame.setState((s2) => ({ game: {
      ...s2.game,
      cash: s2.game.cash + m.reward,
      missionsDone: [...s2.game.missionsDone, m.id],
      log: [...s2.game.log, { month: s2.game.month, level: "good", text: `★ Mission complete: ${m.title} (+$${Math.round(m.reward).toLocaleString("en-US")}). ${m.lesson}` }]
    } }));
    done.push({ id: m.id, title: m.title, reward: m.reward });
    break;
  }
  return done;
}
function env(name, a) {
  const sc = (id) => id ? SCENARIOS.find((x) => x.id === id) : void 0;
  switch (name) {
    case "reset":
      return reset({ seed: a[0]?.seed, mode: a[0]?.mode, scenario: sc(a[0]?.scenario) });
    case "step":
      return step(a[0]);
    case "obs":
      return observe();
    case "text":
      return describe();
    case "actions":
      return legalActions(a[0] ?? {});
    case "hash":
      return hash();
    case "autoplay": {
      const agent = (PERSONAS[a[0] ?? "operator"] ?? PERSONAS.operator)(G().seed);
      for (let m = 0; m < (a[1] ?? 12); m++) {
        if (G().status && G().status !== "playing") break;
        for (const act of agent(observe(), () => legalActions())) step(act);
      }
      return observe();
    }
    case "scenarios":
      return SCENARIOS.map((x) => ({ id: x.id, title: x.title, description: x.description, horizonMonths: x.horizonMonths, seed: x.seed }));
    default:
      return void 0;
  }
}
function handle(req) {
  const base2 = { id: req.id };
  try {
    switch (req.fn) {
      case "init":
        return { ...base2, ok: true, result: init(), game: snapshot() };
      case "act": {
        if (!req.name || !ACTIONS.includes(req.name)) return { ...base2, ok: false, error: "unknown action " + req.name };
        const r = st()[req.name](...req.args ?? []);
        return { ...base2, ok: true, result: r ?? null, game: snapshot() };
      }
      case "q": {
        const f = req.name ? QUERIES[req.name] : void 0;
        return f ? { ...base2, ok: true, result: f(...req.args ?? []) } : { ...base2, ok: false, error: "unknown query " + req.name };
      }
      case "claim":
        return { ...base2, ok: true, result: claim(), game: snapshot() };
      case "env": {
        const r = env(req.name, req.args ?? []);
        return r === void 0 ? { ...base2, ok: false, error: "unknown env fn " + req.name } : { ...base2, ok: true, result: r, game: snapshot() };
      }
      case "ping":
        return { ...base2, ok: true, result: "pong" };
      default:
        return { ...base2, ok: false, error: "unknown fn" };
    }
  } catch (e) {
    return { ...base2, ok: false, error: String(e?.stack ?? e) };
  }
}
createInterface({ input: process.stdin }).on("line", (line) => {
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }
  process.stdout.write(JSON.stringify(handle(req)) + "\n");
});
