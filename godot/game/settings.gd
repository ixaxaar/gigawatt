class_name Settings
extends RefCounted
## User preferences (user://settings.cfg): volume, UI scale, colour-blind palette, reduced motion.
static var volume := 0.8
## Music and effects sit under the master volume. music_mode: "auto" (mood-driven shuffle), "off", or a catalog song id (loops that genre).
static var music_volume := 0.7
static var sfx_volume := 0.9
static var music_mode := "auto"
static var ui_scale := 1.0
static var colorblind := false
static var reduced_motion := false
## Graphics: 0 low, 1 balanced (default), 2 high. Screen-space effects and volumetric fog are the expensive part.
static var quality := 1
## Guided first run: "on" until finished or dismissed, then "off" (restart it from the menu).
static var tutorial := "on"
static var tutorial_step := 0
const PATH := "user://settings.cfg"

static func load_all() -> void:
	# first run on a small screen (Steam Deck, 1280x800): scale the UI up so 12 px text stays readable
	if DisplayServer.window_get_size().x < 1500 and not FileAccess.file_exists(PATH): ui_scale = 1.75
	if OS.has_environment("GW_QUALITY"): quality = clampi(int(OS.get_environment("GW_QUALITY")), 0, 2)
	var c := ConfigFile.new()
	if c.load(PATH) != OK: return
	var qenv := OS.has_environment("GW_QUALITY")
	volume = clampf(float(c.get_value("a", "volume", 0.8)), 0.0, 1.0)
	music_volume = clampf(float(c.get_value("a", "music_volume", 0.7)), 0.0, 1.0); sfx_volume = clampf(float(c.get_value("a", "sfx_volume", 0.9)), 0.0, 1.0); music_mode = str(c.get_value("a", "music_mode", "auto"))
	ui_scale = clampf(float(c.get_value("a", "ui_scale", ui_scale)), 0.8, 2.0)
	colorblind = bool(c.get_value("a", "colorblind", false))
	reduced_motion = bool(c.get_value("a", "reduced_motion", false))
	if not qenv: quality = clampi(int(c.get_value("a", "quality", 1)), 0, 2)
	tutorial = str(c.get_value("a", "tutorial", "on")); tutorial_step = int(c.get_value("a", "tutorial_step", 0))

static func save_all() -> void:
	var c := ConfigFile.new()
	c.set_value("a", "volume", volume); c.set_value("a", "music_volume", music_volume); c.set_value("a", "sfx_volume", sfx_volume); c.set_value("a", "music_mode", music_mode); c.set_value("a", "ui_scale", ui_scale)
	c.set_value("a", "colorblind", colorblind); c.set_value("a", "reduced_motion", reduced_motion); c.set_value("a", "quality", quality); c.set_value("a", "tutorial", tutorial); c.set_value("a", "tutorial_step", tutorial_step)
	c.save(PATH)

## Push the current values into the engine (call after load and after every change).
static func apply(window: Window) -> void:
	AudioServer.set_bus_volume_db(0, linear_to_db(maxf(volume, 0.0001)))
	window.content_scale_factor = ui_scale
