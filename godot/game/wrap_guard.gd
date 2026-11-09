class_name WrapGuard
extends Node
## Drawers can be dragged narrow. Any label or button inside a scrolling screen whose text is wider than the screen's
## visible width wraps to that width (so nothing is cut off at the right edge); the rest keep their natural size.
## A wrapping control always gets an explicit minimum width, so a row can never squeeze it into a thin tall sliver.

func _ready() -> void:
	get_tree().node_added.connect(func(n: Node): if n is Label or (n is Button and not n is OptionButton): call_deferred("_fit", n))

## A row of buttons wider than the screen becomes a flowing row that wraps onto more lines.
func _flowify(row: HBoxContainer, avail: float) -> void:
	if row.get_class() != "HBoxContainer" or row.get_minimum_size().x <= avail: return
	for k in row.get_children():
		if not (k is BaseButton) or k is OptionButton or (k as Control).size_flags_horizontal & Control.SIZE_EXPAND: return
	var par := row.get_parent()
	if par == null: return
	var fl := HFlowContainer.new(); var sep := row.get_theme_constant("separation")
	fl.add_theme_constant_override("h_separation", sep); fl.add_theme_constant_override("v_separation", 6)
	fl.size_flags_horizontal = row.size_flags_horizontal
	var idx := row.get_index()
	for k in row.get_children(): row.remove_child(k); fl.add_child(k)
	par.add_child(fl); par.move_child(fl, idx); par.remove_child(row); row.queue_free()

## A table row wider than the screen sits in its own sideways scroller, so it cannot stretch the whole screen.
func _wide(row: Container, avail: float) -> void:
	if not (row.get_class() in ["HBoxContainer", "GridContainer"]) or row.get_parent() == null or row.get_parent() is ScrollContainer: return
	if row.get_minimum_size().x <= avail: return
	var par := row.get_parent(); var idx := row.get_index()
	var sc := ScrollContainer.new(); sc.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sc.custom_minimum_size.y = row.get_minimum_size().y
	par.remove_child(row); sc.add_child(row); par.add_child(sc); par.move_child(sc, idx)

func _fit(c) -> void:   # untyped: the control may already be freed when the deferred call runs
	if not is_instance_valid(c) or not c.is_inside_tree(): return
	var sc: ScrollContainer = null; var p: Node = c.get_parent()
	while p != null:
		if p is ScrollContainer and (p as Control).size.x > 100.0: sc = p
		p = p.get_parent()
	if sc == null: return
	var avail := maxf(160.0, sc.size.x - 130.0)
	if c.get_parent() is HBoxContainer:
		var row := c.get_parent() as HBoxContainer
		if c is Button: _flowify(row, sc.size.x - 90.0)
		if is_instance_valid(row) and row.get_parent() != null and row.get_class() == "HBoxContainer": _wide(row, sc.size.x - 90.0)
	elif c.get_parent() is GridContainer: _wide(c.get_parent() as Container, sc.size.x - 90.0)
	if not is_instance_valid(c) or not c.is_inside_tree(): return
	if c is Label:
		var l := c as Label
		if l.autowrap_mode != TextServer.AUTOWRAP_OFF or l.clip_text: return
		if l.get_minimum_size().x <= avail: return
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; l.custom_minimum_size.x = avail
	else:
		var b := c as Button
		if b.autowrap_mode != TextServer.AUTOWRAP_OFF or b.clip_text or b.text == "": return
		if b.get_minimum_size().x <= avail: return
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; b.custom_minimum_size.x = avail
