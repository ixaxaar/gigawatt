# v0.7 requirements: logos, surroundings, cables, rack showroom

Four player-facing features, written so an implementer can start without asking. Same ground rules as `docs/REVIEW-0.6.md` §0 (checks that must stay green, sidecar rebuild, quality tiers, no history phrasing in docs). Every item must respect the graphics tiers in `godot/game/settings.gd` and not regress `docs/perf/bench.md` by more than 10% on the iGPU at Balanced/1280x800.

Suggested order: A (small, high charm) → D (replaces a dull screen) → C (needs D's rack model) → B (new-game flow).

---

## A. Customer logos

**Why.** Customers are text today (a name and a voice line). A logo makes a contract card, the rack label and the end screen feel like a business you serve.

**Fix.**
- Generate a logo per customer procedurally, deterministically from the customer name (no art assets, no trademark risk; the customers are fictional). A logo is a `Logo` Control (`godot/ui/logo.gd`, `class_name Logo`, then `godot --headless --path godot --import`) that draws: a rounded or hexagonal badge in a colour from a fixed 12-colour palette (hash of the name), a bold glyph or monogram (first one or two letters) and one of 8 simple marks (ring, bars, chevron, grid, wave, split, spark, orbit). Archetype tints the badge border: startup, lab, enterprise, sovereign.
- Sizes: 28 px on contract cards and the Overview customer list, 20 px in toasts and the log, 48 px on the end screen's "best deal", 96 px on the chapter and decision cards when a customer is named. Cache one texture per (customer, size).
- 3D: the rack-top label shows the monogram badge as a small `Sprite3D` (or a quad with the cached texture) next to the name, only inside the label-visibility range; Potato tier skips the sprite.
- Rival companies get logos with a fixed angular style so they read as competitors.
- Customer voice lines (in `src/sim/story-data.ts`) stay as they are; show the logo beside the quote.

**Done when.** Every contract card, the Needs-you card (when it names a customer), the customer list, toasts that name a customer, and the end screen show the same logo for the same customer; two different customers never share both colour and mark (test over all names in `story-data.ts` and 500 generated names); `GW_SMOKE=1` still prints SMOKE OK; docs screenshots are regenerated with `scripts/shots.sh`.

---

## B. Choose the surroundings before the game starts

**Why.** The hall is the player's stage. Picking floor, walls and mood before day one makes it theirs, costs nothing in gameplay, and gives screenshots variety.

**Fix.**
- New step on the title flow: after picking a mode, a **Site** screen (skippable with "Use defaults"). Left: option rows; right: a live 3D preview of the empty hall with the choices applied (reuse `HallView` in a small `SubViewport`, orbiting).
- Options, all cosmetic and saved with the game (`state.site = {floor, walls, light, accent, ...}` in `src/types.ts`, default values for old saves, covered by a save-load test):
  - **Floor**: raised-access tile (default), polished concrete, epoxy grey, dark checker, anti-static green.
  - **Walls**: painted block (default), corrugated metal, brick, glass curtain, none (open-plan).
  - **Lighting mood**: neutral white (default), cool blue, warm amber, night shift (dim, with more emissive).
  - **Hall accent colour** for the boundary line and cable trays: red (default) plus 5 more.
  - **Location flavour** (name only, plus a skyline-free backdrop tint): the existing 3-4 region names; if the engine already has regions with price differences, tie the label to the real choice rather than inventing one.
- Implement floors and walls as entries in `HallMaterials` (`world/materials.gd`): add more ambientCG CC0 sets (list them in `CREDITS.md`), same per-tier texture budget (512 px at Potato to Balanced, 1K at High and Ultra, normal maps from Low up).
- A **Change look** entry in the pause menu to switch later; changes apply with `hall.rebuild()`.
- The Site step has controller navigation and works at 1280x800 without scrolling.

**Done when.** A new game with non-default choices shows them in the hall, survives save and load, and old saves load with defaults; every combination renders (smoke test loops all floor x wall pairs once and rebuilds the hall); no combination breaks label legibility (check contrast of the rack-top labels over each floor in a screenshot sheet); the wiki's Getting started page documents the Site screen.

---

## C. Cables between GPUs and the top-of-rack switch

**Why.** The racks have cluster cabling overhead, but inside the rack nothing connects the GPUs to the ToR. The game is about networking; the player should be able to see why a rack is fast.

**Fix.** Draw cabling on the rack model (this shares the rack model from D, so build the model once as `world/rack_model.gd` and use it in both places).
- **Rack model.** `RackModel` builds a 42U rack from a rack design: shell, ToR switch at the top, one chassis per tray (from the design's items: platform sets height and look), PDUs, cable looms. Use the PBR materials from `HallMaterials`; vendor accent colour from the existing `_vendor_color`. It must be cheap: one `MultiMesh` for the repeated chassis fronts and one shared material.
- **Cabling, three levels of detail:**
  - *Close (rack detail, D showroom, hall camera under ~6 m):* real cables as `Path3D`-free swept tubes made from a few cylinders or a baked `ArrayMesh` per rack design (cached per design id): one fibre or DAC per GPU NIC from the chassis rear to the ToR, coloured by link type (NVLink spine purple, InfiniBand/Ethernet scale-out green or gold, management grey), gentle drooping curves, bundled with velcro bands every 20 cm. Cable count and colour must match the design's real NIC and fabric data (`src/sim/network.ts` stats).
  - *Mid (6 to 16 m):* a single coloured loom per rack from chassis block to ToR.
  - *Far (hall view):* none inside racks (the existing overhead cluster runs stay).
- **State feedback.** A failed or burning-in rack shows its cables dimmed; an oversubscribed fabric (from `network` stats) pulses the uplink cables amber.
- Tier budget: Potato and Low never draw cables inside racks (looms only in the showroom); Balanced mid LOD; High and Ultra full.

**Done when.** The showroom (D) shows one cable per modelled NIC, count asserted against `stats` for three platforms (HGX, a rack-scale NVL72-style, a non-NVIDIA one); the hall at close range shows cables only for racks within range; draw calls in the stress-campus scene at Balanced stay within 10% of `docs/perf/bench.md`.

---

## D. Procurement: a rotating rack showroom instead of two rows of cards

**Why.** Step 1 of the Procure drawer is a grid of text cards, two columns of "HGX H200 8-GPU ships 2024 (locked)". A turntable rack that changes with your choice is the first moment of desire in the game, and it teaches what you are buying.

**Fix.**
- Replace the platform grid in the guided planner with: a **showroom panel** on top (about 40% of the drawer height) and a **single-row carousel** of platform chips below it (logo of the vendor, name, status chip: available, pre-order, locked with the year).
- Showroom panel: a `SubViewportContainer` with its own world (`own_world_3d = true`), a dark studio floor with a soft turntable disc, 3 lights, the `RackModel` for the selected platform rotating slowly (auto-rotate 12 degrees per second; drag to spin; wheel to zoom). Door closed shows the front; a **Door** toggle opens it to show the trays; a **Cables** toggle shows the cabling from C once it exists (hidden until then).
- Beside the model, an overlay card: name, accelerators per rack, kW, cooling interface, memory, scale-up domain, price per rack, lead time, and the existing "can your hall feed and cool it" verdict with a red or green lamp.
- Locked platforms show a silhouette (same model, dark and unlit) with the unlock year. Switching chips cross-fades and re-targets the turntable in 150 ms (reduced motion: instant).
- Tiers: Potato renders the viewport at half size with no shadows and a static rotation of 4 pre-rendered angles (fallback if the turntable cannot hold 30 FPS); Low and Balanced animate without shadows; High and Ultra use shadows and reflection.
- The Design Lab's rack bench can reuse the same panel as a live preview of the saved rack.
- Controller: LB and RB cycle the carousel, right stick spins the model, A selects.

**Done when.** Selecting any platform in Procure updates the model within 150 ms and the numbers on the overlay match the card values used before; locked platforms render as silhouettes; the drawer still fits at 1280x800 with the order controls visible without scrolling; the showroom costs under 1.5 ms of GPU frame time on the 4090 at Balanced and does not tank the iGPU (Low at 1280x800 stays above 60 FPS with the drawer open); a headless smoke path builds the `RackModel` for every template once without error.

---

## Cross-cutting

- Add each feature to `CHANGELOG.md` under the next version, a short section in the matching wiki page (`customers-and-contracts.md`, `getting-started.md`, `servers-and-racks.md`, `networking-and-clusters.md`), and refresh screenshots with `scripts/shots.sh` (add shots for the Site screen and the showroom).
- Keep every new text at 13 px or above (`Kit.fs`); the smoke test fails otherwise.
- All new randomness comes from names or ids (deterministic); nothing may use the engine's seeded RNG.
