class_name EnergyScreen
extends Control
## Energy & spot market: power position, PPAs, spot GPU market, offering idle capacity.
var app
var msg := ""
var mw := {}
const ICON := {"grid": "GRID", "solar": "SOLAR", "gas": "GAS", "hydro": "HYDRO", "nuclear": "NUCLEAR"}

func refresh() -> void: Kit.rebuild_keep(self, _rebuild)

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
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := Kit.head_row(12); root.add_child(hd)
	hd.add_child(Kit.label("ENERGY & SPOT MARKET", 26, Kit.CY)); hd.add_child(Kit.label("Buy power on take-or-pay contracts (cheap, but paid even if unused) or stay on spot." + ("  " + msg if msg != "" else ""), 13, Kit.DIM, true)); Kit.hint_fix(hd, app)
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
	var p2 := Kit.panel("Spot GPU market   $%.2f/GPU-hr" % price, true, top)
	var spk := Spark.new(); spk.values = g.get("spotHistory", []); spk.custom_minimum_size = Vector2(0, 46); p2[1].add_child(spk)
	p2[1].add_child(Kit.stats([["Demand (fill rate)", "%d%%" % int(round(util * 100.0))], ["Your power cost", "$%.2f/GPU-hr" % cost_gpu_hr]], 2))
	p2[1].add_child(Kit.label("Spot price follows supply and demand; when it spikes, idle clusters print money, when it crashes they barely cover power. Spot is pre-emptible — contracts always win.", 12, Kit.DIM, true))
	var rr := HBoxContainer.new(); rr.add_theme_constant_override("separation", 8); p2[1].add_child(rr)
	rr.add_child(Kit.label("Reserve price $", 13)); rr.add_child(Kit.spin(g.get("spotReserve", 0.0), 0, 20, 0.1, func(v): msg = b.act("setSpotReserve", [v]).message))
	rr.add_child(Kit.label("/GPU-hr  (won't sell below it)", 12, Kit.DIM))
	# idle capacity
	var p3 := Kit.panel("Offer idle capacity on spot", false, top)
	p3[1].add_child(Kit.label("No cluster needed: tick individual racks. They earn while they wait for a contract; once a contract takes them they leave spot automatically.", 12, Kit.DIM, true))
	var racks := []; for h in g.halls: racks.append_array(h.racks)
	if racks.is_empty(): p3[1].add_child(Kit.label("Deploy a rack first (Warehouse).", 12, Kit.DIM))
	for r in racks:
		var dn := ""; for d in g.racks:
			if d.id == r.designId: dn = d.name
		var cb := Kit.check("%s · %s" % [dn, r.status], g.get("spotRacks", []).has(r.id), func(on): msg = b.act("setSpotRack", [r.id, on]).message; refresh()); cb.disabled = r.status != "online"; p3[1].add_child(cb)
	if g.clusters.size() > 0: p3[1].add_child(Kit.label("Whole clusters:", 11, Kit.DIM))
	for c in g.clusters:
		var serving: bool = g.activeContracts.any(func(a): return a.clusterIds.has(c.id))
		var cb2 := Kit.check("%s%s" % [c.name, " (serving a contract)" if serving else ""], g.get("spotClusters", []).has(c.id), func(on): msg = b.act("setSpot", [c.id, on]).message; refresh()); p3[1].add_child(cb2)
	p3[1].add_child(Kit.rich("Projected spot revenue: [color=#%s][b]%s[/b][/color]/mo%s" % [Kit.GR.to_html(false), Kit.usd(sp.revenue), " (below your reserve)" if price < g.get("spotReserve", 0.0) else ""], 13))
	sc.add_child(Kit.tip("A PPA is a long contract to buy fixed MW from a power plant. It is cheaper than spot, but you pay for the committed MW even if unused (surplus is resold at a discount). Spot GPU sells idle racks hour by hour — no cluster needed."))
	if contracts.size() > 0:
		sc.add_child(Kit.label("YOUR POWER CONTRACTS", 14, Kit.CY))
		for c in contracts:
			var cp := Kit.panel("%s  ·  %s" % [c.supplier, str(c.source).to_upper()], false, sc)
			cp[1].add_child(Kit.label("%s MW · $%s/MWh · take-or-pay %s/mo" % [c.mw, c.priceUSDPerMWh, Kit.usd(c.mw * c.priceUSDPerMWh * pv.hours)], 13))
			cp[1].add_child(Kit.label(("starts " + Kit.date_of(c.startMonth)) if g.month < c.startMonth else ("ends %s · %d mo left" % [Kit.date_of(c.endMonth), int(c.endMonth - g.month)]) + " · overdraw +%d%% at ×%s · firmness %d%%" % [int(round(c.overdrawPct * 100.0)), c.overageMult, int(round(c.firmness * 100.0))], 12, Kit.DIM, true))
	var offers: Array = g.get("powerOffers", [])
	sc.add_child(Kit.label("POWER PLANT OFFERS (%d)" % offers.size(), 14, Kit.CY))
	if offers.is_empty(): sc.add_child(Kit.label("No offers right now — new ones appear most months.", 13, Kit.DIM))
	var og := HFlowContainer.new(); og.add_theme_constant_override("h_separation", 12); og.add_theme_constant_override("v_separation", 12); sc.add_child(og)
	var draw := maxf(0.01, draw_mw)
	for o in offers:
		var m: float = mw.get(o.id, o.mw)
		var take: float = m * o.priceUSDPerMWh * pv.hours; var spot_cost: float = minf(draw, m) * spot_mwh * pv.hours; var save: float = spot_cost - minf(draw, m) * o.priceUSDPerMWh * pv.hours
		var cheaper: bool = o.priceUSDPerMWh < spot_mwh
		var card := Kit.panel("%s  ·  %s" % [o.supplier, str(o.source).to_upper()], true, og); card[0].custom_minimum_size = Vector2(430, 0); card[0].size_flags_horizontal = Control.SIZE_FILL
		var v: VBoxContainer = card[1]
		v.add_child(Kit.rich("$%s/MWh  [color=#%s](%s%d%% vs spot)[/color] · %d mo" % [o.priceUSDPerMWh, (Kit.GR if cheaper else Kit.RD).to_html(false), "−" if cheaper else "+", int(absf(round((o.priceUSDPerMWh / spot_mwh - 1.0) * 100.0))), int(o.termMonths)], 14))
		v.add_child(Kit.table([], [["Firmness", "%d%% months delivered" % int(round(o.firmness * 100.0))], ["Oversubscription limit", "+%d%% over commit, billed ×%s" % [int(round(o.overdrawPct * 100.0)), o.overageMult]], ["Take-or-pay", "%s/mo" % Kit.usd(take)], ["Covers", "%d%% of today's %.2f MW draw" % [int(round(minf(1.0, m / draw) * 100.0)), draw_mw]]]))
		v.add_child(Kit.label(str(sources[o.source].lesson), 11, Kit.DIM, true))
		var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 8); v.add_child(h)
		h.add_child(Kit.label("Commit", 13)); h.add_child(Kit.spin(m, 1, 1000, 1, func(x): mw[o.id] = x; refresh())); h.add_child(Kit.label("MW", 13))
		h.add_child(Kit.btn("SIGN PPA", func(): msg = b.act("signPower", [o.id, m]).message; app.sfx("buy"); refresh(), "go", 14))
		v.add_child(Kit.label("Nothing is drawing power yet — you would pay for unused MW (resold at 80% of spot)." if draw_mw <= 0.01 else (("≈ %s/mo cheaper than spot at today's load." % Kit.usd(save)) if save >= 0 else ("≈ %s/mo dearer than spot at today's load." % Kit.usd(-save))), 11, Kit.DIM, true))
