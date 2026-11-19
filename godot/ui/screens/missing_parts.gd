class_name MissingParts
const BK := preload("res://ui/build_keep.gd")
## "What am I missing for this rack design" with one-click ordering. Used by Warehouse and Build.

static func build(app, parent: Control, design_id: String, racks: int, on_msg: Callable, sp_state: Dictionary) -> void:
	var b: Bridge = app.b
	var r = b.q("rackReadiness", [design_id, racks])
	if r == null: return
	if r.complete:
		parent.add_child(Kit.label("✓ All parts for %d rack%s are in the warehouse." % [racks, "s" if racks > 1 else ""], 13, Kit.GR)); return
	var rows := []
	for l in r.lines:
		if l.short <= 0: continue
		var nm := VBoxContainer.new(); var lk := Kit.link(BK.ell(l.name, 40), func(): app.learn(l.id), 13); lk.tooltip_text = str(l.name); nm.add_child(lk)
		if not l.buyable: nm.add_child(Kit.label(str(l.get("reason", "Unavailable now")), 11, Kit.RD, true))
		rows.append([nm, str(int(l.need)), str(int(l.have)), str(int(l.onOrder)) if l.onOrder > 0 else "—", Kit.usd(l.unitPrice) if l.buyable else "—", ("%s mo" % l.leadMonths) if l.buyable else "—"])
	if Layout.phone:   # no 6-column table in a drawer: one small card per part
		for rw in rows:
			var c := VBoxContainer.new(); c.add_theme_constant_override("separation", 2); parent.add_child(c)
			c.add_child(rw[0]); c.add_child(Kit.label("need %s · have %s · on order %s · %s · %s" % [rw[1], rw[2], rw[3], rw[4], rw[5]], 12, Kit.DIM, true))
	else: parent.add_child(Kit.table(["Missing part", "Need", "Have", "On order", "Unit", "Lead"], rows))
	if r.blocked.size() > 0:
		parent.add_child(Kit.label("⚠ %s cannot be bought this month%s" % [", ".join(r.blocked.map(func(x): return x.name)), "." if Layout.phone else " — redesign the tray/rack with a part that is shipping (Design Lab), or wait for it."], 13, Kit.AM, true))
	elif r.toBuy.size() > 0:
		var h: BoxContainer = VBoxContainer.new() if Layout.phone else HBoxContainer.new(); h.add_theme_constant_override("separation", 10); parent.add_child(h)
		var spc := Kit.check("+ spares", sp_state.get("sp", true), func(on): sp_state["sp"] = on); if Layout.phone: spc.custom_minimum_size.y = Layout.tap()
		h.add_child(spc)
		var order := Kit.btn("ORDER ALL MISSING · %s" % Kit.usd(r.cost), func():
			if not BK.gate("order_missing", 1200): return   # a double click never orders twice
			var out := []
			for l in r.toBuy:
				if l.buyable:
					var m := b.act("buy", [l.id, int(l.short - l.onOrder)]); out.append("✓" if m.ok else m.message)
					var sq := int(b.q("spareQty", [l.id, int(l.need)]))
					if sp_state.get("sp", true) and sq > 0: b.act("buy", [l.id, sq, true])
			b.act("reserveRacks", [design_id, racks])   # these parts are now earmarked for THIS design
			var bad := out.filter(func(x): return x != "✓")
			on_msg.call("Ordered %d part type(s) · arrives within ~%d mo." % [r.toBuy.size(), int(r.etaMonths)] if bad.is_empty() else " ".join(bad)), "go", 14)
		order.disabled = r.cost > b.g.cash; if Layout.phone: order.custom_minimum_size.y = Layout.tap()
		h.add_child(order); h.add_child(Kit.label("arrives in ~%d mo" % int(r.etaMonths), 13, Kit.DIM))
	else: parent.add_child(Kit.label("Everything missing is already on order.", 13, Kit.DIM))
