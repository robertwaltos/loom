/**
 * lattice-topology.test.ts — Unit tests for lattice topology management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createLatticeTopology } from '../lattice-topology.js';
import type { LatticeTopology, LatticeTopologyDeps } from '../lattice-topology.js';

// ── Test Helpers ─────────────────────────────────────────────────

function mockClock(start = 1_000_000): {
  nowMicroseconds: () => number;
} {
  const t = start;
  return { nowMicroseconds: () => t };
}

function mockIdGen(): { generate: () => string } {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return 'topo-' + String(counter);
    },
  };
}

function makeDeps(): LatticeTopologyDeps {
  return {
    clock: mockClock(),
    idGenerator: mockIdGen(),
  };
}

function buildTriangle(topo: LatticeTopology): void {
  topo.addNode('n1', 'w1');
  topo.addNode('n2', 'w2');
  topo.addNode('n3', 'w3');
  topo.addEdge('n1', 'n2', 1.0);
  topo.addEdge('n2', 'n3', 1.0);
  topo.addEdge('n1', 'n3', 1.0);
}

function buildLinear(topo: LatticeTopology): void {
  topo.addNode('n1', 'w1');
  topo.addNode('n2', 'w2');
  topo.addNode('n3', 'w3');
  topo.addNode('n4', 'w4');
  topo.addEdge('n1', 'n2', 1.0);
  topo.addEdge('n2', 'n3', 1.0);
  topo.addEdge('n3', 'n4', 1.0);
}

// ── Tests: Node Operations ───────────────────────────────────────

describe('LatticeTopology — node operations', () => {
  let topo: LatticeTopology;

  beforeEach(() => {
    topo = createLatticeTopology(makeDeps());
  });

  it('adds a node', () => {
    const node = topo.addNode('n1', 'world-1');
    expect(node.nodeId).toBe('n1');
    expect(node.worldId).toBe('world-1');
    expect(node.connections).toHaveLength(0);
  });

  it('returns existing node on duplicate add', () => {
    topo.addNode('n1', 'world-1');
    const node = topo.addNode('n1', 'world-1');
    expect(node.nodeId).toBe('n1');
  });

  it('retrieves a node', () => {
    topo.addNode('n1', 'world-1');
    const found = topo.getNode('n1');
    expect(found).toBeDefined();
    expect(found?.nodeId).toBe('n1');
  });

  it('returns undefined for unknown node', () => {
    expect(topo.getNode('unknown')).toBeUndefined();
  });

  it('removes a node and its edges', () => {
    buildTriangle(topo);
    expect(topo.removeNode('n2')).toBe(true);
    expect(topo.getNode('n2')).toBeUndefined();
    const n1 = topo.getNode('n1');
    expect(n1?.connections).not.toContain('n2');
  });

  it('returns false removing unknown node', () => {
    expect(topo.removeNode('unknown')).toBe(false);
  });
});

// ── Tests: Edge Operations ───────────────────────────────────────

describe('LatticeTopology — edge operations', () => {
  let topo: LatticeTopology;

  beforeEach(() => {
    topo = createLatticeTopology(makeDeps());
    topo.addNode('n1', 'w1');
    topo.addNode('n2', 'w2');
  });

  it('adds an edge between nodes', () => {
    const result = topo.addEdge('n1', 'n2', 5.0);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.fromNodeId).toBe('n1');
    expect(result.toNodeId).toBe('n2');
    expect(result.weight).toBe(5.0);
  });

  it('updates connections on both nodes', () => {
    topo.addEdge('n1', 'n2', 1.0);
    const n1 = topo.getNode('n1');
    const n2 = topo.getNode('n2');
    expect(n1?.connections).toContain('n2');
    expect(n2?.connections).toContain('n1');
  });

  it('rejects edge from unknown node', () => {
    expect(topo.addEdge('unknown', 'n2', 1.0)).toBe('from_node_not_found');
  });

  it('rejects edge to unknown node', () => {
    expect(topo.addEdge('n1', 'unknown', 1.0)).toBe('to_node_not_found');
  });

  it('rejects self-loop', () => {
    expect(topo.addEdge('n1', 'n1', 1.0)).toBe('self_loop_not_allowed');
  });

  it('removes an edge', () => {
    topo.addEdge('n1', 'n2', 1.0);
    expect(topo.removeEdge('n1', 'n2')).toBe(true);
    const n1 = topo.getNode('n1');
    expect(n1?.connections).not.toContain('n2');
  });

  it('returns false removing non-existent edge', () => {
    expect(topo.removeEdge('n1', 'n2')).toBe(false);
  });
});

// ── Tests: Cluster Detection ─────────────────────────────────────

describe('LatticeTopology — cluster detection', () => {
  it('detects a single cluster in connected graph', () => {
    const topo = createLatticeTopology(makeDeps());
    buildTriangle(topo);
    const clusters = topo.detectClusters();
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.nodeIds).toHaveLength(3);
  });

  it('detects multiple clusters in disconnected graph', () => {
    const topo = createLatticeTopology(makeDeps());
    topo.addNode('a1', 'w1');
    topo.addNode('a2', 'w2');
    topo.addEdge('a1', 'a2', 1.0);
    topo.addNode('b1', 'w3');
    topo.addNode('b2', 'w4');
    topo.addEdge('b1', 'b2', 1.0);
    const clusters = topo.detectClusters();
    expect(clusters).toHaveLength(2);
  });

  it('excludes isolated nodes from clusters', () => {
    const topo = createLatticeTopology(makeDeps());
    topo.addNode('n1', 'w1');
    topo.addNode('n2', 'w2');
    topo.addNode('isolated', 'w3');
    topo.addEdge('n1', 'n2', 1.0);
    const clusters = topo.detectClusters();
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.nodeIds).not.toContain('isolated');
  });

  it('calculates cluster density', () => {
    const topo = createLatticeTopology(makeDeps());
    buildTriangle(topo);
    const clusters = topo.detectClusters();
    expect(clusters[0]?.density).toBe(1.0);
  });

  it('returns empty clusters for empty graph', () => {
    const topo = createLatticeTopology(makeDeps());
    expect(topo.detectClusters()).toHaveLength(0);
  });
});

// ── Tests: Bridge Node Detection ─────────────────────────────────

describe('LatticeTopology — bridge nodes', () => {
  it('returns empty for fully connected graph', () => {
    const topo = createLatticeTopology(makeDeps());
    buildTriangle(topo);
    const bridges = topo.detectBridgeNodes();
    expect(bridges).toHaveLength(0);
  });

  it('returns empty for linear chain (single component)', () => {
    const topo = createLatticeTopology(makeDeps());
    buildLinear(topo);
    const bridges = topo.detectBridgeNodes();
    expect(bridges).toHaveLength(0);
  });

  it('returns empty for disconnected groups', () => {
    const topo = createLatticeTopology(makeDeps());
    topo.addNode('a1', 'w1');
    topo.addNode('a2', 'w2');
    topo.addEdge('a1', 'a2', 1.0);
    topo.addNode('b1', 'w3');
    topo.addNode('b2', 'w4');
    topo.addEdge('b1', 'b2', 1.0);
    const bridges = topo.detectBridgeNodes();
    expect(bridges).toHaveLength(0);
  });
});

// ── Tests: Partition Analysis ────────────────────────────────────

describe('LatticeTopology — partition analysis', () => {
  it('identifies connected graph as not partitioned', () => {
    const topo = createLatticeTopology(makeDeps());
    buildTriangle(topo);
    const analysis = topo.analyzePartitions();
    expect(analysis.isPartitioned).toBe(false);
    expect(analysis.componentCount).toBe(1);
  });

  it('identifies disconnected graph as partitioned', () => {
    const topo = createLatticeTopology(makeDeps());
    topo.addNode('a1', 'w1');
    topo.addNode('a2', 'w2');
    topo.addEdge('a1', 'a2', 1.0);
    topo.addNode('b1', 'w3');
    topo.addNode('b2', 'w4');
    topo.addEdge('b1', 'b2', 1.0);
    const analysis = topo.analyzePartitions();
    expect(analysis.isPartitioned).toBe(true);
    expect(analysis.componentCount).toBe(2);
  });

  it('identifies isolated nodes', () => {
    const topo = createLatticeTopology(makeDeps());
    topo.addNode('n1', 'w1');
    topo.addNode('n2', 'w2');
    topo.addEdge('n1', 'n2', 1.0);
    topo.addNode('isolated', 'w3');
    const analysis = topo.analyzePartitions();
    expect(analysis.isolatedNodes).toContain('isolated');
    expect(analysis.componentCount).toBe(2);
  });

  it('handles empty graph', () => {
    const topo = createLatticeTopology(makeDeps());
    const analysis = topo.analyzePartitions();
    expect(analysis.isPartitioned).toBe(false);
    expect(analysis.componentCount).toBe(0);
  });
});

// ── Tests: Redundancy Scoring ────────────────────────────────────

describe('LatticeTopology — redundancy scoring', () => {
  it('scores high redundancy for well-connected nodes', () => {
    const topo = createLatticeTopology(makeDeps());
    buildTriangle(topo);
    const score = topo.scoreRedundancy('n1');
    expect(score).toBeDefined();
    if (score === undefined) return;
    expect(score.score).toBeGreaterThan(0);
    expect(score.alternatePathCount).toBeGreaterThan(0);
    expect(score.grade).not.toBe('none');
  });

  it('scores zero redundancy for isolated node', () => {
    const topo = createLatticeTopology(makeDeps());
    topo.addNode('isolated', 'w1');
    const score = topo.scoreRedundancy('isolated');
    expect(score).toBeDefined();
    if (score === undefined) return;
    expect(score.score).toBe(0);
    expect(score.grade).toBe('none');
  });

  it('returns undefined for unknown node', () => {
    const topo = createLatticeTopology(makeDeps());
    expect(topo.scoreRedundancy('unknown')).toBeUndefined();
  });

  it('scores low redundancy for single-link node', () => {
    const topo = createLatticeTopology(makeDeps());
    topo.addNode('n1', 'w1');
    topo.addNode('n2', 'w2');
    topo.addEdge('n1', 'n2', 1.0);
    const score = topo.scoreRedundancy('n1');
    expect(score).toBeDefined();
    if (score === undefined) return;
    expect(score.alternatePathCount).toBe(0);
    expect(score.score).toBeLessThan(20);
  });
});

// ── Tests: Optimization Recommendations ──────────────────────────

describe('LatticeTopology — recommendations', () => {
  it('recommends connecting isolated nodes', () => {
    const topo = createLatticeTopology(makeDeps());
    topo.addNode('n1', 'w1');
    topo.addNode('n2', 'w2');
    topo.addEdge('n1', 'n2', 1.0);
    topo.addNode('isolated', 'w3');
    const recs = topo.getRecommendations();
    const connectRecs = recs.filter((r) => r.type === 'connect_isolated');
    expect(connectRecs).toHaveLength(1);
    expect(connectRecs[0]?.targetNodeIds).toContain('isolated');
    expect(connectRecs[0]?.priority).toBe('high');
  });

  it('recommends strengthening single-link nodes', () => {
    const topo = createLatticeTopology(makeDeps());
    buildLinear(topo);
    const recs = topo.getRecommendations();
    const strengthenRecs = recs.filter((r) => r.type === 'strengthen_bridge');
    expect(strengthenRecs.length).toBeGreaterThan(0);
  });

  it('returns no recommendations for well-connected graph', () => {
    const topo = createLatticeTopology(makeDeps());
    buildTriangle(topo);
    const recs = topo.getRecommendations();
    expect(recs).toHaveLength(0);
  });
});

// ── Tests: Resilience Metrics ────────────────────────────────────

describe('LatticeTopology — resilience metrics', () => {
  it('reports metrics for connected graph', () => {
    const topo = createLatticeTopology(makeDeps());
    buildTriangle(topo);
    const metrics = topo.getResilienceMetrics();
    expect(metrics.totalNodes).toBe(3);
    expect(metrics.totalEdges).toBe(3);
    expect(metrics.averageDegree).toBe(2);
    expect(metrics.partitionRisk).toBe(0);
    expect(metrics.overallResilience).toBeGreaterThan(0);
    expect(metrics.connectivityRatio).toBe(1.0);
  });

  it('reports high partition risk for disconnected graph', () => {
    const topo = createLatticeTopology(makeDeps());
    topo.addNode('a1', 'w1');
    topo.addNode('a2', 'w2');
    topo.addEdge('a1', 'a2', 1.0);
    topo.addNode('b1', 'w3');
    topo.addNode('b2', 'w4');
    topo.addEdge('b1', 'b2', 1.0);
    const metrics = topo.getResilienceMetrics();
    expect(metrics.partitionRisk).toBeGreaterThan(0);
  });

  it('reports zero metrics for empty graph', () => {
    const topo = createLatticeTopology(makeDeps());
    const metrics = topo.getResilienceMetrics();
    expect(metrics.totalNodes).toBe(0);
    expect(metrics.totalEdges).toBe(0);
    expect(metrics.averageDegree).toBe(0);
    expect(metrics.connectivityRatio).toBe(1.0);
  });

  it('reports cluster count', () => {
    const topo = createLatticeTopology(makeDeps());
    buildTriangle(topo);
    const metrics = topo.getResilienceMetrics();
    expect(metrics.clusterCount).toBe(1);
  });

  it('reports low connectivity for sparse graph', () => {
    const topo = createLatticeTopology(makeDeps());
    topo.addNode('n1', 'w1');
    topo.addNode('n2', 'w2');
    topo.addNode('n3', 'w3');
    topo.addNode('n4', 'w4');
    topo.addEdge('n1', 'n2', 1.0);
    const metrics = topo.getResilienceMetrics();
    expect(metrics.connectivityRatio).toBeLessThan(0.5);
  });
});
