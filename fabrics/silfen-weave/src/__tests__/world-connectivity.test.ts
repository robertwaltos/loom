import { describe, it, expect } from 'vitest';
import { createWorldConnectivityGraph } from '../world-connectivity.js';

describe('WorldConnectivityGraph — nodes', () => {
  it('adds a node', () => {
    const graph = createWorldConnectivityGraph();
    expect(graph.addNode('earth')).toBe(true);
    expect(graph.getNodeCount()).toBe(1);
  });

  it('rejects duplicate node', () => {
    const graph = createWorldConnectivityGraph();
    graph.addNode('earth');
    expect(graph.addNode('earth')).toBe(false);
  });

  it('removes a node and its edges', () => {
    const graph = createWorldConnectivityGraph();
    graph.addNode('earth');
    graph.addNode('mars');
    graph.addEdge({ fromWorldId: 'earth', toWorldId: 'mars' });
    expect(graph.removeNode('earth')).toBe(true);
    expect(graph.getNodeCount()).toBe(1);
    expect(graph.hasEdge('earth', 'mars')).toBe(false);
  });
});

describe('WorldConnectivityGraph — edges', () => {
  it('adds a directed edge', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({ fromWorldId: 'earth', toWorldId: 'mars' });
    expect(graph.hasEdge('earth', 'mars')).toBe(true);
    expect(graph.hasEdge('mars', 'earth')).toBe(false);
  });

  it('adds a bidirectional edge', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({
      fromWorldId: 'earth',
      toWorldId: 'mars',
      bidirectional: true,
    });
    expect(graph.hasEdge('earth', 'mars')).toBe(true);
    expect(graph.hasEdge('mars', 'earth')).toBe(true);
  });

  it('rejects duplicate edge', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({ fromWorldId: 'earth', toWorldId: 'mars' });
    expect(graph.addEdge({ fromWorldId: 'earth', toWorldId: 'mars' })).toBe(false);
  });

  it('removes an edge', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({ fromWorldId: 'a', toWorldId: 'b' });
    expect(graph.removeEdge('a', 'b')).toBe(true);
    expect(graph.hasEdge('a', 'b')).toBe(false);
  });

  it('auto-creates nodes for edges', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({ fromWorldId: 'x', toWorldId: 'y' });
    expect(graph.getNodeCount()).toBe(2);
  });

  it('stores edge weight and metadata', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({
      fromWorldId: 'a',
      toWorldId: 'b',
      weight: 5,
      metadata: { type: 'corridor' },
    });
    const edge = graph.getEdge('a', 'b');
    expect(edge?.weight).toBe(5);
    expect(edge?.metadata).toEqual({ type: 'corridor' });
  });
});

describe('WorldConnectivityGraph — neighbors', () => {
  it('returns neighbors of a node', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({ fromWorldId: 'a', toWorldId: 'b' });
    graph.addEdge({ fromWorldId: 'a', toWorldId: 'c' });
    const neighbors = graph.getNeighbors('a');
    expect(neighbors).toHaveLength(2);
    expect(neighbors).toContain('b');
    expect(neighbors).toContain('c');
  });

  it('returns empty for unknown node', () => {
    const graph = createWorldConnectivityGraph();
    expect(graph.getNeighbors('unknown')).toHaveLength(0);
  });
});

describe('WorldConnectivityGraph — reachability', () => {
  it('finds reachable node', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({ fromWorldId: 'a', toWorldId: 'b' });
    graph.addEdge({ fromWorldId: 'b', toWorldId: 'c' });
    expect(graph.isReachable('a', 'c')).toBe(true);
  });

  it('detects unreachable node', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({ fromWorldId: 'a', toWorldId: 'b' });
    graph.addNode('c');
    expect(graph.isReachable('a', 'c')).toBe(false);
  });

  it('self is always reachable', () => {
    const graph = createWorldConnectivityGraph();
    graph.addNode('a');
    expect(graph.isReachable('a', 'a')).toBe(true);
  });
});

describe('WorldConnectivityGraph — shortest path', () => {
  it('finds direct path', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({ fromWorldId: 'a', toWorldId: 'b', weight: 3 });
    const result = graph.findShortestPath('a', 'b');
    expect(result?.path).toEqual(['a', 'b']);
    expect(result?.totalWeight).toBe(3);
    expect(result?.hops).toBe(1);
  });

  it('finds multi-hop path', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({ fromWorldId: 'a', toWorldId: 'b', weight: 1 });
    graph.addEdge({ fromWorldId: 'b', toWorldId: 'c', weight: 2 });
    graph.addEdge({ fromWorldId: 'a', toWorldId: 'c', weight: 10 });
    const result = graph.findShortestPath('a', 'c');
    expect(result?.path).toEqual(['a', 'b', 'c']);
    expect(result?.totalWeight).toBe(3);
  });

  it('returns undefined for unreachable', () => {
    const graph = createWorldConnectivityGraph();
    graph.addNode('a');
    graph.addNode('b');
    expect(graph.findShortestPath('a', 'b')).toBeUndefined();
  });

  it('returns zero-hop for self-path', () => {
    const graph = createWorldConnectivityGraph();
    graph.addNode('a');
    const result = graph.findShortestPath('a', 'a');
    expect(result?.hops).toBe(0);
    expect(result?.path).toEqual(['a']);
  });
});

describe('WorldConnectivityGraph — stats', () => {
  it('tracks aggregate statistics', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({ fromWorldId: 'a', toWorldId: 'b' });
    graph.addEdge({ fromWorldId: 'b', toWorldId: 'c' });
    graph.findShortestPath('a', 'c');

    const stats = graph.getStats();
    expect(stats.totalNodes).toBe(3);
    expect(stats.totalEdges).toBe(2);
    expect(stats.totalPathQueries).toBe(1);
  });

  it('starts with zero stats', () => {
    const graph = createWorldConnectivityGraph();
    const stats = graph.getStats();
    expect(stats.totalNodes).toBe(0);
    expect(stats.totalEdges).toBe(0);
  });
});
