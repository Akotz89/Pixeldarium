# Legacy UI Assessment

Date: 2026-06-02

## Current Runtime Truth

`index.html` still loads these legacy UI runtime files:

- `js/legacy/ui/part-06.js`

The modern UI modules currently loaded are:

- `js/ui/hud.js`
- `js/ui/panels.js`
- `js/ui/controls.js`
- `js/ui/notifications.js`
- `js/ui/touch.js`
- `js/ui/foundation.js`
- `js/ui/summary.js`
- `js/ui/history-summary.js`
- `js/ui/inspect-history.js`
- `js/ui/interaction.js`

## Phase 1 Scope Reconciliation

AZR-271, `E0-S4: Decompose ui.js + create js/debug/ infrastructure`, was scoped to create focused `js/ui` and `js/debug` files, keep each file under 500 lines, preserve the always-visible seed copy control, and keep debug tools tolerant of removal.

That scope was a decomposition/facade milestone. It did not explicitly require retiring every `js/legacy/ui` runtime file from `index.html`.

Therefore, Phase 1 can have met AZR-271 as written while still leaving unfinished architecture work in the UI lane. The remaining work should be tracked separately as legacy UI runtime retirement, not hidden under the completed AZR-271 record.

## Remaining UI Lane Work

1. Split the migrated `js/ui/foundation.js` functions into focused HUD, controls, panels, and inspect modules.
2. Split the migrated `js/ui/summary.js` helpers into focused summary, ecosystem, lineage, and inspect modules where useful.
3. Split the migrated `js/ui/history-summary.js` helpers into focused event, ecosystem-history, and settlement-summary modules where useful.
4. Split the migrated `js/ui/inspect-history.js` helpers into focused event-log, trait-history, and inspect modules where useful.
5. Split the migrated `js/ui/interaction.js` helpers into focused camera, inspect, persistence-status, keyboard, and pointer-input modules where useful.
6. Move event binding/bootstrap from `js/legacy/ui/part-06.js` into modern UI setup modules.
7. Remove `js/legacy/ui` script tags from `index.html` after parity tests pass.
8. Keep static-browser and `file://` compatibility, root JS limited to `config.js`, and each JS module under 500 lines.

## Recent Correction

Commit `e940d85` moved touch gesture ownership out of `js/legacy/ui/part-07.js` into `js/ui/touch.js`, removed the legacy touch shard, and added mobile layout regression coverage. That was the first cleanup step in this lane, not the end of the UI migration.

Commit `4f10575` documented this assessment. The next implementation slice moved `js/legacy/ui/part-01.js` to `js/ui/foundation.js` so the runtime no longer loads that legacy shard.

The following implementation slice moved `js/legacy/ui/part-02.js` to `js/ui/summary.js`, reducing the loaded legacy UI shard count to four.

The next implementation slice moved `js/legacy/ui/part-03.js` to `js/ui/history-summary.js`, reducing the loaded legacy UI shard count to three.

The following implementation slice moved `js/legacy/ui/part-04.js` to `js/ui/inspect-history.js`, reducing the loaded legacy UI shard count to two.

The next implementation slice moved `js/legacy/ui/part-05.js` to `js/ui/interaction.js`, reducing the loaded legacy UI shard count to one.
