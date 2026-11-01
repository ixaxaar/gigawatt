class_name Rng
## mulberry32, bit-exact with src/sim/rng.ts.
var a: int
func _init(seed_: int) -> void:
	a = seed_ & 0xFFFFFFFF
func next() -> float:
	a = (a + 0x6D2B79F5) & 0xFFFFFFFF
	var t := a
	t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
	t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF)) & 0xFFFFFFFF
	return float((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
func range_(lo: float, hi: float) -> float: return lo + next() * (hi - lo)
func int_(lo: int, hi: int) -> int: return int(floor(lo + next() * (hi - lo + 1)))
func chance(p: float) -> bool: return next() < p
func pick(arr: Array): return arr[min(arr.size() - 1, int(floor(next() * arr.size())))]
