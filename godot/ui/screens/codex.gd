class_name CodexScreen
extends Control
var app
var q := ""
var view := "list"
var sel := ""

func refresh() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b
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
		var ql := q.to_lower(); var n := 0
		for i in b.items.values():
			var hay := ("%s%s%s%s" % [i.name, i.vendor, i.kind, " ".join(i.codex.get("tags", []))]).to_lower()
			if ql != "" and not hay.contains(ql): continue
			n += 1
			if n > 160: break
			var rb := Kit.btn("%s\n%s · %s" % [i.name, i.kind, str(i.codex.summary).left(90)], func(): sel = i.id; refresh(), "pri" if sel == i.id else "", 13); rb.alignment = HORIZONTAL_ALIGNMENT_LEFT; lc.add_child(rb)
		if sel != "" and b.items.has(sel):
			var it: Dictionary = b.item(sel); var dp := Kit.panel(it.name, true, dc)
			var rows := []; for s in Kit.specs_of(it): rows.append([Kit.label(s[0], 13, Kit.DIM), Kit.label(s[1], 13)])
			dp[1].add_child(Kit.table([], rows)); Kit.codex_card(dp[1], it.codex)
			for v in b.vendors:
				if v.id == it.vendor: dp[1].add_child(Kit.label("Vendor: %s" % v.codex.summary, 13, Kit.DIM, true))
		else:
			var np := Kit.panel("", false, dc); np[1].add_child(Kit.label("Pick a part. Every entry explains what it is, why it exists, and the tradeoffs you will face building with it.", 14, Kit.DIM, true))
