class_name CodexScreen
extends Control
var app
var q := ""
var view := "list"
var sel := ""
var folds := {}

const KIND_LBL := {"accelerator": "Accelerators", "cpu": "CPUs", "memory": "Memory", "nic": "Network cards", "switch": "Switches", "cable": "Cables & optics", "chassis": "Chassis & boards", "storage": "Storage", "power": "Power", "cooling": "Cooling", "rack": "Racks", "uplink": "Internet uplinks"}

static var next_view := ""
func refresh() -> void: Kit.rebuild_keep(self, _rebuild)

func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b
	if next_view != "": view = next_view; next_view = ""
	if app.learn_id != "": sel = app.learn_id; app.learn_id = ""; view = "list"
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := HBoxContainer.new(); hd.add_theme_constant_override("separation", 8); root.add_child(hd)
	hd.add_child(Kit.label("CODEX", 26, Kit.CY)); hd.add_child(Kit.label("%d real parts" % b.items.size(), 13, Kit.DIM))
	var le := LineEdit.new(); le.placeholder_text = "search: hbm, nvlink, dpu, liquid…"; le.text = q; le.custom_minimum_size = Vector2(300, 0); le.text_submitted.connect(func(t): q = t; refresh()); le.text_changed.connect(func(t): q = t); hd.add_child(le)
	hd.add_child(Kit.btn("Search", func(): refresh(), "", 14))
	for t in [["list", "Parts encyclopedia"], ["concepts", "Datacenter 101"], ["time", "Accelerator timeline"]]: hd.add_child(Kit.btn(t[1], func(): view = t[0]; refresh(), "pri" if view == t[0] else "", 14))
	if view == "concepts":
		var col := Kit.column(root, 0, true); var p := Kit.panel("What is it, why do I need it, and do I need it right now?", true, col); ConceptsView.build(app, p[1], [], func(): refresh())
	elif view == "time":
		var col := Kit.column(root, 0, true); var p := Kit.panel("Accelerator generations", false, col)
		var accel: Array = b.items.values().filter(func(i): return i.kind == "accelerator"); accel.sort_custom(func(a, c): return a.availableFrom < c.availableFrom)
		var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 10); fl.add_theme_constant_override("v_separation", 10); p[1].add_child(fl)
		for a in accel:
			var card := PanelContainer.new(); card.custom_minimum_size = Vector2(210, 0); var vc := Kit.vendor_color(a.vendor)
			card.add_theme_stylebox_override("panel", Kit.sb(Kit.PANEL, Color(vc.r, vc.g, vc.b, 0.5), 8, 1, 10)); var v := VBoxContainer.new(); card.add_child(v)
			v.add_child(Kit.label(str(a.availableFrom), 12, Kit.DIM)); v.add_child(Kit.label(a.name, 14, vc, true)); v.add_child(Kit.label("%d GB · %s TB/s · %d W" % [int(a.memGB), Kit.num(a.memBWTBs, 1), int(a.tdpW)], 11, Kit.DIM)); v.add_child(Kit.label(a.scaleUp, 11, Kit.DIM))
			var bt := Button.new(); bt.flat = true; bt.set_anchors_preset(Control.PRESET_FULL_RECT); bt.focus_mode = Control.FOCUS_NONE; bt.pressed.connect(func(): sel = a.id; view = "list"; refresh()); card.add_child(bt); fl.add_child(card)
	else:
		var cols := HBoxContainer.new(); cols.size_flags_vertical = Control.SIZE_EXPAND_FILL; cols.add_theme_constant_override("separation", 12); root.add_child(cols)
		var lc := Kit.column(cols, 0, true); var dc := Kit.column(cols, 0, true)
		var ql := q.to_lower()
		var groups := {}
		for i in b.items.values():
			var hay := ("%s%s%s%s" % [i.name, i.vendor, i.kind, " ".join(i.codex.get("tags", []))]).to_lower()
			if ql != "" and not hay.contains(ql): continue
			if not groups.has(i.kind): groups[i.kind] = []
			groups[i.kind].append(i)
		var kinds := groups.keys(); kinds.sort()
		if kinds.is_empty(): lc.add_child(Kit.label("Nothing matches.", 14, Kit.DIM))
		for k in kinds:
			var arr: Array = groups[k]; arr.sort_custom(func(x, y): return str(x.name) < str(y.name))
			var holds := arr.any(func(x): return x.id == sel)
			var key := "k_" + str(k)
			if ql != "" or holds: if not folds.has(key): folds[key] = false
			var fp := Kit.fold_panel("%s  (%d)" % [KIND_LBL.get(k, str(k)), arr.size()], key, folds, func(): refresh(), false, lc, true)
			if bool(folds.get(key, true)): continue   # collapsed: skip building hundreds of cards nobody sees
			for i in arr:
				var on: bool = sel == i.id
				var card := PanelContainer.new(); card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				card.add_theme_stylebox_override("panel", Kit.sb(Color(0.08, 0.16, 0.22) if on else Color(0.05, 0.08, 0.11), Kit.CY if on else Kit.LINE, 8, 1, 8))
				var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 8); hb.mouse_filter = Control.MOUSE_FILTER_IGNORE; card.add_child(hb)
				var st := ColorRect.new(); st.color = Kit.vendor_color(str(i.vendor)); st.custom_minimum_size = Vector2(4, 0); st.mouse_filter = Control.MOUSE_FILTER_IGNORE; hb.add_child(st)
				var vb := VBoxContainer.new(); vb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; vb.mouse_filter = Control.MOUSE_FILTER_IGNORE; hb.add_child(vb)
				vb.add_child(Kit.label(i.name, 13, Kit.TX, true)); vb.add_child(Kit.label("%s · %s" % [i.vendor, str(i.codex.summary).left(100)], 11, Kit.DIM, true))
				var click := Button.new(); click.flat = true; click.set_anchors_preset(Control.PRESET_FULL_RECT); click.focus_mode = Control.FOCUS_NONE; click.pressed.connect(func(): sel = i.id; refresh()); card.add_child(click); card.move_child(click, 0)
				fp[1].add_child(card)
		if sel != "" and b.items.has(sel):
			var it: Dictionary = b.item(sel); var dp := Kit.panel(it.name, true, dc)
			var rows := []; for s in Kit.specs_of(it): rows.append([Kit.label(s[0], 13, Kit.DIM), Kit.label(s[1], 13)])
			dp[1].add_child(Kit.table([], rows)); Kit.codex_card(dp[1], it.codex)
			for v in b.vendors:
				if v.id == it.vendor: dp[1].add_child(Kit.label("Vendor: %s" % v.codex.summary, 13, Kit.DIM, true))
		else:
			var np := Kit.panel("", false, dc); np[1].add_child(Kit.label("Pick a part. Every entry explains what it is, why it exists, and the tradeoffs you will face building with it.", 14, Kit.DIM, true))
