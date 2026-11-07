# Changelog

All notable changes to GIGAWATT. Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow [SemVer](https://semver.org/).

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
