# AZR-365 Visual Evidence

Date: 2026-06-06

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
- `azr-365-intent-local.png`: direct `file://` seeded local representative
  intent smoke at runtime zoom `7`.

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
- Direct `file://` terrain atlas probe after biological material encoding:
  ordinary wetland cell `terrain.wetland.2.plain.bio0`, microbial mat cell
  `terrain.wetland.2.plain.microbial.3`; center pixels changed from
  `[161,174,80,255]` to `[41,104,62,255]`; atlas page bytes stayed `262144`.
- Direct `file://` terrain atlas probe after resource material encoding:
  ordinary rock cell `terrain.rock_cliff.2.plain.bio0`, mineral-vein cell
  `terrain.rock_cliff.2.plain.bio0.mineral.3`; center pixels changed from
  `[95,95,125,255]` to `[83,87,107,255]`; atlas page bytes stayed `262144`.
- Direct `file://` representative intent probe after wiring the
  `entities.presence` layer to WebGL atlas batches: wheel/drag changed the
  camera from zoom `0` to `0.25` and shifted latitude/longitude; seeded local
  selected representative rendered `entityDraws=2`, `intentEntityDraws=1`,
  `organismEntityDraws=1`, `terrainDraws=5888`, `entityLastFrameMs=0.10`,
  `lastError=""`, `entityLastError=""`, `atlasIntentCells=2`, and atlas page
  bytes stayed `262144`.
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
  uncropped local endpoint projection clipped to the active canvas footprint;
  biological surface pressure now becomes bounded terrain atlas variants for
  microbial/organic material cues; mineral and nutrient resource pressure now
  becomes bounded terrain atlas variants for resource patch readability;
  selected/pinned/bookmarked representative behavior and target state now
  becomes watcher-facing intent atlas facades instead of inspector-only data.
- Chunk, batch, or aggregate boundary: formal render layers stay the batch
  boundary; WebGL terrain atlas instances stay chunk/page batched; entity atlas
  facade metrics now aggregate across settlement, influence, route, organism,
  intent, and food draw batches; settlement evidence is derived from aggregate
  settlement and route state; representative intent rendering is capped to the
  watched representative set.
- Readiness state: screenshots consume only loaded WebGL frames with hidden
  loading UI and nonzero sampled pixels; representative intent cells are
  consumed only after atlas generation/versioning and a selected, pinned, or
  bookmarked representative record are ready.
- Player-perception contract: each reachable camera stop maps to the intended
  orbit, continent, region, local, or settlement visual contract; close desert
  terrain should read as granular material, not full-height repeated columns;
  local watched organisms expose behavior/target cues on the map without
  making every organism brain a rendered authoritative object.
- New constraint or encoding limit: architecture zoom is clamped to the `1..20`
  perception scale derived from the configured camera anchors; terrain variant
  hashing is deterministic but no longer uses bounded RANMAP tile coordinates;
  terrain biology encoding is limited to `bio0`, `microbial.0..3`, and
  `organic.0..3` atlas key suffixes; terrain resource encoding is limited to
  `mineral.0..3` and `nutrient.0..3` optional suffixes; representative intent
  encoding is limited to behavior buckets `0..4`, target buckets `0..3`, watch
  buckets `0..3`, lineage buckets `1..16`, and `128` watched markers per frame.
- Metric proving movement: pipeline stats now report reachable local and
  settlement bands, with WebGL terrain/entity draw counts, semantic facade draw
  counters, direct file-runtime interaction evidence, biological terrain atlas
  identity/pixel evidence, resource terrain atlas identity/pixel evidence,
  representative intent draw evidence, and high-coordinate terrain variant
  regression coverage.

## Current Visual Gap

The refreshed close-band screenshots prove the bands are reachable and no
longer use stale AZR-341 evidence. The latest pass removes positional terrain
jitter cracks and fixes the worst high-coordinate desert variant collapse, but
it does not prove AZR-365 is complete. Local desert views still need richer
biome variety, settlement/route visibility in organic simulation state, and
broader authored material families before the placeholder/debug-map feel is
gone. The representative intent slice proves selected local behavior/target
state now reaches the WebGL entity path, but the latest intent screenshot still
reads mostly as terrain at full-frame scale, so the next visual pass should make
local ecological cues more legible in ordinary captures.
