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
