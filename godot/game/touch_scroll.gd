class_name TouchScroll
extends Node
## Finger scrolling for lists on touch devices: drag from anywhere (cards, labels and buttons included), no scrollbars.
## Godot only scrolls when the drag starts on bare background; cards stop that, and buttons take the press.
## Cards are made pass-through, and a drag that starts on a button scrolls the list and cancels the press.

const THRESH := 14.0
var _cands: Array = []
var _start := Vector2.ZERO
var _on_btn := false
var _dragging := false
var _acc := Vector2.ZERO

func _ready() -> void:
	get_tree().node_added.connect(_added)

func _added(n: Node) -> void:
	if n is ScrollContainer:
		var sc := n as ScrollContainer
		if sc.vertical_scroll_mode == ScrollContainer.SCROLL_MODE_AUTO: sc.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
		if sc.horizontal_scroll_mode == ScrollContainer.SCROLL_MODE_AUTO: sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	elif n is PanelContainer or n is Panel or n is RichTextLabel:
		call_deferred("_soften", n)

func _soften(n: Control) -> void:
	if is_instance_valid(n) and n.mouse_filter == Control.MOUSE_FILTER_STOP and _in_scroll(n): n.mouse_filter = Control.MOUSE_FILTER_PASS

func _in_scroll(n: Node) -> bool:
	var p := n.get_parent()
	while p != null:
		if p is ScrollContainer: return true
		p = p.get_parent()
	return false

func _input(e: InputEvent) -> void:
	if e is InputEventScreenTouch:
		var t := e as InputEventScreenTouch
		if t.pressed and t.index == 0: _begin(t.position)
		else: _cands.clear(); _dragging = false     # released, or a second finger arrived (pinch is the hall's)
	elif e is InputEventScreenDrag and not _cands.is_empty():
		var d := e as InputEventScreenDrag
		if d.index != 0: return
		if not _dragging:
			if d.position.distance_to(_start) < THRESH: return
			_dragging = true; _acc = Vector2.ZERO
			if _on_btn:
				var rel := InputEventMouseButton.new(); rel.button_index = MOUSE_BUTTON_LEFT; rel.pressed = false; rel.position = Vector2(-9999, -9999); rel.global_position = rel.position
				Input.parse_input_event(rel)       # let go outside the button: it never counts as a tap
		_acc -= d.relative
		var dy := int(_acc.y); var dx := int(_acc.x)
		_acc -= Vector2(dx, dy)
		# the innermost list under the finger that can still move that way scrolls (the outer one takes over at the end)
		if dy != 0:
			for sc in _cands:
				if is_instance_valid(sc) and _can(sc, true, dy): sc.scroll_vertical += dy; break
		if dx != 0:
			for sc in _cands:
				if is_instance_valid(sc) and sc.horizontal_scroll_mode != ScrollContainer.SCROLL_MODE_DISABLED and _can(sc, false, dx): sc.scroll_horizontal += dx; break
		get_viewport().set_input_as_handled()

func _can(sc: ScrollContainer, vertical: bool, delta: int) -> bool:
	var bar: ScrollBar = sc.get_v_scroll_bar() if vertical else sc.get_h_scroll_bar()
	var room := bar.max_value - bar.page
	if room <= 1.0: return false
	return bar.value > 0.5 if delta < 0 else bar.value < room - 0.5

func _begin(p: Vector2) -> void:
	_cands.clear(); _on_btn = false; _dragging = false; _start = p
	var hit: Array = []
	for s in get_tree().root.find_children("*", "ScrollContainer", true, false):
		var sc := s as ScrollContainer
		if sc.is_visible_in_tree() and sc.get_global_rect().has_point(p) and not _covered(sc, p):
			var depth := 0; var q: Node = sc
			while q != null: depth += 1; q = q.get_parent()
			hit.append([depth, sc])
	hit.sort_custom(func(a, b): return a[0] > b[0])
	for h in hit: _cands.append(h[1])
	if _cands.is_empty(): return
	for bt in (_cands[0] as ScrollContainer).find_children("*", "BaseButton", true, false):
		var c := bt as Control
		if c.is_visible_in_tree() and c.get_global_rect().has_point(p): _on_btn = true; break

## True when something drawn later (a pop-up, a dimming layer) sits over this list at the touch point.
func _covered(sc: Control, p: Vector2) -> bool:
	var a: Node = sc
	while a != null and a.get_parent() != null:
		var par := a.get_parent()
		var after := false
		for s in par.get_children():
			if s == a: after = true; continue
			if after and s is Control and (s as Control).is_visible_in_tree() and (s as Control).mouse_filter != Control.MOUSE_FILTER_IGNORE and (s as Control).get_global_rect().has_point(p): return true
		a = par
	return false
