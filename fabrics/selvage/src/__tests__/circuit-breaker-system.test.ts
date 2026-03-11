import { describe, it, expect } from 'vitest';
import { createCircuitBreakerSystem } from '../circuit-breaker-system.js';
import type { CircuitBreakerSystem, CircuitBreaker } from '../circuit-breaker-system.js';

// ============================================================================
// HELPERS
// ============================================================================

function makeDeps() {
  let time = 1_000_000n;
  let counter = 0;
  const logs: string[] = [];
  return {
    clock: { now: () => time },
    idGen: {
      generate: () => {
        counter += 1;
        return 'id-' + String(counter);
      },
    },
    logger: {
      info: (msg: string) => {
        logs.push('INFO: ' + msg);
      },
      warn: (msg: string) => {
        logs.push('WARN: ' + msg);
      },
    },
    advance: (us: bigint) => {
      time += us;
    },
    getLogs: () => logs,
  };
}

function makeSystem(): { sys: CircuitBreakerSystem; deps: ReturnType<typeof makeDeps> } {
  const deps = makeDeps();
  return { sys: createCircuitBreakerSystem(deps), deps };
}

function isBreaker(r: CircuitBreaker | string): r is CircuitBreaker {
  return typeof r !== 'string';
}

// ============================================================================
// registerCircuit
// ============================================================================

describe('registerCircuit', () => {
  it('registers a circuit in CLOSED state', () => {
    const { sys } = makeSystem();
    const result = sys.registerCircuit('svc-a', 5, 2, 30_000_000n);
    expect(isBreaker(result)).toBe(true);
    if (!isBreaker(result)) return;
    expect(result.serviceId).toBe('svc-a');
    expect(result.state).toBe('CLOSED');
    expect(result.failureCount).toBe(0);
    expect(result.successCount).toBe(0);
    expect(result.failureThreshold).toBe(5);
    expect(result.successThreshold).toBe(2);
    expect(result.openedAt).toBeNull();
  });

  it('returns invalid-threshold for failureThreshold < 1', () => {
    const { sys } = makeSystem();
    expect(sys.registerCircuit('svc-a', 0, 2, 30_000_000n)).toBe('invalid-threshold');
  });

  it('returns invalid-threshold for successThreshold < 1', () => {
    const { sys } = makeSystem();
    expect(sys.registerCircuit('svc-a', 5, 0, 30_000_000n)).toBe('invalid-threshold');
  });

  it('registers multiple circuits independently', () => {
    const { sys } = makeSystem();
    sys.registerCircuit('svc-a', 3, 1, 1_000_000n);
    sys.registerCircuit('svc-b', 5, 2, 2_000_000n);
    expect(sys.getStats().totalCircuits).toBe(2);
  });
});

// ============================================================================
// recordSuccess
// ============================================================================

describe('recordSuccess', () => {
  it('records a success in CLOSED state', () => {
    const { sys } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 3, 2, 1_000_000n);
    if (!isBreaker(breaker)) return;
    const result = sys.recordSuccess(breaker.circuitId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.success).toBe(true);
    expect(result.result.circuitState).toBe('CLOSED');
  });

  it('returns circuit-not-found for unknown circuitId', () => {
    const { sys } = makeSystem();
    const result = sys.recordSuccess('unknown');
    expect(result).toEqual({ success: false, error: 'circuit-not-found' });
  });

  it('returns circuit-open when circuit is OPEN', () => {
    const { sys } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 1, 2, 30_000_000n);
    if (!isBreaker(breaker)) return;
    sys.recordFailure(breaker.circuitId);
    const result = sys.recordSuccess(breaker.circuitId);
    expect(result).toEqual({ success: false, error: 'circuit-open' });
  });

  it('closes circuit after enough successes in HALF_OPEN', () => {
    const { sys, deps } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 1, 2, 1_000_000n);
    if (!isBreaker(breaker)) return;

    sys.recordFailure(breaker.circuitId);
    deps.advance(1_000_001n);
    sys.attemptCall(breaker.circuitId);

    sys.recordSuccess(breaker.circuitId);
    expect(sys.getCircuit(breaker.circuitId)?.state).toBe('HALF_OPEN');
    sys.recordSuccess(breaker.circuitId);
    expect(sys.getCircuit(breaker.circuitId)?.state).toBe('CLOSED');
  });
});

// ============================================================================
// recordFailure
// ============================================================================

describe('recordFailure', () => {
  it('increments failureCount in CLOSED state', () => {
    const { sys } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 3, 2, 1_000_000n);
    if (!isBreaker(breaker)) return;
    sys.recordFailure(breaker.circuitId);
    sys.recordFailure(breaker.circuitId);
    expect(sys.getCircuit(breaker.circuitId)?.failureCount).toBe(2);
    expect(sys.getCircuit(breaker.circuitId)?.state).toBe('CLOSED');
  });

  it('opens circuit when failureThreshold is reached', () => {
    const { sys } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 3, 2, 1_000_000n);
    if (!isBreaker(breaker)) return;
    sys.recordFailure(breaker.circuitId);
    sys.recordFailure(breaker.circuitId);
    sys.recordFailure(breaker.circuitId);
    expect(sys.getCircuit(breaker.circuitId)?.state).toBe('OPEN');
  });

  it('returns circuit-open when circuit is already OPEN', () => {
    const { sys } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 1, 2, 30_000_000n);
    if (!isBreaker(breaker)) return;
    sys.recordFailure(breaker.circuitId);
    const result = sys.recordFailure(breaker.circuitId);
    expect(result).toEqual({ success: false, error: 'circuit-open' });
  });

  it('re-opens circuit on failure in HALF_OPEN state', () => {
    const { sys, deps } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 1, 2, 1_000_000n);
    if (!isBreaker(breaker)) return;
    sys.recordFailure(breaker.circuitId);
    deps.advance(1_000_001n);
    sys.attemptCall(breaker.circuitId);
    expect(sys.getCircuit(breaker.circuitId)?.state).toBe('HALF_OPEN');
    sys.recordFailure(breaker.circuitId);
    expect(sys.getCircuit(breaker.circuitId)?.state).toBe('OPEN');
  });

  it('returns circuit-not-found for unknown circuitId', () => {
    const { sys } = makeSystem();
    expect(sys.recordFailure('nope')).toEqual({ success: false, error: 'circuit-not-found' });
  });

  it('sets openedAt when transitioning to OPEN', () => {
    const { sys } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 1, 2, 1_000_000n);
    if (!isBreaker(breaker)) return;
    sys.recordFailure(breaker.circuitId);
    expect(sys.getCircuit(breaker.circuitId)?.openedAt).not.toBeNull();
  });
});

// ============================================================================
// attemptCall
// ============================================================================

describe('attemptCall', () => {
  it('allows calls when CLOSED', () => {
    const { sys } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 3, 2, 1_000_000n);
    if (!isBreaker(breaker)) return;
    const result = sys.attemptCall(breaker.circuitId);
    expect(result).toMatchObject({ allowed: true, state: 'CLOSED' });
  });

  it('blocks calls when OPEN and cooldown not expired', () => {
    const { sys } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 1, 2, 30_000_000n);
    if (!isBreaker(breaker)) return;
    sys.recordFailure(breaker.circuitId);
    const result = sys.attemptCall(breaker.circuitId);
    expect(result).toMatchObject({ allowed: false, state: 'OPEN' });
  });

  it('transitions OPEN to HALF_OPEN after cooldown', () => {
    const { sys, deps } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 1, 2, 1_000_000n);
    if (!isBreaker(breaker)) return;
    sys.recordFailure(breaker.circuitId);
    deps.advance(1_000_001n);
    const result = sys.attemptCall(breaker.circuitId);
    expect(result).toMatchObject({ allowed: true, state: 'HALF_OPEN' });
  });

  it('returns circuit-not-found for unknown circuitId', () => {
    const { sys } = makeSystem();
    expect(sys.attemptCall('nope')).toEqual({ success: false, error: 'circuit-not-found' });
  });
});

// ============================================================================
// resetCircuit
// ============================================================================

describe('resetCircuit', () => {
  it('resets to CLOSED and zeroes counters', () => {
    const { sys } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 1, 2, 30_000_000n);
    if (!isBreaker(breaker)) return;
    sys.recordFailure(breaker.circuitId);
    expect(sys.getCircuit(breaker.circuitId)?.state).toBe('OPEN');

    sys.resetCircuit(breaker.circuitId);
    const c = sys.getCircuit(breaker.circuitId);
    expect(c?.state).toBe('CLOSED');
    expect(c?.failureCount).toBe(0);
    expect(c?.successCount).toBe(0);
    expect(c?.openedAt).toBeNull();
  });

  it('returns circuit-not-found for unknown circuitId', () => {
    const { sys } = makeSystem();
    expect(sys.resetCircuit('nope')).toEqual({ success: false, error: 'circuit-not-found' });
  });
});

// ============================================================================
// getStats
// ============================================================================

describe('getStats', () => {
  it('returns zeros for empty system', () => {
    const { sys } = makeSystem();
    expect(sys.getStats()).toEqual({
      totalCircuits: 0,
      openCircuits: 0,
      halfOpenCircuits: 0,
      closedCircuits: 0,
    });
  });

  it('counts circuits by state', () => {
    const { sys, deps } = makeSystem();
    const a = sys.registerCircuit('svc-a', 1, 2, 1_000_000n);
    const b = sys.registerCircuit('svc-b', 1, 2, 30_000_000n);
    const c = sys.registerCircuit('svc-c', 1, 2, 1_000_000n);
    if (!isBreaker(a) || !isBreaker(b) || !isBreaker(c)) return;

    sys.recordFailure(a.circuitId); // opens a with short cooldown
    sys.recordFailure(b.circuitId); // opens b with long cooldown
    deps.advance(1_000_001n);
    sys.attemptCall(a.circuitId); // a transitions to HALF_OPEN

    const stats = sys.getStats();
    expect(stats.totalCircuits).toBe(3);
    expect(stats.closedCircuits).toBe(1);
    expect(stats.halfOpenCircuits).toBe(1);
    expect(stats.openCircuits).toBe(1);
  });
});

// ============================================================================
// Full lifecycle
// ============================================================================

describe('full lifecycle', () => {
  it('goes CLOSED -> OPEN -> HALF_OPEN -> CLOSED', () => {
    const { sys, deps } = makeSystem();
    const breaker = sys.registerCircuit('svc-a', 2, 2, 5_000_000n);
    if (!isBreaker(breaker)) return;
    const id = breaker.circuitId;

    expect(sys.getCircuit(id)?.state).toBe('CLOSED');
    sys.recordFailure(id);
    sys.recordFailure(id);
    expect(sys.getCircuit(id)?.state).toBe('OPEN');

    deps.advance(5_000_001n);
    sys.attemptCall(id);
    expect(sys.getCircuit(id)?.state).toBe('HALF_OPEN');

    sys.recordSuccess(id);
    sys.recordSuccess(id);
    expect(sys.getCircuit(id)?.state).toBe('CLOSED');
    expect(sys.getCircuit(id)?.failureCount).toBe(0);
  });

  it('handles multiple independent circuits', () => {
    const { sys } = makeSystem();
    const a = sys.registerCircuit('svc-a', 1, 2, 30_000_000n);
    const b = sys.registerCircuit('svc-b', 5, 2, 30_000_000n);
    if (!isBreaker(a) || !isBreaker(b)) return;

    sys.recordFailure(a.circuitId);
    expect(sys.getCircuit(a.circuitId)?.state).toBe('OPEN');
    expect(sys.getCircuit(b.circuitId)?.state).toBe('CLOSED');

    const callA = sys.attemptCall(a.circuitId);
    const callB = sys.attemptCall(b.circuitId);
    expect(callA).toMatchObject({ allowed: false });
    expect(callB).toMatchObject({ allowed: true });
  });
});
