class_name DrawerGrip
extends Control
## The divider on a drawer's edge: a full-height strip with a pill grip. Drag it to size the drawer; tap to fold the drawer away.
var accent := Color("#35d0ff")
var active := false:
	set(v): active = v; queue_redraw()
var folded := false:
	set(v): folded = v; queue_redraw()

func _draw() -> void:
	var w := size.x; var h := size.y
	draw_rect(Rect2(w - 3.0, 0, 3.0, h), Color(accent.r, accent.g, accent.b, 0.55 if active else 0.28))
	var pill := StyleBoxFlat.new(); pill.bg_color = Color(accent.r, accent.g, accent.b, 1.0 if active else 0.85); pill.set_corner_radius_all(9)
	pill.border_color = Color(0, 0, 0, 0.6); pill.set_border_width_all(2)
	var pw := 18.0; var ph := 110.0
	draw_style_box(pill, Rect2(w - pw - 6.0, h * 0.5 - ph * 0.5, pw, ph))
	var f := ThemeDB.fallback_font
	for k in 3: draw_line(Vector2(w - pw - 6.0 + 5.0, h * 0.5 - 14.0 + k * 14.0), Vector2(w - 11.0, h * 0.5 - 14.0 + k * 14.0), Color(0, 0, 0, 0.7), 2.5)
