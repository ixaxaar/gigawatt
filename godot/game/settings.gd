class_name Settings
extends RefCounted
## User preferences (user://settings.cfg): volume, display, graphics, accessibility.

static var volume := 0.8
## Music and effects sit under the master volume. music_mode: "auto" (mood-driven shuffle), "off", or a catalog song id (loops that genre).
static var music_volume := 0.7
static var sfx_volume := 0.9
static var music_mode := "auto"
## UI scale on top of the automatic window stretch. 0 = auto (handhelds and small laptops are scaled up to native size).
static var ui_scale := 0.0
static var text_boost := 1.0
static var colorblind := false
static var reduced_motion := false
static var high_contrast := false
## UI colour theme id (see Kit.THEMES).
static var theme := "midnight"
## Graphics preset: -1 = auto-detect, else 0 Potato, 1 Low, 2 Balanced, 3 High, 4 Ultra.
static var preset := -1
## 3D render scale override (0 = the preset's own value). The UI always renders at native resolution.
static var render_scale := 0.0
## Display: 0 windowed, 1 fullscreen (borderless), 2 exclusive fullscreen.
static var window_mode := 1
## 0 off, 1 on, 2 adaptive
static var vsync := 1
## 0 = the preset's cap (display refresh or 40 on a Deck)
static var fps_cap := 0
## Guided first run: "on" until finished or dismissed, then "off" (restart it from the menu).
static var tutorial := "on"
static var tutorial_step := 0
const PATH := "user://settings.cfg"
const TIER_NAMES := ["Potato", "Low", "Balanced", "High", "Ultra"]

## Resolved at start: what the hardware looks like.
static var adapter := ""
static var integrated := false
static var deck := false
static var compat := false      # OpenGL compatibility renderer (no Forward+ effects)
static var detected := 2        # preset chosen by auto-detect

## The active tier (0-4), with the GW_QUALITY override (0-4) for benchmarks and tests.
static var quality: int:
	get:
		if OS.has_environment("GW_QUALITY"): return clampi(int(OS.get_environment("GW_QUALITY")), 0, 4)
		return detected if preset < 0 else clampi(preset, 0, 4)

static func detect() -> void:
	adapter = RenderingServer.get_video_adapter_name()
	var t := int(RenderingServer.get_video_adapter_type())   # RenderingDevice.DeviceType: 1 integrated, 2 discrete
	var low := adapter.to_lower()
	deck = OS.get_environment("SteamDeck") == "1" or "vangogh" in low or "custom gpu 0405" in low or "van gogh" in low
	integrated = t == 1 or "radeon graphics" in low or "uhd" in low or "iris" in low or "intel" in low
	compat = RenderingServer.get_current_rendering_method() != "forward_plus"
	detected = 2
	if deck: detected = 1
	elif compat: detected = 1
	elif integrated: detected = 1
	elif t == 2: detected = 3

## Per-tier knobs. Everything the hall and the viewport read comes from here.
static func tier() -> Dictionary:
	var q := quality
	var fp := not compat
	var d := {
		"scale": [0.67, 0.75, 1.0, 1.0, 1.0][q], "aa": ["none", "fxaa", "fxaa", "msaa2", "msaa4"][q],
		"shadows": q >= 1, "shadow_size": [2048, 2048, 4096, 4096, 8192][q], "ssao": fp and q >= 2, "ssil": fp and q >= 3, "ssr": fp and q >= 3, "fog": fp and q >= 3,
		"glow": q >= 1, "lights": [0, 8, 24, 999, 999][q], "labels_far": q >= 2, "smoke": q >= 1, "grain_anim": q >= 2,
		"tex": [512, 512, 512, 1024, 1024][q], "normal_maps": q >= 1, "full_maps": q >= 2, "aniso": q >= 3, "reflections": fp and q >= 3, "fps": [40 if deck else 60, 40 if deck else 60, 40 if deck else 0, 40 if deck else 0, 40 if deck else 0][q],
		"face_lod": [2, 1, 1, 0, 0][q], "vis_scale": [0.5, 0.7, 1.0, 1.3, 1.6][q],
	}
	# Auto scale for weak GPUs on big panels: aim for about 1.3 megapixels of 3D.
	var rs := render_scale
	if rs <= 0.0:
		rs = d.scale
		if preset < 0 and q <= 1:
			var px := DisplayServer.window_get_size()   # the real render surface (a window, or the whole screen in fullscreen)
			var mp := float(maxi(1, px.x * px.y))
			rs = clampf(sqrt(1.3e6 / mp), 0.4, 1.0)
	d.scale = rs
	d["fsr"] = not integrated and not compat   # FSR costs about 10 ms at 4K on a small iGPU; plain bilinear upscaling is nearly free
	if OS.has_environment("GW_TIER_SET"):   # dev/bench: GW_TIER_SET="lights=8,tex=1024,ssao=0"
		for kv in OS.get_environment("GW_TIER_SET").split(","):
			var p := kv.split("=")
			if p.size() == 2 and d.has(p[0]): d[p[0]] = (float(p[1]) if "." in p[1] else (int(p[1]) if p[1].is_valid_int() else p[1])) if not (d[p[0]] is bool) else (p[1] == "1")
	return d

static func load_all() -> void:
	detect()
	var c := ConfigFile.new()
	if c.load(PATH) != OK: return
	volume = clampf(float(c.get_value("a", "volume", 0.8)), 0.0, 1.0)
	music_volume = clampf(float(c.get_value("a", "music_volume", 0.7)), 0.0, 1.0); sfx_volume = clampf(float(c.get_value("a", "sfx_volume", 0.9)), 0.0, 1.0); music_mode = str(c.get_value("a", "music_mode", "auto"))
	var us := float(c.get_value("a", "ui_scale", 0.0))
	ui_scale = 0.0 if us < 0.8 else clampf(us, 0.8, 2.0)   # old files stored 1.0 meaning "default": keep an explicit choice only when it was changed
	if c.get_value("a", "ui_scale_auto", true): ui_scale = 0.0
	text_boost = clampf(float(c.get_value("a", "text_boost", 1.0)), 1.0, 1.5)
	colorblind = bool(c.get_value("a", "colorblind", false)); reduced_motion = bool(c.get_value("a", "reduced_motion", false)); high_contrast = bool(c.get_value("a", "high_contrast", false))
	theme = str(c.get_value("a", "theme", "midnight"))
	preset = int(c.get_value("a", "preset", -1)); render_scale = float(c.get_value("a", "render_scale", 0.0))
	window_mode = clampi(int(c.get_value("a", "window_mode", 1)), 0, 2); vsync = clampi(int(c.get_value("a", "vsync", 1)), 0, 2); fps_cap = int(c.get_value("a", "fps_cap", 0))
	tutorial = str(c.get_value("a", "tutorial", "on")); tutorial_step = int(c.get_value("a", "tutorial_step", 0))

static func save_all() -> void:
	var c := ConfigFile.new()
	c.set_value("a", "volume", volume); c.set_value("a", "music_volume", music_volume); c.set_value("a", "sfx_volume", sfx_volume); c.set_value("a", "music_mode", music_mode)
	c.set_value("a", "ui_scale", ui_scale); c.set_value("a", "ui_scale_auto", ui_scale <= 0.0); c.set_value("a", "text_boost", text_boost)
	c.set_value("a", "colorblind", colorblind); c.set_value("a", "reduced_motion", reduced_motion); c.set_value("a", "high_contrast", high_contrast)
	c.set_value("a", "theme", theme); c.set_value("a", "preset", preset); c.set_value("a", "render_scale", render_scale); c.set_value("a", "window_mode", window_mode); c.set_value("a", "vsync", vsync); c.set_value("a", "fps_cap", fps_cap)
	c.set_value("a", "tutorial", tutorial); c.set_value("a", "tutorial_step", tutorial_step)
	c.save(PATH)

## UI scale actually used: the explicit choice, or auto (undo the window stretch on small windows so text stays native-size).
static func effective_ui_scale(window: Window) -> float:
	var s := ui_scale
	if s <= 0.0:
		var sz := window.size
		var s0 := minf(float(sz.x) / 1920.0, float(sz.y) / 1080.0)
		s = clampf(1.0 / maxf(s0, 0.01), 1.0, 1.75) if s0 < 1.0 else 1.0
	return s * text_boost

## Push the current values into the engine (call after load and after every change).
static func apply(window: Window) -> void:
	AudioServer.set_bus_volume_db(0, linear_to_db(maxf(volume, 0.0001)))
	window.content_scale_factor = effective_ui_scale(window)
	if not OS.has_environment("GW_NODISPLAY"):
		var wm: int = [Window.MODE_WINDOWED, Window.MODE_FULLSCREEN, Window.MODE_EXCLUSIVE_FULLSCREEN][window_mode]
		if window.mode != wm and not OS.has_environment("GW_SHOT") and not OS.has_environment("GW_SMOKE"): window.mode = wm
	if not OS.has_environment("GW_NODISPLAY"): DisplayServer.window_set_vsync_mode([DisplayServer.VSYNC_DISABLED, DisplayServer.VSYNC_ENABLED, DisplayServer.VSYNC_ADAPTIVE][vsync])
	apply_fps()

static var idle := false        # set by the app shell: paused and untouched for a while
static var focused := true
static func apply_fps() -> void:
	if OS.has_environment("GW_NOTHROTTLE"): Engine.max_fps = 0; return   # benchmarks and tests
	var cap: int = fps_cap if fps_cap > 0 else int(tier().fps)
	if cap >= 1000: cap = 0
	if not focused: cap = 10 if cap == 0 or cap > 10 else cap
	elif idle: cap = 30 if cap == 0 or cap > 30 else cap
	Engine.max_fps = cap

## Written to user://logs/gigawatt.log at start; also what the "Copy diagnostics" button copies.
static func diagnostics(window: Window) -> String:
	var v := str(ProjectSettings.get_setting("application/config/version", "dev"))
	return "GIGAWATT %s\nOS: %s %s\nRenderer: %s (%s)\nAdapter: %s  (integrated=%s deck=%s)\nWindow: %s  scale=%.2f  ui=%.2f\nPreset: %s%s  3D scale=%.2f  vsync=%d fpscap=%d\nGodot: %s" % [
		v, OS.get_name(), OS.get_version(), RenderingServer.get_current_rendering_method(), RenderingServer.get_current_rendering_driver_name(), adapter, str(integrated), str(deck),
		str(window.size), window.content_scale_factor, effective_ui_scale(window), TIER_NAMES[quality], " (auto)" if preset < 0 else "", float(tier().scale), vsync, fps_cap, Engine.get_version_info().string]

static func write_log(window: Window) -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("user://logs"))
	var f := FileAccess.open("user://logs/gigawatt.log", FileAccess.WRITE)
	if f != null: f.store_string(diagnostics(window) + "\n"); f.close()
