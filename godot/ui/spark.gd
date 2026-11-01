class_name Spark
extends Control
var values: Array = []
var color := Color(0.3, 0.82, 1.0)
func _init() -> void: custom_minimum_size = Vector2(0, 28); mouse_filter = Control.MOUSE_FILTER_IGNORE
func _draw() -> void:
	if values.size() < 2: return
	var lo := 1e30; var hi := -1e30
	for v in values: lo = minf(lo, float(v)); hi = maxf(hi, float(v))
	var pts := PackedVector2Array(); var w := size.x; var h := size.y
	for i in values.size(): pts.append(Vector2(w * i / float(values.size() - 1), h - 3 - (float(values[i]) - lo) / maxf(1e-6, hi - lo) * (h - 6)))
	draw_polyline(pts, color, 2.0, true)
