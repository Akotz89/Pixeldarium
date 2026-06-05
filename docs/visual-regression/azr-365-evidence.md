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
    `entityDraws=1`, `terrainLastFrameMs=5.6`.
  - settlement band: `terrainDraws=16384`, `terrainPageDraws=4`,
    `entityDraws=1`, `terrainLastFrameMs=6.7`.

Warnings were limited to a startup catch-up backlog message and Playwright
`readPixels` GPU-stall warnings caused by the capture harness.

## Optimization Gate

- Bottleneck targeted: incorrect close-zoom layer/evidence classification and
  stale screenshot proof.
- Representation/lifecycle boundary changed: zoom-band classification now uses
  normalized architecture zoom instead of raw camera stop indexes.
- Chunk, batch, or aggregate boundary: formal render layers stay the batch
  boundary; settlement evidence is derived from aggregate settlement and route
  state.
- Readiness state: screenshots consume only loaded WebGL frames with hidden
  loading UI and nonzero sampled pixels.
- Player-perception contract: each reachable camera stop maps to the intended
  orbit, continent, region, local, or settlement visual contract.
- New constraint or encoding limit: architecture zoom is clamped to the `1..20`
  perception scale derived from the configured camera anchors.
- Metric proving movement: pipeline stats now report reachable local and
  settlement bands, with WebGL terrain/entity draw counts and direct
  file-runtime interaction evidence.

## Current Visual Gap

The refreshed close-band screenshots prove the bands are reachable and no
longer use stale AZR-341 evidence, but they do not prove AZR-365 is complete.
Local and settlement captures still show obvious striping and coverage artifacts
in the current terrain chunk presentation. The art-quality pass remains open
until those artifacts are fixed and the map itself reads as rich simulation
terrain without relying on inspectors.
