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
- `azr-365-readiness-local.png`: direct `file://` local seeded aggregate
  lineage readiness facade smoke at runtime zoom `6`.

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
- Direct `file://` settlement-readiness facade probe after adding bounded
  pre-settlement lineage markers: browser-only seeded aggregate lineage state
  used `activeCount=9`, `peakPopulation=16`, `settlementCount=0`, and produced
  one candidate with `progress=0.9`, `progressBucket=3`. The WebGL readiness
  batch reported `count=1`, `readiness=1`, `culled=0`, `drew=true`,
  `readinessDrawCount=2`, `frameInstanceDrawCount=11`, `lastError=""`, atlas
  key `entity.settlement_readiness.1.3`, `debugText=""`, no page errors, and no
  failed requests. A direct `file://` atlas pressure probe also exposed the
  need for multiple packed atlas pages; the atlas now allocates additional
  256x256 RGBA pages instead of throwing when visual-density cells exceed one
  page.
- Direct `file://` settlement-readiness contrast probe after neutralizing the
  instance tint for authored-color readiness atlas cells: the same seeded
  aggregate lineage marker reported `drew=true`, `readinessDrawCount=2`,
  `frameInstanceDrawCount=11`, `lastError=""`, no page errors, and no failed
  requests. Pixel sampling around the marker moved from the previous dark
  double-tinted samples such as `[3,6,9,255]` to a visible warm marker sample of
  `[206,173,85,255]`.
- Direct `file://` food/resource atlas-family probe after adding bounded
  resource-family keys and JSON sidecars for the accepted runtime sheet
  metadata: no page errors, no failed requests, and empty debug output. Explicit
  runtime resource examples produced `entity.food.0.3.1` grain pixels
  `[232,204,118,255]`, `entity.food.0.3.2` fruit pixels `[244,166,104,255]`,
  and `entity.food.0.3.3` ore pixels `[212,190,132,255]`. Ordinary generated
  food nodes also produced deterministic family variety such as
  `entity.food.0.0.1`, `entity.food.1.0.0`, and `entity.food.2.0.2`. A follow-up
  direct interaction smoke loaded `16` runtime sheets, kept `debugText=""`,
  changed zoom `0 -> 0.25`, and changed latitude/longitude through drag.
- Direct `file://` terrain feature-mark probe after adding bounded terrain
  feature keys inside generated atlas cells: no page errors, no failed
  requests, and `debugText=""`. Browser atlas cells included
  `terrain.forest_floor.3.plain.feature.canopy.3.organic.2` with `5` unique
  colors, `terrain.water_shallow.3.plain.feature.foam.3.bio0` with `5` unique
  colors, `terrain.rock_cliff.0.plain.feature.ridge.3.bio0` with `5` unique
  colors, `terrain.sand_dune.1.plain.feature.scrub.1.bio0` with `6` unique
  colors, and explicit no-feature fallback
  `terrain.unknown.0.plain.feature0.bio0`. A direct interaction smoke in the
  same `file://` runtime changed zoom `0 -> 0.25`, changed latitude/longitude,
  reported no page errors or failed requests, and kept `debugText=""`.
- Direct `file://` civilization terrain-footprint probe after mapping aggregate
  settlement/route pressure into bounded terrain atlas keys: no page errors, no
  failed requests, and `debugText=""`. Seeded aggregate state used `2`
  settlements and `1` active route; `PS.render.surface.getCivilizationStats()`
  reported `cacheEntries=2`, `activeCells=2`, `settlementCells=1`, and
  `routeCells=1`. Browser atlas cells included
  `terrain.grass_dry.1.plain.feature.field.1.bio0.civ.settlement.3`,
  `terrain.grass_dry.0.plain.feature.field.1.bio0.civ.route.3`,
  `terrain.grass_dry.3.plain.feature.field.1.bio0.civ.border.2`, and ordinary
  fallback `terrain.grass_dry.0.plain.feature.field.1.bio0.civ0`; each sampled
  cell reported `6` unique colors. A direct interaction smoke changed
  latitude/longitude at zoom `7`, reported no page errors or failed requests,
  and kept `debugText=""`.
- Direct `file://` authored terrain material-family probe after registering
  bounded river, tidal, lava, lichen, and reed material IDs: no page errors, no
  failed requests, `debugText=""`, `renderer=webgl2`, and
  `singleVisibleCanvas=true`. Runtime tile registry exposed
  `river_shallow`, `tidal_mud`, `lava_flow`, `lichen_tundra`, and `reed_mat`.
  Browser atlas cells included
  `terrain.river_shallow.0.plain.feature.foam.3.bio0.civ0`,
  `terrain.tidal_mud.1.plain.feature.foam.3.bio0.civ0`,
  `terrain.lava_flow.2.plain.feature.ember.3.bio0.civ0`,
  `terrain.lichen_tundra.2.plain.feature.frost.1.bio0.civ0`, and
  `terrain.reed_mat.3.plain.feature.reed.3.bio0.civ0`, with `5..6` unique
  colors per cell. Center samples were river `[36,107,133,255]`, tidal
  `[50,37,8,255]`, lava `[182,111,90,255]`, lichen `[159,176,142,255]`, and
  reed `[177,200,124,255]`. A direct interaction smoke changed zoom
  `0 -> 0.25`, changed latitude/longitude, and kept atlas page bytes at
  `262144`.
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
  of boxed JS arrays at the submission lifecycle boundary; pre-settlement
  lineage pressure now becomes capped watcher-facing readiness facades instead
  of remaining inspector/history-only aggregate state; readiness facade atlas
  cells now own their authored color and use neutral instance tint instead of
  multiplying the lineage palette twice; food/resource entity cells now use a
  bounded resource-family atlas identity instead of collapsing visible resources
  into one green-pod marker family; accepted runtime sheet metadata now ships
  `file://` JSON sidecars instead of being consumed only by fetch-capable
  contexts; terrain cells now include bounded feature-mark atlas identities
  instead of relying only on broad material pattern families; aggregate
  settlement, route, and border pressure now becomes bounded terrain atlas
  identity/pixels instead of relying only on separate overlay markers; the
  packed atlas now grows by page instead of treating the first 256x256 page as a
  hard visual density ceiling.
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
  upload pages now use typed page buffers as the atlas-page batch boundary;
  terrain feature marks use the existing 16x16 terrain atlas cell and WebGL
  atlas-page batch boundary; authored river, tidal, lava, lichen, and reed
  materials use registered tile IDs selected from ready sample material signals
  before feature/biology/resource/civilization suffixes; civilization terrain
  footprints use the ready
  render sample/chunk cell and existing WebGL terrain atlas page batch;
  food/resource entity facades use the existing entity atlas page batch and
  food-node aggregate/index surfaces; settlement readiness uses aggregate
  lineage records plus the current
  representative-organism center as its facade boundary, with at most `6`
  readiness markers.
- Readiness state: screenshots consume only loaded WebGL frames with hidden
  loading UI and nonzero sampled pixels; representative intent cells are
  consumed only after atlas generation/versioning and a selected, pinned, or
  bookmarked representative record are ready; active ecology material cells are
  consumed from current ready chunk samples after the ecology facade derives
  bounded pressure from current organism/food buckets; settlement readiness
  markers consume only current non-extinct lineage counts plus current
  representative positions and stop once real settlement aggregates exist;
  civilization terrain footprint cells consume only current ready samples plus
  current aggregate settlement/route indexes, and cached cells are regenerated
  only when the bounded civilization key changes;
  runtime-owned sheet metadata is considered ready for direct `file://` only
  when its JSON sidecar has registered the metadata before manifest sheet load
  consumes it.
- Player-perception contract: each reachable camera stop maps to the intended
  orbit, continent, region, local, or settlement visual contract; close desert
  terrain should read as granular material, not full-height repeated columns;
  local watched organisms expose behavior/target cues on the map without
  making every organism brain a rendered authoritative object; local ecology
  pressure should be readable in the terrain itself when entity overlays are
  visually subtle or temporarily overwritten by surface streaming; close-band
  center-footprint detail should remain readable while lower-priority edge
  chunks are deferred to keep zoom/pan smoother; near-founding lineage pressure
  should be visible as a map signal without creating a settlement early;
  settlement footprints, routebeds, and borders should be legible from the map
  surface itself without making every citizen, building, or road tile an
  authoritative rendered object;
  resource and food nodes should communicate storage, produce, and raw-material
  identity on the map instead of relying on inspector text or a single generic
  dot.
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
  instance encoding and allocate transient typed capacity per atlas page;
  terrain feature marks are limited to `feature0` or
  `feature.<type>.<bucket>` with feature types
  `foam|canopy|ridge|scrub|frost|ember|reed|field` and buckets `1..3`;
  authored terrain material families added by this pass are limited to five
  finite registered IDs: `river_shallow`, `tidal_mud`, `lava_flow`,
  `lichen_tundra`, and `reed_mat`;
  civilization terrain footprints are limited to `civ0` or
  `civ.<settlement|route|border>.<1..3>` and are enabled at zoom `>=4` with a
  route radius of `3` tiles;
  food/resource entity cells are limited to richness buckets `0..3` and family
  buckets `0..3`; runtime-owned visual sheet metadata requires matching
  `.json.js` sidecars for the direct static runtime;
  settlement readiness markers are capped at `6`, use progress buckets `0..3`,
  use neutral `#ffffff` sprite tint so authored atlas color is not double
  tinted, and packed atlas pages grow in 256x256 RGBA increments.
- Metric proving movement: pipeline stats now report reachable local and
  settlement bands, with WebGL terrain/entity draw counts, semantic facade draw
  counters, direct file-runtime interaction evidence, biological terrain atlas
  identity/pixel evidence, resource terrain atlas identity/pixel evidence,
  representative intent draw evidence, active ecology terrain atlas evidence,
  active ecology microstructure unique-color and `ecoform` key evidence, and
  close-band terrain draw reduction, upload-segment evidence, typed page-builder
  terrain frame evidence, settlement-readiness facade draw evidence, atlas
  multi-page allocation coverage, settlement-readiness contrast pixel evidence
  from `[3,6,9,255]` to `[206,173,85,255]`, food/resource family atlas identity
  and pixel evidence, direct-file sidecar-load evidence with zero failed
  requests, terrain feature-mark identity/unique-color evidence, civilization
  terrain-footprint identity/cache/pixel evidence, authored material-family
  registry/identity/pixel evidence, and high-coordinate terrain variant
  regression coverage.

## Current Visual Gap

The refreshed close-band screenshots prove the bands are reachable and no
longer use stale AZR-341 evidence. The latest pass removes positional terrain
jitter cracks and fixes the worst high-coordinate desert variant collapse, but
it does not prove AZR-365 is complete. Local desert views still need richer
biome variety and broader authored material families before the
placeholder/debug-map feel is gone. The representative intent slice proves
selected local behavior/target
state now reaches the WebGL entity path, but the latest intent screenshot still
reads mostly as terrain at full-frame scale, so the next visual pass should make
local ecological cues more legible in ordinary captures. The active ecology
material pass makes those cues visible in the terrain, but the current local
capture can still become broad at single-tile zoom. This pass adds bounded
sub-tile ecological structure and reduces single-cell repetition, but the
current screenshot still needs stronger authored biome/feature contrast and
broader material families before the placeholder/debug-map feel is gone. The
authored material-family pass adds registered river, tidal, lava, lichen, and
reed cells, but it does not finish the complete art pass for every biome or all
entity families. The close-band working
set and typed terrain page builder now move submission metrics, but headless
evidence still reports over-budget frames, so further batching/data-texture work
remains necessary. The settlement-readiness facade starts making civilization
pressure visible before real settlements exist, and the civilization terrain
footprint pass starts moving settlement/route/border readability into the map
surface itself. It is still a first readability pass rather than the final
settlement/route visual language.
