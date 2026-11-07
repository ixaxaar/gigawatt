"""The catalog. mood tags drive the in-game music director: title, play (general rotation), calm, drive, crisis, triumph."""

R_ARCADE = [[(0, 2), (2, 2), (4, 2), (6, 2), (8, 4), (12, 2), (14, 2)], [(0, 2), (2, 2), (4, 4), (8, 2), (10, 2), (12, 4)]]
R_SLOW = [[(0, 6), (6, 2), (8, 4), (12, 4)], [(0, 4), (4, 4), (8, 6), (14, 2)]]
R_SYNC = [[(0, 3), (3, 3), (6, 2), (8, 3), (11, 3), (14, 2)], [(0, 3), (3, 3), (6, 4), (10, 2), (12, 4)]]
R_EIGHTH = [[(0, 2), (2, 2), (4, 2), (6, 2), (8, 2), (10, 2), (12, 2), (14, 2)], [(0, 2), (2, 2), (4, 2), (6, 2), (8, 4), (12, 2), (14, 2)]]
R_LONG = [[(0, 8), (8, 4), (12, 4)], [(0, 6), (6, 2), (8, 8)]]

SONGS = [
    dict(id="cold-boot", title="Cold Boot", genre="Arcade chiptune", moods=["title", "play"], seed=11,
         bpm=128, root=48, mode="major", prog_a=[0, 4, 5, 3], prog_b=[3, 4, 2, 5], rhythms=[R_ARCADE, R_SYNC],
         lead=("pulse", 0.25), arp=[0, 1, 2, 1, 2, 1, 0, 1], arp_rate=1, arp_vel=0.22, drums="rock", bass="drive", pad=0.12),
    dict(id="aisle-seven", title="Aisle Seven", genre="Lo-fi chill", moods=["play", "calm"], seed=22,
         bpm=76, root=45, mode="minor", prog_a=[0, 5, 2, 6], prog_b=[5, 3, 0, 4], rhythms=[R_SLOW, R_SYNC], sevenths=True, swing=0.5,
         lead=("pulse", 0.5), lead_vel=0.42, lead_env=(0.01, 0.4, 0.5, 0.15), vib=(0.2, 5.0), legato=True, arp=[0, 2, 1, 3], arp_rate=2, arp_vel=0.22,
         drums="chill", bass="walk", pad=0.2, delay=(0.75, 0.35), soften=4200, lofi=True, drum_gain=0.8),
    dict(id="rack-attack", title="Rack Attack", genre="Funk pop", moods=["play", "drive"], seed=33,
         bpm=110, root=52, mode="dorian", prog_a=[0, 3, 0, 3], prog_b=[0, 6, 3, 4], rhythms=[R_SYNC, R_EIGHTH], sevenths=True, swing=0.3,
         lead=("pulse", 0.5), lead_vel=0.5, arp=[0, 2, 1, 2], arp_rate=2, arp_vel=0.25, drums="funk", bass="funk", pad=0.12),
    dict(id="neon-overclock", title="Neon Overclock", genre="Synthwave", moods=["play", "drive"], seed=44,
         bpm=104, root=54, mode="minor", prog_a=[0, 5, 2, 6], prog_b=[5, 6, 0, 2], rhythms=[R_LONG, R_SYNC],
         lead=("pulse", 0.5), lead_vel=0.5, lead_env=(0.01, 0.4, 0.6, 0.2), legato=True, arp=[0, 1, 2, 3, 2, 1, 2, 1], arp_rate=1, arp_vel=0.2,
         drums="synth", bass="synth", bass_kind="saw", pad=0.2, delay=(0.75, 0.4), soften=6000),
    dict(id="fabric-four", title="Fabric Four", genre="Trance / techno", moods=["play", "drive"], seed=55,
         bpm=138, root=45, mode="minor", prog_a=[0, 5, 2, 6], prog_b=[0, 3, 5, 6], rhythms=[R_EIGHTH, R_LONG],
         lead=("pulse", 0.125), lead_vel=0.45, arp=[0, 2, 1, 2, 0, 2, 1, 2], arp_rate=1, arp_vel=0.24, arp_duty=0.25, drums="four", bass="offbeat",
         bass_kind="saw", pad=0.14, delay=(0.75, 0.35), drum_gain=1.0),
    dict(id="brownout", title="Brownout", genre="Dark tension", moods=["crisis"], seed=66,
         bpm=88, root=50, mode="phrygian", prog_a=[0, 1, 0, 6], prog_b=[0, 3, 1, 0], rhythms=[R_SLOW],
         lead=("pulse", 0.5), lead_vel=0.45, vib=(0.3, 5.5), lead_env=(0.02, 0.4, 0.6, 0.2), arp=[0, 1, 2, 1], arp_rate=2, arp_vel=0.2, arp_duty=0.25,
         drums="tense", bass="half", pad=0.22, fill=False, harmony=False),
    dict(id="gigawatt-anthem", title="Gigawatt Anthem", genre="Heroic march", moods=["play", "triumph"], seed=77,
         bpm=120, root=50, mode="major", prog_a=[0, 3, 4, 0], prog_b=[5, 1, 3, 4], rhythms=[R_ARCADE, R_LONG],
         lead=("pulse", 0.5), lead_vel=0.5, legato=True, arp=[0, 1, 2, 1], arp_rate=4, arp_vel=0.2, drums="march", bass="march", pad=0.22),
    dict(id="capacity-planning", title="Capacity Planning", genre="Bossa jazz", moods=["play", "calm"], seed=88,
         bpm=104, root=53, mode="major", prog_a=[1, 4, 0, 0], prog_b=[2, 5, 1, 4], rhythms=[R_SYNC, R_SLOW], sevenths=True, swing=0.25,
         lead=("pulse", 0.25), lead_vel=0.45, arp=[0, 1, 2, 3, 2, 1], arp_rate=2, arp_vel=0.2, drums="bossa", bass="bossa", pad=0.14, soften=5200),
]
