/**
 * Access Log — Security audit trail, access pattern analysis
 * Fabric: dye-house
 * Thread tier: M (Multi-agent orchestration)
 */

// ============================================================================
// Port Definitions (duplicated per fabric isolation)
// ============================================================================

interface AccessLogClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface AccessLogLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

export type AccessOutcome = 'ALLOWED' | 'DENIED' | 'BLOCKED' | 'RATE_LIMITED';

export interface AccessEvent {
  readonly userId: string;
  readonly resourceId: string;
  readonly action: string;
  readonly outcome: AccessOutcome;
  readonly timestampMicros: bigint;
  readonly ipAddress: string;
  readonly metadata: Record<string, string>;
}

export interface AccessPattern {
  readonly userId: string;
  readonly failureCount: number;
  readonly windowStartMicros: bigint;
  readonly windowEndMicros: bigint;
  readonly suspiciousScore: number;
}

export interface AccessQuery {
  readonly userId?: string;
  readonly resourceId?: string;
  readonly outcome?: AccessOutcome;
  readonly startMicros?: bigint;
  readonly endMicros?: bigint;
  readonly limit?: number;
}

export interface AccessReport {
  readonly totalEvents: number;
  readonly allowedCount: number;
  readonly deniedCount: number;
  readonly blockedCount: number;
  readonly rateLimitedCount: number;
  readonly failureRate: number;
  readonly uniqueUsers: number;
  readonly uniqueResources: number;
}

// ============================================================================
// State
// ============================================================================

interface AccessLogState {
  readonly events: AccessEvent[];
  readonly userFailures: Map<string, number>;
  readonly patterns: Map<string, AccessPattern>;
  totalEvents: bigint;
  totalAllowed: bigint;
  totalDenied: bigint;
  totalBlocked: bigint;
  totalRateLimited: bigint;
  readonly maxEvents: number;
  readonly suspicionThreshold: number;
  readonly failureWindowMicros: bigint;
}

export interface AccessLogDeps {
  readonly clock: AccessLogClockPort;
  readonly logger: AccessLogLoggerPort;
}

export interface AccessLog {
  readonly logAccess: (event: AccessEvent) => void;
  readonly queryAccess: (query: AccessQuery) => AccessEvent[];
  readonly detectSuspiciousPattern: (userId: string) => AccessPattern | 'NO_PATTERN';
  readonly getAccessReport: (startMicros: bigint, endMicros: bigint) => AccessReport;
  readonly getFailureRate: (userId: string) => number;
  readonly pruneOldEvents: (olderThanMicros: bigint) => number;
}

// ============================================================================
// Factory
// ============================================================================

export function createAccessLog(deps: AccessLogDeps): AccessLog {
  const state: AccessLogState = {
    events: [],
    userFailures: new Map(),
    patterns: new Map(),
    totalEvents: 0n,
    totalAllowed: 0n,
    totalDenied: 0n,
    totalBlocked: 0n,
    totalRateLimited: 0n,
    maxEvents: 100000,
    suspicionThreshold: 5,
    failureWindowMicros: 3600000000n,
  };

  return {
    logAccess: (event) => logAccess(state, deps, event),
    queryAccess: (query) => queryAccess(state, query),
    detectSuspiciousPattern: (userId) => detectSuspiciousPattern(state, deps, userId),
    getAccessReport: (start, end) => getAccessReport(state, start, end),
    getFailureRate: (userId) => getFailureRate(state, userId),
    pruneOldEvents: (olderThan) => pruneOldEvents(state, deps, olderThan),
  };
}

// ============================================================================
// Core Functions
// ============================================================================

function logAccess(state: AccessLogState, deps: AccessLogDeps, event: AccessEvent): void {
  state.events.push(event);
  state.totalEvents = state.totalEvents + 1n;

  if (event.outcome === 'ALLOWED') {
    state.totalAllowed = state.totalAllowed + 1n;
  } else if (event.outcome === 'DENIED') {
    state.totalDenied = state.totalDenied + 1n;
    trackFailure(state, event.userId);
  } else if (event.outcome === 'BLOCKED') {
    state.totalBlocked = state.totalBlocked + 1n;
    trackFailure(state, event.userId);
  } else if (event.outcome === 'RATE_LIMITED') {
    state.totalRateLimited = state.totalRateLimited + 1n;
  }

  if (state.events.length > state.maxEvents) {
    state.events.shift();
  }

  deps.logger.info('Access logged', {
    userId: event.userId,
    resourceId: event.resourceId,
    action: event.action,
    outcome: event.outcome,
  });
}

function trackFailure(state: AccessLogState, userId: string): void {
  const current = state.userFailures.get(userId) || 0;
  state.userFailures.set(userId, current + 1);
}

function queryAccess(state: AccessLogState, query: AccessQuery): AccessEvent[] {
  const result: AccessEvent[] = [];
  const limit = query.limit || 1000;

  for (const event of state.events) {
    if (query.userId !== undefined && event.userId !== query.userId) {
      continue;
    }

    if (query.resourceId !== undefined && event.resourceId !== query.resourceId) {
      continue;
    }

    if (query.outcome !== undefined && event.outcome !== query.outcome) {
      continue;
    }

    if (query.startMicros !== undefined && event.timestampMicros < query.startMicros) {
      continue;
    }

    if (query.endMicros !== undefined && event.timestampMicros > query.endMicros) {
      continue;
    }

    result.push(event);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function detectSuspiciousPattern(
  state: AccessLogState,
  deps: AccessLogDeps,
  userId: string,
): AccessPattern | 'NO_PATTERN' {
  const nowMicros = deps.clock.nowMicroseconds();
  const windowStartMicros = nowMicros - state.failureWindowMicros;

  const recentEvents = queryAccess(state, {
    userId,
    startMicros: windowStartMicros,
  });

  const failureCount = recentEvents.filter(
    (e) => e.outcome === 'DENIED' || e.outcome === 'BLOCKED',
  ).length;

  if (failureCount < state.suspicionThreshold) {
    return 'NO_PATTERN';
  }

  const suspiciousScore = Math.min(100, failureCount * 10);

  const pattern: AccessPattern = {
    userId,
    failureCount,
    windowStartMicros,
    windowEndMicros: nowMicros,
    suspiciousScore,
  };

  state.patterns.set(userId, pattern);

  deps.logger.warn('Suspicious pattern detected', {
    userId,
    failureCount,
    suspiciousScore,
  });

  return pattern;
}

function getAccessReport(
  state: AccessLogState,
  startMicros: bigint,
  endMicros: bigint,
): AccessReport {
  const events = queryAccess(state, { startMicros, endMicros });

  const allowedCount = events.filter((e) => e.outcome === 'ALLOWED').length;
  const deniedCount = events.filter((e) => e.outcome === 'DENIED').length;
  const blockedCount = events.filter((e) => e.outcome === 'BLOCKED').length;
  const rateLimitedCount = events.filter((e) => e.outcome === 'RATE_LIMITED').length;

  const uniqueUsers = new Set(events.map((e) => e.userId)).size;
  const uniqueResources = new Set(events.map((e) => e.resourceId)).size;

  const totalCount = events.length;
  const failureCount = deniedCount + blockedCount;
  const failureRate = totalCount > 0 ? failureCount / totalCount : 0;

  return {
    totalEvents: totalCount,
    allowedCount,
    deniedCount,
    blockedCount,
    rateLimitedCount,
    failureRate,
    uniqueUsers,
    uniqueResources,
  };
}

function getFailureRate(state: AccessLogState, userId: string): number {
  const events = queryAccess(state, { userId });

  if (events.length === 0) {
    return 0;
  }

  const failureCount = events.filter(
    (e) => e.outcome === 'DENIED' || e.outcome === 'BLOCKED',
  ).length;

  return failureCount / events.length;
}

function pruneOldEvents(
  state: AccessLogState,
  deps: AccessLogDeps,
  olderThanMicros: bigint,
): number {
  const initialLength = state.events.length;

  const filtered: AccessEvent[] = [];
  for (const event of state.events) {
    if (event.timestampMicros >= olderThanMicros) {
      filtered.push(event);
    }
  }

  state.events.length = 0;
  for (const event of filtered) {
    state.events.push(event);
  }

  const pruned = initialLength - state.events.length;

  if (pruned > 0) {
    deps.logger.info('Pruned old events', { count: pruned });
  }

  return pruned;
}
