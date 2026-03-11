/**
 * corridor-network.test.ts — Unit tests for corridor network service.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCorridorNetworkService,
  computeEffectiveWeight,
  MAX_PATH_LENGTH,
  DEFAULT_EDGE_WEIGHT,
} from '../corridor-network.js';
import type { CorridorNetworkService, NetworkDeps, CorridorWeight } from '../corridor-network.js';

// ── Test Helpers ─────────────────────────────────────────────────

function mockClock(start = 1_000_000): {
  nowMicroseconds: () => number;
  advance: (us: number) => void;
} {
  let t = start;
  return {
    nowMicroseconds: () => t,
    advance: (us: number) => {
      t += us;
    },
  };
}

function mockIdGenerator(prefix = 'edge'): {
  next: () => string;
} {
  let counter = 0;
  return {
    next: () => {
      counter += 1;
      return prefix + '-' + String(counter);
    },
  };
}

function createDeps(): NetworkDeps {
  return {
    clock: mockClock(),
    idGenerator: mockIdGenerator(),
  };
}

function createNetwork(): CorridorNetworkService {
  return createCorridorNetworkService(createDeps());
}

function simpleWeight(distance: number): CorridorWeight {
  return { distance, stability: 1.0, congestion: 0 };
}

// ── Constants ────────────────────────────────────────────────────

describe('CorridorNetwork constants', () => {
  it('exports MAX_PATH_LENGTH', () => {
    expect(MAX_PATH_LENGTH).toBe(20);
  });

  it('exports DEFAULT_EDGE_WEIGHT', () => {
    expect(DEFAULT_EDGE_WEIGHT.distance).toBe(1.0);
    expect(DEFAULT_EDGE_WEIGHT.stability).toBe(1.0);
    expect(DEFAULT_EDGE_WEIGHT.congestion).toBe(0);
  });
});

// ── Weight Computation ───────────────────────────────────────────

describe('computeEffectiveWeight', () => {
  it('computes distance * stability + congestion', () => {
    expect(computeEffectiveWeight({ distance: 2, stability: 1.5, congestion: 0.5 })).toBe(3.5);
  });

  it('returns distance when stability is 1 and congestion is 0', () => {
    expect(computeEffectiveWeight({ distance: 5, stability: 1, congestion: 0 })).toBe(5);
  });

  it('handles zero distance', () => {
    expect(computeEffectiveWeight({ distance: 0, stability: 1, congestion: 0 })).toBe(0);
  });
});

// ── Node Operations ──────────────────────────────────────────────

describe('CorridorNetwork — addNode', () => {
  let network: CorridorNetworkService;

  beforeEach(() => {
    network = createNetwork();
  });

  it('adds a node with metadata', () => {
    const node = network.addNode('earth', { type: 'habitable' });
    expect(node.worldId).toBe('earth');
    expect(node.metadata).toEqual({ type: 'habitable' });
  });

  it('returns existing node on duplicate add', () => {
    const n1 = network.addNode('earth', { type: 'habitable' });
    const n2 = network.addNode('earth', { type: 'different' });
    expect(n1.worldId).toBe(n2.worldId);
  });

  it('adds multiple nodes', () => {
    network.addNode('earth', {});
    network.addNode('mars', {});
    network.addNode('venus', {});
    const stats = network.getStats();
    expect(stats.totalNodes).toBe(3);
  });
});

describe('CorridorNetwork — removeNode', () => {
  let network: CorridorNetworkService;

  beforeEach(() => {
    network = createNetwork();
  });

  it('removes a node', () => {
    network.addNode('earth', {});
    expect(network.removeNode('earth')).toBe(true);
    expect(network.getStats().totalNodes).toBe(0);
  });

  it('returns false for nonexistent node', () => {
    expect(network.removeNode('nonexistent')).toBe(false);
  });

  it('removes associated outgoing edges', () => {
    network.addNode('earth', {});
    network.addNode('mars', {});
    network.addEdge('earth', 'mars', 'c-1', simpleWeight(1));
    network.removeNode('earth');
    expect(network.getStats().totalEdges).toBe(0);
  });

  it('removes associated incoming edges', () => {
    network.addNode('earth', {});
    network.addNode('mars', {});
    network.addEdge('earth', 'mars', 'c-1', simpleWeight(1));
    network.removeNode('mars');
    expect(network.getStats().totalEdges).toBe(0);
  });
});

// ── Edge Operations ──────────────────────────────────────────────

describe('CorridorNetwork — addEdge', () => {
  let network: CorridorNetworkService;

  beforeEach(() => {
    network = createNetwork();
  });

  it('adds a directed edge', () => {
    const result = network.addEdge('earth', 'mars', 'c-1', simpleWeight(5));
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.corridorId).toBe('c-1');
      expect(result.fromWorldId).toBe('earth');
      expect(result.toWorldId).toBe('mars');
      expect(result.weight.distance).toBe(5);
    }
  });

  it('auto-creates nodes when adding edge', () => {
    network.addEdge('earth', 'mars', 'c-1', simpleWeight(1));
    expect(network.getStats().totalNodes).toBe(2);
  });

  it('rejects duplicate edge between same nodes', () => {
    network.addEdge('earth', 'mars', 'c-1', simpleWeight(1));
    const result = network.addEdge('earth', 'mars', 'c-2', simpleWeight(2));
    expect(result).toBe('edge_already_exists');
  });

  it('rejects duplicate corridor id', () => {
    network.addEdge('earth', 'mars', 'c-1', simpleWeight(1));
    const result = network.addEdge('venus', 'jupiter', 'c-1', simpleWeight(2));
    expect(result).toBe('corridor_id_taken');
  });

  it('rejects self-loops', () => {
    const result = network.addEdge('earth', 'earth', 'c-1', simpleWeight(1));
    expect(result).toBe('self_loop_not_allowed');
  });

  it('allows edges in both directions', () => {
    const r1 = network.addEdge('earth', 'mars', 'c-1', simpleWeight(1));
    const r2 = network.addEdge('mars', 'earth', 'c-2', simpleWeight(2));
    expect(typeof r1).not.toBe('string');
    expect(typeof r2).not.toBe('string');
  });
});

describe('CorridorNetwork — removeEdge', () => {
  let network: CorridorNetworkService;

  beforeEach(() => {
    network = createNetwork();
  });

  it('removes an edge by corridor id', () => {
    network.addEdge('earth', 'mars', 'c-1', simpleWeight(1));
    expect(network.removeEdge('c-1')).toBe(true);
    expect(network.getStats().totalEdges).toBe(0);
  });

  it('returns false for nonexistent corridor', () => {
    expect(network.removeEdge('nonexistent')).toBe(false);
  });

  it('preserves nodes when removing edge', () => {
    network.addEdge('earth', 'mars', 'c-1', simpleWeight(1));
    network.removeEdge('c-1');
    expect(network.getStats().totalNodes).toBe(2);
  });
});

describe('CorridorNetwork — updateWeight', () => {
  let network: CorridorNetworkService;

  beforeEach(() => {
    network = createNetwork();
  });

  it('updates edge weight', () => {
    network.addEdge('earth', 'mars', 'c-1', simpleWeight(1));
    const result = network.updateWeight('c-1', simpleWeight(10));
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.weight.distance).toBe(10);
    }
  });

  it('returns error for nonexistent corridor', () => {
    const result = network.updateWeight('nonexistent', simpleWeight(1));
    expect(result).toBe('corridor_not_found');
  });
});

// ── Shortest Path ────────────────────────────────────────────────

describe('CorridorNetwork — findShortestPath basic', () => {
  let network: CorridorNetworkService;

  beforeEach(() => {
    network = createNetwork();
  });

  it('finds direct path', () => {
    network.addEdge('earth', 'mars', 'c-1', simpleWeight(3));
    const result = network.findShortestPath({ fromWorldId: 'earth', toWorldId: 'mars' });
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.path).toEqual(['earth', 'mars']);
      expect(result.corridorIds).toEqual(['c-1']);
      expect(result.totalWeight).toBe(3);
      expect(result.hops).toBe(1);
    }
  });

  it('finds multi-hop shortest path', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.addEdge('b', 'c', 'c-2', simpleWeight(2));
    network.addEdge('a', 'c', 'c-3', simpleWeight(10));
    const result = network.findShortestPath({ fromWorldId: 'a', toWorldId: 'c' });
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.path).toEqual(['a', 'b', 'c']);
      expect(result.totalWeight).toBe(3);
    }
  });

  it('returns self-path for same origin and destination', () => {
    network.addNode('earth', {});
    const result = network.findShortestPath({ fromWorldId: 'earth', toWorldId: 'earth' });
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.path).toEqual(['earth']);
      expect(result.hops).toBe(0);
      expect(result.totalWeight).toBe(0);
    }
  });

  it('returns error for nonexistent origin', () => {
    network.addNode('mars', {});
    const result = network.findShortestPath({ fromWorldId: 'earth', toWorldId: 'mars' });
    expect(result).toBe('origin_not_found');
  });

  it('returns error for nonexistent destination', () => {
    network.addNode('earth', {});
    const result = network.findShortestPath({ fromWorldId: 'earth', toWorldId: 'mars' });
    expect(result).toBe('destination_not_found');
  });

  it('returns error when no path exists', () => {
    network.addNode('earth', {});
    network.addNode('mars', {});
    const result = network.findShortestPath({ fromWorldId: 'earth', toWorldId: 'mars' });
    expect(result).toBe('no_path_found');
  });
});

describe('CorridorNetwork — findShortestPath advanced', () => {
  let network: CorridorNetworkService;

  beforeEach(() => {
    network = createNetwork();
  });

  it('uses effective weight including congestion', () => {
    network.addEdge('a', 'b', 'c-1', { distance: 1, stability: 1, congestion: 0 });
    network.addEdge('a', 'c', 'c-2', { distance: 1, stability: 1, congestion: 5 });
    network.addEdge('b', 'c', 'c-3', { distance: 1, stability: 1, congestion: 0 });
    const result = network.findShortestPath({ fromWorldId: 'a', toWorldId: 'c' });
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.path).toEqual(['a', 'b', 'c']);
    }
  });

  it('returns corridor ids along the path', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.addEdge('b', 'c', 'c-2', simpleWeight(1));
    network.addEdge('c', 'd', 'c-3', simpleWeight(1));
    const result = network.findShortestPath({ fromWorldId: 'a', toWorldId: 'd' });
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.corridorIds).toEqual(['c-1', 'c-2', 'c-3']);
    }
  });

  it('respects maxHops constraint', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.addEdge('b', 'c', 'c-2', simpleWeight(1));
    network.addEdge('c', 'd', 'c-3', simpleWeight(1));
    const result = network.findShortestPath({ fromWorldId: 'a', toWorldId: 'd', maxHops: 2 });
    expect(result).toBe('path_exceeds_max_hops');
  });

  it('finds complex graph shortest path', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(4));
    network.addEdge('a', 'c', 'c-2', simpleWeight(2));
    network.addEdge('b', 'd', 'c-3', simpleWeight(3));
    network.addEdge('c', 'b', 'c-4', simpleWeight(1));
    network.addEdge('c', 'd', 'c-5', simpleWeight(5));
    network.addEdge('d', 'e', 'c-6', simpleWeight(1));
    const result = network.findShortestPath({ fromWorldId: 'a', toWorldId: 'e' });
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.path).toEqual(['a', 'c', 'b', 'd', 'e']);
      expect(result.totalWeight).toBe(7);
    }
  });
});

// ── Alternate Paths ──────────────────────────────────────────────

describe('CorridorNetwork — findAlternatePaths', () => {
  let network: CorridorNetworkService;

  beforeEach(() => {
    network = createNetwork();
  });

  it('returns empty array when no path exists', () => {
    network.addNode('a', {});
    network.addNode('b', {});
    const result = network.findAlternatePaths({ fromWorldId: 'a', toWorldId: 'b' }, 3);
    expect(result).toHaveLength(0);
  });

  it('returns single path when count is 1', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    const result = network.findAlternatePaths({ fromWorldId: 'a', toWorldId: 'b' }, 1);
    expect(result).toHaveLength(1);
    expect(result[0]?.path).toEqual(['a', 'b']);
  });

  it('finds multiple alternate paths', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.addEdge('a', 'c', 'c-2', simpleWeight(2));
    network.addEdge('b', 'd', 'c-3', simpleWeight(1));
    network.addEdge('c', 'd', 'c-4', simpleWeight(1));
    const result = network.findAlternatePaths({ fromWorldId: 'a', toWorldId: 'd' }, 2);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]?.totalWeight).toBeLessThanOrEqual(result[1]?.totalWeight ?? Infinity);
  });

  it('returns sorted by weight', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.addEdge('a', 'c', 'c-2', simpleWeight(3));
    network.addEdge('b', 'd', 'c-3', simpleWeight(1));
    network.addEdge('c', 'd', 'c-4', simpleWeight(1));
    const result = network.findAlternatePaths({ fromWorldId: 'a', toWorldId: 'd' }, 2);
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1];
      const curr = result[i];
      if (prev !== undefined && curr !== undefined) {
        expect(prev.totalWeight).toBeLessThanOrEqual(curr.totalWeight);
      }
    }
  });

  it('does not return more paths than available', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    const result = network.findAlternatePaths({ fromWorldId: 'a', toWorldId: 'b' }, 5);
    expect(result).toHaveLength(1);
  });
});

// ── Neighbors ────────────────────────────────────────────────────

describe('CorridorNetwork — getNeighbors', () => {
  let network: CorridorNetworkService;

  beforeEach(() => {
    network = createNetwork();
  });

  it('returns neighboring nodes', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.addEdge('a', 'c', 'c-2', simpleWeight(1));
    const neighbors = network.getNeighbors('a');
    expect(neighbors).toHaveLength(2);
    const ids = neighbors.map((n) => n.worldId);
    expect(ids).toContain('b');
    expect(ids).toContain('c');
  });

  it('returns empty array for unknown node', () => {
    expect(network.getNeighbors('nonexistent')).toHaveLength(0);
  });

  it('returns empty for isolated node', () => {
    network.addNode('lonely', {});
    expect(network.getNeighbors('lonely')).toHaveLength(0);
  });

  it('only returns outgoing neighbors', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    expect(network.getNeighbors('b')).toHaveLength(0);
  });
});

// ── Connected Components ─────────────────────────────────────────

describe('CorridorNetwork — getConnectedComponents', () => {
  let network: CorridorNetworkService;

  beforeEach(() => {
    network = createNetwork();
  });

  it('returns empty for empty graph', () => {
    expect(network.getConnectedComponents()).toHaveLength(0);
  });

  it('returns single component for connected graph', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.addEdge('b', 'c', 'c-2', simpleWeight(1));
    const components = network.getConnectedComponents();
    expect(components).toHaveLength(1);
    expect(components[0]).toHaveLength(3);
  });

  it('returns multiple components for disconnected graph', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.addEdge('c', 'd', 'c-2', simpleWeight(1));
    const components = network.getConnectedComponents();
    expect(components).toHaveLength(2);
  });

  it('treats directed edges as undirected for components', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    const components = network.getConnectedComponents();
    expect(components).toHaveLength(1);
    const component = components[0];
    expect(component).toBeDefined();
    if (component !== undefined) {
      expect(component).toContain('a');
      expect(component).toContain('b');
    }
  });

  it('handles isolated nodes as separate components', () => {
    network.addNode('a', {});
    network.addNode('b', {});
    const components = network.getConnectedComponents();
    expect(components).toHaveLength(2);
  });
});

// ── Reachability ─────────────────────────────────────────────────

describe('CorridorNetwork — isReachable', () => {
  let network: CorridorNetworkService;

  beforeEach(() => {
    network = createNetwork();
  });

  it('self is always reachable', () => {
    network.addNode('a', {});
    expect(network.isReachable('a', 'a')).toBe(true);
  });

  it('finds directly connected node', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    expect(network.isReachable('a', 'b')).toBe(true);
  });

  it('finds transitively reachable node', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.addEdge('b', 'c', 'c-2', simpleWeight(1));
    expect(network.isReachable('a', 'c')).toBe(true);
  });

  it('detects unreachable node', () => {
    network.addNode('a', {});
    network.addNode('b', {});
    expect(network.isReachable('a', 'b')).toBe(false);
  });

  it('respects edge direction', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    expect(network.isReachable('b', 'a')).toBe(false);
  });

  it('returns false for unknown nodes', () => {
    expect(network.isReachable('x', 'y')).toBe(false);
  });
});

// ── Stats ────────────────────────────────────────────────────────

describe('CorridorNetwork — getStats', () => {
  let network: CorridorNetworkService;

  beforeEach(() => {
    network = createNetwork();
  });

  it('returns zero stats initially', () => {
    const stats = network.getStats();
    expect(stats.totalNodes).toBe(0);
    expect(stats.totalEdges).toBe(0);
    expect(stats.totalPathQueries).toBe(0);
    expect(stats.totalComponents).toBe(0);
    expect(stats.averageWeight).toBe(0);
  });

  it('tracks node and edge counts', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(3));
    network.addEdge('b', 'c', 'c-2', simpleWeight(5));
    const stats = network.getStats();
    expect(stats.totalNodes).toBe(3);
    expect(stats.totalEdges).toBe(2);
  });

  it('tracks path queries', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.findShortestPath({ fromWorldId: 'a', toWorldId: 'b' });
    network.findShortestPath({ fromWorldId: 'a', toWorldId: 'b' });
    const stats = network.getStats();
    expect(stats.totalPathQueries).toBe(2);
  });

  it('calculates average weight', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(2));
    network.addEdge('b', 'c', 'c-2', simpleWeight(4));
    const stats = network.getStats();
    expect(stats.averageWeight).toBe(3);
  });

  it('counts connected components', () => {
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.addNode('c', {});
    const stats = network.getStats();
    expect(stats.totalComponents).toBe(2);
  });
});

// ── Integration ──────────────────────────────────────────────────

describe('CorridorNetwork — integration', () => {
  it('builds and queries a complex lattice', () => {
    const network = createNetwork();

    network.addNode('earth', { type: 'home' });
    network.addNode('mars', { type: 'colony' });
    network.addNode('venus', { type: 'research' });
    network.addNode('jupiter', { type: 'gas_giant' });
    network.addNode('saturn', { type: 'gas_giant' });

    network.addEdge('earth', 'mars', 'em', simpleWeight(1));
    network.addEdge('earth', 'venus', 'ev', simpleWeight(2));
    network.addEdge('mars', 'jupiter', 'mj', simpleWeight(3));
    network.addEdge('venus', 'jupiter', 'vj', simpleWeight(2));
    network.addEdge('jupiter', 'saturn', 'js', simpleWeight(1));

    const shortest = network.findShortestPath({ fromWorldId: 'earth', toWorldId: 'saturn' });
    expect(typeof shortest).not.toBe('string');
    if (typeof shortest !== 'string') {
      expect(shortest.totalWeight).toBe(5);
      expect(shortest.hops).toBe(3);
      expect(shortest.path[0]).toBe('earth');
      expect(shortest.path[shortest.path.length - 1]).toBe('saturn');
    }

    expect(network.isReachable('earth', 'saturn')).toBe(true);
    expect(network.isReachable('saturn', 'earth')).toBe(false);

    const components = network.getConnectedComponents();
    expect(components).toHaveLength(1);

    const earthNeighbors = network.getNeighbors('earth');
    expect(earthNeighbors).toHaveLength(2);
  });

  it('handles weight updates affecting path finding', () => {
    const network = createNetwork();
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.addEdge('a', 'c', 'c-2', simpleWeight(5));
    network.addEdge('b', 'd', 'c-3', simpleWeight(1));
    network.addEdge('c', 'd', 'c-4', simpleWeight(1));

    const before = network.findShortestPath({ fromWorldId: 'a', toWorldId: 'd' });
    expect(typeof before).not.toBe('string');
    if (typeof before !== 'string') {
      expect(before.path).toEqual(['a', 'b', 'd']);
    }

    network.updateWeight('c-3', simpleWeight(100));
    const after = network.findShortestPath({ fromWorldId: 'a', toWorldId: 'd' });
    expect(typeof after).not.toBe('string');
    if (typeof after !== 'string') {
      expect(after.path).toEqual(['a', 'c', 'd']);
    }
  });

  it('handles edge removal affecting reachability', () => {
    const network = createNetwork();
    network.addEdge('a', 'b', 'c-1', simpleWeight(1));
    network.addEdge('b', 'c', 'c-2', simpleWeight(1));
    expect(network.isReachable('a', 'c')).toBe(true);

    network.removeEdge('c-2');
    expect(network.isReachable('a', 'c')).toBe(false);
  });
});
