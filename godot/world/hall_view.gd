class_name HallView
extends Node3D
## Realistic 1:1-scale datacenter hall. 1 unit = 1 metre. Contiguous 42U rows, cold-aisle
## containment, raised floor, overhead trays + busway, CRAH / switchgear lineups.

signal slot_clicked(slot: int)
signal hover_changed(slot: int, rack: Dictionary)

const RW := 0.6
const RD := 1.2
const RH := 2.0
const PITCH := 0.6
const COLD := 1.5
const HOT := 1.2
static var RACK_SHADER: Shader = load("res://assets/shaders/rack_face.gdshader")
static var FLOOR_SHADER: Shader = load("res://assets/shaders/floor.gdshader")

var b: Bridge
var _rs: Dictionary = {}
var hall_i := 0
var place_mode := ""
var thermal := false
var cols := 8
var row_z: Array[float] = []
var dyn: Node3D
var cam: Camera3D
var yaw := -0.5
var pitch := 0.42
var dist := 17.0
var target := Vector3.ZERO
var auto_orbit := true
var _drag := 0
var _rack_boxes: Array = []
var _hover := -1
var _hover_mesh: MeshInstance3D
var _t := 0.0
var _mat_cache: Dictionary = {}
var _beacon: OmniLight3D

func _ready() -> void:
	_build_environment()
	dyn = Node3D.new(); add_child(dyn)
	cam = Camera3D.new(); cam.fov = 50.0; cam.far = 300.0; cam.near = 0.1; add_child(cam); cam.current = true
	_hover_mesh = MeshInstance3D.new(); add_child(_hover_mesh); _hover_mesh.visible = false
	var bm := BoxMesh.new(); bm.size = Vector3(RW + 0.06, 0.02, RD + 0.06); _hover_mesh.mesh = bm; _hover_mesh.material_override = _emit(Color(0.4, 0.85, 1.0, 0.35), 1.6, true)
	_update_cam()

func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR; env.background_color = Color(0.02, 0.022, 0.028)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR; env.ambient_light_color = Color(0.55, 0.6, 0.68); env.ambient_light_energy = 0.7
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC; env.tonemap_exposure = 1.0; env.tonemap_white = 6.0
	env.glow_enabled = true; env.glow_intensity = 0.55; env.glow_bloom = 0.04; env.glow_hdr_threshold = 1.3; env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN
	env.adjustment_enabled = true; env.adjustment_contrast = 1.08; env.adjustment_saturation = 0.95
	if RenderingServer.get_current_rendering_method() == "forward_plus":
		env.ssao_enabled = true; env.ssao_intensity = 2.5; env.ssil_enabled = true
		env.ssr_enabled = true; env.ssr_max_steps = 48
	env.fog_enabled = true; env.fog_light_color = Color(0.05, 0.06, 0.08); env.fog_density = 0.006
	var we := WorldEnvironment.new(); we.environment = env; add_child(we)
	var key := DirectionalLight3D.new(); key.light_energy = 0.5; key.light_color = Color(0.85, 0.9, 1.0); key.rotation_degrees = Vector3(-72, 25, 0); key.shadow_enabled = true; key.directional_shadow_max_distance = 40.0; add_child(key)

func _emit(c: Color, energy: float, alpha: bool) -> StandardMaterial3D:
	var m := StandardMaterial3D.new(); m.albedo_color = c; m.emission_enabled = true; m.emission = Color(c.r, c.g, c.b); m.emission_energy_multiplier = energy
	if alpha: m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return m

func _solid(c: Color, rough := 0.5, metal := 0.3) -> StandardMaterial3D:
	var key := "%s%s%s" % [c.to_html(), rough, metal]
	if _mat_cache.has(key): return _mat_cache[key]
	var m := StandardMaterial3D.new(); m.albedo_color = c; m.roughness = rough; m.metallic = metal; _mat_cache[key] = m; return m

func _glass(c: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new(); m.albedo_color = c; m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; m.roughness = 0.08; m.metallic = 0.0; m.cull_mode = BaseMaterial3D.CULL_DISABLED; return m

func _box(parent: Node3D, pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new(); var bm := BoxMesh.new(); bm.size = size; mi.mesh = bm; mi.material_override = mat; mi.position = pos; parent.add_child(mi); return mi

func _cyl(parent: Node3D, pos: Vector3, r: float, len_: float, mat: Material, axis := "z") -> MeshInstance3D:
	var mi := MeshInstance3D.new(); var cm := CylinderMesh.new(); cm.top_radius = r; cm.bottom_radius = r; cm.height = len_; cm.radial_segments = 12; mi.mesh = cm; mi.material_override = mat; mi.position = pos
	if axis == "z": mi.rotation_degrees = Vector3(90, 0, 0)
	elif axis == "x": mi.rotation_degrees = Vector3(0, 0, 90)
	parent.add_child(mi); return mi

func _vendor_color(sy: Dictionary) -> Color:
	var p: String = str(sy.platform)
	if p.contains("MI3"): return Color(1.0, 0.3, 0.15)
	if p.contains("Gaudi"): return Color(0.2, 0.55, 1.0)
	if p.contains("Galaxy") or p.contains("CS-3"): return Color(0.7, 0.35, 1.0)
	return Color(0.35, 1.0, 0.45)

# ---------- layout ----------
func slot_pos(i: int) -> Vector3: return Vector3((i % cols) * PITCH, 0, row_z[i / cols])

func _layout(hall: Dictionary) -> void:
	cols = clampi(int(ceil(sqrt(int(hall.rackSlots) * 1.6))), 5, 12)
	var rows := int(ceil(float(int(hall.rackSlots)) / cols))
	row_z.clear(); var z := 0.0
	for k in rows:
		if k > 0: z += RD + (COLD if k % 2 == 1 else HOT)
		row_z.append(z)

func hall_size() -> Vector2: return Vector2((cols - 1) * PITCH + RW, row_z[row_z.size() - 1] + RD)

# ---------- build ----------
func rebuild() -> void:
	if b == null: return
	_rs = b.q("rackStatsAll")
	for c in dyn.get_children(): c.queue_free()
	_rack_boxes.clear(); _beacon = null
	var hall: Dictionary = b.g.halls[hall_i]
	_layout(hall)
	var sz := hall_size(); var cx := (cols - 1) * PITCH * 0.5; var cz := row_z[row_z.size() - 1] * 0.5
	target = Vector3(cx, 0.9, cz)
	var heat := _heat(hall)
	var cap := minf(hall.coolingKW, hall.itPowerKW)
	var ratio := (heat / cap) if cap > 0.0 else (2.0 if heat > 0 else 0.0)
	_build_shell(hall, sz, cx, cz)
	_build_aisles(sz, cx, ratio)
	var occupied := {}
	for r in hall.racks: occupied[int(r.slot)] = r
	for i in int(hall.rackSlots):
		var p := slot_pos(i)
		if occupied.has(i): _build_rack(i, p, occupied[i])
		else: _build_slot(i, p)
	_build_plant(hall, sz, cx, cz)
	_build_overhead(sz, cx)
	if ratio > 1.0 and heat > 0.0:
		_beacon = OmniLight3D.new(); _beacon.light_color = Color(1, 0.1, 0.05); _beacon.omni_range = 14.0; _beacon.position = Vector3(cx, 3.8, cz); dyn.add_child(_beacon)
	_update_cam()

func _build_shell(hall: Dictionary, sz: Vector2, cx: float, cz: float) -> void:
	var fw := sz.x + 9.0; var fd := sz.y + 8.0
	var fm := MeshInstance3D.new(); var pm := PlaneMesh.new(); pm.size = Vector2(fw, fd); fm.mesh = pm; fm.position = Vector3(cx, 0, cz)
	var sm := ShaderMaterial.new(); sm.shader = FLOOR_SHADER; sm.set_shader_parameter("area", Vector2(fw, fd)); fm.material_override = sm; dyn.add_child(fm)
	var wall := _solid(Color(0.34, 0.35, 0.38), 0.92, 0.0)
	var trim := _solid(Color(0.85, 0.7, 0.1), 0.7, 0.0)
	_box(dyn, Vector3(cx, 2.25, cz - fd * 0.5), Vector3(fw, 4.5, 0.3), wall)
	_box(dyn, Vector3(cx - fw * 0.5, 2.25, cz), Vector3(0.3, 4.5, fd), wall)
	_box(dyn, Vector3(cx + fw * 0.5, 2.25, cz), Vector3(0.3, 4.5, fd), wall)
	_box(dyn, Vector3(cx, 0.08, cz - fd * 0.5 + 0.17), Vector3(fw, 0.16, 0.04), trim)           # safety-yellow skirting
	_box(dyn, Vector3(cx - fw * 0.5 + 0.17, 0.08, cz), Vector3(0.04, 0.16, fd), trim)
	_box(dyn, Vector3(cx + fw * 0.5 - 0.17, 0.08, cz), Vector3(0.04, 0.16, fd), trim)
	for k in 3:                                                                                  # structural columns
		var x := cx - fw * 0.5 + 0.6 + k * (fw - 1.2) / 2.0
		_box(dyn, Vector3(x, 2.25, cz - fd * 0.5 + 0.55), Vector3(0.5, 4.5, 0.5), _solid(Color(0.28, 0.29, 0.31), 0.9, 0.0))
		_box(dyn, Vector3(x, 0.5, cz - fd * 0.5 + 0.55), Vector3(0.52, 1.0, 0.52), _solid(Color(0.8, 0.65, 0.08), 0.8, 0.0))
	_box(dyn, Vector3(cx + fw * 0.5 - 0.2, 1.1, cz + fd * 0.25), Vector3(0.1, 2.2, 1.4), _solid(Color(0.1, 0.11, 0.13), 0.4, 0.6))    # personnel door
	_box(dyn, Vector3(cx + fw * 0.5 - 0.27, 2.4, cz + fd * 0.25), Vector3(0.04, 0.2, 0.5), _emit(Color(0.2, 1.0, 0.45), 1.8, false))   # exit sign

func _build_aisles(sz: Vector2, cx: float, ratio: float) -> void:
	var rows := row_z.size()
	var w := sz.x + 0.1
	for k in range(0, rows - 1):
		var z0 := row_z[k] + RD * 0.5; var z1 := row_z[k + 1] - RD * 0.5
		var mid := (z0 + z1) * 0.5; var d := z1 - z0
		var cold := k % 2 == 0
		if cold:
			var pf := MeshInstance3D.new(); var pm := PlaneMesh.new(); pm.size = Vector2(w, d); pf.mesh = pm; pf.position = Vector3(cx, 0.004, mid)
			var sm := ShaderMaterial.new(); sm.shader = FLOOR_SHADER; sm.set_shader_parameter("area", Vector2(w, d)); sm.set_shader_parameter("perf_rect", Vector4(-1000, -1000, 1000, 1000)); pf.material_override = sm; dyn.add_child(pf)
			# containment: glass roof + end doors + frame
			_box(dyn, Vector3(cx, 2.12, mid), Vector3(w, 0.03, d), _glass(Color(0.6, 0.75, 0.9, 0.07)))
			for ex in [-0.33, (cols - 1) * PITCH + 0.33]:
				_box(dyn, Vector3(ex, 1.06, mid), Vector3(0.03, 2.1, d), _glass(Color(0.6, 0.75, 0.9, 0.08)))
				_box(dyn, Vector3(ex, 1.06, mid), Vector3(0.05, 2.12, 0.06), _solid(Color(0.05, 0.05, 0.06), 0.4, 0.8))
			var l := OmniLight3D.new(); l.light_color = Color(0.75, 0.88, 1.0); l.light_energy = 1.1; l.omni_range = 6.0; l.position = Vector3(cx, 1.9, mid); dyn.add_child(l)
		else:
			if ratio > 0.01: _box(dyn, Vector3(cx, 0.006, mid), Vector3(w, 0.004, d), _emit(Color(1.0, 0.25, 0.1, 0.05 + 0.1 * clampf(ratio, 0, 1.5)), 1.0, true))
			var l2 := OmniLight3D.new(); l2.light_color = Color(1.0, 0.7, 0.5); l2.light_energy = 0.3 + 0.5 * ratio; l2.omni_range = 4.5; l2.position = Vector3(cx, 1.8, mid); dyn.add_child(l2)

func _build_slot(i: int, p: Vector3) -> void:
	var valid := place_mode != ""
	var col := Color(0.35, 1.0, 0.55, 0.9) if valid else Color(0.9, 0.9, 0.9, 0.35)
	var mat := _emit(col, 1.2 if valid else 0.4, true)
	var L := 0.14
	for sx in [-1, 1]:
		for sz_ in [-1, 1]:
			_box(dyn, p + Vector3(sx * (RW * 0.5 - 0.02), 0.006, sz_ * (RD * 0.5 - L * 0.5)), Vector3(0.025, 0.004, L), mat)
			_box(dyn, p + Vector3(sx * (RW * 0.5 - L * 0.5), 0.006, sz_ * (RD * 0.5 - 0.02)), Vector3(L, 0.004, 0.025), mat)
	if valid: _box(dyn, p + Vector3(0, 0.005, 0), Vector3(RW - 0.06, 0.003, RD - 0.06), _emit(Color(0.2, 1.0, 0.5, 0.12), 1.0, true))

func _build_rack(i: int, p: Vector3, r: Dictionary) -> void:
	var sy := _sysinfo(r.designId)
	var row := i / cols
	var st: String = r.status
	var parent := Node3D.new(); parent.position = p; parent.rotation.y = 0.0 if row % 2 == 0 else PI; dyn.add_child(parent)
	_box(parent, Vector3(0, 0.002, 0), Vector3(RW + 0.04, 0.004, RD + 0.04), _emit(Color(0, 0, 0, 0.45), 0.0, true))   # contact shadow
	if st == "installing" or st == "ordered":
		_box(parent, Vector3(0, 0.08, 0), Vector3(0.7, 0.16, 1.2), _solid(Color(0.45, 0.32, 0.18), 0.9, 0.0))              # pallet
		_box(parent, Vector3(0, 0.95, 0), Vector3(0.62, 1.55, 1.05), _solid(Color(0.62, 0.5, 0.33), 0.95, 0.0))             # carton
		_box(parent, Vector3(0, 0.95, 0), Vector3(0.64, 1.58, 1.07), _glass(Color(0.85, 0.9, 1.0, 0.13)))                   # stretch wrap
		_box(parent, Vector3(0, 1.4, 0.54), Vector3(0.3, 0.1, 0.005), _solid(Color(0.9, 0.9, 0.85), 0.9, 0.0))              # shipping label
	else:
		var shell := _solid(Color(0.04, 0.042, 0.048), 0.5, 0.8)
		_box(parent, Vector3(0, RH * 0.5, 0), Vector3(RW - 0.004, RH, RD - 0.05), shell)
		_box(parent, Vector3(0, RH + 0.01, 0), Vector3(RW - 0.004, 0.02, RD - 0.03), _solid(Color(0.1, 0.105, 0.115), 0.6, 0.6))
		var front := _face(i, sy, st, false); front.position = Vector3(0, 0.07 + 0.935, RD * 0.5 - 0.025 + 0.002); parent.add_child(front)
		var rear := _face(i, sy, st, true); rear.position = Vector3(0, 0.07 + 0.935, -RD * 0.5 + 0.025 - 0.002); rear.rotation.y = PI; parent.add_child(rear)
		if st == "failed":
			var sm := CPUParticles3D.new(); sm.amount = 22; sm.lifetime = 3.0; sm.direction = Vector3(0, 1, 0); sm.spread = 18.0; sm.initial_velocity_min = 0.35; sm.initial_velocity_max = 0.8
			sm.gravity = Vector3(0, 0.12, 0); sm.scale_amount_min = 0.1; sm.scale_amount_max = 0.38; sm.position = Vector3(0, RH, 0); sm.emitting = true
			var qm := SphereMesh.new(); qm.radius = 0.5; qm.height = 1.0; sm.mesh = qm
			var smat := StandardMaterial3D.new(); smat.albedo_color = Color(0.3, 0.3, 0.32, 0.35); smat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; sm.material_override = smat; parent.add_child(sm)
			var fl := OmniLight3D.new(); fl.light_color = Color(1, 0.15, 0.1); fl.light_energy = 1.2; fl.omni_range = 3.0; fl.position = Vector3(0, 1.6, 0.9); parent.add_child(fl)
	_rack_boxes.append({"slot": i, "aabb": AABB(p + Vector3(-RW * 0.5, 0, -RD * 0.5), Vector3(RW, RH, RD)), "rack": r})

func _heat(hall: Dictionary) -> float:
	var kw := 0.0
	for r in hall.racks:
		if r.status == "online" or r.status == "commissioning": kw += _rs.get(r.designId, {}).get("kW", 0.0)
	return kw

func _sysinfo(design_id: String) -> Dictionary:
	var st: Dictionary = _rs.get(design_id, {})
	var plat := "nvidia"
	for d in b.g.racks:
		if d.id == design_id:
			for it in d.items:
				if it.type == "tray":
					for tr in b.g.trays:
						if tr.id == it.trayId:
							var cid: String = tr.chassisId
							plat = "Galaxy" if cid.begins_with("tt") else ("CS-3" if cid.begins_with("cb") else ("Gaudi" if cid.begins_with("int") else ("MI3" if (cid.contains("mi") or cid.begins_with("gig") or cid.begins_with("sm-ubb")) else "nvidia")))
	return {"kW": st.get("kW", 10.0), "accels": st.get("accels", 8), "platform": plat}

func _face(i: int, sy: Dictionary, st: String, rear: bool) -> MeshInstance3D:
	var mi := MeshInstance3D.new(); var q := QuadMesh.new(); q.size = Vector2(RW - 0.03, 1.87); mi.mesh = q
	var m := ShaderMaterial.new(); m.shader = RACK_SHADER
	m.set_shader_parameter("seed", float(i * 7 + 3)); m.set_shader_parameter("fill", clampf(0.4 + float(sy.kW) / 80.0, 0.4, 1.0))
	var c := _vendor_color(sy); m.set_shader_parameter("accent", Vector3(c.r, c.g, c.b))
	m.set_shader_parameter("state", 0 if st == "online" else (1 if st == "commissioning" else 2)); m.set_shader_parameter("rear", rear)
	m.set_shader_parameter("heat", clampf(float(sy.kW) / 60.0, 0.0, 1.0) if thermal and st == "online" else -1.0)
	mi.material_override = m; return mi

func _build_plant(hall: Dictionary, sz: Vector2, cx: float, cz: float) -> void:
	var cool_n := 0; var pow_n := 0
	var pipe_b := _solid(Color(0.1, 0.4, 0.9), 0.3, 0.2); var pipe_r := _solid(Color(0.85, 0.2, 0.15), 0.3, 0.2)
	var cdu_z0 := 0.3
	var plant := {}
	for id in hall.powerEquip: plant[id] = hall.powerEquip[id]
	for id in hall.coolingEquip: plant[id] = hall.coolingEquip[id]
	for id in plant:
		var it := b.item(id)
		for j in mini(int(plant[id]), 8):
			if it.kind == "cooling":
				var liquid: bool = it.get("serves", "") == "dlc" or it.get("serves", "") == "immersion"
				var pos := Vector3(-3.6, 0, cdu_z0 + cool_n * 1.15)
				var body := _solid(Color(0.16, 0.2, 0.26) if liquid else Color(0.72, 0.74, 0.77), 0.45, 0.4)
				_box(dyn, pos + Vector3(0, 1.05, 0), Vector3(0.9, 2.1, 0.95), body)
				_box(dyn, pos + Vector3(0.455, 1.0, 0), Vector3(0.02, 1.5, 0.7), _solid(Color(0.05, 0.06, 0.07), 0.5, 0.6))                      # louvres / door inset
				_box(dyn, pos + Vector3(0.47, 1.75, 0.25), Vector3(0.01, 0.1, 0.22), _emit(Color(0.3, 0.8, 1.0), 1.4, false))                      # display
				_box(dyn, pos + Vector3(0.47, 1.75, -0.2), Vector3(0.01, 0.04, 0.04), _emit(Color(0.3, 1.0, 0.5), 2.0, false))
				if liquid:
					_cyl(dyn, Vector3(pos.x + 0.2, 0.14, pos.z), 0.045, 0.9, pipe_b, "x"); _cyl(dyn, Vector3(pos.x + 0.2, 0.26, pos.z), 0.045, 0.9, pipe_r, "x")
				cool_n += 1
			else:
				var pos2 := Vector3(cx - 3.0 + pow_n * 0.9, 0, -3.6)
				var tall := 2.3 if it.get("powerType", "") != "transformer" else 1.7
				_box(dyn, pos2 + Vector3(0, tall * 0.5, 0), Vector3(0.85, tall, 0.9), _solid(Color(0.14, 0.15, 0.17), 0.5, 0.7))
				_box(dyn, pos2 + Vector3(0, tall * 0.5, 0.455), Vector3(0.72, tall - 0.2, 0.012), _solid(Color(0.2, 0.21, 0.23), 0.45, 0.7))     # door panel
				_box(dyn, pos2 + Vector3(0.3, tall * 0.5, 0.47), Vector3(0.03, 0.18, 0.02), _solid(Color(0.7, 0.7, 0.72), 0.3, 0.9))              # handle
				_box(dyn, pos2 + Vector3(-0.25, tall - 0.4, 0.47), Vector3(0.12, 0.08, 0.01), _emit(Color(1.0, 0.65, 0.1), 1.8, false))            # status
				_box(dyn, pos2 + Vector3(-0.1, tall - 0.4, 0.47), Vector3(0.04, 0.04, 0.01), _emit(Color(0.2, 1.0, 0.4), 2.0, false))
				pow_n += 1
	if hall.coolingClass == "dlc" and cool_n > 0:
		var zlen := row_z[row_z.size() - 1] + 1.0
		_cyl(dyn, Vector3(-0.55, 0.14, zlen * 0.5), 0.05, zlen, pipe_b, "z"); _cyl(dyn, Vector3(-0.7, 0.14, zlen * 0.5), 0.05, zlen, pipe_r, "z")
		for z in row_z: _cyl(dyn, Vector3(-0.3, 0.14, z), 0.03, 0.6, pipe_b, "x")
	if plant.is_empty():
		var l := OmniLight3D.new(); l.light_color = Color(1, 0.3, 0.2); l.light_energy = 1.0; l.omni_range = 8.0; l.position = Vector3(cx, 2.5, cz); dyn.add_child(l)

func _build_overhead(sz: Vector2, cx: float) -> void:
	var tray := _solid(Color(0.32, 0.33, 0.36), 0.4, 0.85)
	var bus := _solid(Color(0.62, 0.63, 0.65), 0.4, 0.7)
	for k in row_z.size():
		var z := row_z[k]
		_box(dyn, Vector3(cx, 2.55, z - 0.18), Vector3(sz.x + 0.5, 0.05, 0.3), tray)                                                          # wire-basket tray (copper)
		_box(dyn, Vector3(cx, 2.6, z - 0.18), Vector3(sz.x + 0.4, 0.05, 0.12), _solid(Color(0.02, 0.02, 0.025), 0.9, 0.0))
		_box(dyn, Vector3(cx, 2.55, z + 0.22), Vector3(sz.x + 0.5, 0.04, 0.22), tray)                                                         # fibre tray
		_box(dyn, Vector3(cx, 2.6, z + 0.22), Vector3(sz.x + 0.4, 0.04, 0.09), _solid(Color(0.9, 0.72, 0.1), 0.6, 0.0))
		_box(dyn, Vector3(cx, 2.85, z), Vector3(sz.x + 0.5, 0.14, 0.22), bus)                                                                 # busway
		for j in range(0, cols, 2):
			_box(dyn, Vector3(j * PITCH + 0.3, 2.72, z), Vector3(0.22, 0.12, 0.2), _solid(Color(0.2, 0.2, 0.22), 0.5, 0.6))
			_box(dyn, Vector3(j * PITCH + 0.3, 2.72, z + 0.101), Vector3(0.03, 0.03, 0.005), _emit(Color(0.2, 1.0, 0.4), 2.0, false))
	for k in range(0, row_z.size() - 1):
		var mid := (row_z[k] + row_z[k + 1]) * 0.5
		_box(dyn, Vector3(cx, 3.5, mid), Vector3(sz.x, 0.03, 0.14), _emit(Color(0.92, 0.95, 1.0), 0.8, false))

# ---------- camera & input ----------
func _update_cam() -> void:
	if cam == null: return
	var off := Vector3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * dist
	cam.position = target + off; cam.look_at(target)

func _process(dt: float) -> void:
	_t += dt
	if auto_orbit: yaw += dt * 0.04; _update_cam()
	if _beacon != null: _beacon.light_energy = 1.5 + 1.5 * sin(_t * 6.0)
	var k := Vector2.ZERO
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT): k.x -= 1
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT): k.x += 1
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP): k.y -= 1
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN): k.y += 1
	if k != Vector2.ZERO: auto_orbit = false; _pan(k * dt * dist * 0.9)
	if Input.is_key_pressed(KEY_Q): yaw += dt; auto_orbit = false; _update_cam()
	if Input.is_key_pressed(KEY_E): yaw -= dt; auto_orbit = false; _update_cam()

func _pan(v: Vector2) -> void:
	var right := Vector3(cos(yaw), 0, -sin(yaw)); var fwd := Vector3(-sin(yaw), 0, -cos(yaw))
	target += right * v.x - fwd * v.y; _update_cam()

func _ray_pick(mp: Vector2) -> int:
	var o := cam.project_ray_origin(mp); var d := cam.project_ray_normal(mp)
	var best := -1; var bd := 1e9
	for rb in _rack_boxes:
		var hit = rb.aabb.intersects_ray(o, d)
		if hit != null:
			var dd: float = o.distance_to(hit)
			if dd < bd: bd = dd; best = rb.slot
	if best >= 0: return best
	if absf(d.y) < 1e-5: return -1
	var t := -o.y / d.y
	if t < 0: return -1
	var g := o + d * t
	var hall: Dictionary = b.g.halls[hall_i]
	for i in int(hall.rackSlots):
		var p := slot_pos(i)
		if absf(g.x - p.x) <= RW * 0.5 and absf(g.z - p.z) <= RD * 0.5: return i
	return -1

func _unhandled_input(e: InputEvent) -> void:
	if b == null: return
	if e is InputEventMouseButton:
		var mb := e as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP: dist = maxf(2.5, dist * 0.9); auto_orbit = false; _update_cam()
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN: dist = minf(60.0, dist * 1.1); auto_orbit = false; _update_cam()
		elif mb.button_index == MOUSE_BUTTON_RIGHT: _drag = (2 if Input.is_key_pressed(KEY_SHIFT) else 1) if mb.pressed else 0
		elif mb.button_index == MOUSE_BUTTON_MIDDLE: _drag = 2 if mb.pressed else 0
		elif mb.button_index == MOUSE_BUTTON_LEFT and mb.pressed:
			var s := _ray_pick(mb.position)
			if s >= 0: slot_clicked.emit(s)
	elif e is InputEventMouseMotion:
		var mm := e as InputEventMouseMotion
		if _drag == 1: yaw -= mm.relative.x * 0.006; pitch = clampf(pitch + mm.relative.y * 0.005, 0.03, 1.45); auto_orbit = false; _update_cam()
		elif _drag == 2: _pan(Vector2(-mm.relative.x, -mm.relative.y) * dist * 0.0016)
		else:
			var s := _ray_pick(mm.position)
			if s != _hover:
				_hover = s
				if s < 0: _hover_mesh.visible = false; hover_changed.emit(-1, {})
				else:
					_hover_mesh.visible = true; _hover_mesh.position = slot_pos(s) + Vector3(0, 0.012, 0)
					var rk := {}
					for rb in _rack_boxes:
						if rb.slot == s: rk = rb.rack
					hover_changed.emit(s, rk)
