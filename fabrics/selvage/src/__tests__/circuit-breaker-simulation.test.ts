/**
 * Circuit Breaker — Simulation Tests
 *
 * Exercises the full circuit breaker state machine: CLOSED → OPEN → HALF_OPEN → CLOSED,
 * failure threshold triggers, timeout-based transitions, half-open probing,
 * failure window expiry, manual reset, and statistics.
 */

import { describe, it, expect } from 'vitest';
import {
  createCircuitBreaker,
  DEFAULT_CIRCUIT_CONFIG,
  FAILURE_THRESHOLD_DEFAULT,
  HALF_OPEN_TIMEOUT_US,
} from '../circuit-breaker.js';
import type { CircuitBreaker } from '../circuit-breaker.js';

// ── Helpers ──────────────────────────────────────────────────────

function makeDeps() {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time },
    advance: (us: number) => { time += us; },
    setTime: (us: number) => { time = us; },
  };
}

function setupWithCircuit(configOverrides?: Parameters<CircuitBreaker['registerCircuit']>[1]) {
  const deps = makeDeps();
  const cb = createCircuitBreaker(deps);
  cb.registerCircuit('svc-1', configOverrides);
  return { deps, cb };
}

function tripCircuit(cb: CircuitBreaker, serviceId: string, count: number = FAILURE_THRESHOLD_DEFAULT) {
  for (let i = 0; i < count; i++) {
    cb.recordFailure(serviceId);
  }
}

// ── Constants ───────────────────────────────────────────────────

describe('Circuit Breaker', () => {
  describe('defaults', () => {
    it('has correct default failure threshold', () => {
      expect(FAILURE_THRESHOLD_DEFAULT).toBe(5);
    });

    it('has correct default half-open timeout', () => {
      expect(HALF_OPEN_TIMEOUT_US).toBe(30_000_000);
    });

    it('default config matches expected values', () => {
      expect(DEFAULT_CIRCUIT_CONFIG).toEqual({
        failureThreshold: 5,
        halfOpenTimeoutUs: 30_000_000,
        halfOpenMaxProbes: 3,
        successThresholdToClose: 2,
        failureWindowUs: 60_000_000,
      });
    });
  });

  // ── Registration ──────────────────────────────────────────────

  describe('registerCircuit', () => {
    it('creates a circuit in CLOSED state', () => {
      const { cb } = setupWithCircuit();
      const record = cb.getCircuit('svc-1');
      expect(record).toBeDefined();
      expect(record!.state).toBe('CLOSED');
      expect(record!.failureCount).toBe(0);
      expect(record!.successCount).toBe(0);
    });

    it('returns existing circuit on duplicate registration', () => {
      const { cb } = setupWithCircuit();
      cb.recordFailure('svc-1');
      const record = cb.registerCircuit('svc-1');
      expect(record.failureCount).toBe(1); // preserves state
    });

    it('supports custom config overrides', () => {
      const deps = makeDeps();
      const cb = createCircuitBreaker(deps);
      cb.registerCircuit('custom', { failureThreshold: 2 });
      cb.recordFailure('custom');
      cb.recordFailure('custom');
      const record = cb.getCircuit('custom')!;
      expect(record.state).toBe('OPEN');
    });
  });

  // ── CLOSED → OPEN ────────────────────────────────────────────

  describe('CLOSED → OPEN transition', () => {
    it('transitions after failureThreshold failures', () => {
      const { cb } = setupWithCircuit();
      for (let i = 0; i < 4; i++) {
        cb.recordFailure('svc-1');
        expect(cb.getCircuit('svc-1')!.state).toBe('CLOSED');
      }
      cb.recordFailure('svc-1');
      expect(cb.getCircuit('svc-1')!.state).toBe('OPEN');
    });

    it('blocks requests when OPEN', () => {
      const { cb } = setupWithCircuit();
      tripCircuit(cb, 'svc-1');
      expect(cb.isAllowed('svc-1')).toBe(false);
    });

    it('tryExecute returns rejected when OPEN', () => {
      const { cb } = setupWithCircuit();
      tripCircuit(cb, 'svc-1');
      const result = cb.tryExecute('svc-1');
      expect(result.allowed).toBe(false);
      expect(result.state).toBe('OPEN');
    });

    it('tracks total requests and failures', () => {
      const { cb } = setupWithCircuit();
      cb.recordSuccess('svc-1');
      cb.recordSuccess('svc-1');
      cb.recordFailure('svc-1');
      const record = cb.getCircuit('svc-1')!;
      expect(record.totalRequests).toBe(3);
      expect(record.totalSuccesses).toBe(2);
      expect(record.totalFailures).toBe(1);
    });
  });

  // ── OPEN → HALF_OPEN ─────────────────────────────────────────

  describe('OPEN → HALF_OPEN transition', () => {
    it('transitions via isAllowed after timeout', () => {
      const { deps, cb } = setupWithCircuit();
      tripCircuit(cb, 'svc-1');
      expect(cb.getCircuit('svc-1')!.state).toBe('OPEN');
      deps.advance(HALF_OPEN_TIMEOUT_US);
      expect(cb.isAllowed('svc-1')).toBe(true);
      expect(cb.getCircuit('svc-1')!.state).toBe('HALF_OPEN');
    });

    it('transitions via tick after timeout', () => {
      const { deps, cb } = setupWithCircuit();
      tripCircuit(cb, 'svc-1');
      deps.advance(HALF_OPEN_TIMEOUT_US);
      const transitioned = cb.tick();
      expect(transitioned).toBe(1);
      expect(cb.getCircuit('svc-1')!.state).toBe('HALF_OPEN');
    });

    it('does not transition before timeout', () => {
      const { deps, cb } = setupWithCircuit();
      tripCircuit(cb, 'svc-1');
      deps.advance(HALF_OPEN_TIMEOUT_US - 1);
      cb.tick();
      expect(cb.getCircuit('svc-1')!.state).toBe('OPEN');
    });
  });

  // ── HALF_OPEN → CLOSED ───────────────────────────────────────

  describe('HALF_OPEN → CLOSED transition', () => {
    it('closes after successThreshold met', () => {
      const { deps, cb } = setupWithCircuit();
      tripCircuit(cb, 'svc-1');
      deps.advance(HALF_OPEN_TIMEOUT_US);
      cb.tick();
      expect(cb.getCircuit('svc-1')!.state).toBe('HALF_OPEN');
      // Default successThresholdToClose = 2
      cb.recordSuccess('svc-1');
      expect(cb.getCircuit('svc-1')!.state).toBe('HALF_OPEN');
      cb.recordSuccess('svc-1');
      expect(cb.getCircuit('svc-1')!.state).toBe('CLOSED');
    });
  });

  // ── HALF_OPEN → OPEN (failure during probing) ────────────────

  describe('HALF_OPEN → OPEN on failure', () => {
    it('reopens on failure during half-open', () => {
      const { deps, cb } = setupWithCircuit();
      tripCircuit(cb, 'svc-1');
      deps.advance(HALF_OPEN_TIMEOUT_US);
      cb.tick();
      expect(cb.getCircuit('svc-1')!.state).toBe('HALF_OPEN');
      cb.recordFailure('svc-1');
      expect(cb.getCircuit('svc-1')!.state).toBe('OPEN');
    });
  });

  // ── Half-Open Probing ─────────────────────────────────────────

  describe('halfOpenProbes', () => {
    it('limits probes via halfOpenMaxProbes', () => {
      const { deps, cb } = setupWithCircuit({ halfOpenMaxProbes: 2 });
      tripCircuit(cb, 'svc-1');
      deps.advance(HALF_OPEN_TIMEOUT_US);
      cb.tick();
      // In HALF_OPEN: tryExecute increments probes
      const r1 = cb.tryExecute('svc-1');
      expect(r1.allowed).toBe(true);
      const r2 = cb.tryExecute('svc-1');
      expect(r2.allowed).toBe(true);
      // Third probe should be blocked (max 2)
      const r3 = cb.tryExecute('svc-1');
      expect(r3.allowed).toBe(false);
    });
  });

  // ── Failure Window Expiry ─────────────────────────────────────

  describe('failure window expiry', () => {
    it('resets failure count after window expires', () => {
      const { deps, cb } = setupWithCircuit();
      // Record 4 failures (one short of threshold)
      for (let i = 0; i < 4; i++) {
        cb.recordFailure('svc-1');
      }
      // Advance past failure window (default 60s)
      deps.advance(60_000_001);
      // Next failure resets window, so count starts fresh
      cb.recordFailure('svc-1');
      expect(cb.getCircuit('svc-1')!.state).toBe('CLOSED');
    });
  });

  // ── Manual Reset ──────────────────────────────────────────────

  describe('reset', () => {
    it('resets OPEN circuit to CLOSED', () => {
      const { cb } = setupWithCircuit();
      tripCircuit(cb, 'svc-1');
      expect(cb.getCircuit('svc-1')!.state).toBe('OPEN');
      const record = cb.reset('svc-1');
      expect(typeof record).toBe('object');
      expect((record as { state: string }).state).toBe('CLOSED');
    });

    it('returns error for unknown circuit', () => {
      const { cb } = setupWithCircuit();
      expect(cb.reset('unknown')).toBe('CIRCUIT_NOT_FOUND');
    });
  });

  // ── Failure Metrics ───────────────────────────────────────────

  describe('getFailureMetrics', () => {
    it('computes failure rate correctly', () => {
      const { cb } = setupWithCircuit();
      cb.recordSuccess('svc-1');
      cb.recordSuccess('svc-1');
      cb.recordFailure('svc-1');
      const metrics = cb.getFailureMetrics('svc-1');
      expect(metrics.failureRate).toBeCloseTo(1 / 3, 5);
      expect(metrics.serviceId).toBe('svc-1');
    });

    it('returns zero metrics for unknown circuit', () => {
      const { cb } = setupWithCircuit();
      const metrics = cb.getFailureMetrics('ghost');
      expect(metrics.failureCount).toBe(0);
      expect(metrics.failureRate).toBe(0);
    });
  });

  // ── Error on Missing ─────────────────────────────────────────

  describe('error handling', () => {
    it('recordSuccess returns error for unknown circuit', () => {
      const { cb } = setupWithCircuit();
      expect(cb.recordSuccess('nope')).toBe('CIRCUIT_NOT_FOUND');
    });

    it('recordFailure returns error for unknown circuit', () => {
      const { cb } = setupWithCircuit();
      expect(cb.recordFailure('nope')).toBe('CIRCUIT_NOT_FOUND');
    });

    it('isAllowed returns true for unknown circuit', () => {
      const { cb } = setupWithCircuit();
      expect(cb.isAllowed('nope')).toBe(true);
    });

    it('tryExecute allows unknown circuit by default', () => {
      const { cb } = setupWithCircuit();
      const result = cb.tryExecute('nope');
      expect(result.allowed).toBe(true);
      expect(result.state).toBe('CLOSED');
    });

    it('getCircuit returns undefined for unknown', () => {
      const { cb } = setupWithCircuit();
      expect(cb.getCircuit('nope')).toBeUndefined();
    });
  });

  // ── listByState ───────────────────────────────────────────────

  describe('listByState', () => {
    it('filters circuits by state', () => {
      const deps = makeDeps();
      const cb = createCircuitBreaker(deps);
      cb.registerCircuit('a');
      cb.registerCircuit('b');
      cb.registerCircuit('c');
      // Trip 'a' and 'b' to OPEN
      tripCircuit(cb, 'a');
      tripCircuit(cb, 'b');
      const open = cb.listByState('OPEN');
      expect(open.length).toBe(2);
      const closed = cb.listByState('CLOSED');
      expect(closed.length).toBe(1);
      expect(closed[0].serviceId).toBe('c');
    });
  });

  // ── Stats ─────────────────────────────────────────────────────

  describe('getStats', () => {
    it('reports correct aggregate statistics', () => {
      const deps = makeDeps();
      const cb = createCircuitBreaker(deps);
      cb.registerCircuit('a');
      cb.registerCircuit('b');
      cb.registerCircuit('c');
      tripCircuit(cb, 'a');
      const stats = cb.getStats();
      expect(stats.totalCircuits).toBe(3);
      expect(stats.openCount).toBe(1);
      expect(stats.closedCount).toBe(2);
      expect(stats.halfOpenCount).toBe(0);
      expect(stats.totalTransitions).toBe(1);
    });
  });

  // ── Multiple Circuits ─────────────────────────────────────────

  describe('multi-circuit isolation', () => {
    it('circuit states are independent', () => {
      const deps = makeDeps();
      const cb = createCircuitBreaker(deps);
      cb.registerCircuit('auth');
      cb.registerCircuit('payment');
      tripCircuit(cb, 'auth');
      expect(cb.getCircuit('auth')!.state).toBe('OPEN');
      expect(cb.getCircuit('payment')!.state).toBe('CLOSED');
      expect(cb.isAllowed('payment')).toBe(true);
    });
  });
});
