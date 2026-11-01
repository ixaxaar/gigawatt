class_name FacilityScreen
extends Control
## Build: floor placement, power & cooling gauges, install/buy plant, outage protection, internet, hall checks, new halls.
var app
var plant_kind := "cooling"
var design := ""
var msg := ""
var sp_state := {"sp": true}
var nh_name := "Hall 2"
var nh_cool := "dlc"
var nh_slots := 20

func _ready() -> void: set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter = Control.MOUSE_FILTER_IGNORE

func on_slot(_slot: int) -> void:
	if design == "": return
	var b: Bridge = app.b; var h: Dictionary = b.g.halls[app.hall.hall_i]
	msg = b.act("placeRack", [h.id, design]).message; app.sfx("buy"); refresh()

func _gauge(parent: Control, label: String, v: float, mx: float, unit: String) -> void:
	var h := HBoxContainer.new(); parent.add_child(h); h.add_child(Kit.label(label, 13, Kit.DIM)); var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; h.add_child(sp)
	h.add_child(Kit.label("%s / %s %s" % [Kit.num(v), Kit.num(mx), unit], 13)); parent.add_child(Kit.bar(v, mx))

func refresh() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	var hi: int = clampi(app.hall.hall_i, 0, g.halls.size() - 1); var hall: Dictionary = g.halls[hi]
	var hs: Dictionary = b.q("hallStats", [hall.id])
	# ---- right column
	var rp := PanelContainer.new(); rp.set_anchors_preset(Control.PRESET_RIGHT_WIDE); rp.offset_left = -500; rp.add_theme_stylebox_override("panel", Kit.sb(Color(0.03, 0.045, 0.07, 0.95), Kit.LINE, 12, 1, 12)); add_child(rp)
	var rv := VBoxContainer.new(); rv.add_theme_constant_override("separation", 8); rp.add_child(rv)
	var hd := HFlowContainer.new(); hd.add_theme_constant_override("h_separation", 6); rv.add_child(hd); hd.add_child(Kit.label("BUILD", 22, Kit.CY))
	for i in g.halls.size(): hd.add_child(Kit.btn("%s · %s" % [g.halls[i].name, g.halls[i].coolingClass], func(): app.hall.hall_i = i; app.hall.rebuild(); refresh(), "pri" if i == hi else "", 13))
	var col := Kit.column(rv, 0, true)
	if g.get("mode", "operator") == "learner":
		var cp := Kit.panel("Datacenter 101 — do I need this?", true, col); ConceptsView.build(app, cp[1], ["power", "cooling", "chiller", "liquid", "rdhx", "pue", "ups"], func(): refresh())
	var pc := Kit.panel("Power & cooling", true, col)
	_gauge(pc[1], "IT load", hs.kw, hall.itPowerKW, "kW"); _gauge(pc[1], "Heat rejection", hs.kw, hall.coolingKW, "kW")
	pc[1].add_child(Kit.stats([["PUE", "%.2f" % hs.pue], ["Racks", "%d/%d" % [hall.racks.size(), int(hall.rackSlots)]], ["Class", str(hall.coolingClass)]], 3))
	# install from inventory
	var ip := Kit.panel("Install equipment from inventory", false, col); var any := false
	for id in g.inventory:
		var n: int = int(g.inventory[id]); var it: Dictionary = b.item(id)
		if n <= 0 or it.is_empty() or not (it.kind == "power" or it.kind == "cooling") or ["pdu", "power-shelf"].has(it.get("powerType", "")): continue
		any = true; var r := HBoxContainer.new(); ip[1].add_child(r); r.add_child(Kit.label("%d× %s" % [n, it.name], 13, Kit.TX, true)); r.get_child(0).size_flags_horizontal = Control.SIZE_EXPAND_FILL
		r.add_child(Kit.btn("Install 1", func(): msg = b.act("installPower" if it.kind == "power" else "installCooling", [hall.id, id, 1]).message; app.sfx("buy"); refresh(), "", 12))
	if not any: ip[1].add_child(Kit.label("Buy transformers, UPS, CRAH/CDU/chillers below.", 12, Kit.DIM, true))
	var inst := []; for id in hall.powerEquip: inst.append("%d× %s" % [int(hall.powerEquip[id]), b.item(id).get("name", id)])
	for id in hall.coolingEquip: inst.append("%d× %s" % [int(hall.coolingEquip[id]), b.item(id).get("name", id)])
	ip[1].add_child(Kit.label("Installed: " + (", ".join(inst) if inst.size() > 0 else "nothing"), 11, Kit.DIM, true))
	# buy plant
	var bp := Kit.panel("Buy plant for this hall", false, col)
	var tb := HBoxContainer.new(); bp[1].add_child(tb)
	for k in ["cooling", "power"]: tb.add_child(Kit.btn(k, func(): plant_kind = k; refresh(), "pri" if plant_kind == k else "", 12))
	var offers: Dictionary = b.q("offersAll")
	for it in b.items.values():
		if it.kind != plant_kind: continue
		if it.kind == "cooling" and it.serves != hall.coolingClass: continue
		if it.kind == "power" and ["pdu", "power-shelf"].has(it.get("powerType", "")): continue
		var o: Dictionary = offers[it.id]
		if not o.available: continue
		var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 8); bp[1].add_child(r)
		var nm := VBoxContainer.new(); nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL; r.add_child(nm); nm.add_child(Kit.label(it.name, 12, Kit.TX, true)); nm.add_child(Kit.label("%s kW · %s · %s mo" % [it.capacityKW, Kit.usd(o.unitPrice), o.leadMonths], 11, Kit.DIM))
		var bu := Kit.btn("Buy 1", func(): msg = b.act("buy", [it.id, 1]).message; app.sfx("buy"); refresh(), "", 12); bu.disabled = o.unitPrice > g.cash; r.add_child(bu)
	bp[1].add_child(Kit.label("Arrives in Warehouse, then use “Install 1” above.", 11, Kit.DIM))
	# outage protection
	var r: Dictionary = hs.resilience; var op := Kit.panel("Outage protection", true, col)
	var oh := HBoxContainer.new(); op[1].add_child(oh); oh.add_child(Kit.label("Tier: %s" % r.tier, 15)); var osp := Control.new(); osp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; oh.add_child(osp); oh.add_child(Kit.label("rides through %d%% of outages" % int(round(r.score * 100.0)), 12, Kit.DIM))
	op[1].add_child(Kit.bar(r.score, 1.0, r.score < 0.9))
	op[1].add_child(Kit.label("UPS %s kW · battery %s kW · generator %s kW" % [Kit.num(r.upsKW), Kit.num(r.batteryKW), Kit.num(r.gensetKW)], 11, Kit.DIM))
	for gap in r.gaps: op[1].add_child(Kit.label("✗ " + str(gap), 12, Kit.AM, true))
	if r.gaps.is_empty(): op[1].add_child(Kit.label("✓ Full chain: UPS + battery + generator + transfer switch", 12, Kit.GR))
	# internet
	var ip2 := Kit.panel("Internet", true, col)
	if g.get("uplinks") != null:
		var net: Dictionary = b.q("internet")
		var nh := HBoxContainer.new(); ip2[1].add_child(nh); nh.add_child(Kit.label("%s Gb/s live · %d carrier%s" % [Kit.num(net.have), int(net.carriers), "" if net.carriers == 1 else "s"], 13)); var nsp := Control.new(); nsp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; nh.add_child(nsp); nh.add_child(Kit.label("demand ~%.1f Gb/s · %s/mo" % [net.need, Kit.usd(net.mrc)], 12, Kit.DIM))
		ip2[1].add_child(Kit.bar(net.need, maxf(1.0, net.have), net.need > net.have * 0.8))
		if net.carriers < 2: ip2[1].add_child(Kit.label("✗ Single carrier: one fiber cut takes every customer offline. Add a circuit from a different carrier.", 12, Kit.AM, true))
		for id in g.uplinks:
			if g.uplinks[id] > 0:
				var ur := HBoxContainer.new(); ip2[1].add_child(ur); var ul := Kit.label("%d× %s" % [int(g.uplinks[id]), b.item(id).get("name", id)], 12); ul.size_flags_horizontal = Control.SIZE_EXPAND_FILL; ur.add_child(ul)
				ur.add_child(Kit.btn("cancel 1", func(): msg = b.act("dropUplink", [id]).message; refresh(), "", 11))
		for it in b.items.values():
			if it.kind != "uplink" or it.availableFrom * 12.0 - 2020.0 * 12.0 > g.month: continue
			var ur2 := HBoxContainer.new(); ur2.add_theme_constant_override("separation", 8); ip2[1].add_child(ur2)
			var nm2 := VBoxContainer.new(); nm2.size_flags_horizontal = Control.SIZE_EXPAND_FILL; ur2.add_child(nm2); nm2.add_child(Kit.label(it.name, 12, Kit.TX, true)); nm2.add_child(Kit.label("%s install · %s/mo · %s" % [Kit.usd(it.priceUSD), Kit.usd(it.mrcUSD), it.carrier], 11, Kit.DIM))
			var ab := Kit.btn("Add", func(): msg = b.act("buyUplink", [it.id]).message; app.sfx("buy"); refresh(), "", 12); ab.disabled = it.priceUSD > g.cash; ur2.add_child(ab)
	else: ip2[1].add_child(Kit.label("Legacy save: unlimited internet.", 12, Kit.DIM))
	var hc := Kit.panel("Hall checks", false, col); Kit.issues(hc[1], b.q("validateHall", [hall.id]))
	var nhp := Kit.panel("Build new hall", false, col)
	var nr := HFlowContainer.new(); nr.add_theme_constant_override("h_separation", 6); nhp[1].add_child(nr)
	var le := LineEdit.new(); le.text = nh_name; le.custom_minimum_size = Vector2(110, 0); le.text_changed.connect(func(t): nh_name = t); nr.add_child(le)
	nr.add_child(Kit.option(["air", "rdhx", "dlc", "immersion"], nh_cool, func(v): nh_cool = v)); nr.add_child(Kit.spin(nh_slots, 4, 200, 1, func(v): nh_slots = int(v)))
	nr.add_child(Kit.btn("Build", func(): msg = b.act("buildHall", [nh_name, nh_cool, nh_slots]).message; app.sfx("buy"); app.hall.rebuild(); refresh(), "", 13))
	# ---- bottom-left placement strip
	var bl := PanelContainer.new(); bl.set_anchors_preset(Control.PRESET_BOTTOM_LEFT); bl.offset_left = 8; bl.offset_bottom = -8; bl.offset_top = -330; bl.offset_right = 760; bl.add_theme_stylebox_override("panel", Kit.sb(Color(0.03, 0.045, 0.07, 0.94), Kit.CY, 12, 1, 12)); add_child(bl)
	var bv := VBoxContainer.new(); bv.add_theme_constant_override("separation", 6); bl.add_child(bv)
	bv.add_child(Kit.label("%s floor — choose a rack design, then click an empty slot" % hall.name, 14, Kit.CY))
	var dr := HBoxContainer.new(); dr.add_theme_constant_override("separation", 8); bv.add_child(dr)
	var dopts := [["", "choose rack design…"]]; for d in g.racks: dopts.append([d.id, d.name])
	dr.add_child(Kit.option(dopts, design, func(v): design = v; refresh()))
	var missing := []
	if design != "":
		var bom: Dictionary = b.q("rackBom", [design])
		for id in bom:
			if g.inventory.get(id, 0) < bom[id]: missing.append(id)
	var pb := Kit.btn("PLACE RACK", func(): msg = b.act("placeRack", [hall.id, design]).message; app.sfx("buy"); refresh(), "go", 15); pb.disabled = design == "" or missing.size() > 0; dr.add_child(pb)
	if missing.size() > 0: dr.add_child(Kit.label("missing %d part type(s)" % missing.size(), 12, Kit.AM))
	if design != "" and missing.size() > 0:
		var sc := ScrollContainer.new(); sc.custom_minimum_size = Vector2(0, 170); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; var mv := VBoxContainer.new(); mv.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sc.add_child(mv); bv.add_child(sc)
		MissingParts.build(app, mv, design, 1, func(m): msg = m; refresh(), sp_state)
	if msg != "": bv.add_child(Kit.label(msg, 12, Kit.DIM, true))
