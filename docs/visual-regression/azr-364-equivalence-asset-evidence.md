# AZR-364 Accepted Equivalence Asset Visual Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: accepted runtime art sheets were loaded as ordinary
  `file://` image elements, which are not origin-clean for WebGL texture upload
  and therefore could not safely replace procedural fallback entity atlas pages
  in the direct `index.html` launch path.
- Representation/lifecycle boundary changed: accepted PNG sprite sheets remain
  reviewed source assets, while WebGL consumes decoded `.rgba.json` sidecar
  buffers as atlas pages. Procedural atlas cells remain fallback cells.
- Chunk, batch, or aggregate boundary used: the existing entity WebGL atlas
  page batch remains the draw boundary. Settlement, vegetation, citizen, and
  world-UI facades select bounded accepted-use cells before instance submission.
- Readiness state required before consumption: the sheet image, sprite metadata,
  and RGBA sidecar must be loaded and the sidecar must decode to the declared
  byte length before an accepted atlas page is promoted.
- Player-perception contract preserved: settlement/ground zoom gains denser
  accepted structure, vegetation, citizen, and world-UI detail without changing
  aggregate settlement authority, zoom movement, or direct-file launch.
- New constraint or encoding limit introduced: accepted runtime overrides use a
  fixed use-to-cell map and RGBA sidecars. Corrupt declared sidecars do not fall
  back silently to tainted image pages.
- Metric proving the bottleneck moved: the `settlement-ground` visual gate now
  asserts nonzero accepted equivalence selections, rendered accepted texture
  pages, zero missing accepted cells, and nonzero accepted uses for settlement,
  vegetation, citizen, and world UI.

## Evidence

- `node tests/asset-loader.test.js`: passed.
- `node tests/asset-manifest.test.js`: passed.
- `node tests/equivalence-assets.test.js`: passed.
- `node tests/no-canvas2d-source.test.js`: passed.
- `node tests/no-canvas2d-runtime.test.js`: passed.
- `node tests/visual/screenshot.test.js`: passed.

Direct `file://` screenshot gate:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":false,"diff":0,"darkPixels":0,"band":"continent"},{"name":"overlay-visible","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"region-view","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":false,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":false,"diff":0,"darkPixels":0.0047,"band":"local"},{"name":"settlement-ground","updated":false,"diff":0,"darkPixels":0.0176,"band":"settlement"},{"name":"hud-visible","updated":false,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"zoomSweep":{"startZoom":1,"endZoom":7,"bands":["continent","local","planet","region","settlement"],"preloadTargets":["2","3","4","5","6","7"],"maxAnchorErrorDeg":1.776e-14,"maxTransitionAlpha":0.752,"blendedFrames":4,"averageFrameMs":9.071,"peakFrameMs":14.9},"averageFrameMs":13.419,"peakFrameMs":17.4}
```

Visual inspection of
`tests/visual/golden/settlement-ground.png` confirms dense accepted
settlement/ground pixel detail is visible in the settlement band.
