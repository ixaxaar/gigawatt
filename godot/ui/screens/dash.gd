class_name DashScreen
extends Control
## Datacenter: the 3D hall with plaques, easy-path projects, missions, customers, log.
var app
const STAGES := ["building", "commissioning", "clustering", "assigning", "done"]
const STAGE_LBL := {"building": "Order & build", "commissioning": "Burn-in", "clustering": "Cluster", "assigning": "Assign", "done": "LIVE"}

func _ready() -> void: set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter = Control.MOUSE_FILTER_IGNORE

func _plaque(parent: Control, label: String, value: String, col: Color, trend: Array, sub: String) -> void:
	var p := PanelContainer.new(); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL; p.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.92), col, 10, 2, 12)); parent.add_child(p)
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 3); p.add_child(v)
	v.add_child(Kit.label(label, 11, Kit.DIM)); v.add_child(Kit.label(value, 26, col))
	var sp := Spark.new(); sp.values = trend; sp.color = col; v.add_child(sp); v.add_child(Kit.label(sub, 11, Kit.DIM, true))


## "What happens when I press Next Month": cash outlook, runway, arrivals and deadlines.
func _preview(col: Control, pv: Dictionary) -> void:
	if pv.is_empty(): return
	var pp := Kit.panel("Next month · %s" % Kit.date_of(int(pv.nextMonth)), false, col)
	var delta := float(pv.cashDelta)
	pp[1].add_child(Kit.rich("Cash after: [b]%s[/b]  [color=%s]%s%s[/color]" % [Kit.usd(float(pv.cashAfter)), "#4be3a1" if delta >= 0 else "#ff6b6b", "+" if delta >= 0 else "", Kit.usd(delta)], 14))
	pp[1].add_child(Kit.label("Revenue %s · running costs %s · interest %s" % [Kit.usd(float(pv.revenue)), Kit.usd(float(pv.opex)), Kit.usd(float(pv.interest))], 11, Kit.DIM, true))
	if pv.runwayMonths != null:
		var rm := int(pv.runwayMonths)
		pp[1].add_child(Kit.label("Runway: %d month%s at this burn" % [rm, "" if rm == 1 else "s"], 13, Kit.RD if rm <= 6 else Color("#ffb454")))
	var bits := []
	if pv.deliveries.size() > 0:
		var n := 0; for d in pv.deliveries: n += int(d.qty)
		bits.append("%d part%s arriving" % [n, "" if n == 1 else "s"])
	if int(pv.racks.commissioning) > 0: bits.append(Kit.plural(pv.racks.commissioning, "rack") + " start burn-in")
	if int(pv.racks.online) > 0: bits.append(Kit.plural(pv.racks.online, "rack") + " go online")
	if int(pv.racks.repaired) > 0: bits.append(Kit.plural(pv.racks.repaired, "rack") + " repaired")
	for f in pv.floor: bits.append("+%d slots in %s" % [int(f.slots), f.hall])
	if pv.completing.size() > 0: bits.append("completing: " + ", ".join(pv.completing))
	if pv.expiring.size() > 0: bits.append("offers expiring: " + ", ".join(pv.expiring))
	if bits.is_empty(): pp[1].add_child(Kit.label("Nothing scheduled.", 12, Kit.DIM))
	for t in bits: pp[1].add_child(Kit.label("• " + t, 12, Kit.TX, true))
	for w in pv.warnings: pp[1].add_child(Kit.label("⚠ " + str(w), 12, Kit.RD, true))

static var folds := {}

## The one thing to do next, with a button; the rest of the list is a short bullet list beneath it.
func _needs(col: Control, needs: Array) -> void:
	if needs.is_empty(): return
	var n: Dictionary = needs[0]
	var tint: Color = Kit.RD if n.level == "crit" else (Kit.AM if n.level == "warn" else Kit.CY)
	var pp := Kit.panel("Needs you now", true, col)
	var tl := Kit.label(str(n.title), 20, tint, true); pp[1].add_child(tl)
	pp[1].add_child(Kit.label(str(n.detail), 13, Kit.TX, true))
	var go := Kit.btn(str(n.button) + "  →", func(): _do_need(n), "go", 15); go.custom_minimum_size = Vector2(0, 40); pp[1].add_child(go)
	for i in range(1, mini(needs.size(), 4)):
		var m: Dictionary = needs[i]
		var c: Color = Kit.RD if m.level == "crit" else (Kit.AM if m.level == "warn" else Kit.DIM)
		pp[1].add_child(Kit.label("• " + str(m.title), 12, c, true))

func _do_need(n: Dictionary) -> void:
	match str(n.go):
		"story": app.open_decision()
		"finance": app.go("ops")
		"dash": app.next_month()
		_: app.go(str(n.go))

func _fold(title: String, key: String, col: Control, default_collapsed := true) -> Array:
	return Kit.fold_panel(title, key, folds, func(): refresh(), false, col, default_collapsed)

func refresh() -> void: Kit.rebuild_keep(self, _rebuild)

func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	var p: Dictionary = b.q("pnl"); var hist: Array = g.history.slice(maxi(0, g.history.size() - 24))
	var accels: float = 0.0; for c in g.clusters: accels += c.stats.accelerators if c.get("stats") != null else 0.0
	var serving: int = g.activeContracts.filter(func(a): return a.clusterIds.size() > 0).size()
	var pl := HBoxContainer.new(); pl.set_anchors_preset(Control.PRESET_BOTTOM_WIDE); pl.offset_top = -150; pl.offset_bottom = -6; pl.offset_left = 8; pl.offset_right = -520; pl.add_theme_constant_override("separation", 10); add_child(pl)
	_plaque(pl, "REVENUE / MO", Kit.usd(p.revenue), Kit.GR, hist.map(func(h): return h.revenue), Kit.plural(serving, "contract") + " serving")
	_plaque(pl, "BURN / MO", Kit.usd(p.opex), Color("#ff7a59"), hist.map(func(h): return h.opex), "power · staff · support · interest")
	_plaque(pl, "NET / MO", Kit.usd(p.net), Kit.CY if p.net >= 0 else Kit.RD, hist.map(func(h): return h.revenue - h.opex), "after depreciation")
	_plaque(pl, "NET WORTH", Kit.usd(float(b.q("netWorth"))), Color("#c792ea"), hist.map(func(h): return h.cash), "capex %s · %s GPUs clustered" % [Kit.usd(float(b.q("capexBasis"))), Kit.num(accels)])
	var rp := PanelContainer.new(); rp.set_anchors_preset(Control.PRESET_RIGHT_WIDE); rp.offset_left = -500; rp.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.95), Kit.LINE, 12, 1, 12)); add_child(rp)
	var col := Kit.column(rp, 0, true)
	_needs(col, b.q("needs"))
	_preview(col, b.q("preview"))
	var projs: Array = g.get("projects", []).filter(func(x): return x.stage != "done" or g.month - x.startMonth < 24)
	if g.get("projects", []).size() > 0:
		var pp := _fold("Easy-path projects (%d)" % projs.size(), "easy", col, projs.filter(func(x): return x.stage != "done").is_empty())
		pp[1].add_child(Kit.btn("Check now", func(): b.act("stepEasy"), "", 12))
		for x in projs.slice(maxi(0, projs.size() - 3)):
			var cust := "Spec build"
			for c in g.availableContracts:
				if c.id == x.contractId: cust = c.customer
			for a in g.activeContracts:
				if a.contract.id == x.contractId: cust = a.contract.customer
			pp[1].add_child(Kit.label("%s · %d× build" % [cust, int(x.racks)], 13))
			var at: int = -1 if x.stage == "failed" else STAGES.find(x.stage)
			var sr := HBoxContainer.new(); sr.add_theme_constant_override("separation", 4); pp[1].add_child(sr)
			for i in STAGES.size():
				var failed: bool = x.stage == "failed"
				if failed or i <= at:
					var pc: Color = Kit.RD if failed else (Kit.GR if i < at or x.stage == "done" else Kit.CY)
					sr.add_child(Kit.chip(STAGE_LBL[STAGES[i]], pc, 12))
				else: sr.add_child(Kit.label(STAGE_LBL[STAGES[i]], 12, Kit.DIM))
			pp[1].add_child(Kit.label(("✗ " if x.stage == "failed" else "") + str(x.notes[x.notes.size() - 1] if x.notes.size() > 0 else ""), 11, Kit.DIM, true))
	var ms: Array = b.q("missions"); var nxt := ms.filter(func(m): return not m.done and not g.missionsDone.has(m.id)).slice(0, 3 if g.get("mode", "operator") == "learner" else 1)
	var mp := _fold("Next mission · %d of %d done" % [g.missionsDone.size(), ms.size()], "missions", col, false)
	if nxt.is_empty(): mp[1].add_child(Kit.label("All missions complete — you run a hyperscaler.", 13, Kit.GR))
	for m in nxt:
		var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 8); mp[1].add_child(r)
		var tv := VBoxContainer.new(); tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL; r.add_child(tv); tv.add_child(Kit.label("%s  +%s" % [m.title, Kit.usd(m.reward)], 13, Kit.TX, true)); tv.add_child(Kit.label(m.hint, 11, Kit.DIM, true))
		r.add_child(Kit.btn("Go →", func(): app.go(m.go if m.go != "finance" else "dash"), "", 12))
	var cp := _fold("Customers (%d)" % g.activeContracts.size(), "customers", col, g.activeContracts.size() > 4)
	if g.activeContracts.is_empty(): cp[1].add_child(Kit.label("None yet — open Customers.", 13, Kit.DIM))
	for a in g.activeContracts:
		var sub := ("%d/%d mo · SLA misses %d" % [int(a.monthsServed), int(a.contract.durationMonths), int(a.slaMisses)]) if a.clusterIds.size() > 0 else "awaiting deployment (by %s)" % Kit.date_of(a.get("deployBy", a.startMonth + 4))
		var cr := HBoxContainer.new(); cr.add_theme_constant_override("separation", 8); cp[1].add_child(cr)
		cr.add_child(Logo.make(str(a.contract.customer), 24.0))
		cr.add_child(Kit.rich("[b]%s[/b] · %s  [color=#8fb0c8]%s · %s[/color]" % [a.contract.customer, a.contract.model.name, a.contract.kind, sub], 12))
	var lp := _fold("Log", "log", col, true)
	var logs: Array = g.log.duplicate(); logs.reverse()
	for e in logs.slice(0, 40): lp[1].add_child(Kit.label("%s — %s" % [Kit.date_of(e.month), e.text], 12, Kit.GR if e.level == "good" else (Kit.RD if e.level == "bad" else Kit.DIM), true))
