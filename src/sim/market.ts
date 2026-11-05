import { monthToYear } from '../types';
import type { Contract, GameState, InferenceContract, ModelSpec, TrainingContract } from '../types';
import { pick, randInt, randRange, type RNG } from './rng';

// Real models 2020-2028, best-known public specs (params in billions).
// kvBytesPerToken = 2 (K+V) * kvHeads * headDim * bytes * layers, or MLA
// compressed-cache estimate (~1152 B/token/layer) for DeepSeek-style MoE.
export const MODELS: ModelSpec[] = [
  { id: 'gpt2-xl', name: 'GPT-2 1.5B', paramsB: 1.5, activeParamsB: 1.5, layers: 48, kvBytesPerToken: 196608, era: 2020.0 },
  { id: 'gpt3-175b', name: 'GPT-3 175B', paramsB: 175, activeParamsB: 175, layers: 96, kvBytesPerToken: 4718592, era: 2020.3 },
  { id: 'gptj-6b', name: 'GPT-J 6B', paramsB: 6, activeParamsB: 6, layers: 28, kvBytesPerToken: 28672, era: 2021.5 },
  { id: 'mtnlg-530b', name: 'Megatron-Turing NLG 530B', paramsB: 530, activeParamsB: 530, layers: 105, kvBytesPerToken: 8601600, era: 2022.0 },
  { id: 'chinchilla-70b', name: 'Chinchilla 70B', paramsB: 70, activeParamsB: 70, layers: 80, kvBytesPerToken: 2621440, era: 2022.25 },
  { id: 'palm-540b', name: 'PaLM 540B', paramsB: 540, activeParamsB: 540, layers: 118, kvBytesPerToken: 2895872, era: 2022.3 },
  { id: 'gpt35-turbo', name: 'GPT-3.5 Turbo', paramsB: 175, activeParamsB: 175, layers: 96, kvBytesPerToken: 393216, era: 2022.9 },
  { id: 'llama-65b', name: 'LLaMA 65B', paramsB: 65, activeParamsB: 65, layers: 80, kvBytesPerToken: 2621440, era: 2023.1 },
  { id: 'gpt4', name: 'GPT-4', paramsB: 1800, activeParamsB: 280, layers: 120, kvBytesPerToken: 491520, era: 2023.2 },
  { id: 'llama2-70b', name: 'Llama 2 70B', paramsB: 70, activeParamsB: 70, layers: 80, kvBytesPerToken: 327680, era: 2023.55 },
  { id: 'mistral-7b', name: 'Mistral 7B', paramsB: 7, activeParamsB: 7, layers: 32, kvBytesPerToken: 131072, era: 2023.75 },
  { id: 'mixtral-8x7b', name: 'Mixtral 8x7B MoE', paramsB: 46.7, activeParamsB: 12.9, layers: 32, kvBytesPerToken: 131072, era: 2023.9 },
  { id: 'grok-1', name: 'Grok-1 314B MoE', paramsB: 314, activeParamsB: 80, layers: 64, kvBytesPerToken: 262144, era: 2024.25 },
  { id: 'llama3-70b', name: 'Llama 3 70B', paramsB: 70, activeParamsB: 70, layers: 80, kvBytesPerToken: 327680, era: 2024.3 },
  { id: 'gpt4o', name: 'GPT-4o', paramsB: 200, activeParamsB: 200, layers: 88, kvBytesPerToken: 360448, era: 2024.45 },
  { id: 'llama31-405b', name: 'Llama 3.1 405B', paramsB: 405, activeParamsB: 405, layers: 126, kvBytesPerToken: 516096, era: 2024.6 },
  { id: 'deepseek-v3', name: 'DeepSeek-V3 671B MoE', paramsB: 671, activeParamsB: 37, layers: 61, kvBytesPerToken: 70272, era: 2024.95 },
  { id: 'deepseek-r1', name: 'DeepSeek-R1 671B MoE', paramsB: 671, activeParamsB: 37, layers: 61, kvBytesPerToken: 70272, era: 2025.05 },
  { id: 'grok-3', name: 'Grok-3', paramsB: 400, activeParamsB: 50, layers: 80, kvBytesPerToken: 327680, era: 2025.15 },
  { id: 'llama4-maverick', name: 'Llama 4 Maverick 400B MoE', paramsB: 400, activeParamsB: 17, layers: 128, kvBytesPerToken: 524288, era: 2025.3 },
  { id: 'qwen3-235b', name: 'Qwen3 235B-A22B MoE', paramsB: 235, activeParamsB: 22, layers: 94, kvBytesPerToken: 192512, era: 2025.35 },
  { id: 'kimi-k2', name: 'Kimi K2 1T MoE', paramsB: 1000, activeParamsB: 32, layers: 61, kvBytesPerToken: 70272, era: 2025.45 },
  { id: 'glm45', name: 'GLM-4.5 355B MoE', paramsB: 355, activeParamsB: 32, layers: 92, kvBytesPerToken: 376832, era: 2025.55 },
  { id: 'gpt5', name: 'GPT-5', paramsB: 900, activeParamsB: 120, layers: 120, kvBytesPerToken: 491520, era: 2025.65 },
  { id: 'llama5', name: 'Llama 5', paramsB: 1600, activeParamsB: 80, layers: 140, kvBytesPerToken: 161280, era: 2026.4 },
  { id: 'deepseek-v4', name: 'DeepSeek-V4 MoE', paramsB: 700, activeParamsB: 40, layers: 64, kvBytesPerToken: 73728, era: 2026.6 },
  { id: 'gemini3-ultra', name: 'Gemini 3 Ultra', paramsB: 2500, activeParamsB: 90, layers: 160, kvBytesPerToken: 655360, era: 2026.9 },
  { id: 'gpt6', name: 'GPT-6', paramsB: 3000, activeParamsB: 150, layers: 180, kvBytesPerToken: 737280, era: 2027.4 },
  { id: 'frontier-stargate', name: 'Stargate-class frontier run', paramsB: 8000, activeParamsB: 250, layers: 220, kvBytesPerToken: 905216, era: 2028.0 },
];

type Archetype = TrainingContract['archetype'];

const CUSTOMERS: Record<Archetype, string[]> = {
  startup: ['Stealth Labs', 'Glyph AI', 'Peregrine Models', 'Otter Systems', 'VectorForge'],
  lab: ['MIT LIDS', 'Flatiron Institute', 'CERN OpenLab', 'RIKEN AICS', 'Turing Institute'],
  enterprise: ['Acme Retail Media', 'Helios Bank', 'Nordwind Auto', 'MedSyn Pharma', 'Skyline Telecom'],
  sovereign: ['EU Sovereign Cloud', 'Emirates AI Council', 'Nippon AI Grid', 'Sovereign Tech Fund'],
};

const lerpCurve = (points: [number, number][], x: number): number => {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
};

// Reference $/accelerator-hour for a top-of-generation GPU. New generations
// launch at a premium (~$3) then decay; the H100 era sits around $2.5-3.
const GPU_HOUR_ANCHOR: [number, number][] = [
  [2020, 1.9], [2021, 1.75], [2022, 1.6], [2023.2, 2.9], [2024, 2.6], [2024.6, 3.0],
  [2025, 2.8], [2026, 2.6], [2026.8, 3.4], [2027, 3.2], [2028, 3.0],
];
export const gpuHourAnchor = (year: number): number => lerpCurve(GPU_HOUR_ANCHOR, year);

// USD per million output tokens, calibrated to real API prices:
// GPT-3 175B (2020) ~$60/Mtok, 70B-class (2024) ~$5, DeepSeek-class (2025) ~$1-2.
const MTOK_DECAY: [number, number][] = [
  [2020, 1], [2021, 0.75], [2022, 0.55], [2023, 0.4], [2024, 0.175],
  [2025, 0.115], [2026, 0.07], [2027, 0.05], [2028, 0.035],
];
export const mtokPrice = (activeParamsB: number, year: number): number =>
  0.96 * Math.pow(Math.max(1, activeParamsB), 0.8) * lerpCurve(MTOK_DECAY, year);

const ERA_MEM_GB: [number, number][] = [
  [2020, 40], [2022, 80], [2023.7, 141], [2024.8, 192], [2026.2, 288], [2027, 384], [2028, 384],
];
const ERA_SCALEOUT_GBPS: [number, number][] = [[2020, 6], [2022, 12.5], [2023.5, 25], [2024.5, 50], [2026, 100], [2027, 200], [2028, 200]];
const ERA_TOKENS_PER_SEC: [number, number][] = [
  [2020, 3e3], [2021, 2e4], [2022, 1e5], [2023, 5e5], [2024, 3e6],
  [2025, 2e7], [2026, 8e7], [2027, 2e8], [2028, 5e8],
];

const ACCEL_BUCKETS = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
const bucket = (n: number): number => ACCEL_BUCKETS.find((b) => b >= n) ?? ACCEL_BUCKETS[ACCEL_BUCKETS.length - 1];

const CONTEXT_OPTIONS: [number, number[]][] = [
  [2022, [1024, 2048]],
  [2024, [2048, 4096, 8192]],
  [2026, [8192, 32768, 65536]],
  [2029, [32768, 131072, 262144]],
];

const round2 = (x: number) => Math.round(x * 100) / 100;
const round3 = (x: number) => Math.round(x * 1000) / 1000;

const ARCHETYPE_TABLE: Record<Archetype, {
  minRep: number; weight: number; accelMult: number; tokenMult: number; priceMult: number;
  trainDur: [number, number]; inferDur: [number, number]; sla: number; penalty: [number, number];
}> = {
  startup:    { minRep: 0,  weight: 0.38, accelMult: 1,   tokenMult: 0.25, priceMult: 0.9,  trainDur: [2, 6],   inferDur: [3, 9],   sla: 0.95,  penalty: [0.004, 0.008] },
  lab:        { minRep: 20, weight: 0.30, accelMult: 1,   tokenMult: 0.6,  priceMult: 1.0,  trainDur: [4, 10],  inferDur: [6, 12],  sla: 0.97,  penalty: [0.005, 0.01] },
  enterprise: { minRep: 45, weight: 0.22, accelMult: 2,   tokenMult: 1.0,  priceMult: 1.1,  trainDur: [6, 18],  inferDur: [12, 24], sla: 0.98,  penalty: [0.008, 0.015] },
  sovereign:  { minRep: 70, weight: 0.10, accelMult: 4,   tokenMult: 2.5,  priceMult: 1.15, trainDur: [12, 36], inferDur: [24, 48], sla: 0.995, penalty: [0.01, 0.02] },
};

function rollArchetype(rng: RNG, reputation: number): Archetype {
  const eligible = (Object.keys(ARCHETYPE_TABLE) as Archetype[])
    .map((a) => ({ a, t: ARCHETYPE_TABLE[a] }))
    .filter(({ t }) => reputation >= t.minRep);
  const total = eligible.reduce((s, e) => s + e.t.weight, 0);
  let r = rng() * total;
  for (const e of eligible) {
    r -= e.t.weight;
    if (r <= 0) return e.a;
  }
  return eligible[0].a;
}

export function generateContracts(state: GameState, month: number, rng: RNG): Contract[] {
  const year = monthToYear(month);
  const eligible = MODELS.filter((m) => m.era <= year + 0.01);
  if (eligible.length === 0) return [];
  const out: Contract[] = [];
  const n = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const model = pick(rng, rng() < 0.6 ? eligible.slice(-4) : eligible.slice(-8));
    const trainP = model.paramsB > 200 ? 0.7 : model.paramsB < 15 ? 0.12 : 0.4;
    const archetype = rollArchetype(rng, state.reputation);
    const t = ARCHETYPE_TABLE[archetype];
    const suffix = String(1000 + Math.floor(rng() * 9000));
    const common = {
      customer: pick(rng, CUSTOMERS[archetype]),
      archetype,
      model,
      durationMonths: 0,
      penaltyRate: round3(randRange(rng, t.penalty[0], t.penalty[1])),
      deadlineMonth: month + randInt(rng, 2, 6),
      slaAvailability: Math.min(0.999, Math.max(0.9, t.sla + randRange(rng, -0.005, 0.005))),
    };
    if (rng() < trainP) {
      const stateGB = 16 * model.paramsB;
      const memPerAccel = lerpCurve(ERA_MEM_GB, year);
      const raw = (stateGB / memPerAccel) * randRange(rng, 2, 4.5) * t.accelMult;
      const minAccelerators = Math.min(32768, Math.max(32, bucket(Math.ceil(raw))));
      const isMoe = model.activeParamsB < model.paramsB * 0.8;
      const moeDomain = year >= 2027 ? 128 : year >= 2025.5 ? 64 : year >= 2024 ? 32 : 16;
      const minScaleUpDomain = Math.min(
        minAccelerators,
        isMoe ? moeDomain : year >= 2025 ? 16 : 8,
      );
      const tier = lerpCurve(ERA_SCALEOUT_GBPS, year);
      const contract: TrainingContract = {
        kind: 'training',
        id: `trn-${month}-${i}-${suffix}`,
        ...common,
        durationMonths: randInt(rng, t.trainDur[0], t.trainDur[1]),
        minAccelerators,
        minScaleUpDomain,
        minScaleOutGBsPerAccel: round2(model.paramsB < 15 ? tier * 0.75 : tier),
        minTotalMemGB: Math.ceil(stateGB),
        pricePerAccelHour: round2(
          gpuHourAnchor(year)
          * (model.paramsB >= 300 ? 1.15 : isMoe ? 0.95 : 1)
          * t.priceMult
          * randRange(rng, 0.92, 1.15)
          * (state.marketPriceIndex ?? 1), // rival competition reprices fresh offers
        ),
      };
      contract.rampMonths = Math.min(20, 6 + Math.round(Math.log2(minAccelerators / 32) * 1.6) + (year >= 2024 ? 1 : 0));
      out.push(contract);
    } else {
      const tps = Math.max(
        100,
        Math.round(lerpCurve(ERA_TOKENS_PER_SEC, year) * t.tokenMult * randRange(rng, 0.6, 1.8)),
      );
      const tpotMs = Math.round(randRange(rng, 20, 60) + (model.activeParamsB > 80 ? randRange(rng, 10, 40) : 0));
      const ctxOpts = CONTEXT_OPTIONS.find(([y]) => year < y)?.[1] ?? [262144];
      const contract: InferenceContract = {
        kind: 'inference',
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
            mtokPrice(model.activeParamsB, year)
            * (tpotMs < 30 ? 1.25 : 1)
            * t.priceMult
            * randRange(rng, 0.9, 1.2)
            * (state.marketPriceIndex ?? 1), // rival competition reprices fresh offers
          ),
        ),
      };
      contract.rampMonths = randInt(rng, 5, 8);
      out.push(contract);
    }
  }
  return out;
}

/** GB/s of scale-out bandwidth per accelerator that training customers expect in a given year. */
export const scaleOutTier = (year: number): number => lerpCurve(ERA_SCALEOUT_GBPS, year);
