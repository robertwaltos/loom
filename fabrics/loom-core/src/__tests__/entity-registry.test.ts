import { describe, it, expect } from 'vitest';
import { createEntityRegistry } from '../entity-registry.js';
import { createComponentStore } from '../component-store.js';
import { createEventFactory } from '../event-factory.js';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import { createFakeClock } from '../clock.js';
import { createSequentialIdGenerator } from '../id-generator.js';
import { createSilentLogger } from '../logger.js';
import type { LoomEvent } from '@loom/events-contracts';

function createTestRegistry() {
  const clock = createFakeClock(1_000_000);
  const idGenerator = createSequentialIdGenerator('ent');
  const logger = createSilentLogger();
  const eventBus = createInProcessEventBus({ logger });
  const eventFactory = createEventFactory(clock, idGenerator);
  const componentStore = createComponentStore();

  const registry = createEntityRegistry({
    eventBus,
    eventFactory,
    componentStore,
    idGenerator,
    clock,
  });

  return { registry, eventBus, clock };
}

describe('EntityRegistry spawn', () => {
  it('spawns entities with unique IDs', () => {
    const { registry } = createTestRegistry();
    const id = registry.spawn('player', 'world-1');
    expect(id).toMatch(/^ent-/);
    expect(registry.exists(id)).toBe(true);
  });

  it('retrieves spawned entities', () => {
    const { registry } = createTestRegistry();
    const id = registry.spawn('npc', 'world-1');
    const entity = registry.get(id);

    expect(entity.type).toBe('npc');
    expect(entity.worldId).toBe('world-1');
    expect(entity.version).toBe(1);
  });

  it('spawns with initial components', () => {
    const { registry } = createTestRegistry();
    const id = registry.spawn('player', 'world-1', {
      health: { current: 100, maximum: 100 },
    });

    const health = registry.components.get(id, 'health') as { current: number };
    expect(health.current).toBe(100);
  });
});

describe('EntityRegistry despawn', () => {
  it('throws on getting non-existent entity', () => {
    const { registry } = createTestRegistry();
    expect(() => {
      registry.get('nope' as never);
    }).toThrow('not found');
  });

  it('despawns entities and removes components', () => {
    const { registry } = createTestRegistry();
    const id = registry.spawn('item', 'world-1', {
      transform: { x: 0, y: 0, z: 0 },
    });

    registry.despawn(id, 'destroyed');
    expect(registry.exists(id)).toBe(false);
    expect(registry.components.listComponents(id)).toHaveLength(0);
  });
});

describe('EntityRegistry events', () => {
  it('emits entity.spawned event', async () => {
    const { registry, eventBus } = createTestRegistry();
    const events: LoomEvent[] = [];
    eventBus.subscribe({ types: ['entity.spawned'] }, (e) => {
      events.push(e);
    });

    registry.spawn('player', 'world-1');
    await Promise.resolve();

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('entity.spawned');
  });

  it('emits entity.despawned event', async () => {
    const { registry, eventBus } = createTestRegistry();
    const events: LoomEvent[] = [];
    eventBus.subscribe({ types: ['entity.despawned'] }, (e) => {
      events.push(e);
    });

    const id = registry.spawn('npc', 'world-1');
    registry.despawn(id, 'destroyed');
    await Promise.resolve();

    expect(events).toHaveLength(1);
  });
});

describe('EntityRegistry queries', () => {
  it('queries entities by world', () => {
    const { registry } = createTestRegistry();
    registry.spawn('player', 'world-1');
    registry.spawn('npc', 'world-1');
    registry.spawn('npc', 'world-2');

    expect(registry.queryByWorld('world-1')).toHaveLength(2);
    expect(registry.queryByWorld('world-2')).toHaveLength(1);
  });

  it('queries entities by type', () => {
    const { registry } = createTestRegistry();
    registry.spawn('player', 'world-1');
    registry.spawn('npc', 'world-1');
    registry.spawn('npc', 'world-2');

    expect(registry.queryByType('npc')).toHaveLength(2);
    expect(registry.queryByType('player')).toHaveLength(1);
  });

  it('counts all entities', () => {
    const { registry } = createTestRegistry();
    registry.spawn('player', 'world-1');
    registry.spawn('npc', 'world-1');
    expect(registry.count()).toBe(2);
  });
});
