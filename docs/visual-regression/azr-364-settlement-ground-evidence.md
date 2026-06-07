# AZR-364 Settlement Ground Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: the visual regression suite did not prove the
  settlement/ground zoom band rendered building-scale settlement and route
  facades, so regressions could pass while broader zoom bands stayed green.
- Representation/lifecycle boundary changed: WebGL settlement and route
  facades now use a bounded local/ground readability scale, and visual QA seeds
  a deterministic settlement fixture before consuming the screenshot. Aggregate
  settlement state remains authoritative.
- Chunk, batch, or aggregate boundary: the existing WebGL2 entity instance
  batch remains the runtime draw boundary; the visual fixture consumes one
  Playwright `file://` viewport case.
- Readiness state required: the page must load from `file://`, WebGL2 renderer
  state must be initialized, synthetic settlement indexes must be rebuilt, and
  a completed `drawWorld()` frame must report nonzero settlement and route draw
  counts before the screenshot is accepted.
- Player-perception contract preserved: ground zoom shows readable settlement
  structures and routes over filled terrain with no black-frame gap and keeps
  direct wheel and drag camera interaction.
- New constraint or encoding limit: settlement facade scale is capped by zoom
  band only: `1.85x` at settlement band, `1.2x` at local band, and unchanged at
  wider bands. The visual fixture uses bounded synthetic IDs and does not alter
  save data.
- Metric proving the bottleneck moved: `settlement-ground` now has a golden
  screenshot and asserts nonzero WebGL settlement and route draw counts, while
  dark-pixel coverage and frame time remain under visual budgets.

## Verification

Commands:

```bash
npm run golden:update
npm run test:visual
node tests/entity-webgl.test.js
node tests/render-layer-order.test.js
node tests/no-canvas2d-source.test.js
node tests/no-canvas2d-runtime.test.js
npm test
npm run build
bash .codex/setup.sh
git diff --check
rg -n "agent-studio|tools/agent-studio" index.html js
rg -n "getContext\(['\"]2d|CanvasRenderingContext2D|canvas2d|Canvas2D|drawImage\(" index.html js config.js
```

Observed golden refresh:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":true,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":true,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":true,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":true,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":true,"diff":0,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":true,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":true,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":12.794,"peakFrameMs":22.5}
```

Observed visual regression check:

```text
visual screenshot checks passed {"results":[{"name":"orbit-view","updated":false,"diff":0,"darkPixels":0.6148,"band":"orbit"},{"name":"continent-view","updated":false,"diff":0,"darkPixels":0,"band":"continent"},{"name":"region-view","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"local-view","updated":false,"diff":0,"darkPixels":0,"band":"local"},{"name":"surface-temperate","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"surface-desert","updated":false,"diff":0,"darkPixels":0,"band":"region"},{"name":"entities-visible","updated":false,"diff":0,"darkPixels":0.0038,"band":"local"},{"name":"settlement-ground","updated":false,"diff":0,"darkPixels":0.0444,"band":"settlement"},{"name":"hud-visible","updated":false,"diff":0,"darkPixels":0.0068,"band":"continent"}],"interaction":{"zoomBefore":2,"zoomAfter":2.25,"moved":true},"averageFrameMs":12.406,"peakFrameMs":18.6}
```

All targeted render checks, full `npm test`, `npm run build`, `.codex/setup.sh`,
and both runtime boundary sweeps passed. The `rg` boundary sweeps returned no
matches.
