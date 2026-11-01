extends SceneTree

const MarketLib := preload("res://game/market.gd")


func _init() -> void:
	var ok := true
	var f := FileAccess.open("res://tests/market_golden.json", FileAccess.READ)
	if f == null:
		print("Market golden: FAIL (cannot open market_golden.json)")
		quit(1)
		return
	var g: Dictionary = JSON.parse_string(f.get_as_text())
	var state: Dictionary = g["state"]
	for case in g["cases"]:
		var month := int(case["month"])
		var seed := int(case["seed"])
		var rng := Rng.new(seed)
		var got: Array = MarketLib.generate_contracts(state, month, rng)
		var want: Array = case["contracts"]
		if got.size() != want.size():
			ok = false
			print("MISMATCH month ", month, " seed ", seed, ": count got ", got.size(), " want ", want.size())
			continue
		for i in want.size():
			if not _eq(month, seed, i, "", want[i], got[i]):
				ok = false
	print("Market golden: ", "PASS" if ok else "FAIL")
	quit(0 if ok else 1)


func _eq(month: int, seed: int, idx: int, path: String, want, got) -> bool:
	if typeof(want) == TYPE_DICTIONARY:
		if typeof(got) != TYPE_DICTIONARY:
			print("MISMATCH month ", month, " seed ", seed, " #", idx, " ", path, " got ", got, " want dict")
			return false
		var want_d: Dictionary = want
		var got_d: Dictionary = got
		if want_d.keys().size() != got_d.keys().size():
			print("MISMATCH month ", month, " seed ", seed, " #", idx, " ", path, " key count got ", got_d.keys().size(), " want ", want_d.keys().size())
			return false
		var ok := true
		for k in want_d:
			if not got_d.has(k):
				print("MISMATCH month ", month, " seed ", seed, " #", idx, " missing key ", path, "/", k)
				ok = false
				continue
			if not _eq(month, seed, idx, path + "/" + String(k), want_d[k], got_d[k]):
				ok = false
		return ok
	if typeof(want) == TYPE_FLOAT or typeof(want) == TYPE_INT:
		if typeof(got) != TYPE_FLOAT and typeof(got) != TYPE_INT:
			print("MISMATCH month ", month, " seed ", seed, " #", idx, " ", path, " got ", got, " want ", want)
			return false
		if absf(float(got) - float(want)) > 1e-9:
			print("MISMATCH month ", month, " seed ", seed, " #", idx, " ", path, " got ", got, " want ", want)
			return false
		return true
	if typeof(want) == TYPE_STRING:
		if String(got) != String(want):
			print("MISMATCH month ", month, " seed ", seed, " #", idx, " ", path, " got ", got, " want ", want)
			return false
		return true
	print("MISMATCH month ", month, " seed ", seed, " #", idx, " ", path, " unhandled type ", typeof(want))
	return false
