# AZR-364 Settlement Shadow Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: the settlement/ground visual gate did not prove the
  shadow portion of the ground-band contract, so buildings and activity could
  look ungrounded while structure, route, and particle checks passed.
- Representation/lifecycle boundary changed: settlement shadows are represented
  as bounded watcher-facing WebGL facades derived from aggregate settlement
  records. Settlement simulation, route authority, and physical lighting remain
  unchanged.
- Chunk, batch, or aggregate boundary: the existing WebGL2 entity atlas instance
  batch remains the draw boundary. Shadows are submitted through the dedicated
  `SHADOW` draw-order slot before settlement structures.
- Readiness state required: the page must load from `file://`, WebGL2 renderer
  state must be initialized, settlement indexes must be rebuilt, and a completed
  `drawWorld()` frame must report nonzero `shadowEntityDraws` before the
  screenshot is accepted.
- Player-perception contract preserved: settlement/ground zoom shows grounded
  building-scale facades over filled terrain while route, particle, wheel zoom,
  and drag evidence remain intact.
- New constraint or encoding limit: shadows are simple local/settlement facades
  offset from visible settlement sprites, not a full dynamic lighting model.
  They reuse settlement atlas cells tinted through the existing entity shader.
- Metric proving the bottleneck moved: `settlement-ground` now asserts nonzero
  WebGL shadow, settlement, route, and particle draw stats, while screenshot
  diff, dark-pixel budget, and frame time remain within the visual gate.

## Verification

Commands:

```bash
npm run golden:update
node tests/entity-webgl.test.js
node tests/renderer-interface.test.js
node tests/render-layer-order.test.js
node tests/no-canvas2d-source.test.js
npm run test:visual
git diff --check
```

Observed golden refresh:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":true,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":true,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":true,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":true,"diff":0,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":true,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":true,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":12.048,"peakFrameMs":20.3}
```

Observed visual regression check:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":false,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":false,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":false,"diff":0,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":false,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":false,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":11.73,"peakFrameMs":21.3}
```
