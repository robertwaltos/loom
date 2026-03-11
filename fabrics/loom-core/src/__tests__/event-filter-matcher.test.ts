import { describe, it, expect } from 'vitest';
import { matchesFilter } from '../event-filter-matcher.js';
import type { LoomEvent, EventFilter } from '@loom/events-contracts';

function makeEvent(overrides: Partial<LoomEvent> = {}): LoomEvent {
  return {
    type: 'entity.spawned',
    payload: {},
    metadata: {
      eventId: 'evt-1',
      correlationId: 'corr-1',
      causationId: null,
      timestamp: 1000,
      sequenceNumber: 1,
      sourceWorldId: 'world-1',
      sourceFabricId: 'loom-core',
      schemaVersion: 1,
    },
    ...overrides,
  };
}

describe('matchesFilter', () => {
  it('matches when filter is empty', () => {
    expect(matchesFilter(makeEvent(), {})).toBe(true);
  });

  it('matches by event type', () => {
    const filter: EventFilter = { types: ['entity.spawned'] };
    expect(matchesFilter(makeEvent(), filter)).toBe(true);
  });

  it('rejects non-matching event type', () => {
    const filter: EventFilter = { types: ['entity.despawned'] };
    expect(matchesFilter(makeEvent(), filter)).toBe(false);
  });

  it('matches by source world', () => {
    const filter: EventFilter = { sourceWorldIds: ['world-1'] };
    expect(matchesFilter(makeEvent(), filter)).toBe(true);
  });

  it('rejects non-matching world', () => {
    const filter: EventFilter = { sourceWorldIds: ['world-99'] };
    expect(matchesFilter(makeEvent(), filter)).toBe(false);
  });

  it('matches by source fabric', () => {
    const filter: EventFilter = { sourceFabricIds: ['loom-core'] };
    expect(matchesFilter(makeEvent(), filter)).toBe(true);
  });

  it('matches by sequence number', () => {
    const filter: EventFilter = { afterSequence: 0 };
    expect(matchesFilter(makeEvent(), filter)).toBe(true);
  });

  it('rejects events before sequence threshold', () => {
    const filter: EventFilter = { afterSequence: 5 };
    expect(matchesFilter(makeEvent(), filter)).toBe(false);
  });

  it('matches with multiple filter criteria', () => {
    const filter: EventFilter = {
      types: ['entity.spawned'],
      sourceWorldIds: ['world-1'],
      sourceFabricIds: ['loom-core'],
    };
    expect(matchesFilter(makeEvent(), filter)).toBe(true);
  });
});
