class_name CodexScreen
extends Control
var app
var q := ""
var view := "list"
var sel := ""
var folds := {}

const KIND_LBL := {"accelerator": "Accelerators", "cpu": "CPUs", "memory": "Memory", "nic": "Network cards", "nvme": "NVMe drives", "switch": "Switches", "cable": "Cables & optics", "chassis": "Chassis & boards", "storage": "Storage", "power": "Power", "cooling": "Cooling", "rack": "Racks", "uplink": "Internet uplinks"}

static var next_view := ""
const BK := preload("res://ui/build_keep.gd")
func refresh() -> void: BK.refresh(self, app, _rebuild)
var _qtok := 0
## Search as you type (after a short pause), in every tab; the field keeps focus and caret across the rebuild.
func _search_box(min_w: float) -> LineEdit:
	var le := LineEdit.new(); Kit.style_edit(le, false); le.placeholder_text = "search: hbm, nvlink, dpu, liquid…"; le.text = q; le.clear_button_enabled = true; le.set_meta("key", "codex_q")
	le.custom_minimum_size = Vector2(min_w, Layout.tap() if Layout.compact else 0.0); le.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	le.text_submitted.connect(func(t): q = t; refresh())
	le.text_changed.connect(_on_q)
	return le
func _on_q(t: String) -> void:
	q = t; _qtok += 1; var tok := _qtok
	var me: Variant = weakref(self)
	get_tree().create_timer(0.35).timeout.connect(func():
		var s = me.get_ref()   # the screen may have been rebuilt while the timer ran
		if s != null and tok == s._qtok and s.is_inside_tree(): s.refresh())
func _hay(parts: Array) -> String: return " ".join(parts.map(func(x): return str(x))).to_lower()

func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b
	if next_view != "": view = next_view; next_view = ""
	if app.learn_id != "": sel = app.learn_id; app.learn_id = ""; view = "list"
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := Kit.head_row(8); root.add_child(hd)
	if Layout.phone:   # search on its own row, three tabs sharing the next row
		hd.add_theme_constant_override("separation", 10)
		hd.add_child(_search_box(0.0))
		var tr := HBoxContainer.new(); tr.add_theme_constant_override("separation", 10); root.add_child(tr)
		for t in [["list", "Parts"], ["concepts", "101"], ["time", "Timeline"]]:
			var tb := Kit.btn(t[1], func(): view = t[0]; refresh(), "pri" if view == t[0] else "", 14); tb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; tr.add_child(tb)
	else:
		hd.add_child(Kit.label("CODEX", 26, Kit.CY)); hd.add_child(Kit.label("%d real parts" % b.items.size(), 13, Kit.DIM))
		var le := _search_box(300.0 if not Layout.compact else 180.0); le.size_flags_horizontal = Control.SIZE_FILL; hd.add_child(le)
		for t in [["list", "Parts encyclopedia"], ["concepts", "Datacenter 101"], ["time", "Accelerator timeline"]]: hd.add_child(Kit.btn(t[1], func(): view = t[0]; refresh(), "pri" if view == t[0] else "", 14))
	if view == "concepts":
		var col := Kit.column(root, 0, true); var p := Kit.panel("What is it, why do I need it, and do I need it right now?", true, col); ConceptsView.build(app, p[1], [], func(): refresh(), q)
	elif view == "time":
		var col := Kit.column(root, 0, true); var p := Kit.panel("Accelerator generations", false, col)
		var ql2 := q.to_lower()
		var accel: Array = b.items.values().filter(func(i): return i.kind == "accelerator" and (ql2 == "" or _hay([i.name, i.vendor, i.scaleUp, i.memType, " ".join(i.codex.get("tags", []))]).contains(ql2))); accel.sort_custom(func(a, c): return a.availableFrom < c.availableFrom)
		if accel.is_empty(): p[1].add_child(Kit.label("No accelerator matches “%s”." % q, 14, Kit.DIM, true))
		# a grid whose cards stretch to fill the row: no empty gutter on the right at any width
		var avail: float = app.vw() - (app.RAIL_W + 14.0 if Layout.phone else 28.0) - 90.0
		var fl := GridContainer.new(); fl.columns = maxi(1, int(avail / 230.0)); fl.add_theme_constant_override("h_separation", 10); fl.add_theme_constant_override("v_separation", 10); fl.size_flags_horizontal = Control.SIZE_EXPAND_FILL; p[1].add_child(fl)
		for a in accel:
			var card := PanelContainer.new(); var vc := Kit.vendor_color(a.vendor)
			card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			card.add_theme_stylebox_override("panel", Kit.sb(Kit.PANEL, Color(vc.r, vc.g, vc.b, 0.5), 8, 1, 10)); var v := VBoxContainer.new(); card.add_child(v)
			v.add_child(Kit.label(_when(float(a.availableFrom)), 12, Kit.DIM)); v.add_child(Kit.label(a.name, 14, Kit.legible(vc, Kit.PANEL) if Kit.dark else Kit.TX, true))   # vendor yellow on Paper is unreadable: the border carries the colour there
			v.add_child(Kit.label("%d GB · %s TB/s · %d W" % [int(a.memGB), Kit.num(a.memBWTBs, 1), int(a.tdpW)], 11, Kit.DIM)); v.add_child(Kit.label(str(a.scaleUp).to_upper(), 11, Kit.DIM))
			var bt := Button.new(); bt.flat = true; bt.set_anchors_preset(Control.PRESET_FULL_RECT); bt.focus_mode = Kit.focus_mode(); bt.pressed.connect(func(): sel = a.id; view = "list"; refresh()); card.add_child(bt); fl.add_child(card)
	else:
		var cols := Kit.cols_row(); root.add_child(cols)
		var lc := Kit.column(cols, 0, true, true); var dc := Kit.column(cols, 0, true, true); Kit.fit_split(cols, app, [1, 1])
		var inline := Layout.touch or Layout.compact   # one scrolling page: the detail opens under the entry, never far above it
		var ql := q.to_lower()
		var groups := {}
		for i in b.items.values():
			var hay := _hay([i.name, i.vendor, i.kind, KIND_LBL.get(i.kind, ""), " ".join(i.codex.get("tags", [])), i.codex.get("summary", "")])
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
				card.add_theme_stylebox_override("panel", Kit.sb(Kit.SEL if on else Kit.field(), Kit.CY if on else Kit.LINE, 8, 1, 12 if Layout.phone else 8)); card.custom_minimum_size.y = Layout.tap()
				var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 8); hb.mouse_filter = Control.MOUSE_FILTER_IGNORE; card.add_child(hb)
				var st := ColorRect.new(); st.color = Kit.vendor_color(str(i.vendor)); st.custom_minimum_size = Vector2(4, 0); st.mouse_filter = Control.MOUSE_FILTER_IGNORE; hb.add_child(st)
				var vb := VBoxContainer.new(); vb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; vb.mouse_filter = Control.MOUSE_FILTER_IGNORE; hb.add_child(vb)
				vb.add_child(Kit.label(i.name, 13, Kit.TX, true))
				var sm := Kit.label("%s · %s" % [i.vendor, str(i.codex.summary)], 11, Kit.DIM, true)   # whole words, two lines, then "…"
				sm.max_lines_visible = 2; sm.text_overrun_behavior = TextServer.OVERRUN_TRIM_WORD_ELLIPSIS; sm.custom_minimum_size.x = 120; vb.add_child(sm)
				var click := Button.new(); click.flat = true; click.set_anchors_preset(Control.PRESET_FULL_RECT); click.focus_mode = Kit.focus_mode(); click.pressed.connect(func(): sel = i.id; refresh()); card.add_child(click); card.move_child(click, 0)
				fp[1].add_child(card)
				if on and inline: _detail(fp[1], i)   # touch / narrow: the entry opens right under the tapped card, in view
		if sel != "" and b.items.has(sel) and not inline: _detail(dc, b.item(sel))
		else: _overview(dc, groups)

func _detail(parent: Control, it: Dictionary) -> void:
	var b: Bridge = app.b; var dp := Kit.panel(BK.ell(it.name, 40), true, parent)
	var rows := []; for s in Kit.specs_of(it): rows.append([Kit.label(s[0], 13, Kit.DIM), Kit.label(s[1], 13, Kit.TX, true)])
	dp[1].add_child(Kit.table([], rows)); Kit.codex_card(dp[1], it.codex)
	for v in b.vendors:
		if v.id == it.vendor: dp[1].add_child(Kit.label("Vendor: %s" % v.codex.summary, 13, Kit.DIM, true))

## What the right pane shows before a part is picked: how to use the Codex and a way into every category.
func _overview(parent: Control, groups: Dictionary) -> void:
	var b: Bridge = app.b
	var np := Kit.panel("The parts encyclopedia", false, parent)
	np[1].add_child(Kit.label("Pick a part. Every entry explains what it is, why it exists, and the tradeoffs you will face building with it. Search finds parts by name, vendor or technology (try “hbm”, “nvlink”, “liquid”).", 14, Kit.DIM, true))
	np[1].add_child(Kit.label("Open a category in the list %s to browse its parts (%d categories, %d parts)." % ["above" if Layout.phone else "on the left", groups.size(), groups.values().reduce(func(n, a): return n + a.size(), 0)], 13, Kit.TX, true))   # one way to browse: the accordion, so no second grid of the same categories
	var accel: Array = b.items.values().filter(func(i): return i.kind == "accelerator" and float(i.availableFrom) <= float(b.year())); accel.sort_custom(func(a, c): return a.availableFrom > c.availableFrom)
	if not accel.is_empty():
		var lp := Kit.panel("Newest accelerators you can buy", false, parent)
		for a in accel.slice(0, 5): lp[1].add_child(Kit.link("%s  ·  %s  ·  %d" % [a.name, str(a.vendor).to_upper() if str(a.vendor).length() <= 3 else str(a.vendor).capitalize(), int(a.availableFrom)], func(): sel = a.id; refresh(), 13))

func _when(y: float) -> String:
	return "%s %d" % [["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][clampi(int(round((y - floorf(y)) * 12.0)), 0, 11)], int(floorf(y))]
