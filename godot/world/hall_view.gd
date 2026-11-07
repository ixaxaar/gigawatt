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
var orbit_speed := 0.04
var _drag := 0
var _lpress := Vector2.ZERO
var _lmoved := false
var _lheld := false
var labels_on := true
var _over: Node3D
var _lamps: Array = []
var _hall_ratio := 0.0
var _max_rack_kw := 1.0
var _ml: Dictionary = {}
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
	var ca := CameraAttributesPractical.new(); ca.dof_blur_far_enabled = true; ca.dof_blur_far_distance = 32.0; ca.dof_blur_far_transition = 30.0; ca.dof_blur_amount = 0.04; cam.attributes = ca
	_hover_mesh = MeshInstance3D.new(); add_child(_hover_mesh); _hover_mesh.visible = false
	var bm := BoxMesh.new(); bm.size = Vector3(RW + 0.06, 0.02, RD + 0.06); _hover_mesh.mesh = bm; _hover_mesh.material_override = _emit(Color(0.4, 0.85, 1.0, 0.35), 1.6, true)
	_update_cam()

var _env: Environment
var cover_px := 0.0   # screen pixels covered by a drawer on the right; the hall is re-centred in what's left
var _key: DirectionalLight3D
## Apply Settings.quality: low = no screen-space effects/fog/shadows/MSAA; balanced = SSAO + glow, FXAA;
## high = everything (SSIL, SSR, volumetric fog, 2x MSAA).
func apply_quality() -> void:
	if _env == null: return
	var q := Settings.quality; var fp := RenderingServer.get_current_rendering_method() == "forward_plus"
	_env.ssao_enabled = fp and q >= 1; _env.ssao_intensity = 3.0; _env.ssao_radius = 1.2
	_env.ssil_enabled = fp and q >= 2; _env.ssil_intensity = 1.2
	_env.ssr_enabled = fp and q >= 2; _env.ssr_max_steps = 64; _env.ssr_fade_in = 0.1; _env.ssr_fade_out = 1.5
	_env.volumetric_fog_enabled = fp and q >= 2
	_env.volumetric_fog_density = 0.018; _env.volumetric_fog_albedo = Color(0.55, 0.65, 0.8); _env.volumetric_fog_emission = Color(0.01, 0.015, 0.025); _env.volumetric_fog_length = 48.0; _env.volumetric_fog_anisotropy = 0.5
	_env.glow_enabled = q >= 1
	var vp := get_viewport()
	vp.msaa_3d = Viewport.MSAA_2X if q >= 2 else Viewport.MSAA_DISABLED
	vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA if q == 1 else Viewport.SCREEN_SPACE_AA_DISABLED
	if _key != null: _key.shadow_enabled = q >= 1

func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR; env.background_color = Color(0.008, 0.011, 0.018)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR; env.ambient_light_color = Color(0.36, 0.42, 0.52); env.ambient_light_energy = 0.95
	env.tonemap_mode = Environment.TONE_MAPPER_ACES; env.tonemap_exposure = 1.3; env.tonemap_white = 5.0
	env.glow_enabled = true; env.glow_intensity = 0.7; env.glow_bloom = 0.06; env.glow_hdr_threshold = 1.0; env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SOFTLIGHT
	env.set("glow_levels/3", 1.0); env.set("glow_levels/5", 1.0)
	env.adjustment_enabled = true; env.adjustment_contrast = 1.1; env.adjustment_saturation = 1.05
	_env = env; apply_quality()
	env.fog_enabled = true; env.fog_light_color = Color(0.012, 0.016, 0.026); env.fog_density = 0.012
	var we := WorldEnvironment.new(); we.environment = env; add_child(we)
	var key := DirectionalLight3D.new(); _key = key; key.light_energy = 0.55; key.light_color = Color(0.7, 0.8, 1.0); key.rotation_degrees = Vector3(-62, 28, 0); key.shadow_enabled = Settings.quality >= 1; key.directional_shadow_max_distance = 45.0; key.light_volumetric_fog_energy = 0.0; add_child(key)
	var vg := CanvasLayer.new(); vg.layer = -1; add_child(vg)                                   # screen vignette + faint grain, under the UI
	var rect := ColorRect.new(); rect.set_anchors_preset(Control.PRESET_FULL_RECT); rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sh := Shader.new(); sh.code = "shader_type canvas_item;\nvoid fragment(){ vec2 uv=UV-0.5; float v=smoothstep(0.35,0.95,length(uv*vec2(1.0,0.85))); float g=fract(sin(dot(FRAGCOORD.xy+TIME*30.0,vec2(12.9898,78.233)))*43758.5453)-0.5; COLOR=vec4(0.0,0.005,0.012,v*0.62+abs(g)*0.02); }"
	var sm := ShaderMaterial.new(); sm.shader = sh; rect.material = sm; vg.add_child(rect)

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
	# width steps up with floor size (rarely), so ordinary expansion just adds rows and racks stay put
	var n := int(hall.rackSlots); cols = 10 if n <= 80 else (16 if n <= 240 else 24)
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
	_ml.clear()
	for m in b.q("machineLedger"): _ml[m.id] = m
	for c in dyn.get_children(): c.queue_free()
	_rack_boxes.clear(); _beacon = null; _lamps.clear()
	var hall: Dictionary = b.g.halls[hall_i]
	_layout(hall)
	var sz := hall_size(); var cx := (cols - 1) * PITCH * 0.5; var cz := row_z[row_z.size() - 1] * 0.5
	target = Vector3(cx, 0.9, cz)
	var heat := _heat(hall)
	var cap := minf(hall.coolingKW, hall.itPowerKW)
	var ratio := (heat / cap) if cap > 0.0 else (2.0 if heat > 0 else 0.0)
	_hall_ratio = ratio; _max_rack_kw = 1.0
	for d in _rs.values(): _max_rack_kw = maxf(_max_rack_kw, d.get("kW", 0.0))
	_build_shell(hall, sz, cx, cz)
	_build_aisles(sz, cx, ratio)
	var occupied := {}
	for r in hall.racks: occupied[int(r.slot)] = r
	for i in int(hall.rackSlots):
		var p := slot_pos(i)
		if occupied.has(i): _build_rack(i, p, occupied[i]); _rack_label(p, occupied[i])
		else: _build_slot(i, p)
	_build_plant(hall, sz, cx, cz)
	_over = Node3D.new(); dyn.add_child(_over); _build_overhead(sz, cx, _over)
	_build_cables(hall)
	if ratio > 1.0 and heat > 0.0:
		_beacon = OmniLight3D.new(); _beacon.light_color = Color(1, 0.1, 0.05); _beacon.omni_range = 14.0; _beacon.position = Vector3(cx, 3.8, cz); dyn.add_child(_beacon)
	_update_cam()

func _build_shell(hall: Dictionary, sz: Vector2, cx: float, cz: float) -> void:
	var fw := sz.x + 60.0; var fd := sz.y + 60.0
	var fm := MeshInstance3D.new(); var pm := PlaneMesh.new(); pm.size = Vector2(fw, fd); fm.mesh = pm; fm.position = Vector3(cx, 0, cz)
	var sm := ShaderMaterial.new(); sm.shader = FLOOR_SHADER; sm.set_shader_parameter("area", Vector2(fw, fd)); sm.set_shader_parameter("center", Vector2(0.0, 0.0)); sm.set_shader_parameter("fade", Vector2(sz.x * 0.5 + 6.0, 16.0)); fm.material_override = sm; dyn.add_child(fm)
	var red := _emit(Color(0.9, 0.08, 0.06), 1.1, false)
	var m := 0.7; var lw := 0.12                                                                  # painted red boundary line
	var x0 := cx - sz.x * 0.5 - m; var x1 := cx + sz.x * 0.5 + m; var z0 := cz - sz.y * 0.5 - m; var z1 := cz + sz.y * 0.5 + m
	_box(dyn, Vector3(cx, 0.004, z0), Vector3(x1 - x0, 0.008, lw), red)
	_box(dyn, Vector3(cx, 0.004, z1), Vector3(x1 - x0, 0.008, lw), red)
	_box(dyn, Vector3(x0, 0.004, cz), Vector3(lw, 0.008, z1 - z0), red)
	_box(dyn, Vector3(x1, 0.004, cz), Vector3(lw, 0.008, z1 - z0), red)

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
			for lx in range(0, cols, 3):
				var sp := SpotLight3D.new(); sp.light_color = Color(0.78, 0.9, 1.0); sp.light_energy = 5.0; sp.spot_range = 6.5; sp.spot_angle = 52.0; sp.spot_angle_attenuation = 0.8; sp.light_volumetric_fog_energy = 1.4
				sp.position = Vector3(lx * PITCH + 0.6, 3.4, mid); sp.rotation_degrees = Vector3(-90, 0, 0); _lamps.append(sp); dyn.add_child(sp)
		else:
			if ratio > 0.01: _box(dyn, Vector3(cx, 0.006, mid), Vector3(w, 0.004, d), _emit(Color(1.0, 0.25, 0.1, 0.05 + 0.1 * clampf(ratio, 0, 1.5)), 1.0, true))
			for lx2 in range(1, cols, 4):
				var sp2 := SpotLight3D.new(); sp2.light_color = Color(1.0, 0.72, 0.5); sp2.light_energy = 1.6 + 2.0 * ratio; sp2.spot_range = 6.0; sp2.spot_angle = 50.0; sp2.light_volumetric_fog_energy = 0.8
				sp2.position = Vector3(lx2 * PITCH + 0.6, 3.4, mid); sp2.rotation_degrees = Vector3(-90, 0, 0); _lamps.append(sp2); dyn.add_child(sp2)

## Flat text on top of each rack: hardware type, and whether it is earning, idle, on spot, building or down.
## Idle online racks also get an amber plate on top, so money-losing capacity stands out from a screenshot.
func _rack_label(p: Vector3, r: Dictionary) -> void:
	if not labels_on: return
	var m: Dictionary = _ml.get(r.id, {})
	if m.is_empty(): return
	var nm: String = str(m.design).split(" · ")[0].replace("HGX ", "").replace(" 8-GPU", "x8").replace("NVIDIA ", "")
	if nm.length() > 11: nm = nm.substr(0, 10) + "…"
	var role: String = str(m.role); var status: String = str(m.status)
	var who := ""; var col := Color(0.75, 0.8, 0.85); var idle := false
	if m.get("customer") != null:
		who = str(m.customer); col = Color(0.55, 1.0, 0.7)
		if who.length() > 11: who = who.substr(0, 10) + "…"
	elif status == "failed": who = "DOWN"; col = Color(1.0, 0.45, 0.4)
	elif status != "online": who = "BURN-IN" if status == "commissioning" else "BUILDING"; col = Color(0.6, 0.7, 0.8)
	elif role == "spot market": who = "SPOT"; col = Color(0.4, 0.85, 1.0)
	else: who = "IDLE"; col = Color(1.0, 0.7, 0.2); idle = true
	var l := Label3D.new(); l.text = nm + "\n" + who; l.font_size = 44; l.pixel_size = 0.0034; l.modulate = col; l.outline_size = 12; l.outline_modulate = Color(0, 0, 0, 0.92)
	l.rotation = Vector3(-PI / 2, PI / 2, 0); l.position = p + Vector3(0, RH + 0.25, 0); l.no_depth_test = true; l.shaded = false; l.double_sided = true; l.line_spacing = -4
	dyn.add_child(l)
	if idle: _box(dyn, p + Vector3(0, RH + 0.06, 0), Vector3(RW - 0.08, 0.012, RD - 0.08), _emit(Color(1.0, 0.55, 0.1, 0.4), 1.3, true))

## Controller camera: left stick pans, right stick orbits, triggers zoom.
func pad_move(pan: Vector2, orbit: Vector2, zoom: float, dt: float) -> void:
	if pan == Vector2.ZERO and orbit == Vector2.ZERO and zoom == 0.0: return
	auto_orbit = false
	if pan != Vector2.ZERO: _pan(pan * dt * dist * 0.9)
	if orbit != Vector2.ZERO: yaw -= orbit.x * dt * 1.8; pitch = clampf(pitch + orbit.y * dt * 1.2, 0.03, 1.45)
	if zoom != 0.0: dist = clampf(dist * (1.0 - zoom * dt * 1.4), 2.5, 60.0)
	_update_cam()

func set_cover(px: float) -> void:
	cover_px = px; _update_cam()

## Camera straight down, whole hall in frame.
func top_view() -> void:
	var sz := hall_size(); yaw = 0.0; pitch = 1.45; auto_orbit = false
	var cx := (cols - 1) * PITCH * 0.5; var cz := row_z[row_z.size() - 1] * 0.5
	target = Vector3(cx, 0.0, cz); dist = clampf(maxf(sz.x * 0.6, sz.y * 1.25) + 4.0, 6.0, 55.0); _update_cam()

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
		var shell := _solid(Color(0.085, 0.09, 0.1), 0.45, 0.8)
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
	if st != "ordered": _thermal_dots(parent, r, st)
	var ci := _cluster_of(r)
	if not ci.is_empty() and st != "ordered":
		var cc: Color = ci.color
		for sx in [-1, 1]: _box(parent, Vector3(sx * (RW * 0.5 - 0.03), RH + 0.03, 0), Vector3(0.045, 0.035, RD - 0.04), _emit(cc, 1.3, false))   # cluster-coloured edge rails (the top stays dark for the label)
		_box(parent, Vector3(0, 0.006, RD * 0.5 + 0.22), Vector3(RW - 0.06, 0.008, 0.16), _emit(cc, 1.4, false))    # floor tag, front
		_box(parent, Vector3(0, 0.006, -RD * 0.5 - 0.22), Vector3(RW - 0.06, 0.008, 0.16), _emit(cc, 1.4, false))   # floor tag, rear
	_rack_boxes.append({"slot": i, "aabb": AABB(p + Vector3(-RW * 0.5, 0, -RD * 0.5), Vector3(RW, RH, RD)), "rack": r})

## Four dots on the front edge of the rack top: how hard this rack is running against what the hall can cool.
## green = fine, amber = hall near its limit, red = overloaded or failed; unlit dots are headroom.
func _thermal_dots(parent: Node3D, r: Dictionary, st: String) -> void:
	var kw: float = _rs.get(r.designId, {}).get("kW", 0.0)
	var lit := clampi(int(ceil(4.0 * kw / maxf(1.0, _max_rack_kw))), 1, 4) if st == "online" else (4 if st == "failed" else 0)
	var col := Color(0.25, 1.0, 0.5)
	if st == "failed": col = Color(1.0, 0.2, 0.15)
	elif st == "installing" or st == "commissioning": col = Color(0.5, 0.6, 0.7)
	elif _hall_ratio >= 1.0: col = Color(1.0, 0.2, 0.15)
	elif _hall_ratio >= 0.8: col = Color(1.0, 0.75, 0.2)
	for k in 4:
		var on := k < lit
		_box(parent, Vector3(-0.2 + k * 0.133, RH + 0.05, RD * 0.5 - 0.075), Vector3(0.085, 0.02, 0.085), _emit(col, 0.9, false) if on else _solid(Color(0.06, 0.07, 0.08), 0.8, 0.0))

## Cluster + customer that a placed rack belongs to ({} if unclustered). Colour is stable per cluster id.
func _cluster_of(r: Dictionary) -> Dictionary:
	var cid = r.get("clusterId")
	if cid == null or cid == "": return {}
	var nm := str(cid)
	for k in b.g.clusters.size():
		if b.g.clusters[k].id == cid: nm = b.g.clusters[k].name
	var cust := ""
	for a in b.g.activeContracts:
		if a.clusterIds.has(cid): cust = (cust + ", " if cust != "" else "") + str(a.contract.customer)
	return {"id": cid, "name": nm, "customer": cust, "color": Kit.cluster_color(b.g, cid)}

func cluster_info(r: Dictionary) -> Dictionary: return _cluster_of(r)

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

## Overhead scale-out cabling: each cluster's racks are strung together by a coloured run above the cable trays.
func _build_cables(hall: Dictionary) -> void:
	if hall.racks.size() > 300 or hall.racks.size() < 2: return
	var by := {}
	for r in hall.racks:
		var cid = r.get("clusterId")
		if cid == null or cid == "" or r.status == "ordered": continue
		if not by.has(cid): by[cid] = []
		by[cid].append(int(r.slot))
	var n := 0
	for cid in by:
		var slots: Array = by[cid]; slots.sort()
		if slots.size() < 2: continue
		var col: Color = Kit.cluster_color(b.g, cid); var mat := _emit(col, 1.8, false); var y := 2.8 + float(n % 3) * 0.07; n += 1
		for k in slots.size():
			var p := slot_pos(slots[k])
			_cyl(dyn, Vector3(p.x, (RH + y) * 0.5, p.z), 0.03, y - RH, mat, "y")
			if k == 0: continue
			var q := slot_pos(slots[k - 1])
			if absf(p.z - q.z) < 0.01: _cyl(dyn, Vector3((p.x + q.x) * 0.5, y, p.z), 0.03, absf(p.x - q.x), mat, "x")
			else:
				_cyl(dyn, Vector3(q.x, y, (p.z + q.z) * 0.5), 0.03, absf(p.z - q.z), mat, "z")
				_cyl(dyn, Vector3((p.x + q.x) * 0.5, y, p.z), 0.03, absf(p.x - q.x), mat, "x")

func _build_overhead(sz: Vector2, cx: float, ov: Node3D) -> void:
	var tray := _solid(Color(0.32, 0.33, 0.36), 0.4, 0.85)
	var bus := _solid(Color(0.62, 0.63, 0.65), 0.4, 0.7)
	for k in row_z.size():
		var z := row_z[k]
		_box(ov, Vector3(cx, 2.55, z - 0.18), Vector3(sz.x + 0.5, 0.03, 0.3), tray)
		for sd in [-0.31, -0.05]: _box(ov, Vector3(cx, 2.6, z - 0.18 + sd * -1.0 * 0.0 + (sd + 0.18)), Vector3(sz.x + 0.5, 0.06, 0.012), tray)   # tray rails
		for cc in 3: _cyl(ov, Vector3(cx, 2.63, z - 0.26 + cc * 0.07), 0.028, sz.x + 0.4, _solid([Color(0.03, 0.03, 0.035), Color(0.1, 0.12, 0.3), Color(0.03, 0.03, 0.035)][cc], 0.6, 0.0), "x")   # cable bundles                                                          # wire-basket tray (copper)
		_box(ov, Vector3(cx, 2.6, z - 0.18), Vector3(sz.x + 0.4, 0.05, 0.12), _solid(Color(0.02, 0.02, 0.025), 0.9, 0.0))
		_box(ov, Vector3(cx, 2.55, z + 0.22), Vector3(sz.x + 0.5, 0.04, 0.22), tray)                                                         # fibre tray
		_box(ov, Vector3(cx, 2.6, z + 0.22), Vector3(sz.x + 0.4, 0.04, 0.09), _solid(Color(0.9, 0.72, 0.1), 0.6, 0.0))
		_box(ov, Vector3(cx, 2.85, z), Vector3(sz.x + 0.5, 0.14, 0.22), bus)                                                                 # busway
		for j in range(0, cols, 2):
			_box(ov, Vector3(j * PITCH + 0.3, 2.72, z), Vector3(0.22, 0.12, 0.2), _solid(Color(0.2, 0.2, 0.22), 0.5, 0.6))
			_box(ov, Vector3(j * PITCH + 0.3, 2.72, z + 0.101), Vector3(0.03, 0.03, 0.005), _emit(Color(0.2, 1.0, 0.4), 2.0, false))
	for k in range(0, row_z.size() - 1):
		var mid := (row_z[k] + row_z[k + 1]) * 0.5
		for lx in range(0, cols, 3):
			_box(ov, Vector3(lx * PITCH + 0.6, 3.45, mid), Vector3(1.2, 0.025, 0.07), _emit(Color(0.85, 0.93, 1.0), 3.5, false))

# ---------- camera & input ----------
func _update_cam() -> void:
	if cam == null: return
	var off := Vector3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * dist
	cam.position = target + off; cam.look_at(target)
	var vh := maxf(1.0, get_viewport().get_visible_rect().size.y)
	cam.h_offset = cover_px * 0.5 * (2.0 * dist * tan(deg_to_rad(cam.fov * 0.5)) / vh)
	if _over != null and is_instance_valid(_over): _over.visible = pitch < 1.0
	for l in _lamps:
		if is_instance_valid(l): l.visible = pitch < 1.0

func _process(dt: float) -> void:
	_t += dt
	if auto_orbit and not Settings.reduced_motion: yaw += dt * orbit_speed; _update_cam()
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
		if (mb.pressed or mb.button_index == MOUSE_BUTTON_WHEEL_UP or mb.button_index == MOUSE_BUTTON_WHEEL_DOWN) and Kit.over_ui(self): return
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP: dist = maxf(2.5, dist * 0.9); auto_orbit = false; _update_cam()
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN: dist = minf(60.0, dist * 1.1); auto_orbit = false; _update_cam()
		elif mb.button_index == MOUSE_BUTTON_RIGHT: _drag = (2 if Input.is_key_pressed(KEY_SHIFT) else 1) if mb.pressed else 0
		elif mb.button_index == MOUSE_BUTTON_MIDDLE: _drag = 2 if mb.pressed else 0
		elif mb.button_index == MOUSE_BUTTON_LEFT:
			if mb.pressed: _lpress = mb.position; _lmoved = false; _lheld = true
			else:
				_lheld = false
				if not _lmoved:
					var s := _ray_pick(mb.position)
					if s >= 0: slot_clicked.emit(s)
	elif e is InputEventMouseMotion:
		var mm := e as InputEventMouseMotion
		if _lheld and not _lmoved and mm.position.distance_to(_lpress) > 6.0: _lmoved = true
		if _lheld and _lmoved: auto_orbit = false; _pan(Vector2(-mm.relative.x, -mm.relative.y) * dist * 0.0016)
		elif _drag == 1: yaw -= mm.relative.x * 0.006; pitch = clampf(pitch + mm.relative.y * 0.005, 0.03, 1.45); auto_orbit = false; _update_cam()
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
