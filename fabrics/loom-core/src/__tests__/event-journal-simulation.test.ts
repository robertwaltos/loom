import { describe, expect, it } from 'vitest';
import { createEventJournal } from '../event-journal.js';

describe('event-journal simulation', () => {
  it('simulates session journaling with record, query, seal, and stats flow', () => {
    let now = 1_000_000;
    const journal = createEventJournal({
      clock: { nowMicroseconds: () => (now += 1_000) },
    });

    journal.createJournal('combat-session');
    journal.record('combat-session', {
      type: 'entity.spawned',
      payload: { entityId: 'e-1' },
      metadata: {
        eventId: 'evt-1',
        timestamp: 10,
        sequenceNumber: 1,
        sourceWorldId: 'world-1',
        sourceFabricId: 'loom-core',
      },
    });
    journal.record('combat-session', {
      type: 'entity.moved',
      payload: { entityId: 'e-1', x: 2, y: 1 },
      metadata: {
        eventId: 'evt-2',
        timestamp: 20,
        sequenceNumber: 2,
        sourceWorldId: 'world-1',
        sourceFabricId: 'loom-core',
      },
    });

    const movedEvents = journal.getEntries('combat-session', { types: ['entity.moved'] });
    const sealed = journal.seal('combat-session');
    const blockedAfterSeal = journal.record('combat-session', {
      type: 'entity.despawned',
      payload: { entityId: 'e-1' },
      metadata: {
        eventId: 'evt-3',
        timestamp: 30,
        sequenceNumber: 3,
        sourceWorldId: 'world-1',
        sourceFabricId: 'loom-core',
      },
    });

    expect(movedEvents).toHaveLength(1);
    expect(sealed).toBe(true);
    expect(blockedAfterSeal).toBe(false);
    expect(journal.getStats().totalEntries).toBe(2);
  });
});
