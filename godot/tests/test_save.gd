extends SceneTree
func _init() -> void:
	var a := Sim.new(); a.new_game(5, "operator")
	for i in 30:
		if not a.s.incident.is_empty(): a.resolve_incident(0)
		a.advance()
	a.save_game()
	var b := Sim.new(); var ok := b.load_game()
	for i in 12:
		if not a.s.incident.is_empty(): a.resolve_incident(0)
		if not b.s.incident.is_empty(): b.resolve_incident(0)
		a.advance(); b.advance()
	print("SAVE/LOAD ", "PASS" if ok and is_equal_approx(a.s.cash, b.s.cash) and a.s.month == b.s.month and typeof(b.s.month) == TYPE_INT else "FAIL", " ", a.s.cash, " ", b.s.cash)
	quit(0)
