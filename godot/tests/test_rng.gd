extends SceneTree
func _init() -> void:
	var f := FileAccess.open("res://tests/rng_golden.json", FileAccess.READ)
	var g: Dictionary = JSON.parse_string(f.get_as_text())
	var ok := true
	for seed_key in g:
		var r := Rng.new(int(seed_key))
		for i in g[seed_key].size():
			var v := r.next()
			if abs(v - float(g[seed_key][i])) > 1e-12: ok = false; print("MISMATCH seed ", seed_key, " #", i, " got ", v, " want ", g[seed_key][i]); break
	print("RNG golden: ", "PASS" if ok else "FAIL")
	quit(0 if ok else 1)
