# Pixel Lab API Reference (v2)

> REST API for generating game-ready pixel art: characters with 4 or 8 directional
> rotations, animations, tilesets, isometric tiles, map objects, and image editing
> (inpaint, rotate, resize, style transfer). Outputs are made for direct import
> into game engines.

Base URL: `https://api.pixellab.ai/v2`
Auth: `Authorization: Bearer YOUR_API_TOKEN`
Most generation endpoints are **asynchronous** — they return a job id you poll.

## SDKs
- [Python SDK](https://github.com/pixellab-code/pixellab-python): `pip install pixellab`
- [JavaScript SDK](https://github.com/pixellab-code/pixellab-js)
- [MCP server](https://github.com/pixellab-code/pixellab-mcp)

## Key Endpoints for Pixeldarium

### Characters (most useful for entity sprites)
- `POST /create-character-with-4-directions` — 4-directional sprite sheet
- `POST /create-character-with-8-directions` — 8-directional sprite sheet
- `POST /create-character-v3` — Latest model, 8 rotations
- `POST /animate-character` — Add animation to existing character
- `POST /create-character-state` — Create state variant (idle, attack, etc.)

### Tilesets (terrain generation)
- `POST /create-tileset` — Top-down tileset (async)
- `POST /create-tiles-pro` — Pro tiles (async)
- `GET /tilesets/{tileset_id}` — Get generated tileset

### Map Objects (buildings, trees, resources)
- `POST /map-objects` — Create map object
- `POST /create-1-direction-object` — Single-direction object
- `POST /create-8-direction-object` — 8-direction object
- `POST /objects/{object_id}/animations` — Add animation to object

### Image Operations (post-processing)
- `POST /image-to-pixelart` — Convert image to pixel art
- `POST /resize` — Resize pixel art image
- `POST /remove-background` — Remove background
- `POST /inpaint` — Inpaint image regions

### Rotations (multi-angle from single sprite)
- `POST /generate-8-rotations-v3` — Generate 8 rotations from 1 view
- `POST /rotate` — Rotate character or object

### Animation
- `POST /animate-with-text` — Animate from text description
- `POST /animate-with-skeleton` — Animate using skeleton
- `POST /estimate-skeleton` — Get skeleton from sprite

### Utility
- `GET /balance` — Check remaining credits
- `GET /background-jobs/{job_id}` — Poll async job status

## Workflow for Pixeldarium

1. **Characters**: `create-character-with-4-directions` → `animate-character` → download PNG
2. **Terrain**: `create-tileset` → poll job → download tileset PNG
3. **Buildings**: `create-1-direction-object` → download PNG
4. **Post-process**: Run `pipeline_runner.py` on all downloaded PNGs
5. **Validate**: Run `verify-sprite-sheet.js` on processed output
