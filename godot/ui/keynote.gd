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

func open(k: Dictionary, more: int) -> void:
	for c in get_children(): c.queue_free()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter = Control.MOUSE_FILTER_STOP; visible = true
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.72); dim.set_anchors_preset(Control.PRESET_FULL_RECT); add_child(dim)
	var vsz := get_viewport().get_visible_rect().size; var side := maxf(24.0, (vsz.x - 1280.0) * 0.5) if vsz.x > 1500.0 else (200.0 if vsz.x > 1100.0 else 24.0)   # never wider than ~1280 px, even on an ultrawide
	var pc := PanelContainer.new(); pc.set_anchors_preset(Control.PRESET_FULL_RECT); pc.offset_left = side; pc.offset_right = -side; pc.offset_top = 56 if vsz.y > 600.0 else 16.0; pc.offset_bottom = -56 if vsz.y > 600.0 else -16.0
	pc.add_theme_stylebox_override("panel", Kit.card_sb(Kit.AM, Kit.BG, 3, 20)); add_child(pc)
	var outer := VBoxContainer.new(); outer.add_theme_constant_override("separation", 10); pc.add_child(outer)
	var hd := HBoxContainer.new(); hd.add_theme_constant_override("separation", 12); outer.add_child(hd)
	hd.add_child(Kit.chip("📣 KEYNOTE · %s · %s" % [str(k.venue).to_upper(), Kit.date_of(int(k.month))], Kit.AM, 14))
	var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; hd.add_child(sp)
	if more > 0: hd.add_child(Kit.label("+%d more after this" % more, 12, Kit.DIM))
	outer.add_child(Kit.label(str(k.title), 28, Kit.TX, true))
	outer.add_child(Kit.label(str(k.headline), 15, Kit.DIM, true))
	var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.size_flags_vertical = Control.SIZE_EXPAND_FILL; outer.add_child(sc)
	var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 8); sc.add_child(v)
	body(v, k)
	var ft := HBoxContainer.new(); ft.add_theme_constant_override("separation", 10); outer.add_child(ft)
	var pre: bool = k.items.any(func(i): return i.state == "preorder")
	var got := Kit.btn("Got it", func(): _ack(false), "" if pre else "pri", 17); got.custom_minimum_size = Vector2(160, 48); ft.add_child(got)
	if pre:
		var go := Kit.btn("Pre-order in Supply →", func(): _ack(true), "go", 17); go.custom_minimum_size = Vector2(260, 48); ft.add_child(go)
	var roadmap := Kit.btn("Roadmap", func(): _ack(true, true), "", 15); roadmap.custom_minimum_size = Vector2(120, 48); ft.add_child(roadmap)

func _ack(go_supply: bool, roadmap := false) -> void:
	visible = false
	app.b.act("ackNews")
	if go_supply:
		if roadmap: ProcureScreen.next_tab = "road"
		app.go("shop")
	app.check_keynote()
