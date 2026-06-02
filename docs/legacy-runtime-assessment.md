# Legacy Runtime Assessment

Date: 2026-06-02

## Purpose

AZR-352 tracks the architecture follow-up after Phase 1: remove runtime dependence on `js/legacy/*` shards once modern `PS.*` modules have parity.

This document is the current domain inventory and migration decision log for non-UI legacy runtime files. UI runtime retirement is covered separately in `docs/legacy-ui-assessment.md` and is complete: `index.html` no longer loads any `js/legacy/ui/*` scripts.

## Current Runtime Inventory

`index.html` still loads 19 non-UI legacy scripts:

| Domain | Runtime scripts | Decision |
| --- | ---: | --- |
| State/utils | 0 | Migrated in AZR-354 to `js/systems/state.js` and `js/core/utils.js`. |
| Persistence | 0 | Migrated in AZR-355 to focused `js/systems/persistence-*` modules after browser parity coverage. |
| Planet/terrain/render | 0 | Migrated in AZR-356 to ordered `js/render/*` modules with compatibility preserved. |
| Food/organisms | 5 | Migrate after Phase 2 readiness clarifies typed-array and representative-organism direction. Retain temporarily if the biological model is about to change. |
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

- `js/legacy/food/part-01.js`
- `js/legacy/food/part-02.js`
- `js/legacy/organisms/part-01.js`
- `js/legacy/organisms/part-02.js`
- `js/legacy/organisms/part-03.js`

Decision: retain temporarily until Phase 2 readiness resolves the biological simulation direction. AZR-353 and E3/E4 issues may change the model enough that a path-only migration would create churn.

Target shape:

- `js/sim/food.js`, `js/sim/organisms.js`, and `js/sim/evolution.js` own behavior.
- Typed-array or representative-organism work should not be blocked by migrated wrapper names.

Verification:

- `tests/food-index.test.js`
- `tests/spatial-index.test.js`
- Future E3/E4 trait/food-web tests.

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

1. State/utils.
2. Planet/terrain/render low-risk wrappers with existing render tests.
3. Persistence with expanded parity tests.
4. Food/organisms after Phase 2 readiness.
5. Settlements after civilization model follow-up.
6. Main loop last.

## Standing Constraints

- Preserve `file://` static browser compatibility.
- Do not introduce a bundler, framework, or new runtime dependency.
- Keep script-tag loading and `PS.*` namespace surfaces.
- Keep every JS module under 500 lines.
- Keep root JavaScript limited to `config.js`.
- Keep the old project-name sweep clean; documentation should not reintroduce retired names.
