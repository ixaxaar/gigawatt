# GIGAWATT — AI Datacenter Tycoon

Build a datacenter from bare land, buy real AI hardware, design trays/racks/fabrics, wire power, cooling and
network, then lease capacity for **training** (supercomputers) and **inference** (token serving). Every part is a
real product with real specs, and every constraint is a real engineering constraint. The player learns the stack
by being forced to satisfy it.

## Pillars
1. **Real constraints, not flavor.** NVL72 needs ~120–132 kW/rack of liquid cooling; HBM capacity decides which
   model fits; scale-out oversubscription decides training MFU. The sim enforces all of this.
2. **Learn by doing.** Every component links to a Codex entry (what / why / tradeoff). Validation errors are
   teachable ("Rack needs 132 kW but hall offers 40 kW air-cooled → add CDU or move to liquid hall").
3. **Era progression 2020→2028.** Hardware unlocks by date. Vendor lead times and allocation make timing matter.
4. **Two businesses only.** Training contracts (need one coherent fabric domain of N accelerators for D days) and
   inference contracts (tokens/s at p95 latency SLA for model M, paid per Mtoken or reserved).

## Game loop (monthly ticks, 1 tick = 1 month; sub-steps for construction)
Buy land/hall → order parts (lead time, price, allocation) → design **Tray** (chassis + parts) → design **Rack**
(trays + switches + PDU + cooling interface) → place racks in hall rows → provision power/cooling plant →
cable (power, liquid, scale-up, scale-out, storage, OOB) → commission (burn-in, failures) → form **Clusters**
(a set of racks + fabric topology) → assign clusters to **Contracts** → collect revenue, pay power/staff/depreciation/
financing → reinvest. Failure/win: bankruptcy; or reach net-worth/capacity targets; sandbox mode.

## Systems
| System | Key mechanics |
|---|---|
| Catalog | Accelerators, CPUs, memory, NICs/DPUs, switches, optics/cables, chassis, racks, power, cooling, storage, vendors |
| Procurement | Vendor price, lead time, allocation caps by tier, volume discounts, price drift per era, supply shocks |
| Tray designer | Slot-based chassis (GPU/CPU/DIMM/NIC/DPU/NVMe/PSU/cold plate); PCIe lanes, power, thermals, cooling type validation |
| Rack designer | U-slots, ORv3/19", power shelf, busbar, in-rack NVLink spine, ToR switches, weight, kW, cooling interface |
| Facility | Halls with kW cap, floor tiles, cooling class (air / RDHx / DLC / immersion), PUE, utility feed, transformer, UPS, genset, CDU, chillers/dry coolers, floor loading |
| Network | Scale-up (NVLink/NVSwitch, Infinity Fabric/UALink, ICI-like), scale-out (IB NDR/XDR, Spectrum-X, Tomahawk/UEC), frontend, storage, OOB. Topology builder: rail-optimized fat-tree, oversubscription, switch count, optics vs DAC/AOC reach, cable BOM |
| Performance model | Roofline-lite: FLOPs, HBM BW/capacity, scale-up domain, scale-out BW → training MFU & step time; inference prefill/decode tokens/s, KV-cache fit, batching |
| Operations | Failures (GPU/optics/PSU/leaks), MTBF at scale, checkpoint-restart cost for training, thermal throttling, power capping, staff |
| Market | Customer archetypes (startup, lab, enterprise, sovereign), contract generator keyed to era (model sizes), spot vs reserved, reputation |
| Finance | Capex, opex (power $/kWh, cooling, staff, support contracts), depreciation, loans, residual value by generation |
| Codex & Missions | Encyclopedia generated from catalog + authored lessons; tutorial missions; quizzes unlock bonuses |

## Hardware coverage (real products, approximate public specs; sources noted in codex)
- **NVIDIA**: V100/DGX-2 (NVSwitch gen1), A100/HGX A100 (NVLink3), H100/H200/HGX (NVLink4, NVSwitch3, SHARP), GH200,
  B200/HGX B200, GB200 NVL72 (NVLink5, NVLink Switch tray), GB300, Vera Rubin NVL144 (NVLink6), Rubin Ultra NVL576 (2027+), Kyber rack.
  BlueField-3/-4 DPU, ConnectX-7/8/9, Quantum-2/-X800 IB, Spectrum-4/Spectrum-X, Spectrum-X photonics/CPO.
- **AMD**: MI250X, MI300X, MI325X, MI355X, MI400/"Helios" rack (UALink/UEC), Infinity Fabric, Pensando Pollara/Vulcano NICs, EPYC.
- **Tenstorrent**: Wormhole (n150/n300), Blackhole (p150), Galaxy (32-chip), RISC-V, Ethernet-native scale-out/mesh.
- **Cerebras**: WSE-3 / CS-3, MemoryX, SwarmX, wafer-scale cooling/power.
- **Others**: Intel Gaudi 3 (Ethernet-native), Groq LPU (SRAM-only, deterministic), Broadcom Tomahawk 5/6 & Jericho, Arista/Cisco, Marvell/Credo optics, Ultra Ethernet, UALink, CPO.
- **Infra**: Vertiv/Schneider/Eaton/Delta style power & cooling, CDUs, RDHx, immersion (Submer/GRC style), VAST/WEKA/DDN storage.

## Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md): a pure deterministic TypeScript engine (`src/engine`, `src/sim`, `src/data`) behind a JSON-lines protocol, with a Godot 4 front-end.

## Milestones
M0 scaffold + types + this doc · M1 catalogs (5 parallel workers) · M2 sim engine + tests · M3 core UI (procurement,
tray, rack, hall) · M4 network/cluster designer + contracts · M5 codex/missions/polish/balance.
Honest bar: this is a deep management sim built for learning, not a literal AAA budget. Aim: polished, dense,
correct, and fun.
