# AZR-480 Renderer Palette Registry Evidence

Date: 2026-06-06

## Optimization Gate

- Bottleneck targeted: renderer-local color literals made the asset/palette registry dead code, blocking coherent art passes and palette swaps without editing render modules.
- Representation or lifecycle boundary changed: terrain palette colors now live in `PS.assets` and flow into render-time hex colors, packed biome lookup tables, surface-color packed constants, and generated atlas cell pixels.
- Chunk, batch, or aggregate boundary used: existing WebGL terrain/entity atlas batches are unchanged; palette colors are cached at renderer palette-version boundaries before per-cell or per-instance work.
- Readiness state required before generated data is consumed: default palettes are registered synchronously before render modules load; palette re-registration increments a version and render caches refresh before use.
- Player-perception contract preserved: direct `file://` startup, single WebGL2 canvas, zoom behavior, and existing relief/feature shading remain intact while art direction becomes palette-driven.
- New constraint or encoding limit introduced: terrain palette keys currently cover `forest`, `grassland`, `desert`, `wetland`, `mountain`, `barren`, `tundra`, `ice`, and `ocean`; aliases such as `mountains` resolve to canonical keys.
- Metric proving the bottleneck moved: direct `file://` runtime probe changed `forest` from `#123f23` to `#225511`, refreshed packed forest from `1195811` to `2250001`, changed packed woodland surface from `1195041` to `2117649`, and generated a terrain atlas cell after the palette version advanced to `2`.

## Direct File Smoke

Target: `file:///C:/Users/Aaron/Azyrra/projects/pixeldarium/index.html`

- Page errors: `0`
- Failed requests: `0`
- Debug text: empty
- WebGL2 ready: `true`
- Visible canvas count: `1`
- Wheel zoom: `0 -> 0.25`
- Palette version after re-registration: `2`
- Forest color: `#123f23 -> #225511`
- Forest packed color: `1195811 -> 2250001`
- Woodland packed surface color: `1195041 -> 2117649`
- Generated atlas cell: `terrain.forest_floor.1.plain.feature.canopy.3.bio0.civ0`
- Atlas center pixel after palette swap: `[0, 36, 0, 255]`

## Verification Commands

```bash
node tests/render-palette-registry.test.js
npm test
npm run build
git diff --check
node tests/no-canvas2d-source.test.js && node tests/no-canvas2d-runtime.test.js
rg -n "agent-studio|tools/agent-studio" index.html js
```

The final `rg` command returned no matches.
