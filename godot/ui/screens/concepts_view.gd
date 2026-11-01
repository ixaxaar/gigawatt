class_name ConceptsView
## "Datacenter 101": every concept with a live "do I need this right now?" verdict.
static var open_id := ""
const COL := {"now": Kit.RD, "soon": Kit.AM, "ok": Kit.GR, "na": Kit.DIM}
const LBL := {"now": "YOU NEED THIS NOW", "soon": "COMING UP", "ok": "COVERED", "na": "NOT YET"}

static func build(app, parent: Control, only: Array = [], on_toggle: Callable = Callable()) -> void:
	var list: Array = app.b.q("concepts").filter(func(c): return only.is_empty() or only.has(c.id))
	var rank := {"now": 0, "soon": 1, "ok": 2, "na": 3}
	list.sort_custom(func(a, b): return rank[a.status.level] < rank[b.status.level])
	for c in list:
		var col: Color = COL[c.status.level]
		var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", Kit.sb(Color(0.05, 0.08, 0.11), col if c.status.level == "now" else Kit.LINE, 8, 1, 9)); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL; parent.add_child(p)
		var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 4); p.add_child(v)
		var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 8); v.add_child(h)
		var nm := VBoxContainer.new(); nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL; h.add_child(nm)
		nm.add_child(Kit.label(c.name, 14, Kit.TX, true)); nm.add_child(Kit.label(c.status.text, 12, col, true))
		h.add_child(Kit.tag(LBL[c.status.level], col))
		var click := Button.new(); click.flat = true; click.set_anchors_preset(Control.PRESET_FULL_RECT); click.focus_mode = Control.FOCUS_NONE
		click.pressed.connect(func(): open_id = "" if open_id == c.id else c.id; if on_toggle.is_valid(): on_toggle.call()); p.add_child(click)
		if open_id == c.id:
			v.add_child(Kit.rich("[b]What it is:[/b] %s\n[b]Why you care:[/b] %s\n[b]When you need it:[/b] %s" % [c.what, c.why, c.when], 12))
			if c.get("go") != null: v.add_child(Kit.btn("Take me there →", func(): app.go(c.go), "", 12))
