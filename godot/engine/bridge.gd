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

## Find a file shipped next to the game: <exe dir>/<rel>, or <app>.app/Contents/Resources/<rel> on macOS.
static func _shipped(rel: String) -> String:
	var dir := OS.get_executable_path().get_base_dir()
	for base in [dir, dir.path_join("../Resources").simplify_path()]:
		var f: String = base.path_join(rel)
		if FileAccess.file_exists(f): return f
	return ""

func start() -> bool:
	var path := _shipped("sidecar/bridge.mjs")
	if path == "": path = ProjectSettings.globalize_path("res://sidecar/bridge.mjs")  # running from the editor
	var node := _shipped("runtime/node.exe" if OS.get_name() == "Windows" else "runtime/node")
	if node == "": node = "node"                                                       # fall back to system Node
	var saves := ProjectSettings.globalize_path("user://saves")   # saves live in the user data folder so they survive quitting
	DirAccess.make_dir_recursive_absolute(saves)
	var p := OS.execute_with_pipe(node, [path, saves])
	if p.is_empty(): last_error = "Could not start the engine (%s). Install Node.js 18+ or use the packaged release." % node; return false
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

static var _perf := OS.has_environment("GW_PERF")
static var req_n := 0
static var req_us := 0
func _req(d: Dictionary) -> Dictionary:
	_id += 1; d["id"] = _id
	var t0 := Time.get_ticks_usec()
	_io.store_line(JSON.stringify(d)); _io.flush()
	var line := _io.get_line()
	var t1 := Time.get_ticks_usec()
	var r = JSON.parse_string(line)
	req_n += 1; req_us += Time.get_ticks_usec() - t0
	if _perf and (Time.get_ticks_usec() - t0) > 8000: print("PERFREQ %s %s wait=%.1fms parse=%.1fms bytes=%d" % [d.get("fn"), d.get("name", ""), (t1 - t0) / 1000.0, (Time.get_ticks_usec() - t1) / 1000.0, line.length()])
	if typeof(r) != TYPE_DICTIONARY: return {"ok": false, "error": "bad reply: " + line.left(120)}
	return r

## Run a store action (mutates the game). Returns the ActionResult dict ({ok,message,issues?}) or {}.
func act(name: String, args: Array = []) -> Dictionary:
	var r := _req({"fn": "act", "name": name, "args": args})
	if not r.get("ok", false): push_error("act %s: %s" % [name, r.get("error", "?")]); return {"ok": false, "message": str(r.get("error", "engine error"))}
	g = r.game; _cache.clear(); changed.emit()
	var res = r.get("result", null)
	return res if typeof(res) == TYPE_DICTIONARY else {"ok": true, "message": ""}

## Agent-environment call (reset / step / ...): used by screenshot tooling to load scenarios into the UI.
func env(name: String, args: Array = []):
	var r := _req({"fn": "env", "name": name, "args": args})
	if r.get("ok", false) and r.has("game"): g = r.game; _cache.clear(); changed.emit()
	return r.get("result")

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
