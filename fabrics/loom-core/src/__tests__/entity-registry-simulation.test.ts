import { describe, expect, it } from 'vitest';
import type { LoomEvent } from '@loom/events-contracts';
import { createEntityRegistry } from '../entity-registry.js';
import { createComponentStore } from '../component-store.js';
import { createEventFactory } from '../event-factory.js';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import { createFakeClock } from '../clock.js';
import { createSequentialIdGenerator } from '../id-generator.js';
import { createSilentLogger } from '../logger.js';

describe('entity-registry simulation', () => {
  it('simulates spawn, query, and despawn while emitting lifecycle events', async () => {
    const clock = createFakeClock(1_000_000);
    const idGenerator = createSequentialIdGenerator('sim-ent');
    const eventBus = createInProcessEventBus({ logger: createSilentLogger() });
    const eventFactory = createEventFactory(clock, idGenerator);
    const componentStore = createComponentStore();
    const registry = createEntityRegistry({
      eventBus,
      eventFactory,
      componentStore,
      idGenerator,
      clock,
    });

    const events: LoomEvent[] = [];
    eventBus.subscribe({ types: ['entity.spawned', 'entity.despawned'] }, (event) => {
      events.push(event);
    });

    const playerId = registry.spawn('player', 'world-1', { health: { current: 100, maximum: 100 } });
    const npcId = registry.spawn('npc', 'world-1');
    registry.despawn(npcId, 'expired');
    await Promise.resolve();

    expect(registry.queryByWorld('world-1')).toHaveLength(1);
    expect(registry.exists(playerId)).toBe(true);
    expect(registry.components.get(playerId, 'health')).toEqual({ current: 100, maximum: 100 });
    expect(events.map((event) => event.type)).toEqual(['entity.spawned', 'entity.spawned', 'entity.despawned']);

    eventBus.close();
  });
});
