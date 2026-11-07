"""Chill, bass-heavy catalog (engine: chill.py). prog entries are (semitones above key, chord quality)."""

FORM = [("intro", 4), ("A", 8), ("B", 8), ("C", 8), ("A2", 8), ("B2", 8), ("outro", 4)]
LAYERS = {
    "intro": {"pad"}, "A": {"pad", "bass", "drums"}, "B": {"pad", "bass", "drums", "key", "lead"},
    "C": {"pad", "lead", "kick", "swell"}, "A2": {"pad", "bass", "drums", "key"}, "B2": {"pad", "bass", "drums", "key", "lead"},
    "outro": {"pad", "bass", "kick"},
}
AMB = dict(LAYERS, A={"pad", "bass", "kick"}, B={"pad", "bass", "kick", "lead"}, A2={"pad", "bass", "key"}, B2={"pad", "bass", "kick", "key", "lead"})


def progs(a, b, c):
    """A and A2 share `a`, B and B2 share `b`, C is `c`; intro/outro borrow from A."""
    return {"intro": a, "A": a, "B": b, "C": c, "A2": a, "B2": b, "outro": a}


CHILL = [
    dict(id="cold-aisle", title="Cold Aisle", genre="Lo-fi hip-hop", moods=["title", "play", "calm"], seed=101, engine="chill",
         bpm=78, key=45, scale="minor_pent", swing=0.55, bass="boom", bass_top=45, form=FORM, layers=LAYERS, vinyl=True,
         prog=progs([(0, "m9"), (5, "m9"), (10, "9"), (3, "maj9")], [(5, "m9"), (3, "maj9"), (10, "9"), (0, "m9"), (8, "maj7"), (3, "maj9"), (7, "7"), (0, "m9")], [(8, "maj7"), (7, "7"), (0, "m9"), (0, "m9")]),
         drums=dict(k=[0, 10], s=[4, 12], ghost=[7, 15], h=[0.8, 0, 0.5, 0, 0.8, 0, 0.5, 0.3, 0.8, 0, 0.5, 0, 0.8, 0, 0.5, 0], kprob=0.9),
         lead_density={"B": 0.7, "C": 0.5, "B2": 0.8}, lead=("pulse", 0.25), mel_lp=3000, stab=[6, 14], master_lp=8000, pad_vel=0.09),
    dict(id="sub-zero", title="Sub Zero", genre="Dub techno", moods=["play", "drive"], seed=202, engine="chill",
         bpm=112, key=43, scale="dorian", swing=0.0, bass="dub", bass_top=43, form=FORM, layers=LAYERS, echo=0.75, duck=0.65, room=3.2, wet=0.6,
         prog=progs([(0, "m9"), (0, "m9"), (5, "m9"), (5, "m9")], [(0, "m11"), (3, "maj9"), (5, "m9"), (7, "m7")], [(0, "m9"), (10, "maj7"), (0, "m9"), (10, "maj7")]),
         drums=dict(k=[0, 4, 8, 12], s=[12], h=[0, 0, 0.9, 0, 0, 0, 0.9, 0, 0, 0, 0.9, 0, 0, 0, 0.9, 0.3], o=[6, 14], kprob=1.0),
         stab=[3, 7, 11], pad_lo=500, pad_hi=2400, lead_density={"B": 0.45, "C": 0.4, "B2": 0.6}, lead=("tri", 0.5), lead_vel=0.45, bass_gain=1.35, drum_gain=0.7, master_lp=7000),
    dict(id="heat-sink", title="Heat Sink", genre="Trip-hop", moods=["play"], seed=303, engine="chill",
         bpm=84, key=41, scale="minor", swing=0.2, bass="sub", bass_top=41, form=FORM, layers=LAYERS, room=2.8, wet=0.55, duck=0.55,
         prog=progs([(0, "m9"), (8, "maj7"), (10, "maj7"), (7, "m7")], [(0, "m11"), (8, "maj7"), (3, "maj9"), (10, "7")], [(5, "m9"), (3, "maj7"), (7, "m7"), (0, "m9")]),
         drums=dict(k=[0, 7, 10], s=[4, 12], ghost=[14], h=[0.6, 0, 0, 0.4, 0.6, 0, 0.4, 0, 0.6, 0, 0, 0.4, 0.6, 0, 0.4, 0], kprob=0.95),
         lead_density={"B": 0.6, "C": 0.5, "B2": 0.75}, lead=("pulse", 0.25), lead_vel=0.32, vinyl=True, master_lp=8800, bass_gain=1.3),
    dict(id="night-shift", title="Night Shift", genre="Ambient chill", moods=["play", "calm"], seed=404, engine="chill",
         bpm=66, key=38, scale="lydian", swing=0.0, bass="sub", bass_top=38, form=FORM, layers=AMB, room=4.0, wet=0.8, duck=0.3, sweep_bars=24, echo=1.0,
         prog=progs([(0, "maj9"), (9, "m9"), (5, "maj9"), (7, "sus")], [(4, "m9"), (9, "m9"), (5, "maj9"), (0, "maj9")], [(2, "m9"), (7, "sus"), (5, "maj9"), (0, "6")]),
         drums=dict(k=[0], s=[], h=[0] * 16), pad_vel=0.12, lead_density={"B": 0.45, "C": 0.4, "B2": 0.55}, lead=("tri", 0.5), lead_vel=0.42, mel_lp=2800,
         bass_gain=1.15, drum_gain=0.6, master_lp=8500),
    dict(id="blue-light", title="Blue Light", genre="Future garage", moods=["play", "drive"], seed=505, engine="chill",
         bpm=132, key=40, scale="minor_pent", swing=0.45, bass="sub", bass_top=40, form=FORM, layers=LAYERS, room=2.6, wet=0.5, duck=0.6,
         prog=progs([(0, "m9"), (8, "maj9"), (3, "maj7"), (10, "9")], [(8, "maj9"), (10, "9"), (0, "m11"), (0, "m9")], [(5, "m9"), (3, "maj7"), (8, "maj7"), (7, "m7")]),
         drums=dict(k=[0, 10], s=[8], ghost=[3, 14], h=[0.7, 0, 0.5, 0.4, 0.7, 0, 0.5, 0.4, 0.7, 0, 0.5, 0.4, 0.7, 0, 0.5, 0.4], o=[], kprob=1.0),
         stab=[3, 6, 11], lead_density={"B": 0.8, "C": 0.5, "B2": 0.95}, lead=("pulse", 0.125), lead_vel=0.3, bass_gain=1.3, drum_gain=0.75),
    dict(id="brownout", title="Brownout", genre="Dark ambient", moods=["crisis"], seed=606, engine="chill",
         bpm=70, key=36, scale="phrygian", swing=0.0, bass="sub", bass_top=36, form=FORM, layers=AMB, room=4.2, wet=0.85, duck=0.2, sweep_bars=12, echo=1.5,
         prog=progs([(0, "m9"), (1, "maj7"), (0, "m11"), (8, "maj7")], [(0, "m"), (1, "maj7"), (3, "maj7"), (1, "maj7")], [(8, "maj7"), (7, "m7"), (1, "maj7"), (0, "m9")]),
         drums=dict(k=[0, 10], s=[], h=[0] * 16), pad_vel=0.13, lead_density={"B": 0.35, "C": 0.3, "B2": 0.4}, lead=("tri", 0.5), lead_vel=0.4, mel_lp=2200,
         bass_gain=1.3, drum_gain=0.7, master_lp=7500),
]
