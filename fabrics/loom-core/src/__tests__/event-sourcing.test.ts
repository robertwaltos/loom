import { describe, it, expect } from 'vitest';
import { createEventSourcingStore } from '../event-sourcing.js';
import type { EventSourcingDeps, StoredEvent } from '../event-sourcing.js';

function createDeps(): EventSourcingDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'evt-' + String(id++) },
  };
}

const sumReducer = (s: number, e: StoredEvent): number => s + (e.payload as number);

describe('EventSourcingStore — append', () => {
  it('appends an event with correct version', () => {
    const store = createEventSourcingStore(createDeps());
    const evt = store.append({
      aggregateId: 'agg-1',
      eventType: 'Created',
      payload: { name: 'test' },
    });
    expect(evt.eventId).toBe('evt-0');
    expect(evt.aggregateId).toBe('agg-1');
    expect(evt.eventType).toBe('Created');
    expect(evt.version).toBe(1);
    expect(evt.recordedAt).toBeGreaterThan(0);
  });

  it('increments version for same aggregate', () => {
    const store = createEventSourcingStore(createDeps());
    store.append({ aggregateId: 'agg-1', eventType: 'A', payload: null });
    store.append({ aggregateId: 'agg-1', eventType: 'B', payload: null });
    const third = store.append({ aggregateId: 'agg-1', eventType: 'C', payload: null });
    expect(third.version).toBe(3);
  });

  it('tracks versions independently per aggregate', () => {
    const store = createEventSourcingStore(createDeps());
    store.append({ aggregateId: 'agg-1', eventType: 'A', payload: null });
    store.append({ aggregateId: 'agg-1', eventType: 'B', payload: null });
    const evt = store.append({ aggregateId: 'agg-2', eventType: 'A', payload: null });
    expect(evt.version).toBe(1);
    expect(store.getVersion('agg-1')).toBe(2);
    expect(store.getVersion('agg-2')).toBe(1);
  });
});

describe('EventSourcingStore — getEvents / getVersion', () => {
  it('returns empty array for unknown aggregate', () => {
    const store = createEventSourcingStore(createDeps());
    expect(store.getEvents('unknown')).toEqual([]);
  });

  it('returns zero version for unknown aggregate', () => {
    const store = createEventSourcingStore(createDeps());
    expect(store.getVersion('unknown')).toBe(0);
  });

  it('returns all events for an aggregate in order', () => {
    const store = createEventSourcingStore(createDeps());
    store.append({ aggregateId: 'agg-1', eventType: 'A', payload: 1 });
    store.append({ aggregateId: 'agg-1', eventType: 'B', payload: 2 });
    const events = store.getEvents('agg-1');
    expect(events).toHaveLength(2);
    expect(events[0]?.eventType).toBe('A');
    expect(events[1]?.eventType).toBe('B');
  });
});

describe('EventSourcingStore — rebuild', () => {
  it('rebuilds state by replaying events through reducer', () => {
    const store = createEventSourcingStore(createDeps());
    store.append({ aggregateId: 'counter', eventType: 'Inc', payload: 5 });
    store.append({ aggregateId: 'counter', eventType: 'Inc', payload: 3 });
    store.append({ aggregateId: 'counter', eventType: 'Dec', payload: 2 });

    const reducer = (state: number, event: StoredEvent): number => {
      const val = event.payload as number;
      return event.eventType === 'Inc' ? state + val : state - val;
    };
    const result = store.rebuild('counter', reducer, 0);
    expect(result).toBe(6);
  });

  it('returns initial state for unknown aggregate', () => {
    const store = createEventSourcingStore(createDeps());
    const result = store.rebuild('unknown', (s: number) => s, 42);
    expect(result).toBe(42);
  });
});

describe('EventSourcingStore — snapshot', () => {
  it('creates and retrieves a snapshot', () => {
    const store = createEventSourcingStore(createDeps());
    store.append({ aggregateId: 'agg-1', eventType: 'Inc', payload: 10 });
    store.append({ aggregateId: 'agg-1', eventType: 'Inc', payload: 5 });

    const snap = store.snapshot('agg-1', sumReducer, 0);
    expect(snap.aggregateId).toBe('agg-1');
    expect(snap.state).toBe(15);
    expect(snap.version).toBe(2);

    const retrieved = store.getSnapshot<number>('agg-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.state).toBe(15);
  });

  it('returns undefined snapshot for unknown aggregate', () => {
    const store = createEventSourcingStore(createDeps());
    expect(store.getSnapshot('unknown')).toBeUndefined();
  });
});

describe('EventSourcingStore — rebuildFromSnapshot', () => {
  it('rebuilds from snapshot plus newer events', () => {
    const store = createEventSourcingStore(createDeps());
    store.append({ aggregateId: 'agg-1', eventType: 'Inc', payload: 10 });
    store.append({ aggregateId: 'agg-1', eventType: 'Inc', payload: 5 });
    store.snapshot('agg-1', sumReducer, 0);
    store.append({ aggregateId: 'agg-1', eventType: 'Inc', payload: 20 });
    store.append({ aggregateId: 'agg-1', eventType: 'Inc', payload: 3 });

    const result = store.rebuildFromSnapshot('agg-1', sumReducer, 0);
    expect(result).toBe(38);
  });

  it('falls back to full rebuild when no snapshot exists', () => {
    const store = createEventSourcingStore(createDeps());
    store.append({ aggregateId: 'agg-1', eventType: 'Inc', payload: 7 });
    store.append({ aggregateId: 'agg-1', eventType: 'Inc', payload: 3 });

    const result = store.rebuildFromSnapshot('agg-1', sumReducer, 0);
    expect(result).toBe(10);
  });
});

describe('EventSourcingStore — getStats', () => {
  it('reports aggregate, event, and snapshot counts', () => {
    const store = createEventSourcingStore(createDeps());
    store.append({ aggregateId: 'a', eventType: 'X', payload: null });
    store.append({ aggregateId: 'a', eventType: 'Y', payload: null });
    store.append({ aggregateId: 'b', eventType: 'X', payload: null });

    const reducer = (s: number, _e: StoredEvent): number => s + 1;
    store.snapshot('a', reducer, 0);

    const stats = store.getStats();
    expect(stats.totalAggregates).toBe(2);
    expect(stats.totalEvents).toBe(3);
    expect(stats.totalSnapshots).toBe(1);
  });
});
