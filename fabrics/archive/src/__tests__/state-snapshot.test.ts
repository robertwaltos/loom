import { describe, it, expect } from 'vitest';
import { createStateSnapshotEngine } from '../state-snapshot.js';
import type {
  StateSnapshotEngine,
  StateSnapshotDeps,
} from '../state-snapshot.js';

// ─── Test Helpers ───────────────────────────────────────────────────

function testData(content: string): Uint8Array {
  return new TextEncoder().encode(content);
}

function createTestEngine(): StateSnapshotEngine {
  let idCounter = 0;
  const deps: StateSnapshotDeps = {
    hasher: {
      hash(data: Uint8Array) {
        return 'hash-' + String(data.length);
      },
    },
    idGenerator: {
      next() {
        idCounter += 1;
        return 'snap-' + String(idCounter);
      },
    },
    clock: { nowMicroseconds: () => 1_000_000 },
  };
  return createStateSnapshotEngine(deps);
}

// ─── Capture ────────────────────────────────────────────────────────

describe('State snapshot capture basics', () => {
  it('captures state and returns metadata', () => {
    const engine = createTestEngine();
    const snap = engine.capture({
      worldId: 'earth',
      tickNumber: 42,
      stateData: testData('world-state'),
    });
    expect(snap.snapshotId).toBe('snap-1');
    expect(snap.worldId).toBe('earth');
    expect(snap.tickNumber).toBe(42);
    expect(snap.capturedAt).toBe(1_000_000);
  });

  it('computes content hash', () => {
    const engine = createTestEngine();
    const data = testData('hello');
    const snap = engine.capture({
      worldId: 'earth',
      tickNumber: 1,
      stateData: data,
    });
    expect(snap.contentHash).toBe('hash-' + String(data.length));
  });

  it('records size in bytes', () => {
    const engine = createTestEngine();
    const data = testData('test-data');
    const snap = engine.capture({
      worldId: 'earth',
      tickNumber: 1,
      stateData: data,
    });
    expect(snap.sizeBytes).toBe(data.length);
  });

  it('increments count', () => {
    const engine = createTestEngine();
    expect(engine.count()).toBe(0);
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: testData('a') });
    engine.capture({ worldId: 'mars', tickNumber: 1, stateData: testData('b') });
    expect(engine.count()).toBe(2);
  });
});

describe('State snapshot capture options', () => {
  it('preserves tags', () => {
    const engine = createTestEngine();
    const snap = engine.capture({
      worldId: 'earth',
      tickNumber: 1,
      stateData: testData('data'),
      tags: ['checkpoint', 'pre-transition'],
    });
    expect(snap.tags).toEqual(['checkpoint', 'pre-transition']);
  });

  it('supports parent snapshot chaining', () => {
    const engine = createTestEngine();
    const parent = engine.capture({
      worldId: 'earth',
      tickNumber: 1,
      stateData: testData('base'),
    });
    const child = engine.capture({
      worldId: 'earth',
      tickNumber: 2,
      stateData: testData('delta'),
      parentSnapshotId: parent.snapshotId,
    });
    expect(child.parentSnapshotId).toBe(parent.snapshotId);
  });

  it('defaults to null parent', () => {
    const engine = createTestEngine();
    const snap = engine.capture({
      worldId: 'earth',
      tickNumber: 1,
      stateData: testData('data'),
    });
    expect(snap.parentSnapshotId).toBeNull();
  });
});

// ─── Restore ────────────────────────────────────────────────────────

describe('State snapshot restore', () => {
  it('restores captured state data', () => {
    const engine = createTestEngine();
    const data = testData('world-state-earth-v1');
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: data });
    const result = engine.restore('snap-1');
    expect(result.snapshot.worldId).toBe('earth');
    expect(result.stateData).toEqual(data);
  });

  it('throws for unknown snapshot', () => {
    const engine = createTestEngine();
    expect(() => engine.restore('nonexistent')).toThrow('not found');
  });
});

// ─── Queries ────────────────────────────────────────────────────────

describe('State snapshot queries', () => {
  it('gets snapshot by ID', () => {
    const engine = createTestEngine();
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: testData('a') });
    const snap = engine.getSnapshot('snap-1');
    expect(snap.worldId).toBe('earth');
  });

  it('tryGetSnapshot returns undefined for missing', () => {
    const engine = createTestEngine();
    expect(engine.tryGetSnapshot('missing')).toBeUndefined();
  });

  it('getLatest returns most recent for world', () => {
    const engine = createTestEngine();
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: testData('a') });
    engine.capture({ worldId: 'earth', tickNumber: 5, stateData: testData('b') });
    const latest = engine.getLatest('earth');
    expect(latest?.tickNumber).toBe(5);
  });

  it('getLatest returns undefined for unknown world', () => {
    const engine = createTestEngine();
    expect(engine.getLatest('unknown')).toBeUndefined();
  });

  it('countByWorld tracks per-world snapshots', () => {
    const engine = createTestEngine();
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: testData('a') });
    engine.capture({ worldId: 'earth', tickNumber: 2, stateData: testData('b') });
    engine.capture({ worldId: 'mars', tickNumber: 1, stateData: testData('c') });
    expect(engine.countByWorld('earth')).toBe(2);
    expect(engine.countByWorld('mars')).toBe(1);
    expect(engine.countByWorld('venus')).toBe(0);
  });
});

// ─── History ────────────────────────────────────────────────────────

describe('State snapshot history', () => {
  it('returns recent snapshots in reverse chronological order', () => {
    const engine = createTestEngine();
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: testData('a') });
    engine.capture({ worldId: 'earth', tickNumber: 2, stateData: testData('b') });
    engine.capture({ worldId: 'earth', tickNumber: 3, stateData: testData('c') });
    const history = engine.getHistory('earth', 2);
    expect(history).toHaveLength(2);
    expect(history[0]?.tickNumber).toBe(3);
    expect(history[1]?.tickNumber).toBe(2);
  });

  it('returns empty array for unknown world', () => {
    const engine = createTestEngine();
    expect(engine.getHistory('unknown', 5)).toHaveLength(0);
  });

  it('returns all if limit exceeds count', () => {
    const engine = createTestEngine();
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: testData('a') });
    const history = engine.getHistory('earth', 100);
    expect(history).toHaveLength(1);
  });
});

// ─── Filtering ──────────────────────────────────────────────────────

describe('State snapshot filtering', () => {
  it('filters by world ID', () => {
    const engine = createTestEngine();
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: testData('a') });
    engine.capture({ worldId: 'mars', tickNumber: 1, stateData: testData('b') });
    const results = engine.findSnapshots({ worldId: 'earth' });
    expect(results).toHaveLength(1);
    expect(results[0]?.worldId).toBe('earth');
  });

  it('filters by tick range', () => {
    const engine = createTestEngine();
    engine.capture({ worldId: 'earth', tickNumber: 5, stateData: testData('a') });
    engine.capture({ worldId: 'earth', tickNumber: 10, stateData: testData('b') });
    engine.capture({ worldId: 'earth', tickNumber: 15, stateData: testData('c') });
    const results = engine.findSnapshots({ minTick: 8, maxTick: 12 });
    expect(results).toHaveLength(1);
    expect(results[0]?.tickNumber).toBe(10);
  });

  it('filters by tag', () => {
    const engine = createTestEngine();
    engine.capture({
      worldId: 'earth', tickNumber: 1,
      stateData: testData('a'), tags: ['checkpoint'],
    });
    engine.capture({
      worldId: 'earth', tickNumber: 2,
      stateData: testData('b'), tags: ['pre-transition'],
    });
    const results = engine.findSnapshots({ tag: 'checkpoint' });
    expect(results).toHaveLength(1);
  });

  it('returns all when filter is empty', () => {
    const engine = createTestEngine();
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: testData('a') });
    engine.capture({ worldId: 'mars', tickNumber: 2, stateData: testData('b') });
    const results = engine.findSnapshots({});
    expect(results).toHaveLength(2);
  });
});

// ─── Pruning ────────────────────────────────────────────────────────

describe('State snapshot pruning', () => {
  it('removes oldest snapshots beyond keep count', () => {
    const engine = createTestEngine();
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: testData('a') });
    engine.capture({ worldId: 'earth', tickNumber: 2, stateData: testData('b') });
    engine.capture({ worldId: 'earth', tickNumber: 3, stateData: testData('c') });
    const removed = engine.prune('earth', 1);
    expect(removed).toBe(2);
    expect(engine.countByWorld('earth')).toBe(1);
    expect(engine.getLatest('earth')?.tickNumber).toBe(3);
  });

  it('returns zero when nothing to prune', () => {
    const engine = createTestEngine();
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: testData('a') });
    expect(engine.prune('earth', 5)).toBe(0);
  });

  it('returns zero for unknown world', () => {
    const engine = createTestEngine();
    expect(engine.prune('unknown', 1)).toBe(0);
  });

  it('removes snapshots from global count', () => {
    const engine = createTestEngine();
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: testData('a') });
    engine.capture({ worldId: 'earth', tickNumber: 2, stateData: testData('b') });
    engine.capture({ worldId: 'mars', tickNumber: 1, stateData: testData('c') });
    engine.prune('earth', 1);
    expect(engine.count()).toBe(2); // 1 earth + 1 mars
  });

  it('pruned snapshots cannot be restored', () => {
    const engine = createTestEngine();
    engine.capture({ worldId: 'earth', tickNumber: 1, stateData: testData('old') });
    engine.capture({ worldId: 'earth', tickNumber: 2, stateData: testData('new') });
    engine.prune('earth', 1);
    expect(() => engine.restore('snap-1')).toThrow('not found');
  });
});
