# Picture timeline mirrored (read-only) from src/videos/tipu/story.ts + cast.ts so every sound lands on
# the frame: shots, rocket waves, the tumbril hit, the explosion, the red glare. Tipu is 92.402 s / 2773 f,
# not the bridge's 67.5 s — this module replaces timeline.py for the Tipu build (dsp/sfx_gen/music building
# blocks are shared).
import json
import os

FPS = 30
TOTAL = 2773
DUR = 92.402            # voice.wav length, exactly (91.402 s voice + 1.0 s tail)
fr = lambda f: f / FPS

FLASH = fr(226)         # white flash after the hook (frame 226)
ROCKET_WAVES = [(17.0, 19.0), (19.4, 23.5), (28.6, 29.7), (66.4, 72.3), (49.6, 53.6), (63.0, 66.0)]  # barrage windows (s); waves 5-6 are single rockets (iron arc, miss)
TUMBRIL_HIT_T = 29.57   # the single rocket lands on the ammunition carts (word "giri." f889)
BLAST_T0, BLAST_DUR = 30.17, 1.4   # the big explosion (word "Dhamaaka" f907)
GLARE_TIMES = [81.5, 83.8, 86.2, 88.6, 90.4]  # red-glare bursts over Fort McHenry (night)
PAPER_BURST_T = 44.3    # the European paper rocket bursts on the bench (word "phat jaati thi" ~f1335)

# id: (first frame, end frame, light, crowd)
SHOTS = {
    1: (0, 243, "day", "hook"), 2: (244, 298, "day", "setting"), 3: (299, 507, "day", "advance"),
    4: (508, 582, "day", "skyfire"), 5: (583, 716, "day", "barrage"), 6: (717, 809, "day", "confused"),
    7: (810, 906, "day", "tumbril"), 8: (907, 1014, "day", "blast"), 9: (1015, 1128, "day", "defeat"),
    10: (1129, 1215, "golden", "tipu"), 11: (1216, 1389, "day", "pivot"), 12: (1390, 1619, "day", "iron"),
    13: (1620, 1870, "day", "cooker"), 14: (1871, 1990, "day", "miss"), 15: (1991, 2183, "day", "thousand"),
    16: (2184, 2344, "golden", "fall1799"), 17: (2345, 2510, "day", "congreve"), 18: (2511, 2773, "night", "anthem"),
}


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def shot_at(t):
    f = t * FPS
    for i, (a, b, *_r) in SHOTS.items():
        if a <= f < b:
            return i
    return 18


def words():
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "words.json")) as f:
        return json.load(f)
