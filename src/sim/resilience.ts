import { getItem } from '../data';
import type { HallState, PowerEquip } from '../types';

export interface Resilience {
  /** 0..1 — probability-weighted share of utility outages the hall rides through. */
  score: number;
  tier: 'none' | 'basic' | 'N' | 'N+1';
  ups: boolean; backup: boolean; transfer: boolean;
  upsKW: number; gensetKW: number; batteryKW: number; gensetCount: number; feedB: boolean;
  gaps: string[];
}

const pe = (id: string) => { const i = getItem(id); return i && i.kind === 'power' ? (i as PowerEquip) : undefined; };

/** How well a hall survives a utility outage, from installed power plant. */
export function hallResilience(hall: HallState): Resilience {
  let upsKW = 0, gensetKW = 0, batteryKW = 0, transferKW = 0, gensetCount = 0, flywheelKW = 0, feedB = false, parallel = false;
  for (const [id, n] of Object.entries(hall.powerEquip)) {
    const e = pe(id); if (!e || n <= 0) continue;
    if (/feed-b/.test(id)) feedB = true;
    if (/paralleling/.test(id)) parallel = true;
    if (e.powerType === 'ups') { upsKW += e.capacityKW * n; if (/rotary|flywheel/.test(id)) flywheelKW += e.capacityKW * n; }
    else if (e.powerType === 'battery') batteryKW += e.capacityKW * n;
    else if (e.powerType === 'genset' || e.powerType === 'gas-turbine') { gensetKW += e.capacityKW * n; gensetCount += n; }
    else if (e.powerType === 'switchgear' && /ats|sts|paralleling/.test(id)) transferKW += e.capacityKW * n;
  }
  const load = Math.max(1, hall.itPowerKW);
  const ups = upsKW >= load * 0.9 && (batteryKW > 0 || flywheelKW >= load * 0.9);       // needs inverter AND stored energy
  const backup = gensetKW >= load * 1.0;
  const transfer = transferKW >= load * 0.9;
  const gaps: string[] = [];
  if (!ups) gaps.push(upsKW < load * 0.9 ? 'UPS capacity below IT load' : 'UPS has no battery string');
  if (!backup) gaps.push(gensetKW <= 0 ? 'no generator: outages longer than battery ride-through take you down' : 'generator smaller than IT load');
  if (!transfer) gaps.push('no automatic transfer switch (ATS/STS or paralleling gear) to move load to the generator');
  let score = (ups ? 0.55 : 0) + (backup ? 0.25 : 0) + (transfer ? 0.12 : 0);
  // N+1 needs an extra engine (and paralleling gear to share the bus) or an oversized UPS
  const n1 = (gensetCount >= 2 && gensetKW - gensetKW / gensetCount >= load && (parallel || gensetCount < 2)) || upsKW >= load * 1.8;
  if (ups && backup && transfer && n1) score = 1; else if (ups && backup && transfer) score = 0.92;
  if (feedB && score > 0) score = Math.min(1, score + 0.08);
  const tier = score >= 1 ? 'N+1' : score >= 0.9 ? 'N' : score >= 0.5 ? 'basic' : 'none';
  return { score, tier, ups, backup, transfer, upsKW, gensetKW, batteryKW, gensetCount, feedB, gaps };
}
