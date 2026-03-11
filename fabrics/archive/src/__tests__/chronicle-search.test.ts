import { describe, it, expect } from 'vitest';
import { createChronicleSearchIndex } from '../chronicle-search.js';
import type { ChronicleSearchIndex, IndexEntry } from '../chronicle-search.js';
import type { ChronicleCategory } from '../chronicle.js';

// ─── Test Helpers ───────────────────────────────────────────────────

function createTestIndex(): ChronicleSearchIndex {
  return createChronicleSearchIndex();
}

function entry(
  entryId: string,
  tokens: string[],
  category: ChronicleCategory = 'entity.lifecycle',
  worldId = 'world-1',
): IndexEntry {
  return { entryId, category, worldId, tokens };
}

// ─── Indexing ───────────────────────────────────────────────────────

describe('Chronicle search indexing', () => {
  it('starts empty', () => {
    const idx = createTestIndex();
    const stats = idx.getStats();
    expect(stats.indexedEntries).toBe(0);
    expect(stats.uniqueTokens).toBe(0);
  });

  it('indexes an entry', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['dynasty', 'founded']));
    expect(idx.getStats().indexedEntries).toBe(1);
    expect(idx.getStats().uniqueTokens).toBe(2);
  });

  it('deduplicates tokens per entry', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['trade', 'trade', 'kalon']));
    expect(idx.getStats().uniqueTokens).toBe(2);
  });

  it('shares token across entries', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['trade']));
    idx.index(entry('e-2', ['trade']));
    expect(idx.getStats().uniqueTokens).toBe(1);
    expect(idx.getStats().indexedEntries).toBe(2);
  });

  it('removes an entry', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['trade']));
    expect(idx.remove('e-1')).toBe(true);
    expect(idx.getStats().indexedEntries).toBe(0);
    expect(idx.getStats().uniqueTokens).toBe(0);
  });

  it('returns false removing unknown entry', () => {
    const idx = createTestIndex();
    expect(idx.remove('nope')).toBe(false);
  });

  it('clears all entries', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['a']));
    idx.index(entry('e-2', ['b']));
    idx.clear();
    expect(idx.getStats().indexedEntries).toBe(0);
  });
});

// ─── OR Search ──────────────────────────────────────────────────────

describe('Chronicle search OR mode', () => {
  it('finds entries matching any term', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['dynasty', 'founded']));
    idx.index(entry('e-2', ['trade', 'kalon']));
    const results = idx.search({ terms: ['dynasty'], mode: 'or' });
    expect(results).toHaveLength(1);
    expect(results[0]?.entryId).toBe('e-1');
  });

  it('returns multiple matches', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['dynasty', 'trade']));
    idx.index(entry('e-2', ['trade', 'kalon']));
    const results = idx.search({ terms: ['trade'], mode: 'or' });
    expect(results).toHaveLength(2);
  });

  it('scores higher for more matched terms', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['dynasty']));
    idx.index(entry('e-2', ['dynasty', 'trade']));
    const results = idx.search({ terms: ['dynasty', 'trade'], mode: 'or' });
    expect(results[0]?.entryId).toBe('e-2');
    expect(results[0]?.score).toBe(1);
    expect(results[1]?.score).toBe(0.5);
  });

  it('returns empty for no matches', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['dynasty']));
    const results = idx.search({ terms: ['unknown'], mode: 'or' });
    expect(results).toHaveLength(0);
  });

  it('is case insensitive', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['Dynasty', 'TRADE']));
    const results = idx.search({ terms: ['dynasty', 'trade'], mode: 'or' });
    expect(results).toHaveLength(1);
  });

  it('returns empty for empty terms', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['dynasty']));
    expect(idx.search({ terms: [], mode: 'or' })).toHaveLength(0);
  });
});

// ─── AND Search ─────────────────────────────────────────────────────

describe('Chronicle search AND mode', () => {
  it('requires all terms to match', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['dynasty', 'trade']));
    idx.index(entry('e-2', ['dynasty']));
    const results = idx.search({ terms: ['dynasty', 'trade'], mode: 'and' });
    expect(results).toHaveLength(1);
    expect(results[0]?.entryId).toBe('e-1');
  });

  it('returns empty when no entry has all terms', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['dynasty']));
    idx.index(entry('e-2', ['trade']));
    const results = idx.search({ terms: ['dynasty', 'trade'], mode: 'and' });
    expect(results).toHaveLength(0);
  });
});

// ─── Filtering ──────────────────────────────────────────────────────

describe('Chronicle search filtering', () => {
  it('filters by category', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['trade'], 'economy.transaction'));
    idx.index(entry('e-2', ['trade'], 'entity.lifecycle'));
    const results = idx.search({
      terms: ['trade'],
      mode: 'or',
      category: 'economy.transaction',
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.entryId).toBe('e-1');
  });

  it('filters by world', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['trade'], 'entity.lifecycle', 'world-1'));
    idx.index(entry('e-2', ['trade'], 'entity.lifecycle', 'world-2'));
    const results = idx.search({
      terms: ['trade'],
      mode: 'or',
      worldId: 'world-2',
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.entryId).toBe('e-2');
  });
});

// ─── Pagination ─────────────────────────────────────────────────────

describe('Chronicle search pagination', () => {
  it('limits results', () => {
    const idx = createTestIndex();
    for (let i = 0; i < 5; i++) {
      idx.index(entry('e-' + String(i), ['trade']));
    }
    const results = idx.search({ terms: ['trade'], mode: 'or', limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('applies offset', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['trade', 'dynasty']));
    idx.index(entry('e-2', ['trade']));
    const results = idx.search({
      terms: ['trade', 'dynasty'],
      mode: 'or',
      offset: 1,
      limit: 10,
    });
    expect(results).toHaveLength(1);
  });
});

// ─── Matched Terms ──────────────────────────────────────────────────

describe('Chronicle search matched terms', () => {
  it('reports which terms matched', () => {
    const idx = createTestIndex();
    idx.index(entry('e-1', ['dynasty', 'trade', 'kalon']));
    const results = idx.search({
      terms: ['dynasty', 'survey'],
      mode: 'or',
    });
    expect(results[0]?.matchedTerms).toContain('dynasty');
    expect(results[0]?.matchedTerms).not.toContain('survey');
  });
});
