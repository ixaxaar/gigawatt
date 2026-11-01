class_name GuideOverlay
extends Control
## "How to play" — the loop, with the current step highlighted from live game state.
var app

func open() -> void:
	for c in get_children(): c.queue_free()
	set_anchors_preset(Control.PRESET_FULL_RECT); mouse_filter = Control.MOUSE_FILTER_STOP
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
