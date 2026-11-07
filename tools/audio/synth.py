"""Tiny 8-bit synth: pulse / quantised-triangle / noise voices rendered with numpy. Deterministic (seeded)."""
import numpy as np

SR = 32000


def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69.0) / 12.0)


def _env(n, a, d, s, r, dur_n):
    """Attack / exp-decay-to-sustain / release envelope; the note body is dur_n samples, release is the rest."""
    t = np.arange(n) / SR
    body = s + (1.0 - s) * np.exp(-t / max(d, 1e-4))
    att = np.minimum(1.0, t / max(a, 1e-4))
    e = body * att
    if n > dur_n:
        rel = np.linspace(1.0, 0.0, n - dur_n) ** 1.5
        e[dur_n:] *= rel
    return e


def pulse(freq, n, duty=0.5):
    ph = np.cumsum(freq / SR)
    return np.where((ph % 1.0) < duty, 1.0, -1.0)


def tri(freq, n):
    ph = np.cumsum(freq / SR) % 1.0
    w = 2.0 * np.abs(2.0 * ph - 1.0) - 1.0
    return np.round(w * 7.5) / 7.5  # 4-bit like the NES triangle channel


def saw(freq, n, bits=4):
    ph = np.cumsum(freq / SR) % 1.0
    lv = 2 ** bits
    return np.round((ph * 2.0 - 1.0) * (lv / 2)) / (lv / 2)


def noise(n, rate, rng):
    """Sample-and-hold noise at `rate` Hz (low rate = crunchy, high = hissy)."""
    step = max(1, int(SR / rate))
    k = n // step + 2
    return np.repeat(rng.uniform(-1, 1, k), step)[:n]


def lowpass(x, cutoff):
    a = 1.0 - np.exp(-2 * np.pi * cutoff / SR)
    out = np.empty_like(x)
    if x.ndim == 1:
        acc = 0.0
        for i in range(len(x)):
            acc += a * (x[i] - acc)
            out[i] = acc
    else:
        acc = np.zeros(x.shape[1])
        for i in range(len(x)):
            acc += a * (x[i] - acc)
            out[i] = acc
    return out


def lowpass_fast(x, cutoff):
    """Vectorised one-pole via scipy when available (falls back to the loop)."""
    try:
        from scipy.signal import lfilter
        a = 1.0 - np.exp(-2 * np.pi * cutoff / SR)
        return lfilter([a], [1.0, -(1.0 - a)], x, axis=0)
    except ImportError:
        return lowpass(x, cutoff)


def highpass(x, cutoff):
    return x - lowpass_fast(x, cutoff)


class Track:
    """A stereo buffer notes get mixed into."""

    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.buf = np.zeros((self.n, 2))

    def add(self, t0, mono, pan=0.0, gain=1.0):
        i = int(t0 * SR)
        if i >= self.n:
            return
        m = mono[: self.n - i]
        l = gain * np.cos((pan + 1) * np.pi / 4)
        r = gain * np.sin((pan + 1) * np.pi / 4)
        self.buf[i : i + len(m), 0] += m * l
        self.buf[i : i + len(m), 1] += m * r


def voice(kind, midi, dur, vel=1.0, duty=0.5, vib=(0.0, 6.0), env=(0.003, 0.25, 0.6, 0.08), slide=0.0, rng=None, detune=0.0):
    """One note. kind: pulse | tri | saw | noise.  midi may be a float (pitch). slide: semitones travelled during the note."""
    a, d, s, r = env
    body = int(dur * SR)
    n = body + int(r * SR) + 1
    t = np.arange(n) / SR
    f0 = mtof(midi + detune)
    f = f0 * 2.0 ** ((slide * np.minimum(1.0, t / max(dur, 1e-3))) / 12.0)
    if vib[0] > 0:
        f = f * 2.0 ** ((vib[0] * np.sin(2 * np.pi * vib[1] * t) * np.minimum(1.0, t / 0.15)) / 12.0)
    if kind == "pulse":
        w = pulse(f, n, duty)
    elif kind == "tri":
        w = tri(f, n)
    elif kind == "saw":
        w = saw(f, n)
    else:
        w = noise(n, float(f0), rng or np.random.default_rng(1))
    return w * _env(n, a, d, s, r, body) * vel


def soft(x, drive=1.0):
    return np.tanh(x * drive)


def write_wav(path, stereo, peak=0.89):
    import wave
    x = np.asarray(stereo)
    if peak is not None:
        m = np.max(np.abs(x)) or 1.0
        x = x / m * peak
    if x.ndim == 1:
        x = x[:, None]
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(pcm.shape[1])
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
