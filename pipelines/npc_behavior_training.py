"""
Project Loom — NPC Behavior Training Pipeline

Trains decision models that the Shuttle fabric uses to drive NPC behavior.
The pipeline:
  1. Loads gameplay telemetry (events from the event archive)
  2. Extracts features (state, context, decision, outcome)
  3. Trains a decision model (classification/regression)
  4. Exports to ONNX for deployment in the Loom server

Usage:
    python -m pipelines.npc_behavior_training --config config.json
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import structlog

logger = structlog.get_logger(__name__)


# ─── Configuration ───────────────────────────────────────────────


@dataclass(frozen=True)
class TrainingConfig:
    """Configuration for NPC behavior training."""

    data_path: Path
    output_dir: Path
    model_type: str = "decision_tree"
    epochs: int = 100
    batch_size: int = 64
    learning_rate: float = 1e-3
    validation_split: float = 0.2
    random_seed: int = 42
    export_onnx: bool = True


# ─── Feature Extraction ─────────────────────────────────────────


@dataclass
class BehaviorSample:
    """A single NPC decision sample for training."""

    npc_id: str
    world_id: str
    state_features: list[float] = field(default_factory=list)
    context_features: list[float] = field(default_factory=list)
    decision_label: int = 0
    reward: float = 0.0


def extract_features(event: dict[str, Any]) -> BehaviorSample:
    """Extract training features from a gameplay event."""
    return BehaviorSample(
        npc_id=str(event.get("entityId", "")),
        world_id=str(event.get("worldId", "")),
        state_features=_encode_state(event.get("state", {})),
        context_features=_encode_context(event.get("context", {})),
        decision_label=int(event.get("decision", 0)),
        reward=float(event.get("reward", 0.0)),
    )


def _encode_state(state: dict[str, Any]) -> list[float]:
    """Encode NPC state into a fixed-size feature vector."""
    return [
        float(state.get("health", 1.0)),
        float(state.get("energy", 1.0)),
        float(state.get("morale", 0.5)),
        float(state.get("x", 0.0)),
        float(state.get("y", 0.0)),
        float(state.get("z", 0.0)),
        float(state.get("threat_level", 0.0)),
        float(state.get("social_score", 0.5)),
    ]


def _encode_context(context: dict[str, Any]) -> list[float]:
    """Encode environmental context into a feature vector."""
    return [
        float(context.get("time_of_day", 0.5)),
        float(context.get("weather", 0.0)),
        float(context.get("nearby_entities", 0)),
        float(context.get("nearby_threats", 0)),
        float(context.get("distance_to_objective", 100.0)),
        float(context.get("world_danger_level", 0.0)),
    ]


# ─── Data Loading ────────────────────────────────────────────────


def load_training_data(
    data_path: Path,
) -> tuple[np.ndarray, np.ndarray]:
    """Load and prepare training data from JSON event files."""
    samples: list[BehaviorSample] = []

    if data_path.is_file():
        samples.extend(_load_file(data_path))
    elif data_path.is_dir():
        for file in sorted(data_path.glob("*.json")):
            samples.extend(_load_file(file))

    if not samples:
        logger.warning("no_training_data", path=str(data_path))
        return np.zeros((0, 14)), np.zeros((0,), dtype=np.int64)

    features = np.array(
        [s.state_features + s.context_features for s in samples],
        dtype=np.float32,
    )
    labels = np.array(
        [s.decision_label for s in samples],
        dtype=np.int64,
    )

    logger.info(
        "data_loaded",
        samples=len(samples),
        features_shape=features.shape,
    )
    return features, labels


def _load_file(path: Path) -> list[BehaviorSample]:
    """Load samples from a single JSON file."""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    events = data if isinstance(data, list) else [data]
    return [extract_features(e) for e in events]


# ─── Training ────────────────────────────────────────────────────


def train_decision_model(
    features: np.ndarray,
    labels: np.ndarray,
    config: TrainingConfig,
) -> Any:
    """Train an NPC decision model using scikit-learn."""
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split

    if features.shape[0] == 0:
        raise ValueError("Cannot train with empty dataset")

    x_train, x_val, y_train, y_val = train_test_split(
        features,
        labels,
        test_size=config.validation_split,
        random_state=config.random_seed,
    )

    model = RandomForestClassifier(
        n_estimators=config.epochs,
        random_state=config.random_seed,
        n_jobs=-1,
    )
    model.fit(x_train, y_train)

    train_acc = model.score(x_train, y_train)
    val_acc = model.score(x_val, y_val)

    logger.info(
        "training_complete",
        train_accuracy=f"{train_acc:.4f}",
        val_accuracy=f"{val_acc:.4f}",
        train_samples=x_train.shape[0],
        val_samples=x_val.shape[0],
    )

    return model


# ─── ONNX Export ─────────────────────────────────────────────────


def export_to_onnx(
    model: Any,
    output_path: Path,
    input_dim: int = 14,
) -> Path:
    """Export a trained model to ONNX format for inference in the Loom."""
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType

    initial_type = [("input", FloatTensorType([None, input_dim]))]
    onnx_model = convert_sklearn(model, initial_types=initial_type)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    logger.info("onnx_exported", path=str(output_path))
    return output_path


# ─── Pipeline Entry Point ───────────────────────────────────────


def run_pipeline(config: TrainingConfig) -> Path | None:
    """Execute the full training pipeline."""
    logger.info("pipeline_start", model_type=config.model_type)

    features, labels = load_training_data(config.data_path)
    if features.shape[0] == 0:
        logger.error("pipeline_abort", reason="empty_dataset")
        return None

    model = train_decision_model(features, labels, config)

    config.output_dir.mkdir(parents=True, exist_ok=True)
    output_path = config.output_dir / "npc_behavior.onnx"

    if config.export_onnx:
        return export_to_onnx(model, output_path, input_dim=features.shape[1])

    return output_path


if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="NPC Behavior Training Pipeline")
    parser.add_argument("--data", type=Path, required=True, help="Path to training data")
    parser.add_argument("--output", type=Path, default=Path("models"), help="Output directory")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    cfg = TrainingConfig(
        data_path=args.data,
        output_dir=args.output,
        epochs=args.epochs,
        random_seed=args.seed,
    )
    run_pipeline(cfg)
