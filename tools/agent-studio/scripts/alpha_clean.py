#!/usr/bin/env python3
"""alpha_clean.py — Threshold alpha channel to binary (0 or 255).

Part of the Pixeldarium agent-studio post-processing pipeline.
Step 4: AI models often produce semi-transparent fringe pixels that
look wrong at low resolution. This script forces binary alpha.

Usage:
    python alpha_clean.py input.png output.png [--threshold 128]
    python alpha_clean.py --batch input_dir/ output_dir/ [--threshold 128]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    sys.exit("ERROR: Pillow and numpy required. Install: pip install Pillow numpy")


def alpha_clean(
    src: Path, dst: Path, threshold: int = 128
) -> dict:
    """Force binary alpha on a sprite image.

    Pixels with alpha >= threshold become fully opaque (255).
    Pixels with alpha < threshold become fully transparent (0),
    and their RGB channels are zeroed to prevent data leaks.
    """
    img = Image.open(src)
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    data = np.array(img)
    alpha = data[:, :, 3]

    # Count semi-transparent pixels (not 0 and not 255)
    semi_transparent = int(np.sum((alpha > 0) & (alpha < 255)))
    cleaned_to_opaque = int(np.sum((alpha >= threshold) & (alpha < 255)))
    cleaned_to_transparent = int(np.sum((alpha < threshold) & (alpha > 0)))

    # Apply threshold
    opaque_mask = alpha >= threshold
    transparent_mask = ~opaque_mask

    # Opaque pixels: set alpha to 255
    data[opaque_mask, 3] = 255

    # Transparent pixels: zero everything (prevents color bleed)
    data[transparent_mask] = [0, 0, 0, 0]

    result = Image.fromarray(data, "RGBA")
    dst.parent.mkdir(parents=True, exist_ok=True)
    result.save(dst, format="PNG")

    return {
        "src": str(src),
        "dst": str(dst),
        "threshold": threshold,
        "total_pixels": int(data.shape[0] * data.shape[1]),
        "semi_transparent_input": semi_transparent,
        "cleaned_to_opaque": cleaned_to_opaque,
        "cleaned_to_transparent": cleaned_to_transparent,
    }


def batch_alpha_clean(
    input_dir: Path, output_dir: Path, threshold: int = 128
) -> list[dict]:
    """Alpha-clean all PNGs in input_dir."""
    results: list[dict] = []
    files = sorted(input_dir.glob("*.png"))

    if not files:
        print(f"WARNING: No .png files found in {input_dir}", file=sys.stderr)
        return results

    for src in files:
        dst = output_dir / src.name
        try:
            result = alpha_clean(src, dst, threshold)
            results.append(result)
            print(
                f"  OK  {src.name}: {result['semi_transparent_input']} semi-transparent "
                f"→ {result['cleaned_to_opaque']} opaque, "
                f"{result['cleaned_to_transparent']} transparent"
            )
        except Exception as e:
            results.append({"src": str(src), "error": str(e)})
            print(f"  ERR {src.name}: {e}", file=sys.stderr)

    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Force binary alpha (0 or 255) on sprite images"
    )
    parser.add_argument("input", help="Input file or directory")
    parser.add_argument("output", help="Output file or directory")
    parser.add_argument(
        "--threshold",
        type=int,
        default=128,
        help="Alpha threshold (pixels >= this become opaque). Default: 128",
    )
    parser.add_argument(
        "--batch", action="store_true", help="Process entire directory"
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if args.batch or input_path.is_dir():
        if not input_path.is_dir():
            sys.exit(f"ERROR: {input_path} is not a directory")
        results = batch_alpha_clean(input_path, output_path, args.threshold)
        ok = sum(1 for r in results if "error" not in r)
        print(f"\nAlpha-cleaned {ok} sprites (threshold={args.threshold})")
    else:
        result = alpha_clean(input_path, output_path, args.threshold)
        print(
            f"Alpha-cleaned {result['src']} → {result['dst']}\n"
            f"  Semi-transparent: {result['semi_transparent_input']}\n"
            f"  → Opaque: {result['cleaned_to_opaque']}, "
            f"Transparent: {result['cleaned_to_transparent']}"
        )


if __name__ == "__main__":
    main()
