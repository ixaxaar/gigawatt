class_name Kit
## Shared UI toolkit: the game's visual language + the building blocks every screen uses.
## Design scale (use these instead of loose numbers): spacing SP_XS/SP_S/SP_M/SP_L = 4/8/12/16, corner radii R_S/R_M/R_L,
## border weight BW, type sizes T_TITLE/T_SECTION/T_BODY/T_SMALL/T_CAPTION. Every colour comes from the palette tokens below,
## so all seven themes get the same treatment; `legible()` and `ink_on()` keep text readable on any fill.

## Palette. Dynamic so the player can pick a theme (set_theme); screens rebuild to pick the new values up.
static var BG := Color(0.035, 0.05, 0.075, 0.97)
static var PANEL := Color(0.055, 0.08, 0.115, 0.96)
static var LINE := Color(0.252, 0.35, 0.448)
static var CY := Color(0.3, 0.82, 1.0)
static var GR := Color(0.25, 0.9, 0.6)
static var AM := Color(1.0, 0.72, 0.2)
static var RD := Color(1.0, 0.36, 0.42)
static var DIM := Color(0.58, 0.68, 0.78)
static var TX := Color(0.9, 0.95, 1.0)
static var PANEL_FILL := Color(0.07, 0.095, 0.135, 0.98)
static var PANEL_EDGE := Color(0.328, 0.412, 0.513)
static var DEEP := Color(0.03, 0.045, 0.07)
static var FIELD := Color(0.045, 0.075, 0.105)
static var OUTL := Color(0.02, 0.03, 0.05)
static var INK := Color(0.04, 0.05, 0.09)
static var BTN_BASE := Color(0.1, 0.15, 0.21)
static var BTN_EDGE := Color(0.342, 0.455, 0.577)
static var BTN_INK := Color(0.88, 0.94, 1.0)
static var BTN_OFF := Color(0.07, 0.1, 0.14)
static var BTN_DIS := Color(0.06, 0.08, 0.1)
static var SEL := Color(0.08, 0.17, 0.24)
static var TIPF := Color(0.13, 0.12, 0.07)
static var TIPX := Color(0.95, 0.92, 0.8)
static var OUTLINE := Color(0.01, 0.015, 0.03)
static var SHADOW := Color(0, 0, 0, 0.7)
static var SCRIM := Color(0.01, 0.02, 0.04, 0.88)
## Filled button kinds ("pri", "go", "danger") and the keyboard / controller focus ring.
static var PRI := Color(0.16, 0.62, 0.86)
static var GO := Color(0.2, 0.82, 0.52)
static var DNG := Color(0.9, 0.28, 0.36)
static var FOCUS := Color(1, 0.96, 0.5)
## Light ink for text on dark fills (ink_on picks INK or this, whichever reads better).
const LIGHT_INK := Color(0.98, 0.99, 1.0)
static var dark := true
static var theme_id := "midnight"
## Every theme passes: body text >= 7:1 and dim text >= 4.5:1 on panels, cards, fields and the drawer; accent text >= 4.5:1;
## card and button edges >= 3:1; divider lines >= 2.4:1 (tools/contrast check in the round-3 notes).
const THEMES := [
	{"id": "midnight", "name": "Midnight", "dark": true, "BG": Color(0.035, 0.05, 0.075, 0.97), "PANEL": Color(0.055, 0.08, 0.115, 0.96), "LINE": Color(0.252, 0.35, 0.448), "CY": Color(0.3, 0.82, 1), "GR": Color(0.25, 0.9, 0.6), "AM": Color(1, 0.72, 0.2), "RD": Color(1, 0.36, 0.42), "DIM": Color(0.58, 0.68, 0.78), "TX": Color(0.9, 0.95, 1), "FILL": Color(0.07, 0.095, 0.135, 0.98), "EDGE": Color(0.328, 0.412, 0.513), "DEEP": Color(0.03, 0.045, 0.07), "FIELD": Color(0.045, 0.075, 0.105), "OUTL": Color(0.02, 0.03, 0.05), "INK": Color(0.04, 0.05, 0.09), "BTN_BASE": Color(0.1, 0.15, 0.21), "BTN_EDGE": Color(0.342, 0.455, 0.577), "BTN_INK": Color(0.88, 0.94, 1), "BTN_OFF": Color(0.07, 0.1, 0.14), "BTN_DIS": Color(0.06, 0.08, 0.1), "SEL": Color(0.08, 0.17, 0.24), "TIPF": Color(0.13, 0.12, 0.07), "TIPX": Color(0.95, 0.92, 0.8), "OUTLINE": Color(0.01, 0.015, 0.03), "SHADOW": Color(0, 0, 0, 0.7), "SCRIM": Color(0.01, 0.02, 0.04, 0.88)},
	{"id": "graphite", "name": "Graphite", "dark": true, "BG": Color(0.07, 0.07, 0.075, 0.97), "PANEL": Color(0.11, 0.11, 0.12, 0.96), "LINE": Color(0.374, 0.374, 0.391), "CY": Color(0.95, 0.74, 0.28), "GR": Color(0.4, 0.85, 0.55), "AM": Color(1, 0.62, 0.2), "RD": Color(1, 0.4, 0.4), "DIM": Color(0.66, 0.66, 0.69), "TX": Color(0.94, 0.94, 0.95), "FILL": Color(0.14, 0.14, 0.15, 0.98), "EDGE": Color(0.436, 0.436, 0.452), "DEEP": Color(0.05, 0.05, 0.055), "FIELD": Color(0.09, 0.09, 0.1), "OUTL": Color(0.02, 0.02, 0.02), "INK": Color(0.06, 0.05, 0.03), "BTN_BASE": Color(0.18, 0.18, 0.2), "BTN_EDGE": Color(0.472, 0.472, 0.498), "BTN_INK": Color(0.93, 0.93, 0.95), "BTN_OFF": Color(0.11, 0.11, 0.12), "BTN_DIS": Color(0.09, 0.09, 0.1), "SEL": Color(0.22, 0.19, 0.1), "TIPF": Color(0.16, 0.14, 0.08), "TIPX": Color(0.95, 0.92, 0.8), "OUTLINE": Color(0.02, 0.02, 0.02), "SHADOW": Color(0, 0, 0, 0.7), "SCRIM": Color(0.02, 0.02, 0.02, 0.88)},
	{"id": "ember", "name": "Ember", "dark": true, "BG": Color(0.07, 0.045, 0.04, 0.97), "PANEL": Color(0.11, 0.07, 0.06, 0.96), "LINE": Color(0.43, 0.32, 0.286), "CY": Color(1, 0.5, 0.25), "GR": Color(0.5, 0.9, 0.5), "AM": Color(1, 0.8, 0.3), "RD": Color(1, 0.35, 0.4), "DIM": Color(0.74, 0.62, 0.57), "TX": Color(1, 0.95, 0.92), "FILL": Color(0.14, 0.09, 0.075, 0.98), "EDGE": Color(0.508, 0.385, 0.344), "DEEP": Color(0.055, 0.035, 0.03), "FIELD": Color(0.095, 0.06, 0.05), "OUTL": Color(0.03, 0.015, 0.01), "INK": Color(0.07, 0.035, 0.02), "BTN_BASE": Color(0.2, 0.12, 0.09), "BTN_EDGE": Color(0.56, 0.402, 0.34), "BTN_INK": Color(1, 0.93, 0.88), "BTN_OFF": Color(0.12, 0.07, 0.06), "BTN_DIS": Color(0.09, 0.06, 0.05), "SEL": Color(0.26, 0.14, 0.08), "TIPF": Color(0.16, 0.12, 0.06), "TIPX": Color(0.95, 0.9, 0.78), "OUTLINE": Color(0.03, 0.015, 0.01), "SHADOW": Color(0, 0, 0, 0.7), "SCRIM": Color(0.04, 0.02, 0.01, 0.88)},
	{"id": "contrast", "name": "High contrast", "dark": true, "BG": Color(0, 0, 0, 1.0), "PANEL": Color(0.04, 0.04, 0.04, 1.0), "LINE": Color(0.8, 0.8, 0.8), "CY": Color(1, 0.9, 0.1), "GR": Color(0.2, 1, 0.4), "AM": Color(1, 0.65, 0), "RD": Color(1, 0.3, 0.3), "DIM": Color(0.84, 0.84, 0.84), "TX": Color(1, 1, 1), "FILL": Color(0.02, 0.02, 0.02, 1.0), "EDGE": Color(0.9, 0.9, 0.9), "DEEP": Color(0, 0, 0), "FIELD": Color(0.06, 0.06, 0.06), "OUTL": Color(0.9, 0.9, 0.9), "INK": Color(0, 0, 0), "BTN_BASE": Color(0.1, 0.1, 0.1), "BTN_EDGE": Color(1, 1, 1), "BTN_INK": Color(1, 1, 1), "BTN_OFF": Color(0.05, 0.05, 0.05), "BTN_DIS": Color(0.05, 0.05, 0.05), "SEL": Color(0.25, 0.22, 0.0), "TIPF": Color(0.12, 0.1, 0.0), "TIPX": Color(1, 0.95, 0.7), "OUTLINE": Color(0, 0, 0), "SHADOW": Color(0, 0, 0, 0.0), "SCRIM": Color(0, 0, 0, 0.9), "PRI": Color(1.0, 0.9, 0.1), "GO": Color(0.2, 1.0, 0.4), "DNG": Color(1.0, 0.35, 0.35), "FOCUS": Color(0.2, 0.9, 1.0)},
	{"id": "paper", "name": "Paper", "dark": false, "BG": Color(0.95, 0.96, 0.98, 0.97), "PANEL": Color(0.9, 0.92, 0.95, 0.97), "LINE": Color(0.567, 0.616, 0.672), "CY": Color(0.044, 0.435, 0.696), "GR": Color(0.043, 0.482, 0.284), "AM": Color(0.612, 0.357, 0), "RD": Color(0.795, 0.165, 0.262), "DIM": Color(0.336, 0.403, 0.48), "TX": Color(0.08, 0.11, 0.16), "FILL": Color(0.99, 0.99, 1.0, 0.98), "EDGE": Color(0.477, 0.539, 0.601), "DEEP": Color(0.929, 0.946, 0.972), "FIELD": Color(0.93, 0.95, 0.97), "OUTL": Color(0.2, 0.26, 0.34), "INK": Color(0.04, 0.07, 0.12), "BTN_BASE": Color(0.975, 0.98, 0.99), "BTN_EDGE": Color(0.427, 0.494, 0.57), "BTN_INK": Color(0.08, 0.11, 0.16), "BTN_OFF": Color(0.86, 0.89, 0.93), "BTN_DIS": Color(0.87, 0.89, 0.92), "SEL": Color(0.8, 0.9, 0.98), "TIPF": Color(1.0, 0.96, 0.82), "TIPX": Color(0.3, 0.25, 0.1), "OUTLINE": Color(1, 1, 1, 0.0), "SHADOW": Color(0.15, 0.2, 0.3, 0.3), "SCRIM": Color(0.97, 0.98, 1.0, 0.88), "PRI": Color(0.05, 0.4, 0.68), "GO": Color(0.03, 0.45, 0.26), "DNG": Color(0.76, 0.14, 0.24), "FOCUS": Color(0.05, 0.3, 0.85)},
	{"id": "sand", "name": "Sand", "dark": false, "BG": Color(0.97, 0.95, 0.9, 0.97), "PANEL": Color(0.93, 0.9, 0.84, 0.97), "LINE": Color(0.647, 0.598, 0.515), "CY": Color(0.64, 0.328, 0.041), "GR": Color(0.186, 0.465, 0.232), "AM": Color(0.567, 0.364, 0), "RD": Color(0.764, 0.196, 0.196), "DIM": Color(0.42, 0.37, 0.3), "TX": Color(0.15, 0.12, 0.08), "FILL": Color(1.0, 0.985, 0.95, 0.98), "EDGE": Color(0.581, 0.515, 0.415), "DEEP": Color(0.956, 0.933, 0.878), "FIELD": Color(0.95, 0.93, 0.88), "OUTL": Color(0.3, 0.25, 0.18), "INK": Color(0.1, 0.07, 0.03), "BTN_BASE": Color(0.995, 0.98, 0.95), "BTN_EDGE": Color(0.539, 0.47, 0.372), "BTN_INK": Color(0.15, 0.12, 0.08), "BTN_OFF": Color(0.9, 0.87, 0.8), "BTN_DIS": Color(0.89, 0.86, 0.8), "SEL": Color(0.98, 0.9, 0.72), "TIPF": Color(1.0, 0.95, 0.8), "TIPX": Color(0.3, 0.22, 0.08), "OUTLINE": Color(1, 1, 1, 0.0), "SHADOW": Color(0.25, 0.2, 0.1, 0.3), "SCRIM": Color(0.98, 0.96, 0.9, 0.88), "PRI": Color(0.6, 0.3, 0.03), "GO": Color(0.16, 0.43, 0.21), "DNG": Color(0.72, 0.17, 0.17), "FOCUS": Color(0.1, 0.3, 0.8)},
	{"id": "mist", "name": "Mist", "dark": false, "BG": Color(0.93, 0.95, 0.95, 0.97), "PANEL": Color(0.88, 0.91, 0.91, 0.97), "LINE": Color(0.552, 0.612, 0.612), "CY": Color(0, 0.452, 0.487), "GR": Color(0.085, 0.468, 0.255), "AM": Color(0.567, 0.364, 0), "RD": Color(0.752, 0.188, 0.235), "DIM": Color(0.329, 0.404, 0.404), "TX": Color(0.07, 0.12, 0.12), "FILL": Color(0.97, 0.98, 0.98, 0.98), "EDGE": Color(0.451, 0.533, 0.533), "DEEP": Color(0.904, 0.93, 0.93), "FIELD": Color(0.91, 0.94, 0.94), "OUTL": Color(0.18, 0.27, 0.27), "INK": Color(0.03, 0.08, 0.08), "BTN_BASE": Color(0.97, 0.985, 0.985), "BTN_EDGE": Color(0.388, 0.504, 0.504), "BTN_INK": Color(0.07, 0.12, 0.12), "BTN_OFF": Color(0.84, 0.89, 0.89), "BTN_DIS": Color(0.85, 0.89, 0.89), "SEL": Color(0.78, 0.92, 0.92), "TIPF": Color(1.0, 0.96, 0.82), "TIPX": Color(0.3, 0.25, 0.1), "OUTLINE": Color(1, 1, 1, 0.0), "SHADOW": Color(0.1, 0.2, 0.2, 0.3), "SCRIM": Color(0.95, 0.97, 0.97, 0.88), "PRI": Color(0.0, 0.42, 0.46), "GO": Color(0.06, 0.44, 0.24), "DNG": Color(0.72, 0.16, 0.22), "FOCUS": Color(0.05, 0.3, 0.8)},
]

## Spacing, radii, borders and type sizes: one scale for every screen.
const SP_XS := 4
const SP_S := 8
const SP_M := 12
const SP_L := 16
const R_S := 4
const R_M := 6
const R_L := 10
const BW := 2
const T_TITLE := 22
const T_SECTION := 15
const T_BODY := 15
const T_SMALL := 14
const T_CAPTION := 13

## Switch the whole palette. Callers rebuild their screens afterwards.
static func set_theme(id: String) -> void:
	var t: Dictionary = THEMES[0]
	for x in THEMES:
		if x.id == id: t = x
	theme_id = str(t.id); dark = bool(t.dark)
	BG = t.BG; PANEL = t.PANEL; LINE = t.LINE; CY = t.CY; GR = t.GR; AM = t.AM; RD = t.RD; DIM = t.DIM; TX = t.TX; PANEL_FILL = t.FILL; PANEL_EDGE = t.EDGE; DEEP = t.DEEP; FIELD = t.FIELD; OUTL = t.OUTL; INK = t.INK
	BTN_BASE = t.BTN_BASE; BTN_EDGE = t.BTN_EDGE; BTN_INK = t.BTN_INK; BTN_OFF = t.BTN_OFF; BTN_DIS = t.BTN_DIS; SEL = t.SEL; TIPF = t.TIPF; TIPX = t.TIPX; OUTLINE = t.OUTLINE; SHADOW = t.SHADOW; SCRIM = t.SCRIM
	PRI = t.get("PRI", Color(0.16, 0.62, 0.86)); GO = t.get("GO", Color(0.2, 0.82, 0.52)); DNG = t.get("DNG", Color(0.9, 0.28, 0.36)); FOCUS = t.get("FOCUS", Color(1, 0.96, 0.5))
	accent = CY; _ls_cache.clear(); _lsb_cache.clear(); _btn_styles.clear(); _tex_cache.clear()

static func deep(a := 1.0) -> Color: return Color(DEEP.r, DEEP.g, DEEP.b, a)
static func field(a := 1.0) -> Color: return Color(FIELD.r, FIELD.g, FIELD.b, a)
## A panel fill tinted toward a colour (warnings, takeaways).
static func tint(c: Color, k := 0.14) -> Color: return PANEL_FILL.lerp(c, k)
const VENDOR := {"nvidia": "#76b900", "amd": "#ed1c24", "tenstorrent": "#8a5cf6", "cerebras": "#ff7a1a", "intel": "#0071c5", "groq": "#f5d90a"}

# ---------- contrast ----------
## WCAG relative luminance (0 black .. 1 white).
static func luma(c: Color) -> float:
	var l := c.srgb_to_linear(); return 0.2126 * l.r + 0.7152 * l.g + 0.0722 * l.b
## WCAG contrast ratio between two colours (1 .. 21). Body text wants 7, small text 4.5, borders and icons 3.
static func contrast(a: Color, b: Color) -> float:
	var x := luma(a); var y := luma(b); return (maxf(x, y) + 0.05) / (minf(x, y) + 0.05)
## Text colour for a filled background: the dark ink or the light ink, whichever reads better.
static func ink_on(bg: Color) -> Color:
	return INK if contrast(INK, bg) >= contrast(LIGHT_INK, bg) else LIGHT_INK
## `c` nudged toward black or white (keeping its hue as long as possible) until it reaches `ratio` against `bg`.
## Use it for any accent-coloured text or outline: bright accents wash out on the light themes.
static func legible(c: Color, bg: Color = PANEL_FILL, ratio := 4.5) -> Color:
	if contrast(c, bg) >= ratio: return c
	var target := Color(1, 1, 1) if luma(bg) < 0.18 else Color(0, 0, 0)
	for i in range(1, 21):
		var x := c.lerp(target, i * 0.05)
		if contrast(x, bg) >= ratio: return Color(x.r, x.g, x.b, c.a)
	return Color(target.r, target.g, target.b, c.a)
## Hover shade of a fill: lighter on dark fills, darker on light ones (a light button that only gets lighter seems to vanish).
static func _hov(c: Color) -> Color: return c.darkened(0.08) if luma(c) > 0.45 else c.lightened(0.12)

## Smallest font used anywhere (px at 1080p). Handheld screens scale the UI up, so this stays readable on a Steam Deck.
const MIN_FONT := 13
static func fs(n: int) -> int: return maxi(MIN_FONT, n)
static func plural(n, word: String, many := "") -> String:
	var i := int(n)
	return "%d %s" % [i, word if i == 1 else (many if many != "" else word + "s")]

static func vendor_color(v: String) -> Color: return Color(VENDOR.get(v, "#4fd1ff"))

static func sb(bg: Color = PANEL, border: Color = LINE, r := 10, bw := 1, pad := 12) -> StyleBoxFlat:
	var s := StyleBoxFlat.new(); s.bg_color = bg; s.border_color = border; s.set_border_width_all(bw); s.set_corner_radius_all(r)
	s.content_margin_left = pad; s.content_margin_right = pad; s.content_margin_top = pad * 0.75; s.content_margin_bottom = pad * 0.75; return s

## One shared LabelSettings per (size, colour): building a label with two theme overrides costs ~2x as much,
## and screens create thousands of labels.
static var _ls_cache := {}
static func ls(size: int, col: Color) -> LabelSettings:
	size = fs(size)
	var k := Vector3i(size, col.r8 | (col.g8 << 8) | (col.b8 << 16), col.a8)
	if _ls_cache.has(k): return _ls_cache[k]
	var c := col
	# light themes: a near-white colour picked for the dark themes would be white-on-white; make it readable
	if not dark and luma(c) > 0.35 and contrast(c, PANEL_FILL) < 2.2: c = legible(c, PANEL_FILL, 4.5)
	var s := LabelSettings.new(); s.font_size = size; s.font_color = c
	if size >= 20:   # headlines and big numbers: bold with a dark outline and hard shadow, like a comic caption
		s.font = Fonts.bold; s.outline_size = 5 if dark else 0; s.outline_color = OUTLINE
		s.shadow_size = 1; s.shadow_color = Color(SHADOW.r, SHADOW.g, SHADOW.b, 0.85 if dark else 0.18); s.shadow_offset = Vector2(3, 3) if dark else Vector2(1, 2)
	_ls_cache[k] = s; return s

static func label(t: String, size := 16, col: Color = TX, wrap := false) -> Label:
	var l := Label.new(); l.text = t; l.label_settings = ls(size, col)
	if wrap: l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return l

## One line that never pushes its row wider: too long, it ends in "…" (the full text shows as a tooltip). Give it room with SIZE_EXPAND_FILL.
static func label1(t: String, size := 15, col: Color = TX) -> Label:
	var l := label(t, size, col); clip1(l); return l
## Make an existing single-line label (or button) clip with an ellipsis instead of overflowing or cutting mid-letter.
static func clip1(c: Control) -> void:
	if c is Label:
		var l := c as Label; l.autowrap_mode = TextServer.AUTOWRAP_OFF; l.clip_text = true; l.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		l.tooltip_text = l.text; if l.mouse_filter == Control.MOUSE_FILTER_IGNORE: l.mouse_filter = Control.MOUSE_FILTER_PASS
	elif c is Button:
		var b := c as Button; b.clip_text = true; b.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS; if b.tooltip_text == "": b.tooltip_text = b.text
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if c.custom_minimum_size.x < 40.0: c.custom_minimum_size.x = 40.0

## Shorten text to about `n` characters at a word boundary, ending in "…" (never "PCIe Ge" or "with all").
static func short(t: String, n: int) -> String:
	if t.length() <= n: return t
	var cut := t.left(n + 1)
	var sp := cut.rfind(" ")
	if sp > n * 0.5: cut = cut.left(sp)
	else: cut = t.left(n)
	return cut.strip_edges().trim_suffix(",").trim_suffix(" ·").trim_suffix(":") + "…"

## Wrap at word boundaries; when one word is wider than the space (big UI scale, narrow tile) the text shrinks to fit
## instead of breaking inside the word ("HG / X").
static func wrap_words(l: Label, min_size := 11) -> Label:
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if l.has_meta("ww"): return l
	l.set_meta("ww", l.label_settings.font_size if l.label_settings != null else 15); l.set_meta("ww_min", min_size)
	var id := l.get_instance_id()
	l.resized.connect(func(): Kit._fit_words_id(id))
	return l

static func _fit_words_id(id: int) -> void:
	var x = instance_from_id(id)
	if x != null and is_instance_valid(x): _fit_words(x)

static func _fit_words(l: Label) -> void:
	if l.label_settings == null or l.size.x < 8.0: return
	var base: int = l.get_meta("ww"); var mn: int = l.get_meta("ww_min", 11)
	var font: Font = l.label_settings.font if l.label_settings.font != null else l.get_theme_font("font")
	var widest := 0.0
	for w in l.text.split(" ", false): widest = maxf(widest, font.get_string_size(w, HORIZONTAL_ALIGNMENT_LEFT, -1, base).x)
	var want := base
	if widest > l.size.x: want = maxi(mn, int(floor(base * l.size.x / widest)))
	if want == l.label_settings.font_size: return
	var s: LabelSettings = l.label_settings.duplicate() if not l.has_meta("ww_own") else l.label_settings
	s.font_size = want; l.label_settings = s; l.set_meta("ww_own", true)

static func rich(t: String, size := 15) -> RichTextLabel:
	var r := RichTextLabel.new(); r.bbcode_enabled = true; r.fit_content = true; r.scroll_active = false; r.text = t
	size = fs(size); r.add_theme_font_size_override("normal_font_size", size); r.add_theme_font_size_override("bold_font_size", size); r.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	r.add_theme_color_override("default_color", TX)   # the engine default is white: invisible on the light themes
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE; return r

# ---------- typography ----------
## Screen / workshop title.
static func title(t: String, col: Color = TX) -> Label: return label(t, T_TITLE, col)
## Section heading inside a drawer: an accent bar and bold caps that never look like a button; long titles wrap.
static func section(t: String, col: Color = Color(0, 0, 0, 0)) -> HBoxContainer:
	if col.a == 0.0: col = accent
	var h := HBoxContainer.new(); h.add_theme_constant_override("separation", SP_S); h.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var bar := ColorRect.new(); bar.color = legible(col, PANEL_FILL, 3.0); bar.custom_minimum_size = Vector2(4, 18); bar.size_flags_vertical = Control.SIZE_FILL; bar.mouse_filter = Control.MOUSE_FILTER_IGNORE; h.add_child(bar)
	var l := Label.new(); l.text = t.to_upper(); l.label_settings = ls_bold(T_SECTION - 1, legible(col, PANEL_FILL, 4.5)); wrap_words(l, 12); h.add_child(l)
	return h
## Body copy (wraps).
static func body(t: String, col: Color = TX) -> Label: return label(t, T_BODY, col, true)
## Secondary note under something (wraps, dim).
static func caption(t: String, col: Color = DIM) -> Label: return label(t, T_CAPTION, col, true)

static var pad_mode := false       # set by Pad: true while the player is using a controller
static func focus_mode() -> int: return Control.FOCUS_ALL if pad_mode else Control.FOCUS_NONE
## Bright outline drawn on the focused control in pad / keyboard mode (mouse and touch never focus buttons).
static func focus_sb() -> StyleBoxFlat:
	var s := StyleBoxFlat.new(); s.draw_center = false; s.border_color = FOCUS; s.set_border_width_all(3); s.set_corner_radius_all(R_M); s.set_expand_margin_all(3); return s
## A mouse or finger that pressed a control should not leave it focused (a ring or a 'stuck' look); keyboard and pad keep focus.
static func no_click_focus(c: Control) -> void:
	if c.has_meta("ncf"): return
	c.set_meta("ncf", true)
	var id := c.get_instance_id()
	c.gui_input.connect(func(e):
		if e is InputEventMouseButton and not e.pressed and not Kit.pad_mode:
			var x = instance_from_id(id)
			if x != null: (x as Control).release_focus.call_deferred())

static var accent := CY          # colour of the drawer being built (set by the app shell before a screen rebuilds)
## Frame for a drawer / workshop: thick accent edge on the side facing the hall, hard offset shadow.
static func drawer_sb(acc: Color, full: bool) -> StyleBoxFlat:
	var s := sb(deep(0.985), OUTL, R_S, 3, 14)
	if not full: s.border_width_left = 8; s.border_color = acc
	s.shadow_color = Color(SHADOW.r, SHADOW.g, SHADOW.b, SHADOW.a * 0.8); s.shadow_size = 18; s.shadow_offset = Vector2(-8, 0) if not full else Vector2.ZERO
	return s

## Dock button: chunky tab with a coloured underline and a hotkey badge.
static func dock_btn(t: String, key: String, col: Color, cb: Callable) -> Button:
	var b := Button.new(); b.text = "%s\n[%s]" % [t, key]; b.focus_mode = focus_mode(); b.add_theme_stylebox_override("focus", focus_sb()); b.custom_minimum_size = Vector2(138, 58)
	b.add_theme_font_size_override("font_size", fs(14)); b.add_theme_font_override("font", Fonts.bold)
	b.set_meta("col", col); dock_set(b, false); b.pressed.connect(cb); return b

static func dock_set(b: Button, on: bool) -> void:
	var col: Color = b.get_meta("col")
	var base := col if on else BTN_OFF
	var edge := legible(col, BTN_OFF, 3.0) if not on else OUTL   # the coloured underline must read on the light themes too
	for st in ["normal", "hover", "pressed"]:
		var s := sb(base if st != "hover" or Layout.touch else _hov(base), OUTL if dark or on else BTN_EDGE, R_S, 3, 8)
		s.border_width_bottom = 8; if not on: s.border_color = edge
		if not on and not dark: s.border_width_left = 2; s.border_width_right = 2; s.border_width_top = 2; s.border_color = edge
		s.shadow_color = SHADOW; s.shadow_size = 1; s.shadow_offset = Vector2(3, 3)
		b.add_theme_stylebox_override(st, s)
	var ink := ink_on(col) if on else TX
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]: b.add_theme_color_override(c, ink)

## Tab inside a drawer header.
static func tab_btn(t: String, on: bool, col: Color, cb: Callable) -> Button:
	var b := Button.new(); b.text = t.to_upper(); b.custom_minimum_size.y = Layout.tap(); b.focus_mode = focus_mode(); b.add_theme_stylebox_override("focus", focus_sb()); b.add_theme_font_size_override("font_size", 15); b.add_theme_font_override("font", Fonts.bold)
	var base := col if on else BTN_OFF
	for st in ["normal", "hover", "pressed"]:
		var s := sb(base if st != "hover" or Layout.touch else _hov(base), OUTL if (dark or on) else legible(col, BTN_OFF, 3.0), R_S - 1, 3 if (dark or on) else 2, 10); s.shadow_color = SHADOW; s.shadow_size = 1; s.shadow_offset = Vector2(3, 3)
		b.add_theme_stylebox_override(st, s)
	var fc := ink_on(col) if on else TX
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]: b.add_theme_color_override(c, fc)
	b.pressed.connect(cb); return b

static var _btn_styles := {}
## Button StyleBoxes depend only on the kind, so they are built once and shared (hundreds of buttons per screen).
static func _styles(kind: String) -> Dictionary:
	var key := kind + ("/t" if Layout.touch else "")
	if _btn_styles.has(key): return _btn_styles[key]
	var base := BTN_BASE; var edge := BTN_EDGE
	if kind == "pri": base = PRI
	elif kind == "go": base = GO
	elif kind == "danger": base = DNG
	if kind != "": edge = OUTL if dark else base.darkened(0.3)
	var ink := BTN_INK if kind == "" else ink_on(base)
	var mk := func(bg: Color, off: Vector2) -> StyleBoxFlat:
		var s := sb(bg, edge, R_S, BW, 10); s.shadow_color = SHADOW; s.shadow_size = 1; s.shadow_offset = off; return s
	var pressed: StyleBoxFlat = mk.call(base.darkened(0.14), Vector2(1, 1))
	pressed.content_margin_top += 2.0; pressed.content_margin_bottom -= 2.0   # the label sinks with the button
	var normal: StyleBoxFlat = mk.call(base, Vector2(3, 3))
	var dis := sb(BTN_DIS, LINE, R_S, 1, 10); dis.shadow_size = 0   # flat, thin edge, no shadow: clearly off, still readable
	var st := {"normal": normal, "hover": normal if Layout.touch else mk.call(_hov(base), Vector2(3, 3)), "pressed": pressed, "disabled": dis, "ink": ink, "focus": focus_sb(),
		"dis_ink": legible(DIM.lerp(BTN_DIS, 0.15), BTN_DIS, 3.2)}
	_btn_styles[key] = st; return st

## Header row of a drawer: one line on desktop; buttons wrap onto more lines on small screens.
static func head_row(sep := 8) -> Container:
	var c: Container = HFlowContainer.new() if Layout.compact else HBoxContainer.new()
	c.add_theme_constant_override("separation", sep); c.add_theme_constant_override("h_separation", sep); c.add_theme_constant_override("v_separation", 4)
	return c

## The grey hint next to a screen title: on small screens it takes its own line at the drawer's width instead of being squeezed beside the title.
static func hint_fix(hd: Container, app) -> void:
	if not Layout.compact or hd.get_child_count() == 0: return
	var l := hd.get_child(hd.get_child_count() - 1) as Label
	if l != null: l.custom_minimum_size.x = maxf(160.0, app.drawer_w() - 70.0)

## A second press of the same button within DOUBLE_MS is ignored (a double click is not two purchases). The check is by
## label and place, not by node, because a press usually rebuilds the screen and the second click lands on the new button.
## Steppers (− / + / ◀ / ▶) and buttons with meta "repeat" keep every press.
const DOUBLE_MS := 350
const _REPEAT_TXT := ["−", "-", "+", "–", "◀", "▶", "‹", "›", "<", ">"]
static var _last_key := ""
static var _last_t := -100000
static func btn(t: String, cb: Callable, kind := "", size := 15) -> Button:
	var b := Button.new(); b.text = t; b.add_theme_font_size_override("font_size", fs(size)); b.custom_minimum_size.y = maxf(36.0, Layout.tap()); b.add_theme_font_override("font", Fonts.bold); b.focus_mode = focus_mode()
	_paint(b, kind); b.set_meta("kind", kind)
	var id := b.get_instance_id()
	b.pressed.connect(func():
		var x = instance_from_id(id)
		if x != null and Kit._first_press(x): cb.call())
	if not Layout.touch:   # hover eases in and out (a short tween on hover only: no per-frame work)
		b.add_theme_stylebox_override("hover", _styles(kind).normal)
		b.mouse_entered.connect(func(): Kit._hover_tw(id, true)); b.mouse_exited.connect(func(): Kit._hover_tw(id, false))
	return b

static func _hover_tw(id: int, on: bool) -> void:
	var b = instance_from_id(id)
	if b == null or not is_instance_valid(b) or not (b as Node).is_inside_tree(): return
	if b.has_meta("htw"):
		var old: Tween = b.get_meta("htw")
		if old != null and old.is_valid(): old.kill()
	var to := Color(1, 1, 1)
	if on and not (b as BaseButton).disabled: to = Color(1.1, 1.1, 1.12) if dark else Color(0.94, 0.95, 0.96)
	var tw := (b as Node).create_tween(); tw.tween_property(b, "self_modulate", to, 0.08 if on else 0.14); b.set_meta("htw", tw)

## False (and marks the press as a duplicate, so its sound is skipped too) when the same button was pressed under DOUBLE_MS ago.
static func _first_press(b: Object) -> bool:
	var bt := b as Button
	if bt.has_meta("repeat") or bt.text.strip_edges() in _REPEAT_TXT: bt.set_meta("_dup", false); return true
	var t := Time.get_ticks_msec()
	var key := "%s|%s|%s" % [bt.text, bt.get_meta("kind", ""), Vector2i((bt.global_position / 12.0).round()) if bt.is_inside_tree() else Vector2i.ZERO]
	if key == _last_key and t - _last_t < DOUBLE_MS: bt.set_meta("_dup", true); return false
	_last_key = key; _last_t = t; bt.set_meta("_dup", false); return true

static func _paint(b: Button, kind: String) -> void:
	var st := _styles(kind)
	b.add_theme_stylebox_override("focus", st.focus)
	b.add_theme_stylebox_override("normal", st.normal); b.add_theme_stylebox_override("hover", st.hover)
	b.add_theme_stylebox_override("pressed", st.pressed); b.add_theme_stylebox_override("disabled", st.disabled)
	b.add_theme_stylebox_override("hover_pressed", st.pressed)
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color", "font_hover_pressed_color"]: b.add_theme_color_override(c, st.ink)
	b.add_theme_color_override("font_disabled_color", st.dis_ink)

## Re-skin a button as one of the kinds ("", "pri", "go", "danger").
static func skin(b: Button, kind: String) -> void:
	_paint(b, kind)

## A labelled on/off switch that is visibly on or off (green ON, grey OFF).
static func toggle(text: String, on: bool, cb: Callable) -> HBoxContainer:
	var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 14)
	var l := label(text, 16, TX); l.size_flags_horizontal = Control.SIZE_EXPAND_FILL; wrap_words(l, 12); h.add_child(l)
	var b := Button.new(); b.toggle_mode = true; b.button_pressed = on; b.focus_mode = focus_mode(); b.custom_minimum_size = Vector2(92, maxf(38.0, Layout.tap()))
	b.add_theme_font_size_override("font_size", 15); b.add_theme_font_override("font", Fonts.bold); b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var paint := func(v: bool): b.text = "ON" if v else "OFF"; skin(b, "go" if v else "")
	paint.call(on)
	b.toggled.connect(func(v): paint.call(v); cb.call(v))
	h.add_child(b); return h

## Slide + fade a control in from the right (drawers) or fade + grow it (workshops, modals). Reduced motion: a short fade, no travel.
static func appear(c: Control, from_right := true, dur := 0.18) -> void:
	if c == null or not c.is_inside_tree(): return
	if c.has_meta("tw"):
		var old: Tween = c.get_meta("tw")
		if old != null and old.is_valid(): old.kill()
	c.modulate.a = 0.0
	await c.get_tree().process_frame   # let anchors settle so the resting position is read correctly
	if not is_instance_valid(c) or not c.visible: return
	var tw := c.create_tween(); c.set_meta("tw", tw)
	if Settings.reduced_motion:
		tw.tween_property(c, "modulate:a", 1.0, 0.06); return
	tw.set_parallel(true)
	if from_right:
		var x0 := c.position.x; c.position.x = x0 + 70.0
		tw.tween_property(c, "position:x", x0, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	else:
		c.pivot_offset = c.size * 0.5; c.scale = Vector2(0.97, 0.97)
		tw.tween_property(c, "scale", Vector2.ONE, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(c, "modulate:a", 1.0, dur)

static func link(text: String, cb: Callable, size := 14) -> Button:
	var b := Button.new(); b.text = text; b.flat = true; b.focus_mode = focus_mode(); b.add_theme_stylebox_override("focus", focus_sb()); b.alignment = HORIZONTAL_ALIGNMENT_LEFT; b.add_theme_font_size_override("font_size", fs(size))
	var c := legible(CY, PANEL_FILL, 4.5)
	b.add_theme_color_override("font_color", c); b.add_theme_color_override("font_hover_color", TX); b.add_theme_color_override("font_pressed_color", TX); b.add_theme_color_override("font_focus_color", c)
	b.pressed.connect(cb); return b

static func tabs(parent: Control, names: Array, current: String, cb: Callable) -> HBoxContainer:
	var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 6)
	for n in names:
		var id: String = n[0] if n is Array else n; var nm: String = n[1] if n is Array else n
		h.add_child(btn(nm, func(): cb.call(id), "pri" if id == current else "", 15))
	parent.add_child(h); return h

## A panel in the game's sticker style: solid fill, 2px edge, hard offset shadow, title on an accent chip.
static func card_sb(edge := Color(0, 0, 0, 0), fill := Color(0, 0, 0, 0), bw := 2, pad := 14) -> StyleBoxFlat:
	if edge.a == 0.0: edge = PANEL_EDGE
	if fill.a == 0.0: fill = PANEL_FILL
	var s := sb(fill, edge, R_M - 1, bw, pad); s.shadow_color = SHADOW; s.shadow_size = 1; s.shadow_offset = Vector2(4, 4)
	return s

## Small filled label (ink on a colour). A tag, not a button: no outline, no shadow.
static func chip(t: String, col: Color, size := 13) -> PanelContainer:
	var p := PanelContainer.new(); var s := sb(col, col.darkened(0.25), R_S - 1, 0 if dark else 1, 7); s.content_margin_top = 1; s.content_margin_bottom = 1
	p.add_theme_stylebox_override("panel", s); p.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var l := Label.new(); l.text = t; l.label_settings = ls_bold(size, ink_on(col)); p.add_child(l); return p

static var _lsb_cache := {}
static func ls_bold(size: int, col: Color) -> LabelSettings:
	size = fs(size)
	var k := Vector3i(size, col.r8 | (col.g8 << 8) | (col.b8 << 16), col.a8)
	if _lsb_cache.has(k): return _lsb_cache[k]
	var s := LabelSettings.new(); s.font_size = size; s.font_color = col; s.font = Fonts.bold; _lsb_cache[k] = s; return s

## A titled panel; returns [panel, body_vbox]. Short titles sit on an accent chip; long ones become a section heading (wraps, never looks like a button).
static func panel(title := "", glow := false, parent: Control = null) -> Array:
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", card_sb(accent if glow else PANEL_EDGE, PANEL_FILL, 3 if glow else 2)); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", SP_M if Layout.phone else SP_S); p.add_child(v)
	if title != "":
		if title.length() <= 22:
			var hb := HBoxContainer.new(); hb.add_child(chip(title.to_upper(), accent, 13)); v.add_child(hb)
		else: v.add_child(section(title))
	if parent: parent.add_child(p)
	return [p, v]

## Two-column screens become ONE column inside a drawer (both names point at the same scrolling list): left content first, then right.
static func cols2(root: Control) -> Array:
	if Layout.touch and _wrapped(root):   # one scroller per screen: this column just flows inside it
		var fv := VBoxContainer.new(); fv.size_flags_horizontal = Control.SIZE_EXPAND_FILL; fv.add_theme_constant_override("separation", 10); root.add_child(fv); return [fv, fv]
	var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO if Layout.phone else ScrollContainer.SCROLL_MODE_DISABLED; sc.size_flags_vertical = Control.SIZE_EXPAND_FILL; sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sc.follow_focus = true
	var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 10); sc.add_child(_end_pad(v)); root.add_child(sc)
	return [v, v]

## Bottom room at the end of a scroll area, so the last card clears the screen edge / dock and the end is visibly the end.
static func end_pad() -> float: return 40.0 if Layout.touch else (28.0 if Layout.compact else 14.0)
static func _end_pad(v: Control) -> Control:
	var m := MarginContainer.new(); m.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	m.add_theme_constant_override("margin_bottom", int(end_pad())); m.add_theme_constant_override("margin_right", 6 if not Layout.touch else 0)
	m.add_child(v); return m

## A row of columns that reflows like a web layout: side by side when there is room, stacked when there is not.
static func cols_row(sep := 12) -> Container:
	var c: Container = HFlowContainer.new() if Layout.touch else HBoxContainer.new()   # only touch screens scroll as one page; a mouse screen keeps side-by-side columns that scroll on their own (a flowing row would collapse them to nothing)
	c.add_theme_constant_override("separation", sep); c.add_theme_constant_override("h_separation", sep); c.add_theme_constant_override("v_separation", sep)
	if c is HBoxContainer: c.size_flags_vertical = Control.SIZE_EXPAND_FILL
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return c

## Width really available to content placed under `n`: the scroll area / drawer it sits in, not the window.
## Before the node is in the tree it falls back to a guess from the window (a drawer is about half of it).
static func avail_w(n: Node) -> float:
	var p: Node = n
	while p != null:
		if p is ScrollContainer or p is ScreenWrap:
			var w := (p as Control).size.x
			if w > 100.0: return w - (40.0 if p is ScreenWrap else 6.0)
		p = p.get_parent()
	var ml := Engine.get_main_loop() as SceneTree
	var vw := ml.root.get_visible_rect().size.x if ml != null else 1280.0
	return vw * (0.42 if Layout.phone else 0.5)

## Give the columns of a flowing row their widths: preferred proportions when they all fit, otherwise each takes the full row.
## Measures the row's real width (a narrow drawer, a portrait window) and re-measures whenever it changes.
static func fit_split(cols: Container, app, pref: Array) -> void:
	if not cols is HFlowContainer: return
	var avail := 0.0
	if cols.is_inside_tree() and cols.size.x > 100.0: avail = cols.size.x
	elif cols.is_inside_tree(): avail = avail_w(cols)
	elif app != null:
		avail = app.vw() - (app.RAIL_W + 14.0 if Layout.phone else 40.0) - 52.0
		if not (str(app.get("cur")) in app.FULL): avail = minf(avail, app.drawer_w() - 70.0)
	else: avail = avail_w(cols)
	_split_now(cols, pref, avail)
	if cols.has_meta("split"): return
	cols.set_meta("split", pref)
	var id := cols.get_instance_id()
	cols.resized.connect(func():
		var c = instance_from_id(id)
		if c != null and (c as Control).size.x > 100.0: Kit._split_now(c, c.get_meta("split"), (c as Control).size.x))

static func _split_now(cols: Container, pref: Array, avail: float) -> void:
	var kids := cols.get_children().filter(func(c): return c is Control and (c as Control).visible)
	var n := kids.size()
	if n == 0: return
	var sum := 0.0
	for i in n: sum += float(pref[mini(i, pref.size() - 1)])
	var gap := 12.0 * maxf(0.0, n - 1.0)
	var min_each := 400.0
	var fits := true
	for i in n: if (avail - gap) * float(pref[mini(i, pref.size() - 1)]) / sum < min_each: fits = false
	for i in n:
		var c := kids[i] as Control
		var w := floorf((avail - gap) * float(pref[mini(i, pref.size() - 1)]) / sum if fits else avail - 1.0)
		if absf(c.custom_minimum_size.x - w) > 1.0: c.custom_minimum_size.x = maxf(0.0, w)
		c.size_flags_horizontal = Control.SIZE_FILL

## True when the node sits inside a touch screen's single scroller (ScreenScroll): nested scroll areas are then flattened into it.
static func _wrapped(n: Node) -> bool:
	var p := n
	while p != null:
		if p is ScreenScroll: return true
		p = p.get_parent()
	return false

## A column. `min_w` is a preference: it is capped to the space the column really has (a narrow drawer gets one full-width column, not a clipped 560px one).
static func column(parent: Control, min_w := 0.0, expand := true, flat := false, own_scroll := false) -> VBoxContainer:
	if Layout.touch and not own_scroll and (flat or _wrapped(parent)):   # the whole screen already scrolls: no scroll area of its own
		var fv := VBoxContainer.new(); fv.add_theme_constant_override("separation", 10); fv.custom_minimum_size = Vector2(minf(min_w, avail_w(parent)), 0)
		if expand: fv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		parent.add_child(fv); return fv
	var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO if Layout.phone else ScrollContainer.SCROLL_MODE_DISABLED; sc.size_flags_vertical = Control.SIZE_EXPAND_FILL; sc.follow_focus = true
	if expand: sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.custom_minimum_size = Vector2(min_w, 0)
	var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 10); sc.add_child(_end_pad(v)); parent.add_child(sc)
	if min_w > 0.0: _cap_min_w(sc, min_w)
	return v

## Keep a column's minimum width within its row: side by side it takes at most its share, so columns shrink instead of running off the drawer.
static func _cap_min_w(c: Control, min_w: float) -> void:
	c.set_meta("min_w", min_w)
	var id := c.get_instance_id()
	var fix := func():
		var x = instance_from_id(id)
		if x == null or (x as Control).get_parent() == null: return
		var row := (x as Control).get_parent() as Control
		var n := 0
		for k in row.get_children(): if k is Control and (k as Control).visible: n += 1
		var share := (row.size.x - 12.0 * maxf(0.0, n - 1.0)) / maxf(1.0, n) if row is BoxContainer else row.size.x
		var w := minf(float(x.get_meta("min_w")), maxf(160.0, share - 2.0)) if row.size.x > 100.0 else float(x.get_meta("min_w"))
		if absf((x as Control).custom_minimum_size.x - w) > 1.0: (x as Control).custom_minimum_size.x = w
	c.tree_entered.connect(func():
		var x = instance_from_id(id)
		if x == null: return
		var row := (x as Control).get_parent() as Control
		if row != null and not row.resized.is_connected(fix): row.resized.connect(fix)
		fix.call_deferred())

static func stat(lbl: String, value: String, col: Color = TX) -> VBoxContainer:
	var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 0)
	var name := label(lbl.to_upper(), 11, DIM); var val := label(value, 20, col)
	if Layout.compact:   # small screens: the name wraps at spaces and the number shrinks to fit rather than breaking or widening the drawer
		wrap_words(name, 11); wrap_words(val, 13)
	v.add_child(name); v.add_child(val); return v

static func stats(items: Array, cols := 4) -> GridContainer:
	if Layout.phone: cols = mini(cols, 2)
	var g := GridContainer.new(); g.columns = cols; g.add_theme_constant_override("h_separation", SP_M); g.add_theme_constant_override("v_separation", SP_S); g.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for it in items: g.add_child(stat(it[0], it[1], it[2] if it.size() > 2 else TX))
	return g

static func bar(v: float, mx: float, warn := false) -> ProgressBar:
	var p := ProgressBar.new(); p.show_percentage = false; p.custom_minimum_size = Vector2(0, 10); p.max_value = 1.0; p.value = clampf(v / maxf(1e-9, mx), 0.0, 1.0)
	var col := RD if v > mx else (AM if warn or v > mx * 0.85 else GR)
	var bg := sb(FIELD.lerp(LINE, 0.35), Color(0, 0, 0, 0), 5, 0, 0); var fg := sb(col, Color(0, 0, 0, 0), 5, 0, 0)
	for s in [bg, fg]: s.content_margin_top = 0; s.content_margin_bottom = 0
	p.add_theme_stylebox_override("background", bg); p.add_theme_stylebox_override("fill", fg); return p

static func tag(t: String, col: Color = CY) -> Control:
	return chip(t, col, 11)

static func tip(text: String) -> PanelContainer:
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", card_sb(legible(AM, TIPF, 3.0), TIPF, 2, 12)); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 10); p.add_child(hb)
	var c := chip("TIP", Color(1.0, 0.82, 0.25), 12); c.size_flags_vertical = Control.SIZE_SHRINK_BEGIN; hb.add_child(c)
	hb.add_child(label(text, 13, TIPX, true)); return p

const TERMS := "Plain-English terms:  SLA = the uptime you promise; miss it and you refund part of the bill.  tok/s = tokens per second, how much text a cluster can produce.  Mtok = a million tokens, what inference customers pay for.  TTFT = time to first token, how long a user waits for the first word.  TP = tensor parallel: how many GPUs share one model.  Ramp window = months you get after signing to deploy before the customer walks.  PUE = power overhead (1.3 means 30% extra for cooling and losses).  InfiniBand / RoCE = the network between racks."
## Learner mode gets a short glossary at the top of the jargon-heavy screens.
static func terms_tip(app) -> Control:
	if app == null or app.b == null or str(app.b.g.get("mode", "operator")) != "learner": return Control.new()
	var t := tip(TERMS); t.get_child(0).get_child(0).queue_free()
	var hb: HBoxContainer = t.get_child(0); var c := chip("WORDS", Color(0.35, 0.82, 1.0), 12); c.size_flags_vertical = Control.SIZE_SHRINK_BEGIN; hb.add_child(c); hb.move_child(c, 0)
	return t

static func issue(sev: String, head: String, msg: String) -> PanelContainer:
	var col := RD if sev == "error" else (AM if sev == "warn" else CY)
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", sb(tint(col, 0.1), legible(col, PANEL_FILL, 3.0), R_M, 1, 9)); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var hc := legible(col, tint(col, 0.1), 4.5)
	p.add_child(rich("[b][color=#%s]%s[/color][/b]  %s" % [hc.to_html(false), head, msg] if not Layout.phone else "[color=#%s]●[/color]  %s" % [hc.to_html(false), msg], 14)); return p

static func issues(parent: Control, list: Array) -> void:
	if list.is_empty(): parent.add_child(issue("info", "All clear", "No problems detected.")); return
	var order := {"error": 0, "warn": 1, "info": 2}
	var s := list.duplicate(); s.sort_custom(func(a, b): return order.get(a.severity, 3) < order.get(b.severity, 3))
	for i in s: parent.add_child(issue(i.severity, "%s · %s" % [i.severity, i.code], i.message))

static func hsep() -> HSeparator:
	var h := HSeparator.new(); var s := StyleBoxLine.new(); s.color = LINE; s.thickness = 1; h.add_theme_stylebox_override("separator", s); return h

static func row(parent: Control, left: Control, right: Array = []) -> HBoxContainer:
	var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 10); h.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL; h.add_child(left)
	for r in right: h.add_child(r)
	parent.add_child(h); return h

## Table: headers = [text...], rows = Array of Array[Control|String]; widths optional stretch ratios.
## Never wider than its container: text cells wrap, and when even that does not fit the rows turn into stacked cards of
## "header: value" lines with the row's buttons on a line of their own (so action buttons always stay visible).
static func table(headers: Array, rows: Array, _ratios: Array = []) -> Control:
	return KitTable.new(headers, rows)

# ---------- form controls ----------
## Number box. On touch it gets tap-sized − / + buttons beside it.
static func spin(value: float, mn: float, mx: float, step: float, cb: Callable) -> SpinBox:
	var s := SpinBox.new(); s.min_value = mn; s.max_value = mx; s.step = step; s.value = value; s.custom_minimum_size = Vector2(110, maxf(0.0, Layout.tap()))
	style_spin(s); s.value_changed.connect(cb); return s

static func style_spin(s: SpinBox) -> void:
	if s.has_meta("kit_ctl"): return
	s.set_meta("kit_ctl", true)
	var le := s.get_line_edit()
	le.add_theme_stylebox_override("normal", sb(FIELD, PANEL_EDGE, R_S, 1, 8)); le.add_theme_stylebox_override("focus", sb(FIELD, FOCUS, R_S, 2, 8)); le.add_theme_stylebox_override("read_only", sb(BTN_DIS, LINE, R_S, 1, 8))
	for c in ["font_color", "font_selected_color", "caret_color"]: le.add_theme_color_override(c, TX)
	le.add_theme_color_override("selection_color", SEL); le.add_theme_font_size_override("font_size", 16 if Layout.touch else 15)
	for c in ["up_icon_modulate", "up_hover_icon_modulate", "up_pressed_icon_modulate", "down_icon_modulate", "down_hover_icon_modulate", "down_pressed_icon_modulate"]: s.add_theme_color_override(c, TX)
	if Layout.touch: _with_steps(s)

## Slider. Touch gets a big grabber, a tap-tall track and − / + step buttons (fine control without a steady finger).
## `readout` (a format like "%d racks") adds a fixed-width value label, so the track never resizes while dragging.
## Huge ranges (max >= 16x min, e.g. 1..64 racks) use a log scale so small values are not crammed at the far left.
static func slider(value: float, mn: float, mx: float, step: float, cb: Callable, readout := "") -> HSlider:
	var s := HSlider.new(); s.min_value = mn; s.max_value = mx; s.step = step
	if mn > 0.0 and mx / mn >= 16.0: s.exp_edit = true
	s.value = value; s.size_flags_horizontal = Control.SIZE_EXPAND_FILL; s.custom_minimum_size = Vector2(120, maxf(28.0, Layout.tap()))
	if readout != "": s.set_meta("readout", readout)
	s.value_changed.connect(cb); style_slider(s); return s

static func style_slider(s: Slider) -> void:
	if s.has_meta("kit_ctl"): return
	s.set_meta("kit_ctl", true)
	var big := Layout.touch
	var th := 10 if big else 6
	var track := sb(FIELD, PANEL_EDGE, th, 1, 0); track.content_margin_top = th * 0.5; track.content_margin_bottom = th * 0.5
	var fill := sb(PRI, PRI.darkened(0.2), th, 1, 0); fill.content_margin_top = th * 0.5; fill.content_margin_bottom = th * 0.5
	s.add_theme_stylebox_override("slider", track); s.add_theme_stylebox_override("grabber_area", fill); s.add_theme_stylebox_override("grabber_area_highlight", fill)
	var d := 34 if big else 20
	var knob := Color(0.97, 0.98, 1.0)
	s.add_theme_icon_override("grabber", _circle_tex(d, knob, legible(PRI.darkened(0.15), knob, 3.0), 3.0 if big else 2.0))
	s.add_theme_icon_override("grabber_highlight", _circle_tex(d, knob.lerp(PRI, 0.18), legible(PRI.darkened(0.15), knob, 3.0), 3.0 if big else 2.0))
	s.add_theme_icon_override("grabber_disabled", _circle_tex(d, BTN_DIS, LINE, 2.0))
	if s.custom_minimum_size.y < d + 4: s.custom_minimum_size.y = d + 4
	ring(s); no_click_focus(s)
	if big or s.has_meta("readout"): _with_steps(s)

## A visible focus ring for controls that have none by default (sliders): a controller user must see where focus is.
static func ring(c: Control) -> void:
	var f := StyleBoxFlat.new(); f.bg_color = Color(0, 0, 0, 0); f.border_color = FOCUS; f.set_border_width_all(2); f.set_corner_radius_all(R_M)
	f.content_margin_top = 4; f.content_margin_bottom = 4
	c.add_theme_stylebox_override("focus", f)

## Put − / + buttons (touch) and the value readout (if any) beside a slider or number box, once it is in its row.
static func _with_steps(r: Range) -> void:
	if r.has_meta("kit_steps"): return
	r.set_meta("kit_steps", true)
	var id := r.get_instance_id()
	var go := func(): Kit._attach_steps(id)
	if r.is_inside_tree(): go.call_deferred()
	else: r.tree_entered.connect(func(): go.call_deferred(), CONNECT_ONE_SHOT)

static func _attach_steps(id: int) -> void:
	var r = instance_from_id(id)
	if r == null or not is_instance_valid(r) or not (r as Node).is_inside_tree(): return
	var rg := r as Range; var par := rg.get_parent()
	if par == null or par is ScrollContainer or par.has_meta("kit_stepper") or rg.has_meta("no_steps"): return
	for sib in par.get_children():   # the screen already put its own − / + beside it: do not double them
		if sib is Button and (sib as Button).text.strip_edges() in ["−", "-", "+", "–"]: return
	var row := HBoxContainer.new(); row.set_meta("kit_stepper", true); row.add_theme_constant_override("separation", SP_XS if not Layout.touch else 6)
	row.size_flags_horizontal = rg.size_flags_horizontal; row.size_flags_vertical = rg.size_flags_vertical; row.size_flags_stretch_ratio = rg.size_flags_stretch_ratio
	var idx := rg.get_index()
	par.remove_child(rg); par.add_child(row); par.move_child(row, idx)
	var stp := rg.step if rg.step > 0.0 else (rg.max_value - rg.min_value) / 20.0
	if Layout.touch:
		var tp := maxf(44.0, Layout.tap())
		var minus := btn("−", func(): Kit._nudge(id, -stp), "", 20); minus.custom_minimum_size = Vector2(tp, tp); minus.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var plus := btn("+", func(): Kit._nudge(id, stp), "", 20); plus.custom_minimum_size = Vector2(tp, tp); plus.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(minus); row.add_child(rg); row.add_child(plus)
	else: row.add_child(rg)
	if rg.size_flags_horizontal & Control.SIZE_EXPAND: rg.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if rg.has_meta("readout"):
		var fmt: String = rg.get_meta("readout")
		var lb := label(fmt % rg.value, 15, TX); lb.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT; lb.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var f: Font = lb.get_theme_font("font")
		lb.custom_minimum_size.x = ceilf(maxf(f.get_string_size(fmt % rg.max_value, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x, f.get_string_size(fmt % rg.min_value, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x)) + 6.0
		var lid := lb.get_instance_id()
		rg.value_changed.connect(func(v): Kit._set_text_id(lid, fmt % v))
		row.add_child(lb)

static func _nudge(id: int, d: float) -> void:
	var x = instance_from_id(id)
	if x != null and is_instance_valid(x): (x as Range).value += d

static func _set_text_id(id: int, t: String) -> void:
	var x = instance_from_id(id)
	if x != null and is_instance_valid(x): x.text = t

## Apply a slider's value when the player has settled on it: on release for mouse and touch, and a short moment after the last step for a controller or keyboard (which never "drag").
## Holds only the slider's id, so a screen rebuilt in the meantime (slider freed) is harmless.
static func on_set(sl: HSlider, apply: Callable) -> void:
	var tok := [0]; var id := sl.get_instance_id()
	sl.drag_ended.connect(func(ch): if ch: tok[0] += 1; apply.call(sl.value))
	sl.value_changed.connect(func(_v):
		if not sl.is_inside_tree(): return
		tok[0] += 1; var t: int = tok[0]
		sl.get_tree().create_timer(0.45).timeout.connect(func():
			var s = instance_from_id(id)
			if tok[0] == t and s != null and is_instance_valid(s) and (s as Node).is_inside_tree() and not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT): apply.call((s as Range).value)))

static func option(opts: Array, selected: String, cb: Callable) -> OptionButton:
	var o := OptionButton.new(); o.focus_mode = focus_mode(); o.add_theme_font_size_override("font_size", 14)
	if Layout.touch: o.custom_minimum_size.y = Layout.tap()
	var sel := 0
	for i in opts.size():
		var id: String = opts[i][0] if opts[i] is Array else opts[i]; var nm: String = opts[i][1] if opts[i] is Array else opts[i]
		o.add_item(nm); o.set_item_metadata(i, id)
		if id == selected: sel = i
	o.select(sel); style_option(o); o.item_selected.connect(func(i): cb.call(o.get_item_metadata(i))); return o

## Dropdowns: button look of the theme, a visible arrow, and a themed list (the engine default is dark-on-light-unfriendly).
static func style_option(o: OptionButton) -> void:
	if o.has_meta("kit_ctl"): return
	o.set_meta("kit_ctl", true)
	_paint(o, ""); o.add_theme_icon_override("arrow", _arrow_tex(BTN_INK)); o.add_theme_constant_override("arrow_margin", 10)
	o.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	var pm := o.get_popup()
	pm.add_theme_stylebox_override("panel", sb(PANEL_FILL, PANEL_EDGE, R_S, 2, 6)); pm.add_theme_stylebox_override("hover", sb(SEL, legible(PRI, SEL, 3.0), R_S, 1, 6))
	for c in ["font_color", "font_hover_color", "font_accelerator_color"]: pm.add_theme_color_override(c, TX)
	pm.add_theme_color_override("font_disabled_color", DIM)
	pm.add_theme_font_size_override("font_size", 17 if Layout.touch else 15)
	if Layout.touch: pm.add_theme_constant_override("v_separation", 22)
	pm.add_theme_icon_override("radio_checked", _dot_tex(10, PRI)); pm.add_theme_icon_override("radio_unchecked", _dot_tex(10, Color(0, 0, 0, 0)))
	no_click_focus(o)

static func check(text: String, on: bool, cb: Callable) -> CheckBox:
	var c := CheckBox.new(); c.text = text; c.button_pressed = on; c.focus_mode = focus_mode(); c.add_theme_font_size_override("font_size", 15 if Layout.touch else 14)
	if Layout.touch: c.custom_minimum_size.y = Layout.tap()
	style_check(c); c.toggled.connect(cb); return c

## Checkboxes: a clear, theme-tinted box (bigger on touch) that reads on every panel.
static func style_check(c: CheckBox) -> void:
	if c.has_meta("kit_ctl"): return
	c.set_meta("kit_ctl", true)
	var d := 30 if Layout.touch else 22
	c.add_theme_icon_override("checked", _box_tex(d, true, false)); c.add_theme_icon_override("unchecked", _box_tex(d, false, false))
	c.add_theme_icon_override("checked_disabled", _box_tex(d, true, true)); c.add_theme_icon_override("unchecked_disabled", _box_tex(d, false, true))
	for k in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color", "font_hover_pressed_color"]: c.add_theme_color_override(k, TX)
	c.add_theme_color_override("font_disabled_color", legible(DIM, PANEL_FILL, 3.2)); c.add_theme_constant_override("h_separation", 10)
	var e := sb(Color(0, 0, 0, 0), Color(0, 0, 0, 0), R_S, 0, 6)
	var hv := e if Layout.touch else sb(Color(TX.r, TX.g, TX.b, 0.06), Color(0, 0, 0, 0), R_S, 0, 6)
	for st in ["normal", "pressed", "disabled"]: c.add_theme_stylebox_override(st, e)
	for st in ["hover", "hover_pressed"]: c.add_theme_stylebox_override(st, hv)
	c.add_theme_stylebox_override("focus", focus_sb())
	no_click_focus(c)

## Style any stock control the screens or the shell made without the kit (Settings sliders and dropdowns), so every theme reads.
static func style_control(n: Node) -> void:
	if n.has_meta("kit_ctl"): return
	if n is OptionButton: style_option(n)
	elif n is CheckBox: style_check(n)
	elif n is HSlider: style_slider(n)
	elif n is SpinBox: style_spin(n)

# ---------- generated icons (cached per theme) ----------
static var _tex_cache := {}
static func _sdf_box(p: Vector2, half: Vector2, r: float) -> float:
	var q := p.abs() - half + Vector2(r, r)
	return Vector2(maxf(q.x, 0.0), maxf(q.y, 0.0)).length() + minf(maxf(q.x, q.y), 0.0) - r

static func _seg_dist(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a; var t := clampf((p - a).dot(ab) / maxf(1e-6, ab.length_squared()), 0.0, 1.0)
	return p.distance_to(a + ab * t)

static func _box_tex(d: int, on: bool, dis: bool) -> Texture2D:
	var k := "box%d%s%s" % [d, on, dis]
	if _tex_cache.has(k): return _tex_cache[k]
	var img := Image.create(d, d, false, Image.FORMAT_RGBA8)
	var fill := PRI if on else FIELD; var edge := legible(PRI.darkened(0.2), PANEL_FILL, 3.0) if on else PANEL_EDGE; var mark := ink_on(PRI)
	if dis: fill = BTN_DIS; edge = LINE; mark = DIM
	var bw := 2.0 if d < 26 else 2.5; var r := d * 0.2
	var cen := Vector2(d, d) * 0.5; var half := cen - Vector2(0.5, 0.5)
	var a0 := Vector2(0.25, 0.53) * d; var a1 := Vector2(0.43, 0.71) * d; var a2 := Vector2(0.76, 0.31) * d; var mw := d * 0.1
	for y in d:
		for x in d:
			var p := Vector2(x + 0.5, y + 0.5)
			var sd := _sdf_box(p - cen, half, r)
			var a := clampf(0.5 - sd, 0.0, 1.0)
			if a <= 0.0: continue
			var col := edge.lerp(fill, clampf(-sd - bw + 0.5, 0.0, 1.0))
			if on:
				var md := minf(_seg_dist(p, a0, a1), _seg_dist(p, a1, a2))
				col = col.lerp(mark, clampf(mw - md + 0.5, 0.0, 1.0))
			img.set_pixel(x, y, Color(col.r, col.g, col.b, a))
	var t := ImageTexture.create_from_image(img); _tex_cache[k] = t; return t

static func _circle_tex(d: int, fill: Color, edge: Color, ew: float) -> Texture2D:
	var k := "c%d%s%s%.1f" % [d, fill.to_html(), edge.to_html(), ew]
	if _tex_cache.has(k): return _tex_cache[k]
	var img := Image.create(d, d, false, Image.FORMAT_RGBA8)
	var r := d * 0.5 - 0.5; var c := Vector2(d, d) * 0.5
	for y in d:
		for x in d:
			var dist := Vector2(x + 0.5, y + 0.5).distance_to(c)
			var a := clampf(r - dist + 0.5, 0.0, 1.0)
			if a <= 0.0: continue
			var col := edge.lerp(fill, clampf(r - ew - dist + 0.5, 0.0, 1.0))
			img.set_pixel(x, y, Color(col.r, col.g, col.b, a * col.a))
	var t := ImageTexture.create_from_image(img); _tex_cache[k] = t; return t

static func _dot_tex(d: int, col: Color) -> Texture2D:
	return _circle_tex(d, col, col, 0.0)

static func _arrow_tex(col: Color) -> Texture2D:
	var k := "arrow%s" % col.to_html()
	if _tex_cache.has(k): return _tex_cache[k]
	var w := 14; var h := 9
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	var a0 := Vector2(1.5, 1.5); var a1 := Vector2(w * 0.5, h - 1.5); var a2 := Vector2(w - 1.5, 1.5)
	for y in h:
		for x in w:
			var p := Vector2(x + 0.5, y + 0.5)
			var md := minf(_seg_dist(p, a0, a1), _seg_dist(p, a1, a2))
			var a := clampf(1.6 - md, 0.0, 1.0)
			if a > 0.0: img.set_pixel(x, y, Color(col.r, col.g, col.b, a))
	var t := ImageTexture.create_from_image(img); _tex_cache[k] = t; return t

# ---------- formatting ----------
## Unit prices ($/GPU-hour, $/Mtok): cents matter, so never round them away.
static func price(n: float) -> String:
	return "$%.2f" % n if n < 100.0 else usd(n)

static func usd(n: float) -> String:
	var a := absf(n); var s := "-" if n < 0 else ""
	if a >= 1e9: return "%s$%.2fB" % [s, a / 1e9]
	if a >= 1e6: return "%s$%.2fM" % [s, a / 1e6]
	if a >= 1e3: return "%s$%.1fk" % [s, a / 1e3]
	return "%s$%.0f" % [s, a]

static func num(n: float, d := 0) -> String:
	var s := ("%." + str(d) + "f") % n
	var parts := s.split("."); var ip: String = parts[0]; var neg := ip.begins_with("-"); if neg: ip = ip.substr(1)
	var out := ""; var c := 0
	for i in range(ip.length() - 1, -1, -1):
		out = ip[i] + out; c += 1
		if c % 3 == 0 and i > 0: out = "," + out
	return ("-" if neg else "") + out + ("." + parts[1] if parts.size() > 1 else "")

static func date_of(m: float) -> String:
	var mi := int(m); return "%s %d" % [["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][mi % 12], 2020 + mi / 12]

static func specs_of(i: Dictionary) -> Array:
	var f := func(v, d := "–"): return str(v) if v != null else d
	var n := func(v): return str(int(v)) if typeof(v) == TYPE_FLOAT and v == floorf(v) else str(v)
	match i.kind:
		"accelerator": return [["Memory", "%s GB %s" % [n.call(i.memGB), str(i.memType).to_upper()]], ["Mem BW", "%s TB/s" % n.call(i.memBWTBs)], ["FP8", "%s TF" % f.call(i.tflops.get("fp8"))], ["BF16", "%s TF" % f.call(i.tflops.get("bf16"))], ["TDP", "%s W" % n.call(i.tdpW)], ["Scale-up", "%s %s GB/s ×%s" % [i.scaleUp, n.call(i.scaleUpGBs), n.call(i.maxScaleUpDomain)]], ["Scale-out", "%s Gb/s" % n.call(i.nativeScaleOutGbps)], ["Cooling", "/".join(i.cooling)]]
		"uplink": return [["Speed", "%s Gb/s" % n.call(i.gbps)], ["Service", i.service], ["Carrier", i.carrier], ["Monthly", "$" + num(i.mrcUSD)]]
		"cpu": return [["Cores", "%s %s" % [n.call(i.cores), i.arch]], ["TDP", "%s W" % n.call(i.tdpW)], ["Mem BW", "%s GB/s" % n.call(i.memBWGBs)], ["PCIe", "Gen%s ×%s" % [n.call(i.pcieGen), n.call(i.pcieLanes)]]]
		"nic": return [["Class", i.nicClass], ["Rate", "%s Gb/s ×%s" % [n.call(i.gbps), n.call(i.ports)]], ["Power", "%s W" % n.call(i.watts)], ["Features", ", ".join(i.features.slice(0, 4))]]
		"switch": return [["Role", i.role], ["Ports", "%s × %sG" % [n.call(i.portCount), n.call(i.portGbps)]], ["Capacity", "%s Tb/s" % n.call(i.capacityTbps)], ["Power", "%s W" % n.call(i.watts)], ["Size", "%sU" % n.call(i.rackUnits)]]
		"cable": return [["Type", i.cableType], ["Rate", "%sG" % n.call(i.gbps)], ["Reach", "%s m" % n.call(i.maxReachM)], ["Power", "%s W/end" % n.call(i.wattsPerEnd)]]
		"chassis": return [["Size", "%sU %s" % [n.call(i.rackUnits), i.rackStandard]], ["Cooling", i.cooling], ["Max power", "%.1f kW" % (i.maxPowerW / 1000.0)], ["Weight", "%s kg" % n.call(i.weightKg)]]
		"rack": return [["Units", "%sU" % n.call(i.units)], ["Max", "%s kW" % n.call(i.maxKW)], ["Weight", "%s kg" % n.call(i.maxWeightKg)], ["Cooling", "/".join(i.cooling)]]
		"power": return [["Type", i.powerType], ["Capacity", "%s kW" % n.call(i.capacityKW)], ["Efficiency", "%.1f%%" % (i.efficiency * 100.0)], ["Install", "%s mo" % n.call(i.installMonths)]]
		"cooling": return [["Type", i.coolingType], ["Capacity", "%s kW" % n.call(i.capacityKW)], ["Overhead", "%s W/kW" % n.call(i.wattsPerKW)], ["Serves", i.serves], ["Supply", "%s°C" % n.call(i.supplyTempC)]]
		"storage": return [["Tier", i.tier], ["Capacity", "%s PB" % n.call(i.capacityPB)], ["Read", "%s GB/s" % n.call(i.readGBs)], ["Size", "%sU" % n.call(i.rackUnits)]]
		"memory": return [["Type", i.type], ["Capacity", "%s GB" % n.call(i.capacityGB)], ["Speed", "%s MT/s" % n.call(i.speedMTs)]]
		"nvme": return [["Capacity", "%s TB" % n.call(i.capacityTB)], ["Read", "%s GB/s" % n.call(i.readGBs)], ["PCIe", "Gen%s" % n.call(i.pcieGen)]]
	return []

static func codex_card(parent: Control, codex: Dictionary, name := "") -> void:
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", sb(field(), LINE, 8, 1, 12)); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 5); p.add_child(v)
	if name != "": v.add_child(label(name, 15, TX, true))
	v.add_child(label(codex.summary, 14, TX, true)); v.add_child(label(codex.explain, 13, DIM, true))
	for t in codex.tradeoffs: v.add_child(label("•  " + t, 13, TX, true))
	parent.add_child(p)


## Put scroll positions back at once (no frame at the top): the new bars have no range yet, so give them one first.
## True when `n` or any parent up to `root` is queued for deletion (a rebuild frees the old screen root, not each child).
static func _dying(n: Node, root: Node) -> bool:
	var p := n
	while p != null:
		if p.is_queued_for_deletion(): return true
		if p == root: break
		p = p.get_parent()
	return false

static func _restore_now(node: Node, vals: Array) -> void:
	var scs := node.find_children("*", "ScrollContainer", true, false).filter(func(s): return not _dying(s, node))
	for i in mini(scs.size(), vals.size()):
		var sc := scs[i] as ScrollContainer
		var bar := sc.get_v_scroll_bar(); bar.max_value = maxf(bar.max_value, float(vals[i]) + 6000.0)
		sc.scroll_vertical = vals[i]

## Rebuild a screen without losing scroll positions (rebuild frees old ScrollContainers; restore by index).
static func refresh_keep(node: Control) -> void:
	if not node.has_method("refresh"): return
	var vals := []
	for sc in node.find_children("*", "ScrollContainer", true, false): vals.append((sc as ScrollContainer).scroll_vertical)
	node.refresh()
	_restore_now(node, vals)
	if vals.is_empty() or not node.is_inside_tree(): return
	var tree := node.get_tree()
	await tree.process_frame; await tree.process_frame
	if not is_instance_valid(node): return
	var scs := node.find_children("*", "ScrollContainer", true, false).filter(func(s): return not s.is_queued_for_deletion())
	for i in mini(scs.size(), vals.size()): (scs[i] as ScrollContainer).scroll_vertical = vals[i]

## Collapsible panel. `folds` is a persistent Dictionary (key -> bool collapsed); toggling calls `on_toggle`.
## The header is a disclosure row, not a button: chevron (▸ closed / ▾ open), accent bar on the left, a soft accent tint
## when open; its hover / press highlight spans the card's full inner width. Long titles wrap.
static func fold_panel(title: String, key: String, folds: Dictionary, on_toggle: Callable, glow := false, parent: Control = null, default_collapsed := false, logo := "") -> Array:
	var collapsed: bool = folds.get(key, default_collapsed)
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", card_sb(accent if glow else PANEL_EDGE, PANEL_FILL, 3 if glow else 2, 12)); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 7); p.add_child(v)
	var hb := Button.new(); hb.text = ("▸  " if collapsed else "▾  ") + title.to_upper()
	hb.alignment = HORIZONTAL_ALIGNMENT_LEFT; hb.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; hb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.focus_mode = focus_mode(); hb.custom_minimum_size.y = maxf(36.0, Layout.tap())
	hb.add_theme_font_size_override("font_size", fs(14)); hb.add_theme_font_override("font", Fonts.bold)
	var acc := legible(accent, PANEL_FILL, 3.0)
	var ex := 9.0 if glow else 10.0   # reach the card's inner edge (content margin 12 minus the border)
	var mk := func(bg: Color, bar_a: float) -> StyleBoxFlat:
		var s := StyleBoxFlat.new(); s.bg_color = bg; s.border_color = Color(acc.r, acc.g, acc.b, bar_a); s.border_width_left = 4; s.set_corner_radius_all(R_S - 1)
		s.content_margin_left = 10; s.content_margin_right = 8; s.content_margin_top = 6; s.content_margin_bottom = 6
		s.expand_margin_left = ex if logo == "" else 0.0; s.expand_margin_right = ex; s.expand_margin_top = 3; s.expand_margin_bottom = 3
		return s
	var normal: StyleBoxFlat = mk.call(tint(accent, 0.10) if not collapsed else Color(0, 0, 0, 0), 1.0 if not collapsed else 0.5)
	hb.add_theme_stylebox_override("normal", normal)
	hb.add_theme_stylebox_override("hover", normal if Layout.touch else mk.call(tint(accent, 0.17), 1.0))
	hb.add_theme_stylebox_override("pressed", mk.call(tint(accent, 0.24), 1.0)); hb.add_theme_stylebox_override("hover_pressed", mk.call(tint(accent, 0.24), 1.0))
	hb.add_theme_stylebox_override("focus", focus_sb())
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color", "font_hover_pressed_color"]: hb.add_theme_color_override(c, TX)
	hb.pressed.connect(func(): folds[key] = not collapsed; on_toggle.call())
	if logo != "":   # company logo to the left of the header
		var hr := HBoxContainer.new(); hr.add_theme_constant_override("separation", 8); hr.add_child(Logo.make(logo, 30.0)); hr.add_child(hb); v.add_child(hr)
	else: v.add_child(hb)
	var body := VBoxContainer.new(); body.add_theme_constant_override("separation", 7); body.visible = not collapsed; v.add_child(body)
	if parent: parent.add_child(p)
	return [p, body]

## Okabe-Ito colour-blind-safe palette (used when Settings.colorblind).
const CB_PALETTE := [Color("#E69F00"), Color("#56B4E9"), Color("#009E73"), Color("#F0E442"), Color("#0072B2"), Color("#D55E00"), Color("#CC79A7"), Color("#FFFFFF")]

## Stable per cluster: derived from the id itself, so disbanding another cluster never recolours this one.
static func cluster_color(_g: Dictionary, id) -> Color:
	var n := int(str(id).substr(3)) if str(id).length() > 3 else 0
	if Settings.colorblind: return CB_PALETTE[n % CB_PALETTE.size()]
	return Color.from_hsv(fmod(n * 0.137 + 0.02, 1.0), 0.75, 1.0)

## Modal yes/no. `host` is any node inside the UI tree (it is parented to the top-level control).
## A real modal: dimmed scrim (the screen behind cannot be clicked), a title line, focus starts on the safe button (Cancel);
## Tab / arrows / D-pad move, Return / A activate, Esc / B cancel. It fits small screens. It keeps its own callback, so a screen
## refresh that frees the opener never breaks it. A title is taken from the first question in `text` unless `head` is given;
## `kind` is the confirm button's kind (default: "danger" for destructive words like Sell / Cancel / Let go, else "pri").
static func confirm(host: Node, text: String, on_yes: Callable, yes_label := "Confirm", kind := "", head := "") -> void:
	if host == null or not is_instance_valid(host) or not host.is_inside_tree(): return
	var tree := host.get_tree()
	var layer: Node = tree.current_scene.get("root") if tree.current_scene != null else null
	if layer == null:
		if on_yes.is_valid(): on_yes.call()
		return
	var old := layer.get_node_or_null("confirm")
	if old != null: old.name = "confirm_old"; old.queue_free()
	var t := head; var msg := text
	if t == "":
		var q := text.find("? ")
		if q > 0 and q < 160: t = text.substr(0, q + 1); msg = text.substr(q + 2).strip_edges()
		elif text.ends_with("?") and text.length() < 160: t = text; msg = ""
		else: t = "Please confirm"
	if kind == "":
		var y := yes_label.to_lower(); kind = "pri"
		for w in ["sell", "cancel", "let go", "uncluster", "decommission", "delete", "abandon", "fire", "quit", "scrap"]:
			if y.begins_with(w): kind = "danger"
	var h := ConfirmLayer.new(); h.name = "confirm"; h.set_anchors_preset(Control.PRESET_FULL_RECT); h.mouse_filter = Control.MOUSE_FILTER_STOP; h.on_yes = on_yes
	var dim := ColorRect.new(); dim.color = Color(SCRIM.r, SCRIM.g, SCRIM.b, 0.7); dim.set_anchors_preset(Control.PRESET_FULL_RECT); dim.mouse_filter = Control.MOUSE_FILTER_STOP; h.add_child(dim)
	var cc := CenterContainer.new(); cc.set_anchors_preset(Control.PRESET_FULL_RECT); cc.mouse_filter = Control.MOUSE_FILTER_IGNORE; h.add_child(cc)
	var pn := PanelContainer.new(); var ps := card_sb(legible(CY, PANEL_FILL, 3.0), PANEL_FILL, 2, 20); ps.shadow_size = 1; ps.shadow_offset = Vector2(6, 6)
	pn.add_theme_stylebox_override("panel", ps); cc.add_child(pn); h.pn = pn
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", SP_M); pn.add_child(vb)
	var tl := Label.new(); tl.text = t; tl.label_settings = ls_bold(19, TX); tl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; tl.size_flags_horizontal = Control.SIZE_EXPAND_FILL; vb.add_child(tl)
	if msg != "": vb.add_child(label(msg, 15, TX, true))
	var row := HBoxContainer.new(); row.add_theme_constant_override("separation", SP_S); row.alignment = BoxContainer.ALIGNMENT_END; vb.add_child(row)
	var no := btn("Cancel", h._no, "", 16); var yes := btn(yes_label, h._yes, kind, 16)
	for b in [no, yes]:
		b.focus_mode = Control.FOCUS_ALL; b.custom_minimum_size.x = 120.0
		if Layout.phone: b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(no); row.add_child(yes)
	h.no_b = no; h.yes_b = yes
	layer.add_child(h)

## The confirm dialog's root: owns the callback and handles keys / pad while it is open.
class ConfirmLayer extends Control:
	var on_yes: Callable
	var yes_b: Button
	var no_b: Button
	var pn: PanelContainer
	var done := false
	var keyed := false

	func _ready() -> void:
		resized.connect(_fit); _fit()
		_focus(no_b, Kit.pad_mode); keyed = Kit.pad_mode
		Kit.appear(pn, false, 0.14)

	func _fit() -> void:
		if pn != null: pn.custom_minimum_size.x = clampf(size.x - 32.0, 240.0, 520.0)

	func _focus(b: Button, ring: bool) -> void:
		for x in [yes_b, no_b]:
			(x as Button).focus_mode = Control.FOCUS_ALL
			(x as Button).add_theme_stylebox_override("focus", Kit.focus_sb() if ring else StyleBoxEmpty.new())
		b.grab_focus()

	func _cur() -> Button:
		var f := get_viewport().gui_get_focus_owner()
		return yes_b if f == yes_b else no_b

	func _input(e: InputEvent) -> void:
		if done or not is_visible_in_tree(): return
		if e is InputEventKey and e.pressed:
			match (e as InputEventKey).keycode:
				KEY_ESCAPE: _no()
				KEY_TAB, KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN:
					var c := _cur()
					_focus((yes_b if c == no_b else no_b) if keyed else c, true); keyed = true
				KEY_ENTER, KEY_KP_ENTER, KEY_SPACE: _activate()
				_: return
			get_viewport().set_input_as_handled()
		elif e is InputEventJoypadButton and e.pressed:
			match (e as InputEventJoypadButton).button_index:
				JOY_BUTTON_A: _activate()
				JOY_BUTTON_B: _no()
				JOY_BUTTON_DPAD_LEFT, JOY_BUTTON_DPAD_RIGHT, JOY_BUTTON_DPAD_UP, JOY_BUTTON_DPAD_DOWN:
					var c := _cur(); _focus(yes_b if c == no_b else no_b, true); keyed = true
				_: return
			get_viewport().set_input_as_handled()

	func _activate() -> void:
		if _cur() == yes_b: _yes()
		else: _no()

	func _yes() -> void:
		if done: return
		done = true; queue_free()
		if on_yes.is_valid(): on_yes.call()

	func _no() -> void:
		if done: return
		done = true; queue_free()


## Responsive table (see Kit.table): a grid while it fits, stacked "header: value" cards when the container is narrower.
class KitTable extends VBoxContainer:
	var heads: Array = []
	var cells: Array = []     # rows of Controls
	var mode := ""
	var need := 0.0           # narrowest width at which the grid still works (text wrapped, buttons whole)
	const SEP := 14.0

	func _init(h: Array, r: Array) -> void:
		size_flags_horizontal = Control.SIZE_EXPAND_FILL; add_theme_constant_override("separation", 6); set_meta("kit_table", true)
		heads = h
		var ncol := maxi(h.size(), (r[0].size() if r.size() > 0 else 1))
		var colw: Array = []
		for i in ncol: colw.append(0.0)
		for i in h.size(): colw[i] = minf(Kit.label(str(h[i]).to_upper(), 11, Kit.DIM).get_minimum_size().x, 80.0)
		for row in r:
			var line: Array = []
			for i in row.size():
				var c = row[i]
				var ctl: Control = c if c is Control else Kit.label(str(c), 14, Kit.TX)
				line.append(ctl)
				var ci := mini(i, ncol - 1)
				colw[ci] = maxf(colw[ci], _need_of(ctl))
			cells.append(line)
		for w in colw: need += w
		need += SEP * maxf(0.0, ncol - 1.0)
		resized.connect(_check)

	## Narrowest a cell can usefully be: text wraps down to ~6 characters, controls keep their own minimum.
	static func _need_of(c: Control) -> float:
		if c is Label: return minf((c as Label).get_minimum_size().x, 96.0)
		return c.get_combined_minimum_size().x

	func _ready() -> void:
		_layout(_pick(size.x if size.x > 50.0 else Kit.avail_w(self)))

	func _pick(w: float) -> String: return "grid" if w >= need else "stack"

	func _check() -> void:
		if size.x < 50.0: return
		var m := _pick(size.x)
		if m != mode: _layout.call_deferred(m)

	func _layout(m: String) -> void:
		if m == mode or not is_inside_tree(): return
		mode = m
		for line in cells:
			for c in line:
				if is_instance_valid(c) and (c as Node).get_parent() != null: (c as Node).get_parent().remove_child(c)
		for k in get_children(): remove_child(k); k.queue_free()
		if m == "grid": _grid()
		else: _stack()

	func _grid() -> void:
		var ncol := maxi(heads.size(), (cells[0].size() if cells.size() > 0 else 1))
		var g := GridContainer.new(); g.columns = ncol; g.add_theme_constant_override("h_separation", int(SEP)); g.add_theme_constant_override("v_separation", 5); g.size_flags_horizontal = Control.SIZE_EXPAND_FILL; g.set_meta("kit_table", true)
		if heads.size() > 0:
			for hd in heads:
				var hl := Kit.label(str(hd).to_upper(), 11, Kit.DIM); hl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; hl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				hl.custom_minimum_size.x = minf(hl.get_minimum_size().x, 80.0); g.add_child(hl)
		for line in cells:
			for c in line:
				if c is Label:
					var l := c as Label
					l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
					l.custom_minimum_size.x = minf(Kit.TextW.of(l), 96.0)
				g.add_child(c)
		add_child(g)

	func _stack() -> void:
		var key_w := clampf(size.x * 0.36, 70.0, 160.0)
		for line in cells:
			var card := PanelContainer.new(); card.add_theme_stylebox_override("panel", Kit.sb(Kit.field(), Kit.LINE, Kit.R_M, 1, 10)); card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 3); card.add_child(v)
			var acts: Array = []
			for i in line.size():
				var c: Control = line[i]
				if c is BaseButton and not (c is CheckBox): acts.append(c); continue
				if c is Label:
					var l := c as Label; l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; l.custom_minimum_size.x = 0.0
				c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				var hd: String = str(heads[i]) if i < heads.size() else ""
				if hd == "": v.add_child(c); continue
				var hr := HBoxContainer.new(); hr.add_theme_constant_override("separation", 8)
				var hl := Kit.label(hd.to_upper(), 11, Kit.DIM, true); hl.custom_minimum_size.x = key_w; hl.size_flags_horizontal = Control.SIZE_FILL
				hr.add_child(hl); hr.add_child(c); v.add_child(hr)
			if not acts.is_empty():
				var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 6); fl.add_theme_constant_override("v_separation", 6)
				for a in acts: fl.add_child(a)
				v.add_child(fl)
			add_child(card)

## Natural one-line width of a label's text.
class TextW:
	static func of(l: Label) -> float:
		var f: Font = l.label_settings.font if l.label_settings != null and l.label_settings.font != null else l.get_theme_font("font")
		var sz: int = l.label_settings.font_size if l.label_settings != null else l.get_theme_font_size("font_size")
		return f.get_string_size(l.text, HORIZONTAL_ALIGNMENT_LEFT, -1, sz).x

## Scroll the page so `node` is at the top of the visible area (touch screens stack columns: after tapping a socket the part picker is far below the board).
static func reveal(node: Control) -> void:
	if node == null or not node.is_inside_tree(): return
	var tree := node.get_tree()
	for i in 9: await tree.process_frame   # let the screen's own scroll-holding after a rebuild finish first
	if not is_instance_valid(node) or not node.is_inside_tree() or TouchScroll.is_busy(): return
	var scs: Array = []   # every scroller around the node, innermost first (a column can scroll inside the page's own scroller)
	var p: Node = node.get_parent()
	while p != null:
		if p is ScrollContainer: scs.append(p)
		p = p.get_parent()
	for sc in scs:
		if not is_instance_valid(sc) or not is_instance_valid(node): return
		(sc as ScrollContainer).scroll_vertical = maxi(0, int(node.global_position.y - (sc as Control).global_position.y) + (sc as ScrollContainer).scroll_vertical - 8)
		await tree.process_frame

## Run `rebuild` (which frees and recreates the UI) without losing scroll positions.
static func rebuild_keep(node: Control, rebuild: Callable) -> void:
	var vals := []
	for sc in node.find_children("*", "ScrollContainer", true, false): vals.append((sc as ScrollContainer).scroll_vertical)
	var fi := -1; var fslider := false   # in pad mode keep the controller focus on "the same" control after the screen is rebuilt
	if pad_mode and node.is_inside_tree():
		var fo := node.get_viewport().gui_get_focus_owner()
		if fo != null and node.is_ancestor_of(fo):
			if fo is HSlider: fslider = true; fi = node.find_children("*", "HSlider", true, false).filter(func(b): return b.is_visible_in_tree()).find(fo)
			else: fi = node.find_children("*", "BaseButton", true, false).filter(func(b): return b.is_visible_in_tree() and b.focus_mode == Control.FOCUS_ALL).find(fo)
	rebuild.call()
	_restore_now(node, vals)
	if (vals.is_empty() and fi < 0) or not node.is_inside_tree(): return
	var tree := node.get_tree()
	await tree.process_frame; await tree.process_frame
	if not is_instance_valid(node): return
	var scs := node.find_children("*", "ScrollContainer", true, false).filter(func(s): return not s.is_queued_for_deletion())
	for i in mini(scs.size(), vals.size()): (scs[i] as ScrollContainer).scroll_vertical = vals[i]
	if fi >= 0 and pad_mode:
		var bs := node.find_children("*", "HSlider" if fslider else "BaseButton", true, false).filter(func(b): return b.is_visible_in_tree() and (fslider or b.focus_mode == Control.FOCUS_ALL))
		if not bs.is_empty(): bs[mini(fi, bs.size() - 1)].grab_focus()

## True when the mouse is over an interactive UI panel (so the 3D view must not react).
static func over_ui(node: Node) -> bool:
	# The 3D hall is not a Control, so ANY hovered Control (drawer, panel, label, empty drawer space) means the pointer is on UI.
	return node.get_viewport().gui_get_hovered_control() != null
