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

# ---------- flat, iconic rendering: charcoal board; grey, white and blue parts ----------
const BD := Color(0.105, 0.105, 0.115)
const GY := Color(0.5, 0.5, 0.53)
const GYD := Color(0.34, 0.34, 0.37)
const WH := Color(0.94, 0.94, 0.95)
const BL := Color(0.15, 0.45, 0.96)
const BLL := Color(0.36, 0.63, 1.0)
const DK := Color(0.035, 0.035, 0.045)
const RIM := Color(0.22, 0.74, 0.97)

func _fill(rc: Rect2, c: Color) -> void: draw_rect(rc, c, true)

func _hash(a: float, b: float) -> float: return fposmod(sin(a * 12.9898 + b * 78.233) * 43758.5453, 1.0)

func _screw(c: Vector2, r: float) -> void:
	draw_circle(c, r * 1.5, GY); draw_circle(c, r * 0.55, BD)

func _pin_array(rc: Rect2, col: Color, step: float) -> void:
	var x := rc.position.x + step * 0.5
	while x < rc.end.x:
		var y := rc.position.y + step * 0.5
		while y < rc.end.y: draw_circle(Vector2(x, y), maxf(0.8, step * 0.24), col); y += step
		x += step

func _cap(c: Vector2, r: float, col: Color) -> void: draw_circle(c, r, col)

func _inductor(rc: Rect2) -> void: _fill(rc, WH)

func _vrm(rc: Rect2) -> void:   # a row of white inductors over grey caps
	var k := _k(); var n := maxi(2, int(rc.size.x / (14.0 * k)))
	for i in n:
		_inductor(Rect2(rc.position + Vector2(2 + i * 14 * k, 2), Vector2(11 * k, 11 * k)))
		_cap(rc.position + Vector2(8 * k + i * 14 * k, rc.size.y - 6 * k), 4.0 * k, GY)

func _label(rc: Rect2, t: String, col: Color, size: int) -> void:
	var fnt: Font = Fonts.regular; var fs := maxi(8, int(size * _k())); var w := fnt.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	draw_string(fnt, rc.position + Vector2((rc.size.x - w) * 0.5, rc.size.y * 0.5 + fs * 0.35), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)

func _heatsink(rc: Rect2, light := false) -> void:   # blue finned block
	var base := BLL if light else BL
	_fill(rc, base)
	var step := maxf(3.0, 4.0 * _k()); var x := rc.position.x + step * 0.5
	while x < rc.end.x - 1.0: draw_rect(Rect2(x, rc.position.y + 1, step * 0.45, rc.size.y - 2), base.lightened(0.28), true); x += step

func _soic(rc: Rect2, body: Color) -> void:   # grey package with white pins either side
	var pw := rc.size.x * 0.16; var n := maxi(2, int(rc.size.y / maxf(4.0, 6.0 * _k())))
	_fill(Rect2(rc.position + Vector2(pw, 0), Vector2(rc.size.x - pw * 2.0, rc.size.y)), body)
	for i in n:
		var py := rc.position.y + (i + 0.5) * rc.size.y / n - 1.0
		_fill(Rect2(rc.position.x, py, pw, 2.0), WH); _fill(Rect2(rc.end.x - pw, py, pw, 2.0), WH)

func _socket_frame(rc: Rect2, lever := true) -> void:
	_fill(rc, GY); var inner := rc.grow(-rc.size.x * 0.08); _pin_array(inner, DK, maxf(4.0, 5.0 * _k()))
	var win := Rect2(rc.position + rc.size * 0.3, rc.size * 0.4); _fill(win, GY)
	var bars := 4; for i in bars: _fill(Rect2(win.position + Vector2(win.size.x * 0.12, win.size.y * (0.1 + i * 0.22)), Vector2(win.size.x * 0.76, win.size.y * 0.12)), WH)

func _draw_gpu(rc: Rect2, it: Dictionary, vc: Color) -> void:
	_fill(rc, GY); _pin_array(rc.grow(-rc.size.x * 0.05), DK, maxf(4.0, 5.0 * _k()))
	var die := Rect2(rc.position + rc.size * Vector2(0.3, 0.22), rc.size * Vector2(0.4, 0.5)); _fill(die, WH)
	for i in 4: draw_rect(Rect2(die.position + Vector2(die.size.x * 0.1, die.size.y * (0.12 + i * 0.22)), Vector2(die.size.x * 0.8, die.size.y * 0.1)), GY, true)
	var hbm := int(clampf(float(it.get("memGB", 80)) / 24.0, 4, 8)) / 2
	for side in [0, 1]:
		var hx := rc.position.x + (rc.size.x * 0.07 if side == 0 else rc.size.x * 0.75)
		for j in hbm: _fill(Rect2(Vector2(hx, rc.position.y + rc.size.y * (0.1 + j * (0.8 / maxf(1, hbm)))), Vector2(rc.size.x * 0.18, rc.size.y * (0.64 / maxf(1, hbm)))), BL)
	_fill(Rect2(rc.position + Vector2(rc.size.x * 0.3, rc.size.y * 0.82), Vector2(rc.size.x * 0.4, 5 * _k())), vc)

func _draw_cpu(rc: Rect2, it: Dictionary) -> void:
	_fill(rc, GY); _pin_array(rc.grow(-rc.size.x * 0.05), DK, maxf(4.0, 5.0 * _k()))
	var ih := rc.grow(-rc.size.x * 0.22); _fill(ih, WH)
	_label(ih, str(it.get("name", "")).replace("AMD ", "").replace("Intel ", "").left(10), DK, 9)

func _draw_dimm(rc: Rect2, filled: bool, vc: Color) -> void:
	if filled:
		_fill(rc, BL); _fill(Rect2(rc.position, Vector2(rc.size.x, 4 * _k())), vc)
		var n := 6; for i in n: _fill(Rect2(rc.position + Vector2(rc.size.x * 0.25, 8 * _k() + i * (rc.size.y - 14 * _k()) / n), Vector2(rc.size.x * 0.5, 2.0)), BLL.lightened(0.3))
	else:
		_fill(rc, GYD); _fill(rc.grow(-2.0), BD); _fill(Rect2(rc.position + Vector2(rc.size.x * 0.4, 0), Vector2(rc.size.x * 0.2, rc.size.y)), GYD)

func _draw_nic(rc: Rect2, it: Dictionary, vc: Color, filled: bool, dpu: bool) -> void:
	_fill(rc, BD); draw_rect(rc, GYD, false, 1.0)
	_fill(Rect2(rc.position + Vector2(0, rc.size.y * 0.74), Vector2(rc.size.x, rc.size.y * 0.2)), BL)   # the PCIe slot
	if filled:
		var card := Rect2(rc.position + Vector2(2, 2), Vector2(rc.size.x - 4, rc.size.y * 0.66)); _fill(card, GYD)
		_heatsink(Rect2(card.position + card.size * Vector2(0.28, 0.14), card.size * Vector2(0.32, 0.72)), dpu)
		_fill(Rect2(card.position + Vector2(card.size.x * 0.82, card.size.y * 0.1), Vector2(card.size.x * 0.16, card.size.y * 0.8)), WH)
		_fill(Rect2(card.position + Vector2(card.size.x * 0.05, card.size.y * 0.15), Vector2(card.size.x * 0.16, 4 * _k())), vc)

func _draw_nvme(rc: Rect2, filled: bool, vc: Color) -> void:
	if filled:
		_soic(rc, GY); _fill(Rect2(rc.position + Vector2(rc.size.x * 0.3, rc.size.y * 0.45), Vector2(rc.size.x * 0.4, 3 * _k())), vc); draw_circle(rc.position + Vector2(rc.size.x * 0.5, rc.size.y * 0.2), 2.4 * _k(), BLL)
	else:
		_soic(rc, GYD); _fill(Rect2(rc.position + rc.size * Vector2(0.2, 0.2), rc.size * Vector2(0.6, 0.6)), BD)

func _draw_psu(rc: Rect2, filled: bool) -> void:
	_fill(rc, BD); draw_rect(rc, GYD, false, 1.5)
	var c := rc.position + rc.size * Vector2(0.5, 0.5); var r := minf(rc.size.x, rc.size.y) * 0.4
	if filled:   # the round emblem from the reference board
		draw_circle(c, r, GY); draw_circle(c, r * 0.8, WH); draw_circle(c, r * 0.52, BL); draw_circle(c, r * 0.2, WH)
	else: draw_circle(c, r, GYD); draw_circle(c, r * 0.8, BD)

func _draw_chip(rc: Rect2, text: String, hot: bool) -> void:
	if hot: _heatsink(rc, false)
	else: _soic(rc, GY)
	var plate := Rect2(rc.position + rc.size * Vector2(0.22, 0.32), rc.size * Vector2(0.56, 0.36)); _label(plate, text, WH if hot else DK, 8)

func _decor(rc: Rect2, keep: Array) -> void:   # SMD resistors, caps and ICs filling the bare board, like the reference
	var k := _k()
	for i in 150:
		var p := Vector2(bx0 + _hash(i, 3.0) * (bx1 - bx0), top + 14 + _hash(i, 4.0) * (H - top - 40)); var kind := int(_hash(i, 5.0) * 4.0)
		var sz := [Vector2(11, 5), Vector2(14, 14), Vector2(22, 12), Vector2(16, 16)][kind] as Vector2
		var box := Rect2(p, sz).grow(6.0); var hit := false
		for r in keep:
			if (r as Rect2).intersects(box): hit = true; break
		if hit: continue
		var rr := _r(p, sz)
		match kind:
			0: _fill(rr, WH); _fill(Rect2(rr.position + Vector2(rr.size.x * 0.3, 0), Vector2(rr.size.x * 0.4, rr.size.y)), BL)
			1: draw_circle(rr.get_center(), rr.size.x * 0.5, GYD)
			2: _soic(rr, GYD)
			3: _fill(rr, Color(0.82, 0.82, 0.84, 0.9))
		keep.append(box)

func _draw() -> void:
	if ch.is_empty(): return
	compute(); _rects.clear(); var k := _k()
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.04, 0.04, 0.05), true)
	var cooled: bool = str(ch.get("cooling", "air")) != "air"
	# chassis tray + header
	_fill(_r(Vector2(4, 4), Vector2(W - 8, H - 8)), Color(0.075, 0.075, 0.085))
	draw_rect(_r(Vector2(4, 4), Vector2(W - 8, H - 8)), RIM if cooled else GYD, false, 3.0)
	_fill(_r(Vector2(12, 12), Vector2(W - 24, 30)), Color(0.06, 0.12, 0.18))
	_txt(Vector2(26, 32), "◀ FRONT · %s · %sU · %s · REAR ▶" % [str(ch.name).to_upper().left(56), int(ch.rackUnits), str(ch.cooling).to_upper()], 14, Color(0.62, 0.78, 0.92))
	_txt(Vector2(W - 380, 32), "click a socket, then choose a part →", 12, Color(0.45, 0.58, 0.7))
	if _has("nvme"): var nr := _r(Vector2(30, top + 8), Vector2(nvW + 20, minf(_cnt("nvme"), 10) * 36.0 + 44)); _fill(nr, BD); draw_rect(nr, GYD, false, 1.0); _txt(Vector2(40, top + 24), "NVME CAGE", 10, GY)
	if _has("psu"): var pr := _r(Vector2(bx1 + 16, top + 8), Vector2(psW + 20, minf(_cnt("psu"), 6) * 62.0 + 44)); _fill(pr, BD); draw_rect(pr, GYD, false, 1.0); _txt(Vector2(bx1 + 26, top + 24), "REAR PSU BAY", 10, GY)
	# the PCB: charcoal with a bright rim and grey mounting circles
	var pcb := _r(Vector2(bx0 - 8, top), Vector2(bx1 - bx0 + 16, H - top - 18))
	_fill(pcb, BD); draw_rect(pcb, RIM, false, 3.0)
	for q in [Vector2(0.015, 0.02), Vector2(0.985, 0.02), Vector2(0.015, 0.98), Vector2(0.985, 0.98), Vector2(0.5, 0.02), Vector2(0.5, 0.98)]: _screw(pcb.position + pcb.size * q, 3.5 * k)
	# keep-out zones for the decoration: sockets, their VRMs, chips, silkscreen
	var keep: Array = []
	for kind in place:
		var sk1: Vector2 = SOCK.get(kind, Vector2(40, 30)); var ext := 30.0 if kind in ["accelerator", "cpu"] else 0.0
		for p in place[kind]: keep.append(Rect2(p - Vector2(8, 22), sk1 + Vector2(16, 30 + ext)))
	for c in chips: keep.append(Rect2(c[0] - Vector2(8, 8), c[1] + Vector2(16, 16)))
	for s in silk: keep.append(Rect2(s[0] - Vector2(60, 16), Vector2(120, 26)))
	for t in traces:
		var a0: Vector2 = t[0]; var b0: Vector2 = t[1]; var w0: float = float(t[2]) * float(t[3]) * 0.5 + 8.0
		keep.append(Rect2(Vector2(minf(a0.x, b0.x), minf(a0.y, b0.y)) - Vector2(w0, w0), Vector2(absf(b0.x - a0.x), absf(b0.y - a0.y)) + Vector2(w0, w0) * 2.0))
	keep.append(Rect2(bx0 - 8, top, 200, 30)); keep.append(Rect2(bx0 - 8, bottom, 240, 56))
	_decor(pcb, keep)
	for t in traces:
		var a: Vector2 = t[0]; var b: Vector2 = t[1]; var n: int = t[2]; var gap: float = t[3]; var vert: bool = t[4]
		for i in n:
			var off := (i - (n - 1) / 2.0) * gap
			var pa := _p(a + (Vector2(off, 0) if vert else Vector2(0, off))); var pb := _p(b + (Vector2(off, 0) if vert else Vector2(0, off)))
			draw_line(pa, pb, GYD, maxf(1.8, 2.4 * k)); draw_circle(pa, maxf(1.8, 2.4 * k), GY); draw_circle(pb, maxf(1.8, 2.4 * k), GY)
	for c in chips: _draw_chip(_r(c[0], c[1]), c[2], c[3])
	for s in silk: _txt(s[0], s[1], 9, Color(0.72, 0.75, 0.8, 0.9), s[2])
	# VRMs flanking each accelerator / CPU
	for kind in ["accelerator", "cpu"]:
		for pos in place.get(kind, []):
			var sk0: Vector2 = SOCK[kind]; _vrm(_r(pos + Vector2(0, sk0.y + 6), Vector2(sk0.x, 22)))
	for s in ch.slots:
		var arr: Array = cells.get(s.kind, []); var pos: Array = place.get(s.kind, []); var sk: Vector2 = SOCK.get(s.kind, Vector2(40, 30))
		for i in arr.size():
			if i >= pos.size(): continue
			var p: Vector2 = pos[i]; var id = arr[i]; var it: Dictionary = items.get(id, {}) if id != null else {}
			var rr := _r(p, sk); var vc := Kit.vendor_color(it.get("vendor", "generic")) if not it.is_empty() else Color(0.4, 0.5, 0.6); var filled := not it.is_empty()
			match s.kind:
				"accelerator": _draw_gpu(rr, it, vc) if filled else _socket_frame(rr)
				"cpu": _draw_cpu(rr, it) if filled else _socket_frame(rr)
				"dimm": _draw_dimm(rr, filled, vc)
				"nic": _draw_nic(rr, it, vc, filled, false)
				"dpu": _draw_nic(rr, it, vc, filled, true)
				"nvme": _draw_nvme(rr, filled, vc)
				"psu": _draw_psu(rr, filled)
				"switchchip": _draw_chip(rr, str(it.get("name", "SW")).left(8), true) if filled else _socket_frame(rr, false)
				"coldplate": _heatsink(rr, true) if filled else _socket_frame(rr, false)
				_: _fill(rr, BD); draw_rect(rr, GYD, false, 1.0)
			if filled and s.kind in ["accelerator", "nic", "dpu"]: _txt(p + Vector2(5, sk.y + 12), str(it.name).left(int(sk.x / 6.0)), 9, Color(0.88, 0.92, 0.96))
			if not filled and s.kind in ["accelerator", "cpu", "nic", "dpu"]: _label(rr, "%s%d" % [str(s.kind).to_upper().left(5), i], DK if s.kind in ["accelerator", "cpu"] else GY, 9)
			var selected: bool = sel_kind == s.kind and sel_idx == i
			if selected:
				draw_rect(rr.grow(4.0 * k), Color(1, 1, 1, 0.95), false, 2.5); draw_rect(rr.grow(7.0 * k), Color(0.3, 0.9, 1.0, 0.4), false, 4.0)
			_rects.append({"kind": s.kind, "idx": i, "rect": rr})

func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		for r in _rects:
			if r.rect.grow(4.0).has_point(e.position): socket_clicked.emit(r.kind, r.idx); return
