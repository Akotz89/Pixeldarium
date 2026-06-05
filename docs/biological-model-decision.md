# Biological Model Decision

Date: 2026-06-02

Linear scope: AZR-361, AZR-350, AZR-357.

## Decision

Pixeldarium will use aggregate population state as the authoritative planet-scale biology model, with representative organisms as detailed, watchable facades for selected aggregate populations or lineages.

This preserves the watcher fantasy of following individual life without making the whole planet depend on high-detail brains for every organism.

This is also the canonical example of the broader Pixeldarium optimization
model in `docs/optimization-operating-model.md`: aggregate state is
authoritative at scale, while representative detail is generated only where the
watcher's attention needs it. Future microbial, civilization, climate, food-web,
and event systems should use the same aggregate-plus-representative boundary
unless a measured bottleneck proves a different representation is better.

## Current Code Baseline

Current biology runtime is now owned by modern simulation modules:

- `js/sim/food.js`, `js/sim/organisms.js`, and `js/sim/evolution.js` expose `PS.sim.*` facades.
- `js/sim/food-runtime.js` and `js/sim/food-growth.js` own loaded food implementation.
- `js/sim/organisms-traits.js`, `js/sim/organisms-indexes.js`, and `js/sim/organisms-behavior.js` own loaded representative organism implementation.
- `js/sim/representatives.js` owns the aggregate-population and watcher-facing representative lifecycle foundation: population summaries, representative records, selection, pinning, bookmarks, pressure context, and bounded inspection history.
- `js/systems/pools.js` already stores current organism facades over typed arrays for position, energy, movement, lineage, generation, and five traits.
- `world.lineages`, `world.organismsByLineage`, `world.organismBuckets`, `world.foodBuckets`, and `world.foodPositions` are the current aggregate/index surfaces.
- Current tests cover typed-array pool backing, food indexing, spatial indexing, persistence parity, species/population/representative IDs, aggregate population records, representative selection, pinning/bookmarks, and representative lifecycle history.

## State Ownership

Aggregate population records are authoritative for scale:

- Stable `populationId`.
- `speciesId` and `lineageId`.
- Parent population/species references when split by speciation or migration.
- Population count, biomass, energy reserve, age distribution summary, mortality, fertility, and growth pressure.
- Territory/range as tile buckets or density cells.
- Trait distribution, including mean, variance, and selected extrema for render/inspection.
- Food, predator, terrain, water, climate, and microbial pressure summaries.
- Representative IDs attached to the population.

Representative organisms are detailed watcher-facing facades:

- Stable `representativeId`.
- Owning `populationId`, `speciesId`, and `lineageId`.
- Exact tile and surface position.
- Energy, hunger, age, current behavior, target, animation state, and short inspectable history.
- Selected realized traits sampled from the aggregate distribution.
- Optional bookmark/interest score.

Representative behavior may sample aggregate pressure and may write bounded observations back to aggregate state, but it must not singlehandedly determine the whole population. Aggregate population math remains authoritative for counts, species survival, and planet-scale evolution.

## Runtime Support

`PS.sim.representatives` now exposes the first implementation slice for AZR-350:

- `refresh()` rebuilds aggregate population summaries from the active representative facades in `world.organisms`.
- `syncOrganism(organism)` creates or updates a watcher-facing representative record and links it back to species, population, lineage, position, behavior, target, traits, and history.
- `inspect()`, `select()`, `pin()`, and `bookmark()` support player-facing inspection and bookmark state.
- Population records summarize count, biomass, energy reserve, territory cells, trait mean/variance, pressure, representative IDs, and activity state.
- Representative records retire to `isActive: false` when their active facade leaves the runtime, while pinned or selected state remains available for persistence.

The current implementation still treats `world.organisms` as the active high-detail facade list. Aggregate records now make that ownership explicit so future Phase 2 stories can move counts, survival, and planet-scale evolution toward aggregate math without requiring high-detail brains for every individual.

## Lifecycle

Representatives are created when a population is visible or important:

- Local zoom requests representatives for nearby high-interest populations.
- Region zoom requests fewer representatives plus density/flow markers.
- Orbit zoom shows aggregate density, range, blooms, and event markers; representatives are not required.
- Timeline, spotlight, bookmark, lineage selection, or notable events can pin a representative.

Representatives are persisted only when they are pinned, selected, or currently active. Unpinned representatives may be deterministically regenerated from `populationId`, seed, tick window, and aggregate state.

Representatives retire when their owning population is extinct, when they age out, when the player unpins them and they leave the active viewport, or when the aggregate population splits and the representative no longer matches the selected child population.

## Persistence Shape

Add these persisted top-level fields before or during AZR-357:

```text
biologyPopulations: [
  {
    id,
    speciesId,
    lineageId,
    parentPopulationId,
    count,
    biomass,
    energyReserve,
    territoryCells,
    traitMean,
    traitVariance,
    pressure,
    representativeIds,
    createdTick,
    lastUpdatedTick
  }
]

biologyRepresentatives: [
  {
    id,
    populationId,
    speciesId,
    lineageId,
    x,
    y,
    latitude,
    longitude,
    energy,
    age,
    behavior,
    target,
    traits,
    history,
    pinned,
    createdTick,
    lastSeenTick
  }
]

nextBiologyPopulationId
nextBiologyRepresentativeId
nextSpeciesId
```

Existing `world.organisms` can remain the active representative facade list during migration. AZR-357 should not rename it blindly; the migration should introduce the aggregate collections first, then make `PS.sim.organisms` explicit about representative operations.

## Render Shape

Orbit zoom:

- Render aggregate population density, territory ranges, migration fronts, microbial blooms, and extinction/speciation event markers.
- No high-detail representative animation is required.

Region zoom:

- Render population clusters, species/range color bands, food pressure, and a small number of representatives near the selected region.
- Representatives should be inspectable when visible.

Local zoom:

- Render richer representative organisms with trait-derived shape, animation state, behavior intent, and selected target.
- Inspection should show representative state plus aggregate population context.

## Trait And Species Requirements

Before AZR-284 and AZR-288 implementation, add identifiers and trait surfaces in this order:

1. `speciesId` as a stable integer typed-array field on active representative facades.
2. `populationId` as a stable integer typed-array field linking representatives to aggregate population records.
3. `representativeId` for pinned/inspectable organisms.
4. Body-plan trait fields: size, limb count, body shape, appendage type.
5. Behavior/ecology trait fields: camouflage, thermal tolerance, water dependency.
6. Aggregate trait distribution records with mean and variance for every trait used by species, rendering, and selection.

Speciation should create or split aggregate population records first, then assign representative facades to the resulting population/species. Do not make speciation depend only on pairwise representative mating.

## Microbial Model Direction

AZR-293 should select a field/population hybrid for microbial life:

- Field state owns density, chemical energy, oxygen production, stress, and bloom intensity.
- Population records own named microbial lineages when blooms become notable.
- Individual microbe agents are not the default model because they are too small and numerous for watcher-scale simulation.
- Representatives may appear later as macro-visible colonies, mats, stromatolite patches, or sampled microbial population records, not individual microbes.

AZR-293 now records the prototype comparison in `docs/microbial-model-evaluation.md` and implements the selected hybrid in `js/epochs/microbial.js`.

## AZR-357 Migration Approach

AZR-357 should migrate food/organism runtime in this order:

1. Add aggregate biology state containers and ID counters in `js/systems/state.js`.
2. Add typed-array fields for `speciesId`, `populationId`, `representativeId`, and required AZR-284 traits in `js/systems/pools.js`.
3. Move legacy food implementation into focused `js/sim/food-*` modules while preserving `PS.sim.food`. Done in `js/sim/food-runtime.js` and `js/sim/food-growth.js`.
4. Move representative organism implementation into focused `js/sim/organisms-*` modules while preserving current behavior. Done in `js/sim/organisms-traits.js`, `js/sim/organisms-indexes.js`, and `js/sim/organisms-behavior.js`.
5. Add aggregate population helpers before changing biology behavior.
6. Remove `js/legacy/organisms/*` script tags only after tests prove parity. Done after `tests/organism-runtime.test.js`.

Verification expectations for AZR-357:

- `node tests/pools.test.js`
- `node tests/food-index.test.js`
- `node tests/organism-runtime.test.js`
- `node tests/spatial-index.test.js`
- `node tests/persistence-parity.test.js`
- New tests for representative IDs, species IDs, population IDs, and aggregate population persistence.
- `bash .codex/setup.sh`
- `git diff --check`
- Retired-name sweep for the old project name.

## Non-Goals

- Do not simulate every organism at representative detail.
- Do not make microbial life individual-agent-first.
- Do not change food/organism behavior before the aggregate/representative ownership boundary is reflected in tests.
- Do not replace existing food/organism behavior during the migration unless a Linear issue explicitly changes that behavior.
