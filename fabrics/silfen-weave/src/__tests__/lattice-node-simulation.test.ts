import { describe, expect, it } from 'vitest';
import { createLatticeNodeRegistry } from '../lattice-node.js';

function makeRegistry() {
  let now = 1_000_000;
  return createLatticeNodeRegistry({
    clock: { nowMicroseconds: () => (now += 1_000) },
  });
}

describe('lattice-node simulation', () => {
  it('forms resonant routes and improves compatibility with active beacons', () => {
    const registry = makeRegistry();
    registry.registerNode({
      nodeId: 'n-earth',
      worldId: 'earth',
      signature: { primary: 440n, harmonics: [880, 1320], fieldStrength: 0.8 },
      precisionRating: 'high',
    });
    registry.registerNode({
      nodeId: 'n-mars',
      worldId: 'mars',
      signature: { primary: 438n, harmonics: [876, 1320], fieldStrength: 0.75 },
      precisionRating: 'high',
    });

    const before = registry.calculateResonance('n-earth', 'n-mars');
    registry.deployBeacon('n-earth', 'b-earth');
    registry.deployBeacon('n-mars', 'b-mars');
    const after = registry.calculateResonance('n-earth', 'n-mars');

    const route = registry.registerRoute('n-earth', 'n-mars', 4.2);
    expect(route.distanceLY).toBe(4.2);
    expect(after).toBeGreaterThanOrEqual(before);
  });
});
