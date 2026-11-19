class_name KeynoteOverlay
extends Control
## A launch keynote: what was announced, what is technically new, what it changes for the datacenter, and what can be pre-ordered.
var app

static func state_chip(s: String, ships: int, opens: int) -> Control:
	match s:
		"shipping": return Kit.chip("SHIPPING", Kit.CY, 12)
		"preorder": return Kit.chip("PRE-ORDER · ships %s" % Kit.date_of(ships), Kit.GR, 12)
	return Kit.chip("ORDERS OPEN %s" % Kit.date_of(opens), Kit.AM, 12)

## Everything about one launch (tech / impact / takeaway / parts). Shared with the Roadmap tab.
static func tag(parent: Control, t: String, col: Color) -> void:
	var c := Kit.chip(t, col, 12); c.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN; parent.add_child(c)

static func body(parent: Control, k: Dictionary, with_parts := true) -> void:
	tag(parent, "WHAT'S NEW", Kit.CY)
	for t in k.tech: parent.add_child(Kit.label("•  " + str(t), 14, Kit.TX, true))
	tag(parent, "WHAT IT CHANGES FOR YOU", Kit.AM)
	for t in k.impact: parent.add_child(Kit.label("•  " + str(t), 14, Kit.TX, true))
	var tk := PanelContainer.new(); tk.add_theme_stylebox_override("panel", Kit.sb(Kit.tint(Kit.AM, 0.16), Kit.AM, 8, 1, 10)); tk.add_child(Kit.label("★ " + str(k.takeaway), 14, Kit.AM, true)); parent.add_child(tk)
	if with_parts and k.items.size() > 0:
		tag(parent, "PARTS", Kit.GR)
		for it in k.items:
			var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 8); parent.add_child(r)
			r.add_child(state_chip(str(it.state), int(it.ships), int(it.opens))); r.add_child(Kit.label(str(it.name), 13, Kit.TX, true))

## Sized like every dialog (app.fit_dialog): at most ~1280 px wide, as tall as its content, the body scrolling when the screen is short.
func open(k: Dictionary, more: int) -> void:
	for c in get_children(): c.queue_free()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter = Control.MOUSE_FILTER_STOP; visible = true
	move_to_front()   # top of the modal stack: toasts, the tutorial card or the drawer divider added later can never take its clicks
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.72); dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	var ins: Vector4 = app.inset if app != null else Vector4.ZERO
	dim.offset_left = -ins.x; dim.offset_top = -ins.y; dim.offset_right = ins.z; dim.offset_bottom = ins.w; add_child(dim)
	var pc := PanelContainer.new()
	pc.add_theme_stylebox_override("panel", Kit.card_sb(Kit.AM, Kit.BG, 3, 20 if not Layout.phone else 14)); add_child(pc)
	var outer := VBoxContainer.new(); outer.add_theme_constant_override("separation", 10); pc.add_child(outer)
	var hd := HFlowContainer.new(); hd.add_theme_constant_override("h_separation", 12); hd.add_theme_constant_override("v_separation", 6); outer.add_child(hd)
	hd.add_child(Kit.chip("📣 KEYNOTE · %s · %s" % [str(k.venue).to_upper(), Kit.date_of(int(k.month))], Kit.AM, 14))
	if more > 0: hd.add_child(Kit.label("+%d more after this" % more, 13, Kit.DIM))
	var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.size_flags_vertical = Control.SIZE_EXPAND_FILL; outer.add_child(sc)
	var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 8); sc.add_child(v)
	v.add_child(Kit.label(str(k.title), 28 if not Layout.phone else 22, Kit.TX, true))
	v.add_child(Kit.label(str(k.headline), 15, Kit.DIM, true))
	body(v, k)
	var ft := HFlowContainer.new(); ft.add_theme_constant_override("h_separation", 10); ft.add_theme_constant_override("v_separation", 8); outer.add_child(ft)
	var pre: bool = k.items.any(func(i): return i.state == "preorder")
	var bh := maxf(48.0, Layout.tap())
	var got := Kit.btn("Got it", _ack.bind(false), "go" if not pre else "", 17); got.custom_minimum_size = Vector2(160, bh); ft.add_child(got)
	if pre:
		var go := Kit.btn("Pre-order in Supply →", _ack.bind(true), "go", 17); go.custom_minimum_size = Vector2(260, bh); ft.add_child(go)
	var roadmap := Kit.btn("Roadmap", _ack.bind(true, true), "", 17); roadmap.custom_minimum_size = Vector2(140, bh); ft.add_child(roadmap)
	if more >= 2:   # a long queue (a loaded save, fast-forward): one press clears it; every keynote stays in the Roadmap
		var skip := Kit.btn("Skip all (%d)" % (more + 1), func(): app.skip_all_keynotes(), "", 17); skip.custom_minimum_size = Vector2(150, bh); ft.add_child(skip)
	if app != null: app.fit_dialog(pc, 1280.0, v)

func _ack(go_supply: bool, roadmap := false) -> void:
	if not visible: return
	visible = false
	app.b.act("ackNews")
	if go_supply:
		if roadmap: ProcureScreen.next_tab = "road"
		app.go("shop")
	app.check_keynote()
