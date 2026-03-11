import { describe, it, expect } from 'vitest';
import {
  createCircuitBreaker,
  DEFAULT_CIRCUIT_CONFIG,
  FAILURE_THRESHOLD_DEFAULT,
  HALF_OPEN_TIMEOUT_US,
} from '../circuit-breaker.js';
import type { CircuitBreakerDeps } from '../circuit-breaker.js';

function createDeps(startUs = 0): CircuitBreakerDeps & { advance: (us: number) => void } {
  let time = startUs;
  return {
    clock: { nowMicroseconds: () => time },
    advance(us: number) {
      time += us;
    },
  };
}

// ── Constants ──────────────────────────────────────────────────

describe('circuit-breaker constants', () => {
  it('exports default config with expected values', () => {
    expect(DEFAULT_CIRCUIT_CONFIG.failureThreshold).toBe(FAILURE_THRESHOLD_DEFAULT);
    expect(DEFAULT_CIRCUIT_CONFIG.halfOpenTimeoutUs).toBe(HALF_OPEN_TIMEOUT_US);
    expect(DEFAULT_CIRCUIT_CONFIG.halfOpenMaxProbes).toBe(3);
    expect(DEFAULT_CIRCUIT_CONFIG.successThresholdToClose).toBe(2);
  });

  it('FAILURE_THRESHOLD_DEFAULT is 5', () => {
    expect(FAILURE_THRESHOLD_DEFAULT).toBe(5);
  });

  it('HALF_OPEN_TIMEOUT_US is 30 seconds', () => {
    expect(HALF_OPEN_TIMEOUT_US).toBe(30_000_000);
  });
});

// ── registerCircuit ─────────────────────────────────────────

describe('circuit-breaker registerCircuit', () => {
  it('creates a circuit in CLOSED state', () => {
    const deps = createDeps(1000);
    const cb = createCircuitBreaker(deps);
    const record = cb.registerCircuit('svc-a');
    expect(record.serviceId).toBe('svc-a');
    expect(record.state).toBe('CLOSED');
    expect(record.failureCount).toBe(0);
    expect(record.successCount).toBe(0);
    expect(record.lastStateChangeAt).toBe(1000);
  });

  it('returns existing circuit without overwriting', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    const record = cb.registerCircuit('svc-a');
    expect(record.totalFailures).toBe(1);
  });

  it('accepts per-circuit config overrides', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    cb.registerCircuit('svc-a', { failureThreshold: 10 });
    for (let i = 0; i < 9; i++) cb.recordFailure('svc-a');
    const circuit = cb.getCircuit('svc-a');
    expect(circuit?.state).toBe('CLOSED');
  });
});

// ── recordSuccess ───────────────────────────────────────────

describe('circuit-breaker recordSuccess', () => {
  it('increments success counters', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    cb.registerCircuit('svc-a');
    const result = cb.recordSuccess('svc-a');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.totalSuccesses).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.totalRequests).toBe(1);
    }
  });

  it('returns error for unregistered service', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    expect(cb.recordSuccess('unknown')).toBe('CIRCUIT_NOT_FOUND');
  });

  it('closes circuit after enough half-open successes', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, {
      failureThreshold: 2,
      successThresholdToClose: 2,
      halfOpenTimeoutUs: 1_000_000,
    });
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    cb.recordFailure('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('OPEN');
    deps.advance(1_000_000);
    cb.isAllowed('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('HALF_OPEN');
    cb.recordSuccess('svc-a');
    cb.recordSuccess('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('CLOSED');
  });
});

// ── recordFailure ───────────────────────────────────────────

describe('circuit-breaker recordFailure', () => {
  it('increments failure counters', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    cb.registerCircuit('svc-a');
    const result = cb.recordFailure('svc-a');
    if (typeof result !== 'string') {
      expect(result.totalFailures).toBe(1);
      expect(result.totalRequests).toBe(1);
    }
  });

  it('returns error for unregistered service', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    expect(cb.recordFailure('unknown')).toBe('CIRCUIT_NOT_FOUND');
  });

  it('opens circuit when failure threshold is reached', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, { failureThreshold: 3 });
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    cb.recordFailure('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('CLOSED');
    cb.recordFailure('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('OPEN');
  });

  it('reopens circuit on half-open failure', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, {
      failureThreshold: 2,
      halfOpenTimeoutUs: 1_000_000,
    });
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    cb.recordFailure('svc-a');
    deps.advance(1_000_000);
    cb.isAllowed('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('HALF_OPEN');
    cb.recordFailure('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('OPEN');
  });

  it('resets window counters when failure window expires', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, {
      failureThreshold: 3,
      failureWindowUs: 5_000_000,
    });
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    cb.recordFailure('svc-a');
    deps.advance(6_000_000);
    cb.recordFailure('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('CLOSED');
  });
});

// ── isAllowed ───────────────────────────────────────────────

describe('circuit-breaker isAllowed', () => {
  it('allows requests for CLOSED circuit', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    cb.registerCircuit('svc-a');
    expect(cb.isAllowed('svc-a')).toBe(true);
  });

  it('rejects requests for OPEN circuit', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, { failureThreshold: 1, halfOpenTimeoutUs: 10_000_000 });
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    expect(cb.isAllowed('svc-a')).toBe(false);
  });

  it('allows unregistered services by default', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    expect(cb.isAllowed('unknown')).toBe(true);
  });

  it('transitions OPEN to HALF_OPEN after timeout', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, {
      failureThreshold: 1,
      halfOpenTimeoutUs: 5_000_000,
    });
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('OPEN');
    deps.advance(5_000_000);
    expect(cb.isAllowed('svc-a')).toBe(true);
    expect(cb.getCircuit('svc-a')?.state).toBe('HALF_OPEN');
  });

  it('limits half-open probes', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, {
      failureThreshold: 1,
      halfOpenTimeoutUs: 1_000_000,
      halfOpenMaxProbes: 2,
    });
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    deps.advance(1_000_000);
    cb.tryExecute('svc-a');
    cb.tryExecute('svc-a');
    const result = cb.tryExecute('svc-a');
    expect(result.allowed).toBe(false);
  });
});

// ── tryExecute ──────────────────────────────────────────────

describe('circuit-breaker tryExecute', () => {
  it('allows and provides state info for closed circuit', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    cb.registerCircuit('svc-a');
    const result = cb.tryExecute('svc-a');
    expect(result.allowed).toBe(true);
    expect(result.state).toBe('CLOSED');
    expect(result.serviceId).toBe('svc-a');
  });

  it('rejects with reason for open circuit', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, { failureThreshold: 1, halfOpenTimeoutUs: 10_000_000 });
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    const result = cb.tryExecute('svc-a');
    expect(result.allowed).toBe(false);
    expect(result.state).toBe('OPEN');
    expect(result.reason).toContain('OPEN');
  });

  it('allows and increments half-open probe count', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, {
      failureThreshold: 1,
      halfOpenTimeoutUs: 1_000_000,
    });
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    deps.advance(1_000_000);
    const result = cb.tryExecute('svc-a');
    expect(result.allowed).toBe(true);
    expect(result.state).toBe('HALF_OPEN');
    expect(cb.getCircuit('svc-a')?.halfOpenProbes).toBe(1);
  });

  it('allows unregistered services with default state', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    const result = cb.tryExecute('unknown');
    expect(result.allowed).toBe(true);
    expect(result.state).toBe('CLOSED');
  });
});

// ── reset ───────────────────────────────────────────────────

describe('circuit-breaker reset', () => {
  it('forces circuit back to CLOSED', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, { failureThreshold: 1 });
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('OPEN');
    const result = cb.reset('svc-a');
    if (typeof result !== 'string') {
      expect(result.state).toBe('CLOSED');
      expect(result.failureCount).toBe(0);
      expect(result.halfOpenProbes).toBe(0);
    }
  });

  it('returns error for unregistered service', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    expect(cb.reset('unknown')).toBe('CIRCUIT_NOT_FOUND');
  });

  it('is a no-op state change if already CLOSED', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    cb.registerCircuit('svc-a');
    const initialStats = cb.getStats();
    cb.reset('svc-a');
    expect(cb.getStats().totalTransitions).toBe(initialStats.totalTransitions);
  });
});

// ── getCircuit ──────────────────────────────────────────────

describe('circuit-breaker getCircuit', () => {
  it('returns circuit record for registered service', () => {
    const deps = createDeps(5000);
    const cb = createCircuitBreaker(deps);
    cb.registerCircuit('svc-a');
    const circuit = cb.getCircuit('svc-a');
    expect(circuit).toBeDefined();
    expect(circuit?.serviceId).toBe('svc-a');
    expect(circuit?.lastStateChangeAt).toBe(5000);
  });

  it('returns undefined for unregistered service', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    expect(cb.getCircuit('unknown')).toBeUndefined();
  });
});

// ── getFailureMetrics ───────────────────────────────────────

describe('circuit-breaker getFailureMetrics', () => {
  it('returns failure metrics for registered service', () => {
    const deps = createDeps(1000);
    const cb = createCircuitBreaker(deps);
    cb.registerCircuit('svc-a');
    cb.recordSuccess('svc-a');
    cb.recordFailure('svc-a');
    cb.recordFailure('svc-a');
    const metrics = cb.getFailureMetrics('svc-a');
    expect(metrics.serviceId).toBe('svc-a');
    expect(metrics.failureCount).toBe(2);
    expect(metrics.failureRate).toBeCloseTo(2 / 3);
    expect(metrics.lastFailureAt).toBeGreaterThan(0);
  });

  it('returns zero metrics for unregistered service', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    const metrics = cb.getFailureMetrics('unknown');
    expect(metrics.failureCount).toBe(0);
    expect(metrics.failureRate).toBe(0);
  });
});

// ── listByState ─────────────────────────────────────────────

describe('circuit-breaker listByState', () => {
  it('filters circuits by state', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, { failureThreshold: 1 });
    cb.registerCircuit('svc-a');
    cb.registerCircuit('svc-b');
    cb.registerCircuit('svc-c');
    cb.recordFailure('svc-b');
    expect(cb.listByState('CLOSED')).toHaveLength(2);
    expect(cb.listByState('OPEN')).toHaveLength(1);
    expect(cb.listByState('OPEN')[0]?.serviceId).toBe('svc-b');
  });

  it('returns empty array when no match', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    cb.registerCircuit('svc-a');
    expect(cb.listByState('OPEN')).toHaveLength(0);
  });
});

// ── tick ────────────────────────────────────────────────────

describe('circuit-breaker tick', () => {
  it('transitions expired OPEN circuits to HALF_OPEN', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, {
      failureThreshold: 1,
      halfOpenTimeoutUs: 2_000_000,
    });
    cb.registerCircuit('svc-a');
    cb.registerCircuit('svc-b');
    cb.recordFailure('svc-a');
    cb.recordFailure('svc-b');
    deps.advance(2_000_000);
    const count = cb.tick();
    expect(count).toBe(2);
    expect(cb.getCircuit('svc-a')?.state).toBe('HALF_OPEN');
    expect(cb.getCircuit('svc-b')?.state).toBe('HALF_OPEN');
  });

  it('does not transition if timeout not reached', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, {
      failureThreshold: 1,
      halfOpenTimeoutUs: 5_000_000,
    });
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    deps.advance(3_000_000);
    expect(cb.tick()).toBe(0);
    expect(cb.getCircuit('svc-a')?.state).toBe('OPEN');
  });

  it('ignores non-OPEN circuits', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    cb.registerCircuit('svc-a');
    deps.advance(100_000_000);
    expect(cb.tick()).toBe(0);
  });
});

// ── getStats ────────────────────────────────────────────────

describe('circuit-breaker getStats', () => {
  it('reports aggregate statistics', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, {
      failureThreshold: 1,
      halfOpenTimeoutUs: 1_000_000,
    });
    cb.registerCircuit('svc-a');
    cb.registerCircuit('svc-b');
    cb.registerCircuit('svc-c');
    cb.recordFailure('svc-a');
    cb.recordFailure('svc-b');
    deps.advance(1_000_000);
    cb.tick();
    const stats = cb.getStats();
    expect(stats.totalCircuits).toBe(3);
    expect(stats.closedCount).toBe(1);
    expect(stats.halfOpenCount).toBe(2);
    expect(stats.openCount).toBe(0);
    expect(stats.totalTransitions).toBeGreaterThan(0);
  });

  it('returns zeros when empty', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps);
    const stats = cb.getStats();
    expect(stats.totalCircuits).toBe(0);
    expect(stats.closedCount).toBe(0);
    expect(stats.openCount).toBe(0);
    expect(stats.halfOpenCount).toBe(0);
    expect(stats.totalTransitions).toBe(0);
  });
});

// ── Full lifecycle ──────────────────────────────────────────

describe('circuit-breaker full lifecycle', () => {
  it('goes CLOSED -> OPEN -> HALF_OPEN -> CLOSED', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, {
      failureThreshold: 3,
      halfOpenTimeoutUs: 2_000_000,
      successThresholdToClose: 2,
    });
    cb.registerCircuit('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('CLOSED');
    cb.recordFailure('svc-a');
    cb.recordFailure('svc-a');
    cb.recordFailure('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('OPEN');
    expect(cb.isAllowed('svc-a')).toBe(false);
    deps.advance(2_000_000);
    expect(cb.isAllowed('svc-a')).toBe(true);
    expect(cb.getCircuit('svc-a')?.state).toBe('HALF_OPEN');
    cb.recordSuccess('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('HALF_OPEN');
    cb.recordSuccess('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('CLOSED');
    expect(cb.isAllowed('svc-a')).toBe(true);
  });

  it('goes CLOSED -> OPEN -> HALF_OPEN -> OPEN on probe failure', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, {
      failureThreshold: 2,
      halfOpenTimeoutUs: 1_000_000,
    });
    cb.registerCircuit('svc-a');
    cb.recordFailure('svc-a');
    cb.recordFailure('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('OPEN');
    deps.advance(1_000_000);
    cb.isAllowed('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('HALF_OPEN');
    cb.recordFailure('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('OPEN');
  });

  it('handles multiple independent circuits', () => {
    const deps = createDeps();
    const cb = createCircuitBreaker(deps, { failureThreshold: 1 });
    cb.registerCircuit('svc-a');
    cb.registerCircuit('svc-b');
    cb.recordFailure('svc-a');
    expect(cb.getCircuit('svc-a')?.state).toBe('OPEN');
    expect(cb.getCircuit('svc-b')?.state).toBe('CLOSED');
    expect(cb.isAllowed('svc-a')).toBe(false);
    expect(cb.isAllowed('svc-b')).toBe(true);
  });
});
