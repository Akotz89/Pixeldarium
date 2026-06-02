# Phase 2 Readiness

Date: 2026-06-02

## Purpose

AZR-353 reconciles the current Pixeldarium repo with the Phase 2 Linear scope before broad biology, primordial, observation, or deep-time implementation starts.

This is also the gate for AZR-357. Food and organism runtime shards should not move blindly while Phase 2 is still deciding typed-array traits, representative organisms, microbial modeling, and watcher-facing biology outcomes.

AZR-361 records the chosen aggregate-population plus representative-organism model in `docs/biological-model-decision.md`.

## Current Code Evidence

Current repo state:

- `js/sim/food.js`, `js/sim/organisms.js`, `js/sim/evolution.js`, `js/sim/settlements.js`, and `js/sim/civilizations.js` are public `PS.sim.*` facades over existing runtime functions.
- `js/sim/food-runtime.js`, `js/sim/food-growth.js`, `js/sim/organisms-*`, `js/sim/settlements-*`, and `js/sim/civilizations-*` own food, representative organism, settlement, and civilization runtime. `js/main-*` modules own runtime reset, ecosystem summaries, simulation tick updates, and the frame loop. `index.html` no longer loads any `js/legacy/*` runtime shards.
- `js/layers/registry.js` exists. `js/layers/geology.js` and `js/layers/atmosphere.js` are registered as always-on layers; ocean and biosphere layers are not implemented yet.
- `js/epochs/registry.js` exists, but no epoch modules register primordial, microbial, biological, observer, or deep-time behavior.
- `js/systems/time.js` implements fixed-step accumulator plumbing, epoch-derived adaptive time scale, smooth time-scale transitions, deep-time units, and manual time-scale override.
- `js/render/overlays.js` has a registry plus current civilization/orbital overlays. `js/render/observation-overlays.js` adds Phase 2 temperature, population density, resource, and atmospheric-composition observation overlays with blend metadata, panel toggles, keyboard cycling, and frame-time sampling.
- `js/ui/spotlight.js` consumes watcher milestone events, shows an event spotlight panel, optionally slows time, and focuses the relevant tile or event location.
- `js/core/events.js` includes milestone payload normalization, a configurable milestone registry, event categories, milestone detection, visible event-log writes, durable timeline-event writes, notification routing, and optional spotlight focus routing.
- Tests currently cover pools, food indexing, spatial indexing, persistence parity, render/zoom, mobile layout, worker spike, accumulator behavior, AZR-295 adaptive time, AZR-296 milestone detection, AZR-297 event spotlight UI, AZR-362 watcher event contract, AZR-302 timeline viewer, AZR-299 observation overlays, the Phase 2 layer/epoch/event contract, AZR-290 geology, AZR-291 atmosphere chemistry, and AZR-350 representative organism lifecycle. They do not yet cover full food webs, microbial models, abiogenesis, or deep-time timeline UI.

## Linear Inventory

AZR-257 E3 Biological Simulation children:

| Issue | Status | Readiness classification | Evidence / gap |
| --- | --- | --- | --- |
| AZR-284 E3-S1 Expanded trait system | Backlog | Partial foundation, needs split | Current traits are vision/metabolism/reproduction/roam/habitat and have typed-array pool backing. Body-plan traits, camouflage, thermal tolerance, water dependency, species IDs, and migration tests are missing. |
| AZR-285 E3-S2 Continuous morphological rendering | Backlog | Missing | Entity sprites exist, but no `generateSprite(traitArray, entityId)` contract or trait-derived morphology cache exists. |
| AZR-286 E3-S3 Food web mechanics | Backlog | Missing | Food indexing and organism food seeking exist. Predator/prey, trophic levels, energy transfer, and food-web metrics are missing. |
| AZR-287 E3-S4 Terrain-driven evolution | Backlog | Partial foundation, needs watcher criteria | Terrain affinity and terrain mismatch costs exist. Biome-specific trait pressure, geographic isolation, and event outputs are missing. |
| AZR-288 E3-S5 Speciation events | Backlog | Partial foundation, needs split | Lineages and divergence scoring exist. `speciesId`, reproductive isolation, species events, and species-level UI are missing. |
| AZR-350 E3-S5 Representative organisms | Backlog | Runtime foundation implemented | `docs/biological-model-decision.md` chooses aggregate populations as authoritative and representative organisms as watchable facades. `js/sim/representatives.js` now creates aggregate population summaries, representative records, inspection/pin/bookmark support, pressure context, and bounded history. Covered by `tests/representatives.test.js`. |
| AZR-289 E3-S6 Mass extinction modeling | Backlog | Missing | Current extinction only handles all-organisms-dead state. Catastrophe event types, survival checks, adaptive radiation, and overlay/timeline output are missing. |

AZR-258 E4 Primordial + Microbial children:

| Issue | Status | Readiness classification | Evidence / gap |
| --- | --- | --- | --- |
| AZR-290 E4-S1 Geological simulation | Done | Implemented foundation | `PS.layers.geology` now defines deterministic tectonic plates, drift, collision/subduction boundaries, hotspots, volcanism, erosion/sediment, continental formation, and tile annotations. Covered by `tests/geology-layer.test.js`. |
| AZR-291 E4-S2 Atmospheric chemistry | Done | Implemented foundation | `PS.layers.atmosphere` now tracks gas composition, volcanic outgassing, photosynthetic oxygen, greenhouse temperature, ozone formation, oxygen stress, and persistence-safe state. Covered by `tests/atmosphere-layer.test.js` and persistence parity assertions. |
| AZR-292 E4-S3 Abiogenesis mechanics | Backlog | Missing | No chemical complexity state, abiogenesis threshold, epoch transition, or first-life event contract exists. |
| AZR-293 E4-S4 Microbial simulation | Backlog | Model direction recorded, experiments pending | `docs/biological-model-decision.md` recommends a field/population hybrid for microbial life; AZR-293 still needs prototype/evaluation evidence before implementation. |
| AZR-294 E4-S5 Deep time visualization | Backlog | Missing | No geological-era timeline or click-to-era navigation exists. Should depend on time/event contracts. |

AZR-259 E9 Observation Tools children:

| Issue | Status | Readiness classification | Evidence / gap |
| --- | --- | --- | --- |
| AZR-299 E9-S1 Observation overlays | Done | Implemented foundation | `PS.render.observationOverlays` registers temperature, population density, resource, and atmosphere overlays. UI buttons and `O` keyboard cycling toggle overlays; frame-time sampling is recorded in `world.overlayPerformance`. Covered by `tests/observation-overlays.test.js`. |
| AZR-300 E9-S2 Lineage tracking | Backlog | Partial foundation | Lineage state and inspect chips exist. Pinning, selected-lineage highlights, species trends, and parent/speciation history UI are missing. |
| AZR-301 E9-S3 Statistics dashboard | Backlog | Partial foundation | HUD/ecosystem/trait history exist. Full dashboard, biodiversity index, histograms, and biome/species charts are missing. |
| AZR-302 E9-S4 Timeline viewer | Done | Implemented foundation | `PS.ui.timeline` reads `world.timelineEvents`, sorts chronologically, filters all/extinction/speciation/civilization, and focuses event locations or inspect targets. Covered by `tests/timeline-viewer.test.js`. |
| AZR-303 E9-S5 Bookmarks/annotations | Backlog | Missing | No bookmark model, persistence fields, screenshot capture, or panel exists. |
| AZR-304 E9-S6 History scrubbing | Backlog | Correctly deferred | Snapshot/checkpoint model is not ready and should remain deferred until core sim state stabilizes. |
| AZR-305 E9-S7 Evolutionary tree visualization | Backlog | Missing | Lineage records exist, but no tree view, zoom/pan, node selection, or active/extinct graph exists. |
| AZR-306 E9-S8 Screenshot/recording export | Backlog | Missing | No canvas export or MediaRecorder workflow exists. |

AZR-260 E10 Time Scale System children:

| Issue | Status | Readiness classification | Evidence / gap |
| --- | --- | --- | --- |
| AZR-295 E10-S1 Adaptive time baseline | Done | Implemented foundation | `PS.time` reads `PS.epochs.current`, maps epochs to the required time-scale table, transitions smoothly, advances `world.deepTimeYears`, and exposes a manual time-scale slider. Covered by `tests/time-accumulator.test.js`. |
| AZR-296 E10-S2 Event detection system | Done | Implemented foundation | `PS.events` now defines configurable milestone definitions per epoch, detects first life/multicellular/tool use/city/launch milestones, emits `milestone.reached` payloads with `details`, logs visible events, and stores durable `timelineEvents`. Covered by `tests/milestone-events.test.js`. |
| AZR-297 E10-S3 Event spotlight UI | Done | Implemented foundation | `PS.ui.spotlight` listens for `milestone.reached`, shows an event panel, supports dismiss/investigate actions, optionally slows time, and auto-pans to event targets. Covered by `tests/event-spotlight.test.js`. |
| AZR-298 E10-S4 Time compression UI | Backlog | Partial foundation | Speed controls exist. Deep-time scale labels and adaptive unit display are missing. |

## Missing Watcher-Facing Acceptance Criteria

The Phase 2 backlog needs stronger visible outcomes before implementation starts:

- Every simulation system should define what the watcher can see at orbit, region, and local zoom.
- Biology stories should specify inspect-panel output, HUD summary output, and history/timeline output, not only internal trait math.
- Geology and atmosphere should define overlay color maps, event markers, and visible terrain/sky changes.
- Time/event stories should specify how events enter `world.eventLog`, timeline UI, notifications, and camera spotlight behavior.
- Experimental microbial and representative-organism stories should produce a decision artifact before dependent implementation starts.

## Readiness Decisions

1. Do not move AZR-357 food/organism runtime shards until the AZR-361 decision is reflected in tests. `docs/biological-model-decision.md` chooses aggregate populations as authoritative, representative organisms as watchable facades, and stable population/species/representative IDs before migration.
2. Start Phase 2 implementation with always-on system foundations, not body-plan features:
   - `PS.layers.geology`
   - `PS.layers.atmosphere`
   - epoch update contract
   - milestone event payload contract
3. Treat AZR-350 and AZR-293 as explicit implementation gates:
   - AZR-350 follows the recorded representative-organism + aggregate-population contract.
   - AZR-293 should validate the recorded field/population microbial direction with prototype evidence.
4. Connect E10 and E9 before deep biology features:
   - event detection should feed timeline, spotlight, notifications, and observation panels.
   - biology/geology events should become watcher-visible outputs, not internal-only state.
5. AZR-359 moved the main-loop runtime last after Phase 2 layer/epoch/sim surfaces had stable ownership.

## Linear Backlog Updates

AZR-353 created three bridge issues to prevent Phase 2 stories from diverging:

- AZR-360: Phase 2 foundation contract for always-on layers, epoch lifecycle, and milestone events.
- AZR-361: Biological model gate for representative organisms and aggregate populations before AZR-357 moves food/organism runtime. Decision recorded in `docs/biological-model-decision.md`.
- AZR-362: Watcher event contract connecting timeline, spotlight, overlays, and observation panels. Implemented in `PS.events` and covered by `tests/watcher-event-contract.test.js`.

## Recommended Implementation Order

1. AZR-293 validation: convert the recorded microbial model direction into prototype evidence.
2. AZR-284/AZR-288/AZR-286/AZR-287: expanded traits, species, food web, terrain-driven evolution.
3. Continue with Phase 2 implementation issues after AZR-352 legacy runtime retirement closes.

## Verification Expectations

Phase 2 readiness is not implementation proof. Before each story is marked done, add story-specific tests plus the standing checks:

- `bash .codex/setup.sh`
- `node tests/food-index.test.js`
- `node tests/organism-runtime.test.js`
- `node tests/settlement-progression.test.js`
- `node tests/spatial-index.test.js`
- `node tests/pools.test.js`
- `node tests/persistence-parity.test.js` for persisted state changes
- `node tests/mobile-layout.test.js` for visible UI changes
- `node tests/time-accumulator.test.js` for time-scale changes
- Browser `file://` smoke when loader or UI behavior changes
