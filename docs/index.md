# PixelSim Documentation Index

## In-Repo Documentation

| Document | Path | Description |
|----------|------|-------------|
| [README](../README.md) | `README.md` | Project overview and how to run |
| [AGENTS.md](../AGENTS.md) | `AGENTS.md` | Agent instructions with D1-D7 architecture decisions |
| [Baseline](baseline.md) | `docs/baseline.md` | Pre-restructure codebase metrics (19,484 lines, 773 functions) |
| [Save Format](save-format.md) | `docs/save-format.md` | Persistence schema version 1 |

## Planning Artifacts

All planning documents live in `skills/planning-artifacts/gdds/gdd-PixelSim-2026-06-01/`:

| Document | Size | Description |
|----------|------|-------------|
| [GDD](../../skills/planning-artifacts/gdds/gdd-PixelSim-2026-06-01/gdd.md) | 40KB | Game Design Document — 12 epochs, 5 pillars, Song of Syx inspiration |
| [Architecture](../../skills/planning-artifacts/gdds/gdd-PixelSim-2026-06-01/game-architecture.md) | 33KB | Architecture blueprint — 7 decisions (D1-D7), 8 patterns, 45+ file structure |
| [Story Specs](../../skills/planning-artifacts/gdds/gdd-PixelSim-2026-06-01/linear-stories.md) | 38KB | Full specifications for all 72 stories |
| [Epics](../../skills/planning-artifacts/gdds/gdd-PixelSim-2026-06-01/epics.md) | 11KB | 14 epic overview with phase mapping and blocking graph |
| [Decision Log](../../skills/planning-artifacts/gdds/gdd-PixelSim-2026-06-01/decision-log.md) | 14KB | Architecture decision rationale |

## Configuration

| File | Path | Description |
|------|------|-------------|
| [.editorconfig](../.editorconfig) | `.editorconfig` | LF line endings, UTF-8, 2-space indent |
| [.gitattributes](../.gitattributes) | `.gitattributes` | Git-enforced LF line endings |
| [Codex Setup](.codex/setup.sh) | `.codex/setup.sh` | Validation script (node --check, whitespace, line endings) |
| [Codex Instructions](.codex/instructions.md) | `.codex/instructions.md` | Codex-specific project rules |
| [GitHub Pages](../.github/workflows/pages.yml) | `.github/workflows/pages.yml` | Auto-deploy main to GitHub Pages |

## Linear Project

- **Project:** [PixelSim](https://linear.app/openclaw-mock-up/project/pixelsim-fd2791715086)
- **Team:** Azyrra (AZR)
- **Epics:** AZR-254 to AZR-267 (14 epics, E0-E13)
- **Stories:** AZR-268 to AZR-339 (72 stories)
- **Milestones:** Phase 1-5

## Critical Path

```
E0 (Project Restructure) → E1 (Planet Rendering), E2 (Performance)
E1 + E2 → E3 (Bio Sim), E4 (Primordial), E7 (Cosmological)
E3 → E5 (Intelligence)
E5 → E6 (Civilization)
E6 + E7 → E8 (Space)
E8 → E11 (Transcendence)
```

**Entry point:** AZR-268 (E0-S1: PS namespace + core infrastructure)
