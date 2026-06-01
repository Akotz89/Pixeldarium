# Changelog

All notable changes to PixelSim will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Professional GitHub setup: README, issue templates, PR template, CI, CONTRIBUTING
- `docs/baseline.md` — Pre-restructure codebase metrics and performance baseline
- `docs/save-format.md` — Persistence schema version 1 documentation
- `docs/index.md` — Planning artifact index
- `.codex/setup.sh` — AI agent validation script
- `.codex/instructions.md` — AI agent project instructions
- `.gitattributes` — Git-enforced LF line endings
- `.editorconfig` — Editor configuration (LF, UTF-8, 2-space indent)
- `.github/workflows/validate.yml` — CI syntax validation on push/PR
- `CONTRIBUTING.md` — Contribution guidelines
- `SECURITY.md` — Security policy
- `CODE_OF_CONDUCT.md` — Community standards
- `CHANGELOG.md` — This file
- `AGENTS.md` — AI agent architecture instructions (D1–D7)
- `CONFIG.SAVE_FORMAT_VERSION` constant for migration planning

### Changed
- README rewritten with professional formatting, badges, screenshots, and architecture overview
- Line endings normalized to LF across all source files

### Removed
- `readme.txt` (replaced by `README.md`)
- Stale remote branch `aaronkotz89/pixelsim-spherical-mechanics`

## [0.1.0] — 2026-06-01

### Added
- Initial Canvas 2D planet-scale simulation engine
- Earth-scale procedural planet with 8-level zoom (globe → 1 meter)
- Organism ecosystem with heritable traits and natural selection
- Lineage tracking with speciation and extinction
- Settlement → colony → space → galactic empire progression chain
- 12-epoch civilization arc
- IndexedDB persistence with save/load
- JSON export/import
- Spherical planet projection with subcell terrain texturing
- GitHub Pages deployment

---

[Unreleased]: https://github.com/Akotz89/PixelSim/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Akotz89/PixelSim/releases/tag/v0.1.0
