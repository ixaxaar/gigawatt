// The narrative layer: a chapter card every January, one decision at a time, rivals and customers with voices.
// It draws from its own RNG (seed + month + salt), never the shared tick RNG, so it cannot disturb any other system's rolls.
import { CHAPTERS, DILEMMAS, RIVALS, VOICES } from '../story-data';
import type { StoryEffect } from '../story-types';
import { mulberry32 } from '../rng';
import type { GameState, StoryState } from '../../types';
import type { System } from './types';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const storyRng = (s: GameState, salt: number) => mulberry32(((s.seed ^ Math.imul(s.month + 1, 0x85ebca6b)) + salt) >>> 0);
export const storyOf = (s: GameState): StoryState => (s.story ??= { shown: [], seen: [], cards: [] });
export const yearOf = (month: number) => 2020 + Math.floor(month / 12);
export const voiceOf = (customer: string) => VOICES.find((v) => v.customer === customer);
export const DILEMMA_WINDOW_MONTHS = 3;

/** Apply a dilemma choice's effect to the state (in place). */
export function applyEffect(g: GameState, e: StoryEffect): void {
  if (e.cash) g.cash = Math.round(g.cash + e.cash);
  if (e.rep) g.reputation = clamp(g.reputation + e.rep, 0, 100);
  if (e.staff) g.staff = Math.max(0, g.staff + e.staff);
  if (e.utility) g.utilityUSDPerKWh = Math.round(g.utilityUSDPerKWh * e.utility * 1e4) / 1e4;
}

/** A rival headline for the top-growing rival, voiced by its profile; the player's reputation sometimes draws a reaction. */
export function rivalHeadline(s: GameState, rivalId: string, name: string): string | null {
  const p = RIVALS.find((r) => r.id === rivalId); if (!p) return null;
  const rng = storyRng(s, 7);
  const pool = s.reputation >= 60 && rng() < 0.5 ? p.reactsToYou : p.moves;
  return pool[Math.floor(rng() * pool.length)].split('{rival}').join(name);
}

export const story: System = {
  id: 'story',
  run: ({ s, log }) => {
    const st = storyOf(s);
    const year = yearOf(s.month);
    // chapter card each January
    if (s.month % 12 === 0) {
      const ch = CHAPTERS.find((c) => c.year === year);
      if (ch && !st.shown.includes(year)) {
        st.shown.push(year); st.cards.push(year);
        log('info', `📖 ${year}: ${ch.title}. ${ch.text}`);
      }
    }
    // an open decision lapses if ignored
    if (st.open && s.month - st.open.month >= DILEMMA_WINDOW_MONTHS) {
      const d = DILEMMAS.find((x) => x.id === st.open!.id);
      log('info', `The moment passed: you never answered "${d?.title ?? 'the offer'}", and the offer went elsewhere.`);
      st.seen.push(st.open.id); st.open = undefined;
    }
    // maybe a new decision (never while one is open, never in the first year or the last month)
    if (!st.open && s.month >= 14 && s.month < 106 && s.mode !== undefined) {
      const rng = storyRng(s, 13);
      if (rng() < 0.15) {
        const pool = DILEMMAS.filter((d) => !st.seen.includes(d.id) && year >= d.fromYear && year <= d.toYear);
        if (pool.length) {
          const d = pool[Math.floor(rng() * pool.length)];
          st.open = { id: d.id, month: s.month };
          log('info', `❓ Decision — ${d.title}: ${d.text}`);
        }
      }
    }
  },
};
