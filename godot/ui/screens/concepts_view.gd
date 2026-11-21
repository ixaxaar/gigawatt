class_name ConceptsView
## "Datacenter 101": every concept with a live "do I need this right now?" verdict.
static var open_id := ""
static var folds := {}
static func _col() -> Dictionary: return {"now": Kit.RD, "soon": Kit.AM, "ok": Kit.GR, "na": Kit.DIM}
const LBL := {"now": "YOU NEED THIS NOW", "soon": "COMING UP", "ok": "COVERED", "na": "NOT YET"}

static func build(app, parent: Control, only: Array = [], on_toggle: Callable = Callable(), query := "") -> void:
	var ql := query.strip_edges().to_lower()
	var list: Array = app.b.q("concepts").filter(func(c): return (only.is_empty() or only.has(c.id)) and (ql == "" or ("%s %s %s" % [c.name, c.get("what", ""), c.get("why", "")]).to_lower().contains(ql)))
	if list.is_empty() and ql != "": parent.add_child(Kit.label("No concept matches “%s”." % query, 14, Kit.DIM, true)); return
	var rank := {"now": 0, "soon": 1, "ok": 2, "na": 3}
	list.sort_custom(func(a, b): return rank[a.status.level] < rank[b.status.level])
	var cur_level := ""; var host: Control = parent
	for c in list:
		if only.is_empty() and c.status.level != cur_level:
			cur_level = c.status.level; var n := list.filter(func(x): return x.status.level == cur_level).size()
			var fp := Kit.fold_panel("%s  (%d)" % [LBL[cur_level], n], "lv_" + cur_level, folds, on_toggle if on_toggle.is_valid() else func(): pass, cur_level == "now", parent, cur_level != "now" and cur_level != "soon" and ql == "")
			host = fp[1]
		var col: Color = _col()[c.status.level]
		var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", Kit.sb(Kit.field(), col if c.status.level == "now" else Kit.LINE, 8, 1, 12 if Layout.phone else 9)); p.custom_minimum_size.y = Layout.tap(); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL; host.add_child(p)
		var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 4); p.add_child(v)
		var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 8); v.add_child(h)
		var nm := VBoxContainer.new(); nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL; h.add_child(nm)
		var stx := str(c.status.text); var empty_hall := false   # "Cooling 600 kW covers 0 kW" is true but reads as nonsense on a hall with no load yet
		var rx := RegEx.create_from_string("^(\\w+) (\\d+) kW covers 0 kW\\.?$"); var mm := rx.search(stx)
		if mm != null and c.status.level == "ok": stx = "%s kW installed · no load yet." % mm.get_string(2); empty_hall = true
		nm.add_child(Kit.label(c.name, 14, Kit.TX, true)); if not Layout.phone or open_id == c.id or c.status.level == "now": nm.add_child(Kit.label(stx, 12, Kit.DIM if empty_hall else col, true))
		if not Layout.phone or c.status.level == "now": h.add_child(Kit.tag("NO LOAD YET" if empty_hall else LBL[c.status.level], Kit.DIM if empty_hall else col))
		var click := Button.new(); click.flat = true; click.set_anchors_preset(Control.PRESET_FULL_RECT); click.focus_mode = Kit.focus_mode()
		click.pressed.connect(func(): open_id = "" if open_id == c.id else c.id; if on_toggle.is_valid(): on_toggle.call()); p.add_child(click); p.move_child(click, 0)
		for n in [v, h, nm]: n.mouse_filter = Control.MOUSE_FILTER_IGNORE
		if open_id == c.id:
			if Layout.phone: v.add_child(Kit.rich("[b]What it is:[/b] %s\n[b]Why you care:[/b] %s" % [c.what, c.why], 13))
			else: v.add_child(Kit.rich("[b]What it is:[/b] %s\n[b]Why you care:[/b] %s\n[b]When you need it:[/b] %s" % [c.what, c.why, c.when], 12))
			if c.get("go") != null:
				var here: bool = c.go == app.cur
				v.add_child(Kit.btn("Show me where ↓" if here else "Take me there →", func():
					if here:
						var scr = app.screens.get(app.cur)
						if scr != null and scr.has_method("focus_concept"): scr.focus_concept(c.id)
						else: app.toast("You are already on the right screen.")
					else: app.go(c.go), "", 12))
