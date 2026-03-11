/**
 * Request Deduplicator — Idempotent request handling, dedup cache
 * Fabric: selvage
 * Thread tier: M (Multi-agent orchestration)
 */

// ============================================================================
// Port Definitions (duplicated per fabric isolation)
// ============================================================================

interface DeduplicatorClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface DeduplicatorLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

export type IdempotencyKey = string;

export interface DeduplicatedRequest {
  readonly key: IdempotencyKey;
  readonly method: string;
  readonly path: string;
  readonly body: string;
  readonly timestampMicros: bigint;
}

export interface DeduplicatorEntry {
  readonly request: DeduplicatedRequest;
  readonly result: string;
  readonly expiresAtMicros: bigint;
  readonly hitCount: number;
}

export type CheckResult =
  | { readonly status: 'NEW' }
  | { readonly status: 'IN_PROGRESS' }
  | { readonly status: 'COMPLETED'; readonly result: string; readonly age: bigint };

export type RecordRequestResult = 'OK' | 'ALREADY_RECORDED';
export type RecordResultResult = 'OK' | 'REQUEST_NOT_FOUND';
export type GetResultResult = string | 'REQUEST_NOT_FOUND' | 'RESULT_NOT_READY';

// ============================================================================
// State
// ============================================================================

interface DeduplicatorState {
  readonly entries: Map<IdempotencyKey, DeduplicatorEntry>;
  readonly inProgress: Set<IdempotencyKey>;
  totalRequests: bigint;
  totalDuplicates: bigint;
  totalPruned: bigint;
  ttlMicros: bigint;
}

export interface DeduplicatorDeps {
  readonly clock: DeduplicatorClockPort;
  readonly logger: DeduplicatorLoggerPort;
}

export interface RequestDeduplicator {
  readonly checkDuplicate: (key: IdempotencyKey) => CheckResult;
  readonly recordRequest: (request: DeduplicatedRequest) => RecordRequestResult;
  readonly recordResult: (key: IdempotencyKey, result: string) => RecordResultResult;
  readonly getResult: (key: IdempotencyKey) => GetResultResult;
  readonly pruneExpired: () => number;
  readonly setTtl: (ttlMicros: bigint) => void;
  readonly getStats: () => {
    readonly totalRequests: bigint;
    readonly totalDuplicates: bigint;
    readonly totalPruned: bigint;
    readonly cacheSize: number;
  };
}

// ============================================================================
// Factory
// ============================================================================

export function createRequestDeduplicator(deps: DeduplicatorDeps): RequestDeduplicator {
  const state: DeduplicatorState = {
    entries: new Map(),
    inProgress: new Set(),
    totalRequests: 0n,
    totalDuplicates: 0n,
    totalPruned: 0n,
    ttlMicros: 3600000000n,
  };

  return {
    checkDuplicate: (key) => checkDuplicate(state, deps, key),
    recordRequest: (request) => recordRequest(state, deps, request),
    recordResult: (key, result) => recordResult(state, deps, key, result),
    getResult: (key) => getResult(state, key),
    pruneExpired: () => pruneExpired(state, deps),
    setTtl: (ttl) => setTtl(state, ttl),
    getStats: () => getStats(state),
  };
}

// ============================================================================
// Core Functions
// ============================================================================

function checkDuplicate(
  state: DeduplicatorState,
  deps: DeduplicatorDeps,
  key: IdempotencyKey,
): CheckResult {
  state.totalRequests = state.totalRequests + 1n;

  const entry = state.entries.get(key);
  if (entry !== undefined) {
    const nowMicros = deps.clock.nowMicroseconds();
    if (nowMicros < entry.expiresAtMicros) {
      state.totalDuplicates = state.totalDuplicates + 1n;

      const newEntry: DeduplicatorEntry = {
        ...entry,
        hitCount: entry.hitCount + 1,
      };
      state.entries.set(key, newEntry);

      const age = nowMicros - entry.request.timestampMicros;

      deps.logger.info('Duplicate request detected', {
        key,
        hitCount: newEntry.hitCount,
        ageMicros: String(age),
      });

      return {
        status: 'COMPLETED',
        result: entry.result,
        age,
      };
    }

    state.entries.delete(key);
  }

  if (state.inProgress.has(key)) {
    deps.logger.info('Request in progress', { key });
    return { status: 'IN_PROGRESS' };
  }

  deps.logger.info('New request', { key });
  return { status: 'NEW' };
}

function recordRequest(
  state: DeduplicatorState,
  deps: DeduplicatorDeps,
  request: DeduplicatedRequest,
): RecordRequestResult {
  if (state.inProgress.has(request.key)) {
    return 'ALREADY_RECORDED';
  }

  state.inProgress.add(request.key);

  deps.logger.info('Request recorded', {
    key: request.key,
    method: request.method,
    path: request.path,
  });

  return 'OK';
}

function recordResult(
  state: DeduplicatorState,
  deps: DeduplicatorDeps,
  key: IdempotencyKey,
  result: string,
): RecordResultResult {
  if (!state.inProgress.has(key)) {
    deps.logger.warn('Attempted to record result for unknown request', { key });
    return 'REQUEST_NOT_FOUND';
  }

  state.inProgress.delete(key);

  const nowMicros = deps.clock.nowMicroseconds();
  const expiresAtMicros = nowMicros + state.ttlMicros;

  const entry: DeduplicatorEntry = {
    request: {
      key,
      method: '',
      path: '',
      body: '',
      timestampMicros: nowMicros,
    },
    result,
    expiresAtMicros,
    hitCount: 0,
  };

  state.entries.set(key, entry);

  deps.logger.info('Result recorded', {
    key,
    expiresAtMicros: String(expiresAtMicros),
  });

  return 'OK';
}

function getResult(state: DeduplicatorState, key: IdempotencyKey): GetResultResult {
  const entry = state.entries.get(key);
  if (entry === undefined) {
    if (state.inProgress.has(key)) {
      return 'RESULT_NOT_READY';
    }
    return 'REQUEST_NOT_FOUND';
  }

  return entry.result;
}

function pruneExpired(state: DeduplicatorState, deps: DeduplicatorDeps): number {
  const nowMicros = deps.clock.nowMicroseconds();
  let pruned = 0;

  for (const item of state.entries.entries()) {
    const key = item[0];
    const entry = item[1];

    if (entry !== undefined && nowMicros >= entry.expiresAtMicros) {
      state.entries.delete(key);
      pruned = pruned + 1;
    }
  }

  if (pruned > 0) {
    state.totalPruned = state.totalPruned + BigInt(pruned);
    deps.logger.info('Pruned expired entries', { count: pruned });
  }

  return pruned;
}

function setTtl(state: DeduplicatorState, ttlMicros: bigint): void {
  state.ttlMicros = ttlMicros;
}

function getStats(state: DeduplicatorState) {
  return {
    totalRequests: state.totalRequests,
    totalDuplicates: state.totalDuplicates,
    totalPruned: state.totalPruned,
    cacheSize: state.entries.size,
  };
}
