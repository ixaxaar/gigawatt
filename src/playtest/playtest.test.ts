// Default run: a short smoke playthrough per persona (fast, part of CI).
// Full campaign sweep: PLAYTEST=1 ./node_modules/.bin/vitest run src/playtest  -> docs/playtest/report.md
import { it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { play, toMarkdown, type Report } from './run';
import { PERSONAS } from './personas';

const FULL = !!process.env.PLAYTEST;

it('personas play without breaking invariants', () => {
  const reports: Report[] = [];
  const plan = FULL
    ? Object.keys(PERSONAS).flatMap((p) => [21, 22, 23].map((seed) => ({ p, seed, months: 97, sc: undefined as string | undefined })))
        .concat([{ p: 'tycoon', seed: 7, months: 60, sc: 'gold-rush-2025' }, { p: 'operator', seed: 8, months: 97, sc: 'lean' }, { p: 'cautious', seed: 9, months: 97, sc: 'lean' }])
    : Object.keys(PERSONAS).map((p) => ({ p, seed: 21, months: 30, sc: undefined as string | undefined }));
  for (const x of plan) reports.push(play(x.p, x.seed, x.months, x.sc));
  if (FULL) writeFileSync('docs/playtest/report.md', toMarkdown(reports));
  const bugs = reports.flatMap((r) => r.violations.map((v) => `${r.persona}/${r.seed}: ${v.rule} (m${v.month}) ${v.detail}`));
  expect(bugs).toEqual([]);
}, 3_600_000);

it('same seed + same persona is bit-identical (determinism)', () => {
  const a = play('tycoon', 5, 24); const b = play('tycoon', 5, 24);
  expect(a.hash).toBe(b.hash);
});
