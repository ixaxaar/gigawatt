import type { Accelerator, ClusterStats, DataType, ModelSpec, ValidationIssue } from '../types';

export interface TrainingOptions {
  localBatch?: number;
  dtype?: DataType;
  commOverlap?: number;
}

export interface TrainingPerf {
  mfu: number;
  tokensPerSec: number;
  stepMs: number;
  zeroAcrossDomains: boolean;
  fitsTrainingState: boolean;
  issues: ValidationIssue[];
}

export interface InferenceOptions {
  bytesPerParam?: number;
  contextTokens?: number;
  tpotMs?: number;
}

export interface InferencePerf {
  tpSize: number;
  replicas: number;
  fitsWeights: boolean;
  maxBatchKV: number;
  batch: number;
  stepMs: number;
  perUserTokensPerSec: number;
  tokensPerSec: number;
  ttftMs: number;
  issues: ValidationIssue[];
}

const TRAIN_CEILING = 0.62;
const STRAGGLER = 1.15;
const PREFILL_MFU = 0.5;
const FP8_UTIL = 0.75;
const GB = 1e9;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export const peakAt = (a: Accelerator, d?: DataType): number => {
  if (d && a.tflops[d]) return a.tflops[d] as number;
  return a.tflops.bf16 ?? a.tflops.fp16 ?? a.tflops.tf32 ?? Math.max(0, ...Object.values(a.tflops));
};

const domainOf = (stats: ClusterStats, n: number) => clamp(Math.round(stats.scaleUpDomain) || 1, 1, n);

export function trainingTokensPerSec(
  stats: ClusterStats,
  accel: Accelerator,
  model: ModelSpec,
  opts: TrainingOptions = {},
): TrainingPerf {
  const issues: ValidationIssue[] = [];
  const N = Math.max(1, Math.round(stats.accelerators));
  const d = domainOf(stats, N);
  const D = Math.max(1, Math.ceil(N / d));
  const peak = peakAt(accel, opts.dtype);
  const Pa = model.activeParamsB;
  const B = Math.max(1, opts.localBatch ?? 32);

  if (peak <= 0) {
    issues.push({ severity: 'error', code: 'no-peak', message: `${accel.id} has no TFLOPS for the requested datatype.` });
    return { mfu: 0, tokensPerSec: 0, stepMs: 0, zeroAcrossDomains: false, fitsTrainingState: false, issues };
  }

  const tC = (6 * Pa * GB * B) / (peak * 1e12);
  const G = (2 * Pa) / N;
  const tSu = d > 1 ? (2 * G * (d - 1)) / d / Math.max(accel.scaleUpGBs * 0.5, 1e-6) : 0;
  const Bso = Math.max(stats.effScaleOutGBs * 0.5, 1e-4);
  let tSo = D > 1 ? (2 * G * (D - 1)) / D / Bso : 0;

  if (D > 1 && stats.effScaleOutGBs <= 0) {
    issues.push({
      severity: 'error',
      code: 'no-scale-out',
      message: `Training across ${D} domains needs scale-out bandwidth; the cluster has none.`,
    });
    return { mfu: 0, tokensPerSec: 0, stepMs: 0, zeroAcrossDomains: false, fitsTrainingState: false, issues };
  }

  const stateGB = 16 * model.paramsB;
  let zeroAcrossDomains = false;
  let fitsTrainingState = true;
  if (stateGB > N * accel.memGB) {
    fitsTrainingState = false;
    issues.push({
      severity: 'error',
      code: 'state-does-not-fit',
      message: `Training state (~${stateGB} GB for ${model.name}) exceeds cluster memory ${N * accel.memGB} GB.`,
      learn: accel.id,
    });
    return { mfu: 0, tokensPerSec: 0, stepMs: 0, zeroAcrossDomains, fitsTrainingState, issues };
  }
  if (stateGB > d * accel.memGB) {
    zeroAcrossDomains = true;
    tSo *= 3;
    issues.push({
      severity: 'warn',
      code: 'zero-across-domains',
      message: `Training state (~${stateGB} GB) exceeds one ${d}-accelerator domain (${d * accel.memGB} GB): ZeRO sharding over scale-out triples gradient traffic.`,
      learn: accel.id,
    });
  }

  const overlap = clamp(opts.commOverlap ?? 0.5, 0, 0.9);
  const stepSec = tC + (tSu + tSo) * (1 - overlap) * STRAGGLER;
  const mfu = clamp((tC / stepSec) * TRAIN_CEILING * accel.softwareMaturity * accel.trainingAffinity, 0.005, 0.65);
  const tokensPerSec = (N * peak * 1e12 * mfu) / (6 * Pa * GB);
  return {
    mfu,
    tokensPerSec,
    stepMs: stepSec * 1000,
    zeroAcrossDomains,
    fitsTrainingState,
    issues,
  };
}

export function trainingMFU(
  stats: ClusterStats,
  accel: Accelerator,
  model: ModelSpec,
  opts: TrainingOptions = {},
): number {
  return trainingTokensPerSec(stats, accel, model, opts).mfu;
}

export function inferenceCapacity(
  stats: ClusterStats,
  accel: Accelerator,
  model: ModelSpec,
  opts: InferenceOptions = {},
): InferencePerf {
  const issues: ValidationIssue[] = [];
  const N = Math.max(1, Math.round(stats.accelerators));
  const d = domainOf(stats, N);
  const bpp = Math.max(0.125, opts.bytesPerParam ?? 1);
  const ctxT = Math.max(1, opts.contextTokens ?? 4096);
  const weightsGB = model.paramsB * bpp;
  const activeGB = model.activeParamsB * bpp;
  const kvPerSeqGB = (model.kvBytesPerToken * ctxT) / GB;

  let tp = 1;
  while (tp * 2 <= d && tp * accel.memGB < weightsGB * 1.1) tp *= 2;
  let fitsWeights = tp * accel.memGB >= weightsGB * 1.1;
  if (!fitsWeights && d * accel.memGB >= weightsGB * 1.02) {
    tp = d;
    fitsWeights = true;
  } else if (!fitsWeights) {
    tp = d;
    issues.push({
      severity: 'error',
      code: 'weights-exceed-domain',
      message: `Weights (${weightsGB} GB) plus overhead do not fit a ${d}-accelerator scale-up domain (${d * accel.memGB} GB); tensor parallelism cannot shard them.`,
      learn: accel.id,
    });
  }

  const replicas = Math.floor(N / tp);
  if (replicas < 1) {
    issues.push({ severity: 'error', code: 'no-replica', message: 'Fewer accelerators than one tensor-parallel replica.' });
  }

  const kvAvailGB = tp * accel.memGB - weightsGB * 1.05;
  const maxBatchKV = Math.max(0, Math.floor(kvAvailGB / Math.max(kvPerSeqGB, 1e-9)));
  if (maxBatchKV < 1) {
    issues.push({
      severity: 'error',
      code: 'kv-no-room',
      message: `No memory left for KV cache: weights + runtime use ${weightsGB * 1.05} GB of ${tp * accel.memGB} GB per replica.`,
      learn: accel.id,
    });
  }

  let tpEff = 1;
  if (tp > 1) {
    if (accel.scaleUp === 'pcie' || accel.scaleUp === 'none') tpEff = 0.35;
    else if (accel.scaleUp === 'wafer') tpEff = 0.9;
    else tpEff = 0.85;
  }
  if (!fitsWeights) tpEff *= 0.3;
  const readBW = Math.max(tp * accel.memBWTBs * 1000 * tpEff, 1e-6);

  let batch = Math.max(1, maxBatchKV);
  if (opts.tpotMs !== undefined) {
    const budgetBytes = (opts.tpotMs / 1000) * readBW * GB;
    const batchTpot = Math.floor((budgetBytes - activeGB * GB) / (model.kvBytesPerToken * ctxT));
    if (batchTpot < 1) {
      issues.push({
        severity: 'error',
        code: 'tpot-infeasible',
        message: `Cannot meet ${opts.tpotMs} ms per-token latency: even batch 1 decode exceeds it.`,
      });
    } else {
      batch = Math.min(batch, batchTpot);
    }
  }

  const stepSec = (activeGB + batch * kvPerSeqGB) / readBW;
  const perUserTokensPerSec = 1 / stepSec;
  const tokensPerSec =
    replicas * batch * perUserTokensPerSec * accel.softwareMaturity * Math.min(accel.inferenceAffinity, 1.3);

  const prefillFlops = 2 * model.activeParamsB * GB * ctxT;
  const pfPeak = (accel.tflops.fp8 ?? peakAt(accel)) * 1e12 * FP8_UTIL;
  const ttftMs = (prefillFlops / (tp * pfPeak * PREFILL_MFU * accel.softwareMaturity)) * 1000;

  return {
    tpSize: tp,
    replicas,
    fitsWeights,
    maxBatchKV,
    batch,
    stepMs: stepSec * 1000,
    perUserTokensPerSec,
    tokensPerSec,
    ttftMs,
    issues,
  };
}
