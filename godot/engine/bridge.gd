class_name Bridge
extends Node
## Client for the headless TypeScript engine (sidecar/bridge.mjs). All game rules live there.

signal changed
var _io: FileAccess
var _pid := -1
var _id := 0
var g: Dictionary = {}
var items: Dictionary = {}
var templates: Array = []
var vendors: Array = []
var models: Array = []
var missions: Array = []
var concepts: Array = []
var _cache: Dictionary = {}
var last_error := ""

func start() -> bool:
	var path := ProjectSettings.globalize_path("res://sidecar/bridge.mjs")
	var p := OS.execute_with_pipe("node", [path])
	if p.is_empty(): last_error = "Could not start node. Install Node.js 18+."; return false
	_io = p.stdio; _pid = p.pid
	var r := _req({"fn": "init"})
	if not r.get("ok", false): last_error = str(r.get("error", "engine init failed")); return false
	var res: Dictionary = r.result
	for it in res.items: items[it.id] = it
	templates = res.templates; vendors = res.vendors; models = res.models; missions = res.missions; concepts = res.concepts
	g = r.game
	return true

func stop() -> void:
	if _pid > 0: OS.kill(_pid)

func _req(d: Dictionary) -> Dictionary:
	_id += 1; d["id"] = _id
	_io.store_line(JSON.stringify(d)); _io.flush()
	var line := _io.get_line()
	var r = JSON.parse_string(line)
	if typeof(r) != TYPE_DICTIONARY: return {"ok": false, "error": "bad reply: " + line.left(120)}
	return r

## Run a store action (mutates the game). Returns the ActionResult dict ({ok,message,issues?}) or {}.
func act(name: String, args: Array = []) -> Dictionary:
	var r := _req({"fn": "act", "name": name, "args": args})
	if not r.get("ok", false): push_error("act %s: %s" % [name, r.get("error", "?")]); return {"ok": false, "message": str(r.get("error", "engine error"))}
	g = r.game; _cache.clear(); changed.emit()
	var res = r.get("result", null)
	return res if typeof(res) == TYPE_DICTIONARY else {"ok": true, "message": ""}

## Run a read-only engine query. Cached until the next act().
func q(name: String, args: Array = []):
	var key := name + JSON.stringify(args)
	if _cache.has(key): return _cache[key]
	var r := _req({"fn": "q", "name": name, "args": args})
	if not r.get("ok", false): push_error("q %s: %s" % [name, r.get("error", "?")]); return null
	_cache[key] = r.get("result"); return _cache[key]

func item(id: String) -> Dictionary: return items.get(id, {})
func template(id: String) -> Dictionary:
	for t in templates:
		if t.id == id: return t
	return {}
func year() -> float: return 2020.0 + float(g.month) / 12.0
func hall(id: String) -> Dictionary:
	for h in g.halls:
		if h.id == id: return h
	return {}

func claim_missions() -> Array:
	var r := _req({"fn": "claim"})
	if not r.get("ok", false): return []
	g = r.game; _cache.clear(); changed.emit(); return r.result
