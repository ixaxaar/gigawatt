# Status after v0.6.0

"Done" means shipped and checked; "Partial" says what is missing. The review below is kept as written, except item 1, where the root cause turned out to be different (see its note).

| Item | Status | Notes |
|---|---|---|
| 0.1 Benchmark harness | Done | `scripts/bench.sh`, results in `docs/perf/bench.md`; `GW_STATS=1` prints draw calls and video memory, `GW_NOTHROTTLE=1` lifts the idle frame cap. |
| 1 Wrong GPU / OpenGL fallback | Done, cause differs | On the review machine a stale `VK_ICD_FILENAMES` pointed at a non-existent driver file; Vulkan itself works. `gigawatt.sh` and `run.sh` now drop a stale value, start on Vulkan and honour `GIGAWATT_GPU`. In-game: compatibility-mode note, `user://logs/gigawatt.log`, "Copy diagnostics". Wiki page added. |
| 2 Presets, render scale, auto-detect, FPS cap | Done | Five presets, FSR render scale (auto for weak GPUs on big panels), idle and background frame caps, Deck detection. Missing: TAA-vs-MSAA split per tier is simplified; reflection probes not added. |
| 3 Monthly hitches | Partial | Open-screen refresh is coalesced to a few per second while auto-advancing; Codex never refreshes; picking looks at the slots under the ray; per-rack lookups are indexed once per rebuild. Not done: diffing the hall instead of rebuilding it, delta queries from the engine, lazy Warehouse rows, asynchronous `nextMonth`. |
| 4 Draw calls | Partial | Shared meshes, cached materials, one shared rack-face material with per-rack instance parameters, visibility ranges on small props. Not done: MultiMesh for repeated parts. |
| 5 Text on small screens | Done | 13 px floor, automatic UI scale on small windows, text-size boost. Not done: a separate handheld layout (full-screen sheets) and a `layout_test.gd`; the 1280x800 captures show every screen fitting. |
| 6 Gold rush | Done | Late-start scenarios get a first review after one year; idle is fired and scores under 40% of an operator (tested). Ratings are still absolute. |
| 7 Spurious unlock toasts | Done | |
| G1 Texture library | Done | Seven CC0 ambientCG sets, triplanar, per-tier texture size, normal maps and anisotropy. |
| G2 Rack face depth and LOD | Done | Emboss normal at LOD 0, LOD 1 and 2 drop the vent and bay detail. Not done: baked atlas for LOD 1/2. |
| G3 Lighting | Partial | Lower flat ambient, a sky for reflections, exposure retuned. Not done: AgX tone mapping, reflection probes, floor-decal contact shadows. |
| G4 Walls and title backdrop | Done | |
| G5 Distance culling | Partial | Visibility ranges and per-tier light budgets. Not done: per-row culling groups. |
| U1 Splash and icon | Done | Splash, app icon and Windows `.ico` are set; the Windows exe icon needs rcedit, which the CI export does not have. The loading card was skipped: engine start takes about 120 ms. |
| U2 Transitions | Done | Slide and fade for drawers, fade and grow for workshops; reduced motion shortens them to a fade. Modal dimming is still instant. |
| U3 Labels | Done | Close-up labels, cluster billboards when zoomed out. |
| U4 Settings | Done | Five tabs, visible toggles, display mode, V-Sync, FPS cap. Window position is not persisted. |
| U5 Small findings | Partial | Easy Path pills, pluralisation, one money line, decision card sizing, BF16 label, title shade. Not done: ultrawide KPI width cap, virtual keyboard for text inputs, hall auto-framing. |
| B1 Revenue cliffs | Partial | Renewal offers arrive four months early (tested). Scripted personas still hit one cliff per run; they do not take renewals in time. |
| B2 Idle fleet | Not done | |
| B3 Careful players | Partial | Operator mode forgives a clearly growing company; strike messages name next year's target. The scripted "cautious" persona (one small contract at a time) is still fired, which is intended. |
| B4 Persona gaps | Not done | |
| P2 hygiene | Partial | Bug template and diagnostics added. Not done: macOS and Windows signing, leak-at-exit fix, crash-safety test. |

---

# GIGAWATT pre-beta review (v0.5.0 → v0.6)

A review of v0.5.0 written as a work list for an implementer. It covers performance, platforms and screen sizes (including Steam Deck), stability, gameplay balance from scripted play, a graphics and texture pass with quality tiers, and UI polish. Every item has **problem**, **evidence**, **fix** and **done when**. Work top to bottom; P0 items block a public beta.

Measured on 2026-11-08: Ryzen 9 9900X, RTX 4090, plus the CPU's own Radeon iGPU (Granite Ridge, 2 CUs; roughly a quarter of a Steam Deck's GPU, so a worst case). The monitor is 3840×2160. Window sizes were tested by dropping a temporary `godot/override.cfg` into the project (see §0).

## 0. Ground rules and how to measure

- Read `docs/CRITIQUE.md` "Ground rules" first; they still apply: commit style, no history phrasing in README or website, rebuild the sidecar after any TypeScript engine change (`./node_modules/.bin/vite build -c vite.bridge.config.ts`), and run `godot --headless --path godot --import` after adding a `class_name` script.
- Checks that must stay green after every item: `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/vitest run`, `GW_SMOKE=1 godot --headless --path godot` (prints SMOKE OK), `GW_SMOKE=1 GW_SMOKE_YEARS=8 ...` (soak), and `godot --headless --path godot -s tests/audio_test.gd`.
- **Benchmark harness (build this first, item 0.1).** These numbers came from throwaway scripts. Commit them as `scripts/bench.sh`:
  - `--print-fps --disable-vsync`, take the median of the FPS lines after a 4-line warm-up, 16 s per run.
  - Pick the GPU with `VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/{nvidia,radeon}_icd.json` and `--rendering-driver vulkan`.
  - `--resolution` is ignored because the project forces exclusive fullscreen (`window/size/mode=3`). To test a window size, write `godot/override.cfg` with `[display] window/size/mode=0`, `window/size/window_width_override=W` and `window/size/window_height_override=H`, and delete it afterwards. Never commit it.
  - Scenarios: a fresh game (`GW_AUTOSTART=operator`), `GW_SCENARIO=stress-campus` and `GW_SCENARIO=stress-all-racks`, each at `GW_QUALITY=0/1/2`.
  - Write a Markdown table to `docs/perf/bench.md`. Add `GW_PERF=1` timings (see 3) to the same file.
- **Frame budget targets.** These are what "done when" refers to below:
  - 4090 at 4K, High: ≥ 120 FPS.
  - Steam Deck at 1280×800, the Deck preset: ≥ 40 FPS locked, ≥ 60 preferred, in stress-campus.
  - Radeon iGPU on this machine **at 4K fullscreen** with the auto-detected preset: ≥ 30 FPS. It already does 124 FPS at 1280×800 Low; the problem is native-resolution 3D on big panels.
  - No frame over 50 ms while the game runs at 3× speed on stress-campus (excluding loads).

### Baseline numbers (v0.5.0)

| GPU / API | Scene | Low | High | Notes |
|---|---|---|---|---|
| RTX 4090, Vulkan | fresh game, 4K | 282 | 239 | fine |
| RTX 4090, Vulkan | stress-campus, 4K | 259 | 279 | fine |
| Radeon iGPU, Vulkan | fresh game, 4K | 14 | **3** | unplayable |
| Radeon iGPU, Vulkan | stress-campus, 4K | 15 | **3** | unplayable |
| Radeon iGPU, Vulkan | fresh game, 1280×800 | 124 | 36 | Balanced 67 |
| Radeon iGPU, Vulkan | stress-campus, 1280×800 | 127 | 37 | Balanced 66 |
| **Default launch (no env)** | 4K fullscreen | 18–32 | 17 | **OpenGL fallback on the iGPU, even with a 4090 present: a stale `VK_ICD_FILENAMES` on this machine** (item 1) |

The cost is almost all fill rate: the same iGPU goes from 3 FPS to 36 FPS on High when the window drops from 4K to 1280×800, and scene size barely matters (fresh game ≈ stress-campus). Because the project forces fullscreen at native resolution, any weak GPU driving a 1440p or 4K panel renders 3D at full resolution with no way to lower it. A Steam Deck (about 4× this iGPU, at 1280×800) should already manage Balanced at 60 FPS; verify that on hardware.

`GW_SMOKE=1 GW_PERF=1` on stress-campus:
- `nextMonth`: 179 ms
- `_on_changed`: 111 ms
- Opening a screen for the first time: Warehouse **842 ms**, Supercomputer 138 ms, Energy 117 ms, Codex 105 ms, Design 99 ms
- Engine round trips: `offersAll` returns 500 KB of JSON in 50 ms, and every action returns the whole game (≈170 KB) and re-parses it.

The 8-year soak passes (`SOAK year=8 … status=playing`, SMOKE OK), with leaked resources at exit (item 9).

---

## P0: blocks the beta

### 1. A stale Vulkan environment makes the game silently run in OpenGL on the integrated GPU

> Note after investigation: the failure on the review machine came from `VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/radeon_icd.x86_64.json` in the user's environment, a file that does not exist (the installed file is `radeon_icd.json`). With the variable unset, plain `godot --path godot` picks the RTX 4090 on Vulkan. The fix below (launcher check, in-game notice, diagnostics) is still right, because a stale variable is common.

**Problem.** With a bad `VK_ICD_FILENAMES`, Godot logs `Required Vulkan instance extension VK_KHR_surface not found`, then "switching to OpenGL 3", which puts the game on the integrated GPU at 18-32 FPS. The player never finds out why the game is slow. The release `gigawatt.sh` was a two-line `exec`, and `run.sh` (dev only) was the only place any GPU handling lived.

**Evidence.** `godot --path godot --verbose`, then grep for `Vulkan|OpenGL`. `scripts/package.sh` writes a 2-line `gigawatt.sh`. `godot/export_presets.cfg` excludes `run.sh`.

**Fix.**
1. Ship the selection logic in `gigawatt.sh`:
   - If `/dev/nvidia0` exists and `nvidia_icd.json` is present, prefer it but **do not hard-set `VK_ICD_FILENAMES`**, because that breaks AMD-only and Deck machines. Instead set `__NV_PRIME_RENDER_OFFLOAD=1` and `__VK_LAYER_NV_optimus=NVIDIA_only`.
   - Pass `--rendering-driver vulkan`.
   - Let `GIGAWATT_GPU=igpu|dgpu` override the choice.
2. In-game: at `_ready` read `RenderingServer.get_current_rendering_method()` and `RenderingServer.get_video_adapter_name()`. If the method is `gl_compatibility`, show a one-time dismissible toast ("Running in compatibility mode on <adapter>. For better performance see wiki/Performance"), force quality Low and skip the Forward+-only effects. This already partly works through the `fp` check in `hall_view.gd:66`.
3. Add a `docs/wiki/performance.md` page covering hybrid laptops, `GIGAWATT_GPU`, the Deck and the quality presets, and rebuild the wiki.
4. Log the renderer, adapter, driver and window size to `user://logs/` at start; bug reports need it.

**Done when.**
- On this machine `GIGAWATT/gigawatt.sh` from a locally packaged build reports `Vulkan … Forward+ … RTX 4090`.
- With `GIGAWATT_GPU=igpu` it reports the Radeon on Vulkan.
- A forced-OpenGL run (`--rendering-driver opengl3`) shows the toast.

### 2. Low-end GPUs can't run the game, and the quality presets barely change the cost

**Problem.**
- At 4K the iGPU gets 14–15 FPS on Low and **3 FPS on High**. At 1280×800 it gets 124 and 36, so the missing lever is **3D render resolution**: there is no render scale, and fullscreen is forced at native resolution.
- High switches on SSIL, SSR, volumetric fog and MSAA together, and there is no render scale.
- Low still renders every spotlight: one per 3 columns in each cold aisle plus one per 4 in each hot aisle, so dozens in a 24-column hall.
- Low still runs the full procedural `rack_face.gdshader` (hash noise, per-pixel LED logic, `TIME` animation) on every rack face, two per rack.
- Low still renders a full-screen vignette and grain pass that animates with `TIME`.
- There is no FPS cap, so a paused game redraws at 280 FPS on a laptop, burning battery and spinning fans.

**Evidence.** Baseline table; `hall_view.gd:62-93` (`apply_quality`, `_build_environment`), `hall_view.gd:197-204` (aisle lamps), `assets/shaders/rack_face.gdshader`.

**Fix.** Replace the 3-step `Settings.quality` with presets plus individual overrides. Store them in `user://settings.cfg` and keep the `GW_QUALITY` override.

| Setting | Potato / Deck | Low | Balanced | High | Ultra |
|---|---|---|---|---|---|
| Render scale (3D only, UI stays native) | 0.67 + FSR 1 | 0.75 + FSR 1 | 1.0 | 1.0 | 1.0 |
| Anti-aliasing | none | FXAA | FXAA | TAA or MSAA 2× | MSAA 4× + TAA |
| Shadows | off | key light only, 2K | key, 4K | + rack contact AO decals | + soft shadows |
| SSAO / SSIL | off | off | SSAO half-res | SSAO + SSIL | full-res both |
| SSR (floor reflections) | off | off | off | on | on |
| Volumetric fog | off | off | off | on | on (denser) |
| Glow | off | on (2 levels) | on | on | on |
| Aisle lights | 0 real lights; emissive strips + a baked light pool decal | ≤ 8 lights | ≤ 24 | all | all + shadows on 4 |
| Rack face shader | LOD 2 (flat texture atlas) | LOD 1 | LOD 0 near, LOD 1 far | LOD 0 | LOD 0 |
| Texture set (§P1-G) | 512 | 1K | 2K | 2K | 4K |
| Labels / particles | labels on hover only, no smoke | near only | all | all | all |
| Vignette + grain | static, no `TIME` | static | animated | animated | animated |
| FPS cap | 40 (Deck) | 60 | display Hz | display Hz | uncapped |

Also:
- **Auto-detect on first run.** Pick Potato when `OS.has_feature("steamdeck")` or the adapter name contains "Custom GPU 0405" or "VanGogh". Pick Low for integrated GPUs (`RenderingDevice.get_device_type()` reports integrated, or the adapter name has "Radeon Graphics", "Intel" or "UHD"). Pick High for discrete GPUs. Show the choice in Settings ("Auto-detected: Low · integrated GPU").
- **Idle throttling.** When the game is paused and no input has arrived for 3 s, drop to 30 FPS (`Engine.max_fps`). When the window is unfocused, drop to 10 FPS.
- Make the render scale use `get_viewport().scaling_3d_mode = SCALING_3D_MODE_FSR` and `scaling_3d_scale`, so the UI stays crisp.

**Done when.**
- The §0 targets are met.
- On the iGPU at 4K fullscreen, auto-detect picks Low (render scale 0.75 or less) and holds ≥ 30 FPS; it gets 15 today.
- iGPU Balanced at 1280×800 stays ≥ 60 FPS (67 today; the texture pass must not regress it).
- 4090 Ultra ≥ 120 FPS at 4K. Paused and idle, the 4090 is under 15% load (`nvidia-smi`).

### 3. Monthly hitches: every change tears down and rebuilds the whole hall

**Problem.**
- `main.gd:_on_changed` runs on every action and every month. It calls `hall.rebuild()`, which `queue_free`s every node in the hall and rebuilds them (766 nodes for one stress-campus hall), then refreshes the open screen.
- On stress-campus, `nextMonth` + `_on_changed` ≈ **290 ms**. At 3× speed a month lasts 0.6 s, so the game freezes for 0.3 s twice a second.
- `_sysinfo()` scans all designs × items × trays for every rack (cubic). `_cluster_of()` scans all clusters and contracts per rack. `_ray_pick` scans every rack box on every mouse move. `_inspect` scans the whole `machineLedger`.
- Bridge requests are synchronous on the main thread. Each `act` returns the whole ≈170 KB game, plus 125 KB of `machineLedger` re-queried on almost every change.

**Evidence.** `GW_SMOKE=1 GW_PERF=1 godot --headless --path godot`; `world/hall_view.gd:139-168, 323-334, 304-313`; `main.gd:190-207`; `engine/bridge.gd:64-83`.

**Fix.**
1. **Diff the hall instead of rebuilding it.**
   - Keep `slot -> {rack id, status, design, cluster, label state}` from the last build. On change, update only the racks whose entry changed.
   - Rebuild the shell, aisles, overhead and plant only when the hall's slot count, cooling class or plant counts change.
   - Keep `rebuild()` for hall switches and the thermal toggle.
2. Precompute `design_id -> platform` and `cluster_id -> {name, customer, color}` once per rebuild, so per-rack lookups are O(1).
3. Use a grid lookup in `_ray_pick` (slot from the floor intersection, then test that rack's AABB) instead of scanning every rack. Throttle hover picking to once per frame.
4. **Engine side:**
   - Make `act` return `{ok, result, game}` only when asked. Otherwise return a version number and let Godot fetch `game` lazily.
   - Add a `delta` query that returns only the changed top-level keys.
   - Cache `machineLedger` by game version.
   - Paginate `offersAll`, or trim it to the fields the cards need (500 KB per call now).
5. Warehouse first open (842 ms): build rows lazily (first 30, then more on scroll), and cache the design list between opens.
6. Run `nextMonth` on the sidecar while Godot keeps rendering (async request, poll the pipe in `_process`), and show a thin progress shimmer on the month bar instead of freezing.

**Done when.**
- `GW_PERF=1` on stress-campus shows `nextMonth` + `on_changed` ≤ 40 ms, and every screen opens in ≤ 60 ms.
- A new `GW_PERF=frames` mode plays 24 months at 3× speed and prints the worst frame time, which is ≤ 50 ms on the 4090 and ≤ 70 ms on the iGPU.

### 4. The hall is thousands of separate draw calls

**Problem.**
- Every box is a new `MeshInstance3D` with a **new `BoxMesh`** (`_box`), so no meshes are shared.
- `_emit()` and `_glass()` create a new material on every call (only `_solid` is cached).
- `_face()` creates a **unique `ShaderMaterial` per rack face**, so nothing batches.
- A rack is about 15–20 nodes: shell, top, two faces, contact shadow, four thermal dots, cluster rails, floor tags, idle plate, `Label3D`.
- Cluster cables are one cylinder per segment.

**Evidence.** `hall_view.gd:95-115, 257-301, 336-343, 383-404`.

**Fix.**
- **Share meshes:** one static `BoxMesh` per distinct size, cached in a dictionary like `_mat_cache`. Better, use a unit cube scaled by the node transform.
- **Cache every material:** `_emit` keyed by colour, energy and alpha; `_glass` keyed by colour.
- **Rack faces:** one shared `ShaderMaterial`, with per-rack values (`seed`, `fill`, `accent`, `state`, `heat`, `rear`) as `instance uniform` in the shader, set with `set_instance_shader_parameter`.
- **MultiMesh** for repeated parts: rack shells, rack tops, thermal dots, slot corner marks, overhead busway taps, ceiling light strips and cable segments. Use one `MultiMeshInstance3D` per part type per hall, with colour carried in `INSTANCE_CUSTOM`/`COLOR`.
- **Labels:** keep `Label3D`, but hide labels beyond about 14 m camera distance or when more than 60 are on screen, and show them on hover instead. This is also a readability fix (item P1-U3).

**Done when.** The Godot monitor (`Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME`, printed by `GW_PERF=1`) on the stress-campus hall drops from its current count to below 400. Add the current count to `docs/perf/bench.md` as the before value.

### 5. Text is too small on the Steam Deck and on 1366×768 laptops

**Problem.**
- The UI is laid out for 1920×1080 with `canvas_items` stretch, so at 1280×800 everything scales by 0.67.
- Around 147 call sites use 9–12 px fonts: `Kit.label(..., 11)` ×46, `12` ×92, `10` ×9. On a Deck these draw at 6–8 px on a 7" screen, which is unreadable. Examples: contract footers ("Offer open until…"), the Easy-path step lines, the Supercomputer left column, KPI captions, Overview log lines.
- `Settings.load_all` raises `ui_scale` to 1.75 only on first run, only when no settings file exists, and only when the window is under 1500 px wide. Anyone who launched once at 1080p, then docked or undocked, keeps tiny text.
- At 1.75 the drawers' minimum widths (`drawer_w`: 780–1240 px) no longer fit: `w - 300` clamps the drawer to about 800 px of a roughly 1100 px logical width, and the hall view is squeezed to almost nothing.

**Evidence.** `docs/review-0.6/1280x800_*.webp` and `1366x768_*.webp`; `game/settings.gd:20`; `main.gd:19-21`.

**Fix.**
1. Introduce `Kit.FS` font roles, `{caption: 13, body: 15, label: 16, title: 22, hero: 30}` at 1080p, and replace every literal font size below 13 with a role. **Minimum 13 px at 1080p**, which is ≈ 9 px on a Deck before UI scale; Valve's Deck guideline is 9 px minimum lowercase height at 1280×800.
2. Pick the UI scale from physical size, not a one-time check. `auto` (the new default) means `clamp(DisplayServer.screen_get_dpi() / 96, …)` combined with a "handheld" rule: if the screen's short side is ≤ 900 px, use scale 1.5. Users can still pin a value. Re-evaluate on `size_changed`.
3. **Handheld layout** for logical widths below 1300 px (after scale):
   - Drawers become full-screen sheets over the hall, with a close button and B to close.
   - The four KPI cards collapse to one row of compact chips.
   - The dock becomes icons with a 1-line label.
   - Overview becomes a single column.
4. Every interactive control must be at least 40×40 logical px. The Deck touchscreen needs it, and so does the trackpad cursor.

**Done when.**
- Screenshots at 1280×800 (fresh settings file) of Overview, Customers, Supply, Design Lab, Supercomputer, a decision card and Settings show no text under 9 physical px. Check with a 9 px overlay grid in the review screenshots.
- No drawer covers more than 100% of the width or leaves less than 0 px of hall.
- `tests/layout_test.gd` (new) instantiates every screen at 1280×800 with scale 1.5 and asserts that no visible `Label` or `Button` has a font size below 13 × scale and that no control overflows the viewport rect.

### 6. In the gold-rush scenario doing nothing wins

**Problem.** Every persona, including **idle**, ends gold-rush with $225M–$264M and the rating "Solid operator". Idle scores 2789, more than operator (2501). The board never fires anyone because the scenario starts at month 60, after the board's "no firing after review year 6" rule. The ratings use absolute net worth, so a $250M start already sits on the 250M band.

**Evidence.** `PLAYTEST=1 ./node_modules/.bin/vitest run src/playtest`; report copy in this review's addendum; `src/env/scenarios.ts:71`; `src/sim/systems/board.ts`; `src/sim/systems/endgame.ts` ratings.

**Fix.**
- Make ratings and score **relative to starting capital**: use the net-worth multiple (`final / start`) together with the absolute bands, keeping today's thresholds for the classic $50M start.
- Make the board's review window start at the **campaign start month**, not month 0.
- Gold-rush cash should earn nothing idle (it doesn't now, but the score must say so).

**Done when.** A playtest test asserts that in gold-rush, idle scores ≤ 40% of operator and is fired or rated at the bottom band, and that operator beats idle on every seed.

### 7. Spurious "Unlocked: Customers / Supply" toasts at the start of every game

**Problem.** A new game immediately toasts "Unlocked: Customers" and "Unlocked: Supply" over the Needs-you card. Those docks are always unlocked. `_apply_unlocks` treats a not-yet-started first pass as locked, because `is_unlocked` returns true only once `started` is set.

**Evidence.** `1366x768_card.png`, `1280x800_settings.png`; `main.gd:_apply_unlocks`.

**Fix.** Seed `_unlocked` from `is_unlocked` (with `started = true`) right after `_new_game` and `_load_slot`, before the first `_on_changed`. Toast only on a change from false to true for keys outside `["dash", "contracts", "shop"]`.

**Done when.** The smoke test starts a fresh Operator game and asserts no toast whose text starts with "Unlocked:" in the first frame. The toast still appears when Facility first unlocks.

---

## P1: graphics pass

The hall reads as **ceramic**:
- One flat ambient colour at 0.95 energy plus ACES exposure 1.3 washes everything into the same matte blue-grey.
- Every surface is an untextured `StandardMaterial3D` or a procedural shader without normal or roughness variation.
- The floor is a uniform light tile with no grime, and the CRAH and switchgear lineups are plain boxes with black screen insets.
- In top-down views (the default camera in the screenshots) the floor fills 70% of the frame, so it matters most.

Keep the vibrant UI chips, the emissive LEDs and the cluster colours. Change the **materials** under them.

### G1. A real PBR material library (CC0, shipped with the game)

**Fix.**
1. Add `godot/assets/materials/`, sourced from **ambientCG** (CC0, no attribution needed; still list them in `CREDITS.md`). Each set has albedo, normal, roughness and metallic maps, plus AO where useful. Ship at 2K and let the importer generate mipmaps, VRAM-compressed (BPTC/ASTC already on). For Potato and Low, load a 512 or 1K copy made by `tools/textures/downscale.py` (ImageMagick) at build time.

   | Material | Use | Suggested ambientCG set | Notes |
   |---|---|---|---|
   | Powder-coated steel, black, fine orange-peel | rack shell, doors, PDU bodies | `PaintedMetal0xx` / `Metal0xx` dark | roughness 0.55–0.7, metallic 0.6; slight edge wear via curvature-free trick: brighter roughness on box edges using UV2 |
   | Perforated steel (hex) | rack doors front/back | `MetalPlates0xx` / `DiamondPlate` alt + alpha mask | normal map gives depth to holes; replaces the procedural vent dots on LOD 1/2 |
   | Brushed aluminium | CRAH fronts, busway, door handles, cable-tray rails | `Metal032` (brushed) | anisotropy on High/Ultra (`anisotropy_enabled`) |
   | Galvanised steel | cable trays, overhead strut, conduits | `Metal0xx` galvanised / spangle | |
   | Raised-floor tile, anti-static vinyl with a steel edge | hall floor | `Tiles0xx` + custom seam mask | 600 mm tiles, seams from the current shader, plus per-tile hue and roughness variation and scuffs along aisles |
   | Perforated floor tile | cold aisles | same + 25% open hole mask | |
   | Sealed concrete / epoxy | floor outside the hall boundary, plant yard | `Concrete0xx` | darker, so the hall pops |
   | Painted drywall / block | (new) hall walls, see G4 | `Plaster0xx` | |
   | Rubber/plastic | cable jackets, floor grommets, casters | `Plastic0xx` / `Rubber0xx` | |

2. Use **triplanar mapping** (`uv1_triplanar = true`, world-space) for every box-built prop, because the boxes have no authored UVs. Set `uv1_scale` per material so a 600 mm tile repeats correctly.
3. Add **detail variation**: a shared 512 px tileable noise (`NoiseTexture2D`, generated once at start and cached) feeds `detail_mask` or roughness modulation, so racks and tiles don't repeat identically.
4. Put the library in `world/materials.gd` (`class_name HallMaterials`): static, cached `StandardMaterial3D`s keyed by name and quality tier, plus `HallMaterials.apply_tier(q)`, which swaps texture resolution and turns normal maps, anisotropy and detail on or off.

**Done when.**
- Side-by-side 1920×1080 captures of `campus-rdhx`, `campus-dlc` and a top-down Overview (Balanced) show visible metal grain on racks, tile variation on the floor and brushed metal on the CRAH units.
- Docs screenshots, the website and the wiki are regenerated with `GW_SHOT` (commit the capture script as `scripts/shots.sh`).
- VRAM at 2K stays under 300 MB (`Performance.RENDER_VIDEO_MEM_USED`).

### G2. Rack faces: keep the detail, add depth, add LOD

**Problem.** `rack_face.gdshader` is flat: it computes albedo and emission only, with no normal, so ports, vents and drive bays read as painted on. It also runs the full procedural code at every distance.

**Fix.**
- **LOD 0** (near and High): keep the procedural layout but write `NORMAL_MAP` from the same masks. Holes and ports get an inward bevel, ears and handles an outward one, using the box-SDF gradient. Vary roughness: blanking panels matte, server bezels satin.
- **LOD 1:** bake the procedural face once per (platform, fill, state) into a 256×1024 atlas, using `SubViewport` render-to-texture at load. Sample the atlas plus a small emissive LED layer driven by `TIME`.
- **LOD 2** (Potato, or far away): atlas only, with the LED blink replaced by a static emissive mask.
- Choose the LOD per instance by camera distance (`instance uniform int lod` set by the hall each time the camera moves more than 2 m) or by tier.

**Done when.** At close range (`GW_CAM=yaw,pitch,3,x,z`) ports and vents show shading that moves with the light. On iGPU Low, rack-face fragment cost drops: frame time is measurably lower than with LOD 0 forced.

### G3. Lighting: give the materials something to reflect

**Fix.**
- Lower the flat ambient (energy 0.95 → about 0.35) and add a dim **sky or reflection source**: a tiny procedural panorama (`PanoramaSkyMaterial` from a 2:1 gradient with ceiling-light streaks), used only for `reflected_light_source`, so metals pick up highlights.
- On High and Ultra, add **ReflectionProbes**, one per 4 rows, set to update once.
- Lower tonemap exposure 1.3 → about 1.0 and switch to AgX (Godot 4.7), which keeps saturated LEDs from clipping to white.
- Ceiling light strips are emissive; on Balanced and above, add every second one as a real low-energy `OmniLight3D` with no shadow. On Potato, use a projected light-pool **decal** on the floor under each strip.
- Add **contact shadows and AO** under racks and plant with `Decal` nodes (soft dark square), replacing the transparent "contact shadow" boxes. That is one fewer transparent draw per rack.

**Done when.** Captures show specular highlights on rack shells and the floor, and no clipped white floor at the default camera (check the image histogram: under 1% of pixels at 255).

### G4. The hall needs walls and the plant needs to belong to it

**Problem.**
- The hall floats in a void. The floor fades to black 60 m out, and CRAH and switchgear units sit outside the red boundary line, partly off the floor (`3440x1440_dash.png`, `2560x1440_dash.png`).
- The title screen shows overhead trays and lights hanging over an empty floor (`1280x800_title.png`).

**Fix.**
- Build 4 low walls (3.6 m, painted block, with a dark baseboard) just outside the boundary line. Hide the wall nearest the camera when the camera is outside it (dot product test, the same way `_over` hides overhead at top-down pitch).
- Move the CRAH lineup inside the walls on a gallery strip, and give it brushed-aluminium fronts with louvre normal maps and small status screens. On RDHx and DLC, the CDUs get pipe stubs into the floor.
- Title screen: load a small showcase hall (one pre-filled row from `stress-all-racks` templates) and use the orbit camera, so the first impression is a lit, populated hall rather than empty trays.

**Done when.** No plant mesh lies outside the floor bounds in any `GW_SCENARIO`/`GW_HALL` capture, and the title capture shows racks.

### G5. Level of detail and culling for big halls

**Fix.**
- Set `visibility_range_end` on small props (thermal dots, busway taps, cable bundles, labels) per tier: dots 25 m, taps 20 m, labels 14 m.
- Set `lod_bias` per tier.
- Use `GeometryInstance3D.cast_shadow = OFF` for everything under 0.1 m.
- Hide whole rows outside the camera frustum by giving each row its own parent `Node3D` with `visibility_range`. Godot frustum-culls nodes but not MultiMesh sub-instances, so split MultiMeshes per row.

**Done when.** stress-all-racks (four 200-slot halls), top view: iGPU at 1280×800 holds ≥ 60 FPS on Balanced and ≥ 100 FPS on Potato after the texture pass.

---

## P1: UI and UX

### U1. Boot splash is the Godot logo

**Problem.** `project.godot` has no `application/boot_splash/*` and no `config/icon`, so the game opens with the default Godot splash and an unnamed generic window icon. The release binaries have no app icon on Windows or macOS either.

**Fix.**
- Make a 1920×1080 splash (dark `#05080d` background, the yellow GIGAWATT wordmark in Fira Code Bold, a thin cyan underline) at `godot/assets/brand/splash.png`. Set `application/boot_splash/image`, `boot_splash/bg_color=Color(0.02,0.03,0.05)`, `boot_splash/fullsize=false`, `boot_splash/use_filter=true` and `boot_splash/show_image=true`.
- Make a 1024 px icon at `assets/brand/icon.png` (a stylised rack with a lightning stripe in the dock yellow). Set `config/icon` and `config/windows_native_icon` (an `.ico` built by `magick` with 16–256 px sizes), and the macOS icon in `export_presets.cfg` (`application/icon`; Godot converts a PNG to `.icns`).
- After the splash, show a short in-engine **loading card** while the sidecar boots (`init` takes about 120 ms, `env reset` on scenarios takes 1.7 s): the wordmark plus a progress line ("Starting the engine…", "Loading save…"), then fade into the title. The 1.7 s scenario reset currently shows a frozen frame.

**Done when.** A cold launch shows the GIGAWATT splash, then the loading card, then the title, and the Godot logo never appears. The window and taskbar icon is the GIGAWATT icon on Linux (from `config/icon`) and in the Windows build.

### U2. Smooth drawer and screen transitions

**Problem.** `show_screen()` flips `visible` with no motion. Drawers, full-screen workshops, the inspector, the menu and the settings modal all appear and disappear instantly, and the hall's camera offset (`set_cover`) jumps. There are no tweens in `ui/` at all; only toasts fade.

**Fix.**
- Add `Kit.slide_in(ctrl, from := Vector2(1,0))` and `Kit.slide_out(...)` built on `create_tween()` with `TRANS_CUBIC`/`EASE_OUT`, **180 ms** in and 140 ms out. Animate `position.x` from off-screen right plus `modulate:a` 0→1. Mark the out-tween so a second click during it reverses rather than queueing.
- **Drawers** (right column): slide in from the right. Switching between two drawers cross-fades the content (80 ms) without sliding the frame again.
- **Full-screen workshops** (Design Lab, Supercomputer, Codex): fade and scale from 0.98 to 1.0. The hall fades out underneath instead of popping hidden.
- **Hall camera:** tween `cover_px` over the same 180 ms so the view glides to the new centre.
- **Modals** (settings, menu, story cards, confirm): dim the background 0→0.6 over 150 ms and scale the panel 0.96→1.0.
- Collapsible sections (`Kit` folds) animate their height.
- With `Settings.reduced_motion`, every one of these becomes an instant swap or a 60 ms fade, no slide.
- Input stays responsive: the target screen takes focus at the start of the tween, not the end. The controller focus logic in `pad.gd` must still find it.

**Done when.**
- Recorded at 60 FPS (`--write-movie` on a scripted `GW_SCREEN` sequence), each drawer change shows 10–11 interpolated frames and no blank frame.
- The smoke test still passes with `PAD OK`.
- With reduced motion on, no `position` tweens run (assert in `tests/`).

### U3. 3D rack labels are an unreadable picket fence when zoomed out

**Problem.** Every rack has a two-line vertical `Label3D` with no depth test. Beyond a dozen racks they overlap into stripes (`2560x1440_contracts.png`, `1366x768_shop.png`, `3440x1440_dash.png`), and `no_depth_test` lets them show through the KPI cards' area of the hall.

**Fix.**
- Labels show only when the camera is within 14 m, or for the hovered rack, the selected cluster and racks in a non-normal state (IDLE, DOWN).
- At distance, colour the rack top (the amber idle plate already does this; add green for earning, cyan for spot, red for down) and draw a **cluster billboard** above each cluster's centre ("Cluster 3 · Glyph AI · 24 racks").
- Turn depth testing on for labels, and orient them to face the camera's yaw (billboard Y-axis) so they don't read sideways.

**Done when.** Captures at the default camera distance show at most one label line per cluster plus labels for idle and down racks, with no overlapping glyphs.

### U4. Settings is missing the basics PC and Deck players expect

**Problem.**
- No display mode (windowed, borderless, exclusive fullscreen), no resolution or monitor choice, no V-Sync, no FPS cap, no render scale.
- The two checkboxes (colour-blind, reduced motion) render with **no visible box**, so on/off can't be seen (`1280x800_settings.png`).
- The UI scale slider has no value readout and no "Auto" option.
- The controls text is one wrapped paragraph that changes with width.
- `window/size/mode=3` (exclusive fullscreen) is forced, which is hostile on multi-monitor setups like this one (4K plus a portrait 1080p).

**Fix.**
- Split Settings into tabs: **Display**, **Graphics**, **Audio**, **Accessibility**, **Controls**.
  - Display: mode (default **borderless fullscreen**, `WINDOW_MODE_FULLSCREEN`, not exclusive), monitor, V-Sync (on, adaptive, off), FPS cap (30/40/60/120/display/uncapped) and UI scale (Auto or 0.8–2.0 with a value label).
  - Graphics: the preset plus overrides from item 2.
  - Accessibility: colour-blind palette, reduced motion, text size boost (+15%), high-contrast panels.
  - Controls: a two-column key table and a controller diagram that switches glyphs between Xbox, PlayStation and Steam Deck (`Input.get_joy_name`).
- Use a visible toggle style. `Kit` needs a `toggle()` widget with a pill switch in the accent colour.
- Persist the window mode, position and size; restore them and clamp them onto a monitor that exists.

**Done when.** Every setting survives a restart, the checkboxes visibly toggle, and a capture at 1280×800 shows the whole panel without scrolling.

### U5. Smaller UI findings (one line each, all verified in the captures)

- **Easy-path step strip** (`Order & build Burn-in Cluster Assign LIVE`) is a run-on string of words. Render it as 5 pills with done, current and todo states. Projects without a customer show "Contract", which should be the customer name or "Spec build".
- **"1 contracts serving"**: pluralise (`Kit.plural(n, "contract")`) everywhere counts appear. Grep for `" contracts"`, `" racks"`, `" GPUs"`.
- **Contract cards repeat the money 3×**: in the blue header, in the green line, and "~$232.1k/mo after power" when power is $1k. Keep the header line, and show "after power" only when it differs by more than 5%.
- **Decision card** has about 100 px of dead space between the text and the buttons (`1366x768_card.png`). Size the panel to its content.
- **Supercomputer** at 1280×800: the topology pane is about 60% of the screen and empty when no racks are picked. Show an illustrated empty state ("Pick online racks on the left") and give the space to the left column. **A100 clusters show "0 PF fp8"**: show BF16 when the part has no FP8, and format "domain 8.0" as "domain 8".
- **KPI cards on ultrawide** (3440×1440) stretch to 500 px each and cover the hall's front rows. Cap the card width at 340 px and keep them left-aligned.
- **Title screen** footer hint ("Left-drag pan…") sits under the Quit button at 1280×800, and the tagline overlaps the 3D trays. Move the hint into Settings → Controls and darken the left third behind the menu with a gradient.
- **Hall framing**: the default camera leaves the racks in the top-left with KPI cards over the bottom rows. Frame the occupied racks' AABB inside the visible rect (excluding drawer, top bar, KPI row and dock). This is item 13 left over from the last critique.
- **Text inputs** (`LineEdit` in facility, stock and design): on the Deck, call `DisplayServer.virtual_keyboard_show` on focus (Steam's keyboard appears with `steam://open/keyboard` when running under Steam), and accept controller confirm to submit.

---

## P1: gameplay findings from scripted play

All from `PLAYTEST=1 ./node_modules/.bin/vitest run src/playtest`: 8 personas × 3 seeds on classic, plus lean and gold-rush.

### B1. Revenue cliffs are still universal

**Problem.** Every operator, planner and builder run on classic logs "revenue fell 81–91% in under 6 months", typically around months 59–94. Long-running training contracts end together, and the scripted players (and humans) have nothing lined up. Renewal offers before expiry and emergency refinancing are still not built (critique #4).

**Fix.**
- Six months before a contract ends, generate a **renewal offer** from the same customer at ±10% price and 6–12 months, shown on the contract and in Needs-you.
- Add a "pipeline" line to Next Month: revenue at risk over 3 and 6 months.
- Teach the operator persona to take renewals.

**Done when.** The anomaly rule fires in ≤ 1 of 9 classic operator, planner and builder runs, and a test covers renewal offer generation.

### B2. Half the fleet sits idle

**Problem.** Average utilisation is 26–50% across competent personas, and the Needs card reports hundreds of idle GPUs mid-game (656 in the ultrawide capture). The player is buying hardware that can't find work: offer sizes don't match cluster sizes, and inference deals use a sliver of a cluster (critique #5, still partial).

**Fix.**
- Let one cluster serve several **inference** contracts at once (sum of tokens/s ≤ capacity).
- Draw per-cluster load % on the Supercomputer screen.
- Make Easy Path "fill" idle capacity first before ordering new racks.

**Done when.** Median utilisation is ≥ 55% for operator and builder on classic, with no drop in net worth.

### B3. Careful new players get fired

**Problem.** The cautious persona (small, safe builds) is fired by the board on all 3 classic seeds at month 60–72, with $33M–$52M. That is the profile of a real first-time player in Operator mode. Learner is exempt, but most players will pick Operator ("I know the basics").

**Fix.**
- In Operator mode, the first review that would strike instead issues a **warning with a concrete target** ("$400k/month by next January").
- Base strikes on growth (revenue up year over year) as well as the absolute target.
- In Operator mode, firing needs three strikes **and** negative net-worth growth since the start.

**Done when.** Cautious survives classic in Operator mode on all seeds with a "Struggling" or "Steady" rating, idle and spotter are still fired, and the balance tests are updated.

### B4. Persona coverage gaps

- **planner ≈ operator**: identical outcomes within 1% on every seed. The planner's extra actions (PPAs, frameworks, lifecycle) don't change anything. Either they have no effect, which is a design bug, or the persona never triggers them. Log per-persona action counts in the report and fix whichever it is.
- **tycoon on lean** ends exactly like idle ($6.8M, 0 contracts). The persona takes no action when cash is low. Make it act within its budget.
- **builder variance**: $107M to $1.37B on classic seeds 22 and 23. One seed runs away; find out which mechanic does it (`docs/playtest/report.md` timelines) and cap it.

**Done when.** The report has an actions table, planner differs from operator in at least one outcome column by ≥ 10%, and tycoon on lean signs at least one contract.

---

## P2: platform and release hygiene

1. **Steam Deck checklist** (for Deck Verified later):
   - Default to the Potato preset and a 40 FPS cap on the Deck.
   - Show controller glyphs, not keyboard hints, when the last input was a joypad: the coach and toasts still say "press Space".
   - Make every screen reachable with D-pad and A/B; the smoke test's `PAD OK` covers some of this, so extend it to every drawer tab.
   - Handle suspend and resume: on `NOTIFICATION_APPLICATION_FOCUS_OUT` pause the speed and autosave.
   - Ship a `.desktop` file and icon in the Linux tarball.
2. **macOS**: the zip is ad-hoc signed and needs `xattr -dr com.apple.quarantine`. For a public beta this reads as malware. Budget an Apple Developer ID for signing and notarisation in CI (`codesign`, `notarytool`). Until then, the release notes and wiki must show the right-click → Open path with a screenshot.
3. **Windows**: unsigned (SmartScreen). Same choice: a code-signing certificate, or a clear wiki page with screenshots.
4. **Leaks at exit**: the soak ends with `3 resources still in use`, `2 RID allocations … DummyTexture` and `2 … FontAdvanced` leaked. Free the `Fonts` statics and the theme on `NOTIFICATION_WM_CLOSE_REQUEST`. Add `--verbose` to the soak in CI and fail on "leaked".
5. **Crash safety**: the sidecar exits when Godot is killed (verified: no orphan `node` after `kill -9`). Keep it that way; add a test.
6. **Logs for bug reports**: write `user://logs/gigawatt.log` with version, OS, renderer, adapter, window size, UI scale and quality. Add a "Copy diagnostics" button in Settings and link it from the bug template (`.github/ISSUE_TEMPLATE/bug.yml`, new).

---

## Suggested order

1. 0.1 benchmark harness → items 1, 7 (quick), 3, 4 (performance foundation).
2. Item 2 presets, then G1–G5 (textures and LOD on top of the new presets, measured with the harness after each step).
3. Item 5 + U4 (Deck readability and settings), then U1–U3 and U5.
4. Items 6 and B1–B4 (balance; re-run the playtest and update `src/economy.balance.test.ts`).
5. P2 hygiene, then regenerate screenshots, website and wiki, CHANGELOG `[0.6.0]`, release.

## Addendum: evidence files

Selected captures are in `docs/review-0.6/*.webp`, named `<window size>_<screen>`. The full persona report is `docs/review-0.6/playtest-2026-11-08.md`. `docs/review-0.6/bench-draft.sh` and `sizes-draft.sh` are the throwaway scripts behind the numbers; use them as the starting point for 0.1, and delete the folder once `scripts/bench.sh` exists. Regenerate everything with the harness from §0:
- Window sizes captured: 1280×800, 1366×768, 1920×1080, 2560×1440, 3440×1440 and 3840×2160 × {title, Overview, Customers, Design Lab, Supply, Supercomputer, decision card, Settings}.
- Persona report: same command as B1; every number quoted above is from the 2026-11-08 run.
