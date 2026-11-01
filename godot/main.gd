extends Node
## Composition root: sim + 3D hall + HUD + the real-time clock.

const SECS_PER_MONTH := [0.0, 7.0, 3.2, 1.2]
var sim := Sim.new()
var hall: HallView
var hud: Hud
var clock := 0.0
var speed := 1
var panel_open := false
var placing := ""
var started := false
var audio: GameAudio

func _ready() -> void:
	Data.load_all()
	hall = HallView.new(); add_child(hall)
	hud = Hud.new(); add_child(hud)
	audio = GameAudio.new(); add_child(audio)
	hud.cue.connect(audio.play)
	hud.continue_requested.connect(_continue)
	hud.speed_changed.connect(func(v): speed = v)
	hud.panel_toggled.connect(func(o): panel_open = o)
	hud.place_requested.connect(_begin_place)
	hud.hall_selected.connect(func(i): hall.hall_i = i; hall.rebuild())
	hud.new_game_requested.connect(_start)
	hall.slot_clicked.connect(_slot_clicked)
	hall.hover_changed.connect(func(s, r): hud.show_hover(s, r, placing))
	_title_scene()
	var auto := OS.get_environment("GW_AUTOSTART")
	if auto != "":
		var holder := hud.root.get_node_or_null("title")
		if holder: holder.queue_free()
		_start(auto)
		_demo_setup()

func _title_scene() -> void:
	started = false
	sim = Sim.new(); sim.new_game(7, "operator")
	var h: Dictionary = sim.s.halls[0]
	var sy := Data.system("tpl-hgx-h100-supermicro-oem")
	for i in [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 24, 25, 26]:
		h.racks.append({"slot": i, "sys": sy.id, "status": "online" if i != 11 else "failed", "ready": 0, "until": 99, "born": 0})
	sim.s.halls[0].plant["et-padmount-2500"] = 1; h.it_kw = 900; h.cool_kw = 1000
	hall.sim = sim; hall.hall_i = 0; hall.dist = 20.0; hall.rebuild(); hud.sim = sim; hud.hall_i = 0
	hud.set_chrome(false)
	hud.show_title()
	hall.dist = 13.0; hall.pitch = 0.32; hall._update_cam(); hall.cam.h_offset = -4.5

func _start(mode: String) -> void:
	hall.cam.h_offset = 0.0
	sim = Sim.new(); sim.new_game(int(Time.get_unix_time_from_system()) % 100000, mode)
	sim.logged.connect(hud.push_feed)
	hall.sim = sim; hall.hall_i = 0; hall.thermal = false; hall.place_mode = ""; hall.auto_orbit = true; hall.dist = 17.0; hall.pitch = 0.42; hall.rebuild()
	hud.set_chrome(true); hud.sim = sim; hud.hall_i = 0; hud.set_speed(1); hud.refresh(); started = true; clock = 0.0
	for e in sim.s.log: hud.push_feed(e.level, e.text)

func _continue() -> void:
	var ns := Sim.new()
	if not ns.load_game(): return
	sim = ns; sim.logged.connect(hud.push_feed)
	hall.cam.h_offset = 0.0; hall.sim = sim; hall.hall_i = 0; hall.thermal = false; hall.place_mode = ""; hall.auto_orbit = true; hall.dist = 17.0; hall.pitch = 0.42; hall.rebuild()
	hud.set_chrome(true); hud.sim = sim; hud.hall_i = 0; hud.set_speed(1); hud.refresh(); started = true; clock = 0.0
	hud.push_feed("info", "Game loaded.")

func _begin_place(sys_id: String) -> void:
	placing = sys_id; hall.place_mode = sys_id; hall.rebuild(); hud.place_banner.text = "PLACE: %s — click a slot  (Esc to cancel)" % Data.system(sys_id).name

func _end_place() -> void:
	placing = ""; hall.place_mode = ""; hud.place_banner.text = ""; hall.rebuild()

func _slot_clicked(slot: int) -> void:
	if not started or placing == "": return
	var err := sim.place(hall.hall_i, slot, placing)
	if err != "": hud.push_feed("bad", err); return
	hud.push_feed("good", "%s placed. Installing — online in ~3 months." % Data.system(placing).name)
	if sim.s.crates.get(placing, 0) <= 0: _end_place()
	else: hall.rebuild()
	hud.refresh()

func _unhandled_key_input(e: InputEvent) -> void:
	if not (e is InputEventKey) or not e.pressed or e.echo or not started: return
	match e.keycode:
		KEY_ESCAPE:
			if placing != "": _end_place()
			elif panel_open: hud.close_panel()
		KEY_SPACE: hud.set_speed(0 if speed > 0 else 1)
		KEY_1: hud.set_speed(1)
		KEY_2: hud.set_speed(2)
		KEY_3: hud.set_speed(3)
		KEY_F5: sim.save_game(); hud.push_feed("info", "Saved.")
		KEY_M: audio.muted = not audio.muted
		KEY_T: hall.thermal = not hall.thermal; hall.rebuild()
		KEY_P: hud.toggle_panel("procure")
		KEY_B: hud.toggle_panel("plant")
		KEY_C: hud.toggle_panel("customers")
		KEY_V: hud.toggle_panel("warehouse")
		KEY_F: hud.toggle_panel("finance")

func _process(dt: float) -> void:
	if not started: return
	if sim.s.over != "":
		if not has_node("end"):
			var n := Node.new(); n.name = "end"; add_child(n); hud.show_end(func(): get_tree().reload_current_scene())
		return
	if not sim.s.incident.is_empty():
		hud.show_incident(func(i): var msg := sim.resolve_incident(i); hud.push_feed("info", msg); hall.rebuild(); hud.refresh())
		return
	if speed == 0 or panel_open: return
	clock += dt / SECS_PER_MONTH[speed]
	hud.set_month_frac(clock)
	if clock >= 1.0:
		clock = 0.0
		sim.advance(); hall.rebuild(); hud.refresh()
		if sim.s.month % 12 == 0: sim.save_game()

## Screenshot/dev hook: GW_AUTOSTART=operator [GW_PANEL=procure] [GW_MONTHS=14]
func _demo_setup() -> void:
	for i in int(OS.get_environment("GW_MONTHS") if OS.get_environment("GW_MONTHS") != "" else "0"):
		var av := sim.available_systems().filter(func(x): return x.cooling == "air" and x.tier == "oem")
		if sim.s.orders.size() < 2 and sim.s.cash > 3e6: sim.order_system(av[av.size() - 1].id, 3)
		for id in sim.s.crates.keys():
			var h: Dictionary = sim.s.halls[0]
			for slot in h.slots:
				if sim.s.crates.get(id, 0) <= 0: break
				if h.racks.filter(func(r): return r.slot == slot).is_empty() and sim.hall_heat(h) + Data.system(id).kW < h.it_kw: sim.place(0, slot, id)
		sim.s.incident = {}
		sim.advance()
	hall.rebuild(); hud.refresh()
	if OS.get_environment("GW_PANEL") != "": hud.toggle_panel(OS.get_environment("GW_PANEL"))
	if OS.get_environment("GW_PLACE") != "" and not sim.s.crates.is_empty(): _begin_place(sim.s.crates.keys()[0])
	hud.set_speed(0)
	if OS.get_environment("GW_CAM") != "":
		var c := OS.get_environment("GW_CAM").split(","); hall.auto_orbit = false; hall.yaw = float(c[0]); hall.pitch = float(c[1]); hall.dist = float(c[2]); if c.size() > 3: hall.target = Vector3(float(c[3]), 1.0, float(c[4]))
		hall._update_cam()
