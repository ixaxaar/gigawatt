# ⚡ GIGAWATT — AI Datacenter Tycoon

**Build an AI datacenter from 2020 to 2028.** Buy real GPUs, NICs and switches, design your own server trays and racks, power and cool a hall, wire a fat-tree fabric into a supercomputer, and lease it to customers who want to **train** and **serve** frontier models — all while the price of electricity, the hardware roadmap and the odd backhoe conspire against you.

The front-end is a **Godot 4** game (Vulkan, forward+, a 1 unit = 1 m scale-model datacenter). Every rule — physics of power and cooling, fabric bisection, MFU, inference capacity, contracts, markets, incidents — runs in the **same deterministic TypeScript engine** as the original web build, driven by Godot through a headless Node sidecar. One source of truth, no re-implemented rules.

![The hall](docs/screenshots/hall.png)

## What you actually do

| | |
|---|---|
| **Procure** | A guided build planner (platform → how many → who builds it → order) plus a full parts bin: ~150 real parts with vendor, specs, lead times and volume discounts. |
| **Design Lab** | A motherboard-level tray bench (CPU sockets, DIMM banks, GPU/NVSwitch, NICs, NVMe, PSUs) and a 42U rack elevation, with live validation and a 5-year cost / sizing advisor. |
| **Build** | Power & cooling gauges, transformers/UPS/CRAH/CDU/chillers, outage-protection tiers, internet circuits, and new halls. |
| **Warehouse** | Rack assembly, "order all missing", deploy, spares, in-transit orders and the ledger. |
| **Supercomputer** | Group racks into one machine; auto-design or hand-tune the fabric; see what it can train or serve (per-model tok/s, MFU, TTFT). Uncluster and re-cluster any time. |
| **Customers** | Market offers with live fit verdicts and "what you need to buy"; an **Easy Path** that orders, installs, deploys and assigns for you; serve straight from racks. |
| **Energy** | Power purchase agreements, the spot GPU market, offering idle capacity. |
| **Codex** | "Datacenter 101": every concept with a live *do I need this right now?* verdict, plus the accelerator timeline. |

Three modes — **Learner** (tips everywhere), **Operator**, **Tycoon** — and a mission track that teaches the stack as you go.

## Screenshots

| Thermal view | Supercomputer builder |
|---|---|
| ![thermal](docs/screenshots/thermal.png) | ![supercomputer](docs/screenshots/supercomputer.png) |
| **Procurement planner** | **Design Lab** |
| ![procure](docs/screenshots/procure.png) | ![design](docs/screenshots/design.png) |
| **Customers & contracts** | **Codex** |
| ![customers](docs/screenshots/customers.png) | ![codex](docs/screenshots/codex.png) |

## Run it

Requirements: **Godot 4.x** (developed on 4.7), **Node 18+**, a Vulkan GPU recommended.

```sh
cd godot
./run.sh            # launches with Vulkan Forward+ (see note below)
```

`run.sh` points Vulkan at the NVIDIA ICD and forces `forward_plus`; on hybrid AMD+NVIDIA laptops the default loader otherwise falls back to OpenGL compatibility. Edit it for your GPU, or just run `godot --path godot`.

**Controls:** `1`–`9` switch screens · `Space` next month · right-drag orbit · wheel zoom · `WASD` pan · `Q/E` rotate · `T` thermal view · `Esc` menu · `Ctrl+Q` quit.

## Train agents on it

The simulation core is deterministic and headless, so it doubles as an environment for agents (RL, LLM tool-use, scripted bots).
It has a Gymnasium-shaped API (`reset` / `step` / `legalActions` / state `hash`), a scenario library (including multi-hall stress
campuses with every rack type deployed), and a Python client.

```python
from gigawatt_env import GigawattEnv            # python/gigawatt_env.py
env = GigawattEnv()
obs, _ = env.reset(seed=1, scenario="lean")
obs, reward, done, truncated, info = env.step({"name": "nextMonth"})
```

Reward is net-worth change per month; the reference agents separate cleanly (idle −$1.0M, random +$0.6M, scripted operator +$15.5M
over 30 months). Details, action list and limits: [`docs/AGENT_ENV.md`](docs/AGENT_ENV.md).

## Architecture

```
godot/                 Godot 4 front-end (GDScript)
  engine/bridge.gd     spawns the Node sidecar, JSON-lines over stdin/stdout
  sidecar/bridge.mjs   built TS engine (committed)
  world/hall_view.gd   realistic 3D hall: shader-drawn racks, raised floor, containment, cluster markers
  ui/                  every screen, Kit (widgets), tray/rack boards, topology view
src/                   the TypeScript engine (types, data catalog, sim, store) + web UI
src/bridge.ts          actions, read-only queries and the agent API exposed to Godot / Python
src/env/               agent environment: env, scenarios, reference agents, determinism + stress tests
python/                Gymnasium-style client
```

Rebuild the sidecar after changing the engine:

```sh
pnpm install
./node_modules/.bin/vite build -c vite.bridge.config.ts   # -> godot/sidecar/bridge.mjs
./node_modules/.bin/vitest run                            # engine tests
```

The original web version still lives in `src/ui` (`vite` dev server); see [`docs/WEB_README.md`](docs/WEB_README.md) and [`SCOPE.md`](SCOPE.md). Parity status of the Godot screens: [`godot/PARITY.md`](godot/PARITY.md).

## Status

Early but playable; full screen parity with the web build is done and being polished. Known gaps: advisor bubble, per-mode tip toggling, part art, drag-and-drop in the Design Lab, objectives/incident cards in the Godot layer.
