class_name Sim
extends RefCounted
## GIGAWATT game-first simulation. Deterministic given the seed. One tick = one month.

signal logged(level: String, text: String)

const START_MONTH := 11
const INSTALL_MONTHS := 2
const HOURS := 730.0
const CHAPTERS := [
	{"name": "Prove it", "deadline": 36, "mult": 1.25, "grant": 6e6, "text": "Turn the first racks into a business"},
	{"name": "Scale up", "deadline": 60, "mult": 2.0, "grant": 15e6, "text": "Survive the GPU shortage and grow"},
	{"name": "Liquid era", "deadline": 84, "mult": 3.2, "grant": 40e6, "text": "Go liquid before Blackwell eats you"},
	{"name": "Hyperscaler", "deadline": 108, "mult": 5.0, "grant": 0.0, "text": "Build a giga-scale AI factory"},
]

var s: Dictionary
var rng: Rng

func new_game(seed_: int, mode: String = "operator") -> void:
	Data.load_all()
	rng = Rng.new(seed_)
	var cash: float = {"learner": 80e6, "operator": 50e6, "tycoon": 30e6}[mode]
	s = {
		"month": START_MONTH, "seed": seed_, "mode": mode, "cash": cash, "debt": 0.0, "rep": 50.0, "staff": 3, "spares": 2,
		"kwh": 0.07, "halls": [make_hall("Hall A", "air", 40, 500, 600, {"vt-crah-100": 6})], "orders": [], "crates": {},
		"spot": Data.gpu_hour(2020.9) * 0.85, "spot_hist": [], "offers": [], "contracts": [], "log": [], "history": [],
		"incident": {}, "chapter": 0, "chapter_done": [], "start_nw": 0.0, "over": "", "capex": 0.0, "fails": 0, "peak_nw": 0.0,
	}
	s.start_nw = net_worth()
	s.peak_nw = s.start_nw
	_gen_offers()
	say("info", "Welcome to GIGAWATT. Your board wants proof this works: grow net worth %d%% by %s." % [int((CHAPTERS[0].mult - 1) * 100), date_of(CHAPTERS[0].deadline)])

func make_hall(name: String, cool: String, slots: int, it_kw: float, cool_kw: float, plant: Dictionary) -> Dictionary:
	return {"name": name, "cool": cool, "slots": slots, "it_kw": it_kw, "cool_kw": cool_kw, "racks": [], "plant": plant}

# ---------- helpers ----------
func year() -> float: return 2020.0 + s.month / 12.0
func date_of(m: int) -> String: return "%s %d" % [["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m % 12], 2020 + m / 12]
func say(level: String, text: String) -> void:
	s.log.append({"month": s.month, "level": level, "text": text}); logged.emit(level, text)

func net_worth() -> float:
	var assets := 0.0
	for h in s.halls:
		for r in h.racks:
			var age: float = (s.month - r.get("born", s.month)) / 12.0
			assets += Data.system(r.sys).priceAtLaunch * maxf(0.2, 1.0 - 0.18 * age)
	for o in s.orders: assets += o.cost
	for id in s.crates: assets += Data.system(id).priceAtLaunch * s.crates[id]
	return s.cash - s.debt + assets

func system_price(sys: Dictionary) -> float:
	var age := maxf(0.0, year() - sys.availableFrom)
	return sys.priceAtLaunch * maxf(0.6, 1.0 - 0.07 * age)

func available_systems() -> Array:
	var out := []
	for sy in Data.systems:
		if sy.ok and sy.availableFrom <= year() and year() <= sy.eolAfter: out.append(sy)
	return out

func perf_of(sy: Dictionary) -> float:
	return clampf(sqrt((sy.tflopsBf16 / maxf(1.0, sy.accels)) / 900.0), 0.3, 2.6)

# ---------- player actions: each returns "" on success or an error string ----------
func order_system(sys_id: String, qty: int) -> String:
	var sy := Data.system(sys_id)
	if sy.is_empty() or qty <= 0: return "Pick a system."
	var cost := system_price(sy) * qty * (1.0 - minf(0.12, qty * 0.01))
	if cost > s.cash: return "Not enough cash (%s needed)." % money(cost)
	s.cash -= cost
	var lead := int(sy.leadMonths) + (2 if year() > 2022.9 and year() < 2024.5 and sy.platform.contains("H100") else 0)
	s.orders.append({"kind": "system", "id": sys_id, "qty": qty, "arrive": s.month + lead, "cost": cost})
	say("info", "Ordered %d× %s for %s. Arrives %s." % [qty, sy.name, money(cost), date_of(s.month + lead)])
	return ""

func order_plant(hall_i: int, id: String) -> String:
	var it := Data.item(id)
	if it.is_empty(): return "Unknown equipment."
	if it.priceUSD > s.cash: return "Not enough cash (%s)." % money(it.priceUSD)
	s.cash -= it.priceUSD
	s.orders.append({"kind": "plant", "id": id, "qty": 1, "hall": hall_i, "arrive": s.month + int(ceil(it.leadTimeMonths)), "cost": it.priceUSD})
	say("info", "Ordered %s for %s. Installs on arrival (%s)." % [it.name, s.halls[hall_i].name, date_of(s.month + int(ceil(it.leadTimeMonths)))])
	return ""

func place(hall_i: int, slot: int, sys_id: String) -> String:
	var h: Dictionary = s.halls[hall_i]
	var sy := Data.system(sys_id)
	if s.crates.get(sys_id, 0) <= 0: return "None in the warehouse."
	for r in h.racks:
		if r.slot == slot: return "Slot taken."
	if sy.cooling != h.cool: return "%s needs a %s hall." % [sy.name, sy.cooling.to_upper()]
	s.crates[sys_id] -= 1
	if s.crates[sys_id] <= 0: s.crates.erase(sys_id)
	h.racks.append({"slot": slot, "sys": sys_id, "status": "installing", "ready": s.month + INSTALL_MONTHS, "until": 0, "born": s.month})
	return ""

func build_hall(name: String, cool: String, slots: int) -> String:
	var cost := slots * (90000.0 if cool == "air" else 240000.0)
	if cost > s.cash: return "Not enough cash (%s)." % money(cost)
	s.cash -= cost
	s.orders.append({"kind": "hall", "id": cool, "name": name, "slots": slots, "qty": 1, "arrive": s.month + 3, "cost": cost})
	say("info", "Construction started on %s (%d slots, %s) for %s — ready %s." % [name, slots, cool.to_upper(), money(cost), date_of(s.month + 3)])
	return ""

func buy_spares(n: int) -> String:
	var cost := 18000.0 * n
	if cost > s.cash: return "Not enough cash."
	s.cash -= cost; s.spares += n
	return ""

func take_loan(amount: float) -> String:
	if s.debt + amount > maxf(30e6, s.start_nw * 1.5): return "The bank won't lend more."
	s.debt += amount; s.cash += amount
	say("info", "Took a %s loan at 8%% APR." % money(amount)); return ""

func accept_offer(i: int) -> String:
	if i < 0 or i >= s.offers.size(): return "Gone."
	var c: Dictionary = s.offers[i]
	s.offers.remove_at(i)
	c.start = s.month; c.deploy_by = s.month + 4; c.served = 0; c.misses = 0
	s.contracts.append(c)
	say("good", "Signed %s: %d GPUs at $%.2f/GPU-hr for %d months." % [c.customer, c.accels, c.price, c.months])
	return ""

# ---------- derived numbers ----------
func hall_heat(h: Dictionary) -> float:
	var kw := 0.0
	for r in h.racks:
		if r.status == "online" or r.status == "commissioning": kw += Data.system(r.sys).kW
	return kw

func hall_throttle(h: Dictionary) -> float:
	var heat := hall_heat(h)
	if heat <= 0.0: return 1.0
	return minf(1.0, minf(h.cool_kw / heat, h.it_kw / heat))

func online_accels() -> float:
	var n := 0.0
	for h in s.halls:
		var t := hall_throttle(h)
		for r in h.racks:
			if r.status == "online": n += Data.system(r.sys).accels * t
	return n

func pue_of(h: Dictionary) -> float: return 1.45 if h.cool == "air" else 1.15

func contract_demand() -> float:
	var n := 0.0
	for c in s.contracts:
		if s.month >= c.start and s.month - c.start < c.months and s.month >= c.deploy_by - 4: n += c.accels
	return n

## Perf-weighted capacity: a Blackwell GPU counts for more than an A100.
func online_perf_accels() -> float:
	var n := 0.0
	for h in s.halls:
		var t := hall_throttle(h)
		for r in h.racks:
			if r.status == "online":
				var sy := Data.system(r.sys); n += sy.accels * perf_of(sy) * t
	return n

func pnl() -> Dictionary:
	var accels := online_accels()
	var perf := online_perf_accels()
	var avg_perf := perf / maxf(1.0, accels)
	var anchor := Data.gpu_hour(year())
	var contracted := 0.0; var contract_rev := 0.0; var penalties := 0.0
	var remaining := accels
	for c in s.contracts:
		if s.month - c.start >= c.months: continue
		if s.month < c.deploy_by - 4: continue
		var served := minf(remaining, c.accels)
		if served >= c.accels * 0.98 or s.month < c.deploy_by:
			pass
		remaining -= served; contracted += served
		contract_rev += served * c.price * avg_perf * HOURS
	var spot_util := clampf(1.2 - 0.95 * (s.spot / anchor), 0.12, 0.95)
	var spot_rev: float = remaining * s.spot * avg_perf * spot_util * HOURS
	var power := 0.0
	for h in s.halls: power += hall_heat(h) * pue_of(h) * HOURS * s.kwh
	var capex_total := 0.0
	for h in s.halls:
		for r in h.racks: capex_total += Data.system(r.sys).priceAtLaunch
	var staff: float = (s.staff + capex_total / 6e6) * 12000.0
	var support := capex_total * 0.03 / 12.0
	var interest: float = s.debt * 0.08 / 12.0
	var revenue: float = contract_rev + spot_rev
	var opex := power + staff + support + interest
	return {"revenue": revenue, "contract_rev": contract_rev, "spot_rev": spot_rev, "power": power, "staff": staff, "support": support,
		"interest": interest, "opex": opex, "net": revenue - opex, "accels": accels, "contracted": contracted, "spot_util": spot_util}

# ---------- the monthly tick ----------
func advance() -> void:
	if s.over != "" or not s.incident.is_empty(): return
	s.month += 1
	_deliveries()
	for h in s.halls:
		for r in h.racks:
			if r.status == "installing" and s.month >= r.ready: r.status = "commissioning"; r.ready = s.month + 1
			elif r.status == "commissioning" and s.month >= r.ready:
				r.status = "online"; say("good", "%s is ONLINE in %s." % [Data.system(r.sys).name, h.name])
			elif r.status == "failed" and s.month >= r.until: r.status = "online"; say("good", "A repaired rack in %s is back online." % h.name)
	_step_spot()
	var p := pnl()
	_contracts_step(p)
	s.cash += p.net
	if s.cash < 0:
		var loan := ceilf(-s.cash / 1e6) * 1e6
		s.debt += loan; s.cash += loan
		s.rep = maxf(0.0, s.rep - 1.0)
		say("bad", "Cash ran dry: emergency bank loan of %s at punitive rates." % money(loan))
	for h in s.halls:
		if hall_throttle(h) < 0.999: say("bad", "%s is throttling to %d%% — add cooling/power!" % [h.name, int(hall_throttle(h) * 100)])
	_failures()
	_offers_step()
	var nw := net_worth()
	s.peak_nw = maxf(s.peak_nw, nw)
	s.history.append({"month": s.month, "revenue": p.revenue, "opex": p.opex, "nw": nw, "cash": s.cash})
	_goals(nw)
	_incident_roll()

func _deliveries() -> void:
	var keep := []
	for o in s.orders:
		if s.month < o.arrive: keep.append(o); continue
		match o.kind:
			"system":
				s.crates[o.id] = s.crates.get(o.id, 0) + o.qty
				say("good", "Delivered: %d× %s — place them on the floor." % [o.qty, Data.system(o.id).name])
			"plant":
				var it := Data.item(o.id); var h: Dictionary = s.halls[o.hall]
				h.plant[o.id] = h.plant.get(o.id, 0) + 1
				if it.kind == "cooling": h.cool_kw += it.capacityKW
				else: h.it_kw += it.capacityKW
				say("good", "%s installed in %s (+%d kW %s)." % [it.name, h.name, it.capacityKW, "cooling" if it.kind == "cooling" else "power"])
			"hall":
				s.halls.append(make_hall(o.name, o.id, o.slots, 0.0, 0.0, {}))
				say("good", "%s is built. It has no power or cooling yet — buy plant for it." % o.name)
	s.orders = keep

func _step_spot() -> void:
	var anchor := Data.gpu_hour(year()) * 0.85
	var shock := (rng.next() - 0.5) * 0.22 + (0.35 if rng.next() < 0.03 else 0.0) - (0.3 if rng.next() < 0.03 else 0.0)
	s.spot = clampf(s.spot + (anchor - s.spot) * 0.2 + s.spot * shock, anchor * 0.4, anchor * 2.2)
	s.spot_hist.append(s.spot)
	if s.spot_hist.size() > 24: s.spot_hist.pop_front()
	s.kwh = snappedf(s.kwh + (0.07 - s.kwh) * 0.05, 0.0001)

func _contracts_step(p: Dictionary) -> void:
	var keep := []
	var remaining: float = p.accels
	for c in s.contracts:
		if s.month - c.start >= c.months:
			say("good", "%s contract completed. They loved you (+rep)." % c.customer); s.rep = minf(100.0, s.rep + 2.0); continue
		if s.month >= c.deploy_by:
			var served := minf(remaining, c.accels); remaining -= served
			if served < c.accels * 0.98:
				c.misses += 1
				var pen: float = c.accels * c.price * HOURS * 0.15
				s.cash -= pen; s.rep = maxf(0.0, s.rep - 2.0)
				say("bad", "SLA MISS for %s (%d/%d GPUs): penalty %s." % [c.customer, int(served), c.accels, money(pen)])
				if c.misses >= 3:
					say("bad", "%s terminated their contract." % c.customer); s.rep = maxf(0.0, s.rep - 4.0); continue
			else: c.served += 1
		elif s.month == c.deploy_by - 1:
			say("bad", "Heads up: %s expects %d GPUs live next month!" % [c.customer, c.accels])
		keep.append(c)
	s.contracts = keep

func _failures() -> void:
	for h in s.halls:
		for r in h.racks:
			if r.status != "online": continue
			var sy := Data.system(r.sys)
			var stress := 3.0 if hall_throttle(h) < 0.999 else 1.0
			if rng.next() < sy.accels / 8000.0 * stress:
				r.status = "failed"; s.fails += 1
				if s.spares > 0:
					s.spares -= 1; r.until = s.month + 1
					say("bad", "A GPU died in %s — swapped from your spares shelf (back in 1 month)." % h.name)
				else:
					r.until = s.month + 4
					say("bad", "A GPU died in %s and you have NO SPARES: 4-month RMA." % h.name)
				return

func _offers_step() -> void:
	s.offers = s.offers.filter(func(c): return s.month < c.expires)
	if s.offers.size() < 4 and rng.next() < 0.6: _gen_offers()

func _gen_offers() -> void:
	for i in range(rng.int_(1, 2)):
		var anchor := Data.gpu_hour(year())
		var scale := 1 + int(maxf(0.0, year() - 2020.9) * 0.9)
		var accels: int = int(16 * pow(2.0, rng.int_(0, mini(5, 1 + scale))))
		var archetype: String = rng.pick(["startup", "lab", "enterprise", "sovereign"])
		var premium := 1.0 + rng.range_(0.0, 0.3) + (0.12 if archetype == "sovereign" else 0.0)
		var names := {"startup": ["Nimbus AI", "Quokka Labs", "Parallax"], "lab": ["DeepFrame", "Orrery Research", "Transcend"], "enterprise": ["Meridian Bank", "OmniCorp", "Harbor Pharma"], "sovereign": ["Ministry of Compute", "NordCloud Gov", "Atlas Sovereign"]}
		s.offers.append({"id": "c%d-%d" % [s.month, i], "customer": rng.pick(names[archetype]), "archetype": archetype, "kind": rng.pick(["training", "inference"]),
			"accels": accels, "price": snappedf(anchor * premium * 0.95, 0.01), "months": int(rng.pick([12, 18, 24, 36])), "expires": s.month + 5})

# ---------- chapters (board objectives) ----------
func chapter() -> Dictionary: return CHAPTERS[mini(s.chapter, CHAPTERS.size() - 1)]
func chapter_target() -> float: return s.start_nw * chapter().mult

func _goals(nw: float) -> void:
	if s.over != "": return
	var c := chapter()
	if nw >= chapter_target():
		say("good", "★ BOARD OBJECTIVE MET: \"%s\"! Grant: %s." % [c.name, money(c.grant)])
		s.cash += c.grant; s.rep = minf(100.0, s.rep + 5.0)
		s.chapter_done.append(s.chapter)
		if s.chapter >= CHAPTERS.size() - 1: s.over = "won"; return
		s.chapter += 1
		say("info", "Next: \"%s\" — reach %s by %s." % [chapter().name, money(chapter_target()), date_of(chapter().deadline)])
	elif s.month >= c.deadline:
		s.rep -= 15.0
		say("bad", "BOARD REVIEW FAILED: missed \"%s\" (%s of %s). Reputation -15." % [c.name, money(nw), money(chapter_target())])
		if s.rep <= 0.0: s.over = "fired"; return
		s.chapter_done.append(-1)
		if s.chapter < CHAPTERS.size() - 1: s.chapter += 1
		else: s.over = "lost"
	if nw < -s.start_nw * 0.5 or s.rep <= 0.0: s.over = "bankrupt" if nw < 0 else "fired"

# ---------- decision incidents ----------
func _incident_roll() -> void:
	if s.over != "" or s.month < START_MONTH + 4: return
	var h: int = (s.seed * 2654435761 + s.month * 40503) & 0xFFFF
	if h / 65535.0 > 0.30: return
	var kinds := Incidents.eligible(self)
	if kinds.is_empty(): return
	var kind: String = kinds[h % kinds.size()]
	s.incident = {"kind": kind, "params": Incidents.make(self, kind, h)}

func resolve_incident(choice: int) -> String:
	if s.incident.is_empty(): return ""
	var msg := Incidents.apply(self, s.incident.kind, s.incident.params, choice)
	s.incident = {}
	return msg

static func money(v: float) -> String:
	var a := absf(v); var sign := "-" if v < 0 else ""
	if a >= 1e9: return "%s$%.2fB" % [sign, a / 1e9]
	if a >= 1e6: return "%s$%.1fM" % [sign, a / 1e6]
	if a >= 1e3: return "%s$%.0fk" % [sign, a / 1e3]
	return "%s$%.0f" % [sign, a]
