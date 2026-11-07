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
var _mesh_cache := {}
var _emit_cache := {}
var _glass_cache := {}
var _face_mat: ShaderMaterial
var _plat := {}          # design id -> platform name (computed once per rebuild)
var _clusters := {}      # cluster id -> {id, name, customer, color, slots, centre}
var _labels: Array = []  # [{node, always}] rack-top labels; shown only when the camera is close (or the rack needs attention)
var _boards: Array = []  # cluster billboards, shown when zoomed out
var _walls: Array = []   # [{node, axis, at}] hall walls; the ones between camera and hall are hidden
var _lamp_n := 0
var _slot_box := {}
var _grain_mat: ShaderMaterial

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
## Apply the active graphics tier (Settings.tier()): render scale, AA, shadows, screen-space effects, lights, fog.
func apply_quality() -> void:
	if _env == null: return
	var t := Settings.tier()
	_env.ssao_enabled = t.ssao; _env.ssao_intensity = 3.0; _env.ssao_radius = 1.2
	_env.ssil_enabled = t.ssil; _env.ssil_intensity = 1.2
	_env.ssr_enabled = t.ssr; _env.ssr_max_steps = 64; _env.ssr_fade_in = 0.1; _env.ssr_fade_out = 1.5
	_env.volumetric_fog_enabled = t.fog
	_env.volumetric_fog_density = 0.018; _env.volumetric_fog_albedo = Color(0.55, 0.65, 0.8); _env.volumetric_fog_emission = Color(0.01, 0.015, 0.025); _env.volumetric_fog_length = 48.0; _env.volumetric_fog_anisotropy = 0.5
	_env.glow_enabled = t.glow
	var vp := get_viewport()
	vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR if t.scale < 0.99 else Viewport.SCALING_3D_MODE_BILINEAR
	vp.scaling_3d_scale = t.scale
	vp.msaa_3d = Viewport.MSAA_4X if t.aa == "msaa4" else (Viewport.MSAA_2X if t.aa == "msaa2" else Viewport.MSAA_DISABLED)
	vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA if t.aa == "fxaa" else Viewport.SCREEN_SPACE_AA_DISABLED
	vp.use_taa = t.aa == "msaa4" and not Settings.compat
	if _key != null: _key.shadow_enabled = t.shadows; _key.directional_shadow_max_distance = 45.0
	RenderingServer.directional_shadow_atlas_set_size(int(t.shadow_size), true)
	if _grain_mat != null: _grain_mat.set_shader_parameter("animated", t.grain_anim)
	if _face_mat != null: _face_mat.set_shader_parameter("lod", int(t.face_lod))
	Settings.apply_fps()
	HallMaterials.reset()
	if b != null and dyn != null: rebuild()

func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR; env.background_color = Color(0.008, 0.011, 0.018)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR; env.ambient_light_color = Color(0.36, 0.42, 0.52); env.ambient_light_energy = 0.9
	var sky_m := ProceduralSkyMaterial.new(); sky_m.sky_top_color = Color(0.1, 0.14, 0.2); sky_m.sky_horizon_color = Color(0.45, 0.52, 0.62); sky_m.ground_horizon_color = Color(0.32, 0.36, 0.42); sky_m.ground_bottom_color = Color(0.05, 0.06, 0.08); sky_m.sun_angle_max = 0.0
	var sky := Sky.new(); sky.sky_material = sky_m; sky.radiance_size = Sky.RADIANCE_SIZE_64; env.sky = sky; env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_ACES; env.tonemap_exposure = 1.3; env.tonemap_white = 5.0
	env.glow_enabled = true; env.glow_intensity = 0.7; env.glow_bloom = 0.06; env.glow_hdr_threshold = 1.0; env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SOFTLIGHT
	env.set("glow_levels/3", 1.0); env.set("glow_levels/5", 1.0)
	env.adjustment_enabled = true; env.adjustment_contrast = 1.1; env.adjustment_saturation = 1.05
	_env = env; apply_quality()
	env.fog_enabled = true; env.fog_light_color = Color(0.012, 0.016, 0.026); env.fog_density = 0.012
	var we := WorldEnvironment.new(); we.environment = env; add_child(we)
	var key := DirectionalLight3D.new(); _key = key; key.light_energy = 0.55; key.light_color = Color(0.7, 0.8, 1.0); key.rotation_degrees = Vector3(-62, 28, 0); key.shadow_enabled = Settings.tier().shadows; key.directional_shadow_max_distance = 45.0; key.light_volumetric_fog_energy = 0.0; add_child(key)
	var vg := CanvasLayer.new(); vg.layer = -1; add_child(vg)                                   # screen vignette + faint grain, under the UI
	var rect := ColorRect.new(); rect.set_anchors_preset(Control.PRESET_FULL_RECT); rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sh := Shader.new(); sh.code = "shader_type canvas_item;\nuniform bool animated = true;\nvoid fragment(){ vec2 uv=UV-0.5; float v=smoothstep(0.35,0.95,length(uv*vec2(1.0,0.85))); float g=fract(sin(dot(FRAGCOORD.xy+(animated?TIME*30.0:0.0),vec2(12.9898,78.233)))*43758.5453)-0.5; COLOR=vec4(0.0,0.005,0.012,v*0.62+(animated?abs(g)*0.02:0.0)); }"
	var sm := ShaderMaterial.new(); sm.shader = sh; rect.material = sm; vg.add_child(rect); _grain_mat = sm

func _emit(c: Color, energy: float, alpha: bool) -> StandardMaterial3D:
	var key := "%s|%s|%s" % [c.to_html(true), energy, alpha]
	if _emit_cache.has(key): return _emit_cache[key]
	var m := StandardMaterial3D.new(); m.albedo_color = c; m.emission_enabled = true; m.emission = Color(c.r, c.g, c.b); m.emission_energy_multiplier = energy
	if alpha: m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_emit_cache[key] = m; return m

func _solid(c: Color, rough := 0.5, metal := 0.3) -> StandardMaterial3D:
	var key := "%s%s%s" % [c.to_html(), rough, metal]
	if _mat_cache.has(key): return _mat_cache[key]
	var m := StandardMaterial3D.new(); m.albedo_color = c; m.roughness = rough; m.metallic = metal; _mat_cache[key] = m; return m

## Textured PBR material from the library (shell | steel | alu | plate | wall | rubber).
func _pbr(name: String, per_m := 1.0, tint := Color.WHITE, rough := 1.0, metal := 1.0) -> StandardMaterial3D:
	return HallMaterials.get_mat(name, per_m, tint, rough, metal)

func _glass(c: Color) -> StandardMaterial3D:
	var key := c.to_html(true)
	if _glass_cache.has(key): return _glass_cache[key]
	var m := StandardMaterial3D.new(); m.albedo_color = c; m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; m.roughness = 0.08; m.metallic = 0.0; m.cull_mode = BaseMaterial3D.CULL_DISABLED; _glass_cache[key] = m; return m

func _box(parent: Node3D, pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new(); var k := Vector3i(roundi(size.x * 1000.0), roundi(size.y * 1000.0), roundi(size.z * 1000.0))
	var bm: BoxMesh = _mesh_cache.get(k)
	if bm == null: bm = BoxMesh.new(); bm.size = size; _mesh_cache[k] = bm
	mi.mesh = bm; mi.material_override = mat; mi.position = pos; parent.add_child(mi); return mi

func _cyl(parent: Node3D, pos: Vector3, r: float, len_: float, mat: Material, axis := "z") -> MeshInstance3D:
	var mi := MeshInstance3D.new(); var k := Vector3i(roundi(r * 1000.0), roundi(len_ * 100.0), -1)
	var cm: CylinderMesh = _mesh_cache.get(k)
	if cm == null: cm = CylinderMesh.new(); cm.top_radius = r; cm.bottom_radius = r; cm.height = len_; cm.radial_segments = 12; _mesh_cache[k] = cm
	mi.mesh = cm; mi.material_override = mat; mi.position = pos
	if axis == "z": mi.rotation_degrees = Vector3(90, 0, 0)
	elif axis == "x": mi.rotation_degrees = Vector3(0, 0, 90)
	parent.add_child(mi); return mi

## Small props vanish with distance (thermal dots, taps, bundles): fewer draws in big halls, scaled by the tier.
func _small(mi: GeometryInstance3D, metres: float) -> GeometryInstance3D:
	mi.visibility_range_end = metres * float(Settings.tier().vis_scale); mi.visibility_range_end_margin = 2.0; mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; return mi

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
	_rack_boxes.clear(); _slot_box.clear(); _beacon = null; _lamps.clear(); _labels.clear(); _boards.clear(); _walls.clear(); _lamp_n = 0; _emit_cache.clear()
	_ensure_face_mat()
	var hall: Dictionary = b.g.halls[hall_i]
	_index_platforms(); _index_clusters()
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
	_build_walls(hall)
	_build_boards()
	_over = Node3D.new(); dyn.add_child(_over); _build_overhead(sz, cx, _over)
	_build_cables(hall)
	if ratio > 1.0 and heat > 0.0:
		_beacon = OmniLight3D.new(); _beacon.light_color = Color(1, 0.1, 0.05); _beacon.omni_range = 14.0; _beacon.position = Vector3(cx, 3.8, cz); dyn.add_child(_beacon)
	_update_cam()

func _build_shell(hall: Dictionary, sz: Vector2, cx: float, cz: float) -> void:
	var fw := sz.x + 60.0; var fd := sz.y + 60.0
	var fm := MeshInstance3D.new(); var pm := PlaneMesh.new(); pm.size = Vector2(fw, fd); fm.mesh = pm; fm.position = Vector3(cx, 0, cz)
	var sm := ShaderMaterial.new(); sm.shader = FLOOR_SHADER; sm.set_shader_parameter("area", Vector2(fw, fd)); sm.set_shader_parameter("center", Vector2(0.0, 0.0)); sm.set_shader_parameter("fade", Vector2(sz.x * 0.5 + 6.0, 16.0)); _floor_tex(sm); fm.material_override = sm; dyn.add_child(fm)
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
			var sm := ShaderMaterial.new(); sm.shader = FLOOR_SHADER; sm.set_shader_parameter("area", Vector2(w, d)); sm.set_shader_parameter("perf_rect", Vector4(-1000, -1000, 1000, 1000)); _floor_tex(sm); pf.material_override = sm; dyn.add_child(pf)
			# containment: glass roof + end doors + frame
			_box(dyn, Vector3(cx, 2.12, mid), Vector3(w, 0.03, d), _glass(Color(0.6, 0.75, 0.9, 0.07)))
			for ex in [-0.33, (cols - 1) * PITCH + 0.33]:
				_box(dyn, Vector3(ex, 1.06, mid), Vector3(0.03, 2.1, d), _glass(Color(0.6, 0.75, 0.9, 0.08)))
				_box(dyn, Vector3(ex, 1.06, mid), Vector3(0.05, 2.12, 0.06), _solid(Color(0.05, 0.05, 0.06), 0.4, 0.8))
			for lx in range(0, cols, 3):
				if not _lamp_ok(): _light_pool(Vector3(lx * PITCH + 0.6, 0.006, mid), d, Color(0.78, 0.9, 1.0, 0.07)); continue
				var sp := SpotLight3D.new(); sp.light_color = Color(0.78, 0.9, 1.0); sp.light_energy = 5.0; sp.spot_range = 6.5; sp.spot_angle = 52.0; sp.spot_angle_attenuation = 0.8; sp.light_volumetric_fog_energy = 1.4
				sp.position = Vector3(lx * PITCH + 0.6, 3.4, mid); sp.rotation_degrees = Vector3(-90, 0, 0); _lamps.append(sp); dyn.add_child(sp)
		else:
			if ratio > 0.01: _box(dyn, Vector3(cx, 0.006, mid), Vector3(w, 0.004, d), _emit(Color(1.0, 0.25, 0.1, 0.05 + 0.1 * clampf(ratio, 0, 1.5)), 1.0, true))
			for lx2 in range(1, cols, 4):
				if not _lamp_ok(): _light_pool(Vector3(lx2 * PITCH + 0.6, 0.006, mid), d, Color(1.0, 0.72, 0.5, 0.05)); continue
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
	l.rotation = Vector3(-PI / 2, PI / 2, 0); l.position = p + Vector3(0, RH + 0.25, 0); l.shaded = false; l.double_sided = true; l.line_spacing = -4
	dyn.add_child(l); _labels.append({"node": l, "always": idle or status == "failed"})
	l.visible = _labels_show()
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
	if Settings.tier().shadows: _box(parent, Vector3(0, 0.002, 0), Vector3(RW + 0.04, 0.004, RD + 0.04), _emit(Color(0, 0, 0, 0.45), 0.0, true))   # contact shadow
	if st == "installing" or st == "ordered":
		_box(parent, Vector3(0, 0.08, 0), Vector3(0.7, 0.16, 1.2), _solid(Color(0.45, 0.32, 0.18), 0.9, 0.0))              # pallet
		_box(parent, Vector3(0, 0.95, 0), Vector3(0.62, 1.55, 1.05), _solid(Color(0.62, 0.5, 0.33), 0.95, 0.0))             # carton
		_box(parent, Vector3(0, 0.95, 0), Vector3(0.64, 1.58, 1.07), _glass(Color(0.85, 0.9, 1.0, 0.13)))                   # stretch wrap
		_box(parent, Vector3(0, 1.4, 0.54), Vector3(0.3, 0.1, 0.005), _solid(Color(0.9, 0.9, 0.85), 0.9, 0.0))              # shipping label
	else:
		var shell := _pbr("shell", 0.9, Color(2.6, 2.6, 2.8), 0.85, 0.8)
		_box(parent, Vector3(0, RH * 0.5, 0), Vector3(RW - 0.004, RH, RD - 0.05), shell)
		_box(parent, Vector3(0, RH + 0.01, 0), Vector3(RW - 0.004, 0.02, RD - 0.03), _pbr("steel", 1.1, Color(1.1, 1.1, 1.2)))
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
		(_clusters[ci.id].slots as Array).append(i)
		var cc: Color = ci.color
		for sx in [-1, 1]: _box(parent, Vector3(sx * (RW * 0.5 - 0.03), RH + 0.03, 0), Vector3(0.045, 0.035, RD - 0.04), _emit(cc, 1.3, false))   # cluster-coloured edge rails (the top stays dark for the label)
		_box(parent, Vector3(0, 0.006, RD * 0.5 + 0.22), Vector3(RW - 0.06, 0.008, 0.16), _emit(cc, 1.4, false))    # floor tag, front
		_box(parent, Vector3(0, 0.006, -RD * 0.5 - 0.22), Vector3(RW - 0.06, 0.008, 0.16), _emit(cc, 1.4, false))   # floor tag, rear
	_rack_boxes.append({"slot": i, "aabb": AABB(p + Vector3(-RW * 0.5, 0, -RD * 0.5), Vector3(RW, RH, RD)), "rack": r}); _slot_box[i] = _rack_boxes[_rack_boxes.size() - 1]

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
		_small(_box(parent, Vector3(-0.2 + k * 0.133, RH + 0.05, RD * 0.5 - 0.075), Vector3(0.085, 0.02, 0.085), _emit(col, 0.9, false) if on else _solid(Color(0.06, 0.07, 0.08), 0.8, 0.0)), 22.0)

## Cluster + customer that a placed rack belongs to ({} if unclustered). Colour is stable per cluster id.
func _cluster_of(r: Dictionary) -> Dictionary:
	var cid = r.get("clusterId")
	if cid == null or cid == "": return {}
	return _clusters.get(cid, {})

func _index_clusters() -> void:
	_clusters.clear()
	var cust := {}
	for a in b.g.activeContracts:
		for cid in a.clusterIds: cust[cid] = (str(cust[cid]) + ", " if cust.has(cid) else "") + str(a.contract.customer)
	for c in b.g.clusters:
		_clusters[c.id] = {"id": c.id, "name": str(c.name), "customer": str(cust.get(c.id, "")), "color": Kit.cluster_color(b.g, c.id), "slots": []}

func _index_platforms() -> void:
	_plat.clear()
	var tray_chassis := {}
	for tr in b.g.trays: tray_chassis[tr.id] = str(tr.chassisId)
	for d in b.g.racks:
		var plat := "nvidia"
		for it in d.items:
			if it.type == "tray" and tray_chassis.has(it.trayId):
				var cid: String = tray_chassis[it.trayId]
				plat = "Galaxy" if cid.begins_with("tt") else ("CS-3" if cid.begins_with("cb") else ("Gaudi" if cid.begins_with("int") else ("MI3" if (cid.contains("mi") or cid.begins_with("gig") or cid.begins_with("sm-ubb")) else "nvidia")))
		_plat[d.id] = plat

func cluster_info(r: Dictionary) -> Dictionary: return _cluster_of(r)

func _heat(hall: Dictionary) -> float:
	var kw := 0.0
	for r in hall.racks:
		if r.status == "online" or r.status == "commissioning": kw += _rs.get(r.designId, {}).get("kW", 0.0)
	return kw

func _sysinfo(design_id: String) -> Dictionary:
	var st: Dictionary = _rs.get(design_id, {})
	return {"kW": st.get("kW", 10.0), "accels": st.get("accels", 8), "platform": _plat.get(design_id, "nvidia")}

var _face_quad: QuadMesh
func _ensure_face_mat() -> void:
	if _face_mat == null:
		_face_mat = ShaderMaterial.new(); _face_mat.shader = RACK_SHADER
		_face_quad = QuadMesh.new(); _face_quad.size = Vector2(RW - 0.03, 1.87)
	_face_mat.set_shader_parameter("lod", int(Settings.tier().face_lod))

func _face(i: int, sy: Dictionary, st: String, rear: bool) -> MeshInstance3D:
	var mi := MeshInstance3D.new(); mi.mesh = _face_quad; mi.material_override = _face_mat
	mi.set_instance_shader_parameter("seed", float(i * 7 + 3)); mi.set_instance_shader_parameter("fill", clampf(0.4 + float(sy.kW) / 80.0, 0.4, 1.0))
	var c := _vendor_color(sy); mi.set_instance_shader_parameter("accent", Vector3(c.r, c.g, c.b))
	mi.set_instance_shader_parameter("state", 0 if st == "online" else (1 if st == "commissioning" else 2)); mi.set_instance_shader_parameter("rear", rear)
	mi.set_instance_shader_parameter("heat", clampf(float(sy.kW) / 60.0, 0.0, 1.0) if thermal and st == "online" else -1.0)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi

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
				var body := _pbr("steel", 0.7, Color(0.7, 0.85, 1.25)) if liquid else _pbr("alu", 0.7, Color(1.25, 1.25, 1.3))
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
				_box(dyn, pos2 + Vector3(0, tall * 0.5, 0), Vector3(0.85, tall, 0.9), _pbr("shell", 0.9, Color(1.9, 1.9, 2.0)))
				_box(dyn, pos2 + Vector3(0, tall * 0.5, 0.455), Vector3(0.72, tall - 0.2, 0.012), _pbr("steel", 0.9, Color(1.4, 1.4, 1.5)))     # door panel
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
	var tray := _pbr("plate", 1.3, Color(1.0, 1.0, 1.05))
	var bus := _pbr("alu", 1.0, Color(1.1, 1.1, 1.15))
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
			_small(_box(ov, Vector3(j * PITCH + 0.3, 2.72, z), Vector3(0.22, 0.12, 0.2), _pbr("steel", 1.5, Color(1.2, 1.2, 1.3))), 24.0)
			_small(_box(ov, Vector3(j * PITCH + 0.3, 2.72, z + 0.101), Vector3(0.03, 0.03, 0.005), _emit(Color(0.2, 1.0, 0.4), 2.0, false)), 18.0)
	for k in range(0, row_z.size() - 1):
		var mid := (row_z[k] + row_z[k + 1]) * 0.5
		for lx in range(0, cols, 3):
			_box(ov, Vector3(lx * PITCH + 0.6, 3.45, mid), Vector3(1.2, 0.025, 0.07), _emit(Color(0.85, 0.93, 1.0), 3.5, false))

func _floor_tex(sm: ShaderMaterial) -> void:
	var ft := HallMaterials.floor_textures()
	sm.set_shader_parameter("use_tex", ft.c != null)
	if ft.c != null: sm.set_shader_parameter("tex_c", ft.c); sm.set_shader_parameter("tex_r", ft.r)
	sm.set_shader_parameter("use_normal", ft.n != null)
	if ft.n != null: sm.set_shader_parameter("tex_n", ft.n)

var _lamp_stride := 1
func _lamp_ok() -> bool:
	var budget := int(Settings.tier().lights)
	_lamp_n += 1
	if budget <= 0: return false
	if budget >= 999: return true
	# spread the budget evenly over the hall: roughly one lamp every `stride` candidates
	var total := maxi(1, (row_z.size() - 1) * (cols / 3) )
	var stride := maxi(1, ceili(float(total) / float(budget)))
	return (_lamp_n - 1) % stride == 0

## Potato tier: a soft pool of light painted on the floor instead of a real spotlight.
func _light_pool(p: Vector3, d: float, col: Color) -> void:
	if int(Settings.tier().lights) >= 8 and _lamp_n % 2 == 0: return
	_box(dyn, p, Vector3(1.8, 0.003, maxf(1.0, d * 0.8)), _emit(col, 1.0, true))

## Four painted-block walls around the hall and plant; the ones between the camera and the hall are hidden in _update_cam.
func _build_walls(hall: Dictionary) -> void:
	var n_cool := 0; var n_pow := 0
	for id in hall.coolingEquip: n_cool += mini(int(hall.coolingEquip[id]), 8)
	for id in hall.powerEquip: n_pow += mini(int(hall.powerEquip[id]), 8)
	var cxm := (cols - 1) * PITCH * 0.5
	var x0 := -5.8; var x1 := maxf((cols - 1) * PITCH + 3.0, cxm - 3.0 + n_pow * 0.9 + 2.0)
	var z0 := -5.8; var z1 := maxf(row_z[row_z.size() - 1] + RD * 0.5 + 3.0, 0.3 + n_cool * 1.15 + 1.6)
	var wall := _pbr("wall", 0.3, Color(0.85, 0.88, 0.95), 1.0, 0.0); var base := _pbr("rubber", 1.0, Color(0.7, 0.7, 0.75))
	var hgt := 3.6; var th := 0.25
	var defs := [["x", x0, Vector3(th, hgt, z1 - z0), Vector3(x0, hgt * 0.5, (z0 + z1) * 0.5), -1], ["x", x1, Vector3(th, hgt, z1 - z0), Vector3(x1, hgt * 0.5, (z0 + z1) * 0.5), 1],
		["z", z0, Vector3(x1 - x0, hgt, th), Vector3((x0 + x1) * 0.5, hgt * 0.5, z0), -1], ["z", z1, Vector3(x1 - x0, hgt, th), Vector3((x0 + x1) * 0.5, hgt * 0.5, z1), 1]]
	for df in defs:
		var n := Node3D.new(); dyn.add_child(n)
		_box(n, df[3], df[2], wall)
		var bs: Vector3 = df[2]; bs.y = 0.18
		if df[0] == "x": bs.x += 0.03
		else: bs.z += 0.03
		_box(n, Vector3(df[3].x, 0.09, df[3].z), bs, base)
		_walls.append({"node": n, "axis": df[0], "at": df[1], "side": df[4]})

## Zoomed out, per-rack labels are a picket fence: show one billboard per cluster instead.
func _build_boards() -> void:
	for cid in _clusters:
		var c: Dictionary = _clusters[cid]; var sl: Array = c.slots
		if sl.is_empty(): continue
		var sum := Vector3.ZERO
		for k in sl: sum += slot_pos(k)
		var ctr: Vector3 = sum / float(sl.size())
		var l := Label3D.new(); l.text = "%s · %d racks" % [c.name, sl.size()]
		l.font_size = 48; l.pixel_size = 0.00024; l.modulate = (c.color as Color).lightened(0.35); l.outline_size = 14; l.outline_modulate = Color(0, 0, 0, 0.95)
		l.billboard = BaseMaterial3D.BILLBOARD_ENABLED; l.shaded = false; l.no_depth_test = true; l.fixed_size = true
		l.position = Vector3(ctr.x, RH + 1.1, ctr.z); dyn.add_child(l); _boards.append(l); l.visible = not _labels_show()

func _labels_show() -> bool: return dist < 15.0 and labels_on

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
	var near := _labels_show()
	for e in _labels:
		if is_instance_valid(e.node): e.node.visible = (near or (e.always and labels_on)) and (near or Settings.tier().labels_far)
	for l in _boards:
		if is_instance_valid(l): l.visible = (not near) and labels_on
	var cp := cam.position
	for w in _walls:
		if not is_instance_valid(w.node): continue
		var cv: float = cp.x if w.axis == "x" else cp.z
		w.node.visible = pitch < 1.0 and not ((w.side < 0 and cv < w.at) or (w.side > 0 and cv > w.at))

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
	if absf(d.y) > 1e-5 and not _slot_box.is_empty():
		var tm := (RH * 0.5 - o.y) / d.y
		if tm > 0.0:
			var gm := o + d * tm; var c0 := roundi(gm.x / PITCH); var r0 := 0; var bz := 1e9
			for k in row_z.size():
				if absf(row_z[k] - gm.z) < bz: bz = absf(row_z[k] - gm.z); r0 = k
			for dr in range(-1, 2):
				for dc in range(-2, 3):
					var rr := r0 + dr; var cc := c0 + dc
					if rr < 0 or rr >= row_z.size() or cc < 0 or cc >= cols: continue
					var rb: Dictionary = _slot_box.get(rr * cols + cc, {})
					if rb.is_empty(): continue
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
					hover_changed.emit(s, _slot_box.get(s, {}).get("rack", {}))
