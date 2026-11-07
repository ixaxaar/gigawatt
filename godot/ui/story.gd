class_name StoryOverlay
extends Control
## The story layer: a chapter card every January and, now and then, a two-way decision.
## Content comes from the engine (query "story"); answers go back through ackStory / resolveDilemma.
var app

func _frame(accent: Color, width: float, height: float) -> VBoxContainer:
	for c in get_children(): c.queue_free()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter = Control.MOUSE_FILTER_STOP; visible = true
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.74); dim.set_anchors_preset(Control.PRESET_FULL_RECT); add_child(dim)
	var pc := PanelContainer.new(); pc.set_anchors_preset(Control.PRESET_CENTER)
	pc.offset_left = -width / 2.0; pc.offset_right = width / 2.0; pc.offset_top = -height / 2.0; pc.offset_bottom = height / 2.0
	pc.grow_vertical = Control.GROW_DIRECTION_BOTH
	pc.add_theme_stylebox_override("panel", Kit.card_sb(accent, Kit.BG, 3, 28)); add_child(pc)
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 14); pc.add_child(v)
	return v

func open_chapter(c: Dictionary) -> void:
	var v := _frame(Kit.CY, 760.0, 420.0)
	v.add_child(Kit.chip("CHAPTER · JANUARY %d" % int(c.year), Kit.CY, 13))
	v.add_child(Kit.label(str(c.title), 44, Kit.TX, true))
	v.add_child(Kit.label(str(c.text), 19, Kit.DIM, true))
	var sp := Control.new(); sp.size_flags_vertical = Control.SIZE_EXPAND_FILL; v.add_child(sp)
	var go := Kit.btn("Into %d  ▶" % int(c.year), func(): _close_chapter(), "go", 19); go.custom_minimum_size = Vector2(0, 54); v.add_child(go)
	go.grab_focus()

func _close_chapter() -> void:
	visible = false; app.b.act("ackStory"); app.check_story()

func open_dilemma(d: Dictionary) -> void:
	var v := _frame(Color("#ff3d8b"), 820.0, 0.0)
	var hd := HBoxContainer.new(); hd.add_theme_constant_override("separation", 12); v.add_child(hd)
	hd.add_child(Kit.chip("DECISION", Kit.AM, 13))
	var spc := Control.new(); spc.size_flags_horizontal = Control.SIZE_EXPAND_FILL; hd.add_child(spc)
	hd.add_child(Kit.label("answer within %d month%s" % [int(d.monthsLeft), "" if int(d.monthsLeft) == 1 else "s"], 12, Kit.DIM))
	v.add_child(Kit.label(str(d.title), 34, Kit.TX, true))
	v.add_child(Kit.label(str(d.text), 18, Kit.DIM, true))
	var row := HBoxContainer.new(); row.add_theme_constant_override("separation", 14); v.add_child(row)
	for ch in d.choices:
		var hint := PackedStringArray()
		if int(ch.cash) != 0: hint.append(("+" if int(ch.cash) > 0 else "") + Kit.usd(float(ch.cash)))
		if int(ch.rep) != 0: hint.append(("+" if int(ch.rep) > 0 else "") + "%d rep" % int(ch.rep))
		var bt := Kit.btn("%s\n%s" % [str(ch.label), "  ·  ".join(hint)], func(): _choose(int(ch.index)), "go" if int(ch.index) == 0 else "pri", 18)
		bt.custom_minimum_size = Vector2(0, 72); bt.size_flags_horizontal = Control.SIZE_EXPAND_FILL; row.add_child(bt)
	var later := Kit.btn("Decide later", func(): _later(str(d.id)), "", 14); later.custom_minimum_size = Vector2(0, 40); v.add_child(later)

func _choose(i: int) -> void:
	var r: Dictionary = app.b.act("resolveDilemma", [i])
	if not r.get("ok", false): app.toast(str(r.get("message", "Could not do that.")), "bad"); return
	visible = false; app.toast(str(r.get("message", "")), "good"); app.check_story()

func _later(id: String) -> void:
	visible = false; app.dilemma_dismissed = id
