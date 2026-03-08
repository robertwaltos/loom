import { describe, it, expect } from 'vitest';
import { createDataExporter } from '../data-export.js';
import type {
  DataExportDeps,
  ChroniclePortEntry,
  SnapshotPortEntry,
  ChroniclePortFilter,
  SnapshotPortFilter,
} from '../data-export.js';

function makeChronicleEntry(overrides?: Partial<ChroniclePortEntry>): ChroniclePortEntry {
  return {
    entryId: 'ch-1',
    timestamp: 1_000_000,
    category: 'entity.lifecycle',
    worldId: 'world-a',
    subjectId: 'entity-1',
    content: 'Entity spawned',
    hash: 'abc123',
    ...overrides,
  };
}

function makeSnapshotEntry(overrides?: Partial<SnapshotPortEntry>): SnapshotPortEntry {
  return {
    snapshotId: 'snap-1',
    timestamp: 2_000_000,
    worldId: 'world-a',
    entityCount: 100,
    hash: 'def456',
    ...overrides,
  };
}

function makeDeps(
  chronicles: ChroniclePortEntry[] = [],
  snapshots: SnapshotPortEntry[] = [],
): DataExportDeps {
  let time = 10_000_000;
  let idCounter = 0;

  return {
    chronicle: {
      queryEntries: (f: ChroniclePortFilter) => filterChronicles(chronicles, f),
      count: () => chronicles.length,
    },
    snapshots: {
      querySnapshots: (f: SnapshotPortFilter) => filterSnapshots(snapshots, f),
      count: () => snapshots.length,
    },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'export-' + String(++idCounter) },
  };
}

function filterChronicles(
  entries: ChroniclePortEntry[],
  filter: ChroniclePortFilter,
): ChroniclePortEntry[] {
  return entries.filter((e) => {
    if (filter.fromTimestamp !== undefined && e.timestamp < filter.fromTimestamp) return false;
    if (filter.toTimestamp !== undefined && e.timestamp > filter.toTimestamp) return false;
    if (filter.categories !== undefined && !filter.categories.includes(e.category)) return false;
    if (filter.worldIds !== undefined && !filter.worldIds.includes(e.worldId)) return false;
    return true;
  });
}

function filterSnapshots(
  entries: SnapshotPortEntry[],
  filter: SnapshotPortFilter,
): SnapshotPortEntry[] {
  return entries.filter((e) => {
    if (filter.fromTimestamp !== undefined && e.timestamp < filter.fromTimestamp) return false;
    if (filter.toTimestamp !== undefined && e.timestamp > filter.toTimestamp) return false;
    if (filter.worldIds !== undefined && !filter.worldIds.includes(e.worldId)) return false;
    return true;
  });
}

describe('DataExporter — export all', () => {
  it('exports chronicle and snapshot entries', () => {
    const deps = makeDeps(
      [makeChronicleEntry()],
      [makeSnapshotEntry()],
    );
    const exporter = createDataExporter(deps);
    const bundle = exporter.export();

    expect(bundle.entryCount).toBe(2);
    expect(bundle.exportId).toBeTruthy();
  });

  it('sorts entries by timestamp', () => {
    const deps = makeDeps(
      [makeChronicleEntry({ timestamp: 3_000_000 })],
      [makeSnapshotEntry({ timestamp: 1_000_000 })],
    );
    const exporter = createDataExporter(deps);
    const bundle = exporter.export();

    expect(bundle.entries[0]?.source).toBe('snapshot');
    expect(bundle.entries[1]?.source).toBe('chronicle');
  });

  it('includes metadata', () => {
    const deps = makeDeps([makeChronicleEntry()], []);
    const exporter = createDataExporter(deps);
    const bundle = exporter.export();

    expect(bundle.metadata.totalAvailable).toBe(1);
    expect(bundle.metadata.exported).toBe(1);
    expect(bundle.metadata.truncated).toBe(false);
  });
});

describe('DataExporter — export chronicle only', () => {
  it('exports only chronicle entries', () => {
    const deps = makeDeps(
      [makeChronicleEntry()],
      [makeSnapshotEntry()],
    );
    const exporter = createDataExporter(deps);
    const bundle = exporter.exportChronicle();

    expect(bundle.entryCount).toBe(1);
    expect(bundle.entries[0]?.source).toBe('chronicle');
  });

  it('applies category filter', () => {
    const deps = makeDeps([
      makeChronicleEntry({ category: 'entity.lifecycle' }),
      makeChronicleEntry({ entryId: 'ch-2', category: 'economy.transaction' }),
    ]);
    const exporter = createDataExporter(deps);
    const bundle = exporter.exportChronicle({ categories: ['economy.transaction'] });

    expect(bundle.entryCount).toBe(1);
  });
});

describe('DataExporter — export snapshots only', () => {
  it('exports only snapshot entries', () => {
    const deps = makeDeps(
      [makeChronicleEntry()],
      [makeSnapshotEntry()],
    );
    const exporter = createDataExporter(deps);
    const bundle = exporter.exportSnapshots();

    expect(bundle.entryCount).toBe(1);
    expect(bundle.entries[0]?.source).toBe('snapshot');
  });
});

describe('DataExporter — filtering', () => {
  it('filters by timestamp range', () => {
    const deps = makeDeps([
      makeChronicleEntry({ timestamp: 100 }),
      makeChronicleEntry({ entryId: 'ch-2', timestamp: 200 }),
      makeChronicleEntry({ entryId: 'ch-3', timestamp: 300 }),
    ]);
    const exporter = createDataExporter(deps);
    const bundle = exporter.exportChronicle({
      fromTimestamp: 150,
      toTimestamp: 250,
    });

    expect(bundle.entryCount).toBe(1);
  });

  it('filters by world ID', () => {
    const deps = makeDeps([
      makeChronicleEntry({ worldId: 'earth' }),
      makeChronicleEntry({ entryId: 'ch-2', worldId: 'mars' }),
    ]);
    const exporter = createDataExporter(deps);
    const bundle = exporter.exportChronicle({ worldIds: ['mars'] });

    expect(bundle.entryCount).toBe(1);
  });

  it('filters by source type', () => {
    const deps = makeDeps(
      [makeChronicleEntry()],
      [makeSnapshotEntry()],
    );
    const exporter = createDataExporter(deps);
    const bundle = exporter.export({ source: 'chronicle' });

    expect(bundle.entryCount).toBe(1);
    expect(bundle.entries[0]?.source).toBe('chronicle');
  });
});

describe('DataExporter — pagination', () => {
  it('applies limit', () => {
    const deps = makeDeps([
      makeChronicleEntry({ entryId: 'a', timestamp: 100 }),
      makeChronicleEntry({ entryId: 'b', timestamp: 200 }),
      makeChronicleEntry({ entryId: 'c', timestamp: 300 }),
    ]);
    const exporter = createDataExporter(deps);
    const bundle = exporter.exportChronicle({ limit: 2 });

    expect(bundle.entryCount).toBe(2);
    expect(bundle.metadata.truncated).toBe(true);
  });

  it('applies offset', () => {
    const deps = makeDeps([
      makeChronicleEntry({ entryId: 'a', timestamp: 100 }),
      makeChronicleEntry({ entryId: 'b', timestamp: 200 }),
      makeChronicleEntry({ entryId: 'c', timestamp: 300 }),
    ]);
    const exporter = createDataExporter(deps);
    const bundle = exporter.exportChronicle({ offset: 1, limit: 1 });

    expect(bundle.entryCount).toBe(1);
    expect(bundle.entries[0]?.id).toBe('b');
  });
});

describe('DataExporter — stats', () => {
  it('tracks export statistics', () => {
    const deps = makeDeps([makeChronicleEntry()]);
    const exporter = createDataExporter(deps);

    exporter.export();
    exporter.export();

    const stats = exporter.getStats();
    expect(stats.totalExports).toBe(2);
    expect(stats.totalEntriesExported).toBe(2);
    expect(stats.lastExportAt).toBeGreaterThan(0);
  });

  it('starts with empty stats', () => {
    const exporter = createDataExporter(makeDeps());
    const stats = exporter.getStats();
    expect(stats.totalExports).toBe(0);
    expect(stats.lastExportAt).toBeNull();
  });
});

describe('DataExporter — entry format', () => {
  it('chronicle entries have correct data shape', () => {
    const deps = makeDeps([makeChronicleEntry({
      worldId: 'earth',
      subjectId: 'player-1',
      content: 'Joined the world',
      hash: 'xyz',
    })]);
    const exporter = createDataExporter(deps);
    const bundle = exporter.exportChronicle();
    const entry = bundle.entries[0];

    expect(entry?.data).toHaveProperty('worldId', 'earth');
    expect(entry?.data).toHaveProperty('subjectId', 'player-1');
    expect(entry?.data).toHaveProperty('content', 'Joined the world');
    expect(entry?.data).toHaveProperty('hash', 'xyz');
  });

  it('snapshot entries have correct data shape', () => {
    const deps = makeDeps([], [makeSnapshotEntry({
      worldId: 'mars',
      entityCount: 500,
      hash: 'snap-hash',
    })]);
    const exporter = createDataExporter(deps);
    const bundle = exporter.exportSnapshots();
    const entry = bundle.entries[0];

    expect(entry?.data).toHaveProperty('worldId', 'mars');
    expect(entry?.data).toHaveProperty('entityCount', 500);
    expect(entry?.category).toBe('state.snapshot');
  });
});
