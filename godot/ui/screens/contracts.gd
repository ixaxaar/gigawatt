class_name ContractsScreen
extends Control
## Customers & contracts: market offers with live fit verdicts, build options, Easy path, rack assignment.
var app
var msg := ""
var pick := {}
var rack_pick := {}
var folds := {}
var money := {}
const VERDICT := {
	"ready": [Kit.GR, "✓ CAN SERVE NOW"], "building": [Kit.AM, "◔ CAN BUILD IN TIME"],
	"short": [Kit.RD, "✗ NEED MORE / DIFFERENT HARDWARE"], "none": [Kit.RD, "✗ NO CLUSTER YET"]}

func _say(r: Dictionary) -> String:
	var t: String = str(r.get("message", ""))
	var iss = r.get("issues")
	if iss is Array:
		for i in iss:
			if i is Dictionary and i.get("severity", "error") == "error": t += "\n  ✗ " + str(i.message)
	return t

func refresh() -> void: Kit.rebuild_keep(self, _rebuild)

func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	# drop selections that point at clusters which no longer exist (disbanded / re-clustered)
	var live_ids: Array = g.clusters.map(func(c): return c.id)
	for k in pick.keys():
		pick[k] = pick[k].filter(func(id): return live_ids.has(id))
		if pick[k].is_empty(): pick.erase(k)
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := HBoxContainer.new(); hd.add_theme_constant_override("separation", 12); root.add_child(hd)
	hd.add_child(Kit.label("CUSTOMERS & CONTRACTS", 26, Kit.CY))
	hd.add_child(Kit.label("Sign now, deploy within the ramp window — or wait until you can serve at once.", 13, Kit.DIM, true))
	if msg != "": root.add_child(Kit.label(msg, 14, Kit.CY, true))
	var lr := Kit.cols2(root); var left: VBoxContainer = lr[0]; var right: VBoxContainer = lr[1]
	left.add_child(Kit.tip("Customers pay for capacity: training customers rent a big coherent cluster by the GPU-hour; inference customers pay per million tokens. Each offer shows what it needs and what you still lack — hit EASY PATH and the game orders, installs, deploys and assigns it for you."))
	left.add_child(Kit.label("MARKET OFFERS (%d)" % g.availableContracts.size(), 14, Kit.CY))
	if g.availableContracts.is_empty(): left.add_child(Kit.label("No offers right now — new ones appear every month.", 14, Kit.DIM))
	var offers: Array = g.availableContracts.duplicate()
	var mq = b.q("offerMoney"); money = mq if mq is Dictionary else {}
	offers.sort_custom(func(a, b2):
		if a.has("renewalOf") != b2.has("renewalOf"): return a.has("renewalOf")   # renewals first, then most profitable
		return float(money.get(a.id, {}).get("profitMo", 0)) > float(money.get(b2.id, {}).get("profitMo", 0)))
	for c in offers: _offer(left, c)
	var p: Dictionary = b.q("pipeline")
	var cp := Kit.panel("Your capacity (accelerators)", false, right)
	cp[1].add_child(Kit.stats([["Clustered", Kit.num(p.online)], ["Online, free", Kit.num(p.freeOnline)], ["Commissioning", Kit.num(p.installing)], ["Warehouse", Kit.num(p.warehouse)], ["On order", Kit.num(p.ordered)]], 3))
	var pend: Array = g.activeContracts.filter(func(a): return a.clusterIds.size() == 0)
	var live: Array = g.activeContracts.filter(func(a): return a.clusterIds.size() > 0)
	if pend.size() > 0:
		right.add_child(Kit.label("SIGNED — AWAITING DEPLOYMENT (%d)" % pend.size(), 14, Kit.CY))
		for a in pend: _pending(right, a)
	right.add_child(Kit.label("SERVING (%d)" % live.size(), 14, Kit.CY))
	if live.is_empty(): right.add_child(Kit.label("None yet.", 14, Kit.DIM))
	for a in live: _serving(right, a)

func _checks(parent: Control, c: Dictionary) -> Dictionary:
	var b: Bridge = app.b; var f: Dictionary = b.q("contractFit", [c.id]); var p: Dictionary = b.q("pipeline")
	var v: Array = VERDICT[f.verdict]
	parent.add_child(Kit.label(v[1], 13, v[0]))
	if f.get("best") != null:
		var rows := []
		for x in f.best.checks: rows.append([Kit.label("✓" if x.ok else "✗", 13, Kit.GR if x.ok else Kit.RD), x.label, "need %s" % x.need, "have %s" % x.have])
		var rq := Kit.fold_panel("Requirements vs your best cluster", "r" + str(c.id), folds, refresh, false, parent, true)
		if not bool(folds.get("r" + str(c.id), true)): rq[1].add_child(Kit.table([], rows)); rq[1].add_child(Kit.label("vs best cluster: %s" % f.best.cluster.name, 11, Kit.DIM))
	if f.get("shortfall") != null: parent.add_child(Kit.label(str(f.shortfall), 12, Kit.AM, true))
	if f.verdict != "ready": parent.add_child(Kit.label("Pipeline not yet clustered: %s online · %s commissioning · %s in warehouse · %s on order (accelerators)." % [Kit.num(p.freeOnline), Kit.num(p.installing), Kit.num(p.warehouse), Kit.num(p.ordered)], 11, Kit.DIM, true))
	return f

func _needs(parent: Control, c: Dictionary, signed_at = null) -> void:
	var b: Bridge = app.b; var opts: Array = b.q("buildOptions", [c.id, signed_at])
	if opts.is_empty(): parent.add_child(Kit.label("No purchasable platform on the market today can meet this (hardware not shipped yet or too big). Wait for newer GPUs or skip it.", 12, Kit.AM, true)); return
	var box := PanelContainer.new(); box.add_theme_stylebox_override("panel", Kit.sb(Color(0.04, 0.07, 0.1), Kit.LINE, 8, 1, 10)); parent.add_child(box)
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 6); box.add_child(v)
	v.add_child(Kit.label("WHAT YOU NEED TO BUY", 12, Kit.CY))
	for o in opts:
		var afford: bool = o.cost <= b.g.cash
		var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 8); v.add_child(h)
		h.add_child(Kit.label("%d × %s" % [int(o.racks), o.t.name], 14)); h.add_child(Kit.label("DIY" if o.t.tier == "diy" else str(o.t.integrator), 11, Kit.DIM))
		for t in o.tags: h.add_child(Kit.tag(str(t)))
		var rows := []; for x in o.cover: rows.append([Kit.label("✓" if x.ok else "✗", 12, Kit.GR if x.ok else Kit.RD), x.label, "need %s" % x.need, str(x.have)])
		v.add_child(Kit.table([], rows))
		v.add_child(Kit.rich("%s · parts+install ready ≈ %s  [color=#%s](%s)[/color]" % [Kit.usd(o.cost), Kit.date_of(o.readyMonth), (Kit.GR if o.fitsRamp else Kit.RD).to_html(false), ("%d mo spare" % int(o.slack)) if o.fitsRamp else ("%d mo too late" % int(-o.slack))], 12))
		v.add_child(Kit.label(("Earns ≈ %s/mo, power ≈ %s/mo → pays back in %d months" % [Kit.usd(o.revenueMo), Kit.usd(o.powerMo), int(o.paybackMo)]) if o.get("paybackMo") != null else "Does not pay back at this price", 11, Kit.DIM, true))
		if o.hallGaps.size() > 0: v.add_child(Kit.label("Your hall also needs: " + " · ".join(o.hallGaps), 11, Kit.AM, true)); v.add_child(Kit.link("→ Build", func(): app.go("facility"), 11))
		var bh := HBoxContainer.new(); bh.add_theme_constant_override("separation", 6); v.add_child(bh)
		var easy := Kit.btn("EASY PATH — do it all for me" if afford else "Need more cash — take a loan", func(): msg = b.act("startEasy", [c.id, o.t.id, int(o.racks)]).message; app.sfx("buy"); refresh(), "go", 12); easy.disabled = not afford; bh.add_child(easy)
		var just := Kit.btn("Just order the racks (I'll do the rest)", func(): msg = b.act("buyTemplate", [o.t.id, int(o.racks)]).message; app.sfx("buy"); refresh(), "", 12); just.disabled = not afford; bh.add_child(just)
		v.add_child(Kit.hsep())
	v.add_child(Kit.label("Easy path = the game signs, buys, installs plant, deploys racks, builds the fabric and assigns the contract for you as parts arrive (watch Projects on the Datacenter screen). After a manual order: wait for delivery → Warehouse ▸ Deploy racks → wait for commissioning → Supercomputer ▸ build a cluster → come back here and assign it.", 11, Kit.DIM, true))

func _offer(parent: Control, c: Dictionary) -> void:
	var b: Bridge = app.b
	var renew: bool = c.has("renewalOf")
	var m: Dictionary = money.get(c.id, {})
	var mline := ""
	if not m.is_empty():
		mline = "+%s/mo · %s total" % [Kit.usd(float(m.monthly)), Kit.usd(float(m.total))]
		if absf(float(m.profitMo) - float(m.monthly)) > 0.05 * absf(float(m.monthly)): mline += " · ~%s/mo after power" % Kit.usd(float(m.profitMo))
	var pn := Kit.fold_panel(("↻ " if renew else "") + "%s · %s%s" % [c.customer, c.model.name, ("  ·  " + mline) if mline != "" else ""], "o" + str(c.id), folds, refresh, true, parent, not renew); var v: VBoxContainer = pn[1]
	if bool(folds.get("o" + str(c.id), not renew)): return   # collapsed: don't build the (expensive) body until it is opened
	if renew: v.add_child(Kit.label("↻ %s liked your last contract and wants a bigger one — priced +5%%." % c.renewalOf, 13, Color("#ffd166"), true))
	var t: bool = c.kind == "training"
	if mline != "": v.add_child(Kit.label(mline, 17, Kit.GR, true))
	v.add_child(Kit.rich("[b]%s[/b]  [color=#8fb0c8]%sB%s · %s[/color]" % [c.model.name, Kit.num(c.model.paramsB, 1), (" (%sB active)" % Kit.num(c.model.activeParamsB, 1)) if c.model.activeParamsB != c.model.paramsB else "", c.kind], 15))
	var head := ("%s+ GPUs · %s/GPU-hr" % [Kit.num(c.minAccelerators), Kit.price(c.pricePerAccelHour)]) if t else ("%s tok/s · %s/Mtok" % [Kit.num(c.tokensPerSec), Kit.price(c.pricePerMTok)])
	v.add_child(Kit.label("%s · %d mo · SLA %.1f%%" % [head, int(c.durationMonths), c.slaAvailability * 100.0], 14, Kit.CY))
	if t: v.add_child(Kit.label("≈ %s/month at full size · total ≈ %s" % [Kit.usd(c.minAccelerators * c.pricePerAccelHour * 730.0), Kit.usd(c.minAccelerators * c.pricePerAccelHour * 730.0 * c.durationMonths)], 12, Kit.DIM, true))
	var f := _checks(v, c)
	if f.verdict != "ready": _needs(v, c)
	v.add_child(Kit.label("Offer open until %s · after signing you get %d months to deploy (no revenue, no SLA clock until live; miss it → they walk, −8 rep)." % [Kit.date_of(c.deadlineMonth), int(c.get("rampMonths", 4))], 12, Kit.DIM, true))
	var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 8); v.add_child(h)
	h.add_child(Kit.btn("SIGN & START SERVING" if f.verdict == "ready" else "SIGN NOW · DEPLOY LATER", func():
		var a := b.act("acceptContract", [c.id])
		if not a.ok: msg = _say(a)
		elif f.verdict == "ready" and f.get("best") != null: msg = _say(b.act("assignContract", [c.id, [f.best.cluster.id]]))
		else: msg = a.message
		app.sfx("buy"); refresh(), "go" if f.verdict == "ready" else "pri", 15))
	if f.verdict == "short": h.add_child(Kit.btn("Plan capacity →", func(): app.go("shop"), "", 13))

func _rack_assign(parent: Control, contract_id: String) -> void:
	var b: Bridge = app.b; var free := []
	for h in b.g.halls:
		for r in h.racks:
			if r.status == "online" and not r.get("clusterId"): free.append(r)
	if free.is_empty(): return
	var sel: Array = rack_pick.get(contract_id, [])
	var box := PanelContainer.new(); box.add_theme_stylebox_override("panel", Kit.sb(Color(0, 0, 0, 0), Kit.LINE, 8, 1, 8)); parent.add_child(box)
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 5); box.add_child(v)
	v.add_child(Kit.label("Serve straight from racks (no clustering step)", 12))
	var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 5); v.add_child(fl)
	for r in free:
		var dn := ""; for d in b.g.racks:
			if d.id == r.designId: dn = d.name
		fl.add_child(Kit.btn("%s · %s" % [dn.left(18), "RK-%04d" % int(r.get("serial", 0))], func(): sel = sel.filter(func(x): return x != r.id) if sel.has(r.id) else sel + [r.id]; rack_pick[contract_id] = sel; refresh(), "pri" if sel.has(r.id) else "", 12))
	fl.add_child(Kit.btn("all", func(): rack_pick[contract_id] = free.map(func(r): return r.id); refresh(), "", 12))
	var go := Kit.btn("SERVE FROM %s RACK%s" % [str(sel.size()) if sel.size() > 0 else "", "" if sel.size() == 1 else "S"], func(): msg = b.act("assignRacks", [contract_id, sel]).message; rack_pick.erase(contract_id); refresh(), "go", 12)
	go.disabled = sel.is_empty(); v.add_child(go)

func _pending(parent: Control, a: Dictionary) -> void:
	var b: Bridge = app.b; var c: Dictionary = a.contract
	var left: int = int(a.get("deployBy", a.startMonth + 4)) - int(b.g.month)
	var pn := Kit.fold_panel("%s · %s · awaiting deployment" % [c.customer, c.kind], "p" + str(c.id), folds, refresh, true, parent, true); var v: VBoxContainer = pn[1]
	v.add_child(Kit.label("deploy by %s · %d mo left" % [Kit.date_of(a.get("deployBy", a.startMonth + 4)), maxi(0, left)], 13, Kit.RD if left <= 1 else Kit.AM))
	v.add_child(Kit.label(c.model.name, 15))
	var f := _checks(v, c)
	if f.verdict != "ready": _needs(v, c, a.get("deployBy", a.startMonth + 4))
	_rack_assign(v, c.id)
	var base: Array = pick.get(c.id, [f.best.cluster.id] if f.get("best") != null else [])
	if b.g.clusters.size() > 0:
		var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 8); v.add_child(fl)
		for cl in b.g.clusters:
			var acc: float = cl.stats.accelerators if cl.get("stats") != null else 0.0
			fl.add_child(Kit.check("%s (%s)" % [cl.name, Kit.num(acc)], base.has(cl.id), func(on): pick[c.id] = (base + [cl.id]) if on else base.filter(func(x): return x != cl.id); refresh()))
		var go := Kit.btn("ASSIGN & GO LIVE", func(): msg = _say(b.act("assignContract", [c.id, base])); app.sfx("buy"); refresh(), "go", 14); go.disabled = base.is_empty(); v.add_child(go)
	else:
		v.add_child(Kit.label("Build online racks into a cluster (Supercomputer), then come back and assign it.", 12, Kit.DIM, true)); v.add_child(Kit.link("Open Supercomputer →", func(): app.go("network"), 12))

func _serving(parent: Control, a: Dictionary) -> void:
	var b: Bridge = app.b; var c: Dictionary = a.contract
	var pn := Kit.fold_panel("%s · %s · serving" % [c.customer, c.kind], "s" + str(c.id), folds, refresh, false, parent, true); var v: VBoxContainer = pn[1]
	v.add_child(Kit.tag("serving", Kit.GR)); v.add_child(Kit.label(c.model.name, 15))
	v.add_child(Kit.label("%d/%d mo · SLA misses %d" % [int(a.monthsServed), int(c.durationMonths), int(a.slaMisses)], 13))
	var names := []; for id in a.clusterIds:
		var nm: String = id; for cl in b.g.clusters:
			if cl.id == id: nm = cl.name
		names.append(nm)
	v.add_child(Kit.label("on " + " + ".join(names), 12, Kit.DIM, true))
	var racks := 0; for cl in b.g.clusters:
		if a.clusterIds.has(cl.id): racks += cl.rackIds.size()
	v.add_child(Kit.label("%d rack%s allocated · coloured crowns on the Datacenter floor" % [racks, "" if racks == 1 else "s"], 11, Kit.DIM, true))
	var sel0: Array = pick.get(c.id, a.clusterIds.duplicate())
	var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 8); v.add_child(fl)
	for cl in b.g.clusters:
		var acc: float = cl.stats.accelerators if cl.get("stats") != null else 0.0
		fl.add_child(Kit.check("%s (%s)" % [cl.name, Kit.num(acc)], sel0.has(cl.id), func(on): pick[c.id] = (sel0 + [cl.id]) if on else sel0.filter(func(x): return x != cl.id); refresh()))
	var br := HFlowContainer.new(); br.add_theme_constant_override("h_separation", 6); v.add_child(br)
	var up := Kit.btn("UPDATE CLUSTERS", func(): msg = _say(b.act("assignContract", [c.id, sel0])); pick.erase(c.id); app.sfx("buy"); refresh(), "go", 12); up.disabled = sel0.is_empty() or sel0 == a.clusterIds; br.add_child(up)
	br.add_child(Kit.btn("Release cluster (back to pending)", func(): msg = _say(b.act("unassignContract", [c.id])); pick.erase(c.id); refresh(), "danger", 12))
