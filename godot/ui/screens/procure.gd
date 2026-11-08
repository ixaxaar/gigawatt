class_name ProcureScreen
extends Control
## Procurement: Guided planner (platform -> how many -> how to buy -> hall check -> BOM -> order) and the advanced Parts bin.

var app
static var next_tab := OS.get_environment("GW_PTAB")
var tab := "plan"
var road_open := ""
var plat := ""
var want := 64
var tier_sel := ""
var pmsg: Dictionary = {}
var kind := "accelerator"
var vendor := "all"
var future := false
var sel := ""
var qty := 8
var spares := true
var bmsg := ""
const KINDS := ["accelerator", "cpu", "nic", "switch", "cable", "chassis", "rack", "power", "cooling", "storage", "memory", "nvme"]
const TIER := {"diy": ["DIY", "Build it yourself"], "oem": ["OEM", "OEM integrated rack"], "turnkey": ["TURNKEY", "Turnkey / reference"]}

func _ready() -> void: set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

func refresh() -> void: Kit.rebuild_keep(self, _rebuild)

func _rebuild() -> void:
	if showroom != null and showroom.get_parent() != null: showroom.get_parent().remove_child(showroom)   # keep the turntable (and its spin) across refreshes
	for c in get_children(): c.queue_free()
	if next_tab != "": tab = next_tab; next_tab = ""
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := Kit.head_row(8); root.add_child(hd)
	hd.add_child(Kit.label("PROCUREMENT", 26, Kit.CY))
	hd.add_child(Kit.btn("Guided planner", func(): tab = "plan"; refresh(), "pri" if tab == "plan" else ""))
	hd.add_child(Kit.btn("Parts bin (advanced)", func(): tab = "parts"; refresh(), "pri" if tab == "parts" else ""))
	hd.add_child(Kit.btn("Roadmap", func(): tab = "road"; refresh(), "pri" if tab == "road" else ""))
	if tab == "road": _roadmap(root)
	elif tab == "plan": _planner(root)
	else: _parts(root)

# ---------- guided planner ----------
func _state(p: String) -> Dictionary:
	var b: Bridge = app.b; var ts := b.templates.filter(func(t): return t.platform == p)
	var a: Dictionary = ts[0]; var y := b.year(); var from: float = a.availableFrom; var eol = a.get("eolAfter")
	var pre := false; var ships := 0
	if y < from:
		var qq: Dictionary = b.q("quote", [a.id, 1]); pre = qq.unavailable.is_empty(); ships = int(qq.get("ships", 0))
	return {"ts": ts, "from": from, "live": (y >= from and (eol == null or y <= float(eol))) or pre, "future": y < from, "pre": pre, "ships": ships}

var showroom: Showroom

func _vendor_of(chassis: String) -> String:
	return "nvidia" if chassis.begins_with("nv") else ("cerebras" if chassis.begins_with("cb") else ("tenstorrent" if chassis.begins_with("tt") else ("intel" if chassis.begins_with("int") else "amd")))

func _showroom(c1: VBoxContainer, platforms: Array, t: Dictionary, f: Dictionary, checks: Array) -> void:
	var b: Bridge = app.b; var st := _state(plat)
	if showroom == null: showroom = Showroom.new()
	var row := HBoxContainer.new(); row.add_theme_constant_override("separation", 10); c1.add_child(row)
	var left := VBoxContainer.new(); left.size_flags_horizontal = Control.SIZE_EXPAND_FILL; left.size_flags_stretch_ratio = 1.7; left.add_theme_constant_override("separation", 6); row.add_child(left)
	left.add_child(showroom)
	showroom.set_spec(RackModel.spec_from_template(b, t, f), not st.live)
	var tb := HBoxContainer.new(); tb.add_theme_constant_override("separation", 8); left.add_child(tb)
	var door_b := Kit.btn("Door: open" if showroom.door_open else "Door: closed", func(): showroom.set_door(not showroom.door_open); app.sfx("click"); refresh(), "pri" if showroom.door_open else "", 14)
	var cab_b := Kit.btn("Cables: on" if showroom.cables_on else "Cables: off", func(): showroom.set_cables(not showroom.cables_on); app.sfx("click"); refresh(), "pri" if showroom.cables_on else "", 14)
	tb.add_child(door_b); tb.add_child(cab_b); tb.add_child(Kit.label("Drag to spin · wheel to zoom", 13, Kit.DIM))
	# overlay card: what it is, and whether your hall can take it
	var card := PanelContainer.new(); card.add_theme_stylebox_override("panel", Kit.card_sb(Kit.accent, Kit.PANEL_FILL, 2, 12)); card.size_flags_horizontal = Control.SIZE_EXPAND_FILL; row.add_child(card)
	var cv := VBoxContainer.new(); cv.add_theme_constant_override("separation", 6); card.add_child(cv)
	var vend := _vendor_of(str(t.tray.chassisId))
	var hr := HBoxContainer.new(); hr.add_theme_constant_override("separation", 8); cv.add_child(hr); hr.add_child(Logo.make(vend.capitalize(), 34.0)); hr.add_child(Kit.label(plat, 17, Kit.TX if st.live else Kit.DIM, true))
	var status := "In stock" if st.live and not st.pre else ("PRE-ORDER · ships %s" % Kit.date_of(st.ships) if st.pre else ("Ships %d (locked)" % int(st.from) if st.future else "End of sale"))
	cv.add_child(Kit.chip(status.to_upper(), Kit.GR if st.live else Kit.AM, 12))
	cv.add_child(Kit.stats([["Accel / rack", str(f.accels)], ["Power", "%d kW" % int(f.kWPerRack)], ["Memory", "%s TB" % Kit.num(f.memGB / 1000.0, 1)], ["Cooling", str(t.rack.cooling)]], 2))
	var ok := true; for c in checks: if not c.ok: ok = false
	var lamp := HBoxContainer.new(); lamp.add_theme_constant_override("separation", 8); cv.add_child(lamp)
	var dot := ColorRect.new(); dot.color = Kit.GR if ok else Kit.RD; dot.custom_minimum_size = Vector2(14, 14); dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER; lamp.add_child(dot)
	lamp.add_child(Kit.label("Your hall can take it" if ok else "Your hall needs work first", 14, Kit.GR if ok else Kit.RD, true))
	# carousel: one row, scroll sideways
	var sc := ScrollContainer.new(); sc.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.custom_minimum_size = Vector2(0, 92); sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL; c1.add_child(sc)
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 8); sc.add_child(hb)
	var sel_i := 0
	for i in platforms.size():
		var p: String = platforms[i]; var ps := _state(p); var a: Dictionary = ps.ts[0]; var on: bool = p == plat
		if on: sel_i = i
		var chip := PanelContainer.new(); chip.custom_minimum_size = Vector2(200, 0)
		chip.add_theme_stylebox_override("panel", Kit.sb(Kit.SEL if on else Kit.PANEL, Kit.CY if on else Kit.LINE, 8, 2 if on else 1, 8))
		var ch := HBoxContainer.new(); ch.add_theme_constant_override("separation", 8); chip.add_child(ch)
		var lg := Logo.make(_vendor_of(str(a.tray.chassisId)).capitalize(), 28.0); lg.modulate = Color(1, 1, 1, 1.0 if ps.live else 0.45); ch.add_child(lg)
		var cvv := VBoxContainer.new(); cvv.size_flags_horizontal = Control.SIZE_EXPAND_FILL; ch.add_child(cvv)
		cvv.add_child(Kit.label(p, 13, Kit.TX if ps.live else Kit.DIM, true))
		cvv.add_child(Kit.label("PRE-ORDER" if ps.pre else ("ships %d" % int(ps.from) if ps.future else ("end of sale" if not ps.live else "available")), 13, Kit.GR if ps.live else Kit.AM))
		var click := Button.new(); click.flat = true; click.set_anchors_preset(Control.PRESET_FULL_RECT); click.focus_mode = Kit.focus_mode()
		click.pressed.connect(func(): plat = p; tier_sel = ""; app.sfx("click"); refresh())   # locked ones too: they show as silhouettes
		chip.add_child(click); hb.add_child(chip)
	sc.scroll_horizontal = maxi(0, sel_i * 208 - 200)

func _planner(root: Control) -> void:
	var b: Bridge = app.b
	var platforms := []
	for t in b.templates:
		if not platforms.has(t.platform): platforms.append(t.platform)
	if plat == "" or not platforms.has(plat):
		plat = platforms[0]
		for p in platforms:
			if _state(p).live: plat = p; break
	var ts: Array = _state(plat).ts
	var t: Dictionary = ts[1] if ts.size() > 1 else ts[0]
	for x in ts:
		if x.id == tier_sel: t = x
	var f: Dictionary = b.q("templateFacts", [t.id])
	var racks := int(b.q("racksFor", [t.id, want]))
	var q: Dictionary = b.q("quote", [t.id, racks])
	var checks: Array = b.q("hallChecks", [t.id, racks])
	var cant_afford: bool = q.cost > b.g.cash
	var lr := Kit.cols2(root)   # one scrolling column: the drawer is too narrow for three
	# --- step 1: the platform showroom (turntable rack + overlay card) and a one-row carousel
	var c1: VBoxContainer = lr[0]
	c1.add_child(Kit.chip("1 · PLATFORM", Kit.accent, 13))
	_showroom(c1, platforms, t, f, checks)
	# --- column 2: description, how many, how to buy
	var c2: VBoxContainer = lr[0]
	c2.add_child(Kit.tip("Pick a platform (a GPU generation, pre-engineered), say how many accelerators you want, then choose DIY (cheapest, you integrate), an OEM rack, or a turnkey one (priciest, fastest). Check the hall can feed and cool it before you order."))
	var pa := Kit.panel(plat, false, c2); pa[1].add_child(Kit.label(t.codex.explain, 14, Kit.TX, true))
	pa[1].add_child(Kit.stats([["Accel / rack", str(f.accels)], ["Scale-up", str(int(f.scaleUp))], ["Memory / rack", "%s TB" % Kit.num(f.memGB / 1000.0, 1)], ["Power / rack", "%d kW" % int(f.kWPerRack)]]))
	var ph := Kit.panel("2 · How many accelerators?", false, c2)
	var hr := HBoxContainer.new(); hr.add_theme_constant_override("separation", 14); ph[1].add_child(hr)
	var sl := Kit.slider(maxf(f.accels, racks * f.accels), f.accels, f.accels * 64, f.accels, func(_v): pass)
	sl.drag_ended.connect(func(ch): if ch: want = int(sl.value); app.sfx("click"); refresh())
	sl.value_changed.connect(func(v): want = int(v); lbl_hint.text = "%s" % Kit.num(v))
	hr.add_child(sl); lbl_hint = Kit.label(Kit.num(racks * f.accels), 28, Kit.CY); hr.add_child(lbl_hint)
	var pf: float = f.tflopsFp8 if f.tflopsFp8 > 0 else f.tflopsBf16
	ph[1].add_child(Kit.label("= %d rack%s · %s PFLOPS %s · %s TB memory · %d kW" % [racks, "s" if racks > 1 else "", Kit.num(racks * pf / 1000.0, 1), "FP8" if f.tflopsFp8 > 0 else "BF16", Kit.num(racks * f.memGB / 1000.0, 1), int(racks * f.kWPerRack)], 14, Kit.DIM, true))
	var pt := Kit.panel("3 · How do you want to buy it?", false, c2)
	var tg := GridContainer.new(); tg.columns = 3; tg.add_theme_constant_override("h_separation", 10); tg.add_theme_constant_override("v_separation", 10); pt[1].add_child(tg)
	for x in ts:
		var qq: Dictionary = b.q("quote", [x.id, racks]); var on2: bool = x.id == t.id
		var tc := PanelContainer.new(); tc.size_flags_horizontal = Control.SIZE_EXPAND_FILL; tc.add_theme_stylebox_override("panel", Kit.sb(Kit.SEL if on2 else Kit.PANEL, Kit.CY if on2 else Kit.LINE, 10, 2 if on2 else 1, 10))
		var tv := VBoxContainer.new(); tv.add_theme_constant_override("separation", 3); tc.add_child(tv)
		tv.add_child(Kit.label(TIER[x.tier][0], 13, Kit.CY))
		var tname: String = x.name if x.tier == "turnkey" else (("%s rack" % x.integrator.capitalize()) if x.tier == "oem" else TIER[x.tier][1])
		tv.add_child(Kit.label(tname, 14, Kit.TX, true)); tv.add_child(Kit.label(Kit.usd(qq.cost), 18, Kit.CY))
		tv.add_child(Kit.label("%d mo lead · +%d%%" % [qq.lead, int(round(x.premium * 100.0))], 12, Kit.DIM)); tv.add_child(Kit.label(x.tagline, 12, Kit.TX, true))
		var tb := Button.new(); tb.flat = true; tb.set_anchors_preset(Control.PRESET_FULL_RECT); tb.focus_mode = Control.FOCUS_NONE; tb.pressed.connect(func(): tier_sel = x.id; app.sfx("click"); refresh()); tc.add_child(tb)
		tg.add_child(tc)
	pt[1].add_child(Kit.label("⚖  " + t.codex.tradeoffs[0], 13, Kit.DIM, true))
	# --- column 3: hall check, BOM, order
	var c3: VBoxContainer = lr[0]
	var hc := Kit.panel("4 · Does your hall have room?", true, c3)
	for c in checks: hc[1].add_child(Kit.issue("info" if c.ok else "error", "✓ OK · %s" % c.label if c.ok else "✗ Action needed · %s" % c.label, c.detail))
	hc[1].add_child(Kit.btn("Open Build →", func(): app.go("facility"), "", 14))
	var bm := Kit.panel("Bill of materials · %d rack%s" % [racks, "s" if racks > 1 else ""], false, c3)
	var rows := []
	for l in q.lines: rows.append(["%d× %s" % [l.n, l.name], Kit.label(Kit.usd(l.total), 14, Kit.TX)])
	var tbl := Kit.table(["Part", "Cost"], rows); bm[1].add_child(tbl)
	var tot := HBoxContainer.new(); tot.add_child(Kit.label("TOTAL", 16)); var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; tot.add_child(sp); tot.add_child(Kit.label(Kit.usd(q.cost), 18, Kit.CY)); bm[1].add_child(tot)
	bm[1].add_child(Kit.label("Cash %s · arrives ~%s" % [Kit.usd(b.g.cash), Kit.date_of(b.g.month + q.lead)], 13, Kit.DIM, true))
	if q.capped.size() > 0: bm[1].add_child(Kit.label("Allocation limits: " + ", ".join(q.capped), 13, Kit.AM, true))
	var is_pre: bool = q.get("preorder", false)
	if is_pre: bm[1].add_child(Kit.label("PRE-ORDER: ships %s. You queue behind the hyperscalers at the launch premium, delivery lands after the ship date, and cancelling refunds 90%%." % Kit.date_of(int(q.ships)), 13, Kit.GR, true))
	var ob := Kit.btn("NOT ENOUGH CASH" if cant_afford else "%s %d RACK%s · %s" % ["PRE-ORDER" if is_pre else "ORDER", racks, "S" if racks > 1 else "", Kit.usd(q.cost)], func():
		pmsg = b.act("buyTemplate", [t.id, racks]); app.sfx(("cash_big" if racks >= 20 else "order") if pmsg.ok else "error"); refresh(), "go", 17)
	ob.disabled = cant_afford or q.unavailable.size() > 0; ob.custom_minimum_size = Vector2(0, 52); bm[1].add_child(ob)
	if not pmsg.is_empty():
		bm[1].add_child(Kit.label(pmsg.message, 14, Kit.GR if pmsg.ok else Kit.RD, true))
		if pmsg.ok: bm[1].add_child(Kit.btn("Next: deploy it from the Warehouse →", func(): app.go("stock"), "pri", 14))

var lbl_hint: Label

# ---------- roadmap: keynotes, what shipped, what is coming ----------
func _roadmap(root: Control) -> void:
	var b: Bridge = app.b
	var L: Dictionary = b.q("launches"); var now: int = int(b.g.month)
	var col: VBoxContainer = Kit.cols2(root)[0]
	col.add_child(Kit.tip("Hardware is announced at keynotes months before it ships. After the keynote you can PRE-ORDER (launch premium, delivery after the ship date, cancel for 90% back). Wait and you pay the going rate and the queue behind the hyperscalers. Each card explains the technology and what it changes in your hall."))
	var upcoming: Array = L.list.filter(func(k): return int(k.month) > now)
	if not upcoming.is_empty():
		var nx: Dictionary = upcoming[0]
		col.add_child(Kit.label("Next keynote: %s · %s" % [nx.venue, Kit.date_of(int(nx.month))], 15, Kit.AM, true))
	var past: Array = L.list.filter(func(k): return int(k.month) <= now); past.reverse()
	if past.is_empty(): col.add_child(Kit.label("No keynotes yet. They appear here as they happen.", 13, Kit.DIM))
	for k in past:
		var open: bool = road_open == str(k.id)
		var card := PanelContainer.new(); card.add_theme_stylebox_override("panel", Kit.card_sb(Kit.AM if open else Kit.PANEL_EDGE, Kit.PANEL_FILL, 2 if open else 1, 12)); col.add_child(card)
		var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 6); card.add_child(v)
		var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 8); v.add_child(h)
		h.add_child(Kit.chip("%s · %s" % [Kit.date_of(int(k.month)), str(k.venue)], Kit.AM, 12))
		var pre: bool = k.items.any(func(i): return i.state == "preorder")
		if pre: h.add_child(Kit.chip("PRE-ORDER OPEN", Kit.GR, 12))
		v.add_child(Kit.label(str(k.title), 16, Kit.TX, true)); v.add_child(Kit.label(str(k.headline), 13, Kit.DIM, true))
		if open:
			KeynoteOverlay.body(v, k)
			if k.items.size() > 0: v.add_child(Kit.btn("Look at these parts in the Parts bin →", func(): tab = "parts"; kind = "accelerator"; vendor = "all"; sel = str(k.items[0].id); road_open = ""; future = true; refresh(), "pri", 14))
		v.add_child(Kit.btn("Hide" if open else "Read the keynote", func(): road_open = "" if open else str(k.id); refresh(), "", 13))

# ---------- parts bin ----------
func _parts(root: Control) -> void:
	var b: Bridge = app.b
	var offers: Dictionary = b.q("offersAll")
	var bar := HBoxContainer.new(); bar.add_theme_constant_override("separation", 6); root.add_child(bar)
	for k in KINDS: bar.add_child(Kit.btn(k, func(): kind = k; vendor = "all"; sel = ""; refresh(), "pri" if k == kind else "", 14))
	var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; bar.add_child(sp)
	var vendors := []
	for it in b.items.values():
		if it.kind == kind and not vendors.has(it.vendor): vendors.append(it.vendor)
	vendors.sort(); var vopts := [["all", "all vendors"]]; for v in vendors: vopts.append([v, v])
	bar.add_child(Kit.option(vopts, vendor, func(v): vendor = v; refresh()))
	bar.add_child(Kit.check("show unreleased/EOL", future, func(on): future = on; refresh()))
	var cols := Kit.cols_row(); root.add_child(cols)
	var list: Array = []
	for it in b.items.values():
		if it.kind != kind or (vendor != "all" and it.vendor != vendor): continue
		var o: Dictionary = offers[it.id]
		if future or o.available: list.append(o)
	list.sort_custom(func(a, c): return a.item.availableFrom < c.item.availableFrom)
	var lp := PanelContainer.new(); lp.add_theme_stylebox_override("panel", Kit.sb(Kit.PANEL, Kit.LINE, 12, 1, 8)); lp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; lp.size_flags_stretch_ratio = 1.5; cols.add_child(lp)
	var lc := Kit.column(lp, 0, true, true)
	lc.add_child(Kit.label("%-34s %-44s %9s %6s %6s" % ["PART", "KEY SPECS", "PRICE", "LEAD", "STOCK"], 12, Kit.DIM))
	for o in list:
		var it: Dictionary = o.item
		var specs := " · ".join(Kit.specs_of(it).slice(0, 2).map(func(s): return "%s:%s" % [s[0], s[1]]))
		var txt := "%-34s %-44s %9s %6s %6s" % [str(it.name).left(34), specs.left(44), Kit.usd(o.unitPrice) if o.available else "—", ("%s mo" % o.leadMonths) if o.available else "", str(int(b.g.inventory.get(it.id, 0)))]
		var rb := Kit.btn(txt, func(): sel = it.id; bmsg = ""; refresh(), "pri" if sel == it.id else "", 13); rb.alignment = HORIZONTAL_ALIGNMENT_LEFT; rb.clip_text = true
		if not o.available: rb.modulate = Color(1, 1, 1, 0.5)
		lc.add_child(rb)
		var sub := "    %s · %d" % [it.vendor, int(it.availableFrom)]
		if o.get("preorder", false): sub += " · PRE-ORDER, ships %s" % Kit.date_of(int(o.ships))
		elif o.get("opens") != null and not o.available: sub += " · announced, orders open %s" % Kit.date_of(int(o.opens))
		lc.add_child(Kit.label(sub, 11, Kit.GR if o.get("preorder", false) else Kit.DIM))
	var dc := Kit.column(cols, 460, false, true); Kit.fit_split(cols, app, [700, 460])
	if sel != "" and offers.has(sel):
		var o: Dictionary = offers[sel]; var it: Dictionary = o.item
		var dp := Kit.panel(it.name, true, dc)
		var rows := []; for s in Kit.specs_of(it): rows.append([Kit.label(s[0], 13, Kit.DIM), Kit.label(s[1], 13)])
		dp[1].add_child(Kit.table([], rows)); Kit.codex_card(dp[1], it.codex)
		if o.available:
			var disc := float(b.q("volumeDiscount", [it.id, qty, o.unitPrice])); var total: float = o.unitPrice * qty * (1.0 - disc)
			var sq := int(b.q("spareQty", [it.id, qty])); var spare_cost: float = (sq * o.unitPrice) if spares else 0.0
			var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 8); dp[1].add_child(h)
			h.add_child(Kit.label("Qty", 14, Kit.DIM)); h.add_child(Kit.spin(qty, 1, 100000, 1, func(v): qty = int(v); refresh()))
			var buy := Kit.btn("BUY %s" % Kit.usd(total + spare_cost), func():
				var m := b.act("buy", [it.id, qty])
				if m.ok and spares and sq > 0: b.act("buy", [it.id, sq, true])
				bmsg = m.message; app.sfx("buy" if m.ok else "bad"); refresh(), "go", 15)
			buy.disabled = total > b.g.cash; h.add_child(buy)
			if sq > 0: h.add_child(Kit.check("+ %d spare%s" % [sq, "s" if sq > 1 else ""], spares, func(on): spares = on; refresh()))
			var line := "%s ea" % Kit.usd(o.unitPrice)
			if disc > 0: line += " · −%d%% volume" % int(round(disc * 100.0))
			line += " · arrives in %s mo" % o.leadMonths
			if o.get("preorder", false): line += " · PRE-ORDER: ships %s, launch premium, cancel refunds 90%%" % Kit.date_of(int(o.ships))
			if o.get("qtyCap") != null: line += " · allocation %s/qtr" % Kit.num(o.qtyCap)
			dp[1].add_child(Kit.label(line, 13, Kit.DIM, true))
		else: dp[1].add_child(Kit.label(str(o.get("reason", "")), 14, Kit.AM, true))
		if bmsg != "": dp[1].add_child(Kit.label(bmsg, 13, Kit.DIM, true))
	else:
		var np := Kit.panel("", false, dc); np[1].add_child(Kit.label("Select a part to see specs, the engineering story and tradeoffs.", 14, Kit.DIM, true))
	var op := Kit.panel("Open orders", false, dc)
	if b.g.orders.is_empty(): op[1].add_child(Kit.label("None", 13, Kit.DIM))
	else: op[1].add_child(Kit.label("Every open order, including ones placed from Customers / Easy Path. Cancelling refunds 90%.", 11, Kit.DIM, true))
	var seen := {}
	for o in b.g.orders:
		if o.get("batch") != null:
			if seen.has(o.batch): continue
			seen[o.batch] = true
		var row := HBoxContainer.new(); row.add_theme_constant_override("separation", 6); op[1].add_child(row)
		var is_batch: bool = o.get("batch") != null
		var title: String
		var cost := 0.0
		if is_batch:
			var rd: Dictionary = {}
			for r in b.g.racks: if r.id == "rack-" + str(o.templateId): rd = r
			title = "%d × %s (full BOM)" % [int(o.racks), rd.get("name", str(o.templateId))]
			for x in b.g.orders: if x.get("batch") == o.batch: cost += x.qty * x.unitPrice
		else:
			title = "%d × %s%s" % [int(o.qty), b.item(o.itemId).get("name", o.itemId), " (spare)" if o.get("spare", false) else ""]
			cost = o.qty * o.unitPrice
		var lb := Kit.label("%s · %s · arrives %s" % [title, Kit.usd(cost), Kit.date_of(o.arriveMonth)], 12, Kit.TX, true); lb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; row.add_child(lb)
		var cur: int = int(o.racks) if is_batch else int(o.qty)
		if cur > 1:
			row.add_child(Kit.btn("−1", func(): bmsg = b.act("reduceOrder", [o.id, cur - 1]).message; app.sfx("click"); refresh(), "", 11))
			if cur > 3: row.add_child(Kit.btn("half", func(): bmsg = b.act("reduceOrder", [o.id, cur / 2]).message; app.sfx("click"); refresh(), "", 11))
		row.add_child(Kit.btn("Cancel", func(): Kit.confirm(self, "Cancel %s? You get 90%% back." % title, func(): bmsg = b.act("cancelOrder", [o.id]).message; app.sfx("sell"); refresh(), "Cancel order"), "danger", 11))
	if bmsg != "" and sel == "": op[1].add_child(Kit.label(bmsg, 12, Kit.DIM, true))
