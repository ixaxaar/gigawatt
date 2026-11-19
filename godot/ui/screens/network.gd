class_name NetworkScreen
extends Control
## Supercomputer builder: pick racks, wire the fabric, see what the machine can train/serve, build the cluster.
var app
var sel: Array = []
var f: Dictionary = {}
var cname := "Cluster A"
var msg := ""
var adv := false
var _folds := {}
func _tap(c: Control) -> Control:
	if Layout.phone: c.custom_minimum_size.y = maxf(c.custom_minimum_size.y, Layout.tap())
	return c
## Side by side on desktop, stacked on phone.
func _pair() -> BoxContainer:
	var r: BoxContainer = VBoxContainer.new() if Layout.phone else HBoxContainer.new(); r.add_theme_constant_override("separation", 10 if Layout.phone else 8); return r
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

const BK := preload("res://ui/build_keep.gd")
func refresh() -> void: BK.refresh(self, app, _rebuild)

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
	var hd := Kit.head_row(12); root.add_child(hd)
	hd.add_child(Kit.label("SUPERCOMPUTER BUILDER", 26, Kit.CY)); if not Layout.phone: hd.add_child(Kit.label("Group online racks into one machine, wire its network, and see what it can train or serve.", 13, Kit.DIM, true))
	Kit.hint_fix(hd, app)
	var nh = app.b.q("netHealth")
	if nh is Dictionary and int(nh.level) > 0:
		var warn := PanelContainer.new(); warn.add_theme_stylebox_override("panel", Kit.card_sb(Kit.AM, Kit.tint(Kit.AM, 0.12), 2, 10)); root.add_child(warn)
		var wl := Kit.label(("🔗 %s. Links flap and die every month at scale: optics most, DACs least. Keep spare cables and optics in the Warehouse and a down link is fixed next month instead of after a 3-month RMA." if not Layout.phone else "🔗 %s. Keep spare cables in the Warehouse.") % nh.summary, 14, Kit.TX, true); warn.add_child(wl)
	# Compact / touch: ONE page that scrolls (never three side-scrolling cards that each scroll on their own). Two columns when
	# there is room, one when there is not; the topology sits first in the right column and scales to its width.
	var paged := Layout.compact or Layout.touch
	var avail: float = app.vw() - (app.RAIL_W + 14.0 if Layout.phone else 28.0) - 40.0
	var c1: VBoxContainer; var cc: VBoxContainer; var c3: VBoxContainer
	if paged:
		var page: VBoxContainer = root
		if not Kit._wrapped(self):
			var ps := ScrollContainer.new(); ps.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; ps.size_flags_vertical = Control.SIZE_EXPAND_FILL; root.add_child(ps)
			page = VBoxContainer.new(); page.size_flags_horizontal = Control.SIZE_EXPAND_FILL; page.add_theme_constant_override("separation", 10); ps.add_child(page)
		var mk := func(parent: Control) -> VBoxContainer:
			var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 10); v.custom_minimum_size.x = 0; parent.add_child(v); return v
		if avail >= 900.0:
			var row := HBoxContainer.new(); row.add_theme_constant_override("separation", 12); page.add_child(row)
			c1 = mk.call(row); cc = mk.call(row); c3 = cc
		else: c1 = mk.call(page); cc = c1; c3 = c1
		var pad := Control.new(); pad.custom_minimum_size.y = 40.0; page.add_child(pad)   # the end of the page clears the rounded corners / dock
	else:
		var cols := Kit.cols_row(); root.add_child(cols)
		c1 = Kit.column(cols, 380, false, false, true)
		cc = VBoxContainer.new(); cc.size_flags_horizontal = Control.SIZE_EXPAND_FILL; cc.add_theme_constant_override("separation", 10); cols.add_child(cc)
		c3 = Kit.column(cols, 420, false, false, true)
	if not Layout.phone: c1.add_child(Kit.tip("A cluster is racks + a network. Scale-up (NVLink, purple boxes) links GPUs inside a rack at TB/s; scale-out (InfiniBand/Ethernet, green/gold) links racks. Training needs both; inference mostly needs memory and tokens/s."))
	if Layout.phone:
		if str(g.get("mode", "operator")) == "learner":
			var tf: Array = Kit.fold_panel("Plain-English terms", "terms", _folds, refresh, false, c1, true); tf[1].add_child(Kit.label(Kit.TERMS, 13, Kit.TX, true))
	else: c1.add_child(Kit.terms_tip(app))
	var p1 := Kit.panel("1 · Pick racks", true, c1)
	if free.is_empty(): p1[1].add_child(Kit.label("No free online racks — deploy racks in Warehouse and wait for commissioning." + ("" if Layout.phone else " (You can also serve a customer straight from racks in Customers.)"), 12, Kit.DIM, true))
	else:
		var fl := HFlowContainer.new(); fl.add_theme_constant_override("h_separation", 10 if Layout.phone else 5); fl.add_theme_constant_override("v_separation", 10 if Layout.phone else 5); p1[1].add_child(fl)
		for r in free:
			var dn := ""; for d in g.racks:
				if d.id == r.designId: dn = d.name
			fl.add_child(Kit.btn("%s · %s" % [BK.ell(dn, 18), "RK-%04d" % int(r.get("serial", 0))], func(): sel = sel.filter(func(x): return x != r.id) if sel.has(r.id) else sel + [r.id]; refresh(), "pri" if sel.has(r.id) else "", 12))
		var br := HBoxContainer.new(); br.add_theme_constant_override("separation", 10); p1[1].add_child(br); br.add_child(Kit.btn("select all", func(): sel = free.map(func(r): return r.id); refresh(), "", 12)); br.add_child(Kit.btn("none", func(): sel = []; refresh(), "", 12))
	var p2 := Kit.panel("2 · Wire the network", true, c1)
	p2[1].add_child(Kit.btn("Auto-design for TRAINING", func(): _auto(tier), "go", 14)); p2[1].add_child(Kit.btn("Auto-design for INFERENCE (cheaper)", func(): _auto(0.0), "", 14))
	if not Layout.phone: p2[1].add_child(Kit.label("Training customers expect ≥ %.1f GB/s per GPU in %d; auto-design finds the cheapest fabric that reaches it." % [tier, int(year)], 11, Kit.DIM, true))
	p2[1].add_child(Kit.btn(("▼" if adv else "▶") + " Advanced fabric", func(): adv = not adv; refresh(), "", 12))
	if adv:
		var sw := []; var cables := []
		for it in b.items.values():
			if it.kind == "switch" and it.role == "scale-out" and it.rackUnits > 0: sw.append([it.id, it.name])
			elif it.kind == "cable": cables.append([it.id, it.name])
		var gr := GridContainer.new(); gr.columns = 1 if Layout.phone else 2; gr.add_theme_constant_override("h_separation", 8); gr.add_theme_constant_override("v_separation", 6); p2[1].add_child(gr)
		for row in [["Scale-out tech", Kit.option(TECH, f.scaleOutTech, func(v): f["scaleOutTech"] = v; _fit_fabric(f); refresh())], ["Topology", Kit.option(TOPO, f.topology, func(v): f["topology"] = v; refresh())], ["Leaf switch", Kit.option(sw, f.leafSwitchId, func(v): f["leafSwitchId"] = v; refresh())], ["Spine switch", Kit.option(sw, f.get("spineSwitchId", ""), func(v): f["spineSwitchId"] = v; refresh())], ["Node→leaf cable", Kit.option(cables, f.nodeToLeafCableId, func(v): f["nodeToLeafCableId"] = v; refresh())], ["Leaf→spine cable", Kit.option(cables, f.get("leafToSpineCableId", ""), func(v): f["leafToSpineCableId"] = v; refresh())]]:
			gr.add_child(Kit.label(row[0], 12, Kit.DIM)); gr.add_child(_tap(BK.slim(row[1], 160.0)))
		p2[1].add_child(Kit.label("Oversubscription %s:1" % f.oversubscription, 12, Kit.DIM))
		var sl := Kit.slider(f.oversubscription, 1, 4, 0.5, func(_v): pass); Kit.on_set(sl, func(v): f["oversubscription"] = v; refresh()); p2[1].add_child(_tap(sl))
	if msg != "": p2[1].add_child(Kit.label(msg, 12, Kit.AM, true))
	if not paged: _machines(c1, g, b)
	# center: topology + stat strip
	var tp := Kit.panel("Topology", true, cc)
	if sel.is_empty():   # a proper empty state instead of a big frame with one stray LEAF box
		tp[1].add_child(Kit.label(("No cluster yet: pick online racks in “1 · Pick racks” and press BUILD CLUSTER." if g.clusters.is_empty() else "No racks selected: pick online racks in “1 · Pick racks” to design the next machine.") if not free.is_empty() else "No free online racks. Deploy racks from the Warehouse; once they are commissioned, group them here.", 13, Kit.DIM, true))
	else:
		if not paged: tp[0].size_flags_vertical = Control.SIZE_EXPAND_FILL
		var tv := TopoView.new(); tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL; tv.f = f; tv.stats = stats; tv.fit_width = paged
		if not paged: tv.size_flags_vertical = Control.SIZE_EXPAND_FILL
		var rinfo := []
		for id in sel:
			var st: Dictionary = b.q("evaluateCluster", [{"id": "r", "name": "r", "rackIds": [id], "fabric": f}]); rinfo.append({"id": id, "label": id, "accels": st.accelerators, "domain": st.scaleUpDomain})
		tv.racks = rinfo
		if stats != null:
			var a: Dictionary = b.item(stats.acceleratorId); tv.vendor_col = Kit.vendor_color(a.get("vendor", "generic"))
		if paged and avail < 380.0:   # too narrow to read: keep a readable size and pan sideways inside the frame
			var hs := ScrollContainer.new(); hs.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; hs.size_flags_horizontal = Control.SIZE_EXPAND_FILL; tp[1].add_child(hs)
			tv.custom_minimum_size.x = 380.0; hs.add_child(tv)
		else: tp[1].add_child(tv)
	if stats != null:
		var cap := 0.0
		for id in stats.switchCounts: cap += b.item(id).get("priceUSD", 0.0) * stats.switchCounts[id]
		for id in stats.cableCounts: cap += b.item(id).get("priceUSD", 0.0) * stats.cableCounts[id]
		var sp := Kit.panel("", false, cc)
		sp[1].add_child(Kit.stats([["Accelerators", Kit.num(stats.accelerators)], ["Scale-up domain", str(int(stats.scaleUpDomain))], ["FP8 compute", "%s PF" % Kit.num(stats.peakPFLOPSFp8, 1)], ["Memory", "%s TB" % Kit.num(stats.totalMemGB / 1000.0, 1)], ["Power", "%s kW" % Kit.num(stats.powerKW)], ["Scale-out / GPU", "%.1f GB/s" % stats.effScaleOutGBs, Kit.GR if stats.effScaleOutGBs >= tier else Kit.AM], ["Bisection", "%s Tb/s" % Kit.num(stats.bisectionTbps)], ["Network capex", Kit.usd(cap)]], 4))
	# right: what can it do + checks
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
			if t != null and t.fitsTrainingState and t.tokensPerSec > 0: tc.add_child(Kit.label("✓ %sk tok/s" % Kit.num(t.tokensPerSec / 1000.0), 12, Kit.GR)); if not Layout.phone: tc.add_child(Kit.label("MFU %d%%" % int(round(t.mfu * 100.0)), 10, Kit.DIM))
			else: tc.add_child(Kit.label("✗ state doesn't fit", 12, Kit.RD))
			var ic := VBoxContainer.new()
			if inf != null and inf.fitsWeights: ic.add_child(Kit.label("✓ %sk tok/s" % Kit.num(inf.tokensPerSec / 1000.0, 1), 12, Kit.GR)); if not Layout.phone: ic.add_child(Kit.label("TTFT %d ms · TP%d" % [int(round(inf.ttftMs)), int(inf.tpSize)], 10, Kit.DIM))
			else: ic.add_child(Kit.label("✗ weights don't fit", 12, Kit.RD))
			rows.append([nm, tc, ic])
		wp[1].add_child(Kit.table(["Model", "Train", "Serve"], rows))
	var ck := Kit.panel("Checks", false, c3)
	if stats == null: ck[1].add_child(Kit.label("—", 13, Kit.DIM))
	else: Kit.issues(ck[1], stats.issues)
	var br2 := _pair(); ck[1].add_child(br2)
	var le := LineEdit.new(); _tap(le); le.text = cname; le.set_meta("key", "cname"); le.placeholder_text = "Cluster name"; le.custom_minimum_size.x = 120; le.size_flags_horizontal = Control.SIZE_EXPAND_FILL; le.text_changed.connect(func(t): cname = t); br2.add_child(le)
	var go := Kit.btn("BUILD CLUSTER", func(): var r := b.act("createCluster", [cname, sel, f]); msg = r.message; if r.ok: sel = []; app.sfx("buy"); refresh(), "go", 14); go.disabled = stats == null; br2.add_child(go)
	if paged: _machines(c3, g, b)

func _machines(parent: Control, g: Dictionary, b: Bridge) -> void:
	var p3 := Kit.panel("Existing machines", false, parent)
	if g.clusters.is_empty(): p3[1].add_child(Kit.label("No cluster yet. Pick online racks, wire the network and press BUILD CLUSTER.", 13, Kit.DIM, true))
	for c in g.clusters:
		var custs := []
		for a in g.activeContracts:
			if a.clusterIds.has(c.id) and not custs.has(str(a.contract.customer)): custs.append(str(a.contract.customer))   # each customer once
		var cc0 := Kit.cluster_color(g, c.id)
		p3[1].add_child(Kit.rich("[color=#%s]■[/color] [b]%s[/b]  [color=#%s]%s · %d rack%s[/color]" % [cc0.to_html(false), str(c.name).replace("[", "("), Kit.DIM.to_html(false), c.fabric.scaleOutTech, c.rackIds.size(), "" if c.rackIds.size() == 1 else "s"], 13))
		p3[1].add_child(Kit.label(("serving: " + ", ".join(custs)) if custs.size() > 0 else "not serving any customer", 11, Kit.GR if custs.size() > 0 else Kit.DIM, true))
		if c.get("stats") != null and not Layout.phone: p3[1].add_child(Kit.label("%s accels · domain %d · %s PF %s · %.0f GB/s/GPU" % [Kit.num(c.stats.accelerators), int(c.stats.scaleUpDomain), Kit.num(c.stats.peakPFLOPSFp8 if c.stats.peakPFLOPSFp8 > 0 else c.stats.peakPFLOPSBf16), "fp8" if c.stats.peakPFLOPSFp8 > 0 else "bf16", c.stats.effScaleOutGBs], 11, Kit.DIM, true))
		# Re-cluster is the everyday action; Uncluster is small, set apart at the far end, and both ask first (customers lose service).
		var br := HBoxContainer.new(); br.add_theme_constant_override("separation", 8); p3[1].add_child(br)
		var warn := " Customers it serves lose service until it is rebuilt." if custs.size() > 0 else ""
		var rec := Kit.btn("Re-cluster (edit racks)" if not Layout.phone else "Re-cluster", func():
			Kit.confirm(self, "Dissolve %s to edit its racks?%s" % [BK.ell(c.name, 40), warn], func():
				var ids: Array = c.rackIds.duplicate(); var nm: String = c.name; var fab: Dictionary = c.fabric.duplicate(true)
				var r: Dictionary = b.act("disbandCluster", [c.id])
				if r.ok: sel = ids; cname = nm; f = fab; init_sel = true; msg = "Cluster dissolved — adjust the rack selection and rebuild it."
				else: msg = r.message
				refresh(), "Dissolve"), "", 12)
		br.add_child(rec)
		var gap := Control.new(); gap.size_flags_horizontal = Control.SIZE_EXPAND_FILL; gap.custom_minimum_size.x = 24; br.add_child(gap)
		var unc := Kit.btn("Uncluster", func(): Kit.confirm(self, "Uncluster %s? Its racks go back to the free pool.%s" % [BK.ell(c.name, 40), warn], func(): msg = b.act("disbandCluster", [c.id]).message; app.sfx("click"); refresh(), "Uncluster"), "danger", 11)
		unc.custom_minimum_size = Vector2(0, maxf(32.0, Layout.tap() * 0.8)); unc.size_flags_vertical = Control.SIZE_SHRINK_CENTER; br.add_child(unc)
		p3[1].add_child(Kit.hsep())

func _auto(target: float) -> void:
	if sel.is_empty(): msg = "Select racks first."; refresh(); return
	var r = app.b.q("autoFabric", [sel, target])
	if r == null: msg = "No valid fabric for these racks."
	else: f = r.fabric; msg = "Designed: %s" % r.note
	refresh()
