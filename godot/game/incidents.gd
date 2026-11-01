class_name Incidents
## Pause-and-decide events. Each has 2-3 choices with real trade-offs. `make` builds params
## (stored in the save), `apply` resolves a choice and returns a result line.

static func eligible(sim: Sim) -> Array:
	var k := ["power_spike", "press", "poach", "gpu_allocation", "heatwave"]
	if sim.s.debt < 30e6: k.append("vc_offer")
	if sim.s.contracts.size() > 0: k.append("customer_upsize")
	return k

static func make(sim: Sim, kind: String, h: int) -> Dictionary:
	var racks := 0
	for hall in sim.s.halls: racks += hall.racks.size()
	match kind:
		"gpu_allocation":
			var avail := sim.available_systems().filter(func(x): return x.tier != "diy")
			var sy: Dictionary = avail[h % avail.size()]
			return {"sys": sy.id, "qty": 2 + h % 3}
		"vc_offer": return {"amount": 15e6 + (h % 3) * 5e6}
		"customer_upsize":
			var c: Dictionary = sim.s.contracts[h % sim.s.contracts.size()]
			return {"customer": c.customer, "extra": maxi(16, c.accels / 2)}
		"heatwave": return {"bill": 20000.0 * maxi(1, racks)}
		_: return {"racks": racks}

static func card(sim: Sim, kind: String, p: Dictionary) -> Dictionary:
	var m := Sim.money
	match kind:
		"power_spike": return {"icon": "⚡", "title": "ENERGY CRISIS", "body": "The grid operator just spiked rates 40%. Your CFO has two ideas.", "choices": [
			{"t": "Sign a 12-month hedge", "d": "Pay %s now, rate returns to $0.07 immediately." % m.call(60000.0 + p.racks * 15000.0)}, {"t": "Ride the spot market", "d": "Free — but power costs jump to $0.098/kWh and decay slowly."}]}
		"press": return {"icon": "📰", "title": "PRESS INQUIRY", "body": "A journalist is writing about AI datacenter energy use and asks for a tour.", "choices": [
			{"t": "Open the doors", "d": "$150k PR and cleanup. Reputation +4."}, {"t": "No comment", "d": "Free. Reputation -1."}, {"t": "Spin it green", "d": "50%: rep +6. 50%: caught greenwashing, rep -9."}]}
		"poach": return {"icon": "🧑‍🔧", "title": "ENGINEERS POACHED", "body": "A hyperscaler is poaching your best site engineers.", "choices": [
			{"t": "Retention bonus", "d": "$300k. Keep the team."}, {"t": "Let them go", "d": "Free, but staff -1 (more failures take longer) and rep -1."}]}
		"gpu_allocation":
			var sy := Data.system(p.sys); var cost: float = sim.system_price(sy) * p.qty * 0.82
			return {"icon": "📦", "title": "ALLOCATION WINDOW", "body": "%s offers %d× %s at 18%% off if you pay in full today." % [sy.integrator.capitalize(), p.qty, sy.name], "choices": [
				{"t": "Take it — %s" % m.call(cost), "d": "Arrives in %d months. Needs a free %s slot." % [sy.leadMonths, sy.cooling.to_upper()]}, {"t": "Pass", "d": "Keep your cash."}]}
		"vc_offer": return {"icon": "🏦", "title": "GROWTH CAPITAL", "body": "A fund offers %s of venture debt at 8%% APR." % m.call(p.amount), "choices": [
			{"t": "Take the money", "d": "+%s cash now, interest ~%s/yr." % [m.call(p.amount), m.call(p.amount * 0.08)]}, {"t": "Decline", "d": "Stay lean."}]}
		"customer_upsize": return {"icon": "🤝", "title": "%s WANTS MORE" % p.customer.to_upper(), "body": "They want %d extra GPUs on a fresh 12-month lease at +10%% price." % p.extra, "choices": [
			{"t": "Sign the expansion", "d": "New contract, 4 months to deploy. Miss it and you eat penalties."}, {"t": "Decline", "d": "No risk."}]}
		"heatwave": return {"icon": "🌡", "title": "HEATWAVE", "body": "Record ambient temperatures. Your chillers are straining.", "choices": [
			{"t": "Rent emergency chillers", "d": "%s. No impact." % m.call(p.bill)}, {"t": "Gamble", "d": "50%: nothing. 50%: a rack trips, bill %s and rep -2." % m.call(p.bill * 3.0)}]}
	return {}

static func apply(sim: Sim, kind: String, p: Dictionary, c: int) -> String:
	var s := sim.s
	var luck: float = ((s.seed * 31 + s.month * 17) & 0xFF) / 255.0
	match kind:
		"power_spike":
			if c == 0: s.cash -= 60000.0 + p.racks * 15000.0; s.kwh = 0.07; return "Hedge signed. Power back to $0.07."
			s.kwh = 0.098; return "You rode the spike. Power now $0.098/kWh."
		"press":
			if c == 0: s.cash -= 150000.0; s.rep = minf(100.0, s.rep + 4.0); return "Great coverage. Reputation +4."
			if c == 1: s.rep = maxf(0.0, s.rep - 1.0); return "They wrote it without you. Reputation -1."
			if luck < 0.5: s.rep = minf(100.0, s.rep + 6.0); return "It worked! Reputation +6."
			s.rep = maxf(0.0, s.rep - 9.0); return "Busted for greenwashing. Reputation -9."
		"poach":
			if c == 0: s.cash -= 300000.0; return "Team retained."
			s.staff = maxi(1, s.staff - 1); s.rep = maxf(0.0, s.rep - 1.0); return "They left. Fewer hands on deck."
		"gpu_allocation":
			if c == 1: return "You passed."
			var sy := Data.system(p.sys); var cost: float = sim.system_price(sy) * p.qty * 0.82
			if cost > s.cash: return "You couldn't afford it — the window closed."
			s.cash -= cost; s.orders.append({"kind": "system", "id": p.sys, "qty": p.qty, "arrive": s.month + int(sy.leadMonths), "cost": cost})
			return "Allocation secured: %d× %s." % [p.qty, sy.name]
		"vc_offer":
			if c == 1: return "You stayed lean."
			s.debt += p.amount; s.cash += p.amount; return "Funds wired. Spend them wisely."
		"customer_upsize":
			if c == 1: return "Declined."
			var anchor := Data.gpu_hour(sim.year())
			s.contracts.append({"id": "up%d" % s.month, "customer": p.customer, "archetype": "enterprise", "kind": "training", "accels": p.extra, "price": snappedf(anchor * 1.1, 0.01),
				"months": 12, "start": s.month, "deploy_by": s.month + 4, "served": 0, "misses": 0})
			return "Expansion signed: +%d GPUs in 4 months." % p.extra
		"heatwave":
			if c == 0: s.cash -= p.bill; return "Chillers rented. No downtime."
			if luck < 0.5: return "Lucky — the weather broke."
			s.cash -= p.bill * 3.0; s.rep = maxf(0.0, s.rep - 2.0)
			for h in s.halls:
				for r in h.racks:
					if r.status == "online": r.status = "failed"; r.until = s.month + 2; return "A rack tripped. Bill %s." % Sim.money(p.bill * 3.0)
			return "Nothing broke."
	return ""
