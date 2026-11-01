# GIGAWATT Godot — parity with the web build

Architecture: Godot is the front-end. All rules run in the real TypeScript engine (`sidecar/bridge.mjs`,
built from `src/bridge.ts` with `vite build -c vite.bridge.config.ts`) over a pipe, so numbers match the web build exactly.
Run: `./run.sh` (uses the NVIDIA GPU + Vulkan Forward+). Needs Node 18+.

| Screen / feature | Status |
|---|---|
| Datacenter (3D hall, plaques, projects, missions, customers, log) | DONE |
| Procure: Guided planner (4 steps, BOM, hall checks, order) | DONE |
| Procure: Parts bin (kinds, vendors, unreleased, specs, codex, spares, orders) | DONE (no part art yet) |
| Design Lab: Tray bench (motherboard, sockets, install, fill all, autofill, templates, validation, sizing advisor, save) | DONE (click-select; no drag & drop, simplified PCB art) |
| Design Lab: Rack bench (42U, arm+place, count/nudge/remove, validation, save, adopt/open) | DONE (no drag & drop) |
| Build (floor place, gauges, install, buy plant, outage protection, internet, hall checks, new hall) | DONE |
| Warehouse (rack assembly, missing parts, deploy, spares, transit, floor, ledger) | DONE |
| Energy (power position, PPAs, spot market, idle capacity) | DONE |
| Supercomputer (racks, auto-design, advanced fabric, topology, model table, checks, build) | DONE |
| Customers (offers, fit verdicts, needs, Easy path, rack assign, pending, serving) | DONE |
| Codex (parts, Datacenter 101, accelerator timeline), Guide, Concepts | DONE |
| Modes, save/load, sound, pause menu/quit | DONE |
| Advisor "ADA" bubble, Tip toggle by mode, item/part art (ItemArt) | TODO |
| 3D hall: racks show per-cluster colours / cabling per cluster | TODO |
| Game-first layer (objectives, incidents, real-time) from the first Godot prototype | removed — to be re-added inside the engine |
