# Every sound effect + ambience bed of the Tipu short as a cue list timed to the picture
# (timeline_tipu.py), rendered into one stereo SFX stem. Generators come from sfx_gen.py (shared with the
# bridge skill); rocket whistles and the explosion are synthesized here with the dsp primitives.
# Levels here are RELATIVE inside the stem — mix_tipu.py sets the stem to -10 dB vs the voice.
# Beds run under the whole film; events land on the rocket waves, the tumbril hit, the blast, the
# paper burst, the cooker, the marches and the night glare.
import os
import numpy as np
from dsp import SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, integrated, momentary_max, write_wav, phase, modal, colored, curve
import sfx_gen as G
import timeline_tipu as T

HERE = os.path.dirname(os.path.abspath(__file__))
N = ns(T.DUR)

# (t, name, desc, audio, gain_db, kind) — audio is a mono/stereo array, gain is relative inside the stem
CUES = []


def _add(t, name, desc, audio, gain_db, kind="event"):
    CUES.append((t, name, desc, audio, gain_db, kind))


def _norm(x, peak=0.5):
    m = np.max(np.abs(x)) if x.size else 0.0
    return x * (peak / m) if m > 0 else x


def rocket_whistle(dur, r, f0=750.0, f1=2600.0, f2=1400.0):
    """a firework rocket: a breathy whistle that rises, then falls as the rocket burns out.
    Sine whistle with vibrato + band-passed air noise, both following the same pitch track."""
    n = ns(dur)
    t = tt(dur)
    # pitch track: rise to f1 at 55 % of the flight, then fall to f2
    fr = np.where(t < 0.55 * dur,
                  f0 + (f1 - f0) * (t / (0.55 * dur)),
                  f1 + (f2 - f1) * ((t - 0.55 * dur) / (0.45 * dur)))
    vib = 1 + 0.03 * np.sin(2 * np.pi * 11 * t)
    tone = np.sin(phase(fr * vib)) * np.exp(-t / (dur * 0.8))
    # air noise, band-passed around the whistle, louder at the start
    nz = colored(n, r, slope=-0.5)
    nz = bp(nz, 1200, 3200, order=2) * 0.6
    env = np.exp(-t / (dur * 0.5)) * (0.4 + 0.6 * np.sin(np.pi * np.clip(t / dur, 0, 1)))
    x = tone * 0.7 + nz * env * 0.5
    return fades(x, 0.01, 0.08)


def explosion(dur, r, big=1.0):
    """a big powder blast: sub-bass thump + noise burst low-passed + crackle tail."""
    n = ns(dur)
    t = tt(dur)
    # sub thump: 55 Hz sine, fast decay
    thump = np.sin(2 * np.pi * 55 * t) * np.exp(-t / 0.28) * 1.2
    thump += np.sin(2 * np.pi * 38 * t) * np.exp(-t / 0.5) * 0.8
    # noise burst: brown noise, low-passed, decaying over ~0.9 s
    nz = colored(n, r, slope=-1.5)
    nz = lp(nz, 900, order=2) * np.exp(-t / 0.45)
    # crackle: sparse high pops in the tail
    pops = np.zeros(n)
    for k in range(int(dur * 22)):
        at = int(r.uniform(0.08, dur) * SR)
        if at < n:
            pops[at:at + int(0.004 * SR)] += r.uniform(0.3, 1.0)
    pops = hp(pops, 2500, order=2) * np.exp(-t / 0.8) * 0.5
    x = (thump + nz * 1.4 + pops) * big
    return fades(x, 0.002, 0.15)


def cooker_whistle(dur, r):
    """a pressure-cooker whistle: steady ~1900 Hz with a slow wobble, breathy."""
    n = ns(dur)
    t = tt(dur)
    fr = 1900 + 120 * np.sin(2 * np.pi * 6 * t) + 60 * np.sin(2 * np.pi * 13 * t)
    tone = np.sin(phase(fr)) * 0.55
    nz = bp(colored(n, r, slope=-0.5), 1600, 2600, order=2) * 0.25
    x = tone + nz
    return fades(x, 0.05, 0.1)


def build_cues():
    CUES.clear()
    R = rng(1780)
    rr = lambda: rng(int(R.integers(1 << 30)))

    # ---- ambience beds (whole film, crossfaded by section) ----
    def amb_day(dur, seed):
        r = rng(seed)
        x = G.breeze(dur, r, 1.0, 0.15, 850)
        x = x + pan(G.bird_chirps(dur, r, 0.45, "sparrow") * 0.10, 0.5)
        x = x + pan(G.bird_chirps(dur, r, 0.30, "sparrow") * 0.07, -0.6)
        return fades(x, 0.4, 0.6)

    def amb_golden(dur, seed):
        r = rng(seed)
        x = G.breeze(dur, r, 0.7, 0.12, 700)
        x = x + st(G.crickets(dur, r, 3) * 0.25)
        x = x + pan(G.bird_chirps(dur, r, 0.25, "sparrow") * 0.06, -0.4)
        return fades(x, 0.5, 0.5)

    def amb_night(dur, seed):
        r = rng(seed)
        x = G.breeze(dur, r, 0.5, 0.1, 500)
        x = x + st(G.crickets(dur, r, 4) * 0.3)
        return fades(x, 0.5, 0.8)

    _add(0.0, "amb_day", "daytime Mysore air: breeze + sparrows (shots 1-9)", amb_day(37.7, 21), -14, "bed")
    _add(37.6, "amb_golden", "golden-hour calm: breeze, crickets (shot 10, Tipu reveal)", amb_golden(3.0, 22), -16, "bed")
    _add(40.5, "amb_day2", "daytime air returns: breeze + sparrows (shots 11-15)", amb_day(32.3, 23), -14, "bed")
    _add(72.8, "amb_golden2", "golden-hour calm again (shot 16, 1799)", amb_golden(5.4, 24), -16, "bed")
    _add(78.2, "amb_night", "night air over the harbour: soft breeze, crickets (shots 17-18)", amb_night(14.2, 25), -17, "bed")

    # ---- flags: the tiger flag on the fort, then the US flag at McHenry ----
    _add(0.0, "flag_fort", "tiger flag fluttering on the rampart (shot 1)", st(G.flag_flutter(7.5, rr())) * 0.5, -12, "bed")
    _add(83.7, "flag_mchenry", "stars and stripes fluttering at night (shot 18)", st(G.flag_flutter(8.7, rr())) * 0.4, -13, "bed")

    # ---- rocket whistles: one per launch, staggered inside each wave ----
    for wi, (a, b) in enumerate(T.ROCKET_WAVES):
        if wi == 2:  # wave 3: the single rocket onto the tumbril
            _add(a, "rocket_single", "one rocket whistles down onto the tumbrils",
                 _norm(rocket_whistle(1.0, rr()), 0.7), -1.0)
            continue
        if wi == 4:  # wave 5: ONE rocket arcs high to show the 2 km range (shot 12) — a long rising whistle
            _add(a, "rocket_arc", "one rocket whistles up in a high arc (the 2 km range demo)",
                 _norm(rocket_whistle(4.0, rr(), f0=650.0, f1=2600.0, f2=1800.0), 0.6), -2.0)
            continue
        if wi == 5:  # wave 6: ONE rocket sails past the column, never hitting its mark (shot 14) — whistle dopplers away
            _add(a, "rocket_miss", "one rocket whistles past the column, harmlessly",
                 _norm(rocket_whistle(3.0, rr(), f0=800.0, f1=2400.0, f2=1200.0), 0.6), -2.0)
            continue
        nrock = 6 if wi == 0 else (12 if wi == 1 else 17)
        step = (b - a) / nrock
        for k in range(nrock):
            lt = a + k * step
            _add(lt, "rocket", f"rocket {k + 1}/{nrock} of wave {wi + 1} whistles up",
                 _norm(rocket_whistle(1.2 + rr().uniform(0, 0.4), rr(), f0=rr().uniform(650, 900)), 0.55), -3.0)

    # ---- the crowd gasps as the first rockets rain down (shot 4, word "aag" 17.91 s) ----
    _add(17.9, "gasp", "British soldiers gasp as the sky lights up", _norm(G.whoa(rr(), dur=0.7), 0.6), -4.0)
    _add(18.1, "babble_shock", "shocked babble in the column", _norm(st(G.babble(2.2, rr(), 120, 1.0, rate=5.0)), 0.4), -6.0)

    # ---- the tumbril hit (29.57 s) + the big explosion (30.17 s) ----
    _add(T.TUMBRIL_HIT_T, "tumbril_hit", "the rocket lands on the ammunition carts: wood crack + thud",
         _norm(G.wood_crack(rr()), 0.8), -2.0)
    _add(T.TUMBRIL_HIT_T, "tumbril_thud", "the cart shudders", _norm(G.boot(rr(), 1.2), 0.8), -5.0)
    _add(T.BLAST_T0, "explosion", "the ammunition explodes: the biggest sound of the film",
         _norm(explosion(1.6, rr(), big=1.0), 1.0), 0.0)
    _add(T.BLAST_T0 + 0.35, "explosion2", "secondary blast as the second cart goes up",
         _norm(explosion(1.1, rr(), big=0.7), 0.85), -3.0)
    _add(T.BLAST_T0, "debris", "debris and splinters rain down", _norm(G.rattle(1.2, rr(), density=40.0), 0.5), -6.0)

    # ---- the defeat (shot 9, word "haar" 34.85 s): Mysore cheers ----
    _add(34.9, "cheer", "Mysore soldiers cheer the victory", _norm(G.applause(3.0, rr(), people=20), 0.6), -3.0)
    for ct in (35.0, 35.9, 36.8):
        _add(ct, "hurrah", "a 'hurrah!' from the Mysore line", _norm(G.hurrah(rr(), 140, 0.8), 0.5), -6.0)

    # ---- the paper rocket bursts (44.3 s) ----
    _add(T.PAPER_BURST_T, "paper_burst", "the European paper rocket bursts under pressure: small pop + tear",
         _norm(G.wood_crack(rr()), 0.6), -4.0)
    _add(T.PAPER_BURST_T, "paper_tear", "paper tearing", _norm(G.timber_tear(rr(), 0.4), 0.5), -6.0)

    # ---- the pressure cooker whistles (shot 13, word "pressure" 54.4 s) ----
    _add(55.2, "cooker1", "the cooker whistles", _norm(cooker_whistle(1.4, rr()), 0.5), -5.0)
    _add(58.6, "cooker2", "the cooker whistles again", _norm(cooker_whistle(1.2, rr()), 0.45), -6.0)

    # ---- marches: the British column (shots 2-3), the retreat (shot 9), the crate carry (shot 16) ----
    for i, ft in enumerate(np.arange(8.2, 16.9, 0.5)):
        _add(float(ft), "step_column", f"redcoat boots marching ({ft:.1f} s)",
             _norm(G.boot(rr(), 0.9), 0.35), -8.0)
    for i, ft in enumerate(np.arange(34.0, 37.5, 0.55)):
        _add(float(ft), "step_retreat", f"retreating boots, faster ({ft:.1f} s)",
             _norm(G.boot(rr(), 1.0), 0.35), -8.0)
    for i, ft in enumerate(np.arange(73.0, 77.8, 0.55)):
        _add(float(ft), "step_carry", f"crates carried to the ship ({ft:.1f} s)",
             _norm(G.stroll_step(rr(), 0.5), 0.3), -9.0)

    # ---- night glare: distant booms under each red burst (shots 17-18) ----
    for gt in T.GLARE_TIMES:
        _add(gt, "glare_boom", f"distant boom under the red glare ({gt:.1f} s)",
             _norm(explosion(1.0, rr(), big=0.35), 0.5), -8.0)
    return CUES


def render():
    build_cues()
    stem = np.zeros((2, N))
    for (t, name, desc, audio, gain_db, kind) in CUES:
        x = audio if np.ndim(audio) == 2 else st(audio)
        place(stem, x, t, dbg(gain_db))
    return stem


if __name__ == "__main__":
    stem = render()
    write_wav(os.path.join(HERE, "sfx.wav"), stem)
    print(f"sfx.wav: {stem.shape[1] / SR:.3f} s, integrated {integrated(stem):.1f} LUFS, peak {np.max(np.abs(stem)):.3f}")
    with open(os.path.join(HERE, "cues.md"), "w") as f:
        f.write("# Tipu SFX cues\n\n")
        for (t, name, desc, _a, gain_db, kind) in CUES:
            f.write(f"- {t:6.2f} s [{kind}] {name} ({gain_db:+.0f} dB): {desc}\n")
    print(f"{len(CUES)} cues written to cues.md")
