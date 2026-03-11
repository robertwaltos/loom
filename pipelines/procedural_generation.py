"""
Project Loom — Procedural World Generation Pipeline

Uses ML models to generate terrain features, NPC placement,
resource distribution, and encounter density maps for new worlds.
The Silfen Weave uses these maps when materializing new zones.

Usage:
    python -m pipelines.procedural_generation --world-id <id> --seed <seed>
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import structlog

logger = structlog.get_logger(__name__)


@dataclass(frozen=True)
class WorldGenConfig:
    """Configuration for procedural world generation."""

    world_id: str
    seed: int = 42
    width: int = 256
    height: int = 256
    biome_count: int = 6
    entity_density: float = 0.15
    resource_density: float = 0.08


@dataclass
class GeneratedWorld:
    """Output of the procedural generation pipeline."""

    world_id: str
    heightmap: np.ndarray
    biome_map: np.ndarray
    entity_spawns: list[dict[str, Any]]
    resource_nodes: list[dict[str, Any]]


def generate_heightmap(config: WorldGenConfig) -> np.ndarray:
    """Generate a heightmap using layered Perlin-style noise."""
    rng = np.random.default_rng(config.seed)

    # Multi-octave noise approximation
    heightmap = np.zeros((config.height, config.width), dtype=np.float32)
    for octave in range(5):
        scale = 2**octave
        amplitude = 1.0 / scale
        noise = rng.random((config.height // scale + 1, config.width // scale + 1))
        # Upsample with linear interpolation indices
        y_idx = np.linspace(0, noise.shape[0] - 1, config.height)
        x_idx = np.linspace(0, noise.shape[1] - 1, config.width)
        yi = np.clip(y_idx.astype(int), 0, noise.shape[0] - 2)
        xi = np.clip(x_idx.astype(int), 0, noise.shape[1] - 2)
        yf = y_idx - yi
        xf = x_idx - xi
        # Bilinear interpolation
        upsampled = (
            noise[np.ix_(yi, xi)] * (1 - yf[:, None]) * (1 - xf[None, :])
            + noise[np.ix_(yi, xi + 1)] * (1 - yf[:, None]) * xf[None, :]
            + noise[np.ix_(yi + 1, xi)] * yf[:, None] * (1 - xf[None, :])
            + noise[np.ix_(yi + 1, xi + 1)] * yf[:, None] * xf[None, :]
        )
        heightmap += amplitude * upsampled.astype(np.float32)

    # Normalize to [0, 1]
    heightmap = (heightmap - heightmap.min()) / (heightmap.max() - heightmap.min() + 1e-8)
    logger.info("heightmap_generated", shape=heightmap.shape)
    return heightmap


def generate_biome_map(
    heightmap: np.ndarray,
    config: WorldGenConfig,
) -> np.ndarray:
    """Assign biomes based on height and moisture."""
    rng = np.random.default_rng(config.seed + 1)
    moisture = rng.random(heightmap.shape).astype(np.float32)

    biome_map = np.zeros_like(heightmap, dtype=np.int32)
    biome_map[heightmap < 0.2] = 0  # ocean
    biome_map[(heightmap >= 0.2) & (heightmap < 0.35)] = 1  # beach
    biome_map[(heightmap >= 0.35) & (moisture < 0.4)] = 2  # desert
    biome_map[(heightmap >= 0.35) & (moisture >= 0.4) & (heightmap < 0.6)] = 3  # forest
    biome_map[(heightmap >= 0.6) & (heightmap < 0.8)] = 4  # mountain
    biome_map[heightmap >= 0.8] = 5  # snow peak

    logger.info("biome_map_generated", biomes=int(biome_map.max() + 1))
    return biome_map


def place_entities(
    heightmap: np.ndarray,
    biome_map: np.ndarray,
    config: WorldGenConfig,
) -> list[dict[str, Any]]:
    """Place NPC entities based on biome suitability."""
    rng = np.random.default_rng(config.seed + 2)
    spawns: list[dict[str, Any]] = []
    total_cells = config.width * config.height
    target_count = int(total_cells * config.entity_density)

    for _ in range(target_count):
        y = int(rng.integers(0, config.height))
        x = int(rng.integers(0, config.width))
        biome = int(biome_map[y, x])

        # Skip water
        if biome == 0:
            continue

        spawns.append({
            "x": x,
            "y": y,
            "z": float(heightmap[y, x]),
            "biome": biome,
            "type": _biome_entity_type(biome, rng),
        })

    logger.info("entities_placed", count=len(spawns))
    return spawns


def _biome_entity_type(biome: int, rng: np.random.Generator) -> str:
    """Select an appropriate entity type for a biome."""
    biome_types: dict[int, list[str]] = {
        1: ["crab", "seagull", "merchant"],
        2: ["scorpion", "nomad", "sandworm"],
        3: ["deer", "wolf", "druid", "bandit"],
        4: ["goat", "eagle", "hermit"],
        5: ["snow_fox", "yeti"],
    }
    types = biome_types.get(biome, ["wanderer"])
    return str(rng.choice(types))


def run_generation(config: WorldGenConfig) -> GeneratedWorld:
    """Execute the full procedural generation pipeline."""
    logger.info("generation_start", world_id=config.world_id, seed=config.seed)

    heightmap = generate_heightmap(config)
    biome_map = generate_biome_map(heightmap, config)
    entities = place_entities(heightmap, biome_map, config)

    world = GeneratedWorld(
        world_id=config.world_id,
        heightmap=heightmap,
        biome_map=biome_map,
        entity_spawns=entities,
        resource_nodes=[],
    )

    logger.info(
        "generation_complete",
        world_id=config.world_id,
        entities=len(entities),
    )
    return world


if __name__ == "__main__":
    import argparse
    import logging

    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="Procedural World Generation")
    parser.add_argument("--world-id", required=True)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--width", type=int, default=256)
    parser.add_argument("--height", type=int, default=256)
    args = parser.parse_args()

    cfg = WorldGenConfig(
        world_id=args.world_id,
        seed=args.seed,
        width=args.width,
        height=args.height,
    )
    run_generation(cfg)
