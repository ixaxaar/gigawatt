class_name DesignScreen
extends Control
## Design Lab: tray bench (motherboard) and rack bench (42U elevation), with live engine validation.
var app
var tab := "tray"
# tray lab
var cid := ""
var sock := {}
var sel_kind := ""
var sel_idx := -1
var tname := "My Tray"
var tmsg := ""
# rack lab
var rid := ""
var ritems: Array = []
var cool := "air"
var rname := "My Rack"
var rmsg := ""
var rtab := "switch"
var armed := {}
var sel_u := -1
var sel_dev := -1
const ZONE := {"accelerator": "ACCELERATOR", "cpu": "CPU", "dimm": "DIMM", "nic": "PCIe NIC", "dpu": "PCIe DPU", "nvme": "NVMe BAY", "psu": "PSU BAY", "coldplate": "COLD PLATE", "switchchip": "SWITCH CHIP", "fan": "FAN"}
const RC := {"tray": Color("#76b900"), "switch": Color("#4fd1ff"), "storage": Color("#c792ea"), "power": Color("#ffb020")}

var _gwfilled := false
var _folds := {}
const BK := preload("res://ui/build_keep.gd")
var _flash := []          # [kind, idx] tray socket(s) that just got a part (idx -1 = every socket of that kind)
var _rflash := []         # [u, h] rack device just placed
var _rcur := -1           # rack keyboard / controller cursor (a U)
var _scroll_u := -1       # bring this U into view after a keyboard move on a tall rack
var _focus_part := false  # controller: after Ⓐ on a socket, focus the first part in the picker
var _rack_sc: ScrollContainer
var _rack_bd: RackBoard
## Phone helpers: tap-height controls, roomier spacing, and a drop-prose-on-phone label.
func _tap(c: Control) -> Control:
	if Layout.phone: c.custom_minimum_size.y = maxf(c.custom_minimum_size.y, Layout.tap())
	return c
func _gap(c: Container, n := 10) -> Container:
	if Layout.phone:
		if c is HFlowContainer or c is GridContainer: c.add_theme_constant_override("h_separation", n); c.add_theme_constant_override("v_separation", n)
		else: c.add_theme_constant_override("separation", n)
	return c
## A row that is side by side on desktop and stacked on phone.
func _pair() -> BoxContainer:
	var r: BoxContainer = VBoxContainer.new() if Layout.phone else HBoxContainer.new(); r.add_theme_constant_override("separation", 10 if Layout.phone else 8); return r
func _prose(p: Control, t: String, size := 11, col: Color = Kit.DIM) -> void:
	if not Layout.phone: p.add_child(Kit.label(t, size, col, true))
func refresh() -> void: BK.refresh(self, app, _rebuild)

# ---- layout model ----
# Desktop: bench (tools + board) on the left, a scrolling column (picker, validation, advisor, saved) on the right; on very wide
#   screens the right side splits into two columns so the board can grow instead of sitting in dead margins.
# Compact / touch: ONE page that scrolls (bottom padding included). When there is room the board and its picker sit side by side
#   at the height of the screen, so tapping a socket and picking a part never leaves the view; on narrow screens the picker sits
#   directly under the board.
func _paged() -> bool: return Layout.compact or Layout.touch
func _avail_w() -> float: return app.vw() - (app.RAIL_W + 14.0 if Layout.phone else 28.0) - 40.0
func _side() -> bool: return _avail_w() >= 820.0
func _row_h() -> float:
	var hh: float = app.holder.size.y if app.get("holder") != null else get_viewport().get_visible_rect().size.y
	return clampf(hh - 28.0 - maxf(48.0, Layout.tap()) - 26.0, 260.0, 1100.0)
func _side_w() -> float: return clampf(_avail_w() * 0.4, 340.0, 520.0)
## A fixed-height scrolling column (the picker beside the board).
func _side_col(parent: Control, w: float, h: float) -> VBoxContainer:
	var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.custom_minimum_size = Vector2(w, h); sc.follow_focus = true; parent.add_child(sc)
	var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 10); sc.add_child(v); return v
## Two columns when there is room, else one (validation / advisor / saved lists under the bench).
func _info_cols(body: Control) -> Array:
	if _avail_w() < 900.0: var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 10); body.add_child(v); return [v, v]
	var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 12); body.add_child(h)
	var a := VBoxContainer.new(); a.size_flags_horizontal = Control.SIZE_EXPAND_FILL; a.add_theme_constant_override("separation", 10); h.add_child(a)
	var c := VBoxContainer.new(); c.size_flags_horizontal = Control.SIZE_EXPAND_FILL; c.add_theme_constant_override("separation", 10); h.add_child(c)
	return [a, c]

var _gwrack := false
func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	_rack_sc = null; _rack_bd = null
	if OS.get_environment("GW_DTAB") != "" and not _gwrack:   # screenshots: GW_DTAB=rack opens the rack bench with a pre-built rack loaded
		_gwrack = true; tab = OS.get_environment("GW_DTAB")
		if tab == "rack":
			for t in app.b.templates:
				if t.availableFrom <= app.b.year():
					var r: Dictionary = app.b.act("adoptTemplate", [t.id])
					if r.ok: _load_rack("rack-" + t.id)
					break
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := Kit.head_row(8 if not Layout.phone else 10); root.add_child(hd)
	hd.add_child(Kit.label("DESIGN LAB", 26, Kit.CY))
	hd.add_child(Kit.btn("① Tray bench" if not Layout.compact else "① Tray", func(): tab = "tray"; refresh(), "pri" if tab == "tray" else ""))
	hd.add_child(Kit.btn("② Rack bench" if not Layout.compact else "② Rack", func(): tab = "rack"; refresh(), "pri" if tab == "rack" else ""))
	var body: VBoxContainer = null
	if _paged():
		if Kit._wrapped(self): body = root   # the drawer already scrolls as one page (touch)
		else:
			var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.size_flags_vertical = Control.SIZE_EXPAND_FILL; sc.follow_focus = true; root.add_child(sc)
			body = VBoxContainer.new(); body.size_flags_horizontal = Control.SIZE_EXPAND_FILL; body.add_theme_constant_override("separation", 10); sc.add_child(body)
	if tab == "tray": _tray(root, body)
	else: _rack(root, body)
	if body != null: var pad := Control.new(); pad.custom_minimum_size.y = 40.0; body.add_child(pad)   # the end of the page clears the dock / rounded corners
	if _focus_part:
		_focus_part = false; call_deferred("_focus_first_part")
	if _scroll_u >= 0: var u := _scroll_u; _scroll_u = -1; _bring_u(u)

func _focus_first_part() -> void:
	for b in find_children("*", "Button", true, false):
		if not b.is_queued_for_deletion() and b.has_meta("part") and not (b as Button).disabled and b.is_visible_in_tree(): (b as Button).grab_focus(); return

## Keep the keyboard cursor visible on a rack taller than its frame.
func _bring_u(u: int) -> void:
	for i in 4: await get_tree().process_frame   # after the rebuild has restored the old scroll positions
	if not is_instance_valid(_rack_sc) or not is_instance_valid(_rack_bd): return
	var y := _rack_bd.row_center(u); var sc := _rack_sc
	if y - 40.0 < sc.scroll_vertical: sc.scroll_vertical = int(y - 40.0)
	elif y + 40.0 > sc.scroll_vertical + sc.size.y: sc.scroll_vertical = int(y + 40.0 - sc.size.y)

# ======================= TRAY LAB =======================
func _chassis_list() -> Array:
	var offers: Dictionary = app.b.q("offersAll"); var out := []
	for it in app.b.items.values():
		if it.kind == "chassis" and offers[it.id].available: out.append(it)
	return out

func _cells(ch: Dictionary, kind: String) -> Array:
	var n := 0
	for s in ch.slots:
		if s.kind == kind: n = int(s.count)
	var cur: Array = sock.get(kind, []); var out := []
	for i in n: out.append(cur[i] if i < cur.size() else null)
	return out

func _active(ch: Dictionary) -> String: return sel_kind if sel_kind != "" else ch.slots[0].kind

func _load_chassis(id: String) -> void:
	cid = id; sock = {}; var ch: Dictionary = app.b.item(id); sel_kind = ch.slots[0].kind; sel_idx = 0

func _install(ch: Dictionary, id: String) -> void:
	var kind := _active(ch); var arr := _cells(ch, kind)
	var idx := sel_idx if (sel_kind == kind and sel_idx >= 0) else arr.find(null)
	if idx < 0: tmsg = "All %s sockets are full — click one to replace it." % kind; return
	arr[idx] = id; sock[kind] = arr; tmsg = ""; sel_kind = kind; _flash = [kind, idx]
	var nxt := -1
	for i in arr.size():
		if arr[i] == null and i != idx: nxt = i; break
	sel_idx = nxt if nxt >= 0 else idx

func _autofill(ch: Dictionary) -> void:
	var nxt := {}
	for s in ch.slots:
		var opts: Array = app.b.q("slotOptions", [ch.id, s.kind]); var pick = null
		for o in opts:
			if o.available: pick = o.item.id; break
		var need: int = int(s.get("required", s.count)); var arr := []
		for i in int(s.count): arr.append(pick if (pick != null and i < need) else null)
		nxt[s.kind] = arr
	sock = nxt

func _load_template(tid: String) -> void:
	var t: Dictionary = app.b.template(tid); if t.is_empty(): return
	cid = t.tray.chassisId; var ch: Dictionary = app.b.item(cid); var nxt := {}
	for s in ch.slots:
		var arr := []; for i in int(s.count): arr.append(null)
		nxt[s.kind] = arr
	for p in t.tray.parts:
		var arr: Array = nxt.get(p.slot, []); var k := 0
		for i in arr.size():
			if arr[i] == null and k < int(p.count): arr[i] = p.itemId; k += 1
	sock = nxt; tname = t.name; sel_kind = ""; sel_idx = -1

func _tray(root: Control, body: VBoxContainer) -> void:
	var b: Bridge = app.b; var g: Dictionary = b.g
	var chl := _chassis_list()
	if cid == "" or b.item(cid).is_empty(): _load_chassis(chl[0].id)
	var ch: Dictionary = b.item(cid)
	var parts := []; var bf16 := 0.0
	for s in ch.slots:
		var m := {}
		for id in _cells(ch, s.kind):
			if id != null: m[id] = m.get(id, 0) + 1
		for id in m: parts.append({"slot": s.kind, "itemId": id, "count": m[id]})
	for p in parts:
		var it: Dictionary = b.item(p.itemId)
		if it.kind == "accelerator": bf16 += float(it.tflops.get("bf16", it.tflops.get("fp16", 0))) * p.count
	var design := {"id": "draft", "name": tname, "chassisId": cid, "parts": parts}
	var v: Dictionary = b.q("validateTray", [design])
	if OS.get_environment("GW_FILL") != "" and not _gwfilled: _gwfilled = true; _autofill(ch)
	var bd := TrayBoard.new(); bd.size_flags_vertical = Control.SIZE_EXPAND_FILL; bd.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bd.ch = ch; bd.sel_kind = _active(ch) if sel_idx >= 0 else ""; bd.sel_idx = sel_idx
	for s in ch.slots: bd.cells[s.kind] = _cells(ch, s.kind)
	for id in b.items: if b.items[id].kind != "chassis": bd.items[id] = b.items[id]
	if not _flash.is_empty(): bd.flash_kind = _flash[0]; bd.flash_idx = _flash[1]; _flash = []
	bd.socket_clicked.connect(func(k, i): sel_kind = k; sel_idx = i; _focus_part = Kit.pad_mode; app.sfx("click"); refresh())
	bd.socket_moved.connect(func(k, i): sel_kind = k; sel_idx = i; refresh())
	var info: Array
	if body == null:   # desktop: bench | right column(s)
		var cols := Kit.cols_row(); root.add_child(cols)
		var bench := Kit.panel("Tray bench", true, cols); bench[0].size_flags_stretch_ratio = 1.6; bench[0].size_flags_vertical = Control.SIZE_EXPAND_FILL
		_tray_tools(bench[1], ch, chl, false)
		bench[1].add_child(bd)
		_prose(bench[1], str(ch.codex.summary), 12)
		if tmsg != "": bench[1].add_child(Kit.label(tmsg, 13, Kit.AM, true))
		var col := Kit.column(cols, 640 if app.vw() > 2300.0 else 560, false, true)
		var col2 := Kit.column(cols, 600, false, true) if app.vw() > 2300.0 else col   # ultrawide: two columns, the board gets the rest
		col.add_child(Kit.tip("This is a server tray. Click a socket on the board and pick a part. Watch the Sizing advisor: GPUs set the power and NIC needs, CPUs set PCIe lanes and memory channels — and everything you add costs money per GPU-hour."))
		_tray_picker(col, ch)
		info = [col2, col2]
	elif _side():   # board and picker side by side, both the height of the screen
		var row := HBoxContainer.new(); row.add_theme_constant_override("separation", 12); body.add_child(row)
		var bench := Kit.panel("Tray bench", true, row); bench[0].size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var fr := ScrollContainer.new(); fr.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; fr.custom_minimum_size.y = _row_h() - 64.0; fr.size_flags_horizontal = Control.SIZE_EXPAND_FILL; bench[1].add_child(fr)
		bd.fit_width = true; bd.custom_minimum_size.y = 200.0; bd.size_flags_vertical = Control.SIZE_FILL; fr.add_child(bd)   # finger-sized sockets: the board takes the width and scrolls in its frame
		var side := _side_col(row, _side_w(), _row_h())
		if tmsg != "": side.add_child(Kit.label(tmsg, 13, Kit.AM, true))
		_tray_picker(side, ch)   # the picker first: a tapped socket's parts are at the top of the column, beside the board
		var tp := Kit.panel("Board", false, side); _tray_tools(tp[1], ch, chl, true)
		info = _info_cols(body)
	else:   # narrow: tools, the board at full width, its picker right under it
		var bench := Kit.panel("Tray bench", true, body)
		_tray_tools(bench[1], ch, chl, true)
		bd.fit_width = true; bd.custom_minimum_size.y = 200.0; bd.size_flags_vertical = Control.SIZE_FILL; bench[1].add_child(bd)
		if tmsg != "": bench[1].add_child(Kit.label(tmsg, 13, Kit.AM, true))
		_tray_picker(body, ch)
		info = _info_cols(body)
	var vp := Kit.panel("Live validation", true, info[0])
	var req_pcie: int = int(ch.pcieLanesAvail)
	vp[1].add_child(Kit.stats([["Power", "%.1f kW" % (v.stats.watts / 1000.0)], ["Cost", Kit.usd(v.stats.costUSD)], ["Accelerators", str(int(v.stats.accels))], ["FP8 / BF16", "%s / %s PF" % [Kit.num(v.stats.tflopsFp8 / 1000.0, 1), Kit.num(bf16 / 1000.0, 1)]], ["HBM", "%s GB" % Kit.num(v.stats.memGB)], ["PCIe lanes", "%d/%d" % [int(v.stats.pcieLanesUsed), req_pcie]]], 2))
	if parts.is_empty(): vp[1].add_child(Kit.issue("info", "Empty tray", "Nothing installed yet. Pick a socket and add accelerators, CPUs, memory and NICs — or press Auto-fill."))
	else: Kit.issues(vp[1], v.issues)
	var sr := _pair(); vp[1].add_child(sr)
	var le := LineEdit.new(); Kit.style_edit(le, true); _tap(le); le.text = tname; le.placeholder_text = "Tray name"; le.set_meta("key", "tname"); le.custom_minimum_size.x = 120; le.size_flags_horizontal = Control.SIZE_EXPAND_FILL; le.text_changed.connect(func(t): tname = t); sr.add_child(le)
	var has_err: bool = v.issues.any(func(i): return i.severity == "error")
	var save := Kit.btn("SAVE TRAY", func(): var d := design.duplicate(); d["id"] = "tray-%d" % (g.trays.size() + 1); d["name"] = tname; tmsg = b.act("saveTray", [d]).message; app.sfx("buy"); refresh(), "go", 14); save.disabled = has_err or parts.is_empty(); sr.add_child(save)
	_sizing(info[1], design)
	var sp := Kit.panel("Saved trays", false, info[1])
	if g.trays.is_empty(): sp[1].add_child(Kit.label("None yet. Fill the sockets, name the tray and press SAVE TRAY; saved trays go into racks on the Rack bench.", 12, Kit.DIM, true))
	for t in g.trays: sp[1].add_child(Kit.label(("%s · %s · %s" % [t.id, t.name, b.item(t.chassisId).get("name", "")]) if not Layout.phone else str(t.name), 12, Kit.TX, true))

func _tray_tools(parent: Control, ch: Dictionary, chl: Array, stacked: bool) -> void:
	var b: Bridge = app.b
	var tools: Container = VBoxContainer.new() if stacked else HFlowContainer.new(); tools.add_theme_constant_override("h_separation", 8); tools.add_theme_constant_override("separation", 8); _gap(tools); parent.add_child(tools)
	var copts := []; for c in chl: copts.append([c.id, "%s (%s, %sU)" % [c.name, c.cooling, int(c.rackUnits)]])
	var co := BK.slim(Kit.option(copts, cid, func(id):
		var filled := 0
		for k in sock: for x in sock[k]: if x != null: filled += 1
		if id == cid: return
		if filled == 0: _load_chassis(id); refresh()
		else: Kit.confirm(app, "Switch chassis? The %s fitted to this tray will be cleared." % Kit.plural(filled, "part"), func(): _load_chassis(id); refresh(), "Switch"); refresh()), 260.0 if not stacked else 150.0); tools.add_child(_tap(co))
	var topts := [["", "load pre-built system…"]]
	for t in b.templates:
		if t.availableFrom <= b.year() and (t.get("eolAfter") == null or b.year() <= t.eolAfter): topts.append([t.id, "%s — %s" % [t.name, t.integrator]])
	var to := BK.slim(Kit.option(topts, "", func(id): if id != "": _load_template(id); refresh()), 220.0 if not stacked else 150.0); tools.add_child(_tap(to))
	var br := HBoxContainer.new(); br.add_theme_constant_override("separation", 8); tools.add_child(br)
	var af := Kit.btn("Auto-fill", func(): _autofill(ch); _flash = [ch.slots[0].kind, -1]; refresh(), "", 13); var cl := Kit.btn("Clear", func(): sock = {}; refresh(), "", 13)
	br.add_child(af); br.add_child(cl)
	if stacked: af.size_flags_horizontal = Control.SIZE_EXPAND_FILL; cl.size_flags_horizontal = Control.SIZE_EXPAND_FILL

## Part picker for the selected socket: zone buttons, compatible parts (available first), remove / codex.
func _tray_picker(col: Control, ch: Dictionary) -> void:
	var b: Bridge = app.b
	var active := _active(ch)
	var ip := Kit.panel("Install into: %s%s" % [ZONE.get(active, active), (" #%d" % (sel_idx + 1)) if sel_idx >= 0 else ""], true, col)
	if Layout.phone: ip[1].add_theme_constant_override("separation", 12)
	var sk := HFlowContainer.new(); sk.add_theme_constant_override("h_separation", 5); sk.add_theme_constant_override("v_separation", 5); _gap(sk); ip[1].add_child(sk)
	for s in ch.slots:
		var filled := _cells(ch, s.kind).filter(func(x): return x != null).size()
		sk.add_child(Kit.btn("%s %d/%d" % [ZONE.get(s.kind, s.kind), filled, int(s.count)], func(): sel_kind = s.kind; sel_idx = maxi(0, _cells(ch, s.kind).find(null)); refresh(), "pri" if active == s.kind else "", 13 if Layout.phone else 12))
	for s in ch.slots:
		if s.kind == active:
			ip[1].add_child(Kit.label(("Needs ≥ %d" % int(s.required) if s.get("required") != null else "Optional") + ((" · accepts " + " / ".join(s.accepts)) if s.get("accepts") != null else ""), 11, Kit.DIM, true))
	var opts: Array = b.q("slotOptions", [cid, active]).duplicate(); var cur_id = null
	opts.sort_custom(func(x, y): return x.available and not y.available)   # what you can buy now first
	if sel_idx >= 0: cur_id = _cells(ch, active)[sel_idx] if sel_idx < _cells(ch, active).size() else null
	var ar := HBoxContainer.new(); ar.add_theme_constant_override("separation", 10)
	if cur_id != null:   # what is in the socket now, and how to take it out: above the long list so it is never scrolled away
		ip[1].add_child(Kit.label("In socket: " + str(b.item(cur_id).get("name", cur_id)), 13, Kit.TX, true))
		ip[1].add_child(ar)
		ar.add_child(Kit.btn("Remove" if Layout.compact else "Remove from socket", func(): var arr := _cells(ch, active); arr[sel_idx] = null; sock[active] = arr; refresh(), "", 12)); ar.add_child(Kit.btn("Codex", func(): app.learn(cur_id), "", 12))
	if opts.is_empty(): ip[1].add_child(Kit.label("Nothing compatible exists for this socket.", 13, Kit.DIM))
	var shown := 0; var later := 0
	for o in opts:
		if not o.available:
			later += 1
			if later > (6 if Layout.compact else 30): continue
		shown += 1
		if shown > 60: break
		var it: Dictionary = o.item; var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 6); ip[1].add_child(r)
		var specs := " · ".join(Kit.specs_of(it).slice(0, 3 if not Layout.phone else 2).map(func(x): return "%s: %s" % [x[0], x[1]]))
		var rb := BK.wrap_btn(Kit.btn("%s\n%s · %s" % [str(it.name), specs, Kit.usd(o.unitPrice) if o.available else "ships %d" % int(it.availableFrom)], func(): if o.available: _install(ch, it.id); app.sfx("click"); refresh(), "pri" if cur_id == it.id else "", 12))
		rb.disabled = not o.available; rb.set_meta("part", true); r.add_child(rb)
		if o.available: r.add_child(Kit.btn("fill all", func(): var arr := _cells(ch, active).map(func(x): return x if x != null else it.id); sock[active] = arr; tmsg = ""; _flash = [active, -1]; refresh(), "", 11))
	if later > (6 if Layout.compact else 30): ip[1].add_child(Kit.label("+%d more that are not shipping yet." % (later - (6 if Layout.compact else 30)), 11, Kit.DIM))
	if not Layout.compact: ip[1].add_child(Kit.label("Click a socket on the board to target it, then click a part to install it there (it advances to the next empty socket). “fill all” populates every empty socket of that type. Arrow keys move between sockets.", 11, Kit.DIM, true))

func _row(parent: Control, ok, text: String) -> void:
	var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 6); parent.add_child(h)
	h.add_child(Kit.label("·" if ok == null else ("✓" if ok else "✗"), 13, Kit.DIM if ok == null else (Kit.GR if ok else Kit.RD))); h.add_child(Kit.label(text, 12, Kit.TX, true))

func _sizing(col: Control, design: Dictionary) -> void:
	var s = app.b.q("traySizing", [design]); if s == null: return
	var p: Array = Kit.fold_panel("Sizing & cost advisor", "sizing", _folds, refresh, true, col, true) if Layout.phone else Kit.panel("Sizing & cost advisor", true, col); var v: VBoxContainer = p[1]
	v.add_child(Kit.label("Power supplies", 13, Kit.CY)); v.add_child(Kit.bar(s.draw, maxf(1.0, s.psuW)))
	if not Layout.phone: v.add_child(Kit.label("draw %.1f kW · PSU capacity %.1f kW (%d × %.1f kW) · chassis limit %.1f kW" % [s.draw / 1000.0, s.psuW / 1000.0, int(s.psuCount), s.unitW / 1000.0, s.chassisMaxW / 1000.0], 11, Kit.DIM, true))
	_row(v, s.psuW >= s.draw, "Capacity covers the %d-GPU draw%s" % [int(s.gpus), " — add PSUs" if s.psuW < s.draw else ""])
	_row(v, s.redundantOK, ("N+1 redundancy: one PSU can fail without a brownout%s" if not Layout.phone else "N+1 redundancy%s") % ((" — need ≥ %d PSUs (you have %d)" % [int(s.need) + 1, int(s.psuCount)]) if (not s.redundantOK and s.unitW > 0) else ""))
	_row(v, s.draw <= s.chassisMaxW, "Within the chassis busbar limit")
	v.add_child(Kit.label("PCIe lanes & CPUs", 13, Kit.CY)); v.add_child(Kit.bar(s.lanesUsed, maxf(1.0, s.lanesAvail)))
	if not Layout.phone: v.add_child(Kit.label("%d/%d lanes used · %d CPU%s × %d lanes" % [int(s.lanesUsed), int(s.lanesAvail), int(s.cpuN), "" if s.cpuN == 1 else "s", int(s.cpuLanes)], 11, Kit.DIM))
	if not Layout.phone: _row(v, s.lanesUsed <= s.lanesAvail, "One CPU gives half the lanes of two — fine for 4 GPUs/NVMe-light trays, starved for 8 GPUs + 8 NICs." if s.cpuN <= 1 else ("Two CPUs: the standard 8-GPU layout — each CPU feeds half the GPUs/NICs, UPI link between them." if s.cpuN == 2 else "Four CPUs: only worth it for huge memory or lane counts; cost and power go up."))
	if s.cpuHint != null and not Layout.phone: v.add_child(Kit.label("1 CPU = %d lanes · %d mem channels · %d W · %s (%s). Cheaper CPUs cut cost but may cut lanes/channels." % [int(s.cpuHint.lanes), int(s.cpuHint.channels), int(s.cpuHint.tdp), Kit.usd(s.cpuHint.price), s.cpuHint.name], 11, Kit.DIM, true))
	v.add_child(Kit.label("NICs (scale-out)", 13, Kit.CY))
	if not Layout.phone: v.add_child(Kit.label("%d NICs = %s Gbps → %.1f GB/s per GPU · training customers expect ≥ %.1f GB/s in %d" % [int(s.nicCount), Kit.num(s.nicGbps), s.perGpu, s.tier, int(s.year)], 11, Kit.DIM, true))
	_row(v, s.perGpu >= s.tier * 0.98, "Meets today's training bandwidth tier." if s.perGpu >= s.tier * 0.98 else "Short of the tier — %s for %d GPUs. Inference-only trays can get away with less." % [("need ~%d × %s (%dG, x%d lanes each)" % [int(s.nicNeed), s.bestNic.name, int(s.bestNic.gbps), int(s.bestNic.lanes)]) if s.bestNic != null else "newer NICs", int(s.gpus)])
	if not Layout.phone: _row(v, null, "Rule of thumb: one NIC per GPU (\"rail-optimized\") for training; one per 2 GPUs is fine for inference.")
	v.add_child(Kit.label("Memory & storage", 13, Kit.CY))
	if not Layout.phone: v.add_child(Kit.label("%d DIMMs on %s channels · host RAM %s GB vs %s GB of GPU HBM" % [int(s.dimms), str(int(s.channels)) if s.channels > 0 else "?", Kit.num(s.hostRam), Kit.num(s.hbm)], 11, Kit.DIM, true))
	_row(v, s.channels == 0 or s.dimms >= s.channels, "All memory channels populated (full host bandwidth)." if (s.channels == 0 or s.dimms >= s.channels) else "Only %d/%d channels populated — host bandwidth is wasted." % [int(s.dimms), int(s.channels)])
	if not Layout.phone: _row(v, s.hostRam >= s.hbm * 0.5 or s.hbm == 0, "Host RAM ≥ ~½ of HBM keeps checkpointing and data loading smooth.")
	v.add_child(Kit.hsep()); v.add_child(Kit.label("Cost over a long contract (5-year TCO)", 13, Kit.CY))
	var gp: float = s.gpus
	v.add_child(Kit.stats([["Capex / GPU", Kit.usd(s.capex / gp) if gp > 0 else "—"], ["Power / GPU / month", Kit.usd(s.powerMo / gp) if gp > 0 else "—"], ["Break-even $/GPU-hr (100% used)", "$%.2f" % s.costHr if gp > 0 else "—"], ["Break-even at 60% used", "$%.2f" % (s.costHr / 0.6) if gp > 0 else "—"]], 2))
	if gp > 0: _row(v, s.costHr / 0.6 < s.price, "Market pays ≈ $%.2f/GPU-hr this year%s" % [s.price, (" — a %d%% margin at 60%% utilisation." % int(round((1.0 - s.costHr / 0.6 / s.price) * 100.0))) if s.costHr / 0.6 < s.price else " — this tray does not break even at 60% use; cut cost or raise utilisation."])
	if not Layout.phone: v.add_child(Kit.label("To lower cost for a long contract: drop unneeded NICs/NVMe/CPUs, keep PSU count at N+1 (not more), choose the GPU with the best price per HBM-GB for inference or per PFLOP for training.", 11, Kit.DIM, true))

# ======================= RACK LAB =======================
func _unit_per(it: Dictionary) -> int:
	var b: Bridge = app.b
	if it.type == "tray":
		for t in b.g.trays:
			if t.id == it.trayId: return int(b.item(t.chassisId).get("rackUnits", 1))
		return 1
	if it.type == "switch": return maxi(1, int(b.item(it.switchId).get("rackUnits", 1)))
	if it.type == "storage": return int(b.item(it.storageId).get("rackUnits", 2))
	return 2
func _height(it: Dictionary) -> int: return 2 if it.type == "power" else _unit_per(it) * int(it.count)
func _meta(it: Dictionary) -> Dictionary:
	var b: Bridge = app.b
	if it.type == "tray":
		var t := {}; for x in b.g.trays:
			if x.id == it.trayId: t = x
		var w := 0.0
		if not t.is_empty(): w = b.q("validateTray", [t]).stats.watts
		return {"label": t.get("name", it.trayId), "kw": w * it.count / 1000.0, "sub": "%dU each" % _unit_per(it)}
	if it.type == "switch": var sw: Dictionary = b.item(it.switchId); return {"label": sw.get("name", it.switchId), "kw": float(sw.get("watts", 0)) * it.count / 1000.0, "sub": str(sw.get("role", "switch"))}
	if it.type == "storage": var st: Dictionary = b.item(it.storageId); return {"label": st.get("name", it.storageId), "kw": float(st.get("watts", 0)) * it.count / 1000.0, "sub": "storage"}
	var pw: Dictionary = b.item(it.powerId); return {"label": pw.get("name", it.powerId), "kw": 0.0, "sub": str(pw.get("powerType", "power"))}
func _occ(units: int, list: Array, skip := -1) -> Array:
	var o := []; o.resize(units); o.fill(-1)
	for i in list.size():
		if i == skip: continue
		var s: int = int(list[i].get("u", 0)); var h := _height(list[i])
		for u in range(s, mini(units, s + h)): o[u] = i
	return o
func _fits(units: int, list: Array, h: int, s: int, skip := -1) -> bool:
	if s < 0 or s + h > units: return false
	var o := _occ(units, list, skip)
	for u in range(s, s + h):
		if o[u] != -1: return false
	return true
func _first_free(units: int, list: Array, h: int, from_top: bool) -> int:
	var order := range(units); if from_top: order.reverse()
	for u in order:
		var s: int = u - h + 1 if from_top else u
		if _fits(units, list, h, s): return s
	return -1
func _make(a: Dictionary) -> Dictionary:
	match a.kind:
		"tray": return {"type": "tray", "trayId": a.id, "count": 1}
		"switch": return {"type": "switch", "switchId": a.id, "count": 1}
		"storage": return {"type": "storage", "storageId": a.id, "count": 1}
	return {"type": "power", "powerId": a.id, "count": 1}
func _place_at(units: int, a: Dictionary, u: int) -> void:
	if a.is_empty(): return
	var it := _make(a); var h := _height(it); var s := -1
	if u >= 0: s = u if _fits(units, ritems, h, u) else (u - h + 1 if _fits(units, ritems, h, u - h + 1) else -1)
	else: s = _first_free(units, ritems, h, a.kind == "switch")
	if s < 0: rmsg = "%s needs %d free U%s — free some space or pick another spot." % [_meta(it).label, h, " at that position" if u >= 0 else ""]; return
	it["u"] = s; ritems.append(it); rmsg = ""; sel_u = -1; _rflash = [s, h]
func _layout(units: int, list: Array) -> Array:
	var copy := list.duplicate(true); var bottom := []; var mid := []; var topl := []
	for x in copy:
		if x.type == "power" or x.type == "storage": bottom.append(x)
		elif x.type == "tray": mid.append(x)
		else: topl.append(x)
	var u := 0
	for it in bottom + mid: it["u"] = u; u += _height(it)
	var t := units
	for it in topl: t -= _height(it); it["u"] = maxi(u, t)
	return copy
func _load_rack(id: String) -> void:
	for d in app.b.g.racks:
		if d.id == id:
			rid = d.rackId; var units: int = int(app.b.item(rid).units); var needs: bool = d.items.any(func(i): return i.get("u") == null)
			ritems = _layout(units, d.items) if needs else d.items.duplicate(true); cool = d.coolingInterface; rname = d.name + " (copy)"; return

func _rack(root: Control, body: VBoxContainer) -> void:
	var b: Bridge = app.b; var g: Dictionary = b.g; var offers: Dictionary = b.q("offersAll")
	var racks := []; for it in b.items.values():
		if it.kind == "rack" and offers[it.id].available: racks.append(it)
	if rid == "" or b.item(rid).is_empty():
		var best = racks[0]; var sorted := racks.duplicate(); sorted.sort_custom(func(a, c): return a.maxKW > c.maxKW)
		for r in sorted:
			if r.cooling.has("air"): best = r; break
		rid = best.id
	var rk: Dictionary = b.item(rid); var units: int = int(rk.units)
	var sorted_items := ritems.duplicate(true); sorted_items.sort_custom(func(a, c): return a.get("u", 0) < c.get("u", 0))
	var design := {"id": "draft", "name": rname, "rackId": rid, "items": sorted_items, "coolingInterface": cool}
	var v: Dictionary = b.q("validateRack", [design, g.trays])
	var bd := RackBoard.new(); bd.size_flags_vertical = Control.SIZE_EXPAND_FILL; bd.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bd.units = units; bd.rack_name = rk.name; bd.max_kw = rk.maxKW; bd.kw = v.stats.kW; bd.sel_u = sel_u; bd.sel_dev = sel_dev; bd.occ = _occ(units, ritems); bd.cursor = _rcur
	if not _rflash.is_empty(): bd.flash_u = _rflash[0]; bd.flash_h = _rflash[1]; _rflash = []
	for i in ritems.size():
		var it: Dictionary = ritems[i]; var m := _meta(it); var cnt := int(it.count)
		bd.devices.append({"i": i, "u": int(it.get("u", 0)), "h": _height(it), "label": m.label, "sub": ("%s · %.1f kW" % [m.sub, m.kw / maxf(1, cnt) if it.type == "tray" else m.kw]), "color": RC[it.type], "kind": it.type, "count": cnt, "unit_h": _unit_per(it) if it.type == "tray" else _height(it)})
	bd.u_clicked.connect(func(u): _rcur = u; if not armed.is_empty(): _place_at(units, armed, u) else: sel_u = -1 if sel_u == u else u; sel_dev = -1; refresh())
	bd.device_clicked.connect(func(i): sel_dev = i; sel_u = -1; refresh())
	bd.u_moved.connect(func(u):
		_rcur = u; var o := _occ(units, ritems)
		if o[u] >= 0: sel_dev = o[u]; sel_u = -1
		else: sel_u = u; sel_dev = -1
		_scroll_u = u; refresh())
	_rack_bd = bd
	var side: VBoxContainer; var info: Array; var tools_last := false
	if body == null:   # desktop: bench | right column(s)
		var cols := Kit.cols_row(); root.add_child(cols)
		var bench := Kit.panel("Rack bench", true, cols); bench[0].size_flags_stretch_ratio = 1.0; bench[0].size_flags_vertical = Control.SIZE_EXPAND_FILL
		_rack_tools(bench[1], racks, false)
		bench[1].add_child(bd)
		if rmsg != "": bench[1].add_child(Kit.label(rmsg, 13, Kit.AM, true))
		side = Kit.column(cols, 560, false, true)
		var col2 := Kit.column(cols, 600, false, true) if app.vw() > 2300.0 else side
		info = [col2, col2]
	elif _side():   # the rack in its own scrolling frame beside the parts, both at screen height
		var row := HBoxContainer.new(); row.add_theme_constant_override("separation", 12); body.add_child(row)
		var fr := ScrollContainer.new(); fr.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; fr.custom_minimum_size.y = _row_h() - 44.0; fr.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var frame := PanelContainer.new(); frame.add_theme_stylebox_override("panel", Kit.sb(Kit.field(), Kit.legible(Kit.LINE, Kit.field(), 1.6), 8, 2, 6)); frame.size_flags_horizontal = Control.SIZE_EXPAND_FILL; frame.add_child(fr); row.add_child(frame)   # a visible frame and margin: the rack diagram no longer runs to the panel's bottom edge
		bd.size_flags_vertical = Control.SIZE_EXPAND_FILL; fr.add_child(bd); _rack_sc = fr
		side = _side_col(row, _side_w(), _row_h())
		if rmsg != "": side.add_child(Kit.label(rmsg, 13, Kit.AM, true))
		tools_last = true
		info = _info_cols(body)
	else:   # narrow: tools, the rack (own frame, a finger per U), its parts right under it
		var bench := Kit.panel("Rack bench", true, body)
		_rack_tools(bench[1], racks, true)
		var fr := ScrollContainer.new(); fr.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; fr.custom_minimum_size.y = minf(_row_h() * 0.85, 50.0 + units * bd.min_row + 26.0); bench[1].add_child(fr)
		fr.add_child(bd); _rack_sc = fr
		if rmsg != "": bench[1].add_child(Kit.label(rmsg, 13, Kit.AM, true))
		side = VBoxContainer.new(); side.add_theme_constant_override("separation", 10); body.add_child(side)
		info = _info_cols(body)
	if sel_dev >= 0 and sel_dev < ritems.size():
		var it: Dictionary = ritems[sel_dev]; var sp := Kit.panel("Selected: %s   U%d–%d" % [BK.ell(_meta(it).label, 26), int(it.get("u", 0)) + 1, int(it.get("u", 0)) + _height(it)], true, side)
		var h := HFlowContainer.new(); h.add_theme_constant_override("h_separation", 6); h.add_theme_constant_override("v_separation", 6); _gap(h); sp[1].add_child(h)
		if it.type != "power":
			h.add_child(Kit.btn("− count", func(): _bump(units, sel_dev, -1); refresh(), "", 12)); h.add_child(Kit.label(str(int(it.count)), 15)); h.add_child(Kit.btn("+ count", func(): _bump(units, sel_dev, 1); refresh(), "", 12))
		h.add_child(Kit.btn("▲ up", func(): _nudge(units, sel_dev, 1); refresh(), "", 12)); h.add_child(Kit.btn("▼ down", func(): _nudge(units, sel_dev, -1); refresh(), "", 12))
		if Layout.compact: sp[1].add_child(Kit.hsep())
		(sp[1] if Layout.compact else h).add_child(Kit.btn("remove", func(): ritems.remove_at(sel_dev); sel_dev = -1; refresh(), "danger", 12))
	var tap_place := Layout.touch or Layout.compact   # touch: a tap on a part places it (at the chosen U, else the best free spot)
	var ip := Kit.panel("Install into rack", true, side)
	if Layout.phone: ip[1].add_theme_constant_override("separation", 12)
	var tb := GridContainer.new(); tb.columns = 2 if (Layout.compact or body != null) else 4; tb.add_theme_constant_override("h_separation", 6 if not Layout.phone else 10); tb.add_theme_constant_override("v_separation", 6 if not Layout.phone else 10)
	ip[1].add_child(tb)
	for k in [["switch", "ToR / switches"], ["tray", "Compute trays"], ["power", "Power"], ["storage", "Storage"]]:
		var kb := Kit.btn(k[1], func(): rtab = k[0]; refresh(), "pri" if rtab == k[0] else "", 12 if not Layout.phone else 13); kb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; tb.add_child(kb)
	if not tap_place: ip[1].add_child(Kit.label(("Target: U%d. " % (sel_u + 1) if sel_u >= 0 else "No U selected — Add puts it in the best free spot (switches go to the top). ") + ("A part is armed — click an empty U to place it." if not armed.is_empty() else ""), 11, Kit.DIM, true))
	var palette := []
	if rtab == "tray":
		for t in g.trays:
			var tv: Dictionary = b.q("validateTray", [t]); palette.append({"id": t.id, "name": t.name, "sub": "%sU · %.1f kW · %d accel" % [int(b.item(t.chassisId).get("rackUnits", 1)), tv.stats.watts / 1000.0, int(tv.stats.accels)], "kind": "tray", "ok": true, "price": 0.0})
	else:
		for it in b.items.values():
			var o: Dictionary = offers[it.id]
			if rtab == "switch" and it.kind == "switch" and it.rackUnits > 0: palette.append({"id": it.id, "name": it.name, "sub": "%s · %sU" % [it.role, int(it.rackUnits)], "kind": "switch", "ok": o.available, "price": o.unitPrice})
			elif rtab == "storage" and it.kind == "storage": palette.append({"id": it.id, "name": it.name, "sub": "%s PB · %s GB/s · %sU" % [it.capacityPB, it.readGBs, int(it.rackUnits)], "kind": "storage", "ok": o.available, "price": o.unitPrice})
			elif rtab == "power" and it.kind == "power" and ["pdu", "power-shelf"].has(it.get("powerType", "")): palette.append({"id": it.id, "name": it.name, "sub": "%s · %s kW" % [it.powerType, it.capacityKW], "kind": "power", "ok": o.available, "price": o.unitPrice})
	if Layout.compact: palette = palette.filter(func(x): return x.ok)
	if palette.is_empty(): ip[1].add_child(Kit.label("No saved trays — build one on the Tray bench or load a pre-built rack." if rtab == "tray" else "Nothing here yet.", 12, Kit.DIM, true))
	if tap_place: ip[1].add_child(Kit.label(("Adds at U%d — tap a part" % (sel_u + 1)) if sel_u >= 0 else "Tap a part to add it in the best free spot, or tap an empty U on the rack first.", 12, Kit.DIM, true))
	for p in palette:
		var on: bool = armed.get("id", "") == p.id; var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 6); ip[1].add_child(r)
		var rb := BK.wrap_btn(Kit.btn("%s\n%s%s" % [str(p.name), p.sub, (" · " + Kit.usd(p.price)) if p.price > 0 else ""], (func(): _place_at(units, {"kind": p.kind, "id": p.id}, sel_u); refresh()) if tap_place else (func(): armed = {} if on else {"kind": p.kind, "id": p.id}; refresh()), "pri" if on else "", 12))
		rb.disabled = not p.ok; rb.set_meta("part", true); r.add_child(rb)
		if not tap_place: var ab := Kit.btn("Add", func(): _place_at(units, {"kind": p.kind, "id": p.id}, sel_u); refresh(), "", 12); ab.disabled = not p.ok; r.add_child(ab)
	if not tap_place: ip[1].add_child(Kit.label("Click a part to arm it and click the U where it should sit, or press Add. Zones are hints: ToR switches at the top, compute in the middle, power/storage at the bottom. Arrow keys move along the rack.", 11, Kit.DIM, true))
	if tools_last: var rp := Kit.panel("Rack", false, side); _rack_tools(rp[1], racks, true)   # beside the rack: parts first, rack type below
	var vp := Kit.panel("Rack validation", true, info[0])
	vp[1].add_child(Kit.stats([["Power", "%d / %s kW" % [int(v.stats.kW), rk.maxKW], Kit.RD if v.stats.kW > rk.maxKW else Kit.TX], ["Units", "%d/%d" % [int(v.stats.units), units]], ["Weight", "%s kg" % Kit.num(v.stats.weightKg)], ["Cost", Kit.usd(v.stats.costUSD)], ["Accels", str(int(v.stats.accels))], ["Scale-up", str(int(v.stats.scaleUpDomain))]], 3))
	if ritems.is_empty(): vp[1].add_child(Kit.issue("info", "Empty rack", "Nothing installed yet. Add compute trays (save one on the Tray bench first), a ToR switch at the top and power at the bottom — or load a pre-built rack."))
	else: Kit.issues(vp[1], v.issues)
	var sr := _pair(); vp[1].add_child(sr)
	var le := LineEdit.new(); Kit.style_edit(le, true); _tap(le); le.text = rname; le.placeholder_text = "Rack name"; le.set_meta("key", "rname"); le.custom_minimum_size.x = 120; le.size_flags_horizontal = Control.SIZE_EXPAND_FILL; le.text_changed.connect(func(t): rname = t); sr.add_child(le)
	var has_err: bool = v.issues.any(func(i): return i.severity == "error")
	var save := Kit.btn("SAVE RACK", func(): var d := design.duplicate(true); d["id"] = "rack-%d" % (g.racks.size() + 1); d["name"] = rname; rmsg = b.act("saveRack", [d]).message; app.sfx("buy"); refresh(), "go", 14); save.disabled = has_err or ritems.is_empty(); sr.add_child(save)
	var sv := Kit.panel("Saved racks", false, info[1])
	if g.racks.is_empty(): sv[1].add_child(Kit.label("None yet. Saved racks can be bought and deployed from Supply and the Warehouse.", 12, Kit.DIM, true))
	for r in g.racks: sv[1].add_child(Kit.label(("%s · %s" % [r.id, r.name]) if not Layout.phone else str(r.name), 12, Kit.TX, true))

func _rack_tools(parent: Control, racks: Array, stacked: bool) -> void:
	var b: Bridge = app.b; var g: Dictionary = b.g
	var tools: Container = GridContainer.new() if stacked else HFlowContainer.new(); tools.add_theme_constant_override("h_separation", 8); tools.add_theme_constant_override("v_separation", 8); _gap(tools); parent.add_child(tools)
	if stacked: (tools as GridContainer).columns = 2
	var mw := 130.0 if stacked else 200.0
	var ropts := []; for r in racks: ropts.append([r.id, "%s (%dU, %s kW)" % [r.name, int(r.units), r.maxKW]])
	tools.add_child(_tap(BK.slim(Kit.option(ropts, rid, func(id):
		var go := func(): rid = id; ritems = []; sel_dev = -1; refresh()
		if id == rid: return
		if ritems.is_empty(): go.call()   # nothing placed yet: nothing to lose
		else: Kit.confirm(app, "Switch rack model? The %s placed in this rack will be cleared." % Kit.plural(ritems.size(), "device"), go, "Switch"); refresh()), mw)))
	tools.add_child(_tap(BK.slim(Kit.option(["air", "rdhx", "dlc", "immersion"], cool, func(c): cool = c; refresh()), 100.0)))
	var topts := [["", "pre-built rack…"]]
	for t in b.templates:
		if t.availableFrom <= b.year() and (t.get("eolAfter") == null or b.year() <= t.eolAfter): topts.append([t.id, "%s — %s" % [t.name, t.integrator]])
	tools.add_child(_tap(BK.slim(Kit.option(topts, "", func(id): _adopt(id)), mw)))
	if g.racks.size() > 0:
		var sopts := [["", "open saved…"]]; for r in g.racks: sopts.append([r.id, r.name])
		tools.add_child(_tap(BK.slim(Kit.option(sopts, "", func(id): if id != "": _load_rack(id); refresh()), mw)))
	var cb := Kit.btn("Clear", func(): ritems = []; sel_dev = -1; refresh(), "", 13); cb.size_flags_horizontal = Control.SIZE_EXPAND_FILL if stacked else Control.SIZE_FILL; tools.add_child(cb)

func _adopt(id: String) -> void:
	if id == "": return
	var r: Dictionary = app.b.act("adoptTemplate", [id])
	if r.ok: _load_rack("rack-" + id)
	else: rmsg = r.message
	refresh()

func _bump(units: int, i: int, d: int) -> void:
	var it: Dictionary = ritems[i]; var c: int = int(it.count) + d
	if c <= 0: ritems.remove_at(i); sel_dev = -1; return
	var n := it.duplicate(); n["count"] = c
	if it.type != "power" and not _fits(units, ritems, _height(n), int(it.get("u", 0)), i): rmsg = "No free U above it — move it or free space first."; return
	ritems[i] = n; rmsg = ""
func _nudge(units: int, i: int, d: int) -> void:
	var it: Dictionary = ritems[i]; var s: int = int(it.get("u", 0)) + d
	if not _fits(units, ritems, _height(it), s, i): rmsg = "Blocked by another device or the rack edge."; return
	var n := it.duplicate(); n["u"] = s; ritems[i] = n
