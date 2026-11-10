// "Tipu Sultan — The Rocket King": our Hindi short in the flat-characters-in-a-3D-toon-world style.
// One three.js scene (a film lot): Seringapatam fort (north), Pollilur battlefield (centre),
// rocket workshop (east), Woolwich Arsenal (west), Fort McHenry silhouette (south, night).
// update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, boxGeo, V, quad, lam, Kit, kitClone } from "./build";
import { ctex, stoneHD, rockHD, cobbleHD, grassHD, cloudHD, brick } from "./paint";
import { Pen } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, D0, SHOTS, camAt, tipuState, ROCKET_WAVES, BLAST_T0, BLAST_DUR, TUMBRIL_HIT_T, GLARE_TIMES,
  FORT_AT, RAMPART_AT, PALACE_AT, BATTLE_AT, TUMBRIL_AT, ROCKETMEN_AT, COLUMN_AT, WORKSHOP_AT, BENCH_AT,
  WOOLWICH_AT, MCHENRY_AT, V3, FOREGROUND, ShotDef } from "./story";

// ---------------- assets ----------------
const KENNEY = ["tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree_cone", "tree-high-round", "tree", "plant_bushLarge", "plant_bushDetailed",
  "plant_bush", "hedge", "flower_redA", "flower_yellowA", "flower_purpleA", "grass_large", "grass", "lily_large", "lantern", "cart", "stall-red",
  "stall-green", "stall-bench", "banner-red", "banner-green", "windmill", "canoe"];
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KENNEY.map((n) => loader.loadAsync(staticFile(`bridge/kenney/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
  }
  return kitP;
};

const hash2 = (x: number, z: number, seed: number) => {
  const s = Math.sin(x * 12.9898 + z * 78.233 + seed * 7.13) * 43758.5453;
  return s - Math.floor(s);
};

/** sun disc (solid, soft rim) and the flat golden halo (lighting.md 6 / depth.md 6.4: r50 13-26 % of the frame width) */
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
const smokeTex = () => ctex("smoke", 256, 256, (g) => {
  const p = new Pen(g);
  for (const [x, y, r, c] of [[90, 150, 60, "#8f8d96"], [150, 120, 70, "#a3a1aa"], [170, 165, 55, "#8f8d96"], [120, 100, 50, "#b4b2ba"]] as const) p.ell(x, y, r, r * 0.85, c, 0);
});
/** Mysore tiger flag: green field, yellow tiger stripes, white crescent */
const tigerFlagTex = () => ctex("tigerFlag", 256, 160, (g) => {
  g.fillStyle = "#1e6b3a"; g.fillRect(0, 0, 256, 160);
  g.strokeStyle = "#e8c45a"; g.lineWidth = 10; g.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const y = 20 + i * 30;
    g.beginPath(); g.moveTo(20, y); g.lineTo(236, y + 14); g.stroke();
  }
  g.fillStyle = "#f1efe6";
  g.beginPath(); g.arc(128, 80, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#1e6b3a";
  g.beginPath(); g.arc(140, 74, 30, 0, Math.PI * 2); g.fill();
});
/** US flag: 13 stripes + blue canton with white dots (stars simplified) */
const usFlagTex = () => ctex("usFlag", 256, 160, (g) => {
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f1efe6" : "#b02020"; g.fillRect(0, Math.floor((i * 160) / 13), 256, Math.ceil(160 / 13)); }
  g.fillStyle = "#2a3a6a"; g.fillRect(0, 0, 102, 86);
  g.fillStyle = "#f1efe6";
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { g.beginPath(); g.arc(10 + c * 20, 12 + r * 20, 4, 0, Math.PI * 2); g.fill(); }
});
/** red glare burst sprite: hot white core, orange mid, red edge */
const glareTex = () => ctex("glare", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,243,176,1)"); gr.addColorStop(0.25, "rgba(255,181,46,0.95)");
  gr.addColorStop(0.55, "rgba(255,90,60,0.7)"); gr.addColorStop(1, "rgba(255,60,40,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

type Mats = Record<string, THREE.Material>;

/** one flying rocket: bamboo pole + iron tube + flame cone; oriented along its flight path each frame */
type Rocket = {
  group: THREE.Group; flame: THREE.Mesh;
  wave: number; launch: number; dur: number;
  start: THREE.Vector3; end: THREE.Vector3; arc: number;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fill: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden" | "night", THREE.Texture[]>;
  private fgs: { o: THREE.Object3D; a: number; b: number }[] = [];
  private clouds: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private rockets: Rocket[] = [];
  private fireball: THREE.Mesh; private fireMat: THREE.MeshBasicMaterial;
  private blastLight: THREE.PointLight; private scorch: THREE.Mesh;
  private tumbrilFlame: THREE.Mesh;
  private smokePuffs: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; ox: number; oy: number; oz: number }[] = [];
  private glareSprites: THREE.Sprite[] = [];
  private haze: THREE.Mesh; private hazeMat: THREE.MeshBasicMaterial;

  constructor(kit: Kit) {
    void kit; // the Kenney kit is absent from the skill zip; every prop here is built from code (Batch/boxGeo)
    const R = this.root, M: Mats = {};
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    this.cloudMaps = {
      day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)),
      golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)),
      night: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.night.cloud)),
    };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- ground: dry plain, green field patches at the edges, dirt battlefield, stone fort courtyard ----
    const b = new Batch();
    M.ground = lam("ground", () => ({ color: "#cbb98a" })); // dry Mysore earth
    M.field = lam("fieldHD", () => ({ map: grassHD() }));
    M.dirt = lam("dirt", () => ({ color: "#b89a6a" })); // trampled battlefield dirt
    M.cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    M.stone = lam("stoneHD", () => ({ map: stoneHD() }));
    M.rock = lam("rockHD", () => ({ map: rockHD("rockHD", ["#9a8f80", "#8d8272", "#a89a86", "#7d7264", "#948878"], "#5f5348") }));
    M.wood = lam("woodTipu", () => ({ color: "#8a5a3a" }));
    M.woodDark = lam("woodDarkTipu", () => ({ color: "#6a4226" }));
    M.brick = lam("brickTipu", () => ({ map: brick() }));
    M.iron = lam("ironTipu", () => ({ color: "#5a6068" }));
    M.leaf = lam("leafTipu", () => ({ color: "#5a8a4a" }));
    M.trunk = lam("trunkTipu", () => ({ color: "#7a4f33" }));
    M.canvas = lam("canvasTipu", () => ({ color: "#e8e2d4" }));
    M.roof = lam("roofTipu", () => ({ color: "#a85a3a" }));
    b.add(quadUp(-900, 900, -900, 900, 225, 225), M.ground);
    for (const [x0, x1, z0, z1] of [[-160, -70, -80, -30], [70, 160, -80, -30], [-160, -50, 45, 120], [50, 160, 45, 120], [-90, 90, 70, 130]] as const)
      b.add(quadUp(x0, x1, z0, z1, (x1 - x0) / 4, (z1 - z0) / 4, 0.01), M.field);
    // trampled battlefield dirt (Pollilur) + the stone fort courtyard
    b.add(quadUp(-42, 42, -28, 38, 21, 16, 0.02), M.dirt);
    b.add(quadUp(-33, 33, -74, -43, 16, 8, 0.02), M.cobble);

    // ---- Seringapatam fort: front wall (with gate), side/back walls, bastions, palace + dome, tiger flags ----
    // front wall: two leaves + lintel over the gate (gate x -4..4, closed wooden doors)
    b.add(boxGeo(V(-35, D0, -43.5), V(-4, D0 + 8, -40.5)), M.stone);
    b.add(boxGeo(V(4, D0, -43.5), V(35, D0 + 8, -40.5)), M.stone);
    b.add(boxGeo(V(-4, D0 + 5, -43.5), V(4, D0 + 8, -40.5)), M.stone);
    // parapet crenellations along the front wall top (small teeth; Tipu stands between them at x 0)
    for (let x = -33; x <= 33; x += 3) {
      if (Math.abs(x) < 2.5) continue; // gap where Tipu stands
      b.add(boxGeo(V(x - 0.7, D0 + 8, -43.2), V(x + 0.7, D0 + 9, -41.8)), M.stone);
    }
    // side + back walls
    b.add(boxGeo(V(-36.5, D0, -75), V(-33.5, D0 + 8, -40.5)), M.stone);
    b.add(boxGeo(V(33.5, D0, -75), V(36.5, D0 + 8, -40.5)), M.stone);
    b.add(boxGeo(V(-36.5, D0, -76.5), V(36.5, D0 + 8, -73.5)), M.stone);
    // gate doors (closed, dark wood)
    b.add(boxGeo(V(-3.6, D0, -42.6), V(-0.2, D0 + 4.8, -42.2)), M.woodDark);
    b.add(boxGeo(V(0.2, D0, -42.6), V(3.6, D0 + 4.8, -42.2)), M.woodDark);
    // bastions: round towers at the four corners
    for (const [x, z] of [[-35, -42], [35, -42], [-35, -75], [35, -75]] as const) {
      const geo = new THREE.CylinderGeometry(4, 4.5, 11, 12);
      geo.translate(x, D0 + 5.5, z);
      b.add(geo, M.stone);
      const cap = new THREE.CylinderGeometry(4.4, 4.4, 0.8, 12);
      cap.translate(x, D0 + 11.2, z);
      b.add(cap, M.stone);
    }
    // palace: main block + dome + four minarets
    b.add(boxGeo(V(-9, D0, -70), V(9, D0 + 7, -56)), M.stone);
    const dome = new THREE.SphereGeometry(4.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.translate(0, D0 + 7, -63);
    b.add(dome, lam("domeTipu", () => ({ color: "#c9a13a" })));
    for (const [x, z] of [[-9, -70], [9, -70], [-9, -56], [9, -56]] as const) {
      const min = new THREE.CylinderGeometry(0.8, 1, 10, 8);
      min.translate(x, D0 + 5, z);
      b.add(min, M.stone);
    }
    // tiger flags: one on the palace dome, one on the front-left bastion
    const flagMat = new THREE.MeshLambertMaterial({ map: tigerFlagTex(), side: THREE.DoubleSide });
    twoTone(flagMat);
    for (const [x, z, y] of [[0, -63, D0 + 12], [-35, -42, D0 + 12.5]] as const) {
      const pole = new THREE.CylinderGeometry(0.08, 0.08, 6, 6);
      pole.translate(x, y, z);
      b.add(pole, M.woodDark);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2), flagMat);
      flag.position.set(x + 1.6, y + 2, z); flag.castShadow = true;
      R.add(flag);
    }
    b.build(R);

    // ---- Pollilur battlefield props: tumbrils, cannon, tents, rocket racks ----
    const props = new Batch();
    // ammunition tumbrils (the ones the rocket hits): wooden carts with canvas covers
    for (const [cx, cz] of [[TUMBRIL_AT[0], TUMBRIL_AT[2]], [12, 8]] as const) {
      props.add(boxGeo(V(cx - 0.8, D0 + 0.7, cz - 1.2), V(cx + 0.8, D0 + 1.5, cz + 1.2)), M.wood);
      props.add(boxGeo(V(cx - 0.9, D0 + 1.5, cz - 1.1), V(cx + 0.9, D0 + 2.1, cz + 1.1)), M.canvas);
      for (const s of [-1, 1]) {
        const wh = new THREE.CylinderGeometry(0.55, 0.55, 0.15, 12);
        wh.rotateX(Math.PI / 2); wh.translate(cx + s * 0.95, D0 + 0.55, cz);
        props.add(wh, M.woodDark);
      }
      const shaft = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6);
      shaft.rotateX(Math.PI / 2 - 0.2); shaft.translate(cx, D0 + 0.5, cz + 2);
      props.add(shaft, M.woodDark);
    }
    // two British cannon
    for (const [cx, cz, yaw] of [[14, 18, -0.4], [-14, 22, 0.3]] as const) {
      const barrel = new THREE.CylinderGeometry(0.22, 0.28, 2.4, 10);
      barrel.rotateX(Math.PI / 2 - 0.25); barrel.translate(cx, D0 + 1.1, cz);
      props.add(barrel, M.iron);
      props.add(boxGeo(V(cx - 0.5, D0 + 0.4, cz - 0.7), V(cx + 0.5, D0 + 0.9, cz + 0.7)), M.wood);
      for (const s of [-1, 1]) {
        const wh = new THREE.CylinderGeometry(0.6, 0.6, 0.15, 12);
        wh.rotateX(Math.PI / 2); wh.translate(cx + s * 0.65, D0 + 0.6, cz);
        props.add(wh, M.woodDark);
      }
    }
    // British tents (white canvas cones) at the south edge of the field
    for (const [cx, cz] of [[20, 34], [26, 30], [14, 36]] as const) {
      const tent = new THREE.ConeGeometry(2.2, 2.8, 8);
      tent.translate(cx, D0 + 1.4, cz);
      props.add(tent, M.canvas);
      const pole = new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6);
      pole.translate(cx, D0 + 1.7, cz);
      props.add(pole, M.woodDark);
    }
    // Mysore rocket racks: A-frames with rockets leaning at ~55 deg, BEHIND the rocketmen line
    // (north of it) — at the old spots (-26,-8) / (-22,-3) they stood AMONG the men and the
    // S5/S9/S15 cameras (which approach from the south-east) saw only poles, not the rocketmen
    for (const [rx, rz] of [[-30, -12], [-19, -14]] as const) {
      for (const s of [-1, 1]) {
        const leg = new THREE.CylinderGeometry(0.07, 0.07, 3, 6);
        leg.rotateZ(s * 0.5); leg.translate(rx + s * 0.7, D0 + 1.4, rz);
        props.add(leg, M.woodDark);
      }
      for (let k = 0; k < 5; k++) {
        const rk = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6);
        rk.rotateZ(0.6); rk.translate(rx - 0.8 + k * 0.4, D0 + 1.3, rz + 0.2);
        props.add(rk, M.wood);
        const tb = new THREE.CylinderGeometry(0.09, 0.09, 0.4, 6);
        tb.rotateZ(0.6); tb.translate(rx - 0.8 + k * 0.4 + 0.75, D0 + 2.2, rz + 0.2);
        props.add(tb, M.iron);
      }
    }
    props.build(R);

    // ---- rocket workshop (east): open shed, benches, standing rockets, crates, cooker ----
    const ws = new Batch();
    // shed: 4 posts + sloped terracotta roof, open on the west (camera) side
    for (const [px, pz] of [[52, -16], [64, -16], [52, -4], [64, -4]] as const)
      ws.add(boxGeo(V(px - 0.15, D0, pz - 0.15), V(px + 0.15, D0 + 3.5, pz + 0.15)), M.woodDark);
    {
      const roof = boxGeo(V(50, D0 + 3.5, -17), V(66, D0 + 3.8, -3));
      roof.rotateZ(0); // flat-ish slab; the slope reads from the camera angle
      ws.add(roof, M.roof);
    }
    // workbenches
    ws.add(boxGeo(V(55, D0 + 0.85, -11), V(61, D0 + 1.05, -9)), M.wood);
    for (const [lx, lz] of [[55.3, -10.8], [60.7, -10.8], [55.3, -9.2], [60.7, -9.2]] as const)
      ws.add(boxGeo(V(lx - 0.08, D0, lz - 0.08), V(lx + 0.08, D0 + 0.85, lz + 0.08)), M.woodDark);
    ws.add(boxGeo(V(55, D0 + 0.85, -15), V(61, D0 + 1.05, -13)), M.wood);
    // standing rockets leaning on the shed + crates of powder
    for (let k = 0; k < 6; k++) {
      const rk = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6);
      rk.rotateZ(0.35); rk.translate(53 + k * 0.5, D0 + 1.3, -15.5);
      ws.add(rk, M.wood);
    }
    for (const [cx, cz, s] of [[63, -6, 1], [62, -6.8, 0.8], [63.2, -7.2, 0.7]] as const)
      ws.add(boxGeo(V(cx - s / 2, D0, cz - s / 2), V(cx + s / 2, D0 + s, cz + s / 2)), M.wood);
    // pressure cooker on the bench (the analogy prop): squat dark pot + lid
    const pot = new THREE.CylinderGeometry(0.32, 0.28, 0.35, 12);
    pot.translate(BENCH_AT[0] + 0.8, D0 + 1.25, BENCH_AT[2] + 0.3);
    ws.add(pot, M.iron);
    const lid = new THREE.CylinderGeometry(0.34, 0.34, 0.06, 12);
    lid.translate(BENCH_AT[0] + 0.8, D0 + 1.45, BENCH_AT[2] + 0.3);
    ws.add(lid, M.iron);
    ws.build(R);

    // ---- Woolwich Arsenal (west): brick building + bench with the captured rocket + crates ----
    const ww = new Batch();
    ww.add(boxGeo(V(-66, D0, -20), V(-50, D0 + 7, -10)), M.brick);
    {
      const roof = boxGeo(V(-67, D0 + 7, -21), V(-49, D0 + 7.4, -9));
      ww.add(roof, M.roof);
    }
    // door + windows (dark, slightly proud of the wall)
    ww.add(boxGeo(V(-59.5, D0, -9.9), V(-56.5, D0 + 3.2, -9.7)), M.woodDark);
    for (const [wx, wy] of [[-64, 4], [-52, 4]] as const)
      ww.add(boxGeo(V(wx - 0.8, D0 + wy - 0.8, -9.9), V(wx + 0.8, D0 + wy + 0.8, -9.7)), lam("winTipu", () => ({ color: "#2a3040" })));
    // bench outside the building + the captured Mysorean rocket lying on it
    ww.add(boxGeo(V(-60, D0 + 0.85, -7.5), V(-56, D0 + 1.05, -6.5)), M.wood);
    const captured = new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8);
    captured.rotateZ(Math.PI / 2); captured.rotateY(0.2); captured.translate(-58, D0 + 1.25, -7);
    ww.add(captured, M.wood);
    const ctube = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
    ctube.rotateZ(Math.PI / 2); ctube.rotateY(0.2); ctube.translate(-56.9, D0 + 1.25, -6.8);
    ww.add(ctube, M.iron);
    for (const [cx, cz] of [[-52, -6], [-51, -7]] as const)
      ww.add(boxGeo(V(cx - 0.5, D0, cz - 0.5), V(cx + 0.5, D0 + 1, cz + 0.5)), M.wood);
    ww.build(R);

    // ---- Fort McHenry silhouette (south, night): low dark wall + flagpole + US flag ----
    const mh = new Batch();
    mh.add(boxGeo(V(-16, D0, 59), V(16, D0 + 4.5, 61)), lam("mchenryTipu", () => ({ color: "#3a3f52" })));
    for (const [x, z] of [[-10, 62], [10, 62]] as const) {
      const hut = boxGeo(V(x - 2, D0, z - 2), V(x + 2, D0 + 3, z + 2));
      mh.add(hut, lam("mchenryHut", () => ({ color: "#2e3346" })));
    }
    const pole = new THREE.CylinderGeometry(0.08, 0.1, 10, 6);
    pole.translate(0, D0 + 5, 58);
    mh.add(pole, M.woodDark);
    const usMat = new THREE.MeshLambertMaterial({ map: usFlagTex(), side: THREE.DoubleSide });
    twoTone(usMat);
    const usFlag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), usMat);
    usFlag.position.set(1.3, D0 + 8.6, 58); usFlag.castShadow = false;
    R.add(usFlag);
    mh.build(R);

    // ---- code trees at the lot edges + boulders ----
    const trees = new Batch();
    const treeSpots: [number, number, number][] = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + 0.4;
      const d = 82 + (k % 3) * 8;
      treeSpots.push([Math.cos(a) * d, 1.6 + hash2(k, 1, 2) * 1.2, Math.sin(a) * d * 0.9]);
    }
    for (const [tx, s, tz] of treeSpots) {
      const trunk = new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 2.4 * s, 7);
      trunk.translate(tx, D0 + 1.2 * s, tz);
      trees.add(trunk, M.trunk);
      const c1 = new THREE.IcosahedronGeometry(1.9 * s, 1);
      c1.translate(tx, D0 + 3.4 * s, tz);
      trees.add(c1, M.leaf);
      const c2 = new THREE.IcosahedronGeometry(1.3 * s, 1);
      c2.translate(tx + 0.7 * s, D0 + 4.4 * s, tz);
      trees.add(c2, M.leaf);
    }
    trees.build(R);
    {
      const geo = new THREE.IcosahedronGeometry(1, 1);
      const inst = new THREE.InstancedMesh(geo, M.rock, 10);
      const q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let k = 0; k < 10; k++) {
        const x = k < 5 ? -45 + k * 8 : 40 + (k - 5) * 9;
        const z = k % 2 ? -30 : 42;
        const s = 0.7 + hash2(k, 13, 9) * 1.2;
        e.set(hash2(k, 1, 2) * 3, hash2(k, 2, 4) * 3, hash2(k, 3, 6) * 3); q.setFromEuler(e);
        inst.setMatrixAt(k, this.m4.compose(V(x, D0 + s * 0.35, z), q, V(s, s * 0.75, s)));
      }
      inst.instanceMatrix.needsUpdate = true; inst.castShadow = true; inst.receiveShadow = true; inst.frustumCulled = false;
      R.add(inst);
    }

    // ---- flying rockets rig: 36 pre-allocated, assigned to the four barrage waves ----
    const rocketMat = lam("rocketBamboo", () => ({ color: "#b08a4a" }));
    const tubeMat = lam("rocketTube", () => ({ color: "#5a6068" }));
    const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 1.4, 0.3) }); // emissive-hot: bloom catches it
    const mkRocket = (): Rocket => {
      const group = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 6), rocketMat);
      group.add(pole);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), tubeMat);
      tube.position.y = 0.9;
      group.add(tube);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 8), flameMat);
      flame.rotation.x = Math.PI; flame.position.y = -1.3;
      group.add(flame);
      group.visible = false;
      R.add(group);
      return { group, flame, wave: 0, launch: 0, dur: 1, start: new THREE.Vector3(), end: new THREE.Vector3(), arc: 6 };
    };
    const assign = (r: Rocket, wave: number, launch: number, dur: number, sx: number, sz: number, ex: number, ez: number, ey: number, arc: number) => {
      r.wave = wave; r.launch = launch; r.dur = dur;
      r.start.set(sx, D0 + 1.2, sz); r.end.set(ex, ey, ez); r.arc = arc;
    };
    for (let i = 0; i < 36; i++) {
      const r = mkRocket();
      const j = (a: number, b: number, k: number) => a + (b - a) * hash2(i, k, 7);
      if (i < 6) { // wave 1: the first rockets whistle in (shot 4)
        assign(r, 0, ROCKET_WAVES[0][0] + i * 0.28, 1.3, ROCKETMEN_AT[0] + j(-2, 2, 1), ROCKETMEN_AT[2] + j(-2, 2, 2),
          COLUMN_AT[0] + j(-6, 6, 3), COLUMN_AT[2] + j(-4, 8, 4), D0 + j(14, 24, 5), 8);
      } else if (i < 18) { // wave 2: the barrage (shot 5)
        assign(r, 1, ROCKET_WAVES[1][0] + (i - 6) * 0.32, 1.1 + hash2(i, 9, 3) * 0.5, ROCKETMEN_AT[0] + j(-3, 3, 1), ROCKETMEN_AT[2] + j(-3, 3, 2),
          COLUMN_AT[0] + j(-10, 10, 3), COLUMN_AT[2] + j(-8, 12, 4), D0 + j(12, 26, 5), 7);
      } else if (i === 18) { // wave 3: the single rocket onto the tumbril (shot 7)
        assign(r, 2, ROCKET_WAVES[2][0], 1.0, ROCKETMEN_AT[0], ROCKETMEN_AT[2], TUMBRIL_AT[0], TUMBRIL_AT[2], D0 + 1.0, 13);
      } else if (i === 19) { // wave 5: ONE rocket arcs high to show the 2 km range (shot 12)
        assign(r, 4, ROCKET_WAVES[4][0], 4.0, ROCKETMEN_AT[0], ROCKETMEN_AT[2], -30, -40, D0 + 24, 18);
      } else if (i === 20) { // wave 6: ONE rocket sails past the column, never hitting its mark (shot 14)
        assign(r, 5, ROCKET_WAVES[5][0], 3.0, ROCKETMEN_AT[0], ROCKETMEN_AT[2], 8, 26, D0 + 2, 12);
      } else { // wave 4: a thousand rockets at once (shot 15) — 15 rockets now (2 lent to waves 5-6)
        assign(r, 3, ROCKET_WAVES[3][0] + (i - 21) * 0.3, 1.6 + hash2(i, 9, 3) * 0.9, ROCKETMEN_AT[0] + j(-4, 4, 1), ROCKETMEN_AT[2] + j(-4, 4, 2),
          j(-20, 20, 3), j(-10, 30, 4), D0 + j(20, 38, 5), 9);
      }
      this.rockets.push(r);
    }

    // ---- explosion rig at the tumbrils ----
    this.fireMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 1.0, 0.2), transparent: true, opacity: 0 });
    this.fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), this.fireMat);
    this.fireball.position.set(TUMBRIL_AT[0], D0 + 1.5, TUMBRIL_AT[2]);
    this.fireball.visible = false; this.fireball.layers.set(NOINK);
    R.add(this.fireball);
    this.blastLight = new THREE.PointLight(0xff8a2a, 0, 60, 1.6);
    this.blastLight.position.set(TUMBRIL_AT[0], D0 + 3, TUMBRIL_AT[2]);
    R.add(this.blastLight);
    const scorchGeo = new THREE.CircleGeometry(3.2, 20); scorchGeo.rotateX(-Math.PI / 2);
    this.scorch = new THREE.Mesh(scorchGeo, new THREE.MeshBasicMaterial({ color: 0x241a12, transparent: true, opacity: 0 }));
    this.scorch.position.set(TUMBRIL_AT[0], D0 + 0.05, TUMBRIL_AT[2]);
    R.add(this.scorch);
    // burning cart flame (flickers after the hit)
    this.tumbrilFlame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 8), flameMat);
    this.tumbrilFlame.position.set(TUMBRIL_AT[0], D0 + 2.2, TUMBRIL_AT[2]);
    this.tumbrilFlame.visible = false;
    R.add(this.tumbrilFlame);
    // blast smoke column
    const smokeT = smokeTex();
    for (let k = 0; k < 6; k++) {
      const mat = new THREE.MeshBasicMaterial({ map: smokeT, transparent: true, depthWrite: false, opacity: 0 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.layers.set(NOINK); m.visible = false; R.add(m);
      this.smokePuffs.push({ m, mat, ox: (hash2(k, 1, 3) - 0.5) * 2.4, oy: hash2(k, 2, 4) * 1.2, oz: (hash2(k, 3, 5) - 0.5) * 2.4 });
    }
    // barrage smoke haze over the battlefield (fades in with the barrage)
    this.hazeMat = new THREE.MeshBasicMaterial({ map: smokeT, transparent: true, depthWrite: false, opacity: 0 });
    this.haze = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), this.hazeMat);
    this.haze.position.set(-8, D0 + 8, 0); this.haze.layers.set(NOINK); this.haze.visible = false;
    R.add(this.haze);

    // ---- red glare bursts over Fort McHenry (night) ----
    const gTex = glareTex();
    for (let i = 0; i < GLARE_TIMES.length; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: gTex, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending, fog: false }));
      sp.position.set(-6 + i * 3, D0 + 18 + (i % 3) * 5, 58 + (i % 2) * 4);
      sp.layers.set(NOINK); R.add(sp);
      this.glareSprites.push(sp);
    }

    // the CAM agent's near framing objects: built once, never passed through the sight-line filter, toggled per frame
    for (const fg of FOREGROUND) {
      const o = kitClone(kit, fg.kit, fg.s ?? 1);
      if (!o) continue;
      o.position.set(...fg.pos); o.rotation.y = fg.yaw ?? 0; o.visible = false;
      this.fgs.push({ o, a: fg.a, b: fg.b }); R.add(o);
    }
  }

  /** camera-relative sun, frozen per shot: the shot's mean view direction turned by az toward screen right, lifted by el */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az); // screen right = (-fz, fx)
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], tau = s.tau(t), b = tipuState(id, t), L = LIGHTS[s.light];
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK); // sky, clouds and dust sprites live on the no-ink layer but are still rendered
    // ---- light rig (lighting.md 9.4): camera-relative sun frozen per shot, two-tone uniforms, shadow fit ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30); // el 7: 2 m cards throw ~16 m shadows, houses much longer
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0; // not used by the two-tone shading
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog (colour = horizon colour, linear fogNear -> fogFar), sun disc + halo, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- foreground framing objects: inside their frames AND their own shot (so a crossfade layer never shows them) ----
    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;
    // ---- rockets, explosion, glare ----
    this.poseFx(t, cam);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, b, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint); // legacy emissive card until the CHAR agent's cardShade lands
      a.mesh.castShadow = L.actorShadow; // day: soft contact blobs instead (CHAR agent)
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }

  /** rockets in flight, the tumbril explosion, the barrage haze, the red glare — all pure functions of t */
  private poseFx(t: number, cam: THREE.PerspectiveCamera) {
    // ---- flying rockets ----
    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
    for (const r of this.rockets) {
      const u = (t - r.launch) / r.dur;
      if (u < 0 || u > 1.15) { r.group.visible = false; continue; }
      const uu = Math.min(u, 1);
      tmpA.lerpVectors(r.start, r.end, uu);
      tmpA.y += r.arc * Math.sin(Math.PI * uu) * (1 - uu * 0.3);
      // orient along the velocity: sample a point slightly ahead
      const u2 = Math.min(uu + 0.02, 1);
      tmpB.lerpVectors(r.start, r.end, u2);
      tmpB.y += r.arc * Math.sin(Math.PI * u2) * (1 - u2 * 0.3);
      r.group.position.copy(tmpA);
      r.group.lookAt(tmpB);
      r.group.rotateX(Math.PI / 2); // the rocket's +Y (tube up) must point along the flight direction
      r.group.visible = true;
      const fl = 0.8 + 0.4 * Math.sin(t * 40 + r.launch * 20);
      r.flame.scale.set(fl, fl * (1 + 0.3 * Math.sin(t * 55)), fl);
      r.flame.visible = uu < 0.98;
    }
    // ---- explosion at the tumbrils ----
    const dt = t - BLAST_T0;
    const on = dt >= 0 && dt < BLAST_DUR + 1.2;
    this.fireball.visible = on;
    if (on) {
      // fireball: fast rise (0.2 s), HOT white-yellow core, then it is GONE by dt = 1.0 s — the smoke
      // column takes over after that. (Before this fix the ball sat at ~87% opacity for 1.5 s and read
      // as a giant pink balloon, not fire: the green channel had already cooled while the ball stayed huge.)
      const grow = Math.min(1, dt / 0.2), fade = dt < 0.35 ? 1 : Math.max(0, 1 - (dt - 0.35) / 0.65);
      const sc = 3.6 * grow * (1 + 0.1 * Math.sin(t * 30)) * (0.7 + 0.3 * fade);
      this.fireball.scale.set(sc, sc * 0.85, sc);
      this.fireMat.opacity = 0.95 * fade;
      this.fireMat.color.setRGB(2.5 * fade + 0.4, (1.6 * fade + 0.3) * (1 - dt / 1.2), 0.25);
      this.blastLight.intensity = 60 * Math.max(0, 1 - dt / 1.4);
    } else this.blastLight.intensity = 0;
    (this.scorch.material as THREE.MeshBasicMaterial).opacity = t >= BLAST_T0 ? 0.85 : 0;
    // burning cart flame flickers for ~3 s after the hit
    const burn = t >= TUMBRIL_HIT_T && t < TUMBRIL_HIT_T + 3;
    this.tumbrilFlame.visible = burn;
    if (burn) {
      const s = 0.8 + 0.35 * Math.sin(t * 23) + 0.2 * Math.sin(t * 41);
      this.tumbrilFlame.scale.set(s, s * 1.2, s);
    }
    // blast smoke column rises and spreads
    for (const d of this.smokePuffs) {
      const sdt = t - BLAST_T0;
      const son = sdt >= 0 && sdt < 2.2;
      d.m.visible = son;
      if (!son) continue;
      const sc2 = 1.2 + sdt * 3.2;
      d.m.position.set(TUMBRIL_AT[0] + d.ox + sdt * 0.8, D0 + 1.5 + d.oy + sdt * 2.4, TUMBRIL_AT[2] + d.oz);
      d.m.scale.set(sc2, sc2, 1);
      d.m.quaternion.copy(cam.quaternion);
      d.mat.opacity = 0.65 * (1 - sdt / 2.2);
    }
    // ---- barrage smoke haze ----
    const hz = Math.max(0, Math.min(1, (t - 19.0) / 1.5)) * (t < 24 ? 1 : Math.max(0, 1 - (t - 24) / 2));
    const hz2 = Math.max(0, Math.min(1, (t - 66.4) / 1.5)) * (t < 72.5 ? 1 : Math.max(0, 1 - (t - 72.5) / 2));
    const hop = Math.max(hz, hz2);
    this.haze.visible = hop > 0.01;
    if (this.haze.visible) {
      this.haze.quaternion.copy(cam.quaternion);
      this.hazeMat.opacity = 0.22 * hop;
    }
    // ---- red glare bursts over Fort McHenry ----
    for (let i = 0; i < this.glareSprites.length; i++) {
      const sp = this.glareSprites[i], gt = t - GLARE_TIMES[i];
      const gon = gt >= 0 && gt < 0.9;
      (sp.material as THREE.SpriteMaterial).opacity = gon ? 0.95 * (1 - gt / 0.9) : 0;
      const s = gon ? 2 + 9 * Math.min(1, gt / 0.2) : 0.01;
      sp.scale.set(s, s, 1);
    }
  }
}

/** horizontal quad facing up at height D0 + dy covering x0..x1, z0..z1 (z0 < z1) */
function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, dy = 0) {
  const y = D0 + dy, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
