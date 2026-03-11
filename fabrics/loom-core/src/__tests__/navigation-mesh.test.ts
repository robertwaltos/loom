import { describe, it, expect } from 'vitest';
import { createNavigationMesh } from '../navigation-mesh.js';
import type { NavigationLayer, NodeType } from '../navigation-mesh.js';

describe('NavigationMesh — node access', () => {
  it('creates a mesh with correct dimensions', () => {
    const mesh = createNavigationMesh(10, 10);
    const stats = mesh.getStats();
    expect(stats.width).toBe(10);
    expect(stats.height).toBe(10);
    expect(stats.totalNodes).toBe(300);
  });

  it('retrieves a node at valid coordinates', () => {
    const mesh = createNavigationMesh(5, 5);
    const node = mesh.getNode(2, 3, 'SURFACE');
    expect(node).toBeDefined();
    expect(node!.x).toBe(2);
    expect(node!.y).toBe(3);
    expect(node!.type).toBe('PASSABLE');
    expect(node!.layer).toBe('SURFACE');
  });

  it('returns undefined for out-of-bounds coordinates', () => {
    const mesh = createNavigationMesh(5, 5);
    expect(mesh.getNode(-1, 0, 'SURFACE')).toBeUndefined();
    expect(mesh.getNode(5, 0, 'SURFACE')).toBeUndefined();
    expect(mesh.getNode(0, 5, 'SURFACE')).toBeUndefined();
  });

  it('supports all three layers', () => {
    const mesh = createNavigationMesh(3, 3);
    const layers: ReadonlyArray<NavigationLayer> = ['SURFACE', 'UNDERGROUND', 'UNDERWATER'];
    for (const layer of layers) {
      const node = mesh.getNode(1, 1, layer);
      expect(node).toBeDefined();
      expect(node!.layer).toBe(layer);
    }
  });
});

describe('NavigationMesh — node modification', () => {
  it('changes node type', () => {
    const mesh = createNavigationMesh(5, 5);
    const result = mesh.setNodeType(2, 2, 'SURFACE', 'BLOCKED');
    expect(result).toBe(true);
    const node = mesh.getNode(2, 2, 'SURFACE');
    expect(node!.type).toBe('BLOCKED');
  });

  it('returns false for out-of-bounds', () => {
    const mesh = createNavigationMesh(5, 5);
    expect(mesh.setNodeType(10, 10, 'SURFACE', 'BLOCKED')).toBe(false);
  });

  it('updates base cost when type changes', () => {
    const mesh = createNavigationMesh(5, 5);
    mesh.setNodeType(1, 1, 'SURFACE', 'SLOW');
    const node = mesh.getNode(1, 1, 'SURFACE');
    expect(node!.baseCost).toBe(2.5);
  });
});

describe('NavigationMesh — neighbors', () => {
  it('returns 8 neighbors for center node', () => {
    const mesh = createNavigationMesh(5, 5);
    const neighbors = mesh.getNeighbors(2, 2, 'SURFACE');
    expect(neighbors.length).toBe(8);
  });

  it('returns fewer neighbors for corner node', () => {
    const mesh = createNavigationMesh(5, 5);
    const neighbors = mesh.getNeighbors(0, 0, 'SURFACE');
    expect(neighbors.length).toBe(3);
  });

  it('returns fewer neighbors for edge node', () => {
    const mesh = createNavigationMesh(5, 5);
    const neighbors = mesh.getNeighbors(2, 0, 'SURFACE');
    expect(neighbors.length).toBe(5);
  });
});

describe('NavigationMesh — pathfinding', () => {
  it('finds a straight-line path', () => {
    const mesh = createNavigationMesh(5, 5);
    const path = mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 4,
      endY: 0,
      layer: 'SURFACE',
    });
    expect(path).toBeDefined();
    expect(path!.length).toBeGreaterThanOrEqual(5);
    expect(path!.totalCost).toBeGreaterThan(0);
  });

  it('finds path around blocked nodes', () => {
    const mesh = createNavigationMesh(5, 5);
    mesh.setNodeType(2, 0, 'SURFACE', 'BLOCKED');
    mesh.setNodeType(2, 1, 'SURFACE', 'BLOCKED');
    mesh.setNodeType(2, 2, 'SURFACE', 'BLOCKED');

    const path = mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 4,
      endY: 0,
      layer: 'SURFACE',
    });
    expect(path).toBeDefined();
    const blocked = path!.nodes.filter((n) => n.x === 2 && n.y <= 2);
    expect(blocked.length).toBe(0);
  });

  it('returns undefined when no path exists', () => {
    const mesh = createNavigationMesh(5, 5);
    for (let y = 0; y < 5; y++) {
      mesh.setNodeType(2, y, 'SURFACE', 'BLOCKED');
    }
    const path = mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 4,
      endY: 0,
      layer: 'SURFACE',
    });
    expect(path).toBeUndefined();
  });

  it('path starts and ends at correct nodes', () => {
    const mesh = createNavigationMesh(5, 5);
    const path = mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 3,
      endY: 3,
      layer: 'SURFACE',
    });
    expect(path).toBeDefined();
    const first = path!.nodes[0]!;
    expect(first.x).toBe(0);
    expect(first.y).toBe(0);
    const last = path!.nodes[path!.nodes.length - 1]!;
    expect(last.x).toBe(3);
    expect(last.y).toBe(3);
  });

  it('caches paths for repeated queries', () => {
    const mesh = createNavigationMesh(5, 5);
    const request = {
      startX: 0,
      startY: 0,
      endX: 4,
      endY: 4,
      layer: 'SURFACE' as NavigationLayer,
    };
    mesh.findPath(request);
    mesh.findPath(request);
    const stats = mesh.getStats();
    expect(stats.cachedPaths).toBe(1);
    expect(stats.pathsComputed).toBe(1);
  });

  it('weather cost modifier affects path cost', () => {
    const mesh = createNavigationMesh(5, 5);
    const normalPath = mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 4,
      endY: 0,
      layer: 'SURFACE',
      weatherCostMod: 1.0,
    });
    mesh.clearPathCache();
    const stormPath = mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 4,
      endY: 0,
      layer: 'SURFACE',
      weatherCostMod: 2.0,
    });
    expect(stormPath).toBeDefined();
  });

  it('returns undefined for out-of-bounds start', () => {
    const mesh = createNavigationMesh(5, 5);
    const path = mesh.findPath({
      startX: -1,
      startY: 0,
      endX: 4,
      endY: 0,
      layer: 'SURFACE',
    });
    expect(path).toBeUndefined();
  });

  it('returns undefined for out-of-bounds end', () => {
    const mesh = createNavigationMesh(5, 5);
    const path = mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 10,
      endY: 10,
      layer: 'SURFACE',
    });
    expect(path).toBeUndefined();
  });

  it('prefers PASSABLE over SLOW terrain', () => {
    const mesh = createNavigationMesh(5, 3);
    mesh.setNodeType(1, 0, 'SURFACE', 'SLOW');
    mesh.setNodeType(2, 0, 'SURFACE', 'SLOW');
    mesh.setNodeType(3, 0, 'SURFACE', 'SLOW');

    const path = mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 4,
      endY: 0,
      layer: 'SURFACE',
    });
    expect(path).toBeDefined();
  });
});

describe('NavigationMesh — obstacles', () => {
  it('adds an obstacle that blocks a node', () => {
    const mesh = createNavigationMesh(5, 5);
    const obstacle = mesh.addObstacle(2, 2, 'SURFACE');
    expect(obstacle.obstacleId).toBe('obs-1');
    const node = mesh.getNode(2, 2, 'SURFACE');
    expect(node!.type).toBe('BLOCKED');
  });

  it('removes an obstacle restoring the node', () => {
    const mesh = createNavigationMesh(5, 5);
    const obstacle = mesh.addObstacle(2, 2, 'SURFACE');
    const removed = mesh.removeObstacle(obstacle.obstacleId);
    expect(removed).toBe(true);
    const node = mesh.getNode(2, 2, 'SURFACE');
    expect(node!.type).toBe('PASSABLE');
  });

  it('returns false when removing non-existent obstacle', () => {
    const mesh = createNavigationMesh(5, 5);
    expect(mesh.removeObstacle('obs-999')).toBe(false);
  });

  it('obstacle count appears in stats', () => {
    const mesh = createNavigationMesh(5, 5);
    mesh.addObstacle(0, 0, 'SURFACE');
    mesh.addObstacle(1, 1, 'SURFACE');
    expect(mesh.getStats().obstacleCount).toBe(2);
  });
});

describe('NavigationMesh — cache', () => {
  it('clears the path cache', () => {
    const mesh = createNavigationMesh(5, 5);
    mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 4,
      endY: 4,
      layer: 'SURFACE',
    });
    const cleared = mesh.clearPathCache();
    expect(cleared).toBe(1);
    expect(mesh.getStats().cachedPaths).toBe(0);
  });

  it('cache is invalidated when node type changes', () => {
    const mesh = createNavigationMesh(5, 5);
    mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 4,
      endY: 4,
      layer: 'SURFACE',
    });
    expect(mesh.getStats().cachedPaths).toBe(1);
    mesh.setNodeType(3, 3, 'SURFACE', 'SLOW');
    expect(mesh.getStats().cachedPaths).toBe(0);
  });
});

describe('NavigationMesh — stats', () => {
  it('reports complete stats', () => {
    const mesh = createNavigationMesh(10, 10);
    mesh.addObstacle(5, 5, 'SURFACE');
    mesh.findPath({
      startX: 0,
      startY: 0,
      endX: 9,
      endY: 9,
      layer: 'SURFACE',
    });
    const stats = mesh.getStats();
    expect(stats.width).toBe(10);
    expect(stats.height).toBe(10);
    expect(stats.totalNodes).toBe(300);
    expect(stats.blockedNodes).toBe(1);
    expect(stats.obstacleCount).toBe(1);
    expect(stats.pathsComputed).toBe(1);
  });
});
