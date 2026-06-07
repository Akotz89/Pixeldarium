# AZR-364 Settlement World UI Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: the settlement/ground visual gate did not prove the
  UI-world detail portion of the ground-band contract, so close settlement
  captures could show facades and particles without readable world-space status
  feedback.
- Representation/lifecycle boundary changed: settlement world UI is represented
  as bounded watcher-facing WebGL status badges derived from aggregate
  settlement population, food, development, and lineage state. These badges are
  not DOM overlays and do not create authoritative simulation state.
- Chunk, batch, or aggregate boundary: the existing WebGL2 entity atlas instance
  batch remains the draw boundary. Badges are capped per visible settlement and
  submitted through a settlement-band `UI_WORLD` layer.
- Readiness state required: the page must load from `file://`, WebGL2 renderer
  state must be initialized, settlement indexes must be rebuilt, and a completed
  `drawWorld()` frame must report nonzero `worldUiEntityDraws` before the
  screenshot is accepted.
- Player-perception contract preserved: settlement/ground zoom shows local
  settlement status without covering fixed screen UI, while structure, route,
  citizen, vegetation, shadow, particle, wheel zoom, and drag evidence remain
  intact.
- New constraint or encoding limit: world UI badges are capped at `3` per
  visible settlement and encode only bounded population, food, and development
  buckets `0..3` plus lineage bucket `1..16`.
- Metric proving the bottleneck moved: `settlement-ground` now asserts nonzero
  WebGL world UI, vegetation, citizen, shadow, settlement, route, and particle
  draw stats, while screenshot diff, dark-pixel budget, and frame timing remain
  within the visual gate.

## Verification

Commands:

```bash
node tests/entity-webgl.test.js
node tests/entity-atlas.test.js
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
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":true,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":true,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":true,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":true,"diff":0,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":true,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":true,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":12.382,"peakFrameMs":19.3}
```

Observed visual regression check:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":false,"diff":0.0029,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":false,"diff":0.0022,"darkPixels":0,"band":"region"},{"name":"local-view","updated":false,"diff":0.0022,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":false,"diff":0.0013,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":false,"diff":0.0018,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":false,"diff":0.0024,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":false,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":false,"diff":0.0032,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":12.447,"peakFrameMs":18.5}
```

Additional closeout results:

- `npm test`: passed.
- `npm run build`: passed.
- `bash .codex/setup.sh`: passed.
- `node tests/no-canvas2d-runtime.test.js`: passed.
- `rg -n "agent-studio|tools/agent-studio" index.html js`: no matches.
- `rg -n "getContext\(['\"]2d|CanvasRenderingContext2D|canvas2d|Canvas2D|drawImage\(" index.html js config.js`: no matches.
