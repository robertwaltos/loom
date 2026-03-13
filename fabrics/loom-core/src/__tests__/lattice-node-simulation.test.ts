import { describe, it, expect, vi } from 'vitest';
import {
  createLatticeNodeService,
  BASE_LOCK_MS,
  CRITICAL_PRECISION_THRESHOLD,
  DISTANCE_PENALTY_PER_LY,
  FIELD_MULTIPLIER_MIN,
  FIELD_MULTIPLIER_MAX,
} from '../lattice-node.js';

// ─── helpers ───────────────────────────────────────────────────────────────

let idSeq = 0;

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    clock: { nowMs: vi.fn(() => 1_700_000_000_000) },
    idGenerator: { next: vi.fn(() => `id-${++idSeq}`) },
    ...overrides,
  };
}

function makeFrequency() {
  return {
    primary: BigInt('0xDEADBEEFCAFEBABEDEADBEEFCAFEBABEDEADBEEFCAFEBABEDEADBEEFCAFEBABE'),
    harmonics: [0.1, 0.2, -0.1, 0.5, -0.3, 0.0, 0.4],
    fieldStrength: 0.95,
  };
}

function registerTestNode(
  svc: ReturnType<typeof createLatticeNodeService>,
  worldId = 'cloud-kingdom',
  precision = 1.0,
) {
  return svc.registerNode({
    worldId,
    frequency: makeFrequency(),
    deployedYear: 2200,
    initialPrecision: precision,
  });
}

// ─── exported constants ────────────────────────────────────────────────────

describe('LatticeNode — exported constants', () => {
  it('BASE_LOCK_MS is 180_000', () => {
    expect(BASE_LOCK_MS).toBe(180_000);
  });

  it('CRITICAL_PRECISION_THRESHOLD is 0.73', () => {
    expect(CRITICAL_PRECISION_THRESHOLD).toBe(0.73);
  });

  it('DISTANCE_PENALTY_PER_LY is 0.15', () => {
    expect(DISTANCE_PENALTY_PER_LY).toBe(0.15);
  });

  it('FIELD_MULTIPLIER_MIN is 0.8', () => {
    expect(FIELD_MULTIPLIER_MIN).toBe(0.8);
  });

  it('FIELD_MULTIPLIER_MAX is 2.4', () => {
    expect(FIELD_MULTIPLIER_MAX).toBe(2.4);
  });
});

// ─── registerNode ──────────────────────────────────────────────────────────

describe('LatticeNode — registerNode', () => {
  it('creates a node with the correct worldId', () => {
    const svc = createLatticeNodeService(makeDeps());
    const result = registerTestNode(svc, 'number-garden');
    expect(typeof result).toBe('object');
    const node = result as Record<string, unknown>;
    expect(node['worldId']).toBe('number-garden');
  });

  it('fresh node has ACTIVE beaconStatus', () => {
    const svc = createLatticeNodeService(makeDeps());
    const node = registerTestNode(svc) as Record<string, unknown>;
    expect(node['beaconStatus']).toBe('ACTIVE');
  });

  it('node registered at low precision has degraded beacon', () => {
    const svc = createLatticeNodeService(makeDeps());
    const node = registerTestNode(svc, 'cloud-kingdom', 0.5) as Record<string, unknown>;
    expect(node['beaconStatus']).toBe('COMPROMISED');
  });

  it('returns error string when registering duplicate nodeId', () => {
    const svc = createLatticeNodeService(makeDeps());
    const first = registerTestNode(svc) as Record<string, unknown>;
    const nodeId = first['nodeId'] as string;
    const second = svc.registerNode({
      nodeId,
      worldId: 'cloud-kingdom',
      frequency: makeFrequency(),
      deployedYear: 2200,
    });
    expect(typeof second).toBe('string');
  });
});

// ─── getNode / getWorldNodes ───────────────────────────────────────────────

describe('LatticeNode — getNode / getWorldNodes', () => {
  it('getNode returns registered node by id', () => {
    const svc = createLatticeNodeService(makeDeps());
    const node = registerTestNode(svc, 'tideline-bay') as Record<string, unknown>;
    const fetched = svc.getNode(node['nodeId'] as string);
    expect(fetched).toBeDefined();
  });

  it('getNode returns undefined for unknown id', () => {
    const svc = createLatticeNodeService(makeDeps());
    expect(svc.getNode('ghost-node')).toBeUndefined();
  });

  it('getWorldNodes returns all nodes for a world', () => {
    const svc = createLatticeNodeService(makeDeps());
    registerTestNode(svc, 'savanna-workshop');
    registerTestNode(svc, 'savanna-workshop');
    registerTestNode(svc, 'circuit-marsh');
    expect(svc.getWorldNodes('savanna-workshop')).toHaveLength(2);
    expect(svc.getWorldNodes('circuit-marsh')).toHaveLength(1);
  });
});

// ─── computeLockDuration ──────────────────────────────────────────────────

describe('LatticeNode — computeLockDuration', () => {
  it('zero-distance lock equals BASE_LOCK_MS × multiplier', () => {
    const svc = createLatticeNodeService(makeDeps());
    const result = svc.computeLockDuration({ distanceLY: 0 });
    expect(result.durationMs).toBe(Math.round(BASE_LOCK_MS * 1.0));
  });

  it('lock duration increases with distance', () => {
    const svc = createLatticeNodeService(makeDeps());
    const near = svc.computeLockDuration({ distanceLY: 10 });
    const far = svc.computeLockDuration({ distanceLY: 50 });
    expect(far.durationMs).toBeGreaterThan(near.durationMs);
  });

  it('respects the bible formula: BASE × (1 + dist × 0.15) × multiplier', () => {
    const svc = createLatticeNodeService(makeDeps());
    const result = svc.computeLockDuration({ distanceLY: 20, fieldConditionMultiplier: 1.0 });
    const expected = Math.round(BASE_LOCK_MS * (1 + 20 * DISTANCE_PENALTY_PER_LY) * 1.0);
    expect(result.durationMs).toBe(expected);
  });

  it('clamps multiplier below FIELD_MULTIPLIER_MIN', () => {
    const svc = createLatticeNodeService(makeDeps());
    const result = svc.computeLockDuration({ distanceLY: 0, fieldConditionMultiplier: 0.1 });
    const expected = Math.round(BASE_LOCK_MS * FIELD_MULTIPLIER_MIN);
    expect(result.durationMs).toBe(expected);
  });

  it('clamps multiplier above FIELD_MULTIPLIER_MAX', () => {
    const svc = createLatticeNodeService(makeDeps());
    const result = svc.computeLockDuration({ distanceLY: 0, fieldConditionMultiplier: 10.0 });
    const expected = Math.round(BASE_LOCK_MS * FIELD_MULTIPLIER_MAX);
    expect(result.durationMs).toBe(expected);
  });
});

// ─── enqueueLock ──────────────────────────────────────────────────────────

describe('LatticeNode — enqueueLock', () => {
  it('creates a lock request between two healthy nodes', () => {
    const svc = createLatticeNodeService(makeDeps());
    const origin = registerTestNode(svc, 'world-a') as Record<string, unknown>;
    const target = registerTestNode(svc, 'world-b') as Record<string, unknown>;
    const result = svc.enqueueLock({
      entityId: 'entity-1' as import('@loom/entities-contracts').EntityId,
      originNodeId: origin['nodeId'] as string,
      targetNodeId: target['nodeId'] as string,
      distanceLY: 10,
    });
    expect(typeof result).toBe('object');
    const req = result as Record<string, unknown>;
    expect(req['status']).toBe('SYNCHRONISING');
  });

  it('lock is CRITICAL_THRESHOLD when coherence is below threshold', () => {
    const svc = createLatticeNodeService(makeDeps());
    const origin = registerTestNode(svc, 'world-c', 0.60) as Record<string, unknown>;
    const target = registerTestNode(svc, 'world-d') as Record<string, unknown>;
    const result = svc.enqueueLock({
      entityId: 'entity-2' as import('@loom/entities-contracts').EntityId,
      originNodeId: origin['nodeId'] as string,
      targetNodeId: target['nodeId'] as string,
      distanceLY: 5,
    }) as Record<string, unknown>;
    expect(result['status']).toBe('CRITICAL_THRESHOLD');
  });

  it('returns error for unknown origin node', () => {
    const svc = createLatticeNodeService(makeDeps());
    registerTestNode(svc, 'world-e');
    const target = registerTestNode(svc, 'world-f') as Record<string, unknown>;
    const result = svc.enqueueLock({
      entityId: 'e3' as import('@loom/entities-contracts').EntityId,
      originNodeId: 'nonexistent',
      targetNodeId: target['nodeId'] as string,
      distanceLY: 5,
    });
    expect(typeof result).toBe('string');
  });
});

// ─── applyCompromise / restoreBeacon ─────────────────────────────────────

describe('LatticeNode — applyCompromise / restoreBeacon', () => {
  it('POWER_SABOTAGE degrades precision the most', () => {
    const svc = createLatticeNodeService(makeDeps());
    const baseline = registerTestNode(svc, 'world-g') as Record<string, unknown>;
    const after = svc.applyCompromise(baseline['nodeId'] as string, 'POWER_SABOTAGE') as Record<string, unknown>;
    expect(after['precisionRating'] as number).toBeLessThan(1.0);
    expect(after['beaconStatus']).not.toBe('ACTIVE');
  });

  it('SIGNAL_DEGRADATION causes minimal precision loss', () => {
    const svcA = createLatticeNodeService(makeDeps());
    const svcB = createLatticeNodeService(makeDeps());
    const nodeA = registerTestNode(svcA, 'world-h') as Record<string, unknown>;
    const nodeB = registerTestNode(svcB, 'world-i') as Record<string, unknown>;
    const afterSig = svcA.applyCompromise(nodeA['nodeId'] as string, 'SIGNAL_DEGRADATION') as Record<string, unknown>;
    const afterPow = svcB.applyCompromise(nodeB['nodeId'] as string, 'POWER_SABOTAGE') as Record<string, unknown>;
    expect(afterSig['precisionRating'] as number).toBeGreaterThan(afterPow['precisionRating'] as number);
  });

  it('restoreBeacon raises precision back up', () => {
    const svc = createLatticeNodeService(makeDeps());
    const node = registerTestNode(svc, 'world-j') as Record<string, unknown>;
    svc.applyCompromise(node['nodeId'] as string, 'POWER_SABOTAGE');
    const restored = svc.restoreBeacon(node['nodeId'] as string, 0.95) as Record<string, unknown>;
    expect(restored['precisionRating']).toBe(0.95);
    expect(restored['beaconStatus']).toBe('ACTIVE');
  });

  it('returns error when attempting to restore destroyed beacon', () => {
    const svc = createLatticeNodeService(makeDeps());
    const node = registerTestNode(svc, 'world-k', 0.0) as Record<string, unknown>;
    const result = svc.restoreBeacon(node['nodeId'] as string, 0.95);
    expect(typeof result).toBe('string');
  });
});

// ─── getNetworkStats ──────────────────────────────────────────────────────

describe('LatticeNode — getNetworkStats', () => {
  it('starts with zero stats on empty service', () => {
    const svc = createLatticeNodeService(makeDeps());
    const stats = svc.getNetworkStats();
    expect(stats.totalNodes).toBe(0);
    expect(stats.activeLocks).toBe(0);
    expect(stats.totalTransitsCompleted).toBe(0);
  });

  it('counts registered nodes correctly', () => {
    const svc = createLatticeNodeService(makeDeps());
    registerTestNode(svc, 'world-l');
    registerTestNode(svc, 'world-m');
    expect(svc.getNetworkStats().totalNodes).toBe(2);
    expect(svc.getNetworkStats().activeNodes).toBe(2);
  });
});
