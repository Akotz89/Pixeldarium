# Pixeldarium — Codex Project Instructions

## Validation

Run `bash .codex/setup.sh` before committing. It checks:
- `node --check` on all JS files (syntax validation)
- `git diff --check` (whitespace errors)
- Line ending consistency (must be LF)

## Architecture Constraints

Read [AGENTS.md](../AGENTS.md) for the 7 mandatory architecture decisions (D1-D7).
Key constraints that affect every edit:

1. **PS.* namespace** — All functions must be under `var PS = {};` namespace
2. **No ES modules** — Use `<script>` tags, not import/export
3. **Files < 500 lines** — Split if approaching limit
4. **var only** — Use `var`, not `let` or `const` (broadest compat)
5. **Hard crash on errors** — Use `PS.assert()`, never silently swallow
6. **No dependencies** — No npm, no CDN, no frameworks

## File Structure (Post-E0)

```
js/core/    — namespace, config, events, assert, log, math
js/render/  — webgl, shaders, camera, globe, terrain, entities
js/sim/     — loop, world, organisms, food, terrain
js/layers/  — geology, atmosphere, ocean, biosphere
js/spatial/ — grid, chunks, queries
js/epochs/  — registry, epoch-*.js
js/ui/      — hud, menu, panels, inspect
js/persist/ — save, load, migrate
```

## Testing

- Tests in `tests/` directory
- Syntax validation: `node --check <file>`
- Browser smoke tests for runtime behavior
- Deterministic: same seed must produce same results

## Save Format

See [docs/save-format.md](../docs/save-format.md) for the persistence schema.
Current version: 1. Do not change save format without version bump.

## Linear Integration

- All work tracked under AZR team, Pixeldarium project
- Branch naming: `aaronkotz89/azr-NNN-description`
- Epics: AZR-254 to AZR-267
- Stories: AZR-268 to AZR-339
