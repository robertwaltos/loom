import { describe, expect, it } from 'vitest';
import { createWorldConnectivityGraph } from '../world-connectivity.js';

describe('world-connectivity simulation', () => {
  it('models an expanding network and recalculates viable paths', () => {
    const graph = createWorldConnectivityGraph();
    graph.addEdge({ fromWorldId: 'a', toWorldId: 'b', weight: 2, bidirectional: true });
    graph.addEdge({ fromWorldId: 'b', toWorldId: 'c', weight: 2, bidirectional: true });
    graph.addEdge({ fromWorldId: 'a', toWorldId: 'c', weight: 10 });

    const shortest = graph.findShortestPath('a', 'c');
    expect(shortest?.path).toEqual(['a', 'b', 'c']);
    expect(shortest?.totalWeight).toBe(4);

    graph.removeNode('b');
    expect(graph.isReachable('a', 'c')).toBe(true);
    expect(graph.getStats().totalNodes).toBe(2);
  });
});
