class_name DesignScreen
extends Control
## Design Lab: tray bench (motherboard) and rack bench (42U elevation), with live engine validation.
var app
var tab := "tray"
# tray lab
var cid := ""
var sock := {}
var sel_kind := ""
var sel_idx := -1
var tname := "My Tray"
var tmsg := ""
# rack lab
var rid := ""
var ritems: Array = []
var cool := "air"
var rname := "My Rack"
var rmsg := ""
var rtab := "switch"
var armed := {}
var sel_u := -1
var sel_dev := -1
const ZONE := {"accelerator": "ACCELERATOR", "cpu": "CPU", "dimm": "DIMM", "nic": "PCIe NIC", "dpu": "PCIe DPU", "nvme": "NVMe BAY", "psu": "PSU BAY", "coldplate": "COLD PLATE", "switchchip": "SWITCH CHIP", "fan": "FAN"}
const RC := {"tray": Color("#76b900"), "switch": Color("#4fd1ff"), "storage": Color("#c792ea"), "power": Color("#ffb020")}

var _gwfilled := false
func refresh() -> void: Kit.rebuild_keep(self, _rebuild)

func _rebuild() -> void:
	for c in get_children(): c.queue_free()
	var root := VBoxContainer.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.add_theme_constant_override("separation", 10); add_child(root)
	var hd := HBoxContainer.new(); hd.add_theme_constant_override("separation", 8); root.add_child(hd)
	hd.add_child(Kit.label("DESIGN LAB", 26, Kit.CY))
	hd.add_child(Kit.btn("① Tray bench", func(): tab = "tray"; refresh(), "pri" if tab == "tray" else ""))
	hd.add_child(Kit.btn("② Rack bench", func(): tab = "rack"; refresh(), "pri" if tab == "rack" else ""))
	if tab == "tray": _tray(root)
	else: _rack(root)

# ======================= TRAY LAB =======================
func _chassis_list() -> Array:
	var offers: Dictionary = app.b.q("offersAll"); var out := []
	for it in app.b.items.values():
		if it.kind == "chassis" and offers[it.id].available: out.append(it)
	return out

func _cells(ch: Dictionary, kind: String) -> Array:
	var n := 0
	for s in ch.slots:
		if s.kind == kind: n = int(s.count)
	var cur: Array = sock.get(kind, []); var out := []
	for i in n: out.append(cur[i] if i < cur.size() else null)
	return out

func _active(ch: Dictionary) -> String: return sel_kind if sel_kind != "" else ch.slots[0].kind

func _load_chassis(id: String) -> void:
	cid = id; sock = {}; var ch: Dictionary = app.b.item(id); sel_kind = ch.slots[0].kind; sel_idx = 0

func _install(ch: Dictionary, id: String) -> void:
	var kind := _active(ch); var arr := _cells(ch, kind)
	var idx := sel_idx if (sel_kind == kind and sel_idx >= 0) else arr.find(null)
	if idx < 0: tmsg = "All %s sockets are full — click one to replace it." % kind; return
	arr[idx] = id; sock[kind] = arr; tmsg = ""; sel_kind = kind
	var nxt := -1
	for i in arr.size():
		if arr[i] == null and i != idx: nxt = i; break
	sel_idx = nxt if nxt >= 0 else idx

func _autofill(ch: Dictionary) -> void:
	var nxt := {}
	for s in ch.slots:
		var opts: Array = app.b.q("slotOptions", [ch.id, s.kind]); var pick = null
		for o in opts:
			if o.available: pick = o.item.id; break
		var need: int = int(s.get("required", s.count)); var arr := []
		for i in int(s.count): arr.append(pick if (pick != null and i < need) else null)
		nxt[s.kind] = arr
	sock = nxt

func _load_template(tid: String) -> void:
	var t: Dictionary = app.b.template(tid); if t.is_empty(): return
	cid = t.tray.chassisId; var ch: Dictionary = app.b.item(cid); var nxt := {}
	for s in ch.slots:
		var arr := []; for i in int(s.count): arr.append(null)
		nxt[s.kind] = arr
	for p in t.tray.parts:
		var arr: Array = nxt.get(p.slot, []); var k := 0
		for i in arr.size():
			if arr[i] == null and k < int(p.count): arr[i] = p.itemId; k += 1
	sock = nxt; tname = t.name; sel_kind = ""; sel_idx = -1

func _tray(root: Control) -> void:
	var b: Bridge = app.b; var g: Dictionary = b.g
	var chl := _chassis_list()
	if cid == "" or b.item(cid).is_empty(): _load_chassis(chl[0].id)
	var ch: Dictionary = b.item(cid)
	var parts := []; var bf16 := 0.0
	for s in ch.slots:
		var m := {}
		for id in _cells(ch, s.kind):
			if id != null: m[id] = m.get(id, 0) + 1
		for id in m: parts.append({"slot": s.kind, "itemId": id, "count": m[id]})
	for p in parts:
		var it: Dictionary = b.item(p.itemId)
		if it.kind == "accelerator": bf16 += float(it.tflops.get("bf16", it.tflops.get("fp16", 0))) * p.count
	var design := {"id": "draft", "name": tname, "chassisId": cid, "parts": parts}
	var v: Dictionary = b.q("validateTray", [design])
	var cols := HBoxContainer.new(); cols.size_flags_vertical = Control.SIZE_EXPAND_FILL; cols.add_theme_constant_override("separation", 12); root.add_child(cols)
	# --- bench
	var bench := Kit.panel("Tray bench", true, cols); bench[0].size_flags_stretch_ratio = 1.6; bench[0].size_flags_vertical = Control.SIZE_EXPAND_FILL
	var tools := HFlowContainer.new(); tools.add_theme_constant_override("h_separation", 8); bench[1].add_child(tools)
	var copts := []; for c in chl: copts.append([c.id, "%s (%s, %sU)" % [c.name, c.cooling, int(c.rackUnits)]])
	tools.add_child(Kit.option(copts, cid, func(id): _load_chassis(id); refresh()))
	var topts := [["", "load pre-built system…"]]
	for t in b.templates:
		if t.availableFrom <= b.year() and (t.get("eolAfter") == null or b.year() <= t.eolAfter): topts.append([t.id, "%s — %s" % [t.name, t.integrator]])
	var to := Kit.option(topts, "", func(id): if id != "": _load_template(id); refresh()); tools.add_child(to)
	if OS.get_environment("GW_FILL") != "" and not _gwfilled: _gwfilled = true; _autofill(ch)
	tools.add_child(Kit.btn("Auto-fill", func(): _autofill(ch); refresh(), "", 13)); tools.add_child(Kit.btn("Clear", func(): sock = {}; refresh(), "", 13))
	var bd := TrayBoard.new(); bd.size_flags_vertical = Control.SIZE_EXPAND_FILL; bd.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bd.ch = ch; bd.sel_kind = _active(ch) if sel_idx >= 0 else ""; bd.sel_idx = sel_idx
	for s in ch.slots: bd.cells[s.kind] = _cells(ch, s.kind)
	for id in b.items: if b.items[id].kind != "chassis": bd.items[id] = b.items[id]
	bd.socket_clicked.connect(func(k, i): sel_kind = k; sel_idx = i; refresh())
	bench[1].add_child(bd)
	bench[1].add_child(Kit.label(str(ch.codex.summary), 12, Kit.DIM, true))
	if tmsg != "": bench[1].add_child(Kit.label(tmsg, 13, Kit.AM, true))
	# --- right column
	var col := Kit.column(cols, 560, false)
	col.add_child(Kit.tip("This is a server tray. Click a socket on the board and pick a part. Watch the Sizing advisor: GPUs set the power and NIC needs, CPUs set PCIe lanes and memory channels — and everything you add costs money per GPU-hour."))
	var active := _active(ch)
	var ip := Kit.panel("Install into: %s%s" % [ZONE.get(active, active), (" #%d" % (sel_idx + 1)) if sel_idx >= 0 else ""], true, col)
	var sk := HFlowContainer.new(); sk.add_theme_constant_override("h_separation", 5); sk.add_theme_constant_override("v_separation", 5); ip[1].add_child(sk)
	for s in ch.slots:
		var filled := _cells(ch, s.kind).filter(func(x): return x != null).size()
		sk.add_child(Kit.btn("%s %d/%d" % [ZONE.get(s.kind, s.kind), filled, int(s.count)], func(): sel_kind = s.kind; sel_idx = maxi(0, _cells(ch, s.kind).find(null)); refresh(), "pri" if active == s.kind else "", 12))
	for s in ch.slots:
		if s.kind == active:
			ip[1].add_child(Kit.label(("Needs ≥ %d" % int(s.required) if s.get("required") != null else "Optional") + ((" · accepts " + " / ".join(s.accepts)) if s.get("accepts") != null else ""), 11, Kit.DIM, true))
	var opts: Array = b.q("slotOptions", [cid, active]); var cur_id = null
	if sel_idx >= 0: cur_id = _cells(ch, active)[sel_idx] if sel_idx < _cells(ch, active).size() else null
	if opts.is_empty(): ip[1].add_child(Kit.label("Nothing compatible exists for this socket.", 13, Kit.DIM))
	var shown := 0
	for o in opts:
		shown += 1
		if shown > 60: break
		var it: Dictionary = o.item; var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 6); ip[1].add_child(r)
		var specs := " · ".join(Kit.specs_of(it).slice(0, 3).map(func(x): return "%s: %s" % [x[0], x[1]]))
		var rb := Kit.btn("%s\n%s · %s" % [str(it.name).left(46), specs.left(60), Kit.usd(o.unitPrice) if o.available else "ships %d" % int(it.availableFrom)], func(): if o.available: _install(ch, it.id); refresh(), "pri" if cur_id == it.id else "", 12)
		rb.alignment = HORIZONTAL_ALIGNMENT_LEFT; rb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; rb.disabled = not o.available; r.add_child(rb)
		if o.available: r.add_child(Kit.btn("fill all", func(): var arr := _cells(ch, active).map(func(x): return x if x != null else it.id); sock[active] = arr; tmsg = ""; refresh(), "", 11))
	var ar := HBoxContainer.new(); ip[1].add_child(ar)
	if cur_id != null: ar.add_child(Kit.btn("Remove from socket", func(): var arr := _cells(ch, active); arr[sel_idx] = null; sock[active] = arr; refresh(), "", 12)); ar.add_child(Kit.btn("Codex", func(): app.learn(cur_id), "", 12))
	ip[1].add_child(Kit.label("Click a socket on the board to target it, then click a part to install it there (it advances to the next empty socket). “fill all” populates every empty socket of that type.", 11, Kit.DIM, true))
	var vp := Kit.panel("Live validation", true, col)
	var req_pcie: int = int(ch.pcieLanesAvail)
	vp[1].add_child(Kit.stats([["Power", "%.1f kW" % (v.stats.watts / 1000.0)], ["Cost", Kit.usd(v.stats.costUSD)], ["Accelerators", str(int(v.stats.accels))], ["FP8 / BF16", "%s / %s PF" % [Kit.num(v.stats.tflopsFp8 / 1000.0, 1), Kit.num(bf16 / 1000.0, 1)]], ["HBM", "%s GB" % Kit.num(v.stats.memGB)], ["PCIe lanes", "%d/%d" % [int(v.stats.pcieLanesUsed), req_pcie]]], 2))
	Kit.issues(vp[1], v.issues)
	var sr := HBoxContainer.new(); sr.add_theme_constant_override("separation", 8); vp[1].add_child(sr)
	var le := LineEdit.new(); le.text = tname; le.size_flags_horizontal = Control.SIZE_EXPAND_FILL; le.text_changed.connect(func(t): tname = t); sr.add_child(le)
	var has_err: bool = v.issues.any(func(i): return i.severity == "error")
	var save := Kit.btn("SAVE TRAY", func(): var d := design.duplicate(); d["id"] = "tray-%d" % (g.trays.size() + 1); d["name"] = tname; tmsg = b.act("saveTray", [d]).message; app.sfx("buy"); refresh(), "go", 14); save.disabled = has_err; sr.add_child(save)
	_sizing(col, design)
	var sp := Kit.panel("Saved trays", false, col)
	if g.trays.is_empty(): sp[1].add_child(Kit.label("None yet", 12, Kit.DIM))
	for t in g.trays: sp[1].add_child(Kit.label("%s · %s · %s" % [t.id, t.name, b.item(t.chassisId).get("name", "")], 12, Kit.TX, true))

func _row(parent: Control, ok, text: String) -> void:
	var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 6); parent.add_child(h)
	h.add_child(Kit.label("·" if ok == null else ("✓" if ok else "✗"), 13, Kit.DIM if ok == null else (Kit.GR if ok else Kit.RD))); h.add_child(Kit.label(text, 12, Kit.TX, true))

func _sizing(col: Control, design: Dictionary) -> void:
	var s = app.b.q("traySizing", [design]); if s == null: return
	var p := Kit.panel("Sizing & cost advisor", true, col); var v: VBoxContainer = p[1]
	v.add_child(Kit.label("Power supplies", 13, Kit.CY)); v.add_child(Kit.bar(s.draw, maxf(1.0, s.psuW)))
	v.add_child(Kit.label("draw %.1f kW · PSU capacity %.1f kW (%d × %.1f kW) · chassis limit %.1f kW" % [s.draw / 1000.0, s.psuW / 1000.0, int(s.psuCount), s.unitW / 1000.0, s.chassisMaxW / 1000.0], 11, Kit.DIM, true))
	_row(v, s.psuW >= s.draw, "Capacity covers the %d-GPU draw%s" % [int(s.gpus), " — add PSUs" if s.psuW < s.draw else ""])
	_row(v, s.redundantOK, "N+1 redundancy: one PSU can fail without a brownout%s" % ((" — need ≥ %d PSUs (you have %d)" % [int(s.need) + 1, int(s.psuCount)]) if (not s.redundantOK and s.unitW > 0) else ""))
	_row(v, s.draw <= s.chassisMaxW, "Within the chassis busbar limit")
	v.add_child(Kit.label("PCIe lanes & CPUs", 13, Kit.CY)); v.add_child(Kit.bar(s.lanesUsed, maxf(1.0, s.lanesAvail)))
	v.add_child(Kit.label("%d/%d lanes used · %d CPU%s × %d lanes" % [int(s.lanesUsed), int(s.lanesAvail), int(s.cpuN), "" if s.cpuN == 1 else "s", int(s.cpuLanes)], 11, Kit.DIM))
	_row(v, s.lanesUsed <= s.lanesAvail, "One CPU gives half the lanes of two — fine for 4 GPUs/NVMe-light trays, starved for 8 GPUs + 8 NICs." if s.cpuN <= 1 else ("Two CPUs: the standard 8-GPU layout — each CPU feeds half the GPUs/NICs, UPI link between them." if s.cpuN == 2 else "Four CPUs: only worth it for huge memory or lane counts; cost and power go up."))
	if s.cpuHint != null: v.add_child(Kit.label("1 CPU = %d lanes · %d mem channels · %d W · %s (%s). Cheaper CPUs cut cost but may cut lanes/channels." % [int(s.cpuHint.lanes), int(s.cpuHint.channels), int(s.cpuHint.tdp), Kit.usd(s.cpuHint.price), s.cpuHint.name], 11, Kit.DIM, true))
	v.add_child(Kit.label("NICs (scale-out)", 13, Kit.CY))
	v.add_child(Kit.label("%d NICs = %s Gbps → %.1f GB/s per GPU · training customers expect ≥ %.1f GB/s in %d" % [int(s.nicCount), Kit.num(s.nicGbps), s.perGpu, s.tier, int(s.year)], 11, Kit.DIM, true))
	_row(v, s.perGpu >= s.tier * 0.98, "Meets today's training bandwidth tier." if s.perGpu >= s.tier * 0.98 else "Short of the tier — %s for %d GPUs. Inference-only trays can get away with less." % [("need ~%d × %s (%dG, x%d lanes each)" % [int(s.nicNeed), s.bestNic.name, int(s.bestNic.gbps), int(s.bestNic.lanes)]) if s.bestNic != null else "newer NICs", int(s.gpus)])
	_row(v, null, "Rule of thumb: one NIC per GPU (\"rail-optimized\") for training; one per 2 GPUs is fine for inference.")
	v.add_child(Kit.label("Memory & storage", 13, Kit.CY))
	v.add_child(Kit.label("%d DIMMs on %s channels · host RAM %s GB vs %s GB of GPU HBM" % [int(s.dimms), str(int(s.channels)) if s.channels > 0 else "?", Kit.num(s.hostRam), Kit.num(s.hbm)], 11, Kit.DIM, true))
	_row(v, s.channels == 0 or s.dimms >= s.channels, "All memory channels populated (full host bandwidth)." if (s.channels == 0 or s.dimms >= s.channels) else "Only %d/%d channels populated — host bandwidth is wasted." % [int(s.dimms), int(s.channels)])
	_row(v, s.hostRam >= s.hbm * 0.5 or s.hbm == 0, "Host RAM ≥ ~½ of HBM keeps checkpointing and data loading smooth.")
	v.add_child(Kit.hsep()); v.add_child(Kit.label("Cost over a long contract (5-year TCO)", 13, Kit.CY))
	var gp: float = s.gpus
	v.add_child(Kit.stats([["Capex / GPU", Kit.usd(s.capex / gp) if gp > 0 else "—"], ["Power / GPU / month", Kit.usd(s.powerMo / gp) if gp > 0 else "—"], ["Break-even $/GPU-hr (100% used)", "$%.2f" % s.costHr if gp > 0 else "—"], ["Break-even at 60% used", "$%.2f" % (s.costHr / 0.6) if gp > 0 else "—"]], 2))
	if gp > 0: _row(v, s.costHr / 0.6 < s.price, "Market pays ≈ $%.2f/GPU-hr this year%s" % [s.price, (" — a %d%% margin at 60%% utilisation." % int(round((1.0 - s.costHr / 0.6 / s.price) * 100.0))) if s.costHr / 0.6 < s.price else " — this tray does not break even at 60% use; cut cost or raise utilisation."])
	v.add_child(Kit.label("To lower cost for a long contract: drop unneeded NICs/NVMe/CPUs, keep PSU count at N+1 (not more), choose the GPU with the best price per HBM-GB for inference or per PFLOP for training.", 11, Kit.DIM, true))

# ======================= RACK LAB =======================
func _unit_per(it: Dictionary) -> int:
	var b: Bridge = app.b
	if it.type == "tray":
		for t in b.g.trays:
			if t.id == it.trayId: return int(b.item(t.chassisId).get("rackUnits", 1))
		return 1
	if it.type == "switch": return maxi(1, int(b.item(it.switchId).get("rackUnits", 1)))
	if it.type == "storage": return int(b.item(it.storageId).get("rackUnits", 2))
	return 2
func _height(it: Dictionary) -> int: return 2 if it.type == "power" else _unit_per(it) * int(it.count)
func _meta(it: Dictionary) -> Dictionary:
	var b: Bridge = app.b
	if it.type == "tray":
		var t := {}; for x in b.g.trays:
			if x.id == it.trayId: t = x
		var w := 0.0
		if not t.is_empty(): w = b.q("validateTray", [t]).stats.watts
		return {"label": t.get("name", it.trayId), "kw": w * it.count / 1000.0, "sub": "%dU each" % _unit_per(it)}
	if it.type == "switch": var sw: Dictionary = b.item(it.switchId); return {"label": sw.get("name", it.switchId), "kw": float(sw.get("watts", 0)) * it.count / 1000.0, "sub": str(sw.get("role", "switch"))}
	if it.type == "storage": var st: Dictionary = b.item(it.storageId); return {"label": st.get("name", it.storageId), "kw": float(st.get("watts", 0)) * it.count / 1000.0, "sub": "storage"}
	var pw: Dictionary = b.item(it.powerId); return {"label": pw.get("name", it.powerId), "kw": 0.0, "sub": str(pw.get("powerType", "power"))}
func _occ(units: int, list: Array, skip := -1) -> Array:
	var o := []; o.resize(units); o.fill(-1)
	for i in list.size():
		if i == skip: continue
		var s: int = int(list[i].get("u", 0)); var h := _height(list[i])
		for u in range(s, mini(units, s + h)): o[u] = i
	return o
func _fits(units: int, list: Array, h: int, s: int, skip := -1) -> bool:
	if s < 0 or s + h > units: return false
	var o := _occ(units, list, skip)
	for u in range(s, s + h):
		if o[u] != -1: return false
	return true
func _first_free(units: int, list: Array, h: int, from_top: bool) -> int:
	var order := range(units); if from_top: order.reverse()
	for u in order:
		var s: int = u - h + 1 if from_top else u
		if _fits(units, list, h, s): return s
	return -1
func _make(a: Dictionary) -> Dictionary:
	match a.kind:
		"tray": return {"type": "tray", "trayId": a.id, "count": 1}
		"switch": return {"type": "switch", "switchId": a.id, "count": 1}
		"storage": return {"type": "storage", "storageId": a.id, "count": 1}
	return {"type": "power", "powerId": a.id, "count": 1}
func _place_at(units: int, a: Dictionary, u: int) -> void:
	if a.is_empty(): return
	var it := _make(a); var h := _height(it); var s := -1
	if u >= 0: s = u if _fits(units, ritems, h, u) else (u - h + 1 if _fits(units, ritems, h, u - h + 1) else -1)
	else: s = _first_free(units, ritems, h, a.kind == "switch")
	if s < 0: rmsg = "%s needs %d free U%s — free some space or pick another spot." % [_meta(it).label, h, " at that position" if u >= 0 else ""]; return
	it["u"] = s; ritems.append(it); rmsg = ""; sel_u = -1
func _layout(units: int, list: Array) -> Array:
	var copy := list.duplicate(true); var bottom := []; var mid := []; var topl := []
	for x in copy:
		if x.type == "power" or x.type == "storage": bottom.append(x)
		elif x.type == "tray": mid.append(x)
		else: topl.append(x)
	var u := 0
	for it in bottom + mid: it["u"] = u; u += _height(it)
	var t := units
	for it in topl: t -= _height(it); it["u"] = maxi(u, t)
	return copy
func _load_rack(id: String) -> void:
	for d in app.b.g.racks:
		if d.id == id:
			rid = d.rackId; var units: int = int(app.b.item(rid).units); var needs: bool = d.items.any(func(i): return i.get("u") == null)
			ritems = _layout(units, d.items) if needs else d.items.duplicate(true); cool = d.coolingInterface; rname = d.name + " (copy)"; return

func _rack(root: Control) -> void:
	var b: Bridge = app.b; var g: Dictionary = b.g; var offers: Dictionary = b.q("offersAll")
	var racks := []; for it in b.items.values():
		if it.kind == "rack" and offers[it.id].available: racks.append(it)
	if rid == "" or b.item(rid).is_empty():
		var best = racks[0]; var sorted := racks.duplicate(); sorted.sort_custom(func(a, c): return a.maxKW > c.maxKW)
		for r in sorted:
			if r.cooling.has("air"): best = r; break
		rid = best.id
	var rk: Dictionary = b.item(rid); var units: int = int(rk.units)
	var sorted_items := ritems.duplicate(true); sorted_items.sort_custom(func(a, c): return a.get("u", 0) < c.get("u", 0))
	var design := {"id": "draft", "name": rname, "rackId": rid, "items": sorted_items, "coolingInterface": cool}
	var v: Dictionary = b.q("validateRack", [design, g.trays])
	var cols := HBoxContainer.new(); cols.size_flags_vertical = Control.SIZE_EXPAND_FILL; cols.add_theme_constant_override("separation", 12); root.add_child(cols)
	var bench := Kit.panel("Rack bench", true, cols); bench[0].size_flags_stretch_ratio = 1.0; bench[0].size_flags_vertical = Control.SIZE_EXPAND_FILL
	var tools := HFlowContainer.new(); tools.add_theme_constant_override("h_separation", 8); bench[1].add_child(tools)
	var ropts := []; for r in racks: ropts.append([r.id, "%s (%dU, %s kW)" % [r.name, int(r.units), r.maxKW]])
	tools.add_child(Kit.option(ropts, rid, func(id): rid = id; ritems = []; sel_dev = -1; refresh()))
	tools.add_child(Kit.option(["air", "rdhx", "dlc", "immersion"], cool, func(c): cool = c; refresh()))
	var topts := [["", "pre-built rack…"]]
	for t in b.templates:
		if t.availableFrom <= b.year() and (t.get("eolAfter") == null or b.year() <= t.eolAfter): topts.append([t.id, "%s — %s" % [t.name, t.integrator]])
	tools.add_child(Kit.option(topts, "", func(id): _adopt(id)))
	if g.racks.size() > 0:
		var sopts := [["", "open saved…"]]; for r in g.racks: sopts.append([r.id, r.name])
		tools.add_child(Kit.option(sopts, "", func(id): if id != "": _load_rack(id); refresh()))
	tools.add_child(Kit.btn("Clear", func(): ritems = []; sel_dev = -1; refresh(), "", 13))
	var bd := RackBoard.new(); bd.size_flags_vertical = Control.SIZE_EXPAND_FILL; bd.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bd.units = units; bd.rack_name = rk.name; bd.max_kw = rk.maxKW; bd.kw = v.stats.kW; bd.sel_u = sel_u; bd.sel_dev = sel_dev; bd.occ = _occ(units, ritems)
	for i in ritems.size():
		var it: Dictionary = ritems[i]; var m := _meta(it); var cnt := int(it.count)
		bd.devices.append({"i": i, "u": int(it.get("u", 0)), "h": _height(it), "label": m.label, "sub": ("%s · %.1f kW" % [m.sub, m.kw / maxf(1, cnt) if it.type == "tray" else m.kw]), "color": RC[it.type], "kind": it.type, "count": cnt, "unit_h": _unit_per(it) if it.type == "tray" else _height(it)})
	bd.u_clicked.connect(func(u): if not armed.is_empty(): _place_at(units, armed, u) else: sel_u = -1 if sel_u == u else u; sel_dev = -1; refresh())
	bd.device_clicked.connect(func(i): sel_dev = i; refresh())
	bench[1].add_child(bd)
	if rmsg != "": bench[1].add_child(Kit.label(rmsg, 13, Kit.AM, true))
	var col := Kit.column(cols, 560, false)
	if sel_dev >= 0 and sel_dev < ritems.size():
		var it: Dictionary = ritems[sel_dev]; var sp := Kit.panel("Selected: %s   U%d–%d" % [_meta(it).label, int(it.get("u", 0)) + 1, int(it.get("u", 0)) + _height(it)], true, col)
		var h := HFlowContainer.new(); h.add_theme_constant_override("h_separation", 6); sp[1].add_child(h)
		if it.type != "power":
			h.add_child(Kit.btn("− count", func(): _bump(units, sel_dev, -1); refresh(), "", 12)); h.add_child(Kit.label(str(int(it.count)), 15)); h.add_child(Kit.btn("+ count", func(): _bump(units, sel_dev, 1); refresh(), "", 12))
		h.add_child(Kit.btn("▲ up", func(): _nudge(units, sel_dev, 1); refresh(), "", 12)); h.add_child(Kit.btn("▼ down", func(): _nudge(units, sel_dev, -1); refresh(), "", 12))
		h.add_child(Kit.btn("remove", func(): ritems.remove_at(sel_dev); sel_dev = -1; refresh(), "danger", 12))
	var ip := Kit.panel("Install into rack", true, col)
	var tb := HBoxContainer.new(); tb.add_theme_constant_override("separation", 5); ip[1].add_child(tb)
	for k in [["switch", "ToR / switches"], ["tray", "Compute trays"], ["power", "Power"], ["storage", "Storage"]]: tb.add_child(Kit.btn(k[1], func(): rtab = k[0]; refresh(), "pri" if rtab == k[0] else "", 12))
	ip[1].add_child(Kit.label(("Target: U%d. " % (sel_u + 1) if sel_u >= 0 else "No U selected — Add puts it in the best free spot (switches go to the top). ") + ("A part is armed — click an empty U to place it." if not armed.is_empty() else ""), 11, Kit.DIM, true))
	var palette := []
	if rtab == "tray":
		for t in g.trays:
			var tv: Dictionary = b.q("validateTray", [t]); palette.append({"id": t.id, "name": t.name, "sub": "%sU · %.1f kW · %d accel" % [int(b.item(t.chassisId).get("rackUnits", 1)), tv.stats.watts / 1000.0, int(tv.stats.accels)], "kind": "tray", "ok": true, "price": 0.0})
	else:
		for it in b.items.values():
			var o: Dictionary = offers[it.id]
			if rtab == "switch" and it.kind == "switch" and it.rackUnits > 0: palette.append({"id": it.id, "name": it.name, "sub": "%s · %sU" % [it.role, int(it.rackUnits)], "kind": "switch", "ok": o.available, "price": o.unitPrice})
			elif rtab == "storage" and it.kind == "storage": palette.append({"id": it.id, "name": it.name, "sub": "%s PB · %s GB/s · %sU" % [it.capacityPB, it.readGBs, int(it.rackUnits)], "kind": "storage", "ok": o.available, "price": o.unitPrice})
			elif rtab == "power" and it.kind == "power" and ["pdu", "power-shelf"].has(it.get("powerType", "")): palette.append({"id": it.id, "name": it.name, "sub": "%s · %s kW" % [it.powerType, it.capacityKW], "kind": "power", "ok": o.available, "price": o.unitPrice})
	if palette.is_empty(): ip[1].add_child(Kit.label("No saved trays — build one on the Tray bench or load a pre-built rack." if rtab == "tray" else "Nothing here yet.", 12, Kit.DIM, true))
	for p in palette:
		var on: bool = armed.get("id", "") == p.id; var r := HBoxContainer.new(); r.add_theme_constant_override("separation", 6); ip[1].add_child(r)
		var rb := Kit.btn("%s\n%s%s" % [str(p.name).left(46), p.sub, (" · " + Kit.usd(p.price)) if p.price > 0 else ""], func(): armed = {} if on else {"kind": p.kind, "id": p.id}; refresh(), "pri" if on else "", 12)
		rb.alignment = HORIZONTAL_ALIGNMENT_LEFT; rb.size_flags_horizontal = Control.SIZE_EXPAND_FILL; rb.disabled = not p.ok; r.add_child(rb)
		var ab := Kit.btn("Add", func(): _place_at(units, {"kind": p.kind, "id": p.id}, sel_u); refresh(), "", 12); ab.disabled = not p.ok; r.add_child(ab)
	ip[1].add_child(Kit.label("Click a part to arm it and click the U where it should sit, or press Add. Zones are hints: ToR switches at the top, compute in the middle, power/storage at the bottom.", 11, Kit.DIM, true))
	var vp := Kit.panel("Rack validation", true, col)
	vp[1].add_child(Kit.stats([["Power", "%d / %s kW" % [int(v.stats.kW), rk.maxKW], Kit.RD if v.stats.kW > rk.maxKW else Kit.TX], ["Units", "%d/%d" % [int(v.stats.units), units]], ["Weight", "%s kg" % Kit.num(v.stats.weightKg)], ["Cost", Kit.usd(v.stats.costUSD)], ["Accels", str(int(v.stats.accels))], ["Scale-up", str(int(v.stats.scaleUpDomain))]], 3))
	Kit.issues(vp[1], v.issues)
	var sr := HBoxContainer.new(); sr.add_theme_constant_override("separation", 8); vp[1].add_child(sr)
	var le := LineEdit.new(); le.text = rname; le.size_flags_horizontal = Control.SIZE_EXPAND_FILL; le.text_changed.connect(func(t): rname = t); sr.add_child(le)
	var has_err: bool = v.issues.any(func(i): return i.severity == "error")
	var save := Kit.btn("SAVE RACK", func(): var d := design.duplicate(true); d["id"] = "rack-%d" % (g.racks.size() + 1); d["name"] = rname; rmsg = b.act("saveRack", [d]).message; app.sfx("buy"); refresh(), "go", 14); save.disabled = has_err or ritems.is_empty(); sr.add_child(save)
	var sv := Kit.panel("Saved racks", false, col)
	if g.racks.is_empty(): sv[1].add_child(Kit.label("None yet", 12, Kit.DIM))
	for r in g.racks: sv[1].add_child(Kit.label("%s · %s" % [r.id, r.name], 12, Kit.TX, true))

func _adopt(id: String) -> void:
	if id == "": return
	var r: Dictionary = app.b.act("adoptTemplate", [id])
	if r.ok: _load_rack("rack-" + id)
	else: rmsg = r.message
	refresh()

func _bump(units: int, i: int, d: int) -> void:
	var it: Dictionary = ritems[i]; var c: int = int(it.count) + d
	if c <= 0: ritems.remove_at(i); sel_dev = -1; return
	var n := it.duplicate(); n["count"] = c
	if it.type != "power" and not _fits(units, ritems, _height(n), int(it.get("u", 0)), i): rmsg = "No free U above it — move it or free space first."; return
	ritems[i] = n; rmsg = ""
func _nudge(units: int, i: int, d: int) -> void:
	var it: Dictionary = ritems[i]; var s: int = int(it.get("u", 0)) + d
	if not _fits(units, ritems, _height(it), s, i): rmsg = "Blocked by another device or the rack edge."; return
	var n := it.duplicate(); n["u"] = s; ritems[i] = n
