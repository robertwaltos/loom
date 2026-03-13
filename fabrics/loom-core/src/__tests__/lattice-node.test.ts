/**
 * lattice-node.test.ts — Unit tests for the Lattice frequency-synchronisation system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLatticeNodeService,
  BASE_LOCK_MS,
  CRITICAL_PRECISION_THRESHOLD,
  type LatticeNodeService,
  type FrequencySignature,
  type LatticeChronicleEntry,
} from '../lattice-node.js';

// ── Test Helpers ──────────────────────────────────────────────────────────

class TestClock {
  private ms = 1_000_000;
  nowMs(): number { return this.ms; }
  advance(ms: number): void { this.ms += ms; }
}

class TestIdGen {
  private n = 0;
  next(): string { return `id-${++this.n}`; }
}

const TEST_FREQ: FrequencySignature = {
  primary: 1922831007381168781260n,
  harmonics: [0.1, 0.3, -0.2, 0.5, -0.1, 0.4, 0.0],
  fieldStrength: 0.95,
};

const TEST_FREQ_2: FrequencySignature = {
  primary: 16045690985420288051n,
  harmonics: [0.2, -0.1, 0.4, 0.0, 0.3, -0.3, 0.1],
  fieldStrength: 0.88,
};

function makeDeps(chronicle?: { emit: (e: LatticeChronicleEntry) => void }) {
  return {
    clock: new TestClock(),
    idGenerator: new TestIdGen(),
    chronicle,
  };
}

// ── registerNode ──────────────────────────────────────────────────────────

describe('LatticeNodeService — registerNode', () => {
  it('creates a node with ACTIVE beacon at full precision', () => {
    const svc = createLatticeNodeService(makeDeps());
    const result = svc.registerNode({
      worldId: 'world-001',
      frequency: TEST_FREQ,
      deployedYear: 12,
    });
    expect(typeof result).toBe('object');
    if (typeof result === 'string') throw new Error(result);
    expect(result.beaconStatus).toBe('ACTIVE');
    expect(result.precisionRating).toBe(1.0);
    expect(result.worldId).toBe('world-001');
  });

  it('uses provided nodeId when given', () => {
    const svc = createLatticeNodeService(makeDeps());
    const node = svc.registerNode({
      nodeId: 'node-alpha',
      worldId: 'world-002',
      frequency: TEST_FREQ,
      deployedYear: 5,
    });
    if (typeof node === 'string') throw new Error(node);
    expect(node.nodeId).toBe('node-alpha');
  });

  it('rejects duplicate nodeId', () => {
    const svc = createLatticeNodeService(makeDeps());
    svc.registerNode({ nodeId: 'dup', worldId: 'w', frequency: TEST_FREQ, deployedYear: 1 });
    const result = svc.registerNode({ nodeId: 'dup', worldId: 'w', frequency: TEST_FREQ, deployedYear: 1 });
    expect(typeof result).toBe('string');
  });

  it('sets DEGRADED status for precision in [0.73, 0.90)', () => {
    const svc = createLatticeNodeService(makeDeps());
    const node = svc.registerNode({
      worldId: 'world-003',
      frequency: TEST_FREQ,
      deployedYear: 10,
      initialPrecision: 0.80,
    });
    if (typeof node === 'string') throw new Error(node);
    expect(node.beaconStatus).toBe('DEGRADED');
  });

  it('sets COMPROMISED status for precision below 0.73', () => {
    const svc = createLatticeNodeService(makeDeps());
    const node = svc.registerNode({
      worldId: 'world-004',
      frequency: TEST_FREQ,
      deployedYear: 7,
      initialPrecision: 0.5,
    });
    if (typeof node === 'string') throw new Error(node);
    expect(node.beaconStatus).toBe('COMPROMISED');
  });
});

// ── computeLockDuration ───────────────────────────────────────────────────

describe('LatticeNodeService — computeLockDuration', () => {
  it('returns BASE_LOCK_MS at zero distance, neutral multiplier', () => {
    const svc = createLatticeNodeService(makeDeps());
    const result = svc.computeLockDuration({ distanceLY: 0, fieldConditionMultiplier: 1.0 });
    expect(result.durationMs).toBe(BASE_LOCK_MS);
    expect(result.isAtRisk).toBe(false);
  });

  it('scales with distance — 10 LY adds 15% per LY', () => {
    const svc = createLatticeNodeService(makeDeps());
    const result = svc.computeLockDuration({ distanceLY: 10, fieldConditionMultiplier: 1.0 });
    // BASE_LOCK_MS * (1 + 10 * 0.15) = 180000 * 2.5 = 450000
    expect(result.durationMs).toBe(450_000);
  });

  it('clamps multiplier to [0.8, 2.4]', () => {
    const svc = createLatticeNodeService(makeDeps());
    const low = svc.computeLockDuration({ distanceLY: 0, fieldConditionMultiplier: 0.1 });
    const high = svc.computeLockDuration({ distanceLY: 0, fieldConditionMultiplier: 9.9 });
    expect(low.durationMs).toBe(Math.round(BASE_LOCK_MS * 0.8));
    expect(high.durationMs).toBe(Math.round(BASE_LOCK_MS * 2.4));
  });

  it('flags isAtRisk for very long distances', () => {
    const svc = createLatticeNodeService(makeDeps());
    const result = svc.computeLockDuration({ distanceLY: 60 });
    expect(result.isAtRisk).toBe(true);
  });
});

// ── enqueueLock ───────────────────────────────────────────────────────────

describe('LatticeNodeService — enqueueLock', () => {
  let svc: LatticeNodeService;
  let originId: string;
  let targetId: string;

  beforeEach(() => {
    svc = createLatticeNodeService(makeDeps());
    const origin = svc.registerNode({ worldId: 'world-A', frequency: TEST_FREQ, deployedYear: 1 });
    const target = svc.registerNode({ worldId: 'world-B', frequency: TEST_FREQ_2, deployedYear: 2 });
    if (typeof origin === 'string' || typeof target === 'string') throw new Error('setup failed');
    originId = origin.nodeId;
    targetId = target.nodeId;
  });

  it('enqueues a lock request and returns it', () => {
    const req = svc.enqueueLock({ entityId: 'entity-1' as never, originNodeId: originId, targetNodeId: targetId, distanceLY: 5 });
    expect(typeof req).toBe('object');
    if (typeof req === 'string') throw new Error(req);
    expect(req.status).toBe('SYNCHRONISING');
    expect(req.coherenceLevel).toBe(1.0);
  });

  it('sets CRITICAL_THRESHOLD when origin precision is below threshold', () => {
    const lowNode = svc.registerNode({ worldId: 'world-C', frequency: TEST_FREQ, deployedYear: 3, initialPrecision: 0.5 });
    if (typeof lowNode === 'string') throw new Error(lowNode);
    const req = svc.enqueueLock({ entityId: 'entity-2' as never, originNodeId: lowNode.nodeId, targetNodeId: targetId, distanceLY: 5 });
    if (typeof req === 'string') throw new Error(req);
    expect(req.status).toBe('CRITICAL_THRESHOLD');
  });

  it('rejects unknown origin node', () => {
    const result = svc.enqueueLock({ entityId: 'entity-3' as never, originNodeId: 'ghost', targetNodeId: targetId, distanceLY: 5 });
    expect(typeof result).toBe('string');
  });

  it('rejects lock when origin beacon is destroyed', () => {
    const badNode = svc.registerNode({ worldId: 'world-D', frequency: TEST_FREQ, deployedYear: 4, initialPrecision: 0 });
    if (typeof badNode === 'string') throw new Error(badNode);
    const result = svc.enqueueLock({ entityId: 'entity-4' as never, originNodeId: badNode.nodeId, targetNodeId: targetId, distanceLY: 5 });
    expect(typeof result).toBe('string');
  });
});

// ── advanceLock ───────────────────────────────────────────────────────────

describe('LatticeNodeService — advanceLock', () => {
  it('returns COMPLETE when elapsed exceeds estimated duration', () => {
    const clock = new TestClock();
    const svc = createLatticeNodeService({ clock, idGenerator: new TestIdGen() });
    const origin = svc.registerNode({ worldId: 'wA', frequency: TEST_FREQ, deployedYear: 1 });
    const target = svc.registerNode({ worldId: 'wB', frequency: TEST_FREQ_2, deployedYear: 1 });
    if (typeof origin === 'string' || typeof target === 'string') throw new Error('setup');

    const req = svc.enqueueLock({ entityId: 'e1' as never, originNodeId: origin.nodeId, targetNodeId: target.nodeId, distanceLY: 0 });
    if (typeof req === 'string') throw new Error(req);

    // Advance past BASE_LOCK_MS (180 000 ms)
    clock.advance(BASE_LOCK_MS + 1);
    const result = svc.advanceLock(req.requestId);
    expect(typeof result).toBe('object');
    if (typeof result === 'string') throw new Error(result);
    if (result.kind !== 'COMPLETE') throw new Error(`expected COMPLETE, got ${result.kind}`);
    expect(result.requestId).toBe(req.requestId);
  });

  it('returns PROGRESSING while partially elapsed', () => {
    const clock = new TestClock();
    const svc = createLatticeNodeService({ clock, idGenerator: new TestIdGen() });
    const origin = svc.registerNode({ worldId: 'wA', frequency: TEST_FREQ, deployedYear: 1 });
    const target = svc.registerNode({ worldId: 'wB', frequency: TEST_FREQ_2, deployedYear: 1 });
    if (typeof origin === 'string' || typeof target === 'string') throw new Error('setup');

    const req = svc.enqueueLock({ entityId: 'e1' as never, originNodeId: origin.nodeId, targetNodeId: target.nodeId, distanceLY: 0 });
    if (typeof req === 'string') throw new Error(req);

    clock.advance(BASE_LOCK_MS / 2);
    const result = svc.advanceLock(req.requestId);
    if (typeof result === 'string') throw new Error(result);
    expect(result.kind).toBe('PROGRESSING');
    if (result.kind === 'PROGRESSING') {
      expect(result.percentComplete).toBeGreaterThan(0);
      expect(result.percentComplete).toBeLessThan(100);
    }
  });

  it('emits Chronicle entry on PARTIAL_COLLAPSE from beacon destruction', () => {
    const entries: LatticeChronicleEntry[] = [];
    const clock = new TestClock();
    const svc = createLatticeNodeService({
      clock,
      idGenerator: new TestIdGen(),
      chronicle: { emit: (e) => entries.push(e) },
    });

    const origin = svc.registerNode({ worldId: 'wA', frequency: TEST_FREQ, deployedYear: 1 });
    const target = svc.registerNode({ worldId: 'wB', frequency: TEST_FREQ_2, deployedYear: 1 });
    if (typeof origin === 'string' || typeof target === 'string') throw new Error('setup');

    const req = svc.enqueueLock({ entityId: 'traveller' as never, originNodeId: origin.nodeId, targetNodeId: target.nodeId, distanceLY: 5 });
    if (typeof req === 'string') throw new Error(req);

    // Destroy the origin beacon mid-transit.
    svc.applyCompromise(origin.nodeId, 'POWER_SABOTAGE');
    svc.applyCompromise(origin.nodeId, 'POWER_SABOTAGE');
    svc.applyCompromise(origin.nodeId, 'POWER_SABOTAGE');

    const result = svc.advanceLock(req.requestId);
    if (typeof result === 'string') throw new Error(result);

    // After collapse there must be a Chronicle entry.
    const collapseEntries = entries.filter(e => e.entryType === 'LATTICE_PARTIAL_COLLAPSE');
    expect(collapseEntries.length).toBeGreaterThan(0);
  });

  it('returns error for unknown requestId', () => {
    const svc = createLatticeNodeService(makeDeps());
    const result = svc.advanceLock('ghost-request');
    expect(typeof result).toBe('string');
  });
});

// ── applyCompromise ───────────────────────────────────────────────────────

describe('LatticeNodeService — applyCompromise', () => {
  it('degrades precision and updates beacon status', () => {
    const svc = createLatticeNodeService(makeDeps());
    const node = svc.registerNode({ worldId: 'w', frequency: TEST_FREQ, deployedYear: 1 });
    if (typeof node === 'string') throw new Error(node);

    const result = svc.applyCompromise(node.nodeId, 'SIGNAL_DEGRADATION');
    if (typeof result === 'string') throw new Error(result);
    expect(result.precisionRating).toBeLessThan(1.0);
  });

  it('POWER_SABOTAGE causes greatest degradation', () => {
    const svc = createLatticeNodeService(makeDeps());
    const a = svc.registerNode({ worldId: 'w', frequency: TEST_FREQ, deployedYear: 1 });
    const b = svc.registerNode({ worldId: 'w', frequency: TEST_FREQ_2, deployedYear: 1 });
    if (typeof a === 'string' || typeof b === 'string') throw new Error('setup');

    svc.applyCompromise(a.nodeId, 'POWER_SABOTAGE');
    svc.applyCompromise(b.nodeId, 'SIGNAL_DEGRADATION');
    expect(a.precisionRating).toBeLessThan(b.precisionRating as number);
  });

  it('returns error for unknown nodeId', () => {
    const svc = createLatticeNodeService(makeDeps());
    const result = svc.applyCompromise('ghost', 'FREQUENCY_SPOOFING');
    expect(typeof result).toBe('string');
  });
});

// ── getNetworkStats ───────────────────────────────────────────────────────

describe('LatticeNodeService — getNetworkStats', () => {
  it('tracks total and state-bucketed node counts', () => {
    const svc = createLatticeNodeService(makeDeps());
    svc.registerNode({ worldId: 'wA', frequency: TEST_FREQ, deployedYear: 1 });
    svc.registerNode({ worldId: 'wB', frequency: TEST_FREQ_2, deployedYear: 1, initialPrecision: 0.8 });
    svc.registerNode({ worldId: 'wC', frequency: TEST_FREQ, deployedYear: 1, initialPrecision: 0.4 });

    const stats = svc.getNetworkStats();
    expect(stats.totalNodes).toBe(3);
    expect(stats.activeNodes).toBe(1);
    expect(stats.degradedNodes).toBe(1);
    expect(stats.compromisedNodes).toBe(1);
  });

  it('increments totalTransitsCompleted on COMPLETE', () => {
    const clock = new TestClock();
    const svc = createLatticeNodeService({ clock, idGenerator: new TestIdGen() });
    const origin = svc.registerNode({ worldId: 'wA', frequency: TEST_FREQ, deployedYear: 1 });
    const target = svc.registerNode({ worldId: 'wB', frequency: TEST_FREQ_2, deployedYear: 1 });
    if (typeof origin === 'string' || typeof target === 'string') throw new Error('setup');

    const req = svc.enqueueLock({ entityId: 'e1' as never, originNodeId: origin.nodeId, targetNodeId: target.nodeId, distanceLY: 0 });
    if (typeof req === 'string') throw new Error(req);

    clock.advance(BASE_LOCK_MS + 1);
    svc.advanceLock(req.requestId);

    expect(svc.getNetworkStats().totalTransitsCompleted).toBe(1);
  });
});
