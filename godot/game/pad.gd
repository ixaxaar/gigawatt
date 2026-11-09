class_name Pad
extends Node
## Gamepad / Steam Deck support. The UI is mouse-first, so this layer adds:
##   - a pad mode (switches on at the first pad input, off at the first mouse/key input) in which every button is focusable
##   - D-pad navigation (Godot's ui_* actions; stick motion is removed from them so the sticks can drive the camera)
##   - sticks + triggers for the hall camera, a reticle + X to inspect the rack under it
##   - shoulder buttons for drawers, B to back out, Start for the menu, View/Back for game speed
## Layout:  A select · B back · X inspect rack · Y next month · LB/RB drawers · LT/RT zoom · L-stick pan · R-stick orbit
##          D-pad navigate · Start menu · View speed · L3 top view · R3 rack labels
var app
var active := false
var reticle: Label
var hint: Label
var _refocus := 0.0
const DEAD := 0.2

func _ready() -> void:
	for a in ["ui_left", "ui_right", "ui_up", "ui_down"]:       # the D-pad navigates; sticks belong to the camera
		for ev in InputMap.action_get_events(a):
			if ev is InputEventJoypadMotion: InputMap.action_erase_event(a, ev)
	for pair in [["ui_accept", JOY_BUTTON_A], ["ui_cancel", JOY_BUTTON_B]]:   # the project has no input map: A presses the focused control, B closes pop-ups (dropdowns)
		var jb := InputEventJoypadButton.new(); jb.button_index = pair[1]
		if not InputMap.action_has_event(pair[0], jb): InputMap.action_add_event(pair[0], jb)
	reticle = Label.new(); reticle.text = "⊕"; reticle.label_settings = Kit.ls(34, Color(1, 0.95, 0.4)); reticle.visible = false
	reticle.mouse_filter = Control.MOUSE_FILTER_IGNORE; app.root.add_child(reticle)
	hint = Kit.label("Ⓐ select   Ⓑ back   Ⓧ inspect rack   Ⓨ next month   LB/RB drawers   LT/RT zoom   ☰ menu", 13, Color(1, 1, 1, 0.8))
	hint.set_anchors_preset(Control.PRESET_BOTTOM_LEFT); hint.offset_left = 14; hint.offset_bottom = -2; hint.offset_top = -22; hint.visible = false
	hint.mouse_filter = Control.MOUSE_FILTER_IGNORE; app.root.add_child(hint)

func set_active(on: bool) -> void:
	if on == active: return
	active = on; Kit.pad_mode = on
	_apply_focus_modes(app.root)
	if not on: app.get_viewport().gui_release_focus()
	else: ensure_focus(true)
	reticle.visible = on; hint.visible = on
	if on: Input.mouse_mode = Input.MOUSE_MODE_HIDDEN
	else: Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _apply_focus_modes(n: Node) -> void:
	for c in n.find_children("*", "BaseButton", true, false): (c as BaseButton).focus_mode = Control.FOCUS_ALL if Kit.pad_mode else Control.FOCUS_NONE

func _input(e: InputEvent) -> void:
	if e is InputEventJoypadButton or (e is InputEventJoypadMotion and absf(e.axis_value) > 0.55): set_active(true)
	elif e is InputEventMouseMotion and (e as InputEventMouseMotion).relative.length() > 2.0: set_active(false)
	elif e is InputEventMouseButton or (e is InputEventKey and e.pressed): set_active(false)
	if not (e is InputEventJoypadButton) or not e.pressed: return
	var m: Control = app.modal()
	match e.button_index:
		JOY_BUTTON_B: _back(); get_viewport().set_input_as_handled()
		JOY_BUTTON_START: if app.started: app._menu(); get_viewport().set_input_as_handled()
		JOY_BUTTON_Y: if m == null and app.started: app.next_month(); get_viewport().set_input_as_handled()
		JOY_BUTTON_BACK: if m == null and app.started: app.set_speed((app.speed + 1) % 4); get_viewport().set_input_as_handled()
		JOY_BUTTON_LEFT_SHOULDER: if m == null and app.started: _drawer(-1); get_viewport().set_input_as_handled()
		JOY_BUTTON_RIGHT_SHOULDER: if m == null and app.started: _drawer(1); get_viewport().set_input_as_handled()
		JOY_BUTTON_X: if m == null and app.started: inspect(); get_viewport().set_input_as_handled()
		JOY_BUTTON_LEFT_STICK: if m == null and app.started: app.hall.top_view(); get_viewport().set_input_as_handled()
		JOY_BUTTON_RIGHT_STICK: if m == null and app.started: app.hall.labels_on = not app.hall.labels_on; app.hall.rebuild(); get_viewport().set_input_as_handled()
		JOY_BUTTON_DPAD_UP, JOY_BUTTON_DPAD_DOWN, JOY_BUTTON_DPAD_LEFT, JOY_BUTTON_DPAD_RIGHT: ensure_focus(false)

## B: close the topmost thing — overlay, inspector, then the open drawer.
func _back() -> void:
	var m: Control = app.modal()
	if m != null:
		if m == app.keynote: app.keynote._ack(false)
		elif m == app.guide: app.guide.visible = false
		elif m == app.settings_ui: app._settings()
		elif m == app.menu_ui: app._menu()
		elif m.name == "slots" or m.name == "confirm": m.queue_free()
		elif m.name == "site": (m as SiteScreen).cancel()
		return
	if app.inspector != null: app.inspector.queue_free(); app.inspector = null; return
	if app.started and app.cur != "dash": app.show_screen("dash")

func _drawer(dir: int) -> void:
	var idx := 0
	for i in app.DOCK.size():
		if app.DOCK[i][0] == app.dock_key(app.cur): idx = i
	idx = posmod(idx + dir, app.DOCK.size())
	var key: String = app.DOCK[idx][0]
	app.show_screen(app.last_tab.get(key, key))

## X: inspect the rack under the reticle (or place a rack there while the Build drawer is open).
func inspect() -> void:
	var s: int = app.hall._ray_pick(_reticle_pos())
	if s < 0: return
	if app.cur == "facility" and app.screens.has("facility"): app.screens["facility"].on_slot(s)
	else: app._inspect(s)

func _reticle_pos() -> Vector2:
	var sz := get_viewport().get_visible_rect().size
	return Vector2((sz.x - app.hall.cover_px) * 0.5, sz.y * 0.5 - 20.0)

func _process(dt: float) -> void:
	if not active: return
	reticle.position = _reticle_pos() - Vector2(17, 22)
	reticle.visible = app.started and app.hall.visible and app.modal() == null
	# keep controller focus alive and inside the topmost overlay
	_refocus -= dt
	if _refocus <= 0.0:
		_refocus = 0.25; ensure_focus(false)
	if not app.started or app.modal() != null or not app.hall.visible: return
	var l := Vector2(_axis(JOY_AXIS_LEFT_X), _axis(JOY_AXIS_LEFT_Y)); var r := Vector2(_axis(JOY_AXIS_RIGHT_X), _axis(JOY_AXIS_RIGHT_Y))
	var z := _axis(JOY_AXIS_TRIGGER_RIGHT, true) - _axis(JOY_AXIS_TRIGGER_LEFT, true)
	app.hall.pad_move(l, r, z, dt)

func _axis(a: int, trig := false) -> float:
	var v := Input.get_joy_axis(0, a)
	if trig: return maxf(0.0, v - 0.1)
	return 0.0 if absf(v) < DEAD else v

## Make sure something is focused, and that it sits inside the topmost overlay (if any).
func ensure_focus(force: bool) -> void:
	var vp := get_viewport(); var cur: Control = vp.gui_get_focus_owner()
	var m: Control = app.modal()
	var scope: Control = m if m != null else null
	if cur != null and not force and cur.is_visible_in_tree() and (scope == null or scope.is_ancestor_of(cur)): return
	var host: Node = scope
	if host == null:
		host = app.screens.get(app.cur) if app.started else app.root
		if host == null: host = app.root
	for c in host.find_children("*", "BaseButton", true, false):
		var b := c as BaseButton
		if b.is_visible_in_tree() and not b.disabled and b.focus_mode == Control.FOCUS_ALL: b.grab_focus(); return
	if host != app.root:   # empty drawer: fall back to the dock
		for c in app.root.find_children("*", "BaseButton", true, false):
			var b2 := c as BaseButton
			if b2.is_visible_in_tree() and not b2.disabled and b2.focus_mode == Control.FOCUS_ALL: b2.grab_focus(); return
