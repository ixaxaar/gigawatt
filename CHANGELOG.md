# Changelog

All notable changes to GIGAWATT. Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow [SemVer](https://semver.org/).

## [0.9.0] - 2026-11-09 (alpha)

First alpha for friends. A full critique pass (six testers on desktop at nine resolutions, a Pixel 9a, a virtual Steam Deck controller, a random-button tester and a code review; see `docs/CRITIQUE-0.8.md`) drove this release.

### Fixed
- **The title screen no longer overwrites your autosave.** Its background demo used to play 22 months and save over the "auto" slot, so Continue loaded the demo. The demo now runs with autosave off (regression test in `src/engine/savefile.test.ts`).
- **Controller:** A now presses the focused control and B closes dropdowns (the project had no input map, so A did nothing). Focus no longer escapes the site picker, the Load dialog or Easy Path confirmations; the Supply cards, checkboxes, dropdowns and sliders can be reached and changed with the D-pad; the tutorial card's "Got it" takes focus. Sliders apply a moment after the last step instead of only on mouse release.
- **Android:** Back no longer quits. It closes the top dialog, leaves the drawer, then opens the pause menu. The game autosaves when the app is paused. The pause menu has no "Save & quit game", and Settings has no Window mode or V-Sync on phones. The desktop-style "Vulkan could not start" warning is gone (phones run Vulkan Mobile).
- **Dialogs:** Space and the other hotkeys do nothing behind a chapter card, keynote, decision, pause menu or Settings; Esc closes the top dialog (never stacks the pause menu, never quits from the title or site picker); F1 toggles Settings.
- **Short screens (Steam Deck 1280x800, 720p and 768p laptops):** the title uses the two-column layout so Settings and Quit are reachable; the pause menu is a panel in two columns; Settings tabs wrap and Close sits in the header; the Codex parts list is no longer blank; the top bar drops its least important stats instead of pushing NEXT and MENU off-screen.
- **The rack tooltip** disappears when the pointer leaves the 3D hall; it no longer follows the mouse over drawers and dialogs.
- **Toasts** stack bottom-left above the dock (at most three, bad news stays longer, hidden behind dialogs, never over a drawer header). The tutorial card moved bottom-left too and hides on the full-screen workshops.
- Build: the placement panel is compact; clicking an occupied rack inspects it instead of buying another; the text no longer promises to place into the clicked slot.
- Typing a hall name no longer pans the camera; releasing the mouse over a drawer no longer leaves the camera dragging; taps in a drawer's gaps and on full-screen pages no longer reach the hidden hall.
- Phone: energy and Home drawers no longer clip text at the right edge; the site picker's buttons sit inside the safe area; tapping a Design Lab socket scrolls to the part picker.
- "100%% bought" typo on Energy.

### Added
- **Camera buttons for touch:** zoom +/−, top view, heat view and rack labels.
- **Learner glossary** ("WORDS": SLA, tok/s, Mtok, TTFT, TP, ramp window, PUE, InfiniBand/RoCE) at the top of Customers, Supply and Supercomputer.
- **Confirmations** on Easy Path (cost and payback), Let go, Sell all and Uncluster; ordering and Easy Path report the result as a toast.
- **"N racks are down"** in the Overview's Needs card, with when they are back and what shortens it (regression test in `src/engine/needs.test.ts`).
- Settings > Controls lists the missing keys and a Touch section; tutorial text follows the input device (mouse, touch, controller) and the phone's dock names.
- The website says "Alpha" and links to issues and discussions.

### Known gaps (alpha)
- The Design Lab boards (tray and rack) cannot be operated with a controller or the keyboard alone.
- Keyboard-only play is limited to hotkeys; Tab navigation only exists in controller mode.
- Light themes (Paper, Sand, Mist) have weak contrast in places.
- UI does not scale with ultrawide screens beyond the height-based scale.
- Android APK is built by hand (not in CI) and cannot be made 16 KB page-aligned (a nodejs-mobile limit); iOS is untouched.

## [0.8.1] - 2026-11-08

### Added
- **Android build (preview).** A signed arm64 APK (`GIGAWATT-v0.8.1-android.apk`, on the release and the site) runs the engine inside the app (nodejs-mobile) and plays on a real phone (checked on a Pixel 9a). Not a store build; see docs/MOBILE.md.
- **Touch as a first-class input.** Drag-scroll from anywhere (cards and buttons included, no scrollbars), buttons at least 52 px tall, and one scroller per screen that keeps its position when a card is pressed.
- **Resizable drawers on every layout.** A divider with a pill grip on each drawer's edge: drag to size the drawer (30% on phones by default, remembered), tap to fold it away.
- **Safe area.** On phones the interface keeps clear of camera cut-outs and rounded corners.
- **Responsive screens.** Text and buttons wrap to the drawer's width; header rows flow onto several lines; Design, Procure and Codex columns stack when narrow; the Supercomputer builder is a row of cards you swipe left and right.
- A landscape two-column title screen and a two-column pause menu for phones.

### Changed
- **No hall walls.** Halls are always open plan; the Walls option is gone from the site picker.
- Phones are now truly locked to landscape (v0.8.0 used the wrong orientation value).
- Cluster and per-rack cables stay visible at every zoom level (only their detail drops with distance).
- The Next button in the top bar is wide and labelled on phones and handhelds.
- Two-finger orbit is slower (half speed).

### Fixed
- The screen no longer jumps to the top and back when you select a card in Procure and other screens.
- Header hints no longer wrap one word per line in narrow drawers.

## [0.8.0] - 2026-11-08

### Added
- **Networking is part of the game loop.** Scale-out links now flap and die: optics most, AOC less, DACs almost never, more often on bigger fabrics and with a short-staffed crew. A down link cuts the cluster's scale-out bandwidth (a collective is only as fast as its slowest rail) until it is replaced: next month from spares on the shelf, after a 3-month RMA without. Keep spare cables and optics in the Warehouse. The engine has its own random stream for this, so existing contract and failure draws are unchanged.
- **Network health on screen.** A NETWORK box in the top bar (bandwidth left, links down, or uplink saturation; click to open the Supercomputer screen), a Network card on the Overview (per-cluster fabric, GB/s per GPU, oversubscription, links down, internet uplink use), "links down" and "uplink nearly full" entries in Needs you now, a warning on the Supercomputer screen, and faulted clusters' overhead runs and billboards turn red in the hall.
- **Device layouts.** The shell now has three layouts, picked automatically and forceable in Settings ▸ Display: desktop (monitors, laptops, consoles), handheld (Steam Deck, 7-8 inch tablets, small laptop windows: compact top bar, bigger dock, wider drawers) and phone (a slim top bar, a dock rail down the left edge, full-screen drawers, 2x scaling). Phones and tablets are locked to landscape. Touch: one finger pans and taps, two fingers pinch to zoom and orbit.
- **Mobile groundwork.** The engine can serve its protocol over a loopback socket (`bridge.mjs --port N`, or `GW_ENGINE_PORT`), the game connects to it when no process can be spawned, and Android and iOS export presets are in the project. Store builds still need an in-process Node host: see docs/MOBILE.md.
- Orange cable clips along the overhead cluster runs.

### Changed
- **Procure showroom** rebuilt: dark studio with a glossy floor and turntable, 4x MSAA and ambient occlusion where the tier allows, smoked-glass door and side panels without the washed-out highlights, rack rails with U markings, rack ears and handles, drive bays, blanking panels over empty units, an accent stripe on every chassis.
- The top bar no longer clips at 1280x800 (Menu was cut off on the Steam Deck).
- Screenshots and guide clips are rendered at 3840x2160 and 2560x1440 and downscaled with Lanczos before compression.

## [0.7.0] - 2026-11-08

### Added
- **Customer logos.** Every customer and rival gets a logo drawn from its name (badge shape, colour, mark and a monogram); no two share a colour and mark. They show on contract cards, the Overview, the rack inspector, the end screen's best deal and, up close, on rack tops in the hall.
- **Rack showroom.** The Supply drawer's platform picker is a turntable: pick a platform from a one-row strip and the rack on the turntable changes, with the front door and a cabling view as toggles, a card with the key numbers and a "can your hall take it" lamp, and silhouettes for platforms that have not shipped.
- **Tied and tagged cabling.** Rack rears show one cable per network port to the top-of-rack switch, run in vertical cable managers with ties and tags and modelled plugs, plus an NVLink spine on rack-scale systems; levels of detail by distance and preset.
- **Site screen.** Before a new game (and from Menu ▸ Change look) choose the floor (grey tile, white tile, black marble, oak parquet, dark walnut, steel plate, concrete, terrazzo, checker, anti-static green), the rack finish (black, white, brushed steel, graphite), the walls, the lighting and the accent colour, with a live 3D preview. Cosmetic only; saved with the game.
- **UI themes.** Four dark (Midnight, Graphite, Ember, High contrast) and three light (Paper, Sand, Mist), switchable live in Settings ▸ Display.
- **Guide clips.** Scripted looping clips (the loop, the showroom, the cabling, the looks, the themes) in the README, the wiki's "See it in action" page and the website, recorded by `scripts/gifs.sh`; `scripts/shots.sh` retakes the screenshots, now with close-ups.
- Wiki pages "See it in action" and "Make it yours".
- **Money line in the top bar.** Cash, revenue, burn and net per month, net worth, debt (only when you have a loan) and reputation sit in the top bar with tooltips; the bottom cards on the Overview are gone.

### Changed
- **Graphics card and auto settings.** Auto picks the best GPU Vulkan offers (the discrete one when present) and Ultra for high-end cards (RTX 3080/4070/5070 and up, RX 7800 XT/9070 and up), High for other discrete cards, Low for integrated. If a stale `VK_ICD_FILENAMES` pushes the game onto OpenGL, it restarts itself on the right GPU. Settings ▸ Graphics has a Graphics card choice (Auto, Discrete, Integrated) on Linux.
- Website scales up on 4K and high-density screens and uses the animated clip as its hero.
- The Site screen is shown for the first new game only; later games reuse the last look (Menu ▸ Change look edits it).
- The title screen warns when the game fell back to OpenGL on the integrated GPU (a stale `VK_ICD_FILENAMES` does this) and says how to fix it.
- **Font.** Chakra Petch (OFL) replaces Fira Code in the game, website and wiki: narrower and sharper at small sizes.
- **Start-up sound** is a soft low swell instead of a bright chime, about 6 dB quieter with almost nothing above 2 kHz.
- Website restyled: darker stat strip with coloured numbers, new Watch and Make-it-yours sections.
- README, website and wiki screenshots retaken with the textured hall.

## [0.6.0] - 2026-11-08

### Added
- **Graphics presets** (Potato, Low, Balanced, High, Ultra) with a first-run auto-detect (integrated GPUs and the Steam Deck start on Low), a 3D render scale with FSR so the interface stays sharp on weak GPUs at 4K, and a frame-rate limit. The game idles at a low frame rate while paused and in the background.
- **Settings in five tabs** (Display, Graphics, Audio, Accessibility, Controls): window mode, V-Sync, UI size (Auto by default), text-size boost, visible on/off switches, and a "Copy diagnostics" button.
- **Textured hall.** CC0 metal, plate, aluminium, plaster, rubber and floor textures replace the flat ceramic look; rack faces get depth and three detail levels; the hall has walls (the ones between you and the hall hide themselves) and the plant sits inside them.
- **Early renewals.** A happy customer puts the renewal offer on the board four months before the contract ends, so revenue does not fall off a cliff on the last day.
- A **title-screen backdrop** (a lit hall with racks), a splash image and an app icon.
- Smooth slide and fade transitions for drawers, workshops and modals (instant fades with reduced motion).
- Cluster billboards when zoomed out; per-rack labels appear when you are close, or when a rack is idle or down.
- `scripts/bench.sh`, a GPU benchmark (FPS, draw calls, video memory) with results in `docs/perf/bench.md`; the player wiki has a Performance and settings page; a bug-report template that asks for diagnostics; `CREDITS.md`.

### Changed
- Linux launcher ignores a stale `VK_ICD_FILENAMES` (which made Vulkan fail and the game fall back to OpenGL), starts on Vulkan and honours `GIGAWATT_GPU=dgpu|igpu`.
- Text is never smaller than 13 px at 1080p, and screens under 1080p scale the interface to native size instead of shrinking it.
- Late-start scenarios (the gold rush) get their first board review after one year, so doing nothing no longer wins. In Operator mode a company that is clearly growing passes a review it would otherwise miss; strike messages name next year's target.
- Mesh, material and picking work in the hall is shared and cached; the open screen refreshes at most a few times a second while the game auto-advances.
- Overview: counts are pluralised, Easy Path steps are pills, and the decision card fits its text. The Supercomputer screen shows BF16 for GPUs without FP8.

### Fixed
- "Unlocked: Customers" and "Unlocked: Supply" toasts at the start of every new game.
- Supercomputer topology text was unreadable in small windows.

## [0.5.0] - 2026-11-07

### Added
- **Investor board.** Margaux Vance, Dev Okonkwo and Ilse Brandt review your revenue each January from the second year on. Three missed reviews in a row and you are fired (Learner mode only warns).
- **Story.** A chapter card every January, 14 two-way decisions that lapse after three months, three rivals with their own headlines, and 19 customers who say something when they renew or walk.
- **Six endings** (IPO, acquired, steady independent, fire sale, bankrupt, fired) and a new end screen: revenue and cash charts, best deal, worst incident, rival comparison and a copyable summary.
- **Needs you now** card on the Overview: the single most urgent thing, with a button (customer about to walk, revenue cliff, understaffed, idle GPUs, board strike, pending decision).
- **Contract cards lead with the money:** monthly revenue, total value and profit after power; offers sort by profit.
- **Progressive unlocks:** a fresh Learner or Operator game shows Overview, Customers and Supply; the rest appear as they are needed.
- **Player wiki** at gigawatt.ing/wiki: 14 pages with screenshots, search, a FAQ and a glossary (source in `docs/wiki`, `node scripts/build-wiki.mjs`). GitHub Discussions for the community.
- Incident handbook in the Codex (the lesson behind each incident and dated event).
- The datacenter hum follows the hall: louder and brighter as it fills, pumps with liquid cooling, a dip on power-down.
- Playtest tooling: installed vs clustered GPUs and utilisation columns, anomaly rules, planner and builder personas, every persona on every scenario; `src/economy.balance.test.ts` pins the intended economy.

### Changed
- **Economy rebalanced.** Inference is priced off what a GPU-hour earns (bounded by real API prices); the spot market saturates and pays less for older generations; the top-of-generation price no longer climbs through 2027; understaffing costs availability; customers allow longer ramp windows while GPUs are scarce and grant one extension to a build that is visibly under way; ratings and scoring recalibrated.
- Easy Path orders missing power and cooling itself, alerts within a month when it is stuck, and gives up after 10 months instead of 16.
- HUD reduced to mode, speed, Next month and Menu; Overview sections collapse; rack labels show earning, idle, spot, burn-in or down, and idle racks get an amber plate.
- Incident log lines are short; the lessons moved to the Codex.
- Music: six tracks (the arcade chiptune is gone), encoded at a higher bitrate with a 3 second tail fade; loudness measured in `tools/audio/LISTENING.md`.

### Fixed
- Signed contracts could sit unassigned for a year because the Easy Path never ordered the plant a rear-door or liquid hall needed.
- Unit prices ($/GPU-hour, $/Mtok) were rounded to whole dollars on contract cards.

## [0.4.0] - 2026-11-07

### Added
- **Sound.** 33 synthesised effect cues (UI, banknote and coin money sounds, events and alarms), three audio buses (Music, SFX, Ambience), and volume and music-style controls in Settings.
- **Music.** Seven long, bass-heavy tracks (lo-fi hip-hop, dub techno, trip-hop, ambient, future garage, synthwave, dark ambient) chosen by a mood director: lo-fi on the title, a rotating mix while building, dark ambient during crises.
- **Persistent saves.** Saves are written to disk by the engine sidecar. The title screen has Continue, quitting saves, and the tutorial resumes where you left off.
- **Tutorial and hardware keynotes** with pre-orders at a launch premium.
- **Project website** with OS-aware downloads and a heat-lab calculator.
- `tools/audio/` generator for all sounds and songs (numpy, scipy, ffmpeg).

### Changed
- Design Lab motherboard redrawn with real-world part proportions.
- Rack tops stay dark so labels read; cluster colour and thermal state are shown as rails and dots.
- The supercomputer default fabric picks parts that speak the chosen technology.

## [0.3.0]

- Order cancel and reduce, top view with panning, drawer-based UI, gamepad and Steam Deck support.

## [0.2.0]

- Rivals and contract renewals, vendor frameworks, maintenance and burn-in policy, next-month preview.
- Economy rebalanced from scripted playtests; playtest harness and soak tests.
- Kinder rating tiers and MoE scale-up domains matching shipping racks.

## [0.1.1]

- Game over screen, save slots, Operations screen, long-form objectives, era events and disasters.
- Ending and score, bankruptcy, hardware lifecycle and resale, staffing, loan repayment.
- Machine ledger, expandable floor, deploy and cluster fixes.
