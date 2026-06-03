#!/usr/bin/env python3
"""palette_snap.py — Quantize sprites to the art bible palette.

Part of the Pixeldarium agent-studio post-processing pipeline.
Step 3 (MOST CRITICAL): Forces every opaque pixel to the nearest color
in the art bible palette using LAB color space for perceptually accurate
distance calculations.

Usage:
    python palette_snap.py input.png output.png --palette palette.json
    python palette_snap.py --batch input_dir/ output_dir/ --palette palette.json
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    sys.exit("ERROR: Pillow and numpy required. Install: pip install Pillow numpy")


# ---------------------------------------------------------------------------
# sRGB ↔ LAB conversion (no scipy/skimage dependency)
# ---------------------------------------------------------------------------

def _srgb_to_linear(c: float) -> float:
    """Convert sRGB component [0-1] to linear RGB."""
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def _f_lab(t: float) -> float:
    delta = 6.0 / 29.0
    if t > delta ** 3:
        return t ** (1.0 / 3.0)
    return t / (3.0 * delta * delta) + 4.0 / 29.0


def rgb_to_lab(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Convert sRGB (0-255) to CIELAB."""
    # sRGB → linear
    rl = _srgb_to_linear(r / 255.0)
    gl = _srgb_to_linear(g / 255.0)
    bl = _srgb_to_linear(b / 255.0)

    # linear RGB → XYZ (D65)
    x = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl
    y = 0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl
    z = 0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl

    # XYZ → LAB (D65 white point)
    xn, yn, zn = 0.95047, 1.00000, 1.08883
    fx = _f_lab(x / xn)
    fy = _f_lab(y / yn)
    fz = _f_lab(z / zn)

    L = 116.0 * fy - 16.0
    a = 500.0 * (fx - fy)
    b_val = 200.0 * (fy - fz)
    return L, a, b_val


def lab_distance(lab1: tuple[float, float, float], lab2: tuple[float, float, float]) -> float:
    """Euclidean distance in CIELAB space (ΔE*ab)."""
    return math.sqrt(
        (lab1[0] - lab2[0]) ** 2 +
        (lab1[1] - lab2[1]) ** 2 +
        (lab1[2] - lab2[2]) ** 2
    )


# ---------------------------------------------------------------------------
# Palette loading
# ---------------------------------------------------------------------------

def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    """Convert #RRGGBB or #RRGGBBAA to (R, G, B)."""
    h = hex_str.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def load_palette(palette_path: Path) -> list[tuple[int, int, int]]:
    """Load palette from JSON file.

    Supports formats:
    - Array of hex strings: ["#FF0000", "#00FF00"]
    - Object with colors array: {"colors": [{"value": "#FF0000"}]}
    - Object with palette: {"palette": {"colors": [...]}}
    - validate-style-bible.js compatible format
    """
    data = json.loads(palette_path.read_text())

    colors: list[tuple[int, int, int]] = []

    if isinstance(data, list):
        # Simple array of hex strings
        for item in data:
            if isinstance(item, str):
                colors.append(hex_to_rgb(item))
            elif isinstance(item, dict):
                hex_val = item.get("value") or item.get("hex") or item.get("color", "")
                if hex_val:
                    colors.append(hex_to_rgb(hex_val))
    elif isinstance(data, dict):
        # Try nested structures
        palette_data = data.get("palette", data)
        if isinstance(palette_data, dict):
            color_list = palette_data.get("colors", [])
        elif isinstance(palette_data, list):
            color_list = palette_data
        else:
            color_list = []

        if not color_list and isinstance(data, dict):
            # Try flat key-value: {"red": "#FF0000", ...}
            for key, val in data.items():
                if isinstance(val, str) and val.startswith("#"):
                    colors.append(hex_to_rgb(val))

        for item in color_list:
            if isinstance(item, str):
                colors.append(hex_to_rgb(item))
            elif isinstance(item, dict):
                hex_val = (
                    item.get("value")
                    or item.get("hex")
                    or item.get("color", "")
                )
                if hex_val:
                    colors.append(hex_to_rgb(hex_val))

    if not colors:
        raise ValueError(f"No valid colors found in {palette_path}")

    return colors


# ---------------------------------------------------------------------------
# Core snapping
# ---------------------------------------------------------------------------

def snap_to_palette(
    img: Image.Image,
    palette_colors: list[tuple[int, int, int]],
    alpha_threshold: int = 1,
) -> tuple[Image.Image, dict]:
    """Quantize every opaque pixel to the nearest palette color.

    Returns (snapped_image, stats_dict).
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    data = np.array(img)
    h, w = data.shape[:2]

    # Precompute palette LAB values
    palette_lab = [rgb_to_lab(r, g, b) for r, g, b in palette_colors]

    pixels_changed = 0
    pixels_skipped = 0  # transparent
    total_delta_e = 0.0
    max_delta_e = 0.0

    for y in range(h):
        for x in range(w):
            alpha = data[y, x, 3]
            if alpha < alpha_threshold:
                pixels_skipped += 1
                continue

            r, g, b = int(data[y, x, 0]), int(data[y, x, 1]), int(data[y, x, 2])
            pixel_lab = rgb_to_lab(r, g, b)

            # Find nearest palette color
            best_dist = float("inf")
            best_idx = 0
            for i, p_lab in enumerate(palette_lab):
                d = lab_distance(pixel_lab, p_lab)
                if d < best_dist:
                    best_dist = d
                    best_idx = i

            pr, pg, pb = palette_colors[best_idx]
            if r != pr or g != pg or b != pb:
                data[y, x, 0] = pr
                data[y, x, 1] = pg
                data[y, x, 2] = pb
                pixels_changed += 1

            total_delta_e += best_dist
            max_delta_e = max(max_delta_e, best_dist)

    result = Image.fromarray(data, "RGBA")
    opaque = h * w - pixels_skipped
    stats = {
        "total_pixels": h * w,
        "opaque_pixels": opaque,
        "transparent_pixels": pixels_skipped,
        "pixels_changed": pixels_changed,
        "change_rate": round(pixels_changed / max(opaque, 1), 4),
        "avg_delta_e": round(total_delta_e / max(opaque, 1), 2),
        "max_delta_e": round(max_delta_e, 2),
        "palette_colors_used": len(palette_colors),
    }
    return result, stats


def palette_snap_file(
    src: Path,
    dst: Path,
    palette_colors: list[tuple[int, int, int]],
) -> dict:
    """Snap a single file to the palette."""
    img = Image.open(src)
    result, stats = snap_to_palette(img, palette_colors)
    dst.parent.mkdir(parents=True, exist_ok=True)
    result.save(dst, format="PNG")
    return {"src": str(src), "dst": str(dst), **stats}


def batch_palette_snap(
    input_dir: Path,
    output_dir: Path,
    palette_colors: list[tuple[int, int, int]],
) -> list[dict]:
    """Palette-snap all PNGs in input_dir."""
    results: list[dict] = []
    files = sorted(input_dir.glob("*.png"))

    if not files:
        print(f"WARNING: No .png files found in {input_dir}", file=sys.stderr)
        return results

    for src in files:
        dst = output_dir / src.name
        try:
            result = palette_snap_file(src, dst, palette_colors)
            results.append(result)
            print(
                f"  OK  {src.name}: {result['pixels_changed']}/{result['opaque_pixels']} "
                f"changed ({result['change_rate']:.1%}), "
                f"avg ΔE={result['avg_delta_e']}, max ΔE={result['max_delta_e']}"
            )
        except Exception as e:
            results.append({"src": str(src), "error": str(e)})
            print(f"  ERR {src.name}: {e}", file=sys.stderr)

    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Quantize sprites to art bible palette using LAB color distance"
    )
    parser.add_argument("input", help="Input file or directory")
    parser.add_argument("output", help="Output file or directory")
    parser.add_argument(
        "--palette", required=True, help="Path to palette JSON file"
    )
    parser.add_argument(
        "--batch", action="store_true", help="Process entire directory"
    )
    args = parser.parse_args()

    palette_path = Path(args.palette)
    palette_colors = load_palette(palette_path)
    print(f"Loaded {len(palette_colors)} palette colors from {palette_path}")

    input_path = Path(args.input)
    output_path = Path(args.output)

    if args.batch or input_path.is_dir():
        if not input_path.is_dir():
            sys.exit(f"ERROR: {input_path} is not a directory")
        results = batch_palette_snap(input_path, output_path, palette_colors)
        ok = sum(1 for r in results if "error" not in r)
        print(f"\nPalette-snapped {ok} sprites")
    else:
        result = palette_snap_file(input_path, output_path, palette_colors)
        print(
            f"Palette-snapped {result['src']} → {result['dst']}\n"
            f"  Changed: {result['pixels_changed']}/{result['opaque_pixels']} "
            f"({result['change_rate']:.1%})\n"
            f"  Avg ΔE: {result['avg_delta_e']}, Max ΔE: {result['max_delta_e']}"
        )


if __name__ == "__main__":
    main()
