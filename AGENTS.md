# Pixeldarium — Agent Instructions

## Project Identity

Pixeldarium is a planet-scale pixel simulation engine. Song of Syx-inspired,
running primordial→galactic civilization in pure HTML/CSS/JS. No frameworks,
no server, runs from `file://` protocol.

## Architecture Decisions (Mandatory)

These 7 decisions are locked. Do not deviate without explicit user approval.

### D1: WebGL2 Raw API
All rendering MUST use WebGL2 (`canvas.getContext("webgl2")`). No Canvas 2D
for simulation rendering. No Three.js, PixiJS, or abstractions.

### D2: Decoupled Accumulator Loop
Fixed-timestep simulation at 60 TPS, decoupled from render via accumulator
pattern. Never tie sim updates to `requestAnimationFrame` rate.

### D3: Typed Arrays for Mass Entities
Organisms, food, particles use `Float32Array`/`Uint16Array` struct-of-arrays.
Complex entities (settlements, star systems) use classes.

### D4: PS.* Namespace + Script Tags
All code under `var PS = {};` namespace. Load via `<script>` tags. No ES
modules, no bundler, no import/export. Pattern: `PS.subsystem.method()`.

### D5: Centralized State + Event Bus
Single `PS.world` state object. All cross-system communication via
`PS.events.emit()` / `PS.events.on()`. No direct cross-file function calls
for state changes.

### D6: Epoch Registry with Always-On Layers
Geological and atmospheric layers run in ALL epochs. Epoch-specific systems
register via `PS.epochs.register()`. No hardcoded era if/else chains.

### D7: Chunk-Aligned Spatial Indexing
Spatial index chunks must align with render tile boundaries. Queries return
chunk-local results.

## File Structure

```
js/
  core/       namespace.js, config.js, events.js, assert.js, log.js, math.js
  render/     webgl.js, shaders.js, camera.js, globe.js, terrain.js, entities.js
  sim/        loop.js, world.js, organisms.js, food.js, terrain.js
  layers/     geology.js, atmosphere.js, ocean.js, biosphere.js
  spatial/    grid.js, chunks.js, queries.js
  epochs/     registry.js, epoch-*.js
  ui/         hud.js, menu.js, panels.js, inspect.js
  persist/    save.js, load.js, migrate.js
```

## Coding Conventions

- All files < 500 lines
- All functions in `PS.*` namespace
- Use `var` (not `let`/`const`) for broadest browser compat
- Seeded deterministic RNG via `PS.math.random()`
- Errors must hard crash: `PS.assert(condition, message)` pauses sim and throws
- No silent fails, no try/catch swallowing errors

## Error Philosophy

If the sim is failing, it MUST hard crash and error loudly. No silent
degradation. The debug panel (`#debug-output`) must show the full error.

## Testing

- Tests go in `tests/` directory
- Run with `node --check` for syntax validation
- Browser-based smoke tests for runtime verification
- Tests must verify deterministic behavior for same seed

## Antigravity Command Safety

Antigravity `run_command` must not use inline WSL/bash loops such as
`wsl ... bash -c "for f in ...; do node --check $f; done"`. That command
shape is fragile because Windows/PowerShell layers can expand bash variables
before WSL receives them. Put multi-step bash bodies in a checked-in or scratch
`.sh` file and run `wsl -d Ubuntu-24.04 -- bash /mnt/c/.../script.sh`.

## Constraints

- Must work from `file://` protocol (no server required)
- No npm, no node_modules, no build step
- No external CDN dependencies
- GitHub Pages deploys from main branch root

## Planning Artifacts

All planning documents: `skills/planning-artifacts/gdds/gdd-Pixeldarium-2026-06-01/`
- `gdd.md` — Game Design Document
- `game-architecture.md` — Architecture blueprint
- `linear-stories.md` — Story specifications
- `epics.md` — Epic overview
- `decision-log.md` — Decision rationale

## Linear Integration

- Project: Pixeldarium (AZR team)
- Epics: AZR-254 to AZR-267 (E0-E13)
- Stories: AZR-268 to AZR-339
- Branch naming: `aaronkotz89/azr-NNN-title`
