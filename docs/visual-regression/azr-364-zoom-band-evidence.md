# AZR-364 Zoom-Band Visual Evidence

Date: 2026-06-07

## Optimization Gate

- Bottleneck targeted: visual regression evidence only sampled orbit plus a
  small surface subset, so continent, region, local, and direct interaction
  regressions could pass unnoticed.
- Representation/lifecycle boundary changed: visual QA now treats zoom-band
  captures and direct `file://` camera interaction as first-class readiness
  evidence before accepting visual changes.
- Chunk, batch, or aggregate boundary: one Playwright run captures orbit,
  continent, region, local, entity-visible, and HUD views from the static
  runtime.
- Readiness state required: the page must load from `index.html`, initialize
  WebGL2, render without debug errors, classify into the expected zoom band,
  and then pass pixel and frame metrics.
- Player-perception contract preserved: the watcher must see filled terrain in
  non-orbit zoom bands and be able to wheel-zoom and drag the planet from the
  direct `file://` runtime.
- New constraint or encoding limit: non-orbit visual cases now enforce a
  `0.16` maximum dark-pixel ratio so black-frame gaps cannot become accepted
  baselines.
- Metric proving the bottleneck moved: visual output now reports per-case zoom
  bands, dark-pixel coverage, interaction zoom delta, and average/peak frame
  timing.

## Verification

Expected commands:

```bash
npm run golden:update
npm run test:visual
node tests/planet-zoom-anchor.test.js
node tests/globe-interaction.test.js
node tests/no-canvas2d-source.test.js
```
