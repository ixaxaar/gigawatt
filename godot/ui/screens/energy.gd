class_name EnergyScreen
extends Control
## Energy & spot market: power position, PPAs, spot GPU market, offering idle capacity.
var app

## Rich text in the palette's text colour (the engine default is near-white: unreadable on the light themes).
static func _rich(t: String, size := 15) -> RichTextLabel:
	var r := Kit.rich(t, size); r.add_theme_color_override("default_color", Kit.TX); return r
var msg := ""
var mw := {}
const ICON := {"grid": "GRID", "solar": "SOLAR", "gas": "GAS", "hydro": "HYDRO", "nuclear": "NUCLEAR"}

## Rebuilds keep scroll (Kit) and the caret of a number field the player is typing in (the month tick rebuilds this screen).
func refresh() -> void:
	var fi := -1; var ft := ""; var fc := 0
	if is_inside_tree():
		var fo := get_viewport().gui_get_focus_owner()
		if fo is LineEdit and fo.get_parent() is SpinBox and is_ancestor_of(fo):
			fi = find_children("*", "SpinBox", true, false).find(fo.get_parent()); ft = (fo as LineEdit).text; fc = (fo as LineEdit).caret_column
	Kit.rebuild_keep(self, _rebuild)
	if fi < 0 or not is_inside_tree(): return
	await get_tree().process_frame; await get_tree().process_frame
	if not is_instance_valid(self): return
	var sbs := find_children("*", "SpinBox", true, false).filter(func(x): return not x.is_queued_for_deletion())
	if fi < sbs.size():
		var le: LineEdit = (sbs[fi] as SpinBox).get_line_edit(); le.grab_focus(); le.text = ft; le.caret_column = fc

## Checkbox / number field in palette colours (the engine defaults are near-white and vanish on the light themes).
func _chk(text: String, on: bool, cb: Callable) -> CheckBox:
	var c := Kit.check(text, on, cb)
	for n in ["font_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color", "font_focus_color"]: c.add_theme_color_override(n, Kit.TX)
	c.add_theme_color_override("font_disabled_color", Kit.DIM); return c

func _spin(value: float, mn: float, mx: float, step: float, cb: Callable) -> SpinBox:
	var sp := Kit.spin(value, mn, mx, step, cb); var le := sp.get_line_edit()
	for n in ["font_color", "font_selected_color", "caret_color"]: le.add_theme_color_override(n, Kit.TX)
	le.add_theme_stylebox_override("normal", Kit.sb(Kit.field(), Kit.LINE, 4, 1, 6)); le.add_theme_stylebox_override("focus", Kit.sb(Kit.field(), Kit.CY, 4, 2, 6)); return sp

## One line saying what to do next, with one button.
func _empty(parent: Control, text: String, btn_text: String, cb: Callable) -> void:
	parent.add_child(Kit.label(text, 13, Kit.DIM, true))
	var bt := Kit.btn(btn_text, cb, "pri", 13); bt.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN; parent.add_child(bt)

func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	var pv: Dictionary = b.q("powerPreview"); var sources: Dictionary = b.q("powerSources")
	var draw_mw: float = pv.drawMW; var spot_mwh: float = g.utilityUSDPerKWh * 1000.0
	var contracts: Array = g.get("powerContracts", [])
	var live := contracts.filter(func(c): return g.month >= c.startMonth)
	var committed := 0.0; var cap := 0.0
	for c in live: committed += c.mw; cap += c.mw * (1.0 + c.overdrawPct)
	var price: float = pv.spotPrice; var util: float = pv.spotUtil
	var sp: Dictionary = b.q("spotRevenue")
	var accels := 0.0; for c in g.clusters: accels += c.stats.accelerators if c.get("stats") != null else 0.0
	var cost_gpu_hr: float = (pv.opex.itPowerKW / accels * pv.opex.pue * g.utilityUSDPerKWh) if accels > 0 else 0.0
	var dw: float = size.x if size.x > 200.0 else app.overlay_w()
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := Kit.head_row(12); root.add_child(hd)
	hd.add_child(Kit.label("ENERGY" if Layout.compact else "ENERGY & SPOT MARKET", 26, Kit.CY)); hd.add_child(Kit.label(("" if Layout.phone else "Buy power on take-or-pay contracts (cheap, but paid even if unused) or stay on spot.") + ("  " + msg if msg != "" else ""), 13, Kit.DIM, true)); Kit.hint_fix(hd, app)
	var sc := Kit.column(root, 0, true)
	var top := VBoxContainer.new(); top.add_theme_constant_override("separation", 12); sc.add_child(top)
	# power position
	var p1 := Kit.panel("Power position", true, top)
	p1[1].add_child(Kit.stats([["Facility draw", "%.2f MW" % draw_mw], ["Spot utility", "$%.0f/MWh" % spot_mwh], ["Committed (firm)", "%.1f MW" % committed], ["Max incl. overdraw", "%.1f MW" % cap]], 2))
	p1[1].add_child(Kit.bar(draw_mw, maxf(maxf(cap, draw_mw), 0.01), draw_mw > committed))
	var why := "No contracts: 100% bought at the spot utility rate (volatile — see energy-crisis events)." if live.is_empty() else ("Above contract + overdraw limit: the excess is bought at spot." if draw_mw > cap else ("In the overdraw band: extra MW billed at the overage multiple." if draw_mw > committed else "Inside your committed block: you pay the contract price."))
	p1[1].add_child(Kit.label(why, 12, Kit.DIM, true))
	p1[1].add_child(Kit.label("Projected power bill: %s/mo · blended $%.0f/MWh" % [Kit.usd(pv.settle.netUSD), pv.settle.avgUSDPerMWh], 13, Kit.TX, true))
	# spot market
	var p2 := Kit.panel("Spot GPU market" if Layout.phone else "Spot GPU market   $%.2f/GPU-hr" % price, true, top)
	var spk := Spark.new(); spk.values = g.get("spotHistory", []); spk.custom_minimum_size = Vector2(0, 46); p2[1].add_child(spk)
	p2[1].add_child(Kit.stats(([["Spot price", "$%.2f/GPU-hr" % price]] if Layout.phone else []) + [["Demand (fill rate)", "%d%%" % int(round(util * 100.0))], ["Your power cost", "$%.2f/GPU-hr" % cost_gpu_hr]], 2))
	if not Layout.phone: p2[1].add_child(Kit.label("Spot price follows supply and demand; when it spikes, idle clusters print money, when it crashes they barely cover power. Spot is pre-emptible — contracts always win.", 12, Kit.DIM, true))
	var rr := HFlowContainer.new(); rr.add_theme_constant_override("h_separation", 8); rr.add_theme_constant_override("v_separation", 6); p2[1].add_child(rr)
	rr.add_child(Kit.label("Reserve price $", 13)); var rsp := _spin(g.get("spotReserve", 0.0), 0, 20, 0.1, func(v): msg = b.act("setSpotReserve", [v]).message); rr.add_child(rsp)
	if Layout.phone: rsp.custom_minimum_size = Vector2(130, Layout.tap()); rr.add_child(Kit.label("/GPU-hr", 12, Kit.DIM))
	else: rr.add_child(Kit.label("/GPU-hr  (won't sell below it)", 12, Kit.DIM))
	# idle capacity
	var p3 := Kit.panel("Offer idle capacity on spot", false, top)
	if not Layout.phone: p3[1].add_child(Kit.label("No cluster needed: tick individual racks. They earn while they wait for a contract; once a contract takes them they leave spot automatically.", 12, Kit.DIM, true))
	var racks := []; for h in g.halls: racks.append_array(h.racks)
	if racks.is_empty(): _empty(p3[1], "No racks deployed yet — install a rack to offer its idle capacity on spot.", "Open Warehouse", func(): app.go("stock"))
	for r in racks:
		var dn := ""; for d in g.racks:
			if d.id == r.designId: dn = d.name
		var srv := ""; for a in g.activeContracts:   # a rack in a cluster that serves a customer leaves spot automatically
			for cl in g.clusters:
				if srv == "" and a.clusterIds.has(cl.id) and cl.rackIds.has(r.id): srv = str(a.contract.get("customer", "a customer"))
		var cb := _chk("%s · %s" % [dn, ("serving %s" % srv) if srv != "" else r.status], g.get("spotRacks", []).has(r.id), func(on): msg = b.act("setSpotRack", [r.id, on]).message; refresh()); cb.disabled = r.status != "online" or srv != ""; if Layout.phone: cb.custom_minimum_size.y = Layout.tap()
		p3[1].add_child(cb)
	if g.clusters.size() > 0: p3[1].add_child(Kit.label("Whole clusters:", 11, Kit.DIM))
	for c in g.clusters:
		var serving: bool = g.activeContracts.any(func(a): return a.clusterIds.has(c.id)); var serving_name := ""
		for a in g.activeContracts:
			if serving_name == "" and a.clusterIds.has(c.id): serving_name = str(a.contract.get("customer", "a contract"))
		var cb2 := _chk("%s%s" % [c.name, (" (serving %s)" % serving_name) if serving else ""], g.get("spotClusters", []).has(c.id), func(on): msg = b.act("setSpot", [c.id, on]).message; refresh()); if Layout.phone: cb2.custom_minimum_size.y = Layout.tap()
		p3[1].add_child(cb2)
	p3[1].add_child(_rich("Projected spot revenue: [color=#%s][b]%s[/b][/color]/mo%s" % [Kit.GR.to_html(false), Kit.usd(sp.revenue), " (below your reserve)" if price < g.get("spotReserve", 0.0) else ""], 13))
	if not Layout.phone: sc.add_child(Kit.tip("A PPA is a long contract to buy fixed MW from a power plant. It is cheaper than spot, but you pay for the committed MW even if unused (surplus is resold at a discount). Spot GPU sells idle racks hour by hour — no cluster needed."))
	if contracts.is_empty(): sc.add_child(Kit.label("No power contracts yet — you pay the spot rate. Pick a plant offer below.", 13, Kit.DIM, true))
	if contracts.size() > 0:
		sc.add_child(Kit.label("YOUR POWER CONTRACTS", 14, Kit.CY))
		for c in contracts:
			var cp := Kit.panel("%s  ·  %s" % [c.supplier, str(c.source).to_upper()], false, sc)
			cp[1].add_child(Kit.label("%s MW · $%s/MWh · take-or-pay %s/mo" % [c.mw, c.priceUSDPerMWh, Kit.usd(c.mw * c.priceUSDPerMWh * pv.hours)], 13))
			if Layout.phone: cp[1].add_child(Kit.label(("starts " + Kit.date_of(c.startMonth)) if g.month < c.startMonth else ("ends %s · %d mo left" % [Kit.date_of(c.endMonth), int(c.endMonth - g.month)]), 12, Kit.DIM, true))
			else: cp[1].add_child(Kit.label(("starts " + Kit.date_of(c.startMonth)) if g.month < c.startMonth else ("ends %s · %d mo left" % [Kit.date_of(c.endMonth), int(c.endMonth - g.month)]) + " · overdraw +%d%% at ×%s · firmness %d%%" % [int(round(c.overdrawPct * 100.0)), c.overageMult, int(round(c.firmness * 100.0))], 12, Kit.DIM, true))
	var offers: Array = g.get("powerOffers", [])
	sc.add_child(Kit.label("POWER PLANT OFFERS (%d)" % offers.size(), 14, Kit.CY))
	if offers.is_empty(): _empty(sc, "No plant offers right now — new ones appear most months.", "Next month ▶", func(): app.next_month())
	var og := HFlowContainer.new(); og.add_theme_constant_override("h_separation", 12); og.add_theme_constant_override("v_separation", 12); sc.add_child(og)
	var draw := maxf(0.01, draw_mw)
	for o in offers:
		var m: float = mw.get(o.id, o.mw)
		var take: float = m * o.priceUSDPerMWh * pv.hours; var spot_cost: float = minf(draw, m) * spot_mwh * pv.hours; var save: float = spot_cost - minf(draw, m) * o.priceUSDPerMWh * pv.hours
		var cheaper: bool = o.priceUSDPerMWh < spot_mwh
		var card := Kit.panel("%s  ·  %s" % [o.supplier, str(o.source).to_upper()], true, og); card[0].custom_minimum_size = Vector2(minf(430.0 if not Layout.compact else 250.0, maxf(220.0, dw - 56.0)), 0); card[0].size_flags_horizontal = Control.SIZE_FILL
		if Layout.phone: card[0].custom_minimum_size = Vector2(0, 0); card[0].size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var v: VBoxContainer = card[1]
		v.add_child(_rich("$%s/MWh  [color=#%s](%s%d%% vs spot)[/color] · %d mo" % [o.priceUSDPerMWh, (Kit.GR if cheaper else Kit.RD).to_html(false), "−" if cheaper else "+", int(absf(round((o.priceUSDPerMWh / spot_mwh - 1.0) * 100.0))), int(o.termMonths)], 14))
		if Layout.phone: v.add_child(Kit.table([], [["Firmness", "%d%% months delivered" % int(round(o.firmness * 100.0))], ["Take-or-pay", "%s/mo" % Kit.usd(take)], ["Covers", "%d%% of %.2f MW draw" % [int(round(minf(1.0, m / draw) * 100.0)), draw_mw]]]))
		else: v.add_child(Kit.table([], [["Firmness", "%d%% months delivered" % int(round(o.firmness * 100.0))], ["Oversubscription limit", "+%d%% over commit, billed ×%s" % [int(round(o.overdrawPct * 100.0)), o.overageMult]], ["Take-or-pay", "%s/mo" % Kit.usd(take)], ["Covers", "%d%% of today's %.2f MW draw" % [int(round(minf(1.0, m / draw) * 100.0)), draw_mw]]]))
		if not Layout.phone: v.add_child(Kit.label(str(sources[o.source].lesson), 11, Kit.DIM, true))
		var h := HFlowContainer.new(); h.add_theme_constant_override("h_separation", 8); h.add_theme_constant_override("v_separation", 6); v.add_child(h)
		h.add_child(Kit.label("Commit", 13)); var spb := HBoxContainer.new(); spb.add_theme_constant_override("separation", 6); spb.add_child(_spin(m, 1, 1000, 1, func(x): mw[o.id] = x; refresh())); var mwl := Kit.label("MW", 13); mwl.autowrap_mode = TextServer.AUTOWRAP_OFF; spb.add_child(mwl); h.add_child(spb)
		if Layout.phone:
			var cs: SpinBox = spb.get_child(0); cs.custom_minimum_size = Vector2(130, Layout.tap())
			var sg := Kit.btn("SIGN PPA", func(): msg = b.act("signPower", [o.id, m]).message; app.sfx("buy"); refresh(), "go", 15)
			var pad := Control.new(); pad.custom_minimum_size.y = 6; v.add_child(pad); v.add_child(sg)
		else: h.add_child(Kit.btn("SIGN PPA", func(): msg = b.act("signPower", [o.id, m]).message; app.sfx("buy"); refresh(), "go", 14))
		v.add_child(Kit.label("Nothing is drawing power yet — you would pay for unused MW (resold at 80% of spot)." if draw_mw <= 0.01 else (("≈ %s/mo cheaper than spot at today's load." % Kit.usd(save)) if save >= 0 else ("≈ %s/mo dearer than spot at today's load." % Kit.usd(-save))), 11, Kit.DIM, true))
