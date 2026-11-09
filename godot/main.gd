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
	if Layout.handheld: return minf(w * (0.8 if id == "shop" else 0.68), w - 120.0)
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
	if Settings.compat and Settings.preset < 0: get_tree().create_timer(1.2).timeout.connect(func(): toast("Running in compatibility mode on %s (no Forward+). Effects are reduced; see the wiki's Performance page." % Settings.adapter, "info"))
	pad = Pad.new(); pad.app = self; add_child(pad)
	coach = Coach.new(); coach.app = self; add_child(coach)
	b.changed.connect(_on_changed)
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
	if OS.get_environment("GW_CONTINUE") != "" and b.q("saves").size() > 0: _load_slot(str(b.q("saves")[0].slot))   # tests: press CONTINUE
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
	lbl.netw_box.mouse_filter = Control.MOUSE_FILTER_STOP; lbl.netw_box.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	lbl.netw_box.gui_input.connect(func(e): if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT: go("network"))
	var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; hb.add_child(sp)
	lbl.mode = Kit.btn("Operator", func(): var m: String = b.g.get("mode", "operator"); b.act("setMode", ["operator" if m == "learner" else ("tycoon" if m == "operator" else "learner")]), "", 14); lbl.mode.custom_minimum_size = Vector2(112, 0); lbl.mode.tooltip_text = "Game mode: Learner (explainers, no bankruptcy), Operator, Tycoon. Click to change."; hb.add_child(lbl.mode)
	lbl.speed = Kit.btn("⏸ Paused", func(): set_speed((speed + 1) % 4), "", 15); lbl.speed.custom_minimum_size = Vector2(124, 0); lbl.speed.tooltip_text = "Auto-advance speed: click to cycle Paused, 1x, 2x, 3x. Space advances one month."; hb.add_child(lbl.speed)
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
	toasts = VBoxContainer.new(); toasts.set_anchors_preset(Control.PRESET_TOP_RIGHT); toasts.offset_left = -480; toasts.offset_right = -14; toasts.offset_top = 76; toasts.mouse_filter = Control.MOUSE_FILTER_IGNORE; toasts.add_theme_constant_override("separation", 6); root.add_child(toasts)
	banner = Kit.label("", 30, Kit.AM); banner.set_anchors_preset(Control.PRESET_CENTER_TOP); banner.offset_top = 140; banner.offset_left = -400; banner.offset_right = 400; banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; root.add_child(banner)
	_shell_visible(false)

var dock_box: BoxContainer

## Centre a modal panel of design size (w x h) inside the visible area, shrunk on small screens.
func _center(pn: Control, w: float, h: float) -> void:
	var vs := get_viewport().get_visible_rect().size
	var ww := minf(w, vs.x - 24.0); var hh := minf(h, vs.y - 24.0)
	pn.set_anchors_preset(Control.PRESET_CENTER); pn.offset_left = -ww / 2.0; pn.offset_right = ww / 2.0; pn.offset_top = -hh / 2.0; pn.offset_bottom = hh / 2.0

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

## Small screens: a tab on the drawer's edge folds every drawer away so the hall fills the screen, and brings it back.
var drawer_hidden := false
var drawer_tab: DrawerGrip
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
	hall.set_cover(_cover_of(cur) + inset.z); _place_tab()

func _relayout() -> void:
	if top == null: return
	_apply_safe_area()
	if drawer_tab == null:
		drawer_tab = DrawerGrip.new(); drawer_tab.z_index = -3; drawer_tab.mouse_filter = Control.MOUSE_FILTER_STOP; drawer_tab.gui_input.connect(_grip_input); root.add_child(drawer_tab)
	_place_tab_deferred()
	var k := Layout.kind
	var compact := k != "desktop"
	_bar_h = 66.0 if k == "desktop" else (58.0 if k == "handheld" else 56.0)
	top.offset_bottom = _bar_h
	lbl.title.visible = k == "desktop"
	for key in ["rev", "burn", "nw", "rep"]: lbl[key + "_box"].visible = k == "desktop" or (k == "handheld" and key in ["rev", "burn"])
	lbl.netw_box.visible = k != "phone" and _net_on
	lbl.debt_box.visible = k == "desktop" and float(b.g.get("debt", 0.0)) > 0.0
	lbl.mode.visible = k == "desktop"
	lbl.speed.custom_minimum_size = Vector2(124 if k == "desktop" else (84 if k == "handheld" else 60), Layout.tap()); _speed_label()
	next_btn.custom_minimum_size = Vector2(0 if k == "desktop" else 150, maxf(Layout.tap(), 0.0)); next_btn.text = "NEXT MONTH ▶" if k == "desktop" else "NEXT ▶"; next_btn.add_theme_font_size_override("font_size", Kit.fs(17))
	menu_btn.text = "MENU" if k != "phone" else "≡"; menu_btn.custom_minimum_size = Vector2(0 if k != "phone" else 52, Layout.tap())
	(top.get_child(0) as HBoxContainer).add_theme_constant_override("separation", 16 if k == "desktop" else (12 if k == "handheld" else 8))
	_dock_h = 84.0 if k == "desktop" else 74.0
	var rail := k == "phone"   # phones are landscape-only: the dock becomes a rail down the left edge, so the hall keeps its height
	dock_box.vertical = rail
	dock_scroll.set_anchors_preset(Control.PRESET_LEFT_WIDE if rail else Control.PRESET_BOTTOM_WIDE)
	dock_scroll.vertical_scroll_mode = (ScrollContainer.SCROLL_MODE_SHOW_NEVER if Layout.touch else ScrollContainer.SCROLL_MODE_AUTO) if rail else ScrollContainer.SCROLL_MODE_DISABLED
	dock_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED if rail else ScrollContainer.SCROLL_MODE_AUTO
	if rail: dock_scroll.offset_left = 6; dock_scroll.offset_right = RAIL_W; dock_scroll.offset_top = _bar_h + 8.0; dock_scroll.offset_bottom = -6
	else: dock_scroll.offset_top = -_dock_h; dock_scroll.offset_bottom = -8; dock_scroll.offset_left = 10; dock_scroll.offset_right = -10
	for d in dock_box.get_children():
		var btn := d as Button
		btn.custom_minimum_size = Vector2(138 if k == "desktop" else (112 if k == "handheld" else RAIL_W - 6), 58 if k == "desktop" else (60 if k == "handheld" else 56))
		btn.add_theme_font_size_override("font_size", Kit.fs(14 if k != "phone" else 13)); btn.text = btn.get_meta("short") if rail else btn.get_meta("full", btn.text)
	dock_box.alignment = BoxContainer.ALIGNMENT_CENTER if not rail else BoxContainer.ALIGNMENT_BEGIN
	holder.offset_top = _bar_h + 10.0; holder.offset_bottom = -(_dock_h + 8.0) if not rail else -6.0
	holder.offset_left = 14 if k != "phone" else RAIL_W + 8.0; holder.offset_right = -14 if k != "phone" else -6.0
	toasts.offset_top = _bar_h + 10.0
	var tw := minf(460.0, vw() - 28.0); toasts.offset_left = -tw - 14.0
	banner.offset_top = _bar_h + 74.0

## Apply the chosen UI theme live: palette, top bar, dock, and every screen (rebuilt on demand).
func _restyle() -> void:
	Kit.set_theme(Settings.theme)
	if top != null: top.add_theme_stylebox_override("panel", _top_sb(Kit.accent))
	if dock_box != null:
		for c in dock_box.get_children(): c.queue_free()
		dock_btns.clear()
		for i in DOCK.size():
			var dk: Array = DOCK[i]; var d := Kit.dock_btn(dk[1], str((i + 1) % 10), dk[2], func(): _dock(dk[0])); _dock_meta(d, dk[1], i); dock_box.add_child(d); dock_btns[dk[0]] = d
		_apply_unlocks(); _relayout()
	for sc in screens.values(): sc.queue_free()
	screens.clear()
	if started: show_screen(cur); _on_changed()
	else:
		var t := root.get_node_or_null("title")
		if t != null: t.queue_free(); _title()
	if settings_ui != null: settings_ui.queue_free(); settings_ui = null; _settings()

func _shell_visible(v: bool) -> void:
	top.visible = v; holder.visible = v
	dock_scroll.visible = v
	toasts.visible = v

func _title() -> void:
	started = false; _shell_visible(false); hall.b = b; audio.set_mood("title")
	var h := Control.new(); h.set_anchors_preset(Control.PRESET_FULL_RECT); h.name = "title"; root.add_child(h)
	var gt := GradientTexture2D.new(); var gr := Gradient.new(); gr.colors = PackedColorArray([Kit.SCRIM, Color(Kit.SCRIM.r, Kit.SCRIM.g, Kit.SCRIM.b, 0.0)]); gr.offsets = PackedFloat32Array([0.0, 1.0])
	gt.gradient = gr; gt.fill_from = Vector2(0, 0); gt.fill_to = Vector2(1, 0); gt.width = 512; gt.height = 8
	var shade := TextureRect.new(); shade.texture = gt; shade.stretch_mode = TextureRect.STRETCH_SCALE; shade.set_anchors_preset(Control.PRESET_LEFT_WIDE); shade.anchor_right = 0.62; shade.mouse_filter = Control.MOUSE_FILTER_IGNORE; h.add_child(shade)
	var vb := VBoxContainer.new(); vb.set_anchors_preset(Control.PRESET_CENTER_LEFT); vb.offset_left = 90 if not Layout.compact else 24; vb.offset_top = -310 if not Layout.phone else -vs_h() * 0.5 + 16; vb.offset_bottom = 310 if not Layout.phone else vs_h() * 0.5 - 16; vb.offset_right = 780 if not Layout.phone else vw() - 24; vb.add_theme_constant_override("separation", 12); h.add_child(vb)
	var bv: VBoxContainer = vb   # where the menu buttons go
	if Layout.phone:   # landscape phone: title and blurb on the left, the buttons in a finger-scrollable column on the right
		vb.offset_right = vw() * 0.44
		var sc := ScrollContainer.new(); sc.set_anchors_preset(Control.PRESET_RIGHT_WIDE); sc.anchor_left = 0.47; sc.offset_left = 0; sc.offset_right = -24; sc.offset_top = 14; sc.offset_bottom = -14
		sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; h.add_child(sc)
		bv = VBoxContainer.new(); bv.add_theme_constant_override("separation", 10); bv.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sc.add_child(bv)
	vb.add_child(Kit.label("AI DATACENTER TYCOON", 18, Kit.DIM)); vb.add_child(Kit.label("GIGAWATT", 110 if not Layout.phone else 64, Kit.CY))
	vb.add_child(Kit.label("Buy real GPUs. Design trays, racks and fabrics. Wire power and liquid cooling. Lease capacity for training and inference — and learn the whole AI hardware stack by surviving it. 2020 → 2028.", 20, Kit.TX, true))
	for m in [["learner", "LEARNER", "I don't know what a chiller is · $80M · explainers everywhere · \"Do it for me\" Easy path"], ["operator", "OPERATOR", "I know the basics · $50M · guided planner and checklists"], ["tycoon", "TYCOON", "Just give me the keys · $30M · no hand-holding"]]:
		var bt := Kit.btn("%s\n%s" % [m[1], m[2]], func(): _pick_site(m[0], h), "pri" if m[0] == "operator" else "", 18); bt.custom_minimum_size = Vector2(minf(640.0, vw() - 48.0) if not Layout.phone else 0.0, 76); bt.alignment = HORIZONTAL_ALIGNMENT_LEFT; bt.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if Layout.phone else TextServer.AUTOWRAP_OFF; bv.add_child(bt)
	b.act("newGame", [7, "operator"]); _demo_hall()
	var recent: Array = b.q("saves")
	if recent.size() > 0:
		var rs: Dictionary = recent[0]
		var cont := Kit.btn("CONTINUE\n%s · %s · %d racks" % [Kit.date_of(int(rs.month)), Kit.usd(float(rs.cash)), int(rs.racks)], func(): _load_slot(str(rs.slot), func(): h.queue_free()), "go", 18); cont.custom_minimum_size = Vector2(minf(640.0, vw() - 48.0) if not Layout.phone else 0.0, 76); cont.alignment = HORIZONTAL_ALIGNMENT_LEFT
		bv.add_child(cont); bv.move_child(cont, 3 if bv == vb else 0)
	bv.add_child(Kit.btn("LOAD GAME", func(): _slots("load", func(): h.queue_free()), "", 16))
	bv.add_child(Kit.btn("SETTINGS", func(): _settings(), "", 16))
	bv.add_child(Kit.btn("QUIT", func(): get_tree().quit(), "", 16))
	bv.add_child(Kit.label("Settings has the full list of controls.", 14, Kit.DIM))
	var gw := Settings.gpu_warning()
	if gw != "": var gl := Kit.label(gw, 14, Kit.AM); gl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; bv.add_child(gl)
	hall.dist = 13.0; hall.pitch = 0.32; hall.auto_orbit = true; hall.hall_i = 0; hall.rebuild(); hall.cam.h_offset = -4.5

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
	b.act("newGame", [int(Time.get_unix_time_from_system()) % 100000, mode]); b.act("setMode", [mode]); _begin()
	if (Settings.tutorial != "off" and not OS.has_environment("GW_SMOKE") and not OS.has_environment("GW_NOCOACH")) or OS.has_environment("GW_COACH"): coach.start()

func _begin() -> void:
	var tt := root.get_node_or_null("title")
	if tt: tt.queue_free()
	started = true; _seen_log = b.g.log.size(); speed = 0; clock = 0.0; audio.set_mood("play"); _unlocked.clear()
	for d in DOCK: _unlocked[d[0]] = is_unlocked(d[0])   # what is open at the start is not "unlocked" news
	hall.cam.h_offset = 0.0; hall.hall_i = 0; hall.auto_orbit = false
	_shell_visible(true); show_screen("dash"); _on_changed(); hall.rebuild(); hall.top_view()
	if OS.get_environment("GW_SETTINGS") != "": get_tree().create_timer(0.5).timeout.connect(func(): if settings_ui == null: _settings())

func _on_changed() -> void:
	if not started: return
	var g := b.g
	lbl.date.text = Kit.date_of(g.month); lbl.cash.text = Kit.usd(g.cash); lbl.cash.label_settings = Kit.ls(20, Kit.GR if g.cash >= 0 else Kit.RD)
	lbl.debt.text = Kit.usd(g.debt); lbl.nw.text = Kit.usd(float(b.q("netWorth"))); lbl.rep.text = "★ %d" % int(g.reputation)
	lbl.debt_box.visible = float(g.debt) > 0.0 and Layout.kind == "desktop"   # no loans, nothing to show
	var pn: Dictionary = b.q("pnl")
	if not pn.is_empty():
		lbl.rev.text = Kit.usd(pn.revenue); lbl.rev.label_settings = Kit.ls(20, Kit.GR)
		lbl.burn.text = Kit.usd(pn.opex); lbl.burn.label_settings = Kit.ls(20, Kit.AM)
		lbl.net.text = Kit.usd(pn.net); lbl.net.label_settings = Kit.ls(20, Kit.CY if pn.net >= 0 else Kit.RD)
		var serving: int = g.activeContracts.filter(func(a): return a.clusterIds.size() > 0).size()
		lbl.rev_box.tooltip_text = "Monthly revenue: %s serving." % Kit.plural(serving, "contract"); lbl.burn_box.tooltip_text = "Monthly cost: power, staff, support and interest."; lbl.net_box.tooltip_text = "Revenue minus costs, after depreciation."
		lbl.nw_box.tooltip_text = "Cash plus the value of what you own, minus debt."
	var nh = b.q("netHealth")
	_net_on = nh is Dictionary and (nh.clusters.size() > 0 or float(nh.uplink.needGbps) > 0.0)
	lbl.netw_box.visible = _net_on and Layout.kind != "phone"
	if _net_on:
		var lv := int(nh.level); var col: Color = [Kit.GR, Kit.AM, Kit.RD][lv]
		var down := 0
		for c in nh.clusters: down += int(c.down)
		lbl.netw.text = ("%d%%" % int(round(float(nh.bandwidthPct) * 100.0))) if down == 0 and float(nh.uplink.pct) <= 0.85 else ("%d down" % down if down > 0 else "uplink %d%%" % int(float(nh.uplink.pct) * 100.0))
		lbl.netw.label_settings = Kit.ls(20, col); lbl.netw_box.tooltip_text = "Network: %s. Click to open the Supercomputer screen." % nh.summary
	lbl.mode.text = {"learner": "Learner", "operator": "Operator", "tycoon": "Tycoon"}.get(g.get("mode", "operator"), "")
	_speed_label()
	for i in range(_seen_log, g.log.size()):
		var e: Dictionary = g.log[i]
		if e.level != "info": toast(e.text, e.level)
	_seen_log = g.log.size()
	hall.rebuild()
	_apply_unlocks()
	_hall_audio()
	_check_end()
	check_keynote()
	coach.tick()
	if hall.get_meta("n", 0) == 0: pass
	_refresh_cur()

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
	p.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.94), col, 8, 1, 10)); p.add_child(Kit.label(text, 14, Kit.TX, true)); p.custom_minimum_size = Vector2(minf(460.0, vw() - 28.0), 0); toasts.add_child(p)
	while toasts.get_child_count() > 5: toasts.get_child(0).queue_free(); toasts.remove_child(toasts.get_child(0))
	var tw := create_tween(); tw.tween_interval(6.0); tw.tween_property(p, "modulate:a", 0.0, 1.0); tw.tween_callback(p.queue_free)

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
	for x in b.q("machineLedger"): if x.id == rk.id: m = x
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
	if story_ui != null and story_ui.visible: return story_ui
	if guide != null and guide.visible: return guide
	var tt := root.get_node_or_null("title")
	if tt != null and not started: return tt
	return null

func _top_sb(acc: Color) -> StyleBoxFlat:
	var t := Kit.sb(Kit.deep(0.97), Kit.OUTL, 0, 0, 14); t.border_width_bottom = 5; t.border_color = acc
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

func _apply_unlocks() -> void:
	for d in DOCK:
		var k: String = d[0]; var open := is_unlocked(k)
		if dock_btns.has(k): dock_btns[k].visible = open
		if open and not _unlocked.get(k, false) and not _unlocked.is_empty() and started: toast("Unlocked: %s" % str(d[1]).capitalize(), "good")
		_unlocked[k] = open

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
	elif not FULL.has(id): cover = drawer_w()
	hall.set_cover(cover + (inset.z if cover > 0.0 else 0.0))
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
	for k in dock_btns: Kit.dock_set(dock_btns[k], k == dock_key(id))
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
	lbl.speed.text = (["⏸", "▶", "▶▶", "▶▶▶"] if Layout.compact else ["⏸ Paused", "▶ 1x", "▶▶ 2x", "▶▶▶ 3x"])[clampi(speed, 0, 3)]
	lbl.speed.modulate = Color.WHITE if speed == 0 else Color(0.5, 1.0, 0.9)

func next_month() -> void:
	if not started: return
	audio.play("month"); b.act("nextMonth"); b.act("stepEasy"); _claim()
	if OS.get_environment("GW_NOAUTOSAVE") == "": pass

## Launch keynotes queue up in the engine (g.news); show them one at a time and stop the clock while one is open.
func check_keynote() -> void:
	if not started or keynote == null or keynote.visible or (story_ui != null and story_ui.visible) or end_ui != null or menu_ui != null: return
	if Engine.get_frames_drawn() < 5: get_tree().create_timer(0.25).timeout.connect(check_keynote); return   # let the first layout pass finish
	var news: Array = b.g.get("news", [])
	if news.is_empty(): check_story(); return
	if OS.has_environment("GW_SMOKE") or OS.has_environment("GW_NOKEYNOTE"): b.act("ackNews"); return
	var l: Dictionary = b.q("launches")
	if l.news.is_empty(): b.act("ackNews"); return
	keynote.open(l.news[0], l.news.size() - 1); speed = 0; clock = 0.0; audio.play("keynote")
	_speed_label()

## Story cards queue up in the engine (g.story): a chapter every January, and now and then a two-way decision.
func check_story() -> void:
	if not started or story_ui == null or story_ui.visible or keynote.visible or end_ui != null or menu_ui != null: return
	if Engine.get_frames_drawn() < 5: get_tree().create_timer(0.25).timeout.connect(check_story); return
	var st: Dictionary = b.q("story")
	if OS.has_environment("GW_SMOKE") or OS.has_environment("GW_NOKEYNOTE"):
		if st.chapter != null: b.act("ackStory")
		return
	if st.chapter != null:
		story_ui.open_chapter(st.chapter); speed = 0; clock = 0.0; _speed_label(); audio.play("keynote"); return
	if st.dilemma != null and str(st.dilemma.id) != dilemma_dismissed:
		story_ui.open_dilemma(st.dilemma); speed = 0; clock = 0.0; _speed_label(); audio.play("notif")

## The Overview "needs you" card opens a decision you chose to answer later.
func open_decision() -> void:
	dilemma_dismissed = ""; check_story()

func _claim() -> void:
	for m in b.claim_missions(): banner.text = "★ MISSION COMPLETE ★  %s" % m.title; audio.play("fanfare"); get_tree().create_timer(3.2).timeout.connect(func(): banner.text = "")

var _stats_on := OS.has_environment("GW_STATS")
var _stats_t := 0.0
func _process(dt: float) -> void:
	_process_tip()
	if _stats_on:
		_stats_t += dt
		if _stats_t > 2.0:
			_stats_t = 0.0
			print("STATS draws=%d prims=%d vram_mb=%d fps=%d" % [RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME), RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME), int(RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_VIDEO_MEM_USED)) / 1048576, int(Engine.get_frames_per_second())])
	if _refresh_due and Time.get_ticks_msec() >= _refresh_at: _refresh_cur()
	var idle := started and speed == 0 and Time.get_ticks_msec() - _last_input > 3000
	if idle != Settings.idle: Settings.idle = idle; Settings.apply_fps()
	if not started or speed == 0 or menu_ui != null or keynote.visible or story_ui.visible: return
	clock += dt / SECS[speed]; bar_month.value = clock
	if clock >= 1.0: clock = 0.0; next_month()

func _dbg() -> void:
	for k in screens: print(k, " rect=", screens[k].get_global_rect(), " vis=", screens[k].visible)
	print("holder=", holder.get_global_rect(), " root=", root.get_global_rect(), " top=", top.get_global_rect())

var _last_input := 0
func _input(e: InputEvent) -> void:
	_last_input = Time.get_ticks_msec()
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
	var lk: Dictionary = b.q("launches"); print("LAUNCHES ", lk.list.size(), " news=", lk.news.size())
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
var _settings_tab := "Display"
const KEYS := [["Space", "Next month"], ["1-8", "Open a drawer or workshop"], ["T", "Thermal view"], ["V", "Top view"], ["L", "Rack labels"], ["Esc", "Pause menu"], ["F1", "Settings"], ["Ctrl+Q", "Quit"],
	["Left-drag / WASD", "Pan the hall"], ["Right-drag / Q E", "Orbit the hall"], ["Wheel", "Zoom"], ["Speed button", "Pause, 1x, 2x, 3x"]]
const PAD_KEYS := [["A", "Select"], ["B", "Back"], ["X", "Inspect rack"], ["Y", "Next month"], ["LB / RB", "Switch drawer"], ["LT / RT", "Zoom"], ["Left stick", "Pan"], ["Right stick", "Orbit"], ["D-pad", "Navigate"], ["Start", "Menu"], ["View", "Speed"]]
func _settings() -> void:
	if settings_ui != null: settings_ui.queue_free(); settings_ui = null; return
	if OS.has_environment("GW_SETTINGS_TAB"): _settings_tab = OS.get_environment("GW_SETTINGS_TAB")
	var h := Control.new(); h.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_child(h); settings_ui = h
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.6); dim.set_anchors_preset(Control.PRESET_FULL_RECT); h.add_child(dim)
	var pn := PanelContainer.new(); _center(pn, 800, 680)
	pn.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.98), Kit.CY, 14, 2, 22)); h.add_child(pn)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 10); pn.add_child(vb)
	vb.add_child(Kit.label("SETTINGS", 30, Kit.CY))
	var tabs := HBoxContainer.new(); tabs.add_theme_constant_override("separation", 6); vb.add_child(tabs)
	var body := VBoxContainer.new(); body.add_theme_constant_override("separation", 12); body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var sc := ScrollContainer.new(); sc.size_flags_vertical = Control.SIZE_EXPAND_FILL; sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.add_child(body); body.size_flags_horizontal = Control.SIZE_EXPAND_FILL; vb.add_child(sc)
	_settings_fill(body, tabs)
	vb.add_child(Kit.btn("Close", func(): settings_ui.queue_free(); settings_ui = null, "pri", 18))

func _settings_fill(body: VBoxContainer, tabs: HBoxContainer) -> void:
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

func _opt_row(parent: Control, title: String, items: Array, selected: int, cb: Callable) -> OptionButton:
	var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 14); parent.add_child(r)
	var l := Kit.label(title, 16, Kit.TX); l.custom_minimum_size = Vector2(170, 0); r.add_child(l)
	var o := OptionButton.new(); o.add_theme_font_size_override("font_size", 16); for n in items: o.add_item(n)
	o.selected = clampi(selected, 0, items.size() - 1); o.size_flags_horizontal = Control.SIZE_EXPAND_FILL; o.item_selected.connect(cb); r.add_child(o); return o

func _set_display(vb: VBoxContainer) -> void:
	_opt_row(vb, "Layout", ["Auto (this device)", "Desktop / laptop / console", "Handheld (Steam Deck)", "Phone"], ["auto", "desktop", "handheld", "phone"].find(Settings.layout), func(i): Settings.layout = ["auto", "desktop", "handheld", "phone"][i]; Settings.apply(get_window()); Settings.save_all(); get_window().size_changed.emit())
	vb.add_child(Kit.label("Running as: %s (%s). The layout changes the top bar, dock and drawers, not the game." % [Layout.kind, "auto" if Settings.layout == "auto" else "forced"], 13, Kit.DIM, true))
	vb.add_child(Kit.label("UI THEME", 13, Kit.DIM))
	for dk in [true, false]:
		var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 6); fl.add_theme_constant_override("v_separation", 6); vb.add_child(fl)
		fl.add_child(Kit.label("Dark" if dk else "Light", 15, Kit.DIM))
		for t in Kit.THEMES:
			if bool(t.dark) != dk: continue
			var id: String = t.id
			fl.add_child(Kit.btn(str(t.name), func(): Settings.theme = id; Settings.save_all(); audio.play("click"); _restyle(), "pri" if Settings.theme == id else "", 14))
	_opt_row(vb, "Window mode", ["Windowed", "Fullscreen (borderless)", "Exclusive fullscreen"], Settings.window_mode, func(i): Settings.window_mode = i; Settings.save_all(); Settings.apply(get_window()))
	_opt_row(vb, "V-Sync", ["Off", "On", "Adaptive"], Settings.vsync, func(i): Settings.vsync = i; Settings.save_all(); Settings.apply(get_window()))
	var caps := [0, 30, 40, 60, 90, 120, 144, 1000]
	_opt_row(vb, "Frame rate limit", ["Automatic", "30", "40", "60", "90", "120", "144", "Unlimited"], maxi(0, caps.find(Settings.fps_cap)), func(i): Settings.fps_cap = caps[i]; Settings.save_all(); Settings.apply_fps())
	var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 14); vb.add_child(r)
	var l := Kit.label("UI size", 16, Kit.TX); l.custom_minimum_size = Vector2(170, 0); r.add_child(l)
	var val := Kit.label("", 15, Kit.DIM); val.custom_minimum_size = Vector2(70, 0)
	var sl := HSlider.new(); sl.min_value = 0.7; sl.max_value = 2.0; sl.step = 0.05; sl.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sl.custom_minimum_size = Vector2(240, 28)
	sl.value = Settings.ui_scale if Settings.ui_scale > 0.0 else 0.7
	val.text = "Auto" if Settings.ui_scale <= 0.0 else "%d%%" % int(Settings.ui_scale * 100.0)
	sl.value_changed.connect(func(v): Settings.ui_scale = 0.0 if v < 0.75 else snappedf(v, 0.05); val.text = "Auto" if Settings.ui_scale <= 0.0 else "%d%%" % int(Settings.ui_scale * 100.0); Settings.apply(get_window()); Settings.save_all())
	r.add_child(sl); r.add_child(val)
	vb.add_child(Kit.label("Slide fully left for Auto: small screens and handhelds are scaled up to stay readable.", 13, Kit.DIM, true))
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
	var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 14); vb.add_child(r)
	var l := Kit.label("3D resolution", 16, Kit.TX); l.custom_minimum_size = Vector2(170, 0); r.add_child(l)
	var val := Kit.label("", 15, Kit.DIM); val.custom_minimum_size = Vector2(70, 0)
	var sl := HSlider.new(); sl.min_value = 0.35; sl.max_value = 1.0; sl.step = 0.05; sl.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sl.custom_minimum_size = Vector2(240, 28)
	sl.value = Settings.render_scale if Settings.render_scale > 0.0 else 0.35
	val.text = "Preset" if Settings.render_scale <= 0.0 else "%d%%" % int(Settings.render_scale * 100.0)
	sl.value_changed.connect(func(v): Settings.render_scale = 0.0 if v < 0.38 else snappedf(v, 0.05); val.text = "Preset" if Settings.render_scale <= 0.0 else "%d%%" % int(Settings.render_scale * 100.0); Settings.save_all(); hall.apply_quality(); upd.call())
	r.add_child(sl); r.add_child(val)
	vb.add_child(info); upd.call()
	vb.add_child(Kit.label("The menus always draw at full resolution; only the 3D hall is scaled (FSR). Lower it on a weak GPU or a 4K screen.", 13, Kit.DIM, true))

func _set_audio(vb: VBoxContainer) -> void:
	_slider_row(vb, "Master volume", 0.0, 1.0, Settings.volume, func(v): Settings.volume = v; Settings.apply(get_window()); Settings.save_all())
	_slider_row(vb, "Music", 0.0, 1.0, Settings.music_volume, func(v): Settings.music_volume = v; audio.apply_volumes(); Settings.save_all())
	_slider_row(vb, "Effects", 0.0, 1.0, Settings.sfx_volume, func(v): Settings.sfx_volume = v; audio.apply_volumes(); Settings.save_all(); audio.play("confirm"))
	var mr := HBoxContainer.new(); mr.add_theme_constant_override("separation", 14); vb.add_child(mr)
	var ml := Kit.label("Music style", 16, Kit.TX); ml.custom_minimum_size = Vector2(130, 0); mr.add_child(ml)
	var mo := OptionButton.new(); var ids := ["auto", "off"]; mo.add_item("Auto (changes with the game)"); mo.add_item("Off")
	for t in audio.catalog.music: mo.add_item("%s — %s" % [t.genre, t.title]); ids.append(t.id)
	mo.selected = maxi(0, ids.find(Settings.music_mode)); mr.add_child(mo)
	var np := Kit.label("", 13, Kit.DIM); np.custom_minimum_size = Vector2(230, 0)
	var upd := func(): np.text = ("♪ %s" % audio.now.title) if audio.now.has("title") else ""
	mo.item_selected.connect(func(i): Settings.music_mode = ids[i]; Settings.save_all(); audio.music_changed(); upd.call())
	mr.add_child(Kit.btn("Next ▶", func(): if Settings.music_mode != "off": audio.next_track(1.0); upd.call(), "", 13)); mr.add_child(np); upd.call()

func _set_access(vb: VBoxContainer) -> void:
	vb.add_child(Kit.toggle("Colour-blind-safe cluster palette", Settings.colorblind, func(on): Settings.colorblind = on; Settings.save_all(); hall.rebuild()))
	vb.add_child(Kit.toggle("Reduced motion (no auto-orbit, no sliding panels)", Settings.reduced_motion, func(on): Settings.reduced_motion = on; Settings.save_all()))
	var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 14); vb.add_child(r)
	var l := Kit.label("Text size boost", 16, Kit.TX); l.custom_minimum_size = Vector2(170, 0); r.add_child(l)
	var val := Kit.label("%d%%" % int(Settings.text_boost * 100.0), 15, Kit.DIM); val.custom_minimum_size = Vector2(70, 0)
	var sl := HSlider.new(); sl.min_value = 1.0; sl.max_value = 1.5; sl.step = 0.05; sl.value = Settings.text_boost; sl.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sl.custom_minimum_size = Vector2(240, 28)
	sl.value_changed.connect(func(v): Settings.text_boost = snappedf(v, 0.05); val.text = "%d%%" % int(v * 100.0); Settings.apply(get_window()); Settings.save_all())
	r.add_child(sl); r.add_child(val)

func _set_controls(vb: VBoxContainer) -> void:
	for set_ in [["KEYBOARD AND MOUSE", KEYS], ["CONTROLLER", PAD_KEYS]]:
		vb.add_child(Kit.label(set_[0], 14, Kit.DIM))
		var g := GridContainer.new(); g.columns = 2; g.add_theme_constant_override("h_separation", 28); g.add_theme_constant_override("v_separation", 4); vb.add_child(g)
		for kv in set_[1]:
			var k := Kit.label(kv[0], 15, Kit.CY); k.custom_minimum_size = Vector2(190, 0); g.add_child(k); g.add_child(Kit.label(kv[1], 15, Kit.TX))

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
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.78); dim.set_anchors_preset(Control.PRESET_FULL_RECT); h.add_child(dim)
	var pn := PanelContainer.new(); _center(pn, 1120, 660)
	pn.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.98), col, 14, 2, 28)); h.add_child(pn)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 10); pn.add_child(vb)
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
	var grid := GridContainer.new(); grid.columns = 3; grid.add_theme_constant_override("h_separation", 60); grid.add_theme_constant_override("v_separation", 6); vb.add_child(grid)
	for kv in [["SCORE", Kit.num(rep.score)], ["NET WORTH", Kit.usd(rep.netWorth)], ["LIFETIME REVENUE", Kit.usd(rep.revenueTotal)], ["PEAK ACCELERATORS", Kit.num(rep.peakAccels)], ["CONTRACTS COMPLETED", str(int(rep.contractsCompleted))], ["REPUTATION", "★ %d" % int(rep.reputation)]]:
		var c := VBoxContainer.new(); c.add_child(Kit.label(kv[0], 11, Kit.DIM)); c.add_child(Kit.label(str(kv[1]), 24, Kit.TX)); grid.add_child(c)
	for k in [["BEST DEAL", "bestDeal", Kit.GR], ["WORST INCIDENT", "worstIncident", Kit.RD], ["VS THE RIVALS", "rivalLine", Kit.CY]]:
		if rep.get(k[1]) != null and str(rep[k[1]]) != "":
			var line := Kit.rich("[color=#%s][b]%s[/b][/color]  %s" % [k[2].to_html(false), k[0], str(rep[k[1]])], 14)
			if k[1] == "bestDeal" and rep.get("bestDealCustomer") != null:
				var lr := HBoxContainer.new(); lr.add_theme_constant_override("separation", 12); lr.add_child(Logo.make(str(rep.bestDealCustomer), 48.0)); lr.add_child(line); vb.add_child(lr)
			else: vb.add_child(line)
	var sp2 := Control.new(); sp2.size_flags_vertical = Control.SIZE_EXPAND_FILL; vb.add_child(sp2)
	var row := HBoxContainer.new(); row.add_theme_constant_override("separation", 12); vb.add_child(row)
	row.add_child(Kit.btn("Look around the hall", func(): end_ui.queue_free(); end_ui = null; end_seen = true, "", 18))
	if rep.get("shareText") != null: row.add_child(Kit.btn("Copy summary", func(): DisplayServer.clipboard_set(str(rep.shareText)); toast("Summary copied to the clipboard.", "good"), "", 18))
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
	var pn := PanelContainer.new(); _center(pn, 660, 460)
	pn.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.98), Kit.CY, 14, 2, 22)); h.add_child(pn)
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
	var vb := VBoxContainer.new(); _center(vb, 440 if not Layout.phone else 780, 440 if not Layout.phone else 520); vb.add_theme_constant_override("separation", 12); h.add_child(vb)
	vb.add_child(Kit.label("PAUSED", 44 if not Layout.phone else 32, Kit.CY))
	var tgt: Control = vb   # phones are short: two columns of buttons so the menu fits without scrolling
	if Layout.phone: var gr := GridContainer.new(); gr.columns = 2; gr.add_theme_constant_override("h_separation", 10); gr.add_theme_constant_override("v_separation", 10); vb.add_child(gr); tgt = gr
	for a in [["Resume", "resume"], ["Save game", "save"], ["Load game", "load"], ["Settings", "settings"], ["Change look", "look"], ["How to play", "guide"], ["Restart tutorial", "coach"], ["Toggle sound", "mute"], ["Save & quit to title", "title"], ["Save & quit game", "quit"]]:
		var bt := Kit.btn(a[0], func(): _menu_do(a[1]), "pri" if a[1] == "resume" else "", 20); bt.custom_minimum_size = Vector2(0, maxf(52.0, Layout.tap())); bt.size_flags_horizontal = Control.SIZE_EXPAND_FILL; tgt.add_child(bt)

func _menu_do(a: String) -> void:
	match a:
		"resume": _menu()
		"save": _menu(); _slots("save")
		"load": _menu(); _slots("load")
		"settings": _menu(); _settings()
		"look": _menu(); if started: _change_look()
		"coach": _menu(); if started: coach.start()
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
