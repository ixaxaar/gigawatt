class_name NetworkScreen
extends Control
## Supercomputer builder: pick racks, wire the fabric, see what the machine can train/serve, build the cluster.
var app
var sel: Array = []
var f: Dictionary = {}
var cname := "Cluster A"
var msg := ""
var adv := false
var init_sel := false
const TECH := ["ib-ndr", "ib-xdr", "spectrum-x", "eth-400", "eth-800", "roce", "uec-eth"]
const TOPO := ["fat-tree-rail-optimized", "fat-tree", "single-domain", "dragonfly", "torus-ish"]

func _free_racks() -> Array:
	var out := []
	for h in app.b.g.halls:
		for r in h.racks:
			if r.status == "online" and not r.get("clusterId"): out.append(r)
	return out

## Pick a leaf/spine switch and cables that actually speak the chosen scale-out tech (fastest released part, then cheapest), so the default fabric is valid.
func _fit_fabric(fab: Dictionary) -> void:
	var tech := str(fab.scaleOutTech); var sw := []; var aoc := []; var optic := []
	for it in app.b.items.values():
		if it.kind == "switch" and it.role == "scale-out" and it.rackUnits > 0 and str(it.tech) == tech: sw.append(it)
		elif it.kind == "cable" and it.compatibleTech.has(tech):
			if it.cableType == "aoc": aoc.append(it)
			elif it.cableType == "optic-dr" or it.cableType == "optic": optic.append(it)
	var yr := float(app.b.year())
	var avail := func(a): return float(a.get("availableFrom", 2020)) <= yr + 0.01
	sw = sw.filter(avail) if sw.any(avail) else sw; aoc = aoc.filter(avail) if aoc.any(avail) else aoc; optic = optic.filter(avail) if optic.any(avail) else optic
	var cheap := func(a, c): return float(a.get("priceUSD", 0)) < float(c.get("priceUSD", 0))
	var fast := func(a, c): return float(a.get("gbps", 0)) > float(c.get("gbps", 0)) or (float(a.get("gbps", 0)) == float(c.get("gbps", 0)) and cheap.call(a, c))
	sw.sort_custom(func(a, c): return float(a.get("portGbps", 0)) > float(c.get("portGbps", 0)) or (float(a.get("portGbps", 0)) == float(c.get("portGbps", 0)) and cheap.call(a, c)))
	aoc.sort_custom(fast); optic.sort_custom(fast)
	if sw.size() > 0: fab["leafSwitchId"] = sw[0].id; fab["spineSwitchId"] = sw[0].id
	if aoc.size() > 0: fab["nodeToLeafCableId"] = aoc[0].id
	elif optic.size() > 0: fab["nodeToLeafCableId"] = optic[0].id
	if optic.size() > 0: fab["leafToSpineCableId"] = optic[0].id

func _default_fabric() -> Dictionary:
	var fab := {"id": "fab", "name": "Fabric", "scaleOutTech": "ib-ndr", "topology": "fat-tree-rail-optimized", "oversubscription": 1, "leafSwitchId": "", "spineSwitchId": "", "nodeToLeafCableId": "", "leafToSpineCableId": ""}
	_fit_fabric(fab); return fab

func refresh() -> void: Kit.rebuild_keep(self, _rebuild)

func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	var b: Bridge = app.b; var g: Dictionary = b.g
	if f.is_empty(): f = _default_fabric()
	var free := _free_racks()
	if not init_sel and free.size() > 0: sel = free.map(func(r): return r.id); init_sel = true
	sel = sel.filter(func(id): return free.any(func(r): return r.id == id))
	var md: Dictionary = b.q("models"); var tier: float = md.tier; var year := b.year()
	var stats = null
	if sel.size() > 0: stats = b.q("evaluateCluster", [{"id": "draft", "name": cname, "rackIds": sel, "fabric": f}])
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := HBoxContainer.new(); hd.add_theme_constant_override("separation", 12); root.add_child(hd)
	hd.add_child(Kit.label("SUPERCOMPUTER BUILDER", 26, Kit.CY)); hd.add_child(Kit.label("Group online racks into one machine, wire its network, and see what it can train or serve.", 13, Kit.DIM, true))
	var nh = app.b.q("netHealth")
	if nh is Dictionary and int(nh.level) > 0:
		var warn := PanelContainer.new(); warn.add_theme_stylebox_override("panel", Kit.card_sb(Kit.AM, Kit.tint(Kit.AM, 0.12), 2, 10)); root.add_child(warn)
		var wl := Kit.label("🔗 %s. Links flap and die every month at scale: optics most, DACs least. Keep spare cables and optics in the Warehouse and a down link is fixed next month instead of after a 3-month RMA." % nh.summary, 14, Kit.TX, true); warn.add_child(wl)
	var cols := HBoxContainer.new(); cols.size_flags_vertical = Control.SIZE_EXPAND_FILL; cols.add_theme_constant_override("separation", 12); root.add_child(cols)
	var c1 := Kit.column(cols, 380, false)
	c1.add_child(Kit.tip("A cluster is racks + a network. Scale-up (NVLink, purple boxes) links GPUs inside a rack at TB/s; scale-out (InfiniBand/Ethernet, green/gold) links racks. Training needs both; inference mostly needs memory and tokens/s."))
	var p1 := Kit.panel("1 · Pick racks", true, c1)
	if free.is_empty(): p1[1].add_child(Kit.label("No free online racks — deploy racks in Warehouse and wait for commissioning. (You can also serve a customer straight from racks in Customers.)", 12, Kit.DIM, true))
	else:
		var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 5); fl.add_theme_constant_override("v_separation", 5); p1[1].add_child(fl)
		for r in free:
			var dn := ""; for d in g.racks:
				if d.id == r.designId: dn = d.name
			fl.add_child(Kit.btn("%s · %s" % [dn.left(16), "RK-%04d" % int(r.get("serial", 0))], func(): sel = sel.filter(func(x): return x != r.id) if sel.has(r.id) else sel + [r.id]; refresh(), "pri" if sel.has(r.id) else "", 12))
		var br := HBoxContainer.new(); p1[1].add_child(br); br.add_child(Kit.btn("select all", func(): sel = free.map(func(r): return r.id); refresh(), "", 12)); br.add_child(Kit.btn("none", func(): sel = []; refresh(), "", 12))
	var p2 := Kit.panel("2 · Wire the network", true, c1)
	p2[1].add_child(Kit.btn("Auto-design for TRAINING", func(): _auto(tier), "go", 14)); p2[1].add_child(Kit.btn("Auto-design for INFERENCE (cheaper)", func(): _auto(0.0), "", 14))
	p2[1].add_child(Kit.label("Training customers expect ≥ %.1f GB/s per GPU in %d; auto-design finds the cheapest fabric that reaches it." % [tier, int(year)], 11, Kit.DIM, true))
	p2[1].add_child(Kit.btn(("▼" if adv else "▶") + " Advanced fabric", func(): adv = not adv; refresh(), "", 12))
	if adv:
		var sw := []; var cables := []
		for it in b.items.values():
			if it.kind == "switch" and it.role == "scale-out" and it.rackUnits > 0: sw.append([it.id, it.name])
			elif it.kind == "cable": cables.append([it.id, it.name])
		var gr := GridContainer.new(); gr.columns = 2; gr.add_theme_constant_override("h_separation", 8); gr.add_theme_constant_override("v_separation", 6); p2[1].add_child(gr)
		for row in [["Scale-out tech", Kit.option(TECH, f.scaleOutTech, func(v): f["scaleOutTech"] = v; _fit_fabric(f); refresh())], ["Topology", Kit.option(TOPO, f.topology, func(v): f["topology"] = v; refresh())], ["Leaf switch", Kit.option(sw, f.leafSwitchId, func(v): f["leafSwitchId"] = v; refresh())], ["Spine switch", Kit.option(sw, f.get("spineSwitchId", ""), func(v): f["spineSwitchId"] = v; refresh())], ["Node→leaf cable", Kit.option(cables, f.nodeToLeafCableId, func(v): f["nodeToLeafCableId"] = v; refresh())], ["Leaf→spine cable", Kit.option(cables, f.get("leafToSpineCableId", ""), func(v): f["leafToSpineCableId"] = v; refresh())]]:
			gr.add_child(Kit.label(row[0], 12, Kit.DIM)); gr.add_child(row[1])
		p2[1].add_child(Kit.label("Oversubscription %s:1" % f.oversubscription, 12, Kit.DIM))
		var sl := Kit.slider(f.oversubscription, 1, 4, 0.5, func(_v): pass); sl.drag_ended.connect(func(ch): if ch: f["oversubscription"] = sl.value; refresh()); p2[1].add_child(sl)
	if msg != "": p2[1].add_child(Kit.label(msg, 12, Kit.AM, true))
	var p3 := Kit.panel("Existing machines", false, c1)
	if g.clusters.is_empty(): p3[1].add_child(Kit.label("None yet", 13, Kit.DIM))
	for c in g.clusters:
		var custs := []
		for a in g.activeContracts:
			if a.clusterIds.has(c.id): custs.append(str(a.contract.customer))
		var cc0 := Kit.cluster_color(g, c.id)
		p3[1].add_child(Kit.rich("[color=#%s]■[/color] [b]%s[/b]  [color=#8fb0c8]%s · %d rack%s[/color]" % [cc0.to_html(false), c.name, c.fabric.scaleOutTech, c.rackIds.size(), "" if c.rackIds.size() == 1 else "s"], 13))
		p3[1].add_child(Kit.label(("serving: " + ", ".join(custs)) if custs.size() > 0 else "not serving any customer", 11, Kit.GR if custs.size() > 0 else Kit.DIM, true))
		if c.get("stats") != null: p3[1].add_child(Kit.label("%s accels · domain %d · %s PF %s · %.0f GB/s/GPU" % [Kit.num(c.stats.accelerators), int(c.stats.scaleUpDomain), Kit.num(c.stats.peakPFLOPSFp8 if c.stats.peakPFLOPSFp8 > 0 else c.stats.peakPFLOPSBf16), "fp8" if c.stats.peakPFLOPSFp8 > 0 else "bf16", c.stats.effScaleOutGBs], 11, Kit.DIM, true))
		var br := HFlowContainer.new(); br.add_theme_constant_override("h_separation", 6); p3[1].add_child(br)
		br.add_child(Kit.btn("Uncluster", func(): msg = b.act("disbandCluster", [c.id]).message; app.sfx("click"); refresh(), "danger", 12))
		br.add_child(Kit.btn("Re-cluster (edit racks)", func():
			var ids: Array = c.rackIds.duplicate(); var nm: String = c.name; var fab: Dictionary = c.fabric.duplicate(true)
			var r: Dictionary = b.act("disbandCluster", [c.id])
			if r.ok: sel = ids; cname = nm; f = fab; init_sel = true; msg = "Cluster dissolved — adjust the rack selection and rebuild it."
			else: msg = r.message
			refresh(), "", 12))
		p3[1].add_child(Kit.hsep())
	# center: topology + stat strip
	var cc := VBoxContainer.new(); cc.size_flags_horizontal = Control.SIZE_EXPAND_FILL; cc.add_theme_constant_override("separation", 10); cols.add_child(cc)
	var tp := Kit.panel("Topology", true, cc); tp[0].size_flags_vertical = Control.SIZE_EXPAND_FILL
	var tv := TopoView.new(); tv.size_flags_vertical = Control.SIZE_EXPAND_FILL; tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL; tv.f = f; tv.stats = stats
	var rinfo := []
	for id in sel:
		var st: Dictionary = b.q("evaluateCluster", [{"id": "r", "name": "r", "rackIds": [id], "fabric": f}]); rinfo.append({"id": id, "label": id, "accels": st.accelerators, "domain": st.scaleUpDomain})
	tv.racks = rinfo
	if stats != null:
		var a: Dictionary = b.item(stats.acceleratorId); tv.vendor_col = Kit.vendor_color(a.get("vendor", "generic"))
	tp[1].add_child(tv); tv.size_flags_vertical = Control.SIZE_EXPAND_FILL
	if stats != null:
		var cap := 0.0
		for id in stats.switchCounts: cap += b.item(id).get("priceUSD", 0.0) * stats.switchCounts[id]
		for id in stats.cableCounts: cap += b.item(id).get("priceUSD", 0.0) * stats.cableCounts[id]
		var sp := Kit.panel("", false, cc)
		sp[1].add_child(Kit.stats([["Accelerators", Kit.num(stats.accelerators)], ["Scale-up domain", str(int(stats.scaleUpDomain))], ["FP8 compute", "%s PF" % Kit.num(stats.peakPFLOPSFp8, 1)], ["Memory", "%s TB" % Kit.num(stats.totalMemGB / 1000.0, 1)], ["Power", "%s kW" % Kit.num(stats.powerKW)], ["Scale-out / GPU", "%.1f GB/s" % stats.effScaleOutGBs, Kit.GR if stats.effScaleOutGBs >= tier else Kit.AM], ["Bisection", "%s Tb/s" % Kit.num(stats.bisectionTbps)], ["Network capex", Kit.usd(cap)]], 4))
	# right: what can it do + checks
	var c3 := Kit.column(cols, 420, false)
	var wp := Kit.panel("3 · What can this machine do?", true, c3)
	if stats == null: wp[1].add_child(Kit.label("Select racks to see which models it can train and serve.", 13, Kit.DIM, true))
	else:
		var ms: Array = md.all.filter(func(m): return m.era <= year + 0.01); ms = ms.slice(maxi(0, ms.size() - 6))
		var rows := []
		for m in ms:
			var perf: Dictionary = b.q("clusterPerf", [{"id": "draft", "name": cname, "rackIds": sel, "fabric": f}, m.id])
			var t = perf.train; var inf = perf.infer
			var nm := VBoxContainer.new(); nm.add_child(Kit.label(m.name, 13)); nm.add_child(Kit.label("%sB%s" % [Kit.num(m.paramsB, 1), (" (%sB active)" % Kit.num(m.activeParamsB, 1)) if m.activeParamsB != m.paramsB else ""], 10, Kit.DIM))
			var tc := VBoxContainer.new()
			if t != null and t.fitsTrainingState and t.tokensPerSec > 0: tc.add_child(Kit.label("✓ %sk tok/s" % Kit.num(t.tokensPerSec / 1000.0), 12, Kit.GR)); tc.add_child(Kit.label("MFU %d%%" % int(round(t.mfu * 100.0)), 10, Kit.DIM))
			else: tc.add_child(Kit.label("✗ state doesn't fit", 12, Kit.RD))
			var ic := VBoxContainer.new()
			if inf != null and inf.fitsWeights: ic.add_child(Kit.label("✓ %sk tok/s" % Kit.num(inf.tokensPerSec / 1000.0, 1), 12, Kit.GR)); ic.add_child(Kit.label("TTFT %d ms · TP%d" % [int(round(inf.ttftMs)), int(inf.tpSize)], 10, Kit.DIM))
			else: ic.add_child(Kit.label("✗ weights don't fit", 12, Kit.RD))
			rows.append([nm, tc, ic])
		wp[1].add_child(Kit.table(["Model", "Train", "Serve"], rows))
	var ck := Kit.panel("Checks", false, c3)
	if stats == null: ck[1].add_child(Kit.label("—", 13, Kit.DIM))
	else: Kit.issues(ck[1], stats.issues)
	var br2 := HBoxContainer.new(); br2.add_theme_constant_override("separation", 8); ck[1].add_child(br2)
	var le := LineEdit.new(); le.text = cname; le.size_flags_horizontal = Control.SIZE_EXPAND_FILL; le.text_changed.connect(func(t): cname = t); br2.add_child(le)
	var go := Kit.btn("BUILD CLUSTER", func(): var r := b.act("createCluster", [cname, sel, f]); msg = r.message; if r.ok: sel = []; app.sfx("buy"); refresh(), "go", 14); go.disabled = stats == null; br2.add_child(go)

func _auto(target: float) -> void:
	if sel.is_empty(): msg = "Select racks first."; refresh(); return
	var r = app.b.q("autoFabric", [sel, target])
	if r == null: msg = "No valid fabric for these racks."
	else: f = r.fabric; msg = "Designed: %s" % r.note
	refresh()
