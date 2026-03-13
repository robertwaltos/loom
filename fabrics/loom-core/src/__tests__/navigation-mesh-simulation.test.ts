import { describe, expect, it } from 'vitest';
import { createNavigationMesh } from '../navigation-mesh.js';

describe('navigation-mesh simulation', () => {
  it('simulates obstacle updates and pathfinding cache behavior across repeated routes', () => {
    const mesh = createNavigationMesh(8, 8);

    mesh.addObstacle(3, 3, 'SURFACE');
    mesh.addObstacle(3, 4, 'SURFACE');
    const first = mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 7,
      endY: 7,
      layer: 'SURFACE',
    });
    const second = mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 7,
      endY: 7,
      layer: 'SURFACE',
    });

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(mesh.getStats().cachedPaths).toBe(1);
    expect(mesh.getStats().obstacleCount).toBe(2);
  });
});
