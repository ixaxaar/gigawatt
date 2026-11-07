extends SceneTree
## Audio catalog check: every cue and song loads, buses exist, the director picks tracks per mood.
## run: godot --headless --path godot -s tests/audio_test.gd

func _init() -> void:
	var a := GameAudio.new(); root.add_child(a)
	await process_frame
	var bad := 0
	for k in a.catalog.sfx:
		if a._cue(k) == null: push_error("missing sfx " + k); bad += 1
	for t in a.catalog.music:
		var s := a._load_track(t.id)
		if s == null: push_error("missing track " + t.id); bad += 1
		elif s.get_length() < 30.0: push_error("track too short " + t.id); bad += 1
	for n in ["Music", "SFX", "Ambience"]:
		if AudioServer.get_bus_index(n) == -1: push_error("no bus " + n); bad += 1
	for m in ["title", "play", "crisis"]:
		if a.tracks_for(m).is_empty(): push_error("no track for mood " + m); bad += 1
	a.set_mood("title"); await process_frame
	if a.now.get("id", "") == "": push_error("title mood started nothing"); bad += 1
	a.set_mood("play"); await process_frame
	var first: String = a.now.id
	for i in 6:
		a.next_track(0.1)
		if a.now.id == first and a.tracks_for("play").size() > 1 and i == 0: push_error("repeated the same track"); bad += 1
	a.crisis(0.5); await process_frame
	if not ("crisis" in a.now.moods): push_error("crisis did not switch to a crisis track"); bad += 1
	Settings.music_mode = "off"; a.music_changed()
	for k in ["click", "buy", "good", "bad", "alarm", "nonexistent"]: a.play(k)
	print("AUDIO OK" if bad == 0 else "AUDIO FAIL %d" % bad)
	quit(0 if bad == 0 else 1)
