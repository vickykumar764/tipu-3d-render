# Tipu Sultan 3D short — full-render plan (2026-11-10)

## Video
- Title: "Tipu Sultan Ki Rocket Ne Angrezon Ko Kaise Haraya!"
- 92.402 s, 2,773 frames at 30 fps, 1080x1920, H.264 CRF 16, ~-14 LUFS, no captions.
- Voice: ElevenLabs Amit Gupta (single generation, 1,283 chars, 91.40 s) — split line-wise by
  silence detection into work/lines/ + remotion/voice/voice.wav + words.json (238 words, 18 lines).
- World: Seringapatam fort, Pollilur battlefield, rocket workshop, Woolwich Arsenal, Fort McHenry (night).
- Skill: claude-animated-shorts (Remotion + three.js, PostDriver pattern — see below).

## Measured render speed (this VM, SwiftShader, 1080x1920)
- Local stills via `scripts/tipu-stills.mjs` (scale 0.5): ~160-200 s/frame expected (same stack as Manjhi).
- Local full video = 2,773 frames x ~180 s ≈ **139 hours — NOT feasible locally.**
- GitHub Actions is the render route (fastest measured for the Playwright kit: 4.13 s/frame).

## PostDriver — the blank-canvas fix (APPLIED, same as Manjhi/Ancient Jar)
- The `<EffectComposer>` wrapper from @react-three/postprocessing creates its plain postprocessing
  composer inside a passive useEffect, but Remotion's advance() runs BEFORE a child's passive effects,
  so in render mode the frame renders with no composer present — **blank canvas, NO error**.
- Fix in Tipu.tsx: the wrapper is gone. A `PostDriver` component creates the plain postprocessing
  composer synchronously in useMemo (`new PPComposer(gl, { frameBufferType: HalfFloatType, multisampling: 4 })`)
  and drives it from a priority-1 useFrame calling `composer.render(delta)`.
- Pass order = the skill's chain: RenderPass -> InkPass -> LensBlur pre -> LensBlur main -> ONE merged
  EffectPass (bloom + NEUTRAL tone + grade), MSAA 4, HalfFloat. **Do NOT use the `<EffectComposer>` wrapper
  in render mode in any project.**

## Render (GitHub Actions, repo tipu-3d-render) — STILLS METHOD (2026-11-10)
- Speed test FIRST: `.github/workflows/render-speed-test.yml` (10 frames, prints STILLS_DONE +
  RENDER_SECONDS + SECONDS_PER_FRAME, blank check via ffmpeg signalstats, uploads the clip).
  Run from the Actions tab.
- Full render: `.github/workflows/render.yml` — 20 parallel jobs, 139 frames/job
  (shard 19: 2641-2772, 132 frames). Each uploads `part-N.mp4` (retention 1 day).
- RENDER METHOD: stills, NOT `remotion render`. Each frame is rendered as a still (fresh browser
  page) by `scripts/tipu-render-shard.mjs` (300 s readiness timeout per still, JPEG q90, scale 1.0)
  and encoded to mp4 with ffmpeg (30 fps, h264, crf 16). Same proven script family as Manjhi's
  `manjhi-render-shard.mjs` and Ancient Jar's `jar-render-shard.mjs`.

## Speed test (Tipu, 2026-11-10) — video mode FAILED the frame check
- Run 42780616860: 10/10 frames, 1080x1920, 30 fps, **7.0 s/frame** (70 s total), run 4m 29s.
  But frames 0-1 were the correct fort hook while frames 2-9 were ALL the same flat blue sky tiled
  ~5x vertically + vertical seam at ~72% width (fort/dome/flag/characters gone) — the SAME
  Chrome/SwiftShader compositor tiling defect as Manjhi (video-mode `remotion render` re-presents a
  region of the WebGL canvas for frames 2+; here the repeated tile was the top-left sky). The stills
  method (this fix) is the cure; the new speed test must prove every frame clean before the full run.
- Expected stills cost on Actions: ~15-25 s/frame (ESTIMATE, unmeasured) → a 139-frame shard takes
  ~35-60 min — well within the 6 h job limit. The speed test must measure the real number.
- Kenney GLBs: 15 of 26 on disk under `public/bridge/kenney/` (Nature Kit, CC0 — 5 trees, 3 bushes,
  3 flowers, grass, grass_large, lily_large, canoe; all valid glTF 2.0). The other 11 are not files
  and never will be (11 veg names are procedural via the VEG map; banners are painted cloth;
  lantern/cart/stall-*/windmill do not exist in Kenney's catalog). The Kenney 404s in the first
  speed-test log were cosmetic (frames 0-1 rendered fine without any GLBs). loadKit() has an 8 s
  Promise.race fallback so a hung fetch can never block the render.
- After all 20 jobs: download the 20 `part-N` artifacts, run `scripts/merge-parts.sh` locally
  (concat -> mux audio/mix.wav -> QA via scripts/short_qa.py shots.json).
- The repo does NOT contain voice.wav/mix.wav (mux is local); the render needs only the code.

## Audio (local, done before the render finishes)
- `audio/sfx_tipu.py` (97 cues: rocket whistles, explosion, cooker, marches, night booms),
  `audio/music_tipu.py` (original Bb march, 12 sections), `audio/mix_tipu.py`
  (voice + music -14 dB + SFX -10 dB, ducking, -14 LUFS, limiter <= -1 dBTP).
- Output: `audio/mix.wav` (92.402 s). Muxed by merge-parts.sh.
