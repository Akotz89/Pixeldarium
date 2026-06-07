# AZR-364 Observation Overlay Evidence

Date: 2026-06-07

## Scope

This slice tightens the AZR-364 observation overlay visual gate. The browser
visual harness now includes an `overlay-visible` orbit case that activates the
population observation overlay and proves the WebGL globe shader consumes the
overlay texture.

## Optimization Gate

- Bottleneck targeted: browser visual evidence did not prove active observation
  overlays in the `file://` WebGL path.
- Representation or lifecycle boundary changed: aggregate observation samples
  become one GPU overlay texture; organisms and fields remain authoritative
  simulation state.
- Chunk, batch, or aggregate boundary: one world-grid overlay texture upload per
  active overlay signature.
- Readiness state: the overlay id must be active, the overlay texture uploaded,
  and the completed frame must report WebGL2 compositor evidence before the
  generated overlay is accepted.
- Player-perception contract: far zoom can show population/resource/field
  pressure without local entity clutter or blocking planet navigation.
- New constraint or encoding limit: overlay texture resolution is the current
  `WORLD_WIDTH x WORLD_HEIGHT` tile grid, and active overlay signatures control
  reuse.
- Metric proving the bottleneck moved: `overlay-visible` asserts active
  `observation.population`, `webgl2` compositor, nonzero overlay uploads, and
  nonzero sampled overlay cells.

## Evidence

`node tests/visual/screenshot.test.js`

- Direct `file://` browser smoke passed.
- `overlay-visible`: orbit band, diff `0`, dark pixels `0.6148`.
- Visual inspection confirmed a visible population-pressure patch on the globe.
- Wheel/drag interaction: zoom `2 -> 2.25`, moved `true`.
- Continuous zoom sweep: bands `continent`, `local`, `planet`, `region`,
  `settlement`; average `9.121ms`, peak `14.3ms`.
- 100-frame visual loop: average `13.368ms`, peak `26.4ms`.

Additional checks:

- `node tests/renderer-interface.test.js`: passed.
- `node tests/observation-overlays.test.js`: passed.
- `node tests/visual-quality-gate.test.js`: passed.

## Notes

Linear AZR-637 could not be fetched or updated in this run because the Linear
connector returned `token_expired`.
