# AZR-364 Civilization Footprints Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: local/region civilization pressure could read as generic
  dots or route strokes instead of a map-scale built environment.
- Representation/lifecycle boundary changed: settlement and route pressure now
  selects bounded terrain-atlas footprint families. Authoritative settlement
  simulation state is unchanged; the family is a watcher-facing facade.
- Chunk, batch, or aggregate boundary: ready surface chunk cells keep using the
  existing WebGL2 terrain atlas batch. No new draw-call family is introduced.
- Readiness state required: only ready `cellCache` samples with current
  aggregate settlement/route pressure select civilization footprint cells.
- Player-perception contract preserved: terrain remains dominant, while closer
  zooms can read farms, yards, blocks, roads, canals, docks, production blocks,
  and borders as small top-down map marks.
- New constraint or encoding limit: civilization terrain keys are bounded to
  buckets `1..3` and settlement families `farm|yard|block|dock|production`,
  route families `track|road|canal|dock`, and border family `border`.
- Metric proving the bottleneck moved: focused atlas tests verify distinct
  family keys and changed footprint pixels without changing the WebGL2 batch
  path.

## Verification

Commands:

```bash
node tests/terrain-civilization-atlas.test.js
node tests/entity-atlas.test.js
node tests/surface-tile-webgl.test.js
npm run test:visual
npm test
```

Observed visual benchmark:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":false,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":false,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":false,"diff":0,"darkPixels":0.004,"band":"local"},{"name":"hud-visible","updated":false,"diff":0,"darkPixels":0.0096,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":13.277,"peakFrameMs":19.9}
```

Additional checks:

```bash
npm run build
git diff --check
rg -n "getContext\(['\"]2d|Canvas2D|Canvas 2D|drawTargetTo2d|copyBack|compatibilityCanvas|presentCompatibilityCanvas|\bctx\b|targetCtx" index.html js tests/terrain-civilization-atlas.test.js package.json
rg -n "agent-studio|tools/agent-studio" index.html js package.json tests/visual tests/terrain-civilization-atlas.test.js
```
