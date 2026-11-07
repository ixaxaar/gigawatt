class_name GameAudio
extends Node
## Game audio: SFX cues, a genre-wise 8-bit music catalog with a mood director, and a quiet datacenter hum.
## Assets are rendered offline by tools/audio/generate.py into res://assets/audio (catalog.json lists them).
## Buses: Master > Music, SFX, Ambience (created at runtime). Volumes come from Settings.

signal track_changed(info: Dictionary)

const DIR := "res://assets/audio/"
var muted := false
var catalog := {"sfx": {}, "music": []}
var _cues: Dictionary = {}
var _last_play: Dictionary = {}          # cue -> msec, to rate-limit bursts (hover sweeps, rapid clicks)
var _voices: Array[AudioStreamPlayer] = []
var _tracks: Dictionary = {}              # id -> AudioStream
var _mus: Array[AudioStreamPlayer] = []   # two players, crossfaded
var _cur := 0
var mood := "title"                       ## title | play | crisis ...
var now: Dictionary = {}                  ## currently playing catalog entry ({} when silent)
var _history: Array = []
var _crisis_until := 0.0
var _hum: AudioStreamPlayer
var rng := RandomNumberGenerator.new()

func _ready() -> void:
	rng.randomize()
	_setup_buses()
	var f := FileAccess.open(DIR + "catalog.json", FileAccess.READ)
	if f != null:
		var j: Variant = JSON.parse_string(f.get_as_text())
		if j is Dictionary: catalog = j
	for i in 14:
		var p := AudioStreamPlayer.new(); p.bus = "SFX"; add_child(p); _voices.append(p)
	for i in 2:
		var m := AudioStreamPlayer.new(); m.bus = "Music"; m.volume_db = -80.0; m.finished.connect(_on_track_end.bind(i)); add_child(m); _mus.append(m)
	_hum = AudioStreamPlayer.new(); _hum.bus = "Ambience"; _hum.stream = _make_hum(); _hum.volume_db = -26.0; add_child(_hum); _hum.play()
	apply_volumes()

func _setup_buses() -> void:
	for n in ["Music", "SFX", "Ambience"]:
		if AudioServer.get_bus_index(n) == -1:
			AudioServer.add_bus(); var i := AudioServer.get_bus_count() - 1
			AudioServer.set_bus_name(i, n); AudioServer.set_bus_send(i, "Master")

func apply_volumes() -> void:
	_set_bus("Music", Settings.music_volume * (0.0 if Settings.music_mode == "off" else 1.0), -5.0)
	_set_bus("SFX", Settings.sfx_volume, 0.0)
	_set_bus("Ambience", Settings.sfx_volume, 0.0)

func _set_bus(n: String, lin: float, trim_db: float) -> void:
	var i := AudioServer.get_bus_index(n)
	if i != -1: AudioServer.set_bus_volume_db(i, linear_to_db(maxf(lin, 0.0001)) + trim_db)

func toggle_mute() -> void:
	muted = not muted; AudioServer.set_bus_mute(0, muted)

# ---------- SFX ----------
func _cue(kind: String) -> AudioStream:
	if _cues.has(kind): return _cues[kind]
	var path := DIR + "sfx/%s.wav" % kind
	var s: AudioStream = load(path) if ResourceLoader.exists(path) else null
	_cues[kind] = s
	return s

## Play a cue by name. Legacy aliases (the old procedural names) keep working.
func play(kind: String) -> void:
	if muted: return
	var s := _cue(kind)
	if s == null: return
	var meta: Dictionary = catalog.sfx.get(kind, {})
	var t := Time.get_ticks_msec()
	if t - int(_last_play.get(kind, -1000)) < (35 if meta.get("jitter", false) else 60): return
	_last_play[kind] = t
	var p: AudioStreamPlayer = null
	for v in _voices:
		if not v.playing: p = v; break
	if p == null: p = _voices[0]
	p.stream = s; p.volume_db = float(meta.get("db", -8)); p.pitch_scale = rng.randf_range(0.96, 1.05) if meta.get("jitter", false) else 1.0; p.play()

## Wire click / hover / toggle sounds onto every button in the tree, now and as nodes appear.
func hook_ui(tree: SceneTree) -> void:
	tree.node_added.connect(_wire)

func _wire(n: Node) -> void:
	if n is OptionButton:
		n.item_selected.connect(func(_i): play("tab")); n.mouse_entered.connect(func(): play("hover"))
	elif n is CheckBox or n is CheckButton:
		n.toggled.connect(func(on): play("toggle_on" if on else "toggle_off"))
	elif n is Button:
		if n.get_meta("silent", false): return
		n.pressed.connect(func(): play("confirm" if n.get_meta("kind", "") == "go" else ("cancel" if n.get_meta("kind", "") == "danger" else "click")))
		n.mouse_entered.connect(func(): if not n.disabled: play("hover"))
	elif n is HSlider:
		n.value_changed.connect(func(_v): play("tick"))
	elif n is TabBar:
		n.tab_changed.connect(func(_i): play("tab"))

# ---------- music ----------
func tracks_for(m: String) -> Array:
	return catalog.music.filter(func(t): return m in t.moods)

func _load_track(id: String) -> AudioStream:
	if _tracks.has(id): return _tracks[id]
	for t in catalog.music:
		if t.id == id:
			var s: AudioStream = load(DIR + t.file) if ResourceLoader.exists(DIR + t.file) else null
			_tracks[id] = s; return s
	return null

## Start (or crossfade to) a track by catalog id.
func play_track(id: String, fade := 2.5) -> void:
	var s := _load_track(id)
	if s == null: return
	var info := {}
	for t in catalog.music: if t.id == id: info = t
	if now.get("id", "") == id and _mus[_cur].playing: return
	if "loop" in s: s.loop = Settings.music_mode != "auto" and Settings.music_mode != "off"
	var old := _mus[_cur]; _cur = 1 - _cur; var nw := _mus[_cur]
	nw.stream = s; nw.volume_db = -60.0; nw.play()
	var tw := create_tween().set_parallel(true)
	tw.tween_property(nw, "volume_db", 0.0, fade)
	if old.playing:
		tw.tween_property(old, "volume_db", -60.0, fade)
		tw.chain().tween_callback(old.stop)
	now = info; _history.append(id); if _history.size() > 4: _history.pop_front()
	track_changed.emit(info)

func stop_music(fade := 1.5) -> void:
	for m in _mus:
		if m.playing:
			var tw := create_tween(); tw.tween_property(m, "volume_db", -60.0, fade); tw.tween_callback(m.stop)
	now = {}

## Pick the next track for the current mood (avoids immediate repeats), honouring the player's genre lock.
func next_track(fade := 2.5) -> void:
	if Settings.music_mode == "off": return
	var pool: Array = []
	if Settings.music_mode != "auto":
		for t in catalog.music: if t.id == Settings.music_mode: pool = [t]
	if pool.is_empty(): pool = tracks_for(mood)
	if pool.is_empty(): pool = tracks_for("play")
	pool = pool.filter(func(t): return not (t.id in _history.slice(-2)))
	if pool.is_empty(): pool = tracks_for(mood) if not tracks_for(mood).is_empty() else catalog.music
	if pool.is_empty(): return
	play_track(pool[rng.randi() % pool.size()].id, fade)

func _on_track_end(i: int) -> void:
	if i == _cur and Settings.music_mode == "auto": next_track(1.0)
	elif i == _cur and Settings.music_mode != "off": _mus[i].play()   # locked genre: loop

## Called by the game: "title" on the menu, "play" in a session. Crisis overrides for a while after an alarm.
func set_mood(m: String) -> void:
	if m == mood and now.size() > 0: return
	mood = m
	if Settings.music_mode == "off": return
	if m == "play" and not _crisis_active() or m == "title" or m == "crisis": next_track(2.0 if m != "crisis" else 0.8)

func crisis(seconds := 50.0) -> void:
	_crisis_until = Time.get_ticks_msec() / 1000.0 + seconds
	if mood != "crisis" and Settings.music_mode == "auto": set_mood("crisis")

func _crisis_active() -> bool:
	return Time.get_ticks_msec() / 1000.0 < _crisis_until

func _process(_d: float) -> void:
	if mood == "crisis" and not _crisis_active():
		mood = "play"; if Settings.music_mode == "auto": next_track(2.5)

func music_changed() -> void:
	## Settings changed the mode: switch immediately.
	apply_volumes()
	if Settings.music_mode == "off": stop_music(0.6)
	else: next_track(1.2)

# ---------- ambience ----------
func _make_hum() -> AudioStreamWAV:
	var d := PackedByteArray(); d.resize(22050 * 4 * 2); var lp := 0.0; var r := RandomNumberGenerator.new(); r.seed = 7
	var n := 22050 * 4
	for i in n:
		lp += (r.randf_range(-1, 1) - lp) * 0.04
		var v := lp * 0.55 + sin(TAU * 120.0 * i / 22050.0) * 0.06 + sin(TAU * 60.0 * i / 22050.0) * 0.05
		d.encode_s16(i * 2, int(clampf(v, -1.0, 1.0) * 32000.0))
	var w := AudioStreamWAV.new(); w.format = AudioStreamWAV.FORMAT_16_BITS; w.mix_rate = 22050; w.data = d
	w.loop_mode = AudioStreamWAV.LOOP_FORWARD; w.loop_end = n
	return w
