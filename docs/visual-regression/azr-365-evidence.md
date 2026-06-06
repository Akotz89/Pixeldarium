# AZR-365 Visual Evidence

Date: 2026-06-05

Captured from direct `file://` runtime:

```text
file:///mnt/c/Users/Aaron/Azyrra/projects/pixeldarium/index.html
```

Updated screenshots:

- `azr-365-orbit.png`: runtime zoom `0`, architecture zoom `1`, band `orbit`.
- `azr-365-continent.png`: runtime zoom `2`, architecture zoom `6.43`, band `continent`.
- `azr-365-region.png`: runtime zoom `4`, architecture zoom `11.86`, band `region`.
- `azr-365-local.png`: runtime zoom `5.5`, architecture zoom `15.93`, band `local`.
- `azr-365-settlement-local.png`: runtime zoom `7`, architecture zoom `20`, band `settlement`.

The settlement/route/border captures use deterministic seeded aggregate facade
state inside the browser session only. Runtime files are unchanged by that
state. The seeded state exercises `world.settlements` and
`world.settlementRoutes`, so the evidence covers watcher-facing facades derived
from aggregate civilization state.

## Verification Evidence

- WebGL2 loaded from the static file entrypoint.
- Loading screen was hidden before capture.
- Debug output was empty after capture.
- Hard console/runtime errors: none.
- WebGL pixel samples: `5/5` nonzero on every captured zoom band.
- Camera interaction: wheel changed zoom `7 -> 6.75`; drag changed latitude and
  longitude.
- Latest measured close-band frame metrics from the capture harness:
  - local band: `terrainDraws=12160`, `terrainPageDraws=3`,
    `entityDraws=1`, `terrainLastFrameMs=6.1`.
  - settlement band: `terrainDraws=16384`, `terrainPageDraws=4`,
    `entityDraws=1`, `terrainLastFrameMs=6.5`.
- Direct `file://` scalar stats probe after facade metric aggregation:
  `renderer=webgl2`, `zoomBand=settlement`, `terrainDraws=5888`,
  `entityDraws=2`, `settlementEntityDraws=1`, `influenceEntityDraws=1`,
  `routeEntityDraws=0`, `gpuFrameMs=6.6`, `lastError=""`.
- Direct `file://` scalar stats probe after close-footprint route clipping:
  `renderer=webgl2`, `zoomBand=settlement`, `terrainDraws=5888`,
  `entityDraws=37`, `settlementEntityDraws=1`, `routeEntityDraws=35`,
  `influenceEntityDraws=1`, `gpuFrameMs=6.5`, `lastError=""`.
- Close desert material cells now vary across high surface sample Y coordinates
  instead of collapsing to RANMAP's clamped final tile row.

Warnings were limited to a startup catch-up backlog message and Playwright
`readPixels` GPU-stall warnings caused by the capture harness.

## Optimization Gate

- Bottleneck targeted: incorrect close-zoom layer/evidence classification,
  stale screenshot proof, and close-band desert atlas striping from clamped
  terrain variation.
- Representation/lifecycle boundary changed: zoom-band classification now uses
  normalized architecture zoom instead of raw camera stop indexes; terrain
  material variants now use unbounded deterministic surface-coordinate hashing
  instead of bounded tile-grid RANMAP lookup; close route facades now use
  uncropped local endpoint projection clipped to the active canvas footprint.
- Chunk, batch, or aggregate boundary: formal render layers stay the batch
  boundary; WebGL terrain atlas instances stay chunk/page batched; entity atlas
  facade metrics now aggregate across settlement, influence, route, organism,
  and food draw batches; settlement evidence is derived from aggregate
  settlement and route state.
- Readiness state: screenshots consume only loaded WebGL frames with hidden
  loading UI and nonzero sampled pixels.
- Player-perception contract: each reachable camera stop maps to the intended
  orbit, continent, region, local, or settlement visual contract; close desert
  terrain should read as granular material, not full-height repeated columns.
- New constraint or encoding limit: architecture zoom is clamped to the `1..20`
  perception scale derived from the configured camera anchors; terrain variant
  hashing is deterministic but no longer uses bounded RANMAP tile coordinates.
- Metric proving movement: pipeline stats now report reachable local and
  settlement bands, with WebGL terrain/entity draw counts, semantic facade draw
  counters, direct file-runtime interaction evidence, and high-coordinate
  terrain variant regression coverage.

## Current Visual Gap

The refreshed close-band screenshots prove the bands are reachable and no
longer use stale AZR-341 evidence. The latest pass removes positional terrain
jitter cracks and fixes the worst high-coordinate desert variant collapse, but
it does not prove AZR-365 is complete. Local desert views still need richer
biome variety, settlement/route visibility in organic simulation state, and
more authored material families before the placeholder/debug-map feel is gone.
