# AZR-364 Accepted Terrain Equivalence Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: accepted terrain material and transition sheets were
  loaded, but the WebGL2 surface tile path did not prove direct `file://`
  consumption of those accepted sidecar atlas pages.
- Representation/lifecycle boundary changed: neutral terrain samples can select
  accepted material or transition cells as watcher-facing facade pixels while
  generated procedural atlas cells remain the fallback and ecology/civilization
  encodings remain authoritative.
- Chunk, batch, or aggregate boundary used: existing surface tile WebGL atlas
  page batches remain the draw boundary. Accepted replacements are cached per
  ready chunk cell and submitted through the same instanced page upload path.
- Readiness state required before consumption: the accepted manifest entry,
  sprite metadata, and decoded RGBA sidecar must be loaded before a terrain
  material or transition cell can replace the fallback cell.
- Player-perception contract preserved: static/local terrain can show richer
  accepted material and transition pixels while active camera motion and
  unpaused simulation keep the procedural/stale surface path to preserve smooth
  Google-Earth-style zoom.
- New constraint or encoding limit introduced: accepted terrain promotion uses
  fixed biome-to-material and transition-shape mappings, only promotes neutral
  ecology/civilization samples, and samples production terrain at a deterministic
  sparse cadence. Explicit ready transition cells can still be promoted by name.
- Metric proving the bottleneck moved: the direct-file visual gate includes an
  `accepted-terrain` scene with nonzero `equivalenceTerrainDraws` and
  `equivalenceTransitionDraws`, plus frame metrics under budget.

## Evidence

- `node tests/surface-tile-webgl.test.js`: passed.
- `node tests/equivalence-assets.test.js`: passed.
- `node tests/renderer-interface.test.js`: passed.
- `node tests/no-canvas2d-source.test.js`: passed.
- `node tests/no-canvas2d-runtime.test.js`: passed.
- `node tests/visual/screenshot.test.js`: passed.

Direct `file://` screenshot gate:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":false,"diff":0,"darkPixels":0,"band":"continent"},{"name":"overlay-visible","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"region-view","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":false,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"accepted-terrain","updated":false,"diff":0,"darkPixels":0,"band":"local"},{"name":"entities-visible","updated":false,"diff":0,"darkPixels":0.0015,"band":"local"},{"name":"settlement-ground","updated":false,"diff":0,"darkPixels":0.0176,"band":"settlement"},{"name":"hud-visible","updated":false,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"zoomSweep":{"startZoom":1,"endZoom":7,"bands":["continent","local","planet","region","settlement"],"preloadTargets":["2","3","4","5","6","7"],"maxAnchorErrorDeg":2.842e-14,"maxTransitionAlpha":0.752,"blendedFrames":4,"averageFrameMs":9.962,"peakFrameMs":15.8},"averageFrameMs":19.62,"peakFrameMs":40.8}
```
