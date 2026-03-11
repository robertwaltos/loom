import { describe, it, expect } from 'vitest';
import { createDataCompactor } from '../data-compactor.js';
import type { DataCompactorDeps } from '../data-compactor.js';

function createDeps(): DataCompactorDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'dc-' + String(id++) },
  };
}

describe('DataCompactorService — registerSource', () => {
  it('registers a source and returns its id', () => {
    const svc = createDataCompactor(createDeps());
    const id = svc.registerSource({ name: 'events', entryCount: 1000 });
    expect(id).toBe('dc-0');
  });
});

describe('DataCompactorService — compact', () => {
  it('compacts a source to target ratio', () => {
    const svc = createDataCompactor(createDeps());
    const id = svc.registerSource({ name: 'logs', entryCount: 1000 });
    const run = svc.compact(id, { minEntries: 100, targetRatio: 0.5 });
    expect(run).toBeDefined();
    expect(run?.beforeCount).toBe(1000);
    expect(run?.afterCount).toBe(500);
    expect(run?.removedCount).toBe(500);
  });

  it('skips compaction when below minimum entries', () => {
    const svc = createDataCompactor(createDeps());
    const id = svc.registerSource({ name: 'logs', entryCount: 50 });
    const run = svc.compact(id, { minEntries: 100, targetRatio: 0.5 });
    expect(run).toBeUndefined();
  });

  it('returns undefined for unknown source', () => {
    const svc = createDataCompactor(createDeps());
    expect(svc.compact('unknown', { minEntries: 0, targetRatio: 0.5 })).toBeUndefined();
  });

  it('updates source entry count after compaction', () => {
    const svc = createDataCompactor(createDeps());
    const id = svc.registerSource({ name: 'data', entryCount: 200 });
    svc.compact(id, { minEntries: 50, targetRatio: 0.25 });
    // 200 * 0.25 = 50
    const run2 = svc.compact(id, { minEntries: 50, targetRatio: 0.5 });
    expect(run2?.beforeCount).toBe(50);
  });
});

describe('DataCompactorService — updateCount', () => {
  it('updates entry count for a source', () => {
    const svc = createDataCompactor(createDeps());
    const id = svc.registerSource({ name: 'logs', entryCount: 100 });
    expect(svc.updateCount(id, 500)).toBe(true);
    const run = svc.compact(id, { minEntries: 100, targetRatio: 0.5 });
    expect(run?.beforeCount).toBe(500);
  });

  it('returns false for unknown source', () => {
    const svc = createDataCompactor(createDeps());
    expect(svc.updateCount('unknown', 100)).toBe(false);
  });
});

describe('DataCompactorService — history and stats', () => {
  it('returns compaction history for a source', () => {
    const svc = createDataCompactor(createDeps());
    const id = svc.registerSource({ name: 'logs', entryCount: 1000 });
    svc.compact(id, { minEntries: 100, targetRatio: 0.5 });
    svc.compact(id, { minEntries: 100, targetRatio: 0.5 });
    expect(svc.getHistory(id)).toHaveLength(2);
  });

  it('reports stats', () => {
    const svc = createDataCompactor(createDeps());
    const a = svc.registerSource({ name: 'a', entryCount: 500 });
    svc.registerSource({ name: 'b', entryCount: 200 });
    svc.compact(a, { minEntries: 100, targetRatio: 0.5 });
    const stats = svc.getStats();
    expect(stats.totalSources).toBe(2);
    expect(stats.totalRuns).toBe(1);
    expect(stats.totalRemoved).toBe(250);
  });
});
