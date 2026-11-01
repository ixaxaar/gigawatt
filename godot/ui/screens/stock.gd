class_name StockScreen
extends Control
## Warehouse & assembly: rack readiness, deploy, spares, in-transit, floor, full ledger.
var app
var msg := ""
var hall_id := ""
var n := 1
var sp_state := {"sp": true}
const KIND_ORDER := ["accelerator", "cpu", "memory", "nvme", "nic", "switch", "cable", "chassis", "rack", "storage", "power", "cooling"]

func refresh() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	if hall_id == "" or b.hall(hall_id).is_empty(): hall_id = g.halls[0].id
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := HBoxContainer.new(); hd.add_theme_constant_override("separation", 12); root.add_child(hd)
	hd.add_child(Kit.label("WAREHOUSE & ASSEMBLY", 26, Kit.CY))
	hd.add_child(Kit.label("Parts live in one of three states: on order (paid, in transit) → warehouse (arrived) → deployed (racked on the floor or installed in a hall).", 13, Kit.DIM, true))
	if msg != "": root.add_child(Kit.label(msg, 14, Kit.CY, true))
	var cols := HBoxContainer.new(); cols.size_flags_vertical = Control.SIZE_EXPAND_FILL; cols.add_theme_constant_override("separation", 12); root.add_child(cols)
	var left := Kit.column(cols, 0, true); var right := Kit.column(cols, 0, true)
	left.add_child(Kit.tip("Parts move on order → warehouse → deployed. A rack can only be deployed when every part in its design is in the warehouse and the hall has power, cooling and a free slot."))
	var ra := Kit.panel("Rack assembly — your designs", true, left)
	if g.racks.is_empty(): ra[1].add_child(Kit.label("No rack designs yet. Buy a system in Procure (it saves its design automatically) or build one in the Design Lab.", 14, Kit.DIM, true))
	for d in g.racks:
		var r = b.q("rackReadiness", [d.id, n]); var placed_n := 0
		for h in g.halls:
			for p in h.racks:
				if p.designId == d.id: placed_n += 1
		var box := VBoxContainer.new(); box.add_theme_constant_override("separation", 6); ra[1].add_child(box); ra[1].add_child(Kit.hsep())
		var h1 := HBoxContainer.new(); h1.add_theme_constant_override("separation", 10); box.add_child(h1)
		h1.add_child(Kit.label(d.name, 15)); h1.add_child(Kit.tag("%d ready to deploy" % int(r.buildableNow), Kit.GR)); h1.add_child(Kit.tag("%d deployed" % placed_n))
		var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; h1.add_child(sp)
		if r.buildableNow > 0:
			var opts := []; for h in g.halls: opts.append([h.id, "%s (%d/%d)" % [h.name, h.racks.size(), int(h.rackSlots)]])
			h1.add_child(Kit.option(opts, hall_id, func(v): hall_id = v))
			h1.add_child(Kit.btn("DEPLOY 1", func(): msg = b.act("placeRack", [hall_id, d.id]).message; app.sfx("buy"); refresh(), "go", 14))
		MissingParts.build(app, box, d.id, maxi(1, n), func(m): msg = m; refresh(), sp_state)
	if not g.racks.is_empty():
		var h2 := HBoxContainer.new(); h2.add_theme_constant_override("separation", 8); ra[1].add_child(h2)
		h2.add_child(Kit.label("Plan for", 13, Kit.DIM)); h2.add_child(Kit.spin(n, 1, 500, 1, func(v): n = int(v); refresh())); h2.add_child(Kit.label("rack(s) of each design.", 13, Kit.DIM))
	# --- spares
	var sv: Dictionary = b.q("sparesView"); var spp := Kit.panel("Spares — parts WILL break", false, right)
	if sv.rows.is_empty(): spp[1].add_child(Kit.label("Deploy racks first; then keep a few spare GPUs, PSUs, NICs and drives on the shelf. A failed rack with a spare is back in 1 month; without one it waits ~4 months for RMA.", 13, Kit.DIM, true))
	else:
		for f in sv.failed: spp[1].add_child(Kit.label("✗ %s: %s · back month %d" % [f.id, f.part, int(f.readyMonth)], 12, Kit.RD, true))
		var rows := []
		for r in sv.rows:
			var nm := VBoxContainer.new(); nm.add_child(Kit.label(r.name, 13, Kit.TX, true)); nm.add_child(Kit.label(r.label, 10, Kit.DIM))
			var short: int = int(r.adv - r.have)
			var bt := Kit.btn("Buy %d" % maxi(0, short), func(): msg = b.act("buy", [r.id, short, true]).message; app.sfx("buy"); refresh(), "", 12); bt.disabled = short <= 0
			rows.append([nm, Kit.label(str(int(r.have)), 14, Kit.GR if r.have >= r.adv else Kit.RD), str(int(r.adv)), bt])
		spp[1].add_child(Kit.table(["Part", "Spare", "Advised", ""], rows))
	var led: Array = b.q("ledger")
	var tr := Kit.panel("In transit", false, right)
	if g.orders.is_empty(): tr[1].add_child(Kit.link("Nothing on order. Open Procure →", func(): app.go("shop"), 13))
	var ords: Array = g.orders.duplicate(); ords.sort_custom(func(a, c): return a.arriveMonth < c.arriveMonth)
	for o in ords:
		var nm: String = b.item(o.itemId).get("name", o.itemId)
		tr[1].add_child(Kit.label("%d× %s%s → %s (%d mo)" % [int(o.qty), nm, " (spare)" if o.get("spare", false) else "", Kit.date_of(o.arriveMonth), int(o.arriveMonth - g.month)], 12, Kit.TX, true))
	var fl := Kit.panel("Racks on the floor", false, right); var any := false
	for h in g.halls:
		for p in h.racks:
			any = true; var dn := ""
			for d in g.racks:
				if d.id == p.designId: dn = d.name
			var col := Kit.GR if p.status == "online" else (Kit.RD if p.status == "failed" else Kit.AM)
			fl[1].add_child(Kit.rich("%s · %s  [color=#%s]%s%s[/color]" % [h.name, dn, col.to_html(false), p.status, ("" if p.status == "online" else " → " + Kit.date_of(p.readyMonth))], 12))
	if not any: fl[1].add_child(Kit.label("None deployed.", 13, Kit.DIM))
	var value := 0.0; for r in led: value += r.warehouse
	var lp := Kit.panel("Full inventory ledger (%d units in warehouse)" % int(value), false, right)
	var kinds := []; for r in led:
		if not kinds.has(r.kind): kinds.append(r.kind)
	kinds.sort_custom(func(a, c): return KIND_ORDER.find(a) < KIND_ORDER.find(c))
	var rows2 := []
	for k in kinds:
		for r in led:
			if r.kind != k: continue
			var nm := VBoxContainer.new(); nm.add_child(Kit.link(r.name, func(): app.learn(r.id), 13)); nm.add_child(Kit.label(r.vendor, 10, Kit.DIM))
			rows2.append([nm, r.kind, ("%d%s" % [int(r.warehouse), (" +%d spare" % int(r.spares)) if r.get("spares", 0) > 0 else ""]) if (r.warehouse > 0 or r.get("spares", 0) > 0) else "—", ("%d · %s" % [int(r.onOrder), Kit.date_of(r.nextEta)]) if r.onOrder > 0 else "—", str(int(r.deployed)) if r.deployed > 0 else "—"])
	if rows2.is_empty(): lp[1].add_child(Kit.label("Empty. Buy something in Procure.", 13, Kit.DIM))
	else: lp[1].add_child(Kit.table(["Part", "Kind", "Warehouse", "On order", "Deployed"], rows2))
