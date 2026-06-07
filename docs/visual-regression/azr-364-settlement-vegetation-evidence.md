# AZR-364 Settlement Vegetation Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: the settlement/ground visual gate did not prove the
  vegetation portion of the ground-band contract, so close settlement captures
  could show structures, routes, shadows, citizens, and particles without
  readable surrounding living ground detail.
- Representation/lifecycle boundary changed: settlement vegetation is
  represented as bounded watcher-facing facades derived from aggregate
  settlement food, claimed-food, and development state. These markers are not
  authoritative resource simulation objects.
- Chunk, batch, or aggregate boundary: the existing WebGL2 entity atlas instance
  batch remains the draw boundary. Vegetation facades are capped per visible
  settlement and submitted through the settlement-band render layer.
- Readiness state required: the page must load from `file://`, WebGL2 renderer
  state must be initialized, settlement indexes must be rebuilt, and a completed
  `drawWorld()` frame must report nonzero `vegetationEntityDraws` before the
  screenshot is accepted.
- Player-perception contract preserved: settlement/ground zoom shows living
  ground detail around settlement cores while structure, route, citizen, shadow,
  particle, wheel zoom, and drag evidence remain intact.
- New constraint or encoding limit: vegetation facades are capped at `16` per
  visible settlement and reuse bounded resource atlas richness/family buckets
  instead of introducing unbounded settlement-local plant sprites.
- Metric proving the bottleneck moved: `settlement-ground` now asserts nonzero
  WebGL vegetation, citizen, shadow, settlement, route, and particle draw stats,
  while screenshot diff, dark-pixel budget, and frame timing remain within the
  visual gate.

## Verification

Commands:

```bash
node tests/entity-webgl.test.js
node tests/renderer-interface.test.js
node tests/render-layer-order.test.js
node tests/no-canvas2d-source.test.js
npm run golden:update
npm run test:visual
npm test
npm run build
bash .codex/setup.sh
node tests/no-canvas2d-runtime.test.js
rg -n "agent-studio|tools/agent-studio" index.html js
rg -n "getContext\(['\"]2d|CanvasRenderingContext2D|canvas2d|Canvas2D|drawImage\(" index.html js config.js
```

Observed golden refresh:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":true,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":true,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":true,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":true,"diff":0,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":true,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":true,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":12.526,"peakFrameMs":26.3}
```

Observed visual regression check:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":false,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":false,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":false,"diff":0,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":false,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":false,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":12.731,"peakFrameMs":21.2}
```

Additional closeout results:

- `npm test`: passed.
- `npm run build`: passed.
- `bash .codex/setup.sh`: passed.
- `node tests/no-canvas2d-runtime.test.js`: passed.
- `rg -n "agent-studio|tools/agent-studio" index.html js`: no matches.
- `rg -n "getContext\(['\"]2d|CanvasRenderingContext2D|canvas2d|Canvas2D|drawImage\(" index.html js config.js`: no matches.
