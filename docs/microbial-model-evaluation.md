# Microbial Model Evaluation

Date: 2026-06-02

Linear scope: AZR-293.

## Decision

Pixeldarium uses a field/population hybrid for microbial life.

Field state owns the planet-scale microbial ecology:

- Density.
- Chemical energy.
- Oxygen production.
- Environmental stress.
- Bloom intensity.

Population records own notable watcher-facing microbial blooms:

- Named microbial lineage/population record.
- Tile position.
- Bloom intensity.
- Morphology label such as bloom, mat, or stromatolite.
- Visibility marker for planet zoom overlays.

Individual microbe agents are not the default runtime model. They are too small, too numerous, and not legible at watcher scale.

## Prototype Results

| Prototype | Visual quality | Scale performance | Emergent behavior | Decision |
| --- | ---: | ---: | ---: | --- |
| Agent-based individual microbes | 0.35 | 0.12 | 0.42 | Reject |
| Field-based density/chemistry grid | 0.82 | 0.92 | 0.70 | Candidate |
| Population-based group summaries | 0.56 | 0.88 | 0.58 | Candidate |
| Field/population hybrid | 0.86 | 0.89 | 0.76 | Selected |

## Implementation

`js/epochs/microbial.js` implements the selected hybrid:

- Registers the `microbial` epoch with `PS.epochs`.
- Maintains a coarse field grid for density, chemical energy, oxygen production, stress, and bloom intensity.
- Seeds growth from geological hydrothermal and volcanic energy.
- Samples atmospheric temperature and oxygen stress.
- Emits oxygen into the atmosphere through microbial photosynthetic output.
- Promotes the strongest bloom cells into named population records.
- Exposes `visibleBlooms` for planet-scale watcher output.

`observation.microbial` renders microbial blooms as a planet-scale observation overlay. This makes microbial life visible as blooms, mats, and stromatolite-like regions without drawing individual microbes.

## Non-Goals

- Do not create individual microbe agents as the default runtime.
- Do not replace AZR-292 abiogenesis mechanics; first-life thresholds and primordial transition remain separate.
- Do not implement full food-web predator/prey behavior here.
- Do not require final timeline or deep-time UI changes in this issue.
