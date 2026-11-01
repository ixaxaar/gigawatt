class_name TrayBoard
extends Control
## Motherboard view of a server tray. Same placement algorithm as the web Design Lab; click a socket to target it.
signal socket_clicked(kind: String, idx: int)
const SOCK := {"accelerator": Vector2(108, 108), "cpu": Vector2(104, 104), "dimm": Vector2(13, 118), "nic": Vector2(150, 36), "dpu": Vector2(150, 36), "nvme": Vector2(62, 28), "psu": Vector2(100, 54), "coldplate": Vector2(80, 50), "switchchip": Vector2(66, 66), "fan": Vector2(48, 48)}
const ZONE := {"accelerator": "ACCELERATOR", "cpu": "CPU", "dimm": "DIMM", "nic": "PCIe NIC", "dpu": "PCIe DPU", "nvme": "NVMe BAY", "psu": "PSU BAY", "coldplate": "COLD PLATE", "switchchip": "SWITCH CHIP", "fan": "FAN"}
var ch: Dictionary = {}
var cells: Dictionary = {}       # kind -> Array[String|null]
var items: Dictionary = {}       # id -> catalog item
var sel_kind := ""
var sel_idx := -1
var W := 1400.0
var H := 700.0
var place: Dictionary = {}
var traces: Array = []
var chips: Array = []
var silk: Array = []
var _rects: Array = []
var bounds := {}
var bx0 := 0.0; var bx1 := 0.0; var top := 64.0; var bottom := 0.0
var nvW := 0.0; var psW := 0.0

func _init() -> void: custom_minimum_size = Vector2(0, 420); mouse_filter = Control.MOUSE_FILTER_STOP

func _has(k: String) -> bool: return _cnt(k) > 0
func _cnt(k: String) -> int:
	for s in ch.get("slots", []):
		if s.kind == k: return int(s.count)
	return 0

func compute() -> void:
	place.clear(); traces.clear(); chips.clear(); silk.clear()
	if ch.is_empty(): return
	var GAP := 10.0; var NV_PER := 10; var PS_PER := 6
	nvW = ceil(_cnt("nvme") / float(NV_PER)) * (SOCK.nvme.x + 8) if _has("nvme") else 0.0
	psW = ceil(_cnt("psu") / float(PS_PER)) * (SOCK.psu.x + 8) if _has("psu") else 0.0
	bx0 = 40.0 + nvW + (26.0 if nvW > 0 else 0.0); bx1 = W - 30.0 - psW - (26.0 if psW > 0 else 0.0); var bw := bx1 - bx0
	var y := top + 16.0
	place["nvme"] = []; for i in _cnt("nvme"): place["nvme"].append(Vector2(40 + (i / NV_PER) * (SOCK.nvme.x + 8), top + 30 + (i % NV_PER) * (SOCK.nvme.y + 8)))
	place["psu"] = []; for i in _cnt("psu"): place["psu"].append(Vector2(bx1 + 26 + (i / PS_PER) * (SOCK.psu.x + 8), top + 30 + (i % PS_PER) * (SOCK.psu.y + 8)))
	var cpu_band = null
	if _has("cpu") or _has("dimm"):
		var nC := _cnt("cpu"); var nD := _cnt("dimm"); var cw: float = SOCK.cpu.x + 40.0
		var dl := int(ceil(nD / 2.0)); var dr := nD - dl; var dw: float = SOCK.dimm.x + 4.0
		var side_w := (bw - nC * cw) / 2.0 - 20.0
		var per: int = maxi(1, int(floor(side_w / dw))); var rows_b: int = maxi(1, int(ceil(maxi(dl, dr) / float(per))))
		var band_h := maxf(SOCK.cpu.y + 64.0 if nC > 0 else 0.0, rows_b * (SOCK.dimm.y + 12.0) + 24.0)
		var cx0 := bx0 + bw / 2.0 - (nC * cw) / 2.0 + 20.0
		place["cpu"] = []; for i in nC: place["cpu"].append(Vector2(cx0 + i * cw, y + 18))
		var lx := bx0 + 18.0; var rx := cx0 + nC * cw - 20.0
		place["dimm"] = []
		for i in dl: var r: int = i / per; var c: int = i % per; place["dimm"].append(Vector2(lx + side_w - (c + 1) * dw - dw, y + 18 + r * (SOCK.dimm.y + 12)))
		for i in dr: var r2: int = i / per; var c2: int = i % per; place["dimm"].append(Vector2(rx + 24 + c2 * dw, y + 18 + r2 * (SOCK.dimm.y + 12)))
		for i in nC:
			var p: Vector2 = place["cpu"][i]; silk.append([Vector2(p.x + SOCK.cpu.x / 2, p.y - 6), "CPU%d · SOCKET" % i, true])
			if i > 0: traces.append([Vector2(place["cpu"][i - 1].x + SOCK.cpu.x, p.y + 30), Vector2(p.x, p.y + 30), 4, 6.0, false])
		if nC > 0 and dl > 0: traces.append([Vector2(lx + side_w - 6, y + 56), Vector2(place["cpu"][0].x, y + 56), 6, 9.0, false])
		if nC > 0 and dr > 0: traces.append([Vector2(place["cpu"][nC - 1].x + SOCK.cpu.x, y + 56), Vector2(rx + 24, y + 56), 6, 9.0, false])
		if dl > 0: silk.append([Vector2(lx + side_w / 2, y + 6), "DDR · CH A–%s" % char(64 + maxi(1, int(ceil(dl / 2.0)))), true])
		if dr > 0: silk.append([Vector2(rx + 24 + side_w / 2, y + 6), "DDR · CH %s–%s" % [char(65 + int(ceil(dl / 2.0))), char(64 + int(ceil(dl / 2.0)) + int(ceil(dr / 2.0)))], true])
		cpu_band = {"y": y, "h": band_h}; y += band_h + 24.0
	if _has("accelerator"):
		var n := _cnt("accelerator"); var sk: Vector2 = SOCK.accelerator
		var per: int = mini(4, n) if n <= 8 else maxi(1, mini(8, int(floor((bw - 40.0) / (sk.x + GAP)))))
		var rows: int = int(ceil(n / float(per)))
		var bb: Dictionary = ch.get("baseboard", {}) if ch.get("baseboard") != null else {}
		var sw := 78.0 if (bb.get("includesSwitchChips", false) and rows >= 2) else 0.0
		var band_h := rows * (sk.y + 30.0) + sw + 40.0; var pitch := sk.x + 34.0; var row_w := mini(per, n) * pitch - 34.0; var x0 := bx0 + (bw - row_w) / 2.0
		place["accelerator"] = []
		for i in n: var r: int = i / per; place["accelerator"].append(Vector2(x0 + (i % per) * pitch, y + 36 + r * (sk.y + 30) + (sw if r >= 1 else 0.0)))
		if bb.get("includesSwitchChips", false) and sw > 0:
			var cy := y + 36 + sk.y + 15 + 8; var n_sw := 4 if per <= 4 else 6
			for k in n_sw: chips.append([Vector2(bx0 + bw / 2 - (n_sw * 78) / 2.0 + k * 78 + 6, cy), Vector2(66, 50), "NVSWITCH", true])
			for i in n:
				var p: Vector2 = place["accelerator"][i]; var r3: int = i / per
				traces.append([Vector2(p.x + sk.x / 2, p.y + sk.y), Vector2(p.x + sk.x / 2, cy + 20), 3, 7.0, true] if r3 == 0 else [Vector2(p.x + sk.x / 2, p.y), Vector2(p.x + sk.x / 2, cy + 30), 3, 7.0, true])
		else:
			for i in n:
				if i % per < per - 1 and i + 1 < n: var p2: Vector2 = place["accelerator"][i]; var q2: Vector2 = place["accelerator"][i + 1]; traces.append([Vector2(p2.x + sk.x, p2.y + sk.y / 2), Vector2(q2.x, q2.y + sk.y / 2), 3, 6.0, false])
		var scale_up := str(bb.get("scaleUp", "pcie")).to_upper()
		for i in n: var p3: Vector2 = place["accelerator"][i]; silk.append([Vector2(p3.x + sk.x / 2, p3.y - 6), "%s · GPU%d" % [scale_up, i], true])
		if cpu_band != null and place.has("cpu"):
			for p4 in place["cpu"]: traces.append([Vector2(p4.x + SOCK.cpu.x / 2, p4.y + SOCK.cpu.y + 40), Vector2(p4.x + SOCK.cpu.x / 2, y + 6), 5, 6.0, true])
		y += band_h + 24.0
	var misc := []; for k in ["coldplate", "switchchip", "fan"]:
		if _has(k): misc.append(k)
	if misc.size() > 0:
		var x := bx0 + 30.0
		for k in misc:
			place[k] = []
			for i in _cnt(k): place[k].append(Vector2(x, y + 18)); silk.append([Vector2(x, y + 12), "%s %d" % [k.to_upper(), i + 1], false]); x += SOCK[k].x + 18.0
		y += 100.0
	var nic_kinds := []; for k in ["nic", "dpu"]:
		if _has(k): nic_kinds.append(k)
	if nic_kinds.size() > 0:
		var wslot: float = SOCK.nic.x + 36.0; var per: int = maxi(1, int(floor((bw - 50.0) / wslot))); var k := 0
		for kind in nic_kinds:
			place[kind] = []
			for i in _cnt(kind):
				var idx := k; k += 1
				var p5 := Vector2(bx0 + 36 + (idx % per) * wslot, y + 30 + (idx / per) * 60); place[kind].append(p5); silk.append([Vector2(p5.x + SOCK.nic.x + 6, p5.y + 6), "PCIE5 x16 #%d" % (idx + 1), false])
		var rows2: int = int(ceil(k / float(per)))
		if cpu_band != null and place.has("cpu"): traces.append([Vector2(bx0 + 20, cpu_band.y + cpu_band.h / 2), Vector2(bx0 + 20, y + 20), 6, 5.0, true])
		y += rows2 * 60.0 + 54.0
	bottom = y + 6.0
	chips.append([Vector2(bx0 + 30, bottom + 6), Vector2(54, 30), "BMC", false]); chips.append([Vector2(bx0 + 98, bottom + 6), Vector2(54, 30), "PCH", false]); chips.append([Vector2(bx0 + 166, bottom + 6), Vector2(40, 30), "TPM", false])
	H = maxf(bottom + 60.0, top + 40.0 + maxf(minf(_cnt("nvme"), NV_PER) * 36.0 if _has("nvme") else 0.0, minf(_cnt("psu"), PS_PER) * 62.0 if _has("psu") else 0.0) + 30.0)

func _k() -> float: return minf(size.x / W, size.y / H)
func _o() -> Vector2: var k := _k(); return Vector2((size.x - W * k) * 0.5, (size.y - H * k) * 0.5)
func _p(v: Vector2) -> Vector2: return _o() + v * _k()
func _r(pos: Vector2, sz: Vector2) -> Rect2: return Rect2(_p(pos), sz * _k())
func _txt(pos: Vector2, t: String, px: int, col: Color, center := false) -> void:
	var fnt: Font = Fonts.regular; var s := maxi(8, int(px * _k())); var w := fnt.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, s).x
	draw_string(fnt, _p(pos) + Vector2(-w * 0.5 if center else 0.0, 0), t, HORIZONTAL_ALIGNMENT_LEFT, -1, s, col)

func _draw() -> void:
	if ch.is_empty(): return
	compute(); _rects.clear()
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.03, 0.05, 0.08), true)
	var cooled: bool = str(ch.get("cooling", "air")) != "air"
	draw_rect(_r(Vector2(4, 4), Vector2(W - 8, H - 8)), Color(0.22, 0.74, 0.97) if cooled else Color(0.29, 0.39, 0.49), false, 3.0)
	draw_rect(_r(Vector2(12, 12), Vector2(W - 24, 30)), Color(0.06, 0.12, 0.18), true)
	_txt(Vector2(26, 32), "◀ FRONT · %s · %sU · %s · REAR ▶" % [str(ch.name).to_upper().left(56), int(ch.rackUnits), str(ch.cooling).to_upper()], 14, Color(0.56, 0.7, 0.81))
	_txt(Vector2(W - 380, 32), "click a socket, then choose a part →", 12, Color(0.42, 0.54, 0.65))
	if _has("nvme"): draw_rect(_r(Vector2(30, top + 8), Vector2(nvW + 20, minf(_cnt("nvme"), 10) * 36.0 + 44)), Color(0.05, 0.08, 0.11), true); _txt(Vector2(40, top + 24), "NVME CAGE", 10, Color(0.5, 0.6, 0.7))
	if _has("psu"): draw_rect(_r(Vector2(bx1 + 16, top + 8), Vector2(psW + 20, minf(_cnt("psu"), 6) * 62.0 + 44)), Color(0.05, 0.08, 0.11), true); _txt(Vector2(bx1 + 26, top + 24), "REAR PSU BAY", 10, Color(0.5, 0.6, 0.7))
	draw_rect(_r(Vector2(bx0 - 8, top), Vector2(bx1 - bx0 + 16, H - top - 18)), Color(0.04, 0.16, 0.12), true); draw_rect(_r(Vector2(bx0 - 8, top), Vector2(bx1 - bx0 + 16, H - top - 18)), Color(0.12, 0.3, 0.22), false, 2.0)
	for t in traces:
		var a: Vector2 = t[0]; var b: Vector2 = t[1]; var n: int = t[2]; var gap: float = t[3]; var vert: bool = t[4]
		for i in n:
			var off := (i - (n - 1) / 2.0) * gap
			draw_line(_p(a + (Vector2(off, 0) if vert else Vector2(0, off))), _p(b + (Vector2(off, 0) if vert else Vector2(0, off))), Color(0.78, 0.6, 0.25, 0.55), maxf(1.0, 1.4 * _k()))
	for c in chips:
		draw_rect(_r(c[0], c[1]), Color(0.08, 0.09, 0.1), true); draw_rect(_r(c[0], c[1]), Color(1.0, 0.45, 0.2) if c[3] else Color(0.4, 0.45, 0.5), false, 1.5)
		_txt(c[0] + Vector2(c[1].x / 2, c[1].y / 2 + 4), c[2], 9, Color(0.8, 0.85, 0.9), true)
	for s in silk: _txt(s[0], s[1], 9, Color(0.75, 0.82, 0.8), s[2])
	for s in ch.slots:
		var arr: Array = cells.get(s.kind, []); var pos: Array = place.get(s.kind, []); var sk: Vector2 = SOCK.get(s.kind, Vector2(40, 30))
		for i in arr.size():
			if i >= pos.size(): continue
			var p: Vector2 = pos[i]; var id = arr[i]; var it: Dictionary = items.get(id, {}) if id != null else {}
			var rr := _r(p, sk); draw_rect(rr, Color(0.03, 0.04, 0.05), true)
			if not it.is_empty():
				var vc := Kit.vendor_color(it.get("vendor", "generic")); draw_rect(rr.grow(-2.0 * _k()), Color(vc.r * 0.45, vc.g * 0.45, vc.b * 0.45), true)
				if s.kind != "dimm": _txt(p + Vector2(5, sk.y / 2 + 4), str(it.name).left(int(sk.x / 7.0)), 10, Color.WHITE)
				else: draw_rect(rr.grow(-1.0), Color(vc.r * 0.8, vc.g * 0.8, vc.b * 0.8), true)
			else:
				draw_rect(rr, Color(0.25, 0.4, 0.5), false, 1.0)
				if s.kind != "dimm": _txt(p + Vector2(5, sk.y / 2 + 4), "%s%d" % [str(s.kind).to_upper().left(6), i], 9, Color(0.4, 0.55, 0.65))
			var selected: bool = sel_kind == s.kind and sel_idx == i
			draw_rect(rr.grow(4.0 * _k()), Color.WHITE if selected else Color(0, 0, 0, 0), false, 2.5 if selected else 0.0)
			_rects.append({"kind": s.kind, "idx": i, "rect": rr})

func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		for r in _rects:
			if r.rect.grow(4.0).has_point(e.position): socket_clicked.emit(r.kind, r.idx); return
