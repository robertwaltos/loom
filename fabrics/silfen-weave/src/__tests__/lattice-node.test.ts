import { describe, it, expect } from 'vitest';
import { createLatticeNodeRegistry } from '../lattice-node.js';
import type { LatticeNodeRegistry, RegisterNodeParams } from '../lattice-node.js';

const US_PER_HOUR = 60 * 60 * 1_000_000;

function createTestClock(initialHours = 0) {
  let time = initialHours * US_PER_HOUR;
  return {
    nowMicroseconds: () => time,
    advanceHours(hours: number) { time += hours * US_PER_HOUR; },
  };
}

function createTestRegistry(initialHours = 0) {
  const clock = createTestClock(initialHours);
  const registry = createLatticeNodeRegistry({ clock });
  return { registry, clock };
}

function earthNode(): RegisterNodeParams {
  return {
    nodeId: 'node-earth',
    worldId: 'world-earth',
    signature: { primary: 440n, harmonics: [880, 1320, 1760], fieldStrength: 0.95 },
    precisionRating: 'high',
  };
}

function marsNode(): RegisterNodeParams {
  return {
    nodeId: 'node-mars',
    worldId: 'world-mars',
    signature: { primary: 432n, harmonics: [864, 1320, 1728], fieldStrength: 0.80 },
    precisionRating: 'moderate',
  };
}

function registerBothNodes(registry: LatticeNodeRegistry) {
  registry.registerNode(earthNode());
  registry.registerNode(marsNode());
}

// ─── Node Registration ─────────────────────────────────────────────

describe('LatticeNode registration', () => {
  it('registers a node with signature', () => {
    const { registry } = createTestRegistry();
    const node = registry.registerNode(earthNode());
    expect(node.nodeId).toBe('node-earth');
    expect(node.worldId).toBe('world-earth');
    expect(node.signature.primary).toBe(440n);
    expect(node.precisionRating).toBe('high');
    expect(node.beacon).toBeNull();
  });

  it('defaults precision to unknown', () => {
    const { registry } = createTestRegistry();
    const node = registry.registerNode({
      nodeId: 'node-1', worldId: 'w-1',
      signature: { primary: 100n, harmonics: [], fieldStrength: 0.5 },
    });
    expect(node.precisionRating).toBe('unknown');
  });

  it('rejects duplicate node id', () => {
    const { registry } = createTestRegistry();
    registry.registerNode(earthNode());
    expect(() => registry.registerNode(earthNode())).toThrow('already exists');
  });

  it('counts nodes', () => {
    const { registry } = createTestRegistry();
    expect(registry.count()).toBe(0);
    registerBothNodes(registry);
    expect(registry.count()).toBe(2);
  });
});

// ─── Node Retrieval ─────────────────────────────────────────────────

describe('LatticeNode retrieval', () => {
  it('gets node by id', () => {
    const { registry } = createTestRegistry();
    registry.registerNode(earthNode());
    expect(registry.getNode('node-earth').worldId).toBe('world-earth');
  });

  it('throws for missing node', () => {
    const { registry } = createTestRegistry();
    expect(() => registry.getNode('nope')).toThrow('not found');
  });

  it('tryGet returns undefined for missing', () => {
    const { registry } = createTestRegistry();
    expect(registry.tryGetNode('nope')).toBeUndefined();
  });

  it('lists all nodes', () => {
    const { registry } = createTestRegistry();
    registerBothNodes(registry);
    expect(registry.listNodes()).toHaveLength(2);
  });
});

// ─── Beacon Deployment ──────────────────────────────────────────────

describe('LatticeNode beacons', () => {
  it('deploys beacon on node', () => {
    const { registry } = createTestRegistry();
    registry.registerNode(earthNode());
    const beacon = registry.deployBeacon('node-earth', 'beacon-1');
    expect(beacon.status).toBe('active');
    expect(beacon.nodeId).toBe('node-earth');
  });

  it('beacon appears on node after deployment', () => {
    const { registry } = createTestRegistry();
    registry.registerNode(earthNode());
    registry.deployBeacon('node-earth', 'beacon-1');
    const node = registry.getNode('node-earth');
    expect(node.beacon?.beaconId).toBe('beacon-1');
  });

  it('throws when deploying beacon on missing node', () => {
    const { registry } = createTestRegistry();
    expect(() => registry.deployBeacon('nope', 'b-1')).toThrow('not found');
  });
});

// ─── Beacon Status Transitions ──────────────────────────────────────

describe('LatticeNode beacon status', () => {
  it('degrades beacon status', () => {
    const { registry } = createTestRegistry();
    registry.registerNode(earthNode());
    registry.deployBeacon('node-earth', 'beacon-1');
    const beacon = registry.setBeaconStatus('node-earth', 'degraded');
    expect(beacon.status).toBe('degraded');
  });

  it('allows forward transitions only', () => {
    const { registry } = createTestRegistry();
    registry.registerNode(earthNode());
    registry.deployBeacon('node-earth', 'beacon-1');
    registry.setBeaconStatus('node-earth', 'compromised');
    expect(() => registry.setBeaconStatus('node-earth', 'active'))
      .toThrow('cannot transition');
  });

  it('rejects status change with no beacon', () => {
    const { registry } = createTestRegistry();
    registry.registerNode(earthNode());
    expect(() => registry.setBeaconStatus('node-earth', 'degraded'))
      .toThrow('no beacon deployed');
  });
});

// ─── Precision Rating ───────────────────────────────────────────────

describe('LatticeNode precision', () => {
  it('updates precision rating', () => {
    const { registry } = createTestRegistry();
    registry.registerNode(earthNode());
    const node = registry.setPrecisionRating('node-earth', 'exact');
    expect(node.precisionRating).toBe('exact');
  });
});

// ─── Route Registration ─────────────────────────────────────────────

describe('LatticeNode routes', () => {
  it('registers route between nodes', () => {
    const { registry } = createTestRegistry();
    registerBothNodes(registry);
    const route = registry.registerRoute('node-earth', 'node-mars', 0.0001);
    expect(route.distanceLY).toBe(0.0001);
    expect(route.resonanceCompatibility).toBeGreaterThan(0);
  });

  it('retrieves registered route', () => {
    const { registry } = createTestRegistry();
    registerBothNodes(registry);
    registry.registerRoute('node-earth', 'node-mars', 4.2);
    const route = registry.getRoute('node-earth', 'node-mars');
    expect(route?.distanceLY).toBe(4.2);
  });

  it('returns undefined for unregistered route', () => {
    const { registry } = createTestRegistry();
    registerBothNodes(registry);
    expect(registry.getRoute('node-earth', 'node-mars')).toBeUndefined();
  });

  it('throws when registering route to missing node', () => {
    const { registry } = createTestRegistry();
    registry.registerNode(earthNode());
    expect(() => registry.registerRoute('node-earth', 'nope', 1.0)).toThrow('not found');
  });
});

// ─── Resonance Calculation ──────────────────────────────────────────

describe('LatticeNode resonance', () => {
  it('calculates resonance between nodes', () => {
    const { registry } = createTestRegistry();
    registerBothNodes(registry);
    const resonance = registry.calculateResonance('node-earth', 'node-mars');
    expect(resonance).toBeGreaterThan(0);
    expect(resonance).toBeLessThanOrEqual(1);
  });

  it('resonance increases with beacon deployment', () => {
    const { registry } = createTestRegistry();
    registerBothNodes(registry);
    const before = registry.calculateResonance('node-earth', 'node-mars');
    registry.deployBeacon('node-earth', 'beacon-1');
    registry.deployBeacon('node-mars', 'beacon-2');
    const after = registry.calculateResonance('node-earth', 'node-mars');
    expect(after).toBeGreaterThan(before);
  });

  it('resonance is zero with empty harmonics', () => {
    const { registry } = createTestRegistry();
    registry.registerNode({
      nodeId: 'n-1', worldId: 'w-1',
      signature: { primary: 100n, harmonics: [], fieldStrength: 0.9 },
    });
    registry.registerNode({
      nodeId: 'n-2', worldId: 'w-2',
      signature: { primary: 200n, harmonics: [], fieldStrength: 0.9 },
    });
    expect(registry.calculateResonance('n-1', 'n-2')).toBe(0);
  });
});
