class_name DashScreen
extends Control
## Datacenter: the 3D hall with plaques, easy-path projects, missions, customers, log.
var app

## Rich text in the palette's text colour (the engine default is near-white: unreadable on the light themes).
static func _rich(t: String, size := 15) -> RichTextLabel:
	var r := Kit.rich(t, size); r.add_theme_color_override("default_color", Kit.TX); return r
const STAGES := ["building", "commissioning", "clustering", "assigning", "done"]
const STAGE_LBL := {"building": "Order & build", "commissioning": "Burn-in", "clustering": "Cluster", "assigning": "Assign", "done": "LIVE"}

func _ready() -> void: set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter = Control.MOUSE_FILTER_IGNORE

## "What happens when I press Next Month": cash outlook, runway, arrivals and deadlines.
func _preview(col: Control, pv: Dictionary) -> void:
	if pv.is_empty(): return
	var pp := Kit.panel("Next month · %s" % Kit.date_of(int(pv.nextMonth)), false, col)
	var delta := float(pv.cashDelta)
	pp[1].add_child(_rich("Cash after: [b]%s[/b]  [color=#%s]%s%s[/color]" % [Kit.usd(float(pv.cashAfter)), (Kit.GR if delta >= 0 else Kit.RD).to_html(false), "+" if delta >= 0 else "", Kit.usd(delta)], 14))
	if not Layout.phone: pp[1].add_child(Kit.label("Revenue %s · running costs %s · interest %s" % [Kit.usd(float(pv.revenue)), Kit.usd(float(pv.opex)), Kit.usd(float(pv.interest))], 11, Kit.DIM, true))
	if delta >= 0: pp[1].add_child(Kit.label("Profitable this month", 13, Kit.GR))
	elif pv.runwayMonths != null:   # a runway is only news when you are burning cash and it is short
		var rm := int(pv.runwayMonths)
		if rm < 36: pp[1].add_child(Kit.label("Runway: %s at this burn" % Kit.plural(rm, "month"), 13, Kit.RD if rm <= 6 else Kit.AM))
		else: pp[1].add_child(Kit.label("Runway: %s at this burn" % ("10+ years" if rm >= 120 else "%d years" % int(rm / 12.0)), 13, Kit.DIM))
	var bits := []
	if pv.deliveries.size() > 0:
		var n := 0; for d in pv.deliveries: n += int(d.qty)
		bits.append("%s arriving" % Kit.plural(n, "part"))
	if int(pv.racks.commissioning) > 0: bits.append(Kit.plural(pv.racks.commissioning, "rack") + (" starts burn-in" if int(pv.racks.commissioning) == 1 else " start burn-in"))
	if int(pv.racks.online) > 0: bits.append(Kit.plural(pv.racks.online, "rack") + (" goes online" if int(pv.racks.online) == 1 else " go online"))
	if int(pv.racks.repaired) > 0: bits.append(Kit.plural(pv.racks.repaired, "rack") + " repaired")
	for f in pv.floor: bits.append("+%d slots in %s" % [int(f.slots), f.hall])
	if pv.completing.size() > 0: bits.append("completing: " + ", ".join(pv.completing))
	if pv.expiring.size() > 0: bits.append("offers expiring: " + ", ".join(pv.expiring))
	if bits.is_empty(): pp[1].add_child(Kit.label("Nothing scheduled.", 12, Kit.DIM))
	if Layout.phone and bits.size() > 3: bits = bits.slice(0, 3)
	for t in bits: pp[1].add_child(Kit.label("• " + t, 12, Kit.TX, true))
	for w in pv.warnings: pp[1].add_child(Kit.label("⚠ " + str(w), 12, Kit.RD, true))

static var folds := {}

## The one thing to do next, with a button; the rest of the list is a short bullet list beneath it.
func _needs(col: Control, needs: Array) -> void:
	if str(app.b.g.get("mode", "operator")) == "tycoon": needs = needs.filter(func(x): return x.level != "info")   # tycoons get alerts, not hand-holding
	if needs.is_empty(): return
	var n: Dictionary = needs[0]
	var tint: Color = Kit.RD if n.level == "crit" else (Kit.AM if n.level == "warn" else Kit.CY)
	var pp := Kit.panel("Needs you now", true, col)
	var tl := Kit.label(str(n.title), 20, tint, true); pp[1].add_child(tl)
	var det := str(n.detail)
	if Layout.phone:   # one short sentence; the full text is a tap away on the target screen
		var dot := det.find(". "); if dot > 0: det = det.substr(0, dot + 1)
		if det.length() > 110: det = det.substr(0, 107).strip_edges() + "…"
	pp[1].add_child(Kit.label(det, 13, Kit.TX, true))
	var go := Kit.btn(str(n.button) + "  →", func(): _do_need(n), "go", 15); go.custom_minimum_size = Vector2(0, maxf(40.0, Layout.tap())); pp[1].add_child(go)
	for i in range(1, mini(needs.size(), 2 if Layout.phone else 4)):
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

## The fabric at a glance: bandwidth per cluster, links down, and the internet uplink. Click through to the Supercomputer screen.
func _net_card(col: Control, nh) -> void:
	if not (nh is Dictionary) or (nh.clusters.is_empty() and float(nh.uplink.needGbps) <= 0.0): return
	var lv := int(nh.level); var tint: Color = [Kit.GR, Kit.AM, Kit.RD][lv]
	var np := _fold("Network · %s" % nh.summary, "net", col, lv == 0)
	for c in nh.clusters:
		var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 8); np[1].add_child(r)
		var tv := VBoxContainer.new(); tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL; r.add_child(tv)
		tv.add_child(Kit.label("%s · %s accelerators" % [c.name, Kit.num(c.accels)], 13, Kit.TX, true))
		if not Layout.phone: tv.add_child(Kit.label("%s %s%s · %.1f GB/s per GPU" % [str(c.tech).to_upper(), str(c.topology).replace("-", " "), (" · %d:1" % int(c.oversub)) if float(c.oversub) > 1.0 else "", float(c.gbs)], 12, Kit.DIM, true))
		if int(c.down) > 0: tv.add_child(Kit.label("🔗 %d × %s down (-%.1f%% bandwidth), fixed in %s%s" % [int(c.down), c.cableName, float(c.loss) * 100.0, Kit.date_of(int(c.fixMonth)), "" if c.fromSpares else " · no spares on the shelf"], 12, Kit.RD, true))
		r.add_child(Kit.chip("DOWN" if int(c.down) > 0 else "OK", Kit.RD if int(c.down) > 0 else Kit.GR, 12))
	var up: Dictionary = nh.uplink
	if not up.unlimited and float(up.gbps) > 0.0:
		np[1].add_child(Kit.label("Internet uplink: %.1f of %.0f Gb/s used (%d%%)" % [float(up.needGbps), float(up.gbps), int(float(up.pct) * 100.0)], 12, tint if lv == 2 or float(up.pct) > 0.85 else Kit.DIM, true))
		np[1].add_child(Kit.bar(float(up.pct), 1.0, float(up.pct) > 0.85))
	np[1].add_child(Kit.link("Open Supercomputer →", func(): app.go("network"), 12))

func refresh() -> void: Kit.rebuild_keep(self, _rebuild)

func _cust_of(g: Dictionary, x: Dictionary) -> String:
	var cust := "Spec build"
	for c in g.availableContracts:
		if c.id == x.contractId: cust = c.customer
	for a in g.activeContracts:
		if a.contract.id == x.contractId: cust = a.contract.customer
	return cust

## One Easy-path build: a one-line summary (tap to expand) or, when it is the only one, the full stage strip.
func _project(parent: Control, x: Dictionary, summary: bool) -> void:
	var g: Dictionary = app.b.g
	var cust := _cust_of(g, x)
	var at: int = -1 if x.stage == "failed" else STAGES.find(x.stage)
	var key := "pj" + str(x.contractId)
	var open: bool = not summary or bool(folds.get(key, false))
	if summary:
		var lbl: String = STAGE_LBL.get(x.stage, "Failed")
		var hb := Kit.btn(("▾ " if open else "▸ ") + "%s · %d× build · %s" % [cust, int(x.racks), lbl], func(): folds[key] = not open; refresh(), "", 12)
		hb.alignment = HORIZONTAL_ALIGNMENT_LEFT; hb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; parent.add_child(hb)
		if not open: return
	else: parent.add_child(Kit.label("%s · %d× build" % [cust, int(x.racks)], 13))
	var sr := HFlowContainer.new(); sr.add_theme_constant_override("h_separation", 4); sr.add_theme_constant_override("v_separation", 4); parent.add_child(sr)   # flows onto a second line in a narrow drawer
	if Layout.phone and x.stage == "done": sr.add_child(Kit.chip(STAGE_LBL["done"], Kit.GR, 12))
	else:
		for i in STAGES.size():
			var failed: bool = x.stage == "failed"
			if failed or i <= at:
				var pc: Color = Kit.RD if failed else (Kit.GR if i < at or x.stage == "done" else Kit.CY)
				sr.add_child(Kit.chip(STAGE_LBL[STAGES[i]], pc, 12))
			else: sr.add_child(Kit.label(STAGE_LBL[STAGES[i]], 12, Kit.DIM))
	if not Layout.phone or x.stage == "failed": parent.add_child(Kit.label(("✗ " if x.stage == "failed" else "") + str(x.notes[x.notes.size() - 1] if x.notes.size() > 0 else ""), 11, Kit.DIM, true))

func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	var p: Dictionary = b.q("pnl"); var hist: Array = g.history.slice(maxi(0, g.history.size() - 24))
	var accels: float = 0.0; for c in g.clusters: accels += c.stats.accelerators if c.get("stats") != null else 0.0
	var serving: int = g.activeContracts.filter(func(a): return a.clusterIds.size() > 0).size()
	var rp := PanelContainer.new(); rp.set_anchors_preset(Control.PRESET_RIGHT_WIDE); rp.offset_left = -app.overlay_w() + 20.0; rp.add_theme_stylebox_override("panel", Kit.sb(Kit.deep(0.95), Kit.LINE, 12, 1, 12)); add_child(rp)
	var col := Kit.column(rp, 0, true)
	_needs(col, b.q("needs"))
	_preview(col, b.q("preview"))
	var projs: Array = g.get("projects", []).filter(func(x): return x.stage != "done" or g.month - x.startMonth < 24)
	if g.get("projects", []).size() > 0:
		var active: Array = projs.filter(func(x): return x.stage != "done"); var finished := projs.size() - active.size()
		var pp := _fold("Easy-path projects (%d active%s)" % [active.size(), (" · %d finished" % finished) if finished > 0 else ""], "easy", col, active.is_empty())
		pp[1].add_child(Kit.btn("Check now", func(): b.act("stepEasy"), "", 12))
		if Layout.phone: pp[1].add_theme_constant_override("separation", 10)
		for x in active.slice(maxi(0, active.size() - 4)): _project(pp[1], x, active.size() >= 2)   # 2+: one line each, tap to expand
		if finished > 0 and not active.is_empty(): pp[1].add_child(Kit.label("%d finished and live" % finished, 12, Kit.DIM))
		elif finished > 0:
			if finished <= 2: for x in projs.slice(maxi(0, projs.size() - 2)): _project(pp[1], x, false)
			else: pp[1].add_child(Kit.label("%d projects finished and live" % finished, 13, Kit.GR))
	var ms: Array = b.q("missions"); var nxt := ms.filter(func(m): return not m.done and not g.missionsDone.has(m.id)).slice(0, 3 if g.get("mode", "operator") == "learner" else 1)
	var mp := _fold("Next mission · %d of %d done" % [g.missionsDone.size(), ms.size()], "missions", col, false)
	if nxt.is_empty(): mp[1].add_child(Kit.label("All missions complete — you run a hyperscaler.", 13, Kit.GR))
	for m in nxt:
		var r: Container = VBoxContainer.new() if Layout.phone else HBoxContainer.new(); r.add_theme_constant_override("separation", 10 if Layout.phone else 8); mp[1].add_child(r)
		var tv := VBoxContainer.new(); tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL; r.add_child(tv); tv.add_child(Kit.label("%s  +%s" % [m.title, Kit.usd(m.reward)], 13, Kit.TX, true))
		if not Layout.phone: tv.add_child(Kit.label(m.hint, 11, Kit.DIM, true))
		r.add_child(Kit.btn("Go →", func(): app.go(m.go if m.go != "finance" else "dash"), "", 12))
	_net_card(col, b.q("netHealth"))
	var live: Array = g.activeContracts.filter(func(a): return a.clusterIds.size() > 0); var wait: Array = g.activeContracts.filter(func(a): return a.clusterIds.size() == 0)
	var ct := "Customers · %d serving" % live.size() + ((" · %d signed, awaiting deployment" % wait.size()) if wait.size() > 0 else "")
	var cp := _fold(ct, "customers", col, g.activeContracts.size() > 4)
	if g.activeContracts.is_empty():
		cp[1].add_child(Kit.label("No customers yet — sign your first offer.", 13, Kit.DIM, true))
		var ob := Kit.btn("Open Clients", func(): app.go("contracts"), "pri", 13); ob.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN; cp[1].add_child(ob)
	for a in g.activeContracts:
		var sub := ("%d/%d mo · SLA misses %d" % [int(a.monthsServed), int(a.contract.durationMonths), int(a.slaMisses)]) if a.clusterIds.size() > 0 else "awaiting deployment (by %s)" % Kit.date_of(a.get("deployBy", a.startMonth + 4))
		var cr := HBoxContainer.new(); cr.add_theme_constant_override("separation", 8); cp[1].add_child(cr)
		cr.add_child(Logo.make(str(a.contract.customer), 24.0))
		var rt := _rich("[b]%s[/b] · %s  [color=#%s]%s · %s[/color]" % [a.contract.customer, a.contract.model.name, Kit.DIM.to_html(false), a.contract.kind, sub], 12); rt.size_flags_horizontal = Control.SIZE_EXPAND_FILL; cr.add_child(rt)
	var lp := _fold("Log", "log", col, true)
	var logs: Array = g.log.duplicate(); logs.reverse()
	for e in logs.slice(0, 40): lp[1].add_child(Kit.label("%s — %s" % [Kit.date_of(e.month), e.text], 12, Kit.GR if e.level == "good" else (Kit.RD if e.level == "bad" else Kit.DIM), true))
