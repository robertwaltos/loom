import { describe, expect, it } from 'vitest';
import { createSpawnSystem } from '../spawn-system.js';
import { createComponentStore } from '../component-store.js';
import { createEntityRegistry } from '../entity-registry.js';
import { createEventFactory } from '../event-factory.js';
import type { EntityId, SpawnPointComponent, TransformComponent } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

describe('spawn-system simulation', () => {
  it('simulates player and npc spawning with cooldown and spawn release lifecycle', () => {
    let now = 1_000_000;
    let idNum = 0;
    const clock = { nowMicroseconds: () => now++ };
    const componentStore = createComponentStore();
    const idGenerator = { generate: () => 'ent-' + String(idNum++) };
    const eventBus = {
      publish: () => undefined,
      publishBatch: () => undefined,
      subscribe: () => () => undefined,
      replay: () =>
        (async function* () {
          return;
        })(),
      backlogSize: () => 0,
    };
    const eventFactory = createEventFactory(clock, { generate: () => 'evt-' + String(idNum++) });
    const entityRegistry = createEntityRegistry({
      eventBus,
      eventFactory,
      componentStore,
      idGenerator,
      clock,
    });

    const system = createSpawnSystem({ entityRegistry, componentStore, clock });

    const transform: TransformComponent = {
      position: { x: 1, y: 0, z: 2 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    };
    const spawnPoint: SpawnPointComponent = {
      spawnType: 'player',
      capacity: 2,
      activeSpawns: 0,
      cooldownMicroseconds: 1_000_000,
    };

    componentStore.set(eid('sp-1'), 'transform', transform);
    componentStore.set(eid('sp-1'), 'spawn-point', spawnPoint);
    componentStore.set(eid('sp-1'), 'world-membership', {
      worldId: 'earth',
      enteredAt: 0,
      isTransitioning: false,
      transitionTargetWorldId: null,
    });

    const player = system.spawnPlayer({
      spawnPointEntityId: 'sp-1',
      playerId: 'p-1',
      displayName: 'Player One',
      meshContentHash: 'sha256:player',
      assetName: 'SM_Player',
    });

    const blocked = system.spawnNpc({
      spawnPointEntityId: 'sp-1',
      displayName: 'Villager',
      meshContentHash: 'sha256:npc',
      assetName: 'SM_NPC',
      tier: 0,
    });

    now += 2_000_000;
    const npc = system.spawnNpc({
      spawnPointEntityId: 'sp-1',
      displayName: 'Villager',
      meshContentHash: 'sha256:npc',
      assetName: 'SM_NPC',
      tier: 1,
    });

    const released = system.releaseSpawn('sp-1');

    expect(player.ok).toBe(true);
    expect(blocked.ok).toBe(false);
    expect(npc.ok).toBe(true);
    expect(released).toBe(true);
  });
});
