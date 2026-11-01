extends SceneTree
## Headless smoke: a scripted bot plays 5 years and must not crash; prints a sanity curve.
func _init() -> void:
	var sim := Sim.new(); sim.new_game(42, "operator")
	for m in 100:
		if sim.s.over != "": break
		if not sim.s.incident.is_empty(): sim.resolve_incident(0)
		var av := sim.available_systems().filter(func(x): return x.cooling == "air" and x.tier == "oem")
		if av.size() > 0 and sim.s.cash > 2e6 and sim.s.orders.size() < 2:
			var best: Dictionary = av[av.size() - 1]; sim.order_system(best.id, 2)
		for id in sim.s.crates.keys():
			var sy := Data.system(id); var h: Dictionary = sim.s.halls[0]
			for slot in h.slots:
				if sim.s.crates.get(id, 0) <= 0: break
				if h.racks.filter(func(r): return r.slot == slot).is_empty() and sim.hall_heat(h) + sy.kW < h.it_kw: sim.place(0, slot, id)
		var committed := 0.0
		for c in sim.s.contracts: committed += c.accels
		for i in range(sim.s.offers.size() - 1, -1, -1):
			if committed + sim.s.offers[i].accels <= sim.online_accels() * 1.1 + 16: committed += sim.s.offers[i].accels; sim.accept_offer(i)
		var hh: Dictionary = sim.s.halls[0]
		if sim.s.orders.filter(func(o): return o.kind == "plant").size() < 2:
			if hh.it_kw < sim.hall_heat(hh) * 1.15 + 20: sim.order_plant(0, "vt-powerbar-400")
			elif hh.cool_kw < sim.hall_heat(hh) * 1.15 + 20: sim.order_plant(0, "se-uniflair-300")
		sim.advance()
		if m % 12 == 0: print(sim.date_of(sim.s.month), " cash ", Sim.money(sim.s.cash), " NW ", Sim.money(sim.net_worth()), " accels ", int(sim.online_accels()), " chap ", sim.s.chapter, " rep ", int(sim.s.rep), " thr ", snappedf(sim.hall_throttle(sim.s.halls[0]), 0.01), " pnl ", {"rev": Sim.money(sim.pnl().revenue), "opex": Sim.money(sim.pnl().opex), "power": Sim.money(sim.pnl().power), "staff": Sim.money(sim.pnl().staff)})
	print("END ", sim.s.over, " month ", sim.s.month, " NW ", Sim.money(sim.net_worth()))
	quit(0)
