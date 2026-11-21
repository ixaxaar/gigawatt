class_name HallView
extends Node3D
## Realistic 1:1-scale datacenter hall. 1 unit = 1 metre. Contiguous 42U rows, cold-aisle
## containment, raised floor, overhead trays + busway hung from the ceiling, CRAH / switchgear lineups, perimeter walls.

signal slot_clicked(slot: int)
signal hover_changed(slot: int, rack: Dictionary)

const RW := 0.6
const RD := 1.2
const RH := 2.0
const PITCH := 0.6
const COLD := 1.5
const HOT := 1.2
const CEIL := 4.6           # ceiling / roof steel height
const CAM_MIN_Y := 3.1      # over the rows the camera stays above the busway
const TOP_PITCH := 1.5697   # straight down (a hair off vertical so look_at keeps the yaw)
const LABEL_ALL := 10.0     # closer than this every rack shows its label
const I := Transform3D.IDENTITY
const BOARD_PS := 0.00034   # cluster tag size (fixed on screen: about 16 px tall at 900 px)
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
var _fade_cache := {}
var _face_mat: ShaderMaterial
var _plat := {}          # design id -> platform name (computed once per rebuild)
var _clusters := {}      # cluster id -> {id, name, customer, color, slots, centre}
var _labels: Array = []  # [{node, always, pos}] rack-top labels: all of them when the camera is close, else only near the cursor (or the rack is down)
var _boards: Array = []  # [{node, base, tsize, prio}] cluster tags, shown when zoomed out and laid out on screen so they never overlap
var _walls: Array = []   # [{node, axis, at, side}] hall walls; the ones between camera and hall are hidden
var _row_over: Array = []  # [{node, z}] overhead per row: hidden when it would sit between a low camera and what it looks at
var _ceil: Node3D        # ceiling, roof steel and sprinkler mains: only drawn when the camera is below the roof
var _smokes: Array = []  # [{node, pos}] smoke over failed racks; only the few nearest the view emit
var _rods: Array = []    # hanger-rod multimeshes: drawn only when the camera is low enough to see the roof they hang from
var _lamp_n := 0
var _logo_cache := {}
var _site: Dictionary = Site.DEFAULT.duplicate()   # cosmetic surroundings from the game state
var _mood: Dictionary = Site.mood(Site.DEFAULT)
var _rack_nodes := {}    # slot -> {node, design, dim, cab_detail}: racks that can grow rear cabling when the camera is close
var _cab_cam := Vector3(1e9, 0, 0)
var _spec_cache := {}
var _slot_box := {}
var _grain_mat: ShaderMaterial
var _ca: CameraAttributesPractical
var _sky_m: ProceduralSkyMaterial
var _bounds := Rect2()   # inside of the walls (racks, plant column, switchgear strip)
var _rows_rect := Rect2()  # the rows and their overhead
var _built_key := ""
var _built_month := -1
var _ortho := false
var _fit_d := 0.0
var _tw: Tween
var _tw_last: Array = []
var _cursor_g := Vector3.ZERO
var _cursor_ok := false
static var _font: Font
static var _smoke_mat: StandardMaterial3D

func _ready() -> void:
	_build_environment()
	dyn = Node3D.new(); add_child(dyn)
	life = HallLife.new(); life.view = self; add_child(life)
	cam = Camera3D.new(); cam.fov = 50.0; cam.far = 400.0; cam.near = 0.1; add_child(cam); cam.current = true
	_ca = CameraAttributesPractical.new(); _ca.dof_blur_far_enabled = true; _ca.dof_blur_far_distance = 40.0; _ca.dof_blur_far_transition = 20.0; _ca.dof_blur_amount = 0.04; cam.attributes = _ca
	_hover_mesh = MeshInstance3D.new(); add_child(_hover_mesh); _hover_mesh.visible = false
	var bm := BoxMesh.new(); bm.size = Vector3(RW + 0.06, 0.02, RD + 0.06); _hover_mesh.mesh = bm; _hover_mesh.material_override = _emit(Color(0.4, 0.85, 1.0, 0.35), 1.6, true)
	_update_cam()
	get_viewport().size_changed.connect(func(): if b != null and not row_z.is_empty(): _refit())

var _env: Environment
var cover_px := 0.0   # screen pixels covered by a drawer on the right; the hall is re-centred in what's left
var _key: DirectionalLight3D
var _rim: DirectionalLight3D   # low cool back light from behind the racks (follows the camera): a thin edge on every rack
var _label_turn := 99.0

## Per-channel tone curves (a 1D LUT): lifts the blue-green of the darks a little and warms the brights.
static func _grade_lut() -> GradientTexture1D:
	var g := Gradient.new()
	g.set_color(0, Color(0, 0, 0)); g.set_color(1, Color(1.0, 0.99, 0.95))
	g.add_point(0.12, Color(0.095, 0.125, 0.14)); g.add_point(0.45, Color(0.45, 0.455, 0.455)); g.add_point(0.8, Color(0.815, 0.8, 0.77))
	var t := GradientTexture1D.new(); t.gradient = g; t.width = 256; return t
## Apply the active graphics tier (Settings.tier()): render scale, AA, shadows, screen-space effects, lights, fog.
func apply_quality() -> void:
	if _env == null: return
	var t := Settings.tier()
	_env.ssao_enabled = t.ssao; _env.ssao_intensity = 2.5; _env.ssao_radius = 1.0
	_env.ssil_enabled = t.ssil; _env.ssil_intensity = 1.0
	_env.ssr_enabled = t.ssr; _env.ssr_max_steps = 64; _env.ssr_fade_in = 0.1; _env.ssr_fade_out = 1.5
	_env.volumetric_fog_enabled = t.fog
	_env.volumetric_fog_density = 0.008; _env.volumetric_fog_length = 48.0; _env.volumetric_fog_anisotropy = 0.5
	_env.glow_enabled = t.glow
	apply_scale()
	var vp := get_viewport()
	vp.msaa_3d = Viewport.MSAA_4X if t.aa == "msaa4" else (Viewport.MSAA_2X if t.aa == "msaa2" else Viewport.MSAA_DISABLED)
	vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA if t.aa == "fxaa" else Viewport.SCREEN_SPACE_AA_DISABLED
	vp.use_taa = false   # MSAA already covers Ultra; TAA on top of it only smeared the hall while the camera moves
	if _key != null: _key.shadow_enabled = t.shadows; _key.directional_shadow_max_distance = 45.0
	RenderingServer.directional_shadow_atlas_set_size(int(t.shadow_size), true)
	if _grain_mat != null: _grain_mat.set_shader_parameter("animated", t.grain_anim)
	if _face_mat != null: _face_mat.set_shader_parameter("lod", int(t.face_lod))
	Settings.apply_fps()
	HallMaterials.reset(); _fade_cache.clear(); _mat_cache.clear()
	_apply_mood()
	if b != null and dyn != null: rebuild(true)

## 3D render resolution only (also re-run when the window is resized: the automatic scale depends on the pixel count).
func apply_scale() -> void:
	var t := Settings.tier(); var vp := get_viewport()
	vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR if (t.scale < 0.99 and t.fsr) else Viewport.SCALING_3D_MODE_BILINEAR
	vp.scaling_3d_scale = t.scale

func _build_environment() -> void:
	var env := Environment.new()
	# a dim, slightly lighter horizon instead of a black void; the same sky is the (dark) reflection source, so metal and glass
	# reflect a dark hall, not a bright blue sky
	env.background_mode = Environment.BG_SKY
	_sky_m = ProceduralSkyMaterial.new(); _sky_m.sun_angle_max = 0.0; _sky_m.sky_curve = 0.25; _sky_m.ground_curve = 0.1
	var sky := Sky.new(); sky.sky_material = _sky_m; sky.radiance_size = Sky.RADIANCE_SIZE_64; env.sky = sky; env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.tonemap_mode = Environment.TONE_MAPPER_AGX; env.tonemap_exposure = 1.0; env.tonemap_white = 6.0
	env.glow_enabled = true; env.glow_intensity = 0.7; env.glow_bloom = 0.0; env.glow_hdr_threshold = 1.3; env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SOFTLIGHT   # only emissives (LEDs, strips, diffusers) exceed the threshold
	env.set("glow_levels/3", 1.0); env.set("glow_levels/5", 1.0)
	env.adjustment_enabled = true; env.adjustment_contrast = 1.08; env.adjustment_saturation = 1.0
	env.adjustment_color_correction = _grade_lut()   # cool blue-teal shadows, neutral-warm highlights: datacenter at night
	env.fog_enabled = true; env.fog_density = 0.0045; env.fog_sky_affect = 0.0
	_env = env; apply_quality()
	var we := WorldEnvironment.new(); we.environment = env; add_child(we)
	var key := DirectionalLight3D.new(); _key = key; key.rotation_degrees = Vector3(-62, 28, 0); key.shadow_enabled = Settings.tier().shadows; key.directional_shadow_max_distance = 45.0; key.light_volumetric_fog_energy = 0.0; add_child(key)
	_rim = DirectionalLight3D.new(); _rim.light_color = Color(0.55, 0.75, 1.0); _rim.light_energy = 0.35; _rim.shadow_enabled = false; _rim.light_volumetric_fog_energy = 0.0; _rim.light_specular = 1.0; add_child(_rim)
	_apply_mood()
	var vg := CanvasLayer.new(); vg.layer = -1; add_child(vg)                                   # screen vignette + faint grain, under the UI
	var rect := ColorRect.new(); rect.set_anchors_preset(Control.PRESET_FULL_RECT); rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sh := Shader.new(); sh.code = "shader_type canvas_item;\nuniform bool animated = true;\nvoid fragment(){ vec2 uv=UV-0.5; float v=smoothstep(0.4,0.95,length(uv*vec2(1.0,0.85))); float g=fract(sin(dot(FRAGCOORD.xy+(animated?TIME*30.0:0.0),vec2(12.9898,78.233)))*43758.5453)-0.5; COLOR=vec4(0.0,0.005,0.012,v*0.5+(animated?abs(g)*0.02:0.0)); }"
	var sm := ShaderMaterial.new(); sm.shader = sh; rect.material = sm; vg.add_child(rect); _grain_mat = sm
	if OS.has_environment("GW_NOVIGNETTE"): vg.visible = false

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

## Containment glass: faint, slightly rough, low specular, so it reads as glass without mirroring the room.
func _glass(c: Color) -> StandardMaterial3D:
	var key := c.to_html(true)
	if _glass_cache.has(key): return _glass_cache[key]
	var m := StandardMaterial3D.new(); m.albedo_color = c; m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; m.roughness = 0.15; m.metallic = 0.0; m.metallic_specular = 0.2; m.cull_mode = BaseMaterial3D.CULL_DISABLED; _glass_cache[key] = m; return m

## Overhead materials dissolve (screen-door dither, no sorting cost) when the camera gets within a few metres, so trays,
## busway and lamps never fill the screen or hide the rack you are zooming toward.
func _fade(m: StandardMaterial3D) -> StandardMaterial3D:
	if _fade_cache.has(m): return _fade_cache[m]
	var d: StandardMaterial3D = m.duplicate(); d.distance_fade_mode = BaseMaterial3D.DISTANCE_FADE_PIXEL_DITHER; d.distance_fade_min_distance = 1.5; d.distance_fade_max_distance = 4.0
	_fade_cache[m] = d; return d

func _box(parent: Node3D, pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new(); mi.mesh = _box_mesh(size); mi.material_override = mat; mi.position = pos; parent.add_child(mi); return mi

func _box_mesh(size: Vector3) -> BoxMesh:
	var k := Vector3i(roundi(size.x * 1000.0), roundi(size.y * 1000.0), roundi(size.z * 1000.0))
	var bm: BoxMesh = _mesh_cache.get(k)
	if bm == null: bm = BoxMesh.new(); bm.size = size; _mesh_cache[k] = bm
	return bm

func _cyl(parent: Node3D, pos: Vector3, r: float, len_: float, mat: Material, axis := "z") -> MeshInstance3D:
	var mi := MeshInstance3D.new(); var k := Vector3i(roundi(r * 1000.0), roundi(len_ * 100.0), -1)
	var cm: CylinderMesh = _mesh_cache.get(k)
	if cm == null: cm = CylinderMesh.new(); cm.top_radius = r; cm.bottom_radius = r; cm.height = len_; cm.radial_segments = 12; _mesh_cache[k] = cm
	mi.mesh = cm; mi.material_override = mat; mi.position = pos
	if axis == "z": mi.rotation_degrees = Vector3(90, 0, 0)
	elif axis == "x": mi.rotation_degrees = Vector3(0, 0, 90)
	parent.add_child(mi); return mi

## Many copies of one mesh in one draw call.
func _multi(parent: Node3D, mesh: Mesh, mat: Material, tfs: Array, shadows := false) -> MultiMeshInstance3D:
	var mm := MultiMesh.new(); mm.transform_format = MultiMesh.TRANSFORM_3D; mm.mesh = mesh; mm.instance_count = tfs.size()
	for i in tfs.size(): mm.set_instance_transform(i, tfs[i])
	var mi := MultiMeshInstance3D.new(); mi.multimesh = mm; mi.material_override = mat
	if not shadows: mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi); return mi

## Batched boxes: every box with the same size, material and options is drawn as one MultiMesh (one draw call, no node per box).
## `xf` places a local frame (a rack), `pos` is inside it. `vis` > 0 hides the batch beyond that many metres (scaled by the tier);
## `chunk` splits such a batch into local groups so the distance test is per neighbourhood, not per hall.
var _bat := {}
func _bx(xf: Transform3D, pos: Vector3, size: Vector3, mat: Material, shadows := true, vis := 0.0, chunk := 0) -> void:
	var mesh := _box_mesh(size)
	var key := [mesh.get_instance_id(), mat.get_instance_id(), shadows, vis, chunk]
	var e = _bat.get(key)
	if e == null: e = {"mesh": mesh, "mat": mat, "shadows": shadows, "vis": vis, "tfs": []}; _bat[key] = e
	(e.tfs as Array).append(xf * Transform3D(Basis(), pos))

func _flush_batches() -> void:
	for e in _bat.values():
		var mi := _multi(dyn, e.mesh, e.mat, e.tfs, e.shadows)
		if float(e.vis) > 0.0: _small(mi, float(e.vis))
	_bat.clear()
	if _face_tf.is_empty(): return
	var mm := MultiMesh.new(); mm.transform_format = MultiMesh.TRANSFORM_3D; mm.use_colors = true; mm.use_custom_data = true; mm.mesh = _face_quad; mm.instance_count = _face_tf.size()
	for i in _face_tf.size(): mm.set_instance_transform(i, _face_tf[i]); mm.set_instance_color(i, _face_col[i]); mm.set_instance_custom_data(i, _face_dat[i])
	var fi := MultiMeshInstance3D.new(); fi.multimesh = mm; fi.material_override = _face_mat; fi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; dyn.add_child(fi)
	_face_tf.clear(); _face_col.clear(); _face_dat.clear()

## Small props vanish with distance (thermal dots, taps, bundles): fewer draws in big halls, scaled by the tier.
func _small(mi: GeometryInstance3D, metres: float) -> GeometryInstance3D:
	mi.visibility_range_end = metres * float(Settings.tier().vis_scale); mi.visibility_range_end_margin = 2.0; mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; return mi

func _vendor_color(sy: Dictionary) -> Color:
	var p: String = str(sy.platform)
	if p.contains("MI3"): return Color(1.0, 0.3, 0.15)
	if p.contains("Gaudi"): return Color(0.2, 0.55, 1.0)
	if p.contains("Galaxy") or p.contains("CS-3"): return Color(0.7, 0.35, 1.0)
	return Color(0.35, 1.0, 0.45)

## HEAT view ramp: blue (cool) -> green -> yellow -> red (hot). Same ramp as rack_face.gdshader.
static func heat_color(t: float) -> Color:
	t = clampf(t, 0.0, 1.0)
	var c := [Color(0.12, 0.4, 1.0), Color(0.1, 0.9, 0.35), Color(1.0, 0.85, 0.1), Color(1.0, 0.15, 0.05)]
	var s := t * 3.0; var i := mini(int(s), 2)
	return (c[i] as Color).lerp(c[i + 1], s - float(i))

## Crisp rack and cluster text at any distance: the UI font rendered as a multichannel signed distance field.
static func label_font() -> Font:
	if _font == null:
		var base: FontFile = load("res://assets/fonts/ChakraPetch-Bold.ttf")
		var f: FontFile = base.duplicate() if base != null else null
		if f != null: f.multichannel_signed_distance_field = true; f.msdf_pixel_range = 8; f.msdf_size = 48; _font = f
		else: _font = base
	return _font

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
## Everything the hall's look depends on, as one hash. rebuild() is called after every action in the game; when this is
## unchanged (most clicks change nothing in the hall) the scene is kept as it is.
func _signature(hall: Dictionary) -> int:
	var a: Array = [hall_i, str(hall.get("id", "")), int(hall.rackSlots), str(hall.coolingClass), hall.powerEquip, hall.coolingEquip, snappedf(float(hall.coolingKW), 1.0), snappedf(float(hall.itPowerKW), 1.0),
		thermal, labels_on, place_mode, Settings.quality, Settings.colorblind, _site, _links_down(), cols]
	for r in hall.racks:
		var m: Dictionary = _ml.get(r.id, {})
		var st: Dictionary = _rs.get(r.designId, {})
		a.append([int(r.slot), str(r.status), str(r.designId), str(r.get("clusterId", "")), str(m.get("customer", "")), str(m.get("role", "")), str(m.get("status", "")), str(m.get("design", "")), st.get("kW", 0.0), st.get("accels", 0)])
	for c in b.g.clusters: a.append([str(c.id), str(c.name)])
	for ac in b.g.activeContracts: a.append([ac.clusterIds, str(ac.contract.customer)])
	return a.hash()

var _sig := 0
var life: HallLife
var _prev_st := {}   # slot -> rack status at the last rebuild of this hall (a change gets a pulse of light)
signal rack_event(kind: String, count: int)
func rebuild(force := false) -> void:
	if b == null: return
	_rs = b.q("rackStatsAll")
	_ml.clear()
	for m in b.q("machineLedger"): _ml[m.id] = m
	hall_i = clampi(hall_i, 0, b.g.halls.size() - 1)
	_site = Site.style_of(b.g)
	var sig := _signature(b.g.halls[hall_i])
	if not force and sig == _sig and dyn.get_child_count() > 0:
		for r in b.g.halls[hall_i].racks:   # same picture, fresh data behind it (hover and inspect read these)
			var sb = _slot_box.get(int(r.slot))
			if sb != null: sb.rack = r
		return
	_sig = sig
	_bat.clear(); _face_tf.clear(); _face_col.clear(); _face_dat.clear()
	for c in dyn.get_children(): c.queue_free()
	_rack_boxes.clear(); _slot_box.clear(); _beacon = null; _lamps.clear(); _labels.clear(); _boards.clear(); _walls.clear(); _row_over.clear(); _smokes.clear(); _rods.clear(); _ceil = null; _over = null
	_lamp_n = 0; _label_turn = 99.0; _emit_cache.clear(); _fade_cache.clear(); _rack_nodes.clear(); _spec_cache.clear(); _cab_cam = Vector3(1e9, 0, 0)
	_ensure_face_mat()
	_site = Site.style_of(b.g); Site.current = _site; _mood = Site.mood(_site); _apply_mood()
	hall_i = clampi(hall_i, 0, b.g.halls.size() - 1)
	var hall: Dictionary = b.g.halls[hall_i]
	_index_platforms(); _index_clusters()
	_layout(hall)
	var sz := hall_size(); var cx := (cols - 1) * PITCH * 0.5; var cz := row_z[row_z.size() - 1] * 0.5
	_bounds = _wall_rect(hall)
	_rows_rect = Rect2(-RW, row_z[0] - RD * 0.5 - 0.4, (cols - 1) * PITCH + RW * 2.0, row_z[row_z.size() - 1] - row_z[0] + RD + 0.8)
	# the camera only jumps to the hall centre for a different hall (or a new game); a month passing or a HEAT/TAGS toggle keeps the view
	var key := "%d|%s" % [hall_i, str(hall.get("id", ""))]; var mo := int(b.g.get("month", 0))
	var fresh := key != _built_key or mo < _built_month
	_built_key = key; _built_month = mo
	if fresh: target = Vector3(cx, 0.9, cz); _ortho = false
	else: target = _clamp_target(target)
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
	_build_ceiling()
	_build_cables(hall)
	_flush_batches()
	_rack_changes(hall, fresh)
	_build_probe()
	if ratio > 1.0 and heat > 0.0:
		_beacon = OmniLight3D.new(); _beacon.light_color = Color(1, 0.1, 0.05); _beacon.omni_range = 14.0; _beacon.position = Vector3(cx, 3.8, cz); dyn.add_child(_beacon)
	_update_cam()

## The raised floor: the hall area in ~6 m chunks (the Mobile renderer lights each mesh with at most 8 omni + 8 spot lights,
## so one giant plane made lamps pop in and out), plus four plain pieces around it that fade into the background.
func _build_shell(hall: Dictionary, sz: Vector2, cx: float, cz: float) -> void:
	var r := _bounds.grow(0.3)
	var sm := ShaderMaterial.new(); sm.shader = FLOOR_SHADER
	var ctr := r.get_center()
	sm.set_shader_parameter("center", ctr); sm.set_shader_parameter("wall_half", _bounds.size * 0.5 + Vector2(0.15, 0.15)); sm.set_shader_parameter("wall_fall", 2.5); _floor_tex(sm)   # outside the building the floor falls to black within 2.5 m
	var nx := maxi(1, ceili(r.size.x / 6.0)); var nz := maxi(1, ceili(r.size.y / 6.0)); var cw := r.size.x / nx; var ch := r.size.y / nz
	var pm := PlaneMesh.new(); pm.size = Vector2(cw, ch)
	for i in nx:
		for j in nz: _plane(Vector3(r.position.x + (i + 0.5) * cw, 0, r.position.y + (j + 0.5) * ch), pm, sm)
	var M := 30.0
	for rr in [Rect2(r.position.x - M, r.position.y - M, r.size.x + 2.0 * M, M), Rect2(r.position.x - M, r.end.y, r.size.x + 2.0 * M, M), Rect2(r.position.x - M, r.position.y, M, r.size.y), Rect2(r.end.x, r.position.y, M, r.size.y)]:
		var p2 := PlaneMesh.new(); p2.size = rr.size; _plane(Vector3(rr.get_center().x, 0, rr.get_center().y), p2, sm)
	var red := _emit(Site.accent(_site), 1.1, false)
	var m := 0.7; var lw := 0.12                                                                  # painted boundary line
	var x0 := cx - sz.x * 0.5 - m; var x1 := cx + sz.x * 0.5 + m; var z0 := cz - sz.y * 0.5 - m; var z1 := cz + sz.y * 0.5 + m
	_bx(I, Vector3(cx, 0.004, z0), Vector3(x1 - x0, 0.008, lw), red)
	_bx(I, Vector3(cx, 0.004, z1), Vector3(x1 - x0, 0.008, lw), red)
	_bx(I, Vector3(x0, 0.004, cz), Vector3(lw, 0.008, z1 - z0), red)
	_bx(I, Vector3(x1, 0.004, cz), Vector3(lw, 0.008, z1 - z0), red)

func _plane(pos: Vector3, pm: PlaneMesh, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new(); mi.mesh = pm; mi.material_override = mat; mi.position = pos; mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; dyn.add_child(mi); return mi

func _build_aisles(sz: Vector2, cx: float, ratio: float) -> void:
	var rows := row_z.size()
	var w := sz.x + 0.1
	var frame := _solid(Color(0.17, 0.18, 0.2), 0.45, 0.6)
	var roof := _glass(Color(0.3, 0.38, 0.46, 0.08)); var door := _glass(Color(0.6, 0.72, 0.85, 0.13))
	roof.metallic_specular = 0.04; roof.roughness = 0.4   # the lamps sit right above the roof: a glossy roof flared white and hid the racks from the top view
	var seams: Array = []
	for k in range(0, rows - 1):
		var z0 := row_z[k] + RD * 0.5; var z1 := row_z[k + 1] - RD * 0.5
		var mid := (z0 + z1) * 0.5; var d := z1 - z0
		var cold := k % 2 == 0
		if cold:
			var pf := MeshInstance3D.new(); var pm := PlaneMesh.new(); pm.size = Vector2(w, d); pf.mesh = pm; pf.position = Vector3(cx, 0.004, mid)
			var sm := ShaderMaterial.new(); sm.shader = FLOOR_SHADER; sm.set_shader_parameter("perf_rect", Vector4(-1000, -1000, 1000, 1000)); _floor_tex(sm); pf.material_override = sm; dyn.add_child(pf)
			# containment: glass roof with a frame and panel seams, glass end doors between two jambs under a header
			_bx(I, Vector3(cx, 2.12, mid), Vector3(w, 0.02, d), roof)
			for ez in [z0 + 0.02, z1 - 0.02]: _bx(I, Vector3(cx, 2.13, ez), Vector3(w, 0.05, 0.04), frame)
			var sx := -0.3 + 1.2
			while sx < w - 0.6: seams.append(Transform3D(Basis().scaled(Vector3(1, 1, d)), Vector3(sx, 2.14, mid))); sx += 1.2
			for ex in [-0.33, (cols - 1) * PITCH + 0.33]:
				_bx(I, Vector3(ex, 1.06, mid), Vector3(0.02, 2.06, d - 0.1), door)
				for jz in [z0 + 0.03, z1 - 0.03]: _bx(I, Vector3(ex, 1.06, jz), Vector3(0.06, 2.12, 0.05), frame)
				_bx(I, Vector3(ex, 2.1, mid), Vector3(0.07, 0.08, d), frame)
				_bx(I, Vector3(ex + (0.04 if ex > 0 else -0.04), 1.05, mid + d * 0.22), Vector3(0.025, 0.3, 0.025), frame)   # door handle
			for lx in range(0, cols, 3):
				if not _lamp_ok(): _light_pool(Vector3(lx * PITCH + 0.6, 0.006, mid), d, Color(0.78, 0.9, 1.0, 0.07)); continue
				var sp := SpotLight3D.new(); sp.light_color = _mood.cold; sp.light_energy = 3.8 * float(_mood.get("lamp_e", 1.0)); sp.spot_range = 6.5; sp.spot_angle = 52.0; sp.spot_angle_attenuation = 1.6; sp.light_volumetric_fog_energy = 1.4
				sp.position = Vector3(lx * PITCH + 0.6, 3.4, mid); sp.rotation_degrees = Vector3(-90, 0, 0); _lamps.append(sp); dyn.add_child(sp)
		else:
			if ratio > 0.01: _bx(I, Vector3(cx, 0.006, mid), Vector3(w, 0.004, d), _emit(Color(1.0, 0.25, 0.1, 0.05 + 0.1 * clampf(ratio, 0, 1.5)), 1.0, true))
			for lx2 in range(1, cols, 4):
				if not _lamp_ok(): _light_pool(Vector3(lx2 * PITCH + 0.6, 0.006, mid), d, Color(1.0, 0.72, 0.5, 0.05)); continue
				var sp2 := SpotLight3D.new(); sp2.light_color = _mood.hot; sp2.light_energy = (1.6 + 2.0 * ratio) * float(_mood.get("lamp_e", 1.0)); sp2.spot_range = 6.0; sp2.spot_angle = 50.0; sp2.light_volumetric_fog_energy = 0.8
				sp2.position = Vector3(lx2 * PITCH + 0.6, 3.4, mid); sp2.rotation_degrees = Vector3(-90, 0, 0); _lamps.append(sp2); dyn.add_child(sp2)
	if not seams.is_empty(): _multi(dyn, _box_mesh(Vector3(0.03, 0.02, 1.0)), frame, seams)

## Flat text on top of each rack: hardware type, and whether it is earning, idle, on spot, building or down.
## Idle online racks get a thin amber light strip along the top edges (down racks a red one), so money-losing capacity stands out
## from any distance without painting the whole lid.
func _rack_label(p: Vector3, r: Dictionary) -> void:
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
	else: who = "IDLE"; col = Color(1.0, 0.72, 0.25); idle = true
	if not thermal and (idle or status == "failed"):
		var sc := _emit(Color(1.0, 0.62, 0.12) if idle else Color(1.0, 0.12, 0.08), 3.0, false)   # a lit rim round the whole lid: readable from the campus view, the lid itself stays dark for the label
		for sz_ in [-1, 1]: _bx(I, p + Vector3(0, RH + 0.03, sz_ * (RD * 0.5 - 0.04)), Vector3(RW - 0.04, 0.02, 0.05), sc, false)
		for sx_ in [-1, 1]: _bx(I, p + Vector3(sx_ * (RW * 0.5 - 0.04), RH + 0.03, 0), Vector3(0.05, 0.02, RD - 0.13), sc, false)
	if not labels_on: return
	# the label (and the customer's logo beside it) is only made when it is first shown: most racks are never looked at that closely
	_labels.append({"node": null, "always": status == "failed", "pos": p, "kind": "text", "text": nm + "\n" + who, "col": col})
	if m.get("customer") != null and Settings.quality >= 1: _labels.append({"node": null, "always": false, "pos": p, "kind": "logo", "who": str(m.customer)})

func _label_node(e: Dictionary) -> Node3D:
	var p: Vector3 = e.pos
	var along_z := absi(int(roundf(_label_turn / (PI * 0.5)))) % 2 == 1
	if e.kind == "text":
		var l := Label3D.new(); l.font = label_font(); l.text = e.text; l.font_size = 44; l.pixel_size = 0.0034 if along_z else 0.0021; l.modulate = e.col; l.outline_size = 12; l.outline_modulate = Color(0, 0, 0, 0.92)
		l.rotation = Vector3(-PI / 2, _label_turn, 0); l.position = p + Vector3(0, RH + 0.25, 0); l.shaded = false; l.double_sided = true; l.line_spacing = -4
		dyn.add_child(l); e.node = l; return l
	var sp := Sprite3D.new(); sp.texture = _logo_tex(str(e.who)); sp.pixel_size = 0.0034; sp.shaded = false; sp.double_sided = false; sp.transparent = true
	sp.rotation = Vector3(-PI / 2, _label_turn, 0); sp.position = _logo_pos(p, _label_turn, along_z); dyn.add_child(sp); e.node = sp; return sp

func _logo_pos(p: Vector3, psi: float, along_z: bool) -> Vector3:
	var line_dir := Basis(Vector3.UP, psi) * Vector3(1, 0, 0); var up := Vector3(-sin(psi), 0, -cos(psi))   # the text's "up" on the rack top (away from the camera)
	return p + Vector3(0, RH + 0.26, 0) + (line_dir * 0.47 if along_z else up * 0.36)

## Controller camera: left stick pans, right stick orbits, triggers zoom.
func pad_move(pan: Vector2, orbit: Vector2, zoom: float, dt: float) -> void:
	if pan == Vector2.ZERO and orbit == Vector2.ZERO and zoom == 0.0: return
	auto_orbit = false
	if pan != Vector2.ZERO: _pan(pan * dt * dist * 0.9)
	if orbit != Vector2.ZERO: _orbit(-orbit.x * dt * 1.8, orbit.y * dt * 1.2)
	if zoom != 0.0: dist = clampf(dist * (1.0 - zoom * dt * 1.4), 2.5, _max_dist())
	_update_cam()

func set_cover(px: float) -> void:
	var grew := px > cover_px + 2.0   # less room for the hall: re-centre it there and zoom out if needed; more room: the offset alone re-centres it
	cover_px = px
	if grew: _refit()
	else: _update_cam()

## The part of the screen the hall is really seen in: left of the drawer (cover_px), under the top bar, above the dock
## (phone: right of the dock rail). Read from the owner's layout values when it has them.
func _free_rect() -> Rect2:
	var vs := get_viewport().get_visible_rect().size
	var m := get_parent()
	var bar: float = 66.0; var dock: float = 84.0
	if m != null:
		var bv = m.get("_bar_h"); var dv = m.get("_dock_h")
		if bv != null: bar = float(bv)
		if dv != null: dock = float(dv)
	var left := 0.0; var bottom := dock + 8.0
	if Layout.phone: left = 92.0 + 70.0; bottom = 6.0   # dock rail + the camera buttons column beside it
	if OS.has_environment("GW_CLEAN") or not bool(m.get("started") if m != null and m.get("started") != null else true): bar = 0.0; bottom = 0.0; left = 0.0
	var w := maxf(160.0, vs.x - left - cover_px); var h := maxf(120.0, vs.y - bar - bottom)
	return Rect2(left, bar, w, h)

## Drawer opened/closed or window resized: centre the hall in the free area again and zoom out if it no longer fits.
## (Not on month advance: rebuild() never calls this.)
func _refit() -> void:
	if cam == null or row_z.is_empty() or not _bounds.has_area(): _update_cam(); return
	if _ortho or pitch > 1.5: top_view(); return
	var fr := _free_rect(); var vh := maxf(1.0, get_viewport().get_visible_rect().size.y); var tf := 2.0 * tan(deg_to_rad(cam.fov * 0.5))
	var w := _bounds.size.x; var h := _bounds.size.y
	var ex := absf(w * cos(yaw)) + absf(h * sin(yaw)); var ey := (absf(w * sin(yaw)) + absf(h * cos(yaw))) * sin(pitch) + 3.0 * cos(pitch)
	var need := maxf(ex * vh / (fr.size.x * tf), ey * vh / (fr.size.y * tf)) * 1.05
	var c := _bounds.get_center()
	_fly(yaw, pitch, clampf(maxf(dist, need), 2.5, maxf(_max_dist(), need)), Vector3(c.x, target.y, c.y), false, 0.4)

## Camera straight down, orthographic, the whole hall (walls included) fitted into the part of the screen the drawer leaves free.
## A hall deeper than it is wide is turned 90 degrees so its long side runs across a landscape screen.
func top_view() -> void:
	if row_z.is_empty() or cam == null: return
	var r := _bounds if _bounds.has_area() else Rect2(-1, -1, hall_size().x + 2, hall_size().y + 2)
	var vs := get_viewport().get_visible_rect().size; var fr := _free_rect()
	var tall := r.size.y > r.size.x * 1.15 and fr.size.x > fr.size.y
	var ex := r.size.y if tall else r.size.x; var ey := r.size.x if tall else r.size.y
	var size := maxf(ey * vs.y / fr.size.y, ex * vs.y / fr.size.x) * 1.06
	_fit_d = size / (2.0 * tan(deg_to_rad(cam.fov * 0.5)))
	_fly(PI * 0.5 if tall else 0.0, TOP_PITCH, _fit_d, Vector3(r.get_center().x, 0.0, r.get_center().y), true)

## Back to the middle of the hall, keeping the angle and zoom.
func recentre() -> void:
	var c := _bounds.get_center(); _fly(yaw, pitch, dist, Vector3(c.x, 0.9, c.y))

func _max_dist() -> float: return maxf(60.0, _fit_d * 1.3)

## Smooth camera move. Any other change to the camera while it runs (mouse, keys, pad, a script setting GW_CAM) cancels it.
func _fly(y: float, p: float, d: float, t: Vector3, ortho_end := false, sec := 0.55) -> void:
	if _tw != null and _tw.is_valid(): _tw.kill()
	_tw_last = []
	auto_orbit = false; _ortho = false
	if Settings.reduced_motion or not is_inside_tree() or OS.has_environment("GW_SMOKE"):
		yaw = y; pitch = p; dist = d; target = t; _ortho = ortho_end; _update_cam(); return
	var y0 := yaw; var p0 := pitch; var d0 := dist; var t0 := target; var dy := wrapf(y - y0, -PI, PI)
	_tw_last = [yaw, pitch, dist, target]
	var step := func(k: float) -> void:
		if not _tw_last.is_empty() and (yaw != _tw_last[0] or pitch != _tw_last[1] or dist != _tw_last[2] or target != _tw_last[3]):
			_tw.kill(); return
		yaw = y0 + dy * k; pitch = lerpf(p0, p, k); dist = lerpf(d0, d, k); target = t0.lerp(t, k); _update_cam()
		_tw_last = [yaw, pitch, dist, target]
	_tw = create_tween()
	_tw.tween_method(step, 0.0, 1.0, sec).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	if ortho_end: _tw.tween_callback(func(): _ortho = true; _update_cam())

func _build_slot(i: int, p: Vector3) -> void:
	var valid := place_mode != ""
	var col := Color(0.35, 1.0, 0.55, 0.9) if valid else Color(0.9, 0.9, 0.9, 0.35)
	var mat := _emit(col, 1.2 if valid else 0.4, true)
	var L := 0.14
	for sx in [-1, 1]:
		for sz_ in [-1, 1]:
			_bx(I, p + Vector3(sx * (RW * 0.5 - 0.02), 0.006, sz_ * (RD * 0.5 - L * 0.5)), Vector3(0.025, 0.004, L), mat, false)
			_bx(I, p + Vector3(sx * (RW * 0.5 - L * 0.5), 0.006, sz_ * (RD * 0.5 - 0.02)), Vector3(L, 0.004, 0.025), mat, false)
	if valid: _bx(I, p + Vector3(0, 0.005, 0), Vector3(RW - 0.06, 0.003, RD - 0.06), _emit(Color(0.2, 1.0, 0.5, 0.12), 1.0, true), false)

func _build_rack(i: int, p: Vector3, r: Dictionary) -> void:
	var sy := _sysinfo(r.designId)
	var row := i / cols
	var st: String = r.status
	var xf := Transform3D(Basis(Vector3.UP, 0.0 if row % 2 == 0 else PI), p)
	_bx(xf, Vector3(0, 0.002, 0), Vector3(RW + 0.08, 0.004, RD + 0.08), _emit(Color(0, 0, 0, 0.5), 0.0, true), false)   # contact shadow, every tier
	if st == "installing" or st == "ordered":
		_bx(xf, Vector3(0, 0.08, 0), Vector3(0.7, 0.16, 1.2), _solid(Color(0.42, 0.3, 0.17), 0.9, 0.0))               # pallet
		_bx(xf, Vector3(0, 0.95, 0), Vector3(0.62, 1.55, 1.05), _solid(Color(0.5, 0.37, 0.22), 0.95, 0.0))             # cardboard carton
		_bx(xf, Vector3(0, 1.725, 0), Vector3(0.625, 0.01, 0.12), _solid(Color(0.36, 0.26, 0.15), 0.6, 0.0))           # packing tape
		var wrap := _glass(Color(0.85, 0.88, 0.92, 0.06)); wrap.roughness = 0.35
		_bx(xf, Vector3(0, 0.95, 0), Vector3(0.64, 1.58, 1.07), wrap, false)                                            # stretch wrap
		_bx(xf, Vector3(0, 1.4, 0.54), Vector3(0.3, 0.1, 0.005), _solid(Color(0.8, 0.8, 0.76), 0.9, 0.0), false)       # shipping label
	else:
		var shell: Material = Site.rack_material(_site)
		_bx(xf, Vector3(0, RH * 0.5, 0), Vector3(RW - 0.004, RH, RD - 0.05), shell)
		if thermal and st == "online":   # HEAT view: the lid carries the heat colour, readable from the usual high camera
			_bx(xf, Vector3(0, RH + 0.01, 0), Vector3(RW - 0.004, 0.02, RD - 0.03), _emit(heat_color(snappedf(float(sy.kW) / 60.0, 0.05)), 1.3, false))
		else:
			_bx(xf, Vector3(0, RH + 0.01, 0), Vector3(RW - 0.004, 0.02, RD - 0.03), shell)
		_face(i, sy, st, false, xf * Transform3D(Basis(), Vector3(0, 0.07 + 0.935, RD * 0.5 - 0.025 + 0.002)))
		_face(i, sy, st, true, xf * Transform3D(Basis(Vector3.UP, PI), Vector3(0, 0.07 + 0.935, -RD * 0.5 + 0.025 - 0.002)))
		if st == "failed" and Settings.tier().smoke:
			var sm := _make_smoke(); sm.position = p + Vector3(0, RH + 0.1, 0); dyn.add_child(sm); _smokes.append({"node": sm, "pos": p})
	if st == "online" or st == "commissioning" or st == "failed": _rack_nodes[i] = {"node": null, "xf": xf, "design": r.designId, "dim": st != "online", "detail": 0}
	if st != "ordered": _thermal_dots(xf, r, st, row * 100 + (i % cols) / 6)
	var ci := _cluster_of(r)
	if not ci.is_empty() and st != "ordered":
		(_clusters[ci.id].slots as Array).append(i)
		if not thermal:   # HEAT view shows heat only: no cluster colours competing with the ramp
			var cc: Color = ci.color
			for sx in [-1, 1]: _bx(xf, Vector3(sx * (RW * 0.5 - 0.03), RH + 0.03, 0), Vector3(0.045, 0.035, RD - 0.04), _emit(cc, 1.3, false), false)   # cluster-coloured edge rails (the top stays dark for the label)
			_bx(xf, Vector3(0, 0.006, RD * 0.5 + 0.22), Vector3(RW - 0.06, 0.008, 0.16), _emit(cc, 1.4, false), false)    # floor tag, front
			_bx(xf, Vector3(0, 0.006, -RD * 0.5 - 0.22), Vector3(RW - 0.06, 0.008, 0.16), _emit(cc, 1.4, false), false)   # floor tag, rear
	_rack_boxes.append({"slot": i, "aabb": AABB(p + Vector3(-RW * 0.5, 0, -RD * 0.5), Vector3(RW, RH, RD)), "rack": r}); _slot_box[i] = _rack_boxes[_rack_boxes.size() - 1]

## Soft smoke over a failed rack: camera-facing quads with a radial falloff that fade near geometry and near the camera.
## Built stopped; _update_smoke lets only the few failed racks nearest the view emit.
func _make_smoke() -> CPUParticles3D:
	if _smoke_mat == null:
		var g := Gradient.new(); g.set_color(0, Color(1, 1, 1, 1)); g.set_color(1, Color(1, 1, 1, 0)); g.add_point(0.45, Color(1, 1, 1, 0.55))
		var tex := GradientTexture2D.new(); tex.gradient = g; tex.width = 64; tex.height = 64; tex.fill = GradientTexture2D.FILL_RADIAL; tex.fill_from = Vector2(0.5, 0.5); tex.fill_to = Vector2(1.0, 0.5)
		var m := StandardMaterial3D.new(); m.albedo_texture = tex; m.albedo_color = Color(0.3, 0.3, 0.32, 0.5); m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES; m.vertex_color_use_as_albedo = true; m.proximity_fade_enabled = true; m.proximity_fade_distance = 0.5
		m.distance_fade_mode = BaseMaterial3D.DISTANCE_FADE_PIXEL_ALPHA; m.distance_fade_min_distance = 0.6; m.distance_fade_max_distance = 2.5
		_smoke_mat = m
	var sm := CPUParticles3D.new(); sm.amount = 14; sm.lifetime = 3.5; sm.direction = Vector3(0, 1, 0); sm.spread = 15.0; sm.initial_velocity_min = 0.3; sm.initial_velocity_max = 0.6
	sm.gravity = Vector3(0, 0.1, 0); sm.scale_amount_min = 0.5; sm.scale_amount_max = 0.9; sm.emitting = false; sm.local_coords = false
	var curve := Curve.new(); curve.add_point(Vector2(0, 0.4)); curve.add_point(Vector2(1, 1.6)); sm.scale_amount_curve = curve
	var ramp := Gradient.new(); ramp.set_color(0, Color(1, 1, 1, 0)); ramp.set_color(1, Color(1, 1, 1, 0)); ramp.add_point(0.2, Color(1, 1, 1, 1)); sm.color_ramp = ramp
	var q := QuadMesh.new(); q.size = Vector2(1, 1); sm.mesh = q; sm.material_override = _smoke_mat; sm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return sm

func _update_smoke() -> void:
	if _smokes.is_empty(): return
	var c := target
	var order := _smokes.duplicate(); order.sort_custom(func(a, d): return (a.pos as Vector3).distance_squared_to(c) < (d.pos as Vector3).distance_squared_to(c))
	for k in order.size():
		var n: CPUParticles3D = order[k].node
		if is_instance_valid(n): n.emitting = k < 6

## Four dots on the front edge of the rack top: how hard this rack is running against what the hall can cool.
## green = fine, amber = hall near its limit, red = overloaded or failed; unlit dots are headroom.
func _thermal_dots(xf: Transform3D, r: Dictionary, st: String, chunk: int) -> void:
	var kw: float = _rs.get(r.designId, {}).get("kW", 0.0)
	var lit := clampi(int(ceil(4.0 * kw / maxf(1.0, _max_rack_kw))), 1, 4) if st == "online" else (4 if st == "failed" else 0)
	var col := Color(0.25, 1.0, 0.5)
	if st == "failed": col = Color(1.0, 0.2, 0.15)
	elif st == "installing" or st == "commissioning": col = Color(0.5, 0.6, 0.7)
	elif _hall_ratio >= 1.0: col = Color(1.0, 0.2, 0.15)
	elif _hall_ratio >= 0.8: col = Color(1.0, 0.75, 0.2)
	for k in 4:
		var on := k < lit
		_bx(xf, Vector3(-0.2 + k * 0.133, RH + 0.05, RD * 0.5 - 0.075), Vector3(0.085, 0.02, 0.085), _emit(col, 0.9, false) if on else _solid(Color(0.06, 0.07, 0.08), 0.8, 0.0), false, 22.0, chunk)

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
		_face_mat = ShaderMaterial.new(); _face_mat.shader = RACK_SHADER; _face_mat.set_shader_parameter("mm", true)
		_face_quad = QuadMesh.new(); _face_quad.size = Vector2(RW - 0.03, 1.87)
	_face_mat.set_shader_parameter("lod", int(Settings.tier().face_lod))

## One rack face (front or rear) as an instance of the shared face MultiMesh: accent in the instance colour,
## seed / fill / state (+8 for the rear) / heat in the custom data.
var _face_tf: Array = []
var _face_col: Array = []
var _face_dat: Array = []
func _face(i: int, sy: Dictionary, st: String, rear: bool, xf: Transform3D) -> void:
	var c := _vendor_color(sy)
	_face_tf.append(xf); _face_col.append(Color(c.r, c.g, c.b, 1.0))
	var state := 0 if st == "online" else (1 if st == "commissioning" else 2)
	_face_dat.append(Color(float(i * 7 + 3), clampf(0.4 + float(sy.kW) / 80.0, 0.4, 1.0), float(state + (8 if rear else 0)), clampf(float(sy.kW) / 60.0, 0.0, 1.0) if thermal and st == "online" else -1.0))

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
				var body := _pbr("steel", 0.7, Color(0.75, 0.9, 1.25), 0.8, 1.0) if liquid else _pbr("shell", 0.9, Color(2.3, 2.3, 2.25), 0.9, 0.0)   # CDU: stainless; CRAH: grey paint
				_bx(I, pos + Vector3(0, 1.05, 0), Vector3(0.9, 2.1, 0.95), body)
				_bx(I, pos + Vector3(0.455, 1.0, 0), Vector3(0.02, 1.5, 0.7), _solid(Color(0.05, 0.06, 0.07), 0.5, 0.2))                      # louvres / door inset
				_bx(I, pos + Vector3(0.47, 1.75, 0.25), Vector3(0.01, 0.1, 0.22), _emit(Color(0.3, 0.8, 1.0), 1.4, false))                      # display
				_bx(I, pos + Vector3(0.47, 1.75, -0.2), Vector3(0.01, 0.04, 0.04), _emit(Color(0.3, 1.0, 0.5), 2.0, false))
				if liquid:
					_cyl(dyn, Vector3(pos.x + 0.2, 0.14, pos.z), 0.045, 0.9, pipe_b, "x"); _cyl(dyn, Vector3(pos.x + 0.2, 0.26, pos.z), 0.045, 0.9, pipe_r, "x")
				cool_n += 1
			else:
				var pos2 := Vector3(cx - 3.0 + pow_n * 0.9, 0, -3.6)
				var tall := 2.3 if it.get("powerType", "") != "transformer" else 1.7
				_bx(I, pos2 + Vector3(0, tall * 0.5, 0), Vector3(0.85, tall, 0.9), _pbr("shell", 0.9, Color(2.5, 2.5, 2.45), 0.9, 0.0))       # switchgear: grey paint
				_bx(I, pos2 + Vector3(0, tall * 0.5, 0.455), Vector3(0.72, tall - 0.2, 0.012), _pbr("steel", 0.9, Color(1.9, 1.9, 2.0), 0.8, 0.0))     # door panel
				_bx(I, pos2 + Vector3(0.3, tall * 0.5, 0.47), Vector3(0.03, 0.18, 0.02), _solid(Color(0.7, 0.7, 0.72), 0.3, 0.9))              # handle
				_bx(I, pos2 + Vector3(-0.25, tall - 0.4, 0.47), Vector3(0.12, 0.08, 0.01), _emit(Color(1.0, 0.65, 0.1), 1.8, false))            # status
				_bx(I, pos2 + Vector3(-0.1, tall - 0.4, 0.47), Vector3(0.04, 0.04, 0.01), _emit(Color(0.2, 1.0, 0.4), 2.0, false))
				pow_n += 1
	if hall.coolingClass == "dlc" and cool_n > 0:
		var zlen := row_z[row_z.size() - 1] + 1.0
		_cyl(dyn, Vector3(-0.55, 0.14, zlen * 0.5), 0.05, zlen, pipe_b, "z"); _cyl(dyn, Vector3(-0.7, 0.14, zlen * 0.5), 0.05, zlen, pipe_r, "z")
		for z in row_z: _cyl(dyn, Vector3(-0.3, 0.14, z), 0.03, 0.6, pipe_b, "x")
	if plant.is_empty():
		var l := OmniLight3D.new(); l.light_color = Color(1, 0.3, 0.2); l.light_energy = 1.0; l.omni_range = 8.0; l.position = Vector3(cx, 2.5, cz); dyn.add_child(l)

## Overhead scale-out cabling: each cluster's racks are strung together by a coloured run above the cable trays.
var _fault_mats: Array = []
## cluster id -> links down right now (from the engine's network health).
func _links_down() -> Dictionary:
	var out := {}
	var nh = b.q("netHealth")
	if nh is Dictionary:
		for c in nh.clusters:
			if int(c.down) > 0: out[str(c.id)] = int(c.down)
	return out

func _build_cables(hall: Dictionary) -> void:
	_fault_mats.clear()
	if thermal: return   # HEAT view: no cluster colours over the heat map
	var down := _links_down()
	if hall.racks.size() > 300 or hall.racks.size() < 2: return
	var by := {}
	for r in hall.racks:
		var cid = r.get("clusterId")
		if cid == null or cid == "" or r.status == "ordered": continue
		if not by.has(cid): by[cid] = []
		by[cid].append(int(r.slot))
	var n := 0
	var clips: Array = []
	for cid in by:
		var slots: Array = by[cid]; slots.sort()
		if slots.size() < 2: continue
		var col: Color = Kit.cluster_color(b.g, cid); var mat := _fade(_emit(col.lerp(Color(0.3, 0.32, 0.34), 0.45), 0.25, false))   # identity colour, not neon
		var bad: bool = down.has(str(cid))
		if bad: mat = _emit(Color(1.0, 0.25, 0.2), 2.4, false); _fault_mats.append(mat)
		var y := 2.8 + float(n % 3) * 0.07; n += 1
		var poly := PackedVector3Array()
		for k in slots.size():
			var p := slot_pos(slots[k])
			_cyl(dyn, Vector3(p.x, (RH + y) * 0.5, p.z), 0.03, y - RH, mat, "y")
			if k == 0: poly.append(Vector3(p.x, y, p.z)); continue
			var q := slot_pos(slots[k - 1])
			if absf(p.z - q.z) < 0.01: _cyl(dyn, Vector3((p.x + q.x) * 0.5, y, p.z), 0.03, absf(p.x - q.x), mat, "x")
			else:
				_cyl(dyn, Vector3(q.x, y, (p.z + q.z) * 0.5), 0.03, absf(p.z - q.z), mat, "z")
				_cyl(dyn, Vector3((p.x + q.x) * 0.5, y, p.z), 0.03, absf(p.x - q.x), mat, "x")
				poly.append(Vector3(q.x, y, p.z))
			poly.append(Vector3(p.x, y, p.z))
		# orange cable clips every ~1.1 m along the run
		var total := 0.0
		for i in range(1, poly.size()):
			var a0 := poly[i - 1]; var a1 := poly[i]; var L := a0.distance_to(a1); total += L
			var m := int(L / 1.1)
			for j in range(1, m + 1): if clips.size() < 1600: clips.append(a0.lerp(a1, float(j) / float(m + 1)))
	if not clips.is_empty():
		var tfs: Array = []
		for c in clips: tfs.append(Transform3D(Basis(), c))
		_multi(dyn, _box_mesh(Vector3(0.07, 0.07, 0.07)), _fade(_solid(Color(1.0, 0.45, 0.08), 0.5, 0.0)), tfs)

## Per row: a galvanised ladder tray for copper (rails + rungs), a yellow fibre duct, the busway with its tap-off boxes,
## all hung from the roof on threaded rods; between the rows, lamp housings with a lit diffuser on the underside.
## Each row is its own node, hidden by _update_cam when it would sit between a low camera and what it looks at.
func _build_overhead(sz: Vector2, cx: float, ov: Node3D) -> void:
	var rail := _fade(_solid(Color(0.6, 0.62, 0.65), 0.4, 0.6))
	var bus := _fade(_pbr("alu", 1.0, Color(1.1, 1.1, 1.15)))
	var tap := _fade(_pbr("steel", 1.5, Color(1.2, 1.2, 1.3)))
	var rod_m := _fade(_solid(Color(0.3, 0.31, 0.33), 0.5, 0.6))
	var housing := _fade(_solid(Color(0.75, 0.76, 0.78), 0.5, 0.1))
	var diffuser := _fade(_emit(Color(0.95, 0.97, 1.0), 3.0, false))
	var cable_m := [_fade(_solid(Color(0.03, 0.03, 0.035), 0.6, 0.0)), _fade(_solid(Color(0.1, 0.12, 0.3), 0.6, 0.0)), _fade(_solid(Color(0.03, 0.03, 0.035), 0.6, 0.0))]
	var duct := _fade(_solid(Color(0.9, 0.72, 0.1), 0.6, 0.0))
	var L := sz.x + 0.5; var x0 := cx - L * 0.5
	var rm := CylinderMesh.new(); rm.top_radius = 0.008; rm.bottom_radius = 0.008; rm.height = 1.0; rm.radial_segments = 4; rm.rings = 1
	var rung_mesh := _box_mesh(Vector3(0.03, 0.012, 1.0))
	for k in row_z.size():
		var z := row_z[k]
		var rn := Node3D.new(); ov.add_child(rn); _row_over.append({"node": rn, "z": z})
		var rungs: Array = []; var rod_tf: Array = []
		for tz in [[z - 0.18, 0.3], [z + 0.22, 0.22]]:
			for sd in [-1, 1]: _box(rn, Vector3(cx, 2.58, tz[0] + sd * tz[1] * 0.5), Vector3(L, 0.06, 0.012), rail)
			var xx := x0 + 0.15
			while xx < x0 + L: rungs.append(Transform3D(Basis().scaled(Vector3(1, 1, tz[1])), Vector3(xx, 2.556, tz[0]))); xx += 0.3
		_multi(rn, rung_mesh, rail, rungs)
		for cc in 3: _cyl(rn, Vector3(cx, 2.6, z - 0.26 + cc * 0.07), 0.028, sz.x + 0.4, cable_m[cc], "x")   # copper bundles in the ladder tray
		_box(rn, Vector3(cx, 2.6, z + 0.22), Vector3(sz.x + 0.4, 0.04, 0.09), duct)                                         # fibre duct
		_box(rn, Vector3(cx, 2.85, z), Vector3(L, 0.14, 0.22), bus)                                                          # busway
		for j in range(0, cols, 2):
			_small(_box(rn, Vector3(j * PITCH + 0.3, 2.72, z), Vector3(0.22, 0.12, 0.2), tap), 24.0)
			_small(_box(rn, Vector3(j * PITCH + 0.3, 2.72, z + 0.101), Vector3(0.03, 0.03, 0.005), _emit(Color(0.2, 1.0, 0.4), 2.0, false)), 18.0)
		var hx := x0 + 0.4
		while hx < x0 + L:
			for hz in [z - 0.34, z + 0.34]: rod_tf.append(_rod(hx, hz, 2.55, CEIL))
			hx += 1.8
		_rods.append(_small(_multi(rn, rm, rod_m, rod_tf), 40.0))
	for k in range(0, row_z.size() - 1):
		var mid := (row_z[k] + row_z[k + 1]) * 0.5
		var an := Node3D.new(); ov.add_child(an); _row_over.append({"node": an, "z": mid})
		var lrods: Array = []
		for lx in range(0, cols, 3):
			var lp := Vector3(lx * PITCH + 0.6, 3.48, mid)
			_box(an, lp, Vector3(1.2, 0.06, 0.16), housing)
			_box(an, lp + Vector3(0, -0.035, 0), Vector3(1.14, 0.01, 0.12), diffuser)
			for e in [-0.5, 0.5]: lrods.append(_rod(lp.x + e, mid, 3.51, CEIL))
		if not lrods.is_empty(): _rods.append(_small(_multi(an, rm, rod_m, lrods), 40.0))

func _rod(x: float, z: float, y0: float, y1: float) -> Transform3D:
	return Transform3D(Basis().scaled(Vector3(1, y1 - y0, 1)), Vector3(x, (y0 + y1) * 0.5, z))

## Roof steel, a dark soffit and the sprinkler mains: only visible from below the roof (a low camera), never from the usual high view.
func _build_ceiling() -> void:
	if not _bounds.has_area(): return
	_ceil = Node3D.new(); dyn.add_child(_ceil)
	var r := _bounds
	var pm := PlaneMesh.new(); pm.size = r.size; pm.flip_faces = true
	var cm := MeshInstance3D.new(); cm.mesh = pm; cm.position = Vector3(r.get_center().x, CEIL + 0.3, r.get_center().y); cm.material_override = _solid(Color(0.06, 0.065, 0.075), 0.9, 0.0); cm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; _ceil.add_child(cm)
	var beam := _solid(Color(0.16, 0.17, 0.19), 0.6, 0.5)
	var tfs: Array = []
	var z := r.position.y + 3.0
	while z < r.end.y: tfs.append(Transform3D(Basis().scaled(Vector3(r.size.x, 1, 1)), Vector3(r.get_center().x, CEIL + 0.1, z))); z += 6.0
	if not tfs.is_empty(): _multi(_ceil, _box_mesh(Vector3(1.0, 0.4, 0.18)), beam, tfs)
	var pipes: Array = []
	for k in range(0, row_z.size() - 1):
		pipes.append(Transform3D(Basis(Vector3(0, 0, 1), PI * 0.5) * Basis.from_scale(Vector3(1, r.size.x, 1)),Vector3(r.get_center().x, CEIL - 0.25, (row_z[k] + row_z[k + 1]) * 0.5 + 0.4)))
	if not pipes.is_empty():
		var pc := CylinderMesh.new(); pc.top_radius = 0.035; pc.bottom_radius = 0.035; pc.height = 1.0; pc.radial_segments = 8
		_multi(_ceil, pc, _solid(Color(0.75, 0.08, 0.06), 0.45, 0.2), pipes)

## Compare each rack's state with the last rebuild: racks that just arrived, came online or went down get a pulse of light
## in that state's colour (and the owner hears about it through rack_event). Then hand the hall to the technicians.
func _rack_changes(hall: Dictionary, fresh: bool) -> void:
	var now := {}; var n := {"online": 0, "failed": 0, "arrived": 0}
	for r in hall.racks:
		var slot := int(r.slot); var st := str(r.status); now[slot] = st
		if fresh or is_zero_approx(_t): continue
		var old: String = str(_prev_st.get(slot, ""))
		if old == st: continue
		var kind := ""
		if st == "failed": kind = "failed"
		elif st == "online" and old != "": kind = "online"
		elif old == "" or (st == "installing" and old == "ordered"): kind = "arrived"
		if kind == "": continue
		n[kind] += 1
		if int(n.online) + int(n.failed) + int(n.arrived) <= 24:
			life.pulse(slot_pos(slot), Color(1.0, 0.15, 0.1) if kind == "failed" else (Color(0.25, 1.0, 0.55) if kind == "online" else Color(0.45, 0.8, 1.0)))
			if kind == "arrived": life.deliver(slot_pos(slot), 0.06 * float(int(n.arrived) - 1))   # a row of crates lands one after another
	_prev_st = now
	for k in n:
		if int(n[k]) > 0: rack_event.emit(k, int(n[k]))
	life.sync(hall.racks, int(b.g.get("staff", 2)), _built_key, fresh)

## One box-projected reflection probe per hall, captured once per rebuild: metal and glass reflect the hall itself (lamps, racks)
## instead of the sky. High and up on Forward+ (lower tiers reflect the dark sky, which is close enough).
func _build_probe() -> void:
	if Settings.quality < 3 or Settings.compat or not _bounds.has_area(): return   # the probe atlas costs ~500 MB of VRAM: High and Ultra only
	var pr := ReflectionProbe.new(); var r := _bounds
	pr.size = Vector3(r.size.x + 1.0, CEIL + 0.6, r.size.y + 1.0); pr.position = Vector3(r.get_center().x, (CEIL + 0.6) * 0.5 - 0.05, r.get_center().y)
	pr.origin_offset = Vector3(0, 3.3 - pr.position.y, 0)
	pr.box_projection = true; pr.interior = true; pr.update_mode = ReflectionProbe.UPDATE_ONCE; pr.ambient_mode = ReflectionProbe.AMBIENT_ENVIRONMENT
	dyn.add_child(pr)

func _floor_tex(sm: ShaderMaterial) -> void: Site.apply_floor(sm, _site)

## Light mood from the site choice: ambient, key light, exposure, fog and the background tint all change, so the four moods
## read differently at a glance.
func _apply_mood() -> void:
	if _env != null:
		var lights := int(Settings.tier().lights)   # tiers without real aisle lamps get more ambient so the hall is not murky
		_env.ambient_light_color = _mood.amb; _env.ambient_light_energy = float(_mood.amb_e) * (2.2 if lights <= 0 else (1.4 if lights <= 8 else 1.0))
		_env.tonemap_exposure = float(_mood.get("exp", 1.0))
		var fog: Color = _mood.get("fog", Color(0.03, 0.03, 0.035)); _env.fog_light_color = fog
		_env.volumetric_fog_albedo = fog.lightened(0.6); _env.volumetric_fog_emission = fog * 0.3
	if _sky_m != null:
		var bg: Color = _mood.get("bg", Color(0.018, 0.019, 0.022))
		_sky_m.sky_top_color = bg * 0.6; _sky_m.sky_horizon_color = bg * 2.4; _sky_m.ground_horizon_color = bg * 2.0; _sky_m.ground_bottom_color = bg * 0.6
		_sky_m.sky_energy_multiplier = 1.0; _sky_m.ground_energy_multiplier = 1.0
	if _key != null: _key.light_color = _mood.key; _key.light_energy = _mood.key_e

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
	_bx(I, p, Vector3(1.8, 0.003, maxf(1.0, d * 0.8)), _emit(col, 1.0, true), false)

## Interior of the hall including the plant column and the switchgear strip: the walls stand on this rectangle.
func _wall_rect(hall: Dictionary) -> Rect2:
	var n_cool := 0; var n_pow := 0
	for id in hall.coolingEquip: n_cool += mini(int(hall.coolingEquip[id]), 8)
	for id in hall.powerEquip: n_pow += mini(int(hall.powerEquip[id]), 8)
	var cxm := (cols - 1) * PITCH * 0.5
	var x0 := -5.8; var x1 := maxf((cols - 1) * PITCH + 3.0, cxm - 3.0 + n_pow * 0.9 + 2.0)
	var z0 := -5.8; var z1 := maxf(row_z[row_z.size() - 1] + RD * 0.5 + 3.0, 0.3 + n_cool * 1.15 + 1.6)
	return Rect2(x0, z0, x1 - x0, z1 - z0)

## Perimeter walls in the chosen finish (none for open plan), structural columns along them, a fire exit with its sign.
## Each side is one node; the sides between the camera and the hall are hidden in _update_cam.
func _build_walls(hall: Dictionary) -> void:
	var r := _wall_rect(hall)
	var x0 := r.position.x; var x1 := r.end.x; var z0 := r.position.y; var z1 := r.end.y
	var wall: Material = Site.wall_material(_site); var base := _pbr("rubber", 1.0, Color(0.5, 0.5, 0.55), 1.0, 0.0)
	var col_m := _pbr("wall", 0.3, Color(0.3, 0.31, 0.33), 1.0, 0.0)
	var hgt := CEIL + 0.3; var th := 0.25
	var defs := [["x", x0, Vector3(th, hgt, z1 - z0), Vector3(x0, hgt * 0.5, (z0 + z1) * 0.5), -1], ["x", x1, Vector3(th, hgt, z1 - z0), Vector3(x1, hgt * 0.5, (z0 + z1) * 0.5), 1],
		["z", z0, Vector3(x1 - x0, hgt, th), Vector3((x0 + x1) * 0.5, hgt * 0.5, z0), -1], ["z", z1, Vector3(x1 - x0, hgt, th), Vector3((x0 + x1) * 0.5, hgt * 0.5, z1), 1]]
	var col_mesh := _box_mesh(Vector3(0.45, hgt, 0.45))
	for df in defs:
		var n := Node3D.new(); dyn.add_child(n)
		if wall != null:
			_box(n, df[3], df[2], wall)
			var bs: Vector3 = df[2]; bs.y = 0.18
			if df[0] == "x": bs.x += 0.03
			else: bs.z += 0.03
			if _site.walls != "glass":
				_box(n, Vector3(df[3].x, 0.09, df[3].z), bs, base)
				var band: Vector3 = df[2]; band.y = 0.08
				if df[0] == "x": band.x += 0.02
				else: band.z += 0.02
				_box(n, Vector3(df[3].x, 1.35, df[3].z), band, _solid(Site.accent(_site).lerp(Color(0.2, 0.2, 0.22), 0.55).darkened(0.35), 0.7, 0.0))   # thin, muted accent band at hand height
		# columns every ~6 m, just inside the wall line
		var tfs: Array = []
		var along_len: float = (z1 - z0) if df[0] == "x" else (x1 - x0)
		var cnt := maxi(2, int(round(along_len / 6.0)) + 1)
		for c in cnt:
			var t := float(c) / float(cnt - 1)
			var inset: float = -float(df[4]) * 0.3
			var pos := Vector3(df[1] + inset, hgt * 0.5, lerpf(z0, z1, t)) if df[0] == "x" else Vector3(lerpf(x0, x1, t), hgt * 0.5, df[1] + inset)
			tfs.append(Transform3D(Basis(), pos))
		_multi(n, col_mesh, col_m, tfs)
		if df[0] == "z" and df[4] < 0 and wall != null and _site.walls != "glass":   # fire exit on the far wall
			var ex := x0 + 2.4; var wz: float = df[1] + th * 0.5 + 0.02
			_box(n, Vector3(ex, 1.05, wz), Vector3(1.0, 2.1, 0.04), _solid(Color(0.2, 0.22, 0.25), 0.5, 0.4))
			_box(n, Vector3(ex, 2.45, wz + 0.02), Vector3(0.46, 0.17, 0.04), _emit(Color(0.1, 0.9, 0.35), 1.8, false))
			var el := Label3D.new(); el.font = label_font(); el.text = "EXIT"; el.font_size = 40; el.pixel_size = 0.0028; el.modulate = Color(0.95, 1.0, 0.95); el.shaded = false; el.position = Vector3(ex, 2.45, wz + 0.045); n.add_child(el)
		for ch in n.get_children():   # no sun indoors: nothing on the walls throws a shadow into the hall
			if ch is GeometryInstance3D: (ch as GeometryInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_walls.append({"node": n, "axis": df[0], "at": df[1], "side": df[4]})

## Zoomed out, per-rack labels are a picket fence: show one tag per cluster instead, laid out on screen by _layout_boards.
func _build_boards() -> void:
	var down := _links_down()
	for cid in _clusters:
		var c: Dictionary = _clusters[cid]; var sl: Array = c.slots
		if sl.size() < 3: continue   # tiny clusters would only add overlapping text
		var sum := Vector3.ZERO
		for k in sl: sum += slot_pos(k)
		var ctr: Vector3 = sum / float(sl.size())
		var dn: int = int(down.get(str(cid), 0))
		var l := Label3D.new(); l.font = label_font(); l.text = "%s · %d racks%s" % [c.name, sl.size(), (" · %d link%s down" % [dn, "" if dn == 1 else "s"]) if dn > 0 else ""]
		l.font_size = 48; l.pixel_size = BOARD_PS; l.modulate = Color(1.0, 0.55, 0.5) if dn > 0 else (c.color as Color).lightened(0.35); l.outline_size = 14; l.outline_modulate = Color(0, 0, 0, 0.95)
		l.billboard = BaseMaterial3D.BILLBOARD_ENABLED; l.shaded = false; l.no_depth_test = true; l.fixed_size = true
		var base := Vector3(ctr.x, RH + 1.1, ctr.z)
		l.position = base; dyn.add_child(l); l.visible = false
		var ts := label_font().get_string_size(l.text, HORIZONTAL_ALIGNMENT_LEFT, -1, l.font_size) + Vector2(l.outline_size * 2, l.outline_size)
		_boards.append({"node": l, "base": base, "tsize": ts, "prio": (1000 if dn > 0 else 0) + sl.size()})
	_boards.sort_custom(func(a, d): return int(a.prio) > int(d.prio))

## Cluster tags never overlap: in priority order (links down first, then the biggest), each tag takes its spot on screen,
## or the nearest free one a line above/below, or is hidden until the camera gets closer.
func _layout_boards(show: bool) -> void:
	if _boards.is_empty() or cam == null: return
	var vs := get_viewport().get_visible_rect().size
	# fixed-size Label3D: on screen it is pixel_size * vh / (2 tan(fov/2)) per font pixel in perspective, pixel_size * vh / 2 in orthographic
	var tf := tan(deg_to_rad(cam.fov * 0.5)); var ortho := cam.projection == Camera3D.PROJECTION_ORTHOGONAL
	var ps := BOARD_PS / tf if ortho else BOARD_PS
	var k := ps * vs.y * (0.5 if ortho else 1.0 / (2.0 * tf))
	var placed: Array = []
	for e in _boards:
		var l: Label3D = e.node
		if not is_instance_valid(l): continue
		l.pixel_size = ps
		if not show or cam.is_position_behind(e.base): l.visible = false; continue
		var sp := cam.unproject_position(e.base)
		var ts: Vector2 = (e.tsize as Vector2) * k
		var ok := false
		for dy in [0.0, -1.15, 1.15, -2.3, 2.3]:
			var rc := Rect2(sp + Vector2(-ts.x * 0.5, -ts.y * 0.5 + dy * ts.y), ts).grow(2.0)
			if rc.position.x > vs.x - cover_px or rc.end.x < 0.0: continue
			var free := true
			for o in placed:
				if (o as Rect2).intersects(rc): free = false; break
			if free:
				placed.append(rc); l.offset = Vector2(0, -dy * (e.tsize as Vector2).y); ok = true; break
		l.visible = ok

## One small texture per company, rendered once by a throwaway SubViewport.
func _logo_tex(company: String) -> Texture2D:
	if _logo_cache.has(company): return _logo_cache[company]
	var sv := SubViewport.new(); sv.size = Vector2i(96, 96); sv.transparent_bg = true; sv.render_target_update_mode = SubViewport.UPDATE_ONCE; sv.disable_3d = true
	var lg := Logo.make(company, 96.0); lg.size = Vector2(96, 96); sv.add_child(lg); add_child(sv)
	var t := sv.get_texture(); _logo_cache[company] = t; return t

## Rear cabling (scale-out links to the ToR, NVLink spine on rack-scale systems) for racks near the camera only.
## Balanced: one loom per chassis within 22 m. High and up: every cable within 8 m, looms to 22 m. Low and Potato: looms within 12 m.
func _update_cables(force: bool) -> void:
	if cam == null: return
	var q := Settings.quality
	if not force and cam.position.distance_to(_cab_cam) < 0.4: return
	_cab_cam = cam.position
	_update_smoke()
	var cand := []
	for slot in _rack_nodes:
		var e: Dictionary = _rack_nodes[slot]
		var d := cam.position.distance_to((e.xf as Transform3D).origin); var want := 0
		if q >= 3: want = 2 if d < 8.0 else (1 if d < 22.0 else 0)
		elif q == 2: want = 1 if d < 22.0 else 0
		elif q == 1: want = 1 if d < 12.0 else 0
		if want > 0: cand.append([d, slot, want])
	cand.sort_custom(func(a, c): return a[0] < c[0])
	var live := {}
	for k in mini(cand.size(), 90): live[cand[k][1]] = cand[k][2]
	for slot in _rack_nodes:
		var e: Dictionary = _rack_nodes[slot]
		var want: int = live.get(slot, 0)
		if want == int(e.detail): continue
		var node: Node3D = e.node
		if node == null or not is_instance_valid(node):   # a rack only gets a node of its own once it is close enough to grow cabling
			node = Node3D.new(); node.transform = e.xf; dyn.add_child(node); e.node = node
		var old := node.get_node_or_null("cables")
		if old != null: old.queue_free(); node.remove_child(old)
		e.detail = want
		if want > 0:
			if not _spec_cache.has(e.design):
				var dsg := {}
				for d2 in b.g.racks:
					if d2.id == e.design: dsg = d2
				_spec_cache[e.design] = RackModel.spec_from_design(b, dsg) if not dsg.is_empty() else {}
			var sp: Dictionary = _spec_cache[e.design]
			if sp.is_empty() or int(sp.n) <= 0: continue
			var cb := RackModel.make_cables(sp, want, bool(e.dim)); cb.name = "cables"; cb.position = Vector3(0, 0, -0.22); node.add_child(cb)

func _labels_show() -> bool: return dist < LABEL_ALL and labels_on

## Rack labels: every rack when the camera is close; further out only the racks near the cursor and the ones that are down.
func _update_labels() -> void:
	# flat rack-top text always reads upright from the camera's side: it turns in 90 degree steps with the camera
	var turn := roundf(yaw / (PI * 0.5)) * PI * 0.5
	if turn != _label_turn:
		_label_turn = turn
		var along_z := absi(int(roundf(turn / (PI * 0.5)))) % 2 == 1   # the text runs along the 1.2 m depth of the rack, or across its 0.6 m width
		var psi := turn
		for e in _labels:
			if e.node == null or not is_instance_valid(e.node): continue
			var p: Vector3 = e.pos
			if e.get("kind", "") == "text":
				var l: Label3D = e.node; l.rotation = Vector3(-PI / 2, psi, 0); l.pixel_size = 0.0034 if along_z else 0.0021
			else:
				var sp: Sprite3D = e.node; sp.rotation = Vector3(-PI / 2, psi, 0); sp.position = _logo_pos(p, psi, along_z)
	var all := _labels_show()
	var far_ok: bool = Settings.tier().labels_far
	var near_cursor := _cursor_ok and dist < 34.0
	for e in _labels:
		var show := all
		if not show and labels_on:
			if e.always and far_ok: show = true
			elif near_cursor:
				var p: Vector3 = e.pos
				show = Vector2(p.x - _cursor_g.x, p.z - _cursor_g.z).length() < 1.6
		if e.node == null or not is_instance_valid(e.node):
			if not show or not is_inside_tree(): continue
			_label_node(e)
		e.node.visible = show
	_layout_boards(labels_on and not all)

# ---------- camera & input ----------
var _orbit_frame := 0
## `light`: auto-orbit frames in between skip the label, tag and cable layout (they run every 3rd frame); the camera itself always moves.
func _update_cam(light := false) -> void:
	if cam == null: return
	var vh := maxf(1.0, get_viewport().get_visible_rect().size.y)
	var off := Vector3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * dist
	var pos := target + off
	if _rows_rect.has_area() and _rows_rect.has_point(Vector2(pos.x, pos.z)) and pos.y < CAM_MIN_Y: pos.y = CAM_MIN_Y   # never inside the trays and busway
	cam.position = pos
	cam.look_at(target, Vector3.UP if pitch < 1.3 else Vector3(-sin(yaw), 0, -cos(yaw)))
	if _ortho:
		cam.projection = Camera3D.PROJECTION_ORTHOGONAL; cam.size = 2.0 * dist * tan(deg_to_rad(cam.fov * 0.5))
		var wpp := cam.size / vh; var fr := _free_rect(); var vsz := get_viewport().get_visible_rect().size
		cam.h_offset = (vsz.x * 0.5 - fr.get_center().x) * wpp; cam.v_offset = (fr.get_center().y - vsz.y * 0.5) * wpp
	else:
		cam.projection = Camera3D.PROJECTION_PERSPECTIVE
		var wpp2 := 2.0 * dist * tan(deg_to_rad(cam.fov * 0.5)) / vh; var fr2 := _free_rect(); var vsz2 := get_viewport().get_visible_rect().size
		cam.h_offset = (vsz2.x * 0.5 - fr2.get_center().x) * wpp2; cam.v_offset = (fr2.get_center().y - vsz2.y * 0.5) * wpp2
	if _rim != null:   # rim light comes from behind what the camera looks at, low over the floor
		_rim.rotation = Vector3(-0.3, yaw + PI, 0)
	if _ca != null:   # focus on what the camera looks at; nothing in the hall is blurred at the usual zoom
		_ca.dof_blur_far_enabled = not _ortho and Settings.quality >= 2
		_ca.dof_blur_far_distance = dist + 6.0; _ca.dof_blur_far_transition = 10.0 + dist * 0.5
	var top := pitch >= 1.0 or _ortho
	if _over != null and is_instance_valid(_over): _over.visible = not top
	var low := pos.y < 3.4
	var zlo := minf(pos.z, target.z) - 0.9; var zhi := maxf(pos.z, target.z) + 0.9
	for e in _row_over:
		if is_instance_valid(e.node): e.node.visible = not (low and float(e.z) > zlo and float(e.z) < zhi)
	if _ceil != null and is_instance_valid(_ceil): _ceil.visible = pos.y < CEIL - 0.1
	for rd in _rods:
		if is_instance_valid(rd): rd.visible = pos.y < CEIL + 2.5
	if not light:
		_update_labels()
		_update_cables(false)
	for w in _walls:
		if not is_instance_valid(w.node): continue
		var cv: float = pos.x if w.axis == "x" else pos.z
		w.node.visible = not ((w.side < 0 and cv < w.at) or (w.side > 0 and cv > w.at))

func _process(dt: float) -> void:
	_t += dt
	if _drag != 0 and Input.get_mouse_button_mask() == 0: _drag = 0   # the button was released over the interface: do not keep dragging the camera
	if auto_orbit and not Settings.reduced_motion: yaw += dt * orbit_speed; _orbit_frame += 1; _update_cam(_orbit_frame % 3 != 0)
	if _beacon != null: _beacon.light_energy = 2.2 if Settings.reduced_motion else 1.5 + 1.5 * sin(_t * 6.0)
	if not _fault_mats.is_empty(): for m in _fault_mats: (m as StandardMaterial3D).emission_energy_multiplier = 1.2 + (0.0 if Settings.reduced_motion else 1.6 * (0.5 + 0.5 * sin(_t * 7.0)))
	var k := Vector2.ZERO
	var typing := get_viewport().gui_get_focus_owner()   # typing a hall name must not move the camera
	if typing is LineEdit or typing is SpinBox or typing is TextEdit: return
	if blocked or keys_off: return   # a full page or a dialog is up: arrows and WASD belong to it, not the camera
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT): k.x -= 1
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT): k.x += 1
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP): k.y -= 1
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN): k.y += 1
	if k != Vector2.ZERO: auto_orbit = false; _pan(k * dt * dist * 0.9)
	if Input.is_key_pressed(KEY_Q): _orbit(dt, 0.0); auto_orbit = false
	if Input.is_key_pressed(KEY_E): _orbit(-dt, 0.0); auto_orbit = false

func _pan(v: Vector2) -> void:
	var right := Vector3(cos(yaw), 0, -sin(yaw)); var fwd := Vector3(-sin(yaw), 0, -cos(yaw))
	target = _clamp_target(target + right * v.x - fwd * v.y); _update_cam()

## Orbit. In the orthographic top view turning keeps the plan view; tilting leaves it for the normal 3D camera.
func _orbit(dyaw: float, dp: float) -> void:
	yaw += dyaw
	if _ortho:
		if absf(dp) < 0.004: _update_cam(); return
		_ortho = false; pitch = 1.42
	pitch = clampf(pitch + dp, 0.03, 1.45); _update_cam()

## Keep the point the camera circles inside the hall (plus a little margin), so panning can never drift off into nothing.
func _clamp_target(t: Vector3) -> Vector3:
	if not _bounds.has_area(): return t
	var r := _bounds.grow(2.0)
	return Vector3(clampf(t.x, r.position.x, r.end.x), t.y, clampf(t.z, r.position.y, r.end.y))

## Where a screen point hits the horizontal plane at height y (null if it doesn't).
func _ground_at(sp: Vector2, y: float):
	var o := cam.project_ray_origin(sp); var d := cam.project_ray_normal(sp)
	if absf(d.y) < 1e-4: return null
	var t := (y - o.y) / d.y
	if t < 0.0: return null
	return o + d * t

## Zoom toward the point under the cursor (or the pinch centre): that point stays put on screen.
func _zoom_at(f: float, sp: Vector2) -> void:
	auto_orbit = false
	var a = _ground_at(sp, target.y)
	dist = clampf(dist * f, 2.5, _max_dist()); _update_cam()
	if a == null: return
	var a2 = _ground_at(sp, target.y)
	if a2 == null: return
	target = _clamp_target(target + (a as Vector3) - (a2 as Vector3)); _update_cam()

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

## Touch: one finger pans (tap picks a rack, via the emulated mouse); two fingers pinch to zoom (toward the pinch centre) and drag together to orbit.
var _touches := {}
var _pinch_d := 0.0
var _two_down := false
func _touch_input(e: InputEvent) -> bool:
	if e is InputEventScreenTouch:
		var t := e as InputEventScreenTouch
		if t.pressed: _touches[t.index] = t.position
		else: _touches.erase(t.index)
		_two_down = _touches.size() >= 2
		if _two_down: _lheld = false; _lmoved = true; _pinch_d = (_touches.values()[0] as Vector2).distance_to(_touches.values()[1])
		return false
	if e is InputEventScreenDrag:
		var d := e as InputEventScreenDrag
		if not _touches.has(d.index): return false
		_touches[d.index] = d.position
		if _touches.size() >= 2:
			var v: Array = _touches.values(); var nd: float = (v[0] as Vector2).distance_to(v[1])
			if _pinch_d > 8.0 and nd > 8.0: _zoom_at(_pinch_d / nd, ((v[0] as Vector2) + (v[1] as Vector2)) * 0.5)
			_pinch_d = nd; auto_orbit = false
			_orbit(-d.relative.x * 0.002, d.relative.y * 0.0015)
			return true
		return false
	return false

var keys_off := false   # set by main while any dialog is open
var blocked := false   # a full-screen page (Design Lab, Supercomputer, Codex) covers the hall: nothing under it may react
func _unhandled_input(e: InputEvent) -> void:
	if b == null or blocked: return
	if (e is InputEventMouse or e is InputEventScreenTouch or e is InputEventScreenDrag) and cover_px > 0.0 and e.position.x > get_viewport().get_visible_rect().size.x - cover_px: return   # taps in a drawer's gaps are the drawer's
	if _touch_input(e): return
	if _two_down and (e is InputEventMouseMotion or e is InputEventMouseButton): return
	if e is InputEventMouseButton:
		var mb := e as InputEventMouseButton
		if (mb.pressed or mb.button_index == MOUSE_BUTTON_WHEEL_UP or mb.button_index == MOUSE_BUTTON_WHEEL_DOWN) and Kit.over_ui(self): return
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP: _zoom_at(0.9, mb.position)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN: _zoom_at(1.0 / 0.9, mb.position)
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
		elif _drag == 1: _orbit(-mm.relative.x * 0.006, mm.relative.y * 0.005); auto_orbit = false
		elif _drag == 2: _pan(Vector2(-mm.relative.x, -mm.relative.y) * dist * 0.0016)
		else:
			var g = _ground_at(mm.position, 0.0)
			_cursor_ok = g != null
			if g != null: _cursor_g = g
			_update_labels()
			var s := _ray_pick(mm.position)
			if s != _hover:
				_hover = s
				if s < 0: _hover_mesh.visible = false; hover_changed.emit(-1, {})
				else:
					_hover_mesh.visible = true; _hover_mesh.position = slot_pos(s) + Vector3(0, 0.012, 0)
					hover_changed.emit(s, _slot_box.get(s, {}).get("rack", {}))
