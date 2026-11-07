extends Node
## App shell: engine bridge + 3D hall + top bar, dock, screens, toasts. Screens live in ui/screens.

const SCREENS := [["dash", "", "Datacenter"], ["shop", "", "Procure"], ["design", "", "Design Lab"], ["facility", "", "Build"], ["stock", "", "Warehouse"], ["energy", "", "Energy"], ["network", "", "Supercomputer"], ["contracts", "", "Customers"], ["ops", "", "Operations"], ["codex", "", "Codex"]]
const SCRIPTS := {"dash": "res://ui/screens/dash.gd", "shop": "res://ui/screens/procure.gd", "stock": "res://ui/screens/stock.gd", "contracts": "res://ui/screens/contracts.gd", "facility": "res://ui/screens/facility.gd", "ops": "res://ui/screens/ops.gd", "codex": "res://ui/screens/codex.gd", "energy": "res://ui/screens/energy.gd", "network": "res://ui/screens/network.gd", "design": "res://ui/screens/design.gd"}
const OVERLAY := ["dash", "facility"]   # narrow right column drawers that leave the hall clickable
## Dock: what the player sees. Supply and Facility are drawers with tabs; Design Lab, Supercomputer and Codex are full-screen workshops.
const DOCK := [["dash", "OVERVIEW", Color("#9b6bff")], ["contracts", "CUSTOMERS", Color("#ff3d8b")], ["shop", "SUPPLY", Color("#ffd23f")], ["facility", "FACILITY", Color("#35d0ff")], ["ops", "OPERATIONS", Color("#3ddc97")], ["design", "DESIGN LAB", Color("#ff8a3d")], ["network", "SUPERCOMPUTER", Color("#c792ea")], ["codex", "CODEX", Color("#9fb4c8")]]
const GROUPS := {"shop": [["shop", "Procure"], ["stock", "Warehouse"]], "facility": [["facility", "Build"], ["energy", "Energy"]]}
const DRAWER_KEY := {"shop": "shop", "stock": "shop", "facility": "facility", "energy": "facility"}
const FULL := ["design", "network", "codex"]
var last_tab := {}
func dock_key(id: String) -> String: return DRAWER_KEY.get(id, id)
func accent_of(id: String) -> Color:
	for d in DOCK:
		if d[0] == dock_key(id): return d[2]
	return Kit.CY
func drawer_w(id := "") -> float:
	var w := get_viewport().get_visible_rect().size.x
	return minf(clampf(w * 0.62, 900.0, 1240.0) if id == "shop" else clampf(w * 0.5, 780.0, 980.0), w - 300.0)
const SECS := [0.0, 4.0, 1.6, 0.6]

var b: Bridge
var hall: HallView
var audio: GameAudio
var ui: CanvasLayer
var root: Control
var holder: Control
var screens := {}
var cur := "dash"
var started := false
var cur_slot := "main"   # the slot the Save button writes to (the one last saved to or loaded from)
var speed := 0
var clock := 0.0
var _seen_log := 0
var toasts: VBoxContainer
var top: PanelContainer
var lbl := {}
var bar_month: ProgressBar
var dock_btns := {}
var menu_ui: Control
var banner: Label
var guide: GuideOverlay
var keynote: KeynoteOverlay
var coach: Coach
var next_btn: Button

func _ready() -> void:
	get_tree().set_auto_accept_quit(false)
	Settings.load_all(); Settings.apply(get_window()); if get("hall") != null: hall.apply_quality()
	b = Bridge.new(); add_child(b)
	if not b.start(): push_error(b.last_error); _fatal(b.last_error); return
	hall = HallView.new(); add_child(hall); hall.b = b
	audio = GameAudio.new(); add_child(audio)
	ui = CanvasLayer.new(); ui.layer = 10; add_child(ui)
	root = Control.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var th := Theme.new(); th.default_font_size = 17; th.default_font = Fonts.regular; th.set_font("bold_font", "RichTextLabel", Fonts.bold); th.set_font("normal_font", "RichTextLabel", Fonts.regular); root.theme = th
	ui.add_child(root)
	_build_shell(); _title()
	pad = Pad.new(); pad.app = self; add_child(pad)
	coach = Coach.new(); coach.app = self; add_child(coach)
	b.changed.connect(_on_changed)
	hall.slot_clicked.connect(func(s): if cur == "facility" and screens.has("facility"): screens["facility"].on_slot(s) else: _inspect(s))
	var auto := OS.get_environment("GW_AUTOSTART")
	if auto != "": _new_game(auto); if OS.get_environment("GW_DEMO") != "": _demo(int(OS.get_environment("GW_DEMO")))
	if OS.get_environment("GW_SMOKE") != "": _smoke(); return
	if OS.get_environment("GW_SETTINGS") != "": _settings()
	if OS.get_environment("GW_AUTOPLAY") != "": quiet = true; var ap := OS.get_environment("GW_AUTOPLAY").split(":"); b.env("autoplay", [ap[0], int(ap[1])]);; quiet = false   # screenshots: "tycoon:48"
	if OS.get_environment("GW_FF") != "": for i in int(OS.get_environment("GW_FF")): b.act("nextMonth")   # screenshots/tests: fast-forward
	if OS.get_environment("GW_CONTINUE") != "" and b.q("saves").size() > 0: _load_slot(str(b.q("saves")[0].slot))   # tests: press CONTINUE
	if OS.get_environment("GW_SCENARIO") != "": _load_scenario(OS.get_environment("GW_SCENARIO"))
	if OS.get_environment("GW_SCREEN") != "": show_screen(OS.get_environment("GW_SCREEN")); if OS.get_environment("GW_DBG") != "": get_tree().create_timer(0.6).timeout.connect(_dbg)
	if OS.get_environment("GW_GUIDE") != "": get_tree().create_timer(0.6).timeout.connect(func(): guide.visible = true; guide.open())
	if OS.get_environment("GW_INSPECT") != "": get_tree().create_timer(0.8).timeout.connect(func(): _inspect(int(OS.get_environment("GW_INSPECT"))))
	if OS.get_environment("GW_ORBIT") != "":   # website capture: frame the hall, then orbit it
		var hl: Dictionary = b.g.halls[hall.hall_i]; var mx := 0
		for r in hl.racks: mx = maxi(mx, int(r.slot))
		var far: Vector3 = hall.slot_pos(mx); var w: float = (hall.cols - 1) * HallView.PITCH
		hall.yaw = 0.55; hall.pitch = 0.6; hall.dist = (w + far.z) * 0.5 + 6.0; hall.target = Vector3(w * 0.5 + 2.0, 0.8, far.z * 0.5)
		hall.auto_orbit = true; hall.orbit_speed = float(OS.get_environment("GW_ORBIT")); hall._update_cam()
	if OS.get_environment("GW_CLEAN") != "": get_tree().process_frame.connect(func(): _shell_visible(false); coach.stop(false); guide.visible = false, CONNECT_ONE_SHOT)   # website capture: bare hall
	if OS.get_environment("GW_CLEAN") != "" and screens.has(cur): screens[cur].visible = false   # screenshots: just the 3D hall

func _fatal(msg: String) -> void:
	var l := Label.new(); l.text = "GIGAWATT engine failed to start:\n" + msg; l.position = Vector2(60, 60); add_child(l)

# ---------- shell ----------
func _build_shell() -> void:
	top = PanelContainer.new(); top.set_anchors_preset(Control.PRESET_TOP_WIDE); top.offset_bottom = 66; top.add_theme_stylebox_override("panel", _top_sb(Kit.CY)); root.add_child(top)
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 20); top.add_child(hb)
	hb.add_child(Kit.label("GIGAWATT", 26, Color("#ffd23f")))
	var dv := VBoxContainer.new(); dv.custom_minimum_size = Vector2(110, 0); lbl.date = Kit.label("", 20); bar_month = Kit.bar(0, 1); dv.add_child(lbl.date); dv.add_child(bar_month); hb.add_child(dv)
	for p in [["CASH", "cash"], ["DEBT", "debt"], ["NET WORTH", "nw"], ["REPUTATION", "rep"]]:
		var v := VBoxContainer.new(); v.add_child(Kit.label(p[0], 10, Kit.DIM)); lbl[p[1]] = Kit.label("", 22); v.add_child(lbl[p[1]]); hb.add_child(v)
	var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; hb.add_child(sp)
	lbl.mode = Kit.btn("", func(): var m: String = b.g.get("mode", "operator"); b.act("setMode", ["operator" if m == "learner" else ("tycoon" if m == "operator" else "learner")]), "", 14); hb.add_child(lbl.mode)
	hb.add_child(Kit.btn("How to play", func(): guide.visible = true; guide.open(), "", 14))
	hb.add_child(Kit.btn("Sound", func(): audio.muted = not audio.muted, "", 14))
	hb.add_child(Kit.btn("Save", func(): var r := b.act("save", [cur_slot]); toast("Game saved." if r.get("ok", false) else "Could not save: %s" % r.get("message", "?"), "good" if r.get("ok", false) else "bad"), "", 14))
	for s in [["⏸", 0], ["▶", 1], ["▶▶", 2], ["▶▶▶", 3]]:
		var bt := Kit.btn(s[0], func(): set_speed(s[1]), "", 15); bt.custom_minimum_size = Vector2(46, 0); lbl["sp%d" % s[1]] = bt; hb.add_child(bt)
	next_btn = Kit.btn("NEXT MONTH ▶", next_month, "go", 17); hb.add_child(next_btn)
	hb.add_child(Kit.btn("MENU", func(): _menu(), "", 14))
	hb.add_child(Kit.btn("SAVE & QUIT ✕", func(): _menu_do("quit"), "danger", 14))
	holder = Control.new(); holder.set_anchors_preset(Control.PRESET_FULL_RECT); holder.offset_top = 76; holder.offset_bottom = -92; holder.offset_left = 14; holder.offset_right = -14; holder.mouse_filter = Control.MOUSE_FILTER_IGNORE; root.add_child(holder)
	var dock := HBoxContainer.new(); dock.set_anchors_preset(Control.PRESET_CENTER_BOTTOM); dock.offset_top = -84; dock.offset_bottom = -10; dock.offset_left = -600; dock.offset_right = 600; dock.add_theme_constant_override("separation", 8); root.add_child(dock)
	for i in DOCK.size():
		var dk: Array = DOCK[i]
		var d := Kit.dock_btn(dk[1], str((i + 1) % 10), dk[2], func(): _dock(dk[0])); dock.add_child(d); dock_btns[dk[0]] = d
	guide = GuideOverlay.new(); guide.app = self; guide.visible = false; root.add_child(guide)
	keynote = KeynoteOverlay.new(); keynote.app = self; keynote.visible = false; root.add_child(keynote)
	tip_panel = PanelContainer.new(); tip_panel.add_theme_stylebox_override("panel", Kit.sb(Color(0.04, 0.07, 0.1, 0.96), Kit.CY, 8, 1, 10)); tip_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE; tip_panel.visible = false
	tip_lbl = Kit.rich("", 13); tip_lbl.custom_minimum_size = Vector2(300, 0); tip_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE; tip_panel.add_child(tip_lbl); root.add_child(tip_panel)
	hall.hover_changed.connect(_on_rack_hover)
	toasts = VBoxContainer.new(); toasts.set_anchors_preset(Control.PRESET_TOP_RIGHT); toasts.offset_left = -480; toasts.offset_right = -14; toasts.offset_top = 76; toasts.mouse_filter = Control.MOUSE_FILTER_IGNORE; toasts.add_theme_constant_override("separation", 6); root.add_child(toasts)
	banner = Kit.label("", 30, Kit.AM); banner.set_anchors_preset(Control.PRESET_CENTER_TOP); banner.offset_top = 140; banner.offset_left = -400; banner.offset_right = 400; banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; root.add_child(banner)
	_shell_visible(false)

func _shell_visible(v: bool) -> void:
	top.visible = v; holder.visible = v
	for d in dock_btns.values(): d.get_parent().visible = v
	toasts.visible = v

func _title() -> void:
	started = false; _shell_visible(false); hall.b = b
	var h := Control.new(); h.set_anchors_preset(Control.PRESET_FULL_RECT); h.name = "title"; root.add_child(h)
	var vb := VBoxContainer.new(); vb.set_anchors_preset(Control.PRESET_CENTER_LEFT); vb.offset_left = 90; vb.offset_top = -310; vb.offset_bottom = 310; vb.offset_right = 780; vb.add_theme_constant_override("separation", 12); h.add_child(vb)
	vb.add_child(Kit.label("AI DATACENTER TYCOON", 18, Kit.DIM)); vb.add_child(Kit.label("GIGAWATT", 110, Kit.CY))
	vb.add_child(Kit.label("Buy real GPUs. Design trays, racks and fabrics. Wire power and liquid cooling. Lease capacity for training and inference — and learn the whole AI hardware stack by surviving it. 2020 → 2028.", 20, Kit.TX, true))
	for m in [["learner", "LEARNER", "I don't know what a chiller is · $80M · explainers everywhere · \"Do it for me\" Easy path"], ["operator", "OPERATOR", "I know the basics · $50M · guided planner and checklists"], ["tycoon", "TYCOON", "Just give me the keys · $30M · no hand-holding"]]:
		var bt := Kit.btn("%s\n%s" % [m[1], m[2]], func(): h.queue_free(); _new_game(m[0]), "pri" if m[0] == "operator" else "", 18); bt.custom_minimum_size = Vector2(640, 76); bt.alignment = HORIZONTAL_ALIGNMENT_LEFT; vb.add_child(bt)
	b.act("newGame", [7, "operator"]); _demo_hall()
	var recent: Array = b.q("saves")
	if recent.size() > 0:
		var rs: Dictionary = recent[0]
		var cont := Kit.btn("CONTINUE\n%s · %s · %d racks" % [Kit.date_of(int(rs.month)), Kit.usd(float(rs.cash)), int(rs.racks)], func(): _load_slot(str(rs.slot), func(): h.queue_free()), "go", 18); cont.custom_minimum_size = Vector2(640, 76); cont.alignment = HORIZONTAL_ALIGNMENT_LEFT
		vb.add_child(cont); vb.move_child(cont, 3)
	vb.add_child(Kit.btn("LOAD GAME", func(): _slots("load", func(): h.queue_free()), "", 16))
	vb.add_child(Kit.btn("SETTINGS", func(): _settings(), "", 16))
	vb.add_child(Kit.btn("QUIT", func(): get_tree().quit(), "", 16))
	vb.add_child(Kit.label("Left-drag pan · right-drag orbit · wheel zoom · Space next month · 1-9 screens · Esc menu", 14, Kit.DIM))
	hall.dist = 13.0; hall.pitch = 0.32; hall.auto_orbit = true; hall.hall_i = 0; hall.rebuild(); hall.cam.h_offset = -4.5

func _demo_hall() -> void: pass

## Screenshot helper (GW_SCENARIO=<id>, GW_HALL=<index>, GW_CAM=auto|yaw,pitch,dist,x,z): load an agent-env scenario into the UI.
func _load_scenario(id: String) -> void:
	b.env("reset", [{"scenario": id}]); b.act("setMode", ["operator"]); _begin()
	hall.hall_i = clampi(int(OS.get_environment("GW_HALL")) if OS.get_environment("GW_HALL") != "" else 0, 0, b.g.halls.size() - 1); hall.rebuild()
	if OS.get_environment("GW_CLUSTERS") != "":   # screenshots: group online racks of the shown hall into 6-rack clusters
		var ids := []; for r in b.g.halls[hall.hall_i].racks:
			if r.status == "online" and (r.get("clusterId") == null or r.clusterId == ""): ids.append(r.id)
		var made := 0
		for k in range(0, mini(ids.size(), 6 * int(OS.get_environment("GW_CLUSTERS"))), 6):
			var sel := ids.slice(k, k + 6); var fab = b.q("autoFabric", [sel, 1.0])
			if fab != null and b.act("createCluster", ["C%d" % made, sel, fab.fabric]).get("ok", false): made += 1
		print("CLUSTERS made=", made, " halls=", b.g.halls.map(func(h): return h.racks.size()))
		hall.rebuild()
	if OS.get_environment("GW_THERMAL") != "": hall.thermal = true; hall.rebuild()
	var cam := OS.get_environment("GW_CAM")
	if cam == "auto":
		var hl: Dictionary = b.g.halls[hall.hall_i]; var mx := 0
		for r in hl.racks: mx = maxi(mx, int(r.slot))
		var far: Vector3 = hall.slot_pos(mx); var w: float = (hall.cols - 1) * HallView.PITCH
		hall.yaw = 0.55; hall.pitch = 0.7; hall.dist = (w + far.z) * 0.9 + 10.0
		hall.target = Vector3(w * 0.5 + 2.0, 0.8, far.z * 0.5); hall.auto_orbit = false; hall._update_cam()
	elif cam != "":
		var c := cam.split_floats(","); hall.yaw = c[0]; hall.pitch = c[1]; hall.dist = c[2]; hall.target = Vector3(c[3], 0.8, c[4]); hall.auto_orbit = false; hall._update_cam()

func _new_game(mode: String) -> void:
	b.act("newGame", [int(Time.get_unix_time_from_system()) % 100000, mode]); b.act("setMode", [mode]); _begin()
	if (Settings.tutorial != "off" and not OS.has_environment("GW_SMOKE") and not OS.has_environment("GW_NOCOACH")) or OS.has_environment("GW_COACH"): coach.start()

func _begin() -> void:
	var tt := root.get_node_or_null("title")
	if tt: tt.queue_free()
	started = true; _seen_log = b.g.log.size(); speed = 0; clock = 0.0
	hall.cam.h_offset = 0.0; hall.hall_i = 0; hall.auto_orbit = false
	_shell_visible(true); show_screen("dash"); _on_changed(); hall.rebuild(); hall.top_view()

func _on_changed() -> void:
	if not started: return
	var g := b.g
	lbl.date.text = Kit.date_of(g.month); lbl.cash.text = Kit.usd(g.cash); lbl.cash.label_settings = Kit.ls(22, Kit.GR if g.cash >= 0 else Kit.RD)
	lbl.debt.text = Kit.usd(g.debt); lbl.nw.text = Kit.usd(float(b.q("netWorth"))); lbl.rep.text = "★ %d" % int(g.reputation)
	lbl.mode.text = {"learner": "Learner", "operator": "Operator", "tycoon": "Tycoon"}.get(g.get("mode", "operator"), "")
	for i in 4: lbl["sp%d" % i].modulate = Color(0.5, 1.0, 0.9) if i == speed else Color.WHITE
	for i in range(_seen_log, g.log.size()):
		var e: Dictionary = g.log[i]
		if e.level != "info": toast(e.text, e.level)
	_seen_log = g.log.size()
	hall.rebuild()
	_check_end()
	check_keynote()
	coach.tick()
	if hall.get_meta("n", 0) == 0: pass
	if screens.has(cur) and screens[cur].has_method("refresh"): screens[cur].refresh()

var quiet := false
func toast(text: String, level := "info") -> void:
	if quiet: return
	for t in toasts.get_children():   # identical toast already on screen: don't stack it
		if t.has_meta("txt") and t.get_meta("txt") == text: return
	var cue := "good" if level == "good" else ("bad" if level == "bad" else "click")
	var low := text.to_lower()
	if level == "bad" and ("fire" in low or "outage" in low or "cut" in low or "went down" in low or "failed" in low): cue = "alarm"
	elif level == "good" and ("online" in low or "commissioned" in low): cue = "online"
	audio.play(cue)
	var p := PanelContainer.new(); p.set_meta("txt", text); var col := Kit.GR if level == "good" else (Kit.RD if level == "bad" else Kit.CY)
	p.add_theme_stylebox_override("panel", Kit.sb(Color(0.05, 0.08, 0.12, 0.94), col, 8, 1, 10)); p.add_child(Kit.label(text, 14, Kit.TX, true)); p.custom_minimum_size = Vector2(460, 0); toasts.add_child(p)
	while toasts.get_child_count() > 5: toasts.get_child(0).queue_free(); toasts.remove_child(toasts.get_child(0))
	var tw := create_tween(); tw.tween_interval(6.0); tw.tween_property(p, "modulate:a", 0.0, 1.0); tw.tween_callback(p.queue_free)

func sfx(k: String) -> void: audio.play(k)

## Click a rack in the hall: a small inspector with what it is, who uses it, and what you can do with it.
var inspector: PanelContainer
var pad: Pad
func _inspect(slot: int) -> void:
	if inspector != null: inspector.queue_free(); inspector = null
	var hall_d: Dictionary = b.g.halls[clampi(hall.hall_i, 0, b.g.halls.size() - 1)]
	var rk := {}
	for r in hall_d.racks:
		if int(r.slot) == slot: rk = r
	if rk.is_empty(): return
	var m := {}
	for x in b.q("machineLedger"): if x.id == rk.id: m = x
	if m.is_empty(): return
	var acc := Color("#ff8a3d")
	inspector = PanelContainer.new(); inspector.add_theme_stylebox_override("panel", Kit.card_sb(acc, Kit.PANEL_FILL, 3, 14))
	inspector.set_anchors_preset(Control.PRESET_BOTTOM_LEFT); inspector.offset_left = 18; inspector.offset_bottom = -98; inspector.offset_top = -300; inspector.offset_right = 400; inspector.grow_vertical = Control.GROW_DIRECTION_BEGIN
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 6); inspector.add_child(v)
	var hb := HBoxContainer.new(); v.add_child(hb); hb.add_child(Kit.chip("RACK " + str(m.serial), acc, 14))
	var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; hb.add_child(sp)
	hb.add_child(Kit.btn("✕", func(): inspector.queue_free(); inspector = null, "", 12))
	v.add_child(Kit.label(str(m.design), 15, Kit.TX, true))
	var role: String = m.role
	if m.get("customer") != null: role += " · " + str(m.customer)
	elif m.get("cluster") != null: role += " · " + str(m.cluster)
	v.add_child(Kit.label("%s · slot %d · %s" % [m.hall, int(m.slot) + 1, str(m.status).to_upper() + ("" if m.status == "online" else " → " + Kit.date_of(m.readyMonth))], 12, Kit.DIM, true))
	v.add_child(Kit.label(role, 14, Kit.GR if m.get("customer") != null else Kit.AM, true))
	v.add_child(Kit.stats([["Accelerators", Kit.num(m.accels)], ["Power", "%s kW" % Kit.num(m.kW, 1)]], 2))
	var row := HBoxContainer.new(); row.add_theme_constant_override("separation", 8); v.add_child(row)
	var spot: bool = b.g.get("spotRacks", []).has(rk.id)
	if m.status == "online" and rk.get("clusterId") == null:
		row.add_child(Kit.btn("Spot market: " + ("ON" if spot else "off"), func(): b.act("setSpotRack", [rk.id, not spot]); _inspect(slot), "pri" if spot else "", 12))
	row.add_child(Kit.btn("Decommission", func(): Kit.confirm(self, "Decommission %s? It is sold at 85%% of residual value." % m.serial, func(): var r := b.act("decommissionRack", [rk.id]); toast(str(r.get("message", "")), "good" if r.get("ok", false) else "bad"); hall.rebuild(), "Sell"), "danger", 12))
	root.add_child(inspector)

## The topmost overlay that should capture controller focus (null while playing).
func modal() -> Control:
	var t := root.get_node_or_null("slots")
	if t != null and is_instance_valid(t) and not t.is_queued_for_deletion(): return t
	if menu_ui != null and is_instance_valid(menu_ui): return menu_ui
	if settings_ui != null and is_instance_valid(settings_ui): return settings_ui
	if end_ui != null and is_instance_valid(end_ui): return end_ui
	if keynote != null and keynote.visible: return keynote
	if guide != null and guide.visible: return guide
	var tt := root.get_node_or_null("title")
	if tt != null and not started: return tt
	return null

func _top_sb(acc: Color) -> StyleBoxFlat:
	var t := Kit.sb(Color(0.03, 0.045, 0.07, 0.97), Color(0.02, 0.03, 0.05), 0, 0, 14); t.border_width_bottom = 5; t.border_color = acc
	t.shadow_color = Color(0, 0, 0, 0.5); t.shadow_size = 8; t.shadow_offset = Vector2(0, 4); return t

func _dock(key: String) -> void:
	if dock_key(cur) == key and key != "dash": show_screen("dash")   # clicking the open drawer closes it
	else: show_screen(last_tab.get(key, key))

func show_screen(id: String) -> void:
	for sc in screens.values(): sc.visible = false
	cur = id; last_tab[dock_key(id)] = id
	if coach != null: coach.visited(dock_key(id))
	Kit.accent = accent_of(id)
	if top != null: top.add_theme_stylebox_override("panel", _top_sb(Kit.accent))
	hall.visible = not FULL.has(id)
	var cover := 0.0
	if OVERLAY.has(id): cover = 520.0
	elif not FULL.has(id): cover = drawer_w()
	hall.set_cover(cover)
	if not screens.has(id): screens[id] = _make_screen(id); holder.add_child(screens[id])
	var scr: Control = screens[id]
	if scr is ScreenWrap:   # (re)apply the inner margins: some screens reset their own anchors in _ready()
		var inn: Control = (scr as ScreenWrap).inner
		inn.set_anchors_preset(Control.PRESET_FULL_RECT); inn.offset_left = 18; inn.offset_right = -18; inn.offset_bottom = -14
		inn.offset_top = 58 if (GROUPS.has(dock_key(id)) and not FULL.has(id)) else 14
	if not OVERLAY.has(id) and not FULL.has(id): scr.offset_left = -drawer_w(id)
	scr.visible = true
	if scr.has_method("refresh"): scr.refresh()
	for k in dock_btns: Kit.dock_set(dock_btns[k], k == dock_key(id))

## Tab strip for a drawer that groups several screens (Procure|Warehouse, Build|Energy).
func tab_strip(id: String) -> Control:
	var grp: Array = GROUPS.get(dock_key(id), [])
	if grp.is_empty(): return Control.new()
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 6)
	for t in grp: hb.add_child(Kit.tab_btn(t[1], t[0] == id, accent_of(id), func(): show_screen(t[0])))
	return hb

func go(id: String) -> void: show_screen(id)

var learn_id := ""
func learn(id: String) -> void: learn_id = id; show_screen("codex")

func _make_screen(id: String) -> Control:
	var path: String = SCRIPTS.get(id, "")
	var c: Control
	if path != "": c = load(path).new(); c.app = self
	else:
		c = Control.new(); c.set_anchors_preset(Control.PRESET_FULL_RECT)
		var l := Kit.label("%s — coming next in the Godot port." % id, 22, Kit.DIM); l.position = Vector2(40, 40); c.add_child(l)
	if not OVERLAY.has(id):
		var full := FULL.has(id); var acc := accent_of(id)
		var bg := PanelContainer.new(); bg.set_anchors_preset(Control.PRESET_FULL_RECT); bg.add_theme_stylebox_override("panel", Kit.drawer_sb(acc, full)); bg.mouse_filter = Control.MOUSE_FILTER_STOP
		c.set_anchors_preset(Control.PRESET_FULL_RECT); c.offset_left = 18; c.offset_top = 14; c.offset_right = -18; c.offset_bottom = -14
		var w := ScreenWrap.new(); w.add_child(bg)
		if full: w.set_anchors_preset(Control.PRESET_FULL_RECT)
		else:
			w.set_anchors_preset(Control.PRESET_RIGHT_WIDE); w.offset_left = -drawer_w(id)
			if GROUPS.has(dock_key(id)): var ts := tab_strip(id); ts.set_anchors_preset(Control.PRESET_TOP_WIDE); ts.offset_left = 20; ts.offset_top = 12; ts.offset_right = -20; w.add_child(ts); c.offset_top = 58
		w.add_child(c); w.inner = c; return w
	return c

func set_speed(v: int) -> void: speed = v; clock = 0.0; _on_changed()

func next_month() -> void:
	if not started: return
	audio.play("month"); b.act("nextMonth"); b.act("stepEasy"); _claim()
	if OS.get_environment("GW_NOAUTOSAVE") == "": pass

## Launch keynotes queue up in the engine (g.news); show them one at a time and stop the clock while one is open.
func check_keynote() -> void:
	if not started or keynote == null or keynote.visible or end_ui != null or menu_ui != null: return
	if Engine.get_frames_drawn() < 5: get_tree().create_timer(0.25).timeout.connect(check_keynote); return   # let the first layout pass finish
	var news: Array = b.g.get("news", [])
	if news.is_empty(): return
	if OS.has_environment("GW_SMOKE") or OS.has_environment("GW_NOKEYNOTE"): b.act("ackNews"); return
	var l: Dictionary = b.q("launches")
	if l.news.is_empty(): b.act("ackNews"); return
	keynote.open(l.news[0], l.news.size() - 1); speed = 0; clock = 0.0; audio.play("good")
	for i in 4: lbl["sp%d" % i].modulate = Color(0.5, 1.0, 0.9) if i == 0 else Color.WHITE

func _claim() -> void:
	for m in b.claim_missions(): banner.text = "★ MISSION COMPLETE ★  %s" % m.title; audio.play("good"); get_tree().create_timer(3.2).timeout.connect(func(): banner.text = "")

func _process(dt: float) -> void:
	_process_tip()
	if not started or speed == 0 or menu_ui != null or keynote.visible: return
	clock += dt / SECS[speed]; bar_month.value = clock
	if clock >= 1.0: clock = 0.0; next_month()

func _dbg() -> void:
	for k in screens: print(k, " rect=", screens[k].get_global_rect(), " vis=", screens[k].visible)
	print("holder=", holder.get_global_rect(), " root=", root.get_global_rect(), " top=", top.get_global_rect())

func _input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed and not e.echo:
		if e.keycode == KEY_Q and e.ctrl_pressed: _menu_do("quit" if started else "quit")
		elif e.keycode == KEY_ESCAPE and started: get_viewport().set_input_as_handled(); _menu()

var tip_panel: PanelContainer
var tip_lbl: RichTextLabel
func _on_rack_hover(slot: int, rk: Dictionary) -> void:
	if slot < 0 or rk.is_empty() or FULL.has(cur): tip_panel.visible = false; return
	var dn := ""; for d in b.g.racks:
		if d.id == rk.designId: dn = d.name
	var ci: Dictionary = hall.cluster_info(rk)
	var t := "[b]%s[/b]\nstatus: %s\n" % [dn, rk.status]
	if ci.is_empty(): t += "[color=#8fb0c8]not in a cluster[/color]"
	else: t += "cluster: [color=#%s][b]%s[/b][/color]\ncustomer: %s" % [ci.color.to_html(false), ci.name, ci.customer if ci.customer != "" else "— (unassigned)"]
	tip_lbl.text = t; tip_panel.visible = true

func _process_tip() -> void:
	if tip_panel and tip_panel.visible: tip_panel.position = get_viewport().get_mouse_position() + Vector2(18, 18)

func _unhandled_key_input(e: InputEvent) -> void:
	if not (e is InputEventKey) or not e.pressed or e.echo: return
	var tgt := get_viewport().gui_get_focus_owner()
	if tgt is LineEdit or tgt is SpinBox: return
	if not started:
		if e.keycode == KEY_ESCAPE: get_tree().quit()
		return
	if e.keycode == KEY_F1: _settings(); return
	if e.keycode == KEY_SPACE: next_month(); return
	if e.keycode >= KEY_1 and e.keycode <= KEY_9 and e.keycode - KEY_1 < DOCK.size(): _dock(DOCK[e.keycode - KEY_1][0])
	elif e.keycode == KEY_0: show_screen("codex")
	elif e.keycode == KEY_V: hall.top_view()
	elif e.keycode == KEY_L: hall.labels_on = not hall.labels_on; hall.rebuild()
	elif e.keycode == KEY_T: hall.thermal = not hall.thermal; hall.rebuild()



## CI smoke test (GW_SMOKE=1): load the campus scenario, open every screen, act a little, quit. Prints SMOKE OK.
func _smoke() -> void:
	quiet = true; _load_scenario("stress-campus")
	for sc in SCREENS:
		show_screen(sc[0]); await get_tree().process_frame; await get_tree().process_frame
	if OS.get_environment("GW_PERF") == "play": b.act("newGame", [11, "operator"]); b.act("setMode", ["operator"]); b.env("autoplay", ["tycoon", 48]); hall.hall_i = 0
	if OS.has_environment("GW_PERF"):   # per-operation wall time on the biggest scenario
		var t := Time.get_ticks_usec(); hall.rebuild(); print("PERF hall.rebuild %.1f ms nodes=%d" % [(Time.get_ticks_usec() - t) / 1000.0, hall.dyn.get_child_count()])
		for sc in SCREENS:
			var n0 := Bridge.req_n; var u0 := Bridge.req_us; t = Time.get_ticks_usec(); show_screen(sc[0]); print("PERF screen %s %.1f ms  engine calls=%d (%.1f ms)" % [sc[0], (Time.get_ticks_usec() - t) / 1000.0, Bridge.req_n - n0, (Bridge.req_us - u0) / 1000.0])
		t = Time.get_ticks_usec(); b.act("nextMonth"); print("PERF nextMonth %.1f ms" % [(Time.get_ticks_usec() - t) / 1000.0])
		t = Time.get_ticks_usec(); _on_changed(); print("PERF on_changed %.1f ms" % [(Time.get_ticks_usec() - t) / 1000.0])
	b.act("nextMonth"); b.act("hireStaff", [1]); b.q("lifecycle"); b.q("staffing"); b.q("endReport")
	_settings(); await get_tree().process_frame; _settings()
	var years := int(OS.get_environment("GW_SMOKE_YEARS")) if OS.get_environment("GW_SMOKE_YEARS") != "" else 0
	if years > 0:   # long-horizon soak: a scripted tycoon plays year by year; every screen must still build
		b.act("newGame", [11, "operator"]); b.act("setMode", ["operator"])
		for y in years:
			b.env("autoplay", ["tycoon" if y % 2 == 0 else "operator", 12])
			for sc in SCREENS: show_screen(sc[0]); await get_tree().process_frame
			hall.hall_i = 0; hall.rebuild(); await get_tree().process_frame
			print("SOAK year=%d month=%d status=%s racks=%d clusters=%d" % [y + 1, int(b.g.month), str(b.g.get("status", "")), b.g.halls.reduce(func(n, h): return n + h.racks.size(), 0), b.g.clusters.size()])
			if b.g.get("status", "playing") != "playing": break
	for sl in 40: _inspect(sl)
	pad.set_active(true); await get_tree().process_frame
	for i in DOCK.size() + 1: pad._drawer(1); await get_tree().process_frame; await get_tree().process_frame; pad.ensure_focus(false)
	hall.pad_move(Vector2(0.5, 0.3), Vector2(0.4, -0.2), 0.5, 0.1); pad.inspect(); pad._back(); pad._back()
	var fo := get_viewport().gui_get_focus_owner()
	print("PAD OK focus=", fo.get_class() if fo != null else "none", " cur=", cur)
	pad.set_active(false)
	# tutorial: reading steps advance on "Got it", drawer steps on a visit; keynotes open and acknowledge cleanly
	var gm: Dictionary = b.g; coach.start(); assert(coach.idx == 0); coach._next()
	show_screen("contracts"); assert(coach.STEPS[coach.idx].id != "customers")
	var before: int = coach.idx; show_screen("shop"); show_screen("facility"); show_screen("dash")
	print("COACH OK step=", coach.STEPS[coach.idx].id, " (was ", before, ") card=", coach.card.visible)
	coach.stop(false)
	b.act("ackNews")
	var lk: Dictionary = b.q("launches"); print("LAUNCHES ", lk.list.size(), " news=", lk.news.size())
	print("SMOKE OK screens=%d racks=%d" % [SCREENS.size(), b.g.halls[0].racks.size()])
	b.stop(); get_tree().quit()

# ---------- settings + controls ----------
var settings_ui: Control
const CONTROLS := "[b]Space[/b] next month   [b]1-9, 0[/b] screens   [b]T[/b] thermal view   [b]Esc[/b] menu   [b]F1[/b] this panel\n[b]Left-drag[/b] or [b]WASD[/b] pan   [b]Right-drag[/b] orbit   [b]Wheel[/b] zoom   [b]Q/E[/b] rotate   [b]V[/b] top view   [b]L[/b] rack labels   [b]Ctrl+Q[/b] quit\n[b]Speed buttons[/b] pause / 1x / 2x / 3x auto-advance\n[b]Controller:[/b] A select · B back · X inspect rack · Y next month · LB/RB drawers · LT/RT zoom · L-stick pan · R-stick orbit · D-pad navigate · Start menu · View speed"
func _settings() -> void:
	if settings_ui != null: settings_ui.queue_free(); settings_ui = null; return
	var h := Control.new(); h.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_child(h); settings_ui = h
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.6); dim.set_anchors_preset(Control.PRESET_FULL_RECT); h.add_child(dim)
	var pn := PanelContainer.new(); pn.set_anchors_preset(Control.PRESET_CENTER); pn.offset_left = -360; pn.offset_right = 360; pn.offset_top = -245; pn.offset_bottom = 245
	pn.add_theme_stylebox_override("panel", Kit.sb(Color(0.03, 0.05, 0.08, 0.98), Kit.CY, 14, 2, 24)); h.add_child(pn)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 12); pn.add_child(vb)
	vb.add_child(Kit.label("SETTINGS", 30, Kit.CY))
	var vol := _slider_row(vb, "Volume", 0.0, 1.0, Settings.volume, func(v): Settings.volume = v; Settings.apply(get_window()); Settings.save_all())
	var scl := _slider_row(vb, "UI scale", 0.8, 2.0, Settings.ui_scale, func(v): Settings.ui_scale = snappedf(v, 0.05); Settings.apply(get_window()); Settings.save_all())
	var cb := CheckBox.new(); cb.text = "Colour-blind-safe cluster palette"; cb.button_pressed = Settings.colorblind; cb.toggled.connect(func(on): Settings.colorblind = on; Settings.save_all(); hall.rebuild()); vb.add_child(cb)
	var rm := CheckBox.new(); rm.text = "Reduced motion (no auto-orbit camera)"; rm.button_pressed = Settings.reduced_motion; rm.toggled.connect(func(on): Settings.reduced_motion = on; Settings.save_all()); vb.add_child(rm)
	var qr := HBoxContainer.new(); qr.add_theme_constant_override("separation", 14); vb.add_child(qr)
	var ql := Kit.label("Graphics", 16, Kit.TX); ql.custom_minimum_size = Vector2(130, 0); qr.add_child(ql)
	var qo := OptionButton.new(); for n in ["Low (fastest)", "Balanced", "High (all effects)"]: qo.add_item(n)
	qo.selected = Settings.quality; qo.item_selected.connect(func(i): Settings.quality = i; Settings.save_all(); hall.apply_quality()); qr.add_child(qo)
	vb.add_child(Kit.label("CONTROLS", 14, Kit.DIM)); vb.add_child(Kit.rich(CONTROLS, 15))
	vb.add_child(Kit.btn("Close", func(): settings_ui.queue_free(); settings_ui = null, "pri", 18))
	vol.grab_focus()

func _slider_row(parent: Control, title: String, lo: float, hi: float, val: float, on_change: Callable) -> HSlider:
	var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 14); parent.add_child(r)
	var l := Kit.label(title, 16, Kit.TX); l.custom_minimum_size = Vector2(130, 0); r.add_child(l)
	var s := HSlider.new(); s.min_value = lo; s.max_value = hi; s.step = 0.05; s.value = val; s.size_flags_horizontal = Control.SIZE_EXPAND_FILL; s.custom_minimum_size = Vector2(320, 24); s.value_changed.connect(on_change); r.add_child(s)
	return s

# ---------- game over + save slots ----------
var end_ui: Control
func _check_end() -> void:
	var st: String = b.g.get("status", "playing")
	if st == "playing" or end_ui != null or end_seen: return
	speed = 0; clock = 0.0; audio.play("gameover")
	var rep: Dictionary = b.q("endReport").get("report", {})
	if rep.is_empty(): return
	var won: bool = rep.reason == "horizon"; var col: Color = Kit.GR if won else Kit.RD
	var h := Control.new(); h.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_child(h); end_ui = h
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.72); dim.set_anchors_preset(Control.PRESET_FULL_RECT); h.add_child(dim)
	var pn := PanelContainer.new(); pn.set_anchors_preset(Control.PRESET_CENTER); pn.offset_left = -400; pn.offset_right = 400; pn.offset_top = -215; pn.offset_bottom = 215
	pn.add_theme_stylebox_override("panel", Kit.sb(Color(0.03, 0.05, 0.08, 0.98), col, 14, 2, 26)); h.add_child(pn)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 12); pn.add_child(vb)
	vb.add_child(Kit.label("2028 COMPLETE" if won else "GAME OVER", 20, Kit.DIM))
	vb.add_child(Kit.label(str(rep.rating).to_upper(), 54, col))
	vb.add_child(Kit.label(rep.summary, 17, Kit.TX, true))
	var grid := GridContainer.new(); grid.columns = 2; grid.add_theme_constant_override("h_separation", 60); grid.add_theme_constant_override("v_separation", 6); vb.add_child(grid)
	for kv in [["SCORE", Kit.num(rep.score)], ["NET WORTH", Kit.usd(rep.netWorth)], ["LIFETIME REVENUE", Kit.usd(rep.revenueTotal)], ["PEAK ACCELERATORS", Kit.num(rep.peakAccels)], ["CONTRACTS COMPLETED", str(int(rep.contractsCompleted))], ["REPUTATION", "★ %d" % int(rep.reputation)]]:
		var c := VBoxContainer.new(); c.add_child(Kit.label(kv[0], 11, Kit.DIM)); c.add_child(Kit.label(str(kv[1]), 26, Kit.TX)); grid.add_child(c)
	var row := HBoxContainer.new(); row.add_theme_constant_override("separation", 12); vb.add_child(row)
	row.add_child(Kit.btn("Look around the hall", func(): end_ui.queue_free(); end_ui = null; end_seen = true, "", 18))
	row.add_child(Kit.btn("Back to title", func(): _menu_do("title"), "pri", 18))
var end_seen := false

## Save-slot picker. mode = "save" or "load"; used by the pause menu and the title screen.
## Load a save slot into the running engine, then enter the game (resuming the tutorial where it was left).
func _load_slot(slot: String, on_loaded: Callable = Callable()) -> void:
	var r := b.act("load", [slot])
	if not r.get("ok", false): toast(str(r.get("message", "Load failed.")), "bad"); return
	cur_slot = slot if slot != "auto" else "main"
	if on_loaded.is_valid(): on_loaded.call()
	var t := root.get_node_or_null("title")
	if t: t.queue_free()
	_begin(); toast("Loaded %s." % Kit.date_of(int(b.g.month)), "good")
	if Settings.tutorial == "on" and Settings.tutorial_step < Coach.STEPS.size() and not OS.has_environment("GW_SMOKE"): coach.start(Settings.tutorial_step)
	check_keynote()

func _slots(mode: String, on_loaded: Callable = Callable()) -> void:
	var h := Control.new(); h.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_child(h)
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.6); dim.set_anchors_preset(Control.PRESET_FULL_RECT); h.add_child(dim)
	var pn := PanelContainer.new(); pn.set_anchors_preset(Control.PRESET_CENTER); pn.offset_left = -330; pn.offset_right = 330; pn.offset_top = -230; pn.offset_bottom = 230
	pn.add_theme_stylebox_override("panel", Kit.sb(Color(0.03, 0.05, 0.08, 0.98), Kit.CY, 14, 2, 22)); h.add_child(pn)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 10); pn.add_child(vb)
	vb.add_child(Kit.label("SAVE GAME" if mode == "save" else "LOAD GAME", 30, Kit.CY))
	var info := {}
	for s in b.q("saves"): info[s.slot] = s
	var slots: Array = ["main", "slot2", "slot3"] if mode == "save" else ["main", "slot2", "slot3", "auto"]
	for slot in slots:
		if mode == "load" and not info.has(slot): continue
		var nm: String = {"main": "Slot 1", "slot2": "Slot 2", "slot3": "Slot 3", "auto": "Autosave"}[slot]
		var d := "empty"
		if info.has(slot):
			var i: Dictionary = info[slot]; d = "%s · %s · %d racks%s" % [Kit.date_of(int(i.month)), Kit.usd(float(i.cash)), int(i.racks), "" if i.status == "playing" else " · " + str(i.status).to_upper()]
		var bt := Kit.btn("%s\n%s" % [nm, d], func():
			if mode == "save": b.act("save", [slot]); cur_slot = slot; toast("Saved to %s." % nm, "good"); h.queue_free()
			else: h.queue_free(); _load_slot(slot, on_loaded), "", 17)
		bt.custom_minimum_size = Vector2(0, 62); bt.alignment = HORIZONTAL_ALIGNMENT_LEFT; vb.add_child(bt)
	if mode == "load" and info.is_empty(): vb.add_child(Kit.label("No saved games yet.", 16, Kit.DIM))
	vb.add_child(Kit.btn("Close", func(): h.queue_free(), "", 16))

func _menu() -> void:
	if menu_ui != null: menu_ui.queue_free(); menu_ui = null; return
	var h := Control.new(); h.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_child(h); menu_ui = h
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.6); dim.set_anchors_preset(Control.PRESET_FULL_RECT); h.add_child(dim)
	var vb := VBoxContainer.new(); vb.set_anchors_preset(Control.PRESET_CENTER); vb.offset_left = -220; vb.offset_right = 220; vb.offset_top = -220; vb.offset_bottom = 220; vb.add_theme_constant_override("separation", 12); h.add_child(vb)
	vb.add_child(Kit.label("PAUSED", 44, Kit.CY))
	for a in [["Resume", "resume"], ["Save game", "save"], ["Load game", "load"], ["Settings", "settings"], ["Restart tutorial", "coach"], ["Toggle sound", "mute"], ["Save & quit to title", "title"], ["Save & quit game", "quit"]]:
		var bt := Kit.btn(a[0], func(): _menu_do(a[1]), "pri" if a[1] == "resume" else "", 20); bt.custom_minimum_size = Vector2(0, 52); vb.add_child(bt)

func _menu_do(a: String) -> void:
	match a:
		"resume": _menu()
		"save": _menu(); _slots("save")
		"load": _menu(); _slots("load")
		"settings": _menu(); _settings()
		"coach": _menu(); if started: coach.start()
		"mute": audio.muted = not audio.muted
		"title": _autosave(); b.stop(); get_tree().reload_current_scene()
		"quit":
			_autosave()
			if b != null: b.stop()
			get_tree().quit()

## Quitting never overwrites a manual slot: the latest state goes to the autosave, which Continue picks up.
func _autosave() -> void:
	if started and b != null and end_ui == null: b.act("save", ["auto"])

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		_autosave()
		if b != null: b.stop()
		get_tree().quit()

## Screenshot helper (GW_DEMO=<months>): start Easy-path projects for the first offers and fast-forward.
func _demo(months: int) -> void:
	quiet = true
	b.act("takeLoan", [200000000.0 * maxf(1.0, float(OS.get_environment("GW_DEMO_N").to_int()) / 3.0)])
	var nproj := int(OS.get_environment("GW_DEMO_N")) if OS.get_environment("GW_DEMO_N") != "" else 3
	for k in nproj:
		for c in b.g.availableContracts:
			var opts: Array = b.q("buildOptions", [c.id, null])
			if opts.is_empty(): continue
			var r: Dictionary = b.act("startEasy", [c.id, opts[0].t.id, int(opts[0].racks)])
			print("DEMO ", r.ok, " ", r.message.left(120))
			if r.ok: break
	for i in months: b.act("nextMonth", [])
	_seen_log = b.g.log.size(); print("DEMO racks ", b.g.halls[0].racks.size(), " clusters ", b.g.clusters.size(), " active ", b.g.activeContracts.size())
	hall.rebuild(); _on_changed(); quiet = false
	if OS.get_environment("GW_THERMAL") != "": hall.thermal = true; hall.rebuild()
	var cam := OS.get_environment("GW_CAM")
	if cam != "":
		var c := cam.split_floats(",")
		hall.yaw = c[0]; hall.pitch = c[1]; hall.dist = c[2]; hall.target = Vector3(c[3], 0.8, c[4]); hall.auto_orbit = false; hall._update_cam()
