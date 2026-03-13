import { describe, expect, it } from 'vitest';
import { createFakeClock } from '../clock.js';
import { createEventFactory } from '../event-factory.js';
import { createSequentialIdGenerator } from '../id-generator.js';

describe('event-factory simulation', () => {
  it('simulates event metadata generation across source streams with causation', () => {
    const clock = createFakeClock(2_000_000);
    const idGenerator = createSequentialIdGenerator('sim-evt');
    const factory = createEventFactory(clock, idGenerator);

    const spawned = factory.create(
      'entity.spawned',
      { entityId: 'e-1' },
      { worldId: 'world-1', fabricId: 'loom-core' },
    );
    const moved = factory.create(
      'entity.moved',
      { entityId: 'e-1', x: 10, y: 20 },
      { worldId: 'world-1', fabricId: 'loom-core' },
      {
        correlationId: spawned.metadata.correlationId,
        causationId: spawned.metadata.eventId,
      },
    );
    const otherWorld = factory.create(
      'entity.spawned',
      { entityId: 'e-2' },
      { worldId: 'world-2', fabricId: 'loom-core' },
    );

    expect(spawned.metadata.sequenceNumber).toBe(1);
    expect(moved.metadata.sequenceNumber).toBe(2);
    expect(otherWorld.metadata.sequenceNumber).toBe(1);
    expect(moved.metadata.causationId).toBe(spawned.metadata.eventId);
  });
});
