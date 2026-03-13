import { describe, expect, it } from 'vitest';
import { createLatticeTopology } from '../lattice-topology.js';

function makeTopology() {
  let i = 0;
  return createLatticeTopology({
    clock: { nowMicroseconds: () => 1_000_000 },
    idGenerator: { generate: () => `topo-${++i}` },
  });
}

describe('lattice-topology simulation', () => {
  it('analyzes a partially partitioned weave and produces recommendations', () => {
    const topo = makeTopology();
    topo.addNode('a', 'world-a');
    topo.addNode('b', 'world-b');
    topo.addNode('c', 'world-c');
    topo.addNode('isolated', 'world-d');
    topo.addEdge('a', 'b', 1);
    topo.addEdge('b', 'c', 1);

    const partitions = topo.analyzePartitions();
    expect(partitions.isPartitioned).toBe(true);
    expect(partitions.isolatedNodes).toContain('isolated');

    const recs = topo.getRecommendations();
    expect(recs.some((r) => r.type === 'connect_isolated')).toBe(true);
  });
});
