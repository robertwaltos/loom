import { describe, expect, it } from 'vitest';
import type { EventMetadata, LoomEvent } from '@loom/events-contracts';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import { createSilentLogger } from '../logger.js';

function buildEvent(type: string, sequenceNumber: number): LoomEvent {
  const metadata: EventMetadata = {
    eventId: `evt-${sequenceNumber}`,
    correlationId: `corr-${sequenceNumber}`,
    causationId: null,
    timestamp: Date.now() * 1000,
    sequenceNumber,
    sourceWorldId: 'world-1',
    sourceFabricId: 'loom-core',
    schemaVersion: 1,
  };
  return { type, payload: { sequenceNumber }, metadata };
}

describe('event-bus simulation', () => {
  it('simulates async fan-out delivery and historical replay of domain events', async () => {
    const bus = createInProcessEventBus({ logger: createSilentLogger(), historyCapacity: 100 });
    const delivered: string[] = [];
    bus.subscribe({ types: ['entity.spawned'] }, (event) => {
      delivered.push(event.type);
    });

    bus.publish(buildEvent('entity.spawned', 1));
    bus.publish(buildEvent('entity.despawned', 2));
    await Promise.resolve();

    const replayed: LoomEvent[] = [];
    for await (const event of bus.replay({ types: ['entity.spawned'] }, 0, Date.now() * 1000 + 10_000_000)) {
      replayed.push(event);
    }

    expect(delivered).toEqual(['entity.spawned']);
    expect(replayed).toHaveLength(1);
    expect(bus.backlogSize()).toBe(0);
    bus.close();
  });
});
