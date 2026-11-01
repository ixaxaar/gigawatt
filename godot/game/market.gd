class_name Market
## Port of src/sim/market.ts, bit-exact given identical Rng call order.

const MODELS: Array = [
	{"id": "gpt2-xl", "name": "GPT-2 1.5B", "paramsB": 1.5, "activeParamsB": 1.5, "layers": 48.0, "kvBytesPerToken": 196608.0, "era": 2020.0},
	{"id": "gpt3-175b", "name": "GPT-3 175B", "paramsB": 175.0, "activeParamsB": 175.0, "layers": 96.0, "kvBytesPerToken": 4718592.0, "era": 2020.3},
	{"id": "gptj-6b", "name": "GPT-J 6B", "paramsB": 6.0, "activeParamsB": 6.0, "layers": 28.0, "kvBytesPerToken": 28672.0, "era": 2021.5},
	{"id": "mtnlg-530b", "name": "Megatron-Turing NLG 530B", "paramsB": 530.0, "activeParamsB": 530.0, "layers": 105.0, "kvBytesPerToken": 8601600.0, "era": 2022.0},
	{"id": "chinchilla-70b", "name": "Chinchilla 70B", "paramsB": 70.0, "activeParamsB": 70.0, "layers": 80.0, "kvBytesPerToken": 2621440.0, "era": 2022.25},
	{"id": "palm-540b", "name": "PaLM 540B", "paramsB": 540.0, "activeParamsB": 540.0, "layers": 118.0, "kvBytesPerToken": 2895872.0, "era": 2022.3},
	{"id": "gpt35-turbo", "name": "GPT-3.5 Turbo", "paramsB": 175.0, "activeParamsB": 175.0, "layers": 96.0, "kvBytesPerToken": 393216.0, "era": 2022.9},
	{"id": "llama-65b", "name": "LLaMA 65B", "paramsB": 65.0, "activeParamsB": 65.0, "layers": 80.0, "kvBytesPerToken": 2621440.0, "era": 2023.1},
	{"id": "gpt4", "name": "GPT-4", "paramsB": 1800.0, "activeParamsB": 280.0, "layers": 120.0, "kvBytesPerToken": 491520.0, "era": 2023.2},
	{"id": "llama2-70b", "name": "Llama 2 70B", "paramsB": 70.0, "activeParamsB": 70.0, "layers": 80.0, "kvBytesPerToken": 327680.0, "era": 2023.55},
	{"id": "mistral-7b", "name": "Mistral 7B", "paramsB": 7.0, "activeParamsB": 7.0, "layers": 32.0, "kvBytesPerToken": 131072.0, "era": 2023.75},
	{"id": "mixtral-8x7b", "name": "Mixtral 8x7B MoE", "paramsB": 46.7, "activeParamsB": 12.9, "layers": 32.0, "kvBytesPerToken": 131072.0, "era": 2023.9},
	{"id": "grok-1", "name": "Grok-1 314B MoE", "paramsB": 314.0, "activeParamsB": 80.0, "layers": 64.0, "kvBytesPerToken": 262144.0, "era": 2024.25},
	{"id": "llama3-70b", "name": "Llama 3 70B", "paramsB": 70.0, "activeParamsB": 70.0, "layers": 80.0, "kvBytesPerToken": 327680.0, "era": 2024.3},
	{"id": "gpt4o", "name": "GPT-4o", "paramsB": 200.0, "activeParamsB": 200.0, "layers": 88.0, "kvBytesPerToken": 360448.0, "era": 2024.45},
	{"id": "llama31-405b", "name": "Llama 3.1 405B", "paramsB": 405.0, "activeParamsB": 405.0, "layers": 126.0, "kvBytesPerToken": 516096.0, "era": 2024.6},
	{"id": "deepseek-v3", "name": "DeepSeek-V3 671B MoE", "paramsB": 671.0, "activeParamsB": 37.0, "layers": 61.0, "kvBytesPerToken": 70272.0, "era": 2024.95},
	{"id": "deepseek-r1", "name": "DeepSeek-R1 671B MoE", "paramsB": 671.0, "activeParamsB": 37.0, "layers": 61.0, "kvBytesPerToken": 70272.0, "era": 2025.05},
	{"id": "grok-3", "name": "Grok-3", "paramsB": 400.0, "activeParamsB": 50.0, "layers": 80.0, "kvBytesPerToken": 327680.0, "era": 2025.15},
	{"id": "llama4-maverick", "name": "Llama 4 Maverick 400B MoE", "paramsB": 400.0, "activeParamsB": 17.0, "layers": 128.0, "kvBytesPerToken": 524288.0, "era": 2025.3},
	{"id": "qwen3-235b", "name": "Qwen3 235B-A22B MoE", "paramsB": 235.0, "activeParamsB": 22.0, "layers": 94.0, "kvBytesPerToken": 192512.0, "era": 2025.35},
	{"id": "kimi-k2", "name": "Kimi K2 1T MoE", "paramsB": 1000.0, "activeParamsB": 32.0, "layers": 61.0, "kvBytesPerToken": 70272.0, "era": 2025.45},
	{"id": "glm45", "name": "GLM-4.5 355B MoE", "paramsB": 355.0, "activeParamsB": 32.0, "layers": 92.0, "kvBytesPerToken": 376832.0, "era": 2025.55},
	{"id": "gpt5", "name": "GPT-5", "paramsB": 900.0, "activeParamsB": 120.0, "layers": 120.0, "kvBytesPerToken": 491520.0, "era": 2025.65},
	{"id": "llama5", "name": "Llama 5", "paramsB": 1600.0, "activeParamsB": 80.0, "layers": 140.0, "kvBytesPerToken": 161280.0, "era": 2026.4},
	{"id": "deepseek-v4", "name": "DeepSeek-V4 MoE", "paramsB": 700.0, "activeParamsB": 40.0, "layers": 64.0, "kvBytesPerToken": 73728.0, "era": 2026.6},
	{"id": "gemini3-ultra", "name": "Gemini 3 Ultra", "paramsB": 2500.0, "activeParamsB": 90.0, "layers": 160.0, "kvBytesPerToken": 655360.0, "era": 2026.9},
	{"id": "gpt6", "name": "GPT-6", "paramsB": 3000.0, "activeParamsB": 150.0, "layers": 180.0, "kvBytesPerToken": 737280.0, "era": 2027.4},
	{"id": "frontier-stargate", "name": "Stargate-class frontier run", "paramsB": 8000.0, "activeParamsB": 250.0, "layers": 220.0, "kvBytesPerToken": 905216.0, "era": 2028.0},
]

const CUSTOMERS: Dictionary = {
	"startup": ["Stealth Labs", "Glyph AI", "Peregrine Models", "Otter Systems", "VectorForge"],
	"lab": ["MIT LIDS", "Flatiron Institute", "CERN OpenLab", "RIKEN AICS", "Turing Institute"],
	"enterprise": ["Acme Retail Media", "Helios Bank", "Nordwind Auto", "MedSyn Pharma", "Skyline Telecom"],
	"sovereign": ["EU Sovereign Cloud", "Emirates AI Council", "Nippon AI Grid", "Sovereign Tech Fund"],
}

const GPU_HOUR_ANCHOR: Array = [
	[2020.0, 1.9], [2021.0, 1.75], [2022.0, 1.6], [2023.2, 2.9], [2024.0, 2.6], [2024.6, 3.0],
	[2025.0, 2.8], [2026.0, 2.6], [2026.8, 3.4], [2027.0, 3.2], [2028.0, 3.0],
]

const MTOK_DECAY: Array = [
	[2020.0, 1.0], [2021.0, 0.75], [2022.0, 0.55], [2023.0, 0.4], [2024.0, 0.175],
	[2025.0, 0.115], [2026.0, 0.07], [2027.0, 0.05], [2028.0, 0.035],
]

const ERA_MEM_GB: Array = [
	[2020.0, 40.0], [2022.0, 80.0], [2023.7, 141.0], [2024.8, 192.0], [2026.2, 288.0], [2027.0, 384.0], [2028.0, 384.0],
]

const ERA_SCALEOUT_GBPS: Array = [
	[2020.0, 6.0], [2022.0, 12.5], [2023.5, 25.0], [2024.5, 50.0], [2026.0, 100.0], [2027.0, 200.0], [2028.0, 200.0],
]

const ERA_TOKENS_PER_SEC: Array = [
	[2020.0, 3000.0], [2021.0, 20000.0], [2022.0, 100000.0], [2023.0, 500000.0], [2024.0, 3000000.0],
	[2025.0, 20000000.0], [2026.0, 80000000.0], [2027.0, 200000000.0], [2028.0, 500000000.0],
]

const ACCEL_BUCKETS: Array = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768]

const CONTEXT_OPTIONS: Array = [
	[2022.0, [1024, 2048]],
	[2024.0, [2048, 4096, 8192]],
	[2026.0, [8192, 32768, 65536]],
	[2029.0, [32768, 131072, 262144]],
]

const ARCHETYPE_TABLE: Dictionary = {
	"startup": {"minRep": 0.0, "weight": 0.38, "accelMult": 1.0, "tokenMult": 0.25, "priceMult": 0.9, "trainDur": [2, 6], "inferDur": [3, 9], "sla": 0.95, "penalty": [0.004, 0.008]},
	"lab": {"minRep": 20.0, "weight": 0.30, "accelMult": 1.0, "tokenMult": 0.6, "priceMult": 1.0, "trainDur": [4, 10], "inferDur": [6, 12], "sla": 0.97, "penalty": [0.005, 0.01]},
	"enterprise": {"minRep": 45.0, "weight": 0.22, "accelMult": 2.0, "tokenMult": 1.0, "priceMult": 1.1, "trainDur": [6, 18], "inferDur": [12, 24], "sla": 0.98, "penalty": [0.008, 0.015]},
	"sovereign": {"minRep": 70.0, "weight": 0.10, "accelMult": 4.0, "tokenMult": 2.5, "priceMult": 1.15, "trainDur": [12, 36], "inferDur": [24, 48], "sla": 0.995, "penalty": [0.01, 0.02]},
}

const ARCHETYPE_ORDER: Array = ["startup", "lab", "enterprise", "sovereign"]


static func lerp_curve(points: Array, x: float) -> float:
	if x <= points[0][0]:
		return points[0][1]
	for i in range(1, points.size()):
		if x <= points[i][0]:
			var x0: float = points[i - 1][0]
			var y0: float = points[i - 1][1]
			var x1: float = points[i][0]
			var y1: float = points[i][1]
			return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
	return points[points.size() - 1][1]


static func gpu_hour_anchor(year: float) -> float:
	return lerp_curve(GPU_HOUR_ANCHOR, year)


static func mtok_price(active_params_b: float, year: float) -> float:
	return 0.96 * pow(maxf(1.0, active_params_b), 0.8) * lerp_curve(MTOK_DECAY, year)


static func scale_out_tier(year: float) -> float:
	return lerp_curve(ERA_SCALEOUT_GBPS, year)


static func bucket(n: int) -> int:
	for b in ACCEL_BUCKETS:
		if b >= n:
			return b
	return ACCEL_BUCKETS[ACCEL_BUCKETS.size() - 1]


static func round2(x: float) -> float:
	return round(x * 100.0) / 100.0


static func round3(x: float) -> float:
	return round(x * 1000.0) / 1000.0


static func log2_(x: float) -> float:
	return log(x) / 0.6931471805599453


static func roll_archetype(rng: Rng, reputation: float) -> String:
	var eligible: Array = []
	for a in ARCHETYPE_ORDER:
		if reputation >= ARCHETYPE_TABLE[a]["minRep"]:
			eligible.append(a)
	var total := 0.0
	for a in eligible:
		total += ARCHETYPE_TABLE[a]["weight"]
	var r := rng.next() * total
	for a in eligible:
		r -= ARCHETYPE_TABLE[a]["weight"]
		if r <= 0.0:
			return a
	return eligible[0]


static func generate_contracts(state: Dictionary, month: int, rng: Rng) -> Array:
	var year := 2020.0 + month / 12.0
	var eligible: Array = []
	for m in MODELS:
		if m["era"] <= year + 0.01:
			eligible.append(m)
	if eligible.is_empty():
		return []
	var out: Array = []
	var n := 1 + int(floor(rng.next() * 3.0))
	for i in n:
		var pool: Array = eligible.slice(maxi(0, eligible.size() - 4)) if rng.next() < 0.6 else eligible.slice(maxi(0, eligible.size() - 8))
		var model: Dictionary = rng.pick(pool)
		var params_b: float = model["paramsB"]
		var train_p := (0.7 if params_b > 200.0 else (0.12 if params_b < 15.0 else 0.4))
		var archetype := roll_archetype(rng, state["reputation"])
		var t: Dictionary = ARCHETYPE_TABLE[archetype]
		var penalty: Array = t["penalty"]
		var train_dur: Array = t["trainDur"]
		var infer_dur: Array = t["inferDur"]
		var suffix := str(1000 + int(floor(rng.next() * 9000.0)))
		var customer: String = rng.pick(CUSTOMERS[archetype])
		var penalty_rate := round3(rng.range_(penalty[0], penalty[1]))
		var deadline_month := month + rng.int_(2, 6)
		var sla_availability := minf(0.999, maxf(0.9, float(t["sla"]) + rng.range_(-0.005, 0.005)))
		var contract: Dictionary
		if rng.next() < train_p:
			var state_gb := 16.0 * params_b
			var mem_per_accel := lerp_curve(ERA_MEM_GB, year)
			var raw: float = (state_gb / mem_per_accel) * rng.range_(2.0, 4.5) * float(t["accelMult"])
			var min_accelerators := mini(32768, maxi(32, bucket(int(ceil(raw)))))
			var is_moe: bool = model["activeParamsB"] < params_b * 0.8
			var moe_domain := (128 if year >= 2027.0 else (64 if year >= 2025.5 else (32 if year >= 2024.0 else 16)))
			var min_scale_up_domain := mini(min_accelerators, moe_domain if is_moe else (16 if year >= 2025.0 else 8))
			var tier := lerp_curve(ERA_SCALEOUT_GBPS, year)
			var duration_months := rng.int_(train_dur[0], train_dur[1])
			var price_per_accel_hour := round2(
				gpu_hour_anchor(year)
				* (1.15 if params_b >= 300.0 else (0.95 if is_moe else 1.0))
				* t["priceMult"]
				* rng.range_(0.92, 1.15)
			)
			contract = {
				"kind": "training",
				"id": "trn-%d-%d-%s" % [month, i, suffix],
				"customer": customer,
				"archetype": archetype,
				"model": model,
				"durationMonths": duration_months,
				"penaltyRate": penalty_rate,
				"deadlineMonth": deadline_month,
				"slaAvailability": sla_availability,
				"minAccelerators": min_accelerators,
				"minScaleUpDomain": min_scale_up_domain,
				"minScaleOutGBsPerAccel": round2(tier * 0.75 if params_b < 15.0 else tier),
				"minTotalMemGB": int(ceil(state_gb)),
				"pricePerAccelHour": price_per_accel_hour,
				"rampMonths": mini(20, 6 + int(round(log2_(min_accelerators / 32.0) * 1.6)) + (1 if year >= 2024.0 else 0)),
			}
		else:
			var tps := maxi(100, int(round(lerp_curve(ERA_TOKENS_PER_SEC, year) * t["tokenMult"] * rng.range_(0.6, 1.8))))
			var tpot := int(round(rng.range_(20.0, 60.0) + (rng.range_(10.0, 40.0) if model["activeParamsB"] > 80.0 else 0.0)))
			var ctx_opts: Array = [262144]
			for opt in CONTEXT_OPTIONS:
				if year < opt[0]:
					ctx_opts = opt[1]
					break
			var duration_months := rng.int_(infer_dur[0], infer_dur[1])
			var ttft_ms := int(round(rng.range_(150.0, 700.0) / 10.0)) * 10
			var context_tokens: int = rng.pick(ctx_opts)
			var price_per_mtok := maxf(0.01, round3(
				mtok_price(model["activeParamsB"], year)
				* (1.25 if tpot < 30 else 1.0)
				* t["priceMult"]
				* rng.range_(0.9, 1.2)
			))
			var ramp_months := rng.int_(5, 8)
			contract = {
				"kind": "inference",
				"id": "inf-%d-%d-%s" % [month, i, suffix],
				"customer": customer,
				"archetype": archetype,
				"model": model,
				"durationMonths": duration_months,
				"penaltyRate": penalty_rate,
				"deadlineMonth": deadline_month,
				"slaAvailability": sla_availability,
				"tokensPerSec": tps,
				"tpotMs": maxi(15, tpot),
				"ttftMs": ttft_ms,
				"contextTokens": context_tokens,
				"pricePerMTok": price_per_mtok,
				"rampMonths": ramp_months,
			}
		out.append(contract)
	return out
