# Phase 2 Readiness

Date: 2026-06-02

## Purpose

AZR-353 reconciles the current Pixeldarium repo with the Phase 2 Linear scope before broad biology, primordial, observation, or deep-time implementation starts.

This is also the gate for AZR-357. Food and organism runtime shards should not move blindly while Phase 2 is still deciding typed-array traits, representative organisms, microbial modeling, and watcher-facing biology outcomes.

## Current Code Evidence

Current repo state:

- `js/sim/food.js`, `js/sim/organisms.js`, `js/sim/evolution.js`, `js/sim/settlements.js`, and `js/sim/civilizations.js` are public `PS.sim.*` facades over existing runtime functions.
- `js/legacy/food/*`, `js/legacy/organisms/*`, `js/legacy/settlements/*`, and `js/legacy/main/*` are still loaded by `index.html`.
- `js/layers/registry.js` exists. `js/layers/geology.js` and `js/layers/atmosphere.js` are registered as always-on layers; ocean and biosphere layers are not implemented yet.
- `js/epochs/registry.js` exists, but no epoch modules register primordial, microbial, biological, observer, or deep-time behavior.
- `js/systems/time.js` implements fixed-step accumulator plumbing, and the legacy main-loop tick now calls `PS.layers.updateAll(dt)`. Time still does not adapt scale from epoch state or emit milestone spotlight events.
- `js/render/overlays.js` has a registry plus current civilization/orbital overlays, but no Phase 2 temperature, population density, resource, atmospheric-composition, timeline, or lineage-tree overlays.
- `js/core/events.js` exists, but Phase 2 milestone/speciation/extinction event contracts are not wired through sim, time, and watcher UI.
- Tests currently cover pools, food indexing, spatial indexing, persistence parity, render/zoom, mobile layout, worker spike, accumulator behavior, the Phase 2 layer/epoch/event contract, and the AZR-290 geology layer. They do not yet cover Phase 2 body-plan traits, food webs, species IDs, microbial models, atmosphere chemistry, abiogenesis, event spotlight, observation overlays, or deep-time timeline behavior.

## Linear Inventory

AZR-257 E3 Biological Simulation children:

| Issue | Status | Readiness classification | Evidence / gap |
| --- | --- | --- | --- |
| AZR-284 E3-S1 Expanded trait system | Backlog | Partial foundation, needs split | Current traits are vision/metabolism/reproduction/roam/habitat and have typed-array pool backing. Body-plan traits, camouflage, thermal tolerance, water dependency, species IDs, and migration tests are missing. |
| AZR-285 E3-S2 Continuous morphological rendering | Backlog | Missing | Entity sprites exist, but no `generateSprite(traitArray, entityId)` contract or trait-derived morphology cache exists. |
| AZR-286 E3-S3 Food web mechanics | Backlog | Missing | Food indexing and organism food seeking exist. Predator/prey, trophic levels, energy transfer, and food-web metrics are missing. |
| AZR-287 E3-S4 Terrain-driven evolution | Backlog | Partial foundation, needs watcher criteria | Terrain affinity and terrain mismatch costs exist. Biome-specific trait pressure, geographic isolation, and event outputs are missing. |
| AZR-288 E3-S5 Speciation events | Backlog | Partial foundation, needs split | Lineages and divergence scoring exist. `speciesId`, reproductive isolation, species events, and species-level UI are missing. |
| AZR-350 E3-S5 Representative organisms | Backlog | Missing decision gate | This should become the biological model gate before AZR-357 moves runtime shards. It must decide detailed representatives vs aggregate populations and how both persist/render. |
| AZR-289 E3-S6 Mass extinction modeling | Backlog | Missing | Current extinction only handles all-organisms-dead state. Catastrophe event types, survival checks, adaptive radiation, and overlay/timeline output are missing. |

AZR-258 E4 Primordial + Microbial children:

| Issue | Status | Readiness classification | Evidence / gap |
| --- | --- | --- | --- |
| AZR-290 E4-S1 Geological simulation | Done | Implemented foundation | `PS.layers.geology` now defines deterministic tectonic plates, drift, collision/subduction boundaries, hotspots, volcanism, erosion/sediment, continental formation, and tile annotations. Covered by `tests/geology-layer.test.js`. |
| AZR-291 E4-S2 Atmospheric chemistry | Backlog | Missing foundation | Render atmosphere visuals exist. `PS.layers.atmosphere` chemistry state is missing. |
| AZR-292 E4-S3 Abiogenesis mechanics | Backlog | Missing | No chemical complexity state, abiogenesis threshold, epoch transition, or first-life event contract exists. |
| AZR-293 E4-S4 Microbial simulation | Backlog | Needs model decision | The issue is experimental. It should decide agent vs field vs population modeling before implementation issues depend on it. |
| AZR-294 E4-S5 Deep time visualization | Backlog | Missing | No geological-era timeline or click-to-era navigation exists. Should depend on time/event contracts. |

AZR-259 E9 Observation Tools children:

| Issue | Status | Readiness classification | Evidence / gap |
| --- | --- | --- | --- |
| AZR-299 E9-S1 Observation overlays | Backlog | Partial foundation, needs split | Overlay registry exists. Specific temperature, population density, resource, and atmosphere overlays are missing. |
| AZR-300 E9-S2 Lineage tracking | Backlog | Partial foundation | Lineage state and inspect chips exist. Pinning, selected-lineage highlights, species trends, and parent/speciation history UI are missing. |
| AZR-301 E9-S3 Statistics dashboard | Backlog | Partial foundation | HUD/ecosystem/trait history exist. Full dashboard, biodiversity index, histograms, and biome/species charts are missing. |
| AZR-302 E9-S4 Timeline viewer | Backlog | Partial foundation | Event log exists. Chronological timeline, event filtering, camera jump, and event source contract are missing. |
| AZR-303 E9-S5 Bookmarks/annotations | Backlog | Missing | No bookmark model, persistence fields, screenshot capture, or panel exists. |
| AZR-304 E9-S6 History scrubbing | Backlog | Correctly deferred | Snapshot/checkpoint model is not ready and should remain deferred until core sim state stabilizes. |
| AZR-305 E9-S7 Evolutionary tree visualization | Backlog | Missing | Lineage records exist, but no tree view, zoom/pan, node selection, or active/extinct graph exists. |
| AZR-306 E9-S8 Screenshot/recording export | Backlog | Missing | No canvas export or MediaRecorder workflow exists. |

AZR-260 E10 Time Scale System children:

| Issue | Status | Readiness classification | Evidence / gap |
| --- | --- | --- | --- |
| AZR-295 E10-S1 Adaptive time baseline | Backlog | Partial foundation | Fixed-step accumulator exists. Epoch-derived time scale, smooth transitions, and deep-time units are missing. |
| AZR-296 E10-S2 Event detection system | Backlog | Partial foundation | Event bus and event log exist. Milestone registry, detection rules, and timeline payload schema are missing. |
| AZR-297 E10-S3 Event spotlight UI | Backlog | Missing | Notifications exist, but no slowdown/autopan/investigate spotlight controller exists. |
| AZR-298 E10-S4 Time compression UI | Backlog | Partial foundation | Speed controls exist. Deep-time scale labels and adaptive unit display are missing. |

## Missing Watcher-Facing Acceptance Criteria

The Phase 2 backlog needs stronger visible outcomes before implementation starts:

- Every simulation system should define what the watcher can see at orbit, region, and local zoom.
- Biology stories should specify inspect-panel output, HUD summary output, and history/timeline output, not only internal trait math.
- Geology and atmosphere should define overlay color maps, event markers, and visible terrain/sky changes.
- Time/event stories should specify how events enter `world.eventLog`, timeline UI, notifications, and camera spotlight behavior.
- Experimental microbial and representative-organism stories should produce a decision artifact before dependent implementation starts.

## Readiness Decisions

1. Do not move AZR-357 food/organism runtime shards yet. Phase 2 biology still needs a model decision for representative organisms, aggregate populations, species IDs, and trait storage.
2. Start Phase 2 implementation with always-on system foundations, not body-plan features:
   - `PS.layers.geology`
   - `PS.layers.atmosphere`
   - epoch update contract
   - milestone event payload contract
3. Treat AZR-350 and AZR-293 as explicit decision gates:
   - AZR-350 decides the representative-organism + aggregate-population contract.
   - AZR-293 decides the microbial simulation model.
4. Connect E10 and E9 before deep biology features:
   - event detection should feed timeline, spotlight, notifications, and observation panels.
   - biology/geology events should become watcher-visible outputs, not internal-only state.
5. Keep AZR-359 main-loop migration last. Boot sequencing should move only after Phase 2 layer/epoch/sim surfaces have stable ownership.

## Linear Backlog Updates

AZR-353 created three bridge issues to prevent Phase 2 stories from diverging:

- AZR-360: Phase 2 foundation contract for always-on layers, epoch lifecycle, and milestone events.
- AZR-361: Biological model gate for representative organisms and aggregate populations before AZR-357 moves food/organism runtime.
- AZR-362: Watcher event contract connecting timeline, spotlight, overlays, and observation panels.

## Recommended Implementation Order

1. AZR-360: define always-on `PS.layers.*`, epoch update lifecycle, and milestone event payloads.
2. AZR-291: atmosphere as an always-on layer with chemistry state, visible overlays, and persistence-safe state.
3. AZR-295 and AZR-296: adaptive time baseline and milestone event detection connected to `PS.events`.
4. AZR-362, AZR-299, and AZR-302: observation overlays and timeline viewer consuming geology/atmosphere/biology/time events.
5. AZR-361, AZR-350, and AZR-293 decisions: representative organisms, aggregate populations, and microbial model.
6. AZR-284/AZR-288/AZR-286/AZR-287: expanded traits, species, food web, terrain-driven evolution.
7. AZR-357: migrate food/organism runtime shards after the biological model contract is stable and tests cover the selected model.
8. AZR-358: migrate settlement/civilization runtime shards after civilization progression tests are in place.
9. AZR-359: migrate main loop last.

## Verification Expectations

Phase 2 readiness is not implementation proof. Before each story is marked done, add story-specific tests plus the standing checks:

- `bash .codex/setup.sh`
- `node tests/food-index.test.js`
- `node tests/spatial-index.test.js`
- `node tests/pools.test.js`
- `node tests/persistence-parity.test.js` for persisted state changes
- `node tests/mobile-layout.test.js` for visible UI changes
- `node tests/time-accumulator.test.js` for time-scale changes
- Browser `file://` smoke when loader or UI behavior changes
