class_name HallMaterials
extends RefCounted
## PBR material library for the hall (CC0 sets from ambientCG, see CREDITS.md). Boxes have no authored UVs, so every
## material is triplanar in world space; scale is "repeats per metre". Texture size, normal maps and anisotropy follow the quality tier.

const DIR := "res://assets/materials/"
static var _tex := {}
static var _mats := {}
static var _tier_key := ""

## Drop cached textures and materials (call after the quality tier changes).
static func reset() -> void:
	_tex.clear(); _mats.clear(); _tier_key = ""

static func _load(name: String, kind: String) -> Texture2D:
	var path := "%s%s_%s.webp" % [DIR, name, kind]
	if not ResourceLoader.exists(path): return null
	var key := path + str(int(Settings.tier().tex))
	if _tex.has(key): return _tex[key]
	var t: Texture2D = load(path)
	if t != null and int(Settings.tier().tex) <= 512:   # Potato: half-size copy to save memory and bandwidth
		var img := t.get_image()
		if img != null:
			if img.is_compressed(): img.decompress()
			img.resize(512, 512, Image.INTERPOLATE_BILINEAR); img.generate_mipmaps(); t = ImageTexture.create_from_image(img)
	_tex[key] = t; return t

## name: shell | steel | alu | plate | floor | wall | rubber. tint multiplies the albedo; rough/metal scale the maps.
static func get_mat(name: String, per_m := 1.0, tint := Color.WHITE, rough := 1.0, metal := 1.0) -> StandardMaterial3D:
	var k := "%s|%s|%s|%s|%s|%s" % [name, per_m, tint.to_html(), rough, metal, Settings.quality]
	if _mats.has(k): return _mats[k]
	var m := StandardMaterial3D.new(); m.albedo_color = tint
	var c := _load(name, "c")
	if c != null: m.albedo_texture = c
	var tier := Settings.tier()
	if tier.normal_maps:
		var n := _load(name, "n")
		if n != null: m.normal_enabled = true; m.normal_texture = n; m.normal_scale = 1.0
	var r := _load(name, "r")
	if r != null: m.roughness_texture = r; m.roughness = rough
	var mt := _load(name, "m")
	if mt != null: m.metallic_texture = mt; m.metallic = metal; m.metallic_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_RED
	m.uv1_triplanar = true; m.uv1_world_triplanar = true; m.uv1_scale = Vector3(per_m, per_m, per_m)
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC if tier.aniso else BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	if name == "alu": m.anisotropy_enabled = tier.aniso; m.anisotropy = 0.6
	_mats[k] = m; return m

static func floor_textures() -> Dictionary:
	return {"c": _load("floor", "c"), "n": _load("floor", "n") if Settings.tier().normal_maps else null, "r": _load("floor", "r")}
