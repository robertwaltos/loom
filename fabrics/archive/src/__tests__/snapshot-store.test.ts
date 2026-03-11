import { describe, it, expect, beforeEach } from 'vitest';
import { createSnapshotStore } from '../snapshot-store.js';
import type { SnapshotStore, SnapshotStoreDeps, CompressionMeta } from '../snapshot-store.js';

// ── Test Helpers ─────────────────────────────────────────────────

function testData(content: string): Uint8Array {
  return new TextEncoder().encode(content);
}

function createDeps(): SnapshotStoreDeps {
  let idCounter = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: {
      generate() {
        idCounter += 1;
        return 'snap-' + String(idCounter);
      },
    },
    hasher: {
      hash(data: Uint8Array) {
        return 'hash-' + String(data.length);
      },
    },
  };
}

let store: SnapshotStore;

beforeEach(() => {
  store = createSnapshotStore(createDeps());
});

// ── Create Snapshots ─────────────────────────────────────────────

describe('SnapshotStore create', () => {
  it('creates a snapshot with correct metadata', () => {
    const snap = store.create({
      worldId: 'earth',
      data: testData('world-state'),
      label: 'checkpoint-1',
    });
    expect(snap.snapshotId).toBe('snap-1');
    expect(snap.worldId).toBe('earth');
    expect(snap.version).toBe(1);
    expect(snap.label).toBe('checkpoint-1');
    expect(snap.status).toBe('active');
  });

  it('auto-increments version per world', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'v1' });
    const second = store.create({ worldId: 'earth', data: testData('b'), label: 'v2' });
    expect(second.version).toBe(2);
  });

  it('tracks version independently per world', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'e1' });
    const mars = store.create({ worldId: 'mars', data: testData('b'), label: 'm1' });
    expect(mars.version).toBe(1);
  });

  it('computes content hash from data', () => {
    const data = testData('hello-world');
    const snap = store.create({ worldId: 'earth', data, label: 'test' });
    expect(snap.contentHash).toBe('hash-' + String(data.length));
  });

  it('records size in bytes', () => {
    const data = testData('some-state-data');
    const snap = store.create({ worldId: 'earth', data, label: 'test' });
    expect(snap.sizeBytes).toBe(data.length);
  });

  it('sets parentId when provided', () => {
    const parent = store.create({ worldId: 'earth', data: testData('a'), label: 'base' });
    const child = store.create({
      worldId: 'earth',
      data: testData('b'),
      label: 'delta',
      parentId: parent.snapshotId,
    });
    expect(child.parentId).toBe(parent.snapshotId);
  });

  it('defaults parentId to null', () => {
    const snap = store.create({ worldId: 'earth', data: testData('a'), label: 'root' });
    expect(snap.parentId).toBeNull();
  });

  it('stores compression metadata when provided', () => {
    const compression: CompressionMeta = {
      algorithm: 'zstd',
      originalSizeBytes: 1000,
      compressedSizeBytes: 200,
      ratio: 0.2,
    };
    const snap = store.create({
      worldId: 'earth',
      data: testData('compressed'),
      label: 'test',
      compression,
    });
    expect(snap.compression).toEqual(compression);
  });

  it('defaults compression to null', () => {
    const snap = store.create({ worldId: 'earth', data: testData('a'), label: 'test' });
    expect(snap.compression).toBeNull();
  });
});

// ── Restore ──────────────────────────────────────────────────────

describe('SnapshotStore restore', () => {
  it('restores snapshot data', () => {
    const data = testData('world-state-earth');
    store.create({ worldId: 'earth', data, label: 'test' });
    const result = store.restore('snap-1');
    expect(result.snapshot.worldId).toBe('earth');
    expect(result.data).toEqual(data);
  });

  it('throws for unknown snapshot', () => {
    expect(() => store.restore('nonexistent')).toThrow('Snapshot not found');
  });
});

// ── Get ──────────────────────────────────────────────────────────

describe('SnapshotStore get and getRequired', () => {
  it('returns snapshot metadata by ID', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'test' });
    const snap = store.get('snap-1');
    expect(snap).toBeDefined();
    expect(snap?.worldId).toBe('earth');
  });

  it('returns undefined for missing snapshot', () => {
    expect(store.get('missing')).toBeUndefined();
  });

  it('getRequired throws for missing snapshot', () => {
    expect(() => store.getRequired('missing')).toThrow('Snapshot not found');
  });

  it('getRequired returns snapshot for valid ID', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'test' });
    const snap = store.getRequired('snap-1');
    expect(snap.worldId).toBe('earth');
  });
});

// ── Diff ─────────────────────────────────────────────────────────

describe('SnapshotStore diff', () => {
  it('computes diff between two snapshots', () => {
    store.create({ worldId: 'earth', data: testData('small'), label: 'v1' });
    store.create({ worldId: 'earth', data: testData('much-larger-state'), label: 'v2' });
    const d = store.diff('snap-1', 'snap-2');
    expect(d.baseSnapshotId).toBe('snap-1');
    expect(d.targetSnapshotId).toBe('snap-2');
    expect(d.baseVersion).toBe(1);
    expect(d.targetVersion).toBe(2);
    expect(d.sizeDeltaBytes).toBeGreaterThan(0);
  });

  it('detects matching hashes when data is same size', () => {
    store.create({ worldId: 'earth', data: testData('abc'), label: 'v1' });
    store.create({ worldId: 'earth', data: testData('xyz'), label: 'v2' });
    const d = store.diff('snap-1', 'snap-2');
    expect(d.hashesMatch).toBe(true);
  });

  it('detects different hashes when data sizes differ', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'v1' });
    store.create({ worldId: 'earth', data: testData('abcdef'), label: 'v2' });
    const d = store.diff('snap-1', 'snap-2');
    expect(d.hashesMatch).toBe(false);
  });

  it('throws when base snapshot is missing', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'v1' });
    expect(() => store.diff('missing', 'snap-1')).toThrow('Snapshot not found');
  });
});

// ── Find ─────────────────────────────────────────────────────────

describe('SnapshotStore find', () => {
  it('finds snapshots by worldId', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'test' });
    store.create({ worldId: 'mars', data: testData('b'), label: 'test' });
    const results = store.find({ worldId: 'earth' });
    expect(results).toHaveLength(1);
    expect(results[0]?.worldId).toBe('earth');
  });

  it('finds snapshots by status', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'test' });
    store.create({ worldId: 'earth', data: testData('b'), label: 'test' });
    store.setStatus('snap-1', 'archived');
    const results = store.find({ status: 'archived' });
    expect(results).toHaveLength(1);
  });

  it('finds snapshots by version range', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'v1' });
    store.create({ worldId: 'earth', data: testData('b'), label: 'v2' });
    store.create({ worldId: 'earth', data: testData('c'), label: 'v3' });
    const results = store.find({ minVersion: 2, maxVersion: 2 });
    expect(results).toHaveLength(1);
    expect(results[0]?.version).toBe(2);
  });

  it('finds snapshots by label', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'checkpoint' });
    store.create({ worldId: 'earth', data: testData('b'), label: 'pre-transition' });
    const results = store.find({ label: 'checkpoint' });
    expect(results).toHaveLength(1);
  });

  it('returns all snapshots with empty query', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'test' });
    store.create({ worldId: 'mars', data: testData('b'), label: 'test' });
    expect(store.find({}).length).toBe(2);
  });
});

// ── Latest and History ───────────────────────────────────────────

describe('SnapshotStore latest and history', () => {
  it('getLatest returns most recent snapshot for world', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'old' });
    store.create({ worldId: 'earth', data: testData('b'), label: 'new' });
    const latest = store.getLatest('earth');
    expect(latest?.label).toBe('new');
  });

  it('getLatest returns undefined for unknown world', () => {
    expect(store.getLatest('unknown')).toBeUndefined();
  });

  it('getVersionHistory returns all snapshots in order', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'v1' });
    store.create({ worldId: 'earth', data: testData('b'), label: 'v2' });
    store.create({ worldId: 'earth', data: testData('c'), label: 'v3' });
    const history = store.getVersionHistory('earth');
    expect(history).toHaveLength(3);
    expect(history[0]?.version).toBe(1);
    expect(history[2]?.version).toBe(3);
  });

  it('getVersionHistory returns empty for unknown world', () => {
    expect(store.getVersionHistory('unknown')).toHaveLength(0);
  });
});

// ── Status ───────────────────────────────────────────────────────

describe('SnapshotStore setStatus', () => {
  it('changes snapshot status to superseded', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'test' });
    const updated = store.setStatus('snap-1', 'superseded');
    expect(updated.status).toBe('superseded');
  });

  it('changes snapshot status to archived', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'test' });
    const updated = store.setStatus('snap-1', 'archived');
    expect(updated.status).toBe('archived');
    expect(store.get('snap-1')?.status).toBe('archived');
  });

  it('throws for unknown snapshot', () => {
    expect(() => store.setStatus('missing', 'archived')).toThrow('Snapshot not found');
  });
});

// ── Prune ────────────────────────────────────────────────────────

describe('SnapshotStore prune', () => {
  it('removes oldest snapshots beyond keep count', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'v1' });
    store.create({ worldId: 'earth', data: testData('b'), label: 'v2' });
    store.create({ worldId: 'earth', data: testData('c'), label: 'v3' });
    const removed = store.prune('earth', 1);
    expect(removed).toBe(2);
    expect(store.getLatest('earth')?.label).toBe('v3');
  });

  it('returns zero when nothing to prune', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'v1' });
    expect(store.prune('earth', 5)).toBe(0);
  });

  it('returns zero for unknown world', () => {
    expect(store.prune('unknown', 1)).toBe(0);
  });

  it('pruned snapshots cannot be restored', () => {
    store.create({ worldId: 'earth', data: testData('old'), label: 'v1' });
    store.create({ worldId: 'earth', data: testData('new'), label: 'v2' });
    store.prune('earth', 1);
    expect(() => store.restore('snap-1')).toThrow('Snapshot not found');
  });
});

// ── Stats ────────────────────────────────────────────────────────

describe('SnapshotStore stats', () => {
  it('reports empty stats initially', () => {
    const stats = store.getStats();
    expect(stats.totalSnapshots).toBe(0);
    expect(stats.activeCount).toBe(0);
    expect(stats.totalSizeBytes).toBe(0);
    expect(stats.worldCount).toBe(0);
  });

  it('counts snapshots by status', () => {
    store.create({ worldId: 'earth', data: testData('a'), label: 'v1' });
    store.create({ worldId: 'earth', data: testData('b'), label: 'v2' });
    store.create({ worldId: 'mars', data: testData('c'), label: 'v1' });
    store.setStatus('snap-1', 'superseded');
    store.setStatus('snap-3', 'archived');
    const stats = store.getStats();
    expect(stats.totalSnapshots).toBe(3);
    expect(stats.activeCount).toBe(1);
    expect(stats.supersededCount).toBe(1);
    expect(stats.archivedCount).toBe(1);
    expect(stats.worldCount).toBe(2);
  });

  it('accumulates total size bytes', () => {
    const d1 = testData('small');
    const d2 = testData('larger-data-here');
    store.create({ worldId: 'earth', data: d1, label: 'v1' });
    store.create({ worldId: 'earth', data: d2, label: 'v2' });
    const stats = store.getStats();
    expect(stats.totalSizeBytes).toBe(d1.length + d2.length);
  });
});
