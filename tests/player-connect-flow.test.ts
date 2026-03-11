/**
 * Player Connect Flow — Integration test.
 *
 * Proves the full vertical slice from token validation through
 * entity spawn using real loom-core subsystems wired via
 * GameOrchestrator. Only auth + identity + spawn-point lookup
 * are mocked (they come from external fabrics).
 */

import { describe, it, expect } from 'vitest';
import { createGameOrchestrator, createSilentLogger } from '@loom/loom-core';
import type { BridgeRenderingFabric } from '@loom/loom-core';
import type { EntityId } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

function createMockFabric(): BridgeRenderingFabric {
  return {
    pushStateSnapshot: () => {
      /* noop */
    },
    spawnVisual: () => Promise.resolve(),
    despawnVisual: () => Promise.resolve(),
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function setupSpawnPoint(
  orchestrator: ReturnType<typeof createGameOrchestrator>,
  spId: string,
  worldId: string,
): void {
  const store = orchestrator.core.entities.components;
  const entityId = eid(spId);
  store.set(entityId, 'spawn-point', {
    spawnType: 'player',
    capacity: 10,
    activeSpawns: 0,
    cooldownMicroseconds: 0,
  });
  store.set(entityId, 'transform', {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  });
  store.set(entityId, 'world-membership', {
    worldId,
    enteredAt: 1000,
    isTransitioning: false,
    transitionTargetWorldId: null,
  });
}

// ── Integration Tests ────────────────────────────────────────────

describe('Player Connect Flow — integration', () => {
  it('connects player from token to spawned entity', () => {
    const orchestrator = createGameOrchestrator({
      renderingFabric: createMockFabric(),
      coreConfig: { logger: createSilentLogger() },
      fabrics: {
        connect: {
          token: {
            validate: () => ({
              valid: true,
              dynastyId: 'dynasty-alice',
              reason: null,
            }),
          },
          identity: {
            resolve: (dId) => ({
              dynastyId: dId,
              displayName: 'Alice Starweaver',
              homeWorldId: 'earth',
              status: 'active',
            }),
          },
          spawnPoints: {
            findSpawnPoint: () => 'sp-earth-1',
          },
        },
      },
    });

    setupSpawnPoint(orchestrator, 'sp-earth-1', 'earth');

    const connect = orchestrator.playerConnect;
    expect(connect).toBeDefined();
    if (connect === undefined) return;

    const result = connect.connect({
      connectionId: 'conn-ws-1',
      tokenId: 'tok-abc-123',
      meshContentHash: 'mesh-alice',
      assetName: 'HumanFemale',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.dynastyId).toBe('dynasty-alice');
    expect(result.value.displayName).toBe('Alice Starweaver');
    expect(result.value.worldId).toBe('earth');

    // Verify the entity exists in the ECS with correct components
    verifySpawnedEntity(orchestrator, result.value.entityId);
    verifyConnectionTracked(orchestrator, result.value.entityId);

    orchestrator.stop();
  });
});

describe('Player Connect Flow — auth rejection', () => {
  it('rejects invalid token before touching ECS', () => {
    const orchestrator = createGameOrchestrator({
      renderingFabric: createMockFabric(),
      coreConfig: { logger: createSilentLogger() },
      fabrics: {
        connect: {
          token: {
            validate: () => ({
              valid: false,
              dynastyId: null,
              reason: 'signature-mismatch',
            }),
          },
          identity: {
            resolve: () => undefined,
          },
          spawnPoints: {
            findSpawnPoint: () => 'sp-earth-1',
          },
        },
      },
    });

    const connect = orchestrator.playerConnect;
    expect(connect).toBeDefined();
    if (connect === undefined) return;

    const result = connect.connect({
      connectionId: 'conn-ws-1',
      tokenId: 'bad-token',
      meshContentHash: 'mesh-alice',
      assetName: 'HumanFemale',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('token_invalid');

    // No connections should exist
    expect(orchestrator.connections.getStats().activeConnections).toBe(0);

    orchestrator.stop();
  });
});

describe('Player Connect Flow — disconnect', () => {
  it('disconnects a connected player', () => {
    const orchestrator = createGameOrchestrator({
      renderingFabric: createMockFabric(),
      coreConfig: { logger: createSilentLogger() },
      fabrics: {
        connect: {
          token: {
            validate: () => ({ valid: true, dynastyId: 'd-1', reason: null }),
          },
          identity: {
            resolve: (dId) => ({
              dynastyId: dId,
              displayName: 'Bob',
              homeWorldId: 'earth',
              status: 'active',
            }),
          },
          spawnPoints: {
            findSpawnPoint: () => 'sp-1',
          },
        },
      },
    });

    setupSpawnPoint(orchestrator, 'sp-1', 'earth');

    const connect = orchestrator.playerConnect;
    if (connect === undefined) return;

    connect.connect({
      connectionId: 'conn-1',
      tokenId: 'tok-1',
      meshContentHash: 'mesh-bob',
      assetName: 'HumanMale',
    });

    expect(orchestrator.connections.getStats().activeConnections).toBe(1);

    connect.disconnect('conn-1');
    expect(orchestrator.connections.getStats().activeConnections).toBe(0);

    orchestrator.stop();
  });
});

// ── Verification Helpers ────────────────────────────────────────

function verifySpawnedEntity(
  orchestrator: ReturnType<typeof createGameOrchestrator>,
  entityId: EntityId,
): void {
  const store = orchestrator.core.entities.components;

  const identity = store.get(entityId, 'identity') as {
    displayName: string;
    playerId: string;
  };
  expect(identity.displayName).toBe('Alice Starweaver');
  expect(identity.playerId).toBe('dynasty-alice');

  const wm = store.get(entityId, 'world-membership') as {
    worldId: string;
  };
  expect(wm.worldId).toBe('earth');

  const transform = store.get(entityId, 'transform') as {
    position: { x: number; y: number; z: number };
  };
  expect(transform.position).toBeDefined();
}

function verifyConnectionTracked(
  orchestrator: ReturnType<typeof createGameOrchestrator>,
  entityId: EntityId,
): void {
  const conn = orchestrator.connections.getByEntityId(entityId);
  expect(conn).toBeDefined();
  expect(conn?.state).toBe('spawned');
  expect(conn?.worldId).toBe('earth');
}
