import { describe, it, expect } from 'vitest';
import { createCircuitBreakerSystem, type CircuitId } from '../circuit-breaker-system.js';

function makeDeps(start = 0n) {
  let time = start;
  return {
    deps: {
      clock: { now: () => time },
      idGen: { generate: () => `id-${++idCounter}` },
      logger: { info: () => {}, warn: () => {} },
    },
    advance: (us: bigint) => { time += us; },
  };
}
let idCounter = 0;

describe('Circuit Breaker System Simulation', () => {
  it('registers circuits and trips after threshold failures', () => {
    const { deps } = makeDeps(1_000_000n);
    const system = createCircuitBreakerSystem(deps);

    const circuitResult = system.registerCircuit('payment-svc', 3, 2, 5_000_000n);
    const circuitId = (circuitResult as { circuitId: CircuitId }).circuitId;
    expect(circuitResult).not.toBe('invalid-threshold');

    // Under threshold - circuit stays closed
    system.recordFailure(circuitId);
    system.recordFailure(circuitId);
    expect(system.getCircuit(circuitId)?.state).toBe('CLOSED');

    // Third failure trips the circuit
    system.recordFailure(circuitId);
    expect(system.getCircuit(circuitId)?.state).toBe('OPEN');
  });

  it('half-opens after timeout and closes on successes', () => {
    const { deps, advance } = makeDeps(1_000_000n);
    const system = createCircuitBreakerSystem(deps);

    const circuitResult = system.registerCircuit('auth-svc', 2, 2, 3_000_000n);
    const circuitId = (circuitResult as { circuitId: CircuitId }).circuitId;

    system.recordFailure(circuitId);
    system.recordFailure(circuitId);
    expect(system.getCircuit(circuitId)?.state).toBe('OPEN');

    // Advance past the half-open timeout, then attempt a call to trigger transition
    advance(4_000_000n);
    const attempt = system.attemptCall(circuitId) as { allowed: boolean };
    expect(attempt.allowed).toBe(true);
    expect(system.getCircuit(circuitId)?.state).toBe('HALF_OPEN');

    // Two successes meets successThreshold (2), closes the circuit
    system.recordSuccess(circuitId);
    system.recordSuccess(circuitId);
    expect(system.getCircuit(circuitId)?.state).toBe('CLOSED');
  });

  it('rejects invalid threshold registration', () => {
    const { deps } = makeDeps();
    const system = createCircuitBreakerSystem(deps);
    const result = system.registerCircuit('bad-svc', 0, 1, 1_000_000n);
    expect(result).toBe('invalid-threshold');
  });
});

