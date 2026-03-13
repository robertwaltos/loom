import { describe, it, expect, vi } from 'vitest';
import { createChronicleService } from '../chronicle-service.js';
import type { ChronicleServiceDeps } from '../chronicle-service.js';

// ── Helpers ────────────────────────────────────────────────────────

let idSeq = 0;

function makeDeps(nowUs = 1000): ChronicleServiceDeps {
  return {
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: { generate: () => { idSeq++; return `entry-${String(idSeq)}`; } },
  };
}

const BASE_ENTRY = {
  authorEntityId: 'player-1' as never,
  worldId: 'world-a',
  entryType: 'governance' as const,
  summary: 'An election was held',
  body: 'House Silfen won the election for Governor.',
  tags: ['election', 'governance'],
};

// ── Tests ──────────────────────────────────────────────────────────

describe('createEntry', () => {
  it('returns an entry with correct fields', () => {
    const svc = createChronicleService(makeDeps(5000));
    const entry = svc.createEntry(BASE_ENTRY);
    expect(entry.worldId).toBe('world-a');
    expect(entry.summary).toBe('An election was held');
    expect(entry.entryType).toBe('governance');
    expect(entry.timestamp).toBe(5000);
  });

  it('assigns id from generator', () => {
    const svc = createChronicleService(makeDeps());
    const entry = svc.createEntry(BASE_ENTRY);
    expect(entry.entryId).toMatch(/^entry-/);
  });

  it('first entry has null previousHash', () => {
    const svc = createChronicleService(makeDeps());
    const entry = svc.createEntry(BASE_ENTRY);
    expect(entry.previousHash).toBeNull();
  });

  it('second entry links to first entry hash', () => {
    const svc = createChronicleService(makeDeps());
    const first = svc.createEntry(BASE_ENTRY);
    const second = svc.createEntry({ ...BASE_ENTRY, summary: 'Second event' });
    expect(second.previousHash).toBe(first.entryHash);
  });

  it('stores default empty arrays for mentionedEntities and tags', () => {
    const svc = createChronicleService(makeDeps());
    const entry = svc.createEntry({
      ...BASE_ENTRY,
      mentionedEntities: undefined,
      tags: undefined,
    });
    expect(entry.mentionedEntities).toEqual([]);
    expect(entry.tags).toEqual([]);
  });

  it('notifies eventSink on entry creation', () => {
    const sink = { onEntryCreated: vi.fn() };
    const svc = createChronicleService({ ...makeDeps(), eventSink: sink });
    const entry = svc.createEntry(BASE_ENTRY);
    expect(sink.onEntryCreated).toHaveBeenCalledWith(entry);
  });
});

describe('getEntry', () => {
  it('returns undefined for unknown id', () => {
    const svc = createChronicleService(makeDeps());
    expect(svc.getEntry('nonexistent')).toBeUndefined();
  });

  it('retrieves a created entry by id', () => {
    const svc = createChronicleService(makeDeps());
    const entry = svc.createEntry(BASE_ENTRY);
    expect(svc.getEntry(entry.entryId)).toEqual(entry);
  });
});

describe('getWorldEntries', () => {
  it('returns empty array for unknown world', () => {
    const svc = createChronicleService(makeDeps());
    expect(svc.getWorldEntries('unknown')).toHaveLength(0);
  });

  it('returns only entries for the specified world', () => {
    const svc = createChronicleService(makeDeps());
    svc.createEntry(BASE_ENTRY);
    svc.createEntry({ ...BASE_ENTRY, worldId: 'world-b' });
    expect(svc.getWorldEntries('world-a')).toHaveLength(1);
    expect(svc.getWorldEntries('world-b')).toHaveLength(1);
  });
});

describe('getAuthorEntries', () => {
  it('returns entries for a specific author', () => {
    const svc = createChronicleService(makeDeps());
    svc.createEntry(BASE_ENTRY);
    svc.createEntry({ ...BASE_ENTRY, authorEntityId: 'player-2' as never });
    expect(svc.getAuthorEntries('player-1' as never)).toHaveLength(1);
  });
});

describe('search', () => {
  it('matches by summary', () => {
    const svc = createChronicleService(makeDeps());
    svc.createEntry(BASE_ENTRY);
    const result = svc.search('world-a', 'election');
    expect(result.entries).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.query).toBe('election');
  });

  it('matches by body', () => {
    const svc = createChronicleService(makeDeps());
    svc.createEntry(BASE_ENTRY);
    const result = svc.search('world-a', 'silfen');
    expect(result.entries).toHaveLength(1);
  });

  it('matches by tag', () => {
    const svc = createChronicleService(makeDeps());
    svc.createEntry(BASE_ENTRY);
    const result = svc.search('world-a', 'governance');
    expect(result.entries).toHaveLength(1);
  });

  it('returns empty results when no match', () => {
    const svc = createChronicleService(makeDeps());
    svc.createEntry(BASE_ENTRY);
    const result = svc.search('world-a', 'zzznomatch');
    expect(result.entries).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });

  it('is case-insensitive', () => {
    const svc = createChronicleService(makeDeps());
    svc.createEntry(BASE_ENTRY);
    expect(svc.search('world-a', 'ELECTION').entries).toHaveLength(1);
  });
});

describe('searchByEntity', () => {
  it('finds entries that mention the specified entity', () => {
    const svc = createChronicleService(makeDeps());
    svc.createEntry({ ...BASE_ENTRY, mentionedEntities: ['npc-1' as never] });
    expect(svc.searchByEntity('npc-1' as never)).toHaveLength(1);
    expect(svc.searchByEntity('npc-2' as never)).toHaveLength(0);
  });
});

describe('entryCount', () => {
  it('returns 0 for empty service', () => {
    const svc = createChronicleService(makeDeps());
    expect(svc.entryCount()).toBe(0);
  });

  it('counts all entries across worlds', () => {
    const svc = createChronicleService(makeDeps());
    svc.createEntry(BASE_ENTRY);
    svc.createEntry({ ...BASE_ENTRY, worldId: 'world-b' });
    expect(svc.entryCount()).toBe(2);
  });
});

describe('getChainHead', () => {
  it('returns null when no entries for world', () => {
    const svc = createChronicleService(makeDeps());
    expect(svc.getChainHead('world-a')).toBeNull();
  });

  it('returns the hash of the most recent entry', () => {
    const svc = createChronicleService(makeDeps());
    const first = svc.createEntry(BASE_ENTRY);
    expect(svc.getChainHead('world-a')).toBe(first.entryHash);

    const second = svc.createEntry({ ...BASE_ENTRY, summary: 'Second' });
    expect(svc.getChainHead('world-a')).toBe(second.entryHash);
  });
});

describe('verifyChain', () => {
  it('returns empty array when chain is intact', () => {
    const svc = createChronicleService(makeDeps());
    svc.createEntry(BASE_ENTRY);
    svc.createEntry({ ...BASE_ENTRY, summary: 'Second event' });
    expect(svc.verifyChain('world-a')).toHaveLength(0);
  });

  it('returns empty array for world with no entries', () => {
    const svc = createChronicleService(makeDeps());
    expect(svc.verifyChain('world-a')).toHaveLength(0);
  });
});
