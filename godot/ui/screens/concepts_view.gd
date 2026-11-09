class_name ConceptsView
## "Datacenter 101": every concept with a live "do I need this right now?" verdict.
static var open_id := ""
static var folds := {}
static func _col() -> Dictionary: return {"now": Kit.RD, "soon": Kit.AM, "ok": Kit.GR, "na": Kit.DIM}
const LBL := {"now": "YOU NEED THIS NOW", "soon": "COMING UP", "ok": "COVERED", "na": "NOT YET"}

static func build(app, parent: Control, only: Array = [], on_toggle: Callable = Callable()) -> void:
	var list: Array = app.b.q("concepts").filter(func(c): return only.is_empty() or only.has(c.id))
	var rank := {"now": 0, "soon": 1, "ok": 2, "na": 3}
	list.sort_custom(func(a, b): return rank[a.status.level] < rank[b.status.level])
	var cur_level := ""; var host: Control = parent
	for c in list:
		if only.is_empty() and c.status.level != cur_level:
			cur_level = c.status.level; var n := list.filter(func(x): return x.status.level == cur_level).size()
			var fp := Kit.fold_panel("%s  (%d)" % [LBL[cur_level], n], "lv_" + cur_level, folds, on_toggle if on_toggle.is_valid() else func(): pass, cur_level == "now", parent, cur_level != "now" and cur_level != "soon")
			host = fp[1]
		var col: Color = _col()[c.status.level]
		var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", Kit.sb(Kit.field(), col if c.status.level == "now" else Kit.LINE, 8, 1, 9)); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL; host.add_child(p)
		var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 4); p.add_child(v)
		var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 8); v.add_child(h)
		var nm := VBoxContainer.new(); nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL; h.add_child(nm)
		nm.add_child(Kit.label(c.name, 14, Kit.TX, true)); nm.add_child(Kit.label(c.status.text, 12, col, true))
		h.add_child(Kit.tag(LBL[c.status.level], col))
		var click := Button.new(); click.flat = true; click.set_anchors_preset(Control.PRESET_FULL_RECT); click.focus_mode = Kit.focus_mode()
		click.pressed.connect(func(): open_id = "" if open_id == c.id else c.id; if on_toggle.is_valid(): on_toggle.call()); p.add_child(click); p.move_child(click, 0)
		for n in [v, h, nm]: n.mouse_filter = Control.MOUSE_FILTER_IGNORE
		if open_id == c.id:
			v.add_child(Kit.rich("[b]What it is:[/b] %s\n[b]Why you care:[/b] %s\n[b]When you need it:[/b] %s" % [c.what, c.why, c.when], 12))
			if c.get("go") != null:
				var here: bool = c.go == app.cur
				v.add_child(Kit.btn("Show me where ↓" if here else "Take me there →", func():
					if here:
						var scr = app.screens.get(app.cur)
						if scr != null and scr.has_method("focus_concept"): scr.focus_concept(c.id)
						else: app.toast("You are already on the right screen.")
					else: app.go(c.go), "", 12))
