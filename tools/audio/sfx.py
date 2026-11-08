"""Sound-effect catalog. Every cue is a short mono 8-bit-flavoured render. name -> (builder, group)."""
import numpy as np
from synth import SR, voice, noise, lowpass_fast, highpass, mtof, soft

rng = np.random.default_rng(42)
P = lambda *a, **k: voice("pulse", *a, **k)
T = lambda *a, **k: voice("tri", *a, **k)
N = lambda *a, **k: voice("noise", *a, rng=rng, **k)
SNAP = (0.001, 0.05, 0.0, 0.01)   # percussive blip


def seq(parts, length=None):
    """parts: list of (start_seconds, mono). Returns one mono buffer."""
    end = max(t + len(w) / SR for t, w in parts)
    out = np.zeros(int((length or end) * SR) + 1)
    for t, w in parts:
        i = int(t * SR)
        out[i : i + len(w)] += w[: len(out) - i]
    return out


def notes(midis, step, dur=None, mk=None, vel=0.8, t0=0.0):
    mk = mk or (lambda m, d: P(m, d, vel, 0.25, env=(0.002, 0.08, 0.5, 0.04)))
    return [(t0 + i * step, mk(m, dur or step)) for i, m in enumerate(midis)]


# ---------- interaction sounds ----------
def hover():
    return P(96, 0.02, 0.35, 0.125, env=SNAP)

def click():
    return seq([(0, N(120, 0.004, 0.5, env=SNAP)), (0, P(84, 0.03, 0.6, 0.5, env=(0.001, 0.03, 0.0, 0.01)))])

def confirm():
    return seq(notes([84, 91, 96], 0.05, 0.06, vel=0.7))

def cancel():
    return seq(notes([79, 72], 0.055, 0.06, vel=0.65))

def toggle_on():
    return seq(notes([79, 86], 0.04, 0.05, vel=0.6))

def toggle_off():
    return seq(notes([86, 79], 0.04, 0.05, vel=0.6))

def error():
    return seq([(0, P(40, 0.09, 0.6, 0.5, env=(0.001, 1, 1, 0.01))), (0.11, P(38, 0.12, 0.6, 0.5, env=(0.001, 1, 1, 0.02)))])

def tab():
    return seq([(0, N(100, 0.006, 0.4, env=SNAP)), (0, T(79, 0.04, 0.8, env=(0.001, 0.05, 0.1, 0.01)))])

def tick():
    return P(104, 0.012, 0.4, 0.25, env=SNAP)

def open_panel():
    return seq([(0, P(72, 0.09, 0.5, 0.25, slide=14, env=(0.002, 0.2, 0.6, 0.03))), (0.0, N(90, 0.1, 0.12, env=(0.01, 0.1, 0.3, 0.02)))])

def close_panel():
    return seq([(0, P(86, 0.09, 0.5, 0.25, slide=-14, env=(0.002, 0.2, 0.6, 0.03)))])

def notif():
    return seq(notes([88, 95], 0.07, 0.1, mk=lambda m, d: T(m, d, 0.9, env=(0.002, 0.1, 0.2, 0.06))))

def step_ok():
    return seq(notes([83, 88, 95], 0.06, 0.09, mk=lambda m, d: P(m, d, 0.55, 0.125, env=(0.002, 0.12, 0.3, 0.06))))


# ---------- money ----------
def rustle(dur=0.16, bills=5):
    """Banknotes being peeled off a stack: rapid band-limited noise flutters."""
    n = int(dur * SR)
    base = highpass(lowpass_fast(rng.uniform(-1, 1, n), 5200), 900)
    gate = np.zeros(n)
    for k in range(bills):
        s = int((k + rng.uniform(0, 0.3)) / bills * n * 0.9)
        L = int(rng.uniform(0.012, 0.03) * SR)
        gate[s : s + L] += np.linspace(1, 0, min(L, n - s)) ** 1.5
    return base * np.minimum(gate, 1.0) * 0.8

def ching(m=96, vel=0.7):
    """Coin / cash-drawer bell: two inharmonic partials with a bright pulse transient."""
    parts = [(0, P(m, 0.35, vel * 0.5, 0.125, env=(0.001, 0.12, 0.0, 0.2))),
             (0, P(m + 7.02, 0.35, vel * 0.35, 0.5, env=(0.001, 0.1, 0.0, 0.2))),
             (0, T(m + 12.3, 0.4, vel * 0.5, env=(0.001, 0.2, 0.0, 0.25)))]
    return seq(parts)

def buy():
    return seq([(0, rustle(0.17, 5)), (0.15, ching(95, 0.8)), (0.2, ching(100, 0.55))])

def sell():
    parts = [(i * 0.045, ching(88 + (i % 4) * 3 + i, 0.5 - i * 0.03)) for i in range(7)]
    return seq([(0, rustle(0.09, 3))] + parts)

def cash_big():
    parts = [(0, rustle(0.3, 9)), (0.28, ching(91, 0.8)), (0.38, ching(98, 0.8)), (0.5, ching(103, 0.7))]
    parts += notes([79, 83, 86, 91, 95], 0.06, 0.15, vel=0.4, t0=0.62)
    return seq(parts)

def order_placed():
    thunk = P(40, 0.08, 0.9, 0.5, slide=-14, env=(0.001, 0.05, 0.0, 0.03))
    return seq([(0, thunk), (0, N(120, 0.05, 0.7, env=SNAP)), (0.1, P(91, 0.06, 0.5, 0.25, env=SNAP)), (0.16, P(96, 0.12, 0.5, 0.25, env=(0.001, 0.08, 0.2, 0.06)))])

def loan():
    return seq([(0, rustle(0.2, 6))] + notes([79, 76, 72, 67], 0.07, 0.1, mk=lambda m, d: T(m, d, 0.9, env=(0.002, 0.1, 0.3, 0.05)), t0=0.18))


# ---------- datacenter events ----------
def month():
    return seq([(0, T(67, 0.05, 0.7, env=(0.001, 0.08, 0.1, 0.03))), (0.09, T(60, 0.07, 0.7, env=(0.001, 0.1, 0.1, 0.05)))])

def rack_place():
    return seq([(0, P(32, 0.1, 0.9, 0.5, slide=-8, env=(0.001, 0.06, 0.0, 0.05))), (0, N(130, 0.07, 0.6, env=SNAP)),
                (0.1, P(60, 0.16, 0.25, 0.125, slide=18, env=(0.01, 0.2, 0.5, 0.04))), (0.28, P(96, 0.04, 0.4, 0.25, env=SNAP))])

def online():
    return seq(notes([72, 76, 79, 84, 88, 91], 0.055, 0.08, mk=lambda m, d: P(m, d, 0.6, 0.25, env=(0.002, 0.1, 0.4, 0.05))) +
               [(0.36, P(96, 0.3, 0.5, 0.125, vib=(0.2, 7), env=(0.003, 0.2, 0.5, 0.18)))])

def delivery():
    return seq(notes([76, 72, 76, 72], 0.1, 0.09, mk=lambda m, d: T(m, d, 0.95, env=(0.002, 0.2, 0.4, 0.04))) + [(0.45, ching(93, 0.5))])

def good():
    return seq(notes([72, 76, 79, 84], 0.075, 0.09, vel=0.65) + [(0.3, P(88, 0.4, 0.6, 0.25, vib=(0.15, 6), env=(0.003, 0.25, 0.5, 0.2))), (0.3, T(76, 0.4, 0.9, env=(0.003, 0.3, 0.4, 0.2)))])

def fanfare():
    """Mission / milestone: a short heroic brass-ish phrase."""
    lead = [(0.0, 72, 0.12), (0.14, 72, 0.12), (0.28, 72, 0.12), (0.42, 76, 0.3), (0.76, 74, 0.12), (0.9, 79, 0.6)]
    parts = [(t, P(m, d, 0.65, 0.5, vib=(0.12, 6), env=(0.004, 0.2, 0.6, 0.1))) for t, m, d in lead]
    parts += [(t, P(m - 12, d, 0.4, 0.25, env=(0.004, 0.2, 0.6, 0.1))) for t, m, d in lead]
    parts += [(0.9, T(60, 0.7, 0.9, env=(0.004, 0.4, 0.5, 0.3))), (0.9, P(84, 0.7, 0.3, 0.125, env=(0.004, 0.3, 0.4, 0.3)))]
    return seq(parts)

def keynote():
    pad = [(0.0, [60, 64, 67]), (0.35, [62, 65, 69]), (0.7, [64, 67, 71]), (1.05, [67, 71, 74, 79])]
    parts = []
    for t, ch in pad:
        for m in ch:
            parts.append((t, P(m + 12, 0.42, 0.28, 0.5, env=(0.01, 0.3, 0.6, 0.25))))
        parts.append((t, T(ch[0] - 12, 0.4, 0.9, env=(0.004, 0.3, 0.6, 0.2))))
    parts += [(1.05 + i * 0.07, P(m, 0.3, 0.4, 0.125, env=(0.002, 0.15, 0.3, 0.2))) for i, m in enumerate([91, 95, 98, 103])]
    return seq(parts)

def bad():
    return seq([(0, P(55, 0.14, 0.7, 0.5, slide=-5, vib=(0.4, 14), env=(0.002, 0.3, 0.6, 0.05))), (0.15, P(48, 0.25, 0.7, 0.5, slide=-6, vib=(0.5, 14), env=(0.002, 0.4, 0.6, 0.12)))])

def incident():
    return seq([(0, P(81, 0.08, 0.6, 0.25, env=SNAP)), (0.14, P(81, 0.08, 0.6, 0.25, env=SNAP)), (0.28, P(74, 0.22, 0.6, 0.25, env=(0.002, 0.2, 0.5, 0.1)))])

def alarm():
    parts = []
    for i in range(4):
        parts.append((i * 0.2, P(81 if i % 2 == 0 else 74, 0.18, 0.55, 0.5, env=(0.002, 1.0, 1.0, 0.02))))
    return seq(parts)

def power_down():
    return seq([(0, P(72, 0.5, 0.6, 0.25, slide=-30, env=(0.002, 0.5, 0.6, 0.1))), (0, N(60, 0.5, 0.25, env=(0.002, 0.5, 0.4, 0.1)))])

def gameover():
    ms = [67, 65, 63, 60]
    parts = [(i * 0.26, P(m, 0.34, 0.6, 0.5, vib=(0.3, 6), env=(0.004, 0.4, 0.5, 0.2))) for i, m in enumerate(ms)]
    parts += [(i * 0.26, T(m - 12, 0.34, 0.9, env=(0.004, 0.4, 0.5, 0.2))) for i, m in enumerate(ms)]
    parts.append((1.04, P(55, 0.9, 0.5, 0.5, slide=-2, vib=(0.4, 5), env=(0.004, 0.8, 0.5, 0.5))))
    return seq(parts)

def save():
    return seq([(0, N(70, 0.18, 0.28, env=(0.002, 0.3, 0.6, 0.02))), (0.0, P(60, 0.18, 0.25, 0.5, vib=(1.5, 30), env=(0.002, 0.3, 0.6, 0.02))),
                (0.2, P(91, 0.05, 0.5, 0.25, env=SNAP)), (0.26, P(96, 0.1, 0.5, 0.25, env=(0.002, 0.1, 0.2, 0.05)))])

def load_game():
    return seq([(0, P(96, 0.05, 0.5, 0.25, env=SNAP)), (0.06, P(91, 0.05, 0.5, 0.25, env=SNAP)),
                (0.14, N(70, 0.18, 0.28, env=(0.002, 0.3, 0.6, 0.02))), (0.14, P(66, 0.18, 0.25, 0.5, vib=(1.5, 30), env=(0.002, 0.3, 0.6, 0.02)))])

def boot():
    """Start-up: a soft low swell with a quiet bell on top. Everything stays below ~2 kHz so it is warm, never sharp."""
    n = int(2.0 * SR); t = np.arange(n) / SR
    env = np.minimum(1.0, t / 0.55) ** 2 * np.exp(-np.maximum(0.0, t - 0.9) * 2.4)
    pad = np.zeros(n)
    for m, g in ((48, 0.9), (55, 0.7), (60, 0.55), (64, 0.4), (67, 0.25)):
        for det in (-0.03, 0.03):
            f = mtof(m + det); pad += g * (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)) * 0.5
    pad = lowpass_fast(lowpass_fast(pad * env, 1400), 1800)
    thump = np.sin(2 * np.pi * np.cumsum(46 + 24 * np.exp(-t * 14)) / SR) * np.exp(-t * 7) * 0.7
    bt = np.arange(int(1.4 * SR)) / SR
    bell = (np.sin(2 * np.pi * mtof(76) * bt) + 0.3 * np.sin(2 * np.pi * mtof(88) * bt)) * np.exp(-bt * 3.2) * np.minimum(1.0, bt / 0.01) * 0.22
    out = pad * 0.9 + thump * 0.8
    i = int(0.5 * SR); out[i : i + len(bell)] += bell[: n - i]
    return lowpass_fast(out, 2200)

def sell_stock():
    return sell()


CATALOG = {
    # interaction
    "hover": (hover, "ui"), "click": (click, "ui"), "confirm": (confirm, "ui"), "cancel": (cancel, "ui"),
    "toggle_on": (toggle_on, "ui"), "toggle_off": (toggle_off, "ui"), "error": (error, "ui"), "tab": (tab, "ui"),
    "tick": (tick, "ui"), "open": (open_panel, "ui"), "close": (close_panel, "ui"), "notif": (notif, "ui"), "step_ok": (step_ok, "ui"),
    # money
    "buy": (buy, "money"), "sell": (sell, "money"), "cash_big": (cash_big, "money"), "order": (order_placed, "money"), "loan": (loan, "money"),
    # events
    "month": (month, "event"), "rack_place": (rack_place, "event"), "online": (online, "event"), "delivery": (delivery, "event"),
    "good": (good, "event"), "fanfare": (fanfare, "event"), "keynote": (keynote, "event"), "bad": (bad, "event"),
    "incident": (incident, "event"), "alarm": (alarm, "event"), "power_down": (power_down, "event"), "gameover": (gameover, "event"),
    "save": (save, "event"), "load": (load_game, "event"), "boot": (boot, "event"),
}
