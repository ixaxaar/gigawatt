"""Chill / bass-heavy composer. Long evolving forms (48 bars), real chord voicings (7ths/9ths/11ths), sub bass that
glides, sidechain pump, slowly sweeping pads, sparse call-and-response melodies, tape-ish echo and a room reverb."""
import numpy as np
from scipy.signal import fftconvolve
from synth import SR, Track, voice, noise, lowpass_fast, highpass, soft, mtof

Q = {"m7": [0, 3, 7, 10], "m9": [0, 3, 7, 10, 14], "m11": [0, 3, 7, 10, 14, 17], "maj7": [0, 4, 7, 11], "maj9": [0, 4, 7, 11, 14],
     "7": [0, 4, 7, 10], "9": [0, 4, 7, 10, 14], "sus": [0, 5, 7, 10], "m": [0, 3, 7], "6": [0, 4, 7, 9], "m6": [0, 3, 7, 9], "dim": [0, 3, 6, 9]}
SCALES = {"minor_pent": [0, 3, 5, 7, 10], "dorian": [0, 2, 3, 5, 7, 9, 10], "minor": [0, 2, 3, 5, 7, 8, 10], "major_pent": [0, 2, 4, 7, 9],
          "phrygian": [0, 1, 3, 5, 7, 8, 10], "lydian": [0, 2, 4, 6, 7, 9, 11]}


def sine(f, n):
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def sub_note(midi, dur, vel, glide_to=None, glide_t=0.12, env=(0.006, 0.5, 0.85, 0.12)):
    """Sine fundamental + a touch of quantised-triangle octave so it stays audible on small speakers."""
    a, d, s, r = env
    body = int(dur * SR); n = body + int(r * SR) + 1
    t = np.arange(n) / SR
    f = np.full(n, float(mtof(midi)))
    if glide_to is not None:
        g0 = max(0.0, dur - glide_t)
        k = np.clip((t - g0) / glide_t, 0, 1)
        f = mtof(midi) * (mtof(glide_to) / mtof(midi)) ** (k * k * (3 - 2 * k))
    ph = np.cumsum(f) / SR
    w = np.sin(2 * np.pi * ph) + 0.28 * np.sign(np.sin(2 * np.pi * ph * 2)) * 0.35 + 0.22 * np.sin(2 * np.pi * ph * 2)
    e = s + (1 - s) * np.exp(-t / d)
    e = e * np.minimum(1, t / a)
    e[body:] *= np.linspace(1, 0, n - body)
    return w * e * vel


def drum(kind, rng, vel=1.0):
    if kind == "k":
        n = int(0.32 * SR); t = np.arange(n) / SR
        f = 40 + 95 * np.exp(-t * 26)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * vel
    if kind == "s":
        n = int(0.22 * SR); t = np.arange(n) / SR
        nz = lowpass_fast(noise(n, 22000, rng), 5200) * np.exp(-t * 17)
        body = np.sin(2 * np.pi * np.cumsum(205 - 70 * np.minimum(1, t / 0.08)) / SR) * np.exp(-t * 24) * 0.55
        return (nz * 0.9 + body) * 0.75 * vel
    if kind == "r":  # rim / ghost
        n = int(0.05 * SR); t = np.arange(n) / SR
        return (np.sin(2 * np.pi * 1700 * t) * 0.3 + noise(n, 20000, rng) * 0.4) * np.exp(-t * 90) * vel
    if kind == "h":
        n = int(0.05 * SR); t = np.arange(n) / SR
        return highpass(noise(n, 24000, rng), 5500) * np.exp(-t * 80) * 0.55 * vel
    if kind == "o":
        n = int(0.22 * SR); t = np.arange(n) / SR
        return highpass(noise(n, 24000, rng), 5000) * np.exp(-t * 14) * 0.4 * vel
    return np.zeros(8)


def reverb(x, seconds, rng, wet, damp=3200):
    """Cheap room: convolve with exponentially decaying filtered noise (different per channel)."""
    n = int(seconds * SR); t = np.arange(n) / SR
    out = np.zeros_like(x)
    for c in range(2):
        ir = lowpass_fast(rng.normal(0, 1, n), damp) * np.exp(-t * (6.5 / seconds))
        ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        y = fftconvolve(x[:, c], ir)[: len(x)]
        out[:, c] = y
    out *= wet / (np.sqrt(np.mean(out ** 2)) + 1e-9) * np.sqrt(np.mean(x ** 2))
    return x + out


def chord_midis(root, name, inv=0, base=60):
    """Voicing around `base`: pick root-position pitch classes, drop into one octave window, rotate by `inv`."""
    iv = Q[name]
    notes = [root + i for i in iv]
    notes = [(n - base) % 12 + base - 6 + (12 if False else 0) for n in notes]  # fold to window [base-6, base+6)
    notes = sorted(set(notes))
    for _ in range(inv % len(notes)):
        notes = notes[1:] + [notes[0] + 12]
    return notes


def make_melody(rng, chords_by_bar, scale_pcs, key, density, lo, hi, prev=None):
    """2-bar phrases. Returns list of (bar, step, length_steps, midi)."""
    pool = []
    for o in range(-1, 4):
        for pc in scale_pcs:
            m = key + pc + 12 * o
            if lo <= m <= hi:
                pool.append(m)
    pool = sorted(pool)
    out = []
    cur = pool[len(pool) // 2] if prev is None else prev
    bars = len(chords_by_bar)
    for ph in range(0, bars, 2):
        # rhythm for this phrase: sparse onsets on a 32-step grid (2 bars)
        n_on = max(2, int(rng.normal(density * 6, 1.2)))
        cand = [0, 3, 6, 8, 10, 12, 14, 16, 19, 22, 24, 26, 28, 30]
        starts = sorted(set([0 if rng.random() < 0.6 else int(rng.choice([2, 3, 4]))] + [int(x) for x in rng.choice(cand, n_on - 1, replace=False)]))
        for i, s in enumerate(starts):
            nxt = starts[i + 1] if i + 1 < len(starts) else 32
            ln = max(2, min(nxt - s - 1, int(rng.choice([2, 3, 4, 6, 8, 12]))))
            if i == len(starts) - 1:
                ln = min(14, 31 - s)   # phrase ends on a held note
            bar = ph + s // 16
            if bar >= bars:
                continue
            ch = chords_by_bar[bar]
            tones = [m + 12 * k for m in ch for k in (-1, 0, 1)]
            strong = (s % 8 == 0) or i == len(starts) - 1
            idx = pool.index(min(pool, key=lambda p: abs(p - cur)))
            step = int(rng.choice([-2, -1, -1, 0, 1, 1, 2, 3], p=[.1, .2, .15, .05, .2, .15, .1, .05]))
            tgt = pool[int(np.clip(idx + step, 0, len(pool) - 1))]
            if strong:
                tgt = min([p for p in pool], key=lambda p: min(abs(p - (t % 12 + (p // 12) * 12)) for t in tones) + abs(p - tgt) * 0.2)
            cur = tgt
            out.append((bar, s % 16, ln, tgt))
    return out


def render(song, seed):
    rng = np.random.default_rng(seed)
    bpm = song["bpm"]; spb = 60.0 / bpm; step = spb / 4; swing = song.get("swing", 0.0)
    key = song["key"]                       # midi of the tonic (low)
    plan = song["form"]                     # list of (name, bars)
    bars_total = sum(b for _, b in plan)
    total = bars_total * 4 * spb
    tail = 3.0
    N = int((total + tail) * SR)
    pad_t, bass_t, mel_t, drum_t, tex_t, key_t = (Track(total + tail) for _ in range(6))
    kick_env = np.zeros(N)

    def T(bar, st):
        sw = swing * step * 0.5 if st % 2 else 0.0
        return (bar * 16 + st) * step + sw

    def duck(t0, depth_len=0.22):
        i = int(t0 * SR); L = int(depth_len * SR)
        if i < N:
            e = np.exp(-np.arange(min(L, N - i)) / (0.07 * SR))
            kick_env[i:i + len(e)] = np.maximum(kick_env[i:i + len(e)], e)

    scale = SCALES[song["scale"]]
    bar0 = 0
    prev_mel = None
    mel_cache = {}
    pad_bars = []
    for sec_i, (name, nb) in enumerate(plan):
        prog = song["prog"][name]
        chords = []
        for b in range(nb):
            r, q = prog[b % len(prog)]
            root = key + r
            chords.append((root, q))
        voiced = []
        for b, (root, q) in enumerate(chords):
            voiced.append(chord_midis(root, q, inv=song.get("inv", [0, 1, 2, 1])[(b + sec_i) % 4], base=song.get("pad_base", 62)))
        flags = song["layers"][name]
        # ---- pad chords + bass + drums + texture, bar by bar
        for b, (root, q) in enumerate(chords):
            bar = bar0 + b
            if "pad" in flags:
                for m in voiced[b]:
                    for dt, pan in ((-0.07, -0.5), (0.07, 0.5)):
                        w = voice("pulse", m, 4 * spb * 1.03, song.get("pad_vel", 0.10), 0.25, vib=(0.04, 4.5), env=(0.55, 1.0, 1.0, 1.0), detune=dt)
                        pad_t.add(T(bar, 0), w, pan=pan)
                if "key" in flags:   # soft rhodes-ish stabs on the offbeat
                    for st in song.get("stab", [6, 14]):
                        for m in voiced[b][:4]:
                            w = voice("tri", m + 12, step * 3, 0.16, env=(0.002, 0.3, 0.0, 0.2))
                            key_t.add(T(bar, st), w, pan=0.2)
            if "bass" in flags:
                nxt_root = chords[(b + 1) % len(chords)][0]
                br = root
                while br > song.get("bass_top", 45): br -= 12
                while br < song.get("bass_top", 45) - 12: br += 12
                nr = nxt_root
                while nr > br + 6: nr -= 12
                while nr < br - 6: nr += 12
                style = song["bass"]
                notes = []   # (step, len_steps, midi, glide)
                if style == "sub":
                    notes = [(0, 14, br, nr if rng.random() < 0.5 else None)]
                    if rng.random() < 0.35: notes = [(0, 6, br, None), (8, 8, br + 12 if rng.random() < .5 else br + 7, nr)]
                elif style == "dub":
                    notes = [(0, 3, br, None), (6, 2, br, None), (10, 5, br + 7 if rng.random() < .4 else br, nr if rng.random() < .4 else None)]
                elif style == "boom":
                    pats = [[(0, 3), (3, 2), (6, 2), (10, 3), (14, 2)], [(0, 4), (6, 3), (10, 2), (12, 3)], [(0, 2), (4, 2), (7, 3), (10, 3), (14, 2)]]
                    pat = pats[int(rng.integers(0, len(pats)))]
                    notes = [(s, l, br + int(rng.choice([0, 0, 0, 7, 12])), None) for s, l in pat]
                elif style == "walk":
                    cs = [br, br + 3 if "m" in q else br + 4, br + 7, br + 10 if q in ("m7", "m9", "7", "9", "m11") else br + 12]
                    notes = [(0, 4, cs[0], None), (4, 4, cs[1], None), (8, 4, cs[2], None), (12, 3, cs[3] if rng.random() < .6 else nr, None)]
                for s, l, m, g in notes:
                    w = sub_note(m, l * step, song.get("bass_vel", 0.95), g, env=(0.008, 0.6, 0.8, 0.1))
                    bass_t.add(T(bar, s), w)
            if "drums" in flags:
                dp = song["drums"]
                for st in range(16):
                    kind = None
                    if st in dp["k"] and (rng.random() < dp.get("kprob", 1.0) or st == 0):
                        t0 = T(bar, st); drum_t.add(t0, drum("k", rng), gain=0.95); duck(t0)
                    if st in dp["s"]:
                        drum_t.add(T(bar, st), drum("s", rng), gain=0.85, pan=0.05)
                    if st in dp.get("ghost", []) and rng.random() < 0.55:
                        drum_t.add(T(bar, st), drum("r", rng, 0.6), gain=0.5, pan=-0.2)
                    hv = dp["h"][st]
                    if hv and rng.random() < 0.93:
                        drum_t.add(T(bar, st), drum("h", rng, hv * rng.uniform(0.7, 1.05)), gain=0.5, pan=0.35 if st % 4 else -0.3)
                    if st in dp.get("o", []):
                        drum_t.add(T(bar, st), drum("o", rng), gain=0.45, pan=0.3)
            elif "kick" in flags:
                t0 = T(bar, 0); drum_t.add(t0, drum("k", rng), gain=0.8); duck(t0)
            if "swell" in flags and b == nb - 1:   # noise riser into the next section
                n = int(spb * 4 * SR); t = np.arange(n) / SR
                sw = highpass(lowpass_fast(noise(n, 20000, rng), 6000), 700) * (t / t[-1]) ** 2.2 * 0.5
                tex_t.add(T(bar, 0), sw, gain=0.35)
        # ---- melody
        if "lead" in flags:
            dens = song["lead_density"].get(name, 0.8)
            key_name = song.get("mel_key", {}).get(name, name)
            if key_name in mel_cache and rng.random() < 0.65:   # repeat an earlier phrase with a mutated pitch walk
                mel = [(bb, s, l, m) for (bb, s, l, m) in mel_cache[key_name]]
                mel = [(bb, s, l, m + (int(rng.choice([0, 0, 2, -2, 12])) if i % 5 == 4 else 0)) for i, (bb, s, l, m) in enumerate(mel)][: nb * 6]
            else:
                mel = make_melody(rng, [[x for x in v] for v in voiced], [(p) for p in scale], key + 12, dens, song.get("mel_lo", 64), song.get("mel_hi", 86), prev_mel)
                mel_cache[key_name] = mel
            if mel: prev_mel = mel[-1][3]
            for (bb, s, l, m) in mel:
                if bb >= nb: continue
                kind = song.get("lead", ("pulse", 0.125))
                w = voice(kind[0], m, l * step * 0.96, song.get("lead_vel", 0.34), kind[1], vib=(0.18, 5.2), env=(0.02, 0.5, 0.5, 0.25))
                mel_t.add(T(bar0 + bb, s), w, pan=-0.15)
        bar0 += nb

    # ---- mix: pad sweep, duck, echo, reverb
    pad = pad_t.buf
    tt = np.arange(N) / SR
    sweep = 0.5 + 0.5 * np.sin(2 * np.pi * tt / (song.get("sweep_bars", 16) * 4 * spb) - 1.2)
    lo, hi = lowpass_fast(pad, song.get("pad_lo", 700)), lowpass_fast(pad, song.get("pad_hi", 3300))
    pad = lo * (1 - sweep[:, None]) + hi * sweep[:, None]
    duck_g = (1.0 - song.get("duck", 0.5) * kick_env)[:, None]
    pad = pad * duck_g
    bass = bass_t.buf * (1.0 - song.get("duck", 0.5) * 0.7 * kick_env)[:, None]
    key_b = lowpass_fast(key_t.buf, song.get("key_lp", 2600))
    mel = lowpass_fast(mel_t.buf, song.get("mel_lp", 3600))
    d_n = int(spb * song.get("echo", 0.75) * SR)
    mel_e = mel.copy()
    for k in range(1, 6):
        if d_n * k < N:
            mel_e[d_n * k:] += np.roll(mel, 0, axis=0)[: N - d_n * k] * (0.5 ** k) * (np.array([1.0, 0.8]) if k % 2 else np.array([0.8, 1.0]))
    wet_src = pad * 0.9 + key_b + mel_e
    dry = pad + key_b + mel_e
    verb = reverb(wet_src, song.get("room", 2.4), rng, song.get("wet", 0.5)) - wet_src
    drums = drum_t.buf
    drums_v = reverb(drums, 0.9, rng, 0.12) - drums if song.get("drum_room", True) else 0
    mix = dry + verb * 0.8 + bass * song.get("bass_gain", 1.25) + drums * song.get("drum_gain", 0.8) + drums_v + tex_t.buf
    # wrap tail so the loop is seamless
    n_loop = int(total * SR)
    body = mix[:n_loop].copy(); over = mix[n_loop:]
    body[: len(over)] += over
    body = lowpass_fast(body, song.get("master_lp", 9500))
    if song.get("vinyl"):
        body += rng.normal(0, 0.0025, body.shape)
        pops = rng.uniform(0, 1, len(body)) > 0.99985
        body[pops] += rng.normal(0, 0.06, (pops.sum(), 2))
    return body
