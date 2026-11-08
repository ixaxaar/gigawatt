class_name WrapGuard
extends Node
## Drawers can be dragged narrow. Any label or button inside a scrolling screen whose text is wider than the screen's
## visible width wraps to that width (so nothing is cut off at the right edge); the rest keep their natural size.
## A wrapping control always gets an explicit minimum width, so a row can never squeeze it into a thin tall sliver.

func _ready() -> void:
	get_tree().node_added.connect(func(n: Node): if n is Label or (n is Button and not n is OptionButton): call_deferred("_fit", n))

func _fit(c: Control) -> void:
	if not is_instance_valid(c) or not c.is_inside_tree(): return
	var sc: ScrollContainer = null; var p: Node = c.get_parent()
	while p != null:
		if p is ScrollContainer and (p as Control).size.x > 100.0: sc = p
		p = p.get_parent()
	if sc == null: return
	var avail := maxf(160.0, sc.size.x - 130.0)
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
