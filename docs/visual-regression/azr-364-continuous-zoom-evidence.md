# AZR-364 Continuous Zoom Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: continuous Google-Earth-style zoom was not measured as a
  multi-step interaction, and the first sweep exposed interaction-time surface
  generation at `143.817ms` average frame time.
- Representation/lifecycle boundary changed: active camera zoom now records
  runtime transition stats, including source zoom, target zoom, direction,
  cursor-anchor error, and preload LOD target. During camera interaction, fresh
  surface chunk generation is capped more aggressively so the renderer can keep
  showing ready/stale WebGL terrain while new chunks promote over later frames.
- Chunk, batch, or aggregate boundary: the changed work boundary is the
  interaction-time surface render chunk generation cap, reduced from `12` to
  `2` chunks per pass. Rendering still uses the existing WebGL2 terrain atlas
  batch and formal LOD layer blend boundary.
- Readiness state required: generated surface chunks must still reach
  `ready` before being consumed by the WebGL tile batch. Pending chunks remain
  pending; the visual sweep accepts stale/ready terrain and underlay rather
  than blocking on newest requested chunks during camera motion.
- Player-perception contract preserved: wheel zoom keeps the cursor anchored,
  traverses planet, continent, region, local, and settlement bands, exercises
  LOD transition alpha, and avoids black debug/error output.
- New constraint or encoding limit: active camera interaction now promotes at
  most `2` fresh surface render chunks per pass. Full idle detail generation
  still uses the existing idle chunk budget after interaction settles.
- Metric proving the bottleneck moved: continuous zoom sweep average frame time
  moved from `143.817ms` to `9.154ms`, with peak frame time `16.6ms`, maximum
  anchor drift `2.132e-14` degrees, `4` blended LOD frames, and preload targets
  `2..7`.

## Verification

Commands:

```bash
node tests/planet-zoom-anchor.test.js
node tests/camera-unified.test.js
node tests/renderer-interface.test.js
node tests/no-canvas2d-source.test.js
npm run test:visual
npm test
npm run build
bash .codex/setup.sh
node tests/no-canvas2d-runtime.test.js
rg -n "agent-studio|tools/agent-studio" index.html js
rg -n "getContext\(['\"]2d|CanvasRenderingContext2D|canvas2d|Canvas2D|drawImage\(" index.html js config.js
```

Observed visual regression check:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":false,"diff":0.0029,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":false,"diff":0.0022,"darkPixels":0,"band":"region"},{"name":"local-view","updated":false,"diff":0.0022,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":false,"diff":0.0013,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":false,"diff":0.0018,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":false,"diff":0.0024,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":false,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":false,"diff":0.0032,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"zoomSweep":{"startZoom":1,"endZoom":7,"bands":["continent","local","planet","region","settlement"],"preloadTargets":["2","3","4","5","6","7"],"maxAnchorErrorDeg":2.132e-14,"maxTransitionAlpha":0.752,"blendedFrames":4,"averageFrameMs":9.154,"peakFrameMs":16.6},"averageFrameMs":13.317,"peakFrameMs":22.3}
```

Additional closeout results:

- `npm test`: passed.
- `npm run build`: passed.
- `bash .codex/setup.sh`: passed.
- `node tests/no-canvas2d-runtime.test.js`: passed.
- `rg -n "agent-studio|tools/agent-studio" index.html js`: no matches.
- `rg -n "getContext\(['\"]2d|CanvasRenderingContext2D|canvas2d|Canvas2D|drawImage\(" index.html js config.js`: no matches.
