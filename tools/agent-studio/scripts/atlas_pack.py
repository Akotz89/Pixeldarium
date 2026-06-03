#!/usr/bin/env python3
"""atlas_pack.py — Pack animation frames into sprite sheet + JSON atlas.

Part of the Pixeldarium agent-studio post-processing pipeline.
Step 5: Packs individual frame PNGs into a single sprite sheet image
and generates a JSON atlas compatible with verify-sprite-sheet.js.

Usage:
    python atlas_pack.py input_dir/ output.png --atlas output.json
    python atlas_pack.py input_dir/ output.png --atlas output.json --cols 4
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("ERROR: Pillow is required. Install: pip install Pillow")


def pack_atlas(
    input_dir: Path,
    output_image: Path,
    output_atlas: Path,
    *,
    cols: int | None = None,
    frame_duration: int = 100,
    padding: int = 0,
) -> dict:
    """Pack all PNGs in input_dir into a sprite sheet with JSON atlas.

    Files are sorted by name. The atlas format is compatible with
    verify-sprite-sheet.js (array of frames with x, y, w, h).

    Args:
        input_dir: Directory containing frame PNGs
        output_image: Path to write the sprite sheet PNG
        output_atlas: Path to write the JSON atlas
        cols: Number of columns (auto-calculated if None)
        frame_duration: Duration per frame in ms
        padding: Pixels between frames
    """
    files = sorted(input_dir.glob("*.png"))
    if not files:
        raise ValueError(f"No .png files found in {input_dir}")

    # Load all frames and verify consistent size
    frames: list[Image.Image] = []
    for f in files:
        img = Image.open(f)
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        frames.append(img)

    # Verify all frames are the same size
    fw, fh = frames[0].size
    for i, frame in enumerate(frames):
        if frame.size != (fw, fh):
            raise ValueError(
                f"Frame {files[i].name} is {frame.size[0]}x{frame.size[1]}, "
                f"expected {fw}x{fh}. All frames must be the same size."
            )

    n = len(frames)

    # Auto-calculate grid layout
    if cols is None:
        cols = math.ceil(math.sqrt(n))
    rows = math.ceil(n / cols)

    # Create sheet
    sheet_w = cols * fw + (cols - 1) * padding
    sheet_h = rows * fh + (rows - 1) * padding
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    # Place frames and build atlas
    atlas_frames: list[dict] = []
    for i, frame in enumerate(frames):
        col = i % cols
        row = i // cols
        x = col * (fw + padding)
        y = row * (fh + padding)

        sheet.paste(frame, (x, y))
        atlas_frames.append({
            "filename": files[i].stem,
            "frame": {"x": x, "y": y, "w": fw, "h": fh},
            "duration": frame_duration,
        })

    # Save sheet
    output_image.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_image, format="PNG")

    # Save atlas (compatible with verify-sprite-sheet.js normalizeFrames)
    atlas = {
        "frames": atlas_frames,
        "meta": {
            "image": output_image.name,
            "size": {"w": sheet_w, "h": sheet_h},
            "frameSize": {"w": fw, "h": fh},
            "frameCount": n,
            "columns": cols,
            "rows": rows,
            "padding": padding,
            "frameDuration": frame_duration,
            "generator": "pixeldarium-agent-studio/atlas_pack.py",
        },
    }
    output_atlas.parent.mkdir(parents=True, exist_ok=True)
    output_atlas.write_text(json.dumps(atlas, indent=2) + "\n")

    return {
        "input_dir": str(input_dir),
        "output_image": str(output_image),
        "output_atlas": str(output_atlas),
        "frame_count": n,
        "frame_size": [fw, fh],
        "sheet_size": [sheet_w, sheet_h],
        "layout": f"{cols}x{rows}",
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pack animation frames into sprite sheet + JSON atlas"
    )
    parser.add_argument("input", help="Directory containing frame PNGs")
    parser.add_argument("output", help="Output sprite sheet PNG path")
    parser.add_argument(
        "--atlas", required=True, help="Output JSON atlas path"
    )
    parser.add_argument(
        "--cols",
        type=int,
        default=None,
        help="Number of columns (auto-calculated if omitted)",
    )
    parser.add_argument(
        "--frame-duration",
        type=int,
        default=100,
        help="Duration per frame in ms. Default: 100",
    )
    parser.add_argument(
        "--padding",
        type=int,
        default=0,
        help="Padding between frames in pixels. Default: 0",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.is_dir():
        sys.exit(f"ERROR: {input_path} is not a directory")

    result = pack_atlas(
        input_path,
        Path(args.output),
        Path(args.atlas),
        cols=args.cols,
        frame_duration=args.frame_duration,
        padding=args.padding,
    )

    print(
        f"Packed {result['frame_count']} frames "
        f"({result['frame_size'][0]}x{result['frame_size'][1]}) "
        f"→ {result['layout']} grid "
        f"({result['sheet_size'][0]}x{result['sheet_size'][1]})\n"
        f"  Sheet: {result['output_image']}\n"
        f"  Atlas: {result['output_atlas']}"
    )


if __name__ == "__main__":
    main()
