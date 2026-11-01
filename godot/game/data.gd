class_name Data
## Static game data loaded from the JSON exported out of the TypeScript catalog.
static var catalog: Dictionary = {}
static var systems: Array = []
static var _loaded := false

static func _read(path: String):
	var f := FileAccess.open(path, FileAccess.READ)
	return JSON.parse_string(f.get_as_text())

static func load_all() -> void:
	if _loaded: return
	for it in _read("res://data/catalog.json"): catalog[it.id] = it
	systems = _read("res://data/systems.json")
	_loaded = true

static func item(id: String) -> Dictionary: return catalog.get(id, {})
static func system(id: String) -> Dictionary:
	for s in systems:
		if s.id == id: return s
	return {}

static func lerp_curve(pts: Array, x: float) -> float:
	if x <= pts[0][0]: return pts[0][1]
	for i in range(pts.size() - 1):
		if x <= pts[i + 1][0]:
			return lerpf(pts[i][1], pts[i + 1][1], (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]))
	return pts[pts.size() - 1][1]

const GPU_HOUR := [[2020, 1.9], [2021, 1.75], [2022, 1.6], [2023.2, 2.9], [2024, 2.6], [2024.6, 3.0], [2025, 2.8], [2026, 2.6], [2026.8, 3.4], [2027, 3.2], [2028, 3.0]]
static func gpu_hour(year: float) -> float: return lerp_curve(GPU_HOUR, year)

## Curated plant catalogue per cooling class (ids exist in catalog.json).
const PLANT := {
	"air": ["vt-crah-100", "se-uniflair-300", "gen-ahu-1000", "se-chiller-400"],
	"dlc": ["ct-cdu-80", "dl-cdu-150", "ct-cdu-1600", "mv-drycooler-1000"],
	"power": ["vt-powerbar-400", "et-padmount-2500", "et-padmount-5000"],
}
