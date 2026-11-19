class_name StoryOverlay
extends Control
## The story layer: a chapter card every January and, now and then, a two-way decision.
## Content comes from the engine (query "story"); answers go back through ackStory / resolveDilemma.
## Esc, Android Back and controller B call back(): a chapter continues, a decision is put off ("Decide later").
var app
var mode := ""          # "chapter" | "dilemma"
var _dilemma_id := ""

## Dim the screen and open a card: as wide as `width` allows, as tall as its content, scrolling inside when the screen is short.
func _frame(accent: Color, width: float) -> VBoxContainer:
	for c in get_children(): c.queue_free()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter = Control.MOUSE_FILTER_STOP; visible = true
	move_to_front()   # top of the modal stack: nothing added to the interface later can sit over its buttons
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.74); dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	var ins: Vector4 = app.inset if app != null else Vector4.ZERO
	dim.offset_left = -ins.x; dim.offset_top = -ins.y; dim.offset_right = ins.z; dim.offset_bottom = ins.w; add_child(dim)
	var pc := PanelContainer.new()
	pc.add_theme_stylebox_override("panel", Kit.card_sb(accent, Kit.BG, 3, 28 if not Layout.phone else 18)); add_child(pc)
	var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; pc.add_child(sc)
	var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 14); sc.add_child(v)
	if app != null: app.fit_dialog(pc, width, v)
	return v

func open_chapter(c: Dictionary) -> void:
	mode = "chapter"
	var v := _frame(Kit.CY, 760.0)
	v.add_child(Kit.chip("CHAPTER · JANUARY %d" % int(c.year), Kit.CY, 13))
	v.add_child(Kit.label(str(c.title), 44 if not Layout.phone else 32, Kit.TX, true))
	v.add_child(Kit.label(str(c.text), 19 if not Layout.phone else 17, Kit.DIM, true))
	var go := Kit.btn("Into %d  ▶" % int(c.year), _close_chapter, "go", 19); go.custom_minimum_size = Vector2(0, maxf(54.0, Layout.tap())); v.add_child(go)
	if go.focus_mode != Control.FOCUS_NONE: go.grab_focus()   # only a controller/keyboard user has focusable buttons

func _close_chapter() -> void:
	if not visible or mode != "chapter": return
	if OS.has_feature("debug"): print("STORY chapter closed")
	visible = false; mode = ""; app.b.act("ackStory"); app.check_story()

func open_dilemma(d: Dictionary) -> void:
	mode = "dilemma"; _dilemma_id = str(d.id)
	var v := _frame(Color("#ff3d8b"), 820.0)
	var hd := HBoxContainer.new(); hd.add_theme_constant_override("separation", 12); v.add_child(hd)
	hd.add_child(Kit.chip("DECISION", Kit.AM, 13))
	var spc := Control.new(); spc.size_flags_horizontal = Control.SIZE_EXPAND_FILL; hd.add_child(spc)
	hd.add_child(Kit.label("answer within %d month%s" % [int(d.monthsLeft), "" if int(d.monthsLeft) == 1 else "s"], 13, Kit.DIM))
	v.add_child(Kit.label(str(d.title), 34 if not Layout.phone else 26, Kit.TX, true))
	v.add_child(Kit.label(str(d.text), 18 if not Layout.phone else 16, Kit.DIM, true))
	var narrow: bool = app != null and app.vw() < 760.0
	var row: BoxContainer = VBoxContainer.new() if narrow else HBoxContainer.new()   # side by side; stacked on narrow screens so neither label is squeezed
	row.add_theme_constant_override("separation", 14 if not narrow else 10); v.add_child(row)
	for ch in d.choices:
		var bt := Kit.btn("%s\n%s" % [str(ch.label), _effects(ch)], _choose.bind(int(ch.index)), "go" if int(ch.index) == 0 else "pri", 18)
		bt.custom_minimum_size = Vector2(0, 72); bt.size_flags_horizontal = Control.SIZE_EXPAND_FILL; bt.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; row.add_child(bt)
	# Putting it off is a full-size choice too (same height and type size), just not coloured like an answer.
	var later := Kit.btn("Decide later", _later.bind(str(d.id)), "", 18); later.custom_minimum_size = Vector2(0, maxf(56.0, Layout.tap())); v.add_child(later)

## Gains and costs of a choice, both shown with their sign: "+$4.20M · −2 rep · −1 operator · power +5%".
static func _effects(ch: Dictionary) -> String:
	var out := PackedStringArray()
	var cash := float(ch.get("cash", 0.0)); var rep := int(ch.get("rep", 0))
	if cash != 0.0: out.append(("+" if cash > 0.0 else "−") + Kit.usd(absf(cash)))
	if rep != 0: out.append(("+" if rep > 0 else "−") + "%d rep" % absi(rep))
	var staff := int(ch.get("staff", 0))
	if staff != 0: out.append(("+" if staff > 0 else "−") + "%d operator%s" % [absi(staff), "" if absi(staff) == 1 else "s"])
	var util := float(ch.get("utility", 1.0))   # a power-price multiplier (only when the engine sends it)
	if ch.get("utility") != null and absf(util - 1.0) > 0.001: out.append("power %s%d%%" % ["+" if util > 1.0 else "−", int(round(absf(util - 1.0) * 100.0))])
	return "  ·  ".join(out) if not out.is_empty() else "no cost"

func _choose(i: int) -> void:
	if not visible or mode != "dilemma": return
	var r: Dictionary = app.b.act("resolveDilemma", [i])
	if not r.get("ok", false): app.toast(str(r.get("message", "Could not do that.")), "bad"); return
	visible = false; mode = ""; app.toast(str(r.get("message", "")), "good"); app.check_story()

func _later(id: String) -> void:
	if OS.has_feature("debug"): print("STORY later pressed")
	visible = false; mode = ""; app.dilemma_dismissed = id

## Esc / Android Back / controller B.
func back() -> void:
	if mode == "chapter": _close_chapter()
	elif mode == "dilemma": _later(_dilemma_id)
	else: visible = false
