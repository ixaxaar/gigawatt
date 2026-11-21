class_name StockScreen
extends Control
## Warehouse & assembly: rack readiness, deploy, spares, in-transit, floor, full ledger.
var app
var msg := ""
var hall_id := ""
var n := 1
var sp_state := {"sp": true}
var design_q := ""
var open_missing := {}
var folds := {}
var ml_all := false
var led_all := false
const ML_CAP := 60
const KIND_ORDER := ["accelerator", "cpu", "memory", "nvme", "nic", "switch", "cable", "chassis", "rack", "storage", "power", "cooling"]

func _serial(rack_id: String) -> String:
	for m in app.b.q("machineLedger"):
		if m.id == rack_id: return m.serial
	return rack_id


## A design is "in use" when something is placed, reserved, buildable now, or any of its parts are owned / on order.
func _in_use(b: Bridge, g: Dictionary, d: Dictionary) -> bool:
	for h in g.halls:
		for p in h.racks:
			if p.designId == d.id: return true
	if int(g.get("rackReserve", {}).get(d.id, 0)) > 0: return true
	var r: Dictionary = b.q("rackReadiness", [d.id, 1])
	if r.is_empty(): return false
	if r.buildableNow > 0: return true
	for l in r.lines:
		if l.have > 0 or l.onOrder > 0: return true
	return false

func _design_row(parent: Control, d: Dictionary) -> void:
	var b: Bridge = app.b; var g: Dictionary = b.g
	var r: Dictionary = b.q("rackReadiness", [d.id, n]); var placed_n := 0
	for h in g.halls:
		for p in h.racks:
			if p.designId == d.id: placed_n += 1
	var box := VBoxContainer.new(); box.add_theme_constant_override("separation", 6); parent.add_child(box); parent.add_child(Kit.hsep())
	var h1: Container
	if Layout.phone:   # name, then tags that wrap, then hall picker and Deploy stacked
		box.add_theme_constant_override("separation", 10)
		box.add_child(Kit.label(d.name, 16, Kit.TX, true))
		var tf := HFlowContainer.new(); tf.add_theme_constant_override("h_separation", 8); tf.add_theme_constant_override("v_separation", 8); box.add_child(tf); h1 = tf
	else:
		h1 = HBoxContainer.new(); h1.add_theme_constant_override("separation", 10); box.add_child(h1); var nl := BK.one_line(Kit.label(d.name, 15)); nl.tooltip_text = str(d.name); nl.mouse_filter = Control.MOUSE_FILTER_PASS; h1.add_child(nl)   # a 60-character name ends in "…" instead of pushing Deploy off-screen
	h1.add_child(Kit.tag("%d ready to deploy" % int(r.buildableNow), Kit.GR)); h1.add_child(Kit.tag("%d deployed" % placed_n))
	if int(g.get("rackReserve", {}).get(d.id, 0)) > 0: h1.add_child(Kit.tag("%d reserved" % int(g.rackReserve[d.id]), Kit.CY))
	if r.buildableNow > 0:
		if Layout.phone: h1 = box
		var opts := []; for h in g.halls: opts.append([h.id, "%s (%d/%d)" % [h.name, h.racks.size(), int(h.rackSlots)]])
		var ho := BK.slim(Kit.option(opts, hall_id, func(v): hall_id = v), 140.0); ho.size_flags_horizontal = Control.SIZE_FILL; if Layout.phone: ho.custom_minimum_size.y = Layout.tap()
		h1.add_child(ho)
		h1.add_child(Kit.btn("DEPLOY 1", func():
			if not BK.gate("deploy", 700): return
			msg = b.act("placeRack", [hall_id, d.id]).message; app.sfx("rack_place"); refresh(), "go", 14))
	var active: bool = int(g.get("rackReserve", {}).get(d.id, 0)) > 0 or int(r.buildableNow) > 0 or open_missing.has(d.id)
	for l in r.lines:
		if l.have > 0 or l.onOrder > 0: active = true
	if active: MissingParts.build(app, box, d.id, maxi(1, n), func(m): msg = m; refresh(), sp_state)
	else: box.add_child(Kit.btn("Order more of this design…", func(): open_missing[d.id] = true; refresh(), "", 12))


## The design list under the filter (rebuilt on its own while typing).
func _fill_designs() -> void:
	if not is_instance_valid(_designs): return
	for c in _designs.get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	var used := []; var unused := []
	for d in g.racks:
		if design_q != "" and not str(d.name).to_lower().contains(design_q.to_lower()): continue
		(used if _in_use(b, g, d) else unused).append(d)
	for d in used: _design_row(_designs, d)
	if used.is_empty() and unused.is_empty() and not g.racks.is_empty(): _designs.add_child(Kit.label("No design name contains “%s”." % design_q, 13, Kit.DIM, true))
	elif used.is_empty() and not unused.is_empty(): _designs.add_child(Kit.label("Nothing in progress — all designs below are unused.", 13, Kit.DIM))
	if not unused.is_empty():
		var up := Kit.fold_panel("Unused designs (%d)" % unused.size(), "unused", folds, refresh, false, _designs, unused.size() > 0 and design_q == "")
		for d in unused: _design_row(up[1], d)

## Section: a plain panel on desktop, a collapsed fold on phone for the long reference lists.
func _sec(title: String, key: String, parent: Control, fold_on_phone: bool) -> Array:
	if Layout.phone and fold_on_phone: return Kit.fold_panel(title, key, folds, refresh, false, parent, true)
	return Kit.panel(title, false, parent)

const BK := preload("res://ui/build_keep.gd")
func refresh() -> void: BK.refresh(self, app, _rebuild)
var _designs: VBoxContainer

func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	if hall_id == "" or b.hall(hall_id).is_empty(): hall_id = g.halls[0].id
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := Kit.head_row(12); root.add_child(hd)
	if Layout.phone:
		var cap := Kit.label("On order → warehouse → deployed", 14, Kit.DIM, true); cap.custom_minimum_size.y = 30; cap.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM; hd.add_child(cap)   # breathing room under the tab bar
	else:
		hd.add_child(Kit.label("WAREHOUSE & ASSEMBLY", 26, Kit.CY))
		hd.add_child(Kit.label("Parts live in one of three states: on order (paid, in transit) → warehouse (arrived) → deployed (racked on the floor or installed in a hall).", 13, Kit.DIM, true)); Kit.hint_fix(hd, app)
	if msg != "": root.add_child(Kit.label(msg, 14, Kit.CY, true))
	var lr := Kit.cols2(root); var left: VBoxContainer = lr[0]; var right: VBoxContainer = lr[1]
	if not Layout.phone: left.add_child(Kit.tip("Parts move on order → warehouse → deployed. A rack can only be deployed when every part in its design is in the warehouse and the hall has power, cooling and a free slot."))
	var ra := Kit.panel("Rack assembly" if Layout.phone else "Rack assembly — your designs", true, left)
	# The filter sits at the top of the list and filters as you type: only the list below it is rebuilt, so the field keeps its
	# text, focus and caret (and the phone keyboard stays up). The × clears it.
	if g.racks.is_empty(): ra[1].add_child(Kit.label("No rack designs yet. Buy a system in Procure (it saves its design automatically) or build one in the Design Lab.", 14, Kit.DIM, true))
	else:
		var le := LineEdit.new(); le.placeholder_text = "Filter designs by name"; le.text = design_q; le.clear_button_enabled = true; le.set_meta("key", "design_q")
		le.custom_minimum_size = Vector2(160, Layout.tap() if Layout.compact else 0.0); le.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		le.text_changed.connect(func(t): design_q = t; _fill_designs())
		le.text_submitted.connect(func(_t): le.release_focus())
		ra[1].add_child(le)
	_designs = VBoxContainer.new(); _designs.add_theme_constant_override("separation", 6); ra[1].add_child(_designs)
	_fill_designs()
	if not g.racks.is_empty():
		var h2: Container = HFlowContainer.new() if Layout.compact else HBoxContainer.new(); h2.add_theme_constant_override("separation", 8); h2.add_theme_constant_override("h_separation", 8); h2.add_theme_constant_override("v_separation", 6); ra[1].add_child(h2)
		h2.add_child(Kit.label("Plan for", 13, Kit.DIM)); h2.add_child(Kit.spin(n, 1, 500, 1, func(v): n = int(v); refresh())); h2.add_child(Kit.label("racks each" if Layout.phone else "racks of each design.", 13, Kit.DIM))
	# --- spares
	var sv: Dictionary = b.q("sparesView"); var spp := _sec("Spares — parts WILL break", "spares", right, false)
	if sv.rows.is_empty(): spp[1].add_child(Kit.label("Deploy racks first; then keep a few spare GPUs, PSUs, NICs and drives on the shelf. A failed rack with a spare is back in 1 month; without one it waits ~4 months for RMA.", 13, Kit.DIM, true))
	else:
		for f in sv.failed: spp[1].add_child(Kit.label("✗ %s: %s · back month %d" % [_serial(f.id), f.part, int(f.readyMonth)], 12, Kit.RD, true))
		var rows := []
		for r in sv.rows:
			var nm := VBoxContainer.new(); nm.add_child(Kit.label(r.name, 13, Kit.TX, true)); nm.add_child(Kit.label(r.label, 10, Kit.DIM))
			var short: int = int(r.adv - r.have)
			var bt := Kit.btn("Buy %d" % maxi(0, short), func(): msg = b.act("buy", [r.id, short, true]).message; app.sfx("buy"); refresh(), "", 12); bt.disabled = short <= 0
			rows.append([nm, Kit.label(str(int(r.have)), 14, Kit.GR if r.have >= r.adv else Kit.RD), str(int(r.adv)), bt])
		spp[1].add_child(Kit.table(["Part", "Spare", "Advised", ""], rows))
	var led: Array = b.q("ledger")
	var tr := _sec("In transit", "transit", right, false)
	if g.orders.is_empty(): tr[1].add_child(Kit.link("Nothing on order. Open Procure →", func(): app.go("shop"), 13))
	var ords: Array = g.orders.duplicate(); ords.sort_custom(func(a, c): return a.arriveMonth < c.arriveMonth)
	for o in ords:
		var nm: String = b.item(o.itemId).get("name", o.itemId)
		tr[1].add_child(Kit.label("%d× %s%s → %s (%d mo)" % [int(o.qty), nm, " (spare)" if o.get("spare", false) else "", Kit.date_of(o.arriveMonth), int(o.arriveMonth - g.month)], 12, Kit.TX, true))
	var fl := _sec("Machine ledger — every rack and what it is doing", "machines", right, true)
	var ml: Array = b.q("machineLedger")
	if ml.is_empty(): fl[1].add_child(Kit.label("None deployed.", 13, Kit.DIM))
	else:
		var mrows := []
		var shown := 0
		for m in ml:
			if not ml_all and shown >= ML_CAP: break
			shown += 1
			var doing: String = m.role
			if m.get("customer") != null: doing += " · %s" % m.customer
			elif m.get("cluster") != null: doing += " · " + str(m.cluster)
			var col := Kit.GR if m.status == "online" else (Kit.RD if m.status == "failed" else Kit.AM)
			mrows.append([m.serial, Kit.label(m.design, 12, Kit.TX, true), "%s #%d" % [m.hall, int(m.slot + 1)], Kit.label(str(m.status) + ("" if m.status == "online" else " → " + Kit.date_of(m.readyMonth)), 12, col, true), Kit.label(doing, 12, Kit.GR if ["training", "serving"].has(m.role) else Kit.DIM, true)])
		fl[1].add_child(Kit.table(["Serial", "Machine", "Where", "Status", "Doing"], mrows))
		if ml.size() > ML_CAP: fl[1].add_child(Kit.link(("Showing all %d racks — collapse" % ml.size()) if ml_all else "Show all %d racks (first %d shown)" % [ml.size(), ML_CAP], func(): ml_all = not ml_all; refresh(), 13))
	var value := 0.0; for r in led: value += r.warehouse
	var lp := _sec("Full inventory ledger (%d units in warehouse)" % int(value), "ledger", right, true)
	var kinds := []; for r in led:
		if not kinds.has(r.kind): kinds.append(r.kind)
	kinds.sort_custom(func(a, c): return KIND_ORDER.find(a) < KIND_ORDER.find(c))
	var rows2 := []
	for k in kinds:
		for r in led:
			if r.kind != k: continue
			if not led_all and not (r.warehouse > 0 or r.get("spares", 0) > 0 or r.onOrder > 0 or r.get("deployed", 0) > 0): continue
			var nm := VBoxContainer.new(); nm.add_child(Kit.link(BK.ell(r.name, 40), func(): app.learn(r.id), 13)); nm.add_child(Kit.label(r.vendor, 10, Kit.DIM))
			rows2.append([nm, r.kind, ("%d%s" % [int(r.warehouse), (" +%d spare" % int(r.spares)) if r.get("spares", 0) > 0 else ""]) if (r.warehouse > 0 or r.get("spares", 0) > 0) else "—", ("%d · %s" % [int(r.onOrder), Kit.date_of(r.nextEta)]) if r.onOrder > 0 else "—", str(int(r.deployed)) if r.deployed > 0 else "—"])
	if rows2.is_empty(): lp[1].add_child(Kit.label("Empty. Buy something in Procure.", 13, Kit.DIM))
	else: lp[1].add_child(Kit.table(["Part", "Kind", "Warehouse", "On order", "Deployed"], rows2))
	lp[1].add_child(Kit.link("Showing every catalog part — only parts you own or ordered" if led_all else "Showing parts you own or have on order · show the whole catalog", func(): led_all = not led_all; refresh(), 13))
