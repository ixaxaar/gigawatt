class_name Hud
extends CanvasLayer
## All 2D UI, built in code. Talks to Main through signals; reads Sim directly.

signal speed_changed(speed: int)
signal place_requested(sys_id: String)
signal hall_selected(i: int)
signal new_game_requested(mode: String)
signal panel_toggled(open: bool)

const C_BG := Color(0.04, 0.06, 0.09, 0.92)
const C_LINE := Color(0.16, 0.27, 0.38)
const C_CY := Color(0.3, 0.82, 1.0)
const C_GR := Color(0.25, 0.9, 0.6)
const C_AM := Color(1.0, 0.72, 0.2)
const C_RD := Color(1.0, 0.36, 0.42)
const C_DIM := Color(0.58, 0.68, 0.78)

var sim: Sim
var root: Control
var lbl_date: Label; var lbl_cash: Label; var lbl_nw: Label; var lbl_rep: Label; var lbl_goal: Label
var bar_month: ProgressBar; var bar_goal: ProgressBar
var gauge_pw: ProgressBar; var gauge_cl: ProgressBar; var lbl_pw: Label; var lbl_cl: Label; var lbl_pnl: RichTextLabel
var feed: VBoxContainer
var tip: PanelContainer; var tip_lbl: RichTextLabel
var modal_holder: Control
var open_panel := ""
var hall_i := 0
var speed := 1
var speed_btns: Array[Button] = []
var halls_row: HBoxContainer
var place_banner: Label
var _cash_shown := 0.0

# ---------- style helpers ----------
func _sb(bg: Color, border: Color = C_LINE, r := 10, bw := 1, pad := 12) -> StyleBoxFlat:
	var s := StyleBoxFlat.new(); s.bg_color = bg; s.border_color = border; s.set_border_width_all(bw); s.set_corner_radius_all(r)
	s.content_margin_left = pad; s.content_margin_right = pad; s.content_margin_top = pad * 0.7; s.content_margin_bottom = pad * 0.7
	s.shadow_color = Color(0, 0, 0, 0.45); s.shadow_size = 8; return s

func _label(t: String, size := 18, col := Color.WHITE) -> Label:
	var l := Label.new(); l.text = t; l.add_theme_font_size_override("font_size", size); l.add_theme_color_override("font_color", col); return l

func _btn(t: String, cb: Callable, primary := false, size := 17) -> Button:
	var b := Button.new(); b.text = t; b.add_theme_font_size_override("font_size", size); b.focus_mode = Control.FOCUS_NONE
	var base := Color(0.1, 0.35, 0.5) if primary else Color(0.09, 0.14, 0.2)
	b.add_theme_stylebox_override("normal", _sb(base, C_CY if primary else C_LINE, 8, 1, 10))
	b.add_theme_stylebox_override("hover", _sb(base.lightened(0.18), C_CY, 8, 1, 10))
	b.add_theme_stylebox_override("pressed", _sb(base.darkened(0.2), C_CY, 8, 2, 10))
	b.add_theme_stylebox_override("disabled", _sb(Color(0.06, 0.08, 0.1), Color(0.12, 0.16, 0.2), 8, 1, 10))
	b.add_theme_color_override("font_disabled_color", Color(0.4, 0.45, 0.5))
	b.pressed.connect(cb); return b

func _bar(col: Color) -> ProgressBar:
	var p := ProgressBar.new(); p.show_percentage = false; p.custom_minimum_size = Vector2(0, 12); p.max_value = 1.0
	var bg := _sb(Color(0.08, 0.11, 0.15), Color(0, 0, 0, 0), 6, 0, 0); var fg := _sb(col, Color(0, 0, 0, 0), 6, 0, 0)
	bg.content_margin_top = 0; bg.content_margin_bottom = 0; fg.content_margin_top = 0; fg.content_margin_bottom = 0
	p.add_theme_stylebox_override("background", bg); p.add_theme_stylebox_override("fill", fg); return p

func _setbar(p: ProgressBar, v: float, col: Color) -> void:
	p.value = clampf(v, 0.0, 1.0); (p.get_theme_stylebox("fill") as StyleBoxFlat).bg_color = col

func _build_ui() -> void:
	root = Control.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.mouse_filter = Control.MOUSE_FILTER_IGNORE; add_child(root)
	var th := Theme.new(); th.default_font_size = 18; th.default_font = Fonts.regular
	th.set_font("bold_font", "RichTextLabel", Fonts.bold); th.set_font("normal_font", "RichTextLabel", Fonts.regular); root.theme = th
	# ----- top bar -----
	var top := PanelContainer.new(); top.set_anchors_preset(Control.PRESET_TOP_WIDE); top.offset_bottom = 70
	top.add_theme_stylebox_override("panel", _sb(Color(0.03, 0.05, 0.08, 0.9), C_LINE, 0, 1, 14)); root.add_child(top)
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 22); top.add_child(hb)
	var logo := _label("GIGAWATT", 26, C_CY); hb.add_child(logo)
	var dv := VBoxContainer.new(); dv.custom_minimum_size = Vector2(120, 0); lbl_date = _label("", 22); bar_month = _bar(C_CY); dv.add_child(lbl_date); dv.add_child(bar_month); hb.add_child(dv)
	lbl_cash = _label("", 24, C_GR); lbl_nw = _label("", 20); lbl_rep = _label("", 20, C_AM)
	for pair in [["CASH", lbl_cash], ["NET WORTH", lbl_nw], ["REPUTATION", lbl_rep]]:
		var v := VBoxContainer.new(); v.add_child(_label(pair[0], 11, C_DIM)); v.add_child(pair[1]); hb.add_child(v)
	var gv := VBoxContainer.new(); gv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	lbl_goal = _label("", 15, C_AM); bar_goal = _bar(C_AM); gv.add_child(lbl_goal); gv.add_child(bar_goal); hb.add_child(gv)
	var sp := HBoxContainer.new(); sp.add_theme_constant_override("separation", 4)
	for pair in [["⏸", 0], ["▶", 1], ["▶▶", 2], ["▶▶▶", 3]]:
		var b := _btn(pair[0], func(): set_speed(pair[1]), false, 18); b.custom_minimum_size = Vector2(54, 0); sp.add_child(b); speed_btns.append(b)
	hb.add_child(sp)
	# ----- right column -----
	var right := VBoxContainer.new(); right.set_anchors_preset(Control.PRESET_RIGHT_WIDE); right.offset_left = -330; right.offset_top = 86; right.offset_bottom = -110; right.offset_right = -14
	right.add_theme_constant_override("separation", 10); right.mouse_filter = Control.MOUSE_FILTER_IGNORE; root.add_child(right)
	var gp := PanelContainer.new(); gp.add_theme_stylebox_override("panel", _sb(C_BG)); right.add_child(gp)
	var gv2 := VBoxContainer.new(); gv2.add_theme_constant_override("separation", 5); gp.add_child(gv2)
	halls_row = HBoxContainer.new(); gv2.add_child(halls_row)
	lbl_pw = _label("", 14, C_DIM); gauge_pw = _bar(C_GR); lbl_cl = _label("", 14, C_DIM); gauge_cl = _bar(C_CY)
	gv2.add_child(lbl_pw); gv2.add_child(gauge_pw); gv2.add_child(lbl_cl); gv2.add_child(gauge_cl)
	var pp := PanelContainer.new(); pp.add_theme_stylebox_override("panel", _sb(C_BG)); right.add_child(pp)
	lbl_pnl = RichTextLabel.new(); lbl_pnl.bbcode_enabled = true; lbl_pnl.fit_content = true; lbl_pnl.scroll_active = false; lbl_pnl.add_theme_font_size_override("normal_font_size", 16); pp.add_child(lbl_pnl)
	# ----- log feed (bottom-left) -----
	feed = VBoxContainer.new(); feed.set_anchors_preset(Control.PRESET_BOTTOM_LEFT); feed.offset_left = 14; feed.offset_bottom = -112; feed.offset_top = -330; feed.offset_right = 560
	feed.alignment = BoxContainer.ALIGNMENT_END; feed.mouse_filter = Control.MOUSE_FILTER_IGNORE; root.add_child(feed)
	# ----- hover tooltip -----
	tip = PanelContainer.new(); tip.add_theme_stylebox_override("panel", _sb(C_BG, C_CY)); tip.visible = false; tip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tip.set_anchors_preset(Control.PRESET_CENTER_BOTTOM); tip.offset_top = -210; tip.offset_bottom = -112; tip.offset_left = -230; tip.offset_right = 230
	tip_lbl = RichTextLabel.new(); tip_lbl.bbcode_enabled = true; tip_lbl.fit_content = true; tip_lbl.scroll_active = false; tip_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE; tip.add_child(tip_lbl); root.add_child(tip)
	# ----- dock -----
	var dock := HBoxContainer.new(); dock.set_anchors_preset(Control.PRESET_CENTER_BOTTOM); dock.offset_top = -92; dock.offset_bottom = -14; dock.offset_left = -430; dock.offset_right = 430; dock.add_theme_constant_override("separation", 10)
	for d in [["PROCURE", "procure"], ["BUILD", "plant"], ["CUSTOMERS", "customers"], ["WAREHOUSE", "warehouse"], ["FINANCE", "finance"]]:
		var b := _btn(d[0], func(): toggle_panel(d[1]), false, 19); b.custom_minimum_size = Vector2(160, 64); dock.add_child(b)
	root.add_child(dock)
	place_banner = _label("", 24, C_GR); place_banner.set_anchors_preset(Control.PRESET_CENTER_TOP); place_banner.offset_top = 90; place_banner.offset_left = -300; place_banner.offset_right = 300; place_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; root.add_child(place_banner)
	modal_holder = Control.new(); modal_holder.set_anchors_preset(Control.PRESET_FULL_RECT); modal_holder.mouse_filter = Control.MOUSE_FILTER_IGNORE; root.add_child(modal_holder)

func _ready() -> void:
	layer = 10
	_build_ui()
	set_speed(1)

func set_speed(v: int) -> void:
	speed = v; speed_changed.emit(v)
	for i in speed_btns.size(): speed_btns[i].modulate = Color(0.5, 1.0, 0.9) if i == v else Color.WHITE

# ---------- per-frame / refresh ----------
func _process(_dt: float) -> void:
	if sim == null: return
	_cash_shown = lerpf(_cash_shown, sim.s.cash, 0.15)
	lbl_cash.text = Sim.money(_cash_shown); lbl_cash.add_theme_color_override("font_color", C_GR if sim.s.cash >= 0 else C_RD)

func refresh(month_frac := 0.0) -> void:
	if sim == null: return
	var s := sim.s
	lbl_date.text = sim.date_of(s.month)
	lbl_nw.text = Sim.money(sim.net_worth()); lbl_rep.text = "%d" % int(s.rep)
	var ch := sim.chapter(); var nw := sim.net_worth(); var tgt := sim.chapter_target()
	lbl_goal.text = "OBJECTIVE %d/4 · %s — reach %s by %s  (%d%%)" % [s.chapter + 1, ch.name, Sim.money(tgt), sim.date_of(ch.deadline), int(100.0 * nw / tgt)]
	_setbar(bar_goal, nw / tgt, C_GR if nw / tgt > 0.85 else C_AM)
	var h: Dictionary = s.halls[hall_i]
	var heat := sim.hall_heat(h)
	lbl_pw.text = "POWER  %d / %d kW" % [int(heat), int(h.it_kw)]; _setbar(gauge_pw, heat / maxf(1.0, h.it_kw), C_RD if heat > h.it_kw else (C_AM if heat > h.it_kw * 0.85 else C_GR))
	lbl_cl.text = "COOLING  %d / %d kW" % [int(heat), int(h.cool_kw)]; _setbar(gauge_cl, heat / maxf(1.0, h.cool_kw), C_RD if heat > h.cool_kw else (C_AM if heat > h.cool_kw * 0.85 else C_CY))
	for c in halls_row.get_children(): c.queue_free()
	for i in s.halls.size():
		var b := _btn(s.halls[i].name, func(): hall_i = i; hall_selected.emit(i); refresh(), i == hall_i, 14); halls_row.add_child(b)
	var p := sim.pnl()
	lbl_pnl.text = "[b]MONTHLY[/b]\nRevenue  [color=#3ee69a]%s[/color]  (contracts %s · spot %s)\nBurn  [color=#ff8a6a]%s[/color]  (power %s · staff %s · support %s)\nNet  [color=%s][b]%s[/b][/color]\nGPUs online  %d · contracted %d" % [Sim.money(p.revenue), Sim.money(p.contract_rev), Sim.money(p.spot_rev), Sim.money(p.opex), Sim.money(p.power), Sim.money(p.staff), Sim.money(p.support), "#3ee69a" if p.net >= 0 else "#ff5d73", Sim.money(p.net), int(p.accels), int(p.contracted)]
	place_banner.text = ""
	if open_panel != "": _fill_panel()

func set_chrome(v: bool) -> void:
	for c in root.get_children():
		if c != modal_holder: c.visible = v
	tip.visible = false

func set_month_frac(f: float) -> void: bar_month.value = f

# ---------- feed & tooltips ----------
func push_feed(level: String, text: String) -> void:
	var col := C_GR if level == "good" else (C_RD if level == "bad" else C_DIM)
	var pc := PanelContainer.new(); pc.add_theme_stylebox_override("panel", _sb(Color(0.03, 0.05, 0.08, 0.8), col, 8, 1, 8)); pc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var l := _label(text, 15, col.lightened(0.25)); l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; l.custom_minimum_size = Vector2(520, 0); l.mouse_filter = Control.MOUSE_FILTER_IGNORE; pc.add_child(l); feed.add_child(pc)
	while feed.get_child_count() > 6: feed.get_child(0).queue_free(); feed.remove_child(feed.get_child(0))
	pc.modulate.a = 0.0; var tw := create_tween(); tw.tween_property(pc, "modulate:a", 1.0, 0.25); tw.tween_interval(9.0); tw.tween_property(pc, "modulate:a", 0.0, 1.5); tw.tween_callback(pc.queue_free)

func show_hover(slot: int, rack: Dictionary, placing: String) -> void:
	if sim == null: return
	if slot < 0: tip.visible = false; return
	tip.visible = true
	if rack.is_empty():
		tip_lbl.text = "[b]Empty slot[/b]  %s%d\n%s" % [char(65 + slot / maxi(1, 1)) if false else "#", slot + 1, "Click to place [b]%s[/b]" % Data.system(placing).name if placing != "" else "Open the Warehouse to place a delivered system here."]
		return
	var sy := Data.system(rack.sys)
	var status: String = rack.status
	var extra := ""
	if status == "installing" or status == "commissioning": extra = "  ·  ready %s" % sim.date_of(rack.ready)
	elif status == "failed": extra = "  ·  repair done %s" % sim.date_of(rack.until)
	tip_lbl.text = "[b]%s[/b]\n%s%s\n%d GPUs · %d kW · %d GB · %s" % [sy.name, status.to_upper(), extra, sy.accels, int(sy.kW), int(sy.memGB), sy.cooling.to_upper()]

# ---------- modal panels ----------
func toggle_panel(name: String) -> void:
	if open_panel == name: close_panel(); return
	open_panel = name; panel_toggled.emit(true); _fill_panel()

func close_panel() -> void:
	open_panel = ""
	for c in modal_holder.get_children(): c.queue_free()
	panel_toggled.emit(false)

func _fill_panel() -> void:
	for c in modal_holder.get_children(): c.queue_free()
	var titles := {"procure": "PROCUREMENT", "plant": "BUILD & POWER", "customers": "CUSTOMERS", "warehouse": "WAREHOUSE", "finance": "FINANCE"}
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.45); dim.set_anchors_preset(Control.PRESET_FULL_RECT); modal_holder.add_child(dim)
	var pc := PanelContainer.new(); pc.set_anchors_preset(Control.PRESET_CENTER); pc.offset_left = -560; pc.offset_right = 560; pc.offset_top = -330; pc.offset_bottom = 300
	pc.add_theme_stylebox_override("panel", _sb(Color(0.035, 0.055, 0.085, 0.97), C_CY, 14, 2, 18)); modal_holder.add_child(pc)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 10); pc.add_child(vb)
	var head := HBoxContainer.new(); head.add_child(_label(titles[open_panel], 26, C_CY)); var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; head.add_child(sp)
	head.add_child(_label("cash %s" % Sim.money(sim.s.cash), 18, C_GR)); head.add_child(_btn("X", close_panel, false, 18)); vb.add_child(head)
	var sc := ScrollContainer.new(); sc.size_flags_vertical = Control.SIZE_EXPAND_FILL; sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; vb.add_child(sc)
	var body := VBoxContainer.new(); body.size_flags_horizontal = Control.SIZE_EXPAND_FILL; body.add_theme_constant_override("separation", 8); sc.add_child(body)
	match open_panel:
		"procure": _procure(body)
		"plant": _plant(body)
		"customers": _customers(body)
		"warehouse": _warehouse(body)
		"finance": _finance(body)

func _card() -> PanelContainer:
	var c := PanelContainer.new(); c.add_theme_stylebox_override("panel", _sb(Color(0.06, 0.09, 0.13), C_LINE, 10, 1, 12)); return c

func _row(parent: Control, left: Control, buttons: Array) -> void:
	var c := _card(); var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 10); c.add_child(h); left.size_flags_horizontal = Control.SIZE_EXPAND_FILL; h.add_child(left)
	for b in buttons: h.add_child(b)
	parent.add_child(c)

func _rich(t: String, size := 16) -> RichTextLabel:
	var r := RichTextLabel.new(); r.bbcode_enabled = true; r.fit_content = true; r.scroll_active = false; r.text = t; r.add_theme_font_size_override("normal_font_size", size); r.mouse_filter = Control.MOUSE_FILTER_IGNORE; return r

func _procure(body: VBoxContainer) -> void:
	var h: Dictionary = sim.s.halls[hall_i]
	body.add_child(_label("Systems are bought as complete racks. Lead times are real — GPUs arrive months after you pay. Placing: %s hall (%s)." % [h.cool.to_upper(), h.name], 15, C_DIM))
	var list := sim.available_systems(); list.sort_custom(func(a, b): return a.availableFrom > b.availableFrom or (a.availableFrom == b.availableFrom and a.priceAtLaunch < b.priceAtLaunch))
	for sy in list:
		var price := sim.system_price(sy)
		var mismatch: bool = sy.cooling != h.cool
		var info := "[b]%s[/b]\n[color=#8fb0c8]%d GPUs · %d kW · %s cooling · %s · lead %d mo[/color]  [color=%s]%s[/color]\n[color=#6f8aa0]%s[/color]" % [sy.name, sy.accels, int(sy.kW), sy.cooling.to_upper(), sy.tier.to_upper(), int(sy.leadMonths), "#ffb833" if mismatch else "#3ee69a", "needs a %s hall" % sy.cooling.to_upper() if mismatch else "fits this hall", sy.tagline]
		var btns := []
		for q in [1, 2, 4]:
			var cost: float = price * q * (1.0 - minf(0.12, q * 0.01))
			var b := _btn("×%d  %s" % [q, Sim.money(cost)], func(): _try(sim.order_system(sy.id, q)), false, 15); b.disabled = cost > sim.s.cash; btns.append(b)
		_row(body, _rich(info, 15), btns)

func _plant(body: VBoxContainer) -> void:
	var h: Dictionary = sim.s.halls[hall_i]
	body.add_child(_label("%s — %s hall · power %d kW · cooling %d kW. IT load can never exceed either." % [h.name, h.cool.to_upper(), int(h.it_kw), int(h.cool_kw)], 16, C_DIM))
	body.add_child(_label("POWER", 15, C_AM))
	for id in Data.PLANT.power: _plant_row(body, id)
	body.add_child(_label("COOLING (%s)" % h.cool.to_upper(), 15, C_CY))
	for id in Data.PLANT[h.cool]: _plant_row(body, id)
	body.add_child(_label("NEW HALLS", 15, C_GR))
	for spec in [["Air hall · 40 slots", "air", 40], ["Liquid (DLC) hall · 24 slots", "dlc", 24]]:
		var cost: float = spec[2] * (90000.0 if spec[1] == "air" else 240000.0)
		var b := _btn("Build %s" % Sim.money(cost), func(): _try(sim.build_hall("Hall %s" % char(65 + sim.s.halls.size()), spec[1], spec[2])), false, 15); b.disabled = cost > sim.s.cash
		_row(body, _rich("[b]%s[/b]\n[color=#8fb0c8]3 months to build. Needs its own power + cooling.[/color]" % spec[0], 15), [b])

func _plant_row(body: VBoxContainer, id: String) -> void:
	var it := Data.item(id)
	if it.is_empty() or it.availableFrom > sim.year(): return
	var b := _btn("Buy %s" % Sim.money(it.priceUSD), func(): _try(sim.order_plant(hall_i, id)), false, 15); b.disabled = it.priceUSD > sim.s.cash
	_row(body, _rich("[b]%s[/b]\n[color=#8fb0c8]+%d kW · lead %d mo · $%d per kW[/color]" % [it.name, it.capacityKW, int(ceil(it.leadTimeMonths)), int(it.priceUSD / maxf(1.0, it.capacityKW))], 15), [b])

func _customers(body: VBoxContainer) -> void:
	var s := sim.s
	body.add_child(_label("Contracts pay a premium per GPU-hour but demand capacity on a deadline. Miss it and you pay penalties. Uncontracted GPUs earn spot (~%d%% busy)." % int(sim.pnl().spot_util * 100), 15, C_DIM))
	body.add_child(_label("ACTIVE", 15, C_GR))
	if s.contracts.is_empty(): body.add_child(_label("None yet.", 15, C_DIM))
	for c in s.contracts:
		var deploying: bool = s.month < c.deploy_by
		_row(body, _rich("[b]%s[/b]  [color=#8fb0c8]%s · %d GPUs · $%.2f/GPU-hr[/color]\n%s" % [c.customer, c.kind, c.accels, c.price, ("[color=#ffb833]needs to be live by %s[/color]" % sim.date_of(c.deploy_by)) if deploying else "[color=#3ee69a]serving[/color] · month %d/%d · misses %d" % [s.month - c.start, c.months, c.misses]], 15), [])
	body.add_child(_label("OFFERS (expire in 5 months)", 15, C_AM))
	var online := sim.online_accels(); var committed := sim.contract_demand()
	for i in s.offers.size():
		var c: Dictionary = s.offers[i]
		var rev: float = c.accels * c.price * Sim.HOURS
		var ok: bool = committed + c.accels <= online + 1
		var b := _btn("SIGN", func(): _try(sim.accept_offer(i)), true, 16)
		_row(body, _rich("[b]%s[/b]  [color=#8fb0c8]%s · %s[/color]\n%d GPUs · $%.2f/GPU-hr · %d months → [color=#3ee69a]%s/mo[/color]  [color=%s]%s[/color]" % [c.customer, c.archetype, c.kind, c.accels, c.price, c.months, Sim.money(rev), "#3ee69a" if ok else "#ffb833", "capacity ready" if ok else "needs %d more online GPUs" % int(committed + c.accels - online)], 15), [b])

func _warehouse(body: VBoxContainer) -> void:
	var s := sim.s
	body.add_child(_label("Delivered systems wait here. Pick one, then click an empty slot on the hall floor.", 15, C_DIM))
	if s.crates.is_empty(): body.add_child(_label("Warehouse is empty.", 16, C_DIM))
	for id in s.crates:
		var sy := Data.system(id)
		var b := _btn("PLACE ON FLOOR", func(): close_panel(); place_requested.emit(id), true, 16)
		_row(body, _rich("[b]%d× %s[/b]\n[color=#8fb0c8]%d GPUs · %d kW each · needs a %s hall[/color]" % [s.crates[id], sy.name, sy.accels, int(sy.kW), sy.cooling.to_upper()], 15), [b])
	body.add_child(_label("IN TRANSIT", 15, C_AM))
	if s.orders.is_empty(): body.add_child(_label("Nothing on order.", 15, C_DIM))
	for o in s.orders:
		var nm: String = Data.system(o.id).name if o.kind == "system" else (Data.item(o.id).name if o.kind == "plant" else "New %s hall: %s" % [o.id.to_upper(), o.name])
		body.add_child(_label("%d× %s — arrives %s (%d mo)" % [o.qty, nm, sim.date_of(o.arrive), o.arrive - s.month], 16))

func _finance(body: VBoxContainer) -> void:
	var s := sim.s; var p := sim.pnl()
	body.add_child(_rich("[b]Cash[/b] %s   [b]Debt[/b] %s   [b]Net worth[/b] %s\n[b]Revenue[/b] %s/mo   [b]Burn[/b] %s/mo   [b]Net[/b] %s/mo" % [Sim.money(s.cash), Sim.money(s.debt), Sim.money(sim.net_worth()), Sim.money(p.revenue), Sim.money(p.opex), Sim.money(p.net)], 18))
	var lb := _btn("Borrow $10M @ 8%", func(): _try(sim.take_loan(10e6)), false, 16)
	var rb := _btn("Repay $10M", func(): if s.debt >= 10e6 and s.cash >= 10e6: s.debt -= 10e6; s.cash -= 10e6; refresh(), false, 16)
	_row(body, _rich("[b]Bank[/b]\n[color=#8fb0c8]Leverage grows you faster — and sinks you faster.[/color]", 15), [lb, rb])
	var sb := _btn("+2 kits  $36k", func(): _try(sim.buy_spares(2)), false, 16)
	_row(body, _rich("[b]Spare-parts shelf: %d kits[/b]\n[color=#8fb0c8]A failure with a spare costs 1 month. Without one: a 4-month RMA.[/color]" % s.spares, 15), [sb])
	body.add_child(_label("RECENT LOG", 15, C_AM))
	var logs: Array = s.log.duplicate(); logs.reverse()
	for e in logs.slice(0, 14): body.add_child(_label("%s — %s" % [sim.date_of(e.month), e.text], 14, C_GR if e.level == "good" else (C_RD if e.level == "bad" else C_DIM)))

func _try(err: String) -> void:
	if err != "": push_feed("bad", err)
	refresh()

# ---------- incident card ----------
var _incident_ui: Control
func show_incident(on_choice: Callable) -> void:
	if _incident_ui != null: return
	var inc: Dictionary = sim.s.incident; var card := Incidents.card(sim, inc.kind, inc.params)
	var holder := Control.new(); holder.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_child(holder); _incident_ui = holder
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.62); dim.set_anchors_preset(Control.PRESET_FULL_RECT); holder.add_child(dim)
	var pc := PanelContainer.new(); pc.set_anchors_preset(Control.PRESET_CENTER); pc.offset_left = -400; pc.offset_right = 400; pc.offset_top = -230; pc.offset_bottom = 230
	pc.add_theme_stylebox_override("panel", _sb(Color(0.07, 0.05, 0.03, 0.98), C_AM, 16, 3, 24)); holder.add_child(pc)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 14); pc.add_child(vb)
	var t := _label("%s  %s" % [card.icon, card.title], 34, C_AM); vb.add_child(t)
	var body := _label(card.body, 20); body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; vb.add_child(body)
	for i in card.choices.size():
		var ch: Dictionary = card.choices[i]
		var b := _btn("%s\n%s" % [ch.t, ch.d], func(): _resolve(on_choice, i), false, 18); b.alignment = HORIZONTAL_ALIGNMENT_LEFT; b.custom_minimum_size = Vector2(0, 74); vb.add_child(b)
	pc.pivot_offset = Vector2(400, 230); pc.scale = Vector2(0.85, 0.85); pc.modulate.a = 0.0
	var tw := create_tween().set_parallel(true); tw.tween_property(pc, "scale", Vector2.ONE, 0.25).set_trans(Tween.TRANS_BACK); tw.tween_property(pc, "modulate:a", 1.0, 0.2)

func _resolve(cb: Callable, i: int) -> void:
	_incident_ui.queue_free(); _incident_ui = null; cb.call(i)

# ---------- end screen ----------
func show_end(on_restart: Callable) -> void:
	var over: String = sim.s.over
	var titles := {"won": ["HYPERSCALER", "You built a giga-scale AI factory. The board gives you the keys to the kingdom.", C_GR], "lost": ["OUT OF TIME", "The decade ended and the board's final target slipped away.", C_AM],
		"fired": ["FIRED", "Reputation collapsed. The board replaced you.", C_RD], "bankrupt": ["BANKRUPT", "The lenders took the keys.", C_RD]}
	var t: Array = titles.get(over, titles.lost)
	var holder := Control.new(); holder.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_child(holder)
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.8); dim.set_anchors_preset(Control.PRESET_FULL_RECT); holder.add_child(dim)
	var vb := VBoxContainer.new(); vb.set_anchors_preset(Control.PRESET_CENTER); vb.offset_left = -400; vb.offset_right = 400; vb.offset_top = -200; vb.offset_bottom = 200; vb.add_theme_constant_override("separation", 14); holder.add_child(vb)
	vb.add_child(_label(t[0], 56, t[2])); var d := _label(t[1], 22); d.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; vb.add_child(d)
	var score := int(sim.net_worth() / 1e5 + sim.s.rep * 50 + sim.s.chapter_done.filter(func(x): return x >= 0).size() * 1000)
	vb.add_child(_label("Final net worth %s · peak %s · reputation %d · objectives %d/4 · failures survived %d" % [Sim.money(sim.net_worth()), Sim.money(sim.s.peak_nw), int(sim.s.rep), sim.s.chapter_done.filter(func(x): return x >= 0).size(), sim.s.fails], 18, C_DIM))
	vb.add_child(_label("SCORE  %d" % score, 40, C_CY)); vb.add_child(_btn("PLAY AGAIN", on_restart, true, 26))

# ---------- title screen ----------
func show_title() -> void:
	var holder := Control.new(); holder.set_anchors_preset(Control.PRESET_FULL_RECT); holder.name = "title"; root.add_child(holder)
	var vb := VBoxContainer.new(); vb.set_anchors_preset(Control.PRESET_CENTER_LEFT); vb.offset_left = 90; vb.offset_top = -260; vb.offset_bottom = 260; vb.offset_right = 760; vb.add_theme_constant_override("separation", 12); holder.add_child(vb)
	vb.add_child(_label("AI DATACENTER TYCOON", 18, C_DIM)); vb.add_child(_label("GIGAWATT", 120, C_CY))
	var p := _label("Buy real GPUs. Fill the floor. Keep the power on. Lease capacity to the AI boom — and survive 2020 → 2028.", 22); p.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; vb.add_child(p)
	for m in [["LEARNER", "learner", "$80M · forgiving start"], ["OPERATOR", "operator", "$50M · the intended game"], ["TYCOON", "tycoon", "$30M · tight and unforgiving"]]:
		var b := _btn("%s     %s" % [m[0], m[2]], func(): holder.queue_free(); new_game_requested.emit(m[1]), m[1] == "operator", 24); b.custom_minimum_size = Vector2(560, 64); b.alignment = HORIZONTAL_ALIGNMENT_LEFT; vb.add_child(b)
	vb.add_child(_label("Right-drag orbit · wheel zoom · WASD pan · Space pause · 1/2/3 speed · Esc cancel", 15, C_DIM))
