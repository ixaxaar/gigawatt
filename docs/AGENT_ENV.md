# GIGAWATT agent environment

The engine (`src/`) is a deterministic, seeded simulation. `src/env/env.ts` wraps it as a Gymnasium-shaped environment,
exposed three ways: TypeScript (`import * as E from './src/env/env'`), JSON lines (the sidecar), and Python (`python/gigawatt_env.py`).

| call | returns |
|---|---|
| `reset({seed, scenario, mode})` | first observation |
| `step({name, args})` | `{obs, reward, done, truncated, info}` |
| `observe()` / `describe()` | structured state / compact text for LLM agents |
| `legalActions({full})` | actions that are *currently valid*, found by dry-running each candidate |
| `hash()` | FNV digest of the full state (determinism checks) |

**Actions** are the player's own store actions: `buy`, `buyTemplate`, `buildHall`, `installPower`, `installCooling`, `placeRack`,
`createCluster`, `acceptContract`, `assignContract`, `unassignContract`, `disbandCluster`, `takeLoan`, `signPower`, `buyUplink`,
`setSpot…`, `startEasy` (the automated build path), `nextMonth`. Invalid actions return `info.ok=false` with the engine's teaching message.

**Reward:** change in net worth ($M) on each `nextMonth`; −0.01 per rejected action; −10 and `done` if cash is negative for two
consecutive months. `truncated` at the scenario horizon.

**Scenarios** (`src/env/scenarios.ts`): `classic`, `lean` ($8M), `gold-rush-2025`, `stress-all-racks`, `stress-campus`
(multi-hall, every rack type, hundreds of racks). Scenarios run through public store actions only, so they obey the same rules as a player.

**Determinism:** all randomness derives from `seed` and the month; `env.test.ts` replays an action script twice and compares a state hash after every month.

**Reference agents** (`src/env/agents.ts`) and what the reward says about them (30 months, mean over 5 seeds, $M net-worth change):

| agent | return |
|---|---|
| idle | −0.96 |
| random legal action | +0.61 |
| scripted easy-path operator | +15.5 |

The ordering is asserted in `agents.test.ts`, so a rule change that makes standing still profitable fails CI.

## Python

```python
from gigawatt_env import GigawattEnv
env = GigawattEnv()                         # spawns `node godot/sidecar/bridge.mjs`
obs, _ = env.reset(seed=1, scenario="lean")
print(env.text())                           # feed this to an LLM
for a in env.legal_actions()[:5]: print(a["desc"])
obs, r, done, truncated, info = env.step({"name": "nextMonth"})
```

One process is one game; run several processes for parallel rollouts. Rebuild the sidecar after engine changes with
`./node_modules/.bin/vite build -c vite.bridge.config.ts`.

## Known limits

Observations are the full structured state (large for big campuses); there is no fixed-shape tensor encoding yet. Throughput is
bounded by Node + JSON per call. The catalogue is as complete as its sources: entries tagged `unverified` came from model recall
and should be checked against vendor datasheets before being treated as exact.
