import { describe, expect, it } from 'vitest';
import { createSpatialIndex } from '../spatial-index.js';

describe('spatial-index simulation', () => {
  it('simulates moving entities, zone crossings, and neighborhood queries', () => {
    let now = 1_000_000;
    const index = createSpatialIndex({
      clock: { nowMicroseconds: () => (now += 1_000) },
      cellSize: 10,
    });

    index.registerZone({ zoneId: 'town', minX: 0, minY: 0, maxX: 49, maxY: 49 });
    index.registerZone({ zoneId: 'wilds', minX: 50, minY: 50, maxX: 100, maxY: 100 });

    const crossings: Array<{ from: string; to: string }> = [];
    index.onZoneCrossing((b) => crossings.push({ from: b.previousZone, to: b.currentZone }));

    index.insert('e-1', 5, 5);
    index.insert('e-2', 7, 7);
    index.update('e-1', 60, 60);

    const nearWilds = index.queryRange(60, 60, 5);
    const nearestTown = index.queryNearest(0, 0, 1);

    expect(crossings).toEqual([{ from: 'town', to: 'wilds' }]);
    expect(index.getEntityZone('e-1')).toBe('wilds');
    expect(nearWilds[0]?.entityId).toBe('e-1');
    expect(nearestTown[0]?.entityId).toBe('e-2');
    expect(index.getStats().queriesExecuted).toBe(2);
  });
});
