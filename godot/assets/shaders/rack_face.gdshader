shader_type spatial;
render_mode cull_disabled;
// One quad = the whole 42U face of a rack: ToR switch, 4U GPU servers, blanks, PDUs, cable looms.
uniform float seed = 1.0;
uniform float fill : hint_range(0.0, 1.0) = 0.85;
uniform vec3 accent = vec3(0.35, 1.0, 0.5);
uniform int state = 0;          // 0 online, 1 commissioning, 2 failed
uniform float heat = 0.0;       // 0..1, thermal view tint (-1 = off)
uniform bool rear = false;

float h11(float x) { return fract(sin(x * 127.1 + seed * 31.7) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 17.3) * 43758.5453); }
float box(vec2 p, vec2 c, vec2 s) { vec2 d = abs(p - c) - s; return 1.0 - step(0.0, max(d.x, d.y)); }

void fragment() {
	vec2 uv = UV;
	float U = 42.0;
	float rows = (1.0 - uv.y) * U;       // 0 at bottom
	float row = floor(rows);
	float lf = fract(rows);               // local y inside a U
	vec3 alb = vec3(0.025);
	float rough = 0.55; float metal = 0.6;
	vec3 em = vec3(0.0);
	float t = TIME;
	// rack posts
	float post = step(uv.x, 0.035) + step(0.965, uv.x);
	// layout from the top: rows 41,40 = ToR switch / patch; then 4U servers; bottom 2U = PDU
	float top_idx = U - 1.0 - row;        // 0 at top
	bool is_switch = top_idx < 1.0;
	bool is_patch = top_idx >= 1.0 && top_idx < 2.0;
	bool is_pdu = row < 2.0;
	float block = floor((top_idx - 2.0) / 4.0);
	float in_block = mod(top_idx - 2.0, 4.0);
	float blocks_total = 9.0;
	bool filled = block < floor(fill * blocks_total + 0.5);
	vec2 bp = vec2(uv.x, (in_block + (1.0 - lf)) / 4.0); // 0..1 across a 4U block
	float edge = smoothstep(0.0, 0.03, lf) * smoothstep(0.0, 0.03, 1.0 - lf);
	if (post > 0.0) { alb = vec3(0.012); metal = 0.9; rough = 0.4; }
	else if (!rear) {
		if (is_switch) {
			alb = vec3(0.05, 0.055, 0.06);
			// 32 ports in two rows
			vec2 pg = vec2(uv.x * 34.0 - 1.0, lf * 2.0);
			vec2 pc = fract(pg);
			float port = box(pc, vec2(0.5, 0.5), vec2(0.34, 0.3)) * step(0.0, pg.x) * step(pg.x, 32.0);
			alb = mix(alb, vec3(0.0), port);
			float led = box(pc, vec2(0.5, 0.9), vec2(0.1, 0.05)) * step(0.0, pg.x) * step(pg.x, 32.0);
			float on = step(0.4, fract(sin(floor(pg.x) * 3.1 + floor(pg.y) * 7.7 + floor(t * (1.0 + h21(vec2(floor(pg.x), 1.0)))) * 1.3 + seed) * 999.0));
			em += led * on * vec3(0.2, 1.0, 0.4) * 2.0 * (state == 2 ? 0.0 : 1.0);
		} else if (is_patch) {
			alb = vec3(0.04);
			float jacks = step(0.5, fract(uv.x * 48.0)) * box(vec2(fract(uv.x * 24.0), lf), vec2(0.5, 0.5), vec2(0.28, 0.3));
			alb = mix(alb, vec3(0.1, 0.1, 0.11), jacks);
			// fibre pigtails in yellow / blue
			float pig = step(0.88, sin(uv.x * 220.0) * 0.5 + 0.5) * step(0.25, lf) * step(lf, 0.75);
			alb = mix(alb, mix(vec3(0.85, 0.7, 0.1), vec3(0.1, 0.4, 0.8), step(0.5, h21(vec2(floor(uv.x * 35.0), 3.0)))), pig * 0.8);
		} else if (is_pdu) {
			alb = vec3(0.03, 0.03, 0.035);
			float o = step(0.5, fract(uv.x * 20.0)) * box(vec2(fract(uv.x * 10.0), lf), vec2(0.5, 0.5), vec2(0.25, 0.28));
			alb = mix(alb, vec3(0.0), o);
			em += box(uv, vec2(0.12, 0.5 / U), vec2(0.02, 0.2 / U)) * vec3(0.1, 1.0, 0.3) * 1.5;
		} else if (filled) {
			alb = vec3(0.055, 0.058, 0.065);
			float body = 1.0;
			// left ear + right ear
			float ear = step(bp.x, 0.07) + step(0.93, bp.x);
			alb = mix(alb, vec3(0.1, 0.105, 0.115), ear);
			// vent grille: staggered hex-ish dots in the middle
			vec2 gp = vec2(bp.x * 70.0, bp.y * 30.0 + (floor(bp.x * 70.0) * 0.5));
			vec2 gc = fract(gp) - 0.5;
			float hole = step(length(gc), 0.28) * step(0.22, bp.x) * step(bp.x, 0.78) * step(0.08, bp.y) * step(bp.y, 0.92);
			alb = mix(alb, vec3(0.0), hole * 0.9);
			// 2 rows of drive bays on the left
			vec2 dp = vec2((bp.x - 0.09) / 0.12 * 4.0, bp.y * 2.0);
			float bay = step(0.09, bp.x) * step(bp.x, 0.21) * box(fract(dp), vec2(0.5, 0.5), vec2(0.4, 0.34));
			alb = mix(alb, vec3(0.012), bay);
			float bled = step(0.09, bp.x) * step(bp.x, 0.21) * box(fract(dp), vec2(0.82, 0.5), vec2(0.07, 0.08));
			float blink = step(0.55, fract(sin(floor(dp.x) * 11.0 + floor(dp.y) * 5.0 + floor(t * (2.0 + h21(vec2(block, floor(dp.x)))) * 3.0) + block * 13.0) * 777.0));
			em += bled * (0.25 + blink) * vec3(0.15, 0.6, 1.0) * 2.0;
			// accent ear LEDs + power button
			float ac = box(bp, vec2(0.965, 0.25), vec2(0.018, 0.045)) + box(bp, vec2(0.965, 0.5), vec2(0.018, 0.045)) + box(bp, vec2(0.965, 0.75), vec2(0.018, 0.045));
			float pulse = 0.65 + 0.35 * sin(t * 2.0 + block * 1.7 + seed);
			vec3 lc = accent;
			if (state == 1) { lc = vec3(1.0, 0.65, 0.1); pulse = step(0.5, fract(t * 1.5 + block * 0.2)); }
			if (state == 2) { lc = vec3(1.0, 0.1, 0.08); pulse = (block == 2.0) ? 1.0 : 0.15; }
			em += ac * lc * pulse * 2.4;
			// vendor stripe
			em += box(bp, vec2(0.5, 0.03), vec2(0.44, 0.012)) * accent * 0.25;
			alb *= edge * 0.6 + 0.4;
		} else {
			// blanking panel
			alb = vec3(0.022, 0.024, 0.027) * (0.8 + 0.2 * step(0.5, fract(uv.x * 3.0)));
			rough = 0.8; metal = 0.1;
		}
	} else {
		// rear: fans + PSUs + cable looms
		if (is_switch || is_patch || is_pdu) {
			alb = vec3(0.03);
			float cab = step(0.55, sin(uv.x * 90.0 + h21(vec2(row, 2.0)) * 6.0) * 0.5 + 0.5);
			alb = mix(alb, mix(vec3(0.06, 0.06, 0.07), vec3(0.8, 0.5, 0.05), step(0.7, h21(vec2(floor(uv.x * 20.0), row)))), cab * 0.7);
		} else if (filled) {
			alb = vec3(0.045, 0.048, 0.054);
			// fan wall top 2/3, PSUs bottom
			float fans = step(0.34, bp.y);
			vec2 fp = vec2(bp.x * 8.0, (bp.y - 0.34) / 0.66 * 2.0);
			vec2 fc = fract(fp) - 0.5;
			float disc = step(length(fc), 0.42) * fans;
			float ring = step(0.12, length(fc)) * disc;
			alb = mix(alb, vec3(0.012), disc);
			alb = mix(alb, vec3(0.05), ring * step(0.5, fract(atan(fc.y, fc.x) * 2.0 + t * (state == 2 ? 0.0 : 4.0))));
			float psu = (1.0 - fans) * box(vec2(fract(bp.x * 4.0), bp.y / 0.34), vec2(0.5, 0.5), vec2(0.42, 0.38));
			alb = mix(alb, vec3(0.1, 0.1, 0.11), psu);
			em += (1.0 - fans) * box(vec2(fract(bp.x * 4.0), bp.y / 0.34), vec2(0.8, 0.5), vec2(0.05, 0.1)) * (state == 2 ? vec3(1.0, 0.1, 0.1) : vec3(0.2, 1.0, 0.3)) * 1.8;
			float noodle = step(0.9, sin(uv.x * 150.0 + block * 2.0) * 0.5 + 0.5) * (1.0 - fans) * 0.0;
		} else {
			alb = vec3(0.02);
		}
		// vertical cable looms down the posts
		float loom = step(uv.x, 0.09) * (0.5 + 0.5 * sin(uv.y * 400.0)) + step(0.91, uv.x) * (0.5 + 0.5 * sin(uv.y * 400.0 + 2.0));
		alb = mix(alb, mix(vec3(0.02), vec3(0.15, 0.15, 0.4), step(0.5, h11(floor(uv.y * 40.0)))), clamp(loom, 0.0, 1.0) * step(0.5, h11(seed)));
	}
	if (heat >= 0.0) {
		vec3 hc = mix(vec3(0.1, 0.8, 0.3), vec3(1.0, 0.15, 0.05), clamp(heat, 0.0, 1.0));
		alb = mix(alb, hc * 0.5, 0.55); em = mix(em, hc * 1.2, 0.2);
	}
	ALBEDO = alb * 2.6; ROUGHNESS = rough; METALLIC = min(metal, 0.45); EMISSION = em;
}
