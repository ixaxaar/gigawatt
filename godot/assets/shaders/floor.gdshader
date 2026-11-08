shader_type spatial;
// Raised-access-floor: 600 mm tiles, seams, a perforated pattern, subtle wear and gloss.
uniform vec2 area = vec2(20.0, 20.0);
uniform vec2 center = vec2(0.0);
uniform vec2 fade = vec2(1e6);
uniform vec4 perf_rect = vec4(0, 0, 0, 0); // x0, z0, x1, z1 in local metres for perforated cold-aisle tiles (unused when zero)
uniform sampler2D tex_c : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D tex_n : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D tex_r : hint_roughness_r, filter_linear_mipmap_anisotropic, repeat_enable;
uniform bool use_tex = false;
uniform bool use_normal = false;
uniform bool full_albedo = false;      // the texture IS the floor (concrete, terrazzo, checker, green) instead of grain over tiles
uniform float tex_scale = 1.2;
uniform float seam_k = 1.0;
uniform vec3 tint = vec3(1.0);
varying vec3 wpos;
void vertex() { wpos = VERTEX; }
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void fragment() {
	vec2 p = UV * area;
	vec2 tile = floor(p / 0.6);
	vec2 f = fract(p / 0.6);
	float seam = step(f.x, 0.012) + step(f.y, 0.012);
	float wear = h(tile) * 0.06 + (sin(p.x * 3.0) * sin(p.y * 2.3)) * 0.01;
	vec3 base = vec3(0.30, 0.31, 0.33) + wear;
	vec2 c = fract(p / 0.6 * 12.0) - 0.5;
	float inperf = step(perf_rect.x, wpos.x) * step(wpos.x, perf_rect.z) * step(perf_rect.y, wpos.z) * step(wpos.z, perf_rect.w);
	float hole = step(length(c), 0.28) * inperf;
	base = mix(base, vec3(0.02), hole * 0.9);
	base = mix(base, vec3(0.08), clamp(seam, 0.0, 1.0));
	vec2 q = (wpos.xz - center);
	float edge = clamp(1.0 - max(smoothstep(fade.x * 0.6, fade.x * 1.6, abs(q.x)), smoothstep(fade.y * 0.5, fade.y * 1.6, abs(q.y))), 0.0, 1.0);
	base *= mix(0.12, 1.0, edge);
	float rough = mix(0.34, 0.8, clamp(seam, 0.0, 1.0));
	if (use_tex) {
		// anti-static vinyl / steel grain, one texture repeat per 1.2 m (two tiles), tinted per tile so no two tiles match
		vec2 tuv = p / 1.2 + vec2(h(tile) * 0.37, h(tile + 7.0) * 0.41);
		if (full_albedo) tuv = p / tex_scale;
		vec3 d = texture(tex_c, tuv).rgb;
		if (full_albedo) {
			vec3 full = d * tint * (0.94 + 0.12 * h(tile + 3.0));
			base = mix(full * mix(0.12, 1.0, edge), vec3(0.06), clamp(seam, 0.0, 1.0) * 0.7 * seam_k);
			base = mix(base, vec3(0.02), hole * 0.9);
		} else {
			base *= mix(0.6, 1.35, dot(d, vec3(0.333)));
			base *= 0.92 + 0.16 * h(tile + 3.0);
		}
		rough = clamp(rough * (0.6 + 1.1 * texture(tex_r, tuv).r), 0.12, 0.95);
		if (use_normal) NORMAL_MAP = mix(vec3(0.5, 0.5, 1.0), texture(tex_n, tuv).rgb, 0.8 * (1.0 - clamp(seam, 0.0, 1.0)));
		// scuffed aisles: slightly glossier worn strip along every tile row centre line
	}
	ALBEDO = base; ROUGHNESS = rough; METALLIC = 0.05; SPECULAR = 0.7;
}
