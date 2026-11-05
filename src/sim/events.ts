import type { GameState } from '../types';
import { generateContracts } from './market';
import type { RNG } from './rng';
import { hallResilience } from './resilience';
import { carrierCount } from './internet';
import { disasterPool, scriptedEvents } from './eraEvents';

type Log = (level: 'info' | 'good' | 'bad', text: string) => void;
export const BASE_POWER_PRICE = 0.07;
const onlineRacks = (s: GameState) => s.halls.flatMap((h) => h.racks).filter((r) => r.status === 'online').length;

/** Random world events. Mutates `s`. Each event teaches a real datacenter lesson. */
export function rollEvents(s: GameState, rng: RNG, log: Log, graceMonths = 4): void {
  // Power price mean-reverts toward baseline every month.
  s.utilityUSDPerKWh = Math.round((s.utilityUSDPerKWh + (BASE_POWER_PRICE - s.utilityUSDPerKWh) * 0.05) * 10000) / 10000;
  scriptedEvents(s, log); // calendar beats fire in every month, grace period or not
  if (s.month < 11 + graceMonths) return;
  if (rng() > 0.28) return; // ~1 event every 3-4 months

  const racks = onlineRacks(s);
  const year = 2020 + s.month / 12;
  const pool: Array<() => void> = [];

  pool.push(() => {
    s.utilityUSDPerKWh = Math.min(0.2, Math.round(s.utilityUSDPerKWh * 1.3 * 10000) / 10000);
    log('bad', `⚡ Energy crisis: utility rate jumps to $${s.utilityUSDPerKWh.toFixed(3)}/kWh. Lesson: power is the biggest opex line — long-term PPAs, on-site solar/gas and a lower PUE are how real operators hedge.`);
  });
  // Grants reward operators who actually host capacity; an empty hall earns nothing (idle play must not profit).
  if (racks > 0) pool.push(() => {
    const cut = Math.round(1e6 + rng() * 2e6);
    s.cash += cut;
    log('good', `🏛 Sovereign-AI grant: a regional government pays +$${(cut / 1e6).toFixed(1)}M to bring GPU capacity on-shore. Governments are now a real customer class.`);
  });
  pool.push(() => {
    const extra = generateContracts(s, s.month, rng).filter((c) => c.kind === 'inference').slice(0, 2);
    extra.forEach((c) => { if (c.kind === 'inference') c.pricePerMTok = Math.round(c.pricePerMTok * 1.25 * 100) / 100; });
    s.availableContracts = [...s.availableContracts, ...extra];
    log('good', `🚀 A viral model launch floods the market with inference demand${extra.length ? `: ${extra.length} premium (+25%) serving offers posted` : ''}. Memory-bandwidth-rich GPUs earn the most per watt on decode.`);
  });
  if (year >= 2021) pool.push(() => {
    const bill = Math.round(25_000 * Math.max(1, racks));
    s.cash -= bill;
    log('bad', `🌡 Heatwave: dry-coolers derate in hot ambient air; extra chiller/pump energy costs $${(bill / 1000).toFixed(0)}k. Lesson: warm-water DLC tolerates hot days — air-cooled halls suffer first.`);
  });
  if (racks > 0 && s.uplinks) {
    pool.push(() => {
      if (carrierCount(s) >= 2) { log('good', '🧵 A backhoe cuts a fiber route, but your second carrier on a diverse path keeps every customer online.'); return; }
      s.activeContracts.forEach((a) => { a.slaMisses += 1; });
      s.reputation = Math.max(0, s.reputation - 2);
      log('bad', '🧵 A backhoe cuts your only fiber route: customers lose connectivity for hours and SLAs take a hit. Lesson: buy a second circuit from a different carrier on a diverse path.');
    });
  }
  if (racks > 0) {
    pool.push(() => {
      const live = s.halls.filter((h) => h.racks.some((r) => r.status === 'online'));
      const weakest = live.map(hallResilience).sort((a, b) => a.score - b.score)[0];
      const score = weakest?.score ?? 0;
      if (rng() < score) {
        log('good', `🔌 Utility outage: your ${weakest?.tier} power chain (UPS → generator → transfer switch) carried the halls through with no customer impact.`);
        return;
      }
      s.activeContracts.forEach((a) => { a.slaMisses += 1; });
      s.reputation = Math.max(0, s.reputation - 2);
      const why = weakest?.gaps[0] ?? 'no backup power installed';
      log('bad', `🔌 Utility outage with weak protection (${why}): running jobs restart from checkpoint and SLAs take a hit. Lesson: UPS + battery + generator + transfer switch, sized N+1, keep training alive.`);
    });
    pool.push(() => {
      const bonus = Math.round(racks * 40_000);
      s.cash += bonus;
      s.reputation = Math.min(100, s.reputation + 1);
      log('good', `📣 A customer publishes a benchmark crediting your cluster's uptime: +${bonus ? '$' + (bonus / 1000).toFixed(0) + 'k' : ''} in spot demand and +1 reputation.`);
    });
  }
  pool.push(...disasterPool(s, rng, log));
  pool[Math.floor(rng() * pool.length)]();
}
