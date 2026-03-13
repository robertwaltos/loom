import { describe, expect, it } from 'vitest';
import { createNavigationGraphSystem } from '../navigation-graph.js';

function makeGraph() {
  let i = 0;
  return createNavigationGraphSystem({
    clock: { now: () => 1_000_000n },
    idGen: { generate: () => `e-${++i}` },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
}

describe('navigation-graph simulation', () => {
  it('routes through cheapest active path and updates connectivity after edge deactivation', () => {
    const graph = makeGraph();
    graph.addNode('A', 'A');
    graph.addNode('B', 'B');
    graph.addNode('C', 'C');
    const edge = graph.addEdge('A', 'B', 1, true);
    graph.addEdge('B', 'C', 1, false);
    graph.addEdge('A', 'C', 5, false);

    const first = graph.findPath('A', 'C');
    expect(typeof first).toBe('object');
    if (typeof first === 'string') return;
    expect(first.totalWeight).toBe(2);

    if (typeof edge === 'string') return;
    graph.deactivateEdge(edge.edgeId);
    const reachable = graph.getConnectivityReport().reachableFrom('B');
    expect(reachable).toContain('C');
    expect(reachable).not.toContain('A');
  });
});
