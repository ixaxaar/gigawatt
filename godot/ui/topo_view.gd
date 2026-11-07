class_name TopoView
extends Control
## Fat-tree diagram: racks (with NVLink domain) -> leaf switches -> spine switches; link width ~ bandwidth.
var racks: Array = []   # [{id,label,accels,domain}]
var stats = null
var f: Dictionary = {}
var vendor_col := Color(0.3, 0.82, 1.0)
const W := 900.0
const H := 420.0

func _init() -> void: custom_minimum_size = Vector2(0, 300); mouse_filter = Control.MOUSE_FILTER_IGNORE
func _s(p: Vector2) -> Vector2:
	var k := minf(size.x / W, size.y / H); return Vector2((size.x - W * k) * 0.5, (size.y - H * k) * 0.5) + p * k
func _k() -> float: return minf(size.x / W, size.y / H)
func _txt(p: Vector2, t: String, sz: int, col: Color, center := false) -> void:
	var fnt: Font = Fonts.regular; var px := maxi(12, int(sz * _k())); var w := fnt.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, px).x
	draw_string(fnt, _s(p) + Vector2(-w * 0.5 if center else 0.0, 0), t, HORIZONTAL_ALIGNMENT_LEFT, -1, px, col)
func _box(c: Vector2, w: float, h: float, col: Color, label := "") -> void:
	var r := Rect2(_s(c - Vector2(w * 0.5, 0)), Vector2(w, h) * _k()); draw_rect(r, Color(0.04, 0.05, 0.07), true); draw_rect(r, col, false, 1.5)
	if label != "": _txt(c + Vector2(0, h * 0.62), label, 11, Color(0.8, 0.9, 1.0), true)

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.04, 0.07, 0.1), true)
	if f.is_empty(): return
	var n := racks.size(); var shown := racks.slice(0, 16); var more := n - shown.size()
	var leaf_id: String = f.get("leafSwitchId", ""); var spine_id: String = f.get("spineSwitchId", leaf_id)
	var sc: Dictionary = stats.switchCounts if stats != null else {}
	var leaves: int = maxi(1, mini(8, int(sc.get(leaf_id, ceili(n / 2.0)))))
	var spines := 0
	if f.topology != "single-domain": spines = maxi(int(sc.get(spine_id, 0)) if leaf_id != spine_id else 0, 2 if n > 1 else 0)
	var bw := maxf(1.5, minf(7.0, (stats.effScaleOutGBs / 8.0) if stats != null else 2.0)) * _k()
	_txt(Vector2(14, 22), "FABRIC · %s · %s · %s:1" % [str(f.scaleOutTech).to_upper(), f.topology, f.oversubscription], 12, Color(0.55, 0.7, 0.8))
	var rx := func(i): return 60.0 + (i + 0.5) * ((W - 120.0) / maxf(1, shown.size()))
	var lx := func(i): return 90.0 + (i + 0.5) * ((W - 180.0) / leaves)
	var sx := func(i): return 180.0 + (i + 0.5) * ((W - 360.0) / maxf(1, mini(spines, 4)))
	for s in mini(spines, 4):
		for l in leaves: draw_line(_s(Vector2(sx.call(s), 78)), _s(Vector2(lx.call(l), 190)), Color(0.79, 0.58, 0.18, 0.85), maxf(1.0, bw / float(f.oversubscription)))
		_box(Vector2(sx.call(s), 56), 104, 30, Color(0.3, 0.82, 1.0), "SPINE %d" % (s + 1))
	if spines > 4: _txt(Vector2(W - 150, 75), "+%d more spines" % (spines - 4), 11, Color(0.55, 0.7, 0.8))
	for l in leaves:
		for i in shown.size(): draw_line(_s(Vector2(lx.call(l), 222)), _s(Vector2(rx.call(i), 300)), Color(0.24, 0.86, 0.6, 0.5), maxf(1.0, bw / 2.0))
		_box(Vector2(lx.call(l), 190), 92, 32, Color(0.24, 0.86, 0.6), "LEAF %d" % (l + 1))
	for i in shown.size():
		var x: float = rx.call(i); var r: Dictionary = shown[i]
		var rr := Rect2(_s(Vector2(x - 26, 300)), Vector2(52, 92) * _k()); draw_rect(rr, Color(0.1, 0.12, 0.15), true); draw_rect(rr, vendor_col, false, 1.6)
		for k in 5: draw_rect(Rect2(_s(Vector2(x - 21, 306 + k * 17)), Vector2(42, 12) * _k()), Color(0.04, 0.05, 0.07), true)
		_txt(Vector2(x, 408), "%d GPU" % int(r.accels), 9, Color(0.6, 0.72, 0.8), true)
		if r.domain > 1: draw_rect(Rect2(_s(Vector2(x - 31, 295)), Vector2(62, 102) * _k()), Color(0.78, 0.57, 0.92), false, 1.2)
	if more > 0: _txt(Vector2(W - 150, 350), "+%d more racks" % more, 12, Color(0.55, 0.7, 0.8))
