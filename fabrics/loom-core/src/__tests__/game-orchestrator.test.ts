/**
 * GameOrchestrator — Proves the top-level composition works.
 */

import { describe, it, expect } from 'vitest';
import { createGameOrchestrator } from '../game-orchestrator.js';
import { createSilentLogger } from '../logger.js';
import type { BridgeRenderingFabric } from '../bridge-service.js';
import type { EntityId } from '@loom/entities-contracts';
import type { TransformComponent } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

function createMockFabric(): BridgeRenderingFabric & {
  readonly pushCount: () => number;
  readonly spawnedIds: () => string[];
} {
  let pushes = 0;
  const spawned: string[] = [];
  return {
    pushCount: () => pushes,
    spawnedIds: () => [...spawned],
    pushStateSnapshot: () => { pushes++; },
    spawnVisual: (id) => { spawned.push(id); return Promise.resolve(); },
    despawnVisual: () => Promise.resolve(),
  };
}

describe('GameOrchestrator — construction', () => {
  it('creates all subsystems', () => {
    const fabric = createMockFabric();
    const orchestrator = createGameOrchestrator({
      renderingFabric: fabric,
      coreConfig: { logger: createSilentLogger() },
    });
    expect(orchestrator.core).toBeDefined();
    expect(orchestrator.spawns).toBeDefined();
    expect(orchestrator.connections).toBeDefined();
    expect(orchestrator.bridge).toBeDefined();
    expect(orchestrator.visualMapper).toBeDefined();
    orchestrator.stop();
  });

  it('registers three game systems', () => {
    const fabric = createMockFabric();
    const orchestrator = createGameOrchestrator({
      renderingFabric: fabric,
      coreConfig: { logger: createSilentLogger() },
    });
    const registrations = orchestrator.core.systems.listSystems();
    const names = registrations.map((reg) => reg.name);
    expect(names).toContain('movement');
    expect(names).toContain('visual-state-mapper');
    expect(names).toContain('bridge-service');
    orchestrator.stop();
  });
});

describe('GameOrchestrator — player lifecycle', () => {
  it('connects, spawns, and bridges a player', () => {
    const fabric = createMockFabric();
    const orchestrator = createGameOrchestrator({
      renderingFabric: fabric,
      coreConfig: { logger: createSilentLogger() },
    });

    // Set up spawn point
    const spId = eid('sp-1');
    const store = orchestrator.core.entities.components;
    store.set(spId, 'spawn-point', {
      spawnType: 'player',
      capacity: 10,
      activeSpawns: 0,
      cooldownMicroseconds: 0,
    });
    store.set(spId, 'transform', {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });
    store.set(spId, 'world-membership', {
      worldId: 'earth',
      enteredAt: Date.now(),
      isTransitioning: false,
      transitionTargetWorldId: null,
    });

    // Connect + spawn
    orchestrator.connections.connect({
      connectionId: 'c1',
      playerId: 'alice',
      displayName: 'Alice',
    });
    const result = orchestrator.spawns.spawnPlayer({
      spawnPointEntityId: 'sp-1',
      playerId: 'alice',
      displayName: 'Alice',
      meshContentHash: 'mesh-alice',
      assetName: 'HumanFemale',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    orchestrator.connections.markSpawned('c1', result.entityId, 'earth');

    // Inject input
    store.set(result.entityId, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 1 },
      lookDirection: { x: 0, y: 0, z: -1 },
      actions: [],
      sequenceNumber: 1,
    });

    // Manually run systems (not using tick loop for determinism)
    orchestrator.core.systems.runAll({
      deltaMs: 100,
      tickNumber: 1,
      wallTimeMicroseconds: 100000,
    });

    // Verify movement happened
    const t = store.get(result.entityId, 'transform') as TransformComponent;
    expect(t.position.z).toBeGreaterThan(0);

    // Verify bridge pushed
    expect(fabric.pushCount()).toBe(1);
    expect(fabric.spawnedIds().length).toBeGreaterThanOrEqual(1);

    // Verify connection stats
    expect(orchestrator.connections.getStats().activeConnections).toBe(1);

    orchestrator.stop();
  });
});

describe('GameOrchestrator — NPC spawn', () => {
  it('spawns an NPC with tier-based AI backend', () => {
    const fabric = createMockFabric();
    const orchestrator = createGameOrchestrator({
      renderingFabric: fabric,
      coreConfig: { logger: createSilentLogger() },
    });

    const spId = eid('sp-npc');
    const store = orchestrator.core.entities.components;
    store.set(spId, 'spawn-point', {
      spawnType: 'npc',
      capacity: 5,
      activeSpawns: 0,
      cooldownMicroseconds: 0,
    });
    store.set(spId, 'transform', {
      position: { x: 10, y: 0, z: 20 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });
    store.set(spId, 'world-membership', {
      worldId: 'earth',
      enteredAt: Date.now(),
      isTransitioning: false,
      transitionTargetWorldId: null,
    });

    const result = orchestrator.spawns.spawnNpc({
      spawnPointEntityId: 'sp-npc',
      displayName: 'Merchant Kira',
      meshContentHash: 'mesh-kira',
      assetName: 'NpcFemale',
      tier: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Verify NPC tier component
    const npcTier = store.get(result.entityId, 'npc-tier') as {
      tier: number;
      aiBackend: string;
    };
    expect(npcTier.tier).toBe(2);
    expect(npcTier.aiBackend).toBe('llm-haiku');

    orchestrator.stop();
  });
});

describe('GameOrchestrator — start/stop', () => {
  it('starts and stops without error', () => {
    const fabric = createMockFabric();
    const orchestrator = createGameOrchestrator({
      renderingFabric: fabric,
      coreConfig: { logger: createSilentLogger() },
    });
    // start() begins the tick loop - just verify it doesn't throw
    orchestrator.start();
    orchestrator.stop();
  });
});
