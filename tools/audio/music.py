"""Genre-wise 8-bit song catalog. Each song is data (key, mode, tempo, progressions, rhythm, instrument choices);
the composer renders 32 bars (4 intro, 8 A, 8 B, 4 break, 8 A') into a seamless stereo loop."""
import numpy as np
from synth import SR, Track, voice, noise, lowpass_fast, highpass, soft, mtof

MODES = {
    "major": [0, 2, 4, 5, 7, 9, 11], "minor": [0, 2, 3, 5, 7, 8, 10], "dorian": [0, 2, 3, 5, 7, 9, 10],
    "phrygian": [0, 1, 3, 5, 7, 8, 10], "mixolydian": [0, 2, 4, 5, 7, 9, 10], "lydian": [0, 2, 4, 6, 7, 9, 11],
}

def deg(root, mode, d):
    """Scale degree (any integer, may span octaves) -> midi."""
    sc = MODES[mode]
    return root + sc[d % 7] + 12 * (d // 7)

def chord(root, mode, d, size=3):
    return [deg(root, mode, d + 2 * i) for i in range(size)]

# bass: 16 chars per bar. r root, 5 fifth, 8 octave, 3 third, - rest/hold previous
BASS = {
    "four": "r---r---r---r---", "off8": "r-8-r-8-r-8-r-8-", "drive": "r-rrr-rrr-rrr-rr", "walk": "r---3---5---3---",
    "synth": "r-r-r-r-r-r-r-r-", "funk": "r--r-8-r--r-5--8", "half": "r-------5-------", "pump": "r-r-8-r-r-r-8-r-",
    "bossa": "r-----5-r--5-r--", "offbeat": "--r---r---r---r-", "march": "r---r---5---r---",
}
# drums: kick k, snare s, hat h, open hat o, clap c
DRUMS = {
    "rock":   {"k": "x...x...x...x...", "s": "....x.......x...", "h": "x.x.x.x.x.x.x.x."},
    "four":   {"k": "x...x...x...x...", "s": "....x.......x...", "h": "..x...x...x...x.", "o": "..x...x...x...x."},
    "break":  {"k": "x.....x...x.....", "s": "....x.......x..x", "h": "x.x.x.x.x.x.x.xx"},
    "funk":   {"k": "x..x..x...x..x..", "s": "....x..x....x...", "h": "x.xxx.xxx.xxx.xx"},
    "chill":  {"k": "x.....x...x.....", "s": "....x.......x...", "h": "x.x.x.x.x.x.x.x."},
    "synth":  {"k": "x...x...x...x...", "s": "....x.......x...", "h": "x.x.x.x.x.x.x.x.", "c": "....x.......x..."},
    "tense":  {"k": "x.......x.x.....", "s": "........x.......", "h": "x...x...x...x..."},
    "march":  {"k": "x...x...x...x...", "s": "x.x.x.x.x.x.x.xx", "h": "................"},
    "bossa":  {"k": "x..x..x...x..x..", "s": "..x..x...x..x...", "h": "x.x.x.x.x.x.x.x."},
}

def drum_hit(kind, rng):
    if kind == "k":
        n = int(0.16 * SR); t = np.arange(n) / SR
        f = 45 + 130 * np.exp(-t * 28)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * 1.0
    if kind == "s":
        n = int(0.17 * SR); t = np.arange(n) / SR
        nz = noise(n, 9000, rng) * np.exp(-t * 22)
        tn = np.sign(np.sin(2 * np.pi * np.cumsum(190 - 90 * t / 0.17) / SR)) * np.exp(-t * 30) * 0.5
        return (nz * 0.9 + tn) * 0.8
    if kind == "c":
        n = int(0.2 * SR); t = np.arange(n) / SR
        return noise(n, 12000, rng) * (np.exp(-t * 18) + 0.6 * np.exp(-((t - 0.012) ** 2) * 9e3)) * 0.7
    if kind == "h":
        n = int(0.04 * SR); t = np.arange(n) / SR
        return noise(n, 16000, rng) * np.exp(-t * 90) * 0.38
    if kind == "o":
        n = int(0.16 * SR); t = np.arange(n) / SR
        return noise(n, 16000, rng) * np.exp(-t * 20) * 0.28
    return np.zeros(10)

def render(song, seed):
    rng = np.random.default_rng(seed)
    bpm = song["bpm"]; spb = 60.0 / bpm; step = spb / 4
    swing = song.get("swing", 0.0)
    bars = 32
    total = bars * 4 * spb
    tail = 2.5
    tr = {k: Track(total + tail) for k in ("lead", "arp", "bass", "pad", "drums", "ctr")}
    root = song["root"]; mode = song["mode"]

    def t_of(bar, st):  # seconds of a 16th-step inside a bar, swing on odd steps
        sw = swing * step * 0.5 if st % 2 == 1 else 0.0
        return (bar * 16 + st) * step + sw

    # section plan: (start bar, len, name)
    plan = [(0, 4, "intro"), (4, 8, "A"), (12, 8, "B"), (20, 4, "break"), (24, 8, "A2")]
    prog_a, prog_b = song["prog_a"], song["prog_b"]

    # motifs: list of (step, length_in_steps, scale-step offset from chord root), two bars each
    def make_motif(seed2, style):
        r = np.random.default_rng(seed2)
        rhy = song["rhythms"][style % len(song["rhythms"])]
        cur = [0, 2, 4, 2][int(r.integers(0, 4))]
        notes = []
        for bar_i in range(2):
            for k, (st, ln) in enumerate(rhy[bar_i]):
                strong = (st % 4 == 0)
                pool = [0, 2, 4, 7] if strong else [-1, 0, 1, 2, 3, 4, 5]
                tgt = int(r.choice(pool))
                # drift toward target, never leap more than a fifth
                cur = int(np.clip(tgt, cur - 4, cur + 4))
                notes.append((bar_i * 16 + st, ln, cur))
        return notes

    motifA = make_motif(seed + 1, 0)
    motifB = make_motif(seed + 2, 1)
    motifC = make_motif(seed + 3, 0)  # answer phrase for the A repeat

    lead_kind = song.get("lead", ("pulse", 0.25))
    arp_pat = song.get("arp", [0, 1, 2, 1])
    arp_rate = song.get("arp_rate", 1)  # steps per arp note
    drum = DRUMS[song["drums"]]
    drum_b = DRUMS[song.get("drums_b", song["drums"])]
    bass_pat = BASS[song["bass"]]
    bass_b = BASS[song.get("bass_b", song["bass"])]
    bass_oct = song.get("bass_oct", -2)
    pad_vel = song.get("pad", 0.18)
    vib = song.get("vib", (0.12, 6.0))
    lead_vel = song.get("lead_vel", 0.55)
    lead_env = song.get("lead_env", (0.004, 0.35, 0.55, 0.08))
    lead_shift = song.get("lead_shift", 12)

    for (b0, blen, name) in plan:
        for bi in range(blen):
            bar = b0 + bi
            prog = prog_b if name in ("B", "break") else prog_a
            d = prog[bi % len(prog)]
            ch = chord(root, mode, d, 4 if song.get("sevenths") else 3)
            has = {
                "drums": name in ("A", "B", "A2") or (name == "intro" and bi >= 2 and song.get("intro_hat", True)),
                "bass": name in ("A", "B", "A2") or (name == "intro" and bi >= 2),
                "arp": name != "A2" or True,
                "pad": name in ("intro", "B", "break", "A2"),
                "lead": name in ("A", "B", "A2") and not (name == "A" and bi < 0),
                "ctr": name in ("B", "A2"),
            }
            if name == "intro":
                has["lead"] = False
            # ---- pad
            if has["pad"] and song.get("pad", 0.18) > 0:
                for m in ch:
                    for dt in (-0.18, 0.18):
                        w = voice("pulse", m + 12 * song.get("pad_oct", 0), 4 * spb * 1.02, pad_vel, 0.5, env=(0.12, 1.0, 1.0, 0.25), detune=dt * 0.1)
                        tr["pad"].add(t_of(bar, 0), w, pan=dt * 3)
            # ---- arp
            if has["arp"] and song.get("arp_vel", 0.3) > 0:
                extended = ch + [x + 12 for x in ch]
                vol = song.get("arp_vel", 0.3) * (0.55 if name in ("intro", "break") else 1.0)
                for st in range(0, 16, arp_rate):
                    idx = arp_pat[(st // arp_rate) % len(arp_pat)]
                    m = extended[idx % len(extended)] + song.get("arp_shift", 12)
                    w = voice("pulse", m, step * arp_rate * 0.9, vol, song.get("arp_duty", 0.125), env=(0.001, 0.07, 0.0, 0.02))
                    tr["arp"].add(t_of(bar, st), w, pan=0.5 if (st // arp_rate) % 2 else -0.5)
            # ---- bass
            if has["bass"]:
                pat = bass_b if name == "B" else bass_pat
                for st, c in enumerate(pat):
                    if c in "-.":
                        continue
                    m = {"r": ch[0], "5": ch[2] if len(ch) > 2 else ch[0] + 7, "8": ch[0] + 12, "3": ch[1]}[c] + 12 * bass_oct + 24
                    while m > 50:
                        m -= 12
                    ln = step * 1.8 if song["bass"] not in ("half",) else step * 7
                    w = voice(song.get("bass_kind", "tri"), m, ln, 0.9 if song.get("bass_kind", "tri") == "tri" else 0.45, 0.5, env=(0.002, 0.2, 0.7, 0.04))
                    tr["bass"].add(t_of(bar, st), w, pan=0.0)
            # ---- drums
            if has["drums"]:
                dm = drum_b if name == "B" else drum
                for k, pat in dm.items():
                    for st, c in enumerate(pat):
                        if c == "x":
                            vel = 0.9 if (st % 4 == 0) else 0.7
                            tr["drums"].add(t_of(bar, st), drum_hit(k, rng), pan=0.0 if k in "ks" else (0.3 if st % 4 else -0.3), gain=vel)
                if bi == 0 and name in ("A", "B", "A2"):  # crash on section start
                    tr["drums"].add(t_of(bar, 0), drum_hit("c", rng) * 1.2, gain=0.9)
                if bi == blen - 1 and song.get("fill", True):  # little snare fill on the last beat
                    for st in (12, 13, 14, 15):
                        tr["drums"].add(t_of(bar, st), drum_hit("s", rng), gain=0.55 + 0.1 * (st - 12))
            # ---- lead
            if has["lead"]:
                if name == "A":
                    mo = motifA
                elif name == "B":
                    mo = motifB
                else:
                    mo = motifC if bi % 4 >= 2 else motifA
                # two-bar motif: bar parity picks half; chord-following transposition
                half = bi % 2
                phrase_end = (bi % 4 == 3)
                for (st2, ln, off) in mo:
                    if st2 // 16 != half:
                        continue
                    st = st2 % 16
                    note_deg = d + off
                    m = deg(root, mode, note_deg) + lead_shift
                    if phrase_end and st >= 8:   # cadence: land on a chord tone, long
                        m = ch[0] + lead_shift + (12 if off > 3 else 0)
                    L = ln * step * (0.95 if song.get("legato", False) else 0.85)
                    w = voice(lead_kind[0], m, L, lead_vel, lead_kind[1], vib=vib, env=lead_env)
                    tr["lead"].add(t_of(bar, st), w, pan=-0.12)
                    if name == "B" or name == "A2":  # harmony a third above on stronger notes
                        if st % 4 == 0 and song.get("harmony", True):
                            hm = deg(root, mode, note_deg + 2) + lead_shift
                            w2 = voice("pulse", hm, L, lead_vel * 0.45, 0.125, vib=vib, env=lead_env)
                            tr["ctr"].add(t_of(bar, st), w2, pan=0.3)

    # ---- effects & mix
    lead = tr["lead"].buf
    delay = song.get("delay")
    if delay:
        d_n = int(delay[0] * spb * SR); fb = delay[1]
        out = lead.copy()
        for k in range(1, 5):
            if d_n * k < len(out):
                out[d_n * k:] += np.roll(lead, 0, axis=0)[: len(out) - d_n * k] * (fb ** k) * np.array([1.0, 0.9] if k % 2 else [0.9, 1.0])
        tr["lead"].buf = out
    for k in ("pad", "arp", "ctr"):
        if song.get("soften"):
            tr[k].buf = lowpass_fast(tr[k].buf, song["soften"])
    mix = (tr["lead"].buf * 1.0 + tr["arp"].buf * 1.0 + tr["bass"].buf * 1.15 + tr["pad"].buf * 1.0 + tr["ctr"].buf * 0.9 + tr["drums"].buf * song.get("drum_gain", 0.95))
    # wrap the tail onto the start so the loop is seamless
    n_loop = int(total * SR)
    body = mix[:n_loop].copy()
    over = mix[n_loop:]
    body[: len(over)] += over
    if song.get("lofi"):
        body = lowpass_fast(body, 5200)
        body = np.repeat(body[::2], 2, axis=0)[: len(body)]            # 16 kHz sample-and-hold crunch
        body += rng.normal(0, 0.012, body.shape) * (rng.uniform(0, 1, (len(body), 1)) > 0.995)  # vinyl crackle
        body += rng.normal(0, 0.003, body.shape)
    body = soft(body * 1.1, 1.0)
    return body
