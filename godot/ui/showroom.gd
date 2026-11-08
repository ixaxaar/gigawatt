class_name Showroom
extends SubViewportContainer
## A turntable with the rack you are about to buy: its own 3D world, drag to spin, wheel to zoom.
## Locked platforms show as a dark silhouette. Door and cabling toggles live on the owner's button row.

var vp: SubViewport
var cam: Camera3D
var model: RackModel
var stage: Node3D
var key_light: DirectionalLight3D
var yaw := 0.35
var zoom := 3.7
var _drag := false
var _key := ""
var door_open := true
var cables_on := OS.has_environment("GW_SR_CABLES")
var locked := false
var _ring: MeshInstance3D
var _sil: StandardMaterial3D

func _init() -> void:
	stretch = true; custom_minimum_size = Vector2(0, 360); mouse_filter = Control.MOUSE_FILTER_STOP; size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vp = SubViewport.new(); vp.own_world_3d = true; vp.transparent_bg = false; vp.handle_input_locally = false; vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS; add_child(vp)
	var env := Environment.new(); env.background_mode = Environment.BG_COLOR; env.background_color = Color(0.025, 0.04, 0.065)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR; env.ambient_light_color = Color(0.5, 0.58, 0.7); env.ambient_light_energy = 1.7
	var sky_m := ProceduralSkyMaterial.new(); sky_m.sky_top_color = Color(0.12, 0.17, 0.25); sky_m.sky_horizon_color = Color(0.5, 0.58, 0.7); sky_m.ground_horizon_color = Color(0.3, 0.34, 0.4); sky_m.ground_bottom_color = Color(0.05, 0.06, 0.08)
	var sky := Sky.new(); sky.sky_material = sky_m; sky.radiance_size = Sky.RADIANCE_SIZE_64; env.sky = sky; env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_ACES; env.tonemap_exposure = 1.45; env.glow_enabled = Settings.tier().glow; env.glow_intensity = 0.6
	var we := WorldEnvironment.new(); we.environment = env; vp.add_child(we)
	stage = Node3D.new(); vp.add_child(stage)
	cam = Camera3D.new(); cam.fov = 38.0; cam.current = true; vp.add_child(cam)
	key_light = DirectionalLight3D.new(); key_light.light_energy = 1.6; key_light.rotation_degrees = Vector3(-38, -32, 0); key_light.shadow_enabled = Settings.quality >= 3; vp.add_child(key_light)
	var rim := OmniLight3D.new(); rim.position = Vector3(-1.6, 1.8, -1.8); rim.light_energy = 1.4; rim.omni_range = 6.0; rim.light_color = Color(0.5, 0.7, 1.0); vp.add_child(rim)
	var fill := OmniLight3D.new(); fill.position = Vector3(1.8, 1.2, 2.0); fill.light_energy = 0.7; fill.omni_range = 6.0; vp.add_child(fill)
	# turntable disc with an accent ring
	var disc := MeshInstance3D.new(); var cm := CylinderMesh.new(); cm.top_radius = 1.0; cm.bottom_radius = 1.05; cm.height = 0.05; disc.mesh = cm; disc.position = Vector3(0, -0.03, 0)
	disc.material_override = HallMaterials.get_mat("floor", 0.8, Color(0.7, 0.75, 0.85), 1.0, 0.0); vp.add_child(disc)
	_ring = MeshInstance3D.new(); var tm := TorusMesh.new(); tm.inner_radius = 0.99; tm.outer_radius = 1.03; tm.rings = 48; tm.ring_segments = 6; _ring.mesh = tm; _ring.position = Vector3(0, 0.0, 0); vp.add_child(_ring)
	_sil = StandardMaterial3D.new(); _sil.albedo_color = Color(0.07, 0.1, 0.15); _sil.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_place_cam()
	if Settings.quality <= 0: stretch_shrink = 2

func _place_cam() -> void:
	cam.look_at_from_position(Vector3(0, 1.25 + (zoom - 3.7) * 0.12, zoom), Vector3(0, 0.98, 0))

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
	var rm := StandardMaterial3D.new(); rm.albedo_color = acc; rm.emission_enabled = true; rm.emission = acc; rm.emission_energy_multiplier = 1.8; _ring.material_override = rm
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
