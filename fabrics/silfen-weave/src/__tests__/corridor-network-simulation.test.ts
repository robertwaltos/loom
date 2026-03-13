import { describe, expect, it } from 'vitest';
import { createCorridorNetworkService, type NetworkDeps } from '../corridor-network.js';

function makeDeps(): NetworkDeps {
  let t = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (t += 1_000) },
    idGenerator: { next: () => 'unused' },
  };
}

describe('corridor-network simulation', () => {
  it('finds shortest and alternate paths in a weave region', () => {
    const network = createCorridorNetworkService(makeDeps());
    network.addEdge('a', 'b', 'c1', { distance: 2, stability: 1, congestion: 0 });
    network.addEdge('b', 'd', 'c2', { distance: 2, stability: 1, congestion: 0 });
    network.addEdge('a', 'c', 'c3', { distance: 1, stability: 1, congestion: 0 });
    network.addEdge('c', 'd', 'c4', { distance: 4, stability: 1, congestion: 0 });

    const shortest = network.findShortestPath({ fromWorldId: 'a', toWorldId: 'd' });
    expect(typeof shortest).toBe('object');
    if (typeof shortest === 'string') return;
    expect(shortest.path).toEqual(['a', 'b', 'd']);

    const alternates = network.findAlternatePaths({ fromWorldId: 'a', toWorldId: 'd' }, 2);
    expect(alternates.length).toBeGreaterThanOrEqual(1);
  });

  it('updates topology after node removal', () => {
    const network = createCorridorNetworkService(makeDeps());
    network.addEdge('x', 'y', 'xy', { distance: 1, stability: 1, congestion: 0 });
    network.addEdge('y', 'z', 'yz', { distance: 1, stability: 1, congestion: 0 });
    expect(network.isReachable('x', 'z')).toBe(true);

    network.removeNode('y');
    expect(network.isReachable('x', 'z')).toBe(false);
    expect(network.getStats().totalEdges).toBe(0);
  });
});
