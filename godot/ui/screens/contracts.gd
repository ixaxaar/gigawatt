class_name ContractsScreen
extends Control
## Customers & contracts: market offers with live fit verdicts, build options, Easy path, rack assignment.
var app

## Rich text in the palette's text colour (the engine default is near-white: unreadable on the light themes).
static func _rich(t: String, size := 15) -> RichTextLabel:
	var r := Kit.rich(t, size); r.add_theme_color_override("default_color", Kit.TX); return r
var msg := ""
var pick := {}
var rack_pick := {}
var folds := {}
var money := {}
var hdr := {}            # fold key -> header panel (so an opened offer can be scrolled to the top)
var opened_key := ""     # set when the player opens an offer: reveal it after the rebuild
var seeded := false      # the first offer is opened once; after that the player decides
const VNAMES := {"hpe": "HPE", "asus": "ASUS", "quanta": "Quanta (QCT)", "wiwynn": "Wiwynn", "cisco": "Cisco UCS", "inspur": "Inspur", "lenovo": "Lenovo", "supermicro": "Supermicro", "gigabyte": "Gigabyte", "foxconn": "Foxconn", "dell": "Dell", "nvidia": "NVIDIA"}
static func _verdict() -> Dictionary:
	return {"ready": [Kit.GR, "✓ CAN SERVE NOW"], "building": [Kit.AM, "◔ CAN BUILD IN TIME"],
		"short": [Kit.RD, "✗ NEED MORE / DIFFERENT HARDWARE"], "none": [Kit.RD, "✗ NO CLUSTER YET"]}

func _say(r: Dictionary) -> String:
	var t: String = str(r.get("message", ""))
	var iss = r.get("issues")
	if iss is Array:
		for i in iss:
			if i is Dictionary and i.get("severity", "error") == "error": t += "\n  ✗ " + str(i.message)
	return t

func refresh() -> void: Kit.rebuild_keep(self, _rebuild)

## Proper vendor name for an integrator id ("quanta" -> "Quanta (QCT)").
static func _vname(id: String) -> String: return str(VNAMES.get(id, id.capitalize()))

## Engine strings for the requirement tables: whole numbers without ".0", month numbers as dates.
static func _clean(x) -> String:
	var t := str(x)
	for w in ["by", "ready"]:
		var m := RegEx.create_from_string("\\b%s (\\d+)\\b" % w).search(t)
		if m != null: t = t.replace(m.get_string(), "%s %s" % [w, Kit.date_of(float(m.get_string(1)))])
	return RegEx.create_from_string("(\\d+)\\.0\\b").sub(t, "$1", true)

## Accordion: opening an offer closes the others, then scrolls its header to the top.
func _toggled(key: String) -> void:
	if not bool(folds.get(key, true)):
		for k in folds.keys():
			if str(k).begins_with("o") and k != key: folds[k] = true
		opened_key = key
	refresh()
	if opened_key != "" and hdr.has(opened_key):
		var n: Control = hdr[opened_key]; opened_key = ""
		Kit.reveal(n)

## Phone: a checkbox row as tall as a thumb.
func _chk(text: String, on: bool, cb: Callable) -> CheckBox:
	var c := Kit.check(text, on, cb)
	for n in ["font_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color", "font_focus_color"]: c.add_theme_color_override(n, Kit.TX)   # palette ink: the default is near-white (invisible on the light themes)
	c.add_theme_color_override("font_disabled_color", Kit.DIM)
	if Layout.phone: c.custom_minimum_size.y = Layout.tap()
	return c

## Phone: stacked full-width buttons with air between them; elsewhere a row.
func _btn_box(parent: Control, sep := 8, flow := false) -> Container:
	var h: Container
	if Layout.phone: h = VBoxContainer.new(); h.add_theme_constant_override("separation", 14)
	else: h = HFlowContainer.new() if flow else HBoxContainer.new(); h.add_theme_constant_override("separation", sep); h.add_theme_constant_override("h_separation", sep)
	parent.add_child(h); return h

func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	# drop selections that point at clusters which no longer exist (disbanded / re-clustered)
	var live_ids: Array = g.clusters.map(func(c): return c.id)
	for k in pick.keys():
		pick[k] = pick[k].filter(func(id): return live_ids.has(id))
		if pick[k].is_empty(): pick.erase(k)
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	if Layout.touch: root.offset_right = -10.0   # the touch scroll cue (a thin bar drawn over the drawer's right edge) must not sit on the cards' borders
	var hd := Kit.head_row(12); root.add_child(hd)
	hd.add_child(Kit.label("CLIENTS" if Layout.compact else "CUSTOMERS & CONTRACTS", 26, Kit.CY))
	if not Layout.phone: hd.add_child(Kit.label("Sign now, deploy within the ramp window — or wait until you can serve at once.", 13, Kit.DIM, true)); Kit.hint_fix(hd, app)
	if msg != "": root.add_child(Kit.label(msg, 14, Kit.CY, true))
	var lr := Kit.cols2(root); var left: VBoxContainer = lr[0]; var right: VBoxContainer = lr[1]
	hdr.clear()
	left.add_child(Kit.label("MARKET OFFERS (%d)" % g.availableContracts.size(), 14, Kit.CY))
	if g.availableContracts.is_empty(): _empty(left, "No offers right now — new ones appear every month.", "Next month ▶", func(): app.next_month())
	var offers: Array = g.availableContracts.duplicate()
	var mq = b.q("offerMoney"); money = mq if mq is Dictionary else {}
	offers.sort_custom(func(a, b2):
		if a.has("renewalOf") != b2.has("renewalOf"): return a.has("renewalOf")   # renewals first, then most profitable
		return float(money.get(a.id, {}).get("profitMo", 0)) > float(money.get(b2.id, {}).get("profitMo", 0)))
	for c in offers: if not folds.has("o" + str(c.id)): folds["o" + str(c.id)] = true   # every offer starts collapsed...
	if not seeded and not offers.is_empty(): seeded = true; folds["o" + str(offers[0].id)] = false   # ...except the best one, once
	for c in offers: _offer(left, c)
	var hp := Kit.fold_panel("How contracts work", "help", folds, refresh, false, left, true)   # collapsed: it used to eat 40% of a phone screen before any offer
	hp[1].add_child(Kit.label("Customers pay for capacity: training customers rent a big coherent cluster by the GPU-hour; inference customers pay per million tokens. Each offer shows what it needs and what you still lack — hit EASY PATH and the game orders, installs, deploys and assigns it for you.", 13, Kit.TX, true))
	if str(g.get("mode", "operator")) == "learner": hp[1].add_child(Kit.label(Kit.TERMS, 12, Kit.DIM, true))
	var p: Dictionary = b.q("pipeline")
	var pend: Array = g.activeContracts.filter(func(a): return a.clusterIds.size() == 0)
	var live: Array = g.activeContracts.filter(func(a): return a.clusterIds.size() > 0)
	var nocap: bool = float(p.online) + float(p.installing) + float(p.warehouse) + float(p.ordered) <= 0.0
	if nocap:
		if pend.is_empty() and live.is_empty(): _empty(right, "You have no accelerators yet — buy hardware to serve customers.", "Open the shop", func(): app.go("shop"))
	else:
		var cp := Kit.panel("Your capacity (accelerators)", false, right)
		cp[1].add_child(Kit.stats([["Clustered", Kit.num(p.online)], ["Online, free", Kit.num(p.freeOnline)], ["Commissioning", Kit.num(p.installing)], ["Warehouse", Kit.num(p.warehouse)], ["On order", Kit.num(p.ordered)]], 3))
	if pend.size() > 0:
		right.add_child(Kit.label("SIGNED — AWAITING DEPLOYMENT (%d)" % pend.size(), 14, Kit.CY))
		for a in pend: _pending(right, a)
	right.add_child(Kit.label("SERVING (%d)" % live.size(), 14, Kit.CY))
	if live.is_empty() and pend.is_empty() and not offers.is_empty() and not nocap:
		var first := "o" + str(offers[0].id)
		_empty(right, "No customers yet — open an offer and sign it, or hit EASY PATH.", "Show the best offer", func(): folds[first] = false; _toggled(first))
	elif live.is_empty(): right.add_child(Kit.label("Nothing serving yet — deploy a signed contract above.", 13, Kit.DIM, true))
	for a in live: _serving(right, a)

## One line saying what to do next, with one button.
func _empty(parent: Control, text: String, btn_text: String, cb: Callable) -> void:
	var pn := PanelContainer.new(); pn.add_theme_stylebox_override("panel", Kit.sb(Color(0, 0, 0, 0), Kit.LINE, 8, 1, 10)); pn.size_flags_horizontal = Control.SIZE_EXPAND_FILL; parent.add_child(pn)
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 8); pn.add_child(v)
	v.add_child(Kit.label(text, 14, Kit.DIM, true))
	var bt := Kit.btn(btn_text, cb, "pri", 14); bt.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN; v.add_child(bt)

func _checks(parent: Control, c: Dictionary, show_verdict := true) -> Dictionary:
	var b: Bridge = app.b; var f: Dictionary = b.q("contractFit", [c.id]); var p: Dictionary = b.q("pipeline")
	var v: Array = _verdict()[f.verdict]
	if show_verdict: parent.add_child(Kit.label(v[1], 13, v[0], true))
	if f.get("best") != null:
		var rows := []
		for x in f.best.checks: rows.append([Kit.label("✓" if x.ok else "✗", 13, Kit.GR if x.ok else Kit.RD), x.label, _clean(x.need), _clean(x.have)])
		var rq := Kit.fold_panel("Requirements vs your best cluster", "r" + str(c.id), folds, refresh, false, parent, true)
		if not bool(folds.get("r" + str(c.id), true)): rq[1].add_child(Kit.table(["", "", "Need", "Have"], rows)); rq[1].add_child(Kit.label("vs best cluster: %s" % f.best.cluster.name, 11, Kit.DIM, true))
	if f.get("shortfall") != null: parent.add_child(Kit.label(_clean(f.shortfall), 12, Kit.AM, true))
	if f.verdict != "ready" and not Layout.phone: parent.add_child(Kit.label("Pipeline not yet clustered: %s online · %s commissioning · %s in warehouse · %s on order (accelerators)." % [Kit.num(p.freeOnline), Kit.num(p.installing), Kit.num(p.warehouse), Kit.num(p.ordered)], 11, Kit.DIM, true))
	return f

## The offer card quotes the contract at its minimum size; whole racks usually hold more GPUs than that, and the customer pays for
## what is served. When the two figures differ the confirm says why, so "+$38.8k/mo" on the card and "$58.2k" here do not look like a mistake.
func _why_more(c: Dictionary, o: Dictionary) -> String:
	var m: Dictionary = money.get(c.id, {})
	if m.is_empty() or float(o.revenueMo) <= float(m.monthly) * 1.03: return ""
	return " (the offer's %s is for its minimum size; these racks serve more)" % Kit.usd(float(m.monthly))

## EASY PATH for one build option (the engine's canStartEasy / easyBlocker gate it).
func _easy_btn(c: Dictionary, o: Dictionary, kind: String, label := "") -> Button:
	var b: Bridge = app.b
	var afford: bool = float(o.get("orderCost", o.cost)) <= b.g.cash
	var txt := label if label != "" else ("EASY PATH — do it all for me" if o.get("canStartEasy", o.fitsRamp) else "Easy path unavailable")
	if not afford: txt = "Need more cash — take a loan"
	var easy := Kit.btn(txt, func(): Kit.confirm(self, "Easy path signs %s for you, orders what is needed (up to %s, %s) and sets everything up. %s" % [str(c.customer), Kit.plural(int(o.racks), "rack"), Kit.usd(o.get("orderCost", o.cost)), (("It earns about %s a month%s and pays back in %s; this contract runs %d months, and the racks keep earning on the next ones." % [Kit.usd(o.revenueMo), _why_more(c, o), Kit.plural(int(o.paybackMo), "month"), int(c.get("durationMonths", 0))]) if o.get("paybackMo") != null else "At this price it does not pay back.")], func(): var r: Dictionary = b.act("startEasy", [c.id, o.t.id, int(o.racks)]); msg = "" if r.get("ok", false) else str(r.get("message", "")); app.sfx("buy"); app.toast(str(r.get("message", "")), "good") if r.get("ok", false) else null; refresh(), "Do it"), kind, 14 if Layout.phone else 13)
	easy.disabled = not afford or not o.get("canStartEasy", o.fitsRamp)
	return easy

func _needs(parent: Control, c: Dictionary, signed_at = null, opts_in = null, warn_empty := true) -> void:
	var b: Bridge = app.b; var opts: Array = opts_in if opts_in != null else b.q("buildOptions", [c.id, signed_at])
	if opts.is_empty():
		if warn_empty: parent.add_child(Kit.label("No purchasable platform on the market today can meet this (hardware not shipped yet or too big). Wait for newer GPUs or skip it.", 12, Kit.AM, true))
		return
	var box := PanelContainer.new(); box.add_theme_stylebox_override("panel", Kit.sb(Kit.field(), Kit.LINE, 8, 1, 10)); parent.add_child(box)
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 6); box.add_child(v)
	v.add_child(Kit.label("WHAT YOU NEED TO BUY", 12, Kit.CY))
	for o in opts:
		var afford: bool = float(o.get("orderCost", o.cost)) <= b.g.cash
		if Layout.compact: v.add_child(Kit.label("%d × %s" % [int(o.racks), o.t.name], 14, Kit.TX, true))   # narrow drawer: the name gets its own wrapping line, the chips flow below
		var h := HFlowContainer.new(); h.add_theme_constant_override("h_separation", 8); h.add_theme_constant_override("v_separation", 4); v.add_child(h)
		if not Layout.compact: h.add_child(Kit.label("%d × %s" % [int(o.racks), o.t.name], 14))
		h.add_child(Kit.label("DIY" if o.t.tier == "diy" else _vname(str(o.t.integrator)), 11, Kit.DIM))
		for t in o.tags: h.add_child(Kit.tag(str(t)))
		if Layout.phone:   # a four-column table is wider than a phone drawer and pushed the whole card off the right edge: one wrapping line per need
			for x in o.cover: v.add_child(_rich("[color=#%s]%s[/color] %s: need %s · have %s" % [(Kit.GR if x.ok else Kit.RD).to_html(false), "✓" if x.ok else "✗", x.label, _clean(x.need), _clean(x.have)], 12))
		else:
			var rows := []; for x in o.cover: rows.append([Kit.label("✓" if x.ok else "✗", 12, Kit.GR if x.ok else Kit.RD), x.label, _clean(x.need), _clean(x.have)])
			v.add_child(Kit.table(["", "", "Need", "Have"], rows))
		v.add_child(_rich("%s · parts+install ready ≈ %s  [color=#%s](%s)[/color]" % [Kit.usd(o.get("orderCost", o.cost)), Kit.date_of(o.readyMonth), (Kit.GR if o.fitsRamp else Kit.RD).to_html(false), ("%d mo spare" % int(o.slack)) if o.fitsRamp else ("%d mo too late" % int(-o.slack))], 12))
		if o.get("paybackMo") != null:
			v.add_child(Kit.label(("Earns ≈ %s/mo, power ≈ %s/mo → pays back in %d months" % [Kit.usd(o.revenueMo), Kit.usd(o.powerMo), int(o.paybackMo)]) if not Layout.phone else "Pays back in %d mo" % int(o.paybackMo), 11 if not Layout.phone else 12, Kit.DIM, true))
		else: v.add_child(Kit.label("Does not pay back at this price", 11, Kit.DIM, true))
		if o.hallGaps.size() > 0: v.add_child(Kit.label("Your hall also needs: " + " · ".join(o.hallGaps), 11, Kit.AM, true)); v.add_child(Kit.link("→ Build", func(): app.go("facility"), 11))
		var bh := _btn_box(v, 6)
		var easy := _easy_btn(c, o, ""); bh.add_child(easy)
		var just := Kit.btn("Just order the racks (I'll do the rest)", func(): Kit.confirm(self, "Order %s for %s? This does NOT sign the contract: sign it yourself before the offer expires (%s), then deploy, cluster and assign the racks." % [Kit.plural(int(o.racks), "rack"), Kit.usd(o.get("orderCost", o.cost)), Kit.date_of(c.deadlineMonth)], func(): var r: Dictionary = b.act("buyTemplate", [o.t.id, int(o.racks)]); msg = "" if r.get("ok", false) else str(r.get("message", "")); app.sfx("buy"); app.toast(str(r.get("message", "")), "good") if r.get("ok", false) else null; refresh(), "Order"), "", 12); just.disabled = not afford or not o.get("canOrder", true); bh.add_child(just)
		if afford and easy.disabled and str(o.get("easyBlocker", "")) != "": v.add_child(Kit.label(str(o.easyBlocker), 12, Kit.AM, true))
		elif afford and just.disabled and str(o.get("orderBlocker", "")) != "": v.add_child(Kit.label(str(o.orderBlocker), 12, Kit.AM, true))
		v.add_child(Kit.hsep())
	if Layout.phone: v.add_child(Kit.label("Easy path does everything for you as parts arrive.", 12, Kit.DIM, true))
	else: v.add_child(Kit.label("Easy path = the game signs, buys, installs plant, deploys racks, builds the fabric and assigns the contract for you as parts arrive (watch Projects on the Datacenter screen). After a manual order: wait for delivery → Warehouse ▸ Deploy racks → wait for commissioning → Supercomputer ▸ build a cluster → come back here and assign it.", 11, Kit.DIM, true))

func _sign(c: Dictionary, f: Dictionary) -> void:
	var b: Bridge = app.b
	var a := b.act("acceptContract", [c.id])
	if not a.ok: msg = _say(a)
	elif f.verdict == "ready" and f.get("best") != null: msg = _say(b.act("assignContract", [c.id, [f.best.cluster.id]]))
	else: msg = a.message
	app.sfx("buy"); refresh()

func _offer(parent: Control, c: Dictionary) -> void:
	var b: Bridge = app.b
	var renew: bool = c.has("renewalOf")
	var m: Dictionary = money.get(c.id, {})
	var mline := ""
	if not m.is_empty():
		mline = "+%s/mo · %s total" % [Kit.usd(float(m.monthly)), Kit.usd(float(m.total))]
		if absf(float(m.profitMo) - float(m.monthly)) > 0.05 * absf(float(m.monthly)): mline += " · ~%s/mo after power" % Kit.usd(float(m.profitMo))
	# the collapsed row tells offers of the same customer apart: model, $/month, term
	var facts := "%s · %s/mo · %d mo" % [c.model.name, Kit.usd(float(m.monthly)), int(c.durationMonths)] if not m.is_empty() else "%s · %d mo" % [c.model.name, int(c.durationMonths)]
	var key := "o" + str(c.id)
	var pn := Kit.fold_panel(("↻ " if renew else "") + "%s · %s" % [c.customer, facts], key, folds, func(): _toggled(key), true, parent, true, str(c.customer)); var v: VBoxContainer = pn[1]
	hdr[key] = pn[0]
	for x in pn[0].find_children("*", "Button", true, false): (x as Button).autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; break
	if bool(folds.get(key, true)): return   # collapsed: don't build the (expensive) body until it is opened
	var f: Dictionary = b.q("contractFit", [c.id]); var opts: Array = b.q("buildOptions", [c.id, null])
	var t: bool = c.kind == "training"
	# --- the decision, at the top: money, verdict, the one primary action
	if mline != "": v.add_child(Kit.label(mline, 17, Kit.GR, true))
	var vd: Array = _verdict()[f.verdict]; v.add_child(Kit.label(vd[1], 13, vd[0], true))
	var fit: Array = opts.filter(func(o): return o.fitsRamp)
	var easy_ok: Array = opts.filter(func(o): return o.get("canStartEasy", false))
	easy_ok.sort_custom(func(x, y): return float(x.get("orderCost", x.cost)) < float(y.get("orderCost", y.cost)))
	var serve_ok: bool = f.verdict == "ready" or f.verdict == "building"
	var risky: bool = not serve_ok and fit.is_empty()
	if risky:
		if opts.is_empty(): v.add_child(Kit.label("⚠ Nothing you can buy today can serve this (hardware not shipped yet, or too big). Signing now means a walk-away and lost reputation.", 13, Kit.AM, true))
		else: v.add_child(Kit.label("⚠ No build you can buy today is ready within the %d-month deploy window. Signing now means a walk-away and lost reputation." % int(c.get("rampMonths", 4)), 13, Kit.AM, true))
	var h := _btn_box(v)
	var sign_kind := "go" if serve_ok else ""
	var sign_txt := "SIGN & START SERVING" if f.verdict == "ready" else "SIGN NOW · DEPLOY LATER"
	if not serve_ok and not fit.is_empty():
		var o0: Dictionary = easy_ok[0] if not easy_ok.is_empty() else fit[0]
		var eb := _easy_btn(c, o0, "go", "EASY PATH · %d× %s · %s" % [int(o0.racks), str(o0.t.name), Kit.usd(o0.get("orderCost", o0.cost))])
		h.add_child(eb)
		if eb.disabled and str(o0.get("easyBlocker", "")) != "": v.add_child(Kit.label(str(o0.easyBlocker), 12, Kit.AM, true))
	var sb2 := Kit.btn(sign_txt, func():
		if risky: Kit.confirm(self, "Nothing you can buy today can serve this. Sign anyway?\nIf you cannot deploy within %d months the customer walks away and you lose reputation." % int(c.get("rampMonths", 4)), func(): _sign(c, f), "Sign anyway")
		else: _sign(c, f), sign_kind, 14 if Layout.phone else 13)
	h.add_child(sb2)
	if f.verdict == "short": h.add_child(Kit.btn("Plan capacity →", func(): app.go("shop"), "pri" if risky else "", 13))
	# --- details below
	v.add_child(Kit.hsep())
	if renew and Layout.phone: v.add_child(Kit.label("↻ Repeat customer · priced +5%", 13, Kit.AM, true))
	elif renew: v.add_child(Kit.label("↻ %s liked your last contract and wants a bigger one — priced +5%%." % c.renewalOf, 13, Kit.AM, true))
	v.add_child(_rich("[b]%s[/b]  [color=#%s]%sB%s · %s[/color]" % [c.model.name, Kit.DIM.to_html(false), Kit.num(c.model.paramsB, 1), (" (%sB active)" % Kit.num(c.model.activeParamsB, 1)) if c.model.activeParamsB != c.model.paramsB else "", c.kind], 15))
	var head := ("%s+ GPUs · %s/GPU-hr" % [Kit.num(c.minAccelerators), Kit.price(c.pricePerAccelHour)]) if t else ("%s tok/s · %s/Mtok" % [Kit.num(c.tokensPerSec), Kit.price(c.pricePerMTok)])
	v.add_child(Kit.label("%s · %d mo · SLA %.1f%%" % [head, int(c.durationMonths), c.slaAvailability * 100.0], 14, Kit.CY, true))
	if t and not Layout.phone: v.add_child(Kit.label("≈ %s/month at full size · total ≈ %s" % [Kit.usd(c.minAccelerators * c.pricePerAccelHour * 730.0), Kit.usd(c.minAccelerators * c.pricePerAccelHour * 730.0 * c.durationMonths)], 12, Kit.DIM, true))
	_checks(v, c, false)
	if f.verdict != "ready": _needs(v, c, null, opts, false)
	if Layout.phone: v.add_child(Kit.label("Open until %s · %d mo to deploy" % [Kit.date_of(c.deadlineMonth), int(c.get("rampMonths", 4))], 12, Kit.DIM, true))
	else: v.add_child(Kit.label("Offer open until %s · after signing you get %d months to deploy (no revenue, no SLA clock until live; miss it → they walk, −8 rep)." % [Kit.date_of(c.deadlineMonth), int(c.get("rampMonths", 4))], 12, Kit.DIM, true))

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
	var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 10 if Layout.phone else 5); fl.add_theme_constant_override("v_separation", 10 if Layout.phone else 4); v.add_child(fl)
	for r in free:
		var dn := ""; for d in b.g.racks:
			if d.id == r.designId: dn = d.name
		fl.add_child(Kit.btn("%s · %s" % [dn.left(18), "RK-%04d" % int(r.get("serial", 0))], func(): sel = sel.filter(func(x): return x != r.id) if sel.has(r.id) else sel + [r.id]; rack_pick[contract_id] = sel; refresh(), "pri" if sel.has(r.id) else "", 12))
	fl.add_child(Kit.btn("all", func(): rack_pick[contract_id] = free.map(func(r): return r.id); refresh(), "", 12))
	var go := Kit.btn("SERVE FROM %s RACK%s" % [str(sel.size()) if sel.size() > 0 else "", "" if sel.size() == 1 else "S"], func(): msg = _say(b.act("assignRacks", [contract_id, sel])); rack_pick.erase(contract_id); refresh(), "go", 12)
	go.disabled = sel.is_empty(); v.add_child(go)

func _pending(parent: Control, a: Dictionary) -> void:
	var b: Bridge = app.b; var c: Dictionary = a.contract
	var left: int = int(a.get("deployBy", a.startMonth + 4)) - int(b.g.month)
	var pn := Kit.fold_panel("%s · %s · deploy by %s" % [c.customer, c.model.name, Kit.date_of(a.get("deployBy", a.startMonth + 4))], "p" + str(c.id), folds, refresh, true, parent, true, str(c.customer)); var v: VBoxContainer = pn[1]
	v.add_child(Kit.label("deploy by %s · %s left" % [Kit.date_of(a.get("deployBy", a.startMonth + 4)), Kit.plural(maxi(0, left), "month")], 13, Kit.RD if left <= 1 else Kit.AM))
	v.add_child(Kit.label(c.model.name, 15))
	var f := _checks(v, c)
	if f.verdict != "ready": _needs(v, c, a.get("deployBy", a.startMonth + 4))
	_rack_assign(v, c.id)
	var base: Array = pick.get(c.id, [f.best.cluster.id] if (f.verdict == "ready" and f.get("best") != null) else [])
	if b.g.clusters.size() > 0:
		var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 8); fl.add_theme_constant_override("v_separation", 8 if Layout.phone else 4); v.add_child(fl)
		for cl in b.g.clusters:
			var acc: float = cl.stats.accelerators if cl.get("stats") != null else 0.0
			fl.add_child(_chk("%s (%s)" % [cl.name, Kit.num(acc)], base.has(cl.id), func(on): pick[c.id] = (base + [cl.id]) if on else base.filter(func(x): return x != cl.id); refresh()))
		var go := Kit.btn("ASSIGN & GO LIVE", func(): msg = _say(b.act("assignContract", [c.id, base])); app.sfx("buy"); refresh(), "go", 14); go.disabled = base.is_empty(); v.add_child(go)
	else:
		v.add_child(Kit.label("Build online racks into a cluster (Supercomputer), then come back and assign it.", 12, Kit.DIM, true)); v.add_child(Kit.link("Open Supercomputer →", func(): app.go("network"), 12))

func _serving(parent: Control, a: Dictionary) -> void:
	var b: Bridge = app.b; var c: Dictionary = a.contract
	var pn := Kit.fold_panel("%s · %s · %d mo left" % [c.customer, c.model.name, maxi(0, int(c.durationMonths) - int(a.monthsServed))], "s" + str(c.id), folds, refresh, false, parent, true, str(c.customer)); var v: VBoxContainer = pn[1]
	v.add_child(Kit.tag("serving", Kit.GR)); v.add_child(Kit.label(c.model.name, 15))
	v.add_child(Kit.label("%d/%d mo · SLA misses %d" % [int(a.monthsServed), int(c.durationMonths), int(a.slaMisses)], 13))
	var names := []; for id in a.clusterIds:
		var nm: String = id; for cl in b.g.clusters:
			if cl.id == id: nm = cl.name
		names.append(nm)
	v.add_child(Kit.label("on " + " + ".join(names), 12, Kit.DIM, true))
	var racks := 0; for cl in b.g.clusters:
		if a.clusterIds.has(cl.id): racks += cl.rackIds.size()
	if not Layout.phone: v.add_child(Kit.label("%s allocated · coloured crowns on the Datacenter floor" % Kit.plural(racks, "rack"), 11, Kit.DIM, true))
	var sel0: Array = pick.get(c.id, a.clusterIds.duplicate())
	var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 8); fl.add_theme_constant_override("v_separation", 8 if Layout.phone else 4); v.add_child(fl)
	for cl in b.g.clusters:
		var acc: float = cl.stats.accelerators if cl.get("stats") != null else 0.0
		fl.add_child(_chk("%s (%s)" % [cl.name, Kit.num(acc)], sel0.has(cl.id), func(on): pick[c.id] = (sel0 + [cl.id]) if on else sel0.filter(func(x): return x != cl.id); refresh()))
	var br := _btn_box(v, 6, true)
	var up := Kit.btn("UPDATE CLUSTERS", func(): msg = _say(b.act("assignContract", [c.id, sel0])); pick.erase(c.id); app.sfx("buy"); refresh(), "go", 12); up.disabled = sel0.is_empty() or sel0 == a.clusterIds; br.add_child(up)
	var rel := Kit.btn("Release cluster (back to pending)", func(): Kit.confirm(self, "Release the cluster from %s? Revenue stops and the contract goes back to awaiting deployment: you must re-assign a cluster before the deploy window ends or the customer walks." % str(c.customer), func(): msg = _say(b.act("unassignContract", [c.id])); pick.erase(c.id); refresh(), "Release"), "", 12)
	for cn in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]: rel.add_theme_color_override(cn, Kit.RD)
	br.add_child(rel)
