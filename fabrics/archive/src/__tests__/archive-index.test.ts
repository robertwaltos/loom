import { describe, it, expect } from 'vitest';
import { createArchiveIndex } from '../archive-index.js';
import type { ArchiveIndexDeps } from '../archive-index.js';

function makeDeps(): ArchiveIndexDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'idx-' + String(++id) },
  };
}

describe('ArchiveIndex — add and get', () => {
  it('adds a record', () => {
    const index = createArchiveIndex(makeDeps());
    const record = index.add({
      category: 'chronicle', tags: ['world-1', 'founding'], metadata: '{}',
    });
    expect(record.recordId).toBe('idx-1');
    expect(record.category).toBe('chronicle');
  });

  it('retrieves by id', () => {
    const index = createArchiveIndex(makeDeps());
    const record = index.add({
      category: 'chronicle', tags: ['world-1'], metadata: '{"seq":1}',
    });
    expect(index.get(record.recordId)?.metadata).toBe('{"seq":1}');
  });

  it('returns undefined for unknown id', () => {
    const index = createArchiveIndex(makeDeps());
    expect(index.get('unknown')).toBeUndefined();
  });

  it('removes a record', () => {
    const index = createArchiveIndex(makeDeps());
    const record = index.add({
      category: 'snapshot', tags: ['backup'], metadata: '{}',
    });
    expect(index.remove(record.recordId)).toBe(true);
    expect(index.get(record.recordId)).toBeUndefined();
  });

  it('returns false for unknown removal', () => {
    const index = createArchiveIndex(makeDeps());
    expect(index.remove('unknown')).toBe(false);
  });
});

describe('ArchiveIndex — tag queries', () => {
  it('finds by tag', () => {
    const index = createArchiveIndex(makeDeps());
    index.add({ category: 'chronicle', tags: ['world-1'], metadata: '{}' });
    index.add({ category: 'chronicle', tags: ['world-2'], metadata: '{}' });
    index.add({ category: 'chronicle', tags: ['world-1'], metadata: '{}' });
    expect(index.findByTag('world-1')).toHaveLength(2);
  });

  it('returns empty for unknown tag', () => {
    const index = createArchiveIndex(makeDeps());
    expect(index.findByTag('unknown')).toHaveLength(0);
  });

  it('updates tag index on removal', () => {
    const index = createArchiveIndex(makeDeps());
    const r = index.add({ category: 'a', tags: ['x'], metadata: '{}' });
    index.remove(r.recordId);
    expect(index.findByTag('x')).toHaveLength(0);
  });
});

describe('ArchiveIndex — category queries', () => {
  it('finds by category', () => {
    const index = createArchiveIndex(makeDeps());
    index.add({ category: 'chronicle', tags: [], metadata: '{}' });
    index.add({ category: 'snapshot', tags: [], metadata: '{}' });
    index.add({ category: 'chronicle', tags: [], metadata: '{}' });
    expect(index.findByCategory('chronicle')).toHaveLength(2);
    expect(index.findByCategory('snapshot')).toHaveLength(1);
  });

  it('returns empty for unknown category', () => {
    const index = createArchiveIndex(makeDeps());
    expect(index.findByCategory('unknown')).toHaveLength(0);
  });
});

describe('ArchiveIndex — compound queries', () => {
  it('filters by category and tag', () => {
    const index = createArchiveIndex(makeDeps());
    index.add({ category: 'chronicle', tags: ['world-1'], metadata: '{}' });
    index.add({ category: 'snapshot', tags: ['world-1'], metadata: '{}' });
    index.add({ category: 'chronicle', tags: ['world-2'], metadata: '{}' });
    const results = index.query({ category: 'chronicle', tag: 'world-1' });
    expect(results).toHaveLength(1);
  });

  it('filters by date range', () => {
    const deps = makeDeps();
    const index = createArchiveIndex(deps);
    index.add({ category: 'a', tags: [], metadata: '{}' });
    index.add({ category: 'a', tags: [], metadata: '{}' });
    index.add({ category: 'a', tags: [], metadata: '{}' });
    const results = index.query({ afterUs: 2_500_000, beforeUs: 3_500_000 });
    expect(results).toHaveLength(1);
  });

  it('returns all on empty query', () => {
    const index = createArchiveIndex(makeDeps());
    index.add({ category: 'a', tags: [], metadata: '{}' });
    index.add({ category: 'b', tags: [], metadata: '{}' });
    expect(index.query({})).toHaveLength(2);
  });
});

describe('ArchiveIndex — stats', () => {
  it('starts with zero stats', () => {
    const index = createArchiveIndex(makeDeps());
    const stats = index.getStats();
    expect(stats.totalRecords).toBe(0);
    expect(stats.totalTags).toBe(0);
    expect(stats.totalCategories).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const index = createArchiveIndex(makeDeps());
    index.add({ category: 'chronicle', tags: ['world-1', 'founding'], metadata: '{}' });
    index.add({ category: 'snapshot', tags: ['world-1'], metadata: '{}' });
    const stats = index.getStats();
    expect(stats.totalRecords).toBe(2);
    expect(stats.totalTags).toBe(2);
    expect(stats.totalCategories).toBe(2);
  });
});
