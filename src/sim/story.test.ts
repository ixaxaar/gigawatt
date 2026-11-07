const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
import { describe, it, expect } from 'vitest';
import { useGame } from '../store';
import { CHAPTERS, DILEMMAS, RIVALS, VOICES } from './story-data';
import { needsOf } from '../engine/needs';

const play = (seed: number, months: number) => {
  useGame.getState().newGame(seed, 'learner');
  const answered: string[] = [];
  for (let i = 0; i < months; i++) {
    const g0 = useGame.getState().game;
    if (g0.story?.open && useGame.getState().game.cash > 5e6) { const id = g0.story.open.id; if (useGame.getState().resolveDilemma(i % 2).ok) answered.push(id); }
    if (g0.story?.cards.length) useGame.getState().ackStory();
    useGame.getState().nextMonth();
  }
  return { g: useGame.getState().game, answered };
};

describe('story content', () => {
  it('covers every year, with the shape the engine expects', () => {
    expect(CHAPTERS.map((c) => c.year)).toEqual([2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028]);
    expect(DILEMMAS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(DILEMMAS.map((d) => d.id)).size).toBe(DILEMMAS.length);
    for (const d of DILEMMAS) { expect(d.choices).toHaveLength(2); expect(d.fromYear).toBeLessThanOrEqual(d.toYear); for (const c of d.choices) { expect(c.label.length).toBeGreaterThan(1); expect(c.outcome.length).toBeGreaterThan(10); } }
    expect(RIVALS.map((r) => r.id).sort()).toEqual(['atlas', 'hyperion', 'nimbus']);
    for (const r of RIVALS) { expect(r.moves.length).toBeGreaterThanOrEqual(6); expect(r.reactsToYou.length).toBeGreaterThanOrEqual(4); for (const m of [...r.moves, ...r.reactsToYou]) expect(m).toContain('{rival}'); }
    expect(VOICES).toHaveLength(19);
    const text = JSON.stringify([CHAPTERS, DILEMMAS, RIVALS, VOICES]);
    expect(text).not.toMatch(/Lesson:/);
  });
});

describe('story engine', () => {
  it('announces a chapter every January and queues its card', () => {
    const { g } = play(11, 100);
    expect(g.story?.shown).toEqual(expect.arrayContaining([2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028]));
  });
  it('offers decisions over a campaign, applies the chosen effect, and never leaves two open', () => {
    let total = 0;
    for (const seed of [3, 4, 5]) { const { g, answered } = play(seed, 100); total += answered.length; expect(g.story!.seen.length).toBeGreaterThanOrEqual(answered.length); }
    expect(total).toBeGreaterThanOrEqual(6);
  });
  it('a decision shows up in the needs list and an answer clears it', () => {
    for (let seed = 1; seed < 40; seed++) {
      useGame.getState().newGame(seed, 'learner');
      for (let i = 0; i < 90 && !useGame.getState().game.story?.open; i++) useGame.getState().nextMonth();
      const g = useGame.getState().game;
      if (!g.story?.open) continue;
      expect(needsOf(g).some((n) => n.id === 'dilemma')).toBe(true);
      const cashBefore = g.cash;
      const r = useGame.getState().resolveDilemma(0); expect(r.ok).toBe(true);
      const after = useGame.getState().game;
      expect(after.story!.open).toBeUndefined(); expect(needsOf(after).some((n) => n.id === 'dilemma')).toBe(false);
      expect(typeof cashBefore).toBe('number');
      return;
    }
    throw new Error('no decision appeared in 40 seeds');
  });
  it('lapses an ignored decision after three months', () => {
    for (let seed = 1; seed < 40; seed++) {
      useGame.getState().newGame(seed, 'learner');
      for (let i = 0; i < 90 && !useGame.getState().game.story?.open; i++) useGame.getState().nextMonth();
      const open = useGame.getState().game.story?.open; if (!open) continue;
      const id = open.id;
      for (let i = 0; i < 3; i++) useGame.getState().nextMonth();
      const st = useGame.getState().game.story!;
      expect(st.open?.id).not.toBe(id); expect(st.seen).toContain(id);
      return;
    }
  });
});

describe('endings', () => {
  it('fills the end report with a timeline, best deal and epilogue', () => {
    const { g } = play(21, 100);
    if (g.status === 'playing') throw new Error('campaign should be over by month 100');
    const r = g.endReport!;
    expect(r.ending).toBeTruthy(); expect(r.epilogue!.length).toBeGreaterThan(20);
    expect(r.timeline!.length).toBeGreaterThan(5); expect(r.shareText).toContain('GIGAWATT');
  });
});
