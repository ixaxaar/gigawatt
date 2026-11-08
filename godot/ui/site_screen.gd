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

func open(app_, start: Dictionary, heading: String, go_label: String, done: Callable, cancel: Callable) -> void:
	app = app_; style = start.duplicate(); _done = done; _cancel = cancel
	for c in get_children(): c.queue_free()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new(); dim.color = Color(0.01, 0.02, 0.04, 0.96); dim.set_anchors_preset(Control.PRESET_FULL_RECT); add_child(dim)
	var m := MarginContainer.new(); m.set_anchors_preset(Control.PRESET_FULL_RECT)
	for k in ["left", "right", "top", "bottom"]: m.add_theme_constant_override("margin_" + k, 40)
	add_child(m)
	var root := VBoxContainer.new(); root.add_theme_constant_override("separation", 14); m.add_child(root)
	root.add_child(Kit.label(heading, 34, Kit.CY))
	root.add_child(Kit.label("Pick the look of your hall. It is cosmetic only: nothing here changes the game's numbers.", 15, Kit.DIM, true))
	var body := HBoxContainer.new(); body.add_theme_constant_override("separation", 24); body.size_flags_vertical = Control.SIZE_EXPAND_FILL; root.add_child(body)
	var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.custom_minimum_size = Vector2(470, 0); body.add_child(sc)
	var col := VBoxContainer.new(); col.add_theme_constant_override("separation", 12); col.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sc.add_child(col)
	_option(col, "Floor", "floor", Site.FLOORS); _option(col, "Rack finish", "rack", Site.RACKS); _option(col, "Walls", "walls", Site.WALLS); _option(col, "Lighting", "light", Site.LIGHTS)
	_option(col, "Accent colour", "accent", Site.ACCENTS)
	preview = SitePreview.new(); preview.size_flags_vertical = Control.SIZE_EXPAND_FILL; body.add_child(preview); preview.set_style(style)
	var bar := HBoxContainer.new(); bar.add_theme_constant_override("separation", 12); root.add_child(bar)
	bar.add_child(Kit.btn(go_label, func(): _done.call(style); queue_free(), "go", 20))
	bar.add_child(Kit.btn("Use defaults", func(): style = Site.DEFAULT.duplicate(); _refresh(), "", 16))
	var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; bar.add_child(sp)
	bar.add_child(Kit.btn("Back", func(): _cancel.call(); queue_free(), "", 16))

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
