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

## Render (GitHub Actions, repo tipu-3d-render)
- Speed test FIRST: `.github/workflows/render-speed-test.yml` (10 frames, prints SECONDS_PER_FRAME,
  blank check via ffmpeg signalstats, uploads the clip). Run from the Actions tab.
- Full render: `.github/workflows/render.yml` — 20 parallel jobs, 139 frames/job
  (shard 19: 2641-2772, 132 frames). Each uploads `part-N.mp4` (retention 1 day).
## Measured speed (Manjhi re-run, 2026-11-10 ~11:13 IST — the same stack, PostDriver)
- Speed test: 10/10 frames, 1080x1920, 30 fps, **6.1 s/frame** (61 s total; first run 6.8).
  Full 2,773-frame Tipu render on 20 jobs = 139 frames/job x 6.1 s/frame ≈ **14 min wall**.
- CAVEAT: Manjhi's frames 1-9 showed a TILING defect in video mode (mountain/sky repeats 5x
  vertically + vertical seam) while frame 0 was good; the fix subagent is investigating.
  Tipu's STILLS show no tiling, but stills cannot rule out a video-mode-only defect — the
  Tipu speed-test 10-frame clip must be checked frame by frame for tiling before the full run.
- Scaling if the speed test is slower: ~30 s/frame -> ~70 min; ~100 s/frame -> ~4 h.
- After all 20 jobs: download the 20 `part-N` artifacts, run `scripts/merge-parts.sh` locally
  (concat -> mux audio/mix.wav -> QA via scripts/short_qa.py shots.json).
- The repo does NOT contain voice.wav/mix.wav (mux is local); the render needs only the code.

## Audio (local, done before the render finishes)
- `audio/sfx_tipu.py` (97 cues: rocket whistles, explosion, cooker, marches, night booms),
  `audio/music_tipu.py` (original Bb march, 12 sections), `audio/mix_tipu.py`
  (voice + music -14 dB + SFX -10 dB, ducking, -14 LUFS, limiter <= -1 dBTP).
- Output: `audio/mix.wav` (92.402 s). Muxed by merge-parts.sh.
