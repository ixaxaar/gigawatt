class_name SitePreview
extends SubViewportContainer
## A small diorama of the hall (floor, walls, a few racks) lit with the chosen mood, slowly orbiting.

var vp: SubViewport
var cam: Camera3D
var stage: Node3D
var env: Environment
var key: DirectionalLight3D
var yaw := 0.7
var _drag := false

func _init() -> void:
	stretch = true; custom_minimum_size = Vector2(520, 380) if not Layout.phone else Vector2(300, 150); size_flags_horizontal = Control.SIZE_EXPAND_FILL; mouse_filter = Control.MOUSE_FILTER_STOP
	vp = SubViewport.new(); vp.own_world_3d = true; add_child(vp)
	env = Environment.new(); env.background_mode = Environment.BG_COLOR; env.background_color = Color(0.01, 0.014, 0.022); env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.tonemap_mode = Environment.TONE_MAPPER_ACES; env.tonemap_exposure = 1.3; env.glow_enabled = Settings.tier().glow
	var we := WorldEnvironment.new(); we.environment = env; vp.add_child(we)
	key = DirectionalLight3D.new(); key.rotation_degrees = Vector3(-55, 30, 0); key.shadow_enabled = Settings.quality >= 2; vp.add_child(key)
	cam = Camera3D.new(); cam.fov = 45.0; cam.current = true; vp.add_child(cam)
	stage = Node3D.new(); vp.add_child(stage)
	if Settings.quality <= 0: stretch_shrink = 2

func set_style(style: Dictionary) -> void:
	for c in stage.get_children(): c.queue_free()
	Site.current = style; var mood := Site.mood(style); var acc := Site.accent(style)
	env.ambient_light_color = mood.amb; env.ambient_light_energy = mood.amb_e; key.light_color = mood.key; key.light_energy = mood.key_e
	# floor
	var fm := MeshInstance3D.new(); var pm := PlaneMesh.new(); pm.size = Vector2(14, 12); fm.mesh = pm; fm.position = Vector3(3.5, 0, 2.2)
	var sm := ShaderMaterial.new(); sm.shader = HallView.FLOOR_SHADER; sm.set_shader_parameter("area", Vector2(14, 12)); Site.apply_floor(sm, style); fm.material_override = sm; stage.add_child(fm)
	# accent boundary line
	var line := StandardMaterial3D.new(); line.albedo_color = acc; line.emission_enabled = true; line.emission = acc; line.emission_energy_multiplier = 1.2
	for z in [-1.6, 5.4]: _box(Vector3(3.5, 0.01, z), Vector3(10.0, 0.012, 0.1), line)
	for x in [-1.5, 8.5]: _box(Vector3(x, 0.01, 1.9), Vector3(0.1, 0.012, 7.1), line)
	# walls: back (north) and left (west)
	var wm: Material = Site.wall_material(style)
	if wm != null:
		_box(Vector3(3.5, 1.8, -2.2), Vector3(14.0, 3.6, 0.25), wm); _box(Vector3(-3.4, 1.8, 2.2), Vector3(0.25, 3.6, 12.0), wm)
	# two short rows of racks with the same models used in the game
	var spec := {"key": "pv", "n": 4, "gpus": 8, "nics": 4, "accent": Color(0.35, 1.0, 0.45), "kind": "std", "cooling": "air", "scale_up": 8}
	for row in 2:
		for i in 5:
			var r := RackModel.new(); stage.add_child(r); r.build(spec, 0, true); r.set_door_open(true, false); r.position = Vector3(i * 0.62 + 1.2, 0, row * 3.4); r.rotation.y = 0.0 if row == 0 else PI
	for k in 2:   # one cold-aisle lamp, one warm
		var lamp := OmniLight3D.new(); lamp.position = Vector3(2.0 + k * 2.2, 3.0, 1.7); lamp.light_color = mood.cold if k == 0 else mood.hot; lamp.light_energy = 1.4; lamp.omni_range = 5.5; stage.add_child(lamp)
	_place()

func _box(pos: Vector3, size: Vector3, mat: Material) -> void:
	var mi := MeshInstance3D.new(); var bm := BoxMesh.new(); bm.size = size; mi.mesh = bm; mi.material_override = mat; mi.position = pos; stage.add_child(mi)

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
