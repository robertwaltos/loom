/**
 * circuit-breaker-system.ts — Circuit breaker to prevent cascade failures.
 *
 * Circuits transition: CLOSED → OPEN → HALF_OPEN → CLOSED.
 * In CLOSED: accumulate failures; trip OPEN when failureThreshold reached.
 * In OPEN: block calls; after cooldownUs has elapsed, transition to HALF_OPEN.
 * In HALF_OPEN: allow calls; accumulate successes; close when successThreshold met,
 *               or re-open on any failure.
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  warn(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type CircuitId = string;
export type ServiceId = string;

export type BreakerError =
  | 'circuit-not-found'
  | 'already-registered'
  | 'invalid-threshold'
  | 'circuit-open';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type CircuitBreaker = {
  circuitId: CircuitId;
  serviceId: ServiceId;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  failureThreshold: number;
  successThreshold: number;
  openedAt: bigint | null;
  lastCheckedAt: bigint;
  cooldownUs: bigint;
};

export type CallResult = {
  success: boolean;
  circuitState: CircuitState;
  message: string;
};

export type BreakerStats = {
  totalCircuits: number;
  openCircuits: number;
  halfOpenCircuits: number;
  closedCircuits: number;
};

// ============================================================================
// SYSTEM INTERFACE
// ============================================================================

export type CircuitBreakerSystem = {
  registerCircuit(
    serviceId: ServiceId,
    failureThreshold: number,
    successThreshold: number,
    cooldownUs: bigint,
  ): CircuitBreaker | BreakerError;
  recordSuccess(
    circuitId: CircuitId,
  ): { success: true; result: CallResult } | { success: false; error: BreakerError };
  recordFailure(
    circuitId: CircuitId,
  ): { success: true; result: CallResult } | { success: false; error: BreakerError };
  attemptCall(
    circuitId: CircuitId,
  ): { allowed: boolean; state: CircuitState } | { success: false; error: BreakerError };
  resetCircuit(circuitId: CircuitId): { success: true } | { success: false; error: BreakerError };
  getCircuit(circuitId: CircuitId): CircuitBreaker | undefined;
  getStats(): BreakerStats;
};

// ============================================================================
// STATE
// ============================================================================

type MutableBreaker = {
  circuitId: CircuitId;
  serviceId: ServiceId;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  failureThreshold: number;
  successThreshold: number;
  openedAt: bigint | null;
  lastCheckedAt: bigint;
  cooldownUs: bigint;
};

type CircuitBreakerSystemState = {
  circuits: Map<CircuitId, MutableBreaker>;
};

// ============================================================================
// HELPERS
// ============================================================================

function toSnapshot(b: MutableBreaker): CircuitBreaker {
  return {
    circuitId: b.circuitId,
    serviceId: b.serviceId,
    state: b.state,
    failureCount: b.failureCount,
    successCount: b.successCount,
    failureThreshold: b.failureThreshold,
    successThreshold: b.successThreshold,
    openedAt: b.openedAt,
    lastCheckedAt: b.lastCheckedAt,
    cooldownUs: b.cooldownUs,
  };
}

function makeCallResult(success: boolean, state: CircuitState, message: string): CallResult {
  return { success, circuitState: state, message };
}

function checkAndTransitionOpen(b: MutableBreaker, now: bigint): void {
  if (b.state !== 'OPEN' || b.openedAt === null) return;
  if (now - b.openedAt >= b.cooldownUs) {
    b.state = 'HALF_OPEN';
    b.lastCheckedAt = now;
  }
}

// ============================================================================
// OPERATIONS
// ============================================================================

function registerCircuit(
  state: CircuitBreakerSystemState,
  serviceId: ServiceId,
  failureThreshold: number,
  successThreshold: number,
  cooldownUs: bigint,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
): CircuitBreaker | BreakerError {
  if (failureThreshold < 1 || successThreshold < 1) return 'invalid-threshold';

  const circuitId = idGen.generate();
  const breaker: MutableBreaker = {
    circuitId,
    serviceId,
    state: 'CLOSED',
    failureCount: 0,
    successCount: 0,
    failureThreshold,
    successThreshold,
    openedAt: null,
    lastCheckedAt: clock.now(),
    cooldownUs,
  };

  state.circuits.set(circuitId, breaker);
  logger.info('Circuit registered: ' + circuitId + ' for ' + serviceId);
  return toSnapshot(breaker);
}

function recordSuccess(
  state: CircuitBreakerSystemState,
  circuitId: CircuitId,
  clock: Clock,
): { success: true; result: CallResult } | { success: false; error: BreakerError } {
  const b = state.circuits.get(circuitId);
  if (!b) return { success: false, error: 'circuit-not-found' };
  if (b.state === 'OPEN') return { success: false, error: 'circuit-open' };

  b.lastCheckedAt = clock.now();
  b.successCount += 1;

  if (b.state === 'HALF_OPEN' && b.successCount >= b.successThreshold) {
    b.state = 'CLOSED';
    b.failureCount = 0;
    b.successCount = 0;
    b.openedAt = null;
  }

  return { success: true, result: makeCallResult(true, b.state, 'success recorded') };
}

function recordFailure(
  state: CircuitBreakerSystemState,
  circuitId: CircuitId,
  clock: Clock,
): { success: true; result: CallResult } | { success: false; error: BreakerError } {
  const b = state.circuits.get(circuitId);
  if (!b) return { success: false, error: 'circuit-not-found' };
  if (b.state === 'OPEN') return { success: false, error: 'circuit-open' };

  const now = clock.now();
  b.lastCheckedAt = now;

  if (b.state === 'HALF_OPEN') {
    b.state = 'OPEN';
    b.openedAt = now;
    b.failureCount = 0;
    b.successCount = 0;
    return {
      success: true,
      result: makeCallResult(false, 'OPEN', 'failure in half-open, circuit re-opened'),
    };
  }

  b.failureCount += 1;
  if (b.failureCount >= b.failureThreshold) {
    b.state = 'OPEN';
    b.openedAt = now;
    b.successCount = 0;
  }

  return { success: true, result: makeCallResult(false, b.state, 'failure recorded') };
}

function attemptCall(
  state: CircuitBreakerSystemState,
  circuitId: CircuitId,
  clock: Clock,
): { allowed: boolean; state: CircuitState } | { success: false; error: BreakerError } {
  const b = state.circuits.get(circuitId);
  if (!b) return { success: false, error: 'circuit-not-found' };

  const now = clock.now();
  checkAndTransitionOpen(b, now);
  b.lastCheckedAt = now;

  if (b.state === 'OPEN') return { allowed: false, state: 'OPEN' };
  return { allowed: true, state: b.state };
}

function resetCircuit(
  state: CircuitBreakerSystemState,
  circuitId: CircuitId,
  clock: Clock,
): { success: true } | { success: false; error: BreakerError } {
  const b = state.circuits.get(circuitId);
  if (!b) return { success: false, error: 'circuit-not-found' };

  b.state = 'CLOSED';
  b.failureCount = 0;
  b.successCount = 0;
  b.openedAt = null;
  b.lastCheckedAt = clock.now();
  return { success: true };
}

function getStats(state: CircuitBreakerSystemState): BreakerStats {
  let openCircuits = 0;
  let halfOpenCircuits = 0;
  let closedCircuits = 0;

  for (const b of state.circuits.values()) {
    if (b.state === 'OPEN') openCircuits += 1;
    else if (b.state === 'HALF_OPEN') halfOpenCircuits += 1;
    else closedCircuits += 1;
  }

  return {
    totalCircuits: state.circuits.size,
    openCircuits,
    halfOpenCircuits,
    closedCircuits,
  };
}

// ============================================================================
// FACTORY
// ============================================================================

export type CircuitBreakerSystemDeps = {
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
};

export function createCircuitBreakerSystem(deps: CircuitBreakerSystemDeps): CircuitBreakerSystem {
  const state: CircuitBreakerSystemState = { circuits: new Map() };

  return {
    registerCircuit: (serviceId, failureThreshold, successThreshold, cooldownUs) =>
      registerCircuit(
        state,
        serviceId,
        failureThreshold,
        successThreshold,
        cooldownUs,
        deps.clock,
        deps.idGen,
        deps.logger,
      ),
    recordSuccess: (circuitId) => recordSuccess(state, circuitId, deps.clock),
    recordFailure: (circuitId) => recordFailure(state, circuitId, deps.clock),
    attemptCall: (circuitId) => attemptCall(state, circuitId, deps.clock),
    resetCircuit: (circuitId) => resetCircuit(state, circuitId, deps.clock),
    getCircuit: (circuitId) => {
      const b = state.circuits.get(circuitId);
      return b ? toSnapshot(b) : undefined;
    },
    getStats: () => getStats(state),
  };
}
