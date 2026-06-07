# AZR-364 Ready Edge Feather Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: ready local surface chunks could appear as hard,
  stair-stepped patches over the aggregate underlay, weakening the
  Google-Earth-style zoom perception while new chunks stream.
- Representation/lifecycle boundary changed: ready terrain atlas instances now
  carry a bounded screen-space feather alpha. Chunk readiness, worker
  promotion, and atlas material selection remain unchanged.
- Chunk, batch, or aggregate boundary: the existing WebGL2 terrain atlas
  chunk/page batch remains the only production draw path for ready surface
  chunks.
- Readiness state required: only ready `cellCache` samples are drawn; stale
  aggregate underlay stays visible behind feathered edge cells.
- Player-perception contract preserved: surface zooms remain filled with no
  black gaps, and ready detail blends into the underlay instead of ending in a
  harsh square edge.
- New constraint or encoding limit: feathering is bounded by
  `PLANET_SURFACE_READY_EDGE_FEATHER_INNER_RATIO`,
  `PLANET_SURFACE_READY_EDGE_FEATHER_OUTER_RATIO`, and
  `PLANET_SURFACE_READY_EDGE_FEATHER_MIN_ALPHA`; it only changes the existing
  per-instance alpha float.
- Metric proving the bottleneck moved: visual captures report unchanged
  non-orbit dark-pixel budgets and frame timing while focused batch tests prove
  center cells stay opaque and edge cells fade toward the underlay.

## Verification

Commands:

```bash
node tests/surface-tile-webgl.test.js
npm run golden:update
npm run test:visual
npm test
npm run build
git diff --check
```

Observed golden refresh:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":true,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":true,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":true,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":true,"diff":0,"darkPixels":0.0038,"band":"local"},{"name":"hud-visible","updated":true,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":13.103,"peakFrameMs":22}
```
