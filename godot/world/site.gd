class_name Site
extends RefCounted
## The hall's cosmetic surroundings: floor, walls, lighting mood, accent colour and a region name. Chosen before the game starts
## (and changeable from the pause menu), saved in the game state as `site` (ids below), never affecting the simulation.

const FLOORS := [["tile", "Grey access tile"], ["white", "White tile"], ["black", "Black marble"], ["parquet", "Oak parquet"], ["walnut", "Dark walnut"], ["steel", "Steel plate"], ["concrete", "Polished concrete"], ["terrazzo", "Dark terrazzo"], ["checker", "Black and cream checker"], ["antistatic", "Anti-static green"]]
const RACKS := [["black", "Black powder-coat"], ["white", "White"], ["steel", "Brushed steel"], ["graphite", "Graphite grey"]]
const WALLS := [["block", "Painted block"], ["brick", "Red brick"], ["stone", "Rough stone"], ["steel", "Painted steel"], ["glass", "Glass curtain"], ["open", "Open plan (no walls)"]]
const LIGHTS := [["neutral", "Neutral white"], ["cool", "Cool blue"], ["warm", "Warm amber"], ["night", "Night shift"]]
const ACCENTS := [["red", "Red", Color(0.9, 0.08, 0.06)], ["orange", "Orange", Color(1.0, 0.45, 0.05)], ["yellow", "Yellow", Color(1.0, 0.82, 0.1)], ["green", "Green", Color(0.1, 0.85, 0.35)], ["cyan", "Cyan", Color(0.1, 0.75, 1.0)], ["magenta", "Magenta", Color(1.0, 0.2, 0.7)]]
const REGIONS := [["virginia", "Northern Virginia"], ["oregon", "Oregon"], ["frankfurt", "Frankfurt"], ["singapore", "Singapore"], ["reykjavik", "Reykjavik"]]
const DEFAULT := {"floor": "tile", "walls": "block", "light": "neutral", "accent": "red", "rack": "black"}
## The style the hall (and the showroom) is currently using, so the rack models can read the finish without being handed it.
static var current: Dictionary = DEFAULT.duplicate()
## floor id -> [material set, full albedo?, metres per texture repeat, tint, seam strength (the 600 mm panel joints)]
const FLOOR_SET := {"tile": ["floor", false, 1.2, Color.WHITE, 1.0], "white": ["whitetile", true, 2.4, Color(0.78, 0.78, 0.8), 0.6], "black": ["marble", true, 2.4, Color(1.3, 1.3, 1.35), 0.5], "parquet": ["parquet", true, 2.4, Color(1.0, 0.95, 0.9), 0.0],
	"walnut": ["walnut", true, 2.4, Color(1.35, 1.3, 1.25), 0.0], "steel": ["plate", true, 1.8, Color(1.5, 1.5, 1.6), 0.3], "concrete": ["concrete", true, 2.4, Color(0.85, 0.88, 0.95), 0.6], "terrazzo": ["terrazzo", true, 1.8, Color(1.25, 1.25, 1.35), 0.5],
	"checker": ["checker", true, 4.8, Color(1.1, 1.1, 1.1), 0.4], "antistatic": ["antistatic", true, 2.4, Color(0.8, 0.95, 0.85), 0.8]}

static func style_of(g: Dictionary) -> Dictionary:
	var s := DEFAULT.duplicate(); var cur = g.get("site")
	if typeof(cur) == TYPE_DICTIONARY: for k in cur: if s.has(k): s[k] = str(cur[k])
	return s

static func name_of(list: Array, id: String) -> String:
	for e in list:
		if e[0] == id: return e[1]
	return id

static func accent(style: Dictionary) -> Color:
	for a in ACCENTS:
		if a[0] == style.accent: return a[2]
	return ACCENTS[0][2]

## Light mood: ambient colour/energy, key light colour/energy, aisle lamp colours.
static func mood(style: Dictionary) -> Dictionary:
	match style.light:
		"cool": return {"amb": Color(0.3, 0.42, 0.62), "amb_e": 1.25, "key": Color(0.6, 0.78, 1.0), "key_e": 0.95, "cold": Color(0.7, 0.88, 1.0), "hot": Color(0.85, 0.85, 1.0)}
		"warm": return {"amb": Color(0.55, 0.45, 0.35), "amb_e": 1.25, "key": Color(1.0, 0.82, 0.6), "key_e": 0.95, "cold": Color(1.0, 0.88, 0.7), "hot": Color(1.0, 0.7, 0.45)}
		"night": return {"amb": Color(0.2, 0.26, 0.4), "amb_e": 0.55, "key": Color(0.5, 0.6, 0.9), "key_e": 0.35, "cold": Color(0.6, 0.8, 1.0), "hot": Color(1.0, 0.6, 0.35)}
		_: return {"amb": Color(0.36, 0.42, 0.52), "amb_e": 1.25, "key": Color(0.7, 0.8, 1.0), "key_e": 0.95, "cold": Color(0.78, 0.9, 1.0), "hot": Color(1.0, 0.72, 0.5)}

## Point the floor shader at the chosen floor.
static func apply_floor(sm: ShaderMaterial, style: Dictionary) -> void:
	var fs: Array = FLOOR_SET.get(style.floor, FLOOR_SET.tile)
	var ft := HallMaterials.floor_textures(fs[0])
	sm.set_shader_parameter("use_tex", ft.c != null)
	if ft.c != null: sm.set_shader_parameter("tex_c", ft.c); sm.set_shader_parameter("tex_r", ft.r)
	sm.set_shader_parameter("use_normal", ft.n != null)
	if ft.n != null: sm.set_shader_parameter("tex_n", ft.n)
	sm.set_shader_parameter("seam_k", float(fs[4])); sm.set_shader_parameter("full_albedo", bool(fs[1])); sm.set_shader_parameter("tex_scale", float(fs[2])); sm.set_shader_parameter("tint", Vector3(fs[3].r, fs[3].g, fs[3].b))

## Wall material, or null for open plan.
static func wall_material(style: Dictionary) -> Material:
	match style.walls:
		"brick": return HallMaterials.get_mat("brick", 0.35, Color(1.0, 0.95, 0.95), 1.0, 0.0)
		"stone": return HallMaterials.get_mat("stone", 0.3, Color(0.9, 0.92, 1.0), 1.0, 0.0)
		"steel": return HallMaterials.get_mat("steelwall", 0.3, Color(0.9, 1.0, 1.05), 0.8, 0.0)
		"glass":
			var m := StandardMaterial3D.new(); m.albedo_color = Color(0.55, 0.75, 0.95, 0.16); m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; m.roughness = 0.05; m.cull_mode = BaseMaterial3D.CULL_DISABLED; return m
		"open": return null
		_: return HallMaterials.get_mat("wall", 0.3, Color(0.85, 0.88, 0.95), 1.0, 0.0)

## Rack shell finish from the chosen style (black powder-coat, white, brushed steel, graphite).
static func rack_material(style: Dictionary) -> StandardMaterial3D:
	match style.get("rack", "black"):
		"white": return HallMaterials.get_mat("steel", 1.1, Color(3.6, 3.6, 3.8), 0.55, 0.15)
		"steel": return HallMaterials.get_mat("alu", 1.0, Color(1.35, 1.35, 1.4), 0.5, 1.0)
		"graphite": return HallMaterials.get_mat("shell", 0.9, Color(5.0, 5.0, 5.4), 0.7, 0.7)
		_: return HallMaterials.get_mat("shell", 0.9, Color(2.6, 2.6, 2.8), 0.85, 0.8)
