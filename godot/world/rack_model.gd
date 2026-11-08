class_name RackModel
extends Node3D
## A 42U rack built from a rack design: shell, door, ToR switch, one chassis per tray, PDUs, optional liquid-cooling manifold
## or rear-door heat exchanger, and cabling from every NIC to the top-of-rack switch (scale-out) plus an NVLink spine for
## rack-scale systems. Used by the Procure showroom and by the hall (close range). Front faces +Z; units are metres.
##
## spec: {key, n (chassis), gpus (per chassis), nics (per chassis), accent, cooling, scale_up, kind: "std"|"wafer"}

const RW := 0.6
const RD := 1.2
const RH := 2.0
const UH := 0.0445
const LINK_OUT := [Color(0.25, 1.0, 0.5), Color(1.0, 0.8, 0.2)]   # scale-out: green / gold alternate
const LINK_UP := Color(0.7, 0.4, 1.0)                              # NVLink spine
const LINK_MGMT := Color(0.55, 0.6, 0.65)

var spec: Dictionary = {}
var door: Node3D
var sides: Node3D
var cables: Node3D
var _door_open := false
var _counts := {"scale_out": 0, "scale_up": 0, "mgmt": 0}
static var _mesh_cache := {}
static var _cable_cache := {}

## Hall-rack model for a placed design.
static func spec_from_design(b: Bridge, d: Dictionary) -> Dictionary:
	var n := 0; var gpus := 0; var nics := 0; var chassis := ""; var cool := str(d.get("coolingInterface", "air"))
	var tray_by := {}
	for tr in b.g.trays: tray_by[tr.id] = tr
	for it in d.items:
		if it.type != "tray" or not tray_by.has(it.trayId): continue
		var tr: Dictionary = tray_by[it.trayId]; chassis = str(tr.chassisId); n += int(it.count)
		var g := 0; var nn := 0
		for p in tr.parts:
			var item := b.item(str(p.itemId)); var kind := str(item.get("kind", ""))
			if str(p.slot) == "accelerator" or kind == "accelerator": g += int(p.count)
			elif str(p.slot) == "nic" or str(p.slot) == "dpu": nn += int(p.count)
		gpus = maxi(gpus, g); nics = maxi(nics, nn)
	return _finish({"n": n, "gpus": gpus, "nics": nics, "chassis": chassis, "cooling": cool, "key": "d%s" % str(d.get("id", ""))})

## Showroom model for a purchasable template.
static func spec_from_template(b: Bridge, t: Dictionary, f: Dictionary) -> Dictionary:
	var g := 0; var nn := 0
	for p in t.tray.parts:
		if str(p.slot) == "accelerator": g += int(p.count)
		elif str(p.slot) == "nic" or str(p.slot) == "dpu": nn += int(p.count)
	return _finish({"n": int(t.rack.trayCount), "gpus": g, "nics": nn, "chassis": str(t.tray.chassisId), "cooling": str(t.rack.cooling), "scale_up": int(f.get("scaleUp", 8)), "key": "t%s" % str(t.id)})

static func _finish(s: Dictionary) -> Dictionary:
	var c: String = s.get("chassis", "")
	s["accent"] = Color(1.0, 0.3, 0.15) if (c.contains("mi") or c.begins_with("gig") or c.begins_with("sm-ubb")) else (Color(0.2, 0.55, 1.0) if c.begins_with("int") else (Color(0.7, 0.35, 1.0) if c.begins_with("tt") else (Color(1.0, 0.55, 0.1) if c.begins_with("cb") else Color(0.35, 1.0, 0.45))))
	s["kind"] = "wafer" if c.begins_with("cb") else "std"
	s["n"] = clampi(int(s.get("n", 1)), 1, 20); s["gpus"] = maxi(1, int(s.get("gpus", 8)))
	s["nics"] = clampi(int(s.get("nics", 0)) if int(s.get("nics", 0)) > 0 else int(s.gpus), 1, 8)
	if not s.has("scale_up"): s["scale_up"] = 8
	return s

func cable_count() -> Dictionary: return _counts

func build(sp: Dictionary, detail := 2, glass_sides := false) -> void:
	spec = sp
	for c in get_children(): c.queue_free()
	_counts = {"scale_out": 0, "scale_up": 0, "mgmt": 0}
	var n: int = spec.n; var acc: Color = spec.accent
	var shell: Material = Site.rack_material(Site.current); var steel := HallMaterials.get_mat("steel", 1.1, Color(1.5, 1.5, 1.65)); var alu := HallMaterials.get_mat("alu", 1.0, Color(1.2, 1.2, 1.25))
	var dark := _solid(Color(0.03, 0.035, 0.04), 0.8, 0.2)
	# frame: four posts, top and bottom plates; side panels are separate so the x-ray view can drop them
	for sx in [-1, 1]:
		for sz in [-1, 1]: _box(self, Vector3(sx * (RW * 0.5 - 0.02), RH * 0.5, sz * (RD * 0.5 - 0.02)), Vector3(0.04, RH, 0.04), shell)
	_box(self, Vector3(0, 0.03, 0), Vector3(RW, 0.06, RD), shell); _box(self, Vector3(0, RH - 0.015, 0), Vector3(RW, 0.03, RD), steel)
	sides = Node3D.new(); add_child(sides)
	var side_mat: Material = steel
	if glass_sides:   # showroom: see the chassis from any angle
		var sg := StandardMaterial3D.new(); sg.albedo_color = Color(0.55, 0.7, 0.9, 0.09); sg.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; sg.cull_mode = BaseMaterial3D.CULL_DISABLED; sg.roughness = 0.1; side_mat = sg
	for sx in [-1, 1]: _box(sides, Vector3(sx * (RW * 0.5 - 0.004), RH * 0.5, 0), Vector3(0.008, RH - 0.06, RD - 0.08), side_mat)
	# ToR switch: 1U at the top, 32 ports front-rear
	var tor_y := RH - 0.2
	_box(self, Vector3(0, tor_y, 0.12), Vector3(0.48, UH * 1.2, 0.45), alu)
	for k in 16: _box(self, Vector3(-0.21 + k * 0.028, tor_y, 0.352), Vector3(0.016, 0.014, 0.004), _emit(acc, 1.6))
	# chassis stack from the bottom
	var wafer: bool = spec.kind == "wafer"
	var hu := 15 if wafer else clampi(int(34.0 / float(n)), 1, 8)
	var ys: Array = []
	for i in n:
		var cy := 0.09 + hu * UH * 0.5 + i * (hu + (1 if hu >= 2 else 0)) * UH * (1.0 if hu >= 2 else 1.0)
		ys.append(cy)
		var ch := hu * UH - 0.006
		_box(self, Vector3(0, cy, 0.05), Vector3(0.47, ch, 0.8), steel)
		_box(self, Vector3(0, cy, 0.458), Vector3(0.45, ch - 0.004, 0.012), dark)   # front fascia
		if wafer:
			_box(self, Vector3(0, cy, 0.466), Vector3(0.3, ch * 0.5, 0.006), _emit(acc, 0.9 + 0.3 * sin(float(i))))
		else:
			var gcount: int = mini(int(spec.gpus), 16)
			for g in gcount:
				var gx := -0.19 + (g + 0.5) * 0.38 / float(gcount)
				_box(self, Vector3(gx, cy + ch * 0.18, 0.468), Vector3(0.38 / float(gcount) * 0.7, ch * 0.28, 0.006), _emit(acc, 1.3))
			for v in 6: _box(self, Vector3(-0.17 + v * 0.068, cy - ch * 0.22, 0.468), Vector3(0.05, ch * 0.2, 0.004), _solid(Color(0.01, 0.012, 0.015), 0.9, 0.0))
		_box(self, Vector3(0.2, cy + ch * 0.38, 0.47), Vector3(0.016, 0.012, 0.004), _emit(Color(0.2, 1.0, 0.4), 2.0))
	# PDUs on the rear posts
	for sx in [-1, 1]: _box(self, Vector3(sx * (RW * 0.5 - 0.06), RH * 0.5 - 0.1, -RD * 0.5 + 0.1), Vector3(0.05, RH - 0.5, 0.05), dark)
	# cooling hardware
	var cool: String = spec.get("cooling", "air")
	if cool == "dlc" or cool == "immersion":
		for sx in [-1, 1]:
			var mc := Color(0.15, 0.4, 1.0) if sx < 0 else Color(1.0, 0.25, 0.2)
			_box(self, Vector3(sx * (RW * 0.5 - 0.1), RH * 0.5 - 0.1, -RD * 0.5 + 0.22), Vector3(0.035, RH - 0.5, 0.035), _solid(mc, 0.35, 0.3))
			for y in ys: _box(self, Vector3(sx * (RW * 0.5 - 0.1), y, -0.3), Vector3(0.012, 0.012, 0.3), _solid(mc, 0.35, 0.3))
	elif cool == "rdhx":
		var rd := _box(self, Vector3(0, RH * 0.5, -RD * 0.5 - 0.06), Vector3(RW - 0.02, RH - 0.1, 0.1), alu)
		for k in 4: _box(rd, Vector3(0, -0.6 + k * 0.4, -0.055), Vector3(0.38, 0.38, 0.01), dark)
	# front door, hinged on the left
	door = Node3D.new(); door.position = Vector3(-RW * 0.5 + 0.01, 0, RD * 0.5 + 0.006); add_child(door)
	var gm := StandardMaterial3D.new(); gm.albedo_color = Color(0.5, 0.65, 0.8, 0.07); gm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; gm.roughness = 0.1; gm.cull_mode = BaseMaterial3D.CULL_DISABLED
	_box(door, Vector3(RW * 0.5 - 0.01, RH * 0.5, 0), Vector3(RW - 0.03, RH - 0.1, 0.012), gm)
	_box(door, Vector3(0.015, RH * 0.5, 0.004), Vector3(0.025, RH - 0.1, 0.02), shell); _box(door, Vector3(RW - 0.05, RH * 0.5, 0.004), Vector3(0.025, RH - 0.1, 0.02), shell)
	_box(door, Vector3(RW - 0.08, RH * 0.5, 0.02), Vector3(0.02, 0.2, 0.02), alu)
	# cabling
	cables = Node3D.new(); add_child(cables)
	if detail > 0: _build_cables(ys, tor_y, detail)
	cables.visible = false

func set_door_open(open: bool, animate := true) -> void:
	_door_open = open
	if door == null: return
	var target := deg_to_rad(-108.0) if open else 0.0
	if animate and not Settings.reduced_motion:
		var tw := create_tween(); tw.tween_property(door, "rotation:y", target, 0.45).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	else: door.rotation.y = target

## Show the cabling (x-ray: side panels hidden so you can see it from any angle).
func set_cables(show: bool) -> void:
	if cables != null: cables.visible = show
	if sides != null: sides.visible = not show

# ---------- cabling ----------
## Cable meshes for a spec at a detail level (1 = one loom per chassis, 2 = every cable), cached per spec+detail.
## Returns {meshes: [[Color, ArrayMesh]], counts}. Chassis heights come from the same layout rule as build().
static func cable_meshes(sp: Dictionary, detail: int) -> Dictionary:
	var ck := "%s|%d|%d|%d|%d" % [sp.key, detail, int(sp.n), int(sp.nics), int(sp.scale_up)]
	if _cable_cache.has(ck): return _cable_cache[ck]
	var n: int = sp.n; var wafer: bool = sp.kind == "wafer"; var hu := 15 if wafer else clampi(int(34.0 / float(n)), 1, 8)
	var ys: Array = []
	for i in n: ys.append(0.09 + hu * UH * 0.5 + i * (hu + (1 if hu >= 2 else 0)) * UH)
	var by_col := {}; var counts := {"scale_out": 0, "scale_up": 0, "mgmt": 0}
	_make_tubes(sp, ys, RH - 0.2, detail, by_col, counts)
	var out := []
	for key in by_col:
		var d: Dictionary = by_col[key]; var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
		for tube in d.tubes: _tube(st, tube.pts, tube.r)
		for bx in d.get("boxes", []): _box_tris(st, bx[0], bx[1])
		st.generate_normals(); out.append([d.col, st.commit()])
	var res := {"meshes": out, "counts": counts}; _cable_cache[ck] = res; return res

## A ready-to-place Node3D of cables. `dim` greys them (failed or burning-in racks).
static func make_cables(sp: Dictionary, detail: int, dim := false) -> Node3D:
	var root := Node3D.new(); var cm := cable_meshes(sp, detail)
	for e in cm.meshes:
		var mi := MeshInstance3D.new(); mi.mesh = e[1]; mi.material_override = _emit_mat(e[0], 0.12 if dim else 0.4); mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; root.add_child(mi)
	root.set_meta("counts", cm.counts); return root

func _build_cables(_ys: Array, _tor_y: float, detail: int) -> void:
	var c := make_cables(spec, detail)
	_counts = c.get_meta("counts"); for k in c.get_children(): c.remove_child(k); cables.add_child(k)
	c.free()

## Neat data-centre cabling: every cable leaves its port in a straight run, turns with a rounded corner into a vertical cable
## manager at the rear side, rides there in an ordered bundle held by velcro ties, and turns again into its ToR port.
## Each cable carries a white tag near the port end. Axis-aligned runs only, so nothing loops or crosses.
static func _make_tubes(spec: Dictionary, ys: Array, tor_y: float, detail: int, by_col: Dictionary, counts: Dictionary) -> void:
	var nics: int = spec.nics; var n: int = ys.size()
	var spine: bool = int(spec.scale_up) > 8 and n >= 4
	var slot := [0, 0]       # next free slot in the left and right bundle
	var pitch := 0.0125
	var r_out := 0.0065 if detail == 2 else 0.02
	for i in n:
		var cy: float = ys[i]
		var lane := 0 if i % 2 == 0 else 1; var sgn := -1.0 if lane == 0 else 1.0
		for k in nics:
			if detail == 1 and k > 0: continue   # mid distance: one loom per chassis instead of every cable
			var colr: Color = LINK_OUT[k % 2]; var px := -0.18 + (k + 0.5) * 0.36 / float(nics)
			var sl: int = slot[lane]; slot[lane] += 1
			var bx := sgn * (0.2 + (sl % 4) * pitch) * (1.0 if sgn > 0 else 1.0); var bz := -0.42 - float((sl / 4) % 3) * pitch
			var hy := cy - 0.012 + float(k) * 0.004    # each cable keeps its own height on the horizontal run
			var tx := -0.19 + (float(i * nics + k) / float(maxi(1, n * nics))) * 0.38
			var pts := PackedVector3Array([Vector3(px, hy, -0.35), Vector3(px, hy, bz), Vector3(bx, hy, bz), Vector3(bx, tor_y - 0.07 - float(sl % 3) * 0.004, bz), Vector3(tx, tor_y - 0.07 - float(sl % 3) * 0.004, bz), Vector3(tx, tor_y - 0.07 - float(sl % 3) * 0.004, -0.26), Vector3(tx, tor_y, -0.24)])
			_add_tube(by_col, colr, _rounded(pts, 0.035), r_out)
			counts.scale_out += 1 if detail == 2 else nics
			if detail == 2:
				_add_box(by_col, Color(0.95, 0.95, 0.9), Vector3(px, hy, -0.40), Vector3(0.016, 0.009, 0.006))   # tag near the port end
				_connector(by_col, Vector3(px, hy, -0.35), -1.0, colr); _connector(by_col, Vector3(tx, tor_y, -0.24), -1.0, colr)
		if detail == 2:   # management cable: thin grey, tied into the same manager
			var sl2: int = slot[lane]; slot[lane] += 1
			var mx := sgn * (0.2 + (sl2 % 4) * pitch); var mz := -0.42 - float((sl2 / 4) % 3) * pitch
			var mp := PackedVector3Array([Vector3(sgn * 0.2, cy + 0.05, -0.35), Vector3(sgn * 0.2, cy + 0.05, mz), Vector3(mx, cy + 0.05, mz), Vector3(mx, tor_y - 0.03, mz), Vector3(sgn * 0.1, tor_y - 0.03, mz), Vector3(sgn * 0.1, tor_y - 0.03, -0.27)])
			_add_tube(by_col, LINK_MGMT, _rounded(mp, 0.03), 0.004); counts.mgmt += 1
		if spine:
			var sp := PackedVector3Array([Vector3(-0.05, cy, -0.35), Vector3(-0.05, cy, -0.5), Vector3(0.0, cy, -0.5)])
			_add_tube(by_col, LINK_UP, _rounded(sp, 0.03), 0.012 if detail == 2 else 0.02)
	if spine:   # vertical NVLink spine behind the chassis, tied like the others
		_add_tube(by_col, LINK_UP, PackedVector3Array([Vector3(0, 0.1, -0.5), Vector3(0, tor_y * 0.5, -0.5), Vector3(0, tor_y - 0.1, -0.5)]), 0.05)
		counts.scale_up = n
		var y := 0.2
		while y < tor_y - 0.1: _add_box(by_col, Color(0.9, 0.45, 0.1), Vector3(0, y, -0.5), Vector3(0.12, 0.02, 0.12)); y += 0.24
	# velcro ties around the two vertical cable managers, one every ~22 cm
	for lane in 2:
		if int(slot[lane]) == 0: continue
		var sgn2 := -1.0 if lane == 0 else 1.0; var cols := mini(4, int(slot[lane])); var rows := mini(3, ceili(float(slot[lane]) / 4.0))
		var cx := sgn2 * (0.2 + (cols - 1) * pitch * 0.5); var cz := -0.42 - (rows - 1) * pitch * 0.5
		var yy := 0.25
		while yy < tor_y - 0.1: _add_box(by_col, Color(0.9, 0.45, 0.1), Vector3(cx, yy, cz), Vector3(cols * pitch + 0.016, 0.02, rows * pitch + 0.016)); yy += 0.22

## A modelled plug (QSFP/OSFP style): metal body in the port, strain-relief boot behind it, and a pull tab in the link colour.
## dir = -1 means the cable leaves toward -Z. Merged into the cached cable mesh, so every cable shares the same few triangles.
static func _connector(by_col: Dictionary, at: Vector3, dir: float, tab: Color) -> void:
	_add_box(by_col, Color(0.62, 0.64, 0.68), at + Vector3(0, 0, dir * 0.012), Vector3(0.017, 0.0105, 0.024))        # metal shell
	_add_box(by_col, Color(0.06, 0.065, 0.07), at + Vector3(0, 0, dir * 0.032), Vector3(0.012, 0.0085, 0.016))       # boot
	_add_box(by_col, tab.lightened(0.15), at + Vector3(0, 0.0065, dir * 0.022), Vector3(0.008, 0.0035, 0.014))       # pull tab

static func _add_box(by_col: Dictionary, col: Color, c: Vector3, sz: Vector3) -> void:
	var k := col.to_html(false)
	if not by_col.has(k): by_col[k] = {"col": col, "tubes": [], "boxes": []}
	if not by_col[k].has("boxes"): by_col[k]["boxes"] = []
	by_col[k].boxes.append([c, sz])

## Axis-aligned polyline with rounded corners (quadratic curves of radius r at every bend).
static func _rounded(pts: PackedVector3Array, r: float) -> PackedVector3Array:
	var out := PackedVector3Array(); out.append(pts[0])
	for i in range(1, pts.size() - 1):
		var a := pts[i - 1]; var c := pts[i]; var d := pts[i + 1]
		var rr := minf(r, minf(a.distance_to(c), c.distance_to(d)) * 0.5)
		if rr < 0.002: out.append(c); continue
		var p0 := c + (a - c).normalized() * rr; var p2 := c + (d - c).normalized() * rr
		for s in 5:
			var t := float(s + 1) / 6.0; var q := (1.0 - t) * (1.0 - t) * p0 + 2.0 * (1.0 - t) * t * c + t * t * p2
			if s == 0: out.append(p0)
			out.append(q)
		out.append(p2)
	out.append(pts[pts.size() - 1]); return out

static func _add_tube(by_col: Dictionary, col: Color, pts: PackedVector3Array, r: float) -> void:
	var k := col.to_html(false)
	if not by_col.has(k): by_col[k] = {"col": col, "tubes": [], "boxes": []}
	by_col[k].tubes.append({"pts": pts, "r": r})

static func _box_tris(st: SurfaceTool, c: Vector3, sz: Vector3) -> void:
	var h := sz * 0.5
	var v := [Vector3(-h.x, -h.y, -h.z), Vector3(h.x, -h.y, -h.z), Vector3(h.x, h.y, -h.z), Vector3(-h.x, h.y, -h.z), Vector3(-h.x, -h.y, h.z), Vector3(h.x, -h.y, h.z), Vector3(h.x, h.y, h.z), Vector3(-h.x, h.y, h.z)]
	for f in [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [2, 3, 7], [2, 7, 6], [1, 2, 6], [1, 6, 5], [3, 0, 4], [3, 4, 7]]:
		for idx in f: st.add_vertex(c + v[idx])

## Catmull-Rom through the control points, with a slight droop between them.
static func _smooth(pts: PackedVector3Array) -> PackedVector3Array:
	var out := PackedVector3Array(); var n := pts.size()
	for i in n - 1:
		var p0 := pts[maxi(0, i - 1)]; var p1 := pts[i]; var p2 := pts[i + 1]; var p3 := pts[mini(n - 1, i + 2)]
		for s in 6:
			var t := float(s) / 6.0; var t2 := t * t; var t3 := t2 * t
			out.append(0.5 * ((2.0 * p1) + (-p0 + p2) * t + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3))
	out.append(pts[n - 1]); return out

static func _tube(st: SurfaceTool, path: PackedVector3Array, r: float) -> void:
	var sides_n := 6; var rings: Array = []
	for i in path.size():
		var tang := (path[mini(path.size() - 1, i + 1)] - path[maxi(0, i - 1)]).normalized()
		var up := Vector3.UP if absf(tang.dot(Vector3.UP)) < 0.9 else Vector3.RIGHT
		var u := tang.cross(up).normalized(); var v := tang.cross(u).normalized(); var ring := PackedVector3Array()
		for s in sides_n: var a := TAU * s / sides_n; ring.append(path[i] + (u * cos(a) + v * sin(a)) * r)
		rings.append(ring)
	for i in rings.size() - 1:
		for s in sides_n:
			var s2 := (s + 1) % sides_n
			var a: Vector3 = rings[i][s]; var b: Vector3 = rings[i][s2]; var c: Vector3 = rings[i + 1][s]; var d: Vector3 = rings[i + 1][s2]
			for vtx in [a, c, b, b, c, d]: st.add_vertex(vtx)

# ---------- small helpers (cached) ----------
func _box(parent: Node3D, pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var k := Vector3i(roundi(size.x * 1000.0), roundi(size.y * 1000.0), roundi(size.z * 1000.0))
	var bm: BoxMesh = _mesh_cache.get(k)
	if bm == null: bm = BoxMesh.new(); bm.size = size; _mesh_cache[k] = bm
	var mi := MeshInstance3D.new(); mi.mesh = bm; mi.material_override = mat; mi.position = pos; parent.add_child(mi); return mi

static var _mats := {}
static func _solid(c: Color, rough: float, metal: float) -> StandardMaterial3D:
	var k := "s%s%s%s" % [c.to_html(), rough, metal]
	if _mats.has(k): return _mats[k]
	var m := StandardMaterial3D.new(); m.albedo_color = c; m.roughness = rough; m.metallic = metal; _mats[k] = m; return m

static func _emit(c: Color, energy: float) -> StandardMaterial3D:
	var k := "e%s%s" % [c.to_html(), energy]
	if _mats.has(k): return _mats[k]
	var m := StandardMaterial3D.new(); m.albedo_color = c; m.emission_enabled = true; m.emission = c; m.emission_energy_multiplier = energy; _mats[k] = m; return m

static func _emit_mat(c: Color, energy := 0.4) -> StandardMaterial3D:
	var k := "c%s%s" % [c.to_html(), energy]
	if _mats.has(k): return _mats[k]
	var m := StandardMaterial3D.new(); m.albedo_color = c.darkened(0.3); m.emission_enabled = true; m.emission = c; m.emission_energy_multiplier = energy; m.roughness = 0.5; _mats[k] = m; return m
