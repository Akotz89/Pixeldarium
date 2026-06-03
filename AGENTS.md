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

## Runtime Constraints

- Must work from `file://` protocol (no server required)
- No npm, no node_modules, no build step
- No external CDN dependencies
- GitHub Pages deploys from main branch root

## AI Game Studio (`tools/agent-studio/`)

The agent studio is the AI-controlled asset production pipeline. It lives
entirely outside the game runtime. **Runtime is zero-dependency; tooling can
use anything.**

### Architecture Boundary

```
tools/agent-studio/           ← Tooling (Node, Python, external APIs)
  ├── scripts/                ← Python post-processing pipeline
  ├── source/                 ← Art bible palette, style references
  ├── templates/              ← Prompt templates for AI generation
  ├── exports/                ← Raw AI output (NOT runtime)
  ├── work-orders/            ← Structured generation requests
  ├── reports/                ← QA evidence, dashboards
  ├── pipeline.manifest.json  ← Tool/lane discovery for agents
  └── *.js                    ← Adapter scripts (Node.js)

js/                           ← Runtime (zero-dependency, PS.* namespace)
assets/                       ← Runtime-integrated sprites/audio
```

**NEVER** import tooling scripts, Node modules, or Python into the game
runtime. The runtime boundary is enforced by `validate-pipeline.js`.

### Post-Processing Pipeline (Python)

All AI-generated sprites MUST pass through the post-processing pipeline
before runtime integration. The pipeline is at `tools/agent-studio/scripts/`:

| Step | Script | Purpose |
|---|---|---|
| 1 | `normalize_sprite.py` | Strip metadata, force RGBA PNG |
| 2 | `grid_snap.py` | Nearest-neighbor snap to pixel grid |
| 3 | `palette_snap.py` | Quantize to art bible palette via CIELAB ΔE |
| 4 | `alpha_clean.py` | Threshold alpha, remove fringes |
| 5 | `atlas_pack.py` | Pack frames → sprite sheet + JSON atlas |

Run the full pipeline:
```bash
python3 tools/agent-studio/scripts/pipeline_runner.py \
  --input exports/raw-sprite.png \
  --palette source/pixeldarium-palette.json \
  --output exports/processed/ \
  --tile-size 16
```

Validate output:
```bash
node tools/agent-studio/verify-sprite-sheet.js exports/processed/sprite-sheet.png
```

**Dependencies:** Python 3.10+, Pillow, NumPy (tooling only, not runtime).

### Art Bible & Palette

- Palette: `tools/agent-studio/source/pixeldarium-palette.json` (24 colors)
- All generated sprites MUST use only these 24 colors after post-processing
- Tile sizes: 16×16 (terrain), 16×32 (entities), 32×32 (buildings)
- Style: Songs of Syx-inspired, low-res pixel art, limited palette

### Prompt Templates

When generating sprites with `gpt-image-2` or PixelLab, use the prompt
templates at `tools/agent-studio/templates/` for consistent output.
Templates encode: canvas size, background transparency, palette constraints,
animation frame layout, and art direction.

### Generation Workflow

1. Create work order (`create-work-order.js`) or use prompt template
2. Generate raw sprite (gpt-image-2 / PixelLab / Aseprite)
3. Post-process (`pipeline_runner.py` — normalize → grid → palette → alpha → pack)
4. Validate (`verify-sprite-sheet.js` — format, bounds, color count)
5. Score acceptance (`score-asset-acceptance.js` — palette compliance, readability)
6. Integrate into runtime (manual gate — update `PS.assets`, add to `index.html`)

### MCP Tools Available

#### Sprite & Asset Generation
- **PixelLab** (`pixellab`) — 4/8-direction characters, tilesets, animations,
  map objects, rotations, inpaint. See `tools/agent-studio/docs/pixellab-api-reference.md`.
  Env: `PIXELLAB_API_KEY`
- **SpriteCook** (`spritecook`) — Agent-driven sprite generation, smart cropping,
  animation, style consistency. Env: `SPRITECOOK_API_KEY`
- **pixel-mcp** (`pixel-mcp`) — Aseprite integration for pixel-perfect editing,
  palette management, animation via natural language. Needs Aseprite installed.
- **gpt-image-2** — Built-in Codex image generation (when available)

#### Audio & Music
- **ElevenLabs** (`elevenlabs`) — Voice synthesis, music generation, sound
  effects. Studio quality. Env: `ELEVENLABS_API_KEY`

#### Project Management
- **Hindsight** (`local-hindsight`) — Recall prior art decisions, style notes
- **Linear** — Track generation issues under AZR epic structure
- **GitHub** — Push commits, create PRs

#### API Key Setup
Set environment variables at User level (persist across sessions):
```powershell
[System.Environment]::SetEnvironmentVariable("PIXELLAB_API_KEY", "your-key", "User")
[System.Environment]::SetEnvironmentVariable("SPRITECOOK_API_KEY", "your-key", "User")
[System.Environment]::SetEnvironmentVariable("ELEVENLABS_API_KEY", "your-key", "User")
```

## Planning Artifacts

All planning documents: `skills/planning-artifacts/gdds/gdd-Pixeldarium-2026-06-01/`
- `gdd.md` — Game Design Document
- `game-architecture.md` — Architecture blueprint
- `linear-stories.md` — Story specifications
- `epics.md` — Epic overview
- `decision-log.md` — Decision rationale

## Linear Integration

- Project: Pixeldarium (AZR team)
- Epics: AZR-254 to AZR-267 (E0-E13), AZR-404 (AI Pipeline Tooling)
- Stories: AZR-268 to AZR-339
- Pipeline issues: AZR-414 to AZR-417
- Branch naming: `aaronkotz89/azr-NNN-title`
