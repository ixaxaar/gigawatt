# Android and iOS

What is in the project, what works, and what is missing before a store build.

## Done
- **Layout.** `godot/game/layout.gd` picks the phone layout on Android and iOS (screens under 3.6 inches on the short side) and the handheld layout on tablets. The phone layout is landscape-only (`display/window/handheld/orientation=4`, sensor landscape; 6 would mean any orientation, iOS preset: landscape left and right). Touch input: one-finger pan and tap, two-finger pinch and orbit (`world/hall_view.gd`). Check any layout on a desktop with `GW_LAYOUT=phone` and a 2400x1080 window.
- **Engine transport.** `src/bridge.ts` serves the engine over a loopback socket with `--port N` (or `GW_ENGINE_PORT`), and `godot/engine/bridge.gd` connects to it when it cannot spawn a process (Android, iOS; port from the `gigawatt/engine_port` project setting, default 47820). Verified on desktop: start `node godot/sidecar/bridge.mjs <save dir> --port 47823`, then `GW_ENGINE_PORT=47823 godot --path godot`.
- **Export presets** for Android (arm64, Gradle build, package `ing.gigawatt.game`) and iOS (project export, same bundle id) in `godot/export_presets.cfg`; `sidecar/*` is included in the package.

## Missing
- **An in-process Node.** Phones cannot spawn `node`. The engine is plain JavaScript, so the plan is [nodejs-mobile](https://github.com/nodejs-mobile/nodejs-mobile): an Android plugin (AAR, Godot plugin v2) and an iOS framework that start Node on a background thread with `sidecar/bridge.mjs <user data dir>/saves --port 47820` before the game connects. Not built or run here.
- **Signing and stores.** An Android keystore, Play Console listing, an Apple developer account, provisioning and TestFlight.
- **Testing on devices.** Nothing has run on a real phone or tablet; the phone layout has only been checked in desktop windows at 2400x1080.
- **Performance.** Mobile GPUs need the Potato or Low tier by default; the tier auto-detect has not been tuned for them.

## Android build (v0.8.1)
`scripts/build-android-native.sh` installs the Gradle template, fetches nodejs-mobile, builds the JNI shim (`godot/android/native/gwnode.cpp`) and copies the Java `NodeRunner` in; then `godot --headless --path godot --export-debug Android build/android/GIGAWATT-debug.apk` produces an APK (arm64-v8a; set `architectures/x86_64=true` for an emulator).
- **Verified on a Pixel 9a (Android, Mali-G715, Vulkan Mobile):** the APK installs, Node starts in-process (`engine listening on 127.0.0.1:47820`), the game connects, and the Home screen renders in landscape (activity orientation `USER_LANDSCAPE`) at 2424x1080.
- **Emulator:** the x86_64 emulator (SwiftShader graphics) crashes inside Godot's native library a few seconds after start; the phone does not, so treat that as an emulator problem.

## Touch and responsive layout (v0.8.1)
- **Touch is a first-class input**, like mouse+keyboard and gamepad: `game/touch_scroll.gd` scrolls any list by dragging from anywhere (cards and buttons included; a drag that starts on a button cancels the tap), scrollbars are hidden on touch, and buttons are at least 52 logical px tall.
- **Drawers resize.** Every drawer has a divider with a pill grip on its edge (`ui/drawer_grip.gd`): drag it to size the drawer (phones start at 30% of the width, the choice is saved), tap it to fold the drawer away. Works on every layout, not only phones.
- **Responsive text.** `game/wrap_guard.gd` wraps any label or button inside a scrolling screen that is wider than the screen's visible width; header rows flow onto several lines (`Kit.head_row`), and every touch screen sits in a `ScreenScroll` so nothing is cut off (it scrolls).
- `GW_AUDIT=1` prints controls that are squeezed to a sliver and stretched tall; `GW_LAYOUT=phone` with a 2424x1080 window previews the phone layout on a desktop.
- Halls have no walls at all (open plan); the Walls option was removed from the site picker.
- **Safe area.** The interface sits inside the display's safe area (camera cut-outs, rounded corners) plus a small margin on phones (`GW_INSET="l,t,r,b"` previews it on a desktop).
- **Reflowing columns.** Multi-column screens (Design, Procure, Codex) stack when narrow (`Kit.cols_row` / `Kit.fit_split`); the Supercomputer builder on touch is one row of cards you swipe left and right, each card scrolling up and down.
- Scroll positions are restored the same frame after a screen rebuild (no jump to the top when you toggle a button); touch-scroll picks the innermost list that can still move that way and ignores lists covered by a pop-up.
