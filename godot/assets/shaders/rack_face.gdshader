shader_type spatial;
render_mode cull_disabled;
// One quad = the whole 42U face of a rack: ToR switch, 4U GPU servers, blanks, PDUs, cable looms.
// Every procedural edge is filtered by its screen footprint (fwidth): features smaller than a pixel fade to their
// average tone instead of aliasing, so the face reads cleanly on tiers without MSAA (Low, Potato, Mobile).
uniform int lod = 0;            // cap: 0 full detail, 1 no vent grille / drive bays, 2 flat
instance uniform float seed = 1.0;
instance uniform float fill : hint_range(0.0, 1.0) = 0.85;
instance uniform vec3 accent = vec3(0.35, 1.0, 0.5);
instance uniform int state = 0;          // 0 online, 1 commissioning, 2 failed
instance uniform float heat = 0.0;       // 0..1, thermal view (-1 = off)
instance uniform bool rear = false;
// MultiMesh mode (the hall): the per-rack values come from the instance colour (accent) and custom data
// (seed, fill, state + 8 for the rear face, heat) instead of the instance uniforms above, so every face is one draw call.
uniform bool mm = false;
varying flat vec4 v_dat;
varying flat vec3 v_acc;
varying flat vec2 v_flag;   // x = state, y = rear

float h11s(float x, float sd) { return fract(sin(x * 127.1 + sd * 31.7) * 43758.5453); }
float h21s(vec2 p, float sd) { return fract(sin(dot(p, vec2(127.1, 311.7)) + sd * 17.3) * 43758.5453); }

void vertex() {
	if (mm) {
		float sr = INSTANCE_CUSTOM.z + 0.5;
		float r = step(8.0, sr);
		v_dat = vec4(INSTANCE_CUSTOM.x, INSTANCE_CUSTOM.y, 0.0, INSTANCE_CUSTOM.w);
		v_flag = vec2(floor(sr - r * 8.0), r);
		v_acc = COLOR.rgb;
	} else {
		v_dat = vec4(seed, fill, 0.0, heat);
		v_flag = vec2(float(state), rear ? 1.0 : 0.0);
		v_acc = accent;
	}
}
// anti-aliased rectangle: p in some cell space, fw = footprint of one pixel in that space (from the un-wrapped coordinate)
float boxa(vec2 p, vec2 c, vec2 s, vec2 fw) {
	vec2 d = abs(p - c) - s; vec2 w = fw * 0.5 + 1e-5;
	vec2 e = 1.0 - smoothstep(-w, w, d);
	return e.x * e.y;
}
// anti-aliased step: 0 below edge, 1 above
float stepa(float edge, float x, float fw) { return clamp((x - edge) / max(fw, 1e-5) + 0.5, 0.0, 1.0); }
// fades a high-frequency pattern to its mean when its cell gets close to a pixel
float lodfade(float cells_per_px) { return 1.0 - smoothstep(0.3, 0.7, cells_per_px); }
// blue -> green -> yellow -> red
vec3 heat_ramp(float t) {
	t = clamp(t, 0.0, 1.0);
	vec3 c0 = vec3(0.12, 0.4, 1.0); vec3 c1 = vec3(0.1, 0.9, 0.35); vec3 c2 = vec3(1.0, 0.85, 0.1); vec3 c3 = vec3(1.0, 0.15, 0.05);
	if (t < 0.333) return mix(c0, c1, t / 0.333);
	if (t < 0.666) return mix(c1, c2, (t - 0.333) / 0.333);
	return mix(c2, c3, (t - 0.666) / 0.334);
}

void fragment() {
	float seed_ = v_dat.x; float fill_ = v_dat.y; float heat_ = v_dat.w; vec3 accent_ = v_acc;
	int state_ = int(v_flag.x + 0.5); bool rear_ = v_flag.y > 0.5;
	vec2 uv = UV;
	vec2 fuv = fwidth(uv);
	float U = 42.0;
	float rows = (1.0 - uv.y) * U;       // 0 at bottom
	float row = floor(rows);
	float lf = fract(rows);               // local y inside a U
	float flf = fuv.y * U;                // pixel footprint in U
	vec3 alb = vec3(0.025);
	float rough = 0.55; float metal = 0.4;
	vec3 em = vec3(0.0);
	float t = TIME;
	// rack posts
	float post = 1.0 - stepa(0.035, uv.x, fuv.x) + stepa(0.965, uv.x, fuv.x);
	// layout from the top: rows 41,40 = ToR switch / patch; then 4U servers; bottom 2U = PDU
	float top_idx = U - 1.0 - row;        // 0 at top
	bool is_switch = top_idx < 1.0;
	bool is_patch = top_idx >= 1.0 && top_idx < 2.0;
	bool is_pdu = row < 2.0;
	float block = floor((top_idx - 2.0) / 4.0);
	float in_block = mod(top_idx - 2.0, 4.0);
	float blocks_total = 9.0;
	bool filled = block < floor(fill_ * blocks_total + 0.5);
	vec2 bp = vec2(uv.x, (in_block + (1.0 - lf)) / 4.0); // 0..1 across a 4U block
	vec2 fbp = vec2(fuv.x, flf / 4.0);
	float edge = smoothstep(0.0, 0.03 + flf, lf) * smoothstep(0.0, 0.03 + flf, 1.0 - lf);
	int L = lod;
	if (!rear_) {
		if (is_switch) {
			alb = vec3(0.05, 0.055, 0.06);
			// 32 ports in two rows
			vec2 pg = vec2(uv.x * 34.0 - 1.0, lf * 2.0); vec2 fpg = vec2(fuv.x * 34.0, flf * 2.0);
			vec2 pc = fract(pg);
			float inrow = step(0.0, pg.x) * step(pg.x, 32.0);
			float port = boxa(pc, vec2(0.5, 0.5), vec2(0.34, 0.3), fpg) * inrow;
			port = mix(port, 0.4 * inrow, 1.0 - lodfade(fpg.x));
			alb = mix(alb, vec3(0.0), port);
			float led = boxa(pc, vec2(0.5, 0.9), vec2(0.1, 0.05), fpg) * inrow;
			float on = step(0.4, fract(sin(floor(pg.x) * 3.1 + floor(pg.y) * 7.7 + floor(t * (1.0 + h21s(vec2(floor(pg.x), 1.0), seed_))) * 1.3 + seed_) * 999.0));
			em += led * on * vec3(0.2, 1.0, 0.4) * 2.0 * (state_ == 2 ? 0.0 : 1.0);
		} else if (is_patch) {
			alb = vec3(0.04);
			float jacks = stepa(0.5, fract(uv.x * 48.0), fuv.x * 48.0) * boxa(vec2(fract(uv.x * 24.0), lf), vec2(0.5, 0.5), vec2(0.28, 0.3), vec2(fuv.x * 24.0, flf));
			jacks = mix(jacks, 0.25, 1.0 - lodfade(fuv.x * 48.0));
			alb = mix(alb, vec3(0.1, 0.1, 0.11), jacks);
			// fibre pigtails in yellow / blue
			float pig = smoothstep(0.88 - fuv.x * 110.0, 0.88 + fuv.x * 110.0, sin(uv.x * 220.0) * 0.5 + 0.5) * step(0.25, lf) * step(lf, 0.75);
			pig = mix(pig, 0.08, 1.0 - lodfade(fuv.x * 35.0));
			alb = mix(alb, mix(vec3(0.85, 0.7, 0.1), vec3(0.1, 0.4, 0.8), step(0.5, h21s(vec2(floor(uv.x * 35.0), 3.0), seed_))), pig * 0.8);
			// failed rack: a red status strip across the top of the face, readable from the camera height
			if (state_ == 2) em += vec3(1.0, 0.08, 0.05) * 3.0 * (0.6 + 0.4 * sin(t * 5.0));
		} else if (is_pdu) {
			alb = vec3(0.03, 0.03, 0.035);
			float o = stepa(0.5, fract(uv.x * 20.0), fuv.x * 20.0) * boxa(vec2(fract(uv.x * 10.0), lf), vec2(0.5, 0.5), vec2(0.25, 0.28), vec2(fuv.x * 10.0, flf));
			alb = mix(alb, vec3(0.0), o * lodfade(fuv.x * 20.0));
			em += boxa(uv, vec2(0.12, 0.5 / U), vec2(0.02, 0.2 / U), fuv) * vec3(0.1, 1.0, 0.3) * 1.5;
		} else if (filled) {
			alb = vec3(0.055, 0.058, 0.065);
			// left ear + right ear
			float ear = 1.0 - stepa(0.07, bp.x, fbp.x) + stepa(0.93, bp.x, fbp.x);
			alb = mix(alb, vec3(0.1, 0.105, 0.115), ear);
			// vent grille: staggered dots in the middle; their mean tone once a hole is under a pixel
			vec2 gp = vec2(bp.x * 70.0, bp.y * 30.0 + (floor(bp.x * 70.0) * 0.5));
			vec2 fgp = vec2(fbp.x * 70.0, fbp.y * 30.0);
			vec2 gc = fract(gp) - 0.5;
			float gfw = max(fgp.x, fgp.y);
			float in_grille = boxa(bp, vec2(0.5, 0.5), vec2(0.28, 0.42), fbp);
			float hole = (1.0 - smoothstep(0.28 - gfw * 0.6, 0.28 + gfw * 0.6, length(gc)));
			hole = mix(hole, 0.246, 1.0 - lodfade(gfw)) * in_grille * float(L < 1);
			alb = mix(alb, vec3(0.0), hole * 0.9);
			// 2 rows of drive bays on the left
			vec2 dp = vec2((bp.x - 0.09) / 0.12 * 4.0, bp.y * 2.0); vec2 fdp = vec2(fbp.x / 0.12 * 4.0, fbp.y * 2.0);
			float bay_col = boxa(bp, vec2(0.15, 0.5), vec2(0.06, 0.5), fbp);
			float bay = bay_col * mix(boxa(fract(dp), vec2(0.5, 0.5), vec2(0.4, 0.34), fdp), 0.54, 1.0 - lodfade(fdp.x * 0.5)) * float(L < 1);
			alb = mix(alb, vec3(0.012), bay);
			float bled = bay_col * boxa(fract(dp), vec2(0.82, 0.5), vec2(0.07, 0.08), fdp);
			float blink = step(0.55, fract(sin(floor(dp.x) * 11.0 + floor(dp.y) * 5.0 + floor(t * (2.0 + h21s(vec2(block, floor(dp.x)), seed_)) * 3.0) + block * 13.0) * 777.0));
			em += bled * (0.25 + blink) * vec3(0.15, 0.6, 1.0) * 2.0;
			// accent_ ear LEDs + power button
			float ac = boxa(bp, vec2(0.965, 0.25), vec2(0.018, 0.045), fbp) + boxa(bp, vec2(0.965, 0.5), vec2(0.018, 0.045), fbp) + boxa(bp, vec2(0.965, 0.75), vec2(0.018, 0.045), fbp);
			float pulse = 0.65 + 0.35 * sin(t * 2.0 + block * 1.7 + seed_);
			vec3 lc = accent_;
			if (state_ == 1) { lc = vec3(1.0, 0.65, 0.1); pulse = step(0.5, fract(t * 1.5 + block * 0.2)); }
			if (state_ == 2) { lc = vec3(1.0, 0.1, 0.08); pulse = (block == 2.0) ? 1.0 : 0.15; }
			em += ac * lc * pulse * 2.4;
			// vendor stripe
			em += boxa(bp, vec2(0.5, 0.03), vec2(0.44, 0.012), fbp) * accent_ * 0.25;
			alb *= edge * 0.6 + 0.4;
		} else {
			// blanking panel
			alb = vec3(0.022, 0.024, 0.027) * (0.8 + 0.2 * stepa(0.5, fract(uv.x * 3.0), fuv.x * 3.0));
			rough = 0.8; metal = 0.1;
		}
	} else {
		// rear_: fans + PSUs + cable looms
		if (is_switch || is_patch || is_pdu) {
			alb = vec3(0.03);
			float cab = smoothstep(0.55 - fuv.x * 45.0, 0.55 + fuv.x * 45.0, sin(uv.x * 90.0 + h21s(vec2(row, 2.0), seed_) * 6.0) * 0.5 + 0.5);
			cab = mix(cab, 0.4, 1.0 - lodfade(fuv.x * 15.0));
			alb = mix(alb, mix(vec3(0.06, 0.06, 0.07), vec3(0.8, 0.5, 0.05), step(0.7, h21s(vec2(floor(uv.x * 20.0), row), seed_))), cab * 0.7);
			if (state_ == 2 && is_switch) em += vec3(1.0, 0.08, 0.05) * 3.0 * (0.6 + 0.4 * sin(t * 5.0));
		} else if (filled) {
			alb = vec3(0.045, 0.048, 0.054);
			// fan wall top 2/3, PSUs bottom
			float fans = step(0.34, bp.y);
			vec2 fp = vec2(bp.x * 8.0, (bp.y - 0.34) / 0.66 * 2.0); vec2 ffp = vec2(fbp.x * 8.0, fbp.y / 0.66 * 2.0);
			vec2 fc = fract(fp) - 0.5;
			float ffw = max(ffp.x, ffp.y);
			float disc = (1.0 - smoothstep(0.42 - ffw, 0.42 + ffw, length(fc))) * fans;
			float ring = smoothstep(0.12 - ffw, 0.12 + ffw, length(fc)) * disc;
			alb = mix(alb, vec3(0.012), disc);
			float blade = step(0.5, fract(atan(fc.y, fc.x) * 2.0 + t * (state_ == 2 ? 0.0 : 4.0)));
			alb = mix(alb, vec3(0.05), ring * mix(blade, 0.5, 1.0 - lodfade(ffw * 4.0)));
			vec2 pq = vec2(fract(bp.x * 4.0), bp.y / 0.34); vec2 fpq = vec2(fbp.x * 4.0, fbp.y / 0.34);
			float psu = (1.0 - fans) * boxa(pq, vec2(0.5, 0.5), vec2(0.42, 0.38), fpq);
			alb = mix(alb, vec3(0.1, 0.1, 0.11), psu);
			em += (1.0 - fans) * boxa(pq, vec2(0.8, 0.5), vec2(0.05, 0.1), fpq) * (state_ == 2 ? vec3(1.0, 0.1, 0.1) : vec3(0.2, 1.0, 0.3)) * 1.8;
		} else {
			alb = vec3(0.02);
		}
		// vertical cable looms down the posts (the stripes fade to their mean once they are finer than a pixel)
		float lfw = fuv.y * 400.0;
		float s1 = mix(0.5 + 0.5 * sin(uv.y * 400.0), 0.5, 1.0 - lodfade(lfw * 0.25));
		float s2 = mix(0.5 + 0.5 * sin(uv.y * 400.0 + 2.0), 0.5, 1.0 - lodfade(lfw * 0.25));
		float loom = (1.0 - stepa(0.09, uv.x, fuv.x)) * s1 + stepa(0.91, uv.x, fuv.x) * s2;
		alb = mix(alb, mix(vec3(0.02), vec3(0.15, 0.15, 0.4), step(0.5, h11s(floor(uv.y * 40.0), seed_))), clamp(loom, 0.0, 1.0) * step(0.5, h11s(seed_, seed_)));
	}
	// posts last, so they frame every row
	alb = mix(alb, vec3(0.012), clamp(post, 0.0, 1.0)); rough = mix(rough, 0.45, clamp(post, 0.0, 1.0));
	// contact AO: the face darkens toward the floor and a little under the top plate
	float yb = 1.0 - uv.y;
	float ao = mix(0.35, 1.0, smoothstep(0.0, 0.07, yb)) * mix(0.7, 1.0, smoothstep(0.0, 0.025, uv.y));
	alb *= ao;
	if (heat_ >= 0.0) {
		vec3 hc = heat_ramp(heat_);
		alb = mix(alb, hc * 0.35, 0.8); em = em * 0.15 + hc * 0.45;
	}
	if (L == 0) {   // emboss: ports, vents and bays are darker than the plate around them, so the dark parts read as recessed
		float lum = dot(alb, vec3(0.333)) * 30.0;
		vec2 g = vec2(dFdx(lum), dFdy(lum));
		NORMAL_MAP = vec3(0.5 - clamp(g.x, -0.35, 0.35), 0.5 + clamp(g.y, -0.35, 0.35), 1.0);
	}
	ALBEDO = alb * 2.6; ROUGHNESS = rough; METALLIC = metal * 0.5; EMISSION = em;
}
