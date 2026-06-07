# AZR-364 Surface Underlay Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: local and region zoom could show black viewport gaps
  outside ready detailed surface chunks, breaking the Google-Earth-style
  continuous zoom perception.
- Representation/lifecycle boundary changed: the renderer now draws a
  full-screen aggregate terrain underlay before detailed surface chunks. Ready
  chunks remain the high-detail facade; the underlay is the stale/coarse
  representation shown while chunk detail streams.
- Chunk, batch, or aggregate boundary: the underlay is one WebGL2 full-screen
  batch sampling the aggregate planet terrain texture. Detailed chunks still use
  chunk-aligned WebGL2 atlas batches on top.
- Readiness state required: the pass waits for the WebGL2 target and reuses the
  ready globe terrain texture when available. It falls back to its own terrain
  upload only if the shared texture is unavailable.
- Player-perception contract preserved: surface zooms now keep the viewport
  filled with terrain color instead of black space while chunk details promote,
  with detailed pixel chunks still visible above the underlay.
- New constraint or encoding limit: the local underlay shader assumes 8-bit
  aggregate terrain texture sampling and equirectangular lat/lon projection for
  coarse continuity, not exact meter-level detail.
- Metric proving the bottleneck moved: `npm run test:visual` now reports
  surface dark-pixel coverage of `0`, desert dark-pixel coverage of `0`, and
  entity-visible dark-pixel coverage of `0.004`, while average frame time stays
  below the 20ms visual benchmark budget.

## Verification

Commands and checks:

```bash
npm run golden:update
npm run test:visual
node tests/shader-manager.test.js
node tests/renderer-interface.test.js
```

Observed visual benchmark:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":false,"diff":0,"darkPixels":0.6148},{"name":"surface-temperate","updated":false,"diff":0,"darkPixels":0},{"name":"surface-desert","updated":false,"diff":0,"darkPixels":0},{"name":"entities-visible","updated":false,"diff":0,"darkPixels":0.004},{"name":"hud-visible","updated":false,"diff":0,"darkPixels":0.0096}],"averageFrameMs":13.009,"peakFrameMs":20.6}
```

Direct `file://` smoke:

- page errors: `0`
- failed requests: `0`
- debug output: blank
- underlay draw count: `3`
- underlay texture uploads: `0` after reusing the globe terrain texture
- underlay fallback count: `0`
- underlay last frame: `0.1ms`
