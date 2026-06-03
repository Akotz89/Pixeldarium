# Pixeldarium Prompt Templates — Agent Studio

These templates produce consistent pixel art for the Pixeldarium game.
Always use the post-processing pipeline after generation to enforce
palette compliance and grid alignment.

Do not hardcode provider model ids in reusable prompt templates. Choose the
provider, model, endpoint, and live/dry-run mode in a reviewed job JSON and run
that job through an approved adapter such as `run-openai-image-job.js`,
`run-pixellab-job.js`, `run-comfy-workflow.js`, or `run-aseprite-export.js`.

## Usage

1. Pick the appropriate template below
2. Replace `{placeholders}` with specific values
3. Generate through an approved adapter at the specified canvas size
4. Run `pipeline_runner.py` on the output
5. Validate with `verify-sprite-sheet.js`

---

## Template: Terrain Tileset

**Canvas:** 256×256 (16×16 grid of 16px tiles)
**Background:** transparent

```
Create a 256×256 pixel art tileset sprite sheet on a transparent background.
The sheet contains a 16×16 grid of 16×16 pixel tiles for a {biome_type} biome.

Include tiles for:
- Base ground (4 variants)
- Ground with {feature_1} (4 variants)
- Ground with {feature_2} (4 variants)
- Edge/transition tiles (top, bottom, left, right, corners = 12 tiles)
- Special feature tiles (4 variants)

Style: Top-down perspective, Songs of Syx inspired, muted earth tones,
low saturation. Each tile must be exactly 16×16 pixels with hard pixel
edges, no anti-aliasing, no sub-pixel rendering. Maximum 24 unique colors.
```

---

## Template: Entity Sprite Sheet (4-directional)

**Canvas:** 128×128 (4 columns × 4 rows of 32×32 frames)
**Background:** transparent

```
Create a 128×128 pixel art sprite sheet on a transparent background.
The sheet shows a {entity_type} character in 4 directions (down, left,
right, up) with 4 animation frames each.

Layout: 4 columns (frames) × 4 rows (directions: down, left, right, up).
Each frame is exactly 32×32 pixels.

Row 1: facing down, 4 walk cycle frames
Row 2: facing left, 4 walk cycle frames
Row 3: facing right, 4 walk cycle frames
Row 4: facing up, 4 walk cycle frames

Style: {entity_description}. Songs of Syx inspired pixel art, top-down
3/4 perspective, muted palette, hard pixel edges. No anti-aliasing.
Maximum 16 unique colors per entity.
```

---

## Template: Building/Structure

**Canvas:** 64×64 (single building) or 256×128 (building set)
**Background:** transparent

```
Create a {canvas_size} pixel art sprite on a transparent background.
This is a {building_type} building for a {era} era settlement.

The building should be drawn in top-down 3/4 perspective, showing the
roof and front face. Size: {width}×{height} pixels.

Style: Songs of Syx inspired, muted earth tones, wood and stone
materials, low saturation pixel art. Hard pixel edges, no anti-aliasing.
Maximum 20 unique colors.
```

---

## Template: UI Icons

**Canvas:** 256×32 (8 icons × 32px each)
**Background:** transparent

```
Create a 256×32 pixel art icon strip on a transparent background.
The strip contains 8 icons, each exactly 32×32 pixels, arranged
horizontally.

Icons (left to right):
1. {icon_1}
2. {icon_2}
3. {icon_3}
4. {icon_4}
5. {icon_5}
6. {icon_6}
7. {icon_7}
8. {icon_8}

Style: Clean pixel art icons, 1px outline, muted palette matching
the Pixeldarium art bible. Each icon uses maximum 8 unique colors.
Hard pixel edges, no anti-aliasing, no gradients.
```

---

## Template: Organism/Creature

**Canvas:** 64×64 (single) or 128×64 (with animation)
**Background:** transparent

```
Create a {canvas_size} pixel art sprite on a transparent background.
This is a {organism_type} from the {epoch} epoch of planetary evolution.

{organism_description}

The sprite should be {sprite_width}×{sprite_height} pixels, centered
on the canvas. If animated, show {frame_count} frames arranged
horizontally, each {sprite_width}×{sprite_height} pixels.

Style: Top-down 3/4 perspective, Songs of Syx inspired, biological
and organic forms, muted natural colors. Hard pixel edges, no
anti-aliasing. Maximum 12 unique colors per organism.
```

---

## Palette Reference

When prompting, you can reference these dominant color families
from `source/pixeldarium-palette.json`:

- **Terrain:** deep earth (#3B2507), warm soil (#6B4226), dry sand (#C9A96E)
- **Vegetation:** dark forest (#2D4A22), leaf green (#5B8C3E), moss (#8BAA6B)
- **Water:** deep ocean (#1B3A5C), shallow (#3B7CB8), ice (#B8D4E8)
- **Stone:** dark rock (#4A4A4A), granite (#7A7A7A), light stone (#A8A8A8)
- **Life:** blood (#8B2020), warm flesh (#C4855C), bone (#D4C5A0)
- **Sky/Atmosphere:** night (#0D1B2A), dusk (#2E1A47), glow (#E8C547)
