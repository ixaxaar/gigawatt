class_name HallLife
extends Node3D
## What moves in the hall: technicians who walk the aisles and work at the racks that need them (down, being installed,
## burning in), and a short pulse of light on a rack whose state just changed. Purely cosmetic: nothing here touches the game.
## Lives beside the hall's rebuilt geometry (not inside it), so a rebuild never interrupts a walk.

const RW := HallView.RW
const RD := HallView.RD
const RH := HallView.RH
const PITCH := HallView.PITCH
const SPEED := 1.25           # walking pace, m/s
const VESTS := [Color(1.0, 0.45, 0.05), Color(0.85, 0.95, 0.1), Color(1.0, 0.45, 0.05), Color(0.2, 0.75, 1.0)]

var view: HallView
var _actors: Array = []       # [{root, legs:[l, r], arms:[l, r], path, state, t, slot, phase}]
var _jobs: Array = []         # slots worth walking to, most urgent first: [{slot, prio}]
var _rng := RandomNumberGenerator.new()
var _mesh := {}
var _mats := {}
var _key := ""

func _ready() -> void:
	_rng.seed = 20200101

func _m(name: String) -> Mesh:
	if _mesh.has(name): return _mesh[name]
	var m: Mesh
	match name:
		"leg": var b := BoxMesh.new(); b.size = Vector3(0.13, 0.86, 0.15); m = b
		"arm": var b2 := BoxMesh.new(); b2.size = Vector3(0.09, 0.6, 0.1); m = b2
		"torso": var b3 := BoxMesh.new(); b3.size = Vector3(0.38, 0.62, 0.22); m = b3
		"band": var b4 := BoxMesh.new(); b4.size = Vector3(0.385, 0.05, 0.225); m = b4
		"head": var s := SphereMesh.new(); s.radius = 0.105; s.height = 0.23; s.radial_segments = 10; s.rings = 5; m = s
		"hat": var c := CylinderMesh.new(); c.top_radius = 0.09; c.bottom_radius = 0.135; c.height = 0.09; c.radial_segments = 10; m = c
		"blob": var b5 := BoxMesh.new(); b5.size = Vector3(0.55, 0.004, 0.45); m = b5
		"shell": var b6 := BoxMesh.new(); b6.size = Vector3(RW + 0.06, RH + 0.06, RD + 0.02); m = b6
		"ring": var b7 := BoxMesh.new(); b7.size = Vector3(RW + 0.3, 0.012, RD + 0.3); m = b7
	_mesh[name] = m; return m

func _mat(c: Color, rough := 0.8, emit := 0.0) -> StandardMaterial3D:
	var k := "%s|%s|%s" % [c.to_html(true), rough, emit]
	if _mats.has(k): return _mats[k]
	var m := StandardMaterial3D.new(); m.albedo_color = c; m.roughness = rough; m.metallic = 0.0
	if emit > 0.0: m.emission_enabled = true; m.emission = c; m.emission_energy_multiplier = emit
	if c.a < 1.0: m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_mats[k] = m; return m

func _part(parent: Node3D, mesh: String, mat: Material, pos: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new(); mi.mesh = _m(mesh); mi.material_override = mat; mi.position = pos
	mi.visibility_range_end = 70.0 * float(Settings.tier().vis_scale); mi.visibility_range_end_margin = 4.0
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if Settings.tier().shadows else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi); return mi

## A technician: dark work trousers, hi-vis vest with a reflective band, hard hat. Limbs hang from pivots so they can swing.
func _make_actor(i: int) -> Dictionary:
	var root := Node3D.new(); add_child(root)
	var vest: Color = VESTS[i % VESTS.size()]
	var cloth := _mat(Color(0.07, 0.08, 0.11), 0.9); var skin := _mat(Color(0.62, 0.45, 0.36), 0.7)
	var legs := []; var arms := []
	for sx in [-1, 1]:
		var hip := Node3D.new(); hip.position = Vector3(sx * 0.1, 0.88, 0); root.add_child(hip); _part(hip, "leg", cloth, Vector3(0, -0.43, 0)); legs.append(hip)
		var sh := Node3D.new(); sh.position = Vector3(sx * 0.245, 1.46, 0); root.add_child(sh); _part(sh, "arm", _mat(vest.darkened(0.15), 0.8, 0.08), Vector3(0, -0.28, 0)); arms.append(sh)
	_part(root, "torso", _mat(vest, 0.8, 0.12), Vector3(0, 1.19, 0))
	_part(root, "band", _mat(Color(0.9, 0.92, 0.95), 0.4, 0.9), Vector3(0, 1.12, 0))
	_part(root, "head", skin, Vector3(0, 1.63, 0))
	_part(root, "hat", _mat(Color(0.95, 0.95, 0.9) if i % 2 == 0 else Color(1.0, 0.8, 0.1), 0.5, 0.2), Vector3(0, 1.74, 0))
	var bl := _part(root, "blob", _mat(Color(0, 0, 0, 0.45)), Vector3(0, 0.006, 0)); bl.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return {"root": root, "legs": legs, "arms": arms, "path": [], "state": "idle", "t": _rng.randf_range(0.0, 2.0), "slot": -1, "phase": _rng.randf() * TAU}

## Called after the hall was rebuilt. `racks` is the hall's rack list, `fresh` a different hall (or a new game): everyone starts over.
func sync(racks: Array, staff: int, key: String, fresh: bool) -> void:
	if view == null or view.row_z.is_empty(): return
	_jobs.clear()
	for r in racks:
		var st := str(r.status); var pr := 0
		if st == "failed": pr = 3
		elif st == "installing" or st == "commissioning": pr = 2
		elif st == "online": pr = 1
		if pr > 0: _jobs.append({"slot": int(r.slot), "prio": pr})
	var want := 0
	if not _jobs.is_empty(): want = clampi(maxi(1, staff / 3), 1, 2 if Settings.quality <= 0 else 6)
	if OS.has_environment("GW_TECHS") and not _jobs.is_empty(): want = int(OS.get_environment("GW_TECHS"))   # screenshots
	if key != _key or fresh:
		_key = key
		for a in _actors: (a.root as Node3D).queue_free()
		_actors.clear()
	while _actors.size() > want: ((_actors.pop_back()).root as Node3D).queue_free()
	while _actors.size() < want:
		var a := _make_actor(_actors.size()); _actors.append(a)
		var j: Dictionary = _jobs[_rng.randi() % _jobs.size()]
		(a.root as Node3D).position = _spot(int(j.slot)) if Settings.reduced_motion else _corridor(_rng.randf() < 0.5, _lane_z(int(j.slot)))
		if Settings.reduced_motion: _face_rack(a, int(j.slot)); a.state = "work"; a.slot = int(j.slot); _pose(a, 0.0, 1.0)
	for a in _actors:   # someone walking to (or working at) a rack that is gone picks a new job
		if int(a.slot) >= 0 and not _has_job(int(a.slot)): a.state = "idle"; a.t = 0.0; a.path = []

func _has_job(slot: int) -> bool:
	for j in _jobs:
		if int(j.slot) == slot: return true
	return false

## The service side of a rack is its rear, in the open hot aisle (the cold aisles are glassed in).
func _lane_z(slot: int) -> float:
	var row := slot / view.cols
	return view.row_z[row] + (-1.0 if row % 2 == 0 else 1.0) * (RD * 0.5 + 0.5)

func _spot(slot: int) -> Vector3: return Vector3((slot % view.cols) * PITCH, 0, _lane_z(slot))

func _corridor(left: bool, z: float) -> Vector3:
	return Vector3(-1.3 if left else (view.cols - 1) * PITCH + RW * 0.5 + 1.0, 0, z)

func _face_rack(a: Dictionary, slot: int) -> void:
	var row := slot / view.cols
	(a.root as Node3D).rotation.y = 0.0 if row % 2 == 0 else PI   # +z is forward for the model: even rows have their rear toward -z, so stand south of it facing north

## Next job: the most urgent rack nobody else is at (a down rack before one being installed before a routine check).
func _pick(a: Dictionary) -> void:
	if _jobs.is_empty(): return
	var taken := {}
	for o in _actors:
		if o != a and int(o.slot) >= 0: taken[int(o.slot)] = true
	var best := []; var bp := 0
	for j in _jobs:
		if taken.has(int(j.slot)): continue
		if int(j.prio) > bp: bp = int(j.prio); best = [j]
		elif int(j.prio) == bp: best.append(j)
	if best.is_empty(): return
	var j2: Dictionary = best[_rng.randi() % best.size()]
	var slot := int(j2.slot); var goal := _spot(slot); var p: Vector3 = (a.root as Node3D).position
	var path := []
	if absf(p.z - goal.z) > 0.05:   # another aisle: out to the nearer side corridor, along it, back in
		var left := absf(p.x - (-1.3)) + absf(goal.x - (-1.3)) < absf(p.x - _corridor(false, 0).x) + absf(goal.x - _corridor(false, 0).x)
		path.append(_corridor(left, p.z)); path.append(_corridor(left, goal.z))
	path.append(goal)
	a.path = path; a.slot = slot; a.state = "walk"

## Limb pose: `walk` swings arms and legs, `work` raises the arms to the rack.
func _pose(a: Dictionary, walk: float, work: float) -> void:
	var ph: float = a.phase
	var sw := sin(ph) * 0.55 * walk
	(a.legs[0] as Node3D).rotation.x = sw; (a.legs[1] as Node3D).rotation.x = -sw
	(a.arms[0] as Node3D).rotation.x = -sw * 0.8 - work * (1.25 + 0.12 * sin(ph * 0.7)); (a.arms[1] as Node3D).rotation.x = sw * 0.8 - work * (1.05 + 0.12 * sin(ph * 0.9 + 1.0))

var _dbg_t := 0.0
func _process(dt: float) -> void:
	if OS.has_environment("GW_PULSE") and view != null and not _jobs.is_empty():   # screenshots: keep pulsing a few racks
		_dbg_t += dt
		if _dbg_t > 0.7:
			_dbg_t = 0.0
			for k in 3: pulse(view.slot_pos(int(_jobs[k * 2 % _jobs.size()].slot)), [Color(0.25, 1.0, 0.55), Color(1.0, 0.15, 0.1), Color(0.45, 0.8, 1.0)][k])
			deliver(view.slot_pos(int(_jobs[4 % _jobs.size()].slot)))
	if _actors.is_empty() or view == null or Settings.reduced_motion: return
	dt = minf(dt, 0.1)
	for a in _actors:
		var root: Node3D = a.root
		match str(a.state):
			"idle":
				a.t = float(a.t) - dt; _pose(a, 0.0, 0.0)
				if float(a.t) <= 0.0: _pick(a)
			"walk":
				var path: Array = a.path
				if path.is_empty(): a.state = "work"; a.t = _rng.randf_range(5.0, 11.0); continue
				var to: Vector3 = (path[0] as Vector3) - root.position; to.y = 0.0
				var d := to.length(); var step := SPEED * dt
				if d <= step: root.position = path[0]; path.pop_front()
				else:
					root.position += to / d * step
					root.rotation.y = lerp_angle(root.rotation.y, atan2(to.x, to.z), minf(1.0, dt * 9.0))
				a.phase = float(a.phase) + dt * 7.5; _pose(a, 1.0, 0.0)
				root.position.y = absf(sin(float(a.phase))) * 0.025
			"work":
				var row := int(a.slot) / view.cols
				root.rotation.y = lerp_angle(root.rotation.y, 0.0 if row % 2 == 0 else PI, minf(1.0, dt * 6.0))
				root.position.y = 0.0
				a.phase = float(a.phase) + dt * 3.0; _pose(a, 0.0, 1.0)
				a.t = float(a.t) - dt
				if float(a.t) <= 0.0: a.state = "idle"; a.t = _rng.randf_range(0.3, 1.5); a.slot = -1

## A rack changed state: a shell of light rises off it and a ring spreads on the floor, in the colour of the new state.
## A delivery: a plywood shipping crate the size of the rack drops onto its slot, settles, and dissolves to show the rack
## that was inside. Reduced motion skips it (the pulse alone marks the arrival).
func deliver(p: Vector3, delay := 0.0) -> void:
	if Settings.reduced_motion: return
	var m := StandardMaterial3D.new(); m.albedo_color = Color(0.72, 0.56, 0.36, 1.0); m.roughness = 0.9; m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	var n := MeshInstance3D.new(); n.mesh = _m("shell"); n.material_override = m; n.scale = Vector3(1.05, 1.02, 1.05)
	n.position = p + Vector3(0, RH * 0.5 + 3.2, 0); n.visible = false; add_child(n)
	var tw := create_tween()
	if delay > 0.0: tw.tween_interval(delay)
	tw.tween_callback(func(): n.visible = true)
	tw.tween_property(n, "position:y", p.y + RH * 0.5 * 1.02, 0.55).set_trans(Tween.TRANS_BOUNCE).set_ease(Tween.EASE_OUT)
	tw.tween_interval(0.35)
	tw.tween_property(m, "albedo_color:a", 0.0, 0.6).set_trans(Tween.TRANS_SINE)
	tw.tween_callback(n.queue_free)

func pulse(p: Vector3, col: Color) -> void:
	var m := StandardMaterial3D.new(); m.albedo_color = Color(col.r, col.g, col.b, 0.0); m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD; m.cull_mode = BaseMaterial3D.CULL_DISABLED
	var n := Node3D.new(); n.position = p; add_child(n)
	var sh := MeshInstance3D.new(); sh.mesh = _m("shell"); sh.material_override = m; sh.position = Vector3(0, RH * 0.5, 0); sh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; n.add_child(sh)
	var rg := MeshInstance3D.new(); rg.mesh = _m("ring"); rg.material_override = m; rg.position = Vector3(0, 0.02, 0); rg.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; n.add_child(rg)
	var tw := create_tween(); var slow := Settings.reduced_motion
	tw.tween_property(m, "albedo_color:a", 0.55, 0.12)
	tw.tween_property(m, "albedo_color:a", 0.0, 1.1).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	if not slow:
		var t2 := create_tween().set_parallel(true)
		t2.tween_property(rg, "scale", Vector3(2.2, 1.0, 1.7), 1.2).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		t2.tween_property(sh, "scale", Vector3(1.06, 1.04, 1.03), 1.2).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_callback(n.queue_free)
