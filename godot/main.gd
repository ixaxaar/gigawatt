extends Node
## App shell: engine bridge + 3D hall + top bar, dock, screens, toasts. Screens live in ui/screens.

const SCREENS := [["dash", "", "Datacenter"], ["shop", "", "Procure"], ["design", "", "Design Lab"], ["facility", "", "Build"], ["stock", "", "Warehouse"], ["energy", "", "Energy"], ["network", "", "Supercomputer"], ["contracts", "", "Customers"], ["codex", "", "Codex"]]
const SCRIPTS := {"dash": "res://ui/screens/dash.gd", "shop": "res://ui/screens/procure.gd", "stock": "res://ui/screens/stock.gd", "contracts": "res://ui/screens/contracts.gd", "facility": "res://ui/screens/facility.gd", "codex": "res://ui/screens/codex.gd", "energy": "res://ui/screens/energy.gd", "network": "res://ui/screens/network.gd", "design": "res://ui/screens/design.gd"}
const OVERLAY := ["dash", "facility"]
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

func _ready() -> void:
	get_tree().set_auto_accept_quit(false)
	b = Bridge.new(); add_child(b)
	if not b.start(): push_error(b.last_error); _fatal(b.last_error); return
	hall = HallView.new(); add_child(hall); hall.b = b
	audio = GameAudio.new(); add_child(audio)
	ui = CanvasLayer.new(); ui.layer = 10; add_child(ui)
	root = Control.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var th := Theme.new(); th.default_font_size = 17; th.default_font = Fonts.regular; th.set_font("bold_font", "RichTextLabel", Fonts.bold); th.set_font("normal_font", "RichTextLabel", Fonts.regular); root.theme = th
	ui.add_child(root)
	_build_shell(); _title()
	b.changed.connect(_on_changed)
	hall.slot_clicked.connect(func(s): if cur == "facility" and screens.has("facility"): screens["facility"].on_slot(s))
	var auto := OS.get_environment("GW_AUTOSTART")
	if auto != "": _new_game(auto); if OS.get_environment("GW_DEMO") != "": _demo(int(OS.get_environment("GW_DEMO")))
	if OS.get_environment("GW_SCREEN") != "": show_screen(OS.get_environment("GW_SCREEN")); if OS.get_environment("GW_DBG") != "": get_tree().create_timer(0.6).timeout.connect(_dbg)

func _fatal(msg: String) -> void:
	var l := Label.new(); l.text = "GIGAWATT engine failed to start:\n" + msg; l.position = Vector2(60, 60); add_child(l)

# ---------- shell ----------
func _build_shell() -> void:
	top = PanelContainer.new(); top.set_anchors_preset(Control.PRESET_TOP_WIDE); top.offset_bottom = 66; top.add_theme_stylebox_override("panel", Kit.sb(Color(0.03, 0.05, 0.08, 0.94), Kit.LINE, 0, 1, 14)); root.add_child(top)
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 20); top.add_child(hb)
	hb.add_child(Kit.label("GIGAWATT", 24, Kit.CY))
	var dv := VBoxContainer.new(); dv.custom_minimum_size = Vector2(110, 0); lbl.date = Kit.label("", 20); bar_month = Kit.bar(0, 1); dv.add_child(lbl.date); dv.add_child(bar_month); hb.add_child(dv)
	for p in [["CASH", "cash"], ["DEBT", "debt"], ["NET WORTH", "nw"], ["REPUTATION", "rep"]]:
		var v := VBoxContainer.new(); v.add_child(Kit.label(p[0], 10, Kit.DIM)); lbl[p[1]] = Kit.label("", 19); v.add_child(lbl[p[1]]); hb.add_child(v)
	var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; hb.add_child(sp)
	lbl.mode = Kit.btn("", func(): var m: String = b.g.get("mode", "operator"); b.act("setMode", ["operator" if m == "learner" else ("tycoon" if m == "operator" else "learner")]), "", 14); hb.add_child(lbl.mode)
	hb.add_child(Kit.btn("How to play", func(): guide.visible = true; guide.open(), "", 14))
	hb.add_child(Kit.btn("Sound", func(): audio.muted = not audio.muted, "", 14))
	hb.add_child(Kit.btn("Save", func(): var r := b.act("save"); toast("Game saved.", "good"), "", 14))
	for s in [["⏸", 0], ["▶", 1], ["▶▶", 2], ["▶▶▶", 3]]:
		var bt := Kit.btn(s[0], func(): set_speed(s[1]), "", 15); bt.custom_minimum_size = Vector2(46, 0); lbl["sp%d" % s[1]] = bt; hb.add_child(bt)
	hb.add_child(Kit.btn("NEXT MONTH ▶", next_month, "go", 17))
	hb.add_child(Kit.btn("MENU", func(): _menu(), "", 14))
	hb.add_child(Kit.btn("QUIT ✕", func(): _menu_do("quit"), "danger", 14))
	holder = Control.new(); holder.set_anchors_preset(Control.PRESET_FULL_RECT); holder.offset_top = 76; holder.offset_bottom = -92; holder.offset_left = 14; holder.offset_right = -14; holder.mouse_filter = Control.MOUSE_FILTER_IGNORE; root.add_child(holder)
	var dock := HBoxContainer.new(); dock.set_anchors_preset(Control.PRESET_CENTER_BOTTOM); dock.offset_top = -84; dock.offset_bottom = -10; dock.offset_left = -560; dock.offset_right = 560; dock.add_theme_constant_override("separation", 8); root.add_child(dock)
	for i in SCREENS.size():
		var s: Array = SCREENS[i]
		var d := Kit.btn("%s [%d]" % [s[2], i + 1], func(): show_screen(s[0]), "", 14); d.custom_minimum_size = Vector2(118, 60); dock.add_child(d); dock_btns[s[0]] = d
	guide = GuideOverlay.new(); guide.app = self; guide.visible = false; root.add_child(guide)
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
	var vb := VBoxContainer.new(); vb.set_anchors_preset(Control.PRESET_CENTER_LEFT); vb.offset_left = 90; vb.offset_top = -270; vb.offset_bottom = 270; vb.offset_right = 780; vb.add_theme_constant_override("separation", 12); h.add_child(vb)
	vb.add_child(Kit.label("AI DATACENTER TYCOON", 18, Kit.DIM)); vb.add_child(Kit.label("GIGAWATT", 110, Kit.CY))
	vb.add_child(Kit.label("Buy real GPUs. Design trays, racks and fabrics. Wire power and liquid cooling. Lease capacity for training and inference — and learn the whole AI hardware stack by surviving it. 2020 → 2028.", 20, Kit.TX, true))
	for m in [["learner", "LEARNER", "I don't know what a chiller is · $80M · explainers everywhere · \"Do it for me\" Easy path"], ["operator", "OPERATOR", "I know the basics · $50M · guided planner and checklists"], ["tycoon", "TYCOON", "Just give me the keys · $30M · no hand-holding"]]:
		var bt := Kit.btn("%s\n%s" % [m[1], m[2]], func(): h.queue_free(); _new_game(m[0]), "pri" if m[0] == "operator" else "", 18); bt.custom_minimum_size = Vector2(640, 76); bt.alignment = HORIZONTAL_ALIGNMENT_LEFT; vb.add_child(bt)
	b.act("newGame", [7, "operator"]); _demo_hall()
	vb.add_child(Kit.btn("CONTINUE SAVED GAME", func(): var r := b.act("load"); if r.get("ok", false): h.queue_free(); _begin(), "", 18))
	vb.add_child(Kit.btn("QUIT", func(): get_tree().quit(), "", 16))
	vb.add_child(Kit.label("Right-drag orbit · wheel zoom · WASD pan · Space next month · 1-9 screens · Esc menu", 14, Kit.DIM))
	hall.dist = 13.0; hall.pitch = 0.32; hall.auto_orbit = true; hall.hall_i = 0; hall.rebuild(); hall.cam.h_offset = -4.5

func _demo_hall() -> void: pass

func _new_game(mode: String) -> void:
	b.act("newGame", [int(Time.get_unix_time_from_system()) % 100000, mode]); b.act("setMode", [mode]); _begin()

func _begin() -> void:
	var tt := root.get_node_or_null("title")
	if tt: tt.queue_free()
	started = true; _seen_log = b.g.log.size(); speed = 0; clock = 0.0
	hall.cam.h_offset = 0.0; hall.hall_i = 0; hall.dist = 17.0; hall.pitch = 0.42; hall.auto_orbit = true
	_shell_visible(true); show_screen("dash"); _on_changed(); hall.rebuild()

func _on_changed() -> void:
	if not started: return
	var g := b.g
	lbl.date.text = Kit.date_of(g.month); lbl.cash.text = Kit.usd(g.cash); lbl.cash.add_theme_color_override("font_color", Kit.GR if g.cash >= 0 else Kit.RD)
	lbl.debt.text = Kit.usd(g.debt); lbl.nw.text = Kit.usd(float(b.q("netWorth"))); lbl.rep.text = "★ %d" % int(g.reputation)
	lbl.mode.text = {"learner": "Learner", "operator": "Operator", "tycoon": "Tycoon"}.get(g.get("mode", "operator"), "")
	for i in 4: lbl["sp%d" % i].modulate = Color(0.5, 1.0, 0.9) if i == speed else Color.WHITE
	for i in range(_seen_log, g.log.size()):
		var e: Dictionary = g.log[i]
		if e.level != "info": toast(e.text, e.level)
	_seen_log = g.log.size()
	hall.rebuild()
	if hall.get_meta("n", 0) == 0: pass
	if screens.has(cur): Kit.refresh_keep(screens[cur])

var quiet := false
func toast(text: String, level := "info") -> void:
	if quiet: return
	audio.play("good" if level == "good" else ("bad" if level == "bad" else "click"))
	var p := PanelContainer.new(); var col := Kit.GR if level == "good" else (Kit.RD if level == "bad" else Kit.CY)
	p.add_theme_stylebox_override("panel", Kit.sb(Color(0.05, 0.08, 0.12, 0.94), col, 8, 1, 10)); p.add_child(Kit.label(text, 14, Kit.TX, true)); p.custom_minimum_size = Vector2(460, 0); toasts.add_child(p)
	while toasts.get_child_count() > 5: toasts.get_child(0).queue_free(); toasts.remove_child(toasts.get_child(0))
	var tw := create_tween(); tw.tween_interval(6.0); tw.tween_property(p, "modulate:a", 0.0, 1.0); tw.tween_callback(p.queue_free)

func sfx(k: String) -> void: audio.play(k)

func show_screen(id: String) -> void:
	for s in screens.values(): s.visible = false
	cur = id
	hall.visible = OVERLAY.has(id)
	if not screens.has(id): screens[id] = _make_screen(id); holder.add_child(screens[id])
	screens[id].visible = true
	if screens[id].has_method("refresh"): screens[id].refresh()
	for k in dock_btns: dock_btns[k].modulate = Color(0.5, 1.0, 0.9) if k == id else Color.WHITE

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
		var bg := PanelContainer.new(); bg.set_anchors_preset(Control.PRESET_FULL_RECT); bg.add_theme_stylebox_override("panel", Kit.sb(Color(0.03, 0.045, 0.07, 1.0), Kit.LINE, 12, 1, 14)); bg.mouse_filter = Control.MOUSE_FILTER_STOP
		c.set_anchors_preset(Control.PRESET_FULL_RECT); c.offset_left = 16; c.offset_top = 14; c.offset_right = -16; c.offset_bottom = -14
		var w := ScreenWrap.new(); w.set_anchors_preset(Control.PRESET_FULL_RECT); w.add_child(bg); w.add_child(c); w.inner = c; return w
	return c

func set_speed(v: int) -> void: speed = v; clock = 0.0; _on_changed()

func next_month() -> void:
	if not started: return
	audio.play("month"); b.act("nextMonth"); b.act("stepEasy"); _claim()
	if OS.get_environment("GW_NOAUTOSAVE") == "": pass

func _claim() -> void:
	for m in b.claim_missions(): banner.text = "★ MISSION COMPLETE ★  %s" % m.title; audio.play("good"); get_tree().create_timer(3.2).timeout.connect(func(): banner.text = "")

func _process(dt: float) -> void:
	_process_tip()
	if not started or speed == 0 or menu_ui != null: return
	clock += dt / SECS[speed]; bar_month.value = clock
	if clock >= 1.0: clock = 0.0; next_month()

func _dbg() -> void:
	for k in screens: print(k, " rect=", screens[k].get_global_rect(), " vis=", screens[k].visible)
	print("holder=", holder.get_global_rect())

func _input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed and not e.echo:
		if e.keycode == KEY_Q and e.ctrl_pressed: _menu_do("quit" if started else "quit")
		elif e.keycode == KEY_ESCAPE and started: get_viewport().set_input_as_handled(); _menu()

var tip_panel: PanelContainer
var tip_lbl: RichTextLabel
func _on_rack_hover(slot: int, rk: Dictionary) -> void:
	if slot < 0 or rk.is_empty() or cur != "dash": tip_panel.visible = false; return
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
	if e.keycode == KEY_SPACE: next_month(); return
	if e.keycode >= KEY_1 and e.keycode <= KEY_9: show_screen(SCREENS[e.keycode - KEY_1][0])
	elif e.keycode == KEY_T: hall.thermal = not hall.thermal; hall.rebuild()

func _menu() -> void:
	if menu_ui != null: menu_ui.queue_free(); menu_ui = null; return
	var h := Control.new(); h.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_child(h); menu_ui = h
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.6); dim.set_anchors_preset(Control.PRESET_FULL_RECT); h.add_child(dim)
	var vb := VBoxContainer.new(); vb.set_anchors_preset(Control.PRESET_CENTER); vb.offset_left = -220; vb.offset_right = 220; vb.offset_top = -190; vb.offset_bottom = 190; vb.add_theme_constant_override("separation", 12); h.add_child(vb)
	vb.add_child(Kit.label("PAUSED", 44, Kit.CY))
	for a in [["Resume", "resume"], ["Save game", "save"], ["Toggle sound", "mute"], ["Quit to title", "title"], ["Quit game", "quit"]]:
		var bt := Kit.btn(a[0], func(): _menu_do(a[1]), "pri" if a[1] == "resume" else "", 20); bt.custom_minimum_size = Vector2(0, 52); vb.add_child(bt)

func _menu_do(a: String) -> void:
	match a:
		"resume": _menu()
		"save": b.act("save"); toast("Game saved.", "good"); _menu()
		"mute": audio.muted = not audio.muted
		"title": b.act("save"); b.stop(); get_tree().reload_current_scene()
		"quit":
			if started and b != null: b.act("save")
			if b != null: b.stop()
			get_tree().quit()

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		if started and b != null: b.act("save")
		if b != null: b.stop()
		get_tree().quit()

## Screenshot helper (GW_DEMO=<months>): start Easy-path projects for the first offers and fast-forward.
func _demo(months: int) -> void:
	quiet = true
	b.act("takeLoan", [200000000.0])
	for k in 3:
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
