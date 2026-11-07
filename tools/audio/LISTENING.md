# Soundtrack measurements

These are automated measurements (ffmpeg ebur128 and astats) of the encoded Ogg files in `godot/assets/audio/music`. They check level consistency, headroom and loop seams. They are **not** a substitute for a human listening pass; that is still open (see the checklist below).

| track | duration | bitrate | integrated loudness | loudness range | peak | first 3 s RMS | last 3 s RMS |
|---|---|---|---|---|---|---|---|
| blue-light | 87 s | 88 kbps | -19.0 LUFS | 8.1 LU | -8.5 dBFS | -29.3 dB | -23.6 dB |
| brownout | 165 s | 93 kbps | -19.4 LUFS | 4.5 LU | -7.3 dBFS | -24.2 dB | -24.0 dB |
| cold-aisle | 148 s | 89 kbps | -18.3 LUFS | 8.2 LU | -7.6 dBFS | -28.4 dB | -23.3 dB |
| heat-sink | 137 s | 88 kbps | -18.8 LUFS | 8.7 LU | -8.3 dBFS | -28.6 dB | -23.8 dB |
| night-shift | 175 s | 92 kbps | -18.8 LUFS | 4.9 LU | -7.1 dBFS | -25.1 dB | -24.5 dB |
| sub-zero | 103 s | 89 kbps | -18.8 LUFS | 7.3 LU | -8.1 dBFS | -28.9 dB | -23.1 dB |

Encoded with libvorbis at a nominal 112 kbps (quality-based, so sparse tracks land near 90 kbps). Tracks sit within about 1 LU of each other, leave 7 dB or more of headroom and end on a 3 second fade, so a track change never cuts.

## Human listening checklist (still open)

Play each track for its full length through headphones and speakers, then note pass or fail and fix what fails by editing `tools/audio/chill_songs.py` and re-rendering (`python3 tools/audio/generate.py music <id>`).

- [ ] Mix balance: sub bass audible but not boomy on laptop speakers; melody not buried
- [ ] No harsh or fatiguing frequencies in the pads and leads
- [ ] The first 10 seconds work as an entrance, and the last 10 as an exit
- [ ] The energy curve changes enough over the form that it does not feel like a loop
- [ ] The dark ambient track reads as tension without being unpleasant for minutes on end
- [ ] Crossfades between tracks (Settings, "Next") sound natural

## What is not done

Layered adaptive music (stems faded by power load, cash trend or crisis) is not implemented: the mood director switches whole tracks, and the ambience hum is the only layer that follows the state of the hall.
