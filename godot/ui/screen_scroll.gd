class_name ScreenScroll
extends ScrollContainer
## Touch layouts: every drawer screen sits in one of these, so a screen taller or wider than the drawer scrolls by finger
## instead of being cut off. Sizes the screen to its content's minimum (the screens are plain Controls with anchored children).
var content: Control
var app:
	set(v): app = v; if content: content.app = v
var _t := 0.0

func _init(c: Control) -> void:
	content = c; follow_focus = false; horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO; vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL; c.size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_child(c)
	c.child_entered_tree.connect(_on_child)

func refresh() -> void:
	if content.has_method("refresh"): content.refresh()
	_fit()

func _process(d: float) -> void:
	_t += d
	if _t > 0.15 and is_visible_in_tree(): _t = 0.0; _fit()

func _fit() -> void:
	var mn := Vector2.ZERO
	for ch in content.get_children():
		var c := ch as Control
		if c != null and c.visible: mn = mn.max(c.get_combined_minimum_size())
	if mn != content.custom_minimum_size: content.custom_minimum_size = mn

## A screen rebuild swaps its children; hold the scroll position through it (no jump to the top and back).
var _held := Vector2(-1, -1)
func _on_child(_n: Node) -> void:
	if _held.x >= 0.0: return
	_held = Vector2(scroll_horizontal, scroll_vertical); call_deferred("_reapply", 0)

func _reapply(pass_n: int) -> void:
	if _held.x < 0.0 or not is_inside_tree(): _held = Vector2(-1, -1); return
	var vb := get_v_scroll_bar(); var hb := get_h_scroll_bar()
	vb.max_value = maxf(vb.max_value, _held.y + 6000.0); hb.max_value = maxf(hb.max_value, _held.x + 6000.0)
	scroll_vertical = int(_held.y); scroll_horizontal = int(_held.x)
	if pass_n < 3:
		await get_tree().process_frame
		_reapply(pass_n + 1)
	else: _held = Vector2(-1, -1)
