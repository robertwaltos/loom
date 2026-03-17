/**
 * world-seed-boot.ts — Boot connector that seeds all 9 canonical worlds.
 *
 * Imports the canonical WorldSeedConfig for each world from @loom/loom-core
 * and calls orchestrator.seedWorld() for each one at boot time.
 */

import type { GameOrchestrator, WorldSeedResult } from '@loom/loom-core';
import {
  WORLD_ALKAHEST_SEED,
  WORLD_AMBER_REACH_SEED,
  WORLD_MERIDIANS_REST_SEED,
  WORLD_IRON_MERIDIAN_SEED,
  WORLD_SELENES_CRADLE_SEED,
  WORLD_VEIL_OF_KASS_SEED,
  WORLD_DEEP_TIDAL_SEED,
  WORLD_VARANTHA_STATION_SEED,
  WORLD_499_SEED,
} from '@loom/loom-core';

interface SeedBootLogger {
  info(ctx: Record<string, unknown>, msg: string): void;
}

interface SeedSummary {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly totalSpawnPoints: number;
  readonly totalNpcs: number;
  readonly totalObjects: number;
}

const ALL_WORLD_SEEDS = [
  WORLD_ALKAHEST_SEED,
  WORLD_AMBER_REACH_SEED,
  WORLD_MERIDIANS_REST_SEED,
  WORLD_IRON_MERIDIAN_SEED,
  WORLD_SELENES_CRADLE_SEED,
  WORLD_VEIL_OF_KASS_SEED,
  WORLD_DEEP_TIDAL_SEED,
  WORLD_VARANTHA_STATION_SEED,
  WORLD_499_SEED,
] as const;

export function seedAllWorlds(
  orchestrator: GameOrchestrator,
  logger: SeedBootLogger,
): SeedSummary {
  let succeeded = 0;
  let failed = 0;
  let totalSpawnPoints = 0;
  let totalNpcs = 0;
  let totalObjects = 0;

  for (const seed of ALL_WORLD_SEEDS) {
    let result: WorldSeedResult;
    try {
      result = orchestrator.seedWorld(seed);
    } catch (err) {
      failed++;
      logger.info(
        { worldId: seed.worldId, error: String(err) },
        'World seed threw during seeding',
      );
      continue;
    }

    if (result.errors.length > 0) {
      failed++;
      logger.info(
        {
          worldId: result.worldId,
          errors: result.errors,
          spawnPoints: result.spawnPointIds.length,
          npcs: result.npcIds.length,
          objects: result.objectIds.length,
        },
        'World seeded with errors',
      );
    } else {
      succeeded++;
      logger.info(
        {
          worldId: result.worldId,
          spawnPoints: result.spawnPointIds.length,
          npcs: result.npcIds.length,
          objects: result.objectIds.length,
        },
        'World seeded',
      );
    }

    totalSpawnPoints += result.spawnPointIds.length;
    totalNpcs += result.npcIds.length;
    totalObjects += result.objectIds.length;
  }

  const summary: SeedSummary = {
    total: ALL_WORLD_SEEDS.length,
    succeeded,
    failed,
    totalSpawnPoints,
    totalNpcs,
    totalObjects,
  };

  logger.info(
    { ...summary },
    'World seed boot complete',
  );

  return summary;
}
