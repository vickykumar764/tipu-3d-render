# Original march for the Tipu short, composed and synthesized here (Bb major, 120 bpm, same theme
# language as the bridge skill's score: one quarter note = 0.5 s). Sections follow the picture: hook tutti |
# setting march | battle drive with a stab ON the explosion | triumphant defeat | warm golden Tipu reveal |
# playful pivot | building iron march | light cooker | comic deadpan, then the thousand-rockets build |
# somber 1799 | quiet Congreve | grand anthem callback with a final Bb chord.
# Built with the bridge skill's Band helpers (music.py); rendered and trimmed to 92.402 s by mix_tipu.py.
# NOTE: music.py's Band buffers are sized by its own timeline (67.5 s) — patched to our length on import.
import os
import numpy as np
import music as _music
from dsp import SR, ns, rng, dbg, make_ir, convolve_st, integrated, lp, hp
import instruments as I
from music import Band, theme, chorus, melody, oompah, snare_bar, roll, CHB, CH, F, Q
import timeline_tipu as T

_music.N = ns(T.DUR)  # the Band buffers must cover the whole 92.402 s film, not the bridge's 67.5 s

# where each section of the music sits (used for the cue sheet and the level automation in mix_tipu.py)
SECTIONS = [
    ("hook", 0.0, 8.13), ("setting", 8.13, 16.94), ("battle", 16.94, 33.84), ("defeat", 33.84, 37.63),
    ("tipu", 37.63, 40.54), ("pivot", 40.54, 46.35), ("iron", 46.35, 54.02), ("cooker", 54.02, 62.38),
    ("deadpan", 62.38, 72.80), ("fall1799", 72.80, 78.19), ("congreve", 78.19, 83.73), ("anthem", 83.73, T.DUR),
]

R = rng(1780)


def _r():
    return rng(int(R.integers(1 << 30)))


def build():
    b = Band()
    for name, send in [("whistle", 0.0), ("fife", 0.16), ("glock", 0.22), ("tuba", 0.10), ("pah", 0.18), ("snare", 0.13),
                       ("cymbal", 0.16), ("stab", 0.16), ("timpani", 0.18), ("pad", 0.25), ("vibes", 0.26), ("musicbox", 0.26),
                       ("pluck", 0.18), ("brush", 0.12), ("triangle", 0.25)]:
        b.track(name, send)

    # ============ HOOK 0 - 8.13: tutti + whistlers, snare fill under the last hook words, dip at the white flash
    h = theme(0.0, bars=[1, 2])
    chorus(b, "whistle", h, 7, 11)
    melody(b, "glock", h, 0.5, 12, "glock", -0.35)
    for bar in (1, 2):
        tb = (bar - 1) * 2.0
        oompah(b, tb, CHB[bar], 0.68, True, 0.42)
        snare_bar(b, tb, "march", 0.62, steps=range(16) if bar == 1 else range(8))
    roll(b, 3.0, 3.6, 0.25, 0.62)
    b.add("cymbal", I.cymbal(0.45, _r()), 0.0, 0.0)
    b.cues.append((0.0, "hook: theme A1-A2 tutti, 7 whistlers, tuba/after-beats/snare; snare fill 3.0-3.6"))
    # a short dip at the flash (frame 226 = 7.53 s), then the band comes back for the battlefield
    dip = np.ones(ns(T.DUR))
    a, z = ns(T.FLASH - 0.02), ns(T.FLASH + 0.18)
    dip[a:z] = np.linspace(1, 0.25, z - a)
    dip[z:z + ns(0.3)] = np.linspace(0.25, 1, ns(0.3))
    for k in b.tr:
        b.tr[k] *= dip[None, :]
    b.cues.append((T.FLASH, "short dip on the white flash after the hook (frame 226)"))

    # ============ SETTING 8.0 - 16.9: theme A bars 3-6 light (glock + fife, tuba on 1/3, light snare)
    s0 = 8.0
    a36 = theme(s0, bars=range(3, 7))
    melody(b, "glock", a36, 0.36, 12, "glock", -0.35)
    melody(b, "fife", a36, 0.42, 0, "fife", 0.25)
    for bar in range(3, 7):
        tb = s0 + (bar - 3) * 2
        oompah(b, tb, CHB[bar], 0.5, False, 0.34)
        snare_bar(b, tb, "light", 0.36)
    b.cues.append((s0, "setting: theme A3-A6 light (glock + fife, tuba on 1/3, light snare)"))

    # ============ BATTLE 17.0 - 33.8: forte march, snare drive, roll into the blast, stab + clash ON it
    k0 = 17.0
    kb = theme(k0, bars=range(3, 9))
    melody(b, "glock", kb, 0.55, 12, "glock", -0.35)
    melody(b, "fife", kb, 0.6, 0, "fife", 0.25)
    for bar in range(3, 9):
        tb = k0 + (bar - 3) * 2
        oompah(b, tb, CHB[bar], 0.72, True, 0.5)
        snare_bar(b, tb, "drive", 0.66, steps=range(16), cres=0.3 if bar >= 7 else 0.0)
    roll(b, 29.0, 30.1, 0.45, 1.0)
    for m in [46, 53, 58, 62, 65]:
        b.add("stab", I.brass(F(m), 0.25, 0.9, _r(), "stab", scoop=-15), T.BLAST_T0, (m - 56) / 20)
    b.add("tuba", I.brass(F(34), 0.3, 0.9, _r(), "tuba"), T.BLAST_T0, -0.1)
    b.add("cymbal", I.cymbal(0.5, _r(), dur=1.2), T.BLAST_T0, 0.0)
    b.cues.append((k0, "battle: forte march A3-A8, snare drive, roll into 30.17, Bb stab + clash ON the explosion"))

    # ============ DEFEAT 34.0 - 37.6: triumphant, theme A1-A2, whistlers
    d0 = 34.0
    dh = theme(d0, bars=[1, 2])
    chorus(b, "whistle", dh, 5, 41)
    melody(b, "glock", dh, 0.5, 12, "glock", -0.35)
    melody(b, "fife", dh, 0.55, 0, "fife", 0.25)
    for bar in (1, 2):
        tb = d0 + (bar - 1) * 2
        oompah(b, tb, CHB[bar], 0.66, True, 0.44)
        snare_bar(b, tb, "march", 0.58)
    b.cues.append((d0, "defeat: triumphant theme A1-A2, 5 whistlers — Mysore wins"))

    # ============ TIPU REVEAL 37.7 - 40.5 (golden): warm and quiet — pad chords, solo fife, no drums
    c0 = 37.7
    chords = [(37.7, 39.2, [46, 58, 62, 65]), (39.2, 40.6, [41, 57, 60, 63])]
    trem = lambda t0: (lambda t: 1 + 0.08 * np.sin(2 * np.pi * 0.6 * (t + t0 - c0)))
    for (ta, tb_, ms) in chords:
        b.add("pad", I.pad([F(m) for m in ms], tb_ - ta, 0.5, _r(), att=0.5 if ta < 37.8 else 0.25, rel=0.6, trem=trem(ta)), ta, 0.0)
    cm = theme(c0, bars=[1, 2])
    melody(b, "fife", cm, 0.5, 0, "fife", 0.25)
    melody(b, "vibes", cm, 0.3, 12, "vibes", -0.25)
    b.cues.append((c0, "tipu reveal: warm pad Bb - F7, solo fife theme, vibes; no drums (the king steps out)"))

    # ============ PIVOT 40.6 - 46.3: playful swung theme (the paper rocket), soft band
    l0 = 40.6
    lw = theme(l0, bars=[1, 2], swing=True)
    chorus(b, "whistle", lw, 3, 21, spread=0.8)
    melody(b, "glock", lw, 0.3, 12, "glock", -0.35)
    for bar in (1, 2):
        tb = l0 + (bar - 1) * 2
        oompah(b, tb, CHB[bar], 0.4, True, 0.3)
        snare_bar(b, tb, "light", 0.3, steps=range(8))
    b.cues.append((l0, "pivot: swung theme A1-A2, 3 whistlers, soft band (Europe's paper rocket)"))

    # ============ IRON 46.4 - 54.0: building march, theme A3-A6, tuba bouncing octaves as the range grows
    y0 = 46.4
    y36 = theme(y0, bars=range(3, 7))
    melody(b, "glock", y36, 0.5, 12, "glock", -0.35)
    melody(b, "fife", y36, 0.58, 0, "fife", 0.25)
    for bar in range(3, 7):
        tb = y0 + (bar - 3) * 2
        oompah(b, tb, CHB[bar], 0.64, True, 0.44, bounce=tb >= 50.0)
        snare_bar(b, tb, "march", 0.58, steps=range(16) if bar < 6 else range(12))
    b.cues.append((y0, "iron: full band theme A3-A6, tuba bouncing octaves from 50.0 as the rocket flies 2 km"))

    # ============ COOKER 54.1 - 62.3: light and playful, swung theme, soft band
    p0 = 54.1
    pw = theme(p0, bars=[1, 2], swing=True)
    chorus(b, "whistle", pw, 3, 51, spread=0.8)
    melody(b, "glock", pw, 0.3, 12, "glock", -0.35)
    for bar in (1, 2):
        tb = p0 + (bar - 1) * 2
        oompah(b, tb, CHB[bar], 0.42, True, 0.3)
        snare_bar(b, tb, "light", 0.32, steps=range(8))
    b.cues.append((p0, "cooker: swung theme A1-A2, 3 whistlers, soft band (the pressure-cooker analogy)"))

    # ============ DEADPAN 62.4 - 72.8: one soft comic bar, then the band builds into the thousand rockets
    q0 = 62.4
    q1 = theme(q0, bars=[1])
    melody(b, "glock", q1, 0.3, 12, "glock", -0.35)
    oompah(b, q0, CHB[1], 0.4, True, 0.3)
    snare_bar(b, q0, "light", 0.3, steps=range(8))
    q2 = theme(66.4, bars=range(3, 7))
    melody(b, "glock", q2, 0.55, 12, "glock", -0.35)
    melody(b, "fife", q2, 0.6, 0, "fife", 0.25)
    for bar in range(3, 7):
        tb = 66.4 + (bar - 3) * 2
        oompah(b, tb, CHB[bar], 0.72, True, 0.5)
        snare_bar(b, tb, "drive", 0.66, steps=range(16), cres=0.3 if bar >= 5 else 0.0)
    roll(b, 71.5, 72.3, 0.4, 0.9)
    b.cues.append((q0, "deadpan: one soft comic bar (the rocket that never hits), then forte build into the thousand rockets"))

    # ============ FALL 1799 72.9 - 78.1 (golden): somber — soft pad, solo fife, no drums
    f0 = 72.9
    chords = [(72.9, 75.2, [46, 58, 62, 65]), (75.2, 78.2, [41, 57, 60, 63])]
    trem = lambda t0: (lambda t: 1 + 0.08 * np.sin(2 * np.pi * 0.6 * (t + t0 - f0)))
    for (ta, tb_, ms) in chords:
        b.add("pad", I.pad([F(m) for m in ms], tb_ - ta, 0.5, _r(), att=0.5 if ta < 73.0 else 0.25, rel=0.6, trem=trem(ta)), ta, 0.0)
    fm = theme(f0, bars=[1, 2])
    melody(b, "fife", fm, 0.45, 0, "fife", 0.25)
    melody(b, "vibes", fm, 0.28, 12, "vibes", -0.25)
    b.cues.append((f0, "fall 1799: somber pad Bb - F7, solo fife, vibes; no drums (Seringapatam falls)"))

    # ============ CONGREVE 78.2 - 83.7: sparse and curious — pad + glock only
    g0 = 78.2
    gm = theme(g0, bars=[1, 2])
    melody(b, "glock", gm, 0.32, 12, "glock", -0.35)
    b.add("pad", I.pad([F(m) for m in [46, 58, 62, 65]], 5.5, 0.5, _r(), att=0.5, rel=0.6), g0, 0.0)
    b.cues.append((g0, "congreve: sparse glock + pad (the captured rocket on the Woolwich bench)"))

    # ============ ANTHEM 83.8 - 92.4 (night): tutti + whistlers, theme A1-A2, final Bb chord at 91.0
    a0 = 83.8
    ah = theme(a0, bars=[1, 2])
    chorus(b, "whistle", ah, 7, 61)
    melody(b, "glock", ah, 0.55, 12, "glock", -0.35)
    melody(b, "fife", ah, 0.6, 0, "fife", 0.25)
    for bar in (1, 2):
        tb = a0 + (bar - 1) * 2
        oompah(b, tb, CHB[bar], 0.7, True, 0.45)
        snare_bar(b, tb, "march", 0.62)
    for m in [46, 58, 62, 65]:
        b.add("stab", I.brass(F(m), 1.2, 0.7, _r(), "stab", scoop=-15), 91.0, (m - 56) / 20)
    b.add("tuba", I.brass(F(34), 1.0, 0.7, _r(), "tuba"), 91.0, -0.1)
    b.cues.append((a0, "anthem: tutti + 7 whistlers, theme A1-A2, final Bb chord at 91.0 — the rockets' red glare is Mysore's"))
    return b


def render():
    """render the band (92.402 s buffers) and trim to the Tipu length"""
    from music import render as music_render
    b = build()
    out, levels = music_render(b, ref=-20.0)
    n = ns(T.DUR)
    assert out.shape[1] >= n, f"music render too short: {out.shape[1] / SR:.2f} s < {T.DUR} s"
    return out[:, :n], levels, b.cues


if __name__ == "__main__":
    from dsp import write_wav, integrated
    out, levels, cues = render()
    write_wav(os.path.join(os.path.dirname(os.path.abspath(__file__)), "music.wav"), out)
    print(f"music.wav: {out.shape[1] / SR:.3f} s, integrated {integrated(out):.1f} LUFS")
    print("levels:", levels)
    for (t, c) in cues:
        print(f"  {t:6.2f} s  {c}")
