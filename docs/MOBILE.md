# Android and iOS

What is in the project, what works, and what is missing before a store build.

## Done
- **Layout.** `godot/game/layout.gd` picks the phone layout on Android and iOS (screens under 3.6 inches on the short side) and the handheld layout on tablets. The phone layout is landscape-only (`display/window/handheld/orientation=6`, iOS preset: landscape left and right). Touch input: one-finger pan and tap, two-finger pinch and orbit (`world/hall_view.gd`). Check any layout on a desktop with `GW_LAYOUT=phone` and a 2400x1080 window.
- **Engine transport.** `src/bridge.ts` serves the engine over a loopback socket with `--port N` (or `GW_ENGINE_PORT`), and `godot/engine/bridge.gd` connects to it when it cannot spawn a process (Android, iOS; port from the `gigawatt/engine_port` project setting, default 47820). Verified on desktop: start `node godot/sidecar/bridge.mjs <save dir> --port 47823`, then `GW_ENGINE_PORT=47823 godot --path godot`.
- **Export presets** for Android (arm64, Gradle build, package `ing.gigawatt.game`) and iOS (project export, same bundle id) in `godot/export_presets.cfg`; `sidecar/*` is included in the package.

## Missing
- **An in-process Node.** Phones cannot spawn `node`. The engine is plain JavaScript, so the plan is [nodejs-mobile](https://github.com/nodejs-mobile/nodejs-mobile): an Android plugin (AAR, Godot plugin v2) and an iOS framework that start Node on a background thread with `sidecar/bridge.mjs <user data dir>/saves --port 47820` before the game connects. Not built or run here.
- **Signing and stores.** An Android keystore, Play Console listing, an Apple developer account, provisioning and TestFlight.
- **Testing on devices.** Nothing has run on a real phone or tablet; the phone layout has only been checked in desktop windows at 2400x1080.
- **Performance.** Mobile GPUs need the Potato or Low tier by default; the tier auto-detect has not been tuned for them.
