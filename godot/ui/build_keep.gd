extends RefCounted
## Helpers shared by the build-side screens (Design Lab, Supercomputer, Build, Supply, Warehouse, Codex, Datacenter 101).
## Preloaded (no class_name): `const BK := preload("res://ui/build_keep.gd")`.

## Shorten to at most `n` characters at a word boundary, with an ellipsis (never "(64x400" or "PCIe Ge").
static func ell(s, n: int) -> String:
	var t := str(s).strip_edges()
	if n <= 1 or t.length() <= n: return t
	var cut := t.left(n - 1)
	var sp := maxi(cut.rfind(" "), cut.rfind("-"))
	if sp > int(n * 0.5): cut = cut.left(sp)
	while cut.length() > 0 and " ·,-(/:;".contains(cut[cut.length() - 1]): cut = cut.left(cut.length() - 1)
	return cut + "…"

## A dropdown that never forces its container wider than the screen: it clips its own text instead of sizing to its longest item.
static func slim(o: OptionButton, min_w := 120.0) -> OptionButton:
	o.fit_to_longest_item = false; o.clip_text = true; o.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	o.custom_minimum_size.x = min_w; o.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return o

## A list button whose text wraps at word boundaries instead of widening the column (part pickers, rack palettes).
static func wrap_btn(b: Button) -> Button:
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; b.alignment = HORIZONTAL_ALIGNMENT_LEFT; b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.custom_minimum_size.x = 0.0
	return b

## A label that stays on one line and ends in "…" when its column is too narrow (long design / cluster names).
static func one_line(l: Label) -> Label:
	l.autowrap_mode = TextServer.AUTOWRAP_OFF; l.clip_text = true; l.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL; l.custom_minimum_size.x = 40.0
	return l

## Debounce an action: true the first time, false again for `ms` after (a fast double click on ORDER must not order twice,
## and the screen rebuilds after the first press, so a guard on the button itself would be lost).
static var _gate := {}
static func gate(key: String, ms := 1000) -> bool:
	var now := Time.get_ticks_msec()
	if now - int(_gate.get(key, -100000)) < ms: return false
	_gate[key] = now; return true

## The control (inside `node`) that has keyboard / controller focus and carries a "key" meta, or null.
static func focused(node: Control) -> Control:
	if not node.is_inside_tree(): return null
	var f := node.get_viewport().gui_get_focus_owner()
	if f == null or not node.is_ancestor_of(f) or not f.has_meta("key"): return null
	return f

## Rebuild a screen without making it jump: scroll positions are kept (Kit.rebuild_keep), the focused text field / board keeps
## focus and caret, and an automatic refresh (the month ticking over) while the player is typing waits until the field is left.
static func refresh(node: Control, app, rebuild: Callable) -> void:
	var f := focused(node)
	if f is LineEdit and app != null and Time.get_ticks_msec() - int(app.get("_last_input")) > 700:
		if not f.has_meta("held"):
			f.set_meta("held", true)
			f.focus_exited.connect(func():
				if is_instance_valid(f): f.remove_meta("held")
				if is_instance_valid(node) and node.is_inside_tree(): node.call_deferred("refresh"), CONNECT_ONE_SHOT)
		return
	var key := str(f.get_meta("key")) if f != null else ""
	var caret := (f as LineEdit).caret_column if f is LineEdit else -1
	Kit.rebuild_keep(node, rebuild)
	if key == "": return
	for n in node.find_children("*", "Control", true, false):
		if str(n.get_meta("key", "")) != key or not n.is_visible_in_tree() or _dying(n, node): continue
		n.grab_focus()
		if n is LineEdit and caret >= 0: (n as LineEdit).caret_column = caret
		break

## True when `n` or a parent below `top` is about to be freed (the old copy of a rebuilt screen).
static func _dying(n: Node, top: Node) -> bool:
	var p := n
	while p != null and p != top:
		if p.is_queued_for_deletion(): return true
		p = p.get_parent()
	return false
