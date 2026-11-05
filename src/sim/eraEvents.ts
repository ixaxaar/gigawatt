// Era events: fixed calendar beats every game hits (2023–2026 GPU history)
// plus rare disasters that extend the random-event pool. Deterministic —
// scripted events draw no randomness; disasters only use the rng passed in,
// and only when the picked entry actually fires.
import { getItem } from '../data';
import type { GameState } from '../types';
import { hallResilience } from './resilience';
import type { RNG } from './rng';

type Log = (level: 'info' | 'good' | 'bad', text: string) => void;

/** Fires exactly once when s.month equals the scripted value. Mutates `s`. */
export function scriptedEvents(s: GameState, log: Log): void {
  if (s.month === 38) {
    let units = 0;
    for (const o of s.orders) {
      if (getItem(o.itemId)?.kind === 'accelerator' && o.arriveMonth > s.month) { o.arriveMonth += 2; units += o.qty; }
    }
    log('bad', `📦 Mar 2023 — ChatGPT went viral and every buyer on earth wants GPUs: allocation is slashed and ${units} accelerator(s) already in the pipeline slip 2 months. Lesson: lead times quoted in a soft market are fiction in a hot one — order ahead and hold spares.`);
  } else if (s.month === 52) {
    log('info', '💧 Apr 2024 — the Blackwell generation makes liquid cooling mainstream: GB200 NVL72 racks (~120 kW) cannot be air-cooled at all. Lesson: plan the DLC transition early — CDUs, coolant quality and floor plumbing have lead times of their own.');
  } else if (s.month === 74) {
    log('info', '🧲 Feb 2026 — NVIDIA opens Rubin allocation and existing AI-factory operators get first call. Lesson: vendors reward demonstrated deployments — a campus that ships on schedule is your ticket to the next generation.');
  }
}

/** Rare disasters for the random-event pool. An entry is added only when its
 *  precondition holds; firing it mutates `s` and logs a real lesson. */
export function disasterPool(s: GameState, rng: RNG, log: Log): Array<() => void> {
  const pool: Array<() => void> = [];
  const live = s.halls.filter((h) => h.racks.some((r) => r.status === 'online'));

  // Fire: burns one online rack; suppression or a hardened power chain contains it.
  if (live.length) pool.push(() => {
    const hall = live[Math.floor(rng() * live.length)];
    const online = hall.racks.filter((r) => r.status === 'online');
    const rack = online[Math.floor(rng() * online.length)];
    const contained = Object.keys(hall.coolingEquip).some((id) => id.includes('suppression')) || hallResilience(hall).score >= 0.9;
    const down = contained ? 2 : 8;
    rack.status = 'failed';
    rack.readyMonth = s.month + down;
    rack.failedPart = undefined; // fire damage is a rebuild, not a spare swap
    if (!contained) s.reputation = Math.max(0, s.reputation - 3);
    log(contained ? 'info' : 'bad', `🔥 Fire in ${hall.name}: rack ${rack.id} ${contained ? 'saved by early smoke detection and clean-agent suppression' : 'destroyed'} — ${down} months to rebuild${contained ? '.' : ' and −3 reputation.'} Lesson: ${contained ? 'detection plus suppression turns a total loss into a bad weekend.' : 'smoke detection and clean-agent suppression cost pennies next to a hall of GPUs.'}`);
  });

  // Customer default: an assigned contract dies and takes a month of revenue with it.
  const assigned = s.activeContracts.filter((a) => a.clusterIds.length > 0);
  if (assigned.length) pool.push(() => {
    const a = assigned[Math.floor(rng() * assigned.length)];
    const c = a.contract;
    const monthly = c.kind === 'training'
      ? c.pricePerAccelHour * c.minAccelerators * 730
      : (c.pricePerMTok * c.tokensPerSec * 730 * 3600) / 1e6;
    s.activeContracts = s.activeContracts.filter((x) => x !== a);
    s.cash -= Math.round(monthly);
    s.reputation = Math.max(0, s.reputation - 1);
    log('bad', `💸 ${c.customer} defaults on its ${c.kind} contract: the cluster goes idle and ~$${Math.round(monthly).toLocaleString('en-US')} of a month's expected revenue never lands (−1 reputation). Lesson: deposits, take-or-pay minimums and credit checks exist because customers go bankrupt mid-deal.`);
  });

  // Supply-chain shock: everything in transit slips.
  if (s.orders.length) pool.push(() => {
    const n = s.orders.length;
    for (const o of s.orders) o.arriveMonth += 2;
    log('bad', `🚢 Supply-chain shock — a substrate shortage closes a fab and a port strike strands containers: all ${n} in-transit order(s) slip 2 months. Lesson: dual-sourcing and safety stock are insurance, not waste.`);
  });

  // Cooling-plant fault: one chiller trip misses SLAs across the serving book.
  if (live.length) pool.push(() => {
    const hall = live[Math.floor(rng() * live.length)];
    const racks = hall.racks.filter((r) => r.status === 'online').length;
    s.activeContracts.forEach((a) => { if (a.clusterIds.length) a.slaMisses += 1; });
    s.cash -= 40_000 * racks;
    log('bad', `❄ Chiller trip in ${hall.name}: a compressor fault drops the loop for hours and every serving contract takes an SLA miss; emergency pumping and overtime cost $${((40_000 * racks) / 1000).toFixed(0)}k. Lesson: N+1 chillers with automatic switchover keep the water cold while one unit is repaired.`);
  });

  return pool;
}
