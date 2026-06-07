# AZR-364 Settlement Particle Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: the settlement/ground visual gate did not prove the
  particle portion of the ground-band contract, so settlement activity could
  remain static while structures and routes rendered correctly.
- Representation/lifecycle boundary changed: settlement activity is represented
  as a bounded watcher-facing particle burst over aggregate settlement state.
  Settlement population, route, and growth authority are unchanged.
- Chunk, batch, or aggregate boundary: the existing typed-array particle pool
  and one WebGL2 instanced particle draw remain the runtime batch boundary; the
  visual suite consumes one direct `file://` Playwright viewport case.
- Readiness state required: particle definitions must be loaded and marked
  ready, the settlement fixture must seed ready aggregate settlement indexes,
  and a completed `drawWorld()` frame must report visible particles and a
  particle draw before the screenshot is accepted.
- Player-perception contract preserved: settlement/ground zoom now shows active
  colored settlement activity over filled terrain, while wheel zoom and drag
  movement still work and no Canvas2D fallback is introduced.
- New constraint or encoding limit: `settlement_activity` uses a bounded burst
  of `24` particles with authored size range `4..7`, lifetime `1.4`, and
  existing `PARTICLE_MAX_ACTIVE = 10000` pool capacity.
- Metric proving the bottleneck moved: `settlement-ground` now asserts ready
  particle definitions, nonzero visible particle count, and nonzero WebGL
  particle draw count, while screenshot diff, dark-pixel budget, and frame time
  remain within the visual gate.

## Verification

Commands:

```bash
npm run golden:update
npm run test:visual
node tests/particles.test.js
node tests/asset-manifest.test.js
node tests/asset-loader.test.js
node tests/no-canvas2d-source.test.js
git diff --check
```

Observed golden refresh:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":true,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":true,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":true,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":true,"diff":0,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":true,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":true,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":12.613,"peakFrameMs":18.2}
```

Observed visual regression check:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":false,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":false,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":false,"diff":0,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":false,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":false,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":12.429,"peakFrameMs":19.8}
```
