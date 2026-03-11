import { describe, it, expect } from 'vitest';
import { createEventJournal } from '../event-journal.js';
import type { EventJournalDeps, RecordableEvent } from '../event-journal.js';

function makeDeps(): EventJournalDeps {
  let time = 1_000_000;
  return { clock: { nowMicroseconds: () => (time += 1_000_000) } };
}

function makeEvent(
  overrides?: Partial<{
    type: string;
    payload: unknown;
    eventId: string;
    timestamp: number;
    sequenceNumber: number;
    sourceWorldId: string;
    sourceFabricId: string;
  }>,
): RecordableEvent {
  return {
    type: overrides?.type ?? 'entity.moved',
    payload: overrides?.payload ?? { x: 1, y: 2 },
    metadata: {
      eventId: overrides?.eventId ?? 'evt-1',
      timestamp: overrides?.timestamp ?? 5_000_000,
      sequenceNumber: overrides?.sequenceNumber ?? 1,
      sourceWorldId: overrides?.sourceWorldId ?? 'world-a',
      sourceFabricId: overrides?.sourceFabricId ?? 'loom-core',
    },
  };
}

describe('EventJournal — journal lifecycle', () => {
  it('creates a journal', () => {
    const journal = createEventJournal(makeDeps());
    expect(journal.createJournal('session-1')).toBe(true);
    expect(journal.listJournals()).toHaveLength(1);
  });

  it('rejects duplicate journal names', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('session-1');
    expect(journal.createJournal('session-1')).toBe(false);
  });

  it('deletes a journal', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('session-1');
    expect(journal.deleteJournal('session-1')).toBe(true);
    expect(journal.listJournals()).toHaveLength(0);
  });

  it('returns false when deleting unknown journal', () => {
    const journal = createEventJournal(makeDeps());
    expect(journal.deleteJournal('unknown')).toBe(false);
  });
});

describe('EventJournal — recording', () => {
  it('records an event', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('session-1');

    const success = journal.record('session-1', makeEvent());
    expect(success).toBe(true);

    const entries = journal.getEntries('session-1');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.type).toBe('entity.moved');
  });

  it('assigns sequential indices', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('session-1');

    journal.record('session-1', makeEvent({ eventId: 'a' }));
    journal.record('session-1', makeEvent({ eventId: 'b' }));

    const entries = journal.getEntries('session-1');
    expect(entries[0]?.index).toBe(0);
    expect(entries[1]?.index).toBe(1);
  });

  it('returns false for unknown journal', () => {
    const journal = createEventJournal(makeDeps());
    expect(journal.record('unknown', makeEvent())).toBe(false);
  });

  it('rejects recording to sealed journal', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('session-1');
    journal.seal('session-1');

    expect(journal.record('session-1', makeEvent())).toBe(false);
  });
});

describe('EventJournal — sealing', () => {
  it('seals a journal', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('session-1');

    expect(journal.seal('session-1')).toBe(true);
    const meta = journal.getMeta('session-1');
    expect(meta?.sealed).toBe(true);
  });

  it('returns false when sealing unknown journal', () => {
    const journal = createEventJournal(makeDeps());
    expect(journal.seal('unknown')).toBe(false);
  });

  it('returns false when re-sealing', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('session-1');
    journal.seal('session-1');
    expect(journal.seal('session-1')).toBe(false);
  });
});

describe('EventJournal — queries', () => {
  it('filters by timestamp range', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('s1');

    journal.record('s1', makeEvent({ timestamp: 100 }));
    journal.record('s1', makeEvent({ timestamp: 200 }));
    journal.record('s1', makeEvent({ timestamp: 300 }));

    const results = journal.getEntries('s1', {
      fromTimestamp: 150,
      toTimestamp: 250,
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.timestamp).toBe(200);
  });

  it('filters by event type', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('s1');

    journal.record('s1', makeEvent({ type: 'entity.moved' }));
    journal.record('s1', makeEvent({ type: 'entity.spawned' }));
    journal.record('s1', makeEvent({ type: 'entity.moved' }));

    const results = journal.getEntries('s1', { types: ['entity.spawned'] });
    expect(results).toHaveLength(1);
  });

  it('filters by source world', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('s1');

    journal.record('s1', makeEvent({ sourceWorldId: 'earth' }));
    journal.record('s1', makeEvent({ sourceWorldId: 'mars' }));

    const results = journal.getEntries('s1', { sourceWorldIds: ['mars'] });
    expect(results).toHaveLength(1);
    expect(results[0]?.sourceWorldId).toBe('mars');
  });

  it('applies limit', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('s1');

    for (let i = 0; i < 10; i++) {
      journal.record('s1', makeEvent({ eventId: 'evt-' + String(i) }));
    }

    const results = journal.getEntries('s1', { limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('gets entry by index', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('s1');
    journal.record('s1', makeEvent({ eventId: 'first' }));
    journal.record('s1', makeEvent({ eventId: 'second' }));

    const entry = journal.getEntry('s1', 1);
    expect(entry?.eventId).toBe('second');
  });

  it('returns undefined for out-of-range index', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('s1');
    expect(journal.getEntry('s1', 99)).toBeUndefined();
  });

  it('returns empty for unknown journal', () => {
    const journal = createEventJournal(makeDeps());
    expect(journal.getEntries('unknown')).toHaveLength(0);
  });
});

describe('EventJournal — metadata', () => {
  it('returns journal metadata', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('session-1');
    journal.record('session-1', makeEvent({ timestamp: 5_000 }));

    const meta = journal.getMeta('session-1');
    expect(meta?.name).toBe('session-1');
    expect(meta?.entryCount).toBe(1);
    expect(meta?.startedAt).toBeGreaterThan(0);
    expect(meta?.lastEntryAt).toBe(5_000);
    expect(meta?.sealed).toBe(false);
  });

  it('returns undefined for unknown journal', () => {
    const journal = createEventJournal(makeDeps());
    expect(journal.getMeta('unknown')).toBeUndefined();
  });
});

describe('EventJournal — stats', () => {
  it('computes aggregate stats', () => {
    const journal = createEventJournal(makeDeps());
    journal.createJournal('active');
    journal.createJournal('sealed');
    journal.seal('sealed');

    journal.record('active', makeEvent());
    journal.record('active', makeEvent({ eventId: 'e2' }));

    const stats = journal.getStats();
    expect(stats.totalJournals).toBe(2);
    expect(stats.totalEntries).toBe(2);
    expect(stats.sealedJournals).toBe(1);
    expect(stats.activeJournals).toBe(1);
  });

  it('empty stats for fresh journal', () => {
    const journal = createEventJournal(makeDeps());
    const stats = journal.getStats();
    expect(stats.totalJournals).toBe(0);
    expect(stats.totalEntries).toBe(0);
  });
});
