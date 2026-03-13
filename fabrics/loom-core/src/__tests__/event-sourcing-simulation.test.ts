import { describe, expect, it } from 'vitest';
import { createEventSourcingStore } from '../event-sourcing.js';
import type { StoredEvent } from '../event-sourcing.js';

describe('event-sourcing simulation', () => {
  it('simulates aggregate append, snapshot, and rebuild-from-snapshot recovery', () => {
    let now = 10_000;
    let id = 0;
    const store = createEventSourcingStore({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { next: () => `evt-${id++}` },
    });

    const reducer = (state: number, event: StoredEvent): number => state + (event.payload as number);

    store.append({ aggregateId: 'wallet-1', eventType: 'credit', payload: 50 });
    store.append({ aggregateId: 'wallet-1', eventType: 'credit', payload: 30 });
    const snapshot = store.snapshot('wallet-1', reducer, 0);
    store.append({ aggregateId: 'wallet-1', eventType: 'debit', payload: -20 });

    const rebuilt = store.rebuildFromSnapshot('wallet-1', reducer, 0);

    expect(snapshot.version).toBe(2);
    expect(rebuilt).toBe(60);
    expect(store.getStats().totalEvents).toBe(3);
  });
});
