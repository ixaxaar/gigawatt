class_name HallView
extends Node3D
## Fullscreen 3D datacenter hall: racks, aisles, plant, cinematic orbit camera, slot picking.

signal slot_clicked(slot: int)
signal hover_changed(slot: int, rack: Dictionary)

const RW := 0.6
const RD := 1.2
const RH := 2.2
const PITCH := 0.82
const COLD := 1.9
const HOT := 1.5

var sim: Sim
var hall_i := 0
var place_mode := ""      # sys id being placed, or ""
var thermal := false

var cols := 8
var row_z: Array[float] = []
var dyn: Node3D
var cam: Camera3D
var yaw := -0.55
var pitch := 0.62
var dist := 24.0
var target := Vector3.ZERO
var auto_orbit := true
var _drag := 0          # 0 none, 1 orbit, 2 pan
var _rack_boxes: Array = []     # [{slot, aabb, rack}]
var _hover := -1
var _hover_mesh: MeshInstance3D
var _pulse_mats: Array[StandardMaterial3D] = []
var _t := 0.0
var _mat_cache: Dictionary = {}

func _ready() -> void:
	_build_environment()
	dyn = Node3D.new(); add_child(dyn)
	cam = Camera3D.new(); cam.fov = 55.0; cam.far = 400.0; add_child(cam); cam.current = true
	_hover_mesh = MeshInstance3D.new(); var bm := BoxMesh.new(); bm.size = Vector3(RW + 0.1, 0.04, RD + 0.1); _hover_mesh.mesh = bm
	_hover_mesh.material_override = _emit(Color(1, 1, 1, 0.5), 2.0, true); add_child(_hover_mesh); _hover_mesh.visible = false
	for k in 3:
		var m := _emit(Color(0.2, 1.0, 0.6), 2.0, false); _pulse_mats.append(m)
	_update_cam()

func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR; env.background_color = Color(0.015, 0.02, 0.035)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR; env.ambient_light_color = Color(0.42, 0.52, 0.7); env.ambient_light_energy = 1.0
	env.tonemap_mode = Environment.TONE_MAPPER_ACES; env.tonemap_exposure = 1.05
	env.glow_enabled = true; env.glow_intensity = 0.7; env.glow_bloom = 0.08; env.glow_hdr_threshold = 1.1; env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SOFTLIGHT
	if RenderingServer.get_current_rendering_method() == "forward_plus":
		env.ssao_enabled = true; env.ssao_intensity = 2.0
		env.ssr_enabled = true; env.ssr_max_steps = 48; env.ssr_fade_in = 0.15
	env.fog_enabled = true; env.fog_light_color = Color(0.06, 0.1, 0.16); env.fog_density = 0.012
	var we := WorldEnvironment.new(); we.environment = env; add_child(we)
	var sun := DirectionalLight3D.new(); sun.light_energy = 0.35; sun.light_color = Color(0.7, 0.8, 1.0); sun.rotation_degrees = Vector3(-60, 30, 0); sun.shadow_enabled = true; add_child(sun)

func _emit(c: Color, energy: float, alpha: bool) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c; m.emission_enabled = true; m.emission = Color(c.r, c.g, c.b); m.emission_energy_multiplier = energy
	if alpha: m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return m

func _solid(c: Color, rough := 0.5, metal := 0.3) -> StandardMaterial3D:
	var key := "%s%s%s" % [c.to_html(), rough, metal]
	if _mat_cache.has(key): return _mat_cache[key]
	var m := StandardMaterial3D.new(); m.albedo_color = c; m.roughness = rough; m.metallic = metal
	_mat_cache[key] = m; return m

func _box(parent: Node3D, pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new(); var bm := BoxMesh.new(); bm.size = size; mi.mesh = bm; mi.material_override = mat; mi.position = pos; parent.add_child(mi); return mi

func _vendor_color(sy: Dictionary) -> Color:
	var p: String = sy.platform
	if p.contains("MI3"): return Color(1.0, 0.35, 0.25)
	if p.contains("Gaudi"): return Color(0.25, 0.6, 1.0)
	if p.contains("Galaxy") or p.contains("CS-3") or p.contains("Cerebras"): return Color(0.78, 0.45, 1.0)
	return Color(0.35, 1.0, 0.5)

# ---------- layout ----------
func slot_pos(i: int) -> Vector3:
	return Vector3((i % cols) * PITCH, 0, row_z[i / cols])

func _layout(hall: Dictionary) -> void:
	cols = clampi(int(ceil(sqrt(hall.slots * 1.3))), 4, 10)
	var rows := int(ceil(float(hall.slots) / cols))
	row_z.clear(); var z := 0.0
	for k in rows:
		if k > 0: z += RD + (COLD if k % 2 == 1 else HOT)
		row_z.append(z)

func hall_size() -> Vector2:
	return Vector2((cols - 1) * PITCH + RW, row_z[row_z.size() - 1] + RD)

# ---------- (re)build ----------
func rebuild() -> void:
	if sim == null: return
	for c in dyn.get_children(): c.queue_free()
	_rack_boxes.clear()
	var hall: Dictionary = sim.s.halls[hall_i]
	_layout(hall)
	var sz := hall_size(); var cx := sz.x * 0.5 - RW * 0.5; var cz := sz.y * 0.5 - RD * 0.5
	target = Vector3(cx, 0.8, cz)
	_build_shell(hall, sz, cx, cz)
	var heat := sim.hall_heat(hall); var ratio := heat / maxf(1.0, minf(hall.cool_kw, hall.it_kw)) if (hall.cool_kw > 0 and hall.it_kw > 0) else (2.0 if heat > 0 else 0.0)
	_build_aisles(hall, sz, ratio)
	var occupied := {}
	for r in hall.racks: occupied[r.slot] = r
	for i in hall.slots:
		var p := slot_pos(i)
		if occupied.has(i): _build_rack(i, p, occupied[i], hall, ratio)
		else: _build_slot(i, p)
	_build_plant(hall, sz, cx, cz)
	_build_overhead(hall, sz, cx)
	if ratio > 1.0 and heat > 0:
		var l := Label3D.new(); l.font = Fonts.bold; l.text = "⚠ OVERLOAD — racks are throttling"; l.font_size = 120; l.pixel_size = 0.005; l.modulate = Color(1, 0.35, 0.3); l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		l.position = Vector3(cx, 4.2, cz); l.no_depth_test = true; dyn.add_child(l)
	_update_cam()

func _build_shell(hall: Dictionary, sz: Vector2, cx: float, cz: float) -> void:
	var fw := sz.x + 9.0; var fd := sz.y + 9.0
	var floor_mi := MeshInstance3D.new(); var pm := PlaneMesh.new(); pm.size = Vector2(fw, fd); floor_mi.mesh = pm; floor_mi.position = Vector3(cx, 0, cz)
	var sh := Shader.new()
	sh.code = """shader_type spatial;
uniform vec2 tiles = vec2(10.0, 10.0);
void fragment(){
	vec2 g = fract(UV * tiles);
	float line = step(g.x, 0.018) + step(g.y, 0.018) + step(0.982, g.x) + step(0.982, g.y);
	float perf = step(length(g - 0.5), 0.07);
	ALBEDO = mix(vec3(0.07, 0.09, 0.13), vec3(0.2, 0.38, 0.55), clamp(line, 0.0, 1.0)) * (1.0 - perf * 0.5);
	ROUGHNESS = 0.22; METALLIC = 0.55; SPECULAR = 0.8;
}"""
	var sm := ShaderMaterial.new(); sm.shader = sh; sm.set_shader_parameter("tiles", Vector2(fw / 0.6, fd / 0.6)); floor_mi.material_override = sm; dyn.add_child(floor_mi)
	var wall := _solid(Color(0.05, 0.07, 0.1), 0.8, 0.1)
	_box(dyn, Vector3(cx, 2.5, cz - fd * 0.5), Vector3(fw, 5.0, 0.3), wall)
	_box(dyn, Vector3(cx - fw * 0.5, 2.5, cz), Vector3(0.3, 5.0, fd), wall)
	_box(dyn, Vector3(cx + fw * 0.5, 2.5, cz), Vector3(0.3, 5.0, fd), wall)
	var title := Label3D.new(); title.font = Fonts.bold; title.text = "%s · %s" % [hall.name.to_upper(), hall.cool.to_upper()]; title.font_size = 160; title.pixel_size = 0.006
	title.modulate = Color(0.3, 0.8, 1.0); title.position = Vector3(cx, 3.6, cz - fd * 0.5 + 0.25); dyn.add_child(title)

func _build_aisles(hall: Dictionary, sz: Vector2, ratio: float) -> void:
	var w := sz.x + 0.6; var cx := (cols - 1) * PITCH * 0.5
	var rows := row_z.size()
	for k in range(0, rows - 1):
		var z0 := row_z[k] + RD * 0.5 if k % 2 == 0 else row_z[k] + RD * 0.5
		var z1 := row_z[k + 1] - RD * 0.5
		var mid := (z0 + z1) * 0.5; var d := z1 - z0
		var cold := k % 2 == 0
		var mat: StandardMaterial3D
		if cold: mat = _emit(Color(0.2, 0.65, 1.0, 0.22), 1.2, true)
		else: mat = _emit(Color(1.0, 0.3 + 0.2 * (1.0 - clampf(ratio, 0, 1.4) / 1.4), 0.2, 0.18 + 0.25 * clampf(ratio, 0, 1.5)), 1.0 + ratio, true)
		_box(dyn, Vector3(cx, 0.012, mid), Vector3(w, 0.01, d), mat)
		if cold:
			var l := OmniLight3D.new(); l.light_color = Color(0.3, 0.7, 1.0); l.light_energy = 1.3; l.omni_range = 7.0; l.position = Vector3(cx, 1.6, mid); dyn.add_child(l)
		elif ratio > 0.01:
			var l2 := OmniLight3D.new(); l2.light_color = Color(1.0, 0.45, 0.25); l2.light_energy = 0.4 + ratio; l2.omni_range = 7.0; l2.position = Vector3(cx, 1.6, mid); dyn.add_child(l2)

func _build_slot(i: int, p: Vector3) -> void:
	var valid := place_mode != ""
	var c := Color(0.3, 0.9, 0.55, 0.28) if valid else Color(0.25, 0.7, 1.0, 0.07)
	_box(dyn, p + Vector3(0, 0.02, 0), Vector3(RW, 0.02, RD), _emit(c, 1.5 if valid else 0.8, true))
	for sx in [-1, 1]:
		_box(dyn, p + Vector3(sx * RW * 0.5, 0.03, 0), Vector3(0.025, 0.02, RD), _emit(Color(0.3, 0.8, 1.0, 0.7), 1.6, true))

func _build_rack(i: int, p: Vector3, r: Dictionary, hall: Dictionary, ratio: float) -> void:
	var sy := Data.system(r.sys)
	var row := i / cols; var face := 1.0 if row % 2 == 0 else -1.0
	var st: String = r.status
	var vc := _vendor_color(sy)
	var body := Color(0.2, 0.25, 0.33)
	var parent := Node3D.new(); parent.position = p; dyn.add_child(parent)
	if st == "installing":
		var g := _emit(Color(0.3, 0.7, 1.0, 0.25), 1.2, true)
		_box(parent, Vector3(0, RH * 0.5, 0), Vector3(RW, RH, RD), g)
		_box(parent, Vector3(0, 0.15, 0), Vector3(RW + 0.3, 0.3, RD + 0.3), _solid(Color(0.55, 0.4, 0.2), 0.9, 0.0))   # crates / scaffolding
	else:
		var heat_t := clampf(sy.kW / 60.0, 0.0, 1.0)
		var shell := _solid(Color(0.35, 0.1, 0.12) if st == "failed" else (Color(0.34, 0.26, 0.1) if st == "commissioning" else body), 0.45, 0.35)
		_box(parent, Vector3(0, RH * 0.5, 0), Vector3(RW, RH, RD), shell)
		var led: Color = vc
		if thermal: led = Color(0.2 + 0.8 * heat_t, 0.9 - 0.7 * heat_t, 0.25)
		if st == "failed": led = Color(1, 0.15, 0.15)
		if st == "commissioning": led = Color(1, 0.7, 0.1)
		var bars := 11
		for b in bars:
			var y := 0.22 + b * (RH - 0.4) / bars
			var on := (i * 7 + b * 13) % 5 != 0 or st == "failed"
			if not on: continue
			var mat := _emit(led, 1.7 + (b % 3) * 0.4, false)
			if st == "online": mat = _led_mat(led, (i + b) % 3)
			_box(parent, Vector3(0, y, face * (RD * 0.5 + 0.004)), Vector3(RW * 0.82, 0.075, 0.012), mat)
		if st == "failed":
			var sm := CPUParticles3D.new(); sm.amount = 24; sm.lifetime = 2.6; sm.direction = Vector3(0, 1, 0); sm.spread = 20.0; sm.initial_velocity_min = 0.5; sm.initial_velocity_max = 1.1
			sm.gravity = Vector3(0, 0.25, 0); sm.scale_amount_min = 0.12; sm.scale_amount_max = 0.45; sm.position = Vector3(0, RH, 0); sm.emitting = true
			var qm := SphereMesh.new(); qm.radius = 0.5; qm.height = 1.0; sm.mesh = qm
			var smat := StandardMaterial3D.new(); smat.albedo_color = Color(0.25, 0.25, 0.27, 0.5); smat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; sm.material_override = smat
			parent.add_child(sm)
			var fl := OmniLight3D.new(); fl.light_color = Color(1, 0.2, 0.15); fl.light_energy = 1.5; fl.omni_range = 4.0; fl.position = Vector3(0, 1.5, face * 0.8); parent.add_child(fl)
	if thermal or st != "online":
		var tag := Label3D.new(); tag.font = Fonts.bold; tag.text = ("%d kW" % int(sy.kW)) if st == "online" else ("ETA %s" % sim.date_of(r.ready) if st != "failed" else "FAILED")
		tag.font_size = 40; tag.pixel_size = 0.004; tag.position = Vector3(0, RH + 0.22, 0); tag.billboard = BaseMaterial3D.BILLBOARD_ENABLED; tag.modulate = Color(0.8, 0.95, 1.0, 0.9) if st != "failed" else Color(1, 0.4, 0.4); tag.no_depth_test = true; parent.add_child(tag)
	_box(parent, Vector3(0, RH + 0.01, 0), Vector3(RW + 0.02, 0.03, RD + 0.02), _emit(vc * 0.55, 0.7, false) if st == "online" else _solid(Color(0.3, 0.35, 0.42)))
	_rack_boxes.append({"slot": i, "aabb": AABB(p + Vector3(-RW * 0.5, 0, -RD * 0.5), Vector3(RW, RH, RD)), "rack": r})

func _led_mat(c: Color, k: int) -> StandardMaterial3D:
	var key := "led%s%d" % [c.to_html(), k]
	if _mat_cache.has(key): return _mat_cache[key]
	var m := _emit(c, 2.0, false); _mat_cache[key] = m; _pulse_mats.append(m); return m

func _build_plant(hall: Dictionary, sz: Vector2, cx: float, cz: float) -> void:
	var left := -1.9; var k := 0
	for id in hall.plant:
		var it := Data.item(id); var n := mini(hall.plant[id], 6)
		for j in n:
			var cool: bool = it.kind == "cooling"
			var pos := Vector3(left - (0 if cool else 1.4), 0, 0.2 + k * 1.15)
			if not cool: pos = Vector3(cx + (k - 2) * 1.3, 0, -3.2)
			var col := Color(0.12, 0.2, 0.27) if cool else Color(0.25, 0.2, 0.08)
			_box(dyn, pos + Vector3(0, 1.0, 0), Vector3(0.95, 2.0, 0.9), _solid(col, 0.4, 0.7))
			_box(dyn, pos + Vector3(0.0, 1.1, 0.46), Vector3(0.7, 0.06, 0.02), _emit(Color(0.3, 0.8, 1.0) if cool else Color(1.0, 0.7, 0.15), 2.2, false))
			if cool:
				var fan := MeshInstance3D.new(); var cm := CylinderMesh.new(); cm.top_radius = 0.3; cm.bottom_radius = 0.3; cm.height = 0.04; fan.mesh = cm; fan.rotation_degrees = Vector3(90, 0, 0); fan.position = pos + Vector3(0, 1.6, 0.47); fan.material_override = _solid(Color(0.05, 0.07, 0.1), 0.3, 0.9); dyn.add_child(fan)
			k += 1
	if hall.plant.is_empty():
		var l := Label3D.new(); l.font = Fonts.bold; l.text = "NO POWER / COOLING INSTALLED"; l.font_size = 80; l.pixel_size = 0.006; l.modulate = Color(1, 0.5, 0.3); l.position = Vector3(cx, 2.0, cz); l.billboard = BaseMaterial3D.BILLBOARD_ENABLED; dyn.add_child(l)

func _build_overhead(hall: Dictionary, sz: Vector2, cx: float) -> void:
	var tray := _solid(Color(0.1, 0.12, 0.16), 0.6, 0.5)
	for k in row_z.size():
		var z := row_z[k]
		_box(dyn, Vector3(cx, 2.85, z), Vector3(sz.x + 0.4, 0.06, 0.4), tray)
		_box(dyn, Vector3(cx, 2.9, z + 0.1), Vector3(sz.x + 0.2, 0.02, 0.02), _emit(Color(1.0, 0.65, 0.2), 1.6, false))
		_box(dyn, Vector3(cx, 2.9, z - 0.1), Vector3(sz.x + 0.2, 0.02, 0.02), _emit(Color(0.3, 0.8, 1.0), 1.6, false))

# ---------- camera & input ----------
func _update_cam() -> void:
	if cam == null: return
	var off := Vector3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * dist
	cam.position = target + off; cam.look_at(target)

func _process(dt: float) -> void:
	_t += dt
	if auto_orbit: yaw += dt * 0.05; _update_cam()
	for i in _pulse_mats.size():
		_pulse_mats[i].emission_energy_multiplier = 1.5 + 0.9 * sin(_t * (1.5 + i * 0.7) + i * 2.0)
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
	var hall: Dictionary = sim.s.halls[hall_i]
	for i in hall.slots:
		var p := slot_pos(i)
		if absf(g.x - p.x) <= RW * 0.5 + 0.1 and absf(g.z - p.z) <= RD * 0.5 + 0.1: return i
	return -1

func _unhandled_input(e: InputEvent) -> void:
	if sim == null: return
	if e is InputEventMouseButton:
		var mb := e as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP: dist = maxf(5.0, dist * 0.9); auto_orbit = false; _update_cam()
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN: dist = minf(70.0, dist * 1.1); auto_orbit = false; _update_cam()
		elif mb.button_index == MOUSE_BUTTON_RIGHT: _drag = (2 if Input.is_key_pressed(KEY_SHIFT) else 1) if mb.pressed else 0
		elif mb.button_index == MOUSE_BUTTON_MIDDLE: _drag = 2 if mb.pressed else 0
		elif mb.button_index == MOUSE_BUTTON_LEFT and mb.pressed:
			var s := _ray_pick(mb.position)
			if s >= 0: slot_clicked.emit(s)
	elif e is InputEventMouseMotion:
		var mm := e as InputEventMouseMotion
		if _drag == 1: yaw -= mm.relative.x * 0.006; pitch = clampf(pitch + mm.relative.y * 0.005, 0.12, 1.45); auto_orbit = false; _update_cam()
		elif _drag == 2: _pan(Vector2(-mm.relative.x, -mm.relative.y) * dist * 0.0016)
		else:
			var s := _ray_pick(mm.position)
			if s != _hover:
				_hover = s
				if s < 0: _hover_mesh.visible = false; hover_changed.emit(-1, {})
				else:
					_hover_mesh.visible = true; _hover_mesh.position = slot_pos(s) + Vector3(0, 0.05, 0)
					var rk := {}
					for rb in _rack_boxes:
						if rb.slot == s: rk = rb.rack
					hover_changed.emit(s, rk)
