class_name SiteScreen
extends Control
## Pick the hall's surroundings (floor, walls, lighting, accent colour, region) with a live 3D preview.
## Used before a new game starts and from the pause menu ("Change look").

var app
var style: Dictionary = Site.DEFAULT.duplicate()
var preview: SitePreview
var _rows := {}
var _done: Callable
var _cancel: Callable
var _sc: ScrollContainer
var _more: Label
var _fade: TextureRect

func _process(_dt: float) -> void:
	if _sc == null or _more == null or _fade == null or not is_instance_valid(_sc): return
	var over := _sc.get_v_scroll_bar().max_value - _sc.size.y
	_more.visible = over > 4.0 and _sc.scroll_vertical < over - 4.0; _fade.visible = _more.visible
	if _more.visible:
		var r := _sc.get_global_rect(); _fade.global_position = Vector2(r.position.x, r.end.y - 48.0); _fade.size = Vector2(r.size.x, 48.0)
		_more.size = _more.get_combined_minimum_size(); _more.global_position = Vector2(r.position.x + (r.size.x - _more.size.x) * 0.5, r.end.y - _more.size.y - 4.0)

func open(app_, start: Dictionary, heading: String, go_label: String, done: Callable, cancel: Callable) -> void:
	app = app_; style = start.duplicate(); _done = done; _cancel = cancel
	for c in get_children(): c.queue_free()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new(); dim.color = Color(0.01, 0.02, 0.04, 0.96); dim.set_anchors_preset(Control.PRESET_FULL_RECT); add_child(dim)
	var m := MarginContainer.new(); m.set_anchors_preset(Control.PRESET_FULL_RECT)
	var pad := 40 if not Layout.phone else 14   # phones: smaller margin, plus the safe area (camera cut-out, rounded corners, gesture bar)
	var ins: Vector4 = app.inset if app != null else Vector4.ZERO
	m.add_theme_constant_override("margin_left", pad + int(ins.x)); m.add_theme_constant_override("margin_top", pad + int(ins.y)); m.add_theme_constant_override("margin_right", pad + int(ins.z)); m.add_theme_constant_override("margin_bottom", pad + int(ins.w))
	add_child(m)
	var root := VBoxContainer.new(); root.add_theme_constant_override("separation", 14); m.add_child(root)
	root.add_child(Kit.label(heading, 34 if not Layout.phone else 26, Kit.CY))
	if not Layout.phone: root.add_child(Kit.label("Pick the look of your hall. It is cosmetic only: nothing here changes the game's numbers.", 15, Kit.DIM, true))
	# Width left for the picker: 470 + 520 px side by side needs ~1094 px; narrower windows shrink both, very narrow ones stack the preview over the list
	var avail := get_viewport_rect().size.x - 2.0 * pad - ins.x - ins.z
	var stack := avail < (640.0 if Layout.phone else 760.0)
	var colw := 470.0 if avail >= 1000.0 else clampf(avail * 0.45, 260.0, 470.0)
	if Layout.phone: colw = minf(330.0, clampf(avail * 0.5, 220.0, 330.0))
	var body: BoxContainer = VBoxContainer.new() if stack else HBoxContainer.new(); body.add_theme_constant_override("separation", 24 if not stack else 10); body.size_flags_vertical = Control.SIZE_EXPAND_FILL; root.add_child(body)
	var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.custom_minimum_size = Vector2(0 if stack else colw, 0); sc.size_flags_vertical = Control.SIZE_EXPAND_FILL; sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL if stack else Control.SIZE_FILL
	if stack: preview = SitePreview.new(); body.add_child(preview)   # preview first: it sits above the list
	body.add_child(sc); _sc = sc
	# More options below (rack finish, lighting, accent on a short phone screen): a fading "more ▼" cue at the bottom of the list.
	_more = Kit.label("more ▼", 14, Kit.TX); _more.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; _more.mouse_filter = Control.MOUSE_FILTER_IGNORE; _more.add_theme_stylebox_override("normal", Kit.sb(Kit.field(0.97), Kit.DIM, 10, 1, 5))
	var gt := GradientTexture2D.new(); var gr := Gradient.new(); gr.colors = PackedColorArray([Color(0.01, 0.02, 0.04, 0.0), Color(0.01, 0.02, 0.04, 0.95)]); gt.gradient = gr; gt.fill_to = Vector2(0, 1); gt.width = 8; gt.height = 64
	_fade = TextureRect.new(); _fade.texture = gt; _fade.stretch_mode = TextureRect.STRETCH_SCALE; _fade.expand_mode = TextureRect.EXPAND_IGNORE_SIZE; _fade.mouse_filter = Control.MOUSE_FILTER_IGNORE; add_child(_fade); add_child(_more)
	var col := VBoxContainer.new(); col.add_theme_constant_override("separation", 12); col.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sc.add_child(col)
	_option(col, "Floor", "floor", Site.FLOORS); _option(col, "Rack finish", "rack", Site.RACKS); _option(col, "Lighting", "light", Site.LIGHTS)
	_option(col, "Accent colour", "accent", Site.ACCENTS)
	var sp0 := Control.new(); sp0.custom_minimum_size = Vector2(0, 40); col.add_child(sp0)   # room under the last row so it can scroll clear of the "more" cue
	if not stack: preview = SitePreview.new(); body.add_child(preview)
	preview.size_flags_vertical = Control.SIZE_EXPAND_FILL if not stack else Control.SIZE_SHRINK_BEGIN
	preview.custom_minimum_size = Vector2(200, 150) if not stack else Vector2(0, clampf(get_viewport_rect().size.y * 0.3, 120.0, 220.0))
	if not stack and avail >= 1000.0 and not Layout.phone: preview.custom_minimum_size = Vector2(520, 380)
	preview.set_style(style)
	var bar := HBoxContainer.new(); bar.add_theme_constant_override("separation", 12); root.add_child(bar)
	bar.add_child(Kit.btn(go_label, func(): _done.call(style); queue_free(), "go", 20))
	bar.add_child(Kit.btn("Use defaults", func(): style = Site.DEFAULT.duplicate(); _refresh(), "", 16))
	var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; bar.add_child(sp)
	bar.add_child(Kit.btn("Back", cancel, "", 16))

func cancel() -> void:
	_cancel.call(); queue_free()

func _option(parent: VBoxContainer, title: String, key: String, items: Array) -> void:
	parent.add_child(Kit.label(title.to_upper(), 13, Kit.DIM))
	var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 6); fl.add_theme_constant_override("v_separation", 6); parent.add_child(fl)
	_rows[key] = fl
	for it in items:
		var id: String = it[0]
		var b := Kit.btn(str(it[1]), func():
			style[key] = id; app.sfx("click")
			_refresh(), "pri" if style[key] == id else "", 14)
		b.set_meta("id", id); fl.add_child(b)

func _refresh() -> void:
	for key in _rows:
		for b in (_rows[key] as Control).get_children(): Kit.skin(b, "pri" if style[key] == b.get_meta("id") else "")
	preview.set_style(style)
