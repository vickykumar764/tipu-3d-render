// Timeline of the Tipu Sultan rocket short: 18 shots timed to the ElevenLabs voice
// (remotion/voice/words.json, 238 words), 92.40 s = 2773 frames at 30 fps.
// Story: Tipu Sultan's iron-cased Mysorean rockets — Pollilur 1780, the iron tube,
// the pressure-cooker analogy, Congreve, and the "rockets' red glare" of the US anthem.
// Camera grammar (from the bridge skill): continuous slow push-ins; symmetric smootherstep
// glides 18-40 f; big reframes are cuts; explosion impacts are 7-frame kicks that flip sign
// every frame; no hand-held float. Every visual reaction lands 0-3 frames before its word.
export const FPS = 30;
export const TOTAL = 2773;
export const D0 = 6.0; // ground height (m) — characters stand at y = D0
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- story physics ----------------
// Rocket barrage windows [start, end] in seconds (film time). Rockets fly during these.
export const ROCKET_WAVES: [number, number][] = [
  [17.0, 19.0],   // shot 4: the first rockets whistle in before "aag" (f537)
  [19.4, 23.5],   // shot 5: the barrage ("Hazaaron rocket")
  [28.6, 29.7],   // shot 7: the single rocket onto the tumbril
  [66.4, 72.3],   // shot 15: a thousand rockets at once
  [49.6, 53.6],   // shot 12: ONE rocket arcs high to show the 2 km range (no wave here before: S12b showed an empty sky)
  [63.0, 66.0],   // shot 14: ONE rocket sails past the column, never hitting its mark (the deadpan; no wave here before either)
];
// The tumbril hit: the rocket impacts 0-3 frames before the word "giri." (f889 = 29.63 s).
export const TUMBRIL_HIT_T = 29.57;
// The big explosion: lands 2 frames before the word "Dhamaaka" (f907 = 30.23 s).
export const BLAST_T0 = 30.17;
export const BLAST_DUR = 1.4;
// Red-glare bursts over Fort McHenry (night shots 17-18), seconds.
export const GLARE_TIMES = [81.5, 83.8, 86.2, 88.6, 90.4];
// Barrage intensity 0..1 (how many rockets are in the air), for world/cast FX.
export const barrageU = (t: number) => {
  let u = 0;
  for (const [a, b] of ROCKET_WAVES) {
    if (t >= a && t <= b) u = Math.max(u, Math.min(1, Math.min((t - a) / 0.6, (b - t) / 0.6 + 0.4)));
  }
  return clamp01(u);
};
// Explosion progress 0..1 (0 = before, 1 = fully blown).
export const blastU = (t: number) => clamp01((t - BLAST_T0) / BLAST_DUR);
// Tumbril fire: starts at the hit, burns through shot 8.
export const tumbrilU = (t: number) => clamp01((t - TUMBRIL_HIT_T) / 0.5);

export type TipuState = { barrage: number; blast: number; tumbril: number };
export const tipuState = (id: number, t: number): TipuState => ({
  barrage: barrageU(t), blast: blastU(t), tumbril: tumbrilU(t),
});

// ---------------- world anchors (metres; the lot layout) ----------------
export const FORT_AT: V3 = [0, D0, -55];       // Seringapatam fort centre
export const RAMPART_AT: V3 = [0, D0 + 8, -42]; // front rampart top (Tipu stands here, shot 1/10)
export const PALACE_AT: V3 = [0, D0, -62];     // palace inside the fort
export const BATTLE_AT: V3 = [0, D0, 10];      // Pollilur battlefield centre
export const TUMBRIL_AT: V3 = [8, D0, 5];      // British ammunition carts
export const ROCKETMEN_AT: V3 = [-25, D0, -5]; // Mysore rocket corps firing line
export const COLUMN_AT: V3 = [2, D0, 18];      // British column (Baillie) position
export const WORKSHOP_AT: V3 = [58, D0, -10];  // rocket workshop centre
export const BENCH_AT: V3 = [58, D0, -10];     // workbench with the two rockets
export const WOOLWICH_AT: V3 = [-58, D0, -10]; // Woolwich Arsenal bench
export const MCHENRY_AT: V3 = [0, D0, 58];     // Fort McHenry silhouette (night)

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type Crowd = "hook" | "setting" | "advance" | "skyfire" | "barrage" | "confused" | "tumbril" | "blast" | "defeat" | "tipu" | "pivot" | "iron" | "cooker" | "miss" | "thousand" | "fall1799" | "congreve" | "anthem" | "none";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 243, light: "day", crowd: "hook", tau: (t) => t },       // hook: an Indian king's rocket beat the British — and reached the US anthem
  { id: 2, a: 244, b: 298, light: "day", crowd: "setting", tau: (t) => t },  // 1780, Pollilur, Tamil Nadu
  { id: 3, a: 299, b: 507, light: "day", crowd: "advance", tau: (t) => t },  // Baillie's column advances, sure of victory
  { id: 4, a: 508, b: 582, light: "day", crowd: "skyfire", tau: (t) => t },  // fire rained from the sky
  { id: 5, a: 583, b: 716, light: "day", crowd: "barrage", tau: (t) => t },  // thousands of whistling rockets
  { id: 6, a: 717, b: 809, light: "day", crowd: "confused", tau: (t) => t }, // the British cannot tell what this weapon is
  { id: 7, a: 810, b: 906, light: "day", crowd: "tumbril", tau: (t) => t },  // one rocket falls on the ammunition carts
  { id: 8, a: 907, b: 1014, light: "day", crowd: "blast", tau: (t) => t },   // the blast shakes the whole army
  { id: 9, a: 1015, b: 1128, light: "day", crowd: "defeat", tau: (t) => t }, // Baillie loses, Mysore wins
  { id: 10, a: 1129, b: 1215, light: "golden", crowd: "tipu", tau: (t) => t }, // reveal: Tipu Sultan made this rocket
  { id: 11, a: 1216, b: 1389, light: "day", crowd: "pivot", tau: (t) => t }, // pivot: Europe's paper rockets burst under pressure
  { id: 12, a: 1390, b: 1619, light: "day", crowd: "iron", tau: (t) => t },  // the iron tube takes the pressure — 2 km range
  { id: 13, a: 1620, b: 1870, light: "day", crowd: "cooker", tau: (t) => t }, // analogy: pressure cooker vs paper box
  { id: 14, a: 1871, b: 1990, light: "day", crowd: "miss", tau: (t) => t },  // deadpan 1: one rocket never hits its mark
  { id: 15, a: 1991, b: 2183, light: "day", crowd: "thousand", tau: (t) => t }, // deadpan 2: a thousand at once need no aim
  { id: 16, a: 2184, b: 2344, light: "golden", crowd: "fall1799", tau: (t) => t }, // 1799: Seringapatam falls, rockets sail to England
  { id: 17, a: 2345, b: 2510, light: "day", crowd: "congreve", tau: (t) => t }, // Congreve at Woolwich, then Fort McHenry 1814 (night key)
  { id: 18, a: 2511, b: TOTAL, light: "night", crowd: "anthem", tau: (t) => t }, // callback: the anthem's rockets are Mysore's
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 2: 8, 10: 8, 11: 8, 16: 8, 17: 8, 18: 8 };
export const FLASH_AT = 226;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
/** layers to draw at frame f: base shot, plus the next shot fading in during a crossfade */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
/** symmetric smootherstep (attack = release, ~10 f each on a 23 f move) */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** push-in factor since f0: the subject grows ~rate per frame; `punch` raises it (with 8 f soft edges) for the first n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
/** dolly push: camera slides toward the look point by factor k */
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** zoom push (camera stays put): tan(fov/2) shrinks by k */
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });

// ---- framings (f -> camera); each pushes in from the frame its key starts ----
// shot 1 (hook): fort wide -> Tipu on the rampart -> rocket streaking up
const S1a = (f: number) => dolly([28, D0 + 14, -8], [0, D0 + 10, -55], pushK(f, 0, 0.0025), { fov: 50 });
const S1b = (f: number) => dolly([6, D0 + 9, -30], [0, D0 + 9.5, -42], pushK(f, 40, 0.002), { fov: 40 });
const S1c = (f: number) => dolly([10, D0 + 12, -25], [0, D0 + 24, -45], pushK(f, 150, 0.003), { fov: 36 });
// shot 2 (setting): battlefield wide — camera SE of the column, looking AT the column with the fort behind
const S2a = (f: number) => zoom([14, D0 + 8, 42], [3, D0 + 1.5, 29], 44, pushK(f, 244, 0.002));
// shot 3 (advance): column marching -> Baillie CU (camera ahead-right of Baillie's path, looking back at him)
const S3a = (f: number) => dolly([10, D0 + 4, 32], [2, D0 + 1.5, 18], pushK(f, 299, 0.002), { fov: 42 });
const S3b = (f: number) => dolly([8, D0 + 2, 26], [2.5, D0 + 1.6, 19.5], pushK(f, 380, 0.002), { fov: 34 });
// shot 4 (skyfire): redcoats in the lower frame looking up, sky + incoming rockets above (camera pulled back: the portrait frame is only ~2.4 m wide at 7 m)
const S4a = (f: number) => dolly([2, D0 + 2, 30], [2, D0 + 4, 12], pushK(f, 508, 0.002), { fov: 44 });
// shot 5 (barrage): rocketmen line from the start -> closer on the firing line
const S5a = (f: number) => dolly([0, D0 + 6, 22], [-24, D0 + 2, -5], pushK(f, 583, 0.002), { fov: 46 });
const S5b = (f: number) => dolly([-12, D0 + 3, 8], [-25, D0 + 2, -5], pushK(f, 650, 0.002), { fov: 40 });
// shot 6 (confused): British faces MS -> closer (camera pulled back: the group is ~5 m wide, the portrait frame is only ~2.2 m wide at 6 m; look at the group's centre x=1.4 so all four fit)
const S6a = (f: number) => dolly([1, D0 + 3, 32], [1.4, D0 + 1.6, 18.5], pushK(f, 717, 0.002), { fov: 46 });
const S6b = (f: number) => dolly([1, D0 + 2.5, 29], [1.4, D0 + 1.6, 18.5], pushK(f, 760, 0.002), { fov: 42 });
// shot 7 (tumbril): driver + carts together in frame (camera swung frontal: the driver was 3.4 m left of the old axis)
const S7a = (f: number) => dolly([12, D0 + 4, 18], [7, D0 + 1, 6], pushK(f, 810, 0.002), { fov: 40 });
// shot 8 (blast): explosion wide — high + far back (26 m) with a wide FOV so the whole tableau fits the portrait frame: the fallers, the runners, the tumbril AND the fireball
const S8a = (f: number) => dolly([4, D0 + 10, 42], [3, D0 + 1, 15], pushK(f, 907, 0.0025), { fov: 52 });
// shot 9 (defeat): the retreat -> CUT to the cheering rocketmen (the two groups are 30 m apart; one portrait frame cannot hold both)
const S9a = (f: number) => dolly([2, D0 + 3, 32], [3, D0 + 1.5, 25], pushK(f, 1015, 0.002), { fov: 42 });
const S9b = (f: number) => dolly([-12, D0 + 4, 12], [-25, D0 + 2, -3], pushK(f, 1070, 0.002), { fov: 42 });
// shot 10 (Tipu reveal, golden): Tipu on the rampart -> closer
const S10a = (f: number) => dolly([5, D0 + 9, -32], [0, D0 + 9.5, -42], pushK(f, 1129, 0.002), { fov: 38 });
const S10b = (f: number) => dolly([3, D0 + 9.5, -36], [0, D0 + 9.8, -42], pushK(f, 1170, 0.0018, 0.006, 35), { fov: 34 });
// shot 11 (pivot, workshop): bench with two rockets -> paper rocket bursting (both men in frame, gentle push; look shifted left a touch so Tipu's turban is not cut at f1350)
const S11a = (f: number) => dolly([48, D0 + 3, 2], [58, D0 + 1.5, -10], pushK(f, 1216, 0.002), { fov: 40 });
const S11b = (f: number) => dolly([51.5, D0 + 2, -4], [57.5, D0 + 1.5, -9], pushK(f, 1300, 0.002), { fov: 36 });
// shot 12 (iron): iron tube CU -> rocket flying the 2 km arc
const S12a = (f: number) => dolly([51, D0 + 2.2, -3], [58.5, D0 + 1.3, -10], pushK(f, 1390, 0.0025), { fov: 36 });
const S12b = (f: number) => dolly([30, D0 + 8, 10], [-10, D0 + 15, -20], pushK(f, 1480, 0.002), { fov: 44 });
// shot 13 (cooker): pressure cooker + paper box -> cooker whistle CU (both men in frame, gentle push)
const S13a = (f: number) => dolly([50, D0 + 2.5, -2], [58, D0 + 1.2, -10], pushK(f, 1620, 0.002), { fov: 38 });
const S13b = (f: number) => dolly([53, D0 + 2, -4], [58, D0 + 1.3, -10], pushK(f, 1720, 0.002), { fov: 34 });
// shot 14 (miss): single rocket flies across the sky past the column — WIDE and high: the rocket's path
// (rocketmen -> past the column) is 25 m west of the redcoat, so a close camera cannot hold both; from 24 m back both fit
const S14a = (f: number) => dolly([14, D0 + 10, 40], [-6, D0 + 6, 8], pushK(f, 1871, 0.002), { fov: 48 });
// shot 15 (thousand): sky full of trails -> rocketmen line firing
const S15a = (f: number) => dolly([22, D0 + 12, 38], [-5, D0 + 14, -10], pushK(f, 1991, 0.002), { fov: 48 });
const S15b = (f: number) => dolly([-10, D0 + 3, 10], [-25, D0 + 3, -5], pushK(f, 2080, 0.002), { fov: 40 });
// shot 16 (fall 1799, golden): fort wide with smoke -> crates being carried out (camera looks AT the carriers, not past them at the fort; the group marches -x, so the look tracks it)
const S16a = (f: number) => dolly([10, D0 + 6, -8], [-5, D0 + 2, -28], pushK(f, 2184, 0.002), { fov: 46 });
const S16b = (f: number) => dolly([2, D0 + 3, -10], [-8, D0 + 1.5, -24], pushK(f, 2260, 0.002), { fov: 44 });
// shot 17 (congreve): Woolwich bench -> CUT to Fort McHenry night sky
const S17a = (f: number) => dolly([-48, D0 + 2.5, -2], [-59, D0 + 1.5, -10], pushK(f, 2345, 0.002), { fov: 42 });
const S17b = (f: number) => dolly([10, D0 + 4, 45], [0, D0 + 12, 60], pushK(f, 2420, 0.002), { fov: 44 });
// shot 18 (anthem, night): night sky, red glare -> slow crane out
const S18a = (f: number) => dolly([12, D0 + 6, 42], [0, D0 + 16, 58], pushK(f, 2511, 0.0016), { fov: 46 });
const S18b = (f: number) => dolly([16, D0 + 10, 48], [0, D0 + 14, 58], pushK(f, 2650, 0.0016), { fov: 48 });

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: S1a },
    { f: 40, dur: 37, cut: true, s: S1b },
    { f: 150, dur: 32, s: S1c },
  ],
  2: [{ f: 244, s: S2a }],
  3: [
    { f: 299, s: S3a },
    { f: 380, dur: 18, cut: true, s: S3b },
  ],
  4: [{ f: 508, s: S4a }],
  5: [
    { f: 583, s: S5a },
    { f: 650, dur: 24, s: S5b },
  ],
  6: [
    { f: 717, s: S6a },
    { f: 760, dur: 18, s: S6b },
  ],
  7: [{ f: 810, s: S7a }],
  8: [{ f: 907, s: S8a }],
  9: [
    { f: 1015, s: S9a },
    { f: 1070, dur: 20, cut: true, s: S9b }, // cut to the cheering rocketmen
  ],
  10: [
    { f: 1129, s: S10a },
    { f: 1170, dur: 20, s: S10b },
  ],
  11: [
    { f: 1216, s: S11a },
    { f: 1300, dur: 20, s: S11b },
  ],
  12: [
    { f: 1390, s: S12a },
    { f: 1480, dur: 24, cut: true, s: S12b },
  ],
  13: [
    { f: 1620, s: S13a },
    { f: 1720, dur: 20, s: S13b },
  ],
  14: [{ f: 1871, s: S14a }],
  15: [
    { f: 1991, s: S15a },
    { f: 2080, dur: 24, s: S15b },
  ],
  16: [
    { f: 2184, s: S16a },
    { f: 2260, dur: 20, s: S16b },
  ],
  17: [
    { f: 2345, s: S17a },
    { f: 2420, dur: 24, cut: true, s: S17b },
  ],
  18: [
    { f: 2511, s: S18a },
    { f: 2650, dur: 40, s: S18b },
  ],
};

// impact kicks: the image offset flips sign every frame (~3 px at 720p per unit), decays to 0 in
// 7 f, roll +-0.23 deg per unit; they start on the first frame at/after the event.
const KICKS: [number, number][] = [
  [TUMBRIL_HIT_T, 0.8], // the rocket lands on the tumbrils
  [BLAST_T0, 1.6],       // the big explosion
  [BLAST_T0 + 0.35, 1.0], // secondary blast
  [66.5, 0.5],           // the thousand-rocket launch rumble
];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** frame at which the current key's move has finished (for picking billboard views per key, not per frame) */
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field + foreground framing ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const tipuRampart = (f: number): V3 => [0, D0 + 9.5, -42];
const bailliePt = (f: number): V3 => [2, D0 + 1.8, 15];
const britishPt = (f: number): V3 => [0, D0 + 1.8, 13];
const tumbrilPt = (f: number): V3 => [8, D0 + 1.5, 5];
const benchPt = (f: number): V3 => [58, D0 + 1.5, -10];
const congrevePt = (f: number): V3 => [-58, D0 + 1.5, -10];
const rocketmenPt = (f: number): V3 => [-25, D0 + 2, -5];
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },   // hook wide: fort sharp
  { f: 40, dur: 37, cInf: 10, focus: tipuRampart }, // Tipu on the rampart
  { f: 150, dur: 32, cInf: 5 },  // rocket streaking up
  { f: 244, cInf: 0 }, // battlefield wide
  { f: 299, cInf: 0 }, // column wide
  { f: 380, dur: 18, cInf: 12, focus: bailliePt }, // Baillie CU
  { f: 508, cInf: 5 }, // sky, first rockets
  { f: 583, cInf: 0 }, // barrage wide
  { f: 650, dur: 24, cInf: 10, focus: rocketmenPt }, // rocketmen firing
  { f: 717, cInf: 12, focus: britishPt }, // confused faces
  { f: 760, dur: 18, cInf: 12, focus: britishPt }, // closer
  { f: 810, cInf: 10, focus: tumbrilPt }, // tumbrils
  { f: 907, cInf: 0 },  // explosion wide
  { f: 1015, cInf: 0 }, // defeat wide
  { f: 1129, cInf: 10, focus: tipuRampart }, // Tipu reveal
  { f: 1170, dur: 20, cInf: 12, focus: tipuRampart }, // closer on Tipu
  { f: 1216, cInf: 10, focus: benchPt }, // workshop bench
  { f: 1300, dur: 20, cInf: 12, focus: benchPt }, // paper rocket bursting
  { f: 1390, cInf: 12, focus: benchPt }, // iron tube CU
  { f: 1480, cInf: 0 },  // the 2 km arc wide
  { f: 1620, cInf: 10, focus: benchPt }, // cooker + paper box
  { f: 1720, dur: 20, cInf: 12, focus: benchPt }, // cooker whistle CU
  { f: 1871, cInf: 5 },  // the single rocket crossing the sky
  { f: 1991, cInf: 0 },  // sky full of trails
  { f: 2080, dur: 24, cInf: 10, focus: rocketmenPt }, // rocketmen line
  { f: 2184, cInf: 0 },  // Seringapatam falls, wide
  { f: 2260, dur: 20, cInf: 10, focus: () => [0, D0 + 1.5, -35] }, // crates
  { f: 2345, cInf: 10, focus: congrevePt }, // Congreve at the bench
  { f: 2420, cInf: 0 },  // Fort McHenry night sky
  { f: 2511, cInf: 0 },  // anthem night sky
  { f: 2650, cInf: 0 },  // crane out
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
/** what the lens focuses on (DOF): the DOF table's focus point, else the camera look point */
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

/** near framing objects: visible while a <= f < b; kit = a GLB name accepted by build.ts prop() */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = []; // Kenney kit is absent from the skill zip; no foreground props
