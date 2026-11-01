import { describe, it, expect } from 'vitest';
import { trainingMFU, trainingTokensPerSec, inferenceCapacity } from './perf';
import { getItem } from '../data';
import type { Accelerator, ClusterStats, ModelSpec } from '../types';

const h100 = getItem('nv-h100-sxm') as Accelerator;
const b200 = getItem('nv-b200-sxm') as Accelerator;
const l40s = getItem('nv-l40s') as Accelerator;
const mi300x = getItem('amd-mi300x') as Accelerator;

const model70 = (): ModelSpec => ({
  id: 'llama3-70b',
  name: 'Llama-3-70B',
  paramsB: 70,
  activeParamsB: 70,
  layers: 80,
  kvBytesPerToken: 262144,
  era: 2024,
});
const model30 = (): ModelSpec => ({
  id: 'm30',
  name: '30B dense',
  paramsB: 30,
  activeParamsB: 30,
  layers: 48,
  kvBytesPerToken: 131072,
  era: 2023.5,
});
const model405 = (): ModelSpec => ({
  id: 'llama3-405b',
  name: 'Llama-3-405B',
  paramsB: 405,
  activeParamsB: 405,
  layers: 126,
  kvBytesPerToken: 655360,
  era: 2024.5,
});

const makeStats = (o: Partial<ClusterStats> = {}): ClusterStats => ({
  accelerators: 512,
  acceleratorId: 'nv-h100-sxm',
  scaleUpDomain: 8,
  totalMemGB: 40960,
  peakPFLOPSFp8: 1013,
  peakPFLOPSBf16: 506,
  powerKW: 412,
  bisectionTbps: 204.8,
  effScaleOutGBs: 100,
  switchCounts: {},
  cableCounts: {},
  issues: [],
  ...o,
});

describe('trainingTokensPerSec / trainingMFU', () => {
  it('a good H100 cluster lands in the 30-55% MFU band', () => {
    const rail = { commOverlap: 0.65 };
    expect(trainingMFU(makeStats(), h100, model70(), rail)).toBeGreaterThanOrEqual(0.3);
    expect(trainingMFU(makeStats(), h100, model70(), rail)).toBeLessThanOrEqual(0.55);
    expect(trainingMFU(makeStats(), h100, model30())).toBeGreaterThanOrEqual(0.3);
    expect(trainingMFU(makeStats(), h100, model30())).toBeLessThanOrEqual(0.55);
  });

  it('matches its wrapper: trainingMFU === trainingTokensPerSec().mfu', () => {
    expect(trainingMFU(makeStats(), h100, model30())).toBe(trainingTokensPerSec(makeStats(), h100, model30()).mfu);
  });

  it('512 H100 serving ~400k train tokens/s on a 70B run', () => {
    const p = trainingTokensPerSec(makeStats(), h100, model70(), { commOverlap: 0.65 });
    expect(p.tokensPerSec).toBeGreaterThan(3e5);
    expect(p.tokensPerSec).toBeLessThan(6e5);
    expect(p.mfu).toBeGreaterThan(0);
  });

  it('starved scale-out bandwidth collapses MFU', () => {
    const mfu = trainingMFU(makeStats({ effScaleOutGBs: 5 }), h100, model70());
    expect(mfu).toBeLessThan(0.1);
    expect(trainingMFU(makeStats(), h100, model70())).toBeGreaterThan(mfu * 5);
  });

  it('flags ZeRO sharding when training state exceeds the scale-up domain', () => {
    const big = trainingTokensPerSec(makeStats(), h100, model70());
    const small = trainingTokensPerSec(makeStats(), h100, model30());
    expect(big.zeroAcrossDomains).toBe(true);
    expect(small.zeroAcrossDomains).toBe(false);
    expect(big.issues.some((i) => i.code === 'zero-across-domains')).toBe(true);
    expect(big.mfu).toBeLessThan(small.mfu);
  });

  it('errors when training state exceeds total cluster memory', () => {
    const p = trainingTokensPerSec(makeStats({ accelerators: 64, scaleUpDomain: 8, totalMemGB: 5120 }), h100, model405());
    expect(p.fitsTrainingState).toBe(false);
    expect(p.mfu).toBe(0);
    expect(p.issues.some((i) => i.code === 'state-does-not-fit' && i.severity === 'error')).toBe(true);
  });

  it('FP8 training yields more tokens/s than BF16 despite lower MFU', () => {
    const bf16 = trainingTokensPerSec(makeStats(), h100, model70(), { commOverlap: 0.65 });
    const fp8 = trainingTokensPerSec(makeStats(), h100, model70(), { commOverlap: 0.65, dtype: 'fp8' });
    expect(fp8.mfu).toBeLessThan(bf16.mfu);
    expect(fp8.tokensPerSec).toBeGreaterThan(bf16.tokensPerSec);
  });

  it('errors when there is no scale-out across domains', () => {
    const p = trainingTokensPerSec(makeStats({ effScaleOutGBs: 0 }), h100, model30());
    expect(p.tokensPerSec).toBe(0);
    expect(p.issues.some((i) => i.code === 'no-scale-out')).toBe(true);
  });
});

describe('inferenceCapacity', () => {
  const opts = { bytesPerParam: 1, contextTokens: 4096, tpotMs: 50 };

  it('B200 decisively beats H100 on decode throughput and batch headroom', () => {
    const h = inferenceCapacity(makeStats({ accelerators: 64, totalMemGB: 5120 }), h100, model70(), opts);
    const b = inferenceCapacity(
      makeStats({ accelerators: 64, acceleratorId: 'nv-b200-sxm', scaleUpDomain: 72, totalMemGB: 11520, effScaleOutGBs: 200 }),
      b200,
      model70(),
      opts,
    );
    expect(h.stepMs).toBeLessThanOrEqual(50);
    expect(b.stepMs).toBeLessThanOrEqual(50);
    expect(b.tokensPerSec).toBeGreaterThan(h.tokensPerSec);
    expect(b.tokensPerSec / h.tokensPerSec).toBeGreaterThan(3);
    expect(b.maxBatchKV).toBeGreaterThan(10 * h.maxBatchKV);
    expect(h.perUserTokensPerSec).toBeGreaterThan(20);
    expect(b.ttftMs).toBeLessThan(1000);
  });

  it('uses tensor parallelism inside the scale-up domain to fit weights', () => {
    const bf16 = inferenceCapacity(makeStats({ accelerators: 64, totalMemGB: 5120 }), h100, model70(), { ...opts, bytesPerParam: 2 });
    expect(bf16.tpSize).toBe(2);
    expect(bf16.fitsWeights).toBe(true);
    expect(bf16.stepMs).toBeLessThanOrEqual(50);
  });

  it('errors when weights cannot fit the whole domain even with TP', () => {
    const p = inferenceCapacity(makeStats({ accelerators: 64, totalMemGB: 5120 }), h100, model405(), { bytesPerParam: 2 });
    expect(p.fitsWeights).toBe(false);
    expect(p.issues.some((i) => i.code === 'weights-exceed-domain' && i.severity === 'error')).toBe(true);
  });

  it('KV-cache memory limits the achievable batch', () => {
    const p = inferenceCapacity(makeStats({ accelerators: 64, totalMemGB: 5120 }), h100, model70(), { ...opts, contextTokens: 32768 });
    expect(p.maxBatchKV).toBeLessThan(8);
  });

  it('PCIe tensor parallelism is heavily penalized vs HBM scale-up fabrics', () => {
    const pcie = inferenceCapacity(makeStats({ accelerators: 64, acceleratorId: 'nv-l40s', scaleUpDomain: 2, totalMemGB: 3072, effScaleOutGBs: 10 }), l40s, model30(), { bytesPerParam: 2, contextTokens: 4096 });
    const hbm = inferenceCapacity(makeStats({ accelerators: 64, acceleratorId: 'amd-mi300x', scaleUpDomain: 8, totalMemGB: 12288, effScaleOutGBs: 50 }), mi300x, model30(), { bytesPerParam: 2, contextTokens: 4096 });
    expect(pcie.tpSize).toBe(2);
    expect(hbm.tpSize).toBe(1);
    expect(pcie.tokensPerSec).toBeLessThan(hbm.tokensPerSec / 5);
  });

  it('flags infeasible TPOT targets', () => {
    const p = inferenceCapacity(makeStats({ accelerators: 64, totalMemGB: 5120 }), h100, model70(), { ...opts, tpotMs: 5 });
    expect(p.issues.some((i) => i.code === 'tpot-infeasible' && i.severity === 'error')).toBe(true);
  });
});
