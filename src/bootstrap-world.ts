import type { ConnectIdentityInfo, ConnectSpawnPointPort, GameOrchestrator } from '@loom/loom-core';
import type { SpawnPointComponent, WorldMembershipComponent } from '@loom/entities-contracts';

export const DEFAULT_BOOT_WORLD_ID = 'alkahest';

interface MinimalLogger {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface WorldSelectionPolicy {
  readonly defaultWorldId: string;
  readonly bootWorldIds: ReadonlyArray<string>;
  readonly resolvePlayerWorldId: (preferredWorldId?: string | null) => string;
  readonly getSpawnWorldCandidates: (preferredWorldId?: string | null) => ReadonlyArray<string>;
}

interface WorldSelectionPolicyConfig {
  readonly defaultWorldId?: string;
  readonly bootWorldIds?: ReadonlyArray<string>;
}

function normalizeWorldId(worldId: string | null | undefined): string | undefined {
  const trimmed = worldId?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined;
}

export function createWorldSelectionPolicy(
  config: WorldSelectionPolicyConfig = {},
): WorldSelectionPolicy {
  const defaultWorldId = normalizeWorldId(config.defaultWorldId) ?? DEFAULT_BOOT_WORLD_ID;
  const bootWorldIds = uniqueWorldIds([defaultWorldId, ...(config.bootWorldIds ?? [])]);

  return {
    defaultWorldId,
    bootWorldIds,
    resolvePlayerWorldId: (preferredWorldId) =>
      normalizeWorldId(preferredWorldId) ?? defaultWorldId,
    getSpawnWorldCandidates: (preferredWorldId) => {
      const normalizedPreferredWorldId = normalizeWorldId(preferredWorldId);
      return uniqueWorldIds([
        ...(normalizedPreferredWorldId !== undefined ? [normalizedPreferredWorldId] : []),
        ...bootWorldIds,
      ]);
    },
  };
}

function uniqueWorldIds(worldIds: ReadonlyArray<string | null | undefined>): ReadonlyArray<string> {
  const unique = new Set<string>();

  for (const worldId of worldIds) {
    const normalized = normalizeWorldId(worldId);
    if (normalized !== undefined) {
      unique.add(normalized);
    }
  }

  return [...unique];
}

export function resolveDefaultIdentity(
  dynastyId: string,
  homeWorldId: string = DEFAULT_BOOT_WORLD_ID,
): ConnectIdentityInfo {
  return {
    dynastyId,
    displayName: `Player-${dynastyId.slice(0, 8)}`,
    homeWorldId: normalizeWorldId(homeWorldId) ?? DEFAULT_BOOT_WORLD_ID,
    status: 'active',
  };
}

export function seedBootstrapWorld(
  orchestrator: GameOrchestrator,
  logger: MinimalLogger,
  worldId: string = DEFAULT_BOOT_WORLD_ID,
): void {
  const result = orchestrator.seedWorld({ worldId, spawnPoints: [], npcs: [], objects: [] });
  if (result.errors.length > 0) {
    throw new Error(`Bootstrap world ${worldId} seeded with errors: ${result.errors.join('; ')}`);
  }

  const spawnPointId = findPlayerSpawnPoint(orchestrator, worldId);
  if (spawnPointId === undefined) {
    throw new Error(`Bootstrap world ${worldId} has no player spawn point`);
  }

  logger.info({ worldId, spawnPointId }, 'Bootstrap world seeded');
}

export function seedBootstrapWorlds(
  orchestrator: GameOrchestrator,
  logger: MinimalLogger,
  worldIds: ReadonlyArray<string>,
): void {
  for (const worldId of worldIds) {
    seedBootstrapWorld(orchestrator, logger, worldId);
  }
}

export function findPlayerSpawnPoint(
  orchestrator: GameOrchestrator,
  worldId: string,
): string | undefined {
  const store = orchestrator.core.entities.components;
  const spawnPointIds = store.findEntitiesWith('spawn-point');

  for (const spawnPointId of spawnPointIds) {
    const spawnPoint = store.tryGet(spawnPointId, 'spawn-point') as SpawnPointComponent | undefined;
    if (spawnPoint?.spawnType !== 'player') {
      continue;
    }

    const membership = store.tryGet(spawnPointId, 'world-membership') as
      | WorldMembershipComponent
      | undefined;
    if (membership?.worldId === worldId) {
      return spawnPointId;
    }
  }

  return undefined;
}

export function ensurePlayerSpawnPoint(
  orchestrator: GameOrchestrator,
  logger: MinimalLogger,
  worldId: string,
): string | undefined {
  const existing = findPlayerSpawnPoint(orchestrator, worldId);
  if (existing !== undefined) {
    return existing;
  }

  const result = orchestrator.seedWorld({ worldId, spawnPoints: [], npcs: [], objects: [] });
  if (result.errors.length > 0) {
    throw new Error(`World ${worldId} seeded with errors: ${result.errors.join('; ')}`);
  }

  const seeded = findPlayerSpawnPoint(orchestrator, worldId);
  logger.info({ worldId, spawnPointId: seeded ?? null }, 'Resolved player spawn point');
  return seeded;
}

export function createBootstrapSpawnPointPort(
  logger: MinimalLogger,
  getOrchestrator: () => GameOrchestrator,
  worldSelectionPolicy: WorldSelectionPolicy = createWorldSelectionPolicy(),
): ConnectSpawnPointPort {
  return {
    findSpawnPoint: (worldId: string) => {
      const candidateWorldIds = worldSelectionPolicy.getSpawnWorldCandidates(worldId);
      logger.info(
        {
          requestedWorldId: normalizeWorldId(worldId) ?? null,
          candidateWorldIds,
        },
        'Finding spawn point',
      );

      for (const candidateWorldId of candidateWorldIds) {
        const spawnPointId = ensurePlayerSpawnPoint(getOrchestrator(), logger, candidateWorldId);
        if (spawnPointId !== undefined) {
          return spawnPointId;
        }
      }

      return undefined;
    },
  };
}
