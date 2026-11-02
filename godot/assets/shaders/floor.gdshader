shader_type spatial;
// Raised-access-floor: 600 mm tiles, seams, a perforated pattern, subtle wear and gloss.
uniform vec2 area = vec2(20.0, 20.0);
uniform vec2 center = vec2(0.0);
uniform vec2 fade = vec2(1e6);
uniform vec4 perf_rect = vec4(0, 0, 0, 0); // x0, z0, x1, z1 in local metres for perforated cold-aisle tiles (unused when zero)
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
	ALBEDO = base; ROUGHNESS = mix(0.28, 0.8, clamp(seam, 0.0, 1.0)); METALLIC = 0.05; SPECULAR = 0.7;
}
