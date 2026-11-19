shader_type spatial;
// Raised-access-floor: 600 mm tiles, seams, a perforated pattern, subtle wear and gloss.
// Everything is in world metres, so the floor can be split into chunks (the Mobile renderer lights at most 8 omni + 8 spot
// lights per mesh) and every chunk lines up. Seams and perforations are box-filtered by their screen footprint (fwidth),
// so they fade to their average tone instead of shimmering on tiers without MSAA.
uniform vec2 area = vec2(20.0, 20.0);    // kept for older callers; unused
uniform vec2 center = vec2(0.0);         // world xz the edge fade is measured from
uniform vec2 fade = vec2(1e6);
uniform vec4 perf_rect = vec4(0, 0, 0, 0); // x0, z0, x1, z1 in world metres for perforated cold-aisle tiles (unused when zero)
uniform sampler2D tex_c : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D tex_n : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D tex_r : hint_roughness_r, filter_linear_mipmap_anisotropic, repeat_enable;
uniform bool use_tex = false;
uniform bool use_normal = false;
uniform bool full_albedo = false;      // the texture IS the floor (concrete, terrazzo, checker, green) instead of grain over tiles
uniform float tex_scale = 1.2;
uniform float seam_k = 1.0;
uniform vec3 tint = vec3(1.0);
uniform vec2 wall_half = vec2(1e6);    // half size of the building (world metres, around `center`): outside it the floor falls to black
uniform float wall_fall = 2.5;         // metres from the wall line to black
varying vec3 wpos;
void vertex() { wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
// integral of a periodic pulse of width w (period 1) from 0 to x
float pulse_int(float x, float w) { return floor(x) * w + clamp(fract(x), 0.0, w); }
// box-filtered pulse over a footprint of fw: exact coverage, converges to w when the pulse is sub-pixel
float pulse_aa(float x, float w, float fw) {
	fw = max(fw, 1e-4);
	return (pulse_int(x + fw * 0.5, w) - pulse_int(x - fw * 0.5, w)) / fw;
}
void fragment() {
	vec2 p = wpos.xz + vec2(0.3, 0.0);
	vec2 tp = p / 0.6;
	vec2 tile = floor(tp);
	vec2 tfw = fwidth(tp);
	float calm = 1.0 - smoothstep(0.04, 0.15, max(tfw.x, tfw.y));   // per-tile variation fades out once tiles are a few pixels wide (no static at a distance)
	float seam = clamp(pulse_aa(tp.x, 0.015, tfw.x) + pulse_aa(tp.y, 0.015, tfw.y), 0.0, 1.0);
	float wear = (h(tile) - 0.5) * 0.04 * calm + (sin(p.x * 3.0) * sin(p.y * 2.3)) * 0.006;
	vec3 base = vec3(0.15, 0.155, 0.165) + wear;
	// perforations: 12 x 12 holes per tile; sharp up close, their mean tone once a hole is smaller than a pixel
	vec2 hp = tp * 12.0;
	vec2 c = fract(hp) - 0.5;
	float hfw = max(fwidth(hp.x), fwidth(hp.y));
	float hole_sharp = 1.0 - smoothstep(0.28 - hfw * 0.7, 0.28 + hfw * 0.7, length(c));
	float inperf = step(perf_rect.x, wpos.x) * step(wpos.x, perf_rect.z) * step(perf_rect.y, wpos.z) * step(wpos.z, perf_rect.w);
	float hole = mix(hole_sharp, 0.246, smoothstep(0.35, 0.8, hfw)) * inperf;
	base = mix(base, vec3(0.02), hole * 0.85);
	base = mix(base, vec3(0.07), seam);
	vec2 q = (wpos.xz - center);
	float edge = clamp(1.0 - max(smoothstep(fade.x * 0.6, fade.x * 1.6, abs(q.x)), smoothstep(fade.y * 0.5, fade.y * 1.6, abs(q.y))), 0.0, 1.0);
	float out_d = max(abs(q.x) - wall_half.x, abs(q.y) - wall_half.y);
	edge *= 1.0 - smoothstep(0.0, wall_fall, out_d);
	base *= mix(0.02, 1.0, edge);
	float rough = mix(0.42, 0.8, seam);
	if (use_tex) {
		// anti-static vinyl / steel grain, one texture repeat per 1.2 m (two tiles), tinted per tile so no two tiles match
		vec2 tuv = p / 1.2 + vec2(h(tile) * 0.37, h(tile + 7.0) * 0.41);
		if (full_albedo) tuv = p / tex_scale;
		vec3 d = texture(tex_c, tuv).rgb;
		if (full_albedo) {
			vec3 full = d * tint * (1.0 + (0.1 * h(tile + 3.0) - 0.05) * calm);
			base = mix(full * mix(0.02, 1.0, edge), vec3(0.05) * edge, seam * 0.7 * seam_k);
			base = mix(base, vec3(0.02), hole * 0.85);
		} else {
			base *= mix(1.0, mix(0.75, 1.2, dot(d, vec3(0.333))), 0.4 + 0.6 * calm);
			base *= 1.0 + (0.1 * h(tile + 3.0) - 0.05) * calm;
		}
		rough = clamp(rough * (0.6 + 1.1 * texture(tex_r, tuv).r), 0.2, 0.95);
		if (use_normal) NORMAL_MAP = mix(vec3(0.5, 0.5, 1.0), texture(tex_n, tuv).rgb, 0.8 * (1.0 - seam));
	}
	ALBEDO = min(base, vec3(0.7)); ROUGHNESS = rough; METALLIC = 0.0; SPECULAR = 0.5 * edge;
}
