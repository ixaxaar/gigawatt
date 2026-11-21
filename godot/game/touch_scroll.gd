class_name TouchScroll
extends Node
## Finger scrolling for lists on touch devices: drag from anywhere (cards, labels and buttons included), no scrollbars,
## with kinetic scrolling (a flick keeps gliding and slows down; a new touch stops it).
## Godot only scrolls when the drag starts on bare background; cards stop that, and buttons take the press.
## Cards are made pass-through, and a drag that starts on a button scrolls the list and cancels the press.
## The same code handles a left-button MOUSE drag while the touch layout is on (phone layout forced on a desktop), so that
## layout is usable and testable with a mouse. With the mouse on the desktop layout this node is not even created.

const THRESH := 14.0             # finger travel (logical px) before a touch turns into a scroll
const SETTLE_MS := 350           # after the list stops, sounds / rebuilds keep holding off this long
const VEL_WINDOW_US := 100000    # release velocity = movement over the last 100 ms of the drag
const STALE_US := 60000          # the finger rested this long before lifting: no fling
const TAU := 0.36                # fling time constant (s): glide distance = speed x TAU
const V_MAX := 9000.0            # px/s cap on a fling
const V_MIN_START := 120.0       # slower than this on release: just stop
const V_STOP := 18.0             # the glide ends below this speed
const V_TAP_STOPS := 250.0       # a touch on a list gliding faster than this only stops it (no tap on what is underneath)

## True while a finger is scrolling a list, while the list glides, and for a moment after: sounds, screen rebuilds and auto-scrolls hold off until then.
static var _down := false
static var _down_ms := 0           # last time a finger was seen moving while _down: a lost release cannot hold rebuilds off for good
static var _gliding := false
static var _last_end := -100000
static func is_busy() -> bool:
	if _down and Time.get_ticks_msec() - _down_ms > 2500: _down = false   # no movement for a while and no release seen: the finger is gone
	return _down or _gliding or Time.get_ticks_msec() - _last_end < SETTLE_MS

var _cands: Array = []           # scroll areas under the finger, innermost first
var _start := Vector2.ZERO
var _last := Vector2.ZERO
var _t0 := 0
var _btn: BaseButton = null      # the button the finger went down on (its press is cancelled once the finger turns into a scroll)
var _pressing := false           # a finger (or the left mouse button) is down on a list
var _dragging := false
var _axis := Vector2.ONE         # axis lock picked when the drag starts (vertical, horizontal or both)
var _acc := Vector2.ZERO         # fractional scroll not applied yet (scroll offsets are whole pixels)
var _samples: Array = []         # [usec, position] over the last VEL_WINDOW_US
var _vel := Vector2.ZERO         # glide velocity in scroll units per second (positive = content moves up / scroll offset grows)
var _swallow := false            # this touch only stopped a glide: its press and release are not taps
var _finger_total := Vector2.ZERO
var _scrolled_total := Vector2.ZERO
var _glide_total := Vector2.ZERO
var _dbg := OS.has_environment("GW_SCROLLDBG")

func _ready() -> void:
	get_tree().node_added.connect(_added)
	set_process(false)

func _added(n: Node) -> void:
	if n is ScrollContainer:
		var sc := n as ScrollContainer
		if sc.vertical_scroll_mode == ScrollContainer.SCROLL_MODE_AUTO: sc.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
		if sc.horizontal_scroll_mode == ScrollContainer.SCROLL_MODE_AUTO: sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	elif n is PanelContainer or n is Panel or n is RichTextLabel:
		call_deferred("_soften", n)

func _soften(n) -> void:   # untyped: the node may be freed before the deferred call runs
	if is_instance_valid(n) and (n as Control).mouse_filter == Control.MOUSE_FILTER_STOP and _in_scroll(n) and not n.has_meta("own_drag"): (n as Control).mouse_filter = Control.MOUSE_FILTER_PASS

func _in_scroll(n: Node) -> bool:
	var p := n.get_parent()
	while p != null:
		if p is ScrollContainer: return true
		p = p.get_parent()
	return false

## Mouse drags scroll too while the touch layout is on (a phone layout forced on a desktop, a touchscreen laptop).
func _mouse_ok() -> bool:
	return Layout.touch

func _input(e: InputEvent) -> void:
	if e is InputEventMouse:
		var me := e as InputEventMouse
		if me.device == InputEvent.DEVICE_ID_EMULATION:   # a mouse event Godot made up from a touch: the touch itself drives scrolling
			if e is InputEventMouseButton and (e as InputEventMouseButton).button_index == MOUSE_BUTTON_LEFT:
				var mb := e as InputEventMouseButton
				if mb.pressed and _gliding and _vel.length() > V_TAP_STOPS: _swallow = true
				if _swallow: get_viewport().set_input_as_handled()   # touching a gliding list only stops it
				if not mb.pressed and _swallow and not _pressing: _swallow = false
			return
		if not _mouse_ok(): return
		if e is InputEventMouseButton:
			var mb := e as InputEventMouseButton
			if mb.button_index == MOUSE_BUTTON_WHEEL_UP or mb.button_index == MOUSE_BUTTON_WHEEL_DOWN: _stop_glide(); return
			if mb.button_index != MOUSE_BUTTON_LEFT or mb.position.x < -1000.0: return   # (the synthetic let-go that cancels a button press, at -9999 screen px)
			if mb.pressed:
				var stop_tap := _gliding and _vel.length() > V_TAP_STOPS
				_begin(mb.position)
				if stop_tap and not _cands.is_empty(): _swallow = true; get_viewport().set_input_as_handled()
			else:
				var sw := _swallow
				_end(mb.position)
				if sw: get_viewport().set_input_as_handled()
		elif e is InputEventMouseMotion and _pressing and ((e as InputEventMouseMotion).button_mask & MOUSE_BUTTON_MASK_LEFT):
			_move((e as InputEventMouseMotion).position)
		return
	if e is InputEventScreenTouch:
		var t := e as InputEventScreenTouch
		if t.index != 0:   # a second finger arrived (pinch is the hall's)
			if t.pressed: _cancel()
			return
		if t.pressed: _begin(t.position)
		else: _end(t.position)
	elif e is InputEventScreenDrag:
		var d := e as InputEventScreenDrag
		if d.index == 0 and _pressing: _move(d.position)

func _begin(p: Vector2) -> void:
	if OS.has_feature("debug"): print("TAP ", p, " top=", _top_at(p))
	_stop_glide(); _down = false   # a new touch starts clean: a stale flag from a lost release dies here
	_cands.clear(); _btn = null; _dragging = false; _pressing = false; _start = p; _last = p; _acc = Vector2.ZERO
	_finger_total = Vector2.ZERO; _scrolled_total = Vector2.ZERO
	_t0 = Time.get_ticks_usec(); _samples = [[_t0, p]]
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
	var top := _cands[0] as ScrollContainer
	# a finger on a slider, a text field or a control that drags by itself works that control instead of the list
	for ty in ["Slider", "SpinBox", "LineEdit", "TextEdit"]:
		for c in top.find_children("*", ty, true, false):
			if (c as Control).is_visible_in_tree() and (c as Control).get_global_rect().has_point(p): _cands.clear(); return
	for c in top.find_children("*", "Control", true, false):
		if c.has_meta("own_drag") and (c as Control).is_visible_in_tree() and (c as Control).get_global_rect().has_point(p): _cands.clear(); return
	for bt in top.find_children("*", "BaseButton", true, false):
		var c := bt as Control
		if c.is_visible_in_tree() and c.get_global_rect().has_point(p): _btn = bt as BaseButton; break
	_pressing = true

func _move(p: Vector2) -> void:
	if _cands.is_empty(): return
	var now := Time.get_ticks_usec(); _down_ms = Time.get_ticks_msec()
	_samples.append([now, p])
	while _samples.size() > 2 and now - int(_samples[0][0]) > VEL_WINDOW_US: _samples.pop_front()
	if not _dragging:
		if p.distance_to(_start) < THRESH: return
		_start_drag(p)
	var delta := p - _last; _last = p
	_apply_finger(delta)
	get_viewport().set_input_as_handled()

## The finger has moved far enough: this touch is a scroll. Everything since the press is applied (nothing below the threshold is lost).
func _start_drag(p: Vector2) -> void:
	_dragging = true; _down = true; _down_ms = Time.get_ticks_msec()
	var d := (p - _start).abs()
	_axis = Vector2(0, 1) if d.y > d.x * 1.6 else (Vector2(1, 0) if d.x > d.y * 1.6 else Vector2.ONE)
	_last = _start
	if is_instance_valid(_btn):
		# Godot's BaseButton remembers 'press started inside' and only mouse MOTION clears it, so a bare release elsewhere still
		# fires `pressed`. Disabling the button resets that state for sure; then the release is harmless.
		if not _btn.disabled: _btn.disabled = true; _btn.disabled = false
		var rel := InputEventMouseButton.new(); rel.button_index = MOUSE_BUTTON_LEFT; rel.pressed = false; rel.position = Vector2(-9999, -9999); rel.global_position = rel.position
		Input.parse_input_event(rel)       # let go outside the button: it never counts as a tap
	_btn = null

func _end(p: Vector2) -> void:
	var was_swallow := _swallow; _swallow = false
	_down = false   # any release clears it (the drag path below sets the settle timer itself)
	if not _pressing: _cands.clear(); return
	_pressing = false
	var now := Time.get_ticks_usec()
	if not _dragging and not was_swallow and p.distance_to(_start) >= THRESH:
		# the finger travelled far but the release came before any drag event crossed the threshold (fast flick, batched events)
		_start_drag(p)
	if _dragging:
		var delta := p - _last; _last = p
		if delta != Vector2.ZERO: _apply_finger(delta)
		_samples.append([now, p])
		_vel = _release_velocity(now) * _axis
		if _dbg: print("SCROLLDBG drag finger=(%.0f,%.0f) scrolled=(%.0f,%.0f) ms=%d v=(%.0f,%.0f)" % [_finger_total.x, _finger_total.y, _scrolled_total.x, _scrolled_total.y, (now - _t0) / 1000, _vel.x, _vel.y])
		_dragging = false
		if _vel.length() >= V_MIN_START: _gliding = true; _glide_total = Vector2.ZERO; set_process(true)
		else: _vel = Vector2.ZERO; _cands.clear()
		_down = false; _last_end = Time.get_ticks_msec()
	else:
		_cands.clear()
	if was_swallow: _down = false; _last_end = Time.get_ticks_msec()

func _cancel() -> void:
	if _dragging or _pressing: _last_end = Time.get_ticks_msec()
	_stop_glide(); _cands.clear(); _dragging = false; _pressing = false; _down = false

## Finger speed at release (content scroll units per second), from the last ~100 ms; zero if the finger rested before lifting.
func _release_velocity(now: int) -> Vector2:
	if _samples.size() < 2: return Vector2.ZERO
	var last: Array = _samples[_samples.size() - 1]
	var first: Array = _samples[0]
	for s in _samples:
		if now - int(s[0]) <= VEL_WINDOW_US: first = s; break
	var dt := float(int(last[0]) - int(first[0])) / 1000000.0
	# finger resting just before release: the newest real movement is stale
	var prev: Array = _samples[_samples.size() - 2]
	if (last[1] as Vector2).distance_to(prev[1]) < 1.0 and int(last[0]) - int(prev[0]) > STALE_US: return Vector2.ZERO
	if dt < 0.008: dt = 0.008
	var v := -((last[1] as Vector2) - (first[1] as Vector2)) / dt
	return v.limit_length(V_MAX)

## Move the lists by the finger's motion (content follows the finger 1:1).
func _apply_finger(delta: Vector2) -> void:
	_finger_total += delta * _axis
	_scrolled_total += _scroll_by(-delta * _axis)

## Scroll the innermost list under the finger that can still move that way; what it cannot take goes to the next one out.
## Returns the distance actually scrolled.
func _scroll_by(d: Vector2) -> Vector2:
	_acc += d
	var want := Vector2(int(_acc.x), int(_acc.y))
	_acc -= want
	var done := Vector2.ZERO
	if want.y != 0.0:
		var left := int(want.y)
		for sc in _cands:
			if left == 0: break
			if not is_instance_valid(sc) or not (sc as ScrollContainer).is_visible_in_tree() or (sc as ScrollContainer).vertical_scroll_mode == ScrollContainer.SCROLL_MODE_DISABLED: continue
			var moved := _push(sc, true, left); left -= moved; done.y += moved
	if want.x != 0.0:
		var left := int(want.x)
		for sc in _cands:
			if left == 0: break
			if not is_instance_valid(sc) or not (sc as ScrollContainer).is_visible_in_tree() or (sc as ScrollContainer).horizontal_scroll_mode == ScrollContainer.SCROLL_MODE_DISABLED: continue
			var moved := _push(sc, false, left); left -= moved; done.x += moved
	return done

func _push(sc: ScrollContainer, vertical: bool, delta: int) -> int:
	var bar: ScrollBar = sc.get_v_scroll_bar() if vertical else sc.get_h_scroll_bar()
	var room := int(maxf(0.0, bar.max_value - bar.page))
	var cur := sc.scroll_vertical if vertical else sc.scroll_horizontal
	var nxt := clampi(cur + delta, 0, room)
	if nxt == cur: return 0
	if vertical: sc.scroll_vertical = nxt
	else: sc.scroll_horizontal = nxt
	return nxt - cur

func _process(dt: float) -> void:
	if not _gliding: set_process(false); return
	dt = minf(dt, 0.05)
	var k := exp(-dt / TAU)
	# exact integral of an exponentially decaying speed over this frame: frame-rate independent
	var step := _vel * TAU * (1.0 - k)
	_vel *= k
	var moved := _scroll_by(step)
	_glide_total += moved
	if moved.y == 0.0 and absf(step.y) >= 1.0: _vel.y = 0.0   # hit the end: stop, no bounce
	if moved.x == 0.0 and absf(step.x) >= 1.0: _vel.x = 0.0
	if _vel.length() < V_STOP: _stop_glide()

func _stop_glide() -> void:
	if not _gliding: return
	if _dbg: print("SCROLLDBG glide=(%.0f,%.0f)" % [_glide_total.x, _glide_total.y])
	_gliding = false; _vel = Vector2.ZERO; _acc = Vector2.ZERO; set_process(false)
	if not _pressing: _cands.clear()
	_last_end = Time.get_ticks_msec()

## Debug builds only: say which control sits on top at a touch (for chasing "my tap did nothing" reports).
func _top_at(p: Vector2) -> String:
	var best: Control = null; var best_key := -1.0; var i := 0
	var stack := [get_tree().root]
	while not stack.is_empty():
		var n: Node = stack.pop_back()
		i += 1
		if n is Control and (n as Control).is_visible_in_tree() and (n as Control).mouse_filter != Control.MOUSE_FILTER_IGNORE and (n as Control).get_global_rect().has_point(p):
			var key := float((n as Control).z_index) * 1000000.0 + float(i)
			if key >= best_key: best = n; best_key = key
		var kids := n.get_children(); kids.reverse(); stack.append_array(kids)
	return str(best.get_path()) + " (" + best.get_class() + ")" if best != null else "none"

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
