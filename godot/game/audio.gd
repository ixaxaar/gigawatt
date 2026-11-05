class_name GameAudio
extends Node
## Procedural audio: low datacenter hum (looped noise + 120 Hz) and short UI cues. No asset files.
var _cues: Dictionary = {}
var _players: Array[AudioStreamPlayer] = []
var muted := false

func _ready() -> void:
	for i in 6:
		var p := AudioStreamPlayer.new(); p.volume_db = -9.0; add_child(p); _players.append(p)
	_cues["click"] = _tone([[900.0, 0.03]], 0.25)
	_cues["buy"] = _tone([[520.0, 0.06], [780.0, 0.09]], 0.3)
	_cues["good"] = _tone([[660.0, 0.07], [880.0, 0.07], [1100.0, 0.12]], 0.3)
	_cues["bad"] = _tone([[300.0, 0.12], [220.0, 0.2]], 0.35)
	_cues["incident"] = _tone([[440.0, 0.1], [0.0, 0.05], [440.0, 0.1], [330.0, 0.25]], 0.35)
	_cues["month"] = _tone([[200.0, 0.04]], 0.12)
	_cues["sell"] = _tone([[1040.0, 0.05], [1380.0, 0.05], [1760.0, 0.09]], 0.28)
	_cues["online"] = _tone([[392.0, 0.08], [523.0, 0.08], [659.0, 0.08], [784.0, 0.16]], 0.3)
	_cues["alarm"] = _tone([[880.0, 0.12], [660.0, 0.12], [880.0, 0.12], [660.0, 0.2]], 0.4)
	_cues["gameover"] = _tone([[392.0, 0.25], [330.0, 0.25], [262.0, 0.5]], 0.4)
	var hum := AudioStreamPlayer.new(); hum.stream = _hum(); hum.volume_db = -24.0; add_child(hum); hum.play()

func play(kind: String) -> void:
	if muted or not _cues.has(kind): return
	for p in _players:
		if not p.playing: p.stream = _cues[kind]; p.play(); return

func _wav(data: PackedByteArray, loop := false) -> AudioStreamWAV:
	var w := AudioStreamWAV.new(); w.format = AudioStreamWAV.FORMAT_16_BITS; w.mix_rate = 22050; w.data = data
	if loop: w.loop_mode = AudioStreamWAV.LOOP_FORWARD; w.loop_end = data.size() / 2
	return w

func _tone(notes: Array, vol: float) -> AudioStreamWAV:
	var d := PackedByteArray()
	for n in notes:
		var cnt := int(22050 * n[1])
		for i in cnt:
			var env := 1.0 - float(i) / cnt
			var v := sin(TAU * n[0] * i / 22050.0) * env * vol if n[0] > 0.0 else 0.0
			d.append_array(_s16(v))
	return _wav(d)

func _hum() -> AudioStreamWAV:
	var d := PackedByteArray(); var lp := 0.0; var rng := RandomNumberGenerator.new(); rng.seed = 7
	var n := 22050 * 4
	for i in n:
		lp += (rng.randf_range(-1, 1) - lp) * 0.04
		var v := lp * 0.55 + sin(TAU * 120.0 * i / 22050.0) * 0.06 + sin(TAU * 60.0 * i / 22050.0) * 0.05
		d.append_array(_s16(v))
	return _wav(d, true)

func _s16(v: float) -> PackedByteArray:
	var b := PackedByteArray(); b.resize(2); b.encode_s16(0, int(clampf(v, -1.0, 1.0) * 32000.0)); return b
