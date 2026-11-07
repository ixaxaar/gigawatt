#!/usr/bin/env python3
"""Render the whole audio catalog into godot/assets/audio (committed output; rerun only when editing sounds/songs).
usage: python3 tools/audio/generate.py [sfx|music|all] [song-id ...]
Needs numpy, scipy and ffmpeg (for the Ogg Vorbis music encode)."""
import json, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from synth import SR, write_wav
import sfx, music, songs

OUT = Path(__file__).resolve().parents[2] / "godot" / "assets" / "audio"
# per-cue playback trim in dB (the files are peak-normalised) and pitch jitter for cues you hear a lot
LEVEL = {"hover": -16, "tick": -14, "click": -9, "tab": -10, "month": -14, "notif": -9, "open": -12, "close": -12, "toggle_on": -10, "toggle_off": -10,
         "confirm": -8, "cancel": -9, "error": -8, "step_ok": -9, "buy": -7, "sell": -8, "cash_big": -6, "order": -8, "loan": -8, "rack_place": -8,
         "online": -8, "delivery": -9, "good": -8, "fanfare": -6, "keynote": -7, "bad": -8, "incident": -8, "alarm": -9, "power_down": -8,
         "gameover": -6, "save": -10, "load": -10, "boot": -6}
JITTER = ["hover", "tick", "click", "tab", "month"]


def build_sfx():
    d = OUT / "sfx"; d.mkdir(parents=True, exist_ok=True)
    cat = {}
    for name, (fn, group) in sfx.CATALOG.items():
        w = fn()
        write_wav(d / f"{name}.wav", w)
        cat[name] = {"group": group, "db": LEVEL.get(name, -8), "jitter": name in JITTER, "ms": int(len(w) / SR * 1000)}
        print(f"sfx {name:12s} {len(w) / SR * 1000:6.0f} ms")
    return cat


def build_music(only):
    d = OUT / "music"; d.mkdir(parents=True, exist_ok=True)
    cat = []
    for s in songs.SONGS:
        if only and s["id"] not in only:
            continue
        print(f"music {s['id']} ({s['genre']}, {s['bpm']} bpm) ...", flush=True)
        body = music.render(s, s["seed"])
        wav = d / f"{s['id']}.wav"; ogg = d / f"{s['id']}.ogg"
        import numpy as np
        body = body - body.mean(axis=0)
        body = body * (0.105 / np.sqrt(np.mean(body ** 2)))      # ~ -20 dBFS RMS: songs sit under the effects
        body = np.tanh(body / 0.8) * 0.8                          # soft ceiling instead of hard clipping
        write_wav(wav, body, peak=None)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libvorbis", "-b:a", "72k", str(ogg)], check=True)
        wav.unlink()
        print(f"  {len(body) / SR:.1f}s  {ogg.stat().st_size // 1024} KB")
    for s in songs.SONGS:
        cat.append({"id": s["id"], "title": s["title"], "genre": s["genre"], "bpm": s["bpm"], "moods": s["moods"], "file": f"music/{s['id']}.ogg"})
    return cat


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    only = set(sys.argv[2:])
    OUT.mkdir(parents=True, exist_ok=True)
    cpath = OUT / "catalog.json"
    old = json.loads(cpath.read_text()) if cpath.exists() else {}
    cat = {"sfx": old.get("sfx", {}), "music": old.get("music", [])}
    if what in ("sfx", "all"):
        cat["sfx"] = build_sfx()
    if what in ("music", "all"):
        cat["music"] = build_music(only)
    cpath.write_text(json.dumps(cat, indent=1))
    print("wrote", cpath)
