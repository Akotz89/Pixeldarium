#!/usr/bin/env python3
"""normalize_sprite.py — Strip metadata, force RGBA PNG format.

Part of the Pixeldarium agent-studio post-processing pipeline.
Step 1: Takes raw AI-generated images and emits clean RGBA PNGs
with no embedded EXIF/metadata.

Usage:
    python normalize_sprite.py input.png output.png
    python normalize_sprite.py --batch input_dir/ output_dir/
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("ERROR: Pillow is required. Install: pip install Pillow")


VALID_SIZES = {16, 32, 48, 64, 96, 128, 256}


def normalize(src: Path, dst: Path, *, strict_sizes: bool = False) -> dict:
    """Normalize a single sprite image to clean RGBA PNG.

    Returns a dict with metadata about the operation.
    """
    img = Image.open(src)
    original_mode = img.mode
    original_size = img.size

    # Force RGBA regardless of input mode
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    # Strip ALL metadata by creating a new image from pixel data only
    clean = Image.new("RGBA", img.size)
    clean.putdata(list(img.getdata()))

    # Validate dimensions if strict mode
    w, h = clean.size
    warnings: list[str] = []
    if strict_sizes:
        if w not in VALID_SIZES:
            warnings.append(f"width {w} not in valid sizes {sorted(VALID_SIZES)}")
        if h not in VALID_SIZES:
            warnings.append(f"height {h} not in valid sizes {sorted(VALID_SIZES)}")

    if w <= 0 or h <= 0:
        raise ValueError(f"Invalid dimensions: {w}x{h}")

    dst.parent.mkdir(parents=True, exist_ok=True)
    clean.save(dst, format="PNG", optimize=False)

    return {
        "src": str(src),
        "dst": str(dst),
        "original_mode": original_mode,
        "original_size": list(original_size),
        "output_size": [w, h],
        "mode_converted": original_mode != "RGBA",
        "warnings": warnings,
    }


def batch_normalize(
    input_dir: Path, output_dir: Path, *, strict_sizes: bool = False
) -> list[dict]:
    """Normalize all PNG files in input_dir, writing results to output_dir."""
    results: list[dict] = []
    patterns = ["*.png", "*.PNG", "*.jpg", "*.jpeg", "*.bmp", "*.gif", "*.webp"]
    files: list[Path] = []
    for pattern in patterns:
        files.extend(input_dir.glob(pattern))

    if not files:
        print(f"WARNING: No image files found in {input_dir}", file=sys.stderr)
        return results

    for src in sorted(files):
        dst = output_dir / (src.stem + ".png")
        try:
            result = normalize(src, dst, strict_sizes=strict_sizes)
            results.append(result)
            print(f"  OK  {src.name} → {dst.name} ({result['original_mode']} → RGBA)")
        except Exception as e:
            results.append({"src": str(src), "error": str(e)})
            print(f"  ERR {src.name}: {e}", file=sys.stderr)

    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize sprites to clean RGBA PNG (strip metadata)"
    )
    parser.add_argument("input", help="Input file or directory")
    parser.add_argument("output", help="Output file or directory")
    parser.add_argument(
        "--batch", action="store_true", help="Process entire directory"
    )
    parser.add_argument(
        "--strict-sizes",
        action="store_true",
        help="Warn if dimensions not in standard sprite sizes",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if args.batch or input_path.is_dir():
        if not input_path.is_dir():
            sys.exit(f"ERROR: {input_path} is not a directory")
        results = batch_normalize(
            input_path, output_path, strict_sizes=args.strict_sizes
        )
        ok = sum(1 for r in results if "error" not in r)
        err = sum(1 for r in results if "error" in r)
        print(f"\nNormalized {ok} sprites ({err} errors)")
    else:
        result = normalize(input_path, output_path, strict_sizes=args.strict_sizes)
        print(
            f"Normalized {result['src']} → {result['dst']} "
            f"({result['original_mode']} → RGBA, {result['output_size'][0]}x{result['output_size'][1]})"
        )
        if result["warnings"]:
            for w in result["warnings"]:
                print(f"  WARNING: {w}")


if __name__ == "__main__":
    main()
