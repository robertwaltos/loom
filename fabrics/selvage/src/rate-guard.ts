/**
 * Rate Guard — Connection-aware rate limiting for the API gateway.
 *
 * Wraps the dye-house RateLimiter via a port to provide
 * connection-level rate gating with structured rejection
 * responses. Tracks per-connection violation counts for
 * potential disconnection of abusive clients.
 *
 * "The Selvage guards the entry. Too many threads fray the edge."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface RateGuardResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterUs: number;
  readonly violationCount: number;
}

export interface RateGuardConfig {
  readonly maxViolationsBeforeDisconnect: number;
}

export const DEFAULT_RATE_GUARD_CONFIG: RateGuardConfig = {
  maxViolationsBeforeDisconnect: 50,
};

export interface ConnectionViolation {
  readonly connectionId: string;
  readonly totalViolations: number;
  readonly shouldDisconnect: boolean;
  readonly lastAction: string;
  readonly lastViolationAt: number;
}

export interface RateGuardStats {
  readonly trackedConnections: number;
  readonly totalChecks: number;
  readonly totalBlocked: number;
  readonly totalDisconnectRecommendations: number;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface RateLimitPort {
  check(identityId: string, action: string): RateLimitPortResult;
  consume(identityId: string, action: string): RateLimitPortResult;
}

export interface RateLimitPortResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterMicroseconds: number;
}

export interface RateGuardDeps {
  readonly rateLimiter: RateLimitPort;
  readonly clock: { nowMicroseconds(): number };
  readonly config?: Partial<RateGuardConfig>;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface RateGuard {
  check(connectionId: string, action: string): RateGuardResult;
  consume(connectionId: string, action: string): RateGuardResult;
  getViolation(connectionId: string): ConnectionViolation | undefined;
  resetConnection(connectionId: string): boolean;
  getStats(): RateGuardStats;
}

// ─── State ──────────────────────────────────────────────────────────

interface ConnectionState {
  totalViolations: number;
  lastAction: string;
  lastViolationAt: number;
}

interface GuardState {
  readonly connections: Map<string, ConnectionState>;
  readonly config: RateGuardConfig;
  readonly deps: RateGuardDeps;
  totalChecks: number;
  totalBlocked: number;
  totalDisconnectRecommendations: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createRateGuard(deps: RateGuardDeps): RateGuard {
  const config: RateGuardConfig = {
    ...DEFAULT_RATE_GUARD_CONFIG,
    ...deps.config,
  };

  const state: GuardState = {
    connections: new Map(),
    config,
    deps,
    totalChecks: 0,
    totalBlocked: 0,
    totalDisconnectRecommendations: 0,
  };

  return {
    check: (c, a) => checkImpl(state, c, a),
    consume: (c, a) => consumeImpl(state, c, a),
    getViolation: (c) => getViolationImpl(state, c),
    resetConnection: (c) => resetConnectionImpl(state, c),
    getStats: () => buildStats(state),
  };
}

// ─── Check (non-consuming) ──────────────────────────────────────────

function checkImpl(
  state: GuardState,
  connectionId: string,
  action: string,
): RateGuardResult {
  state.totalChecks += 1;
  const result = state.deps.rateLimiter.check(connectionId, action);
  if (result.allowed) {
    return buildAllowedResult(state, connectionId, result);
  }
  return handleBlocked(state, connectionId, action, result);
}

// ─── Consume ────────────────────────────────────────────────────────

function consumeImpl(
  state: GuardState,
  connectionId: string,
  action: string,
): RateGuardResult {
  state.totalChecks += 1;
  const result = state.deps.rateLimiter.consume(connectionId, action);
  if (result.allowed) {
    return buildAllowedResult(state, connectionId, result);
  }
  return handleBlocked(state, connectionId, action, result);
}

// ─── Result Builders ────────────────────────────────────────────────

function buildAllowedResult(
  state: GuardState,
  connectionId: string,
  portResult: RateLimitPortResult,
): RateGuardResult {
  const conn = state.connections.get(connectionId);
  return {
    allowed: true,
    remaining: portResult.remaining,
    retryAfterUs: 0,
    violationCount: conn?.totalViolations ?? 0,
  };
}

function handleBlocked(
  state: GuardState,
  connectionId: string,
  action: string,
  portResult: RateLimitPortResult,
): RateGuardResult {
  state.totalBlocked += 1;
  const conn = getOrCreateConnection(state, connectionId);
  conn.totalViolations += 1;
  conn.lastAction = action;
  conn.lastViolationAt = state.deps.clock.nowMicroseconds();

  const shouldDisconnect = conn.totalViolations >= state.config.maxViolationsBeforeDisconnect;
  if (shouldDisconnect) {
    state.totalDisconnectRecommendations += 1;
  }

  return {
    allowed: false,
    remaining: 0,
    retryAfterUs: portResult.retryAfterMicroseconds,
    violationCount: conn.totalViolations,
  };
}

// ─── Connection Management ──────────────────────────────────────────

function getOrCreateConnection(
  state: GuardState,
  connectionId: string,
): ConnectionState {
  const existing = state.connections.get(connectionId);
  if (existing !== undefined) return existing;

  const conn: ConnectionState = {
    totalViolations: 0,
    lastAction: '',
    lastViolationAt: 0,
  };
  state.connections.set(connectionId, conn);
  return conn;
}

function resetConnectionImpl(
  state: GuardState,
  connectionId: string,
): boolean {
  return state.connections.delete(connectionId);
}

// ─── Queries ────────────────────────────────────────────────────────

function getViolationImpl(
  state: GuardState,
  connectionId: string,
): ConnectionViolation | undefined {
  const conn = state.connections.get(connectionId);
  if (conn === undefined) return undefined;

  return {
    connectionId,
    totalViolations: conn.totalViolations,
    shouldDisconnect: conn.totalViolations >= state.config.maxViolationsBeforeDisconnect,
    lastAction: conn.lastAction,
    lastViolationAt: conn.lastViolationAt,
  };
}

// ─── Stats ──────────────────────────────────────────────────────────

function buildStats(state: GuardState): RateGuardStats {
  return {
    trackedConnections: state.connections.size,
    totalChecks: state.totalChecks,
    totalBlocked: state.totalBlocked,
    totalDisconnectRecommendations: state.totalDisconnectRecommendations,
  };
}
