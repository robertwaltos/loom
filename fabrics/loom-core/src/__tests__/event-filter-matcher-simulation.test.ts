import { describe, expect, it } from 'vitest';
import type { EventFilter, EventMetadata, LoomEvent } from '@loom/events-contracts';
import { matchesFilter } from '../event-filter-matcher.js';

function makeEvent(type: string, sequenceNumber: number, worldId = 'world-1'): LoomEvent {
  const metadata: EventMetadata = {
    eventId: `evt-${sequenceNumber}`,
    correlationId: `corr-${sequenceNumber}`,
    causationId: null,
    timestamp: Date.now() * 1000,
    sequenceNumber,
    sourceWorldId: worldId,
    sourceFabricId: 'loom-core',
    schemaVersion: 1,
  };
  return { type, payload: { sequenceNumber }, metadata };
}

describe('event-filter-matcher simulation', () => {
  it('simulates stream filtering by type, source world, and sequence cursor', () => {
    const events = [
      makeEvent('entity.spawned', 1, 'world-1'),
      makeEvent('entity.moved', 2, 'world-1'),
      makeEvent('entity.spawned', 3, 'world-2'),
    ];

    const filter: EventFilter = {
      types: ['entity.spawned'],
      sourceWorldIds: ['world-2'],
      afterSequence: 1,
    };

    const matched = events.filter((event) => matchesFilter(event, filter));
    expect(matched).toHaveLength(1);
    expect(matched[0]?.metadata.sequenceNumber).toBe(3);
  });
});
