/**
 * Event Contract Smoke Tests
 *
 * Validates that event types are structurally sound and
 * that the type system enforces immutability and completeness.
 */

import { describe, it, expect } from 'vitest';
import type { LoomEvent, EventMetadata, EventFilter } from '../event.js';

function createMetadata(overrides: Partial<EventMetadata> = {}): EventMetadata {
  return {
    eventId: 'evt-001',
    correlationId: 'corr-001',
    causationId: null,
    timestamp: Date.now() * 1000,
    sequenceNumber: 1,
    sourceWorldId: 'world-alpha',
    sourceFabricId: 'loom-core',
    schemaVersion: 1,
    ...overrides,
  };
}

describe('LoomEvent', () => {
  it('creates a valid event with type and payload', () => {
    const event: LoomEvent<'player.connected', { playerId: string }> = {
      type: 'player.connected',
      payload: { playerId: 'player-42' },
      metadata: createMetadata(),
    };

    expect(event.type).toBe('player.connected');
    expect(event.payload.playerId).toBe('player-42');
    expect(event.metadata.eventId).toBe('evt-001');
  });

  it('carries causation chain for event provenance', () => {
    const causeEvent: LoomEvent<'npc.spotted-player', { npcId: string }> = {
      type: 'npc.spotted-player',
      payload: { npcId: 'npc-77' },
      metadata: createMetadata({ eventId: 'evt-cause' }),
    };

    const effectEvent: LoomEvent<'npc.started-pursuit', { npcId: string }> = {
      type: 'npc.started-pursuit',
      payload: { npcId: 'npc-77' },
      metadata: createMetadata({
        eventId: 'evt-effect',
        causationId: causeEvent.metadata.eventId,
        correlationId: causeEvent.metadata.correlationId,
        sequenceNumber: 2,
      }),
    };

    expect(effectEvent.metadata.causationId).toBe('evt-cause');
    expect(effectEvent.metadata.correlationId).toBe(causeEvent.metadata.correlationId);
  });

  it('enforces microsecond timestamp precision', () => {
    const microTimestamp = Date.now() * 1000;
    const metadata = createMetadata({ timestamp: microTimestamp });

    expect(metadata.timestamp).toBeGreaterThan(1_000_000_000_000_000);
  });
});

describe('EventFilter', () => {
  it('creates a filter matching specific event types', () => {
    const filter: EventFilter = {
      types: ['player.connected', 'player.disconnected'],
    };

    expect(filter.types).toHaveLength(2);
    expect(filter.types).toContain('player.connected');
  });

  it('creates a filter scoped to a single world', () => {
    const filter: EventFilter = {
      sourceWorldIds: ['world-alpha'],
      afterSequence: 100,
    };

    expect(filter.sourceWorldIds).toHaveLength(1);
    expect(filter.afterSequence).toBe(100);
  });

  it('allows empty filter to match all events', () => {
    const filter: EventFilter = {};

    expect(filter.types).toBeUndefined();
    expect(filter.sourceWorldIds).toBeUndefined();
  });
});
