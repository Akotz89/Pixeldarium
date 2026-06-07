# AZR-364 Settlement Equivalence Detail Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: accepted stockpile, work/status, and material/effect
  equivalence sheets were present in the runtime handoff but not proven as
  consumed by the settlement/ground WebGL proof scene.
- Representation/lifecycle boundary changed: settlement food, population,
  development, and level aggregates now derive bounded watcher-facing stockpile,
  work/status, and effect facades. They are visual facades, not authoritative
  simulation agents.
- Chunk, batch, or aggregate boundary used: the existing entity WebGL atlas-page
  batches remain the draw boundary. Counts are capped per visible settlement.
- Readiness state required before consumption: accepted equivalence cells must
  resolve to ready RGBA sidecar-backed atlas pages before facade batches count
  as rendered.
- Player-perception contract preserved: settlement/ground zoom shows richer
  ground activity and stored-resource detail while preserving smooth direct-file
  zoom and aggregate settlement authority.
- New constraint or encoding limit introduced: stockpile, work/status, and
  effect facade counts are capped by bounded settlement aggregate buckets and
  fixed accepted-use mappings.
- Metric proving the bottleneck moved: `settlement-ground` now asserts nonzero
  WebGL draw counts for stockpile, work-status, and effect facades plus nonzero
  accepted equivalence uses for `stockpile`, `workStatus`, and `effect`.

## Evidence

- `node tests/entity-webgl.test.js`: passed.
- `node tests/render-layer-order.test.js`: passed.
- `node tests/visual/screenshot.test.js`: passed.

Direct `file://` screenshot gate:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":false,"diff":0,"darkPixels":0,"band":"continent"},{"name":"overlay-visible","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"region-view","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":false,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":false,"diff":0,"darkPixels":0.0047,"band":"local"},{"name":"settlement-ground","updated":false,"diff":0.0006,"darkPixels":0.0176,"band":"settlement"},{"name":"hud-visible","updated":false,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"zoomSweep":{"startZoom":1,"endZoom":7,"bands":["continent","local","planet","region","settlement"],"preloadTargets":["2","3","4","5","6","7"],"maxAnchorErrorDeg":2.132e-14,"maxTransitionAlpha":0.752,"blendedFrames":4,"averageFrameMs":9.917,"peakFrameMs":18.1},"averageFrameMs":13.125,"peakFrameMs":19.9}
```
