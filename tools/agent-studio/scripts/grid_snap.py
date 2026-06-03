#!/usr/bin/env python3
"""grid_snap.py — Force pixel-perfect grid alignment via nearest-neighbor.

Part of the Pixeldarium agent-studio post-processing pipeline.
Step 2: AI models often produce sub-pixel artifacts and anti-aliased edges.
This script snaps every pixel to a clean grid using NEAREST sampling only.

Usage:
    python grid_snap.py input.png output.png --size 32x32
    python grid_snap.py --batch input_dir/ output_dir/ --size 32x32
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("ERROR: Pillow is required. Install: pip install Pillow")


def parse_size(size_str: str) -> tuple[int, int]:
    """Parse 'WxH' or 'N' (square) into (width, height)."""
    if "x" in size_str.lower():
        parts = size_str.lower().split("x")
        return int(parts[0]), int(parts[1])
    n = int(size_str)
    return n, n


def grid_snap(
    src: Path, dst: Path, target_size: tuple[int, int]
) -> dict:
    """Snap a sprite to the target grid using nearest-neighbor.

    If the input is already the target size, it's a no-op copy.
    If it's larger, it downscales. If smaller, it upscales.
    Always uses NEAREST to preserve pixel-art crispness.
    """
    img = Image.open(src)
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    original_size = img.size
    w, h = target_size

    if img.size != (w, h):
        img = img.resize((w, h), Image.Resampling.NEAREST)

    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, format="PNG")

    return {
        "src": str(src),
        "dst": str(dst),
        "original_size": list(original_size),
        "target_size": [w, h],
        "resized": original_size != (w, h),
    }


def batch_grid_snap(
    input_dir: Path, output_dir: Path, target_size: tuple[int, int]
) -> list[dict]:
    """Grid-snap all PNG files in input_dir."""
    results: list[dict] = []
    files = sorted(input_dir.glob("*.png"))

    if not files:
        print(f"WARNING: No .png files found in {input_dir}", file=sys.stderr)
        return results

    for src in files:
        dst = output_dir / src.name
        try:
            result = grid_snap(src, dst, target_size)
            status = "resized" if result["resized"] else "ok (already correct)"
            print(f"  {status}: {src.name} → {target_size[0]}x{target_size[1]}")
            results.append(result)
        except Exception as e:
            results.append({"src": str(src), "error": str(e)})
            print(f"  ERR {src.name}: {e}", file=sys.stderr)

    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Grid-snap sprites to target size via nearest-neighbor"
    )
    parser.add_argument("input", help="Input file or directory")
    parser.add_argument("output", help="Output file or directory")
    parser.add_argument(
        "--size",
        required=True,
        help="Target size as WxH (e.g., 32x32) or N for square",
    )
    parser.add_argument(
        "--batch", action="store_true", help="Process entire directory"
    )
    args = parser.parse_args()

    target_size = parse_size(args.size)
    input_path = Path(args.input)
    output_path = Path(args.output)

    if args.batch or input_path.is_dir():
        if not input_path.is_dir():
            sys.exit(f"ERROR: {input_path} is not a directory")
        results = batch_grid_snap(input_path, output_path, target_size)
        resized = sum(1 for r in results if r.get("resized"))
        print(f"\nProcessed {len(results)} sprites ({resized} resized)")
    else:
        result = grid_snap(input_path, output_path, target_size)
        status = "resized" if result["resized"] else "already correct size"
        print(
            f"Grid-snapped {result['src']} → {result['dst']} "
            f"({result['original_size'][0]}x{result['original_size'][1]} → "
            f"{target_size[0]}x{target_size[1]}, {status})"
        )


if __name__ == "__main__":
    main()
