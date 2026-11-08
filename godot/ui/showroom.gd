class_name Showroom
extends SubViewportContainer
## A turntable with the rack you are about to buy: its own 3D world, drag to spin, wheel to zoom.
## Locked platforms show as a dark silhouette. Door and cabling toggles live on the owner's button row.

var vp: SubViewport
var cam: Camera3D
var model: RackModel
var stage: Node3D
var key_light: DirectionalLight3D
var yaw := float(OS.get_environment("GW_SR_YAW")) if OS.has_environment("GW_SR_YAW") else 0.35
var zoom := 3.5
var _drag := false
var _key := ""
var door_open := true
var cables_on := OS.has_environment("GW_SR_CABLES")
var locked := false
var _ring: MeshInstance3D
var _sil: StandardMaterial3D

func _init() -> void:
	stretch = true; custom_minimum_size = Vector2(0, 400 if not Layout.compact else 280); mouse_filter = Control.MOUSE_FILTER_STOP; size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vp = SubViewport.new(); vp.own_world_3d = true; vp.transparent_bg = false; vp.handle_input_locally = false; vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS; add_child(vp)
	vp.msaa_3d = Viewport.MSAA_4X if Settings.quality >= 2 else (Viewport.MSAA_2X if Settings.quality == 1 else Viewport.MSAA_DISABLED); vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA if Settings.quality <= 1 else Viewport.SCREEN_SPACE_AA_DISABLED
	var env := Environment.new(); env.background_mode = Environment.BG_SKY
	var sky_m := ProceduralSkyMaterial.new(); sky_m.sky_top_color = Color(0.015, 0.025, 0.045); sky_m.sky_horizon_color = Color(0.07, 0.1, 0.16); sky_m.ground_horizon_color = Color(0.05, 0.07, 0.1); sky_m.ground_bottom_color = Color(0.01, 0.015, 0.02); sky_m.sky_energy_multiplier = 0.8
	var sky := Sky.new(); sky.sky_material = sky_m; sky.radiance_size = Sky.RADIANCE_SIZE_128; env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY; env.ambient_light_energy = 1.4; env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_ACES; env.tonemap_exposure = 1.05; env.glow_enabled = Settings.tier().glow; env.glow_intensity = 0.5; env.glow_bloom = 0.08
	if Settings.tier().ssao: env.ssao_enabled = true; env.ssao_radius = 0.6; env.ssao_intensity = 2.2
	if Settings.tier().reflections: env.ssr_enabled = true; env.ssr_max_steps = 48; env.ssr_fade_in = 0.3
	var we := WorldEnvironment.new(); we.environment = env; vp.add_child(we)
	stage = Node3D.new(); vp.add_child(stage)
	cam = Camera3D.new(); cam.fov = 36.0; cam.current = true; vp.add_child(cam)
	key_light = DirectionalLight3D.new(); key_light.light_energy = 2.3; key_light.light_color = Color(1.0, 0.96, 0.9); key_light.rotation_degrees = Vector3(-40, -28, 0); key_light.shadow_enabled = Settings.quality >= 1; key_light.directional_shadow_max_distance = 9.0; vp.add_child(key_light)
	var rim := OmniLight3D.new(); rim.position = Vector3(-1.8, 1.9, -1.9); rim.light_energy = 2.4; rim.omni_range = 7.0; rim.light_color = Color(0.45, 0.65, 1.0); vp.add_child(rim)
	var rim2 := OmniLight3D.new(); rim2.position = Vector3(1.9, 1.4, -1.7); rim2.light_energy = 1.4; rim2.omni_range = 7.0; rim2.light_color = Color(1.0, 0.6, 0.35); vp.add_child(rim2)
	var fill := OmniLight3D.new(); fill.position = Vector3(1.6, 1.0, 2.2); fill.light_energy = 1.3; fill.omni_range = 7.0; vp.add_child(fill)
	# glossy dark studio floor (wide, so the horizon fades into the backdrop) and a turntable disc with an accent ring
	var fl := MeshInstance3D.new(); var fm := CylinderMesh.new(); fm.top_radius = 4.5; fm.bottom_radius = 4.5; fm.height = 0.02; fl.mesh = fm; fl.position = Vector3(0, -0.06, 0)
	var flm := StandardMaterial3D.new(); flm.albedo_color = Color(0.03, 0.04, 0.055); flm.roughness = 0.22; flm.metallic = 0.6; fl.material_override = flm; vp.add_child(fl)
	var disc := MeshInstance3D.new(); var cm := CylinderMesh.new(); cm.top_radius = 1.0; cm.bottom_radius = 1.05; cm.height = 0.05; cm.radial_segments = 64; disc.mesh = cm; disc.position = Vector3(0, -0.03, 0)
	var dm := StandardMaterial3D.new(); dm.albedo_color = Color(0.06, 0.07, 0.09); dm.roughness = 0.28; dm.metallic = 0.85; disc.material_override = dm; vp.add_child(disc)
	_ring = MeshInstance3D.new(); var tm := TorusMesh.new(); tm.inner_radius = 0.99; tm.outer_radius = 1.03; tm.rings = 64; tm.ring_segments = 8; _ring.mesh = tm; _ring.position = Vector3(0, 0.0, 0); vp.add_child(_ring)
	_sil = StandardMaterial3D.new(); _sil.albedo_color = Color(0.07, 0.1, 0.15); _sil.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_place_cam()
	if Settings.quality <= 0: stretch_shrink = 2

func _place_cam() -> void:
	cam.look_at_from_position(Vector3(0, 1.3 + (zoom - 3.5) * 0.12, zoom), Vector3(0, 0.96, 0))

## Show a rack spec; rebuilds the model only when the spec changed.
func set_spec(spec: Dictionary, is_locked := false) -> void:
	var k := "%s|%s" % [spec.key, is_locked]
	locked = is_locked
	if k == _key: return
	_key = k
	if model != null: model.queue_free()
	model = RackModel.new(); stage.add_child(model); model.build(spec, 2, true)
	model.set_door_open(door_open, false); model.set_cables(cables_on)
	var acc: Color = spec.accent
	var rm := StandardMaterial3D.new(); rm.albedo_color = acc; rm.emission_enabled = true; rm.emission = acc; rm.emission_energy_multiplier = 2.6; _ring.material_override = rm
	if locked: _silhouette(model)

func _silhouette(n: Node) -> void:
	for c in n.get_children():
		if c is MeshInstance3D: (c as MeshInstance3D).material_override = _sil
		_silhouette(c)

func set_door(open: bool) -> void:
	door_open = open
	if model != null and not locked: model.set_door_open(open)

func set_cables(show: bool) -> void:
	cables_on = show
	if model != null and not locked: model.set_cables(show)

func _process(dt: float) -> void:
	if model == null or not is_visible_in_tree(): return
	if not _drag and not Settings.reduced_motion: yaw += dt * deg_to_rad(12.0)
	model.rotation.y = yaw

func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseButton:
		var mb := e as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT: _drag = mb.pressed
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_UP: zoom = maxf(2.2, zoom - 0.25); _place_cam()
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_DOWN: zoom = minf(7.0, zoom + 0.25); _place_cam()
	elif e is InputEventMouseMotion and _drag: yaw += (e as InputEventMouseMotion).relative.x * 0.01
