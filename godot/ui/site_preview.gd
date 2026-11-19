class_name SitePreview
extends SubViewportContainer
## A small diorama of the hall (floor, walls, two short rows of racks) lit with the chosen mood, slowly orbiting.
## The racks are built exactly like the hall's (finish box + the procedural 42U face), so what you pick is what you get.

var vp: SubViewport
var cam: Camera3D
var stage: Node3D
var env: Environment
var key: DirectionalLight3D
var yaw := 0.7
var _drag := false
var _sky: ProceduralSkyMaterial
var _face_mat: ShaderMaterial
var _face_quad: QuadMesh

func _init() -> void:
	stretch = true; custom_minimum_size = Vector2(520, 380) if not Layout.phone else Vector2(300, 150); size_flags_horizontal = Control.SIZE_EXPAND_FILL; mouse_filter = Control.MOUSE_FILTER_STOP
	vp = SubViewport.new(); vp.own_world_3d = true; vp.render_target_update_mode = SubViewport.UPDATE_WHEN_PARENT_VISIBLE; add_child(vp)
	vp.msaa_3d = Viewport.MSAA_2X if Settings.quality >= 2 else Viewport.MSAA_DISABLED; vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA if Settings.quality < 2 else Viewport.SCREEN_SPACE_AA_DISABLED
	env = Environment.new(); env.background_mode = Environment.BG_SKY
	_sky = ProceduralSkyMaterial.new(); _sky.sun_angle_max = 0.0; var sk := Sky.new(); sk.sky_material = _sky; sk.radiance_size = Sky.RADIANCE_SIZE_32; env.sky = sk
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR; env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_AGX; env.tonemap_exposure = 1.0; env.glow_enabled = Settings.tier().glow; env.glow_intensity = 0.6
	env.fog_enabled = true; env.fog_density = 0.01
	var we := WorldEnvironment.new(); we.environment = env; vp.add_child(we)
	key = DirectionalLight3D.new(); key.rotation_degrees = Vector3(-55, 30, 0); key.shadow_enabled = Settings.quality >= 2; vp.add_child(key)
	cam = Camera3D.new(); cam.fov = 45.0; cam.current = true; vp.add_child(cam)
	stage = Node3D.new(); vp.add_child(stage)
	_face_mat = ShaderMaterial.new(); _face_mat.shader = HallView.RACK_SHADER; _face_mat.set_shader_parameter("lod", int(Settings.tier().face_lod))
	_face_quad = QuadMesh.new(); _face_quad.size = Vector2(HallView.RW - 0.03, 1.87)
	if Settings.quality <= 0: stretch_shrink = 2

func set_style(style: Dictionary) -> void:
	for c in stage.get_children(): c.queue_free()
	Site.current = style; var mood := Site.mood(style); var acc := Site.accent(style)
	env.ambient_light_color = mood.amb; env.ambient_light_energy = mood.amb_e; key.light_color = mood.key; key.light_energy = mood.key_e
	env.tonemap_exposure = float(mood.get("exp", 1.0)); env.fog_light_color = mood.get("fog", Color(0.03, 0.03, 0.035))
	var bg: Color = mood.get("bg", Color(0.018, 0.019, 0.022))
	_sky.sky_top_color = bg * 0.6; _sky.sky_horizon_color = bg * 2.4; _sky.ground_horizon_color = bg * 2.0; _sky.ground_bottom_color = bg * 0.6
	# floor
	var fm := MeshInstance3D.new(); var pm := PlaneMesh.new(); pm.size = Vector2(14, 12); fm.mesh = pm; fm.position = Vector3(3.5, 0, 2.2)
	var sm := ShaderMaterial.new(); sm.shader = HallView.FLOOR_SHADER; sm.set_shader_parameter("center", Vector2(3.5, 2.2)); sm.set_shader_parameter("fade", Vector2(9.0, 10.0)); Site.apply_floor(sm, style); fm.material_override = sm; stage.add_child(fm)
	# accent boundary line
	var line := StandardMaterial3D.new(); line.albedo_color = acc; line.emission_enabled = true; line.emission = acc; line.emission_energy_multiplier = 1.2
	for z in [-1.6, 5.4]: _box(Vector3(3.5, 0.01, z), Vector3(10.0, 0.012, 0.1), line)
	for x in [-1.5, 8.5]: _box(Vector3(x, 0.01, 1.9), Vector3(0.1, 0.012, 7.1), line)
	# walls: back (north) and left (west), with the same accent band as the hall
	var wm: Material = Site.wall_material(style)
	if wm != null:
		_box(Vector3(3.5, 2.45, -2.2), Vector3(14.0, 4.9, 0.25), wm); _box(Vector3(-3.4, 2.45, 2.2), Vector3(0.25, 4.9, 12.0), wm)
		if style.get("walls", "") != "glass":
			var band := StandardMaterial3D.new(); band.albedo_color = acc.darkened(0.25); band.roughness = 0.6
			_box(Vector3(3.5, 1.35, -2.06), Vector3(14.0, 0.22, 0.02), band); _box(Vector3(-3.26, 1.35, 2.2), Vector3(0.02, 0.22, 12.0), band)
	# two short rows of racks, built like the hall's
	var shell: Material = Site.rack_material(style)
	for row in 2:
		for i in 5:
			var p := Node3D.new(); p.position = Vector3(i * HallView.PITCH + 1.2, 0, row * 3.4); p.rotation.y = 0.0 if row == 0 else PI; stage.add_child(p)
			_box(Vector3(0, HallView.RH * 0.5, 0), Vector3(HallView.RW - 0.004, HallView.RH, HallView.RD - 0.05), shell, p)
			_box(Vector3(0, HallView.RH + 0.01, 0), Vector3(HallView.RW - 0.004, 0.02, HallView.RD - 0.03), shell, p)
			for rear in [false, true]:
				var f := MeshInstance3D.new(); f.mesh = _face_quad; f.material_override = _face_mat; f.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
				f.set_instance_shader_parameter("seed", float(row * 11 + i * 7 + 3)); f.set_instance_shader_parameter("fill", 0.75); f.set_instance_shader_parameter("accent", Vector3(0.35, 1.0, 0.45))
				f.set_instance_shader_parameter("state", 0); f.set_instance_shader_parameter("rear", rear); f.set_instance_shader_parameter("heat", -1.0)
				f.position = Vector3(0, 1.005, (-1.0 if rear else 1.0) * (HallView.RD * 0.5 - 0.023)); f.rotation.y = PI if rear else 0.0; p.add_child(f)
	for k in 2:   # one cold-aisle lamp, one warm
		var lamp := OmniLight3D.new(); lamp.position = Vector3(2.0 + k * 2.2, 3.0, 1.7); lamp.light_color = mood.cold if k == 0 else mood.hot; lamp.light_energy = 1.4 * float(mood.get("lamp_e", 1.0)); lamp.omni_range = 5.5; stage.add_child(lamp)
	_place()

func _box(pos: Vector3, size: Vector3, mat: Material, parent: Node3D = null) -> void:
	var mi := MeshInstance3D.new(); var bm := BoxMesh.new(); bm.size = size; mi.mesh = bm; mi.material_override = mat; mi.position = pos; (parent if parent != null else stage).add_child(mi)

func _place() -> void:
	var c := Vector3(3.0, 0.9, 1.8)
	cam.look_at_from_position(c + Vector3(sin(yaw) * 9.5, 4.2, cos(yaw) * 9.5), c)

func _process(dt: float) -> void:
	if not is_visible_in_tree(): return
	if not _drag and not Settings.reduced_motion: yaw += dt * 0.12
	_place()

func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and (e as InputEventMouseButton).button_index == MOUSE_BUTTON_LEFT: _drag = (e as InputEventMouseButton).pressed
	elif e is InputEventMouseMotion and _drag: yaw -= (e as InputEventMouseMotion).relative.x * 0.01
