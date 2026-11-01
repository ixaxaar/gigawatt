import { describe, it, expect } from 'vitest';
import { MODELS, generateContracts, gpuHourAnchor, mtokPrice } from './market';
import { mulberry32 } from './rng';
import type { GameState, InferenceContract, TrainingContract } from '../types';

const makeState = (o: Partial<GameState> = {}): GameState => ({
  month: 0,
  seed: 1,
  cash: 0,
  debt: 0,
  reputation: 50,
  halls: [],
  trays: [],
  racks: [],
  clusters: [],
  inventory: {},
  orders: [],
  availableContracts: [],
  activeContracts: [],
  log: [],
  staff: 0,
  utilityUSDPerKWh: 0.08,
  codexSeen: [],
  missionsDone: [],
  history: [],
  ...o,
});

const monthsFor = (year: number) => Math.round((year - 2020) * 12);

describe('MODELS', () => {
  it('covers real models across the 2020-2028 era with unique ids', () => {
    const ids = MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(MODELS.length).toBeGreaterThanOrEqual(20);
    for (const m of MODELS) {
      expect(m.era).toBeGreaterThanOrEqual(2020);
      expect(m.era).toBeLessThanOrEqual(2028);
      expect(m.paramsB).toBeGreaterThan(0);
      expect(m.activeParamsB).toBeLessThanOrEqual(m.paramsB);
      expect(m.layers).toBeGreaterThan(0);
      expect(m.kvBytesPerToken).toBeGreaterThan(0);
    }
  });

  it('includes the canonical era-defining models', () => {
    const names = MODELS.map((m) => m.name).join('|');
    expect(names).toContain('GPT-3 175B');
    expect(names).toContain('Llama 2 70B');
    expect(names).toContain('Llama 3 70B');
    expect(names).toContain('Llama 3.1 405B');
    expect(names).toContain('Llama 4 Maverick');
    expect(names).toContain('DeepSeek-V3 671B MoE');
  });

  it('MoE models activate a fraction of parameters', () => {
    const v3 = MODELS.find((m) => m.id === 'deepseek-v3')!;
    expect(v3.activeParamsB).toBeLessThan(v3.paramsB / 10);
    const dense = MODELS.find((m) => m.id === 'llama2-70b')!;
    expect(dense.activeParamsB).toBe(dense.paramsB);
  });
});

describe('pricing curves', () => {
  it('H100-era accelerator-hours sit at $2-3 and decay within the generation', () => {
    expect(gpuHourAnchor(2023.5)).toBeGreaterThanOrEqual(2.5);
    expect(gpuHourAnchor(2023.5)).toBeLessThanOrEqual(3.0);
    expect(gpuHourAnchor(2024.0)).toBeLessThan(gpuHourAnchor(2023.2));
    expect(gpuHourAnchor(2025.5)).toBeLessThan(gpuHourAnchor(2024.6));
    expect(gpuHourAnchor(2020.5)).toBeLessThan(2.0);
  });

  it('per-MTok prices track real API history', () => {
    expect(mtokPrice(175, 2020)).toBeGreaterThan(30);
    expect(mtokPrice(175, 2020)).toBeLessThan(90);
    expect(mtokPrice(70, 2024)).toBeGreaterThanOrEqual(2);
    expect(mtokPrice(70, 2024)).toBeLessThanOrEqual(8);
    expect(mtokPrice(37, 2025)).toBeGreaterThanOrEqual(0.5);
    expect(mtokPrice(37, 2025)).toBeLessThanOrEqual(3);
    expect(mtokPrice(70, 2025)).toBeLessThan(mtokPrice(70, 2024));
  });
});

describe('generateContracts', () => {
  it('is deterministic for the same seed', () => {
    const s = makeState();
    const a = generateContracts(s, 50, mulberry32(42));
    const b = generateContracts(s, 50, mulberry32(42));
    expect(a).toEqual(b);
  });

  it('returns 1-3 contracts per month', () => {
    const s = makeState();
    for (let seed = 0; seed < 50; seed++) {
      const out = generateContracts(s, 40, mulberry32(seed));
      expect(out.length).toBeGreaterThanOrEqual(1);
      expect(out.length).toBeLessThanOrEqual(3);
    }
  });

  it('only offers era-appropriate models', () => {
    const s = makeState();
    for (let seed = 0; seed < 20; seed++) {
      for (const c of generateContracts(s, 0, mulberry32(seed))) {
        expect(c.model.era).toBeLessThanOrEqual(2020.01);
        expect(c.model.id).toBe('gpt2-xl');
      }
      for (const c of generateContracts(s, 12, mulberry32(seed))) {
        expect(c.model.name).not.toContain('Llama');
        expect(c.model.era).toBeLessThanOrEqual(2021.01);
      }
    }
  });

  it('2028 contracts reference frontier models only', () => {
    const s = makeState();
    for (let seed = 0; seed < 20; seed++) {
      for (const c of generateContracts(s, monthsFor(2028), mulberry32(seed))) {
        expect(c.model.era).toBeGreaterThan(2025);
      }
    }
  });

  it('training contracts are structurally coherent', () => {
    const s = makeState();
    const trainings: TrainingContract[] = [];
    for (let m = 24; m < 96; m += 2) {
      for (let seed = 0; seed < 6; seed++) {
        trainings.push(
          ...generateContracts(s, m, mulberry32(seed * 31 + m)).filter((c): c is TrainingContract => c.kind === 'training'),
        );
      }
    }
    expect(trainings.length).toBeGreaterThan(20);
    for (const c of trainings) {
      expect(c.minAccelerators).toBeGreaterThanOrEqual(32);
      expect(c.minTotalMemGB).toBeGreaterThanOrEqual(16 * c.model.paramsB);
      expect(c.minScaleUpDomain).toBeLessThanOrEqual(c.minAccelerators);
      expect(c.minScaleOutGBsPerAccel).toBeGreaterThanOrEqual(4.4);
      expect(c.durationMonths).toBeGreaterThanOrEqual(2);
      expect(c.deadlineMonth).toBeGreaterThan(Number(c.id.split('-')[1]));
      expect(c.slaAvailability).toBeGreaterThanOrEqual(0.9);
      expect(c.slaAvailability).toBeLessThanOrEqual(1);
      expect(c.penaltyRate).toBeGreaterThan(0);
      if (c.model.activeParamsB < c.model.paramsB * 0.8) {
        expect(c.minScaleUpDomain).toBeGreaterThanOrEqual(16);
      }
    }
  });

  it('inference contracts are structurally coherent', () => {
    const s = makeState();
    const infs: InferenceContract[] = [];
    for (let m = 36; m < 108; m += 3) {
      for (let seed = 0; seed < 6; seed++) {
        infs.push(
          ...generateContracts(s, m, mulberry32(seed * 17 + m)).filter((c): c is InferenceContract => c.kind === 'inference'),
        );
      }
    }
    expect(infs.length).toBeGreaterThan(20);
    for (const c of infs) {
      expect(c.tokensPerSec).toBeGreaterThan(0);
      expect(c.tpotMs).toBeGreaterThanOrEqual(15);
      expect(c.ttftMs).toBeGreaterThan(0);
      expect(c.contextTokens).toBeGreaterThan(0);
      expect(c.pricePerMTok).toBeGreaterThan(0);
      expect(c.durationMonths).toBeGreaterThanOrEqual(3);
    }
  });

  it('H100-era training prices fall in the $2-3.5 band', () => {
    const s = makeState();
    const prices: number[] = [];
    for (let m = monthsFor(2023.4); m <= monthsFor(2024.3); m += 2) {
      for (let seed = 0; seed < 8; seed++) {
        for (const c of generateContracts(s, m, mulberry32(seed + m))) {
          if (c.kind === 'training') prices.push(c.pricePerAccelHour);
        }
      }
    }
    expect(prices.length).toBeGreaterThan(10);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    expect(avg).toBeGreaterThanOrEqual(2.0);
    expect(avg).toBeLessThanOrEqual(3.5);
    for (const p of prices) {
      expect(p).toBeGreaterThan(1.5);
      expect(p).toBeLessThan(4.2);
    }
  });

  it('2024 inference pricing for 70B-class models is in a sane $/MTok band', () => {
    const s = makeState();
    const prices: number[] = [];
    for (let seed = 0; seed < 40; seed++) {
      for (const c of generateContracts(s, monthsFor(2024.6), mulberry32(seed))) {
        if (c.kind === 'inference' && c.model.paramsB >= 50 && c.model.paramsB <= 250) prices.push(c.pricePerMTok);
      }
    }
    expect(prices.length).toBeGreaterThan(5);
    for (const p of prices) {
      expect(p).toBeGreaterThanOrEqual(0.5);
      expect(p).toBeLessThanOrEqual(15);
    }
  });

  it('demand scales with era: 2026 token asks dwarf 2021 asks', () => {
    const s = makeState();
    const maxTps = (year: number) => {
      let mx = 0;
      for (let seed = 0; seed < 40; seed++) {
        for (const c of generateContracts(s, monthsFor(year), mulberry32(seed))) {
          if (c.kind === 'inference') mx = Math.max(mx, c.tokensPerSec);
        }
      }
      return mx;
    };
    expect(maxTps(2026)).toBeGreaterThan(maxTps(2021) * 50);
  });

  it('reputation gates the sovereign archetype', () => {
    const low = makeState({ reputation: 0 });
    for (let m = 0; m < 120; m += 2) {
      for (let seed = 0; seed < 5; seed++) {
        for (const c of generateContracts(low, m, mulberry32(seed + m))) {
          expect(c.archetype).not.toBe('sovereign');
          expect(c.archetype).not.toBe('enterprise');
        }
      }
    }
    let sawSovereign = false;
    const high = makeState({ reputation: 90 });
    for (let m = 24; m < 120 && !sawSovereign; m += 2) {
      for (let seed = 0; seed < 10 && !sawSovereign; seed++) {
        sawSovereign = generateContracts(high, m, mulberry32(seed + m)).some((c) => c.archetype === 'sovereign');
      }
    }
    expect(sawSovereign).toBe(true);
  });
});
