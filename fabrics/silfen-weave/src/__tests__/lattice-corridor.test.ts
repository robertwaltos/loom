import { describe, it, expect } from 'vitest';
import { createLatticeCorridorEngine } from '../lattice-corridor.js';
import { createFrequencyLockEngine } from '../frequency-lock.js';
import { createLatticeNodeRegistry } from '../lattice-node.js';
import type {
  LatticeCorridorEngine,
  LatticeCorridorDeps,
  OpenCorridorParams,
} from '../lattice-corridor.js';

// ─── Test Helpers ───────────────────────────────────────────────────

let idCounter = 0;

function createTestDeps(): LatticeCorridorDeps & {
  lockEngine: ReturnType<typeof createFrequencyLockEngine>;
  nodeRegistry: ReturnType<typeof createLatticeNodeRegistry>;
} {
  idCounter = 0;
  const clock = { nowMicroseconds: () => 1_000_000 };
  const lockEngine = createFrequencyLockEngine({ clock });
  const nodeRegistry = createLatticeNodeRegistry({ clock });
  return {
    nodePort: nodeRegistry,
    lockPort: lockEngine,
    idGenerator: {
      next() {
        idCounter += 1;
        return 'lock-' + String(idCounter);
      },
    },
    clock,
    lockEngine,
    nodeRegistry,
  };
}

function setupRoute(deps: ReturnType<typeof createTestDeps>): void {
  const sig = { primary: 100n, harmonics: [1, 2, 3], fieldStrength: 0.9 };
  deps.nodeRegistry.registerNode({
    nodeId: 'node-earth',
    worldId: 'earth',
    signature: sig,
    precisionRating: 'high',
  });
  deps.nodeRegistry.registerNode({
    nodeId: 'node-mars',
    worldId: 'mars',
    signature: { primary: 100n, harmonics: [2, 3, 4], fieldStrength: 0.8 },
    precisionRating: 'high',
  });
  deps.nodeRegistry.deployBeacon('node-earth', 'beacon-e');
  deps.nodeRegistry.deployBeacon('node-mars', 'beacon-m');
  deps.nodeRegistry.registerRoute('node-earth', 'node-mars', 4.2);
}

function createTestEngine(): {
  engine: LatticeCorridorEngine;
  deps: ReturnType<typeof createTestDeps>;
} {
  const deps = createTestDeps();
  setupRoute(deps);
  const engine = createLatticeCorridorEngine(deps);
  return { engine, deps };
}

function defaultParams(overrides?: Partial<OpenCorridorParams>): OpenCorridorParams {
  return {
    corridorId: 'corr-1',
    entityId: 'entity-1',
    originNodeId: 'node-earth',
    destinationNodeId: 'node-mars',
    ...overrides,
  };
}

// ─── Open Corridor ──────────────────────────────────────────────────

describe('Lattice corridor opening', () => {
  it('opens a corridor with route_validated phase', () => {
    const { engine } = createTestEngine();
    const corridor = engine.openCorridor(defaultParams());
    expect(corridor.phase).toBe('route_validated');
    expect(corridor.corridorId).toBe('corr-1');
    expect(corridor.entityId).toBe('entity-1');
    expect(corridor.originNodeId).toBe('node-earth');
    expect(corridor.destinationNodeId).toBe('node-mars');
  });

  it('attaches route information', () => {
    const { engine } = createTestEngine();
    const corridor = engine.openCorridor(defaultParams());
    expect(corridor.route.distanceLY).toBe(4.2);
    expect(corridor.route.originId).toBe('node-earth');
    expect(corridor.route.destinationId).toBe('node-mars');
  });

  it('rejects duplicate corridor ID', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    expect(() => engine.openCorridor(defaultParams())).toThrow('already exists');
  });

  it('rejects when no route exists', () => {
    const { engine } = createTestEngine();
    expect(() => engine.openCorridor(defaultParams({
      originNodeId: 'node-earth',
      destinationNodeId: 'node-venus',
    }))).toThrow('No registered route');
  });

  it('rejects when entity already has active transit', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams({ corridorId: 'corr-1', entityId: 'entity-1' }));
    expect(() => engine.openCorridor(defaultParams({
      corridorId: 'corr-2',
      entityId: 'entity-1',
    }))).toThrow('already has an active');
  });
});

// ─── Lock Initiation ────────────────────────────────────────────────

describe('Lattice corridor lock initiation', () => {
  it('transitions to lock_initiated phase', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    const locked = engine.initiateLock('corr-1', 1.0);
    expect(locked.phase).toBe('lock_initiated');
    expect(locked.lockId).toBe('lock-1');
  });

  it('rejects lock initiation from wrong phase', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    expect(() => engine.initiateLock('corr-1', 1.0)).toThrow('expected route_validated');
  });
});

// ─── Coherence Advancement ──────────────────────────────────────────

describe('Lattice corridor coherence advancement', () => {
  it('returns null when coherence does not trigger phase change', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    const transition = engine.advanceCoherence('corr-1', 0.5);
    expect(transition).toBeNull();
  });

  it('transitions to transit_active when coherence reaches transit threshold', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    engine.advanceCoherence('corr-1', 0.95);
    const transition = engine.advanceCoherence('corr-1', 0.999);
    expect(transition).not.toBeNull();
    expect(transition?.to).toBe('transit_active');
    expect(transition?.from).toBe('lock_initiated');
  });

  it('corridor phase reflects transit_active after threshold', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    engine.advanceCoherence('corr-1', 0.999);
    const corridor = engine.getCorridor('corr-1');
    expect(corridor.phase).toBe('transit_active');
  });
});

// ─── Complete Transit ───────────────────────────────────────────────

describe('Lattice corridor transit completion', () => {
  it('transitions to arrived phase', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    engine.advanceCoherence('corr-1', 0.999);
    const transition = engine.completeTransit('corr-1');
    expect(transition.to).toBe('arrived');
    expect(transition.from).toBe('transit_active');
  });

  it('sets completedAt on arrival', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    engine.advanceCoherence('corr-1', 0.999);
    engine.completeTransit('corr-1');
    const corridor = engine.getCorridor('corr-1');
    expect(corridor.completedAt).not.toBeNull();
  });

  it('rejects completion from non-transit phase', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    expect(() => engine.completeTransit('corr-1')).toThrow('expected transit_active');
  });

  it('allows new corridor for entity after arrival', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    engine.advanceCoherence('corr-1', 0.999);
    engine.completeTransit('corr-1');
    // Entity should now be free for new transit
    const corr2 = engine.openCorridor(defaultParams({ corridorId: 'corr-2' }));
    expect(corr2.phase).toBe('route_validated');
  });
});

// ─── Abort Corridor ─────────────────────────────────────────────────

describe('Lattice corridor abort', () => {
  it('aborts from route_validated', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    const transition = engine.abortCorridor('corr-1', 'player cancelled');
    expect(transition.to).toBe('aborted');
    expect(engine.getCorridor('corr-1').failureReason).toBe('player cancelled');
  });

  it('aborts from lock_initiated', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    const transition = engine.abortCorridor('corr-1', 'signal lost');
    expect(transition.to).toBe('aborted');
  });

  it('rejects abort from transit_active', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    engine.advanceCoherence('corr-1', 0.999);
    expect(() => engine.abortCorridor('corr-1', 'too late')).toThrow();
  });
});

// ─── Collapse Corridor ──────────────────────────────────────────────

describe('Lattice corridor collapse', () => {
  it('collapses from transit_active', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    engine.advanceCoherence('corr-1', 0.999);
    const transition = engine.collapseCorridor('corr-1', 'field disruption');
    expect(transition.to).toBe('collapsed');
    expect(engine.getCorridor('corr-1').failureReason).toBe('field disruption');
  });

  it('rejects collapse from lock_initiated', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    expect(() => engine.collapseCorridor('corr-1', 'too early')).toThrow('expected transit_active');
  });
});

// ─── Queries ────────────────────────────────────────────────────────

describe('Lattice corridor queries', () => {
  it('getCorridor throws for unknown ID', () => {
    const { engine } = createTestEngine();
    expect(() => engine.getCorridor('nope')).toThrow('not found');
  });

  it('tryGetCorridor returns undefined for unknown ID', () => {
    const { engine } = createTestEngine();
    expect(engine.tryGetCorridor('nope')).toBeUndefined();
  });

  it('getActiveByEntity finds active corridor', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    const active = engine.getActiveByEntity('entity-1');
    expect(active).not.toBeUndefined();
    expect(active?.corridorId).toBe('corr-1');
  });

  it('getActiveByEntity returns undefined after completion', () => {
    const { engine } = createTestEngine();
    engine.openCorridor(defaultParams());
    engine.initiateLock('corr-1', 1.0);
    engine.advanceCoherence('corr-1', 0.999);
    engine.completeTransit('corr-1');
    expect(engine.getActiveByEntity('entity-1')).toBeUndefined();
  });

  it('countActive tracks active corridors', () => {
    const { engine } = createTestEngine();
    expect(engine.countActive()).toBe(0);
    engine.openCorridor(defaultParams());
    expect(engine.countActive()).toBe(1);
    engine.initiateLock('corr-1', 1.0);
    engine.advanceCoherence('corr-1', 0.999);
    engine.completeTransit('corr-1');
    expect(engine.countActive()).toBe(0);
  });
});

// ─── Full Transit Lifecycle ─────────────────────────────────────────

describe('Lattice corridor full lifecycle', () => {
  it('completes full transit from open to arrived', () => {
    const { engine } = createTestEngine();
    const opened = engine.openCorridor(defaultParams());
    expect(opened.phase).toBe('route_validated');

    const locked = engine.initiateLock('corr-1', 1.0);
    expect(locked.phase).toBe('lock_initiated');

    engine.advanceCoherence('corr-1', 0.5);
    engine.advanceCoherence('corr-1', 0.8);
    engine.advanceCoherence('corr-1', 0.96);
    const transitTransition = engine.advanceCoherence('corr-1', 0.999);
    expect(transitTransition?.to).toBe('transit_active');

    const arrived = engine.completeTransit('corr-1');
    expect(arrived.to).toBe('arrived');

    const final = engine.getCorridor('corr-1');
    expect(final.phase).toBe('arrived');
    expect(final.completedAt).not.toBeNull();
    expect(final.failureReason).toBeNull();
  });
});
