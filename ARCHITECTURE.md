# GIGAWATT architecture

```
 Godot (godot/)  ──JSON lines──▶  sidecar (src/bridge.ts, stdio only)
 UI, 3D hall, input                  └─ src/engine/protocol.ts   handle(req) → res   (transport-agnostic)
                                          ├─ engine/actions/<domain>.ts   player actions (mutate a cloned GameState, commit if ok)
                                          ├─ engine/queries/<domain>.ts   read-only questions the UI asks
                                          ├─ engine/{state,pricing,selectors,persistence}.ts
                                          └─ sim/tick.ts → sim/systems/*  the monthly pipeline
 Rules: src/sim/*  (validate, network, perf, market, economy, power, events, failures, resilience, internet) — pure functions
 Data:  src/data/* (catalogs)   Types: src/types.ts   Agents/RL: src/env/*
```

## Where does a change go?

| I want to… | Touch |
|---|---|
| add a player action | new function in `engine/actions/<domain>.ts` (or a new domain file + one line in `actions/index.ts`). It is automatically exposed to Godot and the agent env. |
| add a UI question | `engine/queries/<domain>.ts`; names are unique-checked at load. |
| add a **dynamic** (obsolescence, competitors, maintenance, staff…) | new `System` in `sim/systems/*`, inserted in `PIPELINE` in `sim/tick.ts`. Order matters: RNG draws are sequenced, so insert deliberately. |
| change a rule/number | the relevant pure module in `src/sim/*`. |
| add parts | `src/data/*`. |

## Rules of the road
- `src/sim/*` and `src/data/*` never import from `engine/` or the store. `engine/` may import `sim/`.
- Nothing in `src/` may import React, a DOM API or `localStorage` directly (persistence goes through `engine/persistence.ts`; headless entry points import `engine/headless-shim`).
- **Safety net:** `src/trajectory.golden.test.ts` replays full games (operator/random/idle agents + scenarios) and compares per-month state hashes. A refactor must keep it green untouched. Intentional rule changes: `GOLDEN_UPDATE=1 vitest run src/trajectory.golden.test.ts`, and say so in the commit.
- Sidecar rebuild: `vite build -c vite.bridge.config.ts` → `godot/sidecar/bridge.mjs`.
