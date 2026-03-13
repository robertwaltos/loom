import { describe, expect, it } from 'vitest';
import type { EventMetadata, LoomEvent } from '@loom/events-contracts';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import { createSilentLogger } from '../logger.js';

function createEvent(type: string, sequenceNumber: number): LoomEvent {
  const metadata: EventMetadata = {
    eventId: `evt-${sequenceNumber}`,
    correlationId: `corr-${sequenceNumber}`,
    causationId: null,
    timestamp: sequenceNumber * 1_000,
    sequenceNumber,
    sourceWorldId: 'world-1',
    sourceFabricId: 'loom-core',
    schemaVersion: 1,
  };
  return { type, payload: { sequenceNumber }, metadata };
}

describe('in-process-event-bus simulation', () => {
  it('simulates batch delivery, subscriber filtering, and replay window reads', async () => {
    const bus = createInProcessEventBus({ logger: createSilentLogger(), historyCapacity: 10 });
    const received: string[] = [];
    bus.subscribe({ types: ['entity.spawned'] }, (event) => {
      received.push(event.type);
    });

    bus.publishBatch([
      createEvent('entity.spawned', 1),
      createEvent('entity.moved', 2),
      createEvent('entity.spawned', 3),
    ]);
    await Promise.resolve();

    const replayed: LoomEvent[] = [];
    for await (const event of bus.replay({}, 0, 5_000)) {
      replayed.push(event);
    }

    expect(received).toEqual(['entity.spawned', 'entity.spawned']);
    expect(replayed).toHaveLength(3);
    expect(bus.backlogSize()).toBe(0);
    bus.close();
  });
});
