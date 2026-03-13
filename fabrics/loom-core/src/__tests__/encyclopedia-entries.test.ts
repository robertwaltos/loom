import { describe, it, expect } from 'vitest';
import {
  createEncyclopediaRegistry,
  ENCYCLOPEDIA_ENTRIES,
} from '../encyclopedia-entries.js';

// ── createEncyclopediaRegistry ─────────────────────────────────

describe('createEncyclopediaRegistry', () => {
  it('instantiates without throwing', () => {
    expect(() => createEncyclopediaRegistry()).not.toThrow();
  });

  it('totalEntries matches the static array length', () => {
    const registry = createEncyclopediaRegistry();
    expect(registry.totalEntries).toBe(ENCYCLOPEDIA_ENTRIES.length);
  });

  it('all() returns the full collection', () => {
    const registry = createEncyclopediaRegistry();
    expect(registry.all()).toHaveLength(ENCYCLOPEDIA_ENTRIES.length);
  });
});

// ── getEntry ───────────────────────────────────────────────────

describe('getEntry', () => {
  it('returns an entry for a known id', () => {
    const registry = createEncyclopediaRegistry();
    const first = ENCYCLOPEDIA_ENTRIES[0];
    const result = registry.getEntry(first.entryId);
    expect(result).toBeDefined();
    expect(result?.entryId).toBe(first.entryId);
  });

  it('returns undefined for an unknown id', () => {
    const registry = createEncyclopediaRegistry();
    expect(registry.getEntry('entry-does-not-exist-xyz')).toBeUndefined();
  });
});

// ── getEntriesByWorld ──────────────────────────────────────────

describe('getEntriesByWorld', () => {
  it('returns entries for a world that has entries', () => {
    const registry = createEncyclopediaRegistry();
    const worldId = ENCYCLOPEDIA_ENTRIES[0].worldId;
    const results = registry.getEntriesByWorld(worldId);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) => e.worldId === worldId)).toBe(true);
  });

  it('returns empty array for unknown world', () => {
    const registry = createEncyclopediaRegistry();
    expect(registry.getEntriesByWorld('world-definitely-does-not-exist')).toHaveLength(0);
  });
});

// ── getEntriesByDomain ─────────────────────────────────────────

describe('getEntriesByDomain', () => {
  it('returns entries for a domain that has entries', () => {
    const registry = createEncyclopediaRegistry();
    const domain = ENCYCLOPEDIA_ENTRIES[0].domain;
    const results = registry.getEntriesByDomain(domain);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) => e.domain === domain)).toBe(true);
  });
});

// ── searchByFigure ─────────────────────────────────────────────

describe('searchByFigure', () => {
  it('returns entries that mention a known historical figure', () => {
    const registry = createEncyclopediaRegistry();
    const withFigures = ENCYCLOPEDIA_ENTRIES.filter(
      (e) => e.historicalFigures && e.historicalFigures.length > 0,
    );
    if (withFigures.length === 0) return;
    const knownFigure = withFigures[0].historicalFigures![0];
    const results = registry.searchByFigure(knownFigure);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty array for an unknown figure', () => {
    const registry = createEncyclopediaRegistry();
    expect(registry.searchByFigure('Zzz NotAFigure Zzz')).toHaveLength(0);
  });
});

// ── data integrity ─────────────────────────────────────────────

describe('ENCYCLOPEDIA_ENTRIES data integrity', () => {
  it('every entry has a non-empty entryId', () => {
    expect(ENCYCLOPEDIA_ENTRIES.every((e) => e.entryId.length > 0)).toBe(true);
  });

  it('every entry has a non-empty title', () => {
    expect(ENCYCLOPEDIA_ENTRIES.every((e) => e.title.length > 0)).toBe(true);
  });

  it('every entry has a non-empty worldId', () => {
    expect(ENCYCLOPEDIA_ENTRIES.every((e) => e.worldId.length > 0)).toBe(true);
  });

  it('entry IDs are unique', () => {
    const ids = new Set(ENCYCLOPEDIA_ENTRIES.map((e) => e.entryId));
    expect(ids.size).toBe(ENCYCLOPEDIA_ENTRIES.length);
  });

  it('every entry has non-empty age content', () => {
    expect(
      ENCYCLOPEDIA_ENTRIES.every(
        (e) => e.content.ages5to7.length > 0 && e.content.ages8to10.length > 0,
      ),
    ).toBe(true);
  });

  it('every entry has a non-empty adventure text', () => {
    expect(ENCYCLOPEDIA_ENTRIES.every((e) => e.adventure.length > 0)).toBe(true);
  });
});
