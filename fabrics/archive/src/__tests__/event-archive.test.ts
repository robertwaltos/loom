import { describe, it, expect, beforeEach } from 'vitest';
import { createEventArchive } from '../event-archive.js';
import type { EventArchive, EventArchiveDeps } from '../event-archive.js';

// ── Test Helpers ─────────────────────────────────────────────────

function createDeps(): EventArchiveDeps {
  let idCounter = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: {
      generate() {
        idCounter += 1;
        return 'evt-' + String(idCounter);
      },
    },
  };
}

let archive: EventArchive;

beforeEach(() => {
  archive = createEventArchive(createDeps());
});

// ── Archive Events ───────────────────────────────────────────────

describe('EventArchive archive', () => {
  it('archives an event with correct metadata', () => {
    const event = archive.archive({
      eventType: 'player.move',
      worldId: 'earth',
      entityId: 'player-1',
      payload: '{"x":10,"y":20}',
      occurredAt: 500_000,
    });
    expect(event.eventId).toBe('evt-1');
    expect(event.eventType).toBe('player.move');
    expect(event.worldId).toBe('earth');
    expect(event.entityId).toBe('player-1');
    expect(event.sequenceNumber).toBe(0);
  });

  it('increments sequence numbers', () => {
    archive.archive({
      eventType: 'a',
      worldId: 'w',
      payload: '',
      occurredAt: 100,
    });
    const second = archive.archive({
      eventType: 'b',
      worldId: 'w',
      payload: '',
      occurredAt: 200,
    });
    expect(second.sequenceNumber).toBe(1);
  });

  it('defaults entityId to null', () => {
    const event = archive.archive({
      eventType: 'system.tick',
      worldId: 'earth',
      payload: '{}',
      occurredAt: 100,
    });
    expect(event.entityId).toBeNull();
  });

  it('records archivedAt timestamp', () => {
    const event = archive.archive({
      eventType: 'test',
      worldId: 'w',
      payload: '',
      occurredAt: 100,
    });
    expect(event.archivedAt).toBeGreaterThan(0);
  });
});

// ── Batch Archive ────────────────────────────────────────────────

describe('EventArchive archiveBatch', () => {
  it('archives multiple events at once', () => {
    const events = archive.archiveBatch([
      { eventType: 'a', worldId: 'w', payload: '1', occurredAt: 100 },
      { eventType: 'b', worldId: 'w', payload: '2', occurredAt: 200 },
      { eventType: 'c', worldId: 'w', payload: '3', occurredAt: 300 },
    ]);
    expect(events).toHaveLength(3);
    expect(events[0]?.eventId).toBe('evt-1');
    expect(events[2]?.eventId).toBe('evt-3');
  });

  it('maintains sequence order across batch', () => {
    const events = archive.archiveBatch([
      { eventType: 'a', worldId: 'w', payload: '', occurredAt: 100 },
      { eventType: 'b', worldId: 'w', payload: '', occurredAt: 200 },
    ]);
    expect(events[0]?.sequenceNumber).toBe(0);
    expect(events[1]?.sequenceNumber).toBe(1);
  });
});

// ── Query ────────────────────────────────────────────────────────

describe('EventArchive query', () => {
  it('queries by event type', () => {
    archive.archive({ eventType: 'move', worldId: 'w', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'attack', worldId: 'w', payload: '', occurredAt: 200 });
    archive.archive({ eventType: 'move', worldId: 'w', payload: '', occurredAt: 300 });
    const results = archive.query({ eventType: 'move' });
    expect(results).toHaveLength(2);
  });

  it('queries by world', () => {
    archive.archive({ eventType: 'a', worldId: 'earth', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'b', worldId: 'mars', payload: '', occurredAt: 200 });
    const results = archive.query({ worldId: 'earth' });
    expect(results).toHaveLength(1);
  });

  it('queries by entity', () => {
    archive.archive({
      eventType: 'a',
      worldId: 'w',
      entityId: 'e1',
      payload: '',
      occurredAt: 100,
    });
    archive.archive({
      eventType: 'b',
      worldId: 'w',
      entityId: 'e2',
      payload: '',
      occurredAt: 200,
    });
    const results = archive.query({ entityId: 'e1' });
    expect(results).toHaveLength(1);
  });

  it('queries by time range', () => {
    archive.archive({ eventType: 'a', worldId: 'w', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'b', worldId: 'w', payload: '', occurredAt: 500 });
    archive.archive({ eventType: 'c', worldId: 'w', payload: '', occurredAt: 900 });
    const results = archive.query({ startTime: 200, endTime: 600 });
    expect(results).toHaveLength(1);
    expect(results[0]?.eventType).toBe('b');
  });

  it('combines multiple query filters', () => {
    archive.archive({ eventType: 'move', worldId: 'earth', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'move', worldId: 'mars', payload: '', occurredAt: 200 });
    archive.archive({ eventType: 'attack', worldId: 'earth', payload: '', occurredAt: 300 });
    const results = archive.query({ eventType: 'move', worldId: 'earth' });
    expect(results).toHaveLength(1);
  });

  it('returns all events with empty query', () => {
    archive.archive({ eventType: 'a', worldId: 'w', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'b', worldId: 'w', payload: '', occurredAt: 200 });
    expect(archive.query({}).length).toBe(2);
  });
});

// ── Get Event ────────────────────────────────────────────────────

describe('EventArchive getEvent', () => {
  it('retrieves event by ID', () => {
    archive.archive({ eventType: 'test', worldId: 'w', payload: 'data', occurredAt: 100 });
    const event = archive.getEvent('evt-1');
    expect(event).toBeDefined();
    expect(event?.payload).toBe('data');
  });

  it('returns undefined for unknown ID', () => {
    expect(archive.getEvent('missing')).toBeUndefined();
  });
});

// ── Replay ───────────────────────────────────────────────────────

describe('EventArchive replay', () => {
  it('returns events in sequence order', () => {
    archive.archive({ eventType: 'a', worldId: 'w', payload: '', occurredAt: 300 });
    archive.archive({ eventType: 'b', worldId: 'w', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'c', worldId: 'w', payload: '', occurredAt: 200 });
    const replay = archive.getReplay({});
    expect(replay.eventCount).toBe(3);
    expect(replay.events[0]?.eventType).toBe('a');
    expect(replay.events[2]?.eventType).toBe('c');
  });

  it('reports start and end times', () => {
    archive.archive({ eventType: 'a', worldId: 'w', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'b', worldId: 'w', payload: '', occurredAt: 500 });
    const replay = archive.getReplay({});
    expect(replay.startTime).toBe(100);
    expect(replay.endTime).toBe(500);
  });

  it('returns empty replay for no matches', () => {
    const replay = archive.getReplay({ worldId: 'nonexistent' });
    expect(replay.eventCount).toBe(0);
    expect(replay.startTime).toBe(0);
    expect(replay.endTime).toBe(0);
  });
});

// ── Compaction ────────────────────────────────────────────────────

describe('EventArchive compaction', () => {
  it('removes oldest events beyond keep count', () => {
    archive.archive({ eventType: 'move', worldId: 'earth', payload: '1', occurredAt: 100 });
    archive.archive({ eventType: 'move', worldId: 'earth', payload: '2', occurredAt: 200 });
    archive.archive({ eventType: 'move', worldId: 'earth', payload: '3', occurredAt: 300 });
    const result = archive.compact('move', 'earth', 1);
    expect(result.beforeCount).toBe(3);
    expect(result.afterCount).toBe(1);
    expect(result.removedCount).toBe(2);
  });

  it('does not remove events of different type or world', () => {
    archive.archive({ eventType: 'move', worldId: 'earth', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'attack', worldId: 'earth', payload: '', occurredAt: 200 });
    archive.archive({ eventType: 'move', worldId: 'mars', payload: '', occurredAt: 300 });
    archive.compact('move', 'earth', 0);
    expect(archive.getStats().totalEvents).toBe(2);
  });

  it('returns zero removedCount when nothing to compact', () => {
    archive.archive({ eventType: 'a', worldId: 'w', payload: '', occurredAt: 100 });
    const result = archive.compact('a', 'w', 5);
    expect(result.removedCount).toBe(0);
  });
});

// ── Retention Policies ───────────────────────────────────────────

describe('EventArchive retention', () => {
  it('adds a retention policy', () => {
    const policy = archive.addRetentionPolicy({
      eventType: 'telemetry',
      maxAgeMs: 86_400_000,
    });
    expect(policy.eventType).toBe('telemetry');
    expect(policy.maxAgeMs).toBe(86_400_000);
    expect(archive.getRetentionPolicies()).toHaveLength(1);
  });

  it('applies retention and removes expired events', () => {
    archive.archive({ eventType: 'log', worldId: 'w', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'log', worldId: 'w', payload: '', occurredAt: 999_500 });
    archive.addRetentionPolicy({ eventType: 'log', maxAgeMs: 1000 });
    const removed = archive.applyRetention();
    expect(removed).toBe(1);
    expect(archive.getStats().totalEvents).toBe(1);
  });

  it('does not remove events within retention window', () => {
    archive.archive({ eventType: 'log', worldId: 'w', payload: '', occurredAt: 999_500 });
    archive.addRetentionPolicy({ eventType: 'log', maxAgeMs: 1000 });
    const removed = archive.applyRetention();
    expect(removed).toBe(0);
  });
});

// ── Count and Types ──────────────────────────────────────────────

describe('EventArchive counts', () => {
  it('counts by event type', () => {
    archive.archive({ eventType: 'move', worldId: 'w', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'move', worldId: 'w', payload: '', occurredAt: 200 });
    archive.archive({ eventType: 'attack', worldId: 'w', payload: '', occurredAt: 300 });
    expect(archive.countByType('move')).toBe(2);
    expect(archive.countByType('attack')).toBe(1);
    expect(archive.countByType('unknown')).toBe(0);
  });

  it('counts by world', () => {
    archive.archive({ eventType: 'a', worldId: 'earth', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'b', worldId: 'mars', payload: '', occurredAt: 200 });
    expect(archive.countByWorld('earth')).toBe(1);
    expect(archive.countByWorld('unknown')).toBe(0);
  });

  it('returns known event types', () => {
    archive.archive({ eventType: 'move', worldId: 'w', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'attack', worldId: 'w', payload: '', occurredAt: 200 });
    const types = archive.getEventTypes();
    expect(types).toContain('move');
    expect(types).toContain('attack');
    expect(types).toHaveLength(2);
  });
});

// ── Stats ────────────────────────────────────────────────────────

describe('EventArchive stats', () => {
  it('reports empty stats initially', () => {
    const stats = archive.getStats();
    expect(stats.totalEvents).toBe(0);
    expect(stats.eventTypeCount).toBe(0);
    expect(stats.worldCount).toBe(0);
    expect(stats.policyCount).toBe(0);
    expect(stats.totalCompactions).toBe(0);
  });

  it('tracks aggregate statistics', () => {
    archive.archive({ eventType: 'move', worldId: 'earth', payload: '', occurredAt: 100 });
    archive.archive({ eventType: 'attack', worldId: 'mars', payload: '', occurredAt: 200 });
    archive.addRetentionPolicy({ eventType: 'move', maxAgeMs: 1000 });
    archive.compact('move', 'earth', 0);
    const stats = archive.getStats();
    expect(stats.totalEvents).toBe(1);
    expect(stats.eventTypeCount).toBe(1);
    expect(stats.worldCount).toBe(1);
    expect(stats.policyCount).toBe(1);
    expect(stats.totalCompactions).toBe(1);
  });
});
