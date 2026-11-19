class_name RackBoard
extends Control
## Rack elevation (42U / 48U ...). Click an empty U to target/place, click a device to select it.
## Laid out in screen pixels, not scaled as a picture: every U row is at least `min_row` px tall (a finger-sized row on touch),
## labels sit inside the rows and end in "…", and one legend in the header names the zones. Arrow keys / D-pad move a cursor
## over the U positions; Enter / A acts on it.
signal u_clicked(u: int)
signal device_clicked(i: int)
signal hover_u(u: int)
signal u_moved(u: int)
const HEAD := 50.0
const FOOT := 26.0
const GUT := 30.0
const BAR := 22.0
var units := 42
var rack_name := ""
var max_kw := 40.0
var kw := 0.0
var devices: Array = []   # [{i, u, h, label, sub, color:Color, kind, count, unit_h}]
var occ: Array = []
var sel_u := -1
var sel_dev := -1
var cursor := -1          # keyboard / controller position (a U), -1 = none yet
var hov := -1
var ghost := {}           # {s,h,ok}
var min_row := 12.0
var flash_u := -1         # first U of a device that was just added: it glows for a moment
var flash_h := 1
var flash_a := 0.0:
	set(v): flash_a = v; queue_redraw()

func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP; focus_mode = Control.FOCUS_ALL; set_meta("key", "rack_board")
	min_row = 24.0 if Layout.touch else (18.0 if Layout.compact else 12.0)
	focus_entered.connect(queue_redraw); focus_exited.connect(queue_redraw)

func _ready() -> void:
	custom_minimum_size = Vector2(220, HEAD + units * min_row + FOOT)
	if flash_u >= 0:
		if Settings.reduced_motion: flash_a = 0.6; get_tree().create_timer(0.5).timeout.connect(func(): if is_instance_valid(self): flash_a = 0.0)
		else: var tw := create_tween(); tw.tween_property(self, "flash_a", 0.0, 1.1).from(1.0)

## Row height in px: fills the board's height, never below `min_row`.
func _uh() -> float: return maxf(min_row, (size.y - HEAD - FOOT) / maxf(1.0, units))
## Top edge (px) of the row that holds U index `u` (0 = bottom U) is _uB(u + 1); its bottom edge is _uB(u).
func _uB(u: float) -> float: return HEAD + (units - u) * _uh()
func _x0() -> float: return GUT
func _x1() -> float: return size.x - BAR - 16.0
## Pixel y of a U row's centre (for scrolling it into view).
func row_center(u: int) -> float: return _uB(u + 1) + _uh() * 0.5

func _fs(n: int) -> int: return maxi(10, n)
func _w(t: String, s: int) -> float: return Fonts.regular.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, s).x
func _str(at: Vector2, t: String, s: int, col: Color) -> void: draw_string(Fonts.regular, at, t, HORIZONTAL_ALIGNMENT_LEFT, -1, s, col)
## Draw `t` cut with "…" to fit `max_w` px.
func _ell(at: Vector2, t: String, max_w: float, s: int, col: Color) -> void:
	if max_w < s * 1.2: return
	var cur := t
	while cur.length() > 1 and _w(cur, s) > max_w:
		cur = cur.trim_suffix("…"); cur = cur.left(cur.length() - 1).strip_edges() + "…"
	_str(at, cur, s, col)

const ZONES := [["ToR / network", "ToR", Color(0.3, 0.82, 1.0)], ["Compute", "Compute", Color(0.46, 0.73, 0.0)], ["Power / storage", "Power", Color(1.0, 0.69, 0.13)]]

func _draw() -> void:
	var uh := _uh(); var x0 := _x0(); var x1 := _x1(); var rw := x1 - x0
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.03, 0.05, 0.08), true)
	# header: name line + one legend for the zone tints
	_ell(Vector2(8, 18), "%s · %dU · %d kW" % [rack_name, units, int(max_kw)], size.x - 16.0, 13, Color(0.7, 0.82, 0.92))
	var lx := 8.0; var short := false
	var full_w := 0.0
	for z in ZONES: full_w += 18.0 + _w(z[0], 12) + 14.0
	short = full_w > size.x - 16.0
	for z in ZONES:
		var t: String = z[1] if short else z[0]
		if lx + 18.0 + _w(t, 12) > size.x - 4.0: break
		draw_rect(Rect2(lx, 30, 11, 11), Color(z[2].r, z[2].g, z[2].b, 0.75), true); _str(Vector2(lx + 16.0, 40), t, 12, Color(0.72, 0.8, 0.88)); lx += 18.0 + _w(t, 12) + 14.0
	# the rack frame
	draw_rect(Rect2(x0 - 6, HEAD - 4, rw + 12, units * uh + 8), Color(0.07, 0.09, 0.12), true)
	draw_rect(Rect2(x0 - 6, HEAD - 4, rw + 12, units * uh + 8), Color(0.3, 0.38, 0.48), false, 2.0)
	var zones := [[maxi(0, units - 4), units, ZONES[0][2]], [0, mini(units, 6), ZONES[2][2]], [6, maxi(6, units - 4), ZONES[1][2]]]
	for z in zones: draw_rect(Rect2(x0, _uB(z[1]), rw, (z[1] - z[0]) * uh), Color(z[2].r, z[2].g, z[2].b, 0.07), true)
	var every := 1 if uh >= 15.0 else (2 if uh >= 9.0 else 4)
	for u in units:
		var y := _uB(u + 1); var x := Rect2(x0, y, rw, uh)
		draw_line(Vector2(x0, y), Vector2(x1, y), Color(0.15, 0.2, 0.26), 1.0)
		if (u + 1) % every == 0 or u == 0:
			var s := _fs(int(clampf(uh * 0.55, 10.0, 12.0))); var t := str(u + 1)
			_str(Vector2(x0 - 8.0 - _w(t, s), y + uh * 0.5 + s * 0.36), t, s, Color(0.45, 0.55, 0.65))
		if occ.size() > u and occ[u] == -1 and (sel_u == u or hov == u): draw_rect(x, Color(0.3, 0.82, 1.0, 0.28) if sel_u == u else Color(0.3, 0.82, 1.0, 0.1), true)
	if not ghost.is_empty():
		var gr := Rect2(x0 + 2, _uB(ghost.s + ghost.h) + 1, rw - 4, ghost.h * uh - 2)
		draw_rect(gr, Color(0.3, 0.82, 1.0, 0.22) if ghost.ok else Color(1.0, 0.36, 0.45, 0.22), true); draw_rect(gr, Color(0.3, 0.82, 1.0) if ghost.ok else Color(1.0, 0.36, 0.45), false, 2.0)
	for d in devices:
		for n in d.count if d.kind == "tray" else 1:
			var u0: float = d.u + n * d.unit_h; var hh: float = d.unit_h if d.kind == "tray" else d.h
			var r := Rect2(x0 + 2, _uB(u0 + hh) + 1, rw - 4, hh * uh - 2)
			var c: Color = d.color; draw_rect(r, Color(c.r * 0.3, c.g * 0.3, c.b * 0.3), true); draw_rect(r, Color.WHITE if sel_dev == d.i else c, false, 2.5 if sel_dev == d.i else 1.5)
			draw_rect(Rect2(r.position + Vector2(3, 3), Vector2(5, maxf(1.0, r.size.y - 6))), c, true)
			if r.size.y >= 11.0:   # label inside the device, cut with "…"; the sub-line only when the row is roomy
				var s := _fs(int(clampf(r.size.y * 0.55, 10.0, 13.0)))
				var txt := "%s · %s" % [d.label, d.sub] if r.size.x > 300.0 else str(d.label)
				_ell(Vector2(r.position.x + 14, r.position.y + minf(r.size.y, uh) * 0.5 + s * 0.36), txt, r.size.x - 20.0, s, Color(0.94, 0.96, 1.0))
	if flash_a > 0.01 and flash_u >= 0:
		var fr := Rect2(x0 + 2, _uB(flash_u + flash_h) + 1, rw - 4, flash_h * uh - 2)
		draw_rect(fr, Color(0.4, 1.0, 0.7, 0.4 * flash_a), true); draw_rect(fr.grow(3.0 + 6.0 * (1.0 - flash_a)), Color(0.4, 1.0, 0.7, flash_a), false, 2.5)
	if has_focus() and cursor >= 0:
		draw_rect(Rect2(x0 - 3, _uB(cursor + 1) - 1, rw + 6, uh + 2), Color(1.0, 0.92, 0.35), false, 2.5)
	# power bar
	var bx := size.x - BAR - 6.0; var top := HEAD; var hgt := units * uh
	draw_rect(Rect2(bx, top, BAR, hgt), Color(0.05, 0.1, 0.16), true)
	var frac := minf(1.0, kw / maxf(1.0, max_kw)); var col := Color(1.0, 0.36, 0.45) if kw > max_kw else (Color(1.0, 0.69, 0.13) if kw > max_kw * 0.85 else Color(0.24, 0.86, 0.6))
	draw_rect(Rect2(bx, top + hgt * (1.0 - frac), BAR, hgt * frac), col, true)
	var ft := "%d / %d kW" % [int(kw), int(max_kw)]
	_str(Vector2(size.x - 8.0 - _w(ft, 12), top + hgt + 19.0), ft, 12, Color(0.6, 0.72, 0.8))
	if has_focus() and cursor < 0: draw_rect(Rect2(Vector2(2, 2), size - Vector2(4, 4)), Color(1.0, 0.92, 0.35), false, 2.0)

func _u_at(pos: Vector2) -> int:
	return clampi(int(floor(units - (pos.y - HEAD) / _uh())), 0, units - 1)

func _dev_at(u: int) -> int:
	for d in devices:
		var h: int = d.unit_h * d.count if d.kind == "tray" else d.h
		if u >= d.u and u < d.u + h: return d.i
	return -1

func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseMotion:
		var u := _u_at(e.position)
		if u != hov: hov = u; hover_u.emit(u); queue_redraw()
		return
	if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		if e.position.y < HEAD - 6.0 or e.position.y > HEAD + units * _uh() + 4.0: return
		grab_focus()
		var u := _u_at(e.position); var d := _dev_at(u); cursor = u
		if d >= 0: device_clicked.emit(d)
		else: u_clicked.emit(u)
		accept_event(); return
	var step := 0
	if e.is_action_pressed("ui_up", true): step = 1
	elif e.is_action_pressed("ui_down", true): step = -1
	elif e.is_action_pressed("ui_accept"):
		var c := cursor if cursor >= 0 else units - 1
		var d2 := _dev_at(c)
		if d2 >= 0: device_clicked.emit(d2)
		else: u_clicked.emit(c)
		accept_event(); return
	if step == 0: return
	var cur := cursor if cursor >= 0 else (units if step < 0 else -1)
	var nxt := cur + step
	var dv := _dev_at(cur)
	if dv >= 0:   # jump over the rest of a multi-U device
		for d in devices:
			if d.i == dv: nxt = (int(d.u) + (int(d.unit_h) * int(d.count) if d.kind == "tray" else int(d.h))) if step > 0 else int(d.u) - 1
	if nxt < 0 or nxt >= units: return   # at the edge: let focus leave the board
	cursor = nxt; u_moved.emit(nxt); accept_event()
