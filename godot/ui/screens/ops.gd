class_name OpsScreen
extends Control
## Operations: staffing, loans, hardware lifecycle (selling old racks), warehouse clearance.
var app
var msg := ""
var msg_bad := false

func _act(name: String, args: Array) -> void:
	var r: Dictionary = app.b.act(name, args)
	msg = str(r.get("message", "")); msg_bad = not r.get("ok", true)
	if not msg_bad: app.sfx("buy")
	refresh()

func refresh() -> void: Kit.rebuild_keep(self, _rebuild)

func _cell(t: String, w: float, col: Color = Kit.TX, size := 11) -> Label:
	var l := Kit.label(t, size, col); l.custom_minimum_size = Vector2(w, 0); return l

func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := HBoxContainer.new(); hd.add_theme_constant_override("separation", 12); root.add_child(hd)
	hd.add_child(Kit.label("OPERATIONS", 26, Kit.CY))
	hd.add_child(Kit.label("People, money and end-of-life hardware." + ("  " + msg if msg != "" else ""), 13, Kit.RD if msg_bad else Kit.DIM, true))
	var sc := Kit.column(root, 0, true)
	var top := HBoxContainer.new(); top.add_theme_constant_override("separation", 12); sc.add_child(top)
	# --- team
	var s: Dictionary = b.q("staffing")
	var tp := Kit.panel("Team", true, top)
	tp[1].add_child(Kit.label("%d / %d operators" % [int(s.have), int(s.needed)], 20, Kit.GR if s.have >= s.needed else Kit.RD))
	var full: bool = s.failureMult <= 1.01 and int(s.repairExtraMonths) < 1
	tp[1].add_child(Kit.label("Fully staffed" if full else "Failures ×%.1f, repairs +%d month%s" % [s.failureMult, int(s.repairExtraMonths), "s" if int(s.repairExtraMonths) > 1 else ""], 13, Kit.GR if full else Kit.AM, true))
	for f in s.breakdown: tp[1].add_child(Kit.label("%s: %d" % [f.label, int(f.n)], 12, Kit.DIM))
	tp[1].add_child(Kit.label("Payroll %s/mo · hiring %s each · severance %s each" % [Kit.usd(s.monthlyCostUSD), Kit.usd(s.hireCostUSD), Kit.usd(s.severanceUSD)], 12, Kit.DIM, true))
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 8); tp[1].add_child(hb)
	for n in [1, 5]: hb.add_child(Kit.btn("Hire %d" % n, func(): _act("hireStaff", [n]), "", 13))
	hb.add_child(Kit.btn("Let go 1", func(): _act("fireStaff", [1]), "danger", 13))
	# --- debt
	var dp := Kit.panel("Debt", true, top)
	var interest: float = g.debt * 0.07 / 12.0
	dp[1].add_child(Kit.stats([["Cash", Kit.usd(g.cash), Kit.GR if g.cash > 0 else Kit.RD], ["Debt", Kit.usd(g.debt), Kit.RD if g.debt > 0 else Kit.TX], ["Interest · 7% APR", "%s/mo" % Kit.usd(interest)]], 3))
	var db := HBoxContainer.new(); db.add_theme_constant_override("separation", 8); dp[1].add_child(db)
	for amt in [5.0e6, 2.0e7]: db.add_child(Kit.btn("Borrow %s" % Kit.usd(amt), func(): _act("takeLoan", [int(amt)]), "", 13))
	for amt in [1.0e6, 5.0e6]:
		var rb := Kit.btn("Repay %s" % Kit.usd(amt), func(): _act("repayLoan", [int(amt)]), "", 13)
		rb.disabled = g.debt <= 0 or g.cash < amt; db.add_child(rb)
	var all := int(minf(g.debt, g.cash))
	var ab := Kit.btn("Repay all affordable", func(): _act("repayLoan", [all]), "go", 13)
	ab.disabled = g.debt <= 0 or all <= 0; db.add_child(ab)
	dp[1].add_child(Kit.label("Loans land in cash instantly; interest accrues monthly. The credit limit grows with installed assets.", 11, Kit.DIM, true))
	# --- hardware lifecycle
	var lc: Dictionary = b.q("lifecycle"); var rows: Array = lc.rows.duplicate()
	rows.sort_custom(func(a, c): return a.residualPct < c.residualPct)
	var hp := Kit.panel("Hardware lifecycle — %d racks · residual %s · quick-sale %s · asset value %s" % [int(lc.totals.racks), Kit.usd(lc.totals.residualUSD), Kit.usd(lc.totals.saleUSD), Kit.usd(lc.totals.assetValue)], false, sc)
	if rows.is_empty(): hp[1].add_child(Kit.label("No racks deployed yet.", 12, Kit.DIM))
	else:
		var cols := [["RACK", 76.0], ["HALL", 86.0], ["ACCELERATOR", 170.0], ["AGE", 58.0], ["RESID", 54.0], ["SALE", 72.0]]
		var hr := HBoxContainer.new(); hr.add_theme_constant_override("separation", 8); hp[1].add_child(hr)
		for c in cols: hr.add_child(_cell(c[0], c[1], Kit.DIM))
		var hh := _cell("ADVICE", 120.0, Kit.DIM); hh.size_flags_horizontal = Control.SIZE_EXPAND_FILL; hr.add_child(hh); hr.add_child(_cell("", 64.0, Kit.DIM))
		for r in rows.slice(0, 60):
			var sn: String = str(r.serial); if not sn.begins_with("RK-"): sn = "RK-%04d" % int(r.serial)
			var pct: int = int(r.residualPct); var col := Kit.GR if pct >= 60 else (Kit.AM if pct >= 30 else Kit.RD)
			var age: int = int(r.ageMonths); var age_s := ("%dy %dm" % [int(age / 12.0), age % 12]) if age >= 12 else "%dm" % age
			var rr := HBoxContainer.new(); rr.add_theme_constant_override("separation", 8); hp[1].add_child(rr)
			rr.add_child(_cell(sn, 76.0)); rr.add_child(_cell(str(r.hallName), 86.0)); rr.add_child(_cell(str(r.accelerator), 170.0))
			rr.add_child(_cell(age_s, 58.0)); rr.add_child(_cell("%d%%" % pct, 54.0, col)); rr.add_child(_cell(Kit.usd(r.saleUSD), 72.0))
			var ad := _cell(str(r.advice), 120.0, Kit.DIM); ad.size_flags_horizontal = Control.SIZE_EXPAND_FILL; rr.add_child(ad)
			var sb := Kit.btn("Sell", func(): _act("decommissionRack", [r.id]), "", 12)
			if str(r.get("clusterId", "")) != "": sb.disabled = true; sb.tooltip_text = "Disband its cluster first"
			rr.add_child(sb)
		if rows.size() > 60: hp[1].add_child(Kit.label("+%d more" % (rows.size() - 60), 12, Kit.DIM))
		hp[1].add_child(Kit.label("Quick-sale pays 85% of residual value. Worst residuals first — old racks past their prime are the ones to replace.", 11, Kit.DIM, true))
	# --- warehouse clearance
	var sp := Kit.panel("Clear warehouse stock", false, sc)
	var ids: Array = g.inventory.keys()
	var vals := {}
	for id in ids: vals[id] = 0.6 * float(b.item(id).get("priceUSD", 0.0)) * int(g.inventory[id])
	ids.sort_custom(func(a, c): return vals[a] > vals[c])
	if ids.is_empty(): sp[1].add_child(Kit.label("Warehouse is empty — nothing to sell.", 12, Kit.DIM))
	var shown := 0
	for id in ids:
		if shown >= 40: sp[1].add_child(Kit.label("+%d more item types" % (ids.size() - 40), 12, Kit.DIM)); break
		shown += 1
		var it: Dictionary = b.item(id); var qty: int = int(g.inventory[id])
		var sr := HBoxContainer.new(); sr.add_theme_constant_override("separation", 8); sp[1].add_child(sr)
		var nm := Kit.label("%d× %s" % [qty, str(it.get("name", id))], 13, Kit.TX, true); nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL; sr.add_child(nm)
		sr.add_child(Kit.label("%s at 60%% resale" % Kit.usd(0.6 * float(it.get("priceUSD", 0.0)) * qty), 12, Kit.GR))
		sr.add_child(Kit.btn("Sell 1", func(): _act("sellInventory", [id, 1]), "", 12))
		sr.add_child(Kit.btn("Sell all", func(): _act("sellInventory", [id, qty]), "danger", 12))
