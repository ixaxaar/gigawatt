class_name TouchScroll
extends Node
## Finger scrolling for lists on touch devices: drag from anywhere (cards, labels and buttons included), no scrollbars.
## Godot only scrolls when the drag starts on bare background; cards stop that, and buttons take the press.
## Cards are made pass-through, and a drag that starts on a button scrolls the list and cancels the press.

const THRESH := 14.0
var _sc: ScrollContainer
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
		else: _sc = null; _dragging = false     # released, or a second finger arrived (pinch is the hall's)
	elif e is InputEventScreenDrag and _sc != null and _on_btn:
		var d := e as InputEventScreenDrag
		if d.index != 0: return
		if not _dragging:
			if d.position.distance_to(_start) < THRESH: return
			_dragging = true; _acc = Vector2.ZERO
			var rel := InputEventMouseButton.new(); rel.button_index = MOUSE_BUTTON_LEFT; rel.pressed = false; rel.position = Vector2(-9999, -9999); rel.global_position = rel.position
			Input.parse_input_event(rel)       # let go outside the button: it never counts as a tap
		_acc -= d.relative
		var dy := int(_acc.y); var dx := int(_acc.x)
		_acc -= Vector2(dx, dy)
		if dy != 0: _sc.scroll_vertical += dy
		if dx != 0 and _sc.horizontal_scroll_mode != ScrollContainer.SCROLL_MODE_DISABLED: _sc.scroll_horizontal += dx
		get_viewport().set_input_as_handled()

func _begin(p: Vector2) -> void:
	_sc = null; _on_btn = false; _dragging = false; _start = p
	var best: ScrollContainer = null
	for s in get_tree().root.find_children("*", "ScrollContainer", true, false):
		var sc := s as ScrollContainer
		if sc.is_visible_in_tree() and sc.get_global_rect().has_point(p): best = sc    # later (deeper) ones win
	if best == null: return
	_sc = best
	for bt in best.find_children("*", "BaseButton", true, false):
		var c := bt as Control
		if c.is_visible_in_tree() and c.get_global_rect().has_point(p): _on_btn = true; break
