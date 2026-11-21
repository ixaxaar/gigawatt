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
	var w := vw()
	var f := Settings.drawer_frac if Settings.drawer_frac > 0.0 else (0.30 if Layout.phone else -1.0)   # the player drags the divider to resize it
	if f > 0.0: return clampf(w * f, 380.0 if Layout.phone else 300.0, maxf(380.0, w - (RAIL_W + 14.0 if Layout.phone else 300.0)))
	var dk := dock_key(id)   # every tab of one drawer has the drawer's width (Procure and Warehouse used to differ, so the drawer jumped)
	if Layout.handheld: return minf(w * 0.74, w - 140.0)   # one width for every drawer on handhelds
	return minf(clampf(w * 0.62, 900.0, 1240.0) if dk == "shop" else clampf(w * 0.5, 780.0, 980.0), w - 300.0)
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
var cur_slot := ""   # the slot this run was last saved to or loaded from: saving over any other occupied slot asks first
var speed := 0
var clock := 0.0
var _seen_log := 0
var toasts: VBoxContainer
var top: PanelContainer
var lbl := {}
var bar_month: ProgressBar
var dock_btns := {}
var menu_ui: Control
var guide: GuideOverlay
var keynote: KeynoteOverlay
var story_ui: StoryOverlay
var dilemma_dismissed := ""
var coach: Coach
var next_btn: Button
var menu_btn: Button

func _ready() -> void:
	get_tree().set_auto_accept_quit(false)
	Settings.load_all()
	if Settings.ensure_gpu(): get_tree().quit(); return
	if OS.has_environment("GW_THEME"): Settings.theme = OS.get_environment("GW_THEME")
	Kit.set_theme(Settings.theme); Settings.apply(get_window()); Settings.write_log(get_window())
	Layout.update(get_window()); get_window().content_scale_factor = Settings.effective_ui_scale(get_window())
	get_window().size_changed.connect(func():
		var was: String = Layout.kind
		get_window().content_scale_factor = Settings.effective_ui_scale(get_window())
		if get("hall") != null and hall != null: hall.apply_scale()
		if was != Layout.kind or true: call_deferred("_on_resized", was))
	add_child(WrapGuard.new())
	if Layout.touch: add_child(TouchScroll.new())   # finger scrolling from anywhere, no scrollbars
	b = Bridge.new(); add_child(b)
	if not b.start(): push_error(b.last_error); _fatal(b.last_error); return
	hall = HallView.new(); add_child(hall); hall.b = b
	audio = GameAudio.new(); add_child(audio); audio.hook_ui(get_tree())
	ui = CanvasLayer.new(); ui.layer = 10; add_child(ui)
	root = Control.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var th := Theme.new(); th.default_font_size = 17; th.default_font = Fonts.regular; th.set_font("bold_font", "RichTextLabel", Fonts.bold); th.set_font("normal_font", "RichTextLabel", Fonts.regular); root.theme = th
	ui.add_child(root)
	_build_shell(); _relayout(); _title(); audio.play("boot")
	if Settings.compat and Settings.preset < 0 and RenderingServer.get_current_rendering_method() == "gl_compatibility": get_tree().create_timer(1.2).timeout.connect(func(): toast("Running in compatibility mode on %s (no Forward+). Effects are reduced; see the wiki's Performance page." % Settings.adapter, "info"))
	pad = Pad.new(); pad.app = self; add_child(pad)
	coach = Coach.new(); coach.app = self; add_child(coach)
	b.changed.connect(_on_changed)
	b.refused.connect(func(_a, why): toast(why, "bad"))   # every refused action explains itself, wherever the player is scrolled to
	hall.slot_clicked.connect(func(s): if cur == "facility" and screens.has("facility"): screens["facility"].on_slot(s) else: _inspect(s))
	var auto := OS.get_environment("GW_AUTOSTART")
	if auto != "": _new_game(auto); if OS.get_environment("GW_DEMO") != "": _demo(int(OS.get_environment("GW_DEMO")))
	if OS.get_environment("GW_SMOKE") != "": _smoke(); return
	if OS.get_environment("GW_SITE") != "" and started:   # screenshots: GW_SITE="floor:checker,walls:brick,light:warm,accent:cyan"
		var st := {}; for kv in OS.get_environment("GW_SITE").split(","): var pr := kv.split(":"); if pr.size() == 2: st[pr[0]] = pr[1]
		b.act("setSite", [st])
	if OS.get_environment("GW_TOUR") != "" and started: _tour(OS.get_environment("GW_TOUR"))
	if OS.get_environment("GW_SITE_SCREEN") != "": _pick_site("operator", root.get_node("title"), true) if root.has_node("title") else _change_look()
	if OS.get_environment("GW_SETTINGS") != "": _settings()
	if OS.get_environment("GW_AUTOPLAY") != "": quiet = true; var ap := OS.get_environment("GW_AUTOPLAY").split(":"); b.env("autoplay", [ap[0], int(ap[1])]);; quiet = false   # screenshots: "tycoon:48"
	if OS.get_environment("GW_FF") != "": for i in int(OS.get_environment("GW_FF")): b.act("nextMonth")   # screenshots/tests: fast-forward
	if OS.get_environment("GW_CONTINUE") != "" and b.qa("saves").size() > 0: _load_slot(str(b.qa("saves")[0].slot))   # tests: press CONTINUE
	if OS.get_environment("GW_SCENARIO") != "": _load_scenario(OS.get_environment("GW_SCENARIO"))
	if OS.get_environment("GW_CAM") != "" and OS.get_environment("GW_SCENARIO") == "" and started:   # screenshots: explicit camera on a normal game
		var cc := OS.get_environment("GW_CAM").split_floats(","); if cc.size() >= 5: hall.yaw = cc[0]; hall.pitch = cc[1]; hall.dist = cc[2]; hall.target = Vector3(cc[3], 0.8, cc[4]); hall.auto_orbit = false; hall._update_cam()
	if OS.get_environment("GW_AUDIT") != "": get_tree().create_timer(4.0).timeout.connect(_audit_layout)
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
	if OS.get_environment("GW_CLEAN") != "" and screens.has(cur): screens[cur].visible = false; hall.set_cover(0.0)   # screenshots: just the 3D hall
	if OS.get_environment("GW_CARD") != "":   # docs: show a story card (chapter:N or dilemma:N)
		var cd := OS.get_environment("GW_CARD").split(":")
		get_tree().create_timer(1.0).timeout.connect(func():
			var sample: Dictionary = b.q("storySample", [cd[0], int(cd[1]) if cd.size() > 1 else 0])
			if cd[0] == "chapter": story_ui.open_chapter(sample)
			else: story_ui.open_dilemma(sample))
	if OS.get_environment("GW_SHOT") != "":   # docs/tests: save the window to a PNG after GW_SHOT_AT seconds (default 6) and quit
		get_tree().create_timer(float(OS.get_environment("GW_SHOT_AT")) if OS.get_environment("GW_SHOT_AT") != "" else 6.0).timeout.connect(func(): get_viewport().get_texture().get_image().save_png(OS.get_environment("GW_SHOT")); get_tree().quit())

## New game step: choose the hall's surroundings, then start. Back returns to the title.
func _pick_site(mode: String, title_h: Control, force := false) -> void:
	if Settings.site_seen and not force:   # asked once; later games reuse the last look
		title_h.queue_free(); _new_game(mode)
		if not Settings.site_last.is_empty(): b.act("setSite", [Settings.site_last])
		return
	title_h.visible = false
	var sc := SiteScreen.new(); sc.name = "site"; root.add_child(sc)
	sc.open(self, Site.DEFAULT, "CHOOSE YOUR SITE", "Start game ▶", func(st): Settings.site_seen = true; Settings.site_last = st.duplicate(); Settings.save_all(); title_h.queue_free(); _new_game(mode); b.act("setSite", [st]), func(): title_h.visible = true)

## Pause menu: change the look of a running game.
func _change_look() -> void:
	var sc := SiteScreen.new(); sc.name = "site"; root.add_child(sc)
	sc.open(self, Site.style_of(b.g), "CHANGE LOOK", "Apply", func(st): Settings.site_last = st.duplicate(); Settings.save_all(); b.act("setSite", [st]); hall.rebuild(), func(): pass)

## Scripted tours for recording the guide GIFs (GW_TOUR=basics|showroom|cables|looks|themes; see scripts/gifs.sh). Ends by quitting.
func _wait(sec: float) -> void: await get_tree().create_timer(sec).timeout

func _fly(yaw: float, pitch: float, dist: float, target: Vector3, sec: float) -> void:
	hall.auto_orbit = false
	var y0: float = hall.yaw; var p0: float = hall.pitch; var d0: float = hall.dist; var t0: Vector3 = hall.target
	var tw := create_tween(); tw.tween_method(func(k: float): hall.yaw = lerpf(y0, yaw, k); hall.pitch = lerpf(p0, pitch, k); hall.dist = lerpf(d0, dist, k); hall.target = t0.lerp(target, k); hall._update_cam(), 0.0, 1.0, sec).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	await tw.finished

func _tour(name: String) -> void:
	quiet = true; await _wait(0.8)
	var hl: Dictionary = b.g.halls[0]; var ctr: Vector2 = hall._wall_rect(hl).get_center()
	match name:
		"basics":   # the loop in one clip: drawers, thermal view, then months passing
			for id in ["dash", "contracts", "shop", "facility", "ops", "design"]: _dock(id); await _wait(1.5)
			show_screen("dash"); await _wait(0.6); hall.thermal = true; hall.rebuild(); await _wait(1.6); hall.thermal = false; hall.rebuild()
			quiet = false
			for i in 6: next_month(); await _wait(0.7)
		"showroom":   # pick a platform, open the door, show the cabling
			show_screen("shop"); var ps = screens["shop"]; await _wait(1.8)
			var plats := []; for t in b.templates: if not plats.has(t.platform): plats.append(t.platform)
			for k in 4: ps.plat = plats[k]; ps.tier_sel = ""; ps.refresh(); await _wait(1.9)
			if ps.showroom != null: ps.showroom.set_cables(true); ps.refresh(); await _wait(2.6); ps.showroom.set_door(false); ps.refresh(); await _wait(1.6)
		"cables":   # from the whole hall down to the rear of a rack
			_shell_visible(false); hall.top_view(); await _wait(1.0)
			await _fly(0.5, 0.7, 12.0, Vector3(3.0, 0.8, 2.0), 2.4); await _fly(0.0, 0.35, 3.0, Vector3(2.4, 0.8, 0.3), 2.8); await _fly(0.0, 0.3, 1.6, Vector3(1.4, 1.0, 0.3), 2.0); await _fly(0.0, 0.3, 1.6, Vector3(3.6, 1.0, 0.3), 3.0); await _wait(0.6)
		"looks":   # floors, racks, walls and light moods
			_shell_visible(false); hall.target = Vector3(ctr.x, 0.8, ctr.y); hall.dist = 20.0; hall.pitch = 0.5; hall.auto_orbit = true; hall.orbit_speed = 0.22; hall.set_cover(0.0)
			for st in [{"floor": "tile", "rack": "black", "walls": "block", "light": "neutral", "accent": "red"}, {"floor": "white", "rack": "white", "walls": "block", "light": "neutral", "accent": "cyan"}, {"floor": "black", "rack": "steel", "walls": "steel", "light": "cool", "accent": "magenta"},
					{"floor": "parquet", "rack": "graphite", "walls": "brick", "light": "warm", "accent": "orange"}, {"floor": "walnut", "rack": "black", "walls": "stone", "light": "warm", "accent": "yellow"}, {"floor": "steel", "rack": "white", "walls": "glass", "light": "neutral", "accent": "green"}, {"floor": "concrete", "rack": "steel", "walls": "block", "light": "night", "accent": "cyan"}]:
				b.act("setSite", [st]); await _wait(1.8)
		"themes":   # every UI theme on the Overview
			show_screen("dash"); await _wait(0.8)
			for t in Kit.THEMES: Settings.theme = t.id; _restyle(); await _wait(1.3)
	await _wait(0.4); get_tree().quit()

func _fatal(msg: String) -> void:
	var l := Label.new(); l.text = "GIGAWATT engine failed to start:\n" + msg; l.position = Vector2(60, 60); add_child(l)

# ---------- shell ----------
func _build_shell() -> void:
	top = PanelContainer.new(); top.set_anchors_preset(Control.PRESET_TOP_WIDE); top.offset_bottom = 66; top.add_theme_stylebox_override("panel", _top_sb(Kit.CY)); root.add_child(top)
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 16); top.add_child(hb)
	lbl.title = Kit.label("GIGAWATT", 26, Color("#ffd23f") if Kit.dark else Kit.AM); hb.add_child(lbl.title)
	var dv := VBoxContainer.new(); dv.custom_minimum_size = Vector2(110, 0); lbl.date = Kit.label("", 20); bar_month = Kit.bar(0, 1); dv.add_child(lbl.date); dv.add_child(bar_month); hb.add_child(dv)
	for p in [["CASH", "cash"], ["REVENUE / MO", "rev"], ["BURN / MO", "burn"], ["NET / MO", "net"], ["NET WORTH", "nw"], ["NETWORK", "netw"], ["DEBT", "debt"], ["REP", "rep"]]:   # the money line: what used to be the Overview plaques
		var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 0); v.add_child(Kit.label(p[0], 10, Kit.DIM)); lbl[p[1]] = Kit.label("", 20); v.add_child(lbl[p[1]]); hb.add_child(v); lbl[p[1] + "_box"] = v
		v.mouse_filter = Control.MOUSE_FILTER_PASS; v.mouse_entered.connect(_bar_tip.bind(v)); v.mouse_exited.connect(_bar_tip.bind(null))   # explained in a tip under the bar, never over the neighbouring figures
	lbl.netw_box.mouse_filter = Control.MOUSE_FILTER_STOP; lbl.netw_box.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	lbl.netw_box.gui_input.connect(func(e): if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT: go("network"))
	var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; hb.add_child(sp)
	lbl.mode = Kit.btn("Operator", func(): var m: String = b.g.get("mode", "operator"); var nx: String = "operator" if m == "learner" else ("tycoon" if m == "operator" else "learner"); Kit.confirm(self, "Switch to %s mode? Learner shows explainers and Easy path, Operator adds guided checklists, Tycoon has no hand-holding. Your cash and hall stay as they are." % nx.capitalize(), func(): b.act("setMode", [nx]), "Switch"), "", 14); lbl.mode.custom_minimum_size = Vector2(112, 0); lbl.mode.tooltip_text = "Game mode: Learner (explainers, no bankruptcy), Operator, Tycoon. Click to change."; hb.add_child(lbl.mode)
	# Time control: one segmented switch, ⏸ | 1x | 2x | 3x, the active speed lit. Every segment is an action, so what you see is what you get.
	lbl.speed = HBoxContainer.new(); lbl.speed.add_theme_constant_override("separation", 2); hb.add_child(lbl.speed); lbl.speed_btns = []
	for i in 4:
		var sb := Kit.btn(["⏸", "1x", "2x", "3x"][i], set_speed.bind(i), "", 15); sb.tooltip_text = ["Pause", "Advance a month every 4 seconds", "Every 1.6 seconds", "Every 0.6 seconds"][i] + " (Space: one month now)"
		lbl.speed.add_child(sb); lbl.speed_btns.append(sb)
	next_btn = Kit.btn("NEXT MONTH ▶", next_month, "go", 17); hb.add_child(next_btn)
	menu_btn = Kit.btn("MENU", func(): _menu(), "", 14); hb.add_child(menu_btn)
	holder = Control.new(); holder.set_anchors_preset(Control.PRESET_FULL_RECT); holder.offset_top = 76; holder.offset_bottom = -92; holder.offset_left = 14; holder.offset_right = -14; holder.mouse_filter = Control.MOUSE_FILTER_IGNORE; holder.clip_contents = true; root.add_child(holder)
	dock_scroll = ScrollContainer.new(); dock_scroll.set_anchors_preset(Control.PRESET_BOTTOM_WIDE); dock_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; dock_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO; root.add_child(dock_scroll)
	dock_box = BoxContainer.new(); var dock := dock_box; dock.size_flags_horizontal = Control.SIZE_EXPAND_FILL; dock.add_theme_constant_override("separation", 8); dock_scroll.add_child(dock)
	for i in DOCK.size():
		var dk: Array = DOCK[i]
		var d := Kit.dock_btn(dk[1], str((i + 1) % 10), dk[2], func(): _dock(dk[0])); _dock_meta(d, dk[1], i); dock.add_child(d); dock_btns[dk[0]] = d
	guide = GuideOverlay.new(); guide.app = self; guide.visible = false; root.add_child(guide)
	keynote = KeynoteOverlay.new(); keynote.app = self; keynote.visible = false; root.add_child(keynote)
	story_ui = StoryOverlay.new(); story_ui.app = self; story_ui.visible = false; root.add_child(story_ui)
	tip_panel = PanelContainer.new(); tip_panel.add_theme_stylebox_override("panel", Kit.sb(Kit.field(0.96), Kit.CY, 8, 1, 10)); tip_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE; tip_panel.visible = false
	tip_lbl = Kit.rich("", 13); tip_lbl.custom_minimum_size = Vector2(300, 0); tip_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE; tip_panel.add_child(tip_lbl); root.add_child(tip_panel)
	hall.hover_changed.connect(_on_rack_hover)
	hall.rack_event.connect(func(kind: String, _n: int): if not quiet and started and kind != "arrived": sfx("online" if kind == "online" else "incident"))   # racks coming online / going down are heard as well as seen
	toasts = VBoxContainer.new(); toasts.set_anchors_preset(Control.PRESET_TOP_RIGHT); toasts.offset_left = -480; toasts.offset_right = -14; toasts.offset_top = 76; toasts.mouse_filter = Control.MOUSE_FILTER_IGNORE; toasts.add_theme_constant_override("separation", 6); root.add_child(toasts)
	heat_key = PanelContainer.new(); heat_key.mouse_filter = Control.MOUSE_FILTER_IGNORE; heat_key.visible = false; heat_key.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.9), Kit.LINE, 10, 1, 8)); root.add_child(heat_key)
	var hk := Kit.rich("HEAT   [color=#3b82f6]■[/color] cool   [color=#22c55e]■[/color] fine   [color=#eab308]■[/color] warm   [color=#ef4444]■[/color] too hot", 13); hk.mouse_filter = Control.MOUSE_FILTER_IGNORE; hk.autowrap_mode = TextServer.AUTOWRAP_OFF; hk.fit_content = true; heat_key.add_child(hk)
	month_strip = PanelContainer.new(); month_strip.mouse_filter = Control.MOUSE_FILTER_IGNORE; month_strip.visible = false; root.add_child(month_strip)
	var msb := HBoxContainer.new(); msb.add_theme_constant_override("separation", 18); msb.mouse_filter = Control.MOUSE_FILTER_IGNORE; month_strip.add_child(msb)
	_build_cam_tools()
	bar_tip = PanelContainer.new(); bar_tip.add_theme_stylebox_override("panel", Kit.sb(Kit.field(0.97), Kit.CY, 8, 1, 10)); bar_tip.mouse_filter = Control.MOUSE_FILTER_IGNORE; bar_tip.visible = false
	var btl := Kit.label("", 14, Kit.TX, true); btl.custom_minimum_size = Vector2(260, 0); bar_tip.add_child(btl); root.add_child(bar_tip)
	_shell_visible(false)

## Top-bar figures explain themselves in a small panel just under the bar, below the figure (Godot's own tooltip sits on the neighbours).
var bar_tip: PanelContainer
func _bar_tip(box: Control) -> void:
	if bar_tip == null: return
	if box == null or not is_instance_valid(box) or str(box.get_meta("tip", "")) == "" or modal() != null: bar_tip.visible = false; return
	(bar_tip.get_child(0) as Label).text = str(box.get_meta("tip"))
	bar_tip.size = Vector2(280, 0); bar_tip.reset_size()
	var r := box.get_global_rect(); var vs := get_viewport().get_visible_rect().size
	bar_tip.global_position = Vector2(clampf(r.position.x, 8.0, vs.x - 288.0), top.get_global_rect().end.y + 6.0); bar_tip.visible = true

var dock_box: BoxContainer

## Dialogs. Every modal panel is centred, at most its design width and never larger than the visible area minus a margin (inside
## the safe area); it is as tall as its content (or a fixed design height) and the content scrolls inside it when it does not fit.
## Panels registered here are refitted every frame, so a window resize, a UI-size change or new content never leaves one clipped.
var _dialogs: Array = []
func dialog_margin() -> float: return 12.0 if Layout.phone else (20.0 if Layout.compact else 32.0)

## `body` is the (scrolling) content whose height the panel follows; fixed_h > 0 gives a fixed design height instead.
func fit_dialog(pn: Control, max_w: float, body: Control, fixed_h := 0.0) -> void:
	pn.set_meta("dlg_w", max_w); pn.set_meta("dlg_body", body); pn.set_meta("dlg_h", fixed_h)
	pn.set_anchors_preset(Control.PRESET_CENTER)
	if not _dialogs.has(pn): _dialogs.append(pn)
	_fit_now(pn)

func _fit_dialogs() -> void:
	for i in range(_dialogs.size() - 1, -1, -1):
		var pn = _dialogs[i]
		if not is_instance_valid(pn) or (pn as Node).is_queued_for_deletion(): _dialogs.remove_at(i); continue
		if (pn as Control).is_visible_in_tree(): _fit_now(pn)

func _fit_now(pn: Control) -> void:
	var host := pn.get_parent() as Control
	var area := host.size if host != null and host.size.x > 0.0 else Vector2(vw(), vs_h())
	var m := dialog_margin()
	var w := minf(float(pn.get_meta("dlg_w", 800.0)), area.x - 2.0 * m)
	var fh := float(pn.get_meta("dlg_h", 0.0))
	var want := fh
	if fh <= 0.0:
		var body = pn.get_meta("dlg_body", null)
		var sbx := pn.get_theme_stylebox("panel")
		want = (sbx.get_minimum_size().y if sbx != null else 0.0) + (pn.get_child(0) as Control).get_combined_minimum_size().y
		if body != null and is_instance_valid(body) and (body as Control).get_parent() is ScrollContainer: want += (body as Control).get_combined_minimum_size().y
	var hh := minf(want, area.y - 2.0 * m)
	var o := Vector4(-w / 2.0, -hh / 2.0, w / 2.0, hh / 2.0)
	if absf(pn.offset_left - o.x) > 0.5 or absf(pn.offset_top - o.y) > 0.5 or absf(pn.offset_right - o.z) > 0.5 or absf(pn.offset_bottom - o.w) > 0.5:
		pn.offset_left = o.x; pn.offset_top = o.y; pn.offset_right = o.z; pn.offset_bottom = o.w

## A standard modal: full-screen dim (to the screen edges, under the safe-area margins too) and a fitted panel with a scrolling body.
## Returns [host, panel, body VBox]. The host is a direct child of root, so it joins the modal stack (modal()).
func make_dialog(node_name: String, w: float, edge: Color, dim_a := 0.6) -> Array:
	var h := Control.new(); if node_name != "": h.name = node_name
	h.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_child(h)
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, dim_a); dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.offset_left = -inset.x; dim.offset_top = -inset.y; dim.offset_right = inset.z; dim.offset_bottom = inset.w; h.add_child(dim)
	var pn := PanelContainer.new(); pn.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.98), edge, 14, 2, 22 if not Layout.phone else 16)); h.add_child(pn)
	var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; pn.add_child(sc)
	var vb := VBoxContainer.new(); vb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; vb.add_theme_constant_override("separation", 10); sc.add_child(vb)
	fit_dialog(pn, w, vb)
	return [h, pn, vb]

## The window changed shape: refit the shell; rebuild the open screen when the device class changed.
func _on_resized(was: String) -> void:
	_relayout()
	if started: _on_changed()
	if was != Layout.kind:
		for sc in screens.values(): sc.queue_free()
		screens.clear()
		if started: show_screen(cur)
	elif started and screens.has(cur): show_screen(cur)

func vs_h() -> float: return get_viewport().get_visible_rect().size.y - inset.y - inset.w
func vw() -> float: return get_viewport().get_visible_rect().size.x - inset.x - inset.z

## Rounded corners and camera cut-outs: the interface sits inside the display's safe area (plus a small margin on phones).
var inset := Vector4.ZERO   # left, top, right, bottom, in interface pixels
func _apply_safe_area() -> void:
	if root == null: return
	var vp := get_viewport().get_visible_rect().size
	var ratio := maxf(0.01, float(DisplayServer.window_get_size().x) / maxf(1.0, vp.x))   # screen pixels per interface pixel
	var v := Vector4.ZERO
	if OS.get_environment("GW_INSET") != "":   # desktop preview: GW_INSET="left,top,right,bottom"
		var p := OS.get_environment("GW_INSET").split_floats(",")
		if p.size() == 4: v = Vector4(p[0], p[1], p[2], p[3])
	elif OS.has_feature("android") or OS.has_feature("ios"):
		var sa := Rect2(DisplayServer.get_display_safe_area()); var sc := Vector2(DisplayServer.screen_get_size())
		v = Vector4(sa.position.x / ratio, sa.position.y / ratio, (sc.x - sa.end.x) / ratio, (sc.y - sa.end.y) / ratio)
	if Layout.touch and (OS.has_feature("android") or OS.has_feature("ios") or OS.get_environment("GW_INSET") != ""):
		v = Vector4(maxf(v.x, 14.0), maxf(v.y, 6.0), maxf(v.z, 14.0), maxf(v.w, 8.0))   # rounded screen corners
	if v == inset and root.offset_left == v.x: return
	inset = v
	root.offset_left = v.x; root.offset_top = v.y; root.offset_right = -v.z; root.offset_bottom = -v.w

## Right-hand drawers that leave the hall clickable (Overview, Facility): 520 px on desktops, the full screen on phones.
func overlay_w() -> float:
	if Layout.phone or Settings.drawer_frac > 0.0: return drawer_w()
	return minf(520.0 if not Layout.handheld else 470.0, vw() - 240.0)

const RAIL_W := 92.0
var _net_on := false
var dock_scroll: ScrollContainer
var _bar_h := 66.0
var _dock_h := 84.0

## Fit the shell to the device class: top bar contents and height, dock size, hall margins, toasts.
const DOCK_SHORT := ["HOME", "CLIENTS", "SUPPLY", "BUILD", "OPS", "DESIGN", "CLUSTER", "CODEX"]
func _dock_meta(d: Button, full_name: String, i: int) -> void:
	d.set_meta("full", d.text); d.set_meta("short", DOCK_SHORT[i]); d.set_meta("short_txt", DOCK_SHORT[i])
	if Layout.phone: d.text = DOCK_SHORT[i]
	_dock_paint(d, false)

## One look for every dock tab: a frame and a thick underline in the tab's colour; the open one is also filled with it (the frame
## stays, darker, so a pale or a saturated colour reads the same way).
func _dock_paint(d: Button, on: bool) -> void:
	if d.get_meta("painted", -1) == int(on) and d.get_meta("theme", "") == Settings.theme: return
	d.set_meta("painted", int(on)); d.set_meta("theme", Settings.theme)
	var col: Color = d.get_meta("col", Kit.CY)
	for st in ["normal", "hover", "pressed"]:
		var fill := col if on else Kit.BTN_OFF
		if st == "hover": fill = fill.lightened(0.12)
		var s := Kit.sb(fill, col.darkened(0.45) if on else col, 4, 3, 8)
		s.border_width_bottom = 8; s.border_color = col.darkened(0.45) if on else col
		s.shadow_color = Kit.SHADOW; s.shadow_size = 1; s.shadow_offset = Vector2(3, 3)
		d.add_theme_stylebox_override(st, s)
	var fc := Kit.INK if on else Kit.TX
	for c in ["font_color", "font_hover_color", "font_pressed_color"]: d.add_theme_color_override(c, fc)

## Small screens: a tab on the drawer's edge folds every drawer away so the hall fills the screen, and brings it back.
var drawer_hidden := false
var _clean := OS.has_environment("GW_CLEAN")   # website capture: the bare hall, no shell, toasts or drawer handle
var drawer_tab: DrawerGrip
var edge_fill: ColorRect
func _cover_of(id: String) -> float:
	if OVERLAY.has(id): return overlay_w()
	return 0.0 if FULL.has(id) else drawer_w(id)
func toggle_drawer() -> void:
	drawer_hidden = not drawer_hidden; holder.visible = not drawer_hidden
	hall.set_cover(0.0 if drawer_hidden else _cover_of(cur) + inset.z); _place_tab(); sfx("click")
func _place_tab_deferred() -> void: call_deferred("_place_tab")
func _place_tab() -> void:
	if drawer_tab == null: return
	drawer_tab.visible = started and not FULL.has(cur) and cur != ""
	drawer_tab.accent = Kit.accent; drawer_tab.folded = drawer_hidden
	var vh := vs_h()
	var top := _bar_h + 10.0; var wd := 44.0 if Layout.touch else 30.0
	var bottom := 6.0 if Layout.phone else _dock_h + 8.0
	drawer_tab.position = Vector2(vw() - (0.0 if drawer_hidden else _cover_of(cur)) - wd, top); drawer_tab.size = Vector2(wd, vh - top - bottom)
	if _clean: drawer_tab.visible = false
	# Phones: the strip between a drawer and the screen edge (camera cut-out, rounded corners) is filled in the drawer's colour, not left as a black gap.
	if edge_fill == null:
		edge_fill = ColorRect.new(); edge_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE; root.add_child(edge_fill); root.move_child(edge_fill, 0)
	edge_fill.color = Kit.deep(0.985)
	edge_fill.visible = started and inset.z > 0.0 and not drawer_hidden and cur != ""
	edge_fill.position = Vector2(vw() + holder.offset_right - 10.0, holder.offset_top); edge_fill.size = Vector2(inset.z - holder.offset_right + 10.0, vh + holder.offset_bottom - holder.offset_top)
## Drag the handle on a drawer's edge to size it; a plain tap folds the drawer away (and back).
var _grip_down := false
var _grip_moved := false
func _grip_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and (e as InputEventMouseButton).button_index == MOUSE_BUTTON_LEFT:
		if e.pressed: _grip_down = true; _grip_moved = false; drawer_tab.active = true
		else:
			_grip_down = false; drawer_tab.active = false
			if _grip_moved: Settings.save_all(); var scr = screens.get(cur); if scr != null and scr.has_method("refresh"): scr.refresh()
			else: toggle_drawer()
	elif e is InputEventMouseMotion and _grip_down:
		var x := get_viewport().get_mouse_position().x
		var f := clampf((vw() - x) / vw(), 0.2, 0.92)
		if absf(f - Settings.drawer_frac) < 0.004 and not _grip_moved: return
		_grip_moved = true; Settings.drawer_frac = f
		if drawer_hidden: drawer_hidden = false; holder.visible = true
		_apply_drawer_width()
func _apply_drawer_width() -> void:
	for id in screens:
		var sc: Control = screens[id]
		if sc is ScreenWrap and not OVERLAY.has(id) and not FULL.has(id): sc.offset_left = -drawer_w(id)
	hall.set_cover(_cover_of(cur) + inset.z); hall.blocked = FULL.has(cur); _place_tab()

func _relayout() -> void:
	if top == null: return
	_apply_safe_area()
	if drawer_tab == null:
		drawer_tab = DrawerGrip.new(); drawer_tab.z_index = -3; drawer_tab.mouse_filter = Control.MOUSE_FILTER_STOP; drawer_tab.gui_input.connect(_grip_input); root.add_child(drawer_tab)
	_place_tab_deferred()
	var k := Layout.kind
	var compact := k != "desktop"
	_bar_h = 66.0 if k == "desktop" else (58.0 if k == "handheld" else 56.0)
	top.add_theme_stylebox_override("panel", _top_sb(Kit.accent))
	top.offset_left = -inset.x; top.offset_top = -inset.y; top.offset_right = inset.z
	lbl.title.visible = k == "desktop"
	for key in ["rev", "burn", "nw", "rep"]: lbl[key + "_box"].visible = k == "desktop" or (k == "handheld" and key in ["rev", "burn"])
	lbl.netw_box.visible = k != "phone" and _net_on
	lbl.debt_box.visible = k == "desktop" and float(b.g.get("debt", 0.0)) > 0.0
	lbl.mode.visible = k == "desktop"
	for sb in lbl.speed_btns: (sb as Button).custom_minimum_size = Vector2(46 if k == "desktop" else 50, Layout.tap())
	_speed_label()
	next_btn.custom_minimum_size = Vector2(0 if k == "desktop" else 120, maxf(Layout.tap(), 0.0)); next_btn.text = "NEXT MONTH ▶" if k == "desktop" else "NEXT ▶"; next_btn.add_theme_font_size_override("font_size", Kit.fs(17))
	menu_btn.text = "MENU" if k != "phone" else "≡"; menu_btn.custom_minimum_size = Vector2(0 if k != "phone" else 52, Layout.tap())
	(top.get_child(0) as HBoxContainer).add_theme_constant_override("separation", 16 if k == "desktop" else (12 if k == "handheld" else 8))
	_bar_h = maxf(_bar_h, top.get_combined_minimum_size().y - inset.y)   # the bar's real height: everything below starts under it, never under its edge
	top.offset_bottom = _bar_h
	_dock_h = 84.0 if k == "desktop" else 74.0
	var rail := k == "phone"   # phones are landscape-only: the dock becomes a rail down the left edge, so the hall keeps its height
	dock_box.vertical = rail
	dock_scroll.set_anchors_preset(Control.PRESET_LEFT_WIDE if rail else Control.PRESET_BOTTOM_WIDE)
	dock_scroll.vertical_scroll_mode = (ScrollContainer.SCROLL_MODE_SHOW_NEVER if Layout.touch else ScrollContainer.SCROLL_MODE_AUTO) if rail else ScrollContainer.SCROLL_MODE_DISABLED
	dock_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED if rail else ScrollContainer.SCROLL_MODE_AUTO
	if rail: dock_scroll.offset_left = 6; dock_scroll.offset_right = RAIL_W; dock_scroll.offset_top = _bar_h + 12.0; dock_scroll.offset_bottom = -6
	else: dock_scroll.offset_top = -_dock_h; dock_scroll.offset_bottom = -8; dock_scroll.offset_left = 10; dock_scroll.offset_right = -10
	for d in dock_box.get_children():
		var btn := d as Button
		btn.custom_minimum_size = Vector2(138 if k == "desktop" else (112 if k == "handheld" else RAIL_W - 6), 58 if k == "desktop" else (60 if k == "handheld" else 56))
		btn.add_theme_font_size_override("font_size", Kit.fs(14 if k != "phone" else 13)); btn.text = btn.get_meta("short") if rail else btn.get_meta("full", btn.text)
	if not rail and dock_box.get_combined_minimum_size().x > vw() - 20.0:   # a narrow logical screen (big UI size): short tab names before the dock has to scroll
		for d in dock_box.get_children(): (d as Button).text = "%s\n%s" % [d.get_meta("short"), str(d.get_meta("full")).get_slice("\n", 1)]; (d as Button).custom_minimum_size.x = 0.0
	dock_box.alignment = BoxContainer.ALIGNMENT_CENTER if not rail else BoxContainer.ALIGNMENT_BEGIN
	holder.offset_top = _bar_h + 10.0; holder.offset_bottom = -(_dock_h + 8.0) if not rail else -6.0
	holder.offset_left = 14 if k != "phone" else RAIL_W + 8.0; holder.offset_right = -14 if k != "phone" else -6.0
	_place_cam_tools(); _place_floaters(); call_deferred("_fit_top")

## Apply the chosen UI theme live: palette, top bar, dock, and every screen (rebuilt on demand).
func _restyle() -> void:
	Kit.set_theme(Settings.theme)
	if top != null: top.add_theme_stylebox_override("panel", _top_sb(Kit.accent))
	if dock_box != null:
		for c in dock_box.get_children(): dock_box.remove_child(c); c.queue_free()   # out of the box now: the dock is measured right after
		dock_btns.clear()
		for i in DOCK.size():
			var dk: Array = DOCK[i]; var d := Kit.dock_btn(dk[1], str((i + 1) % 10), dk[2], func(): _dock(dk[0])); _dock_meta(d, dk[1], i); dock_box.add_child(d); dock_btns[dk[0]] = d
		_apply_unlocks(); _relayout()
	for sc in screens.values(): sc.queue_free()
	screens.clear()
	if started: show_screen(cur); _on_changed()
	else:
		var t := root.get_node_or_null("title")
		if t != null: t.queue_free(); _title(false)   # the menu only: the backdrop game keeps running (re-creating it took about a second)
	for sb in lbl.get("speed_btns", []): (sb as Button).remove_meta("on")
	if started: _speed_label()
	if settings_ui != null: settings_ui.queue_free(); settings_ui = null; _settings()

## Theme switch without a flash: the current frame is frozen on top, everything is rebuilt underneath, then the snapshot fades out.
func _restyle_smooth() -> void:
	var img := get_viewport().get_texture().get_image()
	var layer := CanvasLayer.new(); layer.layer = 100; add_child(layer)
	var tr := TextureRect.new(); tr.texture = ImageTexture.create_from_image(img); tr.set_anchors_preset(Control.PRESET_FULL_RECT)
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE; tr.stretch_mode = TextureRect.STRETCH_SCALE; tr.mouse_filter = Control.MOUSE_FILTER_STOP; layer.add_child(tr)
	_restyle()
	await get_tree().process_frame; await get_tree().process_frame
	if not is_instance_valid(tr): return
	var tw := tr.create_tween(); tw.tween_property(tr, "modulate:a", 0.0, 0.0 if Settings.reduced_motion else 0.28); tw.tween_callback(layer.queue_free)

func _shell_visible(v: bool) -> void:
	top.visible = v; holder.visible = v
	dock_scroll.visible = v
	toasts.visible = v
	if edge_fill != null: edge_fill.visible = v and edge_fill.visible

func _title(backdrop := true) -> void:
	var two: bool = Layout.phone or vs_h() < 860   # short screens (Steam Deck 1280x800, laptops): title on the left, buttons in a scrolling column on the right
	var ts := clampf(minf(vw() / 1920.0, vs_h() / 1000.0), 1.0, 1.6) if not two else 1.0   # big logical screens (1440p ultrawide and up): the column grows with the screen
	started = false; _shell_visible(false); hall.b = b; audio.set_mood("title")
	var h := Control.new(); h.set_anchors_preset(Control.PRESET_FULL_RECT); h.name = "title"; root.add_child(h)
	var gt := GradientTexture2D.new(); var gr := Gradient.new(); gr.colors = PackedColorArray([Kit.SCRIM, Color(Kit.SCRIM.r, Kit.SCRIM.g, Kit.SCRIM.b, 0.0)]); gr.offsets = PackedFloat32Array([0.0, 1.0])
	gt.gradient = gr; gt.fill_from = Vector2(0, 0); gt.fill_to = Vector2(1, 0); gt.width = 512; gt.height = 8
	var shade := TextureRect.new(); shade.texture = gt; shade.stretch_mode = TextureRect.STRETCH_SCALE; shade.set_anchors_preset(Control.PRESET_LEFT_WIDE); shade.anchor_right = 0.62; shade.mouse_filter = Control.MOUSE_FILTER_IGNORE; h.add_child(shade)
	var vb := VBoxContainer.new(); vb.set_anchors_preset(Control.PRESET_CENTER_LEFT); vb.offset_left = (90.0 * ts + maxf(0.0, vw() - 1920.0 * ts) * 0.25) if not Layout.compact else 24.0
	vb.offset_top = -330.0 * ts if not two else -vs_h() * 0.5 + 16; vb.offset_bottom = 330.0 * ts if not two else vs_h() * 0.5 - 16; vb.offset_right = vb.offset_left + 690.0 * ts if not two else vw() - 24; vb.add_theme_constant_override("separation", int(12 * ts)); vb.grow_vertical = Control.GROW_DIRECTION_BOTH; h.add_child(vb)   # taller content grows evenly up and down, never off the bottom
	shade.anchor_right = clampf((vb.offset_right + 200.0) / maxf(1.0, vw()), 0.62, 0.9)
	var bv: VBoxContainer = vb   # where the menu buttons go
	if two:   # landscape phone: title and blurb on the left, the buttons in a finger-scrollable column on the right
		vb.offset_right = vw() * 0.44
		var sc := ScrollContainer.new(); sc.set_anchors_preset(Control.PRESET_RIGHT_WIDE); sc.anchor_left = 0.47; sc.offset_left = 0; sc.offset_right = -24; sc.offset_top = 14; sc.offset_bottom = -14
		sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; h.add_child(sc)
		bv = VBoxContainer.new(); bv.add_theme_constant_override("separation", 10); bv.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sc.add_child(bv)
	vb.add_child(Kit.label("AI DATACENTER TYCOON", int(18 * ts), Kit.DIM)); vb.add_child(Kit.label("GIGAWATT", int(110 * ts) if not two else 64, Kit.CY))
	var blurb := PanelContainer.new(); blurb.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.62), Color(0, 0, 0, 0), 8, 0, 10)); vb.add_child(blurb)   # a backing: the demo hall behind the title is bright in places
	blurb.add_child(Kit.label("You run a GPU datacenter from 2020 to 2028. Buy the hardware that existed each year, keep it powered and cooled, and rent it to AI labs." if not Layout.phone else "Run a GPU datacenter from 2020 to 2028: buy hardware, keep it cool, rent it to AI labs.", int(20 * ts), Kit.TX, true))
	for m in [["learner", "LEARNER", "I don't know what a chiller is · $80M · explainers everywhere · \"Do it for me\" Easy path" if not Layout.phone else "New to datacenters · $80M · explains everything"], ["operator", "OPERATOR", "I know the basics · $50M · guided planner and checklists" if not Layout.phone else "I know the basics · $50M"], ["tycoon", "TYCOON", "Just give me the keys · $30M · no hand-holding" if not Layout.phone else "Just the keys · $30M"]]:
		var bt := Kit.btn("%s\n%s" % [m[1], m[2]], func(): _pick_site(m[0], h), "", int(18 * ts)); bt.custom_minimum_size = Vector2(minf(640.0 * ts, vw() - 48.0) if not two else 0.0, (76.0 * ts) if not Layout.phone else 68.0)
		bt.alignment = HORIZONTAL_ALIGNMENT_LEFT; bt.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if two else TextServer.AUTOWRAP_OFF; bv.add_child(bt)   # no pre-selected look: every mode is a plain choice
	if backdrop:
		quiet = true; b.env("autosave", [false]); quiet = false   # the backdrop demo must never overwrite the player's autosave
		b.act("newGame", [7, "operator"]); _demo_hall()
	var recent: Array = b.qa("saves")
	if recent.size() > 0:
		var rs: Dictionary = recent[0]
		var cont := Kit.btn("CONTINUE\n%s · %s · %d racks" % [Kit.date_of(int(rs.month)), Kit.usd(float(rs.cash)), int(rs.racks)], func(): _load_slot(str(rs.slot)), "go", int(18 * ts)); cont.custom_minimum_size = Vector2(minf(640.0 * ts, vw() - 48.0) if not two else 0.0, 76.0 * ts); cont.alignment = HORIZONTAL_ALIGNMENT_LEFT
		bv.add_child(cont); bv.move_child(cont, 3 if bv == vb else 0)
	var xrow: Container = bv
	if two: xrow = HBoxContainer.new(); xrow.add_theme_constant_override("separation", 8); bv.add_child(xrow)   # short screens: Load, Settings and Quit share one row, so the column fits without scrolling
	for e in [["LOAD GAME", func(): _slots("load")], ["SETTINGS", func(): _settings()], ["QUIT", func(): get_tree().quit()]]:
		if e[0] == "QUIT" and Layout.is_mobile(): continue
		var xb := Kit.btn(e[0] if not two or e[0] != "LOAD GAME" else "LOAD", e[1], "", int(16 * ts)); if ts > 1.0: xb.custom_minimum_size.y = 44.0 * ts
		xb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; xrow.add_child(xb)
	if not two:   # on a backing, so it reads over the 3D hall
		var hint := PanelContainer.new(); hint.add_theme_stylebox_override("panel", Kit.sb(Color(Kit.SCRIM.r, Kit.SCRIM.g, Kit.SCRIM.b, 0.7), Color(0, 0, 0, 0), 6, 0, 8)); hint.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		hint.add_child(Kit.label("Settings ▸ Controls lists every key, button and gesture.", int(14 * ts), Kit.DIM)); bv.add_child(hint)
	if bv != vb: var pad_end := Control.new(); pad_end.custom_minimum_size.y = 12.0; bv.add_child(pad_end)   # the last button never sits flush on the screen edge
	var gw := Settings.gpu_warning()
	if gw != "": var gl := Kit.label(gw, 14, Kit.AM); gl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; bv.add_child(gl)
	if backdrop: hall.dist = 13.0; hall.pitch = 0.32; hall.auto_orbit = true; hall.hall_i = 0; hall.rebuild(); hall.cam.h_offset = -4.5

## The title screen's backdrop: a short scripted game, so the first thing you see is a lit hall with racks in it.
func _demo_hall() -> void:
	if OS.has_environment("GW_SMOKE") or OS.has_environment("GW_AUTOSTART"): return
	var q := quiet; quiet = true; b.env("autoplay", ["operator", 22]); quiet = q

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
	b.act("newGame", [int(Time.get_unix_time_from_system()) % 100000, mode]); b.act("setMode", [mode]); cur_slot = ""; end_seen = false; _begin()
	if (Settings.tutorial != "off" and mode != "tycoon" and not OS.has_environment("GW_SMOKE") and not OS.has_environment("GW_NOCOACH")) or OS.has_environment("GW_COACH"): coach.start()   # Tycoon: no hand-holding, no tutorial

func _begin() -> void:
	var tt := root.get_node_or_null("title")
	if tt: tt.queue_free()
	b.env("autosave", [true]); started = true; _seen_log = b.g.log.size(); speed = 0; clock = 0.0; audio.set_mood("play"); _unlocked.clear()
	for d in DOCK: _unlocked[d[0]] = is_unlocked(d[0])   # what is open at the start is not "unlocked" news
	hall.cam.h_offset = 0.0; hall.hall_i = 0; hall.auto_orbit = false
	_shell_visible(true); show_screen("dash"); _on_changed(); hall.rebuild(); hall.top_view()
	if OS.get_environment("GW_SETTINGS") != "": get_tree().create_timer(0.5).timeout.connect(func(): if settings_ui == null: _settings())

## Top-bar money never just swaps: the figure counts from the old value to the new one, and for cash and revenue a small
## "+$1.2M" / "-$350k" chip drops out of it and fades, so every purchase, sale and month-end is seen where the money lives.
var _shown := {}      # key -> {v: value on display, to: target, tw: Tween}
var _roll_month := -1
func _roll(key: String, l: Label, v: float, box: Control, chip: bool) -> void:
	var e = _shown.get(key)
	var mo := int(b.g.month)
	var jump: bool = e == null or quiet or Settings.reduced_motion or not is_inside_tree() or OS.has_environment("GW_SMOKE") or absi(mo - int(e.get("mo", mo))) > 1
	if e == null: e = {"v": v, "to": v, "tw": null, "mo": mo}; _shown[key] = e
	e.mo = mo
	if is_equal_approx(float(e.to), v) and not jump: return   # already showing (or counting toward) this value
	var from: float = float(e.v); var d := v - float(e.to)
	e.to = v
	if e.tw != null and (e.tw as Tween).is_valid(): (e.tw as Tween).kill()
	if jump or Kit.usd(from) == Kit.usd(v): e.v = v; l.text = Kit.usd(v); return
	var tw := create_tween(); e.tw = tw
	tw.tween_method(func(x: float): e.v = x; l.text = Kit.usd(x), from, v, 0.45).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	l.pivot_offset = l.size * 0.5; l.scale = Vector2(1.12, 1.12)
	create_tween().tween_property(l, "scale", Vector2.ONE, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	if chip and l.is_visible_in_tree() and absf(d) >= 1.0: _money_chip(key, l, d)

var _chips := {}   # key -> {node, label, d, t}: one chip per figure; changes arriving together add up instead of stacking
func _money_chip(key: String, l: Label, d: float) -> void:
	var now := Time.get_ticks_msec()
	var e = _chips.get(key); var fresh := false
	if e != null and is_instance_valid(e.node) and now - int(e.t) < 500:
		e.d = float(e.d) + d
	else:
		var pc := PanelContainer.new(); pc.mouse_filter = Control.MOUSE_FILTER_IGNORE; pc.z_index = 50
		var c := Label.new(); c.mouse_filter = Control.MOUSE_FILTER_IGNORE; pc.add_child(c); root.add_child(pc)
		e = {"node": pc, "label": c, "d": d, "t": now}; _chips[key] = e; fresh = true
		var r := l.get_global_rect(); pc.position = Vector2(r.position.x - 6.0, r.end.y + 4.0)
		var tw := create_tween().set_parallel(true)
		tw.tween_property(pc, "position:y", pc.position.y + 14.0, 1.6).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tw.tween_property(pc, "modulate:a", 0.0, 0.5).set_delay(1.3)
		tw.chain().tween_callback(pc.queue_free)
	var dd: float = e.d; var col := Kit.GR if dd > 0 else Kit.RD
	(e.label as Label).text = ("+" if dd > 0 else "") + Kit.usd(dd); (e.label as Label).label_settings = Kit.ls(15, col)
	(e.node as PanelContainer).add_theme_stylebox_override("panel", Kit.sb(Kit.field(0.94), col, 8, 1, 6))
	(e.node as Control).visible = absf(dd) >= 1.0
	if fresh and cam_tools != null and cam_tools.visible and Layout.touch:   # the floating camera buttons (+ − TOP HEAT TAGS) are never covered by a chip
		var pn_ := e.node as Control; var w := pn_.get_combined_minimum_size().x; var cr := cam_tools.get_global_rect().grow(8.0)
		var cr2 := Rect2(pn_.position, Vector2(w, pn_.get_combined_minimum_size().y + 20.0))
		if cr2.intersects(cr): pn_.position.x = minf(cr.end.x, vw() - w - 4.0)

var _changed_pending := false
func _on_changed() -> void:
	if not started: return
	if _hold_changes: return   # a batch of engine calls is running (_drop_queued_cards): refreshed once at its end
	if TouchScroll.is_busy(): _changed_pending = true; return   # never rebuild a list under a scrolling finger; replayed right after
	_changed_pending = false
	var g := b.g
	lbl.date.text = Kit.date_of(g.month); _roll("cash", lbl.cash, float(g.cash), lbl.cash_box, true); lbl.cash.label_settings = Kit.ls(20, Kit.GR if g.cash >= 0 else Kit.RD)
	lbl.debt.text = Kit.usd(g.debt); _roll("nw", lbl.nw, float(b.q("netWorth")), lbl.nw_box, false); lbl.rep.text = "★ %d" % int(g.reputation)
	lbl.debt_box.visible = float(g.debt) > 0.0 and Layout.kind == "desktop"   # no loans, nothing to show
	var pn: Dictionary = b.qd("pnl")
	if not pn.is_empty():
		_roll("rev", lbl.rev, float(pn.revenue), lbl.rev_box, true); lbl.rev.label_settings = Kit.ls(20, Kit.GR)
		_roll("burn", lbl.burn, float(pn.opex), lbl.burn_box, false); lbl.burn.label_settings = Kit.ls(20, Kit.AM)
		_roll("net", lbl.net, float(pn.net), lbl.net_box, false); lbl.net.label_settings = Kit.ls(20, Kit.CY if pn.net >= 0 else Kit.RD)
		var serving: int = g.activeContracts.filter(func(a): return a.clusterIds.size() > 0).size()
		lbl.rev_box.set_meta("tip", "Monthly revenue: %s serving." % Kit.plural(serving, "contract")); lbl.burn_box.set_meta("tip", "Monthly cost: power, staff, support and interest."); lbl.net_box.set_meta("tip", "Revenue minus costs, after depreciation.")
		lbl.nw_box.set_meta("tip", "Cash plus the value of what you own, minus debt."); lbl.cash_box.set_meta("tip", "Cash in the bank."); lbl.rep_box.set_meta("tip", "Reputation: better offers and prices from customers."); lbl.debt_box.set_meta("tip", "Outstanding loans.")
	var nh: Dictionary = b.qd("netHealth")
	_net_on = nh.has("clusters") and nh.has("uplink") and (nh.clusters.size() > 0 or float(nh.uplink.needGbps) > 0.0)
	lbl.netw_box.visible = _net_on and Layout.kind != "phone"
	if _net_on:
		var lv := int(nh.level); var col: Color = [Kit.GR, Kit.AM, Kit.RD][lv]
		var down := 0
		for c in nh.clusters: down += int(c.down)
		lbl.netw.text = ("%d%%" % int(round(float(nh.bandwidthPct) * 100.0))) if down == 0 and float(nh.uplink.pct) <= 0.85 else ("%d down" % down if down > 0 else "uplink %d%%" % int(float(nh.uplink.pct) * 100.0))
		lbl.netw.label_settings = Kit.ls(20, col); lbl.netw_box.set_meta("tip", "Network: %s. Click to open the Supercomputer screen." % nh.summary)
	lbl.mode.text = {"learner": "Learner", "operator": "Operator", "tycoon": "Tycoon"}.get(g.get("mode", "operator"), "")
	_speed_label()
	var news := ""
	for i in range(_seen_log, g.log.size()):
		var e: Dictionary = g.log[i]
		if e.level != "info": toast(e.text, e.level)
		elif int(e.month) == int(g.month) and not (str(e.text).begins_with("📖") or str(e.text).begins_with("❓") or str(e.text).begins_with("📣")): news = str(e.text)   # cards have their own screens
	_seen_log = g.log.size()
	_month_strip(news)
	hall.rebuild()
	_fit_top()
	_apply_unlocks()
	_hall_audio()
	_check_end()
	check_keynote()
	coach.tick()
	if hall.get_meta("n", 0) == 0: pass
	_refresh_cur()

## Month close: when a month ends, one line at the top of the hall says what it did to the business: revenue, costs, the change
## in cash, and the month's quiet headline (new offers, a rival's move: news that is not worth a toast). It fades after a few
## seconds; at speed it simply updates in place. Loads, fast-forwards and captures never show it.
var heat_key: PanelContainer   # legend for the HEAT view, shown only while it is on
var month_strip: PanelContainer
var _strip_mo := -1
var _strip_tw: Tween
func _month_strip(news: String) -> void:
	var g := b.g; var mo := int(g.month); var was := _strip_mo; _strip_mo = mo
	if month_strip == null or was < 0 or mo != was + 1 or quiet or _clean or OS.has_environment("GW_SMOKE"): return
	var h: Array = g.get("history", [])
	if h.is_empty(): return
	var e: Dictionary = h[-1]
	var d := (float(e.cash) - float(h[-2].cash)) if h.size() > 1 else (float(e.revenue) - float(e.opex))
	var hb := month_strip.get_child(0)
	for c in hb.get_children(): c.queue_free()
	var add := func(t: String, col: Color, sz := 14): var l := Kit.label(t, sz, col); l.mouse_filter = Control.MOUSE_FILTER_IGNORE; hb.add_child(l)
	add.call(Kit.date_of(mo - 1).to_upper() + " CLOSED", Kit.DIM, 12)
	if not Layout.phone:
		add.call("Revenue " + Kit.usd(float(e.revenue)), Kit.GR)
		add.call("Costs " + Kit.usd(float(e.opex)), Kit.AM)
	add.call("Cash " + ("+" if d >= 0 else "") + Kit.usd(d), Kit.GR if d >= 0 else Kit.RD, 15)
	if news != "" and Layout.kind == "desktop": add.call(news if news.length() <= 64 else news.substr(0, 62).strip_edges() + "…", Kit.TX, 13)
	month_strip.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.9), Kit.GR if d >= 0 else Kit.RD, 10, 1, 8))
	month_strip.set_meta("life", 4.5); month_strip.visible = true; month_strip.reset_size()
	if _strip_tw != null and _strip_tw.is_valid(): _strip_tw.kill()
	if Settings.reduced_motion or speed >= 2: month_strip.modulate.a = 1.0
	else: month_strip.modulate.a = 0.0; _strip_tw = create_tween(); _strip_tw.tween_property(month_strip, "modulate:a", 1.0, 0.25)

## The open screen is rebuilt on every change. While the game auto-advances, rebuilds are coalesced to a few per second so a
## month tick never stalls a frame twice a second; paused play still refreshes immediately so buttons feel instant.
var _refresh_due := false
var _refresh_at := 0
func _refresh_cur() -> void:
	if not screens.has(cur) or not screens[cur].has_method("refresh") or cur == "codex": return   # the Codex is static reference text
	if speed == 0 or Time.get_ticks_msec() >= _refresh_at: _refresh_due = false; _refresh_at = Time.get_ticks_msec() + 350; screens[cur].refresh()
	else: _refresh_due = true

var quiet := false
func toast(text: String, level := "info") -> void:
	if quiet: return
	for t in toasts.get_children():   # identical toast already on screen: don't stack it
		if t.has_meta("txt") and t.get_meta("txt") == text: return
	var cue := "good" if level == "good" else ("bad" if level == "bad" else "click")
	var low := text.to_lower()
	if level == "bad" and ("fire" in low or "outage" in low or "cut" in low or "went down" in low or "failed" in low): cue = "alarm"; audio.crisis()
	elif level == "bad" and ("power" in low or "blackout" in low or "brownout" in low): cue = "power_down"; audio.hum_dip()
	elif level == "bad": cue = "incident" if ("incident" in low or "warning" in low) else "bad"
	elif level == "good" and ("online" in low or "commissioned" in low): cue = "online"
	elif level == "good" and ("saved" in low): cue = "save"
	elif level == "good" and ("loaded" in low): cue = "load"
	elif level == "good" and ("deliver" in low or "arrived" in low): cue = "delivery"
	audio.play(cue)
	var p := PanelContainer.new(); p.set_meta("txt", text); var col := Kit.GR if level == "good" else (Kit.RD if level == "bad" else Kit.CY)
	p.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.94), col, 8, 1, 10)); p.add_child(Kit.label(text, 14, Kit.TX, true)); p.custom_minimum_size = Vector2(maxf(180.0, toasts.size.x), 0); toasts.add_child(p)
	p.mouse_filter = Control.MOUSE_FILTER_STOP; p.tooltip_text = "Tap to dismiss" if Layout.touch else "Click to dismiss"
	p.gui_input.connect(_toast_input.bind(p))   # tap or click a toast to dismiss it
	p.set_meta("life", 16.0 if level == "bad" else 7.0)   # ages only while visible (not behind a dialog); bad news stays longer
	while toasts.get_child_count() > (2 if Layout.compact else 3):   # never more than two (three on desktops): drop the oldest that is not bad news first
		var drop: Node = toasts.get_child(0)
		for t in toasts.get_children():
			if float(t.get_meta("life", 0.0)) <= 8.0: drop = t; break
		toasts.remove_child(drop); drop.queue_free()

func _toast_input(e: InputEvent, p: Control) -> void:
	if not is_instance_valid(p) or p.is_queued_for_deletion(): return
	if (e is InputEventMouseButton and e.pressed) or (e is InputEventScreenTouch and e.pressed):
		toasts.remove_child(p); p.queue_free(); get_viewport().set_input_as_handled()

func sfx(k: String) -> void: audio.play(k)

func _hall_audio() -> void:
	var racks := 0; var liquid := false
	for h in b.g.halls:
		var on: int = h.racks.filter(func(r): return r.status == "online").size(); racks += on
		if on > 0 and (h.coolingClass == "dlc" or h.coolingClass == "immersion"): liquid = true
	audio.set_hall_load(racks, liquid)

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
	for x in b.qa("machineLedger"): if x.id == rk.id: m = x
	if m.is_empty(): return
	var acc := Color("#ff8a3d")
	inspector = PanelContainer.new(); inspector.add_theme_stylebox_override("panel", Kit.card_sb(acc, Kit.PANEL_FILL, 3, 14))
	inspector.set_anchors_preset(Control.PRESET_BOTTOM_LEFT); inspector.offset_left = 18; inspector.offset_bottom = -98; inspector.offset_top = -300; inspector.offset_right = 400; inspector.grow_vertical = Control.GROW_DIRECTION_BEGIN
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 6); inspector.add_child(v)
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 8); v.add_child(hb)
	if m.get("customer") != null: hb.add_child(Logo.make(str(m.customer), 30.0))
	hb.add_child(Kit.chip("RACK " + str(m.serial), acc, 14))
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
	row.add_child(Kit.btn("Decommission", func(): Kit.confirm(self, "Decommission %s? It is sold at 85%% of residual value.%s" % [m.serial, (" It is serving %s right now: their contract loses this rack and may miss its SLA." % str(m.customer)) if m.get("customer") != null else ""], func():
		var r := b.act("decommissionRack", [rk.id]); toast(str(r.get("message", "")), "good" if r.get("ok", false) else "bad"); hall.rebuild()
		if r.get("ok", false) and inspector != null and is_instance_valid(inspector): inspector.queue_free(); inspector = null, "Sell"), "danger", 12))
	root.add_child(inspector)

## The modal stack. Every dialog and card is a direct child of `root`; the one drawn last is on top and is the one that gets
## Esc, Android Back and controller B (pad._back), and keyboard/controller focus. Whatever opens a modal brings it to the front
## (_modal_front, every frame), so nothing added later (toasts, the tutorial card, the drawer divider) can sit over it and take its clicks:
## the GUI picks the control under the pointer by tree order, not by z_index.
func _is_modal(c: Node) -> bool:
	if c == null or not is_instance_valid(c) or c.is_queued_for_deletion() or not (c is Control): return false
	if c == menu_ui or c == settings_ui or c == end_ui: return true
	if c == keynote or c == story_ui or c == guide: return (c as Control).visible
	if c.name in ["slots", "confirm", "site"]: return (c as Control).visible
	if c.name == "title": return not started
	return false

func modal() -> Control:
	if root == null: return null
	for i in range(root.get_child_count() - 1, -1, -1):
		var c := root.get_child(i)
		if c.name == "title": continue   # the title is the bottom of the stack: anything open over it wins
		if _is_modal(c): return c
	var tt := root.get_node_or_null("title")
	if tt != null and not started and not tt.is_queued_for_deletion(): return tt
	return null

func _modal_front() -> void:
	var m := modal()
	if m != null and m.name != "title" and m.get_index() != root.get_child_count() - 1: m.move_to_front()

## The top bar runs to the screen edges (under rounded corners and the camera cut-out); its contents stay inside the safe area.
func _top_sb(acc: Color) -> StyleBoxFlat:
	var t := Kit.sb(Kit.deep(0.97), Kit.OUTL, 0, 0, 14); t.border_width_bottom = 5; t.border_color = acc
	var vpad := 12.0 if Layout.kind == "desktop" else 4.0
	t.content_margin_top = vpad + inset.y; t.content_margin_bottom = vpad; t.content_margin_left = 14.0 + inset.x; t.content_margin_right = 14.0 + inset.z
	t.shadow_color = Color(Kit.SHADOW.r, Kit.SHADOW.g, Kit.SHADOW.b, Kit.SHADOW.a * 0.7); t.shadow_size = 8; t.shadow_offset = Vector2(0, 4); return t

## Progressive disclosure: a fresh game shows Overview, Customers and Supply; the rest appear as the player needs them.
## Tycoon mode (no hand-holding) and loaded campaigns that already have a hall see everything.
var _unlocked := {}
const UNLOCK_HINT := {"facility": "Facility opens once you have ordered parts or placed a rack.", "ops": "Operations opens once you have ordered parts or placed a rack.",
	"design": "The Design Lab opens after your first contract or a few missions.", "network": "The Supercomputer builder opens after your first contract or a few missions.", "codex": "The Codex opens after your first contract or a few missions."}
func is_unlocked(key: String) -> bool:
	var g: Dictionary = b.g
	if not started or g.get("mode", "operator") == "tycoon" or key in ["dash", "contracts", "shop"]: return true
	var racks := 0
	for h in g.halls: racks += h.racks.size()
	var done: int = g.missionsDone.size()
	if key in ["facility", "ops"]: return racks > 0 or g.orders.size() > 0 or g.activeContracts.size() > 0 or done >= 1 or int(g.month) >= 14
	var served: int = int(g.get("stats", {}).get("contractsCompleted", 0))
	return g.activeContracts.size() > 0 or served > 0 or done >= 2 or int(g.month) >= 17

## Locked drawers keep their place in the dock (dimmed; pressing one says how to open it), so tabs never jump around as they unlock.
func _apply_unlocks() -> void:
	var news := PackedStringArray()
	for d in DOCK:
		var k: String = d[0]; var open := is_unlocked(k)
		if dock_btns.has(k): dock_btns[k].visible = true; dock_btns[k].modulate = Color(1, 1, 1, 1.0 if open else 0.38); dock_btns[k].tooltip_text = "" if open else UNLOCK_HINT.get(k, "")
		if open and not _unlocked.get(k, false) and not _unlocked.is_empty() and started: news.append(str(d[1]).capitalize())
		_unlocked[k] = open
	if not news.is_empty(): toast("Unlocked: %s" % ", ".join(news), "good")   # one message for one event

func _dock(key: String) -> void:
	if not is_unlocked(key): toast(UNLOCK_HINT.get(key, "Not available yet."), "info"); return
	if dock_key(cur) == key and key != "dash": show_screen("dash")   # clicking the open drawer closes it
	else: show_screen(last_tab.get(key, key))

func show_screen(id: String) -> void:
	var prev := cur
	drawer_hidden = false; holder.visible = true
	for sc in screens.values(): sc.visible = false
	cur = id; last_tab[dock_key(id)] = id
	if coach != null: coach.visited(dock_key(id))
	Kit.accent = accent_of(id)
	if top != null: top.add_theme_stylebox_override("panel", _top_sb(Kit.accent))
	hall.visible = not FULL.has(id)
	var cover := 0.0
	if OVERLAY.has(id): cover = overlay_w()
	elif not FULL.has(id): cover = drawer_w(id)
	hall.set_cover(cover + (inset.z if cover > 0.0 else 0.0)); hall.blocked = FULL.has(cur)
	if not screens.has(id): screens[id] = _make_screen(id); holder.add_child(screens[id])
	var scr: Control = screens[id]
	if scr is ScreenWrap:   # (re)apply the inner margins: some screens reset their own anchors in _ready()
		var inn: Control = (scr as ScreenWrap).inner
		inn.set_anchors_preset(Control.PRESET_FULL_RECT); inn.offset_left = 18; inn.offset_right = -18; inn.offset_bottom = -14
		inn.offset_top = 58 if (GROUPS.has(dock_key(id)) and not FULL.has(id)) else 14
	if not OVERLAY.has(id) and not FULL.has(id): scr.offset_left = -drawer_w(id)
	scr.visible = true
	if scr.has_method("refresh"): scr.refresh()
	if started and prev != id and not quiet and not OS.has_environment("GW_SHOT") and not OS.has_environment("GW_SMOKE"): Kit.appear(scr, not (FULL.has(id) or FULL.has(prev)), 0.18)
	for k in dock_btns: _dock_paint(dock_btns[k], k == dock_key(id))
	if inspector != null and is_instance_valid(inspector) and prev != id: inspector.queue_free(); inspector = null   # a rack card from another drawer would sit on this one's panels
	_place_tab()

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

## Dev check (GW_AUDIT=1): print controls on the open screen that are squeezed to a sliver and stretched tall, or run off the screen.
func _audit_layout() -> void:
	var scr = screens.get(cur)
	if scr == null: return
	var vs := get_viewport().get_visible_rect().size; var n := 0
	for c in (scr as Node).find_children("*", "Control", true, false):
		var ctl := c as Control
		if not ctl.is_visible_in_tree(): continue
		var r := ctl.get_global_rect()
		var thin: bool = r.size.x < 90.0 and r.size.y > 240.0 and not (ctl is ScrollBar) and not (ctl is VSeparator)
		if thin or r.size.y > 2400.0:
			var path := ""; var p: Node = ctl
			for i in 5: if p != null and p != scr: path = "%s/%s" % [p.get_class(), path]; p = p.get_parent()
			print("AUDIT %s thin %s size=%s text=%s" % [cur, path, r.size, str(ctl.get("text")).left(50)]); n += 1
			if n > 12: break
	var wide := []
	for c in (scr as Node).find_children("*", "Control", true, false):
		var ctl := c as Control
		if ctl.is_visible_in_tree() and not (ctl is ScrollContainer): wide.append([ctl.get_combined_minimum_size().x, ctl.get_class(), str(ctl.get("text")).left(40), ctl.get_parent().get_class() if ctl.get_parent() else ""])
	wide.sort_custom(func(a, b): return a[0] > b[0])
	for i in mini(6, wide.size()): print("AUDITWIDE %s %s" % [cur, wide[i]])
	var leaf := wide.filter(func(w): return str(w[2]) != "<null>")   # the widest controls that carry text: these are what push a drawer wider than the screen
	for i in mini(6, leaf.size()): print("AUDITLEAF %s %s" % [cur, leaf[i]])
	print("AUDIT %s done n=%d frac=%.2f cover=%.0f vw=%.0f scr_left=%.0f" % [cur, n, Settings.drawer_frac, _cover_of(cur), vs.x, (scr as Control).offset_left])

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
		if Layout.touch:   # scrolls by finger instead of cutting content off
			var ss := ScreenScroll.new(c); w.add_child(ss); w.inner = ss; return w
		w.add_child(c); w.inner = c; return w
	return c

func set_speed(v: int) -> void: speed = v; clock = 0.0; _on_changed()
func _speed_label() -> void:
	for i in lbl.speed_btns.size():
		var on: bool = i == clampi(speed, 0, 3); var sb: Button = lbl.speed_btns[i]
		if sb.get_meta("on", -1) != int(on): sb.set_meta("on", int(on)); Kit.skin(sb, ("pri" if i == 0 else "go") if on else "")

func next_month() -> void:
	if not started: return
	audio.play("month"); b.act("nextMonth"); _claim()   # nextMonth already steps the Easy-path projects
	if OS.get_environment("GW_NOAUTOSAVE") == "": pass

## Launch keynotes queue up in the engine (g.news); show them one at a time and stop the clock while one is open.
## Cards are news: only a keynote of the current month and the chapter of the current year are shown. Older ones (a loaded save,
## fast-forward, autoplay, the months after the end screen) are acknowledged silently: they stay readable in Supply ▸ Roadmap and the Codex.
func check_keynote() -> void:
	if not started or keynote == null or keynote.visible or (story_ui != null and story_ui.visible) or end_ui != null or menu_ui != null or _hold_changes: return
	if Engine.get_frames_drawn() < 5: get_tree().create_timer(0.25).timeout.connect(check_keynote); return   # let the first layout pass finish
	if b.g.get("status", "playing") != "playing": _drop_queued_cards(true); return   # the game is over: nothing is news any more
	_drop_queued_cards(false)
	var news: Array = b.g.get("news", [])
	if news.is_empty(): check_story(); return
	if OS.has_environment("GW_SMOKE") or OS.has_environment("GW_NOKEYNOTE") or _clean: _drop_queued_cards(true); return
	var l: Dictionary = b.qd("launches")
	if l.get("news", []).is_empty(): check_story(); return
	keynote.open(l.news[0], l.news.size() - 1); speed = 0; clock = 0.0; audio.play("keynote")
	_speed_label()

## Acknowledge queued keynotes and chapters without showing them: all of them, or only those older than this month (keynotes) / year (chapters).
var _hold_changes := false
func _drop_queued_cards(all := false) -> void:
	if b == null or _hold_changes: return
	_hold_changes = true   # one refresh at the end, not one per acknowledged card
	var n := 0
	while n < 300 and not b.g.get("news", []).is_empty():
		var l: Dictionary = b.qd("launches")
		if l.get("news", []).is_empty() and not all: break
		if not all and not l.news.is_empty() and int(l.news[0].month) >= int(b.g.month): break
		b.act("ackNews"); n += 1
	while n < 600:
		var st: Dictionary = b.qd("story")
		var cards: Array = b.g.get("story", {}).get("cards", []) if b.g.get("story") is Dictionary else []
		if cards.is_empty(): break
		if not all and st.get("chapter") != null and int(b.g.month) - (int(st.chapter.year) - 2020) * 12 <= 2: break   # a chapter opens its January; by April it is history
		b.act("ackStory"); n += 1
	_hold_changes = false
	if n > 0: _on_changed()

## Skip all: acknowledge every queued keynote (they stay in the Roadmap).
func skip_all_keynotes() -> void:
	_hold_changes = true
	var n := 0
	while n < 300 and not b.g.get("news", []).is_empty(): b.act("ackNews"); n += 1
	_hold_changes = false
	keynote.visible = false; _on_changed()

## Story cards queue up in the engine (g.story): a chapter every January, and now and then a two-way decision.
func check_story() -> void:
	if not started or story_ui == null or story_ui.visible or keynote.visible or end_ui != null or menu_ui != null or _hold_changes: return
	if Engine.get_frames_drawn() < 5: get_tree().create_timer(0.25).timeout.connect(check_story); return
	var st: Dictionary = b.qd("story")
	if st.is_empty(): return
	if OS.has_environment("GW_SMOKE") or OS.has_environment("GW_NOKEYNOTE") or _clean:
		if st.get("chapter") != null: b.act("ackStory")
		return
	if st.chapter != null:
		story_ui.open_chapter(st.chapter); speed = 0; clock = 0.0; _speed_label(); audio.play("keynote"); return
	if st.dilemma != null and str(st.dilemma.id) != dilemma_dismissed:
		story_ui.open_dilemma(st.dilemma); speed = 0; clock = 0.0; _speed_label(); audio.play("notif")

## The Overview "needs you" card opens a decision you chose to answer later.
func open_decision() -> void:
	dilemma_dismissed = ""; check_story()

func _claim() -> void:
	for m in b.claim_missions(): audio.play("fanfare")   # the engine logs "★ Mission complete: …": shown once, as a toast (no second banner on top of a drawer)

var _stats_on := OS.has_environment("GW_STATS")
var _stats_t := 0.0
func _process(dt: float) -> void:
	_modal_front()
	_process_tip()
	_age_toasts(dt)
	_keyboard_lift()
	_rail_cue()
	if _stats_on:
		_stats_t += dt
		if _stats_t > 2.0:
			_stats_t = 0.0
			print("STATS draws=%d prims=%d vram_mb=%d fps=%d" % [RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME), RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME), int(RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_VIDEO_MEM_USED)) / 1048576, int(Engine.get_frames_per_second())])
	if _changed_pending and not TouchScroll.is_busy(): _on_changed()
	elif _refresh_due and Time.get_ticks_msec() >= _refresh_at and not TouchScroll.is_busy(): _refresh_cur()
	var idle := started and speed == 0 and Time.get_ticks_msec() - _last_input > 3000
	if idle != Settings.idle: Settings.idle = idle; Settings.apply_fps()
	if not started or speed == 0 or modal() != null: return   # the clock never runs under a dialog: a confirm must not go stale while you read it
	clock += dt / SECS[speed]; bar_month.value = clock
	if clock >= 1.0: clock = 0.0; next_month()

func _dbg() -> void:
	for k in screens: print(k, " rect=", screens[k].get_global_rect(), " vis=", screens[k].visible)
	print("holder=", holder.get_global_rect(), " root=", root.get_global_rect(), " top=", top.get_global_rect())

var _last_input := 0
func _input(e: InputEvent) -> void:
	_last_input = Time.get_ticks_msec()
	if e is InputEventKey and e.pressed and not e.echo:
		if e.keycode == KEY_Q and e.ctrl_pressed: _menu_do("quit")
		elif e.keycode == KEY_ESCAPE and get_viewport().gui_get_focus_owner() is LineEdit: get_viewport().gui_release_focus(); get_viewport().set_input_as_handled()   # leave the text field first
		elif e.keycode == KEY_ESCAPE:   # Esc closes the topmost thing; it never quits and never stacks the pause menu on another overlay
			var m := modal()
			if m != null and m.name != "title": get_viewport().set_input_as_handled(); pad._back()
			elif started and m == null: get_viewport().set_input_as_handled(); _menu()
			elif not started: get_viewport().set_input_as_handled()

var tip_panel: PanelContainer
var tip_lbl: RichTextLabel
func _on_rack_hover(slot: int, rk: Dictionary) -> void:
	if slot < 0 or rk.is_empty() or FULL.has(cur): tip_panel.visible = false; return
	var dn := ""; for d in b.g.racks:
		if d.id == rk.designId: dn = d.name
	var ci: Dictionary = hall.cluster_info(rk)
	var t := "[b]%s[/b]\nstatus: %s\n" % [dn, rk.status]
	if ci.is_empty(): t += "[color=#%s]not in a cluster[/color]" % Kit.DIM.to_html(false)
	else: t += "cluster: [color=#%s][b]%s[/b][/color]\ncustomer: %s" % [ci.color.to_html(false), ci.name, ci.customer if ci.customer != "" else "— (unassigned)"]
	tip_lbl.text = t; tip_panel.visible = true

## Touch has no wheel, right-drag or hotkeys, so the hall camera gets on-screen buttons: zoom, top view, heat view, rack labels.
var cam_tools: VBoxContainer
func _build_cam_tools() -> void:
	cam_tools = VBoxContainer.new(); cam_tools.add_theme_constant_override("separation", 6); cam_tools.visible = false; cam_tools.mouse_filter = Control.MOUSE_FILTER_IGNORE; root.add_child(cam_tools)
	var defs := [["+", "Zoom in", func(): hall.dist = clampf(hall.dist * 0.8, 2.5, 60.0); hall._update_cam()],
		["−", "Zoom out", func(): hall.dist = clampf(hall.dist * 1.25, 2.5, 60.0); hall._update_cam()],
		["TOP", "Top view", func(): hall.top_view()],
		["HEAT", "Heat view", func(): tip_panel.visible = false; hall.thermal = not hall.thermal; hall.rebuild()],
		["TAGS", "Rack labels", func(): tip_panel.visible = false; hall.labels_on = not hall.labels_on; hall.rebuild()]]
	for d in defs:
		var bt := Kit.btn(d[0], d[2], "", 15); bt.tooltip_text = d[1]; bt.custom_minimum_size = Vector2(56, 52); bt.modulate.a = 0.88; cam_tools.add_child(bt)

func _place_cam_tools() -> void:
	if cam_tools == null: return
	cam_tools.set_anchors_preset(Control.PRESET_TOP_LEFT)
	var rail_r := dock_scroll.offset_left + maxf(RAIL_W - 6.0, dock_box.get_combined_minimum_size().x) if Layout.phone else 0.0   # right of the rail, however wide its buttons are
	cam_tools.offset_left = (rail_r + 10.0) if Layout.phone else 14.0; cam_tools.offset_top = _bar_h + 12.0
	cam_tools.offset_right = cam_tools.offset_left + 56.0; cam_tools.offset_bottom = cam_tools.offset_top

## The top bar never overflows: when it does not fit (large UI size, text boost, narrow window) things drop out in order of importance
## (secondary figures, the logo, the mode button, then NEXT and MENU shorten to icons), so the speed switch, NEXT and MENU stay on screen.
## Effective UI scale is also clamped (Layout.MIN_LOGICAL), so this always ends with everything essential visible.
func _fit_top() -> void:
	if top == null or not started or not top.visible: return
	var hb := top.get_child(0) as HBoxContainer
	var k := Layout.kind
	var avail := top.size.x - top.get_theme_stylebox("panel").get_minimum_size().x - 4.0
	lbl.title.visible = k == "desktop"; lbl.mode.visible = k == "desktop"
	next_btn.text = "NEXT MONTH ▶" if k == "desktop" else "NEXT ▶"; menu_btn.text = "MENU" if k != "phone" else "≡"
	for key in ["rev", "burn", "net", "nw", "rep"]: if lbl.get(key + "_box") != null: (lbl[key + "_box"] as Control).visible = true
	if lbl.get("debt_box") != null: (lbl.debt_box as Control).visible = b != null and float(b.g.debt) > 0.0 and k == "desktop"
	if lbl.get("netw_box") != null: (lbl.netw_box as Control).visible = _net_on and k != "phone"
	(lbl.date.get_parent() as Control).custom_minimum_size.x = 110.0
	for step in ["debt", "netw", "rep", "nw", "title", "burn", "mode", "net", "next", "menu", "rev", "date"]:
		if hb.get_combined_minimum_size().x <= avail: break
		match step:
			"title": lbl.title.visible = false
			"mode": lbl.mode.visible = false
			"next": next_btn.text = "NEXT ▶"
			"menu": menu_btn.text = "≡"; menu_btn.custom_minimum_size.x = maxf(menu_btn.custom_minimum_size.x, 48.0)
			"date": (lbl.date.get_parent() as Control).custom_minimum_size.x = 0.0; next_btn.custom_minimum_size.x = 0.0; next_btn.text = "▶"
			_: if lbl.get(step + "_box") != null: (lbl[step + "_box"] as Control).visible = false
	menu_btn.add_theme_font_size_override("font_size", Kit.fs(26 if menu_btn.text == "≡" else 14))   # the icon needs a bigger size to read as one

## Toasts and the mission banner sit under dialogs (hidden while one is open) and only age while they can be seen.
var _last_vp := Vector2.ZERO
func _age_toasts(dt: float) -> void:
	if root == null or toasts == null: return
	var vpsz := get_viewport().get_visible_rect().size
	if vpsz != _last_vp:   # window, UI size, text size or layout changed: refit the top bar, dialogs and camera buttons
		_last_vp = vpsz; _fit_top(); _place_cam_tools()
	_fit_dialogs()
	var show_now := modal() == null
	if hall != null: hall.keys_off = not show_now
	if cam_tools != null: cam_tools.visible = started and Layout.touch and show_now and not FULL.has(cur)
	# The drawer's divider is drawn under dialogs but would still win the click at its position (the GUI picks by tree order, not z-index):
	# a dialog button near the drawer edge ignored taps. Under a dialog the divider takes no input at all.
	if drawer_tab != null: drawer_tab.mouse_filter = Control.MOUSE_FILTER_STOP if show_now else Control.MOUSE_FILTER_IGNORE
	toasts.visible = started and show_now and not _clean   # hidden, not transparent: an invisible toast must never take a tap meant for a dialog
	_place_floaters()
	if heat_key != null:
		heat_key.visible = started and show_now and hall.thermal and not FULL.has(cur) and not _clean
		if heat_key.visible: var hfr := free_hall_rect(); heat_key.reset_size(); heat_key.position = Vector2(hfr.position.x, hfr.position.y + 44.0)   # under the money chips
	if month_strip != null and month_strip.has_meta("life"):
		var ml := float(month_strip.get_meta("life")) - (dt if show_now else 0.0)
		month_strip.set_meta("life", ml); month_strip.visible = started and show_now and ml > 0.0 and not FULL.has(cur)
		if ml <= 0.6 and (_strip_tw == null or not _strip_tw.is_valid()): month_strip.modulate.a = maxf(0.0, ml / 0.6)
		if month_strip.visible:
			var mfr := free_hall_rect(); month_strip.reset_size()
			month_strip.position = Vector2(maxf(mfr.position.x, mfr.end.x - month_strip.size.x), mfr.position.y)   # right-aligned: the money chips drop under the left of the bar
	if not show_now: return
	for t in toasts.get_children():
		var life := float(t.get_meta("life", 7.0)) - dt
		t.set_meta("life", life)
		if life <= 1.0: t.modulate.a = maxf(0.0, life)
		if life <= 0.0: toasts.remove_child(t); t.queue_free()

## The part of the hall that no drawer, dock, rail, camera-button column, drawer divider or screen panel (Build's placement bar, the
## rack inspector) covers, in root coordinates. Toasts and the tutorial card live only here.
func free_hall_rect() -> Rect2:
	var rail := Layout.phone
	var l := (RAIL_W + 8.0 if rail else 0.0) + 14.0
	if cam_tools != null and Layout.touch and not FULL.has(cur): l = cam_tools.offset_right + 10.0
	var t := _bar_h + 12.0
	var cov := 0.0 if drawer_hidden or FULL.has(cur) else maxf(0.0, hall.cover_px - inset.z)
	var r := vw() - cov - 14.0
	if drawer_tab != null and drawer_tab.visible: r = minf(r, drawer_tab.position.x - 6.0)
	var bt := vs_h() - (10.0 if rail else _dock_h + 14.0)
	var oy := root.get_global_rect().position.y
	var scr = screens.get(cur)
	if scr != null and is_instance_valid(scr) and scr.visible and OVERLAY.has(cur):
		for c in scr.get_children():
			if c is Control and c.visible and c.anchor_top > 0.99 and c.anchor_left < 0.01 and c.anchor_right < 0.01: bt = minf(bt, c.get_global_rect().position.y - oy - 10.0)
	if inspector != null and is_instance_valid(inspector) and inspector.visible: bt = minf(bt, inspector.get_global_rect().position.y - oy - 10.0)
	return Rect2(l, t, maxf(0.0, r - l), maxf(0.0, bt - t))

## Toasts stack upward from the bottom of the free hall area, above the tutorial card when it shows. At most 2 on small screens.
func _place_floaters() -> void:
	if toasts == null or hall == null: return
	var fr := free_hall_rect()
	var bottom := fr.end.y
	if coach != null and coach.card != null and coach.card.visible: bottom = minf(bottom, coach.card.position.y - 8.0)
	bottom = maxf(bottom, fr.position.y + 120.0)   # too little free hall: sit just under the bar rather than on it
	var w := clampf(fr.size.x, 180.0, 380.0)
	toasts.set_anchors_preset(Control.PRESET_TOP_LEFT); toasts.grow_vertical = Control.GROW_DIRECTION_BEGIN
	toasts.offset_left = fr.position.x; toasts.offset_right = fr.position.x + w
	toasts.offset_bottom = bottom; toasts.offset_top = bottom
	for t in toasts.get_children(): (t as Control).custom_minimum_size.x = w
	if inspector != null and is_instance_valid(inspector): inspector.offset_left = fr.position.x if Layout.touch else 18.0

## Android/iOS on-screen keyboard: while a text field has focus and the keyboard would cover it, the whole interface (the UI canvas
## layer) slides up just enough to show the field above the keyboard, and slides back when the keyboard closes. Central, so every
## screen's name and filter fields benefit. GW_FAKE_KB=<px> simulates a keyboard of that height on a desktop.
var _kb_lift := 0.0
func _keyboard_lift() -> void:
	if ui == null: return
	var want := 0.0
	var fo := get_viewport().gui_get_focus_owner()
	var typing := fo != null and (fo is LineEdit or fo is TextEdit) and fo.is_visible_in_tree()
	var kh := 0.0
	if typing and DisplayServer.has_feature(DisplayServer.FEATURE_VIRTUAL_KEYBOARD): kh = float(DisplayServer.virtual_keyboard_get_height())
	if typing and OS.has_environment("GW_FAKE_KB"): kh = float(OS.get_environment("GW_FAKE_KB"))
	if kh > 0.0:
		var vp := get_viewport().get_visible_rect().size
		var ratio := float(DisplayServer.window_get_size().y) / maxf(1.0, vp.y)   # screen pixels per interface pixel
		var kb_top := vp.y - kh / maxf(ratio, 0.01)
		var bottom := fo.get_global_rect().end.y + 14.0
		want = clampf(bottom - kb_top, 0.0, vp.y * 0.75)
	if absf(want - _kb_lift) > 0.5:
		_kb_lift = want if absf(want - _kb_lift) < 3.0 else lerpf(_kb_lift, want, 0.45)
		ui.offset = Vector2(0.0, -_kb_lift)

## Phones: the dock rail scrolls when its tabs do not fit; a fade and an arrow at its bottom (or top) say there is more.
var _rail_fade: Label
var _rail_fade_up: Label
func _rail_cue() -> void:
	if dock_scroll == null: return
	if _rail_fade == null:
		for up in [false, true]:
			var l := Kit.label("▲" if up else "▼", 14, Kit.TX); l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; l.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM if not up else VERTICAL_ALIGNMENT_TOP
			l.mouse_filter = Control.MOUSE_FILTER_IGNORE; l.visible = false
			var gt := GradientTexture2D.new(); var gr := Gradient.new(); gr.colors = PackedColorArray([Color(0, 0, 0, 0.0), Color(0, 0, 0, 0.85)] if not up else [Color(0, 0, 0, 0.85), Color(0, 0, 0, 0.0)]); gt.gradient = gr; gt.fill_from = Vector2(0, 0); gt.fill_to = Vector2(0, 1); gt.width = 8; gt.height = 64
			var bg := TextureRect.new(); bg.texture = gt; bg.stretch_mode = TextureRect.STRETCH_SCALE; bg.set_anchors_preset(Control.PRESET_FULL_RECT); bg.mouse_filter = Control.MOUSE_FILTER_IGNORE; bg.show_behind_parent = true; l.add_child(bg)
			root.add_child(l)
			if up: _rail_fade_up = l
			else: _rail_fade = l
	var rail := Layout.phone and dock_scroll.visible and modal() == null
	var r := dock_scroll.get_global_rect(); var o := root.get_global_rect().position
	var over := dock_box.size.y - r.size.y
	var sv := float(dock_scroll.scroll_vertical)
	_rail_fade.visible = rail and over > 4.0 and sv < over - 4.0
	_rail_fade_up.visible = rail and over > 4.0 and sv > 4.0
	if _rail_fade.visible: _rail_fade.position = Vector2(r.position.x - o.x, r.end.y - o.y - 40.0); _rail_fade.size = Vector2(r.size.x, 40.0)
	if _rail_fade_up.visible: _rail_fade_up.position = r.position - o; _rail_fade_up.size = Vector2(r.size.x, 34.0)

func _process_tip() -> void:
	if root == null or tip_panel == null or not tip_panel.visible: return
	# the rack tooltip belongs to the 3D hall only: gone as soon as the pointer is over any interface control or a dialog is open
	if modal() != null or get_viewport().gui_get_hovered_control() != null: tip_panel.visible = false; return
	# ... and only while the pointer is truly over a rack, on the free part of the hall (not under a drawer or a floating card)
	if hall._hover < 0 or not free_hall_rect().has_point(get_viewport().get_mouse_position()): tip_panel.visible = false; return
	var vp := get_viewport().get_visible_rect().size
	tip_panel.position = (get_viewport().get_mouse_position() + Vector2(18, 18)).clamp(Vector2.ZERO, (vp - tip_panel.size).max(Vector2.ZERO))

func _unhandled_key_input(e: InputEvent) -> void:
	if not (e is InputEventKey) or not e.pressed or e.echo: return
	var tgt := get_viewport().gui_get_focus_owner()
	if tgt is LineEdit or tgt is SpinBox: return
	var top := modal()
	if e.keycode == KEY_F1 and (top == null or top == settings_ui or top.name == "title"): _settings(); return
	if not started or modal() != null: return   # no hotkeys behind a dialog (Space used to skip months under a chapter card)
	if e.keycode == KEY_SPACE: next_month(); return
	if e.keycode >= KEY_1 and e.keycode <= KEY_9 and e.keycode - KEY_1 < DOCK.size(): _dock(DOCK[e.keycode - KEY_1][0])
	elif e.keycode == KEY_0: _dock("codex")
	elif e.keycode == KEY_V: hall.top_view()
	elif e.keycode == KEY_L: tip_panel.visible = false; hall.labels_on = not hall.labels_on; hall.rebuild()
	elif e.keycode == KEY_T: tip_panel.visible = false; hall.thermal = not hall.thermal; hall.rebuild()



## CI smoke test (GW_SMOKE=1): load the campus scenario, open every screen, act a little, quit. Prints SMOKE OK.
func _smoke() -> void:
	quiet = true; _load_scenario("stress-campus")
	for sc in SCREENS:
		show_screen(sc[0]); await get_tree().process_frame; await get_tree().process_frame
	for t in b.templates:   # every purchasable rack builds, with one scale-out cable per modelled NIC
		var f: Dictionary = b.q("templateFacts", [t.id]); var rm := RackModel.new(); add_child(rm); var sp: Dictionary = RackModel.spec_from_template(b, t, f); rm.build(sp, 2)
		assert(int(rm.cable_count().scale_out) == int(sp.n) * int(sp.nics), "cable count for %s" % t.id)
		rm.queue_free()
	for fl in Site.FLOORS:   # every floor x wall pair builds
		for wl in Site.WALLS: b.act("setSite", [{"floor": fl[0], "walls": wl[0]}]); hall.rebuild()
	b.act("setSite", [Site.DEFAULT])
	for t in Kit.THEMES:   # every theme restyles the shell and rebuilds the screens
		Settings.theme = t.id; _restyle()
		for sc in SCREENS: show_screen(sc[0])
	Settings.theme = "midnight"; _restyle()
	var seen := {}
	for nm in Logo.KNOWN:
		var k: Array = Logo.KNOWN[nm]; var key: int = int(k[0]) * 8 + int(k[1]); assert(not seen.has(key), "two companies share a logo colour and mark: %s and %s" % [nm, seen.get(key)]); seen[key] = nm
	var small := 0
	for scr in screens.values(): small += _small_fonts(scr)
	print("FONTS below %d px: %d" % [Kit.MIN_FONT, small]); assert(small == 0, "text smaller than the readable minimum")
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
	var lk: Dictionary = b.qd("launches"); print("LAUNCHES ", lk.get("list", []).size(), " news=", lk.get("news", []).size())
	print("SMOKE OK screens=%d racks=%d" % [SCREENS.size(), b.g.halls[0].racks.size()])
	b.stop(); get_tree().quit()

## Count visible text controls whose font is below Kit.MIN_FONT (checked by the smoke test).
func _small_fonts(n: Node) -> int:
	var bad := 0
	if n is Label:
		var l := n as Label; var sz: int = l.label_settings.font_size if l.label_settings != null else l.get_theme_font_size("font_size")
		if sz < Kit.MIN_FONT and l.text.strip_edges() != "": bad += 1
	elif n is Button:
		if (n as Button).get_theme_font_size("font_size") < Kit.MIN_FONT and (n as Button).text.strip_edges() != "": bad += 1
	elif n is RichTextLabel:
		if (n as RichTextLabel).get_theme_font_size("normal_font_size") < Kit.MIN_FONT: bad += 1
	for c in n.get_children(): bad += _small_fonts(c)
	return bad

# ---------- settings + controls ----------
var settings_ui: Control
var settings_pn: PanelContainer
var _settings_tab := "Display"
const KEYS := [["Space", "Next month"], ["1-8", "Open a drawer or workshop"], ["0", "Open the Codex"], ["T", "Thermal view"], ["V", "Top view"], ["L", "Rack labels"], ["Esc", "Close the top dialog, or open the pause menu"], ["F1", "Settings"], ["Ctrl+Q", "Save and quit"],
	["Left-drag, WASD, arrows", "Pan the hall"], ["Right-drag, Q E", "Orbit the hall"], ["Middle-drag, Shift+right-drag", "Pan the hall"], ["Wheel", "Zoom"], ["⏸ 1x 2x 3x (top bar)", "Pause, or advance automatically at that speed"], ["Click a toast", "Dismiss it"]]
const TOUCH_KEYS := [["Tap", "Press a button; tap a rack to inspect it"], ["Drag", "Pan the hall; scroll any list from anywhere"], ["Pinch", "Zoom"], ["Two fingers twist / drag", "Orbit"], ["+  −  TOP  HEAT  TAGS", "On-screen buttons: zoom, top view, heat view, rack labels"],
	["⏸  1x  2x  3x", "Pause, or advance automatically at that speed; NEXT advances one month"], ["Tap a toast", "Dismiss it"], ["Tutorial pill", "Tap to open the tutorial card; ▾ folds it back"],
	["Divider on a drawer's edge", "Drag to resize the drawer; tap to fold it away"], ["Android Back", "Close the top dialog, leave a drawer, then open the pause menu"]]
const PAD_KEYS := [["A", "Select"], ["B", "Back"], ["X", "Inspect rack"], ["Y", "Next month"], ["LB / RB", "Switch drawer"], ["LT / RT", "Zoom"], ["Left stick", "Pan"], ["Right stick", "Orbit"], ["L3 / R3", "Top view / rack labels"], ["D-pad", "Navigate; left and right change a slider"], ["Start", "Menu"], ["View", "Speed"]]
func _settings() -> void:
	if settings_ui != null: settings_ui.queue_free(); settings_ui = null; return
	if OS.has_environment("GW_SETTINGS_TAB"): _settings_tab = OS.get_environment("GW_SETTINGS_TAB")
	var h := Control.new(); h.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_child(h); settings_ui = h
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.6); dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.offset_left = -inset.x; dim.offset_top = -inset.y; dim.offset_right = inset.z; dim.offset_bottom = inset.w; h.add_child(dim)
	var pn := PanelContainer.new(); settings_pn = pn; pn.clip_contents = true
	pn.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.98), Kit.CY, 14, 2, 22 if not Layout.phone else 14)); h.add_child(pn)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 10); pn.add_child(vb)
	var head := HBoxContainer.new(); vb.add_child(head)   # the one Close button: in the header, so it stays reachable however big the UI is scaled
	head.add_child(Kit.label("SETTINGS", 30 if not Layout.phone else 24, Kit.CY)); var hsp := Control.new(); hsp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; head.add_child(hsp)
	head.add_child(Kit.btn("Close ✕", func(): if settings_ui != null: settings_ui.queue_free(); settings_ui = null, "pri", 16))
	var tabs := HFlowContainer.new(); tabs.add_theme_constant_override("h_separation", 6); tabs.add_theme_constant_override("v_separation", 6); vb.add_child(tabs)
	var body := VBoxContainer.new(); body.add_theme_constant_override("separation", 12); body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var sc := ScrollContainer.new(); sc.size_flags_vertical = Control.SIZE_EXPAND_FILL; sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.add_child(body); body.size_flags_horizontal = Control.SIZE_EXPAND_FILL; vb.add_child(sc)
	_settings_fill(body, tabs)
	fit_dialog(pn, 820.0, body, 700.0)   # a fixed height, so switching tabs does not make the dialog jump; the body scrolls

func _settings_fill(body: VBoxContainer, tabs: Container) -> void:
	for c in tabs.get_children(): c.queue_free()
	for t in ["Display", "Graphics", "Audio", "Accessibility", "Controls"]:
		tabs.add_child(Kit.btn(t, func(): _settings_tab = t; _settings_fill(body, tabs), "pri" if t == _settings_tab else "", 15))
	for c in body.get_children(): c.queue_free()
	match _settings_tab:
		"Display": _set_display(body)
		"Graphics": _set_graphics(body)
		"Audio": _set_audio(body)
		"Accessibility": _set_access(body)
		"Controls": _set_controls(body)

## A settings row: a label column (narrower on small screens, so nothing pushes the dialog wider than the screen) and a control.
func _row(parent: Control, title: String) -> HBoxContainer:
	var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 14 if vw() > 700.0 else 8); parent.add_child(r)
	var l := Kit.label(title, 16, Kit.TX, true); l.custom_minimum_size = Vector2(170.0 if vw() > 700.0 else 110.0, 0); l.size_flags_vertical = Control.SIZE_SHRINK_CENTER; l.size_flags_horizontal = Control.SIZE_FILL; r.add_child(l)
	return r

func _opt_row(parent: Control, title: String, items: Array, selected: int, cb: Callable) -> OptionButton:
	var r := _row(parent, title)
	var o := OptionButton.new(); o.add_theme_font_size_override("font_size", 16); o.clip_text = true; o.custom_minimum_size = Vector2(120, maxf(36.0, Layout.tap())); for n in items: o.add_item(n)
	o.selected = clampi(selected, 0, items.size() - 1); o.size_flags_horizontal = Control.SIZE_EXPAND_FILL; o.item_selected.connect(cb); r.add_child(o); return o

## A slider with a fixed-width readout (the track never changes length as the number changes, so the knob stays under the finger).
## apply_on_release: the value is applied when the drag ends (UI size and text boost rescale the whole interface: applied mid-drag
## the slider would move away from the pointer); keyboard and controller steps apply at once.
func _value_row(parent: Control, title: String, lo: float, hi: float, step: float, val: float, fmt: Callable, on_set: Callable, apply_on_release := false) -> HSlider:
	var r := _row(parent, title)
	var s := HSlider.new(); Kit.ring(s); s.min_value = lo; s.max_value = hi; s.step = step; s.value = val; s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	s.scrollable = false   # the mouse wheel scrolls the dialog; it never changes a setting it happens to pass over
	s.custom_minimum_size = Vector2(120 if vw() < 700.0 else 220, maxf(28.0, Layout.tap() * 0.75)); r.add_child(s)
	var rd := Kit.label(str(fmt.call(val)), 15, Kit.DIM); rd.custom_minimum_size = Vector2(130 if vw() > 700.0 else 96, 0); rd.clip_text = true; rd.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT; r.add_child(rd)
	s.set_meta("drag", false)
	s.drag_started.connect(func(): s.set_meta("drag", true))
	s.drag_ended.connect(func(_changed):   # saved once when the drag ends, not on every tick
		s.set_meta("drag", false)
		if apply_on_release: on_set.call(s.value)
		else: Settings.save_all()
		rd.text = str(fmt.call(s.value)))
	s.value_changed.connect(func(v):
		if not apply_on_release or not bool(s.get_meta("drag", false)):
			on_set.call(v)
			if not apply_on_release and not bool(s.get_meta("drag", false)): Settings.save_all()   # keyboard / controller step
		rd.text = str(fmt.call(v)))
	return s

## A real on/off switch with its label (the state is the switch position, not the button's text).
func _switch_row(parent: Control, title: String, on: bool, cb: Callable) -> CheckButton:
	var c := CheckButton.new(); c.text = title; c.button_pressed = on; c.add_theme_font_size_override("font_size", 16); c.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	c.custom_minimum_size.y = maxf(36.0, Layout.tap()); c.focus_mode = Kit.focus_mode(); c.toggled.connect(cb); parent.add_child(c)
	for k in ["font_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color", "font_focus_color"]: c.add_theme_color_override(k, Kit.TX)   # the default is white-ish: invisible on the light themes
	return c

## Slider readout for UI size / text boost: "150%", or "200% → 142%" when this screen cannot take that much together with the other slider.
func _pct_label(v: float, other: float, auto_at_one := false) -> String:
	var w := int(round(v * 100.0))
	var g := int(round(minf(v, Settings.ui_pct_max(get_window()) / maxf(other, 0.01)) * 100.0))
	var t := "%d%%" % w
	if auto_at_one and w == 100: t += " · auto"
	if g < w - 1: t += " → %d%%" % g
	return t

func _set_display(vb: VBoxContainer) -> void:
	_opt_row(vb, "Layout", ["Auto (this device)", "Desktop / laptop / console", "Handheld (Steam Deck)", "Phone"], ["auto", "desktop", "handheld", "phone"].find(Settings.layout), func(i): Settings.layout = ["auto", "desktop", "handheld", "phone"][i]; Settings.apply(get_window()); Settings.save_all(); get_window().size_changed.emit())
	vb.add_child(Kit.label("Running as: %s (%s). The layout changes the top bar, dock and drawers, not the game." % [Layout.kind, "auto" if Settings.layout == "auto" and not OS.has_environment("GW_LAYOUT") else "forced"], 13, Kit.DIM, true))
	vb.add_child(Kit.label("UI THEME", 13, Kit.DIM))
	for dk in [true, false]:
		var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 6); fl.add_theme_constant_override("v_separation", 6); vb.add_child(fl)
		fl.add_child(Kit.label("Dark" if dk else "Light", 15, Kit.DIM))
		for t in Kit.THEMES:
			if bool(t.dark) != dk: continue
			var id: String = t.id
			fl.add_child(Kit.btn(str(t.name), func(): if Settings.theme != id: Settings.theme = id; Settings.save_all(); audio.play("click"); _restyle_smooth(), "pri" if Settings.theme == id else "", 14))
	if not Layout.is_mobile(): _opt_row(vb, "Window mode", ["Windowed", "Fullscreen (borderless)", "Exclusive fullscreen"], Settings.window_mode, func(i): Settings.window_mode = i; Settings.save_all(); Settings.apply(get_window()))
	if not Layout.is_mobile(): _opt_row(vb, "V-Sync", ["Off", "On", "Adaptive"], Settings.vsync, func(i): Settings.vsync = i; Settings.save_all(); Settings.apply(get_window()))
	var caps := [0, 30, 40, 60, 90, 120, 144, 1000]
	_opt_row(vb, "Frame rate limit", ["Automatic", "30", "40", "60", "90", "120", "144", "Unlimited"], maxi(0, caps.find(Settings.fps_cap)), func(i): Settings.fps_cap = caps[i]; Settings.save_all(); Settings.apply_fps())
	var ui_note := Kit.label("", 13, Kit.DIM, true)
	var ui_note_upd := func(): ui_note.text = "100%% is the automatic size for this screen and layout. Text boost (Accessibility) multiplies on top. This screen allows up to %d%% in total (UI size × text boost), so the top bar, dock and drawers always fit; a readout like \"200%% → 140%%\" shows the limit." % int(Settings.ui_pct_max(get_window()) * 100.0)
	_value_row(vb, "UI size", 0.7, 2.0, 0.05, Settings.ui_scale, func(v): return _pct_label(v, Settings.text_boost, true),
		func(v): Settings.ui_scale = snappedf(v, 0.05); Settings.apply(get_window()); Settings.save_all(); ui_note_upd.call(), true)
	vb.add_child(ui_note); ui_note_upd.call()
	vb.add_child(Kit.label("%s\n%s" % [Settings.adapter, "%s · %s" % [RenderingServer.get_current_rendering_driver_name(), RenderingServer.get_current_rendering_method()]], 14, Kit.DIM, true))
	vb.add_child(Kit.btn("Copy diagnostics (for bug reports)", func(): DisplayServer.clipboard_set(Settings.diagnostics(get_window())); toast("Diagnostics copied to the clipboard.", "good"), "", 15))

func _set_graphics(vb: VBoxContainer) -> void:
	var names := ["Auto (%s)" % Settings.TIER_NAMES[Settings.detected]]; names.append_array(Settings.TIER_NAMES)
	var info := Kit.label("", 14, Kit.DIM, true)
	var upd := func():
		var t := Settings.tier()
		info.text = "3D at %d%% resolution · %s anti-aliasing · shadows %s · %s lights · textures %d px%s" % [int(t.scale * 100.0), str(t.aa).to_upper(), "on" if t.shadows else "off", "all" if t.lights >= 999 else str(t.lights), t.tex, " · compatibility renderer" if Settings.compat else ""]
	_opt_row(vb, "Graphics preset", names, Settings.preset + 1, func(i): Settings.preset = i - 1; Settings.save_all(); hall.apply_quality(); upd.call())
	if OS.get_name() == "Linux":
		var gi := ["auto", "dgpu", "igpu"]
		_opt_row(vb, "Graphics card", ["Auto (best available)", "Discrete GPU", "Integrated GPU"], gi.find(Settings.gpu), func(i): if Settings.gpu != gi[i]: Settings.gpu = gi[i]; Settings.save_all(); toast("Graphics card changes after restarting the game.", "info"))
		vb.add_child(Kit.label("Running on: %s (%s). Auto uses the discrete GPU when the system has one." % [Settings.adapter, RenderingServer.get_current_rendering_driver_name()], 13, Kit.DIM, true))
	_value_row(vb, "3D resolution", 0.35, 1.0, 0.05, Settings.render_scale if Settings.render_scale > 0.0 else 0.35, func(v): return "Preset" if v < 0.38 else "%d%%" % int(round(v * 100.0)),
		func(v): Settings.render_scale = 0.0 if v < 0.38 else snappedf(v, 0.05); hall.apply_quality(); upd.call())
	vb.add_child(info); upd.call()
	vb.add_child(Kit.label("The menus always draw at full resolution; only the 3D hall is scaled (FSR). Lower it on a weak GPU or a 4K screen.", 13, Kit.DIM, true))

func _set_audio(vb: VBoxContainer) -> void:
	_slider_row(vb, "Master volume", 0.0, 1.0, Settings.volume, func(v): Settings.volume = v; Settings.apply(get_window()))
	_slider_row(vb, "Music", 0.0, 1.0, Settings.music_volume, func(v): Settings.music_volume = v; audio.apply_volumes())
	_slider_row(vb, "Effects", 0.0, 1.0, Settings.sfx_volume, func(v): Settings.sfx_volume = v; audio.apply_volumes(); audio.play("confirm"))
	var mr := _row(vb, "Music style")
	var mo := OptionButton.new(); mo.clip_text = true; mo.size_flags_horizontal = Control.SIZE_EXPAND_FILL; mo.custom_minimum_size = Vector2(120, maxf(36.0, Layout.tap())); var ids := ["auto", "off"]; mo.add_item("Auto (changes with the game)"); mo.add_item("Off")
	for t in audio.catalog.music: mo.add_item("%s — %s" % [t.genre, t.title]); ids.append(t.id)
	mo.selected = maxi(0, ids.find(Settings.music_mode)); mr.add_child(mo)
	var np := Kit.label("", 13, Kit.DIM, true); vb.add_child(np)
	var upd := func(): np.text = ("♪ %s" % audio.now.title) if audio.now.has("title") else ""
	mo.item_selected.connect(func(i): Settings.music_mode = ids[i]; Settings.save_all(); audio.music_changed(); upd.call())
	mr.add_child(Kit.btn("Next ▶", func(): if Settings.music_mode != "off": audio.next_track(1.0); upd.call(), "", 14)); upd.call()

func _set_access(vb: VBoxContainer) -> void:
	_switch_row(vb, "Colour-blind-safe cluster palette", Settings.colorblind, func(on): Settings.colorblind = on; Settings.save_all(); hall.rebuild())
	_switch_row(vb, "Reduced motion (no auto-orbit, no sliding panels)", Settings.reduced_motion, func(on): Settings.reduced_motion = on; Settings.save_all())
	_value_row(vb, "Text size boost", 1.0, 1.5, 0.05, Settings.text_boost, func(v): return _pct_label(v, Settings.ui_scale),
		func(v): Settings.text_boost = snappedf(v, 0.05); Settings.apply(get_window()); Settings.save_all(), true)
	vb.add_child(Kit.label("Scales all text and controls. Together with UI size it is limited to what this screen can show (%d%% here)." % int(Settings.ui_pct_max(get_window()) * 100.0), 13, Kit.DIM, true))

## Touch devices list touch first (and no keyboard on phones); desktops list keyboard and mouse first.
func _set_controls(vb: VBoxContainer) -> void:
	var sets := [["KEYBOARD AND MOUSE", KEYS], ["CONTROLLER", PAD_KEYS], ["TOUCH", TOUCH_KEYS]]
	if Layout.touch: sets = [["TOUCH", TOUCH_KEYS], ["CONTROLLER", PAD_KEYS]] + ([] if Layout.is_mobile() else [["KEYBOARD AND MOUSE", KEYS]])
	var kw := 210.0 if vw() > 700.0 else 130.0
	for set_ in sets:
		vb.add_child(Kit.label(set_[0], 14, Kit.DIM))
		var g := GridContainer.new(); g.columns = 2; g.add_theme_constant_override("h_separation", 28 if vw() > 700.0 else 12); g.add_theme_constant_override("v_separation", 4); vb.add_child(g)
		for kv in set_[1]:
			var k := Kit.label(kv[0], 15, Kit.CY, true); k.custom_minimum_size = Vector2(kw, 0); g.add_child(k); var kd := Kit.label(kv[1], 15, Kit.TX, true); kd.size_flags_horizontal = Control.SIZE_EXPAND_FILL; g.add_child(kd)

func _slider_row(parent: Control, title: String, lo: float, hi: float, val: float, on_change: Callable) -> HSlider:
	return _value_row(parent, title, lo, hi, 0.05, val, func(v): return "%d%%" % int(round(v * 100.0)), on_change)

# ---------- game over + save slots ----------
var end_ui: Control
func _check_end() -> void:
	var st: String = b.g.get("status", "playing")
	if st == "playing" or end_ui != null or end_seen: return
	speed = 0; clock = 0.0; audio.play("gameover")
	var rep: Dictionary = b.q("endReport").get("report", {})
	if rep.is_empty(): return
	var won: bool = rep.reason == "horizon"; var col: Color = Kit.GR if won else Kit.RD
	var dl := make_dialog("end", 1120.0, col, 0.78); end_ui = dl[0]
	var vb: VBoxContainer = dl[2]
	var head: String = {"horizon": "2028 COMPLETE", "bankrupt": "GAME OVER", "fired": "THE BOARD HAS SPOKEN"}.get(str(rep.reason), "GAME OVER")
	vb.add_child(Kit.label(head, 18, Kit.DIM))
	vb.add_child(Kit.label(str(rep.rating).to_upper(), 48, col))
	if rep.get("epilogue") != null: vb.add_child(Kit.label(str(rep.epilogue), 17, Kit.TX, true))
	else: vb.add_child(Kit.label(str(rep.summary), 17, Kit.TX, true))
	vb.add_child(Kit.label(str(rep.summary), 13, Kit.DIM, true))
	var tl: Array = rep.get("timeline", [])
	if tl.size() > 3:
		var gr := HBoxContainer.new(); gr.add_theme_constant_override("separation", 20); vb.add_child(gr)
		for sp in [["REVENUE / MONTH", tl.map(func(x): return x.revenue), Kit.GR], ["CASH", tl.map(func(x): return x.cash), Kit.CY]]:
			var c := VBoxContainer.new(); c.size_flags_horizontal = Control.SIZE_EXPAND_FILL; c.add_child(Kit.label(sp[0], 11, Kit.DIM))
			var spk := Spark.new(); spk.values = sp[1]; spk.color = sp[2]; spk.custom_minimum_size = Vector2(0, 54); c.add_child(spk); gr.add_child(c)
	var grid := GridContainer.new(); grid.columns = 3 if vw() > 900.0 else 2; grid.add_theme_constant_override("h_separation", 60 if vw() > 900.0 else 28); grid.add_theme_constant_override("v_separation", 6); vb.add_child(grid)
	for kv in [["SCORE", Kit.num(rep.score)], ["NET WORTH", Kit.usd(rep.netWorth)], ["LIFETIME REVENUE", Kit.usd(rep.revenueTotal)], ["PEAK ACCELERATORS", Kit.num(rep.peakAccels)], ["CONTRACTS COMPLETED", str(int(rep.contractsCompleted))], ["REPUTATION", "★ %d" % int(rep.reputation)]]:
		var c := VBoxContainer.new(); c.add_child(Kit.label(kv[0], 11, Kit.DIM)); c.add_child(Kit.label(str(kv[1]), 24, Kit.TX)); grid.add_child(c)
	for k in [["BEST DEAL", "bestDeal", Kit.GR], ["WORST INCIDENT", "worstIncident", Kit.RD], ["VS THE RIVALS", "rivalLine", Kit.CY]]:
		if rep.get(k[1]) != null and str(rep[k[1]]) != "":
			var line := Kit.rich("[color=#%s][b]%s[/b][/color]  %s" % [k[2].to_html(false), k[0], str(rep[k[1]])], 14)
			if k[1] == "bestDeal" and rep.get("bestDealCustomer") != null:
				var lr := HBoxContainer.new(); lr.add_theme_constant_override("separation", 12); lr.add_child(Logo.make(str(rep.bestDealCustomer), 48.0)); lr.add_child(line); vb.add_child(lr)
			else: vb.add_child(line)
	var row := HFlowContainer.new(); row.add_theme_constant_override("h_separation", 12); row.add_theme_constant_override("v_separation", 8); vb.add_child(row)
	row.add_child(Kit.btn("Look around the hall", close_end, "", 18))
	if rep.get("shareText") != null: row.add_child(Kit.btn("Copy summary", func(): DisplayServer.clipboard_set(str(rep.shareText)); toast("Summary copied to the clipboard.", "good"), "", 18))
	row.add_child(Kit.btn("Back to title", func(): _menu_do("title"), "pri", 18))
var end_seen := false
## Esc / Back / B on the end screen: look around the hall. Whatever was still queued (keynotes, chapters) is history now: dropped.
func close_end() -> void:
	if end_ui != null: end_ui.queue_free(); end_ui = null
	end_seen = true; _drop_queued_cards(true)

## Save-slot picker. mode = "save" or "load"; used by the pause menu and the title screen.
## Load a save slot into the running engine, then enter the game (resuming the tutorial where it was left).
func _load_slot(slot: String, on_loaded: Callable = Callable()) -> void:
	var r := b.act("load", [slot])
	if not r.get("ok", false): toast(str(r.get("message", "Load failed.")), "bad"); return
	cur_slot = slot if slot != "auto" else ""; end_seen = false   # a different run: its own ending is still to come
	if inspector != null and is_instance_valid(inspector): inspector.queue_free(); inspector = null
	if on_loaded.is_valid(): on_loaded.call()
	var t := root.get_node_or_null("title")
	if t: t.queue_free()
	_begin(); toast("Loaded %s." % Kit.date_of(int(b.g.month)), "good")
	if Settings.tutorial == "on" and Settings.tutorial_step < Coach.STEPS.size() and b.g.get("mode", "operator") != "tycoon" and not OS.has_environment("GW_SMOKE"): coach.start(Settings.tutorial_step)
	check_keynote()

func _slots(mode: String, on_loaded: Callable = Callable(), from_menu := false) -> void:
	var dl := make_dialog("slots", 660.0, Kit.CY); var h: Control = dl[0]
	# opened from the pause menu: closing it any way but a finished save/load (Close, Esc, Back) returns to that menu
	if from_menu: h.tree_exited.connect(func(): if not bool(h.get_meta("done", false)) and started and menu_ui == null and is_inside_tree(): _menu())
	var vb: VBoxContainer = dl[2]
	vb.add_child(Kit.label("SAVE GAME" if mode == "save" else "LOAD GAME", 30, Kit.CY))
	var info := {}
	for s in b.qa("saves"): info[s.slot] = s
	var slots: Array = ["main", "slot2", "slot3"] if mode == "save" else ["main", "slot2", "slot3", "auto"]
	for slot in slots:
		if mode == "load" and not info.has(slot): continue
		var nm: String = {"main": "Slot 1", "slot2": "Slot 2", "slot3": "Slot 3", "auto": "Autosave"}[slot]
		var d := "empty"
		if info.has(slot):
			var i: Dictionary = info[slot]; d = "%s · %s · %d racks%s" % [Kit.date_of(int(i.month)), Kit.usd(float(i.cash)), int(i.racks), "" if i.status == "playing" else " · " + str(i.status).to_upper()]
		var bt := Kit.btn("%s\n%s" % [nm, d], func():
			if mode == "save":
				var do_save := func():
					var sr := b.act("save", [slot])
					if sr.get("ok", true): cur_slot = slot; h.set_meta("done", true); toast("Saved to %s." % nm, "good")
					else: toast(str(sr.get("message", "Could not save.")), "bad")
					if is_instance_valid(h): h.queue_free()
				# Writing over a different run asks first; saving again to the slot this run already uses does not.
				if info.has(slot) and slot != cur_slot: Kit.confirm(self, "%s holds another game (%s). Replace it?" % [nm, d], do_save, "Replace")
				else: do_save.call()
			else: h.set_meta("done", true); h.queue_free(); _load_slot(slot, on_loaded), "", 17)
		bt.custom_minimum_size = Vector2(0, 62); bt.alignment = HORIZONTAL_ALIGNMENT_LEFT; vb.add_child(bt)
	if mode == "load" and info.is_empty(): vb.add_child(Kit.label("No saved games yet.", 16, Kit.DIM))
	vb.add_child(Kit.btn("Close", func(): h.queue_free(), "", 16))

func _menu() -> void:
	if menu_ui != null: menu_ui.queue_free(); menu_ui = null; return
	get_viewport().gui_release_focus()   # nothing behind the dialog keeps the keyboard
	var wide: bool = (Layout.phone or vs_h() < 900) and vw() >= 620.0   # short screens: two columns so every button fits (the body scrolls if it still does not)
	var dl := make_dialog("", 780.0 if wide else 460.0, Kit.CY); menu_ui = dl[0]
	var vb: VBoxContainer = dl[2]; vb.add_theme_constant_override("separation", 14)
	vb.add_child(Kit.label("PAUSED", 36 if wide else 44, Kit.CY))
	var tgt: Control = vb
	if wide: var gr := GridContainer.new(); gr.columns = 2; gr.add_theme_constant_override("h_separation", 12); gr.add_theme_constant_override("v_separation", 10); vb.add_child(gr); tgt = gr
	var entries: Array = [["Resume", "resume"], ["Save game", "save"], ["Load game", "load"], ["Settings", "settings"], ["Change look", "look"], ["How to play", "guide"], ["Restart tutorial", "coach"], ["Toggle sound", "mute"], ["Save & quit to title", "title"], ["Save & quit game", "quit"]]
	if Layout.is_mobile(): entries = entries.filter(func(e): return e[1] != "quit")   # phones leave the app with Home; Back never kills a run
	for a in entries:
		var bt := Kit.btn(a[0], _menu_do.bind(a[1]), "", 20); bt.custom_minimum_size = Vector2(0, maxf(50.0, Layout.tap())); bt.size_flags_horizontal = Control.SIZE_EXPAND_FILL; tgt.add_child(bt)

func _menu_do(a: String) -> void:
	match a:
		"resume": _menu()
		"save": _menu(); _slots("save", Callable(), true)
		"load": _menu(); _slots("load", Callable(), true)
		"settings": _menu(); _settings()
		"look": _menu(); if started: _change_look()
		"coach": _menu(); if started: coach.start(0, true)   # asked for explicitly: shown in Tycoon too
		"guide": _menu(); guide.visible = true; guide.open()
		"mute": audio.toggle_mute()
		"title": _autosave(); b.stop(); get_tree().reload_current_scene()
		"quit":
			_autosave()
			if b != null: b.stop()
			get_tree().quit()

## Quitting never overwrites a manual slot: the latest state goes to the autosave, which Continue picks up.
func _autosave() -> void:
	if started and b != null and end_ui == null: b.act("save", ["auto"])

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_APPLICATION_FOCUS_IN:
		Settings.focused = what == NOTIFICATION_APPLICATION_FOCUS_IN; Settings.apply_fps()
		if what == NOTIFICATION_APPLICATION_FOCUS_OUT and started and b != null and not OS.has_environment("GW_SMOKE"): speed = 0; _autosave()
	if what == NOTIFICATION_APPLICATION_PAUSED and started and b != null and not OS.has_environment("GW_SMOKE"): speed = 0; _autosave()   # Android: leaving the app
	if what == NOTIFICATION_WM_GO_BACK_REQUEST:   # Android Back: close the topmost thing, then leave the drawer, then the pause menu; it never quits a running game
		var m := modal()
		if m != null and m.name != "title": pad._back()
		elif not started: get_tree().quit()   # on the title there is nothing to lose
		elif cur != "dash": show_screen("dash")
		else: _menu()
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
