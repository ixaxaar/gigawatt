class_name Logo
extends Control
## Procedural company logo: a coloured badge with a mark and a monogram. Fully determined by the company name, no art assets.
## The 19 customers and 3 rivals have hand-assigned styles so no two share both colour and mark; any other name is hashed.

const PALETTE := [Color("#ff6b6b"), Color("#ff9f43"), Color("#ffd23f"), Color("#9be564"), Color("#2ed573"), Color("#1dd1a1"), Color("#35d0ff"), Color("#5b8def"), Color("#9b6bff"), Color("#d56bff"), Color("#ff6bd0"), Color("#c8d6e5")]
const MARKS := ["ring", "bars", "chevron", "grid", "wave", "split", "spark", "orbit"]
const SHAPES := ["round", "hex", "rounded", "diamond"]
const ARCH_EDGE := {"startup": Color("#ff3d8b"), "lab": Color("#35d0ff"), "enterprise": Color("#ffd23f"), "sovereign": Color("#c792ea"), "rival": Color("#ff5a5a"), "": Color("#9fb4c8")}
## name -> [colour, mark, shape, archetype]
const KNOWN := {
	"Stealth Labs": [8, 0, 0, "startup"], "Glyph AI": [3, 4, 2, "startup"], "Peregrine Models": [6, 2, 1, "startup"], "Otter Systems": [1, 7, 0, "startup"], "VectorForge": [10, 6, 3, "startup"],
	"MIT LIDS": [0, 1, 2, "lab"], "Flatiron Institute": [7, 3, 3, "lab"], "CERN OpenLab": [5, 7, 1, "lab"], "RIKEN AICS": [2, 5, 0, "lab"], "Turing Institute": [9, 0, 2, "lab"],
	"Acme Retail Media": [1, 1, 1, "enterprise"], "Helios Bank": [2, 6, 0, "enterprise"], "Nordwind Auto": [6, 3, 2, "enterprise"], "MedSyn Pharma": [4, 4, 3, "enterprise"], "Skyline Telecom": [8, 2, 1, "enterprise"],
	"EU Sovereign Cloud": [7, 5, 2, "sovereign"], "Emirates AI Council": [3, 7, 3, "sovereign"], "Nippon AI Grid": [0, 4, 1, "sovereign"], "Sovereign Tech Fund": [11, 0, 0, "sovereign"],
	"Hyperion Cloud": [0, 6, 1, "rival"], "Nimbus Compute": [7, 2, 3, "rival"], "Atlas Sovereign AI": [11, 5, 1, "rival"],
}

var company := ""
var px := 28.0

## A logo of `size` px for a company (works for any name).
static func make(name: String, size := 28.0) -> Logo:
	var l := Logo.new(); l.company = name; l.px = size; l.custom_minimum_size = Vector2(size, size); l.mouse_filter = Control.MOUSE_FILTER_IGNORE; l.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return l

## [colour index, mark index, shape index, archetype] for any name.
static func style_of(name: String) -> Array:
	if KNOWN.has(name): return KNOWN[name]
	var h := absi(name.hash())
	return [h % PALETTE.size(), (h / 12) % MARKS.size(), (h / 96) % SHAPES.size(), ""]

static func monogram(name: String) -> String:
	var words := name.split(" ", false); var out := ""
	for w in words:
		if out.length() >= 2: break
		var c := String(w).substr(0, 1).to_upper()
		out += c
	return out if out != "" else "?"

func _draw() -> void:
	var st := style_of(company); var col: Color = PALETTE[st[0]]; var s := minf(size.x, size.y)
	if s <= 0.0: s = px
	var c := Vector2(s, s) * 0.5; var r := s * 0.47
	var edge: Color = ARCH_EDGE.get(st[3], ARCH_EDGE[""]); var dark := Color(0.04, 0.05, 0.09)
	var poly: PackedVector2Array
	match SHAPES[st[2]]:
		"hex": poly = _ngon(c, r, 6, PI / 6.0)
		"diamond": poly = _ngon(c, r * 1.05, 4, 0.0)
		"rounded": poly = _ngon(c, r, 4, PI / 4.0, 0.85)
		_: poly = _ngon(c, r, 28, 0.0)
	draw_colored_polygon(poly, dark)
	var inner := PackedVector2Array(); for p in poly: inner.append(c + (p - c) * 0.84)
	draw_colored_polygon(inner, col.darkened(0.55))
	var lw := maxf(1.5, s * 0.07)
	var closed := poly.duplicate(); closed.append(poly[0]); draw_polyline(closed, edge, lw, true)
	_mark(MARKS[st[1]], c, r * 0.62, col, maxf(1.0, s * 0.055))
	if s >= 40.0:   # big enough to also carry the monogram
		var f: Font = Fonts.bold; var fs := int(s * 0.26); var m := monogram(company); var w := f.get_string_size(m, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		draw_string(f, Vector2(c.x - w * 0.5, c.y + r * 0.92 - fs * 0.05), m, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 1, 1, 0.92))

static func _ngon(c: Vector2, r: float, n: int, rot: float, squash := 1.0) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in n:
		var a := rot + TAU * i / n
		pts.append(c + Vector2(cos(a), sin(a)) * r * (squash if n == 4 else 1.0))
	return pts

func _mark(kind: String, c: Vector2, r: float, col: Color, lw: float) -> void:
	var up := Vector2(0, s_off())
	var ctr := c + up
	match kind:
		"ring": draw_arc(ctr, r * 0.8, 0, TAU, 32, col, lw * 1.6, true); draw_circle(ctr, r * 0.28, col)
		"bars":
			for i in 3: draw_rect(Rect2(ctr + Vector2(-r * 0.8 + i * r * 0.56, r * 0.5 - r * (0.7 + i * 0.35)), Vector2(r * 0.4, r * (0.7 + i * 0.35))), col)
		"chevron":
			for k in 2:
				var o := Vector2(0, -r * 0.35 + k * r * 0.6)
				draw_polyline(PackedVector2Array([ctr + o + Vector2(-r * 0.8, r * 0.3), ctr + o + Vector2(0, -r * 0.3), ctr + o + Vector2(r * 0.8, r * 0.3)]), col, lw * 1.8, true)
		"grid":
			for i in 3:
				for j in 3: draw_rect(Rect2(ctr + Vector2(-r * 0.8 + i * r * 0.58, -r * 0.8 + j * r * 0.58), Vector2(r * 0.42, r * 0.42)), col if (i + j) % 2 == 0 else col.darkened(0.4))
		"wave":
			var pts := PackedVector2Array()
			for i in 17: pts.append(ctr + Vector2(-r * 0.9 + i * r * 0.1125, sin(i * 0.8) * r * 0.45))
			draw_polyline(pts, col, lw * 1.8, true)
		"split":
			draw_colored_polygon(PackedVector2Array([ctr + Vector2(-r * 0.8, -r * 0.8), ctr + Vector2(r * 0.8, -r * 0.8), ctr + Vector2(-r * 0.8, r * 0.8)]), col)
			draw_colored_polygon(PackedVector2Array([ctr + Vector2(r * 0.8, -r * 0.55), ctr + Vector2(r * 0.8, r * 0.8), ctr + Vector2(-r * 0.55, r * 0.8)]), col.darkened(0.35))
		"spark":
			var pts2 := PackedVector2Array()
			for i in 8: pts2.append(ctr + Vector2.from_angle(PI / 4.0 * i) * (r * (0.95 if i % 2 == 0 else 0.3)))
			draw_colored_polygon(pts2, col)
		_:
			draw_arc(ctr, r * 0.85, 0, TAU, 28, col.darkened(0.2), lw, true); draw_arc(ctr, r * 0.4, 0, TAU, 20, col, lw * 1.4, true)
			draw_circle(ctr + Vector2(r * 0.85, 0).rotated(-0.9), r * 0.16, col)

func s_off() -> float: return -size.y * 0.06 if minf(size.x, size.y) >= 40.0 else 0.0
