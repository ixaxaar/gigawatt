class_name RackBoard
extends Control
## 42U rack elevation. Click an empty U to target/place, click a device to select it.
signal u_clicked(u: int)
signal device_clicked(i: int)
signal hover_u(u: int)
const UH := 22.0
const RW := 520.0
const RAIL := 26.0
const TOP := 44.0
var units := 42
var rack_name := ""
var max_kw := 40.0
var kw := 0.0
var devices: Array = []   # [{i, u, h, label, sub, color:Color, kind, count, unit_h}]
var occ: Array = []
var sel_u := -1
var sel_dev := -1
var hov := -1
var ghost := {}           # {s,h,ok}

func _init() -> void: custom_minimum_size = Vector2(0, 420); mouse_filter = Control.MOUSE_FILTER_STOP
func _H() -> float: return TOP + units * UH + 44.0
func _k() -> float: return minf(size.x / (RW + 84.0), size.y / _H())
func _o() -> Vector2: var k := _k(); return Vector2((size.x - (RW + 84.0) * k) * 0.5, (size.y - _H() * k) * 0.5)
func _p(v: Vector2) -> Vector2: return _o() + v * _k()
func _uB(u: float) -> float: return TOP + (units - u) * UH
func _txt(pos: Vector2, t: String, px: int, col: Color, center := false) -> void:
	var fnt: Font = Fonts.regular; var s := maxi(8, int(px * _k())); var w := fnt.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, s).x
	draw_string(fnt, _p(pos) + Vector2(-w * 0.5 if center else 0.0, 0), t, HORIZONTAL_ALIGNMENT_LEFT, -1, s, col)

func _draw() -> void:
	var k := _k()
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.03, 0.05, 0.08), true)
	draw_rect(Rect2(_p(Vector2(RAIL - 6, TOP - 6)), Vector2(RW - RAIL * 2 + 22, units * UH + 12) * k), Color(0.07, 0.09, 0.12), true)
	draw_rect(Rect2(_p(Vector2(RAIL - 6, TOP - 6)), Vector2(RW - RAIL * 2 + 22, units * UH + 12) * k), Color(0.3, 0.38, 0.48), false, 2.0)
	_txt(Vector2(RAIL, TOP - 16), "%s · %dU · %d kW" % [rack_name, units, int(max_kw)], 12, Color(0.56, 0.7, 0.81))
	var zones := [[maxi(0, units - 4), units, "TOR / NETWORK", Color(0.3, 0.82, 1.0)], [0, mini(units, 6), "POWER / STORAGE", Color(1.0, 0.69, 0.13)], [6, maxi(6, units - 4), "COMPUTE", Color(0.46, 0.73, 0.0)]]
	for z in zones:
		draw_rect(Rect2(_p(Vector2(RAIL + 2, _uB(z[1]))), Vector2(RW - RAIL * 2 + 10, (z[1] - z[0]) * UH) * k), Color(z[3].r, z[3].g, z[3].b, 0.06), true)
		_txt(Vector2(RW - RAIL + 4, _uB(z[1]) + 11), z[2], 9, z[3])
	for u in units:
		var x := Rect2(_p(Vector2(RAIL + 2, _uB(u + 1))), Vector2(RW - RAIL * 2 + 10, UH) * k)
		draw_line(x.position, x.position + Vector2(x.size.x, 0), Color(0.15, 0.2, 0.26), 1.0)
		if u % 2 == 0: _txt(Vector2(RAIL - 22, _uB(u + 1) + 15), str(u + 1), 9, Color(0.4, 0.5, 0.6))
		if occ.size() > u and occ[u] == -1 and (sel_u == u or hov == u): draw_rect(x, Color(0.3, 0.82, 1.0, 0.28) if sel_u == u else Color(0.3, 0.82, 1.0, 0.1), true)
	if not ghost.is_empty():
		var gr := Rect2(_p(Vector2(RAIL + 4, _uB(ghost.s + ghost.h) + 1)), Vector2(RW - RAIL * 2 + 6, ghost.h * UH - 2) * k)
		draw_rect(gr, Color(0.3, 0.82, 1.0, 0.22) if ghost.ok else Color(1.0, 0.36, 0.45, 0.22), true); draw_rect(gr, Color(0.3, 0.82, 1.0) if ghost.ok else Color(1.0, 0.36, 0.45), false, 2.0)
	for d in devices:
		for n in d.count if d.kind == "tray" else 1:
			var u0: float = d.u + n * d.unit_h; var hh: float = d.unit_h if d.kind == "tray" else d.h
			var r := Rect2(_p(Vector2(RAIL + 4, _uB(u0 + hh) + 1)), Vector2(RW - RAIL * 2 + 6, hh * UH - 2) * k)
			var c: Color = d.color; draw_rect(r, Color(c.r * 0.3, c.g * 0.3, c.b * 0.3), true); draw_rect(r, Color.WHITE if sel_dev == d.i else c, false, 2.5 if sel_dev == d.i else 1.5)
			draw_rect(Rect2(r.position + Vector2(3, 3) * k, Vector2(6, r.size.y - 6 * k)), c, true)
			_txt((r.position - _o()) / k + Vector2(16, minf(15.0, hh * UH / 2 + 4)), "%s   %s" % [str(d.label).left(34), d.sub], 11, Color.WHITE)
	var bx := RW + 30.0
	draw_rect(Rect2(_p(Vector2(bx, TOP)), Vector2(22, units * UH) * k), Color(0.05, 0.1, 0.16), true)
	var frac := minf(1.0, kw / maxf(1.0, max_kw)); var col := Color(1.0, 0.36, 0.45) if kw > max_kw else (Color(1.0, 0.69, 0.13) if kw > max_kw * 0.85 else Color(0.24, 0.86, 0.6))
	draw_rect(Rect2(_p(Vector2(bx, TOP + units * UH * (1.0 - frac))), Vector2(22, units * UH * frac) * k), col, true)
	_txt(Vector2(bx + 11, TOP - 8), "kW", 11, Color(0.6, 0.72, 0.8), true); _txt(Vector2(bx - 10, TOP + units * UH + 22), "%d / %d kW" % [int(kw), int(max_kw)], 11, Color(0.6, 0.72, 0.8))

func _u_at(pos: Vector2) -> int:
	var y := (pos.y - _o().y) / _k()
	return clampi(int(floor(units - (y - TOP) / UH)), 0, units - 1)

func _dev_at(u: int) -> int:
	for d in devices:
		var h: int = d.unit_h * d.count if d.kind == "tray" else d.h
		if u >= d.u and u < d.u + h: return d.i
	return -1

func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseMotion:
		var u := _u_at(e.position)
		if u != hov: hov = u; hover_u.emit(u); queue_redraw()
	elif e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		var u := _u_at(e.position); var d := _dev_at(u)
		if d >= 0: device_clicked.emit(d)
		else: u_clicked.emit(u)
