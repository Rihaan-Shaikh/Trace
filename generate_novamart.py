#!/usr/bin/env python3
"""TRACE Canonical NovaMart Synthetic Benchmark Generator CLI.

Usage from project root:
    python generate_novamart.py --seed 42
    python generate_novamart.py --seed 42 --output-dir data/novamart --eval-dir evaluation
"""

import argparse
import sys
import os

# Ensure backend package is importable from root
sys.path.insert(0, os.path.abspath("."))

from backend.app.analytics.novamart_generator import NovaMartGenerator


def main() -> None:
    parser = argparse.ArgumentParser(
        description="TRACE NovaMart Synthetic Data Generator (Project Bible Section 22 Locked Benchmark)"
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Deterministic random seed for reproducibility (default: 42)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/novamart",
        help="Directory to write business CSV files (default: data/novamart)",
    )
    parser.add_argument(
        "--eval-dir",
        type=str,
        default="evaluation",
        help="Directory to write evaluation-only ground truth artifact (default: evaluation)",
    )

    args = parser.parse_args()

    print(f"Generating TRACE NovaMart benchmark suite with seed={args.seed}...")
    paths = NovaMartGenerator.export_benchmark_suite(
        output_dir=args.output_dir,
        eval_dir=args.eval_dir,
        seed=args.seed,
    )

    print("Generation complete:")
    for key, path in paths.items():
        if key == "ground_truth":
            print(f"  [EVALUATION ONLY] {key}: {path}")
        else:
            print(f"  [BUSINESS DATA]  {key}: {path}")


if __name__ == "__main__":
    main()
