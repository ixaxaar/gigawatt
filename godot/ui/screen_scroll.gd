class_name ScreenScroll
extends ScrollContainer
## Touch layouts: every drawer screen sits in one of these, so a screen taller or wider than the drawer scrolls by finger
## instead of being cut off. Sizes the screen to its content's minimum (the screens are plain Controls with anchored children),
## plus room at the bottom so the last card clears the screen edge, and draws a scroll cue (scrollbars are hidden on touch).
var content: Control
var app:
	set(v): app = v; if content: content.app = v
var _t := 0.0
var _cue: ScrollCue

func _init(c: Control) -> void:
	content = c; follow_focus = false; horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO; vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL; c.size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_child(c)
	c.child_entered_tree.connect(_on_child)
	_cue = ScrollCue.new(); _cue.sc = self; add_child(_cue)
	get_v_scroll_bar().value_changed.connect(func(_v): _cue.queue_redraw())
	get_v_scroll_bar().changed.connect(func(): _cue.queue_redraw())

func refresh() -> void:
	if content.has_method("refresh"): content.refresh()
	_fit()

func _process(d: float) -> void:
	_t += d
	if not is_visible_in_tree(): return
	var r := get_global_rect()
	if r != _cue.rect: _cue.rect = r; _cue.global_position = r.position; _cue.size = r.size; _cue.queue_redraw()   # follows the drawer as it slides / resizes
	if _t > 0.15: _t = 0.0; _fit()

func _fit() -> void:
	var mn := Vector2.ZERO
	for ch in content.get_children():
		var c := ch as Control
		if c == null or not c.visible: continue
		# an anchored screen is inset by its offsets (18 px sides, 14 px top/bottom): count them, or its last row is cut off
		var m := c.get_combined_minimum_size()
		if c.anchor_right >= 1.0 and c.anchor_left <= 0.0: m.x += maxf(0.0, c.offset_left) + maxf(0.0, -c.offset_right)
		if c.anchor_bottom >= 1.0 and c.anchor_top <= 0.0: m.y += maxf(0.0, c.offset_top) + maxf(0.0, -c.offset_bottom)
		mn = mn.max(m)
	if mn.y > 0.0: mn.y += Kit.end_pad()   # the end of the page is visibly the end, never cut by the screen edge or the dock
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

## Thin position bar on the right edge and soft fades at the top / bottom when there is more to see.
## Drawn over the page (top-level, so the scroll container does not lay it out), redrawn only when the scroll position or size changes.
class ScrollCue extends Control:
	var sc: ScrollContainer
	var rect := Rect2()
	func _init() -> void:
		top_level = true; mouse_filter = Control.MOUSE_FILTER_IGNORE; z_index = 1
	func _draw() -> void:
		if sc == null or not is_instance_valid(sc): return
		var bar := sc.get_v_scroll_bar()
		var total := bar.max_value; var page := bar.page
		if total <= page + 2.0 or page <= 0.0: return
		var top := sc.scroll_vertical; var room := total - page
		var fade := 22.0
		var bg := Kit.deep(1.0)
		if top > 2:
			draw_polygon(PackedVector2Array([Vector2(0, 0), Vector2(size.x, 0), Vector2(size.x, fade), Vector2(0, fade)]), PackedColorArray([bg, bg, Color(bg.r, bg.g, bg.b, 0.0), Color(bg.r, bg.g, bg.b, 0.0)]))
		if top < room - 2:
			draw_polygon(PackedVector2Array([Vector2(0, size.y - fade), Vector2(size.x, size.y - fade), Vector2(size.x, size.y), Vector2(0, size.y)]), PackedColorArray([Color(bg.r, bg.g, bg.b, 0.0), Color(bg.r, bg.g, bg.b, 0.0), bg, bg]))
		var h := maxf(28.0, size.y * page / total)
		var y := (size.y - h) * clampf(top / maxf(1.0, room), 0.0, 1.0)
		var c := Kit.legible(Kit.DIM, bg, 3.0)
		draw_rect(Rect2(size.x - 5.0, y + 2.0, 3.0, h - 4.0), Color(c.r, c.g, c.b, 0.55))
