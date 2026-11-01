class_name ProcureScreen
extends Control
## Procurement: Guided planner (platform -> how many -> how to buy -> hall check -> BOM -> order) and the advanced Parts bin.

var app
var tab := "plan"
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

func _ready() -> void: set_anchors_preset(Control.PRESET_FULL_RECT)

func refresh() -> void:
	for c in get_children(): c.queue_free()
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := HBoxContainer.new(); hd.add_theme_constant_override("separation", 8); root.add_child(hd)
	hd.add_child(Kit.label("PROCUREMENT", 26, Kit.CY))
	hd.add_child(Kit.btn("Guided planner", func(): tab = "plan"; refresh(), "pri" if tab == "plan" else ""))
	hd.add_child(Kit.btn("Parts bin (advanced)", func(): tab = "parts"; refresh(), "pri" if tab == "parts" else ""))
	if tab == "plan": _planner(root)
	else: _parts(root)

# ---------- guided planner ----------
func _state(p: String) -> Dictionary:
	var b: Bridge = app.b; var ts := b.templates.filter(func(t): return t.platform == p)
	var a: Dictionary = ts[0]; var y := b.year(); var from: float = a.availableFrom; var eol = a.get("eolAfter")
	return {"ts": ts, "from": from, "live": y >= from and (eol == null or y <= float(eol)), "future": y < from}

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
	var cols := HBoxContainer.new(); cols.size_flags_vertical = Control.SIZE_EXPAND_FILL; cols.add_theme_constant_override("separation", 12); root.add_child(cols)
	# --- column 1: platforms
	var c1 := Kit.column(cols, 300, false)
	c1.add_child(Kit.label("1 · PLATFORM", 14, Kit.CY))
	for p in platforms:
		var st := _state(p); var a: Dictionary = st.ts[0]; var ff: Dictionary = b.q("templateFacts", [a.id]); var on: bool = p == plat
		var cid: String = a.tray.chassisId; var vend := "nvidia" if cid.begins_with("nv") else ("cerebras" if cid.begins_with("cb") else ("tenstorrent" if cid.begins_with("tt") else ("intel" if cid.begins_with("int") else "amd")))
		var card := PanelContainer.new(); card.add_theme_stylebox_override("panel", Kit.sb(Color(0.08, 0.16, 0.22) if on else Kit.PANEL, Kit.CY if on else Kit.LINE, 8, 2 if on else 1, 10))
		var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 8); card.add_child(h)
		var stripe := ColorRect.new(); stripe.color = Kit.vendor_color(vend); stripe.custom_minimum_size = Vector2(5, 0); h.add_child(stripe)
		var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; h.add_child(v)
		v.add_child(Kit.label(p, 15, Kit.TX if st.live else Kit.DIM, true))
		var sub := "%d accel / rack · %d kW · %s" % [ff.accels, int(ff.kWPerRack), a.rack.cooling] if st.live else ("ships %d (locked)" % int(st.from) if st.future else "end of sale")
		v.add_child(Kit.label(sub, 12, Kit.DIM, true))
		var click := Button.new(); click.flat = true; click.set_anchors_preset(Control.PRESET_FULL_RECT); click.focus_mode = Control.FOCUS_NONE
		click.pressed.connect(func(): if st.live: plat = p; tier_sel = ""; app.sfx("click"); refresh())
		card.add_child(click); c1.add_child(card)
	# --- column 2: description, how many, how to buy
	var c2 := Kit.column(cols, 0, true)
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
	var tg := HBoxContainer.new(); tg.add_theme_constant_override("separation", 10); pt[1].add_child(tg)
	for x in ts:
		var qq: Dictionary = b.q("quote", [x.id, racks]); var on2: bool = x.id == t.id
		var tc := PanelContainer.new(); tc.size_flags_horizontal = Control.SIZE_EXPAND_FILL; tc.add_theme_stylebox_override("panel", Kit.sb(Color(0.08, 0.2, 0.28) if on2 else Kit.PANEL, Kit.CY if on2 else Kit.LINE, 10, 2 if on2 else 1, 10))
		var tv := VBoxContainer.new(); tv.add_theme_constant_override("separation", 3); tc.add_child(tv)
		tv.add_child(Kit.label(TIER[x.tier][0], 13, Kit.CY))
		var tname: String = x.name if x.tier == "turnkey" else (("%s rack" % x.integrator.capitalize()) if x.tier == "oem" else TIER[x.tier][1])
		tv.add_child(Kit.label(tname, 14, Kit.TX, true)); tv.add_child(Kit.label(Kit.usd(qq.cost), 18, Kit.CY))
		tv.add_child(Kit.label("%d mo lead · +%d%%" % [qq.lead, int(round(x.premium * 100.0))], 12, Kit.DIM)); tv.add_child(Kit.label(x.tagline, 12, Kit.TX, true))
		var tb := Button.new(); tb.flat = true; tb.set_anchors_preset(Control.PRESET_FULL_RECT); tb.focus_mode = Control.FOCUS_NONE; tb.pressed.connect(func(): tier_sel = x.id; app.sfx("click"); refresh()); tc.add_child(tb)
		tg.add_child(tc)
	pt[1].add_child(Kit.label("⚖  " + t.codex.tradeoffs[0], 13, Kit.DIM, true))
	# --- column 3: hall check, BOM, order
	var c3 := Kit.column(cols, 430, false)
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
	var ob := Kit.btn("NOT ENOUGH CASH" if cant_afford else "ORDER %d RACK%s · %s" % [racks, "S" if racks > 1 else "", Kit.usd(q.cost)], func():
		pmsg = b.act("buyTemplate", [t.id, racks]); app.sfx("buy" if pmsg.ok else "bad"); refresh(), "go", 17)
	ob.disabled = cant_afford or q.unavailable.size() > 0; ob.custom_minimum_size = Vector2(0, 52); bm[1].add_child(ob)
	if not pmsg.is_empty():
		bm[1].add_child(Kit.label(pmsg.message, 14, Kit.GR if pmsg.ok else Kit.RD, true))
		if pmsg.ok: bm[1].add_child(Kit.btn("Next: deploy it from the Warehouse →", func(): app.go("stock"), "pri", 14))

var lbl_hint: Label

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
	var cols := HBoxContainer.new(); cols.size_flags_vertical = Control.SIZE_EXPAND_FILL; cols.add_theme_constant_override("separation", 12); root.add_child(cols)
	var list: Array = []
	for it in b.items.values():
		if it.kind != kind or (vendor != "all" and it.vendor != vendor): continue
		var o: Dictionary = offers[it.id]
		if future or o.available: list.append(o)
	list.sort_custom(func(a, c): return a.item.availableFrom < c.item.availableFrom)
	var lp := PanelContainer.new(); lp.add_theme_stylebox_override("panel", Kit.sb(Kit.PANEL, Kit.LINE, 12, 1, 8)); lp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; lp.size_flags_stretch_ratio = 1.5; cols.add_child(lp)
	var lc := Kit.column(lp, 0, true)
	lc.add_child(Kit.label("%-34s %-44s %9s %6s %6s" % ["PART", "KEY SPECS", "PRICE", "LEAD", "STOCK"], 12, Kit.DIM))
	for o in list:
		var it: Dictionary = o.item
		var specs := " · ".join(Kit.specs_of(it).slice(0, 2).map(func(s): return "%s:%s" % [s[0], s[1]]))
		var txt := "%-34s %-44s %9s %6s %6s" % [str(it.name).left(34), specs.left(44), Kit.usd(o.unitPrice) if o.available else "—", ("%s mo" % o.leadMonths) if o.available else "", str(int(b.g.inventory.get(it.id, 0)))]
		var rb := Kit.btn(txt, func(): sel = it.id; bmsg = ""; refresh(), "pri" if sel == it.id else "", 13); rb.alignment = HORIZONTAL_ALIGNMENT_LEFT; rb.clip_text = true
		if not o.available: rb.modulate = Color(1, 1, 1, 0.5)
		lc.add_child(rb)
		lc.add_child(Kit.label("    %s · %d" % [it.vendor, int(it.availableFrom)], 11, Kit.DIM))
	var dc := Kit.column(cols, 460, false)
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
			if o.get("qtyCap") != null: line += " · allocation %s/qtr" % Kit.num(o.qtyCap)
			dp[1].add_child(Kit.label(line, 13, Kit.DIM, true))
		else: dp[1].add_child(Kit.label(str(o.get("reason", "")), 14, Kit.AM, true))
		if bmsg != "": dp[1].add_child(Kit.label(bmsg, 13, Kit.DIM, true))
	else:
		var np := Kit.panel("", false, dc); np[1].add_child(Kit.label("Select a part to see specs, the engineering story and tradeoffs.", 14, Kit.DIM, true))
	var op := Kit.panel("Open orders", false, dc)
	if b.g.orders.is_empty(): op[1].add_child(Kit.label("None", 13, Kit.DIM))
	for o in b.g.orders: op[1].add_child(Kit.label("%d× %s → month %d" % [o.qty, o.itemId, o.arriveMonth], 12, Kit.DIM))
