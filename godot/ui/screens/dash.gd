class_name DashScreen
extends Control
## Datacenter: the 3D hall with plaques, easy-path projects, missions, customers, log.
var app
const STAGES := ["building", "commissioning", "clustering", "assigning", "done"]
const STAGE_LBL := {"building": "Order & build", "commissioning": "Burn-in", "clustering": "Cluster", "assigning": "Assign", "done": "LIVE"}

func _ready() -> void: set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter = Control.MOUSE_FILTER_IGNORE

func _plaque(parent: Control, label: String, value: String, col: Color, trend: Array, sub: String) -> void:
	var p := PanelContainer.new(); p.size_flags_horizontal = Control.SIZE_EXPAND_FILL; p.add_theme_stylebox_override("panel", Kit.sb(Color(0.03, 0.05, 0.08, 0.92), col, 10, 2, 12)); parent.add_child(p)
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 3); p.add_child(v)
	v.add_child(Kit.label(label, 11, Kit.DIM)); v.add_child(Kit.label(value, 26, col))
	var sp := Spark.new(); sp.values = trend; sp.color = col; v.add_child(sp); v.add_child(Kit.label(sub, 11, Kit.DIM, true))

func refresh() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	var p: Dictionary = b.q("pnl"); var hist: Array = g.history.slice(maxi(0, g.history.size() - 24))
	var accels: float = 0.0; for c in g.clusters: accels += c.stats.accelerators if c.get("stats") != null else 0.0
	var serving: int = g.activeContracts.filter(func(a): return a.clusterIds.size() > 0).size()
	var pl := HBoxContainer.new(); pl.set_anchors_preset(Control.PRESET_BOTTOM_WIDE); pl.offset_top = -150; pl.offset_bottom = -6; pl.offset_left = 8; pl.offset_right = -520; pl.add_theme_constant_override("separation", 10); add_child(pl)
	_plaque(pl, "REVENUE / MO", Kit.usd(p.revenue), Kit.GR, hist.map(func(h): return h.revenue), "%d contracts serving" % serving)
	_plaque(pl, "BURN / MO", Kit.usd(p.opex), Color("#ff7a59"), hist.map(func(h): return h.opex), "power · staff · support · interest")
	_plaque(pl, "NET / MO", Kit.usd(p.net), Kit.CY if p.net >= 0 else Kit.RD, hist.map(func(h): return h.revenue - h.opex), "after depreciation")
	_plaque(pl, "NET WORTH", Kit.usd(float(b.q("netWorth"))), Color("#c792ea"), hist.map(func(h): return h.cash), "capex %s · %s GPUs clustered" % [Kit.usd(float(b.q("capexBasis"))), Kit.num(accels)])
	var rp := PanelContainer.new(); rp.set_anchors_preset(Control.PRESET_RIGHT_WIDE); rp.offset_left = -500; rp.add_theme_stylebox_override("panel", Kit.sb(Color(0.03, 0.045, 0.07, 0.95), Kit.LINE, 12, 1, 12)); add_child(rp)
	var col := Kit.column(rp, 0, true)
	var projs: Array = g.get("projects", []).filter(func(x): return x.stage != "done" or g.month - x.startMonth < 24)
	if g.get("projects", []).size() > 0:
		var pp := Kit.panel("Easy-path projects", true, col)
		pp[1].add_child(Kit.btn("Check now", func(): b.act("stepEasy"), "", 12))
		for x in projs.slice(maxi(0, projs.size() - 3)):
			var cust := "Contract"
			for c in g.availableContracts:
				if c.id == x.contractId: cust = c.customer
			for a in g.activeContracts:
				if a.contract.id == x.contractId: cust = a.contract.customer
			pp[1].add_child(Kit.label("%s · %d× build" % [cust, int(x.racks)], 13))
			var at: int = -1 if x.stage == "failed" else STAGES.find(x.stage)
			var sr := HBoxContainer.new(); sr.add_theme_constant_override("separation", 4); pp[1].add_child(sr)
			for i in STAGES.size(): sr.add_child(Kit.label(STAGE_LBL[STAGES[i]], 11, Kit.RD if x.stage == "failed" else (Kit.GR if i < at else (Kit.CY if i == at else Kit.DIM))))
			pp[1].add_child(Kit.label(("✗ " if x.stage == "failed" else "") + str(x.notes[x.notes.size() - 1] if x.notes.size() > 0 else ""), 11, Kit.DIM, true))
	var ms: Array = b.q("missions"); var nxt := ms.filter(func(m): return not m.done and not g.missionsDone.has(m.id)).slice(0, 3)
	var mp := Kit.panel("Missions · learn the stack  %d/%d" % [g.missionsDone.size(), ms.size()], false, col)
	if nxt.is_empty(): mp[1].add_child(Kit.label("All missions complete — you run a hyperscaler.", 13, Kit.GR))
	for m in nxt:
		var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 8); mp[1].add_child(r)
		var tv := VBoxContainer.new(); tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL; r.add_child(tv); tv.add_child(Kit.label("%s  +%s" % [m.title, Kit.usd(m.reward)], 13, Kit.TX, true)); tv.add_child(Kit.label(m.hint, 11, Kit.DIM, true))
		r.add_child(Kit.btn("Go →", func(): app.go(m.go if m.go != "finance" else "dash"), "", 12))
	var cp := Kit.panel("Customers", false, col)
	if g.activeContracts.is_empty(): cp[1].add_child(Kit.label("None yet — open Customers.", 13, Kit.DIM))
	for a in g.activeContracts:
		var sub := ("%d/%d mo · SLA misses %d" % [int(a.monthsServed), int(a.contract.durationMonths), int(a.slaMisses)]) if a.clusterIds.size() > 0 else "awaiting deployment (by %s)" % Kit.date_of(a.get("deployBy", a.startMonth + 4))
		cp[1].add_child(Kit.rich("[b]%s[/b] · %s  [color=#8fb0c8]%s · %s[/color]" % [a.contract.customer, a.contract.model.name, a.contract.kind, sub], 12))
	var lp := Kit.panel("Log", false, col)
	var logs: Array = g.log.duplicate(); logs.reverse()
	for e in logs.slice(0, 40): lp[1].add_child(Kit.label("%s — %s" % [Kit.date_of(e.month), e.text], 12, Kit.GR if e.level == "good" else (Kit.RD if e.level == "bad" else Kit.DIM), true))
