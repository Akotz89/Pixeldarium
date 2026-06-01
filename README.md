# PixelSim

Planet-scale pixel simulation engine. Watch a primordial planet evolve from
simple life through galactic civilization — all in pure HTML, CSS, and JavaScript.

## How to Run

1. Clone or download the repo
2. Open `index.html` in a modern browser (Chrome/Edge recommended)
3. Works from `file://` protocol — no server needed

## What It Does

- Earth-scale procedural planet with 8-level zoom (globe → 1 meter)
- Deterministic terrain generation from seed
- Organism ecosystem with heritable traits and natural selection
- Lineage tracking and speciation
- Settlement → colony → space → galactic empire progression
- IndexedDB save/load + JSON export/import
- Canvas 2D rendering (WebGL2 migration planned)

## Requirements

- Modern browser with Canvas 2D support
- No Node.js, npm, or external libraries required
- No build step

## Architecture

See [AGENTS.md](AGENTS.md) for architecture decisions and coding conventions.
See `skills/planning-artifacts/gdds/gdd-PixelSim-2026-06-01/` for full planning docs.

## License

Private project.