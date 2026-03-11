import { describe, it, expect } from 'vitest';
import { createSpatialIndex } from '../spatial-index.js';
import type { SpatialIndexDeps, ZoneBoundary } from '../spatial-index.js';

function makeDeps(overrides?: Partial<SpatialIndexDeps>): SpatialIndexDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    ...overrides,
  };
}

describe('SpatialIndex — insert and remove', () => {
  it('inserts an entity and retrieves its entry', () => {
    const idx = createSpatialIndex(makeDeps());
    const entry = idx.insert('e-1', 10, 20);
    expect(entry.entityId).toBe('e-1');
    expect(entry.x).toBe(10);
    expect(entry.y).toBe(20);
  });

  it('returns existing entry on duplicate insert', () => {
    const idx = createSpatialIndex(makeDeps());
    idx.insert('e-1', 10, 20);
    const dup = idx.insert('e-1', 99, 99);
    expect(dup.x).toBe(10);
    expect(dup.y).toBe(20);
  });

  it('removes an entity', () => {
    const idx = createSpatialIndex(makeDeps());
    idx.insert('e-1', 10, 20);
    expect(idx.remove('e-1')).toBe(true);
    expect(idx.getEntry('e-1')).toBeUndefined();
  });

  it('returns false when removing unknown entity', () => {
    const idx = createSpatialIndex(makeDeps());
    expect(idx.remove('unknown')).toBe(false);
  });

  it('assigns correct cell coordinates', () => {
    const idx = createSpatialIndex(makeDeps({ cellSize: 32 }));
    const entry = idx.insert('e-1', 50, 100);
    expect(entry.cellX).toBe(1);
    expect(entry.cellY).toBe(3);
  });
});

describe('SpatialIndex — update and movement', () => {
  it('updates entity position', () => {
    const idx = createSpatialIndex(makeDeps());
    idx.insert('e-1', 10, 20);
    const updated = idx.update('e-1', 30, 40);
    expect(updated?.x).toBe(30);
    expect(updated?.y).toBe(40);
  });

  it('returns undefined when updating unknown entity', () => {
    const idx = createSpatialIndex(makeDeps());
    expect(idx.update('unknown', 0, 0)).toBeUndefined();
  });

  it('moves entity between cells on update', () => {
    const idx = createSpatialIndex(makeDeps({ cellSize: 10 }));
    idx.insert('e-1', 5, 5);
    expect(idx.getEntitiesInCell(0, 0)).toContain('e-1');
    idx.update('e-1', 15, 15);
    expect(idx.getEntitiesInCell(0, 0)).not.toContain('e-1');
    expect(idx.getEntitiesInCell(1, 1)).toContain('e-1');
  });

  it('keeps entity in same cell for small moves', () => {
    const idx = createSpatialIndex(makeDeps({ cellSize: 100 }));
    idx.insert('e-1', 10, 10);
    idx.update('e-1', 20, 20);
    expect(idx.getEntitiesInCell(0, 0)).toContain('e-1');
  });
});

describe('SpatialIndex — range queries', () => {
  it('finds entities within radius', () => {
    const idx = createSpatialIndex(makeDeps({ cellSize: 10 }));
    idx.insert('e-1', 0, 0);
    idx.insert('e-2', 3, 4);
    idx.insert('e-3', 100, 100);
    const results = idx.queryRange(0, 0, 10);
    expect(results).toHaveLength(2);
    const ids = results.map((r) => r.entityId);
    expect(ids).toContain('e-1');
    expect(ids).toContain('e-2');
  });

  it('returns empty array when no entities in range', () => {
    const idx = createSpatialIndex(makeDeps());
    idx.insert('e-1', 1000, 1000);
    const results = idx.queryRange(0, 0, 5);
    expect(results).toHaveLength(0);
  });

  it('returns results sorted by distance', () => {
    const idx = createSpatialIndex(makeDeps({ cellSize: 100 }));
    idx.insert('e-far', 8, 6);
    idx.insert('e-near', 1, 0);
    idx.insert('e-mid', 3, 4);
    const results = idx.queryRange(0, 0, 20);
    expect(results[0]?.entityId).toBe('e-near');
    expect(results[1]?.entityId).toBe('e-mid');
    expect(results[2]?.entityId).toBe('e-far');
  });

  it('includes correct distance in results', () => {
    const idx = createSpatialIndex(makeDeps({ cellSize: 100 }));
    idx.insert('e-1', 3, 4);
    const results = idx.queryRange(0, 0, 10);
    expect(results[0]?.distance).toBeCloseTo(5, 5);
  });
});

describe('SpatialIndex — nearest neighbor', () => {
  it('returns N nearest entities', () => {
    const idx = createSpatialIndex(makeDeps({ cellSize: 100 }));
    idx.insert('e-1', 1, 0);
    idx.insert('e-2', 5, 0);
    idx.insert('e-3', 10, 0);
    idx.insert('e-4', 20, 0);
    const results = idx.queryNearest(0, 0, 2);
    expect(results).toHaveLength(2);
    expect(results[0]?.entityId).toBe('e-1');
    expect(results[1]?.entityId).toBe('e-2');
  });

  it('returns all if count exceeds total', () => {
    const idx = createSpatialIndex(makeDeps());
    idx.insert('e-1', 0, 0);
    const results = idx.queryNearest(0, 0, 10);
    expect(results).toHaveLength(1);
  });

  it('returns empty for empty index', () => {
    const idx = createSpatialIndex(makeDeps());
    const results = idx.queryNearest(0, 0, 5);
    expect(results).toHaveLength(0);
  });
});

describe('SpatialIndex — cell queries', () => {
  it('lists entities in a cell', () => {
    const idx = createSpatialIndex(makeDeps({ cellSize: 10 }));
    idx.insert('e-1', 5, 5);
    idx.insert('e-2', 8, 8);
    const entities = idx.getEntitiesInCell(0, 0);
    expect(entities).toHaveLength(2);
  });

  it('returns empty for unoccupied cell', () => {
    const idx = createSpatialIndex(makeDeps());
    expect(idx.getEntitiesInCell(999, 999)).toHaveLength(0);
  });
});

describe('SpatialIndex — zones', () => {
  it('registers a zone', () => {
    const idx = createSpatialIndex(makeDeps());
    const ok = idx.registerZone({ zoneId: 'z-1', minX: 0, minY: 0, maxX: 100, maxY: 100 });
    expect(ok).toBe(true);
  });

  it('rejects duplicate zone registration', () => {
    const idx = createSpatialIndex(makeDeps());
    idx.registerZone({ zoneId: 'z-1', minX: 0, minY: 0, maxX: 100, maxY: 100 });
    expect(idx.registerZone({ zoneId: 'z-1', minX: 0, minY: 0, maxX: 50, maxY: 50 })).toBe(false);
  });

  it('assigns entity to zone on insert', () => {
    const idx = createSpatialIndex(makeDeps());
    idx.registerZone({ zoneId: 'z-1', minX: 0, minY: 0, maxX: 100, maxY: 100 });
    idx.insert('e-1', 50, 50);
    expect(idx.getEntityZone('e-1')).toBe('z-1');
  });

  it('detects zone crossing on update', () => {
    const idx = createSpatialIndex(makeDeps());
    idx.registerZone({ zoneId: 'z-1', minX: 0, minY: 0, maxX: 50, maxY: 50 });
    idx.registerZone({ zoneId: 'z-2', minX: 51, minY: 51, maxX: 100, maxY: 100 });
    const crossings: ZoneBoundary[] = [];
    idx.onZoneCrossing((b) => {
      crossings.push(b);
    });
    idx.insert('e-1', 25, 25);
    idx.update('e-1', 75, 75);
    expect(crossings).toHaveLength(1);
    expect(crossings[0]?.previousZone).toBe('z-1');
    expect(crossings[0]?.currentZone).toBe('z-2');
  });

  it('unregisters a zone and clears entity assignments', () => {
    const idx = createSpatialIndex(makeDeps());
    idx.registerZone({ zoneId: 'z-1', minX: 0, minY: 0, maxX: 100, maxY: 100 });
    idx.insert('e-1', 50, 50);
    idx.unregisterZone('z-1');
    expect(idx.getEntityZone('e-1')).toBeUndefined();
  });

  it('returns false when unregistering unknown zone', () => {
    const idx = createSpatialIndex(makeDeps());
    expect(idx.unregisterZone('unknown')).toBe(false);
  });

  it('returns undefined zone for entity outside all zones', () => {
    const idx = createSpatialIndex(makeDeps());
    idx.registerZone({ zoneId: 'z-1', minX: 0, minY: 0, maxX: 10, maxY: 10 });
    idx.insert('e-1', 500, 500);
    expect(idx.getEntityZone('e-1')).toBeUndefined();
  });
});

describe('SpatialIndex — stats', () => {
  it('starts with zero stats', () => {
    const idx = createSpatialIndex(makeDeps());
    const stats = idx.getStats();
    expect(stats.entityCount).toBe(0);
    expect(stats.occupiedCells).toBe(0);
    expect(stats.queriesExecuted).toBe(0);
  });

  it('tracks entity and query counts', () => {
    const idx = createSpatialIndex(makeDeps({ cellSize: 10 }));
    idx.insert('e-1', 5, 5);
    idx.insert('e-2', 25, 25);
    idx.queryRange(0, 0, 100);
    idx.queryNearest(0, 0, 1);
    const stats = idx.getStats();
    expect(stats.entityCount).toBe(2);
    expect(stats.occupiedCells).toBe(2);
    expect(stats.queriesExecuted).toBe(2);
    expect(stats.cellSize).toBe(10);
  });

  it('tracks zone crossings count', () => {
    const idx = createSpatialIndex(makeDeps());
    idx.registerZone({ zoneId: 'z-1', minX: 0, minY: 0, maxX: 50, maxY: 50 });
    idx.registerZone({ zoneId: 'z-2', minX: 51, minY: 51, maxX: 100, maxY: 100 });
    idx.insert('e-1', 25, 25);
    idx.update('e-1', 75, 75);
    expect(idx.getStats().zoneCrossings).toBe(1);
  });
});
