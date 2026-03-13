import { describe, expect, it } from 'vitest';
import { createWorldManager } from '../world-manager.js';
import { createEventFactory } from '../event-factory.js';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import { createFakeClock } from '../clock.js';
import { createSequentialIdGenerator } from '../id-generator.js';
import { createSilentLogger } from '../logger.js';

describe('world-manager simulation', () => {
  it('simulates world lifecycle and capacity enforcement with emitted lifecycle events', async () => {
    const clock = createFakeClock(1_000_000);
    const bus = createInProcessEventBus({ logger: createSilentLogger() });
    const events: string[] = [];
    bus.subscribe({ types: ['world.loaded', 'world.unloaded'] }, (evt) => events.push(evt.type));

    const worlds = createWorldManager({
      eventBus: bus,
      eventFactory: createEventFactory(clock, createSequentialIdGenerator('evt')),
      clock,
    });

    worlds.loadWorld('earth', 'server-1', 2);
    worlds.incrementPlayers('earth');
    worlds.incrementPlayers('earth');
    expect(() => worlds.incrementPlayers('earth')).toThrow();
    worlds.decrementPlayers('earth');
    worlds.unloadWorld('earth', 'shutdown');

    await Promise.resolve();

    expect(events).toEqual(['world.loaded', 'world.unloaded']);
    expect(worlds.tryGetWorld('earth')).toBeUndefined();
  });
});
