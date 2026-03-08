/**
 * SpawnSystem — Validates entity spawning with archetypes and cooldowns.
 */

import { describe, it, expect } from 'vitest';
import { createSpawnSystem } from '../spawn-system.js';
import { createComponentStore } from '../component-store.js';
import { createEntityRegistry } from '../entity-registry.js';
import { createEventFactory } from '../event-factory.js';
import type { EntityId } from '@loom/entities-contracts';
import type {
  SpawnPointComponent,
  TransformComponent,
  WorldMembershipComponent,
  NpcTierComponent,
} from '@loom/entities-contracts';

function createDeps() {
  let time = 1_000_000;
  let idNum = 0;
  const clock = { nowMicroseconds: () => time++ };
  const componentStore = createComponentStore();
  const idGenerator = { generate: () => 'ent-' + String(idNum++) };
  const eventBus = {
    publish: () => {},
    publishBatch: () => {},
    subscribe: () => () => {},
    replay: () => (async function* () { /* empty */ })(),
    backlogSize: () => 0,
  };
  const eventFactory = createEventFactory(
    clock,
    { generate: () => 'evt-' + String(idNum++) },
  );
  const entityRegistry = createEntityRegistry({
    eventBus,
    eventFactory,
    componentStore,
    idGenerator,
    clock,
  });

  return {
    entityRegistry,
    componentStore,
    clock,
    advanceTime: (microseconds: number) => { time += microseconds; },
  };
}

function setupSpawnPoint(
  deps: ReturnType<typeof createDeps>,
  spawnPointId: string,
  spawnType: 'player' | 'npc' | 'creature' = 'player',
): void {
  const transform: TransformComponent = {
    position: { x: 10, y: 0, z: 20 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  };
  const sp: SpawnPointComponent = {
    spawnType,
    capacity: 5,
    activeSpawns: 0,
    cooldownMicroseconds: 1_000_000,
  };
  const wm: WorldMembershipComponent = {
    worldId: 'world-alpha',
    enteredAt: 0,
    isTransitioning: false,
    transitionTargetWorldId: null,
  };
  deps.componentStore.set(spawnPointId as EntityId, 'transform', transform);
  deps.componentStore.set(spawnPointId as EntityId, 'spawn-point', sp);
  deps.componentStore.set(spawnPointId as EntityId, 'world-membership', wm);
}

describe('SpawnSystem — spawnPlayer', () => {
  it('spawns a player entity at the spawn point position', () => {
    const deps = createDeps();
    const svc = createSpawnSystem(deps);
    setupSpawnPoint(deps, 'sp-1');

    const result = svc.spawnPlayer({
      spawnPointEntityId: 'sp-1',
      playerId: 'player-42',
      displayName: 'Thane Rolis',
      meshContentHash: 'sha256:abc',
      assetName: 'SM_HumanMale',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entityId).toBeDefined();
      const t = deps.componentStore.get(result.entityId, 'transform') as TransformComponent;
      expect(t.position.x).toBe(10);
      expect(t.position.z).toBe(20);
    }
  });

  it('creates player with full component archetype', () => {
    const deps = createDeps();
    const svc = createSpawnSystem(deps);
    setupSpawnPoint(deps, 'sp-1');

    const result = svc.spawnPlayer({
      spawnPointEntityId: 'sp-1',
      playerId: 'player-42',
      displayName: 'Thane Rolis',
      meshContentHash: 'sha256:abc',
      assetName: 'SM_HumanMale',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const store = deps.componentStore;
      expect(store.has(result.entityId, 'transform')).toBe(true);
      expect(store.has(result.entityId, 'identity')).toBe(true);
      expect(store.has(result.entityId, 'movement')).toBe(true);
      expect(store.has(result.entityId, 'player-input')).toBe(true);
      expect(store.has(result.entityId, 'camera-target')).toBe(true);
      expect(store.has(result.entityId, 'visual-mesh')).toBe(true);
      expect(store.has(result.entityId, 'animation')).toBe(true);
      expect(store.has(result.entityId, 'network-replication')).toBe(true);
      expect(store.has(result.entityId, 'world-membership')).toBe(true);
    }
  });

  it('rejects spawn at unknown spawn point', () => {
    const deps = createDeps();
    const svc = createSpawnSystem(deps);

    const result = svc.spawnPlayer({
      spawnPointEntityId: 'nonexistent',
      playerId: 'p1',
      displayName: 'Test',
      meshContentHash: 'sha256:x',
      assetName: 'SM_Test',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('spawn-point-not-found');
  });
});

describe('SpawnSystem — capacity and cooldown', () => {
  it('rejects spawn when spawn point is at capacity', () => {
    const deps = createDeps();
    const svc = createSpawnSystem(deps);
    setupSpawnPoint(deps, 'sp-1');

    // Fill to capacity (5)
    for (let i = 0; i < 5; i++) {
      deps.advanceTime(2_000_000); // past cooldown
      svc.spawnPlayer({
        spawnPointEntityId: 'sp-1',
        playerId: 'p' + String(i),
        displayName: 'Player ' + String(i),
        meshContentHash: 'sha256:x',
        assetName: 'SM_Test',
      });
    }

    deps.advanceTime(2_000_000);
    const result = svc.spawnPlayer({
      spawnPointEntityId: 'sp-1',
      playerId: 'p6',
      displayName: 'Player 6',
      meshContentHash: 'sha256:x',
      assetName: 'SM_Test',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('spawn-point-full');
  });

  it('rejects spawn during cooldown period', () => {
    const deps = createDeps();
    const svc = createSpawnSystem(deps);
    setupSpawnPoint(deps, 'sp-1');

    svc.spawnPlayer({
      spawnPointEntityId: 'sp-1',
      playerId: 'p1',
      displayName: 'P1',
      meshContentHash: 'sha256:x',
      assetName: 'SM_Test',
    });

    // Don't advance time past cooldown
    const result = svc.spawnPlayer({
      spawnPointEntityId: 'sp-1',
      playerId: 'p2',
      displayName: 'P2',
      meshContentHash: 'sha256:x',
      assetName: 'SM_Test',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('spawn-on-cooldown');
  });
});

describe('SpawnSystem — spawnNpc', () => {
  it('spawns a Tier 0 ambient NPC', () => {
    const deps = createDeps();
    const svc = createSpawnSystem(deps);
    setupSpawnPoint(deps, 'sp-1', 'npc');

    const result = svc.spawnNpc({
      spawnPointEntityId: 'sp-1',
      displayName: 'Villager',
      meshContentHash: 'sha256:npc',
      assetName: 'SM_Villager',
      tier: 0,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tier = deps.componentStore.get(result.entityId, 'npc-tier') as NpcTierComponent;
      expect(tier.tier).toBe(0);
      expect(tier.aiBackend).toBe('rule-based');
      expect(tier.canCreateAssets).toBe(false);
    }
  });

  it('spawns a Tier 2 notable NPC with LLM backend', () => {
    const deps = createDeps();
    const svc = createSpawnSystem(deps);
    setupSpawnPoint(deps, 'sp-1', 'npc');

    const result = svc.spawnNpc({
      spawnPointEntityId: 'sp-1',
      displayName: 'Elder Thane',
      meshContentHash: 'sha256:notable',
      assetName: 'SM_ElderThane',
      tier: 2,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tier = deps.componentStore.get(result.entityId, 'npc-tier') as NpcTierComponent;
      expect(tier.tier).toBe(2);
      expect(tier.aiBackend).toBe('llm-haiku');
      expect(tier.canCreateAssets).toBe(true);
    }
  });
});

describe('SpawnSystem — releaseSpawn', () => {
  it('decrements active spawns on release', () => {
    const deps = createDeps();
    const svc = createSpawnSystem(deps);
    setupSpawnPoint(deps, 'sp-1');

    svc.spawnPlayer({
      spawnPointEntityId: 'sp-1',
      playerId: 'p1',
      displayName: 'P1',
      meshContentHash: 'sha256:x',
      assetName: 'SM_Test',
    });

    const released = svc.releaseSpawn('sp-1');
    expect(released).toBe(true);

    const sp = deps.componentStore.get('sp-1' as EntityId, 'spawn-point') as SpawnPointComponent;
    expect(sp.activeSpawns).toBe(0);
  });

  it('returns false for unknown spawn point', () => {
    const deps = createDeps();
    const svc = createSpawnSystem(deps);
    expect(svc.releaseSpawn('nonexistent')).toBe(false);
  });
});
