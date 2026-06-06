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
- `azr-365-ecology-local.png`: direct `file://` local active ecology material
  smoke at runtime zoom `7`, now with bounded ecology microstructure variants.

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
- Direct `file://` active ecology terrain probe after adding bucket-backed
  local surface ecology encoding: `terrainDraws=5888`, `terrainPageDraws=2`,
  `entityDraws=1`, `gpuFrameMs=39.3`, `lastError=""`; ecology stats reported
  `cacheEntries=1`, `activeCells=1`, `foodPressureCells=1`,
  `organismPressureCells=1`; generated atlas keys included
  `terrain.water_deep.3.plain.organic.1.nutrient.2`; atlas page bytes stayed
  `262144`.
- Direct `file://` active ecology microstructure probe after adding bounded
  sub-tile phases: settlement-band view at zoom `7`, no page errors or failed
  requests, `singleVisibleCanvas=true`, `terrainDraws=16384`,
  `terrainPageDraws=4`, `activeCells=1`, `foodPressureCells=1`,
  `organismPressureCells=1`, atlas keys included
  `terrain.water_deep.3.plain.organic.1.nutrient.2.ecoform.1`, the active
  ecology atlas cell had `8` unique colors, `ecoformCount=10` among sampled
  active ecology atlas cells, and atlas page bytes stayed `262144`. The same
  smoke confirmed wheel zoom `7 -> 6.75` and drag changed latitude/longitude.
  The headless capture frame reported `gpuFrameMs=108.8`, so this slice is
  treated as a visual-density movement, not a proven frame-time improvement.
- Direct `file://` close-band working-set probe after adding the local/settlement
  visible chunk cap: settlement-band view at zoom `7`, no page errors or failed
  requests, `visibleLimit=192`, `lastVisibleCandidateChunks=902`,
  `lastVisibleChunks=192`, `lastCulledChunks=710`, `terrainDraws=12288`,
  `terrainPageDraws=3`, `gpuFrameMs=85.7`, `lastError=""`, and wheel/drag
  changed the camera. This moves the prior close-band headless evidence from
  `terrainDraws=16384`, `terrainPageDraws=4`, `gpuFrameMs=108.8` while still
  leaving the frame over budget.
- Direct `file://` terrain upload-segment probe after raising
  `PLANET_SURFACE_TILE_WEBGL_MAX_INSTANCES` to `8192`: the same close-band
  smoke reported `visibleLimit=192`, `terrainDraws=12288`,
  `terrainPageDraws=2`, `drawCalls=67`, `gpuFrameMs=82.8`, `lastError=""`, no
  page errors or failed requests, and working wheel/drag. This moves the prior
  capped-working-set evidence from `terrainPageDraws=3`, `drawCalls=102`,
  `gpuFrameMs=85.7` while still leaving the frame over budget.
- Direct `file://` typed terrain page-builder probe after replacing boxed atlas
  page arrays and scalar upload copies with pooled growable `Float32Array` page
  buffers: the same close-band smoke reported `visibleLimit=192`,
  `lastVisibleChunks=192`, `lastCulledChunks=710`, `terrainDraws=12288`,
  `terrainPageDraws=2`, `drawCalls=106`, `gpuFrameMs=82.1`, `lastError=""`, no
  page errors or failed requests, `pageBufferCount=1`, and
  `singleVisibleCanvas=true`. The fresh pre-change baseline in the same harness
  was `terrainDraws=12288`,
  `terrainPageDraws=2`, `drawCalls=92`, `gpuFrameMs=87.1`; a rejected
  page-finalization-only attempt measured `gpuFrameMs=148.8`, so the committed
  representation keeps typed page building at append time instead of converting
  boxed pages immediately before upload. A direct interaction smoke from zoom
  `6` confirmed wheel zoom `6 -> 6.25`, drag changed latitude/longitude, no
  page errors or failed requests, and `debugText=""`, while still reporting
  over-budget close-band frames.
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
  becomes watcher-facing intent atlas facades instead of inspector-only data;
  local active organism/food pressure now becomes terrain-facing ecology
  material encoding instead of relying only on entity overlays; active ecology
  terrain atlas cells now add bounded sub-tile microstructure phases to reduce
  the single repeated material language at close zoom; local/settlement terrain
  now uses a bounded ready-chunk working set instead of submitting every visible
  candidate chunk; terrain upload segmentation now batches more ready instances
  per WebGL submission; terrain atlas upload pages now use typed buffers instead
  of boxed JS arrays at the submission lifecycle boundary.
- Chunk, batch, or aggregate boundary: formal render layers stay the batch
  boundary; WebGL terrain atlas instances stay chunk/page batched; entity atlas
  facade metrics now aggregate across settlement, influence, route, organism,
  intent, and food draw batches; settlement evidence is derived from aggregate
  settlement and route state; representative intent rendering is capped to the
  watched representative set; local ecology material encoding uses the render
  chunk/sample cell as the terrain boundary and bucket-backed organism/food
  radius queries as the aggregate boundary; close-band terrain submission uses
  the prioritized visible chunk list as its working-set boundary and the
  terrain instance upload segment as its GPU submission boundary; terrain atlas
  upload pages now use typed page buffers as the atlas-page batch boundary.
- Readiness state: screenshots consume only loaded WebGL frames with hidden
  loading UI and nonzero sampled pixels; representative intent cells are
  consumed only after atlas generation/versioning and a selected, pinned, or
  bookmarked representative record are ready; active ecology material cells are
  consumed from current ready chunk samples after the ecology facade derives
  bounded pressure from current organism/food buckets.
- Player-perception contract: each reachable camera stop maps to the intended
  orbit, continent, region, local, or settlement visual contract; close desert
  terrain should read as granular material, not full-height repeated columns;
  local watched organisms expose behavior/target cues on the map without
  making every organism brain a rendered authoritative object; local ecology
  pressure should be readable in the terrain itself when entity overlays are
  visually subtle or temporarily overwritten by surface streaming; close-band
  center-footprint detail should remain readable while lower-priority edge
  chunks are deferred to keep zoom/pan smoother.
- New constraint or encoding limit: architecture zoom is clamped to the `1..20`
  perception scale derived from the configured camera anchors; terrain variant
  hashing is deterministic but no longer uses bounded RANMAP tile coordinates;
  terrain biology encoding is limited to `bio0`, `microbial.0..3`, and
  `organic.0..3` atlas key suffixes; terrain resource encoding is limited to
  `mineral.0..3` and `nutrient.0..3` optional suffixes; representative intent
  encoding is limited to behavior buckets `0..4`, target buckets `0..3`, watch
  buckets `0..3`, lineage buckets `1..16`, and `128` watched markers per frame;
  terrain ecology encoding is enabled at zoom `>=4`, samples a `16` tile radius,
  and maps food/organism pressure into existing `organic.0..3` and
  `nutrient.0..3` terrain atlas suffixes; active ecology microstructure adds
  only `ecoform.0..3` bounded atlas phases; local/settlement ready terrain
  chunks are capped at `192` per frame; terrain upload segments are capped at
  `8192` instances; terrain atlas page buffers use the existing 10-float
  instance encoding and allocate transient typed capacity per atlas page.
- Metric proving movement: pipeline stats now report reachable local and
  settlement bands, with WebGL terrain/entity draw counts, semantic facade draw
  counters, direct file-runtime interaction evidence, biological terrain atlas
  identity/pixel evidence, resource terrain atlas identity/pixel evidence,
  representative intent draw evidence, active ecology terrain atlas evidence,
  active ecology microstructure unique-color and `ecoform` key evidence, and
  close-band terrain draw reduction, upload-segment evidence, typed page-builder
  terrain frame evidence, and high-coordinate terrain variant regression
  coverage.

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
local ecological cues more legible in ordinary captures. The active ecology
material pass makes those cues visible in the terrain, but the current local
capture can still become broad at single-tile zoom. This pass adds bounded
sub-tile ecological structure and reduces single-cell repetition, but the
current screenshot still needs stronger authored biome/feature contrast,
settlement/route visibility in organic simulation state, and broader material
families before the placeholder/debug-map feel is gone. The close-band working
set and typed terrain page builder now move submission metrics, but headless
evidence still reports over-budget frames, so further batching/data-texture work
remains necessary.
