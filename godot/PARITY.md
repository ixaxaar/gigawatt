# GIGAWATT Godot — parity with the web build

Web build (src/) is the reference. Status: DONE / PARTIAL / TODO.

| Area | Web | Godot |
|---|---|---|
| 3D hall, racks, aisles, plant | isometric SVG | DONE (1:1 scale PBR scene, shader rack faces) |
| Real-time clock, speeds, pause | monthly button | DONE |
| Procure prebuilt systems | templates | DONE |
| Hall power/cooling caps + throttling | yes | DONE (simplified) |
| Spot + contracts revenue | detailed (SLA, tokens/s, MFU) | PARTIAL (GPU-count contracts) |
| Failures + spares + RMA | per-part | PARTIAL (per-rack, global spares) |
| Incidents (decision cards), objectives, win/lose | n/a (new) | DONE |
| Design Lab: tray -> rack from parts, validation | yes | TODO |
| Procure individual parts + warehouse ledger | yes | TODO |
| Network / supercomputer: fabrics, topologies, clusters | yes | TODO |
| Training/inference perf model (perf.ts) | yes | TODO |
| Power market: PPAs, spot power | yes | TODO |
| Outage protection tiers (UPS/genset/ATS/N+1) | yes | TODO |
| Internet uplinks | yes | TODO |
| Hall cooling classes air/rdhx/dlc/immersion, PUE | yes | PARTIAL (air/dlc) |
| Easy-path autopilot | yes | TODO |
| Modes (learner/operator/tycoon) + concepts/codex/advisor | yes | PARTIAL (modes only) |
| Save/load | yes | TODO |
| Sound | yes | TODO |

Port order: (1) save/load + sound, (2) resilience + internet + power market on the existing sim,
(3) validate.ts + Design Lab, (4) perf.ts + contracts with real SLAs, (5) network, (6) codex/advisor/easy-path.
Pure-sim ports are verified against golden vectors exported from the TS sim (godot/tests/*_golden.json).
