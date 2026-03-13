import { describe, expect, it } from 'vitest';
import { createLatticeCorridorEngine, type CorridorLockPort } from '../lattice-corridor.js';
import { createLatticeNodeRegistry } from '../lattice-node.js';

function makeLockPort(): CorridorLockPort {
  const status = new Map<string, string>();
  return {
    initiateLock: ({ lockId }) => {
      status.set(lockId, 'attuning');
    },
    updateCoherence: (lockId, coherence) => {
      if (!status.has(lockId)) return null;
      if (coherence >= 0.99) {
        status.set(lockId, 'transit_executing');
        return { to: 'transit_executing' };
      }
      return null;
    },
    completeLock: (lockId) => {
      status.set(lockId, 'completed');
    },
    abortLock: (lockId) => {
      status.set(lockId, 'aborted');
    },
    triggerPartialCollapse: (lockId) => {
      status.set(lockId, 'collapsed');
    },
  };
}

function makeEngine() {
  let i = 0;
  const clock = { nowMicroseconds: () => 1_000_000 };
  const nodeRegistry = createLatticeNodeRegistry({ clock });
  nodeRegistry.registerNode({
    nodeId: 'node-a',
    worldId: 'world-a',
    signature: { primary: 100n, harmonics: [1, 2, 3], fieldStrength: 0.9 },
    precisionRating: 'high',
  });
  nodeRegistry.registerNode({
    nodeId: 'node-b',
    worldId: 'world-b',
    signature: { primary: 100n, harmonics: [2, 3, 4], fieldStrength: 0.8 },
    precisionRating: 'high',
  });
  nodeRegistry.deployBeacon('node-a', 'beacon-a');
  nodeRegistry.deployBeacon('node-b', 'beacon-b');
  nodeRegistry.registerRoute('node-a', 'node-b', 3.2);

  return createLatticeCorridorEngine({
    nodePort: nodeRegistry,
    lockPort: makeLockPort(),
    idGenerator: { next: () => `lock-${++i}` },
    clock,
  });
}

describe('lattice-corridor simulation', () => {
  it('runs corridor lifecycle from route validation to arrival', () => {
    const engine = makeEngine();
    engine.openCorridor({
      corridorId: 'corr-1',
      entityId: 'entity-1',
      originNodeId: 'node-a',
      destinationNodeId: 'node-b',
    });
    engine.initiateLock('corr-1', 1.0);

    const transition = engine.advanceCoherence('corr-1', 0.99);
    expect(transition?.to).toBe('transit_active');

    const done = engine.completeTransit('corr-1');
    expect(done.to).toBe('arrived');
    expect(engine.getCorridor('corr-1').completedAt).not.toBeNull();
    expect(engine.countActive()).toBe(0);
  });
});
