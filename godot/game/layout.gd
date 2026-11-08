class_name Layout
extends RefCounted
## Device classes. The same game runs on three layouts:
##   desktop  - monitors, laptops, TVs and consoles: full top bar, wide dock, drawers beside the hall.
##   handheld - Steam Deck and other 7-8 inch screens (and small laptop windows): compact top bar, chunky dock, drawers cover most of the screen.
##   phone    - touch phones and narrow windows: slim top bar, a scrolling tab bar along the bottom, every drawer a full-screen sheet.
## `kind` is picked automatically from the platform, the screen's physical size and the window shape; Settings ▸ Display can force one.

static var kind := "desktop"
static var portrait := false
const KINDS := ["desktop", "handheld", "phone"]

## Logical short side (px) each class is designed for. The window is scaled so the short side lands here, which keeps text a readable physical size.
const TARGET_SHORT := {"desktop": 1080.0, "handheld": 800.0, "phone": 540.0}

static func is_mobile() -> bool: return OS.has_feature("android") or OS.has_feature("ios")

static func detect(win: Window) -> String:
	var forced := OS.get_environment("GW_LAYOUT") if OS.has_environment("GW_LAYOUT") else Settings.layout
	if forced in KINDS: return forced
	var sz := Vector2(win.size); var short := minf(sz.x, sz.y); var long_ := maxf(sz.x, sz.y)
	if is_mobile():
		var dpi := float(maxi(DisplayServer.screen_get_dpi(), 120))
		return "phone" if short / dpi < 3.6 else "handheld"
	if Settings.deck: return "handheld"
	if short < 600.0 or sz.x < 820.0 or sz.y > sz.x * 1.3: return "phone"
	if long_ < 1500.0 and short < 900.0: return "handheld"
	return "desktop"

## Total pixels per logical pixel for this window and class (stretch scale times content scale factor).
static func total_scale(win: Window, k := kind) -> float:
	var short := float(minf(win.size.x, win.size.y))
	if k == "desktop": return maxf(1.0, minf(win.size.x / 1920.0, win.size.y / 1080.0))
	var t := short / float(TARGET_SHORT[k])
	return t if k == "phone" else maxf(1.0, t)

## Refresh `kind` and `portrait` from the window; returns true when the class changed.
static func update(win: Window) -> bool:
	var old := kind
	kind = detect(win); portrait = win.size.y > win.size.x * 1.05
	return kind != old

static var phone: bool:
	get: return kind == "phone"
static var handheld: bool:
	get: return kind == "handheld"
static var compact: bool:
	get: return kind != "desktop"
static var touch: bool:
	get: return is_mobile() or kind == "phone" or DisplayServer.is_touchscreen_available()

## Minimum touch target in logical px (about 7 mm).
static func tap() -> float: return 52.0 if kind == "phone" else (46.0 if kind == "handheld" else 0.0)

## Clamp a design width (px at 1080p) to the visible logical width.
static func fit(w: float, root: Node) -> float:
	var vw := root.get_viewport().get_visible_rect().size.x
	return minf(w, vw - 24.0)
