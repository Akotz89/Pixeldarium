# AZR-364 Orbit Event Marker Evidence

Date: 2026-06-07

## Scope

This slice tightens the AZR-364 orbit visual gate. Orbit view now proves
located watcher events through bounded WebGL2 event marker facades derived from
`world.timelineEvents`.

## Optimization Gate

- Bottleneck targeted: orbit-band evidence did not prove event markers on the
  globe, leaving broad watcher causality invisible at the farthest zoom.
- Representation or lifecycle boundary changed: located timeline events become
  watcher-facing marker facades; simulation event records remain the source of
  truth.
- Chunk, batch, or aggregate boundary: a capped WebGL2 entity-atlas event marker
  batch grouped by atlas page.
- Readiness state: only normalized timeline events with latitude/longitude or
  tile-derived locations are consumed; unlocated events remain in history but
  do not draw markers.
- Player-perception contract: orbit keeps the whole planet visible while adding
  small category/severity markers for recent causal events.
- New constraint or encoding limit: `PLANET_ORBIT_EVENT_MARKER_MAX_MARKERS = 24`
  plus bounded category buckets `0..4` and severity buckets `0..2`.
- Metric proving the bottleneck moved: `orbit-view` now asserts nonzero
  `orbitEventMarkerDraws`, with a refreshed orbit golden showing globe and
  marker pixels together.

## Evidence

`node tests/visual/screenshot.test.js`

- Direct `file://` browser smoke passed.
- `orbit-view`: orbit band, diff `0`, dark pixels `0.6148`.
- Wheel/drag interaction: zoom `2 -> 2.25`, moved `true`.
- Continuous zoom sweep: bands `continent`, `local`, `planet`, `region`,
  `settlement`; average `10.058ms`, peak `16.8ms`.
- 100-frame visual loop: average `13.849ms`, peak `21.3ms`.
- Visual inspection confirmed the globe remains visible with event markers.

Additional checks:

- `node tests/entity-atlas.test.js`: passed.
- `node tests/entity-webgl.test.js`: passed.
- `node tests/renderer-interface.test.js`: passed.
- `node tests/visual-quality-gate.test.js`: passed.

## Notes

Linear AZR-637 could not be fetched or updated in this run because the Linear
connector returned `token_expired`.
