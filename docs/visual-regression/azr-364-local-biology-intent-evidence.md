# AZR-364 Local Biology Intent Evidence

Date: 2026-06-07

## Scope

This slice tightens the AZR-364 local zoom visual gate for representative
biology. The `entities-visible` browser fixture now seeds a watched organism,
a nearby food facade, and a selected representative intent record so the
local view proves organisms, food, behavior cues, and target cues together.

## Optimization Gate

- Bottleneck targeted: local-band evidence did not prove behavior and target
  cues for watched representative organisms.
- Representation or lifecycle boundary changed: the visual gate now consumes
  watcher-facing representative intent facades derived from representative
  records; aggregate biology remains authoritative.
- Chunk, batch, or aggregate boundary: WebGL2 entity atlas instance batches,
  specifically the capped representative intent batch.
- Readiness state: data is consumed only after the selected representative and
  food facade exist and a completed `file://` draw frame reports nonzero
  organism, food, and intent draw counts.
- Player-perception contract: local zoom shows what watched life is doing and
  what it is targeting without drawing uncapped behavior labels everywhere.
- New constraint or encoding limit: representative intent markers remain capped
  by `CONFIG.PLANET_REPRESENTATIVE_INTENT_MAX_MARKERS`.
- Metric proving the bottleneck moved: `entities-visible` now asserts nonzero
  `organismEntityDraws`, `foodEntityDraws`, and `intentEntityDraws`, plus a
  preserved `foraging` behavior and `food` target.

## Evidence

`node tests/visual/screenshot.test.js`

- Direct `file://` browser smoke passed.
- `entities-visible`: local band, diff `0`, dark pixels `0.0049`.
- Wheel/drag interaction: zoom `2 -> 2.25`, moved `true`.
- Continuous zoom sweep: bands `continent`, `local`, `planet`, `region`,
  `settlement`; average `9.362ms`, peak `16.8ms`.
- 100-frame visual loop: average `13.12ms`, peak `18.4ms`.

Additional checks:

- `node tests/entity-webgl.test.js`: passed.
- `node tests/visual-quality-gate.test.js`: passed.
- `node tests/planet-zoom-anchor.test.js`: passed.
- `node tests/globe-interaction.test.js`: passed.
- `node tests/observation-overlays.test.js`: passed.
- `node tests/no-canvas2d-source.test.js`: passed.
- `node tests/no-canvas2d-runtime.test.js`: passed.
- `npm test`: passed.
- `rg -n "agent-studio|tools/agent-studio" index.html js`: no matches.
- `rg -n "getContext\\(['\\\"]2d|CanvasRenderingContext2D|canvas2d|Canvas2D|drawImage\\(" index.html js config.js`: no matches.

## Notes

Linear AZR-637 could not be fetched or updated in this run because the Linear
connector returned `token_expired`.
