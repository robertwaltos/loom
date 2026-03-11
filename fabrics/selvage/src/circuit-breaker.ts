/**
 * circuit-breaker.ts — Circuit breaker for Selvage service protection.
 *
 * Prevents cascading failures by tracking failure rates per service
 * and automatically opening circuits when thresholds are exceeded.
 * Circuits transition through CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 * with configurable thresholds, timeouts, and half-open probe counts.
 */

// ── Ports ────────────────────────────────────────────────────────

interface CircuitBreakerClock {
  readonly nowMicroseconds: () => number;
}

interface CircuitBreakerDeps {
  readonly clock: CircuitBreakerClock;
}

// ── Types ────────────────────────────────────────────────────────

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly halfOpenTimeoutUs: number;
  readonly halfOpenMaxProbes: number;
  readonly successThresholdToClose: number;
  readonly failureWindowUs: number;
}

interface CircuitRecord {
  readonly serviceId: string;
  readonly state: CircuitState;
  readonly failureCount: number;
  readonly successCount: number;
  readonly lastFailureAt: number;
  readonly lastSuccessAt: number;
  readonly lastStateChangeAt: number;
  readonly totalRequests: number;
  readonly totalFailures: number;
  readonly totalSuccesses: number;
  readonly halfOpenProbes: number;
}

interface CircuitEvent {
  readonly serviceId: string;
  readonly fromState: CircuitState;
  readonly toState: CircuitState;
  readonly occurredAt: number;
  readonly reason: string;
}

interface CircuitBreakerResult {
  readonly allowed: boolean;
  readonly serviceId: string;
  readonly state: CircuitState;
  readonly reason: string;
}

interface FailureMetrics {
  readonly serviceId: string;
  readonly failureCount: number;
  readonly failureRate: number;
  readonly lastFailureAt: number;
  readonly windowDurationUs: number;
}

interface CircuitBreakerStats {
  readonly totalCircuits: number;
  readonly closedCount: number;
  readonly openCount: number;
  readonly halfOpenCount: number;
  readonly totalTransitions: number;
}

interface CircuitBreaker {
  readonly registerCircuit: (
    serviceId: string,
    config?: Partial<CircuitBreakerConfig>,
  ) => CircuitRecord;
  readonly recordSuccess: (serviceId: string) => CircuitRecord | string;
  readonly recordFailure: (serviceId: string) => CircuitRecord | string;
  readonly isAllowed: (serviceId: string) => boolean;
  readonly tryExecute: (serviceId: string) => CircuitBreakerResult;
  readonly reset: (serviceId: string) => CircuitRecord | string;
  readonly getCircuit: (serviceId: string) => CircuitRecord | undefined;
  readonly getFailureMetrics: (serviceId: string) => FailureMetrics;
  readonly listByState: (state: CircuitState) => readonly CircuitRecord[];
  readonly tick: () => number;
  readonly getStats: () => CircuitBreakerStats;
}

// ── Constants ────────────────────────────────────────────────────

const FAILURE_THRESHOLD_DEFAULT = 5;
const HALF_OPEN_TIMEOUT_US = 30_000_000;

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: FAILURE_THRESHOLD_DEFAULT,
  halfOpenTimeoutUs: HALF_OPEN_TIMEOUT_US,
  halfOpenMaxProbes: 3,
  successThresholdToClose: 2,
  failureWindowUs: 60_000_000,
};

// ── State ────────────────────────────────────────────────────────

interface MutableCircuit {
  readonly serviceId: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: number;
  lastSuccessAt: number;
  lastStateChangeAt: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  halfOpenProbes: number;
  readonly config: CircuitBreakerConfig;
}

interface CircuitBreakerState {
  readonly deps: CircuitBreakerDeps;
  readonly defaultConfig: CircuitBreakerConfig;
  readonly circuits: Map<string, MutableCircuit>;
  readonly events: CircuitEvent[];
  transitionCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function toRecord(circuit: MutableCircuit): CircuitRecord {
  return {
    serviceId: circuit.serviceId,
    state: circuit.state,
    failureCount: circuit.failureCount,
    successCount: circuit.successCount,
    lastFailureAt: circuit.lastFailureAt,
    lastSuccessAt: circuit.lastSuccessAt,
    lastStateChangeAt: circuit.lastStateChangeAt,
    totalRequests: circuit.totalRequests,
    totalFailures: circuit.totalFailures,
    totalSuccesses: circuit.totalSuccesses,
    halfOpenProbes: circuit.halfOpenProbes,
  };
}

function mergeCircuitConfig(
  base: CircuitBreakerConfig,
  overrides?: Partial<CircuitBreakerConfig>,
): CircuitBreakerConfig {
  if (!overrides) return base;
  return {
    failureThreshold: overrides.failureThreshold ?? base.failureThreshold,
    halfOpenTimeoutUs: overrides.halfOpenTimeoutUs ?? base.halfOpenTimeoutUs,
    halfOpenMaxProbes: overrides.halfOpenMaxProbes ?? base.halfOpenMaxProbes,
    successThresholdToClose: overrides.successThresholdToClose ?? base.successThresholdToClose,
    failureWindowUs: overrides.failureWindowUs ?? base.failureWindowUs,
  };
}

function transitionTo(
  s: CircuitBreakerState,
  circuit: MutableCircuit,
  newState: CircuitState,
  reason: string,
): void {
  const event: CircuitEvent = {
    serviceId: circuit.serviceId,
    fromState: circuit.state,
    toState: newState,
    occurredAt: s.deps.clock.nowMicroseconds(),
    reason,
  };
  circuit.state = newState;
  circuit.lastStateChangeAt = event.occurredAt;
  s.events.push(event);
  s.transitionCount += 1;
}

function isFailureWindowExpired(circuit: MutableCircuit, nowUs: number): boolean {
  if (circuit.failureCount === 0) return false;
  return nowUs - circuit.lastFailureAt > circuit.config.failureWindowUs;
}

function resetWindowCounters(circuit: MutableCircuit): void {
  circuit.failureCount = 0;
  circuit.successCount = 0;
}

// ── Operations ───────────────────────────────────────────────────

function registerCircuitImpl(
  state: CircuitBreakerState,
  serviceId: string,
  configOverrides?: Partial<CircuitBreakerConfig>,
): CircuitRecord {
  const existing = state.circuits.get(serviceId);
  if (existing) return toRecord(existing);
  const config = mergeCircuitConfig(state.defaultConfig, configOverrides);
  const now = state.deps.clock.nowMicroseconds();
  const circuit: MutableCircuit = {
    serviceId,
    state: 'CLOSED',
    failureCount: 0,
    successCount: 0,
    lastFailureAt: 0,
    lastSuccessAt: 0,
    lastStateChangeAt: now,
    totalRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    halfOpenProbes: 0,
    config,
  };
  state.circuits.set(serviceId, circuit);
  return toRecord(circuit);
}

function recordSuccessImpl(state: CircuitBreakerState, serviceId: string): CircuitRecord | string {
  const circuit = state.circuits.get(serviceId);
  if (!circuit) return 'CIRCUIT_NOT_FOUND';
  circuit.totalRequests += 1;
  circuit.totalSuccesses += 1;
  circuit.successCount += 1;
  circuit.lastSuccessAt = state.deps.clock.nowMicroseconds();
  if (circuit.state === 'HALF_OPEN') {
    handleHalfOpenSuccess(state, circuit);
  }
  return toRecord(circuit);
}

function handleHalfOpenSuccess(state: CircuitBreakerState, circuit: MutableCircuit): void {
  if (circuit.successCount >= circuit.config.successThresholdToClose) {
    transitionTo(state, circuit, 'CLOSED', 'success threshold met in half-open');
    resetWindowCounters(circuit);
    circuit.halfOpenProbes = 0;
  }
}

function recordFailureImpl(state: CircuitBreakerState, serviceId: string): CircuitRecord | string {
  const circuit = state.circuits.get(serviceId);
  if (!circuit) return 'CIRCUIT_NOT_FOUND';
  const now = state.deps.clock.nowMicroseconds();
  circuit.totalRequests += 1;
  circuit.totalFailures += 1;
  if (circuit.state === 'CLOSED') {
    return handleClosedFailure(state, circuit, now);
  }
  circuit.failureCount += 1;
  circuit.lastFailureAt = now;
  if (circuit.state === 'HALF_OPEN') {
    return handleHalfOpenFailure(state, circuit);
  }
  return toRecord(circuit);
}

function handleHalfOpenFailure(state: CircuitBreakerState, circuit: MutableCircuit): CircuitRecord {
  transitionTo(state, circuit, 'OPEN', 'failure during half-open probe');
  circuit.halfOpenProbes = 0;
  resetWindowCounters(circuit);
  return toRecord(circuit);
}

function handleClosedFailure(
  state: CircuitBreakerState,
  circuit: MutableCircuit,
  nowUs: number,
): CircuitRecord {
  if (isFailureWindowExpired(circuit, nowUs)) {
    resetWindowCounters(circuit);
  }
  circuit.failureCount += 1;
  circuit.lastFailureAt = nowUs;
  if (circuit.failureCount >= circuit.config.failureThreshold) {
    transitionTo(state, circuit, 'OPEN', 'failure threshold exceeded');
    resetWindowCounters(circuit);
  }
  return toRecord(circuit);
}

function isAllowedImpl(state: CircuitBreakerState, serviceId: string): boolean {
  const circuit = state.circuits.get(serviceId);
  if (!circuit) return true;
  if (circuit.state === 'CLOSED') return true;
  if (circuit.state === 'OPEN') {
    return checkOpenTimeout(state, circuit);
  }
  return circuit.halfOpenProbes < circuit.config.halfOpenMaxProbes;
}

function checkOpenTimeout(state: CircuitBreakerState, circuit: MutableCircuit): boolean {
  const now = state.deps.clock.nowMicroseconds();
  const elapsed = now - circuit.lastStateChangeAt;
  if (elapsed >= circuit.config.halfOpenTimeoutUs) {
    transitionTo(state, circuit, 'HALF_OPEN', 'timeout expired, entering half-open');
    resetWindowCounters(circuit);
    circuit.halfOpenProbes = 0;
    return true;
  }
  return false;
}

function tryExecuteImpl(state: CircuitBreakerState, serviceId: string): CircuitBreakerResult {
  const circuit = state.circuits.get(serviceId);
  if (!circuit) {
    return {
      allowed: true,
      serviceId,
      state: 'CLOSED',
      reason: 'no circuit registered, allowing by default',
    };
  }
  const allowed = isAllowedImpl(state, serviceId);
  if (allowed && circuit.state === 'HALF_OPEN') {
    circuit.halfOpenProbes += 1;
  }
  return {
    allowed,
    serviceId,
    state: circuit.state,
    reason: allowed ? 'request allowed' : 'circuit is ' + circuit.state + ', request rejected',
  };
}

function resetImpl(state: CircuitBreakerState, serviceId: string): CircuitRecord | string {
  const circuit = state.circuits.get(serviceId);
  if (!circuit) return 'CIRCUIT_NOT_FOUND';
  if (circuit.state !== 'CLOSED') {
    transitionTo(state, circuit, 'CLOSED', 'manual reset');
  }
  resetWindowCounters(circuit);
  circuit.halfOpenProbes = 0;
  return toRecord(circuit);
}

function getFailureMetricsImpl(state: CircuitBreakerState, serviceId: string): FailureMetrics {
  const circuit = state.circuits.get(serviceId);
  if (!circuit) {
    return {
      serviceId,
      failureCount: 0,
      failureRate: 0,
      lastFailureAt: 0,
      windowDurationUs: 0,
    };
  }
  const rate = circuit.totalRequests > 0 ? circuit.totalFailures / circuit.totalRequests : 0;
  return {
    serviceId: circuit.serviceId,
    failureCount: circuit.failureCount,
    failureRate: rate,
    lastFailureAt: circuit.lastFailureAt,
    windowDurationUs: circuit.config.failureWindowUs,
  };
}

function listByStateImpl(state: CircuitBreakerState, targetState: CircuitState): CircuitRecord[] {
  const result: CircuitRecord[] = [];
  for (const circuit of state.circuits.values()) {
    if (circuit.state === targetState) {
      result.push(toRecord(circuit));
    }
  }
  return result;
}

function tickImpl(state: CircuitBreakerState): number {
  let transitioned = 0;
  const now = state.deps.clock.nowMicroseconds();
  for (const circuit of state.circuits.values()) {
    if (circuit.state !== 'OPEN') continue;
    const elapsed = now - circuit.lastStateChangeAt;
    if (elapsed < circuit.config.halfOpenTimeoutUs) continue;
    transitionTo(state, circuit, 'HALF_OPEN', 'timeout expired via tick');
    resetWindowCounters(circuit);
    circuit.halfOpenProbes = 0;
    transitioned += 1;
  }
  return transitioned;
}

function getStatsImpl(state: CircuitBreakerState): CircuitBreakerStats {
  let closed = 0;
  let open = 0;
  let halfOpen = 0;
  for (const circuit of state.circuits.values()) {
    if (circuit.state === 'CLOSED') closed += 1;
    else if (circuit.state === 'OPEN') open += 1;
    else halfOpen += 1;
  }
  return {
    totalCircuits: state.circuits.size,
    closedCount: closed,
    openCount: open,
    halfOpenCount: halfOpen,
    totalTransitions: state.transitionCount,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createCircuitBreaker(
  deps: CircuitBreakerDeps,
  config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
  const state: CircuitBreakerState = {
    deps,
    defaultConfig: mergeCircuitConfig(DEFAULT_CIRCUIT_CONFIG, config),
    circuits: new Map(),
    events: [],
    transitionCount: 0,
  };
  return {
    registerCircuit: (id, cfg) => registerCircuitImpl(state, id, cfg),
    recordSuccess: (id) => recordSuccessImpl(state, id),
    recordFailure: (id) => recordFailureImpl(state, id),
    isAllowed: (id) => isAllowedImpl(state, id),
    tryExecute: (id) => tryExecuteImpl(state, id),
    reset: (id) => resetImpl(state, id),
    getCircuit: (id) => {
      const c = state.circuits.get(id);
      return c ? toRecord(c) : undefined;
    },
    getFailureMetrics: (id) => getFailureMetricsImpl(state, id),
    listByState: (s) => listByStateImpl(state, s),
    tick: () => tickImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export {
  createCircuitBreaker,
  DEFAULT_CIRCUIT_CONFIG,
  FAILURE_THRESHOLD_DEFAULT,
  HALF_OPEN_TIMEOUT_US,
};

export type {
  CircuitBreaker,
  CircuitBreakerDeps,
  CircuitBreakerConfig,
  CircuitState,
  CircuitRecord,
  CircuitEvent,
  CircuitBreakerResult,
  FailureMetrics,
  CircuitBreakerStats,
};
