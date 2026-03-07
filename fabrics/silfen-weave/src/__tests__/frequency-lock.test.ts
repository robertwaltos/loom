import { describe, it, expect } from 'vitest';
import {
  createFrequencyLockEngine,
  calculateLockDurationUs,
  COHERENCE_PARTIAL,
  COHERENCE_CRITICAL,
  COHERENCE_TRANSIT,
} from '../frequency-lock.js';
import type { FrequencyLockEngine, InitiateLockParams } from '../frequency-lock.js';

const US_PER_HOUR = 60 * 60 * 1_000_000;

function createTestClock(initialHours = 0) {
  let time = initialHours * US_PER_HOUR;
  return {
    nowMicroseconds: () => time,
    advanceHours(hours: number) { time += hours * US_PER_HOUR; },
  };
}

function createTestEngine(initialHours = 0) {
  const clock = createTestClock(initialHours);
  const engine = createFrequencyLockEngine({ clock });
  return { engine, clock };
}

function defaultLockParams(): InitiateLockParams {
  return {
    lockId: 'lock-1',
    originNodeId: 'node-earth',
    destinationNodeId: 'node-mars',
    entityId: 'entity-pilgrim',
    distanceLY: 4.2,
    fieldCondition: 1.0,
  };
}

function createActiveLock(engine: FrequencyLockEngine) {
  engine.initiateLock(defaultLockParams());
}

// ─── Duration Calculation ───────────────────────────────────────────

describe('FrequencyLock duration', () => {
  it('calculates base duration at 0 distance', () => {
    const duration = calculateLockDurationUs(0, 1.0);
    expect(duration).toBe(180_000_000);
  });

  it('scales with distance', () => {
    const close = calculateLockDurationUs(1, 1.0);
    const far = calculateLockDurationUs(10, 1.0);
    expect(far).toBeGreaterThan(close);
  });

  it('scales with field condition', () => {
    const good = calculateLockDurationUs(4.2, 1.0);
    const poor = calculateLockDurationUs(4.2, 2.0);
    expect(poor).toBeGreaterThan(good);
  });

  it('matches formula: 180M * (1 + dist*0.15) * field', () => {
    const duration = calculateLockDurationUs(4.2, 1.5);
    const expected = Math.round(180_000_000 * (1 + 4.2 * 0.15) * 1.5);
    expect(duration).toBe(expected);
  });
});

// ─── Lock Initiation ────────────────────────────────────────────────

describe('FrequencyLock initiation', () => {
  it('creates lock in synchronising state', () => {
    const { engine } = createTestEngine();
    const lock = engine.initiateLock(defaultLockParams());
    expect(lock.status).toBe('synchronising');
    expect(lock.coherence).toBe(0);
    expect(lock.entityId).toBe('entity-pilgrim');
    expect(lock.completedAt).toBeNull();
  });

  it('rejects duplicate lock id', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    expect(() => engine.initiateLock(defaultLockParams())).toThrow('already exists');
  });

  it('counts locks', () => {
    const { engine } = createTestEngine();
    expect(engine.count()).toBe(0);
    createActiveLock(engine);
    expect(engine.count()).toBe(1);
  });
});

// ─── Lock Retrieval ─────────────────────────────────────────────────

describe('FrequencyLock retrieval', () => {
  it('gets lock by id', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    expect(engine.getLock('lock-1').originNodeId).toBe('node-earth');
  });

  it('throws for missing lock', () => {
    const { engine } = createTestEngine();
    expect(() => engine.getLock('nope')).toThrow('not found');
  });

  it('tryGet returns undefined for missing', () => {
    const { engine } = createTestEngine();
    expect(engine.tryGetLock('nope')).toBeUndefined();
  });
});

// ─── Coherence to Partial ───────────────────────────────────────────

describe('FrequencyLock coherence partial', () => {
  it('stays synchronising below 0.73', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    const transition = engine.updateCoherence('lock-1', 0.5);
    expect(transition).toBeNull();
    expect(engine.getLock('lock-1').status).toBe('synchronising');
  });

  it('transitions to partial_coherence at 0.73', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    const transition = engine.updateCoherence('lock-1', COHERENCE_PARTIAL);
    expect(transition?.from).toBe('synchronising');
    expect(transition?.to).toBe('partial_coherence');
  });
});

// ─── Coherence to Critical and Transit ──────────────────────────────

describe('FrequencyLock coherence advanced', () => {
  it('transitions to critical_threshold at 0.95', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    engine.updateCoherence('lock-1', COHERENCE_PARTIAL);
    const transition = engine.updateCoherence('lock-1', COHERENCE_CRITICAL);
    expect(transition?.to).toBe('critical_threshold');
  });

  it('transitions to transit_executing at 0.999', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    engine.updateCoherence('lock-1', COHERENCE_CRITICAL);
    const transition = engine.updateCoherence('lock-1', COHERENCE_TRANSIT);
    expect(transition?.to).toBe('transit_executing');
  });

  it('can jump directly to transit_executing', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    const transition = engine.updateCoherence('lock-1', 1.0);
    expect(transition?.to).toBe('transit_executing');
  });
});

// ─── Coherence Regression ───────────────────────────────────────────

describe('FrequencyLock coherence regression', () => {
  it('allows coherence to drop back', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    engine.updateCoherence('lock-1', COHERENCE_CRITICAL);
    const transition = engine.updateCoherence('lock-1', 0.5);
    expect(transition?.from).toBe('critical_threshold');
    expect(transition?.to).toBe('synchronising');
  });

  it('rejects out-of-range coherence', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    expect(() => engine.updateCoherence('lock-1', -0.1)).toThrow('out of range');
    expect(() => engine.updateCoherence('lock-1', 1.1)).toThrow('out of range');
  });
});

// ─── Lock Abort ─────────────────────────────────────────────────────

describe('FrequencyLock abort', () => {
  it('aborts from synchronising', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    const transition = engine.abortLock('lock-1', 'player cancelled');
    expect(transition.to).toBe('failed');
    expect(engine.getLock('lock-1').failureReason).toBe('player cancelled');
  });

  it('aborts from partial_coherence', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    engine.updateCoherence('lock-1', COHERENCE_PARTIAL);
    const transition = engine.abortLock('lock-1', 'timeout');
    expect(transition.to).toBe('failed');
  });

  it('cannot abort from transit_executing', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    engine.updateCoherence('lock-1', COHERENCE_TRANSIT);
    expect(() => engine.abortLock('lock-1', 'too late')).toThrow();
  });

  it('cannot abort completed lock', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    engine.updateCoherence('lock-1', COHERENCE_TRANSIT);
    engine.completeLock('lock-1');
    expect(() => engine.abortLock('lock-1', 'nope')).toThrow();
  });
});

// ─── Lock Completion ────────────────────────────────────────────────

describe('FrequencyLock completion', () => {
  it('completes from transit_executing', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    engine.updateCoherence('lock-1', COHERENCE_TRANSIT);
    const transition = engine.completeLock('lock-1');
    expect(transition.to).toBe('complete');
    expect(engine.getLock('lock-1').completedAt).not.toBeNull();
  });

  it('cannot complete from synchronising', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    expect(() => engine.completeLock('lock-1')).toThrow();
  });

  it('cannot update coherence after completion', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    engine.updateCoherence('lock-1', COHERENCE_TRANSIT);
    engine.completeLock('lock-1');
    expect(() => engine.updateCoherence('lock-1', 0.5)).toThrow();
  });
});

// ─── Partial Collapse ───────────────────────────────────────────────

describe('FrequencyLock partial collapse', () => {
  it('collapses from transit_executing', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    engine.updateCoherence('lock-1', COHERENCE_TRANSIT);
    const t = engine.triggerPartialCollapse('lock-1', 'field disruption');
    expect(t.to).toBe('partial_collapse');
    expect(engine.getLock('lock-1').failureReason).toBe('field disruption');
  });

  it('cannot collapse from synchronising', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    expect(() => engine.triggerPartialCollapse('lock-1', 'nope'))
      .toThrow('cannot collapse');
  });
});

// ─── Query Methods ──────────────────────────────────────────────────

describe('FrequencyLock queries', () => {
  it('lists active locks', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    engine.initiateLock({ ...defaultLockParams(), lockId: 'lock-2' });
    expect(engine.getActiveLocks()).toHaveLength(2);
  });

  it('excludes terminal locks from active', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    engine.abortLock('lock-1', 'done');
    expect(engine.getActiveLocks()).toHaveLength(0);
  });

  it('filters locks by entity', () => {
    const { engine } = createTestEngine();
    createActiveLock(engine);
    engine.initiateLock({
      ...defaultLockParams(),
      lockId: 'lock-other',
      entityId: 'entity-other',
    });
    const pilgrimLocks = engine.getLocksByEntity('entity-pilgrim');
    expect(pilgrimLocks).toHaveLength(1);
    expect(pilgrimLocks[0]?.lockId).toBe('lock-1');
  });
});
