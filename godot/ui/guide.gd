class_name GuideOverlay
extends Control
## "How to play" — the loop, with the current step highlighted from live game state.
var app

## The long-form curriculum: seven chapters, each a set of cash-rewarded goals plus the concepts behind them.
const CHAPTERS := [
	{"n": "1 · Run the loop", "why": "Order, install, serve a customer, get paid. Everything else builds on this.", "missions": ["order", "place", "online", "contract", "rev"], "concepts": []},
	{"n": "2 · Power and cooling", "why": "Watts in, heat out. These two limits decide how dense and how big you can go.", "missions": ["cool", "liquid", "mw100"], "concepts": ["power", "cooling", "chiller", "liquid", "rdhx", "pue"]},
	{"n": "3 · Silicon and racks", "why": "Memory bandwidth, power per rack and the size of the NVLink domain decide what a GPU is worth.", "missions": ["tray", "rack", "nvl"], "concepts": ["hbm", "psu", "scaleup"]},
	{"n": "4 · The network is the computer", "why": "Fabrics and uplinks: oversubscription and redundancy decide how well jobs scale.", "missions": ["cluster", "xl", "carriers2"], "concepts": ["scaleup", "oversub", "internet"]},
	{"n": "5 · Customers and SLAs", "why": "Match hardware to workload, keep availability high; repeat customers compound.", "missions": ["contracts5", "contracts15"], "concepts": ["spares", "ups"]},
	{"n": "6 · Money and energy", "why": "PPAs, the spot market, depreciation and debt: profit is utilisation times cheap power.", "missions": ["ppa", "nw100", "nw500", "sellrack"], "concepts": ["ppa", "spot"]},
	{"n": "7 · Resilience and scale", "why": "N+1 protection, a second hall, staffing, thousands of GPUs: operations become the product.", "missions": ["nplus1", "hall2", "staffed", "kacc", "accels5k", "accels20k", "nw1b"], "concepts": ["ups", "spares"]},
]

func _path(v: Control, g: Dictionary) -> void:
	var ms: Array = app.b.q("missions"); var cs: Array = app.b.q("concepts")
	KeynoteOverlay.tag(v, "LEARNING PATH", Kit.AM)
	v.add_child(Kit.label("Seven chapters from running the loop to running a hyperscaler. Each goal pays cash. Concept chips explain the engineering and tell you whether you need it right now.", 13, Kit.DIM, true))
	var first_open := true
	for ch in CHAPTERS:
		var list: Array = ch.missions.map(func(id): return ms.filter(func(m): return m.id == id)[0])
		var done := list.filter(func(m): return m.done or g.missionsDone.has(m.id)).size()
		var nxt = null
		for m in list:
			if not (m.done or g.missionsDone.has(m.id)): nxt = m; break
		var current: bool = first_open and nxt != null
		if nxt != null: first_open = false
		var card := PanelContainer.new(); card.add_theme_stylebox_override("panel", Kit.card_sb(Kit.AM if current else (Kit.GR if nxt == null else Kit.PANEL_EDGE), Kit.PANEL_FILL, 2, 12)); v.add_child(card)
		var cv := VBoxContainer.new(); cv.add_theme_constant_override("separation", 5); card.add_child(cv)
		var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 10); cv.add_child(h)
		h.add_child(Kit.label(("✓ " if nxt == null else "") + ch.n, 16, Kit.GR if nxt == null else Kit.TX)); var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; h.add_child(sp)
		h.add_child(Kit.label("%d / %d goals" % [done, list.size()], 13, Kit.DIM)); cv.add_child(Kit.bar(done, list.size()))
		cv.add_child(Kit.label(ch.why, 13, Kit.DIM, true))
		if nxt != null:
			var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 8); cv.add_child(r)
			var t := Kit.label("Next: %s. %s  (+%s)" % [nxt.title, nxt.hint, Kit.usd(nxt.reward)], 13, Kit.TX, true); t.size_flags_horizontal = Control.SIZE_EXPAND_FILL; r.add_child(t)
			r.add_child(Kit.btn("Go →", func(): visible = false; app.go(nxt.go), "go" if current else "", 13))
		if ch.concepts.size() > 0:
			var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 6); cv.add_child(fl)
			for cid in ch.concepts:
				var c: Dictionary = cs.filter(func(x): return x.id == cid)[0]
				fl.add_child(Kit.btn("%s %s" % [c.icon, str(c.name).split(" (")[0]], func(): ConceptsView.open_id = cid; CodexScreen.next_view = "concepts"; visible = false; app.show_screen("codex"), "", 12))
	var rm := Kit.btn("New hardware: keynotes and the Roadmap →", func(): visible = false; ProcureScreen.next_tab = "road"; app.go("shop"), "", 14); v.add_child(rm)

func open() -> void:
	for c in get_children(): c.queue_free()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter = Control.MOUSE_FILTER_STOP
	var g: Dictionary = app.b.g
	var placed := []; for h in g.halls: placed.append_array(h.racks)
	var has_accel: bool = g.inventory.size() > 0 or g.orders.size() > 0 or placed.size() > 0
	var any_online := placed.any(func(p): return p.status == "online")
	var steps := [
		["Find a customer", "Open Customers. Every offer says what it needs and whether your current capacity can serve it. Green = ready now. Amber/red = open “What you need to buy” — it lists concrete builds (cheapest, fastest, best payback) with a tick-list of which customer requirements each one meets. Press EASY PATH and the game signs, orders, installs plant, deploys, builds the fabric and assigns — you just press Next Month.", g.activeContracts.size() > 0, "contracts", "Customers"],
		["Sign — or order first", "You can SIGN NOW and deploy later: you get a ramp window (months) to bring capacity online, no revenue and no SLA clock until then, and the customer walks if you miss it. Safe rule: only sign if the build’s “ready” date is inside the window.", g.activeContracts.size() > 0, "contracts", "Customers"],
		["Order the hardware", "Click ORDER in the plan, or use Procure ▸ guided planner. Parts take months to arrive (GPUs longest). OEM/turnkey racks cost more but arrive faster and come pre-validated.", has_accel, "shop", "Procure"],
		["Prepare the hall", "Racks need power, cooling and floor space BEFORE they go in. Build ▸ buy transformers/UPS (power) and CRAH/CDU/RDHx (cooling) and install them. Liquid racks (≥ 40 kW) need a liquid-cooled hall.", g.halls.any(func(h): return h.coolingKW > 600 or h.racks.size() > 0), "facility", "Build"],
		["Deploy racks", "When parts arrive they sit in the Warehouse. Warehouse ▸ pick the rack design ▸ DEPLOY. Missing parts? “Order all missing” buys exactly what is short.", placed.size() > 0, "stock", "Warehouse"],
		["Wait for commissioning", "Press NEXT MONTH (or Space). Racks spend ~2 months installing and burn-in; a few fail and need repair.", any_online, "dash", "Datacenter"],
		["Join racks into a cluster", "Supercomputer ▸ select online racks and a fabric (InfiniBand / Ethernet). Training contracts need one coherent cluster big enough for the model; inference needs enough tokens/s.", g.clusters.size() > 0, "network", "Supercomputer"],
		["Assign it and earn", "Customers ▸ ASSIGN & GO LIVE. Revenue starts the next month. Watch SLA availability — failures cost money.", g.activeContracts.any(func(a): return a.clusterIds.size() > 0), "contracts", "Customers"],
		["Optimise", "Energy: sign PPAs (cheaper power, take-or-pay) and sell idle GPUs on the spot market. Go liquid-cooled, add halls, take loans carefully, keep reputation up for bigger customers.", g.get("powerContracts", []).size() > 0, "energy", "Energy"]]
	var now := -1
	for i in steps.size():
		if not steps[i][2]: now = i; break
	var dim := ColorRect.new(); dim.color = Color(0, 0, 0, 0.7); dim.set_anchors_preset(Control.PRESET_FULL_RECT); add_child(dim)
	var pc := PanelContainer.new(); pc.set_anchors_preset(Control.PRESET_FULL_RECT); pc.offset_left = 120; pc.offset_right = -120; pc.offset_top = 50; pc.offset_bottom = -50; pc.add_theme_stylebox_override("panel", Kit.sb(Kit.BG, Kit.CY, 14, 2, 20)); add_child(pc)
	var sc := ScrollContainer.new(); sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; pc.add_child(sc)
	var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 10); sc.add_child(v)
	var hd := HBoxContainer.new(); v.add_child(hd); hd.add_child(Kit.label("HOW TO PLAY GIGAWATT", 28, Kit.CY)); var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; hd.add_child(sp); hd.add_child(Kit.btn("Close", func(): visible = false, "", 15))
	v.add_child(Kit.label("You run an AI datacenter. Customers pay for GPU time (training) or tokens/s (inference). Everything below is the loop — the highlighted step is where you are now.", 14, Kit.DIM, true))
	_path(v, g)
	var two := HBoxContainer.new(); two.add_theme_constant_override("separation", 10); v.add_child(two)
	for m in [["Contract-first (safe)", "Pick an offer → open “What you need to buy” → order that build → sign (or sign first if the ramp window is longer than the build time). You never own idle hardware, but you only win offers you can build in time. Good for the first 1–2 years."], ["Build-first (speculative)", "Order and deploy capacity ahead of demand, make a cluster, and meanwhile sell idle GPUs on the spot market (Energy ▸ spot). When a good contract appears you can serve it immediately. Higher capex and risk, higher payoff once reputation grows."]]:
		var pn := Kit.panel(m[0], false, two); pn[1].add_child(Kit.label(m[1], 13, Kit.DIM, true))
	for i in steps.size():
		var s: Array = steps[i]; var done: bool = s[2]
		var card := PanelContainer.new(); card.add_theme_stylebox_override("panel", Kit.sb(Color(0.05, 0.14, 0.1) if done else (Color(0.08, 0.2, 0.3) if i == now else Kit.PANEL), Kit.GR if done else (Kit.CY if i == now else Kit.LINE), 8, 1, 10)); v.add_child(card)
		var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 12); card.add_child(h)
		h.add_child(Kit.label("✓" if done else str(i + 1), 22, Kit.GR if done else Kit.CY))
		var tv := VBoxContainer.new(); tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL; h.add_child(tv); tv.add_child(Kit.label(s[0], 16)); tv.add_child(Kit.label(s[1], 13, Kit.DIM, true))
		h.add_child(Kit.btn("%s →" % s[4], func(): visible = false; app.go(s[3]), "go" if i == now else "", 14))
	v.add_child(Kit.label("Timing cheat-sheet: GPU lead 3–9 months · install + burn-in 2 months · cluster + assign 1 month. A first contract with a 4-month ramp is only reachable if you already own parts or buy fast OEM racks.", 12, Kit.DIM, true))
