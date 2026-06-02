# Legacy Runtime Assessment

Date: 2026-06-02

## Purpose

AZR-352 tracks the architecture follow-up after Phase 1: remove runtime dependence on `js/legacy/*` shards once modern `PS.*` modules have parity.

This document is the current domain inventory and migration decision log for non-UI legacy runtime files. UI runtime retirement is covered separately in `docs/legacy-ui-assessment.md` and is complete: `index.html` no longer loads any `js/legacy/ui/*` scripts.

## Phase 1 Scope Reconciliation

Phase 1 Foundation is not proof that every `js/legacy/*` runtime shard is gone. Linear defines Phase 1 as planet rendering, performance foundation, WebGL2 migration, decoupled sim loop, spatial indexing, and project restructure. The completed E0 issues established the target architecture, removed root compatibility files, and retired the legacy UI runtime loader.

The remaining legacy runtime work is explicitly tracked by AZR-352 and its children:

- AZR-357: migrate food and organism runtime shards after the Phase 2 biological model gate.
- AZR-358: migrate settlement/civilization runtime shards after settlement model follow-up.
- AZR-359: migrate main-loop shards last, after the other runtime surfaces are stable.

Current audit result: `js/legacy/ui` may still exist as an empty local directory, but Git tracks no `js/legacy/ui/*` files and `index.html` loads no legacy UI scripts. The tracked runtime dependency is the 17 non-UI files listed below.

## Current Runtime Inventory

`index.html` still loads 17 non-UI legacy scripts:

| Domain | Runtime scripts | Decision |
| --- | ---: | --- |
| State/utils | 0 | Migrated in AZR-354 to `js/systems/state.js` and `js/core/utils.js`. |
| Persistence | 0 | Migrated in AZR-355 to focused `js/systems/persistence-*` modules after browser parity coverage. |
| Planet/terrain/render | 0 | Migrated in AZR-356 to ordered `js/render/*` modules with compatibility preserved. |
| Food/organisms | 3 | Food runtime migrated to `js/sim/food-runtime.js` and `js/sim/food-growth.js`; organism runtime remains in legacy shards until representative behavior migration. |
| Settlements | 9 | Migrate after simulation follow-up issues decide whether settlement/civilization progression remains current or is reshaped. Retain temporarily if deeper model changes are imminent. |
| Main loop | 5 | Migrate after core state/systems are moved, because bootstrap ordering depends on every preceding runtime surface. |

## State / Utils

Runtime scripts: none.

Decision: migrated in AZR-354. `index.html` no longer loads `js/legacy/state/*` or `js/legacy/utils/*`.

Target shape:

- `js/systems/state.js` owns DOM/world initialization surfaces.
- `js/core/utils.js` owns seed, RNG, tile index, clamp, and world-position compatibility helpers.

Verification:

- `.codex/setup.sh`
- `tests/globe-interaction.test.js`
- `tests/mobile-layout.test.js`
- Any tests that load world helpers directly.

## Persistence

Runtime scripts: none.

Decision: migrated in AZR-355. `index.html` no longer loads `js/legacy/persistence/*`.

Target shape:

- Keep `js/systems/persistence.js` as the facade.
- Focused implementation modules live in `js/systems/persistence-db.js`, `js/systems/persistence-save-data.js`, `js/systems/persistence-restore-core.js`, `js/systems/persistence-restore-entities.js`, and `js/systems/persistence-io.js`.

Verification:

- `tests/persistence-parity.test.js`
- `tests/globe-interaction.test.js`
- `bash .codex/setup.sh`

## Planet / Terrain / Render

Runtime scripts: none.

Decision: migrated in AZR-356. `index.html` no longer loads `js/legacy/planet/*`, `js/legacy/terrain/*`, `js/legacy/render-terrain-cache/*`, or `js/legacy/render/*`.

Target shape:

- Existing `js/render/*` modules own rendering behavior.
- Ordered compatibility surfaces live in `js/render/planet-view.js`, `js/render/planet-surface.js`, `js/render/planet-grid.js`, `js/render/terrain-hydrology.js`, `js/render/terrain-seeding.js`, `js/render/terrain-cache-runtime.js`, `js/render/terrain-render-compat.js`, and `js/render/pipeline-compat.js`.
- `js/core/planet-metrics.js` and `js/core/world-grid.js` continue to own shared calculations.
- Compatibility wrappers should disappear only after render and zoom-anchor tests cover direct `PS.render.*` API use.

Verification:

- `tests/planet-zoom-anchor.test.js`
- `tests/terrain-cache-canvas-pool.test.js`
- Visual smoke via `tests/mobile-layout.test.js` and `file://` browser console check.

## Food / Organisms

Runtime scripts:

- `js/legacy/organisms/part-01.js`
- `js/legacy/organisms/part-02.js`
- `js/legacy/organisms/part-03.js`

Decision: food runtime has moved out of `js/legacy/*`. Retain organism shards temporarily until AZR-357 can implement the representative-organism behavior migration from the AZR-361 model decision. `docs/biological-model-decision.md` chooses aggregate population records as authoritative and representative organisms as detailed watcher-facing facades.

Target shape:

- `js/sim/food-runtime.js`, `js/sim/food-growth.js`, and `js/sim/food.js` own food behavior.
- `js/sim/organisms.js` and `js/sim/evolution.js` own public organism/evolution facades while organism implementation migration continues.
- Aggregate biology records own population/species scale.
- Representative organism facades own inspectable local behavior.
- Typed-array fields include stable species, population, and representative IDs before migration is marked complete.

Verification:

- `tests/food-index.test.js`
- `tests/spatial-index.test.js`
- Future E3/E4 trait/food-web tests.
- New aggregate population and representative organism persistence tests.

## Settlements

Runtime scripts:

- `js/legacy/settlements/part-01.js`
- `js/legacy/settlements/part-02.js`
- `js/legacy/settlements/part-03.js`
- `js/legacy/settlements/part-04.js`
- `js/legacy/settlements/part-05.js`
- `js/legacy/settlements/part-06.js`
- `js/legacy/settlements/part-07.js`
- `js/legacy/settlements/part-08.js`
- `js/legacy/settlements/part-09.js`

Decision: retain temporarily pending civilization and settlement model follow-up. The current settlement runtime is broad, stateful, and likely to change with Phase 3 planning.

Target shape:

- `js/sim/settlements.js` and `js/sim/civilizations.js` own the public surface.
- Split progression systems only when tests cover route, colony, space, probe, star, fleet, sector, and legacy progression.

Verification:

- New settlement progression tests before removing shards.
- Persistence tests covering all settlement/civilization fields.

## Main Loop

Runtime scripts:

- `js/legacy/main/part-01.js`
- `js/legacy/main/part-02.js`
- `js/legacy/main/part-03.js`
- `js/legacy/main/part-04.js`
- `js/legacy/main/part-05.js`

Decision: migrate last. Main loop code depends on namespace setup, world seeding, UI setup, simulation tick, render pipeline, worker mode, and startup sequencing.

Target shape:

- `js/main.js` owns `PS.init()` and boot orchestration.
- Supporting loop pieces move into `js/systems/time.js`, `js/systems/world.js`, and small startup modules.

Verification:

- `.codex/setup.sh`
- Browser `file://` console smoke.
- Time accumulator tests and any worker-mode tests.

## Next Implementation Order

1. Food/organisms after AZR-357 has tests for the AZR-361 aggregate/representative model contract.
2. Settlements after civilization progression tests and settlement model follow-up are in place.
3. Main loop last, after the other runtime surfaces are stable.

## Standing Constraints

- Preserve `file://` static browser compatibility.
- Do not introduce a bundler, framework, or new runtime dependency.
- Keep script-tag loading and `PS.*` namespace surfaces.
- Keep every JS module under 500 lines.
- Keep root JavaScript limited to `config.js`.
- Keep the old project-name sweep clean; documentation should not reintroduce retired names.
