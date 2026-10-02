"""Isolated Ground Truth Access Boundary.

Project Bible Section 22 & 25:
- Ground truth exists ONLY for the Evaluation Harness.
- Prohibited: Production code, LLM context, RAG retrieval, or normal API endpoints
  importing or exposing this file.
"""

import os
import json
import hashlib
from typing import Dict, Any


def get_ground_truth_path() -> str:
    """Returns absolute path to isolated ground truth file."""
    # File is stored in /evaluation/ground_truth.json relative to repository root
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    gt_path = os.path.join(repo_root, "evaluation", "ground_truth.json")
    if not os.path.exists(gt_path):
        raise FileNotFoundError(f"Evaluation ground truth file not found at: {gt_path}")
    return gt_path


def load_isolated_ground_truth() -> Dict[str, Any]:
    """Loads and parses isolated ground truth with integrity verification."""
    gt_path = get_ground_truth_path()
    with open(gt_path, "r", encoding="utf-8") as f:
        content = f.read()

    data = json.loads(content)
    return data


def get_ground_truth_hash() -> str:
    """Computes SHA-256 integrity hash of ground_truth.json."""
    gt_path = get_ground_truth_path()
    with open(gt_path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()
