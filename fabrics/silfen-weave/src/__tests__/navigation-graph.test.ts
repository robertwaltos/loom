import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNavigationGraphSystem,
  type NavigationGraphSystem,
  type NavClock,
  type NavIdGenerator,
  type NavLogger,
} from '../navigation-graph.js';

// ── Test Doubles ─────────────────────────────────────────────────

class TestClock implements NavClock {
  private readonly time = 1_000_000n;
  now(): bigint {
    return this.time;
  }
}

class TestIdGen implements NavIdGenerator {
  private counter = 0;
  generate(): string {
    return 'id-' + String(++this.counter);
  }
}

class TestLogger implements NavLogger {
  readonly infos: string[] = [];
  readonly warns: string[] = [];
  readonly errors: string[] = [];
  info(m: string): void {
    this.infos.push(m);
  }
  warn(m: string): void {
    this.warns.push(m);
  }
  error(m: string): void {
    this.errors.push(m);
  }
}

function makeGraph(): NavigationGraphSystem {
  return createNavigationGraphSystem({
    clock: new TestClock(),
    idGen: new TestIdGen(),
    logger: new TestLogger(),
  });
}

// ── Tests ────────────────────────────────────────────────────────

describe('NavigationGraph — addNode / addEdge', () => {
  let graph: NavigationGraphSystem;

  beforeEach(() => {
    graph = makeGraph();
  });

  it('adds a node and returns it', () => {
    const result = graph.addNode('world-1', 'World One');
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.nodeId).toBe('world-1');
    expect(result.label).toBe('World One');
  });

  it('returns already-exists for duplicate nodeId', () => {
    graph.addNode('world-1', 'World One');
    expect(graph.addNode('world-1', 'Duplicate')).toBe('already-exists');
  });

  it('stores addedAt timestamp', () => {
    const result = graph.addNode('w1', 'W1');
    if (typeof result === 'string') return;
    expect(result.addedAt).toBeGreaterThan(0n);
  });

  it('adds a directed edge between existing nodes', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    const edge = graph.addEdge('A', 'B', 5, false);
    expect(typeof edge).not.toBe('string');
    if (typeof edge === 'string') return;
    expect(edge.fromNodeId).toBe('A');
    expect(edge.toNodeId).toBe('B');
    expect(edge.weight).toBe(5);
    expect(edge.active).toBe(true);
  });

  it('returns node-not-found if fromNode missing', () => {
    graph.addNode('B', 'B');
    expect(graph.addEdge('UNKNOWN', 'B', 1, false)).toBe('node-not-found');
  });

  it('returns node-not-found if toNode missing', () => {
    graph.addNode('A', 'A');
    expect(graph.addEdge('A', 'UNKNOWN', 1, false)).toBe('node-not-found');
  });

  it('defaults weight to 1 when weight <= 0', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    const edge = graph.addEdge('A', 'B', 0, false);
    if (typeof edge === 'string') return;
    expect(edge.weight).toBe(1);
  });
});

describe('NavigationGraph — removeEdge / deactivateEdge', () => {
  let graph: NavigationGraphSystem;

  beforeEach(() => {
    graph = makeGraph();
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
  });

  it('removes an existing edge', () => {
    const edge = graph.addEdge('A', 'B', 1, false);
    if (typeof edge === 'string') return;
    expect(graph.removeEdge(edge.edgeId).success).toBe(true);
    expect(graph.getEdge(edge.edgeId)).toBeUndefined();
  });

  it('returns edge-not-found for unknown edge on remove', () => {
    const result = graph.removeEdge('fake-edge');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('edge-not-found');
  });

  it('deactivates an active edge', () => {
    const edge = graph.addEdge('A', 'B', 1, false);
    if (typeof edge === 'string') return;
    graph.deactivateEdge(edge.edgeId);
    expect(graph.getEdge(edge.edgeId)?.active).toBe(false);
  });

  it('returns edge-not-found for unknown edge on deactivate', () => {
    expect(graph.deactivateEdge('fake').success).toBe(false);
  });
});

describe('NavigationGraph — findPath', () => {
  let graph: NavigationGraphSystem;

  beforeEach(() => {
    graph = makeGraph();
  });

  it('finds direct path between connected nodes', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    graph.addEdge('A', 'B', 3, false);
    const result = graph.findPath('A', 'B');
    if (typeof result === 'string') return;
    expect(result.path).toEqual(['A', 'B']);
    expect(result.totalWeight).toBe(3);
    expect(result.hopCount).toBe(1);
  });

  it('finds multi-hop shortest path', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    graph.addNode('C', 'C');
    graph.addEdge('A', 'B', 1, false);
    graph.addEdge('B', 'C', 1, false);
    graph.addEdge('A', 'C', 10, false);
    const result = graph.findPath('A', 'C');
    if (typeof result === 'string') return;
    expect(result.totalWeight).toBe(2);
    expect(result.hopCount).toBe(2);
  });

  it('traverses bidirectional edges in reverse', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    graph.addEdge('A', 'B', 4, true);
    const result = graph.findPath('B', 'A');
    if (typeof result === 'string') return;
    expect(result.path).toEqual(['B', 'A']);
    expect(result.totalWeight).toBe(4);
  });

  it('returns no-path when no active route exists', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    expect(graph.findPath('A', 'B')).toBe('no-path');
  });

  it('skips deactivated edges in path finding', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    const edge = graph.addEdge('A', 'B', 1, false);
    if (typeof edge === 'string') return;
    graph.deactivateEdge(edge.edgeId);
    expect(graph.findPath('A', 'B')).toBe('no-path');
  });

  it('returns node-not-found for unknown nodes', () => {
    graph.addNode('A', 'A');
    expect(graph.findPath('A', 'UNKNOWN')).toBe('node-not-found');
  });
});

describe('NavigationGraph — listNodes / listEdges', () => {
  let graph: NavigationGraphSystem;

  beforeEach(() => {
    graph = makeGraph();
  });

  it('lists all nodes', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    expect(graph.listNodes().length).toBe(2);
  });

  it('listEdges returns all edges without filter', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    graph.addEdge('A', 'B', 1, false);
    expect(graph.listEdges().length).toBe(1);
  });

  it('listEdges(true) returns only active edges', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    graph.addNode('C', 'C');
    graph.addEdge('A', 'B', 1, false);
    const e2 = graph.addEdge('B', 'C', 1, false);
    if (typeof e2 === 'string') return;
    graph.deactivateEdge(e2.edgeId);
    expect(graph.listEdges(true).length).toBe(1);
  });

  it('listEdges(false) returns only inactive edges', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    const e = graph.addEdge('A', 'B', 1, false);
    if (typeof e === 'string') return;
    graph.deactivateEdge(e.edgeId);
    expect(graph.listEdges(false).length).toBe(1);
  });
});

describe('NavigationGraph — connectivity report', () => {
  let graph: NavigationGraphSystem;

  beforeEach(() => {
    graph = makeGraph();
  });

  it('reports total nodes and edges', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    graph.addEdge('A', 'B', 1, false);
    const report = graph.getConnectivityReport();
    expect(report.totalNodes).toBe(2);
    expect(report.totalEdges).toBe(1);
    expect(report.activeEdges).toBe(1);
  });

  it('reachableFrom finds connected nodes via BFS', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    graph.addNode('C', 'C');
    graph.addEdge('A', 'B', 1, false);
    graph.addEdge('B', 'C', 1, false);
    const reachable = graph.getConnectivityReport().reachableFrom('A');
    expect(reachable).toContain('B');
    expect(reachable).toContain('C');
  });

  it('reachableFrom excludes start node', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    graph.addEdge('A', 'B', 1, true);
    expect(graph.getConnectivityReport().reachableFrom('A')).not.toContain('A');
  });

  it('reachableFrom returns empty for isolated node', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    expect(graph.getConnectivityReport().reachableFrom('A').length).toBe(0);
  });

  it('reachableFrom respects bidirectional edges', () => {
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    graph.addEdge('A', 'B', 1, true);
    expect(graph.getConnectivityReport().reachableFrom('B')).toContain('A');
  });

  it('reachableFrom returns empty array for unknown node', () => {
    expect(graph.getConnectivityReport().reachableFrom('UNKNOWN').length).toBe(0);
  });
});
