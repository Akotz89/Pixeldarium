# AZR-364 Settlement Citizen Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: the settlement/ground visual gate did not prove the
  citizen portion of the ground-band contract, so settlements could remain
  static building markers even when structures, routes, particles, and shadows
  rendered correctly.
- Representation/lifecycle boundary changed: citizens are represented as
  bounded watcher-facing facades derived from aggregate settlement population.
  They are not authoritative simulation agents and do not replace settlement
  population state.
- Chunk, batch, or aggregate boundary: the existing WebGL2 entity atlas instance
  batch remains the draw boundary. Citizen facades are capped per visible
  settlement and submitted through `ENTITY_SORTED`.
- Readiness state required: the page must load from `file://`, WebGL2 renderer
  state must be initialized, settlement indexes must be rebuilt, and a completed
  `drawWorld()` frame must report nonzero `citizenEntityDraws` before the
  screenshot is accepted.
- Player-perception contract preserved: settlement/ground zoom shows visible
  life/activity around settlement cores while structure, route, shadow,
  particle, wheel zoom, and drag evidence remain intact.
- New constraint or encoding limit: citizen facades are capped at `12` per
  visible settlement and are sampled from settlement population/level rather
  than full individual citizen simulation.
- Metric proving the bottleneck moved: `settlement-ground` now asserts nonzero
  WebGL citizen, shadow, settlement, route, and particle draw stats, while
  screenshot diff, dark-pixel budget, and frame time remain within the visual
  gate.

## Verification

Commands:

```bash
npm run golden:update
node tests/entity-webgl.test.js
node tests/renderer-interface.test.js
node tests/render-layer-order.test.js
node tests/no-canvas2d-source.test.js
npm run test:visual
npm test
npm run build
bash .codex/setup.sh
node tests/no-canvas2d-runtime.test.js
rg -n "agent-studio|tools/agent-studio" index.html js
rg -n "getContext\(['\"]2d|CanvasRenderingContext2D|canvas2d|Canvas2D|drawImage\(" index.html js config.js
git diff --check
```

Observed golden refresh:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":true,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":true,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":true,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":true,"diff":0,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":true,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":true,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":12.289,"peakFrameMs":18.4}
```

Observed visual regression check:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":false,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":false,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":false,"diff":0,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":false,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":false,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":12.447,"peakFrameMs":20.3}
```

Additional closeout results:

- `npm test`: passed.
- `npm run build`: passed.
- `bash .codex/setup.sh`: passed.
- `node tests/no-canvas2d-runtime.test.js`: passed.
- `rg -n "agent-studio|tools/agent-studio" index.html js`: no matches.
- `rg -n "getContext\(['\"]2d|CanvasRenderingContext2D|canvas2d|Canvas2D|drawImage\(" index.html js config.js`: no matches.
- `git diff --check`: passed.
