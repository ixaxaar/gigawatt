class_name OpsScreen
extends Control
## Operations: staffing, loans, hardware lifecycle (selling old racks), warehouse clearance.
var app

## Rich text in the palette's text colour (the engine default is near-white: unreadable on the light themes).
static func _rich(t: String, size := 15) -> RichTextLabel:
	var r := Kit.rich(t, size); r.add_theme_color_override("default_color", Kit.TX); return r
var msg := ""
var msg_bad := false
var fw_vendor := ""
var fw_commit := 1.0e7
var fw_months := 24

func _act(name: String, args: Array) -> void:
	var r: Dictionary = app.b.act(name, args)
	msg = str(r.get("message", "")); msg_bad = not r.get("ok", true)
	if not msg_bad: app.sfx("buy")
	refresh()

func refresh() -> void: Kit.rebuild_keep(self, _rebuild)

## A destructive action: ordinary button shape, red label, never the loudest thing on screen. Callers confirm first.
func _quiet_danger(b: Button) -> Button:
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]: b.add_theme_color_override(c, Kit.RD)
	return b

## Empty state: one line saying what to do next and one button.
func _empty(parent: Control, text: String, btn_text: String, cb: Callable) -> void:
	parent.add_child(Kit.label(text, 13, Kit.DIM, true))
	var bt := Kit.btn(btn_text, cb, "pri", 13); bt.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN; parent.add_child(bt)

func _cell(t: String, w: float, col: Color = Kit.TX, size := 11) -> Label:
	var l := Kit.label(t, size, col); l.custom_minimum_size = Vector2(w, 0); l.clip_text = true; l.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS; l.tooltip_text = t; l.mouse_filter = Control.MOUSE_FILTER_PASS; return l

## Phone: make every button in a flow row at least 140 px wide and let it grow, so rows hold two thumbs at most.
func _wide(flow: Container) -> void:
	if not Layout.phone: return
	for c in flow.get_children():
		if c is Button or c is OptionButton: c.custom_minimum_size.x = 140.0; c.size_flags_horizontal = Control.SIZE_EXPAND_FILL

func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := Kit.head_row(12); root.add_child(hd)
	hd.add_child(Kit.label("OPERATIONS", 26, Kit.CY))
	hd.add_child(Kit.label(("" if Layout.phone else "People, money and end-of-life hardware.") + ("  " + msg if msg != "" else ""), 13, Kit.RD if msg_bad else Kit.DIM, true)); Kit.hint_fix(hd, app)
	var sc := Kit.column(root, 0, true)
	var top := VBoxContainer.new(); top.add_theme_constant_override("separation", 12); sc.add_child(top)
	# --- team
	var s: Dictionary = b.q("staffing")
	var tp := Kit.panel("Team", true, top)
	tp[1].add_child(Kit.label(("%d operators (you need %d)" % [int(s.have), int(s.needed)]) if s.have >= s.needed else ("%d of %d operators needed" % [int(s.have), int(s.needed)]), 20, Kit.GR if s.have >= s.needed else Kit.RD, true))
	var full: bool = s.failureMult <= 1.01 and int(s.repairExtraMonths) < 1
	if s.have > s.needed: tp[1].add_child(Kit.label("%s spare: %s/mo each on payroll. Fine as cover while the hall grows; let them go below if you want the money back." % [Kit.plural(int(s.have - s.needed), "operator"), Kit.usd(float(s.monthlyCostUSD) / maxf(1.0, float(s.have)))], 12, Kit.DIM, true))
	tp[1].add_child(Kit.label("Fully staffed" if full else "Failures ×%.1f, repairs +%d month%s" % [s.failureMult, int(s.repairExtraMonths), "s" if int(s.repairExtraMonths) > 1 else ""], 13, Kit.GR if full else Kit.AM, true))
	if not Layout.phone: for f in s.breakdown: tp[1].add_child(Kit.label("%s: %d" % [f.label, int(f.n)], 12, Kit.DIM))
	tp[1].add_child(Kit.label(("Payroll %s/mo · hire %s each" % [Kit.usd(s.monthlyCostUSD), Kit.usd(s.hireCostUSD)]) if Layout.phone else ("Payroll %s/mo · hiring %s each · severance %s each" % [Kit.usd(s.monthlyCostUSD), Kit.usd(s.hireCostUSD), Kit.usd(s.severanceUSD)]), 12, Kit.DIM, true))
	var hb := HFlowContainer.new(); hb.add_theme_constant_override("h_separation", 8); hb.add_theme_constant_override("v_separation", 6); tp[1].add_child(hb)
	if Layout.phone: hb.add_theme_constant_override("h_separation", 12); hb.add_theme_constant_override("v_separation", 18)
	for n in [1, 5]: hb.add_child(Kit.btn("Hire %d" % n, func(): _act("hireStaff", [n]), "", 13))
	_wide(hb)
	if int(s.have) > 0:   # destructive action: its own row, apart from Hire, quiet, behind a confirm that names the cost
		tp[1].add_child(Kit.hsep())
		var lr := HBoxContainer.new(); tp[1].add_child(lr)
		var lg := _quiet_danger(Kit.btn("Let go 1", func(): Kit.confirm(self, "Let one operator go? Severance (%s) is paid now and you lose their capacity." % Kit.usd(float(s.severanceUSD)), func(): _act("fireStaff", [1]), "Let go"), "", 13))
		lr.add_child(lg)
	# --- debt
	var dp := Kit.panel("Debt", true, top)
	var interest: float = g.debt * 0.07 / 12.0
	dp[1].add_child(Kit.stats([["Cash", Kit.usd(g.cash), Kit.GR if g.cash > 0 else Kit.RD], ["Debt", Kit.usd(g.debt), Kit.RD if g.debt > 0 else Kit.TX], ["Interest · 7% APR", "%s/mo" % Kit.usd(interest)]], 3))
	var db := HFlowContainer.new(); db.add_theme_constant_override("h_separation", 8); db.add_theme_constant_override("v_separation", 6); dp[1].add_child(db)
	if Layout.phone: db.add_theme_constant_override("h_separation", 12); db.add_theme_constant_override("v_separation", 12)
	for amt in [5.0e6, 2.0e7]: db.add_child(Kit.btn("Borrow %s" % Kit.usd(amt), func(): _act("takeLoan", [int(amt)]), "", 13))
	if Layout.phone:
		_wide(db)
		db = HFlowContainer.new(); db.add_theme_constant_override("h_separation", 12); db.add_theme_constant_override("v_separation", 12); dp[1].add_child(db)
	for amt in [1.0e6, 5.0e6]:
		var rb := Kit.btn("Repay %s" % Kit.usd(amt), func(): _act("repayLoan", [int(amt)]), "", 13)
		rb.disabled = g.debt <= 0 or g.cash < amt or amt > g.debt; db.add_child(rb)
	var all := int(minf(g.debt, g.cash))
	var ab := Kit.btn("Repay all affordable", func(): _act("repayLoan", [all]), "go", 13)
	ab.disabled = g.debt <= 0 or all <= 0; db.add_child(ab); _wide(db)
	if not Layout.phone: dp[1].add_child(Kit.label("Loans land in cash instantly; interest accrues monthly. The credit limit grows with installed assets.", 11, Kit.DIM, true))
	# --- hardware lifecycle
	var lc: Dictionary = b.q("lifecycle"); var rows: Array = lc.rows.duplicate()
	rows.sort_custom(func(a, c): return a.residualPct < c.residualPct)
	var dw: float = size.x if size.x > 200.0 else app.drawer_w("ops")
	var cards: bool = Layout.phone or dw < 880.0   # the wide table needs ~800 px: below that every rack is a stacked card, nothing is clipped
	var hp := Kit.panel("Hardware lifecycle" if cards else "Hardware lifecycle — %s · residual %s · quick-sale %s · asset value %s" % [Kit.plural(int(lc.totals.racks), "rack"), Kit.usd(lc.totals.residualUSD), Kit.usd(lc.totals.saleUSD), Kit.usd(lc.totals.assetValue)], false, sc)
	if cards and not rows.is_empty(): hp[1].add_child(Kit.label("%s · sells for %s · worth %s" % [Kit.plural(int(lc.totals.racks), "rack"), Kit.usd(lc.totals.saleUSD), Kit.usd(lc.totals.assetValue)], 13, Kit.TX, true))
	if rows.is_empty(): _empty(hp[1], "No racks deployed yet — buy parts and install your first rack.", "Open Supply", func(): app.go("shop"))
	elif cards:
		var free_rows: Array = rows.filter(func(x): return str(x.get("clusterId", "")) == "")
		var cap := 12 if Layout.phone else 30
		if free_rows.size() < rows.size(): hp[1].add_child(Kit.label("%d in clusters (disband to sell)" % (rows.size() - free_rows.size()), 12, Kit.DIM, true))
		for r in free_rows.slice(0, cap):
			var sn2: String = str(r.serial); if not sn2.begins_with("RK-"): sn2 = "RK-%04d" % int(r.serial)
			var pct2: int = int(r.residualPct); var col2 := Kit.GR if pct2 >= 60 else (Kit.AM if pct2 >= 30 else Kit.RD)
			var age2: int = int(r.ageMonths)
			var card := VBoxContainer.new(); card.add_theme_constant_override("separation", 6); hp[1].add_child(card)
			card.add_child(Kit.label("%s · %s · %s" % [sn2, str(r.hallName), str(r.accelerator)], 13, Kit.TX, true))
			card.add_child(Kit.label("%s old · %d%% value left · sells %s" % [("%dy %dm" % [int(age2 / 12.0), age2 % 12]) if age2 >= 12 else "%dm" % age2, pct2, Kit.usd(r.saleUSD)], 12, col2, true))
			if str(r.get("advice", "")) != "" and not Layout.phone: card.add_child(Kit.label(str(r.advice), 12, Kit.DIM, true))
			var sb2 := _quiet_danger(Kit.btn("Sell rack", func(): Kit.confirm(self, "Sell %s for %s? This cannot be undone." % [sn2, Kit.usd(r.saleUSD)], func(): _act("decommissionRack", [r.id]), "Sell"), "", 13)); sb2.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
			card.add_child(sb2)
			hp[1].add_child(Kit.hsep())
		if free_rows.size() > cap: hp[1].add_child(Kit.label("+%d more (worst value first)" % (free_rows.size() - cap), 12, Kit.DIM))
	else:
		var cols := [["RACK", 76.0], ["HALL", 86.0], ["ACCELERATOR", 170.0], ["AGE", 58.0], ["RESID", 54.0], ["SALE", 72.0]]
		var hr := HBoxContainer.new(); hr.add_theme_constant_override("separation", 8); hp[1].add_child(hr)
		for c in cols: hr.add_child(_cell(c[0], c[1], Kit.TX, 12))
		var hh := _cell("ADVICE", 120.0, Kit.TX, 12); hh.size_flags_horizontal = Control.SIZE_EXPAND_FILL; hr.add_child(hh); hr.add_child(_cell("", 64.0, Kit.DIM))
		for r in rows.slice(0, 60):
			var sn: String = str(r.serial); if not sn.begins_with("RK-"): sn = "RK-%04d" % int(r.serial)
			var pct: int = int(r.residualPct); var col := Kit.GR if pct >= 60 else (Kit.AM if pct >= 30 else Kit.RD)
			var age: int = int(r.ageMonths); var age_s := ("%dy %dm" % [int(age / 12.0), age % 12]) if age >= 12 else "%dm" % age
			var rr := HBoxContainer.new(); rr.add_theme_constant_override("separation", 8); hp[1].add_child(rr)
			rr.add_child(_cell(sn, 76.0)); rr.add_child(_cell(str(r.hallName), 86.0)); rr.add_child(_cell(str(r.accelerator), 170.0))
			rr.add_child(_cell(age_s, 58.0)); rr.add_child(_cell("%d%%" % pct, 54.0, col)); rr.add_child(_cell(Kit.usd(r.saleUSD), 72.0))
			var ad := _cell(str(r.advice), 60.0, Kit.DIM); ad.size_flags_horizontal = Control.SIZE_EXPAND_FILL; ad.clip_text = true; ad.tooltip_text = str(r.advice); rr.add_child(ad)
			var sb := _quiet_danger(Kit.btn("Sell", func(): Kit.confirm(self, "Sell %s for %s? This cannot be undone." % [sn, Kit.usd(r.saleUSD)], func(): _act("decommissionRack", [r.id]), "Sell"), "", 12)); sb.custom_minimum_size.x = 64.0
			if str(r.get("clusterId", "")) != "":   # not sellable: say why instead of showing a dead button
				sb.queue_free(); var inl := _cell("in cluster", 64.0, Kit.DIM); inl.tooltip_text = "Disband its cluster first"; inl.mouse_filter = Control.MOUSE_FILTER_PASS; rr.add_child(inl)
			else: rr.add_child(sb)
		if rows.size() > 60: hp[1].add_child(Kit.label("+%d more" % (rows.size() - 60), 12, Kit.DIM))
		hp[1].add_child(Kit.label("Quick-sale pays 85% of residual value. Worst residuals first — old racks past their prime are the ones to replace.", 11, Kit.DIM, true))
	# --- warehouse clearance
	var sp := Kit.panel("Clear warehouse stock", false, sc)
	var ids: Array = g.inventory.keys()
	var vals := {}
	for id in ids: vals[id] = 0.6 * float(b.item(id).get("priceUSD", 0.0)) * int(g.inventory[id])
	ids.sort_custom(func(a, c): return vals[a] > vals[c])
	if ids.is_empty(): _empty(sp[1], "Warehouse is empty — nothing to sell.", "Open Supply", func(): app.go("shop"))
	var shown := 0
	for id in ids:
		if shown >= (10 if Layout.phone else 40): sp[1].add_child(Kit.label("+%d more item types" % (ids.size() - shown), 12, Kit.DIM)); break
		shown += 1
		var it: Dictionary = b.item(id); var qty: int = int(g.inventory[id])
		var sr: Container = HBoxContainer.new(); sr.add_theme_constant_override("separation", 8); sp[1].add_child(sr)
		if Layout.phone:
			var pc := VBoxContainer.new(); pc.add_theme_constant_override("separation", 8); sp[1].add_child(pc); sp[1].remove_child(sr); sr.queue_free()
			pc.add_child(Kit.label("%d× %s" % [qty, str(it.get("name", id))], 14, Kit.TX, true))
			pc.add_child(Kit.label("%s at 60%% resale" % Kit.usd(0.6 * float(it.get("priceUSD", 0.0)) * qty), 12, Kit.GR))
			var pr := HBoxContainer.new(); pr.add_theme_constant_override("separation", 16); pc.add_child(pr)
			var s1 := Kit.btn("Sell 1", func(): _act("sellInventory", [id, 1]), "", 13); s1.size_flags_horizontal = Control.SIZE_EXPAND_FILL; pr.add_child(s1)
			var sa := _quiet_danger(Kit.btn("Sell all", func(): Kit.confirm(self, "Sell all %d at the resale price? This cannot be undone." % int(qty), func(): _act("sellInventory", [id, qty]), "Sell all"), "", 13)); sa.size_flags_horizontal = Control.SIZE_EXPAND_FILL; pr.add_child(sa)
			pc.add_child(Kit.hsep())
			continue
		var nm := Kit.label("%d× %s" % [qty, str(it.get("name", id))], 13, Kit.TX, true); nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sr.add_child(nm)
		sr.add_child(Kit.label("%s at 60%% resale" % Kit.usd(0.6 * float(it.get("priceUSD", 0.0)) * qty), 12, Kit.GR))
		sr.add_child(Kit.btn("Sell 1", func(): _act("sellInventory", [id, 1]), "", 12))
		sr.add_child(_quiet_danger(Kit.btn("Sell all", func(): Kit.confirm(self, "Sell all %d at the resale price? This cannot be undone." % int(qty), func(): _act("sellInventory", [id, qty]), "Sell all"), "", 12)))
	# --- operating policy
	var pol: Dictionary = g.get("policy", {})
	var burn := int(pol.get("burnInMonths", 1)); var maint := int(pol.get("maintenance", 0))
	var pv = b.q("preview"); if typeof(pv) != TYPE_DICTIONARY: pv = {}
	var opp := Kit.panel("Operating policy", false, sc)
	opp[1].add_child(Kit.label("BURN-IN" if Layout.phone else "BURN-IN — how long new racks soak before going live", 11, Kit.DIM))
	var bh := HFlowContainer.new(); bh.add_theme_constant_override("h_separation", 6); bh.add_theme_constant_override("v_separation", 6); opp[1].add_child(bh)
	if Layout.phone: bh.add_theme_constant_override("h_separation", 12); bh.add_theme_constant_override("v_separation", 12)
	var blab := ["0 mo — skip: ships dead GPUs (3x burn-in failures)", "1 mo — standard", "2 mo — thorough (0.5x failures, +1 month lead)", "3 mo — exhaustive (0.25x failures, +2 months lead)"]
	if Layout.phone: blab = ["0 mo · skip (3x fails)", "1 mo · standard", "2 mo · 0.5x fails", "3 mo · 0.25x fails"]
	for m in 4:
		var tb := Kit.btn(blab[m], func(): _act("setPolicy", [m, maint]), "pri" if m == burn else "", 12)
		tb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; bh.add_child(tb)
	_wide(bh)
	opp[1].add_child(Kit.label("MAINTENANCE" if Layout.phone else "MAINTENANCE — how hard you fight hardware decay", 11, Kit.DIM))
	var mh := HFlowContainer.new(); mh.add_theme_constant_override("h_separation", 6); mh.add_theme_constant_override("v_separation", 6); opp[1].add_child(mh)
	var mlab := ["Reactive — $0", "Preventive — $150/rack/mo (0.75x failures)", "Premium — $400/rack/mo (0.55x failures)"]
	if Layout.phone: mlab = ["Reactive · $0", "Preventive · $150/rack · 0.75x", "Premium · $400/rack · 0.55x"]; mh.add_theme_constant_override("h_separation", 12); mh.add_theme_constant_override("v_separation", 12)
	for l in 3:
		var mb := Kit.btn(mlab[l], func(): _act("setPolicy", [burn, l]), "pri" if l == maint else "", 12)
		mb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; mh.add_child(mb)
	_wide(mh)
	if not Layout.phone: opp[1].add_child(Kit.label("Applies to racks placed from now on and to future failures. Maintenance contracts currently cost %s per month." % Kit.usd(float(pv.get("maintenanceUSD", 0.0))), 11, Kit.DIM, true))
	# --- vendor relationships & frameworks
	var vq = b.q("vendors")
	var vrows: Array = vq if typeof(vq) == TYPE_ARRAY else (vq.get("rows", []) if typeof(vq) == TYPE_DICTIONARY else [])
	var vp := Kit.panel("Vendors" if Layout.phone else "Vendor relationships & frameworks", false, sc)
	if vrows.is_empty(): _empty(vp[1], "No vendor relationships yet — buy parts to earn them.", "Open Supply", func(): app.go("shop"))
	for v in vrows:
		var fw: Dictionary = v.get("framework") if v.get("framework") != null else {}
		var vh := HFlowContainer.new(); vh.add_theme_constant_override("h_separation", 8); vh.add_theme_constant_override("v_separation", 6); vp[1].add_child(vh)
		if Layout.phone:
			var vc := VBoxContainer.new(); vc.add_theme_constant_override("separation", 8); vc.size_flags_horizontal = Control.SIZE_EXPAND_FILL; vp[1].remove_child(vh); vh.queue_free(); vp[1].add_child(vc)
			vc.add_child(Kit.label(str(v.get("name", v.get("id", "?"))), 14, Kit.TX, true))
			vc.add_child(Kit.bar(float(v.get("rel", 0.0)), 100.0))
			vc.add_child(Kit.label("relationship %d · x%.2f alloc · -%.1f%% price" % [int(v.get("rel", 0)), float(v.get("capMult", 1.0)), float(v.get("relDiscountPct", 0.0))], 12, Kit.DIM, true))
			if fw.is_empty(): vc.add_child(Kit.label("no framework", 12, Kit.DIM))
			else:
				vc.add_child(Kit.bar(float(fw.get("spentUSD", 0.0)), float(fw.get("commitUSD", 0.0))))
				vc.add_child(Kit.label("%s of %s spent · %d%% off · ends %s" % [Kit.usd(float(fw.get("spentUSD", 0.0))), Kit.usd(float(fw.get("commitUSD", 0.0))), int(fw.get("discountPct", 0)), Kit.date_of(float(fw.get("endMonth", 0)))], 12, Kit.DIM, true))
				vc.add_child(_quiet_danger(Kit.btn("Cancel framework", func():
					var unmet2: float = maxf(0.0, float(fw.get("commitUSD", 0.0)) - float(fw.get("spentUSD", 0.0)))
					Kit.confirm(self, "Cancel the %s framework? Walking away costs 20%% of the unspent commitment (%s) as a penalty and the relationship sours." % [str(v.get("name", "?")), Kit.usd(unmet2 * 0.2)], func(): _act("cancelFramework", [str(fw.get("id", ""))]), "Cancel it"), "", 13)))
			vc.add_child(Kit.hsep())
			continue
		vh.add_child(_cell(str(v.get("name", v.get("id", "?"))), 120.0))
		var relb := VBoxContainer.new(); relb.custom_minimum_size = Vector2(80.0, 0); vh.add_child(relb)
		relb.add_child(Kit.bar(float(v.get("rel", 0.0)), 100.0))
		relb.add_child(Kit.label("relationship %d" % int(v.get("rel", 0)), 10, Kit.DIM))
		vh.add_child(_cell("x%.2f alloc" % float(v.get("capMult", 1.0)), 66.0, Kit.CY))
		vh.add_child(_cell("-%.1f%% rel price" % float(v.get("relDiscountPct", 0.0)), 76.0, Kit.GR))
		if fw.is_empty():
			var nfl := _cell("no framework", 150.0, Kit.DIM); nfl.size_flags_horizontal = Control.SIZE_EXPAND_FILL; vh.add_child(nfl)
		else:
			var fpb := VBoxContainer.new(); fpb.custom_minimum_size = Vector2(150.0, 0); fpb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; vh.add_child(fpb)
			fpb.add_child(Kit.bar(float(fw.get("spentUSD", 0.0)), float(fw.get("commitUSD", 0.0))))
			fpb.add_child(Kit.label("%s of %s spent · %d%% off · ends %s" % [Kit.usd(float(fw.get("spentUSD", 0.0))), Kit.usd(float(fw.get("commitUSD", 0.0))), int(fw.get("discountPct", 0)), Kit.date_of(float(fw.get("endMonth", 0)))], 10, Kit.DIM))
			var cbn := _quiet_danger(Kit.btn("Cancel", func():
				var unmet: float = maxf(0.0, float(fw.get("commitUSD", 0.0)) - float(fw.get("spentUSD", 0.0)))
				Kit.confirm(self, "Cancel the %s framework? Walking away costs 20%% of the unspent commitment (%s) as a penalty and the relationship sours." % [str(v.get("name", "?")), Kit.usd(unmet * 0.2)], func(): _act("cancelFramework", [str(fw.get("id", ""))]), "Cancel it"), "", 11))
			vh.add_child(cbn)
	var vopts := []
	for vv in b.vendors: vopts.append([vv.id, str(vv.name)])
	var vnames := {}
	for o in vopts: vnames[o[0]] = o[1]
	if not vopts.is_empty():
		if fw_vendor == "" or not vnames.has(fw_vendor): fw_vendor = vopts[0][0]
		vp[1].add_child(Kit.hsep())
		var fh := HFlowContainer.new(); fh.add_theme_constant_override("h_separation", 8); fh.add_theme_constant_override("v_separation", 6); vp[1].add_child(fh)
		fh.add_child(Kit.label("New framework:", 12, Kit.DIM))
		fh.add_child(Kit.option(vopts, fw_vendor, func(id): fw_vendor = str(id); refresh()))
		if Layout.phone:
			var po := Kit.option([["2000000", "Commit $2M"], ["10000000", "Commit $10M"], ["50000000", "Commit $50M"]], str(int(fw_commit)), func(id): fw_commit = float(str(id)); refresh())
			po.custom_minimum_size.y = Layout.tap(); po.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			var pm := Kit.option([["12", "12 months"], ["24", "24 months"], ["36", "36 months"]], str(fw_months), func(id): fw_months = int(str(id)); refresh())
			pm.custom_minimum_size.y = Layout.tap(); pm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			fh.get_child(1).custom_minimum_size.y = Layout.tap()
			fh.add_child(po); fh.add_child(pm); po.custom_minimum_size.x = 140.0; pm.custom_minimum_size.x = 140.0; fh.add_theme_constant_override("v_separation", 12)
		for c in ([] if Layout.phone else [2.0e6, 1.0e7, 5.0e7]):
			var cb := Kit.btn(Kit.usd(c), func(): fw_commit = c; refresh(), "pri" if is_equal_approx(fw_commit, c) else "", 12)
			fh.add_child(cb)
		for mm in ([] if Layout.phone else [12, 24, 36]):
			var mtb := Kit.btn("%d mo" % mm, func(): fw_months = mm; refresh(), "pri" if fw_months == mm else "", 12)
			fh.add_child(mtb)
		var qq = b.q("frameworkQuote", [fw_vendor, int(fw_commit), fw_months]); if typeof(qq) != TYPE_DICTIONARY: qq = {}
		var sgn := Kit.btn("Sign framework", func():
			Kit.confirm(self, "Sign a %s framework with %s — %s over %d months at %d%% off their parts? The %s deposit is paid now and counts toward the commitment." % [Kit.usd(fw_commit), str(vnames.get(fw_vendor, fw_vendor)), Kit.usd(fw_commit), fw_months, int(qq.get("discountPct", 0)), Kit.usd(float(qq.get("depositUSD", 0.0)))], func(): _act("signFramework", [fw_vendor, int(fw_commit), fw_months])), "go", 13)
		sgn.disabled = not qq.get("valid", false)
		if Layout.phone: sgn.custom_minimum_size.y = Layout.tap()
		vp[1].add_child(sgn)
		if qq.get("valid", false): vp[1].add_child(Kit.label("Quote: %d%% off %s parts · deposit %s · %s over %d months." % [int(qq.get("discountPct", 0)), str(vnames.get(fw_vendor, fw_vendor)), Kit.usd(float(qq.get("depositUSD", 0.0))), Kit.usd(fw_commit), fw_months], 12, Kit.GR, true))
		else: vp[1].add_child(Kit.label("Cannot sign: %s" % str(qq.get("reason", "no quote")), 12, Kit.RD, true))
	# --- market competition
	var rq = b.q("rivals"); if typeof(rq) != TYPE_DICTIONARY: rq = {}
	var rrows: Array = rq.get("rivals", [])
	var pidx := float(rq.get("priceIndex", 1.0))
	var mp := Kit.panel("Market competition", false, sc)
	var why := "Rivals are undercutting: contract offers are priced x%.2f." if pidx < 0.995 else ("Your scale commands a premium: contract offers are priced x%.2f." if pidx > 1.005 else "Contract offers are priced at list (x%.2f).")
	if not Layout.phone: mp[1].add_child(Kit.label(why % pidx, 12, Kit.DIM, true))
	mp[1].add_child(Kit.stats([["Price index", "x%.2f" % pidx, Kit.RD if pidx < 0.995 else (Kit.AM if pidx > 1.005 else Kit.TX)], ["Your accels", Kit.num(float(rq.get("playerAccels", 0.0)))], ["Your share", "%.1f%%" % float(rq.get("playerSharePct", 0.0))]], 3))
	if rrows.is_empty(): mp[1].add_child(Kit.label("No rival operators tracked yet.", 12, Kit.DIM))
	for r in rrows:
		var rh: Container = HBoxContainer.new(); rh.add_theme_constant_override("separation", 8); mp[1].add_child(rh)
		if Layout.phone:
			mp[1].remove_child(rh); rh.queue_free()
			var pm2 := float(r.get("priceMult", 1.0))
			var rc := VBoxContainer.new(); rc.add_theme_constant_override("separation", 6); mp[1].add_child(rc)
			rc.add_child(Kit.label("%s · %s" % [str(r.get("name", "?")), str(r.get("style", ""))], 14, Kit.TX, true))
			rc.add_child(Kit.bar(float(r.get("sharePct", 0.0)), 100.0))
			rc.add_child(Kit.label("%.1f%% share · %s accels · %s" % [float(r.get("sharePct", 0.0)), Kit.num(float(r.get("accels", 0.0))), ("undercutting %d%%" % int(round((1.0 - pm2) * 100.0))) if pm2 < 0.995 else (("premium %d%%" % int(round((pm2 - 1.0) * 100.0))) if pm2 > 1.005 else "at list price")], 12, Kit.DIM, true))
			continue
		rh.add_child(_cell("%s · %s" % [str(r.get("name", "?")), str(r.get("style", ""))], 160.0))
		var shb := VBoxContainer.new(); shb.custom_minimum_size = Vector2(90.0, 0); shb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; rh.add_child(shb)
		shb.add_child(Kit.bar(float(r.get("sharePct", 0.0)), 100.0))
		shb.add_child(Kit.label("%.1f%% share" % float(r.get("sharePct", 0.0)), 10, Kit.DIM))
		rh.add_child(_cell("%s accels" % Kit.num(float(r.get("accels", 0.0))), 90.0))
		var pm := float(r.get("priceMult", 1.0))
		var ptxt := "undercutting %d%%" % int(round((1.0 - pm) * 100.0)) if pm < 0.995 else ("premium %d%%" % int(round((pm - 1.0) * 100.0)) if pm > 1.005 else "at list price")
		rh.add_child(_cell(ptxt, 110.0, Kit.RD if pm < 0.995 else (Kit.AM if pm > 1.005 else Kit.DIM)))
	if not Layout.phone: mp[1].add_child(Kit.label(str(rq.get("headline", "")), 12, Kit.DIM, true))
