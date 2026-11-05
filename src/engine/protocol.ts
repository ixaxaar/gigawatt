// Request/response protocol of the engine, independent of transport (stdio sidecar, tests, future WASM/HTTP).
//   {"id":1,"fn":"act","name":"buyTemplate","args":[...]}   run a player action        → result + game snapshot
//   {"id":2,"fn":"q","name":"validateRack","args":[...]}    read-only query            → result
//   {"id":3,"fn":"init"}                                    static catalogs + action list + game
//   {"fn":"claim"} award one finished mission · {"fn":"env","name":"reset|step|obs|text|actions|hash|scenarios"} agent API
import * as ENV from '../env/env';
import { SCENARIOS } from '../env/scenarios';
import { ALL_ITEMS, VENDORS } from '../data';
import { TEMPLATES } from '../data/templates';
import { MODELS } from '../sim/market';
import { MISSIONS } from '../missions';
import { CONCEPTS } from '../concepts';
import { useGame } from '../store';
import { QUERIES } from './queries';

const st = () => useGame.getState();
const G = () => st().game;

/** Actions callable from outside. Internal plumbing (project patching) stays private. */
const INTERNAL = new Set(['game', 'patchProject', 'addProject']);
export const ACTIONS: string[] = Object.keys(st()).filter((k) => typeof (st() as any)[k] === 'function' && !INTERNAL.has(k));

export interface Request { id?: number; fn: string; name?: string; args?: any[] }
export type Response = { id?: number; ok: boolean; result?: unknown; game?: unknown; error?: string };

export function snapshot() { const g: any = JSON.parse(JSON.stringify(G())); g.log = g.log.slice(-150); return g; }

function init() {
  return {
    items: ALL_ITEMS, vendors: VENDORS, templates: TEMPLATES, models: MODELS,
    missions: MISSIONS.map((m) => ({ id: m.id, title: m.title, hint: m.hint, lesson: m.lesson, reward: m.reward, go: m.go })),
    concepts: CONCEPTS.map((c) => ({ id: c.id, icon: c.icon, name: c.name, what: c.what, why: c.why, when: c.when, go: c.go })),
    actions: ACTIONS,
  };
}

/** Award the first finished, unclaimed mission (one per call). */
function claim() {
  const done: { id: string; title: string; reward: number }[] = [];
  for (const m of MISSIONS) {
    const g = G();
    if (g.missionsDone.includes(m.id) || !m.done(g)) continue;
    useGame.setState((s) => ({ game: { ...s.game, cash: s.game.cash + m.reward, missionsDone: [...s.game.missionsDone, m.id],
      log: [...s.game.log, { month: s.game.month, level: 'good' as const, text: `★ Mission complete: ${m.title} (+$${Math.round(m.reward).toLocaleString('en-US')}). ${m.lesson}` }] } }));
    done.push({ id: m.id, title: m.title, reward: m.reward });
    break;
  }
  return done;
}

function env(name: string | undefined, a: any[]) {
  const sc = (id?: string) => (id ? SCENARIOS.find((x) => x.id === id) : undefined);
  switch (name) {
    case 'reset': return ENV.reset({ seed: a[0]?.seed, mode: a[0]?.mode, scenario: sc(a[0]?.scenario) });
    case 'step': return ENV.step(a[0]);
    case 'obs': return ENV.observe();
    case 'text': return ENV.describe();
    case 'actions': return ENV.legalActions(a[0] ?? {});
    case 'hash': return ENV.hash();
    case 'scenarios': return SCENARIOS.map((x) => ({ id: x.id, title: x.title, description: x.description, horizonMonths: x.horizonMonths, seed: x.seed }));
    default: return undefined;
  }
}

export function handle(req: Request): Response {
  const base = { id: req.id };
  try {
    switch (req.fn) {
      case 'init': return { ...base, ok: true, result: init(), game: snapshot() };
      case 'act': {
        if (!req.name || !ACTIONS.includes(req.name)) return { ...base, ok: false, error: 'unknown action ' + req.name };
        const r = (st() as any)[req.name](...(req.args ?? []));
        return { ...base, ok: true, result: r ?? null, game: snapshot() };
      }
      case 'q': {
        const f = req.name ? QUERIES[req.name] : undefined;
        return f ? { ...base, ok: true, result: f(...(req.args ?? [])) } : { ...base, ok: false, error: 'unknown query ' + req.name };
      }
      case 'claim': return { ...base, ok: true, result: claim(), game: snapshot() };
      case 'env': {
        const r = env(req.name, req.args ?? []);
        return r === undefined ? { ...base, ok: false, error: 'unknown env fn ' + req.name } : { ...base, ok: true, result: r, game: snapshot() };
      }
      case 'ping': return { ...base, ok: true, result: 'pong' };
      default: return { ...base, ok: false, error: 'unknown fn' };
    }
  } catch (e: any) { return { ...base, ok: false, error: String(e?.stack ?? e) }; }
}
