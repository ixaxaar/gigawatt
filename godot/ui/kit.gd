class_name Kit
## Shared UI toolkit: the game's visual language + the building blocks every screen uses.

const BG := Color(0.035, 0.05, 0.075, 0.97)
const PANEL := Color(0.055, 0.08, 0.115, 0.96)
const LINE := Color(0.16, 0.27, 0.38)
const CY := Color(0.3, 0.82, 1.0)
const GR := Color(0.25, 0.9, 0.6)
const AM := Color(1.0, 0.72, 0.2)
const RD := Color(1.0, 0.36, 0.42)
const DIM := Color(0.58, 0.68, 0.78)
const TX := Color(0.9, 0.95, 1.0)
const VENDOR := {"nvidia": "#76b900", "amd": "#ed1c24", "tenstorrent": "#8a5cf6", "cerebras": "#ff7a1a", "intel": "#0071c5", "groq": "#f5d90a"}

static func vendor_color(v: String) -> Color: return Color(VENDOR.get(v, "#4fd1ff"))

static func sb(bg: Color = PANEL, border: Color = LINE, r := 10, bw := 1, pad := 12) -> StyleBoxFlat:
	var s := StyleBoxFlat.new(); s.bg_color = bg; s.border_color = border; s.set_border_width_all(bw); s.set_corner_radius_all(r)
	s.content_margin_left = pad; s.content_margin_right = pad; s.content_margin_top = pad * 0.75; s.content_margin_bottom = pad * 0.75; return s

## One shared LabelSettings per (size, colour): building a label with two theme overrides costs ~2x as much,
## and screens create thousands of labels.
static var _ls_cache := {}
static func ls(size: int, col: Color) -> LabelSettings:
	var k := Vector3i(size, col.r8 | (col.g8 << 8) | (col.b8 << 16), col.a8)
	if _ls_cache.has(k): return _ls_cache[k]
	var s := LabelSettings.new(); s.font_size = size; s.font_color = col
	if size >= 20:   # headlines and big numbers: bold with a dark outline and hard shadow, like a comic caption
		s.font = Fonts.bold; s.outline_size = 5; s.outline_color = Color(0.01, 0.015, 0.03)
		s.shadow_size = 1; s.shadow_color = Color(0, 0, 0, 0.85); s.shadow_offset = Vector2(3, 3)
	_ls_cache[k] = s; return s

static func label(t: String, size := 16, col: Color = TX, wrap := false) -> Label:
	var l := Label.new(); l.text = t; l.label_settings = ls(size, col)
	if wrap: l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return l

static func rich(t: String, size := 15) -> RichTextLabel:
	var r := RichTextLabel.new(); r.bbcode_enabled = true; r.fit_content = true; r.scroll_active = false; r.text = t
	r.add_theme_font_size_override("normal_font_size", size); r.add_theme_font_size_override("bold_font_size", size); r.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE; return r

static var pad_mode := false       # set by Pad: true while the player is using a controller
static func focus_mode() -> int: return Control.FOCUS_ALL if pad_mode else Control.FOCUS_NONE
## Bright outline drawn on the focused button in pad mode.
static func focus_sb() -> StyleBoxFlat:
	var s := StyleBoxFlat.new(); s.draw_center = false; s.border_color = Color(1, 0.96, 0.5); s.set_border_width_all(4); s.set_corner_radius_all(6); s.set_expand_margin_all(3); return s

static var accent := CY          # colour of the drawer being built (set by the app shell before a screen rebuilds)
## Frame for a drawer / workshop: thick accent edge on the side facing the hall, hard offset shadow.
static func drawer_sb(acc: Color, full: bool) -> StyleBoxFlat:
	var s := sb(Color(0.035, 0.05, 0.075, 0.985), Color(0.02, 0.03, 0.045), 4, 3, 14)
	if not full: s.border_width_left = 8; s.border_color = acc
	s.shadow_color = Color(0, 0, 0, 0.55); s.shadow_size = 18; s.shadow_offset = Vector2(-8, 0) if not full else Vector2.ZERO
	return s

## Dock button: chunky tab with a coloured underline and a hotkey badge.
static func dock_btn(t: String, key: String, col: Color, cb: Callable) -> Button:
	var b := Button.new(); b.text = "%s\n[%s]" % [t, key]; b.focus_mode = focus_mode(); b.add_theme_stylebox_override("focus", focus_sb()); b.custom_minimum_size = Vector2(138, 58)
	b.add_theme_font_size_override("font_size", 14); b.add_theme_font_override("font", Fonts.bold)
	b.set_meta("col", col); dock_set(b, false); b.pressed.connect(cb); return b

static func dock_set(b: Button, on: bool) -> void:
	var col: Color = b.get_meta("col")
	var base := col if on else Color(0.07, 0.1, 0.14)
	for st in ["normal", "hover", "pressed"]:
		var s := sb(base if st != "hover" else base.lightened(0.12), Color(0.02, 0.03, 0.05), 4, 3, 8)
		s.border_width_bottom = 8; s.border_color = col if not on else Color(0.02, 0.03, 0.05)
		s.shadow_color = Color(0, 0, 0, 0.6); s.shadow_size = 1; s.shadow_offset = Vector2(3, 3)
		b.add_theme_stylebox_override(st, s)
	b.add_theme_color_override("font_color", Color(0.05, 0.06, 0.1) if on else TX); b.add_theme_color_override("font_hover_color", Color(0.05, 0.06, 0.1) if on else Color.WHITE)
	b.add_theme_color_override("font_pressed_color", Color(0.05, 0.06, 0.1) if on else Color.WHITE)

## Tab inside a drawer header.
static func tab_btn(t: String, on: bool, col: Color, cb: Callable) -> Button:
	var b := Button.new(); b.text = t.to_upper(); b.focus_mode = focus_mode(); b.add_theme_stylebox_override("focus", focus_sb()); b.add_theme_font_size_override("font_size", 15); b.add_theme_font_override("font", Fonts.bold)
	var base := col if on else Color(0.07, 0.1, 0.14)
	for st in ["normal", "hover", "pressed"]:
		var s := sb(base if st != "hover" else base.lightened(0.12), Color(0.02, 0.03, 0.05), 3, 3, 10); s.shadow_color = Color(0, 0, 0, 0.6); s.shadow_size = 1; s.shadow_offset = Vector2(3, 3)
		b.add_theme_stylebox_override(st, s)
	var fc := Color(0.05, 0.06, 0.1) if on else TX
	b.add_theme_color_override("font_color", fc); b.add_theme_color_override("font_hover_color", fc); b.add_theme_color_override("font_pressed_color", fc)
	b.pressed.connect(cb); return b

static var _btn_styles := {}
## Button StyleBoxes depend only on the kind, so they are built once and shared (hundreds of buttons per screen).
static func _styles(kind: String) -> Dictionary:
	if _btn_styles.has(kind): return _btn_styles[kind]
	var base := Color(0.1, 0.15, 0.21); var edge := Color(0.3, 0.42, 0.55); var ink := Color(0.88, 0.94, 1.0)
	if kind == "pri": base = Color(0.16, 0.62, 0.86); edge = Color(0.02, 0.03, 0.05); ink = Color(0.03, 0.05, 0.09)
	elif kind == "go": base = Color(0.2, 0.82, 0.52); edge = Color(0.02, 0.03, 0.05); ink = Color(0.02, 0.07, 0.04)
	elif kind == "danger": base = Color(0.9, 0.28, 0.36); edge = Color(0.02, 0.03, 0.05); ink = Color(0.1, 0.02, 0.03)
	var mk := func(bg: Color, off: Vector2) -> StyleBoxFlat:
		var s := sb(bg, edge, 4, 2, 10); s.shadow_color = Color(0, 0, 0, 0.7); s.shadow_size = 1; s.shadow_offset = off; return s
	var st := {"normal": mk.call(base, Vector2(3, 3)), "hover": mk.call(base.lightened(0.14), Vector2(3, 3)), "pressed": mk.call(base.darkened(0.12), Vector2(1, 1)), "disabled": mk.call(Color(0.06, 0.08, 0.1), Vector2(0, 0)), "ink": ink, "focus": focus_sb()}
	st.disabled.border_color = Color(0.12, 0.16, 0.2)
	_btn_styles[kind] = st; return st

static func btn(t: String, cb: Callable, kind := "", size := 15) -> Button:
	var b := Button.new(); b.text = t; b.add_theme_font_size_override("font_size", size); b.add_theme_font_override("font", Fonts.bold); b.focus_mode = focus_mode()
	var st := _styles(kind)
	b.add_theme_stylebox_override("focus", st.focus)
	b.add_theme_stylebox_override("normal", st.normal); b.add_theme_stylebox_override("hover", st.hover)
	b.add_theme_stylebox_override("pressed", st.pressed); b.add_theme_stylebox_override("disabled", st.disabled)
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]: b.add_theme_color_override(c, st.ink)
	b.add_theme_color_override("font_disabled_color", Color(0.4, 0.45, 0.5)); b.set_meta("kind", kind); b.pressed.connect(cb); return b

static func link(text: String, cb: Callable, size := 14) -> Button:
	var b := Button.new(); b.text = text; b.flat = true; b.focus_mode = focus_mode(); b.add_theme_stylebox_override("focus", focus_sb()); b.alignment = HORIZONTAL_ALIGNMENT_LEFT; b.add_theme_font_size_override("font_size", size)
	b.add_theme_color_override("font_color", CY); b.add_theme_color_override("font_hover_color", Color.WHITE); b.pressed.connect(cb); return b

static func tabs(parent: Control, names: Array, current: String, cb: Callable) -> HBoxContainer:
	var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 6)
	for n in names:
		var id: String = n[0] if n is Array else n; var nm: String = n[1] if n is Array else n
		h.add_child(btn(nm, func(): cb.call(id), "pri" if id == current else "", 15))
	parent.add_child(h); return h

## A titled panel; returns [panel, body_vbox].
const PANEL_FILL := Color(0.07, 0.095, 0.135, 0.98)
const PANEL_EDGE := Color(0.2, 0.3, 0.42)
## A panel in the game's sticker style: solid fill, 2px edge, hard offset shadow, title on an accent chip.
static func card_sb(edge: Color = PANEL_EDGE, fill: Color = PANEL_FILL, bw := 2, pad := 14) -> StyleBoxFlat:
	var s := sb(fill, edge, 5, bw, pad); s.shadow_color = Color(0, 0, 0, 0.75); s.shadow_size = 1; s.shadow_offset = Vector2(4, 4); return s

## Small filled label (dark text on a colour).
static func chip(t: String, col: Color, size := 13) -> PanelContainer:
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", sb(col, Color(0.02, 0.03, 0.05), 3, 2, 7))
	var s := p.get_theme_stylebox("panel") as StyleBoxFlat; s.content_margin_top = 1; s.content_margin_bottom = 1
	var l := Label.new(); l.text = t; l.label_settings = ls_bold(size, Color(0.04, 0.05, 0.09)); p.add_child(l); return p

static var _lsb_cache := {}
static func ls_bold(size: int, col: Color) -> LabelSettings:
	var k := Vector3i(size, col.r8 | (col.g8 << 8) | (col.b8 << 16), col.a8)
	if _lsb_cache.has(k): return _lsb_cache[k]
	var s := LabelSettings.new(); s.font_size = size; s.font_color = col; s.font = Fonts.bold; _lsb_cache[k] = s; return s

static func panel(title := "", glow := false, parent: Control = null) -> Array:
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", card_sb(accent if glow else PANEL_EDGE, PANEL_FILL, 3 if glow else 2)); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 8); p.add_child(v)
	if title != "":
		var hb := HBoxContainer.new(); hb.add_child(chip(title.to_upper(), accent, 13)); v.add_child(hb)
	if parent: parent.add_child(p)
	return [p, v]

## Two-column screens become ONE column inside a drawer (both names point at the same scrolling list): left content first, then right.
static func cols2(root: Control) -> Array:
	var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.size_flags_vertical = Control.SIZE_EXPAND_FILL; sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sc.follow_focus = true
	var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 10); sc.add_child(v); root.add_child(sc)
	return [v, v]

static func column(parent: Control, min_w := 0.0, expand := true) -> VBoxContainer:
	var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.size_flags_vertical = Control.SIZE_EXPAND_FILL; sc.follow_focus = true
	if expand: sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.custom_minimum_size = Vector2(min_w, 0)
	var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 10); sc.add_child(v); parent.add_child(sc); return v

static func stat(lbl: String, value: String, col: Color = TX) -> VBoxContainer:
	var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_child(label(lbl.to_upper(), 11, DIM)); v.add_child(label(value, 20, col)); return v

static func stats(items: Array, cols := 4) -> GridContainer:
	var g := GridContainer.new(); g.columns = cols; g.add_theme_constant_override("h_separation", 12); g.add_theme_constant_override("v_separation", 8); g.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for it in items: g.add_child(stat(it[0], it[1], it[2] if it.size() > 2 else TX))
	return g

static func bar(v: float, mx: float, warn := false) -> ProgressBar:
	var p := ProgressBar.new(); p.show_percentage = false; p.custom_minimum_size = Vector2(0, 10); p.max_value = 1.0; p.value = clampf(v / maxf(1e-9, mx), 0.0, 1.0)
	var col := RD if v > mx else (AM if warn or v > mx * 0.85 else GR)
	var bg := sb(Color(0.08, 0.11, 0.15), Color(0, 0, 0, 0), 5, 0, 0); var fg := sb(col, Color(0, 0, 0, 0), 5, 0, 0)
	for s in [bg, fg]: s.content_margin_top = 0; s.content_margin_bottom = 0
	p.add_theme_stylebox_override("background", bg); p.add_theme_stylebox_override("fill", fg); return p

static func tag(t: String, col: Color = CY) -> Control:
	return chip(t, col, 11)

static func tip(text: String) -> PanelContainer:
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", card_sb(Color(0.9, 0.78, 0.25), Color(0.13, 0.12, 0.07), 2, 12)); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 10); p.add_child(hb)
	var c := chip("TIP", Color(1.0, 0.82, 0.25), 12); c.size_flags_vertical = Control.SIZE_SHRINK_BEGIN; hb.add_child(c)
	hb.add_child(label(text, 13, Color(0.95, 0.92, 0.8), true)); return p

static func issue(sev: String, head: String, msg: String) -> PanelContainer:
	var col := RD if sev == "error" else (AM if sev == "warn" else CY)
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", sb(Color(col.r, col.g, col.b, 0.1), col, 6, 1, 9)); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	p.add_child(rich("[b][color=#%s]%s[/color][/b]  %s" % [col.to_html(false), head, msg], 14)); return p

static func issues(parent: Control, list: Array) -> void:
	if list.is_empty(): parent.add_child(issue("info", "All clear", "No problems detected.")); return
	var order := {"error": 0, "warn": 1, "info": 2}
	var s := list.duplicate(); s.sort_custom(func(a, b): return order.get(a.severity, 3) < order.get(b.severity, 3))
	for i in s: parent.add_child(issue(i.severity, "%s · %s" % [i.severity, i.code], i.message))

static func hsep() -> HSeparator: return HSeparator.new()

static func row(parent: Control, left: Control, right: Array = []) -> HBoxContainer:
	var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 10); h.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL; h.add_child(left)
	for r in right: h.add_child(r)
	parent.add_child(h); return h

## Table: headers = [text...], rows = Array of Array[Control|String]; widths optional stretch ratios.
static func table(headers: Array, rows: Array, ratios: Array = []) -> GridContainer:
	var g := GridContainer.new(); g.columns = maxi(headers.size(), (rows[0].size() if rows.size() > 0 else 1)); g.add_theme_constant_override("h_separation", 14); g.add_theme_constant_override("v_separation", 5); g.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if headers.size() > 0:
		for h in headers: g.add_child(label(str(h).to_upper(), 11, DIM))
	for r in rows:
		for c in r:
			if c is Control: g.add_child(c)
			else:
				var l := label(str(c), 14); l.size_flags_horizontal = Control.SIZE_EXPAND_FILL; g.add_child(l)
	return g

static func spin(value: float, mn: float, mx: float, step: float, cb: Callable) -> SpinBox:
	var s := SpinBox.new(); s.min_value = mn; s.max_value = mx; s.step = step; s.value = value; s.custom_minimum_size = Vector2(110, 0); s.value_changed.connect(cb); return s

static func slider(value: float, mn: float, mx: float, step: float, cb: Callable) -> HSlider:
	var s := HSlider.new(); s.min_value = mn; s.max_value = mx; s.step = step; s.value = value; s.size_flags_horizontal = Control.SIZE_EXPAND_FILL; s.custom_minimum_size = Vector2(120, 24); s.value_changed.connect(cb); return s

static func option(opts: Array, selected: String, cb: Callable) -> OptionButton:
	var o := OptionButton.new(); o.focus_mode = Control.FOCUS_NONE; o.add_theme_font_size_override("font_size", 14)
	var sel := 0
	for i in opts.size():
		var id: String = opts[i][0] if opts[i] is Array else opts[i]; var nm: String = opts[i][1] if opts[i] is Array else opts[i]
		o.add_item(nm); o.set_item_metadata(i, id)
		if id == selected: sel = i
	o.select(sel); o.item_selected.connect(func(i): cb.call(o.get_item_metadata(i))); return o

static func check(text: String, on: bool, cb: Callable) -> CheckBox:
	var c := CheckBox.new(); c.text = text; c.button_pressed = on; c.focus_mode = Control.FOCUS_NONE; c.add_theme_font_size_override("font_size", 14); c.toggled.connect(cb); return c

# ---------- formatting ----------
## Unit prices ($/GPU-hour, $/Mtok): cents matter, so never round them away.
static func price(n: float) -> String:
	return "$%.2f" % n if n < 100.0 else usd(n)

static func usd(n: float) -> String:
	var a := absf(n); var s := "-" if n < 0 else ""
	if a >= 1e9: return "%s$%.2fB" % [s, a / 1e9]
	if a >= 1e6: return "%s$%.2fM" % [s, a / 1e6]
	if a >= 1e3: return "%s$%.1fk" % [s, a / 1e3]
	return "%s$%.0f" % [s, a]

static func num(n: float, d := 0) -> String:
	var s := ("%." + str(d) + "f") % n
	var parts := s.split("."); var ip: String = parts[0]; var neg := ip.begins_with("-"); if neg: ip = ip.substr(1)
	var out := ""; var c := 0
	for i in range(ip.length() - 1, -1, -1):
		out = ip[i] + out; c += 1
		if c % 3 == 0 and i > 0: out = "," + out
	return ("-" if neg else "") + out + ("." + parts[1] if parts.size() > 1 else "")

static func date_of(m: float) -> String:
	var mi := int(m); return "%s %d" % [["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][mi % 12], 2020 + mi / 12]

static func specs_of(i: Dictionary) -> Array:
	var f := func(v, d := "–"): return str(v) if v != null else d
	var n := func(v): return str(int(v)) if typeof(v) == TYPE_FLOAT and v == floorf(v) else str(v)
	match i.kind:
		"accelerator": return [["Memory", "%s GB %s" % [n.call(i.memGB), str(i.memType).to_upper()]], ["Mem BW", "%s TB/s" % n.call(i.memBWTBs)], ["FP8", "%s TF" % f.call(i.tflops.get("fp8"))], ["BF16", "%s TF" % f.call(i.tflops.get("bf16"))], ["TDP", "%s W" % n.call(i.tdpW)], ["Scale-up", "%s %s GB/s ×%s" % [i.scaleUp, n.call(i.scaleUpGBs), n.call(i.maxScaleUpDomain)]], ["Scale-out", "%s Gb/s" % n.call(i.nativeScaleOutGbps)], ["Cooling", "/".join(i.cooling)]]
		"uplink": return [["Speed", "%s Gb/s" % n.call(i.gbps)], ["Service", i.service], ["Carrier", i.carrier], ["Monthly", "$" + num(i.mrcUSD)]]
		"cpu": return [["Cores", "%s %s" % [n.call(i.cores), i.arch]], ["TDP", "%s W" % n.call(i.tdpW)], ["Mem BW", "%s GB/s" % n.call(i.memBWGBs)], ["PCIe", "Gen%s ×%s" % [n.call(i.pcieGen), n.call(i.pcieLanes)]]]
		"nic": return [["Class", i.nicClass], ["Rate", "%s Gb/s ×%s" % [n.call(i.gbps), n.call(i.ports)]], ["Power", "%s W" % n.call(i.watts)], ["Features", ", ".join(i.features.slice(0, 4))]]
		"switch": return [["Role", i.role], ["Ports", "%s × %sG" % [n.call(i.portCount), n.call(i.portGbps)]], ["Capacity", "%s Tb/s" % n.call(i.capacityTbps)], ["Power", "%s W" % n.call(i.watts)], ["Size", "%sU" % n.call(i.rackUnits)]]
		"cable": return [["Type", i.cableType], ["Rate", "%sG" % n.call(i.gbps)], ["Reach", "%s m" % n.call(i.maxReachM)], ["Power", "%s W/end" % n.call(i.wattsPerEnd)]]
		"chassis": return [["Size", "%sU %s" % [n.call(i.rackUnits), i.rackStandard]], ["Cooling", i.cooling], ["Max power", "%.1f kW" % (i.maxPowerW / 1000.0)], ["Weight", "%s kg" % n.call(i.weightKg)]]
		"rack": return [["Units", "%sU" % n.call(i.units)], ["Max", "%s kW" % n.call(i.maxKW)], ["Weight", "%s kg" % n.call(i.maxWeightKg)], ["Cooling", "/".join(i.cooling)]]
		"power": return [["Type", i.powerType], ["Capacity", "%s kW" % n.call(i.capacityKW)], ["Efficiency", "%.1f%%" % (i.efficiency * 100.0)], ["Install", "%s mo" % n.call(i.installMonths)]]
		"cooling": return [["Type", i.coolingType], ["Capacity", "%s kW" % n.call(i.capacityKW)], ["Overhead", "%s W/kW" % n.call(i.wattsPerKW)], ["Serves", i.serves], ["Supply", "%s°C" % n.call(i.supplyTempC)]]
		"storage": return [["Tier", i.tier], ["Capacity", "%s PB" % n.call(i.capacityPB)], ["Read", "%s GB/s" % n.call(i.readGBs)], ["Size", "%sU" % n.call(i.rackUnits)]]
		"memory": return [["Type", i.type], ["Capacity", "%s GB" % n.call(i.capacityGB)], ["Speed", "%s MT/s" % n.call(i.speedMTs)]]
		"nvme": return [["Capacity", "%s TB" % n.call(i.capacityTB)], ["Read", "%s GB/s" % n.call(i.readGBs)], ["PCIe", "Gen%s" % n.call(i.pcieGen)]]
	return []

static func codex_card(parent: Control, codex: Dictionary, name := "") -> void:
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", sb(Color(0.04, 0.07, 0.1), Color(0.14, 0.24, 0.34), 8, 1, 12)); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 5); p.add_child(v)
	if name != "": v.add_child(label(name, 15, TX, true))
	v.add_child(label(codex.summary, 14, TX, true)); v.add_child(label(codex.explain, 13, DIM, true))
	for t in codex.tradeoffs: v.add_child(label("•  " + t, 13, Color(0.85, 0.9, 0.95), true))
	parent.add_child(p)


## Rebuild a screen without losing scroll positions (rebuild frees old ScrollContainers; restore by index).
static func refresh_keep(node: Control) -> void:
	if not node.has_method("refresh"): return
	var vals := []
	for sc in node.find_children("*", "ScrollContainer", true, false): vals.append((sc as ScrollContainer).scroll_vertical)
	node.refresh()
	if vals.is_empty() or not node.is_inside_tree(): return
	var tree := node.get_tree()
	await tree.process_frame; await tree.process_frame
	if not is_instance_valid(node): return
	var scs := node.find_children("*", "ScrollContainer", true, false)
	for i in mini(scs.size(), vals.size()): (scs[i] as ScrollContainer).scroll_vertical = vals[i]

## Collapsible panel. `folds` is a persistent Dictionary (key -> bool collapsed); toggling calls `on_toggle`.
static func fold_panel(title: String, key: String, folds: Dictionary, on_toggle: Callable, glow := false, parent: Control = null, default_collapsed := false) -> Array:
	var collapsed: bool = folds.get(key, default_collapsed)
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel", card_sb(accent if glow else PANEL_EDGE, PANEL_FILL, 3 if glow else 2, 12)); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 7); p.add_child(v)
	var hb := btn(("▸ " if collapsed else "▾ ") + title.to_upper(), func(): folds[key] = not collapsed; on_toggle.call(), "pri" if not collapsed else "", 13)
	hb.alignment = HORIZONTAL_ALIGNMENT_LEFT; v.add_child(hb)
	var body := VBoxContainer.new(); body.add_theme_constant_override("separation", 7); body.visible = not collapsed; v.add_child(body)
	if parent: parent.add_child(p)
	return [p, body]

## Okabe-Ito colour-blind-safe palette (used when Settings.colorblind).
const CB_PALETTE := [Color("#E69F00"), Color("#56B4E9"), Color("#009E73"), Color("#F0E442"), Color("#0072B2"), Color("#D55E00"), Color("#CC79A7"), Color("#FFFFFF")]

## Stable per cluster: derived from the id itself, so disbanding another cluster never recolours this one.
static func cluster_color(_g: Dictionary, id) -> Color:
	var n := int(str(id).substr(3)) if str(id).length() > 3 else 0
	if Settings.colorblind: return CB_PALETTE[n % CB_PALETTE.size()]
	return Color.from_hsv(fmod(n * 0.137 + 0.02, 1.0), 0.75, 1.0)

## Modal yes/no. `host` is any node inside the UI tree (it is parented to the top-level control).
static func confirm(host: Node, text: String, on_yes: Callable, yes_label := "Confirm") -> void:
	var layer: Node = host.get_tree().current_scene.get("root") if host.get_tree().current_scene != null else null
	if layer == null: on_yes.call(); return
	var h := Control.new(); h.set_anchors_preset(Control.PRESET_FULL_RECT); layer.add_child(h)
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.55); dim.set_anchors_preset(Control.PRESET_FULL_RECT); h.add_child(dim)
	var pn := PanelContainer.new(); pn.set_anchors_preset(Control.PRESET_CENTER); pn.offset_left = -260; pn.offset_right = 260; pn.offset_top = -90; pn.offset_bottom = 90
	pn.add_theme_stylebox_override("panel", sb(Color(0.03, 0.05, 0.08, 0.99), CY, 12, 2, 20)); h.add_child(pn)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 14); pn.add_child(vb)
	vb.add_child(label(text, 17, TX, true))
	var row := HBoxContainer.new(); row.add_theme_constant_override("separation", 10); vb.add_child(row)
	row.add_child(btn(yes_label, func(): h.queue_free(); on_yes.call(), "pri", 16))
	row.add_child(btn("Cancel", func(): h.queue_free(), "", 16))

## Run `rebuild` (which frees and recreates the UI) without losing scroll positions.
static func rebuild_keep(node: Control, rebuild: Callable) -> void:
	var vals := []
	for sc in node.find_children("*", "ScrollContainer", true, false): vals.append((sc as ScrollContainer).scroll_vertical)
	var fi := -1   # in pad mode keep the controller focus on "the same" button after the screen is rebuilt
	if pad_mode and node.is_inside_tree():
		var fo := node.get_viewport().gui_get_focus_owner()
		if fo != null and node.is_ancestor_of(fo): fi = node.find_children("*", "BaseButton", true, false).find(fo)
	rebuild.call()
	if (vals.is_empty() and fi < 0) or not node.is_inside_tree(): return
	var tree := node.get_tree()
	await tree.process_frame; await tree.process_frame
	if not is_instance_valid(node): return
	var scs := node.find_children("*", "ScrollContainer", true, false)
	for i in mini(scs.size(), vals.size()): (scs[i] as ScrollContainer).scroll_vertical = vals[i]
	if fi >= 0 and pad_mode:
		var bs := node.find_children("*", "BaseButton", true, false).filter(func(b): return b.is_visible_in_tree() and b.focus_mode == Control.FOCUS_ALL)
		if not bs.is_empty(): bs[mini(fi, bs.size() - 1)].grab_focus()

## True when the mouse is over an interactive UI panel (so the 3D view must not react).
static func over_ui(node: Node) -> bool:
	# The 3D hall is not a Control, so ANY hovered Control (drawer, panel, label, empty drawer space) means the pointer is on UI.
	return node.get_viewport().gui_get_hovered_control() != null
