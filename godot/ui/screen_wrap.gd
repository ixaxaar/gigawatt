class_name ScreenWrap
extends Control
## Opaque backdrop around a screen; forwards `app` and `refresh()` to the wrapped screen.
var inner: Control
var app:
	set(v): app = v; if inner: inner.app = v
func refresh() -> void:
	if inner and inner.has_method("refresh"): inner.refresh()
