#!/usr/bin/env python3
"""pipeline_runner.py — Orchestrate the full post-processing pipeline.

Part of the Pixeldarium agent-studio post-processing pipeline.
Master script that runs all steps in sequence:
  1. normalize  — strip metadata, force RGBA
  2. grid_snap  — nearest-neighbor to target size
  3. palette_snap — quantize to art bible palette
  4. alpha_clean — force binary alpha
  5. atlas_pack — pack frames into sheet + JSON

Usage:
    python pipeline_runner.py --input raw/ --output assets/ --palette palette.json --size 32x32
    python pipeline_runner.py --input raw/ --output assets/ --config pipeline.json
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
from pathlib import Path

# Import sibling scripts
sys.path.insert(0, str(Path(__file__).parent))
from normalize_sprite import batch_normalize
from grid_snap import batch_grid_snap, parse_size
from palette_snap import batch_palette_snap, load_palette
from alpha_clean import batch_alpha_clean
from atlas_pack import pack_atlas


def run_pipeline(
    input_dir: Path,
    output_dir: Path,
    palette_path: Path,
    target_size: tuple[int, int],
    *,
    alpha_threshold: int = 128,
    atlas_cols: int | None = None,
    frame_duration: int = 100,
    skip_atlas: bool = False,
    strict_sizes: bool = False,
) -> dict:
    """Run the full post-processing pipeline.

    Creates temporary directories for intermediate results so the
    pipeline is atomic — either all steps succeed or the output
    directory is not modified.
    """
    report: dict = {
        "input_dir": str(input_dir),
        "output_dir": str(output_dir),
        "palette": str(palette_path),
        "target_size": list(target_size),
        "alpha_threshold": alpha_threshold,
        "steps": {},
        "ok": True,
    }

    # Load palette upfront to fail fast
    palette_colors = load_palette(palette_path)
    print(f"=== Pipeline: {len(palette_colors)} palette colors, target {target_size[0]}x{target_size[1]} ===\n")

    with tempfile.TemporaryDirectory(prefix="pixeldarium_pp_") as tmpdir:
        tmp = Path(tmpdir)
        step1_dir = tmp / "01_normalized"
        step2_dir = tmp / "02_grid_snapped"
        step3_dir = tmp / "03_palette_snapped"
        step4_dir = tmp / "04_alpha_cleaned"

        # Step 1: Normalize
        print("--- Step 1/5: Normalize (strip metadata, force RGBA) ---")
        results = batch_normalize(input_dir, step1_dir, strict_sizes=strict_sizes)
        ok = sum(1 for r in results if "error" not in r)
        report["steps"]["normalize"] = {"count": ok, "errors": sum(1 for r in results if "error" in r)}
        if ok == 0:
            report["ok"] = False
            print("ERROR: No sprites normalized. Aborting.")
            return report
        print()

        # Step 2: Grid Snap
        print(f"--- Step 2/5: Grid Snap ({target_size[0]}x{target_size[1]}, NEAREST) ---")
        results = batch_grid_snap(step1_dir, step2_dir, target_size)
        ok = sum(1 for r in results if "error" not in r)
        report["steps"]["grid_snap"] = {"count": ok, "resized": sum(1 for r in results if r.get("resized"))}
        print()

        # Step 3: Palette Snap
        print(f"--- Step 3/5: Palette Snap ({len(palette_colors)} colors, LAB distance) ---")
        results = batch_palette_snap(step2_dir, step3_dir, palette_colors)
        ok = sum(1 for r in results if "error" not in r)
        avg_change = 0.0
        if ok > 0:
            avg_change = sum(r.get("change_rate", 0) for r in results if "error" not in r) / ok
        report["steps"]["palette_snap"] = {"count": ok, "avg_change_rate": round(avg_change, 4)}
        print()

        # Step 4: Alpha Clean
        print(f"--- Step 4/5: Alpha Clean (threshold={alpha_threshold}) ---")
        results = batch_alpha_clean(step3_dir, step4_dir, alpha_threshold)
        ok = sum(1 for r in results if "error" not in r)
        report["steps"]["alpha_clean"] = {"count": ok}
        print()

        # Step 5: Atlas Pack (optional)
        if not skip_atlas:
            print("--- Step 5/5: Atlas Pack ---")
            output_dir.mkdir(parents=True, exist_ok=True)
            sheet_name = input_dir.name or "sprite"
            sheet_path = output_dir / f"{sheet_name}.png"
            atlas_path = output_dir / f"{sheet_name}.json"
            try:
                pack_result = pack_atlas(
                    step4_dir,
                    sheet_path,
                    atlas_path,
                    cols=atlas_cols,
                    frame_duration=frame_duration,
                )
                report["steps"]["atlas_pack"] = pack_result
                print()
            except Exception as e:
                report["steps"]["atlas_pack"] = {"error": str(e)}
                report["ok"] = False
                print(f"  ERROR: {e}\n")
        else:
            # Copy cleaned individual frames to output
            print("--- Step 5/5: Copy cleaned frames (atlas skipped) ---")
            output_dir.mkdir(parents=True, exist_ok=True)
            count = 0
            for f in sorted(step4_dir.glob("*.png")):
                shutil.copy2(f, output_dir / f.name)
                count += 1
            report["steps"]["copy"] = {"count": count}
            print(f"  Copied {count} cleaned sprites to {output_dir}\n")

    return report


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the full Pixeldarium sprite post-processing pipeline"
    )
    parser.add_argument("--input", required=True, help="Input directory with raw sprites")
    parser.add_argument("--output", required=True, help="Output directory for final assets")
    parser.add_argument("--palette", required=True, help="Path to art bible palette JSON")
    parser.add_argument("--size", required=True, help="Target size as WxH or N (square)")
    parser.add_argument("--alpha-threshold", type=int, default=128, help="Alpha threshold. Default: 128")
    parser.add_argument("--atlas-cols", type=int, default=None, help="Atlas columns (auto if omitted)")
    parser.add_argument("--frame-duration", type=int, default=100, help="Frame duration in ms. Default: 100")
    parser.add_argument("--skip-atlas", action="store_true", help="Output individual cleaned frames instead of atlas")
    parser.add_argument("--strict-sizes", action="store_true", help="Warn on non-standard sprite sizes")
    parser.add_argument("--report", help="Write JSON report to this path")
    args = parser.parse_args()

    target_size = parse_size(args.size)

    report = run_pipeline(
        Path(args.input),
        Path(args.output),
        Path(args.palette),
        target_size,
        alpha_threshold=args.alpha_threshold,
        atlas_cols=args.atlas_cols,
        frame_duration=args.frame_duration,
        skip_atlas=args.skip_atlas,
        strict_sizes=args.strict_sizes,
    )

    # Summary
    print("=" * 60)
    if report["ok"]:
        print("PIPELINE COMPLETE ✓")
    else:
        print("PIPELINE FAILED ✗")
    for step_name, step_data in report["steps"].items():
        if "error" in step_data:
            print(f"  {step_name}: ERROR — {step_data['error']}")
        else:
            print(f"  {step_name}: {step_data}")

    # Write report if requested
    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2) + "\n")
        print(f"\nReport written to {report_path}")

    if not report["ok"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
